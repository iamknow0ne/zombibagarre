import * as THREE from 'three';
import { Entity } from './Entity.js';
import { Powerup } from './Powerup.js';

export class Zombie extends Entity {
    constructor(scene, spawnPos, type = 'normal', game) {
        super(scene, spawnPos);

        this.game = game;
        this.type = type;

        // Stats based on type (10+ types!)
        switch (type) {
            case 'normal': // Standard zombie
                this.speed = 2;
                this.maxHealth = 100;
                this.damage = 20;
                this.color = 0x00ff00;
                this.emissive = 0x008800;
                this.scale = 1;
                break;

            case 'fast': // Runner zombie - quick but weak
                this.speed = 5;
                this.maxHealth = 60;
                this.damage = 15;
                this.color = 0x00ffff;
                this.emissive = 0x008888;
                this.scale = 0.8;
                break;

            case 'tank': // Tank zombie - slow but tanky
                this.speed = 1;
                this.maxHealth = 300;
                this.damage = 40;
                this.color = 0x666666;
                this.emissive = 0x333333;
                this.scale = 1.8;
                break;

            case 'exploder': // Explodes on death
                this.speed = 3;
                this.maxHealth = 80;
                this.damage = 25;
                this.color = 0xff6600;
                this.emissive = 0xff3300;
                this.scale = 1.2;
                this.isExploder = true;
                break;

            case 'toxic': // Poison zombie - damages over time
                this.speed = 2;
                this.maxHealth = 120;
                this.damage = 15;
                this.color = 0x88ff00;
                this.emissive = 0x44aa00;
                this.scale = 1.1;
                this.isToxic = true;
                break;

            case 'elite': // Elite zombie - balanced threat
                this.speed = 3;
                this.maxHealth = 150;
                this.damage = 30;
                this.color = 0xff0000;
                this.emissive = 0x880000;
                this.scale = 1.5;
                break;

            case 'armored': // Armored zombie - high defense
                this.speed = 1.5;
                this.maxHealth = 250;
                this.damage = 35;
                this.color = 0x8B4513;
                this.emissive = 0x654321;
                this.scale = 1.6;
                break;

            case 'berserker': // Berserker - gets faster when damaged
                this.speed = 2.5;
                this.maxHealth = 180;
                this.damage = 35;
                this.color = 0xff0066;
                this.emissive = 0xaa0044;
                this.scale = 1.4;
                this.isBerserker = true;
                break;

            case 'spitter': // Ranged zombie - shoots acid projectiles
                this.speed = 1.5;
                this.maxHealth = 90;
                this.damage = 20;
                this.color = 0xaaff00;
                this.emissive = 0x66aa00;
                this.scale = 1.1;
                this.isSpitter = true;
                break;

            case 'invisible': // Stealth zombie - partially invisible
                this.speed = 3.5;
                this.maxHealth = 70;
                this.damage = 25;
                this.color = 0xaaaaff;
                this.emissive = 0x6666aa;
                this.scale = 0.9;
                this.isInvisible = true;
                break;

            case 'boss': // Boss zombie - ABSOLUTELY MASSIVE TITAN
                this.speed = 4.0; // Terrifying speed
                this.maxHealth = 25000; // EXTREME tankiness
                this.damage = 150; // Devastating damage
                this.color = 0xaa00ff;
                this.emissive = 0x6600aa;
                this.scale = 12; // ABSOLUTELY MASSIVE (12x normal size!)
                this.armor = 0.6; // 60% damage reduction
                break;

            default: // Fallback to normal
                this.speed = 2;
                this.maxHealth = 100;
                this.damage = 20;
                this.color = 0x00ff00;
                this.emissive = 0x008800;
                this.scale = 1;
        }

        this.health = this.maxHealth;

        this.attackCooldown = 0;
        this.attackRange = 2;
        this.attackRate = 1000; // ms

        this.damageFlashTime = 0;
        this.isDying = false; // Prevent infinite recursion with exploder chains

        this.createMesh();
    }

    createMesh() {
        // ULTRA-REALISTIC Zombie with Advanced THREE.js Techniques
        const group = new THREE.Group();

        // Build completely unique models for each zombie type
        switch (this.type) {
            case 'normal':
                this.buildNormalZombie(group);
                break;
            case 'fast':
                this.buildFastZombie(group);
                break;
            case 'tank':
                this.buildTankZombie(group);
                break;
            case 'exploder':
                this.buildExploderZombie(group);
                break;
            case 'toxic':
                this.buildToxicZombie(group);
                break;
            case 'berserker':
                this.buildBerserkerZombie(group);
                break;
            case 'spitter':
                this.buildSpitterZombie(group);
                break;
            case 'invisible':
                this.buildInvisibleZombie(group);
                break;
            case 'armored':
                this.buildArmoredZombie(group);
                break;
            case 'elite':
                this.buildEliteZombie(group);
                break;
            case 'boss':
                this.buildBossZombie(group);
                break;
            default:
                this.buildNormalZombie(group);
        }

        this.mesh = group;
        this.mesh.scale.setScalar(this.scale);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Create health bar
        this.createHealthBar();

        console.log(`✨ REALISTIC ${this.type} zombie created`);
    }

