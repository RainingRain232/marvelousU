// ---------------------------------------------------------------------------
// Quest for the Grail — Combat System
// Handles melee attacks, abilities, damage calculation, enemy AI, status
// effects, leveling, item usage, boss phases, projectiles, and group tactics.
// ---------------------------------------------------------------------------

import {
  GameBalance, TileType, ENEMY_DEFS, LOOT_TABLES, ITEM_DEFS,
} from "../config/GameConfig";
import type { ItemDef } from "../config/GameConfig";
import {
  Direction,
} from "../state/GameState";
import type {
  GrailGameState, PlayerState, EnemyInstance,
} from "../state/GameState";

// ---------------------------------------------------------------------------
// Callbacks for view layer
// ---------------------------------------------------------------------------

type HitCB = (x: number, y: number, damage: number, isCrit: boolean) => void;
type DeathCB = (enemy: EnemyInstance) => void;
type PlayerHitCB = (damage: number) => void;
type LevelUpCB = (level: number) => void;
type LootCB = (item: ItemDef, x: number, y: number) => void;
type BossPhaseFlashCB = (bossId: string, phase: number, color: number) => void;
type SpawnCB = (enemy: EnemyInstance) => void;

let _onHit: HitCB | null = null;
let _onDeath: DeathCB | null = null;
let _onPlayerHit: PlayerHitCB | null = null;
let _onLevelUp: LevelUpCB | null = null;
let _onLoot: LootCB | null = null;
let _onBossPhaseFlash: BossPhaseFlashCB | null = null;
let _onSpawn: SpawnCB | null = null;

const TS = GameBalance.TILE_SIZE;

