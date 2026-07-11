import * as THREE from 'three';

export class InteractionManager {
    constructor(scene, camera, uiManager) {
        this.scene = scene;
        this.camera = camera;
        this.uiManager = uiManager;
        
        this.interactables = []; 
        
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0);
        this.interactionDistance = 6; 

        this.currentLookTarget = null; 
    }

    addInteractable(mesh) {
        this.interactables.push(mesh);
    }

    removeInteractable(mesh) {
        this.interactables = this.interactables.filter(item => item !== mesh);
    }

    update() {
        if (this.interactables.length === 0) return;

        // --- 1. PROXIMITY CHECK (Auto-Pickup for Currency) ---
        for (let i = this.interactables.length - 1; i >= 0; i--) {
            const hitBox = this.interactables[i];
            const entity = hitBox.userData.entity;

            if (entity && entity.itemData && entity.itemData.type === 'CURRENCY') {
                
                const dx = this.camera.position.x - entity.mesh.position.x;
                const dz = this.camera.position.z - entity.mesh.position.z;
                const distance2D = Math.sqrt(dx * dx + dz * dz);

                const magnetRadius = 3.5; 

                if (distance2D <= magnetRadius) {
                    document.dispatchEvent(new CustomEvent('currencyCollected', { 
                        detail: { amount: 25 } 
                    }));

                    this.removeInteractable(hitBox);
                    entity.destroy();
                    
                    if (this.currentLookTarget === entity) {
                        this.currentLookTarget = null;
                        this.uiManager.hideInteractionPrompt();
                    }
                    continue; 
                }
            }
        }

        // --- 2. RAYCAST CHECK (Manual F-Pickup/Interact) ---
        this.raycaster.setFromCamera(this.centerScreen, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables, true);
        const validHit = intersects.find(hit => hit.object.userData && hit.object.userData.interactable);

        if (validHit && validHit.distance <= this.interactionDistance) {
            const hitNode = validHit.object;
            const entity = hitNode.userData.entity;
            
            if (entity.isVendingMachine) {
                if (this.currentLookTarget !== entity) {
                    this.currentLookTarget = entity;
                    this.uiManager.showInteractionPrompt(`${entity.type} REFILL [${entity.cost} Bolts]`);
                }
            } else if (entity.itemData && entity.itemData.type !== 'CURRENCY') {
                if (this.currentLookTarget !== entity) {
                    this.currentLookTarget = entity;
                    this.uiManager.showInteractionPrompt(hitNode.userData.name);
                }
            }
        } else {
            if (this.currentLookTarget !== null) {
                this.currentLookTarget = null;
                this.uiManager.hideInteractionPrompt();
            }
        }
    }

    tryInteract(inventoryManager) {
        if (this.currentLookTarget) {
            const target = this.currentLookTarget;
            
            if (target.isVendingMachine) {
                document.dispatchEvent(new CustomEvent('useVendingMachine', { detail: target }));
                return; 
            }
            
            inventoryManager.unlockItem(target.itemData.id);
            this.removeInteractable(target.mesh);
            target.destroy();
            this.currentLookTarget = null;
            this.uiManager.hideInteractionPrompt();
        }
    }
}