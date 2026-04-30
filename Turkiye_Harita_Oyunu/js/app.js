(function () {
  const REGION_BY_CODE = {
    "01": "Akdeniz", "02": "Guneydogu Anadolu", "03": "Ege", "04": "Dogu Anadolu", "05": "Karadeniz",
    "06": "Ic Anadolu", "07": "Akdeniz", "08": "Karadeniz", "09": "Ege", "10": "Marmara",
    "11": "Marmara", "12": "Dogu Anadolu", "13": "Dogu Anadolu", "14": "Karadeniz", "15": "Akdeniz",
    "16": "Marmara", "17": "Marmara", "18": "Ic Anadolu", "19": "Karadeniz", "20": "Ege",
    "21": "Guneydogu Anadolu", "22": "Marmara", "23": "Dogu Anadolu", "24": "Dogu Anadolu", "25": "Dogu Anadolu",
    "26": "Ic Anadolu", "27": "Guneydogu Anadolu", "28": "Karadeniz", "29": "Dogu Anadolu", "30": "Dogu Anadolu",
    "31": "Akdeniz", "32": "Akdeniz", "33": "Akdeniz", "34": "Marmara", "35": "Ege",
    "36": "Dogu Anadolu", "37": "Karadeniz", "38": "Ic Anadolu", "39": "Marmara", "40": "Ic Anadolu",
    "41": "Marmara", "42": "Ic Anadolu", "43": "Ege", "44": "Dogu Anadolu", "45": "Ege",
    "46": "Akdeniz", "47": "Guneydogu Anadolu", "48": "Ege", "49": "Dogu Anadolu", "50": "Ic Anadolu",
    "51": "Ic Anadolu", "52": "Karadeniz", "53": "Karadeniz", "54": "Marmara", "55": "Karadeniz",
    "56": "Guneydogu Anadolu", "57": "Karadeniz", "58": "Ic Anadolu", "59": "Marmara", "60": "Karadeniz",
    "61": "Karadeniz", "62": "Dogu Anadolu", "63": "Guneydogu Anadolu", "64": "Ege", "65": "Dogu Anadolu",
    "66": "Ic Anadolu", "67": "Karadeniz", "68": "Ic Anadolu", "69": "Karadeniz", "70": "Ic Anadolu",
    "71": "Ic Anadolu", "72": "Guneydogu Anadolu", "73": "Guneydogu Anadolu", "74": "Karadeniz", "75": "Dogu Anadolu",
    "76": "Dogu Anadolu", "77": "Marmara", "78": "Karadeniz", "79": "Akdeniz", "80": "Akdeniz",
    "81": "Karadeniz"
  };

  const ui = {
    modeButtons: [].slice.call(document.querySelectorAll(".mode-btn")),
    startOverlay: document.getElementById("startOverlay"),
    startButtons: [].slice.call(document.querySelectorAll(".start-mode-btn")),
    startGameBtn: document.getElementById("startGameBtn"),
    listTop: document.getElementById("provinceListTop"),
    listBottom: document.getElementById("provinceListBottom"),
    panelTitle: document.getElementById("panelTitle"),
    panelHint: document.getElementById("panelHint"),
    dragTokenWrap: document.getElementById("dragTokenWrap"),
    mapContainer: document.getElementById("mapContainer"),
    feedback: document.getElementById("feedback"),
    questionCard: document.getElementById("questionCard"),
    counts: {
      correct: document.getElementById("correctCount"),
      wrong: document.getElementById("wrongCount"),
      remaining: document.getElementById("remainingCount"),
      score: document.getElementById("scoreCount")
    }
  };

  const state = {
    mode: "classic",
    pendingStartMode: "classic",
    selectedCode: null,
    targetCode: null,
    queue: [],
    queueIndex: 0,
    solved: new Set(),
    correct: 0,
    wrong: 0,
    combo: 0,
    score: 0,
    labels: [],
    classicTopCapacity: 0,
    mediumCurrentCode: null,
    mediumQMark: null,
    passRemaining: 3
  };

  let mapModel;
  let spatial;

  init();

  function init() {
    if (!window.TURKEY_MAP_SVG) {
      ui.panelHint.textContent = "Harita verisi bulunamadı.";
      ui.mapContainer.innerHTML = "<p style='padding:16px;color:#ff8c9b;'>Harita verisi yüklenemedi.</p>";
      return;
    }

    mapModel = loadMapFromInline(ui.mapContainer, window.TURKEY_MAP_SVG);
    spatial = analyzeSpatialGraph(mapModel.provinces);
    bindMapInteractions();
    bindModes();
    bindStartOverlay();
    window.addEventListener("resize", handleResize);
    // Game will start when user clicks "Oyunu Başlat" in the overlay
  }

  function handleResize() {
    if (state.mode === "classic") {
      state.classicTopCapacity = computeClassicTopCapacity();
      renderList();
    } else if (state.mode === "medium" && state.mediumCurrentCode) {
      positionQuestionCard(state.mediumCurrentCode);
    }
  }

  function bindStartOverlay() {
    ui.startButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.pendingStartMode = btn.dataset.startMode;
        ui.startButtons.forEach(function (b) {
          b.classList.toggle("selected", b.dataset.startMode === state.pendingStartMode);
        });
      });
    });

    ui.startGameBtn.addEventListener("click", function () {
      ui.startOverlay.classList.add("hidden");
      resetMode(state.pendingStartMode);
    });
  }

  function bindModes() {
    ui.modeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        resetMode(btn.dataset.mode);
      });
    });
  }

  function resetMode(mode) {
    state.mode = mode;
    state.selectedCode = null;
    state.targetCode = null;
    state.queue = shuffle(mapModel.provinces.map(function (p) { return p.code; }));
    state.queueIndex = 0;
    state.solved = new Set();
    state.correct = 0;
    state.wrong = 0;
    state.combo = 0;
    state.score = 0;
    state.mediumCurrentCode = null;
    state.passRemaining = 3;
    clearAllLabels();
    clearMediumHighlight();
    ui.questionCard.classList.add("hidden");
    ui.questionCard.innerHTML = "";
    ui.dragTokenWrap.innerHTML = "";
    mapModel.provinces.forEach(function (p) {
      p.paths.forEach(function (pathEl) {
        pathEl.classList.remove("correct", "shake");
        pathEl.style.fill = "";
      });
    });
    ui.modeButtons.forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === mode);
    });

    if (mode === "classic") {
      state.classicTopCapacity = computeClassicTopCapacity();
      ui.panelTitle.textContent = "Klasik Mod:";
      ui.panelHint.textContent = "Listeden il seç, haritadaki doğru yerine bırak.";
      renderList();
      ui.listTop.style.display = "flex";
      ui.listBottom.style.display = "flex";
    } else if (mode === "medium") {
      ui.panelTitle.textContent = "Orta Mod:";
      ui.panelHint.textContent = "İşaretlenen ilin adını seçenekler arasından bul.";
      ui.listTop.innerHTML = "";
      ui.listBottom.innerHTML = "";
      ui.listTop.style.display = "none";
      ui.listBottom.style.display = "none";
      renderPassButton("medium");
      showNextMediumQuestion();
    } else {
      ui.panelTitle.textContent = "Zor Mod:";
      ui.panelHint.textContent = "İsmi verilen ili haritada doğru konuma tıklayarak bul.";
      ui.listTop.innerHTML = "";
      ui.listBottom.innerHTML = "";
      ui.listTop.style.display = "none";
      ui.listBottom.style.display = "none";
      renderHardToken();
    }
    updateStats();
  }

  function bindMapInteractions() {
    mapModel.provinces.forEach(function (province) {
      province.groups.forEach(function (group) {
        group.addEventListener("dragover", function (e) { e.preventDefault(); });
        group.addEventListener("drop", function (e) {
          e.preventDefault();
          const incomingCode = e.dataTransfer.getData("text/plain") || state.selectedCode;
          if (!incomingCode) return;
          processAttempt(incomingCode, province.code);
        });
        group.addEventListener("click", function () { handleProvinceClick(province.code); });
      });
    });
  }

  function handleProvinceClick(clickedCode) {
    if (state.mode === "medium") {
      return;
    }
    if (state.mode === "hard") {
      if (!state.targetCode) return;
      processAttempt(state.targetCode, clickedCode);
      return;
    }
    if (state.selectedCode) processAttempt(state.selectedCode, clickedCode);
  }

  function renderList() {
    const sorted = mapModel.provinces
      .filter(function (p) { return !state.solved.has(p.code); })
      .sort(function (a, b) { return Number(a.code) - Number(b.code); });
    const capacity = state.classicTopCapacity || computeClassicTopCapacity();
    const topCount = Math.min(capacity, sorted.length);
    const topPart = sorted.slice(0, topCount);
    const bottomPart = sorted.slice(topCount);
    ui.listTop.innerHTML = "";
    ui.listBottom.innerHTML = "";
    topPart.forEach(function (p) {
      ui.listTop.appendChild(createProvinceChip(p));
    });
    bottomPart.forEach(function (p) {
      ui.listBottom.appendChild(createProvinceChip(p));
    });
  }

  function createProvinceChip(p) {
      const chip = document.createElement("button");
      chip.className = "province-chip";
      chip.draggable = true;
      chip.textContent = p.name;
      chip.dataset.code = p.code;
      chip.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/plain", p.code); });
      chip.addEventListener("click", function () {
        state.selectedCode = p.code;
        getAllChips().forEach(function (n) {
          n.classList.toggle("selected", n.dataset.code === p.code);
        });
        toast(p.name + " seçildi. Haritada bir ile tıkla veya bırak.", "warn");
      });
      return chip;
  }

  function computeClassicTopCapacity() {
    const railWidth = ui.listTop.clientWidth || ui.mapContainer.clientWidth || 900;
    const estimatedChipWidth = 88;
    const gap = 6;
    const chipsPerRow = Math.max(6, Math.floor((railWidth + gap) / (estimatedChipWidth + gap)));
    return chipsPerRow * 3;
  }

  function renderHardToken() {
    const code = state.queue[state.queueIndex];
    state.targetCode = code;
    const province = mapModel.byCode[code];
    ui.dragTokenWrap.innerHTML = "";
    const row = document.createElement("div");
    row.className = "token-row";
    const token = document.createElement("div");
    token.className = "drag-token";
    token.textContent = "Sıradaki il: " + province.name;
    token.style.cursor = "default";
    row.appendChild(token);
    row.appendChild(createPassButton("hard"));
    ui.dragTokenWrap.appendChild(row);
  }

  function processAttempt(targetCode, droppedOnCode) {
    if (state.solved.has(targetCode)) return;
    if (state.mode === "hard" && targetCode !== state.targetCode) return;
    if (targetCode === droppedOnCode) onCorrect(targetCode);
    else onWrong(targetCode, droppedOnCode);
    state.selectedCode = null;
    getAllChips().forEach(function (n) { n.classList.remove("selected"); });
    updateStats();
  }

  function onCorrect(code) {
    state.correct += 1;
    state.combo += 1;
    state.score += 100 + (state.combo - 1) * 20;
    state.solved.add(code);

    const province = mapModel.byCode[code];
    province.paths.forEach(function (pathEl) {
      pathEl.classList.add("correct");
      pathEl.style.fill = getEnergeticColor(Number(code));
    });
    addProvinceLabel(province);

    if (state.mode === "classic") {
      renderList();
    }
    if (state.mode === "hard") {
      state.queueIndex += 1;
      if (state.queueIndex < state.queue.length) renderHardToken();
      else ui.dragTokenWrap.innerHTML = "<div class='drag-token'>Tüm iller tamamlandı!</div>";
    }
    if (state.mode === "medium") {
      state.mediumCurrentCode = null;
      setTimeout(function () {
        if (state.solved.size < mapModel.provinces.length) showNextMediumQuestion();
        else {
          clearMediumHighlight();
          ui.questionCard.classList.remove("hidden");
          ui.questionCard.innerHTML = "<h3>Tebrikler!</h3><p>Orta moddaki tüm illeri bildin.</p>";
        }
      }, 420);
    }
    updateStats();
    toast("Harika! Doğru il.", "ok");
  }

  function onWrong(targetCode, droppedOnCode) {
    state.wrong += 1;
    state.combo = 0;
    state.score = Math.max(0, state.score - 25);

    const dropped = mapModel.byCode[droppedOnCode];
    dropped.paths.forEach(function (pathEl) { pathEl.classList.add("shake"); });
    setTimeout(function () {
      dropped.paths.forEach(function (pathEl) { pathEl.classList.remove("shake"); });
    }, 380);

    let message = "Uzak kaldın";
    let tone = "bad";
    if (spatial.adjacency[targetCode].has(droppedOnCode)) {
      message = "Yaklaştın";
      tone = "warn";
    } else if (REGION_BY_CODE[targetCode] === REGION_BY_CODE[droppedOnCode]) {
      message = "Fena değil";
      tone = "warn";
    }
    updateStats();
    toast(message, tone);
  }

  function openQuestion(targetCode) {
    const options = makeMediumOptions(targetCode);
    ui.questionCard.classList.remove("hidden");
    ui.questionCard.innerHTML = "<h3>Bu ilin adı nedir?</h3>";
    options.forEach(function (code) {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = mapModel.byCode[code].name;
      btn.addEventListener("click", function () { evaluateMediumAnswer(targetCode, code, btn); });
      ui.questionCard.appendChild(btn);
    });
    positionQuestionCard(targetCode);
  }

  function makeMediumOptions(correctCode) {
    const neighbors = Array.from(spatial.adjacency[correctCode]);
    const nearest = spatial.distanceMap[correctCode].map(function (x) { return x.code; });
    const allCodes = mapModel.provinces.map(function (p) { return p.code; });
    const pool = shuffle(neighbors.concat(nearest).concat(allCodes)).filter(function (code, i, arr) {
      return arr.indexOf(code) === i;
    });
    const wrongs = pool.filter(function (c) { return c !== correctCode; }).slice(0, 4);
    return shuffle([correctCode].concat(wrongs));
  }

  function evaluateMediumAnswer(correctCode, chosenCode, button) {
    if (state.solved.has(correctCode)) return;
    const buttons = [].slice.call(ui.questionCard.querySelectorAll(".option-btn"));
    buttons.forEach(function (b) { b.disabled = true; });
    if (chosenCode === correctCode) {
      button.classList.add("correct-answer");
      onCorrect(correctCode);
    } else {
      button.classList.add("wrong-answer");
      onWrong(correctCode, chosenCode);
      setTimeout(function () {
        openQuestion(correctCode);
      }, 700);
    }
  }

  function showNextMediumQuestion() {
    const unsolved = mapModel.provinces
      .map(function (p) { return p.code; })
      .filter(function (code) { return !state.solved.has(code); });

    if (!unsolved.length) {
      clearMediumHighlight();
      return;
    }

    state.mediumCurrentCode = unsolved[Math.floor(Math.random() * unsolved.length)];
    highlightMediumTarget(state.mediumCurrentCode);
    openQuestion(state.mediumCurrentCode);
  }

  function highlightMediumTarget(code) {
    clearMediumHighlight();
    mapModel.provinces.forEach(function (p) {
      if (state.solved.has(p.code)) return;
      p.paths.forEach(function (pathEl) {
        pathEl.style.fill = "#d8dce9";
      });
    });

    const target = mapModel.byCode[code];
    target.paths.forEach(function (pathEl) {
      pathEl.style.fill = "#ff3b54";
      pathEl.classList.add("medium-target");
    });

    // Animated Question Mark
    const box = getProvinceBBox(target);
    const qMark = document.createElementNS("http://www.w3.org/2000/svg", "text");
    qMark.setAttribute("x", String(box.x + box.width / 2));
    qMark.setAttribute("y", String(box.y + box.height / 2 + 10));
    qMark.setAttribute("class", "medium-q-mark");
    qMark.textContent = "?";
    mapModel.svg.appendChild(qMark);
    state.mediumQMark = qMark;
  }

  function clearMediumHighlight() {
    if (state.mediumQMark && state.mediumQMark.parentNode) {
      state.mediumQMark.parentNode.removeChild(state.mediumQMark);
      state.mediumQMark = null;
    }
    mapModel.provinces.forEach(function (p) {
      p.paths.forEach(function (pathEl) {
        pathEl.classList.remove("medium-target");
      });
    });
  }

  function renderPassButton(mode) {
    ui.dragTokenWrap.innerHTML = "";
    const row = document.createElement("div");
    row.className = "token-row";
    row.appendChild(createPassButton(mode));
    ui.dragTokenWrap.appendChild(row);
  }

  function createPassButton(mode) {
    const passBtn = document.createElement("button");
    passBtn.className = "pass-btn";
    passBtn.textContent = "Pas Geç (" + state.passRemaining + ")";
    passBtn.disabled = state.passRemaining <= 0;
    passBtn.addEventListener("click", function () {
      if (mode === "medium") {
        passMedium();
      } else {
        passHard();
      }
    });
    return passBtn;
  }

  function passMedium() {
    if (state.passRemaining <= 0) {
      toast("Pas hakkı bitti", "bad");
      return;
    }
    if (!state.mediumCurrentCode || state.solved.size >= mapModel.provinces.length) return;
    state.passRemaining -= 1;
    state.wrong += 1;
    state.combo = 0;
    state.score = Math.max(0, state.score - 15);
    toast("Pas geçtin", "warn");
    updateStats();
    renderPassButton("medium");
    showNextMediumQuestion();
  }

  function passHard() {
    if (state.passRemaining <= 0) {
      toast("Pas hakkı bitti", "bad");
      return;
    }
    if (state.mode !== "hard" || state.queueIndex >= state.queue.length) return;
    state.passRemaining -= 1;
    const currentCode = state.queue.splice(state.queueIndex, 1)[0];
    state.queue.push(currentCode);
    state.wrong += 1;
    state.combo = 0;
    state.score = Math.max(0, state.score - 15);
    toast("Pas geçtin, il sıranın sonuna atıldı", "warn");
    updateStats();
    if (state.queueIndex < state.queue.length) {
      renderHardToken();
    } else {
      ui.dragTokenWrap.innerHTML = "<div class='drag-token'>Tüm iller tamamlandı!</div>";
    }
  }

  function updateStats() {
    const total = mapModel.provinces.length;
    ui.counts.correct.textContent = String(state.correct);
    ui.counts.wrong.textContent = String(state.wrong);
    ui.counts.remaining.textContent = String(total - state.solved.size);
    ui.counts.score.textContent = String(state.score);
  }

  function positionQuestionCard(code) {
    const target = mapModel.byCode[code];
    if (!target) return;

    const targetBox = getProvinceBBox(target);
    const mapRect = ui.mapContainer.getBoundingClientRect();
    const stageRect = ui.mapContainer.parentElement.getBoundingClientRect();
    const cardWidth = 360;
    const margin = 16;

    const targetCenterX = mapRect.left + targetBox.x + targetBox.width / 2;
    const targetCenterY = mapRect.top + targetBox.y + targetBox.height / 2;

    const spaceRight = stageRect.right - targetCenterX;
    const spaceLeft = targetCenterX - stageRect.left;

    let rightPx = margin;
    let leftPx = null;
    if (spaceLeft > spaceRight && spaceLeft > cardWidth + margin) {
      leftPx = margin;
      rightPx = null;
    }

    const relY = Math.max(margin, Math.min(targetCenterY - stageRect.top - 90, stageRect.height - 220));
    ui.questionCard.style.top = String(relY) + "px";
    if (rightPx !== null) {
      ui.questionCard.style.right = String(rightPx) + "px";
      ui.questionCard.style.left = "auto";
    } else {
      ui.questionCard.style.left = String(leftPx) + "px";
      ui.questionCard.style.right = "auto";
    }
  }

  function toast(message, tone) {
    ui.feedback.textContent = message;
    ui.feedback.className = "feedback show " + tone;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      ui.feedback.className = "feedback";
    }, 820);
  }

  function loadMapFromInline(container, svgText) {
    container.innerHTML = svgText;
    const svg = container.querySelector("svg");
    const provinceGroups = [].slice.call(svg.querySelectorAll("g[data-city-code]"));
    const provinceMap = {};

    provinceGroups.forEach(function (group) {
      const paths = [].slice.call(group.querySelectorAll("path"));
      paths.forEach(function (path) {
        path.classList.add("province");
      });

      const code = group.dataset.cityCode;
      const name = group.dataset.cityName;
      if (!provinceMap[code]) {
        provinceMap[code] = { code: code, name: name, paths: [], groups: [] };
      }
      provinceMap[code].paths = provinceMap[code].paths.concat(paths);
      provinceMap[code].groups.push(group);
    });

    const provinces = Object.keys(provinceMap)
      .sort(function (a, b) { return Number(a) - Number(b); })
      .map(function (code) { return provinceMap[code]; });

    return { svg: svg, provinces: provinces, byCode: Object.fromEntries(provinces.map(function (p) { return [p.code, p]; })) };
  }

  function addProvinceLabel(province) {
    const box = getProvinceBBox(province);
    const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textNode.setAttribute("x", String(box.x + box.width / 2));
    textNode.setAttribute("y", String(box.y + box.height / 2));
    textNode.setAttribute("class", "province-label");
    textNode.textContent = province.name;
    mapModel.svg.appendChild(textNode);
    state.labels.push(textNode);
  }

  function clearAllLabels() {
    state.labels.forEach(function (label) {
      if (label.parentNode) label.parentNode.removeChild(label);
    });
    state.labels = [];
  }

  function getAllChips() {
    return [].slice.call(document.querySelectorAll(".province-chip"));
  }

  function analyzeSpatialGraph(provinces) {
    const centers = {};
    const bboxes = {};
    provinces.forEach(function (p) {
      const box = getProvinceBBox(p);
      bboxes[p.code] = box;
      centers[p.code] = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    const adjacency = {};
    const distanceMap = {};
    provinces.forEach(function (a) {
      adjacency[a.code] = new Set();
      distanceMap[a.code] = [];
      provinces.forEach(function (b) {
        if (a.code === b.code) return;
        const d = distance(centers[a.code], centers[b.code]);
        distanceMap[a.code].push({ code: b.code, distance: d });
        if (boxesClose(bboxes[a.code], bboxes[b.code], 5) && d < 120) adjacency[a.code].add(b.code);
      });
      distanceMap[a.code].sort(function (x, y) { return x.distance - y.distance; });
    });
    return { centers: centers, adjacency: adjacency, distanceMap: distanceMap };
  }

  function getProvinceBBox(province) {
    const first = province.groups[0].getBBox();
    const merged = { x: first.x, y: first.y, width: first.width, height: first.height };

    province.groups.slice(1).forEach(function (group) {
      const box = group.getBBox();
      const minX = Math.min(merged.x, box.x);
      const minY = Math.min(merged.y, box.y);
      const maxX = Math.max(merged.x + merged.width, box.x + box.width);
      const maxY = Math.max(merged.y + merged.height, box.y + box.height);
      merged.x = minX;
      merged.y = minY;
      merged.width = maxX - minX;
      merged.height = maxY - minY;
    });

    return merged;
  }

  function boxesClose(a, b, margin) {
    return !(a.x + a.width + margin < b.x || b.x + b.width + margin < a.x || a.y + a.height + margin < b.y || b.y + b.height + margin < a.y);
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getEnergeticColor(seed) {
    const palette = ["#118DFF", "#FF8A00", "#8A2BE2", "#00C878", "#22C0FF", "#FF5B2E", "#9D44FF", "#09B46B"];
    return palette[seed % palette.length];
  }

  function shuffle(array) {
    const clone = array.slice();
    for (let i = clone.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = clone[i];
      clone[i] = clone[j];
      clone[j] = temp;
    }
    return clone;
  }
})();
