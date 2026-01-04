# Cliffwald2D - Features & Engine Capabilities

## 🛠️ Cliffwald Engine (Proprietary Tools)
Unique engine capabilities developed for this MMO.

### 1. Isomorphic Physics & Networking
*   **Shared Rapier World:** Server and Client run the exact same physics simulation.
*   **Predictive Netcode:** Client predicts movement locally, Server validates authoritatively, Client reconciles smoothly.
*   **Debug Visualization (God Mode):**
    *   **Green Box:** Client Predicted Position (Interpolated).
    *   **Red Box:** Server Authoritative Position (Snapshot).
    *   **Blue Box:** Static World Colliders (Walls).
    *   *Usage:* Toggle via in-game Tweakpane.

### 2. Live Development Pipeline (Hot Reload)
*   **Map Hot-Reload:** Edit `world.json` in Tiled -> Save -> Client auto-reloads with changes.
*   **Code Hot-Reload:** Edit Server logic -> Nodemon restarts -> Client auto-reconnects safely.
*   **Lighting Pipeline:**
    *   Define lights in Tiled Object Layer "Lights".
    *   Properties: `color` (hex), `radius` (int), `intensity` (float).
    *   Result: Lights appear in-game automatically.

### 3. In-Game Inspector
*   **Tweakpane Overlay:**
    *   Adjust Ambient Light color/intensity in real-time.
    *   Toggle Debug Gizmos.
    *   Test dynamic "Cursor Light" to check normal maps/shadows.

---

## 🎮 Gameplay Features

### Core Loop
*   **Movement:** WASD + Velocity-based physics.
*   **Interaction:** "E" to interact (Chat, NPCs - Placeholder).

### Persistence (Phase 1 & 2)
*   **Database:** SQLite + Prisma.
*   **Position:** Saved to DB on logout.
*   **Echo System:** Disconnected players become AI Bots (Max 50). Oldest removed first.

### Visuals
*   **Dynamic Lighting:** Phaser 3 Lights pipeline enabled.
