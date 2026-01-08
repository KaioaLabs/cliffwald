# Cliffwald 2D - Architecture & Deployment Guide

## 1. System Architecture (Isomorphic)

The project follows a unified TypeScript architecture where the Server serves the Client.

### Directory Structure (Production)
```text
/ (root)
├── dist-client/       # [GENERATED] Static Frontend (HTML, JS, Assets) - Created by Vite
├── dist-server/       # [GENERATED] Backend Logic (Node.js) - Created by tsc
│   └── server/
│       └── index.js   # Entry Point
├── src/
│   ├── client/        # Frontend Source (Phaser + NetworkManager)
│   ├── server/        # Backend Source (Colyseus + Express)
│   └── shared/        # Shared Code (Schemas, Config, Types)
└── package.json
```

### The "Serving" Logic
Unlike traditional setups where the backend is an API only, **Cliffwald Server serves the Game Client**.
- **Express 5** is configured to serve static files from `dist-client` (located at the project root).
- **Fallback**: It handles SPA routing (History API) by serving `index.html` for any unknown route matches via regex `/.*/`.

---

## 2. Build Pipeline

We have moved to a **Zero-Copy** build pipeline to reduce errors.

### Command: `npm run build`
This single command orchestrates the entire process:
1.  **Prisma Generation**: `npx prisma generate` (Creates DB Client based on schema).
2.  **Server Build**: `npm run build:server` (Compiles TS -> JS in `dist-server/`).
3.  **Client Build**: `npm run build:client` (Vite compiles Assets -> `dist-client/`).

**Crucial Change (Jan 2026):** We no longer use `postbuild.js`. The server looks for `dist-client` directly in the root `process.cwd()`.

---

## 3. Database Architecture (Unified)

The project now uses a **Unified PostgreSQL Architecture**.
- **Provider**: PostgreSQL (Supabase) is used for BOTH Development and Production.
- **Benefits**: Eliminates "works on my machine" bugs caused by SQLite/Postgres dialect differences.
- **Local Dev**: Requires internet connection to connect to Supabase (or a local Postgres instance defined in `.env`).

**Removed:** The legacy "Dual Mode" (SQLite vs Cloud) and `switch_env.ps1` scripts have been deprecated and removed.

---

## 4. Deployment to Render.com

### Service Settings
- **Type**: Web Service
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`

### Environment Variables (Required)
| Key | Value | Description |
|BC|BC|BC|
| `NODE_ENV` | `production` | Optimizes Express & Colyseus. |
| `DATABASE_URL` | `postgres://...` | Transaction Mode connection string (Supabase). |
| `DIRECT_URL` | `postgres://...` | Session Mode connection string (Supabase). |
| `JWT_SECRET` | `...` | Secret for Auth tokens. |

---

## 5. Troubleshooting Common Errors

### "Client build not found"
- **Cause**: The `dist-client` folder is missing.
- **Fix**: Ensure `npm run build` ran successfully. Check if `vite.config.mts` has `base: './'`.

### "Missing parameter name at index 1: *"
- **Cause**: Express 5 does not support `*` wildcard strings.
- **Fix**: Ensure code uses regex `app.get(/.*/, ...)` instead.

### Database Connection Failures
- **Cause**: Prisma Client generated for SQLite but running on Postgres (or vice versa).
- **Fix**: Run `npx prisma generate` in the correct environment context.