/**
 * DiabloPets.ts  --  Pet system extracted from DiabloGame.ts
 *
 * All pet logic lives here as standalone functions.
 * Each function receives the specific context it needs.
 */

import { getTerrainHeight } from "./DiabloRenderer";
import {
  DiabloState, DiabloPet, DiabloEnemy, DiabloLoot,
  PetType, PetSpecies, PetAIState, EnemyState, DiabloPhase,
} from "./DiabloTypes";
import { PET_DEFS, PET_DROP_TABLE, PET_XP_TABLE } from "./DiabloConfig";

// ── Context interfaces ──────────────────────────────────────────

export interface PetContext {
  state: DiabloState;
  addFloatingText: (x: number, y: number, z: number, text: string, color: string) => void;
  genId: () => string;
  dist: (x1: number, z1: number, x2: number, z2: number) => number;
  updateAchievement: (id: string, progress: number) => void;
  pickupLoot: (lootId: string) => void;
  petBuffs: { type: string; value: number; remaining: number }[];
}

export interface PetUIContext {
  state: DiabloState;
  menuEl: HTMLDivElement;
  phaseBeforeOverlay: DiabloPhase;
  setPhaseBeforeOverlay: (p: DiabloPhase) => void;
  summonPet: (petId: string) => void;
  dismissPet: () => void;
}

// ── Core pet logic ──────────────────────────────────────────────

export function createPet(ctx: PetContext, species: PetSpecies): DiabloPet {
  const def = PET_DEFS[species];
  return {
    id: ctx.genId(),
    species,
    petType: def.petType,
    customName: def.name,
    icon: def.icon,
    level: 1,
    xp: 0,
    xpToNext: PET_XP_TABLE[0] || 80,
    hp: def.baseHp,
    maxHp: def.baseHp,
    damage: def.baseDamage,
    armor: def.baseArmor,
    moveSpeed: def.moveSpeed,
    attackRange: def.attackRange,
    attackSpeed: def.attackSpeed,
    aggroRange: def.aggroRange,
    lootPickupRange: def.lootPickupRange || 0,
    x: ctx.state.player.x + 2,
    y: 0,
    z: ctx.state.player.z + 2,
    angle: 0,
    aiState: PetAIState.FOLLOWING,
    targetId: null,
    attackTimer: 0,
    abilityCooldowns: {},
    equipment: { collar: null, charm: null },
    isSummoned: false,
    loyalty: 50,
  };
}

export function rollPetDrop(ctx: PetContext, isBoss: boolean): void {
  const mapId = ctx.state.currentMap;
  const p = ctx.state.player;
  for (const drop of PET_DROP_TABLE) {
    if (drop.mapId !== mapId) continue;
    if (drop.bossOnly && !isBoss) continue;
    if (Math.random() < drop.chance) {
      // Check if player already owns this species
      if (p.pets.some(pet => pet.species === drop.species)) continue;
      if (p.pets.length >= p.maxPets) {
        ctx.addFloatingText(p.x, p.y + 3, p.z, "Pet inventory full!", "#ff4444");
        return;
      }
      const newPet = createPet(ctx, drop.species);
      p.pets.push(newPet);
      ctx.updateAchievement('pet_collector', p.pets.length);
      const def = PET_DEFS[drop.species];
      ctx.addFloatingText(p.x, p.y + 4, p.z, `PET FOUND: ${def.name}!`, "#ffd700");
      return;
    }
  }
}

