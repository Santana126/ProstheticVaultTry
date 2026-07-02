import { ITEM_DATABASE } from './Database.js';
import { UIHealthBar } from './UIHealthBar.js';
import { UIWinScreen } from './UIWinScreen.js';
import { UIEconomy } from './UIEconomy.js';

export class UIManager {
    constructor() {
        this.invOverlay = document.getElementById('inventory-overlay');
        this.isInventoryOpen = false;

        this.currentlySelectedSlot = null;
        this.currentlySelectedSlotElement = null;

        this.stashGrid = document.getElementById('stash-grid');
        this.mainEquipSlots = document.querySelectorAll('.equip-slot');

        this.tooltip = document.getElementById('item-tooltip');
        this.ttName = document.getElementById('tt-name');
        this.ttType = document.getElementById('tt-type');
        this.ttStats = document.getElementById('tt-stats');
        this.ttDesc = document.getElementById('tt-desc');

        this.healthBar = new UIHealthBar();
        this.economyUI = new UIEconomy();

        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.winScreen = new UIWinScreen();

        // Clean architecture: Call setup functions, don't run renderStash empty!
        this.setupEquipSlots();
        this.initListeners();


        // DAMAGE VIGNETTE 
        this.damageOverlay = document.createElement('div');
        this.damageOverlay.style.position = 'fixed';
        this.damageOverlay.style.top = '0';
        this.damageOverlay.style.left = '0';
        this.damageOverlay.style.width = '100vw';
        this.damageOverlay.style.height = '100vh';
        this.damageOverlay.style.pointerEvents = 'none'; // CRITICAL: Lets you shoot through it!
        this.damageOverlay.style.zIndex = '50'; 
        
        // Start completely invisible
        this.damageOverlay.style.boxShadow = 'inset 0 0 0px rgba(255, 0, 0, 0)';
        document.body.appendChild(this.damageOverlay);
    }

    initListeners() {
        // Listen for the custom event fired by InventoryManager
        document.addEventListener('inventoryUpdated', (e) => {
            // Safety check: ensure the data actually exists before trying to render
            if (e.detail && e.detail.ownedItems) {
                this.renderStash(e.detail.ownedItems);
            }
        });

        document.addEventListener('equipmentUpdated', (e) => {
            if (e.detail && e.detail.slot) {
                this.updateEquipmentSlot(e.detail.slot, e.detail.itemId, e.detail.item);
            }
        });

        document.addEventListener('bossDamaged', (e) => {
            const pct = Math.max(0, (e.detail.hp / e.detail.maxHp) * 100);
            document.getElementById('boss-hp-fill').style.width = pct + '%';
            
            // Hide the bar a moment after the boss dies
            if (e.detail.hp <= 0) {
                setTimeout(() => document.getElementById('boss-ui').style.display = 'none', 1500);
            }
        });
    }

    toggleInventory() {
        this.isInventoryOpen = !this.isInventoryOpen;
        this.invOverlay.style.display = this.isInventoryOpen ? 'flex' : 'none';

        // Broadcast to the game that the inventory state changed
        document.dispatchEvent(new CustomEvent('inventoryToggled', {
            detail: { isOpen: this.isInventoryOpen }
        }));
    }

    updateEquipmentSlot(slot, itemId, itemData) {
        const slotElement = document.querySelector(`.equip-slot[data-slot="${slot}"]`);
        if (!slotElement) return;

        const slotIcon = slotElement.querySelector('.slot-icon');
        if (!slotIcon) return;

        if (itemData) {
            slotElement.setAttribute('data-item-id', itemId);
            slotIcon.classList.remove('empty');
            slotIcon.classList.add('has-item');
            slotIcon.innerText = itemData.name;
        } else {
            slotElement.removeAttribute('data-item-id');
            slotIcon.classList.remove('has-item');
            slotIcon.classList.add('empty');
            slotIcon.innerText = '';
        }
    }

    getItemData(itemId) {
        // Loops through arms, belts, materials, etc. to find the item!
        for (const category in ITEM_DATABASE) {
            if (ITEM_DATABASE[category] && ITEM_DATABASE[category][itemId]) {
                return ITEM_DATABASE[category][itemId];
            }
        }
        return null;
    }

    renderStash(ownedItemIds) {
        this.stashGrid.innerHTML = ''; 

        if(!ownedItemIds) return;

        ownedItemIds.forEach(itemId => {
            // THE FIX: Use our new universal search!
            const itemData = this.getItemData(itemId); 
            if (!itemData) return;

            const stashElement = document.createElement('div');
            stashElement.className = 'stash-item';
            stashElement.setAttribute('data-item-id', itemId);
            stashElement.setAttribute('data-slot-type', itemData.slot); 
            stashElement.innerHTML = `<strong>${itemData.name}</strong>`;
            
            stashElement.addEventListener('mouseenter', () => this.showTooltip(itemData));
            stashElement.addEventListener('mouseleave', () => this.hideTooltip());
            stashElement.addEventListener('mousemove', (e) => this.moveTooltip(e));

            stashElement.addEventListener('click', () => {
                if (this.currentlySelectedSlot && this.currentlySelectedSlot === itemData.slot) {
                    this.performSwap(itemId, itemData);
                }
            });

            this.stashGrid.appendChild(stashElement);
        });
    }

