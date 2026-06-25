export class UIEconomy {
    constructor() {
        // --- 1. The Bolt Counter (Top Right) ---
        this.boltContainer = document.createElement('div');
        Object.assign(this.boltContainer.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: '#00d4ff', // Cyan/Blue
            fontFamily: 'monospace',
            fontSize: '24px',
            fontWeight: 'bold',
            textShadow: '0 0 10px #00d4ff',
            zIndex: '10'
        });
        this.boltContainer.innerText = '⚙️ Bolts: 0';
        document.body.appendChild(this.boltContainer);

        // --- 2. The EXP Bar (Bottom Center) ---
        this.expWrapper = document.createElement('div');
        Object.assign(this.expWrapper.style, {
            position: 'absolute',
            bottom: '20px', // Sits nicely at the bottom
            left: '50%',
            transform: 'translateX(-50%)',
            width: '400px',
            height: '15px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '2px solid #555',
            borderRadius: '10px',
            overflow: 'hidden',
            zIndex: '10'
        });

        this.expFill = document.createElement('div');
        Object.assign(this.expFill.style, {
            width: '0%',
            height: '100%',
            background: 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)', // Nice purple/blue gradient
            transition: 'width 0.3s ease-out'
        });
        this.expWrapper.appendChild(this.expFill);
        
        // --- 3. The Level Text ---
        this.levelText = document.createElement('div');
        Object.assign(this.levelText.style, {
            position: 'absolute',
            bottom: '45px', // Just above the EXP bar
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffffff',
            fontFamily: 'sans-serif',
            fontSize: '18px',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            zIndex: '10'
        });
        this.levelText.innerText = 'Level 1';
        
        document.body.appendChild(this.expWrapper);
        document.body.appendChild(this.levelText);
    }

    // Called whenever the player's stats change
    update(level, exp, maxExp, bolts) {
        this.boltContainer.innerText = `⚙️ Bolts: ${bolts}`;
        this.levelText.innerText = `Level ${level}`;
        
        const percent = Math.min((exp / maxExp) * 100, 100);
        this.expFill.style.width = `${percent}%`;
    }
}