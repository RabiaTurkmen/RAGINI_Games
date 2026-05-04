const GAME_CONFIG = {
    flavors: { sade: '#fce2a8', kakaolu: '#6b4423', cilekli: '#ffb6c1', fistikli: '#b8e0b0', yabanmersini: '#b9a0e8' },
    creams: { beyaz: '#ffffff', cikolata: '#4a2e16', meyveli: '#ff69b4', nane: '#a8ffcc', karamel: '#f39c12' },
    toppings: { kiraz: '🍒', cilek: '🍓', seker: '🍬', parca: '🍫', mum: '🕯️' },
    shapes: ['yuvarlak', 'kare']
};

const UNLOCKS = {
    1: { shapes: ['yuvarlak'], maxLayers: 1, flavors: ['sade', 'kakaolu'], creams: [], toppings: [] },
    2: { shapes: ['yuvarlak'], maxLayers: 2, flavors: ['sade', 'kakaolu'], creams: ['beyaz'], toppings: [] },
    3: { shapes: ['yuvarlak', 'kare'], maxLayers: 2, flavors: ['sade', 'kakaolu', 'cilekli'], creams: ['beyaz'], toppings: ['kiraz'] },
    4: { shapes: ['yuvarlak', 'kare'], maxLayers: 3, flavors: ['sade', 'kakaolu', 'cilekli'], creams: ['beyaz', 'cikolata'], toppings: ['kiraz', 'cilek'] },
    5: { shapes: ['yuvarlak', 'kare'], maxLayers: 3, flavors: ['sade', 'kakaolu', 'cilekli', 'fistikli'], creams: ['beyaz', 'cikolata', 'meyveli'], toppings: ['kiraz', 'cilek', 'seker'], memory: true },
    6: { shapes: ['yuvarlak', 'kare'], maxLayers: 4, flavors: ['sade', 'kakaolu', 'cilekli', 'fistikli', 'yabanmersini'], creams: ['beyaz', 'cikolata', 'meyveli', 'karamel'], toppings: ['kiraz', 'cilek', 'seker', 'parca'], memory: true },
    7: { shapes: ['yuvarlak', 'kare'], maxLayers: 4, flavors: ['sade', 'kakaolu', 'cilekli', 'fistikli', 'yabanmersini'], creams: ['beyaz', 'cikolata', 'meyveli', 'karamel', 'nane'], toppings: ['kiraz', 'cilek', 'seker', 'parca', 'mum'], memory: true }
};

// --- STATE ---
let score = 0;
let lives = 3;
let level = 1;
let exp = 0; // successfully completed cakes
let expToNextLevel = 3;

let patience = 100;
let timerInterval = null;
let memoryTimeout = null;

let targetCake = null;
let playerCake = { shape: 'yuvarlak', layers: [], topping: null };

// --- AUDIO (WEB AUDIO API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration, vol = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain); gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
    click: () => playTone(600, 'sine', 0.1),
    select: () => playTone(800, 'square', 0.1, 0.05),
    error: () => playTone(150, 'sawtooth', 0.2, 0.1),
    success: () => {
        playTone(523.25, 'triangle', 0.1); setTimeout(() => playTone(659.25, 'triangle', 0.1), 100);
        setTimeout(() => playTone(783.99, 'triangle', 0.2), 200); setTimeout(() => playTone(1046.50, 'triangle', 0.4), 300);
    },
    fail: () => { playTone(300, 'sawtooth', 0.3, 0.2); setTimeout(() => playTone(250, 'sawtooth', 0.4, 0.2), 200); },
    gameOver: () => { playTone(200, 'sawtooth', 0.5, 0.2); setTimeout(() => playTone(150, 'sawtooth', 0.8, 0.2), 400); },
    levelUp: () => {
        [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50].forEach((freq, idx) => {
            setTimeout(() => playTone(freq, 'square', 0.1, 0.1), idx * 80);
        });
    }
};

// --- DOM ELEMENTS ---
const elements = {
    screens: { menu: document.getElementById('screen-menu'), game: document.getElementById('screen-game'), gameover: document.getElementById('screen-gameover') },
    score: document.getElementById('score'), lives: document.getElementById('lives'),
    levelDisplay: document.getElementById('level-display'), patienceFill: document.getElementById('patience-fill'),
    finalLevel: document.getElementById('final-level'), finalScore: document.getElementById('final-score'),
    targetContainer: document.getElementById('target-cake-container'), playerContainer: document.getElementById('player-cake-container'),
    memoryOverlay: document.getElementById('memory-overlay'),
    overlay: document.getElementById('feedback-overlay'), overlayText: document.getElementById('feedback-text'), overlayEmoji: document.getElementById('feedback-emoji'), overlaySub: document.getElementById('feedback-subtext')
};

