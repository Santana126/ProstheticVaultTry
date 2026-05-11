import { Prosthetic } from './Prosthetic.js';
import * as THREE from 'three';
import { VFXManager } from './VFXManager.js';


export class Arm extends Prosthetic {
    constructor(id, name, description, slot, modelPath, stats, weaponData, visualData) {
        super(id, name, description, slot, modelPath, stats, visualData);
        
        // Weapon specific characteristics
        this.damage = weaponData.damage || 10;
        this.attackSpeed = weaponData.attackSpeed || 1;
        this.attackType = weaponData.attackType || 'laser'; // 'melee', 'laser', 'electric'
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0); // Center of the screen for raycasting
        
        this.activeLasers = [];
        this.beamMesh = null; // Store the current laser beam mesh for cleanup
        this.currentBeamLength = 0; // Track the current length of the laser beam for animation

        this.burnTimer = 0; // Timer for electric burn effect
    }

    getAttackParameters() {
        return {
            range: this.attackType === 'laser' ? 100 : 30, // Lasers have long range, melee is short
            damage: this.damage,
            color: this.attackType === 'laser' ? 0x00ffff : 0xffffff
            
        };
    }


    // This should be changed into a generic performAttack
    fireContinuous(camera, muzzlePosition, scene, physicsManager, delta, vfxManager, projectileManager) {
        const params = this.getAttackParameters();

        // 1. Raycast to find what the player is aiming at right now
        this.raycaster.setFromCamera(this.centerScreen, camera);
        const solidObjects = physicsManager.getSolidMeshes();
        const intersects = this.raycaster.intersectObjects(solidObjects, true);

        let targetPoint = new THREE.Vector3();
        let targetNormal = null;
        let hitObject = null; // Track the specific mesh we hit!
        
        if (intersects.length > 0 && intersects[0].distance <= params.range) {
            targetPoint.copy(intersects[0].point);
            targetNormal = intersects[0].face.normal;
            hitObject = intersects[0].object; // Store the hit object
        } else {
            this.raycaster.ray.at(params.range, targetPoint);
        }

        // Calculate the exact distance from the gun to the wall
        const maxDistance = muzzlePosition.distanceTo(targetPoint);

        // 2. If the beam doesn't exist yet (first frame of clicking), create it!
        if (!this.beamMesh) {
            // Create a cylinder with a length of exactly 1 unit
            const geometry = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
            
            // Shift the geometry up by half its length. 
            // Now its pivot point is at the bottom base, not the center!
            geometry.translate(0, 0.5, 0); 
            
            // Rotate it so the cylinder points forward along the Z axis
            geometry.rotateX(Math.PI / 2);

            const material = new THREE.MeshBasicMaterial({ 
                color: params.color,
                transparent: true,
                opacity: 0.8
            });

            this.beamMesh = new THREE.Mesh(geometry, material);
            scene.add(this.beamMesh);
            
            this.currentBeamLength = 0; // Start at length 0
        }

        // 3. Animate the beam stretching out
        const beamExtendSpeed = 10; // Velocity: How fast the laser shoots out (units per second)
        
        if (this.currentBeamLength < maxDistance) {
            this.currentBeamLength += beamExtendSpeed * delta;
        }
        
        // Cap the length so it doesn't poke straight through the wall
        if (this.currentBeamLength > maxDistance) {
            this.currentBeamLength = maxDistance;
        }

        // 4. Update position, rotation, and length every single frame
        this.beamMesh.position.copy(muzzlePosition); // Lock base to the wrist
        this.beamMesh.lookAt(targetPoint);           // Point at the crosshair
        this.beamMesh.scale.set(1, 1, this.currentBeamLength); // Stretch it!

        // --- USE THE VFX MANAGER ---
        if (targetNormal && this.currentBeamLength >= maxDistance) {
            this.burnTimer += delta;
            
            if (this.burnTimer >= 0.1) { 
                // Check if we hit a living entity!
                if (hitObject && hitObject.userData && hitObject.userData.entity) {
                    // Deal damage (e.g., 10% of total damage every 0.1 seconds)
                    const damageTick = params.damage * 0.1;
                    hitObject.userData.entity.takeDamage(damageTick, targetPoint, targetNormal, vfxManager);
                } else {
                    // We hit a wall! Spawn a burn decal and sparks
                    vfxManager.createBurnDecal(scene, targetPoint, targetNormal);
                    vfxManager.spawnSparks(targetPoint, targetNormal);
                }
                this.burnTimer = 0; 
            }

            // Ask the manager to do it!
            vfxManager.spawnSparks(targetPoint, targetNormal);
        }
    }

    // Called when the player lets go of the mouse button
    stopFiring(scene) {
        if (this.beamMesh) {
            scene.remove(this.beamMesh);
            this.beamMesh.geometry.dispose();
            this.beamMesh.material.dispose();
            this.beamMesh = null;
        }
        this.currentBeamLength = 0;
    }

}