    setupEquipSlots() {
        this.mainEquipSlots.forEach(slotElement => {
            slotElement.addEventListener('mouseenter', () => {
                const itemId = slotElement.getAttribute('data-item-id');
                // THE FIX: Use the universal search here too!
                if (itemId) {
                    const itemData = this.getItemData(itemId);
                    if (itemData) this.showTooltip(itemData);
                }
            });
            slotElement.addEventListener('mouseleave', () => this.hideTooltip());
            slotElement.addEventListener('mousemove', (e) => this.moveTooltip(e));

            slotElement.addEventListener('click', () => {
                this.mainEquipSlots.forEach(s => s.classList.remove('selected'));
                slotElement.classList.add('selected');
                
                this.currentlySelectedSlot = slotElement.getAttribute('data-slot');
                this.currentlySelectedSlotElement = slotElement;

                const stashItems = document.querySelectorAll('.stash-item');
                stashItems.forEach(stashEl => {
                    if (stashEl.getAttribute('data-slot-type') === this.currentlySelectedSlot) {
                        stashEl.classList.remove('incompatible');
                    } else {
                        stashEl.classList.add('incompatible');
                    }
                });
            });
        });
    }

    performSwap(newItemId, itemData) {
        // Update HTML Visuals
        this.currentlySelectedSlotElement.setAttribute('data-item-id', newItemId);
        this.currentlySelectedSlotElement.querySelector('.slot-icon').innerText = itemData.name;
        
        // Clear selection state
        this.currentlySelectedSlotElement.classList.remove('selected');
        this.currentlySelectedSlot = null;
        this.currentlySelectedSlotElement = null;

        document.querySelectorAll('.stash-item').forEach(el => el.classList.remove('incompatible'));

        // Broadcast to the game that an item needs to be equipped!
        document.dispatchEvent(new CustomEvent('equipItem', {
            detail: { slot: itemData.slot, itemId: newItemId, item: itemData }
        }));
    }

    // --- Tooltip Helpers ---
    showTooltip(item) {
        this.ttName.innerText = item.name;
        this.ttType.innerText = `Tipo: ${item.slot === 'BELT' ? 'Equipaggiamento' : 'Protesi'}`;
        
        // THE FIX: Dynamically build the stats text based on what stats the item actually has!
        let statsHtml = '';
        if (item.damage) statsHtml += `Danno: ${item.damage}<br>`;
        if (item.stats) {
            if (item.stats.strength) statsHtml += `Forza: +${item.stats.strength}<br>`;
            if (item.stats.dashPower) statsHtml += `Potenza Dash: ${item.stats.dashPower}<br>`;
            if (item.stats.cooldown) statsHtml += `Cooldown: ${item.stats.cooldown}s<br>`;
        }
        
        this.ttStats.innerHTML = statsHtml || 'Nessuna statistica';
        this.ttDesc.innerText = item.description;
        this.tooltip.style.display = 'block';
    }

    moveTooltip(e) {
        if (this.tooltip.style.display === 'block') {
            this.tooltip.style.left = (e.clientX + 15) + 'px';
            this.tooltip.style.top = (e.clientY + 15) + 'px';
        }
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }

    // --- Interaction Prompt Helpers ---
    showInteractionPrompt(itemName) {
        document.getElementById('interact-name').innerText = itemName;
        document.getElementById('interaction-prompt').style.display = 'block';
    }

    hideInteractionPrompt() {
        document.getElementById('interaction-prompt').style.display = 'none';
    }

    updateHealthBar(currentHealth, maxHealth) {
        this.healthBar.update(currentHealth, maxHealth);
    }
    updateEconomy(level, exp, maxExp, bolts) {
    this.economyUI.update(level, exp, maxExp, bolts);
    }

    showGameOver() {
        this.gameOverOverlay.style.display = 'flex';
        // Hide crosshair and prompts so the screen looks clean
        document.getElementById('crosshair').style.display = 'none';
        this.hideInteractionPrompt(); 
    }


    showWinScreen() {
        this.winScreen.show();
        document.getElementById('crosshair').style.display = 'none';
        this.hideInteractionPrompt();
    }

    showDamageVignette() {
        // Instantly snap to a harsh red border without any smooth animation
        this.damageOverlay.style.transition = 'none';
        this.damageOverlay.style.boxShadow = 'inset 0 0 150px rgba(255, 0, 0, 0.8)';

        // Force the browser to register the instant change before moving to the next line
        void this.damageOverlay.offsetWidth; 

        // Smoothly fade back to invisible over 0.5 seconds
        this.damageOverlay.style.transition = 'box-shadow 0.5s ease-out';
        this.damageOverlay.style.boxShadow = 'inset 0 0 0px rgba(255, 0, 0, 0)';
    }

    updateAmmo(current, max) {
        const ui = document.getElementById('ammo-ui');
        ui.style.display = 'block';
        document.getElementById('ammo-val').innerText = `${current} / ${max}`;
    }

    updateHeat(heat, max) {
        const ui = document.getElementById('heat-ui');
        ui.style.display = 'block';
        document.getElementById('heat-bar').style.width = `${(heat / max) * 100}%`;
    }

    updateDash(cooldown, maxCooldown) {
        const ui = document.getElementById('dash-ui');
        ui.style.display = 'block'; // Make sure it's visible!
        
        const progress = Math.max(0, (1 - (cooldown / maxCooldown)) * 100);
        document.getElementById('dash-bar').style.width = `${progress}%`;
    }

    hideDash() {
        const ui = document.getElementById('dash-ui');
        if (ui) ui.style.display = 'none';
    }

    // Hide HUD elements when no weapon is equipped
    hideCombatHUD() {
        document.getElementById('ammo-ui').style.display = 'none';
        document.getElementById('heat-ui').style.display = 'none';
    }
}