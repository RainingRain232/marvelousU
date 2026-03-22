// ---------------------------------------------------------------------------
// Shadowhand mode — thief movement, actions & abilities (improved)
// ---------------------------------------------------------------------------

import type { HeistState, ThiefUnit, HeistMap } from "../state/ShadowhandState";
import type { CrewMember } from "../config/CrewDefs";
import { CREW_ARCHETYPES } from "../config/CrewDefs";
import { ShadowhandConfig } from "../config/ShadowhandConfig";
import { emitWalkNoise, emitActionNoise } from "./NoiseSystem";
import { findPath, getNextWaypoint } from "./Pathfinding";

export function createThiefUnit(crew: CrewMember, x: number, y: number): ThiefUnit {
  const arch = CREW_ARCHETYPES[crew.role];
  return {
    id: crew.id,
    crewMemberId: crew.id,
    x, y,
    targetX: x,
    targetY: y,
    moving: false,
    crouching: false,
    speed: ShadowhandConfig.CREW_BASE_SPEED * arch.speed / ShadowhandConfig.TILE_SIZE,
    noiseLevel: 0,
    visible: false,
    disguised: false,
    disguiseTimer: 0,
    shadowMeld: false,
    shadowMeldTimer: 0,
    selected: false,
    carryingLoot: [],
    hp: crew.hp,
    maxHp: crew.maxHp,
    alive: true,
    captured: false,
    escaped: false,
    role: crew.role,
    abilities: [...arch.abilities],
    activePath: [],
    detectionLevel: 0,
    nearestGuardDist: 999,
    inShadow: false,
    injured: false,
    injuryPenalty: 0,
  };
}

export function moveThiefTo(heist: HeistState, thiefId: string, tx: number, ty: number): void {
  const thief = heist.thieves.find(t => t.id === thiefId);
  if (!thief || !thief.alive || thief.captured || thief.escaped) return;

  // Calculate A* path to target
  const path = findPath(heist.map, thief.x, thief.y, tx, ty, false, 400);
  thief.activePath = path;
  thief.targetX = tx;
  thief.targetY = ty;
  thief.moving = path.length > 0;
}

