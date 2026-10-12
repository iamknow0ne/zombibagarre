/**
 * Chromatic Aberration Shader for that AAA cinematic look
 */
export const ChromaticAberrationShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'amount': { value: 0.003 } // Aberration intensity
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
        uniform float amount;
        varying vec2 vUv;

        void main() {
            // Offset from center
            vec2 offset = vUv - vec2(0.5);
            float dist = length(offset);

            // Sample RGB channels with offset (radial chromatic aberration)
            vec2 dir = normalize(offset);

            float r = texture2D(tDiffuse, vUv + dir * amount * dist).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - dir * amount * dist).b;

            gl_FragColor = vec4(r, g, b, 1.0);
        }
    `
};
