# Cliffwald Online - Features & Engine Capabilities

## 🛠️ Cliffwald 2D Engine (Proprietary Tools)

### 1. Isomorphic 2D Physics & Networking
*   **Shared Rapier2D World:** Server and Client run the exact same physics simulation.
*   **Unified Entity System:** Client architecture binds ECS logic and Phaser Visuals into a single entity map to prevent state desync.
*   **Strict Typing:** Network protocol defined via Colyseus Schema guarantees interface safety.

### 2. High-Fidelity 2D Rendering
*   **Native 360p Resolution:** Optimized for perfect 16:9 scaling.
*   **Normal-Mapped Lighting:** Sprites react to light with realistic relief.
*   **Polar Shadows:** Dynamic 360-degree shadows anchored at character heels.
*   **Asset Management:** Centralized loader for efficient resource handling.

### 3. Live Development Pipeline
*   **Tiled Integration:** Native support for 32x32 `.json` maps.
*   **Hot-Reload Ready:** Modular structure allowing rapid iteration.

---

## 🎮 Gameplay Features

### Core Loop
*   **2D Movement:** Responsive velocity-based controls.
*   **Tactile Magic:** $1 Unistroke Gesture Recognition.
    *   **Visuals:** Star particle trails and geometric light constructs.
*   **Living World:** Server-synced academic schedule.

### Combat (The Duel)
*   **System:** Rock-Paper-Scissors Magic (Circle > Triangle > Square).
*   **Zone:** Designated "Tatami" area.
*   **AI Logic:** Finite State Machine (FSM) enabling Echoes to strafe, target rivals, and engage in Best-of-3 matches.

### Population
*   **Echoes:** 24 Persistent student agents with daily routines.
*   **Teachers:** 4 Unique NPCs (2x Height) patrolling key areas.

### Progression
*   **Prestige:** House Points double as XP for unlocks.
