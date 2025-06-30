import { WebSocket } from "ws";
import {
  CursorPosition,
  PrdPermissions,
  PrdWebSocketClient,
  PrdWebSocketMessage,
  PrdWebSocketMessageType,
} from "../types/edit-prd.types";
import prisma from "../../models/prisma";
import { getDefaultPrdByIdService } from "../../services/prd/default.prd.service";
import { initRedis, publish, redisManager, subscribe } from "../../config/redis.config";
import { debounce } from "lodash";

// Map to store active connections
// prdId -> Map<userId, WebSocketClient>
const prdConnections = new Map<string, Map<string, PrdWebSocketClient>>();

// Map to store user cursor positions
// prdId -> Map<userId, CursorPosition>
const cursorPositions = new Map<string, Map<string, CursorPosition>>();

// Map to store document content cache
// prdId -> DocumentState
const documentStates = new Map<string, any>();

// Debounced save operations - one per document
const debouncedSaves = new Map<string, ReturnType<typeof debounce>>();

// Initialize handlers when the server starts
export const initializeHandlers = async () => {
  // Initialize Redis service
  await initRedis();

  console.log("PRD WebSocket handlers initialized");
};

export const setUserAndPrdData = (
  ws: WebSocket,
  userId: string,
  prdId: string,
  permissions: PrdPermissions | undefined
) => {
  // Create or update the WebSocketClient object
  const client: PrdWebSocketClient = {
    ws,
    userId,
    prdId,
    permissions: permissions || { canView: true, canEdit: false, isOwner: false },
    lastActivity: new Date(),
  };

  // Get or create the connection map for this PRD
  if (!prdConnections.has(prdId)) {
    prdConnections.set(prdId, new Map<string, PrdWebSocketClient>());

    //TODO: Set up debounced save for this PRD
  }
  const prdClientMap = prdConnections.get(prdId)!;

  // Store the client in the map
  prdClientMap.set(userId, client);

  // Initialize cursor position map if needed
  if (!cursorPositions.has(prdId)) {
    cursorPositions.set(prdId, new Map<string, CursorPosition>());
  }

  // Subscribe to Redis channel for this PRD
  subscribeToDocumentChannel(prdId, userId);

  // Broadcast join event
  broadcastToPrd(prdId, {
    type: PrdWebSocketMessageType.JOIN,
    payload: {
      userId: userId,
      permissions: client.permissions,
      timestamp: new Date(),
    },
    timestamp: new Date(),
    userId,
    prdId,
  });
};

export const handleConnection = (
  ws: WebSocket,
  userId: string,
  prdId: string,
  permissions: PrdPermissions
) => {
  let client: PrdWebSocketClient = {
    ws,
    userId,
    prdId,
    permissions,
    lastActivity: new Date(),
  };

  ws.on("message", async (message: string) => {
    try {
      const data: PrdWebSocketMessage = JSON.parse(message);

      client.lastActivity = new Date();

      switch (data.type) {
        case PrdWebSocketMessageType.JOIN:
          handleJoin(data, client);
          break;

        case PrdWebSocketMessageType.LEAVE:
          handleLeave(client);
          break;

        case PrdWebSocketMessageType.UPDATE_CURSOR:
          handleCursorUpdate(data, client);
          break;

        case PrdWebSocketMessageType.UPDATE_FIELD:
          if (permissions.canEdit) {
            await handleFieldUpdate(data, client);
          } else {
            sendError(ws, "You don't have permission to edit this document");
          }

        case PrdWebSocketMessageType.SYNC_REQUEST:
          await handleSyncRequest(data, client);
          break;
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: PrdWebSocketMessageType.ERROR,
          payload: {
            message: "Invalid message format",
          },
        })
      );
    }

    ws.on("close", () => {
      handleLeave(client);
    });
  });
};

export const closeAllConnections = () => {
  // Close all WebSocket connections
  for (const [prdId, clients] of prdConnections.entries()) {
    for (const [userId, client] of clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    }
    console.log(`Closed all connections for PRD ${prdId}`);
  }

  // Clear maps
  prdConnections.clear();
  cursorPositions.clear();
  documentStates.clear();

  console.log("All WebSocket connections closed");
};

const handleJoin = async (data: PrdWebSocketMessage, client: PrdWebSocketClient) => {
  const { prdId, userId } = data;

  // Basic validation
  if (!prdId || !userId) {
    sendError(client.ws, "Missing prdId or userId in JOIN message");
    return;
  }

  // Set client data
  client.prdId = prdId;
  client.userId = userId;

  // Add to connection map
  if (!prdConnections.has(prdId)) {
    prdConnections.set(prdId, new Map());
  }
  prdConnections.get(prdId)!.set(userId, client);

  // Add user to active editors in the database
  await updateActiveEditors(prdId, userId, "add");

  // Get all current users for this PRD
  const connectedUsers = Array.from(prdConnections.get(prdId)?.keys() || []);

  // Get current cursor positions for this PRD
  const positions = Array.from(cursorPositions.get(prdId)?.entries() || []).map(
    ([userId, position]) => ({ ...position, userId })
  );

  // Send join confirmation with current state
  client.ws.send(
    JSON.stringify({
      type: PrdWebSocketMessageType.JOIN,
      payload: {
        connectedUsers,
        cursorPositions: positions,
      },
      userId,
      prdId,
      timestamp: new Date(),
    })
  );

  // Notify other users
  await publish(`prd:doc:${prdId}`, {
    type: PrdWebSocketMessageType.JOIN,
    payload: { userId },
    userId,
    prdId,
    timestamp: new Date(),
  });

  // broadcastToPrd(
  //   prdId,
  //   {
  //     type: PrdWebSocketMessageType.JOIN,
  //     payload: { userId },
  //     userId,
  //     prdId,
  //     timestamp: new Date(),
  //   },
  //   userId
  // );
};

