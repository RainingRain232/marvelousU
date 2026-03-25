// ---------------------------------------------------------------------------
// Merlin's Duel — Core game systems
// Player movement, spell casting, projectile physics, enemy AI, shop, rounds
// ---------------------------------------------------------------------------

import { DuelPhase, Element, SpellId } from "../types";
import type { DuelState, Projectile, Spell } from "../types";
import { DUEL_BALANCE as B, SPELL_DEFS, OPPONENTS, SHOP_ITEMS, getElementColor } from "../config/DuelBalance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spawnParticle(state: DuelState, x: number, y: number, vx: number, vy: number, color: number, size: number): void {
  state.particles.push({ x, y, vx, vy, life: B.PARTICLE_LIFETIME, maxLife: B.PARTICLE_LIFETIME, color, size });
}

function spawnParticles(state: DuelState, x: number, y: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, spd = 40 + Math.random() * 80;
    spawnParticle(state, x, y, Math.cos(a) * spd, Math.sin(a) * spd, color, 2 + Math.random() * 4);
  }
}

function spawnDamageText(state: DuelState, x: number, y: number, text: string, color: number): void {
  state.particles.push({
    x, y, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 30,
    life: 1.0, maxLife: 1.0, color, size: 4, text,
  });
}

function updateParticles(state: DuelState, dt: number): void {
  for (const p of state.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.95; p.vy *= 0.95;
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

function clampY(y: number): number {
  return Math.max(B.ARENA_TOP + B.WIZARD_RADIUS, Math.min(B.ARENA_BOTTOM - B.WIZARD_RADIUS, y));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------------------------
// Main update (called each frame during FIGHTING)
// ---------------------------------------------------------------------------

export function updateDuel(state: DuelState, dt: number): void {
  if (state.phase !== DuelPhase.FIGHTING) return;

  state.time += dt;

  // Stun check — player can't move or cast while stunned
  if (state.stunTimer > 0) state.stunTimer -= dt;

  // Player movement
  if (state.stunTimer <= 0) {
    let dy = 0;
    if (state.moveUp) dy -= 1;
    if (state.moveDown) dy += 1;

    // Apply slow effect
    const slowMult = Object.keys(state.slowTimers).length > 0 ? 0.5 : 1.0;
    state.playerY += dy * B.PLAYER_MOVE_SPEED * slowMult * dt;
    state.playerY = clampY(state.playerY);
  }

  // Mana regen
  state.playerMana = Math.min(state.playerMaxMana, state.playerMana + state.playerManaRegen * dt);

  // Shield mana drain
  if (state.shieldActive) {
    const drainRate = B.SHIELD_DRAIN_RATE * (1.0 - state.shieldEfficiency);
    state.playerMana -= drainRate * dt;
    if (state.playerMana <= 0) {
      state.playerMana = 0;
      state.shieldActive = false;
    }
  }

  // Enemy mana regen
  if (state.enemy) {
    state.enemy.mana = Math.min(state.enemy.maxMana, state.enemy.mana + state.enemy.manaRegen * dt);
  }

  // Update cooldowns
  for (const key of Object.keys(state.playerCooldowns)) {
    state.playerCooldowns[key] -= dt;
    if (state.playerCooldowns[key] <= 0) delete state.playerCooldowns[key];
  }

  // Burn DoTs
  for (const target of Object.keys(state.burnTimers)) {
    state.burnTimers[target] -= dt;
    if (state.burnTimers[target] <= 0) {
      delete state.burnTimers[target];
    } else {
      // 5 dps burn
      if (target === "player") {
        state.playerHp -= 5 * dt;
      } else if (state.enemy) {
        state.enemy.hp -= 5 * dt;
      }
    }
  }

  // Slow timers
  for (const target of Object.keys(state.slowTimers)) {
    state.slowTimers[target] -= dt;
    if (state.slowTimers[target] <= 0) delete state.slowTimers[target];
  }

  // Update projectiles
  updateProjectiles(state, dt);

  // Enemy AI
  runEnemyAI(state, dt);

  // Particles
  updateParticles(state, dt);

  // Screen effects decay
  if (state.screenShake > 0) state.screenShake -= dt;
  if (state.screenFlash > 0) state.screenFlash -= dt;

  // Win/loss check
  if (state.enemy && state.enemy.hp <= 0) {
    state.enemy.hp = 0;
    state.enemy.defeated = true;
    endRound(state, true);
  }
  if (state.playerHp <= 0) {
    state.playerHp = 0;
    endRound(state, false);
  }
}

// ---------------------------------------------------------------------------
// Projectile update
// ---------------------------------------------------------------------------

function updateProjectiles(state: DuelState, dt: number): void {
  const toRemove: number[] = [];

  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i];
    p.age += dt;

    // Homing for arcane missiles
    if (p.spell === SpellId.ARCANE_MISSILE) {
      const targetY = p.fromPlayer
        ? (state.enemy ? state.enemy.y : state.playerY)
        : state.playerY;
      const homingStrength = 200;
      if (targetY > p.y) p.vy += homingStrength * dt;
      else p.vy -= homingStrength * dt;
      // Clamp vy to avoid wild oscillation
      p.vy = Math.max(-150, Math.min(150, p.vy));
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Bounds check
    if (p.x < -20 || p.x > B.CANVAS_W + 20 || p.y < B.ARENA_TOP - 30 || p.y > B.ARENA_BOTTOM + 30 || p.age > B.PROJECTILE_MAX_AGE) {
      toRemove.push(i);
      continue;
    }

    // Collision with player (enemy projectiles)
    if (!p.fromPlayer) {
      const d = dist(p.x, p.y, B.PLAYER_X, state.playerY);
      if (d < p.size + B.WIZARD_RADIUS) {
        hitWizard(state, p, true);
        toRemove.push(i);
        continue;
      }
    }

    // Collision with enemy (player projectiles)
    if (p.fromPlayer && state.enemy) {
      const d = dist(p.x, p.y, B.ENEMY_X, state.enemy.y);
      if (d < p.size + B.WIZARD_RADIUS) {
        hitWizard(state, p, false);

        // Chain lightning: spawn secondary
        if (p.spell === SpellId.CHAIN_LIGHTNING) {
          const def = SPELL_DEFS[SpellId.CHAIN_LIGHTNING];
          const offY = (Math.random() - 0.5) * 120;
          state.projectiles.push({
            x: p.x, y: p.y,
            vx: -def.speed * 0.7, vy: offY,
            spell: SpellId.LIGHTNING_BOLT, fromPlayer: true,
            age: 0, element: Element.LIGHTNING,
            size: def.size * 0.7, damage: def.damage * 0.5,
          });
        }

        // Mana burst: restore mana on hit
        if (p.spell === SpellId.MANA_BURST) {
          state.playerMana = Math.min(state.playerMaxMana, state.playerMana + 20);
          spawnDamageText(state, B.PLAYER_X, state.playerY, "+20 MANA", B.COLOR_ARCANE);
        }

        toRemove.push(i);
        continue;
      }
    }
  }

  // Remove in reverse order to preserve indices
  for (let i = toRemove.length - 1; i >= 0; i--) {
    state.projectiles.splice(toRemove[i], 1);
  }
}

// ---------------------------------------------------------------------------
// Cast spell
// ---------------------------------------------------------------------------

export function castSpell(state: DuelState, spellId: SpellId): boolean {
  if (state.phase !== DuelPhase.FIGHTING || state.stunTimer > 0) return false;

  const def = SPELL_DEFS[spellId];
  if (!def) return false;

  // Check cooldown
  if ((state.playerCooldowns[spellId] ?? 0) > 0) return false;

  // Check mana
  if (state.playerMana < def.manaCost) return false;

  // Deduct mana, set cooldown
  state.playerMana -= def.manaCost;
  state.playerCooldowns[spellId] = def.cooldown;

  const px = B.PLAYER_X, py = state.playerY;
  const baseDmg = def.damage * (1 + state.spellPower);

  switch (spellId) {
    case SpellId.FIREBALL: {
      state.projectiles.push({
        x: px, y: py, vx: def.speed, vy: 0,
        spell: spellId, fromPlayer: true, age: 0,
        element: Element.FIRE, size: def.size, damage: baseDmg,
      });
      break;
    }
    case SpellId.FLAME_WAVE: {
      const spread = [-20, 0, 20];
      for (const offAngle of spread) {
        const rad = (offAngle * Math.PI) / 180;
        state.projectiles.push({
          x: px, y: py, vx: Math.cos(rad) * def.speed, vy: Math.sin(rad) * def.speed,
          spell: spellId, fromPlayer: true, age: 0,
          element: Element.FIRE, size: def.size, damage: baseDmg,
        });
      }
      break;
    }
    case SpellId.INFERNO: {
      state.projectiles.push({
        x: px, y: py, vx: def.speed, vy: 0,
        spell: spellId, fromPlayer: true, age: 0,
        element: Element.FIRE, size: def.size, damage: baseDmg,
      });
      break;
    }
    case SpellId.ICE_SHARD: {
      for (let i = 0; i < 2; i++) {
        const offY = (i === 0 ? -8 : 8);
        state.projectiles.push({
          x: px, y: py + offY, vx: def.speed, vy: offY * 2,
          spell: spellId, fromPlayer: true, age: 0,
          element: Element.ICE, size: def.size, damage: baseDmg,
        });
      }
      break;
    }
    case SpellId.FROST_NOVA: {
      for (let i = 0; i < 5; i++) {
        const angle = ((i - 2) * 18 * Math.PI) / 180;
        state.projectiles.push({
          x: px, y: py, vx: Math.cos(angle) * def.speed, vy: Math.sin(angle) * def.speed,
          spell: spellId, fromPlayer: true, age: 0,
          element: Element.ICE, size: def.size, damage: baseDmg,
        });
      }
      break;
    }
    case SpellId.BLIZZARD: {
      for (let i = 0; i < 8; i++) {
        const sx = B.PLAYER_X + 100 + Math.random() * 400;
        const sy = B.ARENA_TOP;
        state.projectiles.push({
          x: sx, y: sy, vx: (Math.random() - 0.5) * 40, vy: def.speed,
          spell: spellId, fromPlayer: true, age: 0,
          element: Element.ICE, size: def.size, damage: baseDmg,
        });
      }
      break;
    }
    case SpellId.LIGHTNING_BOLT: {
      state.projectiles.push({
        x: px, y: py, vx: def.speed, vy: 0,
        spell: spellId, fromPlayer: true, age: 0,
        element: Element.LIGHTNING, size: def.size, damage: baseDmg,
      });
      break;
    }
    case SpellId.CHAIN_LIGHTNING: {
      state.projectiles.push({
        x: px, y: py, vx: def.speed, vy: 0,
        spell: spellId, fromPlayer: true, age: 0,
        element: Element.LIGHTNING, size: def.size, damage: baseDmg,
      });
      break;
    }
    case SpellId.THUNDERSTORM: {
      for (let i = 0; i < 3; i++) {
        const sx = 200 + Math.random() * 500;
        const sy = B.ARENA_TOP;
        state.projectiles.push({
          x: sx, y: sy, vx: (Math.random() - 0.5) * 30, vy: def.speed,
          spell: spellId, fromPlayer: true, age: 0,
          element: Element.LIGHTNING, size: def.size, damage: baseDmg,
        });
      }
      break;
    }
    case SpellId.ARCANE_MISSILE: {
      const targetY = state.enemy ? state.enemy.y : py;
      const dy = targetY - py;
      const initVy = dy * 0.5;
      state.projectiles.push({
        x: px, y: py, vx: def.speed, vy: initVy,
        spell: spellId, fromPlayer: true, age: 0,
        element: Element.ARCANE, size: def.size, damage: baseDmg,
      });
      break;
    }
    case SpellId.MANA_BURST: {
      state.projectiles.push({
        x: px, y: py, vx: def.speed, vy: 0,
        spell: spellId, fromPlayer: true, age: 0,
        element: Element.ARCANE, size: def.size, damage: baseDmg,
      });
      break;
    }
    case SpellId.VOID_BEAM: {
      // Rapid stream of small projectiles
      for (let i = 0; i < 5; i++) {
        state.projectiles.push({
          x: px + i * 12, y: py + (Math.random() - 0.5) * 10,
          vx: def.speed + i * 20, vy: (Math.random() - 0.5) * 30,
          spell: spellId, fromPlayer: true, age: 0,
          element: Element.ARCANE, size: def.size * 0.6, damage: baseDmg / 5,
        });
      }
      break;
    }
  }

  // Cast particles
  spawnParticles(state, px + 20, py, 4, getElementColor(def.element));
  return true;
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

export function runEnemyAI(state: DuelState, dt: number): void {
  const enemy = state.enemy;
  if (!enemy || enemy.defeated) return;

  // --- Cast timer ---
  state.enemyCastTimer -= dt;
  if (state.enemyCastTimer <= 0) {
    state.enemyCastTimer = enemy.castInterval * (0.8 + Math.random() * 0.4);

    // Pick a spell from loadout that we can afford
    const castable = enemy.spells.filter(sid => {
      const def = SPELL_DEFS[sid];
      return def && enemy.mana >= def.manaCost;
    });

    if (castable.length > 0) {
      const chosen = castable[Math.floor(Math.random() * castable.length)];
      enemyCastSpell(state, chosen);
    }
  }

  // --- Dodge incoming projectiles ---
  state.enemyDodgeTimer -= dt;
  if (state.enemyDodgeTimer <= 0) {
    state.enemyDodgeTimer = enemy.reactionTime;

    // Find closest incoming player projectile
    let closestDist = Infinity;
    let closestProjY = 0;
    for (const p of state.projectiles) {
      if (!p.fromPlayer) continue;
      // Only dodge projectiles heading towards the enemy
      if (p.vx <= 0 && p.vy === 0) continue;
      const d = dist(p.x, p.y, B.ENEMY_X, enemy.y);
      if (d < closestDist && d < 300) {
        closestDist = d;
        closestProjY = p.y;
      }
    }

    if (closestDist < 300 && Math.random() < enemy.dodgeChance) {
      // Move away from the projectile's Y position
      const dodgeDir = enemy.y > closestProjY ? 1 : -1;
      enemy.y += dodgeDir * B.PLAYER_MOVE_SPEED * 0.4;
    }
  }

  // --- Random vertical drift ---
  const drift = (Math.sin(state.time * 1.5 + state.round) * 0.5) * B.PLAYER_MOVE_SPEED * 0.3 * dt;
  enemy.y += drift;

  // Smarter at higher rounds: track player position
  if (state.round >= 4) {
    const trackStrength = Math.min(0.3, (state.round - 3) * 0.05);
    const diff = state.playerY - enemy.y;
    enemy.y += diff * trackStrength * dt;
  }

  // Clamp enemy Y
  enemy.y = clampY(enemy.y);
}

function enemyCastSpell(state: DuelState, spellId: SpellId): void {
  const enemy = state.enemy;
  if (!enemy) return;

  const def = SPELL_DEFS[spellId];
  if (!def || enemy.mana < def.manaCost) return;

  enemy.mana -= def.manaCost;

  const ex = B.ENEMY_X, ey = enemy.y;
  const dmg = def.damage;

  // Enemy projectiles go leftward (negative vx)
  switch (spellId) {
    case SpellId.FIREBALL:
    case SpellId.LIGHTNING_BOLT:
    case SpellId.MANA_BURST:
    case SpellId.CHAIN_LIGHTNING: {
      state.projectiles.push({
        x: ex, y: ey, vx: -def.speed, vy: 0,
        spell: spellId, fromPlayer: false, age: 0,
        element: def.element, size: def.size, damage: dmg,
      });
      break;
    }
    case SpellId.FLAME_WAVE: {
      const spread = [-20, 0, 20];
      for (const offAngle of spread) {
        const rad = (Math.PI + (offAngle * Math.PI) / 180);
        state.projectiles.push({
          x: ex, y: ey, vx: Math.cos(rad) * def.speed, vy: Math.sin(rad) * def.speed,
          spell: spellId, fromPlayer: false, age: 0,
          element: def.element, size: def.size, damage: dmg,
        });
      }
      break;
    }
    case SpellId.INFERNO: {
      state.projectiles.push({
        x: ex, y: ey, vx: -def.speed, vy: 0,
        spell: spellId, fromPlayer: false, age: 0,
        element: def.element, size: def.size, damage: dmg,
      });
      break;
    }
    case SpellId.ICE_SHARD: {
      for (let i = 0; i < 2; i++) {
        const offY = (i === 0 ? -8 : 8);
        state.projectiles.push({
          x: ex, y: ey + offY, vx: -def.speed, vy: offY * 2,
          spell: spellId, fromPlayer: false, age: 0,
          element: def.element, size: def.size, damage: dmg,
        });
      }
      break;
    }
    case SpellId.FROST_NOVA: {
      for (let i = 0; i < 5; i++) {
        const angle = Math.PI + ((i - 2) * 18 * Math.PI) / 180;
        state.projectiles.push({
          x: ex, y: ey, vx: Math.cos(angle) * def.speed, vy: Math.sin(angle) * def.speed,
          spell: spellId, fromPlayer: false, age: 0,
          element: def.element, size: def.size, damage: dmg,
        });
      }
      break;
    }
    case SpellId.BLIZZARD: {
      for (let i = 0; i < 8; i++) {
        const sx = B.PLAYER_X - 50 + Math.random() * 300;
        state.projectiles.push({
          x: sx, y: B.ARENA_TOP, vx: (Math.random() - 0.5) * 40, vy: def.speed,
          spell: spellId, fromPlayer: false, age: 0,
          element: def.element, size: def.size, damage: dmg,
        });
      }
      break;
    }
    case SpellId.THUNDERSTORM: {
      for (let i = 0; i < 3; i++) {
        const sx = 100 + Math.random() * 400;
        state.projectiles.push({
          x: sx, y: B.ARENA_TOP, vx: (Math.random() - 0.5) * 30, vy: def.speed,
          spell: spellId, fromPlayer: false, age: 0,
          element: def.element, size: def.size, damage: dmg,
        });
      }
      break;
    }
    case SpellId.ARCANE_MISSILE: {
      const dy = state.playerY - ey;
      state.projectiles.push({
        x: ex, y: ey, vx: -def.speed, vy: dy * 0.5,
        spell: spellId, fromPlayer: false, age: 0,
        element: def.element, size: def.size, damage: dmg,
      });
      break;
    }
    case SpellId.VOID_BEAM: {
      for (let i = 0; i < 5; i++) {
        state.projectiles.push({
          x: ex - i * 12, y: ey + (Math.random() - 0.5) * 10,
          vx: -def.speed - i * 20, vy: (Math.random() - 0.5) * 30,
          spell: spellId, fromPlayer: false, age: 0,
          element: def.element, size: def.size * 0.6, damage: dmg / 5,
        });
      }
      break;
    }
  }

  spawnParticles(state, ex - 20, ey, 4, getElementColor(def.element));
}

// ---------------------------------------------------------------------------
// Hit wizard (apply damage + element effects)
// ---------------------------------------------------------------------------

export function hitWizard(state: DuelState, proj: Projectile, isPlayer: boolean): void {
  let dmg = proj.damage;

  // Spell power multiplier for player's projectiles hitting enemy
  if (proj.fromPlayer) {
    dmg *= (1 + state.spellPower);
  }

  // Shield reduces damage
  if (isPlayer && state.shieldActive) {
    dmg *= B.SHIELD_BLOCK_MULT;
    spawnParticles(state, B.PLAYER_X, state.playerY, B.PARTICLE_COUNT_SHIELD, B.COLOR_SHIELD);
  }

  // Apply damage
  if (isPlayer) {
    state.playerHp -= dmg;
  } else if (state.enemy) {
    state.enemy.hp -= dmg;
  }

  // Element effects
  const target = isPlayer ? "player" : "enemy";
  switch (proj.element) {
    case Element.FIRE:
      state.burnTimers[target] = 2.0; // 2 second burn
      break;
    case Element.ICE:
      state.slowTimers[target] = 1.5; // 1.5 second slow
      break;
    case Element.LIGHTNING:
      if (isPlayer) state.stunTimer = Math.max(state.stunTimer, 0.3);
      break;
    case Element.ARCANE:
      // Mana drain
      if (isPlayer) {
        state.playerMana = Math.max(0, state.playerMana - 10);
      } else if (state.enemy) {
        state.enemy.mana = Math.max(0, state.enemy.mana - 10);
      }
      break;
  }

  // Visual feedback
  const hitX = isPlayer ? B.PLAYER_X : B.ENEMY_X;
  const hitY = isPlayer ? state.playerY : (state.enemy?.y ?? 250);
  spawnParticles(state, hitX, hitY, B.PARTICLE_COUNT_HIT, getElementColor(proj.element));
  spawnDamageText(state, hitX, hitY - 20, `-${Math.floor(dmg)}`, getElementColor(proj.element));

  state.screenShake = B.SHAKE_DURATION;
  state.screenFlash = B.FLASH_DURATION;
}

// ---------------------------------------------------------------------------
// Round management
// ---------------------------------------------------------------------------

export function startRound(state: DuelState, round: number): void {
  state.round = round;
  state.phase = DuelPhase.COUNTDOWN;
  state.countdownTimer = B.COUNTDOWN_DURATION;
  state.projectiles = [];
  state.particles = [];
  state.time = 0;
  state.burnTimers = {};
  state.slowTimers = {};
  state.stunTimer = 0;
  state.screenShake = 0;
  state.screenFlash = 0;
  state.playerY = 250;

  // Reset player cooldowns
  state.playerCooldowns = {};

  // Setup enemy from opponents list
  const idx = Math.min(round - 1, OPPONENTS.length - 1);
  const template = OPPONENTS[idx];
  state.enemy = {
    ...template,
    hp: template.maxHp,
    mana: template.maxMana,
    y: 250,
    defeated: false,
  };
  state.enemyY = 250;
  state.enemyCastTimer = template.castInterval;
  state.enemyDodgeTimer = template.reactionTime;

  state.messages.push(`Round ${round}: ${template.name} ${template.title} enters the arena!`);
}

export function endRound(state: DuelState, playerWon: boolean): void {
  if (playerWon) {
    const hpBonus = Math.floor(state.playerHp * B.SCORE_PER_HP);
    const flawlessBonus = state.playerHp >= state.playerMaxHp ? B.SCORE_BONUS_FLAWLESS : 0;
    state.score += B.SCORE_PER_ROUND + hpBonus + flawlessBonus;
    state.gold += B.GOLD_PER_ROUND;

    if (flawlessBonus > 0) {
      state.messages.push("Flawless victory! +" + B.SCORE_BONUS_FLAWLESS + " bonus!");
    }

    // Death particles on enemy
    if (state.enemy) {
      spawnParticles(state, B.ENEMY_X, state.enemy.y, B.PARTICLE_COUNT_DEATH, state.enemy.color);
    }

    // Check if final round
    if (state.round >= OPPONENTS.length) {
      state.phase = DuelPhase.VICTORY;
      state.messages.push("You are the Grand Champion!");
    } else {
      state.phase = DuelPhase.SHOP;
      state.messages.push(`Round ${state.round} won! Visit the shop.`);
    }
  } else {
    state.phase = DuelPhase.DEFEAT;
    spawnParticles(state, B.PLAYER_X, state.playerY, B.PARTICLE_COUNT_DEATH, 0xffffff);
    state.messages.push(`Defeated in round ${state.round}.`);
  }
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export function buyShopItem(state: DuelState, index: number): boolean {
  if (state.phase !== DuelPhase.SHOP) return false;
  if (index < 0 || index >= SHOP_ITEMS.length) return false;

  const item = SHOP_ITEMS[index];
  if (state.gold < item.cost) return false;

  state.gold -= item.cost;

  switch (item.apply) {
    case "healHp":
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 30);
      break;
    case "maxMana":
      state.playerMaxMana += 20;
      state.playerMana += 20;
      break;
    case "spellPower":
      state.spellPower += 0.1;
      break;
    case "shieldEff":
      state.shieldEfficiency = Math.min(0.6, state.shieldEfficiency + 0.15);
      break;
    case "manaRegen":
      state.playerManaRegen += 3;
      break;
    case "maxHpUp":
      state.playerMaxHp += 20;
      state.playerHp += 20;
      break;
    case "cooldownReduce":
      // Reduce all spell cooldowns by 10%
      for (const spell of state.playerSpells) {
        spell.cooldown *= 0.9;
      }
      break;
    case "shieldBlock":
      // Already handled via shieldEfficiency but this is additive shield block
      state.shieldEfficiency = Math.min(0.6, state.shieldEfficiency + 0.1);
      break;
  }

  state.messages.push(`Purchased ${item.name}!`);
  return true;
}

// ---------------------------------------------------------------------------
// Element selection & available spells
// ---------------------------------------------------------------------------

export function selectElement(state: DuelState, element: Element): void {
  state.selectedElement = element;
}

export function getAvailableSpells(state: DuelState): Spell[] {
  return state.playerSpells.filter(
    s => s.unlocked && s.element === state.selectedElement
  );
}

// ---------------------------------------------------------------------------
// Shard calculation (end-of-run meta currency)
// ---------------------------------------------------------------------------

export function calculateShards(state: DuelState): number {
  let shards = state.round * B.SHARDS_PER_ROUND;
  if (state.phase === DuelPhase.VICTORY) {
    shards += B.SHARDS_PER_WIN;
  }
  return shards;
}
