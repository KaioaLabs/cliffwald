# CLIFFWALD ONLINE – IMPLEMENTATION ROADMAP
**Versión:** 1.2 (Enero 2026)
**Objetivo:** Sincronizar codebase actual con GDD Master v1.3 (Cyclic Week Update).

Este documento detalla los pasos necesarios para llevar el código actual (v0.1.X) al estado descrito en el GDD ("Visión Final").

---

## FASE 1: FUNDAMENTOS & PERSISTENCIA (BACKEND)
*Objetivo: Que la base de datos soporte las nuevas métricas de Alineación y XP.*

1.  **Actualización de Schema de Base de Datos (Prisma):**
    *   Añadir campo `xp` (Int) al modelo `Player`.
    *   Añadir campo `alignment` (Int, default 0) al modelo `Player`. *Nota: Este valor será oculto para el cliente.*
    *   Añadir campo `academicPoints` (Int) para rastrear los "PA" acumulados en clases.
2.  **Sincronización Server-DB:**
    *   Actualizar `PlayerService.ts` para leer/escribir estos nuevos campos al iniciar/cerrar sesión.
    *   Asegurar que `alignment` se cargue en el `alignmentMap` privado de `WorldRoom` y NO en el estado público de Colyseus.
3.  **Seguridad del Echo (Offline):**
    *   Asegurar que los jugadores desconectados (Echoes) sean marcados como `invulnerable` en `WorldRoom`.
    *   Bloquear cualquier modificación de inventario o stats para Echoes.
    *   **Echo Attendance:** Implementar ganancia pasiva de PA (Mantenimiento) en `WorldRoom`. [COMPLETADO]

## FASE 2: CHRONOS & ATMÓSFERA (UI/UX)
*Objetivo: Implementar la "Semana Cíclica" visualmente.*

4.  **UI de Calendario Cíclico:**
    *   Crear componente UI `CalendarWidget` en el cliente.
    *   Conectar con `getAcademicProgress` del servidor.
    *   **Lógica:** Mostrar Día de la Semana (Lunes-Domingo) y Capítulo Narrativo (Semana Real 1-8).
    *   **Ciclo:** 1 Sol = 1 Día. 
5.  **Horarios por Ventanas (Time Windows):**
    *   Refactorizar `AISystem` y `UIManager` para usar las nuevas ventanas de tiempo (rangos) definidas en `Config.ts`.
    *   Validar que el crédito de clase se otorgue al entrar en *cualquier momento* de la ventana.

## FASE 3: EL BUCLE ACADÉMICO (GAMEPLAY DÍA)
*Objetivo: Dar sentido a las clases y otorgar los PA con variedad.*

6.  **Variedad de Minijuegos Académicos:**
    *   Diseñar e implementar prototipos para las 3 ramas principales:
        *   **Encantamientos:** Dibujo de precisión (Existente).
        *   **Pociones:** Minijuego de ritmo/timing (QTE).
        *   **Historia:** Minijuego de memoria secuencial.
    *   Implementar sistema de rotación semanal para estos minijuegos.
7.  **Sistema de Calificaciones:**
    *   Ajustar evaluación para usar las nuevas notas (S/A/B/T) y recompensas de PA.

## FASE 4: LAS VOCES SUSURRANTES (SISTEMA FABLE)
*Objetivo: Implementar la mecánica de elección moral binaria.*

8.  **Gestor de Misiones (Server):**
    *   Crear sistema `MissionManager` que genere tareas procedurales o scripteadas.
    *   Implementar la lógica "Dual": Cada misión debe tener dos variantes (Orden vs Caos).
9.  **Interfaz de "Susurros" (Cliente):**
    *   Crear UI especial que represente al Director (Luz) y al Hermano (Sombra).
    *   Permitir elección explícita de ruta.

## FASE 5: LA NOCHE & DISCIPLINA (GAMEPLAY NOCHE)
*Objetivo: Convertir la noche en una fase de tensión y sigilo, sin muerte permanente.*

10. **IA de Prefectos:**
    *   Crear tipo de NPC `Prefect` que solo spawnea/patrulla de 22:00 a 06:00.
    *   Implementar habilidad "Detectar Aura" (cono de visión).
    *   **Lógica de Captura:** Si tocan a un alumno, activan "Detención" (no combate).
11. **Mecánica de Detención (Trabajos Forzados):**
    *   Teletransportar a sala aislada ("Detention Room").
    *   **Timer Activo:** El contador de 10 min solo baja si el jugador interactúa con objetos de limpieza (minijuego de clicks).
    *   **Anti-AFK:** Si no hay input en 30s, el timer se pausa.
12. **Mecánica de Inconsciencia y Enfermería:**
    *   **Eliminar Muerte:** Al llegar a 0 HP, cambiar estado a `unconscious`.
    *   **Lógica de Zona:**
        *   Si es `DuelZone` o `Supervised` -> Timer de 5s y levantarse con 1 HP.
        *   Si es `Unsupervised` (Noche/Bosque) -> Teletransporte a `Infirmary`.
    *   **Enfermería:** Implementar zona de respawn y la "Caminata de la Vergüenza" (volver a pie).
12. **Fizzle & Input Forgiveness:**
    *   Verificar visualmente el efecto "Fizzle" en cliente.
    *   Asegurar que el servidor NO aplica estados de bloqueo (stun) por fallos de casteo.
    *   **Ajuste de Algoritmo:** Calibrar `GestureManager` para aceptar trazos con score > 0.7 como válidos ("imantado") pero otorgar rangos de calidad (B/A/S) basados en la precisión real.

## FASE 6: ECONOMÍA & COMERCIO
*Objetivo: Fomentar la interacción social a través de bienes.*

13. **Sistema de Trading:**
    *   Implementar comando/UI de "Solicitar Intercambio".
    *   Crear interfaz de intercambio seguro (doble confirmación) para items y cartas.
14. **NPC Vendors (Fallback Economy):**
    *   Implementar `ShopSystem` en servidor. [COMPLETADO]
    *   Implementar `ShopDialog` UI en cliente para interactuar. [PENDIENTE]

## FASE 7: EL CLÍMAX ESTACIONAL (LIVE OPS)
*Objetivo: Automatizar el final del curso.*

15. **Calculadora de Elegidos:**
    *   Crear función `calculateTwins()` que se ejecute al final de la Semana 8.
16. **Evento "El Duelo Final":**
    *   Script de servidor que fuerce el teletransporte de todos los jugadores al Patio.
    *   **Modo Espectador:** Deshabilitar hechizos para todos excepto los dos duelistas. Habilitar solo Chat y Emotes.
17. **Reset de Temporada:**
    *   Lógica para archivar el curso y comenzar el siguiente.

## FASE 8: POLISH & REFACTOR
*Objetivo: Asegurar estabilidad.*

18. **Refactorización de NPCs (Teachers):**
    *   Diferenciar comportamientos de los 4 profesores principales.
19. **Auditoría Final de Seguridad:**
    *   Verificar que `alignment` nunca se filtra al cliente.

## NOTAS DE RIESGO FUTURO
*   **Economía Abierta:** Vigilar patrones de RMT o muling. Considerar límites de trade si la economía se desestabiliza.