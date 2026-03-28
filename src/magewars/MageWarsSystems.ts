// ---------------------------------------------------------------------------
// Mage Wars FPS – Game Systems: Spell Crafting, Dueling, Dragon Riding,
//                                Environmental Spells
// ---------------------------------------------------------------------------

import * as THREE from "three";
import type {
  RuneElement, CraftedSpellDef, CraftedSpellEffect,
  EnvSpellDef, EnvSpellType, DragonMountDef, DuelPhase,
  DuelArenaConfig, DuelHazardDef, DuelLoadout, RuneInventory,
} from "./MageWarsCraftingDefs";
import {
  createRuneInventory, findCraftedSpell, getCraftedSpellDef,
  getRuneDef, getEnvSpellDef, getDragonMountDef, getDuelArenaDef,
  RUNE_DEFS, CRAFTED_SPELL_DEFS, ENV_SPELL_DEFS, DRAGON_MOUNT_DEFS,
  DUEL_ARENA_DEFS, DRAGON_COMBAT,
  DUEL_MAX_SPELL_SLOTS, DUEL_SPELL_SELECT_TIME,
  DUEL_COUNTDOWN_TIME, DUEL_ROUNDS_TO_WIN, DUEL_ROUND_TIME,
  createDefaultDuelLoadout,
} from "./MageWarsCraftingDefs";

// ---- Re-export types the main game file will need -------------------------

export type {
  RuneElement, RuneInventory, CraftedSpellDef, CraftedSpellEffect,
  EnvSpellDef, EnvSpellType, DragonMountDef, DuelPhase,
  DuelArenaConfig, DuelHazardDef, DuelLoadout,
};
export {
  createRuneInventory, findCraftedSpell, getCraftedSpellDef,
  getRuneDef, getEnvSpellDef, getDragonMountDef, getDuelArenaDef,
  RUNE_DEFS, CRAFTED_SPELL_DEFS, ENV_SPELL_DEFS, DRAGON_MOUNT_DEFS,
  DUEL_ARENA_DEFS, DRAGON_COMBAT,
  DUEL_MAX_SPELL_SLOTS, DUEL_SPELL_SELECT_TIME,
  DUEL_COUNTDOWN_TIME, DUEL_ROUNDS_TO_WIN, DUEL_ROUND_TIME,
  createDefaultDuelLoadout,
};

// ---- Utility helpers (duplicated from main game to keep systems decoupled) -

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
function dist3(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = ax - bx, dy = ay - by, dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// ===========================================================================
// 1. SPELL CRAFTING SYSTEM
// ===========================================================================

/** Result of combining two runes */
export interface SpellCraftResult {
  success: boolean;
  spell: CraftedSpellDef | null;
  message: string;
}

/**
 * Try to combine two runes into a crafted spell.
 * Returns the resulting spell or an error message.
 */
export function craftSpell(rune1: RuneElement, rune2: RuneElement): SpellCraftResult {
  if (rune1 === rune2) {
    // Same-element "empowered" single-rune spell: use the rune's base stats amplified
    const rd = getRuneDef(rune1);
    return {
      success: true,
      spell: {
        id: `empowered_${rune1}`,
        name: `Empowered ${rd.name.replace(" Rune", "")}`,
        icon: rd.icon,
        desc: `Concentrated ${rune1} energy. Double power, double mana cost.`,
        rune1, rune2,
        damage: rd.baseDamage * 2,
        manaCost: rd.baseMana * 2,
        cooldown: 4,
        projectileSpeed: 100,
        projectileSize: 0.2,
        projectileColor: rd.color,
        trailColor: rd.trailColor,
        splashRadius: 2,
        effects: ["damage"],
        effectValues: {},
        range: 80,
      },
      message: `Empowered ${rune1}!`,
    };
  }

  const found = findCraftedSpell(rune1, rune2);
  if (found) {
    return { success: true, spell: found, message: `Created ${found.name}!` };
  }

  // Unknown combination — still creates a weak mixed bolt
  const rd1 = getRuneDef(rune1);
  const rd2 = getRuneDef(rune2);
  return {
    success: true,
    spell: {
      id: `mixed_${rune1}_${rune2}`,
      name: `${rd1.name.replace(" Rune", "")}-${rd2.name.replace(" Rune", "")} Bolt`,
      icon: "\u2728",
      desc: `Unstable mixture of ${rune1} and ${rune2}.`,
      rune1, rune2,
      damage: (rd1.baseDamage + rd2.baseDamage) * 0.6,
      manaCost: (rd1.baseMana + rd2.baseMana) * 0.7,
      cooldown: 5,
      projectileSpeed: 90,
      projectileSize: 0.15,
      projectileColor: rd1.color,
      trailColor: rd2.trailColor,
      splashRadius: 1,
      effects: ["damage"],
      effectValues: {},
      range: 70,
    },
    message: "Unstable mixture...",
  };
}

/**
 * Apply crafted spell effects to a hit target.
 * Returns { damageDealt, healAmount, knockback } for the caller to apply.
 */
export interface SpellHitResult {
  damageDealt: number;
  healCaster: number;
  knockbackX: number;
  knockbackY: number;
  knockbackZ: number;
  applyFreeze: boolean;
  freezeDuration: number;
  applyStun: boolean;
  stunDuration: number;
  applySlow: boolean;
  slowFactor: number;
  slowDuration: number;
  applyBlind: boolean;
  blindDuration: number;
  applyDot: boolean;
  dotDamage: number;
  dotDuration: number;
}

export function computeSpellHit(
  spell: CraftedSpellDef,
  targetArmor: number,
  dirX: number, dirY: number, dirZ: number,
): SpellHitResult {
  const armorMult = 1 - targetArmor / 100;
  const baseDmg = spell.damage * armorMult;

  const result: SpellHitResult = {
    damageDealt: baseDmg,
    healCaster: 0,
    knockbackX: 0, knockbackY: 0, knockbackZ: 0,
    applyFreeze: false, freezeDuration: 0,
    applyStun: false, stunDuration: 0,
    applySlow: false, slowFactor: 1, slowDuration: 0,
    applyBlind: false, blindDuration: 0,
    applyDot: false, dotDamage: 0, dotDuration: 0,
  };

  for (const eff of spell.effects) {
    const ev = spell.effectValues;
    switch (eff) {
      case "lifesteal":
        result.healCaster = baseDmg * (ev.lifestealPct || 0.25);
        break;
      case "knockback": {
        const force = ev.knockbackForce || 10;
        const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) || 1;
        result.knockbackX = (dirX / len) * force;
        result.knockbackY = force * 0.3;
        result.knockbackZ = (dirZ / len) * force;
        break;
      }
      case "freeze":
        result.applyFreeze = true;
        result.freezeDuration = ev.freezeDuration || 2;
        break;
      case "stun":
        result.applyStun = true;
        result.stunDuration = ev.stunDuration || 1.5;
        break;
      case "slow":
        result.applySlow = true;
        result.slowFactor = ev.slowPct || 0.5;
        result.slowDuration = ev.slowDuration || 3;
        break;
      case "blind":
        result.applyBlind = true;
        result.blindDuration = ev.blindDuration || 2;
        break;
      case "dot":
        result.applyDot = true;
        result.dotDamage = ev.dotDamage || 5;
        result.dotDuration = ev.dotDuration || 3;
        break;
      case "pull": {
        const pullF = ev.pullForce || 8;
        const pLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) || 1;
        result.knockbackX = -(dirX / pLen) * pullF;
        result.knockbackY = 0;
        result.knockbackZ = -(dirZ / pLen) * pullF;
        break;
      }
      case "heal_self":
        result.healCaster = ev.healAmount || 30;
        break;
      // "damage", "aoe_explosion", "chain", "pierce" handled by projectile system
    }
  }

  return result;
}


