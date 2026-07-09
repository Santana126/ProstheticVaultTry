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

    update(delta, physicsManager, vfxManager, player) { 
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i];
            
            // --- NEW: Proximity Detonation for Boss Spells ---
            if (proj.isEnemyProjectile) {
                

                // PROXIMITY FUSE
                if (player && proj.mesh.position.distanceTo(player.camera.position) < 4.5) {
                    console.log("BOOM! Spell hit the player!");
                    player.takeDamage(proj.damage);
                    
                    for(let s = 0; s < 20; s++) {
                        vfxManager.spawnSparks(proj.mesh.position, new THREE.Vector3(0, 1, 0));
                    }
                    
                    this.scene.remove(proj.mesh);
                    proj.mesh.geometry.dispose();
                    proj.mesh.material.dispose();
                    this.projectiles.splice(i, 1);
                    continue; 
                }
            }
            
            const moveStep = proj.velocity.clone().multiplyScalar(delta);
            const nextPosition = proj.mesh.position.clone().add(moveStep);
            
            const raycaster = new THREE.Raycaster(proj.mesh.position, proj.velocity.clone().normalize());
            const distanceToMove = moveStep.length();
            const intersects = raycaster.intersectObjects(physicsManager.getSolidMeshes(), true);

            if (intersects.length > 0 && intersects[0].distance <= distanceToMove) {
                const hitPoint = intersects[0].point;
                const normal = intersects[0].face.normal;
                const hitObject = intersects[0].object;

                if (hitObject && hitObject.userData && hitObject.userData.entity) {
                    const entity = hitObject.userData.entity;

                    // Prevent the Boss from team-killing its minions
                    if (!proj.isEnemyProjectile) {
                        
                        // SAFE CHECK: Does this entity actually have health? (Enemies/Boss)
                        if (typeof entity.takeDamage === 'function') {
                            entity.takeDamage(proj.damage, hitPoint, normal, vfxManager);
                        } else {
                            // It is an entity (like a Vending Machine), so treat it like a wall!
                            vfxManager.createBurnDecal(this.scene, hitPoint, normal);
                        }
                    }
                }else {
                    // It is an entity (like a Vending Machine), so treat it like a wall!
                    vfxManager.createBurnDecal(this.scene, hitPoint, normal);
                }
                    

                for(let s = 0; s < 5; s++) vfxManager.spawnSparks(hitPoint, normal);

                this.scene.remove(proj.mesh);
                proj.mesh.geometry.dispose();
                proj.mesh.material.dispose();
                this.projectiles.splice(i, 1);

            } else {
                proj.mesh.position.copy(nextPosition);
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