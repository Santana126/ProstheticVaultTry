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
import { Vault } from './src/Vault.js';
import * as TWEEN from '@tweenjs/tween.js';
import { ShopManager } from './src/ShopManager.js';

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

// Listen for weapon overheat backfires!
document.addEventListener('overheatDamage', (e) => {
    player.takeDamage(e.detail.amount);
});

const steelArm = ITEM_DATABASE.arms['steel_arm'];
player.inventory.equip('RIGHT_ARM', steelArm);
uiManager.renderStash(player.inventory.getOwnedItems());
//Spawn a target dummy in the arena (X: 0, Y: 0, Z: -30)
const targetDummy = new Dummy(scene, physicsManager, 20, 0, -30);

const groundLoot = new WorldItem(scene, ITEM_DATABASE.arms['laser_arm'], 15, 1, 30);
interactionManager.addInteractable(groundLoot.mesh);

// const groundLoot2 = new WorldItem(scene, ITEM_DATABASE.arms['saw_arm'], -15, 1, 35);
// interactionManager.addInteractable(groundLoot2.mesh);

const beltLoot = new WorldItem(
    scene, 
    ITEM_DATABASE.belts['thruster_belt'], 
    10, 1, 20 // X, Y, Z coordinates (tweak these so it spawns where you want it!)
);
interactionManager.addInteractable(beltLoot.mesh);

const activeWorldItems = [];

activeWorldItems.push(beltLoot);

// Initialize the Wave Manager
const waveManager = new WaveManager(scene, physicsManager, player, interactionManager, activeWorldItems, ktx2Loader);
// Initialize the Shop Manager
const shopManager = new ShopManager(player, uiManager, waveManager);

// // Start the first wave 2 seconds after the game loads!
// setTimeout(() => {
//     waveManager.startNextWave();
// }, 2000);

const vaultPosition = new THREE.Vector3(10, 2.5, -20);
const vaultScale = 2.5;

const levelVault = new Vault(scene, vaultPosition, vaultScale);

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
    if (e.detail && e.detail.item) {
        player.inventory.equip(e.detail.slot, e.detail.item);
    } else {
        console.error("Equip Event fired, but item data is missing!", e.detail);
    }
});

document.addEventListener('currencyCollected', (e) => {
    // This calls the gainBolts method we added to Player.js earlier!
    player.gainBolts(e.detail.amount);
});

// Controls
let gamePaused = true; // The game starts paused on the menu!
let firstStart = false; // Tracks if we've begun the first wave

const blocker = document.getElementById('blocker');
blocker.addEventListener('click', () => player.controls.lock());
player.controls.addEventListener('lock', () => {
    blocker.style.display = 'none';
    gamePaused = false; // Unpause when we click into the game

    // Start the first wave 2 seconds after they click "Start" for the first time
    if (!firstStart) {
        firstStart = true;
        setTimeout(() => {
            waveManager.startNextWave();
        }, 5000);
    }
});

player.controls.addEventListener('unlock', () => {
    gamePaused = true; // Pause game logic immediately when ESC is pressed

    // Only show the start menu if we aren't currently looking at the inventory!
    const invOverlay = document.getElementById('inventory-overlay');
    if (invOverlay.style.display === 'none' || invOverlay.style.display === '') {
        blocker.style.display = 'flex';
    }
});


// Keep 'E' for inventory in main.js, InputManager handles the rest!
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
        uiManager.toggleInventory(); 
    }

    // --- VAULT INTERACTION (PHASE 1 & 2) ---
    if (e.code === 'KeyO' && !hasWon) {
        if (winBox.containsPoint(player.camera.position)) {
            
            // PHASE 1: OPENING THE VAULT
            if (!vaultOpened) {
                const ownedItems = player.inventory.getOwnedItems();
                const hasKey = ownedItems.includes('vault_key');
                
                if (hasKey) {
                    console.log("Key accepted! Opening Vault...");
                    vaultOpened = true; 
                    levelVault.open();
                } else {
                    console.log("The Vault is locked. Defeat the boss to get the key!");
                }
            } 
            // PHASE 2: ENTERING THE VAULT
            else {
                console.log("Entering Vault! You Win!");
                hasWon = true; 
                
                // Hide the prompt, unlock the mouse, and show the win screen
                document.getElementById('vault-prompt').style.display = 'none';
                player.controls.unlock(); 
                uiManager.showWinScreen(); 
            }
        }
    }
});

