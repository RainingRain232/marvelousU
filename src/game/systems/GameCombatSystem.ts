// ---------------------------------------------------------------------------
// Quest for the Grail — Combat System
// Handles melee attacks, abilities, damage calculation, enemy AI, status
// effects, leveling, item usage, and boss phases.
// ---------------------------------------------------------------------------

import {
  GameBalance, TileType,
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

let _onHit: HitCB | null = null;
let _onDeath: DeathCB | null = null;
let _onPlayerHit: PlayerHitCB | null = null;
let _onLevelUp: LevelUpCB | null = null;
let _onLoot: LootCB | null = null;

export const GameCombatSystem = {
  setHitCallback(cb: HitCB | null) { _onHit = cb; },
  setDeathCallback(cb: DeathCB | null) { _onDeath = cb; },
  setPlayerHitCallback(cb: PlayerHitCB | null) { _onPlayerHit = cb; },
  setLevelUpCallback(cb: LevelUpCB | null) { _onLevelUp = cb; },
  setLootCallback(cb: LootCB | null) { _onLoot = cb; },

  // -------------------------------------------------------------------------
  // Player attacks nearest enemy in facing direction
  // -------------------------------------------------------------------------
  playerAttack(state: GrailGameState): void {
    const p = state.player;
    if (p.attackCooldown > 0) return;

    const range = GameBalance.TILE_SIZE * 1.5;
    const targets = state.floor.enemies.filter((e) => {
      if (!e.alive) return false;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) return false;
      // Check facing direction loosely
      return inFacingCone(p.facing, dx, dy);
    });

    if (targets.length === 0) return;

    // Sort by distance, hit closest
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

    // Apply special weapon effects
    if (p.equippedWeapon?.specialEffect === "holy_smite" && target.def.category === "undead") {
      damage = Math.floor(damage * 1.5);
    }

    target.hp -= damage;
    _onHit?.(target.x, target.y, damage, isCrit);

    if (target.hp <= 0) {
      target.alive = false;
      state.totalKills++;
      gainXP(state, target.def.xpReward);
      p.gold += target.def.goldReward;
      state.totalGold += target.def.goldReward;
      if (target.def.isBoss) {
        state.killedBosses.push(target.def.id);
      }
      _onDeath?.(target);
    }

    p.attackCooldown = GameBalance.ATTACK_COOLDOWN_MS;
  },

  // -------------------------------------------------------------------------
  // Player uses special ability
  // -------------------------------------------------------------------------
  playerAbility(state: GrailGameState): void {
    const p = state.player;
    if (p.abilityCooldown > 0) return;

    const ability = p.knightDef.ability;
    const range = ability.range * GameBalance.TILE_SIZE;
    const aoeRange = ability.aoe * GameBalance.TILE_SIZE;

    // Heal abilities
    if (ability.healAmount > 0) {
      p.hp = Math.min(p.maxHp, p.hp + ability.healAmount);
    }

    // Damage abilities
    if (ability.damage > 0) {
      const targets = state.floor.enemies.filter((e) => {
        if (!e.alive) return false;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= (range > 0 ? range * GameBalance.TILE_SIZE : GameBalance.TILE_SIZE * 2);
      });

      for (const t of targets) {
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (aoeRange > 0 || dist <= GameBalance.TILE_SIZE * 2) {
          const dmg = Math.max(1, ability.damage - t.def.defense * 0.3);
          t.hp -= dmg;
          _onHit?.(t.x, t.y, dmg, false);

          // Apply status effect
          if (ability.effect === "stun") {
            t.stunTurns = 2;
          } else if (ability.effect === "poison") {
            t.statusEffects.push({ id: "poison", turnsRemaining: 4, value: 5 });
          } else if (ability.effect === "burn") {
            t.statusEffects.push({ id: "burn", turnsRemaining: 3, value: 8 });
          }

          if (t.hp <= 0) {
            t.alive = false;
            state.totalKills++;
            gainXP(state, t.def.xpReward);
            p.gold += t.def.goldReward;
            state.totalGold += t.def.goldReward;
            if (t.def.isBoss) state.killedBosses.push(t.def.id);
            _onDeath?.(t);
          }
        }
      }
    }

    // Buff effects
    if (ability.effect === "buff_atk") {
      p.statusEffects.push({ id: "buff_atk", turnsRemaining: 5, value: 8 });
    }
    if (ability.effect === "invulnerable") {
      p.statusEffects.push({ id: "invulnerable", turnsRemaining: 2, value: 0 });
    }
    if (ability.effect === "purify") {
      p.statusEffects = p.statusEffects.filter((e) => e.id === "buff_atk" || e.id === "invulnerable");
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
            e.alive = false;
            state.totalKills++;
            gainXP(state, e.def.xpReward);
            _onDeath?.(e);
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
      // Unequip current weapon back to inventory
      if (p.equippedWeapon) {
        addToInventory(p, p.equippedWeapon);
      }
      p.equippedWeapon = def;
      p.inventory.splice(index, 1);
      recalcStats(p);
    } else if (def.type === "armor") {
      if (p.equippedArmor) {
        addToInventory(p, p.equippedArmor);
      }
      p.equippedArmor = def;
      p.inventory.splice(index, 1);
      recalcStats(p);
    } else if (def.type === "relic") {
      if (p.equippedRelic) {
        addToInventory(p, p.equippedRelic);
      }
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
    _onLoot?.(chest.item, col * GameBalance.TILE_SIZE, row * GameBalance.TILE_SIZE);
  },

  // -------------------------------------------------------------------------
  // Enemy AI tick
  // -------------------------------------------------------------------------
  updateEnemies(state: GrailGameState, dt: number): void {
    const p = state.player;
    const floor = state.floor;
    const aggroRange = GameBalance.ENEMY_AGGRO_RANGE * GameBalance.TILE_SIZE;

    for (const enemy of floor.enemies) {
      if (!enemy.alive) continue;
      if (enemy.stunTurns > 0) continue; // stunned, skip

      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Aggro check
      if (!enemy.aggroed && dist < aggroRange) {
        enemy.aggroed = true;
      }
      // Boss always aggroed
      if (enemy.def.isBoss) enemy.aggroed = true;

      if (!enemy.aggroed) continue;

      // Attack if in range
      const attackRange = GameBalance.TILE_SIZE * 1.2;
      if (dist < attackRange) {
        enemy.attackCooldown -= dt * 1000;
        if (enemy.attackCooldown <= 0) {
          // Check invulnerability
          const invuln = p.statusEffects.find((e) => e.id === "invulnerable");
          if (!invuln) {
            const def = p.defense + (p.equippedArmor?.defenseBonus ?? 0) + (p.equippedRelic?.defenseBonus ?? 0);
            const dmg = Math.max(1, enemy.def.attack - def * 0.4);
            p.hp -= dmg;
            _onPlayerHit?.(dmg);
          }
          enemy.attackCooldown = 800 + Math.random() * 400;
        }
      } else {
        // Move toward player
        const speed = GameBalance.ENEMY_MOVE_SPEED * dt;
        const nx = dx / dist;
        const ny = dy / dist;

        const newX = enemy.x + nx * speed;
        const newY = enemy.y + ny * speed;

        // Simple wall collision check
        const col = Math.floor(newX / GameBalance.TILE_SIZE);
        const row = Math.floor(newY / GameBalance.TILE_SIZE);
        if (col >= 0 && col < floor.width && row >= 0 && row < floor.height) {
          const tile = floor.tiles[row][col];
          if (tile !== TileType.WALL) {
            enemy.x = newX;
            enemy.y = newY;
          }
        }

        // Update facing
        if (Math.abs(dx) > Math.abs(dy)) {
          enemy.facing = dx > 0 ? Direction.RIGHT : Direction.LEFT;
        } else {
          enemy.facing = dy > 0 ? Direction.DOWN : Direction.UP;
        }
      }
    }

    // Process status effects on enemies
    for (const enemy of floor.enemies) {
      if (!enemy.alive) continue;
      for (let i = enemy.statusEffects.length - 1; i >= 0; i--) {
        const eff = enemy.statusEffects[i];
        if (eff.id === "poison" || eff.id === "burn") {
          enemy.hp -= eff.value * dt;
          if (enemy.hp <= 0) {
            enemy.alive = false;
            state.totalKills++;
            gainXP(state, enemy.def.xpReward);
            _onDeath?.(enemy);
          }
        }
        eff.turnsRemaining -= dt;
        if (eff.turnsRemaining <= 0) {
          enemy.statusEffects.splice(i, 1);
        }
      }
      // Decrement stun
      if (enemy.stunTurns > 0) {
        enemy.stunTurns -= dt;
        if (enemy.stunTurns < 0) enemy.stunTurns = 0;
      }
    }
  },

  // -------------------------------------------------------------------------
  // Check traps
  // -------------------------------------------------------------------------
  checkTraps(state: GrailGameState): void {
    const p = state.player;
    const col = Math.floor(p.x / GameBalance.TILE_SIZE);
    const row = Math.floor(p.y / GameBalance.TILE_SIZE);
    const floor = state.floor;
    if (col >= 0 && col < floor.width && row >= 0 && row < floor.height) {
      if (floor.tiles[row][col] === TileType.TRAP) {
        const invuln = p.statusEffects.find((e) => e.id === "invulnerable");
        if (!invuln) {
          p.hp -= GameBalance.TRAP_DAMAGE;
          _onPlayerHit?.(GameBalance.TRAP_DAMAGE);
        }
        floor.tiles[row][col] = TileType.FLOOR; // disarm after trigger
      }
    }
  },

  // -------------------------------------------------------------------------
  // Check if player is on stairs
  // -------------------------------------------------------------------------
  checkStairs(state: GrailGameState): boolean {
    const p = state.player;
    const col = Math.floor(p.x / GameBalance.TILE_SIZE);
    const row = Math.floor(p.y / GameBalance.TILE_SIZE);
    return col === state.floor.stairsPos.col && row === state.floor.stairsPos.row;
  },

  // -------------------------------------------------------------------------
  // Check if player is on treasure
  // -------------------------------------------------------------------------
  checkTreasure(state: GrailGameState): boolean {
    const p = state.player;
    const col = Math.floor(p.x / GameBalance.TILE_SIZE);
    const row = Math.floor(p.y / GameBalance.TILE_SIZE);
    const chest = state.floor.treasures.find((t) => t.col === col && t.row === row && !t.opened);
    return !!chest;
  },

  // Reset callbacks
  reset(): void {
    _onHit = null;
    _onDeath = null;
    _onPlayerHit = null;
    _onLevelUp = null;
    _onLoot = null;
  },
};

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function inFacingCone(facing: Direction, dx: number, dy: number): boolean {
  // Generous 180-degree cone in the facing direction
  switch (facing) {
    case Direction.UP:    return dy < 0 || Math.abs(dx) > Math.abs(dy);
    case Direction.DOWN:  return dy > 0 || Math.abs(dx) > Math.abs(dy);
    case Direction.LEFT:  return dx < 0 || Math.abs(dy) > Math.abs(dx);
    case Direction.RIGHT: return dx > 0 || Math.abs(dy) > Math.abs(dx);
  }
  return true;
}

function gainXP(state: GrailGameState, amount: number): void {
  const p = state.player;
  // XP boost from Round Table Seal
  if (p.equippedRelic?.specialEffect === "xp_boost") {
    amount = Math.floor(amount * 1.3);
  }
  p.xp += amount;
  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext;
    p.level++;
    p.xpToNext = GameBalance.XP_PER_LEVEL(p.level);
    // Stat gains on level up
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
    if (existing) {
      existing.quantity++;
      return;
    }
  }
  if (player.inventory.length < GameBalance.MAX_INVENTORY_SIZE) {
    player.inventory.push({ def: item, quantity: 1 });
  }
  // If full, just drop it (could add a UI prompt later)
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

  const weaponSpd = player.equippedWeapon?.speedBonus ?? 0;
  const armorSpd = player.equippedArmor?.speedBonus ?? 0;
  const relicSpd = player.equippedRelic?.speedBonus ?? 0;
  player.speed = base.speed + Math.floor((player.level - 1) / 3) + weaponSpd + armorSpd + relicSpd;
}