export function updateThiefMovement(heist: HeistState, dt: number): void {
  for (const thief of heist.thieves) {
    if (!thief.alive || thief.captured || thief.escaped) continue;

    // Update disguise timer
    if (thief.disguiseTimer > 0) {
      thief.disguiseTimer -= dt;
      if (thief.disguiseTimer <= 0) {
        thief.disguised = false;
        thief.disguiseTimer = 0;
      }
    }

    // Follow A* path
    if (thief.activePath.length > 0) {
      const wp = getNextWaypoint(thief.activePath, thief.x, thief.y, 0.4);
      if (wp) {
        const dx = wp.x - thief.x;
        const dy = wp.y - thief.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) {
          thief.moving = true;
          let speed = thief.speed * (1 - thief.injuryPenalty);
          if (thief.crouching) speed *= ShadowhandConfig.CROUCHING_SPEED_MULT;

          const step = Math.min(speed * dt, dist);
          thief.x += (dx / dist) * step;
          thief.y += (dy / dist) * step;
        }
      } else {
        // Path complete
        thief.activePath = [];
        thief.moving = false;
        thief.noiseLevel = 0;
      }
    } else {
      thief.moving = false;
      thief.noiseLevel = 0;
    }

    // Emit noise based on role
    if (thief.moving) {
      const arch = CREW_ARCHETYPES[thief.role];
      const noiseMult = arch.noiseMultiplier;
      emitWalkNoise(heist, thief.id, thief.x, thief.y, noiseMult, false, thief.crouching);
    }

    // Check for traps (sapmaster can detect and disarm)
    const tx = Math.round(thief.x), ty = Math.round(thief.y);
    if (ty >= 0 && ty < heist.map.height && tx >= 0 && tx < heist.map.width) {
      const tile = heist.map.tiles[ty][tx];
      if (tile.type === "trap" && tile.trapArmed) {
        if (thief.role === "sapmaster") {
          // Sapmaster auto-disarms traps
          tile.trapArmed = false;
          tile.type = "floor";
        } else {
          tile.trapArmed = false;
          thief.hp -= 20;
          emitActionNoise(heist, tx, ty, ShadowhandConfig.NOISE_COMBAT, thief.id);
          if (thief.hp <= 0) thief.alive = false;
        }
      }
    }

    // Reveal tiles around thief — affected by role, fog modifier, thieves_cant upgrade
    let visionRange = thief.role === "shade" ? 6 : 4;
    if (heist.modifiers.includes("fog")) visionRange -= 2;
    if (heist.hasThievesCant) visionRange += 1;
    visionRange = Math.max(2, visionRange);
    revealAround(heist, thief.x, thief.y, visionRange);

    // Pick up loot automatically (brawler can carry heavy items)
    if (ty >= 0 && ty < heist.map.height && tx >= 0 && tx < heist.map.width) {
      const tile = heist.map.tiles[ty][tx];
      if (tile.loot && (tile.type === "loot_spot" || tile.type === "primary_loot")) {
        const lootItem = tile.loot;
        // Heavy loot (weight 3) requires brawler
        if (lootItem.weight >= 3 && thief.role !== "brawler") {
          heist.announcements.push({ text: `${lootItem.name} too heavy! Need a Brawler.`, color: 0xffaa44, timer: 3 });
        } else {
          thief.carryingLoot.push(lootItem);
          heist.lootCollected.push(lootItem);
          heist.combo.consecutiveLootPickups++;
          heist.announcements.push({ text: `+${lootItem.name} (${lootItem.value}g)`, color: 0xffd700, timer: 2 });
          // Spawn gold particles
          for (let pi = 0; pi < 6; pi++) {
            heist.particles.push({
              x: thief.x, y: thief.y,
              vx: (Math.random() - 0.5) * 40,
              vy: -30 - Math.random() * 30,
              life: 0.6 + Math.random() * 0.4,
              maxLife: 1,
              color: 0xffd700,
              size: 1.5 + Math.random() * 1.5,
            });
          }
          if (tile.type === "primary_loot") {
            heist.primaryLootTaken = true;
            heist.screenShake = 2;
            heist.announcements.push({ text: "\u2605 PRIMARY TARGET SECURED \u2605", color: 0xffd700, timer: 4 });
          }
          tile.loot = null;
          tile.type = "floor";
        }
      }
    }

    // Check if at exit point
    for (const exit of heist.map.exitPoints) {
      const edx = thief.x - exit.x, edy = thief.y - exit.y;
      if (edx * edx + edy * edy < 1.5) {
        thief.escaped = true;
        thief.alive = false; // remove from active play
      }
    }
  }

  // Check if all active thieves have escaped or are dead/captured
  const activeCrew = heist.thieves.filter(t => t.alive && !t.captured && !t.escaped);
  if (activeCrew.length === 0) {
    heist.allEscaped = true;
  }
}

