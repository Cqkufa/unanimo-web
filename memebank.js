// Template library for Make It Meme. Organized like wordbank.js so adding
// content later is data, not code:
//
//  - To add a template: drop the image in memes/<categoria>/ and add one
//    t('<categoria>-NNN', ancho, alto) line to its pack below. Width/height
//    are only used to reserve the right aspect ratio while the image loads.
//  - Animated templates: an .mp4 (no audio, it plays muted in a loop) plus a
//    .webp poster with the same name, added with v(...) instead of t(...).
//  - To add a category: add it to MEME_CATEGORIES and put its templates in
//    any pack.
//  - To add a themed pack (e.g. "Mundial", "Navidad"): add another entry to
//    MEME_PACKS with its own templates. Every template carries its pack id,
//    so filtering by pack later is a one-line change in pickMemeTemplate.
//
// Images were provided by the room owner. Only add images you have the
// right to use.

export const MEME_CATEGORIES = {
  reacciones: { name:'Reacciones', emoji:'😳' },
  argentina:  { name:'Argentina',  emoji:'🧉' },
  animales:   { name:'Animales',   emoji:'🐶' },
  animacion:  { name:'Animación',  emoji:'📺' },
  animados:   { name:'Animados',   emoji:'🎬' },
};

// Helper: template id doubles as its file name; category is its prefix.
function t(id, w, h){ const cat = id.slice(0, id.lastIndexOf('-')); return { id, cat, w, h, src:`memes/${cat}/${id}.webp` }; }
// Animated template: looping muted video + still poster (shown while it loads).
function v(id, w, h){ const tpl = t(id, w, h); return { ...tpl, video:true, src:`memes/${tpl.cat}/${id}.mp4`, poster:`memes/${tpl.cat}/${id}.webp` }; }

export const MEME_PACKS = {
  base: {
    name: 'Ronda clásico',
    templates: [
      // reacciones 62
      t('reacciones-001',678,704), t('reacciones-002',720,717), t('reacciones-003',650,645), t('reacciones-004',360,360),
      t('reacciones-005',714,720), t('reacciones-006',720,719), t('reacciones-007',720,657), t('reacciones-008',720,571),
      t('reacciones-009',720,593), t('reacciones-010',299,300), t('reacciones-011',547,720), t('reacciones-012',720,669),
      t('reacciones-013',702,701), t('reacciones-014',720,535), t('reacciones-015',720,505), t('reacciones-016',300,336),
      t('reacciones-017',720,720), t('reacciones-018',720,417), t('reacciones-019',720,432), t('reacciones-020',720,593),
      t('reacciones-021',720,541), t('reacciones-022',309,323), t('reacciones-023',552,499), t('reacciones-024',576,576),
      t('reacciones-025',633,720), t('reacciones-026',720,545), t('reacciones-027',720,711), t('reacciones-028',720,511),
      t('reacciones-029',720,720), t('reacciones-030',640,484), t('reacciones-031',474,694), t('reacciones-032',720,720),
      t('reacciones-033',330,600), t('reacciones-034',450,450), t('reacciones-035',720,720), t('reacciones-036',720,405),
      t('reacciones-037',634,585), t('reacciones-038',708,720), t('reacciones-039',715,720), t('reacciones-040',500,375),
      t('reacciones-041',484,376), t('reacciones-042',604,720), t('reacciones-043',450,480), t('reacciones-044',534,413),
      t('reacciones-045',250,213), t('reacciones-046',520,439), t('reacciones-047',720,720), t('reacciones-048',236,236),
      t('reacciones-049',720,501), t('reacciones-050',576,480), t('reacciones-051',498,490), t('reacciones-052',720,720),
      t('reacciones-053',576,360), t('reacciones-054',720,607), t('reacciones-055',720,536), t('reacciones-056',720,704),
      t('reacciones-057',480,360), t('reacciones-058',720,720), t('reacciones-059',646,641), t('reacciones-060',720,710),
      t('reacciones-061',624,720), t('reacciones-062',638,720),
      // argentina 37
      t('argentina-001',605,687), t('argentina-002',553,545), t('argentina-003',629,680), t('argentina-004',480,480),
      t('argentina-005',720,576), t('argentina-006',720,405), t('argentina-007',720,637), t('argentina-008',720,474),
      t('argentina-009',560,720), t('argentina-010',383,339), t('argentina-011',720,720), t('argentina-012',720,593),
      t('argentina-013',577,720), t('argentina-014',720,615), t('argentina-015',576,576), t('argentina-016',480,488),
      t('argentina-017',405,720), t('argentina-018',470,657), t('argentina-019',614,680), t('argentina-020',720,681),
      t('argentina-021',512,341), t('argentina-022',720,720), t('argentina-023',720,538), t('argentina-024',720,514),
      t('argentina-025',686,686), t('argentina-026',712,720), t('argentina-027',720,534), t('argentina-028',360,360),
      t('argentina-029',720,566), t('argentina-030',720,405), t('argentina-031',560,486), t('argentina-032',360,254),
      t('argentina-033',622,423), t('argentina-034',340,340), t('argentina-035',709,672), t('argentina-036',600,338),
      t('argentina-037',697,720),
      // animales 15
      t('animales-001',398,363), t('animales-002',720,568), t('animales-003',251,238), t('animales-004',467,489),
      t('animales-005',405,720), t('animales-006',640,640), t('animales-007',597,720), t('animales-008',310,263),
      t('animales-009',720,634), t('animales-010',512,512), t('animales-011',720,667), t('animales-012',720,664),
      t('animales-013',720,720), t('animales-014',320,320), t('animales-015',611,720),
      // animacion 28
      t('animacion-001',720,621), t('animacion-002',720,720), t('animacion-003',640,640), t('animacion-004',640,640),
      t('animacion-005',720,720), t('animacion-006',693,693), t('animacion-007',512,512), t('animacion-008',480,640),
      t('animacion-009',720,720), t('animacion-010',412,410), t('animacion-011',720,650), t('animacion-012',713,713),
      t('animacion-013',720,405), t('animacion-014',720,720), t('animacion-015',720,551), t('animacion-016',720,720),
      t('animacion-017',720,541), t('animacion-018',657,720), t('animacion-019',720,489), t('animacion-020',476,525),
      t('animacion-021',621,720), t('animacion-022',720,670), t('animacion-023',720,440), t('animacion-024',256,256),
      t('animacion-025',720,705), t('animacion-026',720,435), t('animacion-027',720,405), t('animacion-028',720,614),
      // animados 17 (memes animados: video en loop, sin sonido)
      v('animados-001',540,540), v('animados-002',540,502), v('animados-003',402,402), v('animados-004',526,540),
      v('animados-005',480,480), v('animados-006',540,540), v('animados-007',540,470), v('animados-008',418,360),
      v('animados-009',540,540), v('animados-010',540,298), v('animados-011',540,540), v('animados-012',540,540),
      v('animados-013',540,540), v('animados-014',480,448), v('animados-015',502,540), v('animados-016',494,540),
      v('animados-017',540,298),
    ],
  },
};

