import * as THREE from 'three';

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.walls = [];
        this.defaultWallColor = 0x444444;
    }

    // The fundamental building block
    addWall(x, y, z, width, height, depth, color = this.defaultWallColor) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: color });
        const wall = new THREE.Mesh(geometry, material);
        
        wall.position.set(x, y, z);
        this.scene.add(wall);

        // Store the AABB for collision
        wall.userData.boundingBox = new THREE.Box3().setFromObject(wall);
        
        this.walls.push(wall);
        return wall;
    }

    // The Layout Orchestrator
    buildVaultLayout() {
        // --- ROOM 1: THE STARTING CELL ---
        this.addWall(0, 2, -5, 10, 10, 0.5); // North
        this.addWall(0, 2, 5, 10, 10, 0.5);  // South
        this.addWall(-5, 2, 0, 0.5, 10, 10); // West
        this.addWall(5, 2, -3, 0.5, 10, 4);  // East North
        this.addWall(5, 2, 3, 0.5, 10, 4);   // East South

        // --- ROOM 2: THE CORRIDOR ---
        this.addWall(2.5, 2, -15, 0.5, 10, 20); // Left
        this.addWall(-2.5, 2, -15, 0.5, 10, 20); // Right
        this.addWall(0, 2, -25, 5, 10, 0.5);     // End

        // --- ROOM 3: THE COMBAT ARENA ---
        const arenaCenterZ = -35;
        this.addWall(0, 2, arenaCenterZ - 7.5, 15, 10, 0.5); // North
        this.addWall(0, 2, arenaCenterZ + 7.5, 15, 10, 0.5); // South
        this.addWall(-7.5, 2, arenaCenterZ, 0.5, 10, 15);    // West
        this.addWall(7.5, 2, arenaCenterZ - 5, 0.5, 10, 5);  // East North
        this.addWall(7.5, 2, arenaCenterZ + 5, 0.5, 10, 5);  // East South

        // --- THE FINAL VAULT ---
        const vaultColor = 0xffd700; // Gold
        const vaultCenterZ = -35;
        const vaultCenterX = 15;
        this.addWall(vaultCenterX, 2, vaultCenterZ - 5, 10, 10, 0.5, vaultColor);
        this.addWall(vaultCenterX, 2, vaultCenterZ + 5, 10, 10, 0.5, vaultColor);
        this.addWall(vaultCenterX + 5, 2, vaultCenterZ, 0.5, 10, 10, vaultColor);
        this.addWall(vaultCenterX - 5, 2, vaultCenterZ - 3, 0.5, 10, 3, vaultColor);
        this.addWall(vaultCenterX - 5, 2, vaultCenterZ + 3, 0.5, 10, 3, vaultColor);


        // Add a tall central pillar in the side of the map for visual interest
        this.addWall(0, 5, -20, 2, 10, 2, 0x888888);
        
        console.log("Vault Layout generated successfully.");
    }
}