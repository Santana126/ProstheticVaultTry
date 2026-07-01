import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_CONFIG } from './Config.js';
import { InputManager } from './InputManager.js';
import { InventoryManager } from './InventoryManager.js';
import { AnimationManager } from './AnimationManager.js';
import { InteractionManager } from './InteractionManager.js';

export class Player {
    constructor(scene, camera, physicsManager, vfxManager, projectileManager, animationManager, interactionManager) {
        this.scene = scene;
        this.camera = camera;
        this.physicsManager = physicsManager;
        this.vfxManager = vfxManager;
        this.projectileManager = projectileManager;
        this.animationManager = animationManager;
        this.interactionManager = interactionManager;
        this.isAttacking = false;
        this.fireCooldown = 0;

        this.camera.position.y = GAME_CONFIG.PLAYER.height; // Set initial eye level
        
        // Movement state
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.controls = new PointerLockControls(this.camera, document.body);
        this.input = new InputManager();
        this.inventory = new InventoryManager(this.camera, this.scene);

        // --- PLAYER STATS ---
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.isDead = false;

        this.level = 1;
        this.exp = 0;
        this.maxExp = 100; 
        this.bolts = 0;


        this.dashCooldownTimer = 0;
        this.dashActiveTimer = 0;


        this.shakeTimer = 0;
        this.maxShakeDuration = 0.3; // How long the earthquake lasts
        this.baseShakeIntensity = 0.2; // How violently it shakes (in meters)
        this.currentShakeOffset = new THREE.Vector3(0, 0, 0); // Stores the math to prevent drift

        setTimeout(() => {
            if (this.interactionManager && this.interactionManager.uiManager) {
                this.interactionManager.uiManager.updateEconomy(this.level, this.exp, this.maxExp, this.bolts);
            }
        }, 100);
    }


    takeDamage(amount){
        if (this.isDead) return;

        this.health -= amount;
        console.log(`Player Health: ${this.health}`);

        // This routes through the interactionManager to reach your UIManager!
        if (this.interactionManager && this.interactionManager.uiManager) {
            this.interactionManager.uiManager.updateHealthBar(this.health, this.maxHealth);

            this.interactionManager.uiManager.showDamageVignette();
        }

        this.shakeTimer = this.maxShakeDuration;

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        console.log("Player has died!");
        
        // Announce death to the main game loop
        document.dispatchEvent(new Event('playerDied'));
    }

    gainExp(amount) {
        this.exp += amount;
        console.log(`Gained ${amount} EXP! Total: ${this.exp}/${this.maxExp}`);

        if (this.exp >= this.maxExp) {
            this.exp -= this.maxExp;
            this.level++;
            this.maxExp = Math.floor(this.maxExp * 1.5); 
            this.maxHealth += 20; 
            this.health = this.maxHealth; 
            
            // Update the health bar because our max health increased!
            if (this.interactionManager && this.interactionManager.uiManager) {
                this.interactionManager.uiManager.updateHealthBar(this.health, this.maxHealth);
            }
        }

        if (this.interactionManager && this.interactionManager.uiManager) {
            this.interactionManager.uiManager.updateEconomy(this.level, this.exp, this.maxExp, this.bolts);
        }
    }

    gainBolts(amount) {
        this.bolts += amount;
        console.log(`Picked up bolts! Total wealth: ${this.bolts}`);
        
        if (this.interactionManager && this.interactionManager.uiManager) {
            this.interactionManager.uiManager.updateEconomy(this.level, this.exp, this.maxExp, this.bolts);
        }
    }

    //Refactored update method
    update(delta) {
        if (!this.controls.isLocked) return;
        this.interactionManager.update();

        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= delta;
        }
        if (this.dashActiveTimer > 0) {
            this.dashActiveTimer -= delta;
        }

        if (this.input.isPressed('KeyF')) {
            if (!this.fKeyPressed) {
                this.interactionManager.tryInteract(this.inventory);
                this.fKeyPressed = true;
            }
        } else {
            this.fKeyPressed = false;
        }

        // --- 1. MOVEMENT ---
        this.velocity.x -= this.velocity.x * GAME_CONFIG.PLAYER.friction * delta;
        this.velocity.z -= this.velocity.z * GAME_CONFIG.PLAYER.friction * delta;

        // Ask InputManager for the keys!
        const moveForward = this.input.isPressed('KeyW');
        const moveBackward = this.input.isPressed('KeyS');
        const moveLeft = this.input.isPressed('KeyA');
        const moveRight = this.input.isPressed('KeyD');

