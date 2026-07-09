import { ITEM_DATABASE } from './Database.js';

export class ShopManager {
    constructor(player, uiManager, waveManager) {
        this.player = player;
        this.uiManager = uiManager;
        this.waveManager = waveManager;

        this.shopOverlay = document.getElementById('shop-overlay');
        this.shopBoltsDisplay = document.getElementById('shop-bolts-display');
        this.shopGrid = document.getElementById('shop-items-grid');
        this.closeBtn = document.getElementById('close-shop-btn');

        this.masterShopPool = [
            { id: 'laser_arm', name: 'Laser Cannon', price: 60, type: 'weapon' },
            { id: 'plasma_arm', name: 'Plasma Projector', price: 60, type: 'weapon' },
            { id: 'thruster_belt', name: 'Thruster Belt', price: 50, type: 'weapon' },
            { id: 'upg_speed', name: 'Speed Boost (+5%)', price: 40, type: 'upgrade' },
            { id: 'upg_dmg', name: 'Damage Boost (+10)', price: 40, type: 'upgrade' },
            { id: 'upg_maxhp', name: 'Max Health +20', price: 50, type: 'upgrade' }
        ];

        this.currentShopItems = []; // Holds the 3 random items for the current wave

        this.initListeners();
    }

    initListeners() {
        this.closeBtn.addEventListener('click', () => {
            this.closeShop();
        });

        let isFirstWave = true; // Track the first wave!

        document.addEventListener('waveCleared', () => {
            setTimeout(() => {
                // --- SCENARIO 4: THE ECONOMY ---
                if (isFirstWave && window.uiManager) {
                    isFirstWave = false;
                    
                    window.uiManager.showTransmission(
                        'assets/narr_prost.png', '', 
                        'Wave one neutralized, but it is not over yet. The Orbital Shop Network is patching through your HUD now, allowing you to buy crucial powerups. Do not forget you can also spend those collected Bolts at the Vending Machines around the map.', 
                        () => {
                            this.openShop();
                        }
                    );
                } else {
                    this.openShop();
                }
            }, 4000); 
        });
    }

    shuffleArray(array) {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

openShop() {
        this.shopOverlay.style.display = 'flex';
        this.player.controls.unlock();
        this.updateDisplay();

        const ownedItems = this.player.inventory.getOwnedItems();

        // 1. Separate the master pool into two distinct decks
        const availableWeapons = this.masterShopPool.filter(item => 
            item.type === 'weapon' && !ownedItems.includes(item.id)
        );
        const availableUpgrades = this.masterShopPool.filter(item => 
            item.type === 'upgrade' || item.type === 'consumable' // Included consumable just in case!
        );

        // 2. Shuffle both decks to ensure randomness
        const shuffledWeapons = this.shuffleArray(availableWeapons);
        const shuffledUpgrades = this.shuffleArray(availableUpgrades);

        this.currentShopItems = [];

        // 3. The Drafting Logic
        if (shuffledWeapons.length > 0) {
            // We have at least one unowned weapon! Grab 1 weapon and 2 upgrades.
            this.currentShopItems.push(shuffledWeapons[0]);
            
            // Safely push up to 2 upgrades 
            if (shuffledUpgrades.length > 0) this.currentShopItems.push(shuffledUpgrades[0]);
            if (shuffledUpgrades.length > 1) this.currentShopItems.push(shuffledUpgrades[1]);
        } else {
            // Player owns all weapons! Fill all 3 slots with upgrades.
            this.currentShopItems = shuffledUpgrades.slice(0, 3);
        }

        // 4. Shuffle the final 3 items so the weapon isn't always sitting in the exact same left slot
        this.currentShopItems = this.shuffleArray(this.currentShopItems);

        this.renderItems();
    }

    closeShop() {
        this.shopOverlay.style.display = 'none';
        this.player.controls.lock(); // Lock mouse & unpause game
        
        // Give the player a 2-second breather before enemies spawn
        setTimeout(() => {
            this.waveManager.startNextWave();
        }, 2000);
    }

    updateDisplay() {
        this.shopBoltsDisplay.innerText = this.player.bolts;
    }

    // A helper to search the database
    getItemData(itemId) {
        for (const category in ITEM_DATABASE) {
            if (ITEM_DATABASE[category] && ITEM_DATABASE[category][itemId]) {
                return ITEM_DATABASE[category][itemId];
            }
        }
        return null;
    }

    renderItems() {
        this.shopGrid.innerHTML = '';
        const ownedItems = this.player.inventory.getOwnedItems();

        this.currentShopItems.forEach(item => {
            const isOwned = item.type === 'weapon' && ownedItems.includes(item.id);
            const canAfford = this.player.bolts >= item.price;
            
            const card = document.createElement('div');
            card.className = 'shop-item';
            card.innerHTML = `
                <h3>${item.name}</h3>
                <div class="price">${item.price} Bolts</div>
                <button class="buy-btn" ${canAfford ? '' : 'disabled'} ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? 'OWNED' : 'BUY'}
                </button>
            `;

            if (!isOwned) {
                card.querySelector('.buy-btn').addEventListener('click', () => this.buyItem(item));
            }
            this.shopGrid.appendChild(card);
        });
    }

    buyItem(item) {
        if (this.player.bolts < item.price) return;
        this.player.bolts -= item.price;

        // Logic routing
        if (item.type === 'weapon') {
            this.player.inventory.unlockItem(item.id);
        } else if (item.type === 'consumable') {
            this.applyConsumable(item.id);
        } else if (item.type === 'upgrade') {
            this.applyUpgrade(item.id);
        }

        this.uiManager.updateEconomy(this.player.level, this.player.exp, this.player.maxExp, this.player.bolts);
        this.updateDisplay();
        this.renderItems();
    }

    applyConsumable(id) {
        if (id === 'hp_pack') {
            this.player.health = Math.min(this.player.health + 30, this.player.maxHealth);
            this.uiManager.updateHealthBar(this.player.health, this.player.maxHealth);
        } else if (id === 'ammo_refill') {
            const arm = this.player.inventory.getActiveArm();
            if (arm) {
                if (arm.maxAmmo) arm.currentAmmo = arm.maxAmmo;
                if (arm.heat !== undefined) arm.heat = 0; // Cool down
            }
        }
    }

    applyUpgrade(id) {
        if (id === 'upg_speed') this.player.baseStats.speedMultiplier += 0.05;
        if (id === 'upg_dmg') this.player.baseStats.damageBonus += 10;
        if (id === 'upg_maxhp') {
            this.player.maxHealth += 20;
            this.player.health += 20;
            this.uiManager.updateHealthBar(this.player.health, this.player.maxHealth);
        }
    }
}