# ★ Lluvia Estelar

Entrega #4 (Final) – Aplicaciones Móviles, UPB 2026-2.

Juego móvil **híbrido** (HTML5 + JavaScript + Capacitor) en el que el jugador controla una nave, **esquiva meteoritos** y **recoge estrellas** a lo largo de **3 niveles**, con **control de tiempo** y **vidas**.

## Cómo se juega

- Arrastra el dedo (o usa ← → en el computador) para mover la nave.
- Recoge las estrellas que pide cada nivel antes de que se acabe el tiempo.
- Cada meteorito que te golpea quita una vida (tienes 3). Los corazones devuelven una vida.

| Nivel | Meta | Tiempo | Dificultad |
|------|------|--------|------------|
| 1 | 10 ★ | 40 s | Meteoritos lentos |
| 2 | 15 ★ | 45 s | Más rápidos y más frecuentes |
| 3 | 20 ★ | 50 s | Meteoritos rojos que zigzaguean |

**Puntaje:** +10 por estrella, +5 por corazón y +5 por cada segundo que sobre al pasar un nivel.

## Cumplimiento de requisitos

| Requisito | Cómo se cumple |
|-----------|----------------|
| Mínimo 3 niveles / tiempo / vidas | 3 niveles, temporizador por nivel y 3 vidas (`www/js/game.js`, constante `LEVELS`) |
| 5 secciones | **Splash**, **Home**, **Juego**, **Puntaje**, **Créditos** (+ extra "Cómo jugar") en `www/index.html` |
| UI personalizada | Tema espacial propio, colores, botones y tarjetas en `www/css/styles.css` |
| Persistencia entre vistas | `localStorage` (`www/js/storage.js`): nombre del piloto, mejor puntaje, nivel máximo, Top 5, sonido on/off, easter egg |
| Animaciones | CSS (splash, fondo de estrellas, botones, ventanas) + Canvas (partículas, sacudida de pantalla, parpadeo, rotación, pulsos) |
| Sonidos | Web Audio API (`www/js/audio.js`): efectos y música de fondo generados por código, sin archivos |
| Bonus: Easter egg 🪺 | Toca **5 veces** el logo ★ de la pantalla de inicio → se desbloquea la **nave arcoíris** |

## Estructura del proyecto

```
www/                 Código del juego (lo que Capacitor empaqueta)
  index.html         Las pantallas (secciones) de la app
  css/styles.css     Estilos y animaciones CSS
  js/storage.js      Persistencia (localStorage)
  js/audio.js        Sonidos con Web Audio API
  js/game.js         Motor del juego (Canvas): niveles, colisiones, dibujo
  js/app.js          Navegación entre pantallas y conexión con el juego
android/             Proyecto nativo de Android generado por Capacitor
capacitor.config.json
```

## Cómo ejecutar

**En el navegador (para desarrollo):**

```bash
npm run serve
```

Abrir http://localhost:8080 (usar la vista de celular en las herramientas de desarrollador).

**En Android:**

```bash
npm install
npx cap sync android
npx cap open android
```

En Android Studio: ▶ Run para probar en el emulador o el celular.

## Publicación en Google Play

1. Cambiar los datos del equipo en la sección de créditos (`www/index.html`) y ejecutar `npx cap sync android`.
2. En Android Studio: **Build → Generate Signed App Bundle / APK → Android App Bundle**.
3. Crear un *keystore* (guardarlo bien, se necesita para cada actualización) y generar el `.aab` de *release*.
4. Subir el `.aab` en Google Play Console con capturas, ícono (512×512) y descripción.

ID de la app: `co.edu.upb.lluviaestelar`.

## Uso de IA (justificación)

Se usó un asistente de IA (Claude) como apoyo para generar la estructura inicial del código. El equipo revisó y entiende cada parte:

- **Ciclo del juego** (`Game.loop`): usa `requestAnimationFrame`; en cada cuadro calcula `dt` (segundos transcurridos) para que la velocidad sea igual en celulares rápidos y lentos, luego llama a `update(dt)` y `draw()`.
- **Colisiones**: cada objeto es un círculo; hay choque si la distancia entre centros es menor que la suma de los radios (`dx² + dy² < (r1 + r2)²`).
- **Niveles**: la constante `LEVELS` define meta, tiempo, frecuencia y velocidad de los meteoritos; cambiar de nivel solo cambia esos valores.
- **Persistencia**: `Storage` guarda un objeto JSON en `localStorage`, que dentro de Capacitor queda guardado en el celular.
- **Sonidos**: un oscilador de Web Audio genera cada efecto, cambiando frecuencia y volumen en el tiempo.
- **Pantallas**: todas están en un solo HTML; `show(nombre)` oculta las demás y muestra la elegida.

## Wireframes

Los wireframes en escala de grises (papel y Figma) están en la carpeta `docs/wireframes/`.
