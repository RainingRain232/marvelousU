// ---------------------------------------------------------------------------
// Rift Wizard enemy AI — per-turn decisions
// ---------------------------------------------------------------------------

import {
  type RiftWizardState,
  type RWEnemyInstance,
  type GridPos,
  RWTileType,
  RWEnemyAIType,
} from "../state/RiftWizardState";
import { RWBalance } from "../config/RiftWizardConfig";
import { SPELL_DEFS } from "../config/RiftWizardSpellDefs";
import {
  tileDistance,
  hasLineOfSight,
  applyDamageToWizard,
  applyDamageToEnemy,
} from "./RiftWizardCombatSystem";
import { RWAnimationType } from "../state/RiftWizardState";

// ---------------------------------------------------------------------------
// Simple A* pathfinding (self-contained for RW tile grid)
// ---------------------------------------------------------------------------

interface PathNode {
  col: number;
  row: number;
  g: number;
  f: number;
  parentKey: string | null;
}

function nodeKey(col: number, row: number): string {
  return `${col},${row}`;
}

function isWalkableTile(state: RiftWizardState, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= state.level.width || row >= state.level.height) return false;
  const t = state.level.tiles[row][col];
  return (
    t !== RWTileType.WALL && t !== RWTileType.CHASM
  );
}

function isTileBlocked(
  state: RiftWizardState,
  col: number,
  row: number,
  selfId: number,
): boolean {
  if (!isWalkableTile(state, col, row)) return true;
  // Don't walk through other enemies
  for (const e of state.level.enemies) {
    if (e.alive && e.id !== selfId && e.col === col && e.row === row) return true;
  }
  // Don't walk through spawners
  for (const s of state.level.spawners) {
    if (s.alive && s.col === col && s.row === row) return true;
  }
  // Don't walk through summons
  for (const s of state.level.summons) {
    if (s.alive && s.col === col && s.row === row) return true;
  }
  return false;
}

const DIRS: GridPos[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 },
];