        //  DASH MECHANIC
        // Assuming your InputManager tracks Shift as 'ShiftLeft'
        if (this.input.isPressed('ShiftLeft') && this.dashCooldownTimer <= 0) {
            console.log("Attempting to dash...");
            
            // Check if we actually own and have equipped a belt!
            // (Check your specific InventoryManager code for the exact method name you use to get an equipped item)
            const equippedBelt = this.inventory.getEquippedItem ? this.inventory.getEquippedItem('BELT') : null;
            
            if (equippedBelt) {
                const dashForce = equippedBelt.stats.dashPower;
                
                // Only dash if we are actively holding a direction key
                if (moveForward || moveBackward || moveLeft || moveRight) {
                    console.log("Dashing with power:", dashForce);
                    
                    // 2. THE FIX: Multiply the force by the pre-calculated direction!
                    this.velocity.x -= this.direction.x * dashForce;
                    this.velocity.z -= this.direction.z * dashForce;

                    // Put the dash on cooldown
                    this.dashCooldownTimer = equippedBelt.stats.cooldown;
                    this.dashActiveTimer = 0.3;
                    console.log("WHOOSH! Dodged!");
                }
            }
        }

        this.direction.z = Number(moveForward) - Number(moveBackward);
        this.direction.x = Number(moveRight) - Number(moveLeft);
        this.direction.normalize();

        if (moveForward || moveBackward) this.velocity.z -= this.direction.z * GAME_CONFIG.PLAYER.moveSpeed * delta;
        if (moveLeft || moveRight) this.velocity.x -= this.direction.x * GAME_CONFIG.PLAYER.moveSpeed * delta;

        // --- 2. COLLISION ---
        const nextX = -this.velocity.x * delta;
        this.controls.moveRight(nextX);
        if (this.checkCollision()) this.controls.moveRight(-nextX);

        const nextZ = -this.velocity.z * delta;
        this.controls.moveForward(nextZ);
        if (this.checkCollision()) this.controls.moveForward(-nextZ);

        // --- 3. WEAPON LOGIC ---
        const equippedArm = this.inventory.getActiveArm();
        
        let muzzlePosition = new THREE.Vector3();
        if (this.inventory.muzzlePoint) {
            this.inventory.muzzlePoint.getWorldPosition(muzzlePosition);
        } else if (this.inventory.currentArmModel) {
            this.inventory.currentArmModel.getWorldPosition(muzzlePosition);
        } else {
            muzzlePosition.copy(this.camera.position);
        }

        if (equippedArm) {
            if (this.input.isAttacking) {
                equippedArm.attack(this.camera, muzzlePosition, this.scene, this.physicsManager, delta, this.vfxManager, this.projectileManager);
            } else {
                equippedArm.stopAttack(this.scene);
            }
            if (typeof equippedArm.update === 'function') {
                equippedArm.update(delta);
            }
        }

        // Update visual weapon bobbing
        const isMoving = moveForward || moveBackward || moveLeft || moveRight;
        
        const activeModel = this.inventory.getActiveArmModel();
        const activeItem = this.inventory.getActiveArm();

        if (activeModel && activeItem && activeItem.visualData) {
            // Hand the model, its database position, and the movement state to the Animator!
            this.animationManager.updateWeaponBobbing(
                activeModel, 
                activeItem.visualData.position, 
                isMoving, 
                delta
            );
        }

        // --- 4. SCREEN SHAKE ---
        
        // 1. Always remove the previous frame's offset so the camera doesn't drift permanently!
        this.camera.position.sub(this.currentShakeOffset);

        if (this.shakeTimer > 0) {
            this.shakeTimer -= delta;

            // Fade out the shake smoothly as the timer runs out
            const fadeMultiplier = Math.max(0, this.shakeTimer / this.maxShakeDuration);
            const intensity = this.baseShakeIntensity * fadeMultiplier;

            // High-speed math for a violent jitter
            // We use performance.now() to drive the sine waves extremely fast
            const time = performance.now() * 0.05; 
            
            const offsetX = Math.sin(time) * intensity;
            // We multiply time by a weird decimal (1.2) for the Z axis so the shake feels chaotic, not perfectly circular
            const offsetZ = Math.cos(time * 1.2) * intensity; 

            this.currentShakeOffset.set(offsetX, 0, offsetZ);

            // 2. Apply the new shake offset for this frame
            this.camera.position.add(this.currentShakeOffset);
            
        } else {
            // Timer is 0, ensure the offset is perfectly zeroed out
            this.currentShakeOffset.set(0, 0, 0);
        }
    }

    checkCollision() {
        const playerHeight = this.camera.position.y;
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(this.camera.position.x, playerHeight / 2, this.camera.position.z - 0.2), 
            new THREE.Vector3(0.6, playerHeight, 1.0)
        );

        const isDashing = this.dashActiveTimer > 0;

        // We completely removed the `for` loop! Just ask the referee:
        return this.physicsManager.checkCollision(playerBox, isDashing);
    }
}