// --- CORE FUNCTIONS ---
function showScreen(name) {
    Object.values(elements.screens).forEach(s => { s.classList.add('hidden'); s.classList.remove('active'); });
    elements.screens[name].classList.remove('hidden');
    setTimeout(() => elements.screens[name].classList.add('active'), 50);
}

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getActiveCaps() { return UNLOCKS[Math.min(level, 7)]; }

function updateHUD() {
    elements.score.innerText = score;
    elements.lives.innerText = lives;
    elements.levelDisplay.innerText = level;

    // Cycle through 5 themes infinitely based on level
    document.body.className = 'theme-' + (((level - 1) % 5) + 1);

    // Update unlocked buttons
    const caps = getActiveCaps();
    document.querySelectorAll('.btn-item').forEach(btn => btn.classList.add('locked'));

    caps.shapes.forEach(v => document.querySelector(`[data-category="shape"][data-val="${v}"]`)?.classList.remove('locked'));
    caps.flavors.forEach(v => document.querySelector(`[data-category="flavor"][data-val="${v}"]`)?.classList.remove('locked'));
    caps.creams.forEach(v => document.querySelector(`[data-category="cream"][data-val="${v}"]`)?.classList.remove('locked'));
    caps.toppings.forEach(v => document.querySelector(`[data-category="topping"][data-val="${v}"]`)?.classList.remove('locked'));
}

// --- GENERATION & RENDERING ---
function renderCake(container, cakeState) {
    container.innerHTML = '';
    const plate = document.createElement('div'); plate.className = 'cake-plate'; container.appendChild(plate);
    let currentZ = 20;

    cakeState.layers.forEach((layerData, idx) => {
        const layer = document.createElement('div');
        layer.className = `cake-layer shape-${cakeState.shape}`;
        layer.style.setProperty('--f-color', GAME_CONFIG.flavors[layerData.flavor]);
        layer.style.zIndex = currentZ--;

        if (layerData.cream) {
            const cream = document.createElement('div');
            cream.className = `cake-cream`;
            cream.style.setProperty('--c-color', GAME_CONFIG.creams[layerData.cream]);
            layer.appendChild(cream);
        }

        // Topping ONLY if it's the top player AND a topping exists
        if (idx === cakeState.layers.length - 1 && cakeState.topping) {
            const top = document.createElement('div');
            top.className = 'cake-topping';
            top.innerText = GAME_CONFIG.toppings[cakeState.topping];
            layer.appendChild(top);
        }
        container.appendChild(layer);
    });
}

function generateTargetCake() {
    const caps = getActiveCaps();
    const target = {
        shape: getRandom(caps.shapes),
        layers: [],
        topping: null
    };

    const numLayers = 1 + Math.floor(Math.random() * caps.maxLayers);
    for (let i = 0; i < numLayers; i++) {
        let lCream = null;
        if (caps.creams.length > 0 && Math.random() > 0.4) {
            lCream = getRandom(caps.creams);
        }
        target.layers.push({ flavor: getRandom(caps.flavors), cream: lCream });
    }

    if (caps.toppings.length > 0 && Math.random() > 0.5) {
        target.topping = getRandom(caps.toppings);
    }

    targetCake = target;
    renderCake(elements.targetContainer, targetCake);

    // Memory Mode
    elements.memoryOverlay.classList.add('hidden');
    clearTimeout(memoryTimeout);
    if (caps.memory) {
        memoryTimeout = setTimeout(() => {
            elements.memoryOverlay.classList.remove('hidden');
            sounds.error(); // alert sound
        }, 5000); // 5 seconds to memorize!
    }
}

// --- TIMERS ---
let patienceDepletionRate = 1.0;

function startTimer() {
    clearInterval(timerInterval);
    patience = 100;
    elements.patienceFill.style.width = '100%';
    elements.patienceFill.style.backgroundColor = 'var(--success)';

    // Calculate required time dynamically based on cake complexity
    let targetTimeSec = 5; // Base buffer time
    if (targetCake) {
        targetCake.layers.forEach(l => {
            targetTimeSec += 2.5; // time to add flavor
            if (l.cream) targetTimeSec += 1.5; // time to add cream
        });
        if (targetCake.topping) targetTimeSec += 2;
    }

    // Add extra time to read in memory mode
    if (getActiveCaps().memory) targetTimeSec += 5;

    // Ensure timer is never too short for fun gameplay. Minimum 10 seconds.
    targetTimeSec = Math.max(10, targetTimeSec);

    // Calculate how much 100% decreases per tick (every 200ms, which is 5 ticks a sec)
    patienceDepletionRate = 100 / (targetTimeSec * 5);

    timerInterval = setInterval(() => {
        patience -= patienceDepletionRate;

        elements.patienceFill.style.width = Math.max(0, patience) + '%';
        if (patience < 50) elements.patienceFill.style.backgroundColor = '#f1c40f'; // yellow
        if (patience < 20) elements.patienceFill.style.backgroundColor = 'var(--danger)'; // red

        if (patience <= 0) {
            clearInterval(timerInterval);
            handleResult(false, 'Zaman Doldu!');
        }
    }, 200); // UI updates 5x sec
}

