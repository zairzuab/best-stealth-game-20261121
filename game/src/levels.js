// Level data for The Cinder Library.
// Every map is a 32 x 20 grid of tiles, one character per tile:
//   # wall (blocks sight and movement)   . stone floor   , rug (floor)
//   S shadow pool (dark: you are hard to see)   B fern (hide inside while sneaking)
//   K bookshelf (solid cover)   C crate / table (solid cover)
//   L small relic (bonus loot)   * the Star relic (steal it to open the exit)
//   T lantern (warm light pool)   X exit door   P player start
// Guards patrol the waypoint lists; they pause and scan at each waypoint.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;

function normalizeMap(rows) {
  return rows.map((row) => {
    if (row.length < COLS) return row + '#'.repeat(COLS - row.length);
    return row.slice(0, COLS);
  });
}

export const LEVELS = [
  {
    name: 'I — The Reading Room',
    hint: 'Steal the Star of Auralia, then slip out the east door.',
    map: normalizeMap([
      '################################',
      '#P....S.....K....L....K........#',
      '#.........KKK.........KK.......#',
      '#..C......K....S......K...L....#',
      '#..C......K...........K........#',
      '#.........KKK....C....KK.......#',
      '#..S..........L......S.........#',
      '#....K....C.......K.......C....#',
      '#....K...........K.......C....#',
      '#..L.....S....K.....L..........#',
      '#....K.......K....S....K.......#',
      '#....K...C...K........K...L....#',
      '#.........KKK....C....KK.......#',
      '#..S......K...........K........#',
      '#....K....K....L......K...C....#',
      '#....K....K...........K...C....#',
      '#..L.......S......K............#',
      '#......K.........K......S....X.#',
      '#......K....L....K.....B.......#',
      '################################',
    ]),
    star: { col: 16, row: 9 },
    guards: [
      { col: 9, row: 3, path: [[9, 3], [9, 15], [20, 15], [20, 3]], speed: 1.6, pause: 1.4 },
      { col: 24, row: 6, path: [[24, 6], [24, 16], [28, 16], [28, 6]], speed: 1.5, pause: 1.0 },
      { col: 5, row: 12, path: [[5, 12], [5, 17], [14, 17], [14, 12]], speed: 1.4, pause: 1.2 },
    ],
    lanterns: [[4, 2], [16, 2], [27, 2], [9, 10], [21, 10], [12, 17], [26, 15]],
  },
  {
    name: 'II — The Stacks',
    hint: 'The aisles are long and the wardens walk them. Stay in the dark.',
    map: normalizeMap([
      '################################',
      '#P...K......K......K......L....#',
      '#....K..S...K..L...K..S...K....#',
      '#....K......K......K......K....#',
      '#.L..KKK....KKK....KKK....K....#',
      '#....K......K......K......K....#',
      '#.S..K..C...K..S...K..C...K..L.#',
      '#....K......K......K......K....#',
      '#....KKK....KKK....KKK....K....#',
      '#....K......K......K......K....#',
      '#.L..K..S...K..L...K..S...K....#',
      '#....K......K......K......K....#',
      '#....KKK....KKK....KKK....KK...#',
      '#....K......K......K......K....#',
      '#.S..K..C...K..S...K..C...K..L.#',
      '#....K......K......K......K....#',
      '#....KKK....KKK....KKK....K....#',
      '#....K......K..L...K......K..X.#',
      '#..L.....B.....S......K........#',
      '################################',
    ]),
    star: { col: 16, row: 9 },
    guards: [
      { col: 8, row: 2, path: [[8, 2], [8, 17], [11, 17], [11, 2]], speed: 1.8, pause: 1.0 },
      { col: 22, row: 4, path: [[22, 4], [22, 16], [24, 16], [24, 4]], speed: 1.7, pause: 1.2 },
      { col: 15, row: 8, path: [[15, 8], [25, 8], [25, 12], [15, 12]], speed: 1.6, pause: 1.5 },
      { col: 4, row: 14, path: [[4, 14], [4, 18], [9, 18], [9, 14]], speed: 1.5, pause: 1.0 },
    ],
    lanterns: [[6, 2], [14, 6], [22, 2], [10, 10], [18, 14], [26, 10], [7, 17]],
  },
  {
    name: 'III — The Vault of Embers',
    hint: 'Five wardens guard the Star. One pebble at a time.',
    map: normalizeMap([
      '################################',
      '#P....K.....S.....K......L.....#',
      '#.....K...........K............#',
      '#..L..KKK...C....KKK....K..L...#',
      '#.....K...........K....K.......#',
      '#..S..K..L...S...K....K...S....#',
      '#.....K.......K...K....K.......#',
      '#..C..KKK...K.K...KKK..K..C....#',
      '#.....K.......K...K....K.......#',
      '#..L..K...S...K...K..L.K...L...#',
      '#.....K.......K...K....K.......#',
      '#..S..KKK...C....KKK...K..S....#',
      '#.....K...........K....K.......#',
      '#..C..K..L...S...K....K...C....#',
      '#.....K.......K...K....K.......#',
      '#..L..KKK....K....KKK..K...L...#',
      '#.....K...........K....K.......#',
      '#..S......B....L......K....S.X.#',
      '#..............................#',
      '################################',
    ]),
    star: { col: 16, row: 10 },
    guards: [
      { col: 9, row: 3, path: [[9, 3], [9, 16], [13, 16], [13, 3]], speed: 1.9, pause: 0.9 },
      { col: 22, row: 3, path: [[22, 3], [22, 16], [26, 16], [26, 3]], speed: 1.9, pause: 0.9 },
      { col: 16, row: 6, path: [[16, 6], [7, 6], [7, 13], [16, 13]], speed: 1.7, pause: 1.3 },
      { col: 5, row: 9, path: [[5, 9], [5, 17], [11, 17], [11, 9]], speed: 1.6, pause: 1.1 },
      { col: 27, row: 9, path: [[27, 9], [27, 17], [21, 17], [21, 9]], speed: 1.6, pause: 1.1 },
    ],
    lanterns: [[8, 2], [16, 2], [24, 2], [12, 9], [20, 9], [8, 15], [24, 15], [16, 17]],
  },
];

// Parse a level definition into runtime structures.
export function parseLevel(def) {
  const walls = new Set();
  const shelves = new Set();
  const shadows = new Set();
  const ferns = new Set();
  const loot = [];
  let playerStart = { x: 60, y: 60 };
  let exit = { col: 30, row: 18 };
  const key = (c, r) => `${c},${r}`;

  def.map.forEach((row, r) => {
    for (let c = 0; c < COLS; c++) {
      const ch = row[c];
      if (ch === '#') walls.add(key(c, r));
      else if (ch === 'K' || ch === 'C') shelves.add(key(c, r));
      else if (ch === 'S') shadows.add(key(c, r));
      else if (ch === 'B') ferns.add(key(c, r));
      else if (ch === 'L') loot.push({ col: c, row: r, taken: false });
      else if (ch === 'P') playerStart = { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
      else if (ch === 'X') exit = { col: c, row: r };
    }
  });

  return {
    def,
    walls,
    shelves,
    shadows,
    ferns,
    loot,
    playerStart,
    exit,
    star: { col: def.star.col, row: def.star.row, taken: false },
    lanterns: def.lanterns.map(([c, r]) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE })),
  };
}

export function isSolid(level, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  const k = `${col},${row}`;
  return level.walls.has(k) || level.shelves.has(k);
}

export function tileAt(level, x, y) {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return level.def.map[row][col];
}