export const GameCombatSystem = {
  setHitCallback(cb: HitCB | null) { _onHit = cb; },
  setDeathCallback(cb: DeathCB | null) { _onDeath = cb; },
  setPlayerHitCallback(cb: PlayerHitCB | null) { _onPlayerHit = cb; },
  setLevelUpCallback(cb: LevelUpCB | null) { _onLevelUp = cb; },
  setLootCallback(cb: LootCB | null) { _onLoot = cb; },
  setBossPhaseFlashCallback(cb: BossPhaseFlashCB | null) { _onBossPhaseFlash = cb; },
  setSpawnCallback(cb: SpawnCB | null) { _onSpawn = cb; },

  // -------------------------------------------------------------------------
  // Player attacks nearest enemy in facing direction
  // -------------------------------------------------------------------------
  playerAttack(state: GrailGameState): void {
    const p = state.player;
    if (p.attackCooldown > 0) return;
    if (p.stunTimer > 0) return;

    const range = TS * 1.5;
    const targets = state.floor.enemies.filter((e) => {
      if (!e.alive) return false;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) return false;
      return inFacingCone(p.facing, dx, dy);
    });

    if (targets.length === 0) return;

    targets.sort((a, b) => {
      const da = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
      const db = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
      return da - db;
    });

    const target = targets[0];
    const isCrit = Math.random() < p.critChance;
    const baseDmg = p.attack + (p.equippedWeapon?.attackBonus ?? 0);
    let damage = Math.max(1, baseDmg - target.def.defense * 0.5);
    if (isCrit) damage = Math.floor(damage * 2);

    if (p.equippedWeapon?.specialEffect === "holy_smite" && target.def.category === "undead") {
      damage = Math.floor(damage * 1.5);
    }

    // Boss armor reduction (Black Knight)
    if (target.bossArmorReduction > 0) {
      damage = Math.floor(damage * (1 - target.bossArmorReduction));
    }

    target.hp -= damage;
    _onHit?.(target.x, target.y, damage, isCrit);

    if (target.def.isBoss) {
      checkBossPhaseTransition(state, target);
    }

    if (target.hp <= 0) {
      killEnemy(state, target);
    }

    p.attackCooldown = GameBalance.ATTACK_COOLDOWN_MS;
  },

  // -------------------------------------------------------------------------
  // Player uses special ability
  // -------------------------------------------------------------------------
  playerAbility(state: GrailGameState): void {
    const p = state.player;
    if (p.abilityCooldown > 0) return;
    if (p.stunTimer > 0) return;

    const ability = p.knightDef.ability;
    const range = ability.range * TS;
    const aoeRange = ability.aoe * TS;

    if (ability.healAmount > 0) {
      p.hp = Math.min(p.maxHp, p.hp + ability.healAmount);
    }

    if (ability.damage > 0) {
      // Bedivere's Last Stand: damage scales with missing HP (up to 3x at 10% HP)
      let abilityDmg = ability.damage;
      if (p.knightDef.id === "bedivere") {
        const missingHpRatio = 1 - (p.hp / p.maxHp);
        abilityDmg = Math.floor(ability.damage * (1 + missingHpRatio * 2));
      }

      const targets = state.floor.enemies.filter((e) => {
        if (!e.alive) return false;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= (range > 0 ? range * TS : TS * 2);
      });

      for (const t of targets) {
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (aoeRange > 0 || dist <= TS * 2) {
          let dmg = Math.max(1, abilityDmg - t.def.defense * 0.3);
          if (t.bossArmorReduction > 0) {
            dmg = Math.floor(dmg * (1 - t.bossArmorReduction));
          }
          t.hp -= dmg;
          _onHit?.(t.x, t.y, dmg, false);

          if (ability.effect === "stun") {
            t.stunTurns = 2;
          } else if (ability.effect === "poison") {
            t.statusEffects.push({ id: "poison", turnsRemaining: 4, value: 5 });
          } else if (ability.effect === "burn") {
            t.statusEffects.push({ id: "burn", turnsRemaining: 3, value: 8 });
          }

          if (t.def.isBoss) checkBossPhaseTransition(state, t);

          if (t.hp <= 0) {
            killEnemy(state, t);
          }
        }
      }
    }

    if (ability.effect === "buff_atk") {
      p.statusEffects.push({ id: "buff_atk", turnsRemaining: 5, value: 8 });
    }
    if (ability.effect === "invulnerable") {
      p.statusEffects.push({ id: "invulnerable", turnsRemaining: 2, value: 0 });
    }
    if (ability.effect === "purify") {
      p.statusEffects = p.statusEffects.filter((e) => e.id === "buff_atk" || e.id === "invulnerable");
      p.confusionTimer = 0;
    }

    p.abilityCooldown = ability.cooldown;
    p.abilityCooldownMs = GameBalance.ABILITY_ANIMATION_MS;
  },

  // -------------------------------------------------------------------------
  // Use a consumable item from inventory
  // -------------------------------------------------------------------------
  useItem(state: GrailGameState, index: number): void {
    const p = state.player;
    if (index < 0 || index >= p.inventory.length) return;
    const inv = p.inventory[index];
    if (inv.def.type !== "consumable") return;

    const effect = inv.def.specialEffect;
    if (effect === "heal_30") {
      p.hp = Math.min(p.maxHp, p.hp + 30);
    } else if (effect === "buff_atk_temp") {
      p.statusEffects.push({ id: "buff_atk", turnsRemaining: 5, value: 10 });
    } else if (effect === "lightning_all") {
      for (const e of state.floor.enemies) {
        if (e.alive) {
          const dmg = 25;
          e.hp -= dmg;
          _onHit?.(e.x, e.y, dmg, false);
          if (e.hp <= 0) {
            killEnemy(state, e);
          }
        }
      }
    }

    inv.quantity--;
    if (inv.quantity <= 0) {
      p.inventory.splice(index, 1);
    }
  },

  // -------------------------------------------------------------------------
  // Equip an item from inventory
  // -------------------------------------------------------------------------
  equipItem(state: GrailGameState, index: number): void {
    const p = state.player;
    if (index < 0 || index >= p.inventory.length) return;
    const inv = p.inventory[index];
    const def = inv.def;

    if (def.type === "weapon") {
      if (p.equippedWeapon) addToInventory(p, p.equippedWeapon);
      p.equippedWeapon = def;
      p.inventory.splice(index, 1);
      recalcStats(p);
    } else if (def.type === "armor") {
      if (p.equippedArmor) addToInventory(p, p.equippedArmor);
      p.equippedArmor = def;
      p.inventory.splice(index, 1);
      recalcStats(p);
    } else if (def.type === "relic") {
      if (p.equippedRelic) addToInventory(p, p.equippedRelic);
      p.equippedRelic = def;
      p.inventory.splice(index, 1);
      recalcStats(p);
    }
  },

  // -------------------------------------------------------------------------
  // Pick up treasure
  // -------------------------------------------------------------------------
  pickupTreasure(state: GrailGameState, col: number, row: number): void {
    const chest = state.floor.treasures.find((t) => t.col === col && t.row === row && !t.opened);
    if (!chest) return;
    chest.opened = true;
    addToInventory(state.player, chest.item);
    _onLoot?.(chest.item, col * TS, row * TS);
  },

  // -------------------------------------------------------------------------
  // Enemy AI tick
  // -------------------------------------------------------------------------
  updateEnemies(state: GrailGameState, dt: number): void {
    const p = state.player;
    const floor = state.floor;
    const aggroRange = GameBalance.ENEMY_AGGRO_RANGE * TS;

    const aliveEnemies = floor.enemies.filter(e => e.alive);
    const aggroedEnemies = aliveEnemies.filter(e => e.aggroed);
    const surroundTargets = computeGroupTactics(p, aggroedEnemies);

    for (const enemy of floor.enemies) {
      if (!enemy.alive) continue;

      if (enemy.rallyBuffTimer > 0) {
        enemy.rallyBuffTimer -= dt;
        if (enemy.rallyBuffTimer <= 0) {
          enemy.rallyDamageBuff = 0;
          enemy.rallyBuffTimer = 0;
        }
      }

      if (enemy.bossChallengeTimer > 0) {
        enemy.bossChallengeTimer -= dt;
        if (enemy.bossChallengeTimer <= 0) {
          enemy.bossChallengeTimer = 0;
          for (const other of floor.enemies) {
            if (other.id !== enemy.id && other.alive && other.stunTurns > 5) {
              other.stunTurns = 0;
            }
          }
        }
      }

      if (enemy.stunTurns > 0) continue;

      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!enemy.aggroed && dist < aggroRange) enemy.aggroed = true;
      if (enemy.def.isBoss) enemy.aggroed = true;
      if (!enemy.aggroed) continue;

      enemy.aiAbilityCooldown -= dt;
      enemy.aiSummonCooldown -= dt;
      enemy.aiRallyCooldown -= dt;
      enemy.aiHealCooldown -= dt;

      if (enemy.def.isBoss) {
        updateBossAI(state, enemy, dt, dist, dx, dy);
        continue;
      }

      switch (enemy.def.aiType) {
        case "melee":
          updateMeleeAI(state, enemy, dt, dist, dx, dy, surroundTargets);
          break;
        case "ranged":
          updateRangedAI(state, enemy, dt, dist);
          break;
        case "tank":
          updateTankAI(state, enemy, dt, dist, aliveEnemies);
          break;
        case "mage":
          updateMageAI(state, enemy, dt, dist, aliveEnemies);
          break;
        case "summoner":
          updateSummonerAI(state, enemy, dt, dist, aliveEnemies);
          break;
        default:
          updateMeleeAI(state, enemy, dt, dist, dx, dy, surroundTargets);
          break;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        enemy.facing = dx > 0 ? Direction.RIGHT : Direction.LEFT;
      } else {
        enemy.facing = dy > 0 ? Direction.DOWN : Direction.UP;
      }
    }

    // Status effects on enemies
    for (const enemy of floor.enemies) {
      if (!enemy.alive) continue;
      for (let i = enemy.statusEffects.length - 1; i >= 0; i--) {
        const eff = enemy.statusEffects[i];
        if (eff.id === "poison" || eff.id === "burn") {
          enemy.hp -= eff.value * dt;
          if (enemy.hp <= 0) killEnemy(state, enemy);
        }
        eff.turnsRemaining -= dt;
        if (eff.turnsRemaining <= 0) enemy.statusEffects.splice(i, 1);
      }
      if (enemy.stunTurns > 0) {
        enemy.stunTurns -= dt;
        if (enemy.stunTurns < 0) enemy.stunTurns = 0;
      }
    }

    updateProjectiles(state, dt);
    updatePoisonTrails(state, dt);

    if (p.confusionTimer > 0) {
      p.confusionTimer -= dt;
      if (p.confusionTimer < 0) p.confusionTimer = 0;
    }
    if (p.stunTimer > 0) {
      p.stunTimer -= dt;
      if (p.stunTimer < 0) p.stunTimer = 0;
    }
  },

  // -------------------------------------------------------------------------
  // Check traps
  // -------------------------------------------------------------------------
  checkTraps(state: GrailGameState): void {
    const p = state.player;
    if (state.dashTimer > 0) return; // i-frames during dash
    const col = Math.floor(p.x / TS);
    const row = Math.floor(p.y / TS);
    const floor = state.floor;
    if (col >= 0 && col < floor.width && row >= 0 && row < floor.height) {
      if (floor.tiles[row][col] === TileType.TRAP) {
        const invuln = p.statusEffects.find((e) => e.id === "invulnerable");
        if (!invuln) {
          p.hp -= GameBalance.TRAP_DAMAGE;
          _onPlayerHit?.(GameBalance.TRAP_DAMAGE);
        }
        floor.tiles[row][col] = TileType.FLOOR;
      }
    }

    for (const trail of floor.poisonTrails) {
      if (trail.col === col && trail.row === row) {
        const invuln = p.statusEffects.find((e) => e.id === "invulnerable");
        if (!invuln) {
          const dmg = trail.damage * (GameBalance.SIM_TICK_MS / 1000);
          p.hp -= dmg;
        }
      }
    }
  },

  checkStairs(state: GrailGameState): boolean {
    const p = state.player;
    const col = Math.floor(p.x / TS);
    const row = Math.floor(p.y / TS);
    return col === state.floor.stairsPos.col && row === state.floor.stairsPos.row;
  },

  checkTreasure(state: GrailGameState): boolean {
    const p = state.player;
    const col = Math.floor(p.x / TS);
    const row = Math.floor(p.y / TS);
    return !!state.floor.treasures.find((t) => t.col === col && t.row === row && !t.opened);
  },

  // -------------------------------------------------------------------------
  // Shop detection — player standing on a SHOP tile
  // -------------------------------------------------------------------------
  checkShop(state: GrailGameState): boolean {
    const p = state.player;
    const col = Math.floor(p.x / TS);
    const row = Math.floor(p.y / TS);
    const floor = state.floor;
    if (col < 0 || col >= floor.width || row < 0 || row >= floor.height) return false;
    return floor.tiles[row][col] === TileType.SHOP;
  },

  // -------------------------------------------------------------------------
  // Shrine detection — player standing on a SHRINE tile
  // -------------------------------------------------------------------------
  checkShrine(state: GrailGameState): boolean {
    const p = state.player;
    const col = Math.floor(p.x / TS);
    const row = Math.floor(p.y / TS);
    const floor = state.floor;
    if (col < 0 || col >= floor.width || row < 0 || row >= floor.height) return false;
    return floor.tiles[row][col] === TileType.SHRINE;
  },

  // -------------------------------------------------------------------------
  // Shrine activation — apply a random blessing and consume the shrine
  // -------------------------------------------------------------------------
  activateShrine(state: GrailGameState): string {
    const p = state.player;
    const col = Math.floor(p.x / TS);
    const row = Math.floor(p.y / TS);

    // Consume shrine tile so it can't be reused
    state.floor.tiles[row][col] = TileType.FLOOR;

    // Pool of possible blessings (weighted toward what the player needs)
    const blessings: { desc: string; apply: () => void; weight: number }[] = [
      {
        desc: "Fortitude — +15 Max HP",
        weight: 10,
        apply() { p.maxHp += 15; p.hp = Math.min(p.hp + 15, p.maxHp); },
      },
      {
        desc: "Restoration — Fully healed",
        weight: p.hp < p.maxHp * 0.6 ? 20 : 5,
        apply() { p.hp = p.maxHp; },
      },
      {
        desc: "Might — +3 Attack",
        weight: 10,
        apply() { p.attack += 3; },
      },
      {
        desc: "Iron Skin — +2 Defense",
        weight: 10,
        apply() { p.defense += 2; },
      },
      {
        desc: "Swiftness — +1 Speed",
        weight: 8,
        apply() { p.speed += 1; },
      },
      {
        desc: "Keen Edge — +5% Crit Chance",
        weight: p.critChance < 0.3 ? 10 : 4,
        apply() { p.critChance = Math.min(0.5, p.critChance + 0.05); },
      },
      {
        desc: "Purification — All debuffs removed",
        weight: p.statusEffects.length > 0 || p.confusionTimer > 0 || p.stunTimer > 0 ? 15 : 2,
        apply() { p.statusEffects = []; p.confusionTimer = 0; p.stunTimer = 0; },
      },
      {
        desc: "Warrior's Blessing — Temp +8 ATK for 30s",
        weight: 8,
        apply() { p.statusEffects.push({ id: "buff_atk", turnsRemaining: 30, value: 8 }); },
      },
      {
        desc: "Divine Shield — Invulnerable for 8s",
        weight: 6,
        apply() { p.statusEffects.push({ id: "invulnerable", turnsRemaining: 8, value: 0 }); },
      },
      {
        desc: "Gold Offering — +50 Gold",
        weight: 7,
        apply() { p.gold += 50; state.totalGold += 50; },
      },
      {
        desc: "Cooldown Reset — Ability ready",
        weight: p.abilityCooldown > 0 ? 12 : 2,
        apply() { p.abilityCooldown = 0; p.abilityCooldownMs = 0; },
      },
    ];

    // Weighted random selection
    const totalW = blessings.reduce((s, b) => s + b.weight, 0);
    let roll = Math.random() * totalW;
    for (const b of blessings) {
      roll -= b.weight;
      if (roll <= 0) {
        b.apply();
        return b.desc;
      }
    }
    // Fallback
    blessings[0].apply();
    return blessings[0].desc;
  },

  // -------------------------------------------------------------------------
  // Environmental hazards — vine entanglement, lava burn, illusion confusion
  // -------------------------------------------------------------------------
  checkEnvironmentalHazards(state: GrailGameState, dt: number): void {
    const p = state.player;
    const col = Math.floor(p.x / TS);
    const row = Math.floor(p.y / TS);
    const floor = state.floor;
    if (col < 0 || col >= floor.width || row < 0 || row >= floor.height) return;
    const tile = floor.tiles[row][col];
    const invuln = p.statusEffects.find(e => e.id === "invulnerable");

    // Scabbard of Excalibur: halve environmental DOT
    const noBleed = p.equippedRelic?.specialEffect === "no_bleed";
    const dotMult = noBleed ? 0.5 : 1.0;

    // Vine — slow movement and small DOT (thorns)
    if (tile === TileType.VINE) {
      // Slow is handled in GameGame movement via frozenSlow-like check
      // Here we apply thorn damage (2 dps)
      if (!invuln) {
        p.hp -= 2 * dt * dotMult;
        // Small chance to apply poison on vines (3% per tick)
        if (Math.random() < 0.03 * dt * 60 && !p.statusEffects.find(e => e.id === "poison")) {
          p.statusEffects.push({ id: "poison", turnsRemaining: 3, value: 3 });
        }
      }
    }

    // Lava — significant burn damage (12 dps)
    if (tile === TileType.LAVA) {
      if (!invuln) {
        p.hp -= 12 * dt * dotMult;
        _onPlayerHit?.(Math.ceil(12 * dt));
        // Apply burn if not already burning
        if (!p.statusEffects.find(e => e.id === "burn")) {
          p.statusEffects.push({ id: "burn", turnsRemaining: 3, value: 6 });
        }
      }
      // Leave a burning trail
      if (!floor.burningTrails.find(t => t.col === col && t.row === row)) {
        floor.burningTrails.push({ col, row, timer: 4 });
      }
    }

    // Illusion — confusion and hallucination
    if (tile === TileType.ILLUSION) {
      if (p.confusionTimer <= 0) {
        p.confusionTimer = 2 + Math.random() * 2;
      }
      // 10% chance per second to teleport player slightly (disorientation)
      if (Math.random() < 0.1 * dt) {
        const offsetX = (Math.random() - 0.5) * TS * 0.5;
        const offsetY = (Math.random() - 0.5) * TS * 0.5;
        const nc = Math.floor((p.x + offsetX) / TS);
        const nr = Math.floor((p.y + offsetY) / TS);
        if (nc >= 0 && nc < floor.width && nr >= 0 && nr < floor.height &&
            floor.tiles[nr][nc] !== TileType.WALL) {
          p.x += offsetX;
          p.y += offsetY;
        }
      }
    }

    // Burning trails damage (from lava or boss mechanics)
    for (let i = floor.burningTrails.length - 1; i >= 0; i--) {
      const trail = floor.burningTrails[i];
      trail.timer -= dt;
      if (trail.timer <= 0) {
        floor.burningTrails.splice(i, 1);
        continue;
      }
      if (trail.col === col && trail.row === row && !invuln) {
        p.hp -= 5 * dt * dotMult;
      }
    }

    // Abyssal Halls darkness — increase darkness timer (reduces visibility)
    const themeFloor = Math.min(state.currentFloor, 7);
    if (themeFloor === 6) {
      // Darkness grows over time (caps at 60 seconds for maximum darkness)
      floor.darknessTimer = Math.min(60, floor.darknessTimer + dt);
    }

    // Enemy environmental effects — enemies on lava/ice take effects too
    for (const enemy of floor.enemies) {
      if (!enemy.alive) continue;
      const ec = Math.floor(enemy.x / TS);
      const er = Math.floor(enemy.y / TS);
      if (ec < 0 || ec >= floor.width || er < 0 || er >= floor.height) continue;
      const et = floor.tiles[er][ec];

      // Enemies take lava damage too (but at reduced rate)
      if (et === TileType.LAVA) {
        enemy.hp -= 6 * dt;
        if (enemy.hp <= 0) killEnemy(state, enemy);
      }

      // Enemies on ice slide and can't attack as fast
      if (et === TileType.ICE) {
        enemy.attackCooldown += dt * 200; // slower attacks on ice
      }
    }
  },

  // -------------------------------------------------------------------------
  // Reanimation system — undead enemies come back after death in Crypts
  // -------------------------------------------------------------------------
  processReanimations(state: GrailGameState, dt: number): void {
    const floor = state.floor;
    const themeFloor = Math.min(state.currentFloor, 7);
    if (themeFloor !== 2 && themeFloor !== 7) return; // Only Crimson Crypts (floor 2) and Final Keep

    const queue = floor.reanimationQueue;
    for (let i = queue.length - 1; i >= 0; i--) {
      queue[i].timer -= dt;
      if (queue[i].timer <= 0) {
        const entry = queue[i];
        queue.splice(i, 1);

        // Reanimate with 40% HP
        const def = entry.def;
        const col = Math.floor(entry.x / TS);
        const row = Math.floor(entry.y / TS);
        if (col >= 0 && col < floor.width && row >= 0 && row < floor.height &&
            floor.tiles[row][col] !== TileType.WALL) {
          const e: EnemyInstance = {
            id: state.enemyIdCounter++, def,
            x: entry.x, y: entry.y,
            hp: Math.floor(def.hp * 0.4), maxHp: Math.floor(def.hp * 0.4),
            alive: true, aggroed: true,
            attackCooldown: 1000, stunTurns: 0,
            statusEffects: [], facing: Direction.DOWN,
            pathTarget: null, bossPhase: 0,
            aiAbilityCooldown: 3, aiSummonCooldown: 15,
            aiRallyCooldown: 10, aiHealCooldown: 5,
            bossPhaseTransitioned: [], bossArmorReduction: 0,
            bossEnraged: false, bossShieldThrown: false,
            bossChallengeTimer: 0, rallyDamageBuff: 0, rallyBuffTimer: 0,
          };
          floor.enemies.push(e);
          _onSpawn?.(e);
        }
      }
    }
  },

  reset(): void {
    _onHit = null;
    _onDeath = null;
    _onPlayerHit = null;
    _onLevelUp = null;
    _onLoot = null;
    _onBossPhaseFlash = null;
    _onSpawn = null;
  },
};

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function inFacingCone(facing: Direction, dx: number, dy: number): boolean {
  switch (facing) {
    case Direction.UP:    return dy < 0 || Math.abs(dx) > Math.abs(dy);
    case Direction.DOWN:  return dy > 0 || Math.abs(dx) > Math.abs(dy);
    case Direction.LEFT:  return dx < 0 || Math.abs(dy) > Math.abs(dx);
    case Direction.RIGHT: return dx > 0 || Math.abs(dy) > Math.abs(dx);
  }
  return true;
}

