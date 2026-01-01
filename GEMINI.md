# Reglas del Proyecto

## Arquitectura
- **Servidor Autoritativo**: Node.js + Colyseus. La verdad reside aquí.
- **Cliente Tonto**: Phaser 3. Solo renderiza e interpola estados.
- **Comunicación**: State Synchronization (Schema) y Delta Compression.

## Física y Determinismo
- **Motor Físico**: Rapier.js (lado servidor).
- **Control**: Movimiento cinemático basado en velocidad (linvel) para "Control Total".
- **Colisionadores**: Usar 'Greedy Meshing' para optimizar la geometría estática importada.

## Mapas y Espacios
- **Herramienta**: Tiled (Map Editor).
- **Formato**: JSON Export.
- **Semántica**: 
    - Capa de Objetos 'Collisions': Rectángulos invisibles para cuerpos estáticos.
    - Capa de Objetos 'Entities': Definición lógica (Puntos para Spawn, NPCs).
    - El servidor parsea el JSON para generar la física.

## Código y Estilo
- **Lenguaje**: TypeScript estricto.
- **Estilo**: No usar clases de ES6 innecesarias si una estructura de datos simple basta, pero respetar la arquitectura de clases de Colyseus (Schema).
- **IA (NPCs)**: Behavior Trees (Árboles de Comportamiento). NO usar redes neuronales generativas en tiempo de ejecución.
- **Generación**: El código de carga de mapas y esquemas debe ser generado automáticamente cuando sea posible.

## Protocolo de Verificación (MANDATORIO)
- **Verificación Dual**: Prohibido emitir un veredicto de "Éxito" basándose solo en texto/logs.
- **Ciclo de Cambio**: Cambio de Código -> Reinicio/Refresco -> `tools/snap.ps1` -> Análisis Visual.
- **Evidencia Visual**: Siempre revisar `screenshots/` tras un cambio.
- **Criterio de Fallo**: Una pantalla negra, sprites invisibles o UI rota se considera un FALLO CRÍTICO, independientemente de que el servidor reporte `Connected` o `Joined`.
