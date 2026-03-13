// Medieval GTA 3D – Horse mounting, dismounting, stealing, AI
import type { GTA3DState, Horse3D, Vec3 } from '../state/GTA3DState';
import { GTA3D } from '../config/GTA3DConfig';
import { increaseWanted3D, addNotification3D } from './GTA3DCombatSystem';

/* ── Helpers ─────────────────────────────────────── */

function dist3D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: 0, z: v.z / len };
}

function collidesBuilding(state: GTA3DState, px: number, pz: number, radius: number): boolean {
  for (const b of state.buildings) {
    if (!b.blocksMovement) continue;
    const halfW = b.size.x / 2;
    const halfD = b.size.z / 2;
    const closestX = clamp(px, b.pos.x - halfW, b.pos.x + halfW);
    const closestZ = clamp(pz, b.pos.z - halfD, b.pos.z + halfD);
    const dx = px - closestX;
    const dz = pz - closestZ;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

/* ── Track E/F press edges ───────────────────────── */
let prevE = false;
let prevF = false;

/* ── Main update ─────────────────────────────────── */

export function updateHorses3D(state: GTA3DState, dt: number): void {
  if (state.paused || state.gameOver) return;
  const p = state.player;

  const eDown = state.keys.has('e') || state.keys.has('E');
  const fDown = state.keys.has('f') || state.keys.has('F');
  const ePressed = eDown && !prevE;
  const fPressed = fDown && !prevF;
  prevE = eDown;
  prevF = fDown;

  // ── Mount / Dismount with E ──
  if (ePressed && p.state !== 'dead') {
    if (p.onHorse && p.mountedHorseId) {
      // Dismount
      const horse = state.horses.get(p.mountedHorseId);
      if (horse) {
        horse.state = 'free';
        horse.vel = { x: 0, y: 0, z: 0 };
      }
      p.onHorse = false;
      p.mountedHorseId = null;
      p.state = 'idle';
      addNotification3D(state, 'Dismounted', 0xaaaaaa);
    } else if (!p.onHorse) {
      // Find nearest free horse in mount range
      let nearest: Horse3D | null = null;
      let nearestDist = Infinity;

      state.horses.forEach((horse) => {
        if (horse.state !== 'free' && horse.state !== 'tied') return;
        const d = dist3D(p.pos, horse.pos);
        if (d < GTA3D.HORSE_MOUNT_RANGE && d < nearestDist) {
          nearest = horse;
          nearestDist = d;
        }
      });

      if (nearest) {
        const h = nearest as Horse3D;
        h.state = 'ridden_by_player';
        p.onHorse = true;
        p.mountedHorseId = h.id;
        p.pos.x = h.pos.x;
        p.pos.z = h.pos.z;
        p.state = 'on_horse_idle';
        addNotification3D(state, 'Mounted horse', 0x88cc88);
      }
    }
  }

  // ── Steal horse with F ──
  if (fPressed && !p.onHorse && p.state !== 'dead' && p.stealCooldown <= 0) {
    let nearest: Horse3D | null = null;
    let nearestDist = Infinity;

    state.horses.forEach((horse) => {
      if (horse.state !== 'ridden_by_npc') return;
      const d = dist3D(p.pos, horse.pos);
      if (d < GTA3D.HORSE_STEAL_RANGE && d < nearestDist) {
        nearest = horse;
        nearestDist = d;
      }
    });

    if (nearest) {
      const h = nearest as Horse3D;
      h.state = 'ridden_by_player';
      p.onHorse = true;
      p.mountedHorseId = h.id;
      p.pos.x = h.pos.x;
      p.pos.z = h.pos.z;
      p.state = 'on_horse_idle';
      p.stealCooldown = 2;
      increaseWanted3D(state, 1);
      addNotification3D(state, 'Horse stolen!', 0xff6644);
    }
  }

  // ── Update each horse ──
  state.horses.forEach((horse) => {
    if (horse.state === 'ridden_by_player') {
      // Horse follows player exactly
      horse.pos.x = p.pos.x;
      horse.pos.y = 0;
      horse.pos.z = p.pos.z;
      horse.rotation = p.rotation;
      horse.vel = { x: p.vel.x, y: 0, z: p.vel.z };
    } else if (horse.state === 'free') {
      // Free horses wander near basePos
      updateFreeHorse(state, horse, dt);
    }
    // 'tied' and 'ridden_by_npc' horses stay put or are controlled by NPC (not implemented here)
  });
}

function updateFreeHorse(state: GTA3DState, horse: Horse3D, dt: number): void {
  const distToBase = dist3D(horse.pos, horse.basePos);
  const half = state.worldSize / 2;
  const radius = 0.6;

  // Wander back towards base if too far
  if (distToBase > 10) {
    const dir = normalize({
      x: horse.basePos.x - horse.pos.x,
      y: 0,
      z: horse.basePos.z - horse.pos.z,
    });
    horse.vel.x = dir.x * 2.0;
    horse.vel.z = dir.z * 2.0;
    horse.rotation = Math.atan2(dir.x, -dir.z);
  } else {
    // Slow random drift
    horse.vel.x *= 0.95;
    horse.vel.z *= 0.95;
    if (Math.random() < 0.01) {
      const angle = Math.random() * Math.PI * 2;
      horse.vel.x = Math.cos(angle) * 0.8;
      horse.vel.z = Math.sin(angle) * 0.8;
      horse.rotation = Math.atan2(horse.vel.x, -horse.vel.z);
    }
  }

  let newX = horse.pos.x + horse.vel.x * dt;
  let newZ = horse.pos.z + horse.vel.z * dt;

  // Building collision
  if (collidesBuilding(state, newX, horse.pos.z, radius)) {
    newX = horse.pos.x;
    horse.vel.x = -horse.vel.x * 0.5;
  }
  if (collidesBuilding(state, newX, newZ, radius)) {
    newZ = horse.pos.z;
    horse.vel.z = -horse.vel.z * 0.5;
  }

  // World bounds
  newX = clamp(newX, -half + radius, half - radius);
  newZ = clamp(newZ, -half + radius, half - radius);

  horse.pos.x = newX;
  horse.pos.z = newZ;
  horse.pos.y = 0;
}
