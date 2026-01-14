# CLIFFWALD ONLINE – GAME DESIGN DOCUMENT (MASTER)
**Versión:** 2.1 (Unificado "Codex Definitivo" - Enero 2026)
**Estado:** Fase 5 Completada. Fase 6 (Live Ops) En Curso.

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
*   **Servidor:** Node.js + Colyseus (Estado Autoritativo).
*   **Física:** Rapier2D (Determinista, compartida Cliente/Servidor).
*   **Base de Datos:** PostgreSQL (Supabase) via Prisma ORM.
*   **Protocolo:** WebSockets (State Sync + Delta Compression).

---

## 3. SISTEMA DE TIEMPO: "LOS DOS EJES"

### 3.1. Eje 1: El Reloj Atmosférico (Ritmo de Sesión)
Controla el bucle inmediato, la iluminación y la rutina diaria.
*   **Ciclo Total:** 45 Minutos Reales.
*   **Día (30 Min):** Clases, Socialización, Zonas Seguras.
*   **Noche (15 Min):** Toque de Queda (Curfew). Los Prefectos patrullan. PvPvE habilitado fuera de los dormitorios.

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

### 3.3. Eje 2: El Calendario Cíclico
*   **Regla de Oro:** 1 Ciclo Solar (45 min) = **1 Día de Calendario**.
*   **Semana Académica:** Lunes a Domingo = 5h 15m reales.
*   **Temporada:** 8 Semanas Reales = 1 Curso Completo.

---

## 4. POBLACIÓN E IDENTIDAD (SISTEMA ECHO)

### 4.1. Persistencia 24/7 (Body Claiming)
*   **Población Finita:** El mundo tiene 24 slots de estudiantes (8 Ignis, 8 Axiom, 8 Vesper).
*   **Posesión:** Al loguearse, el jugador "posee" un cuerpo existente.
*   **El Eco:** Al desconectarse, el personaje no desaparece. Se convierte en un NPC ("Echo") que mantiene el nombre, apariencia, inventario, Oro y Prestigio del jugador.

### 4.2. Inteligencia Artificial (Vida Escolar)
Los Ecos siguen una rutina basada en la tabla de horarios y su **Arquetipo** (asignado al nacer/crear):
*   **Socializer:** Busca grupos en el Patio para chatear.
*   **Killer:** Busca duelos en el Tatami.
*   **Achiever:** Va a clase temprano y estudia en la biblioteca.
*   **Explorer:** Deambula por el bosque o zonas ocultas.

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
*   **Zona de Duelo:** El combate está restringido a zonas específicas (Tatami) o durante la Noche.
*   **Condición de Victoria:** 3 Impactos o Ring Out (Empujón fuera de la zona).
*   **Consecuencias:** El perdedor queda aturdido (Knockout) temporalmente.

---

## 6. ECONOMÍA Y PRESTIGIO (VERSION 1.4)

### 6.1. El Oro (Moneda Comercial) 💰
*   **Uso:** Comprar pociones, comida y cosméticos.
*   **Tienda:** No existe menú global. Solo se puede comerciar interactuando con **NPCs Vendedores** específicos.
*   **Fuente:** Salario por completar Clases (Grado S = 100 Oro) o misiones.

### 6.2. El Prestigio (Honor de Casa) 💎
*   **Concepto:** Fama personal y Puntos de Casa simultáneamente.
*   **Acumulación:** 
    *   **Personal:** Se guarda en tu perfil. Nunca se pierde por inactividad.
    *   **Casa:** La suma del Prestigio de todos los miembros (Jugadores + Ecos) determina la Copa de las Casas.
*   **Anti-Sabotaje:** Un jugador "troll" no puede restar más puntos a su casa de los que él mismo ha aportado.

---

## 7. DISCIPLINA Y SEGURIDAD

### 7.1. Prefectos (NPCs de Élite)
*   **Rol:** Guardias nocturnos.
*   **Mecánica:** Patrullan rutas clave. Tienen un cono de visión (Line of Sight). Si te ven de noche, te persiguen.
*   **Captura:** Contacto físico = Teletransporte a la Mazmorra.

### 7.2. Detención (La Mazmorra)
*   **Castigo:** Zona aislada sin salida física.
*   **Salida:** Debes completar **5 Tareas de Mantenimiento** (limpiar, ordenar) para abrir la puerta mágica.
*   **Anti-AFK:** El tiempo no baja solo; requiere interacción activa.

---

## 8. NARRATIVA PROFUNDA (SISTEMA FABLE)

### 8.1. Las Voces Susurrantes
Mecánica de alineación moral donde el jugador se debate entre dos fuerzas opuestas.
*   **La Dualidad (Ángel y Demonio):** El jugador escucha susurros de dos entidades:
    *   **El Director (Luz/Orden):** Representa el deber y la rectitud.
    *   **Su Hermano (Sombra/Caos):** Representa la rebeldía y el poder personal.
*   **Mecánica de Elección:** Se ofrecerán misiones contradictorias simultáneamente. El jugador debe elegir explícitamente cuál de las dos realizar.
*   **Puntos de Alineación:** Independientes de la Casa. Determinan tu final en la temporada.

### 8.2. El Clímax: Duelo Final
Al final de la Semana 4 de la temporada:
1.  **Revelación de los Gemelos:** El sistema anuncia al Top #1 Luz y Top #1 Sombra.
2.  **El Duelo:** Combate a muerte permanente (del avatar estacional) en el Patio Central. Todo el servidor observa.
3.  **Estado del Mundo:** La victoria otorga bonificaciones globales para el siguiente mes.

---

## 10. HOJA DE RUTA (ESTADO ACTUAL)
*   **Fase 0-5:** COMPLETADAS (Motor, Física, Magia, Tiempo, Disciplina, Minijuegos, Economía).
*   **Fase 6 (En Progreso):** Live Ops (Torneos Automáticos y Reset de Temporada).
*   **Fase 7:** Simulation Polish (IA Turing-Test).
*   **Fase 8 (Futuro):** Implementación técnica de "Las Voces Susurrantes".