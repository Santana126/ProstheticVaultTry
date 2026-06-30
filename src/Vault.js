import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js'; // Assuming you are using an import/bundler setup

export class Vault {
    constructor(scene, position = new THREE.Vector3(0, 0, 0), scale = 1) {
        this.scene = scene;
        this.isOpen = false;

        // 1. Create Materials
        this.metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
        this.wheelMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9, roughness: 0.3 });

        // 2. Build the Hierarchy
        this.buildModel(position);

        this.group.scale.set(scale, scale, scale);
        
        // 3. Add to Scene
        this.scene.add(this.group);
    }

    buildModel(position) {
        this.group = new THREE.Group();
        
        // The Hinge (Parent)
        this.hinge = new THREE.Group();
        this.hinge.position.copy(position); 
        this.group.add(this.hinge);

        // The Door (Child of Hinge)
        const doorGeometry = new THREE.BoxGeometry(4, 4, 0.5);
        this.door = new THREE.Mesh(doorGeometry, this.metalMat);
        this.door.position.set(2, 0, 0); 
        this.hinge.add(this.door);

        // The Wheel (Child of Door)
        const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 16);
        this.wheel = new THREE.Mesh(wheelGeometry, this.wheelMat);
        this.wheel.rotation.x = Math.PI / 2; 
        this.wheel.position.set(0, 0, 0.3);  
        this.door.add(this.wheel);

        // The Bolts (Children of Door)
        const boltGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5);
        this.boltTop = new THREE.Mesh(boltGeometry, this.metalMat);
        this.boltTop.position.set(0, 2, 0); 
        this.door.add(this.boltTop);
        
        this.boltBottom = new THREE.Mesh(boltGeometry, this.metalMat);
        this.boltBottom.position.set(0, -2, 0); 
        this.door.add(this.boltBottom);
    }

    // Method to trigger the animation
    open() {
        if (this.isOpen) return; // Prevent triggering multiple times
        this.isOpen = true;

        const spinWheel = new TWEEN.Tween(this.wheel.rotation)
            .to({ y: this.wheel.rotation.y + (Math.PI * 2) }, 1500)
            .easing(TWEEN.Easing.Quadratic.InOut);

        const retractBoltsTop = new TWEEN.Tween(this.boltTop.position)
            .to({ y: 1.2 }, 800)
            .easing(TWEEN.Easing.Cubic.Out);
            
        const retractBoltsBottom = new TWEEN.Tween(this.boltBottom.position)
            .to({ y: -1.2 }, 800)
            .easing(TWEEN.Easing.Cubic.Out);

        const swingDoor = new TWEEN.Tween(this.hinge.rotation)
            .to({ y: Math.PI / 2 }, 2000)
            .easing(TWEEN.Easing.Sinusoidal.InOut);

        spinWheel.onComplete(() => {
            retractBoltsTop.start();
            retractBoltsBottom.start();
        });

        retractBoltsTop.onComplete(() => {
            swingDoor.start();
        });

        spinWheel.start();
    }
}