import { supabase } from './supabaseClient.js';
import { pickWords } from './words.js';
import { DIBUJALO_BANK, pickDibujaloTrio, dibujaloFunnyLine, TUTTI_CATEGORIES, pickLetter, pickImpostorPair } from './wordbank.js';

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

/* ---------- bots: local "practice mode" players driven entirely by the
   host's own client, so you can try any game solo while you wait for real
   friends. Never sent over the network as real participants — just
   ordinary players with isBot:true whose "actions" the host fakes. ---------- */
const BOT_NAMES = ['Rodo','Cande','Fede','Lu','Maxi','Vale','Tincho','Meli','Naza','Cata','Bruno','Fran'];
const BOT_WORD_POOL = ['Casa','Perro','Gato','Sol','Agua','Fiesta','Música','Amor','Playa','Auto','Libro','Comida','Amigo','Cielo','Árbol','Fuego','Luna','Flor','Camino','Viento'];
const BOT_TF_SUFFIXES = ['ola','ino','ana','eta','oso','ura','ico','ando','elo','ita'];
function circlePts(cx,cy,r,n){ const pts=[]; for(let i=0;i<=n;i++){ const a=(i/n)*Math.PI*2; pts.push({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r}); } return pts; }
function arcPts(cx,cy,r,a0,a1,n){ const pts=[]; for(let i=0;i<=n;i++){ const a=a0+(a1-a0)*(i/n); pts.push({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r}); } return pts; }
// A few simple recognizable doodles a bot "draws" stroke-by-stroke, purely
// so a solo test session sees something appear on the canvas.
const DOODLE_BUILDERS = [
  ()=>[
    [{x:.28,y:.72},{x:.28,y:.42},{x:.5,y:.2},{x:.72,y:.42},{x:.72,y:.72},{x:.28,y:.72}],
    [{x:.42,y:.72},{x:.42,y:.55},{x:.58,y:.55},{x:.58,y:.72}],
  ],
  ()=>[
    circlePts(.5,.45,.2,20),
    [{x:.41,y:.4},{x:.44,y:.4}],
    [{x:.56,y:.4},{x:.59,y:.4}],
    arcPts(.5,.46,.1,Math.PI*0.15,Math.PI*0.85,10),
  ],
  ()=>[
    [{x:.47,y:.76},{x:.47,y:.5},{x:.53,y:.5},{x:.53,y:.76},{x:.47,y:.76}],
    circlePts(.5,.35,.16,18),
  ],
];
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
  {id:'unanimo', name:'Unánimo', tagline:'Pensá como los demás. Sumás por cada palabra que coincide.', letters:['U','N'], colors:[CORAL,VIOLET], min:2, max:8, isNew:false},
  {id:'dibujalo', name:'Dibujalo', tagline:'Uno dibuja, el resto adivina en tiempo real contrarreloj.', letters:['D','I'], colors:[BLUE,YEL], min:3, max:10, isNew:true},
  {id:'tuttifrutti', name:'Tutti Frutti', tagline:'Una letra, varias categorías y un solo grito: ¡STOP!', letters:['T','F'], colors:[MINT,PINK], min:2, max:8, isNew:true},
  {id:'impostor', name:'Impostor', tagline:'Todos comparten una palabra. Uno miente. Descubrilo antes de que sea tarde.', letters:['I','M'], colors:[VIOLET,PINK], min:4, max:12, isNew:true},
];
// Modo Ronda isn't a game itself — it's a meta-mode that chains a sequence
// of the games above into one match with a shared, accumulating score. It
// gets its own picker card (rendered separately, starred) but reuses this
// same {id,name,tagline,letters,colors,min,max} shape for its lobby meta
// card, so it's listed here too and just filtered out of the "pick one
// game" grids.
const RONDA_META = {id:'ronda', name:'Modo Ronda', tagline:'Una partida. Varios juegos. Un solo ganador.', letters:['M','R'], colors:[YEL,MINT], min:2, max:12, isNew:true};
function gameMeta(id){ return id==='ronda' ? RONDA_META : GAMES.find(g=>g.id===id); }
// Central registry of which games Modo Ronda can chain together, and the
// one call each needs to be dropped into a slot: its own start-a-fresh-
// game entry point (same one its "COMENZAR" button already calls) and its
// own cumulative-totals getter (same one its own ranking screen already
// uses). Adding a 5th game later to Modo Ronda is just one more entry
// here — nothing else in this file needs to change.
const RONDA_ADAPTERS = {
  unanimo: { startGame:'uStartGame', totals:'totals', defaultConfig:()=>({rounds:1, words:6, time:45}) },
  // Dibujalo's own turn order already rotates the drawer role through every
  // player (order[round % order.length]) — setting rounds to the player
  // count just means that rotation completes exactly once before handing
  // back to Modo Ronda, so everyone draws exactly one turn, not just one
  // player for the whole slot.
  dibujalo: { startGame:'dStartGame', totals:'dTotals', defaultConfig:(n)=>({rounds:Math.max(1,n||1), chooseTime:10, drawTime:60, hints:true, categories:Object.keys(DIBUJALO_BANK)}) },
  tuttifrutti: { startGame:'tfStartGame', totals:'tfTotals', defaultConfig:()=>({rounds:1, time:60, categories:['nombre','animal','pais','comida','objeto','pelicula'], hard:false}) },
  impostor: { startGame:'impStartGame', totals:'impTotals', defaultConfig:()=>({rounds:1, impostorCount:'auto', clueTime:30, discussTime:60, voteTime:20, mode:'classic'}) },
};
// Same formulas each config screen uses for its own live estimate, applied
// to the default settings — shown on the picker card before anyone's
// customized anything for this room.
function gameEstimateMinutes(gameId){
  if(gameId==='unanimo') return Math.max(1,Math.round(3*(45+35)/60));
  if(gameId==='dibujalo') return Math.max(1,Math.round(6*(60+10+15)/60));
  if(gameId==='tuttifrutti') return Math.max(1,Math.round(5*(60+40)/60));
  if(gameId==='impostor') return Math.max(1,Math.round(5*(6*30+60+20+30)/60));
  if(gameId==='ronda') return 12;
  return 5;
}

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
      impClueDraft: '', impGuessDraft: '', impMyWord: null, impIsImpostor: false, impAllyName: null,
      impReadyConfirmed: false, impVoted: false, impVotedFor: null, impRevealPhase: 0,
    };
    this.uDraft = { rounds:3, words:6, time:45 };
    this.dDraft = { rounds:6, chooseTime:10, drawTime:60, hints:true, categories:Object.keys(DIBUJALO_BANK) };
    this.tfDraft = { rounds:5, time:60, categories:['nombre','animal','pais','comida','objeto','pelicula'], hard:false };
    this.impDraft = { rounds:5, impostorCount:'auto', clueTime:30, discussTime:60, voteTime:20, mode:'classic' };
    const allGameIds = Object.keys(RONDA_ADAPTERS);
    this.rondaDraft = { selectedGames:[...allGameIds], orderMode:'custom', customOrder:[...allGameIds], noRepeat:true, rounds:4 };
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
  clearTimers(){ this.timers.forEach(clearTimeout); this.timers=[]; clearInterval(this.tick); clearInterval(this.revealTick); clearInterval(this.hostWatch); clearInterval(this.dWatch); clearInterval(this.tfWatch); clearInterval(this.impWatch); }

  /* ---------- sound ---------- */
  playClick(){ if(!this.soundOn) return; beep(760, 0.05, 'sine', 0.05); }
  playJoin(){ if(!this.soundOn) return; beep(660, 0.09, 'triangle', 0.09); beep(920, 0.13, 'triangle', 0.09, 0.09); }
  playChat(){ if(!this.soundOn) return; beep(540, 0.06, 'sine', 0.05); }
  toggleSound(){
    this.soundOn = !this.soundOn;
    try{ localStorage.setItem('unanimo:sound', this.soundOn?'on':'off'); }catch(e){}
    const musicScreen = this.local.screen==='home' || this.local.screen==='setup' || this.local.screen==='lobby';
    if(this.soundOn){ ensureAudio(); if(musicScreen) this.startLobbyMusic(); }
    else this.stopLobbyMusic();
    this.renderHud();
  }

  /* ---------- lobby music: an upbeat, bouncy little loop, synthesized —
     no audio files, muted by the same sound toggle as everything else.
     Short plucky "stabs" on a steady beat instead of long sustained pads,
     so it actually feels festive rather than ambient/moody. */
  startLobbyMusic(){
    if(!this.soundOn || this._musicPlaying) return;
    const ctx = ensureAudio(); if(!ctx) return;
    this._musicPlaying = true;
    if(!this._musicGain){ this._musicGain = ctx.createGain(); this._musicGain.gain.value = 0.07; this._musicGain.connect(ctx.destination); }
    const N = {C3:130.81,F3:174.61,G3:196.00,A3:220.00,C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392.00,A4:440.00,B4:493.88,C5:523.25,D5:587.33,E5:659.25};
    // I - vi - IV - V, the classic bright/happy pop loop.
    const chords = [
      {bass:N.C3, tri:[N.C4,N.E4,N.G4], sparkle:N.C5},
      {bass:N.A3, tri:[N.A4,N.C5,N.E5], sparkle:N.E5},
      {bass:N.F3, tri:[N.F4,N.A4,N.C5], sparkle:N.F4*2},
      {bass:N.G3, tri:[N.G4,N.B4,N.D5], sparkle:N.D5},
    ];
    const beat = 0.24; // seconds/beat — a bouncy, quick tempo
    let step = 0;
    const pluck = (freq, t0, dur, peak, type)=>{
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(peak, t0+0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t0+dur);
      osc.connect(g).connect(this._musicGain);
      osc.start(t0); osc.stop(t0+dur+0.02);
    };
    const tick = ()=>{
      if(!this._musicPlaying) return;
      // Browsers keep the AudioContext suspended until a real user gesture.
      // Scheduling notes against a frozen currentTime here would leave them
      // stuck at t=0 and burst out garbled the moment it finally resumes —
      // so just keep polling (silently) until it's actually running, then
      // pick up the beat exactly where it left off.
      if(ctx.state !== 'running'){ ctx.resume().catch(()=>{}); this._musicTimer = setTimeout(tick, beat*1000); return; }
      const c = chords[Math.floor(step/4) % chords.length];
      const beatInChord = step % 4;
      const t0 = ctx.currentTime;
      pluck(c.bass, t0, 0.22, 0.5, 'triangle'); // bouncy bass on every beat
      if(beatInChord===0) c.tri.forEach(f=>pluck(f, t0, 0.3, 0.22, 'square')); // bright chord stab on the downbeat
      if(beatInChord===2) pluck(c.sparkle, t0, 0.22, 0.16, 'triangle'); // little upbeat sparkle
      step++;
      this._musicTimer = setTimeout(tick, beat*1000);
    };
    tick();
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

  /* ---------- bots (practice mode: play solo, host fakes their moves) ---------- */
  addBot(){
    if(!this.isHost || !this.state || this.state.phase!=='lobby') return;
    if(this.state.players.length >= (this.state.maxPlayers||12)){ this.toast('Sala llena', CORAL); return; }
    const used = new Set(this.state.players.filter(p=>p.isBot).map(p=>p.name));
    const free = BOT_NAMES.filter(n=>!used.has(n));
    const name = (free.length ? free : BOT_NAMES)[Math.floor(Math.random()*(free.length ? free.length : BOT_NAMES.length))];
    const bot = { id:'bot_'+uid(), name, avatar:randomAvatar(), isBot:true, joinedAt:Date.now() };
    this.state.players.push(bot);
    this.broadcastState();
  }
  removeBot(botId){
    if(!this.isHost || !this.state) return;
    const p = this.playerById(botId);
    if(!p || !p.isBot) return;
    this.state.players = this.state.players.filter(pl=>pl.id!==botId);
    this.broadcastState();
  }
  botPickWords(n){
    const pool = BOT_WORD_POOL.slice();
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    return pool.slice(0, Math.min(n, pool.length));
  }
  botTfWord(letter){
    return letter.toUpperCase() + BOT_TF_SUFFIXES[Math.floor(Math.random()*BOT_TF_SUFFIXES.length)];
  }
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
    // Impostor: each player's word/role is delivered as a targeted message
    // (like Dibujalo's word options) so it never sits in the shared,
    // broadcast-to-everyone game state.
    this.channel.on('broadcast', {event:'impWord'}, ({payload})=>{ if(payload.to===this.myId) this.impReceiveWord(payload); });
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
      gameId:null, gameConfig:null, g:null, match:null,
      phase:'lobby', stage:0, rev:0, updatedAt:Date.now()
    };
    this.local.appliedStage = 0;
    this.local.hostFlow = this.local.pendingGameId || null; // picked a game card from home — skip straight to its config
    this.local.pendingGameId = null;
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
    else if(msg.type === 'impReady'){
      if(this.state.gameId!=='impostor' || !this.state.g || msg.round!==this.state.g.round) return;
      this.impSetReady(msg.id);
    }
    else if(msg.type === 'impClue'){
      if(this.state.gameId!=='impostor' || !this.state.g || msg.round!==this.state.g.round) return;
      this.impSubmitClue(msg.id, msg.text, false);
    }
    else if(msg.type === 'impVote'){
      if(this.state.gameId!=='impostor' || !this.state.g || msg.round!==this.state.g.round) return;
      this.impCastVote(msg.id, msg.targetId);
    }
    else if(msg.type === 'impGuess'){
      if(this.state.gameId!=='impostor' || !this.state.g) return;
      this.impSubmitGuess(msg.id, msg.text);
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
        this.later(()=>this.runTfLetterSlot(s.g.letter), 30);
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
      if(s.phase === 'ranking' || s.phase === 'dRanking' || s.phase === 'tfRanking' || s.phase === 'impRanking'){
        this.local.rankPhase = 0;
        this.later(()=>{ this.local.rankPhase = 1; this.renderScreen(); }, 900);
      }
      if(s.phase === 'impWord'){
        this.local.impMyWord = null; this.local.impIsImpostor = false; this.local.impAllyName = null;
        this.local.impWordArrived = false;
        this.local.impReadyConfirmed = false; this.local.impIntro = true; this.local.impCountdown = null;
        this.runImpIntro();
      }
      if(s.phase === 'impClue'){
        this.local.impClueDraft = '';
        this.impStartLocalTimer('clue');
      }
      if(s.phase === 'impDiscuss'){
        this.impStartLocalTimer('discuss');
      }
      if(s.phase === 'impVote'){
        this.local.impVoted = false; this.local.impVotedFor = null;
        this.impStartLocalTimer('vote');
      }
      if(s.phase === 'impReveal'){
        this.local.impRevealPhase = 0;
        this.later(()=>{ this.local.impRevealPhase = 1; this.renderScreen(); }, 1600);
      }
      if(s.phase === 'impGuess'){
        this.local.impGuessDraft = '';
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
    // Without this, a 🚩 toggle only ever shows up for whoever clicked it —
    // everyone else's flags/points never refresh on screen until some other
    // action happens to force a re-render.
    else if(this.local.screen === 'tfReview') this.renderScreen();
    // impWord: someone else's ready-check ticks in; impVote: the public
    // "X/Y votaron" counter ticks up; impGuess: the caught impostor's
    // result appears for everyone once the host resolves it.
    // Only the ready-checklist view needs to reflect other players' pings
    // live — re-rendering during the intro/word-reveal sub-states too would
    // remount them and replay their entrance animation on every bot that
    // readies up, looking like the word was stuttering/glitching.
    else if(this.local.screen === 'impWord'){ if(!this.local.impIntro && this.local.impReadyConfirmed) this.renderScreen(); }
    else if(this.local.screen === 'impVote') this.renderScreen();
    else if(this.local.screen === 'impGuess') this.renderScreen();
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
    this.players().forEach(p=>{
      if(!p.isBot) return;
      const total = this.state.gameConfig.time*1000;
      const delay = total*0.3 + Math.random()*total*0.5;
      this.later(()=>{
        if(!this.isHost || this.state.phase!=='round' || this.state.g.round!==r || this.state.g.done[p.id]) return;
        if(!this.state.g.answers[r]) this.state.g.answers[r] = {};
        this.state.g.answers[r][p.id] = this.botPickWords(this.state.gameConfig.words);
        this.state.g.done[p.id] = true;
        this.broadcastState();
        this.checkAllDone();
      }, delay);
    });
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
    else if(this.state.match){ this.rondaGameFinished(); }
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
    this.state.match = null;
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
    this.players().forEach(p=>{
      if(!p.isBot) return;
      const total = this.state.gameConfig.time*1000;
      const delay = total*0.25 + Math.random()*total*0.55;
      this.later(()=>{
        if(!this.isHost || this.state.g.round!==r || this.state.g.locked) return;
        const answers = {};
        this.state.gameConfig.categories.forEach(cat=>{ answers[cat] = Math.random()<0.88 ? this.botTfWord(letter) : ''; });
        this.tfDrafts = this.tfDrafts || {};
        this.tfDrafts[p.id] = answers;
      }, delay);
    });
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
  // Slot-machine style reveal: rapidly cycle random letters, easing out to a
  // stop on the round's real letter, instead of just popping it in flat.
  runTfLetterSlot(finalLetter){
    const el = this.root.querySelector('[data-el="tfIntroLetter"]');
    if(!el){ this.local.tfIntro = false; this.renderScreen(); return; }
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ'.split('');
    const totalTicks = 16;
    let tick = 0;
    const step = ()=>{
      if(!this.local.tfIntro) return; // player navigated away mid-spin
      tick++;
      if(tick >= totalTicks){
        el.textContent = finalLetter;
        el.style.animation = 'tick .3s cubic-bezier(.3,1.6,.5,1) both';
        this.later(()=>{ this.local.tfIntro = false; this.renderScreen(); }, 650);
        return;
      }
      el.textContent = ALPHA[Math.floor(Math.random()*ALPHA.length)];
      this.later(step, 35 + tick*tick*0.7); // eases out: fast spin slowing to a stop
    };
    step();
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
    else if(this.state.match){ this.rondaGameFinished(); }
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
    if(this.playerById(drawerId)?.isBot){
      const pick = trio[Math.floor(Math.random()*trio.length)];
      this.later(()=>{
        if(!this.isHost || this.state.phase!=='dChoose' || this.state.g.round!==r) return;
        this.dHostWordChosen(drawerId, pick.word, pick.category, r, false);
      }, 1200 + Math.random()*1500);
    }
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
    if(this.playerById(drawerId)?.isBot) this.dBotDraw(drawerId, r);
    this.players().forEach(p=>{
      if(!p.isBot || p.id===drawerId) return;
      if(Math.random() >= 0.85) return; // bots occasionally never guess it, like a real player
      const window = this.state.gameConfig.drawTime*1000;
      const delay = window*0.35 + Math.random()*window*0.5;
      this.later(()=>{
        if(!this.isHost || this.state.phase!=='dDraw' || this.state.g.round!==r) return;
        if((this.state.g.correctOrder[r]||[]).some(e=>e.id===p.id)) return;
        this.dHostGuess(p.id, this.dSecretWord||'', delay, r);
      }, delay);
    });
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
  // Host-only: a bot drawer can't actually draw, so it "performs" a small
  // recognizable doodle via the same stroke pipeline real strokes use —
  // broadcast for other real players, and drawn directly onto the host's
  // own canvas context too (broadcasts never echo back to their sender).
  dBotDraw(drawerId, r){
    if(!this.isHost) return;
    const doodle = DOODLE_BUILDERS[Math.floor(Math.random()*DOODLE_BUILDERS.length)]();
    const segs = [];
    doodle.forEach(stroke=>{ for(let i=1;i<stroke.length;i++) segs.push([stroke[i-1], stroke[i]]); });
    const color = INK, size = 6;
    let i = 0;
    const step = ()=>{
      if(!this.isHost || this.state.phase!=='dDraw' || this.state.g.round!==r || this.state.g.drawerOf[r]!==drawerId) return;
      if(i >= segs.length) return;
      const [from,to] = segs[i++];
      this.send('stroke', { points:[from,to], color, size });
      if(this.dCtx && this.dCanvasEl) this.dDrawSegment(this.dCtx, from, to, color, size, this.dCanvasEl);
      this.later(step, 80);
    };
    this.later(step, 600);
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
    else if(this.state.match){ this.rondaGameFinished(); }
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
    // Clear the input in place — a full renderScreen() here would remount
    // the canvas and wipe out everything drawn so far (strokes are never
    // stored/replayed, only painted live).
    const inputEl = this.root.querySelector('[data-role="d-guess-input"]');
    if(inputEl) inputEl.value = '';
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
      if(p) this.toast('¡'+p.name.toUpperCase()+' ADIVINÓ!', MINT);
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
    const list = (s.g.guesses[r]||[]).slice(-30).reverse();
    const rows = list.map(g=>{
      const p = byId[g.id]; if(!p) return '';
      // A correct guess must never show the actual word in the feed —
      // anyone who hasn't guessed yet would just read it off the screen
      // and copy it, which defeats the whole round.
      const textHtml = g.correct
        ? `<span style="display:inline-flex;align-items:center;gap:6px;color:#0E8A66">${this.iconCheckSmall()} Adivinó la palabra</span>`
        : esc(g.text);
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0">
        <div style="width:22px;height:22px;flex:0 0 auto">${avatarSVG(p.avatar,22)}</div>
        <div style="font-size:13px;font-weight:700;color:var(--muted)">${esc(p.name)}:</div>
        <div style="flex:1;min-width:0;font-size:14px;font-weight:800;overflow-wrap:anywhere">${textHtml}</div>
      </div>`;
    }).join('') || `<div style="text-align:center;color:var(--muted);font-size:13px;font-weight:700;padding:10px 0">Nadie escribió todavía…</div>`;
    return `<div data-el="dGuessFeed" style="display:flex;flex-direction:column;gap:2px">${rows}</div>`;
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
    if(eraserBtn){ const on = this.local.dTool==='eraser'; eraserBtn.style.background = on?INK:'#fff'; eraserBtn.innerHTML = this.iconEraser(16, on?'var(--cream)':INK); }
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
        this.appendRevealCard();
        this.patchRevealBottom();
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
    const soundBtn = `<button data-action="toggleSound" aria-label="Sonido" style="width:44px;height:44px;border-radius:50%;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};display:flex;align-items:center;justify-content:center">${this.soundOn?this.iconSoundOn(19):this.iconSoundOff(19)}</button>`;
    let chatFab = '';
    if(this.state){
      const badge = this.local.chatUnread>0 ? `<div style="position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:${CORAL};border:2px solid ${INK};color:${INK};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">${this.local.chatUnread>9?'9+':this.local.chatUnread}</div>` : '';
      chatFab = `<div style="position:fixed;right:16px;bottom:16px;z-index:70">
        <div style="position:relative">
          <button data-action="toggleChat" aria-label="Chat" style="width:54px;height:54px;border-radius:50%;border:2.5px solid ${INK};background:${this.local.chatOpen?INK:CORAL};color:${this.local.chatOpen?'var(--cream)':INK};box-shadow:0 4px 0 ${INK};display:flex;align-items:center;justify-content:center">${this.local.chatOpen?this.iconClose(20,'var(--cream)'):this.iconChat(23)}</button>
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
        <button data-action="sendChat" aria-label="Enviar" style="flex:0 0 auto;width:44px;height:44px;border-radius:14px;border:2px solid ${INK};background:${INK};display:flex;align-items:center;justify-content:center">${this.iconSend(18)}</button>
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
      else if(t.dataset.role === 'imp-clue-input'){ this.local.impClueDraft = t.value.slice(0,40); }
      else if(t.dataset.role === 'imp-guess-input'){ this.local.impGuessDraft = t.value.slice(0,40); }
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
      if(t.dataset.role === 'imp-clue-input' && e.key==='Enter'){ e.preventDefault(); this.impSendClue(); }
      if(t.dataset.role === 'imp-guess-input' && e.key==='Enter'){ e.preventDefault(); this.impSendGuess(); }
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
      pickGameFromHome: (t)=>{ this.local.pendingGameId = t.dataset.game; this.local.screen='setup'; this.renderScreen(); },
      openHow: ()=>{ this.local.modal='how'; this.renderModals(); },
      closeModal: ()=>{ this.local.modal=null; this.local.showJoinName=false; this.renderModals(); },
      stop: (t,e)=>e.stopPropagation(),
      askLeave: ()=>{ this.local.modal='leave'; this.renderModals(); },
      createGame: ()=>this.createGame(),
      joinGame: ()=>this.joinGame(),
      confirmJoinName: ()=>this.confirmJoinName(),
      startGame: ()=>{
        if(this.state.gameId==='ronda') this.rondaStartMatch();
        else if(this.state.gameId==='unanimo') this.uStartGame();
        else if(this.state.gameId==='dibujalo') this.dStartGame();
        else if(this.state.gameId==='tuttifrutti') this.tfStartGame();
        else if(this.state.gameId==='impostor') this.impStartGame();
      },
      copyCode: ()=>{ try{ navigator.clipboard.writeText(this.state.code); }catch(e){} this.toast('Código copiado', MINT); },
      addBot: ()=>this.addBot(),
      removeBot: (t)=>this.removeBot(t.dataset.pid),
      // --- portal: host picking / configuring a game from the lobby ---
      pickGame: (t)=>{ this.local.hostFlow = t.dataset.game; this.renderScreen(); },
      backToPicker: ()=>{ this.local.hostFlow = null; this.renderScreen(); },
      backToPortal: ()=>this.backToPortal(),
      confirmUnanimoConfig: ()=>this.confirmUnanimoConfig(),
      confirmDibujaloConfig: ()=>this.confirmDibujaloConfig(),
      confirmTfConfig: ()=>this.confirmTfConfig(),
      confirmImpostorConfig: ()=>this.confirmImpostorConfig(),
      impSetRounds: (t)=>{ this.impDraft.rounds = Number(t.dataset.val); this.renderScreen(); },
      impSetCount: (t)=>{ this.impDraft.impostorCount = t.dataset.val==='auto' ? 'auto' : Number(t.dataset.val); this.renderScreen(); },
      impSetClueTime: (t)=>{ this.impDraft.clueTime = Number(t.dataset.val); this.renderScreen(); },
      impSetDiscussTime: (t)=>{ this.impDraft.discussTime = Number(t.dataset.val); this.renderScreen(); },
      impSetVoteTime: (t)=>{ this.impDraft.voteTime = Number(t.dataset.val); this.renderScreen(); },
      impSetMode: (t)=>{ this.impDraft.mode = t.dataset.val; this.renderScreen(); },
      impConfirmReady: ()=>this.impConfirmReady(),
      impSendClue: ()=>this.impSendClue(),
      impStartVoteNow: ()=>{ if(this.isHost) this.impStartVote(); },
      impVote: (t)=>this.impVote(t.dataset.pid),
      impContinueReveal: ()=>this.impContinueReveal(),
      impSendGuess: ()=>this.impSendGuess(),
      impStartResults: ()=>{ if(this.isHost) this.impStartResults(); },
      // --- Modo Ronda: config screen ---
      confirmRondaConfig: ()=>this.confirmRondaConfig(),
      rondaToggleGame: (t)=>{
        const id = t.dataset.game;
        const d = this.rondaDraft;
        const i = d.selectedGames.indexOf(id);
        if(i>=0){
          if(d.selectedGames.length<=2){ this.toast('Elegí al menos 2 juegos', CORAL); return; }
          d.selectedGames.splice(i,1);
          const oi = d.customOrder.indexOf(id); if(oi>=0) d.customOrder.splice(oi,1);
        } else {
          d.selectedGames.push(id);
          d.customOrder.push(id);
        }
        if(d.noRepeat) d.rounds = Math.min(d.rounds, d.selectedGames.length);
        this.renderScreen();
      },
      rondaSetOrderMode: (t)=>{ this.rondaDraft.orderMode = t.dataset.val; this.renderScreen(); },
      // Tap-to-build ordering: tapping a game in the "disponibles" pool
      // appends it to the order; tapping it again in the order list removes
      // it — no drag-and-drop needed for a handful of items.
      rondaOrderAdd: (t)=>{
        const id = t.dataset.game;
        if(!this.rondaDraft.customOrder.includes(id)) this.rondaDraft.customOrder.push(id);
        this.renderScreen();
      },
      rondaOrderRemove: (t)=>{
        const id = t.dataset.game;
        this.rondaDraft.customOrder = this.rondaDraft.customOrder.filter(g=>g!==id);
        this.renderScreen();
      },
      rondaToggleNoRepeat: ()=>{
        const d = this.rondaDraft;
        d.noRepeat = !d.noRepeat;
        if(d.noRepeat) d.rounds = Math.min(d.rounds, d.selectedGames.length);
        this.renderScreen();
      },
      rondaSetRounds: (t)=>{ this.rondaDraft.rounds = Number(t.dataset.val); this.renderScreen(); },
      // --- Modo Ronda: match flow ---
      rondaBeginSlot: ()=>this.rondaBeginSlot(),
      rondaNext: ()=>this.rondaNext(),
      rondaPlayAgain: ()=>this.rondaPlayAgain(),
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
      revealAll: ()=>{
        clearInterval(this.revealTick);
        const gs = this.groups(this.state.g.round);
        const grid = this.root.querySelector('[data-el="revealGrid"]');
        if(!grid){ this.local.reveal = gs.length; this.renderScreen(); return; }
        const byId = {}; this.players().forEach(p=>byId[p.id]=p);
        for(let i=this.local.reveal;i<gs.length;i++) grid.insertAdjacentHTML('beforeend', this.revealCardHtml(gs[i], byId));
        this.local.reveal = gs.length;
        this.patchRevealBottom();
      },
      goScore: ()=>{ this.local.screen='score'; this.local.selPid=this.myId; this.renderScreen(); },
      goRanking: ()=>{
        // Host-authoritative broadcast (like every other round transition) so
        // every player gets taken to the ranking screen together, instead of
        // only the host navigating locally while guests wait on reveal forever.
        if(!this.isHost || !this.state) return;
        const map = {unanimo:'ranking', tuttifrutti:'tfRanking', dibujalo:'dRanking', impostor:'impRanking'};
        const phase = map[this.state.gameId]; if(!phase) return;
        this.state.phase = phase;
        this.state.stage = (this.state.stage||0) + 1;
        this.broadcastState();
      },
      selectPlayer: (t)=>{ this.local.selPid = t.dataset.pid; this.patchScoreSelection(); },
      nextRound: ()=>{
        if(this.state.gameId==='unanimo') this.uNext();
        else if(this.state.gameId==='dibujalo') this.dNext();
        else if(this.state.gameId==='tuttifrutti') this.tfNext();
        else if(this.state.gameId==='impostor') this.impNext();
      },
      playAgain: ()=>{
        if(this.state.gameId==='unanimo') this.uPlayAgain();
        else if(this.state.gameId==='dibujalo') this.dPlayAgain();
        else if(this.state.gameId==='tuttifrutti') this.tfPlayAgain();
        else if(this.state.gameId==='impostor') this.impPlayAgain();
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
    else if(sc==='impWord') html = this.viewImpWord();
    else if(sc==='impClue') html = this.viewImpClue();
    else if(sc==='impDiscuss') html = this.viewImpDiscuss();
    else if(sc==='impVote') html = this.viewImpVote();
    else if(sc==='impReveal') html = this.viewImpReveal();
    else if(sc==='impGuess') html = this.viewImpGuess();
    else if(sc==='impResults') html = this.viewImpResults();
    else if(sc==='impRanking') html = this.viewImpRanking();
    else if(sc==='impFinal') html = this.viewImpFinal();
    else if(sc==='rondaIntro') html = this.viewRondaIntro();
    else if(sc==='rondaResults') html = this.viewRondaResults();
    else if(sc==='rondaFinal') html = this.viewRondaFinal();
    else html = this.viewHome();

    this.root.innerHTML = html;
    this.renderModals();
    this.renderHud();

    if(sc==='home' || sc==='setup' || sc==='lobby') this.startLobbyMusic(); else this.stopLobbyMusic();

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
    if(sc==='impClue'){
      this.later(()=>{ const el=this.root.querySelector('[data-role="imp-clue-input"]'); if(el) el.focus({preventScroll:true}); }, 50);
      const left = this.state ? Math.max(0, Math.round((this.state.g.clueEndAt - Date.now())/1000)) : 0;
      this.impPatchTimer('clue', left);
    }
    if(sc==='impDiscuss'){
      const left = this.state ? Math.max(0, Math.round((this.state.g.discussEndAt - Date.now())/1000)) : 0;
      this.impPatchTimer('discuss', left);
    }
    if(sc==='impVote'){
      const left = this.state ? Math.max(0, Math.round((this.state.g.voteEndAt - Date.now())/1000)) : 0;
      this.impPatchTimer('vote', left);
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
    return `<div data-role="avatar-picker" data-compact="${compact?1:0}">${this.avatarPickerInner(compact)}</div>`;
  }
  avatarPickerInner(compact){
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
    // Patch just the avatar picker's own markup in place — re-rendering the
    // whole modal/screen would recreate the .modal element and replay its
    // "pop" entrance animation on every single arrow click.
    const el = (this.modalRoot && this.modalRoot.querySelector('[data-role="avatar-picker"]'))
      || (this.root && this.root.querySelector('[data-role="avatar-picker"]'));
    if(el){ el.innerHTML = this.avatarPickerInner(el.dataset.compact==='1'); return; }
    if(this.local.showJoinName) this.renderModals();
    else this.renderScreen();
  }

  viewHome(){
    const letters = ['R','O','N','D','A'];
    const colors = [CORAL,VIOLET,YEL,MINT,BLUE];
    const rots = [-6,4,-4,5,-3];
    const gameCards = GAMES.map((g,i)=>this.gameCardHtml(g, 'pickGameFromHome', (0.15+i*0.08).toFixed(2)+'s')).join('');
    return `<div class="screen screen-wide" style="position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;pointer-events:none;z-index:0">
        <div style="position:absolute;top:2%;left:2%;animation:float 5s ease-in-out infinite"><div style="padding:9px 16px;border-radius:18px 18px 18px 4px;background:${CORAL};border:2px solid ${INK};font-weight:800;font-size:16px;transform:rotate(-8deg)">Che</div></div>
        <div style="position:absolute;top:4%;right:2%;animation:float 6s ease-in-out .8s infinite"><div style="padding:9px 16px;border-radius:18px 18px 4px 18px;background:#fff;border:2px solid ${INK};font-weight:800;font-size:16px;transform:rotate(6deg)">Dale</div></div>
      </div>
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:14px;padding-top:clamp(44px,9vh,84px)">
        <div style="display:flex;gap:clamp(4px,1.2vw,8px)">
          ${letters.map((ch,i)=>`<div style="animation:drop .6s cubic-bezier(.3,1.5,.5,1) ${(i*0.06).toFixed(2)}s both"><div style="width:clamp(46px,13vw,76px);height:clamp(56px,15.5vw,90px);border-radius:14px;background:${colors[i]};border:2.5px solid ${INK};box-shadow:0 5px 0 ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(30px,9vw,54px);transform:rotate(${rots[i]}deg)">${ch}</div></div>`).join('')}
        </div>
        <div class="heading" style="font-size:clamp(20px,5.5vw,26px);text-align:center;animation:rise .5s .4s both">Party games para jugar con amigos.</div>
      </div>
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:12px;padding-top:30px">
        <div style="text-align:center;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Juego individual</div>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:10px">${gameCards}</div>
      </div>
      <div style="position:relative;z-index:1;padding-top:20px">${this.rondaCardHtml('pickGameFromHome','0.5s')}</div>
      <div style="position:relative;z-index:1;width:100%;max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:14px;padding-top:22px;padding-bottom:24px">
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
    </div>`;
  }

  viewSetup(){
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
      <div class="top-bar"><button class="icon-btn" data-action="goHome" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Armá tu sala</div></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:16px 0">
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Tu nombre</div>
          <input data-role="cfg-name" value="${esc(this.local.cfgName)}" placeholder="¿Cómo te llamás?" style="height:60px;border-radius:16px;border:2px solid ${INK};background:#fff;padding:0 18px;font-family:'Figtree',sans-serif;font-weight:700;font-size:20px;color:${INK};outline:none">
        </div>
        <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:16px 18px">${this.avatarPicker()}</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">Elegís a qué jugar una vez adentro, con todos.</div>
          <button class="btn-primary" data-action="createGame">CREAR SALA</button>
        </div>
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
      if(this.local.hostFlow==='impostor') return this.viewImpostorConfig ? this.viewImpostorConfig() : this.viewComingSoonConfig('impostor');
      if(this.local.hostFlow==='ronda') return this.viewRondaConfig();
    }
    const hostId = s.hostId;
    const n = Math.max(6, pl.length);
    const codeChars = s.code.split('').map(c=>`<div style="width:clamp(48px,13vw,64px);height:clamp(58px,15vw,74px);border-radius:14px;background:#fff;border:2.5px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(30px,8vw,40px)">${c}</div>`).join('');
    const canAddBot = this.isHost && s.phase==='lobby' && pl.length < (s.maxPlayers||12);
    const slots = Array.from({length:n},(_,i)=>{
      const p = pl[i];
      if(!p){
        if(canAddBot) return `<button data-action="addBot" style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:20px;border:2px dashed var(--dashed);background:transparent;text-align:left;cursor:pointer;animation:breathe 2s ease-in-out infinite"><div style="flex:0 0 auto;width:46px;height:46px;border-radius:50%;border:2px dashed var(--dashed);display:flex;align-items:center;justify-content:center">${this.iconRobot(20)}</div><div style="font-size:14px;font-weight:800;color:var(--muted)">+ Agregar IA</div></button>`;
        return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:20px;border:2px dashed var(--dashed);animation:breathe 2s ease-in-out infinite"><div style="flex:0 0 auto;width:46px;height:46px;border-radius:50%;border:2px dashed var(--dashed)"></div><div style="font-size:15px;font-weight:700;color:var(--muted)">Esperando…</div></div>`;
      }
      const tag = p.isBot ? 'Jugador IA' : (p.id===this.myId ? (p.id===hostId?'Vos · Anfitrión':'Vos') : (p.id===hostId?'Anfitrión':'Listo para jugar'));
      return `<div style="position:relative;display:flex;align-items:center;gap:12px;padding:12px;border-radius:20px;background:#fff;border:2px solid ${INK};box-shadow:0 3px 0 ${INK};animation:pop .45s cubic-bezier(.3,1.5,.5,1) both">
        <div style="width:46px;height:46px;flex:0 0 auto">${avatarSVG(p.avatar,46)}</div>
        <div style="min-width:0;display:flex;flex-direction:column;gap:1px"><div style="font-weight:800;font-size:17px;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div><div style="display:flex;align-items:center;gap:4px;font-size:13px;font-weight:600;color:var(--muted)">${p.isBot?this.iconRobot(13):''}${tag}</div></div>
        ${p.isBot && this.isHost && s.phase==='lobby' ? `<button data-action="removeBot" data-pid="${p.id}" aria-label="Quitar bot" style="position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;border:2px solid ${INK};background:var(--cream);display:flex;align-items:center;justify-content:center">${this.iconClose(11)}</button>` : ''}
      </div>`;
    }).join('');

    let lowerSection, lowerWide = false;
    if(!s.gameId){
      if(this.isHost){ lowerSection = this.viewGamePicker(); lowerWide = true; }
      else lowerSection = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:24px 0">
          ${this.iconController(34)}
          <div class="heading" style="font-size:20px">${esc(this.playerById(hostId)?.name||'El anfitrión')} está eligiendo el juego…</div>
          <div style="font-size:14px;font-weight:600;color:var(--muted)">Ya te avisamos apenas arranque.</div>
        </div>`;
    } else if(s.gameId==='ronda'){
      const plan = s.match ? s.match.plan : [];
      const effMin = Math.max(2, ...(s.gameConfig.selectedGames||[]).map(id=>gameMeta(id).min));
      const minOk = pl.length >= effMin;
      const canStart = this.isHost && minOk;
      const rows = plan.map((gid,i)=>{
        const gm = gameMeta(gid);
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:${i===0?'0':'2px solid var(--panel-line)'}">
          <div style="width:26px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px;color:var(--muted)">${i+1}</div>
          <div style="width:34px;height:40px;border-radius:10px;background:${gm.colors[0]};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px">${gm.letters[0]}</div>
          <div style="font-weight:800;font-size:15px">${esc(gm.name)}</div>
        </div>`;
      }).join('');
      const bottom = this.isHost
        ? (canStart ? `<button class="btn-primary" data-action="startGame">INICIAR PARTIDA</button>`
          : `<div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">Se necesitan al menos ${effMin} jugadores para esta selección</div><button class="btn-primary" disabled>INICIAR PARTIDA</button>`)
        : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(hostId)?.name||'El anfitrión')} va a comenzar<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
      lowerSection = `
        <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:20px;background:${YEL};border:2px solid ${INK}">
          <div class="heading" style="display:flex;align-items:center;gap:8px;font-size:19px">${this.iconStar(20)} MODO RONDA</div>
          ${this.isHost?`<button data-action="pickGame" data-game="ronda" aria-label="Cambiar configuración" style="flex:0 0 auto;height:38px;padding:0 14px;border-radius:12px;border:2px solid ${INK};background:#fff;font-weight:800;font-size:13px;margin-left:auto">Editar</button>`:''}
        </div>
        <div class="card" style="padding:4px 16px">
          <div style="padding-top:10px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Rondas</div>
          ${rows}
        </div>
        <div class="sticky-bottom">${bottom}</div>`;
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

    return `<div class="screen screen-wide">
      <div class="top-bar"><button class="icon-btn" data-action="askLeave" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Lobby</div></div>
      <div style="width:100%;max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:18px">
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
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;${lowerWide?'':'width:100%;max-width:720px;margin:0 auto'}">${lowerSection}</div>
    </div>`;
  }

  gameConfigChips(gameId, cfg){
    if(!cfg) return '';
    let items = [];
    if(gameId==='unanimo') items = [cfg.rounds+(cfg.rounds===1?' ronda':' rondas'), cfg.words+' palabras', cfg.time+' s por ronda'];
    else if(gameId==='dibujalo') items = [cfg.rounds+(cfg.rounds===1?' ronda':' rondas'), cfg.chooseTime+'s para elegir', cfg.drawTime+'s para dibujar'];
    else if(gameId==='tuttifrutti') items = [cfg.rounds+(cfg.rounds===1?' ronda':' rondas'), cfg.categories.length+' categorías', cfg.time+'s por ronda'];
    else if(gameId==='impostor') items = [cfg.rounds+(cfg.rounds===1?' ronda':' rondas'), (cfg.impostorCount==='auto'?'Infiltrados automático':cfg.impostorCount+(cfg.impostorCount===1?' infiltrado':' infiltrados')), cfg.mode==='pure'?'Modo puro':'Modo clásico'];
    return items.map(t=>`<div style="padding:8px 14px;border-radius:999px;background:#fff;border:2px solid var(--line);font-size:14px;font-weight:700">${esc(t)}</div>`).join('');
  }

  // Shared big-card design used both on the home screen and the in-lobby
  // picker, so "pick a game" always looks the same everywhere in the app.
  gameCardHtml(g, actionName, delay){
    const est = gameEstimateMinutes(g.id);
    // The entrance animation lives on this wrapper (not the button) because
    // a CSS animation with fill-mode:both keeps "owning" any property it
    // touches even after it finishes — if it were on the button itself, it
    // would silently block :hover from ever moving that same button again.
    return `<div style="animation:rise .5s both;animation-delay:${delay||'0s'};display:flex;flex:0 1 240px;max-width:250px">
      <button class="press-card" data-action="${actionName}" data-game="${g.id}" style="position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:12px;padding:20px;border-radius:24px;background:#fff;border:2.5px solid ${INK};text-align:left;width:100%;height:100%">
        ${g.isNew?`<div style="position:absolute;top:16px;right:16px;padding:5px 12px;border-radius:999px;background:${MINT};border:2px solid ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:11px;letter-spacing:.06em">NUEVO</div>`:''}
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;gap:6px">
            <div style="width:48px;height:58px;border-radius:14px;background:${g.colors[0]};border:2.5px solid ${INK};box-shadow:0 3px 0 ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;transform:rotate(-4deg)">${g.letters[0]}</div>
            <div style="width:48px;height:58px;border-radius:14px;background:${g.colors[1]};border:2.5px solid ${INK};box-shadow:0 3px 0 ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;transform:rotate(4deg)">${g.letters[1]}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <div class="heading" style="font-size:24px">${esc(g.name)}</div>
            <div style="font-size:14px;font-weight:600;color:var(--muted);line-height:1.35">${esc(g.tagline)}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:999px;background:var(--cream);border:2px solid var(--line);font-size:13px;font-weight:700">${this.iconPersonSmall(13)} ${g.min}–${g.max} jugadores</div>
          <div style="display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:999px;background:var(--cream);border:2px solid var(--line);font-size:13px;font-weight:700">${this.iconClock(14)} ≈ ${est} min</div>
        </div>
      </button>
    </div>`;
  }
  viewGamePicker(){
    const cards = GAMES.map((g,i)=>this.gameCardHtml(g, 'pickGame', (i*0.06)+'s')).join('');
    return `<div style="display:flex;flex-direction:column;gap:10px">
      <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:0 4px">¿A qué jugamos?</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:14px">${cards}</div>
      <div style="padding-top:6px">${this.rondaCardHtml('pickGame','0.3s')}</div>
    </div>`;
  }
  // Distinct/starred card for Modo Ronda — deliberately different from the
  // plain white single-game cards (dark, full-width) since it's meant to
  // stand out as "the special option", not just a 5th game in the grid.
  rondaCardHtml(actionName, delay){
    return `<div style="animation:rise .5s both;animation-delay:${delay||'0s'};width:100%;max-width:560px;margin:0 auto">
      <button class="press-card" data-action="${actionName}" data-game="ronda" style="position:relative;display:flex;align-items:center;gap:16px;padding:20px 22px;border-radius:24px;background:${INK};border:2.5px solid ${INK};text-align:left;width:100%">
        <div style="position:absolute;top:14px;right:16px;padding:5px 12px;border-radius:999px;background:${MINT};border:2px solid ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:11px;letter-spacing:.06em;color:${INK}">NUEVO</div>
        <div style="flex:0 0 auto;width:56px;height:56px;border-radius:16px;background:${YEL};border:2.5px solid var(--cream);display:flex;align-items:center;justify-content:center">${this.iconStar(28, INK)}</div>
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
          <div class="heading" style="font-size:22px;color:var(--cream)">Modo Ronda</div>
          <div style="font-size:14px;font-weight:600;color:var(--cream);opacity:.85">Una partida. Varios juegos. Un solo ganador.</div>
        </div>
      </button>
    </div>`;
  }
  viewComingSoonConfig(gameId){
    const meta = gameMeta(gameId);
    return `<div class="screen screen-narrow">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">${esc(meta.name)}</div></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:40px 0">
        ${this.iconSoon(40)}
        <div class="heading" style="font-size:20px">Muy pronto</div>
      </div>
    </div>`;
  }
  viewUnanimoConfig(){
    const cfg = this.uDraft;
    const roundOpts = [1,2,3,4,5].map(n=>`<button data-action="setRounds" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.rounds===n?INK:'#fff'};color:${cfg.rounds===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${n}</button>`).join('');
    const timeOpts = [30,45,60,90].map(n=>`<button data-action="setTime" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.time===n?INK:'#fff'};color:${cfg.time===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${n}s</button>`).join('');
    const estimate = '≈ '+Math.max(1,Math.round(cfg.rounds*(cfg.time+35)/60))+' min de juego';
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Unánimo</div></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:16px 0">
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
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">${estimate}</div>
          <button class="btn-primary" data-action="confirmUnanimoConfig">SIGUIENTE</button>
        </div>
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
      return `<button data-action="tfToggleCategory" data-cat="${c.id}" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;border:2px solid ${INK};background:${on?MINT:'#fff'};font-weight:800;font-size:14px">${this.tfCatIcon(c.id,16)} ${esc(c.label)}</button>`;
    }).join('');
    const estimate = '≈ '+Math.max(1,Math.round(cfg.rounds*(cfg.time+40)/60))+' min de juego';
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Tutti Frutti</div></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:16px 0">
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
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">${estimate}</div>
          <button class="btn-primary" data-action="confirmTfConfig">SIGUIENTE</button>
        </div>
      </div>
    </div>`;
  }

  viewTfWrite(){
    const s = this.state, cfg = s.gameConfig;
    if(this.local.tfIntro){
      return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:20px">
        <div style="font-size:15px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">RONDA ${s.g.round+1}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px;letter-spacing:.1em;text-transform:uppercase;animation:rise .3s both">¡LETRA!</div>
        <div style="width:160px;height:160px;border-radius:32px;background:${YEL};border:3px solid ${INK};box-shadow:0 8px 0 ${INK};display:flex;align-items:center;justify-content:center;overflow:hidden;animation:pop .5s cubic-bezier(.3,1.6,.5,1) both">
          <span data-el="tfIntroLetter" style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:96px">?</span>
        </div>
      </div>`;
    }
    const fields = (cfg.categories||[]).map((catId,i)=>{
      const cat = TUTTI_CATEGORIES.find(c=>c.id===catId);
      const v = this.local.tfInputs[catId] || '';
      return `<div style="position:relative;display:flex;align-items:center">
        <div style="position:absolute;left:13px;width:32px;height:32px;border-radius:10px;background:${v?MINT:'#F1E7D8'};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;pointer-events:none">${cat?this.tfCatIcon(cat.id,17):this.iconQuestion(16)}</div>
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
          <button class="btn-primary" data-action="tfPressStop" style="height:66px;font-size:26px;background:${CORAL};display:flex;align-items:center;justify-content:center;gap:10px">${this.iconStopSign(24)} STOP</button>
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
          <div style="flex:0 0 auto;display:flex;align-items:center;padding:3px 9px;border-radius:999px;background:${item.valid?MINT:'var(--dup-bg)'};border:2px solid ${INK};font-weight:800;font-size:12px">${item.valid?'+'+item.pts:this.iconClose(11)}</div>
          ${p.id!==this.myId?`<button data-action="tfFlag" data-cat="${catId}" data-pid="${p.id}" aria-label="Marcar inválida" style="flex:0 0 auto;width:28px;height:28px;border-radius:8px;border:2px solid ${flaggedByMe?CORAL:'var(--line)'};background:${flaggedByMe?'#FFEDE6':'#fff'};display:flex;align-items:center;justify-content:center">${this.iconFlag(14, flaggedByMe?CORAL:INK)}</button>`:''}
        </div>`;
      }).join('');
      return `<div class="card" style="padding:14px 16px">
        <div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding-bottom:6px">${cat?this.tfCatIcon(cat.id,15):''} ${cat?esc(cat.label):esc(catId)}</div>
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
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:700;color:var(--muted)">Tocá ${this.iconFlag(13)} si te parece que una respuesta no vale</div>
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
      const deltaText = d>0?'▲ Subió '+d : d<0?'▼ Bajó '+(-d) : 'Sin cambios';
      const deltaColor = d>0?'#0E8A66':d<0?'#B3341A':INK;
      // Entrance animation only on the very first paint (rankPhase 0) — this
      // screen re-renders once more 900ms later to reveal point deltas, and
      // without this guard every row would replay its "appear" animation a
      // second time, looking like the whole screen loaded twice.
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
      ? `<button class="btn-primary" data-action="nextRound">${isLast?'VER RESULTADO FINAL':'SIGUIENTE RONDA'}</button>`
      : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(s.hostId)?.name||'El anfitrión')} va a continuar<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
    return `<div class="screen">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(36px,10vw,52px);letter-spacing:-.02em;line-height:1">CLASIFICACIÓN</div>
        <div style="font-size:16px;font-weight:700;color:var(--muted)">Después de la ronda ${s.g.round+1} de ${cfg.rounds}</div>
      </div>
      <div style="display:flex;gap:6px;justify-content:center">${dots}</div>
      <div style="position:relative;height:${pl.length*104}px">${rows}</div>
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
      ? `<button class="btn-primary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando a ${esc(this.playerById(s.hostId)?.name||'el anfitrión')}…</div>`;
    return `<div style="position:relative;min-height:100vh;overflow:hidden">
      <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confettiHtml}</div>
      <div style="position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
          <div class="heading" style="font-size:clamp(40px,12vw,84px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${esc(winnerTitle)}</div>
          <div class="heading" style="font-size:24px">${tot[w.id]} puntos</div>
        </div>
        <div class="final-layout">
          <div class="final-ranking">
            <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px">${podium}</div>
            <div style="width:100%;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:8px 18px">${finalRows}</div>
          </div>
          <div class="final-stats">${statsHtml}</div>
        </div>
        <div class="sticky-bottom">
          <div style="max-width:560px;margin:0 auto;padding:0 14px;display:flex;flex-direction:row;align-items:center;gap:12px">${bottom}</div>
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
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Dibujalo</div></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:16px 0">
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
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">${estimate}</div>
          <button class="btn-primary" data-action="confirmDibujaloConfig">SIGUIENTE</button>
        </div>
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
        <div class="heading" style="display:flex;align-items:center;gap:8px;font-size:22px">${this.iconPalette(22)} ${esc(drawer?drawer.name.toUpperCase():'?')} ESTÁ ELIGIENDO...</div>
        ${timerChip}
      </div>`;
    }
    const opts = this.local.dOptions;
    if(!opts){
      return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:20px"><div class="spinner"></div><div style="font-weight:700;color:var(--muted)">Preparando tus opciones…</div></div>`;
    }
    const cards = opts.map((o,i)=>`<button class="press-card" data-action="dChooseOption" data-i="${i}" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 14px;border-radius:22px;background:#fff;border:2.5px solid ${INK}">
      <div style="font-size:40px">${o.emoji||this.iconPalette(34)}</div>
      <div class="heading" style="font-size:20px;text-align:center">${esc(o.word.toUpperCase())}</div>
      <div style="font-size:12px;font-weight:700;color:var(--muted)">${esc(o.category)}</div>
    </button>`).join('');
    return `<div class="screen screen-narrow">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding-top:10px">
        <div style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">${this.iconPalette(16)} Elegí qué dibujar</div>
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
    const hintChip = (s.g.hintUsed[r] && !isMe) ? `<div style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;background:${YEL};border:2px solid ${INK};font-weight:800;font-size:13px">${this.iconBulb(14)} ${esc(s.g.category[r]||'')}</div>` : '';
    const toolbar = isMe ? `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px;background:#fff;border:2px solid ${INK};border-radius:16px">
        <div style="display:flex;gap:6px;flex-wrap:wrap">${colorBtns}</div>
        <div style="width:2px;height:24px;background:var(--line)"></div>
        <div style="display:flex;gap:6px">${sizeBtns}</div>
        <div style="width:2px;height:24px;background:var(--line)"></div>
        <button data-action="dSetTool" data-tool="eraser" data-el="dEraserBtn" aria-label="Borrador" style="height:34px;width:38px;border-radius:10px;border:2px solid ${INK};background:${this.local.dTool==='eraser'?INK:'#fff'};display:flex;align-items:center;justify-content:center">${this.iconEraser(16, this.local.dTool==='eraser'?'var(--cream)':INK)}</button>
        <button data-action="dClearCanvas" aria-label="Borrar todo" style="height:34px;width:38px;border-radius:10px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center">${this.iconTrash(16)}</button>
      </div>` : '';
    const guessArea = isMe
      ? `<div style="text-align:center;font-size:13px;font-weight:700;color:var(--muted)">Mirá cómo va la adivinanza mientras dibujás</div>`
      : already
        ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:16px;background:${MINT};border:2px solid ${INK};font-weight:800;font-size:16px">${this.iconCheckSmall()} ¡ACERTASTE!</div>`
        : `<div style="display:flex;gap:8px">
            <input data-role="d-guess-input" value="${esc(this.local.dGuessDraft)}" placeholder="¿Qué es?" autocomplete="off" style="flex:1;min-width:0;height:52px;border-radius:16px;border:2px solid ${INK};background:#fff;padding:0 16px;font-size:17px;font-weight:700;color:${INK};outline:none">
            <button data-action="dSendGuess" style="flex:0 0 auto;height:52px;padding:0 22px;border-radius:16px;border:2px solid ${INK};background:${CORAL};font-weight:800;font-size:16px">ADIVINAR</button>
          </div>`;
    return `<div style="min-height:100vh;display:flex;flex-direction:column">
      <div style="position:sticky;top:0;z-index:10;background:var(--cream)">
        <div style="max-width:1500px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:12px">
          <button class="icon-btn" data-action="askLeave" aria-label="Salir">${this.iconClose()}</button>
          <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${this.iconPalette(18)}${isMe?'Estás dibujando':esc(drawer?drawer.name:'?')+' está dibujando'}</div>
          <div data-el="dTimerBox" style="display:flex;align-items:center;gap:8px;height:46px;padding:0 14px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px">${this.iconClock()}<span data-el="dTimerText">${mmss(cfg.drawTime)}</span></div>
        </div>
      </div>
      <div style="flex:1;width:100%;max-width:1500px;margin:0 auto;padding:16px 20px 20px;display:flex;flex-wrap:wrap;gap:22px;align-items:stretch">
        <div style="flex:2.2 1 620px;min-width:0;display:flex;flex-direction:column;gap:10px">
          ${isMe?`<div style="background:${YEL};border:2px solid ${INK};border-radius:16px;padding:10px 14px;text-align:center"><span style="font-weight:800;font-size:15px">TU PALABRA ES: ${esc((this.local.dChosenWord||'').toUpperCase())}</span><div style="font-size:12px;font-weight:700;color:var(--muted)">No la muestres.</div></div>`:''}
          ${hintChip}
          <canvas id="dCanvas" width="900" height="620" style="width:100%;height:auto;aspect-ratio:900/620;background:#fff;border:2.5px solid ${INK};border-radius:20px;box-shadow:0 5px 0 ${INK};cursor:${isMe?'crosshair':'default'}"></canvas>
          ${toolbar}
        </div>
        <div style="flex:1.3 1 380px;min-width:0;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px">
            <div class="heading" style="font-size:17px">Adivinanzas</div>
            <div style="font-size:14px;font-weight:800;color:var(--muted)"><span data-el="dCorrectCount">${correctCount} / ${guessersTotal}</span> acertaron</div>
          </div>
          <div class="card" style="padding:10px 14px;flex:1;min-height:260px;max-height:min(60vh,640px);overflow-y:auto">${this.dGuessFeedHtml()}</div>
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
        <div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${nobodyGuessed?this.iconSad(18):this.iconParty(18)}${nobodyGuessed?'NADIE LO ADIVINÓ':'¡SE ACABÓ LA RONDA!'}</div>
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
      const deltaText = d>0?'▲ Subió '+d : d<0?'▼ Bajó '+(-d) : 'Sin cambios';
      const deltaColor = d>0?'#0E8A66':d<0?'#B3341A':INK;
      // Entrance animation only on the very first paint (rankPhase 0) — this
      // screen re-renders once more 900ms later to reveal point deltas, and
      // without this guard every row would replay its "appear" animation a
      // second time, looking like the whole screen loaded twice.
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
      ? `<button class="btn-primary" data-action="nextRound">${isLast?'VER RESULTADO FINAL':'SIGUIENTE DIBUJANTE'}</button>`
      : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(s.hostId)?.name||'El anfitrión')} va a continuar<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
    return `<div class="screen">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(36px,10vw,52px);letter-spacing:-.02em;line-height:1">CLASIFICACIÓN</div>
        <div style="font-size:16px;font-weight:700;color:var(--muted)">Después de la ronda ${s.g.round+1} de ${cfg.rounds}</div>
      </div>
      <div style="display:flex;gap:6px;justify-content:center">${dots}</div>
      <div style="position:relative;height:${pl.length*104}px">${rows}</div>
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
      ? `<button class="btn-primary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando a ${esc(this.playerById(s.hostId)?.name||'el anfitrión')}…</div>`;
    return `<div style="position:relative;min-height:100vh;overflow:hidden">
      <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confettiHtml}</div>
      <div style="position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
          <div class="heading" style="font-size:clamp(40px,12vw,84px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${esc(winnerTitle)}</div>
          <div class="heading" style="font-size:24px">${tot[w.id]} puntos</div>
        </div>
        <div class="final-layout">
          <div class="final-ranking">
            <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px">${podium}</div>
            <div style="width:100%;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:8px 18px">${finalRows}</div>
          </div>
          <div class="final-stats">${statsHtml}</div>
        </div>
        <div class="sticky-bottom">
          <div style="max-width:560px;margin:0 auto;padding:0 14px;display:flex;flex-direction:row;align-items:center;gap:12px">${bottom}</div>
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

  revealCardHtml(g, byId){
    const mine = g.pids.includes(this.myId), n = g.pids.length;
    const kind = n>1 ? (mine?'match':'shared') : 'solo';
    const bg = kind==='match'?CORAL:kind==='shared'?'#fff':'transparent';
    const border = kind==='solo' ? '2px dashed var(--dashed)' : `2px solid ${INK}`;
    const shadow = kind==='solo' ? 'none' : `0 4px 0 ${INK}`;
    const fg = kind==='solo' ? 'var(--muted)' : INK;
    const countBg = kind==='solo' ? 'var(--panel-line)' : INK;
    const countFg = kind==='solo' ? 'var(--muted)' : 'var(--cream)';
    const tag = kind==='match' ? '¡Vos también!' : kind==='solo' ? 'Solo '+(g.pids[0]===this.myId?'vos':(byId[g.pids[0]]?.name||'?')) : '';
    const avatars = g.pids.map(id=>`<div style="width:30px;height:30px;flex:0 0 auto">${avatarSVG(byId[id]&&byId[id].avatar,30)}</div>`).join('');
    return `<div style="background:${bg};border:${border};box-shadow:${shadow};color:${fg};border-radius:22px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;animation:popSoft .35s ease-out both">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="min-width:0;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:30px;letter-spacing:-.01em;overflow-wrap:anywhere">${esc(g.label)}</div>
        <div style="flex:0 0 auto;min-width:50px;height:50px;border-radius:15px;background:${countBg};color:${countFg};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px">${n}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div style="display:flex;gap:4px">${avatars}</div>
        ${tag?`<div style="font-size:14px;font-weight:800">${esc(tag)}</div>`:''}
      </div>
    </div>`;
  }
  revealBottomHtml(){
    const s = this.state, gs = this.groups(s.g.round);
    const revealDone = this.local.reveal >= gs.length;
    if(!revealDone){
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;height:62px;padding:0 8px 0 20px;border-radius:18px;background:#fff;border:2px solid ${INK}">
        <div style="font-weight:800;font-size:16px">Revelando ${Math.min(this.local.reveal,gs.length)} de ${gs.length}</div>
        <button data-action="revealAll" style="height:46px;padding:0 16px;border-radius:13px;border:0;background:var(--panel-line);color:${INK};font-weight:800;font-size:15px">Mostrar todo</button>
      </div>`;
    }
    const mp = this.points(s.g.round)[this.myId];
    const m = mp ? mp.items.filter(x=>x.pts>0).length : 0;
    const summary = 'Coincidiste en '+m+' de '+(mp?mp.items.length:0)+' palabras';
    return `<div style="text-align:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:19px;animation:rise .4s both">${esc(summary)}</div>
      <button class="btn-primary" data-action="goScore">VER PUNTOS</button>`;
  }
  // Called on every reveal tick instead of a full renderScreen() — otherwise
  // every already-shown card would replay its entrance animation each time
  // a new one is added, which looked like the whole grid was jolting.
  appendRevealCard(){
    const grid = this.root.querySelector('[data-el="revealGrid"]');
    if(!grid){ this.renderScreen(); return; }
    const gs = this.groups(this.state.g.round);
    const g = gs[this.local.reveal-1];
    if(!g) return;
    const byId = {}; this.players().forEach(p=>byId[p.id]=p);
    grid.insertAdjacentHTML('beforeend', this.revealCardHtml(g, byId));
  }
  patchRevealBottom(){
    const el = this.root.querySelector('[data-el="revealBottom"]');
    if(el) el.innerHTML = this.revealBottomHtml();
  }
  viewReveal(){
    const s = this.state;
    const gs = this.groups(s.g.round);
    const byId = {}; this.players().forEach(p=>byId[p.id]=p);
    const cards = gs.slice(0, this.local.reveal).map(g=>this.revealCardHtml(g, byId)).join('');
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
      <div data-el="revealGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">${cards}</div>
      <div class="sticky-bottom">
        <div data-el="revealBottom" style="max-width:520px;margin:0 auto;display:flex;flex-direction:column;gap:10px">${this.revealBottomHtml()}</div>
      </div>
    </div>`;
  }

  scoreDetailHtml(){
    const s = this.state, pts = this.points(s.g.round);
    const selId = this.local.selPid || this.myId;
    const sel = this.playerById(selId) || this.playerById(this.myId);
    const breakTitle = sel.id===this.myId ? 'Cómo sumaste' : 'Cómo sumó '+sel.name;
    const breakdown = pts[sel.id].items.slice().sort((a,b)=>b.pts-a.pts).map(it=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:2px solid var(--panel-line);opacity:${it.pts>0?1:0.5}">
      <div style="flex:0 0 auto;min-width:0;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px;letter-spacing:.02em">${esc(it.label.toUpperCase())}</div>
      <div style="flex:1;min-width:0;font-size:14px;font-weight:600;color:var(--muted)">→ ${it.pts>0?'coincidió con '+it.pts+(it.pts>1?' jugadores':' jugador'):'nadie más la puso'}</div>
      <div style="flex:0 0 auto;padding:4px 10px;border-radius:999px;background:${it.pts>0?MINT:'var(--panel-line)'};border:2px solid ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px">+${it.pts}</div>
    </div>`).join('');
    return `<div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:6px"><div class="heading" style="font-size:20px">${esc(breakTitle)}</div><div class="heading" style="font-size:20px">+${pts[sel.id].total} pts</div></div>${breakdown}`;
  }
  // Patches the selection highlight + detail panel only — selectPlayer used
  // to call renderScreen(), which rebuilt the whole ranking list and
  // replayed every row's staggered entrance animation on every tap.
  patchScoreSelection(){
    const selId = this.local.selPid || this.myId;
    this.root.querySelectorAll('[data-role="score-row"]').forEach(btn=>{
      const on = btn.dataset.pid === selId;
      btn.style.border = `2px solid ${on?INK:'var(--line)'}`;
      btn.style.boxShadow = on ? `0 4px 0 ${INK}` : 'none';
    });
    const detailEl = this.root.querySelector('[data-el="scoreDetail"]');
    if(detailEl) detailEl.innerHTML = this.scoreDetailHtml();
  }
  viewScore(){
    const s = this.state, pl = this.players();
    const pts = this.points(s.g.round);
    const order = pl.slice().sort((a,b)=>pts[b.id].total-pts[a.id].total||a.name.localeCompare(b.name));
    const rows = order.map((p,i)=>{
      const sel = this.local.selPid===p.id;
      const label = p.id===this.myId ? p.name+' (vos)' : p.name;
      return `<button data-role="score-row" data-action="selectPlayer" data-pid="${p.id}" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px 12px 12px;border-radius:20px;background:${p.id===this.myId?'#FFEDE6':'#fff'};border:2px solid ${sel?INK:'var(--line)'};box-shadow:${sel?`0 4px 0 ${INK}`:'none'};text-align:left;color:${INK};animation:rise .4s both;animation-delay:${(i*0.08).toFixed(2)}s">
        <div style="flex:0 0 auto;width:36px;height:36px;border-radius:12px;background:${RANKBG[i]||'#F1E7D8'};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${i+1}</div>
        <div style="width:42px;height:42px;flex:0 0 auto">${avatarSVG(p.avatar,42)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:18px">${esc(label)}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px">${pts[p.id].total} pts</div>
      </button>`;
    }).join('');
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
        <div data-el="scoreDetail" style="flex:1 1 340px;min-width:0;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:16px 18px;display:flex;flex-direction:column;gap:4px">${this.scoreDetailHtml()}</div>
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
      const deltaText = d>0?'▲ Subió '+d : d<0?'▼ Bajó '+(-d) : 'Sin cambios';
      const deltaColor = d>0?'#0E8A66':d<0?'#B3341A':INK;
      // Entrance animation only on the very first paint (rankPhase 0) — this
      // screen re-renders once more 900ms later to reveal point deltas, and
      // without this guard every row would replay its "appear" animation a
      // second time, looking like the whole screen loaded twice.
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
      <div style="position:relative;height:${pl.length*104}px">${rows}</div>
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
      ? `<button class="btn-primary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando a ${esc(this.playerById(this.state.hostId)?.name||'el anfitrión')}…</div>`;
    return `<div style="position:relative;min-height:100vh;overflow:hidden">
      <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confettiHtml}</div>
      <div style="position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
          <div class="heading" style="font-size:clamp(40px,12vw,84px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${esc(winnerTitle)}</div>
          <div class="heading" style="font-size:24px">${tot[w.id]} puntos</div>
        </div>
        <div class="final-layout">
          <div class="final-ranking">
            <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px">${podium}</div>
            <div style="width:100%;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:8px 18px">${finalRows}</div>
          </div>
          <div class="final-stats">${statsHtml}</div>
        </div>
        <div class="sticky-bottom">
          <div style="max-width:560px;margin:0 auto;padding:0 14px;display:flex;flex-direction:row;align-items:center;gap:12px">${bottom}</div>
        </div>
      </div>
    </div>`;
  }

  /* ---------- icons ---------- */
  iconBack(){ return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"></path></svg>`; }
  iconClose(px, color){ return `<svg width="${px||18}" height="${px||18}" viewBox="0 0 24 24" fill="none" stroke="${color||INK}" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>`; }
  iconClock(){ return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2M9 2h6"></path></svg>`; }
  iconCopy(){ return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="3"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>`; }
  iconCheckSmall(){ return `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>`; }
  iconCheckBig(){ return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>`; }
  _icon(px, color, sw, inner){ return `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`; }
  iconSoundOn(px){ return this._icon(px||18, INK, 2.2, `<path d="M4 10v4h3.5L13 18V6L7.5 10H4z"></path><path d="M17 9.5c1.2 1.2 1.2 3.8 0 5M19.5 7c2.2 2.2 2.2 7.8 0 10"></path>`); }
  iconSoundOff(px){ return this._icon(px||18, INK, 2.2, `<path d="M4 10v4h3.5L13 18V6L7.5 10H4z"></path><path d="M17 9l5 5M22 9l-5 5"></path>`); }
  iconChat(px){ return this._icon(px||22, INK, 2.2, `<path d="M4 5h16v10H9l-4 4v-4H4V5z"></path>`); }
  iconSend(px){ return this._icon(px||18, 'var(--cream)', 2.2, `<path d="M4 12l16-8-6 16-3-6-7-2z"></path>`); }
  iconRobot(px){ return this._icon(px||16, INK, 2, `<rect x="4" y="9" width="16" height="11" rx="3"></rect><path d="M12 9V5"></path><circle cx="12" cy="3.2" r="1.3" fill="${INK}"></circle><circle cx="8.5" cy="14.5" r="1.2" fill="${INK}"></circle><circle cx="15.5" cy="14.5" r="1.2" fill="${INK}"></circle><path d="M9 18h6"></path>`); }
  iconFlag(px, color){ return this._icon(px||16, color||INK, 2.2, `<path d="M6 3v18"></path><path d="M6 4h11l-3 4 3 4H6"></path>`); }
  iconParty(px, color){ return this._icon(px||18, color||INK, 2.2, `<path d="M12 3v3M5 6l2 2M19 6l-2 2M3 13l3-1M21 13l-3-1"></path><path d="M6 21l3-11 9 3-8 9-4-1z"></path>`); }
  iconSad(px, color){ return this._icon(px||18, color||INK, 2.2, `<circle cx="12" cy="12" r="9"></circle><circle cx="9" cy="10" r="1" fill="${color||INK}"></circle><circle cx="15" cy="10" r="1" fill="${color||INK}"></circle><path d="M8.5 17c1-1.6 2.2-2.4 3.5-2.4s2.5.8 3.5 2.4"></path>`); }
  iconPalette(px, color){ return this._icon(px||18, color||INK, 2.1, `<path d="M12 4a8 7 0 1 0 0 14c1.3 0 1.8-.9 1.8-1.8 0-.8-.4-1.3-.4-2.1 0-1.1.9-1.8 2.1-1.8H17a3 3 0 0 0 3-3c0-3.5-3.6-6.3-8-6.3z"></path><circle cx="7.8" cy="10" r=".9" fill="${color||INK}"></circle><circle cx="9.2" cy="6.8" r=".9" fill="${color||INK}"></circle><circle cx="13.6" cy="6.6" r=".9" fill="${color||INK}"></circle>`); }
  iconController(px){ return this._icon(px||24, INK, 2.2, `<rect x="2.5" y="8" width="19" height="10" rx="5"></rect><path d="M7 11v4M5 13h4M15.2 12.2h.01M18 14.2h.01"></path>`); }
  iconSoon(px){ return this._icon(px||28, INK, 2.2, `<path d="M6 3h12M6 21h12"></path><path d="M7 3c0 5 3 6 5 8-2 2-5 3-5 8M17 3c0 5-3 6-5 8 2 2 5 3 5 8"></path>`); }
  iconStopSign(px){ return this._icon(px||20, INK, 2.4, `<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"></path>`); }
  iconBulb(px, color){ return this._icon(px||16, color||INK, 2.1, `<path d="M9 18h6M10 21h4"></path><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9v.2h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"></path>`); }
  iconEraser(px, color){ return this._icon(px||16, color||INK, 2.1, `<path d="M4 16l9-9 6 6-9 9H7z"></path><path d="M4 16l3.5 3.5H10"></path>`); }
  iconTrash(px){ return this._icon(px||16, INK, 2.1, `<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"></path><path d="M10 11v6M14 11v6"></path>`); }
  iconQuestion(px){ return this._icon(px||16, INK, 2.1, `<circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.3c0-1.5 1.2-2.6 2.6-2.6s2.6 1 2.6 2.3c0 1.7-2.6 1.9-2.6 4"></path><circle cx="12" cy="16.6" r="1" fill="${INK}"></circle>`); }
  iconEye(px){ return this._icon(px||16, INK, 2.1, `<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"></path><circle cx="12" cy="12" r="2.6"></circle>`); }
  iconPersonSmall(px, color){ return this._icon(px||14, color||INK, 2.4, `<circle cx="12" cy="8" r="4"></circle><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"></path>`); }
  tfCatIcon(id, px){
    const s = px||18;
    switch(id){
      case 'nombre': return this._icon(s, INK, 2.1, `<circle cx="12" cy="8" r="4"></circle><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"></path>`);
      case 'animal': return this._icon(s, INK, 2.1, `<circle cx="12" cy="15" r="3.4"></circle><circle cx="6" cy="8" r="2"></circle><circle cx="18" cy="8" r="2"></circle><circle cx="9" cy="5" r="2"></circle><circle cx="15" cy="5" r="2"></circle>`);
      case 'pais': return this._icon(s, INK, 2.1, `<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"></path>`);
      case 'ciudad': return this._icon(s, INK, 2.1, `<path d="M4 20V10l4-3 4 3v10M12 20V6l4-3 4 3v14M4 20h16"></path>`);
      case 'comida': return this._icon(s, INK, 2.1, `<path d="M6 2v8a2 2 0 0 0 4 0V2M8 10v12M18 2c-2 2-2 6 0 8v12"></path>`);
      case 'objeto': return this._icon(s, INK, 2.1, `<path d="M4 8l8-4 8 4-8 4-8-4zM4 8v9l8 4M20 8v9l-8 4M12 12v9"></path>`);
      case 'profesion': return this._icon(s, INK, 2.1, `<rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"></path>`);
      case 'color': return this.iconPalette(s);
      case 'pelicula': return this._icon(s, INK, 2.1, `<path d="M3 8l2-4h4l-2 4M9 8l2-4h4l-2 4M15 8l2-4h4l-2 4"></path><rect x="3" y="8" width="18" height="12" rx="1.5"></rect>`);
      case 'famoso': return this._icon(s, INK, 2.1, `<path d="M12 2l2.6 6.6L21 9l-5 4.3L17.5 20 12 16.3 6.5 20 8 13.3 3 9l6.4-.4z"></path>`);
      case 'marca': return this._icon(s, INK, 2.1, `<path d="M11 3h6a2 2 0 0 1 2 2v6L11 19 3 11z"></path><circle cx="15.5" cy="7.5" r="1.3" fill="${INK}"></circle>`);
      case 'planta': return this._icon(s, INK, 2.1, `<path d="M12 21V9"></path><path d="M12 9C12 4 8 3 4 3c0 5 2 8 8 8zM12 12c0-4 4-5 8-5 0 5-2 8-8 8"></path>`);
      default: return this.iconQuestion(s);
    }
  }
  iconMask(px, color){ return this._icon(px||18, color||INK, 2.1, `<path d="M2 9c3-3 6-3 9-1 3-2 6-2 9 1-1 6-4 8-7 6-1-1-3-1-4 0-3 2-6 0-7-6z"></path><circle cx="7.5" cy="9.3" r="1.3" fill="${color||INK}"></circle><circle cx="16.5" cy="9.3" r="1.3" fill="${color||INK}"></circle>`); }
  iconStar(px, color){ return this._icon(px||18, color||INK, 2.1, `<path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6-5.4-3-5.4 3 1.2-6-4.4-4.1 6-.7z"></path>`); }
  iconShuffle(px, color){ return this._icon(px||16, color||INK, 2.1, `<path d="M4 6h3.5l9 12H20M4 18h3.5l3-4M13.5 6H20"></path><path d="M17.5 3l3 3-3 3M17.5 15l3 3-3 3"></path>`); }
  iconListOrdered(px, color){ return this._icon(px||16, color||INK, 2.1, `<path d="M9 6h11M9 12h11M9 18h11"></path><path d="M4 5h1v3M4 8h2M4.5 13c1-1 2-1 2 .3 0 .8-1 1-1 1.7h2M4 20h2l-2 2h2"></path>`); }
  iconTrophy(px, color){ return this._icon(px||18, color||INK, 2.1, `<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"></path><path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4"></path><path d="M12 13v3M9 20h6M9.5 16.5h5l.5 3.5h-6z"></path>`); }

  /* ================= IMPOSTOR =================
     Security model: the actual secret (who's the impostor, both words)
     lives ONLY in this.impSecret — a host-local variable, never written
     into this.state — exactly like Dibujalo's this.dSecretWord. Each
     player's own word/role is delivered as a targeted broadcast (only
     that id's client acts on it). It's only copied into the shared,
     broadcast state.g once the round reaches 'impReveal', at which point
     showing it to everyone is the whole point. Individual votes are
     tallied host-side in this.impVotes (also never broadcast raw) until
     the vote closes — only the plain "N/M votaron" count is public. */
  confirmImpostorConfig(){
    if(!this.isHost) return;
    this.state.gameId = 'impostor';
    this.state.gameConfig = { ...this.impDraft };
    this.state.g = this.impFreshG();
    this.state.stage = (this.state.stage||0) + 1;
    this.local.hostFlow = null;
    this.broadcastState();
  }
  impFreshG(){
    return {
      round:-1, usedPairs:[], order:[], turnIndex:0,
      clueEndAt:0, discussEndAt:0, voteEndAt:0,
      clues:[], ready:[], voteCount:[], votes:[], voteDetail:[],
      accusedId:[], impostorIds:[], groupWord:[], impostorWord:[],
      caughtId:[], guessResult:[], roundScores:[],
    };
  }
  impStartGame(){
    if(!this.isHost) return;
    this.state.g = this.impFreshG();
    this.impStartRound(0);
  }
  impAutoCount(n){ return n>=10 ? 2 : 1; }
  impResolveCount(n){
    const c = this.state.gameConfig.impostorCount;
    if(c==='auto' || c==null) return this.impAutoCount(n);
    return Math.min(Number(c), Math.max(1, Math.floor((n-1)/2)));
  }
  impStartRound(r){
    const [groupWord, impostorWord] = pickImpostorPair(this.state.g.usedPairs);
    this.state.g.usedPairs = [...this.state.g.usedPairs, [groupWord, impostorWord]];
    const ids = this.players().map(p=>p.id);
    const shuffled = ids.slice();
    for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
    const impostorIds = shuffled.slice(0, this.impResolveCount(ids.length));
    const order = ids.slice();
    for(let i=order.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
    const pureMode = this.state.gameConfig.mode==='pure';
    this.impSecret = { round:r, impostorIds, groupWord, impostorWord: pureMode ? null : impostorWord };
    this.impVotes = null;
    this.state.g.round = r;
    this.state.g.order = order;
    this.state.g.turnIndex = 0;
    this.state.g.clues[r] = [];
    this.state.g.ready[r] = {};
    this.state.g.voteCount[r] = 0;
    this.state.g.accusedId[r] = null;
    this.state.g.impostorIds[r] = null;
    this.state.g.groupWord[r] = null;
    this.state.g.impostorWord[r] = null;
    this.state.g.caughtId[r] = null;
    this.state.g.guessResult[r] = null;
    this.state.phase = 'impWord';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
    this.players().forEach(p=>{
      const isImp = impostorIds.includes(p.id);
      const word = isImp ? (pureMode ? null : impostorWord) : groupWord;
      const allyId = isImp && impostorIds.length>1 ? impostorIds.find(id=>id!==p.id) : null;
      const allyName = allyId ? (this.playerById(allyId)?.name || null) : null;
      const payload = { round:r, isImpostor:isImp, word, allyName };
      if(p.id === this.myId) this.impReceiveWord(payload);
      else if(!p.isBot) this.send('impWord', { to:p.id, ...payload });
      if(p.isBot){
        this.later(()=>{
          if(!this.isHost || this.state.phase!=='impWord' || this.state.g.round!==r) return;
          this.impSetReady(p.id);
        }, 700 + Math.random()*1300);
      }
    });
    clearInterval(this.impWatch);
    const readyDeadline = Date.now() + 25000;
    this.impWatch = setInterval(()=>{
      if(!this.isHost || this.state.phase!=='impWord' || this.state.g.round!==r){ clearInterval(this.impWatch); return; }
      if(Date.now() >= readyDeadline){
        clearInterval(this.impWatch);
        let changed = false;
        this.players().forEach(p=>{ if(!this.state.g.ready[r][p.id]){ this.state.g.ready[r][p.id]=true; changed=true; } });
        if(changed) this.broadcastState();
        this.impStartClue();
      }
    }, 500);
  }
  // Guest/host client-side: received our own private word/role.
  impReceiveWord(payload){
    this.local.impMyWord = payload.word;
    this.local.impIsImpostor = payload.isImpostor;
    this.local.impAllyName = payload.allyName;
    this.local.impWordArrived = true;
    this.renderScreen();
  }
  runImpIntro(){
    this.later(()=>{ this.local.impCountdown=3; this.renderScreen(); }, 900);
    this.later(()=>{ this.local.impCountdown=2; this.renderScreen(); }, 1600);
    this.later(()=>{ this.local.impCountdown=1; this.renderScreen(); }, 2300);
    this.later(()=>{ this.local.impIntro=false; this.local.impCountdown=null; this.renderScreen(); }, 3000);
  }
  impConfirmReady(){
    if(!this.state || this.local.impReadyConfirmed) return;
    this.local.impReadyConfirmed = true;
    this.renderScreen();
    if(this.isHost) this.impSetReady(this.myId);
    else this.sendAction('impReady', { id:this.myId, round:this.state.g.round });
  }
  // Host-only: no secret info here, just a boolean — safe to broadcast freely.
  impSetReady(playerId){
    if(!this.isHost) return;
    const r = this.state.g.round;
    if(!this.state.g.ready[r]) this.state.g.ready[r] = {};
    if(this.state.g.ready[r][playerId]) return;
    this.state.g.ready[r][playerId] = true;
    this.broadcastState();
    if(this.players().every(p=>this.state.g.ready[r][p.id])){ clearInterval(this.impWatch); this.later(()=>this.impStartClue(), 500); }
  }
  impStartClue(){
    if(!this.isHost) return;
    if(this.state.phase!=='impWord') return;
    clearInterval(this.impWatch);
    this.state.g.turnIndex = 0;
    this.state.g.clueEndAt = Date.now() + this.state.gameConfig.clueTime*1000;
    this.state.phase = 'impClue';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
    this.impArmClueBot();
    this.impWatchClueTimeout();
  }
  impCurrentTurnPlayerId(){ return this.state.g.order[this.state.g.turnIndex]; }
  impWatchClueTimeout(){
    clearInterval(this.impWatch);
    const r = this.state.g.round, turn = this.state.g.turnIndex;
    this.impWatch = setInterval(()=>{
      if(!this.isHost || this.state.phase!=='impClue' || this.state.g.round!==r || this.state.g.turnIndex!==turn){ clearInterval(this.impWatch); return; }
      if(Date.now() >= this.state.g.clueEndAt){ clearInterval(this.impWatch); this.impSubmitClue(this.impCurrentTurnPlayerId(), '', true); }
    }, 400);
  }
  impArmClueBot(){
    const pid = this.impCurrentTurnPlayerId();
    const p = this.playerById(pid);
    if(!p || !p.isBot) return;
    const total = this.state.gameConfig.clueTime*1000;
    const delay = total*0.3 + Math.random()*total*0.45;
    const r = this.state.g.round, turn = this.state.g.turnIndex;
    this.later(()=>{
      if(!this.isHost || this.state.phase!=='impClue' || this.state.g.round!==r || this.state.g.turnIndex!==turn) return;
      const word = BOT_WORD_POOL[Math.floor(Math.random()*BOT_WORD_POOL.length)];
      this.impSubmitClue(pid, word, false);
    }, delay);
  }
  // Host-only: the only place a clue actually advances the turn — clues
  // themselves are meant to be public the instant they're given (unlike
  // the secret word), so this is safe to write straight into state.g.
  impSubmitClue(pid, text, auto){
    if(!this.isHost) return;
    if(this.state.phase!=='impClue' || this.impCurrentTurnPlayerId()!==pid) return;
    clearInterval(this.impWatch);
    const clean = (text||'').trim().slice(0,40) || (auto ? '(sin pista)' : '');
    const r = this.state.g.round;
    this.state.g.clues[r] = [...(this.state.g.clues[r]||[]), {id:pid, text:clean}];
    this.state.g.turnIndex++;
    if(this.state.g.turnIndex >= this.state.g.order.length){
      this.impStartDiscuss();
    } else {
      this.state.g.clueEndAt = Date.now() + this.state.gameConfig.clueTime*1000;
      this.state.stage = (this.state.stage||0) + 1;
      this.broadcastState();
      this.impArmClueBot();
      this.impWatchClueTimeout();
    }
  }
  impSendClue(){
    if(!this.state || this.state.phase!=='impClue') return;
    if(this.impCurrentTurnPlayerId()!==this.myId) return;
    const text = (this.local.impClueDraft||'').trim();
    if(!text) return;
    this.local.impClueDraft = '';
    if(this.isHost) this.impSubmitClue(this.myId, text, false);
    else this.sendAction('impClue', { id:this.myId, round:this.state.g.round, text });
  }
  impStartDiscuss(){
    if(!this.isHost) return;
    this.state.g.discussEndAt = Date.now() + this.state.gameConfig.discussTime*1000;
    this.state.phase = 'impDiscuss';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
    clearInterval(this.impWatch);
    const r = this.state.g.round;
    this.impWatch = setInterval(()=>{
      if(!this.isHost || this.state.phase!=='impDiscuss' || this.state.g.round!==r){ clearInterval(this.impWatch); return; }
      if(Date.now() >= this.state.g.discussEndAt){ clearInterval(this.impWatch); this.impStartVote(); }
    }, 500);
  }
  impStartVote(){
    if(!this.isHost) return;
    if(this.state.phase!=='impDiscuss') return;
    clearInterval(this.impWatch);
    const r = this.state.g.round;
    this.state.g.voteEndAt = Date.now() + this.state.gameConfig.voteTime*1000;
    this.state.g.voteCount[r] = 0;
    this.impVotes = {};
    this.state.phase = 'impVote';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
    this.players().forEach(p=>{
      if(!p.isBot) return;
      const total = this.state.gameConfig.voteTime*1000;
      const delay = total*0.3 + Math.random()*total*0.5;
      this.later(()=>{
        if(!this.isHost || this.state.phase!=='impVote' || this.state.g.round!==r) return;
        const others = this.players().filter(pl=>pl.id!==p.id);
        if(!others.length) return;
        const target = others[Math.floor(Math.random()*others.length)];
        this.impCastVote(p.id, target.id);
      }, delay);
    });
    this.impWatch = setInterval(()=>{
      if(!this.isHost || this.state.phase!=='impVote' || this.state.g.round!==r){ clearInterval(this.impWatch); return; }
      const allVoted = Object.keys(this.impVotes||{}).length >= this.players().length;
      if(allVoted || Date.now() >= this.state.g.voteEndAt){ clearInterval(this.impWatch); this.impStartReveal(); }
    }, 400);
  }
  // Host-only: votes are tallied here, off to the side, until the round
  // closes — only the headcount (not who voted for whom) is broadcast.
  impCastVote(voterId, targetId){
    if(!this.isHost) return;
    if(this.state.phase!=='impVote') return;
    this.impVotes = this.impVotes || {};
    if(this.impVotes[voterId]) return;
    this.impVotes[voterId] = targetId;
    this.state.g.voteCount[this.state.g.round] = Object.keys(this.impVotes).length;
    this.broadcastState();
  }
  impVote(targetId){
    if(!this.state || this.state.phase!=='impVote' || this.local.impVoted) return;
    this.local.impVoted = true;
    this.local.impVotedFor = targetId;
    this.renderScreen();
    if(this.isHost) this.impCastVote(this.myId, targetId);
    else this.sendAction('impVote', { id:this.myId, round:this.state.g.round, targetId });
  }
  impStartReveal(){
    if(!this.isHost) return;
    if(this.state.phase!=='impVote') return;
    clearInterval(this.impWatch);
    const r = this.state.g.round;
    const tally = {}; this.players().forEach(p=>tally[p.id]=0);
    Object.values(this.impVotes||{}).forEach(t=>{ if(tally[t]!=null) tally[t]++; });
    const maxV = Math.max(0, ...Object.values(tally));
    const top = Object.keys(tally).filter(id=>tally[id]===maxV && maxV>0);
    const accusedId = top.length===1 ? top[0] : null; // tie or nobody voted -> nobody accused
    const secret = this.impSecret || {impostorIds:[], groupWord:'', impostorWord:null};
    const caught = accusedId && secret.impostorIds.includes(accusedId) ? accusedId : null;
    this.state.g.votes[r] = tally;
    this.state.g.voteDetail[r] = {...(this.impVotes||{})};
    this.state.g.accusedId[r] = accusedId;
    this.state.g.impostorIds[r] = secret.impostorIds;
    this.state.g.groupWord[r] = secret.groupWord;
    this.state.g.impostorWord[r] = secret.impostorWord;
    this.state.g.caughtId[r] = caught;
    this.state.phase = 'impReveal';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }
  // Host-only, host-clicked: reveal is a two-step read (tally, then
  // identity) paced by the player, not a timer — see impStartResults.
  impContinueReveal(){
    if(!this.isHost) return;
    if(this.state.phase!=='impReveal') return;
    const r = this.state.g.round;
    if(this.state.g.caughtId[r]) this.impStartGuess();
    else this.impStartResults();
  }
  impStartGuess(){
    if(!this.isHost) return;
    const r = this.state.g.round, caughtId = this.state.g.caughtId[r];
    this.state.phase = 'impGuess';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
    const p = this.playerById(caughtId);
    if(p && p.isBot){
      this.later(()=>{
        if(!this.isHost || this.state.phase!=='impGuess' || this.state.g.round!==r) return;
        const guessRight = Math.random() < 0.3;
        const guess = guessRight ? this.state.g.groupWord[r] : BOT_WORD_POOL[Math.floor(Math.random()*BOT_WORD_POOL.length)];
        this.impSubmitGuess(caughtId, guess);
      }, 2200 + Math.random()*2000);
    }
    this.later(()=>{
      if(this.isHost && this.state.phase==='impGuess' && this.state.g.round===r && !this.state.g.guessResult[r]) this.impSubmitGuess(caughtId, '');
    }, 22000);
  }
  // Host-only: the only place a guess is checked against the real word —
  // nobody but the caught impostor's own client ever typed it.
  impSubmitGuess(pid, guessText){
    if(!this.isHost) return;
    const r = this.state.g.round;
    if(this.state.phase!=='impGuess' || this.state.g.caughtId[r]!==pid || this.state.g.guessResult[r]) return;
    const correct = !!guessText && norm(guessText) === norm(this.state.g.groupWord[r]||'');
    this.state.g.guessResult[r] = { guess:guessText, correct };
    this.broadcastState();
  }
  impSendGuess(){
    if(!this.state || this.state.phase!=='impGuess') return;
    const r = this.state.g.round;
    if(this.state.g.caughtId[r]!==this.myId) return;
    const text = (this.local.impGuessDraft||'').trim();
    if(!text) return;
    this.local.impGuessDraft = '';
    if(this.isHost) this.impSubmitGuess(this.myId, text);
    else this.sendAction('impGuess', { id:this.myId, round:r, text });
    this.renderScreen();
  }
  impStartResults(){
    if(!this.isHost) return;
    const r = this.state.g.round;
    this.state.g.roundScores[r] = this.impRoundScores(r);
    this.state.phase = 'impResults';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }
  impRoundScores(r){
    const out = {}; this.players().forEach(p=>out[p.id]=0);
    const impostorIds = this.state.g.impostorIds[r] || [];
    const caughtId = this.state.g.caughtId[r];
    const guess = this.state.g.guessResult[r];
    const groupCaughtSomeone = !!caughtId;
    this.players().forEach(p=>{
      if(impostorIds.includes(p.id)){
        if(p.id===caughtId) out[p.id] = (guess && guess.correct) ? 5 : 0;
        else out[p.id] = 3;
      } else {
        out[p.id] = groupCaughtSomeone ? 3 : 1;
      }
    });
    return out;
  }
  impTotals(uptoRound){
    const t = {}; this.players().forEach(p=>t[p.id]=0);
    for(let r=0;r<=uptoRound;r++){ if(this.state.g.impostorIds[r]==null) continue; const pts=this.impRoundScores(r); for(const id in pts) t[id]=(t[id]||0)+pts[id]; }
    return t;
  }
  impNext(){
    if(!this.isHost) return;
    if(this.state.g.round+1 < this.state.gameConfig.rounds){ this.impStartRound(this.state.g.round+1); }
    else if(this.state.match){ this.rondaGameFinished(); }
    else { this.state.phase='impFinal'; this.state.stage=(this.state.stage||0)+1; this.broadcastState(); }
  }
  impPlayAgain(){
    if(!this.isHost) return;
    this.impSecret = null; this.impVotes = null;
    this.state.g = this.impFreshG();
    this.state.phase = 'lobby';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }
  impFinalStats(){
    const s = this.state, cfg = s.gameConfig, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const survived={}, caught={}, correctGuess={}, votesReceived={}, deception={}, detective={};
    pl.forEach(p=>{ survived[p.id]=0; caught[p.id]=0; correctGuess[p.id]=0; votesReceived[p.id]=0; deception[p.id]=0; detective[p.id]=0; });
    for(let r=0;r<cfg.rounds;r++){
      const impostorIds = s.g.impostorIds[r]; if(impostorIds==null) continue;
      const caughtId = s.g.caughtId[r];
      const votes = s.g.votes[r]||{};
      const detail = s.g.voteDetail[r]||{};
      const guess = s.g.guessResult[r];
      impostorIds.forEach(id=>{
        if(id===caughtId) caught[id]++; else survived[id]++;
        if((votes[id]||0)===0) deception[id]++;
      });
      if(caughtId && guess && guess.correct) correctGuess[caughtId]++;
      pl.forEach(p=>{ votesReceived[p.id] += (votes[p.id]||0); });
      Object.entries(detail).forEach(([voterId,targetId])=>{ if(impostorIds.includes(targetId)) detective[voterId] = (detective[voterId]||0)+1; });
    }
    const topBy = (obj)=>{ const e = Object.entries(obj).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0]; return e ? {pid:e[0], n:e[1]} : null; };
    const bestImpostor = topBy(survived), bestDetective = topBy(detective), mostCaught = topBy(votesReceived),
          bestGuesser = topBy(correctGuess), bestDeceiver = topBy(deception), mostSurvived = topBy(caught);
    return [
      bestImpostor && {label:'Mejor infiltrado', value:byId[bestImpostor.pid]?.name||'?', sub:bestImpostor.n+(bestImpostor.n>1?' rondas sin ser descubierto':' ronda sin ser descubierto'), bg:INK, dark:true},
      bestDetective && {label:'Más infiltrados descubiertos', value:byId[bestDetective.pid]?.name||'?', sub:bestDetective.n+(bestDetective.n>1?' aciertos':' acierto'), bg:MINT},
      bestGuesser && {label:'Mejor adivinador', value:byId[bestGuesser.pid]?.name||'?', sub:bestGuesser.n+(bestGuesser.n>1?' palabras adivinadas':' palabra adivinada'), bg:VIOLET},
      mostCaught && {label:'Más votos recibidos', value:byId[mostCaught.pid]?.name||'?', sub:mostCaught.n+(mostCaught.n>1?' votos en total':' voto en total'), bg:YEL},
      bestDeceiver && {label:'Mejor capacidad de engaño', value:byId[bestDeceiver.pid]?.name||'?', sub:bestDeceiver.n+(bestDeceiver.n>1?' rondas sin recibir votos':' ronda sin recibir votos'), bg:PINK},
    ].filter(Boolean);
  }
  impStartLocalTimer(kind){
    const screenOf = {clue:'impClue', discuss:'impDiscuss', vote:'impVote'};
    clearInterval(this.tick);
    this.tick = setInterval(()=>{
      if(this.local.screen!==screenOf[kind] || !this.state){ clearInterval(this.tick); return; }
      const endAt = kind==='clue' ? this.state.g.clueEndAt : kind==='discuss' ? this.state.g.discussEndAt : this.state.g.voteEndAt;
      const left = Math.max(0, Math.round((endAt - Date.now())/1000));
      this.impPatchTimer(kind, left);
      if(left<=0) clearInterval(this.tick);
    }, 500);
  }
  impPatchTimer(kind, left){
    const total = kind==='clue' ? this.state.gameConfig.clueTime : kind==='discuss' ? this.state.gameConfig.discussTime : this.state.gameConfig.voteTime;
    const textEl = this.root.querySelector('[data-el="impTimerText"]');
    const barEl = this.root.querySelector('[data-el="impTimerBar"]');
    const boxEl = this.root.querySelector('[data-el="impTimerBox"]');
    if(textEl) textEl.textContent = mmss(left);
    if(barEl) barEl.style.width = (left/total*100)+'%';
    const urgent = left<=10;
    if(barEl) barEl.style.background = urgent ? CORAL : INK;
    if(boxEl){ boxEl.style.background = urgent ? CORAL : '#fff'; boxEl.style.animation = urgent ? 'tick 1s ease-in-out infinite' : 'none'; }
  }

  /* ================= IMPOSTOR — screens ================= */
  viewImpostorConfig(){
    const cfg = this.impDraft;
    const roundOpts = [3,5,7,8,10].map(n=>`<button data-action="impSetRounds" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.rounds===n?INK:'#fff'};color:${cfg.rounds===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${n}</button>`).join('');
    const countOpts = [{v:'auto',l:'Auto'},{v:1,l:'1'},{v:2,l:'2'}].map(o=>`<button data-action="impSetCount" data-val="${o.v}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.impostorCount===o.v?INK:'#fff'};color:${cfg.impostorCount===o.v?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${o.l}</button>`).join('');
    const clueOpts = [15,20,30,45].map(n=>`<button data-action="impSetClueTime" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.clueTime===n?INK:'#fff'};color:${cfg.clueTime===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${n}s</button>`).join('');
    const discussOpts = [30,60,90,120].map(n=>`<button data-action="impSetDiscussTime" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.discussTime===n?INK:'#fff'};color:${cfg.discussTime===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${n}s</button>`).join('');
    const voteOpts = [15,20,30,45].map(n=>`<button data-action="impSetVoteTime" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.voteTime===n?INK:'#fff'};color:${cfg.voteTime===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${n}s</button>`).join('');
    const modeCard = (val, title, desc)=>`<button data-action="impSetMode" data-val="${val}" style="text-align:left;display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:16px;border:2px solid ${INK};background:${cfg.mode===val?MINT:'#fff'}">
      <div style="font-weight:800;font-size:16px">${title}</div>
      <div style="font-size:13px;font-weight:600;color:var(--muted)">${desc}</div>
    </button>`;
    const estimate = '≈ '+gameEstimateMinutes('impostor')+' min de juego';
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Impostor</div></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:16px 0">
        <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:6px 18px;display:flex;flex-direction:column">
          <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
            <div style="font-weight:800;font-size:17px">Rondas</div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${roundOpts}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
            <div style="font-weight:800;font-size:17px">Infiltrados</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${countOpts}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
            <div style="font-weight:800;font-size:17px">Tiempo por pista</div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${clueOpts}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
            <div style="font-weight:800;font-size:17px">Tiempo de discusión</div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${discussOpts}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0">
            <div style="font-weight:800;font-size:17px">Tiempo para votar</div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${voteOpts}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="font-weight:800;font-size:17px;padding:0 4px">Modo de juego</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${modeCard('classic','Clásico','El infiltrado recibe una palabra relacionada — también puede dar pistas.')}
            ${modeCard('pure','Infiltrado puro','El infiltrado no recibe ninguna palabra. Mucho más difícil.')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">${estimate}</div>
          <button class="btn-primary" data-action="confirmImpostorConfig">SIGUIENTE</button>
        </div>
      </div>
    </div>`;
  }
  viewImpWord(){
    const s = this.state;
    if(this.local.impIntro){
      return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:20px">
        <div style="font-size:15px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">RONDA ${s.g.round+1}</div>
        ${this.local.impCountdown==null
          ? `<div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px;letter-spacing:.06em;text-transform:uppercase;animation:rise .3s both">Preparados...</div>`
          : `<div style="width:140px;height:140px;border-radius:50%;background:${INK};color:var(--cream);display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:72px;animation:pop .4s cubic-bezier(.3,1.6,.5,1) both">${this.local.impCountdown}</div>`}
      </div>`;
    }
    if(!this.local.impWordArrived){
      return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px"><div class="spinner"></div><div style="font-weight:700;color:var(--muted)">Preparando tu información…</div></div>`;
    }
    if(this.local.impReadyConfirmed){
      const pl = this.players();
      const readyMap = (s.g.ready && s.g.ready[s.g.round]) || {};
      const rows = pl.map(p=>{
        const ready = !!readyMap[p.id];
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:2px solid var(--panel-line)">
          <div style="width:30px;height:30px;flex:0 0 auto">${avatarSVG(p.avatar,30)}</div>
          <div style="flex:1;min-width:0;font-weight:800;font-size:15px">${esc(p.name)}${p.id===this.myId?' (vos)':''}</div>
          ${ready ? this.iconCheckSmall() : `<span style="color:var(--muted);font-weight:800;letter-spacing:.1em">···</span>`}
        </div>`;
      }).join('');
      return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px;justify-content:center">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <div class="heading" style="font-size:26px">ESTÁS LISTO</div>
          <div style="font-size:14px;font-weight:700;color:var(--muted)">Esperá a que todos estén preparados.</div>
        </div>
        <div class="card" style="padding:4px 18px;margin-top:20px">${rows}</div>
      </div>`;
    }
    const isImp = this.local.impIsImpostor, pure = this.state.gameConfig.mode==='pure';
    let card;
    if(isImp && pure){
      card = `<div style="background:${INK};color:var(--cream);border:2.5px solid ${INK};border-radius:28px;box-shadow:0 6px 0 ${INK};padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
        ${this.iconMask(48,'var(--cream)')}
        <div class="heading" style="font-size:26px;color:var(--cream)">SOS EL INFILTRADO</div>
        <div style="font-size:15px;font-weight:600;opacity:.85">No recibiste una palabra.</div>
        <div style="font-size:15px;font-weight:600;opacity:.85">Escuchá las pistas de los demás y tratá de descubrirla.</div>
        ${this.local.impAllyName?`<div style="margin-top:4px;padding:8px 14px;border-radius:999px;background:${VIOLET};font-weight:800;font-size:13px">Tu aliado/a es ${esc(this.local.impAllyName)}</div>`:''}
      </div>`;
    } else if(isImp){
      card = `<div style="background:${INK};color:var(--cream);border:2.5px solid ${INK};border-radius:28px;box-shadow:0 6px 0 ${INK};padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
        ${this.iconMask(40,'var(--cream)')}
        <div class="heading" style="font-size:24px;color:var(--cream)">SOS EL INFILTRADO</div>
        <div style="font-size:14px;font-weight:600;opacity:.8">Tu palabra es:</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:44px;letter-spacing:-.01em">${esc((this.local.impMyWord||'').toUpperCase())}</div>
        ${this.local.impAllyName?`<div style="margin-top:4px;padding:8px 14px;border-radius:999px;background:${VIOLET};font-weight:800;font-size:13px">Tu aliado/a es ${esc(this.local.impAllyName)}</div>`:''}
      </div>`;
    } else {
      card = `<div style="background:#fff;border:2.5px solid ${INK};border-radius:28px;box-shadow:0 6px 0 ${INK};padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
        <div style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">TU PALABRA</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:44px;letter-spacing:-.01em">${esc((this.local.impMyWord||'').toUpperCase())}</div>
        <div style="font-size:14px;font-weight:600;color:var(--muted)">Recordá la palabra. No se la muestres a nadie.</div>
      </div>`;
    }
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px;justify-content:center">
      ${card}
      <div style="margin-top:20px"><button class="btn-primary" data-action="impConfirmReady">ESTOY LISTO</button></div>
    </div>`;
  }
  viewImpClue(){
    const s = this.state, cfg = s.gameConfig;
    const order = s.g.order, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const turnId = order[s.g.turnIndex];
    const turnPlayer = byId[turnId];
    const isMyTurn = turnId === this.myId;
    const clues = s.g.clues[s.g.round] || [];
    const clueById = {}; clues.forEach(c=>clueById[c.id]=c.text);
    const rows = order.map((pid,i)=>{
      const p = byId[pid]; if(!p) return '';
      const done = clueById[pid] != null;
      const active = i === s.g.turnIndex;
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:${active?YEL:'#fff'};border:2px solid ${INK};${active?`box-shadow:0 3px 0 ${INK}`:''}">
        <div style="width:32px;height:32px;flex:0 0 auto">${avatarSVG(p.avatar,32)}</div>
        <div style="flex:0 0 auto;font-weight:800;font-size:15px;max-width:32%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</div>
        ${done?`<div style="flex:1;min-width:0;font-weight:700;font-size:15px;overflow-wrap:anywhere;text-align:right">"${esc(clueById[pid])}"</div>`
          :active?`<div style="flex:1;text-align:right;font-size:13px;font-weight:800">Pensando…</div>`
          :`<div style="flex:1;text-align:right;font-size:13px;font-weight:700;color:var(--muted)">Espera su turno</div>`}
      </div>`;
    }).join('');
    const wordChip = this.local.impIsImpostor
      ? `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:${INK};color:var(--cream);font-weight:800;font-size:13px">${this.iconMask(14,'var(--cream)')} ${this.local.impMyWord?esc(this.local.impMyWord.toUpperCase()):'SOS EL INFILTRADO'}</div>`
      : `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:#fff;border:2px solid ${INK};font-weight:800;font-size:13px">${esc((this.local.impMyWord||'').toUpperCase())}</div>`;
    return `<div style="min-height:100vh;display:flex;flex-direction:column">
      <div style="position:sticky;top:0;z-index:10;background:var(--cream)">
        <div style="max-width:720px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:12px">
          <button class="icon-btn" data-action="askLeave" aria-label="Salir">${this.iconClose()}</button>
          <div style="flex:1;min-width:0;display:flex;align-items:baseline;gap:6px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800"><span style="font-size:20px">RONDA ${s.g.round+1}</span><span style="font-size:14px;color:var(--muted)">de ${cfg.rounds}</span></div>
          <div data-el="impTimerBox" style="display:flex;align-items:center;gap:8px;height:46px;padding:0 14px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;font-variant-numeric:tabular-nums">${this.iconClock()}<span data-el="impTimerText">${mmss(cfg.clueTime)}</span></div>
        </div>
        <div style="height:6px;background:var(--line)"><div data-el="impTimerBar" style="height:100%;width:100%;background:${INK};transition:width 1s linear,background .3s"></div></div>
      </div>
      <div style="flex:1;width:100%;max-width:560px;margin:0 auto;padding:16px 20px 0;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;justify-content:center">${wordChip}</div>
        <div style="text-align:center;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">${isMyTurn?'Tu turno — dá tu pista':'Turno de '+esc(turnPlayer?turnPlayer.name:'?')}</div>
        <div style="display:flex;flex-direction:column;gap:8px">${rows}</div>
      </div>
      <div class="sticky-bottom" style="margin:0 -20px;padding:16px 20px 20px">
        ${isMyTurn
          ? `<div style="display:flex;gap:10px">
              <input data-role="imp-clue-input" value="${esc(this.local.impClueDraft)}" placeholder="Tu pista" autocomplete="off" maxlength="40" style="flex:1;min-width:0;height:56px;border-radius:16px;border:2px solid ${INK};background:#fff;padding:0 18px;font-size:17px;font-weight:700;color:${INK};outline:none">
              <button class="btn-primary" data-action="impSendClue" style="width:auto;padding:0 22px">ENVIAR</button>
            </div>`
          : `<div style="height:56px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando la pista de ${esc(turnPlayer?turnPlayer.name:'?')}…</div>`}
      </div>
    </div>`;
  }
  viewImpDiscuss(){
    const s = this.state, cfg = s.gameConfig, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const clues = s.g.clues[s.g.round] || [];
    const rows = clues.map(c=>{
      const p = byId[c.id]; if(!p) return '';
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:2px solid var(--panel-line)">
        <div style="width:34px;height:34px;flex:0 0 auto">${avatarSVG(p.avatar,34)}</div>
        <div style="flex:0 0 auto;font-weight:800;font-size:15px">${esc(p.name)}</div>
        <div style="flex:1;min-width:0;text-align:right;font-weight:700;font-size:16px;overflow-wrap:anywhere">"${esc(c.text)}"</div>
      </div>`;
    }).join('');
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="impStartVoteNow">EMPEZAR VOTACIÓN</button>`
      : `<div style="text-align:center;font-size:13px;font-weight:700;color:var(--muted)">Usá el chat para discutir — el anfitrión puede pasar a votar cuando quieran.</div>`;
    return `<div class="screen">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(28px,7vw,40px);letter-spacing:-.02em">¿QUIÉN ES EL INFILTRADO?</div>
        <div data-el="impTimerBox" style="display:flex;align-items:center;gap:8px;height:46px;padding:0 16px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;font-variant-numeric:tabular-nums">${this.iconClock()}<span data-el="impTimerText">${mmss(cfg.discussTime)}</span></div>
        <div style="height:6px;width:100%;max-width:300px;border-radius:3px;background:var(--line);overflow:hidden"><div data-el="impTimerBar" style="height:100%;width:100%;background:${INK};transition:width 1s linear,background .3s"></div></div>
      </div>
      <div class="card" style="padding:6px 16px;max-width:600px;width:100%;margin:0 auto">${rows}</div>
      <div style="text-align:center;font-size:13px;font-weight:700;color:var(--muted);display:flex;align-items:center;justify-content:center;gap:6px">${this.iconChat(16)} Discutan por el chat mientras dure el timer</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }
  viewImpVote(){
    const s = this.state, cfg = s.gameConfig, pl = this.players();
    const rows = pl.map(p=>{
      const selected = this.local.impVotedFor === p.id;
      return `<button data-action="impVote" data-pid="${p.id}" ${this.local.impVoted?'disabled':''} style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;border-radius:18px;border:2px solid ${selected?INK:'var(--line)'};background:${selected?'#FFEDE6':'#fff'};box-shadow:${selected?`0 4px 0 ${INK}`:'none'};text-align:left;opacity:${this.local.impVoted&&!selected?0.5:1}">
        <div style="width:38px;height:38px;flex:0 0 auto">${avatarSVG(p.avatar,38)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:17px">${esc(p.name)}${p.id===this.myId?' (vos)':''}</div>
        <div style="width:22px;height:22px;border-radius:50%;border:2.5px solid ${INK};background:${selected?INK:'transparent'};flex:0 0 auto"></div>
      </button>`;
    }).join('');
    const voted = (s.g.voteCount[s.g.round]||0);
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(28px,7vw,36px);letter-spacing:-.02em">VOTÁ AL INFILTRADO</div>
        <div data-el="impTimerBox" style="display:flex;align-items:center;gap:8px;height:46px;padding:0 16px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;font-variant-numeric:tabular-nums">${this.iconClock()}<span data-el="impTimerText">${mmss(cfg.voteTime)}</span></div>
        <div style="height:6px;width:100%;max-width:260px;border-radius:3px;background:var(--line);overflow:hidden"><div data-el="impTimerBar" style="height:100%;width:100%;background:${INK};transition:width 1s linear,background .3s"></div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">${rows}</div>
      <div style="text-align:center;font-size:14px;font-weight:800;color:var(--muted)">${voted} / ${pl.length} jugadores votaron</div>
      ${this.local.impVoted?`<div style="text-align:center;font-size:13px;font-weight:700;color:var(--muted)">Tu voto es secreto hasta que termine la votación.</div>`:''}
    </div>`;
  }
  viewImpReveal(){
    const s = this.state, r = s.g.round, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const votes = s.g.votes[r] || {};
    const sorted = pl.slice().sort((a,b)=>(votes[b.id]||0)-(votes[a.id]||0));
    const voteRows = sorted.map(p=>`<div style="display:flex;align-items:center;gap:12px;padding:8px 0">
      <div style="width:32px;height:32px;flex:0 0 auto">${avatarSVG(p.avatar,32)}</div>
      <div style="flex:1;min-width:0;font-weight:800;font-size:16px">${esc(p.name)}</div>
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${votes[p.id]||0} ${votes[p.id]===1?'voto':'votos'}</div>
    </div>`).join('');
    if(this.local.impRevealPhase===0){
      return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px;justify-content:center">
        <div style="text-align:center;font-size:14px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">VOTACIÓN</div>
        <div class="card" style="padding:6px 18px;margin-top:12px">${voteRows}</div>
      </div>`;
    }
    const accusedId = s.g.accusedId[r];
    const accused = accusedId ? (byId[accusedId] || {name:'Jugador desconectado', avatar:null}) : null;
    const caughtId = s.g.caughtId[r];
    const impostorIds = s.g.impostorIds[r] || [];
    const impostorNames = impostorIds.map(id=>byId[id]?.name||'?');
    let headline, icon;
    if(!accused){
      headline = 'LA VOTACIÓN QUEDÓ EMPATADA'; icon = this.iconSad(40);
    } else if(caughtId){
      headline = esc(accused.name).toUpperCase()+(impostorIds.length>1?' ERA UNO DE LOS INFILTRADOS':' ERA EL INFILTRADO');
      icon = this.iconMask(40);
    } else {
      headline = esc(accused.name).toUpperCase()+' NO ERA EL INFILTRADO';
      icon = this.iconSad(40);
    }
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px;justify-content:center">
      <div style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
        ${accused?`<div style="width:88px;height:88px">${avatarSVG(accused.avatar,88)}</div>`:icon}
        <div class="heading" style="font-size:clamp(24px,7vw,32px);animation:pop .5s cubic-bezier(.3,1.6,.5,1) both">${headline}</div>
        <div style="width:100%;background:#fff;border:2.5px solid ${INK};border-radius:24px;box-shadow:0 5px 0 ${INK};padding:20px;display:flex;flex-direction:column;gap:14px;animation:rise .4s .2s both">
          <div>
            <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">${impostorIds.length>1?'LOS INFILTRADOS ERAN':'EL INFILTRADO ERA'}</div>
            <div class="heading" style="font-size:22px">${esc(impostorNames.join(' e '))}</div>
          </div>
          <div>
            <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">SU PALABRA ERA</div>
            <div class="heading" style="font-size:26px">${s.g.impostorWord[r]?esc(s.g.impostorWord[r].toUpperCase()):'(sin palabra — modo puro)'}</div>
          </div>
          <div>
            <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">LA PALABRA DEL GRUPO ERA</div>
            <div class="heading" style="font-size:26px">${esc((s.g.groupWord[r]||'').toUpperCase())}</div>
          </div>
        </div>
      </div>
      ${this.isHost?`<div style="margin-top:20px"><button class="btn-primary" data-action="impContinueReveal">${caughtId?'ÚLTIMA OPORTUNIDAD':'VER RESULTADOS'}</button></div>`
        : `<div style="margin-top:20px;height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando al anfitrión…</div>`}
    </div>`;
  }
  viewImpGuess(){
    const s = this.state, r = s.g.round, caughtId = s.g.caughtId[r];
    const caughtPlayer = this.playerById(caughtId);
    const isMe = caughtId === this.myId;
    const result = s.g.guessResult[r];
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px;justify-content:center">
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
        ${isMe && !result ? `
          <div class="heading" style="font-size:26px">¡TE DESCUBRIERON!</div>
          <div style="font-size:15px;font-weight:600;color:var(--muted)">Pero todavía podés ganar.</div>
          <div style="font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:10px">¿CUÁL ERA LA PALABRA DEL GRUPO?</div>
          <div style="display:flex;gap:10px;width:100%">
            <input data-role="imp-guess-input" value="${esc(this.local.impGuessDraft)}" placeholder="Tu respuesta" autocomplete="off" maxlength="40" style="flex:1;min-width:0;height:56px;border-radius:16px;border:2px solid ${INK};background:#fff;padding:0 18px;font-size:17px;font-weight:700;color:${INK};outline:none">
            <button class="btn-primary" data-action="impSendGuess" style="width:auto;padding:0 22px">ADIVINAR</button>
          </div>
        ` : !result ? `
          <div class="heading" style="font-size:24px">${esc(caughtPlayer?caughtPlayer.name:'?')} FUE DESCUBIERTO/A</div>
          <div style="font-size:15px;font-weight:600;color:var(--muted)">Está intentando adivinar la palabra del grupo…</div>
          <div class="spinner" style="margin-top:10px"></div>
        ` : result.correct ? `
          ${this.iconMask(48)}
          <div class="heading" style="font-size:28px">¡EL INFILTRADO SOBREVIVE!</div>
          <div style="font-size:15px;font-weight:600;color:var(--muted)">${esc(caughtPlayer?caughtPlayer.name:'?')} adivinó "${esc((this.state.g.groupWord[r]||'').toUpperCase())}" y se salva.</div>
        ` : `
          ${this.iconParty(48)}
          <div class="heading" style="font-size:28px">¡EL GRUPO GANA!</div>
          <div style="font-size:15px;font-weight:600;color:var(--muted)">${esc(caughtPlayer?caughtPlayer.name:'?')} dijo "${esc(result.guess||'nada')}" — la palabra era "${esc((this.state.g.groupWord[r]||'').toUpperCase())}".</div>
        `}
      </div>
      ${result && this.isHost ? `<div style="margin-top:20px"><button class="btn-primary" data-action="impStartResults">VER RESULTADOS</button></div>`
        : result ? `<div style="margin-top:20px;height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando al anfitrión…</div>` : ''}
    </div>`;
  }
  viewImpResults(){
    const s = this.state, r = s.g.round, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const scores = s.g.roundScores[r] || {};
    const impostorIds = s.g.impostorIds[r] || [];
    const sorted = pl.slice().sort((a,b)=>(scores[b.id]||0)-(scores[a.id]||0));
    const rows = sorted.map((p,i)=>{
      const isImp = impostorIds.includes(p.id);
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:2px solid var(--panel-line);animation:rise .4s both;animation-delay:${(i*0.06).toFixed(2)}s">
        <div style="width:30px;flex:0 0 auto">${isImp?this.iconMask(20):(i<3?this.iconCheckSmall():'')}</div>
        <div style="width:34px;height:34px;flex:0 0 auto">${avatarSVG(p.avatar,34)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:16px">${esc(p.name)}${p.id===this.myId?' (vos)':''}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px;color:${(scores[p.id]||0)>0?'#0E8A66':'var(--muted)'}">+${scores[p.id]||0}</div>
      </div>`;
    }).join('');
    const isLast = s.g.round+1 >= s.gameConfig.rounds;
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="goRanking">VER CLASIFICACIÓN</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando al anfitrión…</div>`;
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
      <div style="text-align:center;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">RESULTADOS · RONDA ${r+1}${isLast?' (última)':''}</div>
      <div class="card" style="padding:4px 18px;margin-top:8px">${rows}</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }
  viewImpRanking(){
    const s = this.state, cfg = s.gameConfig, pl = this.players();
    const cur = this.impTotals(s.g.round), prevT = s.g.round>0 ? this.impTotals(s.g.round-1) : null;
    const nr = this.rankOf(cur), orr = prevT ? this.rankOf(prevT) : nr;
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
      ? `<button class="btn-primary" data-action="nextRound">${isLast?'VER RESULTADO FINAL':'SIGUIENTE RONDA'}</button>`
      : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(s.hostId)?.name||'El anfitrión')} va a continuar<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
    return `<div class="screen">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(36px,10vw,52px);letter-spacing:-.02em;line-height:1">CLASIFICACIÓN</div>
        <div style="font-size:16px;font-weight:700;color:var(--muted)">Después de la ronda ${s.g.round+1} de ${cfg.rounds}</div>
      </div>
      <div style="display:flex;gap:6px;justify-content:center">${dots}</div>
      <div style="position:relative;height:${pl.length*104}px">${rows}</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }
  viewImpFinal(){
    const s = this.state, cfg = s.gameConfig, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const tot = this.impTotals(cfg.rounds-1);
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
    const stats = this.impFinalStats().map((x,i)=>({...x, delay:(0.5+i*0.1)+'s'}));
    const statsHtml = stats.map(x=>`<div style="background:${x.bg};color:${x.dark?'var(--cream)':INK};border:2px solid ${INK};border-radius:22px;box-shadow:0 4px 0 ${INK};padding:16px;display:flex;flex-direction:column;gap:6px;animation:rise .5s both;animation-delay:${x.delay}">
      <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:${x.dark?0.8:1}">${esc(x.label)}</div>
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;line-height:1.05;overflow-wrap:anywhere">${esc(x.value)}</div>
      <div style="font-size:14px;font-weight:700">${esc(x.sub)}</div>
    </div>`).join('');
    const confettiHtml = this.confetti.map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} infinite"></div>`).join('');
    const bottom = this.isHost
      ? `<button class="btn-primary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="backToPortal">ELEGIR OTRO JUEGO</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando a ${esc(this.playerById(s.hostId)?.name||'el anfitrión')}…</div>`;
    return `<div style="position:relative;min-height:100vh;overflow:hidden">
      <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confettiHtml}</div>
      <div style="position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <div style="padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">¡PARTIDA TERMINADA!</div>
          <div class="heading" style="font-size:clamp(40px,12vw,84px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${esc(winnerTitle)}</div>
          <div class="heading" style="font-size:24px">${tot[w.id]} puntos</div>
        </div>
        <div class="final-layout">
          <div class="final-ranking">
            <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px">${podium}</div>
            <div style="width:100%;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:8px 18px">${finalRows}</div>
          </div>
          <div class="final-stats">${statsHtml}</div>
        </div>
        <div class="sticky-bottom">
          <div style="max-width:560px;margin:0 auto;padding:0 14px;display:flex;flex-direction:row;align-items:center;gap:12px">${bottom}</div>
        </div>
      </div>
    </div>`;
  }

  /* ================= MODO RONDA =================
     A coordination layer, not a game: it never touches how Unánimo,
     Dibujalo, Tutti Frutti or Impostor actually play. It just drives
     this.state.gameId/gameConfig/g through the exact same shape and the
     exact same XStartGame() entry point each game's own "COMENZAR" button
     already calls — so from any single game's point of view, Modo Ronda
     starting it looks identical to a host picking it from the portal.
     The one unavoidable seam is the "no more of my own rounds" branch in
     each game's XNext() (see uNext/dNext/tfNext/impNext above), which
     hands off to rondaGameFinished() instead of that game's own XFinal
     when a match is active — one line each, nothing about how any game
     scores or plays changes. Persistent match state (plan, running
     scores) lives in this.state.match, a sibling of gameId/gameConfig/g,
     so it survives untouched across every constituent game's own state
     changes. */
  confirmRondaConfig(){
    if(!this.isHost) return;
    const d = this.rondaDraft;
    if(d.selectedGames.length < 2){ this.toast('Elegí al menos 2 juegos', CORAL); return; }
    let sequence;
    if(d.orderMode==='random'){
      sequence = d.selectedGames.slice();
      for(let i=sequence.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [sequence[i],sequence[j]]=[sequence[j],sequence[i]]; }
    } else {
      sequence = d.customOrder.filter(id=>d.selectedGames.includes(id));
      d.selectedGames.forEach(id=>{ if(!sequence.includes(id)) sequence.push(id); });
    }
    if(!sequence.length) return;
    const rounds = d.noRepeat ? Math.min(d.rounds, sequence.length) : d.rounds;
    const plan = [];
    for(let i=0;i<rounds;i++) plan.push(sequence[i % sequence.length]);
    this.state.gameId = 'ronda';
    this.state.gameConfig = { rounds, orderMode:d.orderMode, noRepeat:d.noRepeat, selectedGames:[...d.selectedGames] };
    this.state.g = null;
    const scores = {}; this.players().forEach(p=>{ scores[p.id]=0; });
    this.state.match = { mode:'ronda', totalRounds:rounds, currentIndex:-1, plan, scores, roundScores:[], doneGameIds:[] };
    this.state.stage = (this.state.stage||0) + 1;
    this.local.hostFlow = null;
    this.broadcastState();
  }
  rondaStartMatch(){
    if(!this.isHost || this.state.gameId!=='ronda' || !this.state.match) return;
    this.rondaShowIntro(0);
  }
  rondaShowIntro(index){
    if(!this.isHost || !this.state.match) return;
    this.state.match.currentIndex = index;
    this.state.g = null;
    this.state.phase = 'rondaIntro';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }
  // Host-only, host-clicked ("COMENZAR" on the intro screen): builds this
  // slot's gameId/gameConfig exactly like that game's own confirmXConfig()
  // would, then calls its real XStartGame() — same entry point its "COMENZAR
  // <JUEGO>" button uses from the ordinary single-game lobby.
  rondaBeginSlot(){
    if(!this.isHost || !this.state.match || this.state.phase!=='rondaIntro') return;
    const m = this.state.match;
    const gameId = m.plan[m.currentIndex];
    const adapter = RONDA_ADAPTERS[gameId];
    if(!adapter) return;
    this.state.gameId = gameId;
    this.state.gameConfig = adapter.defaultConfig(this.players().length);
    this.state.g = {};
    this[adapter.startGame]();
  }
  // Called from uNext/dNext/tfNext/impNext instead of that game's own
  // XFinal — pulls its cumulative totals (the exact same numbers its own
  // final/ranking screen would show), adds them to the match's running
  // score, and shows Modo Ronda's own "ronda completada" screen.
  rondaGameFinished(){
    if(!this.isHost || !this.state.match) return;
    const m = this.state.match;
    const adapter = RONDA_ADAPTERS[this.state.gameId];
    if(!adapter) return;
    const finalTotals = this[adapter.totals](this.state.gameConfig.rounds-1);
    const delta = {};
    this.players().forEach(p=>{
      delta[p.id] = finalTotals[p.id]||0;
      m.scores[p.id] = (m.scores[p.id]||0) + delta[p.id];
    });
    m.roundScores[m.currentIndex] = delta;
    m.doneGameIds.push(this.state.gameId);
    this.state.phase = 'rondaResults';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }
  rondaNext(){
    if(!this.isHost || !this.state.match || this.state.phase!=='rondaResults') return;
    const m = this.state.match;
    if(m.currentIndex+1 >= m.totalRounds){
      this.state.phase = 'rondaFinal';
      this.state.stage = (this.state.stage||0) + 1;
      this.broadcastState();
    } else {
      this.rondaShowIntro(m.currentIndex+1);
    }
  }
  rondaPlayAgain(){
    if(!this.isHost || !this.state.match) return;
    const m = this.state.match;
    this.players().forEach(p=>{ m.scores[p.id]=0; });
    m.currentIndex = -1;
    m.roundScores = [];
    m.doneGameIds = [];
    this.state.gameId = 'ronda';
    this.state.g = null;
    this.state.phase = 'lobby';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }

  /* ================= MODO RONDA — screens ================= */
  viewRondaConfig(){
    const d = this.rondaDraft;
    const roundMax = d.noRepeat ? d.selectedGames.length : 8;
    const roundOpts = Array.from({length:Math.max(1,roundMax-1)},(_,i)=>i+2).map(n=>`<button data-action="rondaSetRounds" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${d.rounds===n?INK:'#fff'};color:${d.rounds===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px">${n}</button>`).join('');
    const gameChips = GAMES.map(g=>{
      const on = d.selectedGames.includes(g.id);
      return `<button data-action="rondaToggleGame" data-game="${g.id}" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;border:2px solid ${INK};background:${on?MINT:'#fff'}">
        <div style="width:26px;height:30px;border-radius:8px;background:${g.colors[0]};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:12px">${g.letters[0]}</div>
        <span style="font-weight:800;font-size:14px">${esc(g.name)}</span>
        ${on?this.iconCheckSmall():''}
      </button>`;
    }).join('');
    const orderModeBtns = ['custom','random'].map(md=>`<button data-action="rondaSetOrderMode" data-val="${md}" style="flex:1;height:48px;border-radius:14px;border:2px solid ${INK};background:${d.orderMode===md?INK:'#fff'};color:${d.orderMode===md?'var(--cream)':INK};display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800;font-size:14px">${md==='custom'?this.iconListOrdered(16,d.orderMode===md?'var(--cream)':INK):this.iconShuffle(16,d.orderMode===md?'var(--cream)':INK)} ${md==='custom'?'Personalizado':'Aleatorio'}</button>`).join('');
    let orderBuilder = '';
    if(d.orderMode==='custom'){
      const orderRows = d.customOrder.filter(id=>d.selectedGames.includes(id)).map((id,i)=>{
        const gm = gameMeta(id);
        return `<button data-action="rondaOrderRemove" data-game="${id}" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:14px;border:2px solid ${INK};background:#fff;text-align:left">
          <div style="width:24px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:15px;color:var(--muted)">${i+1}</div>
          <div style="width:28px;height:32px;border-radius:8px;background:${gm.colors[0]};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:13px">${gm.letters[0]}</div>
          <span style="flex:1;font-weight:800;font-size:14px">${esc(gm.name)}</span>
          ${this.iconClose(14)}
        </button>`;
      }).join('');
      const pool = d.selectedGames.filter(id=>!d.customOrder.includes(id));
      const poolChips = pool.map(id=>{
        const gm = gameMeta(id);
        return `<button data-action="rondaOrderAdd" data-game="${id}" style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:12px;border:2px dashed var(--dashed);background:transparent">
          <div style="width:22px;height:26px;border-radius:6px;background:${gm.colors[0]};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:11px">${gm.letters[0]}</div>
          <span style="font-weight:700;font-size:13px">${esc(gm.name)}</span>
        </button>`;
      }).join('');
      orderBuilder = `<div style="display:flex;flex-direction:column;gap:8px;padding-top:4px">
        ${orderRows || `<div style="text-align:center;font-size:13px;font-weight:700;color:var(--muted);padding:10px 0">Tocá los juegos de abajo para armar el orden.</div>`}
        ${pool.length?`<div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:4px">${poolChips}</div>`:''}
      </div>`;
    }
    const orderedCount = d.customOrder.filter(id=>d.selectedGames.includes(id)).length;
    const canConfirm = d.selectedGames.length>=2 && (d.orderMode==='random' || orderedCount===d.selectedGames.length);
    const estimate = '≈ '+(d.rounds*3)+' min de juego';
    return `<div class="screen screen-narrow" style="padding-top:28px;padding-bottom:28px">
      <div class="top-bar"><button class="icon-btn" data-action="backToPicker" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Modo Ronda</div></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding:16px 0">
        <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:6px 18px;display:flex;flex-direction:column">
          <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
            <div style="font-weight:800;font-size:17px">Juegos disponibles</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">${gameChips}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
            <div style="font-weight:800;font-size:17px">Orden</div>
            <div style="display:flex;gap:8px">${orderModeBtns}</div>
            ${orderBuilder}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
            <div style="display:flex;flex-direction:column;gap:2px"><div style="font-weight:800;font-size:17px">No repetir juegos</div><div style="font-size:14px;color:var(--muted)">Cada juego aparece como máximo una vez</div></div>
            <button data-action="rondaToggleNoRepeat" style="width:56px;height:32px;border-radius:999px;border:2px solid ${INK};background:${d.noRepeat?MINT:'#F1E7D8'};position:relative;flex:0 0 auto"><span style="position:absolute;top:2px;left:${d.noRepeat?'26px':'2px'};width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${INK};transition:left .15s"></span></button>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;padding:14px 0">
            <div style="display:flex;align-items:baseline;justify-content:space-between"><div style="font-weight:800;font-size:17px">Rondas</div>${d.noRepeat?`<div style="font-size:12px;font-weight:700;color:var(--muted)">máx. ${d.selectedGames.length} sin repetir</div>`:''}</div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${roundOpts}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">${estimate}</div>
          ${!canConfirm && d.orderMode==='custom' ? `<div style="text-align:center;font-size:13px;font-weight:700;color:#B3341A">Terminá de ordenar todos los juegos elegidos</div>` : ''}
          <button class="btn-primary" data-action="confirmRondaConfig" ${canConfirm?'':'disabled'}>SIGUIENTE</button>
        </div>
      </div>
    </div>`;
  }
  viewRondaIntro(){
    const s = this.state, m = s.match;
    const gameId = m.plan[m.currentIndex];
    const gm = gameMeta(gameId);
    const isFirst = m.currentIndex === 0;
    const rankedIds = this.rankOf(m.scores);
    const leaderId = rankedIds[0];
    const leader = leaderId ? this.playerById(leaderId) : null;
    const leaderHasPoints = leader && (m.scores[leaderId]||0) > 0;
    return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:20px">
      ${!isFirst && leaderHasPoints ? `<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:#fff;border:2px solid ${INK};font-weight:800;font-size:14px;animation:rise .4s both">${this.iconTrophy(16)} ${esc(leader.name)} lidera con ${m.scores[leaderId]} puntos</div>` : ''}
      <div style="font-size:15px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">RONDA ${m.currentIndex+1} DE ${m.totalRounds}</div>
      <div style="display:flex;gap:10px;animation:pop .5s cubic-bezier(.3,1.6,.5,1) both">
        <div style="width:64px;height:76px;border-radius:16px;background:${gm.colors[0]};border:2.5px solid ${INK};box-shadow:0 4px 0 ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:32px;transform:rotate(-4deg)">${gm.letters[0]}</div>
        <div style="width:64px;height:76px;border-radius:16px;background:${gm.colors[1]};border:2.5px solid ${INK};box-shadow:0 4px 0 ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:32px;transform:rotate(4deg)">${gm.letters[1]}</div>
      </div>
      <div class="heading" style="font-size:clamp(28px,8vw,40px)">${esc(gm.name.toUpperCase())}</div>
      <div style="font-size:15px;font-weight:600;color:var(--muted);max-width:340px">${esc(gm.tagline)}</div>
      ${this.isHost ? `<button class="btn-primary" data-action="rondaBeginSlot" style="margin-top:10px;max-width:360px">COMENZAR</button>`
        : `<div style="margin-top:10px;height:54px;padding:0 24px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando al anfitrión…</div>`}
    </div>`;
  }
  viewRondaResults(){
    const s = this.state, m = s.match, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const gameId = m.doneGameIds[m.doneGameIds.length-1];
    const gm = gameMeta(gameId);
    const delta = m.roundScores[m.currentIndex] || {};
    const deltaSorted = pl.slice().sort((a,b)=>(delta[b.id]||0)-(delta[a.id]||0));
    const deltaRows = deltaSorted.map((p,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:2px solid var(--panel-line);animation:rise .4s both;animation-delay:${(i*0.06).toFixed(2)}s">
      <div style="width:28px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px;color:var(--muted)">${i+1}</div>
      <div style="width:32px;height:32px;flex:0 0 auto">${avatarSVG(p.avatar,32)}</div>
      <div style="flex:1;min-width:0;font-weight:800;font-size:15px">${esc(p.name)}${p.id===this.myId?' (vos)':''}</div>
      <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px;color:${(delta[p.id]||0)>0?'#0E8A66':'var(--muted)'}">+${delta[p.id]||0}</div>
    </div>`).join('');
    const totalRanked = this.rankOf(m.scores);
    const totalRows = totalRanked.map((id,i)=>{
      const p = byId[id];
      return `<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:${i<totalRanked.length-1?'2px solid var(--panel-line)':'0'}">
        <div style="width:28px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${i+1}</div>
        <div style="width:32px;height:32px;flex:0 0 auto">${avatarSVG(p.avatar,32)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:15px">${esc(p.name)}${p.id===this.myId?' (vos)':''}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${m.scores[id]||0} pts</div>
      </div>`;
    }).join('');
    const isLast = m.currentIndex+1 >= m.totalRounds;
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="rondaNext">${isLast?'VER RESULTADO FINAL':'SIGUIENTE RONDA'}</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando al anfitrión…</div>`;
    return `<div class="screen">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(28px,7vw,38px)">RONDA ${m.currentIndex+1} COMPLETADA</div>
        <div style="font-size:14px;font-weight:700;color:var(--muted)">${gm?esc(gm.name):''}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;max-width:900px;margin:0 auto;width:100%">
        <div class="card" style="padding:4px 18px">
          <div style="padding-top:10px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Puntos de esta ronda</div>
          ${deltaRows}
        </div>
        <div class="card" style="padding:4px 18px">
          <div style="padding-top:10px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Puntaje total</div>
          ${totalRows}
        </div>
      </div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }
  viewRondaFinal(){
    const s = this.state, m = s.match, pl = this.players(), byId = {}; pl.forEach(p=>byId[p.id]=p);
    const nr = this.rankOf(m.scores);
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
          <div style="font-weight:800;font-size:14px">${m.scores[nr[i]]||0} pts</div>
        </div>
      </div>`;
    }).join('');
    const finalRows = nr.map((id,i)=>{
      const label = id===this.myId ? byId[id].name+' (vos)' : byId[id].name;
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:${i<nr.length-1?'2px solid var(--panel-line)':'0'}">
        <div style="width:28px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${i+1}</div>
        <div style="width:38px;height:38px;flex:0 0 auto">${avatarSVG(byId[id].avatar,38)}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:17px">${esc(label)}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${m.scores[id]||0} pts</div>
      </div>`;
    }).join('');
    const playedChips = m.plan.map(gid=>{
      const gm = gameMeta(gid);
      return `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;background:#fff;border:2px solid ${INK}">
        <div style="width:26px;height:30px;border-radius:8px;background:${gm.colors[0]};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:12px">${gm.letters[0]}</div>
        <span style="font-weight:800;font-size:14px">${esc(gm.name)}</span>
      </div>`;
    }).join('');
    const confettiHtml = this.confetti.map(c=>`<div style="position:absolute;top:-20px;left:${c.left};width:${c.w};height:${c.h};border-radius:3px;background:${c.color};border:1.5px solid ${INK};animation:fall ${c.dur} linear ${c.delay} infinite"></div>`).join('');
    const bottom = this.isHost
      ? `<button class="btn-primary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="rondaPlayAgain">JUGAR OTRA VEZ</button><button class="btn-secondary" style="flex:1;min-width:0;height:auto;min-height:56px;padding:8px 6px;font-size:14px" data-action="backToPortal">VOLVER AL INICIO</button>`
      : `<div style="height:54px;border-radius:16px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted)">Esperando a ${esc(this.playerById(s.hostId)?.name||'el anfitrión')}…</div>`;
    return `<div style="position:relative;min-height:100vh;overflow:hidden">
      <div style="position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden">${confettiHtml}</div>
      <div style="position:relative;z-index:2;max-width:1080px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:28px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:${INK};color:var(--cream);font-size:14px;font-weight:800;letter-spacing:.12em">${this.iconStar(14,'var(--cream)')} MODO RONDA COMPLETADO</div>
          <div class="heading" style="font-size:clamp(40px,12vw,84px);line-height:.95;letter-spacing:-.03em;animation:pop .7s cubic-bezier(.3,1.6,.5,1) both">${esc(winnerTitle)}</div>
          <div class="heading" style="font-size:24px">${m.scores[w.id]||0} puntos</div>
        </div>
        <div class="final-layout">
          <div class="final-ranking">
            <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px">${podium}</div>
            <div style="width:100%;background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:8px 18px">${finalRows}</div>
          </div>
          <div class="final-stats">
            <div style="font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:0 4px">Jugaron</div>
            ${playedChips}
          </div>
        </div>
        <div class="sticky-bottom">
          <div style="max-width:560px;margin:0 auto;padding:0 14px;display:flex;flex-direction:row;align-items:center;gap:12px">${bottom}</div>
        </div>
      </div>
    </div>`;
  }
}

const app = document.getElementById('app');
const toastRoot = document.getElementById('toasts');
const modalRoot = document.getElementById('modals');
const hudRoot = document.getElementById('hud');
const chatRoot = document.getElementById('chatPanel');
window.__game = new Game(app, toastRoot, modalRoot, hudRoot, chatRoot);
