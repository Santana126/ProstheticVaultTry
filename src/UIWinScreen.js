export class UIWinScreen {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'win-screen-overlay';
        Object.assign(this.container.style, {
            display: 'none', // Hidden by default
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(212, 175, 55, 0.85)', // Gold tinted background!
            zIndex: '20',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontFamily: 'sans-serif'
        });

        const title = document.createElement('h1');
        title.innerText = 'VAULT CLEARED';
        Object.assign(title.style, {
            fontSize: '5rem',
            color: '#ffffff',
            marginBottom: '10px',
            textShadow: '0 0 20px #ffffff'
        });

        const subtitle = document.createElement('p');
        subtitle.innerText = 'VAULT PROSTETICO APERTO';
        Object.assign(subtitle.style, {
            fontSize: '2rem',
            marginBottom: '30px',
            fontWeight: 'bold'
        });

        const btn = document.createElement('button');
        btn.innerText = 'PLAY AGAIN';
        Object.assign(btn.style, {
            padding: '15px 30px',
            fontSize: '1.2rem',
            background: '#ffffff',
            color: '#d4af37',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
        });
        btn.onclick = () => location.reload();

        this.container.appendChild(title);
        this.container.appendChild(subtitle);
        this.container.appendChild(btn);
        document.body.appendChild(this.container);
    }

    show() {
        this.container.style.display = 'flex';
    }
}