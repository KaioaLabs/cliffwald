# KAIOA ENGINE MANIFEST: From Map Editor to Game Engine
> **Philosophy:** "What you see in Tiled is what you play in Cliffwald."

## 1. The Vision
The goal of **KaioaEngine** is to bridge the gap between "Design Time" (Tiled) and "Runtime" (Phaser). We want to eliminate guesswork. If a designer places a light or moves a table in Tiled, they should immediately see the resulting shadows, collisions, and gameplay implications **inside the editor**, without needing to launch the game client.

## 2. Architecture: The "Mirror" Pattern
To achieve maximum maintainability, Tiled Extensions must mirror the logic of the Game Client.

*   **Source of Truth:** `src/shared/Config.ts` & `src/shared/Theme.ts`.
*   **Editor Logic:** `tools/tiled_extensions/*.js`.
*   **Runtime Logic:** `src/client/managers/*.ts`.

Both the Editor scripts and the Client code implement the **same math**.

## 3. Core Features

### 3.1. Unified Lighting & Shadows (Implemented)
*   **Logic:** Skew projection based on vector `(LightPosition - ObjectPosition)`.
*   **Tiled Visualization:**
    *   **Layer:** `_ENGINE_PREVIEW` (Generated on demand).
    *   **Lights:** Renders circles representing `radius` from the "Lights" Object Layer.
    *   **Shadows:** Renders black polygons projecting from "Furniture" tiles away from the nearest light.
*   **Key Property:** Shadows dynamically update when Lights or Furniture are moved (Ctrl+R).

### 3.2. Physics & Collisions (Planned)
*   **Goal:** Visualize the actual Rapier physics bodies, not just the tile squares.
*   **Implementation:** A script that reads the `collides: true` property from tilesets and draws the specific hitbox (Circle/Rectangle) defined in the Collision Editor of Tiled.
*   **Benefit:** See exactly where a player can fit between two tables.

### 3.3. Logic & AI Debugging (Planned)
*   **NPC Paths:** Draw lines connecting patrol points (e.g., `DORM_IGNIS` -> `CLASSROOM`).
*   **Spawns:** Visualize spawn radii and orientation.
*   **Triggers:** Highlight zones like "Duel Areas" or "Teleporters" with distinct colors.

## 4. Implementation Protocol

### Location
All extension scripts reside in:
`D:\Cliffwald2D\tools\tiled_extensions\`

### Installation
Due to Tiled security sandboxing, scripts must be manually copied to the user's local Tiled extension folder:
*   **Windows:** `%APPDATA%\Local\Tiled\extensions\`
*   **Linux/Mac:** `~/.local/share/tiled/extensions/`

### Development Cycle
1.  **Modify Math:** Update collision/shadow math in `src/shared`.
2.  **Update Script:** Port the change to `kaioa_engine_view.js`.
3.  **Deploy:** Copy script to Tiled extensions folder.
4.  **Verify:** Press `Ctrl+R` in Tiled to verify parity.

## 5. Current Scripts

| Script | Function | Status |
| :--- | :--- | :--- |
| `kaioa_engine_view.js` | Simulates Shadow Skew & Light Radii | **Active** |

---
*Last Updated: January 16, 2026*