// ---------------------------------------------------------------------------
// Grail Quest — Core turn-based game system
// ---------------------------------------------------------------------------

import { GrailPhase, TileType, EntityType, ItemKind } from "../types";
import type { GrailState, Entity, Projectile } from "../types";
import { GRAIL_BALANCE as B, ENEMY_TABLE, ENEMY_DROP_TABLE } from "../config/GrailBalance";
import { computeFOV } from "./FOVSystem";

// ---------------------------------------------------------------------------
// Particles & floating text helpers
// ---------------------------------------------------------------------------

function spawnParticles(s: GrailState, gx: number, gy: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, spd = 30 + Math.random() * 60;
    s.particles.push({ x: gx, y: gy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.8, maxLife: 0.8, color, size: 2 + Math.random() * 3 });
  }
}

function spawnFloatingText(s: GrailState, x: number, y: number, text: string, color: number, timer = 1.0): void {
  s.floatTexts.push({ x, y, text, color, timer, maxTimer: timer });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function addMessage(state: GrailState, text: string, color: number): void {
  state.messages.push({ text, color });
  if (state.messages.length > 5) state.messages.shift();
}

// ---------------------------------------------------------------------------
// Line of sight — Bresenham
// ---------------------------------------------------------------------------

export function hasLineOfSight(state: GrailState, x1: number, y1: number, x2: number, y2: number): boolean {
  const { tiles } = state.dungeon;
  let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  let sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let cx = x1, cy = y1;

  while (cx !== x2 || cy !== y2) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 <  dx) { err += dx; cy += sy; }
    // Skip start tile, check intermediary tiles
    if ((cx !== x2 || cy !== y2) && tiles[cy][cx] === TileType.WALL) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Movement & actions
// ---------------------------------------------------------------------------

export function tryMovePlayer(state: GrailState, dx: number, dy: number): void {
  if (state.phase !== GrailPhase.PLAYING) return;

  // Manual movement cancels auto-explore (unless called by auto-explore itself)
  // Auto-explore sets autoExploring before calling this, so we don't cancel here

  const nx = state.playerX + dx;
  const ny = state.playerY + dy;
  const { tiles, cols, rows } = state.dungeon;

  if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return;

  const tile = tiles[ny][nx];

  // Wall — can't pass
  if (tile === TileType.WALL) return;

  // Check for enemy at target
  const enemy = state.entities.find(e => e.alive && e.x === nx && e.y === ny);
  if (enemy) {
    const dmg = state.playerAttack + state.weapon.damage;
    attackEntity(state, enemy, dmg);
    state.lastMoveDir = { dx, dy };
    // Enchanted armor counter-attack
    if (enemy.alive && enemy.type === EntityType.ENCHANTED_ARMOR) {
      const counterDmg = Math.max(1, enemy.attack - state.playerDefense - state.armor.defense);
      applyDamageToPlayer(state, counterDmg, "Counter-attack");
    }
    processTurnEnd(state);
    return;
  }

  // Door handling
  if (tile === TileType.DOOR) {
    tiles[ny][nx] = TileType.FLOOR;
    addMessage(state, "You open the door.", B.COLOR_MESSAGE_DEFAULT);
  } else if (tile === TileType.LOCKED_DOOR) {
    if (state.keys > 0) {
      state.keys--;
      tiles[ny][nx] = TileType.FLOOR;
      addMessage(state, "You unlock the door.", B.COLOR_GOLD);
    } else {
      addMessage(state, "The door is locked. You need a key.", B.COLOR_DAMAGE);
      return;
    }
  }

  // Move player
  state.playerX = nx;
  state.playerY = ny;
  state.lastMoveDir = { dx, dy };

  // Extra move from speed potion
  if (state.speedTurns > 0) {
    state.speedTurns--;
  }

  // Check traps
  checkTraps(state);

  processTurnEnd(state);
}

export function waitTurn(state: GrailState): void {
  if (state.phase !== GrailPhase.PLAYING) return;
  processTurnEnd(state);
}

function processTurnEnd(state: GrailState): void {
  state.turnCount++;

  // Torch burn-down
  if (state.torchTurns > 0) {
    state.torchTurns--;
    if (state.torchTurns === 20) {
      addMessage(state, "Your torch flickers... it's almost out!", B.COLOR_MESSAGE_ALERT);
    } else if (state.torchTurns === 0) {
      addMessage(state, "Your torch has burned out! Darkness closes in.", B.COLOR_MESSAGE_DANGER);
    }
  }

  processEnemyTurns(state);
  processProjectiles(state);

  computeFOV(state);

  // Check player death
  if (state.playerHp <= 0 && state.phase === GrailPhase.PLAYING) {
    handlePlayerDeath(state);
  }
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export function attackEntity(state: GrailState, entity: Entity, damage: number): void {
  const def = entity.defense;
  let actualDmg = Math.max(1, damage - def);

  // Critical hit check
  const isCrit = Math.random() < B.CRIT_CHANCE;
  if (isCrit) {
    actualDmg = Math.round(actualDmg * B.CRIT_MULTIPLIER);
  }

  entity.hp -= actualDmg;
  state.damageDealt += actualDmg;
  state.screenShake = isCrit ? 8 : 4;

  if (isCrit) {
    spawnParticles(state, entity.x, entity.y, 12, B.COLOR_CRIT);
    spawnFloatingText(state, entity.x, entity.y, `CRIT -${actualDmg}`, B.COLOR_CRIT);
    addMessage(state, `Critical hit! You strike the ${entity.type} for ${actualDmg} damage!`, B.COLOR_CRIT);
    state.screenFlash = 4;
  } else {
    spawnParticles(state, entity.x, entity.y, 6, B.COLOR_DAMAGE);
    spawnFloatingText(state, entity.x, entity.y, `-${actualDmg}`, B.COLOR_DAMAGE);
    addMessage(state, `You hit the ${entity.type} for ${actualDmg} damage.`, B.COLOR_DAMAGE);
  }

  // Weapon effects
  if (entity.hp <= 0) {
    // Kill
    entity.alive = false;
    state.enemiesKilled++;
    const xpReward = getEntityXP(entity.type);
    gainXP(state, xpReward);

    spawnParticles(state, entity.x, entity.y, 12, B.COLOR_DAMAGE);
    spawnFloatingText(state, entity.x, entity.y, `+${xpReward} XP`, B.COLOR_XP);
    addMessage(state, `The ${entity.type} is slain!`, B.COLOR_XP);

    // Heal on kill (Excalibur)
    if (state.weapon.effect === "heal_on_kill") {
      const healAmt = 2;
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmt);
      spawnFloatingText(state, state.playerX, state.playerY, `+${healAmt} HP`, B.COLOR_HEAL);
      addMessage(state, "Excalibur's light heals you.", B.COLOR_HEAL);
    }

    // Enemy drops
    processEnemyDrop(state, entity);
  } else {
    // Stun effect (Morgul Mace)
    if (state.weapon.effect === "stun") {
      entity.stunTimer = Math.max(entity.stunTimer, 2);
      spawnFloatingText(state, entity.x, entity.y, "STUNNED", B.COLOR_STUN);
      addMessage(state, `The ${entity.type} is stunned!`, B.COLOR_STUN);
    }
  }
}

// ---------------------------------------------------------------------------
// Enemy drops on death
// ---------------------------------------------------------------------------

function processEnemyDrop(state: GrailState, entity: Entity): void {
  const dropTable = ENEMY_DROP_TABLE[entity.type];
  if (!dropTable) return;

  for (const drop of dropTable) {
    if (Math.random() < drop.chance) {
      if (addItemToInventory(state, drop.item)) {
        const name = drop.item.replace(/_/g, " ");
        spawnFloatingText(state, entity.x, entity.y, `+${name}`, B.COLOR_MESSAGE_PICKUP);
        addMessage(state, `The ${entity.type} dropped a ${name}!`, B.COLOR_MESSAGE_PICKUP);
      }
      break; // Only one drop per kill
    }
  }

  // Gold drop chance
  if (Math.random() < B.ENEMY_GOLD_DROP_CHANCE) {
    const goldAmt = B.ENEMY_GOLD_DROP_MIN + Math.floor(Math.random() * (B.ENEMY_GOLD_DROP_MAX - B.ENEMY_GOLD_DROP_MIN + 1));
    state.gold += goldAmt;
    spawnFloatingText(state, entity.x, entity.y, `+${goldAmt}g`, B.COLOR_GOLD);
  }
}

function getEntityXP(type: EntityType): number {
  const def = ENEMY_TABLE[type];
  return def ? def.xpReward : 5;
}

function applyDamageToPlayer(state: GrailState, damage: number, source: string): void {
  // Shield absorb
  if (state.shieldCharges > 0) {
    state.shieldCharges--;
    spawnFloatingText(state, state.playerX, state.playerY, "BLOCKED", B.COLOR_SHIELD);
    addMessage(state, `Shield absorbs the ${source}!`, B.COLOR_SHIELD);
    return;
  }

  state.playerHp -= damage;
  state.damageTaken += damage;
  state.screenShake = 6;
  state.screenFlash = 3;
  spawnParticles(state, state.playerX, state.playerY, 8, B.COLOR_DAMAGE);
  spawnFloatingText(state, state.playerX, state.playerY, `-${damage}`, B.COLOR_DAMAGE);
  addMessage(state, `${source} deals ${damage} damage to you!`, B.COLOR_DAMAGE);

  if (state.playerHp <= 0) {
    // Phoenix Feather relic — revive once
    if (!state.phoenixUsed && state.relic.id === "phoenix_feather") {
      state.phoenixUsed = true;
      state.playerHp = Math.floor(state.playerMaxHp / 2);
      spawnFloatingText(state, state.playerX, state.playerY, "PHOENIX!", B.COLOR_HEAL);
      addMessage(state, "The Phoenix Feather saves you from death!", B.COLOR_HEAL);
    }
  }
}

function handlePlayerDeath(state: GrailState): void {
  state.phase = GrailPhase.DEAD;
  addMessage(state, "You have fallen...", B.COLOR_DAMAGE);
  spawnParticles(state, state.playerX, state.playerY, 20, B.COLOR_DAMAGE);
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

export function processEnemyTurns(state: GrailState): void {
  for (const entity of state.entities) {
    if (!entity.alive) continue;

    // Stun check
    if (entity.stunTimer > 0) {
      entity.stunTimer--;
      continue;
    }

    // Poison tick
    if (entity.poisonTimer > 0) {
      entity.poisonTimer--;
      entity.hp -= 1;
      spawnFloatingText(state, entity.x, entity.y, "-1", B.COLOR_POISON);
      if (entity.hp <= 0) {
        entity.alive = false;
        state.enemiesKilled++;
        gainXP(state, getEntityXP(entity.type));
        spawnParticles(state, entity.x, entity.y, 8, B.COLOR_DAMAGE);
        processEnemyDrop(state, entity);
        continue;
      }
    }

    // Visibility / alerting
    const canSee = state.visible[entity.y]?.[entity.x] &&
      hasLineOfSight(state, entity.x, entity.y, state.playerX, state.playerY);

    if (canSee) {
      entity.alerted = true;
      entity.lastKnownPlayerX = state.playerX;
      entity.lastKnownPlayerY = state.playerY;
    }

    // AI by type
    switch (entity.type) {
      case EntityType.RAT:
        moveRandom(state, entity);
        break;

      case EntityType.SKELETON:
        if (entity.alerted) {
          // Skeletons try to flank the player — approach from the sides
          if (Math.random() < B.SKELETON_FLANK_CHANCE) {
            moveSkeletonFlank(state, entity);
          } else {
            moveToward(state, entity, entity.lastKnownPlayerX, entity.lastKnownPlayerY);
          }
        } else {
          moveRandom(state, entity);
        }
        break;

      case EntityType.GOBLIN_ARCHER:
        if (entity.alerted) {
          const distToPlayer = Math.abs(entity.x - state.playerX) + Math.abs(entity.y - state.playerY);
          // Flee if player is too close
          if (distToPlayer <= B.GOBLIN_FLEE_DISTANCE) {
            moveAwayFrom(state, entity, state.playerX, state.playerY);
          } else if (entity.x === state.playerX || entity.y === state.playerY) {
            // If in line with player (same row or col), fire a projectile
            fireProjectile(state, entity);
          } else {
            // Try to get in line with player at safe distance
            moveToward(state, entity, entity.lastKnownPlayerX, entity.lastKnownPlayerY);
          }
        } else {
          moveRandom(state, entity);
        }
        break;

      case EntityType.DARK_KNIGHT:
        if (entity.alerted) {
          // Dark Knights can charge 2 tiles when aligned with the player
          const dkDx = state.playerX - entity.x;
          const dkDy = state.playerY - entity.y;
          const aligned = dkDx === 0 || dkDy === 0;
          const dist = Math.abs(dkDx) + Math.abs(dkDy);
          if (aligned && dist <= B.DARK_KNIGHT_CHARGE_DISTANCE + 1 && dist > 1 && Math.random() < B.DARK_KNIGHT_CHARGE_CHANCE) {
            // Charge — move 2 tiles toward player
            darkKnightCharge(state, entity);
          } else {
            moveToward(state, entity, state.playerX, state.playerY);
          }
        }
        break;

      case EntityType.WRAITH:
        if (entity.alerted) {
          moveTowardPhasing(state, entity, state.playerX, state.playerY);
        }
        break;

      case EntityType.ENCHANTED_ARMOR:
        // Stand still unless player is adjacent
        if (isAdjacent(entity.x, entity.y, state.playerX, state.playerY)) {
          const dmg = Math.max(1, entity.attack - state.playerDefense - state.armor.defense);
          applyDamageToPlayer(state, dmg, "Enchanted Armor");
        }
        break;

      case EntityType.BOSS:
        processBossAI(state, entity);
        break;
    }

    // Melee attack if adjacent after move (except enchanted armor — handled above)
    if (entity.type !== EntityType.ENCHANTED_ARMOR && entity.type !== EntityType.BOSS &&
        entity.type !== EntityType.GOBLIN_ARCHER &&
        entity.alive && isAdjacent(entity.x, entity.y, state.playerX, state.playerY)) {
      const dmg = Math.max(1, entity.attack - state.playerDefense - state.armor.defense);
      applyDamageToPlayer(state, dmg, entity.type);
    }
  }
}

function isAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
}

function moveRandom(state: GrailState, entity: Entity): void {
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const shuffled = dirs.sort(() => Math.random() - 0.5);
  for (const [dx, dy] of shuffled) {
    if (tryEntityMove(state, entity, dx, dy)) break;
  }
}

function moveToward(state: GrailState, entity: Entity, tx: number, ty: number): void {
  const dx = Math.sign(tx - entity.x);
  const dy = Math.sign(ty - entity.y);

  // Try primary axis first (larger distance), then secondary
  const adx = Math.abs(tx - entity.x), ady = Math.abs(ty - entity.y);
  if (adx >= ady) {
    if (dx !== 0 && tryEntityMove(state, entity, dx, 0)) return;
    if (dy !== 0 && tryEntityMove(state, entity, 0, dy)) return;
  } else {
    if (dy !== 0 && tryEntityMove(state, entity, 0, dy)) return;
    if (dx !== 0 && tryEntityMove(state, entity, dx, 0)) return;
  }
}

function moveTowardPhasing(state: GrailState, entity: Entity, tx: number, ty: number): void {
  const dx = Math.sign(tx - entity.x);
  const dy = Math.sign(ty - entity.y);
  const { cols, rows } = state.dungeon;

  // Wraith can move through walls
  const adx = Math.abs(tx - entity.x), ady = Math.abs(ty - entity.y);
  const tryPhase = (mx: number, my: number): boolean => {
    const nx = entity.x + mx, ny = entity.y + my;
    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
    // Can't move onto another entity
    if (state.entities.some(e => e.alive && e !== entity && e.x === nx && e.y === ny)) return false;
    // Can't move onto player (attack handled separately)
    if (nx === state.playerX && ny === state.playerY) return false;
    entity.x = nx;
    entity.y = ny;
    return true;
  };

  if (adx >= ady) {
    if (dx !== 0 && tryPhase(dx, 0)) return;
    if (dy !== 0 && tryPhase(0, dy)) return;
  } else {
    if (dy !== 0 && tryPhase(0, dy)) return;
    if (dx !== 0 && tryPhase(dx, 0)) return;
  }
}

function tryEntityMove(state: GrailState, entity: Entity, dx: number, dy: number): boolean {
  const nx = entity.x + dx, ny = entity.y + dy;
  const { tiles, cols, rows } = state.dungeon;
  if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
  const t = tiles[ny][nx];
  if (t === TileType.WALL || t === TileType.LOCKED_DOOR) return false;
  // Can't move onto another entity or the player
  if (state.entities.some(e => e.alive && e !== entity && e.x === nx && e.y === ny)) return false;
  if (nx === state.playerX && ny === state.playerY) return false;
  entity.x = nx;
  entity.y = ny;
  return true;
}

// Skeleton flanking — try to approach the player from a perpendicular direction
function moveSkeletonFlank(state: GrailState, entity: Entity): void {
  const dx = state.playerX - entity.x;
  const dy = state.playerY - entity.y;

  // Find other nearby skeletons approaching from the same direction
  const otherSkeletons = state.entities.filter(e =>
    e.alive && e !== entity && e.type === EntityType.SKELETON && e.alerted &&
    Math.abs(e.x - state.playerX) + Math.abs(e.y - state.playerY) < 8
  );

  // If another skeleton is already approaching on the same axis, try perpendicular
  const sameAxis = otherSkeletons.some(e => {
    const eDx = state.playerX - e.x;
    const eDy = state.playerY - e.y;
    return (Math.sign(eDx) === Math.sign(dx) && Math.abs(dx) > Math.abs(dy)) ||
           (Math.sign(eDy) === Math.sign(dy) && Math.abs(dy) > Math.abs(dx));
  });

  if (sameAxis && (Math.abs(dx) + Math.abs(dy) > 2)) {
    // Try perpendicular approach — move along the shorter axis first
    if (Math.abs(dx) >= Math.abs(dy)) {
      // Normally would go X, instead go Y to flank
      if (dy !== 0 && tryEntityMove(state, entity, 0, Math.sign(dy))) return;
      if (dx !== 0 && tryEntityMove(state, entity, Math.sign(dx), 0)) return;
    } else {
      if (dx !== 0 && tryEntityMove(state, entity, Math.sign(dx), 0)) return;
      if (dy !== 0 && tryEntityMove(state, entity, 0, Math.sign(dy))) return;
    }
  } else {
    // Direct approach
    moveToward(state, entity, state.playerX, state.playerY);
  }
}

// Goblin Archer flees — move away from the player
function moveAwayFrom(state: GrailState, entity: Entity, tx: number, ty: number): void {
  const dx = Math.sign(entity.x - tx); // opposite direction
  const dy = Math.sign(entity.y - ty);

  // Try to move away — prioritize the axis with less distance
  if (dx !== 0 && tryEntityMove(state, entity, dx, 0)) return;
  if (dy !== 0 && tryEntityMove(state, entity, 0, dy)) return;
  // If can't move away, try perpendicular
  if (dy !== 0 && tryEntityMove(state, entity, 0, dy)) return;
  if (dx !== 0 && tryEntityMove(state, entity, dx, 0)) return;
}

// Dark Knight charge — move 2 tiles toward the player along an axis
function darkKnightCharge(state: GrailState, entity: Entity): void {
  const dx = Math.sign(state.playerX - entity.x);
  const dy = Math.sign(state.playerY - entity.y);

  // First step
  if (dx !== 0 && dy === 0) {
    if (tryEntityMove(state, entity, dx, 0)) {
      // Second step
      tryEntityMove(state, entity, dx, 0);
      addMessage(state, "The Dark Knight charges!", B.COLOR_MESSAGE_ALERT);
    }
  } else if (dy !== 0 && dx === 0) {
    if (tryEntityMove(state, entity, 0, dy)) {
      tryEntityMove(state, entity, 0, dy);
      addMessage(state, "The Dark Knight charges!", B.COLOR_MESSAGE_ALERT);
    }
  }
}

function fireProjectile(state: GrailState, entity: Entity): void {
  const dx = Math.sign(state.playerX - entity.x);
  const dy = Math.sign(state.playerY - entity.y);
  const proj: Projectile = {
    x: entity.x + dx, y: entity.y + dy,
    dx, dy,
    damage: entity.attack,
    ownerId: entity.id,
    alive: true,
  };
  state.projectiles.push(proj);
  addMessage(state, `The goblin archer fires an arrow!`, B.COLOR_DAMAGE);
}

function processBossAI(state: GrailState, boss: Entity): void {
  // Determine boss phase based on HP thresholds
  const hpFraction = boss.hp / boss.maxHp;
  const oldPhase = boss.bossPhase;

  if (hpFraction > B.BOSS_PHASE2_HP_THRESHOLD) {
    boss.bossPhase = 1;
  } else if (hpFraction > B.BOSS_PHASE3_HP_THRESHOLD) {
    boss.bossPhase = 2;
  } else {
    boss.bossPhase = 3;
  }

  // Announce phase transitions
  if (boss.bossPhase !== oldPhase && boss.bossPhase === 2) {
    addMessage(state, "The boss roars and calls for reinforcements!", B.COLOR_MESSAGE_DANGER);
    spawnParticles(state, boss.x, boss.y, 16, B.COLOR_DAMAGE);
    state.screenShake = 8;
  } else if (boss.bossPhase !== oldPhase && boss.bossPhase === 3) {
    addMessage(state, "The boss enters a blood rage! Its attacks grow fierce!", B.COLOR_MESSAGE_DANGER);
    spawnParticles(state, boss.x, boss.y, 24, B.COLOR_CRIT);
    state.screenShake = 12;
    state.screenFlash = 6;
  }

  // Phase 2: summon 2 skeletons every BOSS_PHASE2_SUMMON_INTERVAL turns
  if (boss.bossPhase >= 2) {
    boss.bossSummonCooldown--;
    if (boss.bossSummonCooldown <= 0) {
      boss.bossSummonCooldown = B.BOSS_PHASE2_SUMMON_INTERVAL;
      const summonCount = 2;
      let spawned = 0;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
      for (const [dx, dy] of dirs) {
        if (spawned >= summonCount) break;
        const sx = boss.x + dx, sy = boss.y + dy;
        if (sx < 0 || sx >= state.dungeon.cols || sy < 0 || sy >= state.dungeon.rows) continue;
        if (state.dungeon.tiles[sy][sx] === TileType.WALL) continue;
        if (state.entities.some(e => e.alive && e.x === sx && e.y === sy)) continue;
        if (sx === state.playerX && sy === state.playerY) continue;

        state.entities.push({
          id: `e${state.entityIdCounter++}`,
          type: EntityType.SKELETON, x: sx, y: sy,
          hp: 6, maxHp: 6, attack: 3, defense: 1,
          alive: true, stunTimer: 0, poisonTimer: 0,
          alerted: true, lastKnownPlayerX: state.playerX, lastKnownPlayerY: state.playerY,
          fireDirection: null, phasing: false,
          bossPhase: 0, bossSummonCooldown: 0,
        });
        spawnParticles(state, sx, sy, 6, B.COLOR_DAMAGE);
        spawned++;
      }
      if (spawned > 0) {
        addMessage(state, "The boss summons reinforcements!", B.COLOR_DAMAGE);
      }
    }
  }

  // Movement — Phase 2+ moves faster (gets an extra move attempt)
  moveToward(state, boss, state.playerX, state.playerY);
  if (boss.bossPhase >= 2) {
    // Extra movement in phase 2+
    moveToward(state, boss, state.playerX, state.playerY);
  }

  // Phase 3: charge toward player (extra movement)
  if (boss.bossPhase === 3) {
    moveToward(state, boss, state.playerX, state.playerY);
  }

  // Heavy attack if adjacent
  if (isAdjacent(boss.x, boss.y, state.playerX, state.playerY)) {
    let dmg = Math.max(1, boss.attack - state.playerDefense - state.armor.defense);
    // Phase 3: double damage (enraged)
    if (boss.bossPhase === 3) {
      dmg = Math.round(dmg * B.BOSS_PHASE3_DAMAGE_MULTIPLIER);
      applyDamageToPlayer(state, dmg, "Enraged Boss");
    } else {
      applyDamageToPlayer(state, dmg, "Boss");
    }
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

export function processProjectiles(state: GrailState): void {
  for (const proj of state.projectiles) {
    if (!proj.alive) continue;

    proj.x += proj.dx;
    proj.y += proj.dy;

    // Out of bounds
    if (proj.x < 0 || proj.x >= state.dungeon.cols || proj.y < 0 || proj.y >= state.dungeon.rows) {
      proj.alive = false;
      continue;
    }

    // Hit wall
    if (state.dungeon.tiles[proj.y][proj.x] === TileType.WALL) {
      proj.alive = false;
      spawnParticles(state, proj.x, proj.y, 4, B.COLOR_DAMAGE);
      continue;
    }

    // Hit player
    if (proj.x === state.playerX && proj.y === state.playerY) {
      proj.alive = false;
      applyDamageToPlayer(state, proj.damage, "Projectile");
    }
  }

  // Cleanup dead projectiles
  state.projectiles = state.projectiles.filter(p => p.alive);
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export function useItem(state: GrailState, slotIndex: number): void {
  if (state.phase !== GrailPhase.PLAYING && state.phase !== GrailPhase.INVENTORY) return;
  const slot = state.inventory[slotIndex];
  if (!slot) return;

  const kind = slot.kind;

  // Keys are consumed when opening locked doors, not used directly
  if (kind === ItemKind.KEY) {
    addMessage(state, "Keys are used on locked doors.", B.COLOR_MESSAGE_DEFAULT);
    return;
  }

  // Torch — resets torch timer
  if (kind === ItemKind.TORCH) {
    state.torchTurns = B.TORCH_DURATION;
    spawnFloatingText(state, state.playerX, state.playerY, "TORCH LIT", 0xff8822);
    addMessage(state, "You light a new torch. Vision restored!", 0xff8822);
    slot.count--;
    state.itemsUsed++;
    if (slot.count <= 0) state.inventory[slotIndex] = null;
    if (state.phase === GrailPhase.INVENTORY) state.phase = GrailPhase.PLAYING;
    computeFOV(state);
    return;
  }

  switch (kind) {
    case ItemKind.HEALING_POTION: {
      const heal = B.HEALING_POTION_AMOUNT;
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + heal);
      spawnFloatingText(state, state.playerX, state.playerY, `+${heal} HP`, B.COLOR_HEAL);
      addMessage(state, `You drink a healing potion. (+${heal} HP)`, B.COLOR_HEAL);
      break;
    }
    case ItemKind.FIREBALL_SCROLL: {
      let killed = 0;
      for (const e of state.entities) {
        if (!e.alive) continue;
        const dist = Math.abs(e.x - state.playerX) + Math.abs(e.y - state.playerY);
        if (dist <= B.FIREBALL_RADIUS) {
          e.hp -= B.FIREBALL_DAMAGE;
          spawnParticles(state, e.x, e.y, 8, B.COLOR_ENEMY_DAMAGE);
          spawnFloatingText(state, e.x, e.y, `-${B.FIREBALL_DAMAGE}`, B.COLOR_ENEMY_DAMAGE);
          if (e.hp <= 0) {
            e.alive = false;
            state.enemiesKilled++;
            gainXP(state, getEntityXP(e.type));
            killed++;
          }
        }
      }
      state.screenFlash = 5;
      addMessage(state, `Fireball! ${killed} enemies destroyed.`, B.COLOR_ENEMY_DAMAGE);
      break;
    }
    case ItemKind.REVEAL_SCROLL: {
      const { cols, rows } = state.dungeon;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          state.explored[y][x] = true;
        }
      }
      addMessage(state, "The scroll reveals the entire floor!", B.COLOR_MESSAGE_DEFAULT);
      break;
    }
    case ItemKind.SHIELD_CHARM: {
      state.shieldCharges = B.SHIELD_CHARGES;
      spawnFloatingText(state, state.playerX, state.playerY, "SHIELD", B.COLOR_SHIELD);
      addMessage(state, `Shield charm activated! (${B.SHIELD_CHARGES} charges)`, B.COLOR_SHIELD);
      break;
    }
    case ItemKind.SPEED_POTION: {
      state.speedTurns = B.SPEED_POTION_TURNS;
      spawnFloatingText(state, state.playerX, state.playerY, "SPEED", B.COLOR_LEVEL_UP);
      addMessage(state, `Speed potion! You feel faster for ${B.SPEED_POTION_TURNS} turns.`, B.COLOR_LEVEL_UP);
      break;
    }
    case ItemKind.TELEPORT_SCROLL: {
      const { tiles, cols, rows } = state.dungeon;
      const candidates: { x: number; y: number }[] = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (tiles[y][x] !== TileType.FLOOR) continue;
          if (state.entities.some(e => e.alive && e.x === x && e.y === y)) continue;
          if (x === state.playerX && y === state.playerY) continue;
          candidates.push({ x, y });
        }
      }
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        spawnParticles(state, state.playerX, state.playerY, 10, B.COLOR_LEVEL_UP);
        state.playerX = target.x;
        state.playerY = target.y;
        spawnParticles(state, state.playerX, state.playerY, 10, B.COLOR_LEVEL_UP);
        computeFOV(state);
        addMessage(state, "You teleport to a new location!", B.COLOR_LEVEL_UP);
      } else {
        addMessage(state, "The scroll fizzles — nowhere to teleport.", B.COLOR_MESSAGE_DEFAULT);
        return; // Don't consume
      }
      break;
    }
  }

  // Consume item
  slot.count--;
  state.itemsUsed++;
  if (slot.count <= 0) state.inventory[slotIndex] = null;

  // Return to playing if in inventory
  if (state.phase === GrailPhase.INVENTORY) state.phase = GrailPhase.PLAYING;
}