function revealAround(heist: HeistState, cx: number, cy: number, radius: number): void {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const x = Math.round(cx) + dx, y = Math.round(cy) + dy;
      if (y >= 0 && y < heist.map.height && x >= 0 && x < heist.map.width) {
        heist.map.tiles[y][x].revealed = true;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Role-specific abilities
// ---------------------------------------------------------------------------

/** Cutpurse: pickpocket keys from a sleeping/stunned guard */
export function pickpocketGuard(heist: HeistState, thiefId: string): boolean {
  const thief = heist.thieves.find(t => t.id === thiefId);
  if (!thief || thief.role !== "cutpurse") return false;

  for (const guard of heist.guards) {
    if (guard.sleepTimer <= 0 && guard.stunTimer <= 0) continue;
    const dx = guard.x - thief.x, dy = guard.y - thief.y;
    if (dx * dx + dy * dy <= 2.25) {
      // Unlock all locked doors in the guard's patrol area
      for (const wp of guard.patrolPath) {
        for (let dy2 = -2; dy2 <= 2; dy2++) {
          for (let dx2 = -2; dx2 <= 2; dx2++) {
            const nx = wp.x + dx2, ny = wp.y + dy2;
            if (ny >= 0 && ny < heist.map.height && nx >= 0 && nx < heist.map.width) {
              if (heist.map.tiles[ny][nx].type === "locked_door") {
                heist.map.tiles[ny][nx].type = "door";
              }
            }
          }
        }
      }
      return true;
    }
  }
  return false;
}

/** Cutpurse: throw a coin to distract guards */
export function distractCoin(heist: HeistState, x: number, y: number): void {
  emitActionNoise(heist, x, y, 4.0, "distract_coin");
}

/** Brawler: silent takedown on an adjacent guard */
export function takedownGuard(heist: HeistState, thiefId: string): boolean {
  const thief = heist.thieves.find(t => t.id === thiefId);
  if (!thief || thief.role !== "brawler") return false;

  let closest: { guard: typeof heist.guards[0]; dist: number } | null = null;
  for (const guard of heist.guards) {
    if (guard.stunTimer > 0 || guard.sleepTimer > 0) continue;
    const dx = guard.x - thief.x, dy = guard.y - thief.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= ShadowhandConfig.TAKEDOWN_RANGE && (!closest || d < closest.dist)) {
      closest = { guard, dist: d };
    }
  }

  if (closest) {
    // Must be behind the guard (angle check)
    const dx = thief.x - closest.guard.x;
    const dy = thief.y - closest.guard.y;
    const angleFromGuard = Math.atan2(dy, dx);
    let angleDiff = Math.abs(closest.guard.angle - angleFromGuard);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

    // Within ~120 degrees of guard's back
    if (angleDiff > Math.PI * 0.67) {
      closest.guard.sleepTimer = 60;
      closest.guard.alertLevel = 0;
      closest.guard.alertTimer = 0;
      closest.guard.canSeeThief = null;
      closest.guard.chasePath = [];
      emitActionNoise(heist, thief.x, thief.y, 1.5, thief.id);
      heist.combo.silentTakedowns++;
      heist.announcements.push({ text: `Silent takedown x${heist.combo.silentTakedowns}!`, color: 0xff4444, timer: 2 });
      // Particles
      for (let pi = 0; pi < 4; pi++) {
        heist.particles.push({
          x: closest.guard.x, y: closest.guard.y,
          vx: (Math.random() - 0.5) * 30,
          vy: -20 - Math.random() * 20,
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.7,
          color: 0xff6644,
          size: 2,
        });
      }
      return true;
    }
  }
  return false;
}

/** Shade: meld into shadows (become invisible in dark for duration) */
export function shadowMeld(heist: HeistState, thiefId: string): boolean {
  const thief = heist.thieves.find(t => t.id === thiefId);
  if (!thief || thief.role !== "shade") return false;

  const tx = Math.round(thief.x), ty = Math.round(thief.y);
  if (ty >= 0 && ty < heist.map.height && tx >= 0 && tx < heist.map.width) {
    if (!heist.map.tiles[ty][tx].lit) {
      thief.shadowMeld = true;
      thief.shadowMeldTimer = heist.hasShadowLibrary ? 12 : 8;
      return true;
    }
  }
  return false;
}

/** Charlatan: apply disguise to blend in with lit areas */
export function applyDisguise(heist: HeistState, thiefId: string): boolean {
  const thief = heist.thieves.find(t => t.id === thiefId);
  if (!thief || thief.role !== "charlatan") return false;

  thief.disguised = true;
  thief.disguiseTimer = 20; // 20 seconds
  return true;
}

/** Charlatan: distract a guard by talking to them */
export function distractTalk(heist: HeistState, thiefId: string): boolean {
  const thief = heist.thieves.find(t => t.id === thiefId);
  if (!thief || thief.role !== "charlatan" || !thief.disguised) return false;

  // Stun nearest guard temporarily (confused conversation)
  for (const guard of heist.guards) {
    if (guard.stunTimer > 0 || guard.sleepTimer > 0 || guard.isElite) continue;
    const dx = guard.x - thief.x, dy = guard.y - thief.y;
    if (dx * dx + dy * dy <= 4) {
      guard.stunTimer = 5;
      guard.alertTimer = Math.max(0, guard.alertTimer - 20);
      if (guard.alertTimer < ShadowhandConfig.ALERT_SUSPICIOUS_THRESHOLD) {
        guard.alertLevel = 0;
      }
      return true;
    }
  }
  return false;
}

/** Sapmaster: silently pick a locked door (faster than normal) */
export function silentLockpick(heist: HeistState, thiefId: string): boolean {
  const thief = heist.thieves.find(t => t.id === thiefId);
  if (!thief || thief.role !== "sapmaster") return false;

  const tx = Math.round(thief.x), ty = Math.round(thief.y);
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const [dx, dy] of dirs) {
    const nx = tx + dx, ny = ty + dy;
    if (ny >= 0 && ny < heist.map.height && nx >= 0 && nx < heist.map.width) {
      if (heist.map.tiles[ny][nx].type === "locked_door") {
        heist.map.tiles[ny][nx].type = "door";
        emitActionNoise(heist, nx, ny, 0.5, thief.id); // Nearly silent
        return true;
      }
    }
  }
  return false;
}

