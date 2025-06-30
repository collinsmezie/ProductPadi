import type { WebSocket } from "ws";

export interface PrdPermissions {
  canView: boolean;
  canEdit: boolean;
  isOwner: boolean;
}

export interface PrdWebSocketClient {
  ws: WebSocket;
  userId: string;
  prdId: string;
  permissions: PrdPermissions;
  lastActivity: Date;
}

export enum PrdWebSocketMessageType {
  JOIN = "join",
  LEAVE = "leave",
  UPDATE_CURSOR = "update_cursor",
  UPDATE_FIELD = "update_field",
  SYNC_REQUEST = "sync_request",
  SYNC_RESPONSE = "sync_response",
  ERROR = "error",
}

export interface PrdWebSocketMessage {
  type: PrdWebSocketMessageType;
  payload: any;
  userId: string;
  prdId: string;
  timestamp?: Date;
}

export interface CursorPosition {
  prdId: string;
  section: string;
  fieldId: string;
  position: string;
  selection: {
    start: number;
    end: number;
  };
}