const handleLeave = async (client: PrdWebSocketClient) => {
  if (!client.prdId || !client.userId) return;

  const { prdId, userId } = client;

  // Remove user from active editors in the database
  await updateActiveEditors(prdId, userId, "remove");

  // Remove cursor position
  cursorPositions.get(prdId)?.delete(userId);

  // Remove from connections
  prdConnections.get(prdId)?.delete(userId);
  if (prdConnections.get(prdId)?.size === 0) {
    // Clean up resources
    prdConnections.delete(prdId);
    cursorPositions.delete(prdId);
    documentStates.delete(prdId);

    // Cancel debounced save
    const debouncedSave = debouncedSaves.get(prdId);
    if (debouncedSave) {
      debouncedSave.cancel();
      debouncedSaves.delete(prdId);
    }
  }

  // Notify other users

  await publish(`prd:doc:${prdId}`, {
    type: PrdWebSocketMessageType.LEAVE,
    payload: { userId },
    userId,
    prdId,
    timestamp: new Date(),
  });

  // broadcastToPrd(prdId, {
  //   type: PrdWebSocketMessageType.LEAVE,
  //   payload: { userId },
  //   userId,
  //   prdId,
  //   timestamp: new Date(),
  // });
};

const broadcastToPrd = (prdId: string, message: PrdWebSocketMessage, excludeUserId?: string) => {
  const clients = prdConnections.get(prdId);
  if (!clients) return;

  clients.forEach((client, userId) => {
    if (excludeUserId && userId === excludeUserId) return;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
};

const handleCursorUpdate = async (data: PrdWebSocketMessage, client: PrdWebSocketClient) => {
  if (!client.prdId || !client.userId) return;

  const { prdId, userId } = client;
  const cursorData = data.payload as CursorPosition;

  // Store cursor position
  if (!cursorPositions.has(prdId)) {
    cursorPositions.set(prdId, new Map());
  }
  cursorPositions.get(prdId)!.set(userId, {
    ...cursorData,
  });

  // Broadcast cursor update via Redis pub/sub
  await publish(`prd:doc:${prdId}`, {
    type: PrdWebSocketMessageType.UPDATE_CURSOR,
    payload: {
      ...cursorData,
      userId,
    },
    timestamp: new Date(),
    userId,
    prdId,
  });
};

const handleFieldUpdate = async (data: PrdWebSocketMessage, client: PrdWebSocketClient) => {};

const updateActiveEditors = async (prdId: string, userId: string, action: "add" | "remove") => {
  try {
    const template = await prisma.defaultPrdTemplate.findUnique({
      where: { prdId },
    });

    if (!template) return;

    let activeEditors = template.activeEditors || [];

    if (action === "add" && !activeEditors.includes(userId)) {
      activeEditors.push(userId);
    } else if (action === "remove") {
      activeEditors = activeEditors.filter((id) => id !== userId);
    }

    await prisma.defaultPrdTemplate.update({
      where: { id: template.id },
      data: {
        activeEditors,
        lastEditBy: action === "add" ? userId : template.lastEditBy,
      },
    });
  } catch (error) {
    console.error(`Error updating active editors for PRD ${prdId}:`, error);
  }
};

const handleSyncRequest = async (data: PrdWebSocketMessage, client: PrdWebSocketClient) => {
  if (!client.prdId || !client.userId) return;

  const { prdId, userId } = client;

  try {
    // Get PRD data from database
    const template = await getDefaultPrdByIdService(prdId);

    if (!template) {
      sendError(client.ws, "PRD template not found");
      return;
    }

    // Send sync response
    client.ws.send(
      JSON.stringify({
        type: PrdWebSocketMessageType.SYNC_RESPONSE,
        payload: template,
        userId,
        prdId,
        timestamp: new Date(),
      })
    );
  } catch (error) {
    console.error(`Error handling sync request:`, error);
    sendError(client.ws, "Failed to sync PRD data");
  }
};

// Subscribe to Redis pub/sub channel for a document
const subscribeToDocumentChannel = async (prdId: string, userId: string) => {
  const channel = `prd:default:${prdId}`;

  await subscribe(channel, (message) => {
    // Don't send messages back to the originator
    if (message.userId === userId) return;

    // Forward messages to connected clients
    const clients = prdConnections.get(prdId);
    if (!clients) return;

    const client = clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
};

// Store document state in Redis
export const storeDocumentState = async (prdId: string, state: any) => {
  try {
    const client = await redisManager.getPublisherClient();

    const key = `prd:default:${prdId}:state`;
    await client.set(key, JSON.stringify(state));
    // Set expiration to 24 hours for automatic cleanup of inactive documents
    await client.expire(key, 60 * 60 * 24);
  } catch (error) {
    console.error(`Error storing document state for ${prdId}:`, error);
    throw error;
  }
};

// Get document state from Redis
export const getDocumentState = async (prdId: string) => {
  try {
    const client = await redisManager.getPublisherClient();

    const key = `prd:default:${prdId}:state`;
    const state = await client.get(key);
    return state ? JSON.parse(state) : null;
  } catch (error) {
    console.error(`Error getting document state for ${prdId}:`, error);
    return null;
  }
};

const sendError = (ws: WebSocket, message: string) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: PrdWebSocketMessageType.ERROR,
        payload: { message },
      })
    );
  }
};
