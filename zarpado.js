// ================= ZARPADO =================
// Fill-in-the-blank party game (+18). Each round one player is the reader
// ("el que lee"): they read a black card out loud; everyone else picks from
// their hand of 10 white cards the one that completes it best. Answers are
// shown anonymously one by one, the reader picks the funniest, and only then
// is the author revealed. The reader rotates every round. First to N points
// wins.
//
// Plugs into Ronda's Game class like makeitmeme.js does. Host-authoritative:
//  - The deck and every hand live ONLY in host memory (this.zpSecret). Each
//    player receives their own hand privately (event zpHand).
//  - While playing, shared state only says WHO already played. While
//    judging, submissions are broadcast shuffled under random ids, with no
//    author. Authors are revealed in the result.
//  - The host validates every action: you can only play cards you hold, the
//    right number of them, never as the reader, once per round; swaps are
//    capped; only the reader can move through the answers and pick one.

import { FRASES, RESPUESTAS, BLANK_CHANCE, blanksIn } from './zarpadobank.js';

/* ===================== 1. PURE LOGIC ===================== */
export const ZP_HAND = 10;
export const ZP_SWAPS = 2;          // card swaps per player per round
export const ZP_BLANK_MAX = 60;
const ZP_GRACE_MS = 2500;

export function zpDefaultConfig(){ return { target:5, playTime:60 }; }

export function zpShuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
export const zpClean = s => String(s??'').replace(/\s+/g,' ').trim().slice(0, ZP_BLANK_MAX);

