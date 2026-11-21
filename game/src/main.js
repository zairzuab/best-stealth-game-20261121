// The Cinder Library — main loop and game state.
// Screens: title -> play -> (caught, then the floor restarts) -> win / gameover.
// The loop ticks the thief, every warden, the noise they hear, the alarm and
// the clock, then draws one frame. ?demo=patrol|chase|vault stages a scene
// for a screenshot; without it the game starts on the title screen.

import { LEVELS, parseLevel, TILE } from './levels.js';
import { makePlayer, updatePlayer, atExit } from './player.js';
import { makeGuard, updateGuard, alarmLevel, anyAlerted, GUARD_STATES } from './guards.js';
import { drawScene, W, H } from './render.js';
import { initAudio, sfx, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const LEVEL_TIME = 240; // seconds per floor before the wardens sweep it
const MAX_ATTEMPTS = 3;

const state = {
  screen: 'title',
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  score: 0,
  attempts: MAX_ATTEMPTS,
  timesSpotted: 0,
  time: 0,
  timeLeft: LEVEL_TIME,
  message: null,
  messageTimer: 0,
  caughtTimer: 0,
  events: [],
};

const keys = {};
let mouse = { x: 0, y: 0, clicked: false };

function showMessage(text, sub, color, seconds = 3) {
  state.message = { text, sub: sub || '', color: color || '#f0e6c8', alpha: 1 };
  state.messageTimer = seconds;
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function loadLevel(index) {
  const def = LEVELS[index];
  state.levelIndex = index;
  state.level = parseLevel(def);
  state.player = makePlayer(state.level.playerStart);
  state.guards = def.guards.map((g, i) => makeGuard(g, i));
  state.timeLeft = LEVEL_TIME;
  state.events = [];
  showMessage(def.name, def.hint, '#e8d9a8', 4);
  announce(`${def.name}. ${def.hint}`);
}

function startGame() {
  initAudio();
  state.score = 0;
  state.attempts = MAX_ATTEMPTS;
  state.timesSpotted = 0;
  state.screen = 'play';
  loadLevel(0);
  sfx.click();
}

function restartFloor() {
  state.screen = 'play';
  loadLevel(state.levelIndex);
}

function nextFloor() {
  const bonus = 250 + Math.floor(state.timeLeft) * 2;
  state.score += bonus;
  sfx.levelClear();
  if (state.levelIndex + 1 >= LEVELS.length) {
    state.screen = 'win';
    announce('You escaped the Cinder Library with the Star of Auralia.');
  } else {
    loadLevel(state.levelIndex + 1);
  }
}

function handleCaught() {
  state.player.alive = false;
  state.player.caught = true;
  state.timesSpotted += 1;
  state.score = Math.max(0, state.score - 50);
  state.attempts -= 1;
  state.screen = 'caught';
  state.caughtTimer = 2.2;
  sfx.caught();
  announce('Caught! A warden found you.');
}

// Wardens hear a noise: every warden in earshot walks over to look.
function broadcastNoise(x, y, radius) {
  for (const g of state.guards) {
    if (g.state === GUARD_STATES.ALERTED) continue;
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < radius) {
      g.suspicion = Math.max(g.suspicion, 55);
      g.lastSeen = { x, y };
      if (g.state === GUARD_STATES.PATROL || g.state === GUARD_STATES.RETURN) {
        g.state = GUARD_STATES.SUSPICIOUS;
        g.stateTimer = 0;
        g.moveTarget = { x, y };
        g.route = null; // drop the patrol route: the noise is the new job
      }
    }
  }
}

function drainEvents() {
  for (const ev of state.events) {
    if (ev.type === 'step') sfx.step(ev.loud);
    else if (ev.type === 'throw') sfx.throwPebble();
    else if (ev.type === 'pebbleLand') {
      sfx.pebbleLand();
      broadcastNoise(ev.x, ev.y, 280);
    } else if (ev.type === 'loot') {
      state.score += 100;
      sfx.loot();
    } else if (ev.type === 'star') {
      state.score += 500;
      sfx.star();
      sfx.exitOpen();
      showMessage('THE STAR IS YOURS', 'The east door stands open — run for it.', '#9fdcff', 3.5);
    } else if (ev.type === 'suspicious') sfx.suspicious();
    else if (ev.type === 'spotted') {
      state.timesSpotted += 1;
      sfx.spotted();
      showMessage('SPOTTED!', 'Break line of sight — hide in the dark.', '#ff6a5a', 2.2);
    } else if (ev.type === 'lost') sfx.lost();
    else if (ev.type === 'caught') handleCaught();
  }
  state.events = [];
}

function readInput() {
  const input = {
    up: keys['arrowup'] || keys['w'],
    down: keys['arrowdown'] || keys['s'],
    left: keys['arrowleft'] || keys['a'],
    right: keys['arrowright'] || keys['d'],
    sneak: !!keys['shift'],
    run: !!keys[' '],
    throwPebble: null,
  };
  if (mouse.clicked) {
    input.throwPebble = { x: mouse.x, y: mouse.y };
    mouse.clicked = false;
  }
  if (keys['q']) {
    // Q throws toward the mouse cursor.
    input.throwPebble = { x: mouse.x, y: mouse.y };
    keys['q'] = false;
  }
  return input;
}

function tick(dt) {
  state.time += dt;
  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.message) state.message.alpha = Math.min(1, state.messageTimer);
    if (state.messageTimer <= 0) state.message = null;
  }
  if (state.screen === 'caught') {
    state.caughtTimer -= dt;
    if (state.caughtTimer <= 0) {
      if (state.attempts <= 0) {
        state.screen = 'gameover';
      } else {
        restartFloor();
      }
    }
    return;
  }
  if (state.screen !== 'play') return;

  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    showMessage('THE SWEEP BEGINS', 'Out of time — the wardens lock the floor.', '#ff8a7a', 2);
    handleCaught();
    return;
  }

  const input = readInput();
  updatePlayer(state.player, state.level, input, dt, state.events);

  // Loud footsteps carry: wardens in earshot come to look.
  if (state.player.noisePulse > 120 && state.player.running) {
    broadcastNoise(state.player.noiseX, state.player.noiseY, 170);
  }

  for (const g of state.guards) {
    updateGuard(g, state.level, state.player, dt, state.events);
  }
  drainEvents();

  if (!state.player.alive) return;
  if (atExit(state.player, state.level)) nextFloor();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  drawScene(ctx, {
    screen: state.screen,
    level: state.level,
    player: state.player,
    guards: state.guards,
    levelIndex: state.levelIndex,
    score: state.score,
    attempts: state.attempts,
    timesSpotted: state.timesSpotted,
    time: state.time,
    timeLeft: Math.max(0, state.timeLeft),
    message: state.message,
  });
  requestAnimationFrame(frame);
}

