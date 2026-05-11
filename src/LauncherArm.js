import * as THREE from 'three';
import { Prosthetic } from './Prosthetic.js';
import { PlasmaBall } from './PlasmaBall.js';

export class LauncherArm extends Prosthetic {
    constructor(id, name, description, slot, modelPath, stats, weaponData, visualData) {
        super(id, name, description, slot, modelPath, stats, visualData);
        
        this.damage = weaponData.damage || 40;
        this.fireRate = weaponData.attackSpeed || 0.5; // Seconds between shots
        this.projectileSpeed = weaponData.projectileSpeed || 40;
        this.attackType = 'projectile';
        
        this.cooldownTimer = 0;
        this.centerScreen = new THREE.Vector2(0, 0);
        this.raycaster = new THREE.Raycaster();
    }


    fireContinuous(camera, muzzlePosition, scene, physicsManager, delta, vfxManager, projectileManager) {
        if (this.cooldownTimer <= 0) {
            
            // 1. Find what the player is aiming at to get the flight trajectory
            this.raycaster.setFromCamera(this.centerScreen, camera);
            const intersects = this.raycaster.intersectObjects(physicsManager.getSolidMeshes(), true);
            
            let targetPoint = new THREE.Vector3();
            if (intersects.length > 0) {
                targetPoint.copy(intersects[0].point);
            } else {
                this.raycaster.ray.at(100, targetPoint); // Aim far away
            }

            // 2. Calculate direction from the gun to the target
            const direction = new THREE.Vector3().subVectors(targetPoint, muzzlePosition).normalize();

            // 3. Spawn projectile
            const pBall = new PlasmaBall(muzzlePosition, direction, this.projectileSpeed, this.damage);
            projectileManager.addProjectile(pBall);

            // 4. Reset cooldown
            this.cooldownTimer = this.fireRate;
        }
    }

    stopFiring(scene) {
        // Nothing to destroy when we release the trigger
    }

    update(delta) {
        // Cooldown timer keeps ticking down
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= delta;
        }
    }
}