function killEnemy(state: GrailGameState, enemy: EnemyInstance): void {
  if (!enemy.alive) return;
  enemy.alive = false;
  state.totalKills++;

  // Kill streak tracking
  state.killStreakCount++;
  state.killStreakTimer = GameBalance.KILL_STREAK_WINDOW;
  const streakLevel = Math.min(state.killStreakCount - 1, 10); // cap at 10x

  // XP and gold with streak bonus
  const streakXpMult = 1 + streakLevel * GameBalance.KILL_STREAK_XP_BONUS;
  const streakGoldMult = 1 + streakLevel * GameBalance.KILL_STREAK_GOLD_BONUS;
  gainXP(state, Math.floor(enemy.def.xpReward * streakXpMult));
  const goldReward = Math.floor(enemy.def.goldReward * streakGoldMult);
  state.player.gold += goldReward;
  state.totalGold += goldReward;

  if (enemy.def.isBoss) state.killedBosses.push(enemy.def.id);
  _onDeath?.(enemy);

  // Kill streak notification at milestones (visual feedback handled by HUD)

  // Enemy item drop chance (scales with floor difficulty)
  if (!enemy.def.isBoss) {
    const floorNum = state.currentFloor;
    const dropChance = enemy.def.xpReward >= 20 ? 0.12 : 0.06; // stronger enemies drop more
    if (Math.random() < dropChance) {
      const tier = floorNum <= 2 ? "easy" : floorNum <= 5 ? "medium" : "hard";
      const table = LOOT_TABLES[tier];
      if (table) {
        const item = rollLootTable(table);
        if (item) {
          addToInventory(state.player, item);
          _onLoot?.(item, enemy.x, enemy.y);
        }
      }
    }
  }

  // Reanimation: undead enemies come back on Crimson Crypts floors
  const themeFloor = Math.min(state.currentFloor, 7);
  if ((themeFloor === 2 || themeFloor === 7) && enemy.def.category === "undead" && !enemy.def.isBoss) {
    // 60% chance to reanimate, timer 6-10 seconds
    if (Math.random() < 0.6) {
      state.floor.reanimationQueue.push({
        def: enemy.def,
        x: enemy.x,
        y: enemy.y,
        timer: 6 + Math.random() * 4,
      });
    }
  }
}

