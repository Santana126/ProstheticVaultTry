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
        
        this.isSprinter = !this.isBoss && (Math.random() < 0.40); 

        this.maxHealth = this.isBoss ? 1000 : (this.isSprinter ? 30 : 60); 
        this.health = this.maxHealth;
        this.isDead = false;
        
        const baseSpeed = this.isBoss ? 8 : (this.isSprinter ? 20 : 10); 
        const baseAttackRate = 1.5;

        const speedFactor = 0.8 + (Math.random() * 0.4);
        const attackFactor = 0.8 + (Math.random() * 0.4);

        this.speed = baseSpeed * speedFactor; 
        this.runSpeed = this.speed * 2;
        this.attackRate = baseAttackRate * attackFactor; 

        this.attackRange = 3; 
        this.runRange = 20;
        this.damage = this.isBoss ? 20 : (this.isSprinter ? 5 : 10);

        this.attackCooldown = 0;
        this.damageDelay = 0.6; 
        this.currentSwingTimer = 0;
        this.isSwinging = false;
        this.hasDealtDamage = false;

        this.spellCooldown = 3; 
        this.spellRate = 5;     
        
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, y, z);
        
        const hitBoxGeometry = new THREE.CylinderGeometry(1, 1, 13, 16);
        const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            wireframe: true, 
            visible: false 
        });
        
        this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
        this.hitBox.position.y = 1.5;
        this.hitBox.userData = { isEnemy: true, entity: this };
        this.mesh.add(this.hitBox);
        
        this.physicsManager.addColliders([this.hitBox]); 
        this.scene.add(this.mesh);

        this.mixer = null;
        this.actions = {};
        this.activeAction = null;
        this.currentState = 'idle'; 

        this.bones = {};
        this.baseRotations = {}; 
        this.walkTime = 0;
        this.punchTimer = 0;

        this.loadModel();
    }

    async loadModel() {
        const gltfLoader = new GLTFLoader();
        if (this.ktx2Loader) gltfLoader.setKTX2Loader(this.ktx2Loader);
        if (typeof MeshoptDecoder !== 'undefined') gltfLoader.setMeshoptDecoder(MeshoptDecoder);

        this.models = {};
        this.mixers = {};
        this.actions = {};
        
        const scaleSize = this.isBoss ? 15 : 4;

        if (this.isBoss) {
            try {
                const walkGltf = await gltfLoader.loadAsync('assets/RomeoTheCircle/RomeoWalking.glb');
                const bossBase = walkGltf.scene;
                
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

                const circleGltf = await gltfLoader.loadAsync('assets/RomeoTheCircle/TheCircle.glb');
                const circleModel = circleGltf.scene;
                
                const targetCircleSize = 5; 
                const circleScale = targetCircleSize / bodyScale; 
                
                circleModel.scale.set(circleScale, circleScale, circleScale);
                
                const backBone = bossBase.getObjectByName('mixamorigSpine2') || bossBase.getObjectByName('mixamorigSpine');
                if (backBone) {
                    circleModel.position.set(0, 0, -0.00055); 
                    circleModel.rotation.set(0, 0, 0); 
                    backBone.add(circleModel);
                }

                this.models.walk = bossBase;
                this.mesh.add(this.models.walk);
                this.mixers.walk = new THREE.AnimationMixer(this.models.walk);

                const walkClip = THREE.AnimationClip.findByName(walkGltf.animations, 'mixamo.com') || walkGltf.animations[0];
                if (walkClip) {
                    this.actions.walk = this.mixers.walk.clipAction(walkClip);
                    this.actions.walk.play();
                }

                const attackGltf = await gltfLoader.loadAsync('assets/RomeoTheCircle/RomeoPunchingSkin.glb');
                const attackClip = THREE.AnimationClip.findByName(attackGltf.animations, 'mixamo.com') || attackGltf.animations[0];
                if (attackClip) this.actions.attack = this.mixers.walk.clipAction(attackClip);

                const runGltf = await gltfLoader.loadAsync('assets/RomeoTheCircle/RomeoRunning.glb');
                const runClip = THREE.AnimationClip.findByName(runGltf.animations, 'mixamo.com') || runGltf.animations[0];
                if (runClip) this.actions.run = this.mixers.walk.clipAction(runClip);

                this.currentState = 'walk';
                this.activeAction = this.actions.walk;

            } catch (error) {
                console.error("Failed to load Boss GLB assets:", error);
            }
        } else {
            try {
                const gltf = await gltfLoader.loadAsync('assets/EnemyBasic.glb');
                this.models.main = gltf.scene;
                this.models.main.scale.set(scaleSize, scaleSize, scaleSize);
                this.models.main.position.y = 0;
                
                this.models.main.traverse((node) => {
                    if (node.isMesh) { 
                        node.castShadow = true;
                        node.raycast = function() {}; 
                        if (this.isSprinter) {
                            node.material = node.material.clone();
                            node.material.color.setHex(0xff3300); 
                        }
                    }
                    if (node.isBone) {
                        this.bones[node.name] = node;
                        this.baseRotations[node.name] = node.rotation.clone();
                    }
                });
                
                this.mesh.add(this.models.main);
                this.currentState = 'walk';

            } catch (error) {
                console.error("Failed to load enemy basic asset:", error);
            }
        }
    }

    fadeToAction(name, duration) {
        if (!this.isBoss) return; 

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
        
        if (vfxManager) {
            vfxManager.spawnDamageNumber(this.mesh.position, amount);
        }
        
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

        if (this.isBoss && this.mixers.walk) {
            this.mixers.walk.update(delta);
        }

        const dx = this.player.camera.position.x - this.mesh.position.x;
        const dz = this.player.camera.position.z - this.mesh.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const targetAngle = Math.atan2(dx, dz);
        this.mesh.rotation.y = targetAngle;

        // Boss Spell Casting
        if (this.isBoss && distance > this.attackRange) {
            this.spellCooldown -= delta;
            if (this.spellCooldown <= 0) {
                this.spellCooldown = this.spellRate;
                
                const spellDir = new THREE.Vector3(dx, 0, dz).normalize();
                const spawnPos = this.mesh.position.clone();
                spawnPos.y += 2; 

                document.dispatchEvent(new CustomEvent('bossSpellCast', {
                    detail: { position: spawnPos, direction: spellDir, damage: 30 }
                }));
            }
        }

        if (distance > this.runRange) {
            if (this.currentState !== 'run') {
                this.currentState = 'run';
                this.isSwinging = false;
                if (this.isBoss) this.fadeToAction('run', 0.3); 
            }
            const currentSpeed = this.isBoss ? this.runSpeed : this.speed;
            this.mesh.position.x += Math.sin(targetAngle) * currentSpeed * delta;
            this.mesh.position.z += Math.cos(targetAngle) * currentSpeed * delta;

        } else if (distance > this.attackRange) {
            if (this.currentState !== 'walk') {
                this.currentState = 'walk';
                this.isSwinging = false;
                if (this.isBoss) this.fadeToAction('walk', 0.3); 
            }
            this.mesh.position.x += Math.sin(targetAngle) * this.speed * delta;
            this.mesh.position.z += Math.cos(targetAngle) * this.speed * delta;

        } else {
            if (this.currentState !== 'attack') {
                this.currentState = 'attack';
                if (this.isBoss) {
                    this.fadeToAction('attack', 0.2); 
                } else {
                    this.punchTimer = 0; 
                }
                
                this.isSwinging = true;
                this.hasDealtDamage = false;
                this.currentSwingTimer = this.damageDelay;
                this.attackCooldown = this.attackRate;
            }

            if (this.attackCooldown > 0) {
                this.attackCooldown -= delta;
            } else {
                this.isSwinging = true;
                this.hasDealtDamage = false;
                this.currentSwingTimer = this.damageDelay;
                this.attackCooldown = this.attackRate;
                
                if (this.isBoss && this.actions.attack) {
                    this.actions.attack.reset().play();
                } else if (!this.isBoss) {
                    this.punchTimer = 0; 
                }
            }

            if (this.isSwinging) {
                this.currentSwingTimer -= delta;
                if (this.currentSwingTimer <= 0.2 && !this.hasDealtDamage) {
                    if (distance <= this.attackRange) {
                        this.player.takeDamage(this.damage);
                    }
                    this.hasDealtDamage = true;
                }
                
                if (this.currentSwingTimer <= 0) {
                    this.isSwinging = false; 
                }
            }
        }

        if (!this.isBoss && this.bones['mixamorigRightUpLeg']) {
            
            for (const name in this.bones) {
                if (this.baseRotations[name]) {
                    this.bones[name].rotation.copy(this.baseRotations[name]);
                }
            }

            const dropZ = 0.30;
            const pushX = 1.30;
            const baseElbow = 0.70;

            const idleL_X = this.baseRotations['mixamorigLeftArm'].x + pushX;
            const idleR_X = this.baseRotations['mixamorigRightArm'].x + pushX;
            const idleL_Z = this.baseRotations['mixamorigLeftArm'].z + dropZ;
            const idleR_Z = this.baseRotations['mixamorigRightArm'].z - dropZ;
            const idleL_Elb = this.baseRotations['mixamorigLeftForeArm'].z + baseElbow;
            const idleR_Elb = this.baseRotations['mixamorigRightForeArm'].z - baseElbow;
            const idleR_Y = this.baseRotations['mixamorigRightArm'].y;

            this.bones['mixamorigLeftArm'].rotation.x = idleL_X;
            this.bones['mixamorigRightArm'].rotation.x = idleR_X;
            this.bones['mixamorigLeftArm'].rotation.z = idleL_Z;
            this.bones['mixamorigRightArm'].rotation.z = idleR_Z;
            this.bones['mixamorigLeftForeArm'].rotation.z = idleL_Elb;
            this.bones['mixamorigRightForeArm'].rotation.z = idleR_Elb;

            if (this.currentState === 'walk' || this.currentState === 'run') {
                this.walkTime += delta;
                
                const currentSpeed = this.currentState === 'run' ? this.runSpeed : this.speed;
                const animSpeed = currentSpeed * 1.2; 
                
                const leftHipSwing = Math.sin(this.walkTime * animSpeed);
                const rightHipSwing = Math.sin(this.walkTime * animSpeed + Math.PI);
                
                // Legs
                const walkAmplitude = 0.6; 
                this.bones['mixamorigLeftUpLeg'].rotation.x = this.baseRotations['mixamorigLeftUpLeg'].x + (leftHipSwing * walkAmplitude);
                this.bones['mixamorigRightUpLeg'].rotation.x = this.baseRotations['mixamorigRightUpLeg'].x + (rightHipSwing * walkAmplitude);
                this.bones['mixamorigLeftLeg'].rotation.x = this.baseRotations['mixamorigLeftLeg'].x - (Math.max(0, -leftHipSwing) * 1.2);
                this.bones['mixamorigRightLeg'].rotation.x = this.baseRotations['mixamorigRightLeg'].x - (Math.max(0, -rightHipSwing) * 1.2);
                
                // Shoulders
                const swingAmp = 0.50;
                this.bones['mixamorigLeftArm'].rotation.z += (rightHipSwing * swingAmp);
                this.bones['mixamorigRightArm'].rotation.z -= (leftHipSwing * swingAmp);

                // Elbow Flex
                const flexAmp = 0.50;
                this.bones['mixamorigLeftForeArm'].rotation.z += Math.max(0, rightHipSwing) * flexAmp;
                this.bones['mixamorigRightForeArm'].rotation.z -= Math.max(0, leftHipSwing) * flexAmp;

            } else if (this.currentState === 'attack' && this.isSwinging) {
                this.punchTimer += delta;
                const punchDuration = this.damageDelay; 
                let t = this.punchTimer / punchDuration; 
                if (t > 1.0) t = 1.0;

                const wuY = 1.30, wuZ = -1.00, wuElb = -0.40;
                const stY = -0.50, stZ = -0.70, stX = 0.00, stElb = 0.75;

                if (t < 0.3) {
                    const u = t / 0.3; 
                    this.bones['mixamorigRightArm'].rotation.y = idleR_Y + (wuY * u);
                    this.bones['mixamorigRightArm'].rotation.z = idleR_Z + (wuZ * u);
                    this.bones['mixamorigRightForeArm'].rotation.z = idleR_Elb + (wuElb * u);
                } else if (t < 0.5) {
                    const u = (t - 0.3) / 0.2; 
                    this.bones['mixamorigRightArm'].rotation.x = idleR_X + (stX * u);
                    this.bones['mixamorigRightArm'].rotation.y = idleR_Y + wuY + ((stY - wuY) * u);
                    this.bones['mixamorigRightArm'].rotation.z = idleR_Z + wuZ + ((stZ - wuZ) * u);
                    this.bones['mixamorigRightForeArm'].rotation.z = idleR_Elb + wuElb + ((stElb - wuElb) * u);
                } else if (t <= 1.0) {
                    const u = (t - 0.5) / 0.5; 
                    this.bones['mixamorigRightArm'].rotation.x = idleR_X + stX - (stX * u);
                    this.bones['mixamorigRightArm'].rotation.y = idleR_Y + stY - (stY * u);
                    this.bones['mixamorigRightArm'].rotation.z = idleR_Z + stZ - (stZ * u);
                    this.bones['mixamorigRightForeArm'].rotation.z = idleR_Elb + stElb - (stElb * u);
                }
            }
        }
    }

    die() {
        this.isDead = true;
        this.scene.remove(this.mesh);
        this.physicsManager.removeCollider(this.hitBox); 
        
        if (this.hitBox.geometry) this.hitBox.geometry.dispose();
        if (this.hitBox.material) this.hitBox.material.dispose();
    }
}