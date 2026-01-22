# CLIFFWALD ONLINE – IMPLEMENTATION ROADMAP
**Versión:** 3.3 (Map V5 & GDD Master Sync - Enero 2026)
**Estado:** Fase 7 (Simulation Polish) en Curso.

Este plan prioriza la **Estabilidad Masiva** y la Automatización de Eventos en el nuevo Mapa V5.

---

## ✅ FASE 1-5: FUNDAMENTOS COMPLETADOS
*   **Core:** Stack base, Base de Datos (SQLite/Postgres), Inventario Universal.
*   **Tiempo:** Ciclo Día/Noche (45m), Horarios.
*   **Disciplina:** Prefectos (Line of Sight), Detención.
*   **Academia:** AcademicManager, Minijuegos.
*   **Economía:** ShopSystem, UI de Tienda, Álbum de Cromos.
*   **UX:** Creación de Personaje, Body Snatching (Prioridad de Login).

---

## 🚧 FASE 6: EL MUNDO VIVO (MAPA V5)
*Objetivo: Migrar al mapa orgánico y asegurar que la IA navegue correctamente.*

1.  **✅ Generación de Mapa V5:**
    *   Layout Orgánico 120x160.
    *   Claustros, Santuarios (Ignis/Vesper/Axiom) y Bosque Salvaje definidos.
2.  **✅ Sincronización de Zonas:**
    *   Actualizado `ZoneRegistry` y `SpawnManager` para usar IDs modernos (`CLASSROOM` vs `ACADEMIC_WING`).
    *   Sanitización de IP ("Wild Woods").

---

## 🚧 FASE 7: SIMULATION POLISH (EN PROGRESO)
*Objetivo: Perfeccionar la ilusión de vida (Turing Test) en el nuevo entorno.*

3.  **IA de Echoes (Voz y Rutinas):**
    *   [ ] **Barks System:** Los Echoes deben hablar ("Chat Bubbles") contextualmente (Comedor, Pasillo, Clase).
    *   [ ] **Routine Navigation:** Verificar que la IA puede navegar el Mapa V5 sin atascarse (NavMesh o Waypoints simples).
4.  **Network Smoothing:**
    *   [ ] Optimizar la interpolación de movimiento en redes inestables (Buffer adaptativo).

---

## 🔮 FASE 8: LIVE OPS AUTOMATION
*Objetivo: Automatizar el ciclo de vida del servidor.*

5.  **Gestor de Torneos:** Brackets automáticos de duelo.
6.  **Reset de Temporada:** Limpieza automática manteniendo prestigio.

---

## 🔮 FASE 9: LAS VOCES SUSURRANTES (EXPANSIÓN)
*Objetivo: Capa narrativa avanzada (Sistema Fable).*
*Bloqueada hasta estabilidad total.*
