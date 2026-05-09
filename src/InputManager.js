export class InputManager {
    constructor() {
        this.keys = {};
        this.isAttacking = false;

        this.initListeners();
    }

    initListeners() {
        // Track keyboard
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Track mouse clicks
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.isAttacking = true;
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.isAttacking = false;
        });
    }

    // Helper method to check if a key is held down
    isPressed(keyCode) {
        return !!this.keys[keyCode];
    }
}