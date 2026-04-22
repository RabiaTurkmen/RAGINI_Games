/**
 * Fruit Ninja Clone - MODES VERSION
 * Features: Classic, Zen, and Arcade Modes with Power-ups and Timers
 */

const CONFIG = {
    GRAVITY: 0.18,
    FRICTION: 0.99,
    FRUIT_RADIUS: 42,
    SPAWN_INTERVAL: 2000, 
    MIN_LIVES: 3,
    TRAIL_LENGTH: 12,
    MODES: {
        CLASSIC: { name: 'Classic', timer: null, bombsEnd: true, lives: 3 },
        ZEN: { name: 'Zen', timer: 90, bombsEnd: false, lives: null },
        ARCADE: { name: 'Arcade', timer: 60, bombsEnd: false, lives: null },
        SURVIVAL: { name: 'Survival', timer: null, bombsEnd: true, lives: 1 },
        TRAINING: { name: 'Training', timer: null, bombsEnd: false, lives: null }
    }
};

const FRUIT_TYPES = {
    WATERMELON: { name: 'Watermelon', color: '#2ecc71', secondary: '#ff3f34', score: 10, juice: '#ff3f34' },
    ORANGE: { name: 'Orange', color: '#ffa502', secondary: '#ff7f50', score: 10, juice: '#ffa502' },
    APPLE: { name: 'Apple', color: '#ff4757', secondary: '#f7f1e3', score: 10, juice: '#ff4757' },
    PITAYA: { name: 'Pitaya', color: '#ef5777', secondary: '#ffffff', score: 50, juice: '#ef5777', isSpecial: true },
    BOMB: { name: 'Bomb', color: '#2f3542', secondary: '#1e272e', score: 0, isBomb: true },
    // Power-up Baranas
    FREEZE: { name: 'Freeze', color: '#0fbcf9', secondary: '#ffffff', score: 20, isPowerup: true, power: 'FREEZE' },
    FRENZY: { name: 'Frenzy', color: '#ffdd59', secondary: '#f53b57', score: 20, isPowerup: true, power: 'FRENZY' },
    DOUBLE: { name: 'Double', color: '#a55eea', secondary: '#ffffff', score: 20, isPowerup: true, power: 'DOUBLE' },
    POMEGRANATE: { name: 'Pomegranate', color: '#c0392b', secondary: '#ffffff', score: 0, isPomegranate: true }
};

