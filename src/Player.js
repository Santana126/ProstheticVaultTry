import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GAME_CONFIG } from './Config.js';
import { InputManager } from './InputManager.js';
import { InventoryManager } from './InventoryManager.js';

export class Player {
    constructor(scene, camera, physicsManager, vfxManager, projectileManager, animationManager, interactionManager, ktx2Loader) {
        this.scene = scene;
        this.camera = camera;
        this.physicsManager = physicsManager;
        this.vfxManager = vfxManager;
        this.projectileManager = projectileManager;
        this.animationManager = animationManager;
        this.interactionManager = interactionManager;
        
        this.isAttacking = false;
        this.fireCooldown = 0;

        this.camera.position.y = GAME_CONFIG.PLAYER.height; 
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.controls = new PointerLockControls(this.camera, document.body);
        this.input = new InputManager();
        this.inventory = new InventoryManager(this.camera, this.scene, ktx2Loader);

        // PLAYER STATS
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.isDead = false;

        this.level = 1;
        this.exp = 0;
        this.maxExp = 100; 
        this.bolts = 0;

        // Base stats for shop upgrades
        this.baseStats = {
            speedMultiplier: 1.0, 
            damageBonus: 0,       
            maxHealthBonus: 0     
        };

        this.dashCooldownTimer = 0;
        this.dashActiveTimer = 0;

        // Screen Shake mechanics
        this.shakeTimer = 0;
        this.maxShakeDuration = 0.3; 
        this.baseShakeIntensity = 0.2; 
        this.currentShakeOffset = new THREE.Vector3(0, 0, 0); 

        // TORCH SETUP 
        this.torchLight = new THREE.SpotLight(0xffffff, 0); 
        this.torchLight.angle = Math.PI / 7; 
        this.torchLight.penumbra = 0.5; 
        this.torchLight.decay = 2; 
        this.torchLight.distance = 150; 
        this.torchLight.castShadow = true;
        this.torchLight.shadow.mapSize.width = 1024;
        this.torchLight.shadow.mapSize.height = 1024;

        this.scene.add(this.torchLight);
        this.scene.add(this.torchLight.target);

        this.isTorchOn = false;
        this.rKeyPressed = false;

        setTimeout(() => {
            if (this.interactionManager && this.interactionManager.uiManager) {
                this.interactionManager.uiManager.updateEconomy(this.level, this.exp, this.maxExp, this.bolts);
            }
        }, 100);
    }

    takeDamage(amount){
        if (this.isDead) return;

        this.health -= amount;

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
        document.dispatchEvent(new Event('playerDied'));
    }