// ---- input ----

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys[k] = true;
  if (k === 'enter') {
    if (state.screen === 'title' || state.screen === 'win' || state.screen === 'gameover') startGame();
  }
  if (k === 'm') {
    initAudio();
    const muted = toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (k === 'r' && state.screen === 'play') restartFloor();
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * W;
  mouse.y = ((e.clientY - rect.top) / rect.height) * H;
});

canvas.addEventListener('click', (e) => {
  initAudio();
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * W;
  mouse.y = ((e.clientY - rect.top) / rect.height) * H;
  mouse.clicked = true;
});

// ---- demo scenes for screenshots: ?demo=patrol | chase | vault ----
// These stage the real game (same code, same rules) at a chosen moment.

function stageDemo(kind) {
  startGame();
  if (kind === 'patrol') {
    // Mid-floor: the thief crouched in a shadow pool while two cones sweep past.
    state.player.x = 15.5 * TILE;
    state.player.y = 6.5 * TILE;
    state.player.sneaking = true;
    state.player.facing = Math.PI;
    state.guards[0].x = 10.5 * TILE;
    state.guards[0].y = 10.5 * TILE;
    state.guards[0].facing = Math.PI / 2;
    state.guards[1].x = 24.5 * TILE;
    state.guards[1].y = 9.5 * TILE;
    state.guards[1].facing = -Math.PI / 2;
    state.timeLeft = 198;
    showMessage('THE READING ROOM', 'Stay out of the gold — the cones are watching.', '#e8d9a8', 60);
  } else if (kind === 'chase') {
    // A warden has spotted the thief and gives chase, cone burning red.
    state.player.x = 18.5 * TILE;
    state.player.y = 12.5 * TILE;
    state.player.running = true;
    state.player.facing = Math.PI;
    const g = state.guards[0];
    g.x = 14.5 * TILE;
    g.y = 12.5 * TILE;
    g.facing = 0;
    g.state = GUARD_STATES.ALERTED;
    g.suspicion = 100;
    g.lastSeen = { x: state.player.x, y: state.player.y };
    state.guards[1].x = 24.5 * TILE;
    state.guards[1].y = 6.5 * TILE;
    state.guards[1].state = GUARD_STATES.SUSPICIOUS;
    state.guards[1].suspicion = 60;
    state.timeLeft = 141;
    showMessage('SPOTTED!', 'Break line of sight — hide in the dark.', '#ff6a5a', 60);
  } else if (kind === 'vault') {
    // The third floor: the thief at the Star, wardens closing in.
    loadLevel(2);
    state.player.x = 15.5 * TILE;
    state.player.y = 10.5 * TILE;
    state.player.sneaking = true;
    state.player.facing = Math.PI / 2;
    state.player.loot = 4;
    state.score = 900;
    state.guards[0].x = 9.5 * TILE;
    state.guards[0].y = 7.5 * TILE;
    state.guards[0].facing = Math.PI / 2;
    state.guards[1].x = 22.5 * TILE;
    state.guards[1].y = 7.5 * TILE;
    state.guards[1].facing = Math.PI / 2;
    state.guards[2].x = 16.5 * TILE;
    state.guards[2].y = 14.5 * TILE;
    state.guards[2].facing = -Math.PI / 2;
    state.guards[2].state = GUARD_STATES.SUSPICIOUS;
    state.guards[2].suspicion = 55;
    state.timeLeft = 173;
    showMessage('THE VAULT OF EMBERS', 'Five wardens guard the Star. One pebble at a time.', '#e8d9a8', 60);
  }
  // Freeze the staged moment: hold the frame steady for the screenshot.
  state.screen = 'demo';
  state._demoKind = kind;
}

// In demo mode the world is held still (no ticking) so the shot is composed.
const _tick = tick;
tick = function (dt) {
  if (state.screen === 'demo') {
    state.time += dt * 0.15; // gentle lantern flicker only
    if (state.messageTimer > 0) state.messageTimer -= dt * 0.15;
    return;
  }
  _tick(dt);
};

const params = new URLSearchParams(window.location.search);
const demo = params.get('demo');
if (demo) stageDemo(demo);

requestAnimationFrame(frame);
