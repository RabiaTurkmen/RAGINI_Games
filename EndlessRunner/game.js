// Game Constants
// Game Internal Dimensions (Logical)
const INTERNAL_WIDTH = 800;
const INTERNAL_HEIGHT = 320;
let canvasScale = 1;
let offsetX = 0;
let offsetY = 0;

const GRAVITY = 0.55;
const JUMP_FORCE = -10.5;
const GROUND_HEIGHT = 45;
const GAME_SPEED_INITIAL = 7.5; // Constant speed for testing
const SPAWN_RATE_INITIAL = 1600;

// Mobile Detection and Speed Adjustment
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 850;
const SPEED_MULTIPLIER = isMobileDevice ? 0.7 : 1.0;

// Level Config
const LEVEL_THRESHOLDS = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const THEMES = [
    { name: 'Valley', skyTop: '#E1F5FE', skyBottom: '#B3E5FC', ground: '#8D6E63', grass: '#81C784', mountain: '#6D4C41' },
    { name: 'Sunrise', skyTop: '#FFF9C4', skyBottom: '#FFE082', ground: '#A1887F', grass: '#C0CA33', mountain: '#795548' },
    { name: 'Blossom', skyTop: '#F8BBD0', skyBottom: '#FCE4EC', ground: '#AD1457', grass: '#F48FB1', mountain: '#880E4F' }, // Refined Pink Tones
    { name: 'Meadow', skyTop: '#E8F5E9', skyBottom: '#C8E6C9', ground: '#6D4C41', grass: '#43A047', mountain: '#388E3C' },
    { name: 'Twilight', skyTop: '#EDE7F6', skyBottom: '#D1C4E9', ground: '#5D4037', grass: '#9575CD', mountain: '#4527A0' },
    { name: 'Mist', skyTop: '#F5F5F5', skyBottom: '#E0E0E0', ground: '#424242', grass: '#9E9E9E', mountain: '#616161' },
    { name: 'Dune', skyTop: '#FFF3E0', skyBottom: '#FFE0B2', ground: '#795548', grass: '#FFB74D', mountain: '#5D4037' },
    { name: 'Glacier', skyTop: '#E0F7FA', skyBottom: '#B2EBF2', ground: '#546E7A', grass: '#4DD0E1', mountain: '#37474F' },
    { name: 'Forest', skyTop: '#DCEDC8', skyBottom: '#C5E1A5', ground: '#4E342E', grass: '#689F38', mountain: '#33691E' },
    { name: 'Nightfall', skyTop: '#263238', skyBottom: '#212121', ground: '#263238', grass: '#455A64', mountain: '#1a1a1a' }
];
function lerpColor(a, b, amount) {
    const ah = parseInt(a.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = (ah >> 8) & 0xff, ab = ah & 0xff,
        bh = parseInt(b.replace(/#/g, ''), 16),
        br = bh >> 16, bg = (bh >> 8) & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);

    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}

// Utility
function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Game State
let canvas, ctx;
let logicalWidth = 800;

let gameRunning = false;
let isPaused = false;
let isMuted = false;
let score = 0;
let coinsCollected = 0;
let currentLevel = 1;
let magnetActive = false;
let magnetTimeLeft = 0;
let shieldActive = false;
let multiplierActive = false;
let multiplierTimeLeft = 0;
let levelUpTimer = 0;
let isLevelTransitioning = false;
let themeTransitionProgress = 1;
let currentTheme = { ...THEMES[0] };
let nextTheme = { ...THEMES[0] };
let gameSpeed = GAME_SPEED_INITIAL;
let lastTime = 0;
let spawnTimer = 0;
let spawnInterval = SPAWN_RATE_INITIAL;
let animationId;
let audioCtx;

// For branching paths (Level 9+)
let onRiskPath = false;
let riskPathTimer = 0;
let levelFeatureSpawned = false;

// Parçacık Sistemi
class Particle {
    constructor(x, y, type = 'dust') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1.0;
        this.maxLife = type === 'dust' ? 30 : 20;

        if (type === 'dust') {
            // Toz bulutu - yukarı ve yanlara dağılır
            this.vx = (Math.random() - 0.5) * 3;
            this.vy = -Math.random() * 2 - 1;
            this.size = Math.random() * 4 + 2;
            this.color = `rgba(139, 119, 101, ${this.life})`;
        } else if (type === 'wind') {
            // Rüzgar çizgileri - geriye doğru uzanır
            this.vx = -Math.random() * 4 - 2;
            this.vy = (Math.random() - 0.5) * 2;
            this.length = Math.random() * 15 + 10;
            this.width = Math.random() * 2 + 1;
            this.color = `rgba(135, 206, 235, ${this.life * 0.6})`;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 1 / this.maxLife;

        if (this.type === 'dust') {
            this.vy += 0.1; // Hafif yerçekimi
            this.color = `rgba(139, 119, 101, ${this.life * 0.8})`;
        } else if (this.type === 'wind') {
            this.color = `rgba(135, 206, 235, ${this.life * 0.5})`;
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.type === 'dust') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'wind') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.length, this.y);
            ctx.stroke();
        }
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

let particles = [];

// Audio System
function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playScoreSound() {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playGameOverSound() {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

function playCountdownBeep() {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playCountdownGo() {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

// Game Objects
const player = {
    x: 50,
    y: INTERNAL_HEIGHT - GROUND_HEIGHT - 70,
    width: 40,
    height: 70,
    originalHeight: 70,
    crouchHeight: 35,
    dy: 0,
    isJumping: false,
    runCycle: 0,
    isCrouching: false,

    draw: function () {
        // Shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, INTERNAL_HEIGHT - GROUND_HEIGHT + 4, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const swing = Math.sin(this.runCycle);
        const legBackAngle = this.isCrouching ? swing * 0.4 : swing * 0.8;
        const legFrontAngle = this.isCrouching ? -swing * 0.4 : -swing * 0.8;
        const armBackAngle = this.isCrouching ? 0.5 : -swing * 0.8;
        const armFrontAngle = this.isCrouching ? 0.5 : swing * 0.8;

        const centerX = this.x + this.width / 2;
        const bodyCenterY = this.y + (this.isCrouching ? 20 : 35);

        ctx.save();
        ctx.translate(centerX, this.y);

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#2c3e50';

        function drawLimb(angle, length, width, color, originX, originY, hasShoe = false) {
            ctx.save();
            ctx.translate(originX, originY);
            ctx.rotate(angle);

            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = width + 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, length);
            ctx.stroke();

            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, length);
            ctx.stroke();

            if (hasShoe) {
                ctx.save();
                ctx.translate(0, length);
                ctx.rotate(-angle * 0.5);

                ctx.fillStyle = '#2C3E50';
                drawRoundedRect(ctx, -8, -4, 18, 10, 5);
                ctx.fill();

                ctx.fillStyle = '#FFFFFF';
                drawRoundedRect(ctx, -6, -2, 14, 6, 3);
                ctx.fill();

                ctx.fillStyle = '#E0E0E0';
                ctx.fillRect(-6, 2, 14, 2);
                ctx.restore();
            }

            ctx.restore();
        }

        const armY = this.isCrouching ? 10 : 20;
        const legY = this.isCrouching ? 25 : 45;

        drawLimb(armBackAngle, 22, 8, '#ffcc80', 0, armY, false);

        if (this.isCrouching) {
            drawLimb(1.2, 15, 9, '#34495e', 0, legY, true);
        } else {
            drawLimb(legBackAngle, 30, 9, '#34495e', 0, legY, true);
        }

        ctx.fillStyle = '#bd3829ff';
        ctx.beginPath();
        if (this.isCrouching) {
            ctx.roundRect(-12, 5, 30, 20, 5);
        } else {
            ctx.roundRect(-12, 18, 24, 32, 5);
        }
        ctx.fill();
        ctx.stroke();

        const headY = this.isCrouching ? 5 : 10;

        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.arc(this.isCrouching ? 5 : 0, headY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.arc(this.isCrouching ? 5 : 0, headY - 2, 12, Math.PI, Math.PI * 2.2);
        ctx.lineTo(this.isCrouching ? 13 : 8, headY - 6);
        ctx.quadraticCurveTo(this.isCrouching ? 5 : 0, headY - 10, this.isCrouching ? -3 : -8, headY - 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(this.isCrouching ? -6 : -11, headY - 6, 22, 4);
        ctx.strokeRect(this.isCrouching ? -6 : -11, headY - 6, 22, 4);

        ctx.beginPath();
        ctx.moveTo(this.isCrouching ? -6 : -11, headY - 4);
        ctx.lineTo(-25 - (swing * 5), headY - 8);
        ctx.lineTo(-25 - (swing * 5), headY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (this.isCrouching) {
            drawLimb(-1.2, 15, 9, '#34495e', 0, legY, true);
        } else {
            drawLimb(legFrontAngle, 30, 9, '#34495e', 0, legY, true);
        }

        drawLimb(armFrontAngle, 22, 8, '#ffcc80', 0, armY, false);

        if (shieldActive) {
            ctx.save();
            const relativeBodyCenterY = this.isCrouching ? 20 : 35;
            ctx.translate(0, relativeBodyCenterY);

            const time = Date.now() / 1000;

            ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 50 + Math.sin(time * 6) * 4, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(79, 195, 247, 0.15)';
            for (let i = 0; i < 6; i++) {
                ctx.save();
                ctx.rotate(time * 2.5 + (i * Math.PI / 3));
                ctx.translate(45, 0);

                ctx.beginPath();
                for (let j = 0; j < 6; j++) {
                    const ang = (j / 6) * Math.PI * 2;
                    ctx.lineTo(Math.cos(ang) * 7, Math.sin(ang) * 7);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            const shieldGlow = ctx.createRadialGradient(0, 0, 35, 0, 0, 65);
            shieldGlow.addColorStop(0, 'rgba(79, 195, 247, 0)');
            shieldGlow.addColorStop(1, 'rgba(79, 195, 247, 0.1)');
            ctx.fillStyle = shieldGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 65, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        ctx.restore();
    },

    update: function () {
        this.dy += GRAVITY;
        this.y += this.dy;

        this.runCycle += this.isJumping ? 0.1 : (this.isCrouching ? 0.35 : 0.25);

        if (this.y + this.height > INTERNAL_HEIGHT - GROUND_HEIGHT) {
            this.y = INTERNAL_HEIGHT - GROUND_HEIGHT - this.height;
            this.dy = 0;
            this.isJumping = false;
        }
    },

    jump: function () {
        if (!this.isJumping && !this.isCrouching) {
            this.dy = JUMP_FORCE;
            this.isJumping = true;

            for (let i = 0; i < 8; i++) {
                particles.push(new Particle(
                    this.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                    INTERNAL_HEIGHT - GROUND_HEIGHT,
                    'dust'
                ));
            }
        }
    },

    crouch: function () {
        if (!this.isJumping && !this.isCrouching) {
            this.isCrouching = true;
            this.height = this.crouchHeight;
            this.y += (this.originalHeight - this.crouchHeight);
        }
    },

    standUp: function () {
        if (this.isCrouching) {
            this.isCrouching = false;
            this.y -= (this.originalHeight - this.crouchHeight);
            this.height = this.originalHeight;
        }
    },

    generateWindEffect: function () {
        if (this.isCrouching && Math.random() < 0.3) {
            particles.push(new Particle(
                this.x + this.width,
                this.y + this.height / 2 + (Math.random() - 0.5) * 10,
                'wind'
            ));
        }
    }
};

class Obstacle {
    constructor() {
        const possibleTypes = ['saguaro', 'round'];
        if (currentLevel >= 6) possibleTypes.push('pit');
        if (currentLevel >= 7) possibleTypes.push('fire');

        if (Math.random() < 0.4) {
            this.type = 'bird';
        } else {
            this.type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
        }

        if (this.type === 'bird') {
            this.width = 46;
            this.height = 34;

            if (Math.random() < 0.5) {
                this.y = INTERNAL_HEIGHT - GROUND_HEIGHT - 34;
            } else {
                this.y = INTERNAL_HEIGHT - GROUND_HEIGHT - 75;
            }
        } else if (this.type === 'pit') {
            this.width = 120;
            this.height = GROUND_HEIGHT + 10;
            this.x = (canvas.width - offsetX) / canvasScale;
            this.y = INTERNAL_HEIGHT - GROUND_HEIGHT;
        } else if (this.type === 'fire') {
            this.width = 40;
            this.height = 60;
            this.y = INTERNAL_HEIGHT - GROUND_HEIGHT - this.height;
        } else {
            this.width = 30 + Math.random() * 20;
            this.height = 40 + Math.random() * 20;
            this.y = INTERNAL_HEIGHT - GROUND_HEIGHT - this.height;
            this.armConfig = Math.random();
        }

        this.x = (canvas.width - offsetX) / canvasScale;
        this.markedForDeletion = false;
        this.scored = false;
    }

    update() {
        const baseSpeed = this.type === 'bird' ? gameSpeed * 1.2 : gameSpeed;
        const speed = baseSpeed * SPEED_MULTIPLIER;
        this.x -= speed;

        if (this.x + this.width < -offsetX / canvasScale) {
            this.markedForDeletion = true;
        }

        if (!this.scored && this.x + this.width < player.x) {
            playScoreSound();
            this.scored = true;
        }
    }

    draw() {
        if (this.type === 'bird') {
            this.drawBird();
        } else if (this.type === 'pit') {
            this.drawPit();
        } else if (this.type === 'fire') {
            this.drawFire();
        } else {
            this.drawCactus();
        }
    }

    drawPit() {
        ctx.save();
        // Spiky Road Aesthetic (Dikenli Yol)
        ctx.translate(this.x, this.y);
        
        // Base plate
        ctx.fillStyle = '#444';
        ctx.fillRect(0, 0, this.width, 5);
        
        // Spikes
        const spikeCount = 6;
        const spikeWidth = this.width / spikeCount;
        for(let i=0; i<spikeCount; i++) {
            const sx = i * spikeWidth + spikeWidth/2;
            const sy = 0;
            const sH = 25;
            
            // Draw a sharp triangle
            ctx.fillStyle = '#90A4AE';
            ctx.beginPath();
            ctx.moveTo(sx - spikeWidth/2, sy);
            ctx.lineTo(sx, sy - sH);
            ctx.lineTo(sx + spikeWidth/2, sy);
            ctx.fill();
            
            // Highlight on spike
            ctx.fillStyle = '#CFD8DC';
            ctx.beginPath();
            ctx.moveTo(sx - 2, sy);
            ctx.lineTo(sx, sy - sH);
            ctx.lineTo(sx + 2, sy);
            ctx.fill();
        }
        ctx.restore();
    }

    drawFire() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height);
        
        const time = Date.now() / 400;
        
        // Teepee Logs (Crossing sticks)
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        
        // Draw 4 logs in teepee shape
        for(let i=0; i<4; i++) {
            ctx.save();
            ctx.rotate(-0.8 + i * 0.5);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -25);
            ctx.stroke();
            ctx.restore();
        }

        // Fire Glow
        const glow = ctx.createRadialGradient(0, -15, 0, 0, -15, 45);
        glow.addColorStop(0, 'rgba(255, 111, 0, 0.4)');
        glow.addColorStop(1, 'rgba(255, 111, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, -15, 45, 0, Math.PI * 2); ctx.fill();

        // High-end Fire Core (Realistic-ish stylized)
        const drawFireLayer = (scale, color, offset) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-15 * scale, 0);
            for(let i=0; i<3; i++) {
                const phase = time + i + offset;
                const wx = Math.sin(phase) * 6 * scale;
                const wy = -35 * scale - i * 10 * scale;
                ctx.quadraticCurveTo(wx, wy + 15, 0, wy);
            }
            ctx.lineTo(15 * scale, 0);
            ctx.fill();
        };

        ctx.globalCompositeOperation = 'screen';
        drawFireLayer(1.2, '#FF5722', 0); // Orange
        drawFireLayer(0.9, '#FFC107', 1); // Yellow
        drawFireLayer(0.6, '#FFFFFF', 2); // White core
        
        ctx.restore();
    }

    drawBird() {
        ctx.save();
        ctx.translate(this.x, this.y);
        const vH = this.height;
        const wingY = Math.sin(Date.now() / 150) * 8;
        const SOFT_RED = '#ff6b81';
        const SOFT_RED_LIGHT = '#ffafbd';
        const SOFT_STOKE = '#4a4a4a';

        ctx.strokeStyle = SOFT_STOKE;
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(this.width * 0.45, vH * 0.7);
        ctx.lineTo(this.width * 0.45, vH * 0.9);
        ctx.moveTo(this.width * 0.6, vH * 0.7);
        ctx.lineTo(this.width * 0.6, vH * 0.9);
        ctx.stroke();

        ctx.fillStyle = SOFT_RED;
        ctx.beginPath();
        ctx.moveTo(this.width * 0.8, vH * 0.55);
        ctx.quadraticCurveTo(this.width * 0.95, vH * 0.4, this.width * 1.05, vH * 0.45);
        ctx.quadraticCurveTo(this.width * 0.95, vH * 0.6, this.width * 1.05, vH * 0.7);
        ctx.quadraticCurveTo(this.width * 0.9, vH * 0.65, this.width * 0.8, vH * 0.6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = SOFT_RED;
        ctx.beginPath();
        ctx.ellipse(this.width * 0.55, vH * 0.55, this.width * 0.4, vH * 0.35, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.width * 0.3, vH * 0.4, vH * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.width * 0.22, vH * 0.35, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#2d3436';
        ctx.beginPath();
        ctx.arc(this.width * 0.21, vH * 0.35, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.width * 0.2, vH * 0.33, 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffda79';
        ctx.beginPath();
        ctx.moveTo(this.width * 0.1, vH * 0.4);
        ctx.quadraticCurveTo(-2, vH * 0.5, this.width * 0.1, vH * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = SOFT_RED_LIGHT;
        ctx.save();
        ctx.translate(this.width * 0.5, vH * 0.55);
        ctx.rotate(wingY * 0.05);
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width * 0.22, vH * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.restore();
    }

    drawCactus() {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, INTERNAL_HEIGHT - GROUND_HEIGHT + 2, this.width / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(this.x, this.y);

        const colors = {
            saguaro: { fill: '#4CAF50', shadow: '#2E7D32', stroke: '#1B5E20' },
            pear: { fill: '#66BB6A', shadow: '#388E3C', stroke: '#1B5E20' },
            barrel: { fill: '#81C784', shadow: '#43A047', stroke: '#1B5E20' }
        };

        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (this.type === 'saguaro') {
            const cols = colors.saguaro;
            ctx.strokeStyle = cols.stroke;
            const grad = ctx.createLinearGradient(0, 0, this.width, 0);
            grad.addColorStop(0, cols.shadow);
            grad.addColorStop(0.2, cols.fill);
            grad.addColorStop(0.5, cols.fill);
            grad.addColorStop(0.9, cols.shadow);
            grad.addColorStop(1, cols.stroke);
            ctx.fillStyle = grad;

            const drawColumn = (x, y, w, h) => {
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, w / 2);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.moveTo(x + w * 0.3, y + w / 2);
                ctx.lineTo(x + w * 0.3, y + h - w / 2);
                ctx.moveTo(x + w * 0.5, y + 5);
                ctx.lineTo(x + w * 0.5, y + h - 5);
                ctx.moveTo(x + w * 0.7, y + w / 2);
                ctx.lineTo(x + w * 0.7, y + h - w / 2);
                ctx.stroke();
                ctx.strokeStyle = '#FDD835';
                ctx.lineWidth = 1;
                for (let sy = y + 10; sy < y + h - 10; sy += 15) {
                    ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x - 3, sy - 2); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x + w, sy); ctx.lineTo(x + w + 3, sy - 2); ctx.stroke();
                }
                ctx.lineWidth = 2;
                ctx.strokeStyle = cols.stroke;
            };
            drawColumn(this.width * 0.25, 0, this.width * 0.5, this.height);
            if (this.armConfig > 0.3) {
                const armW = this.width * 0.35;
                const armH = this.height * 0.4;
                const armY = this.height * 0.4;
                ctx.beginPath();
                ctx.moveTo(this.width * 0.5, armY + 15);
                ctx.quadraticCurveTo(this.width * 0.9, armY + 15, this.width * 0.9, armY);
                ctx.lineTo(this.width * 0.9, armY - 10);
                ctx.stroke();
                drawColumn(this.width * 0.75, armY - armH + 10, armW, armH);
            }
            if (this.armConfig > 0.6) {
                const armW = this.width * 0.35;
                const armH = this.height * 0.3;
                const armY = this.height * 0.5;
                ctx.beginPath();
                ctx.moveTo(this.width * 0.5, armY + 15);
                ctx.quadraticCurveTo(this.width * 0.1, armY + 15, this.width * 0.1, armY);
                ctx.stroke();
                drawColumn(this.width * 0.05 - 5, armY - armH + 10, armW, armH);
            }
        } else {
            const cols = colors.barrel;
            ctx.strokeStyle = cols.stroke;
            const drawStem = (startX, startY, endX, endY, width) => {
                const grad = ctx.createLinearGradient(startX, startY, endX, endY);
                grad.addColorStop(0, cols.shadow);
                grad.addColorStop(0.5, cols.fill);
                grad.addColorStop(1, cols.shadow);
                ctx.fillStyle = grad;
                ctx.save();
                ctx.translate(startX, startY);
                const angle = Math.atan2(endY - startY, endX - startX);
                ctx.rotate(angle);
                const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
                ctx.beginPath();
                ctx.roundRect(0, -width / 2, length, width, width / 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#FDD835';
                ctx.lineWidth = 1;
                for (let i = 10; i < length - 5; i += 15) {
                    ctx.beginPath();
                    ctx.moveTo(i, -width / 2);
                    ctx.lineTo(i - 3, -width / 2 - 5);
                    ctx.stroke();
                }
                ctx.restore();
                ctx.strokeStyle = cols.stroke;
                ctx.lineWidth = 2;
            };
            const baseX = this.width / 2;
            const baseY = this.height;
            drawStem(baseX, baseY, baseX, this.height * 0.1, this.width * 0.2);
            drawStem(baseX, this.height * 0.5, baseX - this.width * 0.4, this.height * 0.2, this.width * 0.15);
            drawStem(baseX, this.height * 0.6, baseX + this.width * 0.4, this.height * 0.25, this.width * 0.15);
        }
        ctx.restore();
    }
}

class Coin {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = (canvas.width - offsetX) / canvasScale;
        const heights = [
            INTERNAL_HEIGHT - GROUND_HEIGHT - 30,
            INTERNAL_HEIGHT - GROUND_HEIGHT - 65,
            INTERNAL_HEIGHT - GROUND_HEIGHT - 120
        ];
        this.y = heights[Math.floor(Math.random() * heights.length)];
        this.markedForDeletion = false;
        this.collected = false;
        this.angle = 0;
        this.isDiamond = currentLevel >= 8 && Math.random() < 0.15;
    }

    update() {
        if (magnetActive) {
            const dx = player.x + player.width / 2 - this.x;
            const dy = player.y + player.height / 2 - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = 250;
            if (dist < radius) {
                this.x += (dx / dist) * 12;
                this.y += (dy / dist) * 12;
            } else {
                this.x -= gameSpeed * SPEED_MULTIPLIER;
            }
        } else {
            this.x -= gameSpeed * SPEED_MULTIPLIER;
        }
        this.angle += 0.1;
        if (this.x + this.width < -offsetX / canvasScale) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        if (this.isDiamond) {
            // Elmas (Diamond) çizimi
            const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
            glow.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
            glow.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();

            // Biraz yukarı aşağı süzülme animasyonu
            ctx.translate(0, Math.sin(this.angle * 2) * 3);
            
            // Ana elmas şekli
            ctx.fillStyle = '#E0F7FA';
            ctx.beginPath();
            ctx.moveTo(0, -15); // Üst tepe
            ctx.lineTo(12, -5); // Sağ
            ctx.lineTo(0, 15);  // Alt sivri
            ctx.lineTo(-12, -5); // Sol
            ctx.closePath();
            ctx.fill();

            // Elmas facetleri (Boyut derinliği)
            ctx.fillStyle = '#00BCD4'; // Koyu mavi
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, 15);
            ctx.lineTo(12, -5);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#B2EBF2'; // Açık mavi (taç kısmı)
            ctx.beginPath();
            ctx.moveTo(-8, -15);
            ctx.lineTo(8, -15);
            ctx.lineTo(12, -5);
            ctx.lineTo(-12, -5);
            ctx.closePath();
            ctx.fill();
        } else {
            // Altın çizimi
            ctx.rotate(Math.sin(this.angle) * 0.2);
            const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 20);
            glow.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
            glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
            const grad = ctx.createLinearGradient(-15, -15, 15, 15);
            grad.addColorStop(0, '#FFD700');
            grad.addColorStop(0.5, '#FFF176');
            grad.addColorStop(1, '#B8860B');
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#DAA520';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const spinWidth = Math.cos(this.angle) * 15;
            ctx.ellipse(0, 0, Math.abs(spinWidth), 15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            if (Math.abs(spinWidth) > 5) {
                ctx.fillStyle = '#B8860B';
                ctx.font = 'bold 12px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('₺', 0, 0);
            }
        }
        ctx.restore();
    }
}

class PowerUp {
    constructor(type) {
        this.type = type;
        this.width = 40;
        this.height = 40;
        this.x = (canvas.width - offsetX) / canvasScale;
        this.y = INTERNAL_HEIGHT - GROUND_HEIGHT - 120;
        this.markedForDeletion = false;
        this.angle = 0;
    }

    update() {
        this.x -= gameSpeed * SPEED_MULTIPLIER;
        this.angle += 0.05;
        if (this.x + this.width < -offsetX / canvasScale) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(1 + Math.sin(this.angle) * 0.1, 1 + Math.sin(this.angle) * 0.1);
        if (this.type === 'magnet') {
            this.drawMagnet();
        } else if (this.type === 'shield') {
            this.drawShield();
        } else if (this.type === 'multiplier') {
            this.drawMultiplier();
        }
        ctx.restore();
    }

    drawMagnet() {
        const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
        glow.addColorStop(0, 'rgba(255, 64, 129, 0.4)');
        glow.addColorStop(1, 'rgba(255, 64, 129, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#f44336';
        ctx.beginPath(); ctx.arc(0, -5, 12, Math.PI, 0, false); ctx.stroke();
        ctx.strokeStyle = '#cfd8dc';
        ctx.beginPath(); ctx.moveTo(-12, -5); ctx.lineTo(-12, 5); ctx.moveTo(12, -5); ctx.lineTo(12, 5); ctx.stroke();
    }

    drawShield() {
        // High-end aesthetic shield icon
        const time = Date.now() / 1000;
        ctx.save();
        // Inner Glow Orb
        const orbGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
        orbGlow.addColorStop(0, '#FFFFFF');
        orbGlow.addColorStop(0.4, '#4FC3F7');
        orbGlow.addColorStop(1, 'rgba(79, 195, 247, 0)');
        ctx.fillStyle = orbGlow;
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();

        // Hexagon Plate
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2 + time;
            const px = Math.cos(ang) * 14;
            const py = Math.sin(ang) * 14;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Rotating Dots
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 3; i++) {
            const ang = (i / 3) * Math.PI * 2 - time * 2;
            ctx.beginPath(); ctx.arc(Math.cos(ang) * 10, Math.sin(ang) * 10, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    drawMultiplier() {
        const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
        glow.addColorStop(0, 'rgba(255, 235, 59, 0.4)');
        glow.addColorStop(1, 'rgba(255, 235, 59, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FBC02D';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('2X', 0, 0);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeText('2X', 0, 0);
    }
}

let powerups = [];

class ParallaxLayer {
    constructor(speedMult, type) {
        this.speedMult = speedMult;
        this.type = type;
        this.elements = [];
        this.init();
    }

    init() {
        this.elements = [];
        const count = this.type === 'bird' ? 3 : this.type === 'plane' ? 1 : this.type === 'balloon' ? 1 : 5;
        for (let i = 0; i < count; i++) {
            if (this.type === 'plane') {
                const plane = this.createPlaneElement();
                this.queuePlane(plane, true);
                this.elements.push(plane);
                continue;
            }
            if (this.type === 'balloon') {
                this.elements.push(this.createBalloonElement(i === 0));
                continue;
            }
            const el = {
                x: Math.random() * INTERNAL_WIDTH * 2,
                y: (this.type === 'cloud' || this.type === 'bird') ? Math.random() * 120 + 30 : 0,
                scale: Math.random() * 0.5 + 0.5,
                features: []
            };

            if (this.type === 'mountain') {
                const featureCount = 5 + Math.floor(Math.random() * 3);
                for (let j = 0; j < featureCount; j++) {
                    const rand = Math.random();
                    const isTree = false;
                    el.features.push({
                        type: isTree ? 'tree' : 'flower',
                        relX: 0.1 + Math.random() * 0.8,
                        relY: isTree ? 0 : (0.07 + Math.random() * 0.14),
                        variant: Math.random()
                    });
                }
            }
            this.elements.push(el);
        }
    }

    createPlaneElement() {
        return {
            x: -220,
            scale: 0.52,
            baseY: 56,
            speed: 3.1,
            bobPhase: 0,
            waitTime: 0,
            active: false,
            features: []
        };
    }

    queuePlane(el, initial = false) {
        el.active = false;
        el.scale = 0.42 + Math.random() * 0.16;
        el.speed = 2.8 + Math.random() * 1.2;
        el.baseY = 28 + Math.random() * 62;
        el.bobPhase = Math.random() * Math.PI * 2;
        el.waitTime = initial ? 2500 + Math.random() * 3500 : 9000 + Math.random() * 9000;
        el.x = -240 * el.scale - Math.random() * 140;
    }

    launchPlane(el) {
        el.active = true;
        el.x = -240 * el.scale;
    }

    createBalloonElement(initial = false) {
        const balloon = {
            x: -260,
            y: 72,
            baseY: 72,
            scale: 0.7,
            bobPhase: 0,
            speed: 1.55,
            waitTime: 0,
            active: false,
            colors: ['#FFB36B', '#FF7A7A', '#FFD56B'],
            features: []
        };
        this.queueBalloon(balloon, initial);
        return balloon;
    }

    queueBalloon(el, initial = false) {
        const palettes = [
            ['#FFB36B', '#FF7A7A', '#FFD56B'],
            ['#7AD7F0', '#7F8CFF', '#FFC1D6'],
            ['#FFC46B', '#8FE3CF', '#FF8AAE'],
            ['#F6C667', '#F78FB3', '#70A1FF']
        ];
        el.scale = 0.62 + Math.random() * 0.18;
        el.baseY = 44 + Math.random() * 54;
        el.y = el.baseY;
        el.bobPhase = Math.random() * Math.PI * 2;
        el.speed = 1.3 + Math.random() * 0.45;
        el.waitTime = initial ? 4500 + Math.random() * 3500 : 8000 + Math.random() * 7000;
        el.active = false;
        el.colors = palettes[Math.floor(Math.random() * palettes.length)];
        el.x = -260 * el.scale - Math.random() * 120;
    }

    launchBalloon(el) {
        el.active = true;
        el.x = -260 * el.scale;
    }

    update(deltaTime = 16.67) {
        if (this.type === 'plane') {
            const dtScale = deltaTime / 16.67;
            const balloonActive = layers.some(layer => layer.type === 'balloon' && layer.elements.some(balloon => balloon.active));
            this.elements.forEach(el => {
                if (!el.active) {
                    el.waitTime -= deltaTime;
                    if (el.waitTime <= 0 && !balloonActive) this.launchPlane(el);
                    return;
                }

                el.x += el.speed * dtScale;
                el.bobPhase += 0.04 * dtScale;

                if (el.x > INTERNAL_WIDTH + 220) {
                    this.queuePlane(el);
                }
            });
            return;
        }

        const speed = gameSpeed * this.speedMult * SPEED_MULTIPLIER;
        this.elements.forEach(el => {
            if (this.type === 'balloon') {
                const dtScale = deltaTime / 16.67;
                const planeActive = layers.some(layer => layer.type === 'plane' && layer.elements.some(plane => plane.active));

                if (!el.active) {
                    el.waitTime -= deltaTime;
                    if (el.waitTime <= 0 && !planeActive) this.launchBalloon(el);
                    return;
                }

                el.x += el.speed * dtScale;
                el.bobPhase += 0.015 * dtScale;
                el.y = el.baseY + Math.sin(el.bobPhase) * 6;
                if (el.x > INTERNAL_WIDTH + 180) {
                    this.queueBalloon(el);
                }
                return;
            }

            el.x -= speed;
            if (el.x < -200) {
                el.x = INTERNAL_WIDTH + 200 + Math.random() * 200;
                if (this.type === 'cloud') el.y = Math.random() * 150 + 20;
            }
        });
    }

    draw(ctx, theme) {
        ctx.save();
        if (this.type === 'cloud') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.elements.forEach(el => {
                ctx.save();
                ctx.translate(el.x, el.y);
                ctx.scale(el.scale, el.scale);
                ctx.beginPath();
                ctx.arc(0, 0, 30, 0, Math.PI * 2);
                ctx.arc(25, -10, 35, 0, Math.PI * 2);
                ctx.arc(50, 0, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        } else if (this.type === 'bird') {
            this.elements.forEach(el => {
                ctx.save();
                const flap = Math.sin(Date.now() / 120 + el.x * 0.05) * 8;
                const bob = Math.cos(Date.now() / 400 + el.x * 0.02) * 6;
                ctx.translate(el.x, el.y + bob);
                ctx.scale(el.scale * 0.8, el.scale * 0.8);
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(-12, flap);
                ctx.quadraticCurveTo(-6, -2, 0, 4);
                ctx.quadraticCurveTo(6, -2, 12, flap);
                ctx.stroke();
                ctx.fillStyle = '#2c3e50';
                ctx.beginPath();
                ctx.arc(0, 4, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        } else if (this.type === 'plane') {
            this.elements.forEach(el => {
                if (!el.active) return;

                ctx.save();
                ctx.translate(el.x, el.baseY + Math.sin(el.bobPhase) * 2.5);
                ctx.scale(el.scale, el.scale);
                ctx.rotate(-0.02 + Math.sin(el.bobPhase * 0.35) * 0.01);
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';

                const strokeAndFill = (fillStyle) => {
                    ctx.fillStyle = fillStyle;
                    ctx.fill();
                    ctx.strokeStyle = '#0F172A';
                    ctx.lineWidth = 2.4;
                    ctx.stroke();
                };

                const trailWave = Math.sin(el.bobPhase * 0.8) * 1.6;
                const upperTrail = ctx.createLinearGradient(-210, -5, -70, -2);
                upperTrail.addColorStop(0, 'rgba(255,255,255,0)');
                upperTrail.addColorStop(0.25, 'rgba(255,255,255,0.18)');
                upperTrail.addColorStop(1, 'rgba(255,255,255,0.72)');
                ctx.strokeStyle = upperTrail;
                ctx.lineWidth = 5;
                ctx.shadowColor = 'rgba(255,255,255,0.18)';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(-212, -8 + trailWave);
                ctx.quadraticCurveTo(-160, -10 + trailWave, -118, -7);
                ctx.quadraticCurveTo(-100, -6, -88, -4);
                ctx.stroke();

                const lowerTrail = ctx.createLinearGradient(-210, 10, -68, 7);
                lowerTrail.addColorStop(0, 'rgba(255,255,255,0)');
                lowerTrail.addColorStop(0.25, 'rgba(255,255,255,0.16)');
                lowerTrail.addColorStop(1, 'rgba(255,255,255,0.62)');
                ctx.strokeStyle = lowerTrail;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-208, 10 + trailWave * 0.8);
                ctx.quadraticCurveTo(-154, 12 + trailWave * 0.8, -116, 8);
                ctx.quadraticCurveTo(-96, 7, -84, 5);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Soft underside tone for depth.
                ctx.beginPath();
                ctx.moveTo(-70, 8);
                ctx.quadraticCurveTo(-18, 20, 54, 18);
                ctx.quadraticCurveTo(90, 15, 110, 8);
                ctx.quadraticCurveTo(84, 25, 18, 27);
                ctx.quadraticCurveTo(-38, 27, -70, 8);
                ctx.closePath();
                ctx.fillStyle = '#DCECF8';
                ctx.fill();

                // Main fuselage.
                ctx.beginPath();
                ctx.moveTo(-78, -6);
                ctx.quadraticCurveTo(-58, -16, -18, -16);
                ctx.quadraticCurveTo(28, -17, 74, -14);
                ctx.quadraticCurveTo(106, -11, 122, 0);
                ctx.quadraticCurveTo(136, 10, 130, 20);
                ctx.quadraticCurveTo(122, 31, 90, 34);
                ctx.quadraticCurveTo(46, 38, -8, 35);
                ctx.quadraticCurveTo(-46, 33, -74, 25);
                ctx.quadraticCurveTo(-94, 18, -98, 9);
                ctx.quadraticCurveTo(-96, -1, -78, -6);
                ctx.closePath();
                strokeAndFill('#FDFEFE');

                // Tail stabilizer.
                ctx.beginPath();
                ctx.moveTo(-82, 4);
                ctx.quadraticCurveTo(-110, 12, -134, 24);
                ctx.quadraticCurveTo(-110, 22, -76, 12);
                ctx.closePath();
                strokeAndFill('#FDFEFE');

                // Vertical tail.
                ctx.beginPath();
                ctx.moveTo(-62, 2);
                ctx.lineTo(-72, -40);
                ctx.quadraticCurveTo(-73, -50, -64, -50);
                ctx.lineTo(-52, -50);
                ctx.quadraticCurveTo(-40, -48, -28, -36);
                ctx.lineTo(-12, -18);
                ctx.lineTo(-12, -2);
                ctx.closePath();
                strokeAndFill('#FDFEFE');

                // Upper wing.
                ctx.beginPath();
                ctx.moveTo(-4, -2);
                ctx.quadraticCurveTo(18, -22, 38, -36);
                ctx.quadraticCurveTo(48, -44, 58, -40);
                ctx.lineTo(76, -22);
                ctx.lineTo(14, -16);
                ctx.closePath();
                strokeAndFill('#FDFEFE');

                // Main wing.
                ctx.beginPath();
                ctx.moveTo(-2, 12);
                ctx.quadraticCurveTo(-28, 12, -54, 26);
                ctx.lineTo(-88, 46);
                ctx.quadraticCurveTo(-100, 54, -90, 60);
                ctx.quadraticCurveTo(-68, 66, -34, 58);
                ctx.quadraticCurveTo(8, 48, 42, 24);
                ctx.quadraticCurveTo(24, 14, -2, 12);
                ctx.closePath();
                strokeAndFill('#FDFEFE');

                // Engines.
                [2, 26].forEach(engineX => {
                    drawRoundedRect(ctx, engineX, 20, 14, 18, 7);
                    strokeAndFill('#F3F7FB');

                    ctx.beginPath();
                    ctx.ellipse(engineX + 7, 29, 4.8, 6.5, 0, 0, Math.PI * 2);
                    strokeAndFill('#FFFFFF');
                });

                // Cockpit glass.
                ctx.beginPath();
                ctx.moveTo(74, -8);
                ctx.quadraticCurveTo(96, -10, 110, -4);
                ctx.lineTo(102, 6);
                ctx.quadraticCurveTo(90, 7, 76, 4);
                ctx.quadraticCurveTo(70, -1, 74, -8);
                ctx.closePath();
                strokeAndFill('#78D7FF');

                ctx.beginPath();
                ctx.moveTo(84, -9);
                ctx.lineTo(84, 6);
                ctx.moveTo(96, -7);
                ctx.lineTo(94, 7);
                ctx.strokeStyle = '#0F172A';
                ctx.lineWidth = 1.6;
                ctx.stroke();

                // Passenger windows.
                [-20, 2, 24, 46].forEach(windowX => {
                    ctx.beginPath();
                    ctx.arc(windowX, 4, 5, 0, Math.PI * 2);
                    strokeAndFill('#78D7FF');
                });

                ctx.restore();
            });
        } else if (this.type === 'balloon') {
            this.elements.forEach(el => {
                if (!el.active) return;

                ctx.save();
                ctx.translate(el.x, el.y);
                ctx.scale(el.scale, el.scale);
                ctx.rotate(Math.sin(el.bobPhase * 0.45) * 0.035);

                const envelopePath = () => {
                    ctx.beginPath();
                    ctx.moveTo(0, -46);
                    ctx.bezierCurveTo(26, -46, 40, -22, 35, 2);
                    ctx.bezierCurveTo(31, 24, 17, 37, 0, 44);
                    ctx.bezierCurveTo(-17, 37, -31, 24, -35, 2);
                    ctx.bezierCurveTo(-40, -22, -26, -46, 0, -46);
                    ctx.closePath();
                };

                const glow = ctx.createRadialGradient(0, -8, 4, 0, -8, 54);
                glow.addColorStop(0, 'rgba(255,255,255,0.16)');
                glow.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(0, -8, 54, 0, Math.PI * 2);
                ctx.fill();

                ctx.save();
                envelopePath();
                ctx.clip();
                [-36, -18, 0, 18].forEach((stripeX, index) => {
                    ctx.fillStyle = el.colors[index % el.colors.length];
                    ctx.fillRect(stripeX, -56, 18, 110);
                });
                const envelopeShade = ctx.createLinearGradient(0, -50, 0, 46);
                envelopeShade.addColorStop(0, 'rgba(255,255,255,0.28)');
                envelopeShade.addColorStop(0.35, 'rgba(255,255,255,0.08)');
                envelopeShade.addColorStop(1, 'rgba(0,0,0,0.18)');
                ctx.fillStyle = envelopeShade;
                ctx.fillRect(-48, -56, 96, 112);
                ctx.restore();

                envelopePath();
                ctx.strokeStyle = '#2B4157';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(-18, -32);
                ctx.quadraticCurveTo(-6, -40, 10, -34);
                ctx.stroke();

                ctx.fillStyle = '#F3E0BA';
                ctx.beginPath();
                ctx.moveTo(-13, 41);
                ctx.quadraticCurveTo(0, 35, 13, 41);
                ctx.lineTo(9, 48);
                ctx.quadraticCurveTo(0, 45, -9, 48);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#7A5A3F';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                const ropeXs = [-10, -4, 4, 10];
                const basketAnchorXs = [-8, -3, 3, 8];
                ctx.strokeStyle = '#7A5A3F';
                ctx.lineWidth = 1.8;
                ropeXs.forEach((ropeX, index) => {
                    ctx.beginPath();
                    ctx.moveTo(ropeX, 44);
                    ctx.quadraticCurveTo(
                        ropeX * 0.95,
                        51 + Math.abs(ropeX) * 0.18,
                        basketAnchorXs[index],
                        61
                    );
                    ctx.stroke();
                });

                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-8, 50);
                ctx.lineTo(8, 50);
                ctx.stroke();

                ctx.fillStyle = '#C98650';
                ctx.strokeStyle = '#6D452C';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-10, 60);
                ctx.lineTo(10, 60);
                ctx.lineTo(7, 76);
                ctx.lineTo(-7, 76);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(-6, 63);
                ctx.lineTo(6, 63);
                ctx.moveTo(-5, 68);
                ctx.lineTo(5, 68);
                ctx.stroke();

                ctx.restore();
            });
        } else if (this.type === 'mountain') {
            const isMobile = window.innerWidth <= 850;
            const mobileScale = isMobile ? 0.6 : 1.0;
            const mountainElements = this.elements.filter(el => el.scale >= 0.85);
            const groundY = INTERNAL_HEIGHT - GROUND_HEIGHT;
            const mountainClipBottom = groundY - (isMobile ? 70 : 85);
            ctx.save();
            ctx.beginPath();
            ctx.rect(-200, -200, INTERNAL_WIDTH + 400, mountainClipBottom + 200);
            ctx.clip();
            mountainElements.forEach(el => {
                const mW = 750 * el.scale * mobileScale;
                const mH = 380 * el.scale * mobileScale;
                const mountainBaseY = groundY - mH * (isMobile ? 0.15 : 0.22);
                ctx.fillStyle = lerpColor(theme.mountain, '#000000', 0.1);
                ctx.beginPath();
                ctx.moveTo(el.x - 50, mountainBaseY);
                ctx.quadraticCurveTo(el.x + mW * 0.3, groundY - mH * 0.4, el.x + mW * 0.5, groundY - mH * 0.8);
                ctx.quadraticCurveTo(el.x + mW * 0.7, groundY - mH * 0.4, el.x + mW + 50, mountainBaseY);
                ctx.fill();
                const grad = ctx.createLinearGradient(el.x, groundY - mH, el.x, mountainBaseY);
                grad.addColorStop(0, lerpColor(theme.mountain, '#FFFFFF', 0.2));
                grad.addColorStop(0.5, theme.mountain);
                grad.addColorStop(1, theme.ground);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(el.x, mountainBaseY);
                ctx.quadraticCurveTo(el.x + mW * 0.25, groundY - mH * 0.3, el.x + mW * 0.5, groundY - mH);
                ctx.quadraticCurveTo(el.x + mW * 0.75, groundY - mH * 0.3, el.x + mW, mountainBaseY);
                ctx.fill();
                el.features.forEach(f => {
                    const fx = el.x + mW * f.relX;
                    const fy = f.type === 'tree' ? mountainBaseY : mountainBaseY - (mH * f.relY);
                    if (f.type === 'tree') {
                        // Tonton (Fluffy) Pinterest Tree Design
                        const ts = el.scale * (1.7 + f.variant * 0.3);
                        ctx.save();
                        ctx.translate(fx, fy);
                        ctx.scale(ts, ts);
                        
                        // Trunk
                        ctx.fillStyle = '#5D4037';
                        ctx.beginPath();
                        ctx.moveTo(-5, 0);
                        ctx.quadraticCurveTo(-4, -15, -2, -25);
                        ctx.lineTo(2, -25);
                        ctx.quadraticCurveTo(4, -15, 5, 0);
                        ctx.fill();
                        
                        // Canopy
                        ctx.fillStyle = theme.grass;
                        const drawLobe = (x, y, r) => {
                            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
                        };
                        const canopyY = -35;
                        drawLobe(0, canopyY, 20);
                        drawLobe(-12, canopyY + 8, 15);
                        drawLobe(12, canopyY + 8, 15);
                        drawLobe(-10, canopyY - 10, 16);
                        drawLobe(10, canopyY - 10, 16);
                        drawLobe(0, canopyY - 18, 14);
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        drawLobe(-5, canopyY - 5, 12);
                        
                        // Horizontal Grass and Flowers next to tree
                        ctx.scale(1/ts, 1/ts); // Reset scale for consistent details
                        for(let i=0; i<3; i++) {
                            const sideX = (i === 0 ? -30 : (i === 1 ? 30 : 45));
                            ctx.save();
                            ctx.translate(sideX, 0);
                            ctx.strokeStyle = theme.grass;
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(-3, 0); ctx.lineTo(-4, -6);
                            ctx.moveTo(0, 0); ctx.lineTo(0, -8);
                            ctx.moveTo(3, 0); ctx.lineTo(4, -6);
                            ctx.stroke();
                            if (i % 2 === 0) {
                                ctx.fillStyle = '#FFFFFF';
                                ctx.beginPath(); ctx.arc(0, -8, 3, 0, Math.PI*2); ctx.fill();
                                ctx.fillStyle = '#FFD700';
                                ctx.beginPath(); ctx.arc(0, -8, 1.5, 0, Math.PI*2); ctx.fill();
                            }
                            ctx.restore();
                        }
                        ctx.restore();
                    }
                    ctx.restore();
                });
                const glow = ctx.createRadialGradient(el.x + mW / 2, groundY - mH, 0, el.x + mW / 2, groundY - mH, 150 * el.scale);
                glow.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
                glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = glow;
                ctx.fill();
            });
            ctx.restore();
        }
        ctx.restore();
    }
}

let obstacles = [];
let coins = [];
let magnets = [];
let layers = [
    new ParallaxLayer(0.2, 'cloud'),
    new ParallaxLayer(0.12, 'balloon'),
    new ParallaxLayer(0.22, 'plane'),
    new ParallaxLayer(0.3, 'bird')
];

// Initialization
window.onload = function () {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const isMobileLayout = window.innerWidth <= 850;
        logicalWidth = isMobileLayout ? 400 : INTERNAL_WIDTH;
        canvasScale = canvas.width / logicalWidth;
        const sceneHeight = INTERNAL_HEIGHT * canvasScale;
        
        if (sceneHeight > canvas.height) {
            canvasScale = canvas.height / INTERNAL_HEIGHT;
            offsetX = (canvas.width - logicalWidth * canvasScale) / 2;
            offsetY = 0;
        } else {
            offsetX = 0;
            if (!isMobileLayout) {
                offsetY = (canvas.height - sceneHeight) / 2;
            } else {
                const mobileControls = document.getElementById('mobile-controls');
                const controlsHeight = mobileControls ? mobileControls.getBoundingClientRect().height : 0;
                const controlsReserve = (controlsHeight || 76) + 24;
                const availableVerticalSpace = canvas.height - sceneHeight;
                const centeredOffsetY = availableVerticalSpace / 2;
                const preferredOffsetY = centeredOffsetY + Math.min(12, availableVerticalSpace * 0.03);
                const maxOffsetY = canvas.height - sceneHeight - controlsReserve;
                offsetY = Math.max(0, Math.min(preferredOffsetY, maxOffsetY));
            }
        }
        
        if (!gameRunning) {
            drawWelcomeScreen();
        }
    }

    window.addEventListener('resize', resize);
    resize();
    window.addEventListener('keydown', handleInput);
    window.addEventListener('keyup', handleKeyUp);

    if (isMobileDevice) {
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        const lockViewportScale = () => {
            if (viewportMeta) {
                viewportMeta.setAttribute(
                    'content',
                    'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
                );
            }
        };

        lockViewportScale();

        ['gesturestart', 'gesturechange', 'gestureend'].forEach(eventName => {
            document.addEventListener(eventName, event => {
                event.preventDefault();
            }, { passive: false });
        });

        document.addEventListener('touchmove', event => {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        }, { passive: false });

        let lastTouchEnd = 0;
        document.addEventListener('touchend', event => {
            const now = Date.now();
            if (now - lastTouchEnd < 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                if (window.visualViewport.scale !== 1) {
                    lockViewportScale();
                    window.scrollTo(0, 0);
                }
            });
        }
    }

    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
        muteBtn.addEventListener('click', function (e) {
            this.blur();
            isMuted = !isMuted;
            this.innerText = isMuted ? '🔇' : '🔊';
        });
    }

    const guideBtn = document.getElementById('guide-btn');
    const closeGuideBtn = document.getElementById('close-guide-btn');
    const guideOverlay = document.getElementById('guide-overlay');
    const guidePrev = document.getElementById('guide-prev');
    const guideNext = document.getElementById('guide-next');
    const guideTrack = document.getElementById('guide-track');
    const guideDotsContainer = document.getElementById('guide-dots');
    const mobileControls = document.getElementById('mobile-controls');
    const pauseOverlay = document.getElementById('pause-overlay');
    
    let currentGuideSlide = 0;
    const guideSlidesCount = 9;

    function updateGuideSlider() {
        if (!guideTrack) return;
        guideTrack.style.transform = `translateX(-${currentGuideSlide * 100}%)`;
        if (guidePrev) guidePrev.disabled = currentGuideSlide === 0;
        if (guideNext) guideNext.disabled = currentGuideSlide === guideSlidesCount - 1;
        
        const dots = document.querySelectorAll('.guide-dot');
        dots.forEach((dot, index) => {
            if (index === currentGuideSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    if (guideDotsContainer) {
        guideDotsContainer.innerHTML = '';
        for (let i = 0; i < guideSlidesCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'guide-dot';
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                currentGuideSlide = i;
                updateGuideSlider();
            });
            guideDotsContainer.appendChild(dot);
        }
    }

    if (guidePrev) {
        guidePrev.addEventListener('click', () => {
            if (currentGuideSlide > 0) {
                currentGuideSlide--;
                updateGuideSlider();
            }
        });
    }

    if (guideNext) {
        guideNext.addEventListener('click', () => {
            if (currentGuideSlide < guideSlidesCount - 1) {
                currentGuideSlide++;
                updateGuideSlider();
            }
        });
    }

    if (guideBtn && closeGuideBtn && guideOverlay) {
        guideBtn.addEventListener('click', function (e) {
            this.blur();
            if (gameRunning && !isPaused) {
                togglePause();
            }
            currentGuideSlide = 0;
            updateGuideSlider();
            pauseOverlay.style.display = 'none';
            if (mobileControls && window.innerWidth <= 850) {
                mobileControls.style.display = 'none';
            }
            guideOverlay.style.display = 'flex';
        });

        closeGuideBtn.addEventListener('click', function (e) {
            guideOverlay.style.display = 'none';
            if (isPaused) {
                pauseOverlay.style.display = 'block';
            }
            if (mobileControls && window.innerWidth <= 850) {
                mobileControls.style.display = 'flex';
            }
        });
    }

    document.getElementById('pause-btn').addEventListener('click', function (e) {
        this.blur();
        togglePause();
    });

    document.getElementById('restart-btn').addEventListener('click', function (e) {
        this.blur();
        showRestartOverlay();
    });

    document.getElementById('restart-yes').addEventListener('click', function () {
        hideRestartOverlay();
        resetGame();
        startCountdown(() => {
            gameRunning = true;
            isPaused = false;
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        });
    });

    document.getElementById('restart-no').addEventListener('click', function () {
        hideRestartOverlay();
        if (gameRunning && !wasPausedBeforeConfirm) {
            isPaused = false;
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    });

    document.getElementById('gameover-restart').addEventListener('click', function () {
        this.blur();
        resetGame();
        startCountdown(() => {
            gameRunning = true;
            isPaused = false;
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        });
    });

    document.getElementById('next-level-btn').addEventListener('click', function () {
        this.blur();
        document.getElementById('level-complete').style.display = 'none';
        currentLevel++;
        playLevelUpSound();
        nextTheme = THEMES[currentLevel - 1];
        themeTransitionProgress = 0;
        startCountdown(() => {
            isLevelTransitioning = false;
            gameRunning = true;
            isPaused = false;
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        });
    });

    const jumpBtn = document.getElementById('jump-btn');
    const crouchBtn = document.getElementById('crouch-btn');

    jumpBtn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (!audioCtx) initAudio();
        if (!gameRunning) {
            const countdownOverlay = document.getElementById('countdown-overlay');
            if (countdownOverlay.style.display === 'block') return;
            resetGame();
            startCountdown(() => {
                gameRunning = true;
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            });
            document.getElementById('ui-layer').style.display = 'block';
            document.getElementById('game-controls').style.display = 'flex';
            document.getElementById('game-over').style.display = 'none';
            document.getElementById('restart-overlay').style.display = 'none';
        } else if (!isPaused) {
            player.jump();
        }
    });

    crouchBtn.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (gameRunning && !isPaused) {
            player.crouch();
        }
    });

    crouchBtn.addEventListener('touchend', function (e) {
        e.preventDefault();
        player.standUp();
    });

    crouchBtn.addEventListener('touchcancel', function (e) {
        e.preventDefault();
        player.standUp();
    });

    // Doğrudan Ekran Dokunma ve Kaydırma Kontrolleri (Tüm Ekran)
    let touchStartY = 0;
    canvas.addEventListener('touchstart', function(e) {
        if (e.target.closest('#game-controls') || e.target.closest('#mobile-controls') || e.target.closest('.overlay-buttons')) return;
        
        touchStartY = e.changedTouches[0].screenY;
        
        if (!audioCtx) initAudio();
        if (!gameRunning) {
            const countdownOverlay = document.getElementById('countdown-overlay');
            const guideOverlay = document.getElementById('guide-overlay');
            if (countdownOverlay.style.display === 'block' || guideOverlay.style.display === 'flex') return;
            resetGame();
            startCountdown(() => {
                gameRunning = true;
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            });
            document.getElementById('ui-layer').style.display = 'block';
            document.getElementById('game-controls').style.display = 'flex';
            document.getElementById('game-over').style.display = 'none';
            document.getElementById('restart-overlay').style.display = 'none';
        }
    }, {passive: false});

    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault(); // Ekranın kaymasını engelle
    }, {passive: false});

    canvas.addEventListener('touchend', function(e) {
        if (!gameRunning || isPaused) return;
        let touchEndY = e.changedTouches[0].screenY;
        let dy = touchEndY - touchStartY;

        // Eşik değeri 30px
        if (dy > 30) {
            // Aşağı kaydırma (Eğilme)
            player.crouch();
            // Mobil için bir süre sonra otomatik kalkma
            setTimeout(() => { if (player.isCrouching) player.standUp(); }, 500);
        } else if (dy < -30 || Math.abs(dy) <= 30) {
            // Yukarı kaydırma veya sadece dokunma (Zıplama)
            player.jump();
        }
    }, {passive: false});
};

let wasPausedBeforeConfirm = false;

function showRestartOverlay() {
    const overlay = document.getElementById('restart-overlay');
    if (overlay.style.display === 'block') return;
    wasPausedBeforeConfirm = isPaused;
    if (gameRunning && !isPaused) {
        isPaused = true;
        cancelAnimationFrame(animationId);
    }
    overlay.style.display = 'block';
}

function hideRestartOverlay() {
    document.getElementById('restart-overlay').style.display = 'none';
}

function startCountdown(callback) {
    const overlay = document.getElementById('countdown-overlay');
    const numberEl = document.getElementById('countdown-number');
    let count = 3;
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('restart-overlay').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'block';
    document.getElementById('game-controls').style.display = 'flex';
    overlay.style.display = 'block';
    numberEl.innerText = count;
    playCountdownBeep();
    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            numberEl.innerText = count;
            numberEl.style.animation = 'none';
            numberEl.offsetHeight;
            numberEl.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            if (count === 1) {
                playCountdownGo();
            } else {
                playCountdownBeep();
            }
        } else {
            clearInterval(timer);
            overlay.style.display = 'none';
            if (callback) callback();
        }
    }, 1000);
}

function handleInput(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (!audioCtx) initAudio();
        if (!gameRunning) {
            const countdownOverlay = document.getElementById('countdown-overlay');
            if (countdownOverlay.style.display === 'block') return;
            resetGame();
            startCountdown(() => {
                gameRunning = true;
                lastTime = performance.now();
                requestAnimationFrame(gameLoop);
            });
            document.getElementById('ui-layer').style.display = 'block';
            document.getElementById('game-controls').style.display = 'flex';
            document.getElementById('game-over').style.display = 'none';
            document.getElementById('restart-overlay').style.display = 'none';
        } else if (!isPaused) {
            player.jump();
        }
    } else if (e.code === 'ArrowDown') {
        if (gameRunning && !isPaused) {
            player.crouch();
        }
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
        togglePause();
    }
}

function handleKeyUp(e) {
    if (e.code === 'ArrowDown') {
        player.standUp();
    }
}

function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    const pauseOverlay = document.getElementById('pause-overlay');
    if (isPaused) {
        pauseOverlay.style.display = 'block';
        cancelAnimationFrame(animationId);
        drawCharacterOnCanvas('pause-char-canvas');
    } else {
        pauseOverlay.style.display = 'none';
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function resetGame() {
    score = 0;
    coinsCollected = 0;
    currentLevel = 1;
    gameSpeed = GAME_SPEED_INITIAL;
    spawnTimer = 0;
    spawnInterval = SPAWN_RATE_INITIAL;
    obstacles = [];
    coins = [];
    powerups = [];
    particles = [];
    isPaused = false;
    onRiskPath = false;
    riskPathTimer = 0;
    levelFeatureSpawned = false;
    magnetActive = false;
    magnetTimeLeft = 0;
    shieldActive = false;
    multiplierActive = false;
    multiplierTimeLeft = 0;
    levelUpTimer = 0;
    currentTheme = { ...THEMES[0] };
    nextTheme = { ...THEMES[0] };
    themeTransitionProgress = 1;
    
    // Reset Game State
    gameRunning = false; 
    score = 0;
    lastTime = 0;
    
    // Position player back to start
    player.y = INTERNAL_HEIGHT - GROUND_HEIGHT - player.originalHeight;
    player.dy = 0;
    player.isJumping = false;
    player.isCrouching = false;
    player.height = player.originalHeight;
    player.runCycle = 0;
    
    updateScoreUI();
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('restart-overlay').style.display = 'none';
    document.getElementById('level-complete').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    
    // Reset layers
    layers.forEach(l => {
        l.init();
    });

    // Start screen show
    drawWelcomeScreen();
}

function gameLoop(timestamp) {
    if (!gameRunning || isPaused) return;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    update(deltaTime);
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    player.update();
    player.generateWindEffect();
    const dScore = Math.floor(score / 10);
    // Seviye her 50 metrede (skor/10) bir değişir
    if (currentLevel < 10 && dScore > 0 && dScore % 50 === 0 && Math.floor(dScore / 50) + 1 > currentLevel) {
        currentLevel = Math.floor(dScore / 50) + 1;
        playLevelUpSound();
        nextTheme = THEMES[(currentLevel - 1) % THEMES.length];
        themeTransitionProgress = 0;
        levelUpTimer = 3000; 
        levelFeatureSpawned = false;
    }
    
    // Seviye 10'a ulaşıldığında oyun sonsuza kadar devam eder.
    if (currentLevel >= 9) {
        riskPathTimer -= deltaTime;
        if (riskPathTimer <= 0) {
            onRiskPath = !onRiskPath;
            riskPathTimer = 5000 + Math.random() * 5000;
        }
    }
    if (themeTransitionProgress < 1) {
        themeTransitionProgress += 0.005;
        currentTheme.skyTop = lerpColor(currentTheme.skyTop, nextTheme.skyTop, themeTransitionProgress);
        currentTheme.skyBottom = lerpColor(currentTheme.skyBottom, nextTheme.skyBottom, themeTransitionProgress);
        currentTheme.ground = lerpColor(currentTheme.ground, nextTheme.ground, themeTransitionProgress);
        currentTheme.grass = lerpColor(currentTheme.grass, nextTheme.grass, themeTransitionProgress);
        currentTheme.mountain = lerpColor(currentTheme.mountain, nextTheme.mountain, themeTransitionProgress);
    }
    if (levelUpTimer > 0) levelUpTimer -= deltaTime;
    if (magnetActive) {
        magnetTimeLeft -= deltaTime;
        if (magnetTimeLeft <= 0) magnetActive = false;
    }
    if (multiplierActive) {
        multiplierTimeLeft -= deltaTime;
        if (multiplierTimeLeft <= 0) multiplierActive = false;
    }
    layers.forEach(layer => layer.update(deltaTime));
    particles.forEach(particle => particle.update());
    particles = particles.filter(particle => !particle.isDead());
    spawnTimer += deltaTime;
    if (spawnTimer > spawnInterval) {
        let rand = Math.random();
        if (!levelFeatureSpawned) {
            if (currentLevel === 3) { powerups.push(new PowerUp('magnet')); levelFeatureSpawned = true; }
            else if (currentLevel === 4) { powerups.push(new PowerUp('shield')); levelFeatureSpawned = true; }
            else if (currentLevel === 5) { powerups.push(new PowerUp('multiplier')); levelFeatureSpawned = true; }
            else if (currentLevel === 6) { obstacles.push(new Obstacle()); levelFeatureSpawned = true; }
            else if (currentLevel === 7) { obstacles.push(new Obstacle()); levelFeatureSpawned = true; }
            else if (currentLevel === 8) {
                const dCoin = new Coin(); dCoin.isDiamond = true; coins.push(dCoin);
                levelFeatureSpawned = true;
            }
        }
        if (rand < 0.6) {
            obstacles.push(new Obstacle());
        } else if (rand < 0.9 && currentLevel >= 2) {
            const count = 3 + Math.floor(Math.random() * 3);
            const startX = (canvas.width - offsetX) / canvasScale;
            const h = [
                INTERNAL_HEIGHT - GROUND_HEIGHT - 30,
                INTERNAL_HEIGHT - GROUND_HEIGHT - 65,
                INTERNAL_HEIGHT - GROUND_HEIGHT - 120
            ][Math.floor(Math.random() * 3)];
            for (let i = 0; i < count; i++) {
                const coin = new Coin();
                coin.x = startX + i * 50;
                coin.y = h;
                coins.push(coin);
            }
        } else if (rand < 0.94 && currentLevel >= 3) {
            powerups.push(new PowerUp('magnet'));
        } else if (rand < 0.97 && currentLevel >= 4) {
            powerups.push(new PowerUp('shield'));
        } else if (rand < 1.0 && currentLevel >= 5) {
            powerups.push(new PowerUp('multiplier'));
        }
        spawnTimer = 0;
        let levelMult = 1 + (currentLevel - 1) * 0.12;
        if (currentLevel === 10) levelMult *= 1.3;
        spawnInterval = Math.max(500, SPAWN_RATE_INITIAL - (score * 0.05));
        gameSpeed = GAME_SPEED_INITIAL; // Keep speed fixed as requested
        if (currentLevel >= 9 && onRiskPath) {
            gameSpeed *= 1.4;
            spawnInterval *= 0.6;
        }
    }
    obstacles.forEach(obstacle => {
        obstacle.update();
        if (checkCollision(player, obstacle)) {
            if (shieldActive) {
                shieldActive = false;
                obstacle.markedForDeletion = true;
                playPowerUpSound();
            } else {
                if (currentLevel === 10) {
                    victory();
                } else {
                    gameOver();
                }
            }
        }
    });
    coins.forEach(coin => {
        coin.update();
        if (!coin.collected && checkCollision(player, coin)) {
            coin.collected = true;
            coin.markedForDeletion = true;
            let amount = coin.isDiamond ? 5 : 1;
            if (multiplierActive) amount *= 2;
            if (currentLevel >= 9 && onRiskPath) amount *= 3;
            coinsCollected += amount;
            playCoinSound();
            for (let i = 0; i < 5; i++) particles.push(new Particle(coin.x, coin.y, 'wind'));
        }
    });
    powerups.forEach(pw => {
        pw.update();
        if (!pw.collected && checkCollision(player, pw)) {
            pw.collected = true;
            pw.markedForDeletion = true;
            if (pw.type === 'magnet') {
                magnetActive = true;
                magnetTimeLeft = 8000;
            } else if (pw.type === 'shield') {
                shieldActive = true;
            } else if (pw.type === 'multiplier') {
                multiplierActive = true;
                multiplierTimeLeft = 10000;
            }
            playPowerUpSound();
        }
    });
    obstacles = obstacles.filter(obstacle => !obstacle.markedForDeletion);
    coins = coins.filter(coin => !coin.markedForDeletion);
    powerups = powerups.filter(pw => !pw.markedForDeletion);
    score++;
    updateScoreUI();
}

function drawBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, currentTheme.skyTop);
    skyGrad.addColorStop(1, currentTheme.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (currentLevel >= 9 && onRiskPath) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '700 24px Fredoka';
        ctx.textAlign = 'right';
        ctx.fillText("TEHLİKELİ BÖLGE: 3X ÖDÜL 🔥", canvas.width - 20, 40);
        ctx.restore();
    }

    const groundHeightActual = GROUND_HEIGHT * canvasScale;
    const groundTopActual = offsetY + (INTERNAL_HEIGHT - GROUND_HEIGHT) * canvasScale;
    const horizonHeight = 120 * canvasScale;
    const horizonTop = groundTopActual - horizonHeight;
    
    const horizonGrad = ctx.createLinearGradient(0, horizonTop, 0, groundTopActual);
    horizonGrad.addColorStop(0, currentTheme.skyBottom);
    horizonGrad.addColorStop(0.5, lerpColor(currentTheme.skyBottom, currentTheme.ground, 0.3));
    horizonGrad.addColorStop(1, currentTheme.ground);
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, horizonTop, canvas.width, horizonHeight);
    
    // Parallax layers'ın ufuk gradyanının üstünde, ama asfaltın arkasında çizilmesi
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(canvasScale, canvasScale);
    layers.forEach(layer => layer.draw(ctx, currentTheme));
    ctx.restore();

    const shoulderHeight = 15 * canvasScale;
    ctx.fillStyle = currentTheme.grass;
    ctx.fillRect(0, groundTopActual - shoulderHeight, canvas.width, shoulderHeight);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, groundTopActual - 2 * canvasScale, canvas.width, 2 * canvasScale);

    const asphaltColor = '#2C3E50';
    const groundGrad = ctx.createLinearGradient(0, groundTopActual, 0, groundTopActual + groundHeightActual);
    groundGrad.addColorStop(0, asphaltColor);
    groundGrad.addColorStop(1, '#1A252F');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundTopActual, canvas.width, canvas.height - groundTopActual);
    
    ctx.save();
    const treeSpacing = 450 * canvasScale;
    if (treeSpacing > 0) {
        const treeOffset = ((score * gameSpeed * 0.4) * canvasScale) % treeSpacing;
        for (let tx = -treeOffset; tx < canvas.width + treeSpacing; tx += treeSpacing) {
            // Fluffy Pinterest Tree Design
            ctx.save();
            ctx.translate(tx, groundTopActual);
            
            const ts = canvasScale * 1.95;
            ctx.scale(ts, ts);
            
            // Subtle Shadow (Estetik Gölge)
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trunk
            ctx.fillStyle = '#5D4037';
            ctx.beginPath();
            ctx.moveTo(-5, 0);
            ctx.quadraticCurveTo(-4, -15, -2, -25);
            ctx.lineTo(2, -25);
            ctx.quadraticCurveTo(4, -15, 5, 0);
            ctx.fill();
            
            // Canopy
            ctx.fillStyle = currentTheme.grass;
            const drawLobe = (x, y, r) => {
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            };
            const canopyY = -35;
            
            drawLobe(0, canopyY, 20);
            drawLobe(-12, canopyY + 8, 15);
            drawLobe(12, canopyY + 8, 15);
            drawLobe(-10, canopyY - 10, 16);
            drawLobe(10, canopyY - 10, 16);
            drawLobe(0, canopyY - 18, 14);
            
            // Estetik Gölge on Canopy (Darker tint at bottom)
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            drawLobe(0, canopyY + 5, 18);
            drawLobe(-11, canopyY + 11, 13);
            drawLobe(11, canopyY + 11, 13);
            
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            drawLobe(-5, canopyY - 5, 12);

            ctx.restore();
        }

        const flowerClusters = [
            { offset: 0.38, colors: ['#FFF7AE', '#FFFFFF'], scale: 1.0 },
            { offset: 0.68, colors: ['#FFD9E6', '#FFF4F8'], scale: 0.88 }
        ];
        const drawFlowerCluster = (baseX, baseY, palette, scaleMult = 1) => {
            ctx.save();
            ctx.translate(baseX, baseY);
            ctx.scale(canvasScale * scaleMult, canvasScale * scaleMult);

            const stemColor = lerpColor(currentTheme.grass, '#2E7D32', 0.25);
            const petalColor = palette[0];
            const softPetalColor = palette[1];

            [
                { x: -8, h: 10, r: 2.6, tilt: -0.12 },
                { x: 0, h: 13, r: 3.2, tilt: 0.08 },
                { x: 9, h: 9, r: 2.3, tilt: 0.14 }
            ].forEach(flower => {
                ctx.save();
                ctx.translate(flower.x, 0);
                ctx.rotate(flower.tilt);

                ctx.strokeStyle = stemColor;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(flower.x * 0.04, -flower.h * 0.45, 0, -flower.h);
                ctx.stroke();

                ctx.translate(0, -flower.h);
                ctx.fillStyle = softPetalColor;
                for (let i = 0; i < 4; i++) {
                    const ang = (Math.PI / 2) * i;
                    ctx.beginPath();
                    ctx.ellipse(Math.cos(ang) * flower.r, Math.sin(ang) * flower.r, flower.r, flower.r * 0.7, ang, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = petalColor;
                ctx.beginPath();
                ctx.arc(0, 0, flower.r * 0.55, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            ctx.restore();
        };

        const drawGroundPlant = (baseX, baseY, scaleMult = 1, mirrored = false) => {
            ctx.save();
            ctx.translate(baseX, baseY);
            ctx.scale((mirrored ? -1 : 1) * canvasScale * scaleMult, canvasScale * scaleMult);

            const deepGrass = lerpColor(currentTheme.grass, '#2F6B3B', 0.35);
            const softGrass = lerpColor(currentTheme.grass, '#DFF3D8', 0.22);

            ctx.strokeStyle = deepGrass;
            ctx.lineWidth = 1.4;
            [
                { x: -7, h: 9, bend: -3 },
                { x: -3, h: 12, bend: -1 },
                { x: 1, h: 15, bend: 0 },
                { x: 5, h: 11, bend: 2 },
                { x: 8, h: 8, bend: 3 }
            ].forEach(blade => {
                ctx.beginPath();
                ctx.moveTo(blade.x, 0);
                ctx.quadraticCurveTo(blade.x + blade.bend, -blade.h * 0.55, blade.x + blade.bend * 0.6, -blade.h);
                ctx.stroke();
            });

            ctx.fillStyle = softGrass;
            [
                { x: -4, y: -6, rx: 3.2, ry: 1.7, rot: -0.55 },
                { x: 4, y: -8, rx: 3.6, ry: 1.9, rot: 0.5 }
            ].forEach(leaf => {
                ctx.save();
                ctx.translate(leaf.x, leaf.y);
                ctx.rotate(leaf.rot);
                ctx.beginPath();
                ctx.ellipse(0, 0, leaf.rx, leaf.ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            ctx.restore();
        };

        for (let tx = -treeOffset; tx < canvas.width + treeSpacing; tx += treeSpacing) {
            flowerClusters.forEach((cluster, index) => {
                const flowerX = tx + treeSpacing * cluster.offset;
                if (flowerX < -40 || flowerX > canvas.width + 40) return;
                const flowerY = groundTopActual - (2 + index * 1.5) * canvasScale;
                drawGroundPlant(flowerX - 10 * canvasScale, groundTopActual - 1.5 * canvasScale, cluster.scale, index % 2 === 0);
                drawGroundPlant(flowerX + 11 * canvasScale, groundTopActual - 1.2 * canvasScale, cluster.scale * 0.82, index % 2 !== 0);
                drawFlowerCluster(flowerX, flowerY, cluster.colors, cluster.scale);
            });
        }
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#FFFFFF';
    for (let i = 0; i < 8; i++) {
        const lineY = groundTopActual + Math.random() * (canvas.height - groundTopActual);
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(canvas.width, lineY + (Math.random() - 0.5) * 10);
        ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = '#ECF0F1';
    ctx.setLineDash([80 * canvasScale, 100 * canvasScale]);
    ctx.lineDashOffset = (score * (gameSpeed / 2)) % 180;
    ctx.lineWidth = 4 * canvasScale;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(0, groundTopActual + 12 * canvasScale);
    ctx.lineTo(canvas.width, groundTopActual + 12 * canvasScale);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(0, groundTopActual, canvas.width, 2 * canvasScale);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(canvasScale, canvasScale);
    particles.forEach(particle => particle.draw(ctx));
    player.draw();
    if (magnetActive) {
        const pulse = Math.sin(Date.now() / 150) * 5;
        ctx.strokeStyle = 'rgba(255, 64, 129, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 45 + pulse, 0, Math.PI * 2);
        ctx.stroke();
    }
    obstacles.forEach(obstacle => obstacle.draw());
    coins.forEach(coin => coin.draw());
    powerups.forEach(pw => pw.draw());
    if (levelUpTimer > 0) {
        ctx.save();
        ctx.translate(logicalWidth / 2, INTERNAL_HEIGHT / 2 - 100);
        ctx.font = 'bold 72px Fredoka';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
        ctx.globalAlpha = Math.min(1, levelUpTimer / 500);
        ctx.scale(1 + Math.sin(Date.now() / 100) * 0.1, 1 + Math.sin(Date.now() / 100) * 0.1);
        ctx.fillText(`LEVEL ${currentLevel}`, 0, 0);
        ctx.font = 'italic 30px Fredoka';
        ctx.fillText('YENİ ATMOSFER!', 0, 50);
        ctx.restore();
    }
    ctx.restore();
    
    // HUD en üstte görünecek şekilde en son çizilir
    drawPowerUpHUD();
}

function checkCollision(player, obstacle) {
    const playerPadding = 12;
    const obstaclePadding = obstacle.type === 'bird' ? 8 : 5;
    
    // For pits, collision is slightly different: triggered if player's center is over the pit and not jumping high
    if (obstacle.type === 'pit') {
        const playerCenterX = player.x + player.width / 2;
        const pitLeft = obstacle.x + 20;
        const pitRight = obstacle.x + obstacle.width - 20;
        return (
            playerCenterX > pitLeft && 
            playerCenterX < pitRight && 
            player.y + player.height >= INTERNAL_HEIGHT - GROUND_HEIGHT - 5
        );
    }

    const footTolerance = 5;
    return (
        player.x + playerPadding < obstacle.x + obstacle.width - obstaclePadding &&
        player.x + player.width - playerPadding > obstacle.x + obstaclePadding &&
        player.y + playerPadding < obstacle.y + obstacle.height - obstaclePadding &&
        player.y + player.height - footTolerance > obstacle.y
    );
}

function drawCharacterOnCanvas(canvasId) {
    const uiCanvas = document.getElementById(canvasId);
    const uiCtx = uiCanvas.getContext('2d');
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    const uiPlayer = {
        x: 30,
        y: 15,
        width: 40,
        height: 70,
        runCycle: Date.now() / 200,
        isCrouching: false,
        isJumping: false,
        draw: function () {
            const mainCtx = ctx;
            ctx = uiCtx;
            player.draw.call(this);
            ctx = mainCtx;
        }
    };
    uiPlayer.draw();
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    playGameOverSound();
    const ui = document.getElementById('game-over');
    ui.style.display = 'block';
    ui.style.pointerEvents = 'auto'; 
    ui.querySelector('h1').innerText = "OYUN BİTTİ";
    ui.querySelector('h1').style.color = ""; // Zafer ekranından kalan rengi temizle
    ui.querySelector('h1').nextElementSibling.nextElementSibling.innerHTML = `Skor: ${Math.floor(score / 10)} <br> Altın: ${coinsCollected}`;
    drawCharacterOnCanvas('gameover-char-canvas');
}

function victory() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    playLevelUpSound(); // Use a celebration sound if available
    const ui = document.getElementById('game-over');
    ui.style.display = 'block';
    ui.style.pointerEvents = 'auto'; 
    ui.querySelector('h1').innerText = "TEBRİKLER!";
    ui.querySelector('h1').style.color = "#FFD700";
    ui.querySelector('h1').nextElementSibling.nextElementSibling.innerHTML = `Oyunu Başarıyla Tamamladınız! <br> Skor: ${Math.floor(score / 10)} <br> Altın: ${coinsCollected}`;
    drawCharacterOnCanvas('gameover-char-canvas');
}

function updateScoreUI() {
    document.getElementById('score').innerText = 'Skor: ' + Math.floor(score / 10);
    document.getElementById('coin-count').innerText = coinsCollected;
    document.getElementById('level-num').innerText = currentLevel;
}

function playLevelUpSound() {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function playPowerUpSound() {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function playCoinSound() {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function drawWelcomeScreen() {
    drawBackground();
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(canvasScale, canvasScale);
    player.draw();
    const pulse = Math.sin(Date.now() / 300) * 0.05 + 1;
    const isMobile = window.innerWidth <= 850;
    ctx.textAlign = 'center';
    const centerX = logicalWidth / 2;
    if (isMobile) {
        ctx.save();
        ctx.translate(centerX, INTERNAL_HEIGHT / 2 - 60);
        ctx.scale(pulse, pulse);
        drawSoftPill(0, 0, "Başlamak İçin Dokun 👆", 260, '#CDF5DF', '#2D5A43');
        ctx.restore();
        ctx.font = '600 16px Fredoka';
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.fillText("Aşağı Kaydırarak (Swipe) Eğilebilirsin", centerX, INTERNAL_HEIGHT / 2 + 10);
    } else {
        ctx.font = '700 32px Fredoka';
        ctx.fillStyle = 'white';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.fillText("Maceraya Hazır mısın?", centerX, INTERNAL_HEIGHT / 2 - 80);
        ctx.save();
        ctx.translate(centerX, INTERNAL_HEIGHT / 2 - 20);
        ctx.scale(pulse, pulse);
        drawSoftPill(0, 0, "Boşluk veya Yukarı Ok ↑", 300, '#CDF5DF', '#2D5A43');
        ctx.restore();
        ctx.font = '600 18px Fredoka';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText("Eğilmek için Aşağı Ok ↓", centerX, INTERNAL_HEIGHT / 2 + 45);
    }
    ctx.restore();
}

function drawSoftPill(x, y, label, width, bgColor, textColor) {
    ctx.save();
    ctx.translate(x - width / 2, y - 25);
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.fillStyle = bgColor;
    drawRoundedRect(ctx, 0, 0, width, 50, 25);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = textColor;
    ctx.font = '700 18px Fredoka';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, width / 2, 25);
    ctx.restore();
}

function drawPowerUpHUD() {
    const isMobile = window.innerWidth <= 850;
    let yPos = isMobile ? 70 : 100; 
    const boxWidth = isMobile ? 180 : 225;
    const xPos = canvas.width - boxWidth + (isMobile ? 10 : 5);
    
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '700 14px Fredoka';
    
    if (shieldActive) {
        drawHUDIcon(xPos, yPos, '🛡️', 'KALKAN AKTİF', 1, '#4FC3F7', isMobile);
        yPos += isMobile ? 30 : 35;
    }
    if (magnetActive) {
        drawHUDIcon(xPos, yPos, '🧲', 'MIKNATIS AKTİF', magnetTimeLeft / 8000, '#FF4081', isMobile);
        yPos += isMobile ? 30 : 35;
    }
    if (multiplierActive) {
        drawHUDIcon(xPos, yPos, '✨', '2X AKTİF', multiplierTimeLeft / 10000, '#FFD700', isMobile);
        yPos += isMobile ? 30 : 35;
    }
    ctx.restore();
}

function drawHUDIcon(x, y, emoji, label, progress, accentColor, isMobile) {
    const boxWidth = isMobile ? 170 : 225;
    const boxHeight = isMobile ? 26 : 36;
    const fontSize = isMobile ? 'bold 12px Fredoka' : 'bold 18px Fredoka';
    const textYOffset = isMobile ? 18 : 24;
    const barYOffset = isMobile ? 22 : 30;
    const barWidth = isMobile ? 150 : 200;

    // Premium Glassy Box
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    drawRoundedRect(ctx, x - 20, y, boxWidth, boxHeight, 8); 
    ctx.fill();
    
    // Accent border
    ctx.strokeStyle = accentColor || 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 0;
    ctx.font = fontSize; 
    ctx.fillText(`${emoji} ${label}`, x - 5, y + textYOffset);
    
    // Progress Bar (if applicable)
    if (progress < 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x - 5, y + barYOffset, barWidth, 3);
        ctx.fillStyle = accentColor;
        ctx.fillRect(x - 5, y + barYOffset, barWidth * progress, 3);
    }
    ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function lerpColor(a, b, amount) {
    const ah = parseInt(a.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        bh = parseInt(b.replace(/#/g, ''), 16),
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);

    return '#' + ((1 << 24) + (Math.round(rr) << 16) + (Math.round(rg) << 8) + Math.round(rb)).toString(16).slice(1);
}
