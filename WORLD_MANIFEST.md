# WORLD MANIFEST (Spatial Architecture)
**Version:** 1.0 (Live Atlas)
**Sync Status:** Manual Sync required with `assets/maps/world.json`

Este documento define la **Semántica Espacial** de Cliffwald. El código del servidor NO debe calcular coordenadas mediante matemáticas (ej. `x + 32`), sino consultar este registro de **Anchors** (Puntos de Anclaje).

---

## 1. ZONAS (VOLUMES & RULES)
Las zonas son contenedores lógicos definidos por polígonos en la capa `Logic` de Tiled.

| Zone ID | Rule Set | Max Capacity | Features |
| :--- | :--- | :--- | :--- |
| **`ACADEMIC_WING`** | `class` | 50 | Pupitres, Pizarra, Minijuegos. |
| **`GREAT_HALL`** | `social`, `eat` | 100 | Mesas de Casa, Regeneración de HP. |
| **`COURTYARD`** | `free`, `pvp_duel` | Infinite | Zona de Duelo (Tatami), Puntos de Encuentro. |
| **`DORM_IGNIS`** | `sleep`, `safe` | 8 | Camas Privadas, Cofres. |
| **`DORM_AXIOM`** | `sleep`, `safe` | 8 | Camas Privadas, Cofres. |
| **`DORM_VESPER`** | `sleep`, `safe` | 8 | Camas Privadas, Cofres. |
| **`FOREST`** | `unsafe`, `pve` | Infinite | Spawns de Mobs, Recolección. |
| **`DETENTION`** | `prison` | 5 | Tareas de Mantenimiento, Sin Salida. |

---

## 2. ANCHORS (INTERACTION SOCKETS)
Los Anchors son puntos exactos (x,y) leídos de la capa `FixedSeats` o `Points`.
*El código debe buscar por `Anchor ID`, nunca por coordenadas.*

### 2.1. Dormitorios (Sleeping Spots)
*Total: 24 Sockets*

| Anchor ID Pattern | Count | Target Entity | Use Case |
| :--- | :--- | :--- | :--- |
| `seat_bed_ignis_{n}` | 0-7 | Student (Ignis) | Dormir, Respawn, Logout. |
| `seat_bed_axiom_{n}` | 0-7 | Student (Axiom) | Dormir, Respawn, Logout. |
| `seat_bed_vesper_{n}` | 0-7 | Student (Vesper) | Dormir, Respawn, Logout. |

### 2.2. Aulas (Learning Spots)
*Total: 24 Sockets*

| Anchor ID Pattern | Count | Target Entity | Use Case |
| :--- | :--- | :--- | :--- |
| `seat_class_{n}` | 0-23 | Student (Any) | Asistencia a Clase (Minijuego). |
| `spot_teacher_class` | 1 | Teacher | Punto de pivote para la IA del profesor. |

### 2.3. Comedor (Dining Spots)
*Total: 24 Sockets*

| Anchor ID Pattern | Count | Target Entity | Use Case |
| :--- | :--- | :--- | :--- |
| `seat_food_ignis_{n}` | 0-7 | Student (Ignis) | Socializar, Comer. |
| `seat_food_axiom_{n}` | 0-7 | Student (Axiom) | Socializar, Comer. |
| `seat_food_vesper_{n}` | 0-7 | Student (Vesper) | Socializar, Comer. |

### 2.4. Duelos (Combat Rings)
*Total: 4 Sockets (Centros)*

| Anchor ID | Radius | Use Case |
| :--- | :--- | :--- |
| `duel_ring_1` | 100px | Duelo 1v1 (Ranking). |
| `duel_ring_2` | 100px | Duelo 1v1 (Ranking). |
| `duel_ring_3` | 100px | Duelo 1v1 (Práctica). |
| `duel_ring_4` | 100px | Duelo 1v1 (Práctica). |

---

## 3. DEUDA TÉCNICA Y MIGRACIÓN
Para cumplir con este estándar, el código actual en `SpawnManager.ts` debe ser refactorizado:

*   **Estado Actual (Legacy):**
    ```typescript
    // ❌ BAD: Hardcoded Math
    const sleepPos = {
        x: dormPos.x + (bedCol * TILE_SIZE * 2), // Si mueves la cama 1px en Tiled, esto falla.
        y: dormPos.y + (bedRow * TILE_SIZE * 3)
    };
    ```

*   **Estado Objetivo (Standard):**
    ```typescript
    // ✅ GOOD: Data Driven
    const sleepPos = this.levelRegistry.getAnchor(`seat_bed_${house}_${index}`);
    ```

### Pasos de Migración:
1.  [ ] Asegurar que todos los muebles en `world.json` tengan la propiedad `name` o `id` siguiendo la nomenclatura `seat_TYPE_HOUSE_INDEX`.
2.  [ ] Actualizar `MapParser.ts` para indexar estos puntos en un mapa `Map<string, Vector2>`.
3.  [ ] Reescribir `SpawnManager.ts` para eliminar la matemática de grids y usar `getAnchor()`.
