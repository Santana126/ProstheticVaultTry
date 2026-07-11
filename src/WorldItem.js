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
        this.mesh.userData = { entity: this };
        
        const hitBoxGeometry = new THREE.SphereGeometry(2, 32, 32); 
        const hitBoxMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            wireframe: true, 
            visible: false 
        });
        
        this.hitBox = new THREE.Mesh(hitBoxGeometry, hitBoxMaterial);
        this.hitBox.userData = {
            interactable: true,
            type: 'item',
            itemId: itemData.id,
            name: itemData.name, 
            entity: this 
        };

        this.mesh.add(this.hitBox);
        this.scene.add(this.mesh);
        
        this.loadModel();
    }

    loadModel() {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);

        loader.load(this.itemData.modelPath, (gltf) => {
            const model = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            box.getCenter(center);
            model.position.sub(center);
            
            const scale = this.itemData.visualData ? this.itemData.visualData.scale : 1;
            model.scale.set(scale, scale, scale);

            model.traverse((node) => {
                if (node.isMesh) {
                    if (!node.material) {
                        node.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
                    }
                    node.raycast = function() {}; 
                    node.castShadow = false; 
                    node.receiveShadow = false;
                }
            });

            this.mesh.add(model);
            
            const light = new THREE.PointLight(0x00d4ff, 1, 2);
            light.position.set(0, 0.5, 0);
            this.mesh.add(light);
        });
    }

    update(delta) {
        this.time += delta;
        this.mesh.rotation.y += delta;
        this.mesh.position.y = this.baseY + Math.sin(this.time * 3) * 0.15;
    }

    destroy() {
        this.scene.remove(this.mesh);
        
        this.mesh.traverse((node) => {
            if (node.isMesh) {
                if (node.geometry) node.geometry.dispose();
                if (node.material) node.material.dispose();
            }
        });
    }
}