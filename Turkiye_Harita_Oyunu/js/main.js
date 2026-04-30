import { REGION_BY_CODE, getEnergeticColor, shuffle } from "./data.js";
import { analyzeSpatialGraph, loadMap } from "./map.js";

const ui = {
  modeButtons: [...document.querySelectorAll(".mode-btn")],
  list: document.getElementById("provinceList"),
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
    combo: document.getElementById("comboCount"),
    score: document.getElementById("scoreCount")
  }
};

const state = {
  mode: "classic",
  selectedCode: null,
  targetCode: null,
  queue: [],
  queueIndex: 0,
  solved: new Set(),
  correct: 0,
  wrong: 0,
  combo: 0,
  score: 0
};

let mapModel;
let spatial;

init();

async function init() {
  try {
    mapModel = await loadMap(ui.mapContainer);
    spatial = analyzeSpatialGraph(mapModel.provinces);
    bindMapInteractions();
    bindModes();
    resetMode("classic");
  } catch (error) {
    ui.panelHint.textContent = "Harita yuklenemedi. Lutfen projeyi yerel sunucu ile ac.";
    ui.mapContainer.innerHTML = "<p style='padding:16px;color:#ff8c9b;'>Harita dosyasi yuklenemedi. `python -m http.server 5500` ile acmayi dene.</p>";
    console.error(error);
  }
}

function bindModes() {
  ui.modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => resetMode(btn.dataset.mode));
  });
}

function resetMode(mode) {
  state.mode = mode;
  state.selectedCode = null;
  state.targetCode = null;
  state.queue = shuffle(mapModel.provinces.map((p) => p.code));
  state.queueIndex = 0;
  state.solved = new Set();
  state.correct = 0;
  state.wrong = 0;
  state.combo = 0;
  state.score = 0;
  ui.questionCard.classList.add("hidden");
  ui.questionCard.innerHTML = "";
  ui.dragTokenWrap.innerHTML = "";
  mapModel.provinces.forEach((p) => {
    p.path.classList.remove("correct", "shake");
    p.path.style.fill = "";
  });
  ui.modeButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));

  if (mode === "classic") {
    ui.panelTitle.textContent = "Klasik Mod";
    ui.panelHint.textContent = "Listeden bir il sec. Surukle-birak veya secip haritadan tikla.";
    renderList();
  } else if (mode === "medium") {
    ui.panelTitle.textContent = "Orta Mod";
    ui.panelHint.textContent = "Haritada bir ile tikla. 5 secenekten dogru ili sec.";
    ui.list.innerHTML = "";
  } else {
    ui.panelTitle.textContent = "Zor Mod";
    ui.panelHint.textContent = "Sistemin verdigi ili dogru konuma birak.";
    ui.list.innerHTML = "";
    renderHardToken();
  }
  updateStats();
}

function bindMapInteractions() {
  mapModel.provinces.forEach((province) => {
    const path = province.path;
    path.addEventListener("dragover", (e) => e.preventDefault());
    path.addEventListener("drop", (e) => {
      e.preventDefault();
      const incomingCode = e.dataTransfer.getData("text/plain") || state.selectedCode;
      if (!incomingCode) return;
      processAttempt(incomingCode, province.code);
    });
    path.addEventListener("click", () => handleProvinceClick(province.code));
  });
}

function handleProvinceClick(clickedCode) {
  if (state.mode === "medium") {
    if (state.solved.has(clickedCode)) return;
    openQuestion(clickedCode);
    return;
  }
  if (state.selectedCode) {
    processAttempt(state.selectedCode, clickedCode);
  }
}

function renderList() {
  const sorted = [...mapModel.provinces].sort((a, b) => Number(a.code) - Number(b.code));
  ui.list.innerHTML = "";
  sorted.forEach((p) => {
    const chip = document.createElement("button");
    chip.className = "province-chip";
    chip.draggable = true;
    chip.textContent = p.name;
    chip.dataset.code = p.code;
    chip.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", p.code));
    chip.addEventListener("click", () => {
      state.selectedCode = p.code;
      [...ui.list.children].forEach((n) => n.classList.toggle("selected", n.dataset.code === p.code));
      toast(`${p.name} secildi. Haritada bir ile tikla veya birak.`, "warn");
    });
    ui.list.appendChild(chip);
  });
}

function renderHardToken() {
  const code = state.queue[state.queueIndex];
  state.targetCode = code;
  const province = mapModel.byCode[code];
  ui.dragTokenWrap.innerHTML = "";
  const token = document.createElement("div");
  token.className = "drag-token";
  token.textContent = `Siradaki il: ${province.name}`;
  token.draggable = true;
  token.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", code));
  token.addEventListener("click", () => {
    state.selectedCode = code;
    toast(`${province.name} secildi. Haritadan konum sec.`, "warn");
  });
  ui.dragTokenWrap.appendChild(token);
}