// ===========================================================================
// 2. ENVIRONMENTAL SPELL SYSTEM
// ===========================================================================

export interface EnvSpellEntity {
  id: string;
  defId: string;
  ownerId: string;
  team: 0 | 1;
  x: number; y: number; z: number;
  yaw: number;
  duration: number;       // remaining seconds
  maxDuration: number;
  mesh: THREE.Group | null;
  // For teleport portals — link to pair
  linkedPortalId: string | null;
  // Hazard tick accumulator
  tickAccum: number;
  // Turret state
  turretFireTimer: number;
}

let _envIdCounter = 0;
function nextEnvId(): string { return `env${_envIdCounter++}`; }

export function createEnvSpellEntity(
  defId: string, ownerId: string, team: 0 | 1,
  x: number, y: number, z: number, yaw: number,
): EnvSpellEntity {
  const def = getEnvSpellDef(defId);
  return {
    id: nextEnvId(), defId, ownerId, team,
    x, y, z, yaw,
    duration: def.duration, maxDuration: def.duration,
    mesh: null, linkedPortalId: null,
    tickAccum: 0, turretFireTimer: 0,
  };
}

/**
 * Build a 3D mesh for an environmental spell entity.
 */
export function buildEnvSpellMesh(entity: EnvSpellEntity): THREE.Group {
  const def = getEnvSpellDef(entity.defId);
  const group = new THREE.Group();

  switch (def.type) {
    case "ice_wall": {
      const geo = new THREE.BoxGeometry(def.width, def.height, def.depth);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color, transparent: true, opacity: 0.7,
        emissive: def.emissiveColor, emissiveIntensity: 0.3,
        roughness: 0.1, metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = def.height / 2;
      mesh.castShadow = true;
      group.add(mesh);
      // Crystal shard decorations
      for (let i = 0; i < 5; i++) {
        const shardGeo = new THREE.ConeGeometry(0.15, 0.6, 10);
        const shardMat = new THREE.MeshStandardMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.5 });
        const shard = new THREE.Mesh(shardGeo, shardMat);
        shard.position.set(
          (Math.random() - 0.5) * def.width * 0.8,
          Math.random() * def.height,
          (Math.random() - 0.5) * def.depth * 2,
        );
        shard.rotation.z = (Math.random() - 0.5) * 0.5;
        group.add(shard);
      }
      break;
    }
    case "fire_pit": {
      const baseGeo = new THREE.CylinderGeometry(def.width / 2, def.width / 2 + 0.3, 0.1, 16);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x331100, emissive: def.emissiveColor, emissiveIntensity: 0.6,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.05;
      group.add(base);
      // Flame pillars
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r = def.width / 2 * 0.6;
        const flameGeo = new THREE.ConeGeometry(0.2, 1.0 + Math.random() * 0.5, 4);
        const flameMat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0xff4400 : 0xff8800,
          transparent: true, opacity: 0.8,
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(Math.cos(angle) * r, 0.5, Math.sin(angle) * r);
        group.add(flame);
      }
      // Point light
      const light = new THREE.PointLight(def.emissiveColor, 1.0, 8);
      light.position.y = 1;
      group.add(light);
      break;
    }
    case "teleport_portal": {
      const ringGeo = new THREE.TorusGeometry(def.width / 2, 0.1, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: def.color });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = def.height / 2;
      group.add(ring);
      // Inner plane (swirling portal surface)
      const portalGeo = new THREE.CircleGeometry(def.width / 2 - 0.1, 16);
      const portalMat = new THREE.MeshBasicMaterial({
        color: def.emissiveColor, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
      });
      const portal = new THREE.Mesh(portalGeo, portalMat);
      portal.position.y = def.height / 2;
      group.add(portal);
      // Light
      const pLight = new THREE.PointLight(def.color, 0.8, 6);
      pLight.position.y = def.height / 2;
      group.add(pLight);
      break;
    }
    case "lightning_fence": {
      // Posts
      const postCount = 4;
      for (let i = 0; i < postCount; i++) {
        const px = (i / (postCount - 1)) * def.width - def.width / 2;
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, def.height, 12);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, def.height / 2, 0);
        group.add(post);
        // Top spark
        const sparkGeo = new THREE.SphereGeometry(0.12, 12, 10);
        const sparkMat = new THREE.MeshBasicMaterial({ color: def.color });
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.position.set(px, def.height, 0);
        group.add(spark);
      }
      // Light
      const fLight = new THREE.PointLight(def.color, 0.6, 6);
      fLight.position.y = def.height / 2;
      group.add(fLight);
      break;
    }
    case "shadow_zone": {
      const domeGeo = new THREE.SphereGeometry(def.areaRadius, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshBasicMaterial({
        color: def.color, transparent: true, opacity: 0.25, side: THREE.DoubleSide,
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      group.add(dome);
      break;
    }
    case "nature_barrier": {
      const wallGeo = new THREE.BoxGeometry(def.width, def.height, def.depth);
      const wallMat = new THREE.MeshStandardMaterial({
        color: def.color, emissive: def.emissiveColor, emissiveIntensity: 0.2,
        roughness: 0.9,
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.y = def.height / 2;
      wall.castShadow = true;
      group.add(wall);
      // Leaf decorations
      for (let i = 0; i < 10; i++) {
        const leafGeo = new THREE.SphereGeometry(0.15, 12, 10);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x44cc22 });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(
          (Math.random() - 0.5) * def.width,
          Math.random() * def.height,
          (Math.random() - 0.5) * def.depth * 2,
        );
        group.add(leaf);
      }
      break;
    }
    case "arcane_turret": {
      // Base
      const tBaseGeo = new THREE.CylinderGeometry(def.width / 2, def.width / 2 + 0.2, 0.4, 8);
      const tBaseMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.7 });
      const tBase = new THREE.Mesh(tBaseGeo, tBaseMat);
      tBase.position.y = 0.2;
      group.add(tBase);
      // Pillar
      const pillarGeo = new THREE.CylinderGeometry(0.15, 0.2, def.height - 0.4, 12);
      const pillarMat = new THREE.MeshStandardMaterial({ color: def.color, emissive: def.emissiveColor, emissiveIntensity: 0.4 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = def.height / 2;
      group.add(pillar);
      // Crystal head
      const headGeo = new THREE.OctahedronGeometry(0.3);
      const headMat = new THREE.MeshBasicMaterial({ color: def.color });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = def.height;
      group.add(head);
      // Light
      const tLight = new THREE.PointLight(def.color, 0.5, 8);
      tLight.position.y = def.height;
      group.add(tLight);
      break;
    }
    case "wind_vortex": {
      // Swirling cone
      const vortexGeo = new THREE.ConeGeometry(def.areaRadius, def.height, 12, 1, true);
      const vortexMat = new THREE.MeshBasicMaterial({
        color: def.color, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
      });
      const vortex = new THREE.Mesh(vortexGeo, vortexMat);
      vortex.position.y = def.height / 2;
      group.add(vortex);
      // Ring particles
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const rGeo = new THREE.TorusGeometry(def.areaRadius * (0.5 + i * 0.08), 0.05, 10, 12);
        const rMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.3 });
        const ring = new THREE.Mesh(rGeo, rMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = (i / 6) * def.height;
        ring.rotation.z = angle;
        group.add(ring);
      }
      break;
    }
  }

  group.position.set(entity.x, entity.y, entity.z);
  group.rotation.y = entity.yaw;
  return group;
}

