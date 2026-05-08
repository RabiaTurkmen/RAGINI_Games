'use strict';
const ICONS = ['🦊','🐺','🦁','🐯','🦅','🐉','🦋','🌙','⭐','🔥','💎','🗡️'];
const DIFF_INFO = {
  easy:'✓ Süre yok · Serbest oyun',
  medium:'⏱ Her hamle 10 saniye',
  hard:'⏱ 10 saniye + Harf zorunluluğu (S→O→S)'
};

/* ── STATE ── */
let ST = {};
function initState(mode, grid, diff, p1, p2) {
  const size = +grid;
  const p2Name = mode === 'cpu' ? 'Bilgisayar' : p2.name;
  return {
    mode, size, diff,
    board: Array(size*size).fill(null),
    owner: Array(size*size).fill(null),
    locked: Array(size*size).fill(false),   // true = locked
    lockedBy: Array(size*size).fill(null),  // which player locked it
    lockedTurn: Array(size*size).fill(null),// after which turn it expires
    turnCount: 0,
    current: 0,
    players: [
      {name:p1.name, icon:p1.icon, score:0, combo:0, hints:2,
       specials:{timeExtend:true,lockCell:true,changeLetter:true},
       sosList:[], maxCombo:0, totalSos:0, hintsUsed:0},
      {name:p2Name, icon:p2.icon, score:0, combo:0, hints:2,
       specials:{timeExtend:true,lockCell:true,changeLetter:true},
       sosList:[], maxCombo:0, totalSos:0, hintsUsed:0}
    ],
    selectedCell: null,
    forcedLetter: null,
    usedSosCombos: new Set(),
    lastMove: null,
    timer: null,
    timeLeft: 10,
    lockMode: false,
    cpuThinking: false,
    actionUsedThisTurn: false,
    finalPhase: false,
    gameOver: false,
    savedSetup: {mode, grid, diff, p1, p2}
  };
}

