import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_CONFIG } from './Config.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class InventoryManager {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.loader.setMeshoptDecoder(MeshoptDecoder);
        // --- STATE ---
        this.equipment = new Map(); // What is currently worn
        
        // NEW: The player's actual backpack! We start them with just the steel arm.
        this.ownedItems = new Set(['steel_arm']); 
        
        // 3D Groups
        this.armGroup = new THREE.Group();
        this.camera.add(this.armGroup);
        this.scene.add(this.camera);

        this.currentArmModel = null;
        this.muzzlePoint = null;
    }

    // --- PROGRESSION API ---

    // Called by the InteractionManager when you pick something off the floor!
    unlockItem(itemId) {
        if (!this.ownedItems.has(itemId)) {
            this.ownedItems.add(itemId);
            console.log(`Unlocked new item: ${itemId}`);
            
            // Tell the UI to redraw the stash!
            document.dispatchEvent(new CustomEvent('inventoryUpdated', {
                detail: { ownedItems: Array.from(this.ownedItems) }
            }));
        }
    }

    // Returns an array of IDs for the UI to read
    getOwnedItems() {
        console.log("Getting owned items:", this.ownedItems);
        return Array.from(this.ownedItems);
    }

    // --- EQUIPMENT API ---

    equip(slot, item) {
        // Security check: Make sure they actually own it before equipping!
        if (!this.ownedItems.has(item.id)) {
            console.warn(`Cannot equip ${item.id}, player does not own it!`);
            return;
        }

        this.equipment.set(slot, item);

        document.dispatchEvent(new CustomEvent('equipmentUpdated', {
            detail: { slot, itemId: item.id, item }
        }));
        
        // If it's an arm, load the 3D model.
        // Later, if slot === 'LEGS', you might update the player's movement speed instead!
        if (slot === 'LEFT_ARM' || slot === 'RIGHT_ARM') {
            this.loadArmModel(item); 
        }
    }

    getActiveArm() {
        return this.equipment.get('RIGHT_ARM') || this.equipment.get('LEFT_ARM');
    }

    getEquippedItem(slot){
        return this.equipment.get(slot);
    }

    getActiveArmModel() {
        return this.currentArmModel;
    }

    loadArmModel(item) { 
        this.loader.load(item.modelPath, (gltf) => {
            // if (GAME_CONFIG.DEBUG.showModelBounds) {
            //     gltf.scene.traverse((node) => {
            //         console.log("Found part:", node.name, "| Type:", node.type);
            //     });
            // }
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
}