function gainXP(state: GrailGameState, amount: number): void {
  const p = state.player;
  if (p.equippedRelic?.specialEffect === "xp_boost") amount = Math.floor(amount * 1.3);
  p.xp += amount;
  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext;
    p.level++;
    p.xpToNext = GameBalance.XP_PER_LEVEL(p.level);
    p.maxHp += 8;
    p.hp = Math.min(p.hp + 15, p.maxHp);
    p.attack += 2;
    p.defense += 1;
    if (p.level % 3 === 0) p.speed += 1;
    if (p.level % 5 === 0) p.critChance = Math.min(p.critChance + 0.03, 0.5);
    _onLevelUp?.(p.level);
  }
}

function addToInventory(player: PlayerState, item: ItemDef): void {
  if (item.type === "consumable") {
    const existing = player.inventory.find((i) => i.def.id === item.id);
    if (existing) { existing.quantity++; return; }
  }
  if (player.inventory.length < GameBalance.MAX_INVENTORY_SIZE) {
    player.inventory.push({ def: item, quantity: 1 });
  }
}

function rollLootTable(table: { itemId: string; weight: number }[]): ItemDef | null {
  const totalW = table.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalW;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return ITEM_DEFS[entry.itemId] ?? null;
  }
  return null;
}

function recalcStats(player: PlayerState): void {
  const base = player.knightDef;
  const lvlAtk = (player.level - 1) * 2;
  const lvlDef = (player.level - 1) * 1;
  const lvlHp = (player.level - 1) * 8;
  player.attack = base.attack + lvlAtk + (player.equippedWeapon?.attackBonus ?? 0) + (player.equippedRelic?.attackBonus ?? 0);
  player.defense = base.defense + lvlDef + (player.equippedArmor?.defenseBonus ?? 0) + (player.equippedRelic?.defenseBonus ?? 0);
  player.maxHp = base.maxHp + lvlHp + (player.equippedWeapon?.hpBonus ?? 0) + (player.equippedArmor?.hpBonus ?? 0) + (player.equippedRelic?.hpBonus ?? 0);
  player.hp = Math.min(player.hp, player.maxHp);
  player.speed = base.speed + Math.floor((player.level - 1) / 3) + (player.equippedWeapon?.speedBonus ?? 0) + (player.equippedArmor?.speedBonus ?? 0) + (player.equippedRelic?.speedBonus ?? 0);
}

// ---------------------------------------------------------------------------
// Damage helper
// ---------------------------------------------------------------------------
function enemyDamagePlayer(state: GrailGameState, enemy: EnemyInstance, dmgMultiplier = 1): void {
  const p = state.player;
  if (p.statusEffects.find((e) => e.id === "invulnerable")) return;
  // Dash i-frames: invulnerable while dashing
  if (state.dashTimer > 0) return;
  const def = p.defense + (p.equippedArmor?.defenseBonus ?? 0) + (p.equippedRelic?.defenseBonus ?? 0);
  let baseDmg = enemy.def.attack;
  if (enemy.rallyDamageBuff > 0) baseDmg = Math.floor(baseDmg * (1 + enemy.rallyDamageBuff));
  if (enemy.bossEnraged) baseDmg = Math.floor(baseDmg * 2);
  let dmg = Math.max(1, baseDmg * dmgMultiplier - def * 0.4);
  // Water Shield relic: 25% chance to block an attack entirely
  if (p.equippedRelic?.specialEffect === "water_shield" && Math.random() < 0.25) {
    return; // blocked by water shield
  }
  // Scabbard of Excalibur: no_bleed — halve damage from DOT-style attacks (poison/burn status sources)
  if (p.equippedRelic?.specialEffect === "no_bleed") {
    dmg = Math.floor(dmg * 0.85); // 15% flat damage reduction
  }
  p.hp -= dmg;
  _onPlayerHit?.(dmg);
}

