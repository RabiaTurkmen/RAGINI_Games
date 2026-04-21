/* ============================================
   Zippy's Adventure — Game Engine
   2D Side-Scrolling Platformer
   Built with vanilla JavaScript + Canvas
   ============================================ */

// ================== CANVAS SETUP ==================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ================== CONSTANTS ==================
const TILE = 40; // tile size in pixels
const GRAVITY = 0.48;
const TERMINAL_VELOCITY = 12;
let PLAYER_SPEED = 4.5;
let PLAYER_JUMP = -13.5;
const FRICTION = 0.82;
const AIR_CONTROL = 0.88;
const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 36;
const INVINCIBILITY_DURATION = 90; // frames
const LEVEL_HEIGHT = 15; // tiles tall

// ================== GAME STATE ==================
let gameState = 'start'; // start, levelselect, playing, gameover, complete
let score = 0;
let lives = 3;
let coinsCollected = 0;
let highScore = parseInt(localStorage.getItem('zippy_highscore')) || 0;
let shakeTimer = 0;
let shakeIntensity = 0;
let currentLevel = 1;
const MAX_LEVELS = 10;
let currentCharacter = 'zippy';

// Session-based level progress (resets when tab is closed)
function getUnlockedLevels() {
    const stored = sessionStorage.getItem('zippy_unlocked');
    return stored ? JSON.parse(stored) : [1]; // Level 1 is always unlocked
}

function unlockLevel(level) {
    const unlocked = getUnlockedLevels();
    if (!unlocked.includes(level)) {
        unlocked.push(level);
        sessionStorage.setItem('zippy_unlocked', JSON.stringify(unlocked));
    }
}

function isLevelUnlocked(level) {
    return getUnlockedLevels().includes(level);
}

// ================== LEVEL CONFIG ==================
// Each level gets progressively wider, more enemies, more gaps, etc.
function getLevelConfig(lvl) {
    return {
        width: 140 + lvl * 25,  // Level 1: 165, Level 10: 390 tiles wide
        enemySpeed: 1.0 + lvl * 0.15,
        lives: Math.max(2, 4 - Math.floor(lvl / 4)), // 3, 3, 3, 2, 2, 2, 2, 2, 2, 2
    };
}

// ================== INPUT HANDLING ==================
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // Prevent page scroll
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Mobile touch controls
const touchState = { left: false, right: false, jump: false };

function setupTouchControls() {
    const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const mobileControls = document.getElementById('mobile-controls');

    if (isMobile) {
        mobileControls.classList.add('visible');
    }

    const btnLeft = document.getElementById('touch-left');
    const btnRight = document.getElementById('touch-right');
    const btnJump = document.getElementById('touch-jump');

    function addTouchEvents(btn, key) {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); touchState[key] = true; btn.classList.add('pressed'); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); touchState[key] = false; btn.classList.remove('pressed'); });
        btn.addEventListener('touchcancel', (e) => { e.preventDefault(); touchState[key] = false; btn.classList.remove('pressed'); });
    }

    addTouchEvents(btnLeft, 'left');
    addTouchEvents(btnRight, 'right');
    addTouchEvents(btnJump, 'jump');
}

setupTouchControls();

// Unified input check
function isLeft() { return keys['ArrowLeft'] || keys['KeyA'] || touchState.left; }
function isRight() { return keys['ArrowRight'] || keys['KeyD'] || touchState.right; }
function isJump() { return keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || touchState.jump; }

// ================== PLAYER ==================
let player = {};

function resetPlayer() {
    player = {
        x: 3 * TILE,
        y: 10 * TILE,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        vx: 0,
        vy: 0,
        onGround: false,
        facing: 1, // 1 right, -1 left
        frame: 0,
        animTimer: 0,
        state: 'idle', // idle, run, jump, fall
        invincible: 0,
        squash: 1,
        stretch: 1,
        wasOnGround: false
    };
}

// ================== CAMERA ==================
let camera = { x: 0, y: 0 };
let currentLevelWidth = 200;

function updateCamera() {
    const targetX = player.x - canvas.width * 0.35;
    const maxCamX = currentLevelWidth * TILE - canvas.width;
    camera.x += (targetX - camera.x) * 0.08;
    camera.x = Math.max(0, Math.min(camera.x, maxCamX));
    camera.y = 0;
}

// ================== LEVEL DATA ==================
let platforms = [];
let collectibles = [];
let enemies = [];
let spikes = [];
let flagPost = null;
let decorations = [];
let clouds = [];

// Level theme colors for each level
const LEVEL_THEMES = [
    { name: 'Güneşli Çayırlar', topColor: '#74b9ff', midColor: '#a0d2f7', botColor: '#dfe6e9', hill1: '#81ecec', hill2: '#55efc4' },
    { name: 'Gün Batımı Tepeleri', topColor: '#fd79a8', midColor: '#fab1a0', botColor: '#ffeaa7', hill1: '#fdcb6e', hill2: '#e17055' },
    { name: 'Mistik Orman', topColor: '#a29bfe', midColor: '#55efc4', botColor: '#81ecec', hill1: '#6c5ce7', hill2: '#00cec9' },
    { name: 'Volkanik Arazi', topColor: '#e17055', midColor: '#ff7675', botColor: '#fab1a0', hill1: '#d63031', hill2: '#e17055' },
    { name: 'Buz Krallığı', topColor: '#74b9ff', midColor: '#dfe6e9', botColor: '#ffffff', hill1: '#b2bec3', hill2: '#dfe6e9' },
    { name: 'Zehirli Bataklık', topColor: '#00b894', midColor: '#55efc4', botColor: '#fdcb6e', hill1: '#00cec9', hill2: '#00b894' },
    { name: 'Karanlık Mağara', topColor: '#2d3436', midColor: '#636e72', botColor: '#b2bec3', hill1: '#2d3436', hill2: '#636e72' },
    { name: 'Gökyüzü Kalesi', topColor: '#a29bfe', midColor: '#fd79a8', botColor: '#fdcb6e', hill1: '#6c5ce7', hill2: '#a29bfe' },
    { name: 'Labirent Fabrika', topColor: '#636e72', midColor: '#b2bec3', botColor: '#dfe6e9', hill1: '#2d3436', hill2: '#636e72' },
    { name: 'Son Savaş', topColor: '#d63031', midColor: '#e17055', botColor: '#fdcb6e', hill1: '#ff7675', hill2: '#d63031' },
];

