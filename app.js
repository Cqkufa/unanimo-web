import { supabase } from './supabaseClient.js';
import { pickWords } from './words.js';
import { DIBUJALO_BANK, pickDibujaloTrio, dibujaloFunnyLine, TUTTI_CATEGORIES, pickLetter } from './wordbank.js';

/* ---------- utils ---------- */
const INK='#1D1B2F', CORAL='#FF6B4A', MINT='#2ED3A6', YEL='#FFC83D', VIOLET='#9B85FF', BLUE='#5CB8FF', PINK='#FF8CC2';
const PALETTE=[CORAL,VIOLET,MINT,YEL,BLUE,PINK];
const RANKBG=[YEL,'#E4DEF5','#F6BE9E'];
const CONF_COLORS=[CORAL,YEL,MINT,VIOLET,BLUE,PINK];
/* ---------- avatar builder: face color + features + optional accessory, all cycled with arrows ---------- */
// 10 options per category: a handful of skin tones plus properly "no
// human has this skin" colors (green, blue, violet, pink, yellow) —
// this is a face colour, not just a skin tone, so it's deliberately silly.
const FACE_COLORS = ['#FFE0BD','#FFCD94','#C68642','#8D5524','#4A2C17','#7ED957','#5CB8FF','#9B85FF','#FF8CC2','#FFC83D'];
const FACE_COLOR_NAMES = ['Clara','Media','Canela','Morena','Oscura','Verde','Azul','Violeta','Rosa','Amarilla'];
const EYE_STYLES = ['normal','happy','wide','sleepy','wink','cross','hearts','stars','dizzy','cyclops'];
const EYE_NAMES = ['Normales','Felices','Sorprendidos','Dormidos','Guiño','Bizcos','Enamorados','Estrellas','Mareados','Cíclope'];
const MOUTH_STYLES = ['smile','grin','flat','smirk','surprised','tongue','teeth','kiss','fangs','zigzag'];
const MOUTH_NAMES = ['Sonrisa','Sonrisón','Seria','Pícara','Sorprendida','Lengua afuera','Dientes apretados','Beso','Colmillos','Nerviosa'];
const HAT_NAMES = ['Ninguno','Gorra','Corona','Lentes','Parche','Bigote','Cuernos','Pizza','Auriculares','Aureola'];
const AVATAR_TRAITS = [
  {key:'skin', label:'Color', count:FACE_COLORS.length, names:FACE_COLOR_NAMES},
  {key:'eyes', label:'Ojos', count:EYE_STYLES.length, names:EYE_NAMES},
  {key:'mouth', label:'Boca', count:MOUTH_STYLES.length, names:MOUTH_NAMES},
  {key:'hat', label:'Accesorio', count:HAT_NAMES.length, names:HAT_NAMES},
];
function randomAvatar(){
  return { skin:Math.floor(Math.random()*FACE_COLORS.length), eyes:Math.floor(Math.random()*EYE_STYLES.length), mouth:Math.floor(Math.random()*MOUTH_STYLES.length), hat:0 };
}
// Pixel-art style: bold rectangular blocks with hard edges instead of
// smooth curves, matching a chunky 8-bit avatar look. Everything is
// crisp SVG (no raster images), so it scales cleanly from 20px chat
// bubbles up to the 96px picker preview.
function eyesSVG(style){
  switch(style){
    case 'happy': return `<rect x="24" y="34" width="16" height="6" fill="${INK}"/><rect x="60" y="34" width="16" height="6" fill="${INK}"/>`;
    case 'wide': return `<rect x="22" y="28" width="20" height="20" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="28" y="34" width="8" height="8" fill="${INK}"/><rect x="58" y="28" width="20" height="20" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="64" y="34" width="8" height="8" fill="${INK}"/>`;
    case 'sleepy': return `<rect x="24" y="40" width="16" height="5" fill="${INK}"/><rect x="60" y="40" width="16" height="5" fill="${INK}"/>`;
    case 'wink': return `<rect x="26" y="30" width="14" height="14" fill="${INK}"/><rect x="60" y="38" width="16" height="6" fill="${INK}"/>`;
    case 'cross': return `<rect x="20" y="30" width="18" height="16" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="30" y="34" width="7" height="8" fill="${INK}"/><rect x="62" y="30" width="18" height="16" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="63" y="34" width="7" height="8" fill="${INK}"/>`;
    case 'hearts': return `<rect x="22" y="30" width="6" height="6" fill="${CORAL}"/><rect x="30" y="30" width="6" height="6" fill="${CORAL}"/><rect x="20" y="36" width="18" height="6" fill="${CORAL}"/><rect x="25" y="42" width="8" height="4" fill="${CORAL}"/><rect x="60" y="30" width="6" height="6" fill="${CORAL}"/><rect x="68" y="30" width="6" height="6" fill="${CORAL}"/><rect x="58" y="36" width="18" height="6" fill="${CORAL}"/><rect x="63" y="42" width="8" height="4" fill="${CORAL}"/>`;
    case 'stars': return `<rect x="27" y="26" width="6" height="20" fill="${YEL}" stroke="${INK}" stroke-width="2"/><rect x="19" y="34" width="22" height="6" fill="${YEL}" stroke="${INK}" stroke-width="2"/><rect x="65" y="26" width="6" height="20" fill="${YEL}" stroke="${INK}" stroke-width="2"/><rect x="57" y="34" width="22" height="6" fill="${YEL}" stroke="${INK}" stroke-width="2"/>`;
    case 'dizzy': return `<g transform="rotate(45 32 38)"><rect x="23" y="35" width="18" height="6" fill="${INK}"/><rect x="29" y="29" width="6" height="18" fill="${INK}"/></g><g transform="rotate(45 68 38)"><rect x="59" y="35" width="18" height="6" fill="${INK}"/><rect x="65" y="29" width="6" height="18" fill="${INK}"/></g>`;
    case 'cyclops': return `<rect x="38" y="26" width="24" height="24" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="46" y="34" width="8" height="8" fill="${INK}"/>`;
    default: return `<rect x="26" y="30" width="14" height="14" fill="${INK}"/><rect x="60" y="30" width="14" height="14" fill="${INK}"/>`;
  }
}
function mouthSVG(style){
  switch(style){
    case 'grin': return `<rect x="30" y="58" width="40" height="16" fill="${INK}"/><rect x="36" y="58" width="8" height="8" fill="#fff"/><rect x="56" y="58" width="8" height="8" fill="#fff"/>`;
    case 'flat': return `<rect x="32" y="64" width="36" height="6" fill="${INK}"/>`;
    case 'smirk': return `<rect x="32" y="60" width="10" height="6" fill="${INK}"/><rect x="42" y="64" width="10" height="6" fill="${INK}"/><rect x="52" y="68" width="16" height="6" fill="${INK}"/>`;
    case 'surprised': return `<rect x="42" y="60" width="16" height="16" fill="${INK}"/>`;
    case 'tongue': return `<rect x="28" y="60" width="10" height="6" fill="${INK}"/><rect x="38" y="68" width="24" height="6" fill="${INK}"/><rect x="62" y="60" width="10" height="6" fill="${INK}"/><rect x="44" y="70" width="12" height="12" fill="${PINK}" stroke="${INK}" stroke-width="2"/>`;
    case 'teeth': return `<rect x="30" y="60" width="40" height="14" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="38" y="60" width="6" height="14" fill="${INK}"/><rect x="50" y="60" width="6" height="14" fill="${INK}"/><rect x="62" y="60" width="6" height="14" fill="${INK}"/>`;
    case 'kiss': return `<rect x="44" y="62" width="12" height="12" fill="${PINK}" stroke="${INK}" stroke-width="3"/>`;
    case 'fangs': return `<rect x="32" y="64" width="36" height="6" fill="${INK}"/><rect x="36" y="70" width="6" height="9" fill="#fff" stroke="${INK}" stroke-width="2"/><rect x="58" y="70" width="6" height="9" fill="#fff" stroke="${INK}" stroke-width="2"/>`;
    case 'zigzag': return `<rect x="26" y="62" width="9" height="6" fill="${INK}"/><rect x="35" y="68" width="9" height="6" fill="${INK}"/><rect x="44" y="62" width="9" height="6" fill="${INK}"/><rect x="53" y="68" width="9" height="6" fill="${INK}"/><rect x="62" y="62" width="9" height="6" fill="${INK}"/>`;
    default: return `<rect x="28" y="60" width="10" height="6" fill="${INK}"/><rect x="38" y="68" width="24" height="6" fill="${INK}"/><rect x="62" y="60" width="10" height="6" fill="${INK}"/>`;
  }
}
function hatSVG(idx){
  switch(idx){
    case 1: return `<rect x="14" y="6" width="72" height="16" fill="${CORAL}" stroke="${INK}" stroke-width="4"/><rect x="52" y="4" width="34" height="16" fill="${CORAL}" stroke="${INK}" stroke-width="4"/>`;
    case 2: return `<rect x="18" y="20" width="64" height="10" fill="${YEL}" stroke="${INK}" stroke-width="3"/><rect x="20" y="12" width="10" height="10" fill="${YEL}" stroke="${INK}" stroke-width="3"/><rect x="45" y="4" width="10" height="18" fill="${YEL}" stroke="${INK}" stroke-width="3"/><rect x="70" y="12" width="10" height="10" fill="${YEL}" stroke="${INK}" stroke-width="3"/>`;
    case 3: return `<rect x="18" y="30" width="26" height="16" fill="${INK}"/><rect x="56" y="30" width="26" height="16" fill="${INK}"/><rect x="44" y="34" width="12" height="4" fill="${INK}"/>`;
    case 4: return `<rect x="6" y="28" width="88" height="6" fill="${INK}"/><rect x="58" y="26" width="22" height="22" fill="${INK}"/>`;
    case 5: return `<rect x="24" y="52" width="16" height="8" fill="${INK}"/><rect x="60" y="52" width="16" height="8" fill="${INK}"/><rect x="38" y="50" width="24" height="6" fill="${INK}"/>`;
    case 6: return `<rect x="12" y="2" width="12" height="12" fill="${CORAL}" stroke="${INK}" stroke-width="3"/><rect x="22" y="14" width="8" height="8" fill="${CORAL}" stroke="${INK}" stroke-width="3"/><rect x="76" y="2" width="12" height="12" fill="${CORAL}" stroke="${INK}" stroke-width="3"/><rect x="70" y="14" width="8" height="8" fill="${CORAL}" stroke="${INK}" stroke-width="3"/>`;
    case 7: return `<rect x="32" y="0" width="36" height="8" fill="${YEL}" stroke="${INK}" stroke-width="3"/><rect x="38" y="8" width="24" height="8" fill="${YEL}" stroke="${INK}" stroke-width="3"/><rect x="44" y="16" width="12" height="6" fill="${YEL}" stroke="${INK}" stroke-width="3"/><rect x="42" y="2" width="6" height="6" fill="${CORAL}"/><rect x="54" y="10" width="6" height="6" fill="${CORAL}"/>`;
    case 8: return `<rect x="14" y="30" width="10" height="24" fill="${INK}"/><rect x="76" y="30" width="10" height="24" fill="${INK}"/><rect x="18" y="10" width="64" height="10" fill="${INK}"/><rect x="16" y="36" width="6" height="12" fill="${BLUE}"/><rect x="78" y="36" width="6" height="12" fill="${BLUE}"/>`;
    case 9: return `<rect x="28" y="0" width="44" height="8" fill="none" stroke="${YEL}" stroke-width="4"/>`;
    default: return '';
  }
}
function avatarSVG(av, px){
  av = av || {};
  const skin = FACE_COLORS[av.skin||0] || FACE_COLORS[0];
  return `<svg viewBox="0 0 100 100" width="${px}" height="${px}" style="display:block;overflow:visible;flex:0 0 auto">
    <circle cx="50" cy="52" r="44" fill="${skin}" stroke="${INK}" stroke-width="4"/>
    ${eyesSVG(EYE_STYLES[av.eyes||0])}
    ${mouthSVG(MOUTH_STYLES[av.mouth||0])}
    ${hatSVG(av.hat||0)}
  </svg>`;
}

const DIACRITICS_RE = new RegExp(String.fromCharCode(0x5b,0x5c,0x75,0x30,0x33,0x30,0x30,0x2d,0x5c,0x75,0x30,0x33,0x36,0x66,0x5d),'g');
const norm = s => (s||'').trim().toLowerCase().normalize('NFD').replace(DIACRITICS_RE,'');
const disp = s => { s=(s||'').trim(); return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); };
const mmss = t => String(Math.floor(Math.max(0,t)/60)).padStart(2,'0')+':'+String(Math.max(0,t)%60).padStart(2,'0');
const listJoin = a => a.length<2 ? (a[0]||'') : a.slice(0,-1).join(', ')+' y '+a[a.length-1];
const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const randCode = () => { const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c=''; for(let i=0;i<5;i++)c+=A[Math.floor(Math.random()*A.length)]; return c; };
const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));

const LS_KEY = 'unanimo:session';

/* ---------- game registry: the portal picks from these, room stays the
   same across games (code, players, avatars persist) ---------- */
const GAMES = [
  {id:'unanimo', name:'Unánimo', tagline:'Pensá como los demás', letters:['U','N'], colors:[CORAL,VIOLET], min:2},
  {id:'dibujalo', name:'Dibujalo', tagline:'Dibujá y adiviná contrarreloj', letters:['D','I'], colors:[BLUE,YEL], min:3},
  {id:'tuttifrutti', name:'Tutti Frutti', tagline:'Una palabra por categoría, misma letra', letters:['T','F'], colors:[MINT,PINK], min:2},
];
function gameMeta(id){ return GAMES.find(g=>g.id===id); }

