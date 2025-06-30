# ProductPadi - Backend Documentation

## Overview

Backend service for ProductPadi

## Tech Stack

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- MongoDB
- OpenAI API

## Project Structure

```Directory Tree Sample
/
├── /src
│   ├── /config
│   │   ├── index.ts                  # Configuration files (env, settings)
│   │   └── passport.ts                # Passport configuration
│   ├── /controllers
│   │   ├── auth.controller.ts          # Controller for authentication logic
│   ├── /middlewares
│   │   └── auth.middleware.ts           # Authentication middleware
│   ├── /schema
│   │   └── prisma.ts                  # Prisma client setup
│   ├── /schema
│   │   └── user.schema.ts                  # Request Body and Param Schema
│   ├── /routes
│   │   ├── auth.routes.ts              # Authentication-related routes
│   │   └── project.routes.ts           # Project-related routes
│   ├── /services
│   │   └── auth.service.ts             # Business logic for authentication
│   │   └── project.service.ts          # Business logic for projects
│   ├── /utils
│   │   └── logger.ts                  # Utility functions (e.g., logger)
│   ├── app.ts                         # Express app setup
│   └── server.ts                      # Entry point for the application
├── /dist                              # Compiled JavaScript files
├── /node_modules                      # Node.js modules
├── .env                               # Environment variables
├── .gitignore                         # Git ignore file
├── package.json                       # Project metadata and dependencies
├── prisma                             # Prisma schema and migration files
│   └── schema.prisma                 # Prisma schema file
├── tsconfig.json                      # TypeScript configuration
└── README.md                          # Documentation for the project
```
