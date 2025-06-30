<!-- # ProductPadi - Backend Documentation

## Overview

Backend service for ProductPadi

## Tech Stack

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- MongoDB
- OpenAI API -->

# ProductPadi - Backend Documentation

## 🧠 Overview

**ProductPadi** is a collaborative Product Requirements Document (PRD) management platform that helps product teams write, edit, and manage PRDs in real-time.

This backend service powers key features such as:
- Real-time collaborative editing of PRDs
- Section-based PRD architecture (e.g., Overview, Goals, Requirements)
- Role-based authentication and authorization
- Project and document ownership
- Integration with OpenAI API for automated assistance

---

## ⚙️ Tech Stack

- **Node.js** – JavaScript runtime
- **TypeScript** – Static typing
- **Express.js** – Web server
- **Prisma ORM** – Type-safe database client
- **MongoDB** – Document database for PRDs and sessions
- **OpenAI API** – AI assistance for PRD generation and suggestions
- **WebSockets** – Real-time document collaboration (via `ws` library)
- **Redis** – Presence tracking and pub/sub (not shown in this structure)

---

## 🧱 Features

- 📝 **Sectioned PRD Editing**: Each PRD is divided into well-defined sections like Objectives, Scope, Requirements, Stakeholders, etc.
- 👥 **Collaborative Sessions**: Multiple users can co-edit documents in real time, with presence tracking and session state management.
- 🔐 **Authentication & Authorization**: Role-based access, session validation, JWT, and Passport.js integration.
- ⚡ **WebSocket Infrastructure**: Custom WebSocket server using the `ws` library for real-time document change sync.
- 🤖 **AI-Powered Suggestions**: Use OpenAI to suggest improvements to PRD sections or generate drafts.
- 📦 **Modular Architecture**: Clean separation of concerns into controllers, services, routes, and schema layers.

---

## 📁 Project Structure

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
