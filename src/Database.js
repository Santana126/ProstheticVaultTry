import { Arm } from './Arm.js';

export const ITEM_DATABASE = {
    arms: {
        'steel_arm': new Arm(
            'steel_arm', 
            'Industrial Steel Arm', 
            'Reliable and heavy.', 
            'RIGHT_ARM', 
            'assets/arm.glb', 
            { strength: 15 }, 
            { damage: 20, attackSpeed: 0.8, attackType: 'melee' }
        ),
        'plasma_arm': new Arm(
            'plasma_arm', 
            'Plasma Projector', 
            'Burns through anything.', 
            'RIGHT_ARM', 
            'assets/arm.glb', // Using same model for now, but we will change its color!
            { strength: 5 }, 
            { damage: 40, attackSpeed: 0.5, attackType: 'laser' }
        ),
    }
};