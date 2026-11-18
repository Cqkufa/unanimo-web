// Card deck for "Zarpado" (Ronda's take on the fill-in-the-blank party game).
// Original content written for Ronda. Adult humor (+18).
//
// GOLDEN RULE: the full sentence has to read naturally. White cards come in
// varied grammatical structures (nouns, infinitives, "Que…", "Ser/Estar…",
// "Mi…", "Sin/Con…", full sentences), and black cards are written so their
// blanks accept as many of those structures as possible: after a colon, as
// a quote, as the answer to a question, or where Spanish takes either a
// noun or an infinitive ("la culpa la tiene ___", "lo único que quiero es ___").
//
//  - FRASES: black cards. "___" marks each blank; two blanks = play two cards.
//  - RESPUESTAS: white cards, grouped by structure (only for readability —
//    the game mixes them all).
//  - Adding cards is just adding lines.

export const FRASES = [
  // --- open slots (after a colon or inside quotes): any structure fits ---
  'Lo que encontró mi vieja en mi cajón: ___.',
  'Mi plan para salir de la crisis: ___.',
  'Lo último que escuchás antes de que se pudra el asado: ___.',
  'El secreto de un matrimonio de 40 años: ___.',
  'La verdadera razón por la que me echaron del laburo: ___.',
  'Lo que me dijo el psicólogo en la primera sesión: “___”.',
  'Plan de la noche: previa, boliche y ___.',
  'Mi deseo para el año nuevo: ___.',
  'Lo único que aprendí en el secundario: ___.',
  'El mensaje que le mandé a mi ex a las 4 de la mañana: “___”.',
  'Lo que dijo mi abuela después de la tercera sidra: “___”.',
  'Mi biografía de Tinder: “___”.',
  'Lo que grita el vecino de arriba todas las noches: “___”.',
  'El último audio del grupo de la familia: “___”.',
  'Lo que dijo el cura en la misa de Navidad: “___”.',
  'Cómo terminó la reunión de consorcio: ___.',
  'El ingrediente secreto del guiso de la abuela: ___.',
  'Titular de Crónica: “Detienen a un vecino de Quilmes por ___”.',
  'Lo que pasa en el viaje de egresados a Bariloche: ___.',
  'El regalo del amigo invisible de la oficina: ___.',
  'La señal de que la juntada ya terminó: ___.',
  'Lo que me dijo el horóscopo para este año: “___”.',
  'Así nos conocimos con mi pareja: ___.',
  'Ahora en Netflix, la serie basada en hechos reales: “___”.',
  'Lo que más se escucha en un velorio argentino: “___”.',
  'Las últimas palabras del abuelo: “___”.',
  'Lo que dice el cartel de la puerta del telo: “___”.',
  'Nueva campaña del Ministerio de Salud: “No al pucho, sí a ___”.',

  // --- questions: the white card is the answer ---
  '¿Qué tiene escondido el kiosquero detrás de los alfajores?',
  '¿Por qué no me invitan más a los cumpleaños?',
  '¿Qué hay realmente en el mate del portero?',
  '¿Qué es lo que más miedo le da a un argentino?',
  '¿Qué me llevaría a una isla desierta?',
  '¿Por qué lloraba el chabón en el colectivo?',
  '¿Qué hay en el fondo de la cartera de tu vieja?',
  '¿Qué hizo el tío en el casamiento que nadie le perdona?',
  '¿Cómo voy a pagar la tarjeta este mes?',
  '¿Qué me recetó el médico de la obra social?',
  '¿Qué le pedí a Papá Noel este año?',
  '¿Qué dijo tu vieja cuando le contaste que estabas de novio?',
  '¿Cuál es el secreto mejor guardado del country?',

  // --- noun OR infinitive OR "que…" slots ---
  'Lo único que quiero en la vida es ___.',
  'La culpa de todo la tiene ___.',
  'Nada me calienta más que ___.',
  'Para mí, la felicidad es ___.',
  'No hay nada más argentino que ___.',
  'Mi psicóloga dice que todos mis problemas vienen de ___.',
  'Lo peor de tener 30 es ___.',
  'En el gimnasio hay un chabón que vive para ___.',
  'Con la plata del aguinaldo me alcanzó para ___.',
  'El primer paso para sanar es aceptar ___.',
  'Lo que más extraño de la cuarentena es ___.',
  'Si sos argentino, seguro sufriste por ___.',
  'Lo más difícil de explicarle a mi vieja es ___.',
  'Me separé. El motivo: ___.',
  'Tengo 40 años y sigo sin superar ___.',

  // --- two blanks: two cards, in order ---
  'Para mis 15 quería ___, pero me tocó ___.',
  'Tinder me matcheó con ___ y la cita terminó en ___.',
  'La fórmula del éxito: ___ más ___.',
  'Entre ___ y ___, prefiero morirme.',
  'Mis viejos se separaron por dos cosas: ___ y ___.',
  'Primero fue ___, después ___. Así es el amor.',
];

