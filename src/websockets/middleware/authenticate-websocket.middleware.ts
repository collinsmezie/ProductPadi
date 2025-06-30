import { IncomingMessage } from "http";
import { verifyToken } from "../../utils/auth/tokens";
import { parse } from 'cookie';
import { Socket } from "net";

export const authenticateWebSocket = async (
    request: IncomingMessage, 
    socket: Socket, 
    head: Buffer,
    callback: (authenticated: boolean, userId?: string) => void
  ) => {
    try {
      // Check for cookies in the request
      const cookies = parse(request.headers.cookie || '');
      const accessToken = cookies.accessToken;
  
      if (!accessToken) {
        console.log('WebSocket connection rejected: No access token');
        return callback(false);
      }
  
      // Verify the token
      const decoded = await verifyToken(accessToken, process.env.ACCESS_TOKEN_SECRET!);
      if (!decoded) {
        console.log('WebSocket connection rejected: Invalid token');
        return callback(false);
      }
  
      // Authentication successful
      console.log(`WebSocket authenticated for user: ${decoded.id}`);
      callback(true, decoded.id);
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      callback(false);
    }
  }