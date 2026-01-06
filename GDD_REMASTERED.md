# Cliffwald Online - Official GDD (Remastered)
**Version:** 4.2 (Refactored & Unified)
**Platform:** Web Browsers
**Stack:** Node.js | Phaser 3 | Rapier2D | Colyseus

## 1. High Concept
A social MMO magic academy school-sim.

## 2. Design Pillars
1.  **Synchronized Schedule:** Shared server time.
2.  **Tactile Magic:** Gesture-based spellcasting.
3.  **The Duel:** RPS-based PvP combat.
4.  **Living World:** Persistent NPCs (Echoes).

## 3. Magic System
*   **Triangle (Scissors) > Square (Paper)**
*   **Square (Paper) > Circle (Rock)**
*   **Circle (Rock) > Triangle (Scissors)**

## 5. Technical Specification
*   **Architecture:** Modular Client (AssetManager, UIScene) + Unified ECS Entity System.
*   **Visuals:** Hi-Bit Pixel Art with Normal Maps and Polar Shadows.

## 6. World Population
*   **24 Students (Echoes):** Follow class schedules and rivalries.
*   **4 Teachers:** Static overseers.
*   **Classroom:** Fixed seating arrangements based on map data.

## 7. The Living Schedule
Activities drive the world state.

| Time | Activity | Location | Note |
| :--- | :--- | :--- | :--- |
| **07:00** | **Breakfast** | Great Hall | |
| **08:30** | **Morning Class** | Academic Wing | Students sit at assigned desks. |
| **10:30** | **Free Time** | Grounds | **Dueling Allowed** in Training Grounds. |
| **12:30** | **Lunch** | Courtyard | |
| **14:00** | **Field Study** | Forest | |
| **17:00** | **Evening Class** | Alchemy Lab | |
| **19:00** | **Dinner** | Great Hall | |
| **21:00** | **Curfew** | Dorms | |

*Note: The Dueling Zone (Tatami) is mechanically active 24/7, allowing players to practice or settle disputes whenever they choose, though Echoes are most active during Free Time.*

## 8. Progression
*   **Prestige = XP:** Gaining House Points unlocks personal progression.
