import * as THREE from 'three';

export class PhysicsManager {
    constructor() {
        // This array holds the actual Three.js meshes that are solid
        this.colliders = [];
    }

    // Call this when building the level to make walls solid
    addColliders(objects) {
        this.colliders.push(...objects);
    }

    // Removes an object (useful if a wall gets destroyed or an enemy dies)
    removeCollider(object) {
        this.colliders = this.colliders.filter(c => c !== object);
    }

    // The universal collision check
    checkCollision(targetBox, ignoreEnemies = false) {
        for (let collider of this.colliders) {

            if (ignoreEnemies && collider.userData && collider.userData.isEnemy) {
                continue;
            }
            
            // Assuming your Level.js creates walls with userData.boundingBox
            if (collider.userData && collider.userData.boundingBox) {
                if (targetBox.intersectsBox(collider.userData.boundingBox)) {
                    return true;
                }
            } else {
                // Fallback for standard objects without a pre-calculated box
                const box = new THREE.Box3().setFromObject(collider);
                if (targetBox.intersectsBox(box)) return true;
            }
        }
        return false;
    }

    // Helper for weapons: Returns the raw meshes for the Raycaster
    getSolidMeshes() {
        return this.colliders;
    }
}