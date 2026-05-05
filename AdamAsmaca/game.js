// ============================================================
// Adam Asmaca - Game Logic
// ============================================================

const TURKISH_ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
const MAX_WRONG = 6;

// ---- State ----
let gameState = {
    mode: null,           // 'pvp', 'solo', 'race'
    difficulty: 'medium',
    category: null,
    word: '',
    guessedLetters: [],
    wrongCount: 0,
    gameOver: false,
    won: false,
    hintsRemaining: 1,
    playerNames: { 1: '1. Oyuncu', 2: '2. Oyuncu' },
    // Race mode
    currentPlayer: 1,
    scores: { 1: 0, 2: 0 },
    raceRound: 0,
    maxRaceRounds: 5
};

// ---- DOM Refs ----
const $ = id => document.getElementById(id);

const screens = {
    home: $('home-screen'),
    setup: $('setup-screen'),
    game: $('game-screen')
};

const overlay = $('result-overlay');

// ---- Screen Navigation ----
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

function goHome() {
    overlay.classList.remove('active');
    showScreen('home');
}

// ---- Mode Selection ----
function selectMode(mode) {
    gameState.mode = mode;
    gameState.difficulty = 'medium';
    gameState.category = null;
    gameState.selectedCategory = 'random';
    buildSetupScreen();
    showScreen('setup');
}

function buildSetupScreen() {
    const container = $('setup-content');
    const mode = gameState.mode;
    let html = '';

    if (mode === 'pvp') {
        html = `
            <h2>👥 Oyuncuya Karşı</h2>
            <div class="form-group">
                <label>Gizli Kelime veya Cümleyi Girin</label>
                <div class="word-input-group">
                    <input type="text" class="word-input secret-input" id="pvp-word" 
                           autocomplete="off" autocorrect="off" spellcheck="false">
                    <p class="input-hint">Boşluk bırakarak birden fazla kelime girebilirsiniz. Gizli kalacaktır.</p>
                </div>
            </div>
            <button class="btn btn-primary" onclick="startPvPGame()" style="width:100%">
                Oyunu Başlat →
            </button>
        `;
    } else if (mode === 'solo') {
        html = `
            <h2>🤖 Bilgisayara Karşı</h2>
            ${buildCategorySelector()}
            ${buildDifficultySelector()}
            <button class="btn btn-primary" onclick="startSoloGame()" style="width:100%">
                Oyunu Başlat →
            </button>
        `;
    } else if (mode === 'race') {
        html = `
            <h2>🏁 İki Oyunculu Yarış</h2>
            <div class="form-group" style="display:flex; gap:10px;">
                <input type="text" id="p1-name" class="word-input" placeholder="1. Oyuncu" maxlength="12" style="text-align:center;">
                <input type="text" id="p2-name" class="word-input" placeholder="2. Oyuncu" maxlength="12" style="text-align:center;">
            </div>
            ${buildCategorySelector()}
            ${buildDifficultySelector()}
            <button class="btn btn-primary" onclick="startRaceGame()" style="width:100%">
                Yarışı Başlat →
            </button>
        `;
    }

    container.innerHTML = html;
}

function buildCategorySelector() {
    const cats = Object.keys(WORD_DATABASE);
    let html = `
        <div class="form-group">
            <label>Kategori</label>
            <div class="category-options">
                <button class="cat-btn active" onclick="setCategory('random', this)">Rastgele</button>
                ${cats.map(c => `<button class="cat-btn" onclick="setCategory('${c}', this)">${WORD_DATABASE[c].name}</button>`).join('')}
            </div>
        </div>
    `;
    return html;
}

function setCategory(cat, el) {
    gameState.selectedCategory = cat;
    el.parentElement.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}

function buildDifficultySelector() {
    return `
        <div class="form-group">
            <label>Zorluk Seviyesi</label>
            <div class="difficulty-options">
                <button class="diff-btn" onclick="setDifficulty('easy', this)">Kolay<br><small>3-5 harf</small></button>
                <button class="diff-btn active" onclick="setDifficulty('medium', this)">Orta<br><small>6-8 harf</small></button>
                <button class="diff-btn" onclick="setDifficulty('hard', this)">Zor<br><small>9+ harf</small></button>
            </div>
        </div>
    `;
}

