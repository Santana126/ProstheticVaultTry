import * as THREE from 'three';
import { Prosthetic } from './Prosthetic.js';

const textureLoader = new THREE.TextureLoader();
const laserTexture = textureLoader.load('assets/laser_beam.png');

export class HitscanArm extends Prosthetic {
    constructor(id, name, description, slot, modelPath, stats, weaponData, visualData) {
        super(id, name, description, slot, modelPath, stats, visualData);
        
        this.damage = weaponData.damage || 10;
        this.range = weaponData.range || 100;
        this.tickRate = weaponData.attackSpeed || 0.1; 
        this.beamColor = weaponData.color || 0x00ffff;
        
        this.heat = 0;
        this.maxHeat = 100;
        this.heatRate = 35; 
        this.coolingRate = 20; 
        this.isOverheated = false;
        this.isFiring = false;

        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0);
        this.beamMesh = null;
        this.currentBeamLength = 0;
        this.tickTimer = 0;
    }

    attack(args) {
        const { camera, muzzlePosition, scene, physicsManager, delta, vfxManager, bonusDmg } = args; 
        const finalDamage = this.damage + bonusDmg;

        if (this.isOverheated) {
            this.stopAttack(scene);
            return;
        }

        this.isFiring = true;

        this.heat += this.heatRate * delta;
        if (this.heat >= this.maxHeat) {
            this.heat = this.maxHeat;
            this.isOverheated = true;
            document.dispatchEvent(new CustomEvent('overheatDamage', { detail: { amount: 15 } }));
            this.stopAttack(scene);
            return;
        }

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
            
            const currentColor = this.heat > 75 ? 0xff0000 : this.beamColor;
            const material = new THREE.MeshBasicMaterial({ 
                color: currentColor,
                map: laserTexture,
                transparent: true, 
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: 0.8 
            });
            
            this.beamMesh = new THREE.Mesh(geometry, material);
            scene.add(this.beamMesh);
            this.currentBeamLength = 0; 
        }

        const beamExtendSpeed = 100; 
        this.currentBeamLength = Math.min(this.currentBeamLength + beamExtendSpeed * delta, maxDistance);

        this.beamMesh.position.copy(muzzlePosition); 
        this.beamMesh.lookAt(targetPoint);           
        this.beamMesh.scale.set(1, 1, this.currentBeamLength); 

        if (targetNormal && this.currentBeamLength >= maxDistance) {
            this.tickTimer += delta;
            if (this.tickTimer >= this.tickRate) { 
                if (hitObject && hitObject.userData && hitObject.userData.entity) {
                    const entity = hitObject.userData.entity;
                    if (typeof entity.takeDamage === 'function') {
                        entity.takeDamage(finalDamage, targetPoint, targetNormal, vfxManager);
                    } else {
                        vfxManager.createBurnDecal(scene, targetPoint, targetNormal);
                    }
                } else {
                    vfxManager.createBurnDecal(scene, targetPoint, targetNormal);
                }
                
                vfxManager.spawnSparks(targetPoint, targetNormal);
                this.tickTimer = 0; 
            }
        }
    }

    stopAttack(scene) {
        this.isFiring = false; 
        if (this.beamMesh) {
            scene.remove(this.beamMesh);
            this.beamMesh.geometry.dispose();
            this.beamMesh.material.dispose();
            this.beamMesh = null;
        }
        this.currentBeamLength = 0;
        this.tickTimer = 0;
    }

    update(delta) {
        if (!this.isFiring) {
            this.heat -= this.coolingRate * delta;
        }
        if (this.heat <= 0) {
            this.heat = 0;
            this.isOverheated = false; 
        }
    }
}