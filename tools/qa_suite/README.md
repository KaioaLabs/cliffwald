# Cliffwald2D Beta Tester Agent

This system implements an autonomous "Visual Agent" loop for testing the game.
It follows the **Observe-Orient-Decide-Act (OODA)** loop used in modern AI robotics and game testing.

## Architecture

The agent runs as a standalone Node.js process using Playwright.

1.  **OBSERVE (Visual):** Captures the game canvas every 1-2 seconds.
2.  **ORIENT (Telemetry):** Reads internal game state (Player Position, HP, Nearby Entities) via `window.gameClient`.
3.  **DECIDE (Brain):** 
    - Currently implements a **Heuristic Explorer** (Random Walk + Stuck Detection).
    - *Future Upgrade:* Can be connected to `GoogleGenerativeAI` (Gemini Pro Vision) to send the screenshot and get semantic actions (e.g., "I see a red potion, pick it up").
4.  **ACT (Control):** Simulates keyboard/mouse inputs via Playwright.

## Setup

1.  Ensure the game server and client are running.
2.  Run the agent:
    ```bash
    npx ts-node tools/sistema_de_test/run_agent.ts
    ```

## Features

- **Auto-Login:** Automatically bypasses the intro and logs in.
- **Stuck Detection:** Detects if the position hasn't changed and attempts to wiggle free.
- **Visual Logging:** Saves screenshots of key events or failures.
- **Chaos Mode:** Randomly casts spells and interactions to test stability.
