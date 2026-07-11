import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GAME_CONFIG } from './Config.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class InventoryManager {
    constructor(camera, scene, ktx2Loader) {
        this.camera = camera;
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.loader.setMeshoptDecoder(MeshoptDecoder);
        if (ktx2Loader) this.loader.setKTX2Loader(ktx2Loader);

        // --- STATE ---
        this.equipment = new Map(); // What is currently worn
        
        // NEW: The player's actual backpack! We start them with just the steel arm.
        this.ownedItems = new Set(['steel_arm']); 
        
        // 3D Groups
        this.armGroup = new THREE.Group();
        this.camera.add(this.armGroup);
        this.scene.add(this.camera);

        //now support dual-wielding!
        this.armModels = {}; 
        this.muzzles = {};
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
            this.loadArmModel(item, slot); // 👉 Pass the slot!
        }
    }

    getActiveArm() {
        return this.equipment.get('RIGHT_ARM') || this.equipment.get('LEFT_ARM');
    }

    getEquippedItem(slot){
        return this.equipment.get(slot);
    }

    getActiveArmModel() {
        // Prioritizes the right arm for weapon bobbing, falls back to left
        return this.armModels['RIGHT_ARM'] || this.armModels['LEFT_ARM'];
    }

    getmuzzlePoint() {
        // Same here, prioritizes the primary weapon's muzzle for shooting
        return this.muzzles['RIGHT_ARM'] || this.muzzles['LEFT_ARM'];
    }

    loadArmModel(item,slot) { 
        // this.loader.load(item.modelPath, (gltf) => {
        //     // if (GAME_CONFIG.DEBUG.showModelBounds) {
        //     //     gltf.scene.traverse((node) => {
        //     //         console.log("Found part:", node.name, "| Type:", node.type);
        //     //     });
        //     // }
        //     const model = gltf.scene;
            
        //     // Center the model
        //     const box = new THREE.Box3().setFromObject(model);
        //     const center = new THREE.Vector3();
        //     box.getCenter(center);
        //     model.position.sub(center);
            

        //     const vData = item.visualData;
        //     if (vData) {
        //         model.scale.set(vData.scale, vData.scale, vData.scale);
        //         model.position.set(vData.position.x, vData.position.y, vData.position.z);
        //         model.rotation.set(vData.rotation.x, vData.rotation.y, vData.rotation.z);
        //     }

        //     const targetNodeName = vData ? vData.muzzleNode : null;
        //     const foundWristNode = targetNodeName ? model.getObjectByName(targetNodeName) : null;

        //     if (foundWristNode) {
        //         this.muzzlePoint = foundWristNode;
        //     } else {
        //         // Use the custom fallback offset if the bone is missing!
        //         this.muzzlePoint = new THREE.Object3D();
        //         if (vData && vData.muzzleFallbackOffset) {
        //             this.muzzlePoint.position.set(
        //                 vData.muzzleFallbackOffset.x, 
        //                 vData.muzzleFallbackOffset.y, 
        //                 vData.muzzleFallbackOffset.z
        //             );
        //         } else {
        //             this.muzzlePoint.position.set(0, 0, -10); // Ultimate fallback
        //         }
        //         model.add(this.muzzlePoint);
        //     }

        //     // --- NATIVE MATERIAL HANDLING ---
        //     model.traverse((node) => {
        //         if (node.isMesh) {
        //             // GLTFLoader automatically loads the materials from your 3D software!
        //             // We only intervene if the mesh somehow has NO material attached to it.
        //             if (!node.material) {
        //                 node.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        //             }
        //             node.castShadow = true;
        //             node.receiveShadow = true;
        //         }
        //     });

        //     if (this.currentArmModel) this.armGroup.remove(this.currentArmModel);
        //     this.currentArmModel = model;
        //     this.armGroup.add(this.currentArmModel);
        // });
        console.log(`[DEBUG] 1. Attempting to load model from: ${item.modelPath}`);
        console.log(`[DEBUG] 2. Visual Data attached to item:`, item.visualData);

        this.loader.load(
            item.modelPath, 
            (gltf) => {
                console.log(`[DEBUG] 3. ✅ Model loaded successfully: ${item.name}`);
                const model = gltf.scene;
                
                // Measure the raw, unscaled size of the model!
                const initialBox = new THREE.Box3().setFromObject(model);
                const initialSize = new THREE.Vector3();
                initialBox.getSize(initialSize);
                console.log(`[DEBUG] 4. Raw model size (before scaling):`, initialSize);

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
                } else {
                    console.warn(`[DEBUG] ⚠️ No visualData found for this item! Using defaults.`);
                }

                // Measure the final size after your 1.5 scale is applied
                const finalBox = new THREE.Box3().setFromObject(model);
                const finalSize = new THREE.Vector3();
                finalBox.getSize(finalSize);
                console.log(`[DEBUG] 5. Final model size (after scaling):`, finalSize);
                console.log(`[DEBUG] 6. Final model position offset:`, model.position);

                const targetNodeName = vData ? vData.muzzleNode : null;
                let foundWristNode = null;
                
                if (targetNodeName) {
                    // 1. First, try the exact match just in case
                    foundWristNode = model.getObjectByName(targetNodeName);
                    
                    // 2. If that fails, do a "Fuzzy Search" through the entire model!
                    if (!foundWristNode) {
                        model.traverse((node) => {
                            // If the node's name contains our target word (ignoring upper/lowercase), grab it!
                            // if (node.name.toLowerCase().includes(targetNodeName.toLowerCase())) {
                            //     foundWristNode = node;
                            console.log(`[DEBUG] 🕵️ Fuzzy Search found a match! Real name for '${targetNodeName}' and slot '${slot}' is: '${node.name}'`);
                            // }
                        });
                    }
                }

                if (foundWristNode) {
                    this.muzzles[slot] = foundWristNode; // Save to the specific slot!
                    console.log(`[DEBUG] 7. Muzzle node '${targetNodeName}' found!`);
                } else {
                    console.log(`[DEBUG] 7. ⚠️ Muzzle node NOT found for arm '${slot}'! Using fallback.`);
                    const fallback = new THREE.Object3D();
                    if (vData && vData.muzzleFallbackOffset) {
                        fallback.position.set(vData.muzzleFallbackOffset.x, vData.muzzleFallbackOffset.y, vData.muzzleFallbackOffset.z);
                    } else {
                        fallback.position.set(0, 0, -10);
                    }
                    model.add(fallback);
                    this.muzzles[slot] = fallback; // Save to the specific slot!
                }

                // --- NATIVE MATERIAL HANDLING ---
                model.traverse((node) => {
                    if (node.isMesh) {
                        if (!node.material) node.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                // 👉 THE FIX: Safely remove only the old model for THIS specific slot!
                if (this.armModels[slot]) {
                    this.armGroup.remove(this.armModels[slot]);
                }
                
                this.armModels[slot] = model;
                this.armGroup.add(this.armModels[slot]);
            },
            undefined, // We don't need a progress tracker for this
            (error) => {
                // If it fails to load entirely, this will finally scream at us
                console.error(`[DEBUG] ❌ FATAL ERROR loading model:`, error);
            }
        );
    }
}