# CLIFFWALD ONLINE – IMPLEMENTATION ROADMAP
**Versión:** 1.5 (Revisión: Live Ops & Polish - Enero 2026)
**Estado:** Fase 5 Completada. Enfocado en Fase 6 (Torneos) y 7 (Pulido IA).

Este plan prioriza la **Estabilidad Masiva** y la Automatización de Eventos.

---

## ✅ FASE 1: FUNDAMENTOS & PERSISTENCIA
*   **Estado:** COMPLETADO.
*   **Logros:** Stack base, Base de Datos (SQLite/Postgres), Inventario Universal.

## ✅ FASE 2: CHRONOS & ATMÓSFERA
*   **Estado:** COMPLETADO.
*   **Logros:** Ciclo Día/Noche (45m), Horarios, IA Gamer (Salto, Chat), Librería.

## ✅ FASE 3: LA NOCHE & DISCIPLINA
*   **Estado:** COMPLETADO.
*   **Logros:** Prefectos (Line of Sight), Detención (Mazmorra), Anti-AFK.

## ✅ FASE 4: EL BUCLE ACADÉMICO (GAMEPLAY DÍA)
*   **Estado:** COMPLETADO.
*   **Logros:**
    *   **MinigameManager:** Infraestructura Cliente lista.
    *   **Clase Encantamientos:** Minijuego "Runic Timing" (Timing preciso).
    *   **Clase Pociones:** Minijuego "Cauldron Stir" (Machacar botón).
    *   **Clase Historia:** Minijuego "Archive Memory" (Simon Says).
    *   **Integración:** El servidor envía `start_minigame` al sentarse en clase.

## ✅ FASE 5: ECONOMÍA & COMERCIO
*   **Estado:** COMPLETADO.
*   **Logros:**
    *   **ShopSystem:** Lógica de servidor para compra/venta.
    *   **UI:** Interfaz de Tienda (`ShopDialog`) funcional.
    *   **Moneda:** Integración completa con Prestigio.

---

## 🚧 FASE 6: LIVE OPS & CLÍMAX (EN PROGRESO)
*Objetivo: Automatizar el ciclo de vida del servidor sin intervención humana.*

1.  **Gestor de Torneos (TournamentSystem):**
    *   Lógica para brackets de duelo automáticos (Viernes Noche).
    *   Anuncio global de ganadores.
2.  **Reset de Temporada:**
    *   Script para limpiar inventarios/progreso (manteniendo nombres/fama).
    *   Transición suave entre "Fin de Curso" y "Nuevo Año".

## 🚧 FASE 7: SIMULATION POLISH (EN PROGRESO)
*Objetivo: Perfeccionar la ilusión de vida (Turing Test).*

3.  **IA de Echoes Avanzada (Refinamiento):**
    *   Ajustar los "Archetypes" (Socializer, Killer, Achiever) para que sean más distinguibles.
    *   Pulir la navegación (Pathfinding) para evitar atascos en puertas.
4.  **Network Smoothing:**
    *   Optimizar la interpolación de movimiento en redes inestables.
    *   Reducir el ancho de banda de los mensajes de actualización de entidades.

---

## 🔮 FASE 8: LAS VOCES SUSURRANTES (POST-MVP / EXPANSIÓN)
*Objetivo: Capa narrativa avanzada (Sistema Fable).*
*Nota: Esta fase queda **bloqueada** hasta que la simulación base sea perfecta.*

5.  **Gestor de Misiones:** Tareas procedurales Orden vs Caos.
6.  **Interfaz de Susurros:** UI de elección moral.
7.  **Calculadora de Elegidos:** Lógica compleja de alineación.
