import * as THREE from 'three';
import { Prosthetic } from './Prosthetic.js';

export class HitscanArm extends Prosthetic {
    constructor(id, name, description, slot, modelPath, stats, weaponData, visualData) {
        super(id, name, description, slot, modelPath, stats, visualData);
        
        this.damage = weaponData.damage || 10;
        this.range = weaponData.range || 100;
        this.tickRate = weaponData.attackSpeed || 0.1; // How often damage applies
        this.beamColor = weaponData.color || 0x00ffff;
        
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0);
        this.beamMesh = null;
        this.currentBeamLength = 0;
        this.tickTimer = 0;
    }

    attack(camera, muzzlePosition, scene, physicsManager, delta, vfxManager) {
        this.raycaster.setFromCamera(this.centerScreen, camera);
        const intersects = this.raycaster.intersectObjects(physicsManager.getSolidMeshes(), true);

        let targetPoint = new THREE.Vector3();
        let targetNormal = null;
        let hitObject = null;
        
        if (intersects.length > 0 && intersects[0].distance <= this.range) {
            targetPoint.copy(intersects[0].point);
            targetNormal = intersects[0].face.normal;
            hitObject = intersects[0].object;
        } else {
            this.raycaster.ray.at(this.range, targetPoint);
        }

        const maxDistance = muzzlePosition.distanceTo(targetPoint);

        if (!this.beamMesh) {
            const geometry = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
            geometry.translate(0, 0.5, 0); 
            geometry.rotateX(Math.PI / 2);
            const material = new THREE.MeshBasicMaterial({ color: this.beamColor, transparent: true, opacity: 0.8 });
            this.beamMesh = new THREE.Mesh(geometry, material);
            scene.add(this.beamMesh);
            this.currentBeamLength = 0; 
        }

        const beamExtendSpeed = 100; // Super fast for lasers
        this.currentBeamLength = Math.min(this.currentBeamLength + beamExtendSpeed * delta, maxDistance);

        this.beamMesh.position.copy(muzzlePosition); 
        this.beamMesh.lookAt(targetPoint);           
        this.beamMesh.scale.set(1, 1, this.currentBeamLength); 

        // Apply Damage Tick
        if (targetNormal && this.currentBeamLength >= maxDistance) {
            this.tickTimer += delta;
            if (this.tickTimer >= this.tickRate) { 
                if (hitObject && hitObject.userData && hitObject.userData.entity) {
                    hitObject.userData.entity.takeDamage(this.damage, targetPoint, targetNormal, vfxManager);
                } else {
                    vfxManager.createBurnDecal(scene, targetPoint, targetNormal);
                }
                vfxManager.spawnSparks(targetPoint, targetNormal);
                this.tickTimer = 0; 
            }
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
        this.tickTimer = 0;
    }

    update(delta) {}
}