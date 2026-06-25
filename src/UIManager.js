import { ITEM_DATABASE } from './Database.js';

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

        // Clean architecture: Call setup functions, don't run renderStash empty!
        this.setupEquipSlots();
        this.initListeners();
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

    renderStash(ownedItemIds) {
        this.stashGrid.innerHTML = ''; 

        if(!ownedItemIds) return;

        ownedItemIds.forEach(itemId => {
            const itemData = ITEM_DATABASE.arms[itemId] || ITEM_DATABASE.legs[itemId]; // Check all categories!
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
                if (itemId && ITEM_DATABASE.arms[itemId]) {
                    this.showTooltip(ITEM_DATABASE.arms[itemId]);
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
            detail: { slot: itemData.slot, itemId: newItemId }
        }));
    }

    // --- Tooltip Helpers ---
    showTooltip(item) {
        this.ttName.innerText = item.name;
        this.ttType.innerText = `Tipo: Protesi (${item.attackType || 'Standard'})`;
        this.ttStats.innerHTML = `Danno: ${item.damage || 0}<br>Forza: +${item.stats.strength || 0}`;
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
}