function loadLevel(levelIndex) {
    platforms = [];
    collectibles = [];
    enemies = [];
    spikes = [];
    decorations = [];
    clouds = [];

    const config = getLevelConfig(levelIndex);
    currentLevelWidth = config.width;

    const groundY = 12;
    const lvl = levelIndex;

    // === GENERATE GROUND SEGMENTS ===
    // More gaps as level increases
    let groundSegments = [];
    let x = 0;
    const gapChance = 0.08 + lvl * 0.025; // 10.5% at lvl1, 33% at lvl10
    const minSegLen = Math.max(5, 18 - lvl);
    const maxSegLen = Math.max(10, 32 - lvl * 2);
    const gapLen = Math.min(2 + Math.floor(lvl / 2), 7);

    while (x < currentLevelWidth - 10) {
        const segLen = minSegLen + Math.floor(Math.random() * (maxSegLen - minSegLen));
        const end = Math.min(x + segLen, currentLevelWidth - 5);
        groundSegments.push([x, end]);
        x = end + 1;

        // Add gap
        if (Math.random() < gapChance && x < currentLevelWidth - 20) {
            x += gapLen + Math.floor(Math.random() * 3);
        }
    }

    // Ensure a solid landing at start
    if (groundSegments[0][0] > 0) groundSegments[0][0] = 0;
    if (groundSegments[0][1] < 10) groundSegments[0][1] = 10;

    // === BUILD GROUND ===
    groundSegments.forEach(([start, end]) => {
        for (let gx = start; gx <= end; gx++) {
            platforms.push({ x: gx * TILE, y: groundY * TILE, w: TILE, h: TILE, type: 'grass' });
            for (let dy = 1; dy <= 3; dy++) {
                platforms.push({ x: gx * TILE, y: (groundY + dy) * TILE, w: TILE, h: TILE, type: 'dirt' });
            }
        }
    });

    // === FLOATING PLATFORMS ===
    const platformCount = 15 + lvl * 4;
    const floatingPlatforms = [];
    for (let i = 0; i < platformCount; i++) {
        const px = 7 + Math.floor(Math.random() * (currentLevelWidth - 15));
        const py = 4 + Math.floor(Math.random() * 6); // y: 4-9
        const pLen = Math.max(1, Math.floor(4 - lvl * 0.25 + Math.random() * 2));
        floatingPlatforms.push({ x: px, y: py, len: pLen });
    }

    floatingPlatforms.forEach(p => {
        for (let i = 0; i < p.len; i++) {
            platforms.push({
                x: (p.x + i) * TILE,
                y: p.y * TILE,
                w: TILE,
                h: TILE,
                type: 'brick'
            });
        }
    });

    // === SPIKES === (placed before collectibles so star placement can avoid them)
    const spikeCount = 4 + lvl * 2;
    for (let i = 0; i < spikeCount; i++) {
        const segIdx = Math.floor(Math.random() * groundSegments.length);
        const seg = groundSegments[segIdx];
        const spikeX = seg[1] - 1 - Math.floor(Math.random() * 3);
        if (spikeX > seg[0] + 3) {
            spikes.push({
                x: spikeX * TILE,
                y: (groundY - 1) * TILE + 10,
                w: TILE,
                h: TILE - 10
            });
        }
    }

    // Additional spike clusters for higher levels
    if (lvl >= 5) {
        const clusterCount = Math.floor((lvl - 4) * 1.5);
        for (let i = 0; i < clusterCount; i++) {
            const segIdx = Math.floor(Math.random() * groundSegments.length);
            const seg = groundSegments[segIdx];
            const baseX = seg[0] + 5 + Math.floor(Math.random() * Math.max(1, seg[1] - seg[0] - 10));
            for (let j = 0; j < 2 + Math.floor(Math.random() * 2); j++) {
                spikes.push({
                    x: (baseX + j) * TILE,
                    y: (groundY - 1) * TILE + 10,
                    w: TILE,
                    h: TILE - 10
                });
            }
        }
    }

    // === COLLECTIBLES (Stars & Crystals) ===
    // Build occupancy grid to avoid placing stars inside platforms
    const occupied = new Set();
    platforms.forEach(p => {
        const tx = Math.floor(p.x / TILE);
        const ty = Math.floor(p.y / TILE);
        occupied.add(`${tx},${ty}`);
    });

    function isTileOccupied(tx, ty) {
        return occupied.has(`${tx},${ty}`);
    }

    function isValidStarPosition(tx, ty) {
        // Star must not be inside any platform tile or directly adjacent below one
        if (isTileOccupied(tx, ty)) return false;
        // Also check the star doesn't overlap with spike positions
        for (const s of spikes) {
            const stx = Math.floor(s.x / TILE);
            const sty = Math.floor(s.y / TILE);
            if (tx === stx && ty === sty) return false;
        }
        return true;
    }

    // First, place stars above floating platforms (guaranteed good positions)
    floatingPlatforms.forEach((p, idx) => {
        if (idx % 3 === 0) {
            const starTx = p.x + Math.floor(p.len / 2);
            const starTy = p.y - 1;
            // Only place if the position above the platform is clear
            if (starTy >= 1 && !isTileOccupied(starTx, starTy)) {
                collectibles.push({
                    x: starTx * TILE + TILE / 2,
                    y: starTy * TILE + TILE / 2,
                    radius: 12,
                    collected: false,
                    type: idx % 6 === 0 ? 'crystal' : 'star',
                    bobOffset: Math.random() * Math.PI * 2,
                    sparkle: 0
                });
            }
        }
    });

    // Then place remaining stars in valid open positions
    const starCount = 15 + lvl * 3;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = starCount * 15; // prevent infinite loop

    while (placed < starCount && attempts < maxAttempts) {
        attempts++;
        const sx = 5 + Math.floor(Math.random() * (currentLevelWidth - 12));
        const sy = 2 + Math.floor(Math.random() * 9); // y: 2-10

        if (!isValidStarPosition(sx, sy)) continue;

        // Check it's not too close to existing collectibles (min 2 tiles apart)
        const tooClose = collectibles.some(c => {
            const cdx = Math.abs(c.x - (sx * TILE + TILE / 2));
            const cdy = Math.abs(c.y - (sy * TILE + TILE / 2));
            return cdx < TILE * 1.5 && cdy < TILE * 1.5;
        });
        if (tooClose) continue;

        collectibles.push({
            x: sx * TILE + TILE / 2,
            y: sy * TILE + TILE / 2,
            radius: 12,
            collected: false,
            type: placed % 5 === 0 ? 'crystal' : 'star',
            bobOffset: Math.random() * Math.PI * 2,
            sparkle: 0
        });
        placed++;
    }

    // === ENEMIES ===
    const enemyCount = 5 + lvl * 2;
    let enemiesPlaced = 0;
    let enemyAttempts = 0;
    while (enemiesPlaced < enemyCount && enemyAttempts < enemyCount * 10) {
        enemyAttempts++;
        const ex = 12 + Math.floor(Math.random() * (currentLevelWidth - 20));
        // Only place enemy if there's ground under it
        if (!isTileOccupied(ex, groundY)) continue;
        // Don't place on spikes
        const onSpike = spikes.some(s => Math.floor(s.x / TILE) === ex);
        if (onSpike) continue;

        const patrolRange = Math.max(3, 8 - Math.floor(lvl / 3));
        enemies.push({
            x: ex * TILE,
            y: groundY * TILE - TILE,
            width: 28,
            height: 28,
            vx: config.enemySpeed * (Math.random() > 0.5 ? 1 : -1),
            minX: (ex - patrolRange) * TILE,
            maxX: (ex + patrolRange) * TILE,
            alive: true,
            frame: 0,
            animTimer: 0,
            squash: 0
        });
        enemiesPlaced++;
    }

    // Platform enemies (starting from level 3)
    if (lvl >= 3) {
        const platEnemyCount = Math.floor(lvl / 2);
        for (let i = 0; i < platEnemyCount && i < floatingPlatforms.length; i++) {
            const fp = floatingPlatforms[i * 3 % floatingPlatforms.length];
            if (fp.len >= 2) {
                enemies.push({
                    x: fp.x * TILE,
                    y: (fp.y - 1) * TILE,
                    width: 28,
                    height: 28,
                    vx: config.enemySpeed * 0.8,
                    minX: fp.x * TILE,
                    maxX: (fp.x + fp.len - 1) * TILE,
                    alive: true,
                    frame: 0,
                    animTimer: 0,
                    squash: 0
                });
            }
        }
    }



    // === FLAG (End Goal) ===
    flagPost = {
        x: (currentLevelWidth - 10) * TILE,
        y: (groundY - 5) * TILE,
        height: 5 * TILE,
        reached: false
    };

    // Make sure there's ground under the flag
    for (let fx = currentLevelWidth - 12; fx <= currentLevelWidth - 5; fx++) {
        // Check if ground exists
        const hasGround = platforms.some(p => p.x === fx * TILE && p.y === groundY * TILE);
        if (!hasGround) {
            platforms.push({ x: fx * TILE, y: groundY * TILE, w: TILE, h: TILE, type: 'grass' });
            for (let dy = 1; dy <= 3; dy++) {
                platforms.push({ x: fx * TILE, y: (groundY + dy) * TILE, w: TILE, h: TILE, type: 'dirt' });
            }
        }
    }

    // === DECORATIONS: Trees ===
    const treeCount = Math.floor(currentLevelWidth / 14);
    for (let i = 0; i < treeCount; i++) {
        const tx = Math.floor(Math.random() * currentLevelWidth);
        decorations.push({ type: 'tree', x: tx * TILE, y: groundY * TILE });
    }

    // === DECORATIONS: Flowers ===
    const flowerCount = 20 + lvl * 3;
    for (let i = 0; i < flowerCount; i++) {
        const fx = Math.random() * currentLevelWidth * TILE;
        decorations.push({
            type: 'flower',
            x: fx,
            y: groundY * TILE,
            color: ['#ff6b6b', '#fd79a8', '#fdcb6e', '#a29bfe', '#55efc4'][Math.floor(Math.random() * 5)]
        });
    }

    // === CLOUDS ===
    const cloudCount = 15 + Math.floor(currentLevelWidth / 15);
    for (let i = 0; i < cloudCount; i++) {
        clouds.push({
            x: Math.random() * currentLevelWidth * TILE,
            y: 30 + Math.random() * 150,
            w: 60 + Math.random() * 80,
            speed: 0.15 + Math.random() * 0.3,
            opacity: 0.4 + Math.random() * 0.3
        });
    }
}