function setDifficulty(diff, el) {
    gameState.difficulty = diff;
    el.parentElement.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}

// ---- Start Games ----
function normalizeTurkish(str) {
    return str.toLocaleLowerCase('tr-TR')
        .replace(/[^a-zçğıöşü ]/gi, '')
        .replace(/\s+/g, ' ');
}

function startPvPGame() {
    const input = $('pvp-word');
    const raw = input.value.trim();
    const word = normalizeTurkish(raw);
    if (word.replace(/\s/g, '').length < 2) {
        input.style.borderColor = 'var(--danger)';
        setTimeout(() => input.style.borderColor = '', 1000);
        return;
    }

    gameState.word = word;
    gameState.category = null;
    initGame();
}

function startSoloGame() {
    const cat = gameState.selectedCategory === 'random' ? getRandomCategory() : gameState.selectedCategory;
    gameState.category = cat;
    gameState.word = normalizeTurkish(getRandomWord(cat, gameState.difficulty));
    initGame();
}

function startRaceGame() {
    gameState.scores = { 1: 0, 2: 0 };
    gameState.currentPlayer = 1;

    const p1 = $('p1-name')?.value.trim() || '1. Oyuncu';
    const p2 = $('p2-name')?.value.trim() || '2. Oyuncu';
    gameState.playerNames = { 1: p1, 2: p2 };

    const cat = gameState.selectedCategory === 'random' ? getRandomCategory() : gameState.selectedCategory;
    gameState.category = cat;
    gameState.word = normalizeTurkish(getRandomWord(cat, gameState.difficulty));
    initGame();
}

function initGame() {
    gameState.guessedLetters = [];
    gameState.wrongCount = 0;
    gameState.gameOver = false;
    gameState.won = false;
    gameState.hintsRemaining = 1;
    overlay.classList.remove('active');
    renderGame();
    showScreen('game');
}

// ---- Render ----
function renderGame() {
    renderTopBar();
    renderHangman();
    renderWord();
    renderKeyboard();
}

function renderTopBar() {
    const bar = $('game-top-bar');
    let html = '';

    if (gameState.category) {
        const catData = WORD_DATABASE[gameState.category];
        html += `<div class="info-badge"><span class="badge-icon">${catData.icon}</span><span class="badge-value">${catData.name}</span></div>`;
    }

    if (gameState.mode === 'race') {
        html += `<div class="info-badge player-indicator p${gameState.currentPlayer}" style="padding: 8px 16px; font-size: 0.85rem;"><span class="badge-icon">🎮</span><span class="badge-value">${gameState.playerNames[gameState.currentPlayer]} Sırası</span></div>`;
    }

    html += `<div class="info-badge"><span class="badge-icon">❌</span><span class="badge-value">${gameState.wrongCount} / ${MAX_WRONG}</span></div>`;

    html += `<button class="info-badge hint-btn" onclick="useHint()" ${gameState.hintsRemaining <= 0 || gameState.gameOver ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}><span class="badge-icon">💡</span><span class="badge-value">İpucu (${gameState.hintsRemaining})</span></button>`;

    bar.innerHTML = html;

    // Race mode extras
    const raceArea = $('race-info');
    if (gameState.mode === 'race') {
        raceArea.style.display = 'flex';
        raceArea.innerHTML = `
            <div class="race-scores">
                <div class="score-box p1 ${gameState.currentPlayer === 1 ? 'active' : ''}">
                    <div class="score-label">${gameState.playerNames[1]}</div>
                    <div class="score-value">${gameState.scores[1]}</div>
                </div>
                <div class="score-box p2 ${gameState.currentPlayer === 2 ? 'active' : ''}">
                    <div class="score-label">${gameState.playerNames[2]}</div>
                    <div class="score-value">${gameState.scores[2]}</div>
                </div>
            </div>
        `;
    } else {
        raceArea.style.display = 'none';
    }
}

