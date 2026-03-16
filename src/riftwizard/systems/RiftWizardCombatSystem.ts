// ---------------------------------------------------------------------------
// Rift Wizard combat system — spell resolution, damage, death
// ---------------------------------------------------------------------------

import { SPELL_DEFS } from "../config/RiftWizardSpellDefs";
import { ENEMY_DEFS } from "../config/RiftWizardEnemyDefs";
import { RWBalance } from "../config/RiftWizardConfig";
import {
  type RiftWizardState,
  type SpellInstance,
  type RWEnemyInstance,
  type GridPos,
  RWAnimationType,
  RWTileType,
  SpellSchool,
} from "../state/RiftWizardState";
import { spawnRiftPortals } from "./RiftWizardLevelGenerator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function tileDistance(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function chebyshevDistance(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

function isFloor(state: RiftWizardState, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= state.level.width || row >= state.level.height) return false;
  const t = state.level.tiles[row][col];
  return (
    t === RWTileType.FLOOR ||
    t === RWTileType.CORRIDOR ||
    t === RWTileType.ICE ||
    t === RWTileType.LAVA ||
    t === RWTileType.SHRINE ||
    t === RWTileType.SPELL_CIRCLE ||
    t === RWTileType.RIFT_PORTAL
  );
}

function isWalkable(state: RiftWizardState, col: number, row: number): boolean {
  if (!isFloor(state, col, row)) return false;
  // Check no living enemy at pos
  for (const e of state.level.enemies) {
    if (e.alive && e.col === col && e.row === row) return false;
  }
  // Check no living spawner at pos
  for (const s of state.level.spawners) {
    if (s.alive && s.col === col && s.row === row) return false;
  }
  return true;
}

