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

        this.damageNumbers = [];
    }

    spawnSparks(hitPoint, faceNormal) {
        const numSparks = 5; 

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

    spawnDamageNumber(position, damageAmount) {
        // 1. Create an invisible 2D HTML Canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;

        // 2. Draw the text onto the canvas
        context.font = 'bold 64px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw a black outline for readability
        context.strokeStyle = 'black';
        context.lineWidth = 8;
        context.strokeText(`-${damageAmount}`, 128, 64);
        
        // Draw the white text inside
        context.fillStyle = 'white';
        context.fillText(`-${damageAmount}`, 128, 64);

        // 3. Turn the canvas into a Three.js Texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // 4. Create the Sprite Material (transparent and depth-tested)
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false // Renders on top of everything so it doesn't clip into the enemy
        });
        
        const sprite = new THREE.Sprite(material);
        
        // Position it exactly where the enemy got hit, but lift it up a bit
        sprite.position.copy(position);
        sprite.position.y += 1.5; 
        
        // Scale it so it looks good in 3D space
        sprite.scale.set(1.5, 0.75, 1); 

        this.scene.add(sprite);

        // 5. Save it to our array with a timer so we can animate it
        this.damageNumbers.push({
            sprite: sprite,
            life: 1.0,    // Lives for 1 second
            maxLife: 1.0,
            velocityY: 2.0 // Floats upward at 2 meters per second
        });
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

        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            let dn = this.damageNumbers[i];
            
            dn.life -= delta;
            
            if (dn.life <= 0) {
                // Time's up! Delete the sprite to save memory
                this.scene.remove(dn.sprite);
                dn.sprite.material.map.dispose(); // Always dispose textures!
                dn.sprite.material.dispose();
                this.damageNumbers.splice(i, 1);
            } else {
                // Move it up
                dn.sprite.position.y += dn.velocityY * delta;
                
                // Fade it out smoothly over the second half of its life
                if (dn.life < dn.maxLife * 0.5) {
                    dn.sprite.material.opacity = dn.life / (dn.maxLife * 0.5);
                }
            }
        }
    }
}