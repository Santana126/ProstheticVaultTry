import * as THREE from 'three';
import { Enemy } from './Enemy.js';
import { WorldItem } from './WorldItem.js';
import { ITEM_DATABASE } from './Database.js';

export class WaveManager {
    constructor(scene, physicsManager, player, interactionManager, activeWorldItems) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        this.player = player;
        this.interactionManager = interactionManager;
        this.activeWorldItems = activeWorldItems; // So enemies can drop loot!

        this.activeEnemies = [];
        this.currentWave = 0;
        this.isWaveActive = false;

        // Define waves
        this.waves = [
            { count: 3, isBossWave: false }, // Wave 1: 3 Enemies
            { count: 5, isBossWave: false }, // Wave 2: 5 Enemies
            { count: 1, isBossWave: true } // Wave 3: 1 Boss Enemy
        ];
    }

    startNextWave() {
        if (this.currentWave >= this.waves.length) {
            console.log("All standard waves cleared! Boss time soon...");
            return;
        }

        const waveConfig = this.waves[this.currentWave];
        console.log(`Starting Wave ${this.currentWave + 1}! Spawning ${waveConfig.count} enemies.`);

        for (let i = 0; i < waveConfig.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = waveConfig.isBossWave ? 0 : 35; // Spawn boss in the center!
            const spawnX = Math.cos(angle) * radius;
            const spawnZ = Math.sin(angle) * radius;

            // Pass the isBossWave flag to the Enemy constructor
            const enemy = new Enemy(this.scene, this.physicsManager, spawnX, 0, spawnZ, this.player, waveConfig.isBossWave);
            this.activeEnemies.push(enemy);
        }

        this.isWaveActive = true;
        this.currentWave++;
    }

    update(delta, vfxManager) {
        if (!this.isWaveActive) return;

        for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
            let enemy = this.activeEnemies[i];
            enemy.update(delta);

            if (enemy.isDead) {

                const expReward = enemy.isBoss ? 150 : 25;
                this.player.gainExp(expReward);


                // Drop Logic
                let itemToDrop;
                if (enemy.isBoss) {
                    itemToDrop = ITEM_DATABASE.keys['vault_key'];
                    console.log("THE BOSS HAS FALLEN! GRAB THE KEY!");
                } else {
                    itemToDrop = ITEM_DATABASE.materials['scrap_bolt'];
                }
                
                const lootDrop = new WorldItem(
                    this.scene, 
                    itemToDrop, 
                    enemy.mesh.position.x, 
                    1, 
                    enemy.mesh.position.z
                );
                
                this.interactionManager.addInteractable(lootDrop.mesh);
                this.activeWorldItems.push(lootDrop);

                this.activeEnemies.splice(i, 1);
            }
        }

        // Check if the wave is completely dead!
        if (this.activeEnemies.length === 0) {
            this.isWaveActive = false;
            console.log("Wave Cleared!");
            
            // Wait 3 seconds, then start the next wave
            setTimeout(() => {
                this.startNextWave();
            }, 3000);
        }
    }
}