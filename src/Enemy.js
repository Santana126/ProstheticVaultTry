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
        
        // // Stats
        // this.maxHealth = this.isBoss ? 300 : 50; 
        // this.health = this.maxHealth;
        // this.isDead = false;
        
        // // BASE stats
        // const baseSpeed = this.isBoss ? 2 : 4; 
        // const baseAttackRate = 1.5;

        // // RANDOMIZE speed and attack rate by +/- 20%
        // const speedFactor = 0.8 + (Math.random() * 0.4);
        // const attackFactor = 0.8 + (Math.random() * 0.4);

        // this.speed = baseSpeed * speedFactor; 
        // this.attackRate = baseAttackRate * attackFactor; 

        // this.attackRange = 3; 
        // this.damage = this.isBoss ? 20 : 10;

        //  STATS 
        //  chance for a standard enemy to become a Sprinter!
        this.isSprinter = !this.isBoss && (Math.random() < 0.40); 

        this.maxHealth = this.isBoss ? 1000 : (this.isSprinter ? 30 : 60); 
        this.health = this.maxHealth;
        this.isDead = false;
        
        // Base stats
        const baseSpeed = this.isBoss ? 8 : (this.isSprinter ? 20 : 10); 
        const baseAttackRate = 1.5;

        // Randomize speed and attack rate slightly so they don't sync up perfectly
        const speedFactor = 0.8 + (Math.random() * 0.4);
        const attackFactor = 0.8 + (Math.random() * 0.4);

        this.speed = baseSpeed * speedFactor; 
        this.runSpeed = this.speed * 2;
        this.attackRate = baseAttackRate * attackFactor; 

        this.attackRange = 3; 
        this.runRange = 20;
        this.damage = this.isBoss ? 20 : (this.isSprinter ? 5 : 10);
        // ---------------------------------

        this.attackCooldown = 0;
        this.attackRate = 1.5;
        this.damageDelay = 0.6; 
        this.currentSwingTimer = 0;
        this.isSwinging = false;

        // Boss Spell Mechanics
        this.spellCooldown = 3; // Casts the first spell after 3 seconds
        this.spellRate = 5;     // Casts a new spell every 5 seconds after that
        
        // The container for the 3D model and the hitbox
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, y, z);
        
        // 1. CREATE THE HITBOX (Invisible)
        const hitBoxGeometry = new THREE.CylinderGeometry(1, 1, 13, 16);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            wireframe: true, 
            visible: false // Keep this true for a moment so you can aim!
        });
        this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
        this.hitBox.position.y = 1.5;
        this.hitBox.userData = { isEnemy: true, entity: this };
        this.mesh.add(this.hitBox);
        
        // --- THE FIX: Tell the weapons this can be shot! ---
        this.physicsManager.addColliders([this.hitBox]); 
        
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
        const gltfLoader = new GLTFLoader();
        if (this.ktx2Loader) gltfLoader.setKTX2Loader(this.ktx2Loader);
        if (typeof MeshoptDecoder !== 'undefined') gltfLoader.setMeshoptDecoder(MeshoptDecoder);

        this.models = {};
        this.mixers = {};
        this.actions = {};
        
        // custom for boss and normal enemies
        const scaleSize = this.isBoss ? 15 : 1;

        if (this.isBoss) {
            // ==========================================
            // BOSS LOADING LOGIC (100% GLB)
            // ==========================================
            try {
                // 1. Load the Base Body (Walking)
                const walkGltf = await gltfLoader.loadAsync('assets/RomeoTheCircle/RomeoWalking.glb');
                const bossBase = walkGltf.scene;
                
                // --- SCALE 1: THE BODY ---
                // You found that 800 looks great!
                const bodyScale = 800; 
                bossBase.scale.set(bodyScale, bodyScale, bodyScale);
                bossBase.position.y = 0;
                
                bossBase.traverse((node) => {
                    if (node.isMesh || node.isSkinnedMesh) { 
                        node.castShadow = true;
                        node.receiveShadow = true;
                        node.frustumCulled = false; 
                    }
                });

                // 3. Load The GLB Circle
                const circleGltf = await gltfLoader.loadAsync('assets/RomeoTheCircle/TheCircle.glb');
                const circleModel = circleGltf.scene;
                
                // --- SCALE 2: THE CIRCLE ---
                // We want the final visual size to be roughly 5.
                // By doing the math here, the circle will always stay the same 
                // relative size even if you change the bodyScale later!
                const targetCircleSize = 5; 
                const circleScale = targetCircleSize / bodyScale; // 0.00625
                
                circleModel.scale.set(circleScale, circleScale, circleScale);
                
                // 4. Glue the Circle to the Back!
                const backBone = bossBase.getObjectByName('mixamorigSpine2') || bossBase.getObjectByName('mixamorigSpine');
                if (backBone) {
                    // Adjust these three numbers (X, Y, Z) to shift it!
                    circleModel.position.set(0, 0, -0.00055); 
                    
                    circleModel.rotation.set(0, 0, 0); 
                    backBone.add(circleModel);
                } else {
                    console.error("❌ Could not find backbone in the converted GLB.");
                }

                // 5. Setup the Animation Mixer
                this.models.walk = bossBase;
                this.mesh.add(this.models.walk);
                this.mixers.walk = new THREE.AnimationMixer(this.models.walk);

                // Add Walk Animation
                const walkClip = THREE.AnimationClip.findByName(walkGltf.animations, 'mixamo.com') || walkGltf.animations[0];
                if (walkClip) {
                    this.actions.walk = this.mixers.walk.clipAction(walkClip);
                    this.actions.walk.play();
                }

                // 6. Extract Punch Animation
                const attackGltf = await gltfLoader.loadAsync('assets/RomeoTheCircle/RomeoPunchingSkin.glb');
                const attackClip = THREE.AnimationClip.findByName(attackGltf.animations, 'mixamo.com') || attackGltf.animations[0];
                
                if (attackClip) {
                    // Notice we add the attack clip to the WALK mixer, so it plays on the same body!
                    this.actions.attack = this.mixers.walk.clipAction(attackClip);
                }

                // 7. Extract Run Animation
                const runGltf = await gltfLoader.loadAsync('assets/RomeoTheCircle/RomeoRunning.glb');
                const runClip = THREE.AnimationClip.findByName(runGltf.animations, 'mixamo.com') || runGltf.animations[0];
                
                if (runClip) {
                    // Add the run clip to the main WALK mixer, just like the attack!
                    this.actions.run = this.mixers.walk.clipAction(runClip);
                }
                

                this.currentState = 'walk';
                this.activeAction = this.actions.walk;
                console.log("✅ Boss (GLB) and Circle loaded successfully!");

            } catch (error) {
                console.error("❌ Failed to load Boss GLB assets:", error);
            }
        } else {
            // ==========================================
            // STANDARD ALIEN LOADING LOGIC (Unchanged)
            // ==========================================
            try {
                // --- 1. LOAD THE WALK ALIEN ---
                const walkGltf = await gltfLoader.loadAsync('assets/alien_walking.glb');
                
                this.models.walk = walkGltf.scene;
                this.models.walk.scale.set(scaleSize, scaleSize, scaleSize);
                this.models.walk.position.y = 0;
                
                this.models.walk.traverse((node) => {
                    if (node.isMesh) { 
                        node.castShadow = true;
                        node.raycast = function() {}; 
                        if (this.isSprinter) {
                            node.material = node.material.clone();
                            node.material.color.setHex(0xff3300); 
                        }
                    }
                });
                this.mesh.add(this.models.walk);

                this.mixers.walk = new THREE.AnimationMixer(this.models.walk);
                const walkClip = THREE.AnimationClip.findByName(walkGltf.animations, 'mixamo.com') || walkGltf.animations[0];
                if (walkClip) {
                    this.actions.walk = this.mixers.walk.clipAction(walkClip);
                    this.actions.walk.play();
                }

                // --- 2. LOAD THE ATTACK ALIEN ---
                const attackGltf = await gltfLoader.loadAsync('assets/alien_attack.glb');
                
                this.models.attack = attackGltf.scene;
                this.models.attack.scale.set(scaleSize, scaleSize, scaleSize);
                this.models.attack.position.y = 0;
                this.models.attack.visible = false; 
                
                this.models.attack.traverse((node) => {
                    if (node.isMesh) { 
                        node.castShadow = true;
                        node.raycast = function() {}; 
                        if (this.isSprinter) {
                            node.material = node.material.clone();
                            node.material.color.setHex(0xff3300); 
                        }
                    }
                });
                this.mesh.add(this.models.attack);

                this.mixers.attack = new THREE.AnimationMixer(this.models.attack);
                const attackClip = THREE.AnimationClip.findByName(attackGltf.animations, 'mixamo.com') || attackGltf.animations[0];
                if (attackClip) {
                    this.actions.attack = this.mixers.attack.clipAction(attackClip);
                    this.actions.attack.play(); 
                }

                this.currentState = 'walk';
                console.log("✅ Standard Alien animations loaded successfully!");

            } catch (error) {
                console.error("❌ Failed to load alien assets:", error);
            }
        }
    }




    
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
        // Broadcast Boss HP changes to the UI
        if (this.isBoss) {
            document.dispatchEvent(new CustomEvent('bossDamaged', { 
                detail: { hp: this.health, maxHp: this.maxHealth } 
            }));
        }

        if (this.health <= 0) {
            this.die();

        }
    }


    update(delta) {
        if (this.isDead) return;

        // 1. Tick the correct animation mixer
        if (this.isBoss) {
            // THE BOSS FIX: 
            // The Boss has ALL of his animations (walk, run, attack) on a single mixer.
            // Therefore, we just tick this mixer every single frame!
            if (this.mixers.walk) {
                this.mixers.walk.update(delta);
            }
        } else {
            // STANDARD ALIEN LOGIC:
            // Aliens still use two completely different models/mixers.
            if (this.currentState === 'walk' && this.mixers.walk) {
                this.mixers.walk.update(delta);
            } else if (this.currentState === 'attack' && this.mixers.attack) {
                this.mixers.attack.update(delta);
            }
        }

        // 2. Distance Math
        const dx = this.player.camera.position.x - this.mesh.position.x;
        const dz = this.player.camera.position.z - this.mesh.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const targetAngle = Math.atan2(dx, dz);
        this.mesh.rotation.y = targetAngle;

        // --- NEW: BOSS SPELL CASTING ---
        if (this.isBoss && distance > this.attackRange) {
            this.spellCooldown -= delta;
            if (this.spellCooldown <= 0) {
                this.spellCooldown = this.spellRate;
                console.log("Boss casts a spell!");
                
                const spellDir = new THREE.Vector3(dx, 0, dz).normalize();
                const spawnPos = this.mesh.position.clone();
                spawnPos.y += 2; // Shoot from the chest/head, not the feet!

                // Shout to the rest of the game to spawn a projectile!
                document.dispatchEvent(new CustomEvent('bossSpellCast', {
                    detail: { position: spawnPos, direction: spellDir, damage: 30 }
                }));
            }
        }

        // 3. THE STATE MACHINE (Swapping Animations & Movement)
        if (distance > this.runRange) {
            // TIER 1: VERY FAR AWAY -> RUN
            if (this.currentState !== 'run') {
                this.currentState = 'run';
                this.isSwinging = false;
                
                if (this.isBoss) {
                    // Blend smoothly into the run over 0.3 seconds
                    this.fadeToAction('run', 0.3); 
                } else {
                    // Standard Aliens don't have a run, so default to walk visuals
                    this.currentState = 'walk';
                    if (this.models.walk) this.models.walk.visible = true;
                    if (this.models.attack) this.models.attack.visible = false;
                }
            }
            
            // Move using the faster RUN SPEED
            const currentSpeed = this.isBoss ? this.runSpeed : this.speed;
            this.mesh.position.x += Math.sin(targetAngle) * currentSpeed * delta;
            this.mesh.position.z += Math.cos(targetAngle) * currentSpeed * delta;

        } else if (distance > this.attackRange) {
            // TIER 2: CLOSING IN -> WALK
            if (this.currentState !== 'walk') {
                this.currentState = 'walk';
                this.isSwinging = false;
                
                if (this.isBoss) {
                    // Blend smoothly back into the walk over 0.3 seconds
                    this.fadeToAction('walk', 0.3); 
                } else {
                    if (this.models.walk) this.models.walk.visible = true;
                    if (this.models.attack) this.models.attack.visible = false;
                }
            }
            
            // Move using the normal WALK SPEED
            this.mesh.position.x += Math.sin(targetAngle) * this.speed * delta;
            this.mesh.position.z += Math.cos(targetAngle) * this.speed * delta;

        } else {
            // TIER 3: WE ARE CLOSE -> ATTACK!
            if (this.currentState !== 'attack') {
                this.currentState = 'attack';
                
                if (this.isBoss) {
                    // Blend smoothly into the punch
                    this.fadeToAction('attack', 0.2); 
                } else {
                    if (this.models.walk) this.models.walk.visible = false;
                    if (this.models.attack) {
                        this.models.attack.visible = true;
                        if (this.actions.attack) this.actions.attack.reset().play();
                    }
                }
                
                // 1. START THE WIND-UP
                this.isSwinging = true;
                this.currentSwingTimer = this.damageDelay;
                this.attackCooldown = this.attackRate;
            }

            // --- TICK THE TIMERS ---

            // 2. Tick down the Main Cooldown (When can we swing again?)
            if (this.attackCooldown > 0) {
                this.attackCooldown -= delta;
            } else {
                // Cooldown is finished! Start another swing!
                this.isSwinging = true;
                this.currentSwingTimer = this.damageDelay;
                this.attackCooldown = this.attackRate;
                
                if (this.actions.attack) this.actions.attack.reset().play();
            }

            // 3. Tick down the Wind-Up (When does the hand actually hit?)
            if (this.isSwinging) {
                this.currentSwingTimer -= delta;
                
                if (this.currentSwingTimer <= 0) {
                    // BOOM! The hand connects.
                    
                    // Optional Pro-Tip: Check the distance one more time right here!
                    // If the player backed up during the wind-up, the attack misses!
                    if (distance <= this.attackRange) {
                        this.player.takeDamage(this.damage);
                        console.log("Alien Hand Connected!");
                    } else {
                        console.log("Player dodged the attack!");
                    }
                    
                    this.isSwinging = false; // The swing is complete, wait for the main cooldown.
                }
            }
        }
    }

    die() {
        this.isDead = true;
        console.log("Enemy eliminated!");

        // 1. Remove the entire enemy group from the visual scene
        this.scene.remove(this.mesh);
        
        // 2. Erase the hitbox from the Physics Manager so lasers stop hitting it!
        this.physicsManager.removeCollider(this.hitBox); 
        
        // 3. Clear the hitbox out of the computer's memory
        if (this.hitBox.geometry) this.hitBox.geometry.dispose();
        if (this.hitBox.material) this.hitBox.material.dispose();
    }

}
