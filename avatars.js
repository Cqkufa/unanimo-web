// ================= AVATARS (pixel art) =================
// Every avatar is drawn as crisp SVG on a 100×100 box, in a chunky 8-bit
// style: the head is a stepped "pixel circle", features are blocks, and
// hats / glasses / beards are small sprites drawn from text maps (one
// character = one 4×4 pixel), so adding a new one is just drawing it in
// ASCII below.
//
// An avatar is plain data that travels over the network:
//   { v:2, skin, eyes, mouth, hat, glasses, beard }   (all small indexes)
// Older avatars ({skin,eyes,mouth,hat} with the previous 10 accessories)
// are converted on the fly by normalizeAvatar(), so nobody loses theirs.

const INK='#1D1B2F', CORAL='#FF6B4A', MINT='#2ED3A6', YEL='#FFC83D', VIOLET='#9B85FF', BLUE='#5CB8FF', PINK='#FF8CC2';

// Face color (deliberately silly: skin tones plus "no human has this" colors).
export const FACE_COLORS = ['#FFE0BD','#FFCD94','#C68642','#8D5524','#4A2C17','#7ED957','#5CB8FF','#9B85FF','#FF8CC2','#FFC83D'];
const FACE_COLOR_NAMES = ['Clara','Media','Canela','Morena','Oscura','Verde','Azul','Violeta','Rosa','Amarilla'];

// ---------- sprite helper ----------
// Legend for the text maps. '.' = transparent.
const PAL = { K:INK, W:'#FFFFFF', R:CORAL, Y:YEL, G:'#7ED957', D:'#3E9B4F', B:BLUE, P:PINK, V:VIOLET, O:'#FF9F43', N:'#8D5524', T:'#E8B27A', S:'#C9CED6', M:MINT, C:'#FFF3D6', A:'#2B2840' };
const PX = 4;
// Draws a text map. Centered horizontally on the 100-wide box unless x is
// given; `bottom` is the y where the sprite's last row ends.
function sprite(rows, { bottom = 26, x = null, opacity = 1 } = {}){
  const w = Math.max(...rows.map(r=>r.length));
  const x0 = x==null ? Math.round((100 - w*PX)/2) : x;
  const y0 = bottom - rows.length*PX;
  let out = '';
  rows.forEach((row, r)=>{
    // merge horizontal runs of the same color into one rect
    let c = 0;
    while(c < row.length){
      const ch = row[c];
      if(ch==='.' || ch===' '){ c++; continue; }
      let e = c; while(e+1 < row.length && row[e+1]===ch) e++;
      out += `<rect x="${x0+c*PX}" y="${y0+r*PX}" width="${(e-c+1)*PX}" height="${PX}" fill="${PAL[ch]||INK}"/>`;
      c = e+1;
    }
  });
  return opacity<1 ? `<g opacity="${opacity}">${out}</g>` : out;
}

// ---------- head ----------
const HEAD = 'M26 8 H74 V16 H86 V28 H94 V76 H86 V88 H74 V96 H26 V88 H14 V76 H6 V28 H14 V16 H26 Z';

