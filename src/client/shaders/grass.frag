precision mediump float;

uniform vec3 uSunColor;
uniform vec3 uAmbientColor;

varying vec2 outTexCoord;
varying vec4 outColor;
varying vec3 vNormal; // From Vertex Shader

void main() {
    // Base color from vertex data
    vec3 baseColor = outColor.rgb;
    
    // 3D Lighting Simulation
    // Virtual Sun Direction (Top-Left)
    vec3 sunDir = normalize(vec3(-0.5, -0.5, 0.5));
    
    // Diffuse calculation (Dot product)
    float diff = max(dot(vNormal, sunDir), 0.0);
    
    // Light Color Composition
    // Ambient + Sun * Diffuse
    // We boost sun intensity slightly for drama
    vec3 lighting = uAmbientColor + (uSunColor * diff * 1.5);
    
    // Shadow base (Roots are darker)
    // UV.y goes 0 (tip) to 1 (root).
    // We darken the root.
    float occlusion = 1.0 - (outTexCoord.y * 0.4);
    
    vec3 finalColor = baseColor * lighting * occlusion;

    gl_FragColor = vec4(finalColor, outColor.a);
}
