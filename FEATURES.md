# Cliffwald2D - Documentación Técnica de Implementación

Este documento detalla todas las características y sistemas implementados en el proyecto, organizados por fases.

---

## 🟢 Phase 0: The Foundation (Arquitectura Base)
**Meta:** Un mundo físico sincronizado y predictivo.

*   **Arquitectura Isomórfica:** El código en `src/shared` es compartido por el servidor (Node.js) y el cliente (Phaser), permitiendo que ambos ejecuten la misma lógica de física y ECS.
*   **Networking (Colyseus):** Servidor autoritativo que gestiona el estado global (`GameState`) y lo sincroniza con los clientes.
*   **Física (Rapier2D):** Integración de Rapier para colisiones y movimiento dinámico.
*   **ECS (Miniplex):** Sistema de Entidades-Componentes para gestionar la lógica de juego de forma desacoplada.
*   **Client Prediction & Reconciliation:** El cliente predice su propio movimiento localmente y se reconcilia con la posición del servidor si hay discrepancias mayores a 2px.
*   **Snapshot Interpolation:** Los jugadores remotos se renderizan usando un buffer de 150ms para suavizar el movimiento a pesar de la latencia.

---

## 🟢 Phase 1: Database & Auth (Persistencia)
**Meta:** Que el jugador exista más allá de la memoria RAM.

*   **Motor de BD:** SQLite (archivo local `prisma/dev.db`).
*   **ORM (Prisma):** Modelado de datos en `prisma/schema.prisma`.
*   **Autenticación Guest:**
    *   **Cliente:** Genera un nombre de usuario aleatorio y lo persiste en `localStorage`.
    *   **Servidor:** Al unir/crear la sesión, se busca el usuario en la DB; si no existe, se crea un registro de `User` y `Player`.
*   **Persistencia de Posición:** Al desconectarse (`onLeave`), el servidor guarda las coordenadas (X, Y) actuales en la tabla `Player`. Al reconectar, el jugador aparece exactamente donde lo dejó.

---

## 🟢 Phase 2: Core Loop (Inventario y Estadísticas)
**Meta:** Propiedad y Progresión.

*   **Item Registry:** Base de datos estática en `src/shared/items/ItemRegistry.ts` con tipos de items (Weapon, Potion, Resource).
*   **Sistema de Inventario:**
    *   Componente ECS `inventory` que almacena un array de items y capacidad.
    *   Sincronización en tiempo real del inventario vía Colyseus `ArraySchema`.
*   **Estadísticas (Stats):**
    *   Componente ECS `stats` (HP, MaxHP, Speed).
    *   Visualización en el cliente mediante un HUD de texto simple.

---

## 🟢 Phase 3: The Action (Combate e Interacción)
**Meta:** Interacción con el mundo y otros jugadores.

*   **Sistema de Combate Melee:**
    *   **Input:** Activado por la tecla `Espacio`.
    *   **Detección de Hits:** Uso de sensores circulares en Rapier (`intersectionsWithShape`) proyectados frente al jugador basándose en su dirección (`facing`).
    *   **Cooldown:** Sistema de enfriamiento de 500ms entre ataques.
*   **Direccionamiento (Facing):** El sistema de movimiento actualiza automáticamente el componente `facing` para que el jugador ataque siempre hacia donde se movió por última vez.

---

## 🟢 Phase 4: Content Pipeline (NPCs y Quests)
**Meta:** Escalar la creación de contenido.

*   **IA de NPCs:**
    *   **AISystem:** Procesa entidades con el componente `ai`.
    *   **Máquina de Estados:** Soporta estados `idle` y `patrol`. Los NPCs eligen direcciones al azar y patrullan su zona de spawn.
    *   **Spawn:** NPC de prueba ("NPC_1") configurado como "Village Elder".
*   **Estructura de Quests:**
    *   `QuestRegistry.ts` define la estructura de misiones, pasos, objetivos (NPCs) y recompensas.

---

## 🟢 Phase 5: Production & Polish (DevOps)
**Meta:** Estabilidad y Despliegue.

*   **Dockerización:** `Dockerfile` optimizado para Node.js, incluyendo la generación del cliente de Prisma.
*   **CI (Integración Continua):** GitHub Actions configurado para ejecutar `npm test` y `tsc --noEmit` en cada push, garantizando que el código no se rompa.
*   **Seguridad:** Validación de inputs en el servidor y movimiento autoritativo para evitar speedhacks.

---

## 🟢 Phase 6: Expansion (Identity, Social & UI)
**Meta:** Experiencia de usuario completa.

*   **Identidad y Persistencia Visual:**
    *   **Selector:** Pantalla HTML/CSS superpuesta para elegir Nombre y Clase (Skin).
    *   **Persistencia:** El campo `skin` se guarda en base de datos. Al reconectar, mantienes tu apariencia.
*   **Sistema de Chat:**
    *   **Protocolo:** Mensajes `chat` broadcasted por el servidor.
    *   **Interfaz:** Historial de chat con scroll y input box.
*   **Inventario Visual (Grid):**
    *   **UI:** Grilla 4xN generada dinámicamente con CSS.
    *   **Equipamiento:** Clic en un item envía mensaje `equip` al servidor.
    *   **Feedback:** Los items equipados muestran un borde verde.
*   **HUD Avanzado:**
    *   **NameTags:** Muestran el nombre real del jugador (no ID).
    *   **Barras de Vida:** Renderizadas dinámicamente sobre el personaje, actualizadas en tiempo real.
