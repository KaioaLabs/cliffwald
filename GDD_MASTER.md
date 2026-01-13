# CLIFFWALD ONLINE – GAME DESIGN DOCUMENT (MASTER)
**Versión:** 1.1 (Revisión "Zeroing" - Enero 2026)
**Estado:** En Desarrollo Activo (Fase 1 Completada)

---

## 1. HIGH CONCEPT
**Cliffwald Online** es un MMO de **Simulación Académica Viva** donde el tiempo es la autoridad suprema. Ambientado en una escuela de magia isométrica, los jugadores no son héroes elegidos, sino estudiantes sujetos a horarios, leyes físicas y una jerarquía social persistente.

### Filosofía de Diseño
*   **"Low Floor, High Ceiling":** Accesible para aprobar, difícil para destacar.
*   **Persistencia Radical:** Tu personaje existe aunque tú no estés (Sistema "Echo").
*   **Magia Táctil:** La habilidad del jugador (dibujo) supera a las estadísticas numéricas.

---

## 2. ARQUITECTURA TÉCNICA (REALIDAD DEL CÓDIGO)

### Stack Tecnológico
*   **Cliente:** Phaser 3 (Rendering Isométrico/Top-Down) + TypeScript.
*   **Servidor:** Node.js + Colyseus (Estado Autoritativo).
*   **Física:** Rapier2D (Determinista, compartida Cliente/Servidor).
*   **Base de Datos:** **PostgreSQL** (Supabase) via Prisma ORM.
*   **Protocolo:** WebSockets (State Sync + Delta Compression).

### Modelo de "Serving"
Arquitectura Monolítica de Despliegue: El servidor Node.js sirve los estáticos del cliente (`dist-client`) y gestiona la lógica del juego en el mismo proceso/puerto.

---

## 3. SISTEMA DE TIEMPO: "LOS DOS EJES (CHRONOS)"

El juego utiliza un **Sistema de Tiempo Dual** para equilibrar la inmersión diaria con el progreso narrativo de la comunidad.

### 3.1. Eje 1: El Reloj Atmosférico (Ritmo de Sesión)
Controla el bucle de juego inmediato, la iluminación y la visibilidad social. Se ha ajustado para permitir incursiones nocturnas significativas.
*   **Duración Total:** 45 Minutos Reales.
*   **Día (30 Minutos):** Clases, Socialización, Zonas Seguras.
*   **Noche (15 Minutos):** Toque de Queda (Curfew). Tensión, PvPvE, zonas prohibidas accesibles. Tiempo suficiente para organizar incursiones complejas.

### 3.2. Horario de Actividades (Routine) – Sistema de Ventanas
Para evitar el FOMO y la frustración por horarios rígidos, las actividades no ocurren en un minuto exacto, sino en **Ventanas de Oportunidad**.
*   **Funcionamiento:** Un jugador (o su Echo) recibe el crédito académico/beneficio si se encuentra en la ubicación correspondiente en **cualquier momento** dentro de la ventana de tiempo.
*   **Minijuego Académico:** Se activa automáticamente al entrar al aula durante la ventana si no se ha completado ese día.

| Ventana In-Game | Actividad | Ubicación | Impacto |
| :--- | :--- | :--- | :--- |
| **07:00 - 08:30** | Desayuno | Gran Comedor | Buff Regeneración. |
| **08:30 - 10:30** | Clase Mañana | Aula Magna | Créditos PA (Mañana). |
| **12:30 - 14:00** | Comida | Gran Comedor | Social / Buff Energía. |
| **17:00 - 19:00** | Clase Tarde | Laboratorio | Créditos PA (Tarde). |
| **21:00 - 05:00** | Curfew | Toda la Escuela | PvPvE (Fuera de Dorms). |

### 3.3. Eje 2: El Calendario Cíclico ("La Semana Eterna")
Para solucionar la disonancia entre el ciclo solar y el calendario, Cliffwald adopta un sistema de **Semana Cíclica**.
*   **Regla de Oro:** 1 Ciclo Solar (45 min) = **1 Día de Calendario**.
    *   Amanece Lunes, anochece Lunes. Al siguiente amanecer, es Martes.
*   **La Semana Académica:** Un ciclo completo de Lunes a Domingo dura **5 horas y 15 minutos reales** ($45 \text{ min} \times 7$).
*   **Anti-FOMO:** Como la semana in-game se repite aproximadamente **32 veces** durante una Semana Real, los jugadores tienen múltiples oportunidades diarias para asistir a eventos específicos (ej. "Torneo de los Viernes").
*   **Progreso Narrativo (Capítulos):** La historia no avanza por días acumulados, sino por **Tiempo Real**.
    *   La Temporada de 8 Semanas se divide en **8 Capítulos**.
    *   El ambiente, la trama y los desafíos cambian cada Semana Real, independientemente de qué "día de la semana" sea en el bucle del juego.

