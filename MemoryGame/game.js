/* ===========================================
   ZEN MEMORY - Game Engine
   Relaxing memory card matching game
   =========================================== */

(function () {
    'use strict';

    // --- State ---
    let gameMode = 'single';
    let currentPlayer = 1;
    let scores = { 1: 0, 2: 0 };
    let selectedTheme = 'fruits';
    let gridSize = 4;
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let totalPairs = 0;
    let moves = 0;
    let isLocked = false;
    let hintUsed = false;
    let peekUsed = false;
    let shuffleUsed = false;

    // --- DOM ---
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    const startScreen = $('#start-screen');
    const gameScreen = $('#game-screen');
    const winScreen = $('#win-screen');
    const board = $('#game-board');
    const moveCounter = $('#move-counter');
    const matchCounter = $('#match-counter');
    const hintBtn = $('#hint-btn');
    const peekBtn = $('#peek-btn');
    const shuffleBtn = $('#shuffle-btn');
    const soundBtn = $('#sound-btn');
    const feedbackToast = $('#feedback-toast');
    const startBtn = $('#start-btn');
    const backBtn = $('#back-btn');
    const replayBtn = $('#replay-btn');
    const menuBtn = $('#menu-btn');

    // --- Feedback Messages ---
    const matchMessages = ['Güzel eşleşme! ✨', 'Harika! 🌟', 'Devam et! 💫', 'Muhteşem! 🎯', 'Süpersin! 🌸'];
    const wrongMessages = ['Biraz daha dikkat! 😅', 'Neredeydi acaba? 🤔', 'Tekrar dene! 🔄', 'Odaklan! 🧘‍♂️', 'Başarabilirsin! 💪'];

    // --- Utilities ---
    function shuffle(arr, columns = 0) {
        let a = [...arr];
        let isValid = false;
        let attempts = 0;
        const cols = columns || Math.sqrt(arr.length);

        while (!isValid && attempts < 50) {
            // Standard Fisher-Yates
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }

            isValid = true;
            // Check for adjacent duplicates
            for (let i = 0; i < a.length; i++) {
                // Check right
                if ((i + 1) % cols !== 0 && i + 1 < a.length && a[i] === a[i + 1]) {
                    isValid = false; break;
                }
                // Check below
                if (i + cols < a.length && a[i] === a[i + cols]) {
                    isValid = false; break;
                }
            }
            attempts++;
        }

        // Fallback fix if still invalid
        if (!isValid) {
            for (let i = 0; i < a.length - 1; i++) {
                if (a[i] === a[i + 1]) {
                    let swapIdx = (i + 2) % a.length;
                    [a[i + 1], a[swapIdx]] = [a[swapIdx], a[i + 1]];
                }
            }
        }
        return a;
    }

    function showScreen(screen) {
        [startScreen, gameScreen, winScreen].forEach(s => s.classList.remove('active'));
        setTimeout(() => screen.classList.add('active'), 50);
    }

    function showToast(msg) {
        feedbackToast.textContent = msg;
        feedbackToast.classList.add('show');
        setTimeout(() => feedbackToast.classList.remove('show'), 1800);
    }

    function updateCounters() {
        if (gameMode === 'single') {
            moveCounter.textContent = moves;
            matchCounter.textContent = `${matchedPairs} / ${totalPairs}`;
        }
    }

    // --- Theme & Grid Selection ---
    $$('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameMode = btn.dataset.mode;
        });
    });
    $$('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTheme = btn.dataset.theme;
        });
    });

    $$('.grid-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.grid-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gridSize = parseInt(btn.dataset.grid);
        });
    });

    // --- Card Creation ---
    function createCards() {
        const icons = getIconsForGrid(selectedTheme, gridSize);
        totalPairs = icons.length;
        const pairs = [...icons, ...icons];
        const shuffled = shuffle(pairs, gridSize);

        cards = shuffled.map((icon, index) => ({
            id: index,
            icon: icon,
            flipped: false,
            matched: false
        }));
    }

    function renderBoard() {
        board.innerHTML = '';
        board.className = `game-board grid-${gridSize}`;

        cards.forEach((card, index) => {
            const el = document.createElement('div');
            el.className = 'card';
            el.dataset.index = index;
            el.innerHTML = `
                <div class="card-inner">
                    <div class="card-face card-back"></div>
                    <div class="card-face card-front">
                        <span class="card-emoji">${card.icon}</span>
                    </div>
                </div>
            `;
            el.addEventListener('click', () => handleCardClick(index));
            board.appendChild(el);
        });

        // Set emoji size based on grid using clamp for better responsiveness
        const emojiSize = gridSize === 4 ? 'clamp(1.5rem, 8vmin, 2.5rem)' : gridSize === 6 ? 'clamp(1rem, 5vmin, 1.8rem)' : 'clamp(0.8rem, 3.5vmin, 1.4rem)';
        board.querySelectorAll('.card-emoji').forEach(e => {
            e.style.fontSize = emojiSize;
            e.style.lineHeight = '1';
        });
    }

    // --- Game Logic ---
    function handleCardClick(index) {
        if (isLocked) return;
        const card = cards[index];
        if (card.flipped || card.matched) return;
        if (flippedCards.length >= 2) return;

        audio.init();
        audio.flip();

        card.flipped = true;
        flippedCards.push(index);
        const el = board.children[index];
        el.classList.add('flipped');

        if (flippedCards.length === 2) {
            moves++;
            updateCounters();
            checkMatch();
        }
    }

    function checkMatch() {
        isLocked = true;
        const [i1, i2] = flippedCards;
        const c1 = cards[i1], c2 = cards[i2];
        const el1 = board.children[i1], el2 = board.children[i2];

        if (c1.icon === c2.icon) {
            // Match!
            setTimeout(() => {
                c1.matched = true;
                c2.matched = true;
                el1.classList.add('matched');
                el2.classList.add('matched');
                matchedPairs++;
                
                if (gameMode === 'multi') {
                    scores[currentPlayer]++;
                    $(`#p${currentPlayer}-score`).textContent = scores[currentPlayer];
                }
                
                updateCounters();
                audio.match();
                showToast(matchMessages[Math.floor(Math.random() * matchMessages.length)]);

                flippedCards = [];
                isLocked = false;

                if (matchedPairs === totalPairs) {
                    setTimeout(() => winGame(), 800);
                }
            }, 400);
        } else {
            // No match
            el1.classList.add('wrong');
            el2.classList.add('wrong');
            audio.wrong();
            showToast(wrongMessages[Math.floor(Math.random() * wrongMessages.length)]);

            setTimeout(() => {
                c1.flipped = false;
                c2.flipped = false;
                el1.classList.remove('flipped', 'wrong');
                el2.classList.remove('flipped', 'wrong');
                flippedCards = [];
                
                if (gameMode === 'multi') {
                    currentPlayer = currentPlayer === 1 ? 2 : 1;
                    $('#p1-box').classList.toggle('active', currentPlayer === 1);
                    $('#p2-box').classList.toggle('active', currentPlayer === 2);
                    showToast(`${currentPlayer}. Oyuncu Sırası`);
                }

                isLocked = false;
            }, 900);
        }
    }

    // --- Power-ups ---
    hintBtn.addEventListener('click', () => {
        if (hintUsed || isLocked) return;
        audio.init();
        audio.powerup();
        hintUsed = true;
        hintBtn.disabled = true;
        hintBtn.querySelector('.powerup-badge').textContent = '0';

        // Find an unmatched pair
        const unmatched = cards.filter(c => !c.matched && !c.flipped);
        if (unmatched.length < 2) return;

        let pair = null;
        for (let i = 0; i < unmatched.length; i++) {
            for (let j = i + 1; j < unmatched.length; j++) {
                if (unmatched[i].icon === unmatched[j].icon) {
                    pair = [unmatched[i].id, unmatched[j].id];
                    break;
                }
            }
            if (pair) break;
        }

        if (pair) {
            const el1 = board.children[pair[0]];
            const el2 = board.children[pair[1]];
            el1.classList.add('hint-highlight');
            el2.classList.add('hint-highlight');
            // Briefly flip
            el1.classList.add('flipped');
            el2.classList.add('flipped');

            setTimeout(() => {
                el1.classList.remove('flipped', 'hint-highlight');
                el2.classList.remove('flipped', 'hint-highlight');
            }, 1500);
        }

        showToast('İpucu kullanıldı 💡');
    });

    peekBtn.addEventListener('click', () => {
        if (peekUsed || isLocked) return;
        audio.init();
        audio.powerup();
        peekUsed = true;
        peekBtn.disabled = true;
        peekBtn.querySelector('.powerup-badge').textContent = '0';
        isLocked = true;

        // Flip all unmatched cards
        cards.forEach((c, i) => {
            if (!c.matched) {
                board.children[i].classList.add('flipped');
            }
        });

        showToast('Kartlara göz at! 👀');

        setTimeout(() => {
            cards.forEach((c, i) => {
                if (!c.matched && !c.flipped) {
                    board.children[i].classList.remove('flipped');
                } else if (!c.matched && c.flipped && !flippedCards.includes(i)) {
                    board.children[i].classList.remove('flipped');
                }
            });
            isLocked = false;
        }, 1500);
    });

    shuffleBtn.addEventListener('click', () => {
        if (shuffleUsed || isLocked) return;
        audio.init();
        audio.powerup();
        shuffleUsed = true;
        shuffleBtn.disabled = true;
        shuffleBtn.querySelector('.powerup-badge').textContent = '0';
        isLocked = true;

        // Collect unmatched card data
        const unmatchedIndices = [];
        const unmatchedIcons = [];
        cards.forEach((c, i) => {
            if (!c.matched) {
                unmatchedIndices.push(i);
                unmatchedIcons.push(c.icon);
                board.children[i].classList.add('shuffling');
            }
        });

        const shuffledIcons = shuffle(unmatchedIcons);

        setTimeout(() => {
            unmatchedIndices.forEach((idx, i) => {
                cards[idx].icon = shuffledIcons[i];
                cards[idx].flipped = false;
                const el = board.children[idx];
                el.classList.remove('flipped', 'shuffling');
                el.querySelector('.card-emoji').textContent = shuffledIcons[i];
            });
            flippedCards = [];
            isLocked = false;
        }, 500);

        showToast('Kartlar karıştırıldı! 🔀');
    });

    // --- Sound Toggle ---
    soundBtn.addEventListener('click', () => {
        audio.init();
        const on = audio.toggle();
        soundBtn.querySelector('.sound-on').classList.toggle('hidden', !on);
        soundBtn.querySelector('.sound-off').classList.toggle('hidden', on);
    });

    // --- Win ---
    function winGame() {
        audio.win();
        if (gameMode === 'multi') {
            $('#win-stats-single').classList.add('hidden');
            $('#win-stats-multi').classList.remove('hidden');
            $('#final-p1-score').textContent = scores[1];
            $('#final-p2-score').textContent = scores[2];
            
            if (scores[1] > scores[2]) {
                $('.win-subtitle').textContent = "1. Oyuncu Kazandı! 🏆";
            } else if (scores[2] > scores[1]) {
                $('.win-subtitle').textContent = "2. Oyuncu Kazandı! 🏆";
            } else {
                $('.win-subtitle').textContent = "Berabere! 🤝";
            }
        } else {
            $('#win-stats-single').classList.remove('hidden');
            $('#win-stats-multi').classList.add('hidden');
            $('#final-moves').textContent = moves;
            $('#final-pairs').textContent = totalPairs;
            $('.win-subtitle').textContent = "Tüm kartları eşleştirdin";
        }
        
        showScreen(winScreen);
        createParticles();
    }

    function createParticles() {
        const container = $('#win-particles');
        container.innerHTML = '';
        const colors = ['#a78bab', '#b8d4ce', '#d4ceb8', '#c2ccd4', '#d8c2c2', '#f0c4a8'];
        for (let i = 0; i < 40; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.width = (Math.random() * 8 + 4) + 'px';
            p.style.height = p.style.width;
            p.style.animationDuration = (Math.random() * 3 + 2) + 's';
            p.style.animationDelay = Math.random() * 2 + 's';
            container.appendChild(p);
        }
    }

    // --- Start / Reset ---
    function startGame() {
        matchedPairs = 0;
        moves = 0;
        flippedCards = [];
        isLocked = false;
        hintUsed = false;
        peekUsed = false;
        shuffleUsed = false;
        scores = { 1: 0, 2: 0 };
        currentPlayer = 1;

        if (gameMode === 'multi') {
            $('#single-info').classList.add('hidden');
            $('#multi-info').classList.remove('hidden');
            $('#p1-box').classList.add('active');
            $('#p2-box').classList.remove('active');
            $('#p1-score').textContent = '0';
            $('#p2-score').textContent = '0';
        } else {
            $('#single-info').classList.remove('hidden');
            $('#multi-info').classList.add('hidden');
        }

        hintBtn.disabled = false;
        peekBtn.disabled = false;
        shuffleBtn.disabled = false;
        hintBtn.querySelector('.powerup-badge').textContent = '1';
        peekBtn.querySelector('.powerup-badge').textContent = '1';
        shuffleBtn.querySelector('.powerup-badge').textContent = '1';

        createCards();
        updateCounters();
        renderBoard();
        showScreen(gameScreen);
    }

    // --- Navigation ---
    startBtn.addEventListener('click', () => startGame());
    backBtn.addEventListener('click', () => showScreen(startScreen));
    replayBtn.addEventListener('click', () => startGame());
    menuBtn.addEventListener('click', () => showScreen(startScreen));

})();
