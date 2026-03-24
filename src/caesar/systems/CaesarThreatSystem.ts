// ---------------------------------------------------------------------------
// Caesar – Threat system: bandit raids & combat
// ---------------------------------------------------------------------------

import { CB, DIFFICULTY_MODS } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import type { CaesarState } from "../state/CaesarState";
import { nextEntityId } from "../state/CaesarState";
import { createBandit, createMilitia, type CaesarWalker } from "../state/CaesarWalker";

/**
 * Check if a tile is blocked by a wall (not gate).
 */
function isTileBlocked(state: CaesarState, tx: number, ty: number): boolean {
  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    const bdef = CAESAR_BUILDING_DEFS[b.type];
    if (!bdef.blocksMovement) continue;
    if (tx >= b.tileX && tx < b.tileX + bdef.footprint.w &&
        ty >= b.tileY && ty < b.tileY + bdef.footprint.h) {
      return true;
    }
  }
  return false;
}

/**
 * Spawn bandit raids periodically.
 */
export function updateRaids(state: CaesarState, dt: number): void {
  const mod = DIFFICULTY_MODS[state.difficulty];

  state.raidTimer -= dt;
  if (state.raidTimer > 0) return;

  // Schedule next raid
  const minInterval = CB.RAID_INTERVAL_MIN * mod.raidIntervalMult;
  const maxInterval = CB.RAID_INTERVAL_MAX * mod.raidIntervalMult;
  state.raidTimer = minInterval + Math.random() * (maxInterval - minInterval);

  // Don't raid if population is very low
  if (state.population < 20) return;

  // Calculate raid size
  const baseSize = CB.RAID_BASE_SIZE + Math.floor(state.population * CB.RAID_SCALE_PER_POP);
  const raidSize = Math.max(1, Math.floor(baseSize * mod.raidSizeMult));

  // Pick spawn edge
  const map = state.map;
  const edge = Math.floor(Math.random() * 4);

  for (let i = 0; i < raidSize; i++) {
    let sx: number, sy: number;
    const offset = Math.floor(Math.random() * Math.max(map.width, map.height));

    switch (edge) {
      case 0: sx = offset % map.width; sy = 0; break;
      case 1: sx = map.width - 1; sy = offset % map.height; break;
      case 2: sx = offset % map.width; sy = map.height - 1; break;
      default: sx = 0; sy = offset % map.height; break;
    }

    // Skip water tiles
    const tile = map.tiles[sy * map.width + sx];
    if (tile && tile.terrain === "water") continue;

    // Late-game scaling: bandits get tougher after each defeated raid
    const raidScale = 1 + state.raidsDefeated * 0.08;
    const hp = Math.floor(CB.BANDIT_HP * raidScale);
    const atk = Math.floor(CB.BANDIT_ATK * raidScale);

    const bandit = createBandit(nextEntityId(state), sx + 0.5, sy + 0.5, hp, atk);
    bandit.path = generatePathToCenter(state, sx, sy);

    // Late game: arsonist bandits set buildings on fire when they attack
    if (state.raidsDefeated >= 3 && Math.random() < 0.25) {
      bandit.speed = CB.BANDIT_SPEED * 1.3; // arsonists are fast
    }

    state.walkers.set(bandit.id, bandit);
  }
}

/**
 * Generate a path from edge toward center of populated area,
 * avoiding water tiles and steering around walls.
 */
function generatePathToCenter(
  state: CaesarState,
  startX: number,
  startY: number,
): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  const map = state.map;

  // Find center of buildings
  let cx = map.width / 2;
  let cy = map.height / 2;
  let buildingCount = 0;
  for (const b of state.buildings.values()) {
    if (b.built && b.type === CaesarBuildingType.HOUSING) {
      cx += b.tileX;
      cy += b.tileY;
      buildingCount++;
    }
  }
  if (buildingCount > 0) {
    cx /= (buildingCount + 1);
    cy /= (buildingCount + 1);
  }

  // Walk step by step toward center, avoiding water/walls
  const steps = 40;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    let nx = Math.round(startX + (cx - startX) * t);
    let ny = Math.round(startY + (cy - startY) * t);

    // Clamp to bounds
    nx = Math.max(0, Math.min(map.width - 1, nx));
    ny = Math.max(0, Math.min(map.height - 1, ny));

    // Check if target is passable
    const tile = map.tiles[ny * map.width + nx];
    if (tile && tile.terrain === "water") {
      // Try to step around water: offset perpendicular
      const dx = cx - startX;
      const dy = cy - startY;
      const perpX = Math.round(-dy * 0.5);
      const perpY = Math.round(dx * 0.5);
      const altX = Math.max(0, Math.min(map.width - 1, nx + perpX));
      const altY = Math.max(0, Math.min(map.height - 1, ny + perpY));
      const altTile = map.tiles[altY * map.width + altX];
      if (altTile && altTile.terrain !== "water") {
        nx = altX;
        ny = altY;
      } else {
        continue; // Skip this waypoint
      }
    }

    // Don't add duplicate waypoints
    if (path.length > 0) {
      const last = path[path.length - 1];
      if (Math.abs(last.x - (nx + 0.5)) < 0.5 && Math.abs(last.y - (ny + 0.5)) < 0.5) continue;
    }

    path.push({ x: nx + 0.5, y: ny + 0.5 });
  }

  return path;
}

