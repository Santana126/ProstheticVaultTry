import { Prosthetic } from './Prosthetic.js';
import * as THREE from 'three';

export class Arm extends Prosthetic {
    constructor(id, name, description, slot, modelPath, stats, weaponData) {
        super(id, name, description, slot, modelPath, stats);
        
        // Weapon specific characteristics
        this.damage = weaponData.damage || 10;
        this.attackSpeed = weaponData.attackSpeed || 1.0;
        this.attackType = weaponData.attackType || 'melee'; // 'melee', 'laser', 'electric'
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0); // Center of the screen for raycasting
    }

    getAttackParameters() {
        return {
            range: this.attackType === 'laser' ? 100 : 3, // Lasers have long range, melee is short
            damage: this.damage,
            color: this.attackType === 'laser' ? 0x00ffff : 0xffffff
            
        };
    }

    // NEW: The Arm is now responsible for the visual effect
    createVisualEffect(scene, startPoint, endPoint) {
        const params = this.getAttackParameters();

        // Create the laser line
        const points = [startPoint, endPoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: params.color, 
            linewidth: 2 
        });
        const line = new THREE.Line(geometry, material);

        scene.add(line);

        // Memory Management: Clean up the line after 100ms
        setTimeout(() => {
            scene.remove(line);
            geometry.dispose();
            material.dispose();
        }, 100);
    }



    
    attack(camera, handPosition, scene, solidObjects) {
        console.log(`${this.name} attacks with ${this.attackType}! Dealing ${this.damage} damage.`);
        // Future: Add animation and raycasting here

        //Call the shootLaser method to handle the actual shooting logic and visual effect
        // Note: We will need to pass the camera, hand position, scene, and solid objects for raycasting
        // This is a placeholder and should be replaced with actual references from your game context
        this.shootLaser(camera, handPosition, scene, solidObjects);

    }

    /**
     * Fires a laser from the hand to whatever is in the center of the screen.
     * @param {THREE.PerspectiveCamera} camera - The player's POV
     * @param {THREE.Vector3} handPosition - The world coordinates of the gun/hand
     * @param {THREE.Scene} scene - Your Three.js scene
     * @param {Array<THREE.Object3D>} solidObjects - Array of walls/enemies to hit
     */

    shootLaser(camera, handPosition, scene, solidObjects) {
        this.raycaster.setFromCamera(this.centerScreen, camera);
        const intersects = this.raycaster.intersectObjects(solidObjects, true);

        if (intersects.length > 0) {
            // We hit something! Get the exact 3D coordinate of the impact
            const hitPoint = intersects[0].point; 

            // 4. Draw the visual laser
            this.renderLaserBeam(handPosition, hitPoint, scene);
            
            // (Optional) Add a decal, spark, or explosion at the 'hitPoint' here!
        } else {
            // Optional: If they shoot into the sky, draw a really long line anyway
            const maxDistance = new THREE.Vector3().copy(camera.position).add(this.raycaster.ray.direction.multiplyScalar(1000));
            this.renderLaserBeam(handPosition, maxDistance, scene);
        }
    }

    renderLaserBeam(startPoint, endPoint, scene) {
        // Create the material for the laser (make it emissive if you use post-processing/bloom!)
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff0000 // Red laser
        });

        // Create the geometry using our two points
        const points = [startPoint, endPoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create the mesh and add to scene
        const laserLine = new THREE.Line(geometry, material);
        scene.add(laserLine);

        // 5. Cleanup: Remove the laser after a split second so it flashes
        setTimeout(() => {
            scene.remove(laserLine);
            geometry.dispose();
            material.dispose();
        }, 100); // 100 milliseconds duration
    }
        
}