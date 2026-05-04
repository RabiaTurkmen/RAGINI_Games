/** 
 * CANDY CRUSH V3 ULTIMATE ENGINE
 */

/* ==================== SES SİSTEMİ ==================== */
class SoundEngine {
    constructor() {
        this.enabled = false;
        this.ctx = null;
    }
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.enabled = true;
    }
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    playTone(freq, type, duration, vol = 0.1) {
        if (!this.enabled || !this.ctx) return;
        try {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { }
    }

    playPop() { this.playTone(600 + Math.random() * 200, 'sine', 0.1, 0.15); }
    playIce() { this.playTone(2000, 'triangle', 0.1, 0.1); } // Double jelly crack
    playSpecial() {
        this.playTone(800, 'triangle', 0.2, 0.2);
        setTimeout(() => this.playTone(600, 'sawtooth', 0.2, 0.2), 100);
    }
    playCombo(chainCount) {
        let freq = Math.min(400 + (chainCount * 100), 1200);
        this.playTone(freq, 'sine', 0.2, 0.15);
    }
    playInvalid() { this.playTone(150, 'sawtooth', 0.2, 0.2); }
    async playSugarCrush() {
        for (let i = 0; i < 5; i++) {
            this.playTone(400 + (i * 150), 'square', 0.1, 0.1);
            await new Promise(r => setTimeout(r, 100));
        }
    }
    playWin() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.3, 0.2), i * 150)); }
    playStar() { this.playTone(1200, 'sine', 0.2, 0.2); }
}
const audio = new SoundEngine();

function spawnBeam(r, c, dir) {
    let beam = document.createElement('div');
    beam.className = `beam-container beam-${dir}`;
    if (dir === 'h') beam.style.top = `calc(${r * (100 / width)}% + 2px)`;
    else beam.style.left = `calc(${c * (100 / width)}% + 2px)`;
    boardEl.appendChild(beam);
    setTimeout(() => { if (beam.parentNode) beam.remove(); }, 500);
}

function spawnBlast(r, c) {
    let blast = document.createElement('div');
    blast.className = 'blast-ring';
    blast.style.left = `calc(${c * (100 / width)}% + ${(100 / width) / 2}%)`;
    blast.style.top = `calc(${r * (100 / width)}% + ${(100 / width) / 2}%)`;
    boardEl.appendChild(blast);
    setTimeout(() => { if (blast.parentNode) blast.remove(); }, 600);
}

function spawnFlyingFish(r1, c1, r2, c2) {
    let fish = document.createElement('div');
    fish.className = 'flying-fish';
    fish.textContent = '🐟';
    fish.style.left = `calc(${c1 * (100 / width)}% + 2px)`;
    fish.style.top = `calc(${r1 * (100 / width)}% + 2px)`;
    fish.style.transition = 'left 0.8s cubic-bezier(0.25, 0.1, 0.25, 1), top 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)';
    fish.style.zIndex = '500';
    boardEl.appendChild(fish);

    setTimeout(() => {
        fish.style.left = `calc(${c2 * (100 / width)}% + 2px)`;
        fish.style.top = `calc(${r2 * (100 / width)}% + 2px)`;
    }, 10);

    setTimeout(() => {
        spawnBlast(r2, c2);
        if (fish.parentNode) fish.remove();
    }, 810); // Matches the 0.8s flight time + 10ms offset
}

function showFloatingText(text, colorClass) {
    let el = document.createElement('div');
    el.className = `floating-text ${colorClass}`;
    el.textContent = text;
    boardEl.parentElement.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 1500);
}

document.getElementById('soundToggle').addEventListener('click', (e) => {
    audio.init();
    let state = audio.toggle();
    e.target.textContent = state ? '🔊' : '🔇';
});

/* ==================== STATE VE SABİTLER ==================== */
const candyColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];
const width = 8;
const boardEl = document.getElementById('board');
const scoreDisplay = document.getElementById('score');
const movesDisplay = document.getElementById('moves');

const targetDesc = document.getElementById('targetDesc');
const targetValueDisplay = document.getElementById('targetValue');
const levelTitleDisplay = document.getElementById('levelTitle');
const starBarFill = document.getElementById('starBarFill');
const starMarkers = [document.getElementById('star1'), document.getElementById('star2'), document.getElementById('star3')];

