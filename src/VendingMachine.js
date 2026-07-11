import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class VendingMachine {
    constructor(scene, physicsManager, x, y, z, type = 'AMMO', cost = 25) {
        this.scene = scene;
        this.type = type; 
        this.cost = cost;
        this.isVendingMachine = true; 

        this.mesh = new THREE.Group();
        this.mesh.position.set(x, y, z);

        const hitboxGeo = new THREE.BoxGeometry(4, 8, 4);
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
        this.hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        this.hitbox.position.y = 4;
        this.hitbox.userData = { interactable: true, entity: this };
        this.mesh.add(this.hitbox);

        physicsManager.addColliders([this.hitbox]); 

        // Visual Placeholder (Until your 3D model loads)
        const color = type === 'AMMO' ? 0x00d4ff : 0x00ff00; 
        const visualGeo = new THREE.BoxGeometry(3.5, 7.5, 3.5);
        const visualMat = new THREE.MeshStandardMaterial({ 
            color: color, metalness: 0.8, roughness: 0.2, emissive: color, emissiveIntensity: 0.2 
        });
        this.visualMesh = new THREE.Mesh(visualGeo, visualMat);
        this.visualMesh.position.y = 4;
        this.mesh.add(this.visualMesh);

        // --- 3D MODEL LOADER ---
        const modelPath = type === 'AMMO' ? 'assets/vendingMachineBullets.glb' : 'assets/vendingMachineHP.glb';
        
        const loader = new GLTFLoader();
        loader.load(modelPath, (gltf) => {
            this.mesh.remove(this.visualMesh); 
            
            const model = gltf.scene;
            model.scale.set(5, 5, 5); 
            model.position.set(0, 4, 0); 

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.mesh.add(model);
        });

        this.scene.add(this.mesh);
    }
}