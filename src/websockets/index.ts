import { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";
import { URL } from "url";
import type { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Socket } from "net";

// Import authentication middleware
import { authenticateWebSocket } from "./middleware/authenticate-websocket.middleware";

// Import all handlers
import {
  handleConnection as handlePrdConnection,
  closeAllConnections as closePrdConnections,
  setUserAndPrdData,
  initializeHandlers as initializePrdHandlers,
} from "./handlers/edit-default-prd.handlers";

// Import the permission checker
import { checkPrdPermissions } from "./middleware/check-prd-edit-permission.middleware";
import { PrdPermissions } from "./types/edit-prd.types";

// Define the handler interface
interface WebSocketHandler {
  handleConnection: (
    ws: WebSocket,
    userId: string,
    params: Map<string, string>,
    permissions?: PrdPermissions
  ) => void;
  closeAllConnections: () => void;
  checkPermissions?: (userId: string, params: Map<string, string>) => Promise<any>;
  initialize?: () => Promise<void>;
}

// Map of paths to their respective handlers
const pathHandlers: Record<string, WebSocketHandler> = {
  "/socket/prd/default/edit": {
    handleConnection: (ws, userId, params, permissions) => {
      const prdId = params.get("prdId");
      if (prdId) {
        // Pass both userId and permissions to the handler
        setUserAndPrdData(ws, userId, prdId, permissions);
      }
      handlePrdConnection(ws, userId, prdId!, permissions!);
    },
    closeAllConnections: closePrdConnections,
    checkPermissions: async (userId, params) => {
      const prdId = params.get("prdId");
      if (!prdId) return { canView: false, canEdit: false };

      // Get permissions instead of just validating
      return await checkPrdPermissions(userId, prdId);
    },
    initialize: initializePrdHandlers,
  },
  // Add more handlers here in the future
};

let wss: WebSocketServer;

/**
 * Initialize all WebSocket handlers before starting the server
 * This ensures Redis connections and other resources are set up properly
 */
const initializeAllHandlers = async () => {
  console.log("Initializing all WebSocket handlers...");

  // Initialize each handler that has an initialize method
  for (const [path, handler] of Object.entries(pathHandlers)) {
    if (handler.initialize) {
      try {
        await handler.initialize();
        console.log(`Initialized handler for path: ${path}`);
      } catch (error) {
        console.error(`Failed to initialize handler for path: ${path}`, error);
      }
    }
  }

  console.log("All WebSocket handlers initialized successfully");
};

export const initializeWebSockets = async (server: HttpServer): Promise<WebSocketServer> => {
  // Initialize all handlers first
  await initializeAllHandlers();  

  // Create WebSocket server with noServer option
  wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests manually to route based on path
  server.on("upgrade", async (request: IncomingMessage, socket: Socket, head: Buffer) => {
    try {
      // Parse the URL to get the pathname and query parameters
      const url = new URL(request.url || "", `http://${request.headers.host}`);
      const pathname = url.pathname;

      // Extract query parameters
      const params = new Map<string, string>();
      url.searchParams.forEach((value, key) => {
        params.set(key, value);
      });

      // Find the handler for this path
      const handler = pathHandlers[pathname];

      if (!handler) {
        console.log(`No handler found for path: ${pathname}`);
        socket.destroy();
        return;
      }

      // Authenticate the WebSocket connection - this is required for ALL connections
      authenticateWebSocket(
        request,
        socket,
        head,
        async (authenticated: boolean, userId?: string) => {
          if (!authenticated || !userId) {
            console.log("Authentication failed for WebSocket connection");
            socket.destroy();
            return;
          }

          // Check permissions but don't block the connection
          let permissions: PrdPermissions;
          if (handler.checkPermissions) {
            permissions = await handler.checkPermissions(userId, params);

            // Only block if the user doesn't have view access
            if (!permissions.canView) {
              console.log(`User ${userId} doesn't have view access`);
              socket.destroy();
              return;
            }
          }
          +(
            // Upgrade the connection
            wss.handleUpgrade(request, socket, head, (ws) => {
              console.log(
                `WebSocket connection established for path: ${pathname}, user: ${userId}`
              );

              // Call the appropriate connection handler with userId, params and permissions
              handler.handleConnection(ws as WebSocket, userId, params, permissions);
            })
          );
        }
      );
    } catch (error) {
      console.error("Error handling WebSocket upgrade:", error);
      socket.destroy();
    }
  });

  console.log("WebSocket server initialized with path-based routing and authentication");

  return wss;
};

export const getWebSocketServer = (): WebSocketServer | undefined => {
  return wss;
};

export const shutdownWebSockets = () => {
  // Close all connections for each handler
  Object.values(pathHandlers).forEach((handler) => {
    handler.closeAllConnections();
  });

  if (wss) {
    wss.close();
    console.log("WebSocket server closed");
  }
};
