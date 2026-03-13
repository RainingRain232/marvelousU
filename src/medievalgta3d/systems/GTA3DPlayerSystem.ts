// Medieval GTA 3D – Player movement, input, collision
import type { GTA3DState } from '../state/GTA3DState';
import { GTA3D } from '../config/GTA3DConfig';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
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

export function updatePlayer3D(state: GTA3DState, dt: number): void {
  if (state.paused || state.gameOver) return;
  const p = state.player;
  if (p.state === 'dead') return;

  // Timers
  if (p.attackCooldown > 0) p.attackCooldown -= dt;
  if (p.attackTimer > 0) p.attackTimer -= dt;
  if (p.blockTimer > 0) p.blockTimer -= dt;
  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.dialogCooldown > 0) p.dialogCooldown -= dt;
  if (p.stealCooldown > 0) p.stealCooldown -= dt;
  if (p.killStreakTimer > 0) {
    p.killStreakTimer -= dt;
    if (p.killStreakTimer <= 0) p.killStreak = 0;
  }

  // Wanted decay
  if (p.wantedLevel > 0) {
    p.wantedDecayTimer -= dt;
    if (p.wantedDecayTimer <= 0) {
      p.wantedLevel--;
      p.wantedDecayTimer = GTA3D.WANTED_DECAY_TIME;
    }
  }

  // Dodge roll
  if (p.rollTimer > 0) {
    p.rollTimer -= dt;
    p.state = 'rolling';
    p.invincibleTimer = Math.max(p.invincibleTimer, 0.05);
    p.vel.x = p.rollDir.x * GTA3D.ROLL_SPEED;
    p.vel.z = p.rollDir.z * GTA3D.ROLL_SPEED;
    applyMovement(state, dt);
    return;
  }

  // Blocking
  if (state.rightMouseDown && !p.onHorse && p.attackTimer <= 0) {
    p.state = 'blocking';
    p.blockTimer = 0.1;
    p.vel.x = 0;
    p.vel.z = 0;
    applyMovement(state, dt);
    return;
  }

  // Attack initiation
  if (state.mouseDown && p.attackCooldown <= 0 && p.attackTimer <= 0 && !p.onHorse) {
    p.state = 'attacking';
    const cd = getWeaponCooldown(p.weapon);
    p.attackCooldown = cd;
    p.attackTimer = cd * 0.4; // attack active window
    // Stamina drain for attack
    p.stamina = Math.max(0, p.stamina - 5);
  }

  if (p.attackTimer > 0) {
    p.state = 'attacking';
    p.vel.x = 0;
    p.vel.z = 0;
    applyMovement(state, dt);
    return;
  }

  // Weapon switching (keys 1-7)
  const weaponKeys = ['1', '2', '3', '4', '5', '6', '7'];
  for (let i = 0; i < weaponKeys.length; i++) {
    if (state.keys.has(weaponKeys[i]) && i < p.weapons.length) {
      p.weaponIndex = i;
      p.weapon = p.weapons[i];
    }
  }

  // Movement input
  let mx = 0;
  let mz = 0;
  if (state.keys.has('w') || state.keys.has('W')) mz -= 1;
  if (state.keys.has('s') || state.keys.has('S')) mz += 1;
  if (state.keys.has('a') || state.keys.has('A')) mx -= 1;
  if (state.keys.has('d') || state.keys.has('D')) mx += 1;

  const moving = mx !== 0 || mz !== 0;
  const sprinting = state.keys.has('Shift') && p.stamina > 0;

  // Determine speed
  let speed: number;
  if (p.onHorse) {
    speed = moving ? GTA3D.HORSE_SPEED : 0;
  } else {
    speed = moving ? (sprinting ? GTA3D.RUN_SPEED : GTA3D.WALK_SPEED) : 0;
  }

  // Normalize direction
  if (moving) {
    const len = Math.sqrt(mx * mx + mz * mz);
    mx /= len;
    mz /= len;
    // Update facing rotation based on movement direction
    p.rotation = Math.atan2(mx, -mz);
  }

  p.vel.x = mx * speed;
  p.vel.z = mz * speed;

  // Stamina
  if (sprinting && moving && !p.onHorse) {
    p.stamina = Math.max(0, p.stamina - GTA3D.STAMINA_DRAIN * dt);
  } else {
    p.stamina = Math.min(GTA3D.STAMINA_MAX, p.stamina + p.staminaRegen * dt);
  }

  // Dodge roll initiation (Space)
  if (state.keys.has(' ') && moving && p.rollTimer <= 0 && !p.onHorse && p.stamina >= 15) {
    p.rollTimer = GTA3D.ROLL_DURATION;
    p.rollDir = { x: mx, y: 0, z: mz };
    p.stamina -= 15;
    p.state = 'rolling';
    return;
  }

  // Update state label
  if (p.onHorse) {
    p.state = moving ? 'on_horse_moving' : 'on_horse_idle';
  } else if (moving) {
    p.state = sprinting ? 'running' : 'walking';
  } else {
    p.state = 'idle';
  }

  applyMovement(state, dt);

  // Camera target
  state.cameraTargetX = p.pos.x;
  state.cameraTargetZ = p.pos.z;
  state.cameraX += (state.cameraTargetX - state.cameraX) * GTA3D.CAMERA_LERP;
  state.cameraZ += (state.cameraTargetZ - state.cameraZ) * GTA3D.CAMERA_LERP;
}

function applyMovement(state: GTA3DState, dt: number): void {
  const p = state.player;
  const half = state.worldSize / 2;
  const radius = 0.4;

  let newX = p.pos.x + p.vel.x * dt;
  let newZ = p.pos.z + p.vel.z * dt;

  // Building collision – try axes independently
  if (collidesBuilding(state, newX, p.pos.z, radius)) {
    newX = p.pos.x;
    p.vel.x = 0;
  }
  if (collidesBuilding(state, newX, newZ, radius)) {
    newZ = p.pos.z;
    p.vel.z = 0;
  }

  // World bounds
  newX = clamp(newX, -half + radius, half - radius);
  newZ = clamp(newZ, -half + radius, half - radius);

  p.pos.x = newX;
  p.pos.z = newZ;
  p.pos.y = 0;
}

function getWeaponCooldown(w: string): number {
  switch (w) {
    case 'fists': return GTA3D.ATTACK_COOLDOWN_FIST;
    case 'sword': return GTA3D.ATTACK_COOLDOWN_SWORD;
    case 'axe': return GTA3D.ATTACK_COOLDOWN_AXE;
    case 'mace': return GTA3D.ATTACK_COOLDOWN_MACE;
    case 'spear': return GTA3D.ATTACK_COOLDOWN_SPEAR;
    case 'bow': return GTA3D.ATTACK_COOLDOWN_BOW;
    case 'crossbow': return GTA3D.ATTACK_COOLDOWN_CROSSBOW;
    default: return 0.5;
  }
}