/** Sapmaster: find and reveal secret doors nearby */
export function findSecretDoors(heist: HeistState, thiefId: string): number {
  const thief = heist.thieves.find(t => t.id === thiefId);
  if (!thief || thief.role !== "sapmaster") return 0;

  let found = 0;
  const tx = Math.round(thief.x), ty = Math.round(thief.y);
  const range = 3;
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      const nx = tx + dx, ny = ty + dy;
      if (ny >= 0 && ny < heist.map.height && nx >= 0 && nx < heist.map.width) {
        if (heist.map.tiles[ny][nx].type === "secret_door") {
          heist.map.tiles[ny][nx].type = "door";
          heist.map.tiles[ny][nx].revealed = true;
          found++;
        }
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Global abilities (from equipment)
// ---------------------------------------------------------------------------

export function useSmokeBomb(heist: HeistState, x: number, y: number, radius: number, duration: number): void {
  const r2 = radius * radius;
  for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const nx = Math.round(x) + dx, ny = Math.round(y) + dy;
      if (ny >= 0 && ny < heist.map.height && nx >= 0 && nx < heist.map.width) {
        heist.map.tiles[ny][nx].smoke = duration;
      }
    }
  }
  emitActionNoise(heist, x, y, 3.0, "smoke_bomb");
}

export function useSleepDart(heist: HeistState, thiefX: number, thiefY: number, range: number, duration: number): boolean {
  let closest: { guard: typeof heist.guards[0]; dist: number } | null = null;
  for (const guard of heist.guards) {
    if (guard.sleepTimer > 0 || guard.stunTimer > 0) continue;
    const dx = guard.x - thiefX, dy = guard.y - thiefY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= range && (!closest || d < closest.dist)) {
      closest = { guard, dist: d };
    }
  }
  if (closest) {
    closest.guard.sleepTimer = duration;
    closest.guard.alertLevel = 0;
    closest.guard.alertTimer = 0;
    closest.guard.chasePath = [];
    return true;
  }
  return false;
}

export function useFlashPowder(heist: HeistState, x: number, y: number, radius: number, stunDuration: number): void {
  for (const guard of heist.guards) {
    const dx = guard.x - x, dy = guard.y - y;
    if (dx * dx + dy * dy <= radius * radius) {
      guard.stunTimer = stunDuration;
      guard.chasePath = [];
    }
  }
  emitActionNoise(heist, x, y, 5.0, "flash_powder");
}

