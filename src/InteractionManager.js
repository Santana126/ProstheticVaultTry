import * as THREE from 'three';

export class InteractionManager {
    constructor(scene, camera, uiManager) {
        this.scene = scene;
        this.camera = camera;
        this.uiManager = uiManager;
        
        this.interactables = []; // Only holds loot, doors, etc.
        
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0);
        this.interactionDistance = 8; // How close you have to be (in meters)

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

        // Cast a short ray from the center of the camera
        this.raycaster.setFromCamera(this.centerScreen, this.camera);
        
        // Check against our specific list of interactable meshes
        const intersects = this.raycaster.intersectObjects(this.interactables, true);

        // --- THE FIX ---
        // Don't just look at the first polygon we hit. Search through everything the 
        // raycast penetrated until we find the object with our special 'interactable' tag!
        const validHit = intersects.find(hit => hit.object.userData && hit.object.userData.interactable);

        if (validHit && validHit.distance <= this.interactionDistance) {
            // We are looking at the hitbox!
            const hitNode = validHit.object;
            
            if (this.currentLookTarget !== hitNode.userData.entity) {
                this.currentLookTarget = hitNode.userData.entity;
                this.uiManager.showInteractionPrompt(hitNode.userData.name);
            }
        } else {
            // We are looking at nothing, or it's too far away. Hide the prompt.
            if (this.currentLookTarget !== null) {
                this.currentLookTarget = null;
                this.uiManager.hideInteractionPrompt();
            }
        }
    }

    // Called by the Player when they press 'F'
    tryInteract(inventoryManager) {
        if (this.currentLookTarget) {
            const itemEntity = this.currentLookTarget;
            
            console.log(`Picked up: ${itemEntity.itemData.name}`);
            
            // 1. Tell the InventoryManager to unlock the item
            inventoryManager.unlockItem(itemEntity.itemData.id);

            // 2. Remove the 3D object from the world
            this.removeInteractable(itemEntity.mesh);
            itemEntity.destroy();

            // 3. Reset our look target and hide the UI
            this.currentLookTarget = null;
            this.uiManager.hideInteractionPrompt();
        }
    }
}