export function summonPet(ctx: PetContext, petId: string): void {
  const p = ctx.state.player;
  const pet = p.pets.find(pt => pt.id === petId);
  if (!pet) return;

  // If this pet is already summoned, dismiss it (toggle behavior)
  if (pet.isSummoned) {
    pet.isSummoned = false;
    pet.aiState = PetAIState.IDLE;
    p.activePetId = null;
    ctx.addFloatingText(p.x, p.y + 2, p.z, `${pet.customName} dismissed`, '#aaaaaa');
    return;
  }

  // Dismiss currently active pet if different
  if (p.activePetId && p.activePetId !== petId) {
    const activePet = p.pets.find(pt => pt.id === p.activePetId);
    if (activePet) {
      activePet.isSummoned = false;
      activePet.aiState = PetAIState.IDLE;
    }
  }

  // Summon the new pet
  pet.isSummoned = true;
  pet.aiState = PetAIState.FOLLOWING;
  pet.x = p.x + (Math.random() * 4 - 2);
  pet.z = p.z + (Math.random() * 4 - 2);
  pet.y = getTerrainHeight(pet.x, pet.z);
  pet.hp = pet.maxHp;
  p.activePetId = pet.id;
  ctx.addFloatingText(p.x, p.y + 2, p.z, `${pet.customName} summoned!`, '#44ff44');
}

export function dismissPet(ctx: PetContext): void {
  const p = ctx.state.player;
  const pet = p.pets.find(pt => pt.id === p.activePetId);
  if (pet) {
    pet.isSummoned = false;
    pet.aiState = PetAIState.IDLE;
    ctx.addFloatingText(p.x, p.y + 3, p.z, `${pet.customName} dismissed.`, "#aaaaaa");
  }
  p.activePetId = null;
}

export function grantPetXp(ctx: PetContext, amount: number): void {
  const p = ctx.state.player;
  for (const pet of p.pets) {
    if (!pet.isSummoned) continue;
    pet.xp += amount;
    while (pet.xp >= pet.xpToNext && pet.level < 50) {
      pet.xp -= pet.xpToNext;
      pet.level++;
      const def = PET_DEFS[pet.species];
      pet.maxHp = def.baseHp + def.hpPerLevel * (pet.level - 1);
      pet.hp = pet.maxHp;
      pet.damage = def.baseDamage + def.damagePerLevel * (pet.level - 1);
      pet.armor = def.baseArmor + def.armorPerLevel * (pet.level - 1);
      pet.xpToNext = PET_XP_TABLE[Math.min(pet.level - 1, PET_XP_TABLE.length - 1)];
      if (pet.loyalty < 100) pet.loyalty = Math.min(100, pet.loyalty + 5);
      ctx.addFloatingText(pet.x, pet.y + 2, pet.z, `${pet.customName} LEVEL ${pet.level}!`, "#ffd700");
    }
  }
}

