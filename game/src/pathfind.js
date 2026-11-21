// Pathfinding: breadth-first search over the tile grid.
// Wardens follow the aisles instead of walking into bookshelves: given a
// start tile and a target tile, this returns the list of tile centres to
// walk through, or null when no route exists.

import { TILE, COLS, ROWS, isSolid } from './levels.js';

export function findPath(level, fromCol, fromRow, toCol, toRow) {
  if (isSolid(level, toCol, toRow)) return null;
  if (fromCol === toCol && fromRow === toRow) return [];
  const key = (c, r) => `${c},${r}`;
  const prev = new Map();
  const queue = [[fromCol, fromRow]];
  prev.set(key(fromCol, fromRow), null);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (queue.length > 0) {
    const [c, r] = queue.shift();
    if (c === toCol && r === toRow) break;
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      if (isSolid(level, nc, nr)) continue;
      const k = key(nc, nr);
      if (prev.has(k)) continue;
      prev.set(k, [c, r]);
      queue.push([nc, nr]);
    }
  }

  const targetKey = key(toCol, toRow);
  if (!prev.has(targetKey)) return null;
  const tiles = [];
  let cur = [toCol, toRow];
  while (cur) {
    tiles.push(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  tiles.reverse();
  // Drop the starting tile: the guard is already standing on it.
  tiles.shift();
  return tiles.map(([c, r]) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE }));
}