// ================== PARTICLES ==================
let particles = [];

function spawnParticles(x, y, count, color, speedMult = 1) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5 * speedMult,
            vy: (Math.random() - 1) * 4 * speedMult,
            life: 30 + Math.random() * 30,
            maxLife: 60,
            size: 3 + Math.random() * 4,
            color: color,
            gravity: 0.08
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life--;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// ================== PHYSICS & COLLISIONS ==================
function applyPhysics() {
    // Horizontal movement
    if (isLeft()) {
        player.vx -= PLAYER_SPEED * 0.3;
        player.facing = -1;
    }
    if (isRight()) {
        player.vx += PLAYER_SPEED * 0.3;
        player.facing = 1;
    }

    // Apply friction
    if (player.onGround) {
        player.vx *= FRICTION;
    } else {
        player.vx *= AIR_CONTROL;
    }

    // Clamp horizontal speed
    player.vx = Math.max(-PLAYER_SPEED, Math.min(PLAYER_SPEED, player.vx));

    // Jump
    if (isJump() && player.onGround) {
        player.vy = PLAYER_JUMP;
        player.onGround = false;
        player.squash = 0.7;
        player.stretch = 1.3;
    }

    // Gravity
    player.vy += GRAVITY;
    if (player.vy > TERMINAL_VELOCITY) player.vy = TERMINAL_VELOCITY;

    // Track previous ground state
    player.wasOnGround = player.onGround;

    // Move & Collide X
    player.x += player.vx;
    player.onGround = false;
    resolveCollisionX();

    // Move & Collide Y
    player.y += player.vy;
    resolveCollisionY();

    // Landing squash
    if (player.onGround && !player.wasOnGround && player.vy >= 0) {
        player.squash = 1.25;
        player.stretch = 0.8;
    }

    // Squash/stretch recovery
    player.squash += (1 - player.squash) * 0.15;
    player.stretch += (1 - player.stretch) * 0.15;

    // Invincibility timer
    if (player.invincible > 0) player.invincible--;

    // Fall out of world
    if (player.y > (LEVEL_HEIGHT + 3) * TILE) {
        playerDie();
    }

    // Level bounds
    if (player.x < 0) { player.x = 0; player.vx = 0; }

    // Update player state
    if (!player.onGround) {
        player.state = player.vy < 0 ? 'jump' : 'fall';
    } else if (Math.abs(player.vx) > 0.5) {
        player.state = 'run';
    } else {
        player.state = 'idle';
    }

    // Animation timer
    player.animTimer++;
    if (player.animTimer > 8) {
        player.animTimer = 0;
        player.frame = (player.frame + 1) % 4;
    }
}

function resolveCollisionX() {
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    for (const plat of platforms) {
        if (px < plat.x + plat.w &&
            px + pw > plat.x &&
            py < plat.y + plat.h &&
            py + ph > plat.y) {

            if (player.vx > 0) {
                player.x = plat.x - pw;
            } else if (player.vx < 0) {
                player.x = plat.x + plat.w;
            }
            player.vx = 0;
        }
    }
}

function resolveCollisionY() {
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    for (const plat of platforms) {
        if (px < plat.x + plat.w &&
            px + pw > plat.x &&
            py < plat.y + plat.h &&
            py + ph > plat.y) {

            if (player.vy > 0) {
                // Landing on top
                player.y = plat.y - ph;
                player.vy = 0;
                player.onGround = true;
            } else if (player.vy < 0) {
                // Hitting bottom
                player.y = plat.y + plat.h;
                player.vy = 0;
            }
        }
    }
}