export function updatePets(ctx: PetContext, dt: number): void {
  const p = ctx.state.player;

  for (const pet of p.pets) {
    if (!pet.isSummoned) continue;

    // Update ability cooldowns
    for (const key of Object.keys(pet.abilityCooldowns)) {
      if (pet.abilityCooldowns[key] > 0) {
        pet.abilityCooldowns[key] = Math.max(0, pet.abilityCooldowns[key] - dt);
      }
    }
    pet.attackTimer = Math.max(0, pet.attackTimer - dt);

    // Pet regeneration (slow)
    if (pet.hp < pet.maxHp) {
      pet.hp = Math.min(pet.maxHp, pet.hp + pet.maxHp * 0.005 * dt);
    }

    const distToPlayer = ctx.dist(pet.x, pet.z, p.x, p.z);

    // Teleport to player if too far
    if (distToPlayer > 25) {
      pet.x = p.x + (Math.random() * 4 - 2);
      pet.z = p.z + (Math.random() * 4 - 2);
      pet.y = getTerrainHeight(pet.x, pet.z);
      pet.aiState = PetAIState.FOLLOWING;
      continue;
    }

    // Pet takes damage from enemy AoE effects
    for (const aoe of ctx.state.aoeEffects) {
      // Skip player-owned AoEs (only damage pet from enemy AoEs)
      if (aoe.ownerId === 'player') continue;
      const distToAoe = ctx.dist(pet.x, pet.z, aoe.x, aoe.z);
      if (distToAoe < aoe.radius) {
        const aoeDmg = aoe.damage * 0.3 * dt;
        const effectiveArmor = pet.armor * 0.5;
        const reduction = effectiveArmor / (effectiveArmor + 50);
        pet.hp -= aoeDmg * (1 - reduction);
        if (pet.hp <= 0) {
          pet.hp = 0;
          pet.isSummoned = false;
          pet.aiState = PetAIState.IDLE;
          if (p.activePetId === pet.id) p.activePetId = null;
          ctx.addFloatingText(pet.x, pet.y + 2, pet.z, `${pet.customName} fainted!`, '#ff4444');
          break;
        }
      }
    }
    if (!pet.isSummoned) continue;

    switch (pet.aiState) {
      case PetAIState.FOLLOWING: {
        // Follow player at a distance
        if (distToPlayer > 3) {
          const dx = p.x - pet.x;
          const dz = p.z - pet.z;
          const len = Math.hypot(dx, dz);
          if (len > 0) {
            const speed = distToPlayer > 15 ? pet.moveSpeed * 2 : pet.moveSpeed;
            pet.x += (dx / len) * speed * dt;
            pet.z += (dz / len) * speed * dt;
            pet.angle = Math.atan2(dx, dz);
          }
        }

        // Combat pets: look for enemies to attack
        if (pet.petType === PetType.COMBAT && pet.aggroRange > 0) {
          let nearestEnemy: DiabloEnemy | null = null;
          let nearestDist = pet.aggroRange;
          for (const enemy of ctx.state.enemies) {
            if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
            const d = ctx.dist(enemy.x, enemy.z, pet.x, pet.z);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = enemy; }
          }
          if (nearestEnemy) {
            pet.targetId = nearestEnemy.id;
            pet.aiState = PetAIState.ATTACKING;
          }
        }

        // Loot pets: look for loot to collect (throttled to every ~0.5s via attackTimer reuse)
        if (pet.petType === PetType.LOOT && pet.lootPickupRange > 0) {
          pet.attackTimer -= dt;
          if (pet.attackTimer <= 0) {
            pet.attackTimer = 0.5;
            // Only scan if player has inventory space
            if (p.inventory.some(s => s.item === null)) {
              let nearestLoot: DiabloLoot | null = null;
              let nearestDist = pet.lootPickupRange;
              for (const loot of ctx.state.loot) {
                const d = ctx.dist(loot.x, loot.z, pet.x, pet.z);
                if (d < nearestDist) { nearestDist = d; nearestLoot = loot; }
              }
              if (nearestLoot) {
                pet.targetId = nearestLoot.id;
                pet.aiState = PetAIState.COLLECTING_LOOT;
              }
            }
          }
        }

        // Utility pet abilities (auto-use while following)
        if (pet.petType === PetType.UTILITY) {
          const petDef = PET_DEFS[pet.species];
          for (const ability of petDef.abilities) {
            if (ability.unlocksAtLevel > pet.level) continue;
            if ((pet.abilityCooldowns[ability.id] || 0) > 0) continue;
            // Auto heal when owner is low
            if (ability.healAmount && ability.healAmount > 0 && p.hp < p.maxHp * 0.5) {
              const healVal = ability.healAmount * p.maxHp;
              p.hp = Math.min(p.maxHp, p.hp + healVal);
              pet.abilityCooldowns[ability.id] = ability.cooldown;
              ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +${Math.round(healVal)} HP`, "#44ff44");
              break;
            }
            // Auto buff
            if (ability.buffType && ability.buffDuration && ability.buffDuration > 0) {
              const shouldBuff =
                (ability.buffType === 'cleanse' && p.statusEffects.length > 0) ||
                (ability.buffType === 'cooldownReduce') ||
                (ability.buffType === 'damageReduction' && p.hp < p.maxHp * 0.4) ||
                (ability.buffType === 'taunt' && ctx.state.enemies.filter(e => e.state !== EnemyState.DEAD && ctx.dist(e.x, e.z, p.x, p.z) < 8).length >= 3);
              if (shouldBuff) {
                applyPetBuff(ctx, ability);
                pet.abilityCooldowns[ability.id] = ability.cooldown;
                break;
              }
            }
          }
        }
        break;
      }

      case PetAIState.ATTACKING: {
        const target = ctx.state.enemies.find(e => e.id === pet.targetId);
        if (!target || target.state === EnemyState.DYING || target.state === EnemyState.DEAD) {
          pet.targetId = null;
          pet.aiState = PetAIState.RETURNING;
          break;
        }

        const distToTarget = ctx.dist(target.x, target.z, pet.x, pet.z);

        if (distToTarget > pet.attackRange) {
          // Move toward target
          const dx = target.x - pet.x;
          const dz = target.z - pet.z;
          const len = Math.hypot(dx, dz);
          if (len > 0) {
            pet.x += (dx / len) * pet.moveSpeed * dt;
            pet.z += (dz / len) * pet.moveSpeed * dt;
            pet.angle = Math.atan2(dx, dz);
          }
        } else if (pet.attackTimer <= 0) {
          // Attack!
          const loyaltyMult = 0.5 + (pet.loyalty / 100) * 0.5;
          const dmg = pet.damage * loyaltyMult;
          target.hp -= dmg;
          pet.attackTimer = 1 / pet.attackSpeed;
          ctx.addFloatingText(target.x, target.y + 2, target.z, String(Math.round(dmg)), "#88ff88");

          // Try to use abilities
          const petDef = PET_DEFS[pet.species];
          for (const ability of petDef.abilities) {
            if (ability.unlocksAtLevel > pet.level) continue;
            if ((pet.abilityCooldowns[ability.id] || 0) > 0) continue;
            if (ability.damageMultiplier && ability.damageMultiplier > 0) {
              const abilDmg = pet.damage * ability.damageMultiplier * loyaltyMult;
              target.hp -= abilDmg;
              pet.abilityCooldowns[ability.id] = ability.cooldown;
              ctx.addFloatingText(target.x, target.y + 3, target.z, `${ability.name}! ${Math.round(abilDmg)}`, "#ff8800");
              break; // one ability per frame
            }
            if (ability.buffType) {
              applyPetBuff(ctx, ability);
              pet.abilityCooldowns[ability.id] = ability.cooldown;
              break;
            }
          }

          // Check if target died
          if (target.hp <= 0) {
            pet.targetId = null;
            pet.aiState = PetAIState.RETURNING;
          }
        }

        // Don't stray too far from player
        if (distToPlayer > 15) {
          pet.targetId = null;
          pet.aiState = PetAIState.RETURNING;
        }
        break;
      }

      case PetAIState.COLLECTING_LOOT: {
        const loot = ctx.state.loot.find(l => l.id === pet.targetId);
        if (!loot) {
          pet.targetId = null;
          pet.aiState = PetAIState.RETURNING;
          break;
        }

        // Check if player inventory is full before moving to loot
        const hasSpace = p.inventory.some(s => s.item === null);
        if (!hasSpace) {
          pet.targetId = null;
          pet.aiState = PetAIState.RETURNING;
          break;
        }

        const distToLoot = ctx.dist(loot.x, loot.z, pet.x, pet.z);
        if (distToLoot > 1) {
          const dx = loot.x - pet.x;
          const dz = loot.z - pet.z;
          const len = Math.hypot(dx, dz);
          if (len > 0) {
            pet.x += (dx / len) * pet.moveSpeed * 1.5 * dt;
            pet.z += (dz / len) * pet.moveSpeed * 1.5 * dt;
            pet.angle = Math.atan2(dx, dz);
          }
        } else {
          // Pick up loot - add to player inventory
          const lootCountBefore = ctx.state.loot.length;
          ctx.pickupLoot(loot.id);
          // Only show message if loot was actually picked up (removed from ground)
          if (ctx.state.loot.length < lootCountBefore) {
            ctx.addFloatingText(pet.x, pet.y + 1, pet.z, `${pet.customName} picked up ${loot.item.name}`, "#44ffff");
          }
          pet.targetId = null;
          pet.aiState = PetAIState.RETURNING;
        }
        break;
      }

      case PetAIState.RETURNING: {
        if (distToPlayer < 4) {
          pet.aiState = PetAIState.FOLLOWING;
        } else {
          const dx = p.x - pet.x;
          const dz = p.z - pet.z;
          const len = Math.hypot(dx, dz);
          if (len > 0) {
            pet.x += (dx / len) * pet.moveSpeed * 1.2 * dt;
            pet.z += (dz / len) * pet.moveSpeed * 1.2 * dt;
            pet.angle = Math.atan2(dx, dz);
          }
        }
        break;
      }

      case PetAIState.IDLE:
        pet.aiState = PetAIState.FOLLOWING;
        break;
    }

    // Update pet Y position (terrain height)
    pet.y = getTerrainHeight(pet.x, pet.z);
  }
}

export function applyPetBuff(
  ctx: PetContext,
  ability: { id: string; name: string; buffType?: string; buffDuration?: number; healAmount?: number },
): void {
  if (!ability.buffType) return;
  const p = ctx.state.player;

  switch (ability.buffType) {
    case 'damage':
      ctx.petBuffs.push({ type: 'damage', value: 0.15, remaining: ability.buffDuration || 10 });
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +15% DMG`, "#ff8800");
      break;
    case 'attackSpeed':
      ctx.petBuffs.push({ type: 'attackSpeed', value: 1.0, remaining: ability.buffDuration || 8 });
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! 2x ATK SPD`, "#ffdd00");
      break;
    case 'fireResist':
      ctx.petBuffs.push({ type: 'fireResist', value: 50, remaining: ability.buffDuration || 15 });
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +50 Fire Res`, "#ff4400");
      break;
    case 'invuln':
      p.invulnTimer = Math.max(p.invulnTimer, ability.buffDuration || 3);
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! Invulnerable`, "#ffffff");
      break;
    case 'damageReduction':
      ctx.petBuffs.push({ type: 'damageReduction', value: 0.5, remaining: ability.buffDuration || 6 });
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! -50% DMG taken`, "#4488ff");
      break;
    case 'cleanse':
      p.statusEffects = [];
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! Cleansed`, "#ffffff");
      break;
    case 'cooldownReduce':
      for (const [skillId, cd] of p.skillCooldowns) {
        p.skillCooldowns.set(skillId, Math.max(0, cd - 3));
      }
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! -3s CDs`, "#44ffff");
      break;
    case 'xpBonus':
      ctx.petBuffs.push({ type: 'xpBonus', value: 0.2, remaining: ability.buffDuration || 30 });
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +20% XP`, "#ffd700");
      break;
    case 'lootRange':
      ctx.petBuffs.push({ type: 'lootRange', value: 0.5, remaining: ability.buffDuration || 20 });
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +50% Pickup`, "#44ff44");
      break;
    case 'goldBonus':
      ctx.petBuffs.push({ type: 'goldBonus', value: 0.25, remaining: ability.buffDuration || 30 });
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +25% Gold`, "#ffd700");
      break;
    case 'lootMagnet':
      // Pull all loot to player
      for (const loot of ctx.state.loot) {
        loot.x = p.x + (Math.random() - 0.5) * 2;
        loot.z = p.z + (Math.random() - 0.5) * 2;
      }
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! All loot pulled!`, "#ffd700");
      break;
    case 'spellAmp':
      ctx.petBuffs.push({ type: 'spellAmp', value: 0.5, remaining: ability.buffDuration || 10 });
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +50% Spell DMG`, "#aa44ff");
      break;
    default:
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${ability.name}!`, "#44ffff");
      break;
  }
}

