import { Prosthetic } from './Prosthetic.js';

export class Arm extends Prosthetic {
    constructor(id, name, description, slot, modelPath, stats, weaponData) {
        super(id, name, description, slot, modelPath, stats);
        
        // Weapon specific characteristics
        this.damage = weaponData.damage || 10;
        this.attackSpeed = weaponData.attackSpeed || 1.0;
        this.attackType = weaponData.attackType || 'melee'; // 'melee', 'laser', 'electric'
    }

    attack() {
        console.log(`${this.name} attacks with ${this.attackType}! Dealing ${this.damage} damage.`);
        // Future: Add animation and raycasting here
    }
}