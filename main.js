import * as THREE from 'three';
import { Player } from './src/Player.js';
import { Arm } from './src/Arm.js';
import { Level } from './src/Level.js';
import { ITEM_DATABASE } from './src/Database.js';
import { UIManager } from './src/UIManager.js';
import { VFXManager } from './src/VFXManager.js';
import { PhysicsManager } from './src/PhysicsManager.js';
import { Dummy } from './src/Dummy.js';
import { ProjectileManager } from './src/ProjectileManager.js';
import { AnimationManager } from './src/AnimationManager.js';
import { WorldItem } from './src/WorldItem.js';
import { InteractionManager } from './src/InteractionManager.js';
import { Enemy } from './src/Enemy.js';
import { WaveManager } from './src/WaveManager.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

const ktx2Loader = new KTX2Loader()
    // We use a safe CDN to grab the complex transcoder files Three.js needs
    .setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/')
    .detectSupport(renderer);


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
// const level = new Level(scene, new PhysicsManager());
// level.buildVaultLayout(); // One line to build the whole world!

const physicsManager = new PhysicsManager();
// physicsManager.addColliders(level.walls); // Tell the physics manager about the walls
const vfxManager = new VFXManager(scene);
const projectileManager = new ProjectileManager(scene);
const animationManager = new AnimationManager();
const uiManager = new UIManager();
const interactionManager = new InteractionManager(scene, camera, uiManager);

// Add it as the 4th argument!
// const player = new Player(scene, camera, level, vfxManager);
const player = new Player(scene, camera, physicsManager, vfxManager, projectileManager, animationManager, interactionManager);


let isGameOver = false;

// Listen for the player's death
document.addEventListener('playerDied', () => {
    isGameOver = true;
    
    // Unlock the mouse so they can click "Try Again"
    player.controls.unlock(); 
    
    // Show the red overlay
    uiManager.showGameOver();
});

const steelArm = ITEM_DATABASE.arms['steel_arm'];
player.inventory.equip('RIGHT_ARM', steelArm);
uiManager.renderStash(player.inventory.getOwnedItems());
//Spawn a target dummy in the arena (X: 0, Y: 0, Z: -30)
const targetDummy = new Dummy(scene, physicsManager, 20, 0, -30);

const groundLoot = new WorldItem(scene, ITEM_DATABASE.arms['laser_arm'], 15, 1, 30);
interactionManager.addInteractable(groundLoot.mesh);

const groundLoot2 = new WorldItem(scene, ITEM_DATABASE.arms['saw_arm'], -15, 1, 35);
interactionManager.addInteractable(groundLoot2.mesh);

const activeWorldItems = [];


// Initialize the Wave Manager
const waveManager = new WaveManager(scene, physicsManager, player, interactionManager, activeWorldItems, ktx2Loader);

// Start the first wave 2 seconds after the game loads!
setTimeout(() => {
    waveManager.startNextWave();
}, 2000);



// CREATE AN ARM ITEM AND EQUIP IT
// const steelArm = new Arm(
//     'steel_arm', // Set to match the database ID
//     'Steel Arm', 
//     'A heavy industrial prosthetic', 
//     'LEFT_ARM', 
//     'assets/arm.glb', 
//     { strength: 15 }, 
//     { damage: 20, attackSpeed: 0.8, attackType: 'melee' }
// );
// player.inventory.equip('LEFT_ARM', steelArm);



document.addEventListener('inventoryToggled', (e) => {
    if (e.detail.isOpen) {
        player.controls.unlock();
    } else {
        player.controls.lock();
    }
});

document.addEventListener('equipItem', (e) => {
    const slotToEquip = e.detail.slot;
    const itemToEquip = ITEM_DATABASE.arms[e.detail.itemId];
    player.inventory.equip(slotToEquip, itemToEquip);
});

document.addEventListener('currencyCollected', (e) => {
    // This calls the gainBolts method we added to Player.js earlier!
    player.gainBolts(e.detail.amount);
});

// Controls
const blocker = document.getElementById('blocker');
blocker.addEventListener('click', () => player.controls.lock());
player.controls.addEventListener('lock', () => blocker.style.display = 'none');
player.controls.addEventListener('unlock', () => blocker.style.display = 'flex');


// Keep 'E' for inventory in main.js, InputManager handles the rest!
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
        uiManager.toggleInventory(); 
    }
});

// --- THE FINISH LINE ---
// Create a 5x5x5 invisible box
const winGeometry = new THREE.BoxGeometry(5, 50, 5);
const winMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00, 
    wireframe: true, 
    visible: true // Change to true if you want to see it for testing!
});
const winTrigger = new THREE.Mesh(winGeometry, winMaterial);

// TODO: Change these coordinates to the center of your Gold Vault!
winTrigger.position.set(0, 2.5, -80); 
scene.add(winTrigger);

// Create a mathematical bounding box so we can check for overlaps
const winBox = new THREE.Box3().setFromObject(winTrigger);
let hasWon = false;


// --- GAME LOOP ---
let prevTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if(!isGameOver && !hasWon) {
        player.update(delta);

        vfxManager.update(delta);
        projectileManager.update(delta, physicsManager, vfxManager);

        groundLoot.update(delta);
        groundLoot2.update(delta);

        waveManager.update(delta, vfxManager);

        // CHECK WIN CONDITION
        if (winBox.containsPoint(player.camera.position)) {
            const ownedItems = player.inventory.getOwnedItems();
            const hasKey = ownedItems.includes('vault_key');
            
            if (hasKey) {
                hasWon = true;
                player.controls.unlock(); 
                uiManager.showWinScreen(); 
            } else {
                console.log("The Vault is locked. Defeat the boss to get the key!");
            }
        }

    }

    prevTime = time;

    renderer.render(scene, camera);
}

animate();