# CLIFFWALD ONLINE – GAME DESIGN DOCUMENT (MASTER)

**Versión:** 4.0 (The Occlusion Update - Enero 2026)
**Estado:** Diseño Cerrado para Prototipo.

---

## 1. HIGH CONCEPT
**Cliffwald Online** es un Juego Online de nicho ("Small World") de **Simulación Académica Viva**. Un escenario teatral persistente donde ~100 estudiantes (jugadores o IAs) conviven bajo la autoridad absoluta del tiempo.

---

## 2. SISTEMA DE TIEMPO: "LA DICTADURA DEL RELOJ"

### 2.1. El Reloj Atmosférico (Ritmo Arcade)
*   **Ciclo Total:** 45 Minutos Reales.
*   **Día (30 Min):** Vida académica y social.
*   **Noche (15 Min):** Toque de Queda. Peligro y sigilo.

### 2.2. Horario y Compromiso (Low Grind)

| Hora | Actividad | Ubicación | Mecánica |
| :--- | :--- | :--- | :--- |
| **07:00 - 08:30** | Desayuno | Dining Hall | Buff de Regeneración. |
| **08:30 - 12:30** | Clase Mañana | Classroom | **Minijuego (3-5 min)**. |
| **12:30 - 14:00** | Comida | Dining Hall | Socialización. |
| **14:00 - 20:00** | Tiempo Libre | Central Courtyard | Social / Exploración / Duelos. |
| **20:00 - 22:00** | Cena | Dining Hall | Socialización. |
| **22:00 - 07:00** | Toque de Queda | Dormitorios | **Zona PvPvE Activa**. |

---

## 3. POBLACIÓN E IDENTIDAD (SISTEMA DE POSESIÓN)

### 3.1. Arquitectura "Teatro de Autómatas"

El servidor mantiene vivos ~100 cuerpos ("Echos") permanentemente en teoría, pero en la versión actual (MVP) se simula el **Primer Año** visualmente.

*   **Población Implementada:** 96 Estudiantes Totales (3 Casas x 8 Estudiantes/Año x 4 Años).
*   **Estructura Académica:** La escuela consta de 4 cursos (Primer a Cuarto Año).
*   **Sala Común vs Dormitorios:**
    *   Lo que se ve en el mapa es la **Sala Común** de cada casa (Zona Social).
    *   Las **8 Camas Visibles** corresponden a los alumnos de **Primer Año** (Jugadores).
*   **Verticalidad Mágica (Veteranos - 2º a 4º Año):**
    *   **Persistencia Real:** Los 72 alumnos veteranos **nunca desaparecen** del servidor. Siguen existiendo y simulándose.
    *   **Rutina de Noche:** Caminan hacia la "Escalera de los Dormitorios". Al llegar, entran en estado **"Sleeping Upstairs"** (se vuelven invisibles e intangibles), simulando que han subido a sus habitaciones privadas en pisos superiores.
    *   **Rutina de Mañana:** Bajan por las escaleras (se hacen visibles) y comienzan su día.
*   **Restricción de Acceso:** Solo las instalaciones de Primer Año (Planta Baja) son accesibles.
    *   **Escaleras a Aulas Superiores:** Situadas junto al aula de primero, bloqueadas. Los alumnos de cursos superiores las usan para "ir a clase" (desaparecen al subir).
    *   **Escaleras a Dormitorios:** Situadas en las Salas Comunes.
*   **Conexión (Login):** El jugador posee un cuerpo disponible de su casa (Primer Año).
*   **Desconexión (Logout):** El cuerpo se convierte en "Echo" (NPC).
*   **Variedad Visual:** El Echo mantiene la última skin equipada por el jugador.

### 3.2. Gestión de Límite (Hard Cap)

El servidor es una instancia única para la comunidad.

*   **Capacidad:** 24 Jugadores simultáneos (Escalable a ~100 en futuras fases).
*   **Regla del Jugador #101:** Si el servidor está lleno, los nuevos jugadores entran en **Cola de Espera**. No se expulsa a nadie.

---

## 4. SISTEMA DE MAGIA Y COMBATE

### 4.1. Magia Gestual ($1 Unistroke)
*   **Input:** Dibujo real (Ratón/Táctil).
*   **Validación:** Cliente con validación de servidor.

### 4.2. Reglas de Espacio y PvP (Santuarios)

