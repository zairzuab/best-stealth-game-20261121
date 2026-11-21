// Guard AI: wardens of the library.
// States: patrol -> suspicious (walk to what they glimpsed) -> alerted (chase
// the thief) -> search (look around the last known spot) -> return (walk home).
// A guard that loses the thief calms down; a guard that catches the thief
// ends the attempt. Every state change is announced so the HUD and the
// sounds can react.

import { TILE } from './levels.js';
import { canSee, CONE_RANGE } from './vision.js';
import { findPath } from './pathfind.js';

export const GUARD_STATES = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALERTED: 'alerted',
  SEARCH: 'search',
  RETURN: 'return',
};

export function makeGuard(def, index) {
  const start = def.path[0];
  return {
    id: index,
    x: (start[0] + 0.5) * TILE,
    y: (start[1] + 0.5) * TILE,
    facing: 0,
    path: def.path.map(([c, r]) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE })),
    waypoint: 1 % def.path.length,
    speed: def.speed * TILE,
    pause: def.pause,
    pauseTimer: 0,
    scanPhase: Math.random() * Math.PI * 2,
    state: GUARD_STATES.PATROL,
    suspicion: 0, // 0..100, shared with the global alarm through the player
    lastSeen: null,
    searchTimer: 0,
    stateTimer: 0,
    moveTarget: null,
    route: null, // tile-centre path from findPath, walked point by point
    routeTarget: null,
    caughtPlayer: false,
  };
}

function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function turnToward(guard, targetAngle, rate, dt) {
  let diff = targetAngle - guard.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.facing += step;
  return Math.abs(diff) < 0.08;
}

// Plan a route to a pixel target through the aisles; returns true when a
// route exists (or the guard is already there).
function setRoute(guard, level, tx, ty) {
  const fromCol = Math.floor(guard.x / TILE);
  const fromRow = Math.floor(guard.y / TILE);
  const toCol = Math.floor(tx / TILE);
  const toRow = Math.floor(ty / TILE);
  const route = findPath(level, fromCol, fromRow, toCol, toRow);
  if (route === null) {
    guard.route = null;
    guard.routeTarget = null;
    return false;
  }
  guard.route = route;
  guard.routeTarget = { x: tx, y: ty };
  return true;
}

// Walk the planned route point by point. Returns true when the route is done.
function followRoute(guard, level, speed, dt) {
  if (!guard.route) return true;
  while (guard.route.length > 0) {
    const next = guard.route[0];
    const arrived = moveToward(guard, next, speed, dt, level);
    if (!arrived) return false;
    guard.route.shift();
  }
  guard.route = null;
  return true;
}

function moveToward(guard, target, speed, dt, level) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  // Slide along walls: try x then y separately.
  if (!hitsSolid(level, nx, guard.y)) guard.x = nx;
  if (!hitsSolid(level, guard.x, ny)) guard.y = ny;
  guard.facing = angleTo(guard, target);
  return dist - step < 4;
}

function hitsSolid(level, x, y) {
  const r = 13;
  const pts = [
    [x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r],
    [x, y - r], [x, y + r], [x - r, y], [x + r, y],
  ];
  for (const [px, py] of pts) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    const k = `${col},${row}`;
    if (level.walls.has(k) || level.shelves.has(k)) return true;
  }
  return false;
}

