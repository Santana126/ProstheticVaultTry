import * as THREE from 'three';
import { Player } from './src/Player.js';
import { Arm } from './src/Arm.js';
import { Level } from './src/Level.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting (Keep your lighting and floor code here)
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(5, 10, 7.5);
scene.add(sunLight);

// --- 3. THE ENVIRONMENT (The Floor) ---
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a2e, // Deep Midnight Blue
    roughness: 0.8 
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ADD A GRID HELPER: This creates the "technical" look
// Parameters: (size, divisions, centerColor, gridColor)
const gridHelper = new THREE.GridHelper(100, 50, 0x4444ff, 0x222244);
scene.add(gridHelper);

// Initialize Level
const level = new Level(scene);
level.createRoom(0, 0, 20);
level.addWall(5, 2, -5, 2, 4, 2, 0xff0000); // Add a random red pillar to test collision

// Initialize Player
const player = new Player(scene, camera, level);

// CREATE AN ARM ITEM AND EQUIP IT
const steelArm = new Arm(
    'steel_arm_01', 
    'Steel Arm', 
    'A heavy industrial prosthetic', 
    'LEFT_ARM', 
    'assets/arm.glb', 
    { strength: 15 }, 
    { damage: 20, attackSpeed: 0.8, attackType: 'melee' }
);

player.equip('LEFT_ARM', steelArm);

// Controls
const blocker = document.getElementById('blocker');
blocker.addEventListener('click', () => player.controls.lock());
player.controls.addEventListener('lock', () => blocker.style.display = 'none');
player.controls.addEventListener('unlock', () => blocker.style.display = 'flex');

document.addEventListener('keydown', (e) => player.setMoveState(e.code, true));
document.addEventListener('keyup', (e) => player.setMoveState(e.code, false));

// Game Loop
let prevTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    player.update(delta);

    prevTime = time;
    renderer.render(scene, camera);
}
animate();