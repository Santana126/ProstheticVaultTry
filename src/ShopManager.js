import { ITEM_DATABASE } from './Database.js';

export class ShopManager {
    constructor(player, uiManager, waveManager) {
        this.player = player;
        this.uiManager = uiManager;
        this.waveManager = waveManager;

        // Get the DOM elements
        this.shopOverlay = document.getElementById('shop-overlay');
        this.shopBoltsDisplay = document.getElementById('shop-bolts-display');
        this.shopGrid = document.getElementById('shop-items-grid');
        this.closeBtn = document.getElementById('close-shop-btn');

        // The items available in the shop
        this.shopItems = [
            // Weapons
            { id: 'laser_arm', price: 60, type: 'weapon' },
            { id: 'plasma_arm', price: 120, type: 'weapon' },
            { id: 'thruster_belt', price: 50, type: 'weapon' },
            
            // Consumables (Ammo/Health)
            { id: 'hp_pack', name: 'Medkit (HP+)', price: 20, type: 'consumable' },
            { id: 'ammo_refill', name: 'Ammo/Battery Pack', price: 15, type: 'consumable' },
            
            // Permanent Upgrades
            { id: 'upg_speed', name: 'Speed Boost (+5%)', price: 40, type: 'upgrade' },
            { id: 'upg_dmg', name: 'Damage Boost (+10)', price: 40, type: 'upgrade' }
        ];

        this.initListeners();
    }

    initListeners() {
        // Listen for the button to close the shop and start the next wave
        this.closeBtn.addEventListener('click', () => {
            this.closeShop();
        });

        // We can still use the Custom Event to open the shop cleanly!
        document.addEventListener('waveCleared', () => {
            this.openShop();
        });
    }

    openShop() {
        this.shopOverlay.style.display = 'flex';

        //  Free the mouse and pause the game!
        this.player.controls.unlock();
        this.updateDisplay();
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

        this.shopItems.forEach(shopItem => {
            const itemData = this.getItemData(shopItem.id);
            if (!itemData) return;

            const isOwned = ownedItems.includes(shopItem.id);
            const canAfford = this.player.bolts >= shopItem.price;
            
            const card = document.createElement('div');
            card.className = 'shop-item';
            
            let btnHtml = isOwned 
                ? `<button class="buy-btn" disabled>OWNED</button>`
                : `<button class="buy-btn" ${canAfford ? '' : 'disabled'}>BUY</button>`;

            card.innerHTML = `
                <div>
                    <h3>${itemData.name}</h3>
                    <p>${itemData.description}</p>
                </div>
                <div>
                    <div class="price">${shopItem.price} <span style="font-size:0.8rem">Bolts</span></div>
                    ${btnHtml}
                </div>
            `;

            // Setup the Buy Button logic directly inside the Manager
            if (!isOwned) {
                const buyBtn = card.querySelector('.buy-btn');
                buyBtn.addEventListener('click', () => {
                    if (this.player.bolts >= shopItem.price) {
                        this.buyItem(shopItem.id, shopItem.price, buyBtn);
                    }
                });
            }

            this.shopGrid.appendChild(card);
        });
    }

    buyItem(itemId, price, buttonElement) {
        if (this.player.bolts < price) return;

        this.player.bolts -= price;
        this.player.inventory.unlockItem(itemId);

        // Handle based on purchase type
        const itemObj = this.shopItems.find(i => i.id === itemId);

        if (itemObj.type === 'consumable') {
            if (itemId === 'hp_pack') {
                this.player.health = Math.min(this.player.health + 30, this.player.maxHealth);
                this.uiManager.updateHealthBar(this.player.health, this.player.maxHealth);
            } else if (itemId === 'ammo_refill') {
                const arm = this.player.inventory.getActiveArm();
                if (arm) {
                    if (arm.maxAmmo) arm.currentAmmo = arm.maxAmmo;
                    if (arm.heat) arm.heat = 0;
                }
            }
        } 
        else if (itemObj.type === 'upgrade') {
            if (itemId === 'upg_speed') this.player.baseStats.speedMultiplier += 0.05;
            if (itemId === 'upg_dmg') this.player.baseStats.damageBonus += 10;
        }

        // Final UI Updates
        this.uiManager.updateEconomy(this.player.level, this.player.exp, this.player.maxExp, this.player.bolts);
        this.updateDisplay();
        buttonElement.disabled = true;
        buttonElement.innerText = 'OWNED';
        this.renderItems(); 
    }
}