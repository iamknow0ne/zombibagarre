import * as THREE from 'three';

export class ProceduralTerrain {
    constructor(scene, biomeSystem, size = 400) {
        this.scene = scene;
        this.biomeSystem = biomeSystem;
        this.size = size;
        this.segments = 128; // High detail for smooth terrain
        this.terrain = null;

        console.log('🏔️ Procedural terrain initialized');
    }

    generate() {
        const biome = this.biomeSystem.getCurrentBiome();
        if (!biome) {
            console.error('❌ No biome selected!');
            return;
        }

        console.log(`🏗️ Generating ${biome.name} terrain...`);

        // Create FLAT terrain geometry (no height variation for gameplay)
        const geometry = new THREE.PlaneGeometry(
            this.size,
            this.size,
            128,  // High detail for smooth textures
            128
        );

        // Compute normals for proper lighting
        geometry.computeVertexNormals();

        // Create realistic PBR material with detail textures
        const material = this.createRealisticMaterial(biome);

        // Create mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.position.y = 0; // Perfectly flat at y=0
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = false; // Ground doesn't cast shadows

        this.scene.add(this.terrain);

        console.log(`✅ ${biome.name} flat terrain with PBR materials generated!`);
    }


    createRealisticMaterial(biome) {
        // Create high-quality PBR material for post-apocalyptic ground
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White base - color comes from texture
            roughness: 0.95,  // Very rough for asphalt/concrete
            metalness: 0.0,   // No metallic for ground surfaces
            flatShading: false,
            side: THREE.FrontSide
        });

        // Generate detailed textures
        const textures = this.createDetailedTextures(biome);

        material.map = textures.albedo;
        material.normalMap = textures.normal;
        material.roughnessMap = textures.roughness;
        material.aoMap = textures.ao;

        // Enable AO map (requires second UV set)
        material.aoMapIntensity = 1.0;

        material.needsUpdate = true;

        return material;
    }

    createDetailedTextures(biome) {
        const resolution = 2048; // High resolution for quality

        // Create albedo (color) map
        const albedoCanvas = this.createAlbedoMap(biome, resolution);
        const albedoTexture = new THREE.CanvasTexture(albedoCanvas);
        albedoTexture.wrapS = albedoTexture.wrapT = THREE.RepeatWrapping;
        albedoTexture.repeat.set(10, 10);
        albedoTexture.colorSpace = THREE.SRGBColorSpace;

        // Create normal map for surface detail
        const normalCanvas = this.createNormalMap(biome, resolution);
        const normalTexture = new THREE.CanvasTexture(normalCanvas);
        normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
        normalTexture.repeat.set(10, 10);

        // Create roughness map
        const roughnessCanvas = this.createRoughnessMap(biome, resolution);
        const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
        roughnessTexture.wrapS = roughnessTexture.wrapT = THREE.RepeatWrapping;
        roughnessTexture.repeat.set(10, 10);

        // Create AO (ambient occlusion) map
        const aoCanvas = this.createAOMap(biome, resolution);
        const aoTexture = new THREE.CanvasTexture(aoCanvas);
        aoTexture.wrapS = aoTexture.wrapT = THREE.RepeatWrapping;
        aoTexture.repeat.set(10, 10);

        return {
            albedo: albedoTexture,
            normal: normalTexture,
            roughness: roughnessTexture,
            ao: aoTexture
        };
    }


    createAlbedoMap(biome, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base asphalt/concrete color
        const baseColor = biome.ground.base;
        ctx.fillStyle = this.colorToHex(baseColor);
        ctx.fillRect(0, 0, size, size);

        // Add fine noise for surface variation
        for (let i = 0; i < 30000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const brightness = Math.random() * 40 - 20;
            const r = ((baseColor >> 16) & 255) + brightness;
            const g = ((baseColor >> 8) & 255) + brightness;
            const b = (baseColor & 255) + brightness;
            ctx.fillStyle = `rgba(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))}, 0.3)`;
            ctx.fillRect(x, y, 2, 2);
        }

        // Add weathering: cracks, stains, and patches
        this.addWeathering(ctx, size, biome);

        return canvas;
    }

    createNormalMap(biome, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Normal map base (128, 128, 255 = flat surface)
        ctx.fillStyle = 'rgb(128, 128, 255)';
        ctx.fillRect(0, 0, size, size);

        // Add surface bumps and cracks
        ctx.strokeStyle = 'rgb(100, 100, 200)';
        ctx.lineWidth = 2;

        // Procedural cracks
        for (let i = 0; i < 100; i++) {
            let x = Math.random() * size;
            let y = Math.random() * size;
            ctx.beginPath();
            ctx.moveTo(x, y);

            for (let j = 0; j < 8; j++) {
                x += (Math.random() - 0.5) * 30;
                y += (Math.random() - 0.5) * 30;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Add pebbles/bumps
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 5 + 2;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgb(150, 150, 255)');
            gradient.addColorStop(1, 'rgb(110, 110, 220)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    createRoughnessMap(biome, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base roughness (light = smooth, dark = rough)
        const baseRoughness = 200; // Fairly rough
        ctx.fillStyle = `rgb(${baseRoughness}, ${baseRoughness}, ${baseRoughness})`;
        ctx.fillRect(0, 0, size, size);

        // Add variation - worn paths are smoother
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 100 + 50;
            const smoothness = 100 + Math.random() * 50;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(${smoothness}, ${smoothness}, ${smoothness}, 0.5)`);
            gradient.addColorStop(1, 'rgba(200, 200, 200, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    createAOMap(biome, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // AO base (white = no occlusion)
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(0, 0, size, size);

        // Add dark patches for cracks and crevices
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 20 + 10;
            const darkness = 100 + Math.random() * 100;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(${darkness}, ${darkness}, ${darkness}, 0.6)`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    addWeathering(ctx, size, biome) {
        // Cracks in pavement
        ctx.strokeStyle = 'rgba(30, 30, 30, 0.8)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 60; i++) {
            let x = Math.random() * size;
            let y = Math.random() * size;
            ctx.beginPath();
            ctx.moveTo(x, y);
            for (let j = 0; j < 6; j++) {
                x += (Math.random() - 0.5) * 80;
                y += (Math.random() - 0.5) * 80;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Dirt/grime patches
        const baseColor = biome.ground.base;
        const r = (baseColor >> 16) & 255;
        const g = (baseColor >> 8) & 255;
        const b = baseColor & 255;

        for (let i = 0; i < 80; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 60 + 30;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(${r * 0.6}, ${g * 0.6}, ${b * 0.6}, 0.4)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rust/blood stains (post-apocalyptic)
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 40 + 20;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(100, 30, 20, 0.3)');
            gradient.addColorStop(1, 'rgba(100, 30, 20, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    colorToHex(color) {
        return `#${color.toString(16).padStart(6, '0')}`;
    }

    getSmokePositions() {
        // Generate smoke column positions around the map edges
        const positions = [];
        const count = 5;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = this.size * 0.4;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;

            positions.push(new THREE.Vector3(x, 0, z));
        }

        return positions;
    }

    update(deltaTime) {
        // Terrain is static - no animations needed
    }

    destroy() {
        if (this.terrain) {
            this.scene.remove(this.terrain);
            this.terrain.geometry.dispose();
            if (this.terrain.material.map) {
                this.terrain.material.map.dispose();
            }
            this.terrain.material.dispose();
        }
    }
}
