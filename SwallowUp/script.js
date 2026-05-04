/**
 * Swallow Up - Fish Growing Game
 * Redesigned with canvas-drawn colorful fish, smooth movement, and stable physics
 */

// --- Game Configuration & State ---
const CONFIG = {
    baseSpeed: 3.5,
    friction: 0.92,
    acceleration: 0.55,
    xpMultiplier: 1.2,
    maxLevel: 10,
    npcSpawnRate: 50,
    maxNpcs: 30,
    targetFPS: 60,
    fixedDt: 1 / 60 // Fixed timestep for physics
};

const STATE = {
    isPlaying: false,
    isGameOver: false,
    score: 0,
    highScore: localStorage.getItem('oceanGrowth_highScore') || 0,
    eatenFishes: 0,
    frame: 0,
    keys: { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false },
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false }
};

// --- Rich Color Palettes for Fish ---
const FISH_PALETTES = [
    // Tropical warm
    { body: '#FF6B6B', fin: '#EE5A24', eye: '#2C3E50', stripe: '#FECA57', belly: '#FFD3B6' },
    // Ocean blue
    { body: '#4FC3F7', fin: '#0288D1', eye: '#1A237E', stripe: '#B3E5FC', belly: '#E1F5FE' },
    // Coral pink
    { body: '#F48FB1', fin: '#E91E63', eye: '#311B92', stripe: '#FCE4EC', belly: '#FFEEF5' },
    // Lime green
    { body: '#81C784', fin: '#388E3C', eye: '#1B5E20', stripe: '#C8E6C9', belly: '#E8F5E9' },
    // Sunset orange
    { body: '#FFB74D', fin: '#F57C00', eye: '#3E2723', stripe: '#FFE0B2', belly: '#FFF3E0' },
    // Royal purple
    { body: '#BA68C8', fin: '#7B1FA2', eye: '#1A237E', stripe: '#E1BEE7', belly: '#F3E5F5' },
    // Electric cyan
    { body: '#4DD0E1', fin: '#0097A7', eye: '#004D40', stripe: '#B2EBF2', belly: '#E0F7FA' },
    // Golden yellow
    { body: '#FFD54F', fin: '#FFA000', eye: '#3E2723', stripe: '#FFF9C4', belly: '#FFFDE7' },
    // Ruby red
    { body: '#EF5350', fin: '#C62828', eye: '#1A237E', stripe: '#FFCDD2', belly: '#FFEBEE' },
    // Emerald
    { body: '#66BB6A', fin: '#2E7D32', eye: '#004D40', stripe: '#A5D6A7', belly: '#C8E6C9' },
    // Deep indigo
    { body: '#7986CB', fin: '#303F9F', eye: '#0D47A1', stripe: '#C5CAE9', belly: '#E8EAF6' },
    // Hot pink
    { body: '#EC407A', fin: '#AD1457', eye: '#311B92', stripe: '#F8BBD0', belly: '#FCE4EC' },
    // Teal
    { body: '#26A69A', fin: '#00695C', eye: '#1A237E', stripe: '#80CBC4', belly: '#B2DFDB' },
    // Peach
    { body: '#FFAB91', fin: '#E64A19', eye: '#3E2723', stripe: '#FFCCBC', belly: '#FBE9E7' },
];

// Fish body shapes for variety
const FISH_SHAPES = ['round', 'slim', 'flat', 'puffer', 'angel', 'sword'];

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// HUD
const els = {
    score: document.getElementById('scoreDisplay'),
    level: document.getElementById('levelDisplay'),
    size: document.getElementById('sizeDisplay'),
    highScore: document.getElementById('highScoreDisplay'),
    xpFill: document.getElementById('xp-bar-fill'),
    xpText: document.getElementById('xp-bar-text'),
    
    // Screens
    start: document.getElementById('startScreen'),
    gameOver: document.getElementById('gameOverScreen'),
    levelUp: document.getElementById('levelUpNotification'),
    
    // Stats
    startHS: document.getElementById('startHighScore'),
    finalScore: document.getElementById('finalScore'),
    finalLevel: document.getElementById('finalLevel'),
    finalHighScore: document.getElementById('finalHighScore'),
    finalEaten: document.getElementById('finalEaten'),
    levelUpText: document.getElementById('levelUpText'),
    
    // Buttons
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn')
};

// --- Entities Array ---
let entities = {
    player: null,
    npcs: [],
    particles: [],
    powerups: [],
    bubbles: []
};

// --- Draw Fish on Canvas ---

