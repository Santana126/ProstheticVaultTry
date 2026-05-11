import { Arm } from './Arm.js';
import { LauncherArm } from './LauncherArm.js';

export const ITEM_DATABASE = {
    arms: {
        'steel_arm': new Arm(
            'steel_arm', 
            'Industrial Steel Arm', 
            'Reliable and heavy.', 
            'RIGHT_ARM', 
            'assets/arm.glb', 
            { strength: 15 }, 
            { damage: 20, attackSpeed: 0.8, attackType: 'melee' },
            {
                scale: 0.1,
                position: { x: 1.5, y: 0.5, z: -6 },
                rotation: { x: Math.PI / 2, y: -Math.PI / 3, z: Math.PI / 6 },
                muzzleNode: 'hand__02', // The exact bone name for this model
                muzzleFallbackOffset: { x: 0, y: 0, z: -60 } 
            }
        ),
        'plasma_arm': new LauncherArm(
            'plasma_arm', 'Plasma Projector', 'Fires explosive plasma orbs.', 'RIGHT_ARM', 
            'assets/plasma_arm.glb', 
            { strength: 5 }, 
            { damage: 40, attackSpeed: 0.2, projectileSpeed: 30 },
            {
                scale: 1, // Change this if it's too big/small
                position: { x: 1, y: -0.5, z: -1.25 }, // Move it around
                rotation: { x: Math.PI/2, y: Math.PI/2 + Math.PI/4, z: -Math.PI /2}, // Rotate it to face forward
                muzzleNode: 'mesh_0', // Change this to the bone name in plasma_arm.glb
                muzzleFallbackOffset: { x: 0, y: 0, z: -10 } 
            }
        ),
    }
};