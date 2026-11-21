// Vision: line of sight and vision cones.
// A guard sees the player only when the player is inside the cone AND no wall
// or shelf stands between them. Sight is tested with a grid raycast (DDA)
// over the tile map, so cones stop cleanly at bookshelves and walls.

import { TILE, COLS, ROWS, isSolid } from './levels.js';

export const CONE_RANGE = 230;
export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side

// DDA raycast: true when the segment from (x0,y0) to (x1,y1) crosses no solid tile.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const steps = Math.ceil(dist / (TILE / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
    if (isSolid(level, col, row)) return false;
  }
  return true;
}

// Distance from a point to the nearest solid tile along a ray, capped at maxDist.
export function rayDistance(level, x, y, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const step = TILE / 4;
  let d = step;
  while (d < maxDist) {
    const px = x + dx * d;
    const py = y + dy * d;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return d;
    if (isSolid(level, col, row)) return d;
    d += step;
  }
  return maxDist;
}

// The visible cone polygon: the guard plus a fan of ray endpoints.
export function conePolygon(level, x, y, angle, range, halfAngle) {
  const points = [{ x, y }];
  const rays = 26;
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = rayDistance(level, x, y, a, range);
    points.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return points;
}

// Is the target inside the guard's cone (angle + range), ignoring walls?
export function inCone(guard, tx, ty, range = CONE_RANGE, halfAngle = CONE_HALF_ANGLE) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 14) return true; // bumping into a guard is always seen
  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - guard.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfAngle;
}

// Full visibility test: cone + line of sight.
export function canSee(level, guard, tx, ty, range, halfAngle) {
  if (!inCone(guard, tx, ty, range, halfAngle)) return false;
  return hasLineOfSight(level, guard.x, guard.y, tx, ty);
}