// ================== COLLECTIBLES ==================
function collectItems() {
    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;

    collectibles.forEach(c => {
        if (c.collected) return;
        const dx = pcx - c.x;
        const dy = pcy - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < c.radius + 16) {
            c.collected = true;
            coinsCollected++;

            if (c.type === 'crystal') {
                score += 200;
                spawnParticles(c.x, c.y, 12, '#a29bfe', 1.3);
            } else {
                score += 100;
                spawnParticles(c.x, c.y, 8, '#fdcb6e');
            }
        }
    });
}

// ================== ENEMIES ==================
function updateEnemies() {
    enemies.forEach(e => {
        if (!e.alive) {
            // Death animation
            e.squash -= 0.05;
            return;
        }

        // Move
        e.x += e.vx;
        if (e.x <= e.minX || e.x + e.width >= e.maxX + TILE) {
            e.vx *= -1;
        }

        // Animation
        e.animTimer++;
        if (e.animTimer > 12) {
            e.animTimer = 0;
            e.frame = (e.frame + 1) % 2;
        }
    });
}

function checkEnemyInteractions() {
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    enemies.forEach(e => {
        if (!e.alive) return;

        // AABB check
        if (px < e.x + e.width &&
            px + pw > e.x &&
            py < e.y + e.height &&
            py + ph > e.y) {

            // Check if player is stomping (coming from above)
            if (player.vy > 0 && py + ph - e.y < 15) {
                // Stomp!
                e.alive = false;
                e.squash = 1;
                player.vy = PLAYER_JUMP * 0.6;
                score += 200;
                spawnParticles(e.x + e.width / 2, e.y, 10, '#ff6b6b');
                shakeTimer = 8;
                shakeIntensity = 3;
            } else if (player.invincible <= 0) {
                // Player takes damage
                playerHit();
            }
        }
    });
}

// ================== SPIKES ==================
function checkSpikes() {
    if (player.invincible > 0) return;

    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    spikes.forEach(s => {
        if (px < s.x + s.w &&
            px + pw > s.x &&
            py < s.y + s.h &&
            py + ph > s.y) {
            playerHit();
        }
    });
}

// ================== FLAG / LEVEL END ==================
function checkFlag() {
    if (!flagPost || flagPost.reached) return;

    const px = player.x + player.width / 2;
    if (px >= flagPost.x && px <= flagPost.x + TILE * 2) {
        flagPost.reached = true;
        completeLevel();
    }
}

// ================== PLAYER DAMAGE & DEATH ==================
function playerHit() {
    lives--;
    player.invincible = INVINCIBILITY_DURATION;
    player.vy = -8;
    player.vx = -player.facing * 3;
    shakeTimer = 12;
    shakeIntensity = 5;
    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 15, '#ff6b6b', 1.5);

    if (lives <= 0) {
        endGame();
    }

    updateHUD();
}

function playerDie() {
    lives--;
    spawnParticles(player.x + player.width / 2, player.y, 20, '#ff6b6b', 2);

    if (lives <= 0) {
        endGame();
        return;
    }

    // Respawn at same level start
    player.x = 3 * TILE;
    player.y = 10 * TILE;
    player.vx = 0;
    player.vy = 0;
    player.invincible = INVINCIBILITY_DURATION;
    camera.x = 0;

    updateHUD();
}

// ================== GAME STATE MANAGEMENT ==================
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('character-select-screen').classList.remove('hidden');
    renderCharacterPreviews();
}

function renderCharacterPreviews() {
    const chars = ['zippy', 'ruby', 'sparky'];
    const fakePlayer = { vx: 0, state: 'idle', animTimer: 0, frame: 0 };
    const w = PLAYER_WIDTH + 4; // slight bump for aesthetics
    const h = PLAYER_HEIGHT + 4;
    const halfW = w / 2;
    const halfH = h / 2;

    chars.forEach(char => {
        const c = document.getElementById(`preview-${char}`);
        if (!c) return;
        const pCtx = c.getContext('2d');
        pCtx.clearRect(0, 0, c.width, c.height);
        
        pCtx.save();
        pCtx.translate(c.width / 2, c.height / 2 + 5); 
        
        if (char === 'zippy') drawZippy(pCtx, fakePlayer, halfW, halfH, w, h);
        if (char === 'ruby') drawRuby(pCtx, fakePlayer, halfW, halfH, w, h);
        if (char === 'sparky') drawSparky(pCtx, fakePlayer, halfW, halfH, w, h);
        
        pCtx.restore();
    });
}

function selectCharacter(charName) {
    currentCharacter = charName;
    if (charName === 'zippy') {
        PLAYER_SPEED = 4.5;
        PLAYER_JUMP = -13.5;
    } else if (charName === 'ruby') {
        PLAYER_SPEED = 5.3; // faster
        PLAYER_JUMP = -13.2; // slightly lower jump
    } else if (charName === 'sparky') {
        PLAYER_SPEED = 4.0; // slightly slower
        PLAYER_JUMP = -14.8; // higher jump
    }
    
    document.getElementById('character-select-screen').classList.add('hidden');
    showLevelSelect();
}