function drawCanvasFish(ctx, radius, palette, shape, isPlayer = false) {
    const r = radius;
    
    ctx.save();
    
    switch (shape) {
        case 'round':
            drawRoundFish(ctx, r, palette, isPlayer);
            break;
        case 'slim':
            drawSlimFish(ctx, r, palette, isPlayer);
            break;
        case 'flat':
            drawFlatFish(ctx, r, palette, isPlayer);
            break;
        case 'puffer':
            drawPufferFish(ctx, r, palette, isPlayer);
            break;
        case 'angel':
            drawAngelFish(ctx, r, palette, isPlayer);
            break;
        case 'sword':
            drawSwordFish(ctx, r, palette, isPlayer);
            break;
        default:
            drawRoundFish(ctx, r, palette, isPlayer);
    }
    
    ctx.restore();
}

function drawRoundFish(ctx, r, p, isPlayer) {
    // Tail
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, 0);
    ctx.lineTo(-r * 1.5, -r * 0.6);
    ctx.quadraticCurveTo(-r * 1.1, 0, -r * 1.5, r * 0.6);
    ctx.closePath();
    ctx.fillStyle = p.fin;
    ctx.fill();
    
    // Body (ellipse)
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.body;
    ctx.fill();
    
    // Belly
    ctx.beginPath();
    ctx.ellipse(r * 0.05, r * 0.2, r * 0.7, r * 0.35, 0, 0, Math.PI);
    ctx.fillStyle = p.belly;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Stripe
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.7);
    ctx.quadraticCurveTo(r * 0.2, 0, r * 0.1, r * 0.7);
    ctx.lineWidth = r * 0.12;
    ctx.strokeStyle = p.stripe;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.2, r * 0.4, -r * 0.6);
    ctx.fillStyle = p.fin;
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Eye
    drawFishEye(ctx, r * 0.45, -r * 0.15, r * 0.22, p.eye);
    
    // Mouth
    ctx.beginPath();
    ctx.arc(r * 0.85, r * 0.05, r * 0.12, -0.3, 0.3);
    ctx.strokeStyle = p.eye;
    ctx.lineWidth = r * 0.06;
    ctx.stroke();
    
    // Player glow
    if (isPlayer) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.15, r * 0.85, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawSlimFish(ctx, r, p, isPlayer) {
    // Tail
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(-r * 1.6, -r * 0.5);
    ctx.quadraticCurveTo(-r * 1.2, 0, -r * 1.6, r * 0.5);
    ctx.closePath();
    ctx.fillStyle = p.fin;
    ctx.fill();
    
    // Body (elongated)
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.2, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.body;
    ctx.fill();
    
    // Belly
    ctx.beginPath();
    ctx.ellipse(r * 0.1, r * 0.12, r * 0.85, r * 0.2, 0, 0, Math.PI);
    ctx.fillStyle = p.belly;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // 2 stripes
    for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        const sx = -r * 0.2 + i * r * 0.5;
        ctx.moveTo(sx, -r * 0.45);
        ctx.lineTo(sx, r * 0.45);
        ctx.lineWidth = r * 0.08;
        ctx.strokeStyle = p.stripe;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    
    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.4);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.9, r * 0.6, -r * 0.35);
    ctx.fillStyle = p.fin;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Eye
    drawFishEye(ctx, r * 0.65, -r * 0.08, r * 0.18, p.eye);
    
    if (isPlayer) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.35, r * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawFlatFish(ctx, r, p, isPlayer) {
    // Tail
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.lineTo(-r * 1.4, -r * 0.7);
    ctx.quadraticCurveTo(-r * 1.0, 0, -r * 1.4, r * 0.7);
    ctx.closePath();
    ctx.fillStyle = p.fin;
    ctx.fill();
    
    // Body (wide flat)
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.9, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.body;
    ctx.fill();
    
    // Pattern - dots (deterministic positions to avoid flickering)
    ctx.globalAlpha = 0.35;
    const dotPositions = [
        [-0.3, -0.2], [0.15, -0.35], [0.35, 0.1], [-0.1, 0.3], [0.2, -0.05]
    ];
    for (let i = 0; i < dotPositions.length; i++) {
        ctx.beginPath();
        ctx.arc(dotPositions[i][0] * r, dotPositions[i][1] * r, r * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = p.stripe;
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Top & Bottom fin
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.8);
    ctx.quadraticCurveTo(0, -r * 1.4, r * 0.3, -r * 0.8);
    ctx.fillStyle = p.fin;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.8);
    ctx.quadraticCurveTo(0, r * 1.4, r * 0.3, r * 0.8);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Eye
    drawFishEye(ctx, r * 0.35, -r * 0.2, r * 0.2, p.eye);
    
    if (isPlayer) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.05, r * 1.0, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawPufferFish(ctx, r, p, isPlayer) {
    // Tail (small)
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 0);
    ctx.lineTo(-r * 1.2, -r * 0.35);
    ctx.quadraticCurveTo(-r * 0.9, 0, -r * 1.2, r * 0.35);
    ctx.closePath();
    ctx.fillStyle = p.fin;
    ctx.fill();
    
    // Body (very round)
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = p.body;
    ctx.fill();
    
    // Belly (large white area)
    ctx.beginPath();
    ctx.arc(r * 0.05, r * 0.15, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = p.belly;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Spikes
    ctx.strokeStyle = p.fin;
    ctx.lineWidth = r * 0.06;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        const sx = Math.cos(a) * r * 0.85;
        const sy = Math.sin(a) * r * 0.85;
        const ex = Math.cos(a) * r * 1.1;
        const ey = Math.sin(a) * r * 1.1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
    }
    
    // Eye (bigger, cute)
    drawFishEye(ctx, r * 0.3, -r * 0.2, r * 0.26, p.eye);
    
    // Mouth (small o)
    ctx.beginPath();
    ctx.arc(r * 0.7, r * 0.05, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = p.eye;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
    
    if (isPlayer) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawAngelFish(ctx, r, p, isPlayer) {
    // Tail
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, 0);
    ctx.lineTo(-r * 1.3, -r * 0.4);
    ctx.quadraticCurveTo(-r * 0.9, 0, -r * 1.3, r * 0.4);
    ctx.closePath();
    ctx.fillStyle = p.fin;
    ctx.fill();
    
    // Body (diamond-ish)
    ctx.beginPath();
    ctx.moveTo(r * 0.8, 0);
    ctx.quadraticCurveTo(r * 0.3, -r * 1.0, -r * 0.5, -r * 0.3);
    ctx.quadraticCurveTo(-r * 0.7, 0, -r * 0.5, r * 0.3);
    ctx.quadraticCurveTo(r * 0.3, r * 1.0, r * 0.8, 0);
    ctx.fillStyle = p.body;
    ctx.fill();
    
    // Vertical stripes
    ctx.globalAlpha = 0.4;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        const sx = i * r * 0.25;
        ctx.moveTo(sx, -r * 0.7);
        ctx.lineTo(sx, r * 0.7);
        ctx.lineWidth = r * 0.1;
        ctx.strokeStyle = p.stripe;
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    
    // Long dorsal & ventral fins
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.8);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.5, r * 0.5, -r * 0.5);
    ctx.fillStyle = p.fin;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.8);
    ctx.quadraticCurveTo(r * 0.1, r * 1.5, r * 0.5, r * 0.5);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Eye
    drawFishEye(ctx, r * 0.35, -r * 0.1, r * 0.18, p.eye);
    
    if (isPlayer) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.95, r * 1.15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawSwordFish(ctx, r, p, isPlayer) {
    // Tail
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.lineTo(-r * 1.5, -r * 0.6);
    ctx.lineTo(-r * 1.1, -r * 0.1);
    ctx.lineTo(-r * 1.5, r * 0.6);
    ctx.closePath();
    ctx.fillStyle = p.fin;
    ctx.fill();
    
    // Body (torpedo)
    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0);
    ctx.quadraticCurveTo(r * 0.4, -r * 0.5, -r * 0.3, -r * 0.45);
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.2, -r * 0.9, 0);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.2, -r * 0.3, r * 0.45);
    ctx.quadraticCurveTo(r * 0.4, r * 0.5, r * 0.7, 0);
    ctx.fillStyle = p.body;
    ctx.fill();
    
    // Sword/nose
    ctx.beginPath();
    ctx.moveTo(r * 0.7, 0);
    ctx.lineTo(r * 1.5, -r * 0.03);
    ctx.lineTo(r * 1.5, r * 0.03);
    ctx.closePath();
    ctx.fillStyle = p.fin;
    ctx.fill();
    
    // Belly
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.6, r * 0.2, 0, 0, Math.PI);
    ctx.fillStyle = p.belly;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Dorsal
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.4);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.0, r * 0.4, -r * 0.35);
    ctx.fillStyle = p.fin;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Eye
    drawFishEye(ctx, r * 0.4, -r * 0.1, r * 0.17, p.eye);
    
    if (isPlayer) {
        ctx.beginPath();
        ctx.ellipse(r * 0.2, 0, r * 1.4, r * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawFishEye(ctx, x, y, r, color) {
    // White
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    // Iris
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Pupil
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Highlight
    ctx.beginPath();
    ctx.arc(x + r * 0.1, y - r * 0.25, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
}

// --- Classes ---

class Entity {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = radius;
        this.rotation = 0;
        this.targetRotation = 0;
        this.markedForDeletion = false;
    }

    draw(ctx) {
        // Abstract
    }

    update(dt) {
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
    }
}

class Player extends Entity {
    constructor() {
        super(canvas.width / 2, canvas.height / 2, 18);
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.maxSpeed = CONFIG.baseSpeed;
        this.baseRadius = 18;
        this.palette = FISH_PALETTES[1]; // Ocean blue for player
        this.shape = 'round';
        
        // Visual
        this.swimCycle = 0;
        this.isShielded = false;
        this.magnetRadius = 0;
        this.visualAngle = 0; // Smooth visual rotation
        this.facingRight = true;
    }

    reset() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.vx = 0;
        this.vy = 0;
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.radius = this.baseRadius;
        this.maxSpeed = CONFIG.baseSpeed;
        this.palette = FISH_PALETTES[1];
        this.shape = 'round';
        this.rotation = 0;
        this.visualAngle = 0;
        this.facingRight = true;
    }

    update(dt) {
        // Input Handling
        let dx = 0;
        let dy = 0;

        if (STATE.keys.w || STATE.keys.ArrowUp) dy -= 1;
        if (STATE.keys.s || STATE.keys.ArrowDown) dy += 1;
        if (STATE.keys.a || STATE.keys.ArrowLeft) dx -= 1;
        if (STATE.keys.d || STATE.keys.ArrowRight) dx += 1;

        if (dx !== 0 || dy !== 0) {
            let length = Math.hypot(dx, dy);
            dx /= length;
            dy /= length;
            
            this.vx += dx * CONFIG.acceleration;
            this.vy += dy * CONFIG.acceleration;
            STATE.mouse.active = false;
        } else if (STATE.mouse.active) {
            let mx = STATE.mouse.x - this.x;
            let my = STATE.mouse.y - this.y;
            let dist = Math.hypot(mx, my);
            
            if (dist > this.radius) {
                this.vx += (mx / dist) * CONFIG.acceleration;
                this.vy += (my / dist) * CONFIG.acceleration;
            } else {
                this.vx *= 0.8;
                this.vy *= 0.8;
            }
        }

        // Apply Friction
        this.vx *= CONFIG.friction;
        this.vy *= CONFIG.friction;

        // Cap Speed
        let speed = Math.hypot(this.vx, this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }

        // Update Position with fixed dt
        super.update(dt);

        // Screen Boundaries
        const pad = this.radius;
        if (this.x < pad) { this.x = pad; this.vx *= -0.5; }
        if (this.x > canvas.width - pad) { this.x = canvas.width - pad; this.vx *= -0.5; }
        if (this.y < pad) { this.y = pad; this.vy *= -0.5; }
        if (this.y > canvas.height - pad) { this.y = canvas.height - pad; this.vy *= -0.5; }

        // Smooth rotation toward movement direction
        speed = Math.hypot(this.vx, this.vy);
        if (speed > 0.3) {
            this.targetRotation = Math.atan2(this.vy, this.vx);
            
            // Track facing direction smoothly
            if (Math.abs(this.vx) > 0.2) {
                this.facingRight = this.vx > 0;
            }
        }
        
        // Smooth angle interpolation with proper wrapping
        let diff = this.targetRotation - this.visualAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.visualAngle += diff * 0.08;

        // Swim Animation Cycle
        this.swimCycle += 0.08;
        
        // Magnet effect
        if (this.magnetRadius > 0) {
            entities.npcs.forEach(npc => {
                if (npc.radius < this.radius) {
                    let dist = Math.hypot(this.x - npc.x, this.y - npc.y);
                    if (dist < this.magnetRadius) {
                        npc.vx += (this.x - npc.x) * 0.005;
                        npc.vy += (this.y - npc.y) * 0.005;
                    }
                }
            });
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Use a tilt based on movement (subtle, not the full rotation)
        let tiltAngle = 0;
        let speed = Math.hypot(this.vx, this.vy);
        if (speed > 0.3) {
            // Tilt up/down based on vertical velocity, capped
            tiltAngle = Math.atan2(this.vy, Math.abs(this.vx));
            tiltAngle = Math.max(-0.4, Math.min(0.4, tiltAngle));
        }
        
        // Flip based on direction
        if (!this.facingRight) {
            ctx.scale(-1, 1);
            tiltAngle = -tiltAngle;
        }
        
        // Apply tilt
        ctx.rotate(tiltAngle);
        
        // Swim wiggle
        const wiggle = Math.sin(this.swimCycle) * 0.08;
        ctx.rotate(wiggle);

        // Draw Shield
        if (this.isShielded) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 200, 255, 0.15)';
            ctx.fill();
        }

        // Draw Fish
        drawCanvasFish(ctx, this.radius, this.palette, this.shape, true);

        ctx.restore();
    }

    addXp(amount) {
        this.xp += amount;
        
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
        
        updateXPUI();
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * CONFIG.xpMultiplier);
        
        // Grow physically
        this.baseRadius += 5;
        this.radius = this.baseRadius;
        
        // Update shape and palette based on level
        if (this.level >= 10) {
            this.shape = 'sword';
            this.palette = FISH_PALETTES[8]; // Ruby
        } else if (this.level >= 7) {
            this.shape = 'sword';
            this.palette = FISH_PALETTES[6]; // Cyan
        } else if (this.level >= 5) {
            this.shape = 'slim';
            this.palette = FISH_PALETTES[10]; // Indigo
        } else if (this.level >= 3) {
            this.shape = 'angel';
            this.palette = FISH_PALETTES[2]; // Coral pink
        }
        
        // Speed slightly increases
        this.maxSpeed += 0.3;

        // UI Updates
        els.level.textContent = this.level;
        els.size.textContent = (this.radius / 18).toFixed(1) + 'x';
        
        showLevelUpNotification(this.level);
        createParticles(this.x, this.y, 30, '#ffd700');
    }
}