// ---------------------------------------------------------------------------
// Tile interactions
// ---------------------------------------------------------------------------

export function interactTile(state: GrailState): void {
  if (state.phase !== GrailPhase.PLAYING) return;

  const tile = state.dungeon.tiles[state.playerY][state.playerX];

  switch (tile) {
    case TileType.CHEST: {
      state.chestsOpened++;
      state.dungeon.tiles[state.playerY][state.playerX] = TileType.FLOOR;

      // Random reward: item or gold
      if (Math.random() < 0.6) {
        // Item
        const items = [ItemKind.HEALING_POTION, ItemKind.FIREBALL_SCROLL, ItemKind.SHIELD_CHARM, ItemKind.SPEED_POTION, ItemKind.TELEPORT_SCROLL, ItemKind.KEY];
        const kind = items[Math.floor(Math.random() * items.length)];
        addItemToInventory(state, kind);
        addMessage(state, `You found a ${kind.replace(/_/g, " ")} in the chest!`, B.COLOR_GOLD);
      } else {
        const goldAmt = 5 + Math.floor(Math.random() * 10) + state.floor * 2;
        state.gold += goldAmt;
        spawnFloatingText(state, state.playerX, state.playerY, `+${goldAmt}g`, B.COLOR_GOLD);
        addMessage(state, `You found ${goldAmt} gold in the chest!`, B.COLOR_GOLD);
      }
      spawnParticles(state, state.playerX, state.playerY, 8, B.COLOR_GOLD);
      break;
    }
    case TileType.SHRINE: {
      state.dungeon.tiles[state.playerY][state.playerX] = TileType.FLOOR;

      if (Math.random() < 0.5) {
        // Full heal
        state.playerHp = state.playerMaxHp;
        spawnFloatingText(state, state.playerX, state.playerY, "FULL HEAL", B.COLOR_HEAL);
        addMessage(state, "The shrine restores you fully!", B.COLOR_HEAL);
      } else {
        // Random buff
        const buffs = ["+1 Attack", "+1 Defense", "+1 Perception"];
        const buff = buffs[Math.floor(Math.random() * buffs.length)];
        if (buff === "+1 Attack") state.playerAttack++;
        else if (buff === "+1 Defense") state.playerDefense++;
        else state.playerPerception++;
        spawnFloatingText(state, state.playerX, state.playerY, buff, B.COLOR_LEVEL_UP);
        addMessage(state, `The shrine blesses you with ${buff}!`, B.COLOR_LEVEL_UP);
      }
      spawnParticles(state, state.playerX, state.playerY, 10, B.COLOR_HEAL);
      break;
    }
    case TileType.STAIRS_DOWN: {
      state.floorsCleared++;
      state.floor++;

      if (state.floor > B.MAX_FLOORS) {
        state.phase = GrailPhase.VICTORY;
        addMessage(state, "You have found the Holy Grail! VICTORY!", B.COLOR_LEVEL_UP);
        spawnParticles(state, state.playerX, state.playerY, 30, B.COLOR_LEVEL_UP);
      } else {
        addMessage(state, `You descend to floor ${state.floor}...`, B.COLOR_MESSAGE_DEFAULT);
        // Note: dungeon generation for the new floor is handled externally
        // (e.g., by the scene or a DungeonGenerator). We just update the counter.
      }
      break;
    }
  }
}