export function updatePetBuffs(ctx: PetContext, dt: number): void {
  // Tick down active buff timers
  for (let i = ctx.petBuffs.length - 1; i >= 0; i--) {
    ctx.petBuffs[i].remaining -= dt;
    if (ctx.petBuffs[i].remaining <= 0) {
      ctx.petBuffs.splice(i, 1);
    }
  }

  // Passive utility pet buffs (continuous while summoned)
  const p = ctx.state.player;
  for (const pet of p.pets) {
    if (!pet.isSummoned) continue;

    if (pet.petType === PetType.UTILITY) {
      // Healing Wisp: passive HP regen
      if (pet.species === PetSpecies.HEALING_WISP) {
        const healPerSec = 2 + pet.level * 0.5;
        p.hp = Math.min(p.maxHp, p.hp + healPerSec * dt);
      }
      // Mana Sprite: passive mana regen
      if (pet.species === PetSpecies.MANA_SPRITE) {
        const manaPerSec = 3 + pet.level * 0.8;
        p.mana = Math.min(p.maxMana, p.mana + manaPerSec * dt);
      }
      // Shield Golem: passive armor buff is handled in stat recalculation
    }
  }
}

export function hasPetBuff(ctx: PetContext, type: string): number {
  let total = 0;
  for (const buff of ctx.petBuffs) {
    if (buff.type === type) total += buff.value;
  }
  return total;
}

