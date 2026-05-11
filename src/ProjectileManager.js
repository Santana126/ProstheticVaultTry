import * as THREE from 'three';

export class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
    }

    addProjectile(projectile) {
        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }

    update(delta, physicsManager, vfxManager) {
        // Loop backwards so we can safely delete projectiles that explode
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i];
            
            // Calculate where the projectile will be next frame
            const moveStep = proj.velocity.clone().multiplyScalar(delta);
            const nextPosition = proj.mesh.position.clone().add(moveStep);

            // Check for collision using a short Raycast (prevents phasing through thin walls)
            const raycaster = new THREE.Raycaster(proj.mesh.position, proj.velocity.clone().normalize());
            const distanceToMove = moveStep.length();
            
            const intersects = raycaster.intersectObjects(physicsManager.getSolidMeshes(), true);

            if (intersects.length > 0 && intersects[0].distance <= distanceToMove) {
                // IT HIT SOMETHING!
                const hitPoint = intersects[0].point;
                const normal = intersects[0].face.normal;
                const hitObject = intersects[0].object;

                // 1. Deal damage if it's an entity
                if (hitObject && hitObject.userData && hitObject.userData.entity) {
                    hitObject.userData.entity.takeDamage(proj.damage, hitPoint, normal, vfxManager);
                } else {
                    // 2. Draw a burn mark if it's a wall
                    vfxManager.createBurnDecal(this.scene, hitPoint, normal);
                }

                // 3. Explode! (Spawn lots of sparks)
                for(let s = 0; s < 5; s++) vfxManager.spawnSparks(hitPoint, normal);

                // 4. Delete the projectile
                this.scene.remove(proj.mesh);
                proj.mesh.geometry.dispose();
                proj.mesh.material.dispose();
                this.projectiles.splice(i, 1);

            } else {
                // IT HIT NOTHING, KEEP FLYING!
                proj.mesh.position.copy(nextPosition);
                
                // Projectiles die after a few seconds if they fly off the map
                proj.life -= delta;
                if (proj.life <= 0) {
                    this.scene.remove(proj.mesh);
                    proj.mesh.geometry.dispose();
                    proj.mesh.material.dispose();
                    this.projectiles.splice(i, 1);
                }
            }
        }
    }
}