const gameOverModal = document.getElementById('gameOverModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalStars = document.getElementById('modalStars').children;
const restartBtn = document.getElementById('restartBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const menuFromModalBtn = document.getElementById('menuFromModalBtn');
const shuffleOverlay = document.getElementById('shuffleOverlay');

const homeScreen = document.getElementById('homeScreen');
const gameContainer = document.getElementById('gameContainer');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const resetProgressBtn = document.getElementById('resetProgressBtn');

const episodeRewardModal = document.getElementById('episodeRewardModal');
const claimRewardBtn = document.getElementById('claimRewardBtn');
if (claimRewardBtn) {
    claimRewardBtn.addEventListener('click', () => {
        episodeRewardModal.classList.add('hidden');
        renderHome();
    });
}

// LEVELS ARE NOW AT levels.js

let levelIndex = 0;
let currentLevel = null;
let savedData = JSON.parse(localStorage.getItem('candyCrushV3_data')) || { unlocked: 1, stars: {}, jokers: 3, switchJokers: 1, stripedJokers: 1, bombJokers: 1 };
if (savedData.jokers === undefined) savedData.jokers = 3;
if (savedData.switchJokers === undefined) savedData.switchJokers = 1;
if (savedData.stripedJokers === undefined) savedData.stripedJokers = 1;
if (savedData.bombJokers === undefined) savedData.bombJokers = 1;
if (savedData.lives === undefined) savedData.lives = 5;
if (savedData.lastLifeLossTime === undefined) savedData.lastLifeLossTime = null;

const MAX_LIVES = 5;
const REGEN_TIME_MS = 30 * 60 * 1000; // 30 mins

function updateLivesUI() {
    let livesCount = document.getElementById('livesCount');
    let livesTimer = document.getElementById('livesTimer');
    if (!livesCount || !livesTimer) return;

    if (savedData.lives < MAX_LIVES && savedData.lastLifeLossTime) {
        let now = Date.now();
        let diff = now - savedData.lastLifeLossTime;
        let livesToRegen = Math.floor(diff / REGEN_TIME_MS);
        if (livesToRegen > 0) {
            savedData.lives = Math.min(MAX_LIVES, savedData.lives + livesToRegen);
            if (savedData.lives === MAX_LIVES) {
                savedData.lastLifeLossTime = null;
            } else {
                savedData.lastLifeLossTime += livesToRegen * REGEN_TIME_MS;
            }
            saveProgress();
        }
    }

    livesCount.textContent = savedData.lives;
    if (savedData.lives >= MAX_LIVES) {
        livesTimer.textContent = 'Dolu';
    } else {
        let now = Date.now();
        let nextLifeTime = savedData.lastLifeLossTime + REGEN_TIME_MS;
        let remainingStr = '';
        if (nextLifeTime > now) {
            let leftMs = nextLifeTime - now;
            let m = Math.floor(leftMs / 60000);
            let s = Math.floor((leftMs % 60000) / 1000);
            remainingStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
            remainingStr = '00:00';
        }
        livesTimer.textContent = remainingStr;
    }
}
setInterval(updateLivesUI, 1000);

function loseLife() {
    if (savedData.lives > 0) {
        if (savedData.lives === MAX_LIVES) savedData.lastLifeLossTime = Date.now();
        savedData.lives--;
        saveProgress();
    }
}

let isHammerMode = false;
let isSwitchMode = false;
let isStripedMode = false;
let isBombMode = false;
let switchFirstCandy = null;

const hammerBtn = document.getElementById('hammerBtn');
const hammerCount = document.getElementById('hammerCount');
const switchBtn = document.getElementById('switchBtn');
const switchCount = document.getElementById('switchCount');
const stripedBtn = document.getElementById('stripedBtn');
const stripedCount = document.getElementById('stripedCount');
const bombBtn = document.getElementById('bombBtn');
const bombCount = document.getElementById('bombCount');

function updateJokerUI() {
    if (hammerBtn) {
        hammerCount.textContent = savedData.jokers;
        if (savedData.jokers <= 0) hammerBtn.classList.add('empty');
        else hammerBtn.classList.remove('empty');
    }
    if (switchBtn) {
        switchCount.textContent = savedData.switchJokers;
        if (savedData.switchJokers <= 0) switchBtn.classList.add('empty');
        else switchBtn.classList.remove('empty');
    }
    if (stripedBtn) {
        stripedCount.textContent = savedData.stripedJokers;
        if (savedData.stripedJokers <= 0) stripedBtn.classList.add('empty');
        else stripedBtn.classList.remove('empty');
    }
    if (bombBtn) {
        bombCount.textContent = savedData.bombJokers;
        if (savedData.bombJokers <= 0) bombBtn.classList.add('empty');
        else bombBtn.classList.remove('empty');
    }
}

function resetJokerModes() {
    isHammerMode = false; isSwitchMode = false; isStripedMode = false; isBombMode = false;
    if (switchFirstCandy) switchFirstCandy.classList.remove('hint-pulse');
    switchFirstCandy = null;

    if (hammerBtn) hammerBtn.classList.remove('active');
    if (switchBtn) switchBtn.classList.remove('active');
    if (stripedBtn) stripedBtn.classList.remove('active');
    if (bombBtn) bombBtn.classList.remove('active');
    if (boardEl && boardEl.parentElement) boardEl.parentElement.classList.remove('joker-mode');
}

if (hammerBtn) {
    hammerBtn.addEventListener('click', () => {
        if (isProcessing || gameState !== 'playing' || savedData.jokers <= 0) return;
        let wasActive = isHammerMode;
        resetJokerModes();
        if (!wasActive) { isHammerMode = true; hammerBtn.classList.add('active'); boardEl.parentElement.classList.add('joker-mode'); }
        audio.playPop();
    });
}
if (switchBtn) {
    switchBtn.addEventListener('click', () => {
        if (isProcessing || gameState !== 'playing' || savedData.switchJokers <= 0) return;
        let wasActive = isSwitchMode;
        resetJokerModes();
        if (!wasActive) { isSwitchMode = true; switchBtn.classList.add('active'); boardEl.parentElement.classList.add('joker-mode'); }
        audio.playPop();
    });
}
if (stripedBtn) {
    stripedBtn.addEventListener('click', () => {
        if (isProcessing || gameState !== 'playing' || savedData.stripedJokers <= 0) return;
        let wasActive = isStripedMode;
        resetJokerModes();
        if (!wasActive) { isStripedMode = true; stripedBtn.classList.add('active'); boardEl.parentElement.classList.add('joker-mode'); }
        audio.playPop();
    });
}
if (bombBtn) {
    bombBtn.addEventListener('click', () => {
        if (isProcessing || gameState !== 'playing' || savedData.bombJokers <= 0) return;
        let wasActive = isBombMode;
        resetJokerModes();
        if (!wasActive) { isBombMode = true; bombBtn.classList.add('active'); boardEl.parentElement.classList.add('joker-mode'); }
        audio.playPop();
    });
}

let board = [];
let jellies = [];
let score = 0;
let moves = 0;
let currentTargetProgress = 0;
let isProcessing = false;
let lastSwapPositions = [];
let comboChain = 0;
let hintTimer = null;
let hintedWrappers = [];

let gameSessionId = 0;
let gameState = 'playing';
let starsEarned = 0;
let chocolateClearedThisTurn = false;

/* ==================== HOME SCREEN & PROGRESSION ==================== */
function renderHome() {
    homeScreen.classList.remove('hidden');
    gameContainer.classList.add('hidden');
    let grid = document.getElementById('levelGrid');
    grid.innerHTML = '';

    const EPISODE_SIZE = 10;
    const numEpisodes = Math.ceil(levels.length / EPISODE_SIZE);

    for (let e = 0; e < numEpisodes; e++) {
        let epsHeader = document.createElement('h3');
        epsHeader.className = 'episode-title';
        epsHeader.textContent = `Kıta ${e + 1}`;
        grid.appendChild(epsHeader);

        let epsContainer = document.createElement('div');
        epsContainer.className = 'episode-container';
        epsContainer.style.position = 'relative';
        epsContainer.style.height = `${EPISODE_SIZE * 80}px`;
        epsContainer.style.marginBottom = '40px';

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.position = 'absolute';
        svg.style.top = '0'; svg.style.left = '0';
        svg.style.width = '100%'; svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        epsContainer.appendChild(svg);

        let pathD = "";

        let startIdx = e * EPISODE_SIZE;
        let endIdx = Math.min(startIdx + EPISODE_SIZE, levels.length);
        let allLevelsCompleted = savedData.unlocked > endIdx;

        for (let idx = startIdx; idx < endIdx; idx++) {
            let localIdx = idx - startIdx;
            let btn = document.createElement('div');
            let isUnlocked = (idx + 1) <= savedData.unlocked;
            btn.className = `level-btn ${isUnlocked ? 'unlocked' : 'locked'}`;
            btn.id = `mapBtn-${idx + 1}`;
            btn.innerHTML = `${idx + 1}`;

            // Candy Crush map path parameters - Top to Bottom order
            let totalInEp = Math.max(endIdx - startIdx, 1);
            let yPercent = ((localIdx + 0.5) / EPISODE_SIZE) * 100;
            let xPercent = 50 + Math.sin(localIdx * 1) * 35;

            btn.style.position = 'absolute';
            btn.style.left = `calc(${xPercent}% - 35px)`; // 70px width
            btn.style.top = `calc(${yPercent}% - 35px)`;
            btn.style.zIndex = '10';

            if (localIdx === 0) pathD += `M ${xPercent} ${yPercent} `;
            else pathD += `L ${xPercent} ${yPercent} `;

            if (isUnlocked) {
                let sCount = savedData.stars[idx + 1] || 0;
                let starsHtml = `<div class="level-btn-stars">
                    <span class="${sCount >= 1 ? 'earned' : ''}">★</span>
                    <span class="${sCount >= 2 ? 'earned' : ''}">★</span>
                    <span class="${sCount >= 3 ? 'earned' : ''}">★</span>
                </div>`;
                btn.innerHTML += starsHtml;
                btn.onclick = () => startLevel(idx);
            }
            epsContainer.appendChild(btn);
        }

        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathD);
        path.setAttribute("stroke", "rgba(255, 255, 255, 0.4)");
        path.setAttribute("stroke-width", "5");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-dasharray", "4,4");
        path.setAttribute("vector-effect", "non-scaling-stroke");
        svg.appendChild(path);

        grid.appendChild(epsContainer);

        let chestDiv = document.createElement('div');
        chestDiv.className = `episode-chest ${allLevelsCompleted ? 'opened' : 'closed'}`;
        chestDiv.innerHTML = allLevelsCompleted ? '🎁 Ödül Alındı!' : '🔒 Sürpriz Kutu';
        grid.appendChild(chestDiv);
    }

    // Harita üstünde dolaşan avatar logic
    setTimeout(() => {
        let animData = null;
        try { animData = JSON.parse(sessionStorage.getItem('candyCrushV3_animateMap')); } catch (e) { }

        let avatar = document.createElement('div');
        avatar.innerHTML = '<div class=\"avatar-body\">👧🏼</div><div class=\"avatar-shadow\"></div>';
        avatar.className = 'map-avatar';

        if (animData) {
            sessionStorage.removeItem('candyCrushV3_animateMap');
            let fromBtn = document.getElementById(`mapBtn-${animData.from}`);
            let toBtn = document.getElementById(`mapBtn-${animData.to}`);

            if (fromBtn && toBtn) {
                fromBtn.parentElement.appendChild(avatar);
                avatar.style.left = fromBtn.style.left;
                avatar.style.top = fromBtn.style.top;

                fromBtn.scrollIntoView({ behavior: 'auto', block: 'center' });

                setTimeout(() => {
                    avatar.classList.add('walking');
                    if (fromBtn.parentElement !== toBtn.parentElement) {
                        toBtn.parentElement.appendChild(avatar);
                    }
                    avatar.style.left = toBtn.style.left;
                    avatar.style.top = toBtn.style.top;
                    toBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => avatar.classList.remove('walking'), 1000);
                }, 800);
                return;
            }
        }

        let unlockIdx = savedData.unlocked;
        let btn = document.getElementById(`mapBtn-${unlockIdx}`) || document.getElementById(`mapBtn-${levels.length}`);
        if (btn) {
            btn.parentElement.appendChild(avatar);
            avatar.style.left = btn.style.left;
            avatar.style.top = btn.style.top;
            btn.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
    }, 100);
}
backToMenuBtn.addEventListener('click', () => {
    if (gameState === 'playing') {
        if (!confirm('Bölümden çıkarsanız 1 Can kaybedeceksiniz. Emin misiniz?')) return;
        loseLife();
    }
    renderHome();
});
menuFromModalBtn.addEventListener('click', renderHome);
resetProgressBtn.addEventListener('click', () => {
    if (confirm('Tüm ilerlemeyi silmek istediğinize emin misiniz?')) {
        savedData = { unlocked: 1, stars: {} };
        saveProgress();
        renderHome();
    }
});

function saveProgress() {
    localStorage.setItem('candyCrushV3_data', JSON.stringify(savedData));
}

function startLevel(idx) {
    if (savedData.lives <= 0) {
        alert("Canınız kalmadı! Lütfen bekleyin.");
        return;
    }
    levelIndex = idx;
    homeScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    loadLevel();
}

/* ==================== INIT LEVEL ==================== */
function loadLevel() {
    currentLevel = levels[levelIndex];
    if (!currentLevel) { alert("Tüm bölümleri bitirdiniz!"); renderHome(); return; }

    boardEl.innerHTML = '';
    board = [];
    jellies = [];
    score = 0;
    moves = currentLevel.moves;
    currentTargetProgress = 0;
    isProcessing = false;
    comboChain = 0;
    starsEarned = 0;
    chocolateClearedThisTurn = false;
    clearHint();

    resetJokerModes();
    updateJokerUI();

    gameSessionId++;
    gameState = 'playing';

    let jCount = 0;
    for (let r = 0; r < width; r++) {
        for (let c = 0; c < width; c++) {
            if (currentLevel.layout && (currentLevel.layout[r][c] === 1 || currentLevel.layout[r][c] === 2)) {
                jCount += currentLevel.layout[r][c];
            }
        }
    }
    if (currentLevel.type === 'jelly') currentLevel.targetJelly = Math.max(jCount, 1);

    levelTitleDisplay.textContent = currentLevel.title;

    starMarkers.forEach(m => m.classList.remove('earned'));
    Array.from(modalStars).forEach(m => { m.classList.remove('earned'); m.textContent = '☆'; });

    // Yüzdelikleri ayarla
    let stars = currentLevel.stars || [currentLevel.target || 2000, (currentLevel.target || 2000) * 1.5, (currentLevel.target || 2000) * 2];
    let maxS = Math.max(...stars);
    starMarkers[0].style.left = `${(stars[0] / maxS) * 100}%`;
    starMarkers[1].style.left = `${(stars[1] / maxS) * 100}%`;
    starMarkers[2].style.left = '100%';

    gameOverModal.classList.add('hidden');
    nextLevelBtn.classList.add('hidden');
    restartBtn.classList.remove('hidden');
    shuffleOverlay.classList.add('hidden');

    document.querySelectorAll('.ingredient-spawner-marker').forEach(e => e.remove());
    document.querySelectorAll('.ingredient-drop-marker').forEach(e => e.remove());

    let initialIngCount = 0;

    // Background and Jellies
    for (let r = 0; r < width; r++) {
        jellies[r] = [];
        for (let c = 0; c < width; c++) {
            let type = currentLevel.layout ? currentLevel.layout[r][c] : 0;

            let cellBg = document.createElement('div');
            cellBg.className = `cell-bg ${type === -1 ? 'empty-cell' : ''}`;
            if (type !== -1) {
                cellBg.style.left = `calc(${c * (100 / width)}% + 2px)`;
                cellBg.style.top = `calc(${r * (100 / width)}% + 2px)`;
            }
            boardEl.appendChild(cellBg);
            jellies[r][c] = null;

            if (type === 1 || type === 2) {
                let jellyNode = document.createElement('div');
                jellyNode.className = `jelly ${type === 2 ? 'double' : ''}`;
                jellyNode.style.left = `calc(${c * (100 / width)}%)`;
                jellyNode.style.top = `calc(${r * (100 / width)}%)`;
                boardEl.appendChild(jellyNode);
                jellies[r][c] = jellyNode;
            }
        }
    }

    // Candies
    for (let r = 0; r < width; r++) {
        board[r] = [];
        for (let c = 0; c < width; c++) {
            let type = currentLevel.layout ? currentLevel.layout[r][c] : 0;
            if (type === -1) {
                board[r][c] = null; // Ölü alan
                continue;
            }

            let color = getRandomSpawnColor(r, c);

            let spawnCols = currentLevel.spawnCols || [2, 5];
            let isTopMost = true;
            for (let prevR = 0; prevR < r; prevR++) if (currentLevel.layout && currentLevel.layout[prevR][c] !== -1) isTopMost = false;

            if (currentLevel.type === 'ingredient' && isTopMost && spawnCols.includes(c) && initialIngCount < currentLevel.ingredientsCount) {
                color = 'ingredient-cherry';
                initialIngCount++;
            }

            let cType = 'normal';
            if (type === 3) {
                color = 'chocolate';
                cType = 'blocker-chocolate';
            }

            let candyWrapper = createCandyItem(r, c, color, cType);
            board[r][c] = candyWrapper;
            boardEl.appendChild(candyWrapper);
        }
    }

    if (currentLevel.type === 'ingredient') {
        let spawnCols = currentLevel.spawnCols || [2, 5];
        spawnCols.forEach(c => {
            let topR = 0;
            while (topR < width && currentLevel.layout && currentLevel.layout[topR][c] === -1) topR++;
            let botR = width - 1;
            while (botR >= 0 && currentLevel.layout && currentLevel.layout[botR][c] === -1) botR--;

            if (topR < width) {
                let tm = document.createElement('div');
                tm.className = 'ingredient-spawner-marker';
                tm.innerHTML = '⬇️';
                tm.style.left = `calc(${c * (100 / width)}%)`;
                tm.style.top = `calc(${topR * (100 / width)}%)`;
                boardEl.appendChild(tm);
            }
            if (botR >= 0) {
                let bm = document.createElement('div');
                bm.className = 'ingredient-drop-marker';
                bm.innerHTML = '✅';
                bm.style.left = `calc(${c * (100 / width)}%)`;
                bm.style.top = `calc(${botR * (100 / width)}%)`;
                boardEl.appendChild(bm);
            }
        });
    }

    updateDisplays();
    updateLevelUI();
    checkPossibleMovesAndHint();
}

function updateLevelUI() {
    if (currentLevel.type === 'score') {
        targetDesc.textContent = 'Hedef Puan:';
        targetValueDisplay.textContent = currentLevel.target;
    } else if (currentLevel.type === 'jelly') {
        targetDesc.textContent = 'Kalan Jöle:';
        targetValueDisplay.textContent = Math.max(0, currentLevel.targetJelly - currentTargetProgress);
    } else if (currentLevel.type === 'ingredient') {
        targetDesc.textContent = 'Kiraz:';
        targetValueDisplay.textContent = `${currentTargetProgress} / ${currentLevel.ingredientsCount}`;
    }
}

function getRandomSpawnColor(r, c) {
    let validColors = [...candyColors];
    if (c >= 2 && board[r][c - 1] && board[r][c - 2]) {
        let left1 = board[r][c - 1].dataset.color;
        let left2 = board[r][c - 2].dataset.color;
        if (left1 === left2) validColors = validColors.filter(color => color !== left1);
    }
    if (r >= 2 && board[r - 1][c] && board[r - 2][c]) {
        let up1 = board[r - 1][c].dataset.color;
        let up2 = board[r - 2][c].dataset.color;
        if (up1 === up2) validColors = validColors.filter(color => color !== up1);
    }
    if (validColors.length === 0) validColors = candyColors;
    return validColors[Math.floor(Math.random() * validColors.length)];
}

function createCandyItem(r, c, color, type) {
    const wrapper = document.createElement('div');
    wrapper.className = `candy-wrapper ${type.includes('blocker') ? 'blocker' : ''}`;
    wrapper.dataset.r = r;
    wrapper.dataset.c = c;
    wrapper.dataset.color = color;
    wrapper.dataset.type = type;
    updateCandyPosition(wrapper, r, c);

    const candy = document.createElement('div');
    candy.className = `candy ${type !== 'normal' ? type : ''}`;

    if (color === 'chocolate') candy.className = 'candy chocolate';
    else if (color.startsWith('ingredient')) candy.className += ` ${color}`;
    else candy.dataset.color = color;

    wrapper.appendChild(candy);
    wrapper.addEventListener('pointerdown', handlePointerDown);
    return wrapper;
}

function updateCandyPosition(el, r, c) {
    el.style.transform = `translate(${c * 100}%, ${r * 100}%)`;
    el.dataset.r = r;
    el.dataset.c = c;
}

/* ==================== EVENTS & SWAP ==================== */
function handlePointerDown(e) {
    if (isProcessing || moves <= 0 || gameState !== 'playing') return;
    audio.init();
    document.getElementById('soundBanner')?.classList.add('hidden');

    let wrapper = e.currentTarget;

    if (isHammerMode) {
        if (!wrapper || wrapper.dataset.type === 'blocker-chocolate' || (wrapper.dataset.color && wrapper.dataset.color.includes('ingredient'))) {
            audio.playInvalid(); wrapper.classList.add('shake'); setTimeout(() => wrapper.classList.remove('shake'), 300);
        } else {
            savedData.jokers--; saveProgress(); resetJokerModes(); updateJokerUI();
            isProcessing = true; processMatches({ toRemove: new Set([`${wrapper.dataset.r},${wrapper.dataset.c}`]), specialToSpawn: [] });
        }
        return;
    }

    if (isStripedMode) {
        if (!wrapper || wrapper.dataset.type === 'blocker-chocolate') {
            audio.playInvalid(); wrapper.classList.add('shake'); setTimeout(() => wrapper.classList.remove('shake'), 300);
        } else {
            savedData.stripedJokers--; saveProgress(); resetJokerModes(); updateJokerUI();
            isProcessing = true;
            let r = parseInt(wrapper.dataset.r), c = parseInt(wrapper.dataset.c);
            let toRemove = new Set();
            for (let i = 0; i < width; i++) { if (board[r][i]) toRemove.add(`${r},${i}`); if (board[i][c]) toRemove.add(`${i},${c}`); }
            audio.playSpecial(); spawnBeam(r, c, 'h'); spawnBeam(r, c, 'v');
            processMatches({ toRemove: toRemove, specialToSpawn: [] });
        }
        return;
    }

    if (isBombMode) {
        if (!wrapper || wrapper.dataset.type === 'blocker-chocolate') {
            audio.playInvalid(); wrapper.classList.add('shake'); setTimeout(() => wrapper.classList.remove('shake'), 300);
        } else {
            savedData.bombJokers--; saveProgress(); resetJokerModes(); updateJokerUI();
            isProcessing = true;
            let r = parseInt(wrapper.dataset.r), c = parseInt(wrapper.dataset.c);
            let toRemove = new Set();
            for (let row = r - 1; row <= r + 1; row++) {
                for (let col = c - 1; col <= c + 1; col++) {
                    if (row >= 0 && row < width && col >= 0 && col < width && board[row][col]) toRemove.add(`${row},${col}`);
                }
            }
            audio.playSpecial(); spawnBlast(r, c);
            processMatches({ toRemove: toRemove, specialToSpawn: [] });
        }
        return;
    }

    if (isSwitchMode) {
        if (!wrapper || wrapper.dataset.type === 'blocker-chocolate') {
            audio.playInvalid(); wrapper.classList.add('shake'); setTimeout(() => wrapper.classList.remove('shake'), 300);
            return;
        }
        if (!switchFirstCandy) {
            switchFirstCandy = wrapper;
            wrapper.classList.add('hint-pulse');
            audio.playPop();
        } else {
            let w1 = switchFirstCandy;
            let w2 = wrapper;
            resetJokerModes();
            if (w1 === w2) return;
            let r1 = parseInt(w1.dataset.r), c1 = parseInt(w1.dataset.c);
            let r2 = parseInt(w2.dataset.r), c2 = parseInt(w2.dataset.c);
            // Check if adjacent
            if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) {
                audio.playInvalid();
                return;
            }
            savedData.switchJokers--; saveProgress(); updateJokerUI();
            isProcessing = true;
            updateCandyPosition(w1, r2, c2); updateCandyPosition(w2, r1, c1);
            board[r1][c1] = w2; board[r2][c2] = w1;

            setTimeout(() => {
                let matchResult = scanBoardForMatches();
                if (matchResult.toRemove.size > 0) processMatches(matchResult);
                else { isProcessing = false; checkPossibleMovesAndHint(); }
            }, 300);
        }
        return;
    }

    if (wrapper.dataset.type === 'blocker-chocolate') return; // Cannot move

    clearHint();
    draggedWrapper = wrapper;
    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    document.addEventListener('pointerup', handlePointerUp);
}