// ── UI functions ────────────────────────────────────────────────

export function showPetPanel(ctx: PetUIContext): void {
  const p = ctx.state.player;
  ctx.setPhaseBeforeOverlay(ctx.phaseBeforeOverlay || DiabloPhase.PLAYING);
  ctx.state.phase = DiabloPhase.INVENTORY;
  ctx.menuEl.innerHTML = '';

  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,15,10,0.95);border:2px solid #8b6914;border-radius:8px;padding:20px;color:#fff;font-family:Georgia,serif;min-width:500px;max-height:80vh;overflow-y:auto;z-index:100;';

  const title = document.createElement('h2');
  title.style.cssText = 'text-align:center;color:#ffd700;margin:0 0 15px;font-size:24px;';
  title.textContent = `Companions (${p.pets.length}/${p.maxPets})`;
  panel.appendChild(title);

  if (p.pets.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'text-align:center;color:#888;font-style:italic;';
    empty.textContent = 'No pets found yet. Defeat enemies to find companion eggs!';
    panel.appendChild(empty);
  }

  for (const pet of p.pets) {
    const petRow = document.createElement('div');
    petRow.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px;margin:5px 0;background:rgba(255,255,255,0.05);border:1px solid #555;border-radius:4px;' + (pet.isSummoned ? 'border-color:#44ff44;' : '');

    const icon = document.createElement('span');
    icon.style.cssText = 'font-size:32px;';
    icon.textContent = pet.icon;
    petRow.appendChild(icon);

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;';
    info.innerHTML = `
      <div style="font-size:16px;color:#ffd700;">${pet.customName} <span style="color:#aaa;font-size:12px;">Lv.${pet.level}</span></div>
      <div style="font-size:12px;color:#aaa;">HP: ${Math.round(pet.hp)}/${pet.maxHp} | DMG: ${Math.round(pet.damage)} | ARM: ${pet.armor}</div>
      <div style="font-size:11px;color:#888;">XP: ${pet.xp}/${pet.xpToNext} | Loyalty: ${pet.loyalty}%</div>
      <div style="font-size:11px;color:#888;">Type: ${pet.petType} | ${pet.isSummoned ? '<span style="color:#44ff44;">Active</span>' : 'Idle'}</div>
    `;
    petRow.appendChild(info);

    const btn = document.createElement('button');
    btn.style.cssText = 'padding:6px 12px;background:' + (pet.isSummoned ? '#cc4444' : '#44aa44') + ';color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:Georgia,serif;';
    btn.textContent = pet.isSummoned ? 'Dismiss' : 'Summon';
    btn.addEventListener('click', () => {
      if (pet.isSummoned) {
        ctx.dismissPet();
      } else {
        ctx.summonPet(pet.id);
      }
      showPetPanel(ctx);
    });
    petRow.appendChild(btn);

    panel.appendChild(petRow);
  }

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'display:block;margin:15px auto 0;padding:8px 24px;background:#555;color:#fff;border:1px solid #888;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:14px;';
  closeBtn.textContent = 'Close (Esc)';
  closeBtn.addEventListener('click', () => {
    ctx.state.phase = ctx.phaseBeforeOverlay || DiabloPhase.PLAYING;
    ctx.menuEl.innerHTML = '';
  });
  panel.appendChild(closeBtn);

  ctx.menuEl.appendChild(panel);
}

