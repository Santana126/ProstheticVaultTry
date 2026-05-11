import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_CONFIG } from './Config.js';
import { InputManager } from './InputManager.js';
import { InventoryManager } from './InventoryManager.js';
import { AnimationManager } from './AnimationManager.js';

export class Player {
    constructor(scene, camera, physicsManager, vfxManager, projectileManager, animationManager) {
        this.scene = scene;
        this.camera = camera;
        this.physicsManager = physicsManager;
        this.vfxManager = vfxManager;
        this.projectileManager = projectileManager;
        this.animationManager = animationManager;
        this.isAttacking = false;
        this.fireCooldown = 0;

        this.camera.position.y = GAME_CONFIG.PLAYER.height; // Set initial eye level
        
        // Movement state
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.controls = new PointerLockControls(this.camera, document.body);
        this.input = new InputManager();
        this.inventory = new InventoryManager(this.camera, this.scene);

    }


    //Refactored update method
    update(delta) {
        if (!this.controls.isLocked) return;
        // --- 1. MOVEMENT ---
        this.velocity.x -= this.velocity.x * GAME_CONFIG.PLAYER.friction * delta;
        this.velocity.z -= this.velocity.z * GAME_CONFIG.PLAYER.friction * delta;

        // Ask InputManager for the keys!
        const moveForward = this.input.isPressed('KeyW');
        const moveBackward = this.input.isPressed('KeyS');
        const moveLeft = this.input.isPressed('KeyA');
        const moveRight = this.input.isPressed('KeyD');

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
                // FIXED: Pass the physicsManager directly!
                equippedArm.fireContinuous(
                    this.camera, 
                    muzzlePosition, 
                    this.scene, 
                    this.physicsManager, // <-- Replaced this.level.walls
                    delta, 
                    this.vfxManager,
                    this.projectileManager
                );
            } else {
                equippedArm.stopFiring(this.scene);
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
    }

    checkCollision() {
        const playerHeight = this.camera.position.y;
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(this.camera.position.x, playerHeight / 2, this.camera.position.z - 0.2), 
            new THREE.Vector3(0.6, playerHeight, 1.0)
        );

        // We completely removed the `for` loop! Just ask the referee:
        return this.physicsManager.checkCollision(playerBox);
    }
}