// ---------- eyes ----------
const EYES = [
  ['Normales', `<rect x="26" y="38" width="14" height="14" fill="${INK}"/><rect x="60" y="38" width="14" height="14" fill="${INK}"/><rect x="26" y="38" width="5" height="5" fill="#fff"/><rect x="60" y="38" width="5" height="5" fill="#fff"/>`],
  ['Felices', `<rect x="24" y="44" width="6" height="6" fill="${INK}"/><rect x="30" y="38" width="6" height="6" fill="${INK}"/><rect x="36" y="44" width="6" height="6" fill="${INK}"/><rect x="58" y="44" width="6" height="6" fill="${INK}"/><rect x="64" y="38" width="6" height="6" fill="${INK}"/><rect x="70" y="44" width="6" height="6" fill="${INK}"/>`],
  ['Sorprendidos', `<rect x="22" y="34" width="20" height="20" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="29" y="41" width="8" height="8" fill="${INK}"/><rect x="58" y="34" width="20" height="20" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="65" y="41" width="8" height="8" fill="${INK}"/>`],
  ['Dormidos', `<rect x="24" y="46" width="18" height="5" fill="${INK}"/><rect x="58" y="46" width="18" height="5" fill="${INK}"/>`],
  ['Guiño', `<rect x="26" y="38" width="14" height="14" fill="${INK}"/><rect x="26" y="38" width="5" height="5" fill="#fff"/><rect x="58" y="44" width="6" height="6" fill="${INK}"/><rect x="64" y="38" width="6" height="6" fill="${INK}"/><rect x="70" y="44" width="6" height="6" fill="${INK}"/>`],
  ['Bizcos', `<rect x="20" y="36" width="20" height="18" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="31" y="41" width="7" height="8" fill="${INK}"/><rect x="60" y="36" width="20" height="18" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="62" y="41" width="7" height="8" fill="${INK}"/>`],
  ['Enamorados', sprite(['.RR.RR..........RR.RR.','RRRRRRR........RRRRRRR','RRRRRRR........RRRRRRR','.RRRRR..........RRRRR.','..RRR............RRR..','...R..............R...'], { bottom:56 })],
  ['Estrellas', sprite(['...Y..............Y...','..YYY............YYY..','YYYYYYY........YYYYYYY','.YYYYY..........YYYYY.','.YY.YY..........YY.YY.'], { bottom:54 })],
  ['Enojados', `<rect x="22" y="32" width="8" height="5" fill="${INK}"/><rect x="30" y="36" width="10" height="5" fill="${INK}"/><rect x="70" y="32" width="8" height="5" fill="${INK}"/><rect x="60" y="36" width="10" height="5" fill="${INK}"/><rect x="28" y="44" width="10" height="10" fill="${INK}"/><rect x="62" y="44" width="10" height="10" fill="${INK}"/>`],
  ['Mareados', sprite(['K.K.......K.K','.K.........K.','K.K.......K.K'].map(r=>r.replace(/K/g,'K')), { bottom:52 })],
  ['Cíclope', `<rect x="38" y="32" width="24" height="24" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="46" y="40" width="9" height="9" fill="${INK}"/><rect x="46" y="40" width="3" height="3" fill="#fff"/>`],
  ['Llorando', `<rect x="26" y="38" width="14" height="10" fill="${INK}"/><rect x="60" y="38" width="14" height="10" fill="${INK}"/><rect x="26" y="48" width="6" height="14" fill="${BLUE}"/><rect x="68" y="48" width="6" height="14" fill="${BLUE}"/>`],
];

// ---------- mouths ----------
const MOUTHS = [
  ['Sonrisa', `<rect x="30" y="64" width="8" height="6" fill="${INK}"/><rect x="38" y="70" width="24" height="6" fill="${INK}"/><rect x="62" y="64" width="8" height="6" fill="${INK}"/>`],
  ['Sonrisón', `<rect x="32" y="64" width="36" height="14" fill="${INK}"/><rect x="38" y="64" width="8" height="6" fill="#fff"/><rect x="54" y="64" width="8" height="6" fill="#fff"/>`],
  ['Seria', `<rect x="34" y="70" width="32" height="6" fill="${INK}"/>`],
  ['Pícara', `<rect x="34" y="66" width="10" height="6" fill="${INK}"/><rect x="44" y="70" width="10" height="6" fill="${INK}"/><rect x="54" y="66" width="12" height="6" fill="${INK}"/><rect x="62" y="62" width="6" height="6" fill="${INK}"/>`],
  ['Sorprendida', `<rect x="43" y="64" width="14" height="14" fill="${INK}"/>`],
  ['Lengua afuera', `<rect x="32" y="66" width="36" height="6" fill="${INK}"/><rect x="44" y="72" width="12" height="10" fill="${PINK}" stroke="${INK}" stroke-width="2"/>`],
  ['Dientes', `<rect x="32" y="64" width="36" height="14" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="40" y="64" width="4" height="14" fill="${INK}"/><rect x="50" y="64" width="4" height="14" fill="${INK}"/><rect x="60" y="64" width="4" height="14" fill="${INK}"/>`],
  ['Beso', `<rect x="44" y="66" width="12" height="12" fill="${PINK}" stroke="${INK}" stroke-width="3"/>`],
  ['Colmillos', `<rect x="34" y="66" width="32" height="6" fill="${INK}"/><rect x="38" y="72" width="6" height="8" fill="#fff" stroke="${INK}" stroke-width="2"/><rect x="56" y="72" width="6" height="8" fill="#fff" stroke="${INK}" stroke-width="2"/>`],
  ['Nerviosa', `<rect x="28" y="68" width="9" height="6" fill="${INK}"/><rect x="37" y="74" width="9" height="6" fill="${INK}"/><rect x="46" y="68" width="9" height="6" fill="${INK}"/><rect x="55" y="74" width="9" height="6" fill="${INK}"/><rect x="64" y="68" width="9" height="6" fill="${INK}"/>`],
  ['Triste', `<rect x="30" y="74" width="8" height="6" fill="${INK}"/><rect x="38" y="68" width="24" height="6" fill="${INK}"/><rect x="62" y="74" width="8" height="6" fill="${INK}"/>`],
  ['Babeando', `<rect x="32" y="64" width="36" height="12" fill="${INK}"/><rect x="58" y="76" width="6" height="10" fill="${BLUE}"/>`],
];

