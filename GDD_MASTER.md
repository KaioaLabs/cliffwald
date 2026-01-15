# CLIFFWALD ONLINE – GAME DESIGN DOCUMENT (MASTER)
**Versión:** 2.2 (Update: AI Polish & Deploy Ready - Enero 2026)
**Estado:** Fase 5 Completada. Fase 6 (Live Ops) En Curso. QA Completado.

---

## 1. HIGH CONCEPT
**Cliffwald Online** es un MMO de **Simulación Académica Viva** donde el tiempo es la autoridad suprema. Ambientado en una escuela de magia isométrica, los jugadores no son héroes elegidos, sino estudiantes sujetos a horarios, leyes físicas y una jerarquía social persistente.

### Filosofía de Diseño
*   **"Low Floor, High Ceiling":** Accesible para aprobar, difícil para destacar.
*   **Persistencia Radical:** Tu personaje existe aunque tú no estés (Sistema "Echo").
*   **Magia Táctil:** La habilidad del jugador (dibujo de gestos) supera a las estadísticas numéricas.

---

## 2. ARQUITECTURA TÉCNICA

### Stack Tecnológico
*   **Cliente:** Phaser 3 (Rendering Isométrico) + TypeScript.
*   **Servidor:** Node.js + Colyseus (Stateful Authoritative Server).
*   **Física:** Rapier2D (Isomorphic Deterministic Physics Engine).
*   **Red:** Client-Side Prediction con Server Reconciliation.
*   **Base de Datos:** Estrategia Dual. SQLite (Dev) y PostgreSQL (Prod) via Prisma ORM.
*   **Protocolo:** WebSockets (State Sync + Delta Compression).

### Protocolos de Calidad (QA)
*   **Unit Testing:** Vitest (50+ tests cubriendo Física, IA y Lógica).
*   **E2E Audits:** Playwright (Simulación de sesiones completas: Login -> Jugar -> Persistir).
*   **Debug Dashboard:** Panel Tweakpane integrado para manipulación en tiempo real (Time Jump, Noclip).

---

## 3. SISTEMA DE TIEMPO: "LOS DOS EJES"

### 3.1. El Reloj Atmosférico (Ritmo de Sesión)
Controla el bucle inmediato, la iluminación y la rutina diaria.
*   **Ciclo Total:** 45 Minutos Reales.
*   **Día (30 Min):** Clases, Socialización, Zonas Seguras.
*   **Noche (15 Min):** Toque de Queda (Curfew). Los Prefectos patrullan. PvPvE habilitado.
*   **Time Jump Debug:** Sistema robusto para saltar a cualquier hora. Los NPCs **caminan** hacia sus nuevas rutinas (no se teletransportan) para verificar la integridad del pathfinding.

### 3.2. Horario de Actividades (Rutina)
Las actividades ocurren en **Ventanas de Oportunidad**. Asistir habilita la tarea, pero no regala el progreso.

| Hora | Actividad | Ubicación | Mecánica |
| :--- | :--- | :--- | :--- |
| **05:00** | Desayuno | Gran Comedor | Buff de Regeneración. |
| **08:30** | Encantamientos | Aula Magna | Minijuego "Runic Timing" (Precisión). |
| **10:30** | Tiempo Libre | Patio/Duelos | PvP Libre / Social. |
| **12:30** | Comida | Gran Comedor | Socialización. |
| **14:00** | Estudio Campo | Bosque | Recolección / PvE. |
| **17:00** | Pociones | Laboratorio | Minijuego "Cauldron Stir" (Resistencia). |
| **19:00** | Cena | Gran Comedor | Socialización. |
| **21:00** | Toque de Queda | Dormitorios | **Zona PvPvE Activa**. |
| **Noche** | Historia | Biblioteca | Minijuego "Archive Memory" (Memoria). |

### 3.3. Interfaz de Usuario (HUD)
*   **Calendario:** Panel interactivo que resalta la hora y día actual ("NOW").
*   **Reloj:** Visualización digital HH:MM sincronizada con el servidor.

---

## 4. POBLACIÓN E IDENTIDAD (SISTEMA ECHO)

### 4.1. Persistencia 24/7 (Body Claiming)
*   **Población Finita:** El mundo tiene 24 slots de estudiantes (8 Ignis, 8 Axiom, 8 Vesper).
*   **Posesión:** Al loguearse, el jugador "posee" un cuerpo existente.
*   **El Eco:** Al desconectarse, el personaje no desaparece. Se convierte en un NPC ("Echo") que mantiene el nombre, apariencia, inventario, Oro y Prestigio del jugador.

### 4.2. Inteligencia Artificial (Vida Escolar)
Implementación avanzada de comportamiento humano ("Anti-Hive Mind"):
*   **Stochastic Reaction Latency:** Al cambiar la hora (campana), los alumnos aplican un retardo aleatorio (0.5s - 3.0s) para evitar ráfagas de sincronización masiva.
*   **Deterministic Lane Offsets:** Los NPCs eligen carriles paralelos basados en su ID para evitar el "Tube Effect" en pasillos.
*   **Steering Separation:** Micro-fuerzas de repulsión física para evitar la superposición de sprites en movimiento.
*   **Stuck Detection & Recovery:** Sistema de monitoreo de delta de movimiento; si es < 2px/2s, fuerza el repathfinding y un "Jiggle" estocástico.
*   **Arquetipos Vivos:**
    *   **Socializer:** State Machine con estados de pausa AFK simulada y broadcast de chat procedural.
    *   **Killer:** Agente reactivo con targeting aleatorio y casteo de hechizos para entrenamiento.
    *   **Achiever:** Heurística de prioridad alta para asistencia a clase.
    *   **Explorer:** Patrones de deambulación Browniana en zonas perimetrales.

