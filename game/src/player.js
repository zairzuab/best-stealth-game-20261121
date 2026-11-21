// The thief: movement, noise, hiding and the pebble lure.
// Walk is quiet, sneak is slower and quieter still, run is fast and loud:
// running footsteps carry far enough for a warden to come and look.
// Ferns hide a sneaking thief completely; shadow pools make her hard to see.

import { TILE, isSolid } from './levels.js';

export const WALK_SPEED = 150;
export const SNEAK_SPEED = 82;
export const RUN_SPEED = 235;

export function makePlayer(start) {
  return {
    x: start.x,
    y: start.y,
    facing: 0, // radians; 0 = east
    moving: false,
    sneaking: false,
    running: false,
    hidden: false, // inside a fern while sneaking
    inShadow: false,
    inLight: false,
    alive: true,
    stepTimer: 0,
    noisePulse: 0, // radius of the last footstep noise, fades fast
    noiseX: 0,
    noiseY: 0,
    pebbles: 5,
    pebble: null, // {x, y, tx, ty, t} flying pebble
    loot: 0,
    starTaken: false,
    caught: false,
  };
}

function collides(level, x, y) {
  const r = 13;
  const pts = [
    [x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r],
    [x, y - r], [x, y + r], [x - r, y], [x + r, y],
  ];
  for (const [px, py] of pts) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (isSolid(level, col, row)) return true;
  }
  return false;
}

// input: {up, down, left, right, sneak, run, throwPebble: {x, y} | null}
export function updatePlayer(player, level, input, dt, events) {
  if (!player.alive) return;

  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  player.moving = len > 0;
  if (len > 0) {
    mx /= len;
    my /= len;
    player.facing = Math.atan2(my, mx);
  }

  player.sneaking = !!input.sneak;
  player.running = !!input.run && !player.sneaking;
  const speed = player.sneaking ? SNEAK_SPEED : player.running ? RUN_SPEED : WALK_SPEED;

  if (player.moving) {
    const nx = player.x + mx * speed * dt;
    const ny = player.y + my * speed * dt;
    if (!collides(level, nx, player.y)) player.x = nx;
    if (!collides(level, player.x, ny)) player.y = ny;

    // Footsteps: a noise pulse sized by gait. Wardens hear it.
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      const stride = player.running ? 0.26 : player.sneaking ? 0.55 : 0.38;
      player.stepTimer = stride;
      player.noisePulse = player.running ? 150 : player.sneaking ? 26 : 70;
      player.noiseX = player.x;
      player.noiseY = player.y;
      events.push({ type: 'step', loud: player.running, x: player.x, y: player.y });
    }
  }
  player.noisePulse = Math.max(0, player.noisePulse - 260 * dt);

  // Where is she standing? Shadow, fern or lamplight changes what guards see.
  const col = Math.floor(player.x / TILE);
  const row = Math.floor(player.y / TILE);
  const k = `${col},${row}`;
  player.inShadow = level.shadows.has(k);
  player.hidden = level.ferns.has(k) && player.sneaking;
  player.inLight = false;
  for (const lamp of level.lanterns) {
    if (Math.hypot(player.x - lamp.x, player.y - lamp.y) < 95) { player.inLight = true; break; }
  }

  // Pebble lure: click (or Q) throws one toward the mouse; it clinks on landing
  // and every warden in earshot walks over to look.
  if (input.throwPebble && player.pebbles > 0 && !player.pebble) {
    player.pebbles -= 1;
    player.pebble = {
      x: player.x, y: player.y,
      tx: input.throwPebble.x, ty: input.throwPebble.y,
      t: 0,
    };
    events.push({ type: 'throw' });
  }
  if (player.pebble) {
    const p = player.pebble;
    p.t += dt * 2.4;
    if (p.t >= 1) {
      const lx = p.tx;
      const ly = p.ty;
      player.pebble = null;
      player.noisePulse = 190;
      player.noiseX = lx;
      player.noiseY = ly;
      events.push({ type: 'pebbleLand', x: lx, y: ly });
    } else {
      const e = p.t * p.t * (3 - 2 * p.t); // smoothstep
      p.x = p.x + (p.tx - p.x) * 0.12;
      p.y = p.y + (p.ty - p.y) * 0.12;
      void e;
    }
  }

  // Pick up relics by walking over them.
  for (const item of level.loot) {
    if (!item.taken) {
      const ix = (item.col + 0.5) * TILE;
      const iy = (item.row + 0.5) * TILE;
      if (Math.hypot(player.x - ix, player.y - iy) < 26) {
        item.taken = true;
        player.loot += 1;
        events.push({ type: 'loot', x: ix, y: iy });
      }
    }
  }
  if (!level.star.taken) {
    const sx = (level.star.col + 0.5) * TILE;
    const sy = (level.star.row + 0.5) * TILE;
    if (Math.hypot(player.x - sx, player.y - sy) < 30) {
      level.star.taken = true;
      player.starTaken = true;
      events.push({ type: 'star', x: sx, y: sy });
    }
  }
}

// Has the thief reached the exit with the Star in hand?
export function atExit(player, level) {
  if (!player.starTaken) return false;
  const ex = (level.exit.col + 0.5) * TILE;
  const ey = (level.exit.row + 0.5) * TILE;
  return Math.hypot(player.x - ex, player.y - ey) < 30;
}