/**
 * Collision check: is a point inside an env spell entity's area?
 */
export function isInsideEnvSpell(entity: EnvSpellEntity, px: number, py: number, pz: number): boolean {
  const def = getEnvSpellDef(entity.defId);
  if (def.areaRadius > 0) {
    const d = dist2(px, pz, entity.x, entity.z);
    return d < def.areaRadius && py >= entity.y && py <= entity.y + def.height;
  }
  // Box collision (rotated by yaw)
  const cos = Math.cos(-entity.yaw);
  const sin = Math.sin(-entity.yaw);
  const dx = px - entity.x;
  const dz = pz - entity.z;
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;
  return Math.abs(lx) < def.width / 2 && Math.abs(lz) < def.depth / 2 &&
    py >= entity.y && py <= entity.y + def.height;
}

/**
 * Check if a projectile should be blocked by an env spell entity.
 */
export function doesEnvSpellBlockProjectile(entity: EnvSpellEntity, px: number, py: number, pz: number): boolean {
  const def = getEnvSpellDef(entity.defId);
  if (!def.blockProjectiles) return false;
  return isInsideEnvSpell(entity, px, py, pz);
}

/**
 * Per-tick update for an env spell entity — returns effects to apply.
 */
export interface EnvTickEffect {
  type: "damage" | "heal" | "slow" | "freeze" | "stun" | "blind" | "teleport" | "pull_launch" | "turret_fire";
  targetId?: string;
  value: number;
  duration?: number;
  // For turret fire
  targetX?: number; targetY?: number; targetZ?: number;
}