| Tipo de Zona | Ejemplo | PvP State | Regla Especial |
| :--- | :--- | :--- | :--- |
| **Santuario Absoluto** | Dorms, Infirmary | **Desactivado** | Magia de daño bloqueada 24/7. |
| **Zona Condicional** | Pasillos, Patio | **Noche** | PvP activo de 22:00 a 07:00. |
| **Zona Salvaje** | The Wild Woods | **Siempre** | PvP activo 24/7. |

---

## 5. ARQUITECTURA Y GEOGRAFÍA (THE FANG V3.1)

### 5.1. Estructura Geográfica "The Fang" (Compacto & Centrado)
El mapa es un lienzo de **500x500 Tiles (16km²)**. El castillo se sitúa en el **Centro (Offset 190, 170)** sobre una península con forma de colmillo.

*   **Diseño Compacto:** Se ha eliminado el espacio muerto. Las habitaciones son densas (25x25 tiles) y los pasillos estrechos (3 tiles) para fomentar la interacción social y los cuellos de botella en PvP.
*   **Norte (High Ground):** Torre de la Casa **Ignis**. Punto más alto y defendible.
*   **Ala Oeste (The Dungeon):** Zona baja y oscura. Contiene el Dormitorio **Vesper**, los Baños Prefectales, la Sala de Castigo (Detention) y el Jardín Secreto.
*   **Ala Este (The Study):** Zona académica. Contiene el Dormitorio **Axiom**, las Aulas (Classroom), la Biblioteca y la Enfermería.
*   **Centro (The Hub):** 
    *   **Courtyard:** Patio central abierto con obstáculos tácticos (fuentes, esquinas).
    *   **The Cloister:** Pasillos columnados (**Pillared Arcades**) de 3 tiles de ancho.
*   **Sur (The Gate):** 
    *   **Great Hall:** Comedor masivo y punto de reunión social.
    *   **The Isthmus (Bridge):** El único puente de tierra hacia el continente. Cuello de botella estratégico.
*   **Mainland (Continente):** Al sur del puente. Contiene los bosques salvajes y el **Puesto del Mercader Ambulante (Carro)**.

### 5.2. Pasadizos Secretos y "Double Risk"
Para mitigar el bloqueo de los Prefectos, existen rutas ocultas. Sin embargo, estas rutas son **Zonas PvP (Sin Ley)**, lo que implica un riesgo doble: evitar la autoridad o arriesgarse a ser atacado por rivales.

| Nombre | Conexión | Tipo | Riesgo |
| :--- | :--- | :--- | :--- |
| **The Plumbing** | Vesper ↔ Baños | Túnel de alcantarillado estrecho (3 tiles). | **PvP Activo**. Claustrofóbico. |
| **Study Bridge** | Library ↔ Axiom | Pasarela oculta tras estanterías (2 tiles). | **PvP Activo**. Cuello de botella. |
| **Hidden Archive** | Library (Secreto) | Sala oculta de conocimiento prohibido. | **PvP Activo**. Sin salida fácil. |
| **Troublemaker's Crack**| Ignis ↔ Detention | Grieta en el muro. | **PvP Activo**. |

---

## 6. SISTEMA DE DISCIPLINA (PREFECTOS)

### 6.1. La Guardia Nocturna (Night Watch)
Durante la noche (22:00 - 07:00), los Prefectos patrullan el castillo.

*   **Población:** 4 Prefectos simultáneos.
    *   2 en el Patio Central (Bloqueo visual cruzado).
    *   1 en el Gran Comedor (Roamer).
    *   1 en el Puente del Istmo (Guardia de Frontera).
*   **Mecánica de Visión (Conic Vision):**
    *   **No Persiguen:** Los prefectos no corren detrás de los alumnos. Son centinelas.
    *   **Cono de Visión:** Tienen una linterna con un cono de luz visible (90 grados, 150px).
    *   **Captura Instantánea:** Si un alumno toca el cono de luz, es teletransportado inmediatamente a **Detention**.
    *   **Rotación:** Los prefectos giran periódicamente para escanear su entorno.

### 6.2. Niveles de Castigo (Severity)
La duración de la estancia en **Detention** (unidades de trabajo pendientes) depende de la gravedad de la infracción cometida al ser capturado:

| Nivel | Infracción | Carga de Trabajo |
| :--- | :--- | :--- |
| **I** | Estar fuera del dormitorio en Toque de Queda. | 50 Unidades |
| **II** | Infracción Nivel I + Uso de Magia detectado. | 100 Unidades |
| **III** | Infracción Nivel II + Haber causado daño/KO a otro alumno. | 200 Unidades |

