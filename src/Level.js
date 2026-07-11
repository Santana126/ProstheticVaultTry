import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class Level {
    constructor(scene, physicsManager, renderer) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        this.renderer = renderer;
        this.scene.fog = new THREE.FogExp2(0x05050A, 0.012);
        
        this.generateArena();
    }

    generateArena() {
        const textureLoader = new THREE.TextureLoader();

        const floorColor = textureLoader.load('assets/environment/floor/floor_gem_color.jpg');
        const floorNormal = textureLoader.load('assets/environment/floor/floor_gem_normal.jpg');
        const floorRoughness = textureLoader.load('assets/environment/floor/floor_gem_rough.jpg');

        const floor2Color = textureLoader.load('assets/environment/floor/floor2_color.jpg');
        const floor2Normal = textureLoader.load('assets/environment/floor/floor2_normal.jpg');
        const floor2Roughness = textureLoader.load('assets/environment/floor/floor2_rough.jpg');
        
        const baseMat = new THREE.MeshStandardMaterial({ 
            map: floorColor, normalMap: floorNormal, roughnessMap: floorRoughness,
            roughness: 0.8, metalness: 0.2 
        });

        const detailMat = new THREE.MeshStandardMaterial({ 
            map: floor2Color, normalMap: floor2Normal, roughnessMap: floor2Roughness,
            roughness: 0.9, metalness: 0.1 
        });

        // grid builder
        const tileSize = 5; 
        const floorSize = 600; 
        const gridCount = floorSize / tileSize; 
        const offset = (floorSize / 2) - (tileSize / 2); 

        const tileGeo = new THREE.PlaneGeometry(tileSize, tileSize);

        for (let x = 0; x < gridCount; x++) {
            for (let z = 0; z < gridCount; z++) {
                
                const useBase = Math.random() > 0.60; 
                const tileMat = useBase ? baseMat : detailMat;

                const tile = new THREE.Mesh(tileGeo, tileMat);
                tile.rotation.x = -Math.PI / 2;

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

        // invisible boundary walls
        const wallMat = new THREE.MeshBasicMaterial({ visible: false });
        const wallGeo = new THREE.BoxGeometry(300, 20, 2); 
        
        const northWall = new THREE.Mesh(wallGeo, wallMat); northWall.position.set(0, 10, -150);
        const southWall = new THREE.Mesh(wallGeo, wallMat); southWall.position.set(0, 10, 150);
        
        const eastWall = new THREE.Mesh(wallGeo, wallMat); eastWall.rotation.y = Math.PI / 2; eastWall.position.set(150, 10, 0);
        const westWall = new THREE.Mesh(wallGeo, wallMat); westWall.rotation.y = Math.PI / 2; westWall.position.set(-150, 10, 0);

        this.scene.add(northWall, southWall, eastWall, westWall);
        this.physicsManager.addColliders([northWall, southWall, eastWall, westWall]);

        // background scenery
        const bgTextures = [
            textureLoader.load('assets/environment/bg_city.png'),
            textureLoader.load('assets/environment/bg_mountains.png'),
            textureLoader.load('assets/environment/bg_industrial.png')
        ];

        const bgMaterial = new THREE.MeshBasicMaterial({ 
            transparent: true, 
            side: THREE.DoubleSide
        });

        
        const segmentWidth = 200;
        const bgGeo = new THREE.PlaneGeometry(segmentWidth, 150);

        const createSceneryWall = (axisToTile, constantAxisValue, y, rotationY) => {
            const numSegments = 5; 
            const startPos = -400; 

            for (let i = 0; i < numSegments; i++) {
                const randomTex = bgTextures[Math.floor(Math.random() * bgTextures.length)];
                
                const mat = bgMaterial.clone(); 
                mat.map = randomTex;

                const wallSegment = new THREE.Mesh(bgGeo, mat);
                const currentOffset = startPos + (i * segmentWidth);
                
                if (axisToTile === 'x') {
                    wallSegment.position.set(currentOffset, y, constantAxisValue);
                } else {
                    wallSegment.position.set(constantAxisValue, y, currentOffset);
                }
                
                wallSegment.rotation.y = rotationY;
                this.scene.add(wallSegment);
            }
        };

        // Push these out to +/- 250
        createSceneryWall('x', -250, 50, 0);               // North Skyline 
        createSceneryWall('x', 250, 50, Math.PI);          // South Skyline 
        createSceneryWall('z', 250, 50, -Math.PI / 2);     // East Skyline
        createSceneryWall('z', -250, 50, Math.PI / 2);     // West Skyline

        const ktx2Loader = new KTX2Loader()
            .setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/')
            .detectSupport(this.renderer); 

        const dracoLoader = new DRACOLoader()
            .setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');


        
        const gltfLoader = new GLTFLoader()
            .setKTX2Loader(ktx2Loader)
            .setDRACOLoader(dracoLoader)
            .setMeshoptDecoder(MeshoptDecoder);
        
        const obstacleModels = [
            'assets/environment/obstacles/obstacle_1.glb',
            'assets/environment/obstacles/obstacle_2.glb',
            'assets/environment/obstacles/obstacle_3.glb',
            'assets/environment/obstacles/obstacle_4.glb',
            'assets/environment/obstacles/obstacle_5.glb'
        ];

        const hitboxGeo = new THREE.BoxGeometry(6, 8, 6);
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

        const reservedZones = [
            { x: 0, z: 0, radius: 5 },       // Player Start & Ground Loot
            { x: -70, z: -50, radius: 8 },    // Ammo Vending Machine 
            { x: 70, z: -50, radius: 8 },     // Health Vending Machine 
            { x: 50, z: -70, radius: 30 }      // The Vault Door Area 
        ];

        let blocksPlaced = 0;
        let attempts = 0;

        while (blocksPlaced < 40 && attempts < 200) { 
            attempts++;
            
            const randomX = (Math.random() - 0.5) * 320; 
            const randomZ = (Math.random() - 0.5) * 320;
            
            let isValidSpot = true;
            for (const zone of reservedZones) {
                const dx = randomX - zone.x;
                const dz = randomZ - zone.z;
                if (Math.sqrt(dx * dx + dz * dz) < zone.radius) {
                    isValidSpot = false;
                    break; 
                }
            }

            if (isValidSpot) {
                const obstacleHitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
                
                obstacleHitbox.position.set(randomX, 4, randomZ); 
                
                this.scene.add(obstacleHitbox);
                this.physicsManager.addColliders([obstacleHitbox]);
                
                const randomPath = obstacleModels[Math.floor(Math.random() * obstacleModels.length)];
                
                gltfLoader.load(randomPath, (gltf) => {
                    const model = gltf.scene;
                    model.position.copy(obstacleHitbox.position);
                    model.position.y -= 4; 
                    const scaleSize = 5;

                    if (randomPath.includes('obstacle_1')) {
                        model.scale.set(scaleSize+1.5, scaleSize+1.5, scaleSize+1.5);
                    }else if (randomPath.includes('obstacle_5')) {
                        model.scale.set(scaleSize-1, scaleSize-1, scaleSize-1);
                    }else if (randomPath.includes('obstacle_3')) {
                        model.scale.set(scaleSize+15, scaleSize+15, scaleSize+15);
                    }else {
                        model.scale.set(scaleSize, scaleSize, scaleSize);
                    }
                    
                    model.rotation.y = Math.random() * Math.PI * 2;

                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    this.scene.add(model);
                });

                reservedZones.push({ x: randomX, z: randomZ, radius: 8 });
                blocksPlaced++;
            }
        }
    }
}