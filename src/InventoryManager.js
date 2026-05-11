import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_CONFIG } from './Config.js';

export class InventoryManager {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.loader = new GLTFLoader();

        // State
        this.equipment = new Map();
        
        // 3D Groups
        this.armGroup = new THREE.Group();
        this.camera.add(this.armGroup);
        this.scene.add(this.camera);

        this.currentArmModel = null;
        this.muzzlePoint = null;
    }

    equip(slot, item) {
        this.equipment.set(slot, item);
        if (slot === 'LEFT_ARM' || slot === 'RIGHT_ARM') {
            this.loadArmModel(item); 
        }
    }

    getActiveArm() {
        return this.equipment.get('RIGHT_ARM') || this.equipment.get('LEFT_ARM');
    }

    getActiveArmModel() {
        return this.currentArmModel;
    }

    loadArmModel(item) { 
        this.loader.load(item.modelPath, (gltf) => {
            if (GAME_CONFIG.DEBUG.showModelBounds) {
                gltf.scene.traverse((node) => {
                    console.log("Found part:", node.name, "| Type:", node.type);
                });
            }
            const model = gltf.scene;
            
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.sub(center);
            

            const vData = item.visualData;
            if (vData) {
                model.scale.set(vData.scale, vData.scale, vData.scale);
                model.position.set(vData.position.x, vData.position.y, vData.position.z);
                model.rotation.set(vData.rotation.x, vData.rotation.y, vData.rotation.z);
            }

            // model.scale.set(GAME_CONFIG.ARM.scale, GAME_CONFIG.ARM.scale, GAME_CONFIG.ARM.scale);
            // model.position.set(GAME_CONFIG.ARM.basePos.x, GAME_CONFIG.ARM.basePos.y, GAME_CONFIG.ARM.basePos.z);
            // model.rotation.set(GAME_CONFIG.ARM.rotation.x, GAME_CONFIG.ARM.rotation.y, GAME_CONFIG.ARM.rotation.z);

            // Find Muzzle
            // const hardcodedWristName = 'hand__02'; 
            // const hardcodedWristName = 'mesh_0';
            // const foundWristNode = model.getObjectByName(hardcodedWristName);

            const targetNodeName = vData ? vData.muzzleNode : null;
            const foundWristNode = targetNodeName ? model.getObjectByName(targetNodeName) : null;

            if (foundWristNode) {
                this.muzzlePoint = foundWristNode;
            } else {
                // Use the custom fallback offset if the bone is missing!
                this.muzzlePoint = new THREE.Object3D();
                if (vData && vData.muzzleFallbackOffset) {
                    this.muzzlePoint.position.set(
                        vData.muzzleFallbackOffset.x, 
                        vData.muzzleFallbackOffset.y, 
                        vData.muzzleFallbackOffset.z
                    );
                } else {
                    this.muzzlePoint.position.set(0, 0, -10); // Ultimate fallback
                }
                model.add(this.muzzlePoint);
            }

            // --- NATIVE MATERIAL HANDLING ---
            model.traverse((node) => {
                if (node.isMesh) {
                    // GLTFLoader automatically loads the materials from your 3D software!
                    // We only intervene if the mesh somehow has NO material attached to it.
                    if (!node.material) {
                        node.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                    }
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            if (this.currentArmModel) this.armGroup.remove(this.currentArmModel);
            this.currentArmModel = model;
            this.armGroup.add(this.currentArmModel);
        });
    }

    // // Handles the weapon bobbing animation while walking
    // updateBobbing(isMoving, delta, vData) {
    //     if (!this.currentArmModel) return;

    //     if (isMoving) {
    //         this.bobTimer = (this.bobTimer || 0) + delta * GAME_CONFIG.PLAYER.bobSpeed;
    //         this.currentArmModel.position.y = GAME_CONFIG.ARM.basePos.y + Math.sin(this.bobTimer) * GAME_CONFIG.ARM.bobAmountY;
    //         this.currentArmModel.position.x = GAME_CONFIG.ARM.basePos.x + Math.cos(this.bobTimer * 0.5) * GAME_CONFIG.ARM.bobAmountX;
    //     } else {
    //         this.bobTimer = 0;
    //         this.currentArmModel.position.y = THREE.MathUtils.lerp(this.currentArmModel.position.y, GAME_CONFIG.ARM.basePos.y, 0.1);
    //         this.currentArmModel.position.x = THREE.MathUtils.lerp(this.currentArmModel.position.x, GAME_CONFIG.ARM.basePos.x, 0.1);
    //     }
    // }
}