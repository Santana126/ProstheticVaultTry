import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_CONFIG } from './Config.js';
import { InputManager } from './InputManager.js';
import { InventoryManager } from './InventoryManager.js';

export class Player {
    constructor(scene, camera, physicsManager, vfxManager) {
        this.scene = scene;
        this.camera = camera;
        // this.level = level;
        this.physicsManager = physicsManager;
        this.vfxManager = vfxManager;
        this.isAttacking = false;
        this.fireCooldown = 0;

        this.camera.position.y = GAME_CONFIG.PLAYER.height; // Set initial eye level
        
        // Movement state
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();



        // this.moveForward = false;
        // this.moveBackward = false;
        // this.moveLeft = false;
        // this.moveRight = false;

        // // Equipment management
        // this.equipment = new Map(); // Stores { 'LEFT_ARM': ArmObject, ... }
        // this.armGroup = new THREE.Group();
        // this.camera.add(this.armGroup);
        // this.scene.add(this.camera);

        // this.currentArmModel = null;
        // this.bobTimer = 0;

        // this.controls = new PointerLockControls(this.camera, document.body);
        // this.loader = new GLTFLoader();
        // this.raycaster = new THREE.Raycaster();

        // this.initInput();

        this.controls = new PointerLockControls(this.camera, document.body);
        this.input = new InputManager();
        this.inventory = new InventoryManager(this.camera, this.scene);


    }