const SUSTANTIVOS = [
  'Un rugbier de Nordelta', 'Una denuncia por acoso', 'El novio de tu vieja', 'Un consolador con Bluetooth', 'Un chori con chimichurri vencido',
  'El primo que no labura', 'La suegra en malla', 'Un fernet tibio', 'Tres cuotas sin interés', 'Un mate lavado',
  'El vecino en bolas regando las plantas', 'Un tupper que nunca devolviste', 'La tarjeta al límite', 'Un forro pinchado', 'Las patitas de tu abuela',
  'Un piquete de jubilados furiosos', 'El dulce de leche directo del pote', 'Una birra que alguien ya abrió', 'El olor a pata del vestuario', 'La resaca del domingo',
  'Un perro salchicha con depresión', 'Un sobre de figuritas del Mundial', 'La señora de la limpieza que sabe todo', 'Un pibe con chomba de rugby', 'La cuenta del gas',
  'Un chabón con riñonera', 'El faso del portero', 'Las uñas del pie del abuelo', 'Un mate con gusto a cigarrillo', 'Una bombacha en el lavarropas del vecino',
  'La tía que pregunta “¿y la novia?”', 'Un cumpleaños infantil con payaso en pedo', 'El remisero que te habla de política', 'Un Rivotril con Coca', 'El pelo en la sopa de la abuela',
  'Un consorcio en guerra', 'El inodoro tapado del depto', 'Una vecina que graba todo', 'El tipo que aplaude cuando aterriza el avión', 'Una cerveza caliente en la playa',
  'El primo que vende Herbalife', 'Un tatuaje con el nombre de tu ex', 'Las medias de toalla', 'Un vino en caja', 'La suegra con WhatsApp',
  'Una milanesa del tamaño de una puerta', 'La AFIP', 'Una chancleta voladora', 'Una despedida de soltero en Mar del Plata', 'El tipo que cuenta chistes en los velorios',
  'La fila del banco un lunes', 'Un ex que te pide plata prestada', 'Una paloma con hambre', 'El olor a choripán en la ropa', 'Una tía que baila reggaetón',
  'Un pibe que se cree DJ', 'Un pirata del asfalto', 'La heladera vacía a fin de mes', 'Un DNI vencido', 'El chofer del 60',
  'La garrafa', 'El cuñado que todo lo sabe', 'Un mate con azúcar', 'El ventilador de techo a velocidad 5', 'Una cumbia triste',
  'Una abuela tatuada', 'El portero en tanga', 'Un abrazo demasiado largo', 'Un mosquito del tamaño de un perro', 'Una galletita Express mojada',
  'Una buseca recalentada', 'La bolsa de bolsas', 'El tupper de la tía con tres kilos de ensalada rusa', 'Los audios de tu viejo', 'Un chabón con mullet',
  'El peor polvo de mi vida', 'Un Rolex trucho de Once', 'El vuelto en caramelos', 'Un pelado con flequillo', 'Un consolador con forma de Obelisco',
  'Las lolas de silicona de la vecina', 'Un preservativo sabor dulce de leche', 'El vibrador de la tía', 'Un strip de jubilados', 'Un chupón en el cuello el día de la boda',
  'Un nudista en el Delta', 'Un loro que dice puteadas', 'El último fernet del mundo', 'Una despedida de soltera con un stripper de 70 años', 'Un psicólogo que cobra en dólares',
  'La cuarta empanada', 'Una pileta llena de birra', 'Un ganso enojado', 'El cartonero filósofo', 'El novio de tu hermana que es DJ y coach',
  'Un pack de nudes del 2014', 'Una orgía en un country', 'Una pija de cotillón', 'El grupo de WhatsApp de padres del colegio', 'Un influencer de criptomonedas',
];

