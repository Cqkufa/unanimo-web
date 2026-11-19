// ================= TERMÓMETRO =================
// Wavelength-style party game. Each round one player ("el que da la pista")
// gets a scale between two extremes (Frío ↔ Caliente, Cheto ↔ Rasca…) and a
// secret point on it. They write a clue that sits at that point; everyone
// else moves their needle to where they think it is. Closer = more points.
// The clue-giver earns the average of what the others scored, so a good
// clue pays off for everybody. The giver rotates; N laps around the table.
//
// Host-authoritative, like the other modules:
//  - The secret point lives only in host memory (this.tmSecret) and is sent
//    privately to the giver (event tmTarget). Guesses stay in host memory
//    until the reveal; shared state only says WHO already guessed.
//  - Guests re-send their clue / guess until the host's state confirms it
//    (broadcast has no delivery guarantee). Duplicates are ignored.

import { ESCALAS } from './termometrobank.js';

/* ===================== 1. PURE LOGIC ===================== */
export const TM_CLUE_MAX = 40;
const TM_GRACE_MS = 2500;
// Band half-widths around the target, in scale units (0–100).
export const TM_BANDS = [ { half:3.5, pts:4 }, { half:10.5, pts:3 }, { half:17.5, pts:2 } ];

export function tmDefaultConfig(){ return { laps:1, clueTime:60, guessTime:45 }; }
export function tmPoints(guess, target){
  const d = Math.abs(Number(guess) - Number(target));
  for(const b of TM_BANDS) if(d <= b.half) return b.pts;
  return 0;
}
export function tmGiverPoints(pointsList){
  if(!pointsList.length) return 0;
  return Math.round(pointsList.reduce((a,b)=>a+b,0) / pointsList.length);
}
export const tmClamp = v => Math.max(0, Math.min(100, Math.round(Number(v)*2)/2));
export const tmCleanClue = s => String(s??'').replace(/\s+/g,' ').trim().slice(0, TM_CLUE_MAX);
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ===================== 2. INTEGRATION ===================== */
export function installTermometro(Game, ui){
  const { INK, CORAL, MINT, YEL, BLUE, VIOLET, avatarSVG, esc, mmss, beep } = ui;

  const waitBox = (who, verb)=>`<div style="min-height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:15px;color:var(--muted);padding:8px 14px;text-align:center">${esc(who)} ${verb}<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
  const optBtn = (action, val, label, on)=>`<button data-action="${action}" data-val="${val}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${on?INK:'#fff'};color:${on?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${label}</button>`;
  const kicker = t=>`<div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">${t}</div>`;

  // The dial: a half-circle gauge like the board game's (cream face, dark rim,
  // scalloped edge, red needle on a red pivot). 0 = far left, 100 = far right.
  //  opts.target   → draw the scoring wedge (2·3·4·3·2) around it
  //  opts.needles  → [{v, p, me}] players' needles with their avatar (reveal)
  //  opts.handle   → value of the player's draggable needle (guessing)
  //  opts.animate  → wedge/needles animate in
  const CX = 200, CY = 214, R = 168;
  const pt = (v, r)=>{ const th = Math.PI*(1 - v/100); return [CX + r*Math.cos(th), CY - r*Math.sin(th)]; };
  const f = n=>n.toFixed(1);
  const wedge = (v1, v2, r)=>{ v1=Math.max(0,v1); v2=Math.min(100,v2); if(v2<=v1) return ''; const [x1,y1]=pt(v1,r), [x2,y2]=pt(v2,r); return `M${CX},${CY} L${f(x1)},${f(y1)} A${r},${r} 0 0 1 ${f(x2)},${f(y2)} Z`; };
  function meter(scale, opts={}){
    const scallops = Array.from({length:31},(_,i)=>{ const [x,y]=pt(i/30*100, R+14); return `<circle cx="${f(x)}" cy="${f(y)}" r="10"/>`; }).join('');
    let zone = '';
    if(opts.target!=null){
      const t = opts.target;
      const bands = [[17.5,YEL],[10.5,MINT],[3.5,CORAL]].map(([h,c])=>`<path d="${wedge(t-h,t+h,R-2)}" fill="${c}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`).join('');
      const nums = [[-14,2],[-7,3],[0,4],[7,3],[14,2]].filter(([o])=>t+o>=1 && t+o<=99).map(([o,n])=>{ const [x,y]=pt(t+o, R-26); return `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" dominant-baseline="central" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="17" fill="${INK}">${n}</text>`; }).join('');
      zone = `<g class="tm-zone${opts.animate?' in':''}" style="transform-origin:${CX}px ${CY}px">${bands}${nums}</g>`;
    }
    const ticks = Array.from({length:9},(_,i)=>{ const v=(i+1)*10, [x1,y1]=pt(v,R-2), [x2,y2]=pt(v,R-12); return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${INK}" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>`; }).join('');
    // other players' needles (reveal): thin ink lines, avatar at the tip; close ones get shorter
    let lines = '', avs = '';
    if(opts.needles && opts.needles.length){
      const sorted = opts.needles.slice().sort((a,b)=>a.v-b.v), last = [];
      sorted.forEach((n,i)=>{
        let lane=0; while(last[lane]!=null && n.v-last[lane]<6) lane++; last[lane]=n.v; lane=Math.min(lane,3);
        const r = R - 30 - lane*34, [x,y] = pt(n.v, r), [lx,ly] = pt(n.v, r-14);
        const d = opts.animate ? (1.0+i*0.12).toFixed(2) : 0;
        lines += `<line x1="${CX}" y1="${CY}" x2="${f(lx)}" y2="${f(ly)}" stroke="${INK}" stroke-width="${n.me?5:4}" stroke-linecap="round" ${opts.animate?`class="tm-ln" style="animation-delay:${d}s"`:''}/>`;
        avs += `<div class="tm-av${n.me?' me':''}" style="left:${f(x/400*100)}%;top:${f(y/250*100)}%;${opts.animate?`animation:tmPopAv .45s cubic-bezier(.3,1.6,.5,1) ${d}s both`:''}" title="${esc(n.p.name)}">${avatarSVG(n.p.avatar,28)}</div>`;
      });
    }
    const hand = opts.handle==null ? '' : `<g data-el="tmNeedle" style="transform:rotate(${f((opts.handle-50)*1.8)}deg);transform-origin:${CX}px ${CY}px"><line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY-R+26}" stroke="#D7263D" stroke-width="9" stroke-linecap="round"/><line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY-R+26}" stroke="${INK}" stroke-opacity=".0" stroke-width="40"/></g>`;
    const svg = `<svg viewBox="0 0 400 250" class="tm-svg" aria-hidden="true">
      <g fill="#FFFBF2" stroke="${INK}" stroke-width="2.5">${scallops}</g>
      <path d="${wedge(0,100,R+12)}" fill="${INK}"/>
      <path d="${wedge(0,100,R)}" fill="#FFFBF2"/>
      ${zone}${ticks}${lines}${hand}
      <rect x="10" y="${CY-2}" width="380" height="${250-CY+2}" rx="0" fill="${INK}"/>
      <circle cx="${CX}" cy="${CY}" r="27" fill="#D7263D" stroke="${INK}" stroke-width="3.5"/>
      <circle cx="${CX-7}" cy="${CY-8}" r="7" fill="#fff" fill-opacity=".35"/>
    </svg>`;
    return `<div class="tm-meter${opts.handle!=null?' interactive':''}">
      <div class="tm-dial" data-role="tm-track"${opts.handle!=null?` tabindex="0" role="slider" aria-label="Tu aguja" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${opts.handle}"`:''}>${svg}${avs}</div>
      <div class="tm-ends"><div class="tm-end l"><span>←</span>${esc(scale[0])}</div><div class="tm-end r"><span>→</span>${esc(scale[1])}</div></div>
    </div>`;
  }

  const header = (s, timer)=>{
    const g = s.g;
    return `<div style="position:sticky;top:0;z-index:10;background:var(--cream)">
      <div class="mm-header mm-wide" style="margin:0 auto;display:flex;align-items:center;gap:12px">
        <button class="icon-btn" data-action="askLeave" aria-label="Salir"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
        <div style="flex:1;min-width:0;display:flex;align-items:baseline;gap:6px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;white-space:nowrap"><span style="font-size:20px">RONDA ${g.round+1}</span><span style="font-size:14px;color:var(--muted)">de ${g.totalRounds}</span></div>
        ${timer?`<div data-el="tmTimerBox" style="display:flex;align-items:center;gap:8px;height:46px;padding:0 14px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;font-variant-numeric:tabular-nums"><span data-el="tmTimerText">${mmss(timer)}</span></div>`:''}
      </div>
      ${timer?`<div style="height:6px;background:var(--line)"><div data-el="tmTimerBar" style="height:100%;width:100%;background:${INK};transition:width .5s linear"></div></div>`:''}
    </div>`;
  };

  Object.assign(Game.prototype, {
    /* ---------- helpers ---------- */
    tmNow(){ return Date.now() + (this.isHost ? 0 : (this.hostClockOffset||0)); },
    tmL(){ if(!this.local.tm) this.local.tm = { target:null, targetRound:-1, val:50, valRound:-1, clue:'', clueSentRound:-1, guessSentRound:-1 }; return this.local.tm; },
    tmAmGiver(){ return !!(this.state && this.state.g && this.state.g.giverId===this.myId); },
    tmScores(){ const sc={}; this.players().forEach(p=>{ sc[p.id] = (this.state.g.scores||{})[p.id]||0; }); return sc; },
    tmTotals(){ return this.tmScores(); },
    tmFreshG(){ return { round:-1, totalRounds:0, giverId:null, order:[], scale:null, clue:null, endAt:0, guessers:[], guessed:{}, result:null, scores:{}, used:[], history:[] }; },
    tmMyTarget(){ const L=this.tmL(), g=this.state.g; return L.targetRound===g.round ? L.target : null; },

    /* ---------- config ---------- */
    tmConfirmConfig(){
      if(!this.isHost) return;
      this.state.gameId = 'termometro';
      this.state.gameConfig = { ...this.tmDraft };
      this.state.g = this.tmFreshG();
      this.state.stage = (this.state.stage||0)+1;
      this.local.hostFlow = null;
      this.broadcastState();
    },

    /* ---------- host: round flow ---------- */
    tmStartGame(){
      if(!this.isHost) return;
      const g = this.state.g = this.tmFreshG();
      g.order = shuffle(this.players().map(p=>p.id));
      g.totalRounds = Math.max(1, g.order.length * (this.state.gameConfig.laps||1));
      this.tmSecret = { target:null, guesses:{} };
      this.tmStartRound(0);
    },
    tmNextGiver(r){
      const g = this.state.g, present = new Set(this.players().map(p=>p.id));
      this.players().forEach(p=>{ if(!g.order.includes(p.id)) g.order.push(p.id); });
      for(let k=0;k<g.order.length;k++){ const id = g.order[(r+k)%g.order.length]; if(present.has(id)) return id; }
      return this.players()[0]?.id;
    },
    tmStartRound(r){
      if(!this.isHost) return;
      const s = this.state, g = s.g, S = this.tmSecret;
      g.round = r;
      g.giverId = this.tmNextGiver(r);
      const avail = ESCALAS.map((_,i)=>i).filter(i=>!g.used.includes(i));
      const pool = avail.length ? avail : ESCALAS.map((_,i)=>i);
      const si = pool[Math.floor(Math.random()*pool.length)];
      g.used = [...g.used, si];
      g.scale = ESCALAS[si].slice();
      S.target = 8 + Math.round(Math.random()*84*2)/2;   // 8–92, never glued to an end
      S.guesses = {};
      g.clue = null; g.guessed = {}; g.result = null;
      g.guessers = this.players().map(p=>p.id).filter(id=>id!==g.giverId);
      g.endAt = Date.now() + s.gameConfig.clueTime*1000;
      s.phase = 'tmClue'; s.stage = (s.stage||0)+1;
      this.broadcastState();
      this.tmSendTarget(g.giverId);
      const gp = this.playerById(g.giverId);
      if(gp && gp.isBot){
        this.later(()=>{
          if(this.state.phase!=='tmClue' || this.state.g.round!==r) return;
          const t = S.target, word = t<20?'Re '+g.scale[0].toLowerCase():t>80?'Re '+g.scale[1].toLowerCase():t<42?'Medio '+g.scale[0].toLowerCase():t>58?'Medio '+g.scale[1].toLowerCase():'Ni fu ni fa';
          this.tmHostClue(g.giverId, '🤖 '+word);
        }, 2500 + Math.random()*3000);
      }
      clearInterval(this.tmWatch);
      this.tmWatch = setInterval(()=>{
        if(!this.isHost || this.state.phase!=='tmClue' || this.state.g.round!==r){ clearInterval(this.tmWatch); return; }
        const g2 = this.state.g;
        if(!this.playerById(g2.giverId) || Date.now() >= g2.endAt + TM_GRACE_MS){ clearInterval(this.tmWatch); this.tmReveal(true); }
      }, 400);
    },
    tmSendTarget(pid){
      if(!this.isHost || !this.tmSecret) return;
      const g = this.state.g;
      if(pid!==g.giverId) return;
      const payload = { round:g.round, target:this.tmSecret.target };
      if(pid===this.myId) this.tmReceiveTarget(payload);
      else if(!this.playerById(pid)?.isBot) this.send('tmTarget', { to:pid, ...payload });
    },
    tmHostClue(pid, text){
      if(!this.isHost) return;
      const s = this.state, g = s.g, r = g.round;
      if(s.phase!=='tmClue' || pid!==g.giverId) return;
      const clue = tmCleanClue(text); if(!clue) return;
      g.clue = clue;
      g.endAt = Date.now() + s.gameConfig.guessTime*1000;
      s.phase = 'tmGuess'; s.stage = (s.stage||0)+1;
      this.broadcastState();
      const S = this.tmSecret;
      g.guessers.forEach(pid=>{
        const p = this.playerById(pid); if(!p || !p.isBot) return;
        this.later(()=>{
          if(this.state.phase!=='tmGuess' || this.state.g.round!==r) return;
          this.tmHostGuess(pid, S.target + (Math.random()-.5)*44);
        }, 1500 + Math.random()*Math.min(10000, s.gameConfig.guessTime*400));
      });
      clearInterval(this.tmWatch);
      this.tmWatch = setInterval(()=>{
        if(!this.isHost || this.state.phase!=='tmGuess' || this.state.g.round!==r){ clearInterval(this.tmWatch); return; }
        const g2 = this.state.g;
        const present = g2.guessers.filter(id=>this.playerById(id));
        const allIn = present.length>0 && present.every(id=>g2.guessed[id]);
        if(allIn || !present.length || Date.now() >= g2.endAt + TM_GRACE_MS){
          clearInterval(this.tmWatch);
          this.later(()=>this.tmReveal(false), allIn ? 700 : 0);
        }
      }, 400);
    },
    tmHostGuess(pid, v){
      if(!this.isHost) return;
      const s = this.state, g = s.g;
      if(s.phase!=='tmGuess' || !g.guessers.includes(pid) || g.guessed[pid]) return;
      const val = Number(v); if(!isFinite(val)) return;
      this.tmSecret.guesses[pid] = tmClamp(val);
      g.guessed = { ...g.guessed, [pid]:true };
      this.broadcastState();
    },
    tmReveal(noClue){
      if(!this.isHost) return;
      clearInterval(this.tmWatch);
      const s = this.state, g = s.g, S = this.tmSecret;
      if(s.phase!=='tmClue' && s.phase!=='tmGuess') return;
      const guesses = Object.keys(S.guesses).filter(pid=>this.playerById(pid)).map(pid=>({ pid, v:S.guesses[pid], pts:tmPoints(S.guesses[pid], S.target) }));
      const giverPts = noClue ? 0 : tmGiverPoints(guesses.map(x=>x.pts));
      const scores = { ...g.scores };
      guesses.forEach(x=>{ scores[x.pid] = (scores[x.pid]||0) + x.pts; });
      if(giverPts && this.playerById(g.giverId)) scores[g.giverId] = (scores[g.giverId]||0) + giverPts;
      g.scores = scores;
      g.result = { target:S.target, guesses, giverPts, noClue: !!noClue || !g.clue };
      if(g.clue) g.history = [...g.history, { scale:g.scale, clue:g.clue, pid:g.giverId, giverPts }];
      s.phase = 'tmReveal'; s.stage = (s.stage||0)+1;
      this.broadcastState();
    },
    tmNext(){
      if(!this.isHost) return;
      const g = this.state.g;
      if(g.round+1 >= g.totalRounds){
        if(this.state.match) this.rondaGameFinished();
        else { this.state.phase='tmFinal'; this.state.stage=(this.state.stage||0)+1; this.broadcastState(); }
      } else this.tmStartRound(g.round+1);
    },
    tmPlayAgain(){
      if(!this.isHost) return;
      clearInterval(this.tmWatch); this.tmSecret = null;
      this.state.g = this.tmFreshG(); this.state.phase='lobby'; this.state.stage=(this.state.stage||0)+1;
      this.broadcastState();
    },
    tmOnAction(msg){
      const g = this.state.g;
      if(msg.round!==g.round) return;
      if(msg.type==='tmClue') this.tmHostClue(msg.id, msg.text);
      else if(msg.type==='tmGuess') this.tmHostGuess(msg.id, msg.v);
      else if(msg.type==='tmSync') this.tmSendTarget(msg.id);
    },

    /* ---------- every client ---------- */
    tmReceiveTarget(p){
      const L = this.tmL();
      L.target = p.target; L.targetRound = p.round;
      clearInterval(this._tmTargetRetry);
      if(this.local.screen==='tmClue' || this.local.screen==='tmGuess') this.renderScreen();
    },
    tmSubmitClue(){
      if(!this.state || this.state.phase!=='tmClue' || !this.tmAmGiver()) return;
      const L = this.tmL(), g = this.state.g;
      const clue = tmCleanClue(L.clue);
      if(!clue){ this.toast('Escribí una pista', CORAL); return; }
      L.clueSentRound = g.round;
      if(this.isHost) this.tmHostClue(this.myId, clue);
      else {
        const payload = { id:this.myId, round:g.round, text:clue };
        this.sendAction('tmClue', payload);
        clearInterval(this._tmRetry);
        this._tmRetry = setInterval(()=>{
          const st = this.state;
          if(!st || st.phase!=='tmClue' || st.g.round!==payload.round){ clearInterval(this._tmRetry); return; }
          this.sendAction('tmClue', payload);
        }, 1200);
      }
      if(this.soundOn){ beep(660,.08,'triangle',.08); beep(990,.12,'triangle',.08,.08); }
      this.renderScreen();
    },
    tmSubmitGuess(){
      if(!this.state || this.state.phase!=='tmGuess' || this.tmAmGiver()) return;
      const L = this.tmL(), g = this.state.g;
      if(L.guessSentRound===g.round || g.guessed[this.myId]) return;
      L.guessSentRound = g.round; L.sentVal = L.val;
      if(this.isHost) this.tmHostGuess(this.myId, L.val);
      else {
        const payload = { id:this.myId, round:g.round, v:L.val };
        this.sendAction('tmGuess', payload);
        clearInterval(this._tmRetry);
        this._tmRetry = setInterval(()=>{
          const st = this.state;
          if(!st || st.phase!=='tmGuess' || st.g.round!==payload.round || st.g.guessed[this.myId]){ clearInterval(this._tmRetry); return; }
          this.sendAction('tmGuess', payload);
        }, 1200);
      }
      if(this.soundOn){ beep(660,.08,'triangle',.08); beep(990,.12,'triangle',.08,.08); }
      this.renderScreen();
    },
    tmHasGuessed(){ const g=this.state.g, L=this.tmL(); return L.guessSentRound===g.round || !!g.guessed[this.myId]; },

    tmOnStage(s){
      const g = s.g, L = this.tmL();
      clearInterval(this.tick);
      if(s.phase==='tmClue' || s.phase==='tmGuess'){
        this.tick = setInterval(()=>{ if(this.local.screen!==s.phase){ clearInterval(this.tick); return; } this.tmTickTimer(); }, 500);
      }
      if(s.phase==='tmClue'){
        if(L.valRound!==g.round){ L.val = 50; L.valRound = g.round; L.clue = ''; }
        if(this.tmAmGiver()){
          if(this.soundOn) beep(523,.12,'triangle',.08);
          if(!this.isHost){
            clearInterval(this._tmTargetRetry);
            this._tmTargetRetry = setInterval(()=>{
              const st = this.state;
              if(!st || st.phase!=='tmClue' || st.g.giverId!==this.myId || this.tmL().targetRound===st.g.round){ clearInterval(this._tmTargetRetry); return; }
              this.sendAction('tmSync', { id:this.myId, round:st.g.round });
            }, 1500);
          }
        }
      }
      if(s.phase==='tmGuess' && L.valRound!==g.round){ L.val = 50; L.valRound = g.round; }
      if(s.phase==='tmReveal' && this.soundOn){
        const mine = (g.result?.guesses||[]).find(x=>x.pid===this.myId);
        if(mine && mine.pts===4) [523,659,784,1046].forEach((f,i)=>beep(f,.16,'triangle',.09,1+i*.12));
        else beep(440,.14,'triangle',.07,.9);
      }
    },
    tmOnSameStage(){
      const sc = this.local.screen;
      if(sc==='tmClue' || sc==='tmGuess'){
        const el = this.root.querySelector('[data-el="tmStatus"]'); if(el) el.innerHTML = this.tmStatusHtml();
        const box = this.root.querySelector('[data-el="tmSentBox"]');
        if(box && this.state.g.guessed[this.myId] && box.dataset.ok!=='1'){ box.dataset.ok='1'; box.style.background = MINT; box.textContent = '¡Listo! Esperando al resto…'; }
      }
    },
    tmTickTimer(){
      const s = this.state, g = s.g;
      const total = s.phase==='tmClue' ? s.gameConfig.clueTime : s.gameConfig.guessTime;
      const left = Math.max(0, Math.min(total, Math.ceil((g.endAt - this.tmNow())/1000)));
      const t = this.root.querySelector('[data-el="tmTimerText"]'), b = this.root.querySelector('[data-el="tmTimerBar"]'), box = this.root.querySelector('[data-el="tmTimerBox"]');
      if(t) t.textContent = mmss(left);
      if(b){ b.style.width = (left/total*100)+'%'; b.style.background = left<=10 ? CORAL : INK; }
      if(box) box.style.background = left<=10 ? CORAL : '#fff';
      return left;
    },
    tmStatusHtml(){
      const g = this.state.g;
      return g.guessers.filter(id=>this.playerById(id)).map(id=>{
        const p = this.playerById(id), done = !!g.guessed[id];
        return `<div style="display:flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;border-radius:999px;background:${done?MINT:'#fff'};border:2px solid ${done?INK:'var(--line)'}">
          <div style="width:26px;height:26px;flex:0 0 auto">${avatarSVG(p.avatar,26)}</div>
          <span class="one-line" style="font-weight:800;font-size:14px;max-width:110px">${esc(p.name)}</span>${done?'✓':'<span style="color:var(--muted);font-weight:800">···</span>'}
        </div>`;
      }).join('');
    },
    // Drag / keyboard on the player's needle. Only touches the DOM, never re-renders.
    tmAfterRender(){
      const dial = this.root.querySelector('.tm-meter.interactive [data-role="tm-track"]');
      if(!dial) return;
      const L = this.tmL();
      const set = v=>{ L.val = tmClamp(v); this.tmPaintNeedle(); };
      const fromXY = (x,y)=>{
        const r = dial.querySelector('svg').getBoundingClientRect();
        const px = r.left + CX/400*r.width, py = r.top + CY/250*r.height;
        let th = Math.atan2(py - y, x - px);           // 0 = right, π = left
        if(th < 0) th = (x < px) ? Math.PI : 0;        // below the pivot: snap to the nearest end
        return 100*(1 - th/Math.PI);
      };
      let dragging = false;
      dial.addEventListener('pointerdown', e=>{ dragging = true; try{ dial.setPointerCapture(e.pointerId); }catch(_){} set(fromXY(e.clientX,e.clientY)); dial.classList.add('drag'); e.preventDefault(); });
      dial.addEventListener('pointermove', e=>{ if(dragging) set(fromXY(e.clientX,e.clientY)); });
      const end = ()=>{ if(!dragging) return; dragging = false; dial.classList.remove('drag'); if(this.soundOn) beep(700,.03,'sine',.04); };
      dial.addEventListener('pointerup', end); dial.addEventListener('pointercancel', end);
      dial.addEventListener('keydown', e=>{
        if(e.key==='ArrowLeft'||e.key==='ArrowDown'){ e.preventDefault(); set(L.val-(e.shiftKey?5:1)); }
        else if(e.key==='ArrowRight'||e.key==='ArrowUp'){ e.preventDefault(); set(L.val+(e.shiftKey?5:1)); }
        else if(e.key==='Enter'){ e.preventDefault(); this.tmSubmitGuess(); }
      });
    },
    tmPaintNeedle(){
      const L = this.tmL(), g = this.root.querySelector('[data-el="tmNeedle"]'), d = this.root.querySelector('.tm-meter.interactive [data-role="tm-track"]');
      if(g) g.style.transform = `rotate(${((L.val-50)*1.8).toFixed(1)}deg)`;
      if(d) d.setAttribute('aria-valuenow', L.val);
    },

    tmActions(){
      return {
        tmSetLaps: t=>{ this.tmDraft.laps = Number(t.dataset.val); this.renderScreen(); },
        tmSetClueTime: t=>{ this.tmDraft.clueTime = Number(t.dataset.val); this.renderScreen(); },
        tmSetGuessTime: t=>{ this.tmDraft.guessTime = Number(t.dataset.val); this.renderScreen(); },
        tmConfirmConfig: ()=>this.tmConfirmConfig(),
        tmSubmitClue: ()=>this.tmSubmitClue(),
        tmSubmitGuess: ()=>this.tmSubmitGuess(),
        tmNudge: t=>{ const L=this.tmL(); L.val = tmClamp(L.val + Number(t.dataset.val)); this.tmPaintNeedle(); },
      };
    },
    tmOnInput(t){ this.tmL().clue = t.value.slice(0, TM_CLUE_MAX); },
    tmOnKey(e){ if(e.key==='Enter'){ e.preventDefault(); this.tmSubmitClue(); } },

    /* ===================== SCREENS ===================== */
    viewTmConfig(){
      const d = this.tmDraft, n = Math.max(2, this.players().length);
      const est = Math.max(3, Math.round(n*d.laps*(Math.min(d.clueTime,40)+Math.min(d.guessTime,30)+20)/60));
      return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
        <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Termómetro</div></div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:16px 0">
          <div class="tm-howto">
            ${meter(['Frío','Caliente'], { target:72 })}
            <div style="font-weight:700;font-size:15px;line-height:1.4">Uno ve dónde está el punto secreto y tira una pista. El resto mueve la aguja. <b>Más cerca, más puntos.</b></div>
          </div>
          <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:6px 18px">
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
              <div style="font-weight:800;font-size:17px">Vueltas</div>
              <div style="font-size:13px;font-weight:600;color:var(--muted);margin-top:-6px">Cada vuelta, todos dan una pista una vez</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[1,2,3].map(v=>optBtn('tmSetLaps',v,v,d.laps===v)).join('')}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
              <div style="font-weight:800;font-size:17px">Tiempo para pensar la pista</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[30,60,90].map(v=>optBtn('tmSetClueTime',v,v+'s',d.clueTime===v)).join('')}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0">
              <div style="font-weight:800;font-size:17px">Tiempo para adivinar</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[30,45,60].map(v=>optBtn('tmSetGuessTime',v,v+'s',d.guessTime===v)).join('')}</div>
            </div>
          </div>
          <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">≈ ${est} min con ${n} jugadores</div>
          <button class="btn-primary" data-action="tmConfirmConfig">SIGUIENTE</button>
        </div>
      </div>`;
    },

    tmGiverChip(){
      const g = this.state.g, p = this.playerById(g.giverId) || { name:'?' };
      return `<div class="zp-judge-chip tm-chip"><div style="width:30px;height:30px">${avatarSVG(p.avatar,30)}</div><span>${this.tmAmGiver()?'Vos das la pista':esc(p.name)+' da la pista'}</span><span>🌡️</span></div>`;
    },

    viewTmClue(){
      const s = this.state, g = s.g, L = this.tmL();
      const giver = this.playerById(g.giverId) || { name:'?' };
      let body;
      if(this.tmAmGiver()){
        const target = this.tmMyTarget();
        const sent = L.clueSentRound===g.round;
        body = `<div class="tm-col">
          ${this.tmGiverChip()}
          <div class="tm-title">El punto secreto es este. <span>Solo lo ves vos.</span></div>
          ${target==null ? `<div style="display:flex;justify-content:center;padding:30px"><div class="spinner"></div></div>` : meter(g.scale, { target, animate:true })}
          <div class="tm-clue-box">
            <label style="font-weight:800;font-size:15px" for="tmClueInput">Tirá una pista que esté justo ahí entre <b>${esc(g.scale[0])}</b> y <b>${esc(g.scale[1])}</b></label>
            <div style="display:flex;gap:10px">
              <input id="tmClueInput" data-role="tm-clue" value="${esc(L.clue)}" maxlength="${TM_CLUE_MAX}" placeholder="Ej: un mate recién cebado" autocomplete="off" ${sent?'disabled':''}
                style="flex:1;min-width:0;height:56px;border-radius:16px;border:2px solid ${INK};background:#FFFDF8;padding:0 16px;font-weight:800;font-size:18px;color:${INK};outline:none">
            </div>
            <div style="font-size:13px;font-weight:600;color:var(--muted)">Puede ser una cosa, una persona, una situación… lo que sea. No vale decir números 😉</div>
          </div>
        </div>
        <div class="sticky-bottom" style="margin:0;padding:14px 20px 18px"><div style="width:100%;max-width:520px;margin:0 auto"><button class="btn-primary" data-action="tmSubmitClue" ${sent||target==null?'disabled':''}>${sent?'ENVIANDO…':'DAR PISTA'}</button></div></div>`;
      } else {
        body = `<div class="tm-col">
          ${this.tmGiverChip()}
          <div class="tm-title">Esta ronda la escala es…</div>
          ${meter(g.scale, {})}
          ${waitBox(giver.name, 'está pensando una pista')}
          <div style="text-align:center;font-size:14px;font-weight:600;color:var(--muted)">${esc(giver.name)} ve un punto secreto en la escala. Cuando tire la pista, vas a mover tu aguja hasta donde creas que está.</div>
        </div>`;
      }
      return `<div style="min-height:100vh;display:flex;flex-direction:column">${header(s, s.gameConfig.clueTime)}<div class="tm-wrap">${body}</div></div>`;
    },

    viewTmGuess(){
      const s = this.state, g = s.g, L = this.tmL();
      const giver = this.playerById(g.giverId) || { name:'?' };
      const clue = `<div class="tm-clue"><div class="tm-clue-who"><div style="width:28px;height:28px">${avatarSVG(giver.avatar,28)}</div>${this.tmAmGiver()?'Tu pista':'La pista de '+esc(giver.name)}</div><div class="tm-clue-text">“${esc(g.clue||'')}”</div></div>`;
      const status = `<div class="card" style="padding:12px 14px;display:flex;flex-direction:column;gap:8px">${kicker('Ya eligieron')}<div data-el="tmStatus" style="display:flex;flex-wrap:wrap;gap:6px">${this.tmStatusHtml()}</div></div>`;
      let body;
      if(this.tmAmGiver()){
        const target = this.tmMyTarget();
        body = `<div class="tm-col">${clue}${meter(g.scale, { target })}
          <div style="text-align:center;font-weight:800;font-size:16px">Ni una palabra ni una cara 🤐</div>${status}</div>`;
      } else if(this.tmHasGuessed()){
        const v = L.sentVal ?? L.val, ok = !!g.guessed[this.myId];
        body = `<div class="tm-col">${clue}${meter(g.scale, { needles:[{ v, p:this.playerById(this.myId)||{name:'',avatar:null}, me:true }] })}
          <div data-el="tmSentBox" data-ok="${ok?1:0}" style="background:${ok?MINT:'#fff'};border:2.5px solid ${INK};border-radius:20px;box-shadow:0 4px 0 ${INK};padding:14px 16px;font-weight:800;font-size:17px;text-align:center;animation:pop .4s both">${ok?'¡Listo! Esperando al resto…':'Enviando…'}</div>
          ${status}</div>`;
      } else {
        body = `<div class="tm-col">${clue}
          ${meter(g.scale, { handle:L.val })}
          <div class="tm-nudge">
            <button class="tm-nudge-btn" data-action="tmNudge" data-val="-1" aria-label="Un poco a la izquierda">−</button>
            <div style="flex:1;text-align:center;font-weight:800;font-size:14px;color:var(--muted)">Girá la aguja hasta donde creas que va</div>
            <button class="tm-nudge-btn" data-action="tmNudge" data-val="1" aria-label="Un poco a la derecha">+</button>
          </div>
          ${status}</div>
          <div class="sticky-bottom" style="margin:0;padding:14px 20px 18px"><div style="width:100%;max-width:520px;margin:0 auto"><button class="btn-primary" data-action="tmSubmitGuess">CONFIRMAR</button></div></div>`;
      }
      return `<div style="min-height:100vh;display:flex;flex-direction:column">${header(s, s.gameConfig.guessTime)}<div class="tm-wrap">${body}</div></div>`;
    },

    viewTmReveal(){
      const s = this.state, g = s.g, res = g.result || { guesses:[] };
      const giver = this.playerById(g.giverId) || { name:'Jugador desconectado' };
      const needles = res.guesses.map(x=>({ v:x.v, p:this.playerById(x.pid)||{name:'?'}, me:x.pid===this.myId }));
      const PTS_BG = { 4:INK, 3:CORAL, 2:YEL, 0:'#fff' };
      const rows = res.guesses.slice().sort((a,b)=>b.pts-a.pts || Math.abs(a.v-res.target)-Math.abs(b.v-res.target)).map((x,i)=>{
        const p = this.playerById(x.pid) || { name:'?' };
        return `<div class="tm-row" style="animation:rise .4s ${(1.2+i*0.08).toFixed(2)}s both"><div style="width:30px;height:30px;flex:0 0 auto">${avatarSVG(p.avatar,30)}</div><span class="one-line" style="flex:1;font-weight:800">${esc(p.name)}${x.pid===this.myId?' (vos)':''}</span>${x.pts===4?'<span style="font-size:13px;font-weight:800">¡CLAVADO! 🎯</span>':''}<span class="tm-pts" style="background:${PTS_BG[x.pts]};color:${x.pts===4?'var(--cream)':INK}">+${x.pts}</span></div>`;
      }).join('');
      const giverRow = res.noClue ? '' : `<div class="tm-row giver" style="animation:rise .4s ${(1.2+res.guesses.length*0.08).toFixed(2)}s both"><div style="width:30px;height:30px;flex:0 0 auto">${avatarSVG(giver.avatar,30)}</div><span class="one-line" style="flex:1;font-weight:800">${esc(giver.name)}${g.giverId===this.myId?' (vos)':''}<span style="display:block;font-size:12px;color:var(--muted)">Dio la pista · promedio del resto</span></span><span class="tm-pts" style="background:${MINT}">+${res.giverPts}</span></div>`;
      const sc = this.tmScores();
      const order = this.rankOf(sc).filter(id=>this.playerById(id));
      const board = order.map((id,i)=>{ const p=this.playerById(id); return `<div class="zp-score"><span style="width:18px;font-weight:800">${i+1}</span><div style="width:28px;height:28px;flex:0 0 auto">${avatarSVG(p.avatar,28)}</div><span class="one-line" style="flex:1;font-weight:800">${esc(p.name)}</span><span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${sc[id]}</span></div>`; }).join('');
      const last = g.round+1 >= g.totalRounds;
      const bottom = this.isHost
        ? `<button class="btn-primary" data-action="nextRound">${last?(s.match?'TERMINAR JUEGO':'VER RESULTADO FINAL'):'SIGUIENTE RONDA'}</button>`
        : waitBox(this.playerById(s.hostId)?.name||'El anfitrión', 'va a continuar');
      const best = res.guesses.reduce((m,x)=>Math.max(m,x.pts),0);
      const title = res.noClue ? 'NO HUBO PISTA' : best===4 ? '¡LO CLAVARON!' : best===3 ? '¡CERQUITA!' : best===2 ? 'MÁS O MENOS…' : 'NI CERCA 😅';
      return `<div style="min-height:100vh;display:flex;flex-direction:column">${header(s, 0)}
        <div class="tm-wrap" style="max-width:1080px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
            <div class="heading" style="font-size:clamp(30px,7vw,46px);line-height:1.05;animation:pop .6s cubic-bezier(.3,1.6,.5,1) both">${title}</div>
            ${res.noClue?`<div style="font-weight:700;color:var(--muted)">${esc(giver.name)} no llegó a dar la pista. Nadie suma.</div>`:''}
          </div>
          <div class="tm-reveal">
            <div class="tm-col">
              ${g.clue?`<div class="tm-clue"><div class="tm-clue-who"><div style="width:28px;height:28px">${avatarSVG(giver.avatar,28)}</div>La pista de ${esc(giver.name)}</div><div class="tm-clue-text">“${esc(g.clue)}”</div></div>`:''}
              ${meter(g.scale, { target:res.target, needles, animate:true })}
              ${rows||giverRow?`<div style="display:flex;flex-direction:column;gap:8px">${rows}${giverRow}</div>`:''}
            </div>
            <div class="tm-col">${kicker('Puntos')}${board}</div>
          </div>
        </div>
        <div class="sticky-bottom" style="margin:0;padding:14px 20px 18px"><div style="width:100%;max-width:520px;margin:0 auto">${bottom}</div></div>
      </div>`;
    },

    viewTmFinal(){
      const s = this.state, g = s.g, sc = this.tmScores(), pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
      const nr = this.rankOf(sc).filter(id=>byId[id]);
      const w = byId[nr[0]];
      const pod = [1,0,2].filter(i=>nr[i]);
      const H=['170px','124px','92px'], PBG=[YEL,'#E4DEF5','#F6BE9E'];
      const podium = pod.map(i=>{ const p=byId[nr[i]]; return `<div style="flex:0 1 130px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;animation:rise .6s both;animation-delay:${(0.2+(2-i)*0.15).toFixed(2)}s"><div style="width:${i===0?72:56}px;height:${i===0?72:56}px">${avatarSVG(p.avatar,i===0?72:56)}</div><div style="font-weight:800;font-size:16px;text-align:center">${esc(p.name)}</div><div style="width:100%;height:${H[i]};border-radius:18px 18px 0 0;background:${PBG[i]};border:2.5px solid ${INK};border-bottom:0;display:flex;flex-direction:column;align-items:center;padding-top:10px"><div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:40px;line-height:1">${i+1}</div><div style="font-weight:800;font-size:14px">${sc[p.id]} pts</div></div></div>`; }).join('');
      const rest = nr.slice(3).map((id,k)=>{ const p=byId[id]; return `<div class="zp-score"><span style="width:18px;font-weight:800">${k+4}</span><div style="width:28px;height:28px;flex:0 0 auto">${avatarSVG(p.avatar,28)}</div><span class="one-line" style="flex:1;font-weight:800">${esc(p.name)}</span><span style="font-weight:800">${sc[id]} pts</span></div>`; }).join('');
      const best = (g.history||[]).filter(h=>h.giverPts>0).sort((a,b)=>b.giverPts-a.giverPts).slice(0,4).map(h=>{ const p=byId[h.pid]||{name:'?'}; return `<div class="tm-hist"><div style="font-size:12px;font-weight:800;color:var(--muted)">${esc(h.scale[0])} ↔ ${esc(h.scale[1])}</div><div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:19px">“${esc(h.clue)}”</div><div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800"><div style="width:22px;height:22px">${avatarSVG(p.avatar,22)}</div>${esc(p.name)} · +${h.giverPts}</div></div>`; }).join('');
      const confetti = this.confetti.map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} 2 both"></div>`).join('');
      const bottom = this.isHost
        ? `<button class="btn-primary final-btn" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary final-btn" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
        : `<div style="flex:1">${waitBox(this.playerById(s.hostId)?.name||'El anfitrión','elige qué sigue')}</div>`;
      return `<div style="position:relative;min-height:100vh;overflow:hidden">
        <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confetti}</div>
        <div class="mm-wide" style="position:relative;z-index:2;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
            <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
            <div class="heading" style="font-size:clamp(40px,11vw,80px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${w?(w.id===this.myId?'¡GANASTE, '+esc(w.name).toUpperCase()+'!':esc(w.name).toUpperCase()+' ESTÁ EN SINTONÍA'):'PARTIDA TERMINADA'}</div>
          </div>
          <div class="mm-final-grid">
            <div class="mm-final-rank"><div class="section-label" style="text-align:left">Posiciones</div><div style="display:flex;align-items:flex-end;justify-content:center;gap:10px;padding-top:6px">${podium}</div>${rest?`<div style="display:flex;flex-direction:column;gap:8px">${rest}</div>`:''}</div>
            ${best?`<div class="mm-final-side"><div class="section-label" style="text-align:left">Las mejores pistas</div><div style="display:flex;flex-direction:column;gap:10px">${best}</div></div>`:''}
          </div>
          <div class="sticky-bottom"><div class="final-actions">${bottom}</div></div>
        </div></div>`;
    },
  });
}
