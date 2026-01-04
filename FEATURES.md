# Cliffwald Online - Features & Engine Capabilities

## 🛠️ Cliffwald 2D Engine (Proprietary Tools)
Unique engine capabilities developed for this Web-based MMO.

### 1. Isomorphic 2D Physics & Networking
*   **Shared Rapier2D World:** Server and Client run the exact same physics simulation in a 2D plane.
*   **Predictive Netcode:** Client predicts movement locally, Server validates authoritatively, Client reconciles smoothly.
*   **Intelligent Navigation:** Authoritative **A* Pathfinding** allowing NPCs to navigate complex layouts without getting stuck.

### 2. High-Fidelity 2D Rendering (Hi-Bit)
*   **Native 360p Resolution:** Optimized for perfect scaling (16:9).
*   **Normal-Mapped Lighting:** Sprites react to light with realistic relief and volume.
*   **Dynamic Silhouette Shadows:** Real-time shadows that project from characters' feet, stretching and rotating away from light sources.
*   **Cinematic Camera:** Follows the player with a 15% influence toward the mouse cursor for tactical awareness. Freezes during spell casting for drawing precision.

### 3. Live Development Pipeline
*   **Tiled Integration:** Native support for 32x32 `.json` maps.
*   **Master Controller:** Single-command startup (`npm run map` or `start_mmo.bat`) for Game + Editor.

---

## 🎮 Gameplay Features (Magic School Life)

### Core Loop
*   **2D Movement:** Responsive velocity-based controls.
*   **Tactile Magic:** Drawing symbols with the mouse ($1 Unistroke Algorithm).
*   **Living World:** Daily routines (School Schedule) synchronized by the server.

### Persistence
*   **Database:** SQLite + Prisma for player profiles.
*   **World State:** Server-authoritative time and object states.
*   **Echo System:** AI-controlled agents that maintain school population density (Max 50).