function processAttempt(targetCode, droppedOnCode) {
  if (state.solved.has(targetCode)) {
    return;
  }
  if (state.mode === "hard" && targetCode !== state.targetCode) {
    return;
  }

  const isCorrect = targetCode === droppedOnCode;
  if (isCorrect) {
    onCorrect(targetCode);
  } else {
    onWrong(targetCode, droppedOnCode);
  }

  state.selectedCode = null;
  [...ui.list.children].forEach((n) => n.classList.remove("selected"));
  updateStats();
}

function onCorrect(code) {
  state.correct += 1;
  state.combo += 1;
  state.score += 100 + (state.combo - 1) * 20;
  state.solved.add(code);

  const province = mapModel.byCode[code];
  province.path.classList.add("correct");
  province.path.style.fill = getEnergeticColor(Number(code));

  if (state.mode === "classic") {
    const chip = ui.list.querySelector(`[data-code="${code}"]`);
    if (chip) chip.classList.add("placed");
  }
  if (state.mode === "hard") {
    state.queueIndex += 1;
    if (state.queueIndex < state.queue.length) {
      renderHardToken();
    } else {
      ui.dragTokenWrap.innerHTML = "<div class='drag-token'>Tum iller tamamlandi!</div>";
    }
  }
  toast("Harika! Dogru il.", "ok");
}

function onWrong(targetCode, droppedOnCode) {
  state.wrong += 1;
  state.combo = 0;
  state.score = Math.max(0, state.score - 25);

  const dropped = mapModel.byCode[droppedOnCode];
  dropped.path.classList.add("shake");
  setTimeout(() => dropped.path.classList.remove("shake"), 380);

  let message = "Uzak kaldin";
  let tone = "bad";
  if (spatial.adjacency[targetCode].has(droppedOnCode)) {
    message = "Yaklastin";
    tone = "warn";
  } else if (REGION_BY_CODE[targetCode] === REGION_BY_CODE[droppedOnCode]) {
    message = "Fena degil";
    tone = "warn";
  }
  toast(message, tone);
}

function openQuestion(clickedCode) {
  const options = makeMediumOptions(clickedCode);
  const province = mapModel.byCode[clickedCode];
  ui.questionCard.classList.remove("hidden");
  ui.questionCard.innerHTML = `<h3>Bu ilin adi nedir?</h3><p>Secilen konum: <strong>${province.name}</strong> (ipuclu)</p>`;

  options.forEach((code) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = mapModel.byCode[code].name;
    btn.addEventListener("click", () => evaluateMediumAnswer(clickedCode, code, btn));
    ui.questionCard.appendChild(btn);
  });
}

function makeMediumOptions(correctCode) {
  const neighbors = [...spatial.adjacency[correctCode]];
  const nearest = spatial.distanceMap[correctCode].map((x) => x.code);
  const pool = shuffle([...neighbors, ...nearest]).filter((code, i, arr) => arr.indexOf(code) === i);
  const wrongs = pool.filter((c) => c !== correctCode).slice(0, 4);
  return shuffle([correctCode, ...wrongs]);
}

function evaluateMediumAnswer(correctCode, chosenCode, button) {
  if (state.solved.has(correctCode)) {
    return;
  }
  const buttons = [...ui.questionCard.querySelectorAll(".option-btn")];
  buttons.forEach((b) => (b.disabled = true));

  if (chosenCode === correctCode) {
    button.classList.add("correct-answer");
    onCorrect(correctCode);
  } else {
    button.classList.add("wrong-answer");
    const targetButton = buttons.find((b) => b.textContent === mapModel.byCode[correctCode].name);
    if (targetButton) targetButton.classList.add("correct-answer");
    onWrong(correctCode, chosenCode);
  }
  setTimeout(() => {
    ui.questionCard.classList.add("hidden");
    ui.questionCard.innerHTML = "";
  }, 650);
}

function updateStats() {
  const total = mapModel.provinces.length;
  ui.counts.correct.textContent = String(state.correct);
  ui.counts.wrong.textContent = String(state.wrong);
  ui.counts.remaining.textContent = String(total - state.solved.size);
  ui.counts.combo.textContent = String(state.combo);
  ui.counts.score.textContent = String(state.score);
}

function toast(message, tone) {
  ui.feedback.textContent = message;
  ui.feedback.className = `feedback show ${tone}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    ui.feedback.className = "feedback";
  }, 820);
}