function handlePointerUp(e) {
    document.removeEventListener('pointerup', handlePointerUp);
    if (!draggedWrapper) return;

    let dropX = e.clientX;
    let dropY = e.clientY;

    let diffX = dropX - pointerStartX;
    let diffY = dropY - pointerStartY;

    let r = parseInt(draggedWrapper.dataset.r);
    let c = parseInt(draggedWrapper.dataset.c);

    let targetR = r;
    let targetC = c;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 20) targetC++;
        else if (diffX < -20) targetC--;
    } else {
        if (diffY > 20) targetR++;
        else if (diffY < -20) targetR--;
    }

    if (targetR >= 0 && targetR < width && targetC >= 0 && targetC < width && (targetR !== r || targetC !== c)) {
        if (board[targetR][targetC] && board[targetR][targetC].dataset.type !== 'blocker-chocolate') {
            attemptSwap(r, c, targetR, targetC);
        } else if (!board[targetR][targetC] || board[targetR][targetC].dataset.type === 'blocker-chocolate') {
            // Shake if blocked or empty hole (-1)
            draggedWrapper.classList.add('shake');
            audio.playInvalid();
            setTimeout(() => draggedWrapper.classList.remove('shake'), 300);
        }
    }
    draggedWrapper = null;
}

async function attemptSwap(r1, c1, r2, c2) {
    isProcessing = true;
    comboChain = 0;
    chocolateClearedThisTurn = false;
    lastSwapPositions = [{ r: r1, c: c1 }, { r: r2, c: c2 }];

    let wrapper1 = board[r1][c1];
    let wrapper2 = board[r2][c2];

    updateCandyPosition(wrapper1, r2, c2);
    updateCandyPosition(wrapper2, r1, c1);
    board[r1][c1] = wrapper2;
    board[r2][c2] = wrapper1;

    await new Promise(res => setTimeout(res, 300));

    let type1 = wrapper1.dataset.type;
    let type2 = wrapper2.dataset.type;

    let isSpecialTrigger =
        (type1 === 'color-bomb' || type2 === 'color-bomb') ||
        (type1 !== 'normal' && type2 !== 'normal' && !type1.includes('ingredient') && !type2.includes('ingredient'));

    if (isSpecialTrigger) {
        moves--;
        updateDisplays();
        await processSpecialSwapContent(wrapper1, wrapper2, r1, c1, r2, c2);
        return;
    }

    let matchResult = scanBoardForMatches();

    if (matchResult.toRemove.size > 0) {
        moves--;
        updateDisplays();
        await processMatches(matchResult);
    } else {
        audio.playInvalid();
        wrapper1.classList.add('shake');
        wrapper2.classList.add('shake');

        await new Promise(res => setTimeout(res, 300));

        wrapper1.classList.remove('shake');
        wrapper2.classList.remove('shake');

        updateCandyPosition(wrapper1, r1, c1);
        updateCandyPosition(wrapper2, r2, c2);
        board[r1][c1] = wrapper1;
        board[r2][c2] = wrapper2;
        await new Promise(res => setTimeout(res, 300));
        isProcessing = false;
        checkPossibleMovesAndHint();
    }
}