    initInput() {
        // Handle movement keys
        document.addEventListener('keydown', (e) => this.setMoveState(e.code, true));
        document.addEventListener('keyup', (e) => this.setMoveState(e.code, false));

        // NEW: Handle Attack hold with left mouse button
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.isAttacking = true;
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.isAttacking = false;
        })
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
    
    
    loadArmModel(item) { // Change 'path' to 'item'
        const path = item.modelPath;
        
        this.loader.load(path, (gltf) => {
            const model = gltf.scene;
            if (GAME_CONFIG.DEBUG.showModelBounds) {
                model.traverse((node) => {
                    // This will print the name and type (Mesh, Bone, Object3D, etc.) of every part
                    console.log("Found part:", node.name, "| Type:", node.type); 
                });
            }
            
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.x += (model.position.x - center.x);
            model.position.y += (model.position.y - center.y);
            model.position.z += (model.position.z - center.z);

            model.scale.set(GAME_CONFIG.ARM.scale, GAME_CONFIG.ARM.scale, GAME_CONFIG.ARM.scale);
            model.position.set(GAME_CONFIG.ARM.basePos.x, GAME_CONFIG.ARM.basePos.y, GAME_CONFIG.ARM.basePos.z);
            model.rotation.set(GAME_CONFIG.ARM.rotation.x, GAME_CONFIG.ARM.rotation.y, GAME_CONFIG.ARM.rotation.z);


            const hardcodedWristName = 'hand__02'; // Change this to the actual name of the wrist node in your 3D model
            // Try to find the node inside the 3D file
            const foundWristNode = model.getObjectByName(hardcodedWristName);

            if (foundWristNode) {
                if (GAME_CONFIG.DEBUG.showModelBounds) {
                    console.log(`Success: Found native wrist node '${hardcodedWristName}'!`);
                }
                this.muzzlePoint = foundWristNode;

                // --- DEBUG: ADD A RED BALL TO THE FOUND NODE ---
                // The geometry size is 2. Since your arm is scaled down by 0.1, 
                // the final visual size will be 0.2. Change the '2' if it's too big or small.
                const debugGeo = new THREE.SphereGeometry(256, 16, 16); 
                
                const debugMat = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000, 
                    depthTest: false, // This is the "X-ray" trick! It draws through the arm.
                    transparent: true,
                    opacity: 0.8
                });
                
                const debugSphere = new THREE.Mesh(debugGeo, debugMat);
                
                // Ensure it renders last so it overlaps the arm mesh
                debugSphere.renderOrder = 999; 
                
                // By adding it to the muzzlePoint, its local position (0,0,0) 
                // is perfectly locked to the exact center of the node!
                this.muzzlePoint.add(debugSphere);
                // -----------------------------------------------
            } else {
                console.warn(`Could not find '${hardcodedWristName}', falling back to manual offset.`);
                // Fallback: Our manual attachment from the previous step
                this.muzzlePoint = new THREE.Object3D();
                this.muzzlePoint.position.set(0, 0, -60); // Adjust as needed
                model.add(this.muzzlePoint); 
            }

            // --- NEW: COLOR OVERRIDE ---
            model.traverse((node) => {
                if (node.isMesh) {
                    if (item.id === 'plasma_arm') {
                        node.material = new THREE.MeshStandardMaterial({ 
                            color: 0x00ffff, 
                            emissive: 0x00ffff, 
                            emissiveIntensity: 1 
                        });
                    } else {
                        node.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                    }
                }
            });

            if (this.currentArmModel) this.armGroup.remove(this.currentArmModel);
            this.currentArmModel = model;
            this.armGroup.add(this.currentArmModel);
        });
        if (this.currentArmModel) {
            this.currentArmModel.traverse((node) => {
                if (node.isMesh) {
                    node.geometry.dispose(); // Delete geometry from RAM
                    node.material.dispose(); // Delete material from RAM
                }
            });
            this.armGroup.remove(this.currentArmModel);
        }
        
    }

    performAttack() {
        console.log("Attack performed!");
        if (!this.controls.isLocked) return;

        const equippedArm = this.equipment.get('RIGHT_ARM') || this.equipment.get('LEFT_ARM');
        if (!equippedArm) return;

        // --- NEW: GET THE EXACT WRIST POSITION ---
        let muzzlePosition = new THREE.Vector3();
        if (this.muzzlePoint) {
            // This calculates the exact world coordinates of our attached point!
            this.muzzlePoint.getWorldPosition(muzzlePosition);
        } else {
            muzzlePosition.copy(this.camera.position); // Fallback
        }
        // Execute the attack using the true wrist position
        equippedArm.attack(this.camera, muzzlePosition, this.scene, this.level.walls);
    }


    // Update the equip method to pass the whole item
    equip(slot, item) {
        this.equipment.set(slot, item);
        if (slot === 'LEFT_ARM' || slot === 'RIGHT_ARM') {
            this.loadArmModel(item); // Pass the item object, not just the path
        }
    }


    // update(delta) {
    //     if (!this.controls.isLocked) return;

    //     // 1. Process Movement
    //     this.velocity.x -= this.velocity.x * GAME_CONFIG.PLAYER.friction * delta;
    //     this.velocity.z -= this.velocity.z * GAME_CONFIG.PLAYER.friction * delta;

    //     this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    //     this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    //     this.direction.normalize();

    //     if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * GAME_CONFIG.PLAYER.moveSpeed * delta;
    //     if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * GAME_CONFIG.PLAYER.moveSpeed * delta;

    //     // --- COLLISION DETECTION (AABB) ---
        
    //     // We check X and Z movement separately so you can "slide" along walls
        
    //     // Check X movement
    //     const nextX = -this.velocity.x * delta;
    //     this.controls.moveRight(nextX);
    //     if (this.checkCollision()) {
    //         this.controls.moveRight(-nextX); // Undo movement if hit wall
    //     }

    //     // Check Z movement
    //     const nextZ = -this.velocity.z * delta;
    //     this.controls.moveForward(nextZ);
    //     if (this.checkCollision()) {
    //         this.controls.moveForward(-nextZ); // Undo movement if hit wall
    //     }

    //     // --- CONTINUOUS WEAPON FIRING LOGIC ---
    //     const equippedArm = this.equipment.get('RIGHT_ARM') || this.equipment.get('LEFT_ARM');
        
    //     // 1. Calculate the exact Muzzle/Wrist position continuously
    //     let muzzlePosition = new THREE.Vector3();
    //     if (this.muzzlePoint) {
    //         this.muzzlePoint.getWorldPosition(muzzlePosition);
    //     } else {
    //         muzzlePosition.copy(this.camera.position);
    //     }

    //     // 2. Fire or Stop based on mouse input
    //     if (equippedArm) {
    //         if (this.isAttacking) {
    //             // If holding left click, fire and animate the beam!
    //             equippedArm.fireContinuous(this.camera, muzzlePosition, this.scene, this.level.walls, delta);
                
    //             // Optional: You could trigger damage to the wall/enemy here 
    //             // using a timer so it damages them every 0.5 seconds while held.
    //         } else {
    //             // If mouse is released, instantly delete the beam
    //             equippedArm.stopFiring(this.scene);
    //         }
    //         if (typeof equippedArm.update === 'function') {
    //             equippedArm.update(delta);
    //         }
    //     }

    //     // 2. Process Arm Bobbing
    //     this.armBobbing(delta);
    // }


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
                    this.vfxManager
                );
            } else {
                equippedArm.stopFiring(this.scene);
            }
        }

        // Update visual weapon bobbing
        const isMoving = moveForward || moveBackward || moveLeft || moveRight;
        this.inventory.updateBobbing(isMoving, delta);
    }

    armBobbing(delta) {
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

    // checkCollision() {
    //     // 1. Define the Body Collider
    //     // Instead of centering on the camera, we create a box that:
    //     // - X: centered on camera
    //     // - Y: starts at 0 (floor) and goes up to camera.position.y
    //     // - Z: centered on camera, but slightly extended forward to account for the arm
        
    //     const playerHeight = this.camera.position.y;
    //     const playerWidth = 0.6; 
    //     const playerDepth = 1; // Increased from 0.4 to account for the arm's presence

    //     const playerBox = new THREE.Box3().setFromCenterAndSize(
    //         new THREE.Vector3(
    //             this.camera.position.x, 
    //             playerHeight / 2, // Center the box halfway between floor and eyes
    //             this.camera.position.z - 0.2 // Shift the box slightly forward
    //         ), 
    //         new THREE.Vector3(playerWidth, playerHeight, playerDepth)
    //     );

    //     // // 2. Check intersection with walls
    //     // for (let wall of this.level.walls) {
    //     //     if (playerBox.intersectsBox(wall.userData.boundingBox)) {
    //     //         return true; 
    //     //     }
    //     // }
    //     // return false;
    //     // We completely removed the `for` loop! Just ask the referee:
    //     return this.physicsManager.checkCollision(playerBox);

    // }

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