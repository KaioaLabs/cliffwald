#ifdef GL_ES
precision mediump float;
#endif

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uScroll; // Camera scroll position
uniform sampler2D uDepthMap;
uniform vec2 uMapSize; // Total map size in pixels
uniform vec3 uAmbientColor; // Global Ambient Light
uniform vec3 uSunColor;     // Sun/Moon Light Color

// PALETTE
const vec3 COLOR_DEEP = vec3(0.11, 0.17, 0.32); // #1d2b53 (Deep Indigo)
const vec3 COLOR_MID  = vec3(0.10, 0.40, 0.80); // #1966cc (Ocean Blue)
const vec3 COLOR_SHALLOW = vec3(0.0, 0.7, 0.5); // #00b380 (Emerald/Greenish)
const vec3 COLOR_FOAM = vec3(0.9, 0.95, 1.0);   // Base White Foam

// --- VORONOI / CELLULAR NOISE ---
vec2 random2( vec2 p ) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}

float voronoi(in vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float m_dist = 1.0; 

    for( int j=-1; j<=1; j++ ) {
        for( int i=-1; i<=1; i++ ) {
            vec2 g = vec2(float(i),float(j));
            vec2 o = random2( n + g );
            o = 0.5 + 0.5*sin( uTime*2.0 + 6.2831*o ); // Animate offset
            vec2 r = g + o - f;
            float d = length(r);
            m_dist = min(m_dist, d);
        }
    }
    return m_dist;
}

void main() {
    // 1. World Coordinates
    float screenY = uResolution.y - gl_FragCoord.y;
    vec2 worldPos = vec2(gl_FragCoord.x + uScroll.x, uScroll.y + screenY);
    
    // 2. Map UVs for Depth Sampling
    vec2 depthUV = vec2(worldPos.x / uMapSize.x, 1.0 - (worldPos.y / uMapSize.y));
    float depth = texture2D(uDepthMap, depthUV).r;

    // 3. Stylized Voronoi Water
    // Scale the coordinates for the cell size
    vec2 st = worldPos / 64.0; // Cells are approx 64px wide
    float v = voronoi(st);
    
    // Invert Voronoi for "Caustic" look (net pattern)
    // Sharpen edges
    float caustic = smoothstep(0.05, 0.0, v * v); 
    
    // 4. Color Mixing based on Depth
    vec3 baseColor = mix(COLOR_SHALLOW, COLOR_MID, smoothstep(0.0, 0.5, depth));
    baseColor = mix(baseColor, COLOR_DEEP, smoothstep(0.5, 1.0, depth));

    // APPLY AMBIENT LIGHTING
    baseColor *= (uAmbientColor + 0.3); 

    // 5. Apply Caustics
    // Caustics are brighter lines. 
    // We dampen them in deep water.
    vec3 causticColor = COLOR_FOAM * uSunColor;
    baseColor += causticColor * caustic * (1.0 - depth * 0.8) * 0.5;

    // 6. Highlights (Sparkles)
    // Use the voronoi centers (where v is close to 0?) No, v is dist to center.
    // Specular highlight: High power of inverted voronoi
    float sparkle = pow(1.0 - v, 10.0);
    // Only sparkle if we have direct sun
    float sunIntensity = length(uSunColor);
    if (sunIntensity > 0.1) {
        // Random masking for sparkles so not every cell sparkles
        float mask = step(0.98, random2(floor(st)).x); 
        baseColor += vec3(1.0) * sparkle * mask * sunIntensity;
    }

    // 7. Foam at Shore
    float foamMask = smoothstep(0.15, 0.0, depth); // Increased range slightly
    // Distort foam edge with noise (re-using voronoi slightly offset)
    float foamDistort = voronoi(st * 4.0);
    if (foamMask > 0.0) {
        float foam = step(0.4, foamDistort); // Threshold
        baseColor = mix(baseColor, COLOR_FOAM, foam * foamMask);
    }

    // Opacity: Full (Behind Terrain)
    gl_FragColor = vec4(baseColor, 1.0);
}