// Banco de palabras/consignas para Unánimo.
// Cada partida elige al azar, sin repetir, tantas como rondas configuradas.
export const WORDS = [
  'PLAYA','VERANO','CUMPLEAÑOS','CINE','LUNES','INVIERNO','NAVIDAD','ESCUELA',
  'FÚTBOL','PIZZA','ASADO','VACACIONES','LLUVIA','CASAMIENTO','OFICINA','GIMNASIO',
  'PERRO','GATO','MÚSICA','BAILE','FIESTA','AMOR','AMIGOS','FAMILIA',
  'DINERO','TRABAJO','VIAJE','MONTAÑA','CIUDAD','CAMPO','NOCHE','MAÑANA',
  'CAFÉ','DESAYUNO','ASADO DOMINGUERO','CUMPLE INFANTIL','HALLOWEEN','AÑO NUEVO','PRIMER DÍA DE CLASES','EXAMEN',
  'HOSPITAL','POLICÍA','BOMBERO','PROFESOR','JEFE','VECINO','SUEGRA','EX',
  'CELULAR','INTERNET','REDES SOCIALES','SERIE','PELÍCULA DE TERROR','SUPERHÉROE','ROBOT','ALIEN',
  'DESIERTO','SELVA','ISLA','VOLCÁN','TORMENTA','TERREMOTO','ECLIPSE','ARCOÍRIS',
  'PIRATA','DINOSAURIO','MAGO','FANTASMA','VAMPIRO','ZOMBI','SIRENA','DRAGÓN',
  'BODA','JUBILACIÓN','MUDANZA','ACCIDENTE','SORPRESA','MENTIRA','SECRETO','VENGANZA',
  'DIETA','INSOMNIO','RESACA','ALERGIA','VACUNA','DENTISTA','GYM','MARATÓN',
  'PROPINA','IMPUESTOS','JEFE MALO','REUNIÓN ABURRIDA','TRÁFICO','COLECTIVO','SUBTE','AEROPUERTO'
];

export function pickWords(count, avoid = []) {
  const avoidSet = new Set(avoid);
  const pool = WORDS.filter(w => !avoidSet.has(w));
  const source = pool.length >= count ? pool : WORDS.slice();
  const shuffled = source.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
