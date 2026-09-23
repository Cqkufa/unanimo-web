// Word banks for Dibujalo and Tutti Frutti. Organized so adding new
// words/categories later is a one-line change, not a code change.

/* ================= DIBUJALO ================= */
// Each entry: { word, emoji, difficulty: 1(easy) 2(medium) 3(hard) }
export const DIBUJALO_BANK = {
  'Animal': [
    {word:'Elefante', emoji:'🐘', difficulty:2}, {word:'Jirafa', emoji:'🦒', difficulty:2},
    {word:'Pingüino', emoji:'🐧', difficulty:2}, {word:'Cocodrilo', emoji:'🐊', difficulty:2},
    {word:'Tiburón', emoji:'🦈', difficulty:2}, {word:'Mono', emoji:'🐵', difficulty:1},
    {word:'León', emoji:'🦁', difficulty:1}, {word:'Pulpo', emoji:'🐙', difficulty:2},
    {word:'Perro', emoji:'🐶', difficulty:1}, {word:'Gato', emoji:'🐱', difficulty:1},
    {word:'Caracol', emoji:'🐌', difficulty:1}, {word:'Araña', emoji:'🕷️', difficulty:2},
  ],
  'Objeto': [
    {word:'Celular', emoji:'📱', difficulty:1}, {word:'Computadora', emoji:'💻', difficulty:2},
    {word:'Guitarra', emoji:'🎸', difficulty:2}, {word:'Paraguas', emoji:'☂️', difficulty:1},
    {word:'Mochila', emoji:'🎒', difficulty:1}, {word:'Bicicleta', emoji:'🚲', difficulty:2},
    {word:'Cámara', emoji:'📷', difficulty:2}, {word:'Televisor', emoji:'📺', difficulty:1},
    {word:'Heladera', emoji:'🧊', difficulty:2}, {word:'Reloj', emoji:'⌚', difficulty:1},
    {word:'Tijeras', emoji:'✂️', difficulty:1}, {word:'Lámpara', emoji:'💡', difficulty:2},
  ],
  'Lugar': [
    {word:'Playa', emoji:'🏖️', difficulty:1}, {word:'Escuela', emoji:'🏫', difficulty:2},
    {word:'Hospital', emoji:'🏥', difficulty:2}, {word:'Restaurante', emoji:'🍽️', difficulty:2},
    {word:'Cine', emoji:'🎬', difficulty:2}, {word:'Castillo', emoji:'🏰', difficulty:2},
    {word:'Supermercado', emoji:'🛒', difficulty:2}, {word:'Aeropuerto', emoji:'✈️', difficulty:3},
  ],
  'Personaje': [
    {word:'Pirata', emoji:'🏴‍☠️', difficulty:2}, {word:'Astronauta', emoji:'🧑‍🚀', difficulty:2},
    {word:'Policía', emoji:'👮', difficulty:1}, {word:'Bombero', emoji:'🧑‍🚒', difficulty:1},
    {word:'Chef', emoji:'👨‍🍳', difficulty:2}, {word:'Vampiro', emoji:'🧛', difficulty:2},
    {word:'Superhéroe', emoji:'🦸', difficulty:2}, {word:'Rey', emoji:'🤴', difficulty:1},
  ],
  'Acción': [
    {word:'Bailar', emoji:'💃', difficulty:2}, {word:'Dormir', emoji:'😴', difficulty:1},
    {word:'Correr', emoji:'🏃', difficulty:1}, {word:'Cocinar', emoji:'🍳', difficulty:2},
    {word:'Nadar', emoji:'🏊', difficulty:1}, {word:'Llorar', emoji:'😢', difficulty:2},
    {word:'Volar', emoji:'🕊️', difficulty:2}, {word:'Besar', emoji:'💋', difficulty:2},
  ],
  'Concepto': [
    {word:'Primera cita', emoji:'💐', difficulty:3}, {word:'Fiesta sorpresa', emoji:'🎉', difficulty:3},
    {word:'Apocalipsis', emoji:'☄️', difficulty:3}, {word:'Vacaciones', emoji:'🧳', difficulty:2},
    {word:'Viaje en avión', emoji:'✈️', difficulty:2}, {word:'Cumpleaños', emoji:'🎂', difficulty:2},
    {word:'Amor', emoji:'❤️', difficulty:3}, {word:'Miedo', emoji:'😱', difficulty:3},
  ],
};
const DIBUJALO_FUNNY_EMPTY = ['Bueno... tenía sentido.','La intención estaba.','Arte moderno.','¿Cómo nadie vio esto?','Casi.'];
export function dibujaloFunnyLine(){ return DIBUJALO_FUNNY_EMPTY[Math.floor(Math.random()*DIBUJALO_FUNNY_EMPTY.length)]; }