// --- THE FINISH LINE ---
const winGeometry = new THREE.BoxGeometry(10, 10, 10); 
const winMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00, 
    wireframe: true, 
    visible: false 
});
const winTrigger = new THREE.Mesh(winGeometry, winMaterial);

// --- DYNAMIC POSITIONING LOGIC ---

// 1. Force Three.js to calculate the math for the scale and positions immediately
// (By default, Three.js waits until the first frame is rendered to do this)
levelVault.group.updateMatrixWorld(true);

// 2. Create an empty Vector to hold our coordinate data
const doorGlobalPosition = new THREE.Vector3();

// 3. Ask the vault's door for its exact global position
levelVault.door.getWorldPosition(doorGlobalPosition);

// 4. Move the trigger box to exactly match the door's center
winTrigger.position.copy(doorGlobalPosition);

// 5. Shift the box slightly forward on the Z-axis so it sits right in front of the door
// (Adjust this number if you want the box closer or further from the door)
winTrigger.position.z += 3; 

scene.add(winTrigger);

const winBox = new THREE.Box3().setFromObject(winTrigger);
let hasWon = false;
let vaultOpened = false;


// --- GAME LOOP ---
let prevRealTime = performance.now();
// let gameTime = 0; // We use a custom timer so animations pause perfectly!

function animate() {
    requestAnimationFrame(animate);
    // Always calculate real delta time so the math doesn't explode when we unpause
    const realTime = performance.now();
    const delta = (realTime - prevRealTime) / 1000;
    prevRealTime = realTime;
    TWEEN.update(realTime); 

    if(!isGameOver && !hasWon && !gamePaused) {
        // Advance our custom game timer
        // gameTime += delta * 1000;
        // Update Dash UI
        uiManager.updateDash(player.dashCooldownTimer, 3.5); // 3.5 is your new cooldown

        // Update Weapon UI
        const activeArm = player.inventory.getActiveArm();
        if (activeArm) {
            if (activeArm.id === 'plasma_arm') {
                uiManager.updateAmmo(activeArm.currentAmmo, activeArm.maxAmmo);
            } else if (activeArm.id === 'laser_arm') {
                uiManager.updateHeat(activeArm.heat, activeArm.maxHeat);
            } else {
                uiManager.hideCombatHUD();
            }
        } else {
            uiManager.hideCombatHUD();
        }
        player.update(delta);

        // --- VAULT UI TOGGLE ---
        if (!hasWon) {
            const vaultPrompt = document.getElementById('vault-prompt');
            const vaultActionText = document.getElementById('vault-action-text');

            // If the player is standing inside the trigger zone
            if (winBox.containsPoint(player.camera.position)) {
                vaultPrompt.style.display = 'block'; // Show the prompt
                
                // Swap the text and colors based on the vault's state
                if (!vaultOpened) {
                    vaultActionText.innerText = 'Open Vault';
                    vaultActionText.style.color = '#ffaa00'; // Orange when closed
                    vaultPrompt.style.borderColor = '#ffaa00';
                } else {
                    vaultActionText.innerText = 'Enter Vault';
                    vaultActionText.style.color = '#00ff00'; // Green when open
                    vaultPrompt.style.borderColor = '#00ff00';
                }
            } else {
                // If they step out of the zone, hide it
                vaultPrompt.style.display = 'none';
            }
        }

        vfxManager.update(delta);
        projectileManager.update(delta, physicsManager, vfxManager);

        groundLoot.update(delta);
        // groundLoot2.update(delta);
        beltLoot.update(delta);

        waveManager.update(delta, vfxManager);

        // // CHECK WIN CONDITION
        // if (winBox.containsPoint(player.camera.position)) {
        //     const ownedItems = player.inventory.getOwnedItems();
        //     const hasKey = ownedItems.includes('vault_key');
            
        //     if (hasKey) {
        //         hasWon = true;
        //         levelVault.open();
        //         player.controls.unlock(); 
        //         uiManager.showWinScreen(); 
        //     } else {
        //         console.log("The Vault is locked. Defeat the boss to get the key!");
        //     }
        // }

    }

    // prevTime = time;

    renderer.render(scene, camera);
}

animate();