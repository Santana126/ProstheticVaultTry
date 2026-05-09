import * as THREE from 'three';

export class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];

        // Shared geometries and materials for absolute max performance
        this.sparkGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        this.sparkMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff8800, 
            transparent: true,
            opacity: 1
        });
    }

    spawnSparks(hitPoint, faceNormal) {
        const numSparks = 1; 

        for (let i = 0; i < numSparks; i++) {
            const spark = new THREE.Mesh(this.sparkGeometry, this.sparkMaterial);
            
            // Push out from wall slightly
            const startPos = hitPoint.clone().add(faceNormal.clone().multiplyScalar(0.05));
            spark.position.copy(startPos);

            const randomScatter = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            
            const bounceDirection = faceNormal.clone().add(randomScatter).normalize();
            
            // Prevent sparks from spawning inside the wall
            if (bounceDirection.dot(faceNormal) < 0) {
                bounceDirection.add(faceNormal.clone().multiplyScalar(2)).normalize();
            }
            
            const speed = Math.random() * 7 + 5; 
            const velocity = bounceDirection.multiplyScalar(speed);

            this.scene.add(spark);

            const lifespan = Math.random() * 3 + 2; 

            this.particles.push({
                mesh: spark,
                velocity: velocity,
                life: lifespan,      
                maxLife: lifespan
            });
        }
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



    // The physics loop for all visual effects
    update(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.life -= delta;

            if (p.life <= 0) {
                if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
                this.particles.splice(i, 1);
                continue; 
            }

            const gravity = 9.8;
            p.velocity.y -= gravity * delta;
            p.mesh.position.addScaledVector(p.velocity, delta);

            const scale = p.life / p.maxLife;
            p.mesh.scale.set(scale, scale, scale);
        }
    }
}