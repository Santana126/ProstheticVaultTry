import { Item } from './Item.js';

export class Prosthetic extends Item {
    constructor(id, name, description, slot, modelPath, stats = {}) {
        super(id, name, description);
        this.slot = slot;         // e.g., 'LEFT_ARM', 'RIGHT_ARM', 'LEGS'
        this.modelPath = modelPath; // Path to .glb file
        this.stats = stats;       // e.g., { strength: 10, agility: 5 }
    }
}