/**
 * Film Grain Shader for cinematic gritty feel
 */
export const FilmGrainShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'time': { value: 0.0 },
        'amount': { value: 0.08 }, // Grain intensity
        'speed': { value: 1.0 }
    },

    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,

    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float amount;
        uniform float speed;
        varying vec2 vUv;

        // Random noise function
        float random(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);

            // Animated grain
            float noise = random(vUv + time * speed);
            float grain = (noise - 0.5) * amount;

            // Apply grain
            color.rgb += vec3(grain);

            gl_FragColor = color;
        }
    `
};
