// GTAHorseSystem.ts – Horse management, mounting/dismounting. No PixiJS.
import type { MedievalGTAState, GTAHorse, GTABuilding } from '../state/MedievalGTAState';
import { GTAConfig } from '../config/MedievalGTAConfig';
import { increaseWanted } from './GTAWantedSystem';
import { addNotification } from './GTACombatSystem';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function circleOverlapsRect(
  cx: number, cy: number, r: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  const nearX = clamp(cx, bx, bx + bw);
  const nearY = clamp(cy, by, by + bh);
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}

function resolveHorseBuilding(horse: GTAHorse, b: GTABuilding): void {
  const r = 14; // horse collision radius
  if (!circleOverlapsRect(horse.pos.x, horse.pos.y, r, b.x, b.y, b.w, b.h)) return;

  const overlapLeft  = (horse.pos.x + r) - b.x;
  const overlapRight = (b.x + b.w) - (horse.pos.x - r);
  const overlapTop   = (horse.pos.y + r) - b.y;
  const overlapBot   = (b.y + b.h) - (horse.pos.y - r);

  const minX = overlapLeft < overlapRight ? overlapLeft : overlapRight;
  const minY = overlapTop  < overlapBot   ? overlapTop  : overlapBot;

  if (minX < minY) {
    if (overlapLeft < overlapRight) {
      horse.pos.x -= overlapLeft;
    } else {
      horse.pos.x += overlapRight;
    }
    horse.vel.x = 0;
  } else {
    if (overlapTop < overlapBot) {
      horse.pos.y -= overlapTop;
    } else {
      horse.pos.y += overlapBot;
    }
    horse.vel.y = 0;
  }
}

function facingDir(dx: number, dy: number): 'n' | 's' | 'e' | 'w' {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'e' : 'w';
  return dy >= 0 ? 's' : 'n';
}

// ─── Find nearest horse helper ──────────────────────────────────────────────

function findNearestHorse(
  state: MedievalGTAState,
  x: number,
  y: number,
  maxDist: number,
  filter?: (h: GTAHorse) => boolean,
): GTAHorse | null {
  let best: GTAHorse | null = null;
  let bestDist = maxDist;
  for (const [, horse] of state.horses) {
    if (filter && !filter(horse)) continue;
    const d = dist(horse.pos.x, horse.pos.y, x, y);
    if (d < bestDist) {
      bestDist = d;
      best = horse;
    }
  }
  return best;
}

// ─── Mount / Dismount ───────────────────────────────────────────────────────

function mountHorse(state: MedievalGTAState, horse: GTAHorse): void {
  const p = state.player;
  p.onHorse = true;
  p.mountedHorseId = horse.id;
  horse.state = 'ridden_by_player';
  horse.pos.x = p.pos.x;
  horse.pos.y = p.pos.y;
  horse.vel.x = 0;
  horse.vel.y = 0;
  p.state = 'on_horse_idle';
  addNotification(state, 'Mounted horse', 0x88cc88);
}

function dismountHorse(state: MedievalGTAState): void {
  const p = state.player;
  if (!p.mountedHorseId) return;

  const horse = state.horses.get(p.mountedHorseId);
  if (horse) {
    horse.state = 'free';
    horse.basePos = { x: horse.pos.x, y: horse.pos.y };
    horse.vel.x = 0;
    horse.vel.y = 0;
  }

  p.onHorse = false;
  p.mountedHorseId = null;
  p.state = 'idle';
  addNotification(state, 'Dismounted', 0xaaaaaa);
}

// ─── Main export ────────────────────────────────────────────────────────────