// Flat lookup by id (the only thing that travels over the network is the id).
export const MEME_TEMPLATES = {};
Object.entries(MEME_PACKS).forEach(([packId, pack])=>{
  pack.templates.forEach(tpl=>{ tpl.pack = packId; MEME_TEMPLATES[tpl.id] = tpl; });
});

export function memeTemplate(id){ return MEME_TEMPLATES[id] || null; }

export function memeCategoryCounts(packs){
  const out = {};
  Object.values(MEME_TEMPLATES).forEach(tpl=>{
    if(packs && !packs.includes(tpl.pack)) return;
    out[tpl.cat] = (out[tpl.cat]||0) + 1;
  });
  return out;
}

// Random template from the chosen categories (and packs), never repeating
// one already used in this match. If every eligible template was already
// used, it starts over rather than failing.
export function pickMemeTemplate(usedIds, categories, packs){
  const used = new Set(usedIds||[]);
  const eligible = Object.values(MEME_TEMPLATES).filter(tpl=>
    (!categories || !categories.length || categories.includes(tpl.cat)) &&
    (!packs || !packs.length || packs.includes(tpl.pack)));
  const pool = eligible.filter(tpl=>!used.has(tpl.id));
  const from = pool.length ? pool : eligible;
  if(!from.length) return null;
  return from[Math.floor(Math.random()*from.length)].id;
}

// Practice-mode bots pick one of these (top / bottom). Generic on purpose so
// they work on any template.
export const MEME_BOT_CAPTIONS = [
  ['Cuando el profe dice', '"esto no entra en el examen"'],
  ['Yo después de decir', '"una sola birra y me voy"'],
  ['', 'Cuando te dicen "tenemos que hablar"'],
  ['Mi cara cuando', 'el delivery dice "5 minutos"'],
  ['Cuando abrís la heladera', 'por décima vez y sigue igual'],
  ['El lunes a las 7 AM:', ''],
  ['Cuando mamá dice', '"¿y vos qué hiciste hoy?"'],
  ['Yo explicando por qué', 'llegué tarde otra vez'],
  ['Cuando el grupo de WhatsApp', 'se pone a hablar de política'],
  ['', 'POV: te quedan 2% de batería'],
  ['Cuando ves el resumen', 'de la tarjeta'],
  ['Nadie:', 'Absolutamente nadie: Yo a las 3 AM'],
];
