import { Prosthetic } from './Prosthetic.js';
import * as THREE from 'three';

export class Arm extends Prosthetic {
    constructor(id, name, description, slot, modelPath, stats, weaponData) {
        super(id, name, description, slot, modelPath, stats);
        
        // Weapon specific characteristics
        this.damage = weaponData.damage || 10;
        this.attackSpeed = weaponData.attackSpeed || 1.0;
        this.attackType = weaponData.attackType || 'laser'; // 'melee', 'laser', 'electric'
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0); // Center of the screen for raycasting
        
        this.activeLasers = [];
        this.beamMesh = null; // Store the current laser beam mesh for cleanup
        this.currentBeamLength = 0; // Track the current length of the laser beam for animation

        this.burnTimer = 0; // Timer for electric burn effect
        // --- NEW: PARTICLE SYSTEM SETUP ---
        this.particles = []; 
        
        // We create ONE geometry and ONE material to share across all sparks for performance
        this.sparkGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        this.sparkMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff8800, // Bright Orange
            transparent: true,
            opacity: 1
        });
    }

    getAttackParameters() {
        return {
            range: this.attackType === 'laser' ? 100 : 30, // Lasers have long range, melee is short
            damage: this.damage,
            color: this.attackType === 'laser' ? 0x00ffff : 0xffffff
            
        };
    }

    // // NEW: The Arm is now responsible for the visual effect
    // createVisualEffect(scene, startPoint, endPoint) {
    //     const params = this.getAttackParameters();

    //     // Create the laser line
    //     const points = [startPoint, endPoint];
    //     const geometry = new THREE.BufferGeometry().setFromPoints(points);
    //     const material = new THREE.LineBasicMaterial({ 
    //         color: params.color, 
    //         linewidth: 2 
    //     });
    //     const line = new THREE.Line(geometry, material);

    //     scene.add(line);

    //     // Memory Management: Clean up the line after 100ms
    //     setTimeout(() => {
    //         scene.remove(line);
    //         geometry.dispose();
    //         material.dispose();
    //     }, 100);
    // }


    // createVisualEffect(scene, startPoint, endPoint, color) {
    //     // 1. Create a glowing cylinder for the laser bolt
    //     const length = 1.5; 
    //     const geometry = new THREE.CylinderGeometry(0.04, 0.04, length, 8);
        
    //     // Crucial: Cylinders point UP (Y) by default. We rotate it so it points FORWARD (Z)
    //     geometry.rotateX(Math.PI / 2);

    //     const material = new THREE.MeshBasicMaterial({ color: color });
    //     const laserMesh = new THREE.Mesh(geometry, material);

    //     // 2. Position it at the wrist and point it at the wall
    //     laserMesh.position.copy(startPoint);
    //     laserMesh.lookAt(endPoint);
    //     scene.add(laserMesh);

    //     // 3. Calculate distance and direction for the animation
    //     const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
    //     const totalDistance = startPoint.distanceTo(endPoint);

    //     // 4. Save it to our array so it can be animated in the update loop
    //     this.activeLasers.push({
    //         mesh: laserMesh,
    //         direction: direction,
    //         speed: 150, // Velocity: Higher means the laser travels faster
    //         distanceTraveled: 0,
    //         maxDistance: totalDistance
    //     });
    // }

    
    // attack(camera, handPosition, scene, solidObjects) {
    //     console.log(`${this.name} attacks with ${this.attackType}! Dealing ${this.damage} damage.`);
    //     // Future: Add animation and raycasting here

    //     //Call the shootLaser method to handle the actual shooting logic and visual effect
    //     // Note: We will need to pass the camera, hand position, scene, and solid objects for raycasting
    //     // This is a placeholder and should be replaced with actual references from your game context
    //     this.shootLaser(camera, handPosition, scene, solidObjects);

    // }


    // attack(camera, handPosition, scene, solidObjects) {
    //     console.log(`${this.name} attacks with ${this.attackType}! Dealing ${this.damage} damage.`);
    //     const params = this.getAttackParameters();

    //     // 1. Raycast to find the exact target from the center of the screen
    //     this.raycaster.setFromCamera(this.centerScreen, camera);
    //     const intersects = this.raycaster.intersectObjects(solidObjects, true);

    //     let hitPoint = new THREE.Vector3();

    //     // 2. Check if we hit a wall within our weapon's range
    //     if (intersects.length > 0 && intersects[0].distance <= params.range) {
    //         hitPoint.copy(intersects[0].point);
            
    //         // (Future code: Deal damage to intersects[0].object here)
    //     } else {
    //         // If we missed or it's out of range, shoot the laser into the distance
    //         this.raycaster.ray.at(params.range, hitPoint);
    //     }

    //     // 3. Spawn the flying projectile!
    //     // This calls the cylinder logic we just wrote
    //     this.createVisualEffect(scene, handPosition, hitPoint, params.color);
    // }


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


    fireContinuous(camera, muzzlePosition, scene, solidObjects, delta) {
        const params = this.getAttackParameters();

        // 1. Raycast to find what the player is aiming at right now
        this.raycaster.setFromCamera(this.centerScreen, camera);
        const intersects = this.raycaster.intersectObjects(solidObjects, true);

        let targetPoint = new THREE.Vector3();
        let targetNormal = null;
        
        if (intersects.length > 0 && intersects[0].distance <= params.range) {
            targetPoint.copy(intersects[0].point);
            targetNormal = intersects[0].face.normal;
        } else {
            this.raycaster.ray.at(params.range, targetPoint);
        }

        // Calculate the exact distance from the gun to the wall
        const maxDistance = muzzlePosition.distanceTo(targetPoint);

        // 2. If the beam doesn't exist yet (first frame of clicking), create it!
        if (!this.beamMesh) {
            // Create a cylinder with a length of exactly 1 unit
            const geometry = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
            
            // THE MAGIC TRICK: Shift the geometry up by half its length. 
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
        // console.log(`Beam length: ${this.currentBeamLength.toFixed(2)} / ${maxDistance.toFixed(2)}`);
    
        // --- SPAWN BURN DECALS & SPARKS ---
        if (targetNormal && this.currentBeamLength >= maxDistance) {
            this.burnTimer += delta;
            
            // Spawn a burn decal every 100 milliseconds
            if (this.burnTimer >= 0.1) { 
                this.createBurnDecal(scene, targetPoint, targetNormal);
                this.burnTimer = 0; 
            }

            // NEW: Spawn a continuous shower of sparks every single frame!
            // (Because we reuse geometry/materials, Three.js can handle this easily)
            this.spawnSparks(scene, targetPoint, targetNormal);
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


    createBurnDecal(scene, hitPoint, faceNormal) {
        // 1. Create a simple flat circle for the scorch mark
        const geometry = new THREE.CircleGeometry(0.3, 8); // Size 0.3, 8 segments
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x111111, // Very dark grey/black
            depthTest: true,
            transparent: true,
            opacity: 0.9
        });
        const decal = new THREE.Mesh(geometry, material);

        // 2. Position it at the exact hit point
        decal.position.copy(hitPoint);

        // 3. To prevent "Z-fighting" (flickering when two meshes occupy the exact same space),
        // we push the decal outward along the wall's normal vector by a tiny fraction.
        const tinyOffset = faceNormal.clone().multiplyScalar(0.01);
        decal.position.add(tinyOffset);

        // 4. Orient the circle so it lays flat against the wall
        // We make it "look at" a point slightly further out along the normal vector
        const lookTarget = decal.position.clone().add(faceNormal);
        decal.lookAt(lookTarget);

        // Add to the world
        scene.add(decal);

        // 5. Memory Management: Fade out and delete the burn mark after 5 seconds
        setTimeout(() => {
            scene.remove(decal);
            geometry.dispose();
            material.dispose();
        }, 20000); 
    }

    spawnSparks(scene, hitPoint, faceNormal) {
        // Reduced to 1 spark per frame since they live much longer now
        const numSparks = 1; 

        for (let i = 0; i < numSparks; i++) {
            const spark = new THREE.Mesh(this.sparkGeometry, this.sparkMaterial);
            
            // FIX 1: Push the spark start position slightly OUT from the wall
            // so it doesn't get stuck inside the geometry
            const startPos = hitPoint.clone().add(faceNormal.clone().multiplyScalar(0.05));
            spark.position.copy(startPos);

            // Calculate a random scatter
            const randomScatter = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            
            // Combine normal with scatter
            const bounceDirection = faceNormal.clone().add(randomScatter).normalize();
            
            // FIX 2: Check if the random scatter accidentally made it point INSIDE the wall.
            // If the dot product is negative, it's pointing backwards, so we flip it!
            if (bounceDirection.dot(faceNormal) < 0) {
                bounceDirection.add(faceNormal.clone().multiplyScalar(2)).normalize();
            }
            
            // Give it a strong outward punch (speed between 5 and 12)
            const speed = Math.random() * 7 + 5; 
            const velocity = bounceDirection.multiplyScalar(speed);

            scene.add(spark);

            // UPDATE: Give them a random lifespan between 2 and 5 seconds
            const lifespan = Math.random() * 3 + 2; 

            this.particles.push({
                mesh: spark,
                velocity: velocity,
                life: lifespan,      
                maxLife: lifespan
            });
        }
    }

    update(delta) {
        console.log(`Entering Arm update loop with ${this.particles.length} active sparks...`);
        // Loop backwards to safely delete particles without breaking the array index
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            
            // 1. Age the particle
            p.life -= delta;

            if (p.life <= 0) {
                // Delete the mesh from the scene (but NOT the geometry/material, since they are shared!)
                p.mesh.parent.remove(p.mesh);
                this.particles.splice(i, 1);
                continue; // Skip the rest of the loop for this particle
            }

            // 2. Apply Gravity (pulls down on the Y axis)
            const gravity = 9.8;
            p.velocity.y -= gravity * delta;

            // 3. Move the spark based on its velocity
            p.mesh.position.addScaledVector(p.velocity, delta);

            // 4. Shrink the spark as it dies (creates a nice fade-out effect)
            const scale = p.life / p.maxLife;
            p.mesh.scale.set(scale, scale, scale);
        }
    }
        

    // // NEW: Handles moving the projectiles every frame
    // update(delta) {
    //     console.log(`Updating ${this.activeLasers.length} active lasers...`);
    //     // We loop backwards so we can safely delete lasers from the array as they hit walls
    //     for (let i = this.activeLasers.length - 1; i >= 0; i--) {
    //         let laser = this.activeLasers[i];
            
    //         // Calculate how far it should move this frame
    //         const distanceToMove = laser.speed * delta;
            
    //         // Move the mesh physically forward
    //         laser.mesh.position.add(laser.direction.clone().multiplyScalar(distanceToMove));
    //         laser.distanceTraveled += distanceToMove;

    //         // Did it hit the target?
    //         if (laser.distanceTraveled >= laser.maxDistance) {
    //             // Remove from the 3D scene
    //             laser.mesh.parent.remove(laser.mesh); 
                
    //             // Free up computer memory
    //             laser.mesh.geometry.dispose();
    //             laser.mesh.material.dispose();
                
    //             // Remove from our tracking array
    //             this.activeLasers.splice(i, 1); 
    //         }
    //     }
    // }
}