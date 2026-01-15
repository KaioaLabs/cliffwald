# CLIFFWALD ONLINE – IMPLEMENTATION ROADMAP
**Versión:** 1.6 (Deploy Ready - Enero 2026)
**Estado:** Fase 5 Completada. Fase 6 (Live Ops) En Curso. QA Completado.

Este plan prioriza la **Estabilidad Masiva** y la Automatización de Eventos.

---

## ✅ FASE 1: FUNDAMENTOS & PERSISTENCIA
*   **Estado:** COMPLETADO.
*   **Logros:** Stack base, Base de Datos (SQLite/Postgres), Inventario Universal.

## ✅ FASE 2: CHRONOS & ATMÓSFERA
*   **Estado:** COMPLETADO.
*   **Logros:** Ciclo Día/Noche (45m), Horarios, IA Gamer (Salto, Chat), Librería.
*   **Polish:** Time Jump Debug robusto y persistencia de hora.

## ✅ FASE 3: LA NOCHE & DISCIPLINA
*   **Estado:** COMPLETADO.
*   **Logros:** Prefectos (Line of Sight), Detención (Mazmorra), Anti-AFK.

## ✅ FASE 4: EL BUCLE ACADÉMICO (GAMEPLAY DÍA)
*   **Estado:** COMPLETADO.
*   **Logros:**
    *   **AcademicManager:** Sistema centralizado de asistencia y notas.
    *   **Minijuegos:** Encantamientos, Pociones, Historia.
    *   **UI:** Calendario funcional con resaltado de hora actual.

## ✅ FASE 5: ECONOMÍA & COMERCIO
*   **Estado:** COMPLETADO.
*   **Logros:**
    *   **ShopSystem:** Lógica de servidor para compra/venta.
    *   **UI:** Interfaz de Tienda (`ShopDialog`) funcional.
    *   **Coleccionismo:** Álbum de Cromos con persistencia.

## ✅ CONTROL DE CALIDAD (QA) & AUDITORÍA
*   **Estado:** COMPLETADO.
*   **Logros:**
    *   **Unit Tests:** 50/50 Tests (Vitest) cubriendo Isomorphic Physics e IA.
    *   **E2E Tests:** Auditoría de Sesión Automática (Playwright).
    *   **Pathfinding Polish:** Implementado **Bresenham Corner Validation** y **String Pulling (Smooth Path)**.
    *   **Anti-Hive Mind:** Implementado **Stochastic Reaction Latency** y **Deterministic Lane Offsets**.

## ✅ FASE 5.5: GESTIÓN DE CUENTAS (UX POLISH)
*   **Estado:** COMPLETADO.
*   **Logros:**
    *   **Creación de Personaje:** Flujo de matrícula (Nombre/Casa) separado del registro.
    *   **Gestión:** Renombrado (1 vez) y Borrado de personaje implementados.
    *   **Body Snatching:** Sistema de prioridad de acceso en servidores llenos.

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

3.  **✅ IA de Echoes Avanzada (Refinamiento):**
    *   Humanización: "Lane Logic" (Carriles) y "Reaction Delay" implementados.
    *   Stuck Detection: Sistema de desatasco automático.
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