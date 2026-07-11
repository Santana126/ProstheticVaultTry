import * as THREE from 'three';
import { Player } from './src/Player.js';
import { Arm } from './src/Arm.js';
import { Level } from './src/Level.js';
import { ITEM_DATABASE } from './src/Database.js';
import { UIManager } from './src/UIManager.js';
import { VFXManager } from './src/VFXManager.js';
import { PhysicsManager } from './src/PhysicsManager.js';
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
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { VendingMachine } from './src/VendingMachine.js';

// Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const ktx2Loader = new KTX2Loader()
    .setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/')
    .detectSupport(renderer);


renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(5, 10, 7.5);
scene.add(sunLight);


const exrLoader = new EXRLoader();
exrLoader.load('assets/environment/sky/night_sky.exr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping; 
    scene.background = texture; 
    scene.environment = texture; 
});

const physicsManager = new PhysicsManager();
const level = new Level(scene, physicsManager, renderer);
const vfxManager = new VFXManager(scene);
const projectileManager = new ProjectileManager(scene);
const animationManager = new AnimationManager();
const uiManager = new UIManager();
window.uiManager = uiManager; 
const interactionManager = new InteractionManager(scene, camera, uiManager);
const player = new Player(scene, camera, physicsManager, vfxManager, projectileManager, animationManager, interactionManager, ktx2Loader);


let isGameOver = false;

// Listen for the player's death
document.addEventListener('playerDied', () => {
    isGameOver = true;
    
    player.controls.unlock(); 
    uiManager.showGameOver();
});

// Listen for weapon overheat backfires!
document.addEventListener('overheatDamage', (e) => {
    player.takeDamage(e.detail.amount);
});


const torchArm = ITEM_DATABASE.arms['torch_arm'];
player.inventory.unlockItem('torch_arm'); 
player.inventory.equip('LEFT_ARM', torchArm);
const steelArm = ITEM_DATABASE.arms['steel_arm'];
player.inventory.equip('RIGHT_ARM', steelArm);

uiManager.renderStash(player.inventory.getOwnedItems());

const groundLoot = new WorldItem(scene, ITEM_DATABASE.arms['laser_arm'], 15, 1, 30);
interactionManager.addInteractable(groundLoot.mesh);

// Add an Ammo machine and a Health machine to the arena
const ammoMachine = new VendingMachine(scene, physicsManager, -70, 0, -50, 'AMMO', 15);
const healthMachine = new VendingMachine(scene, physicsManager, 70, 0, -50, 'HEALTH', 25);

interactionManager.addInteractable(ammoMachine.hitbox);
interactionManager.addInteractable(healthMachine.hitbox);

const beltLoot = new WorldItem(
    scene, 
    ITEM_DATABASE.belts['thruster_belt'], 
    10, 1, 20 
);
interactionManager.addInteractable(beltLoot.mesh);

const activeWorldItems = [];
activeWorldItems.push(beltLoot);

// Initialize the Wave Manager
const waveManager = new WaveManager(scene, physicsManager, player, interactionManager, activeWorldItems, ktx2Loader);
// Initialize the Shop Manager
const shopManager = new ShopManager(player, uiManager, waveManager);

const vaultPosition = new THREE.Vector3(50, 5, -70);
const vaultScale = 2.5;
const levelVault = new Vault(scene, physicsManager, vaultPosition, vaultScale);

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
    player.gainBolts(e.detail.amount);
});

// Controls
let gamePaused = true; // The game starts paused on the menu
let firstStart = false; // Tracks if we've begun the first wave
let isIntroPlaying = false;
let hasSeenArmTutorial = false;
let hasSeenBeltTutorial = false;

const blocker = document.getElementById('blocker');
blocker.addEventListener('click', () => player.controls.lock());
const difficultyBlocker = document.getElementById('difficulty-blocker');
const btnEasy = document.getElementById('btn-easy');
const btnNormal = document.getElementById('btn-normal');
blocker.style.display = 'none';
btnEasy.addEventListener('click', () => {
    waveManager.waves = [
        { count: 3, isBossWave: false }, // Wave 1
        { count: 5, isBossWave: false }, // Wave 2
        { count: 4, isBossWave: true }   // Wave 3: 1 Boss + 3 Minions
    ];
    
    // Transition to the main menu blocker
    difficultyBlocker.style.display = 'none';
    blocker.style.display = 'flex';
});

