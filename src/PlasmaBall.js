import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
const plasmaTexture = textureLoader.load('assets/plasma_ball.png');

export class PlasmaBall {
    constructor(startPosition, direction, speed, damage) {
        this.damage = damage;
        this.life = 5.0; 

        this.velocity = direction.clone().normalize().multiplyScalar(speed);

        const geometry = new THREE.SphereGeometry(0.3, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ffcc, 
            map: plasmaTexture,
            transparent: true, 
            opacity: 0.9,
            blending: THREE.AdditiveBlending 
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(startPosition);
    }
}