/* ==================== SPECIAL COMBOS ==================== */
async function processSpecialSwapContent(w1, w2, r1, c1, r2, c2) {
    let toRemove = new Set();
    let type1 = w1.dataset.type;
    let type2 = w2.dataset.type;

    toRemove.add(`${r2},${c2}`);
    toRemove.add(`${r1},${c1}`);

    if (type1 === 'color-bomb' && type2 === 'color-bomb') {
        for (let r = 0; r < width; r++) for (let c = 0; c < width; c++) if (board[r][c]) toRemove.add(`${r},${c}`);
    } else if (type1 === 'color-bomb' || type2 === 'color-bomb') {
        let colorTarget = type1 === 'color-bomb' ? w2.dataset.color : w1.dataset.color;
        let specialType = type1 === 'color-bomb' ? type2 : type1;
        if (colorTarget.includes('ingredient') || colorTarget === 'chocolate') colorTarget = candyColors[Math.floor(Math.random() * candyColors.length)];

        for (let r = 0; r < width; r++) {
            for (let c = 0; c < width; c++) {
                if (board[r][c] && board[r][c].dataset.color === colorTarget) {
                    toRemove.add(`${r},${c}`);
                    if (specialType.includes('striped')) board[r][c].dataset.type = 'striped-h';
                    if (specialType === 'wrapped') board[r][c].dataset.type = 'wrapped';
                    if (specialType === 'fish') board[r][c].dataset.type = 'fish';
                }
            }
        }
    } else if (type1.includes('striped') && type2.includes('striped')) {
        for (let r = 0; r < width; r++) if (board[r][c2]) toRemove.add(`${r},${c2}`);
        for (let c = 0; c < width; c++) if (board[r2][c]) toRemove.add(`${r2},${c}`);
    } else if (type1 === 'wrapped' && type2 === 'wrapped') {
        for (let r = r2 - 2; r <= r2 + 2; r++) {
            for (let c = c2 - 2; c <= c2 + 2; c++) {
                if (r >= 0 && r < width && c >= 0 && c < width && board[r][c]) toRemove.add(`${r},${c}`);
            }
        }
    } else if ((type1 === 'fish' && type2.includes('striped')) || (type1.includes('striped') && type2 === 'fish')) {
        let stripedType = (type1 === 'striped-h' || type2 === 'striped-h') ? 'striped-h' : 'striped-v';
        w1.dataset.type = 'normal';
        w2.dataset.type = 'fish-' + stripedType;
    } else if ((type1 === 'fish' && type2 === 'wrapped') || (type1 === 'wrapped' && type2 === 'fish')) {
        w1.dataset.type = 'normal';
        w2.dataset.type = 'fish-wrapped';
    } else if ((type1.includes('striped') && type2 === 'wrapped') || (type1 === 'wrapped' && type2.includes('striped'))) {
        for (let r = 0; r < width; r++) {
            for (let cc = c2 - 1; cc <= c2 + 1; cc++) if (cc >= 0 && cc < width && board[r][cc]) toRemove.add(`${r},${cc}`);
        }
        for (let c = 0; c < width; c++) {
            for (let rr = r2 - 1; rr <= r2 + 1; rr++) if (rr >= 0 && rr < width && board[rr][c]) toRemove.add(`${rr},${c}`);
        }
    }

    audio.playSpecial();
    await processMatches({ toRemove: toRemove, specialToSpawn: [] });
}