    gainExp(amount) {
        this.exp += amount;

        if (this.exp >= this.maxExp) {
            this.exp -= this.maxExp;
            this.level++;
            this.maxExp = Math.floor(this.maxExp * 1.5); 
            this.maxHealth += 20; 
            this.health = this.maxHealth; 
            
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
        
        if (this.interactionManager && this.interactionManager.uiManager) {
            this.interactionManager.uiManager.updateEconomy(this.level, this.exp, this.maxExp, this.bolts);
        }
    }

    update(delta) {
        if (!this.controls.isLocked) return;
        this.interactionManager.update();

        if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= delta;
        if (this.dashActiveTimer > 0) this.dashActiveTimer -= delta;

        // Interaction
        if (this.input.isPressed('KeyF')) {
            if (!this.fKeyPressed) {
                this.interactionManager.tryInteract(this.inventory);
                this.fKeyPressed = true;
            }
        } else {
            this.fKeyPressed = false;
        }

        // Torch Toggle
        if (this.input.isPressed('KeyR')) {
            if (!this.rKeyPressed) {
                this.isTorchOn = !this.isTorchOn;
                this.rKeyPressed = true;
            }
        } else {
            this.rKeyPressed = false;
        }

        // Torch Positioning
        const leftArm = this.inventory.getEquippedItem('LEFT_ARM');
        const rightArm = this.inventory.getEquippedItem('RIGHT_ARM');
        
        let torchSlot = null;
        if (leftArm && leftArm.id === 'torch_arm') torchSlot = 'LEFT_ARM';
        else if (rightArm && rightArm.id === 'torch_arm') torchSlot = 'RIGHT_ARM';
        
        if (torchSlot && this.isTorchOn) {
            this.torchLight.intensity = 5000; 
            this.torchLight.distance = 300;
            
            let lightPos = new THREE.Vector3();
            const torchMuzzle = this.inventory.muzzles ? this.inventory.muzzles[torchSlot] : null;

            if (torchMuzzle) {
                torchMuzzle.getWorldPosition(lightPos);
            } else {
                lightPos.copy(this.camera.position);
            }
            
            let lookDirection = new THREE.Vector3();
            this.camera.getWorldDirection(lookDirection);

            this.torchLight.position.copy(lightPos);
            this.torchLight.target.position.copy(lightPos).addScaledVector(lookDirection, 10);
            this.torchLight.target.updateMatrixWorld(); 
        } else {
            this.torchLight.intensity = 0; 
        }

        // MOVEMENT 
        this.velocity.x -= this.velocity.x * GAME_CONFIG.PLAYER.friction * delta;
        this.velocity.z -= this.velocity.z * GAME_CONFIG.PLAYER.friction * delta;

        const moveForward = this.input.isPressed('KeyW');
        const moveBackward = this.input.isPressed('KeyS');
        const moveLeft = this.input.isPressed('KeyA');
        const moveRight = this.input.isPressed('KeyD');

        // Dash Mechanic
        if (this.input.isPressed('ShiftLeft') && this.dashCooldownTimer <= 0) {
            const equippedBelt = this.inventory.getEquippedItem ? this.inventory.getEquippedItem('BELT') : null;
            if (equippedBelt) {
                const dashForce = equippedBelt.stats.dashPower;
                if (moveForward || moveBackward || moveLeft || moveRight) {
                    this.velocity.x -= this.direction.x * dashForce;
                    this.velocity.z -= this.direction.z * dashForce;
                    this.dashCooldownTimer = equippedBelt.stats.cooldown;
                    this.dashActiveTimer = 0.3;
                }
            }
        }

        this.direction.z = Number(moveForward) - Number(moveBackward);
        this.direction.x = Number(moveRight) - Number(moveLeft);
        this.direction.normalize();

        const currentMoveSpeed = GAME_CONFIG.PLAYER.moveSpeed * this.baseStats.speedMultiplier;
        if (moveForward || moveBackward) this.velocity.z -= this.direction.z * currentMoveSpeed * delta;
        if (moveLeft || moveRight) this.velocity.x -= this.direction.x * currentMoveSpeed * delta;

        // COLLISION 
        const nextX = -this.velocity.x * delta;
        this.controls.moveRight(nextX);
        if (this.checkCollision()){
            this.controls.moveRight(-nextX);
            this.velocity.x = 0; 
        }

        const nextZ = -this.velocity.z * delta;
        this.controls.moveForward(nextZ);
        if (this.checkCollision()) {
            this.controls.moveForward(-nextZ);
            this.velocity.z = 0;
        }

        // WEAPON LOGIC 
        const equippedArm = this.inventory.getActiveArm();
        let muzzlePosition = new THREE.Vector3();
        
        if (equippedArm && this.inventory.muzzles && this.inventory.muzzles[equippedArm.slot]) {
            this.inventory.muzzles[equippedArm.slot].getWorldPosition(muzzlePosition);
        } else {
            muzzlePosition.copy(this.camera.position);
            muzzlePosition.x += 0.5; 
            muzzlePosition.y -= 0.5;
        }   

        if (equippedArm) {
            if (this.input.isAttacking) {
                equippedArm.attack({
                    camera: this.camera,
                    muzzlePosition: muzzlePosition,
                    scene: this.scene,
                    physicsManager: this.physicsManager,
                    delta: delta,
                    vfxManager: this.vfxManager,
                    projectileManager: this.projectileManager,
                    bonusDmg: this.baseStats.damageBonus 
                });
            } else {
                equippedArm.stopAttack(this.scene);
            }
            if (typeof equippedArm.update === 'function') {
                equippedArm.update(delta);
            }
        }

        // Weapon Bobbing
        const isMoving = moveForward || moveBackward || moveLeft || moveRight;
        if (this.inventory.armGroup) {
            const groupBasePosition = new THREE.Vector3(0, 0, 0);
            this.animationManager.updateWeaponBobbing(
                this.inventory.armGroup, 
                groupBasePosition, 
                isMoving, 
                delta
            );
        }

        // SCREEN SHAKE 
        this.camera.position.sub(this.currentShakeOffset);

        if (this.shakeTimer > 0) {
            this.shakeTimer -= delta;

            const fadeMultiplier = Math.max(0, this.shakeTimer / this.maxShakeDuration);
            const intensity = this.baseShakeIntensity * fadeMultiplier;
            const time = performance.now() * 0.05; 
            
            const offsetX = Math.sin(time) * intensity;
            const offsetZ = Math.cos(time * 1.2) * intensity; 

            this.currentShakeOffset.set(offsetX, 0, offsetZ);
            this.camera.position.add(this.currentShakeOffset);
        } else {
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
        return this.physicsManager.checkCollision(playerBox, isDashing);
    }
}