### 4.3. Gestión de Población (Body Snatching Priority)
Para garantizar el acceso en un servidor con slots limitados (24), se aplica un sistema de prioridad estricta:
1.  **Prioridad 1 (Espacio Libre):** El jugador nuevo recibe un Echo genérico ("Ignis Student").
2.  **Prioridad 2 (Robo de Cuerpo):** Si no hay libres, el sistema "exorciza" a un Echo ocupado por un jugador offline.
    *   La identidad del jugador offline se desvincula de la base de datos.
    *   El cuerpo cambia instantáneamente al nombre y skin del nuevo jugador online.
    *   **Resultado:** Siempre se puede jugar mientras haya <24 jugadores humanos conectados simultáneamente.

### 4.4. Gestión de Cuenta y Personaje (Account System)
*   **Vinculación:** Un Personaje por Cuenta (1:1). Similar a Minecraft.
*   **Creación:** Al registrarse por primera vez, el jugador debe completar el formulario de "Matrícula" (Nombre, Casa, Apariencia).
*   **Acceso Directo:** Los logins subsiguientes omiten la creación y entran directo al mundo.
*   **Gestión (Settings):**
    *   **Renombrar:** Permitido 1 única vez por cuenta.
    *   **Borrar (Expulsión):** Permite eliminar el personaje y reiniciar el progreso desde cero. Requiere confirmación explícita ("TYPE DELETE").

---

## 5. SISTEMA DE MAGIA Y COMBATE

### 5.1. Magia Gestual ($1 Unistroke)
El lanzamiento de hechizos requiere dibujar formas en pantalla (Mouse o Táctil).
*   **Círculo:** Escudo (Defensa).
*   **Triángulo:** Proyectil Rápido (Ataque).
*   **Cuadrado:** Área de Efecto / Pesado (Romper).
*   **Línea:** Hechizo Utilitario / Básico.

### 5.2. La Tríada (Rock-Paper-Scissors)
El combate se rige por una jerarquía estricta para evitar el "spam" sin sentido.
1.  **Círculo (Escudo)** vence a **Triángulo (Ataque)**.
2.  **Triángulo (Ataque)** vence a **Cuadrado (Área)**.
3.  **Cuadrado (Área)** vence a **Círculo (Escudo)**.

### 5.3. Duelos y Reglas
*   **Zona de Duelo:** 4 Anillos en el Tatami. Detectan participantes y árbitros automáticamente.
*   **Condición de Victoria:** 3 Impactos o Ring Out.
*   **Consecuencias:** El perdedor queda aturdido (Knockout) temporalmente.

---

## 6. PROGRESO ACADÉMICO Y ECONOMÍA

### 6.1. AcademicManager
Sistema centralizado que gestiona la asistencia y calificación.
*   **Detección:** Valida si el jugador está sentado en su pupitre asignado.
*   **Anti-Cheat:** Verifica la duración de la sesión de clase.
*   **Recompensas:** Otorga XP, Oro y Prestigio basado en el rendimiento (Grado S, A, B).

### 6.2. Coleccionismo (Álbum de Cromos)
*   **Mecánica:** Cartas coleccionables de Magos Famosos, Criaturas y Lugares.
*   **UI:** Interfaz de Álbum con filtrado por rareza (Mythic, Legendary, Rare, Common) e indicador de posesión visual.
*   **Persistencia:** La colección se guarda en base de datos.

### 6.3. Economía
*   **Oro:** Moneda transaccional.
*   **Prestigio:** Moneda social/competitiva.

---

## 7. DISCIPLINA Y SEGURIDAD

### 7.1. Prefectos (NPCs de Élite)
*   **Rol:** Guardias nocturnos.
*   **Spawn:** Aparecen instantáneamente a las 22:00 y desaparecen a las 05:00.
*   **Mecánica:** Patrullan rutas clave. Tienen un cono de visión (Line of Sight).

### 7.2. Detención (La Mazmorra)
*   **Castigo:** Zona aislada sin salida física.
*   **Salida:** Debes completar **5 Tareas de Mantenimiento** (limpiar, ordenar) para abrir la puerta mágica.

---

## 10. HOJA DE RUTA (ESTADO ACTUAL)
*   **Fase 0-5:** COMPLETADAS (Motor, Física, Magia, Tiempo, Disciplina, Minijuegos, Economía).
*   **Fase 6 (En Progreso):** Live Ops (Torneos Automáticos).
*   **Fase 7:** Simulation Polish (IA Humanizada COMPLETADA).
*   **Fase 8 (Futuro):** Implementación técnica de "Las Voces Susurrantes".