/* ==================== MATCH SCANNING ==================== */
function getBestSpawnPosition(r, c, len, isHorizontal) {
    for (let i = 0; i < len; i++) {
        let currR = isHorizontal ? r : r + i;
        let currC = isHorizontal ? c + i : c;
        if (lastSwapPositions.some(p => p.r === currR && p.c === currC)) return { r: currR, c: currC };
    }
    let mid = Math.floor(len / 2);
    return { r: isHorizontal ? r : r + mid, c: isHorizontal ? c + mid : c };
}

function scanBoardForMatches(customBoard = board) {
    let arr = [];
    for (let r = 0; r < width; r++) {
        arr[r] = [];
        for (let c = 0; c < width; c++) {
            if (!customBoard[r][c] || customBoard[r][c].dataset.type.includes('blocker') || customBoard[r][c].dataset.color.includes('ingredient')) {
                arr[r][c] = 'none';
            } else {
                arr[r][c] = customBoard[r][c].dataset.color;
            }
        }
    }

    let horizontalStreaks = [];
    let verticalStreaks = [];

    for (let r = 0; r < width; r++) {
        let matchLen = 1;
        for (let c = 0; c < width; c++) {
            let current = arr[r][c];
            let next = c < width - 1 ? arr[r][c + 1] : null;
            if (current && current === next && current !== 'none') matchLen++;
            else {
                if (matchLen >= 3) horizontalStreaks.push({ r, c: c - matchLen + 1, len: matchLen, color: current });
                matchLen = 1;
            }
        }
    }

    for (let c = 0; c < width; c++) {
        let matchLen = 1;
        for (let r = 0; r < width; r++) {
            let current = arr[r][c];
            let next = r < width - 1 ? arr[r + 1][c] : null;
            if (current && current === next && current !== 'none') matchLen++;
            else {
                if (matchLen >= 3) verticalStreaks.push({ r: r - matchLen + 1, c, len: matchLen, color: current });
                matchLen = 1;
            }
        }
    }

    let toRemove = new Set();
    let specialToSpawn = [];
    let pointMap = {};
    let groups = [];

    function addPointToGroup(r, c, color, gIdx = -1) {
        let key = `${r},${c}`;
        if (gIdx === -1) { gIdx = groups.length; groups.push({ points: new Set(), color }); }
        groups[gIdx].points.add(key); pointMap[key] = gIdx; toRemove.add(key); return gIdx;
    }

    horizontalStreaks.forEach(s => {
        let gIdx = -1;
        for (let i = 0; i < s.len; i++) if (pointMap[`${s.r},${s.c + i}`] !== undefined) gIdx = pointMap[`${s.r},${s.c + i}`];
        for (let i = 0; i < s.len; i++) gIdx = addPointToGroup(s.r, s.c + i, s.color, gIdx);
        let spawnPos = getBestSpawnPosition(s.r, s.c, s.len, true);
        if (s.len >= 5) specialToSpawn.push({ r: spawnPos.r, c: spawnPos.c, color: 'all', type: 'color-bomb' });
        else if (s.len === 4) specialToSpawn.push({ r: spawnPos.r, c: spawnPos.c, color: s.color, type: 'striped-v' });
    });

    verticalStreaks.forEach(s => {
        let gIdx = -1;
        for (let i = 0; i < s.len; i++) if (pointMap[`${s.r + i},${s.c}`] !== undefined) gIdx = pointMap[`${s.r + i},${s.c}`];
        for (let i = 0; i < s.len; i++) gIdx = addPointToGroup(s.r + i, s.c, s.color, gIdx);
        let spawnPos = getBestSpawnPosition(s.r, s.c, s.len, false);
        if (s.len >= 5) specialToSpawn.push({ r: spawnPos.r, c: spawnPos.c, color: 'all', type: 'color-bomb' });
        else if (s.len === 4) specialToSpawn.push({ r: spawnPos.r, c: spawnPos.c, color: s.color, type: 'striped-h' });
    });

    groups.forEach(g => {
        if (g.points.size >= 5 && Array.from(g.points).length >= 5) {
            let hasBombOrStriped = false;
            let [pr, pc] = Array.from(g.points)[0].split(',').map(Number);
            specialToSpawn = specialToSpawn.filter(s => {
                if (g.points.has(`${s.r},${s.c}`) && (s.type === 'color-bomb' || s.type.includes('striped'))) {
                    hasBombOrStriped = true; return true;
                }
                return true;
            });
            if (!hasBombOrStriped) specialToSpawn.push({ r: pr, c: pc, color: g.color, type: 'wrapped' });
        }
    });

    for (let r = 0; r < width - 1; r++) {
        for (let c = 0; c < width - 1; c++) {
            let color = arr[r][c];
            if (color !== 'none' && color === arr[r][c + 1] && color === arr[r + 1][c] && color === arr[r + 1][c + 1]) {
                let spawnR = r + (Math.floor(Math.random() * 2));
                let spawnC = c + (Math.floor(Math.random() * 2));
                let points = [{ r: r, c: c }, { r: r, c: c + 1 }, { r: r + 1, c: c }, { r: r + 1, c: c + 1 }];
                points.forEach(p => {
                    if (lastSwapPositions.some(sp => sp.r === p.r && sp.c === p.c)) { spawnR = p.r; spawnC = p.c; }
                    toRemove.add(`${p.r},${p.c}`);
                });
                specialToSpawn.push({ r: spawnR, c: spawnC, color: color, type: 'fish' });
            }
        }
    }

    specialToSpawn = specialToSpawn.filter((s, idx, a) => a.findIndex(t => t.r === s.r && t.c === s.c) === idx);

    return { toRemove, specialToSpawn };
}