// ---------- hats (sprites sit on top of the head) ----------
const HATS = [
  ['Ninguno', ''],
  ['Gorra', sprite([
    '.....KKKKKKKKKK.........',
    '...KKRRRRRRRRRRKK.......',
    '..KRRRRRRWWRRRRRRK......',
    '.KRRRRRRRWWRRRRRRRK.....',
    '.KRRRRRRRRRRRRRRRRKKKKKK',
    '.KKKKKKKKKKKKKKKKKRRRRRK',
    '..................KKKKKK',
  ], { bottom:26, x:10 })],
  ['Flor', sprite([
    '.....KKK.KKK.....',
    '....KPPPKPPPK....',
    '.KK.KPPPKPPPK.KK.',
    'KPPKKKPPPPPKKKPPK',
    'KPPPPKKYYYKKPPPPK',
    '.KKPPKYYYYYKPPKK.',
    'KPPPPKKYYYKKPPPPK',
    'KPPKKKPPPPPKKKPPK',
    '.KK.KPPPKPPPK.KK.',
    '....KPPPKPPPK....',
    '.....KKKGKKK.....',
    '........G........',
    '.......KGK.......',
  ], { bottom:24 })],
  ['Cactus', sprite([
    '.......KKK.......',
    '.KK...KGGGK......',
    'KGGK..KGWGK..KK..',
    'KGGK..KGGGK.KGGK.',
    'KGGKKKKGGGKKKGGK.',
    '.KGGGGGGWGGGGGK..',
    '..KKKKKGGGKKKKK..',
    '.KKKKKKKKKKKKKKK.',
    '.KOOOOOOOOOOOOOK.',
    '..KOOOOOOOOOOOK..',
    '..KOOOOOOOOOOOK..',
    '...KKKKKKKKKKK...',
  ], { bottom:24 })],
  ['Torta', sprite([
    '......KYK......',
    '......KRK......',
    '......KWK......',
    '.KKKKKKWKKKKKK.',
    'KPPPPPPPPPPPPPK',
    'KPWPPWPPPWPPWPK',
    'KWWWWWWWWWWWWWK',
    'KNNNNNNNNNNNNNK',
    'KWWWWWWWWWWWWWK',
    'KNNNNNNNNNNNNNK',
    '.KKKKKKKKKKKKK.',
  ], { bottom:24 })],
  ['Cono', sprite([
    '......K......',
    '.....KOK.....',
    '....KOOOK....',
    '....KWWWK....',
    '...KWWWWWK...',
    '...KOOOOOK...',
    '..KOOOOOOOK..',
    '..KWWWWWWWK..',
    '.KOOOOOOOOOK.',
    'KKKKKKKKKKKKK',
    'KOOOOOOOOOOOK',
    'KKKKKKKKKKKKK',
  ], { bottom:24 })],
  ['Mate', sprite([
    '..........KK..',
    '.........KSSK.',
    '........KSSK..',
    '.KKKKKKKSSKKK.',
    'KDDDDDKSSKDDDK',
    'KNNNNNNNNNNNNK',
    'KNNTNNNNNNTNNK',
    'KNNNNNNNNNNNNK',
    '.KNNNNNNNNNNK.',
    '..KKKKKKKKKK..',
  ], { bottom:22 })],
  ['Banana', sprite([
    '...............KK.',
    '..............KNK.',
    '.............KYYK.',
    '...........KKYYYK.',
    'KK.......KKYYYYK..',
    'KYKKKKKKKYYYYYK...',
    '.KYYYYYYYYYYYK....',
    '..KKYYYYYYYKK.....',
    '....KKKKKKK.......',
  ], { bottom:22 })],
  ['Patito', sprite([
    '......KKKK......',
    '.....KYYYYK.....',
    '....KYYKYYKKK...',
    '....KYYYYYKOOK..',
    '.....KYYYYKKK...',
    'KK...KYYYYK.....',
    'KYKKKYYYYYYK....',
    'KYYYYYYYYYYYK...',
    '.KYYYYYYYYYYK...',
    '..KKKKKKKKKK....',
  ], { bottom:20 })],
  ['Hélice', sprite([
    'KKKKK.....KKKKK',
    'KRRRRKKKKKBBBBK',
    'KKKKK..K..KKKKK',
    '.......K.......',
    '...KKKKKKKKK...',
    '.KKRRRYYYBBBKK.',
    'KRRRRYYYYYBBBBK',
    'KRRRRYYYYYBBBBK',
    'KKKKKKKKKKKKKKK',
  ], { bottom:24 })],
  ['Chef', sprite([
    '..KKK..KKK..KKK..',
    '.KWWWKKWWWKKWWWK.',
    'KWWWWWWWWWWWWWWWK',
    'KWWWWWWWWWWWWWWWK',
    '.KWWWWWWWWWWWWWK.',
    '..KWWWWWWWWWWWK..',
    '..KWWWWWWWWWWWK..',
    '..KKKKKKKKKKKKK..',
    '..KWWWWWWWWWWWK..',
    '..KKKKKKKKKKKKK..',
  ], { bottom:24 })],
  ['Corona', sprite([
    'K.....K.....K',
    'KK...KYK...KK',
    'KYK.KYYYK.KYK',
    'KYYKYYRYYKYYK',
    'KYYYYYYYYYYYK',
    'KYBYYYRYYYBYK',
    'KKKKKKKKKKKKK',
  ], { bottom:22 })],
  ['Galera', sprite([
    '...KKKKKKKKK...',
    '...KAAAAAAAK...',
    '...KAAAAAAAK...',
    '...KAAAAAAAK...',
    '...KRRRRRRRK...',
    'KKKKKKKKKKKKKKK',
    'KAAAAAAAAAAAAAK',
    'KKKKKKKKKKKKKKK',
  ], { bottom:22 })],
  ['Vaquero', sprite([
    '.....KKKKKKK.....',
    '....KNNNNNNNK....',
    '....KNNKNKNNK....',
    '....KNNNNNNNK....',
    'KK..KRRRRRRRK..KK',
    'KNK.KNNNNNNNK.KNK',
    '.KNKKNNNNNNNKKNK.',
    '..KNNNNNNNNNNNK..',
    '...KKKKKKKKKKK...',
  ], { bottom:24 })],
  ['Cumpleaños', sprite([
    '.....KYK.....',
    '....KYYYK....',
    '.....KVK.....',
    '....KVYVK....',
    '....KVVVK....',
    '...KYVVVYK...',
    '...KVVVVVK...',
    '..KVYVVVYVK..',
    '..KVVVVVVVK..',
    '.KYVVYVYVVYK.',
    '.KKKKKKKKKKK.',
  ], { bottom:24 })],
  ['Pizza', sprite([
    'KKKKKKKKKKKKKKKK',
    'KNNNNNNNNNNNNNNK',
    '.KYYRYYYYYYRYYK.',
    '..KYYYYYRYYYYK..',
    '...KYYRYYYYYK...',
    '....KYYYYRYK....',
    '.....KYYYYK.....',
    '......KYYK......',
    '.......KK.......',
  ], { bottom:24 })],
  ['Cuernitos', sprite([
    'KK...................KK',
    'KRK.................KRK',
    'KRRK...............KRRK',
    '.KRRK.............KRRK.',
    '..KRRK...........KRRK..',
    '...KK.............KK...',
  ], { bottom:26 })],
  ['Aureola', sprite([
    '..KKKKKKKKKKKKK..',
    '.KYYYYYYYYYYYYYK.',
    'KYYKKKKKKKKKKKYYK',
    '.KYYYYYYYYYYYYYK.',
    '..KKKKKKKKKKKKK..',
  ], { bottom:10 })],
  ['Auriculares', `<rect x="18" y="0" width="64" height="8" fill="${INK}"/><rect x="10" y="6" width="8" height="26" fill="${INK}"/><rect x="82" y="6" width="8" height="26" fill="${INK}"/><rect x="0" y="30" width="16" height="30" fill="${BLUE}" stroke="${INK}" stroke-width="4"/><rect x="84" y="30" width="16" height="30" fill="${BLUE}" stroke="${INK}" stroke-width="4"/><rect x="4" y="36" width="4" height="8" fill="#fff"/><rect x="88" y="36" width="4" height="8" fill="#fff"/>`],
  ['Pollito', sprite([
    '.....KKKKK......',
    '....KYYYYYK.....',
    '...KYYKYYYKKK...',
    '...KYYYYYYKOOK..',
    '...KYYYYYYKKK...',
    '..KYYYYYYYYK....',
    '..KYYYWWYYYK....',
    '...KKKKKKKK.....',
  ], { bottom:18 })],
];

