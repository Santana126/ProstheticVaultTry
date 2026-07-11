export class UIHealthBar {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'health-container';
        Object.assign(this.container.style, {
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            width: '300px',
            height: '25px',
            background: 'rgba(0,0,0,0.7)',
            border: '2px solid #ff3333',
            borderRadius: '4px',
            zIndex: '5',
            pointerEvents: 'none'
        });

        this.fill = document.createElement('div');
        this.fill.id = 'health-fill';
        Object.assign(this.fill.style, {
            width: '100%',
            height: '100%',
            background: '#ff3333',
            transition: 'width 0.2s ease-out'
        });

        this.text = document.createElement('div');
        this.text.id = 'health-text';
        Object.assign(this.text.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            textAlign: 'center',
            color: 'white',
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            lineHeight: '25px',
            textShadow: '1px 1px 2px black'
        });

        this.container.appendChild(this.fill);
        this.container.appendChild(this.text);
        document.body.appendChild(this.container);

        this.update(100, 100);
    }

    update(currentHealth, maxHealth) {
        const safeHealth = Math.max(0, currentHealth);
        const percentage = (safeHealth / maxHealth) * 100;
        
        this.fill.style.width = `${percentage}%`;
        this.text.innerText = `${safeHealth} / ${maxHealth}`;
    }

    hide() {
        this.container.style.display = 'none';
    }
}