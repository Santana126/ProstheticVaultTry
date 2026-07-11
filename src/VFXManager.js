import * as THREE from 'three';

export class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.damageNumbers = [];

        this.sparkGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        this.sparkMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff8800, 
            transparent: true,
            opacity: 1
        });
    }

    spawnSparks(hitPoint, faceNormal) {
        const numSparks = 5; 

        for (let i = 0; i < numSparks; i++) {
            const spark = new THREE.Mesh(this.sparkGeometry, this.sparkMaterial);
            
            const startPos = hitPoint.clone().add(faceNormal.clone().multiplyScalar(0.05));
            spark.position.copy(startPos);

            const randomScatter = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            
            const bounceDirection = faceNormal.clone().add(randomScatter).normalize();
            
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
        const geometry = new THREE.CircleGeometry(0.3, 8); 
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x111111, 
            depthTest: true,
            transparent: true,
            opacity: 0.9
        });
        const decal = new THREE.Mesh(geometry, material);

        decal.position.copy(hitPoint);

        const tinyOffset = faceNormal.clone().multiplyScalar(0.01);
        decal.position.add(tinyOffset);

        const lookTarget = decal.position.clone().add(faceNormal);
        decal.lookAt(lookTarget);

        scene.add(decal);

        setTimeout(() => {
            scene.remove(decal);
            geometry.dispose();
            material.dispose();
        }, 20000); 
    }

    spawnDamageNumber(position, damageAmount) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;

        context.font = 'bold 64px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        context.strokeStyle = 'black';
        context.lineWidth = 8;
        context.strokeText(`-${damageAmount}`, 128, 64);
        
        context.fillStyle = 'white';
        context.fillText(`-${damageAmount}`, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false 
        });
        
        const sprite = new THREE.Sprite(material);
        
        sprite.position.copy(position);
        sprite.position.y += 1.5; 
        sprite.scale.set(1.5, 0.75, 1); 

        this.scene.add(sprite);

        this.damageNumbers.push({
            sprite: sprite,
            life: 1.0,    
            maxLife: 1.0,
            velocityY: 2.0 
        });
    }

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
                this.scene.remove(dn.sprite);
                dn.sprite.material.map.dispose(); 
                dn.sprite.material.dispose();
                this.damageNumbers.splice(i, 1);
            } else {
                dn.sprite.position.y += dn.velocityY * delta;
                
                if (dn.life < dn.maxLife * 0.5) {
                    dn.sprite.material.opacity = dn.life / (dn.maxLife * 0.5);
                }
            }
        }
    }
}