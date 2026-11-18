// ================= MAKE IT MEME =================
// Self-contained game module for Ronda. It plugs into the shared Game class
// (rooms, players, Supabase channel, lobby, chat, Modo Ronda) through
// installMakeItMeme() — the same way every other game's methods live on
// Game — but its code lives here so it doesn't grow app.js.
//
// The file has two parts:
//   1. Pure game logic (no DOM, no network): caption cleanup, vote tally,
//      scoring, totals and end-of-match stats. Easy to test on its own.
//   2. The integration: host-authoritative round flow + screens.
//
// Security model (same as Impostor/Dibujalo): the host is the authority.
//  - While writing, captions live ONLY in host memory (this.mmSecret). The
//    shared state only says WHO already sent (a boolean per player).
//  - While voting, memes are broadcast anonymously, shuffled, under random
//    ids. Each author is told privately which one is theirs (event mmOwn).
//  - Votes are tallied host-side (this.mmVotes). The host rejects double
//    votes, self votes, votes for unknown memes and votes outside the
//    voting phase. Only "who already voted" is public until results.
//  - Phase changes and deadlines are set by the host; every client counts
//    down to the same absolute deadline (corrected by the host clock offset).

import { MEME_CATEGORIES, memeTemplate, memeCategoryCounts, pickMemeTemplate, MEME_BOT_CAPTIONS } from './memebank.js';

/* ===================== 1. PURE LOGIC ===================== */

// Points for 1st, 2nd and 3rd place by votes received. Copied into each
// game's config when it starts, so changing it here rebalances new games.
export const MM_POINTS = [5,3,1];
export const MM_CAPTION_MAX = 70;
const MM_INTRO_MS = 2600;       // "Ronda N" intro before typing starts
const MM_WRITE_GRACE_MS = 2500; // wait for late submits after the deadline
const MM_VOTE_GRACE_MS = 1200;

export function mmDefaultConfig(){
  return { rounds:5, writeTime:60, voteTime:30, categories:Object.keys(MEME_CATEGORIES), hostScreen:false, points:[...MM_POINTS] };
}

export function mmCleanCaption(s){
  return String(s ?? '').replace(/\s+/g,' ').trim().slice(0, MM_CAPTION_MAX);
}

export function mmShuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// Scores one round. entries: [{mid,pid,top,bottom}], votes: {voterId: mid}.
// Ranking by votes uses "competition" places: tied memes share the place
// (two memes tied for 1st both get 1st-place points, the next one is 3rd).
// A meme with 0 votes never scores.
export function mmScoreRound(entries, votes, points){
  const tally = {};
  entries.forEach(e=>{ tally[e.mid] = 0; });
  Object.values(votes || {}).forEach(mid=>{ if(tally[mid] != null) tally[mid]++; });
  const rows = entries.map(e=>({ mid:e.mid, pid:e.pid, top:e.top, bottom:e.bottom, votes:tally[e.mid] }));
  rows.sort((a,b)=> b.votes - a.votes);
  rows.forEach(r=>{
    if(r.votes <= 0){ r.place = null; r.points = 0; return; }
    r.place = 1 + rows.filter(o=>o.votes > r.votes).length;
    r.points = (points || MM_POINTS)[r.place-1] || 0;
  });
  return rows;
}

// Cumulative points per player id over rounds 0..uptoRound.
export function mmTotalsFrom(results, playerIds, uptoRound){
  const t = {}; playerIds.forEach(id=>{ t[id] = 0; });
  for(let r=0; r<=uptoRound; r++){
    const res = results && results[r]; if(!res) continue;
    res.entries.forEach(e=>{ if(t[e.pid] != null) t[e.pid] += e.points; });
  }
  return t;
}

// Fun end-of-match stats. Returns [{key, pid, n, extra}] — the view turns
// them into cards. Pure: works from the shared state only.
export function mmFinalStats(g, playerIds){
  const has = id => playerIds.includes(id);
  const wins = {}, votesTotal = {}, goodEye = {}, zeroes = {}, speedSum = {}, speedN = {};
  let best = null, unanimous = null;
  (g.results || []).forEach((res, r)=>{
    if(!res) return;
    const winners = res.entries.filter(e=>e.place === 1);
    winners.forEach(e=>{ wins[e.pid] = (wins[e.pid]||0) + 1; });
    res.entries.forEach(e=>{
      votesTotal[e.pid] = (votesTotal[e.pid]||0) + e.votes;
      if(e.votes === 0) zeroes[e.pid] = (zeroes[e.pid]||0) + 1;
      if(!best || e.votes > best.votes) best = { ...e, round:r, templateId:g.templateId[r] };
    });
    const winnerMids = new Set(winners.map(e=>e.mid));
    Object.entries(res.votes || {}).forEach(([voter, mid])=>{ if(winnerMids.has(mid)) goodEye[voter] = (goodEye[voter]||0) + 1; });
    const voters = Object.keys(res.votes || {}).length;
    if(winners.length === 1 && voters >= 2 && winners[0].votes === voters && (!unanimous || voters > unanimous.n)) unanimous = { pid:winners[0].pid, n:voters, round:r };
    Object.entries((g.submitMs && g.submitMs[r]) || {}).forEach(([pid, ms])=>{ speedSum[pid] = (speedSum[pid]||0) + ms; speedN[pid] = (speedN[pid]||0) + 1; });
  });
  const top = obj => { const e = Object.entries(obj).filter(([id,v])=>has(id) && v>0).sort((a,b)=>b[1]-a[1])[0]; return e ? { pid:e[0], n:e[1] } : null; };
  const fastest = Object.keys(speedSum).filter(has).map(pid=>({ pid, n:Math.round(speedSum[pid]/speedN[pid]/1000) })).sort((a,b)=>a.n-b.n)[0] || null;
  return [
    best && best.votes > 0 && has(best.pid) && { key:'best', pid:best.pid, n:best.votes, extra:best },
    top(wins) && { key:'wins', ...top(wins) },
    unanimous && has(unanimous.pid) && { key:'unanimous', ...unanimous },
    top(goodEye) && { key:'eye', ...top(goodEye) },
    fastest && { key:'fast', ...fastest },
    top(zeroes) && { key:'misunderstood', ...top(zeroes) },
  ].filter(Boolean);
}

// Caption size (in container-width units) so long texts still fit the image.
export function mmCaptionSize(text){
  const n = (text || '').length;
  if(n <= 12) return 10.5;
  if(n <= 24) return 8.4;
  if(n <= 40) return 6.8;
  if(n <= 56) return 5.8;
  return 5.1;
}

/* ===================== 2. INTEGRATION ===================== */

