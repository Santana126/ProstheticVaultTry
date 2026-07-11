import * as THREE from 'three';
import { Enemy } from './Enemy.js';
import { WorldItem } from './WorldItem.js';
import { ITEM_DATABASE } from './Database.js';

export class WaveManager {
    constructor(scene, physicsManager, player, interactionManager, activeWorldItems, ktx2Loader) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        this.player = player;
        this.interactionManager = interactionManager;
        this.activeWorldItems = activeWorldItems; 
        this.ktx2Loader = ktx2Loader;

        this.activeEnemies = [];
        this.currentWave = 0;
        this.isWaveActive = false;
        this.waves = [];
    }

    startNextWave() {
        if (this.currentWave >= this.waves.length) return;

        const waveConfig = this.waves[this.currentWave];
        
        if (waveConfig.isBossWave) {
            if (window.uiManager) {
                window.uiManager.showTransmission(
                    'assets/narr_prost.png', '', 
                    'Critical warning: a massive spatial distortion and interdimensional energy spike is tearing right through the arena! Brace yourself, Hunter, because Romeo, The Circle, has finally breached our reality. Do not let this giant crush you!', 
                    () => {
                        this.executeWaveSpawn(waveConfig); 
                    }
                );
            }
            return; 
        }

        this.executeWaveSpawn(waveConfig);
    }

    executeWaveSpawn(waveConfig) {
        const waveText = document.getElementById('wave-counter');
        waveText.style.display = 'block';
        waveText.innerText = waveConfig.isBossWave ? 'FINAL WAVE' : `WAVE ${this.currentWave + 1}`;

        if (waveConfig.isBossWave) {
            document.getElementById('boss-ui').style.display = 'block';
            document.getElementById('boss-hp-fill').style.width = '100%';
        }

        for (let i = 0; i < waveConfig.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const isThisTheBoss = waveConfig.isBossWave && (i === 0);
            const radius = isThisTheBoss ? 0 : 35; 
            const spawnX = Math.cos(angle) * radius;
            const spawnZ = Math.sin(angle) * radius;

            const enemy = new Enemy(this.scene, this.physicsManager, spawnX, 0, spawnZ, this.player, isThisTheBoss, this.ktx2Loader);
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

                let itemToDrop;
                if (enemy.isBoss) {
                    itemToDrop = ITEM_DATABASE.keys['vault_key'];
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

        if (this.activeEnemies.length === 0) {
            this.isWaveActive = false;
            
            setTimeout(() => {
                if (this.currentWave < this.waves.length) {
                    document.dispatchEvent(new Event('waveCleared'));
                }
            }, 2000); 
        }
    }
}