/**
 * Spawn militia from barracks/watchposts to fight bandits.
 * Respects garrison slots and global militia cap.
 */
export function spawnDefenders(state: CaesarState): void {
  // Check if there are active bandits
  let hasBandits = false;
  for (const w of state.walkers.values()) {
    if (w.walkerType === "bandit" && w.alive) {
      hasBandits = true;
      break;
    }
  }
  if (!hasBandits) return;

  // Count current militia globally
  let militiaCount = 0;
  for (const w of state.walkers.values()) {
    if (w.walkerType === "militia" && w.alive) militiaCount++;
  }

  // Global cap
  if (militiaCount >= CB.MAX_MILITIA_GLOBAL) return;

  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    if (b.type !== CaesarBuildingType.WATCHPOST && b.type !== CaesarBuildingType.BARRACKS) continue;

    // Check against garrison slots
    const bdef = CAESAR_BUILDING_DEFS[b.type];
    let fromThis = 0;
    for (const w of state.walkers.values()) {
      if (w.walkerType === "militia" && w.sourceBuilding === b.id && w.alive) fromThis++;
    }

    if (fromThis >= bdef.garrisonSlots) continue;
    if (militiaCount >= CB.MAX_MILITIA_GLOBAL) break;

    const cx = b.tileX + Math.floor(bdef.footprint.w / 2) + 0.5;
    const cy = b.tileY + Math.floor(bdef.footprint.h / 2) + 0.5;

    const militia = createMilitia(
      nextEntityId(state),
      cx, cy,
      CB.MILITIA_HP,
      CB.MILITIA_ATK,
    );
    militia.sourceBuilding = b.id;

    state.walkers.set(militia.id, militia);
    militiaCount++;
  }
}

/**
 * Update combat between militia/towers and bandits.
 */
