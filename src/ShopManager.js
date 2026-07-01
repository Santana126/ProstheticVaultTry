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
            // { id: 'saw_arm', price: 30 },
            { id: 'laser_arm', price: 60 },
            { id: 'plasma_arm', price: 120 },
            { id: 'thruster_belt', price: 50 }
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
        // 1. Deduct funds and unlock item
        this.player.bolts -= price;
        this.player.inventory.unlockItem(itemId);
        
        // 2. Update the main HUD via UIManager
        this.uiManager.updateEconomy(this.player.level, this.player.exp, this.player.maxExp, this.player.bolts);
        
        // 3. Update the Shop's internal display
        this.updateDisplay();
        
        // 4. Disable the button so they can't buy it twice
        buttonElement.disabled = true;
        buttonElement.innerText = 'OWNED';
        
        // 5. Re-check all other buttons to see if we are now too poor to afford them!
        this.renderItems(); 
        
        console.log(`Purchased ${itemId}! Remaining bolts: ${this.player.bolts}`);
    }
}