export function tickEnvSpellEntity(
  entity: EnvSpellEntity,
  dt: number,
  /** nearby players: { id, team, x, y, z, alive } */
  nearbyPlayers: Array<{ id: string; team: 0 | 1; x: number; y: number; z: number; alive: boolean }>,
): EnvTickEffect[] {
  const def = getEnvSpellDef(entity.defId);
  const effects: EnvTickEffect[] = [];

  entity.duration -= dt;
  entity.tickAccum += dt;

  // Fade mesh opacity as duration runs out
  if (entity.mesh && entity.duration < 3) {
    entity.mesh.traverse(child => {
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (mat.transparent !== undefined) {
          mat.opacity = clamp(entity.duration / 3, 0.1, mat.opacity);
        }
      }
    });
  }

  // Rotate vortex mesh
  if (def.type === "wind_vortex" && entity.mesh) {
    entity.mesh.rotation.y += dt * 3;
  }

  for (const p of nearbyPlayers) {
    if (!p.alive) continue;
    if (!isInsideEnvSpell(entity, p.x, p.y, p.z)) continue;

    switch (def.specialEffect) {
      case "freeze_on_touch":
        if (p.team !== entity.team && entity.tickAccum >= 1.0) {
          effects.push({ type: "freeze", targetId: p.id, value: 0, duration: 1.5 });
        }
        break;
      case "dot_fire":
        if (p.team !== entity.team && entity.tickAccum >= 1.0) {
          effects.push({ type: "damage", targetId: p.id, value: def.damagePerSecond * 1.0 });
        }
        break;
      case "stun_on_pass":
        if (p.team !== entity.team) {
          effects.push({ type: "damage", targetId: p.id, value: def.damagePerSecond * dt });
          effects.push({ type: "stun", targetId: p.id, value: 0, duration: 0.5 });
        }
        break;
      case "blind_enemies":
        if (p.team !== entity.team) {
          effects.push({ type: "blind", targetId: p.id, value: 0, duration: 0.5 });
          effects.push({ type: "damage", targetId: p.id, value: def.damagePerSecond * dt });
        }
        break;
      case "heal_allies":
        if (p.team === entity.team && entity.tickAccum >= 1.0) {
          effects.push({ type: "heal", targetId: p.id, value: 5 });
        }
        break;
      case "pull_and_launch":
        if (p.team !== entity.team) {
          effects.push({ type: "pull_launch", targetId: p.id, value: 8 });
          effects.push({ type: "damage", targetId: p.id, value: def.damagePerSecond * dt });
        }
        break;
    }
  }

  // Turret logic
  if (def.specialEffect === "auto_turret") {
    entity.turretFireTimer -= dt;
    if (entity.turretFireTimer <= 0) {
      // Find closest enemy
      let bestDist = 30;
      let bestTarget: (typeof nearbyPlayers)[0] | null = null;
      for (const p of nearbyPlayers) {
        if (!p.alive || p.team === entity.team) continue;
        const d = dist3(entity.x, entity.y + 1.5, entity.z, p.x, p.y, p.z);
        if (d < bestDist) { bestDist = d; bestTarget = p; }
      }
      if (bestTarget) {
        effects.push({
          type: "turret_fire",
          targetId: bestTarget.id,
          value: 12,
          targetX: bestTarget.x, targetY: bestTarget.y + 0.8, targetZ: bestTarget.z,
        });
        entity.turretFireTimer = 0.8;
      }
    }
  }

  // Teleport logic — handled by main game (needs portal pair lookup)
  if (def.specialEffect === "teleport_link" && entity.linkedPortalId) {
    for (const p of nearbyPlayers) {
      if (!p.alive) continue;
      if (p.team !== entity.team) continue;
      if (isInsideEnvSpell(entity, p.x, p.y, p.z)) {
        effects.push({ type: "teleport", targetId: p.id, value: 0 });
      }
    }
  }

  // Reset tick accumulator at intervals
  if (entity.tickAccum >= 1.0) entity.tickAccum = 0;

  return effects;
}


// ===========================================================================
// 3. DRAGON RIDING COMBAT SYSTEM
// ===========================================================================

export interface DragonRiderState {
  dragonDefId: string;
  riderId: string;
  team: 0 | 1;
  hp: number;
  maxHp: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number; pitch: number;
  roll: number;
  speed: number;
  altitude: number;
  isBreathing: boolean;
  breathTimer: number;
  barrelRollTimer: number;
  barrelRollCooldown: number;
  barrelRolling: boolean;
  barrelRollAngle: number;
  lockOnTarget: string | null;
  lockOnProgress: number;     // 0-1, 1 = full lock
  alive: boolean;
  mesh: THREE.Group | null;
  breathParticles: THREE.Mesh[];
}

export function createDragonRider(
  defId: string, riderId: string, team: 0 | 1,
  x: number, y: number, z: number,
): DragonRiderState {
  const def = getDragonMountDef(defId);
  return {
    dragonDefId: defId, riderId, team,
    hp: def.hp, maxHp: def.hp,
    x, y: Math.max(y, def.minAltitude), z,
    vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0, roll: 0,
    speed: def.speed,
    altitude: Math.max(y, def.minAltitude),
    isBreathing: false, breathTimer: 0,
    barrelRollTimer: 0, barrelRollCooldown: 0,
    barrelRolling: false, barrelRollAngle: 0,
    lockOnTarget: null, lockOnProgress: 0,
    alive: true, mesh: null, breathParticles: [],
  };
}

/**
 * Build a dragon mesh (body + wings + tail).
 */
