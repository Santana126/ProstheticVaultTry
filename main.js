import * as THREE from 'three';
import { Player } from './src/Player.js';
import { Arm } from './src/Arm.js';
import { Level } from './src/Level.js';
import { ITEM_DATABASE } from './src/Database.js';
import { UIManager } from './src/UIManager.js';

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
level.buildVaultLayout(); // One line to build the whole world!


// Initialize Player
const player = new Player(scene, camera, level);

// // --- INVENTORY LOGIC ---
// const invMenu = document.getElementById('inventory-overlay');
// let isInventoryOpen = false;

// function toggleInventory() {
//     isInventoryOpen = !isInventoryOpen;
//     invMenu.style.display = isInventoryOpen ? 'flex' : 'none';
    
//     if (isInventoryOpen) {
//         player.controls.unlock(); // Release mouse to click buttons
//     } else {
//         player.controls.lock();   // Re-lock mouse for FPS
//     }
// }

// CREATE AN ARM ITEM AND EQUIP IT
const steelArm = new Arm(
    'steel_arm', // Set to match the database ID
    'Steel Arm', 
    'A heavy industrial prosthetic', 
    'LEFT_ARM', 
    'assets/arm.glb', 
    { strength: 15 }, 
    { damage: 20, attackSpeed: 0.8, attackType: 'melee' }
);
player.equip('LEFT_ARM', steelArm);


const uiManager = new UIManager();

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
    player.equip(slotToEquip, itemToEquip);
});

// Controls
const blocker = document.getElementById('blocker');
blocker.addEventListener('click', () => player.controls.lock());
player.controls.addEventListener('lock', () => blocker.style.display = 'none');
player.controls.addEventListener('unlock', () => blocker.style.display = 'flex');

// document.addEventListener('keydown', (e) => player.setMoveState(e.code, true));
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
        uiManager.toggleInventory(); // Call the UI Manager instead of a local function!
    } else {
        player.setMoveState(e.code, true);
    }
});
document.addEventListener('keyup', (e) => player.setMoveState(e.code, false));

// // Add 'E' key to input listeners
// document.addEventListener('keydown', (e) => {
//     if (e.code === 'KeyE') {
//         toggleInventory();
//     } else {
//         player.setMoveState(e.code, true);
//     }
// });

// globalThis.game = {
//     swapArm: (armId) => {
//         const armItem = ITEM_DATABASE.arms[armId];
//         player.equip('LEFT_ARM', armItem);
//     }
// };

// // --- INVENTORY UI CONTROLLER (THE BRAINS) ---
// const playerOwnedItems = ['steel_arm', 'plasma_arm']; 
// let currentlySelectedSlot = null; 
// let currentlySelectedSlotElement = null;

// const stashGrid = document.getElementById('stash-grid');
// const mainEquipSlots = document.querySelectorAll('.equip-slot');

// const tooltip = document.getElementById('item-tooltip');
// const ttName = document.getElementById('tt-name');
// const ttType = document.getElementById('tt-type');
// const ttStats = document.getElementById('tt-stats');
// const ttDesc = document.getElementById('tt-desc');

// function renderStash() {
//     stashGrid.innerHTML = ''; 

//     playerOwnedItems.forEach(itemId => {
//         const itemData = ITEM_DATABASE.arms[itemId]; 
//         if (!itemData) return;

//         const stashElement = document.createElement('div');
//         stashElement.className = 'stash-item';
//         stashElement.setAttribute('data-item-id', itemId);
//         stashElement.setAttribute('data-slot-type', itemData.slot); 
        
//         stashElement.innerHTML = `<strong>${itemData.name}</strong>`;
        
//         // Tooltip logic for stash items
//         stashElement.addEventListener('mouseenter', () => showTooltip(itemData));
//         stashElement.addEventListener('mouseleave', hideTooltip);
//         stashElement.addEventListener('mousemove', moveTooltip);

//         // Click logic for stash items (Swap!)
//         stashElement.addEventListener('click', () => {
//             if (currentlySelectedSlot && currentlySelectedSlot === itemData.slot) {
//                 performSwap(itemId, itemData);
//             }
//         });

//         stashGrid.appendChild(stashElement);
//     });
// }

// mainEquipSlots.forEach(slotElement => {
//     // Tooltip logic for equipped slots
//     slotElement.addEventListener('mouseenter', () => {
//         const itemId = slotElement.getAttribute('data-item-id');
//         if (itemId && ITEM_DATABASE.arms[itemId]) {
//             showTooltip(ITEM_DATABASE.arms[itemId]);
//         }
//     });
//     slotElement.addEventListener('mouseleave', hideTooltip);
//     slotElement.addEventListener('mousemove', moveTooltip);

//     // Click logic for equipped slots (Select!)
//     slotElement.addEventListener('click', () => {
//         mainEquipSlots.forEach(s => s.classList.remove('selected'));
//         slotElement.classList.add('selected');
        
//         currentlySelectedSlot = slotElement.getAttribute('data-slot');
//         currentlySelectedSlotElement = slotElement;

//         const stashItems = document.querySelectorAll('.stash-item');
//         stashItems.forEach(stashEl => {
//             if (stashEl.getAttribute('data-slot-type') === currentlySelectedSlot) {
//                 stashEl.classList.remove('incompatible');
//             } else {
//                 stashEl.classList.add('incompatible');
//             }
//         });
//     });
// });

// function performSwap(newItemId, itemData) {
//     // Update HTML Visuals
//     currentlySelectedSlotElement.setAttribute('data-item-id', newItemId);
//     currentlySelectedSlotElement.querySelector('.slot-icon').innerText = itemData.name;
    
//     // Clear selection
//     currentlySelectedSlotElement.classList.remove('selected');
//     currentlySelectedSlot = null;
//     currentlySelectedSlotElement = null;

//     document.querySelectorAll('.stash-item').forEach(el => el.classList.remove('incompatible'));

//     // Trigger the 3D model swap
//     if (globalThis.game && globalThis.game.swapArm) {
//         globalThis.game.swapArm(newItemId);
//     }
// }

// function showTooltip(item) {
//     ttName.innerText = item.name;
//     ttType.innerText = `Tipo: Protesi (${item.attackType || 'Standard'})`;
//     ttStats.innerHTML = `Danno: ${item.damage || 0}<br>Forza: +${item.stats.strength || 0}`;
//     ttDesc.innerText = item.description;
//     tooltip.style.display = 'block';
// }

// function moveTooltip(e) {
//     if (tooltip.style.display === 'block') {
//         tooltip.style.left = (e.clientX + 15) + 'px';
//         tooltip.style.top = (e.clientY + 15) + 'px';
//     }
// }

// function hideTooltip() {
//     tooltip.style.display = 'none';
// }

// // Build the UI
// renderStash();


// --- GAME LOOP ---
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