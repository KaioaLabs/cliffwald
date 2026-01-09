# Reglas del Proyecto

## Hitos Técnicos Recientes (v0.1.1)
- **Seguridad (v0.1.2)**: Implementado sistema de Cuentas Reales (Seamless Auth) con contraseñas encriptadas y protección anti-cheat básica (Server Authority estricto).
- **Replicación de Hechizos**: Implementado sistema `onChange` en `NetworkManager`. Los proyectiles remotos ahora son autoritativos (posición del servidor) en lugar de predictivos (interpolación local insegura).
- **Rendimiento**:
    - **Servidor**: Aumentado Tick Rate de 15 a **30 FPS** para suavidad en red.
    - **Cliente**: Desactivada actualización por frame de sombras estáticas (pupitres), ahorrando ciclos de CPU masivos.
- **Limpieza**: Eliminado `postbuild.js` y scripts de entorno legacy. `Tiled/` se mantiene por decisión de usuario.
- **Configuración**: Centralizados valores mágicos de hechizos en `Config.ts` (`SPELL_CONFIG`).

## Arquitectura Modular & Build Pipeline (Actualizado Enero 2026)
- **Servidor Autoritativo**: Node.js + Colyseus + Express 5.
- **Serving Strategy**: El servidor sirve el cliente estático directamente desde la raíz `dist-client`.
    - **Fix Crítico**: Express 5 requiere Regex `/.*/` para rutas SPA, no strings `*`.
- **Build Zero-Copy**: Se eliminó `postbuild.js`. Vite construye directamente en `dist-client` y el servidor lee de ahí. Menos pasos = Menos errores.
- **Base de Datos Dual**:
    - **Local**: SQLite (rápido, desarrollo).
    - **Prod**: PostgreSQL/Supabase (persistente).
    - **Control**: `start_mmo.bat` actúa como Dashboard Unificado para cambiar entornos y lanzar procesos.

## Cliente Modular
- `AssetManager`: Carga centralizada de recursos.
- `UIScene`: Interfaz separada del juego.
- `NetworkManager`: Tipado estricto con Schema.
- **Entidad Unificada (CRÍTICO)**: En el cliente (`PlayerController`), **NUNCA** mantener listas separadas para Sprites y Lógica. Usar un único mapa `Map<string, Entity>` donde la `Entity` contiene componentes visuales (`sprite`) y lógicos (`body`).

## Física y Determinismo
- **Motor Físico**: Rapier.js (Isomórfico).
- **Sombras**: Proyección Polar 360º centralizada en `ShadowUtils`. Usar siempre posición base para objetos estáticos para evitar 'drift'.

## Mecánicas de Juego Activas
- **Magia Táctil**: Input $1 Unistroke, Feedback de Partículas y Luz Dinámica.
- **Sistema de Duelos**: Zona "Tatami" con reglas RPS (Piedra-Papel-Tijera). IA con rivalidad de casas y "strafe".
- **Identidad Permanente (Body Claiming)**:
    - Población finita (24 slots).
    - Al crear cuenta, el jugador **sobrescribe** un Echo (NPC) permanentemente.
    - Al desconectar, el personaje se queda como NPC con el nombre del jugador. **Persistencia 24/7**.

## Seguridad y Cuentas
- **Seamless Auth**: Login/Registro unificado. Sin correos de confirmación, pero con contraseñas encriptadas (`bcrypt`).
- **Server Authority**: 
    - El cliente es solo un visor. NUNCA confiar en inputs para stats (prestigio, items).
    - Base de datos (PostgreSQL) es la fuente de la verdad.
    - Servidor (Colyseus) valida toda lógica.

## Código y Estilo
- **Lenguaje**: TypeScript estricto. Evitar `any` en capas de red.
- **IA (NPCs)**: Máquinas de Estados Finitos (FSM) integradas en `AISystem`.
- **Configuración**: NUNCA usar "números mágicos" (colores, posiciones). Usar `Theme.ts` y `Config.ts`.

## Protocolo de Verificación (MANDATORIO)
- **Verificación Dual**: Código + Evidencia Visual (`screenshots/`).
- **Criterio de Fallo**: Pantalla negra o errores de consola en cliente/servidor.

## Security & Performance Standards
- **Tick Rate**: 30 FPS.
- **Validación**: Checks de servidor para cooldowns y propiedad de proyectiles.
- **Memoria**: Limpieza estricta de entidades al desconectar.
