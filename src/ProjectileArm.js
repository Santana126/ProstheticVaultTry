import * as THREE from 'three';
import { Prosthetic } from './Prosthetic.js';
import { PlasmaBall } from './PlasmaBall.js';

export class ProjectileArm extends Prosthetic {
    constructor(id, name, description, slot, modelPath, stats, weaponData, visualData) {
        super(id, name, description, slot, modelPath, stats, visualData);
        
        this.damage = weaponData.damage || 40;
        this.fireRate = weaponData.attackSpeed || 0.5; 
        this.projectileSpeed = weaponData.projectileSpeed || 40;
        
        this.maxAmmo = 20; 
        this.currentAmmo = this.maxAmmo;

        this.cooldownTimer = 0;
        this.centerScreen = new THREE.Vector2(0, 0);
        this.raycaster = new THREE.Raycaster();
    }

    attack(args) {
        const { camera, muzzlePosition, physicsManager, projectileManager, bonusDmg } = args; 
        const finalDamage = this.damage + bonusDmg;
        
        if (this.currentAmmo <= 0) return;

        if (this.cooldownTimer <= 0) {
            this.currentAmmo--;

            this.raycaster.setFromCamera(this.centerScreen, camera);
            const intersects = this.raycaster.intersectObjects(physicsManager.getSolidMeshes(), true);
            
            let targetPoint = new THREE.Vector3();
            if (intersects.length > 0) {
                targetPoint.copy(intersects[0].point);
            } else {
                this.raycaster.ray.at(100, targetPoint); 
            }

            const direction = new THREE.Vector3().subVectors(targetPoint, muzzlePosition).normalize();
            const pBall = new PlasmaBall(muzzlePosition, direction, this.projectileSpeed, finalDamage);
            projectileManager.addProjectile(pBall);

            this.cooldownTimer = this.fireRate;
        }
    }

    stopAttack(scene) {}

    update(delta) {
        if (this.cooldownTimer > 0) this.cooldownTimer -= delta;
    }
}