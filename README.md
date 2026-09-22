# Unánimo

> Pensá como los demás.

Juego de fiesta multijugador para jugar en grupo, cada uno desde su propio celular. Todos reciben la misma palabra, escriben lo que creen que van a poner los demás, y suman puntos por cada coincidencia. No gana lo más original: gana pensar igual que el resto.

Jugá una partida en vivo: creá una sala, compartí el código de 5 letras, y arranquen cuando estén todos.

Cada jugador arma su propio personaje al entrar: elige nombre y, con flechitas, el color de piel, ojos, nariz, boca y un sombrero opcional (dibujado en SVG, sin imágenes externas). Hay efectos de sonido (clics, alguien se une — silenciables con el ícono de parlante) y un chat flotante para hablar con el resto durante la partida.

## Cómo jugar

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

## Limitaciones conocidas

- Si el anfitrión cierra la pestaña, la partida queda sin quien la conduzca (no hay traspaso de host).
- Si un jugador recarga la página, pierde su lugar en la sala (no hay reconexión automática todavía).
- El canal de Supabase Realtime es público (clave `anon`): cualquiera que sepa el código de sala de 5 caracteres podría, en teoría, enviar mensajes a ese canal. Para un juego casual de fiesta el riesgo es mínimo, pero no está pensado para datos sensibles.
- Los relojes de cada dispositivo deben estar razonablemente sincronizados para que el cronómetro de ronda se vea igual en todos los celulares.

## Estructura

```
index.html        Punto de entrada
style.css         Sistema visual (colores, tipografía, componentes)
app.js            Lógica del juego, renderizado y sincronización en tiempo real
words.js          Banco de palabras/consignas
supabaseClient.js Cliente de Supabase (Realtime Broadcast)
```