class NPC extends Entity {
    constructor() {
        // Spawn edge determination
        const spawnSide = Math.random() < 0.5 ? -1 : 1;
        
        const playerR = entities.player.radius;
        let typeRand = Math.random();
        
        let sizeCategory;
        let pRadius;
        
        if (typeRand < 0.6) {
            pRadius = Math.max(6, playerR * (0.3 + Math.random() * 0.6));
            sizeCategory = 'small';
        } else if (typeRand < 0.85) {
            pRadius = playerR * (1.1 + Math.random() * 0.5);
            sizeCategory = 'medium';
        } else {
            pRadius = playerR * (1.8 + Math.random() * 1.2);
            sizeCategory = 'large';
        }

        let x = spawnSide === -1 ? -pRadius * 2 : canvas.width + pRadius * 2;
        let y = Math.random() * (canvas.height - 100) + 50;

        super(x, y, pRadius);
        this.sizeCategory = sizeCategory;
        
        // Random palette and shape
        this.palette = FISH_PALETTES[Math.floor(Math.random() * FISH_PALETTES.length)];
        this.shape = FISH_SHAPES[Math.floor(Math.random() * FISH_SHAPES.length)];

        // Stable constant speed - based on size category, fixed after creation
        let baseSpd;
        if (sizeCategory === 'small') {
            baseSpd = 1.2 + Math.random() * 0.8; // 1.2 - 2.0
        } else if (sizeCategory === 'medium') {
            baseSpd = 0.8 + Math.random() * 0.6; // 0.8 - 1.4
        } else {
            baseSpd = 0.5 + Math.random() * 0.5; // 0.5 - 1.0
        }
        
        this.constantSpeed = baseSpd;
        this.directionX = spawnSide === -1 ? 1 : -1; // Initial swimming direction
        this.facingRight = this.directionX > 0;
        
        // Smooth vertical movement (sinusoidal)
        this.baseY = y;
        this.yPhase = Math.random() * Math.PI * 2;
        this.yAmplitude = 15 + Math.random() * 40; // How much it bobs vertically
        this.yFrequency = 0.005 + Math.random() * 0.01; // How fast it bobs
        
        // Occasional direction change
        this.dirChangeTimer = 300 + Math.random() * 500; // frames until possible turn
        this.turnProgress = 0; // 0 = no turn, goes from 0 to 1 during turn
        this.isTurning = false;
        this.newDirectionX = this.directionX;
        
        this.swimCycle = Math.random() * Math.PI * 2;
        this.lifeTime = 0;
        
        // Visual rotation (tilt based on vertical movement)
        this.visualTilt = 0;
    }

