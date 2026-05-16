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
                scale: 1, 
                position: { x: 1, y: -0.5, z: -1.25 }, 
                rotation: { x: Math.PI/2, y: Math.PI/2 + Math.PI/4, z: -Math.PI /2},
                muzzleNode: 'mesh_0', 
                muzzleFallbackOffset: { x: 0, y: 0, z: -10 } 
            }
        ),
        'laser_arm': new LauncherArm(
            'laser_arm', 'Laser Cannon', 'Fires high-energy laser beams.', 'RIGHT_ARM', 
            'assets/laser_arm.glb', 
            { strength: 10 }, 
            { damage: 10, attackSpeed: 0.5, projectileSpeed: 50 },
            {
                scale: 1, 
                position: { x: 1, y: -0.5, z: -1.25 }, 
                rotation: { x: Math.PI/2, y: Math.PI/2 + Math.PI/4, z: -Math.PI /2},
                muzzleNode: 'mesh_0', 
                muzzleFallbackOffset: { x: 0, y: 0, z: -10 } 
            }
        ),
        'saw_arm': new Arm(
            'saw_arm', 'Rotary Saw', 'Perfect for close combat and cutting through obstacles.', 'RIGHT_ARM',
            'assets/saw_armv1.glb',
            { strength: 20 },
            { damage: 30, attackSpeed: 1.5, attackType: 'melee' },
            {
                scale: 1,
                position: { x: 1, y: -0.75, z: -1.25 },
                rotation: { x: Math.PI/2, y: -Math.PI/2, z: Math.PI /2},
                muzzleNode: 'mesh_0',
                muzzleFallbackOffset: { x: 0, y: 0, z: -10 }
            }
        )
    }
};