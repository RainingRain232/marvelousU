// ---------------------------------------------------------------------------
// Quest for the Grail — Companion System
// Recruitable NPCs with AI behaviors, abilities, leveling, loyalty
// ---------------------------------------------------------------------------

import { GameBalance, TileType } from "../config/GameConfig";
import { COMPANION_DEFS } from "../config/GameArtifactDefs";
import type { CompanionDef } from "../config/GameArtifactDefs";
import { Direction } from "../state/GameState";
import type {
  GrailGameState, CompanionState, EnemyInstance,
} from "../state/GameState";

const TS = GameBalance.TILE_SIZE;

// ---------------------------------------------------------------------------
// Companion Factory
// ---------------------------------------------------------------------------

export function createCompanion(def: CompanionDef, x: number, y: number): CompanionState {
  return {
    def,
    x, y,
    hp: def.baseHp,
    maxHp: def.baseHp,
    attack: def.baseAttack,
    defense: def.baseDefense,
    level: 1,
    xp: 0,
    xpToNext: 30,
    alive: true,
    behavior: def.companionClass === "healer" ? "support"
      : def.companionClass === "tank" ? "defensive"
      : "aggressive",
    loyalty: 50,        // 0-100
    abilityCooldowns: def.abilities.map(() => 0),
    attackCooldown: 0,
    facing: Direction.DOWN,
    isMoving: false,
  };
}

// ---------------------------------------------------------------------------
// Companion AI Update
// ---------------------------------------------------------------------------

export function updateCompanion(state: GrailGameState, dt: number): void {
  const comp = state.companion;
  if (!comp || !comp.alive) return;

  const p = state.player;
  const floor = state.floor;

  // Decrease cooldowns
  comp.attackCooldown -= dt * 1000;
  for (let i = 0; i < comp.abilityCooldowns.length; i++) {
    if (comp.abilityCooldowns[i] > 0) comp.abilityCooldowns[i] -= dt;
  }

  // Find nearest enemy
  let nearestEnemy: EnemyInstance | null = null;
  let nearestDist = Infinity;
  for (const e of floor.enemies) {
    if (!e.alive) continue;
    const d = Math.sqrt((e.x - comp.x) ** 2 + (e.y - comp.y) ** 2);
    if (d < nearestDist) {
      nearestDist = d;
      nearestEnemy = e;
    }
  }

  const distToPlayer = Math.sqrt((p.x - comp.x) ** 2 + (p.y - comp.y) ** 2);

  // Behavior-based AI
  switch (comp.behavior) {
    case "aggressive":
      updateAggressiveAI(state, comp, dt, nearestEnemy, nearestDist, distToPlayer);
      break;
    case "defensive":
      updateDefensiveAI(state, comp, dt, nearestEnemy, nearestDist, distToPlayer);
      break;
    case "support":
      updateSupportAI(state, comp, dt, nearestEnemy, nearestDist, distToPlayer);
      break;
  }

  // Use class abilities
  updateCompanionAbilities(state, comp, dt, nearestEnemy, nearestDist);

  // Face movement direction
  if (comp.isMoving) {
    const dx = p.x - comp.x;
    const dy = p.y - comp.y;
    if (nearestEnemy && nearestDist < 4 * TS) {
      const ex = nearestEnemy.x - comp.x;
      const ey = nearestEnemy.y - comp.y;
      if (Math.abs(ex) > Math.abs(ey)) {
        comp.facing = ex > 0 ? Direction.RIGHT : Direction.LEFT;
      } else {
        comp.facing = ey > 0 ? Direction.DOWN : Direction.UP;
      }
    } else {
      if (Math.abs(dx) > Math.abs(dy)) {
        comp.facing = dx > 0 ? Direction.RIGHT : Direction.LEFT;
      } else {
        comp.facing = dy > 0 ? Direction.DOWN : Direction.UP;
      }
    }
  }

  // Loyalty: increases slightly each floor, decreases when companion takes heavy damage
  // (handled externally on floor transitions and damage events)
}