export function buildDragonMesh(state: DragonRiderState): THREE.Group {
  const def = getDragonMountDef(state.dragonDefId);
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.CapsuleGeometry(0.8, 3, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: def.bodyColor, roughness: 0.6, metalness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.ConeGeometry(0.5, 1.2, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: def.bodyColor, roughness: 0.5 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.rotation.x = Math.PI / 2;
  head.position.z = -2.5;
  head.position.y = 0.2;
  group.add(head);

  // Wings (left and right)
  const wingGeo = new THREE.PlaneGeometry(4, 1.5);
  const wingMat = new THREE.MeshStandardMaterial({
    color: def.wingColor, side: THREE.DoubleSide, transparent: true, opacity: 0.8,
  });
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-2.5, 0.3, 0);
  leftWing.rotation.z = 0.2;
  leftWing.name = "dragonLeftWing";
  group.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo.clone(), wingMat.clone());
  rightWing.position.set(2.5, 0.3, 0);
  rightWing.rotation.z = -0.2;
  rightWing.name = "dragonRightWing";
  group.add(rightWing);

  // Tail
  const tailGeo = new THREE.ConeGeometry(0.3, 2.5, 10);
  const tailMat = new THREE.MeshStandardMaterial({ color: def.accentColor });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = 2.5;
  group.add(tail);

  // Eyes (glow)
  const eyeGeo = new THREE.SphereGeometry(0.1, 12, 10);
  const eyeMat = new THREE.MeshBasicMaterial({ color: def.accentColor });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.25, 0.35, -2.8);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeMat.clone());
  rightEye.position.set(0.25, 0.35, -2.8);
  group.add(rightEye);

  group.position.set(state.x, state.y, state.z);
  return group;
}

export interface DragonTickInput {
  throttle: number;     // -1 to 1 (back/forward)
  yawInput: number;     // -1 to 1 (turn left/right)
  pitchInput: number;   // -1 to 1 (nose up/down)
  wantBreath: boolean;
  wantBarrelRoll: boolean;
  wantDiveBomb: boolean;
}

export interface DragonTickResult {
  breathHits: Array<{ targetId: string; damage: number }>;
  tailSwipeHits: Array<{ targetId: string; damage: number }>;
  diveBombHits: Array<{ targetId: string; damage: number }>;
  dismounted: boolean;
}

/**
 * Update a dragon rider's state for one tick.
 */
export function tickDragonRider(
  state: DragonRiderState,
  input: DragonTickInput,
  dt: number,
  nearbyTargets: Array<{ id: string; x: number; y: number; z: number; alive: boolean }>,
): DragonTickResult {
  const def = getDragonMountDef(state.dragonDefId);
  const result: DragonTickResult = {
    breathHits: [], tailSwipeHits: [], diveBombHits: [], dismounted: false,
  };

  if (!state.alive) return result;

  // Barrel roll cooldown
  if (state.barrelRollCooldown > 0) state.barrelRollCooldown -= dt;

  // Barrel roll execution
  if (state.barrelRolling) {
    state.barrelRollTimer -= dt;
    state.barrelRollAngle += (Math.PI * 2 / DRAGON_COMBAT.BARREL_ROLL_DURATION) * dt;
    state.roll = Math.sin(state.barrelRollAngle) * Math.PI;
    if (state.barrelRollTimer <= 0) {
      state.barrelRolling = false;
      state.roll = 0;
      state.barrelRollAngle = 0;
    }
  }

  // Initiate barrel roll
  if (input.wantBarrelRoll && !state.barrelRolling && state.barrelRollCooldown <= 0) {
    state.barrelRolling = true;
    state.barrelRollTimer = DRAGON_COMBAT.BARREL_ROLL_DURATION;
    state.barrelRollCooldown = def.barrelRollCooldown;
    state.barrelRollAngle = 0;
  }

  // Yaw / pitch
  state.yaw += input.yawInput * def.turnSpeed * dt;
  state.pitch = clamp(
    state.pitch + input.pitchInput * def.turnSpeed * dt,
    -Math.PI / 3, Math.PI / 3,
  );

  // Speed: throttle controls acceleration
  const targetSpeed = input.throttle > 0
    ? def.speed + (def.maxSpeed - def.speed) * input.throttle
    : def.speed * (1 + input.throttle * (1 - DRAGON_COMBAT.AIR_BRAKE_MULT));
  state.speed += (targetSpeed - state.speed) * 3 * dt;
  state.speed = clamp(state.speed, def.speed * DRAGON_COMBAT.AIR_BRAKE_MULT, def.maxSpeed);

  // Dive bomb
  if (input.wantDiveBomb && state.pitch > 0.2) {
    state.speed = def.maxSpeed * DRAGON_COMBAT.DIVE_BOMB_SPEED_MULT;
  }

  // Movement
  const cosY = Math.cos(state.yaw);
  const sinY = Math.sin(state.yaw);
  const cosP = Math.cos(state.pitch);
  const sinP = Math.sin(state.pitch);

  state.vx = -sinY * cosP * state.speed;
  state.vy = -sinP * state.speed;
  state.vz = -cosY * cosP * state.speed;

  // Climb/dive rate clamping
  if (state.vy > 0) state.vy = Math.min(state.vy, def.climbRate);
  if (state.vy < 0) state.vy = Math.max(state.vy, -def.diveRate);

  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.z += state.vz * dt;

  // Altitude clamping
  state.y = clamp(state.y, def.minAltitude, def.maxAltitude);
  state.altitude = state.y;

  // Breath weapon
  if (input.wantBreath) {
    state.isBreathing = true;
    state.breathTimer += dt;
    // Check breath hits
    for (const t of nearbyTargets) {
      if (!t.alive) continue;
      const dx = t.x - state.x;
      const dy = t.y - state.y;
      const dz = t.z - state.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > def.breathRange) continue;
      // Angle check (cone)
      const toTargetAngle = Math.atan2(-dx, -dz);
      let angleDiff = toTargetAngle - state.yaw;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) < def.breathConeAngle) {
        result.breathHits.push({ targetId: t.id, damage: def.breathDamage * dt * 10 });
      }
    }
  } else {
    state.isBreathing = false;
    state.breathTimer = 0;
  }

  // Tail swipe (damage behind the dragon)
  for (const t of nearbyTargets) {
    if (!t.alive) continue;
    const dx = t.x - state.x;
    const dz = t.z - state.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > def.tailSwipeRange) continue;
    // Must be behind
    const behindAngle = Math.atan2(-dx, -dz);
    let angleDiff = behindAngle - (state.yaw + Math.PI);
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    if (Math.abs(angleDiff) < 0.8) {
      result.tailSwipeHits.push({ targetId: t.id, damage: def.tailSwipeDamage * dt });
    }
  }

  // Dive bomb check: if going very fast and near ground, AoE damage on pull-up
  if (input.wantDiveBomb && state.speed > def.maxSpeed * 1.5 && state.y < def.minAltitude + 3) {
    for (const t of nearbyTargets) {
      if (!t.alive) continue;
      const d = dist3(state.x, state.y, state.z, t.x, t.y, t.z);
      if (d < DRAGON_COMBAT.DIVE_BOMB_RADIUS) {
        result.diveBombHits.push({ targetId: t.id, damage: DRAGON_COMBAT.DIVE_BOMB_DAMAGE * (1 - d / DRAGON_COMBAT.DIVE_BOMB_RADIUS) });
      }
    }
    // Pull up after dive bomb
    state.pitch = -0.3;
    state.speed = def.speed;
  }

  // Animate mesh
  if (state.mesh) {
    state.mesh.position.set(state.x, state.y, state.z);
    state.mesh.rotation.set(state.pitch, state.yaw, state.roll);
    // Wing flap
    state.mesh.traverse(c => {
      if (c.name === "dragonLeftWing") {
        c.rotation.z = 0.2 + Math.sin(state.breathTimer * 3 + Date.now() * 0.003) * 0.15;
      }
      if (c.name === "dragonRightWing") {
        c.rotation.z = -0.2 - Math.sin(state.breathTimer * 3 + Date.now() * 0.003) * 0.15;
      }
    });
  }

  // Lock-on system
  if (nearbyTargets.length > 0) {
    let bestLockTarget: string | null = null;
    let bestLockDist = DRAGON_COMBAT.LOCK_ON_RANGE;
    for (const t of nearbyTargets) {
      if (!t.alive) continue;
      const dx = t.x - state.x;
      const dz = t.z - state.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > DRAGON_COMBAT.LOCK_ON_RANGE) continue;
      const toAngle = Math.atan2(-dx, -dz);
      let angleDiff = toAngle - state.yaw;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) < DRAGON_COMBAT.LOCK_ON_ANGLE && d < bestLockDist) {
        bestLockDist = d;
        bestLockTarget = t.id;
      }
    }
    if (bestLockTarget && bestLockTarget === state.lockOnTarget) {
      state.lockOnProgress = clamp(state.lockOnProgress + dt / DRAGON_COMBAT.LOCK_ON_TIME, 0, 1);
    } else {
      state.lockOnTarget = bestLockTarget;
      state.lockOnProgress = bestLockTarget ? dt / DRAGON_COMBAT.LOCK_ON_TIME : 0;
    }
  } else {
    state.lockOnTarget = null;
    state.lockOnProgress = 0;
  }

  return result;
}