// ---------------------------------------------------------------------------
// Movement helpers
// ---------------------------------------------------------------------------
function moveEnemy(state: GrailGameState, enemy: EnemyInstance, targetX: number, targetY: number, dt: number, speedMult = 1): void {
  const floor = state.floor;
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;
  const speed = GameBalance.ENEMY_MOVE_SPEED * dt * speedMult;
  const ndx = dx / dist, ndy = dy / dist;
  const newX = enemy.x + ndx * speed;
  const newY = enemy.y + ndy * speed;
  const col = Math.floor(newX / TS);
  const row = Math.floor(newY / TS);

  // Direct path clear
  if (col >= 0 && col < floor.width && row >= 0 && row < floor.height && floor.tiles[row][col] !== TileType.WALL) {
    enemy.x = newX;
    enemy.y = newY;
    return;
  }

  // Wall avoidance: try sliding along X and Y axes separately
  const colX = Math.floor(newX / TS);
  const rowCurr = Math.floor(enemy.y / TS);
  if (colX >= 0 && colX < floor.width && rowCurr >= 0 && rowCurr < floor.height &&
      floor.tiles[rowCurr][colX] !== TileType.WALL) {
    enemy.x = newX;
    return;
  }
  const colCurr = Math.floor(enemy.x / TS);
  const rowY = Math.floor(newY / TS);
  if (colCurr >= 0 && colCurr < floor.width && rowY >= 0 && rowY < floor.height &&
      floor.tiles[rowY][colCurr] !== TileType.WALL) {
    enemy.y = newY;
    return;
  }

  // Wall hugging: try perpendicular directions to navigate around obstacles
  const perpX1 = enemy.x + ndy * speed;
  const perpY1 = enemy.y - ndx * speed;
  const perpX2 = enemy.x - ndy * speed;
  const perpY2 = enemy.y + ndx * speed;

  const pc1 = Math.floor(perpX1 / TS), pr1 = Math.floor(perpY1 / TS);
  const pc2 = Math.floor(perpX2 / TS), pr2 = Math.floor(perpY2 / TS);

  // Prefer the perpendicular direction that moves closer to the target
  const d1 = (perpX1 - targetX) ** 2 + (perpY1 - targetY) ** 2;
  const d2 = (perpX2 - targetX) ** 2 + (perpY2 - targetY) ** 2;

  if (d1 <= d2) {
    if (pc1 >= 0 && pc1 < floor.width && pr1 >= 0 && pr1 < floor.height && floor.tiles[pr1][pc1] !== TileType.WALL) {
      enemy.x = perpX1; enemy.y = perpY1; return;
    }
    if (pc2 >= 0 && pc2 < floor.width && pr2 >= 0 && pr2 < floor.height && floor.tiles[pr2][pc2] !== TileType.WALL) {
      enemy.x = perpX2; enemy.y = perpY2; return;
    }
  } else {
    if (pc2 >= 0 && pc2 < floor.width && pr2 >= 0 && pr2 < floor.height && floor.tiles[pr2][pc2] !== TileType.WALL) {
      enemy.x = perpX2; enemy.y = perpY2; return;
    }
    if (pc1 >= 0 && pc1 < floor.width && pr1 >= 0 && pr1 < floor.height && floor.tiles[pr1][pc1] !== TileType.WALL) {
      enemy.x = perpX1; enemy.y = perpY1; return;
    }
  }
}

function moveEnemyAway(state: GrailGameState, enemy: EnemyInstance, awayFromX: number, awayFromY: number, dt: number, speedMult = 1): void {
  // Reuse moveEnemy by computing a target point away from the threat
  const dx = enemy.x - awayFromX;
  const dy = enemy.y - awayFromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;
  const targetX = enemy.x + (dx / dist) * TS * 3;
  const targetY = enemy.y + (dy / dist) * TS * 3;
  moveEnemy(state, enemy, targetX, targetY, dt, speedMult);
}

// ---------------------------------------------------------------------------
// Projectile helper
// ---------------------------------------------------------------------------
function fireProjectile(state: GrailGameState, enemy: EnemyInstance, damage: number, color: number, speed = 200, maxRange = 300): void {
  const p = state.player;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;
  state.floor.projectiles.push({
    x: enemy.x, y: enemy.y,
    vx: (dx / dist) * speed, vy: (dy / dist) * speed,
    damage, color, ownerId: enemy.id,
    lifetime: maxRange / speed, maxRange, distTraveled: 0,
  });
}

// ---------------------------------------------------------------------------
// Spawn minion
// ---------------------------------------------------------------------------
function spawnMinion(state: GrailGameState, defId: string, nearX: number, nearY: number): EnemyInstance | null {
  const def = ENEMY_DEFS[defId];
  if (!def) return null;
  const floor = state.floor;
  const baseCol = Math.floor(nearX / TS);
  const baseRow = Math.floor(nearY / TS);

  for (let attempts = 0; attempts < 8; attempts++) {
    const oc = baseCol + Math.floor(Math.random() * 5) - 2;
    const or2 = baseRow + Math.floor(Math.random() * 5) - 2;
    if (oc < 0 || oc >= floor.width || or2 < 0 || or2 >= floor.height) continue;
    if (floor.tiles[or2][oc] === TileType.WALL) continue;

    const e: EnemyInstance = {
      id: state.enemyIdCounter++, def,
      x: oc * TS + TS / 2, y: or2 * TS + TS / 2,
      hp: def.hp, maxHp: def.hp,
      alive: true, aggroed: true,
      attackCooldown: 500 + Math.random() * 500, stunTurns: 0,
      statusEffects: [], facing: Direction.DOWN,
      pathTarget: null, bossPhase: 0,
      aiAbilityCooldown: 2 + Math.random() * 2, aiSummonCooldown: 10,
      aiRallyCooldown: 8, aiHealCooldown: 4,
      bossPhaseTransitioned: [], bossArmorReduction: 0,
      bossEnraged: false, bossShieldThrown: false,
      bossChallengeTimer: 0, rallyDamageBuff: 0, rallyBuffTimer: 0,
    };
    floor.enemies.push(e);
    _onSpawn?.(e);
    return e;
  }
  return null;
}

// ---------------------------------------------------------------------------
// AI: Melee
// ---------------------------------------------------------------------------
function updateMeleeAI(
  state: GrailGameState, enemy: EnemyInstance, dt: number,
  dist: number, _dx: number, _dy: number,
  surroundTargets: Map<number, { x: number; y: number }>,
): void {
  const p = state.player;
  if (dist < TS * 1.2) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) {
      const behind = isEnemyBehindPlayer(p, enemy);
      enemyDamagePlayer(state, enemy, behind ? 1.5 : 1);
      enemy.attackCooldown = 800 + Math.random() * 400;
    }
  } else {
    const sp = surroundTargets.get(enemy.id);
    moveEnemy(state, enemy, sp ? sp.x : p.x, sp ? sp.y : p.y, dt);
  }
}

// ---------------------------------------------------------------------------
// AI: Ranged
// ---------------------------------------------------------------------------
function updateRangedAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  if (dist < 1.5 * TS) moveEnemyAway(state, enemy, p.x, p.y, dt, 1.3);
  else if (dist < 3 * TS) moveEnemyAway(state, enemy, p.x, p.y, dt, 0.8);
  else if (dist > 5 * TS) moveEnemy(state, enemy, p.x, p.y, dt);

  if (enemy.aiAbilityCooldown <= 0 && dist < 7 * TS) {
    fireProjectile(state, enemy, Math.max(3, enemy.def.attack * 0.6), enemy.def.color, 180, 7 * TS);
    enemy.aiAbilityCooldown = 1.5 + Math.random();
  }
}

// ---------------------------------------------------------------------------
// AI: Tank
// ---------------------------------------------------------------------------
function updateTankAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number, alive: EnemyInstance[]): void {
  const p = state.player;
  if (dist < TS * 1.3) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) {
      enemyDamagePlayer(state, enemy);
      if (enemy.aiAbilityCooldown <= 0) { p.stunTimer = 0.5; enemy.aiAbilityCooldown = 4 + Math.random() * 2; }
      enemy.attackCooldown = 900 + Math.random() * 300;
    }
  } else {
    const w = findWeakerAllyNearby(enemy, alive);
    if (w && dist < 6 * TS) moveEnemy(state, enemy, (p.x + w.x) / 2, (p.y + w.y) / 2, dt, 1.2);
    else moveEnemy(state, enemy, p.x, p.y, dt, 1.2);
  }
}