function playLevel(level) {
    if (!isLevelUnlocked(level)) return;

    currentLevel = level;
    const config = getLevelConfig(level);

    gameState = 'playing';
    score = 0;
    lives = config.lives;
    coinsCollected = 0;
    particles = [];
    shakeTimer = 0;

    resetPlayer();
    loadLevel(currentLevel);
    camera.x = 0;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('level-select-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('complete-screen').classList.add('hidden');
    document.getElementById('hud').classList.add('visible');

    // Reset timing state so the fixed-timestep loop starts clean
    lastTime = 0;
    accumulator = 0;

    updateHUD();
    requestAnimationFrame(gameLoop);
}

function showLevelSelect() {
    gameState = 'levelselect';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('complete-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('visible');
    document.getElementById('level-select-screen').classList.remove('hidden');

    renderLevelButtons();
}

function renderLevelButtons() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';

    for (let i = 1; i <= MAX_LEVELS; i++) {
        const unlocked = isLevelUnlocked(i);
        const btn = document.createElement('button');
        btn.className = `level-btn ${unlocked ? 'unlocked' : 'locked'}`;
        btn.id = `level-btn-${i}`;

        if (unlocked) {
            btn.innerHTML = `
                <span class="level-number">${i}</span>
                <span class="level-name">${LEVEL_THEMES[i - 1].name}</span>
                <span class="level-status">✅ Açık</span>
            `;
            btn.addEventListener('click', () => playLevel(i));
        } else {
            btn.innerHTML = `
                <span class="level-number">🔒</span>
                <span class="level-name">${LEVEL_THEMES[i - 1].name}</span>
                <span class="level-status">Kilitli</span>
            `;
            btn.disabled = true;
        }

        grid.appendChild(btn);
    }
}

function endGame() {
    gameState = 'gameover';
    saveHighScore();

    document.getElementById('gameover-score').textContent = score;
    document.getElementById('gameover-coins').textContent = coinsCollected;
    document.getElementById('gameover-highscore').textContent = highScore;
    document.getElementById('gameover-level-info').textContent = `Bölüm ${currentLevel} — ${LEVEL_THEMES[currentLevel - 1].name}`;
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('hud').classList.remove('visible');
}

function completeLevel() {
    gameState = 'complete';
    saveHighScore();

    // Unlock the next level in session
    if (currentLevel < MAX_LEVELS) {
        unlockLevel(currentLevel + 1);
    }

    // Celebration particles
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const colors = ['#fdcb6e', '#ff6b6b', '#55efc4', '#a29bfe', '#fd79a8'];
            spawnParticles(
                player.x + Math.random() * 200 - 100,
                player.y - Math.random() * 100,
                5,
                colors[Math.floor(Math.random() * colors.length)],
                2
            );
        }, i * 40);
    }

    setTimeout(() => {
        document.getElementById('complete-score').textContent = score;
        document.getElementById('complete-coins').textContent = coinsCollected;
        document.getElementById('complete-highscore').textContent = highScore;

        let subtitleText = `Bölüm ${currentLevel} — ${LEVEL_THEMES[currentLevel - 1].name} Tamamlandı!`;
        const nextButton = document.getElementById('btn-next-level');

        if (currentLevel >= MAX_LEVELS) {
            subtitleText = "🏆 Tebrikler! Tüm 10 bölümü tamamladınız!";
            nextButton.style.display = 'none';
        } else {
            nextButton.style.display = 'inline-block';
        }

        document.getElementById('complete-subtitle').textContent = subtitleText;
        document.getElementById('complete-screen').classList.remove('hidden');
        document.getElementById('hud').classList.remove('visible');
    }, 1500);
}

function nextLevel() {
    if (currentLevel < MAX_LEVELS) {
        playLevel(currentLevel + 1);
    }
}

function retryLevel() {
    playLevel(currentLevel);
}

function restartGame() {
    showLevelSelect();
}

function goToLevelSelect() {
    showLevelSelect();
}

// Make these functions globally accessible
window.startGame = startGame;
window.selectCharacter = selectCharacter;
window.restartGame = restartGame;
window.nextLevel = nextLevel;
window.retryLevel = retryLevel;
window.goToLevelSelect = goToLevelSelect;
window.playLevel = playLevel;

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('zippy_highscore', highScore);
    }
}

function updateHUD() {
    document.getElementById('level-display').textContent = `Bölüm ${currentLevel}`;
    document.getElementById('score-display').textContent = score;
    document.getElementById('lives-display').textContent = lives;
    document.getElementById('coins-display').textContent = coinsCollected;
    document.getElementById('highscore-display').textContent = highScore;
}

// ================== DRAWING ==================

// --- Sky & Background ---
function drawBackground() {
    const theme = LEVEL_THEMES[(currentLevel - 1) % LEVEL_THEMES.length];

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, theme.topColor);
    skyGrad.addColorStop(0.5, theme.midColor);
    skyGrad.addColorStop(1, theme.botColor);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawHills(0.2, theme.hill1, 0.4, canvas.height * 0.55, 200, 80);
    drawHills(0.4, theme.hill2, 0.5, canvas.height * 0.65, 160, 60);
}

function drawHills(parallax, color, opacity, baseY, period, amplitude) {
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    const offset = camera.x * parallax;
    for (let x = 0; x <= canvas.width; x += 4) {
        const worldX = x + offset;
        const y = baseY + Math.sin(worldX / period) * amplitude + Math.sin(worldX / 80) * 20;
        ctx.lineTo(x, y);
    }

    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
}

// --- Clouds ---
function drawClouds() {
    clouds.forEach(c => {
        // Move clouds slowly
        c.x += c.speed;
        if (c.x > currentLevelWidth * TILE + 200) c.x = -c.w - 50;

        const sx = c.x - camera.x * 0.3;
        if (sx < -c.w - 20 || sx > canvas.width + 20) return;

        ctx.globalAlpha = c.opacity;
        ctx.fillStyle = '#ffffff';

        // 3-circle cloud shape
        const r = c.w * 0.22;
        ctx.beginPath();
        ctx.arc(sx + c.w * 0.3, c.y, r, 0, Math.PI * 2);
        ctx.arc(sx + c.w * 0.5, c.y - r * 0.5, r * 1.3, 0, Math.PI * 2);
        ctx.arc(sx + c.w * 0.7, c.y, r * 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    });
}

// --- Decorations ---
function drawDecorations() {
    decorations.forEach(d => {
        const sx = d.x - camera.x;
        if (sx < -80 || sx > canvas.width + 80) return;

        if (d.type === 'tree') {
            drawTree(sx, d.y);
        } else if (d.type === 'flower') {
            drawFlower(sx, d.y, d.color);
        }
    });
}

function drawTree(x, groundY) {
    // Trunk
    ctx.fillStyle = '#b48a6e';
    ctx.fillRect(x + 14, groundY - 55, 12, 55);

    // Leaves (layered circles)
    ctx.fillStyle = '#00b894';
    ctx.beginPath();
    ctx.arc(x + 20, groundY - 60, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00cec9';
    ctx.beginPath();
    ctx.arc(x + 14, groundY - 50, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#55efc4';
    ctx.beginPath();
    ctx.arc(x + 28, groundY - 52, 14, 0, Math.PI * 2);
    ctx.fill();
}

function drawFlower(x, groundY, color) {
    // Stem
    ctx.strokeStyle = '#00b894';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, groundY - 12);
    ctx.stroke();

    // Petals
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, groundY - 14, 4, 0, Math.PI * 2);
    ctx.fill();

    // Center
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(x, groundY - 14, 2, 0, Math.PI * 2);
    ctx.fill();
}

// --- Platforms ---
function drawPlatforms() {
    platforms.forEach(p => {
        const sx = p.x - camera.x;
        if (sx < -TILE || sx > canvas.width + TILE) return;

        if (p.type === 'grass') {
            // Grass top
            ctx.fillStyle = '#00b894';
            ctx.fillRect(sx, p.y, p.w, p.h);

            // Grass highlights
            ctx.fillStyle = '#55efc4';
            ctx.fillRect(sx, p.y, p.w, 6);

            // Grass blades
            ctx.fillStyle = '#00cec9';
            for (let gx = 0; gx < p.w; gx += 8) {
                ctx.fillRect(sx + gx, p.y - 3, 3, 5);
            }

            // Grid lines for block look
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 0.5, p.y + 0.5, p.w - 1, p.h - 1);

        } else if (p.type === 'dirt') {
            ctx.fillStyle = '#b48a6e';
            ctx.fillRect(sx, p.y, p.w, p.h);

            // Dirt texture spots
            ctx.fillStyle = '#a07858';
            ctx.fillRect(sx + 5, p.y + 10, 6, 6);
            ctx.fillRect(sx + 22, p.y + 20, 8, 5);
            ctx.fillRect(sx + 12, p.y + 28, 5, 4);

            ctx.strokeStyle = 'rgba(0,0,0,0.06)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 0.5, p.y + 0.5, p.w - 1, p.h - 1);

        } else if (p.type === 'brick') {
            // Brick platform
            const grad = ctx.createLinearGradient(sx, p.y, sx, p.y + p.h);
            grad.addColorStop(0, '#e17055');
            grad.addColorStop(1, '#d35400');
            ctx.fillStyle = grad;
            ctx.fillRect(sx, p.y, p.w, p.h);

            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(sx, p.y, p.w, 4);

            // Shadow bottom
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(sx, p.y + p.h - 4, p.w, 4);

            // Brick pattern
            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
            // Horizontal split
            ctx.beginPath();
            ctx.moveTo(sx, p.y + p.h / 2);
            ctx.lineTo(sx + p.w, p.y + p.h / 2);
            ctx.stroke();
            // Vertical split
            ctx.beginPath();
            ctx.moveTo(sx + p.w / 2, p.y);
            ctx.lineTo(sx + p.w / 2, p.y + p.h / 2);
            ctx.stroke();
        }
    });
}