// ---------- glasses (over the eyes) ----------
const GLASSES = [
  ['Ninguno', ''],
  ['Nerd', `<rect x="18" y="32" width="28" height="24" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="5"/><rect x="54" y="32" width="28" height="24" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="5"/><rect x="44" y="40" width="12" height="5" fill="${INK}"/><rect x="6" y="38" width="12" height="5" fill="${INK}"/><rect x="82" y="38" width="12" height="5" fill="${INK}"/>`],
  ['De sol', `<rect x="16" y="36" width="30" height="18" fill="${INK}"/><rect x="54" y="36" width="30" height="18" fill="${INK}"/><rect x="46" y="38" width="8" height="5" fill="${INK}"/><rect x="6" y="38" width="10" height="5" fill="${INK}"/><rect x="84" y="38" width="10" height="5" fill="${INK}"/><rect x="20" y="39" width="8" height="4" fill="#fff"/><rect x="58" y="39" width="8" height="4" fill="#fff"/>`],
  ['3D', `<rect x="12" y="32" width="76" height="24" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="18" y="37" width="26" height="14" fill="${CORAL}" fill-opacity=".85"/><rect x="56" y="37" width="26" height="14" fill="${BLUE}" fill-opacity=".85"/>`],
  ['Corazones', sprite(['.KKK.KKK.......KKK.KKK.','KPPPKPPPK.....KPPPKPPPK','KPPPPPPPKKKKKKKPPPPPPPK','KPPPPPPPK.....KPPPPPPPK','.KPPPPPK.......KPPPPPK.','..KPPPK.........KPPPK..','...KPK...........KPK...','....K.............K....'], { bottom:60 })],
  ['Estrellas', sprite(['....K...........K....','...KYK.........KYK...','KKKKYKKKK...KKKKYKKKK','KYYYYYYYKKKKKYYYYYYYK','.KYYYYYK.....KYYYYYK.','..KYKYK.......KYKYK..','..KK.KK.......KK.KK..'], { bottom:58 })],
  ['Antiparras', `<rect x="4" y="38" width="10" height="8" fill="${INK}"/><rect x="86" y="38" width="10" height="8" fill="${INK}"/><rect x="12" y="32" width="76" height="24" fill="${MINT}" fill-opacity=".85" stroke="${INK}" stroke-width="4"/><rect x="18" y="36" width="14" height="5" fill="#fff" opacity=".8"/>`],
  ['Monóculo', `<rect x="54" y="32" width="26" height="24" fill="#fff" fill-opacity=".2" stroke="${YEL}" stroke-width="4"/><rect x="54" y="32" width="26" height="24" fill="none" stroke="${INK}" stroke-width="1.5"/><rect x="78" y="56" width="3" height="6" fill="${YEL}"/><rect x="80" y="62" width="3" height="6" fill="${YEL}"/><rect x="82" y="68" width="3" height="8" fill="${YEL}"/>`],
  ['Parche', `<rect x="6" y="28" width="88" height="5" fill="${INK}"/><rect x="56" y="32" width="24" height="22" fill="${INK}"/>`],
  ['Lupa', `<rect x="52" y="28" width="32" height="32" fill="#fff" fill-opacity=".3" stroke="${INK}" stroke-width="5"/><rect x="80" y="58" width="6" height="6" fill="${INK}"/><rect x="84" y="62" width="6" height="6" fill="#8D5524"/><rect x="88" y="66" width="6" height="10" fill="#8D5524"/>`],
];

