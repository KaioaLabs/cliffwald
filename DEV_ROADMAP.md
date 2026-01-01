# Cliffwald2D - Master Development Roadmap (2025 Edition)

Este documento es la guía definitiva para el desarrollo de Cliffwald2D, basada en una auditoría cruzada del "State of the Art" en Diciembre de 2025. Sigue este orden estrictamente para evitar deuda técnica y refactorizaciones dolorosas.

**Filosofía Central:**
*   **Architecture:** Isomorphic Typescript (Shared Logic).
*   **Core:** Functional Core (ECS/Miniplex) + Imperative Shell (Colyseus/Phaser).
*   **Quality:** TDD First (Vitest) para cada sistema lógico.
*   **Data:** Database First para sistemas persistentes.

---

## 🟢 PHASE 0: The Foundation (Completed)
**Goal:** Un mundo físico sincronizado y predictivo.
- [x] **Project Setup:** Monorepo structure (Client/Server/Shared).
- [x] **Physics:** Shared Rapier2D World implemented.
- [x] **Networking:** Colyseus Setup with State Synchronization.
- [x] **Architecture:** ECS (Miniplex) implemented in Shared.
- [x] **Testing:** Vitest configurado y Systema de Movimiento testeado.
- [x] **Client Prediction:** True Isomorphic ECS implemented (Client runs local Miniplex World + Reconciliation).

---

## 🟢 PHASE 1: The Persistent Soul (Database & Auth) (Completed)
**Goal:** Que el jugador exista más allá de la memoria RAM.

- [x] **Database Choice:** Configurado **SQLite** con **Prisma**.
- [x] **ORM Setup:** Instalado **Prisma** (Shared schema).
- [x] **Auth System:**
    - [x] Implementado login "Guest" persistente vía `localStorage`.
    - [x] Base de datos de Usuarios (`User` model).
- [x] **Persistence Layer:**
    - [x] Guardar posición (X, Y) al desconectar.
    - [x] Cargar posición al reconectar (`WorldRoom.onJoin`).

---

## 🟢 PHASE 2: The Core Loop (Inventory & Stats) (Completed)
**Goal:** Propiedad y Progresión.

- [x] **Item Database (Static):**
    - [x] `ItemRegistry` creado (Espada, Poción).
- [x] **Inventory ECS:**
    - [x] `Inventory` component en ECS.
- [x] **Networking:** Sincronización básica de Inventario y Stats vía Colyseus Schema.
- [x] **UI (Client):** Interfaz de texto para Stats (HP) e Inventario.
- [x] **Stats System:**
    - [x] `StatsComponent` (HP, MaxHP, Speed).
    - [x] Sincronización Server->Client.

---

## 🟢 PHASE 4: Content Pipeline (The World) (Completed)
**Goal:** Escalar la creación de contenido sin tocar código.

- [x] **NPC AI:**
    - [x] Implementada Máquina de Estados (Idle, Patrol).
    - [x] `AIComponent` y `AISystem`.
    - [x] NPC de prueba ("NPC_1") spawneado en el servidor.
- [x] **Quest System:**
    - [x] `QuestRegistry` (Estructura de datos JSON-like para misiones).
- [ ] **Map Flow:**
    - [ ] Carga dinámica (Pendiente de expansión de mundo).

---

## 🟢 PHASE 5: Production & Polish (DevOps) (Completed)
**Goal:** Estabilidad y Seguridad.

- [x] **Docker:** `Dockerfile` creado para el servidor.
- [x] **CI/CD:** GitHub Actions (`node.js.yml`) para Tests y Build.
- [x] **Anti-Cheat:** Validaciones de movimiento autoritativas implícitas en `MovementSystem`.

---

## 🟢 PHASE 6: Expansion (Identity & Social) (Completed)
**Goal:** Convertir el prototipo técnico en un juego multijugador real.

- [x] **Identidad:**
    - [x] Pantalla de Login con Selector de Clase/Skin.
    - [x] Persistencia de Skin en Base de Datos.
- [x] **Social:**
    - [x] Sistema de Chat Global (Interfaz HTML overlay + Protocolo).
    - [x] NameTags mejorados con Barra de Vida sobre el personaje.
- [x] **UI/UX RPG:**
    - [x] Inventario Visual en Grilla (Toggle con tecla 'I').
    - [x] Sistema de Equipamiento (Clic para equipar, cambia stats en servidor).

---

# Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev:server` | Starts the Colyseus server (Hot Reload). |
| `npm run dev:client` | Starts the Vite/Phaser client. |
| `npm run start` | Starts both concurrently (if configured) or prod server. |
| `npx vitest` | Runs the TDD suite (Unit Tests for Logic). |
