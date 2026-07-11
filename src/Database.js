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
            { damage: 30, attackSpeed: 0.4, projectileSpeed: 30 },
            {
                scale: 1.5, 
                position: { x: 0.75, y: -0.60, z: -0.85 }, 
                rotation: { x: Math.PI/2, y: Math.PI/2 + Math.PI/4, z: -Math.PI /2},
                muzzleNode: 'Sphere', 
                muzzleFallbackOffset: { x: 0, y: 0, z: -10 } 
            }
        ),
        'laser_arm': new HitscanArm(
            'laser_arm', 'Laser Cannon', 'Fires high-energy laser beams.', 'RIGHT_ARM', 
            'assets/laser_arm.glb', 
            { strength: 10 }, 
            { damage: 5, attackSpeed: 0.1, projectileSpeed: 50 },
            {
                scale: 1.5, 
                position: { x: 0.75, y: -0.6, z: -0.85 }, 
                rotation: { x: Math.PI/2, y: Math.PI/2 + Math.PI/4, z: -Math.PI /2},
                muzzleNode: 'Sphere', 
                muzzleFallbackOffset: { x: 0, y: 0, z: -10 } 
            }
        ),
        'torch_arm': new Prosthetic(
            'torch_arm',
            'Lumen-Tech Torch',
            'A heavy-duty exploration arm equipped with a high-lumen industrial floodlight. Press [R] to toggle.',
            'LEFT_ARM',
            'assets/arm_torch.glb',
            { strength: 0 }, 
            {
                scale: 1.5, 
                position: { x: -0.9, y: -0.8, z: -0.75 }, 
                rotation: { x: Math.PI/2, y: Math.PI/2 - Math.PI/4, z: -Math.PI /2 },
                muzzleNode: 'mesh_0_1', 
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
            'CURRENCY',
            'assets/bolt.glb',
            { scale: 5 } 
        )
    },
    belts: {
        'thruster_belt': {
            id: 'thruster_belt',
            name: 'Thruster Belt',
            description: 'Double-tap or press Shift to engage evasive thrusters.',
            slot: 'BELT',
            modelPath: 'assets/belt.glb',
            stats: { 
                dashPower: 100,
                cooldown: 3.5 
            }
        }
    }
};