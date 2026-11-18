# Ronda

> Party games para jugar con amigos.

Un portal de minijuegos multijugador para jugar en grupo, cada uno desde su propio celular. Desde la home elegís a qué jugar, armás tu sala (nombre + avatar) y compartís el código de 5 letras — el resto se une con ese código, y desde ahí el anfitrión puede cambiar de juego cuando quiera sin que nadie tenga que volver a escribir nada.

**Cinco juegos:**

- **Unánimo** — todos reciben la misma palabra, escriben lo que creen que el resto también va a poner, y suman puntos por cada coincidencia. No gana lo más original: gana pensar igual que el resto.
- **Dibujalo** — en cada ronda alguien dibuja (elige entre 3 palabras, en privado) y el resto adivina en tiempo real mientras el trazo aparece en su pantalla. Puntos por velocidad; el dibujante también suma según cuántos entendieron su dibujo.
- **Tutti Frutti** — misma letra para todos, una palabra por categoría. Cualquiera puede gritar STOP y termina la ronda para todos. 10 puntos si tu respuesta es válida y única, 5 si alguien más puso lo mismo, 0 si está vacía o inválida (se puede impugnar).
- **Impostor** — todos reciben la misma palabra secreta, menos el infiltrado (una palabra relacionada distinta, o ninguna en modo "puro"). Por turnos cada uno da una pista, después se discute y se vota en secreto a quién creen que es. Si lo atrapan, tiene una última chance: adivinar la palabra del grupo para sobrevivir igual.
- **Make It Meme** — todos reciben la misma plantilla (foto o meme animado) y le escriben un texto arriba y/o abajo en 60 segundos. Después se muestran todos los memes, anónimos, y cada uno vota al más gracioso (un solo voto, no vale votarse a sí mismo). Por votos: 1º puesto 5 pts, 2º 3 pts, 3º 1 pt. Se puede usar una PC/TV como pantalla principal mientras todos juegan desde el celular.

**Modo Ronda** — en vez de jugar varias rondas del mismo juego, encadena una secuencia de juegos distintos en una sola partida (por ejemplo: Impostor → Unánimo → Dibujalo → Tutti Frutti). Los puntos de cada juego se suman a un puntaje acumulado que persiste entre juegos, y al final se corona un solo ganador de toda la partida. El host elige qué juegos incluir, el orden (a mano o al azar) y si se pueden repetir. No es un quinto juego: es una capa de coordinación que simplemente arranca cada juego existente como si el host lo hubiera elegido a mano desde el lobby — ningún juego individual sabe ni le importa si está corriendo dentro de una partida de Modo Ronda.

Cada jugador arma su propio personaje al entrar a la sala (una sola vez, no por juego): elige nombre y, con flechitas, el color de piel, ojos, boca y un accesorio opcional — todo dibujado en pixel art vía SVG, sin imágenes externas. Hay efectos de sonido (clics, alguien se une — silenciables con el ícono de parlante) y un chat flotante para hablar con el resto durante toda la sesión.

## Cómo jugar Unánimo

1. Todos reciben la misma palabra (ej: **PLAYA**).
2. Cada uno escribe varias palabras que cree que el resto también va a escribir.
3. Al revelar, sumás puntos por cada palabra que coincide con la de otros jugadores: si vos y 3 más pusieron "Mar", sumás +3.
4. Después de todas las rondas gana quien más puntos acumuló.

## Stack