function addItemToInventory(state: GrailState, kind: ItemKind): boolean {
  // Stack with existing
  for (const slot of state.inventory) {
    if (slot && slot.kind === kind) {
      slot.count++;
      return true;
    }
  }
  // Find empty slot
  for (let i = 0; i < state.inventory.length; i++) {
    if (!state.inventory[i]) {
      state.inventory[i] = { kind, count: 1 };
      return true;
    }
  }
  addMessage(state, "Inventory full!", B.COLOR_DAMAGE);
  return false;
}

// ---------------------------------------------------------------------------
// Traps
// ---------------------------------------------------------------------------

export function checkTraps(state: GrailState): void {
  const tile = state.dungeon.tiles[state.playerY][state.playerX];

  if (tile !== TileType.TRAP_SPIKE && tile !== TileType.TRAP_PIT && tile !== TileType.TRAP_POISON) return;

  // Perception check — high perception warns and avoids
  if (state.playerPerception >= 4) {
    addMessage(state, "You notice a trap and carefully avoid it!", B.COLOR_MESSAGE_DEFAULT);
    state.dungeon.tiles[state.playerY][state.playerX] = TileType.FLOOR;
    return;
  }

  state.trapsTriggered++;

  switch (tile) {
    case TileType.TRAP_SPIKE: {
      applyDamageToPlayer(state, B.TRAP_SPIKE_DAMAGE, "Spike trap");
      state.dungeon.tiles[state.playerY][state.playerX] = TileType.FLOOR;
      spawnParticles(state, state.playerX, state.playerY, 6, B.COLOR_TRAP_SPIKE);
      break;
    }
    case TileType.TRAP_PIT: {
      applyDamageToPlayer(state, B.TRAP_PIT_DAMAGE, "Pit trap");
      // Fall to next floor
      state.floorsCleared++;
      state.floor++;
      addMessage(state, "You fall through a pit to the next floor!", B.COLOR_TRAP_SPIKE);
      break;
    }
    case TileType.TRAP_POISON: {
      applyDamageToPlayer(state, B.TRAP_POISON_DAMAGE_PER_TURN, "Poison trap");
      // Apply poison: 1 damage per turn for TRAP_POISON_TURNS
      // We simulate the ongoing poison by damaging each turn via a simple message
      addMessage(state, `Poison! You will take ${B.TRAP_POISON_DAMAGE_PER_TURN} damage for ${B.TRAP_POISON_DURATION} turns.`, B.COLOR_POISON);
      state.dungeon.tiles[state.playerY][state.playerX] = TileType.FLOOR;
      spawnParticles(state, state.playerX, state.playerY, 6, B.COLOR_POISON);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// XP & Leveling
// ---------------------------------------------------------------------------

export function gainXP(state: GrailState, amount: number): void {
  state.playerXp += amount;
  if (state.playerXp >= state.playerXpToNext) {
    state.playerXp -= state.playerXpToNext;
    state.playerLevel++;
    state.playerMaxHp += 2;
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 2);
    state.playerXpToNext = B.XP_PER_LEVEL * state.playerLevel;

    spawnFloatingText(state, state.playerX, state.playerY, "LEVEL UP!", B.COLOR_LEVEL_UP);
    addMessage(state, `Level up! You are now level ${state.playerLevel}.`, B.COLOR_LEVEL_UP);

    generateLevelUpChoices(state);
  }
}

export function generateLevelUpChoices(state: GrailState): void {
  const allChoices = ["+1 Attack", "+1 Defense", "+2 Perception", "+3 Max HP", "Heal Full"];
  // Shuffle and pick 3
  const shuffled = allChoices.sort(() => Math.random() - 0.5);
  state.levelUpChoices = shuffled.slice(0, 3);
  state.phase = GrailPhase.LEVEL_UP;
}

export function applyLevelUpChoice(state: GrailState, choiceIndex: number): void {
  if (choiceIndex < 0 || choiceIndex >= state.levelUpChoices.length) return;

  const choice = state.levelUpChoices[choiceIndex];
  switch (choice) {
    case "+1 Attack":
      state.playerAttack++;
      addMessage(state, "Attack increased!", B.COLOR_LEVEL_UP);
      break;
    case "+1 Defense":
      state.playerDefense++;
      addMessage(state, "Defense increased!", B.COLOR_LEVEL_UP);
      break;
    case "+2 Perception":
      state.playerPerception += 2;
      addMessage(state, "Perception increased!", B.COLOR_LEVEL_UP);
      computeFOV(state);
      break;
    case "+3 Max HP":
      state.playerMaxHp += 3;
      state.playerHp += 3;
      addMessage(state, "Max HP increased!", B.COLOR_LEVEL_UP);
      break;
    case "Heal Full":
      state.playerHp = state.playerMaxHp;
      addMessage(state, "Fully healed!", B.COLOR_HEAL);
      break;
  }

  state.levelUpChoices = [];
  state.phase = GrailPhase.PLAYING;
}

// ---------------------------------------------------------------------------
// Shards calculation (end-of-run reward)
// ---------------------------------------------------------------------------

export function calculateShards(state: GrailState): number {
  return state.floorsCleared * 5 + state.enemiesKilled + Math.floor(state.gold / 10);
}

// ---------------------------------------------------------------------------
// Auto-explore — find nearest unexplored tile and move toward it
// ---------------------------------------------------------------------------

export function autoExploreStep(state: GrailState): boolean {
  if (state.phase !== GrailPhase.PLAYING) {
    state.autoExploring = false;
    return false;
  }

  // Check for visible enemies — stop auto-exploring
  for (const entity of state.entities) {
    if (!entity.alive) continue;
    if (state.visible[entity.y]?.[entity.x]) {
      state.autoExploring = false;
      addMessage(state, "Enemy spotted! Auto-explore stopped.", B.COLOR_MESSAGE_ALERT);
      return false;
    }
  }

  // Check for items on current tile — stop auto-exploring
  const currentTile = state.dungeon.tiles[state.playerY][state.playerX];
  if (currentTile === TileType.CHEST || currentTile === TileType.SHRINE ||
      currentTile === TileType.STAIRS_DOWN) {
    state.autoExploring = false;
    addMessage(state, "Something interesting here. Auto-explore stopped.", B.COLOR_MESSAGE_PICKUP);
    return false;
  }

  // BFS to find nearest unexplored walkable tile
  const { tiles, cols, rows } = state.dungeon;
  const visited = new Uint8Array(rows * cols);
  const queue: number[] = [];

  const idx = (x: number, y: number) => y * cols + x;

  visited[idx(state.playerX, state.playerY)] = 1;
  // Push with first-step direction (0 = self)
  queue.push(state.playerX, state.playerY, 0, 0);

  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    const firstDx = queue[head++];
    const firstDy = queue[head++];

    // Check if this tile is unexplored
    if (!state.explored[cy]?.[cx] && (cx !== state.playerX || cy !== state.playerY)) {
      // Move in the direction of firstDx, firstDy
      if (firstDx !== 0 || firstDy !== 0) {
        tryMovePlayer(state, firstDx, firstDy);
        return true;
      }
    }

    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const ni = idx(nx, ny);
      if (visited[ni]) continue;
      const t = tiles[ny][nx];
      if (t === TileType.WALL || t === TileType.LOCKED_DOOR) continue;
      visited[ni] = 1;

      // Track the first step direction
      const fDx = firstDx === 0 && firstDy === 0 ? DX[d] : firstDx;
      const fDy = firstDx === 0 && firstDy === 0 ? DY[d] : firstDy;
      queue.push(nx, ny, fDx, fDy);
    }
  }

  // No unexplored tiles reachable
  state.autoExploring = false;
  addMessage(state, "Nothing left to explore.", B.COLOR_MESSAGE_DEFAULT);
  return false;
}

export function toggleAutoExplore(state: GrailState): void {
  if (state.phase !== GrailPhase.PLAYING) return;
  state.autoExploring = !state.autoExploring;
  if (state.autoExploring) {
    addMessage(state, "Auto-exploring... (move or press X to stop)", B.COLOR_MESSAGE_DEFAULT);
  } else {
    addMessage(state, "Auto-explore cancelled.", B.COLOR_MESSAGE_DEFAULT);
  }
}

// ---------------------------------------------------------------------------
// Torch FOV modifier — returns the effective FOV radius considering torch
// ---------------------------------------------------------------------------

export function getEffectiveFovRadius(state: GrailState): number {
  const baseRadius = B.FOV_RADIUS_BASE + (state.playerPerception - B.PLAYER_BASE_PERCEPTION);
  if (state.torchTurns <= 0) {
    return B.TORCH_MIN_FOV;
  }
  // Gradually reduce FOV in the last 30 turns of torch life
  if (state.torchTurns < 30) {
    const fraction = state.torchTurns / 30;
    const minFov = B.TORCH_MIN_FOV;
    return Math.max(minFov, Math.round(minFov + (baseRadius - minFov) * fraction));
  }
  return baseRadius;
}