// --- Spikes ---
function drawSpikes() {
    spikes.forEach(s => {
        const sx = s.x - camera.x;
        if (sx < -TILE || sx > canvas.width + TILE) return;

        ctx.fillStyle = '#636e72';
        const spikeCount = 4;
        const sw = s.w / spikeCount;

        for (let i = 0; i < spikeCount; i++) {
            ctx.beginPath();
            ctx.moveTo(sx + i * sw, s.y + s.h);
            ctx.lineTo(sx + i * sw + sw / 2, s.y);
            ctx.lineTo(sx + (i + 1) * sw, s.y + s.h);
            ctx.closePath();
            ctx.fill();
        }

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (let i = 0; i < spikeCount; i++) {
            ctx.beginPath();
            ctx.moveTo(sx + i * sw + sw * 0.3, s.y + s.h * 0.5);
            ctx.lineTo(sx + i * sw + sw / 2, s.y + 2);
            ctx.lineTo(sx + i * sw + sw * 0.55, s.y + s.h * 0.5);
            ctx.closePath();
            ctx.fill();
        }
    });
}

// --- Collectibles ---
function drawCollectibles() {
    const time = Date.now() / 1000;

    collectibles.forEach(c => {
        if (c.collected) return;

        const sx = c.x - camera.x;
        if (sx < -20 || sx > canvas.width + 20) return;

        const bobY = c.y + Math.sin(time * 3 + c.bobOffset) * 4;

        if (c.type === 'star') {
            // Golden star
            drawStar(sx, bobY, 12, 5, '#fdcb6e', '#e17055');

            // Glow
            ctx.globalAlpha = 0.2 + Math.sin(time * 4 + c.bobOffset) * 0.1;
            ctx.fillStyle = '#fdcb6e';
            ctx.beginPath();
            ctx.arc(sx, bobY, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

        } else if (c.type === 'crystal') {
            // Purple crystal
            drawCrystal(sx, bobY, '#a29bfe');

            // Glow
            ctx.globalAlpha = 0.25 + Math.sin(time * 5 + c.bobOffset) * 0.15;
            ctx.fillStyle = '#a29bfe';
            ctx.beginPath();
            ctx.arc(sx, bobY, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    });
}

function drawStar(cx, cy, outerR, points, fillColor, strokeColor) {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : outerR * 0.45;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawCrystal(cx, cy, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + 8, cy - 2);
    ctx.lineTo(cx + 5, cy + 10);
    ctx.lineTo(cx - 5, cy + 10);
    ctx.lineTo(cx - 8, cy - 2);
    ctx.closePath();
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 12);
    ctx.lineTo(cx + 4, cy - 3);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx - 4, cy - 3);
    ctx.closePath();
    ctx.fill();
}

// --- Enemies ---
function drawEnemies() {
    enemies.forEach(e => {
        const sx = e.x - camera.x;
        if (sx < -40 || sx > canvas.width + 40) return;

        if (!e.alive) {
            if (e.squash <= 0) return;
            // Death squash animation
            ctx.globalAlpha = e.squash;
            ctx.save();
            ctx.translate(sx + e.width / 2, e.y + e.height);
            ctx.scale(1 + (1 - e.squash) * 0.5, e.squash);
            drawEnemyBody(0, -e.height, e);
            ctx.restore();
            ctx.globalAlpha = 1;
            return;
        }

        drawEnemyBody(sx, e.y, e);
    });
}

function drawEnemyBody(x, y, e) {
    const w = e.width;
    const h = e.height;

    // Body
    ctx.fillStyle = '#d63031';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2 + 2, w / 2, h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker bottom
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2 + 5, w / 2 - 2, h / 4, 0, 0, Math.PI);
    ctx.fill();

    // Eyes
    const eyeOffsetX = e.vx > 0 ? 3 : -3;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w / 2 - 5 + eyeOffsetX, y + h / 2 - 2, 5, 0, Math.PI * 2);
    ctx.arc(x + w / 2 + 5 + eyeOffsetX, y + h / 2 - 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(x + w / 2 - 4 + eyeOffsetX, y + h / 2 - 1, 2.5, 0, Math.PI * 2);
    ctx.arc(x + w / 2 + 6 + eyeOffsetX, y + h / 2 - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrows
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 9, y + h / 2 - 7);
    ctx.lineTo(x + w / 2 - 2, y + h / 2 - 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w / 2 + 9, y + h / 2 - 7);
    ctx.lineTo(x + w / 2 + 2, y + h / 2 - 9);
    ctx.stroke();

    // Feet animation
    const legOffset = e.frame === 0 ? 3 : -2;
    ctx.fillStyle = '#d63031';
    ctx.beginPath();
    ctx.ellipse(x + w / 2 - 6, y + h - 1 + legOffset / 2, 5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w / 2 + 6, y + h - 1 - legOffset / 2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
}

// --- Player (Characters) ---
function drawPlayer() {
    const sx = player.x - camera.x;
    const sy = player.y;

    // Invincibility flashing
    if (player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0) {
        ctx.globalAlpha = 0.4;
    }

    ctx.save();
    ctx.translate(sx + player.width / 2, sy + player.height / 2);
    ctx.scale(player.facing * player.stretch, player.squash);

    const w = player.width;
    const h = player.height;
    const halfW = w / 2;
    const halfH = h / 2;

    if (currentCharacter === 'zippy') {
        drawZippy(ctx, player, halfW, halfH, w, h);
    } else if (currentCharacter === 'ruby') {
        drawRuby(ctx, player, halfW, halfH, w, h);
    } else if (currentCharacter === 'sparky') {
        drawSparky(ctx, player, halfW, halfH, w, h);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
}

function drawZippy(ctx, player, halfW, halfH, w, h) {
    // === BODY ===
    ctx.fillStyle = '#0984e3';
    ctx.beginPath();
    ctx.roundRect(-halfW + 2, -halfH + 6, w - 4, h - 12, 6);
    ctx.fill();

    // Body highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-halfW + 4, -halfH + 8, 6, h - 18);

    // === HEAD ===
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, -halfH + 4, 11, 0, Math.PI * 2);
    ctx.fill();

    // === HAT ===
    ctx.fillStyle = '#e17055';
    ctx.beginPath();
    ctx.ellipse(0, -halfH - 3, 13, 5, 0, Math.PI, 0);
    ctx.fill();
    // Hat brim
    ctx.fillStyle = '#d35400';
    ctx.fillRect(-14, -halfH - 3, 28, 3);
    // Hat shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-6, -halfH - 8, 8, 3);

    // === EYES ===
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -halfH + 3, 4, 0, Math.PI * 2);
    ctx.arc(5, -halfH + 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (look in movement direction)
    const lookX = Math.abs(player.vx) > 0.5 ? 1.5 : 0;
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(-4 + lookX, -halfH + 4, 2, 0, Math.PI * 2);
    ctx.arc(5 + lookX, -halfH + 4, 2, 0, Math.PI * 2);
    ctx.fill();

    // === MOUTH ===
    ctx.strokeStyle = '#e17055';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (player.state === 'jump' || player.state === 'fall') {
        // Surprised 'O'
        ctx.arc(1, -halfH + 10, 2.5, 0, Math.PI * 2);
    } else {
        // Happy smile
        ctx.arc(1, -halfH + 8, 4, 0.1 * Math.PI, 0.9 * Math.PI);
    }
    ctx.stroke();

    // === LEGS ===
    ctx.fillStyle = '#2d3436';
    if (player.state === 'run') {
        const legAnim = Math.sin(player.animTimer * 0.8 + player.frame) * 5;
        ctx.fillRect(-halfW + 4, halfH - 8 + legAnim, 7, 8 - legAnim / 2);
        ctx.fillRect(halfW - 11, halfH - 8 - legAnim, 7, 8 + legAnim / 2);
    } else if (player.state === 'jump' || player.state === 'fall') {
        ctx.fillRect(-halfW + 3, halfH - 7, 7, 6);
        ctx.fillRect(halfW - 10, halfH - 7, 7, 6);
    } else {
        ctx.fillRect(-halfW + 4, halfH - 7, 7, 7);
        ctx.fillRect(halfW - 11, halfH - 7, 7, 7);
    }

    // === SHOES ===
    ctx.fillStyle = '#d35400';
    if (player.state === 'run') {
        const legAnim = Math.sin(player.animTimer * 0.8 + player.frame) * 5;
        ctx.fillRect(-halfW + 3, halfH - 2 + legAnim / 2, 9, 4);
        ctx.fillRect(halfW - 12, halfH - 2 - legAnim / 2, 9, 4);
    } else {
        ctx.fillRect(-halfW + 3, halfH - 1, 9, 4);
        ctx.fillRect(halfW - 12, halfH - 1, 9, 4);
    }
}

function drawRuby(ctx, player, halfW, halfH, w, h) {
    // === BODY ===
    ctx.fillStyle = '#d63031'; // Ruby red body
    ctx.beginPath();
    ctx.roundRect(-halfW + 2, -halfH + 6, w - 4, h - 12, 10); // rounder body
    ctx.fill();

    // Body highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-halfW + 6, -halfH + 8, 4, h - 20);

    // === HEAD ===
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, -halfH + 4, 10, 0, Math.PI * 2);
    ctx.fill();

    // === HEADBAND ===
    ctx.fillStyle = '#fd79a8';
    ctx.fillRect(-11, -halfH - 2, 22, 4);
    
    // Headband knot/tails flying back
    ctx.fillStyle = '#e84393';
    ctx.beginPath();
    if (player.state === 'run') {
        ctx.moveTo(-10, -halfH);
        ctx.lineTo(-18, -halfH - 4 + Math.sin(player.animTimer)*2);
        ctx.lineTo(-15, -halfH + 2);
    } else {
        ctx.moveTo(-10, -halfH);
        ctx.lineTo(-14, -halfH + 4);
        ctx.lineTo(-12, -halfH + 6);
    }
    ctx.fill();

    // === EYES ===
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -halfH + 4, 4, 0, Math.PI * 2);
    ctx.arc(5, -halfH + 4, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (look in movement direction)
    const lookX = Math.abs(player.vx) > 0.5 ? 1.5 : 0;
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(-4 + lookX, -halfH + 5, 2, 0, Math.PI * 2);
    ctx.arc(5 + lookX, -halfH + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // === MOUTH ===
    // Fierce/determined mouth when running
    ctx.strokeStyle = '#d63031';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (player.state === 'run') {
        ctx.moveTo(-2, -halfH + 10);
        ctx.lineTo(4, -halfH + 10);
    } else if (player.state === 'jump' || player.state === 'fall') {
        ctx.arc(1, -halfH + 10, 2, 0, Math.PI * 2);
    } else {
        ctx.arc(1, -halfH + 9, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    }
    ctx.stroke();

    // === LEGS (faster animation) ===
    ctx.fillStyle = '#2d3436';
    if (player.state === 'run') {
        const legAnim = Math.sin(player.animTimer * 1.2 + player.frame) * 6; // faster leg anim
        ctx.fillRect(-halfW + 4, halfH - 8 + legAnim, 7, 8 - legAnim / 2);
        ctx.fillRect(halfW - 11, halfH - 8 - legAnim, 7, 8 + legAnim / 2);
    } else {
        ctx.fillRect(-halfW + 4, halfH - 7, 7, 7);
        ctx.fillRect(halfW - 11, halfH - 7, 7, 7);
    }

    // === SHOES ===
    ctx.fillStyle = '#fd79a8'; // Pink sneakers
    if (player.state === 'run') {
        const legAnim = Math.sin(player.animTimer * 1.2 + player.frame) * 6;
        ctx.fillRect(-halfW + 3, halfH - 2 + legAnim / 2, 9, 5);
        ctx.fillRect(halfW - 12, halfH - 2 - legAnim / 2, 9, 5);
        // Sneaker stripe
        ctx.fillStyle = '#fff';
        ctx.fillRect(-halfW + 5, halfH - 2 + legAnim / 2, 2, 5);
        ctx.fillRect(halfW - 10, halfH - 2 - legAnim / 2, 2, 5);
    } else {
        ctx.fillRect(-halfW + 3, halfH - 1, 9, 5);
        ctx.fillRect(halfW - 12, halfH - 1, 9, 5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-halfW + 5, halfH - 1, 2, 5);
        ctx.fillRect(halfW - 10, halfH - 1, 2, 5);
    }
}

function drawSparky(ctx, player, halfW, halfH, w, h) {
    // === BODY ===
    ctx.fillStyle = '#00b894'; // Sparky green
    ctx.beginPath();
    ctx.roundRect(-halfW + 4, -halfH + 6, w - 8, h - 12, 4); // slimmer body
    ctx.fill();

    // === HEAD ===
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, -halfH + 4, 11, 0, Math.PI * 2);
    ctx.fill();

    // === GOGGLES / HELMET ===
    ctx.fillStyle = '#fdcb6e'; // Yellow/Gold helmet
    ctx.beginPath();
    ctx.arc(0, -halfH, 12, Math.PI, 0); 
    ctx.fill();
    // Goggle strap
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(-11, -halfH, 22, 3);

    // === EYES (Goggle lens) ===
    ctx.fillStyle = '#a29bfe'; // Purple tinted goggles
    ctx.beginPath();
    ctx.arc(-4, -halfH + 3, 5, 0, Math.PI * 2);
    ctx.arc(5, -halfH + 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fdcb6e';
    ctx.stroke();

    // Shine on goggles
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(-5, -halfH + 2, 1.5, 0, Math.PI * 2);
    ctx.arc(4, -halfH + 2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // === MOUTH ===
    ctx.strokeStyle = '#e17055';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (player.state === 'jump' || player.state === 'fall') {
        ctx.moveTo(-1, -halfH + 10);
        ctx.lineTo(3, -halfH + 10);
    } else {
        ctx.arc(1, -halfH + 9, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    }
    ctx.stroke();

    // === LEGS ===
    // Sparky has springy legs
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (player.state === 'run') {
        const legAnim = Math.sin(player.animTimer * 0.8 + player.frame) * 5;
        // Left leg
        ctx.moveTo(-4, halfH - 6);
        ctx.lineTo(-4, halfH - 2 + legAnim/2);
        // Right leg
        ctx.moveTo(4, halfH - 6);
        ctx.lineTo(4, halfH - 2 - legAnim/2);
    } else if (player.state === 'jump' || player.state === 'fall') {
        // Extended spring legs in air
        ctx.moveTo(-4, halfH - 6);
        ctx.lineTo(-4, halfH + 2);
        ctx.moveTo(4, halfH - 6);
        ctx.lineTo(4, halfH + 2);
    } else {
        // Squished spring legs locally
        ctx.moveTo(-4, halfH - 6);
        ctx.lineTo(-4, halfH - 2);
        ctx.moveTo(4, halfH - 6);
        ctx.lineTo(4, halfH - 2);
    }
    ctx.stroke();

    // === SHOES (Springs/Boots) ===
    ctx.fillStyle = '#b2bec3';
    if (player.state === 'run') {
        const legAnim = Math.sin(player.animTimer * 0.8 + player.frame) * 5;
        ctx.fillRect(-7, halfH - 2 + legAnim/2, 6, 4);
        ctx.fillRect(1, halfH - 2 - legAnim/2, 6, 4);
    } else if (player.state === 'jump' || player.state === 'fall') {
        ctx.fillRect(-7, halfH + 2, 6, 4);
        ctx.fillRect(1, halfH + 2, 6, 4);
    } else {
        ctx.fillRect(-7, halfH - 2, 6, 4);
        ctx.fillRect(1, halfH - 2, 6, 4);
    }
}

// --- Flag ---
function drawFlag() {
    if (!flagPost) return;

    const sx = flagPost.x - camera.x;
    const sy = flagPost.y;

    if (sx < -60 || sx > canvas.width + 60) return;

    // Pole
    ctx.fillStyle = '#dfe6e9';
    ctx.fillRect(sx + 4, sy, 6, flagPost.height);

    // Pole ball
    ctx.fillStyle = '#fdcb6e';
    ctx.beginPath();
    ctx.arc(sx + 7, sy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Flag banner
    const flagWave = Math.sin(Date.now() / 300) * 3;
    ctx.fillStyle = flagPost.reached ? '#55efc4' : '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(sx + 10, sy + 8);
    ctx.lineTo(sx + 45 + flagWave, sy + 20);
    ctx.lineTo(sx + 10, sy + 35);
    ctx.closePath();
    ctx.fill();

    // Flag star
    ctx.fillStyle = '#ffeaa7';
    drawStar(sx + 25 + flagWave / 2, sy + 21, 6, 5, '#ffeaa7', '#e17055');

    // Flag glow when reached
    if (flagPost.reached) {
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.15;
        ctx.fillStyle = '#55efc4';
        ctx.beginPath();
        ctx.arc(sx + 7, sy + flagPost.height / 3, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Base platform
    ctx.fillStyle = '#636e72';
    ctx.fillRect(sx - 6, sy + flagPost.height - 4, 26, 8);
    ctx.fillStyle = '#b2bec3';
    ctx.fillRect(sx - 6, sy + flagPost.height - 4, 26, 3);
}

// ================== SCREEN SHAKE ==================
function applyScreenShake() {
    if (shakeTimer > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity * 2;
        const dy = (Math.random() - 0.5) * shakeIntensity * 2;
        ctx.translate(dx, dy);
        shakeTimer--;
    }
}

// ================== MAIN DRAW ==================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    applyScreenShake();

    drawBackground();
    drawClouds();
    drawDecorations();
    drawPlatforms();
    drawSpikes();
    drawCollectibles();
    drawEnemies();
    drawFlag();
    drawPlayer();
    drawParticles();

    ctx.restore();
}

// ================== UPDATE ==================
function update() {
    if (gameState !== 'playing') return;

    applyPhysics();
    updateCamera();
    collectItems();
    updateEnemies();
    checkEnemyInteractions();
    checkSpikes();
    checkFlag();
    updateParticles();
    updateHUD();
}

// ================== GAME LOOP ==================
let lastTime = 0;
let accumulator = 0;
const FIXED_STEP = 1000 / 60;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    accumulator += dt;

    // Fixed timestep for physics (prevent spiral of death)
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 3) {
        update();
        accumulator -= FIXED_STEP;
        steps++;
    }

    draw();

    if (gameState === 'playing' || gameState === 'complete') {
        requestAnimationFrame(gameLoop);
    }
}

// ================== INIT ==================
function init() {
    highScore = parseInt(localStorage.getItem('zippy_highscore')) || 0;
    document.getElementById('highscore-display').textContent = highScore;

    // Pre-draw the start screen background
    loadLevel(1);
    resetPlayer();
    camera.x = 0;
    draw();
}

// RoundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
        const r = typeof radii === 'number' ? radii : (radii[0] || 0);
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
    };
}

// Start init on page load
window.addEventListener('load', init);
