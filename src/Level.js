import * as THREE from 'three';

export class Level {
    constructor(scene, physicsManager) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        
        // --- TWEAKED: Pushed the fog further back so you can see more of the bigger map ---
        this.scene.fog = new THREE.Fog(0x111111, 40, 120);
        
        this.generateArena();
    }

    generateArena() {
        const textureLoader = new THREE.TextureLoader();

        const floorColor = textureLoader.load('assets/environment/floor/floor_gem_color.jpg');
        const floorNormal = textureLoader.load('assets/environment/floor/floor_gem_normal.jpg');
        const floorRoughness = textureLoader.load('assets/environment/floor/floor_gem_rough.jpg');

        // --- TWEAKED: Increased repeat to 40 so the tiles stay sharp on the larger floor ---
        [floorColor, floorNormal, floorRoughness].forEach(tex => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(40, 40); 
        });

        // 1. The Main Floor (Doubled to 200x200)
        const floorGeo = new THREE.PlaneGeometry(400, 400);
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: floorColor,
            normalMap: floorNormal,
            roughnessMap: floorRoughness,
            roughness: 0.8,
            metalness: 0.2 
        });
        
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 2. Invisible Boundary Walls (Moved out to 100 meters)
        const wallMat = new THREE.MeshBasicMaterial({ visible: false });
        const wallGeo = new THREE.BoxGeometry(400, 20, 2); // Walls are now 400m long
        
        const northWall = new THREE.Mesh(wallGeo, wallMat); northWall.position.set(0, 10, -200);
        const southWall = new THREE.Mesh(wallGeo, wallMat); southWall.position.set(0, 10, 200);
        
        const eastWall = new THREE.Mesh(wallGeo, wallMat); eastWall.rotation.y = Math.PI / 2; eastWall.position.set(200, 10, 0);
        const westWall = new THREE.Mesh(wallGeo, wallMat); westWall.rotation.y = Math.PI / 2; westWall.position.set(-200, 10, 0);

        this.scene.add(northWall, southWall, eastWall, westWall);
        this.physicsManager.addColliders([northWall, southWall, eastWall, westWall]);

        // 3. Randomized Cover Blocks
        const coverGeo = new THREE.BoxGeometry(6, 8, 6);
        const coverMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a24, 
            roughness: 0.5,
            metalness: 0.8
        });

        // --- TWEAKED: Spawn 24 blocks instead of 12 ---
        for (let i = 0; i < 24; i++) {
            const cover = new THREE.Mesh(coverGeo, coverMat);
            
            // --- TWEAKED: Spread them out across 160 meters (-80 to +80) ---
            const randomX = (Math.random() - 0.5) * 160;
            const randomZ = (Math.random() - 0.5) * 160;
            
            cover.position.set(randomX, 4, randomZ);
            
            // Don't spawn cover exactly where the player starts
            if (cover.position.distanceTo(new THREE.Vector3(0, 0, 0)) < 15) continue;

            cover.castShadow = true;
            cover.receiveShadow = true;
            this.scene.add(cover);
            this.physicsManager.addColliders([cover]);
        }
    }
}