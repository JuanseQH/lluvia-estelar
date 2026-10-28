/**
 * Persistencia de datos entre vistas usando localStorage.
 * En Capacitor, localStorage se guarda dentro del WebView de la app,
 * así que los datos se conservan aunque se cierre la app.
 */
const Storage = (() => {
  const KEY = 'lluviaEstelar.v1';

  const defaults = {
    playerName: '',
    bestScore: 0,
    maxLevel: 1,
    soundOn: true,
    rainbowShip: false, // se desbloquea con el easter egg
    scores: [],         // [{ name, score, level, date }]
    lastResult: null,   // último resultado, para mostrarlo en la pantalla de puntajes
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    } catch (e) {
      return { ...defaults };
    }
  }

  let data = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* sin espacio o bloqueado */ }
  }

  return {
    get: (k) => data[k],
    set(k, v) { data[k] = v; save(); },

    /** Guarda un resultado de partida y devuelve true si es nuevo récord. */
    addScore(name, score, level) {
      const isRecord = score > data.bestScore;
      data.scores.push({ name: name || 'Piloto', score, level, date: Date.now() });
      data.scores.sort((a, b) => b.score - a.score);
      data.scores = data.scores.slice(0, 5);
      data.bestScore = Math.max(data.bestScore, score);
      data.maxLevel = Math.max(data.maxLevel, level);
      data.lastResult = { score, level, isRecord };
      save();
      return isRecord;
    },

    resetScores() {
      data.scores = [];
      data.bestScore = 0;
      data.maxLevel = 1;
      data.lastResult = null;
      save();
    },
  };
})();
