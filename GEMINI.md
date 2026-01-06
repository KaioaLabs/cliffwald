# Reglas del Proyecto

## Arquitectura Modular
- **Servidor Autoritativo**: Node.js + Colyseus.
- **Cliente Modular**: 
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
- **Población**: 24 Echos (Persistentes) + 4 Profesores (Estáticos/Vigilantes).

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
