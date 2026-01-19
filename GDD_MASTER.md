# CLIFFWALD ONLINE – GAME DESIGN DOCUMENT (MASTER)

**Versión:** 3.3 (Final: Reglas de Santuario y PvP Definidas - Enero 2026)  
**Estado:** Diseño Cerrado para Prototipo.

---

## 1. HIGH CONCEPT

**Cliffwald Online** es un MMO de nicho ("Small World") de **Simulación Académica Viva**. No es un mundo masivo infinito, sino un escenario teatral persistente donde ~100 estudiantes (jugadores o IAs) conviven bajo la autoridad absoluta del tiempo.

### Filosofía de Diseño

*   **"Low Floor, Low Maintenance":** Diseñado para sesiones cortas. Asistir a clase es un reto de 3-5 minutos, no una jornada laboral.
*   **El Teatro de Autómatas (Identidad):** Tu personaje es un alma que posee un cuerpo. Cuando te desconectas, el cuerpo se vacía pero sigue actuando ("Echo") para mantener la ilusión de vida.
*   **Magia Táctil:** El lanzamiento de hechizos es físico (dibujo real), priorizando la satisfacción del gesto sobre la seguridad estricta del servidor.

---

## 2. SISTEMA DE TIEMPO: "LA DICTADURA DEL RELOJ"

### 2.1. El Reloj Atmosférico (Ritmo Arcade)

El ciclo es rápido para permitir múltiples "días" en una sesión de juego real.

*   **Ciclo Total:** 45 Minutos Reales.
*   **Día (30 Min):** Vida académica y social.
*   **Noche (15 Min):** Toque de Queda. Peligro y sigilo.

### 2.2. Horario y Compromiso (Low Grind)

Las actividades obligatorias (Clases) están diseñadas como **Minijuegos de Ráfaga** (3-5 minutos).

*   **Filosofía de Aprobado:** No se requiere asistencia perfecta. Cumplir un cupo mínimo de asistencias (ej. 10 clases al mes real) es suficiente para aprobar el curso.
*   **Libertad:** El resto del tiempo es libre para socializar, explorar o conspirar.

| Hora | Actividad | Ubicación | Mecánica |
| :--- | :--- | :--- | :--- |
| **07:00 - 08:30** | Desayuno | Gran Comedor | Buff de Regeneración. |
| **08:30 - 12:30** | Clase Mañana | Aula Magna | **Minijuego (3-5 min)**. Reto de precisión o memoria. |
| **12:30 - 14:00** | Comida | Gran Comedor | Socialización. |
| **14:00 - 20:00** | Tiempo Libre | Campus General | Social / Exploración / Duelos. |
| **20:00 - 22:00** | Cena | Gran Comedor | Socialización. |
| **22:00 - 07:00** | Toque de Queda | Dormitorios | **Zona PvPvE Activa**. Riesgo alto. |

---

## 3. POBLACIÓN E IDENTIDAD (SISTEMA DE POSESIÓN)

### 3.1. Arquitectura "Teatro de Autómatas"

El servidor mantiene vivos ~100 cuerpos ("Echos") permanentemente.

*   **Conexión (Login):** El jugador descarga sus datos (Alma) en un cuerpo disponible de su casa. La transición visual es instantánea durante la carga; el jugador nunca ve el cambio de "Echo" a "Humano" en vivo, el cambio ocurre en el backend antes del renderizado.
*   **Desconexión (Logout):** El jugador sube sus datos a la nube. El cuerpo se vacía y pasa a modo Echo.
*   **Persistencia Visual (Ropa):** El Echo mantiene la última skin/ropa equipada por el jugador anterior. Esto preserva la variedad visual del campus. El nuevo jugador que ocupe ese cuerpo sobreescribirá la apariencia al conectarse.

### 3.2. Gestión de Límite (Hard Cap)

El servidor es una instancia única para la comunidad.

*   **Capacidad:** ~100 Jugadores simultáneos.
*   **Regla del Jugador #101:** Si el servidor está lleno, los nuevos jugadores entran en **Cola de Espera**. No se expulsa a nadie.

### 3.3. IA de Relleno (Ambiente y Chat)

Los Echos simulan vida para evitar el "Valle Inquietante" de una escuela muda.

*   **Rutinas:** Asisten a clases, comen y duermen.
*   **Sistema de Chat IA:** Los Echos emiten "Barks" (frases cortas en bocadillos de chat) contextuales.
    *   *Ejemplo Comedor:* "¡Qué hambre!", "¿Viste el partido?".
    *   *Ejemplo Pasillo:* "Llego tarde", "¿Dónde está mi varita?".
    *   **Objetivo:** Generar ruido de fondo social verosímil.

---

## 4. SISTEMA DE MAGIA Y COMBATE

### 4.1. Magia Gestual (Validación Cliente)

Para garantizar la fluidez y la sensación táctil ("Game Feel"):

*   **Input:** Dibujo real en pantalla (Ratón/Táctil).
*   **Validación:** El **Cliente** determina si el dibujo es correcto ($1 Unistroke Recognizer).
*   **Red:** El cliente envía la orden ("Cast Spell X") al servidor.
*   **Riesgo Aceptado:** Se asume la posibilidad de *cheats* a cambio de eliminar la latencia de input. El servidor solo valida cooldowns y disponibilidad.

