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
            { id: 'plasma_arm', name: 'Plasma Projector', price: 120, type: 'weapon' },
            { id: 'thruster_belt', name: 'Thruster Belt', price: 50, type: 'weapon' },
            { id: 'upg_speed', name: 'Speed Boost (+5%)', price: 40, type: 'upgrade' },
            { id: 'upg_dmg', name: 'Damage Boost (+10)', price: 40, type: 'upgrade' },
            { id: 'upg_maxhp', name: 'Max Health +20', price: 50, type: 'upgrade' }
        ];

        this.currentShopItems = []; // Holds the 3 random items for the current wave

        this.initListeners();
    }

    initListeners() {
        // Listen for the button to close the shop and start the next wave
        this.closeBtn.addEventListener('click', () => {
            this.closeShop();
        });

        
        document.addEventListener('waveCleared', () => {
            setTimeout(() => {
                this.openShop();
            }, 4000); // 4-second delay for loot gathering
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
        //Get the list of IDs the player already owns
        const ownedItems = this.player.inventory.getOwnedItems();

        //Filter the master pool! 
        // Keep upgrades always, but only keep weapons if they are NOT in the owned list.
        const availablePool = this.masterShopPool.filter(item => {
            if (item.type === 'weapon') {
                return !ownedItems.includes(item.id);
            }
            return true; 
        });

        // Shuffle the remaining valid items and pick the top 3
        const randomizedPool = this.shuffleArray(availablePool);
        this.currentShopItems = randomizedPool.slice(0, 3); 

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