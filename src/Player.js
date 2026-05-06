import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_CONFIG } from './Config.js';

export class Player {
    constructor(scene, camera, level) {
        this.scene = scene;
        this.camera = camera;
        this.level = level;

        this.camera.position.y = GAME_CONFIG.PLAYER.height; // Set initial eye level
        
        // Movement state
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;

        // Equipment management
        this.equipment = new Map(); // Stores { 'LEFT_ARM': ArmObject, ... }
        this.armGroup = new THREE.Group();
        this.camera.add(this.armGroup);
        this.scene.add(this.camera);

        this.currentArmModel = null;
        this.bobTimer = 0;

        this.controls = new PointerLockControls(this.camera, document.body);
        this.loader = new GLTFLoader();
    }

    // Handle input updates
    setMoveState(key, state) {
        switch (key) {
            case 'KeyW': this.moveForward = state; break;
            case 'KeyA': this.moveLeft = state; break;
            case 'KeyS': this.moveBackward = state; break;
            case 'KeyD': this.moveRight = state; break;
        }
    }

    // The core function to swap gear
    equip(slot, item) {
        this.equipment.set(slot, item);

        if (slot === 'LEFT_ARM' || slot === 'RIGHT_ARM') {
            this.loadArmModel(item.modelPath);
        }
        console.log(`Equipped ${item.name} to ${slot}`);
    }

    loadArmModel(path) {
        this.loader.load(path, (gltf) => {
            const model = gltf.scene;
            
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.x += (model.position.x - center.x);
            model.position.y += (model.position.y - center.y);
            model.position.z += (model.position.z - center.z);

            // Apply Configs
            model.scale.set(GAME_CONFIG.ARM.scale, GAME_CONFIG.ARM.scale, GAME_CONFIG.ARM.scale);
            model.position.set(GAME_CONFIG.ARM.basePos.x, GAME_CONFIG.ARM.basePos.y, GAME_CONFIG.ARM.basePos.z);
            model.rotation.set(GAME_CONFIG.ARM.rotation.x, GAME_CONFIG.ARM.rotation.y, GAME_CONFIG.ARM.rotation.z);

            // Swap model in view
            if (this.currentArmModel) this.armGroup.remove(this.currentArmModel);
            this.currentArmModel = model;
            this.armGroup.add(this.currentArmModel);
        });
    }

    update(delta) {
        if (!this.controls.isLocked) return;

        // 1. Process Movement
        this.velocity.x -= this.velocity.x * GAME_CONFIG.PLAYER.friction * delta;
        this.velocity.z -= this.velocity.z * GAME_CONFIG.PLAYER.friction * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * GAME_CONFIG.PLAYER.moveSpeed * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * GAME_CONFIG.PLAYER.moveSpeed * delta;

        // --- COLLISION DETECTION (AABB) ---
        
        // We check X and Z movement separately so you can "slide" along walls
        
        // Check X movement
        const nextX = -this.velocity.x * delta;
        this.controls.moveRight(nextX);
        if (this.checkCollision()) {
            this.controls.moveRight(-nextX); // Undo movement if hit wall
        }

        // Check Z movement
        const nextZ = -this.velocity.z * delta;
        this.controls.moveForward(nextZ);
        if (this.checkCollision()) {
            this.controls.moveForward(-nextZ); // Undo movement if hit wall
        }

        // 2. Process Arm Bobbing
        if (this.currentArmModel) {
            if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
                this.bobTimer += delta * GAME_CONFIG.ARM.bobSpeed;
                const bobY = Math.sin(this.bobTimer) * GAME_CONFIG.ARM.bobAmountY;
                const bobX = Math.cos(this.bobTimer * 0.5) * GAME_CONFIG.ARM.bobAmountX;
                this.currentArmModel.position.y = GAME_CONFIG.ARM.basePos.y + bobY;
                this.currentArmModel.position.x = GAME_CONFIG.ARM.basePos.x + bobX;
            } else {
                this.bobTimer = 0;
                this.currentArmModel.position.y = THREE.MathUtils.lerp(this.currentArmModel.position.y, GAME_CONFIG.ARM.basePos.y, 0.1);
                this.currentArmModel.position.x = THREE.MathUtils.lerp(this.currentArmModel.position.x, GAME_CONFIG.ARM.basePos.x, 0.1);
            }
        }
    }

    checkCollision() {
        // 1. Create a bounding box for the player
        // The player is represented as a small box (0.4m wide, 2m tall)
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            this.camera.position, 
            new THREE.Vector3(0.4, 2, 0.4)
        );

        // 2. Check if this box intersects with any wall in the level
        for (let wall of this.level.walls) {
            if (playerBox.intersectsBox(wall.userData.boundingBox)) {
                return true; // Collision detected!
            }
        }
        return false; // No collision
    }
}