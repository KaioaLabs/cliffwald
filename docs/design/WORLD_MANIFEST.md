# WORLD MANIFEST (Spatial Architecture)
**Version:** 3.3 (Sync with GDD Master v3.3 & Map V5)
**Sync Status:** Manual Sync required with `assets/maps/world.json`

Este documento define la **Semántica Espacial** de Cliffwald. El código del servidor NO debe calcular coordenadas mediante matemáticas (ej. `x + 32`), sino consultar este registro de **Anchors** (Puntos de Anclaje).

---

## 1. ZONAS (VOLUMES & RULES)
Las zonas son contenedores lógicos definidos por polígonos en la capa `Logic` de Tiled.

| Zone ID | Rule Set | PVP State | Features |
| :--- | :--- | :--- | :--- |
| **`CLASSROOM`** | `class` | Night Only | Pupitres, Pizarra, Minijuegos. (Antiguo ACADEMIC_WING) |
| **`GREAT_HALL`** | `social`, `eat` | Night Only | Mesas Comunes. |
| **`COURTYARD`** | `free`, `pvp_duel` | Night Only | Zona de Duelos, Puntos de Encuentro. |
| **`DORM_IGNIS`** | `sleep`, `safe` | **NEVER** | Santuario Absoluto. Torre Norte. |
| **`DORM_AXIOM`** | `sleep`, `safe` | **NEVER** | Santuario Absoluto. Ala Este. |
| **`DORM_VESPER`** | `sleep`, `safe` | **NEVER** | Santuario Absoluto. Ala Oeste (Mazmorra). |
| **`FOREST`** | `unsafe`, `pve` | **ALWAYS** | The Wild Woods. Zona sin ley. |
| **`INFIRMARY`** | `safe` | **NEVER** | Santuario de Recuperación. |

---

## 2. ANCHORS (INTERACTION SOCKETS)
Los Anchors son puntos exactos (x,y) leídos de la capa `FixedSeats`.
*El código debe buscar por `Anchor ID`, nunca por coordenadas.*

### 2.1. Dormitorios (Sleeping Spots)
*Total: 96 Sockets (32 por Casa)*

| Anchor ID Pattern | Count | Target Entity | Use Case |
| :--- | :--- | :--- | :--- |
| `seat_bed_ignis_{n}` | 0-31 | Student (Ignis) | Dormir, Respawn, Logout. |
| `seat_bed_axiom_{n}` | 0-31 | Student (Axiom) | Dormir, Respawn, Logout. |
| `seat_bed_vesper_{n}` | 0-31 | Student (Vesper) | Dormir, Respawn, Logout. |

### 2.2. Aulas (Learning Spots)
*Total: 32+ Sockets*

| Anchor ID Pattern | Count | Target Entity | Use Case |
| :--- | :--- | :--- | :--- |
| `seat_class_{n}` | 0-31 | Student (Any) | Asistencia a Clase (Minijuego). |
| `spot_teacher_class` | 1 | Teacher | Punto de pivote para la IA del profesor. |

### 2.3. Comedor (Dining Spots)
*Total: 90+ Sockets*

| Anchor ID Pattern | Count | Target Entity | Use Case |
| :--- | :--- | :--- | :--- |
| `seat_food_{table}_{n}` | 0-90 | Student (Any) | Socializar, Comer. |

---

## 3. PROTOCOLOS DE SEGURIDAD
*   **Santuarios:** Zonas marcadas como `isSanctuary: true` en `ZoneRegistry` bloquean daño a nivel de servidor.
*   **Echoes:** Los NPCs (Echoes) usan estos anchors para sus rutinas. Si un jugador ocupa un asiento, el NPC busca el siguiente libre o deambula cerca.