// --- PLAYER CONTROLS ---
function addToPlayerAction(cat, val) {
    if (playerCake.topping) {
        sounds.error(); return; // Can't add anything after topping is placed
    }

    const caps = getActiveCaps();
    if (cat === 'shape') {
        if (playerCake.layers.length > 0) { sounds.error(); return; } // Can't change shape after layers added
        playerCake.shape = val;
    }
    else if (cat === 'flavor') {
        if (playerCake.layers.length >= caps.maxLayers) { sounds.error(); return; }
        playerCake.layers.push({ flavor: val, cream: null });
    }
    else if (cat === 'cream') {
        if (playerCake.layers.length === 0) { sounds.error(); return; }
        playerCake.layers[playerCake.layers.length - 1].cream = val;
    }
    else if (cat === 'topping') {
        if (playerCake.layers.length === 0) { sounds.error(); return; }
        playerCake.topping = val;
    }
    sounds.select();
    renderCake(elements.playerContainer, playerCake);
}

document.querySelectorAll('.btn-item').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) return;
        addToPlayerAction(btn.getAttribute('data-category'), btn.getAttribute('data-val'));
    });
});

document.getElementById('btn-undo').addEventListener('click', () => {
    if (playerCake.topping) { playerCake.topping = null; }
    else if (playerCake.layers.length > 0) {
        const topLayer = playerCake.layers[playerCake.layers.length - 1];
        if (topLayer.cream) topLayer.cream = null;
        else playerCake.layers.pop();
    }
    sounds.click();
    renderCake(elements.playerContainer, playerCake);
});

// --- MATCHING LOGIC ---
document.getElementById('btn-submit').addEventListener('click', () => {
    // Exact structural matching
    let isMatch = true;
    if (playerCake.shape !== targetCake.shape) isMatch = false;
    if (playerCake.topping !== targetCake.topping) isMatch = false;
    if (playerCake.layers.length !== targetCake.layers.length) isMatch = false;
    else {
        for (let i = 0; i < targetCake.layers.length; i++) {
            if (playerCake.layers[i].flavor !== targetCake.layers[i].flavor ||
                playerCake.layers[i].cream !== targetCake.layers[i].cream) {
                isMatch = false;
                break;
            }
        }
    }
    handleResult(isMatch);
});

// --- GAME FLOW ---
function handleResult(isMatch, forceText = null) {
    clearInterval(timerInterval);
    elements.overlay.classList.remove('hidden');
    elements.overlaySub.innerText = '';

    if (isMatch) {
        elements.overlayEmoji.innerText = '🤩';
        elements.overlayText.innerText = forceText || 'Mükemmel!';
        elements.overlayText.style.color = 'var(--success-dark)';
        score += (100 * level) + Math.floor(patience * 2); // Time bonus
        exp++;
        sounds.success();
    } else {
        elements.overlayEmoji.innerText = '🤢';
        elements.overlayText.innerText = forceText || 'Yanlış Sipariş!';
        elements.overlayText.style.color = 'var(--danger-dark)';
        lives -= 1;
        sounds.fail();
    }

    updateHUD();

    let isLevelUp = false;
    if (isMatch && exp >= expToNextLevel) {
        isLevelUp = true;
        level++;
        exp = 0;
        expToNextLevel += 1; // Slower scaling for faster level ups
    }

    setTimeout(() => {
        if (isLevelUp) {
            elements.overlayEmoji.innerText = '⭐';
            elements.overlayText.innerText = 'Seviye ' + level + '!';
            elements.overlaySub.innerText = 'Yeni Malzemeler Açıldı';
            elements.overlayText.style.color = 'var(--primary)';
            sounds.levelUp();
            updateHUD();

            setTimeout(() => nextRound(), 1200); // Snappier level up transition
        } else if (lives <= 0) {
            elements.overlay.classList.add('hidden');
            endGame();
        } else {
            nextRound(); // Wait, nextRound() hides overlay and renders
        }
    }, 1100); // Adjusted base duration so the card feels solid
}

function nextRound() {
    elements.overlay.classList.add('hidden');
    playerCake = { shape: getActiveCaps().shapes.length > 1 ? null : 'yuvarlak', layers: [], topping: null };
    renderCake(elements.playerContainer, playerCake);
    generateTargetCake();
    startTimer();
}

function startGame() {
    score = 0; lives = 3; level = 1; exp = 0; expToNextLevel = 2; // Faster initial level up
    updateHUD();
    showScreen('game');
    sounds.click();
    nextRound();
}

function endGame() {
    elements.finalLevel.innerText = level;
    elements.finalScore.innerText = score;
    showScreen('gameover');
    sounds.gameOver();
}

// --- INIT ---
document.getElementById('btn-start').addEventListener('click', () => { if (audioCtx.state === 'suspended') audioCtx.resume(); startGame(); });
document.getElementById('btn-restart').addEventListener('click', startGame);