function findPath(
  state: RiftWizardState,
  start: GridPos,
  goal: GridPos,
  selfId: number,
  maxSteps: number = 200,
): GridPos[] | null {
  const open = new Map<string, PathNode>();
  const closed = new Set<string>();

  const sk = nodeKey(start.col, start.row);
  const h = Math.abs(start.col - goal.col) + Math.abs(start.row - goal.row);
  open.set(sk, { col: start.col, row: start.row, g: 0, f: h, parentKey: null });

  const all = new Map<string, PathNode>();
  all.set(sk, open.get(sk)!);

  let steps = 0;
  while (open.size > 0 && steps++ < maxSteps) {
    // Find lowest f
    let bestKey = "";
    let bestF = Infinity;
    for (const [k, n] of open) {
      if (n.f < bestF) {
        bestF = n.f;
        bestKey = k;
      }
    }

    const current = open.get(bestKey)!;
    open.delete(bestKey);
    closed.add(bestKey);

    if (current.col === goal.col && current.row === goal.row) {
      // Reconstruct path
      const path: GridPos[] = [];
      let key: string | null = bestKey;
      while (key) {
        const pn: PathNode = all.get(key)!;
        path.unshift({ col: pn.col, row: pn.row });
        key = pn.parentKey;
      }
      return path;
    }

    for (const dir of DIRS) {
      const nc = current.col + dir.col;
      const nr = current.row + dir.row;
      const nk = nodeKey(nc, nr);

      if (closed.has(nk)) continue;

      // Allow walking to the goal tile even if wizard is there (for attack)
      const isGoal = nc === goal.col && nr === goal.row;
      if (!isGoal && isTileBlocked(state, nc, nr, selfId)) continue;

      const ng = current.g + 1;
      const existing = open.get(nk);
      if (existing && existing.g <= ng) continue;

      const nh = Math.abs(nc - goal.col) + Math.abs(nr - goal.row);
      const node: PathNode = { col: nc, row: nr, g: ng, f: ng + nh, parentKey: bestKey };
      open.set(nk, node);
      all.set(nk, node);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// AI behaviors
// ---------------------------------------------------------------------------

function meleeAI(
  state: RiftWizardState,
  enemy: RWEnemyInstance,
): void {
  const wizPos: GridPos = { col: state.wizard.col, row: state.wizard.row };
  const dist = tileDistance({ col: enemy.col, row: enemy.row }, wizPos);

  // Adjacent to wizard? Attack!
  if (dist <= 1) {
    applyDamageToWizard(state, enemy.damage);
    state.animationQueue.push({
      type: RWAnimationType.MELEE_HIT,
      fromCol: enemy.col,
      fromRow: enemy.row,
      toCol: state.wizard.col,
      toRow: state.wizard.row,
      amount: enemy.damage,
      duration: RWBalance.MELEE_ANIM_DURATION,
    });
    return;
  }

  // Move towards wizard
  moveTowards(state, enemy, wizPos);
}

function rangedAI(
  state: RiftWizardState,
  enemy: RWEnemyInstance,
): void {
  const wizPos: GridPos = { col: state.wizard.col, row: state.wizard.row };
  const dist = tileDistance({ col: enemy.col, row: enemy.row }, wizPos);
  const enemyPos: GridPos = { col: enemy.col, row: enemy.row };

  // In range and has LOS? Shoot!
  if (dist <= enemy.range && hasLineOfSight(state, enemyPos, wizPos)) {
    applyDamageToWizard(state, enemy.damage);
    state.animationQueue.push({
      type: RWAnimationType.ENEMY_SPELL,
      fromCol: enemy.col,
      fromRow: enemy.row,
      toCol: state.wizard.col,
      toRow: state.wizard.row,
      amount: enemy.damage,
      duration: RWBalance.SPELL_ANIM_DURATION,
    });
    return;
  }

  // Too close? Try to back away
  if (dist <= 2) {
    const awayCol = enemy.col + (enemy.col - state.wizard.col > 0 ? 1 : -1);
    const awayRow = enemy.row + (enemy.row - state.wizard.row > 0 ? 1 : -1);
    if (!isTileBlocked(state, awayCol, enemy.row, enemy.id)) {
      enemy.col = awayCol;
      return;
    }
    if (!isTileBlocked(state, enemy.col, awayRow, enemy.id)) {
      enemy.row = awayRow;
      return;
    }
  }

  // Move towards wizard
  moveTowards(state, enemy, wizPos);
}

function casterAI(
  state: RiftWizardState,
  enemy: RWEnemyInstance,
): void {
  const wizPos: GridPos = { col: state.wizard.col, row: state.wizard.row };
  const dist = tileDistance({ col: enemy.col, row: enemy.row }, wizPos);
  const enemyPos: GridPos = { col: enemy.col, row: enemy.row };

  // Try to cast an ability if in range
  for (let i = 0; i < enemy.abilities.length; i++) {
    if (enemy.abilityCooldowns[i] > 0) continue;
    const spellDef = SPELL_DEFS[enemy.abilities[i]];
    if (!spellDef) continue;

    const spellRange = spellDef.range || enemy.range;
    if (dist <= spellRange && hasLineOfSight(state, enemyPos, wizPos)) {
      // Cast! Deal spell damage
      const dmg = Math.floor(spellDef.damage * 0.7); // enemies do 70% of player spell damage
      applyDamageToWizard(state, Math.max(dmg, enemy.damage));
      enemy.abilityCooldowns[i] = 3; // 3-turn cooldown
      state.animationQueue.push({
        type: RWAnimationType.ENEMY_SPELL,
        fromCol: enemy.col,
        fromRow: enemy.row,
        toCol: state.wizard.col,
        toRow: state.wizard.row,
        amount: dmg,
        duration: RWBalance.SPELL_ANIM_DURATION,
      });
      return;
    }
  }

  // Fallback to ranged attack if in range
  if (dist <= enemy.range && hasLineOfSight(state, enemyPos, wizPos)) {
    applyDamageToWizard(state, enemy.damage);
    state.animationQueue.push({
      type: RWAnimationType.ENEMY_SPELL,
      fromCol: enemy.col,
      fromRow: enemy.row,
      toCol: state.wizard.col,
      toRow: state.wizard.row,
      amount: enemy.damage,
      duration: RWBalance.SPELL_ANIM_DURATION,
    });
    return;
  }

  // Move towards
  moveTowards(state, enemy, wizPos);
}

function bossAI(
  state: RiftWizardState,
  enemy: RWEnemyInstance,
): void {
  // Boss phase transitions at HP thresholds
  const hpPercent = enemy.hp / enemy.maxHp;
  if (hpPercent < 0.5 && enemy.bossPhase === 0) {
    enemy.bossPhase = 1;
    enemy.damage = Math.floor(enemy.damage * 1.3); // enrage
  }
  if (hpPercent < 0.25 && enemy.bossPhase === 1) {
    enemy.bossPhase = 2;
    enemy.damage = Math.floor(enemy.damage * 1.2); // further enrage
  }

  // Boss uses caster AI with melee fallback
  const wizPos: GridPos = { col: state.wizard.col, row: state.wizard.row };
  const dist = tileDistance({ col: enemy.col, row: enemy.row }, wizPos);

  // Try abilities first
  for (let i = 0; i < enemy.abilities.length; i++) {
    if (enemy.abilityCooldowns[i] > 0) continue;
    const spellDef = SPELL_DEFS[enemy.abilities[i]];
    if (!spellDef) continue;

    const spellRange = spellDef.range || enemy.range;
    if (
      dist <= spellRange &&
      hasLineOfSight(state, { col: enemy.col, row: enemy.row }, wizPos)
    ) {
      const dmg = Math.floor(spellDef.damage * 0.8);
      applyDamageToWizard(state, Math.max(dmg, enemy.damage));
      enemy.abilityCooldowns[i] = 2; // bosses have shorter cooldowns
      state.animationQueue.push({
        type: RWAnimationType.ENEMY_SPELL,
        fromCol: enemy.col,
        fromRow: enemy.row,
        toCol: state.wizard.col,
        toRow: state.wizard.row,
        amount: dmg,
        duration: RWBalance.SPELL_ANIM_DURATION,
      });
      return;
    }
  }

  // Melee if adjacent
  if (dist <= 1) {
    applyDamageToWizard(state, enemy.damage);
    state.animationQueue.push({
      type: RWAnimationType.MELEE_HIT,
      fromCol: enemy.col,
      fromRow: enemy.row,
      toCol: state.wizard.col,
      toRow: state.wizard.row,
      amount: enemy.damage,
      duration: RWBalance.MELEE_ANIM_DURATION,
    });
    return;
  }

  // Move towards
  moveTowards(state, enemy, wizPos);
}

// ---------------------------------------------------------------------------
// Movement helper
// ---------------------------------------------------------------------------

function moveTowards(
  state: RiftWizardState,
  enemy: RWEnemyInstance,
  goal: GridPos,
): void {
  const path = findPath(
    state,
    { col: enemy.col, row: enemy.row },
    goal,
    enemy.id,
  );

  if (!path || path.length < 2) return;

  // Move up to moveSpeed tiles along path
  const steps = Math.min(enemy.moveSpeed, path.length - 1);
  const target = path[steps];

  // Don't move onto the wizard tile
  if (target.col === state.wizard.col && target.row === state.wizard.row) {
    if (steps > 1) {
      const prev = path[steps - 1];
      enemy.col = prev.col;
      enemy.row = prev.row;
    }
    return;
  }

  enemy.col = target.col;
  enemy.row = target.row;
}

// ---------------------------------------------------------------------------
// Summon AI (simple: attack nearest enemy)
// ---------------------------------------------------------------------------

export function updateSummons(state: RiftWizardState): void {
  for (const summon of state.level.summons) {
    if (!summon.alive) continue;

    // Find nearest enemy
    let nearest: RWEnemyInstance | null = null;
    let nearestDist = Infinity;
    for (const e of state.level.enemies) {
      if (!e.alive) continue;
      const d = tileDistance({ col: summon.col, row: summon.row }, { col: e.col, row: e.row });
      if (d < nearestDist) {
        nearest = e;
        nearestDist = d;
      }
    }

    if (!nearest) continue;

    // Adjacent? Attack
    if (nearestDist <= summon.range) {
      applyDamageToEnemy(state, nearest, summon.damage, null);
      state.animationQueue.push({
        type: RWAnimationType.MELEE_HIT,
        fromCol: summon.col,
        fromRow: summon.row,
        toCol: nearest.col,
        toRow: nearest.row,
        amount: summon.damage,
        duration: RWBalance.MELEE_ANIM_DURATION,
      });
      continue;
    }

    // Move towards nearest enemy
    const path = findPath(
      state,
      { col: summon.col, row: summon.row },
      { col: nearest.col, row: nearest.row },
      -summon.id, // negative to avoid self-collision check
    );
    if (path && path.length >= 2) {
      const next = path[1];
      // Don't walk onto enemy tile
      if (next.col !== nearest.col || next.row !== nearest.row) {
        summon.col = next.col;
        summon.row = next.row;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main AI update — called once per enemy turn
// ---------------------------------------------------------------------------

export function updateAllEnemies(state: RiftWizardState): void {
  // Sort enemies by distance to wizard (closest first)
  const wizPos: GridPos = { col: state.wizard.col, row: state.wizard.row };
  const sortedEnemies = [...state.level.enemies]
    .filter((e) => e.alive)
    .sort((a, b) => {
      const da = tileDistance({ col: a.col, row: a.row }, wizPos);
      const db = tileDistance({ col: b.col, row: b.row }, wizPos);
      return da - db;
    });

  for (const enemy of sortedEnemies) {
    if (!enemy.alive) continue;

    // Stunned? Skip turn
    if (enemy.stunTurns > 0) continue;

    // Tick ability cooldowns
    for (let i = 0; i < enemy.abilityCooldowns.length; i++) {
      if (enemy.abilityCooldowns[i] > 0) enemy.abilityCooldowns[i]--;
    }

    switch (enemy.aiType) {
      case RWEnemyAIType.MELEE:
        meleeAI(state, enemy);
        break;
      case RWEnemyAIType.RANGED:
        rangedAI(state, enemy);
        break;
      case RWEnemyAIType.CASTER:
        casterAI(state, enemy);
        break;
      case RWEnemyAIType.BOSS:
        bossAI(state, enemy);
        break;
    }
  }

  // Update summons
  updateSummons(state);
}
