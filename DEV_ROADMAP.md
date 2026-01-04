# Cliffwald2D - Master Development Roadmap (2025 Edition)

**Status:** 🟢 STABLE ENGINE (Ready for Content)

## 🟢 PHASE 0: The Foundation (Completed)
- [x] Shared Physics (Rapier).
- [x] State Sync (Colyseus).
- [x] ECS Architecture.

## 🟢 PHASE 1: Persistence & Identity (Completed)
- [x] SQLite + Prisma Integration.
- [x] Auth System (JWT/Bcrypt).
- [x] Echo System (Offline Player -> NPC).

## 🟢 PHASE 2: Engine & Tooling (Completed - NEW)
**Goal:** Professional Development Workflow.
- [x] **Debug Visualizer:** Server-Authoritative Ghost rendering.
- [x] **Lighting Pipeline:** Tiled "Lights" layer integration.
- [x] **Hot-Reload Workflow:** Auto-reconnect client on server restart.
- [x] **In-Game Inspector:** Tweakpane integration for runtime adjustments.

## 🟢 PHASE 2.5: Security & Optimization Audit (Completed)
- [x] **Anti-Cheat:** Spell Validation & Cooldowns.
- [x] **Stability:** Async Persistence (Non-blocking DB).
- [x] **Memory Safety:** Echo Limits (Max 50).
- [x] **Optimization:** Server Tick Rate (30 FPS).

## 🟡 PHASE 3: Gameplay Loop (Next Up)
**Goal:** From "Tech Demo" to "Game".
- [ ] **Loot System:** Dropping/Picking up items.
- [ ] **Combat 2.0:** Damage, Death, Respawn (Re-implementation with polish).
- [ ] **Chat System:** Commands like /spawn, /kill.

---

# Developer Guide

## How to add Lights
1. Open `assets/maps/world.json` in Tiled.
2. Create an Object Layer named `Lights`.
3. Add Point Objects.
4. Add Custom Properties: `color` (color), `radius` (float), `intensity` (float).
5. Save. The game updates automatically.

## How to Debug Lag
1. Open the game.
2. Expand "Network" in the top-right panel.
3. Check "Show Server Ghost".
4. If Red Box (Server) drifts far from Green Box (Client), adjust `RECONCILIATION_THRESHOLD` in `Config.ts`.