// Picks 3 words of similar difficulty (mixing categories) that haven't
// been used recently in this game.
export function pickDibujaloTrio(usedWords){
  const used = new Set((usedWords||[]).map(w=>w.toLowerCase()));
  const all = [];
  for(const cat in DIBUJALO_BANK) DIBUJALO_BANK[cat].forEach(e=>all.push({...e, category:cat}));
  const fresh = all.filter(e=>!used.has(e.word.toLowerCase()));
  const pool = fresh.length>=3 ? fresh : all;
  // Group by difficulty, prefer picking all 3 from the same difficulty tier
  // when possible, so the choice feels fair (per spec: similar difficulty).
  const byDiff = {1:[],2:[],3:[]};
  pool.forEach(e=>byDiff[e.difficulty].push(e));
  const tiers = [2,1,3].filter(d=>byDiff[d].length>=3);
  const tier = tiers.length ? byDiff[tiers[0]] : pool;
  const shuffled = tier.slice();
  for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
  if(shuffled.length>=3) return shuffled.slice(0,3);
  // fallback: not enough in one tier, just grab 3 random unique from pool
  const shuffledPool = pool.slice();
  for(let i=shuffledPool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffledPool[i],shuffledPool[j]]=[shuffledPool[j],shuffledPool[i]]; }
  return shuffledPool.slice(0,3);
}

/* ================= TUTTI FRUTTI ================= */
export const TUTTI_CATEGORIES = [
  {id:'nombre', label:'Nombre', icon:'👤'},
  {id:'animal', label:'Animal', icon:'🐶'},
  {id:'pais', label:'País', icon:'🌎'},
  {id:'ciudad', label:'Ciudad', icon:'🏙️'},
  {id:'comida', label:'Comida', icon:'🍕'},
  {id:'objeto', label:'Objeto', icon:'📦'},
  {id:'profesion', label:'Profesión', icon:'💼'},
  {id:'color', label:'Color', icon:'🎨'},
  {id:'pelicula', label:'Película', icon:'🎬'},
  {id:'famoso', label:'Famoso/a', icon:'⭐'},
  {id:'marca', label:'Marca', icon:'🏷️'},
  {id:'planta', label:'Planta', icon:'🌱'},
];
// Weighted letter pool: common letters appear more often than rare ones,
// and truly brutal letters are excluded unless "difícil" mode is on.
const LETTERS_COMMON = 'AAABBCCDDEEEFGGLLMMPPRRSSTT'.split('');
const LETTERS_UNCOMMON = 'HIJNOQUVWXYZ'.split('');
const LETTERS_HARD = ['K','Ñ'];
export function pickLetter(recent, hard){
  const avoid = new Set(recent||[]);
  const pool = hard ? LETTERS_COMMON.concat(LETTERS_UNCOMMON, LETTERS_HARD) : LETTERS_COMMON.concat(LETTERS_UNCOMMON);
  const fresh = pool.filter(l=>!avoid.has(l));
  const source = fresh.length ? fresh : pool;
  return source[Math.floor(Math.random()*source.length)];
}
