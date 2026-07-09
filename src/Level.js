import * as THREE from 'three';

export class Level {
    constructor(scene, physicsManager) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        
        // --- TWEAKED: Pushed the fog further back so you can see more of the bigger map ---
        this.scene.fog = new THREE.FogExp2(0x05050A, 0.012);
        
        this.generateArena();
    }

    generateArena() {
        const textureLoader = new THREE.TextureLoader();

        const floorColor = textureLoader.load('assets/environment/floor/floor_gem_color.jpg');
        const floorNormal = textureLoader.load('assets/environment/floor/floor_gem_normal.jpg');
        const floorRoughness = textureLoader.load('assets/environment/floor/floor_gem_rough.jpg');

        // Load LAYER 2 Textures & Alpha Map
        const floor2Color = textureLoader.load('assets/environment/floor/floor2_color.jpg');
        const floor2Normal = textureLoader.load('assets/environment/floor/floor2_normal.jpg');
        const floor2Roughness = textureLoader.load('assets/environment/floor/floor2_rough.jpg');
        

        // 3. Create the TWO Materials
        const baseMat = new THREE.MeshStandardMaterial({ 
            map: floorColor, normalMap: floorNormal, roughnessMap: floorRoughness,
            roughness: 0.8, metalness: 0.2 
        });

        const detailMat = new THREE.MeshStandardMaterial({ 
            map: floor2Color, normalMap: floor2Normal, roughnessMap: floor2Roughness,
            roughness: 0.9, metalness: 0.1 
        });

        // 4. THE GRID BUILDER
        // --- CHANGED: tileSize is now 5 instead of 20 ---
        const tileSize = 5; 
        const floorSize = 300; 
        
        // This math automatically adjusts! 
        // 200 / 5 = A 40x40 grid (1,600 individual tiles instead of 100)
        const gridCount = floorSize / tileSize; 
        const offset = (floorSize / 2) - (tileSize / 2); 

        const tileGeo = new THREE.PlaneGeometry(tileSize, tileSize);

        for (let x = 0; x < gridCount; x++) {
            for (let z = 0; z < gridCount; z++) {
                
                // You can tweak this ratio based on the new smaller size
                const useBase = Math.random() > 0.60; 
                const tileMat = useBase ? baseMat : detailMat;

                const tile = new THREE.Mesh(tileGeo, tileMat);
                tile.rotation.x = -Math.PI / 2;

                // Random rotation to break up patterns
                tile.rotation.z = Math.floor(Math.random() * 4) * (Math.PI / 2);

                tile.position.set(
                    (x * tileSize) - offset,
                    0,
                    (z * tileSize) - offset
                );

                tile.receiveShadow = true;
                this.scene.add(tile);
            }
        }

        // 2. Invisible Boundary Walls (Moved out to 100 meters)
        const wallMat = new THREE.MeshBasicMaterial({ visible: false });
        const wallGeo = new THREE.BoxGeometry(300, 20, 2); // Walls are now 300m long
        
        const northWall = new THREE.Mesh(wallGeo, wallMat); northWall.position.set(0, 10, -150);
        const southWall = new THREE.Mesh(wallGeo, wallMat); southWall.position.set(0, 10, 150);
        
        const eastWall = new THREE.Mesh(wallGeo, wallMat); eastWall.rotation.y = Math.PI / 2; eastWall.position.set(150, 10, 0);
        const westWall = new THREE.Mesh(wallGeo, wallMat); westWall.rotation.y = Math.PI / 2; westWall.position.set(-150, 10, 0);

        this.scene.add(northWall, southWall, eastWall, westWall);
        this.physicsManager.addColliders([northWall, southWall, eastWall, westWall]);

        // 3. Randomized Cover Blocks (Smart Spawning)
        const coverGeo = new THREE.BoxGeometry(6, 8, 6);
        const coverMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a24, roughness: 0.5, metalness: 0.8
        });

        const reservedZones = [
            { x: 0, z: 0, radius: 15 },       // Player Start & Ground Loot
            { x: -70, z: -50, radius: 10 },    // Ammo Vending Machine 
            { x: 70, z: -50, radius: 10 },     // Health Vending Machine 
            { x: 50, z: -70, radius: 40 }      // The Vault Door Area 
        ];

        let blocksPlaced = 0;
        let attempts = 0; // Failsafe to prevent infinite loops

        // Keep trying until we successfully place exactly 24 blocks (or try 200 times)
        while (blocksPlaced < 24 && attempts < 200) {
            attempts++;
            
            const randomX = (Math.random() - 0.5) * 240;
            const randomZ = (Math.random() - 0.5) * 240;
            
            // Check if this random spot overlaps with ANY reserved zone
            let isValidSpot = true;
            for (const zone of reservedZones) {
                const dx = randomX - zone.x;
                const dz = randomZ - zone.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < zone.radius) {
                    isValidSpot = false;
                    break; 
                }
            }

            // If the spot is safe, build the block!
            if (isValidSpot) {
                const cover = new THREE.Mesh(coverGeo, coverMat);
                cover.position.set(randomX, 4, randomZ);
                
                cover.castShadow = true;
                cover.receiveShadow = true;
                this.scene.add(cover);
                this.physicsManager.addColliders([cover]);
                
                // Add this new block to the reserved zones so future blocks don't overlap IT!
                reservedZones.push({ x: randomX, z: randomZ, radius: 8 });
                
                blocksPlaced++;
            }
        }
    }
}