export function installMakeItMeme(Game, ui){
  const { INK, CORAL, MINT, YEL, VIOLET, BLUE, PINK, CONF_COLORS, avatarSVG, esc, mmss, beep, gameEstimateMinutes } = ui;

  // ---------- small view helpers ----------
  const memeHtml = (templateId, top, bottom, opts={})=>{
    const tpl = memeTemplate(templateId);
    if(!tpl) return `<div class="mm-meme" style="aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800">Plantilla no encontrada</div>`;
    const maxH = opts.maxVh ? `max-width:min(100%, calc(${opts.maxVh}vh * ${(tpl.w/tpl.h).toFixed(4)}));margin:0 auto;` : '';
    return `<div class="mm-meme" style="aspect-ratio:${tpl.w}/${tpl.h};${maxH}${opts.style||''}">
      ${tpl.video
        ? `<video src="${tpl.src}" poster="${tpl.poster}" width="${tpl.w}" height="${tpl.h}" autoplay muted loop playsinline disablepictureinpicture preload="auto"></video>`
        : `<img src="${tpl.src}" alt="" width="${tpl.w}" height="${tpl.h}" draggable="false" decoding="async">`}
      <div class="mm-cap mm-cap-top" ${opts.live?'data-el="mmPrevTop"':''} style="font-size:${mmCaptionSize(top)}cqw">${esc(top||'')}</div>
      <div class="mm-cap mm-cap-bottom" ${opts.live?'data-el="mmPrevBottom"':''} style="font-size:${mmCaptionSize(bottom)}cqw">${esc(bottom||'')}</div>
    </div>`;
  };
  const optBtn = (action, val, label, on)=>`<button data-action="${action}" data-val="${val}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${on?INK:'#fff'};color:${on?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${label}</button>`;
  const waitHost = (s, self, verb)=>`<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:15px;color:var(--muted)">${esc(self.playerById(s.hostId)?.name||'El anfitrión')} ${verb||'va a continuar'}<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
  const timerBar = (total)=>`
    <div data-el="mmTimerBox" style="display:flex;align-items:center;gap:8px;height:46px;padding:0 14px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;font-variant-numeric:tabular-nums">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2.5M9 2h6"></path></svg>
      <span data-el="mmTimerText">${mmss(total)}</span>
    </div>`;
  const header = (s, total, extra)=>`
    <div style="position:sticky;top:0;z-index:10;background:var(--cream)">
      <div class="mm-header" style="max-width:1080px;margin:0 auto;display:flex;align-items:center;gap:12px">
        <button class="icon-btn" data-action="askLeave" aria-label="Salir"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>
        <div style="flex:1;min-width:0;display:flex;align-items:baseline;gap:6px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800"><span style="font-size:20px">RONDA ${s.g.round+1}</span><span style="font-size:14px;color:var(--muted)">de ${s.gameConfig.rounds}</span>${extra||''}</div>
        ${total!=null?timerBar(total):''}
      </div>
      ${total!=null?`<div style="height:6px;background:var(--line)"><div data-el="mmTimerBar" style="height:100%;width:100%;background:${INK};transition:width .5s linear,background .3s"></div></div>`:''}
    </div>`;

  Object.assign(Game.prototype, {

    /* ---------- shared helpers ---------- */
    mmNow(){ return Date.now() + (this.isHost ? 0 : (this.hostClockOffset||0)); },
    mmL(){ if(!this.local.mm) this.local.mm = { round:-1, top:'', bottom:'', sentRound:-1, ownMid:null, ownRound:-1, pick:null, votedMid:null, votedRound:-1, intro:false, countdown:null, revealStep:0, revealRound:-1 }; return this.local.mm; },
    mmParticipants(r){ const g=this.state.g; return ((g.participants&&g.participants[r])||[]).filter(id=>this.playerById(id)); },
    mmAmParticipant(){ const g=this.state&&this.state.g; return !!(g && (g.participants[g.round]||[]).includes(this.myId)); },
    mmHasSent(){ const g=this.state.g, L=this.mmL(); return L.sentRound===g.round || !!(g.submitted[g.round]&&g.submitted[g.round][this.myId]); },
    mmHasVoted(){ const g=this.state.g, L=this.mmL(); return L.votedRound===g.round || !!(g.voted[g.round]&&g.voted[g.round][this.myId]); },
    // Players that compete (the host's TV screen, if used, doesn't).
    mmRankedPlayers(){
      const s = this.state, cfg = s.gameConfig || {};
      return this.players().filter(p=>!(cfg.hostScreen && p.id===s.hostId));
    },
    mmFreshG(){
      return { round:-1, usedTemplates:[], templateId:[], participants:[], writeStartAt:0, writeEndAt:0, voteEndAt:0,
        submitted:[], submitMs:[], entries:[], voted:[], results:[] };
    },

    /* ---------- config (host, from the lobby) ---------- */
    mmConfirmConfig(){
      if(!this.isHost) return;
      const d = this.mmDraft;
      if(!d.categories.length){ this.toast('Elegí al menos una categoría', CORAL); return; }
      this.state.gameId = 'makeitmeme';
      this.state.gameConfig = { ...d, categories:[...d.categories], points:[...(d.points||MM_POINTS)] };
      this.state.g = this.mmFreshG();
      this.state.stage = (this.state.stage||0) + 1;
      this.local.hostFlow = null;
      this.broadcastState();
    },

    /* ---------- host: round flow ---------- */
    mmStartGame(){
      if(!this.isHost) return;
      this.state.g = this.mmFreshG();
      this.mmStartRound(0);
    },
    mmStartRound(r){
      if(!this.isHost) return;
      const s = this.state, g = s.g, cfg = s.gameConfig;
      const tplId = pickMemeTemplate(g.usedTemplates, cfg.categories);
      const participants = this.players().filter(p=>!(cfg.hostScreen && p.id===s.hostId)).map(p=>p.id);
      this.mmSecret = { round:r, captions:{}, pidOf:{}, midOf:{} };
      this.mmVotes = {};
      this.mmDrafts = {};
      g.round = r;
      g.usedTemplates = [...g.usedTemplates, tplId];
      g.templateId[r] = tplId;
      g.participants[r] = participants;
      g.submitted[r] = {};
      g.submitMs[r] = {};
      g.entries[r] = null;
      g.voted[r] = {};
      g.results[r] = null;
      g.writeStartAt = Date.now() + MM_INTRO_MS;
      g.writeEndAt = g.writeStartAt + cfg.writeTime*1000;
      s.phase = 'mmWrite';
      s.stage = (s.stage||0) + 1;
      this.broadcastState();
      // practice-mode bots write something at a random moment
      participants.forEach(pid=>{
        const p = this.playerById(pid); if(!p || !p.isBot) return;
        const total = cfg.writeTime*1000;
        this.later(()=>{
          if(!this.isHost || this.state.phase!=='mmWrite' || this.state.g.round!==r) return;
          const [top, bottom] = MEME_BOT_CAPTIONS[Math.floor(Math.random()*MEME_BOT_CAPTIONS.length)];
          this.mmHostSubmit(pid, top, bottom);
        }, MM_INTRO_MS + total*0.2 + Math.random()*total*0.5);
      });
      clearInterval(this.mmWatch);
      this.mmWatch = setInterval(()=>{
        if(!this.isHost || this.state.phase!=='mmWrite' || this.state.g.round!==r){ clearInterval(this.mmWatch); return; }
        const g2 = this.state.g;
        const present = this.mmParticipants(r);
        const allIn = present.length>0 && present.every(id=>g2.submitted[r][id]);
        if(allIn || Date.now() >= g2.writeEndAt + MM_WRITE_GRACE_MS){
          clearInterval(this.mmWatch);
          this.later(()=>this.mmStartVote(), allIn ? 900 : 0);
        }
      }, 400);
    },
    // Host-only validation of a submitted meme.
    mmHostSubmit(pid, top, bottom){
      if(!this.isHost) return false;
      const s = this.state, g = s.g, r = g.round;
      if(s.phase!=='mmWrite' || !this.mmSecret || this.mmSecret.round!==r) return false;
      if(!(g.participants[r]||[]).includes(pid)) return false;
      if(g.submitted[r][pid]) return false;
      const t = mmCleanCaption(top), b = mmCleanCaption(bottom);
      if(!t && !b) return false;
      this.mmSecret.captions[pid] = { top:t, bottom:b };
      g.submitted[r][pid] = true;
      g.submitMs[r][pid] = Math.max(0, Date.now() - g.writeStartAt);
      this.broadcastState();
      return true;
    },
    mmStartVote(){
      if(!this.isHost) return;
      const s = this.state, g = s.g, r = g.round, cfg = s.gameConfig;
      if(s.phase!=='mmWrite') return;
      clearInterval(this.mmWatch);
      const present = this.mmParticipants(r);
      // Whoever never pressed "Enviar" (dropped connection, locked phone)
      // still gets their last typed draft in, if there was one.
      present.forEach(pid=>{
        if(this.mmSecret.captions[pid]) return;
        const d = this.mmDrafts && this.mmDrafts[pid];
        const t = mmCleanCaption(d&&d.top), b = mmCleanCaption(d&&d.bottom);
        if(t || b){ this.mmSecret.captions[pid] = { top:t, bottom:b }; g.submitted[r][pid] = true; }
      });
      const authors = mmShuffle(present.filter(pid=>this.mmSecret.captions[pid]));
      const entries = authors.map((pid,i)=>{
        const mid = 'm'+i+Math.random().toString(36).slice(2,6);
        this.mmSecret.pidOf[mid] = pid; this.mmSecret.midOf[pid] = mid;
        return { mid, ...this.mmSecret.captions[pid] };
      });
      g.entries[r] = entries;
      g.voted[r] = {};
      this.mmVotes = {};
      const eligible = this.mmEligibleVoters(r);
      if(!entries.length || !eligible.length){ this.mmStartResults(true); return; }
      g.voteEndAt = Date.now() + cfg.voteTime*1000;
      s.phase = 'mmVote';
      s.stage = (s.stage||0) + 1;
      this.broadcastState();
      // tell each author (privately) which anonymous meme is theirs
      authors.forEach(pid=>this.mmSendOwn(pid));
      eligible.forEach(pid=>{
        const p = this.playerById(pid); if(!p || !p.isBot) return;
        const total = cfg.voteTime*1000;
        this.later(()=>{
          if(!this.isHost || this.state.phase!=='mmVote' || this.state.g.round!==r) return;
          const options = entries.filter(e=>this.mmSecret.pidOf[e.mid]!==pid);
          if(options.length) this.mmHostVote(pid, options[Math.floor(Math.random()*options.length)].mid);
        }, total*0.2 + Math.random()*total*0.5);
      });
      this.mmWatch = setInterval(()=>{
        if(!this.isHost || this.state.phase!=='mmVote' || this.state.g.round!==r){ clearInterval(this.mmWatch); return; }
        const el = this.mmEligibleVoters(r);
        const allIn = el.every(id=>this.mmVotes[id]);
        if(allIn || Date.now() >= this.state.g.voteEndAt + MM_VOTE_GRACE_MS){
          clearInterval(this.mmWatch);
          this.later(()=>this.mmStartResults(), allIn ? 800 : 0);
        }
      }, 400);
    },
    // A participant can vote if there's at least one meme that isn't theirs.
    mmEligibleVoters(r){
      const entries = this.state.g.entries[r] || [];
      return this.mmParticipants(r).filter(pid=>entries.some(e=>this.mmSecret.pidOf[e.mid]!==pid));
    },
    mmSendOwn(pid){
      if(!this.isHost || !this.mmSecret) return;
      const mid = this.mmSecret.midOf[pid]; if(!mid) return;
      const payload = { round:this.mmSecret.round, mid };
      if(pid===this.myId) this.mmReceiveOwn(payload);
      else if(!this.playerById(pid)?.isBot) this.send('mmOwn', { to:pid, ...payload });
    },
    // Host-only validation of a vote. Returns a reason string when rejected.
    mmHostVote(voterId, mid){
      if(!this.isHost) return 'no-host';
      const s = this.state, g = s.g, r = g.round;
      if(s.phase!=='mmVote') return 'phase';
      if(!(g.participants[r]||[]).includes(voterId)) return 'not-player';
      if(this.mmVotes[voterId]) return 'already';
      if(!(g.entries[r]||[]).some(e=>e.mid===mid)) return 'unknown';
      if(this.mmSecret.pidOf[mid]===voterId) return 'own';
      this.mmVotes[voterId] = mid;
      g.voted[r][voterId] = true;
      this.broadcastState();
      return null;
    },
    mmStartResults(skipVote){
      if(!this.isHost) return;
      const s = this.state, g = s.g, r = g.round;
      if(s.phase!=='mmVote' && !(skipVote && s.phase==='mmWrite')) return;
      clearInterval(this.mmWatch);
      const entries = (g.entries[r]||[]).map(e=>({ ...e, pid:this.mmSecret.pidOf[e.mid] }));
      const rows = mmScoreRound(entries, this.mmVotes, s.gameConfig.points);
      g.results[r] = { entries:rows, votes:{ ...this.mmVotes } };
      s.phase = 'mmResults';
      s.stage = (s.stage||0) + 1;
      this.broadcastState();
    },
    mmTotals(uptoRound){
      return mmTotalsFrom(this.state.g.results, this.players().map(p=>p.id), uptoRound);
    },
    mmNext(){
      if(!this.isHost) return;
      if(this.state.g.round+1 < this.state.gameConfig.rounds) this.mmStartRound(this.state.g.round+1);
      else if(this.state.match) this.rondaGameFinished();
      else { this.state.phase='mmFinal'; this.state.stage=(this.state.stage||0)+1; this.broadcastState(); }
    },
    mmPlayAgain(){
      if(!this.isHost) return;
      clearInterval(this.mmWatch);
      this.mmSecret = null; this.mmVotes = null; this.mmDrafts = null;
      this.state.g = this.mmFreshG();
      this.state.phase = 'lobby';
      this.state.stage = (this.state.stage||0) + 1;
      this.broadcastState();
    },

    /* ---------- host: guest actions (routed from onAction) ---------- */
    mmOnAction(msg){
      const g = this.state.g;
      if(msg.round !== g.round) return;
      if(msg.type==='mmSubmit') this.mmHostSubmit(msg.id, msg.top, msg.bottom);
      else if(msg.type==='mmDraft'){
        if(this.state.phase!=='mmWrite') return;
        this.mmDrafts = this.mmDrafts || {};
        this.mmDrafts[msg.id] = { top:mmCleanCaption(msg.top), bottom:mmCleanCaption(msg.bottom) };
      }
      else if(msg.type==='mmVote') this.mmHostVote(msg.id, msg.mid);
      else if(msg.type==='mmSync') this.mmSendOwn(msg.id); // reconnected author asks again which meme is theirs
    },

    /* ---------- every client: local actions ---------- */
    mmReceiveOwn(payload){
      const L = this.mmL();
      L.ownMid = payload.mid; L.ownRound = payload.round;
      if(this.local.screen==='mmVote') this.mmPatchVoteUI();
    },
    mmOnInput(t){
      const L = this.mmL();
      const v = t.value.slice(0, MM_CAPTION_MAX);
      if(t.dataset.role==='mm-top') L.top = v; else L.bottom = v;
      const el = this.root.querySelector(t.dataset.role==='mm-top' ? '[data-el="mmPrevTop"]' : '[data-el="mmPrevBottom"]');
      if(el){ el.textContent = v; el.style.fontSize = mmCaptionSize(v)+'cqw'; }
      const cnt = this.root.querySelector(`[data-el="${t.dataset.role}-count"]`);
      if(cnt) cnt.textContent = (MM_CAPTION_MAX - v.length);
      const btn = this.root.querySelector('[data-el="mmSendBtn"]');
      if(btn) btn.disabled = !(mmCleanCaption(L.top) || mmCleanCaption(L.bottom));
      // debounced draft to the host, as a fallback if our final send never arrives
      clearTimeout(this._mmDraftTimer);
      this._mmDraftTimer = setTimeout(()=>{
        if(!this.state || this.state.phase!=='mmWrite' || this.mmHasSent()) return;
        const draft = { id:this.myId, round:this.state.g.round, top:L.top, bottom:L.bottom };
        if(this.isHost){ this.mmDrafts = this.mmDrafts || {}; this.mmDrafts[this.myId] = { top:mmCleanCaption(L.top), bottom:mmCleanCaption(L.bottom) }; }
        else this.sendAction('mmDraft', draft);
      }, 700);
    },
    mmSubmit(auto){
      if(!this.state || this.state.phase!=='mmWrite' || !this.mmAmParticipant() || this.mmHasSent()) return;
      const L = this.mmL();
      const top = mmCleanCaption(L.top), bottom = mmCleanCaption(L.bottom);
      if(!top && !bottom){ if(!auto) this.toast('Escribí al menos un texto', CORAL); return; }
      if(this.mmNow() < this.state.g.writeStartAt) return;
      L.sentRound = this.state.g.round;
      if(this.isHost) this.mmHostSubmit(this.myId, top, bottom);
      else this.sendAction('mmSubmit', { id:this.myId, round:this.state.g.round, top, bottom });
      if(!auto) this.toast('¡Meme enviado!', MINT);
      this.renderScreen();
    },
    mmPick(mid){
      if(!this.state || this.state.phase!=='mmVote' || !this.mmAmParticipant() || this.mmHasVoted()) return;
      const L = this.mmL();
      if(L.ownRound===this.state.g.round && L.ownMid===mid){ this.toast('No podés votar tu propio meme', CORAL); return; }
      L.pick = L.pick===mid ? null : mid;
      this.mmPatchVoteUI();
    },
    mmConfirmVote(){
      if(!this.state || this.state.phase!=='mmVote' || this.mmHasVoted()) return;
      const L = this.mmL();
      if(!L.pick) return;
      L.votedMid = L.pick; L.votedRound = this.state.g.round;
      if(this.isHost){
        const err = this.mmHostVote(this.myId, L.pick);
        if(err){ L.votedRound = -1; L.votedMid = null; if(err==='own') this.toast('No podés votar tu propio meme', CORAL); }
      } else this.sendAction('mmVote', { id:this.myId, round:this.state.g.round, mid:L.pick });
      if(this.soundOn){ beep(660,.08,'triangle',.08); beep(990,.12,'triangle',.08,.08); }
      this.mmPatchVoteUI();
    },

    /* ---------- every client: stage changes ---------- */
    mmOnStage(s){
      const L = this.mmL(), g = s.g;
      clearInterval(this.tick);
      if(s.phase==='mmWrite'){
        if(L.round!==g.round){ L.round = g.round; L.top=''; L.bottom=''; L.pick=null; L.ownMid=null; }
        const tpl = memeTemplate(g.templateId[g.round]);
        if(tpl){ const im = new Image(); im.src = tpl.poster || tpl.src; }
        const introLeft = g.writeStartAt - this.mmNow();
        L.intro = introLeft > 250;
        L.countdown = null;
        if(L.intro){
          const steps = [3,2,1];
          steps.forEach((n,i)=>{
            const at = introLeft - (steps.length-i)*650;
            if(at > 0) this.later(()=>{ if(this.local.screen==='mmWrite' && L.intro){ L.countdown = n; this.mmPatchCountdown(); } }, at);
          });
          this.later(()=>{ if(this.local.screen==='mmWrite'){ L.intro=false; L.countdown=null; this.renderScreen(); } }, introLeft);
        }
        this.mmStartLocalTimer('write');
      }
      else if(s.phase==='mmVote'){
        L.pick = null;
        this.mmStartLocalTimer('vote');
        // reconnected / late author: ask the host again which meme is ours
        if(!this.isHost && this.mmAmParticipant() && g.submitted[g.round] && g.submitted[g.round][this.myId]){
          this.later(()=>{ if(this.state && this.state.phase==='mmVote' && L.ownRound!==this.state.g.round) this.sendAction('mmSync', { id:this.myId, round:this.state.g.round }); }, 1500);
        }
      }
      else if(s.phase==='mmResults'){
        const res = g.results[g.round];
        const n = res ? res.entries.length : 0;
        if(L.revealRound!==g.round){
          L.revealRound = g.round; L.revealStep = 0;
          for(let i=1;i<=n;i++) this.later(()=>{ if(this.local.screen!=='mmResults') return; L.revealStep = i; this.renderScreen(); if(i===n) this.mmCelebrate(); }, 700 + i*(i===n?1300:900));
        }
      }
      else if(s.phase==='mmRanking'){
        this.local.rankPhase = 0;
        this.later(()=>{ this.local.rankPhase = 1; this.renderScreen(); }, 900);
      }
    },
    // Countdown ticks patch the intro in place (no re-render), so the
    // template's entrance animation plays once instead of restarting.
    mmPatchCountdown(){
      const L = this.mmL();
      const box = this.root.querySelector('[data-el="mmCount"]');
      const img = this.root.querySelector('[data-el="mmIntroMeme"]');
      if(!box){ this.renderScreen(); return; }
      box.innerHTML = `<div style="width:96px;height:96px;border-radius:50%;background:${INK};color:var(--cream);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:52px;animation:pop .4s cubic-bezier(.3,1.6,.5,1) both">${L.countdown}</div>`;
      if(img) img.style.filter = `blur(${L.countdown*3}px)`;
      if(this.soundOn) beep(L.countdown===1?880:660, .09, 'triangle', .07);
    },
    mmCelebrate(){
      if(!this.soundOn) return;
      [523,659,784,1046].forEach((f,i)=>beep(f, .16, 'triangle', .09, i*.12));
    },
    // Same stage, new state (someone sent/voted/left): patch in place so
    // nobody loses focus or scroll position mid-typing.
    mmOnSameStage(){
      if(this.local.screen==='mmWrite'){
        // our meme was registered but we're still showing the inputs (e.g.
        // after a reconnect): switch to the "sent" view
        const r = this.state.g.round;
        if(this.state.g.submitted[r]?.[this.myId] && this.root.querySelector('[data-role="mm-top"]')) this.renderScreen();
        else this.mmPatchStatus();
      }
      else if(this.local.screen==='mmVote') this.mmPatchVoteUI();
    },
    mmAfterRender(){
      const sc = this.local.screen;
      if(sc==='mmWrite'){
        this.mmTickTimer('write');
        if(this.mmAmParticipant() && !this.mmHasSent() && !this.mmL().intro){
          this.later(()=>{ const el=this.root.querySelector('[data-role="mm-top"]'); if(el && document.activeElement!==el && !this.root.querySelector('[data-role="mm-bottom"]:focus')) el.focus({preventScroll:true}); }, 60);
        }
      }
      if(sc==='mmVote'){ this.mmTickTimer('vote'); this.mmPatchVoteUI(); }
    },
    mmStartLocalTimer(kind){
      clearInterval(this.tick);
      this.tick = setInterval(()=>{
        const screen = kind==='write' ? 'mmWrite' : 'mmVote';
        if(this.local.screen!==screen || !this.state){ clearInterval(this.tick); return; }
        const left = this.mmTickTimer(kind);
        if(kind==='write' && left<=0 && this.mmAmParticipant() && !this.mmHasSent()){
          this.mmSubmit(true); // time's up: send whatever is typed
        }
        if(left<=0) clearInterval(this.tick);
      }, 500);
    },
    mmTickTimer(kind){
      const g = this.state.g, cfg = this.state.gameConfig;
      const endAt = kind==='write' ? g.writeEndAt : g.voteEndAt;
      const total = kind==='write' ? cfg.writeTime : cfg.voteTime;
      const left = Math.max(0, Math.min(total, Math.ceil((endAt - this.mmNow())/1000)));
      const textEl = this.root.querySelector('[data-el="mmTimerText"]');
      const barEl = this.root.querySelector('[data-el="mmTimerBar"]');
      const boxEl = this.root.querySelector('[data-el="mmTimerBox"]');
      if(textEl) textEl.textContent = mmss(left);
      if(barEl){ barEl.style.width = (left/total*100)+'%'; barEl.style.background = left<=10 ? CORAL : INK; }
      if(boxEl){ boxEl.style.background = left<=10 ? CORAL : '#fff'; boxEl.style.animation = left<=10 && left>0 ? 'tick 1s ease-in-out infinite' : 'none'; }
      return left;
    },
    mmPatchStatus(){
      const el = this.root.querySelector('[data-el="mmStatus"]');
      if(el) el.innerHTML = this.mmStatusHtml();
      const w = this.root.querySelector('[data-el="mmWaiting"]');
      if(w) w.textContent = this.mmWaitingText();
    },
    mmWaitingText(){
      const g = this.state.g, r = g.round;
      const missing = this.mmParticipants(r).filter(id=>!g.submitted[r][id]).length;
      return missing ? `Esperando ${missing===1?'a 1 jugador':'a '+missing+' jugadores'}…` : '¡Están todos! Arranca la votación…';
    },
    mmStatusHtml(){
      const g = this.state.g, r = g.round;
      return this.mmParticipants(r).map(id=>{
        const p = this.playerById(id), done = !!g.submitted[r][id];
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:999px;background:${done?MINT:'#fff'};border:2px solid ${done?INK:'var(--line)'};transition:background .25s;${done?'animation:popSoft .3s both':''}">
          <div style="width:28px;height:28px;flex:0 0 auto">${avatarSVG(p.avatar,28)}</div>
          <span style="font-weight:800;font-size:14px;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span>
          ${done?`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`:`<span style="color:var(--muted);font-weight:800;letter-spacing:.1em">···</span>`}
        </div>`;
      }).join('');
    },
    mmPatchVoteUI(){
      if(!this.state || this.local.screen!=='mmVote') return;
      const g = this.state.g, r = g.round, L = this.mmL();
      const voted = this.mmHasVoted();
      const myVote = L.votedRound===r ? L.votedMid : null;
      const canVote = this.mmAmParticipant() && !voted;
      this.root.querySelectorAll('[data-mid]').forEach(btn=>{
        const mid = btn.dataset.mid;
        const own = L.ownRound===r && L.ownMid===mid;
        const picked = voted ? myVote===mid : L.pick===mid;
        btn.classList.toggle('is-picked', !!picked);
        btn.classList.toggle('is-dim', (voted && !picked) || own);
        btn.disabled = !canVote || own;
        const badge = btn.querySelector('[data-el="mmBadge"]');
        if(badge){
          badge.style.display = own||picked ? 'block' : 'none';
          badge.textContent = own ? 'TU MEME' : (voted ? 'TU VOTO ✓' : 'ELEGIDO');
          badge.style.background = own ? YEL : MINT;
        }
      });
      const total = this.mmEligibleCount(), done = Object.keys(g.voted[r]||{}).length;
      const cnt = this.root.querySelector('[data-el="mmVoteCount"]');
      if(cnt) cnt.textContent = `${done} / ${total} votaron`;
      const bar = this.root.querySelector('[data-el="mmVoteBar"]');
      if(bar){
        if(!this.mmAmParticipant()) bar.innerHTML = `<div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">Los jugadores están votando desde sus celulares.</div>`;
        else if(voted) bar.innerHTML = `<div style="height:56px;border-radius:16px;border:2px solid ${INK};background:${MINT};display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800;font-size:16px;animation:popSoft .3s both">¡Voto registrado! Esperando al resto…</div>`;
        else bar.innerHTML = `<button class="btn-primary" data-action="mmConfirmVote" ${L.pick?'':'disabled'}>${L.pick?'VOTAR ESTE MEME':'TOCÁ EL MEME MÁS GRACIOSO'}</button>`;
      }
    },
    // Eligible voters as seen by any client: participants who have at least
    // one meme that isn't theirs. Clients don't know authorship, so this
    // counts everyone except a sole author when there's only one meme.
    mmEligibleCount(){
      const g = this.state.g, r = g.round, n = (g.entries[r]||[]).length;
      const parts = this.mmParticipants(r).length;
      return n===1 ? Math.max(0, parts-1) : parts;
    },

    /* ---------- actions (wired into Game.actions) ---------- */
    mmActions(){
      return {
        mmSetRounds: (t)=>{ this.mmDraft.rounds = Number(t.dataset.val); this.renderScreen(); },
        mmSetWriteTime: (t)=>{ this.mmDraft.writeTime = Number(t.dataset.val); this.renderScreen(); },
        mmSetVoteTime: (t)=>{ this.mmDraft.voteTime = Number(t.dataset.val); this.renderScreen(); },
        mmToggleCategory: (t)=>{
          const id = t.dataset.cat, c = this.mmDraft.categories, i = c.indexOf(id);
          if(i>=0){ if(c.length<=1){ this.toast('Dejá al menos una categoría', CORAL); return; } c.splice(i,1); } else c.push(id);
          this.renderScreen();
        },
        mmToggleHostScreen: ()=>{ this.mmDraft.hostScreen = !this.mmDraft.hostScreen; this.renderScreen(); },
        mmConfirmConfig: ()=>this.mmConfirmConfig(),
        mmSubmitNow: ()=>this.mmSubmit(false),
        mmPick: (t)=>this.mmPick(t.dataset.mid),
        mmConfirmVote: ()=>this.mmConfirmVote(),
        mmRevealAll: ()=>{ const L=this.mmL(), res=this.state.g.results[this.state.g.round]; const n = res?res.entries.length:0; if(L.revealStep<n){ L.revealStep = n; this.renderScreen(); this.mmCelebrate(); } },
      };
    },

    /* ===================== SCREENS ===================== */
    viewMmConfig(){
      const d = this.mmDraft;
      const counts = memeCategoryCounts();
      const rounds = [3,5,7,10].map(n=>optBtn('mmSetRounds', n, n, d.rounds===n)).join('');
      const writes = [45,60,90].map(n=>optBtn('mmSetWriteTime', n, n+'s', d.writeTime===n)).join('');
      const votes = [20,30,45].map(n=>optBtn('mmSetVoteTime', n, n+'s', d.voteTime===n)).join('');
      const cats = Object.entries(MEME_CATEGORIES).map(([id,c])=>{
        const on = d.categories.includes(id);
        return `<button data-action="mmToggleCategory" data-cat="${id}" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;border:2px solid ${INK};background:${on?MINT:'#fff'}">
          <span style="font-size:18px">${c.emoji}</span><span style="font-weight:800;font-size:14px">${esc(c.name)}</span><span style="font-size:12px;font-weight:700;color:var(--muted)">${counts[id]||0}</span>
        </button>`;
      }).join('');
      const pts = (d.points||MM_POINTS);
      const pl = this.players().length, need = d.hostScreen ? 3 : 2;
      const estimate = '≈ '+Math.max(1,Math.round(d.rounds*(d.writeTime+d.voteTime+25)/60))+' min de juego';
      return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
        <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Make It Meme</div></div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:16px 0">
          <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:6px 18px;display:flex;flex-direction:column">
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
              <div style="font-weight:800;font-size:17px">Rondas</div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${rounds}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
              <div style="font-weight:800;font-size:17px">Tiempo para crear el meme</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${writes}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
              <div style="font-weight:800;font-size:17px">Tiempo para votar</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${votes}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
              <div style="font-weight:800;font-size:17px">Categorías de plantillas</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px">${cats}</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0">
              <div style="display:flex;flex-direction:column;gap:2px"><div style="font-weight:800;font-size:17px">Usar este dispositivo como pantalla</div><div style="font-size:14px;color:var(--muted)">Para una PC o TV: muestra la partida en grande y vos no jugás.</div></div>
              <button data-action="mmToggleHostScreen" aria-label="Pantalla principal" style="width:56px;height:32px;border-radius:999px;border:2px solid ${INK};background:${d.hostScreen?MINT:'#F1E7D8'};position:relative;flex:0 0 auto"><span style="position:absolute;top:2px;left:${d.hostScreen?'26px':'2px'};width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${INK};transition:left .15s"></span></button>
            </div>
          </div>
          <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap">
            ${pts.map((p,i)=>`<div style="padding:8px 14px;border-radius:999px;background:${[YEL,'#E4DEF5','#F6BE9E'][i]||'#fff'};border:2px solid ${INK};font-size:14px;font-weight:800">${i+1}º puesto · ${p} pts</div>`).join('')}
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">${estimate}${d.hostScreen && pl<need?' · con pantalla principal se necesitan 2 jugadores además de vos':''}</div>
            <button class="btn-primary" data-action="mmConfirmConfig">SIGUIENTE</button>
          </div>
        </div>
      </div>`;
    },

    viewMmWrite(){
      const s = this.state, g = s.g, r = g.round, cfg = s.gameConfig, L = this.mmL();
      const tplId = g.templateId[r];
      if(L.intro){
        return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:20px;overflow:hidden">
          <div style="font-size:15px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">RONDA ${r+1} DE ${cfg.rounds}</div>
          <div class="heading" style="font-size:clamp(30px,8vw,46px);animation:pop .5s cubic-bezier(.3,1.6,.5,1) both">¡A MEMEAR!</div>
          <div data-el="mmIntroMeme" style="width:min(78vw,360px);animation:mmSlideIn .7s cubic-bezier(.3,1.4,.5,1) .15s both;filter:blur(12px);transition:filter .5s">${memeHtml(tplId,'','',{maxVh:40})}</div>
          <div data-el="mmCount" style="height:96px;display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--muted)">Preparando la plantilla…</div>
        </div>`;
      }
      const isPlayer = this.mmAmParticipant();
      const sent = isPlayer && this.mmHasSent();
      const statusCard = `<div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px"><div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Memes enviados</div><div data-el="mmWaiting" style="font-size:13px;font-weight:700;color:var(--muted);text-align:right">${esc(this.mmWaitingText())}</div></div>
          <div data-el="mmStatus" style="display:flex;flex-wrap:wrap;gap:8px">${this.mmStatusHtml()}</div>
        </div>`;
      let side;
      if(!isPlayer){
        side = `<div style="display:flex;flex-direction:column;gap:14px">
          <div class="card" style="padding:18px;text-align:center;display:flex;flex-direction:column;gap:6px">
            <div class="heading" style="font-size:24px">Están creando sus memes</div>
            <div style="font-size:15px;font-weight:600;color:var(--muted)">Cada uno escribe desde su celular. Cuando todos envíen (o se termine el tiempo) arranca la votación.</div>
          </div>${statusCard}</div>`;
      } else if(sent){
        side = `<div style="display:flex;flex-direction:column;gap:14px">
          <div style="background:${MINT};border:2.5px solid ${INK};border-radius:24px;box-shadow:0 5px 0 ${INK};padding:18px;display:flex;align-items:center;gap:14px;animation:pop .45s cubic-bezier(.3,1.6,.5,1) both">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M7 12.5l3.5 3.5L17 9"></path></svg>
            <div><div class="heading" style="font-size:22px">¡MEME ENVIADO!</div><div style="font-size:14px;font-weight:700">Ya no se puede editar. Ahora a esperar…</div></div>
          </div>${statusCard}</div>`;
      } else {
        const can = !!(mmCleanCaption(L.top) || mmCleanCaption(L.bottom));
        side = `<div style="display:flex;flex-direction:column;gap:14px">
          <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
            <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Escribí tu meme</div>
            <label style="position:relative;display:block">
              <input class="mm-input" data-role="mm-top" value="${esc(L.top)}" placeholder="Texto de arriba" maxlength="${MM_CAPTION_MAX}" autocomplete="off" enterkeyhint="next">
              <span data-el="mm-top-count" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:800;color:var(--muted)">${MM_CAPTION_MAX-L.top.length}</span>
            </label>
            <label style="position:relative;display:block">
              <input class="mm-input" data-role="mm-bottom" value="${esc(L.bottom)}" placeholder="Texto de abajo" maxlength="${MM_CAPTION_MAX}" autocomplete="off" enterkeyhint="send">
              <span data-el="mm-bottom-count" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:800;color:var(--muted)">${MM_CAPTION_MAX-L.bottom.length}</span>
            </label>
            <div style="font-size:13px;font-weight:600;color:var(--muted)">Podés usar uno solo de los dos. Se envía solo cuando termina el tiempo.</div>
            <button class="btn-primary" data-el="mmSendBtn" data-action="mmSubmitNow" ${can?'':'disabled'}>ENVIAR MEME</button>
          </div>${statusCard}</div>`;
      }
      const preview = isPlayer && !sent
        ? memeHtml(tplId, L.top, L.bottom, { live:true, maxVh:46 })
        : memeHtml(tplId, sent?L.top:'', sent?L.bottom:'', { maxVh: isPlayer?46:70 });
      return `<div style="min-height:100vh;display:flex;flex-direction:column">
        ${header(s, cfg.writeTime)}
        <div style="flex:1;width:100%;max-width:1080px;margin:0 auto;padding:18px 20px 28px">
          <div class="mm-stage">
            <div style="display:flex;flex-direction:column;gap:10px;animation:popSoft .35s both">
              ${preview}
              ${isPlayer && !sent ? `<div style="text-align:center;font-size:13px;font-weight:700;color:var(--muted)">Vista previa en vivo · todos tienen la misma imagen</div>` : ''}
            </div>
            ${side}
          </div>
        </div>
      </div>`;
    },

    viewMmVote(){
      const s = this.state, g = s.g, r = g.round, cfg = s.gameConfig;
      const tplId = g.templateId[r];
      const entries = g.entries[r] || [];
      const isPlayer = this.mmAmParticipant();
      const cards = entries.map((e,i)=>`
        <button class="mm-vote-card" data-action="mmPick" data-mid="${e.mid}" style="animation:mmSlideIn .5s cubic-bezier(.3,1.4,.5,1) both;animation-delay:${(i*0.08).toFixed(2)}s" ${isPlayer?'':'disabled'}>
          <div data-el="mmBadge" class="mm-badge" style="display:none"></div>
          ${memeHtml(tplId, e.top, e.bottom)}
        </button>`).join('');
      return `<div style="min-height:100vh;display:flex;flex-direction:column">
        ${header(s, cfg.voteTime)}
        <div style="flex:1;width:100%;max-width:1080px;margin:0 auto;padding:18px 20px 0;display:flex;flex-direction:column;gap:16px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center">
            <div class="heading" style="font-size:clamp(26px,6.5vw,38px);letter-spacing:-.02em;animation:pop .5s cubic-bezier(.3,1.6,.5,1) both">VOTÁ EL MÁS GRACIOSO</div>
            <div style="font-size:14px;font-weight:700;color:var(--muted)">Son anónimos · un solo voto · no podés votar el tuyo</div>
            <div data-el="mmVoteCount" style="margin-top:6px;padding:6px 14px;border-radius:999px;background:#fff;border:2px solid var(--line);font-size:14px;font-weight:800">0 / 0 votaron</div>
          </div>
          <div class="mm-grid${isPlayer?'':' mm-grid-big'}">${cards}</div>
          <div class="sticky-bottom" style="margin-top:8px"><div data-el="mmVoteBar" style="width:100%;max-width:520px;margin:0 auto"></div></div>
        </div>
      </div>`;
    },

    viewMmResults(){
      const s = this.state, g = s.g, r = g.round, cfg = s.gameConfig, L = this.mmL();
      const res = g.results[r] || { entries:[], votes:{} };
      const tplId = g.templateId[r];
      const rows = res.entries; // sorted by votes desc
      const n = rows.length;
      const step = L.revealRound===r ? L.revealStep : n;
      const done = step >= n;
      const isLast = r+1 >= cfg.rounds;
      // reveal goes from last place up to the winner
      const shownFrom = n - step;
      const winners = rows.filter(e=>e.place===1);
      const mine = rows.find(e=>e.pid===this.myId);
      const isPlayer = (g.participants[r]||[]).includes(this.myId);
      const placeTxt = e=> e.place ? `${e.place}º puesto` : 'Sin votos';
      const cardHtml = (e, i)=>{
        const p = this.playerById(e.pid) || { name:'Jugador desconectado', avatar:null };
        const revealed = i >= shownFrom;
        const isWin = e.place===1 && revealed;
        const justNow = i === shownFrom; // only the card revealed last animates
        return `<div class="${isWin?'mm-winner':''}" style="position:relative;display:flex;flex-direction:column;gap:10px">
          ${isWin?`<div class="mm-badge" style="background:${YEL};left:50%;transform:translateX(-50%);top:-14px;font-size:13px;animation:pop .5s cubic-bezier(.3,1.6,.5,1) both">👑 GANADOR${winners.length>1?' (EMPATE)':''}</div>`:''}
          ${memeHtml(tplId, e.top, e.bottom)}
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:18px;border:2px solid ${INK};background:${revealed?(e.pid===this.myId?'#FFEDE6':'#fff'):'var(--panel-line)'};min-height:58px;${revealed&&justNow?'animation:mmFlip .55s cubic-bezier(.3,1.4,.5,1) both':''}">
            ${revealed ? `
              <div style="width:34px;height:34px;flex:0 0 auto">${avatarSVG(p.avatar,34)}</div>
              <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}${e.pid===this.myId?' (vos)':''}</div><div style="font-size:12px;font-weight:700;color:var(--muted)">${e.votes} ${e.votes===1?'voto':'votos'} · ${placeTxt(e)}</div></div>
              <div style="padding:4px 10px;border-radius:999px;background:${e.points>0?MINT:'#fff'};border:2px solid ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px">+${e.points}</div>`
            : `<div style="flex:1;text-align:center;font-weight:800;font-size:14px;color:var(--muted);letter-spacing:.08em">¿DE QUIÉN SERÁ?</div>`}
          </div>
        </div>`;
      };
      let personal = '';
      if(done && isPlayer){
        personal = mine
          ? `<div style="display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:12px 16px;border-radius:18px;background:${mine.place===1?YEL:'#fff'};border:2px solid ${INK};box-shadow:0 3px 0 ${INK};font-weight:800;font-size:15px;animation:rise .4s both">${mine.place===1?'¡Ganaste la ronda!':'Tu meme'} · ${mine.votes} ${mine.votes===1?'voto':'votos'} · ${placeTxt(mine)} · +${mine.points} pts</div>`
          : `<div style="text-align:center;padding:12px 16px;border-radius:18px;background:#fff;border:2px solid var(--line);font-weight:800;font-size:14px;color:var(--muted)">Esta ronda no enviaste meme</div>`;
      }
      const confettiHtml = done && winners.length ? `<div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${this.confetti.slice(0,28).map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} 2 both"></div>`).join('')}</div>` : '';
      let title, sub;
      if(!n){ title = 'NADIE MANDÓ MEME'; sub = 'Esta ronda no suma puntos. ¡Más rápido la próxima!'; }
      else if(!done){ title = 'RESULTADOS'; sub = 'Revelando autores…'; }
      else if(!winners.length){ title = 'NADIE VOTÓ'; sub = 'Ningún meme recibió votos esta ronda.'; }
      else { const wn = winners.map(e=>this.playerById(e.pid)?.name||'?'); title = winners.length>1 ? '¡EMPATE!' : esc(wn[0]).toUpperCase()+' GANA LA RONDA'; sub = winners.length>1 ? esc(wn.join(' y '))+' comparten el primer puesto' : `${winners[0].votes} ${winners[0].votes===1?'voto':'votos'}`; }
      const bottom = this.isHost
        ? (done ? `<button class="btn-primary" data-action="goRanking">VER CLASIFICACIÓN</button>` : `<button class="btn-secondary" data-action="mmRevealAll">MOSTRAR TODO</button>`)
        : (done ? waitHost(s, this) : '');
      return `<div style="position:relative;min-height:100vh">
        ${confettiHtml}
        <div class="screen screen-wide" style="position:relative;z-index:2">
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
            <div style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">RONDA ${r+1}${isLast?' (última)':''}</div>
            <div class="heading" style="font-size:clamp(28px,7vw,44px);letter-spacing:-.02em;line-height:1.05;${done?'animation:pop .6s cubic-bezier(.3,1.6,.5,1) both':''}">${title}</div>
            <div style="font-size:15px;font-weight:700;color:var(--muted)">${sub}</div>
          </div>
          ${personal}
          ${n?`<div class="mm-grid mm-results">${rows.map(cardHtml).join('')}</div>`:''}
          <div class="sticky-bottom">${bottom}</div>
        </div>
      </div>`;
    },

    viewMmRanking(){
      const s = this.state, cfg = s.gameConfig, pl = this.mmRankedPlayers(), ids = pl.map(p=>p.id);
      const cur = this.mmTotals(s.g.round), prevT = s.g.round>0 ? this.mmTotals(s.g.round-1) : null;
      const nr = this.rankOf(cur).filter(id=>ids.includes(id)), orr = prevT ? this.rankOf(prevT).filter(id=>ids.includes(id)) : nr;
      const ph = this.local.rankPhase===1;
      const rows = pl.map(p=>{
        const ni = nr.indexOf(p.id), oi = orr.indexOf(p.id), idx = ph?ni:oi, d = oi-ni;
        const label = p.id===this.myId ? p.name+' (vos)' : p.name;
        const total = ph ? cur[p.id] : (prevT ? prevT[p.id] : 0);
        const bg = p.id===this.myId ? '#FFEDE6' : (idx===0 && ph ? '#FFF3CC' : '#fff');
        const deltaText = d>0?'▲ Subió '+d : d<0?'▼ Bajó '+(-d) : 'Sin cambios';
        const deltaColor = d>0?'#0E8A66':d<0?'#B3341A':INK;
        const entrance = !ph ? `animation:rise .4s cubic-bezier(.3,1.5,.5,1) both;animation-delay:${(idx*0.06).toFixed(2)}s` : '';
        return `<div style="position:absolute;left:0;right:0;top:${idx*104}px;min-height:88px;display:flex;align-items:center;gap:12px;padding:10px 16px 10px 10px;border-radius:22px;background:${bg};border:2px solid ${INK};box-shadow:0 4px 0 ${INK};transition:top .9s cubic-bezier(.34,1.45,.64,1);${entrance}">
          <div style="flex:0 0 auto;width:44px;text-align:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:32px">${idx+1}</div>
          <div style="width:46px;height:46px;flex:0 0 auto">${avatarSVG(p.avatar,46)}</div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
            <div style="font-weight:800;font-size:18px">${esc(label)}</div>
            ${ph?`<div style="font-size:13px;font-weight:800;color:${deltaColor};animation:rise .3s both">${deltaText}</div>`:''}
          </div>
          ${ph?`<div style="padding:4px 10px;border-radius:999px;background:${MINT};border:2px solid ${INK};font-weight:800;font-size:14px;animation:pop .4s both">+${cur[p.id]-(prevT?prevT[p.id]:0)}</div>`:''}
          <div style="flex:0 0 auto;min-width:72px;text-align:right;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:24px">${total} pts</div>
        </div>`;
      }).join('');
      const dots = Array.from({length:cfg.rounds},(_,i)=>`<div style="width:${i===s.g.round?'36px':'14px'};height:10px;border-radius:999px;background:${i<=s.g.round?INK:'#fff'};border:2px solid ${INK};transition:width .3s"></div>`).join('');
      const isLast = s.g.round+1 >= cfg.rounds;
      const bottom = this.isHost
        ? `<button class="btn-primary" data-action="nextRound">${isLast?(s.match?'TERMINAR JUEGO':'VER RESULTADO FINAL'):'SIGUIENTE RONDA'}</button>`
        : waitHost(s, this);
      return `<div class="screen">
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
          <div class="heading" style="font-size:clamp(36px,10vw,52px);letter-spacing:-.02em;line-height:1">CLASIFICACIÓN</div>
          <div style="font-size:16px;font-weight:700;color:var(--muted)">Después de la ronda ${s.g.round+1} de ${cfg.rounds}</div>
        </div>
        <div style="display:flex;gap:6px;justify-content:center">${dots}</div>
        <div style="position:relative;height:${pl.length*104}px">${rows}</div>
        <div class="sticky-bottom">${bottom}</div>
      </div>`;
    },

    viewMmFinal(){
      const s = this.state, g = s.g, cfg = s.gameConfig, pl = this.mmRankedPlayers(), byId = {}; pl.forEach(p=>byId[p.id]=p);
      const tot = this.mmTotals(cfg.rounds-1);
      const nr = this.rankOf(tot).filter(id=>byId[id]);
      const w = byId[nr[0]];
      const winnerTitle = !w ? 'PARTIDA TERMINADA' : (w.id===this.myId ? '¡GANASTE, '+w.name.toUpperCase()+'!' : w.name.toUpperCase()+' GANÓ');
      const pod = [1,0,2].filter(i=>nr[i]);
      const H=['170px','124px','92px'], PBG=[YEL,'#E4DEF5','#F6BE9E'];
      const podium = pod.map(i=>{
        const p = byId[nr[i]];
        return `<div style="flex:0 1 130px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;animation:rise .6s both;animation-delay:${(0.2+(2-i)*0.15).toFixed(2)}s">
          <div style="width:${i===0?72:56}px;height:${i===0?72:56}px;flex:0 0 auto">${avatarSVG(p.avatar, i===0?72:56)}</div>
          <div style="font-weight:800;font-size:16px;text-align:center">${esc(p.name)}</div>
          <div style="width:100%;height:${H[i]};border-radius:18px 18px 0 0;background:${PBG[i]};border:2.5px solid ${INK};border-bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:10px;gap:2px">
            <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:40px;line-height:1">${i+1}</div>
            <div style="font-weight:800;font-size:14px">${tot[p.id]} pts</div>
          </div>
        </div>`;
      }).join('');
      const finalRows = nr.map((id,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:${i<nr.length-1?'2px solid var(--panel-line)':'0'}">
          <div style="width:28px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${i+1}</div>
          <div style="width:38px;height:38px;flex:0 0 auto">${avatarSVG(byId[id].avatar,38)}</div>
          <div style="flex:1;min-width:0;font-weight:800;font-size:17px">${esc(byId[id].name)}${id===this.myId?' (vos)':''}</div>
          <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${tot[id]} pts</div>
        </div>`).join('');
      const name = id => byId[id]?.name || '?';
      const plural = (n,a,b)=> n+' '+(n===1?a:b);
      const statDefs = {
        best:          x=>({ label:'Meme más votado', value:name(x.pid), sub:plural(x.n,'voto','votos')+' · ronda '+(x.extra.round+1), bg:INK, dark:true, meme:x.extra }),
        wins:          x=>({ label:'Más rondas ganadas', value:name(x.pid), sub:plural(x.n,'ronda','rondas'), bg:YEL }),
        unanimous:     x=>({ label:'Victoria unánime', value:name(x.pid), sub:'Se llevó los '+x.n+' votos en la ronda '+(x.round+1), bg:PINK }),
        eye:           x=>({ label:'Buen ojo', value:name(x.pid), sub:'Votó al ganador '+plural(x.n,'vez','veces'), bg:MINT }),
        fast:          x=>({ label:'El más rápido', value:name(x.pid), sub:'Enviaba en ≈ '+x.n+' s', bg:BLUE }),
        misunderstood: x=>({ label:'Incomprendido/a', value:name(x.pid), sub:plural(x.n,'meme','memes')+' sin votos', bg:VIOLET }),
      };
      const stats = mmFinalStats(g, pl.map(p=>p.id)).map(x=>statDefs[x.key](x));
      const statsHtml = stats.map((x,i)=>`<div style="background:${x.bg};color:${x.dark?'var(--cream)':INK};border:2px solid ${INK};border-radius:22px;box-shadow:0 4px 0 ${INK};padding:16px;display:flex;flex-direction:column;gap:8px;animation:rise .5s both;animation-delay:${(0.5+i*0.1).toFixed(2)}s">
        <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:${x.dark?0.8:1}">${esc(x.label)}</div>
        ${x.meme?`<div style="max-width:220px">${memeHtml(x.meme.templateId, x.meme.top, x.meme.bottom)}</div>`:''}
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:24px;line-height:1.05;overflow-wrap:anywhere">${esc(x.value)}</div>
        <div style="font-size:14px;font-weight:700">${esc(x.sub)}</div>
      </div>`).join('');
      // hall of fame: every round's winning meme
      const hall = (g.results||[]).map((res,r)=>{
        if(!res) return '';
        const win = res.entries.find(e=>e.place===1); if(!win) return '';
        return `<div style="display:flex;flex-direction:column;gap:6px;animation:rise .5s both;animation-delay:${(0.8+r*0.08).toFixed(2)}s">
          ${memeHtml(g.templateId[r], win.top, win.bottom)}
          <div style="font-size:13px;font-weight:800;text-align:center">Ronda ${r+1} · ${esc(name(win.pid))}</div>
        </div>`;
      }).join('');
      const confettiHtml = this.confetti.map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} infinite"></div>`).join('');
      const bottom = this.isHost
        ? `<button class="btn-primary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
        : `<div style="flex:1">${waitHost(s, this, 'elige qué sigue')}</div>`;
      return `<div style="position:relative;min-height:100vh;overflow:hidden">
        <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confettiHtml}</div>
        <div style="position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
            <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
            <div class="heading" style="font-size:clamp(40px,12vw,84px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${esc(winnerTitle)}</div>
            ${w?`<div class="heading" style="font-size:24px">${tot[w.id]} puntos</div>`:''}
          </div>
          <div class="final-layout">
            <div class="final-ranking">
              <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px">${podium}</div>
              <div style="width:100%;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:8px 18px">${finalRows}</div>
            </div>
            <div class="final-stats">${statsHtml}</div>
          </div>
          ${hall?`<div style="display:flex;flex-direction:column;gap:12px">
            <div class="heading" style="font-size:22px;text-align:center">Los memes ganadores</div>
            <div class="mm-grid mm-hall">${hall}</div>
          </div>`:''}
          <div class="sticky-bottom">
            <div style="max-width:560px;margin:0 auto;padding:0 14px;width:100%;display:flex;flex-direction:row;align-items:center;gap:12px">${bottom}</div>
          </div>
        </div>
      </div>`;
    },
  });
}