function renderWord() {
    const container = $('word-display');
    const words = gameState.word.split(' ');

    container.innerHTML = words.map(word => {
        const lettersHTML = word.split('').map(letter => {
            const guessed = gameState.guessedLetters.includes(letter);
            let cls = 'letter-box';
            if (guessed) cls += ' revealed';
            if (gameState.gameOver && gameState.won) cls += ' won';
            if (gameState.gameOver && !gameState.won && !guessed) cls += ' lost';
            return `<div class="${cls}">${(guessed || (gameState.gameOver && !gameState.won)) ? letter.toLocaleUpperCase('tr-TR') : ''}</div>`;
        }).join('');
        return `<div class="word-group" style="display:flex; gap:6px; margin: 0 24px 15px 24px;">${lettersHTML}</div>`;
    }).join('');
}

function renderKeyboard() {
    const container = $('keyboard');
    container.innerHTML = TURKISH_ALPHABET.split('').map(letter => {
        const lower = letter.toLocaleLowerCase('tr-TR');
        const guessed = gameState.guessedLetters.includes(lower);
        const isCorrect = guessed && gameState.word.includes(lower);
        const isWrong = guessed && !gameState.word.includes(lower);
        let cls = 'key-btn';
        if (isCorrect) cls += ' correct';
        if (isWrong) cls += ' wrong';
        return `<button class="${cls}" ${guessed || gameState.gameOver ? 'disabled' : ''} 
                 onclick="guessLetter('${lower}')">${letter}</button>`;
    }).join('');
}

// ---- Hangman SVG ----
function renderHangman() {
    const scene = $('hangman-scene');
    scene.className = 'hangman-scene';

    const w = gameState.wrongCount;
    const isDead = w >= MAX_WRONG;

    if (isDead) scene.classList.add('dead');

    // Build SVG
    scene.innerHTML = `
        <svg class="hangman-svg" viewBox="0 0 240 280">
            <!-- Structure: base, pole, top bar, rope holder -->
            <line class="structure" x1="30" y1="260" x2="90" y2="260"/>
            <line class="structure" x1="60" y1="260" x2="60" y2="30"/>
            <line class="structure" x1="60" y1="30" x2="150" y2="30"/>
            <line class="structure" x1="60" y1="30" x2="60" y2="55" style="stroke:none"/>
            
            <!-- Rope -->
            <line class="rope" x1="150" y1="30" x2="150" y2="${isDead ? '65' : '55'}" 
                  style="opacity:${w > 0 ? 1 : 0}"/>
            
            <!-- Platform (crate) -->
            <rect class="platform ${isDead ? 'platform-gone' : ''}" 
                  x="120" y="${isDead ? '280' : '210'}" width="60" height="30" rx="4"
                  style="opacity:${isDead ? 0 : 1}; transition: all 0.6s ease"/>
            
            <g class="swing-group">
                <!-- Head -->
                <circle class="body-part head ${w >= 1 ? 'visible' : ''}" 
                        cx="150" cy="${isDead ? '80' : '75'}" r="18"/>
                
                <!-- Face -->
                <g class="body-part ${w >= 1 ? 'visible' : ''}">
                    ${isDead ? `
                        <!-- Dead face: X eyes and frown -->
                        <line class="face-sad" x1="142" y1="${isDead ? '74' : '69'}" x2="148" y2="${isDead ? '80' : '75'}"/>
                        <line class="face-sad" x1="148" y1="${isDead ? '74' : '69'}" x2="142" y2="${isDead ? '80' : '75'}"/>
                        <line class="face-sad" x1="152" y1="${isDead ? '74' : '69'}" x2="158" y2="${isDead ? '80' : '75'}"/>
                        <line class="face-sad" x1="158" y1="${isDead ? '74' : '69'}" x2="152" y2="${isDead ? '80' : '75'}"/>
                        <path class="face-sad" d="M 140 ${isDead ? '90' : '85'} Q 150 ${isDead ? '84' : '79'} 160 ${isDead ? '90' : '85'}" fill="none"/>
                    ` : `
                        <!-- Alive face: dots for eyes, line mouth -->
                        <circle class="face" cx="143" cy="${isDead ? '76' : '71'}" r="2"/>
                        <circle class="face" cx="157" cy="${isDead ? '76' : '71'}" r="2"/>
                        ${w >= 4 ? `
                            <path class="face-sad" d="M 143 ${isDead ? '85' : '80'} Q 150 ${isDead ? '82' : '77'} 157 ${isDead ? '85' : '80'}" fill="none"/>
                        ` : `
                            <line class="face" x1="143" y1="${isDead ? '83' : '78'}" x2="157" y2="${isDead ? '83' : '78'}" 
                                  stroke="var(--accent-2)" stroke-width="1.5" stroke-linecap="round"/>
                        `}
                    `}
                </g>
                
                <!-- Body -->
                <line class="body-part body-line ${w >= 2 ? 'visible' : ''}" 
                      x1="150" y1="${isDead ? '98' : '93'}" x2="150" y2="${isDead ? '155' : '170'}"/>
                
                <!-- Left arm -->
                <line class="body-part body-line ${w >= 3 ? 'visible' : ''}" 
                      x1="150" y1="${isDead ? '115' : '110'}" x2="125" y2="${isDead ? '140' : '140'}"/>
                
                <!-- Right arm -->
                <line class="body-part body-line ${w >= 4 ? 'visible' : ''}" 
                      x1="150" y1="${isDead ? '115' : '110'}" x2="175" y2="${isDead ? '140' : '140'}"/>
                
                <!-- Left leg -->
                <line class="body-part body-line ${w >= 5 ? 'visible' : ''}" 
                      x1="150" y1="${isDead ? '155' : '170'}" x2="130" y2="${isDead ? '185' : '205'}"/>
                
                <!-- Right leg -->
                <line class="body-part body-line ${w >= 6 ? 'visible' : ''}" 
                      x1="150" y1="${isDead ? '155' : '170'}" x2="170" y2="${isDead ? '185' : '205'}"/>
            </g>
        </svg>
    `;
}

