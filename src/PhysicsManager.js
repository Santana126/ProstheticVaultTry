import * as THREE from 'three';

export class PhysicsManager {
    constructor() {
        this.colliders = [];
    }

    // Call this when building the level to make walls and objects solid
    addColliders(objects) {
        this.colliders.push(...objects);
    }

    // Removes an object 
    removeCollider(object) {
        this.colliders = this.colliders.filter(c => c !== object);
    }

    // The universal collision check
    checkCollision(targetBox, ignoreEnemies = false) {
        for (let collider of this.colliders) {

            if (ignoreEnemies && collider.userData && collider.userData.isEnemy) {
                continue;
            }
            
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

    // Returns the raw meshes, primarily used for raycasting weapons
    getSolidMeshes() {
        return this.colliders;
    }
}