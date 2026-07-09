import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class VendingMachine {
    constructor(scene, physicsManager, x, y, z, type = 'AMMO', cost = 25) {
        this.scene = scene;
        this.type = type; // 'AMMO' or 'HEALTH'
        this.cost = cost;
        this.isVendingMachine = true; // Flag for the InteractionManager

        this.mesh = new THREE.Group();
        this.mesh.position.set(x, y, z);

        // 1. Solid Hitbox for Collision AND Interaction
        const hitboxGeo = new THREE.BoxGeometry(4, 8, 4);
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
        this.hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        this.hitbox.position.y = 4;
        this.hitbox.userData = { interactable: true, entity: this };
        this.mesh.add(this.hitbox);

        // Tell physics manager the machine is solid cover!
        physicsManager.addColliders([this.hitbox]); 

        // 2. Visual Placeholder (Until your 3D model loads)
        const color = type === 'AMMO' ? 0x00d4ff : 0x00ff00; // Cyan for Ammo, Green for Health
        const visualGeo = new THREE.BoxGeometry(3.5, 7.5, 3.5);
        const visualMat = new THREE.MeshStandardMaterial({ 
            color: color, metalness: 0.8, roughness: 0.2, emissive: color, emissiveIntensity: 0.2 
        });
        this.visualMesh = new THREE.Mesh(visualGeo, visualMat);
        this.visualMesh.position.y = 4;
        this.mesh.add(this.visualMesh);

        // --- 3. 3D MODEL LOADER ---
        // Pick the right file based on the machine type!
        const modelPath = type === 'AMMO' ? 'assets/vendingMachineBullets.glb' : 'assets/vendingMachineHP.glb';
        
        const loader = new GLTFLoader();
        loader.load(modelPath, (gltf) => {
            // Once the model loads, delete the colored placeholder box
            this.mesh.remove(this.visualMesh); 
            
            const model = gltf.scene;
            
            
            // If it's too big/small, change this:
            model.scale.set(5, 5, 5); 
            // If it is sinking into the floor, raise the Y value:
            model.position.set(0, 4, 0); 
            // If it is facing the wrong way, rotate it on the Y axis:
            // model.rotation.y = Math.PI; 

            // Make sure the new model casts and receives shadows
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.mesh.add(model);
        });

        this.scene.add(this.mesh);

        this.scene.add(this.mesh);
    }
}