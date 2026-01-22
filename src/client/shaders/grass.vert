precision mediump float;

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uModelMatrix;

attribute vec2 inPosition;
attribute vec2 inTexCoord;
attribute vec4 inColor;

varying vec2 outTexCoord;
varying vec4 outColor;
varying vec3 vNormal; // Simulated Normal for 3D lighting

// Wind
uniform float uTime;
uniform vec2 uScroll;
uniform sampler2D uForceMap;
uniform vec2 uResolution; // Screen resolution

// Simplex Noise (2D)
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    vec4 pos = vec4(inPosition, 0.0, 1.0);
    vec4 worldPos = uModelMatrix * pos;

    // 1. Read Force Map
    vec2 screenUV = (worldPos.xy - uScroll) / uResolution;
    screenUV.y = 1.0 - screenUV.y; 
    float force = texture2D(uForceMap, screenUV).r; 

    // 2. Apply Wind
    // UV.y: 0=Tip, 1=Root. We only move the tip.
    float flexibility = 1.0 - inTexCoord.y; 
    
    // Wind Direction (Diagonal wind)
    vec2 windDir = normalize(vec2(1.0, 0.5)); 
    
    // Noise layers
    // Base sway (Slow, large scale)
    float baseSway = snoise(worldPos.xy * 0.005 + uTime * 0.2);
    // Gusts (Fast, small scale)
    float gust = snoise(worldPos.xy * 0.01 - uTime * 0.8);
    
    // Combined wind force
    float windStrength = (baseSway * 2.0) + (gust * 4.0);
    
    // Interaction Force (Player push)
    float pushStrength = force * 25.0;

    // Total displacement
    float totalDisplacement = (windStrength + pushStrength) * flexibility;
    
    // Apply displacement mostly in X, slightly in Y for 3D illusion
    pos.x += totalDisplacement;
    pos.y += totalDisplacement * 0.1;

    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * pos;
    
    outTexCoord = inTexCoord;
    outColor = inColor;

    // 3. Fake Normal for Lighting
    // If we bend right (positive displacement), normal tilts right.
    // Base normal is (0, 0, 1) pointing at camera.
    // We tilt X based on displacement.
    float tilt = clamp(totalDisplacement * 0.1, -0.5, 0.5);
    vNormal = normalize(vec3(tilt, -0.2, 0.8)); // Slight upward tilt for top-down view
}