/* ==================== REMOVAL & GRAVITY ==================== */
async function processMatches(matchResult) {
    comboChain++;
    audio.playCombo(comboChain);

    let explodedSet = new Set(matchResult.toRemove);
    let queue = Array.from(explodedSet);
    let noJellyPopSet = new Set();
    let fishTargetSet = new Set();
    let noAdjacencySet = new Set();

    let i = 0;
    while (i < queue.length) {
        let [r, c] = queue[i].split(',').map(Number);

        let wrapper = board[r][c];

        if (wrapper && wrapper.dataset.type === 'blocker-chocolate') {
            chocolateClearedThisTurn = true;
        }

        // Cevre kontrolü (Çikolata kırma) - Yalnızca patlayan şey çikolata değilse etrafındakileri kır
        if (wrapper && wrapper.dataset.type !== 'blocker-chocolate' && !noAdjacencySet.has(`${r},${c}`)) {
            const adjs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
            adjs.forEach(([ar, ac]) => {
                if (ar >= 0 && ar < width && ac >= 0 && ac < width && board[ar][ac] && board[ar][ac].dataset.type === 'blocker-chocolate') {
                    if (!explodedSet.has(`${ar},${ac}`)) {
                        explodedSet.add(`${ar},${ac}`); queue.push(`${ar},${ac}`);
                        noJellyPopSet.add(`${ar},${ac}`);
                        chocolateClearedThisTurn = true;
                    }
                }
            });
        }

        if (wrapper && wrapper.dataset.type !== 'normal' && wrapper.dataset.type !== 'blocker-chocolate') {
            let type = wrapper.dataset.type;
            if (type === 'striped-h') {
                score += 60;
                let isDelayed = fishTargetSet.has(`${r},${c}`);
                if (isDelayed) {
                    setTimeout(() => { audio.playSpecial(); spawnBeam(r, c, 'h'); }, 700);
                } else {
                    audio.playSpecial(); spawnBeam(r, c, 'h');
                }
                for (let col = 0; col < width; col++) if (board[r][col] && !explodedSet.has(`${r},${col}`)) {
                    explodedSet.add(`${r},${col}`); queue.push(`${r},${col}`);
                    noAdjacencySet.add(`${r},${col}`);
                    if (isDelayed) fishTargetSet.add(`${r},${col}`);
                }
            } else if (type === 'striped-v') {
                score += 60;
                let isDelayed = fishTargetSet.has(`${r},${c}`);
                if (isDelayed) {
                    setTimeout(() => { audio.playSpecial(); spawnBeam(r, c, 'v'); }, 700);
                } else {
                    audio.playSpecial(); spawnBeam(r, c, 'v');
                }
                for (let row = 0; row < width; row++) if (board[row][c] && !explodedSet.has(`${row},${c}`)) {
                    explodedSet.add(`${row},${c}`); queue.push(`${row},${c}`);
                    noAdjacencySet.add(`${row},${c}`);
                    if (isDelayed) fishTargetSet.add(`${row},${c}`);
                }
            } else if (type === 'wrapped') {
                score += 120;
                let isDelayed = fishTargetSet.has(`${r},${c}`);
                if (isDelayed) {
                    setTimeout(() => { audio.playSpecial(); spawnBlast(r, c); }, 700);
                } else {
                    audio.playSpecial(); spawnBlast(r, c);
                }
                for (let row = r - 1; row <= r + 1; row++) {
                    for (let col = c - 1; col <= c + 1; col++) {
                        if (row >= 0 && row < width && col >= 0 && col < width && board[row][col]) {
                            if (!explodedSet.has(`${row},${col}`)) {
                                explodedSet.add(`${row},${col}`); queue.push(`${row},${col}`);
                                noAdjacencySet.add(`${row},${col}`);
                                if (isDelayed) fishTargetSet.add(`${row},${col}`);
                            }
                        }
                    }
                }
            } else if (type === 'fish' || type.startsWith('fish-')) {
                score += 80;
                let payload = type !== 'fish' ? type.replace('fish-', '') : null;
                audio.playSpecial();

                // Anında görsel olarak kaybolmasını sağla (patlama etkisiyle tepki verdiğini göstermek için)
                if (wrapper) {
                    wrapper.style.opacity = '0';
                    wrapper.style.transform = 'scale(0.5)';
                }

                let targets = [];
                for (let rr = 0; rr < width; rr++) for (let cc = 0; cc < width; cc++) if (jellies[rr][cc]) targets.push({ r: rr, c: cc });
                if (targets.length === 0) {
                    for (let rr = 0; rr < width; rr++) for (let cc = 0; cc < width; cc++) if (board[rr][cc] && board[rr][cc].dataset.type === 'blocker-chocolate') targets.push({ r: rr, c: cc });
                }
                if (targets.length === 0 && currentLevel.type === 'ingredient') {
                    for (let rr = 0; rr < width; rr++) {
                        for (let cc = 0; cc < width; cc++) {
                            if (board[rr][cc] && board[rr][cc].dataset.color.includes('ingredient')) {
                                for (let pR = rr + 1; pR < width; pR++) {
                                    if (board[pR][cc] && board[pR][cc].dataset.type === 'normal') { targets.push({ r: pR, c: cc }); break; }
                                }
                            }
                        }
                    }
                }
                if (targets.length === 0) {
                    for (let rr = 0; rr < width; rr++) for (let cc = 0; cc < width; cc++) if (board[rr][cc] && board[rr][cc].dataset.type === 'normal') targets.push({ r: rr, c: cc });
                }
                if (targets.length > 0) {
                    let target = targets[Math.floor(Math.random() * targets.length)];

                    if (payload && board[target.r][target.c]) {
                        board[target.r][target.c].dataset.type = payload;
                        let innerCandy = board[target.r][target.c].querySelector('.candy');
                        if (innerCandy && !innerCandy.className.includes(payload)) innerCandy.className += ` ${payload}`;
                    }

                    if (!explodedSet.has(`${target.r},${target.c}`)) {
                        explodedSet.add(`${target.r},${target.c}`); queue.push(`${target.r},${target.c}`);
                        fishTargetSet.add(`${target.r},${target.c}`);
                    }
                    spawnFlyingFish(r, c, target.r, target.c);
                }
            } else if (type === 'color-bomb') {
                score += 200;
                let randColor = candyColors[Math.floor(Math.random() * candyColors.length)];
                for (let row = 0; row < width; row++) {
                    for (let col = 0; col < width; col++) {
                        if (board[row][col] && board[row][col].dataset.color === randColor) {
                            if (!explodedSet.has(`${row},${col}`)) { explodedSet.add(`${row},${col}`); queue.push(`${row},${col}`); }
                        }
                    }
                }
            }
        }
        i++;
    }

    score += queue.length * 10;

    if (queue.length > 15) {
        showFloatingText('Büyük Patlama!', 'blast');
    } else if (comboChain === 3) {
        showFloatingText('Tatlı!', 'sweet');
    } else if (comboChain === 4) {
        showFloatingText('Harika!', 'great');
    } else if (comboChain >= 5) {
        showFloatingText('Muhteşem!', 'excellent');
    }

    // Process Jellies
    queue.forEach(str => {
        let [r, c] = str.split(',').map(Number);
        let wrapper = board[r][c];
        let isFishTarget = fishTargetSet.has(str);

        if (wrapper) {
            let isInvincible = wrapper.dataset.color && wrapper.dataset.color.includes('ingredient');
            if (!isInvincible) {
                if (!isFishTarget) wrapper.classList.add('pop');
                else setTimeout(() => { if (wrapper.parentNode) wrapper.classList.add('pop'); }, 700);
            }
        }

        if (jellies[r][c] && !noJellyPopSet.has(`${r},${c}`)) {
            let jnode = jellies[r][c];
            let popJelly = () => {
                if (jnode.classList.contains('double')) {
                    jnode.classList.remove('double');
                    audio.playIce();
                    if (currentLevel.type === 'jelly') {
                        currentTargetProgress++;
                        updateLevelUI();
                    }
                } else {
                    jnode.classList.add('pop');
                    setTimeout(() => { if (jnode.parentNode) jnode.remove(); }, 300);
                    jellies[r][c] = null;
                    if (currentLevel.type === 'jelly') {
                        currentTargetProgress++;
                        updateLevelUI();
                    }
                }
            };
            if (isFishTarget) setTimeout(popJelly, 700);
            else popJelly();
        }
    });

    await new Promise(res => setTimeout(res, 350));
    if (fishTargetSet.size > 0) await new Promise(res => setTimeout(res, 600));

    queue.forEach(str => {
        let [r, c] = str.split(',').map(Number);
        let wrapper = board[r][c];
        if (wrapper && wrapper.dataset.color && wrapper.dataset.color.includes('ingredient')) {
            // Keep ingredient intact
        } else {
            if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
            if (board[r] && board[r][c] === wrapper) board[r][c] = null;
        }
    });

    matchResult.specialToSpawn.forEach(s => {
        let newCandy = createCandyItem(s.r, s.c, s.color === 'all' ? 'special-none' : s.color, s.type);
        board[s.r][s.c] = newCandy;
        boardEl.appendChild(newCandy);
    });

    lastSwapPositions = [];
    await applyGravity();
}