    update(dt) {
        this.lifeTime++;
        
        // --- Smooth direction change system ---
        this.dirChangeTimer--;
        if (this.dirChangeTimer <= 0 && !this.isTurning) {
            // Small chance to turn around (only if not near edges)
            const margin = canvas.width * 0.15;
            if (this.x > margin && this.x < canvas.width - margin && Math.random() < 0.3) {
                this.isTurning = true;
                this.turnProgress = 0;
                this.newDirectionX = -this.directionX;
            }
            this.dirChangeTimer = 300 + Math.random() * 500;
        }
        
        // Handle turning animation
        if (this.isTurning) {
            this.turnProgress += 0.02; // Slow gradual turn
            if (this.turnProgress >= 1) {
                this.turnProgress = 1;
                this.isTurning = false;
                this.directionX = this.newDirectionX;
                this.facingRight = this.directionX > 0;
            }
            // During turn, speed smoothly goes through zero
            const turnCurve = Math.cos(this.turnProgress * Math.PI); // 1 to -1
            this.vx = this.directionX * this.constantSpeed * turnCurve;
            
            // If past halfway, switch facing
            if (this.turnProgress > 0.5) {
                this.facingRight = this.newDirectionX > 0;
            }
        } else {
            this.vx = this.directionX * this.constantSpeed;
        }
        
        // Smooth sinusoidal Y bobbing
        this.yPhase += this.yFrequency * 60 * dt;
        const targetY = this.baseY + Math.sin(this.yPhase) * this.yAmplitude;
        this.vy = (targetY - this.y) * 0.05; // Smooth approach
        
        // Visual tilt from vertical movement
        const targetTilt = Math.atan2(this.vy * 3, Math.abs(this.vx) + 0.5);
        this.visualTilt += (Math.max(-0.3, Math.min(0.3, targetTilt)) - this.visualTilt) * 0.1;

        // Update position with fixed dt
        super.update(dt);

        // Check bounds to delete (only when swimming outward)
        if (!this.isTurning) {
            if (this.directionX < 0 && this.x < -this.radius * 3) this.markedForDeletion = true;
            if (this.directionX > 0 && this.x > canvas.width + this.radius * 3) this.markedForDeletion = true;
        }
        
        // Safety cleanup for fish that have been alive way too long
        if (this.lifeTime > 3000) this.markedForDeletion = true;
        
        this.swimCycle += 0.06;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flip based on facing direction
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }
        