/* ── UI HELPERS ── */
const UI = {
  _mode:'two',
  _grid:'3',
  _diff:'easy',
  goHome() {
    UI.closeModal('modal-quit');
    Game.stopTimer();
    UI.show('screen-home');
  },
  goToSetup(mode) {
    UI._mode = mode;
    UI.show('screen-setup');
    const isCPU = mode === 'cpu';
    document.getElementById('p2-label').textContent = isCPU ? 'Bilgisayar' : 'Oyuncu 2';
    document.getElementById('p2-name-field').style.display = isCPU ? 'none' : '';
    document.getElementById('p2-icon-field').style.display = isCPU ? 'none' : '';
    
    const card2 = document.getElementById('player2-card');
    const cpuDisp = document.getElementById('cpu-icon-display');
    
    if(isCPU) {
      document.getElementById('p2-name').value = 'Bilgisayar';
      card2.classList.add('cpu-mode');
      cpuDisp.style.display = 'block';
      // Auto-select computer icon if not already set or if it clashes with P1
      if(!UI._p2Icon || UI._p2Icon === UI._p1Icon) {
        UI._p2Icon = ICONS.find(ic => ic !== UI._p1Icon);
      }
      cpuDisp.textContent = UI._p2Icon;
    } else {
      document.getElementById('p2-name').value = '';
      card2.classList.remove('cpu-mode');
      cpuDisp.style.display = 'none';
    }
    UI.renderIconGrids();
    UI.updateDiffInfo();
  },
  show(id) {
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },
  selectSetting(type, val, btn) {
    const grp = btn.closest('.toggle-group');
    grp.querySelectorAll('.toggle-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if(type==='grid') UI._grid=val;
    else { UI._diff=val; UI.updateDiffInfo(); }
  },
  updateDiffInfo() {
    document.getElementById('difficulty-info').innerHTML =
      `<span class="diff-badge">${DIFF_INFO[UI._diff]}</span>`;
  },
  renderIconGrids() {
    ['p1','p2'].forEach((p,pi)=>{
      const g = document.getElementById(`${p}-icon-grid`);
      const otherIcon = pi === 0 ? UI._p2Icon : UI._p1Icon;
      const currentIcon = pi === 0 ? UI._p1Icon : UI._p2Icon;

      g.innerHTML = ICONS.map((ic,i)=>{
        const isOther = ic === otherIcon;
        const isSelected = ic === currentIcon;
        const cls = `icon-btn ${isSelected ? (pi===0?'selected':'p2-selected') : ''} ${isOther ? 'disabled' : ''}`;
        return `<button class="${cls}" data-icon="${ic}" data-player="${pi}"
          ${isOther ? 'disabled' : ''}
          onclick="UI.selectIcon(${pi},'${ic}',this)">${ic}</button>`;
      }).join('');
    });
  },
  selectIconDefault() {
    const g1 = document.getElementById('p1-icon-grid');
    const g2 = document.getElementById('p2-icon-grid');
    g1.querySelector('.icon-btn')?.click();
    g2.querySelectorAll('.icon-btn')[1]?.click();
  },
  _p1Icon: ICONS[0], _p2Icon: ICONS[1],
  selectIcon(player, icon, btn) {
    if(player === 0) UI._p1Icon = icon;
    else UI._p2Icon = icon;
    UI.renderIconGrids();
  },
  confirmQuit() { document.getElementById('modal-quit').style.display='flex'; },
  closeModal(id) { document.getElementById(id).style.display='none'; },
  toast(msg, dur=2200) {
    const t = document.getElementById('toast');
    t.textContent=msg; t.classList.add('show');
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(()=>t.classList.remove('show'), dur);
  },
  floatScore(pts, el) {
    const r = el.getBoundingClientRect();
    const div = document.createElement('div');
    div.className='score-float';
    div.textContent=(pts>0?'+':'')+pts;
    div.style.cssText=`left:${r.left+r.width/2}px;top:${r.top}px;color:${pts>0?'#34d399':'#ef4444'}`;
    document.body.appendChild(div);
    setTimeout(()=>div.remove(), 900);
  }
};

/* ── GAME ── */
const Game = {
  start() {
    const p1name = document.getElementById('p1-name').value.trim()||'Oyuncu 1';
    const p2name = document.getElementById('p2-name').value.trim()||(UI._mode==='cpu'?'Bilgisayar':'Oyuncu 2');
    if(UI._p1Icon===UI._p2Icon){UI.toast('Farklı simge seçin!');return;}
    ST = initState(UI._mode, UI._grid, UI._diff,
      {name:p1name, icon:UI._p1Icon},
      {name:p2name, icon:UI._p2Icon}
    );
    ST.current = Math.random()<.5?0:1;
    Game.renderBoard();
    Game.renderHUD();
    Game.updateSpecialBtns();
    UI.show('screen-game');
    const tw = document.getElementById('timer-wrapper');
    if(tw) tw.style.display = ST.diff==='easy'?'none':'flex';
    document.getElementById('final-phase-banner').style.display='none';
    Game.startTurn();
  },

  renderBoard() {
    const b = document.getElementById('board');
    b.className=`board grid-${ST.size}`;
    b.innerHTML='';
    for(let i=0;i<ST.size*ST.size;i++){
      const c=document.createElement('div');
      c.className='cell';
      c.id=`cell-${i}`;
      c.onclick=()=>Game.clickCell(i);
      b.appendChild(c);
    }
  },

  renderHUD() {
    ST.players.forEach((p,i)=>{
      const n=i+1;
      // Side Cards
      document.getElementById(`side-icon-${n}`).textContent=p.icon;
      document.getElementById(`side-name-${n}`).textContent=p.name;
      document.getElementById(`side-score-${n}`).textContent=p.score;
      const scb=document.getElementById(`side-combo-${n}`);
      if(p.combo>1){
        scb.classList.add('show');
        scb.textContent=`${p.combo}x COMBO`;
      } else {
        scb.classList.remove('show');
      }

      // Hidden HUD (fallback for logic that might still use it)
      document.getElementById(`score-icon-${n}`).textContent=p.icon;
      document.getElementById(`score-name-${n}`).textContent=p.name;
      document.getElementById(`score-points-${n}`).textContent=p.score;
    });
    document.getElementById('hint-count').textContent=ST.players[ST.current].hints;
    Game.updateTurnIndicator();
  },

  updateTurnIndicator() {
    const p=ST.players[ST.current];
    document.getElementById('turn-icon').textContent=p.icon;
    document.getElementById('turn-name').textContent=p.name;
    const hint = ST.diff==='hard'&&ST.forcedLetter?
      `Zorunlu harf: ${ST.forcedLetter}`:'';
    document.getElementById('letter-hint').textContent=hint;
    
    // Active player highlight on side cards
    document.getElementById('side-card-1').classList.toggle('active', ST.current===0);
    document.getElementById('side-card-2').classList.toggle('active', ST.current===1);
    Game.updateLetterSelector();
  },

  updateLetterSelector() {},

  selectLetter(l) {
    if(ST.diff==='hard'&&ST.forcedLetter&&l!==ST.forcedLetter){
      UI.toast(`Zorunlu harf: ${ST.forcedLetter}`); return;
    }
    // used only by CPU/hint paths
  },

  updateSpecialBtns() {
    const p=ST.players[ST.current];
    const timed=ST.diff!=='easy';
    ['timeExtend','lockCell','changeLetter'].forEach(k=>{
      const ids={timeExtend:'btn-time-extend',lockCell:'btn-lock-cell',changeLetter:'btn-change-letter'};
      const el=document.getElementById(ids[k]);
      el.disabled=!p.specials[k]||(k==='timeExtend'&&!timed)||ST.actionUsedThisTurn;
    });
    document.getElementById('btn-hint').disabled=p.hints<=0||ST.actionUsedThisTurn;
    document.getElementById('hint-count').textContent=p.hints;
  },

  startTurn() {
    if(ST.gameOver) return;
    ST.actionUsedThisTurn=false;
    ST.selectedCell=null;
    Game.hideCellPicker();
    Game.updateSpecialBtns();
    Game.renderHUD();
    if(ST.mode==='cpu'&&ST.current===1) {
      ST.cpuThinking=true;
      if(ST.diff!=='easy') Game.startTimer();
      setTimeout(()=>{ ST.cpuThinking=false; Game.cpuMove(); }, 900);
    } else {
      ST.cpuThinking=false;
      if(ST.diff!=='easy') Game.startTimer();
    }
  },

  startTimer() {
    Game.stopTimer();
    ST.timeLeft=10;
    Game.renderTimer();
    const tw=document.getElementById('timer-wrapper');
    tw.classList.remove('timer-urgent');
    ST.timer=setInterval(()=>{
      ST.timeLeft--;
      Game.renderTimer();
      if(ST.timeLeft<=3) tw.classList.add('timer-urgent');
      if(ST.timeLeft<=0){ Game.timeOut(); }
    },1000);
  },

  stopTimer() {
    clearInterval(ST.timer); ST.timer=null;
    document.getElementById('timer-wrapper').classList.remove('timer-urgent');
  },

  renderTimer() {
    const frac=ST.timeLeft/10;
    const circ=2*Math.PI*18;
    document.getElementById('timer-ring-fill').style.strokeDashoffset=circ*(1-frac);
    document.getElementById('timer-text').textContent=ST.timeLeft;
  },

  timeOut() {
    Game.stopTimer();
    const p=ST.players[ST.current];
    p.score=Math.max(0,p.score-1);
    p.combo=0;
    UI.toast(`⏰ Süre doldu! ${p.name} 1 puan kaybetti.`);
    Game.nextTurn();
  },

  clickCell(idx) {
    if(ST.gameOver) return;
    if(ST.cpuThinking) return;                            // block human during CPU turn
    if(ST.mode==='cpu'&&ST.current===1) return;           // extra guard
    if(ST.lockMode){ Game.doLockCell(idx); return; }
    if(ST.board[idx]!==null){ UI.toast('Bu hücre dolu!'); return; }
    if(ST.locked[idx]&&ST.lockedBy[idx]!==ST.current){ UI.toast('Bu hücre kilitli!'); return; }
    // deselect if same cell tapped again
    if(ST.selectedCell===idx){ Game.hideCellPicker(); ST.selectedCell=null; return; }
    ST.selectedCell=idx;
    Game.showCellPicker(idx);
  },

  showCellPicker(idx) {
    Game.hideCellPicker();
    const cell = document.getElementById(`cell-${idx}`);
    if(!cell) return;
    cell.classList.add('cell-selected');
    const picker = document.createElement('div');
    picker.id='cell-picker';
    picker.className='cell-picker';
    const forced = ST.diff==='hard'&&ST.forcedLetter;
    const letters = forced?[ST.forcedLetter]:['S','O'];
    letters.forEach(l=>{
      const btn=document.createElement('button');
      btn.className='cell-pick-btn';
      btn.textContent=l;
      btn.onclick=(e)=>{ e.stopPropagation(); Game.confirmCellLetter(l); };
      picker.appendChild(btn);
    });
    cell.appendChild(picker);
  },

  hideCellPicker() {
    document.getElementById('cell-picker')?.remove();
    document.querySelectorAll('.cell-selected').forEach(el=>el.classList.remove('cell-selected'));
    document.querySelectorAll('.hint-cell').forEach(el=>el.classList.remove('hint-cell'));
  },

  confirmCellLetter(letter) {
    const idx=ST.selectedCell;
    if(idx===null||idx===undefined) return;
    ST.selectedCell=null;
    Game.hideCellPicker();
    Game.placeMove(idx, ST.current, letter);
  },

  placeMove(idx, player, letter) {
    Game.stopTimer();
    ST.board[idx]=letter;
    ST.owner[idx]=player;
    ST.lastMove={idx,player,letter};

    ST.turnCount++;
    // expire locks that were set last turn
    ST.locked=ST.locked.map((v,i)=>v&&ST.lockedTurn[i]>ST.turnCount?v:false);

    const el=document.getElementById(`cell-${idx}`);
    el.textContent=letter;
    el.classList.add('taken',`p${player+1}-letter`);

    const found=Game.checkSOS(idx, player, letter);
    const isFinal=Game.checkFinalPhase();

    let pts=0;
    const p=ST.players[player];
    if(found.length>0){
      let base=found.length;
      if(isFinal) base+=found.length; // ekstra
      if(found.length>1) base+=found.length-1; // multi-SOS bonus
      p.combo++;
      if(p.combo>3) p.combo=3;
      const comboMult=p.combo>=2?p.combo:1;
      pts=base*comboMult;
      p.score+=pts;
      p.totalSos+=found.length;
      p.maxCombo=Math.max(p.maxCombo,p.combo);
      Game.highlightSOS(found);
      const scoreEl=document.getElementById(`score-points-${player+1}`);
      UI.floatScore(pts, scoreEl);
      UI.toast(`${found.length>1?'🔥 Multi-':''}SOS! +${pts} puan${p.combo>1?' ('+p.combo+'x COMBO!)':''}`);
      Game.startTurn(); // same player plays again
    } else {
      p.combo=0;
      Game.nextTurn();
    }

    // hard mode forced letter
    if(ST.diff==='hard') {
      ST.forcedLetter = letter==='S'?'O':'S';
    }

    Game.renderHUD();

    const empty=ST.board.filter(v=>v===null).length;
    if(empty===0){ setTimeout(()=>Game.endGame(),600); return; }
  },

  nextTurn() {
    ST.current=1-ST.current;
    // unlock cells for new turn
    Game.renderBoard2();
    Game.startTurn();
  },

  renderBoard2() {
    for(let i=0;i<ST.size*ST.size;i++){
      const el=document.getElementById(`cell-${i}`);
      if(!el) continue;
      if(ST.locked[i]){
        el.classList.add('locked');
      } else {
        el.classList.remove('locked');
      }
    }
  },

  checkSOS(idx, player, letter) {
    const s=ST.size;
    const row=Math.floor(idx/s), col=idx%s;
    const dirs=[[0,1],[1,0],[1,1],[1,-1]];
    const found=[];
    dirs.forEach(([dr,dc])=>{
      // check all 3-combos containing idx
      for(let start=-2;start<=0;start++){
        const cells=[0,1,2].map(k=>{
          const r=row+(start+k)*dr, c=col+(start+k)*dc;
          if(r<0||r>=s||c<0||c>=s) return null;
          return r*s+c;
        });
        if(cells.includes(null)) continue;
        const key=cells.slice().sort((a,b)=>a-b).join(',');
        if(ST.usedSosCombos.has(key)) continue;
        const letters=cells.map(ci=>ST.board[ci]);
        if(letters[0]==='S'&&letters[1]==='O'&&letters[2]==='S'){
          ST.usedSosCombos.add(key);
          found.push(cells);
        }
      }
    });
    return found;
  },

  highlightSOS(groups) {
    groups.forEach(cells=>{
      cells.forEach(ci=>{
        const el=document.getElementById(`cell-${ci}`);
        el?.classList.add('sos-highlight');
        setTimeout(()=>el?.classList.remove('sos-highlight'),600);
      });
    });
  },

  checkFinalPhase() {
    const empty=ST.board.filter(v=>v===null).length;
    const isFinal=empty<=3;
    document.getElementById('final-phase-banner').style.display=isFinal?'block':'none';
    ST.finalPhase=isFinal;
    return isFinal;
  },

  /* ── HINT ── */
  useHint() {
    if(ST.mode==='cpu'&&ST.current===1) return;
    const p=ST.players[ST.current];
    if(p.hints<=0){UI.toast('İpucu hakkınız kalmadı!');return;}
    if(ST.actionUsedThisTurn){UI.toast('Bu tur zaten bir aksiyon kullandınız!');return;}
    const best=Game.findBestMove();
    if(!best){UI.toast('Uygun hamle bulunamadı.');return;}
    p.hints--;
    p.hintsUsed++;
    p.combo=0;
    ST.actionUsedThisTurn=true;
    Game.hideCellPicker();
    ST.selectedCell=best.idx;
    const el=document.getElementById(`cell-${best.idx}`);
    el?.classList.add('hint-cell');
    Game.showCellPicker(best.idx);
    // pre-highlight the suggested letter in picker
    document.querySelectorAll('.cell-pick-btn').forEach(b=>{
      if(b.textContent===best.letter) b.classList.add('pick-hint');
    });
    UI.toast(`💡 Öneri: Hücre ${best.idx+1} → ${best.letter} (${best.pts>0?'+'+best.pts+' puan':'hamle'})`);
    Game.updateSpecialBtns();
  },

  findBestMove() {
    let best=null, bestPts=-1;
    const letters = ST.diff==='hard'&&ST.forcedLetter?[ST.forcedLetter]:['S','O'];
    for(let i=0;i<ST.board.length;i++){
      if(ST.board[i]!==null||ST.locked[i]) continue;
      letters.forEach(l=>{
        ST.board[i]=l;
        const found=Game.checkSOS(i, ST.current, l);
        // revert usedSosCombos additions
        found.forEach(cells=>{
          const key=cells.slice().sort((a,b)=>a-b).join(',');
          ST.usedSosCombos.delete(key);
        });
        ST.board[i]=null;
        const pts=found.length;
        if(pts>bestPts){bestPts=pts;best={idx:i,letter:l,pts};}
      });
    }
    return best;
  },

  /* ── SPECIALS ── */
  useSpecial(type) {
    if(ST.actionUsedThisTurn){UI.toast('Bu tur zaten bir aksiyon kullandınız!');return;}
    const p=ST.players[ST.current];
    if(!p.specials[type]){UI.toast('Bu hakkı zaten kullandınız!');return;}
    if(type==='timeExtend') {
      if(ST.diff==='easy'){UI.toast('Süreli modlarda kullanılabilir.');return;}
      p.score=Math.max(0,p.score-1);
      ST.timeLeft+=5;
      Game.renderTimer();
      p.specials.timeExtend=false;
      ST.actionUsedThisTurn=true;
      UI.toast('+5 saniye eklendi! (-1 puan)');
      Game.updateSpecialBtns();
    } else if(type==='lockCell') {
      p.specials.lockCell=false;
      ST.actionUsedThisTurn=true;
      ST.lockMode=true;
      document.getElementById('lock-mode-banner').style.display='flex';
      Game.updateSpecialBtns();
    } else if(type==='changeLetter') {
      if(!ST.lastMove||ST.lastMove.player!==ST.current){
        UI.toast('Değiştirilecek son hamle yok!'); return;
      }
      const {idx,letter}=ST.lastMove;
      const newLetter=letter==='S'?'O':'S';
      ST.board[idx]=newLetter;
      const el=document.getElementById(`cell-${idx}`);
      el.textContent=newLetter;
      p.specials.changeLetter=false;
      ST.actionUsedThisTurn=true;
      ST.lastMove.letter=newLetter;
      UI.toast(`Harf değiştirildi: ${letter} → ${newLetter}`);
      Game.updateSpecialBtns();
    }
  },

  doLockCell(idx) {
    if(ST.board[idx]!==null){UI.toast('Sadece boş hücre kilitlenebilir!');return;}
    ST.locked[idx]=true;
    ST.lockedBy[idx]=ST.current;        // locked by current player
    ST.lockedTurn[idx]=ST.turnCount+2; // expires after opponent's next turn
    // show lock icon to opponent, not to locker
    ST.lockMode=false;
    document.getElementById('lock-mode-banner').style.display='none';
    UI.toast('Hücre bir tur boyunca kilitlendi! 🔒');
    Game.renderBoard2();
  },

  cancelLockMode() {
    ST.lockMode=false;
    document.getElementById('lock-mode-banner').style.display='none';
    ST.players[ST.current].specials.lockCell=true;
    ST.actionUsedThisTurn=false;
    Game.updateSpecialBtns();
  },

  /* ── CPU AI ── */
  cpuMove() {
    if(ST.gameOver) return;
    const letters = ST.diff==='hard'&&ST.forcedLetter?[ST.forcedLetter]:['S','O'];
    // find best move
    let best=Game.findBestMove();
    if(!best){
      // random empty
      const empties=ST.board.map((v,i)=>v===null&&!ST.locked[i]?i:null).filter(v=>v!==null);
      if(empties.length===0){Game.endGame();return;}
      const idx=empties[Math.floor(Math.random()*empties.length)];
      const l=letters[Math.floor(Math.random()*letters.length)];
      best={idx,letter:l};
    }
    Game.placeMove(best.idx, 1, best.letter);
  },

  /* ── END GAME ── */
  endGame() {
    ST.gameOver=true;
    Game.stopTimer();
    const [p0,p1]=ST.players;
    const winner=p0.score>p1.score?0:p1.score>p0.score?1:null;

    document.getElementById('results-trophy').textContent=winner===null?'🤝':'🏆';
    document.getElementById('results-winner').textContent=
      winner===null?'Berabere!':`${ST.players[winner].name} Kazandı!`;
    document.getElementById('results-subtitle').textContent= '';

    const sc=document.getElementById('results-scores');
    sc.innerHTML=ST.players.map((p,i)=>`
      <div class="result-score-card${winner===i?' winner':''}">
        <div class="rsc-icon">${p.icon}</div>
        <div class="rsc-name">${p.name}</div>
        <div class="rsc-score" style="color:var(--${i===0?'p1':'p2'})">${p.score}</div>
      </div>`).join('');

    const sg=document.getElementById('stats-grid');
    sg.innerHTML=`
      <div class="stat-item"><div class="stat-label">Toplam SOS</div>
        <div class="stat-value">${p0.totalSos} vs ${p1.totalSos}</div></div>
      <div class="stat-item"><div class="stat-label">En Yüksek Combo</div>
        <div class="stat-value">${p0.maxCombo}x vs ${p1.maxCombo}x</div></div>
      <div class="stat-item"><div class="stat-label">İpucu Kullanımı</div>
        <div class="stat-value">${p0.hintsUsed} vs ${p1.hintsUsed}</div></div>
      <div class="stat-item"><div class="stat-label">Grid / Zorluk</div>
        <div class="stat-value">${ST.size}×${ST.size} / ${ST.diff==='easy'?'Kolay':ST.diff==='medium'?'Orta':'Zor'}</div></div>`;

    UI.show('screen-results');
  },

  playAgain() {
    const s=ST.savedSetup;
    UI._mode=s.mode; UI._grid=s.grid; UI._diff=s.diff;
    UI._p1Icon=s.p1.icon; UI._p2Icon=s.p2.icon;
    ST=initState(s.mode,s.grid,s.diff,s.p1,s.p2);
    ST.current=Math.random()<.5?0:1;
    Game.renderBoard();
    Game.renderHUD();
    Game.updateSpecialBtns();
    const tw = document.getElementById('timer-wrapper');
    if(tw) tw.style.display=ST.diff==='easy'?'none':'flex';
    document.getElementById('final-phase-banner').style.display='none';
    UI.show('screen-game');
    Game.startTurn();
  }
};

// init icon grids on load
window.addEventListener('DOMContentLoaded', ()=>{
  UI.renderIconGrids();
  
  // Close cell picker when clicking outside
  document.addEventListener('click', (e) => {
    if(!ST.selectedCell) return;
    const isCell = e.target.closest('.cell');
    const isPicker = e.target.closest('.cell-picker');
    if(!isCell && !isPicker) {
      ST.selectedCell = null;
      Game.hideCellPicker();
    }
  });
});