async function applyGravity() {
    let moved = false;
    for (let c = 0; c < width; c++) {
        // Find candies and drop them down skipping holes
        for (let r = width - 1; r >= 0; r--) {
            let wrapper = board[r][c];
            if (!wrapper || wrapper.dataset.type === 'blocker-chocolate') continue;

            let targetR = r;
            let lowestValidTarget = r;
            while (targetR + 1 < width) {
                let nextR = targetR + 1;
                let layoutBg = currentLevel.layout ? currentLevel.layout[nextR][c] : 0;
                if (layoutBg === -1) {
                    targetR = nextR;
                } else if (board[nextR][c] === null) {
                    targetR = nextR;
                    lowestValidTarget = nextR;
                } else {
                    break;
                }
            }

            if (lowestValidTarget >= r) {
                let finalR = lowestValidTarget;
                // Check Ingredient reaching bottom (Not necessarily width-1, but bottom valid cell)
                let isBottomMost = (finalR === width - 1) || (currentLevel.layout && currentLevel.layout[finalR + 1] && currentLevel.layout[finalR + 1][c] === -1);

                if (isBottomMost && wrapper.dataset.color.includes('ingredient')) {
                    board[r][c] = null;
                    currentTargetProgress++; score += 1000; audio.playSpecial();
                    wrapper.style.transform = `translate(${c * 100}%, ${(finalR + 1) * 100}%)`;
                    wrapper.style.opacity = '0';
                    setTimeout(() => { if (wrapper.parentNode) wrapper.remove(); }, 300);
                    updateLevelUI();
                    moved = true;
                    continue;
                }

                if (lowestValidTarget > r) {
                    board[finalR][c] = wrapper;
                    board[r][c] = null;
                    updateCandyPosition(wrapper, finalR, c);
                    moved = true;
                }
            }
        }
    }

    if (moved) { audio.playPop(); await new Promise(res => setTimeout(res, 350)); }
    await refillBoard();
}

async function refillBoard() {
    let refilled = false;
    for (let c = 0; c < width; c++) {
        for (let r = 0; r < width; r++) {
            let layoutBg = currentLevel.layout ? currentLevel.layout[r][c] : 0;
            if (layoutBg !== -1 && board[r][c] === null) {
                let color = candyColors[Math.floor(Math.random() * candyColors.length)];

                // Spawn ingredients (only at the top-most valid row of the column)
                let isTopMost = true;
                for (let prevR = 0; prevR < r; prevR++) if (currentLevel.layout && currentLevel.layout[prevR][c] !== -1) isTopMost = false;

                let spawnCols = currentLevel.spawnCols || [2, 5];
                if (currentLevel.type === 'ingredient' && isTopMost && spawnCols.includes(c) && currentTargetProgress < currentLevel.ingredientsCount) {
                    let ingCount = 0;
                    board.forEach(row => row.forEach(cw => { if (cw && cw.dataset.color.includes('ingredient')) ingCount++; }));
                    if (ingCount < 2 && Math.random() < 0.2) color = 'ingredient-cherry';
                }

                let candyWrapper = createCandyItem(-1, c, color, 'normal');
                boardEl.appendChild(candyWrapper);
                candyWrapper.getBoundingClientRect();
                updateCandyPosition(candyWrapper, r, c);
                board[r][c] = candyWrapper;
                refilled = true;
            }
        }
    }

    if (refilled) await new Promise(res => setTimeout(res, 350));

    let matchResult = scanBoardForMatches();
    if (matchResult.toRemove.size > 0) {
        await processMatches(matchResult);
    } else {
        // Kaskad bitti. Çikolata büyütme zamanı!
        growChocolate();
        comboChain = 0;
        await checkGameState();
    }
}

function growChocolate() {
    // Sadece hamle yapıldığında ve hiçbir çikolata kırılmadığında yayılır (combo=0 means initial swap didn't clear? No, chocolateClearedThisTurn is global for the turn).
    if (chocolateClearedThisTurn) return;

    // Find all chocolate pieces
    let chocs = [];
    board.forEach((row, r) => row.forEach((w, c) => {
        if (w && w.dataset.type === 'blocker-chocolate') chocs.push({ r, c });
    }));

    if (chocs.length === 0) return;

    // Pick a random chocolate and infect an adjacent candy
    let targets = [];
    for (let i = 0; i < 3; i++) { // try a few random chocolates
        let cw = chocs[Math.floor(Math.random() * chocs.length)];
        let adjs = [[cw.r - 1, cw.c], [cw.r + 1, cw.c], [cw.r, cw.c - 1], [cw.r, cw.c + 1]];
        adjs.forEach(([ar, ac]) => {
            if (ar >= 0 && ar < width && ac >= 0 && ac < width && board[ar][ac] && board[ar][ac].dataset.type === 'normal' && !board[ar][ac].dataset.color.includes('ingredient')) {
                targets.push({ r: ar, c: ac });
            }
        });
        if (targets.length > 0) break;
    }

    if (targets.length > 0) {
        let t = targets[Math.floor(Math.random() * targets.length)];
        let w = board[t.r][t.c];
        w.dataset.type = 'blocker-chocolate';
        w.dataset.color = 'chocolate';
        w.querySelector('.candy').className = 'candy chocolate';
        w.classList.add('pop'); // Bounce animation
        setTimeout(() => w.classList.remove('pop'), 300);
    }
}

/* ==================== HINTS & SHUFFLE ==================== */
function checkPossibleMovesAndHint() {
    if (isProcessing || gameState !== 'playing') return;

    let possible = getPossibleMoves();
    if (possible.length === 0) {
        setTimeout(shuffleBoard, 500);
    } else {
        let move = possible[Math.floor(Math.random() * possible.length)];
        hintTimer = setTimeout(() => {
            if (!isProcessing && board[move.r1][move.c1] && board[move.r2][move.c2]) {
                board[move.r1][move.c1].classList.add('hint-pulse');
                board[move.r2][move.c2].classList.add('hint-pulse');
                hintedWrappers = [board[move.r1][move.c1], board[move.r2][move.c2]];
            }
        }, 5000);
    }
}

function clearHint() {
    if (hintTimer) clearTimeout(hintTimer);
    hintedWrappers.forEach(w => w.classList.remove('hint-pulse'));
    hintedWrappers = [];
}

function getPossibleMoves() {
    let movesList = [];
    for (let r = 0; r < width; r++) {
        for (let c = 0; c < width; c++) {
            if (c < width - 1 && canSwapAndMatch(r, c, r, c + 1)) movesList.push({ r1: r, c1: c, r2: r, c2: c + 1 });
            if (r < width - 1 && canSwapAndMatch(r, c, r + 1, c)) movesList.push({ r1: r, c1: c, r2: r + 1, c2: c });
        }
    }
    return movesList;
}

function canSwapAndMatch(r1, c1, r2, c2) {
    let w1 = board[r1][c1];
    let w2 = board[r2][c2];
    if (!w1 || !w2 || w1.dataset.type === 'blocker-chocolate' || w2.dataset.type === 'blocker-chocolate') return false;

    if (w1.dataset.type === 'color-bomb' || w2.dataset.type === 'color-bomb') return true;
    if (w1.dataset.type !== 'normal' && w2.dataset.type !== 'normal') return true;

    board[r1][c1] = w2; board[r2][c2] = w1;
    let res = scanBoardForMatches();
    board[r1][c1] = w1; board[r2][c2] = w2;
    return res.toRemove.size > 0;
}