btnNormal.addEventListener('click', () => {
    waveManager.waves = [
        { count: 5, isBossWave: false },  // Wave 1
        { count: 7, isBossWave: false },  // Wave 2
        { count: 10, isBossWave: false }, // Wave 3
        { count: 8, isBossWave: true }    // Wave 4: 1 Boss + 7 Minions (8 total)
    ];
    
    // Transition to the main menu blocker
    difficultyBlocker.style.display = 'none';
    blocker.style.display = 'flex';
});

blocker.addEventListener('click', () => player.controls.lock());

player.controls.addEventListener('lock', () => {
    blocker.style.display = 'none';
    
    if (!firstStart) {
        firstStart = true;
        
        window.uiManager.showTransmission(
            'assets/narr_prost.png', '', 
            'Drop successful, Vault Hunter; you are in the hot zone. Grab any scrap weapons on the ground, zero those hostiles, and collect every Bolt they drop. We need that salvage to survive this wretched sector and complete the mission.', 
            () => {
                setTimeout(() => { waveManager.startNextWave(); }, 4000); 
            }
        );
    } else if (!window.isTransmissionActive) {
        gamePaused = false; 
    }
});

player.controls.addEventListener('unlock', () => {
    gamePaused = true; 

    const invOverlay = document.getElementById('inventory-overlay');
    const shopOverlay = document.getElementById('shop-overlay');
    
    //only show the main pause screen (blocker) if the inventory and shop are closed
    if (
        (!invOverlay || invOverlay.style.display === 'none' || invOverlay.style.display === '') &&
        (!shopOverlay || shopOverlay.style.display === 'none' || shopOverlay.style.display === '') &&
        (!window.isTransmissionActive)
    ) {
        blocker.style.display = 'flex';
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


document.addEventListener('transmissionStarted', () => { 
    gamePaused = true; 
    player.controls.unlock();
    
    const rightArm = player.inventory.getEquippedItem('RIGHT_ARM');
    const leftArm = player.inventory.getEquippedItem('LEFT_ARM');
    
    if (rightArm) {
        if (typeof rightArm.stopAttack === 'function') rightArm.stopAttack(scene);
        if (typeof rightArm.stopFiring === 'function') rightArm.stopFiring(scene);
    }
    if (leftArm) {
        if (typeof leftArm.stopAttack === 'function') leftArm.stopAttack(scene);
        if (typeof leftArm.stopFiring === 'function') leftArm.stopFiring(scene);
    }
});
document.addEventListener('transmissionEnded', () => { 
    gamePaused = false;
    player.controls.lock();
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
        uiManager.toggleInventory(); 
    }

    if (e.code === 'KeyQ' && !hasWon) {
        
        if (!vaultOpened && levelVault.openBox.containsPoint(player.camera.position)) {
            const ownedItems = player.inventory.getOwnedItems();
            if (ownedItems.includes('vault_key')) {
                console.log("Key accepted! Opening Vault...");
                vaultOpened = true; 
                levelVault.open();
                
                window.uiManager.showTransmission(
                    'assets/narr_prost.png', '', 
                    'The genetic cipher is accepted, and the Vault is finally open. Move in immediately to secure that pulsing artifact before the entire sector\'s power grid collapses. Grab the package and prepare for immediate orbital extraction!'
                );
            } else {
                window.uiManager.showTransmission(
                    'assets/narr_prost.png', '', 
                    'Negative, Hunter, that massive Vault door\'s biometric lock is sealed tight and cannot be forced. It requires a specific genetic cipher to breach the system. Scans indicate the final anomaly holding that key has yet to show its face.'
                );
            }
        }
        else if (vaultOpened && levelVault.winBox.containsPoint(player.camera.position)) {
            console.log("Artifact claimed! You Win!");
            hasWon = true; 
            
            document.getElementById('vault-prompt').style.display = 'none';
            player.controls.unlock(); 
            uiManager.showWinScreen(); 
        }
    }
});

// ITEM PICKUPS 
document.addEventListener('inventoryUpdated', (e) => {
    if (!e.detail || !e.detail.ownedItems) return;
    
    const owned = e.detail.ownedItems;
    
    // Check if the user picked up any Arm for the first time
    if (!hasSeenArmTutorial && (owned.includes('laser_arm') || owned.includes('plasma_arm'))) {
        hasSeenArmTutorial = true;
        window.uiManager.showTransmission(
            'assets/narr_prost.png', '',
            'Solid acquisition, Hunter; that is a mil-spec weaponized prosthetic. Access your suit\'s inventory interface and equip the arm directly to your chassis. Calibrate your servos and prepare for heavy combat because they know you are here.'
        );
    }
    
    // Check if the user picked up the Belt for the first time
    if (!hasSeenBeltTutorial && owned.includes('thruster_belt')) {
        hasSeenBeltTutorial = true;
        window.uiManager.showTransmission(
            'assets/narr_prost.png', '',
            'Belt module secured and integrated, bringing your suit\'s kinetic thrusters fully online. Your mobility is now upgraded, so use the dash function to evade incoming enemy fire and reposition. Keep moving, or you will be turned into scrap.'
        );
    }
});

// Listen for Vending Machine purchases
document.addEventListener('useVendingMachine', (e) => {
    const machine = e.detail;

    if (player.bolts >= machine.cost) {
        player.bolts -= machine.cost; // Take the money

        if (machine.type === 'AMMO') {
            const arm = player.inventory.getActiveArm();
            if (arm) {
                if (arm.maxAmmo) arm.currentAmmo = arm.maxAmmo;
                if (arm.heat !== undefined) arm.heat = 0; // Vent heat instantly
                console.log("Weapons fully reloaded/cooled!");
            }
        } else if (machine.type === 'HEALTH') {
            player.health = Math.min(player.health + 40, player.maxHealth);
            uiManager.updateHealthBar(player.health, player.maxHealth);
            console.log("Health restored!");
        }

        uiManager.updateEconomy(player.level, player.exp, player.maxExp, player.bolts);
    } else {
        console.log("Not enough bolts!");
    }
});


const textureLoader = new THREE.TextureLoader();
const bossSpellTexture = textureLoader.load('assets/spell_texture.png'); 

const bossSpellMaterial = new THREE.MeshBasicMaterial({ 
    map: bossSpellTexture,
    color: 0xffffff, 
    transparent: true
});


// Listener for the Boss casting a spell
document.addEventListener('bossSpellCast', (e) => {
    const { position, direction, damage } = e.detail;
    const geometry = new THREE.SphereGeometry(1.2, 16, 16);
    const mesh = new THREE.Mesh(geometry, bossSpellMaterial);
    mesh.position.copy(position);

    const hostileProjectile = {
        mesh: mesh,
        velocity: direction.multiplyScalar(25), // Speed of the spell
        damage: damage,
        life: 6, // Disappears after 6 seconds if it misses
        isEnemyProjectile: true
    };
    
    projectileManager.addProjectile(hostileProjectile);
});

let hasWon = false;
let vaultOpened = false;


// GAME LOOP
let prevRealTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const realTime = performance.now();
    const delta = (realTime - prevRealTime) / 1000;
    prevRealTime = realTime;
    TWEEN.update(realTime); 

    if(!isGameOver && !hasWon && !gamePaused) {
        const equippedBelt = player.inventory.getEquippedItem ? player.inventory.getEquippedItem('BELT') : null;
        
        if (equippedBelt && equippedBelt.stats) {
            uiManager.updateDash(player.dashCooldownTimer, equippedBelt.stats.cooldown);
        } else {
            uiManager.hideDash();
        }

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

        // VAULT UI 
        if (!hasWon) {
            const vaultPrompt = document.getElementById('vault-prompt');
            const vaultActionText = document.getElementById('vault-action-text');

            if (!vaultOpened && levelVault.openBox.containsPoint(player.camera.position)) {
                vaultPrompt.style.display = 'block'; 
                vaultActionText.innerText = 'Open Vault';
                vaultActionText.style.color = '#ffaa00'; 
                vaultPrompt.style.borderColor = '#ffaa00';
            } 
            else if (vaultOpened && levelVault.winBox.containsPoint(player.camera.position)) {
                vaultPrompt.style.display = 'block';
                vaultActionText.innerText = 'Take Artifact'; // Updated text!
                vaultActionText.style.color = '#00ff00'; 
                vaultPrompt.style.borderColor = '#00ff00';
            } 
            else {
                vaultPrompt.style.display = 'none';
            }
        }

        vfxManager.update(delta);
        projectileManager.update(delta, physicsManager, vfxManager, player);
        groundLoot.update(delta);
        beltLoot.update(delta);

        waveManager.update(delta, vfxManager);
    }
    renderer.render(scene, camera);
}

animate();