// ===========================================================================
// 4. DUELING ARENA SYSTEM
// ===========================================================================

export interface DuelMatchState {
  arenaId: string;
  phase: DuelPhase;
  phaseTimer: number;
  player1: DuelFighterState;
  player2: DuelFighterState;
  roundNumber: number;
  player1Wins: number;
  player2Wins: number;
  hazardTimers: number[];  // per-hazard cooldown accumulators
  hazardActive: boolean[]; // per-hazard active state
}

export interface DuelFighterState {
  playerId: string;
  classId: string;
  loadout: DuelLoadout;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  x: number; y: number; z: number;
  yaw: number; pitch: number;
  alive: boolean;
  // Crafted spell cooldowns (indexed by slot)
  craftedSpellCooldowns: number[];
  envSpellCooldown: number;
  // Status effects
  frozen: boolean;
  frozenTimer: number;
  stunned: boolean;
  stunTimer: number;
  slowed: boolean;
  slowTimer: number;
  slowFactor: number;
  blinded: boolean;
  blindTimer: number;
  dotActive: boolean;
  dotDamage: number;
  dotTimer: number;
}

export function createDuelMatchState(
  arenaId: string,
  p1ClassId: string, p1Loadout: DuelLoadout,
  p2ClassId: string, p2Loadout: DuelLoadout,
  isP2AI: boolean,
): DuelMatchState {
  const arena = getDuelArenaDef(arenaId);
  return {
    arenaId,
    phase: "spell_select",
    phaseTimer: DUEL_SPELL_SELECT_TIME,
    player1: createDuelFighter("player_0", p1ClassId, p1Loadout, -arena.size * 0.4, 0, 0),
    player2: createDuelFighter(isP2AI ? "ai_duelist" : "player_1", p2ClassId, p2Loadout, arena.size * 0.4, 0, Math.PI),
    roundNumber: 1,
    player1Wins: 0,
    player2Wins: 0,
    hazardTimers: arena.hazards.map(() => 0),
    hazardActive: arena.hazards.map(() => false),
  };
}