// ---------------------------------------------------------------------------
// AI: Mage
// ---------------------------------------------------------------------------
function updateMageAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number, alive: EnemyInstance[]): void {
  const p = state.player;
  if (dist < 5 * TS) moveEnemyAway(state, enemy, p.x, p.y, dt, 1.1);
  else if (dist > 8 * TS) moveEnemy(state, enemy, p.x, p.y, dt, 0.7);

  if (enemy.aiAbilityCooldown <= 0 && dist < 10 * TS) {
    if (!p.statusEffects.find(e => e.id === "invulnerable")) {
      const dmg = Math.max(3, enemy.def.attack * 0.5);
      p.hp -= dmg; _onPlayerHit?.(dmg);
    }
    fireProjectile(state, enemy, Math.max(2, enemy.def.attack * 0.3), enemy.def.color, 150, 10 * TS);
    enemy.aiAbilityCooldown = 3 + Math.random();
  }

  if (enemy.aiHealCooldown <= 0) {
    for (const ally of alive) {
      if (ally.id === enemy.id || !ally.alive) continue;
      const ad = Math.sqrt((ally.x - enemy.x) ** 2 + (ally.y - enemy.y) ** 2);
      if (ad < 4 * TS && ally.hp < ally.maxHp * 0.5) {
        ally.hp = Math.min(ally.maxHp, ally.hp + Math.floor(ally.maxHp * 0.15));
        enemy.aiHealCooldown = 5 + Math.random() * 2;
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// AI: Summoner
// ---------------------------------------------------------------------------
function updateSummonerAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number, alive: EnemyInstance[]): void {
  const p = state.player;
  if (dist < 3 * TS) moveEnemyAway(state, enemy, p.x, p.y, dt, 0.8);
  else if (dist > 6 * TS) moveEnemy(state, enemy, p.x, p.y, dt, 0.7);

  if (dist < TS * 1.3) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) { enemyDamagePlayer(state, enemy); enemy.attackCooldown = 900 + Math.random() * 400; }
  }

  if (enemy.aiRallyCooldown <= 0) {
    let r = 0;
    for (const a of alive) {
      if (a.id === enemy.id || !a.alive) continue;
      if (Math.sqrt((a.x - enemy.x) ** 2 + (a.y - enemy.y) ** 2) < 5 * TS) {
        a.rallyDamageBuff = 0.2; a.rallyBuffTimer = 8; r++;
      }
    }
    if (r > 0) enemy.aiRallyCooldown = 10 + Math.random() * 3;
  }

  if (enemy.aiSummonCooldown <= 0) {
    const n = 1 + (Math.random() > 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) spawnMinion(state, "bandit_minion", enemy.x, enemy.y);
    enemy.aiSummonCooldown = 12 + Math.random() * 5;
  }
}

// ---------------------------------------------------------------------------
// Boss AI
// ---------------------------------------------------------------------------
function updateBossAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number, _dx: number, _dy: number): void {
  switch (enemy.def.id) {
    case "mordred": updateMordredAI(state, enemy, dt, dist); break;
    case "morgan_le_fay": updateMorganAI(state, enemy, dt, dist); break;
    case "green_knight": updateGreenKnightAI(state, enemy, dt, dist); break;
    case "questing_beast": updateQuestingBeastAI(state, enemy, dt, dist); break;
    case "black_knight": updateBlackKnightAI(state, enemy, dt, dist); break;
    case "oberon": updateOberonAI(state, enemy, dt, dist); break;
    case "king_rience": updateKingRienceAI(state, enemy, dt, dist); break;
    case "saxon_warlord": updateSaxonWarlordAI(state, enemy, dt, dist); break;
    default: updateGenericBossAI(state, enemy, dt, dist); break;
  }
}

function updateMordredAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  const hr = enemy.hp / enemy.maxHp;
  let sm = 1, acm = 1;

  if (hr <= 0.66 && enemy.bossPhase < 1) {
    enemy.bossPhase = 1;
    if (!enemy.bossPhaseTransitioned[1]) {
      enemy.bossPhaseTransitioned[1] = true;
      _onBossPhaseFlash?.(enemy.def.id, 2, 0x440000);
      spawnMinion(state, "skeleton_minion", enemy.x, enemy.y);
      spawnMinion(state, "skeleton_minion", enemy.x, enemy.y);
    }
    sm = 1.3;
  }
  if (hr <= 0.33 && enemy.bossPhase < 2) {
    enemy.bossPhase = 2;
    if (!enemy.bossPhaseTransitioned[2]) {
      enemy.bossPhaseTransitioned[2] = true;
      _onBossPhaseFlash?.(enemy.def.id, 3, 0xff0000);
      enemy.bossEnraged = true;
    }
    sm = 1.5; acm = 0.5;
  }

  if (dist < TS * 1.5) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) { enemyDamagePlayer(state, enemy); enemy.attackCooldown = (700 + Math.random() * 300) * acm; }
  } else moveEnemy(state, enemy, p.x, p.y, dt, sm);

  if (enemy.aiAbilityCooldown <= 0 && dist < 6 * TS) {
    if (!p.statusEffects.find(e => e.id === "invulnerable")) { p.hp -= 50; _onPlayerHit?.(50); }
    fireProjectile(state, enemy, 0, 0x440000, 250, 6 * TS);
    enemy.aiAbilityCooldown = 5;
  }
}

function updateMorganAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  const hr = enemy.hp / enemy.maxHp;

  if (hr <= 0.5 && !enemy.bossPhaseTransitioned[1]) {
    enemy.bossPhaseTransitioned[1] = true; enemy.bossPhase = 1;
    _onBossPhaseFlash?.(enemy.def.id, 2, 0x8800aa);
    teleportToRandomSpot(state, enemy);
    spawnMinion(state, "fae_pixie_minion", enemy.x, enemy.y);
    spawnMinion(state, "fae_pixie_minion", enemy.x, enemy.y);
  }
  if (hr <= 0.3 && !enemy.bossPhaseTransitioned[2]) {
    enemy.bossPhaseTransitioned[2] = true; enemy.bossPhase = 2;
    _onBossPhaseFlash?.(enemy.def.id, 3, 0xff00ff);
    p.confusionTimer = 2;
    spawnMinion(state, "fae_pixie_minion", enemy.x, enemy.y);
  }

  if (dist < 5 * TS) moveEnemyAway(state, enemy, p.x, p.y, dt);
  else if (dist > 8 * TS) moveEnemy(state, enemy, p.x, p.y, dt, 0.8);

  if (enemy.aiAbilityCooldown <= 0 && dist < 10 * TS) {
    fireProjectile(state, enemy, Math.max(5, enemy.def.attack * 0.5), 0x8800aa, 160, 10 * TS);
    enemy.aiAbilityCooldown = 2.5 + Math.random();
  }
}

function updateGreenKnightAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  const hr = enemy.hp / enemy.maxHp;

  if (!enemy.bossEnraged) enemy.hp = Math.min(enemy.maxHp, enemy.hp + 5 * dt);

  if (hr <= 0.5 && !enemy.bossPhaseTransitioned[1]) {
    enemy.bossPhaseTransitioned[1] = true; enemy.bossPhase = 1;
    _onBossPhaseFlash?.(enemy.def.id, 2, 0x00ff00);
    enemy.bossChallengeTimer = 10;
    for (const o of state.floor.enemies) if (o.id !== enemy.id && o.alive) o.stunTurns = 10;
  }
  if (hr <= 0.25 && !enemy.bossPhaseTransitioned[2]) {
    enemy.bossPhaseTransitioned[2] = true; enemy.bossPhase = 2;
    _onBossPhaseFlash?.(enemy.def.id, 3, 0xff4400);
    enemy.bossEnraged = true;
  }

  if (dist < TS * 1.5) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) { enemyDamagePlayer(state, enemy); enemy.attackCooldown = 800 + Math.random() * 300; }
  } else moveEnemy(state, enemy, p.x, p.y, dt);
}

function updateQuestingBeastAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  const hr = enemy.hp / enemy.maxHp;

  if (hr <= 0.5 && !enemy.bossPhaseTransitioned[1]) {
    enemy.bossPhaseTransitioned[1] = true; enemy.bossPhase = 1;
    _onBossPhaseFlash?.(enemy.def.id, 2, 0xaaaa00);
    spawnMinion(state, "beast_copy", enemy.x - TS, enemy.y);
    spawnMinion(state, "beast_copy", enemy.x + TS, enemy.y);
  }

  // Poison trail
  const tc = Math.floor(enemy.x / TS), tr = Math.floor(enemy.y / TS);
  if (!state.floor.poisonTrails.find(t => t.col === tc && t.row === tr)) {
    state.floor.poisonTrails.push({ col: tc, row: tr, timer: 5, damage: 8 });
  }

  if (dist < TS * 1.3) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) { enemyDamagePlayer(state, enemy); enemy.attackCooldown = 600 + Math.random() * 200; }
  } else moveEnemy(state, enemy, p.x, p.y, dt, 2.0);
}

function updateBlackKnightAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  const hr = enemy.hp / enemy.maxHp;

  if (hr <= 0.33 && !enemy.bossPhaseTransitioned[1]) {
    enemy.bossPhaseTransitioned[1] = true; enemy.bossPhase = 1;
    _onBossPhaseFlash?.(enemy.def.id, 2, 0x888888);
    enemy.bossShieldThrown = true; enemy.bossArmorReduction = 0;
    fireProjectile(state, enemy, 40, 0x888888, 300, 10 * TS);
  }

  if (dist < TS * 1.5) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) {
      enemyDamagePlayer(state, enemy);
      if (enemy.aiAbilityCooldown <= 0 && !enemy.bossShieldThrown) { p.stunTimer = 1; enemy.aiAbilityCooldown = 4; }
      enemy.attackCooldown = 900 + Math.random() * 300;
    }
  } else moveEnemy(state, enemy, p.x, p.y, dt, 0.8);

  if (enemy.bossShieldThrown && enemy.aiAbilityCooldown <= 0 && dist > 2 * TS && dist < 8 * TS) {
    fireProjectile(state, enemy, 25, 0x666666, 250, 8 * TS);
    enemy.aiAbilityCooldown = 3;
  }
}

// ---------------------------------------------------------------------------
// Boss AI: Oberon, King of Faerie
// Phase 1: Teleport + fae storm projectiles, summon fae minions
// Phase 2: Glamour — confusion + illusion spawning
// Phase 3: Time warp — massive speed + attack boost
// ---------------------------------------------------------------------------
function updateOberonAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  const hr = enemy.hp / enemy.maxHp;

  // Phase 2: Glamour — confusion + summon more fae
  if (hr <= 0.6 && !enemy.bossPhaseTransitioned[1]) {
    enemy.bossPhaseTransitioned[1] = true; enemy.bossPhase = 1;
    _onBossPhaseFlash?.(enemy.def.id, 2, 0x00ffaa);
    p.confusionTimer = 4; // Heavy confusion
    teleportToRandomSpot(state, enemy);
    spawnMinion(state, "fae_pixie_minion", enemy.x, enemy.y);
    spawnMinion(state, "fae_pixie_minion", enemy.x, enemy.y);
    spawnMinion(state, "fae_pixie_minion", enemy.x, enemy.y);
  }

  // Phase 3: Time warp — enraged, very fast
  if (hr <= 0.25 && !enemy.bossPhaseTransitioned[2]) {
    enemy.bossPhaseTransitioned[2] = true; enemy.bossPhase = 2;
    _onBossPhaseFlash?.(enemy.def.id, 3, 0xffff00);
    enemy.bossEnraged = true;
    // Teleport spam: stun player briefly
    p.stunTimer = 1.5;
    teleportToRandomSpot(state, enemy);
  }

  // Movement: stay at range, teleport when cornered
  const speedMult = enemy.bossPhase >= 2 ? 2.5 : 1.5;
  if (dist < 3 * TS) {
    moveEnemyAway(state, enemy, p.x, p.y, dt, speedMult);
    // Teleport away if too close and phase 1+
    if (dist < 1.5 * TS && enemy.aiAbilityCooldown <= 0) {
      teleportToRandomSpot(state, enemy);
      enemy.aiAbilityCooldown = 2;
    }
  } else if (dist > 8 * TS) {
    moveEnemy(state, enemy, p.x, p.y, dt, speedMult);
  }

  // Fae storm: rapid multi-directional projectiles
  if (enemy.aiAbilityCooldown <= 0 && dist < 10 * TS) {
    const numProjectiles = enemy.bossPhase >= 2 ? 6 : 3;
    for (let i = 0; i < numProjectiles; i++) {
      const angle = (i / numProjectiles) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 160 + Math.random() * 60;
      state.floor.projectiles.push({
        x: enemy.x, y: enemy.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        damage: Math.max(4, enemy.def.attack * 0.35),
        color: 0x00ffaa, ownerId: enemy.id,
        lifetime: 3, maxRange: 10 * TS, distTraveled: 0,
      });
    }
    enemy.aiAbilityCooldown = enemy.bossPhase >= 2 ? 1.5 : 3;
  }

  // Periodic confusion in phase 2+
  if (enemy.bossPhase >= 1 && enemy.aiHealCooldown <= 0) {
    if (p.confusionTimer <= 0) p.confusionTimer = 1.5;
    enemy.aiHealCooldown = 6 + Math.random() * 3;
  }

  // Summon fae minions periodically
  if (enemy.aiSummonCooldown <= 0) {
    spawnMinion(state, "fae_pixie_minion", enemy.x, enemy.y);
    if (enemy.bossPhase >= 1) spawnMinion(state, "fae_pixie_minion", enemy.x, enemy.y);
    enemy.aiSummonCooldown = enemy.bossPhase >= 2 ? 8 : 14;
  }
}

// ---------------------------------------------------------------------------
// Boss AI: King Rience
// Phase 1: War cry buffs nearby allies, shield wall defense
// Phase 2: Execute — devastating single hits on low-HP player
// ---------------------------------------------------------------------------
function updateKingRienceAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  const hr = enemy.hp / enemy.maxHp;

  // Phase 2: Execute mode
  if (hr <= 0.4 && !enemy.bossPhaseTransitioned[1]) {
    enemy.bossPhaseTransitioned[1] = true; enemy.bossPhase = 1;
    _onBossPhaseFlash?.(enemy.def.id, 2, 0xff4400);
    enemy.bossEnraged = true;
    // War cry: buff all allies significantly
    for (const ally of state.floor.enemies) {
      if (ally.id !== enemy.id && ally.alive) {
        ally.rallyDamageBuff = 0.4; ally.rallyBuffTimer = 15;
      }
    }
    // Summon elite guards
    spawnMinion(state, "knight_soldier", enemy.x, enemy.y);
    spawnMinion(state, "knight_soldier", enemy.x, enemy.y);
  }

  // Shield wall: damage reduction until phase 2
  if (!enemy.bossPhaseTransitioned[1]) {
    enemy.bossArmorReduction = 0.3; // 30% damage reduction
  }

  // Melee combat
  if (dist < TS * 1.5) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) {
      // Execute: bonus damage when player is below 30% HP
      const execMult = (enemy.bossPhase >= 1 && p.hp < p.maxHp * 0.3) ? 2.5 : 1;
      enemyDamagePlayer(state, enemy, execMult);
      enemy.attackCooldown = enemy.bossPhase >= 1 ? 600 : 900;
    }
  } else {
    moveEnemy(state, enemy, p.x, p.y, dt, enemy.bossPhase >= 1 ? 1.4 : 1.0);
  }

  // Rally cry: periodically buff allies
  if (enemy.aiRallyCooldown <= 0) {
    let buffed = 0;
    for (const ally of state.floor.enemies) {
      if (ally.id !== enemy.id && ally.alive && Math.sqrt((ally.x - enemy.x) ** 2 + (ally.y - enemy.y) ** 2) < 6 * TS) {
        ally.rallyDamageBuff = 0.25; ally.rallyBuffTimer = 10; buffed++;
      }
    }
    if (buffed > 0) enemy.aiRallyCooldown = 8 + Math.random() * 3;
  }

  // Summon soldiers
  if (enemy.aiSummonCooldown <= 0) {
    spawnMinion(state, "knight_soldier", enemy.x, enemy.y);
    enemy.aiSummonCooldown = 15 + Math.random() * 5;
  }
}

