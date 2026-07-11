import { Prosthetic } from './Prosthetic.js';
import * as THREE from 'three';

export class Arm extends Prosthetic {
    constructor(id, name, description, slot, modelPath, stats, weaponData, visualData) {
        super(id, name, description, slot, modelPath, stats, visualData);
        
        this.damage = weaponData.damage || 10;
        this.attackSpeed = weaponData.attackSpeed || 1;
        this.attackType = weaponData.attackType || 'laser'; 
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0); 
        
        this.activeLasers = [];
        this.beamMesh = null; 
        this.currentBeamLength = 0; 
        this.burnTimer = 0; 
    }

    getAttackParameters() {
        return {
            range: this.attackType === 'laser' ? 100 : 30, 
            damage: this.damage,
            color: this.attackType === 'laser' ? 0x00ffff : 0xffffff
        };
    }

    attack(args) {
        const { camera, muzzlePosition, scene, physicsManager, delta, vfxManager } = args;
        const params = this.getAttackParameters();

        this.raycaster.setFromCamera(this.centerScreen, camera);
        const solidObjects = physicsManager.getSolidMeshes();
        const intersects = this.raycaster.intersectObjects(solidObjects, true);

        let targetPoint = new THREE.Vector3();
        let targetNormal = null;
        let hitObject = null; 
        
        if (intersects.length > 0 && intersects[0].distance <= params.range) {
            targetPoint.copy(intersects[0].point);
            targetNormal = intersects[0].face.normal;
            hitObject = intersects[0].object; 
        } else {
            this.raycaster.ray.at(params.range, targetPoint);
        }

        const maxDistance = muzzlePosition.distanceTo(targetPoint);

        if (!this.beamMesh) {
            const geometry = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
            geometry.translate(0, 0.5, 0); 
            geometry.rotateX(Math.PI / 2);

            const material = new THREE.MeshBasicMaterial({ 
                color: params.color,
                transparent: true,
                opacity: 0.8
            });

            this.beamMesh = new THREE.Mesh(geometry, material);
            scene.add(this.beamMesh);
            this.currentBeamLength = 0; 
        }

        const beamExtendSpeed = 10; 
        if (this.currentBeamLength < maxDistance) {
            this.currentBeamLength += beamExtendSpeed * delta;
        }
        
        if (this.currentBeamLength > maxDistance) {
            this.currentBeamLength = maxDistance;
        }

        this.beamMesh.position.copy(muzzlePosition); 
        this.beamMesh.lookAt(targetPoint);           
        this.beamMesh.scale.set(1, 1, this.currentBeamLength); 

        if (targetNormal && this.currentBeamLength >= maxDistance) {
            this.burnTimer += delta;
            
            if (this.burnTimer >= 0.1) { 
                if (hitObject && hitObject.userData && hitObject.userData.entity) {
                    const damageTick = params.damage * 0.1;
                    hitObject.userData.entity.takeDamage(damageTick, targetPoint, targetNormal, vfxManager);
                } else {
                    vfxManager.createBurnDecal(scene, targetPoint, targetNormal);
                    vfxManager.spawnSparks(targetPoint, targetNormal);
                }
                this.burnTimer = 0; 
            }
            vfxManager.spawnSparks(targetPoint, targetNormal);
        }
    }

    stopAttack(scene) {
        if (this.beamMesh) {
            scene.remove(this.beamMesh);
            this.beamMesh.geometry.dispose();
            this.beamMesh.material.dispose();
            this.beamMesh = null;
        }
        this.currentBeamLength = 0;
    }
}