function createDuelFighter(
  playerId: string, classId: string, loadout: DuelLoadout,
  x: number, z: number, yaw: number,
): DuelFighterState {
  // Resolve HP/mana from a simplified lookup (to avoid importing MAGE_CLASSES here)
  const classStats: Record<string, { hp: number; mana: number }> = {
    battlemage: { hp: 120, mana: 80 },
    pyromancer: { hp: 90, mana: 100 },
    cryomancer: { hp: 95, mana: 90 },
    stormcaller: { hp: 100, mana: 95 },
    shadowmancer: { hp: 85, mana: 110 },
    druid: { hp: 130, mana: 100 },
    warlock: { hp: 95, mana: 120 },
    archmage: { hp: 100, mana: 130 },
  };
  const stats = classStats[classId] || classStats.battlemage;

  return {
    playerId, classId, loadout,
    hp: stats.hp, maxHp: stats.hp,
    mana: stats.mana, maxMana: stats.mana,
    x, y: 0, z, yaw, pitch: 0,
    alive: true,
    craftedSpellCooldowns: loadout.craftedSpellIds.map(() => 0),
    envSpellCooldown: 0,
    frozen: false, frozenTimer: 0,
    stunned: false, stunTimer: 0,
    slowed: false, slowTimer: 0, slowFactor: 1,
    blinded: false, blindTimer: 0,
    dotActive: false, dotDamage: 0, dotTimer: 0,
  };
}

export interface DuelTickResult {
  phaseChanged: boolean;
  newPhase: DuelPhase;
  roundWinner: string | null;    // player id or null
  matchWinner: string | null;
  hazardDamages: Array<{ playerId: string; damage: number; hazardType: string }>;
}

/**
 * Tick the duel match state.
 */
export function tickDuelMatch(state: DuelMatchState, dt: number): DuelTickResult {
  const arena = getDuelArenaDef(state.arenaId);
  const result: DuelTickResult = {
    phaseChanged: false, newPhase: state.phase,
    roundWinner: null, matchWinner: null,
    hazardDamages: [],
  };

  state.phaseTimer -= dt;

  // Phase transitions
  switch (state.phase) {
    case "spell_select":
      if (state.phaseTimer <= 0) {
        state.phase = "countdown";
        state.phaseTimer = DUEL_COUNTDOWN_TIME;
        result.phaseChanged = true;
        result.newPhase = "countdown";
      }
      break;

    case "countdown":
      if (state.phaseTimer <= 0) {
        state.phase = "fighting";
        state.phaseTimer = DUEL_ROUND_TIME;
        result.phaseChanged = true;
        result.newPhase = "fighting";
      }
      break;

    case "fighting": {
      // Update status effects for both fighters
      for (const f of [state.player1, state.player2]) {
        if (f.frozen) { f.frozenTimer -= dt; if (f.frozenTimer <= 0) f.frozen = false; }
        if (f.stunned) { f.stunTimer -= dt; if (f.stunTimer <= 0) f.stunned = false; }
        if (f.slowed) { f.slowTimer -= dt; if (f.slowTimer <= 0) { f.slowed = false; f.slowFactor = 1; } }
        if (f.blinded) { f.blindTimer -= dt; if (f.blindTimer <= 0) f.blinded = false; }
        if (f.dotActive) {
          f.hp -= f.dotDamage * dt;
          f.dotTimer -= dt;
          if (f.dotTimer <= 0) f.dotActive = false;
        }
        // Clamp HP
        if (f.hp <= 0) { f.hp = 0; f.alive = false; }
        // Decrement crafted spell cooldowns
        for (let i = 0; i < f.craftedSpellCooldowns.length; i++) {
          if (f.craftedSpellCooldowns[i] > 0) f.craftedSpellCooldowns[i] -= dt;
        }
        if (f.envSpellCooldown > 0) f.envSpellCooldown -= dt;
      }

      // Hazards
      for (let h = 0; h < arena.hazards.length; h++) {
        const hazard = arena.hazards[h];
        if (hazard.interval > 0) {
          state.hazardTimers[h] += dt;
          if (state.hazardTimers[h] >= hazard.interval) {
            state.hazardActive[h] = true;
            state.hazardTimers[h] = 0;
            // Active for 1 second
            setTimeout(() => { state.hazardActive[h] = false; }, 1000);
          }
        } else {
          state.hazardActive[h] = true;
        }

        if (!state.hazardActive[h]) continue;

        for (const f of [state.player1, state.player2]) {
          if (!f.alive) continue;
          const d = dist2(f.x, f.z, hazard.x, hazard.z);
          if (d < hazard.radius) {
            const dmg = hazard.damage * dt;
            result.hazardDamages.push({ playerId: f.playerId, damage: dmg, hazardType: hazard.type });
            f.hp -= dmg;
            if (f.hp <= 0) { f.hp = 0; f.alive = false; }
          }
        }
      }

      // Check round end
      let roundWinner: string | null = null;
      if (!state.player1.alive && !state.player2.alive) {
        // Draw — no winner for this round, restart
        roundWinner = null;
      } else if (!state.player1.alive) {
        roundWinner = state.player2.playerId;
        state.player2Wins++;
      } else if (!state.player2.alive) {
        roundWinner = state.player1.playerId;
        state.player1Wins++;
      } else if (state.phaseTimer <= 0) {
        // Time out — whoever has more HP wins
        if (state.player1.hp > state.player2.hp) {
          roundWinner = state.player1.playerId;
          state.player1Wins++;
        } else if (state.player2.hp > state.player1.hp) {
          roundWinner = state.player2.playerId;
          state.player2Wins++;
        }
        // Exact tie = no winner
      }

      if (roundWinner !== null || state.phaseTimer <= 0 || !state.player1.alive || !state.player2.alive) {
        result.roundWinner = roundWinner;
        state.phase = "round_end";
        state.phaseTimer = 3; // 3 second delay between rounds
        result.phaseChanged = true;
        result.newPhase = "round_end";

        // Check match win
        if (state.player1Wins >= DUEL_ROUNDS_TO_WIN) {
          result.matchWinner = state.player1.playerId;
          state.phase = "match_end";
          state.phaseTimer = 5;
          result.newPhase = "match_end";
        } else if (state.player2Wins >= DUEL_ROUNDS_TO_WIN) {
          result.matchWinner = state.player2.playerId;
          state.phase = "match_end";
          state.phaseTimer = 5;
          result.newPhase = "match_end";
        }
      }
      break;
    }

    case "round_end":
      if (state.phaseTimer <= 0) {
        // Reset fighters for next round
        state.roundNumber++;
        resetDuelFighter(state.player1);
        resetDuelFighter(state.player2);
        state.phase = "countdown";
        state.phaseTimer = DUEL_COUNTDOWN_TIME;
        state.hazardTimers = arena.hazards.map(() => 0);
        state.hazardActive = arena.hazards.map(() => false);
        result.phaseChanged = true;
        result.newPhase = "countdown";
      }
      break;

    case "match_end":
      // Waiting for UI to handle transition
      break;
  }

  return result;
}

