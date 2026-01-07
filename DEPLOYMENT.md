# Cliffwald2D - Deployment Guide (Free Tier Architecture)

This guide details how to deploy **Cliffwald2D** for free using a separated architecture optimized for persistence and zero-cost hosting.

## 🏗️ Architecture: The "Free Stack"

| Component | Technology | Provider | Cost | Constraints |
| :--- | :--- | :--- | :--- | :--- |
| **Game Server** | Node.js + Colyseus | **Render.com** (Web Service) | $0 | Sleeps after 15m idle. 512MB RAM. Shared CPU. |
| **Database** | PostgreSQL | **Neon.tech** | $0 | 500MB Storage. Excellent persistence. |
| **Client Hosting** | Static HTML/JS | **Render.com** (Static Site) | $0 | Served directly by the Node.js server via Express. |

---

## ⚠️ Performance Warning (96 Players)
The Free Tier (0.1 CPU) is sufficient for **development, testing, and small gatherings (10-20 players)**.
If you reach **50+ simultaneous players** interacting with physics (Rapier), the server tick rate may drop below 30 FPS.
*   **Solution:** Upgrade Render to "Starter" plan ($7/mo) for dedicated CPU.

---

## 🚀 Step 1: Database Setup (Neon.tech)
1.  Create a free account at [Neon.tech](https://neon.tech).
2.  Create a new Project ("cliffwald").
3.  Copy the **Connection String** (e.g., `postgres://user:pass@ep-xyz.aws.neon.tech/neondb...`).
4.  **Important:** This string replaces your local `file:./dev.db`.

---

## 🚀 Step 2: Render.com Setup (Server)
1.  Create a free account at [Render.com](https://render.com).
2.  Connect your GitHub repository (`KaioaLabs/cliffwald`).
3.  Create a new **Web Service**.
4.  **Settings:**
    *   **Runtime:** Node
    *   **Build Command:** `npm install && npm run build`
    *   **Start Command:** `npm run start:prod` (We will create this script)
5.  **Environment Variables (Add these in Render Dashboard):**
    *   `DATABASE_URL`: Paste your Neon Connection String here.
    *   `NODE_ENV`: `production`
    *   `PORT`: `10000` (Render default)

---

## 🛠️ Project Configuration Changes

### 1. Update `package.json`
We need a start script that runs migrations and starts the server.
```json
"scripts": {
  "build": "tsc && vite build",
  "start:prod": "npx prisma migrate deploy && node dist/server/index.js"
}
```

### 2. Update `prisma/schema.prisma`
Switch provider to support both via ENV or manual switch.
```prisma
datasource db {
  provider = "postgresql" // Change "sqlite" to "postgresql" for Prod
  url      = env("DATABASE_URL")
}
```

### 3. Server Static Files
Ensure `src/server/index.ts` serves the `dist/client` folder when accessing via browser.

---

## 🔄 Workflow
1.  **Develop Locally:** Use `npm run dev` with SQLite.
2.  **Push to GitHub:** `git push origin main`.
3.  **Auto-Deploy:** Render detects the push, builds the client, migrates the Neon DB, and restarts the server.