// ---------- facial hair (drawn before the mouth so the mouth stays visible) ----------
const BEARD_COLOR = '#2B2840';
const BEARDS = [
  ['Ninguna', ''],
  ['Bigote', sprite(['..KKKK....KKKK..','.KKKKKKKKKKKKKK.','KKKK........KKKK','KK............KK'], { bottom:66 })],
  ['Bigote fino', `<rect x="36" y="58" width="28" height="3" fill="${INK}"/><rect x="32" y="56" width="4" height="3" fill="${INK}"/><rect x="64" y="56" width="4" height="3" fill="${INK}"/>`],
  ['Bigotón', sprite(['....KKKKKKKKKK....','..KKKKKKKKKKKKKK..','KKKKKK......KKKKKK','KK..............KK','K................K'], { bottom:66 })],
  ['Chivita', sprite(['.KKKKK.','KKKKKKK','.KKKKK.','..KKK..','...K...'], { bottom:94 })],
  ['Candado', sprite(['.KKKKKKKKKKKKK.','KK...........KK','KK...........KK','KK...........KK','KK...........KK','KKK.........KKK','.KKK.......KKK.','..KKKKKKKKKKK..','....KKKKKKK....'], { bottom:92 })],
  ['Barba', sprite(['KK....................KK','KK....................KK','KKK..................KKK','KKKK................KKKK','KKKKK..............KKKKK','KKKKKK............KKKKKK','KKKKKKK..........KKKKKKK','.KKKKKKKKKKKKKKKKKKKKKK.','..KKKKKKKKKKKKKKKKKKKK..','....KKKKKKKKKKKKKKKK....','......KKKKKKKKKKKK......'], { bottom:100 })],
  ['Barba roja', sprite(['OO....................OO','OO....................OO','OOO..................OOO','OOOO................OOOO','OOOOO..............OOOOO','OOOOOO............OOOOOO','OOOOOOO..........OOOOOOO','.OOOOOOOOOOOOOOOOOOOOOO.','..OOOOOOOOOOOOOOOOOOOO..','....OOOOOOOOOOOOOOOO....','......OOOOOOOOOOOO......'].map(r=>r.replace(/O(?=\.|$)/g,'O')), { bottom:100 })],
  ['Patillas', sprite(['KK....................KK','KK....................KK','KKK..................KKK','KKK..................KKK','.KK..................KK.'], { bottom:72 })],
  ['Papá Noel', sprite(['KK....................KK','KWK..................KWK','KWWK................KWWK','KWWWK..............KWWWK','KWWWWK............KWWWWK','KWWWWWKKKKKKKKKKKKWWWWWK','KWWWWWWWWWWWWWWWWWWWWWWK','.KWWWWWWWWWWWWWWWWWWWWK.','..KWWWWWWWWWWWWWWWWWWK..','...KKWWWWWWWWWWWWWWKK...','.....KKKKKKKKKKKKKK.....'], { bottom:102 })],
];

