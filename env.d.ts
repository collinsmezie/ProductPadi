declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    ACCESS_TOKEN_SECRET: string;
    REFRESH_TOKEN_SECRET: string;
    PORT: string;
    AUTH_GOOGLE_SECRET: string;
    AUTH_GOOGLE_ID: string;
    AUTH_LINKEDIN_ID: string;
    AUTH_LINKEDIN_SECRET: string;
    AUTH_SECRET: string;
    SESSION_SECRET: string;
    COOKIE_SECRET: string;
    GOOGLE_CALLBACK_URL: string;
    LINKEDIN_CALLBACK_URL: string;
    OPEN_AI_API_KEY: string;
    NODE_ENV: string;
    APPWRITE_PROJECT_ID: string;
    APPWRITE_BUCKET_ID: string;
    PRODUCTION_URL: string
    FRONTEND_URL: string
    AWS_REDIS_SESSION_STORE_HOST: string
    AWS_REDIS_SESSION_STORE_PORT: string
  }
}
