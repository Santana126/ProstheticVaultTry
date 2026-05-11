import * as THREE from 'three';

export class Dummy {
    constructor(scene, physicsManager, x, y, z) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        
        // Health System
        this.maxHp = 100;
        this.hp = this.maxHp;

        // Visual representation (A huge red cylinder!)
        const geometry = new THREE.CylinderGeometry(5, 5, 5, 16); // function attributes: (radiusTop, radiusBottom, height, radialSegments)
        // const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
        geometry.translate(0, 1, 0); // Pivot at the bottom so it stands on the floor
        
        this.material = new THREE.MeshStandardMaterial({ color: 0xaa2222 });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(x, y, z);
        
        // CRITICAL: Tag the mesh so the raycaster knows who it hit!
        this.mesh.userData = { 
            type: 'enemy', 
            entity: this 
        };

        // Add to world and physics
        this.scene.add(this.mesh);
        this.physicsManager.addColliders([this.mesh]);
    }

    takeDamage(amount, hitPoint, normal, vfxManager) {
        this.hp -= amount;
        
        // Damage Flash Effect (Flashes brighter red/white)
        this.material.emissive.setHex(0x551111);
        setTimeout(() => {
            if (this.material) this.material.emissive.setHex(0x000000);
        }, 100);

        // Spawn sparks exactly where the laser hit the dummy
        vfxManager.spawnSparks(hitPoint, normal);

        console.log(`Dummy took ${amount.toFixed(1)} damage! HP: ${this.hp.toFixed(1)}`);

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        console.log("Target Destroyed!");
        
        // 1. Remove from visuals
        this.scene.remove(this.mesh);
        
        // 2. Remove from physics (Player can now walk through where it stood!)
        this.physicsManager.removeCollider(this.mesh);
        
        // 3. Free up memory
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}