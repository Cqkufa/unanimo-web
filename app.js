import { supabase } from './supabaseClient.js';
import { pickWords } from './words.js';

/* ---------- utils ---------- */
const INK='#1D1B2F', CORAL='#FF6B4A', MINT='#2ED3A6', YEL='#FFC83D', VIOLET='#9B85FF', BLUE='#5CB8FF', PINK='#FF8CC2';
const PALETTE=[CORAL,VIOLET,MINT,YEL,BLUE,PINK];
const RANKBG=[YEL,'#E4DEF5','#F6BE9E'];
const CONF_COLORS=[CORAL,YEL,MINT,VIOLET,BLUE,PINK];

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

class Game {
  constructor(root, toastRoot, modalRoot){
    this.root = root;
    this.toastRoot = toastRoot;
    this.modalRoot = modalRoot;
    this.myId = null;
    this.channel = null;
    this.timers = [];
    this.confetti = Array.from({length:40},(_,i)=>({left:((i*37)%100)+'%',delay:((i%13)*0.23).toFixed(2)+'s',dur:(2.8+(i%5)*0.5)+'s',color:CONF_COLORS[i%6],w:(8+(i%3)*4)+'px',h:(12+(i%4)*3)+'px'}));
    this.local = { screen:'home', modal:null, cfgName:'', joinCode:'', joining:false, joinError:'', showJoinName:false, joinNameDraft:'',
      inputs:[], submitted:false, reveal:0, appliedStage:-1, selPid:null, rankPhase:1, lastRound:-1 };
    this.cfgDraft = { players:8, rounds:3, words:6, time:45 };
    this.state = null; // host-authoritative shared state, once in a room
    this.toasts = [];
    this._bindDelegation();
    this.renderScreen();
  }

  /* ---------- lifecycle helpers ---------- */
  later(fn, ms){ const t=setTimeout(fn, ms); this.timers.push(t); return t; }
  clearTimers(){ this.timers.forEach(clearTimeout); this.timers=[]; clearInterval(this.tick); clearInterval(this.revealTick); clearInterval(this.hostWatch); }

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
  groups(r){
    const a = this.state?.answers?.[r]; if(!a) return [];
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
    const a = this.state?.answers?.[r] || {}; const out = {};
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
    for(let r=0;r<=uptoRound;r++){ if(!this.state.answers[r]) continue; const pts=this.points(r); for(const id in pts) t[id]=(t[id]||0)+pts[id].total; }
    return t;
  }
  rankOf(t){ return this.players().slice().sort((a,b)=> (t[b.id]||0)-(t[a.id]||0) || a.name.localeCompare(b.name)).map(p=>p.id); }

  /* ---------- networking ---------- */
  async connect(code){
    if(this.channel) { try{ await supabase.removeChannel(this.channel); }catch(e){} }
    this.channel = supabase.channel('room-'+code, { config: { broadcast: { self:false, ack:false } } });
    this.channel.on('broadcast', {event:'state'}, ({payload})=> this.onState(payload));
    this.channel.on('broadcast', {event:'action'}, ({payload})=> { if(this.isHost) this.onAction(payload); });
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

  /* ---------- host: create room ---------- */
  async createGame(){
    const name = (this.local.cfgName||'').trim().slice(0,14) || 'Anfitrión';
    this.myId = uid();
    this.isHost = true;
    const code = randCode();
    await this.connect(code);
    const cfg = { ...this.cfgDraft };
    this.state = {
      code, hostId:this.myId, config:cfg,
      players:[{id:this.myId, name, color:PALETTE[0], joinedAt:Date.now()}],
      phase:'lobby', stage:0, round:-1, roundWord:'', roundEndAt:0, usedWords:[],
      answers:[], done:{}, rev:0, updatedAt:Date.now()
    };
    this.local.appliedStage = 0;
    this.local.screen = 'lobby';
    this.saveSession();
    this.renderScreen();
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
      this.sendAction('join', { id:this.myId, name });
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
      const cap = this.state.config.players;
      if(this.state.players.length >= cap){ return; }
      const color = PALETTE[this.state.players.length % PALETTE.length];
      this.state.players.push({id:msg.id, name:(msg.name||'Jugador').slice(0,14), color, joinedAt:Date.now()});
      this.toast(msg.name+' se unió', color);
      this.broadcastState();
    }
    else if(msg.type === 'hello'){
      this.broadcastState();
    }
    else if(msg.type === 'submit'){
      if(msg.round !== this.state.round) return;
      if(this.state.done[msg.id]) return;
      if(!this.state.answers[this.state.round]) this.state.answers[this.state.round] = {};
      this.state.answers[this.state.round][msg.id] = msg.words;
      this.state.done[msg.id] = true;
      const p = this.playerById(msg.id);
      if(p && p.id !== this.myId) this.toast(p.name+' terminó', p.color);
      this.broadcastState();
      this.checkAllDone();
    }
    else if(msg.type === 'leave'){
      this.state.players = this.state.players.filter(p=>p.id!==msg.id);
      delete this.state.done[msg.id];
      this.broadcastState();
    }
  }