export function updateHorses(state: MedievalGTAState, dt: number): void {
  if (state.paused || state.gameOver) return;

  const p = state.player;

  // ── Handle E key: mount/dismount ────────────────────────────────────────
  const ePressed = state.interactKey && !state.lastInteractKey;

  if (ePressed && p.state !== 'dead' && p.dialogCooldown <= 0) {
    if (p.onHorse) {
      // Dismount
      dismountHorse(state);
      p.dialogCooldown = 0.3; // prevent rapid toggling
    } else {
      // Try to mount a nearby free or tied horse
      const nearby = findNearestHorse(
        state, p.pos.x, p.pos.y,
        GTAConfig.HORSE_STEAL_RANGE,
        (h) => h.state === 'free' || h.state === 'tied',
      );
      if (nearby) {
        mountHorse(state, nearby);
        p.dialogCooldown = 0.3;
      }
    }
  }

  // ── Handle F key: steal horse ──────────────────────────────────────────
  if (state.keys.has('f') && !p.onHorse && p.state !== 'dead' && p.stealAnimTimer <= 0) {
    const tied = findNearestHorse(
      state, p.pos.x, p.pos.y,
      GTAConfig.HORSE_STEAL_RANGE,
      (h) => h.state === 'tied',
    );
    if (tied) {
      mountHorse(state, tied);
      increaseWanted(state, 1);
      addNotification(state, 'Horse stolen! +1 Star', 0xff8800);
      p.stealAnimTimer = 1.0; // cooldown to prevent instant re-steal
    }
  }

  // ── Update each horse ─────────────────────────────────────────────────
  for (const [, horse] of state.horses) {
    switch (horse.state) {
      case 'ridden_by_player': {
        // Follow player exactly
        horse.pos.x = p.pos.x;
        horse.pos.y = p.pos.y;
        horse.vel.x = p.vel.x;
        horse.vel.y = p.vel.y;
        horse.facing = p.facing;
        horse.facingDir = p.facingDir;
        break;
      }

      case 'tied': {
        // Stay at base position exactly
        horse.pos.x = horse.basePos.x;
        horse.pos.y = horse.basePos.y;
        horse.vel.x = 0;
        horse.vel.y = 0;
        break;
      }

      case 'free': {
        // Idle wandering near basePos
        const dToBase = dist(horse.pos.x, horse.pos.y, horse.basePos.x, horse.basePos.y);

        if (dToBase > 80) {
          // Drift back toward base position
          const dx = horse.basePos.x - horse.pos.x;
          const dy = horse.basePos.y - horse.pos.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0.01) {
            const wanderSpeed = 30;
            horse.vel.x += (dx / len) * wanderSpeed * dt * 3;
            horse.vel.y += (dy / len) * wanderSpeed * dt * 3;
          }
        } else {
          // Small random movement
          if (Math.random() < dt * 0.3) {
            const angle = Math.random() * Math.PI * 2;
            const nudge = 15 + Math.random() * 20;
            horse.vel.x += Math.cos(angle) * nudge;
            horse.vel.y += Math.sin(angle) * nudge;
          }
        }

        // Friction
        horse.vel.x *= 0.92;
        horse.vel.y *= 0.92;

        // Cap speed
        const spd = Math.sqrt(horse.vel.x * horse.vel.x + horse.vel.y * horse.vel.y);
        const maxWanderSpeed = 50;
        if (spd > maxWanderSpeed) {
          horse.vel.x = (horse.vel.x / spd) * maxWanderSpeed;
          horse.vel.y = (horse.vel.y / spd) * maxWanderSpeed;
        }

        // Apply velocity
        horse.pos.x += horse.vel.x * dt;
        horse.pos.y += horse.vel.y * dt;

        // Update facing
        if (Math.abs(horse.vel.x) > 1 || Math.abs(horse.vel.y) > 1) {
          horse.facing = Math.atan2(horse.vel.y, horse.vel.x);
          horse.facingDir = facingDir(horse.vel.x, horse.vel.y);
        }

        // Building collision
        for (const b of state.buildings) {
          resolveHorseBuilding(horse, b);
        }

        // World bounds
        horse.pos.x = clamp(horse.pos.x, 14, state.worldWidth - 14);
        horse.pos.y = clamp(horse.pos.y, 14, state.worldHeight - 14);
        break;
      }

      case 'ridden_by_npc': {
        // NPC-ridden horses are driven by the NPC system; just apply velocity
        horse.pos.x += horse.vel.x * dt;
        horse.pos.y += horse.vel.y * dt;
        horse.vel.x *= 0.9;
        horse.vel.y *= 0.9;

        if (Math.abs(horse.vel.x) > 1 || Math.abs(horse.vel.y) > 1) {
          horse.facing = Math.atan2(horse.vel.y, horse.vel.x);
          horse.facingDir = facingDir(horse.vel.x, horse.vel.y);
        }

        for (const b of state.buildings) {
          resolveHorseBuilding(horse, b);
        }

        horse.pos.x = clamp(horse.pos.x, 14, state.worldWidth - 14);
        horse.pos.y = clamp(horse.pos.y, 14, state.worldHeight - 14);
        break;
      }

      default: {
        break;
      }
    }
  }
}