---

## 4. POBLACIÓN, IDENTIDAD Y NARRATIVA

### 4.1. Premisa Narrativa: El Ciclo de los Gemelos
La historia de Cliffwald es un ciclo eterno de reencarnación. Cada curso, dos estudiantes encarnan sin saberlo las fuerzas primordiales: **La Luz** y **La Sombra**.

### 4.2. Sistema de Moralidad: "Las Voces Susurrantes"
Mecánica de alineación inspirada en el estilo clásico (*Fable*), donde el jugador se debate entre dos fuerzas opuestas.
*   **La Dualidad (Ángel y Demonio):** El jugador escuchará constantemente susurros de dos entidades:
    *   **El Director (Luz/Orden):** Representa el deber y la rectitud.
    *   **Su Hermano (Sombra/Caos):** Representa la rebeldía y el poder personal.
*   **Mecánica de Elección:** Se ofrecerán misiones o tareas contradictorias simultáneamente. El jugador debe elegir explícitamente cuál de las dos realizar.
    *   *Progresión:* Las misiones irán escalando en intensidad, desde travesuras o favores triviales al principio, hasta decisiones morales críticas al final de la temporada.
*   **Sistema de Puntos y Recompensas:**
    *   **Puntos de Alineación (Historia Individual):** Actúan como hitos narrativos. Al obtenerlos, el jugador recibe **Experiencia (XP)** para su progresión personal, al igual que en las clases o duelos.
    *   **Independencia de la Casa:** Estos puntos **NO suman al Prestigio de la Casa**. Son "Puntos de Historia Individual". Un jugador puede ser un paria para su Casa (no aportar Prestigio) pero estar muy avanzado en su senda de Luz o Sombra.
    *   **Equilibrio de Recompensas:** Ambos caminos (Luz y Sombra) otorgan **exactamente la misma cantidad de Experiencia (XP)** por misiones de nivel equivalente. El juego no penaliza ni premia el ser "bueno" o "malo" con poder, solo cambia el destino narrativo.
*   *Consecuencia:* Al final de la Semana 8, los líderes de cada alineación son revelados para el Duelo Final.

### 4.3. Escala del Mundo y Profesores
*   **Capacidad Actual:** 24 Estudiantes (1er Curso).
*   **Capacidad Objetivo:** 84 Estudiantes (4 Cursos simultáneos).
*   **Profesores:** 4 NPCs únicos (Teachers) con sprite de doble altura (2x), cada uno con patrones de patrulla y personalidades distintas.

### 4.4. Las Tres Doctrinas (Facciones)
Asignación inicial mediante test filosófico: **IGNIS** (Valor), **AXIOM** (Lógica), **VESPER** (Misterio).

### 4.5. Sistema "Body Claiming" (Posesión)
La escuela siempre tiene una población fija. El jugador asume el control de su cuerpo (Echo) al entrar.
*   **Estado Echo (Offline):** Cuando no es controlado por un jugador, el personaje sigue el horario académico simulando vida ("Ambient Life").
*   **Regla de Oro del Echo (Mantenimiento vs. Crecimiento):**
    *   **Mantenimiento (SÍ):** El Echo asiste a clases y genera **Puntos Académicos (PA)** básicos para evitar la expulsión. Esto asegura que un jugador con vida real no pierda su plaza. *Nota Máxima posible: B (Aprobado).*
    *   **Crecimiento (NO):** Un Echo **NUNCA** gana Experiencia (XP), Prestigio, Items o Avance de Misión. No puede obtener notas A o S.
    *   *Filosofía:* El Echo sobrevive, el Jugador vive y destaca.

---

## 5. SISTEMA DE MAGIA, CLASES Y COMBATE

### 5.1. Magia Gestual ($1 Unistroke)
Dibujo diegético de runas manteniendo el click/touch. 
*   **Asistencia Mágica (Input Forgiveness):** El sistema prioriza la intención sobre la precisión milimétrica. Si el trazo coincide en un 70% con el patrón, el juego "imanta" el resultado al hechizo correcto para evitar frustración táctil.
*   **Fizzle (Error de Dibujo):** Si el dibujo es incorrecto o la precisión es <50%, el hechizo "falla" (humo visual). El jugador **NO es stuneado**, permitiendo mantener la movilidad, pero pierde el tiempo de casteo y entra en un breve cooldown global.
### 5.2. Sistema Académico (Calificaciones)
El progreso requiere **20 Puntos Académicos (PA)** por temporada para aprobar. El rendimiento es estrictamente **individual e intransferible**.
*   **Variedad de Asignaturas:** Cada materia tiene su propio arquetipo de minijuego, con subtipos que rotan semanalmente para evitar la monotonía.
    *   *Encantamientos:* Precisión de trazado (Dibujo).
    *   *Pociones:* Ritmo y Timing (Quick Time Events).
    *   *Historia:* Memoria y Secuencias.