// One tick of one guard. Returns an event string ('spotted', 'lost', 'caught')
// or null. `events` collects bark text for the HUD log.
export function updateGuard(guard, level, player, dt, events) {
  guard.stateTimer += dt;
  const seesPlayer = player.alive && !player.hidden &&
    canSee(level, guard, player.x, player.y);

  // ---- perception: suspicion rises while the thief is seen, falls otherwise
  if (seesPlayer) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    const closeness = 1 - dist / (CONE_RANGE * 1.15);
    const speedFactor = player.sneaking ? 0.55 : player.running ? 1.6 : 1.0;
    const shadowFactor = player.inShadow ? 0.45 : 1.0;
    const rate = (26 + 70 * Math.max(0, closeness)) * speedFactor * shadowFactor;
    guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - 14 * dt);
  }

  // ---- state transitions
  const stateBefore = guard.state;
  if (guard.state === GUARD_STATES.PATROL || guard.state === GUARD_STATES.RETURN) {
    if (guard.suspicion >= 100) {
      guard.state = GUARD_STATES.ALERTED;
      guard.stateTimer = 0;
      events.push({ type: 'spotted', guard });
      return 'spotted';
    }
    if (guard.suspicion >= 42) {
      guard.state = GUARD_STATES.SUSPICIOUS;
      guard.stateTimer = 0;
      guard.moveTarget = guard.lastSeen ? { ...guard.lastSeen } : null;
      events.push({ type: 'suspicious', guard });
    }
  } else if (guard.state === GUARD_STATES.SUSPICIOUS) {
    if (guard.suspicion >= 100) {
      guard.state = GUARD_STATES.ALERTED;
      guard.stateTimer = 0;
      events.push({ type: 'spotted', guard });
      return 'spotted';
    }
    if (guard.suspicion <= 2 && guard.stateTimer > 1.2) {
      guard.state = GUARD_STATES.RETURN;
      guard.stateTimer = 0;
      events.push({ type: 'calmed', guard });
    }
  } else if (guard.state === GUARD_STATES.ALERTED) {
    if (guard.suspicion <= 0 && guard.stateTimer > 2.5) {
      guard.state = GUARD_STATES.SEARCH;
      guard.stateTimer = 0;
      guard.searchTimer = 3.5;
      events.push({ type: 'lost', guard });
      return 'lost';
    }
  } else if (guard.state === GUARD_STATES.SEARCH) {
    guard.searchTimer -= dt;
    if (guard.suspicion >= 100) {
      guard.state = GUARD_STATES.ALERTED;
      guard.stateTimer = 0;
      events.push({ type: 'spotted', guard });
      return 'spotted';
    }
    if (guard.searchTimer <= 0) {
      guard.state = GUARD_STATES.RETURN;
      guard.stateTimer = 0;
    }
  }

  // A new state means a new destination: drop any planned route.
  if (guard.state !== stateBefore) guard.route = null;

  // ---- movement per state
  if (guard.state === GUARD_STATES.PATROL) {
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      // Scan the room while waiting at a waypoint.
      guard.scanPhase += dt * 1.1;
      guard.facing += Math.sin(guard.scanPhase) * 0.9 * dt;
    } else {
      const target = guard.path[guard.waypoint];
      if (!guard.route) setRoute(guard, level, target.x, target.y);
      const done = followRoute(guard, level, guard.speed, dt);
      if (done) {
        guard.waypoint = (guard.waypoint + 1) % guard.path.length;
        guard.pauseTimer = guard.pause;
      }
    }
  } else if (guard.state === GUARD_STATES.SUSPICIOUS) {
    if (guard.moveTarget) {
      if (!guard.route) setRoute(guard, level, guard.moveTarget.x, guard.moveTarget.y);
      const done = followRoute(guard, level, guard.speed * 1.25, dt);
      if (done) {
        guard.moveTarget = null;
        guard.scanPhase = 0;
      }
    } else {
      guard.scanPhase += dt * 1.6;
      guard.facing += Math.sin(guard.scanPhase) * 1.4 * dt;
    }
  } else if (guard.state === GUARD_STATES.ALERTED) {
    const target = guard.lastSeen || { x: player.x, y: player.y };
    moveToward(guard, target, guard.speed * 1.85, dt, level);
    if (player.alive && Math.hypot(player.x - guard.x, player.y - guard.y) < 24) {
      guard.caughtPlayer = true;
      events.push({ type: 'caught', guard });
      return 'caught';
    }
  } else if (guard.state === GUARD_STATES.SEARCH) {
    // Sweep the area around the last known position.
    guard.scanPhase += dt * 2.2;
    guard.facing += Math.sin(guard.scanPhase) * 1.8 * dt;
    if (guard.lastSeen) {
      const d = Math.hypot(guard.lastSeen.x - guard.x, guard.lastSeen.y - guard.y);
      if (d > 60) {
        if (!guard.route) setRoute(guard, level, guard.lastSeen.x, guard.lastSeen.y);
        followRoute(guard, level, guard.speed * 1.1, dt);
      }
    }
  } else if (guard.state === GUARD_STATES.RETURN) {
    const home = guard.path[0];
    if (!guard.route) setRoute(guard, level, home.x, home.y);
    const done = followRoute(guard, level, guard.speed * 1.2, dt);
    if (done) {
      guard.state = GUARD_STATES.PATROL;
      guard.waypoint = 1 % guard.path.length;
      guard.pauseTimer = 0.6;
      guard.suspicion = 0;
    }
  }
  return null;
}

// The highest suspicion among all guards: the global alarm level 0..100.
export function alarmLevel(guards) {
  let max = 0;
  for (const g of guards) max = Math.max(max, g.suspicion);
  return max;
}

// Is any guard currently chasing the thief?
export function anyAlerted(guards) {
  return guards.some((g) => g.state === GUARD_STATES.ALERTED);
}
