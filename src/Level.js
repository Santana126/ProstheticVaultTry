import * as THREE from 'three';

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.walls = []; // List of all collidable boxes
    }

    // Helper function to create a wall
    addWall(x, y, z, width, height, depth, color = 0x444444) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: color });
        const wall = new THREE.Mesh(geometry, material);
        
        wall.position.set(x, y, z);
        this.scene.add(wall);

        // Create a Bounding Box for this wall for collision detection
        // We calculate it once and store it to save performance
        wall.userData.boundingBox = new THREE.Box3().setFromObject(wall);
        
        this.walls.push(wall);
        return wall;
    }

    // Method to build a simple room
    createRoom(centerX, centerZ, size) {
        const half = size / 2;
        const h = 4; // Wall height

        // North Wall
        this.addWall(centerX, h/2, centerZ - half, size, h, 0.5);
        // South Wall
        this.addWall(centerX, h/2, centerZ + half, size, h, 0.5);
        // East Wall
        this.addWall(centerX + half, h/2, centerZ, 0.5, h, size);
        // West Wall
        this.addWall(centerX - half, h/2, centerZ, 0.5, h, size);
    }
}