import * as THREE from 'three';

export class Level {
    constructor(scene, physicsManager) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        
        this.generateArena();
    }

    generateArena() {
        // 1. The Main Floor
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.physicsManager.addColliders([floor]);

        // 2. Invisible Boundary Walls (To keep the player inside)
        const wallMat = new THREE.MeshBasicMaterial({ visible: false });
        const wallGeo = new THREE.BoxGeometry(100, 20, 2);
        
        const northWall = new THREE.Mesh(wallGeo, wallMat);
        northWall.position.set(0, 10, -50);
        const southWall = new THREE.Mesh(wallGeo, wallMat);
        southWall.position.set(0, 10, 50);
        
        const eastWall = new THREE.Mesh(wallGeo, wallMat);
        eastWall.rotation.y = Math.PI / 2;
        eastWall.position.set(50, 10, 0);
        const westWall = new THREE.Mesh(wallGeo, wallMat);
        westWall.rotation.y = Math.PI / 2;
        westWall.position.set(-50, 10, 0);

        this.scene.add(northWall, southWall, eastWall, westWall);
        this.physicsManager.addColliders([northWall, southWall, eastWall, westWall]);

        // 3. Randomized Cover Blocks
        // We will replace these with actual 3D environment models later!
        const coverGeo = new THREE.BoxGeometry(6, 8, 6);
        const coverMat = new THREE.MeshStandardMaterial({ color: 0x444455 });

        for (let i = 0; i < 12; i++) {
            const cover = new THREE.Mesh(coverGeo, coverMat);
            
            // Random position between -40 and +40
            const randomX = (Math.random() - 0.5) * 80;
            const randomZ = (Math.random() - 0.5) * 80;
            
            cover.position.set(randomX, 4, randomZ);
            
            // Don't spawn cover in the exact center where the player starts!
            if (cover.position.distanceTo(new THREE.Vector3(0, 0, 0)) < 15) {
                continue;
            }

            cover.castShadow = true;
            cover.receiveShadow = true;
            this.scene.add(cover);
            this.physicsManager.addColliders([cover]);
        }
    }
}