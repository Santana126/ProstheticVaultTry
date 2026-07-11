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

        this.equipment = new Map(); 
        this.ownedItems = new Set(['steel_arm']); 
        
        this.armGroup = new THREE.Group();
        this.camera.add(this.armGroup);
        this.scene.add(this.camera);

        this.armModels = {}; 
        this.muzzles = {};
    }

    unlockItem(itemId) {
        if (!this.ownedItems.has(itemId)) {
            this.ownedItems.add(itemId);
            
            document.dispatchEvent(new CustomEvent('inventoryUpdated', {
                detail: { ownedItems: Array.from(this.ownedItems) }
            }));
        }
    }

    getOwnedItems() {
        return Array.from(this.ownedItems);
    }

    equip(slot, item) {
        if (!this.ownedItems.has(item.id)) {
            console.warn(`Cannot equip ${item.id}, player does not own it!`);
            return;
        }

        this.equipment.set(slot, item);

        document.dispatchEvent(new CustomEvent('equipmentUpdated', {
            detail: { slot, itemId: item.id, item }
        }));
        
        if (slot === 'LEFT_ARM' || slot === 'RIGHT_ARM') {
            this.loadArmModel(item, slot); 
        }
    }

    getActiveArm() {
        return this.equipment.get('RIGHT_ARM') || this.equipment.get('LEFT_ARM');
    }

    getEquippedItem(slot){
        return this.equipment.get(slot);
    }

    getActiveArmModel() {
        return this.armModels['RIGHT_ARM'] || this.armModels['LEFT_ARM'];
    }

    getmuzzlePoint() {
        return this.muzzles['RIGHT_ARM'] || this.muzzles['LEFT_ARM'];
    }

    loadArmModel(item, slot) { 
        this.loader.load(
            item.modelPath, 
            (gltf) => {
                const model = gltf.scene;
                
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
                let foundWristNode = null;
                
                if (targetNodeName) {
                    foundWristNode = model.getObjectByName(targetNodeName);
                    if (!foundWristNode) {
                        model.traverse((node) => {
                            if (node.name.toLowerCase().includes(targetNodeName.toLowerCase())) {
                                foundWristNode = node;
                            }
                        });
                    }
                }

                if (foundWristNode) {
                    this.muzzles[slot] = foundWristNode; 
                } else {
                    const fallback = new THREE.Object3D();
                    if (vData && vData.muzzleFallbackOffset) {
                        fallback.position.set(vData.muzzleFallbackOffset.x, vData.muzzleFallbackOffset.y, vData.muzzleFallbackOffset.z);
                    } else {
                        fallback.position.set(0, 0, -10);
                    }
                    model.add(fallback);
                    this.muzzles[slot] = fallback; 
                }

                model.traverse((node) => {
                    if (node.isMesh) {
                        if (!node.material) node.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                if (this.armModels[slot]) {
                    this.armGroup.remove(this.armModels[slot]);
                }
                
                this.armModels[slot] = model;
                this.armGroup.add(this.armModels[slot]);
            },
            undefined, 
            (error) => {
                console.error(`ERROR loading model:`, error);
            }
        );
    }
}