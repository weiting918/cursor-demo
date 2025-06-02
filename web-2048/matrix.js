class MatrixRain {
    constructor() {
        this.initialize();
    }

    initialize() {
        // Get canvas element
        this.canvas = document.getElementById('matrixCanvas');
        if (!this.canvas) {
            console.error('Matrix canvas element not found');
            return;
        }

        // Get context
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Could not get canvas context');
            return;
        }

        // Set initial size
        this.resize();

        // Matrix characters (including more varied characters)
        this.chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ¥$@#%&'.split('');

        // Rain settings
        this.fontSize = 14;
        this.drops = [];
        this.dropsCount = 0;

        // Bind event listeners
        window.addEventListener('resize', () => this.resize());

        // Initialize drops
        this.initDrops();

        // Start animation
        this.isRunning = true;
        this.animate();
    }

    resize() {
        // Get actual pixel ratio for retina displays
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        
        // Scale context
        this.ctx.scale(dpr, dpr);
        
        // Set CSS size
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        
        // Recalculate drops
        this.dropsCount = Math.ceil(window.innerWidth / this.fontSize);
        this.initDrops();
    }

    initDrops() {
        this.drops = [];
        for (let i = 0; i < this.dropsCount; i++) {
            this.drops[i] = {
                x: i * this.fontSize,
                y: Math.random() * -100,
                speed: 1 + Math.random() * 2,
                length: Math.floor(5 + Math.random() * 15)
            };
        }
    }

    draw() {
        // Create fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Set initial text properties
        this.ctx.font = this.fontSize + 'px monospace';

        // Update and draw each drop
        for (let i = 0; i < this.drops.length; i++) {
            const drop = this.drops[i];

            // Draw characters in the trail
            for (let j = 0; j < drop.length; j++) {
                const char = this.chars[Math.floor(Math.random() * this.chars.length)];
                const y = drop.y - (j * this.fontSize);
                
                // Vary the green color and opacity based on position in trail
                const opacity = 1 - (j / drop.length);
                const green = Math.floor(200 + (opacity * 55));
                this.ctx.fillStyle = `rgba(0, ${green}, 0, ${opacity})`;
                
                this.ctx.fillText(char, drop.x, y);
            }

            // Move drop
            drop.y += drop.speed;

            // Reset drop if it's gone too far
            if (drop.y > this.canvas.height + drop.length * this.fontSize) {
                drop.y = -drop.length * this.fontSize;
                drop.speed = 1 + Math.random() * 2;
                drop.length = Math.floor(5 + Math.random() * 15);
            }
        }
    }

    animate() {
        if (!this.isRunning) return;
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    stop() {
        this.isRunning = false;
    }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.matrixRain = new MatrixRain();
    } catch (error) {
        console.error('Failed to initialize Matrix rain:', error);
    }
}); 