        // Apply smooth visual tilt
        ctx.rotate(this.facingRight ? this.visualTilt : -this.visualTilt);
        
        // Swim wiggle
        const wiggle = Math.sin(this.swimCycle) * 0.06;
        ctx.rotate(wiggle);

        drawCanvasFish(ctx, this.radius, this.palette, this.shape, false);

        ctx.restore();
    }
}

class Particle extends Entity {
    constructor(x, y, color) {
        super(x, y, Math.random() * 3 + 1);
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.02;
    }

    update(dt) {
        super.update(dt);
        this.vx *= 0.9;
        this.vy *= 0.9;
        this.life -= this.decay;
        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

class EnvironmentBubble {
    constructor() {
        this.reset();
        this.y = Math.random() * canvas.height;
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 50;
        this.radius = Math.random() * 10 + 2;
        this.speed = Math.random() * 1.0 + 0.3;
        this.wiggleFactor = Math.random() * 0.04;
        this.wiggleAcc = Math.random() * Math.PI * 2;
        this.opacity = 0.2 + Math.random() * 0.3;
    }

    update(dt) {
        this.y -= this.speed * dt * 60;
        this.wiggleAcc += this.wiggleFactor;
        this.x += Math.sin(this.wiggleAcc) * 0.8;

        if (this.y < -50) {
            this.reset();
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.8})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity * 0.3})`;
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        
        // Bubble reflection highlight
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity + 0.3})`;
        ctx.fill();
    }
}