class FeedbackText {
    constructor(x, y, text, color, size = 60) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        const mobileScale = window.innerWidth < 600 ? 0.6 : 1.0;
        this.size = size * mobileScale;
        this.life = 1.0; this.vx = (Math.random() - 0.5) * 4; this.vy = -3;
        this.scale = 0.5;
    }
    update() { 
        this.x += this.vx; this.y += this.vy; this.life -= 0.02; 
        if (this.scale < 1.0) this.scale += 0.1;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 6;
        ctx.font = `900 ${this.size}px Outfit`;
        ctx.textAlign = 'center';
        ctx.strokeText(this.text, 0, 0);
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, type = 'juice') {
        this.x = x; this.y = y; this.color = color; this.type = type;
        this.radius = type === 'smoke' ? Math.random() * 6 + 2 : Math.random() * 5 + 3;
        const speed = type === 'smoke' ? Math.random() * 2 : Math.random() * 10 + 4;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = type === 'smoke' ? -speed : Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = type === 'smoke' ? 0.012 : Math.random() * 0.03 + 0.02;
    }
    update(timeScale = 1.0) {
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;
        if (this.type !== 'smoke') this.vy += CONFIG.GRAVITY * 0.7 * timeScale;
        this.life -= this.decay * timeScale;
    }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class Fruit {
    constructor(canvas, typeName, isMenu = false, fromSide = null) {
        this.canvas = canvas;
        this.typeName = typeName;
        this.type = FRUIT_TYPES[typeName];
        this.radius = CONFIG.FRUIT_RADIUS;
        this.isMenu = isMenu;
        
        if (isMenu) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = (Math.random() - 0.5) * 1.5;
        } else if (fromSide) {
            // Frenzy mode side spawn - scale velocity with width
            this.x = fromSide === 'left' ? -this.radius : canvas.width + this.radius;
            this.y = Math.random() * canvas.height * 0.6 + canvas.height * 0.2;
            const baseVX = Math.max(6, canvas.width * 0.012);
            this.vx = fromSide === 'left' ? (baseVX + Math.random() * 5) : -(baseVX + Math.random() * 5);
            this.vy = -Math.random() * 3 - 2; // Slightly reduced vertical for side spawns in landscape
        } else {
            const isLandscape = canvas.width > canvas.height;
            // Relative spawn range (e.g., 15% to 85% of width)
            const padding = canvas.width * 0.15;
            this.x = Math.random() * (canvas.width - padding * 2) + padding;
            this.y = canvas.height + this.radius;
            
            // Landscape: tighter target range and higher relative jump height
            const targetRange = isLandscape ? 0.5 : 0.7;
            const targetX = canvas.width / 2 + (Math.random() - 0.5) * (canvas.width * targetRange);
            
            const minJump = isLandscape ? 0.78 : 0.55;
            const maxJump = isLandscape ? 0.95 : 0.90;
            const jumpHeight = canvas.height * (minJump + Math.random() * (maxJump - minJump));
            
            const timeToPeak = 65 + Math.random() * 15;
            this.vx = (targetX - this.x) / (timeToPeak * 2);
            this.vy = -Math.sqrt(2 * CONFIG.GRAVITY * jumpHeight);
        }
        
        this.angle = 0;
        this.rotationSpeed = typeName === 'POMEGRANATE' ? 0 : (Math.random() - 0.5) * 0.18;
        this.isSliced = false;
        this.sliceAngle = 0;
        this.sliceOffset = 0;
        this.scale = 1.0;
    }

    update(timeScale = 1.0) {
        if (this.isMenu || this.type.isPomegranate) {
            if (!this.type.isPomegranate) {
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1;
            } else {
                // Fly-in logic for pomegranate
                const targetY = this.canvas.height / 2;
                if (Math.abs(this.y - targetY) > 5) {
                    this.y += this.vy * timeScale;
                    this.vy *= 0.98; // Decelerate as it enters
                } else {
                    this.y = targetY;
                    this.vy = 0;
                }
            }
        } else {
            this.x += this.vx * timeScale;
            this.y += this.vy * timeScale;
            this.vy += CONFIG.GRAVITY * timeScale;
        }
        
        this.angle += this.rotationSpeed * timeScale;
        if (this.isSliced) {
            this.sliceOffset += 4 * timeScale; // Slower, more natural separation
            this.rotationSpeed *= 0.99;
        }
        return this.isMenu || (this.y < this.canvas.height + this.radius * 6 && this.y > -2000);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        if (!this.isSliced) ctx.rotate(this.angle);
        
        if ((this.type.isSpecial || this.type.isPowerup) && !this.isSliced) this.drawAura(ctx);
        if (!this.isSliced) this.drawFruitAuthentic(ctx);
        else this.drawSlicedAuthentic(ctx);
        ctx.restore();
    }

    drawAura(ctx) {
        const pulse = Math.sin(Date.now() / 150) * 15 + 25;
        let color = 'rgba(239, 87, 119, 0.4)';
        if (this.type.isPowerup) {
            if (this.type.power === 'FREEZE') color = 'rgba(15, 188, 249, 0.6)';
            else if (this.type.power === 'FRENZY') color = 'rgba(255, 221, 89, 0.6)';
            else if (this.type.power === 'DOUBLE') color = 'rgba(165, 94, 234, 0.6)';
        }
        
        const grad = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius + pulse);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, this.radius + pulse, 0, Math.PI*2); ctx.fill();
    }

    drawFruitAuthentic(ctx) {
        ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,0,0,0.5)';
        if (this.type.isBomb) {
            this.drawBomb(ctx);
        } else if (this.type.isPowerup) {
            this.drawBanana(ctx);
        } else {
            switch(this.typeName) {
                case 'WATERMELON': this.drawWatermelon(ctx); break;
                case 'APPLE': this.drawApple(ctx); break;
                case 'ORANGE': this.drawOrange(ctx); break;
                case 'PITAYA': this.drawPitaya(ctx); break;
                case 'POMEGRANATE': this.drawPomegranate(ctx); break;
                default: this.drawDefaultFruit(ctx);
            }
        }
    }

    drawDefaultFruit(ctx) {
        const r = this.radius;
        const grad = ctx.createRadialGradient(-r/3, -r/3, 5, 0, 0, r);
        grad.addColorStop(0, this.type.color); grad.addColorStop(1, '#000');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }

    drawWatermelon(ctx) {
        const r = this.radius;
        const grad = ctx.createRadialGradient(-r/3, -r/3, 5, 0, 0, r);
        grad.addColorStop(0, this.type.color); grad.addColorStop(1, '#000');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = '#1b4d3e'; ctx.lineWidth = 5;
        for(let i=0; i<6; i++) {
            ctx.beginPath(); const ang = (i / 6) * Math.PI * 2;
            ctx.moveTo(Math.cos(ang)*r, Math.sin(ang)*r);
            ctx.quadraticCurveTo(0,0, Math.cos(ang+Math.PI)*r, Math.sin(ang+Math.PI)*r);
            ctx.stroke();
        }
    }

    drawApple(ctx) {
        const r = this.radius;
        // Body - Heart shaped
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.8);
        ctx.bezierCurveTo(r, -r * 1.1, r * 1.2, r * 0.5, 0, r);
        ctx.bezierCurveTo(-r * 1.2, r * 0.5, -r, -r * 1.1, 0, -r * 0.8);
        
        const grad = ctx.createRadialGradient(-r/3, -r/2, r/5, 0, 0, r);
        grad.addColorStop(0, '#ff4d4d');
        grad.addColorStop(0.6, '#ff0000');
        grad.addColorStop(1, '#660000');
        ctx.fillStyle = grad; ctx.fill();

        // Stem
        ctx.fillStyle = '#4b2c20'; ctx.fillRect(-2, -r - 5, 4, 12);
        // Leaf
        this.drawLeaf(ctx, 2, -r - 3, -0.5);
    }

    drawOrange(ctx) {
        const r = this.radius;
        const grad = ctx.createRadialGradient(-r/3, -r/3, r/5, 0, 0, r);
        grad.addColorStop(0, '#ffa502'); grad.addColorStop(1, '#d35400');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
        
        // Texture
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for(let i=0; i<40; i++) {
            const ang = i * 0.95;
            const dist = (i * 7) % (r - 5);
            ctx.beginPath(); ctx.arc(Math.cos(ang)*dist, Math.sin(ang)*dist, 1.2, 0, Math.PI*2); ctx.fill();
        }
        // Stem spot
        ctx.fillStyle = '#27ae60';
        ctx.beginPath(); ctx.arc(0, -r+2, 4, 0, Math.PI*2); ctx.fill();
    }

    drawPitaya(ctx) {
        const r = this.radius;
        const grad = ctx.createRadialGradient(-r/3, -r/3, r/5, 0, 0, r);
        grad.addColorStop(0, '#ef5777'); grad.addColorStop(1, '#811d5e');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
        
        // Scales
        ctx.fillStyle = '#27ae60';
        for(let i=0; i<8; i++) {
            ctx.save();
            ctx.rotate((i / 8) * Math.PI * 2 + Date.now()/2000);
            ctx.beginPath();
            ctx.moveTo(r - 5, 0);
            ctx.bezierCurveTo(r + 15, -10, r + 15, 10, r - 5, 0);
            ctx.fill();
            ctx.restore();
        }
    }

    drawPomegranate(ctx) {
        const r = this.radius * 1.15;
        // Body with richer gradients
        const grad = ctx.createRadialGradient(-r/4, -r/4, r/10, 0, 0, r);
        grad.addColorStop(0, '#e74c3c'); 
        grad.addColorStop(0.7, '#c0392b'); 
        grad.addColorStop(1, '#641e16');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        for(let i=0; i<16; i++) {
            const ang = (i / 16) * Math.PI * 2;
            const off = (i % 2 === 0 ? 0 : 4);
            ctx.lineTo(Math.cos(ang)*(r+off), Math.sin(ang)*(r+off));
        }
        ctx.closePath(); ctx.fill();
        
        // Detailed 3D Crown
        ctx.save();
        ctx.translate(0, -r * 0.9);
        for(let i=0; i<6; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#641e16' : '#922b21';
            ctx.save();
            ctx.rotate((i - 2.5) * 0.38);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-6, -18, 0, -22);
            ctx.quadraticCurveTo(6, -18, 0, 0);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
        
        // Skin texture highlights
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for(let i=0; i<25; i++) {
            const ang = i * 2.3;
            const dist = (i * 9.5) % (r - 8);
            ctx.beginPath();
            ctx.arc(Math.cos(ang)*dist, Math.sin(ang)*dist, 1.2, 0, Math.PI*2);
            ctx.stroke();
        }
    }

    drawBanana(ctx) {
        ctx.save();
        ctx.rotate(-Math.PI / 6);
        const r = this.radius;
        const power = this.type.power;

        // Base Gradient
        let grad = ctx.createLinearGradient(-r, 0, r, 0);
        if (power === 'FREEZE') {
            grad.addColorStop(0, '#00d2ff'); grad.addColorStop(0.5, '#fff'); grad.addColorStop(1, '#00d2ff');
        } else if (power === 'FRENZY') {
            grad.addColorStop(0, '#f1c40f'); grad.addColorStop(0.5, '#f1c40f'); grad.addColorStop(1, '#f1c40f');
        } else if (power === 'DOUBLE') {
            grad.addColorStop(0, '#4b0082'); grad.addColorStop(0.5, '#8e44ad'); grad.addColorStop(1, '#4b0082');
        } else {
            grad.addColorStop(0, '#f1c40f'); grad.addColorStop(0.5, '#f39c12'); grad.addColorStop(1, '#f1c40f');
        }
        ctx.fillStyle = grad;
        
        // Body
        ctx.beginPath();
        ctx.moveTo(-r * 1.2, 0);
        ctx.bezierCurveTo(-r * 0.5, -r * 1.2, r * 0.5, -r * 1.2, r * 1.2, 0);
        ctx.bezierCurveTo(r * 0.5, -r * 0.5, -r * 0.5, -r * 0.5, -r * 1.2, 0);
        ctx.fill();
        
        // Special Patterns
        if (power === 'FRENZY') {
            ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 4;
            for(let i=-2; i<=2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 15, -r * 0.9);
                ctx.quadraticCurveTo(i * 15 + 5, -r/2, i * 15, -r * 0.1);
                ctx.stroke();
            }
        } else if (power === 'DOUBLE') {
            const colors = ['#fff', '#fd79a8', '#81ecec'];
            for(let i=0; i<15; i++) {
                ctx.fillStyle = colors[i % 3];
                const x = ((i * 23) % (r * 1.8)) - r * 0.9;
                const y = -r * 0.4 - ((i * 7) % 12);
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
            }
        } else if (power === 'FREEZE') {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
            for(let i=0; i<3; i++) {
                ctx.beginPath();
                const x = -r/2 + i * 15;
                ctx.moveTo(x, -r*0.6); ctx.lineTo(x + 10, -r*0.9);
                ctx.stroke();
            }
        } else if (!this.type.isPowerup) {
            // Aging spots for normal bananas
            ctx.fillStyle = 'rgba(44, 33, 6, 0.2)';
            for(let i=0; i<12; i++) {
                const x = ((i * 17) % (r * 1.8)) - r * 0.9;
                const y = -r * 0.4 - ((i * 3) % 10);
                ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
            }
        }
        
        // Stem
        ctx.fillStyle = power === 'FREEZE' ? '#fff' : '#4b2c20';
        ctx.beginPath();
        ctx.moveTo(-r * 1.2, 0); ctx.lineTo(-r * 1.4, -6); ctx.lineTo(-r * 1.35, 6);
        ctx.closePath(); ctx.fill();
        
        ctx.restore();
    }

    drawBomb(ctx) {
        const r = this.radius;
        // Body
        const grad = ctx.createRadialGradient(-r/3, -r/3, r/10, 0, 0, r);
        grad.addColorStop(0, '#57606f'); grad.addColorStop(0.5, '#2f3542'); grad.addColorStop(1, '#000');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
        
        // Glare
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.ellipse(-r/3, -r/3, r/3, r/5, Math.PI/4, 0, Math.PI*2); ctx.fill();
        
        // Cap
        ctx.fillStyle = '#1e272e';
        ctx.beginPath(); ctx.roundRect(-r/3, -r-4, r*0.66, 10, 3); ctx.fill();
        
        // Fuse
        ctx.strokeStyle = '#d35400'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, -r-4);
        ctx.quadraticCurveTo(r/2, -r-25, r*0.8, -r-15); ctx.stroke();
        
        // Spark effect
        const sparkX = r*0.8, sparkY = -r-15;
        const p = Math.sin(Date.now() / 60) * 4 + 8;
        const sparkGrad = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, p);
        sparkGrad.addColorStop(0, '#fff'); sparkGrad.addColorStop(0.4, '#f1c40f'); sparkGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sparkGrad; ctx.beginPath(); ctx.arc(sparkX, sparkY, p, 0, Math.PI*2); ctx.fill();
    }

    drawLeaf(ctx, x, y, rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        const grad = ctx.createLinearGradient(0, 0, 20, 0);
        grad.addColorStop(0, '#27ae60'); grad.addColorStop(1, '#2ecc71');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(15, -15, 30, -5, 0, 0);
        ctx.bezierCurveTo(-15, -15, -30, -5, 0, 0);
        ctx.fill();
        ctx.restore();
    }

    drawSlicedAuthentic(ctx) {
        ctx.save();
        ctx.rotate(this.sliceAngle);
        
        // Top half with its own rotation
        ctx.save(); 
        ctx.translate(0, -this.sliceOffset); 
        ctx.rotate(this.angle); 
        this.drawInternal(ctx, true); 
        ctx.restore();
        
        // Bottom half with its own rotation
        ctx.save(); 
        ctx.translate(0, this.sliceOffset); 
        ctx.scale(1, -1); 
        ctx.rotate(-this.angle); 
        this.drawInternal(ctx, false); 
        ctx.restore();
        
        ctx.restore();
    }

    drawInternal(ctx, isTop) {
        if (this.typeName === 'BANANA' || this.type.isPowerup) {
            const r = this.radius;
            ctx.save();
            
            // Slender Side View (Natural side-profile of a banana segment)
            ctx.fillStyle = this.type.color;
            ctx.beginPath();
            // Using a much smaller thickness ratio for an elegant look
            const thickness = r * 0.3;
            ctx.moveTo(0, -thickness);
            // Elongated elegant curve towards tip
            ctx.bezierCurveTo(r * 0.7, -thickness * 1.8, r * 1.3, -thickness * 0.8, r * 1.5, 0); 
            // Back to bottom edge with a natural taper
            ctx.bezierCurveTo(r * 1.3, thickness * 1.0, r * 0.7, thickness * 1.5, 0, thickness);
            ctx.closePath();
            ctx.fill();

            // Small delicate tip/stem detail
            ctx.fillStyle = '#4b2c20';
            ctx.beginPath();
            ctx.arc(r * 1.5, 0, 3.8, 0, Math.PI * 2);
            ctx.fill();

            // Cut Cross-section Face (Creamy interior)
            ctx.fillStyle = '#fffdf0';
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.15, thickness, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Subtle seed dots for realism
            ctx.fillStyle = 'rgba(75, 44, 32, 0.3)';
            for(let i=0; i<3; i++) {
                ctx.beginPath(); ctx.arc((i-1)*5, 0, 1.2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        } else {
            // Standard circular slice for other fruits (Apple, Orange, etc.)
            ctx.fillStyle = this.type.color; ctx.beginPath(); ctx.arc(0, 0, this.radius, Math.PI, 0); ctx.fill();
            ctx.fillStyle = this.type.secondary; ctx.beginPath(); ctx.ellipse(0, 0, this.radius * 0.95, this.radius * 0.38, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        if (this.typeName === 'WATERMELON') {
            ctx.fillStyle = '#000';
            for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 12, 10, 3, 0, Math.PI*2); ctx.fill(); }
        }
    }

    checkSlice(x1, y1, x2, y2) {
        if (this.isSliced || this.isMenu) return false;
        const dist = this.getPointLineDist(this.x, this.y, x1, y1, x2, y2);
        if (dist < this.radius) {
            if (!this.type.isPomegranate) this.isSliced = true;
            this.sliceAngle = Math.atan2(y2 - y1, x2 - x1) - this.angle;
            
            // Adjust momentum when sliced to feel more realistic
            if (this.isSliced) {
                this.vy *= 0.5; // Reduce upward pop
                this.vx *= 1.2; // Slight horizontal spread
            }
            
            return true;
        }
        return false;
    }

    getPointLineDist(px, py, x1, y1, x2, y2) {
        const A = px-x1, B = py-y1, C = x2-x1, D = y2-y1;
        const dot = A*C + B*D, lenSq = C*C + D*D;
        const param = lenSq !== 0 ? dot / lenSq : -1;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        return Math.sqrt((px - xx)**2 + (py - yy)**2);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.bgCanvas = document.createElement('canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        this.entities = []; this.particles = []; this.feedbacks = [];
        this.trail = []; this.score = 0; this.lives = CONFIG.MIN_LIVES;
        this.isRunning = false; this.lastSpawn = 0; this.difficulty = 1.0;
        this.currentMode = 'CLASSIC';
        this.timer = 0;
        this.lastTimeUpdate = 0;
        
        // Power-up States
        this.timeScale = 1.0;
        this.doubleScore = false;
        this.frenzyTimer = 0;
        this.lastPowerupTime = 0;
        this.pomegranateActive = false;
        this.pomegranateDone = false;
        
        this.isMouseDown = false; this.mouse = { x: 0, y: 0 }; this.lastMouse = { x: 0, y: 0 };
        
        this.resize(); 
        this.initInput(); 
        this.initUI(); 
        this.setupMenuFruits();
        
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => this.resize());
        
        this.loop(0);
    }

    resize() {
        const oldW = this.canvas.width;
        const oldH = this.canvas.height;
        this.canvas.width = window.innerWidth; 
        this.canvas.height = window.innerHeight;
        
        // Save background stains before resizing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = oldW; tempCanvas.height = oldH;
        tempCanvas.getContext('2d').drawImage(this.bgCanvas, 0, 0);
        
        this.bgCanvas.width = this.canvas.width; 
        this.bgCanvas.height = this.canvas.height;
        // Redraw old stains (they might be slightly clipped or off-center but better than disappearing)
        this.bgCtx.drawImage(tempCanvas, 0, 0);
    }

    initUI() {
        this.scoreEl = document.getElementById('score-value');
        this.timerContainer = document.getElementById('timer-container');
        this.timerValueEl = document.getElementById('timer-value');
        this.comboEl = document.getElementById('combo-display');
        this.comboCountEl = document.getElementById('combo-count');
        this.bestScoreEl = document.getElementById('best-score');
        this.bestScoreEl.innerText = localStorage.getItem(`ninja_best_CLASSIC`) || 0;

        document.querySelectorAll('.mode-card').forEach(card => {
            card.onclick = () => {
                document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.currentMode = card.dataset.mode;
                this.bestScoreEl.innerText = localStorage.getItem(`ninja_best_${this.currentMode}`) || 0;
            };
        });

        document.getElementById('start-button').onclick = () => this.start();
        document.getElementById('restart-button').onclick = () => {
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
        };
    }

    setupMenuFruits() {
        const t = Object.keys(FRUIT_TYPES).filter(k => !FRUIT_TYPES[k].isBomb && !FRUIT_TYPES[k].isPowerup);
        for(let i=0; i<10; i++) this.entities.push(new Fruit(this.canvas, t[i%t.length], true));
    }

    initInput() {
        const handleDown = (e) => { 
            this.isMouseDown = true; 
            this.updateMouse(e); 
            this.lastMouse = {...this.mouse}; 
        };
        const handleUp = () => { this.isMouseDown = false; this.trail = []; };
        const handleMove = (e) => {
            if (!this.isMouseDown) return;
            this.lastMouse = {...this.mouse}; 
            this.updateMouse(e);
            this.trail.unshift({...this.mouse}); 
            if (this.trail.length > CONFIG.TRAIL_LENGTH) this.trail.pop();
            this.handleSlicing();
        };

        window.addEventListener('mousedown', handleDown);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('mousemove', handleMove);

        // Mobile Touch Support with Scroll Locking
        window.addEventListener('touchstart', (e) => {
            if (this.isRunning) e.preventDefault();
            handleDown(e.touches[0]);
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            if (this.isRunning) e.preventDefault();
            handleUp();
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (this.isRunning) e.preventDefault();
            handleMove(e.touches[0]);
        }, { passive: false });
    }

    updateMouse(e) { this.mouse = { x: e.clientX, y: e.clientY }; }

    start() {
        this.score = 0; 
        this.entities = this.entities.filter(f => !f.isMenu); 
        this.particles = []; this.feedbacks = [];
        this.bgCtx.clearRect(0,0,this.bgCanvas.width, this.bgCanvas.height);
        
        // Reset power-up states and clear active timeouts to prevent state leakage
        this.timeScale = 1.0;
        this.doubleScore = false;
        this.frenzyTimer = 0;
        this.pomegranateActive = false;
        if (this.freezeTimeout) clearTimeout(this.freezeTimeout);
        if (this.frenzyTimeout) clearTimeout(this.frenzyTimeout);
        if (this.doubleTimeout) clearTimeout(this.doubleTimeout);
        
        // Reset UI visibility and effects
        const uiLayer = document.getElementById('ui-layer');
        uiLayer.classList.remove('freeze-active', 'frenzy-active', 'double-active');
        document.getElementById('active-powerup').classList.add('hidden');

        // Survival mode starts with higher difficulty for "Extreme" feel
        this.difficulty = this.currentMode === 'SURVIVAL' ? 2.0 : 1.0;
        this.isRunning = true;
        
        const modeCfg = CONFIG.MODES[this.currentMode];
        this.timer = modeCfg.timer;
        this.lives = modeCfg.lives !== null ? modeCfg.lives : 0;
        
        // Lives UI
        if (modeCfg.lives !== null) {
            document.getElementById('lives').classList.remove('hidden');
            document.querySelectorAll('.strike').forEach((strike, idx) => {
                if (idx < (CONFIG.MIN_LIVES - modeCfg.lives)) {
                    strike.style.display = 'none';
                } else {
                    strike.style.display = 'block';
                    strike.classList.remove('active');
                }
            });
        } else {
            document.getElementById('lives').classList.add('hidden');
        }

        // Timer UI
        if (modeCfg.timer !== null) {
            this.timerContainer.classList.remove('hidden');
            this.timerValueEl.innerText = Math.ceil(this.timer);
        } else {
            this.timerContainer.classList.add('hidden');
        }

        document.getElementById('score-value').innerText = "000";
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.pomegranateDone = false;
    }

    handleSlicing() {
        let slicedCount = 0;
        this.entities.forEach(f => {
            if (f.checkSlice(this.lastMouse.x, this.lastMouse.y, this.mouse.x, this.mouse.y)) {
                if (f.type.isBomb) {
                    const modeCfg = CONFIG.MODES[this.currentMode];
                    if (modeCfg.bombsEnd) this.triggerBombExplosion();
                    else {
                        this.score = Math.max(0, this.score - 10);
                        this.onSlice(f, true);
                    }
                } else {
                    this.onSlice(f);
                    if (f.type.isPowerup) this.applyPowerup(f.type.power);
                    slicedCount++;
                }
            }
        });
        if (slicedCount > 1) {
            this.feedbacks.push(new FeedbackText(this.mouse.x, this.mouse.y, `COMBO x${slicedCount}!`, '#ffa502', 80));
            this.score += slicedCount * 10 * (this.doubleScore ? 2 : 1);
            
            // Show side combo display
            this.comboCountEl.innerText = `x${slicedCount}`;
            this.comboEl.classList.remove('hidden');
            if (this.comboTimeout) clearTimeout(this.comboTimeout);
            this.comboTimeout = setTimeout(() => this.comboEl.classList.add('hidden'), 1500);
        }
    }

    applyPowerup(power) {
        const ui = document.getElementById('ui-layer');
        const pUI = document.getElementById('active-powerup');
        const pText = document.getElementById('powerup-text');
        
        const feedback = {
            'FREEZE': { class: 'freeze-active', duration: 4000, label: 'FREEZE' },
            'FRENZY': { class: 'frenzy-active', duration: 6000, label: 'FRENZY' },
            'DOUBLE': { class: 'double-active', duration: 6000, label: 'DOUBLE SCORE' }
        };
        
        const config = feedback[power];
        ui.classList.add(config.class);
        pUI.classList.remove('hidden');
        pText.innerText = config.label;
        
        if (power === 'FREEZE') {
            this.timeScale = 0.35;
            if (this.freezeTimeout) clearTimeout(this.freezeTimeout);
            this.freezeTimeout = setTimeout(() => {
                this.timeScale = 1.0;
                ui.classList.remove('freeze-active');
                pUI.classList.add('hidden');
            }, config.duration);
        } else if (power === 'FRENZY') {
            this.frenzyTimer = config.duration;
            if (this.frenzyTimeout) clearTimeout(this.frenzyTimeout);
            this.frenzyTimeout = setTimeout(() => {
                ui.classList.remove('frenzy-active');
                pUI.classList.add('hidden');
            }, config.duration);
        } else if (power === 'DOUBLE') {
            this.doubleScore = true;
            if (this.doubleTimeout) clearTimeout(this.doubleTimeout);
            this.doubleTimeout = setTimeout(() => {
                this.doubleScore = false;
                ui.classList.remove('double-active');
                pUI.classList.add('hidden');
            }, config.duration);
        }
    }

    onSlice(f, isBombExplosion = false) {
        if (!isBombExplosion) {
            if (f.type.isPomegranate) {
                this.score += 2;
                this.shake = 10;
                f.scale = Math.min(1.5, f.scale + 0.05);
                setTimeout(() => { if(f) f.scale = Math.max(1.0, f.scale - 0.03); }, 50);
                this.feedbacks.push(new FeedbackText(f.x, f.y, `+2`, '#fff', 40));
                return;
            }
            const mult = this.doubleScore ? 2 : 1;
            this.score += f.type.score * mult;
            const pointsText = `+${f.type.score * mult}${this.doubleScore ? ' x2' : ''}`;
            const color = this.doubleScore ? '#a55eea' : (f.type.isSpecial || f.type.isPowerup ? '#fff' : '#ffa502');
            this.feedbacks.push(new FeedbackText(f.x, f.y, pointsText, color, 60));
        } else {
            this.feedbacks.push(new FeedbackText(f.x, f.y, `-10`, '#ff4757', 60));
        }

        this.scoreEl.innerText = this.score.toString().padStart(3, '0');
        this.addStain(f.x, f.y, f.type.juice || '#333');
        for(let i=0; i<18; i++) this.particles.push(new Particle(f.x, f.y, f.type.juice || '#333'));
        this.screenshake(f.type.isSpecial ? 20 : 8);
    }

    addStain(x, y, color) {
        this.bgCtx.save(); this.bgCtx.globalAlpha = 0.3; this.bgCtx.fillStyle = color;
        for (let i = 0; i < 5; i++) {
            this.bgCtx.beginPath();
            const r = Math.random() * 50 + 25;
            this.bgCtx.arc(x + (Math.random()-0.5)*60, y + (Math.random()-0.5)*60, r, 0, Math.PI*2);
            this.bgCtx.fill();
        }
        this.bgCtx.restore();
    }

    triggerBombExplosion() {
        this.isRunning = false;
        const flash = document.getElementById('bomb-flash');
        flash.classList.remove('hidden', 'dimmed');
        
        // Quick flash to white
        setTimeout(() => flash.classList.add('active'), 10);
        
        this.screenshake(60);
        this.timeScale = 0.03; // Even slower motion for more dramatic effect
        
        // Fade to dimmed state after the peak of the flash
        setTimeout(() => {
            flash.classList.remove('active');
            flash.classList.add('dimmed');
        }, 150);
        
        setTimeout(() => {
            flash.classList.remove('dimmed');
            setTimeout(() => flash.classList.add('hidden'), 800);
            this.gameOver();
        }, 2000); // 2 seconds of slow-mo total
    }

    gameOver() {
        if (this.currentMode === 'ARCADE' || this.currentMode === 'ZEN') {
            if (!this.pomegranateActive && !this.pomegranateDone) {
                this.triggerPomegranateRound();
                return;
            }
        }
        
        this.isRunning = false;
        const bestKey = `ninja_best_${this.currentMode}`;
        const currentBest = parseInt(localStorage.getItem(bestKey)) || 0;
        if (this.score > currentBest) localStorage.setItem(bestKey, this.score);
        
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('final-mode').innerText = this.currentMode;
        document.getElementById('game-over-screen').classList.remove('hidden');
        this.setupMenuFruits();
        this.screenshake(40);
        this.timeScale = 1.0;
        document.getElementById('ui-layer').classList.remove('freeze-active');
        document.getElementById('active-powerup').classList.add('hidden');
    }

    triggerPomegranateRound() {
        this.pomegranateActive = true;
        this.timer = null; // Süreyi dondurarak sürekli gameOver çağrısını kes
        const pom = new Fruit(this.canvas, 'POMEGRANATE');
        pom.x = this.canvas.width / 2;
        pom.y = this.canvas.height + pom.radius;
        pom.vx = 0; pom.vy = -18; // Fly in from bottom
        this.entities.push(pom);
        
        const feedback = document.getElementById('active-powerup');
        const text = document.getElementById('powerup-text');
        feedback.classList.remove('hidden');
        text.innerText = "MASH IT!!!";
        
        setTimeout(() => {
            const pom = this.entities.find(e => e.type.isPomegranate);
            if (pom) {
                // Dramatic juice splat effect
                this.addStain(pom.x, pom.y, '#c0392b');
                this.addStain(pom.x + 60, pom.y - 40, '#c0392b');
                this.addStain(pom.x - 60, pom.y + 40, '#c0392b');
                
                // High density pomegranate particles
                for(let i=0; i<150; i++) {
                    const p = new Particle(pom.x, pom.y, '#c0392b');
                    p.radius = Math.random() * 4 + 2;
                    this.particles.push(p);
                }
                
                // Smoke and debris
                for(let i=0; i<40; i++) this.particles.push(new Particle(pom.x, pom.y, '#ffffff', 'smoke'));
                
                // Screen Flash
                const flash = document.getElementById('bomb-flash');
                flash.classList.remove('hidden', 'dimmed');
                flash.classList.add('active');
                
                this.screenshake(120);
                this.entities = this.entities.filter(e => e !== pom);
                
                // Delayed cleanup
                setTimeout(() => {
                    flash.classList.remove('active');
                    setTimeout(() => {
                        flash.classList.add('hidden');
                        this.pomegranateActive = false;
                        this.pomegranateDone = true;
                        this.gameOver();
                    }, 600);
                }, 150);
            } else {
                this.pomegranateActive = false;
                this.gameOver();
            }
        }, 5000);
    }

    spawnWave() {
        if (this.frenzyTimer > 0) {
            for(let i=0; i<3; i++) { // More intense spawning
                const types = Object.keys(FRUIT_TYPES).filter(k => !FRUIT_TYPES[k].isBomb && !FRUIT_TYPES[k].isPowerup && !FRUIT_TYPES[k].isPomegranate);
                const side = Math.random() > 0.5 ? 'left' : 'right';
                setTimeout(() => {
                    if (!this.isRunning || this.pomegranateActive) return;
                    this.entities.push(new Fruit(this.canvas, types[Math.floor(Math.random()*types.length)], false, side));
                }, Math.random() * 200);
            }
            return;
        }

        const count = Math.floor(Math.random() * 3) + 2; 
        let powerupSpawnedInWave = false;
        
        for(let i=0; i<count; i++) {
            setTimeout(() => {
                if (!this.isRunning || this.pomegranateActive) return;
                let types = Object.keys(FRUIT_TYPES).filter(k => !FRUIT_TYPES[k].isPomegranate);
                if (this.currentMode === 'ZEN') types = types.filter(k => !FRUIT_TYPES[k].isBomb);
                if (this.currentMode === 'SURVIVAL') types = types.filter(k => !FRUIT_TYPES[k].isBomb && k !== 'FRENZY');
                
                const timeSinceLast = Date.now() - this.lastPowerupTime;
                // Cooldown increased to 5.5s to prevent overcrowding
                const canSpawnPowerup = (timeSinceLast > 5500) || (powerupSpawnedInWave && Math.random() * 0.2 && timeSinceLast > 2000);
                
                if (canSpawnPowerup) {
                    const powerupChance = (this.currentMode === 'CLASSIC' || this.currentMode === 'ZEN' || this.currentMode === 'SURVIVAL') ? 0.05 : 0.15;
                    if (Math.random() < powerupChance) {
                        let pTypes = types.filter(k => FRUIT_TYPES[k].isPowerup);
                        
                        // CLASSIC ve SURVIVAL modunda FRENZY muzunu filtrele
                        if (this.currentMode === 'CLASSIC' || this.currentMode === 'SURVIVAL') {
                            pTypes = pTypes.filter(k => k !== 'FRENZY');
                        }
                        
                        if (pTypes.length > 0) {
                            const type = pTypes[Math.floor(Math.random() * pTypes.length)];
                            this.entities.push(new Fruit(this.canvas, type));
                            powerupSpawnedInWave = true;
                            this.lastPowerupTime = Date.now();
                            return;
                        }
                    }
                }
                
                // Normal fruit spawning
                const normalTypes = types.filter(k => !FRUIT_TYPES[k].isPowerup);
                const type = normalTypes[Math.floor(Math.random() * normalTypes.length)];
                this.entities.push(new Fruit(this.canvas, type));
            }, i * 200);
        }
    }

    screenshake(mag) {
        let start = null;
        const step = (now) => {
            if (!start) start = now;
            const progress = now - start;
            if (progress < 250) {
                const off = (Math.random()-0.5) * mag * (1 - progress/250);
                this.canvas.style.transform = `translateY(${off}px)`;
                requestAnimationFrame(step);
            } else { this.canvas.style.transform = 'none'; }
        };
        requestAnimationFrame(step);
    }

    loop(t) {
        const dt = t - this.lastTimeUpdate;
        this.lastTimeUpdate = t;

        // Rezeset transform and clear the whole canvas to prevent residue/ghosting
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
        
        // Draw background stains
        this.ctx.drawImage(this.bgCanvas, 0, 0);

        // Wrap rendering in save/restore to handle screenshake and effects without leakage
        this.ctx.save();

        if (this.isRunning) {
            if (this.shake > 0) {
                this.ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
                this.shake *= 0.9;
                if (this.shake < 0.5) this.shake = 0;
            }

            const modeCfg = CONFIG.MODES[this.currentMode];
            if (modeCfg.timer !== null && this.timeScale >= 1.0 && !this.pomegranateActive) {
                this.timer -= dt / 1000;
                this.timerValueEl.innerText = Math.ceil(Math.max(0, this.timer));
                if (this.timer <= 0) this.gameOver();
            }

            if (this.frenzyTimer > 0) this.frenzyTimer -= dt;

            this.difficulty += 0.00004;
            const spawnRate = this.frenzyTimer > 0 ? 300 : (CONFIG.SPAWN_INTERVAL / Math.sqrt(this.difficulty));
            if (t - this.lastSpawn > spawnRate && !this.pomegranateActive) {
                this.spawnWave(); this.lastSpawn = t;
            }
        }

        this.entities = this.entities.filter(f => {
            const alive = f.update(this.timeScale);
            const modeCfg = CONFIG.MODES[this.currentMode];
            if (!alive && !f.isSliced && !f.type.isBomb && this.isRunning && modeCfg.lives !== null) {
                this.lives--;
                const h = document.querySelector(`.strike[data-index="${CONFIG.MIN_LIVES - 1 - this.lives}"]`);
                if (h) h.classList.add('active');
                if (this.lives <= 0) this.gameOver();
            }
            f.draw(this.ctx);
            if (f.type.isBomb && !f.isSliced && Math.random() > 0.45) {
                this.particles.push(new Particle(f.x + 28, f.y - CONFIG.FRUIT_RADIUS - 15, '#f1c40f', 'smoke'));
            }
            return alive;
        });

        this.particles = this.particles.filter(p => { p.update(this.timeScale); p.draw(this.ctx); return p.life > 0; });
        this.feedbacks = this.feedbacks.filter(f => { f.update(); f.draw(this.ctx); return f.life > 0; });

        if (this.trail.length > 1) {
            this.ctx.save(); this.ctx.beginPath(); this.ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for(let i=1; i<this.trail.length; i++) {
                const alpha = 1 - i/this.trail.length;
                this.ctx.lineWidth = 18 * alpha; this.ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
                this.ctx.lineTo(this.trail[i].x, this.trail[i].y); this.ctx.stroke();
            }
            this.ctx.restore();
        }

        this.ctx.restore(); // Restore context from screenshake
        requestAnimationFrame((now) => this.loop(now));
    }
}

window.onload = () => new Game();