/* ---------- sound (synthesized, no audio files needed) ---------- */
let audioCtx = null;
function ensureAudio(){
  if(!audioCtx){ const AC = window.AudioContext||window.webkitAudioContext; if(!AC) return null; audioCtx = new AC(); }
  if(audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  return audioCtx;
}
function beep(freq, duration, type, gainPeak, when){
  const ctx = ensureAudio(); if(!ctx) return;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.type = type||'sine'; osc.frequency.value = freq;
  const t0 = ctx.currentTime + (when||0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak||0.08, t0+0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0+duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0); osc.stop(t0+duration+0.02);
}

class Game {
  constructor(root, toastRoot, modalRoot, hudRoot, chatRoot){
    this.root = root;
    this.toastRoot = toastRoot;
    this.modalRoot = modalRoot;
    this.hudRoot = hudRoot;
    this.chatRoot = chatRoot;
    this.myId = null;
    this.channel = null;
    this.timers = [];
    this.confetti = Array.from({length:40},(_,i)=>({left:((i*37)%100)+'%',delay:((i%13)*0.23).toFixed(2)+'s',dur:(2.8+(i%5)*0.5)+'s',color:CONF_COLORS[i%6],w:(8+(i%3)*4)+'px',h:(12+(i%4)*3)+'px'}));
    this.local = { screen:'home', modal:null, cfgName:'', joinCode:'', joining:false, joinError:'', showJoinName:false, joinNameDraft:'',
      inputs:[], submitted:false, reveal:0, appliedStage:-1, selPid:null, rankPhase:1, lastRound:-1,
      avatar: randomAvatar(),
      chatOpen:false, chatUnread:0, chatDraft:'',
      hostFlow: null, // host-only, LOCAL/unsynced: which game's config screen (if any) the host is looking at from the lobby
      dColor: INK, dSize: 6, dTool: 'brush', dGuessDraft: '', dOptions: null,
    };
    this.uDraft = { rounds:3, words:6, time:45 };
    this.dDraft = { rounds:6, chooseTime:10, drawTime:60, hints:true, categories:Object.keys(DIBUJALO_BANK) };
    this.tfDraft = { rounds:5, time:60, categories:['nombre','animal','pais','comida','objeto','pelicula'], hard:false };
    this.state = null; // host-authoritative shared state, once in a room
    this.toasts = [];
    this.chatMessages = [];
    this._knownPlayerIds = null;
    this.soundOn = (localStorage.getItem('unanimo:sound') !== 'off');
    this._bindDelegation();
    this.renderScreen();
  }

  /* ---------- lifecycle helpers ---------- */
  later(fn, ms){ const t=setTimeout(fn, ms); this.timers.push(t); return t; }
  clearTimers(){ this.timers.forEach(clearTimeout); this.timers=[]; clearInterval(this.tick); clearInterval(this.revealTick); clearInterval(this.hostWatch); }

  /* ---------- sound ---------- */
  playClick(){ if(!this.soundOn) return; beep(760, 0.05, 'sine', 0.05); }
  playJoin(){ if(!this.soundOn) return; beep(660, 0.09, 'triangle', 0.09); beep(920, 0.13, 'triangle', 0.09, 0.09); }
  playChat(){ if(!this.soundOn) return; beep(540, 0.06, 'sine', 0.05); }
  toggleSound(){
    this.soundOn = !this.soundOn;
    try{ localStorage.setItem('unanimo:sound', this.soundOn?'on':'off'); }catch(e){}
    if(this.soundOn){ ensureAudio(); if(this.local.screen==='lobby') this.startLobbyMusic(); }
    else this.stopLobbyMusic();
    this.renderHud();
  }

  /* ---------- lobby music: a gentle looping chord pad, synthesized —
     no audio files, muted by the same sound toggle as everything else. */
  startLobbyMusic(){
    if(!this.soundOn || this._musicPlaying) return;
    const ctx = ensureAudio(); if(!ctx) return;
    this._musicPlaying = true;
    if(!this._musicGain){ this._musicGain = ctx.createGain(); this._musicGain.gain.value = 0.055; this._musicGain.connect(ctx.destination); }
    const chords = [
      [261.63, 329.63, 392.00, 523.25], // Cmaj
      [220.00, 261.63, 329.63, 440.00], // Am
      [174.61, 220.00, 261.63, 349.23], // Fmaj
      [196.00, 246.94, 293.66, 392.00], // Gmaj
    ];
    let i = 0;
    const step = ()=>{
      if(!this._musicPlaying) return;
      const notes = chords[i % chords.length]; i++;
      const t0 = ctx.currentTime;
      notes.forEach((freq,k)=>{
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(k===0?1:0.5, t0+0.7);
        g.gain.linearRampToValueAtTime(0, t0+3.4);
        osc.connect(g).connect(this._musicGain);
        osc.start(t0); osc.stop(t0+3.5);
      });
      this._musicTimer = setTimeout(step, 3100);
    };
    step();
  }
  stopLobbyMusic(){
    this._musicPlaying = false;
    clearTimeout(this._musicTimer);
  }

  toast(msg, color){
    const id = Math.random();
    this.toasts = [...this.toasts.slice(-2), {id,msg,color:color||MINT}];
    this.renderToasts();
    setTimeout(()=>{ this.toasts = this.toasts.filter(t=>t.id!==id); this.renderToasts(); }, 2400);
  }
  renderToasts(){
    this.toastRoot.innerHTML = this.toasts.map(t=>`<div class="toast"><span class="toast-dot" style="background:${t.color}"></span>${esc(t.msg)}</div>`).join('');
  }

  /* ---------- players / scoring (mirrors design logic) ---------- */
  players(){ return (this.state && this.state.players) || []; }
  playerById(id){ return this.players().find(p=>p.id===id); }
  accentColor(p){ const av=(p&&p.avatar)||{}; return FACE_COLORS[av.skin||0] || FACE_COLORS[0]; }
  groups(r){
    const a = this.state?.g?.answers?.[r]; if(!a) return [];
    const m = {};
    this.players().forEach(p=>{
      (a[p.id]||[]).forEach(w=>{
        const k = norm(w); if(!k) return;
        if(!m[k]) m[k] = {key:k, label:disp(w), pids:[]};
        if(!m[k].pids.includes(p.id)) m[k].pids.push(p.id);
      });
    });
    return Object.values(m).sort((x,y)=> y.pids.length-x.pids.length || (y.pids.includes(this.myId)-x.pids.includes(this.myId)) || x.label.localeCompare(y.label));
  }
  points(r){
    const gs = this.groups(r); const byK = {}; gs.forEach(g=>byK[g.key]=g);
    const a = this.state?.g?.answers?.[r] || {}; const out = {};
    this.players().forEach(p=>{
      const seen = new Set(); const items = [];
      (a[p.id]||[]).forEach(w=>{
        const k = norm(w); if(!k||seen.has(k)) return; seen.add(k);
        const n = byK[k] ? byK[k].pids.length : 1;
        items.push({label:disp(w), pts:n-1});
      });
      out[p.id] = { items, total: items.reduce((t,i)=>t+i.pts,0) };
    });
    return out;
  }
  totals(uptoRound){
    const t = {}; this.players().forEach(p=>t[p.id]=0);
    for(let r=0;r<=uptoRound;r++){ if(!this.state.g.answers[r]) continue; const pts=this.points(r); for(const id in pts) t[id]=(t[id]||0)+pts[id].total; }
    return t;
  }
  rankOf(t){ return this.players().slice().sort((a,b)=> (t[b.id]||0)-(t[a.id]||0) || a.name.localeCompare(b.name)).map(p=>p.id); }

  /* ---------- networking ---------- */
  async connect(code){
    if(this.channel) { try{ await supabase.removeChannel(this.channel); }catch(e){} }
    this.channel = supabase.channel('room-'+code, { config: { broadcast: { self:false, ack:false } } });
    this.channel.on('broadcast', {event:'state'}, ({payload})=> this.onState(payload));
    this.channel.on('broadcast', {event:'action'}, ({payload})=> { if(this.isHost) this.onAction(payload); });
    this.channel.on('broadcast', {event:'chat'}, ({payload})=> this.onChatMessage(payload));
    // Dibujalo: targeted word-choice delivery (only the drawer's client
    // acts on it — everyone else's handler discards it unopened) plus
    // live drawing strokes, broadcast directly peer-to-peer like chat so
    // they never bloat the authoritative game state.
    this.channel.on('broadcast', {event:'dWords'}, ({payload})=>{ if(payload.to===this.myId) this.dReceiveWords(payload.options); });
    this.channel.on('broadcast', {event:'dAutoChosen'}, ({payload})=>{ if(payload.to===this.myId) this.local.dChosenWord = payload.word; });
    this.channel.on('broadcast', {event:'stroke'}, ({payload})=> this.dOnStroke(payload));
    this.channel.on('broadcast', {event:'dClear'}, ()=> this.dOnClear());
    await new Promise(resolve=>{
      this.channel.subscribe(status=>{ if(status==='SUBSCRIBED') resolve(); });
    });
  }
  send(event, payload){ if(this.channel) this.channel.send({type:'broadcast', event, payload}); }
  sendAction(type, payload){ this.send('action', {type, ...payload}); }
  broadcastState(){
    this.state.rev = (this.state.rev||0)+1;
    this.state.updatedAt = Date.now();
    this.send('state', this.state);
    this.onState(this.state, true);
  }

  saveSession(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify({code:this.state.code, id:this.myId, name:this.local.cfgName, isHost:this.isHost})); }catch(e){}
  }
  clearSession(){ try{ localStorage.removeItem(LS_KEY); }catch(e){} }

  /* ---------- host: create room (game-agnostic — pick a game once you're in the lobby) ---------- */
  async createGame(){
    const name = (this.local.cfgName||'').trim().slice(0,14) || 'Anfitrión';
    this.myId = uid();
    this.isHost = true;
    const code = randCode();
    await this.connect(code);
    this.state = {
      code, hostId:this.myId, maxPlayers:12,
      players:[{id:this.myId, name, avatar:{...this.local.avatar}, joinedAt:Date.now()}],
      gameId:null, gameConfig:null, g:null,
      phase:'lobby', stage:0, rev:0, updatedAt:Date.now()
    };
    this.local.appliedStage = 0;
    this.local.hostFlow = null;
    this.local.screen = 'lobby';
    this.saveSession();
    this.renderScreen();
    this.broadcastState();
  }

  /* ---------- host: confirm a game's config from the lobby picker and launch it into the lobby's "ready to start" state ---------- */
  confirmUnanimoConfig(){
    if(!this.isHost) return;
    this.state.gameId = 'unanimo';
    this.state.gameConfig = { ...this.uDraft };
    this.state.g = { round:-1, roundWord:'', roundEndAt:0, usedWords:[], answers:[], done:{} };
    this.state.stage = (this.state.stage||0) + 1;
    this.local.hostFlow = null;
    this.broadcastState();
  }

  /* ---------- guest: join room ---------- */
  async joinGame(){
    const code = (this.local.joinCode||'').toUpperCase();
    if(code.length < 5){ this.toast('El código tiene 5 caracteres', CORAL); return; }
    this.local.showJoinName = true;
    this.local.joinNameDraft = this.local.cfgName || '';
    this.renderModals();
  }
  async confirmJoinName(){
    const name = (this.local.joinNameDraft||'').trim().slice(0,14);
    if(!name){ this.toast('Ingresá tu nombre', CORAL); return; }
    const code = (this.local.joinCode||'').toUpperCase();
    this.local.cfgName = name;
    this.myId = uid();
    this.isHost = false;
    this.local.joining = true;
    this.local.showJoinName = false;
    this.renderScreen();
    try{
      await this.connect(code);
      this.sendAction('join', { id:this.myId, name, avatar:{...this.local.avatar} });
      this.later(()=>{
        if(this.local.joining){
          this.local.joining = false;
          this.local.joinError = 'No se pudo conectar con la sala. Revisá el código.';
          this.renderScreen();
        }
      }, 6000);
    }catch(e){
      this.local.joining = false;
      this.local.joinError = 'No se pudo conectar. Probá de nuevo.';
      this.renderScreen();
    }
  }

  /* ---------- host: handle actions from guests ---------- */
  onAction(msg){
    if(!this.state) return;
    if(msg.type === 'join'){
      if(this.playerById(msg.id)) { this.broadcastState(); return; }
      if(this.state.players.length >= (this.state.maxPlayers||12)){ return; }
      const avatar = msg.avatar || randomAvatar();
      this.state.players.push({id:msg.id, name:(msg.name||'Jugador').slice(0,14), avatar, joinedAt:Date.now()});
      // No toast here — every client (host included) announces new joins
      // uniformly from onState's roster diff, so everyone hears it, not
      // just the host.
      this.broadcastState();
    }
    else if(msg.type === 'hello'){
      this.broadcastState();
    }
    else if(msg.type === 'submit'){
      if(this.state.gameId!=='unanimo' || !this.state.g || msg.round !== this.state.g.round) return;
      // A player is only truly "done" once we hold a real (possibly empty-
      // by-choice) submission for them. The round watchdog force-fills
      // stragglers with [] so the game can move on; that placeholder must
      // NOT block a genuine submission that arrives a little late (slow
      // network, clock drift) from overwriting it — otherwise their real
      // words are silently lost from the reveal.
      const already = this.state.g.done[msg.id];
      const hadRealAnswer = already && (this.state.g.answers[this.state.g.round]?.[msg.id]?.length > 0);
      if(hadRealAnswer) return;
      const wasLate = already;
      if(!this.state.g.answers[this.state.g.round]) this.state.g.answers[this.state.g.round] = {};
      this.state.g.answers[this.state.g.round][msg.id] = msg.words;
      this.state.g.done[msg.id] = true;
      const p = this.playerById(msg.id);
      if(p && p.id !== this.myId) this.toast(p.name+' terminó', this.accentColor(p));
      this.broadcastState();
      if(!wasLate) this.checkAllDone();
    }
    else if(msg.type === 'draft'){
      // Lightweight, host-only checkpoint of a guest's in-progress words.
      // Never part of this.state (never broadcast) so it can't leak
      // still-being-typed answers to other players before reveal — it only
      // exists so the round watchdog has something better than "[]" to
      // fall back to if that player's final submit never arrives at all
      // (e.g. their tab got backgrounded and its timer stopped firing).
      if(this.state.gameId!=='unanimo' || !this.state.g || msg.round !== this.state.g.round) return;
      this.hostDrafts = this.hostDrafts || {};
      this.hostDrafts[msg.id] = msg.words;
    }
    else if(msg.type === 'leave'){
      this.state.players = this.state.players.filter(p=>p.id!==msg.id);
      if(this.state.g && this.state.g.done && !Array.isArray(this.state.g.done)) delete this.state.g.done[msg.id];
      this.broadcastState();
    }
    else if(msg.type === 'tfDraft'){
      if(this.state.gameId!=='tuttifrutti' || !this.state.g || msg.round !== this.state.g.round) return;
      this.tfDrafts = this.tfDrafts || {};
      this.tfDrafts[msg.id] = msg.answers;
    }
    else if(msg.type === 'tfStop'){
      if(this.state.gameId!=='tuttifrutti' || !this.state.g || msg.round !== this.state.g.round || this.state.phase!=='tfWrite') return;
      this.tfHostLock(msg.id, msg.answers, msg.round, msg.elapsed);
    }
    else if(msg.type === 'tfSubmit'){
      if(this.state.gameId!=='tuttifrutti' || !this.state.g || msg.round !== this.state.g.round) return;
      if(!this.state.g.answers[msg.round]) this.state.g.answers[msg.round] = {};
      if(!this.state.g.done[msg.round]) this.state.g.done[msg.round] = {};
      if(this.state.g.done[msg.round][msg.id]) return;
      this.state.g.answers[msg.round][msg.id] = msg.answers;
      this.state.g.done[msg.round][msg.id] = true;
      this.broadcastState();
    }
    else if(msg.type === 'tfFlag'){
      if(this.state.gameId!=='tuttifrutti' || !this.state.g) return;
      const r = msg.round; const key = msg.cat+'|'+msg.pid;
      if(!this.state.g.flags[r]) this.state.g.flags[r] = {};
      const arr = this.state.g.flags[r][key] || [];
      const i = arr.indexOf(msg.by);
      if(i>=0) arr.splice(i,1); else arr.push(msg.by);
      this.state.g.flags[r][key] = arr;
      this.broadcastState();
    }
    else if(msg.type === 'dChoose'){
      if(this.state.gameId!=='dibujalo' || !this.state.g || msg.round!==this.state.g.round) return;
      if(this.state.g.drawerOf[msg.round]!==msg.id) return;
      this.dHostWordChosen(msg.id, msg.word, msg.category, msg.round, false);
    }
    else if(msg.type === 'dGuess'){
      if(this.state.gameId!=='dibujalo' || !this.state.g || msg.round!==this.state.g.round) return;
      this.dHostGuess(msg.id, msg.text, msg.ms, msg.round);
    }
  }

  checkAllDone(){
    if(!this.isHost) return;
    if(this.state.phase!=='round') return;
    if(this.players().every(p=>this.state.g.done[p.id])){
      this.later(()=>this.hostStartReveal(), 1200);
    }
  }

  /* ---------- receiving state (all clients) ---------- */
  onState(s, isSelf){
    const freshRoom = !this.state || this.state.code !== s.code;
    if(!freshRoom && this.state.rev != null && s.rev != null && s.rev < this.state.rev) return;

    // Announce newly-seen players (sound + toast) to EVERY client, not just
    // the host — diffed against a running roster so a guest who joins an
    // already-populated lobby doesn't get toasts for people already there.
    if(freshRoom){
      this._knownPlayerIds = new Set((s.players||[]).map(p=>p.id));
    } else {
      const known = this._knownPlayerIds || new Set();
      (s.players||[]).forEach(p=>{
        if(!known.has(p.id)){
          known.add(p.id);
          if(p.id !== this.myId){ this.toast(p.name+' se unió', this.accentColor(p)); this.playJoin(); }
        }
      });
      this._knownPlayerIds = known;
    }

    this.state = s;
    if(this.local.joining){ this.local.joining=false; this.saveSession(); this.toast('Te uniste a la partida', PALETTE[0]); }

    const forced = s.stage !== this.local.appliedStage;
    if(forced){
      this.local.appliedStage = s.stage;
      this.local.screen = s.phase;
      this.local.modal = null;
      this.local.selPid = this.myId;
      this.local.rankPhase = 1;
      if(s.phase === 'round'){
        this.local.inputs = Array(s.gameConfig.words).fill('');
        this.local.submitted = false;
        this.local.lastRound = s.g.round;
        this.startLocalTimer();
      }
      if(s.phase === 'reveal'){
        this.startReveal();
      }
      if(s.phase === 'lobby'){
        this.clearTimers();
      }
      if(s.phase === 'tfWrite'){
        this.local.tfInputs = {};
        this.local.tfSubmittedRound = -1;
        this.local.tfIntro = true;
        this.tfStartLocalTimer();
        this.later(()=>{ this.local.tfIntro=false; this.renderScreen(); }, 1500);
      }
      if(s.phase === 'tfReview'){
        this.tfSubmitMyAnswers();
      }
      if(s.phase === 'dChoose'){
        this.local.dOptions = null;
        this.dStartLocalTimer('choose');
      }
      if(s.phase === 'dDraw'){
        this.local.dGuessDraft = '';
        this.dStartLocalTimer('draw');
      }
      if(s.phase === 'dReveal'){
        this.dCaptureFinalImage(); // canvas element from 'dDraw' is still mounted right up until renderScreen() below
      }
      this.renderScreen();
      return;
    }

    // same stage: patch in place without losing input focus
    if(this.local.screen === 'lobby') this.renderScreen();
    else if(this.local.screen === 'wait') this.renderScreen();
    else if(this.local.screen === 'round') this.patchRoundStatus();
    // A straggler's answer can arrive after reveal has already started
    // (see the 'submit' handler above) — refresh so it's not lost from view.
    else if(this.local.screen === 'reveal') this.renderScreen();
    else if(this.local.screen === 'dDraw') this.dPatchGuesses();
    else if(this.local.screen === 'dChoose') this.renderScreen();
  }

  /* ---------- round flow (host drives global stage) ---------- */
  uStartGame(){
    if(!this.isHost) return;
    this.state.g.answers = [];
    this.state.g.usedWords = [];
    this.hostStartRound(0);
  }
  hostStartRound(r){
    const [word] = pickWords(1, this.state.g.usedWords);
    this.state.g.usedWords = [...this.state.g.usedWords, word];
    this.state.g.round = r;
    this.state.g.roundWord = word;
    this.state.g.roundEndAt = Date.now() + this.state.gameConfig.time*1000;
    this.state.g.done = {};
    this.state.phase = 'round';
    this.state.stage = (this.state.stage||0) + 1;
    this.hostDrafts = {};
    this.broadcastState();
    clearInterval(this.hostWatch);
    this.hostWatch = setInterval(()=>{
      if(!this.isHost || this.state.phase!=='round' || this.state.g.round!==r) { clearInterval(this.hostWatch); return; }
      if(Date.now() >= this.state.g.roundEndAt + 9000){
        this.players().forEach(p=>{
          if(this.state.g.done[p.id]) return;
          if(!this.state.g.answers[r]) this.state.g.answers[r]={};
          // Prefer their last known draft (whatever they'd typed before we
          // lost contact) over an outright empty answer.
          const draft = this.hostDrafts && this.hostDrafts[p.id];
          this.state.g.answers[r][p.id] = this.state.g.answers[r][p.id] || draft || [];
          this.state.g.done[p.id] = true;
        });
        this.broadcastState();
        clearInterval(this.hostWatch);
        this.hostStartReveal();
      }
    }, 700);
  }
  hostStartReveal(){
    if(!this.isHost) return;
    if(this.state.phase !== 'round') return;
    this.state.phase = 'reveal';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }
  uNext(){
    if(!this.isHost) return;
    if(this.state.g.round+1 < this.state.gameConfig.rounds){ this.hostStartRound(this.state.g.round+1); }
    else { this.state.phase='final'; this.state.stage=(this.state.stage||0)+1; this.broadcastState(); }
  }
  uPlayAgain(){
    if(!this.isHost) return;
    this.state.g.answers = []; this.state.g.usedWords = []; this.state.g.round=-1; this.state.g.done={};
    this.state.phase = 'lobby';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }
  // Host-only: end the active game and return everyone to the portal's
  // game picker, keeping the same room/code/players/avatars.
  backToPortal(){
    if(!this.isHost || !this.state) return;
    this.clearTimers();
    this.state.gameId = null;
    this.state.gameConfig = null;
    this.state.g = null;
    this.state.phase = 'lobby';
    this.state.stage = (this.state.stage||0) + 1;
    this.local.hostFlow = null;
    this.broadcastState();
  }

  /* ================= TUTTI FRUTTI ================= */
  confirmTfConfig(){
    if(!this.isHost) return;
    if(this.tfDraft.categories.length < 3){ this.toast('Elegí al menos 3 categorías', CORAL); return; }
    this.state.gameId = 'tuttifrutti';
    this.state.gameConfig = { ...this.tfDraft, categories:[...this.tfDraft.categories] };
    this.state.g = { round:-1, letter:'', usedLetters:[], roundEndAt:0, locked:false, answers:[], done:[], flags:[], stoppedBy:[], stopMs:[] };
    this.state.stage = (this.state.stage||0) + 1;
    this.local.hostFlow = null;
    this.broadcastState();
  }
  tfStartGame(){
    if(!this.isHost) return;
    this.state.g.answers = []; this.state.g.done = []; this.state.g.flags = [];
    this.state.g.usedLetters = []; this.state.g.stoppedBy = []; this.state.g.stopMs = [];
    this.tfStartRound(0);
  }
  tfStartRound(r){
    const letter = pickLetter(this.state.g.usedLetters, this.state.gameConfig.hard);
    this.state.g.usedLetters = [...this.state.g.usedLetters, letter];
    this.state.g.round = r;
    this.state.g.letter = letter;
    this.state.g.roundEndAt = Date.now() + this.state.gameConfig.time*1000;
    this.state.g.locked = false;
    this.state.g.answers[r] = {};
    this.state.g.done[r] = {};
    this.state.g.flags[r] = {};
    this.state.phase = 'tfWrite';
    this.state.stage = (this.state.stage||0) + 1;
    this.tfDrafts = {};
    this.broadcastState();
    clearInterval(this.tfWatch);
    this.tfWatch = setInterval(()=>{
      if(!this.isHost || this.state.phase!=='tfWrite' || this.state.g.round!==r){ clearInterval(this.tfWatch); return; }
      if(Date.now() >= this.state.g.roundEndAt){ clearInterval(this.tfWatch); this.tfHostLock(null, null, r, this.state.gameConfig.time*1000); }
    }, 500);
  }
  // Host-only: STOP (or timeout) locks the round for everyone at once.
  // If someone actively pressed STOP their answers arrive right here with
  // the lock; everyone else submits their in-progress answers the moment
  // their client is forced into the review phase (see tfSubmitMyAnswers).
  tfHostLock(stopperId, stopperAnswers, r, elapsedMs){
    if(!this.isHost) return;
    if(this.state.phase!=='tfWrite' || this.state.g.round!==r) return;
    clearInterval(this.tfWatch);
    this.state.g.locked = true;
    if(stopperId){
      this.state.g.answers[r][stopperId] = stopperAnswers||{};
      this.state.g.done[r][stopperId] = true;
      this.state.g.stoppedBy[r] = stopperId;
      this.state.g.stopMs[r] = elapsedMs;
    }
    this.state.phase = 'tfReview';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
    this.later(()=>{
      if(!this.isHost || this.state.phase!=='tfReview' || this.state.g.round!==r) return;
      let changed = false;
      this.players().forEach(p=>{
        if(!this.state.g.done[r][p.id]){
          const draft = this.tfDrafts && this.tfDrafts[p.id];
          this.state.g.answers[r][p.id] = this.state.g.answers[r][p.id] || draft || {};
          this.state.g.done[r][p.id] = true;
          changed = true;
        }
      });
      if(changed) this.broadcastState();
    }, 3500);
  }
  tfSubmitMyAnswers(){
    if(!this.state) return;
    const r = this.state.g.round;
    if(this.local.tfSubmittedRound === r) return; // I was the stopper, already sent with the lock
    this.local.tfSubmittedRound = r;
    const answers = {...this.local.tfInputs};
    if(this.isHost){
      if(!this.state.g.answers[r]) this.state.g.answers[r] = {};
      if(!this.state.g.done[r]) this.state.g.done[r] = {};
      if(!this.state.g.done[r][this.myId]){
        this.state.g.answers[r][this.myId] = answers;
        this.state.g.done[r][this.myId] = true;
        this.broadcastState();
      }
    } else {
      this.sendAction('tfSubmit', { id:this.myId, round:r, answers });
    }
  }
  tfQueueDraft(){
    if(this.isHost || !this.state) return;
    clearTimeout(this._tfDraftTimer);
    this._tfDraftTimer = setTimeout(()=>{
      if(this.local.screen!=='tfWrite' || !this.state) return;
      this.sendAction('tfDraft', { id:this.myId, round:this.state.g.round, answers:{...this.local.tfInputs} });
    }, 600);
  }
  tfPressStop(){
    if(this.local.screen!=='tfWrite') return;
    if(this.local.tfSubmittedRound === this.state.g.round) return;
    this.local.tfSubmittedRound = this.state.g.round;
    const answers = {...this.local.tfInputs};
    const elapsed = Date.now() - (this.state.g.roundEndAt - this.state.gameConfig.time*1000);
    clearInterval(this.tick);
    if(this.isHost){ this.tfHostLock(this.myId, answers, this.state.g.round, elapsed); }
    else { this.sendAction('tfStop', { id:this.myId, round:this.state.g.round, answers, elapsed }); }
  }
  tfToggleFlag(cat, pid){
    if(!this.state || pid===this.myId) return; // can't flag your own answer
    const r = this.state.g.round;
    if(this.isHost){
      const key = cat+'|'+pid;
      if(!this.state.g.flags[r]) this.state.g.flags[r] = {};
      const arr = this.state.g.flags[r][key] || [];
      const i = arr.indexOf(this.myId);
      if(i>=0) arr.splice(i,1); else arr.push(this.myId);
      this.state.g.flags[r][key] = arr;
      this.broadcastState();
    } else {
      this.sendAction('tfFlag', { round:r, cat, pid, by:this.myId });
    }
    this.renderScreen();
  }
  tfStartLocalTimer(){
    clearInterval(this.tick);
    this.tick = setInterval(()=>{
      if(this.local.screen!=='tfWrite'){ clearInterval(this.tick); return; }
      const left = Math.max(0, Math.round((this.state.g.roundEndAt - Date.now())/1000));
      this.tfPatchTimer(left);
      if(left<=0) clearInterval(this.tick);
      if(left===10) this.toast('¡Quedan 10 segundos!', CORAL);
    }, 500);
  }
  tfPatchTimer(left){
    const cfg = this.state.gameConfig;
    const textEl = this.root.querySelector('[data-el="tfTimerText"]');
    const barEl = this.root.querySelector('[data-el="tfTimerBar"]');
    const boxEl = this.root.querySelector('[data-el="tfTimerBox"]');
    if(textEl) textEl.textContent = mmss(left);
    if(barEl) barEl.style.width = (left/cfg.time*100)+'%';
    const urgent = left<=10;
    if(barEl) barEl.style.background = urgent ? CORAL : INK;
    if(boxEl){ boxEl.style.background = urgent ? CORAL : '#fff'; boxEl.style.animation = urgent ? 'tick 1s ease-in-out infinite' : 'none'; }
  }

  /* ---------- tutti frutti scoring ---------- */
  tfValid(r, cat, pid){
    const ans = (this.state.g.answers[r]||{})[pid] || {};
    const text = (ans[cat]||'').trim();
    if(!text) return false;
    const flags = ((this.state.g.flags[r]||{})[cat+'|'+pid]) || [];
    if(flags.includes(this.state.hostId) || flags.length>=2) return false;
    const letter = this.state.g.usedLetters[r] != null ? this.state.g.usedLetters[r] : this.state.g.letter;
    return norm(text).startsWith(norm(letter));
  }
  tfPoints(r){
    const cfg = this.state.gameConfig; const out = {};
    this.players().forEach(p=>out[p.id]={items:[],total:0});
    if(!this.state.g.answers[r]) return out;
    (cfg.categories||[]).forEach(catId=>{
      const groups = {};
      this.players().forEach(p=>{
        if(!this.tfValid(r,catId,p.id)) return;
        const ans = (this.state.g.answers[r]||{})[p.id]||{};
        const k = norm(ans[catId]);
        (groups[k] = groups[k]||[]).push(p.id);
      });
      this.players().forEach(p=>{
        const ans = (this.state.g.answers[r]||{})[p.id]||{};
        const text = (ans[catId]||'').trim();
        const valid = this.tfValid(r,catId,p.id);
        let pts = 0;
        if(valid){ const k=norm(text); pts = groups[k].length===1 ? 10 : 5; }
        out[p.id].items.push({cat:catId, text, valid, pts});
        out[p.id].total += pts;
      });
    });
    return out;
  }
  tfTotals(uptoRound){
    const t = {}; this.players().forEach(p=>t[p.id]=0);
    for(let r=0;r<=uptoRound;r++){ if(!this.state.g.answers[r]) continue; const pts=this.tfPoints(r); for(const id in pts) t[id]=(t[id]||0)+pts[id].total; }
    return t;
  }
  tfNext(){
    if(!this.isHost) return;
    if(this.state.g.round+1 < this.state.gameConfig.rounds){ this.tfStartRound(this.state.g.round+1); }
    else { this.state.phase='tfFinal'; this.state.stage=(this.state.stage||0)+1; this.broadcastState(); }
  }
  tfPlayAgain(){
    if(!this.isHost) return;
    this.state.g.answers=[]; this.state.g.done=[]; this.state.g.flags=[];
    this.state.g.usedLetters=[]; this.state.g.stoppedBy=[]; this.state.g.stopMs=[]; this.state.g.round=-1;
    this.state.phase='lobby';
    this.state.stage=(this.state.stage||0)+1;
    this.broadcastState();
  }

  /* ================= DIBUJALO ================= */
  confirmDibujaloConfig(){
    if(!this.isHost) return;
    if(this.dDraft.categories.length < 1){ this.toast('Elegí al menos una categoría', CORAL); return; }
    this.state.gameId = 'dibujalo';
    this.state.gameConfig = { ...this.dDraft, categories:[...this.dDraft.categories] };
    this.state.g = {
      round:-1, order:[], usedWords:[], drawerOf:[], word:[], category:[],
      chooseEndAt:0, drawEndAt:0, guesses:[], correctOrder:[], hintUsed:[], hintCategory:[],
    };
    this.state.stage = (this.state.stage||0) + 1;
    this.local.hostFlow = null;
    this.broadcastState();
  }
  dStartGame(){
    if(!this.isHost) return;
    const order = this.players().map(p=>p.id);
    for(let i=order.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
    this.state.g.order = order;
    this.state.g.usedWords = []; this.state.g.drawerOf = []; this.state.g.word = []; this.state.g.category = [];
    this.state.g.guesses = []; this.state.g.correctOrder = []; this.state.g.hintUsed = []; this.state.g.hintCategory = [];
    this.dStartRound(0);
  }
  dStartRound(r){
    const order = this.state.g.order;
    const drawerId = order[r % order.length];
    const trio = pickDibujaloTrio(this.state.g.usedWords, this.state.gameConfig.categories);
    this.dPendingTrio = trio; // host-only — never part of broadcast state
    this.dSecretWord = null;
    this.state.g.round = r;
    this.state.g.drawerOf[r] = drawerId;
    this.state.g.guesses[r] = [];
    this.state.g.correctOrder[r] = [];
    this.state.g.hintUsed[r] = false;
    this.state.g.hintCategory[r] = null;
    this.state.g.chooseEndAt = Date.now() + this.state.gameConfig.chooseTime*1000;
    this.state.phase = 'dChoose';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
    const wireOptions = trio.map(t=>({word:t.word, emoji:t.emoji, category:t.category, difficulty:t.difficulty}));
    // Broadcast has self:false — if the host is also the drawer they'd
    // never receive their own message, so hand it to themselves directly.
    if(drawerId === this.myId) this.dReceiveWords(wireOptions);
    else this.send('dWords', { to: drawerId, options: wireOptions });
    clearInterval(this.dWatch);
    this.dWatch = setInterval(()=>{
      if(!this.isHost || this.state.phase!=='dChoose' || this.state.g.round!==r){ clearInterval(this.dWatch); return; }
      if(Date.now() >= this.state.g.chooseEndAt){
        clearInterval(this.dWatch);
        const pick = this.dPendingTrio[Math.floor(Math.random()*this.dPendingTrio.length)];
        this.dHostWordChosen(drawerId, pick.word, pick.category, r, true);
      }
    }, 400);
  }
  // Drawer-side: received their 3 private options.
  dReceiveWords(options){
    this.local.dOptions = options;
    this.renderScreen();
  }
  dChooseWord(word, category){
    if(!this.state || this.state.phase!=='dChoose') return;
    if(this.state.g.drawerOf[this.state.g.round] !== this.myId) return;
    this.local.dChosenWord = word; // remembered locally too — dSecretWord below is host-only
    if(this.isHost) this.dHostWordChosen(this.myId, word, category, this.state.g.round, false);
    else this.sendAction('dChoose', { id:this.myId, round:this.state.g.round, word, category });
    this.local.dOptions = null;
  }
  // Host-only: the secret word is written straight into a host-local
  // variable, never into the broadcast state, so no other client ever
  // receives it before the round's reveal.
  dHostWordChosen(drawerId, word, category, r, auto){
    if(!this.isHost) return;
    if(this.state.phase!=='dChoose' || this.state.g.round!==r) return;
    clearInterval(this.dWatch);
    this.dSecretWord = word;
    if(drawerId === this.myId) this.local.dChosenWord = word;
    else this.send('dAutoChosen', { to:drawerId, word }); // covers the timeout-auto-pick case for a guest drawer
    this.state.g.category[r] = category;
    this.state.g.drawEndAt = Date.now() + this.state.gameConfig.drawTime*1000;
    this.state.phase = 'dDraw';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
    if(auto) this.toast('¡Tiempo! Se eligió por vos', CORAL);
    clearInterval(this.dWatch);
    this.dWatch = setInterval(()=>{
      if(!this.isHost || this.state.phase!=='dDraw' || this.state.g.round!==r){ clearInterval(this.dWatch); return; }
      const elapsed = this.state.gameConfig.drawTime*1000 - (this.state.g.drawEndAt - Date.now());
      if(this.state.gameConfig.hints && !this.state.g.hintUsed[r] && elapsed >= 30000){
        this.state.g.hintUsed[r] = true;
        this.state.g.hintCategory[r] = this.state.g.category[r];
        this.broadcastState();
      }
      if(Date.now() >= this.state.g.drawEndAt){ clearInterval(this.dWatch); this.dHostReveal(r); }
    }, 500);
  }
  dHostReveal(r){
    if(!this.isHost) return;
    if(this.state.phase!=='dDraw' || this.state.g.round!==r) return;
    clearInterval(this.dWatch);
    this.state.g.word[r] = this.dSecretWord || '?';
    this.state.g.usedWords = [...this.state.g.usedWords, this.state.g.word[r]];
    this.state.phase = 'dReveal';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }
  dNext(){
    if(!this.isHost) return;
    if(this.state.g.round+1 < this.state.gameConfig.rounds){ this.dStartRound(this.state.g.round+1); }
    else { this.state.phase='dFinal'; this.state.stage=(this.state.stage||0)+1; this.broadcastState(); }
  }
  dPlayAgain(){
    if(!this.isHost) return;
    const order = this.players().map(p=>p.id);
    for(let i=order.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
    this.state.g = {
      round:-1, order, usedWords:[], drawerOf:[], word:[], category:[],
      chooseEndAt:0, drawEndAt:0, guesses:[], correctOrder:[], hintUsed:[], hintCategory:[],
    };
    this.state.phase = 'lobby';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }

  /* ---------- Dibujalo: guessing ---------- */
  dSendGuess(){
    const text = (this.local.dGuessDraft||'').trim();
    if(!text || !this.state) return;
    const r = this.state.g.round;
    if(this.state.g.drawerOf[r]===this.myId) return;
    const already = (this.state.g.correctOrder[r]||[]).some(e=>e.id===this.myId);
    if(already) return;
    this.local.dGuessDraft = '';
    const startedAt = this.state.g.drawEndAt - this.state.gameConfig.drawTime*1000;
    const ms = Date.now() - startedAt;
    if(this.isHost) this.dHostGuess(this.myId, text, ms, r);
    else this.sendAction('dGuess', { id:this.myId, round:r, text, ms });
    this.renderScreen();
  }
  // Host-only: the only place the guess is actually checked against the
  // secret word — guessers' own clients never know it.
  dHostGuess(id, text, ms, r){
    if(!this.isHost) return;
    if(this.state.phase!=='dDraw' || this.state.g.round!==r) return;
    if(this.state.g.drawerOf[r]===id) return;
    if((this.state.g.correctOrder[r]||[]).some(e=>e.id===id)) return;
    const correct = norm(text) === norm(this.dSecretWord||'');
    this.state.g.guesses[r] = [...(this.state.g.guesses[r]||[]).slice(-49), {id, text, correct, ts:Date.now()}];
    if(correct){
      this.state.g.correctOrder[r] = [...(this.state.g.correctOrder[r]||[]), {id, ms}];
      const p = this.playerById(id);
      if(p) this.toast('🎉 ¡'+p.name.toUpperCase()+' ADIVINÓ!', MINT);
      const guessers = this.players().length - 1;
      if(this.state.g.correctOrder[r].length >= guessers){ this.later(()=>this.dHostReveal(r), 1200); }
    }
    this.broadcastState();
  }

  /* ---------- Dibujalo: scoring ---------- */
  dPoints(r){
    const out = {}; this.players().forEach(p=>out[p.id]=0);
    const order = this.state.g.correctOrder[r]||[];
    const RANKS = [100,75,50];
    order.forEach((entry,i)=>{ out[entry.id] = i<3 ? RANKS[i] : 25; });
    const drawerId = this.state.g.drawerOf[r];
    if(drawerId!=null) out[drawerId] = (out[drawerId]||0) + 10*order.length;
    return out;
  }
  dTotals(uptoRound){
    const t = {}; this.players().forEach(p=>t[p.id]=0);
    for(let r=0;r<=uptoRound;r++){ if(this.state.g.drawerOf[r]==null) continue; const pts=this.dPoints(r); for(const id in pts) t[id]=(t[id]||0)+pts[id]; }
    return t;
  }

  /* ---------- Dibujalo: canvas drawing (direct 2D context, never re-rendered via innerHTML mid-round) ---------- */
  dSetupCanvas(){
    const canvas = this.root.querySelector('#dCanvas');
    if(!canvas) return;
    this.dCanvasEl = canvas;
    this.dCtx = canvas.getContext('2d');
    this.dCtx.fillStyle = '#fff';
    this.dCtx.fillRect(0,0,canvas.width,canvas.height);
    this.dCtx.lineCap = 'round'; this.dCtx.lineJoin = 'round';
    const isDrawer = this.state.g.drawerOf[this.state.g.round] === this.myId;
    if(!isDrawer) return;
    let drawing=false, lastPt=null, buffer=[];
    const flush = ()=>{
      if(buffer.length<2) return;
      this.send('stroke', { points:buffer, color:this.local.dTool==='eraser'?'#fff':this.local.dColor, size:this.local.dTool==='eraser'?this.local.dSize*3:this.local.dSize });
      buffer = buffer.slice(-1);
    };
    clearInterval(this._strokeFlushTimer);
    this._strokeFlushTimer = setInterval(flush, 90);
    const down = e=>{
      e.preventDefault(); drawing=true;
      const p = this.dGetPoint(e, canvas); lastPt=p; buffer=[p];
    };
    const move = e=>{
      if(!drawing) return; e.preventDefault();
      const p = this.dGetPoint(e, canvas);
      this.dDrawSegment(this.dCtx, lastPt, p, this.local.dTool==='eraser'?'#fff':this.local.dColor, this.local.dTool==='eraser'?this.local.dSize*3:this.local.dSize, canvas);
      buffer.push(p); lastPt=p;
    };
    const up = ()=>{ if(!drawing) return; drawing=false; flush(); buffer=[]; };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    canvas.style.touchAction = 'none';
    this._dCleanup = ()=>{ canvas.removeEventListener('pointerdown',down); canvas.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); clearInterval(this._strokeFlushTimer); };
  }
  dGetPoint(e, canvas){
    const rect = canvas.getBoundingClientRect();
    return { x:(e.clientX-rect.left)/rect.width, y:(e.clientY-rect.top)/rect.height };
  }
  dDrawSegment(ctx, from, to, color, size, canvas){
    ctx.strokeStyle = color; ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(from.x*canvas.width, from.y*canvas.height);
    ctx.lineTo(to.x*canvas.width, to.y*canvas.height);
    ctx.stroke();
  }
  dOnStroke(payload){
    if(!this.state || !this.dCtx || !this.dCanvasEl) return;
    if(this.state.g && this.state.g.drawerOf[this.state.g.round]===this.myId) return; // I drew this myself already
    const pts = payload.points||[];
    for(let i=1;i<pts.length;i++){ this.dDrawSegment(this.dCtx, pts[i-1], pts[i], payload.color, payload.size, this.dCanvasEl); }
  }
  dOnClear(){
    if(!this.dCtx || !this.dCanvasEl) return;
    this.dCtx.fillStyle = '#fff';
    this.dCtx.fillRect(0,0,this.dCanvasEl.width,this.dCanvasEl.height);
  }
  dCaptureFinalImage(){
    try{ this.local.dFinalImage = this.dCanvasEl ? this.dCanvasEl.toDataURL('image/png') : null; }
    catch(e){ this.local.dFinalImage = null; }
  }
  dClearCanvas(){
    if(this.state.g.drawerOf[this.state.g.round]!==this.myId) return;
    this.dOnClear();
    this.send('dClear', {});
  }
  dPatchGuesses(){
    const el = this.root.querySelector('[data-el="dGuessFeed"]');
    if(el) el.outerHTML = this.dGuessFeedHtml();
    const cnt = this.root.querySelector('[data-el="dCorrectCount"]');
    if(cnt){ const r=this.state.g.round; cnt.textContent = (this.state.g.correctOrder[r]||[]).length+' / '+(this.players().length-1); }
  }
  dGuessFeedHtml(){
    const s = this.state, r = s.g.round, pl = this.players(), byId={}; pl.forEach(p=>byId[p.id]=p);
    const list = (s.g.guesses[r]||[]).slice(-12).reverse();
    const rows = list.map(g=>{
      const p = byId[g.id]; if(!p) return '';
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0">
        <div style="width:22px;height:22px;flex:0 0 auto">${avatarSVG(p.avatar,22)}</div>
        <div style="font-size:13px;font-weight:700;color:var(--muted)">${esc(p.name)}:</div>
        <div style="flex:1;min-width:0;font-size:14px;font-weight:800;overflow-wrap:anywhere">${esc(g.text)}</div>
        ${g.correct?`<div style="flex:0 0 auto;font-size:14px">✓</div>`:''}
      </div>`;
    }).join('') || `<div style="text-align:center;color:var(--muted);font-size:13px;font-weight:700;padding:10px 0">Nadie escribió todavía…</div>`;
    return `<div data-el="dGuessFeed" style="display:flex;flex-direction:column;gap:2px;max-height:220px;overflow-y:auto">${rows}</div>`;
  }
  dStartLocalTimer(kind){
    clearInterval(this.tick);
    this.tick = setInterval(()=>{
      if(this.local.screen!=='dChoose' && this.local.screen!=='dDraw'){ clearInterval(this.tick); return; }
      const endAt = kind==='choose' ? this.state.g.chooseEndAt : this.state.g.drawEndAt;
      const left = Math.max(0, Math.round((endAt - Date.now())/1000));
      this.dPatchTimer(left);
      if(left<=0) clearInterval(this.tick);
    }, 500);
  }
  dPatchTimer(left){
    const textEl = this.root.querySelector('[data-el="dTimerText"]');
    const boxEl = this.root.querySelector('[data-el="dTimerBox"]');
    if(textEl) textEl.textContent = mmss(left);
    const urgent = left<=10;
    if(boxEl){ boxEl.style.background = urgent ? CORAL : '#fff'; boxEl.style.animation = urgent ? 'tick 1s ease-in-out infinite' : 'none'; }
  }
  dPatchToolbar(){
    this.root.querySelectorAll('[data-el="dColorBtn"]').forEach(b=>{ b.style.boxShadow = b.dataset.color===this.local.dColor && this.local.dTool==='brush' ? `0 0 0 3px #fff, 0 0 0 5px ${INK}` : 'none'; });
    this.root.querySelectorAll('[data-el="dSizeBtn"]').forEach(b=>{ const on = Number(b.dataset.size)===this.local.dSize; b.style.background = on?INK:'#fff'; b.style.color = on?'var(--cream)':INK; });
    const eraserBtn = this.root.querySelector('[data-el="dEraserBtn"]');
    if(eraserBtn){ const on = this.local.dTool==='eraser'; eraserBtn.style.background = on?INK:'#fff'; eraserBtn.style.color = on?'var(--cream)':INK; }
  }

  /* ---------- local per-client timer for round screen ---------- */
  startLocalTimer(){
    clearInterval(this.tick);
    this.tick = setInterval(()=>{
      if(this.local.screen!=='round'){ clearInterval(this.tick); return; }
      const left = Math.max(0, Math.round((this.state.g.roundEndAt - Date.now())/1000));
      this.patchTimer(left);
      if(left<=0){ clearInterval(this.tick); if(!this.local.submitted) this.submit(true); }
      if(left===10) this.toast('¡Quedan 10 segundos!', CORAL);
    }, 500);
  }
  patchTimer(left){
    const cfg = this.state.gameConfig;
    const textEl = this.root.querySelector('[data-el="timerText"]');
    const barEl = this.root.querySelector('[data-el="timerBar"]');
    const boxEl = this.root.querySelector('[data-el="timerBox"]');
    if(textEl) textEl.textContent = mmss(left);
    if(barEl) barEl.style.width = (left/cfg.time*100)+'%';
    const urgent = left<=10;
    if(barEl) barEl.style.background = urgent ? CORAL : INK;
    if(boxEl){ boxEl.style.background = urgent ? CORAL : '#fff'; boxEl.style.animation = urgent ? 'tick 1s ease-in-out infinite' : 'none'; }
  }
  patchRoundStatus(){
    const el = this.root.querySelector('[data-el="statusWidget"]');
    if(!el) return;
    el.outerHTML = this.renderStatusWidget();
  }

  /* ---------- submit words ---------- */
  submit(auto){
    if(this.local.submitted || this.local.screen!=='round') return;
    let words = []; const seen = new Set();
    this.local.inputs.forEach(v=>{ const k=norm(v); if(k && !seen.has(k)){ seen.add(k); words.push(v.trim()); } });
    if(!words.length && !auto){ this.toast('Escribí al menos una palabra', CORAL); return; }
    this.local.submitted = true;
    clearInterval(this.tick);
    if(auto) this.toast('¡Se acabó el tiempo!', CORAL);
    if(this.isHost){
      if(!this.state.g.answers[this.state.g.round]) this.state.g.answers[this.state.g.round] = {};
      this.state.g.answers[this.state.g.round][this.myId] = words;
      this.state.g.done[this.myId] = true;
      this.broadcastState();
      this.checkAllDone();
    } else {
      this.sendAction('submit', { id:this.myId, round:this.state.g.round, words });
    }
    this.local.screen = 'wait';
    this.renderScreen();
  }

  /* ---------- reveal animation (local, data already shared) ---------- */
  startReveal(){
    clearInterval(this.revealTick);
    this.local.reveal = 0;
    this.later(()=>{
      this.revealTick = setInterval(()=>{
        const n = this.groups(this.state.g.round).length;
        if(this.local.reveal >= n){ clearInterval(this.revealTick); return; }
        this.local.reveal++;
        this.renderScreen();
      }, 750);
    }, 500);
  }

  /* ---------- navigation ---------- */
  goHome(){
    this.clearTimers();
    if(this.channel){ try{ if(this.myId) this.sendAction('leave', {id:this.myId}); supabase.removeChannel(this.channel); }catch(e){} this.channel=null; }
    this.clearSession();
    this.state = null; this.myId = null; this.isHost = false;
    this.chatMessages = []; this._knownPlayerIds = null;
    this.local = { ...this.local, screen:'home', modal:null, joinCode:'', joining:false, joinError:'', showJoinName:false, chatOpen:false, chatUnread:0, chatDraft:'' };
    this.renderScreen();
    this.renderHud();
    this.renderChatPanel();
  }

  /* ---------- chat (peer-to-peer broadcast, never part of game state) ---------- */
  onChatMessage(msg){
    this.chatMessages = [...this.chatMessages.slice(-99), msg];
    if(!this.local.chatOpen){ this.local.chatUnread++; this.renderHud(); }
    this.playChat();
    this.renderChatPanel();
  }
  sendChat(){
    const text = (this.local.chatDraft||'').trim().slice(0,240);
    if(!text || !this.state) return;
    const me = this.playerById(this.myId);
    const msg = { id:uid(), playerId:this.myId, name:(me&&me.name)||this.local.cfgName||'Vos', avatar:(me&&me.avatar)||this.local.avatar, text, ts:Date.now() };
    this.chatMessages = [...this.chatMessages.slice(-99), msg];
    this.local.chatDraft = '';
    this.send('chat', msg);
    this.renderChatPanel();
    this.later(()=>{ const el=this.chatRoot && this.chatRoot.querySelector('[data-role="chat-input"]'); if(el) el.focus(); }, 30);
  }
  toggleChat(){
    this.local.chatOpen = !this.local.chatOpen;
    if(this.local.chatOpen) this.local.chatUnread = 0;
    this.renderChat();
    if(this.local.chatOpen) this.later(()=>{ const el=this.chatRoot && this.chatRoot.querySelector('[data-role="chat-input"]'); if(el) el.focus(); }, 30);
  }
  renderChat(){ this.renderChatPanel(); this.renderHud(); }

  renderHud(){
    if(!this.hudRoot) return;
    const soundBtn = `<button data-action="toggleSound" aria-label="Sonido" style="width:44px;height:44px;border-radius:50%;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};display:flex;align-items:center;justify-content:center;font-size:18px">${this.soundOn?'🔊':'🔇'}</button>`;
    let chatFab = '';
    if(this.state){
      const badge = this.local.chatUnread>0 ? `<div style="position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:${CORAL};border:2px solid ${INK};color:${INK};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">${this.local.chatUnread>9?'9+':this.local.chatUnread}</div>` : '';
      chatFab = `<div style="position:fixed;right:16px;bottom:16px;z-index:70">
        <div style="position:relative">
          <button data-action="toggleChat" aria-label="Chat" style="width:54px;height:54px;border-radius:50%;border:2.5px solid ${INK};background:${this.local.chatOpen?INK:CORAL};color:${this.local.chatOpen?'var(--cream)':INK};box-shadow:0 4px 0 ${INK};display:flex;align-items:center;justify-content:center;font-size:24px">${this.local.chatOpen?'✕':'💬'}</button>
          ${badge}
        </div>
      </div>`;
    }
    this.hudRoot.innerHTML = `<div style="position:fixed;top:14px;right:16px;z-index:70">${soundBtn}</div>${chatFab}`;
  }

  renderChatPanel(){
    if(!this.chatRoot) return;
    if(!this.state || !this.local.chatOpen){ this.chatRoot.innerHTML=''; return; }
    const rows = this.chatMessages.map(m=>{
      const mine = m.playerId === this.myId;
      return `<div style="display:flex;flex-direction:column;align-items:${mine?'flex-end':'flex-start'};gap:2px">
        <div style="font-size:11px;font-weight:800;color:var(--muted);padding:0 4px">${mine?'Vos':esc(m.name)}</div>
        <div style="max-width:78%;display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:16px;${mine?'border-bottom-right-radius:4px':'border-bottom-left-radius:4px'};background:${mine?CORAL:'#fff'};border:2px solid ${INK};font-size:15px;font-weight:600;overflow-wrap:anywhere">${avatarSVG(m.avatar,20)}<span>${esc(m.text)}</span></div>
      </div>`;
    }).join('') || `<div style="text-align:center;color:var(--muted);font-size:14px;font-weight:700;padding:20px 0">Todavía no hay mensajes. ¡Decí algo!</div>`;
    this.chatRoot.innerHTML = `<div style="position:fixed;right:16px;bottom:80px;z-index:69;width:min(340px, calc(100vw - 32px));max-height:min(60vh, 460px);display:flex;flex-direction:column;background:var(--cream);border:2.5px solid ${INK};border-radius:22px;box-shadow:0 8px 0 ${INK};overflow:hidden;animation:pop .3s cubic-bezier(.3,1.5,.5,1) both">
      <div style="padding:12px 16px;border-bottom:2px solid var(--line);font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">Chat de la partida</div>
      <div id="chatScroll" style="flex:1;min-height:120px;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px">${rows}</div>
      <div style="display:flex;gap:8px;padding:10px;border-top:2px solid var(--line)">
        <input data-role="chat-input" value="${esc(this.local.chatDraft)}" placeholder="Escribí algo…" autocomplete="off" style="flex:1;min-width:0;height:44px;border-radius:14px;border:2px solid ${INK};background:#fff;padding:0 14px;font-size:15px;font-weight:600;color:${INK};outline:none">
        <button data-action="sendChat" aria-label="Enviar" style="flex:0 0 auto;width:44px;height:44px;border-radius:14px;border:2px solid ${INK};background:${INK};color:var(--cream);font-size:18px">➤</button>
      </div>
    </div>`;
    const scroller = this.chatRoot.querySelector('#chatScroll');
    if(scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  /* ---------- event delegation ---------- */
  _bindDelegation(){
    // Delegated on document.body (not this.root) so clicks/input inside the
    // separately-rendered modal container are handled too.
    document.body.addEventListener('click', e=>{
      const t = e.target.closest('[data-action]');
      if(!t) return;
      const action = t.dataset.action;
      if(action !== 'stop') this.playClick();
      const fn = this.actions[action];
      if(fn) fn.call(this, t, e);
    });
    document.body.addEventListener('input', e=>{
      const t = e.target;
      if(t.dataset.role === 'cfg-name'){ this.local.cfgName = t.value.slice(0,14); }
      else if(t.dataset.role === 'join-code'){ this.local.joinCode = t.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5); t.value=this.local.joinCode; }
      else if(t.dataset.role === 'join-name'){ this.local.joinNameDraft = t.value.slice(0,14); }
      else if(t.dataset.role === 'word-input'){
        const i = Number(t.dataset.index);
        this.local.inputs[i] = t.value.slice(0,24);
        this.patchWordMeta();
        this.queueDraft();
      }
      // Chat draft is tracked quietly (no re-render) so typing never fights
      // the user for cursor position — the panel only rebuilds on send/receive.
      else if(t.dataset.role === 'chat-input'){ this.local.chatDraft = t.value.slice(0,240); }
      else if(t.dataset.role === 'tf-input'){
        this.local.tfInputs[t.dataset.cat] = t.value.slice(0,24);
        this.tfQueueDraft();
      }
      else if(t.dataset.role === 'd-guess-input'){ this.local.dGuessDraft = t.value.slice(0,40); }
    });
    document.body.addEventListener('keydown', e=>{
      const t = e.target;
      if(t.dataset.role === 'join-code' && e.key==='Enter') this.actions.joinGame.call(this);
      if(t.dataset.role === 'join-name' && e.key==='Enter') this.actions.confirmJoinName.call(this);
      if(t.dataset.role === 'chat-input' && e.key==='Enter'){ e.preventDefault(); this.actions.sendChat.call(this); }
      if(t.dataset.role === 'word-input' && e.key==='Enter'){
        e.preventDefault();
        const i = Number(t.dataset.index);
        const n = this.local.inputs.length;
        if(i < n-1){ const next = this.root.querySelector(`[data-role="word-input"][data-index="${i+1}"]`); if(next) next.focus(); }
        else this.submit(false);
      }
      if(t.dataset.role === 'tf-input' && e.key==='Enter'){
        e.preventDefault();
        const i = Number(t.dataset.index);
        const n = this.state ? (this.state.gameConfig.categories||[]).length : 0;
        if(i < n-1){ const next = this.root.querySelector(`[data-role="tf-input"][data-index="${i+1}"]`); if(next) next.focus(); }
        else this.tfPressStop();
      }
      if(t.dataset.role === 'd-guess-input' && e.key==='Enter'){ e.preventDefault(); this.dSendGuess(); }
    });
  }
  patchWordMeta(){
    const counts = {};
    this.local.inputs.forEach(x=>{ const k=norm(x); if(k) counts[k]=(counts[k]||0)+1; });
    this.local.inputs.forEach((x,i)=>{
      const k = norm(x); const dup = !!(k && counts[k]>1);
      const wrap = this.root.querySelector(`[data-field="${i}"]`);
      if(!wrap) return;
      const input = wrap.querySelector('input');
      const num = wrap.querySelector('[data-el="num"]');
      const dupTag = wrap.querySelector('[data-el="dup"]');
      const border = dup ? CORAL : (k?INK:'#DCCFBC');
      input.style.borderColor = border;
      if(num) num.style.background = dup?CORAL:(k?MINT:'#F1E7D8');
      if(dupTag) dupTag.style.display = dup?'block':'none';
    });
    const filled = this.local.inputs.filter(x=>norm(x)).length;
    const fc = this.root.querySelector('[data-el="filledCount"]');
    if(fc) fc.textContent = filled+' / '+this.state.gameConfig.words;
  }

  // Debounced checkpoint of in-progress words sent to the host, so a
  // background-throttled tab (screen lock, app switch) that never fires its
  // own timeout-submit still leaves the host something better than nothing
  // to fall back to. Host only needs this from guests — its own inputs are
  // already its local source of truth.
  queueDraft(){
    if(this.isHost || !this.state) return;
    clearTimeout(this._draftTimer);
    this._draftTimer = setTimeout(()=>{
      if(this.local.screen!=='round' || this.local.submitted || !this.state) return;
      const words = this.local.inputs.map(v=>v.trim()).filter(Boolean);
      this.sendAction('draft', { id:this.myId, round:this.state.g.round, words });
    }, 600);
  }

  get actions(){
    return {
      goHome: ()=>this.goHome(),
      goSetup: ()=>{ this.local.screen='setup'; this.renderScreen(); },
      openHow: ()=>{ this.local.modal='how'; this.renderModals(); },
      closeModal: ()=>{ this.local.modal=null; this.local.showJoinName=false; this.renderModals(); },
      stop: (t,e)=>e.stopPropagation(),
      askLeave: ()=>{ this.local.modal='leave'; this.renderModals(); },
      createGame: ()=>this.createGame(),
      joinGame: ()=>this.joinGame(),
      confirmJoinName: ()=>this.confirmJoinName(),
      startGame: ()=>{
        if(this.state.gameId==='unanimo') this.uStartGame();
        else if(this.state.gameId==='dibujalo') this.dStartGame();
        else if(this.state.gameId==='tuttifrutti') this.tfStartGame();
      },
      copyCode: ()=>{ try{ navigator.clipboard.writeText(this.state.code); }catch(e){} this.toast('Código copiado', MINT); },
      // --- portal: host picking / configuring a game from the lobby ---
      pickGame: (t)=>{ this.local.hostFlow = t.dataset.game; this.renderScreen(); },
      backToPicker: ()=>{ this.local.hostFlow = null; this.renderScreen(); },
      backToPortal: ()=>this.backToPortal(),
      confirmUnanimoConfig: ()=>this.confirmUnanimoConfig(),
      confirmDibujaloConfig: ()=>this.confirmDibujaloConfig(),
      confirmTfConfig: ()=>this.confirmTfConfig(),
      decWords: ()=>{ this.uDraft.words = clamp(this.uDraft.words-1,3,8); this.renderScreen(); },
      incWords: ()=>{ this.uDraft.words = clamp(this.uDraft.words+1,3,8); this.renderScreen(); },
      setRounds: (t)=>{ this.uDraft.rounds = Number(t.dataset.val); this.renderScreen(); },
      setTime: (t)=>{ this.uDraft.time = Number(t.dataset.val); this.renderScreen(); },
      tfSetRounds: (t)=>{ this.tfDraft.rounds = Number(t.dataset.val); this.renderScreen(); },
      tfSetTime: (t)=>{ this.tfDraft.time = Number(t.dataset.val); this.renderScreen(); },
      tfToggleCategory: (t)=>{
        const id = t.dataset.cat;
        const i = this.tfDraft.categories.indexOf(id);
        if(i>=0) this.tfDraft.categories.splice(i,1); else this.tfDraft.categories.push(id);
        this.renderScreen();
      },
      tfToggleHard: ()=>{ this.tfDraft.hard = !this.tfDraft.hard; this.renderScreen(); },
      tfPressStop: ()=>this.tfPressStop(),
      tfFlag: (t)=>{ this.tfToggleFlag(t.dataset.cat, t.dataset.pid); },
      dSetRounds: (t)=>{ this.dDraft.rounds = Number(t.dataset.val); this.renderScreen(); },
      dSetChooseTime: (t)=>{ this.dDraft.chooseTime = Number(t.dataset.val); this.renderScreen(); },
      dSetDrawTime: (t)=>{ this.dDraft.drawTime = Number(t.dataset.val); this.renderScreen(); },
      dToggleHints: ()=>{ this.dDraft.hints = !this.dDraft.hints; this.renderScreen(); },
      dToggleCategory: (t)=>{
        const id = t.dataset.cat;
        const i = this.dDraft.categories.indexOf(id);
        if(i>=0) this.dDraft.categories.splice(i,1); else this.dDraft.categories.push(id);
        this.renderScreen();
      },
      dChooseOption: (t)=>{
        const i = Number(t.dataset.i);
        const opt = this.local.dOptions && this.local.dOptions[i];
        if(opt) this.dChooseWord(opt.word, opt.category);
      },
      dSendGuess: ()=>this.dSendGuess(),
      dClearCanvas: ()=>this.dClearCanvas(),
      dSetColor: (t)=>{ this.local.dColor = t.dataset.color; this.local.dTool='brush'; this.dPatchToolbar(); },
      dSetSize: (t)=>{ this.local.dSize = Number(t.dataset.size); this.dPatchToolbar(); },
      dSetTool: (t)=>{ this.local.dTool = t.dataset.tool; this.dPatchToolbar(); },
      submitNow: ()=>this.submit(false),
      revealAll: ()=>{ clearInterval(this.revealTick); this.local.reveal = this.groups(this.state.g.round).length; this.renderScreen(); },
      goScore: ()=>{ this.local.screen='score'; this.local.selPid=this.myId; this.renderScreen(); },
      goRanking: ()=>{
        const map = {unanimo:'ranking', tuttifrutti:'tfRanking', dibujalo:'dRanking'};
        this.local.screen = map[this.state.gameId] || 'ranking';
        this.local.rankPhase=0; this.renderScreen();
        this.later(()=>{ this.local.rankPhase=1; this.renderScreen(); },900);
      },
      selectPlayer: (t)=>{ this.local.selPid = t.dataset.pid; this.renderScreen(); },
      nextRound: ()=>{
        if(this.state.gameId==='unanimo') this.uNext();
        else if(this.state.gameId==='dibujalo') this.dNext();
        else if(this.state.gameId==='tuttifrutti') this.tfNext();
      },
      playAgain: ()=>{
        if(this.state.gameId==='unanimo') this.uPlayAgain();
        else if(this.state.gameId==='dibujalo') this.dPlayAgain();
        else if(this.state.gameId==='tuttifrutti') this.tfPlayAgain();
      },
      avatarPrev: (t)=>{ const k=t.dataset.trait, n=Number(t.dataset.count); this.local.avatar[k] = ((this.local.avatar[k]||0)-1+n)%n; this.refreshAvatarUI(); },
      avatarNext: (t)=>{ const k=t.dataset.trait, n=Number(t.dataset.count); this.local.avatar[k] = ((this.local.avatar[k]||0)+1)%n; this.refreshAvatarUI(); },
      toggleSound: ()=>this.toggleSound(),
      toggleChat: ()=>this.toggleChat(),
      sendChat: ()=>this.sendChat(),
      ...(this.dibujaloActions ? this.dibujaloActions() : {}),
      ...(this.tfActions ? this.tfActions() : {}),
    };
  }

  /* ================= RENDER ================= */
  renderScreen(){
    this.renderToasts();
    const sc = this.local.screen;
    let html = '';
    if(sc==='home') html = this.viewHome();
    else if(sc==='setup') html = this.viewSetup();
    else if(sc==='lobby') html = this.viewLobby();
    else if(sc==='round') html = this.viewRound();
    else if(sc==='wait') html = this.viewWait();
    else if(sc==='reveal') html = this.viewReveal();
    else if(sc==='score') html = this.viewScore();
    else if(sc==='ranking') html = this.viewRanking();
    else if(sc==='final') html = this.viewFinal();
    else if(sc==='tfWrite') html = this.viewTfWrite();
    else if(sc==='tfReview') html = this.viewTfReview();
    else if(sc==='tfRanking') html = this.viewTfRanking();
    else if(sc==='tfFinal') html = this.viewTfFinal();
    else if(sc==='dChoose') html = this.viewDChoose();
    else if(sc==='dDraw') html = this.viewDDraw();
    else if(sc==='dReveal') html = this.viewDReveal();
    else if(sc==='dRanking') html = this.viewDRanking();
    else if(sc==='dFinal') html = this.viewDFinal();
    else html = this.viewHome();

    this.root.innerHTML = html;
    this.renderModals();
    this.renderHud();

    if(sc==='lobby') this.startLobbyMusic(); else this.stopLobbyMusic();

    if(sc==='round'){
      this.later(()=>{ const el=this.root.querySelector('[data-role="word-input"][data-index="0"]'); if(el) el.focus({preventScroll:true}); }, 50);
      const left = this.state ? Math.max(0, Math.round((this.state.g.roundEndAt - Date.now())/1000)) : 0;
      this.patchTimer(left);
    }
    if(sc==='tfWrite' && !this.local.tfIntro){
      this.later(()=>{ const el=this.root.querySelector('[data-role="tf-input"][data-index="0"]'); if(el) el.focus({preventScroll:true}); }, 50);
      const left = this.state ? Math.max(0, Math.round((this.state.g.roundEndAt - Date.now())/1000)) : 0;
      this.tfPatchTimer(left);
    }
    if(sc==='dDraw'){
      if(this._dCleanup) this._dCleanup();
      this.dSetupCanvas();
      const left = this.state ? Math.max(0, Math.round((this.state.g.drawEndAt - Date.now())/1000)) : 0;
      this.dPatchTimer(left);
    }
    if(sc==='dChoose'){
      const left = this.state ? Math.max(0, Math.round((this.state.g.chooseEndAt - Date.now())/1000)) : 0;
      this.dPatchTimer(left);
    }
  }

  // Modal container is separate from the screen container so opening/closing
  // a modal never forces a full screen re-render (which would replay
  // entrance animations and could steal focus from inputs mid-round).
  renderModals(){
    this.modalRoot.innerHTML = this.viewModals();
  }

  viewModals(){
    let m = '';
    if(this.local.modal === 'how'){
      m += `<div class="modal-overlay" data-action="closeModal">
        <div class="modal" data-action="stop">
          <div class="heading" style="font-size:32px">Cómo funciona</div>
          ${this.howStep(1,YEL,'Creá una sala','Elegís tu nombre y armás tu personaje. Se genera un código de 5 letras.')}
          ${this.howStep(2,VIOLET,'Invitá a tus amigos','Les pasás el código para que se unan desde su celular.')}
          ${this.howStep(3,CORAL,'Elijan a qué jugar','Unánimo, Dibujalo, Tutti Frutti... el anfitrión elige, todos juegan.')}
          <button class="btn-primary" data-action="closeModal">¡ENTENDIDO!</button>
        </div>
      </div>`;
    }
    if(this.local.modal === 'leave'){
      m += `<div class="modal-overlay" data-action="closeModal">
        <div class="modal" data-action="stop" style="text-align:center">
          <div class="heading" style="font-size:28px">¿Salir de la partida?</div>
          <div style="font-size:16px;font-weight:600;color:var(--muted)">Vas a perder tus puntos y el resto seguirá sin vos.</div>
          <button class="btn-primary" data-action="closeModal">SEGUIR JUGANDO</button>
          <button style="width:100%;height:50px;border-radius:16px;border:0;background:transparent;color:var(--ink);font-weight:800;font-size:16px;text-decoration:underline" data-action="goHome">Salir</button>
        </div>
      </div>`;
    }
    if(this.local.showJoinName){
      m += `<div class="modal-overlay" data-action="closeModal">
        <div class="modal" data-action="stop">
          <div class="heading" style="font-size:28px">¿Cómo te llamás?</div>
          <input data-role="join-name" value="${esc(this.local.joinNameDraft)}" placeholder="Tu nombre" autocomplete="off"
            style="height:60px;border-radius:16px;border:2px solid var(--ink);background:#fff;padding:0 18px;font-family:'Figtree',sans-serif;font-weight:700;font-size:20px;color:var(--ink);outline:none" autofocus>
          ${this.avatarPicker(true)}
          <button class="btn-primary" data-action="confirmJoinName">UNIRME A LA SALA</button>
        </div>
      </div>`;
    }
    return m;
  }
  howStep(n,color,title,sub){
    return `<div style="display:flex;gap:14px;align-items:flex-start">
      <div style="flex:0 0 auto;width:40px;height:40px;border-radius:12px;background:${color};border:2px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${n}</div>
      <div style="display:flex;flex-direction:column;gap:2px"><div style="font-weight:800;font-size:17px">${title}</div><div style="font-size:15px;color:var(--muted);font-weight:600">${sub}</div></div>
    </div>`;
  }

  avatarPicker(compact){
    const av = this.local.avatar;
    const previewSize = compact ? 76 : 96;
    const rows = AVATAR_TRAITS.map(t=>{
      const idx = av[t.key] || 0;
      const valueLabel = t.names ? t.names[idx] : (idx+1)+'/'+t.count;
      return `<div style="padding:${compact?6:8}px 0;border-top:2px solid var(--panel-line)">
        <div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding-bottom:4px">${t.label}</div>
        <div style="display:flex;align-items:center;gap:10px">
          <button data-action="avatarPrev" data-trait="${t.key}" data-count="${t.count}" aria-label="${t.label} anterior" style="flex:0 0 auto;width:32px;height:32px;border-radius:10px;border:2px solid ${INK};background:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center">◀</button>
          <div style="flex:1;min-width:0;text-align:center;font-weight:800;font-size:14px;overflow-wrap:anywhere">${valueLabel}</div>
          <button data-action="avatarNext" data-trait="${t.key}" data-count="${t.count}" aria-label="${t.label} siguiente" style="flex:0 0 auto;width:32px;height:32px;border-radius:10px;border:2px solid ${INK};background:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center">▶</button>
        </div>
      </div>`;
    }).join('');
    return `<div style="display:flex;flex-direction:column;gap:2px">
      <div style="display:flex;align-items:center;gap:12px;padding-bottom:8px">
        <div style="width:${previewSize}px;height:${previewSize}px;flex:0 0 auto">${avatarSVG(av, previewSize)}</div>
        <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Armá tu personaje</div>
      </div>
      ${rows}
    </div>`;
  }
  refreshAvatarUI(){
    if(this.local.showJoinName) this.renderModals();
    else this.renderScreen();
  }

  viewHome(){
    const stickers = [
      {t:1,l:'7%',pos:'left',bg:CORAL,rot:-8,txt:'Mar'},
      {t:2,l:'7%',pos:'right',bg:'#fff',rot:6,txt:'Sol'},
      {t:3,b:'9%',pos:'left',bg:CORAL,rot:5,txt:'Mar'},
      {t:4,b:'13%',pos:'right',bg:'#fff',rot:-5,txt:'Helado'},
    ];
    return `<div style="position:relative;min-height:100vh;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px">
      <div style="position:absolute;inset:0;pointer-events:none">
        <div style="position:absolute;top:7%;left:6%;animation:float 5s ease-in-out infinite"><div style="padding:9px 16px;border-radius:18px 18px 18px 4px;background:${CORAL};border:2px solid ${INK};font-weight:800;font-size:16px;transform:rotate(-8deg)">Mar</div></div>
        <div style="position:absolute;top:11%;right:7%;animation:float 6s ease-in-out .8s infinite"><div style="padding:9px 16px;border-radius:18px 18px 4px 18px;background:#fff;border:2px solid ${INK};font-weight:800;font-size:16px;transform:rotate(6deg)">Sol</div></div>
        <div style="position:absolute;bottom:9%;left:9%;animation:float 5.5s ease-in-out .4s infinite"><div style="padding:9px 16px;border-radius:18px 18px 18px 4px;background:${CORAL};border:2px solid ${INK};font-weight:800;font-size:16px;transform:rotate(5deg)">Mar</div></div>
        <div style="position:absolute;bottom:13%;right:6%;animation:float 6.5s ease-in-out 1.2s infinite"><div style="padding:9px 16px;border-radius:18px 18px 4px 18px;background:#fff;border:2px solid ${INK};font-weight:800;font-size:16px;transform:rotate(-5deg)">Helado</div></div>
      </div>
      <div style="position:relative;width:100%;max-width:460px;display:flex;flex-direction:column;align-items:center;gap:32px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:18px">
          <div style="display:flex;gap:clamp(4px,1.2vw,8px)">
            ${['U','N','A','N','I','M','O'].map((ch,i)=>`<div style="animation:drop .6s cubic-bezier(.3,1.5,.5,1) ${(i*0.06).toFixed(2)}s both"><div style="width:clamp(42px,11.5vw,72px);height:clamp(52px,14vw,86px);border-radius:14px;background:${[CORAL,VIOLET,YEL,VIOLET,MINT,BLUE,PINK][i]};border:2.5px solid ${INK};box-shadow:0 5px 0 ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(28px,8vw,52px);transform:rotate(${[-6,4,-3,5,-4,3,-5][i]}deg)">${ch}</div></div>`).join('')}
          </div>
          <div class="heading" style="font-size:clamp(22px,6vw,28px);animation:rise .5s .5s both">Party games para jugar con amigos.</div>
        </div>
        <div style="width:100%;display:flex;flex-direction:column;gap:14px;animation:rise .5s .65s both">
          <button class="btn-primary" data-action="goSetup">CREAR SALA</button>
          <div style="display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:20px;background:#fff;border:2px solid var(--line)">
            <div style="font-size:14px;font-weight:700;color:var(--muted);padding-left:4px">¿Te pasaron un código?</div>
            <div style="display:flex;gap:10px">
              <input data-role="join-code" value="${esc(this.local.joinCode)}" placeholder="A7K9P" autocomplete="off"
                style="flex:1;min-width:0;height:56px;border-radius:16px;border:2px solid ${INK};background:#FFFDF8;padding:0 16px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;letter-spacing:.28em;color:${INK};outline:none">
              <button data-action="joinGame" style="flex:0 0 auto;height:56px;padding:0 20px;border-radius:16px;border:2px solid ${INK};background:${INK};color:var(--cream);font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:17px;letter-spacing:.04em">UNIRME</button>
            </div>
            ${this.local.joining?`<div style="display:flex;align-items:center;gap:8px;padding-top:4px"><div class="spinner"></div><span style="font-size:14px;font-weight:700;color:var(--muted)">Conectando…</span></div>`:''}
            ${this.local.joinError?`<div style="font-size:13px;font-weight:700;color:#B3341A">${esc(this.local.joinError)}</div>`:''}
          </div>
          <button class="btn-secondary" data-action="openHow">CÓMO JUGAR</button>
        </div>
      </div>
    </div>`;
  }

  viewSetup(){
    return `<div class="screen screen-narrow">
      <div class="top-bar"><button class="icon-btn" data-action="goHome" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Armá tu sala</div></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Tu nombre</div>
        <input data-role="cfg-name" value="${esc(this.local.cfgName)}" placeholder="¿Cómo te llamás?" style="height:60px;border-radius:16px;border:2px solid ${INK};background:#fff;padding:0 18px;font-family:'Figtree',sans-serif;font-weight:700;font-size:20px;color:${INK};outline:none">
      </div>
      <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:16px 18px">${this.avatarPicker()}</div>
      <div class="sticky-bottom">
        <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">Elegís a qué jugar una vez adentro, con todos.</div>
        <button class="btn-primary" data-action="createGame">CREAR SALA</button>
      </div>
    </div>`;
  }

  // --- lobby: room shell (code + players), always shown; below it either
  // the portal's game picker, a game's config screen, or (once a game is
  // chosen) that game's chips + start button — all without leaving 'lobby'.
  viewLobby(){
    const s = this.state, pl = this.players();
    if(this.isHost && this.local.hostFlow){
      if(this.local.hostFlow==='unanimo') return this.viewUnanimoConfig();
      if(this.local.hostFlow==='dibujalo') return this.viewDibujaloConfig ? this.viewDibujaloConfig() : this.viewComingSoonConfig('dibujalo');
      if(this.local.hostFlow==='tuttifrutti') return this.viewTfConfig ? this.viewTfConfig() : this.viewComingSoonConfig('tuttifrutti');
    }
    const hostId = s.hostId;
    const n = Math.max(6, pl.length);
    const codeChars = s.code.split('').map(c=>`<div style="width:clamp(48px,13vw,64px);height:clamp(58px,15vw,74px);border-radius:14px;background:#fff;border:2.5px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(30px,8vw,40px)">${c}</div>`).join('');
    const slots = Array.from({length:n},(_,i)=>{
      const p = pl[i];
      if(!p) return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:20px;border:2px dashed var(--dashed);animation:breathe 2s ease-in-out infinite"><div style="flex:0 0 auto;width:46px;height:46px;border-radius:50%;border:2px dashed var(--dashed)"></div><div style="font-size:15px;font-weight:700;color:var(--muted)">Esperando…</div></div>`;
      const tag = p.id===this.myId ? (p.id===hostId?'Vos · Anfitrión':'Vos') : (p.id===hostId?'Anfitrión':'Listo para jugar');
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:20px;background:#fff;border:2px solid ${INK};box-shadow:0 3px 0 ${INK};animation:pop .45s cubic-bezier(.3,1.5,.5,1) both">
        <div style="width:46px;height:46px;flex:0 0 auto">${avatarSVG(p.avatar,46)}</div>
        <div style="min-width:0;display:flex;flex-direction:column;gap:1px"><div style="font-weight:800;font-size:17px;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div><div style="font-size:13px;font-weight:600;color:var(--muted)">${tag}</div></div>
      </div>`;
    }).join('');

    let lowerSection;
    if(!s.gameId){
      lowerSection = this.isHost ? this.viewGamePicker() : `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:24px 0">
          <div style="font-size:34px">🎮</div>
          <div class="heading" style="font-size:20px">${esc(this.playerById(hostId)?.name||'El anfitrión')} está eligiendo el juego…</div>
          <div style="font-size:14px;font-weight:600;color:var(--muted)">Ya te avisamos apenas arranque.</div>
        </div>`;
    } else {
      const meta = gameMeta(s.gameId);
      const chips = this.gameConfigChips(s.gameId, s.gameConfig);
      const minOk = pl.length >= (meta?.min||2);
      const canStart = this.isHost && minOk;
      const bottom = this.isHost
        ? (canStart ? `<button class="btn-primary" data-action="startGame">COMENZAR ${esc(meta.name.toUpperCase())}</button>`
          : `<div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">Se necesitan al menos ${meta.min} jugadores</div><button class="btn-primary" disabled>COMENZAR ${esc(meta.name.toUpperCase())}</button>`)
        : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(hostId)?.name||'El anfitrión')} va a comenzar<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
      lowerSection = `
        <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:20px;background:#fff;border:2px solid ${INK}">
          <div style="width:40px;height:40px;border-radius:12px;background:${meta.colors[0]};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${meta.letters[0]}</div>
          <div style="flex:1;min-width:0"><div class="heading" style="font-size:19px">${esc(meta.name)}</div><div style="font-size:13px;font-weight:600;color:var(--muted)">${esc(meta.tagline)}</div></div>
          ${this.isHost?`<button data-action="pickGame" data-game="${s.gameId}" aria-label="Cambiar configuración" style="flex:0 0 auto;height:38px;padding:0 14px;border-radius:12px;border:2px solid ${INK};background:var(--cream);font-weight:800;font-size:13px">Editar</button>`:''}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${chips}</div>
        <div class="sticky-bottom">${bottom}</div>`;
    }

    return `<div class="screen">
      <div class="top-bar"><button class="icon-btn" data-action="askLeave" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Lobby</div></div>
      <div style="background:${YEL};border:2.5px solid ${INK};border-radius:28px;box-shadow:0 6px 0 ${INK};padding:22px 20px;display:flex;flex-direction:column;align-items:center;gap:16px">
        <div style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">Código de la partida</div>
        <div style="display:flex;gap:8px">${codeChars}</div>
        <button data-action="copyCode" style="height:48px;padding:0 20px;border-radius:14px;border:2px solid ${INK};background:${INK};color:var(--cream);display:flex;align-items:center;gap:10px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px;letter-spacing:.05em">${this.iconCopy()}COPIAR CÓDIGO</button>
      </div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px">
        <div class="heading" style="font-size:22px">Jugadores</div>
        <div class="heading" style="font-size:22px">${pl.length}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">${slots}</div>
      <div style="display:flex;flex-direction:column;gap:14px">${lowerSection}</div>
    </div>`;
  }

  gameConfigChips(gameId, cfg){
    if(!cfg) return '';
    let items = [];
    if(gameId==='unanimo') items = [cfg.rounds+(cfg.rounds===1?' ronda':' rondas'), cfg.words+' palabras', cfg.time+' s por ronda'];
    else if(gameId==='dibujalo') items = [cfg.rounds+(cfg.rounds===1?' ronda':' rondas'), cfg.chooseTime+'s para elegir', cfg.drawTime+'s para dibujar'];
    else if(gameId==='tuttifrutti') items = [cfg.rounds+(cfg.rounds===1?' ronda':' rondas'), cfg.categories.length+' categorías', cfg.time+'s por ronda'];
    return items.map(t=>`<div style="padding:8px 14px;border-radius:999px;background:#fff;border:2px solid var(--line);font-size:14px;font-weight:700">${esc(t)}</div>`).join('');
  }

  viewGamePicker(){
    const cards = GAMES.map(g=>`
      <button data-action="pickGame" data-game="${g.id}" style="display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;border-radius:22px;background:#fff;border:2.5px solid ${INK};box-shadow:0 4px 0 ${INK};text-align:left;transition:transform .08s,box-shadow .08s" style-active="transform:translateY(3px);box-shadow:0 1px 0 ${INK}">
        <div style="display:flex;gap:4px;flex:0 0 auto">
          <div style="width:40px;height:48px;border-radius:12px;background:${g.colors[0]};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;transform:rotate(-4deg)">${g.letters[0]}</div>
          <div style="width:40px;height:48px;border-radius:12px;background:${g.colors[1]};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;transform:rotate(4deg)">${g.letters[1]}</div>
        </div>
        <div style="flex:1;min-width:0"><div class="heading" style="font-size:20px">${esc(g.name)}</div><div style="font-size:13px;font-weight:600;color:var(--muted)">${esc(g.tagline)}</div></div>
        <div style="flex:0 0 auto;font-size:22px">▶</div>
      </button>`).join('');
    return `<div style="display:flex;flex-direction:column;gap:10px">
      <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:0 4px">¿A qué jugamos?</div>
      ${cards}
    </div>`;
  }
  viewComingSoonConfig(gameId){
    const meta = gameMeta(gameId);
    return `<div class="screen screen-narrow">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">${esc(meta.name)}</div></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:40px 0">
        <div style="font-size:40px">🚧</div>
        <div class="heading" style="font-size:20px">Muy pronto</div>
      </div>
    </div>`;
  }
  viewUnanimoConfig(){
    const cfg = this.uDraft;
    const roundOpts = [1,2,3,4,5].map(n=>`<button data-action="setRounds" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.rounds===n?INK:'#fff'};color:${cfg.rounds===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${n}</button>`).join('');
    const timeOpts = [30,45,60,90].map(n=>`<button data-action="setTime" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.time===n?INK:'#fff'};color:${cfg.time===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${n}s</button>`).join('');
    const estimate = '≈ '+Math.max(1,Math.round(cfg.rounds*(cfg.time+35)/60))+' min de juego';
    return `<div class="screen screen-narrow">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Unánimo</div></div>
      <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:6px 18px;display:flex;flex-direction:column">
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="font-weight:800;font-size:17px">Rondas</div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${roundOpts}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="display:flex;flex-direction:column;gap:2px"><div style="font-weight:800;font-size:17px">Palabras por ronda</div><div style="font-size:14px;color:var(--muted)">Cuántas escribe cada uno</div></div>
          <div style="display:flex;align-items:center;gap:10px">
            <button data-action="decWords" aria-label="Menos" style="width:44px;height:44px;border-radius:14px;border:2px solid ${INK};background:var(--cream);font-size:24px;font-weight:800;color:${INK}">−</button>
            <div style="width:36px;text-align:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px">${cfg.words}</div>
            <button data-action="incWords" aria-label="Más" style="width:44px;height:44px;border-radius:14px;border:2px solid ${INK};background:var(--cream);font-size:24px;font-weight:800;color:${INK}">+</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0">
          <div style="font-weight:800;font-size:17px">Tiempo para responder</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${timeOpts}</div>
        </div>
      </div>
      <div class="sticky-bottom">
        <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">${estimate}</div>
        <button class="btn-primary" data-action="confirmUnanimoConfig">LISTO, VOLVER AL LOBBY</button>
      </div>
    </div>`;
  }

  /* ================= TUTTI FRUTTI — screens ================= */
  viewTfConfig(){
    const cfg = this.tfDraft;
    const roundOpts = [3,4,5,6,7,8].map(n=>`<button data-action="tfSetRounds" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.rounds===n?INK:'#fff'};color:${cfg.rounds===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${n}</button>`).join('');
    const timeOpts = [30,45,60,90,120].map(n=>`<button data-action="tfSetTime" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.time===n?INK:'#fff'};color:${cfg.time===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${n}s</button>`).join('');
    const catChips = TUTTI_CATEGORIES.map(c=>{
      const on = cfg.categories.includes(c.id);
      return `<button data-action="tfToggleCategory" data-cat="${c.id}" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;border:2px solid ${INK};background:${on?MINT:'#fff'};font-weight:800;font-size:14px">${c.icon} ${esc(c.label)}</button>`;
    }).join('');
    const estimate = '≈ '+Math.max(1,Math.round(cfg.rounds*(cfg.time+40)/60))+' min de juego';
    return `<div class="screen screen-narrow">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Tutti Frutti</div></div>
      <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:6px 18px;display:flex;flex-direction:column">
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="font-weight:800;font-size:17px">Rondas</div>
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${roundOpts}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="font-weight:800;font-size:17px">Tiempo por ronda</div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${timeOpts}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="display:flex;align-items:baseline;justify-content:space-between"><div style="font-weight:800;font-size:17px">Categorías</div><div style="font-size:13px;font-weight:700;color:var(--muted)">${cfg.categories.length} elegidas</div></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${catChips}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0">
          <div style="display:flex;flex-direction:column;gap:2px"><div style="font-weight:800;font-size:17px">Letras difíciles</div><div style="font-size:14px;color:var(--muted)">Incluye K, Ñ y otras poco comunes</div></div>
          <button data-action="tfToggleHard" style="width:56px;height:32px;border-radius:999px;border:2px solid ${INK};background:${cfg.hard?MINT:'#F1E7D8'};position:relative;flex:0 0 auto"><span style="position:absolute;top:2px;left:${cfg.hard?'26px':'2px'};width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${INK};transition:left .15s"></span></button>
        </div>
      </div>
      <div class="sticky-bottom">
        <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">${estimate}</div>
        <button class="btn-primary" data-action="confirmTfConfig">LISTO, VOLVER AL LOBBY</button>
      </div>
    </div>`;
  }

  viewTfWrite(){
    const s = this.state, cfg = s.gameConfig;
    if(this.local.tfIntro){
      return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:20px">
        <div style="font-size:15px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">RONDA ${s.g.round+1}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px;letter-spacing:.1em;text-transform:uppercase;animation:rise .3s both">¡LETRA!</div>
        <div style="width:160px;height:160px;border-radius:32px;background:${YEL};border:3px solid ${INK};box-shadow:0 8px 0 ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:96px;animation:pop .5s cubic-bezier(.3,1.6,.5,1) both">${esc(s.g.letter)}</div>
      </div>`;
    }
    const fields = (cfg.categories||[]).map((catId,i)=>{
      const cat = TUTTI_CATEGORIES.find(c=>c.id===catId);
      const v = this.local.tfInputs[catId] || '';
      return `<div style="position:relative;display:flex;align-items:center">
        <div style="position:absolute;left:13px;width:32px;height:32px;border-radius:10px;background:${v?MINT:'#F1E7D8'};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-size:16px;pointer-events:none">${cat?cat.icon:'❔'}</div>
        <input class="field-input" data-role="tf-input" data-cat="${catId}" data-index="${i}" value="${esc(v)}" placeholder="${cat?cat.label:catId}" autocomplete="off" enterkeyhint="next" style="border-color:${v?INK:'#DCCFBC'}">
      </div>`;
    }).join('');
    return `<div style="min-height:100vh;display:flex;flex-direction:column">
      <div style="position:sticky;top:0;z-index:10;background:var(--cream)">
        <div style="max-width:1080px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:12px">
          <button class="icon-btn" data-action="askLeave" aria-label="Salir">${this.iconClose()}</button>
          <div style="flex:1;min-width:0;display:flex;align-items:baseline;gap:6px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800"><span style="font-size:22px">RONDA ${s.g.round+1}</span><span style="font-size:16px;color:var(--muted)">de ${cfg.rounds}</span></div>
          <div data-el="tfTimerBox" style="display:flex;align-items:center;gap:8px;height:50px;padding:0 16px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;font-variant-numeric:tabular-nums">${this.iconClock()}<span data-el="tfTimerText">${mmss(cfg.time)}</span></div>
        </div>
        <div style="height:6px;background:var(--line)"><div data-el="tfTimerBar" style="height:100%;width:100%;background:${INK};transition:width 1s linear,background .3s"></div></div>
      </div>
      <div style="flex:1;width:100%;max-width:560px;margin:0 auto;padding:20px 20px 0;display:flex;flex-direction:column;gap:14px">
        <div style="background:${YEL};border:2.5px solid ${INK};border-radius:24px;box-shadow:0 5px 0 ${INK};padding:16px;display:flex;align-items:center;justify-content:center;gap:14px">
          <div style="font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Letra</div>
          <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:44px;line-height:1">${esc(s.g.letter)}</div>
        </div>
        ${fields}
        <div class="sticky-bottom" style="margin:0 -20px;padding:16px 20px 20px">
          <button class="btn-primary" data-action="tfPressStop" style="height:66px;font-size:26px;background:${CORAL}">🛑 STOP</button>
        </div>
      </div>
    </div>`;
  }

  viewTfReview(){
    const s = this.state, cfg = s.gameConfig, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const r = s.g.round;
    const pts = this.tfPoints(r);
    const doneCount = Object.keys(s.g.done[r]||{}).length;
    const catBlocks = (cfg.categories||[]).map(catId=>{
      const cat = TUTTI_CATEGORIES.find(c=>c.id===catId);
      const rows = pl.map(p=>{
        const item = pts[p.id].items.find(it=>it.cat===catId);
        if(!item || !item.text) return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;opacity:.5">
          <div style="width:28px;height:28px;flex:0 0 auto">${avatarSVG(p.avatar,28)}</div>
          <div style="flex:1;font-size:14px;font-weight:700;font-style:italic;color:var(--muted)">Sin respuesta</div>
        </div>`;
        const flagKey = catId+'|'+p.id;
        const flags = (s.g.flags[r]||{})[flagKey]||[];
        const flaggedByMe = flags.includes(this.myId);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0">
          <div style="width:28px;height:28px;flex:0 0 auto">${avatarSVG(p.avatar,28)}</div>
          <div style="flex:1;min-width:0;font-weight:800;font-size:16px;overflow-wrap:anywhere">${esc(disp(item.text))} <span style="font-weight:600;font-size:12px;color:var(--muted)">— ${esc(p.name)}</span></div>
          <div style="flex:0 0 auto;padding:3px 9px;border-radius:999px;background:${item.valid?MINT:'var(--dup-bg)'};border:2px solid ${INK};font-weight:800;font-size:12px">${item.valid?'+'+item.pts:'✕'}</div>
          ${p.id!==this.myId?`<button data-action="tfFlag" data-cat="${catId}" data-pid="${p.id}" aria-label="Marcar inválida" style="flex:0 0 auto;width:28px;height:28px;border-radius:8px;border:2px solid ${flaggedByMe?CORAL:'var(--line)'};background:${flaggedByMe?'#FFEDE6':'#fff'};font-size:13px">🚩</button>`:''}
        </div>`;
      }).join('');
      return `<div class="card" style="padding:14px 16px">
        <div style="font-weight:800;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding-bottom:6px">${cat?cat.icon+' '+cat.label:catId}</div>
        ${rows}
      </div>`;
    }).join('');
    const totalsRow = pl.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:#fff;border:2px solid ${INK}"><div style="width:22px;height:22px;flex:0 0 auto">${avatarSVG(p.avatar,22)}</div><span style="font-weight:800;font-size:14px">${esc(p.name)}: +${pts[p.id].total}</span></div>`).join('');
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="goRanking">VER CLASIFICACIÓN</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Revisando respuestas… (${doneCount}/${pl.length})</div>`;
    return `<div class="screen screen-wide">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">¿QUÉ PUSIERON?</div>
        <div style="padding:8px 22px;border-radius:18px;background:${YEL};border:2.5px solid ${INK};box-shadow:0 4px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:36px">${esc(s.g.letter)}</div>
        <div style="font-size:13px;font-weight:700;color:var(--muted)">Tocá 🚩 si te parece que una respuesta no vale</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${totalsRow}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">${catBlocks}</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }

  viewTfRanking(){
    const s = this.state, cfg = s.gameConfig, pl = this.players();
    const cur = this.tfTotals(s.g.round), prevT = s.g.round>0 ? this.tfTotals(s.g.round-1) : null;
    const nr = this.rankOf(cur), orr = prevT ? this.rankOf(prevT) : nr;
    const ph = this.local.rankPhase===1;
    const rows = pl.map(p=>{
      const ni = nr.indexOf(p.id), oi = orr.indexOf(p.id), idx = ph?ni:oi, d = oi-ni;
      const label = p.id===this.myId ? p.name+' (vos)' : p.name;
      const total = ph ? cur[p.id] : (prevT ? prevT[p.id] : 0);
      const bg = p.id===this.myId ? '#FFEDE6' : (idx===0 && ph ? '#FFF3CC' : '#fff');
      const deltaText = d>0?'▲ Subió '+d : d<0?'▼ Bajó '+(-d) : 'Mantiene el puesto';
      const deltaColor = d>0?'#0E8A66':d<0?'#B3341A':'var(--muted)';
      return `<div style="position:absolute;left:0;right:0;top:${idx*86}px;height:72px;display:flex;align-items:center;gap:12px;padding:0 16px 0 10px;border-radius:22px;background:${bg};border:2px solid ${INK};box-shadow:0 4px 0 ${INK};transition:top .9s cubic-bezier(.34,1.45,.64,1)">
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
      ? `<button class="btn-primary" data-action="nextRound">${isLast?'VER RESULTADO FINAL':'SIGUIENTE RONDA'}</button>`
      : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(s.hostId)?.name||'El anfitrión')} va a continuar<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
    return `<div class="screen">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(36px,10vw,52px);letter-spacing:-.02em;line-height:1">CLASIFICACIÓN</div>
        <div style="font-size:16px;font-weight:700;color:var(--muted)">Después de la ronda ${s.g.round+1} de ${cfg.rounds}</div>
      </div>
      <div style="display:flex;gap:6px;justify-content:center">${dots}</div>
      <div style="position:relative;height:${pl.length*86}px">${rows}</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }

  viewTfFinal(){
    const s = this.state, cfg = s.gameConfig, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const tot = this.tfTotals(cfg.rounds-1);
    const nr = this.rankOf(tot);
    const w = byId[nr[0]];
    const winnerTitle = w.id===this.myId ? '¡GANASTE, '+w.name.toUpperCase()+'!' : w.name.toUpperCase()+' GANÓ';
    const pod = [1,0,2].filter(i=>nr[i]);
    const H=['170px','124px','92px'], PBG=[YEL,'#E4DEF5','#F6BE9E'];
    const podium = pod.map((i)=>{
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
    const finalRows = nr.map((id,i)=>{
      const label = id===this.myId ? byId[id].name+' (vos)' : byId[id].name;
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:${i<nr.length-1?'2px solid var(--panel-line)':'0'}">
        <div style="width:28px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${i+1}</div>
        <div style="width:38px;height:38px;flex:0 0 auto">${avatarSVG(byId[id].avatar,38)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:17px">${esc(label)}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${tot[id]} pts</div>
      </div>`;
    }).join('');

    // stats
    let bestRound = null, uniqueCount={}, sharedCount={}, stopCount={}, fastestStop=null;
    pl.forEach(p=>{ uniqueCount[p.id]=0; sharedCount[p.id]=0; stopCount[p.id]=0; });
    for(let r=0;r<cfg.rounds;r++){
      if(!s.g.answers[r]) continue;
      const pts = this.tfPoints(r);
      pl.forEach(p=>{
        const rt = pts[p.id].total;
        if(!bestRound || rt>bestRound.pts) bestRound = {pid:p.id, pts:rt, r};
        pts[p.id].items.forEach(it=>{ if(it.pts===10) uniqueCount[p.id]++; if(it.pts===5) sharedCount[p.id]++; });
      });
      const sb = s.g.stoppedBy[r];
      if(sb) stopCount[sb] = (stopCount[sb]||0)+1;
      if(sb && s.g.stopMs[r]!=null && (!fastestStop || s.g.stopMs[r]<fastestStop.ms)) fastestStop = {pid:sb, ms:s.g.stopMs[r]};
    }
    const topBy = (obj)=>Object.entries(obj).sort((a,b)=>b[1]-a[1])[0];
    const uniqueTop = topBy(uniqueCount), sharedTop = topBy(sharedCount), stopTop = topBy(stopCount);
    const stats = [
      bestRound && {label:'Mayor puntuación en una ronda', value:(byId[bestRound.pid]?.name||'?')+' · +'+bestRound.pts, sub:'Ronda '+(bestRound.r+1), bg:CORAL},
      fastestStop && {label:'STOP más rápido', value:(byId[fastestStop.pid]?.name||'?'), sub:(fastestStop.ms/1000).toFixed(1)+'s', bg:YEL},
      uniqueTop && uniqueTop[1]>0 && {label:'Más respuestas únicas', value:(byId[uniqueTop[0]]?.name||'?'), sub:uniqueTop[1]+' únicas (+10 c/u)', bg:VIOLET},
      sharedTop && sharedTop[1]>0 && {label:'Más respuestas coincidentes', value:(byId[sharedTop[0]]?.name||'?'), sub:sharedTop[1]+' compartidas', bg:MINT},
      stopTop && stopTop[1]>0 && {label:'Más veces gritó STOP', value:(byId[stopTop[0]]?.name||'?'), sub:stopTop[1]+' rondas', bg:BLUE},
    ].filter(Boolean).map((x,i)=>({...x, delay:(0.5+i*0.1)+'s'}));
    const statsHtml = stats.map(x=>`<div style="background:${x.bg};border:2px solid ${INK};border-radius:22px;box-shadow:0 4px 0 ${INK};padding:16px;display:flex;flex-direction:column;gap:6px;animation:rise .5s both;animation-delay:${x.delay}">
      <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">${esc(x.label)}</div>
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;line-height:1.05;overflow-wrap:anywhere">${esc(x.value)}</div>
      <div style="font-size:14px;font-weight:700">${esc(x.sub)}</div>
    </div>`).join('');
    const confettiHtml = this.confetti.map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} infinite"></div>`).join('');
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando a ${esc(this.playerById(s.hostId)?.name||'el anfitrión')}…</div>`;
    return `<div style="position:relative;min-height:100vh;overflow:hidden">
      <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confettiHtml}</div>
      <div style="position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
          <div class="heading" style="font-size:clamp(40px,12vw,84px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${esc(winnerTitle)}</div>
          <div class="heading" style="font-size:24px">${tot[w.id]} puntos</div>
        </div>
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px">${podium}</div>
        <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:-28px">
          <div style="flex:1 1 320px;min-width:0;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:8px 18px">${finalRows}</div>
          <div style="flex:1 1 420px;min-width:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">${statsHtml}</div>
        </div>
        <div class="sticky-bottom">
          <div style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:12px">${bottom}</div>
        </div>
      </div>
    </div>`;
  }

  /* ================= DIBUJALO — screens ================= */
  viewDibujaloConfig(){
    const cfg = this.dDraft;
    const roundOpts = [3,4,5,6,8,10].map(n=>`<button data-action="dSetRounds" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.rounds===n?INK:'#fff'};color:${cfg.rounds===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${n}</button>`).join('');
    const chooseOpts = [8,10,15,20].map(n=>`<button data-action="dSetChooseTime" data-val="${n}" style="height:44px;border-radius:14px;border:2px solid ${INK};background:${cfg.chooseTime===n?INK:'#fff'};color:${cfg.chooseTime===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${n}s</button>`).join('');
    const drawOpts = [40,60,80,100].map(n=>`<button data-action="dSetDrawTime" data-val="${n}" style="height:44px;border-radius:14px;border:2px solid ${INK};background:${cfg.drawTime===n?INK:'#fff'};color:${cfg.drawTime===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${n}s</button>`).join('');
    const catChips = Object.keys(DIBUJALO_BANK).map(cat=>{
      const on = cfg.categories.includes(cat);
      return `<button data-action="dToggleCategory" data-cat="${cat}" style="padding:10px 14px;border-radius:14px;border:2px solid ${INK};background:${on?MINT:'#fff'};font-weight:800;font-size:14px">${esc(cat)}</button>`;
    }).join('');
    const estimate = '≈ '+Math.max(1,Math.round(cfg.rounds*(cfg.drawTime+cfg.chooseTime+15)/60))+' min de juego';
    return `<div class="screen screen-narrow">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Dibujalo</div></div>
      <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:6px 18px;display:flex;flex-direction:column">
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="font-weight:800;font-size:17px">Rondas</div>
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${roundOpts}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="font-weight:800;font-size:17px">Tiempo para elegir palabra</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${chooseOpts}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="font-weight:800;font-size:17px">Tiempo para dibujar</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${drawOpts}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="font-weight:800;font-size:17px">Categorías</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${catChips}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0">
          <div style="display:flex;flex-direction:column;gap:2px"><div style="font-weight:800;font-size:17px">Pistas</div><div style="font-size:14px;color:var(--muted)">Revela la categoría a los 30s si nadie adivinó</div></div>
          <button data-action="dToggleHints" style="width:56px;height:32px;border-radius:999px;border:2px solid ${INK};background:${cfg.hints?MINT:'#F1E7D8'};position:relative;flex:0 0 auto"><span style="position:absolute;top:2px;left:${cfg.hints?'26px':'2px'};width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${INK};transition:left .15s"></span></button>
        </div>
      </div>
      <div class="sticky-bottom">
        <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">${estimate}</div>
        <button class="btn-primary" data-action="confirmDibujaloConfig">LISTO, VOLVER AL LOBBY</button>
      </div>
    </div>`;
  }

  viewDChoose(){
    const s = this.state, pl = this.players(), drawerId = s.g.drawerOf[s.g.round];
    const drawer = this.playerById(drawerId);
    const isMe = drawerId === this.myId;
    const timerChip = `<div data-el="dTimerBox" style="display:flex;align-items:center;gap:8px;height:50px;padding:0 16px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px">${this.iconClock()}<span data-el="dTimerText">${mmss(this.state.gameConfig.chooseTime)}</span></div>`;
    if(!isMe){
      return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:20px">
        <div style="width:64px;height:64px;flex:0 0 auto">${avatarSVG(drawer&&drawer.avatar,64)}</div>
        <div class="heading" style="font-size:22px">🎨 ${esc(drawer?drawer.name.toUpperCase():'?')} ESTÁ ELIGIENDO...</div>
        ${timerChip}
      </div>`;
    }
    const opts = this.local.dOptions;
    if(!opts){
      return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:20px"><div class="spinner"></div><div style="font-weight:700;color:var(--muted)">Preparando tus opciones…</div></div>`;
    }
    const cards = opts.map((o,i)=>`<button data-action="dChooseOption" data-i="${i}" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 14px;border-radius:22px;background:#fff;border:2.5px solid ${INK};box-shadow:0 5px 0 ${INK};transition:transform .08s,box-shadow .08s" style-active="transform:translateY(4px);box-shadow:0 1px 0 ${INK}">
      <div style="font-size:40px">${o.emoji||'🎨'}</div>
      <div class="heading" style="font-size:20px;text-align:center">${esc(o.word.toUpperCase())}</div>
      <div style="font-size:12px;font-weight:700;color:var(--muted)">${esc(o.category)}</div>
    </button>`).join('');
    return `<div class="screen screen-narrow">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding-top:10px">
        <div style="font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">🎨 Elegí qué dibujar</div>
        ${timerChip}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">${cards}</div>
    </div>`;
  }

  viewDDraw(){
    const s = this.state, cfg = s.gameConfig, pl = this.players();
    const r = s.g.round;
    const drawerId = s.g.drawerOf[r];
    const isMe = drawerId === this.myId;
    const drawer = this.playerById(drawerId);
    const already = (s.g.correctOrder[r]||[]).some(e=>e.id===this.myId);
    const guessersTotal = pl.length-1;
    const correctCount = (s.g.correctOrder[r]||[]).length;
    const colors = [INK, CORAL, YEL, MINT, VIOLET, BLUE, PINK, '#fff'];
    const colorBtns = colors.map(c=>`<button data-action="dSetColor" data-color="${c}" data-el="dColorBtn" aria-label="Color" style="width:30px;height:30px;border-radius:50%;background:${c};border:2px solid ${INK};box-shadow:${c===this.local.dColor&&this.local.dTool==='brush'?`0 0 0 3px #fff, 0 0 0 5px ${INK}`:'none'};flex:0 0 auto"></button>`).join('');
    const sizeBtns = [3,6,12].map(sz=>`<button data-action="dSetSize" data-size="${sz}" data-el="dSizeBtn" style="width:34px;height:34px;border-radius:10px;border:2px solid ${INK};background:${sz===this.local.dSize?INK:'#fff'};color:${sz===this.local.dSize?'var(--cream)':INK};display:flex;align-items:center;justify-content:center"><span style="width:${sz}px;height:${sz}px;border-radius:50%;background:currentColor"></span></button>`).join('');
    const hintChip = (s.g.hintUsed[r] && !isMe) ? `<div style="padding:6px 14px;border-radius:999px;background:${YEL};border:2px solid ${INK};font-weight:800;font-size:13px">💡 ${esc(s.g.category[r]||'')}</div>` : '';
    const toolbar = isMe ? `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px;background:#fff;border:2px solid ${INK};border-radius:16px">
        <div style="display:flex;gap:6px;flex-wrap:wrap">${colorBtns}</div>
        <div style="width:2px;height:24px;background:var(--line)"></div>
        <div style="display:flex;gap:6px">${sizeBtns}</div>
        <div style="width:2px;height:24px;background:var(--line)"></div>
        <button data-action="dSetTool" data-tool="eraser" data-el="dEraserBtn" style="height:34px;padding:0 12px;border-radius:10px;border:2px solid ${INK};background:${this.local.dTool==='eraser'?INK:'#fff'};color:${this.local.dTool==='eraser'?'var(--cream)':INK};font-weight:800;font-size:13px">🧽</button>
        <button data-action="dClearCanvas" style="height:34px;padding:0 12px;border-radius:10px;border:2px solid ${INK};background:#fff;font-weight:800;font-size:13px">🗑️</button>
      </div>` : '';
    const guessArea = isMe
      ? `<div style="text-align:center;font-size:13px;font-weight:700;color:var(--muted)">Mirá cómo va la adivinanza mientras dibujás 👀</div>`
      : already
        ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:16px;background:${MINT};border:2px solid ${INK};font-weight:800;font-size:16px">✓ ¡ACERTASTE!</div>`
        : `<div style="display:flex;gap:8px">
            <input data-role="d-guess-input" value="${esc(this.local.dGuessDraft)}" placeholder="¿Qué es?" autocomplete="off" style="flex:1;min-width:0;height:52px;border-radius:16px;border:2px solid ${INK};background:#fff;padding:0 16px;font-size:17px;font-weight:700;color:${INK};outline:none">
            <button data-action="dSendGuess" style="flex:0 0 auto;height:52px;padding:0 22px;border-radius:16px;border:2px solid ${INK};background:${CORAL};font-weight:800;font-size:16px">ADIVINAR</button>
          </div>`;
    return `<div style="min-height:100vh;display:flex;flex-direction:column">
      <div style="position:sticky;top:0;z-index:10;background:var(--cream)">
        <div style="max-width:1080px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:12px">
          <button class="icon-btn" data-action="askLeave" aria-label="Salir">${this.iconClose()}</button>
          <div style="flex:1;min-width:0;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${isMe?'🎨 Estás dibujando':'🎨 '+esc(drawer?drawer.name:'?')+' está dibujando'}</div>
          <div data-el="dTimerBox" style="display:flex;align-items:center;gap:8px;height:46px;padding:0 14px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px">${this.iconClock()}<span data-el="dTimerText">${mmss(cfg.drawTime)}</span></div>
        </div>
      </div>
      <div style="flex:1;width:100%;max-width:1080px;margin:0 auto;padding:16px 20px 20px;display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start">
        <div style="flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:10px">
          ${isMe?`<div style="background:${YEL};border:2px solid ${INK};border-radius:16px;padding:10px 14px;text-align:center"><span style="font-weight:800;font-size:15px">TU PALABRA ES: ${esc((this.local.dChosenWord||'').toUpperCase())}</span><div style="font-size:12px;font-weight:700;color:var(--muted)">No la muestres.</div></div>`:''}
          ${hintChip}
          <canvas id="dCanvas" width="640" height="440" style="width:100%;height:auto;aspect-ratio:640/440;background:#fff;border:2.5px solid ${INK};border-radius:20px;box-shadow:0 5px 0 ${INK};cursor:${isMe?'crosshair':'default'}"></canvas>
          ${toolbar}
        </div>
        <div style="flex:1 1 280px;min-width:0;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px">
            <div class="heading" style="font-size:17px">Adivinanzas</div>
            <div style="font-size:14px;font-weight:800;color:var(--muted)"><span data-el="dCorrectCount">${correctCount} / ${guessersTotal}</span> acertaron</div>
          </div>
          <div class="card" style="padding:10px 14px">${this.dGuessFeedHtml()}</div>
          ${guessArea}
        </div>
      </div>
    </div>`;
  }

  viewDReveal(){
    const s = this.state, r = s.g.round, pl = this.players(), byId={}; pl.forEach(p=>byId[p.id]=p);
    const drawerId = s.g.drawerOf[r];
    const pts = this.dPoints(r);
    const order = s.g.correctOrder[r]||[];
    const nobodyGuessed = order.length===0;
    const rows = pl.slice().sort((a,b)=>(pts[b.id]||0)-(pts[a.id]||0)).map((p,i)=>{
      const rankIdx = order.findIndex(e=>e.id===p.id);
      const tag = p.id===drawerId ? 'Dibujante' : rankIdx>=0 ? (rankIdx+1)+'.º en adivinar' : 'No adivinó';
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:18px;background:#fff;border:2px solid ${INK}">
        <div style="width:38px;height:38px;flex:0 0 auto">${avatarSVG(p.avatar,38)}</div>
        <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:16px">${esc(p.name)}</div><div style="font-size:12px;font-weight:700;color:var(--muted)">${tag}</div></div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">+${pts[p.id]||0}</div>
      </div>`;
    }).join('');
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="goRanking">VER PUNTOS</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando al anfitrión…</div>`;
    return `<div class="screen screen-narrow">
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center">
        <div style="font-size:14px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${nobodyGuessed?'😭 NADIE LO ADIVINÓ':'🎉 ¡SE ACABÓ LA RONDA!'}</div>
        <div style="font-size:13px;font-weight:700;color:var(--muted)">LA PALABRA ERA</div>
        <div style="padding:10px 26px;border-radius:20px;background:${YEL};border:2.5px solid ${INK};box-shadow:0 5px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(32px,9vw,48px)">${esc((s.g.word[r]||'').toUpperCase())}</div>
        ${nobodyGuessed?`<div style="font-size:14px;font-weight:700;color:var(--muted);font-style:italic">${esc(dibujaloFunnyLine())}</div>`:''}
      </div>
      ${this.local.dFinalImage?`<img src="${this.local.dFinalImage}" style="width:100%;border-radius:20px;border:2.5px solid ${INK};box-shadow:0 5px 0 ${INK}">`:''}
      <div style="display:flex;flex-direction:column;gap:8px">${rows}</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }

  viewDRanking(){
    const s = this.state, cfg = s.gameConfig, pl = this.players();
    const cur = this.dTotals(s.g.round), prevT = s.g.round>0 ? this.dTotals(s.g.round-1) : null;
    const nr = this.rankOf(cur), orr = prevT ? this.rankOf(prevT) : nr;
    const ph = this.local.rankPhase===1;
    const rows = pl.map(p=>{
      const ni = nr.indexOf(p.id), oi = orr.indexOf(p.id), idx = ph?ni:oi, d = oi-ni;
      const label = p.id===this.myId ? p.name+' (vos)' : p.name;
      const total = ph ? cur[p.id] : (prevT ? prevT[p.id] : 0);
      const bg = p.id===this.myId ? '#FFEDE6' : (idx===0 && ph ? '#FFF3CC' : '#fff');
      const deltaText = d>0?'▲ Subió '+d : d<0?'▼ Bajó '+(-d) : 'Mantiene el puesto';
      const deltaColor = d>0?'#0E8A66':d<0?'#B3341A':'var(--muted)';
      return `<div style="position:absolute;left:0;right:0;top:${idx*86}px;height:72px;display:flex;align-items:center;gap:12px;padding:0 16px 0 10px;border-radius:22px;background:${bg};border:2px solid ${INK};box-shadow:0 4px 0 ${INK};transition:top .9s cubic-bezier(.34,1.45,.64,1)">
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
      ? `<button class="btn-primary" data-action="nextRound">${isLast?'VER RESULTADO FINAL':'SIGUIENTE DIBUJANTE'}</button>`
      : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(s.hostId)?.name||'El anfitrión')} va a continuar<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
    return `<div class="screen">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(36px,10vw,52px);letter-spacing:-.02em;line-height:1">CLASIFICACIÓN</div>
        <div style="font-size:16px;font-weight:700;color:var(--muted)">Después de la ronda ${s.g.round+1} de ${cfg.rounds}</div>
      </div>
      <div style="display:flex;gap:6px;justify-content:center">${dots}</div>
      <div style="position:relative;height:${pl.length*86}px">${rows}</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }

  viewDFinal(){
    const s = this.state, cfg = s.gameConfig, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const tot = this.dTotals(cfg.rounds-1);
    const nr = this.rankOf(tot);
    const w = byId[nr[0]];
    const winnerTitle = w.id===this.myId ? '¡GANASTE, '+w.name.toUpperCase()+'!' : w.name.toUpperCase()+' GANÓ';
    const pod = [1,0,2].filter(i=>nr[i]);
    const H=['170px','124px','92px'], PBG=[YEL,'#E4DEF5','#F6BE9E'];
    const podium = pod.map((i)=>{
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
    const finalRows = nr.map((id,i)=>{
      const label = id===this.myId ? byId[id].name+' (vos)' : byId[id].name;
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:${i<nr.length-1?'2px solid var(--panel-line)':'0'}">
        <div style="width:28px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${i+1}</div>
        <div style="width:38px;height:38px;flex:0 0 auto">${avatarSVG(byId[id].avatar,38)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:17px">${esc(label)}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${tot[id]} pts</div>
      </div>`;
    }).join('');

    let bestDrawer={}, fastestGuess=null, hardestRound=null, correctCount={}, failCount={};
    pl.forEach(p=>{ bestDrawer[p.id]=0; correctCount[p.id]=0; failCount[p.id]=0; });
    for(let r=0;r<cfg.rounds;r++){
      const drawerId = s.g.drawerOf[r]; if(drawerId==null) continue;
      const pts = this.dPoints(r); const order = s.g.correctOrder[r]||[];
      bestDrawer[drawerId] = (bestDrawer[drawerId]||0) + (pts[drawerId]||0);
      order.forEach((e)=>{ correctCount[e.id] = (correctCount[e.id]||0)+1; if(!fastestGuess || e.ms<fastestGuess.ms) fastestGuess = {pid:e.id, ms:e.ms, r}; });
      const guessers = pl.length-1;
      if(guessers>0 && (!hardestRound || order.length<hardestRound.count)) hardestRound = {word:s.g.word[r], count:order.length, total:guessers, r};
      if(order.length===0) failCount[drawerId] = (failCount[drawerId]||0)+1;
    }
    const topBy = (obj)=>Object.entries(obj).sort((a,b)=>b[1]-a[1])[0];
    const drawerTop = topBy(bestDrawer), correctTop = topBy(correctCount), failTop = topBy(failCount);
    const stats = [
      drawerTop && drawerTop[1]>0 && {label:'Mejor dibujante', value:(byId[drawerTop[0]]?.name||'?'), sub:'+'+drawerTop[1]+' pts dibujando', bg:CORAL},
      fastestGuess && {label:'Adivinador más rápido', value:(byId[fastestGuess.pid]?.name||'?'), sub:(fastestGuess.ms/1000).toFixed(1)+'s · Ronda '+(fastestGuess.r+1), bg:YEL},
      hardestRound && {label:'Dibujo más difícil', value:(hardestRound.word||'?').toUpperCase(), sub:hardestRound.count+' de '+hardestRound.total+' adivinaron', bg:VIOLET},
      correctTop && correctTop[1]>0 && {label:'Mayor cantidad de aciertos', value:(byId[correctTop[0]]?.name||'?'), sub:correctTop[1]+' rondas adivinadas', bg:MINT},
      failTop && failTop[1]>0 && {label:'Nadie le entendió los dibujos', value:(byId[failTop[0]]?.name||'?'), sub:failTop[1]+' ronda(s) sin aciertos', bg:BLUE},
    ].filter(Boolean).map((x,i)=>({...x, delay:(0.5+i*0.1)+'s'}));
    const statsHtml = stats.map(x=>`<div style="background:${x.bg};border:2px solid ${INK};border-radius:22px;box-shadow:0 4px 0 ${INK};padding:16px;display:flex;flex-direction:column;gap:6px;animation:rise .5s both;animation-delay:${x.delay}">
      <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">${esc(x.label)}</div>
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;line-height:1.05;overflow-wrap:anywhere">${esc(x.value)}</div>
      <div style="font-size:14px;font-weight:700">${esc(x.sub)}</div>
    </div>`).join('');
    const confettiHtml = this.confetti.map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} infinite"></div>`).join('');
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando a ${esc(this.playerById(s.hostId)?.name||'el anfitrión')}…</div>`;
    return `<div style="position:relative;min-height:100vh;overflow:hidden">
      <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confettiHtml}</div>
      <div style="position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
          <div class="heading" style="font-size:clamp(40px,12vw,84px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${esc(winnerTitle)}</div>
          <div class="heading" style="font-size:24px">${tot[w.id]} puntos</div>
        </div>
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px">${podium}</div>
        <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:-28px">
          <div style="flex:1 1 320px;min-width:0;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:8px 18px">${finalRows}</div>
          <div style="flex:1 1 420px;min-width:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">${statsHtml}</div>
        </div>
        <div class="sticky-bottom">
          <div style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:12px">${bottom}</div>
        </div>
      </div>
    </div>`;
  }

  renderStatusWidget(){
    const s = this.state, pl = this.players();
    const dots = pl.map(p=>{
      const done = !!s.g.done[p.id];
      return `<div style="position:relative;width:38px;height:38px;opacity:${done?1:0.45};transition:opacity .3s">${avatarSVG(p.avatar,38)}${done?`<div style="position:absolute;right:-5px;bottom:-5px;width:20px;height:20px;border-radius:50%;background:${MINT};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;animation:pop .4s both">${this.iconCheckSmall()}</div>`:''}</div>`;
    }).join('');
    const doneNames = pl.filter(p=>p.id!==this.myId && s.g.done[p.id]).map(p=>p.name);
    const statusText = doneNames.length ? listJoin(doneNames)+(doneNames.length>1?' ya terminaron':' ya terminó') : 'Todos están escribiendo…';
    return `<div data-el="statusWidget" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:#fff;border:2px solid var(--line)">
      <div style="display:flex;gap:6px">${dots}</div>
      <div style="font-size:14px;font-weight:700;color:var(--muted);text-wrap:pretty">${esc(statusText)}</div>
    </div>`;
  }

  viewRound(){
    const s = this.state, cfg = s.gameConfig;
    const promptSize = s.g.roundWord.length>7 ? 'clamp(36px, 10vw, 72px)' : 'clamp(56px, 16vw, 108px)';
    const fields = this.local.inputs.map((v,i)=>{
      const k = norm(v);
      return `<div data-field="${i}" style="position:relative;display:flex;align-items:center">
        <div data-el="num" style="position:absolute;left:13px;width:32px;height:32px;border-radius:10px;background:${k?MINT:'#F1E7D8'};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px;pointer-events:none">${i+1}</div>
        <input class="field-input" data-role="word-input" data-index="${i}" value="${esc(v)}" placeholder="${i===0?'Primera palabra…':''}" autocomplete="off" enterkeyhint="next" style="border-color:${k?INK:'#DCCFBC'}">
        <div data-el="dup" style="display:none;position:absolute;right:14px;padding:4px 10px;border-radius:999px;background:var(--dup-bg);font-size:13px;font-weight:800;color:var(--dup-fg);pointer-events:none">Repetida</div>
      </div>`;
    }).join('');
    return `<div style="min-height:100vh;display:flex;flex-direction:column">
      <div style="position:sticky;top:0;z-index:10;background:var(--cream)">
        <div style="max-width:1080px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:12px">
          <button class="icon-btn" data-action="askLeave" aria-label="Salir">${this.iconClose()}</button>
          <div style="flex:1;min-width:0;display:flex;align-items:baseline;gap:6px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800"><span style="font-size:22px">RONDA ${s.g.round+1}</span><span style="font-size:16px;color:var(--muted)">de ${cfg.rounds}</span></div>
          <div data-el="timerBox" style="display:flex;align-items:center;gap:8px;height:50px;padding:0 16px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;font-variant-numeric:tabular-nums">${this.iconClock()}<span data-el="timerText">${mmss(cfg.time)}</span></div>
        </div>
        <div style="height:6px;background:var(--line)"><div data-el="timerBar" style="height:100%;width:100%;background:${INK};transition:width 1s linear,background .3s"></div></div>
      </div>
      <div style="flex:1;width:100%;max-width:1080px;margin:0 auto;padding:20px 20px 0;display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">
        <div style="flex:1 1 360px;min-width:0;display:flex;flex-direction:column;gap:14px">
          <div style="background:${YEL};border:2.5px solid ${INK};border-radius:28px;box-shadow:0 6px 0 ${INK};padding:26px 22px 30px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;animation:pop .5s cubic-bezier(.3,1.5,.5,1) both">
            <div style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">La palabra es</div>
            <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:${promptSize};line-height:.95;letter-spacing:-.03em;overflow-wrap:anywhere">${esc(s.g.roundWord)}</div>
            <div style="font-size:17px;font-weight:600;max-width:320px;text-wrap:pretty">Escribí ${cfg.words} palabras que relaciones con esta palabra.</div>
          </div>
          ${this.renderStatusWidget()}
        </div>
        <div style="flex:1 1 360px;min-width:0;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 4px">
            <div class="heading" style="font-size:20px">Tus palabras</div>
            <div data-el="filledCount" style="font-size:15px;font-weight:800;color:var(--muted)">${this.local.inputs.filter(x=>norm(x)).length} / ${cfg.words}</div>
          </div>
          ${fields}
          <div class="sticky-bottom" style="margin:0 -20px;padding:20px 20px 20px">
            <button class="btn-primary" data-action="submitNow" style="height:64px;font-size:24px">LISTO</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  viewWait(){
    const s = this.state, pl = this.players();
    const dc = pl.filter(p=>s.g.done[p.id]).length;
    const allDone = dc===pl.length;
    const waitList = pl.map(p=>{
      const done = !!s.g.done[p.id];
      const label = p.id===this.myId ? p.name+' (vos)' : p.name;
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0">
        <div style="width:42px;height:42px;flex:0 0 auto">${avatarSVG(p.avatar,42)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:17px">${esc(label)}</div>
        ${done ? `<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:${MINT};border:2px solid ${INK};font-size:13px;font-weight:800;animation:pop .4s both">${this.iconCheckSmall()}Listo</div>`
               : `<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:var(--panel-line);font-size:13px;font-weight:800;color:var(--muted)">Escribiendo<span style="display:flex;gap:2px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`}
      </div>`;
    }).join('');
    const myWords = ((s.g.answers[s.g.round]||{})[this.myId]||[]).map(w=>`<div style="padding:8px 14px;border-radius:999px;background:#fff;border:2px solid ${INK};font-weight:800;font-size:15px">${esc(disp(w))}</div>`).join('');
    return `<div class="screen screen-narrow">
      <div style="display:flex;justify-content:center"><div style="padding:8px 16px;border-radius:999px;background:#fff;border:2px solid var(--line);font-size:14px;font-weight:800;letter-spacing:.06em">RONDA ${s.g.round+1} · ${esc(s.g.roundWord)}</div></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding-top:12px">
        <div style="width:96px;height:96px;border-radius:50%;background:${MINT};border:2.5px solid ${INK};box-shadow:0 5px 0 ${INK};display:flex;align-items:center;justify-content:center;animation:pop .5s cubic-bezier(.3,1.6,.5,1) both">${this.iconCheckBig()}</div>
        <div class="heading" style="font-size:56px;line-height:1;letter-spacing:-.02em">¡Listo!</div>
        ${allDone ? `<div style="font-size:19px;font-weight:800;color:${INK};animation:rise .4s both">¡Todos terminaron! Revelando…</div>` : `<div style="font-size:19px;font-weight:600;color:var(--muted)">Esperando a los demás...</div>`}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:800;padding:0 4px"><span>${dc} de ${pl.length} listos</span></div>
        <div style="height:12px;border-radius:999px;background:var(--line);overflow:hidden"><div style="height:100%;width:${(dc/pl.length*100)}%;background:${MINT};border-radius:999px;transition:width .5s cubic-bezier(.3,1.4,.5,1)"></div></div>
      </div>
      <div class="card" style="padding:8px 16px">${waitList}</div>
      <div style="display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:20px;border:2px dashed var(--dashed)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><div style="font-weight:800;font-size:15px">Tus palabras</div><div style="font-size:13px;font-weight:700;color:var(--muted)">Las del resto se revelan cuando todos terminen</div></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${myWords}</div>
      </div>
    </div>`;
  }

  viewReveal(){
    const s = this.state;
    const gs = this.groups(s.g.round);
    const byId = {}; this.players().forEach(p=>byId[p.id]=p);
    const cards = gs.slice(0, this.local.reveal).map(g=>{
      const mine = g.pids.includes(this.myId), n = g.pids.length;
      const kind = n>1 ? (mine?'match':'shared') : 'solo';
      const bg = kind==='match'?CORAL:kind==='shared'?'#fff':'transparent';
      const border = kind==='solo' ? '2px dashed var(--dashed)' : `2px solid ${INK}`;
      const shadow = kind==='solo' ? 'none' : `0 4px 0 ${INK}`;
      const fg = kind==='solo' ? 'var(--muted)' : INK;
      const countBg = kind==='solo' ? 'var(--panel-line)' : INK;
      const countFg = kind==='solo' ? 'var(--muted)' : 'var(--cream)';
      const tag = kind==='match' ? '¡Vos también!' : kind==='shared' ? n+' coincidencias' : 'Solo '+(g.pids[0]===this.myId?'vos':(byId[g.pids[0]]?.name||'?'));
      const avatars = g.pids.map(id=>`<div style="width:30px;height:30px;flex:0 0 auto">${avatarSVG(byId[id]&&byId[id].avatar,30)}</div>`).join('');
      return `<div style="background:${bg};border:${border};box-shadow:${shadow};color:${fg};border-radius:22px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;animation:pop .45s cubic-bezier(.3,1.5,.5,1) both">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div style="min-width:0;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:30px;letter-spacing:-.01em;overflow-wrap:anywhere">${esc(g.label)}</div>
          <div style="flex:0 0 auto;min-width:50px;height:50px;border-radius:15px;background:${countBg};color:${countFg};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px">${n}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div style="display:flex;gap:4px">${avatars}</div>
          <div style="font-size:14px;font-weight:800">${esc(tag)}</div>
        </div>
      </div>`;
    }).join('');
    const revealDone = this.local.reveal >= gs.length;
    const mp = this.points(s.g.round)[this.myId];
    const m = mp ? mp.items.filter(x=>x.pts>0).length : 0;
    const summary = 'Coincidiste en '+m+' de '+(mp?mp.items.length:0)+' palabras';
    return `<div class="screen screen-wide">
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
        <div style="font-size:14px;font-weight:800;letter-spacing:.14em">¿QUÉ RESPONDIERON?</div>
        <div style="padding:10px 26px;border-radius:20px;background:${YEL};border:2.5px solid ${INK};box-shadow:0 5px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(40px,11vw,64px);line-height:1;letter-spacing:-.02em;transform:rotate(-2deg)">${esc(s.g.roundWord)}</div>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;font-size:13px;font-weight:700;color:var(--muted);padding-top:6px">
          <div style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:5px;background:${CORAL};border:2px solid ${INK}"></span>Vos también</div>
          <div style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:5px;background:#fff;border:2px solid ${INK}"></span>Coincidieron otros</div>
          <div style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:5px;border:2px dashed var(--dashed)"></span>Nadie más</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">${cards}</div>
      <div class="sticky-bottom">
        <div style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:10px">
          ${!revealDone ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;height:62px;padding:0 8px 0 20px;border-radius:18px;background:#fff;border:2px solid ${INK}">
            <div style="font-weight:800;font-size:16px">Revelando ${Math.min(this.local.reveal,gs.length)} de ${gs.length}</div>
            <button data-action="revealAll" style="height:46px;padding:0 16px;border-radius:13px;border:0;background:var(--panel-line);color:${INK};font-weight:800;font-size:15px">Mostrar todo</button>
          </div>` : `
          <div style="text-align:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:19px;animation:rise .4s both">${esc(summary)}</div>
          <button class="btn-primary" data-action="goScore" style="animation:pop .4s both">VER PUNTOS</button>`}
        </div>
      </div>
    </div>`;
  }

  viewScore(){
    const s = this.state, pl = this.players();
    const pts = this.points(s.g.round);
    const order = pl.slice().sort((a,b)=>pts[b.id].total-pts[a.id].total||a.name.localeCompare(b.name));
    const rows = order.map((p,i)=>{
      const sel = this.local.selPid===p.id;
      const label = p.id===this.myId ? p.name+' (vos)' : p.name;
      return `<button data-action="selectPlayer" data-pid="${p.id}" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px 12px 12px;border-radius:20px;background:${p.id===this.myId?'#FFEDE6':'#fff'};border:2px solid ${sel?INK:'var(--line)'};box-shadow:${sel?`0 4px 0 ${INK}`:'none'};text-align:left;color:${INK};animation:rise .4s both;animation-delay:${(i*0.08).toFixed(2)}s">
        <div style="flex:0 0 auto;width:36px;height:36px;border-radius:12px;background:${RANKBG[i]||'#F1E7D8'};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${i+1}</div>
        <div style="width:42px;height:42px;flex:0 0 auto">${avatarSVG(p.avatar,42)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:18px">${esc(label)}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px">${pts[p.id].total} pts</div>
      </button>`;
    }).join('');
    const selId = this.local.selPid || this.myId;
    const sel = this.playerById(selId) || this.playerById(this.myId);
    const breakTitle = sel.id===this.myId ? 'Cómo sumaste' : 'Cómo sumó '+sel.name;
    const breakdown = pts[sel.id].items.slice().sort((a,b)=>b.pts-a.pts).map(it=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:2px solid var(--panel-line);opacity:${it.pts>0?1:0.5}">
      <div style="flex:0 0 auto;min-width:0;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px;letter-spacing:.02em">${esc(it.label.toUpperCase())}</div>
      <div style="flex:1;min-width:0;font-size:14px;font-weight:600;color:var(--muted)">→ ${it.pts>0?'coincidió con '+it.pts+(it.pts>1?' jugadores':' jugador'):'nadie más la puso'}</div>
      <div style="flex:0 0 auto;padding:4px 10px;border-radius:999px;background:${it.pts>0?MINT:'var(--panel-line)'};border:2px solid ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px">+${it.pts}</div>
    </div>`).join('');
    return `<div class="screen screen-wide">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div style="font-size:14px;font-weight:800;letter-spacing:.14em">RESULTADOS · RONDA ${s.g.round+1}</div>
        <div class="heading" style="font-size:clamp(64px,18vw,96px);line-height:1;letter-spacing:-.03em;animation:pop .6s cubic-bezier(.3,1.6,.5,1) both">+${pts[this.myId].total}</div>
        <div style="font-size:17px;font-weight:700;color:var(--muted)">puntos para vos en ${esc(s.g.roundWord)}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start">
        <div style="flex:1 1 340px;min-width:0;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px"><div class="heading" style="font-size:20px">Esta ronda</div><div style="font-size:13px;font-weight:700;color:var(--muted)">Tocá un jugador para ver su detalle</div></div>
          ${rows}
        </div>
        <div style="flex:1 1 340px;min-width:0;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:16px 18px;display:flex;flex-direction:column;gap:4px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:6px"><div class="heading" style="font-size:20px">${esc(breakTitle)}</div><div class="heading" style="font-size:20px">+${pts[sel.id].total} pts</div></div>
          ${breakdown}
        </div>
      </div>
      <div class="sticky-bottom">
        <div style="max-width:520px;margin:0 auto"><button class="btn-primary" data-action="goRanking">VER CLASIFICACIÓN</button></div>
      </div>
    </div>`;
  }

  viewRanking(){
    const s = this.state, cfg = s.gameConfig, pl = this.players();
    const cur = this.totals(s.g.round), prevT = s.g.round>0 ? this.totals(s.g.round-1) : null;
    const nr = this.rankOf(cur), orr = prevT ? this.rankOf(prevT) : nr;
    const ph = this.local.rankPhase===1;
    const rows = pl.map(p=>{
      const ni = nr.indexOf(p.id), oi = orr.indexOf(p.id), idx = ph?ni:oi, d = oi-ni;
      const label = p.id===this.myId ? p.name+' (vos)' : p.name;
      const total = ph ? cur[p.id] : (prevT ? prevT[p.id] : 0);
      const bg = p.id===this.myId ? '#FFEDE6' : (idx===0 && ph ? '#FFF3CC' : '#fff');
      const deltaText = d>0?'▲ Subió '+d : d<0?'▼ Bajó '+(-d) : 'Mantiene el puesto';
      const deltaColor = d>0?'#0E8A66':d<0?'#B3341A':'var(--muted)';
      return `<div style="position:absolute;left:0;right:0;top:${idx*86}px;height:72px;display:flex;align-items:center;gap:12px;padding:0 16px 0 10px;border-radius:22px;background:${bg};border:2px solid ${INK};box-shadow:0 4px 0 ${INK};transition:top .9s cubic-bezier(.34,1.45,.64,1)">
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
    const nextLabel = isLast ? 'VER RESULTADO FINAL' : 'SIGUIENTE RONDA';
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="nextRound">${nextLabel}</button>`
      : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(s.hostId)?.name||'El anfitrión')} va a continuar<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
    return `<div class="screen">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(36px,10vw,52px);letter-spacing:-.02em;line-height:1">CLASIFICACIÓN</div>
        <div style="font-size:16px;font-weight:700;color:var(--muted)">Después de la ronda ${s.g.round+1} de ${cfg.rounds}</div>
      </div>
      <div style="display:flex;gap:6px;justify-content:center">${dots}</div>
      <div style="position:relative;height:${pl.length*86}px">${rows}</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }

  viewFinal(){
    const s = this.state, cfg = s.gameConfig, pl = this.players();
    const byId = {}; pl.forEach(p=>byId[p.id]=p);
    const tot = this.totals(cfg.rounds-1);
    const nr = this.rankOf(tot);
    const w = byId[nr[0]];
    const winnerTitle = w.id===this.myId ? '¡GANASTE, '+w.name.toUpperCase()+'!' : w.name.toUpperCase()+' GANÓ';
    const pod = [1,0,2].filter(i=>nr[i]);
    const H=['170px','124px','92px'], PBG=[YEL,'#E4DEF5','#F6BE9E'], AV=['72px','56px','56px'];
    const podium = pod.map((i,idx)=>{
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
    const finalRows = nr.map((id,i)=>{
      const label = id===this.myId ? byId[id].name+' (vos)' : byId[id].name;
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:${i<nr.length-1?'2px solid var(--panel-line)':'0'}">
        <div style="width:28px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${i+1}</div>
        <div style="width:38px;height:38px;flex:0 0 auto">${avatarSVG(byId[id].avatar,38)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:17px">${esc(label)}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${tot[id]} pts</div>
      </div>`;
    }).join('');

    let best=null, myMatch=0, myWords=0, myBest=null; const solo={}, pair={};
    s.g.answers.forEach((_,r)=>this.groups(r).forEach(g=>{
      const n=g.pids.length;
      if(!best||n>best.n) best={label:g.label,n,r};
      if(n===1) solo[g.pids[0]]=(solo[g.pids[0]]||0)+1;
      for(let a=0;a<n;a++) for(let b=a+1;b<n;b++){ const k=[g.pids[a],g.pids[b]].sort().join('|'); pair[k]=(pair[k]||0)+1; }
      if(g.pids.includes(this.myId)){ myWords++; if(n>1){ myMatch++; if(!myBest||n>myBest.n) myBest={label:g.label,n}; } }
    }));
    const pk = Object.entries(pair).sort((a,b)=>b[1]-a[1])[0];
    const sk = Object.entries(solo).sort((a,b)=>b[1]-a[1])[0];
    const stats = [
      best && {label:'Palabra más popular', value:best.label.toUpperCase(), sub:best.n+' jugadores · '+s.g.roundWord, bg:CORAL},
      {label:'Tus coincidencias', value:String(myMatch), sub:'de '+myWords+' palabras', bg:YEL},
      myBest && {label:'Tu mejor respuesta compartida', value:myBest.label.toUpperCase(), sub:'+'+(myBest.n-1)+' puntos', bg:VIOLET},
      pk && {label:'Almas gemelas', value:pk[0].split('|').map(id=>byId[id]?.name||'?').join(' & '), sub:pk[1]+' palabras en común', bg:MINT},
      sk && {label:'Mente original', value:byId[sk[0]]?.name||'?', sub:sk[1]+(sk[1]>1?' palabras que nadie más puso':' palabra que nadie más puso'), bg:BLUE},
    ].filter(Boolean);
    const statsHtml = stats.map((x,i)=>`<div style="background:${x.bg};border:2px solid ${INK};border-radius:22px;box-shadow:0 4px 0 ${INK};padding:16px;display:flex;flex-direction:column;gap:6px;animation:rise .5s both;animation-delay:${(0.5+i*0.1).toFixed(2)}s">
      <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">${esc(x.label)}</div>
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px;line-height:1.05;overflow-wrap:anywhere">${esc(x.value)}</div>
      <div style="font-size:14px;font-weight:700">${esc(x.sub)}</div>
    </div>`).join('');
    const confettiHtml = this.confetti.map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} infinite"></div>`).join('');
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando a ${esc(this.playerById(this.state.hostId)?.name||'el anfitrión')}…</div>`;
    return `<div style="position:relative;min-height:100vh;overflow:hidden">
      <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confettiHtml}</div>
      <div style="position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
          <div class="heading" style="font-size:clamp(40px,12vw,84px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${esc(winnerTitle)}</div>
          <div class="heading" style="font-size:24px">${tot[w.id]} puntos</div>
        </div>
        <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px">${podium}</div>
        <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:-28px">
          <div style="flex:1 1 320px;min-width:0;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:8px 18px">${finalRows}</div>
          <div style="flex:1 1 420px;min-width:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">${statsHtml}</div>
        </div>
        <div class="sticky-bottom">
          <div style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:12px">${bottom}</div>
        </div>
      </div>
    </div>`;
  }

  /* ---------- icons ---------- */
  iconBack(){ return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"></path></svg>`; }
  iconClose(){ return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>`; }
  iconClock(){ return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2M9 2h6"></path></svg>`; }
  iconCopy(){ return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="3"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>`; }
  iconCheckSmall(){ return `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>`; }
  iconCheckBig(){ return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>`; }
}

const app = document.getElementById('app');
const toastRoot = document.getElementById('toasts');
const modalRoot = document.getElementById('modals');
const hudRoot = document.getElementById('hud');
const chatRoot = document.getElementById('chatPanel');
window.__game = new Game(app, toastRoot, modalRoot, hudRoot, chatRoot);