// Decorative seaweed / coral
class SeaPlant {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.baseY = canvas.height;
        this.segments = 4 + Math.floor(Math.random() * 5);
        this.segmentHeight = 15 + Math.random() * 25;
        this.width = 6 + Math.random() * 10;
        this.phase = Math.random() * Math.PI * 2;
        this.swaySpeed = 0.01 + Math.random() * 0.015;
        this.color = this.randomGreen();
    }
    
    randomGreen() {
        const greens = [
            '#2ECC71', '#27AE60', '#1ABC9C', '#16A085',
            '#8BC34A', '#4CAF50', '#009688', '#00BCD4'
        ];
        return greens[Math.floor(Math.random() * greens.length)];
    }
    
    update(dt) {
        this.phase += this.swaySpeed * 60 * dt;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.baseY);
        
        let px = 0;
        let py = 0;
        
        for (let i = 0; i < this.segments; i++) {
            const sway = Math.sin(this.phase + i * 0.5) * (5 + i * 2);
            const nx = sway;
            const ny = -(i + 1) * this.segmentHeight;
            
            ctx.beginPath();
            ctx.moveTo(px - this.width / 2, py);
            ctx.quadraticCurveTo(
                (px + nx) / 2 + sway * 0.5, (py + ny) / 2,
                nx, ny
            );
            ctx.lineTo(nx + this.width / 2, ny);
            ctx.quadraticCurveTo(
                (px + nx) / 2 + sway * 0.5 + this.width / 2, (py + ny) / 2,
                px + this.width / 2, py
            );
            ctx.closePath();
            
            const alpha = 0.4 + (i / this.segments) * 0.3;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
            
            px = nx;
            py = ny;
        }
        
        ctx.restore();
    }
}

// --- Managers & Core Game Logic ---

let depthGradient = null;
let loopAnimationId = null;
let lastTimestamp = 0;
let accumulator = 0;
let seaPlants = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Light ocean gradient
    depthGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    depthGradient.addColorStop(0, '#B8E4F0');
    depthGradient.addColorStop(0.3, '#87CEEB');
    depthGradient.addColorStop(0.6, '#5BB8E8');
    depthGradient.addColorStop(0.85, '#3A9FD8');
    depthGradient.addColorStop(1, '#2980B9');
}

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // UI Init
    els.startHS.textContent = STATE.highScore;
    els.highScore.textContent = STATE.highScore;

    // Event Listeners
    setupInputs();
    
    // Buttons
    els.startBtn.addEventListener('click', startGame);
    els.restartBtn.addEventListener('click', startGame);

    // Initial background draw
    drawBackground();
}

