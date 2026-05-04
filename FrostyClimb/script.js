(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const shell = document.getElementById("gameShell");
  const hud = document.getElementById("hud");
  const startScreen = document.getElementById("startScreen");
  const howScreen = document.getElementById("howScreen");
  const pauseScreen = document.getElementById("pauseScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");

  const ui = {
    scoreValue: document.getElementById("scoreValue"),
    heightValue: document.getElementById("heightValue"),
    comboValue: document.getElementById("comboValue"),
    menuBestScore: document.getElementById("menuBestScore"),
    soundToggle: document.getElementById("soundToggle"),
    pauseBtn: document.getElementById("pauseBtn"),
    playBtn: document.getElementById("playBtn"),
    howBtn: document.getElementById("howBtn"),
    backBtn: document.getElementById("backBtn"),
    resumeBtn: document.getElementById("resumeBtn"),
    restartBtn: document.getElementById("restartBtn"),
    menuBtn: document.getElementById("menuBtn"),
    playAgainBtn: document.getElementById("playAgainBtn"),
    gameOverMenuBtn: document.getElementById("gameOverMenuBtn"),
    finalScore: document.getElementById("finalScore"),
    finalBestScore: document.getElementById("finalBestScore"),
    finalFloor: document.getElementById("finalFloor"),
    finalCombo: document.getElementById("finalCombo"),
    btnLeft: document.getElementById("btnLeft"),
    btnRight: document.getElementById("btnRight"),
    btnJump: document.getElementById("btnJump")
  };

  const W = canvas.width;
  const H = canvas.height;
  const STORAGE_KEY = "iceCreamTowerRushStats_v1";
  const START_WORLD_Y = 720;
  const FLOOR_UNIT = 120;

  const GRAVITY = 1700;
  const BASE_JUMP = 760;
  const RUN_JUMP_BONUS = 220;
  const MOVE_ACCEL = 2600;
  const AIR_ACCEL = 1600;
  const MAX_RUN_SPEED = 360;
  const FALL_LIMIT = 1100;
  const COYOTE_TIME = 0.11;
  const JUMP_BUFFER_TIME = 0.12;
  const LANDING_TOLERANCE = 18;
  const FOOT_LEFT = 0.14;
  const FOOT_RIGHT = 0.86;
  const MAX_PLATFORM_GAP = 164;

  const COMBO_LABELS = ["Sweet Combo!", "Mega Scoop!", "Triple Jump!", "Sugar Rush!"];

  const input = {
    left: false,
    right: false
  };

  const PLATFORM_TYPES = {
    vanilla: {
      name: "Vanilya",
      colors: ["#fff9dd", "#ffe893", "#ffcf66"],
      outline: "#f4bb53",
      meltTime: 7.2,
      minMelt: 3.2,
      scoreBonus: 10,
      slippery: false,
      bounce: 0,
      dripColor: "#ffe897"
    },
    strawberry: {
      name: "Çilek",
      colors: ["#ffd1e3", "#ff95c2", "#ff6aa8"],
      outline: "#ff5b9d",
      meltTime: 6.1,
      minMelt: 2.9,
      scoreBonus: 16,
      slippery: true,
      bounce: 0,
      dripColor: "#ff7db6"
    },
    chocolate: {
      name: "Çikolata",
      colors: ["#89543d", "#6c3928", "#502314"],
      outline: "#3d180f",
      meltTime: 9.4,
      minMelt: 4.1,
      scoreBonus: 14,
      slippery: false,
      bounce: 0,
      dripColor: "#6c3928"
    },
    mint: {
      name: "Nane",
      colors: ["#dbfff0", "#aef2d1", "#68d6ae"],
      outline: "#3caf84",
      meltTime: 5.7,
      minMelt: 2.6,
      scoreBonus: 24,
      slippery: false,
      bounce: 680,
      dripColor: "#68d6ae"
    },
    rainbow: {
      name: "Gökkuşağı",
      colors: ["#ff7fbc", "#ffd66f", "#95efff", "#a6a0ff"],
      outline: "#a14bdd",
      meltTime: 5.1,
      minMelt: 2.4,
      scoreBonus: 70,
      slippery: false,
      bounce: 0,
      dripColor: "#ff9fd2"
    }
  };

  const game = {
    state: "menu",
    time: 0,
    player: null,
    platforms: [],
    particles: [],
    floatTexts: [],
    bgItems: [],
    cameraY: 40,
    dangerY: 1080,
    nextPlatformY: 0,
    generationAnchorCenter: W * 0.5,
    platformId: 0,
    bestHeight: 0,
    maxFloor: 0,
    earnedScore: 0,
    score: 0,
    comboChain: 0,
    comboTimer: 0,
    comboMultiplier: 1,
    longestCombo: 0,
    comboFlash: 0,
    gameOverCurtain: 0,
    best: {
      score: 0,
      floor: 0,
      combo: 0
    }
  };

  const audio = {
    ctx: null,
    musicTimer: null,
    musicStep: 0,
    muted: false,
    musicPlaying: false,

    ensure() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    },

    tone(freq, duration, type = "sine", volume = 0.025, when = 0) {
      if (this.muted) return;
      this.ensure();
      if (!this.ctx) return;

      const startAt = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startAt);
      osc.stop(startAt + duration + 0.03);
    },

    playJump() {
      this.tone(660, 0.08, "sine", 0.018, 0);
      this.tone(880, 0.08, "triangle", 0.013, 0.03);
    },

    playCombo(chain) {
      const base = 720 + Math.min(chain, 8) * 36;
      this.tone(base, 0.09, "square", 0.03, 0);
      this.tone(base * 1.25, 0.12, "triangle", 0.02, 0.025);
      this.tone(base * 1.5, 0.1, "sine", 0.014, 0.05);
    },

    playBonus() {
      this.tone(880, 0.08, "square", 0.02, 0);
      this.tone(1100, 0.12, "triangle", 0.018, 0.04);
      this.tone(1320, 0.16, "sine", 0.014, 0.08);
    },

    playMelt() {
      this.tone(230, 0.11, "sine", 0.012, 0);
      this.tone(175, 0.18, "triangle", 0.01, 0.04);
    },

    playGameOver() {
      this.tone(460, 0.12, "triangle", 0.02, 0);
      this.tone(320, 0.13, "triangle", 0.018, 0.08);
      this.tone(220, 0.18, "sine", 0.015, 0.16);
    },

    startMusic() {
      if (this.muted || this.musicPlaying) return;
      this.ensure();
      if (!this.ctx) return;
      this.musicPlaying = true;
      this.musicStep = 0;
      this.musicLoop();
    },

    stopMusic() {
      this.musicPlaying = false;
      if (this.musicTimer) {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
    },

    musicLoop() {
      if (!this.musicPlaying || this.muted) return;

      const melody = [523, 659, 784, 659, 587, 659, 880, 659];
      const bass = [262, 294, 220, 247];
      const lead = melody[this.musicStep % melody.length];
      const low = bass[Math.floor(this.musicStep / 2) % bass.length];

      this.tone(lead, 0.18, "triangle", 0.012, 0);
      if (this.musicStep % 2 === 0) {
        this.tone(low, 0.28, "sine", 0.009, 0);
      }

      this.musicStep += 1;
      this.musicTimer = window.setTimeout(() => this.musicLoop(), 280);
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.muted) {
        this.stopMusic();
      } else if (game.state === "playing") {
        this.startMusic();
      }
      syncSoundButton();
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function choice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function fract(value) {
    return value - Math.floor(value);
  }

  function seeded(value) {
    return fract(Math.sin(value * 91.739) * 43758.5453123);
  }

  function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    const full = normalized.length === 3
      ? normalized.split("").map((v) => v + v).join("")
      : normalized;
    const int = parseInt(full, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function mixColor(a, b, t) {
    const c1 = hexToRgb(a);
    const c2 = hexToRgb(b);
    const r = Math.round(lerp(c1.r, c2.r, t));
    const g = Math.round(lerp(c1.g, c2.g, t));
    const bValue = Math.round(lerp(c1.b, c2.b, t));
    return `rgb(${r}, ${g}, ${bValue})`;
  }

  function formatNumber(value) {
    return Math.round(value).toLocaleString("tr-TR");
  }

  function roundRectPath(context, x, y, w, h, r) {
    const radius = Math.min(r, w * 0.5, h * 0.5);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }

  function drawStar(x, y, inner, outer, points = 4) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI / points) * i - Math.PI * 0.5;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
  }

  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      game.best.score = parsed.score || 0;
      game.best.floor = parsed.floor || 0;
      game.best.combo = parsed.combo || 0;
    } catch {
      game.best.score = 0;
      game.best.floor = 0;
      game.best.combo = 0;
    }
  }

  function saveStats() {
    game.best.score = Math.max(game.best.score, game.score);
    game.best.floor = Math.max(game.best.floor, game.maxFloor);
    game.best.combo = Math.max(game.best.combo, game.longestCombo);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        score: game.best.score,
        floor: game.best.floor,
        combo: game.best.combo
      })
    );

    syncMenuStats();
  }

  function syncMenuStats() {
    ui.menuBestScore.textContent = formatNumber(game.best.score);
  }

  function syncGameOverStats() {
    ui.finalScore.textContent = formatNumber(game.score);
    ui.finalBestScore.textContent = formatNumber(game.best.score);
    ui.finalFloor.textContent = `${game.maxFloor}F`;
    ui.finalCombo.textContent = String(game.longestCombo);
  }

  function syncSoundButton() {
    ui.soundToggle.textContent = audio.muted ? "🔈" : "🔊";
    ui.soundToggle.title = audio.muted ? "Sesi aç" : "Sesi kapat";
  }

  function refreshShellState() {
    const isPlaying = game.state === "playing";
    shell.classList.toggle("is-playing", isPlaying);
    hud.classList.toggle("hidden", !isPlaying);
  }

  function showOnlyScreen(screen) {
    [startScreen, howScreen, pauseScreen, gameOverScreen].forEach((node) => {
      node.classList.add("hidden");
    });
    if (screen) {
      screen.classList.remove("hidden");
    }
  }

  function resetInput() {
    input.left = false;
    input.right = false;
    if (game.player) {
      game.player.jumpBuffer = 0;
    }
  }

  function createBackgroundItems() {
    const kinds = ["cloud", "candy", "cone", "waffle", "sprinkle"];
    game.bgItems = Array.from({ length: 24 }, (_, index) => ({
      x: rand(20, W - 20),
      y: rand(-140, H + 220),
      size: rand(18, 68),
      parallax: rand(0.12, 0.48),
      wobble: rand(0, Math.PI * 2),
      speed: rand(0.25, 1.1),
      kind: kinds[index % kinds.length]
    }));
  }

  function createPlayer(x, y, platform = null) {
    return {
      x,
      y,
      w: 46,
      h: 60,
      vx: 0,
      vy: 0,
      onGround: !!platform,
      currentPlatform: platform,
      coyote: 0,
      jumpBuffer: 0,
      jumpStartY: y,
      face: 1,
      squash: 0,
      stretch: 0,
      panic: 0,
      trailCooldown: 0
    };
  }

  function getDifficulty(climbHeight) {
    return clamp(climbHeight / 360, 0, 16);
  }

  function pickPlatformType(difficulty) {
    const roll = Math.random();
    if (difficulty < 2) {
      if (roll < 0.42) return "vanilla";
      if (roll < 0.66) return "chocolate";
      if (roll < 0.87) return "strawberry";
      if (roll < 0.97) return "mint";
      return "rainbow";
    }

    const vanillaWeight = Math.max(0.17, 0.34 - difficulty * 0.01);
    const chocolateWeight = Math.max(0.15, 0.22 - difficulty * 0.005);
    const strawberryWeight = Math.min(0.3, 0.21 + difficulty * 0.007);
    const mintWeight = Math.min(0.24, 0.11 + difficulty * 0.007);
    const rainbowWeight = Math.max(0.05, 1 - vanillaWeight - chocolateWeight - strawberryWeight - mintWeight);

    let sum = 0;
    const weights = [
      ["vanilla", vanillaWeight],
      ["chocolate", chocolateWeight],
      ["strawberry", strawberryWeight],
      ["mint", mintWeight],
      ["rainbow", rainbowWeight]
    ];

    for (const [type, weight] of weights) {
      sum += weight;
      if (roll <= sum) return type;
    }

    return "vanilla";
  }

  function createPlatform(x, y, width, type, difficulty) {
    const cfg = PLATFORM_TYPES[type];
    const meltTime = Math.max(cfg.minMelt, cfg.meltTime - difficulty * 0.14);

    return {
      id: ++game.platformId,
      x,
      y,
      w: width,
      h: 24,
      type,
      seed: Math.random() * 9999,
      difficulty,
      melt: 0,
      meltRate: 1 / meltTime,
      standTime: 0,
      visits: 0,
      activated: false
    };
  }

  function buildPreviewScene() {
    game.platforms = [];
    game.particles = [];
    game.floatTexts = [];
    game.platformId = 0;
    game.comboFlash = 0;
    game.score = 0;
    game.bestHeight = 0;
    game.maxFloor = 0;
    game.earnedScore = 0;
    game.comboChain = 0;
    game.comboMultiplier = 1;
    game.longestCombo = 0;

    const previewPlatforms = [
      createPlatform(92, 700, 296, "chocolate", 0),
      createPlatform(64, 575, 122, "vanilla", 0.4),
      createPlatform(260, 465, 126, "strawberry", 1.2),
      createPlatform(118, 350, 116, "mint", 2.2),
      createPlatform(278, 235, 108, "rainbow", 3.2)
    ];

    game.platforms.push(...previewPlatforms);
    game.player = createPlayer(210, 640, previewPlatforms[0]);
    game.cameraY = 40;
    game.dangerY = 1100;
    game.nextPlatformY = 120;
    game.generationAnchorCenter = W * 0.5;
  }

  function addStarterPlatforms() {
    const starter = [
      createPlatform(W * 0.5 - 138, START_WORLD_Y, 276, "chocolate", 0),
      createPlatform(66, START_WORLD_Y - 118, 128, "vanilla", 0.5),
      createPlatform(256, START_WORLD_Y - 240, 132, "strawberry", 1.0),
      createPlatform(120, START_WORLD_Y - 366, 116, "mint", 1.3),
      createPlatform(286, START_WORLD_Y - 494, 110, "rainbow", 1.8)
    ];

    game.platforms.push(...starter);
    game.generationAnchorCenter = starter[starter.length - 1].x + starter[starter.length - 1].w * 0.5;
    game.nextPlatformY = starter[starter.length - 1].y;
  }

  function generatePlatformsUpTo(targetY) {
    while (game.nextPlatformY > targetY) {
      const climb = START_WORLD_Y - game.nextPlatformY;
      const difficulty = getDifficulty(climb);
      const gapMin = Math.min(132, 98 + difficulty * 2.8);
      const gapMax = Math.min(MAX_PLATFORM_GAP, 140 + difficulty * 2.2);
      const gap = rand(gapMin, gapMax);

      game.nextPlatformY -= gap;

      let widthMin = Math.max(68, 150 - difficulty * 5.1);
      let widthMax = Math.max(widthMin + 10, 194 - difficulty * 6.0);

      const type = pickPlatformType(difficulty);
      if (type === "chocolate") {
        widthMin += 8;
        widthMax += 10;
      }
      if (type === "rainbow") {
        widthMax -= 10;
      }

      const width = clamp(rand(widthMin, widthMax), 66, 196);
      const shiftAllowance = clamp(104 - Math.max(0, gap - 120) * 0.8 + difficulty * 0.3, 44, 96);
      const shift = rand(-shiftAllowance, shiftAllowance);
      const center = clamp(game.generationAnchorCenter + shift, width * 0.5 + 14, W - width * 0.5 - 14);
      const x = center - width * 0.5;

      game.platforms.push(createPlatform(x, game.nextPlatformY, width, type, difficulty));
      game.generationAnchorCenter = center + rand(-10, 10);
    }
  }

  function startGame() {
    resetInput();
    audio.ensure();
    audio.stopMusic();

    game.state = "playing";
    game.time = 0;
    game.platformId = 0;
    game.platforms = [];
    game.particles = [];
    game.floatTexts = [];
    game.cameraY = START_WORLD_Y - H + 140;
    game.dangerY = game.cameraY + H + 220;
    game.bestHeight = 0;
    game.maxFloor = 0;
    game.earnedScore = 0;
    game.score = 0;
    game.comboChain = 0;
    game.comboTimer = 0;
    game.comboMultiplier = 1;
    game.longestCombo = 0;
    game.comboFlash = 0;
    game.gameOverCurtain = 0;

    addStarterPlatforms();
    const startPlatform = game.platforms[0];
    game.player = createPlayer(W * 0.5 - 23, START_WORLD_Y - 60, startPlatform);
    game.player.face = 1;
    game.player.jumpStartY = game.player.y;

    generatePlatformsUpTo(game.cameraY - 1400);
    refreshHUD();
    refreshShellState();
    showOnlyScreen(null);
    audio.startMusic();
  }

  function goToMenu() {
    resetInput();
    audio.stopMusic();
    game.state = "menu";
    buildPreviewScene();
    refreshShellState();
    showOnlyScreen(startScreen);
    syncMenuStats();
  }

  function openHow() {
    game.state = "how";
    refreshShellState();
    showOnlyScreen(howScreen);
  }

  function pauseGame() {
    if (game.state !== "playing") return;
    game.state = "paused";
    audio.stopMusic();
    refreshShellState();
    showOnlyScreen(pauseScreen);
  }

  function resumeGame() {
    if (game.state !== "paused") return;
    game.state = "playing";
    refreshShellState();
    showOnlyScreen(null);
    audio.startMusic();
  }

  function triggerGameOver() {
    if (game.state !== "playing") return;

    game.state = "gameover";
    game.gameOverCurtain = 0;
    audio.stopMusic();
    audio.playGameOver();
    saveStats();
    syncGameOverStats();
    refreshShellState();
    showOnlyScreen(gameOverScreen);
  }

  function queueJump() {
    if (!game.player) return;
    game.player.jumpBuffer = JUMP_BUFFER_TIME;
  }

  function doJump() {
    const player = game.player;
    const speedBoost = clamp(Math.abs(player.vx) / MAX_RUN_SPEED, 0, 1) * RUN_JUMP_BONUS;

    player.vy = -(BASE_JUMP + speedBoost);
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    player.jumpStartY = player.y;
    player.currentPlatform = null;
    player.stretch = 1;
    player.squash = 0;

    emitJumpParticles(player.x + player.w * 0.5, player.y + player.h - 4);
    audio.playJump();
  }

  function findLandingPlatform(prevBottom, nextBottom, left, right) {
    let chosen = null;

    for (const platform of game.platforms) {
      if (platform.melt >= 1) continue;
      const usableWidth = platform.w * (1 - platform.melt * 0.08);
      const usableX = platform.x + (platform.w - usableWidth) * 0.5;
      const overlapsX = right > usableX && left < usableX + usableWidth;
      const crossesTop = prevBottom <= platform.y + LANDING_TOLERANCE && nextBottom >= platform.y;

      if (overlapsX && crossesTop) {
        if (!chosen || platform.y < chosen.y) {
          chosen = platform;
        }
      }
    }

    return chosen;
  }

  function resetCombo(showText = false, x = W * 0.5, y = 0) {
    if (showText) {
      spawnFloatText("Combo Melted!", x, y, "#ffe2f5", 18, false);
    }
    game.comboChain = 0;
    game.comboMultiplier = 1;
    game.comboTimer = 0;
  }

  function handleLanding(platform, jumpRise, landingSpeed) {
    const player = game.player;
    const cfg = PLATFORM_TYPES[platform.type];

    platform.activated = true;
    platform.visits += 1;

    player.squash = 1;
    player.stretch = 0;

    emitLandSplash(player.x + player.w * 0.5, platform.y + 2, platform.type);

    const comboTier = jumpRise >= 170 ? 1 + Math.floor((jumpRise - 170) / 90) : 0;
    if (comboTier > 0) {
      game.comboChain += comboTier;
      game.comboTimer = 1.25;
      game.comboMultiplier = 1 + Math.min(3.8, game.comboChain * 0.24);
      game.longestCombo = Math.max(game.longestCombo, game.comboChain);
      game.comboFlash = Math.min(1, game.comboFlash + 0.5);

      const comboLabel = COMBO_LABELS[(game.comboChain - 1) % COMBO_LABELS.length];
      spawnFloatText(comboLabel, player.x + player.w * 0.5, platform.y - 24, "#fff6a7", 24, true);
      audio.playCombo(game.comboChain);
    } else if (game.comboChain > 0) {
      resetCombo(true, player.x + player.w * 0.5, platform.y - 18);
    }

    let points = 24 + jumpRise * 0.16 + cfg.scoreBonus + landingSpeed * 0.01;
    if (platform.type === "rainbow") {
      points += 110;
      emitRainbowBurst(platform.x + platform.w * 0.5, platform.y + 2);
      audio.playBonus();
    }

    if (platform.visits > 1) {
      points *= 0.35;
    }

    points = Math.round(points * game.comboMultiplier);
    game.earnedScore += points;
    spawnFloatText(`+${points}`, platform.x + platform.w * 0.5, platform.y - 4, "#fff8c7", 18, false);

    if (platform.type === "mint") {
      emitMintBurst(platform.x + platform.w * 0.5, platform.y + 2);
      player.vy = -(cfg.bounce + Math.min(110, Math.abs(player.vx) * 0.28));
      player.onGround = false;
      player.currentPlatform = null;
      player.jumpStartY = platform.y;
      player.stretch = 0.8;
    }
  }

  function updatePlatforms(dt) {
    for (let i = game.platforms.length - 1; i >= 0; i -= 1) {
      const platform = game.platforms[i];
      const cfg = PLATFORM_TYPES[platform.type];

      if (game.player && game.player.currentPlatform === platform && game.player.onGround) {
        platform.activated = true;
      }

      if (!platform.activated) continue;

      if (game.player && game.player.currentPlatform === platform && game.player.onGround) {
        platform.standTime += dt;
      } else {
        platform.standTime = Math.max(0, platform.standTime - dt * 1.2);
      }

      let meltRate = platform.meltRate * (1 + platform.difficulty * 0.035);
      if (game.player && game.player.currentPlatform === platform && game.player.onGround) {
        meltRate *= 1.85 + Math.min(2.2, platform.standTime * 1.05);
      }

      platform.melt += meltRate * dt;

      if (platform.melt > 0.44 && Math.random() < dt * (1.8 + platform.melt * 5.5)) {
        spawnMeltDrip(platform);
      }

      if (platform.melt >= 1) {
        if (game.player && game.player.currentPlatform === platform) {
          game.player.currentPlatform = null;
          game.player.onGround = false;
          game.player.coyote = COYOTE_TIME;
          audio.playMelt();
        }
        game.platforms.splice(i, 1);
      }
    }
  }

  function updatePlayer(dt) {
    const player = game.player;
    if (!player) return;

    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.coyote = Math.max(0, player.coyote - dt);
    player.squash = Math.max(0, player.squash - dt * 4.2);
    player.stretch = Math.max(0, player.stretch - dt * 4.0);

    const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const groundCfg = player.currentPlatform ? PLATFORM_TYPES[player.currentPlatform.type] : null;
    const accel = player.onGround ? MOVE_ACCEL : AIR_ACCEL;

    if (move !== 0) {
      player.vx += move * accel * dt;
      player.face = move;
    } else {
      const drag = player.onGround
        ? groundCfg && groundCfg.slippery
          ? 520
          : 1650
        : 420;

      if (Math.abs(player.vx) <= drag * dt) {
        player.vx = 0;
      } else {
        player.vx -= Math.sign(player.vx) * drag * dt;
      }
    }

    const maxSpeed = MAX_RUN_SPEED + (groundCfg && groundCfg.slippery ? 30 : 0);
    player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
    player.x += player.vx * dt;

    if (player.x > W + player.w * 0.5) player.x = -player.w * 0.5;
    if (player.x < -player.w * 0.5) player.x = W + player.w * 0.5;

    if (player.onGround && player.currentPlatform) {
      player.y = player.currentPlatform.y - player.h;

      const stillOnPlatform =
        player.x + player.w * FOOT_RIGHT > player.currentPlatform.x &&
        player.x + player.w * FOOT_LEFT < player.currentPlatform.x + player.currentPlatform.w;

      if (!stillOnPlatform) {
        player.onGround = false;
        player.coyote = COYOTE_TIME;
        player.jumpStartY = player.y;
        player.currentPlatform = null;
      }
    }

    if (player.jumpBuffer > 0 && (player.onGround || player.coyote > 0)) {
      doJump();
    }

    const prevBottom = player.y + player.h;

    if (!player.onGround) {
      player.vy += GRAVITY * dt;
      player.vy = Math.min(player.vy, FALL_LIMIT);
      player.y += player.vy * dt;
    } else {
      player.vy = Math.max(player.vy, 0);
    }

    if (!player.onGround && player.vy >= 0) {
      const landing = findLandingPlatform(
        prevBottom,
        player.y + player.h,
        player.x + player.w * FOOT_LEFT,
        player.x + player.w * FOOT_RIGHT
      );

      if (landing) {
        const landingSpeed = player.vy;
        player.y = landing.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.currentPlatform = landing;
        player.coyote = COYOTE_TIME;

        const jumpRise = Math.max(0, player.jumpStartY - landing.y);
        handleLanding(landing, jumpRise, landingSpeed);
      }
    }

    if (Math.abs(player.vx) > 240 && player.vy < -160) {
      player.trailCooldown -= dt;
      if (player.trailCooldown <= 0) {
        player.trailCooldown = 0.05;
        const colors = ["#fff6cb", "#ff95c9", "#9cefff", "#ffc15c"];
        spawnParticle(player.x + player.w * 0.5, player.y + player.h * 0.72, {
          vx: rand(-25, 25),
          vy: rand(30, 80),
          gravity: 120,
          life: 0.42,
          size: rand(3, 6),
          color: choice(colors),
          front: false,
          type: "star"
        });
      }
    } else {
      player.trailCooldown = 0;
    }

    player.panic =
      clamp(((player.y + player.h) - (game.dangerY - 120)) / 180, 0, 1) *
      clamp(player.vy / 760, 0, 1);
  }

  function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i -= 1) {
      const p = game.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        game.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rotation += p.spin * dt;
      p.size = Math.max(0.4, p.size - dt * p.decay);
    }
  }

  function updateFloatTexts(dt) {
    for (let i = game.floatTexts.length - 1; i >= 0; i -= 1) {
      const item = game.floatTexts[i];
      item.life -= dt;
      if (item.life <= 0) {
        game.floatTexts.splice(i, 1);
        continue;
      }

      item.y += item.vy * dt;
      item.vy *= 0.96;
    }
  }

  function updateGameplay(dt) {
    updatePlayer(dt);
    updatePlatforms(dt);
    updateParticles(dt);
    updateFloatTexts(dt);

    game.bestHeight = Math.max(game.bestHeight, START_WORLD_Y - game.player.y);
    game.maxFloor = Math.max(game.maxFloor, Math.max(0, Math.floor(game.bestHeight / FLOOR_UNIT)));
    game.score = Math.floor(game.bestHeight * 0.38) + game.earnedScore;

    const targetCameraY = game.player.y - H * 0.38;
    const follow = targetCameraY < game.cameraY ? 0.16 : 0.045;
    game.cameraY += (targetCameraY - game.cameraY) * follow;

    const dangerSpeed = 72 + game.bestHeight * 0.007 + game.time * 1.1;
    game.dangerY -= dangerSpeed * dt;

    generatePlatformsUpTo(game.cameraY - 1300);
    game.platforms = game.platforms.filter((platform) => platform.y < game.dangerY + 420);

    if (game.comboChain > 0) {
      game.comboTimer -= dt;
      if (game.comboTimer <= 0) {
        resetCombo();
      }
    }

    game.comboFlash = Math.max(0, game.comboFlash - dt * 2.2);

    if (game.player.y + game.player.h > game.dangerY || game.player.y > game.cameraY + H + 180) {
      triggerGameOver();
    }

    refreshHUD();
  }

  function updateGameOver(dt) {
    updateParticles(dt);
    updateFloatTexts(dt);
    game.gameOverCurtain = Math.min(1, game.gameOverCurtain + dt * 0.9);
    game.comboFlash = Math.max(0, game.comboFlash - dt * 2.2);
  }

  function updateMenuLike(dt) {
    updateParticles(dt);
    updateFloatTexts(dt);
    game.comboFlash = Math.max(0, game.comboFlash - dt * 2.2);
  }

  function refreshHUD() {
    ui.scoreValue.textContent = formatNumber(game.score);
    ui.heightValue.textContent = `${game.maxFloor}F`;

    if (game.comboChain > 0) {
      const label = COMBO_LABELS[(game.comboChain - 1) % COMBO_LABELS.length];
      ui.comboValue.textContent = `x${game.comboMultiplier.toFixed(1)} • ${label}`;
    } else {
      ui.comboValue.textContent = "Combo Ready";
    }
  }

  function spawnParticle(x, y, options = {}) {
    game.particles.push({
      x,
      y,
      vx: options.vx ?? rand(-40, 40),
      vy: options.vy ?? rand(-30, 30),
      gravity: options.gravity ?? 0,
      life: options.life ?? 0.6,
      maxLife: options.life ?? 0.6,
      size: options.size ?? rand(3, 6),
      decay: options.decay ?? 4,
      color: options.color ?? "#ffffff",
      front: options.front ?? true,
      type: options.type ?? "circle",
      rotation: options.rotation ?? 0,
      spin: options.spin ?? rand(-3, 3)
    });
  }

  function spawnFloatText(text, x, y, color, size, big) {
    game.floatTexts.push({
      text,
      x,
      y,
      vy: big ? -36 : -28,
      life: big ? 1.0 : 0.85,
      maxLife: big ? 1.0 : 0.85,
      color,
      size,
      scale: big ? 1.08 : 1
    });
  }

  function emitJumpParticles(x, y) {
    const colors = ["#fff6dd", "#ffd268", "#ff93c5", "#8cefff"];
    for (let i = 0; i < 8; i += 1) {
      spawnParticle(x, y, {
        vx: rand(-90, 90),
        vy: rand(-90, -20),
        gravity: 220,
        life: rand(0.35, 0.6),
        size: rand(2.5, 5),
        color: choice(colors),
        front: false,
        type: Math.random() < 0.4 ? "star" : "circle"
      });
    }
  }

  function emitLandSplash(x, y, type) {
    const cfg = PLATFORM_TYPES[type];
    for (let i = 0; i < 10; i += 1) {
      spawnParticle(x, y, {
        vx: rand(-120, 120),
        vy: rand(-120, -25),
        gravity: 260,
        life: rand(0.35, 0.65),
        size: rand(3, 6),
        color: choice(cfg.colors),
        front: i % 2 === 0,
        type: Math.random() < 0.28 ? "star" : "circle"
      });
    }
  }

  function emitRainbowBurst(x, y) {
    const colors = ["#ff7db9", "#ffd86d", "#89eaff", "#a48dff", "#ffffff"];
    for (let i = 0; i < 20; i += 1) {
      spawnParticle(x, y, {
        vx: rand(-180, 180),
        vy: rand(-180, 20),
        gravity: 210,
        life: rand(0.45, 0.8),
        size: rand(3, 6),
        color: choice(colors),
        type: "star",
        front: true
      });
    }
  }

  function emitMintBurst(x, y) {
    const colors = ["#d9fff0", "#9cf0d0", "#66d6ae"];
    for (let i = 0; i < 12; i += 1) {
      spawnParticle(x, y, {
        vx: rand(-100, 100),
        vy: rand(-160, -40),
        gravity: 180,
        life: rand(0.35, 0.65),
        size: rand(3, 5),
        color: choice(colors),
        front: true,
        type: "star"
      });
    }
  }

  function spawnMeltDrip(platform) {
    const cfg = PLATFORM_TYPES[platform.type];
    spawnParticle(platform.x + rand(12, platform.w - 12), platform.y + 18, {
      vx: rand(-12, 12),
      vy: rand(30, 70),
      gravity: 260,
      life: rand(0.4, 0.7),
      size: rand(3, 5.5),
      color: cfg.dripColor,
      front: true,
      type: "drip",
      decay: 2.5
    });
  }

  function getSkyPalette(height) {
    const day = {
      top: "#a8ecff",
      mid: "#ffd9f7",
      bottom: "#fff1c7"
    };

    const sunset = {
      top: "#ff98c8",
      mid: "#ffc98c",
      bottom: "#9ed7ff"
    };

    const night = {
      top: "#6f59df",
      mid: "#372b7d",
      bottom: "#140f35"
    };

    if (height < 1800) {
      const t = clamp(height / 1800, 0, 1);
      return {
        top: mixColor(day.top, sunset.top, t),
        mid: mixColor(day.mid, sunset.mid, t),
        bottom: mixColor(day.bottom, sunset.bottom, t)
      };
    }

    const t = clamp((height - 1800) / 1800, 0, 1);
    return {
      top: mixColor(sunset.top, night.top, t),
      mid: mixColor(sunset.mid, night.mid, t),
      bottom: mixColor(sunset.bottom, night.bottom, t)
    };
  }

  function drawBackground() {
    const referenceHeight = START_WORLD_Y - (game.cameraY + H * 0.3);
    const palette = getSkyPalette(referenceHeight);

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, palette.top);
    gradient.addColorStop(0.48, palette.mid);
    gradient.addColorStop(1, palette.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    if (referenceHeight > 2500) {
      const starAlpha = clamp((referenceHeight - 2500) / 1600, 0, 0.7);
      ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
      for (let i = 0; i < 28; i += 1) {
        const x = (i * 67.4 + 29) % W;
        const y = (i * 37.7 + 13) % (H * 0.58);
        const twinkle = 1 + Math.sin(game.time * 2 + i) * 0.35;
        drawStar(x, y, 1 * twinkle, 2.4 * twinkle, 4);
        ctx.fill();
      }
    }

    for (const item of game.bgItems) {
      const sy = ((((item.y - game.cameraY * item.parallax) % (H + 220)) + (H + 220)) % (H + 220)) - 110;
      const x = item.x + Math.sin(game.time * item.speed + item.wobble) * 12;
      const s = item.size;

      ctx.save();
      ctx.translate(x, sy);

      if (item.kind === "cloud") {
        ctx.globalAlpha = 0.34;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.arc(-s * 0.28, 0, s * 0.28, 0, Math.PI * 2);
        ctx.arc(0, -s * 0.1, s * 0.34, 0, Math.PI * 2);
        ctx.arc(s * 0.28, 0, s * 0.26, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.kind === "candy") {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#ff8ebd";
        roundRectPath(ctx, -s * 0.25, -s * 0.16, s * 0.5, s * 0.32, s * 0.12);
        ctx.fill();
        ctx.fillStyle = "#ffd96f";
        ctx.beginPath();
        ctx.moveTo(-s * 0.25, 0);
        ctx.lineTo(-s * 0.45, -s * 0.12);
        ctx.lineTo(-s * 0.45, s * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(s * 0.25, 0);
        ctx.lineTo(s * 0.45, -s * 0.12);
        ctx.lineTo(s * 0.45, s * 0.12);
        ctx.closePath();
        ctx.fill();
      } else if (item.kind === "cone") {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "#ffe59a";
        ctx.beginPath();
        ctx.moveTo(0, s * 0.42);
        ctx.lineTo(-s * 0.22, -s * 0.08);
        ctx.lineTo(s * 0.22, -s * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff8ef";
        ctx.beginPath();
        ctx.arc(0, -s * 0.18, s * 0.24, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.kind === "waffle") {
        ctx.globalAlpha = 0.15;
        ctx.rotate(Math.PI * 0.25);
        ctx.fillStyle = "#deb370";
        roundRectPath(ctx, -s * 0.22, -s * 0.22, s * 0.44, s * 0.44, s * 0.08);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i += 1) {
          ctx.beginPath();
          ctx.moveTo(-s * 0.22, i * s * 0.08);
          ctx.lineTo(s * 0.22, i * s * 0.08);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(i * s * 0.08, -s * 0.22);
          ctx.lineTo(i * s * 0.08, s * 0.22);
          ctx.stroke();
        }
      } else {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = choice(["#ff9fd0", "#ffe389", "#91efff", "#ffffff"]);
        drawStar(0, 0, s * 0.12, s * 0.24, 4);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "rgba(255, 240, 248, 0.9)";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) {
      const y = H - 72 - Math.sin(x * 0.018 + game.time * 0.25) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) {
      const y = H - 46 - Math.sin(x * 0.022 + game.time * 0.38 + 2) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDangerZone() {
    const sy = game.dangerY - game.cameraY;
    if (sy > H + 50) return;

    ctx.save();

    const fill = ctx.createLinearGradient(0, sy, 0, H);
    fill.addColorStop(0, "rgba(255, 163, 206, 0.85)");
    fill.addColorStop(0.5, "rgba(255, 133, 185, 0.92)");
    fill.addColorStop(1, "rgba(255, 99, 164, 1)");

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, sy);
    for (let x = 0; x <= W; x += 18) {
      const wave = sy + Math.sin(x * 0.035 + game.time * 2.2) * 5 + Math.sin(x * 0.08 - game.time * 1.7) * 2;
      ctx.lineTo(x, wave);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (let i = 0; i < 10; i += 1) {
      const bubbleX = (i * 53 + Math.sin(game.time * 0.7 + i) * 12 + 20) % W;
      const bubbleY = sy + 24 + ((game.time * 26 + i * 39) % 150);
      ctx.beginPath();
      ctx.arc(bubbleX, bubbleY, 5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawPlatform(platform) {
    const y = platform.y - game.cameraY;
    if (y < -50 || y > H + 40) return;

    const cfg = PLATFORM_TYPES[platform.type];
    const melt = clamp(platform.melt, 0, 1);
    const fade = 1 - melt * 0.42;
    const dripLength = 4 + melt * 16;
    const topBulge = 10 - melt * 2.5;
    const bodyHeight = 14 - melt * 2.6;

    ctx.save();
    ctx.translate(platform.x, y);
    ctx.globalAlpha = fade;

    ctx.fillStyle = "rgba(69, 37, 94, 0.16)";
    ctx.beginPath();
    ctx.ellipse(platform.w * 0.5, 22, platform.w * 0.46, 7 - melt * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (platform.type === "rainbow") {
      roundRectPath(ctx, 0, 6, platform.w, bodyHeight + 5, 11);
      ctx.save();
      ctx.clip();
      const stripeWidth = platform.w / 5;
      const rainbowColors = ["#ff83bb", "#ffc85f", "#fff3a7", "#91ebff", "#a393ff"];
      rainbowColors.forEach((color, index) => {
        ctx.fillStyle = color;
        ctx.fillRect(index * stripeWidth, 0, stripeWidth + 1, 28);
      });
      ctx.restore();
      ctx.strokeStyle = cfg.outline;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      roundRectPath(ctx, 0, 6, platform.w, 6, 11);
      ctx.fill();
    } else {
      ctx.fillStyle = cfg.colors[cfg.colors.length - 1];
      roundRectPath(ctx, 0, 8, platform.w, bodyHeight + 5, 11);
      ctx.fill();

      ctx.fillStyle = cfg.colors[1];
      for (let i = 0; i < Math.max(3, Math.floor(platform.w / 40)); i += 1) {
        const t = i / Math.max(1, Math.floor(platform.w / 40));
        const cx = lerp(16, platform.w - 16, t);
        ctx.beginPath();
        ctx.arc(cx, 8, topBulge + seeded(platform.seed + i) * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = cfg.colors[0];
      roundRectPath(ctx, 6, 8, platform.w - 12, 8, 8);
      ctx.fill();

      ctx.strokeStyle = cfg.outline;
      ctx.lineWidth = 2.2;
      roundRectPath(ctx, 0, 8, platform.w, bodyHeight + 5, 11);
      ctx.stroke();
    }

    if (platform.type === "strawberry") {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      roundRectPath(ctx, 10, 10, platform.w * 0.35, 5, 8);
      ctx.fill();
    }

    if (platform.type === "chocolate") {
      ctx.strokeStyle = "rgba(255, 233, 200, 0.28)";
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i += 1) {
        const px = 10 + i * ((platform.w - 20) / 4);
        ctx.beginPath();
        ctx.moveTo(px, 8);
        ctx.lineTo(px - 6, 18);
        ctx.stroke();
      }
    }

    if (platform.type === "mint") {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 3; i += 1) {
        const px = platform.w * 0.28 + i * platform.w * 0.18;
        ctx.beginPath();
        ctx.moveTo(px, 19);
        ctx.lineTo(px, 12);
        ctx.lineTo(px - 5, 16);
        ctx.moveTo(px, 12);
        ctx.lineTo(px + 5, 16);
        ctx.stroke();
      }
    }

    if (platform.type === "vanilla") {
      for (let i = 0; i < 6; i += 1) {
        const px = 10 + seeded(platform.seed + i * 0.3) * (platform.w - 20);
        const py = 8 + seeded(platform.seed + i * 0.9) * 10;
        ctx.fillStyle = choice(["#ff80b7", "#77dfff", "#ffd462"]);
        ctx.fillRect(px, py, 4, 2);
      }
    }

    if (platform.melt > 0.06) {
      ctx.strokeStyle = `rgba(255,255,255,${0.22 + melt * 0.18})`;
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 3; i += 1) {
        const px = platform.w * (0.18 + i * 0.32 + seeded(platform.seed + i) * 0.08);
        ctx.beginPath();
        ctx.moveTo(px, 18);
        ctx.lineTo(px, 18 + dripLength * (0.6 + seeded(platform.seed + i * 2.3)));
        ctx.stroke();
      }
    }

    ctx.fillStyle = `rgba(255,255,255,${melt * 0.25})`;
    roundRectPath(ctx, 0, 7, platform.w, 16, 11);
    ctx.fill();

    ctx.restore();
  }

  function drawParticles(front) {
    for (const p of game.particles) {
      if (p.front !== front) continue;
      const sy = p.y - game.cameraY;
      if (sy < -40 || sy > H + 40) continue;

      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, sy);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.type === "star") {
        drawStar(0, 0, p.size * 0.5, p.size, 4);
        ctx.fill();
      } else if (p.type === "drip") {
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size * 0.8, -p.size * 0.2, p.size * 0.25, p.size);
        ctx.quadraticCurveTo(0, p.size * 1.4, -p.size * 0.25, p.size);
        ctx.quadraticCurveTo(-p.size * 0.8, -p.size * 0.2, 0, -p.size);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function drawPlayer() {
    const player = game.player;
    if (!player) return;

    const bob = game.state === "menu" || game.state === "how" ? Math.sin(game.time * 2.5) * 3 : 0;
    const x = player.x + player.w * 0.5;
    const y = player.y - game.cameraY + player.h * 0.5 + bob;

    const stretch = player.stretch * 0.15;
    const squash = player.squash * 0.12;
    const scaleX = 1 + squash - stretch * 0.6;
    const scaleY = 1 - squash * 0.52 + stretch;
    const tilt = (player.vx / MAX_RUN_SPEED) * 0.07 + player.panic * 0.12;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(scaleX, scaleY);

    ctx.fillStyle = "rgba(71, 42, 98, 0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 28, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#7c4a55";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.lineTo(-22, 10 + Math.sin(game.time * 12) * 1.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(22, 10 - Math.sin(game.time * 12) * 1.2);
    ctx.stroke();

    ctx.fillStyle = "#f4c57f";
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(-13, 0);
    ctx.lineTo(13, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(178, 121, 47, 0.55)";
    ctx.lineWidth = 1.2;
    for (let i = -10; i <= 10; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, 4);
      ctx.lineTo(i * 0.25, 24);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-10, 6 + i * 0.75);
      ctx.lineTo(10, 6 - i * 0.75);
      ctx.stroke();
    }

    ctx.fillStyle = "#fff1f6";
    ctx.beginPath();
    ctx.arc(0, -10, 18, 0, Math.PI * 2);
    ctx.arc(-10, -6, 10, 0, Math.PI * 2);
    ctx.arc(10, -6, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb6d1";
    ctx.beginPath();
    ctx.arc(0, -19, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7fa653";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(3, -28);
    ctx.stroke();

    const eyeY = player.panic > 0.35 ? -9 : -10;
    ctx.fillStyle = "#52356a";
    ctx.beginPath();
    ctx.arc(-6, eyeY, player.panic > 0.35 ? 2.4 : 2, 0, Math.PI * 2);
    ctx.arc(6, eyeY, player.panic > 0.35 ? 2.4 : 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff9ebc";
    ctx.beginPath();
    ctx.arc(-11, -4, 3.2, 0, Math.PI * 2);
    ctx.arc(11, -4, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#52356a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (player.panic > 0.35) {
      ctx.arc(0, -2, 4.2, 0, Math.PI * 2);
    } else {
      ctx.arc(0, -2, 5, 0.1, Math.PI - 0.1);
    }
    ctx.stroke();

    ctx.strokeStyle = "#7c4a55";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, 28);
    ctx.lineTo(-8, 36);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, 28);
    ctx.lineTo(8, 36);
    ctx.stroke();

    ctx.restore();
  }

  function drawFloatTexts() {
    for (const item of game.floatTexts) {
      const sy = item.y - game.cameraY;
      if (sy < -50 || sy > H + 50) continue;

      const alpha = clamp(item.life / item.maxLife, 0, 1);
      const growth = 1 + (1 - alpha) * 0.25;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(item.x, sy);
      ctx.scale(item.scale * growth, item.scale * growth);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `800 ${item.size}px Inter, Arial, sans-serif`;

      ctx.fillStyle = "rgba(77, 41, 103, 0.22)";
      ctx.fillText(item.text, 2, 2);

      ctx.fillStyle = item.color;
      ctx.fillText(item.text, 0, 0);
      ctx.restore();
    }
  }

  function drawComboFlash() {
    if (game.comboFlash <= 0) return;
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${game.comboFlash * 0.14})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawGameOverCurtain() {
    if (game.state !== "gameover") return;

    const progress = game.gameOverCurtain;
    const top = -H + progress * (H + 40);

    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = "rgba(255, 243, 248, 0.92)";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, top);
    for (let x = 0; x <= W; x += 24) {
      const drip = top + Math.sin(x * 0.05 + game.time * 3.6) * 8 + (x % 48 === 0 ? 18 : 0);
      ctx.lineTo(x, drip);
    }
    ctx.lineTo(W, -10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    const platforms = [...game.platforms].sort((a, b) => a.y - b.y);
    for (const platform of platforms) {
      drawPlatform(platform);
    }

    drawDangerZone();
    drawParticles(false);
    drawPlayer();
    drawParticles(true);
    drawFloatTexts();
    drawComboFlash();
    drawGameOverCurtain();
  }

  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    game.time += dt;

    if (game.state === "playing") {
      updateGameplay(dt);
    } else if (game.state === "gameover") {
      updateGameOver(dt);
    } else if (game.state === "menu" || game.state === "how") {
      updateMenuLike(dt);
    }

    draw();
    requestAnimationFrame(loop);
  }

  function handleKeyDown(event) {
    const code = event.code;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD"].includes(code)) {
      event.preventDefault();
    }

    if (code === "KeyA" || code === "ArrowLeft") {
      input.left = true;
    }

    if (code === "KeyD" || code === "ArrowRight") {
      input.right = true;
    }

    if (code === "Space" || code === "ArrowUp") {
      queueJump();
    }

    if (code === "Escape" || code === "KeyP") {
      if (game.state === "playing") {
        pauseGame();
      } else if (game.state === "paused") {
        resumeGame();
      } else if (game.state === "how") {
        goToMenu();
      }
    }

    if ((code === "Enter" || code === "Space") && game.state === "menu") {
      startGame();
    }
  }

  function handleKeyUp(event) {
    const code = event.code;

    if (code === "KeyA" || code === "ArrowLeft") {
      input.left = false;
    }

    if (code === "KeyD" || code === "ArrowRight") {
      input.right = false;
    }
  }

  function bindHoldButton(element, onStart, onEnd) {
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      onStart();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
      element.addEventListener(type, (event) => {
        event.preventDefault();
        onEnd();
      });
    });
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);

    ui.playBtn.addEventListener("click", () => {
      audio.ensure();
      startGame();
    });

    ui.howBtn.addEventListener("click", () => {
      openHow();
    });

    ui.backBtn.addEventListener("click", () => {
      goToMenu();
    });

    ui.pauseBtn.addEventListener("click", () => {
      pauseGame();
    });

    ui.resumeBtn.addEventListener("click", () => {
      resumeGame();
    });

    ui.restartBtn.addEventListener("click", () => {
      startGame();
    });

    ui.menuBtn.addEventListener("click", () => {
      goToMenu();
    });

    ui.playAgainBtn.addEventListener("click", () => {
      startGame();
    });

    ui.gameOverMenuBtn.addEventListener("click", () => {
      goToMenu();
    });

    ui.soundToggle.addEventListener("click", () => {
      audio.ensure();
      audio.toggleMute();
    });

    bindHoldButton(
      ui.btnLeft,
      () => {
        input.left = true;
      },
      () => {
        input.left = false;
      }
    );

    bindHoldButton(
      ui.btnRight,
      () => {
        input.right = true;
      },
      () => {
        input.right = false;
      }
    );

    bindHoldButton(
      ui.btnJump,
      () => {
        queueJump();
      },
      () => {}
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && game.state === "playing") {
        pauseGame();
      }
    });

    window.addEventListener("blur", () => {
      if (game.state === "playing") {
        pauseGame();
      }
    });
  }

  function init() {
    loadStats();
    createBackgroundItems();
    bindEvents();
    syncSoundButton();
    syncMenuStats();
    buildPreviewScene();
    refreshShellState();
    showOnlyScreen(startScreen);
    requestAnimationFrame(loop);
  }

  init();
})();