// ---- Guess Logic ----
function useHint() {
    if (gameState.gameOver || gameState.hintsRemaining <= 0) return;
    
    const unrevealedLetters = [...new Set(gameState.word.split(''))]
        .filter(l => l !== ' ' && !gameState.guessedLetters.includes(l));
        
    if (unrevealedLetters.length === 0) return;
    
    const randomLetter = unrevealedLetters[Math.floor(Math.random() * unrevealedLetters.length)];
    gameState.hintsRemaining--;
    
    guessLetter(randomLetter, true);
}

function guessLetter(letter, isHint = false) {
    if (gameState.gameOver || gameState.guessedLetters.includes(letter)) return;

    gameState.guessedLetters.push(letter);

    if (gameState.word.includes(letter)) {
        // Correct guess
        if (gameState.mode === 'race' && !isHint) {
            // Count occurrences
            const count = gameState.word.split('').filter(l => l === letter).length;
            gameState.scores[gameState.currentPlayer] += count * 10;
        }
        // Check win
        const allRevealed = gameState.word.split('').every(l => l === ' ' || gameState.guessedLetters.includes(l));
        if (allRevealed) {
            gameState.won = true;
            gameState.gameOver = true;
            renderGame();
            setTimeout(() => showResult(true), 600);
            return;
        }
    } else {
        // Wrong guess
        gameState.wrongCount++;
        if (gameState.wrongCount >= MAX_WRONG) {
            gameState.won = false;
            gameState.gameOver = true;
            renderGame();
            setTimeout(() => showResult(false), 800);
            return;
        }
        // Race mode: switch player on wrong guess
        if (gameState.mode === 'race') {
            gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        }
    }

    renderGame();
}

