export const GAME_CONFIG = {
    PLAYER: {
        moveSpeed: 200,
        friction: 10,
        height: 5.5, // Eye level
    },
    ARM: {
        basePos: { x: 1.5, y: 0.5, z: -6 },
        scale: 0.1,
        rotation: { x: Math.PI / 2, y: -Math.PI / 3, z: Math.PI / 6 },
        bobSpeed: 10,
        bobAmountY: 0.02,
        bobAmountX: 0.01,
    },
    DEBUG: {
        showModelBounds: false
    }
};