export const AVATAR_TRAITS = [
  { key:'skin',    label:'Color',     count:FACE_COLORS.length, names:FACE_COLOR_NAMES },
  { key:'eyes',    label:'Ojos',      count:EYES.length,    names:EYES.map(x=>x[0]) },
  { key:'mouth',   label:'Boca',      count:MOUTHS.length,  names:MOUTHS.map(x=>x[0]) },
  { key:'hat',     label:'Sombrero',  count:HATS.length,    names:HATS.map(x=>x[0]) },
  { key:'glasses', label:'Anteojos',  count:GLASSES.length, names:GLASSES.map(x=>x[0]) },
  { key:'beard',   label:'Barba',     count:BEARDS.length,  names:BEARDS.map(x=>x[0]) },
];

// Previous version had one "hat" slot with 10 mixed accessories:
// 0 none, 1 cap, 2 crown, 3 glasses, 4 eye patch, 5 mustache, 6 horns,
// 7 pizza, 8 headphones, 9 halo. Map each to its new home.
const HAT_IDX = Object.fromEntries(HATS.map((h,i)=>[h[0],i]));
const GLS_IDX = Object.fromEntries(GLASSES.map((g,i)=>[g[0],i]));
const BRD_IDX = Object.fromEntries(BEARDS.map((b,i)=>[b[0],i]));
const LEGACY_HAT = {
  1:{hat:HAT_IDX['Gorra']}, 2:{hat:HAT_IDX['Corona']}, 3:{glasses:GLS_IDX['De sol']}, 4:{glasses:GLS_IDX['Parche']},
  5:{beard:BRD_IDX['Bigote']}, 6:{hat:HAT_IDX['Cuernitos']}, 7:{hat:HAT_IDX['Pizza']}, 8:{hat:HAT_IDX['Auriculares']}, 9:{hat:HAT_IDX['Aureola']},
};
const clampIdx = (n, max) => (Number.isInteger(n) && n>=0 && n<max) ? n : 0;
export function normalizeAvatar(av){
  av = av || {};
  let out = { v:2, skin:av.skin||0, eyes:av.eyes||0, mouth:av.mouth||0, hat:av.hat||0, glasses:av.glasses||0, beard:av.beard||0 };
  if(av.v !== 2){ out = { ...out, hat:0, glasses:0, beard:0, ...(LEGACY_HAT[av.hat]||{}) }; }
  AVATAR_TRAITS.forEach(t=>{ out[t.key] = clampIdx(out[t.key], t.count); });
  return out;
}

