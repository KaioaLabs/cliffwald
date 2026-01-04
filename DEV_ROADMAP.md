# Cliffwald Online - Development Roadmap (Re-aligned)

**Source of Truth:** "Cliffwald Online – Master Game Design Document (GDD) v3.3" (Adapted for Web/2D)
**Tech Stack:** Phaser 3 (Client) | Colyseus/Node.js (Server) | Rapier2D (Physics) | SQLite/Prisma (DB)
**Note:** The GDD references Godot/3D. This project implements the *spirit* of that design using **2D Top-Down** mechanics.

---

## 🟢 PHASE 1: The Isomorphic Foundation (COMPLETED)
**Goal:** A stable, authoritative multiplayer engine with shared physics and persistence.
- [x] **Architecture:** Node.js Server + Phaser Client (Isomorphic TypeScript).
- [x] **Physics:** Server-side Rapier2D with Client-side Prediction & Interpolation.
- [x] **Networking:** State Synchronization, Delta Compression, and Lag Compensation.
- [x] **Persistence:** SQLite Database + Prisma ORM (Async saving on logout).
- [x] **Security:** Basic Anti-Cheat (Speed/Teleport checks) & Spell Validation.
- [x] **Population:** "Echo" System (AI Bots fill empty slots).
- [x] **Environment:** Tiled Map Integration with Dynamic Lighting pipeline.

---

## 🟡 PHASE 2: Geometric Magic & Visuals (COMPLETED)
- [x] **Tactile Gestures:** Triangle, Square, Circle.
- [x] **Authoritative Projectiles:** Server-synced movement.
- [x] **Silhouette Shadows:** Pixelated dynamic projections.
- [x] **Hi-Bit Scaling:** 640x360 internal resolution & 32x32 tiles.

---

## 🟠 PHASE 3: The Living Academy (COMPLETED - Core)
- [x] **Time System:** Nov-Jun cycle (1 month = 1 week real-time).
- [x] **Routine Engine:** Fixed `routineSpots` per student.
- [x] **Intelligent Navigation:** A* Pathfinding integrated into AI.
- [x] **Possession System:** 24 Persistent student slots (Possess on join).
- [x] **Prestige UI:** Authoritative house point pillars next to the clock.

---

## 🔴 PHASE 4: Content & Social
**Goal:** From "Engine" to "Academy Life".

- [ ] **Academic Interactions:**
    - Trigger "Class Minigame" (Drawing shapes for Prestige).
    - Dining Hall: Buffs for staying in your seat during meal hours.
- [ ] **The Warden System:**
    - AI Wardens patrolling at night with vision cones.
    - Prestige penalty if caught.
- [ ] **Secret Discovery:**
    - Hidden passages revealed only at night or by specific shapes.

---

## 🟣 PHASE 5: Economy & Crafting
**Goal:** "Ethical Economy" pillar.

- [ ] **Gathering:** Spawning resources (Herbs) in the forest.
- [ ] **Inventory UI:** Grid-based bag.
- [ ] **Crafting Minigame:** "Potion Brewing" (Rhythm game style).
- [ ] **Cosmetics:** Shop for uniforms vs street clothes.

---

## 🛠️ Technical Debt & Tools
- [ ] **Asset Pipeline:** Standardize sprite sheets (currently mixing sizes).
- [ ] **Mobile Controls:** Polish Virtual Joystick & Gesture drawing on touch.
- [ ] **Admin Tools:** Commands `/teleport`, `/spawn_echo`, `/set_time`.