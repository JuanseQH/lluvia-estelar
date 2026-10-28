/**
 * Sonidos generados con la Web Audio API (no se necesitan archivos .mp3).
 * Cada efecto es un oscilador con una envolvente de volumen corta.
 */
const Sound = (() => {
  let ctx = null;
  let musicTimer = null;

  // El navegador solo permite audio después de una interacción del usuario,
  // por eso el contexto se crea la primera vez que se reproduce algo.
  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const enabled = () => Storage.get('soundOn');

  /** Toca una nota: frecuencia inicial -> final, duración en segundos. */
  function tone(freq, endFreq, duration, type = 'square', volume = 0.15, delay = 0) {
    if (!enabled()) return;
    const c = ensureCtx();
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  // Melodía de fondo: un arpegio sencillo que se repite.
  const melody = [262, 330, 392, 523, 392, 330, 294, 349, 440, 587, 440, 349];

  return {
    click: () => tone(600, 900, 0.08, 'square', 0.08),
    star: () => { tone(880, 1320, 0.12, 'triangle', 0.18); tone(1320, 1760, 0.1, 'triangle', 0.12, 0.06); },
    heart: () => [523, 659, 784].forEach((f, i) => tone(f, f, 0.15, 'sine', 0.2, i * 0.08)),
    hit: () => tone(200, 40, 0.4, 'sawtooth', 0.25),
    levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.2, i * 0.12)),
    gameOver: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.95, 0.3, 'sawtooth', 0.15, i * 0.22)),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, 0.2, 'square', 0.12, i * 0.13)),
    secret: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, f, 0.1, 'sine', 0.2, i * 0.06)),

    startMusic() {
      this.stopMusic();
      let i = 0;
      musicTimer = setInterval(() => {
        tone(melody[i % melody.length], melody[i % melody.length], 0.18, 'triangle', 0.04);
        i++;
      }, 220);
    },
    stopMusic() {
      clearInterval(musicTimer);
      musicTimer = null;
    },
    unlock: ensureCtx,
  };
})();