function setupInputs() {
    window.addEventListener('keydown', e => {
        if (STATE.keys.hasOwnProperty(e.key)) STATE.keys[e.key] = true;
    });

    window.addEventListener('keyup', e => {
        if (STATE.keys.hasOwnProperty(e.key)) STATE.keys[e.key] = false;
    });

    window.addEventListener('mousemove', e => {
        STATE.mouse.x = e.clientX;
        STATE.mouse.y = e.clientY;
        STATE.mouse.active = true;
    });
    
    // Improved touch controls for mobile
    const handleTouch = (e) => {
        if (e.target === canvas) {
            e.preventDefault(); // Prevent scrolling when touching the canvas
        }
        if (e.touches.length > 0) {
            STATE.mouse.x = e.touches[0].clientX;
            STATE.mouse.y = e.touches[0].clientY;
            STATE.mouse.active = true;
        }
    };

    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('touchmove', handleTouch, { passive: false });
    
    window.addEventListener('touchend', (e) => {
        if (e.target === canvas) {
            e.preventDefault();
        }
        if (e.touches.length === 0) {
            STATE.mouse.active = false;
        }
    }, { passive: false });
}

function startGame() {
    // Reset State
    STATE.isPlaying = true;
    STATE.isGameOver = false;
    STATE.score = 0;
    STATE.eatenFishes = 0;
    STATE.frame = 0;
    lastTimestamp = 0;
    accumulator = 0;
    
    // Clean Entities
    entities.player = new Player();
    entities.npcs = [];
    entities.particles = [];
    entities.powerups = [];
    
    // Init Bubbles
    entities.bubbles = [];
    for (let i = 0; i < 35; i++) entities.bubbles.push(new EnvironmentBubble());
    
    // Init Sea Plants
    seaPlants = [];
    const plantCount = Math.floor(canvas.width / 80);
    for (let i = 0; i < plantCount; i++) {
        seaPlants.push(new SeaPlant());
    }

    // Update UI
    els.start.classList.add('hidden');
    els.gameOver.classList.add('hidden');
    updateScoreUI();
    updateXPUI();
    els.level.textContent = entities.player.level;
    els.size.textContent = '1.0x';

    // Start Loop
    if (loopAnimationId) cancelAnimationFrame(loopAnimationId);
    loopAnimationId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    STATE.isPlaying = false;
    STATE.isGameOver = true;
    
    // Check High Score
    if (STATE.score > STATE.highScore) {
        STATE.highScore = STATE.score;
        localStorage.setItem('oceanGrowth_highScore', STATE.highScore);
        els.highScore.textContent = STATE.highScore;
    }
    
    // Create death particles
    createParticles(entities.player.x, entities.player.y, 50, '#e74c3c');

    // Show End Screen after particles
    setTimeout(() => {
        els.finalScore.textContent = STATE.score;
        els.finalLevel.textContent = entities.player.level;
        els.finalHighScore.textContent = STATE.highScore;
        els.finalEaten.textContent = STATE.eatenFishes;
        
        els.gameOver.classList.remove('hidden');
    }, 1000);
}

// --- Spawning ---

function manageSpawns() {
    if (STATE.frame % Math.max(20, CONFIG.npcSpawnRate - entities.player.level * 2) === 0) {
        if (entities.npcs.length < CONFIG.maxNpcs) {
            entities.npcs.push(new NPC());
        }
    }
}

// --- Collision Detection ---

function checkCollisions() {
    const p = entities.player;
    
    for (let i = entities.npcs.length - 1; i >= 0; i--) {
        let npc = entities.npcs[i];
        
        let dx = p.x - npc.x;
        let dy = p.y - npc.y;
        let dist = Math.hypot(dx, dy);
        
        if (dist < p.radius + npc.radius - 5) {
            if (p.radius > npc.radius) {
                eatFish(npc);
            } else {
                if (p.isShielded) {
                    p.isShielded = false;
                    npc.markedForDeletion = true;
                    createParticles(p.x, p.y, 20, '#00e5ff');
                } else {
                    gameOver();
                    break;
                }
            }
        }
    }
}

function eatFish(npc) {
    npc.markedForDeletion = true;
    
    const scoreVal = Math.floor(npc.radius);
    const xpVal = Math.floor(npc.radius * 1.5);
    
    STATE.score += scoreVal;
    STATE.eatenFishes++;
    
    entities.player.addXp(xpVal);
    updateScoreUI();
    
    // Colorful particles based on eaten fish
    createParticles(npc.x, npc.y, 12, npc.palette.body);
    
    // Tiny grow per fish
    entities.player.radius += 0.2;
    entities.player.baseRadius += 0.2;
    els.size.textContent = (entities.player.radius / 18).toFixed(1) + 'x';
}

