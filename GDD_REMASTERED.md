# Cliffwald Online - Official GDD (Remastered)
**Version:** 4.0 (2D Multi-platform Web)
**Platform:** Web Browsers (Desktop/Mobile)
**Stack:** Node.js (Server) | Phaser 3 (Client) | Rapier2D (Physics)

## 1. High Concept
Cliffwald Online is a social MMO school-sim where players inhabit a magic academy. The core experience centers on an authoritative, server-synced academic cycle where human players and AI "Echoes" coexist to create a living castle environment.

## 2. Design Pillars
1.  **The Synchronized Schedule:** All players share the same server time. If it's 8:00 AM, the school gathers for class.
2.  **Tactile Magic:** Spells are cast by drawing basic geometric shapes ($1 Unistroke algorithm).
3.  **Authoritative 2D World:** All movement and physics are validated by the server.
4.  **Academic Routine:** Gameplay revolves around following the school's daily schedule.

## 3. Magic System (Shapes)
The school focuses on three fundamental geometric expressions:
*   **Triangle:** Cast by drawing a triangle.
*   **Square:** Cast by drawing a square.
*   **Circle:** Cast by drawing a circle.

## 5. Technical Specification
*   **Perspective:** Top-Down 2D (RPG Style).
*   **Resolution:** Native **640x360** (Hi-Bit standard) for pixel-perfect scaling on modern displays.
*   **Grid:** **32x32** pixel tiles for high-density environmental detail.
*   **Rendering:** Subpixel movement with `roundPixels: true` for smooth character and camera interpolation.
*   **Networking:** Colyseus state synchronization with delta compression.
*   **Physics:** Rapier2D (Isomorphic - runs on server and client).
*   **Lighting:** 2D Normal-mapped lighting via Phaser 3 pipeline.
*   **Navigation:** Server-side **A* Pathfinding** for intelligent NPC movement.

## 6. World Population (The Possession System)
Cliffwald uses a **Fixed Slot Architecture**. Student entities are persistent and never deleted from the simulation.
*   **Slot Count:** Exactly 24 students per grade (8 per Doctrine).
*   **Possession:** When a player joins, they "possess" an available student slot of their Doctrine. The AI component is disabled while the player is active.
*   **Unpossession:** Upon logout, control reverts to the "Echo" AI, which resumes its scheduled routine from the player's last position.
*   **Routine Memory:** Each student possesses permanent `routineSpots` (Assigned bed, desk, and dining seat).

## 6. The Living Schedule (Official Timetable)
The server authoritative clock drives the behavior of the world and its NPCs (Echoes).

| Time | Activity | Location | Player Gameplay |
| :--- | :--- | :--- | :--- |
| **07:00** | **Breakfast** | Great Hall | Socialize, eat for buffs, pick up daily quests. |
| **08:30** | **Morning Class (Theory)** | Academic Wing | "Aetheric History" minigame (Memory/Patterns) for XP. |
| **10:30** | **Practical Class** | Training Grounds | "Kinetic Manipulation" gesture practice ($1 Unistroke). |
| **12:30** | **Lunch Break** | Courtyard | Trading, Inventory management, Crafting prep. |
| **14:00** | **Field Study** | Forest/Grounds | Gathering ingredients, solving environmental puzzles. |
| **17:00** | **Elective Class** | Alchemy Lab | "Potion Brewing" rhythm minigame. |
| **19:00** | **Dinner & Assembly** | Great Hall | Doctrine score tally, announcement of daily winners. |
| **21:00** | **Curfew (Night Mode)** | Dorms / Castle | **Stealth Mode:** Avoid Wardens to find rare night-loot. |
| **23:00** | **Sleep** | Dormitories | AFK XP gain or logout safe zone. |

## 7. Academic Calendar & Progression
Cliffwald operates on an accelerated timeline where real-world weeks translate to academic months.

*   **School Year (Course):** 8 real-world weeks.
*   **Timeline:** Each week represents one month, starting in **November** and ending in **June**. Summer months are skipped.
*   **Total Graduation:** The academy consists of **4 Courses**.
    *   Total time to complete the game: 8 weeks/year × 4 years = **32 weeks (approx. 8 months real-time)**.
*   **End of Year:** At the end of Week 8, a "Graduation Ceremony" is held, and players advance to the next Course level.

## 8. Prestige System (Points)
Success in Cliffwald is measured by **Prestige**, which determines the winner of the Doctrine Cup.

*   **No Point Cap:** There is no maximum limit to the points a house can earn. The race is open-ended throughout the school year.
*   **Victory Condition:** At the end of the 8-week course, the house with the highest cumulative Prestige points is declared the winner.
*   **Reset:** After the Graduation Ceremony, house points are reset to zero for the start of the next academic year.

### 8.1 Anti-Sabotage Rule (Point Protection)
To maintain a positive multiplayer environment, a strict **Cap on Losses** is enforced:
*   **Personal Contribution Limit:** A student can never lose more Prestige points than they have personally generated for their house.
*   **Impact:** This ensures that a single malicious player cannot "sabotage" their house by intentionally breaking rules to drain points from the collective work of others.