const rnd = n => Math.floor(Math.random()*n);
export function randomAvatar(){
  return {
    v:2, skin:rnd(FACE_COLORS.length), eyes:rnd(EYES.length), mouth:rnd(MOUTHS.length),
    hat: Math.random()<0.55 ? 1+rnd(HATS.length-1) : 0,
    glasses: Math.random()<0.3 ? 1+rnd(GLASSES.length-1) : 0,
    beard: Math.random()<0.25 ? 1+rnd(BEARDS.length-1) : 0,
  };
}

export function avatarColor(av){ return FACE_COLORS[normalizeAvatar(av).skin]; }

export function avatarSVG(av, px){
  const a = normalizeAvatar(av);
  const skin = FACE_COLORS[a.skin];
  const dark = a.skin===4 || a.skin===3;
  // on very dark faces the black beard would disappear: give it a soft outline
  const beard = BEARDS[a.beard][1] ? (dark ? `<g style="filter:drop-shadow(0 0 1px #fff)">${BEARDS[a.beard][1]}</g>` : BEARDS[a.beard][1]) : '';
  return `<svg viewBox="0 0 100 100" width="${px}" height="${px}" style="display:block;overflow:visible;flex:0 0 auto" shape-rendering="crispEdges">
    <path d="${HEAD}" fill="${skin}" stroke="${INK}" stroke-width="4"/>
    <rect x="16" y="58" width="8" height="6" fill="${PINK}" opacity=".55"/><rect x="76" y="58" width="8" height="6" fill="${PINK}" opacity=".55"/>
    ${EYES[a.eyes][1]}
    ${beard}
    ${MOUTHS[a.mouth][1]}
    ${GLASSES[a.glasses][1]}
    ${HATS[a.hat][1]}
  </svg>`;
}