function resetDuelFighter(f: DuelFighterState): void {
  const classStats: Record<string, { hp: number; mana: number }> = {
    battlemage: { hp: 120, mana: 80 },
    pyromancer: { hp: 90, mana: 100 },
    cryomancer: { hp: 95, mana: 90 },
    stormcaller: { hp: 100, mana: 95 },
    shadowmancer: { hp: 85, mana: 110 },
    druid: { hp: 130, mana: 100 },
    warlock: { hp: 95, mana: 120 },
    archmage: { hp: 100, mana: 130 },
  };
  const stats = classStats[f.classId] || classStats.battlemage;
  f.hp = stats.hp;
  f.maxHp = stats.hp;
  f.mana = stats.mana;
  f.maxMana = stats.mana;
  f.alive = true;
  f.frozen = false; f.frozenTimer = 0;
  f.stunned = false; f.stunTimer = 0;
  f.slowed = false; f.slowTimer = 0; f.slowFactor = 1;
  f.blinded = false; f.blindTimer = 0;
  f.dotActive = false; f.dotDamage = 0; f.dotTimer = 0;
  f.craftedSpellCooldowns = f.loadout.craftedSpellIds.map(() => 0);
  f.envSpellCooldown = 0;
}

/**
 * Build the duel arena scene geometry.
 */
export function buildDuelArenaScene(arenaId: string, scene: THREE.Scene): THREE.Group {
  const arena = getDuelArenaDef(arenaId);
  const group = new THREE.Group();

  // Ground
  const groundGeo = new THREE.CylinderGeometry(arena.size, arena.size, 0.5, 32);
  const groundMat = new THREE.MeshStandardMaterial({ color: arena.groundColor, roughness: 0.8 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.25;
  ground.receiveShadow = true;
  group.add(ground);

  // Arena wall ring
  const wallGeo = new THREE.TorusGeometry(arena.size, 0.5, 8, 32);
  const wallMat = new THREE.MeshStandardMaterial({ color: arena.wallColor, roughness: 0.6 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.rotation.x = Math.PI / 2;
  wall.position.y = 1;
  wall.castShadow = true;
  group.add(wall);

  // Decorative pillars around the edge
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = Math.cos(angle) * (arena.size - 0.5);
    const pz = Math.sin(angle) * (arena.size - 0.5);
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.35, 4, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: arena.wallColor, roughness: 0.5 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(px, 2, pz);
    pillar.castShadow = true;
    group.add(pillar);

    // Pillar top crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.2);
    const crystalMat = new THREE.MeshBasicMaterial({ color: arena.ambientColor });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(px, 4.2, pz);
    group.add(crystal);
  }

  // Hazard meshes
  for (const hazard of arena.hazards) {
    switch (hazard.type) {
      case "lava_pool": {
        const lavaGeo = new THREE.CylinderGeometry(hazard.radius, hazard.radius, 0.1, 16);
        const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 });
        const lava = new THREE.Mesh(lavaGeo, lavaMat);
        lava.position.set(hazard.x, 0.05, hazard.z);
        group.add(lava);
        const lavaLight = new THREE.PointLight(0xff4400, 0.5, 6);
        lavaLight.position.set(hazard.x, 0.5, hazard.z);
        group.add(lavaLight);
        break;
      }
      case "spike_trap": {
        const spikeBase = new THREE.CylinderGeometry(hazard.radius, hazard.radius, 0.05, 8);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const base = new THREE.Mesh(spikeBase, spikeMat);
        base.position.set(hazard.x, 0.025, hazard.z);
        group.add(base);
        break;
      }
      case "lightning_strike": {
        // Mark zone
        const zoneGeo = new THREE.RingGeometry(hazard.radius - 0.1, hazard.radius, 12);
        const zoneMat = new THREE.MeshBasicMaterial({ color: 0xffff44, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        const zone = new THREE.Mesh(zoneGeo, zoneMat);
        zone.rotation.x = -Math.PI / 2;
        zone.position.set(hazard.x, 0.05, hazard.z);
        group.add(zone);
        break;
      }
      case "wind_gust": {
        const gustGeo = new THREE.ConeGeometry(hazard.radius, 2, 6, 1, true);
        const gustMat = new THREE.MeshBasicMaterial({ color: 0xccffcc, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
        const gust = new THREE.Mesh(gustGeo, gustMat);
        gust.position.set(hazard.x, 1, hazard.z);
        group.add(gust);
        break;
      }
    }
  }

  // Ambient light for the arena
  const ambLight = new THREE.AmbientLight(arena.ambientColor, 0.5);
  group.add(ambLight);

  // Directional light
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  group.add(dirLight);

  scene.add(group);
  return group;
}