// Answer text as it should read inside the sentence.
function fitAnswer(ans, midSentence){
  let t = String(ans||'').trim().replace(/\.+$/,'');
  if(midSentence && t.length>1 && !(t[1]===t[1].toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t[1]))) t = t[0].toLowerCase()+t.slice(1);
  return t;
}
// Returns [{t:'text'}|{a:'answer'}] parts: the black card with answers in place.
export function zpFill(card, answers){
  const out = zpFillRaw(card, answers);
  // an answer that already ends in ? or ! doesn't get an extra period
  for(let i=0;i<out.length-1;i++){
    if(out[i].a && /[?!]$/.test(out[i].a) && out[i+1].t!==undefined) out[i+1] = { t: out[i+1].t.replace(/^\./,'') };
  }
  return out.filter(p=>p.a!==undefined || p.t);
}
function zpFillRaw(card, answers){
  const parts = card.split('___');
  if(parts.length===1) return [{t:card+' '}, {a:fitAnswer(answers[0], false)}, {t:'.'}];
  const out = [];
  parts.forEach((p,i)=>{
    if(p) out.push({t:p});
    if(i < parts.length-1){
      const before = parts.slice(0,i+1).join('').trim();
      const mid = before.length>0 && !/[.!?¿¡:“"]$/.test(before);
      out.push({ a: answers[i]!=null ? fitAnswer(answers[i], mid) : null });
    }
  });
  return out;
}

/* ===================== 2. INTEGRATION ===================== */
export function installZarpado(Game, ui){
  const { INK, CORAL, MINT, YEL, PINK, avatarSVG, esc, mmss, beep } = ui;

  const fillHtml = (card, answers, opts={})=> zpFill(card, answers).map(p=> p.a===undefined
      ? esc(p.t)
      : p.a===null ? `<span class="zp-blank">${opts.blankLabel||'_____'}</span>` : `<span class="zp-fill">${esc(p.a)}</span>`).join('');
  const blackCard = (inner, small)=>`<div class="zp-black${small?' sm':''}"><div class="zp-black-text">${inner}</div><div class="zp-black-brand">ZARPADO</div></div>`;
  const waitHost = (who, verb)=>`<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:15px;color:var(--muted);padding:0 12px;text-align:center">${esc(who)} ${verb}<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
  const optBtn = (action, val, label, on)=>`<button data-action="${action}" data-val="${val}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${on?INK:'#fff'};color:${on?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${label}</button>`;
  const header = (s, timer)=>`
    <div style="position:sticky;top:0;z-index:10;background:var(--cream)">
      <div class="mm-header mm-wide" style="margin:0 auto;display:flex;align-items:center;gap:12px">
        <button class="icon-btn" data-action="askLeave" aria-label="Salir"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
        <div style="flex:1;min-width:0;display:flex;align-items:baseline;gap:6px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;white-space:nowrap"><span style="font-size:20px">RONDA ${s.g.round+1}</span><span style="font-size:14px;color:var(--muted)">· a ${s.gameConfig.target} puntos</span></div>
        ${timer?`<div data-el="zpTimerBox" style="display:flex;align-items:center;gap:8px;height:46px;padding:0 14px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;font-variant-numeric:tabular-nums"><span data-el="zpTimerText">${mmss(s.gameConfig.playTime)}</span></div>`:''}
      </div>
      ${timer?`<div style="height:6px;background:var(--line)"><div data-el="zpTimerBar" style="height:100%;width:100%;background:${INK};transition:width .5s linear"></div></div>`:''}
    </div>`;

  Object.assign(Game.prototype, {
    /* ---------- helpers ---------- */
    zpNow(){ return Date.now() + (this.isHost ? 0 : (this.hostClockOffset||0)); },
    zpL(){ if(!this.local.zp) this.local.zp = { hand:[], handRound:-1, swapsLeft:ZP_SWAPS, sel:[], blank:{}, sentRound:-1, swapMode:false }; return this.local.zp; },
    zpPlayers(){ return this.players(); },
    zpAmJudge(){ return !!(this.state && this.state.g && this.state.g.judgeId===this.myId); },
    zpHasPlayed(){ const g=this.state.g, L=this.zpL(); return L.sentRound===g.round || !!(g.played && g.played[this.myId]); },
    zpPlayConfirmed(){ const g=this.state.g; return !!(g.played && g.played[this.myId]); },
    zpScores(){ const sc={}; this.players().forEach(p=>{ sc[p.id] = (this.state.g.scores||{})[p.id]||0; }); return sc; },
    zpTotals(){ return this.zpScores(); },
    zpFreshG(){ return { round:-1, judgeId:null, judgeOrder:[], card:null, pick:1, playEndAt:0, played:{}, players:[], subs:[], showIdx:0, seen:0, winnerSid:null, result:null, scores:{}, usedCards:[], history:[] }; },

    /* ---------- config ---------- */
    zpConfirmConfig(){
      if(!this.isHost) return;
      this.state.gameId = 'zarpado';
      this.state.gameConfig = { ...this.zpDraft };
      this.state.g = this.zpFreshG();
      this.state.stage = (this.state.stage||0)+1;
      this.local.hostFlow = null;
      this.broadcastState();
    },

    /* ---------- host: deck ---------- */
    zpDraw(){
      const S = this.zpSecret;
      if(!S.deck.length){ S.deck = zpShuffle(S.discard); S.discard = []; }
      if(!S.deck.length) S.deck = zpShuffle(RESPUESTAS.map((_,i)=>i));
      const i = S.deck.pop();
      const blank = Math.random() < BLANK_CHANCE;
      return { id:'c'+(++S.seq), text: blank ? '' : RESPUESTAS[i], blank, src:i };
    },
    zpRefill(pid){
      const S = this.zpSecret; const h = S.hands[pid] = S.hands[pid] || [];
      while(h.length < ZP_HAND) h.push(this.zpDraw());
    },
    zpSendHand(pid){
      if(!this.isHost || !this.zpSecret) return;
      const S = this.zpSecret, g = this.state.g;
      const payload = { round:g.round, hand:(S.hands[pid]||[]).map(c=>({id:c.id, text:c.text, blank:c.blank})), swapsLeft: ZP_SWAPS - (S.swaps[pid]||0) };
      if(pid===this.myId) this.zpReceiveHand(payload);
      else if(!this.playerById(pid)?.isBot) this.send('zpHand', { to:pid, ...payload });
    },

    /* ---------- host: round flow ---------- */
    zpStartGame(){
      if(!this.isHost) return;
      this.state.g = this.zpFreshG();
      this.state.g.judgeOrder = zpShuffle(this.players().map(p=>p.id));
      this.zpSecret = { deck:zpShuffle(RESPUESTAS.map((_,i)=>i)), discard:[], hands:{}, swaps:{}, plays:{}, pidOf:{}, seq:0 };
      this.zpStartRound(0);
    },
    zpNextJudge(r){
      const g = this.state.g, present = new Set(this.players().map(p=>p.id));
      // anyone who joined later goes to the end of the rotation
      this.players().forEach(p=>{ if(!g.judgeOrder.includes(p.id)) g.judgeOrder.push(p.id); });
      for(let k=0;k<g.judgeOrder.length;k++){ const id = g.judgeOrder[(r+k)%g.judgeOrder.length]; if(present.has(id)) return id; }
      return this.players()[0]?.id;
    },
    zpStartRound(r){
      if(!this.isHost) return;
      const s = this.state, g = s.g, S = this.zpSecret;
      g.round = r;
      g.judgeId = this.zpNextJudge(r);
      let ci; const avail = FRASES.map((_,i)=>i).filter(i=>!g.usedCards.includes(i));
      ci = (avail.length?avail:FRASES.map((_,i)=>i))[Math.floor(Math.random()*(avail.length||FRASES.length))];
      g.usedCards = [...g.usedCards, ci];
      g.card = FRASES[ci]; g.pick = blanksIn(g.card);
      g.players = this.players().map(p=>p.id).filter(id=>id!==g.judgeId);
      g.played = {}; g.subs = []; g.showIdx = 0; g.seen = 0; g.winnerSid = null; g.result = null;
      g.playEndAt = Date.now() + s.gameConfig.playTime*1000;
      S.plays = {}; S.pidOf = {}; S.swaps = {};
      this.players().forEach(p=>{ this.zpRefill(p.id); this.zpSendHand(p.id); });
      s.phase = 'zpPlay'; s.stage = (s.stage||0)+1;
      this.broadcastState();
      // bots play at a random moment
      g.players.forEach(pid=>{
        const p = this.playerById(pid); if(!p || !p.isBot) return;
        this.later(()=>{
          if(this.state.phase!=='zpPlay' || this.state.g.round!==r) return;
          const hand = (S.hands[pid]||[]).filter(c=>!c.blank);
          const pick = zpShuffle(hand).slice(0, g.pick);
          this.zpHostPlay(pid, pick.map(c=>c.id), {});
        }, 1500 + Math.random()*Math.min(12000, s.gameConfig.playTime*500));
      });
      clearInterval(this.zpWatch);
      this.zpWatch = setInterval(()=>{
        if(!this.isHost || this.state.phase!=='zpPlay' || this.state.g.round!==r){ clearInterval(this.zpWatch); return; }
        const g2 = this.state.g;
        const present = g2.players.filter(id=>this.playerById(id));
        const allIn = present.length>0 && present.every(id=>g2.played[id]);
        const judgeGone = !this.playerById(g2.judgeId);
        if(allIn || judgeGone || Date.now() >= g2.playEndAt + ZP_GRACE_MS){
          clearInterval(this.zpWatch);
          this.later(()=>this.zpStartJudging(judgeGone), allIn ? 800 : 0);
        }
      }, 400);
    },
    zpHostPlay(pid, cardIds, texts){
      if(!this.isHost) return 'no-host';
      const s = this.state, g = s.g, S = this.zpSecret;
      if(s.phase!=='zpPlay') return 'phase';
      if(pid===g.judgeId || !g.players.includes(pid)) return 'not-player';
      if(g.played[pid]) return 'already';
      if(!Array.isArray(cardIds) || cardIds.length!==g.pick || new Set(cardIds).size!==cardIds.length) return 'count';
      const hand = S.hands[pid]||[];
      const cards = cardIds.map(id=>hand.find(c=>c.id===id));
      if(cards.some(c=>!c)) return 'not-in-hand';
      const answers = cards.map(c=> c.blank ? zpClean(texts && texts[c.id]) : c.text);
      if(answers.some(a=>!a)) return 'empty-blank';
      S.hands[pid] = hand.filter(c=>!cardIds.includes(c.id));
      cards.forEach(c=>{ if(!c.blank) S.discard.push(c.src); });
      S.plays[pid] = answers;
      g.played = { ...g.played, [pid]:true };
      this.broadcastState();
      return null;
    },
    zpHostSwap(pid, cardId){
      if(!this.isHost) return false;
      const s = this.state, g = s.g, S = this.zpSecret;
      if(s.phase!=='zpPlay' || g.played[pid]) return false;
      if((S.swaps[pid]||0) >= ZP_SWAPS) return false;
      const hand = S.hands[pid]||[]; const i = hand.findIndex(c=>c.id===cardId);
      if(i<0){ this.zpSendHand(pid); return false; } // stale/duplicate request: resync that player
      if(!hand[i].blank) S.discard.push(hand[i].src);
      hand[i] = this.zpDraw();
      S.swaps[pid] = (S.swaps[pid]||0)+1;
      this.zpSendHand(pid);
      return true;
    },
    zpStartJudging(judgeGone){
      if(!this.isHost) return;
      const s = this.state, g = s.g, S = this.zpSecret, r = g.round;
      if(s.phase!=='zpPlay') return;
      const authors = zpShuffle(Object.keys(S.plays).filter(pid=>this.playerById(pid)));
      g.subs = authors.map((pid,i)=>{ const sid='s'+i+Math.random().toString(36).slice(2,6); S.pidOf[sid]=pid; return { sid, answers:S.plays[pid] }; });
      g.showIdx = 0; g.seen = 0;
      if(!g.subs.length || judgeGone){ this.zpFinishRound(null); return; }
      s.phase = 'zpJudge'; s.stage = (s.stage||0)+1;
      this.broadcastState();
      const jp = this.playerById(g.judgeId);
      if(jp && jp.isBot){ // bot reader: flips through, then picks one
        g.subs.forEach((_,i)=>{ if(i>0) this.later(()=>{ if(this.state.phase==='zpJudge' && this.state.g.round===r) this.zpHostNav(g.judgeId, 1); }, i*2600); });
        this.later(()=>{ if(this.state.phase==='zpJudge' && this.state.g.round===r) this.zpHostPick(g.judgeId, g.subs[Math.floor(Math.random()*g.subs.length)].sid); }, g.subs.length*2600 + 1200);
      }
      clearInterval(this.zpWatch);
      this.zpWatch = setInterval(()=>{ // reader left mid-judging: nobody scores
        if(!this.isHost || this.state.phase!=='zpJudge' || this.state.g.round!==r){ clearInterval(this.zpWatch); return; }
        if(!this.playerById(this.state.g.judgeId)){ clearInterval(this.zpWatch); this.zpFinishRound(null); }
      }, 1000);
    },
    zpHostNav(pid, delta){
      if(!this.isHost) return;
      const g = this.state.g;
      if(this.state.phase!=='zpJudge' || pid!==g.judgeId) return;
      const next = Math.max(0, Math.min(g.subs.length-1, g.showIdx + (delta>0?1:-1)));
      if(next===g.showIdx) return;
      g.showIdx = next; g.seen = Math.max(g.seen, next);
      this.broadcastState();
    },
    zpHostPick(pid, sid){
      if(!this.isHost) return;
      const g = this.state.g;
      if(this.state.phase!=='zpJudge' || pid!==g.judgeId) return;
      if(!g.subs.some(x=>x.sid===sid)) return;
      this.zpFinishRound(sid);
    },
    zpFinishRound(sid){
      if(!this.isHost) return;
      clearInterval(this.zpWatch);
      const s = this.state, g = s.g, S = this.zpSecret;
      const winnerPid = sid ? S.pidOf[sid] : null;
      if(winnerPid) g.scores = { ...g.scores, [winnerPid]:(g.scores[winnerPid]||0)+1 };
      g.winnerSid = sid;
      g.result = { winnerPid, card:g.card, subs: g.subs.map(x=>({ ...x, pid:S.pidOf[x.sid] })) };
      if(winnerPid){ const w = g.subs.find(x=>x.sid===sid); g.history = [...g.history, { card:g.card, answers:w.answers, pid:winnerPid }]; }
      s.phase = 'zpResult'; s.stage = (s.stage||0)+1;
      this.broadcastState();
    },
    zpWinner(){ const g=this.state.g, t=this.state.gameConfig.target; return Object.keys(g.scores||{}).find(id=>g.scores[id]>=t && this.playerById(id)) || null; },
    zpNext(){
      if(!this.isHost) return;
      if(this.zpWinner()){
        if(this.state.match) this.rondaGameFinished();
        else { this.state.phase='zpFinal'; this.state.stage=(this.state.stage||0)+1; this.broadcastState(); }
      } else this.zpStartRound(this.state.g.round+1);
    },
    zpPlayAgain(){
      if(!this.isHost) return;
      clearInterval(this.zpWatch); this.zpSecret = null;
      this.state.g = this.zpFreshG(); this.state.phase='lobby'; this.state.stage=(this.state.stage||0)+1;
      this.broadcastState();
    },

    /* ---------- host: guest actions ---------- */
    zpOnAction(msg){
      const g = this.state.g;
      if(msg.round!==g.round) return;
      if(msg.type==='zpPlay') this.zpHostPlay(msg.id, msg.cards, msg.texts);
      else if(msg.type==='zpSwap') this.zpHostSwap(msg.id, msg.card);
      else if(msg.type==='zpNav') this.zpHostNav(msg.id, msg.delta);
      else if(msg.type==='zpPick') this.zpHostPick(msg.id, msg.sid);
      else if(msg.type==='zpSync') this.zpSendHand(msg.id);
    },

    /* ---------- every client ---------- */
    zpReceiveHand(p){
      const L = this.zpL();
      const fresh = L.handRound !== p.round;
      L.hand = p.hand; L.handRound = p.round; L.swapsLeft = p.swapsLeft; L.swapMode = false; L.swapPending = null;
      L.sel = fresh ? [] : L.sel.filter(id=>p.hand.some(c=>c.id===id));
      if(this.local.screen==='zpPlay') this.renderScreen();
    },
    zpToggle(id){
      if(!this.state || this.state.phase!=='zpPlay' || this.zpAmJudge() || this.zpHasPlayed()) return;
      const L = this.zpL(), pick = this.state.g.pick;
      if(L.swapMode){
        L.swapMode = false;
        if(L.swapsLeft<=0 || L.swapPending) return this.renderScreen();
        L.sel = L.sel.filter(x=>x!==id);
        if(this.isHost) this.zpHostSwap(this.myId, id);
        else {
          L.swapPending = id;
          const payload = { id:this.myId, round:this.state.g.round, card:id };
          this.sendAction('zpSwap', payload);
          // retry until the new hand arrives (the host ignores a swap of a card you no longer hold)
          let tries = 0;
          clearInterval(this._zpSwapRetry);
          this._zpSwapRetry = setInterval(()=>{
            if(L.swapPending!==id || ++tries>4 || !this.state || this.state.phase!=='zpPlay'){ clearInterval(this._zpSwapRetry); if(L.swapPending===id){ L.swapPending=null; this.renderScreen(); } return; }
            this.sendAction('zpSwap', payload);
          }, 1200);
        }
        if(this.soundOn) beep(440,.06,'sine',.05);
        return this.renderScreen();
      }
      if(L.sel.includes(id)) L.sel = L.sel.filter(x=>x!==id);
      else { if(pick===1) L.sel = [id]; else { L.sel = [...L.sel, id]; if(L.sel.length>pick) L.sel = L.sel.slice(-pick); } }
      this.renderScreen();
      const card = L.hand.find(c=>c.id===id);
      if(card && card.blank && L.sel.includes(id)) this.later(()=>{ const el=this.root.querySelector(`[data-role="zp-blank"][data-card="${id}"]`); if(el) el.focus(); }, 30);
    },
    zpSubmit(){
      if(!this.state || this.state.phase!=='zpPlay' || this.zpAmJudge() || this.zpHasPlayed()) return;
      const L = this.zpL(), g = this.state.g;
      if(L.sel.length!==g.pick){ this.toast(g.pick===2?'Elegí 2 cartas':'Elegí una carta', CORAL); return; }
      const texts = {};
      for(const id of L.sel){ const c = L.hand.find(x=>x.id===id); if(c && c.blank){ const t = zpClean(L.blank[id]); if(!t){ this.toast('Escribí tu carta en blanco', CORAL); return; } texts[id]=t; } }
      L.sentAnswers = L.sel.map(id=>{ const c=L.hand.find(x=>x.id===id); return c.blank ? texts[id] : c.text; });
      L.sentRound = g.round;
      if(this.isHost){ const err = this.zpHostPlay(this.myId, L.sel, texts); if(err){ L.sentRound=-1; this.toast('No se pudo enviar', CORAL); } }
      else {
        // Broadcast has no delivery guarantee: keep re-sending until the
        // host's state says our play was registered (duplicates are ignored).
        const payload = { id:this.myId, round:g.round, cards:L.sel.slice(), texts };
        this.sendAction('zpPlay', payload);
        clearInterval(this._zpRetry);
        this._zpRetry = setInterval(()=>{
          const st = this.state;
          if(!st || st.phase!=='zpPlay' || st.g.round!==payload.round || this.zpPlayConfirmed()){ clearInterval(this._zpRetry); return; }
          this.sendAction('zpPlay', payload);
        }, 1200);
      }
      if(this.soundOn){ beep(660,.08,'triangle',.08); beep(990,.12,'triangle',.08,.08); }
      this.renderScreen();
    },
    zpNav(delta){ if(!this.zpAmJudge()) return; if(this.isHost) this.zpHostNav(this.myId, delta); else this.sendAction('zpNav', { id:this.myId, round:this.state.g.round, delta }); },
    zpPick(){ if(!this.zpAmJudge()) return; const g=this.state.g, sub=g.subs[g.showIdx]; if(!sub) return; if(this.isHost) this.zpHostPick(this.myId, sub.sid); else this.sendAction('zpPick', { id:this.myId, round:g.round, sid:sub.sid }); },

    zpOnStage(s){
      const g = s.g, L = this.zpL();
      clearInterval(this.tick);
      if(s.phase==='zpPlay'){
        if(L.handRound!==g.round){ L.sel=[]; L.blank={}; L.swapMode=false; }
        this.tick = setInterval(()=>{ if(this.local.screen!=='zpPlay'){ clearInterval(this.tick); return; } this.zpTickTimer(); }, 500);
        if(!this.isHost && !this.zpAmJudge()) this.later(()=>{ if(this.state && this.state.phase==='zpPlay' && this.zpL().handRound!==this.state.g.round) this.sendAction('zpSync', { id:this.myId, round:this.state.g.round }); }, 1500);
        if(this.zpAmJudge() && this.soundOn) beep(523,.12,'triangle',.08);
      }
      if(s.phase==='zpJudge' && L.sentRound===g.round && !(g.played||{})[this.myId] && g.judgeId!==this.myId){
        L.sentRound = -1; this.toast('Tu carta no llegó a tiempo esta ronda', CORAL);
      }
      if(s.phase==='zpResult'){ if(g.result && g.result.winnerPid && this.soundOn) [523,659,784,1046].forEach((f,i)=>beep(f,.16,'triangle',.09,i*.12)); }
      this.zpBindKeys();
    },
    zpOnSameStage(){
      if(this.local.screen==='zpPlay'){
        const el = this.root.querySelector('[data-el="zpStatus"]'); if(el) el.innerHTML = this.zpStatusHtml();
        if(this.zpHasPlayed() && this.root.querySelector('[data-action="zpSubmit"]')) this.renderScreen();
        const box = this.root.querySelector('[data-el="zpSentBox"]');
        if(box && this.zpPlayConfirmed() && box.textContent.startsWith('Enviando')){ box.style.background = MINT; box.textContent = '¡Carta jugada! Ahora a esperar…'; }
      } else if(this.local.screen==='zpJudge') this.renderScreen();
    },
    zpBindKeys(){
      if(this._zpKeys) return; this._zpKeys = true;
      document.addEventListener('keydown', e=>{
        if(!this.state || this.local.screen!=='zpJudge' || !this.zpAmJudge()) return;
        if(e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
        if(e.key==='ArrowRight'){ e.preventDefault(); this.zpNav(1); }
        else if(e.key==='ArrowLeft'){ e.preventDefault(); this.zpNav(-1); }
        else if(e.key==='Enter'){ e.preventDefault(); this.zpPick(); }
      });
    },
    zpTickTimer(){
      const g = this.state.g, total = this.state.gameConfig.playTime;
      const left = Math.max(0, Math.min(total, Math.ceil((g.playEndAt - this.zpNow())/1000)));
      const t = this.root.querySelector('[data-el="zpTimerText"]'), b = this.root.querySelector('[data-el="zpTimerBar"]'), box = this.root.querySelector('[data-el="zpTimerBox"]');
      if(t) t.textContent = mmss(left);
      if(b){ b.style.width = (left/total*100)+'%'; b.style.background = left<=10 ? CORAL : INK; }
      if(box) box.style.background = left<=10 ? CORAL : '#fff';
      return left;
    },
    zpStatusHtml(){
      const g = this.state.g;
      return g.players.filter(id=>this.playerById(id)).map(id=>{
        const p = this.playerById(id), done = !!g.played[id];
        return `<div style="display:flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;border-radius:999px;background:${done?MINT:'#fff'};border:2px solid ${done?INK:'var(--line)'}">
          <div style="width:26px;height:26px;flex:0 0 auto">${avatarSVG(p.avatar,26)}</div>
          <span class="one-line" style="font-weight:800;font-size:14px;max-width:110px">${esc(p.name)}</span>${done?'✓':'<span style="color:var(--muted);font-weight:800">···</span>'}
        </div>`;
      }).join('');
    },

    zpActions(){
      return {
        zpSetTarget: t=>{ this.zpDraft.target = Number(t.dataset.val); this.renderScreen(); },
        zpSetTime: t=>{ this.zpDraft.playTime = Number(t.dataset.val); this.renderScreen(); },
        zpConfirmConfig: ()=>this.zpConfirmConfig(),
        zpToggle: t=>this.zpToggle(t.dataset.card),
        zpSwapMode: ()=>{ const L=this.zpL(); if(L.swapsLeft<=0 || L.swapPending) return; L.swapMode = !L.swapMode; this.renderScreen(); },
        zpSubmit: ()=>this.zpSubmit(),
        zpPrev: ()=>this.zpNav(-1),
        zpNext: ()=>this.zpNav(1),
        zpPick: ()=>this.zpPick(),
      };
    },
    zpOnInput(t){ const L=this.zpL(); L.blank[t.dataset.card] = t.value.slice(0, ZP_BLANK_MAX); const prev=this.root.querySelector('[data-el="zpPreview"]'); if(prev) prev.innerHTML = this.zpPreviewInner(); },
    zpPreviewInner(){
      const L = this.zpL(), g = this.state.g;
      const ans = Array.from({length:g.pick},(_,i)=>{ const id=L.sel[i]; if(!id) return null; const c=L.hand.find(x=>x.id===id); if(!c) return null; return c.blank ? (zpClean(L.blank[id])||'…') : c.text; });
      return fillHtml(g.card, ans);
    },

    /* ===================== SCREENS ===================== */
    viewZpConfig(){
      const d = this.zpDraft;
      return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
        <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Zarpado</div></div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:16px 0">
          <div style="display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:18px;background:${INK};color:var(--cream);font-weight:700;font-size:15px"><span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px;padding:4px 10px;border-radius:10px;background:${CORAL};color:${INK}">+18</span>Humor negro y zarpado. Uno lee la frase, el resto la completa con sus cartas.</div>
          <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:6px 18px">
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
              <div style="font-weight:800;font-size:17px">Puntos para ganar</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[3,5,7].map(n=>optBtn('zpSetTarget',n,n,d.target===n)).join('')}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0">
              <div style="font-weight:800;font-size:17px">Tiempo para elegir carta</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${[45,60,90].map(n=>optBtn('zpSetTime',n,n+'s',d.playTime===n)).join('')}</div>
            </div>
          </div>
          <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">10 cartas por jugador · 2 cambios de carta por ronda · el que lee va rotando</div>
          <button class="btn-primary" data-action="zpConfirmConfig">SIGUIENTE</button>
        </div>
      </div>`;
    },

    viewZpPlay(){
      const s = this.state, g = s.g, L = this.zpL();
      const judge = this.playerById(g.judgeId) || { name:'?' };
      const statusCard = `<div class="card" style="padding:12px 14px;display:flex;flex-direction:column;gap:8px"><div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Ya eligieron</div><div data-el="zpStatus" style="display:flex;flex-wrap:wrap;gap:6px">${this.zpStatusHtml()}</div></div>`;
      const judgeChip = `<div class="zp-judge-chip"><div style="width:30px;height:30px">${avatarSVG(judge.avatar,30)}</div><span>${this.zpAmJudge()?'Vos leés esta ronda':esc(judge.name)+' lee esta ronda'}</span><span>👑</span></div>`;
      let body;
      if(this.zpAmJudge()){
        body = `<div class="zp-col">${judgeChip}${blackCard(fillHtml(g.card, Array(g.pick).fill(null)))}
          <div style="text-align:center;font-weight:800;font-size:16px">Leé la frase en voz alta 🎤</div>
          <div style="text-align:center;font-size:14px;font-weight:600;color:var(--muted)">Cuando todos elijan, vas a leer las respuestas de a una y elegir la más zarpada.</div>
          ${statusCard}</div>`;
      } else if(this.zpHasPlayed()){
        const ans = L.sentRound===g.round && L.sentAnswers ? L.sentAnswers : Array(g.pick).fill(null);
        body = `<div class="zp-col">${judgeChip}${blackCard(fillHtml(g.card, ans))}
          <div data-el="zpSentBox" style="background:${this.zpPlayConfirmed()?MINT:'#fff'};border:2.5px solid ${INK};border-radius:20px;box-shadow:0 4px 0 ${INK};padding:14px 16px;font-weight:800;font-size:17px;text-align:center;animation:pop .4s both">${this.zpPlayConfirmed()?'¡Carta jugada! Ahora a esperar…':'Enviando tu carta…'}</div>
          ${statusCard}</div>`;
      } else if(!L.hand.length || L.handRound!==g.round){
        body = `<div class="zp-col">${judgeChip}${blackCard(fillHtml(g.card, Array(g.pick).fill(null)))}<div style="display:flex;justify-content:center;padding:20px"><div class="spinner"></div></div></div>`;
      } else {
        const cards = L.hand.map(c=>{
          const order = L.sel.indexOf(c.id);
          const on = order>=0;
          return `<div class="zp-white${on?' on':''}${L.swapMode?' swap':''}" data-action="zpToggle" data-card="${c.id}" role="button" tabindex="0">
            ${on && g.pick>1?`<div class="zp-order">${order+1}</div>`:''}
            ${c.blank
              ? (on ? `<textarea class="zp-blank-input" data-action="stop" data-role="zp-blank" data-card="${c.id}" maxlength="${ZP_BLANK_MAX}" rows="3" placeholder="Escribí tu respuesta…">${esc(L.blank[c.id]||'')}</textarea>` : `<div class="zp-white-text" style="color:var(--muted)">✏️ Carta en blanco<br><span style="font-size:12px">Escribí lo que quieras</span></div>`)
              : `<div class="zp-white-text">${esc(c.text)}</div>`}
          </div>`;
        }).join('');
        const ready = L.sel.length===g.pick;
        body = `<div class="zp-play">
          <div class="zp-col">${judgeChip}<div data-el="zpPreviewBox">${blackCard(`<span data-el="zpPreview">${this.zpPreviewInner()}</span>`)}</div>
            <div class="zp-hide-mobile">${statusCard}</div>
          </div>
          <div class="zp-col">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
              <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${L.swapMode?'Tocá la carta que querés cambiar':(g.pick>1?'Elegí 2 cartas, en orden':'Elegí tu carta')}</div>
              <button class="zp-swap${L.swapMode?' on':''}" data-action="zpSwapMode" ${(L.swapsLeft<=0||L.swapPending)?'disabled':''}>🔄 ${L.swapPending?'Cambiando…':L.swapMode?'Cancelar':`Cambiar · ${L.swapsLeft}`}</button>
            </div>
            <div class="zp-hand">${cards}</div>
          </div>
        </div>
        <div class="sticky-bottom" style="margin:0;padding:14px 20px 18px"><div style="width:100%;max-width:520px;margin:0 auto"><button class="btn-primary" data-action="zpSubmit" ${ready?'':'disabled'}>${ready?'JUGAR CARTA':(g.pick>1?`ELEGÍ ${g.pick-L.sel.length} MÁS`:'ELEGÍ UNA CARTA')}</button></div></div>`;
      }
      return `<div style="min-height:100vh;display:flex;flex-direction:column">${header(s, true)}<div class="mm-wide" style="flex:1;width:100%;margin:0 auto;padding:16px 20px 24px">${body}</div></div>`;
    },

    viewZpJudge(){
      const s = this.state, g = s.g;
      const judge = this.playerById(g.judgeId) || { name:'?' };
      const sub = g.subs[g.showIdx];
      const dots = g.subs.map((_,i)=>`<div style="width:${i===g.showIdx?'26px':'10px'};height:10px;border-radius:999px;background:${i===g.showIdx?CORAL:(i<=g.seen?INK:'#fff')};border:2px solid ${INK}"></div>`).join('');
      const me = this.zpAmJudge();
      const controls = me
        ? `<div class="mm-nav">
             <button class="btn-secondary mm-nav-prev" data-action="zpPrev" aria-label="Anterior" ${g.showIdx<=0?'disabled':''}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
             <button class="btn-primary" data-action="zpPick">ELEGIR ESTA 👑</button>
             <button class="btn-secondary mm-nav-prev" data-action="zpNext" aria-label="Siguiente" ${g.showIdx>=g.subs.length-1?'disabled':''}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
           </div><div class="mm-nav-hint">Leé cada una en voz alta · ← → para pasar · Enter para elegir</div>`
        : waitHost(judge.name, 'está leyendo las respuestas');
      return `<div style="min-height:100vh;display:flex;flex-direction:column">${header(s, false)}
        <div class="zp-judge-col" style="flex:1;width:100%;margin:0 auto;padding:18px 20px 24px;display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
            <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">Respuesta ${g.showIdx+1} de ${g.subs.length}</div>
            <div style="display:flex;gap:5px">${dots}</div>
          </div>
          <div class="zp-slide" data-key="${sub?sub.sid:''}">${sub?blackCard(fillHtml(g.card, sub.answers)):''}</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;color:var(--muted)"><div style="width:30px;height:30px">${avatarSVG(judge.avatar,30)}</div>${me?'Vos elegís la ganadora':esc(judge.name)+' elige la ganadora'}</div>
        </div>
        <div class="sticky-bottom" style="margin:0;padding:14px 20px 18px"><div style="width:100%;max-width:560px;margin:0 auto">${controls}</div></div>
      </div>`;
    },

    viewZpResult(){
      const s = this.state, g = s.g, res = g.result || { subs:[] };
      const w = res.winnerPid ? this.playerById(res.winnerPid) || { name:'Jugador desconectado' } : null;
      const win = res.subs.find(x=>x.sid===g.winnerSid);
      const sc = this.zpScores();
      const order = this.rankOf(sc).filter(id=>this.playerById(id));
      const someoneWon = this.zpWinner();
      const others = res.subs.filter(x=>x.sid!==g.winnerSid).map(x=>{ const p=this.playerById(x.pid)||{name:'?'}; return `<div class="zp-other"><div style="width:30px;height:30px;flex:0 0 auto">${avatarSVG(p.avatar,30)}</div><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:14px">${esc(p.name)}${x.pid===this.myId?' (vos)':''}</div><div style="font-size:14px;font-weight:600;color:var(--muted)">${x.answers.map(a=>'“'+esc(a)+'”').join(' + ')}</div></div></div>`; }).join('');
      const board = order.map((id,i)=>{ const p=this.playerById(id); return `<div class="zp-score${id===res.winnerPid?' won':''}"><span style="width:18px;font-weight:800">${i+1}</span><div style="width:28px;height:28px;flex:0 0 auto">${avatarSVG(p.avatar,28)}</div><span class="one-line" style="flex:1;font-weight:800">${esc(p.name)}</span><span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${sc[id]}<span style="font-size:13px;color:var(--muted)">/${s.gameConfig.target}</span></span></div>`; }).join('');
      const bottom = this.isHost
        ? `<button class="btn-primary" data-action="nextRound">${someoneWon?(s.match?'TERMINAR JUEGO':'VER RESULTADO FINAL'):'SIGUIENTE RONDA'}</button>`
        : waitHost(this.playerById(s.hostId)?.name||'El anfitrión', 'va a continuar');
      const confetti = w ? `<div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${this.confetti.slice(0,26).map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} 2 both"></div>`).join('')}</div>` : '';
      return `<div style="position:relative;min-height:100vh">${confetti}
        <div class="screen" style="position:relative;z-index:2;max-width:1100px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
            <div style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Ronda ${g.round+1}</div>
            <div class="heading" style="font-size:clamp(28px,7vw,44px);line-height:1.05;animation:pop .6s cubic-bezier(.3,1.6,.5,1) both">${w?esc(w.name).toUpperCase()+(res.winnerPid===this.myId?' (VOS)':'')+' SE LLEVA EL PUNTO':'NADIE SUMA ESTA RONDA'}</div>
          </div>
          <div class="zp-result">
            <div class="zp-col">
              ${win?`<div class="zp-winner-card">${blackCard(fillHtml(res.card, win.answers))}</div>
                <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:${YEL};border:2.5px solid ${INK};box-shadow:0 4px 0 ${INK}"><div style="width:44px;height:44px">${avatarSVG(w.avatar,44)}</div><div style="flex:1;font-weight:800;font-size:18px">${esc(w.name)}</div><div style="padding:4px 12px;border-radius:999px;background:${MINT};border:2px solid ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">+1</div></div>`
              : blackCard(fillHtml(res.card, Array(blanksIn(res.card)).fill(null)))}
              ${others?`<div class="section-label" style="text-align:left;margin-top:6px">Las otras respuestas</div>${others}`:''}
            </div>
            <div class="zp-col"><div class="section-label" style="text-align:left">Puntos · gana el primero a ${s.gameConfig.target}</div>${board}</div>
          </div>
          <div class="sticky-bottom"><div style="width:100%;max-width:520px;margin:0 auto">${bottom}</div></div>
        </div></div>`;
    },

    viewZpFinal(){
      const s = this.state, g = s.g, sc = this.zpScores(), pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
      const nr = this.rankOf(sc).filter(id=>byId[id]);
      const w = byId[nr[0]];
      const pod = [1,0,2].filter(i=>nr[i]);
      const H=['170px','124px','92px'], PBG=[YEL,'#E4DEF5','#F6BE9E'];
      const podium = pod.map(i=>{ const p=byId[nr[i]]; return `<div style="flex:0 1 130px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;animation:rise .6s both;animation-delay:${(0.2+(2-i)*0.15).toFixed(2)}s"><div style="width:${i===0?72:56}px;height:${i===0?72:56}px">${avatarSVG(p.avatar,i===0?72:56)}</div><div style="font-weight:800;font-size:16px;text-align:center">${esc(p.name)}</div><div style="width:100%;height:${H[i]};border-radius:18px 18px 0 0;background:${PBG[i]};border:2.5px solid ${INK};border-bottom:0;display:flex;flex-direction:column;align-items:center;padding-top:10px"><div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:40px;line-height:1">${i+1}</div><div style="font-weight:800;font-size:14px">${sc[p.id]} pts</div></div></div>`; }).join('');
      const best = (g.history||[]).slice(-6).reverse().map(h=>{ const p=byId[h.pid]||{name:'?'}; return `<div style="display:flex;flex-direction:column;gap:6px">${blackCard(fillHtml(h.card, h.answers), true)}<div style="font-size:13px;font-weight:800">${esc(p.name)}</div></div>`; }).join('');
      const confetti = this.confetti.map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} 2 both"></div>`).join('');
      const bottom = this.isHost
        ? `<button class="btn-primary final-btn" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary final-btn" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
        : `<div style="flex:1">${waitHost(this.playerById(s.hostId)?.name||'El anfitrión','elige qué sigue')}</div>`;
      return `<div style="position:relative;min-height:100vh;overflow:hidden">
        <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confetti}</div>
        <div class="mm-wide" style="position:relative;z-index:2;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
            <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
            <div class="heading" style="font-size:clamp(40px,11vw,80px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${w?(w.id===this.myId?'¡GANASTE, '+esc(w.name).toUpperCase()+'!':esc(w.name).toUpperCase()+' ES EL MÁS ZARPADO'):'PARTIDA TERMINADA'}</div>
          </div>
          <div class="mm-final-grid">
            <div class="mm-final-rank"><div class="section-label" style="text-align:left">Posiciones</div><div style="display:flex;align-items:flex-end;justify-content:center;gap:10px;padding-top:6px">${podium}</div></div>
            ${best?`<div class="mm-final-side"><div class="section-label" style="text-align:left">Las frases ganadoras</div><div class="zp-best">${best}</div></div>`:''}
          </div>
          <div class="sticky-bottom"><div class="final-actions">${bottom}</div></div>
        </div></div>`;
    },
  });
}