    /**
     * NORMAL ZOMBIE - Classic shambler with decayed flesh
     */
    buildNormalZombie(group) {
        const fleshMat = new THREE.MeshStandardMaterial({
            color: 0x6B5A4A,
            roughness: 0.95,
            metalness: 0.0
        });

        // Hunched torso
        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 1.2, 12, 16),
            fleshMat
        );
        torso.position.y = 1.2;
        torso.rotation.x = 0.2; // Hunched forward
        torso.castShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Skull-like head
        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        this.deformMesh(headGeo, 0.15); // Add deformations
        const head = new THREE.Mesh(headGeo, fleshMat);
        head.position.set(0, 2.1, 0.2);
        head.scale.set(1, 1.1, 0.9); // Elongated
        head.castShadow = true;
        group.add(head);

        // Exposed ribs
        for (let i = 0; i < 4; i++) {
            const rib = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8),
                new THREE.MeshStandardMaterial({ color: 0xE8E8D8, roughness: 0.7 })
            );
            rib.position.set(0, 1 + i * 0.2, 0.35);
            rib.rotation.z = Math.PI / 2;
            group.add(rib);
        }

        // Glowing eyes
        this.addZombieEyes(group, 2.15, 0x880000);

        // Tattered arms
        this.addZombieArms(group, fleshMat, 1.4, 0.8);
    }

    /**
     * FAST ZOMBIE - Emaciated runner with elongated limbs
     */
    buildFastZombie(group) {
        const skinnyMat = new THREE.MeshStandardMaterial({
            color: 0x8B7355,
            roughness: 0.85,
            metalness: 0.0
        });

        // Extremely thin torso
        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.25, 1.8, 12, 16),
            skinnyMat
        );
        torso.position.y = 1.4;
        torso.rotation.x = 0.4; // Hunched for running
        torso.castShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Small elongated head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            skinnyMat
        );
        head.position.set(0, 2.5, 0.4);
        head.scale.set(0.9, 1.3, 0.8); // Stretched
        head.castShadow = true;
        group.add(head);

        // Massive jaw (screaming)
        const jaw = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.2, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x3A2A1A })
        );
        jaw.position.set(0, 2.3, 0.5);
        jaw.rotation.x = 0.3;
        group.add(jaw);

        // Glowing eyes
        this.addZombieEyes(group, 2.6, 0x00FFFF);

        // Long spindly arms
        this.addZombieArms(group, skinnyMat, 1.6, 1.2);
    }

    /**
     * TANK ZOMBIE - Massive muscular brute with armor plating
     */
    buildTankZombie(group) {
        const muscleMat = new THREE.MeshStandardMaterial({
            color: 0x8B4545,
            roughness: 0.75,
            metalness: 0.15
        });

        // Massive barrel chest
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1.5, 0.9),
            muscleMat
        );
        torso.position.y = 1.2;
        torso.castShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Huge shoulders
        for (let x of [-0.8, 0.8]) {
            const shoulder = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 12, 12),
                muscleMat
            );
            shoulder.position.set(x, 1.7, 0);
            shoulder.castShadow = true;
            group.add(shoulder);
        }

        // Gorilla-like head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.45, 16, 16),
            muscleMat
        );
        head.position.set(0, 2.3, 0);
        head.scale.set(1.2, 0.9, 1.1); // Wide and flat
        head.castShadow = true;
        group.add(head);

        // Metal armor plates
        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x3A3A3A,
            roughness: 0.3,
            metalness: 0.95,
            envMapIntensity: 2.0
        });

        // Chest plate
        const chestArmor = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.8, 0.1),
            armorMat
        );
        chestArmor.position.set(0, 1.3, 0.5);
        chestArmor.castShadow = true;
        group.add(chestArmor);

        // Glowing eyes
        this.addZombieEyes(group, 2.4, 0xFF0000);

        // Thick muscular arms
        this.addZombieArms(group, muscleMat, 1.5, 0.9, 0.15);
    }

    /**
     * EXPLODER ZOMBIE - Volatile infected with glowing internal core
     */
    buildExploderZombie(group) {
        const exploderMat = this.createExploderMaterial();

        // Bloated torso
        const torso = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 16, 16),
            exploderMat
        );
        torso.position.y = 1.2;
        torso.scale.set(1, 1.3, 1); // Vertically stretched
        torso.castShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Glowing internal core (visible through transmission)
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });
        const core = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 12, 12),
            coreMat
        );
        core.position.y = 1.2;
        group.add(core);

        // Pulsing core light
        const coreLight = new THREE.PointLight(0xff3300, 3, 5);
        coreLight.position.y = 1.2;
        group.add(coreLight);
        this.coreLight = coreLight; // Store for pulsing animation

        // Distorted head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 12, 12),
            exploderMat
        );
        head.position.set(0, 2.0, 0);
        head.castShadow = true;
        group.add(head);

        // Glowing eyes
        this.addZombieEyes(group, 2.05, 0xff6600);

        // Thin arms
        this.addZombieArms(group, exploderMat, 1.3, 0.7, 0.08);
    }

    /**
     * TOXIC ZOMBIE - Radioactive mutant with slimy appearance
     */
    buildToxicZombie(group) {
        const toxicMat = this.createToxicMaterial();

        // Dripping torso
        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.45, 1.3, 12, 16),
            toxicMat
        );
        torso.position.y = 1.3;
        torso.castShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Toxic drips (spheres hanging off body)
        for (let i = 0; i < 5; i++) {
            const drip = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                toxicMat
            );
            drip.position.set(
                (Math.random() - 0.5) * 0.6,
                0.6 + i * 0.3,
                (Math.random() - 0.5) * 0.4
            );
            group.add(drip);
        }

        // Mutated head with bulges
        const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
        this.deformMesh(headGeo, 0.2); // Heavy deformation
        const head = new THREE.Mesh(headGeo, toxicMat);
        head.position.set(0, 2.2, 0);
        head.scale.set(1.2, 1, 1); // Wide head
        head.castShadow = true;
        group.add(head);

        // Toxic glow
        const toxicLight = new THREE.PointLight(0x44aa00, 2, 4);
        toxicLight.position.y = 1.5;
        group.add(toxicLight);

        // Glowing toxic eyes
        this.addZombieEyes(group, 2.25, 0x44aa00);

        // Dripping arms
        this.addZombieArms(group, toxicMat, 1.5, 0.85, 0.09);
    }

    /**
     * BERSERKER ZOMBIE - Enraged mutant with rage glow
     */
    buildBerserkerZombie(group) {
        const berserkerMat = this.createBerserkerMaterial();

        // Muscular hunched torso
        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.5, 1.4, 12, 16),
            berserkerMat
        );
        torso.position.y = 1.3;
        torso.rotation.x = 0.3; // Heavily hunched
        torso.castShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Exposed spine ridges
        for (let i = 0; i < 6; i++) {
            const spine = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.05, 0.2),
                berserkerMat
            );
            spine.position.set(0, 0.8 + i * 0.2, -0.3);
            spine.rotation.x = -0.3;
            group.add(spine);
        }

        // Snarling head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 16, 16),
            berserkerMat
        );
        head.position.set(0, 2.0, 0.3);
        head.scale.set(1, 0.9, 1.2); // Forward-jutting jaw
        head.castShadow = true;
        group.add(head);

        // Massive jaw
        const jaw = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.2, 0.5),
            berserkerMat
        );
        jaw.position.set(0, 1.85, 0.4);
        group.add(jaw);

        // Rage glow
        const rageLight = new THREE.PointLight(0xff0066, 2.5, 4);
        rageLight.position.y = 1.5;
        group.add(rageLight);
        this.rageLight = rageLight; // For pulsing animation

        // Intense glowing eyes
        this.addZombieEyes(group, 2.05, 0xff0066);

        // Long powerful arms
        this.addZombieArms(group, berserkerMat, 1.4, 1.0, 0.12);
    }

    /**
     * SPITTER ZOMBIE - Acid-spewing mutant with distended jaw
     */
    buildSpitterZombie(group) {
        const acidMat = this.createAcidicMaterial();

        // Thin torso
        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.35, 1.5, 12, 16),
            acidMat
        );
        torso.position.y = 1.4;
        torso.castShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Elongated neck
        const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.2, 0.6, 12),
            acidMat
        );
        neck.position.y = 2.0;
        group.add(neck);

        // Small head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 12, 12),
            acidMat
        );
        head.position.set(0, 2.4, 0);
        head.scale.set(1, 0.8, 1);
        head.castShadow = true;
        group.add(head);

        // MASSIVE distended jaw
        const jaw = new THREE.Mesh(
            new THREE.ConeGeometry(0.3, 0.8, 8),
            acidMat
        );
        jaw.position.set(0, 2.1, 0.3);
        jaw.rotation.x = Math.PI;
        jaw.castShadow = true;
        group.add(jaw);

        // Acid sacs (visible inside jaw)
        const sacMat = new THREE.MeshBasicMaterial({
            color: 0x66ff00,
            transparent: true,
            opacity: 0.6
        });
        const sac = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            sacMat
        );
        sac.position.set(0, 2.0, 0.2);
        group.add(sac);

        // Acid glow
        const acidLight = new THREE.PointLight(0x66aa00, 1.5, 3);
        acidLight.position.set(0, 2.1, 0.3);
        group.add(acidLight);

        // Glowing eyes
        this.addZombieEyes(group, 2.45, 0x66aa00);

        // Thin arms
        this.addZombieArms(group, acidMat, 1.5, 0.8, 0.08);
    }

    /**
     * INVISIBLE ZOMBIE - Ghostly apparition with high transmission
     */
    buildInvisibleZombie(group) {
        const ghostMat = this.createGhostMaterial();

        // Semi-transparent torso
        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.4, 1.3, 12, 16),
            ghostMat
        );
        torso.position.y = 1.3;
        torso.castShadow = true;
        torso.receiveShadow = false; // Ghosts don't receive shadows
        group.add(torso);
        this.bodyMesh = torso;

        // Fading head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 16, 16),
            ghostMat
        );
        head.position.set(0, 2.1, 0);
        head.castShadow = true;
        head.receiveShadow = false;
        group.add(head);

        // Spectral aura
        const auraGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x6666ff,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.y = 1.3;
        group.add(aura);

        // Rim lighting for visibility
        const rimLight1 = new THREE.PointLight(0x6666ff, 2, 3);
        rimLight1.position.set(0, 1.5, -1);
        group.add(rimLight1);

        const rimLight2 = new THREE.PointLight(0x6666ff, 2, 3);
        rimLight2.position.set(0, 1.5, 1);
        group.add(rimLight2);

        // Ghostly eyes
        this.addZombieEyes(group, 2.15, 0x8888ff);

        // Transparent arms
        this.addZombieArms(group, ghostMat, 1.4, 0.8, 0.09);
    }

    /**
     * ARMORED ZOMBIE - Heavy plated warrior
     */
    buildArmoredZombie(group) {
        const armorMat = this.createArmoredMaterial(0.9);
        const fleshMat = new THREE.MeshStandardMaterial({
            color: 0x6B5A4A,
            roughness: 0.9,
            metalness: 0.0
        });

        // Armored torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.4, 0.6),
            armorMat
        );
        torso.position.y = 1.2;
        torso.castShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Shoulder armor plates
        for (let x of [-0.6, 0.6]) {
            const pauldron = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 12, 12),
                armorMat
            );
            pauldron.position.set(x, 1.7, 0);
            pauldron.scale.set(1, 0.6, 1);
            pauldron.castShadow = true;
            group.add(pauldron);
        }

        // Helmet
        const helmet = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.4, 0.5, 16),
            armorMat
        );
        helmet.position.y = 2.2;
        helmet.castShadow = true;
        group.add(helmet);

        // Face opening (flesh visible)
        const face = new THREE.Mesh(
            new THREE.PlaneGeometry(0.4, 0.3),
            fleshMat
        );
        face.position.set(0, 2.1, 0.41);
        group.add(face);

        // Chest plate
        const chestPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.9, 0.1),
            armorMat
        );
        chestPlate.position.set(0, 1.3, 0.35);
        chestPlate.castShadow = true;
        group.add(chestPlate);

        // Glowing eyes through helmet
        this.addZombieEyes(group, 2.15, 0xff4400);

        // Armored arms
        this.addZombieArms(group, armorMat, 1.4, 0.9, 0.12);
    }

    /**
     * ELITE ZOMBIE - Crimson warrior with battle scars
     */
    buildEliteZombie(group) {
        const eliteMat = this.createEliteMaterial();

        // Battle-hardened torso
        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.5, 1.5, 16, 16),
            eliteMat
        );
        torso.position.y = 1.4;
        torso.castShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Battle scars (dark slashes)
        const scarMat = new THREE.MeshStandardMaterial({
            color: 0x330000,
            roughness: 0.9,
            metalness: 0.1
        });

        for (let i = 0; i < 4; i++) {
            const scar = new THREE.Mesh(
                new THREE.PlaneGeometry(0.6, 0.05),
                scarMat
            );
            scar.position.set(
                (Math.random() - 0.5) * 0.3,
                0.8 + i * 0.3,
                0.51
            );
            scar.rotation.z = (Math.random() - 0.5) * 0.5;
            group.add(scar);
        }

        // Elite helmet/crown
        const crownMat = new THREE.MeshStandardMaterial({
            color: 0xaa0000,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0x550000,
            emissiveIntensity: 0.5
        });

        // Crown spikes
        for (let i = 0; i < 5; i++) {
            const spike = new THREE.Mesh(
                new THREE.ConeGeometry(0.08, 0.4, 6),
                crownMat
            );
            const angle = (i / 5) * Math.PI * 2;
            spike.position.set(
                Math.cos(angle) * 0.35,
                2.4,
                Math.sin(angle) * 0.35
            );
            spike.rotation.z = angle;
            spike.rotation.x = Math.PI / 6;
            group.add(spike);
        }

        // Warrior head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            eliteMat
        );
        head.position.set(0, 2.2, 0);
        head.castShadow = true;
        group.add(head);

        // Elite aura
        const eliteLight = new THREE.PointLight(0xff0000, 2, 5);
        eliteLight.position.y = 1.5;
        group.add(eliteLight);

        // Intense red eyes
        this.addZombieEyes(group, 2.25, 0xff0000);

        // Powerful arms
        this.addZombieArms(group, eliteMat, 1.5, 0.95, 0.13);
    }

    /**
     * BOSS ZOMBIE - MASSIVE ultimate threat with horns and multiple armor layers
     */
    buildBossZombie(group) {
        // === APOCALYPTIC TITAN BOSS - ABSOLUTELY MASSIVE ===
        const bossMat = new THREE.MeshStandardMaterial({
            color: 0x8800ff,
            emissive: 0x6600aa,
            emissiveIntensity: 1.5,
            roughness: 0.4,
            metalness: 0.6
        });

        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x1a0a2a,
            emissive: 0x330055,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.95
        });

        // COLOSSAL TORSO - Grotesquely muscular
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 3.5, 2.0),
            bossMat
        );
        torso.position.y = 2.5;
        torso.castShadow = true;
        torso.receiveShadow = true;
        group.add(torso);
        this.bodyMesh = torso;

        // Exposed ribcage (horrifying detail)
        for (let i = 0; i < 6; i++) {
            const rib = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.08, 0.8, 8, 16),
                new THREE.MeshStandardMaterial({
                    color: 0x550088,
                    emissive: 0x330055,
                    emissiveIntensity: 0.5,
                    roughness: 0.7,
                    metalness: 0.3
                })
            );
            rib.position.set(0, 2.0 + i * 0.35, 1.05);
            rib.rotation.z = Math.PI / 2;
            rib.castShadow = true;
            group.add(rib);
        }

        // MASSIVE LAYERED ARMOR - Multiple overlapping plates
        const armorLayers = [
            { y: 3.5, width: 2.2, height: 0.8 },
            { y: 2.8, width: 2.0, height: 0.7 },
            { y: 2.1, width: 1.8, height: 0.6 },
            { y: 1.4, width: 1.6, height: 0.5 }
        ];

        for (let layer of armorLayers) {
            const plate = new THREE.Mesh(
                new THREE.BoxGeometry(layer.width, layer.height, 0.15),
                armorMat
            );
            plate.position.set(0, layer.y, 1.1);
            plate.castShadow = true;
            group.add(plate);

            // Armor rivets
            for (let x of [-layer.width/3, 0, layer.width/3]) {
                const rivet = new THREE.Mesh(
                    new THREE.SphereGeometry(0.08, 8, 8),
                    armorMat
                );
                rivet.position.set(x, layer.y, 1.18);
                group.add(rivet);
            }
        }

        // GIGANTIC SHOULDERS with spikes
        for (let x of [-1.6, 1.6]) {
            const shoulder = new THREE.Mesh(
                new THREE.SphereGeometry(0.8, 20, 20),
                armorMat
            );
            shoulder.position.set(x, 4.0, 0);
            shoulder.scale.set(1.2, 0.9, 1.2);
            shoulder.castShadow = true;
            group.add(shoulder);

            // Multiple shoulder spikes (intimidating)
            for (let i = 0; i < 3; i++) {
                const spike = new THREE.Mesh(
                    new THREE.ConeGeometry(0.2, 1.2, 8),
                    armorMat
                );
                const angle = (i - 1) * 0.4;
                spike.position.set(x, 4.5, 0);
                spike.rotation.z = x < 0 ? -Math.PI / 6 + angle : Math.PI / 6 - angle;
                spike.castShadow = true;
                group.add(spike);
            }
        }

        // MASSIVE ARMS - Brutally thick
        for (let x of [-1.3, 1.3]) {
            // Upper arm
            const upperArm = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.5, 1.8, 16, 32),
                bossMat
            );
            upperArm.position.set(x, 2.8, 0);
            upperArm.rotation.z = x < 0 ? 0.5 : -0.5;
            upperArm.castShadow = true;
            group.add(upperArm);

            // Forearm (even thicker)
            const forearm = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.6, 1.5, 16, 32),
                bossMat
            );
            forearm.position.set(x * 1.5, 1.2, 0.3);
            forearm.rotation.z = x < 0 ? 0.3 : -0.3;
            forearm.castShadow = true;
            group.add(forearm);

            // MASSIVE CLAW hands
            const hand = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: 0x440066,
                    emissive: 0x220033,
                    roughness: 0.6,
                    metalness: 0.4
                })
            );
            hand.position.set(x * 1.8, 0.3, 0.5);
            hand.scale.set(1, 0.8, 1.5);
            hand.castShadow = true;
            group.add(hand);

            // Claws
            for (let i = 0; i < 3; i++) {
                const claw = new THREE.Mesh(
                    new THREE.ConeGeometry(0.12, 0.8, 8),
                    armorMat
                );
                claw.position.set(x * 1.9 + (i - 1) * 0.2, 0.1, 0.9);
                claw.rotation.x = -Math.PI / 4;
                claw.castShadow = true;
                group.add(claw);
            }
        }

        // HORRIFYING HEAD - Monstrous and deformed
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.9, 24, 24),
            bossMat
        );
        head.position.set(0, 5.2, 0.3);
        head.scale.set(1.3, 1.1, 1.4);
        head.castShadow = true;
        group.add(head);

        // MASSIVE DEMONIC HORNS - Curved and threatening
        for (let x of [-0.7, 0.7]) {
            // Main horn
            const horn = new THREE.Mesh(
                new THREE.ConeGeometry(0.25, 2.0, 12),
                armorMat
            );
            horn.position.set(x, 5.8, 0);
            horn.rotation.z = x < 0 ? -Math.PI / 5 : Math.PI / 5;
            horn.rotation.x = -0.3;
            horn.castShadow = true;
            group.add(horn);

            // Secondary smaller horns
            const smallHorn = new THREE.Mesh(
                new THREE.ConeGeometry(0.15, 1.2, 8),
                armorMat
            );
            smallHorn.position.set(x * 0.5, 5.6, -0.4);
            smallHorn.rotation.x = 0.4;
            smallHorn.castShadow = true;
            group.add(smallHorn);
        }

        // Glowing demonic eyes
        this.addZombieEyes(group, 5.3, 0xff0088);

        // Additional eye sockets (multiple eyes - horrifying)
        for (let offset of [-0.4, 0.4]) {
            const extraEye = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: 0xff0088,
                    transparent: true,
                    opacity: 0.8
                })
            );
            extraEye.position.set(offset, 5.1, 0.9);
            group.add(extraEye);

            const eyeLight = new THREE.PointLight(0xff0088, 2, 4);
            eyeLight.position.copy(extraEye.position);
            group.add(eyeLight);
        }

        // MASSIVE LEGS - Tree trunk thickness
        for (let x of [-0.8, 0.8]) {
            // Thigh
            const thigh = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.7, 2.0, 16, 32),
                bossMat
            );
            thigh.position.set(x, 1.5, 0);
            thigh.castShadow = true;
            group.add(thigh);

            // Shin with armor
            const shin = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.6, 1.8, 16, 32),
                bossMat
            );
            shin.position.set(x, 0.5, 0);
            shin.castShadow = true;
            group.add(shin);

            // Knee armor (spiked)
            const kneeArmor = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 16, 16),
                armorMat
            );
            kneeArmor.position.set(x, 1.0, 0.4);
            kneeArmor.scale.set(1, 0.6, 1);
            kneeArmor.castShadow = true;
            group.add(kneeArmor);

            // Knee spike
            const kneeSpike = new THREE.Mesh(
                new THREE.ConeGeometry(0.2, 0.7, 8),
                armorMat
            );
            kneeSpike.position.set(x, 1.0, 0.8);
            kneeSpike.rotation.x = Math.PI / 2;
            kneeSpike.castShadow = true;
            group.add(kneeSpike);
        }

        // EPIC BOSS AURA - Multiple layered lights
        const bossAura = new THREE.PointLight(0xaa00ff, 8, 20);
        bossAura.position.y = 3.0;
        group.add(bossAura);

        // Pulsing secondary aura
        const secondaryAura = new THREE.PointLight(0xff00aa, 6, 15);
        secondaryAura.position.y = 2.0;
        group.add(secondaryAura);

        // Dramatic rim lights
        const rimLight1 = new THREE.PointLight(0xff00ff, 4, 12);
        rimLight1.position.set(-2, 2, 2);
        group.add(rimLight1);

        const rimLight2 = new THREE.PointLight(0xff00ff, 2, 8);
        rimLight2.position.set(2, 2, 2);
        group.add(rimLight2);

        // Glowing purple eyes
        this.addZombieEyes(group, 3.05, 0x8800ff);

        // THICK powerful arms
        this.addZombieArms(group, bossMat, 2.0, 1.3, 0.2);
    }

    /**
     * Create decayed flesh material for normal zombies
     */
    createDecayedFleshMaterial(baseColor, emissiveColor) {
        return new THREE.MeshStandardMaterial({
            color: baseColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.3,
            roughness: 0.95,
            metalness: 0.0,
            envMapIntensity: 0.5
        });
    }

    /**
     * Create armored material with high metalness
     */
    createArmoredMaterial(metalnessValue = 0.85) {
        return new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            emissive: 0x222222,
            emissiveIntensity: 0.3,
            roughness: 0.3,
            metalness: metalnessValue
        });
    }

    /**
     * Create exploder material with glowing core
     */
    createExploderMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff3300,
            emissiveIntensity: 2.0,
            roughness: 0.5,
            metalness: 0.3
        });
    }

    /**
     * Create toxic material with slimy clearcoat
     */
    createToxicMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x44aa00,
            emissive: 0x44aa00,
            emissiveIntensity: 1.2,
            roughness: 0.2,
            metalness: 0.15
        });
    }

    /**
     * Create berserker material with rage glow
     */
    createBerserkerMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xff0066,
            emissive: 0xaa0044,
            emissiveIntensity: 1.0,
            roughness: 0.6,
            metalness: 0.3
        });
    }

    /**
     * Create acidic material for spitters
     */
    createAcidicMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x66aa00,
            emissive: 0x66aa00,
            emissiveIntensity: 1.1,
            roughness: 0.3,
            metalness: 0.4
        });
    }

    /**
     * Create ghost material for invisible zombies
     */
    createGhostMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x6666aa,
            emissive: 0x6666aa,
            emissiveIntensity: 0.8,
            roughness: 0.15,
            metalness: 0.15,
            transparent: true,
            opacity: 0.25
        });
    }

    /**
     * Create elite material with crimson warrior appearance
     */
    createEliteMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0x880000,
            emissiveIntensity: 0.8,
            roughness: 0.45,
            metalness: 0.7
        });
    }

    /**
     * Create boss material with ultimate PBR
     */
    createBossMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x8800ff,
            emissive: 0x440088,
            emissiveIntensity: 0.8,
            roughness: 0.4,
            metalness: 0.7
        });
    }

    /**
     * Deform mesh vertices for organic appearance
     */
    deformMesh(geometry, intensity) {
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            // Add random noise
            const noise = (Math.random() - 0.5) * intensity;
            positions.setX(i, x + noise);
            positions.setY(i, y + noise);
            positions.setZ(i, z + noise);
        }
        geometry.computeVertexNormals();
    }

    /**
     * Add glowing eyes to zombie
     */
    addZombieEyes(group, yPosition, color) {
        const eyeMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 2.0,
            roughness: 0.2,
            metalness: 0.3
        });

        const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);

        // Left eye
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, yPosition, 0.25);
        group.add(leftEye);

        // Right eye
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, yPosition, 0.25);
        group.add(rightEye);

        // Add glow lights
        const leftGlow = new THREE.PointLight(color, 0.5, 2);
        leftGlow.position.copy(leftEye.position);
        group.add(leftGlow);

        const rightGlow = new THREE.PointLight(color, 0.5, 2);
        rightGlow.position.copy(rightEye.position);
        group.add(rightGlow);
    }

    /**
     * Add arms to zombie
     */
    addZombieArms(group, material, yPosition, length = 0.8, radius = 0.1) {
        // Left arm
        const leftArm = new THREE.Mesh(
            new THREE.CapsuleGeometry(radius, length, 8, 12),
            material
        );
        leftArm.position.set(-0.5, yPosition, 0);
        leftArm.rotation.z = Math.PI / 6; // Angled down
        leftArm.castShadow = true;
        group.add(leftArm);

        // Right arm
        const rightArm = new THREE.Mesh(
            new THREE.CapsuleGeometry(radius, length, 8, 12),
            material
        );
        rightArm.position.set(0.5, yPosition, 0);
        rightArm.rotation.z = -Math.PI / 6; // Angled down
        rightArm.castShadow = true;
        group.add(rightArm);
    }

    /**
     * Add rim lighting for zombie visibility
     */
    addZombieRimLighting(group) {
        // Only add rim lights for special types
        const needsRimLight = ['elite', 'boss', 'invisible', 'berserker'].includes(this.type);

        if (needsRimLight) {
            const rimColor = this.type === 'invisible' ? 0x6666ff :
                            this.type === 'boss' ? 0x8800ff :
                            this.type === 'berserker' ? 0xff0066 :
                            0xff0000; // elite

            const rimLight = new THREE.PointLight(rimColor, 1.5, 4);
            rimLight.position.set(0, 1.5, -1);
            group.add(rimLight);
        }
    }

    /**
     * Add type-specific visual enhancements
     */
    addTypeSpecificVisuals(group) {
        // Tank: Add armor plates
        if (this.type === 'tank') {
            const plateMat = this.createArmoredMaterial(0.95);

            // Shoulder plates
            const plateGeo = new THREE.BoxGeometry(0.4, 0.3, 0.3);
            const leftPlate = new THREE.Mesh(plateGeo, plateMat);
            leftPlate.position.set(-0.6, 1.5, 0);
            leftPlate.castShadow = true;
            group.add(leftPlate);

            const rightPlate = new THREE.Mesh(plateGeo, plateMat);
            rightPlate.position.set(0.6, 1.5, 0);
            rightPlate.castShadow = true;
            group.add(rightPlate);
        }

        // Exploder: Add glowing core
        if (this.type === 'exploder') {
            const coreGeo = new THREE.SphereGeometry(0.3, 12, 12);
            const coreMat = new THREE.MeshStandardMaterial({
                color: 0xff6600,
                emissive: 0xff6600,
                emissiveIntensity: 3.0
            });
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.position.y = 1;
            group.add(core);
        }

        // Boss: Add crown/horns
        if (this.type === 'boss') {
            const hornGeo = new THREE.ConeGeometry(0.2, 0.8, 6);
            const hornMat = new THREE.MeshStandardMaterial({
                color: 0x440088,
                emissive: 0x440088,
                emissiveIntensity: 0.5,
                roughness: 0.3,
                metalness: 0.9
            });

            const leftHorn = new THREE.Mesh(hornGeo, hornMat);
            leftHorn.position.set(-0.3, 3.2, 0);
            leftHorn.rotation.z = 0.3;
            leftHorn.castShadow = true;
            group.add(leftHorn);

            const rightHorn = new THREE.Mesh(hornGeo, hornMat);
            rightHorn.position.set(0.3, 3.2, 0);
            rightHorn.rotation.z = -0.3;
            rightHorn.castShadow = true;
            group.add(rightHorn);
        }
    }

    createHealthBar() {
        // Background bar
        const bgGeometry = new THREE.PlaneGeometry(1, 0.1);
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
        this.healthBarBg.position.y = 3 * this.scale;
        this.mesh.add(this.healthBarBg);

        // Foreground bar (health)
        const fgGeometry = new THREE.PlaneGeometry(1, 0.1);
        const fgMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.healthBarFg = new THREE.Mesh(fgGeometry, fgMaterial);
        this.healthBarFg.position.z = 0.01; // Slightly in front
        this.healthBarBg.add(this.healthBarFg);
    }

    update(deltaTime, playerPosition) {
        if (!playerPosition) return;

        // Initialize movement timer if needed
        if (this.movementTimer === undefined) {
            this.movementTimer = 0;
            this.movementPhase = Math.random() * Math.PI * 2; // Random starting phase
        }
        this.movementTimer += deltaTime;

        // Calculate base direction to player
        const dx = playerPosition.x - this.position.x;
        const dz = playerPosition.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Normalize direction
        let dirX = 0, dirZ = 0;
        if (distance > 0) {
            dirX = dx / distance;
            dirZ = dz / distance;
        }

        // Apply unique movement patterns based on enemy type
        let currentSpeed = this.speed;

        switch (this.type) {
            case 'fast': // Zigzag runner - serpentine movement
                const zigzagAngle = Math.sin(this.movementTimer * 8) * 0.5;
                const perpX = -dirZ; // Perpendicular to player direction
                const perpZ = dirX;
                dirX += perpX * zigzagAngle;
                dirZ += perpZ * zigzagAngle;
                // Normalize again
                const zigMag = Math.sqrt(dirX * dirX + dirZ * dirZ);
                if (zigMag > 0) {
                    dirX /= zigMag;
                    dirZ /= zigMag;
                }
                break;

            case 'tank': // Charge pattern - slow then sudden dash
                if (distance < 10 && Math.random() < 0.01) {
                    currentSpeed *= 3; // Sudden charge
                    this.bodyMesh.material.emissiveIntensity = 0.8;
                }
                break;

            case 'exploder': // Erratic bouncy movement
                const bounce = Math.abs(Math.sin(this.movementTimer * 6)) * 0.3;
                dirX += (Math.random() - 0.5) * bounce;
                dirZ += (Math.random() - 0.5) * bounce;
                break;

            case 'toxic': // Slow pulsing approach
                currentSpeed *= (0.8 + Math.sin(this.movementTimer * 3) * 0.4);
                this.bodyMesh.rotation.y += deltaTime * 2; // Spin
                break;

            case 'berserker': // Speed up when damaged + aggressive
                if (this.health < this.maxHealth * 0.5) {
                    currentSpeed *= 1.8;
                    this.bodyMesh.material.emissiveIntensity = 0.6;
                }
                break;

            case 'spitter': // Keep distance, circle player
                if (distance < 15) {
                    const circleX = -dirZ; // Circle around player
                    const circleZ = dirX;
                    dirX = circleX * 0.7 - dirX * 0.3; // Mix retreat and circle
                    dirZ = circleZ * 0.7 - dirZ * 0.3;
                }
                break;

            case 'invisible': // Blink/teleport movement (rapid repositioning)
                if (Math.random() < 0.005) {
                    // Teleport closer
                    const teleportDist = 5;
                    this.position.x += dirX * teleportDist;
                    this.position.z += dirZ * teleportDist;
                    this.game.particles.spawnHitSpark(this.position, 5);
                }
                this.bodyMesh.material.opacity = 0.2 + Math.sin(this.movementTimer * 5) * 0.3;
                break;

            case 'armored': // Steady, unstoppable march
                // No pattern - just slow and steady
                this.bodyMesh.rotation.y += deltaTime * 0.5;
                break;

            case 'elite': // Wave pattern - sine wave approach
                const waveOffset = Math.sin(this.movementTimer * 4 + this.movementPhase) * 2;
                dirX += -dirZ * waveOffset * 0.2;
                dirZ += dirX * waveOffset * 0.2;
                break;

            case 'boss': // Complex pattern - figure-eight movement
                const figure8 = Math.sin(this.movementTimer * 2) * Math.cos(this.movementTimer);
                dirX += -dirZ * figure8 * 0.3;
                dirZ += dirX * figure8 * 0.3;
                this.bodyMesh.rotation.y += deltaTime;
                break;
        }

        // Attack if in range
        const attackDistance = this.attackRange * this.scale;
        if (distance <= attackDistance) {
            this.attackCooldown -= deltaTime * 1000;
            if (this.attackCooldown <= 0) {
                this.attack();
                this.attackCooldown = this.attackRate;
            }
            this.velocity.set(0, 0, 0); // Stop moving when attacking
        } else {
            this.velocity.set(
                dirX * currentSpeed,
                0,
                dirZ * currentSpeed
            );
        }

        // Face player
        const angle = Math.atan2(dirX, dirZ);
        this.mesh.rotation.y = angle;

        // Update damage flash
        if (this.damageFlashTime > 0) {
            this.damageFlashTime -= deltaTime;
            if (this.damageFlashTime <= 0) {
                this.bodyMesh.material.emissive.setHex(this.emissive);
            }
        }

        // Make health bar face camera
        if (this.healthBarBg && this.game.camera) {
            this.healthBarBg.lookAt(this.game.camera.camera.position);
        }

        // Check obstacle collision before moving
        if (this.game.sceneManager && this.game.sceneManager.obstacleSystem) {
            const nextPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
            const zombieRadius = 0.8 * this.scale; // Zombie collision radius scales with size

            if (this.game.sceneManager.obstacleSystem.checkCollision(nextPosition, zombieRadius)) {
                // Collision detected - zombies don't slide, they just stop at obstacles
                // This makes them path around obstacles naturally
                this.velocity.set(0, 0, 0);
            }
        }

        super.update(deltaTime);
    }

    attack() {
        // Deal damage to player with unique abilities per type
        if (this.game.entities.player) {
            // Use 2D distance
            const dx = this.position.x - this.game.entities.player.position.x;
            const dz = this.position.z - this.game.entities.player.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const attackDistance = this.attackRange * this.scale;

            // Spitter: Ranged projectile attack
            if (this.type === 'spitter' && dist <= 20) {
                this.spawnProjectile();
                console.log(`💧 Spitter fired projectile at player`);
                return;
            }

            // Tank: Area slam attack
            if (this.type === 'tank' && dist <= attackDistance + 2) {
                this.game.entities.player.takeDamage(this.damage * 1.5);
                this.game.screenShake(2, 0.3);
                this.game.particles.spawnDeathExplosion(this.position, 2);
                console.log(`💥 Tank slammed for ${this.damage * 1.5} damage`);
                return;
            }

            // Toxic: Damage + poison effect
            if (this.type === 'toxic' && dist <= attackDistance) {
                this.game.entities.player.takeDamage(this.damage);
                this.applyPoison();
                console.log(`☠️ Toxic applied poison damage`);
                return;
            }

            // Berserker: Multi-hit attack when enraged
            if (this.type === 'berserker' && dist <= attackDistance) {
                const hits = this.health < this.maxHealth * 0.5 ? 2 : 1;
                for (let i = 0; i < hits; i++) {
                    setTimeout(() => {
                        if (this.alive && this.game.entities.player) {
                            this.game.entities.player.takeDamage(this.damage);
                        }
                    }, i * 200);
                }
                console.log(`⚔️ Berserker attacked ${hits} times`);
                return;
            }

            // Elite: Critical strike chance
            if (this.type === 'elite' && dist <= attackDistance) {
                const isCrit = Math.random() < 0.3;
                const damage = isCrit ? this.damage * 2 : this.damage;
                this.game.entities.player.takeDamage(damage);
                if (isCrit) {
                    this.game.particles.spawnHitSpark(this.game.entities.player.position, 20);
                }
                console.log(`💎 Elite ${isCrit ? 'CRIT' : 'hit'} for ${damage} damage`);
                return;
            }

            // Boss: Special devastating attack
            if (this.type === 'boss' && dist <= attackDistance + 3) {
                const specialAttack = Math.random() < 0.3;
                if (specialAttack) {
                    // Shockwave attack
                    this.game.entities.player.takeDamage(this.damage * 2);
                    this.game.screenShake(4, 0.6);
                    this.game.particles.spawnDeathExplosion(this.position, 4);
                    console.log(`👹 BOSS SHOCKWAVE for ${this.damage * 2} damage!`);
                } else {
                    this.game.entities.player.takeDamage(this.damage);
                    console.log(`👹 Boss attacked for ${this.damage} damage`);
                }
                return;
            }

            // Default melee attack for normal, fast, exploder, invisible, armored
            if (dist <= attackDistance) {
                this.game.entities.player.takeDamage(this.damage);
                console.log(`🧟 ${this.type} attacked player for ${this.damage} damage`);
            }
        }
    }

    spawnProjectile() {
        // Create acid projectile for spitter
        const direction = new THREE.Vector3(
            this.game.entities.player.position.x - this.position.x,
            0,
            this.game.entities.player.position.z - this.position.z
        ).normalize();

        const projectile = {
            position: this.position.clone(),
            velocity: direction.multiplyScalar(15),
            damage: this.damage,
            lifetime: 2,
            mesh: null
        };

        // Create visual projectile
        const geometry = new THREE.SphereGeometry(0.3, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.8
        });
        projectile.mesh = new THREE.Mesh(geometry, material);
        projectile.mesh.position.copy(this.position);
        projectile.mesh.position.y = 1;
        this.scene.add(projectile.mesh);

        // Store projectile for updates
        if (!this.game.enemyProjectiles) {
            this.game.enemyProjectiles = [];
        }
        this.game.enemyProjectiles.push(projectile);
    }

    applyPoison() {
        // Apply damage over time effect
        const player = this.game.entities.player;
        if (!player.poisonStacks) {
            player.poisonStacks = 0;
        }
        player.poisonStacks = Math.min(3, player.poisonStacks + 1);

        // Start poison damage if not already active
        if (!player.poisonInterval) {
            player.poisonInterval = setInterval(() => {
                if (player.poisonStacks > 0 && player.health > 0) {
                    player.takeDamage(5 * player.poisonStacks);
                    player.poisonStacks--;
                    this.game.particles.spawnHitSpark(player.position, 5);
                } else {
                    clearInterval(player.poisonInterval);
                    player.poisonInterval = null;
                }
            }, 1000);
        }
    }

    takeDamage(damage, isCritical = false) {
        // Armored: 50% damage reduction
        if (this.type === 'armored') {
            damage = Math.floor(damage * 0.5);
            this.game.particles.spawnHitSpark(this.position, 3); // Deflection sparks
        }

        // Boss: Armor damage reduction
        if (this.type === 'boss' && this.armor) {
            damage = Math.floor(damage * (1 - this.armor));
            this.game.particles.spawnHitSpark(this.position, 5); // Heavy armor deflection
        }

        this.health -= damage;

        // Audio feedback for hits
        if (this.game.audio) {
            this.game.audio.playHit(isCritical);
        }

        // Update boss health bar immediately if this is a boss
        if (this.type === 'boss' && this.game.currentBoss === this) {
            if (window.updateBossHealthBar) {
                window.updateBossHealthBar(this);
            }
        }

        // Damage flash effect - more intense for crits
        this.bodyMesh.material.emissive.setHex(isCritical ? 0xffff00 : 0xffffff);
        this.damageFlashTime = isCritical ? 0.2 : 0.1;

        // Show damage number
        const isBoss = this.type === 'boss';
        this.game.damageNumbers.spawnDamageNumber(this.position, damage, isCritical, isBoss);

        // Update health bar
        this.updateHealthBar();

        if (this.health <= 0) {
            this.die();
        }
    }

    updateHealthBar() {
        if (!this.healthBarFg) return;

        const healthPercent = Math.max(0, this.health / this.maxHealth);
        this.healthBarFg.scale.x = healthPercent;
        this.healthBarFg.position.x = (healthPercent - 1) * 0.5;

        // Color based on health
        if (healthPercent > 0.6) {
            this.healthBarFg.material.color.setHex(0x00ff00); // Green
        } else if (healthPercent > 0.3) {
            this.healthBarFg.material.color.setHex(0xffff00); // Yellow
        } else {
            this.healthBarFg.material.color.setHex(0xff0000); // Red
        }
    }

    die() {
        // Prevent double-death (infinite recursion with exploders)
        if (this.isDying) return;
        this.isDying = true;

        console.log(`☠️ Zombie died (${this.type})`);

        // Register kill for combo/streak tracking
        if (this.game.combat) {
            this.game.combat.registerKill();
        }

        // Exploder: Deals AoE damage on death!
        if (this.isExploder) {
            console.log('💥 EXPLODER ZOMBIE DETONATED!');
            this.game.particles.spawnDeathExplosion(this.position, this.scale * 2);
            this.game.screenShake(3, 0.5);

            // Explosion audio
            if (this.game.audio) {
                this.game.audio.playExplosion(1.5);
            }

            // Damage player if nearby
            const playerDist = this.position.distanceTo(this.game.entities.player.position);
            if (playerDist < 5) {
                this.game.entities.player.takeDamage(50);
            }

            // Damage other zombies (only if they're not already dying)
            for (const enemy of this.game.entities.enemies) {
                if (enemy === this || enemy.isDying) continue;
                const dist = this.position.distanceTo(enemy.position);
                if (dist < 5) {
                    enemy.takeDamage(100, false);
                }
            }
        }

        // Toxic: Leave lingering toxic cloud effect
        if (this.isToxic) {
            this.game.particles.spawnDeathExplosion(this.position, this.scale);
            // Green toxic cloud
            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    this.game.particles.spawnHitSpark(this.position, 10);
                }, i * 100);
            }
        }

        // Massive death explosion based on zombie type
        this.game.particles.spawnDeathExplosion(this.position, this.scale);

        // ENHANCED GORE EXPLOSION ⭐ (flesh chunks, blood splatters, mist)
        const goreIntensity = this.scale / 1.0; // Scale based on zombie size
        this.game.particles.spawnGoreExplosion(this.position, goreIntensity);

        // Increment kill counter
        this.game.kills++;
        this.game.events.emit('zombie-killed');

        // Award XP (with skill multipliers)
        const xpReward = this.game.difficulty.calculateXPReward(this.type, this.game.wave);
        this.game.addExperience(xpReward);
        this.game.score += xpReward;

        // Spawn gold pickup (new economy system)
        this.game.economy.spawnGoldFromEnemy(this);

        // Vampire healing
        if (this.game.skillSystem.hasVampire()) {
            this.game.entities.player.heal(5);
        }

        // Chance to spawn powerup
        const powerupChance = this.type === 'elite' ? 0.3 : this.type === 'boss' ? 1.0 : 0.1;
        if (Math.random() < powerupChance) {
            this.spawnPowerup();
        }

        // Screen shake for boss/elite death
        if (this.type === 'boss') {
            this.game.screenShake(5, 1);
        } else if (this.type === 'elite') {
            this.game.screenShake(2, 0.3);
        }

        this.destroy();
    }

    spawnPowerup() {
        const powerupTypes = [
            'health', 'speed', 'damage', 'firerate', 'shield',
            'weapon_shotgun', 'weapon_rifle', 'weapon_smg',
            'weapon_sniper', 'weapon_launcher', 'weapon_laser',
            'weapon_flamethrower', 'weapon_railgun', 'weapon_minigun',
            'weapon_crossbow', 'weapon_plasma'
        ];

        // Weight the powerup types (stat boosts more common, advanced weapons rarest)
        const weights = [
            4, 3, 3, 3, 2,      // health, speed, damage, firerate, shield
            2, 2, 2,             // shotgun, rifle, smg (common weapons)
            1, 1, 1,             // sniper, launcher, laser (rare weapons)
            1, 1, 1,             // flamethrower, railgun, minigun (rare weapons)
            1, 1                 // crossbow, plasma (rare weapons)
        ];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        let selectedType = powerupTypes[0];
        for (let i = 0; i < powerupTypes.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                selectedType = powerupTypes[i];
                break;
            }
        }

        const powerup = new Powerup(this.scene, this.position.clone(), selectedType, this.game);
        this.game.addPowerup(powerup);
    }

    createBloodSplatter() {
        // Create realistic blood splatter with natural spread pattern
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Transparent base
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 512, 512);

        // Main blood pool at center
        const centerX = 256;
        const centerY = 256;
        const mainPoolRadius = 60 + Math.random() * 40;

        const mainGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, mainPoolRadius);
        mainGradient.addColorStop(0, 'rgba(139, 0, 0, 0.9)');
        mainGradient.addColorStop(0.5, 'rgba(100, 0, 0, 0.75)');
        mainGradient.addColorStop(1, 'rgba(80, 0, 0, 0)');

        ctx.fillStyle = mainGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, mainPoolRadius, 0, Math.PI * 2);
        ctx.fill();

        // Realistic splatter pattern - blood spreads outward from impact
        const splatCount = 8 + Math.floor(Math.random() * 8);
        for (let i = 0; i < splatCount; i++) {
            // Random direction from center (360 degrees)
            const angle = (Math.random() * Math.PI * 2);
            // Distance from center (spreads outward naturally)
            const distance = 80 + Math.random() * 180;

            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            const radius = 15 + Math.random() * 35;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(139, 0, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(100, 0, 0, 0.6)');
            gradient.addColorStop(1, 'rgba(80, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Blood trails/drips radiating outward
        const dripCount = 12 + Math.floor(Math.random() * 8);
        for (let i = 0; i < dripCount; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const startDist = 40 + Math.random() * 60;
            const length = 30 + Math.random() * 50;

            const startX = centerX + Math.cos(angle) * startDist;
            const startY = centerY + Math.sin(angle) * startDist;
            const endX = centerX + Math.cos(angle) * (startDist + length);
            const endY = centerY + Math.sin(angle) * (startDist + length);

            ctx.strokeStyle = `rgba(100, 0, 0, ${0.5 + Math.random() * 0.4})`;
            ctx.lineWidth = 2 + Math.random() * 4;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        // Scattered droplets (high velocity impact)
        const dropletCount = 20 + Math.floor(Math.random() * 20);
        for (let i = 0; i < dropletCount; i++) {
            const angle = (Math.random() * Math.PI * 2);
            const distance = 100 + Math.random() * 200;

            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            const radius = 3 + Math.random() * 10;

            ctx.fillStyle = `rgba(120, 0, 0, ${0.5 + Math.random() * 0.4})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Create decal mesh
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Reasonable size - larger for bosses
        const sizeMultiplier = this.type === 'boss' ? 10 : 6;
        const geometry = new THREE.PlaneGeometry(
            sizeMultiplier * this.scale,
            sizeMultiplier * this.scale
        );

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            roughness: 0.9,
            metalness: 0.0
        });

        const decal = new THREE.Mesh(geometry, material);
        decal.rotation.x = -Math.PI / 2;
        decal.position.copy(this.position);
        decal.position.y = 0.01; // Slightly above ground to avoid z-fighting
        decal.rotation.z = Math.random() * Math.PI * 2; // Random rotation

        this.scene.add(decal);

        // Store reference for cleanup
        if (!this.game.bloodDecals) {
            this.game.bloodDecals = [];
        }
        this.game.bloodDecals.push(decal);

        // Limit total blood decals to 100 for performance
        if (this.game.bloodDecals.length > 100) {
            const oldDecal = this.game.bloodDecals.shift();
            this.scene.remove(oldDecal);
            oldDecal.geometry.dispose();
            oldDecal.material.map.dispose();
            oldDecal.material.dispose();
        }
    }
}