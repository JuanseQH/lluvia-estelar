/**
 * Controlador de pantallas (navegación entre secciones) y conexión con el juego.
 * Secciones: Splash -> Home -> Juego -> Puntajes, más Créditos y Cómo jugar.
 */
(() => {
  const $ = (sel) => document.querySelector(sel);

  // ---------- Navegación ----------
  let current = 'splash';
  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $('#screen-' + name).classList.add('active');
    current = name;
    if (name === 'home') renderHome();
    if (name === 'scores') renderScores();
    if (name !== 'game') Sound.stopMusic();
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- Home ----------
  const nameInput = $('#player-name');
  function renderHome() {
    nameInput.value = Storage.get('playerName');
    $('#home-best').textContent = Storage.get('bestScore');
    $('#home-maxlevel').textContent = Storage.get('maxLevel');
    $('#btn-sound').textContent = Storage.get('soundOn') ? '🔊' : '🔇';
  }
  // El nombre se guarda en cuanto se escribe (persistencia entre vistas).
  nameInput.addEventListener('input', () => Storage.set('playerName', nameInput.value.trim()));

  $('#btn-sound').addEventListener('click', () => {
    Storage.set('soundOn', !Storage.get('soundOn'));
    renderHome();
    Sound.click();
  });

  // Easter egg 🪺: tocar el logo 5 veces seguidas activa la nave arcoíris.
  let logoTaps = 0, logoTimer;
  $('#home-logo').addEventListener('click', () => {
    logoTaps++;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => (logoTaps = 0), 1200);
    if (logoTaps >= 5) {
      logoTaps = 0;
      const on = !Storage.get('rainbowShip');
      Storage.set('rainbowShip', on);
      Sound.secret();
      toast(on ? '🌈 ¡Nave arcoíris desbloqueada!' : 'Nave normal restaurada');
    }
  });

  // ---------- Puntajes ----------
  function renderScores() {
    const last = Storage.get('lastResult');
    const box = $('#last-result');
    if (last) {
      box.classList.remove('hidden');
      $('#result-title').textContent = last.won ? '🏆 ¡Victoria!' : '💥 Fin del juego';
      $('#result-score').textContent = last.score;
      $('#result-level').textContent = last.level;
      $('#result-record').classList.toggle('hidden', !last.isRecord);
    } else {
      box.classList.add('hidden');
    }

    const list = $('#score-list');
    const scores = Storage.get('scores');
    list.innerHTML = scores.length
      ? ''
      : '<li class="empty">Aún no hay puntajes. ¡Juega una partida!</li>';
    scores.forEach((s) => {
      const li = document.createElement('li');
      li.textContent = `${s.name} (Nv ${s.level})`;
      const span = document.createElement('span');
      span.textContent = s.score;
      li.appendChild(span);
      list.appendChild(li);
    });
  }

  $('#btn-reset').addEventListener('click', () => {
    if (confirm('¿Borrar todos los puntajes?')) {
      Storage.resetScores();
      renderScores();
      toast('Puntajes borrados');
    }
  });

  // ---------- Juego ----------
  const overlay = $('#overlay');
  let overlayAction = null;

  function showOverlay(title, text, btnText, action) {
    $('#overlay-title').textContent = title;
    $('#overlay-text').innerHTML = text;
    $('#overlay-btn').textContent = btnText;
    overlayAction = action;
    overlay.classList.remove('hidden');
  }
  const hideOverlay = () => overlay.classList.add('hidden');

  const game = new Game($('#game-canvas'), {
    onHud(s) {
      $('#hud-lives').textContent = '❤'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, 3 - s.lives));
      $('#hud-level').textContent = s.level;
      $('#hud-time').textContent = s.time;
      $('#hud-stars').textContent = s.stars;
      $('#hud-goal').textContent = s.goal;
      $('#hud-score').textContent = s.score;
    },
    onHit() {
      const el = $('#hud-lives');
      el.classList.remove('flash');
      void el.offsetWidth; // reinicia la animación CSS
      el.classList.add('flash');
    },
    onLevelComplete(level, score, bonus) {
      Sound.stopMusic();
      Sound.levelUp();
      const next = LEVELS[level];
      showOverlay(
        `¡Nivel ${level} superado!`,
        `Bono de tiempo: +${bonus}<br>Puntaje: <strong>${score}</strong><br><br>` +
          `Siguiente: recoge <strong>${next.goal}</strong> estrellas en <strong>${next.time}s</strong>` +
          (next.zigzag ? '<br>⚠ ¡Cuidado con los meteoritos rojos en zigzag!' : ''),
        `Nivel ${level + 1} ▶`,
        () => { game.startLevel(level); Sound.startMusic(); }
      );
    },
    onVictory(score, level) { finish(score, level, true); },
    onGameOver(score, level, reason) { finish(score, level, false, reason); },
  });

  window.game = game; // solo para depurar desde la consola del navegador

  function finish(score, level, won, reason) {
    Sound.stopMusic();
    won ? Sound.win() : Sound.gameOver();
    const isRecord = Storage.addScore(Storage.get('playerName'), score, level);
    Storage.set('lastResult', { score, level, isRecord, won });
    const reasonText = won
      ? '¡Completaste los 3 niveles!'
      : reason === 'time' ? '⏱ Se acabó el tiempo.' : '☄ Te quedaste sin vidas.';
    showOverlay(won ? '🏆 ¡Victoria!' : 'Fin del juego', `${reasonText}<br>Puntaje: <strong>${score}</strong>`,
      'Ver puntajes', () => show('scores'));
  }

  function startGame() {
    Sound.unlock();
    show('game');
    game.rainbow = Storage.get('rainbowShip');
    game.newGame();
    game.pause();
    const L = LEVELS[0];
    showOverlay('Nivel 1', `Recoge <strong>${L.goal}</strong> estrellas en <strong>${L.time}s</strong>.<br>Esquiva los meteoritos.`,
      '¡Comenzar!', () => { game.resume(); Sound.startMusic(); });
  }

  $('#overlay-btn').addEventListener('click', () => {
    Sound.click();
    hideOverlay();
    if (overlayAction) overlayAction();
  });
  $('#overlay-exit').addEventListener('click', () => {
    Sound.click();
    hideOverlay();
    game.stop();
    show('home');
  });

  function pauseGame() {
    if (!game.running || game.paused) return;
    game.pause();
    Sound.stopMusic();
    showOverlay('Pausa', 'El juego está en pausa.', 'Continuar', () => { game.resume(); Sound.startMusic(); });
  }
  $('#btn-pause').addEventListener('click', pauseGame);
  // Pausa automática si el usuario sale de la app
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'game') pauseGame(); });

  // ---------- Botones de menú (data-action) ----------
  document.querySelectorAll('[data-action]').forEach((btn) =>
    btn.addEventListener('click', () => {
      Sound.click();
      const a = btn.dataset.action;
      if (a === 'play') startGame();
      else show(a);
    })
  );

  // Botón "atrás" de Android (plugin @capacitor/app): pausa el juego,
  // vuelve al inicio desde otras pantallas, o cierra la app desde el inicio.
  const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (CapApp) {
    CapApp.addListener('backButton', () => {
      if (current === 'game') pauseGame();
      else if (current !== 'home') show('home');
      else CapApp.exitApp();
    });
  }

  // ---------- Splash ----------
  setTimeout(() => show('home'), 2600);
})();