### 4.2. La Tríada (Rock-Paper-Scissors)

1.  **Círculo (Escudo)** vence a **Triángulo (Ataque)**.
2.  **Triángulo (Ataque)** vence a **Cuadrado (Área)**.
3.  **Cuadrado (Área)** vence a **Círculo (Escudo)**.

### 4.3. Reglas de Espacio y PvP (Santuarios)

Define dónde y cuándo se puede combatir.

1.  **Santuarios Absolutos (PvP Desactivado Siempre):**
    *   **Enfermería:** Zona neutral de recuperación. Se puede entrar libremente caminando, pero el combate está bloqueado por magia antigua.
    *   **Dormitorios (Salas Comunes):** Zona segura privada. El combate está bloqueado.
        *   *Restricción de Acceso:* Solo los miembros de la casa pueden entrar (Barrera Mágica). Un Vesper no puede entrar a Ignis.
2.  **Zonas de Conflicto Condicional:**
    *   **Pasillos, Patios, Gran Comedor, Aulas:**
        *   *Día (07:00 - 22:00):* PvP Desactivado (salvo Duelos pactados).
        *   *Noche (22:00 - 07:00):* **PvP Activado**. Si sales de tu Santuario, eres vulnerable a ataques de otros alumnos o Prefectos.
3.  **Zona Salvaje (PvP Activado Siempre):**
    *   **Bosque Prohibido:** El combate siempre está activo, día y noche. Es zona sin ley.

---

## 5. ESPACIO Y NAVEGACIÓN

### 5.1. Diseño Orgánico (Fluid Motion)

*   **Escala:** Mapa amplio (~200x200 tiles) para permitir estructuras no cuadradas.
*   **Física de Multitudes:** Sistema de "Fluido" (Soft Body). Los jugadores se empujan suavemente pero no se bloquean, permitiendo flujo en pasillos estrechos.
*   **Arquitectura:** Prioridad al diseño de CASTLE_LAYOUT_V2 (Torres, Pasillos, Secretos).

---

## 6. PROGRESO Y ECONOMÍA

### 6.1. AcademicManager

*   **Aprobado:** Basado en acumulación de créditos durante el "Mes Real".
*   **Faltas:** Sin penalización directa, solo falta de progreso.

### 6.2. Coleccionismo

*   El progreso principal es el **Álbum de Cromos** y cosméticos, guardados en la Cuenta.

---

## 7. HOJA DE RUTA TÉCNICA (NEXT STEPS)

*   **Paso 1:** Generación de mapa orgánico (generate_world_v5.js).
*   **Paso 2:** Sistema de Posesión y Persistencia Visual en Login.
*   **Paso 3:** Implementación de IA de Chat para Echos.

---
---

## 8. ANEXO TÉCNICO & IMPLEMENTACIÓN
*(Recuperado del GDD Master v2.3 y adaptado a las reglas v3.3)*

### 8.1. Stack Tecnológico

*   **Cliente:** 
    *   **Motor:** Phaser 3 (Rendering Top-Down 2D).
    *   **Lenguaje:** TypeScript estricto.
    *   **Input:** $1 Unistroke Recognizer (Librería personalizada para gestos).
*   **Servidor:** 
    *   **Core:** Node.js + Express 5.
    *   **Game Server:** Colyseus (Stateful Authoritative Server).
    *   **Física:** Rapier2D (Isomorphic Deterministic Physics Engine). Se utiliza para el "Soft Body" de multitudes y colisiones de proyectiles.
*   **Red:** 
    *   **Protocolo:** WebSockets (State Sync + Delta Compression).
    *   **Sincronización:** Client-Side Prediction con Server Reconciliation (Vital para el movimiento fluido).
*   **Base de Datos:** 
    *   **Estrategia Dual:** SQLite (Dev/Local) y PostgreSQL/Supabase (Prod).
    *   **ORM:** Prisma.
*   **Build System:** Vite (Zero-copy build a `dist-client`).

### 8.2. Protocolos de Calidad (QA)

*   **Unit Testing:** Vitest. Cobertura crítica en:
    *   Física de movimiento (evitar traspasar paredes).
    *   Validación de Gestos ($1 Algorithm).
    *   Máquinas de estado de IA.
*   **E2E Audits:** Playwright. Scripts automatizados que simulan:
    *   Login y Posesión de cuerpo.
    *   Ciclo completo de día/noche.
    *   Persistencia de datos tras desconexión.
*   **Debug Dashboard:** Panel integrado para manipulación en tiempo real (Time Jump, Noclip) accesible solo para admin.

### 8.3. Detalles de Implementación Específicos

*   **Implementación de la IA (Echoes):**
    *   Se descarta la simulación física compleja (Steering behaviors pesados) a favor de **Máquinas de Estados Finitos (FSM)** ligeras.
    *   **Navegación:** NavMesh pre-calculado (no A* dinámico costoso) para rutas comunes (Dormitorio -> Clase -> Comedor).
*   **Gestión de Entidades (Entity Management):**
    *   **Unified Map:** Uso estricto de `Map<string, Entity>` en cliente y servidor. No arrays dispersos.
    *   **Sincronización:** Esquema de Colyseus (`Schema`) como única fuente de verdad para la posición, pero interpolada en cliente (100ms buffer).