---

## 7. BIBLIA DE DATOS (DATABASE TABLES)

### 7.1. Las Tres Facciones (Houses)

*Nota: Los colores actuales son **provisionales** para maximizar la distinción visual entre alumnos durante el prototipado.*

| Casa | Color | Ubicación | Filosofía | Bark Flavor |
| :--- | :--- | :--- | :--- | :--- |
| **IGNIS** | Rojo | Torre Norte | Valor y Fuego | "For glory!", "Let's duel!" |
| **AXIOM** | Azul | Ala Este | Lógica y Hielo | "Logic dictates victory." |
| **VESPER** | Amarillo | Mazmorra Oeste | Ambición y Sombra | "Ambition is not a sin." |

### 7.2. El Claustro y Personal de la Escuela

| Nombre | Rol | Ubicación Principal | Comportamiento |
| :--- | :--- | :--- | :--- |
| **Headmaster Aris** | Director | Great Hall / Office | Estático / Orador |
| **Professor Hecate** | Maestra | Classroom | Enseñanza / Patrulla |
| **Professor Merlin** | Maestro | Library / Classroom | Enseñanza |
| **Matron Pomfrey** | Sanadora | Infirmary | Estático (Cura) |
| **Prefects (x4)** | Seguridad | Puntos Estratégicos | Patrulla Nocturna (Cono de Visión) |
| **Caretaker Filch** | Conserje | Pasillos (Noche) | Patrulla (Alerta Prefectos) |

### 7.3. Comerciantes y NPCs Externos

| Nombre | Rol | Ubicación Principal | Comportamiento |
| :--- | :--- | :--- | :--- |
| **Traveling Merchant**| Mercader | Mainland (Forest) | **Vendedor Ambulante (Carro) - Day Only** |

### 7.4. Fórmulas Académicas (Recompensas)

| Grado | Puntuación Minijuego | XP Ganada | Oro Ganado | Prestigio |
| :--- | :--- | :--- | :--- | :--- |
| **S** | 90 - 100 | 100 XP | 100g | +20 |
| **A** | 70 - 89 | 75 XP | 50g | +10 |
| **B** | 50 - 69 | 50 XP | 20g | +5 |
| **F** | < 50 | 0 XP | 0g | 0 |

### 7.5. Métricas de Equilibrio (Balance Specs)

**Economía (Precios Base):**
*   **Common:** 10 Oro.
*   **Rare:** 50 Oro.
*   **Legendary:** 200 Oro.

**Ciclo de Items:**
*   **Spawn Rate:** 1 Item cada 30 segundos.
*   **World Cap:** Máximo 20 items sueltos en el suelo simultáneamente.

**Combate y Salud:**
*   **Duel Timeout:** 60 segundos.
*   **Tiempo Inconsciente:** 10 segundos tras ser derrotado (Knockout).
*   **Repulsión de Anillo:** Fuerza 200,000 (Impulso físico).

### 7.6. Hechizos y Gestos (The Triad)

| Gesto | Nombre | Color | Velocidad | Ventaja (RPS) |
| :--- | :--- | :--- | :--- | :--- |
| **Círculo** | Escudo | Azul | N/A | Vence a **Triángulo** |
| **Triángulo** | Proyectil | Rojo | 400 | Vence a **Cuadrado** |
| **Cuadrado** | Área | Magenta | 400 | Vence a **Círculo** |
| **Línea** | Misil | Amarillo | 600 | Neutro (Daño Rápido) |

### 7.7. Equipamiento (Inventory)

| ID | Nombre | Tipo | Rareza | Efecto Base |
| :--- | :--- | :--- | :--- | :--- |
| `robe_plain` | Plain Work Robe | Robe | Common | Defense: Low |
| `robe_silk` | Silk Robe | Robe | Rare | Magic Defense: Med |
| `robe_velvet` | Velvet Robe | Robe | Legendary | Defense: High |
| `boots_leather`| Leather Boots | Boots | Common | Agility: Low |
| `boots_dragon` | Dragon Skin Boots| Boots | Legendary | Agility: High |
| `acc_spectacles`| Spectacles | Acc | Rare | Accuracy: High |

### 7.8. Álbum de Cromos (Collectibles)

