type ErrorStatus = "Error" | "Fail";

export type ErrorResponse = {
  status: ErrorStatus;
  message: string;
  code: ErrorType;
  details?: unknown;
};


export interface ErrorDetails {
  context?: string;
  originalError?: string;
  recommendation?: string;
  path?: {
    message: string
    path: string[]
    code: string
  }[]
  [key: string]: any; // Allow for additional custom fields
}

export enum ErrorType {
  VALIDATION = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL = 500,
  TRANSACTION_TIMEOUT = 504
}

export class AppError extends Error {
  constructor(
    public code: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }

  toResponse(isDevelopment: boolean = false): ErrorResponse {
    // Create a copy of details to avoid modifying the original
    let responseDetails: ErrorDetails | undefined = undefined;
    
    if (this.details) {
      responseDetails = { ...this.details };
      
      // Remove sensitive information in production
      if (!isDevelopment && responseDetails.originalError) {
        delete responseDetails.originalError;
        delete responseDetails.path
      }
    }
    
    return {
      status: this.code >= 500 ? "Error" : "Fail",
      message: this.message,
      code: this.code,
      details: responseDetails,
    };
  }
}