// ---------------------------------------------------------------------------
// Aggressive AI: prioritize attacking enemies, stay near player
// ---------------------------------------------------------------------------
function updateAggressiveAI(
  state: GrailGameState, comp: CompanionState, dt: number,
  nearestEnemy: EnemyInstance | null, nearestDist: number, distToPlayer: number,
): void {
  const p = state.player;

  // If too far from player, return to player
  if (distToPlayer > 8 * TS) {
    moveCompanion(state, comp, p.x, p.y, dt, 1.2);
    comp.isMoving = true;
    return;
  }

  // Attack nearest enemy if in range
  if (nearestEnemy && nearestDist < 6 * TS) {
    if (nearestDist < TS * 1.3) {
      // Melee attack
      if (comp.attackCooldown <= 0) {
        const dmg = Math.max(1, comp.attack - nearestEnemy.def.defense * 0.3);
        nearestEnemy.hp -= dmg;
        comp.attackCooldown = 600;
        if (nearestEnemy.hp <= 0) {
          companionGainXP(comp, nearestEnemy.def.xpReward);
        }
      }
      comp.isMoving = false;
    } else {
      moveCompanion(state, comp, nearestEnemy.x, nearestEnemy.y, dt);
      comp.isMoving = true;
    }
  } else {
    // Follow player
    if (distToPlayer > 2 * TS) {
      moveCompanion(state, comp, p.x, p.y, dt);
      comp.isMoving = true;
    } else {
      comp.isMoving = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Defensive AI: stay near player, attack only threats within range
// ---------------------------------------------------------------------------
function updateDefensiveAI(
  state: GrailGameState, comp: CompanionState, dt: number,
  nearestEnemy: EnemyInstance | null, nearestDist: number, distToPlayer: number,
): void {
  const p = state.player;

  // Stay close to player
  if (distToPlayer > 3 * TS) {
    moveCompanion(state, comp, p.x, p.y, dt, 1.1);
    comp.isMoving = true;
  } else {
    comp.isMoving = false;
  }

  // Attack enemies that are very close to player or companion
  if (nearestEnemy && nearestDist < 2.5 * TS) {
    if (nearestDist < TS * 1.3 && comp.attackCooldown <= 0) {
      const dmg = Math.max(1, comp.attack - nearestEnemy.def.defense * 0.3);
      nearestEnemy.hp -= dmg;
      comp.attackCooldown = 800;
      if (nearestEnemy.hp <= 0) {
        companionGainXP(comp, nearestEnemy.def.xpReward);
      }
    } else if (nearestDist >= TS * 1.3) {
      // Intercept: move between player and enemy
      const mx = (p.x + nearestEnemy.x) / 2;
      const my = (p.y + nearestEnemy.y) / 2;
      moveCompanion(state, comp, mx, my, dt);
      comp.isMoving = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Support AI: stay behind player, heal/buff, only attack if threatened
// ---------------------------------------------------------------------------
function updateSupportAI(
  state: GrailGameState, comp: CompanionState, dt: number,
  nearestEnemy: EnemyInstance | null, nearestDist: number, distToPlayer: number,
): void {
  const p = state.player;

  // Stay behind player (offset in opposite direction of facing)
  let targetX = p.x, targetY = p.y;
  const offset = 2 * TS;
  switch (p.facing) {
    case Direction.UP: targetY = p.y + offset; break;
    case Direction.DOWN: targetY = p.y - offset; break;
    case Direction.LEFT: targetX = p.x + offset; break;
    case Direction.RIGHT: targetX = p.x - offset; break;
  }

  if (distToPlayer > 4 * TS) {
    moveCompanion(state, comp, p.x, p.y, dt, 1.2);
    comp.isMoving = true;
  } else {
    const distToTarget = Math.sqrt((targetX - comp.x) ** 2 + (targetY - comp.y) ** 2);
    if (distToTarget > TS) {
      moveCompanion(state, comp, targetX, targetY, dt, 0.8);
      comp.isMoving = true;
    } else {
      comp.isMoving = false;
    }
  }

  // Self-defense: attack if enemy is very close
  if (nearestEnemy && nearestDist < 1.5 * TS && comp.attackCooldown <= 0) {
    const dmg = Math.max(1, comp.attack * 0.5 - nearestEnemy.def.defense * 0.3);
    nearestEnemy.hp -= dmg;
    comp.attackCooldown = 1000;
    if (nearestEnemy.hp <= 0) {
      companionGainXP(comp, nearestEnemy.def.xpReward);
    }
  }
}

// ---------------------------------------------------------------------------
// Companion Abilities
// ---------------------------------------------------------------------------
function updateCompanionAbilities(
  state: GrailGameState, comp: CompanionState, _dt: number,
  nearestEnemy: EnemyInstance | null, nearestDist: number,
): void {
  const p = state.player;
  const abilities = comp.def.abilities;

  for (let i = 0; i < abilities.length; i++) {
    if (comp.abilityCooldowns[i] > 0) continue;
    const ab = abilities[i];

    // Healing abilities: use when player is below 50% HP
    if (ab.healAmount > 0 && p.hp < p.maxHp * 0.5) {
      const distToP = Math.sqrt((p.x - comp.x) ** 2 + (p.y - comp.y) ** 2);
      if (distToP <= ab.range * TS) {
        const healAmt = ab.healAmount + comp.level * 2;
        p.hp = Math.min(p.maxHp, p.hp + healAmt);
        comp.abilityCooldowns[i] = ab.cooldown;
        return;
      }
    }

    // Purify: use when player has debuffs
    if (ab.effect === "purify" && (p.confusionTimer > 0 || p.stunTimer > 0 || p.statusEffects.some(e => e.id === "poison" || e.id === "burn"))) {
      const distToP = Math.sqrt((p.x - comp.x) ** 2 + (p.y - comp.y) ** 2);
      if (distToP <= ab.range * TS) {
        p.statusEffects = p.statusEffects.filter(e => e.id === "buff_atk" || e.id === "invulnerable");
        p.confusionTimer = 0;
        p.stunTimer = 0;
        comp.abilityCooldowns[i] = ab.cooldown;
        return;
      }
    }

    // Taunt: use when multiple enemies are near player
    if (ab.effect === "taunt") {
      const nearPlayerEnemies = state.floor.enemies.filter(e =>
        e.alive && Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2) < 3 * TS,
      );
      if (nearPlayerEnemies.length >= 2) {
        // Redirect enemies to companion
        for (const e of nearPlayerEnemies) {
          if (!e.def.isBoss) {
            e.pathTarget = { col: Math.floor(comp.x / TS), row: Math.floor(comp.y / TS) };
          }
        }
        comp.abilityCooldowns[i] = ab.cooldown;
        return;
      }
    }

    // Shield Wall: use when companion HP is low
    if (ab.effect === "shield_wall" && comp.hp < comp.maxHp * 0.4) {
      // Temporary damage reduction (handled via state flag)
      comp.abilityCooldowns[i] = ab.cooldown;
      // Apply buff through status effect mechanism
      return;
    }

    // Damage abilities: use against nearby enemies
    if (ab.damage > 0 && nearestEnemy && nearestDist <= ab.range * TS) {
      const dmg = ab.damage + comp.level * 2;
      nearestEnemy.hp -= dmg;
      if (nearestEnemy.hp <= 0) {
        companionGainXP(comp, nearestEnemy.def.xpReward);
      }

      // Apply effects
      if (ab.effect === "freeze") {
        // Stun nearby enemies
        for (const e of state.floor.enemies) {
          if (!e.alive) continue;
          const d = Math.sqrt((e.x - comp.x) ** 2 + (e.y - comp.y) ** 2);
          if (d <= ab.range * TS) {
            e.stunTurns = Math.max(e.stunTurns, 2);
          }
        }
      }

      comp.abilityCooldowns[i] = ab.cooldown;
      return;
    }

    // Stealth: use when player HP is critically low
    if (ab.effect === "stealth" && p.hp < p.maxHp * 0.2) {
      // Grant brief invulnerability
      if (!p.statusEffects.find(e => e.id === "invulnerable")) {
        p.statusEffects.push({ id: "invulnerable", turnsRemaining: 3, value: 0 });
      }
      comp.abilityCooldowns[i] = ab.cooldown;
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Companion Leveling
// ---------------------------------------------------------------------------
function companionGainXP(comp: CompanionState, amount: number): void {
  comp.xp += Math.floor(amount * 0.5); // companions get 50% XP
  while (comp.xp >= comp.xpToNext) {
    comp.xp -= comp.xpToNext;
    comp.level++;
    comp.xpToNext = Math.floor(30 * Math.pow(1.3, comp.level - 1));
    comp.maxHp += 5;
    comp.hp = Math.min(comp.hp + 5, comp.maxHp);
    comp.attack += 1;
    comp.defense += 1;
  }
}

// ---------------------------------------------------------------------------
// Companion takes damage
// ---------------------------------------------------------------------------
export function companionTakeDamage(state: GrailGameState, damage: number): void {
  const comp = state.companion;
  if (!comp || !comp.alive) return;

  const reducedDmg = Math.max(1, damage - comp.defense * 0.4);
  comp.hp -= reducedDmg;

  // Loyalty decreases on heavy damage
  if (reducedDmg > comp.maxHp * 0.2) {
    comp.loyalty = Math.max(0, comp.loyalty - 2);
  }

  if (comp.hp <= 0) {
    comp.alive = false;
    comp.hp = 0;
    // Permadeath in roguelike mode — companion is gone
  }
}

// ---------------------------------------------------------------------------
// Companion loyalty / relationship
// ---------------------------------------------------------------------------
export function adjustLoyalty(comp: CompanionState, amount: number): void {
  comp.loyalty = Math.max(0, Math.min(100, comp.loyalty + amount));
}

export function getLoyaltyBonus(comp: CompanionState): { atkMult: number; defMult: number; healMult: number } {
  const t = comp.loyalty / 100;
  return {
    atkMult: 0.8 + t * 0.4,     // 80% to 120% attack based on loyalty
    defMult: 0.8 + t * 0.4,
    healMult: 0.7 + t * 0.6,    // 70% to 130% healing based on loyalty
  };
}

// Loyalty increases between floors
export function companionFloorBonus(comp: CompanionState): void {
  adjustLoyalty(comp, 3);
  // Heal companion between floors (partial)
  comp.hp = Math.min(comp.maxHp, comp.hp + Math.floor(comp.maxHp * 0.3));
}

// ---------------------------------------------------------------------------
// Movement helper
// ---------------------------------------------------------------------------
function moveCompanion(
  state: GrailGameState, comp: CompanionState,
  targetX: number, targetY: number, dt: number, speedMult = 1,
): void {
  const floor = state.floor;
  const dx = targetX - comp.x;
  const dy = targetY - comp.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) return;

  const speed = GameBalance.PLAYER_MOVE_SPEED * 0.85 * dt * speedMult;
  const ndx = dx / dist, ndy = dy / dist;
  const newX = comp.x + ndx * speed;
  const newY = comp.y + ndy * speed;

  const col = Math.floor(newX / TS);
  const row = Math.floor(newY / TS);
  if (col >= 0 && col < floor.width && row >= 0 && row < floor.height &&
      floor.tiles[row][col] !== TileType.WALL) {
    comp.x = newX;
    comp.y = newY;
  } else {
    // Slide along walls
    const colX = Math.floor(newX / TS);
    const rowC = Math.floor(comp.y / TS);
    if (colX >= 0 && colX < floor.width && rowC >= 0 && rowC < floor.height &&
        floor.tiles[rowC][colX] !== TileType.WALL) {
      comp.x = newX;
    }
    const colC = Math.floor(comp.x / TS);
    const rowY = Math.floor(newY / TS);
    if (colC >= 0 && colC < floor.width && rowY >= 0 && rowY < floor.height &&
        floor.tiles[rowY][colC] !== TileType.WALL) {
      comp.y = newY;
    }
  }
}

// ---------------------------------------------------------------------------
// Companion recruitment check for dungeon generation
// ---------------------------------------------------------------------------
export function shouldSpawnCompanionNPC(floorNum: number, hasCompanion: boolean): CompanionDef | null {
  if (hasCompanion) return null;
  if (Math.random() > 0.25) return null; // 25% chance per floor

  const eligible = COMPANION_DEFS.filter(d => d.recruitFloorMin <= floorNum);
  if (eligible.length === 0) return null;

  return eligible[Math.floor(Math.random() * eligible.length)];
}