| ID | Nombre | Rareza | Descripción / Lore |
| :--- | :--- | :--- | :--- |
| `card_4` | Merlin | Legendary | Master of prophecy and advisor. |
| `card_5` | Morgan le Fay | Legendary | Enchantress of Avalon. |
| `card_1` | Abe no Seimei | Legendary | Japanese onmyoji master. |
| `card_6` | Nicholas Flamel | Rare | Master Alchemist of the Magnum Opus. |
| `card_2` | Baba Yaga | Rare | Slavic witch of the mortar. |
| `card_13`| Cassandra | Common | Prophetess cursed by disbelief. |
| `card_vampire`| Vampire | Rare | Drinks blood for HP Drain. |

### 7.9. Consumibles e Ingredientes

| ID | Nombre | Tipo | Efecto |
| :--- | :--- | :--- | :--- |
| `pot_antidote` | Antidote | Potion | Cures Poison |
| `food_rock_cake`| Rock Cake | Food | Small HP Heal |
| `mat_wolfsbane` | Wolfsbane | Plant | Toxic Ingredient |
| `mat_bezoar` | Bezoar | Object | Universal Antidote |
| `mat_mandrake` | Mandrake Root | Plant | Cure Petrify / Revive |

### 7.10. Registro de Barks (NPC Chat)

| Contexto | Frase de Ejemplo | Probabilidad |
| :--- | :--- | :--- |
| **GENERAL** | "Has anyone seen my toad?" | Alta |
| **CLASS** | "Is this on the exam?" | Contextual |
| **EAT** | "Delicious! I could eat a dragon." | Contextual |
| **SLEEP** | "Zzz... Five more minutes..." | Contextual |
| **DUEL** | "Watch out! Shields up!" | Contextual |

---

## 8. APÉNDICE B: LORE & MECÁNICAS OCULTAS

### 8.1. El Ciclo (Intro Lore)
*   **Texto Sagrado:** "Time is a ruthless circle. Every thousand years the stars return to their origin, and the sky bleeds."
*   **Propósito:** Cliffwald se abre porque "El Ciclo lo demanda".

### 8.2. Mecánicas de Minijuegos (Clases)
*   **Nota Técnica:** Todos los minijuegos se procesan localmente en el cliente para evitar saturación de red. El servidor solo recibe y valida la puntuación final.
*   **Charms (Encantamientos):** *Runic Timing*. Un cursor gira. Pulsa [ESPACIO] cuando esté en la zona verde superior. 5 Intentos.
*   **Potions (Pociones):** *Cauldron Stir*. Machaca [ESPACIO] para mantener la temperatura en la zona óptima (40-60%) mientras se enfría.
*   **History (Historia):** *Memory Sequence*. Memoriza y repite una secuencia de 5 flechas (⬆️ ⬅️ ➡️ ⬇️).

---

## 9. ANEXO TÉCNICO
*   **Engine:** Phaser 3 (Client) + Colyseus (Server).
*   **Physics:** Rapier2D (Isomorphic).
*   **Database:** SQLite (Dev) / PostgreSQL (Prod) via Prisma.

## 10. ESTÁNDAR DE ARTE (TILED LAYERS)

Para lograr un acabado visual AAA ("Sea of Stars"), el mapa sigue una estricta jerarquía de capas que gestiona la **Oclusión (2.5D)**. Todo artista debe respetar este orden:

| Orden | Capa (Nombre Tiled) | Contenido Permitido | Propósito |
| :--- | :--- | :--- | :--- |
| **5 (Top)** | `L5_Overhead` | Cimeras de muros, Techos, Copas de árboles, Arcos de puerta. | **Oclusión:** Tapa al jugador cuando camina por "detrás" (Norte). |
| **4** | **ENTIDADES** | Jugadores, NPCs, Proyectiles. | Renderizado dinámico por el motor. |
| **3** | `L4_Walls_Base` | La cara vertical de los muros, Troncos, Fuentes. | **Colisión:** El jugador choca físicamente contra esto. |
| **2** | `L3_Deco_Ground` | Alfombras, Caminos, Manchas, Papeles. | **Detalle:** Se pinta sobre el suelo sin borrarlo (Transparente). |
| **1** | `L2_Floors` | Suelos de madera, Piedra, Pavimento. | **Estructura:** Define dónde se puede caminar. |
| **0 (Bot)** | `L1_Terrain` | Agua, Hierba, Tierra. | **Fondo Infinito:** Capa de seguridad. Nunca debe tener huecos. |

**Regla de Oro:** Si borras un edificio, debe quedar hierba debajo (`L1`), no vacío. La edición debe ser no-destructiva.