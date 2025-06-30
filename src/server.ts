import { createServer } from 'http';
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import routes from "./routes/index.routes";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./config/passport.config";
import { errorHandler } from "./middleware/error-handler.middleware";
import compression from "compression";
import { RedisStore } from "connect-redis";
import requestLogger from "./middleware/request-logger";
import errorLogger from "./middleware/error-logger";
import { createError } from "./utils/error.utils";
import { ErrorType } from "./types/errors.types";
import { getRedisClient, closeRedisConnection } from "./config/redis.config";
import { initializeWebSockets, shutdownWebSockets } from "./websockets";

dotenv.config();

// Initialize express app
const app = express();

// Create HTTP server
const httpServer = createServer(app);

const PORT = process.env.PORT || 3000;

// Middleware that doesn't depend on Redis
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173", // Local development
  "http://localhost:3000", // My origin
  process.env.PRODUCTION_URL!, // Production environment
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Bruno)
      if (!origin) return callback(null, true);

      // Check if the origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Deny the request with a custom error
      return callback(
        createError(ErrorType.FORBIDDEN, "Origin not allowed", {
          context: `The origin '${origin}' is not allowed by CORS`,
        })
      );
    },
    credentials: true, // Allow credentials (cookies)
  })
);

app.use(morgan("dev"));
app.use(compression());
app.disable("x-powered-by");
app.use(helmet());

// Function to handle graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  console.log('Graceful shutdown initiated');
  
  // Close WebSocket connections
  shutdownWebSockets();
  
  // Close Redis connection
  await closeRedisConnection();
  
  console.log('All connections closed');
  process.exit(0);
};

// The async function to initialize Redis and start the server
async function startServer() {
  try {
    let sessionConfig: session.SessionOptions;

    // Use in-memory session store for local development
    if (process.env.NODE_ENV !== "production") {
      console.log("Using in-memory session store for local development");
      sessionConfig = {
        secret: process.env.SESSION_SECRET!,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: false,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        },
      };
    } else {
      // Use Redis for session storage in production
      console.log("Using Redis session store for production");
      const redisClient = await getRedisClient();
      
      sessionConfig = {
        store: new RedisStore({ client: redisClient }),
        secret: process.env.SESSION_SECRET!,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: true,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        },
      };
    }

    app.use(session(sessionConfig));

    // Passport Setup
    app.use(passport.initialize());
    app.use(passport.session());

    // Request logger middleware
    app.use(requestLogger);

    // Routes
    app.use(routes);

    // Error handling logging middleware
    app.use(errorLogger);

    // Response Error Handler
    app.use(errorHandler);

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Initialize WebSocket server
    initializeWebSockets(httpServer);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log("Server is running on port", PORT);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();