const INFINITIVOS = [
  'Robarles a los jubilados', 'Stalkear a mi ex', 'Hacer pis en la pileta', 'Mentir en terapia', 'Llorar en el colectivo',
  'Mear en la puerta del boliche', 'Pedir fiado', 'Clavarle el visto a tu vieja', 'Tirarse un pedo en el ascensor', 'Copiarse en el parcial',
  'Volver con tu ex por tercera vez', 'Pedirle plata a la abuela', 'Mandar un audio de ocho minutos', 'Fingir un orgasmo', 'Chamuyar a la moza',
  'Garchar en el auto del viejo', 'Fumarse un porro con la abuela', 'Gastarse el aguinaldo en un día', 'Pedir un Uber para hacer tres cuadras', 'Mandar nudes al grupo de la familia',
  'Bailar cuarteto sin remera', 'Robarse el WiFi del vecino', 'Comprar Viagra para el abuelo', 'Ir a misa en pedo', 'Darle like a una foto de hace cuatro años',
  'Hacer cucharita con el perro', 'Chupar un hielo del vaso de otro', 'Dormir la siesta hasta las ocho de la noche', 'Hacerse el muerto en el grupo', 'Encontrarte a tu viejo en el telo',
  'Llevar a tu vieja al boliche', 'Hacer pogo en un casamiento', 'Evadir impuestos', 'Pagar con monedas de un peso', 'Pelearse con un nene de ocho años en el Fortnite',
  'Garronear en un cumpleaños ajeno', 'Vender fotos de mis patas', 'Ir al boliche en ojotas', 'Meterle los cuernos al profe de yoga', 'Cagar en la casa de tu suegra',
];

const QUE = [
  'Que te encuentre tu vieja', 'Que vuelva tu ex', 'Que te cancelen en Twitter', 'Que se corte la luz en pleno acto', 'Que te deje el colectivo',
  'Que se corte el agua con champú en la cabeza', 'Que te reconozcan en el telo', 'Que tu viejo descubra Instagram', 'Que te pidan el CBU en la primera cita', 'Que te dé la mano el cura',
  'Que suene tu celular en el velorio', 'Que tu jefe te vea en la marcha', 'Que el perro se coma el anillo de compromiso', 'Que te llame la AFIP un viernes', 'Que te toque el asiento del medio',
  'Que te haga upa un desconocido', 'Que tu suegra se quede a dormir', 'Que te vean salir del sex shop',
];

const SER_ESTAR = [
  'Ser un hijo de puta', 'Estar en pedo un martes', 'Ser infiel por deporte', 'Estar re loco a las 10 de la mañana', 'Ser el tercero en la cita',
  'Estar enamorado de la cajera del chino', 'Ser el primo raro de la familia', 'Estar en la lona', 'Ser fan de Arjona', 'Estar más quemado que un chori',
  'Ser el que trae hielo y nada más', 'Estar a dieta en un asado', 'Ser monotributista', 'Estar casado con una influencer', 'Ser virgen a los 35',
  'Estar más al pedo que cenicero de moto',
];

const MI = [
  'Mi última neurona', 'Mi historial de búsqueda', 'Mi tío divorciado', 'Mi deuda con Mercado Pago', 'Mi suegra en bikini',
  'Mi ex con su nuevo novio', 'Mi carpeta de “Trabajos de la facu”', 'Mi abuela en Tinder', 'Mi colección de forros vencidos', 'Mi autoestima',
  'Mi psicóloga', 'Mi perro con sobrepeso', 'Mi cuenta de OnlyFans', 'Mi primer sueldo', 'Mi viejo en sunga',
];

const SIN_CON = [
  'Sin dignidad', 'Sin obra social', 'Con tres denuncias penales', 'Con ganas de arruinar una familia', 'Sin calzones',
  'Con olor a sobaco', 'Sin ningún tipo de vergüenza', 'Con la bragueta abierta', 'Sin un mango', 'Con la suegra a upa',
  'Con resaca de tres días', 'Sin bañarse desde el martes',
];

const FRASES_COMPLETAS = [
  'Me quiero pegar un corchazo', 'Qué país generoso', 'No le llega agua al tanque', 'Proceda, señor juez', 'Andá a laburar, vago',
  'Esto no es lo que parece', 'Ni en pedo', 'Te lo juro por mi vieja', 'Era tu primo, ¿no?', 'Se me escapó, perdón',
  'Ya fue, que se pudra todo', 'La próxima invito yo', 'Nos vemos en el infierno', 'Hay que sentar cabeza', 'Mejor no pregunten',
  'Fue sin querer queriendo', 'Esto lo pago en cuotas',
];

export const RESPUESTAS = [...SUSTANTIVOS, ...INFINITIVOS, ...QUE, ...SER_ESTAR, ...MI, ...SIN_CON, ...FRASES_COMPLETAS];

// Fraction of white cards dealt as "write your own" blanks.
export const BLANK_CHANCE = 0.04;

export const blanksIn = text => Math.max(1, (text.match(/___/g) || []).length);
