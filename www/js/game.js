/**
 * Motor del juego "Lluvia Estelar" usando Canvas 2D.
 *
 * Reglas:
 *  - La nave se mueve en horizontal (dedo, mouse o flechas).
 *  - Hay que recoger N estrellas antes de que se acabe el tiempo del nivel.
 *  - Cada meteorito que golpea quita una vida (3 vidas en total).
 *  - Los corazones devuelven una vida (máximo 3).
 *  - 3 niveles: cada uno más rápido; el nivel 3 tiene meteoritos en zigzag.
 */

// Configuración de cada nivel. Las velocidades están en "alturas de pantalla por segundo".
const LEVELS = [
  { goal: 10, time: 40, meteorEvery: 0.90, starEvery: 1.1, speed: [0.18, 0.30], zigzag: false, color: '#1b1f5c' },
  { goal: 15, time: 45, meteorEvery: 0.60, starEvery: 1.0, speed: [0.26, 0.40], zigzag: false, color: '#3a1450' },
  { goal: 20, time: 50, meteorEvery: 0.45, starEvery: 0.9, speed: [0.30, 0.48], zigzag: true,  color: '#4a0e1e' },
];

const MAX_LIVES = 3;

class Game {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks; // { onHud, onLevelComplete, onGameOver, onVictory, onHit }
    this.keys = {};
    this.running = false;
    this.rainbow = false;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.bindInput();
    this.bgStars = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2,
    }));
  }

  // Ajusta el canvas a la pantalla respetando la densidad de píxeles del celular.
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.unit = Math.min(this.w, this.h) / 20; // tamaño base de los objetos
    if (this.player) {
      this.player.y = this.h - this.unit * 4;
      this.player.x = Math.min(this.player.x, this.w);
    }
  }

  bindInput() {
    // Táctil / mouse: la nave sigue la posición horizontal del dedo.
    const move = (e) => {
      if (!this.player) return;
      const p = e.touches ? e.touches[0] : e;
      this.player.targetX = p.clientX;
    };
    this.canvas.addEventListener('pointerdown', move);
    this.canvas.addEventListener('pointermove', (e) => { if (e.pressure > 0 || e.pointerType !== 'mouse') move(e); });
    this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); }, { passive: false });

    window.addEventListener('keydown', (e) => { this.keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
  }

  /** Comienza una partida nueva desde el nivel 1. */
  newGame() {
    this.score = 0;
    this.lives = MAX_LIVES;
    this.startLevel(0);
  }

  /** Prepara el nivel indicado (0, 1 o 2) y arranca el ciclo del juego. */
  startLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.stars = 0;
    this.timeLeft = this.level.time;
    this.entities = [];
    this.particles = [];
    this.meteorTimer = 0;
    this.starTimer = 0;
    this.heartTimer = 8 + Math.random() * 6;
    this.shake = 0;
    this.invulnerable = 0;
    this.player = { x: this.w / 2, targetX: this.w / 2, y: this.h - this.unit * 4 };
    this.paused = false;
    this.running = true;
    this.last = performance.now();
    this.emitHud();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  pause() { if (this.running) this.paused = true; }
  resume() { if (this.running) { this.paused = false; this.last = performance.now(); } }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  emitHud() {
    this.cb.onHud({
      lives: this.lives, level: this.levelIndex + 1, time: Math.ceil(this.timeLeft),
      stars: this.stars, goal: this.level.goal, score: this.score,
    });
  }

  // ---------- Ciclo principal ----------
  loop(now) {
    if (!this.running) return;
    // dt = segundos desde el último cuadro (limitado para evitar saltos grandes)
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    if (!this.paused) this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  }

  update(dt) {
    const L = this.level;
    const u = this.unit;

    // --- Tiempo ---
    const prevSecond = Math.ceil(this.timeLeft);
    this.timeLeft -= dt;
    if (Math.ceil(this.timeLeft) !== prevSecond) this.emitHud();
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      return this.end('time');
    }

    // --- Movimiento de la nave (teclado o dedo) ---
    const p = this.player;
    const speed = this.w * 1.2;
    if (this.keys.ArrowLeft || this.keys.a) p.targetX = p.x - speed * dt * 3;
    if (this.keys.ArrowRight || this.keys.d) p.targetX = p.x + speed * dt * 3;
    p.targetX = Math.max(u, Math.min(this.w - u, p.targetX));
    // Interpolación suave hacia el objetivo
    p.x += (p.targetX - p.x) * Math.min(1, dt * 14);

    // --- Aparición de objetos ---
    this.meteorTimer -= dt;
    this.starTimer -= dt;
    this.heartTimer -= dt;
    if (this.meteorTimer <= 0) { this.spawn('meteor'); this.meteorTimer = L.meteorEvery * (0.7 + Math.random() * 0.6); }
    if (this.starTimer <= 0) { this.spawn('star'); this.starTimer = L.starEvery * (0.7 + Math.random() * 0.6); }
    if (this.heartTimer <= 0) {
      if (this.lives < MAX_LIVES) this.spawn('heart');
      this.heartTimer = 10 + Math.random() * 8;
    }

    // --- Mover objetos y detectar colisiones ---
    const pr = u * 0.9; // radio de colisión de la nave
    for (const e of this.entities) {
      e.y += e.vy * dt;
      e.rot += e.spin * dt;
      if (e.zigzag) { e.phase += dt * 3; e.x = e.baseX + Math.sin(e.phase) * u * 3; }

      const dx = e.x - p.x, dy = e.y - p.y;
      if (dx * dx + dy * dy < (e.r + pr) * (e.r + pr)) {
        if (e.type === 'meteor') {
          if (this.invulnerable <= 0) { this.hitPlayer(); e.dead = true; }
        } else {
          this.collect(e);
          e.dead = true;
        }
      }
      if (e.y - e.r > this.h) e.dead = true;
    }
    this.entities = this.entities.filter((e) => !e.dead);

    // --- Partículas y efectos ---
    for (const pt of this.particles) {
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.shake > 0) this.shake -= dt;
    for (const s of this.bgStars) { s.y += s.z * dt * 0.15 * (1 + this.levelIndex * 0.5); if (s.y > 1) s.y -= 1; }
  }

  spawn(type) {
    const u = this.unit;
    const [vmin, vmax] = this.level.speed;
    const r = type === 'meteor' ? u * (0.8 + Math.random() * 0.8) : u * 0.8;
    const x = r + Math.random() * (this.w - 2 * r);
    const e = {
      type, x, baseX: x, y: -r, r,
      vy: this.h * (vmin + Math.random() * (vmax - vmin)) * (type === 'meteor' ? 1 : 0.8),
      rot: 0, spin: (Math.random() - 0.5) * 4, phase: Math.random() * 6,
      zigzag: type === 'meteor' && this.level.zigzag && Math.random() < 0.5,
    };
    if (e.zigzag) e.baseX = Math.max(u * 3 + r, Math.min(this.w - u * 3 - r, x));
    this.entities.push(e);
  }

  collect(e) {
    if (e.type === 'star') {
      this.stars++;
      this.score += 10;
      Sound.star();
      this.burst(e.x, e.y, '#ffd23f', 14);
      if (this.stars >= this.level.goal) return this.end('goal');
    } else if (e.type === 'heart') {
      this.lives = Math.min(MAX_LIVES, this.lives + 1);
      this.score += 5;
      Sound.heart();
      this.burst(e.x, e.y, '#ff5d8f', 14);
    }
    this.emitHud();
  }

  hitPlayer() {
    this.lives--;
    this.invulnerable = 1.5;
    this.shake = 0.35;
    Sound.hit();
    if (navigator.vibrate) navigator.vibrate(150);
    this.burst(this.player.x, this.player.y, '#ff7b3a', 24);
    this.cb.onHit();
    this.emitHud();
    if (this.lives <= 0) this.end('dead');
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 180;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, color });
    }
  }

  /** Termina el nivel por meta cumplida, tiempo agotado o sin vidas. */
  end(reason) {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.draw();
    const level = this.levelIndex + 1;
    if (reason === 'goal') {
      const bonus = Math.ceil(this.timeLeft) * 5; // bono por tiempo sobrante
      this.score += bonus;
      this.emitHud();
      if (this.levelIndex === LEVELS.length - 1) this.cb.onVictory(this.score, level);
      else this.cb.onLevelComplete(level, this.score, bonus);
    } else {
      this.cb.onGameOver(this.score, level, reason);
    }
  }

  // ---------- Dibujo ----------
  draw() {
    const c = this.ctx;
    const u = this.unit;
    c.save();
    if (this.shake > 0) c.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);

    // Fondo degradado que cambia de color según el nivel
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, this.level ? this.level.color : '#1b1f5c');
    g.addColorStop(1, '#05061a');
    c.fillStyle = g;
    c.fillRect(-20, -20, this.w + 40, this.h + 40);

    // Estrellas de fondo (efecto parallax)
    for (const s of this.bgStars) {
      c.fillStyle = `rgba(255,255,255,${s.z})`;
      c.fillRect(s.x * this.w, s.y * this.h, s.z * 2.2, s.z * 2.2);
    }

    if (this.entities) for (const e of this.entities) {
      if (e.type === 'meteor') this.drawMeteor(e);
      else if (e.type === 'star') this.drawStar(e);
      else this.drawHeart(e);
    }

    if (this.particles) for (const pt of this.particles) {
      c.globalAlpha = Math.max(0, pt.life * 1.5);
      c.fillStyle = pt.color;
      c.fillRect(pt.x - 2, pt.y - 2, 4, 4);
    }
    c.globalAlpha = 1;

    // La nave parpadea mientras es invulnerable
    if (this.player && !(this.invulnerable > 0 && Math.floor(this.invulnerable * 10) % 2 === 0)) {
      this.drawShip(this.player.x, this.player.y, u);
    }
    c.restore();
  }

  drawShip(x, y, u) {
    const c = this.ctx;
    const t = performance.now() / 1000;
    // Llama del motor
    c.fillStyle = `rgba(255,${120 + Math.random() * 100},40,0.9)`;
    c.beginPath();
    c.moveTo(x - u * 0.4, y + u * 0.8);
    c.lineTo(x, y + u * (1.5 + Math.random() * 0.5));
    c.lineTo(x + u * 0.4, y + u * 0.8);
    c.fill();
    // Cuerpo (en modo arcoíris cambia de color)
    c.fillStyle = this.rainbow ? `hsl(${(t * 200) % 360},90%,60%)` : '#e8ecff';
    c.beginPath();
    c.moveTo(x, y - u * 1.2);
    c.lineTo(x + u, y + u * 0.9);
    c.lineTo(x, y + u * 0.5);
    c.lineTo(x - u, y + u * 0.9);
    c.closePath();
    c.fill();
    // Cabina
    c.fillStyle = '#3ad1ff';
    c.beginPath();
    c.arc(x, y - u * 0.1, u * 0.3, 0, Math.PI * 2);
    c.fill();
  }

  drawMeteor(e) {
    const c = this.ctx;
    c.save();
    c.translate(e.x, e.y);
    c.rotate(e.rot);
    c.fillStyle = e.zigzag ? '#c0392b' : '#8b5a3c';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = e.r * (i % 2 ? 0.85 : 1);
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath(); c.arc(e.r * 0.3, -e.r * 0.2, e.r * 0.25, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-e.r * 0.35, e.r * 0.3, e.r * 0.18, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  drawStar(e) {
    const c = this.ctx;
    const pulse = 1 + Math.sin(performance.now() / 150 + e.phase) * 0.12;
    c.save();
    c.translate(e.x, e.y);
    c.rotate(e.rot * 0.3);
    c.scale(pulse, pulse);
    c.shadowColor = '#ffd23f';
    c.shadowBlur = 15;
    c.fillStyle = '#ffd23f';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? e.r * 0.45 : e.r;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.restore();
  }

  drawHeart(e) {
    const c = this.ctx;
    const s = e.r * (1 + Math.sin(performance.now() / 120) * 0.1);
    c.save();
    c.translate(e.x, e.y);
    c.fillStyle = '#ff5d8f';
    c.shadowColor = '#ff5d8f';
    c.shadowBlur = 15;
    c.beginPath();
    c.moveTo(0, s * 0.7);
    c.bezierCurveTo(-s * 1.4, -s * 0.2, -s * 0.6, -s * 1.2, 0, -s * 0.4);
    c.bezierCurveTo(s * 0.6, -s * 1.2, s * 1.4, -s * 0.2, 0, s * 0.7);
    c.fill();
    c.restore();
  }
}
