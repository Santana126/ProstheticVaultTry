import * as THREE from 'three';

export class Enemy {
    constructor(scene, physicsManager, x, y, z, player, isBoss = false) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        this.player = player;
        this.isBoss = isBoss;

        // --- STATS ---
        if (this.isBoss) {
            this.health = 500;
            this.speed = 2.5; // Slightly slower, more menacing
            this.attackDamage = 40; // Hits like a truck
        } else {
            this.health = 100;
            this.speed = 3.5; 
            this.attackDamage = 15;
        }
        this.attackRange = 1.5; // How close it needs to be to hit the player
        this.attackCooldown = 0;
        this.isDead = false;

        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 1.5;

        // --- VISUALS ---
        // A simple, menacing red cylinder for the MVP
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
        geometry.translate(0, 1, 0); // Pivot at the feet so it rests perfectly on the floor
        const color = this.isBoss ? 0x8b0000 : 0xff0000;
        const material = new THREE.MeshStandardMaterial({ color: color });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.castShadow = true;

        // Scale up the boss 3x!
        if (this.isBoss) {
            this.mesh.scale.set(3, 3, 3);
            this.attackRange = 4.0; // Needs a larger attack range because of its size
        }

        // --- PHYSICS & HITBOX ---
        // Tag it exactly like we did the Dummy so bullets and lasers recognize it!
        this.mesh.userData = { 
            entity: this, 
            type: 'enemy' 
        };
        
        this.scene.add(this.mesh);
        this.physicsManager.addColliders([this.mesh]);
    }

    takeDamage(amount, hitPoint, normal, vfxManager) {
        if (this.isDead) return;
        
        this.health -= amount;
        console.log(`Enemy Health: ${this.health}`);
        if(vfxManager){
            vfxManager.spawnDamageNumber(this.mesh.position, amount);
        }

        if (this.health <= 0) {
            this.die();
        }
    }


    update(delta) {
        if (this.isDead) return;

        // Tick down the attack cooldown
        if (this.attackCooldown > 0) this.attackCooldown -= delta;

        
        const targetPos = this.player.camera.position.clone();
        targetPos.y = this.mesh.position.y; 

        const distanceToPlayer = this.mesh.position.distanceTo(targetPos);

        if (distanceToPlayer > this.attackRange) {
            // 1. Calculate where it WANTS to go
            let desiredDirection = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
            
            // 2. Prepare the Raycast (Lift the origin up 1 meter so it shoots from the chest, not the feet)
            const rayOrigin = this.mesh.position.clone();
            rayOrigin.y += 1.0; 
            this.raycaster.set(rayOrigin, desiredDirection);

            // 3. Ask the physics manager for solid walls (but filter out the enemy itself!)
            const allColliders = this.physicsManager.getSolidMeshes();
            const wallsOnly = allColliders.filter(mesh => mesh !== this.mesh && mesh.userData.type !== 'enemy');
            
            const intersects = this.raycaster.intersectObjects(wallsOnly, true);

            // 4. THE SLIDE MATH
            if (intersects.length > 0) {
                // We are about to hit a wall! 
                const wallNormal = intersects[0].face.normal;
                
                // Flatten our desired direction against the wall
                desiredDirection.projectOnPlane(wallNormal);
                
                // If we are pushed perfectly flat, normalize the vector to keep speed consistent
                if (desiredDirection.lengthSq() > 0) {
                    desiredDirection.normalize();
                }
            }

            // 5. Move the enemy!
            this.mesh.position.addScaledVector(desiredDirection, this.speed * delta);
            
            // Keep the enemy's "eyes" locked on the player, even while sliding sideways
            this.mesh.lookAt(targetPos);
        } else {
            
            if (this.attackCooldown <= 0) {
                this.player.takeDamage(this.attackDamage);
                this.attackCooldown = 1.0; // Wait 1 second before hitting again
            }
        }
    }

    die() {
        this.isDead = true;
        console.log("Enemy eliminated!");

        // Clean up the 3D model and remove its solid hitbox
        this.scene.remove(this.mesh);
        this.physicsManager.removeCollider(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }

}
