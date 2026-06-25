import { Prosthetic } from './Prosthetic.js';
import { HitscanArm } from './HitscanArm.js';
import { ProjectileArm } from './ProjectileArm.js';
import { Item } from './Item.js';

export const ITEM_DATABASE = {
    arms: {
        'steel_arm': new Prosthetic(
            'steel_arm', 
            'Industrial Steel Arm', 
            'A heavy industrial prosthetic. Useful for grabbing things, but not meant for combat.', 
            'RIGHT_ARM', 
            'assets/arm.glb', 
            { strength: 0 }, 
            
            {
                scale: 0.1,
                position: { x: 1.5, y: 0.5, z: -6 },
                rotation: { x: Math.PI / 2, y: -Math.PI / 3, z: Math.PI / 6 },
                muzzleNode: 'hand__02', // The exact bone name for this model
                muzzleFallbackOffset: { x: 0, y: 0, z: -60 } 
            }
        ),
        'plasma_arm': new ProjectileArm(
            'plasma_arm', 'Plasma Projector', 'Fires explosive plasma orbs.', 'RIGHT_ARM', 
            'assets/plasma_arm.glb', 
            { strength: 5 }, 
            { damage: 40, attackSpeed: 0.2, projectileSpeed: 30 },
            {
                scale: 1, 
                position: { x: 1, y: -0.5, z: -1.25 }, 
                rotation: { x: Math.PI/2, y: Math.PI/2 + Math.PI/4, z: -Math.PI /2},
                muzzleNode: 'mesh_0', 
                muzzleFallbackOffset: { x: 0, y: 0, z: -10 } 
            }
        ),
        'laser_arm': new HitscanArm(
            'laser_arm', 'Laser Cannon', 'Fires high-energy laser beams.', 'RIGHT_ARM', 
            'assets/laser_arm.glb', 
            { strength: 10 }, 
            { damage: 10, attackSpeed: 0.1, projectileSpeed: 50 },
            {
                scale: 1, 
                position: { x: 1, y: -0.5, z: -1.25 }, 
                rotation: { x: Math.PI/2, y: Math.PI/2 + Math.PI/4, z: -Math.PI /2},
                muzzleNode: 'mesh_0', 
                muzzleFallbackOffset: { x: 0, y: 0, z: -10 } 
            }
        ),
        'saw_arm': new Prosthetic(
            'saw_arm', 'Rotary Saw', 'Perfect for close combat and cutting through obstacles.', 'RIGHT_ARM',
            'assets/saw_armv1.glb',
            { strength: 0 },
            
            {
                scale: 1,
                position: { x: 1, y: -0.75, z: -1.25 },
                rotation: { x: Math.PI/2, y: -Math.PI/2, z: Math.PI /2},
                muzzleNode: 'mesh_0',
                muzzleFallbackOffset: { x: 0, y: 0, z: -10 }
            }
        )
    },
    keys: {
        'vault_key': new Item(
            'vault_key', 
            'Gold Vault Key', 
            'A heavy, glowing key. It looks like it fits the final vault.',
            'KEY',
            'assets/vault_key.glb',
            { scale: 0.3 }
        )
    },
    materials: {
        'scrap_bolt': new Item(
            'scrap_bolt', 
            'Scrap Bolt', 
            'Currency used for upgrading and buying gear.',
            'CURRENCY',          // Type
            'assets/bolt.glb',   // We will just use a cube if you don't have a bolt model yet!
            { scale: 1 }       // Make them a bit smaller than the key
        )
    }
};