import * as THREE from 'three';

export class Enemy {
    constructor(scene, physicsManager, x, y, z, player) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        this.player = player;

        // --- STATS ---
        this.health = 100;
        this.speed = 3.5; // Meters per second
        this.attackRange = 1.5; // How close it needs to be to hit the player
        this.attackDamage = 15;
        this.attackCooldown = 0;
        this.isDead = false;

        // --- VISUALS ---
        // A simple, menacing red cylinder for the MVP
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
        geometry.translate(0, 1, 0); // Pivot at the feet so it rests perfectly on the floor
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.castShadow = true;

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

        if (this.health <= 0) {
            this.die();
        }
    }


    update(delta) {
        if (this.isDead) return;

        // Tick down the attack cooldown
        if (this.attackCooldown > 0) this.attackCooldown -= delta;

        // --- SIMPLE AI ---
        // 1. Figure out where the player is (ignoring the Y-axis so the enemy doesn't try to fly up to your eyes)
        const targetPos = this.player.camera.position.clone();
        targetPos.y = this.mesh.position.y; 

        const distanceToPlayer = this.mesh.position.distanceTo(targetPos);

        if (distanceToPlayer > this.attackRange) {
            // 2. Move towards the player
            const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
            this.mesh.position.addScaledVector(direction, this.speed * delta);
            
            // Look at the player
            this.mesh.lookAt(targetPos); 
        } else {
            // 3. Attack the player!
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