async function shuffleBoard() {
    isProcessing = true;
    audio.playSpecial();
    shuffleOverlay.classList.remove('hidden');
    await new Promise(r => setTimeout(r, 1000));

    let pool = [];
    board.forEach((row, r) => row.forEach((w, c) => {
        if (w && w.dataset.type !== 'blocker-chocolate' && !w.dataset.color.includes('ingredient')) pool.push(w);
    }));

    let validShuffle = false;
    let safeRetries = 10;
    while (!validShuffle && safeRetries > 0) {
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        let idx = 0;
        let testBoard = [];
        for (let r = 0; r < width; r++) {
            testBoard[r] = [];
            for (let c = 0; c < width; c++) {
                if (board[r][c] && (board[r][c].dataset.type === 'blocker-chocolate' || board[r][c].dataset.color.includes('ingredient'))) testBoard[r][c] = board[r][c];
                else if (board[r][c]) testBoard[r][c] = pool[idx++];
                else testBoard[r][c] = null;
            }
        }

        let res = scanBoardForMatches(testBoard);
        if (res.toRemove.size === 0) {
            let oldBoard = board; board = testBoard;
            let pMoves = getPossibleMoves(); board = oldBoard;
            if (pMoves.length > 0) {
                validShuffle = true;
                let c_idx = 0;
                for (let r = 0; r < width; r++) {
                    for (let c = 0; c < width; c++) {
                        if (board[r][c] && board[r][c].dataset.type !== 'blocker-chocolate' && !board[r][c].dataset.color.includes('ingredient')) {
                            board[r][c] = pool[c_idx++];
                            updateCandyPosition(board[r][c], r, c);
                        }
                    }
                }
            }
        }
        safeRetries--;
    }

    if (!validShuffle) { loadLevel(); return; } // Reset level if totally stuck

    shuffleOverlay.classList.add('hidden');
    isProcessing = false;
    checkPossibleMovesAndHint();
}

/* ==================== SCORE, GAME OVER & SUGAR CRUSH ==================== */
function updateDisplays() {
    scoreDisplay.textContent = score;
    movesDisplay.textContent = moves;
    scoreDisplay.style.transform = 'scale(1.2)';
    setTimeout(() => { scoreDisplay.style.transform = 'scale(1)'; }, 200);

    // Update Star Bar
    let starsInfo = currentLevel.stars || [1000, 2000, 3000];
    let maxS = Math.max(...starsInfo);
    let p = Math.min((score / maxS) * 100, 100);
    starBarFill.style.width = `${p}%`;

    let eStars = 0;
    if (score >= starsInfo[0]) { eStars = 1; if (!starMarkers[0].classList.contains('earned')) { starMarkers[0].classList.add('earned'); audio.playStar(); } }
    if (score >= starsInfo[1]) { eStars = 2; if (!starMarkers[1].classList.contains('earned')) { starMarkers[1].classList.add('earned'); audio.playStar(); } }
    if (score >= starsInfo[2]) { eStars = 3; if (!starMarkers[2].classList.contains('earned')) { starMarkers[2].classList.add('earned'); audio.playStar(); } }
    starsEarned = eStars;
}

async function checkGameState() {
    if (gameState !== 'playing') return;

    let win = false;
    if (currentLevel.type === 'score' && score >= currentLevel.target) win = true;
    if (currentLevel.type === 'jelly' && currentTargetProgress >= currentLevel.targetJelly) win = true;
    if (currentLevel.type === 'ingredient' && currentTargetProgress >= currentLevel.ingredientsCount) win = true;

    if (win) {
        gameState = 'won';
        isProcessing = true;
        await triggerSugarCrush();

        // Final Score Save
        if (starsEarned === 0) starsEarned = 1; // You won, minimum 1 star
        if (savedData.unlocked <= levelIndex + 1) {
            savedData.unlocked = levelIndex + 2;
            savedData.jokers += 1;
            sessionStorage.setItem('candyCrushV3_animateMap', JSON.stringify({ from: levelIndex + 1, to: levelIndex + 2 }));
        } else {
            if (Math.random() < 0.5) savedData.jokers += 1;
        }
        if (!savedData.stars[levelIndex + 1] || savedData.stars[levelIndex + 1] < starsEarned) savedData.stars[levelIndex + 1] = starsEarned;

        let wonEpisode = false;
        if ((levelIndex + 1) % 10 === 0 && savedData.unlocked === levelIndex + 2) {
            if (!savedData.claimedEpisodes) savedData.claimedEpisodes = {};
            if (!savedData.claimedEpisodes[levelIndex + 1]) {
                savedData.claimedEpisodes[levelIndex + 1] = true;

                // Rastgele Premium Joker Ödülü (3 Tane Dağıt)
                let randTypes = ['jokers', 'switchJokers', 'stripedJokers', 'bombJokers'];
                let chosen = [];
                for (let k = 0; k < 3; k++) {
                    let rt = randTypes[Math.floor(Math.random() * randTypes.length)];
                    savedData[rt] += 1;
                    chosen.push(rt);
                }
                wonEpisode = true;

                // Update text
                let rewText = document.getElementById('rewardText');
                if (rewText) {
                    let mapN = { jokers: 'Lolipop Çekici', switchJokers: 'El Jokeri', stripedJokers: 'Çizgili Joker', bombJokers: 'Bomba Jokeri' };
                    let names = chosen.map(t => mapN[t]);
                    rewText.innerHTML = `Ödülleriniz:<br><span style="font-size:1.2rem;color:#ffde59;">${names.join(' + ')}</span>`;
                }
            }
        }

        saveProgress();
        updateJokerUI();

        if (wonEpisode) {
            audio.playWin();
            episodeRewardModal.classList.remove('hidden');
        } else {
            audio.playWin();
            modalTitle.textContent = "Bölüm Geçildi!";
            modalMessage.textContent = `Muhteşem! Puan: ${score}`;

            Array.from(modalStars).forEach((ms, i) => {
                if (i < starsEarned) {
                    setTimeout(() => { ms.classList.add('earned'); ms.textContent = '★'; audio.playStar(); }, i * 400);
                }
            });

            gameOverModal.classList.remove('hidden');
            nextLevelBtn.classList.remove('hidden');
            restartBtn.classList.add('hidden');
        }
    } else if (moves <= 0) {
        gameState = 'lost';
        loseLife();
        isProcessing = true;
        modalTitle.textContent = "Oyun Bitti!";
        modalMessage.textContent = `Maalesef hedefe ulaşamadınız. Puan: ${score}`;
        gameOverModal.classList.remove('hidden');
        nextLevelBtn.classList.add('hidden');
        restartBtn.classList.remove('hidden');
    } else {
        isProcessing = false;
        checkPossibleMovesAndHint();
    }
}

async function triggerSugarCrush() {
    audio.playSugarCrush();
    showFloatingText("SUGAR CRUSH!", "blast");
    let currentSession = gameSessionId;

    let toDetonate = [];

    // Step 1: Convert moves to specials
    while (moves > 0) {
        if (gameSessionId !== currentSession) break;
        moves--;
        updateDisplays();

        let normalCandies = [];
        board.forEach((r) => r.forEach((w) => {
            if (w && w.dataset.type === 'normal' && !w.dataset.color.includes('ingredient') && !toDetonate.includes(`${w.dataset.r},${w.dataset.c}`)) {
                normalCandies.push(w);
            }
        }));

        if (normalCandies.length > 0) {
            let rc = normalCandies[Math.floor(Math.random() * normalCandies.length)];
            rc.dataset.type = Math.random() > 0.5 ? 'striped-h' : 'striped-v';
            let candyEl = rc.querySelector('.candy');
            if (candyEl) {
                candyEl.className = `candy ${rc.dataset.type}`;
                candyEl.style.transform = 'scale(1.3)';
                setTimeout(() => { if (candyEl) candyEl.style.transform = ''; }, 200);
            }
            toDetonate.push(`${rc.dataset.r},${rc.dataset.c}`);
            audio.playCombo(0);
            await new Promise(r => setTimeout(r, 200));
        } else break;
    }

    await new Promise(r => setTimeout(r, 800));

    // Step 2: Detonate
    if (toDetonate.length > 0 && gameSessionId === currentSession) {
        let matchRes = { toRemove: new Set(toDetonate), specialToSpawn: [] };

        // Also add any other specials that were already on the board!
        board.forEach((r, rowIdx) => r.forEach((w, colIdx) => {
            if (w && w.dataset.type !== 'normal' && w.dataset.type !== 'blocker-chocolate' && !w.dataset.color.includes('ingredient')) {
                matchRes.toRemove.add(`${rowIdx},${colIdx}`);
            }
        }));

        await processMatches(matchRes);
    }
    await new Promise(r => setTimeout(r, 1500));
}

restartBtn.addEventListener('click', loadLevel);
nextLevelBtn.addEventListener('click', () => {
    levelIndex++;
    loadLevel();
});

// INITIAL BOOT
renderHome();
