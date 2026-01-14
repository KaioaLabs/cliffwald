export class MinigameManager {
    private container: HTMLElement;
    private active: boolean = false;
    private onComplete: (score: number) => void = () => {};

    constructor() {
        // Create container if it doesn't exist
        let el = document.getElementById('minigame-layer');
        if (!el) {
            el = document.createElement('div');
            el.id = 'minigame-layer';
            el.style.position = 'absolute';
            el.style.top = '0';
            el.style.left = '0';
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.pointerEvents = 'none'; // Allow clicks through if empty
            el.style.display = 'flex';
            el.style.justifyContent = 'center';
            el.style.alignItems = 'center';
            el.style.zIndex = '5000'; // Top layer
            document.body.appendChild(el);
        }
        this.container = el;
    }

    public startMinigame(type: 'charms' | 'potions' | 'history', duration: number, callback: (score: number) => void) {
        if (this.active) return;
        this.active = true;
        this.onComplete = callback;
        this.container.innerHTML = '';
        this.container.style.pointerEvents = 'auto'; // Block clicks

        // Placeholder for specific games
        if (type === 'charms') this.startCharms(duration);
        else if (type === 'potions') this.startPotions(duration);
        else if (type === 'history') this.startHistory(duration);
    }

    private finish(score: number) {
        this.active = false;
        this.container.innerHTML = '';
        this.container.style.pointerEvents = 'none';
        this.onComplete(score);
    }

    // --- GAMES ---

    private startCharms(duration: number) {
        // "Runic Timing": Hit Space when spinner is in green
        let hits = 0;
        let attempts = 0;
        const maxAttempts = 5;

        const wrapper = this.createWrapper("CHARMS CLASS: Timing");
        
        // Visuals
        const circle = document.createElement('div');
        circle.style.width = '100px';
        circle.style.height = '100px';
        circle.style.border = '10px solid #444';
        circle.style.borderRadius = '50%';
        circle.style.position = 'relative';
        circle.style.margin = '20px auto';
        
        const target = document.createElement('div');
        target.style.position = 'absolute';
        target.style.top = '-10px';
        target.style.left = '40px';
        target.style.width = '20px';
        target.style.height = '20px';
        target.style.backgroundColor = '#0f0';
        
        const cursor = document.createElement('div');
        cursor.style.position = 'absolute';
        cursor.style.top = '50%';
        cursor.style.left = '50%';
        cursor.style.width = '50%';
        cursor.style.height = '4px';
        cursor.style.backgroundColor = '#f00';
        cursor.style.transformOrigin = 'left center';
        
        circle.appendChild(target);
        circle.appendChild(cursor);
        wrapper.appendChild(circle);

        const info = document.createElement('div');
        info.innerText = `Press SPACE at the top! (0/${maxAttempts})`;
        wrapper.appendChild(info);

        // Logic
        let angle = 0;
        const speed = 5; // deg per frame
        const interval = setInterval(() => {
            angle = (angle + speed) % 360;
            cursor.style.transform = `rotate(${angle - 90}deg)`; // -90 to start top
        }, 16);

        const listener = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                attempts++;
                // Target is at Top (approx 270 deg or -90 deg visual). 
                // We rotate from right. 0 is Right. 270 is Top.
                // Tolerance +/- 30 deg.
                // Wait, visually -90deg is top. 
                // Angle 0 = right. 270 = top.
                // Check dist from 270.
                const dist = Math.abs(angle - 270);
                if (dist < 30) {
                    hits++;
                    info.style.color = '#0f0';
                    info.innerText = "HIT!";
                } else {
                    info.style.color = '#f00';
                    info.innerText = "MISS!";
                }

                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    window.removeEventListener('keydown', listener);
                    const finalScore = Math.floor((hits / maxAttempts) * 100);
                    setTimeout(() => this.finish(finalScore), 1000);
                } else {
                    setTimeout(() => {
                        info.style.color = '#fff';
                        info.innerText = `Attempts: ${attempts}/${maxAttempts}`;
                    }, 500);
                }
            }
        };
        window.addEventListener('keydown', listener);
    }

    private startPotions(duration: number) {
        // "Cauldron Stir": Mash space to keep bar in green
        let heat = 0; // 0 to 100
        let scoreAccumulator = 0;
        let frames = 0;

        const wrapper = this.createWrapper("POTIONS CLASS: Stirring");
        
        const barContainer = document.createElement('div');
        barContainer.style.width = '40px';
        barContainer.style.height = '200px';
        barContainer.style.background = '#333';
        barContainer.style.margin = '20px auto';
        barContainer.style.position = 'relative';
        barContainer.style.border = '2px solid white';

        // Target Zone (Green)
        const target = document.createElement('div');
        target.style.position = 'absolute';
        target.style.bottom = '40%';
        target.style.height = '20%'; // 40-60%
        target.style.width = '100%';
        target.style.background = 'rgba(0, 255, 0, 0.5)';
        barContainer.appendChild(target);

        // Fill
        const fill = document.createElement('div');
        fill.style.position = 'absolute';
        fill.style.bottom = '0';
        fill.style.left = '0';
        fill.style.width = '100%';
        fill.style.background = '#f00'; // Heat color
        fill.style.height = '0%';
        fill.style.transition = 'height 0.1s linear';
        barContainer.appendChild(fill);

        wrapper.appendChild(barContainer);
        
        const hint = document.createElement('div');
        hint.innerText = "Mash SPACE to keep heat in green!";
        wrapper.appendChild(hint);

        // Logic
        const listener = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                heat = Math.min(100, heat + 15);
            }
        };
        window.addEventListener('keydown', listener);

        const interval = setInterval(() => {
            heat = Math.max(0, heat - 2); // Cool down
            fill.style.height = `${heat}%`;
            
            // Score check
            if (heat >= 40 && heat <= 60) {
                scoreAccumulator++;
                fill.style.background = '#0f0';
            } else {
                fill.style.background = '#f00';
            }
            
            frames++;
            if (frames >= 60 * 10) { // 10 seconds approx (assuming 60fps interval, actually 16ms interval is ~60fps)
                clearInterval(interval);
                window.removeEventListener('keydown', listener);
                const maxPossible = 60 * 10;
                const finalScore = Math.min(100, Math.floor((scoreAccumulator / maxPossible) * 200)); // Normalize
                this.finish(finalScore);
            }
        }, 16);
    }

    private startHistory(duration: number) {
        // "Memory": Sequence
        const options = ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'];
        const sequence: string[] = [];
        for (let i = 0; i < 5; i++) {
            sequence.push(options[Math.floor(Math.random() * options.length)]);
        }
        
        let inputIndex = 0;

        const wrapper = this.createWrapper("HISTORY CLASS: Memorize");
        
        const display = document.createElement('div');
        display.style.fontSize = '32px';
        display.style.letterSpacing = '10px';
        display.style.margin = '20px';
        display.innerText = "?????";
        wrapper.appendChild(display);

        const hint = document.createElement('div');
        hint.innerText = "Watch the sequence...";
        wrapper.appendChild(hint);

        // Play Sequence
        let i = 0;
        const playInterval = setInterval(() => {
            if (i >= sequence.length) {
                clearInterval(playInterval);
                display.innerText = "_ _ _ _ _";
                hint.innerText = "Repeat the sequence!";
                startListening();
                return;
            }
            
            const arrow = sequence[i];
            const symbol = arrow === 'ArrowUp' ? '⬆️' : (arrow === 'ArrowDown' ? '⬇️' : (arrow === 'ArrowLeft' ? '⬅️' : '➡️'));
            display.innerText = symbol;
            i++;
            
            // Blink effect
            setTimeout(() => display.innerText = "", 500);
        }, 1000);

        const startListening = () => {
            const listener = (e: KeyboardEvent) => {
                if (e.code === sequence[inputIndex]) {
                    inputIndex++;
                    // Visual feedback
                    const currentText = display.innerText.split(' ');
                    currentText[inputIndex - 1] = "✅";
                    display.innerText = currentText.join(' ');

                    if (inputIndex >= sequence.length) {
                        window.removeEventListener('keydown', listener);
                        this.finish(100);
                    }
                } else {
                    // Fail
                    window.removeEventListener('keydown', listener);
                    hint.style.color = '#f00';
                    hint.innerText = "WRONG!";
                    setTimeout(() => this.finish(0), 1000);
                }
            };
            window.addEventListener('keydown', listener);
        };
    }

    private createWrapper(title: string): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.background = 'rgba(0, 0, 0, 0.9)';
        wrapper.style.padding = '20px';
        wrapper.style.borderRadius = '10px';
        wrapper.style.border = '2px solid gold';
        wrapper.style.color = 'white';
        wrapper.style.textAlign = 'center';
        wrapper.style.minWidth = '300px';
        
        const h2 = document.createElement('h2');
        h2.innerText = title;
        wrapper.appendChild(h2);
        
        this.container.appendChild(wrapper);
        return wrapper;
    }
}
