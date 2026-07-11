import * as THREE from 'three';
import { GAME_CONFIG } from './Config.js';

export class AnimationManager {
    constructor() {
        this.bobTimer = 0;
    }

    // Handles the procedural weapon bobbing while walking
    updateWeaponBobbing(model, basePosition, isMoving, delta) {
        if (!model || !basePosition) return;

        if (isMoving) {
            this.bobTimer += delta * GAME_CONFIG.PLAYER.bobSpeed;
            //oscillate around the initial position
            model.position.y = basePosition.y + Math.sin(this.bobTimer) * GAME_CONFIG.PLAYER.bobAmountY;
            model.position.x = basePosition.x + Math.cos(this.bobTimer * 0.5) * GAME_CONFIG.PLAYER.bobAmountX;
        } else {
            this.bobTimer = 0;
            //smoothly return to the initial position
            model.position.y = THREE.MathUtils.lerp(model.position.y, basePosition.y, 0.1);
            model.position.x = THREE.MathUtils.lerp(model.position.x, basePosition.x, 0.1);
        }
    }
}