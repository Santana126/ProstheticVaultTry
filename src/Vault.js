import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export class Vault {
    constructor(scene, physicsManager, position = new THREE.Vector3(0, 0, 0), scale = 1) {
        this.scene = scene;
        this.physicsManager = physicsManager; 
        this.isOpen = false;

        // Materials
        this.metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 });
        this.wheelMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9, roughness: 0.3 });
        this.wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.9 }); 
        this.goldMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 1.0, roughness: 0.1, emissive: 0xaa6600, emissiveIntensity: 0.5 });

        this.group = new THREE.Group();
        this.group.position.copy(position); 
        this.group.scale.set(scale, scale, scale);
        
        this.buildModel();
        this.buildRoom(); 

        this.scene.add(this.group);
        
        // Calculate interaction zones
        this.group.updateMatrixWorld(true);
        this.openBox = new THREE.Box3().setFromObject(this.openTriggerMesh);
        this.winBox = new THREE.Box3().setFromObject(this.winTriggerMesh);
    }

    buildModel() {
        this.hinge = new THREE.Group();
        this.group.add(this.hinge); 

        const doorGeometry = new THREE.BoxGeometry(4, 4, 0.5);
        this.door = new THREE.Mesh(doorGeometry, this.metalMat);
        this.door.position.set(2, 0, 0); 
        this.hinge.add(this.door);

        const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 16);
        this.wheel = new THREE.Mesh(wheelGeometry, this.wheelMat);
        this.wheel.rotation.x = Math.PI / 2; 
        this.wheel.position.set(0, 0, 0.3);  
        this.door.add(this.wheel);

        const handleGeometry = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
        const handle1 = new THREE.Mesh(handleGeometry, this.metalMat);
        const handle2 = new THREE.Mesh(handleGeometry, this.metalMat);
        handle2.rotation.z = Math.PI / 2; 
        handle1.rotation.x = Math.PI / 2;
        handle2.rotation.x = Math.PI / 2;
        this.wheel.add(handle1);
        this.wheel.add(handle2);

        const boltGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5);
        this.boltTop = new THREE.Mesh(boltGeometry, this.metalMat);
        this.boltTop.position.set(0, 2, 0); 
        this.door.add(this.boltTop);
        
        this.boltBottom = new THREE.Mesh(boltGeometry, this.metalMat);
        this.boltBottom.position.set(0, -2, 0); 
        this.door.add(this.boltBottom);
        this.physicsManager.addColliders([this.door]);
    }

    buildRoom() {
        const walls = [];

        // Floor & Ceiling 
        const floorGeo = new THREE.BoxGeometry(6, 1, 15);
        
        const floor = new THREE.Mesh(floorGeo, this.wallMat);
        floor.position.set(2, -2.8, -7.5); 
        
        const ceiling = new THREE.Mesh(floorGeo, this.wallMat);
        ceiling.position.set(2, 2.5, -7.5); 
        
        this.group.add(floor, ceiling);
        walls.push(floor, ceiling);

        // Left & Right Walls 
        const sideGeo = new THREE.BoxGeometry(1, 4, 15);
        
        const leftWall = new THREE.Mesh(sideGeo, this.wallMat);
        leftWall.position.set(-0.5, 0, -7.5); 
        
        const rightWall = new THREE.Mesh(sideGeo, this.wallMat);
        rightWall.position.set(4.5, 0, -7.5); 
        
        this.group.add(leftWall, rightWall);
        walls.push(leftWall, rightWall);

        // Back Wall
        const backGeo = new THREE.BoxGeometry(6, 6, 1);
        const backWall = new THREE.Mesh(backGeo, this.wallMat);
        backWall.position.set(2, 0, -14.5);
        this.group.add(backWall);
        walls.push(backWall);

        this.physicsManager.addColliders(walls);

        // Loot Pedestal
        const pedGeo = new THREE.CylinderGeometry(1, 1.5, 2, 16);
        const pedestal = new THREE.Mesh(pedGeo, this.metalMat);
        pedestal.position.set(2, -1, -11); 
        this.group.add(pedestal);

        // Glowing Core
        const coreGeo = new THREE.OctahedronGeometry(0.8);
        const core = new THREE.Mesh(coreGeo, this.goldMat);
        core.position.set(2, 1, -11);
        this.group.add(core);

        const vaultLight = new THREE.PointLight(0xffaa00, 2, 20);
        vaultLight.position.set(2, 1.5, -11);
        this.group.add(vaultLight);

        // Outside Trigger Box
        const openGeo = new THREE.BoxGeometry(6, 6, 6);
        const triggerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, visible: false }); 
        
        this.openTriggerMesh = new THREE.Mesh(openGeo, triggerMat);
        this.openTriggerMesh.position.set(2, 0, 3); 
        this.group.add(this.openTriggerMesh);

        // Inside Trigger Box (Win Condition)
        const winGeo = new THREE.BoxGeometry(4, 4, 4);
        this.winTriggerMesh = new THREE.Mesh(winGeo, triggerMat);
        this.winTriggerMesh.position.set(2, 0, -11); 
        this.group.add(this.winTriggerMesh);
    }

    open() {
        if (this.isOpen) return; 
        this.isOpen = true;
        this.physicsManager.removeCollider(this.door);

        const spinWheel = new TWEEN.Tween(this.wheel.rotation)
            .to({ y: this.wheel.rotation.y + (Math.PI * 2) }, 1500)
            .easing(TWEEN.Easing.Quadratic.InOut);

        const retractBoltsTop = new TWEEN.Tween(this.boltTop.position).to({ y: 1.2 }, 800).easing(TWEEN.Easing.Cubic.Out);
        const retractBoltsBottom = new TWEEN.Tween(this.boltBottom.position).to({ y: -1.2 }, 800).easing(TWEEN.Easing.Cubic.Out);

        const swingDoor = new TWEEN.Tween(this.hinge.rotation)
            .to({ y: Math.PI / 2 }, 2000)
            .easing(TWEEN.Easing.Sinusoidal.InOut);

        spinWheel.onComplete(() => { retractBoltsTop.start(); retractBoltsBottom.start(); });
        retractBoltsTop.onComplete(() => { swingDoor.start(); });
        spinWheel.start();
    }
}