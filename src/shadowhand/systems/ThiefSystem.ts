// ---------------------------------------------------------------------------
// Shadowhand mode — thief movement, actions & abilities
// ---------------------------------------------------------------------------

import type { HeistState, ThiefUnit, HeistMap } from "../state/ShadowhandState";
import type { CrewMember } from "../config/CrewDefs";
import { CREW_ARCHETYPES } from "../config/CrewDefs";
import { ShadowhandConfig } from "../config/ShadowhandConfig";
import { emitWalkNoise, emitActionNoise } from "./NoiseSystem";

function isWalkable(map: HeistMap, x: number, y: number): boolean {
  if (y < 0 || y >= map.height || x < 0 || x >= map.width) return false;
  const t = map.tiles[y][x].type;
  return t !== "wall" && t !== "locked_door";
}

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
    selected: false,
    carryingLoot: [],
    hp: crew.hp,
    maxHp: crew.maxHp,
    alive: true,
    captured: false,
  };
}

export function moveThiefTo(heist: HeistState, thiefId: string, tx: number, ty: number): void {
  const thief = heist.thieves.find(t => t.id === thiefId);
  if (!thief || !thief.alive || thief.captured) return;
  thief.targetX = tx;
  thief.targetY = ty;
  thief.moving = true;
}

export function updateThiefMovement(heist: HeistState, dt: number): void {
  for (const thief of heist.thieves) {
    if (!thief.alive || thief.captured) continue;

    // Update disguise timer
    if (thief.disguiseTimer > 0) {
      thief.disguiseTimer -= dt;
      if (thief.disguiseTimer <= 0) thief.disguised = false;
    }

    // Movement
    const dx = thief.targetX - thief.x;
    const dy = thief.targetY - thief.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.15) {
      thief.moving = false;
      thief.noiseLevel = 0;
      continue;
    }

    thief.moving = true;
    let speed = thief.speed;
    if (thief.crouching) speed *= ShadowhandConfig.CROUCHING_SPEED_MULT;

    // Simple pathfinding: try direct movement, if blocked try adjacent
    const step = Math.min(speed * dt, dist);
    let nx = thief.x + (dx / dist) * step;
    let ny = thief.y + (dy / dist) * step;

    if (isWalkable(heist.map, Math.round(nx), Math.round(ny))) {
      thief.x = nx;
      thief.y = ny;
    } else {
      // Try sliding along walls
      const nxOnly = thief.x + (dx / dist) * step;
      const nyOnly = thief.y + (dy / dist) * step;
      if (isWalkable(heist.map, Math.round(nxOnly), Math.round(thief.y))) {
        thief.x = nxOnly;
      } else if (isWalkable(heist.map, Math.round(thief.x), Math.round(nyOnly))) {
        thief.y = nyOnly;
      } else {
        thief.moving = false;
      }
    }

    // Emit noise
    if (thief.moving) {
      const arch = CREW_ARCHETYPES[heist.thieves.find(t => t.id === thief.id)?.id as keyof typeof CREW_ARCHETYPES];
      const noiseMult = arch?.noiseMultiplier ?? 1.0;
      emitWalkNoise(heist, thief.id, thief.x, thief.y, noiseMult, false, thief.crouching);
    }

    // Check for traps
    const tx = Math.round(thief.x), ty = Math.round(thief.y);
    if (ty >= 0 && ty < heist.map.height && tx >= 0 && tx < heist.map.width) {
      const tile = heist.map.tiles[ty][tx];
      if (tile.type === "trap" && tile.trapArmed) {
        tile.trapArmed = false;
        thief.hp -= 20;
        emitActionNoise(heist, tx, ty, ShadowhandConfig.NOISE_COMBAT, thief.id);
        if (thief.hp <= 0) {
          thief.alive = false;
        }
      }
    }

    // Reveal tiles around thief
    revealAround(heist, thief.x, thief.y, 4);

    // Pick up loot automatically
    if (ty >= 0 && ty < heist.map.height && tx >= 0 && tx < heist.map.width) {
      const tile = heist.map.tiles[ty][tx];
      if (tile.loot && (tile.type === "loot_spot" || tile.type === "primary_loot")) {
        const lootItem = tile.loot;
        thief.carryingLoot.push(lootItem);
        heist.lootCollected.push(lootItem);
        if (tile.type === "primary_loot") heist.primaryLootTaken = true;
        tile.loot = null;
        tile.type = "floor";
      }
    }

    // Check if at exit point while carrying loot
    for (const exit of heist.map.exitPoints) {
      const edx = thief.x - exit.x, edy = thief.y - exit.y;
      if (edx * edx + edy * edy < 1.5) {
        // Escaped!
        thief.alive = false; // remove from map (escaped, not dead)
        thief.captured = false;
      }
    }
  }

  // Check if all thieves have escaped or are dead/captured
  const activeCrew = heist.thieves.filter(t => t.alive && !t.captured);
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
// Abilities
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
    return true;
  }
  return false;
}

export function useFlashPowder(heist: HeistState, x: number, y: number, radius: number, stunDuration: number): void {
  for (const guard of heist.guards) {
    const dx = guard.x - x, dy = guard.y - y;
    if (dx * dx + dy * dy <= radius * radius) {
      guard.stunTimer = stunDuration;
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
      // Recalculate light nearby
      const radius = Math.ceil(ShadowhandConfig.TORCH_RADIUS);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < heist.map.height && nx >= 0 && nx < heist.map.width) {
            // Only remove light if no other torch lights this tile
            let litByOther = false;
            for (let sy = -radius; sy <= radius; sy++) {
              for (let sx = -radius; sx <= radius; sx++) {
                const ty2 = ny + sy, tx2 = nx + sx;
                if (ty2 >= 0 && ty2 < heist.map.height && tx2 >= 0 && tx2 < heist.map.width) {
                  if (heist.map.tiles[ty2][tx2].torchSource) {
                    const d2 = sy * sy + sx * sx;
                    if (d2 <= ShadowhandConfig.TORCH_RADIUS * ShadowhandConfig.TORCH_RADIUS) {
                      litByOther = true;
                      break;
                    }
                  }
                }
              }
              if (litByOther) break;
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