- **Frontend**: HTML/CSS/JS sin build step (vanilla, ES modules). Pensado para servirse como sitio estático (GitHub Pages).
- **Tiempo real**: [Supabase Realtime](https://supabase.com/docs/guides/realtime) (Broadcast), usado únicamente como canal de mensajería entre los dispositivos de una misma sala — no hay tablas ni base de datos, no se persiste ninguna partida.
- Un jugador (quien crea la sala) actúa como **host**: es la fuente de verdad del estado de la partida (ronda, palabra, cronómetro, respuestas) y lo retransmite al resto por el canal `room-<CÓDIGO>`. Los demás jugadores envían sus acciones (unirse, entregar palabras) y reciben el estado actualizado.

## Correr en local

No hace falta build ni instalar dependencias. Sirve cualquier servidor estático desde esta carpeta, por ejemplo:

```bash
python -m http.server 4173
```

y abrí `http://localhost:4173`.

## Desplegar en GitHub Pages

1. Pusheá este repo a GitHub.
2. En **Settings → Pages**, elegí la rama `main` y carpeta `/ (root)`.
3. Listo — es un sitio 100% estático, no requiere ningún paso de build.

La palabra secreta de Dibujalo nunca se guarda en el estado compartido: el host la retiene solo en memoria y se la manda al dibujante mediante un mensaje dirigido (`to: <id>`) en el mismo canal — cualquier otro cliente lo recibe pero lo descarta sin abrirlo. Los trazos del lápiz viajan como eventos livianos aparte (no como parte del estado de la partida), para que dibujar se sienta instantáneo sin sobrecargar la sincronización.

En Make It Meme, los textos viven solo en memoria del host mientras se escriben (el estado compartido solo dice quién ya envió). En la votación los memes se difunden mezclados y con ids al azar, sin autor; cada autor recibe por mensaje dirigido cuál es el suyo para no poder votarlo. El host valida cada voto (uno por jugador, nunca el propio, solo durante la votación) y recién en los resultados se revela quién hizo cada meme y quién votó a quién.

En Impostor, quién es el infiltrado y ambas palabras siguen el mismo patrón: viven solo en memoria del host hasta la revelación, y cada jugador recibe únicamente su propio rol/palabra por mensaje dirigido. Los votos también se acumulan en el host sin difundirse — mientras dura la votación, el resto solo ve un contador de "cuántos ya votaron", nunca a quién.

## Limitaciones conocidas

- Si el anfitrión cierra la pestaña, la partida queda sin quien la conduzca (no hay traspaso de host).
- Si un jugador recarga la página, pierde su lugar en la sala (no hay reconexión automática todavía).
- El canal de Supabase Realtime es público (clave `anon`): cualquiera que sepa el código de sala de 5 caracteres podría, en teoría, enviar o inspeccionar mensajes de ese canal (incluida la palabra secreta de Dibujalo, si abre las herramientas de desarrollador). Para un juego casual de fiesta el riesgo es mínimo, pero no está pensado para datos sensibles.
- Los relojes de cada dispositivo deben estar razonablemente sincronizados para que los cronómetros se vean igual en todos los celulares.
- En Dibujalo, un jugador que se une a mitad de una ronda no ve los trazos ya dibujados antes de unirse (no hay "replay" del dibujo, solo lo que se dibuja de ahí en adelante).

## Estructura

```
index.html        Punto de entrada
style.css         Sistema visual (colores, tipografía, componentes)
app.js            Portal + Unánimo, Dibujalo, Tutti Frutti, Impostor y Modo Ronda (rooms, lobby, red, avatares, chat, sonido)
makeitmeme.js     Make It Meme: lógica pura (puntaje, estadísticas) + flujo y pantallas, enchufado a Game
memebank.js       Biblioteca de plantillas de Make It Meme (packs → categorías → plantillas)
memes/            Imágenes (.webp) y memes animados (.mp4 + póster .webp) por categoría
words.js          Banco de palabras de Unánimo
wordbank.js        Banco de palabras/categorías de Dibujalo, Tutti Frutti e Impostor
supabaseClient.js Cliente de Supabase (Realtime Broadcast)
```

### Agregar plantillas a Make It Meme

1. Copiá la imagen a `memes/<categoria>/<categoria>-NNN.webp` (ideal: máx. 720 px de lado).
2. Agregá una línea `t('<categoria>-NNN', ancho, alto)` en `memebank.js`. Para un meme animado: `.mp4` sin audio + póster `.webp` con el mismo nombre, y `v(...)` en vez de `t(...)`.
3. Para una categoría nueva, sumala a `MEME_CATEGORIES`; para un pack temático, agregá otra entrada a `MEME_PACKS`.

Usá solo imágenes que tengas derecho a usar.