export function showPetManagement(ctx: PetUIContext): void {
  const p = ctx.state.player;
  ctx.setPhaseBeforeOverlay(DiabloPhase.PLAYING);
  ctx.state.phase = DiabloPhase.INVENTORY;

  const renderPetUI = () => {
    const activePet = p.pets.find(pt => pt.id === p.activePetId && pt.isSummoned);

    let petListHtml = "";
    if (p.pets.length === 0) {
      petListHtml = `<div style="color:#887755;font-style:italic;padding:20px;text-align:center;">
        No pets found yet. Defeat enemies to discover pet companions!</div>`;
    }
    for (const pet of p.pets) {
      const def = PET_DEFS[pet.species];
      const isActive = pet.id === p.activePetId && pet.isSummoned;
      const borderColor = isActive ? "#ffd700" : "#5a4a2a";
      const typeBadge = pet.petType === PetType.COMBAT ? "COMBAT" :
        pet.petType === PetType.LOOT ? "LOOT" : "UTILITY";
      const typeColor = pet.petType === PetType.COMBAT ? "#ff4444" :
        pet.petType === PetType.LOOT ? "#ffd700" : "#44ff44";

      let abilitiesHtml = "";
      for (const ability of def.abilities) {
        const unlocked = pet.level >= ability.unlocksAtLevel;
        const color = unlocked ? "#cccccc" : "#555555";
        abilitiesHtml += `<div style="color:${color};font-size:11px;margin:2px 0;">
          ${ability.icon} ${ability.name} ${unlocked ? "" : `(Lv.${ability.unlocksAtLevel})`}
          <span style="color:#888;font-size:10px;">${ability.description}</span>
        </div>`;
      }

      petListHtml += `
        <div class="pet-card" data-pet-id="${pet.id}" style="
          background:rgba(20,15,8,0.9);border:2px solid ${borderColor};border-radius:8px;
          padding:14px;cursor:pointer;transition:border-color 0.2s;pointer-events:auto;
        ">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span style="font-size:32px;">${pet.icon}</span>
            <div>
              <div style="color:#c8a84e;font-weight:bold;font-size:16px;">${pet.customName}</div>
              <div style="font-size:11px;color:${typeColor};font-weight:bold;">${typeBadge}</div>
              <div style="font-size:12px;color:#aaa;">Level ${pet.level} | Loyalty: ${Math.round(pet.loyalty)}%</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;color:#aaa;margin-bottom:8px;">
            <div>HP: <span style="color:#ff4444;">${Math.round(pet.hp)}/${pet.maxHp}</span></div>
            <div>DMG: <span style="color:#ff8800;">${Math.round(pet.damage)}</span></div>
            <div>Armor: <span style="color:#4488ff;">${Math.round(pet.armor)}</span></div>
            <div>Speed: <span style="color:#44ff44;">${pet.moveSpeed.toFixed(1)}</span></div>
            <div>XP: <span style="color:#ffd700;">${pet.xp}/${pet.xpToNext}</span></div>
            ${pet.lootPickupRange > 0 ? `<div>Pickup: <span style="color:#ffdd00;">${pet.lootPickupRange}</span></div>` : ""}
          </div>
          <div style="margin-bottom:8px;">
            <div style="font-size:11px;color:#c8a84e;font-weight:bold;margin-bottom:4px;">ABILITIES</div>
            ${abilitiesHtml}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="pet-summon-btn" data-pet-id="${pet.id}" style="
              flex:1;padding:8px;font-size:12px;font-weight:bold;
              background:${isActive ? "rgba(80,40,20,0.9)" : "rgba(40,30,15,0.9)"};
              border:1px solid ${isActive ? "#ff4444" : "#5a4a2a"};border-radius:6px;
              color:${isActive ? "#ff4444" : "#c8a84e"};cursor:pointer;pointer-events:auto;
            ">${isActive ? "DISMISS" : "SUMMON"}</button>
          </div>
        </div>`;
    }

    // Active pet status
    let activeStatusHtml = "";
    if (activePet) {
      const hpPct = Math.round((activePet.hp / activePet.maxHp) * 100);
      activeStatusHtml = `
        <div style="background:rgba(20,15,8,0.9);border:2px solid #ffd700;border-radius:8px;padding:14px;margin-bottom:16px;">
          <div style="color:#ffd700;font-weight:bold;font-size:14px;margin-bottom:8px;">ACTIVE COMPANION</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:36px;">${activePet.icon}</span>
            <div style="flex:1;">
              <div style="color:#c8a84e;font-weight:bold;">${activePet.customName} <span style="color:#aaa;font-weight:normal;">Lv.${activePet.level}</span></div>
              <div style="background:#333;border-radius:3px;height:8px;margin-top:4px;overflow:hidden;">
                <div style="background:#ff4444;height:100%;width:${hpPct}%;transition:width 0.3s;"></div>
              </div>
              <div style="font-size:10px;color:#aaa;margin-top:2px;">HP: ${Math.round(activePet.hp)}/${activePet.maxHp} | AI: ${activePet.aiState}</div>
            </div>
          </div>
        </div>`;
    }

    ctx.menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <div style="
          max-width:700px;width:92%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
        ">
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:28px;color:#c8a84e;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">
              PET COMPANIONS
            </div>
            <div style="font-size:12px;color:#887755;margin-top:4px;">
              ${p.pets.length} / ${p.maxPets} pets | Defeat enemies to find new companions
            </div>
          </div>
          ${activeStatusHtml}
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${petListHtml}
          </div>
          <div style="text-align:center;margin-top:16px;">
            <button id="pet-close-btn" style="
              padding:10px 30px;font-size:14px;letter-spacing:2px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
              cursor:pointer;pointer-events:auto;font-family:'Georgia',serif;
            ">CLOSE</button>
          </div>
        </div>
      </div>`;

    // Summon/dismiss buttons
    const summonBtns = ctx.menuEl.querySelectorAll(".pet-summon-btn") as NodeListOf<HTMLButtonElement>;
    summonBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const petId = btn.getAttribute("data-pet-id")!;
        const pet = p.pets.find(pt => pt.id === petId);
        if (!pet) return;
        if (pet.isSummoned) {
          ctx.dismissPet();
        } else {
          ctx.summonPet(petId);
        }
        renderPetUI();
      });
    });

    // Close
    const closeBtn = ctx.menuEl.querySelector("#pet-close-btn") as HTMLButtonElement;
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.borderColor = "#c8a84e"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.borderColor = "#5a4a2a"; });
    closeBtn.addEventListener("click", () => {
      ctx.state.phase = DiabloPhase.PLAYING;
      ctx.menuEl.innerHTML = "";
    });
  };

  renderPetUI();
}
