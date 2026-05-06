import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- 1. BASIC SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Dark grey background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// PerspectiveCamera simulates the human eye (objects further away look smaller)


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


// --- GAME CONFIGURATION ---
const ARM_CONFIG = {
    basePos: { x: 1.5, y: 0.5, z: -6 }, // Change these to move the arm!
    scale: 0.1,
    rotation: { x: Math.PI / 2, y: -Math.PI / 3, z: Math.PI / 6 },
    bobSpeed: 10,
    bobAmountY: 0.02,
    bobAmountX: 0.01
};

// --- 2. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(5, 10, 7.5);
scene.add(sunLight);

// --- 3. THE ENVIRONMENT (The Floor) ---
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2; // Rotate plane to be flat on the ground
scene.add(floor);

// Add some random boxes so we have something to look at while moving
for (let i = 0; i < 20; i++) {
    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const boxMat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(Math.random() * 40 - 20, 0, Math.random() * 40 - 20);
    scene.add(box);
}


// --- 4. FPS CONTROLS ---
const controls = new PointerLockControls(camera, document.body);

const blocker = document.getElementById('blocker');
blocker.addEventListener('click', () => {
    controls.lock(); // Lock the mouse to the center of the screen
});

controls.addEventListener('lock', () => {
    blocker.style.display = 'none'; // Hide menu when game starts
});

controls.addEventListener('unlock', () => {
    blocker.style.display = 'flex'; // Show menu when ESC is pressed
});



// --- 5. MOVEMENT LOGIC ---
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let robotArm = false; // Placeholder for the robot arm model
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const onKeyDown = (event) => {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'KeyR': robotArm = !robotArm; break; // Toggle robot arm visibility with R key
    }
};

const onKeyUp = (event) => {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);


        
        // 3. POSITION (Relative to the camera lens)
        // X: 0.4 = slightly to the right
        // Y: -0.4 = slightly below the center
        // Z: -0.7 = slightly in front of the camera (prevent clipping)
        
        

// --- 7. THE POV ARM (The Body) ---

const armGroup = new THREE.Group();
camera.add(armGroup); 
scene.add(camera);

// We create a global variable to hold the actual model once it loads
let armModel = null; 
let bobTimer = 0;

const loader = new GLTFLoader();
loader.load('assets/arm.glb', (gltf) => {
    const model = gltf.scene;
    
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.x += (model.position.x - center.x);
    model.position.y += (model.position.y - center.y);
    model.position.z += (model.position.z - center.z);

    // USE THE CONFIG HERE
    model.scale.set(ARM_CONFIG.scale, ARM_CONFIG.scale, ARM_CONFIG.scale); 
    model.position.set(ARM_CONFIG.basePos.x, ARM_CONFIG.basePos.y, ARM_CONFIG.basePos.z); 
    model.rotation.set(ARM_CONFIG.rotation.x, ARM_CONFIG.rotation.y, ARM_CONFIG.rotation.z); 

    armModel = model;
    armGroup.add(armModel);
});

// --- 8. THE GAME LOOP ---
let prevTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (controls.isLocked) {
        // --- EXISTING MOVEMENT LOGIC ---
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // --- NEW: NATURAL ARM BOBBING ---
        if (armModel) {
            if (moveForward || moveBackward || moveLeft || moveRight) {
                bobTimer += delta * ARM_CONFIG.bobSpeed; 
                
                const bobY = Math.sin(bobTimer) * ARM_CONFIG.bobAmountY; 
                const bobX = Math.cos(bobTimer * 0.5) * ARM_CONFIG.bobAmountX; 
                
                // USE THE CONFIG HERE instead of hardcoded numbers
                armModel.position.y = ARM_CONFIG.basePos.y + bobY;
                armModel.position.x = ARM_CONFIG.basePos.x + bobX;
            } else {
                bobTimer = 0;
                // Smoothly return to the CONFIG values
                armModel.position.y = THREE.MathUtils.lerp(armModel.position.y, ARM_CONFIG.basePos.y, 0.1);
                armModel.position.x = THREE.MathUtils.lerp(armModel.position.x, ARM_CONFIG.basePos.x, 0.1);
            }
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}


// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();


// comment
