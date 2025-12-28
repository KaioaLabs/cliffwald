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

## 🟡 PHASE 1: The Persistent Soul (Database & Auth)
**Goal:** Que el jugador exista más allá de la memoria RAM.
*Requisito: No avanzar a Inventario sin esto.*

- [ ] **Database Choice:** Configurar **PostgreSQL** (Supabase recomendado por facilidad/coste en 2025) o **SQLite** (si es local estricto).
- [ ] **ORM Setup:** Instalar **Prisma** o **DrizzleORM** (Shared types).
- [ ] **Auth System:**
    - [ ] Implementar login simple (Username/Password) o Guest.
    - [ ] Generar `PlayerSession` token.
- [ ] **Persistence Layer:**
    - [ ] Guardar posición (X, Y) al desconectar.
    - [ ] Cargar posición al reconectar.

---

## 🟠 PHASE 2: The Core Loop (Inventory & Stats)
**Goal:** Propiedad y Progresión.
*Requisito: Database funcionando.*

- [ ] **Item Database (Static):**
    - [ ] Crear JSON/DB de definiciones de items (Espada, Poción).
    - [ ] **TDD:** Testear carga de definiciones.
- [ ] **Inventory ECS:**
    - [ ] Crear `InventoryComponent` (Array de Slots).
    - [ ] **TDD:** Testear `addItem`, `removeItem`, `stackItem` (Lógica pura).
- [ ] **Networking:** Sincronizar Inventario vía Colyseus Schema.
- [ ] **UI (Client):** Crear interfaz de inventario en Phaser (Drag & Drop).
- [ ] **Stats System:**
    - [ ] Crear `StatsComponent` (Health, MaxHealth, Speed).
    - [ ] Sistema que recalcula Stats basado en Equipo (Inventory).

---

## 🔴 PHASE 3: The Action (Combat & Interaction)
**Goal:** Interacción con el mundo y otros jugadores.
*Requisito: Stats e Inventario funcionando.*

- [ ] **Interaction System:**
    - [ ] Raycast/Proximity check para interactuar con NPCs/Objetos.
- [ ] **Combat ECS:**
    - [ ] Definir `WeaponComponent` y `HitboxComponent`.
    - [ ] **Server:** Validar ataque (Rango, Cooldown).
    - [ ] **Shared:** Calcular daño (Stats Atacante vs Defensa Defensor).
    - [ ] **TDD:** Testear fórmula de daño.
- [ ] **Death & Respawn:**
    - [ ] Lógica de estado `Dead`.
    - [ ] Drop de items (si es hardcore) o penalización.

---

## 🟣 PHASE 4: Content Pipeline (The World)
**Goal:** Escalar la creación de contenido sin tocar código.

- [ ] **Map Flow:**
    - [ ] Carga dinámica de chunks o cambio de mapas (Portales).
- [ ] **NPC AI:**
    - [ ] Implementar Máquina de Estados (Idle, Patrol, Chase).
    - [ ] Usar ECS para la IA (`AIComponent`).
- [ ] **Quest System:**
    - [ ] Estructura de datos para Misiones (Kill X, Fetch Y).

---

## 🔵 PHASE 5: Production & Polish (DevOps)
**Goal:** Estabilidad y Seguridad.

- [ ] **Docker:** Crear `Dockerfile` para el servidor.
- [ ] **CI/CD:** GitHub Actions para correr tests (`vitest`) antes de mergear.
- [ ] **Anti-Cheat:** Validaciones de servidor estrictas (Speedhack check).
- [ ] **Monitoring:** Dashboard básico (Jugadores online, CPU load).

---

# Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev:server` | Starts the Colyseus server (Hot Reload). |
| `npm run dev:client` | Starts the Vite/Phaser client. |
| `npm run start` | Starts both concurrently (if configured) or prod server. |
| `npx vitest` | Runs the TDD suite (Unit Tests for Logic). |

---

# Guía de Uso
1.  **NO SALTES PASOS.** No intentes hacer combate si no tienes dónde guardar la vida del jugador (Phase 1 & 2).
2.  **TDD SIEMPRE.** Antes de crear una mecánica ("El jugador regenera vida"), escribe el test en `src/shared`.
3.  **Consulta:** Usa este archivo para pedirme la siguiente tarea: *"Gemini, vamos a empezar la Fase 1, configura Prisma con SQLite."*