// --- VFX & Utils ---

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        entities.particles.push(new Particle(x, y, color));
    }
}

function showLevelUpNotification(level) {
    els.levelUpText.textContent = `Seviye ${level}`;
    els.levelUp.classList.remove('hidden');
    
    setTimeout(() => {
        els.levelUp.classList.add('hidden');
    }, 2500);
}

function updateScoreUI() {
    els.score.textContent = STATE.score;
}

function updateXPUI() {
    let p = entities.player;
    let percentage = (p.xp / p.xpToNextLevel) * 100;
    els.xpFill.style.width = `${Math.min(percentage, 100)}%`;
    els.xpText.textContent = `${p.xp} / ${p.xpToNextLevel} XP`;
}

// --- Rendering ---

function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (depthGradient) {
        ctx.fillStyle = depthGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Sun rays - light volumetric beams from top
    ctx.save();
    ctx.translate(canvas.width * 0.4, 0);
    for (let i = -4; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 50, 0);
        ctx.lineTo(i * 200 - 100, canvas.height);
        ctx.lineTo(i * 200 + 100, canvas.height);
        ctx.lineTo(i * 50 + 60, 0);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.04 - Math.abs(i) * 0.003})`;
        ctx.fill();
    }
    ctx.restore();
    
    // Caustic light patterns on top area
    ctx.save();
    const time = Date.now() * 0.001;
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 8; i++) {
        const cx = (Math.sin(time * 0.3 + i) * 0.5 + 0.5) * canvas.width;
        const cy = (Math.sin(time * 0.2 + i * 1.5) * 0.3 + 0.15) * canvas.height;
        const cr = 80 + Math.sin(time + i) * 30;
        
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
    }
    ctx.restore();
    
    // Sandy bottom
    ctx.save();
    const sandGrad = ctx.createLinearGradient(0, canvas.height - 60, 0, canvas.height);
    sandGrad.addColorStop(0, 'rgba(194, 178, 128, 0)');
    sandGrad.addColorStop(0.4, 'rgba(194, 178, 128, 0.15)');
    sandGrad.addColorStop(1, 'rgba(194, 178, 128, 0.3)');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    
    // Sandy bumps
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 30) {
        ctx.lineTo(x, canvas.height - 5 - Math.sin(x * 0.05 + time * 0.5) * 3);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(194, 178, 128, 0.2)';
    ctx.fill();
    ctx.restore();
}

// --- Main Game Loop with Fixed Timestep ---

function gameLoop(timestamp) {
    if (STATE.isGameOver && entities.particles.length === 0) {
        return;
    }
    
    loopAnimationId = requestAnimationFrame(gameLoop);
    
    if (!lastTimestamp) lastTimestamp = timestamp;
    
    let frameTime = (timestamp - lastTimestamp) / 1000; // in seconds
    lastTimestamp = timestamp;
    
    // Clamp frame time to prevent spiral of death on tab switches
    if (frameTime > 0.1) frameTime = CONFIG.fixedDt;
    
    accumulator += frameTime;
    
    // Fixed timestep physics updates
    while (accumulator >= CONFIG.fixedDt) {
        if (!STATE.isPlaying && !STATE.isGameOver) break;
        
        const dt = CONFIG.fixedDt;
        STATE.frame++;
        
        // 1. Update Game State
        if (STATE.isPlaying) {
            entities.player.update(dt);
            manageSpawns();
            checkCollisions();
        }

        // Update Collections
        entities.npcs.forEach(npc => npc.update(dt));
        entities.particles.forEach(p => p.update(dt));
        entities.bubbles.forEach(b => b.update(dt));
        seaPlants.forEach(sp => sp.update(dt));

        // Clean dead entities
        for (let i = entities.npcs.length - 1; i >= 0; i--) {
            if (entities.npcs[i].markedForDeletion) entities.npcs.splice(i, 1);
        }
        for (let i = entities.particles.length - 1; i >= 0; i--) {
            if (entities.particles[i].markedForDeletion) entities.particles.splice(i, 1);
        }
        
        accumulator -= CONFIG.fixedDt;
    }
    
    // 2. Render (once per frame)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    // Draw sea plants behind everything
    seaPlants.forEach(sp => sp.draw(ctx));

    entities.bubbles.forEach(b => b.draw(ctx));
    
    // Draw NPCs
    entities.npcs.forEach(npc => npc.draw(ctx));
    
    if (STATE.isPlaying) {
        entities.player.draw(ctx);
    }
    
    entities.particles.forEach(p => p.draw(ctx));
}

// Bootstrap
window.onload = init;
