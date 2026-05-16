import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class WorldItem {
    constructor(scene, itemData, x, y, z) {
        this.scene = scene;
        this.itemData = itemData; 
        
        this.time = 0;
        this.baseY = y;
        
        this.mesh = new THREE.Group(); 
        this.mesh.position.set(x, y, z);
        
        // 1. CREATE THE INVISIBLE HITBOX
        // A 2x2x2 box is huge and very forgiving for the player to look at!
        // Use a ball 
        const hitBoxGeometry = new THREE.SphereGeometry(2, 32, 32); 
        const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            wireframe: true, 
            visible: true // Change to 'true' while testing 
        });
        this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);

        // 2. TAG THE HITBOX
        this.hitBox.userData = {
            interactable: true,
            type: 'item',
            itemId: itemData.id,
            name: itemData.name, 
            entity: this 
        };

        // Add the hitbox to our group
        this.mesh.add(this.hitBox);
        
        this.scene.add(this.mesh);
        this.loadModel();

    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);

        loader.load(this.itemData.modelPath, (gltf) => {
            const model = gltf.scene;
            
            // 1. Center the model perfectly inside our group
            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.sub(center);
            
            // 2. Scale it so it looks good on the floor (using Database tuning if available)
            const scale = this.itemData.visualData ? this.itemData.visualData.scale : 1;
            model.scale.set(scale, scale, scale);

            // 3. Process the materials
            model.traverse((node) => {
                if (node.isMesh) {
                    if (!node.material) {
                        node.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                    }


                    // --- THE FIX ---
                    // Completely disable raycasting math for this high-poly object!
                    // The raycaster will pass right through it as if it were a ghost,
                    // and only hit your invisible 2x2 green box!
                    node.raycast = function() {}; 
                    
                    // Turn off shadows for ground loot (Shadows on high-poly models kill FPS)
                    node.castShadow = false; 
                    node.receiveShadow = false;
                    
                    // We REMOVED the userData tagging from here! 
                    // Now, the raycaster will ignore the complex 3D model completely.
                }
            });

            this.mesh.add(model);
            
            // Visual Juice: Add a tiny glowing light to make it look like rare loot!
            const light = new THREE.PointLight(0x00d4ff, 1, 2);
            light.position.set(0, 0.5, 0);
            this.mesh.add(light);
        });
    }

    // Called every frame by main.js
    update(delta) {
        this.time += delta;
        
        // Spin slowly
        this.mesh.rotation.y += delta;
        
        // Bob up and down using a sine wave
        this.mesh.position.y = this.baseY + Math.sin(this.time * 3) * 0.15;
    }

    // Called by the InteractionManager when the player picks it up
    destroy() {
        this.scene.remove(this.mesh);
        
        // Clean up memory to prevent leaks
        this.mesh.traverse((node) => {
            if (node.isMesh) {
                if (node.geometry) node.geometry.dispose();
                if (node.material) node.material.dispose();
            }
        });
    }
}