*   **S (Superior):** >95% Puntuación (3 PA).
*   **A (Notable):** >80% Puntuación (2 PA).
*   **B (Aprobado):** >50% Puntuación (1 PA).
*   **T (Troll/Fail):** <50% o Ausencia (0 PA).

### 5.3. Reglas de Combate: La Tríada (RPS)

| Gesto | Vence a... | Débil contra... | Modificador Precisión (>95%) |
| :--- | :--- | :--- | :--- |
| **Círculo** | Triángulo | Cuadrado | Escudo Reforzado. |
| **Triángulo** | Cuadrado | Círculo | Crítico / Velocidad +. |
| **Cuadrado** | Círculo | Triángulo | Área / Ralentización. |

### 5.4. Mecánicas Nocturnas
*   **Zona de Riesgo Total:** No existe "Modo Pasivo". Cualquier estudiante fuera de su cama es vulnerable a ataques o detención. Se fomenta el uso de **Sigilo** o la contratación de escoltas.
*   **Prefectos:** Jugadores/NPCs cazadores con habilidad **"Detectar Aura"**.
*   **Sigilo:** Uso de hechizos de utilidad (Silencio, Camuflaje) para evitar la Detención.

En Cliffwald no existe la muerte. Al perder toda la salud, el estudiante cae **Inconsciente**.
*   **En Zona de Duelos (Tatami):** Se levanta inmediatamente tras 5 segundos (recuperación rápida).
*   **Con Supervisión (Profesor/Prefecto cerca):** Intervención inmediata; el estudiante se levanta al momento (el adulto disipa el daño).
*   **Sin Supervisión (Noche/Bosque):** El estudiante es "trasladado mágicamente" a la **Enfermería**.
    *   **Logística de Respawn:** El reasentamiento es instantáneo, pero el coste es el **Desplazamiento**. El jugador debe caminar de vuelta desde la Enfermería hasta su zona de interés (Caminata de la Vergüenza).

---

## 6. SISTEMA DISCIPLINARIO (ANTI-GRIEFING)
*   **Saldo Mínimo 0:** Un jugador no puede restar más puntos de los que ha generado.
*   **Detención (Castigo Activo):**
    *   Si un alumno es atrapado por un Prefecto o Profesor rompiendo las reglas (fuera de la cama, atacando a otros), es enviado a la **Sala de Detención**.
    *   **Duración:** 10 minutos de tiempo real **logueado**.
    *   **Anti-AFK (Trabajos Forzados):** El temporizador de castigo **SOLO avanza** si el jugador completa tareas repetitivas y mundanas (limpiar calderos, copiar frases, ordenar pergaminos). Si el jugador se queda AFK, el contador se pausa.
*   **Expulsión:** Bloqueo de uso de magia (24h reales) para reincidentes graves.

---

## 7. LIVE OPS: EL DUELO FINAL (EL CLÍMAX)
Al final de la Semana 8 de la temporada real:
1.  **Revelación de los Gemelos:** El sistema anuncia al Top #1 Luz y Top #1 Sombra.
2.  **Duelo de Honor:** Combate 1v1 puro en el Patio Central. 
    *   **Regla de Oro:** No hay interferencias externas. 
    *   **Público:** Las gradas son **pasivas**. Los espectadores pueden usar el Chat Global y Emotes para animar, pero no pueden influir en el resultado con magia o items.
3.  **World State:** La victoria define el ambiente estético y buffs del próximo mes.

---

## 8. PROGRESIÓN Y ECONOMÍA
*   **Prestigio (XP):** Divisa principal de estatus.
*   **Libre Mercado (Trading):** Cliffwald fomenta una economía abierta. Los estudiantes pueden intercambiar libremente cualquier item de su inventario (Cartas, Pociones, Equipamiento) con otros jugadores mediante el sistema de Comercio.
*   **[Mitigación de Baja Pop]:** Existirán NPCs vendedores de emergencia (Fallback) que aseguran un stock mínimo de consumibles básicos si no hay tiendas de jugadores activas, evitando el estancamiento económico en horarios valle.
*   **Persistencia:** Guardado atómico en DB al desconectar.

---

## 9. MUNDO Y MAPA
*   **Tiles:** 32x32px. Iluminación con Normal Maps.
*   **Sombras:** Polares 360º (ShadowUtils).

---

## 10. HOJA DE RUTA (ESTADO ACTUAL)
*   **Fase 0/1:** Completadas (Motor, Física, Magia, DB).
*   **Fase 2 (En Curso):** Ciclo de Vida, Horarios, Optimización de capacidad (84 slots).
*   **Fase 3 (Futuro):** Warden System, Secretos, Crafteo de Pociones.