// ---------------------------------------------------------------------------
// Boss AI: Saxon Warlord
// Phase 1: Berserker rage — faster attacks, summon saxon warriors
// Phase 2: Shield wall + rally all allies + devastating charge
// ---------------------------------------------------------------------------
function updateSaxonWarlordAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  const hr = enemy.hp / enemy.maxHp;

  // Phase 2: Berserker rage
  if (hr <= 0.5 && !enemy.bossPhaseTransitioned[1]) {
    enemy.bossPhaseTransitioned[1] = true; enemy.bossPhase = 1;
    _onBossPhaseFlash?.(enemy.def.id, 2, 0xff6600);
    enemy.bossEnraged = true;
    // Summon a wave of warriors
    for (let i = 0; i < 3; i++) {
      spawnMinion(state, "bandit_minion", enemy.x, enemy.y);
    }
    // Rally all existing allies
    for (const ally of state.floor.enemies) {
      if (ally.id !== enemy.id && ally.alive) {
        ally.rallyDamageBuff = 0.3; ally.rallyBuffTimer = 12;
      }
    }
  }

  // Melee: aggressive with shield bash stun
  if (dist < TS * 1.5) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) {
      enemyDamagePlayer(state, enemy);
      // Shield bash stun (20% chance, or guaranteed in phase 2 every 3rd hit)
      if (enemy.aiAbilityCooldown <= 0) {
        p.stunTimer = 0.8;
        enemy.aiAbilityCooldown = enemy.bossPhase >= 1 ? 3 : 5;
      }
      enemy.attackCooldown = enemy.bossPhase >= 1 ? 500 : 800;
    }
  } else {
    // Charge: move fast when far away
    const chargeMult = dist > 4 * TS ? 2.0 : (enemy.bossPhase >= 1 ? 1.5 : 1.0);
    moveEnemy(state, enemy, p.x, p.y, dt, chargeMult);
  }

  // Periodic rally
  if (enemy.aiRallyCooldown <= 0) {
    for (const ally of state.floor.enemies) {
      if (ally.id !== enemy.id && ally.alive && Math.sqrt((ally.x - enemy.x) ** 2 + (ally.y - enemy.y) ** 2) < 6 * TS) {
        ally.rallyDamageBuff = 0.2; ally.rallyBuffTimer = 8;
      }
    }
    enemy.aiRallyCooldown = 10;
  }

  // Summon reinforcements
  if (enemy.aiSummonCooldown <= 0) {
    spawnMinion(state, "bandit_minion", enemy.x, enemy.y);
    if (enemy.bossPhase >= 1) spawnMinion(state, "bandit_minion", enemy.x, enemy.y);
    enemy.aiSummonCooldown = 12 + Math.random() * 4;
  }
}

function updateGenericBossAI(state: GrailGameState, enemy: EnemyInstance, dt: number, dist: number): void {
  const p = state.player;
  if (dist < TS * 1.5) {
    enemy.attackCooldown -= dt * 1000;
    if (enemy.attackCooldown <= 0) { enemyDamagePlayer(state, enemy); enemy.attackCooldown = 800 + Math.random() * 400; }
  } else moveEnemy(state, enemy, p.x, p.y, dt);

  if (enemy.aiSummonCooldown <= 0) { spawnMinion(state, "skeleton_minion", enemy.x, enemy.y); enemy.aiSummonCooldown = 15 + Math.random() * 5; }
  if (enemy.aiAbilityCooldown <= 0 && dist > 2 * TS && dist < 8 * TS) {
    fireProjectile(state, enemy, Math.max(5, enemy.def.attack * 0.4), enemy.def.color, 180, 8 * TS);
    enemy.aiAbilityCooldown = 4;
  }
}

function checkBossPhaseTransition(_state: GrailGameState, _enemy: EnemyInstance): void {
  // Phase transitions are handled in the specific boss AI update functions
}

function teleportToRandomSpot(state: GrailGameState, enemy: EnemyInstance): void {
  const floor = state.floor;
  for (let a = 0; a < 20; a++) {
    const c = Math.floor(Math.random() * floor.width);
    const r = Math.floor(Math.random() * floor.height);
    if (floor.tiles[r][c] !== TileType.WALL && floor.tiles[r][c] !== TileType.TRAP) {
      enemy.x = c * TS + TS / 2; enemy.y = r * TS + TS / 2; return;
    }
  }
}

// ---------------------------------------------------------------------------
// Projectile system
// ---------------------------------------------------------------------------
function updateProjectiles(state: GrailGameState, dt: number): void {
  const p = state.player;
  const floor = state.floor;
  for (let i = floor.projectiles.length - 1; i >= 0; i--) {
    const pr = floor.projectiles[i];
    const mx = pr.vx * dt, my = pr.vy * dt;
    pr.x += mx; pr.y += my;
    pr.distTraveled += Math.sqrt(mx * mx + my * my);
    pr.lifetime -= dt;

    const c = Math.floor(pr.x / TS), r = Math.floor(pr.y / TS);
    if (c < 0 || c >= floor.width || r < 0 || r >= floor.height || floor.tiles[r][c] === TileType.WALL) {
      floor.projectiles.splice(i, 1); continue;
    }
    if (pr.lifetime <= 0 || pr.distTraveled >= pr.maxRange) { floor.projectiles.splice(i, 1); continue; }

    const pd = Math.sqrt((pr.x - p.x) ** 2 + (pr.y - p.y) ** 2);
    if (pd < TS * 0.5) {
      if (!p.statusEffects.find(e => e.id === "invulnerable") && state.dashTimer <= 0 && pr.damage > 0) {
        const d = p.defense + (p.equippedArmor?.defenseBonus ?? 0) + (p.equippedRelic?.defenseBonus ?? 0);
        p.hp -= Math.max(1, pr.damage - d * 0.3);
        _onPlayerHit?.(Math.max(1, pr.damage - d * 0.3));
      }
      floor.projectiles.splice(i, 1);
    }
  }
}

function updatePoisonTrails(state: GrailGameState, dt: number): void {
  for (let i = state.floor.poisonTrails.length - 1; i >= 0; i--) {
    state.floor.poisonTrails[i].timer -= dt;
    if (state.floor.poisonTrails[i].timer <= 0) state.floor.poisonTrails.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Group tactics
// ---------------------------------------------------------------------------
function computeGroupTactics(player: PlayerState, aggroed: EnemyInstance[]): Map<number, { x: number; y: number }> {
  const result = new Map<number, { x: number; y: number }>();
  const nearby = aggroed.filter(e => {
    if (e.def.aiType !== "melee" && !e.def.isBoss) return false;
    return Math.sqrt((e.x - player.x) ** 2 + (e.y - player.y) ** 2) < 6 * TS;
  });
  if (nearby.length < 3) return result;
  const n = Math.min(nearby.length, 6);
  nearby.sort((a, b) => ((a.x - player.x) ** 2 + (a.y - player.y) ** 2) - ((b.x - player.x) ** 2 + (b.y - player.y) ** 2));
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    result.set(nearby[i].id, { x: player.x + Math.cos(ang) * TS * 1.5, y: player.y + Math.sin(ang) * TS * 1.5 });
  }
  return result;
}

function isEnemyBehindPlayer(player: PlayerState, enemy: EnemyInstance): boolean {
  const dx = enemy.x - player.x, dy = enemy.y - player.y;
  switch (player.facing) {
    case Direction.UP: return dy > 0;
    case Direction.DOWN: return dy < 0;
    case Direction.LEFT: return dx > 0;
    case Direction.RIGHT: return dx < 0;
  }
  return false;
}

function findWeakerAllyNearby(tank: EnemyInstance, alive: EnemyInstance[]): EnemyInstance | null {
  let w: EnemyInstance | null = null, mh = Infinity;
  for (const a of alive) {
    if (a.id === tank.id || a.def.aiType === "tank") continue;
    const d = Math.sqrt((a.x - tank.x) ** 2 + (a.y - tank.y) ** 2);
    if (d < 5 * TS && a.hp < mh) { w = a; mh = a.hp; }
  }
  return w;
}