export function updateCombat(state: CaesarState, dt: number): void {
  const bandits: CaesarWalker[] = [];
  const militia: CaesarWalker[] = [];

  for (const w of state.walkers.values()) {
    if (!w.alive) continue;
    if (w.walkerType === "bandit") bandits.push(w);
    if (w.walkerType === "militia") militia.push(w);
  }

  // Move militia toward nearest bandit
  for (const m of militia) {
    let nearest: CaesarWalker | null = null;
    let nearDist = Infinity;

    for (const b of bandits) {
      if (!b.alive) continue;
      const dx = b.x - m.x;
      const dy = b.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearDist) {
        nearDist = dist;
        nearest = b;
      }
    }

    if (!nearest) continue;

    if (nearDist < CB.MELEE_RANGE) {
      // In melee range — fight
      m.attackTimer += dt;
      if (m.attackTimer >= 1.0) {
        m.attackTimer -= 1.0;
        nearest.hp -= m.atk;
        if (nearest.hp <= 0) {
          nearest.alive = false;
        }
      }
    } else {
      // Move toward bandit — steer around walls
      let dx = nearest.x - m.x;
      let dy = nearest.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let nx = dx / dist;
      let ny = dy / dist;

      // Check if direct path is blocked by a wall
      const nextTx = Math.floor(m.x + nx * 1.5);
      const nextTy = Math.floor(m.y + ny * 1.5);
      if (isTileBlocked(state, nextTx, nextTy)) {
        // Try perpendicular directions
        const perpX1 = -ny, perpY1 = nx;
        const perpX2 = ny, perpY2 = -nx;
        const alt1x = Math.floor(m.x + perpX1 * 1.5);
        const alt1y = Math.floor(m.y + perpY1 * 1.5);
        const alt2x = Math.floor(m.x + perpX2 * 1.5);
        const alt2y = Math.floor(m.y + perpY2 * 1.5);

        if (!isTileBlocked(state, alt1x, alt1y)) {
          nx = perpX1; ny = perpY1;
        } else if (!isTileBlocked(state, alt2x, alt2y)) {
          nx = perpX2; ny = perpY2;
        }
        // If both blocked, just stand still (handled by no movement)
      }

      m.x += nx * CB.MILITIA_SPEED * dt;
      m.y += ny * CB.MILITIA_SPEED * dt;
    }
  }

  // Bandits: move along path, fight militia, attack buildings
  for (const b of bandits) {
    if (!b.alive) continue;

    // Check if bandit is adjacent to a wall — attack it instead of moving
    let attackingWall = false;
    for (const building of state.buildings.values()) {
      if (!building.built) continue;
      const bdef = CAESAR_BUILDING_DEFS[building.type];
      if (!bdef.blocksMovement) continue;
      const bcx = building.tileX + bdef.footprint.w / 2;
      const bcy = building.tileY + bdef.footprint.h / 2;
      const dx = bcx - b.x;
      const dy = bcy - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.5) {
        attackingWall = true;
        b.attackTimer += dt;
        if (b.attackTimer >= 1.5) {
          b.attackTimer -= 1.5;
          building.hp -= b.atk;
          if (building.hp <= 0) {
            state.buildings.delete(building.id);
            state.desirabilityDirty = true;
          }
        }
        break;
      }
    }

    if (!attackingWall) {
      // Move along path, checking for walls
      if (b.path.length > 0 && b.pathIndex < b.path.length) {
        const target = b.path[b.pathIndex];
        const nextTileX = Math.floor(target.x);
        const nextTileY = Math.floor(target.y);

        // Check if next tile is blocked by wall
        if (isTileBlocked(state, nextTileX, nextTileY)) {
          // Stop and attack the wall (handled above on next tick)
        } else {
          const dx = target.x - b.x;
          const dy = target.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.3) {
            b.pathIndex++;
          } else {
            b.x += (dx / dist) * CB.BANDIT_SPEED * dt;
            b.y += (dy / dist) * CB.BANDIT_SPEED * dt;
          }
        }
      }

      // Check if near a militia — fight back
      for (const m of militia) {
        if (!m.alive) continue;
        const dx = m.x - b.x;
        const dy = m.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CB.MELEE_RANGE) {
          b.attackTimer += dt;
          if (b.attackTimer >= 1.2) {
            b.attackTimer -= 1.2;
            m.hp -= b.atk;
            if (m.hp <= 0) m.alive = false;
          }
          break;
        }
      }

      // Damage nearby non-wall buildings + arsonist fire setting
      for (const building of state.buildings.values()) {
        if (!building.built || building.hp <= 0) continue;
        const bdef = CAESAR_BUILDING_DEFS[building.type];
        if (bdef.blocksMovement) continue;
        const bcx = building.tileX + bdef.footprint.w / 2;
        const bcy = building.tileY + bdef.footprint.h / 2;
        const dx = bcx - b.x;
        const dy = bcy - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2) {
          b.attackTimer += dt;
          if (b.attackTimer >= 1.5) {
            b.attackTimer -= 1.5;
            building.hp -= b.atk;
            // Late-game arsonist behavior: fast bandits set buildings on fire
            if (b.speed > CB.BANDIT_SPEED && !building.onFire && Math.random() < 0.4) {
              building.onFire = true;
              building.fireTimer = 12;
            }
            if (building.hp <= 0) {
              if (building.type === CaesarBuildingType.HOUSING) {
                state.population = Math.max(0, state.population - building.residents);
              }
              state.buildings.delete(building.id);
              state.desirabilityDirty = true;
              if (building.type === CaesarBuildingType.ROAD) state.roadDirty = true;
            }
          }
          break;
        }
      }
    }
  }

  // Tower attacks (using separate attackTimer)
  for (const building of state.buildings.values()) {
    if (!building.built || building.type !== CaesarBuildingType.TOWER) continue;
    const bdef = CAESAR_BUILDING_DEFS[building.type];
    const tcx = building.tileX + bdef.footprint.w / 2;
    const tcy = building.tileY + bdef.footprint.h / 2;

    for (const b of bandits) {
      if (!b.alive) continue;
      const dx = b.x - tcx;
      const dy = b.y - tcy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= CB.TOWER_RANGE) {
        building.attackTimer += dt;
        if (building.attackTimer >= CB.TOWER_FIRE_RATE) {
          building.attackTimer -= CB.TOWER_FIRE_RATE;
          b.hp -= CB.TOWER_ATK;
          if (b.hp <= 0) b.alive = false;
        }
        break;
      }
    }
  }

  // Clean up dead walkers
  let remainingBandits = 0;
  const toRemove: number[] = [];
  for (const [id, w] of state.walkers) {
    if (!w.alive) {
      toRemove.push(id);
      continue;
    }
    if (w.walkerType === "bandit") remainingBandits++;
  }

  for (const id of toRemove) {
    state.walkers.delete(id);
  }

  // If all bandits defeated, increment raid counter and dismiss militia
  if (bandits.length > 0 && remainingBandits === 0) {
    state.raidsDefeated++;
    for (const m of militia) {
      state.walkers.delete(m.id);
    }
  }
}
