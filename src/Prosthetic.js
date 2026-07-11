import { Item } from './Item.js';

export class Prosthetic extends Item {
    constructor(id, name, description, slot, modelPath, stats = {}, visualData = {}) {
        super(id, name, description);
        this.slot = slot;         
        this.modelPath = modelPath; 
        this.stats = stats;       
        this.visualData = visualData;
    }

    attack(args) {}
    
    stopAttack(scene) {}
    
    update(delta) {}

}