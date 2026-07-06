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

        // --- 3. 3D MODEL LOADER (Uncomment when you have your model!) ---
        /*
        const loader = new GLTFLoader();
        loader.load('assets/vending_machine.glb', (gltf) => {
            this.mesh.remove(this.visualMesh); // Hide the placeholder box
            const model = gltf.scene;
            model.scale.set(1, 1, 1);
            this.mesh.add(model);
        });
        */

        this.scene.add(this.mesh);
    }
}