/** Has line of sight between two points (simple Bresenham ray). */
export function hasLineOfSight(
  state: RiftWizardState,
  from: GridPos,
  to: GridPos,
): boolean {
  let x0 = from.col;
  let y0 = from.row;
  const x1 = to.col;
  const y1 = to.row;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Skip check for start and end tiles
    if ((x0 !== from.col || y0 !== from.row) && (x0 !== to.col || y0 !== to.row)) {
      const t = state.level.tiles[y0]?.[x0];
      if (t === undefined || t === RWTileType.WALL || t === RWTileType.CHASM) {
        return false;
      }
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Damage application
// ---------------------------------------------------------------------------

export function applyDamageToEnemy(
  state: RiftWizardState,
  enemy: RWEnemyInstance,
  amount: number,
  school: SpellSchool | null,
): void {
  // Holy does double damage to undead
  const def = ENEMY_DEFS[enemy.defId];
  let finalDamage = amount;
  if (school === SpellSchool.HOLY && def?.tags.includes("undead")) {
    finalDamage = Math.floor(amount * 2);
  }

  enemy.hp -= finalDamage;

  state.animationQueue.push({
    type: RWAnimationType.DAMAGE_NUMBER,
    fromCol: enemy.col,
    fromRow: enemy.row,
    toCol: enemy.col,
    toRow: enemy.row,
    amount: finalDamage,
    duration: RWBalance.DAMAGE_NUMBER_DURATION,
  });

  if (enemy.hp <= 0) {
    enemy.alive = false;
    state.animationQueue.push({
      type: RWAnimationType.DEATH,
      fromCol: enemy.col,
      fromRow: enemy.row,
      toCol: enemy.col,
      toRow: enemy.row,
      duration: RWBalance.DEATH_ANIM_DURATION,
    });
  }
}

export function applyDamageToSpawner(
  state: RiftWizardState,
  spawner: { hp: number; alive: boolean; col: number; row: number },
  amount: number,
): void {
  spawner.hp -= amount;

  state.animationQueue.push({
    type: RWAnimationType.DAMAGE_NUMBER,
    fromCol: spawner.col,
    fromRow: spawner.row,
    toCol: spawner.col,
    toRow: spawner.row,
    amount,
    duration: RWBalance.DAMAGE_NUMBER_DURATION,
  });

  if (spawner.hp <= 0) {
    spawner.alive = false;
    state.animationQueue.push({
      type: RWAnimationType.DEATH,
      fromCol: spawner.col,
      fromRow: spawner.row,
      toCol: spawner.col,
      toRow: spawner.row,
      duration: RWBalance.DEATH_ANIM_DURATION,
    });
  }
}

export function applyDamageToWizard(state: RiftWizardState, amount: number): void {
  // Shields absorb first
  if (state.wizard.shields > 0) {
    const absorbed = Math.min(state.wizard.shields, amount);
    state.wizard.shields -= absorbed;
    amount -= absorbed;
  }
  state.wizard.hp -= amount;
  if (state.wizard.hp < 0) state.wizard.hp = 0;

  state.animationQueue.push({
    type: RWAnimationType.DAMAGE_NUMBER,
    fromCol: state.wizard.col,
    fromRow: state.wizard.row,
    toCol: state.wizard.col,
    toRow: state.wizard.row,
    amount,
    duration: RWBalance.DAMAGE_NUMBER_DURATION,
  });
}

// ---------------------------------------------------------------------------
// Spell casting
// ---------------------------------------------------------------------------

export function canCastSpell(
  state: RiftWizardState,
  spellIndex: number,
  targetCol: number,
  targetRow: number,
): boolean {
  const spell = state.spells[spellIndex];
  if (!spell || spell.charges <= 0) return false;

  const def = SPELL_DEFS[spell.defId];
  if (!def) return false;

  const wizPos: GridPos = { col: state.wizard.col, row: state.wizard.row };
  const targetPos: GridPos = { col: targetCol, row: targetRow };

  // Self-targeted spells
  if (def.mechanic === "self_heal" || def.mechanic === "self_aura" || def.mechanic === "global_aoe") {
    return true;
  }

  // Teleport: must target a walkable floor tile
  if (def.mechanic === "teleport") {
    if (!isWalkable(state, targetCol, targetRow)) return false;
  }

  // Range check
  const dist = tileDistance(wizPos, targetPos);
  if (dist > spell.range) return false;

  // Line of sight
  if (!hasLineOfSight(state, wizPos, targetPos)) return false;

  return true;
}

export function castSpell(
  state: RiftWizardState,
  spellIndex: number,
  targetCol: number,
  targetRow: number,
): void {
  const spell = state.spells[spellIndex];
  if (!spell || spell.charges <= 0) return;
  spell.charges--;

  const def = SPELL_DEFS[spell.defId];
  if (!def) return;

  const wizPos: GridPos = { col: state.wizard.col, row: state.wizard.row };
  const targetPos: GridPos = { col: targetCol, row: targetRow };

  switch (def.mechanic) {
    case "single_target":
      resolveSingleTarget(state, spell, wizPos, targetPos);
      break;
    case "projectile_aoe":
      resolveProjectileAoE(state, spell, wizPos, targetPos);
      break;
    case "chain":
      resolveChain(state, spell, wizPos, targetPos);
      break;
    case "cone":
      resolveCone(state, spell, wizPos, targetPos);
      break;
    case "teleport":
      resolveTeleport(state, spell, wizPos, targetPos);
      break;
    case "summon":
      resolveSummon(state, spell, targetPos);
      break;
    case "self_heal":
      resolveSelfHeal(state, spell);
      break;
    case "aoe_slow":
      resolveAoESlow(state, spell, wizPos, targetPos);
      break;
    case "aoe_knockback":
      resolveAoEKnockback(state, spell, wizPos, targetPos);
      break;
    case "self_aura":
      resolveSelfAura(state, spell);
      break;
    case "global_aoe":
      resolveGlobalAoE(state, spell);
      break;
    case "holy_blast":
      resolveHolyBlast(state, spell, wizPos, targetPos);
      break;
  }
}

// ---------------------------------------------------------------------------
// Spell mechanic implementations
// ---------------------------------------------------------------------------

function getTargetsInRadius(
  state: RiftWizardState,
  center: GridPos,
  radius: number,
): { enemies: RWEnemyInstance[]; spawners: typeof state.level.spawners } {
  const enemies = state.level.enemies.filter(
    (e) => e.alive && tileDistance({ col: e.col, row: e.row }, center) <= radius,
  );
  const spawners = state.level.spawners.filter(
    (s) => s.alive && tileDistance({ col: s.col, row: s.row }, center) <= radius,
  );
  return { enemies, spawners };
}

function resolveSingleTarget(
  state: RiftWizardState,
  spell: SpellInstance,
  from: GridPos,
  to: GridPos,
): void {
  state.animationQueue.push({
    type: spell.school === SpellSchool.DARK ? RWAnimationType.DEATH_BOLT : RWAnimationType.MAGIC_MISSILE,
    fromCol: from.col,
    fromRow: from.row,
    toCol: to.col,
    toRow: to.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  // Hit enemy at target
  for (const enemy of state.level.enemies) {
    if (enemy.alive && enemy.col === to.col && enemy.row === to.row) {
      applyDamageToEnemy(state, enemy, spell.damage, spell.school);
      // Life drain special
      if (spell.upgrades.includes("db2_drain")) {
        const healAmt = Math.floor(spell.damage * 0.5);
        state.wizard.hp = Math.min(state.wizard.maxHp, state.wizard.hp + healAmt);
      }
      return;
    }
  }
  // Hit spawner at target
  for (const spawner of state.level.spawners) {
    if (spawner.alive && spawner.col === to.col && spawner.row === to.row) {
      applyDamageToSpawner(state, spawner, spell.damage);
      return;
    }
  }
}

function resolveProjectileAoE(
  state: RiftWizardState,
  spell: SpellInstance,
  from: GridPos,
  to: GridPos,
): void {
  state.animationQueue.push({
    type: spell.school === SpellSchool.ICE ? RWAnimationType.ICE_BALL : RWAnimationType.FIREBALL,
    fromCol: from.col,
    fromRow: from.row,
    toCol: to.col,
    toRow: to.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  const { enemies, spawners } = getTargetsInRadius(state, to, spell.aoeRadius);
  for (const e of enemies) {
    applyDamageToEnemy(state, e, spell.damage, spell.school);
    // Apply slow if spell has it
    if (spell.defId === "ice_ball") {
      const def = SPELL_DEFS[spell.defId];
      const dur = def?.slowDuration ?? 2;
      e.stunTurns = Math.max(e.stunTurns, dur);
    }
  }
  for (const s of spawners) {
    applyDamageToSpawner(state, s, spell.damage);
  }
}

function resolveChain(
  state: RiftWizardState,
  spell: SpellInstance,
  from: GridPos,
  to: GridPos,
): void {
  // Find primary target
  let primaryTarget: RWEnemyInstance | null = null;
  for (const e of state.level.enemies) {
    if (e.alive && e.col === to.col && e.row === to.row) {
      primaryTarget = e;
      break;
    }
  }

  const chainPositions: GridPos[] = [from];
  const hitIds = new Set<number>();

  if (primaryTarget) {
    applyDamageToEnemy(state, primaryTarget, spell.damage, spell.school);
    hitIds.add(primaryTarget.id);
    chainPositions.push({ col: primaryTarget.col, row: primaryTarget.row });

    // Bounce
    let lastPos: GridPos = { col: primaryTarget.col, row: primaryTarget.row };
    for (let bounce = 0; bounce < spell.maxBounces; bounce++) {
      let nearest: RWEnemyInstance | null = null;
      let nearestDist = Infinity;
      for (const e of state.level.enemies) {
        if (!e.alive || hitIds.has(e.id)) continue;
        const d = tileDistance(lastPos, { col: e.col, row: e.row });
        if (d <= 3 && d < nearestDist) {
          nearest = e;
          nearestDist = d;
        }
      }
      if (!nearest) break;
      applyDamageToEnemy(state, nearest, spell.damage, spell.school);
      hitIds.add(nearest.id);
      chainPositions.push({ col: nearest.col, row: nearest.row });
      lastPos = { col: nearest.col, row: nearest.row };
    }
  } else {
    // Hit spawner at target
    for (const s of state.level.spawners) {
      if (s.alive && s.col === to.col && s.row === to.row) {
        applyDamageToSpawner(state, s, spell.damage);
        chainPositions.push({ col: s.col, row: s.row });
        break;
      }
    }
  }

  state.animationQueue.push({
    type: RWAnimationType.CHAIN_LIGHTNING,
    fromCol: from.col,
    fromRow: from.row,
    toCol: to.col,
    toRow: to.row,
    chain: chainPositions,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });
}

function resolveCone(
  state: RiftWizardState,
  spell: SpellInstance,
  from: GridPos,
  to: GridPos,
): void {
  // Direction from wizard to target
  const dx = to.col - from.col;
  const dy = to.row - from.row;

  // Get all tiles in a rough cone shape (chebyshev distance ≤ range, roughly in direction)
  const hitTiles: GridPos[] = [];
  for (let r = 1; r <= spell.range; r++) {
    for (let ox = -r; ox <= r; ox++) {
      for (let oy = -r; oy <= r; oy++) {
        if (chebyshevDistance({ col: 0, row: 0 }, { col: ox, row: oy }) > r) continue;
        // Check direction alignment (dot product > 0)
        if (dx * ox + dy * oy <= 0 && (dx !== 0 || dy !== 0)) continue;
        const tx = from.col + ox;
        const ty = from.row + oy;
        if (isFloor(state, tx, ty)) {
          hitTiles.push({ col: tx, row: ty });
        }
      }
    }
  }

  state.animationQueue.push({
    type: spell.school === SpellSchool.ICE ? RWAnimationType.FROST_BREATH : RWAnimationType.FIRE_BREATH,
    fromCol: from.col,
    fromRow: from.row,
    toCol: to.col,
    toRow: to.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  for (const tile of hitTiles) {
    for (const e of state.level.enemies) {
      if (e.alive && e.col === tile.col && e.row === tile.row) {
        applyDamageToEnemy(state, e, spell.damage, spell.school);
        const coneDef = SPELL_DEFS[spell.defId];
        if (coneDef?.slowDuration) {
          e.stunTurns = Math.max(e.stunTurns, coneDef.slowDuration);
        }
      }
    }
    for (const s of state.level.spawners) {
      if (s.alive && s.col === tile.col && s.row === tile.row) {
        applyDamageToSpawner(state, s, spell.damage);
      }
    }
  }
}

function resolveTeleport(
  state: RiftWizardState,
  spell: SpellInstance,
  from: GridPos,
  to: GridPos,
): void {
  state.animationQueue.push({
    type: RWAnimationType.WARP,
    fromCol: from.col,
    fromRow: from.row,
    toCol: to.col,
    toRow: to.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  state.wizard.col = to.col;
  state.wizard.row = to.row;

  // Warp shield upgrade
  if (spell.upgrades.includes("warp_shield")) {
    state.wizard.shields += 10;
  }
}

function resolveSummon(
  state: RiftWizardState,
  spell: SpellInstance,
  to: GridPos,
): void {
  const unitType = spell.upgrades.includes("si_ice") ? "ice_imp" : (SPELL_DEFS[spell.defId]?.summonUnitType ?? "fire_imp");

  state.animationQueue.push({
    type: RWAnimationType.SUMMON,
    fromCol: to.col,
    fromRow: to.row,
    toCol: to.col,
    toRow: to.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  // Place summons around target
  const offsets: GridPos[] = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: -1 },
    { col: 1, row: 1 },
    { col: -1, row: -1 },
  ];

  let placed = 0;
  for (const off of offsets) {
    if (placed >= spell.summonCount) break;
    const sc = to.col + off.col;
    const sr = to.row + off.row;
    if (!isFloor(state, sc, sr)) continue;
    // Check no entity at pos
    const blocked =
      state.level.enemies.some((e) => e.alive && e.col === sc && e.row === sr) ||
      state.level.summons.some((s) => s.alive && s.col === sc && s.row === sr) ||
      (state.wizard.col === sc && state.wizard.row === sr);
    if (blocked) continue;

    state.level.summons.push({
      id: state.nextEntityId++,
      unitType: unitType as any, // maps to UnitType enum
      col: sc,
      row: sr,
      hp: 20 + spell.damage,
      maxHp: 20 + spell.damage,
      damage: 8,
      range: 1,
      turnsRemaining: RWBalance.SUMMON_DEFAULT_TURNS,
      alive: true,
    });
    placed++;
  }
}

function resolveSelfHeal(state: RiftWizardState, spell: SpellInstance): void {
  const healAmount = Math.abs(spell.damage); // damage is negative for heals
  state.wizard.hp = Math.min(state.wizard.maxHp, state.wizard.hp + healAmount);

  // Cleanse upgrade
  if (spell.upgrades.includes("heal_cleanse")) {
    state.wizard.statusEffects = [];
  }

  state.animationQueue.push({
    type: RWAnimationType.HEAL,
    fromCol: state.wizard.col,
    fromRow: state.wizard.row,
    toCol: state.wizard.col,
    toRow: state.wizard.row,
    amount: healAmount,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });
}

function resolveAoESlow(
  state: RiftWizardState,
  spell: SpellInstance,
  from: GridPos,
  to: GridPos,
): void {
  state.animationQueue.push({
    type: RWAnimationType.WEB,
    fromCol: from.col,
    fromRow: from.row,
    toCol: to.col,
    toRow: to.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  const def = SPELL_DEFS[spell.defId];
  const stunDuration = def?.slowDuration ?? 3;
  const { enemies, spawners } = getTargetsInRadius(state, to, spell.aoeRadius);
  for (const e of enemies) {
    applyDamageToEnemy(state, e, spell.damage, spell.school);
    e.stunTurns = Math.max(e.stunTurns, stunDuration);
  }
  for (const s of spawners) {
    applyDamageToSpawner(state, s, spell.damage);
  }
}

function resolveAoEKnockback(
  state: RiftWizardState,
  spell: SpellInstance,
  from: GridPos,
  to: GridPos,
): void {
  state.animationQueue.push({
    type: RWAnimationType.DISTORTION,
    fromCol: from.col,
    fromRow: from.row,
    toCol: to.col,
    toRow: to.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  const { enemies, spawners } = getTargetsInRadius(state, to, spell.aoeRadius);
  for (const e of enemies) {
    applyDamageToEnemy(state, e, spell.damage, spell.school);
    // Knockback: push 2 tiles away from blast center
    if (e.alive) {
      const dx = e.col - to.col;
      const dy = e.row - to.row;
      const dist = Math.max(Math.abs(dx), Math.abs(dy), 1);
      const pushX = Math.round((dx / dist) * 2);
      const pushY = Math.round((dy / dist) * 2);
      const newCol = e.col + pushX;
      const newRow = e.row + pushY;
      if (isFloor(state, newCol, newRow)) {
        e.col = newCol;
        e.row = newRow;
      }
    }
  }
  for (const s of spawners) {
    applyDamageToSpawner(state, s, spell.damage);
  }
}

function resolveSelfAura(state: RiftWizardState, spell: SpellInstance): void {
  state.animationQueue.push({
    type: RWAnimationType.FIRE_AURA,
    fromCol: state.wizard.col,
    fromRow: state.wizard.row,
    toCol: state.wizard.col,
    toRow: state.wizard.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  // Aura damages enemies around wizard immediately
  const { enemies, spawners } = getTargetsInRadius(
    state,
    { col: state.wizard.col, row: state.wizard.row },
    spell.aoeRadius,
  );
  for (const e of enemies) {
    applyDamageToEnemy(state, e, spell.damage, spell.school);
  }
  for (const s of spawners) {
    applyDamageToSpawner(state, s, spell.damage);
  }
}

function resolveGlobalAoE(state: RiftWizardState, spell: SpellInstance): void {
  state.animationQueue.push({
    type: RWAnimationType.EARTHQUAKE,
    fromCol: state.wizard.col,
    fromRow: state.wizard.row,
    toCol: state.wizard.col,
    toRow: state.wizard.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  for (const e of state.level.enemies) {
    if (!e.alive) continue;
    applyDamageToEnemy(state, e, spell.damage, spell.school);
    // Stun upgrade
    if (spell.upgrades.includes("eq_stun")) {
      e.stunTurns = Math.max(e.stunTurns, 1);
    }
  }
  for (const s of state.level.spawners) {
    if (!s.alive) continue;
    applyDamageToSpawner(state, s, spell.damage);
  }
}

function resolveHolyBlast(
  state: RiftWizardState,
  spell: SpellInstance,
  from: GridPos,
  to: GridPos,
): void {
  state.animationQueue.push({
    type: RWAnimationType.HOLY_LIGHT,
    fromCol: from.col,
    fromRow: from.row,
    toCol: to.col,
    toRow: to.row,
    duration: RWBalance.SPELL_ANIM_DURATION,
  });

  for (const enemy of state.level.enemies) {
    if (enemy.alive && enemy.col === to.col && enemy.row === to.row) {
      applyDamageToEnemy(state, enemy, spell.damage, SpellSchool.HOLY);
      // Holy self heal upgrade
      if (spell.upgrades.includes("hl_heal")) {
        state.wizard.hp = Math.min(state.wizard.maxHp, state.wizard.hp + 10);
      }
      return;
    }
  }
  for (const spawner of state.level.spawners) {
    if (spawner.alive && spawner.col === to.col && spawner.row === to.row) {
      applyDamageToSpawner(state, spawner, spell.damage);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Post-turn processing
// ---------------------------------------------------------------------------

/** Process deaths and check if level is cleared. */
export function processDeaths(state: RiftWizardState): void {
  state.level.enemies = state.level.enemies.filter((e) => e.alive);
  state.level.spawners = state.level.spawners.filter((s) => s.alive);
  state.level.summons = state.level.summons.filter((s) => s.alive);
}

/** Check if all enemies and spawners are dead. */
export function checkLevelClear(state: RiftWizardState): boolean {
  if (state.level.cleared) return true;

  const allDead =
    state.level.enemies.every((e) => !e.alive) &&
    state.level.spawners.every((s) => !s.alive);

  if (allDead) {
    state.level.cleared = true;
    // Spawn rift portals for next level
    if (state.currentLevel < RWBalance.TOTAL_LEVELS - 1) {
      spawnRiftPortals(state.level);
    }
    return true;
  }
  return false;
}

/** Apply lava damage and summon decay at end of turn. */
export function processEndOfTurn(state: RiftWizardState): void {
  // Lava damage to wizard
  const wizTile = state.level.tiles[state.wizard.row]?.[state.wizard.col];
  if (wizTile === RWTileType.LAVA) {
    applyDamageToWizard(state, RWBalance.LAVA_DAMAGE);
  }

  // Lava damage to enemies
  for (const e of state.level.enemies) {
    if (!e.alive) continue;
    const eTile = state.level.tiles[e.row]?.[e.col];
    if (eTile === RWTileType.LAVA) {
      applyDamageToEnemy(state, e, RWBalance.LAVA_DAMAGE, SpellSchool.FIRE);
    }
  }

  // Summon decay
  for (const s of state.level.summons) {
    if (!s.alive) continue;
    if (s.turnsRemaining > 0) {
      s.turnsRemaining--;
      if (s.turnsRemaining <= 0) {
        s.alive = false;
      }
    }
  }

  // Decrement enemy stun turns
  for (const e of state.level.enemies) {
    if (e.stunTurns > 0) e.stunTurns--;
  }

  // Spawner tick
  for (const spawner of state.level.spawners) {
    if (!spawner.alive) continue;
    spawner.turnsSinceSpawn++;
    if (spawner.turnsSinceSpawn >= spawner.spawnInterval) {
      spawner.turnsSinceSpawn = 0;
      // Spawn enemy adjacent to spawner
      const offsets: GridPos[] = [
        { col: 1, row: 0 },
        { col: -1, row: 0 },
        { col: 0, row: 1 },
        { col: 0, row: -1 },
      ];
      for (const off of offsets) {
        const sc = spawner.col + off.col;
        const sr = spawner.row + off.row;
        if (!isFloor(state, sc, sr)) continue;
        const blocked = state.level.enemies.some(
          (e) => e.alive && e.col === sc && e.row === sr,
        );
        if (blocked) continue;

        const def = ENEMY_DEFS[spawner.spawnDefId];
        if (!def) break;
        const scaled = { hp: def.hp, damage: def.damage };
        state.level.enemies.push({
          id: state.nextEntityId++,
          defId: spawner.spawnDefId,
          unitType: def.unitType,
          col: sc,
          row: sr,
          hp: scaled.hp,
          maxHp: scaled.hp,
          damage: scaled.damage,
          range: def.range,
          moveSpeed: def.moveSpeed,
          aiType: def.aiType,
          school: def.school,
          abilities: [...def.abilities],
          abilityCooldowns: def.abilities.map(() => 0),
          alive: true,
          statusEffects: [],
          stunTurns: 0,
          isBoss: false,
          bossPhase: 0,
        });
        break;
      }
    }
  }

  processDeaths(state);
}

// ---------------------------------------------------------------------------
// Spell instance helpers
// ---------------------------------------------------------------------------

/** Apply spell upgrades to compute final stats. */
export function computeSpellStats(spell: SpellInstance): void {
  const def = SPELL_DEFS[spell.defId];
  if (!def) return;

  spell.damage = def.damage;
  spell.range = def.range;
  spell.aoeRadius = def.aoeRadius;
  spell.maxBounces = def.maxBounces;
  spell.summonCount = def.summonCount;
  spell.maxCharges = def.baseCharges;
  spell.school = def.school;

  for (const upId of spell.upgrades) {
    const upgrade = def.upgrades.find((u) => u.id === upId);
    if (!upgrade) continue;
    if (upgrade.bonusDamage) spell.damage += upgrade.bonusDamage;
    if (upgrade.bonusRange) spell.range += upgrade.bonusRange;
    if (upgrade.bonusAoeRadius) spell.aoeRadius += upgrade.bonusAoeRadius;
    if (upgrade.bonusCharges) spell.maxCharges += upgrade.bonusCharges;
    if (upgrade.bonusBounces) spell.maxBounces += upgrade.bonusBounces;
    if (upgrade.bonusSummonCount) spell.summonCount += upgrade.bonusSummonCount;
  }
}

/** Create a new spell instance from a definition. */
export function createSpellInstance(defId: string): SpellInstance {
  const def = SPELL_DEFS[defId];
  if (!def) throw new Error(`Unknown spell def: ${defId}`);
  const instance: SpellInstance = {
    defId,
    charges: def.baseCharges,
    maxCharges: def.baseCharges,
    upgrades: [],
    damage: def.damage,
    range: def.range,
    aoeRadius: def.aoeRadius,
    maxBounces: def.maxBounces,
    summonCount: def.summonCount,
    school: def.school,
  };
  return instance;
}
