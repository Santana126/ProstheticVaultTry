import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';


export class Enemy {
    constructor(scene, physicsManager, x, y, z, player, isBoss = false, ktx2Loader) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        this.player = player;
        this.isBoss = isBoss;
        this.ktx2Loader = ktx2Loader;
        
        // Stats
        this.health = this.isBoss ? 300 : 50; 
        this.isDead = false;
        this.speed = this.isBoss ? 2 : 4; 
        this.attackRange = 3; 
        this.damage = this.isBoss ? 20 : 10;
        
        // The container for the 3D model and the hitbox
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, y, z);
        
        // 1. CREATE THE HITBOX (Invisible)
        const hitBoxGeometry = new THREE.CylinderGeometry(1, 1, 3, 16);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            wireframe: true, 
            visible: false // Set to true if you need to debug the hitbox!
        });
        this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
        this.hitBox.position.y = 1.5;
        this.hitBox.userData = { isEnemy: true, entity: this };
        this.mesh.add(this.hitBox);
        
        this.scene.add(this.mesh);

        // --- NEW: ANIMATION VARIABLES ---
        this.mixer = null;
        this.actions = {};
        this.activeAction = null;
        this.currentState = 'idle'; // 'walk', 'attack', 'dead'

        // Load the 3D Model!
        this.loadModel();
    }

    async loadModel() {
        const loader = new GLTFLoader();
        
        // Keep your decoders if you are still using the compressed 1.4mb files!
        if (this.ktx2Loader) loader.setKTX2Loader(this.ktx2Loader);
        if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder);
        
        this.models = {};
        this.mixers = {};
        this.actions = {};

        const scaleSize = 1; 

        try {
            // --- 1. LOAD THE WALK ALIEN ---
            const walkGltf = await loader.loadAsync('assets/alien_walking.glb');
            
            this.models.walk = walkGltf.scene;
            this.models.walk.scale.set(scaleSize, scaleSize, scaleSize);
            this.models.walk.position.y = 0;
            
            this.models.walk.traverse((node) => {
                if (node.isMesh) { node.castShadow = true; node.raycast = function() {}; }
            });
            this.mesh.add(this.models.walk);

            this.mixers.walk = new THREE.AnimationMixer(this.models.walk);
            const walkClip = THREE.AnimationClip.findByName(walkGltf.animations, 'mixamo.com') || walkGltf.animations[0];
            if (walkClip) {
                this.actions.walk = this.mixers.walk.clipAction(walkClip);
                this.actions.walk.play();
            }

            // --- 2. LOAD THE ATTACK ALIEN ---
            const attackGltf = await loader.loadAsync('assets/alien_attack.glb');
            
            this.models.attack = attackGltf.scene;
            this.models.attack.scale.set(scaleSize, scaleSize, scaleSize);
            this.models.attack.position.y = 0;
            
            // CRITICAL: Hide the attack model immediately!
            this.models.attack.visible = false; 
            
            this.models.attack.traverse((node) => {
                if (node.isMesh) { node.castShadow = true; node.raycast = function() {}; }
            });
            this.mesh.add(this.models.attack);

            this.mixers.attack = new THREE.AnimationMixer(this.models.attack);
            const attackClip = THREE.AnimationClip.findByName(attackGltf.animations, 'mixamo.com') || attackGltf.animations[0];
            if (attackClip) {
                this.actions.attack = this.mixers.attack.clipAction(attackClip);
                this.actions.attack.play(); // Play it invisibly in the background
            }

            this.currentState = 'walk';
            console.log("✅ Both alien animations loaded successfully!");

        } catch (error) {
            console.error("❌ Failed to load alien assets:", error);
        }
    }

    // A helper function to smoothly transition between animations
    fadeToAction(name, duration) {
        const newAction = this.actions[name];
        if (!newAction || this.activeAction === newAction) return;

        if (this.activeAction) {
            this.activeAction.fadeOut(duration);
        }

        newAction.reset()
                 .setEffectiveTimeScale(1)
                 .setEffectiveWeight(1)
                 .fadeIn(duration)
                 .play();

        this.activeAction = newAction;
        this.currentState = name;
    }

    takeDamage(amount, hitPoint, normal, vfxManager) {
        
        
        this.health -= amount;
        console.log(`Enemy Health: ${this.health}`);
        if(vfxManager){
            vfxManager.spawnDamageNumber(this.mesh.position, amount);
        }

        if (this.health <= 0) {
            this.isDead = true;
            this.scene.remove(this.mesh);
        }
    }


    update(delta) {
        if (this.isDead) return;

        // 1. Tick the correct animation mixer
        if (this.currentState === 'walk' && this.mixers.walk) {
            this.mixers.walk.update(delta);
        } else if (this.currentState === 'attack' && this.mixers.attack) {
            this.mixers.attack.update(delta);
        }

        // 2. Distance Math
        const dx = this.player.camera.position.x - this.mesh.position.x;
        const dz = this.player.camera.position.z - this.mesh.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const targetAngle = Math.atan2(dx, dz);
        this.mesh.rotation.y = targetAngle;

        // 3. THE STATE MACHINE (Swapping Models)
        if (distance > this.attackRange) {
            // FAR AWAY: Walk
            if (this.currentState !== 'walk') {
                this.currentState = 'walk';
                // Toggle visibility safely
                if (this.models.walk) this.models.walk.visible = true;
                if (this.models.attack) this.models.attack.visible = false;
            }
            
            // Move the hitbox forward
            this.mesh.position.x += Math.sin(targetAngle) * this.speed * delta;
            this.mesh.position.z += Math.cos(targetAngle) * this.speed * delta;

        } else {
            // CLOSE UP: Attack!
            if (this.currentState !== 'attack') {
                this.currentState = 'attack';
                
                // Toggle visibility safely
                if (this.models.walk) this.models.walk.visible = false;
                if (this.models.attack) {
                    this.models.attack.visible = true;
                    // Reset the attack animation so it starts from frame 1 every time!
                    if (this.actions.attack) {
                        this.actions.attack.reset().play();
                    }
                }
                
                this.player.takeDamage(this.damage);
                console.log("Alien Attacked!");
            }
        }
    }

    die() {
        this.isDead = true;
        console.log("Enemy eliminated!");

        // Clean up the 3D model and remove its solid hitbox
        this.scene.remove(this.mesh);
        this.physicsManager.removeCollider(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }

}