// ---- Results ----
function showResult(won) {
    const card = $('result-card-content');
    const word = gameState.word.toLocaleUpperCase('tr-TR');

    if (gameState.mode === 'race') {
        const s1 = gameState.scores[1];
        const s2 = gameState.scores[2];
        let winnerText, icon;

        if (s1 > s2) { winnerText = `${gameState.playerNames[1]} Kazandı!`; icon = '🏆'; }
        else if (s2 > s1) { winnerText = `${gameState.playerNames[2]} Kazandı!`; icon = '🏆'; }
        else { winnerText = 'Berabere!'; icon = '🤝'; }

        // Eğer kelime bulunamadıysa (adam asıldıysa)
        if (!won) {
            winnerText = 'Oyun Bitti!';
            icon = '💀';
        }

        card.innerHTML = `
            <div class="result-icon">${icon}</div>
            <h2 class="result-title ${!won && s1 === s2 ? 'lose' : 'win'}">${winnerText}</h2>
            <p class="result-word">${word}</p>
            <div class="race-result-scores">
                <div class="race-result-score p1">
                    <div class="rrs-label">${gameState.playerNames[1]}</div>
                    <div class="rrs-value">${s1}</div>
                </div>
                <div class="race-result-score p2">
                    <div class="rrs-label">${gameState.playerNames[2]}</div>
                    <div class="rrs-value">${s2}</div>
                </div>
            </div>
            <div class="result-buttons">
                <button class="btn btn-primary" onclick="playAgainSameMode()">Tekrar Oyna</button>
                <button class="btn btn-secondary" onclick="goHome()">Ana Menü</button>
            </div>
        `;
        if (s1 !== s2 || won) spawnConfetti();
    } else {
        card.innerHTML = `
            <div class="result-icon">${won ? '🎉' : '😔'}</div>
            <h2 class="result-title ${won ? 'win' : 'lose'}">${won ? 'Tebrikler!' : 'Oyun Bitti!'}</h2>
            <p class="result-word">${word}</p>
            <p style="color:var(--text-secondary);margin-bottom:24px;">
                ${won ? 'Kelimeyi başarıyla buldunuz!' : 'Doğru kelime yukarıda gösterilmiştir.'}
            </p>
            <div class="result-buttons">
                <button class="btn btn-primary" onclick="playAgainSameMode()">Tekrar Oyna</button>
                <button class="btn btn-secondary" onclick="goHome()">Ana Menü</button>
            </div>
        `;
        if (won) spawnConfetti();
    }

    overlay.classList.add('active');
}

function playAgainSameMode() {
    overlay.classList.remove('active');
    if (gameState.mode === 'pvp') {
        buildSetupScreen();
        showScreen('setup');
    } else if (gameState.mode === 'solo') {
        startSoloGame();
    } else if (gameState.mode === 'race') {
        startRaceGame();
    }
}

// ---- Confetti ----
function spawnConfetti() {
    const container = $('confetti-container');
    container.innerHTML = '';
    const colors = ['#6c5ce7', '#a29bfe', '#fd79a8', '#00b894', '#fdcb6e', '#55efc4', '#e17055'];
    for (let i = 0; i < 60; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
        piece.style.animationDelay = (Math.random() * 0.8) + 's';
        piece.style.width = (Math.random() * 8 + 5) + 'px';
        piece.style.height = (Math.random() * 8 + 5) + 'px';
        container.appendChild(piece);
    }
    setTimeout(() => container.innerHTML = '', 4000);
}

// ---- Keyboard Support ----
document.addEventListener('keydown', (e) => {
    // Enter shortcuts
    if (e.key === 'Enter') {
        if (screens.setup.classList.contains('active')) {
            if (gameState.mode === 'pvp') startPvPGame();
            else if (gameState.mode === 'solo') startSoloGame();
            else if (gameState.mode === 'race') startRaceGame();
            return;
        }
        if (overlay.classList.contains('active')) {
            playAgainSameMode();
            return;
        }
    }

    if (gameState.gameOver) return;
    if (!screens.game.classList.contains('active')) return;

    if (e.key.length !== 1) return;

    const key = e.key.toLocaleLowerCase('tr-TR');
    // Map to Turkish
    const turkishLower = TURKISH_ALPHABET.toLocaleLowerCase('tr-TR');
    if (turkishLower.includes(key)) {
        guessLetter(key);
    }
});

// ---- Init ----
showScreen('home');