export function placeCaltrops(heist: HeistState, x: number, y: number, radius: number): void {
  const r2 = radius * radius;
  for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const nx = Math.round(x) + dx, ny = Math.round(y) + dy;
      if (ny >= 0 && ny < heist.map.height && nx >= 0 && nx < heist.map.width) {
        if (heist.map.tiles[ny][nx].type === "floor") {
          heist.map.tiles[ny][nx].caltrops = true;
        }
      }
    }
  }
}

export function unlockDoor(heist: HeistState, x: number, y: number, noise: number): boolean {
  if (y >= 0 && y < heist.map.height && x >= 0 && x < heist.map.width) {
    const tile = heist.map.tiles[y][x];
    if (tile.type === "locked_door") {
      tile.type = "door";
      emitActionNoise(heist, x, y, noise, "lockpick");
      return true;
    }
  }
  return false;
}

export function extinguishTorch(heist: HeistState, x: number, y: number): boolean {
  if (y >= 0 && y < heist.map.height && x >= 0 && x < heist.map.width) {
    const tile = heist.map.tiles[y][x];
    if (tile.torchSource) {
      tile.torchSource = false;
      heist.combo.torchesExtinguished++;
      const radius = Math.ceil(ShadowhandConfig.TORCH_RADIUS);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < heist.map.height && nx >= 0 && nx < heist.map.width) {
            let litByOther = false;
            for (let sy = -radius; sy <= radius && !litByOther; sy++) {
              for (let sx = -radius; sx <= radius && !litByOther; sx++) {
                const ty2 = ny + sy, tx2 = nx + sx;
                if (ty2 >= 0 && ty2 < heist.map.height && tx2 >= 0 && tx2 < heist.map.width) {
                  if (heist.map.tiles[ty2][tx2].torchSource) {
                    if (sy * sy + sx * sx <= ShadowhandConfig.TORCH_RADIUS * ShadowhandConfig.TORCH_RADIUS) {
                      litByOther = true;
                    }
                  }
                }
              }
            }
            if (!litByOther) heist.map.tiles[ny][nx].lit = false;
          }
        }
      }
      return true;
    }
  }
  return false;
}

export function updateSmoke(heist: HeistState, dt: number): void {
  for (let y = 0; y < heist.map.height; y++) {
    for (let x = 0; x < heist.map.width; x++) {
      if (heist.map.tiles[y][x].smoke > 0) {
        heist.map.tiles[y][x].smoke -= dt;
      }
    }
  }
}

/** Update shadow meld status — cancel if thief enters lit area */
export function updateShadowMeld(heist: HeistState, dt: number): void {
  for (const thief of heist.thieves) {
    if (!thief.shadowMeld) continue;

    // Tick down timer
    thief.shadowMeldTimer -= dt;
    if (thief.shadowMeldTimer <= 0) {
      thief.shadowMeld = false;
      thief.shadowMeldTimer = 0;
      heist.announcements.push({ text: "Shadow meld faded", color: 0x6644cc, timer: 2 });
      continue;
    }

    // Cancel if entering lit area
    const tx = Math.round(thief.x), ty = Math.round(thief.y);
    if (ty >= 0 && ty < heist.map.height && tx >= 0 && tx < heist.map.width) {
      if (heist.map.tiles[ty][tx].lit) {
        thief.shadowMeld = false;
        thief.shadowMeldTimer = 0;
        heist.announcements.push({ text: "Shadow meld broken by light!", color: 0xff6644, timer: 2 });
      }
    }
  }

  // Check disguise breaks
  for (const thief of heist.thieves) {
    if (!thief.disguised || !thief.alive) continue;
    // Elite guards see through disguise
    for (const guard of heist.guards) {
      if (!guard.isElite || guard.stunTimer > 0 || guard.sleepTimer > 0) continue;
      const dx = guard.x - thief.x, dy = guard.y - thief.y;
      if (dx * dx + dy * dy < 4) {
        thief.disguised = false;
        thief.disguiseTimer = 0;
        heist.announcements.push({ text: "Disguise seen through by elite guard!", color: 0xff4444, timer: 3 });
        break;
      }
    }
  }
}
