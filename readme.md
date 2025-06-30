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

# ProductPadi - Backend Documentationf

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue?logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-ORM--Prisma-green?logo=mongodb)
![License](https://img.shields.io/badge/license-MIT-brightgreen)
![Status](https://img.shields.io/badge/status-In%20Development-yellow)

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

---

## 🔒 Authentication
Authentication is handled via **JWT** and **Passport.js**, with routes protected using middleware.

Supported flows:
- Register/Login
- Secure sessions with JWT
- Role-based access (Admin, Editor, Viewer)

---

## 🌐 Real-time Collaboration (WIP)
We use a custom-built WebSocket server to enable real-time co-editing of PRD documents.

- Documents are broken into sections
- Changes are broadcasted to connected users
- Presence (user online/offline) is tracked via Redis
- Future: Operational Transformation (OT) engine or CRDT integration

---

## 🤖 OpenAI Integration
- PRD generation and enhancement features use the OpenAI API to:
  - Auto-fill PRD sections based on prompts
  - Suggest improvements to written sections
  - Provide formatting or structural guidance

---

<!-- ## 🛠 Setup & Development

### 1. Clone Repo -->
<!-- ```bash
git clone https://github.com/your-org/productpadi-backend.git
cd productpadi-backend
 -->

## ⚙️ Getting Started

```bash
# Clone the repo
git clone https://github.com/yourusername/productpadi-backend.git
cd productpadi-backend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Fill in your DB_URI, JWT_SECRET, OpenAI API Key, etc.

# Run development server
npm run dev