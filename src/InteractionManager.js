import * as THREE from 'three';

export class InteractionManager {
    constructor(scene, camera, uiManager) {
        this.scene = scene;
        this.camera = camera;
        this.uiManager = uiManager;
        
        this.interactables = []; // Only holds loot, doors, etc.
        
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0);
        this.interactionDistance = 6; // How close you have to be (in meters)

        this.currentLookTarget = null; // What are we currently looking at?
    }

    // Called when a WorldItem spawns
    addInteractable(mesh) {
        this.interactables.push(mesh);
    }

    // Called when a WorldItem is picked up
    removeInteractable(mesh) {
        this.interactables = this.interactables.filter(item => item !== mesh);
    }

    update() {
        if (this.interactables.length === 0) return;

        // --- 1. PROXIMITY CHECK (Auto-Pickup for Currency) ---
        // We loop backwards because we might be deleting items from the array as we go!
        for (let i = this.interactables.length - 1; i >= 0; i--) {
            const hitBox = this.interactables[i];
            const entity = hitBox.userData.entity;

            // Check if this item is currency
            if (entity && entity.itemData && entity.itemData.type === 'CURRENCY') {
                
                // Calculate 2D Distance (Ignore the Y axis height!)
                const dx = this.camera.position.x - entity.mesh.position.x;
                const dz = this.camera.position.z - entity.mesh.position.z;
                const distance2D = Math.sqrt(dx * dx + dz * dz);

                const magnetRadius = 3.5; // You can grab bolts from 3.5 meters away

                if (distance2D <= magnetRadius) {
                    // Pick it up! Dispatch an event so the Player script hears it.
                    document.dispatchEvent(new CustomEvent('currencyCollected', { 
                        detail: { amount: 15 } // Give 15 bolts per pickup!
                    }));

                    // Clean it up
                    this.removeInteractable(hitBox);
                    entity.destroy();
                    
                    // Clear the look target if we were accidentally staring at it while picking it up
                    if (this.currentLookTarget === entity) {
                        this.currentLookTarget = null;
                        this.uiManager.hideInteractionPrompt();
                    }
                    continue; // Skip the raycast code below for this specific item
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
                // IT'S A MACHINE! Show custom prompt with price
                if (this.currentLookTarget !== entity) {
                    this.currentLookTarget = entity;
                    this.uiManager.showInteractionPrompt(`${entity.type} REFILL [${entity.cost} Bolts]`);
                }
            } else if (entity.itemData && entity.itemData.type !== 'CURRENCY') {
                // IT'S NORMAL LOOT
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

    // Called by the Player when they press 'F'
    tryInteract(inventoryManager) {
        if (this.currentLookTarget) {
            const target = this.currentLookTarget;
            
            // If it's a machine, broadcast an event and STOP here!
            if (target.isVendingMachine) {
                document.dispatchEvent(new CustomEvent('useVendingMachine', { detail: target }));
                return; 
            }
            
            // ... (keep the rest of your normal loot pickup code exactly as it is) ...
            console.log(`Picked up: ${target.itemData.name}`);
            inventoryManager.unlockItem(target.itemData.id);
            this.removeInteractable(target.mesh);
            target.destroy();
            this.currentLookTarget = null;
            this.uiManager.hideInteractionPrompt();
        }
    }
}