  checkAllDone(){
    if(!this.isHost) return;
    if(this.state.phase!=='round') return;
    if(this.players().every(p=>this.state.done[p.id])){
      this.later(()=>this.hostStartReveal(), 1200);
    }
  }

  /* ---------- receiving state (all clients) ---------- */
  onState(s, isSelf){
    const freshRoom = !this.state || this.state.code !== s.code;
    if(!freshRoom && this.state.rev != null && s.rev != null && s.rev < this.state.rev) return;
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
        this.local.inputs = Array(s.config.words).fill('');
        this.local.submitted = false;
        this.local.lastRound = s.round;
        this.startLocalTimer();
      }
      if(s.phase === 'reveal'){
        this.startReveal();
      }
      if(s.phase === 'lobby'){
        this.clearTimers();
      }
      this.renderScreen();
      return;
    }

    // same stage: patch in place without losing input focus
    if(this.local.screen === 'lobby') this.renderScreen();
    else if(this.local.screen === 'wait') this.renderScreen();
    else if(this.local.screen === 'round') this.patchRoundStatus();
  }

  /* ---------- round flow (host drives global stage) ---------- */
  startGame(){
    if(!this.isHost) return;
    this.state.answers = [];
    this.state.usedWords = [];
    this.hostStartRound(0);
  }
  hostStartRound(r){
    const [word] = pickWords(1, this.state.usedWords);
    this.state.usedWords = [...this.state.usedWords, word];
    this.state.round = r;
    this.state.roundWord = word;
    this.state.roundEndAt = Date.now() + this.state.config.time*1000;
    this.state.done = {};
    this.state.phase = 'round';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
    clearInterval(this.hostWatch);
    this.hostWatch = setInterval(()=>{
      if(!this.isHost || this.state.phase!=='round' || this.state.round!==r) { clearInterval(this.hostWatch); return; }
      if(Date.now() >= this.state.roundEndAt + 4000){
        this.players().forEach(p=>{ if(!this.state.done[p.id]){ if(!this.state.answers[r]) this.state.answers[r]={}; this.state.answers[r][p.id] = this.state.answers[r][p.id]||[]; this.state.done[p.id]=true; } });
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
  hostNext(){
    if(!this.isHost) return;
    if(this.state.round+1 < this.state.config.rounds){ this.hostStartRound(this.state.round+1); }
    else { this.state.phase='final'; this.state.stage=(this.state.stage||0)+1; this.broadcastState(); }
  }
  hostPlayAgain(){
    if(!this.isHost) return;
    this.state.answers = []; this.state.usedWords = []; this.state.round=-1; this.state.done={};
    this.state.phase = 'lobby';
    this.state.stage = (this.state.stage||0) + 1;
    this.broadcastState();
  }

  /* ---------- local per-client timer for round screen ---------- */
  startLocalTimer(){
    clearInterval(this.tick);
    this.tick = setInterval(()=>{
      if(this.local.screen!=='round'){ clearInterval(this.tick); return; }
      const left = Math.max(0, Math.round((this.state.roundEndAt - Date.now())/1000));
      this.patchTimer(left);
      if(left<=0){ clearInterval(this.tick); if(!this.local.submitted) this.submit(true); }
      if(left===10) this.toast('¡Quedan 10 segundos!', CORAL);
    }, 500);
  }
  patchTimer(left){
    const cfg = this.state.config;
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
      if(!this.state.answers[this.state.round]) this.state.answers[this.state.round] = {};
      this.state.answers[this.state.round][this.myId] = words;
      this.state.done[this.myId] = true;
      this.broadcastState();
      this.checkAllDone();
    } else {
      this.sendAction('submit', { id:this.myId, round:this.state.round, words });
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
        const n = this.groups(this.state.round).length;
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
    this.local = { ...this.local, screen:'home', modal:null, joinCode:'', joining:false, joinError:'', showJoinName:false };
    this.renderScreen();
  }

  /* ---------- event delegation ---------- */
  _bindDelegation(){
    // Delegated on document.body (not this.root) so clicks/input inside the
    // separately-rendered modal container are handled too.
    document.body.addEventListener('click', e=>{
      const t = e.target.closest('[data-action]');
      if(!t) return;
      const action = t.dataset.action;
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
      }
    });
    document.body.addEventListener('keydown', e=>{
      const t = e.target;
      if(t.dataset.role === 'join-code' && e.key==='Enter') this.actions.joinGame.call(this);
      if(t.dataset.role === 'join-name' && e.key==='Enter') this.actions.confirmJoinName.call(this);
      if(t.dataset.role === 'word-input' && e.key==='Enter'){
        e.preventDefault();
        const i = Number(t.dataset.index);
        const n = this.local.inputs.length;
        if(i < n-1){ const next = this.root.querySelector(`[data-role="word-input"][data-index="${i+1}"]`); if(next) next.focus(); }
        else this.submit(false);
      }
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
    if(fc) fc.textContent = filled+' / '+this.state.config.words;
  }

  get actions(){
    return {
      goHome: ()=>this.goHome(),
      goCreate: ()=>{ this.local.screen='create'; this.renderScreen(); },
      openHow: ()=>{ this.local.modal='how'; this.renderModals(); },
      closeModal: ()=>{ this.local.modal=null; this.local.showJoinName=false; this.renderModals(); },
      stop: (t,e)=>e.stopPropagation(),
      askLeave: ()=>{ this.local.modal='leave'; this.renderModals(); },
      createGame: ()=>this.createGame(),
      joinGame: ()=>this.joinGame(),
      confirmJoinName: ()=>this.confirmJoinName(),
      startGame: ()=>this.startGame(),
      copyCode: ()=>{ try{ navigator.clipboard.writeText(this.state.code); }catch(e){} this.toast('Código copiado', MINT); },
      decPlayers: ()=>{ this.cfgDraft.players = clamp(this.cfgDraft.players-1,2,12); this.renderScreen(); },
      incPlayers: ()=>{ this.cfgDraft.players = clamp(this.cfgDraft.players+1,2,12); this.renderScreen(); },
      decWords: ()=>{ this.cfgDraft.words = clamp(this.cfgDraft.words-1,3,8); this.renderScreen(); },
      incWords: ()=>{ this.cfgDraft.words = clamp(this.cfgDraft.words+1,3,8); this.renderScreen(); },
      setRounds: (t)=>{ this.cfgDraft.rounds = Number(t.dataset.val); this.renderScreen(); },
      setTime: (t)=>{ this.cfgDraft.time = Number(t.dataset.val); this.renderScreen(); },
      submitNow: ()=>this.submit(false),
      revealAll: ()=>{ clearInterval(this.revealTick); this.local.reveal = this.groups(this.state.round).length; this.renderScreen(); },
      goScore: ()=>{ this.local.screen='score'; this.local.selPid=this.myId; this.renderScreen(); },
      goRanking: ()=>{ this.local.screen='ranking'; this.local.rankPhase=0; this.renderScreen(); this.later(()=>{ this.local.rankPhase=1; this.renderScreen(); },900); },
      selectPlayer: (t)=>{ this.local.selPid = t.dataset.pid; this.renderScreen(); },
      nextRound: ()=>this.hostNext(),
      playAgain: ()=>this.hostPlayAgain(),
    };
  }

  /* ================= RENDER ================= */
  renderScreen(){
    this.renderToasts();
    const sc = this.local.screen;
    let html = '';
    if(sc==='home') html = this.viewHome();
    else if(sc==='create') html = this.viewCreate();
    else if(sc==='lobby') html = this.viewLobby();
    else if(sc==='round') html = this.viewRound();
    else if(sc==='wait') html = this.viewWait();
    else if(sc==='reveal') html = this.viewReveal();
    else if(sc==='score') html = this.viewScore();
    else if(sc==='ranking') html = this.viewRanking();
    else if(sc==='final') html = this.viewFinal();
    else html = this.viewHome();

    this.root.innerHTML = html;
    this.renderModals();

    if(sc==='round'){
      this.later(()=>{ const el=this.root.querySelector('[data-role="word-input"][data-index="0"]'); if(el) el.focus({preventScroll:true}); }, 50);
      const left = this.state ? Math.max(0, Math.round((this.state.roundEndAt - Date.now())/1000)) : 0;
      this.patchTimer(left);
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
          <div class="heading" style="font-size:32px">Cómo jugar</div>
          ${this.howStep(1,YEL,'Todos reciben la misma palabra','Por ejemplo: PLAYA.')}
          ${this.howStep(2,VIOLET,'Escribí lo que van a poner los demás','No gana lo más original: gana pensar igual que el resto.')}
          ${this.howStep(3,CORAL,'Sumá por cada coincidencia','Si vos y 3 jugadores más pusieron MAR, sumás +3.')}
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
          <div class="heading" style="font-size:clamp(22px,6vw,28px);animation:rise .5s .5s both">Pensá como los demás.</div>
        </div>
        <div style="width:100%;display:flex;flex-direction:column;gap:14px;animation:rise .5s .65s both">
          <button class="btn-primary" data-action="goCreate">JUGAR</button>
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

  viewCreate(){
    const cfg = this.cfgDraft;
    const roundOpts = [1,2,3,4,5].map(n=>`<button data-action="setRounds" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.rounds===n?INK:'#fff'};color:${cfg.rounds===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${n}</button>`).join('');
    const timeOpts = [30,45,60,90].map(n=>`<button data-action="setTime" data-val="${n}" style="height:48px;border-radius:14px;border:2px solid ${INK};background:${cfg.time===n?INK:'#fff'};color:${cfg.time===n?'var(--cream)':INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${n}s</button>`).join('');
    const estimate = '≈ '+Math.max(1,Math.round(cfg.rounds*(cfg.time+35)/60))+' min de juego';
    return `<div class="screen screen-narrow">
      <div class="top-bar"><button class="icon-btn" data-action="goHome" aria-label="Volver">${this.iconBack()}</button><div class="heading" style="font-size:28px">Crear partida</div></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Tu nombre</div>
        <input data-role="cfg-name" value="${esc(this.local.cfgName)}" placeholder="¿Cómo te llamás?" style="height:60px;border-radius:16px;border:2px solid ${INK};background:#fff;padding:0 18px;font-family:'Figtree',sans-serif;font-weight:700;font-size:20px;color:${INK};outline:none">
      </div>
      <div style="background:#fff;border:2px solid ${INK};border-radius:24px;box-shadow:0 4px 0 ${INK};padding:6px 18px;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:2px solid var(--panel-line)">
          <div style="display:flex;flex-direction:column;gap:2px"><div style="font-weight:800;font-size:17px">Jugadores</div><div style="font-size:14px;color:var(--muted)">Máximo en la sala</div></div>
          <div style="display:flex;align-items:center;gap:10px">
            <button data-action="decPlayers" aria-label="Menos" style="width:44px;height:44px;border-radius:14px;border:2px solid ${INK};background:var(--cream);font-size:24px;font-weight:800;color:${INK}">−</button>
            <div style="width:36px;text-align:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:28px">${cfg.players}</div>
            <button data-action="incPlayers" aria-label="Más" style="width:44px;height:44px;border-radius:14px;border:2px solid ${INK};background:var(--cream);font-size:24px;font-weight:800;color:${INK}">+</button>
          </div>
        </div>
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
        <button class="btn-primary" data-action="createGame">CREAR PARTIDA</button>
      </div>
    </div>`;
  }

  viewLobby(){
    const s = this.state, cfg = s.config, pl = this.players();
    const hostId = s.hostId;
    const n = Math.max(cfg.players, pl.length);
    const codeChars = s.code.split('').map(c=>`<div style="width:clamp(48px,13vw,64px);height:clamp(58px,15vw,74px);border-radius:14px;background:#fff;border:2.5px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(30px,8vw,40px)">${c}</div>`).join('');
    const slots = Array.from({length:n},(_,i)=>{
      const p = pl[i];
      if(!p) return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:20px;border:2px dashed var(--dashed);animation:breathe 2s ease-in-out infinite"><div style="flex:0 0 auto;width:46px;height:46px;border-radius:50%;border:2px dashed var(--dashed)"></div><div style="font-size:15px;font-weight:700;color:var(--muted)">Esperando…</div></div>`;
      const tag = p.id===this.myId ? (p.id===hostId?'Vos · Anfitrión':'Vos') : (p.id===hostId?'Anfitrión':'Listo para jugar');
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:20px;background:#fff;border:2px solid ${INK};box-shadow:0 3px 0 ${INK};animation:pop .45s cubic-bezier(.3,1.5,.5,1) both">
        <div class="avatar" style="width:46px;height:46px;background:${p.color};font-size:20px">${esc(p.name.charAt(0).toUpperCase())}</div>
        <div style="min-width:0;display:flex;flex-direction:column;gap:1px"><div style="font-weight:800;font-size:17px;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div><div style="font-size:13px;font-weight:600;color:var(--muted)">${tag}</div></div>
      </div>`;
    }).join('');
    const chips = [cfg.rounds+(cfg.rounds===1?' ronda':' rondas'), cfg.words+' palabras', cfg.time+' s por ronda'].map(t=>`<div style="padding:8px 14px;border-radius:999px;background:#fff;border:2px solid var(--line);font-size:14px;font-weight:700">${t}</div>`).join('');
    const isHost = this.isHost;
    const canStart = isHost && pl.length>=2;
    const cantStart = isHost && pl.length<2;
    const bottom = isHost
      ? (canStart ? `<button class="btn-primary" data-action="startGame">COMENZAR PARTIDA</button>`
        : `<div style="text-align:center;font-size:14px;font-weight:700;color:var(--muted)">Se necesitan al menos 2 jugadores</div><button class="btn-primary" disabled>COMENZAR PARTIDA</button>`)
      : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(hostId)?.name||'El anfitrión')} va a comenzar la partida<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
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
      <div style="display:flex;flex-wrap:wrap;gap:8px">${chips}</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }

  renderStatusWidget(){
    const s = this.state, pl = this.players();
    const dots = pl.map(p=>{
      const done = !!s.done[p.id];
      return `<div style="position:relative;width:38px;height:38px;border-radius:50%;background:${p.color};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px;opacity:${done?1:0.45};transition:opacity .3s">${esc(p.name.charAt(0).toUpperCase())}${done?`<div style="position:absolute;right:-5px;bottom:-5px;width:20px;height:20px;border-radius:50%;background:${MINT};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;animation:pop .4s both">${this.iconCheckSmall()}</div>`:''}</div>`;
    }).join('');
    const doneNames = pl.filter(p=>p.id!==this.myId && s.done[p.id]).map(p=>p.name);
    const statusText = doneNames.length ? listJoin(doneNames)+(doneNames.length>1?' ya terminaron':' ya terminó') : 'Todos están escribiendo…';
    return `<div data-el="statusWidget" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:#fff;border:2px solid var(--line)">
      <div style="display:flex;gap:6px">${dots}</div>
      <div style="font-size:14px;font-weight:700;color:var(--muted);text-wrap:pretty">${esc(statusText)}</div>
    </div>`;
  }

  viewRound(){
    const s = this.state, cfg = s.config;
    const promptSize = s.roundWord.length>7 ? 'clamp(36px, 10vw, 72px)' : 'clamp(56px, 16vw, 108px)';
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
          <div style="flex:1;min-width:0;display:flex;align-items:baseline;gap:6px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800"><span style="font-size:22px">RONDA ${s.round+1}</span><span style="font-size:16px;color:var(--muted)">de ${cfg.rounds}</span></div>
          <div data-el="timerBox" style="display:flex;align-items:center;gap:8px;height:50px;padding:0 16px;border-radius:999px;border:2px solid ${INK};background:#fff;box-shadow:0 3px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:26px;font-variant-numeric:tabular-nums">${this.iconClock()}<span data-el="timerText">${mmss(cfg.time)}</span></div>
        </div>
        <div style="height:6px;background:var(--line)"><div data-el="timerBar" style="height:100%;width:100%;background:${INK};transition:width 1s linear,background .3s"></div></div>
      </div>
      <div style="flex:1;width:100%;max-width:1080px;margin:0 auto;padding:20px 20px 0;display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">
        <div style="flex:1 1 360px;min-width:0;display:flex;flex-direction:column;gap:14px">
          <div style="background:${YEL};border:2.5px solid ${INK};border-radius:28px;box-shadow:0 6px 0 ${INK};padding:26px 22px 30px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;animation:pop .5s cubic-bezier(.3,1.5,.5,1) both">
            <div style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">La palabra es</div>
            <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:${promptSize};line-height:.95;letter-spacing:-.03em;overflow-wrap:anywhere">${esc(s.roundWord)}</div>
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
    const dc = pl.filter(p=>s.done[p.id]).length;
    const allDone = dc===pl.length;
    const waitList = pl.map(p=>{
      const done = !!s.done[p.id];
      const label = p.id===this.myId ? p.name+' (vos)' : p.name;
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0">
        <div class="avatar" style="width:42px;height:42px;background:${p.color};font-size:18px">${esc(p.name.charAt(0).toUpperCase())}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:17px">${esc(label)}</div>
        ${done ? `<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:${MINT};border:2px solid ${INK};font-size:13px;font-weight:800;animation:pop .4s both">${this.iconCheckSmall()}Listo</div>`
               : `<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:var(--panel-line);font-size:13px;font-weight:800;color:var(--muted)">Escribiendo<span style="display:flex;gap:2px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`}
      </div>`;
    }).join('');
    const myWords = ((s.answers[s.round]||{})[this.myId]||[]).map(w=>`<div style="padding:8px 14px;border-radius:999px;background:#fff;border:2px solid ${INK};font-weight:800;font-size:15px">${esc(disp(w))}</div>`).join('');
    return `<div class="screen screen-narrow">
      <div style="display:flex;justify-content:center"><div style="padding:8px 16px;border-radius:999px;background:#fff;border:2px solid var(--line);font-size:14px;font-weight:800;letter-spacing:.06em">RONDA ${s.round+1} · ${esc(s.roundWord)}</div></div>
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
    const gs = this.groups(s.round);
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
      const avatars = g.pids.map(id=>`<div class="avatar" style="width:30px;height:30px;background:${byId[id]?.color||'#ccc'};font-size:13px">${esc((byId[id]?.name||'?').charAt(0).toUpperCase())}</div>`).join('');
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
    const mp = this.points(s.round)[this.myId];
    const m = mp ? mp.items.filter(x=>x.pts>0).length : 0;
    const summary = 'Coincidiste en '+m+' de '+(mp?mp.items.length:0)+' palabras';
    return `<div class="screen screen-wide">
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
        <div style="font-size:14px;font-weight:800;letter-spacing:.14em">¿QUÉ RESPONDIERON?</div>
        <div style="padding:10px 26px;border-radius:20px;background:${YEL};border:2.5px solid ${INK};box-shadow:0 5px 0 ${INK};font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(40px,11vw,64px);line-height:1;letter-spacing:-.02em;transform:rotate(-2deg)">${esc(s.roundWord)}</div>
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
    const pts = this.points(s.round);
    const order = pl.slice().sort((a,b)=>pts[b.id].total-pts[a.id].total||a.name.localeCompare(b.name));
    const rows = order.map((p,i)=>{
      const sel = this.local.selPid===p.id;
      const label = p.id===this.myId ? p.name+' (vos)' : p.name;
      return `<button data-action="selectPlayer" data-pid="${p.id}" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px 12px 12px;border-radius:20px;background:${p.id===this.myId?'#FFEDE6':'#fff'};border:2px solid ${sel?INK:'var(--line)'};box-shadow:${sel?`0 4px 0 ${INK}`:'none'};text-align:left;color:${INK};animation:rise .4s both;animation-delay:${(i*0.08).toFixed(2)}s">
        <div style="flex:0 0 auto;width:36px;height:36px;border-radius:12px;background:${RANKBG[i]||'#F1E7D8'};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px">${i+1}</div>
        <div class="avatar" style="width:42px;height:42px;background:${p.color};font-size:18px">${esc(p.name.charAt(0).toUpperCase())}</div>
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
        <div style="font-size:14px;font-weight:800;letter-spacing:.14em">RESULTADOS · RONDA ${s.round+1}</div>
        <div class="heading" style="font-size:clamp(64px,18vw,96px);line-height:1;letter-spacing:-.03em;animation:pop .6s cubic-bezier(.3,1.6,.5,1) both">+${pts[this.myId].total}</div>
        <div style="font-size:17px;font-weight:700;color:var(--muted)">puntos para vos en ${esc(s.roundWord)}</div>
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
    const s = this.state, cfg = s.config, pl = this.players();
    const cur = this.totals(s.round), prevT = s.round>0 ? this.totals(s.round-1) : null;
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
        <div class="avatar" style="width:46px;height:46px;background:${p.color};font-size:20px">${esc(p.name.charAt(0).toUpperCase())}</div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
          <div style="font-weight:800;font-size:18px">${esc(label)}</div>
          ${ph?`<div style="font-size:13px;font-weight:800;color:${deltaColor};animation:rise .3s both">${deltaText}</div>`:''}
        </div>
        ${ph?`<div style="padding:4px 10px;border-radius:999px;background:${MINT};border:2px solid ${INK};font-weight:800;font-size:14px;animation:pop .4s both">+${cur[p.id]-(prevT?prevT[p.id]:0)}</div>`:''}
        <div style="flex:0 0 auto;min-width:72px;text-align:right;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:24px">${total} pts</div>
      </div>`;
    }).join('');
    const dots = Array.from({length:cfg.rounds},(_,i)=>`<div style="width:${i===s.round?'36px':'14px'};height:10px;border-radius:999px;background:${i<=s.round?INK:'#fff'};border:2px solid ${INK};transition:width .3s"></div>`).join('');
    const isLast = s.round+1 >= cfg.rounds;
    const nextLabel = isLast ? 'VER RESULTADO FINAL' : 'SIGUIENTE RONDA';
    const bottom = this.isHost
      ? `<button class="btn-primary" data-action="nextRound">${nextLabel}</button>`
      : `<div style="height:62px;border-radius:18px;border:2px solid ${INK};background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;font-size:17px">${esc(this.playerById(s.hostId)?.name||'El anfitrión')} va a continuar<span style="display:flex;gap:3px"><span style="animation:blink 1.2s infinite">•</span><span style="animation:blink 1.2s .2s infinite">•</span><span style="animation:blink 1.2s .4s infinite">•</span></span></div>`;
    return `<div class="screen">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center">
        <div class="heading" style="font-size:clamp(36px,10vw,52px);letter-spacing:-.02em;line-height:1">CLASIFICACIÓN</div>
        <div style="font-size:16px;font-weight:700;color:var(--muted)">Después de la ronda ${s.round+1} de ${cfg.rounds}</div>
      </div>
      <div style="display:flex;gap:6px;justify-content:center">${dots}</div>
      <div style="position:relative;height:${pl.length*86}px">${rows}</div>
      <div class="sticky-bottom">${bottom}</div>
    </div>`;
  }

  viewFinal(){
    const s = this.state, cfg = s.config, pl = this.players();
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
        <div class="avatar" style="width:${i===0?'72px':'56px'};height:${i===0?'72px':'56px'};background:${p.color};box-shadow:0 4px 0 ${INK};font-size:24px">${esc(p.name.charAt(0).toUpperCase())}</div>
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
        <div class="avatar" style="width:38px;height:38px;background:${byId[id].color};font-size:16px">${esc(byId[id].name.charAt(0).toUpperCase())}</div>
        <div style="flex:1;min-width:0;font-weight:800;font-size:17px">${esc(label)}</div>
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px">${tot[id]} pts</div>
      </div>`;
    }).join('');

    let best=null, myMatch=0, myWords=0, myBest=null; const solo={}, pair={};
    s.answers.forEach((_,r)=>this.groups(r).forEach(g=>{
      const n=g.pids.length;
      if(!best||n>best.n) best={label:g.label,n,r};
      if(n===1) solo[g.pids[0]]=(solo[g.pids[0]]||0)+1;
      for(let a=0;a<n;a++) for(let b=a+1;b<n;b++){ const k=[g.pids[a],g.pids[b]].sort().join('|'); pair[k]=(pair[k]||0)+1; }
      if(g.pids.includes(this.myId)){ myWords++; if(n>1){ myMatch++; if(!myBest||n>myBest.n) myBest={label:g.label,n}; } }
    }));
    const pk = Object.entries(pair).sort((a,b)=>b[1]-a[1])[0];
    const sk = Object.entries(solo).sort((a,b)=>b[1]-a[1])[0];
    const stats = [
      best && {label:'Palabra más popular', value:best.label.toUpperCase(), sub:best.n+' jugadores · '+s.roundWord, bg:CORAL},
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
      ? `<button class="btn-primary" data-action="playAgain">JUGAR DE NUEVO</button><button class="btn-secondary" data-action="goHome">VOLVER AL INICIO</button>`
      : `<button class="btn-secondary" data-action="goHome">VOLVER AL INICIO</button>`;
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
window.__game = new Game(app, toastRoot, modalRoot);
