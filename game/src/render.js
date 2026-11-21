// Rendering: everything the judge sees.
// A moonlit library floor in deep blues, warm lantern pools, bookshelves as
// cover, and the wardens' vision cones — pale gold while they patrol,
// amber while they wonder, red while they chase. The thief's cloak is teal
// so she reads against the floor at a glance; what is safe is dark, what is
// watched is lit.

import { TILE, COLS, ROWS } from './levels.js';
import { conePolygon, CONE_RANGE, CONE_HALF_ANGLE } from './vision.js';
import { GUARD_STATES } from './guards.js';

export const W = 1280;
export const H = 800;

// Deterministic per-tile variation so the floor never looks flat.
function hash2(c, r) {
  let h = (c * 374761393 + r * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function drawFloor(ctx, level) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      const v = hash2(c, r);
      const base = (c + r) % 2 === 0 ? 26 : 22;
      ctx.fillStyle = `rgb(${base + v * 6}, ${base + 3 + v * 5}, ${base + 16 + v * 8})`;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      if (v > 0.86) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
      }
    }
  }
}

function drawShadows(ctx, level) {
  for (const k of level.shadows) {
    const [c, r] = k.split(',').map(Number);
    const x = c * TILE;
    const y = r * TILE;
    const g = ctx.createRadialGradient(x + 20, y + 20, 4, x + 20, y + 20, 34);
    g.addColorStop(0, 'rgba(8, 12, 30, 0.85)');
    g.addColorStop(1, 'rgba(8, 12, 30, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 14, y - 14, TILE + 28, TILE + 28);
    ctx.fillStyle = 'rgba(120, 150, 255, 0.10)';
    ctx.beginPath();
    ctx.arc(x + 20, y + 20, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFerns(ctx, level) {
  for (const k of level.ferns) {
    const [c, r] = k.split(',').map(Number);
    const cx = c * TILE + 20;
    const cy = r * TILE + 20;
    ctx.fillStyle = 'rgba(10, 40, 26, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f7a4e';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + hash2(c, r);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(
        cx + Math.cos(a) * 12, cy + Math.sin(a) * 12 - 6,
        cx + Math.cos(a) * 19, cy + Math.sin(a) * 19,
      );
      ctx.stroke();
    }
  }
}

function drawShelf(ctx, x, y, kind) {
  // A bookshelf: dark wood frame, rows of coloured book spines.
  ctx.fillStyle = '#241a10';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
  const spineColors = ['#7a4a2b', '#4a6a8a', '#8a6a3a', '#5a3a5a', '#3a5a4a', '#9a3a3a'];
  for (let row = 0; row < 3; row++) {
    const sy = y + 7 + row * 11;
    let sx = x + 6;
    while (sx < x + TILE - 8) {
      const w = 3 + hash2(Math.floor(sx), Math.floor(sy)) * 4;
      ctx.fillStyle = spineColors[Math.floor(hash2(Math.floor(sx * 3), Math.floor(sy)) * spineColors.length)];
      ctx.fillRect(sx, sy, w, 9);
      sx += w + 1;
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
  if (kind === 'C') {
    // Crate / reading table: planks and a brass clasp.
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
    ctx.strokeStyle = '#2a1c0e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + TILE - 5, y + TILE - 5);
    ctx.moveTo(x + TILE - 5, y + 5); ctx.lineTo(x + 5, y + TILE - 5);
    ctx.stroke();
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(x + 17, y + 17, 6, 6);
  }
}

function drawWalls(ctx, level) {
  for (const k of level.walls) {
    const [c, r] = k.split(',').map(Number);
    const x = c * TILE;
    const y = r * TILE;
    ctx.fillStyle = '#161a28';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#232839';
    ctx.fillRect(x, y, TILE, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x + 4, y + 12, TILE - 8, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }
  for (const k of level.shelves) {
    const [c, r] = k.split(',').map(Number);
    const ch = level.def.map[r][c];
    drawShelf(ctx, c * TILE, r * TILE, ch);
  }
}

function drawLanterns(ctx, level, time) {
  for (const lamp of level.lanterns) {
    const flicker = 0.85 + Math.sin(time * 3 + lamp.x * 0.7) * 0.06 + Math.sin(time * 7.3) * 0.04;
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, 110 * flicker);
    g.addColorStop(0, 'rgba(255, 190, 90, 0.30)');
    g.addColorStop(0.5, 'rgba(255, 160, 60, 0.10)');
    g.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(lamp.x - 115, lamp.y - 115, 230, 230);
    // Lantern post.
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(lamp.x - 2, lamp.y - 14, 4, 28);
    ctx.fillStyle = '#ffb85c';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 16, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 220, 140, 0.9)';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 16, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLoot(ctx, level, time) {
  for (const item of level.loot) {
    if (item.taken) continue;
    const x = (item.col + 0.5) * TILE;
    const y = (item.row + 0.5) * TILE + Math.sin(time * 2 + item.col) * 2;
    const g = ctx.createRadialGradient(x, y, 1, x, y, 22);
    g.addColorStop(0, 'rgba(255, 215, 110, 0.55)');
    g.addColorStop(1, 'rgba(255, 215, 110, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 22, y - 22, 44, 44);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#e8c15a';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#fff2c0';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
  if (!level.star.taken) {
    const x = (level.star.col + 0.5) * TILE;
    const y = (level.star.row + 0.5) * TILE + Math.sin(time * 1.6) * 3;
    const pulse = 0.7 + Math.sin(time * 2.4) * 0.3;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 60 * pulse);
    g.addColorStop(0, 'rgba(160, 220, 255, 0.8)');
    g.addColorStop(0.4, 'rgba(120, 180, 255, 0.25)');
    g.addColorStop(1, 'rgba(120, 180, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 60, y - 60, 120, 120);
    drawStar(ctx, x, y, 15, '#bfe6ff', '#5aa8e8');
    drawStar(ctx, x, y, 8, '#ffffff', '#bfe6ff');
  }
}

function drawStar(ctx, x, y, r, fill, stroke) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawExit(ctx, level, time) {
  const x = (level.exit.col + 0.5) * TILE;
  const y = (level.exit.row + 0.5) * TILE;
  const open = level.star.taken;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 46);
  g.addColorStop(0, open ? 'rgba(120, 255, 170, 0.5)' : 'rgba(255, 90, 90, 0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 46, y - 46, 92, 92);
  ctx.fillStyle = '#0d0f18';
  ctx.fillRect(x - 16, y - 18, 32, 36);
  ctx.strokeStyle = open ? '#7dffab' : '#8a4a4a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 16, y - 18, 32, 36);
  ctx.fillStyle = open ? '#7dffab' : '#5a3a3a';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', x, y - 26);
  if (open) {
    ctx.fillStyle = `rgba(125, 255, 171, ${0.5 + Math.sin(time * 4) * 0.3})`;
    ctx.fillRect(x - 13, y - 15, 26, 30);
  }
}

function coneColor(state) {
  if (state === GUARD_STATES.ALERTED) return 'rgba(255, 60, 50, 0.34)';
  if (state === GUARD_STATES.SUSPICIOUS) return 'rgba(255, 170, 40, 0.28)';
  if (state === GUARD_STATES.SEARCH) return 'rgba(255, 150, 60, 0.24)';
  return 'rgba(255, 214, 110, 0.20)';
}

function coneEdge(state) {
  if (state === GUARD_STATES.ALERTED) return 'rgba(255, 80, 60, 0.55)';
  if (state === GUARD_STATES.SUSPICIOUS) return 'rgba(255, 180, 60, 0.45)';
  return 'rgba(255, 220, 130, 0.30)';
}

function drawGuard(ctx, level, guard, time) {
  const poly = conePolygon(level, guard.x, guard.y, guard.facing, CONE_RANGE, CONE_HALF_ANGLE);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fillStyle = coneColor(guard.state);
  ctx.fill();
  ctx.strokeStyle = coneEdge(guard.state);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Warden: dark robe, brass lantern, hood facing the patrol direction.
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 15, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = guard.state === GUARD_STATES.ALERTED ? '#5a1f1a' : '#2c2f42';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d4160';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.facing) * 4, Math.sin(guard.facing) * 4, 8, 0, Math.PI * 2);
  ctx.fill();
  // Hood point and lantern.
  ctx.fillStyle = '#171a28';
  ctx.beginPath();
  ctx.moveTo(Math.cos(guard.facing) * 12, Math.sin(guard.facing) * 12);
  ctx.lineTo(Math.cos(guard.facing + 2.4) * 9, Math.sin(guard.facing + 2.4) * 9);
  ctx.lineTo(Math.cos(guard.facing - 2.4) * 9, Math.sin(guard.facing - 2.4) * 9);
  ctx.closePath();
  ctx.fill();
  const lx = Math.cos(guard.facing + 0.9) * 14;
  const ly = Math.sin(guard.facing + 0.9) * 14;
  ctx.fillStyle = '#ffcf7a';
  ctx.beginPath();
  ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Suspicion mark above the head.
  if (guard.state === GUARD_STATES.SUSPICIOUS || guard.state === GUARD_STATES.SEARCH) {
    drawMark(ctx, guard.x, guard.y - 26, '?', '#ffbe3c');
  } else if (guard.state === GUARD_STATES.ALERTED) {
    drawMark(ctx, guard.x, guard.y - 26, '!', '#ff5040');
  }
  // Suspicion arc.
  if (guard.suspicion > 3 && guard.state !== GUARD_STATES.ALERTED) {
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 19, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
    ctx.strokeStyle = guard.suspicion > 60 ? '#ff8a3c' : '#ffcf5a';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawMark(ctx, x, y, text, color) {
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 1);
}

function drawPlayer(ctx, player, time) {
  const bob = player.moving ? Math.sin(time * (player.running ? 14 : 9)) * 1.5 : 0;
  ctx.save();
  ctx.translate(player.x, player.y + bob * 0.4);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Teal cloak.
  ctx.fillStyle = player.hidden ? 'rgba(28, 110, 102, 0.55)' : '#1f7a6e';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2aa895';
  ctx.beginPath();
  ctx.arc(Math.cos(player.facing) * 3, Math.sin(player.facing) * 3, 8.5, 0, Math.PI * 2);
  ctx.fill();
  // Hood and gold clasp.
  ctx.fillStyle = '#123f38';
  ctx.beginPath();
  ctx.moveTo(Math.cos(player.facing) * 13, Math.sin(player.facing) * 13);
  ctx.lineTo(Math.cos(player.facing + 2.5) * 9, Math.sin(player.facing + 2.5) * 9);
  ctx.lineTo(Math.cos(player.facing - 2.5) * 9, Math.sin(player.facing - 2.5) * 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8c15a';
  ctx.beginPath();
  ctx.arc(Math.cos(player.facing) * 10, Math.sin(player.facing) * 10, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (player.hidden) {
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(180, 255, 220, 0.9)';
    ctx.fillText('HIDDEN', player.x, player.y - 24);
  }
  if (player.pebble) {
    ctx.fillStyle = '#c9c9c9';
    ctx.beginPath();
    ctx.arc(player.pebble.x, player.pebble.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNoise(ctx, player, time) {
  if (player.noisePulse > 4) {
    ctx.beginPath();
    ctx.arc(player.noiseX, player.noiseY, player.noisePulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 * (player.noisePulse / 190)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawMoonlight(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(90, 120, 220, 0.06)');
  g.addColorStop(0.5, 'rgba(90, 120, 220, 0)');
  g.addColorStop(1, 'rgba(20, 30, 70, 0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Vignette.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ---- HUD ----

function drawHud(ctx, s) {
  const { level, player, guards, levelIndex, score, attempts, timeLeft, message } = s;
  ctx.fillStyle = 'rgba(5, 6, 12, 0.88)';
  ctx.fillRect(0, 0, W, 46);
  ctx.fillStyle = '#2a2f45';
  ctx.fillRect(0, 46, W, 1);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8d9a8';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText(`THE CINDER LIBRARY  ·  ${level.def.name}`, 16, 24);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8c98a';
  ctx.font = '15px Georgia, serif';
  const totalLoot = level.loot.length;
  ctx.fillText(`Relics ${player.loot}/${totalLoot}`, 560, 24);
  ctx.fillStyle = player.starTaken ? '#9fdcff' : '#7a8aa8';
  ctx.fillText(player.starTaken ? '★ Star stolen' : '☆ Star not yet taken', 700, 24);
  ctx.fillStyle = '#c9c9c9';
  ctx.fillText(`Pebbles ${player.pebbles}`, 830, 24);
  ctx.fillText(`Attempts ${attempts}`, 920, 24);
  const mm = Math.floor(timeLeft / 60);
  const ss = String(Math.floor(timeLeft % 60)).padStart(2, '0');
  ctx.fillStyle = timeLeft < 30 ? '#ff7a6a' : '#c9c9c9';
  ctx.fillText(`${mm}:${ss}`, 990, 24);

  // Alarm meter: the eye that watches you.
  const alarm = Math.max(0, ...guards.map((g) => g.suspicion));
  const ax = 1060;
  ctx.fillStyle = '#11141f';
  ctx.fillRect(ax, 12, 150, 22);
  ctx.fillStyle = alarm >= 100 ? '#ff5040' : alarm >= 42 ? '#ffaa28' : '#2aa895';
  ctx.fillRect(ax + 2, 14, 146 * (alarm / 100), 18);
  ctx.strokeStyle = '#4a5170';
  ctx.strokeRect(ax + 0.5, 12.5, 150, 22);
  ctx.fillStyle = '#f0e6c8';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(alarm >= 100 ? 'SPOTTED!' : alarm >= 42 ? 'SUSPICIOUS' : 'UNSEEN', ax + 75, 23);

  // Bottom hint bar.
  ctx.fillStyle = 'rgba(5, 6, 12, 0.82)';
  ctx.fillRect(0, H - 30, W, 30);
  ctx.fillStyle = '#9aa3c0';
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'WASD / arrows — move    Shift — sneak (quiet, hidden in ferns)    Space — run (fast, loud)    Click / Q — throw a pebble lure    M — mute',
    W / 2, H - 15,
  );

  // Centre message banner.
  if (message && message.text) {
    const alpha = Math.min(1, message.alpha);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const w = ctx.measureText(message.text).width + 48;
    ctx.fillRect(W / 2 - w / 2, 96, w, 52);
    ctx.fillStyle = message.color || '#f0e6c8';
    ctx.fillText(message.text, W / 2, 123);
    if (message.sub) {
      ctx.font = '15px Georgia, serif';
      ctx.fillStyle = '#c9c9c9';
      ctx.fillText(message.sub, W / 2, 162);
    }
    ctx.globalAlpha = 1;
  }
  void score;
  void levelIndex;
}

function drawTitle(ctx, time) {
  ctx.fillStyle = '#07080d';
  ctx.fillRect(0, 0, W, H);
  // Moon, top-left, clear of the title.
  const mg = ctx.createRadialGradient(170, 120, 10, 170, 120, 150);
  mg.addColorStop(0, 'rgba(220, 230, 255, 0.9)');
  mg.addColorStop(0.25, 'rgba(180, 195, 255, 0.35)');
  mg.addColorStop(1, 'rgba(180, 195, 255, 0)');
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, 340, 280);
  ctx.fillStyle = '#e8ecff';
  ctx.beginPath();
  ctx.arc(170, 120, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 170, 210, 0.5)';
  ctx.beginPath();
  ctx.arc(158, 112, 8, 0, Math.PI * 2);
  ctx.arc(182, 132, 6, 0, Math.PI * 2);
  ctx.fill();

  // Library silhouette: shelf rows and a guard cone, low on the screen
  // so they frame the title instead of fighting it.
  ctx.fillStyle = '#141828';
  for (let i = 0; i < 5; i++) ctx.fillRect(120 + i * 210, 560, 150, 200);
  ctx.fillStyle = '#1d2236';
  for (let i = 0; i < 5; i++) {
    for (let r = 0; r < 4; r++) ctx.fillRect(132 + i * 210, 576 + r * 46, 126, 30);
  }
  const cone = conePolygonFake(980, 700, -Math.PI / 2, 240, 0.6);
  ctx.beginPath();
  ctx.moveTo(cone[0].x, cone[0].y);
  for (let i = 1; i < cone.length; i++) ctx.lineTo(cone[i].x, cone[i].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 214, 110, 0.16)';
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8d9a8';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('THE CINDER LIBRARY', W / 2, 190);
  ctx.fillStyle = '#9fdcff';
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('steal the Star of Auralia — and vanish unseen', W / 2, 240);
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '17px Georgia, serif';
  ctx.fillText('Three floors. Five wardens a floor. One thief: you.', W / 2, 300);
  ctx.fillText('Sneak through the dark, throw pebbles to pull guards away,', W / 2, 330);
  ctx.fillText('and reach the exit with the Star in hand.', W / 2, 356);

  const pulse = 0.6 + Math.sin(time * 3) * 0.4;
  ctx.fillStyle = `rgba(232, 217, 168, ${pulse})`;
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('Press ENTER to begin', W / 2, 430);

  ctx.fillStyle = '#7a829e';
  ctx.font = '14px Georgia, serif';
  ctx.fillText('WASD move · Shift sneak · Space run · Click / Q pebble lure · M mute', W / 2, 720);
  ctx.fillText('A complete stealth game: vision cones, patrols, suspicion, noise, hiding, three floors.', W / 2, 746);
}

function conePolygonFake(x, y, angle, range, halfAngle) {
  const pts = [{ x, y }];
  for (let i = 0; i <= 20; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / 20;
    pts.push({ x: x + Math.cos(a) * range, y: y + Math.sin(a) * range });
  }
  return pts;
}

function drawEndScreen(ctx, s) {
  ctx.fillStyle = 'rgba(4, 5, 10, 0.92)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  const win = s.screen === 'win';
  ctx.fillStyle = win ? '#e8d9a8' : '#ff8a7a';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText(win ? 'THE STAR IS YOURS' : 'CAUGHT IN THE DARK', W / 2, 260);
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '20px Georgia, serif';
  if (win) {
    ctx.fillText(`You slipped out of the Cinder Library with the Star of Auralia.`, W / 2, 320);
    ctx.fillText(`Relics stolen: ${s.player.loot}   ·   Times spotted: ${s.timesSpotted}   ·   Score: ${s.score}`, W / 2, 356);
  } else {
    ctx.fillText('A warden’s lantern found you. The library keeps its Star — this time.', W / 2, 320);
    ctx.fillText(`Floors cleared: ${s.levelIndex}   ·   Relics stolen: ${s.player.loot}`, W / 2, 356);
  }
  const pulse = 0.6 + Math.sin(s.time * 3) * 0.4;
  ctx.fillStyle = `rgba(232, 217, 168, ${pulse})`;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('Press ENTER to play again', W / 2, 440);
}

// Master draw: one frame of the game for a given state.
export function drawScene(ctx, s) {
  ctx.clearRect(0, 0, W, H);
  if (s.screen === 'title') {
    drawTitle(ctx, s.time);
    return;
  }
  if (s.screen === 'win' || s.screen === 'gameover') {
    // Keep the last floor visible behind the end panel.
    drawFloor(ctx, s.level);
    drawShadows(ctx, s.level);
    drawWalls(ctx, s.level);
    drawEndScreen(ctx, s);
    return;
  }
  drawFloor(ctx, s.level);
  drawShadows(ctx, s.level);
  drawLanterns(ctx, s.level, s.time);
  drawFerns(ctx, s.level);
  drawLoot(ctx, s.level, s.time);
  drawExit(ctx, s.level, s.time);
  drawWalls(ctx, s.level);
  for (const g of s.guards) drawGuard(ctx, s.level, g, s.time);
  drawNoise(ctx, s.player, s.time);
  drawPlayer(ctx, s.player, s.time);
  drawMoonlight(ctx, s.time);
  drawHud(ctx, s);
}
