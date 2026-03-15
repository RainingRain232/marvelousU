// ---------------------------------------------------------------------------
// Panzer Dragoon mode — combat system (projectiles, collisions, skills)
// ---------------------------------------------------------------------------

import type { DragoonState, DragoonProjectile, DragoonEnemy, DragoonExplosion, DragoonPickup, DragoonCompanion } from "../state/DragoonState";
import { DragoonSkillId, EnemyPattern, DragoonPickupType, xpForLevel } from "../state/DragoonState";
import { DragoonBalance, SKILL_CONFIGS, CLASS_DEFINITIONS, UNLOCKABLE_SKILLS } from "../config/DragoonConfig";

// Callbacks for FX
let _onExplosion: ((x: number, y: number, radius: number, color: number) => void) | null = null;
let _onHit: ((x: number, y: number, damage: number, isCrit: boolean) => void) | null = null;
let _onPlayerHit: (() => void) | null = null;
let _onLightningStrike: ((x: number, y: number) => void) | null = null;
let _onLevelUp: ((level: number) => void) | null = null;
let _onSkillUnlock: ((skillId: DragoonSkillId) => void) | null = null;

export const DragoonCombatSystem = {
  setExplosionCallback(cb: typeof _onExplosion): void { _onExplosion = cb; },
  setHitCallback(cb: typeof _onHit): void { _onHit = cb; },
  setPlayerHitCallback(cb: typeof _onPlayerHit): void { _onPlayerHit = cb; },
  setLightningCallback(cb: typeof _onLightningStrike): void { _onLightningStrike = cb; },
  setLevelUpCallback(cb: typeof _onLevelUp): void { _onLevelUp = cb; },
  setSkillUnlockCallback(cb: typeof _onSkillUnlock): void { _onSkillUnlock = cb; },

  update(state: DragoonState, dt: number): void {
    if (state.classSelectActive || state.subclassChoiceActive) return;

    _updateSkillCooldowns(state, dt);
    _handleSkillActivation(state, dt);
    _updateShield(state, dt);
    _updatePlayerBuffs(state, dt);
    _updatePlayerProjectiles(state, dt);
    _updateCompanions(state, dt);
    _updatePoisonClouds(state, dt);
    _updateEnemyBehavior(state, dt);
    _updateEnemyProjectiles(state, dt);
    _updateExplosions(state, dt);
    _checkPlayerCollisions(state);
    _updatePickups(state, dt);
    _updateScoreMult(state, dt);
    _updateMana(state, dt);
    _updateCombo(state, dt);
    _updateInvincibility(state, dt);
    _updateBossEntrance(state, dt);
    _updateEnemyDoTs(state, dt);
    _cleanupDead(state);
  },
};

// ---------------------------------------------------------------------------
// Skill cooldowns & activation
// ---------------------------------------------------------------------------

function _updateSkillCooldowns(state: DragoonState, dt: number): void {
  for (const skill of state.skills) {
    if (skill.cooldown > 0) skill.cooldown -= dt;
    if (skill.activeTimer > 0) skill.activeTimer -= dt;
    if (skill.activeTimer <= 0) skill.active = false;
  }
  // Unlockable skill cooldown
  if (state.unlockSkillState) {
    if (state.unlockSkillState.cooldown > 0) state.unlockSkillState.cooldown -= dt;
    if (state.unlockSkillState.activeTimer > 0) state.unlockSkillState.activeTimer -= dt;
    if (state.unlockSkillState.activeTimer <= 0) state.unlockSkillState.active = false;
  }
}

function _getSkill(state: DragoonState, id: DragoonSkillId): import("../state/DragoonState").DragoonSkillState | undefined {
  return state.skills.find(s => s.id === id);
}

function _tryActivateSkill(state: DragoonState, skillId: DragoonSkillId): boolean {
  const skill = _getSkill(state, skillId);
  if (!skill) return false;
  const cfg = SKILL_CONFIGS[skillId];
  if (skill.cooldown > 0 || state.player.mana < cfg.manaCost) return false;
  skill.cooldown = skill.maxCooldown;
  if (cfg.duration > 0) {
    skill.active = true;
    skill.activeTimer = cfg.duration;
  }
  state.player.mana -= cfg.manaCost;
  return true;
}

function _handleSkillActivation(state: DragoonState, dt: number): void {
  const inp = state.input;
  const basicAttack = state.skills[0]; // index 0 is always basic attack

  // Basic attack (auto-fire on mouse hold)
  if (inp.fire && basicAttack.cooldown <= 0) {
    basicAttack.cooldown = basicAttack.maxCooldown;
    _fireBasicAttack(state);
  }

  // Skills 1-5 map to state.skills[1]-[5]
  const skillInputs = [inp.skill1, inp.skill2, inp.skill3, inp.skill4, inp.skill5];
  for (let i = 0; i < 5; i++) {
    if (!skillInputs[i]) continue;
    // Clear the input flag
    switch (i) {
      case 0: inp.skill1 = false; break;
      case 1: inp.skill2 = false; break;
      case 2: inp.skill3 = false; break;
      case 3: inp.skill4 = false; break;
      case 4: inp.skill5 = false; break;
    }
    const skillState = state.skills[i + 1]; // +1 because index 0 is basic
    if (!skillState) continue;
    _activateSkillByIndex(state, skillState.id);
  }

  // Skill 6 — equipped unlockable skill
  if (inp.skill6) {
    inp.skill6 = false;
    if (state.equippedUnlockSkill && state.unlockSkillState) {
      _activateUnlockableSkill(state);
    }
  }

  // Update channeled skills
  _updateChanneledSkills(state, dt);
}

function _activateSkillByIndex(state: DragoonState, skillId: DragoonSkillId): void {
  switch (skillId) {
    // ===== ARCANE MAGE =====
    case DragoonSkillId.STARFALL:
      if (_tryActivateSkill(state, skillId)) _fireStarfall(state);
      break;
    case DragoonSkillId.THUNDERSTORM:
      _tryActivateSkill(state, skillId);
      break;
    case DragoonSkillId.FROST_NOVA:
      if (_tryActivateSkill(state, skillId)) _frostNova(state);
      break;
    case DragoonSkillId.METEOR_SHOWER:
      _tryActivateSkill(state, skillId);
      break;
    case DragoonSkillId.DIVINE_SHIELD:
      if (_tryActivateSkill(state, skillId)) {
        state.player.shieldActive = true;
        state.player.shieldTimer = SKILL_CONFIGS[DragoonSkillId.DIVINE_SHIELD].duration;
      }
      break;
    // Chronomancer
    case DragoonSkillId.TIME_WARP:
      if (_tryActivateSkill(state, skillId)) _timeWarp(state);
      break;
    case DragoonSkillId.TEMPORAL_LOOP:
      if (_tryActivateSkill(state, skillId)) _temporalLoop(state);
      break;
    // Void Weaver
    case DragoonSkillId.SINGULARITY:
      if (_tryActivateSkill(state, skillId)) _singularity(state);
      break;
    case DragoonSkillId.MIRROR_IMAGE:
      if (_tryActivateSkill(state, skillId)) _mirrorImage(state);
      break;

    // ===== STORM RANGER =====
    case DragoonSkillId.CHAIN_LIGHTNING:
      if (_tryActivateSkill(state, skillId)) _chainLightning(state);
      break;
    case DragoonSkillId.GALE_FORCE:
      if (_tryActivateSkill(state, skillId)) _galeForce(state);
      break;
    case DragoonSkillId.HAWK_COMPANION:
      if (_tryActivateSkill(state, skillId)) _spawnHawk(state);
      break;
    case DragoonSkillId.TORNADO:
      if (_tryActivateSkill(state, skillId)) _spawnTornado(state);
      break;
    case DragoonSkillId.WIND_WALK:
      if (_tryActivateSkill(state, skillId)) _windWalk(state);
      break;
    // Tempest Lord
    case DragoonSkillId.HURRICANE:
      _tryActivateSkill(state, skillId);
      break;
    case DragoonSkillId.THUNDER_ARMOR:
      if (_tryActivateSkill(state, skillId)) {
        state.player.thunderArmorTimer = SKILL_CONFIGS[DragoonSkillId.THUNDER_ARMOR].duration;
      }
      break;
    // Beastmaster
    case DragoonSkillId.WOLF_PACK:
      if (_tryActivateSkill(state, skillId)) _spawnWolfPack(state);
      break;
    case DragoonSkillId.EAGLE_FURY:
      if (_tryActivateSkill(state, skillId)) _eagleFury(state);
      break;

    // ===== BLOOD KNIGHT =====
    case DragoonSkillId.CRIMSON_SLASH:
      if (_tryActivateSkill(state, skillId)) _crimsonSlash(state);
      break;
    case DragoonSkillId.BLOOD_SHIELD:
      if (_tryActivateSkill(state, skillId)) {
        state.player.bloodShieldCharges = 3;
        state.player.shieldActive = true;
        state.player.shieldTimer = SKILL_CONFIGS[DragoonSkillId.BLOOD_SHIELD].duration;
      }
      break;
    case DragoonSkillId.HEMORRHAGE:
      if (_tryActivateSkill(state, skillId)) _hemorrhage(state);
      break;
    case DragoonSkillId.EXECUTION:
      if (_tryActivateSkill(state, skillId)) _execution(state);
      break;
    case DragoonSkillId.WAR_CRY:
      if (_tryActivateSkill(state, skillId)) {
        state.player.damageMultiplier = 1.8;
        state.player.damageMultTimer = SKILL_CONFIGS[DragoonSkillId.WAR_CRY].duration;
      }
      break;
    // Death Knight
    case DragoonSkillId.RAISE_DEAD:
      if (_tryActivateSkill(state, skillId)) _raiseDead(state);
      break;
    case DragoonSkillId.SOUL_HARVEST:
      if (_tryActivateSkill(state, skillId)) {
        state.player.soulHarvestTimer = SKILL_CONFIGS[DragoonSkillId.SOUL_HARVEST].duration;
      }
      break;
    // Paladin
    case DragoonSkillId.HOLY_NOVA:
      if (_tryActivateSkill(state, skillId)) _holyNova(state);
      break;
    case DragoonSkillId.CONSECRATION:
      if (_tryActivateSkill(state, skillId)) {
        state.player.consecrateTimer = SKILL_CONFIGS[DragoonSkillId.CONSECRATION].duration;
      }
      break;

    // ===== SHADOW ASSASSIN =====
    case DragoonSkillId.FAN_OF_KNIVES:
      if (_tryActivateSkill(state, skillId)) _fanOfKnives(state);
      break;
    case DragoonSkillId.POISON_CLOUD:
      if (_tryActivateSkill(state, skillId)) _spawnPoisonCloud(state);
      break;
    case DragoonSkillId.SHADOW_STEP:
      if (_tryActivateSkill(state, skillId)) _shadowStep(state);
      break;
    case DragoonSkillId.MARK_FOR_DEATH:
      if (_tryActivateSkill(state, skillId)) _markForDeath(state);
      break;
    case DragoonSkillId.SMOKE_BOMB:
      if (_tryActivateSkill(state, skillId)) {
        state.player.invincTimer = SKILL_CONFIGS[DragoonSkillId.SMOKE_BOMB].duration;
        state.player.speedMultiplier = 1.4;
        state.player.speedMultTimer = SKILL_CONFIGS[DragoonSkillId.SMOKE_BOMB].duration;
      }
      break;
    // Ninja
    case DragoonSkillId.SHADOW_CLONE_ARMY:
      if (_tryActivateSkill(state, skillId)) _shadowCloneArmy(state);
      break;
    case DragoonSkillId.BLADE_STORM:
      if (_tryActivateSkill(state, skillId)) {
        state.player.bladeStormTimer = SKILL_CONFIGS[DragoonSkillId.BLADE_STORM].duration;
      }
      break;
    // Phantom
    case DragoonSkillId.SOUL_SIPHON:
      _tryActivateSkill(state, skillId);
      break;
    case DragoonSkillId.PHASE_SHIFT:
      if (_tryActivateSkill(state, skillId)) {
        state.player.phaseShiftTimer = SKILL_CONFIGS[DragoonSkillId.PHASE_SHIFT].duration;
        state.player.invincTimer = SKILL_CONFIGS[DragoonSkillId.PHASE_SHIFT].duration;
        state.player.damageMultiplier = 2;
        state.player.damageMultTimer = SKILL_CONFIGS[DragoonSkillId.PHASE_SHIFT].duration;
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// Unlockable skill activation
// ---------------------------------------------------------------------------

function _activateUnlockableSkill(state: DragoonState): void {
  const skillState = state.unlockSkillState;
  if (!skillState || !state.equippedUnlockSkill) return;
  const cfg = SKILL_CONFIGS[state.equippedUnlockSkill];
  if (!cfg) return;
  if (skillState.cooldown > 0 || state.player.mana < cfg.manaCost) return;

  skillState.cooldown = skillState.maxCooldown;
  if (cfg.duration > 0) {
    skillState.active = true;
    skillState.activeTimer = cfg.duration;
  }
  state.player.mana -= cfg.manaCost;

  const p = state.player;
  const dmg = cfg.damage * p.damageMultiplier;

  switch (state.equippedUnlockSkill) {
    case DragoonSkillId.FIREBALL_BARRAGE: {
      // Launch 5 fireballs in a spread
      for (let i = -2; i <= 2; i++) {
        const angle = i * 0.18;
        const speed = 450;
        const proj: DragoonProjectile = {
          id: state.nextId++,
          position: { x: p.position.x + 20, y: p.position.y },
          velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          damage: dmg,
          radius: 12,
          lifetime: 3,
          isPlayerOwned: true,
          skillId: DragoonSkillId.FIREBALL_BARRAGE,
          color: cfg.color,
          trailColor: 0xff4400,
          pierce: 0,
          hitEnemies: new Set(),
          homing: false,
          homingTarget: null,
          size: 5,
          glowIntensity: 0.8,
        };
        state.projectiles.push(proj);
      }
      _onExplosion?.(p.position.x + 30, p.position.y, 30, cfg.color);
      break;
    }
    case DragoonSkillId.ARCANE_SHIELD: {
      p.shieldActive = true;
      p.shieldTimer = cfg.duration;
      p.invincTimer = Math.max(p.invincTimer, cfg.duration);
      break;
    }
    case DragoonSkillId.SPEED_SURGE: {
      p.speedMultiplier = 2.0;
      p.speedMultTimer = cfg.duration;
      _onExplosion?.(p.position.x, p.position.y, 50, cfg.color);
      break;
    }
    case DragoonSkillId.CHAIN_NOVA: {
      // Lightning chains between up to 8 enemies near the player
      const range = 300;
      const nearby = state.enemies.filter(e =>
        e.alive && !e.isAllied &&
        Math.hypot(e.position.x - p.position.x, e.position.y - p.position.y) < range
      ).slice(0, 8);
      for (const e of nearby) {
        _damageEnemy(state, e, dmg);
        _onLightningStrike?.(e.position.x, e.position.y);
      }
      _onExplosion?.(p.position.x, p.position.y, 60, cfg.color);
      break;
    }
    case DragoonSkillId.HEALING_LIGHT: {
      p.hp = Math.min(p.maxHp, p.hp + 40);
      _onExplosion?.(p.position.x, p.position.y, 50, cfg.color);
      break;
    }
    case DragoonSkillId.AOE_BOMB: {
      // Massive explosion at cursor position
      const mx = state.input.mouseX + state.cameraX;
      const my = state.input.mouseY;
      const radius = 150;
      const explosion: DragoonExplosion = {
        id: state.nextId++,
        position: { x: mx, y: my },
        radius: 0,
        maxRadius: radius,
        timer: 0,
        maxTimer: 0.8,
        color: cfg.color,
        damage: dmg,
        hitEnemies: new Set(),
      };
      state.explosions.push(explosion);
      _onExplosion?.(mx, my, radius, cfg.color);
      break;
    }
    case DragoonSkillId.HOMING_MISSILES: {
      // Launch 6 homing projectiles
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const proj: DragoonProjectile = {
          id: state.nextId++,
          position: { x: p.position.x, y: p.position.y },
          velocity: { x: Math.cos(angle) * 200, y: Math.sin(angle) * 200 },
          damage: dmg,
          radius: 10,
          lifetime: 4,
          isPlayerOwned: true,
          skillId: DragoonSkillId.HOMING_MISSILES,
          color: cfg.color,
          trailColor: 0xffaa00,
          pierce: 0,
          hitEnemies: new Set(),
          homing: true,
          homingTarget: null,
          size: 4,
          glowIntensity: 0.7,
        };
        state.projectiles.push(proj);
      }
      break;
    }
    case DragoonSkillId.TIME_SLOW: {
      // Slow all enemies
      for (const e of state.enemies) {
        if (e.alive && !e.isAllied) {
          e.slowFactor = 0.5;
          e.slowTimer = cfg.duration;
        }
      }
      _onExplosion?.(p.position.x, p.position.y, 200, cfg.color);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Channeled skill updates
// ---------------------------------------------------------------------------

function _updateChanneledSkills(state: DragoonState, dt: number): void {
  // Thunderstorm channeling
  const thunderSkill = _getSkill(state, DragoonSkillId.THUNDERSTORM);
  if (thunderSkill?.active && thunderSkill.activeTimer > 0) {
    const si = 0.25;
    const tPrev = thunderSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / si) - Math.floor(thunderSkill.activeTimer / si);
    for (let i = 0; i < strikes; i++) _thunderStrike(state);
  }

  // Starfall channeling
  const starSkill = _getSkill(state, DragoonSkillId.STARFALL);
  if (starSkill?.active && starSkill.activeTimer > 0) {
    const si = 0.15;
    const tPrev = starSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / si) - Math.floor(starSkill.activeTimer / si);
    for (let i = 0; i < strikes; i++) _fireHomingStar(state);
  }

  // Meteor shower channeling
  const meteorSkill = _getSkill(state, DragoonSkillId.METEOR_SHOWER);
  if (meteorSkill?.active && meteorSkill.activeTimer > 0) {
    const si = 0.3;
    const tPrev = meteorSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / si) - Math.floor(meteorSkill.activeTimer / si);
    for (let i = 0; i < strikes; i++) _meteorStrike(state);
  }

  // Singularity channeling (pull effect)
  const singSkill = _getSkill(state, DragoonSkillId.SINGULARITY);
  if (singSkill?.active && singSkill.activeTimer > 0) {
    _singularityPull(state, dt);
  }

  // Hurricane channeling
  const hurricaneSkill = _getSkill(state, DragoonSkillId.HURRICANE);
  if (hurricaneSkill?.active && hurricaneSkill.activeTimer > 0) {
    const si = 0.5;
    const tPrev = hurricaneSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / si) - Math.floor(hurricaneSkill.activeTimer / si);
    for (let i = 0; i < strikes; i++) _hurricaneStrike(state);
  }

  // Tornado channeling
  const tornadoSkill = _getSkill(state, DragoonSkillId.TORNADO);
  if (tornadoSkill?.active && tornadoSkill.activeTimer > 0) {
    const si = 0.3;
    const tPrev = tornadoSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / si) - Math.floor(tornadoSkill.activeTimer / si);
    for (let i = 0; i < strikes; i++) _tornadoStrike(state, tornadoSkill);
  }

  // Soul Siphon channeling
  const siphonSkill = _getSkill(state, DragoonSkillId.SOUL_SIPHON);
  if (siphonSkill?.active && siphonSkill.activeTimer > 0) {
    const si = 0.4;
    const tPrev = siphonSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / si) - Math.floor(siphonSkill.activeTimer / si);
    for (let i = 0; i < strikes; i++) _soulSiphonTick(state);
  }

  // Blade Storm
  if (state.player.bladeStormTimer > 0) {
    _bladeStormTick(state, dt);
  }

  // Consecration
  if (state.player.consecrateTimer > 0) {
    _consecrationTick(state, dt);
  }

  // Thunder Armor
  if (state.player.thunderArmorTimer > 0) {
    _thunderArmorTick(state, dt);
  }
}

// ---------------------------------------------------------------------------
// Basic attacks (class-specific)
// ---------------------------------------------------------------------------

function _fireBasicAttack(state: DragoonState): void {
  const basicId = state.skills[0].id;
  switch (basicId) {
    case DragoonSkillId.ARCANE_BOLT: _fireArcaneBolt(state); break;
    case DragoonSkillId.WIND_ARROW: _fireWindArrow(state); break;
    case DragoonSkillId.BLOOD_LANCE: _fireBloodLance(state); break;
    case DragoonSkillId.SHURIKEN: _fireShuriken(state); break;
    default: _fireArcaneBolt(state); break;
  }
}

function _fireArcaneBolt(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.ARCANE_BOLT];
  const angle = Math.atan2(state.input.mouseY - p.position.y, (state.input.mouseX + state.cameraX) - p.position.x);
  const speed = 700;
  _spawnPlayerProjectile(state, p.position.x + 20, p.position.y - 5, Math.cos(angle) * speed, Math.sin(angle) * speed, cfg.damage, 8, 2, cfg.color, 0x4488cc, DragoonSkillId.ARCANE_BOLT, 0, 4, false);
}

function _fireWindArrow(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.WIND_ARROW];
  const angle = Math.atan2(state.input.mouseY - p.position.y, (state.input.mouseX + state.cameraX) - p.position.x);
  const speed = 900;
  _spawnPlayerProjectile(state, p.position.x + 20, p.position.y - 5, Math.cos(angle) * speed, Math.sin(angle) * speed, cfg.damage, 7, 2, cfg.color, 0x44aa88, DragoonSkillId.WIND_ARROW, 1, 3, false);
}

function _fireBloodLance(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.BLOOD_LANCE];
  const angle = Math.atan2(state.input.mouseY - p.position.y, (state.input.mouseX + state.cameraX) - p.position.x);
  const speed = 500;
  _spawnPlayerProjectile(state, p.position.x + 20, p.position.y - 5, Math.cos(angle) * speed, Math.sin(angle) * speed, cfg.damage, 12, 1.2, cfg.color, 0x880000, DragoonSkillId.BLOOD_LANCE, 0, 6, false);
}

function _fireShuriken(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.SHURIKEN];
  const angle = Math.atan2(state.input.mouseY - p.position.y, (state.input.mouseX + state.cameraX) - p.position.x);
  const speed = 850;
  _spawnPlayerProjectile(state, p.position.x + 20, p.position.y - 5, Math.cos(angle) * speed, Math.sin(angle) * speed, cfg.damage, 6, 2, cfg.color, 0x888888, DragoonSkillId.SHURIKEN, 2, 3, false);
}

// ---------------------------------------------------------------------------
// ARCANE MAGE skills
// ---------------------------------------------------------------------------

function _fireStarfall(state: DragoonState): void {
  for (let i = 0; i < 5; i++) _fireHomingStar(state);
}

function _fireHomingStar(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.STARFALL];
  const angle = -0.3 + Math.random() * 0.6;
  const speed = 350;

  let targetId: number | null = null;
  let minDist = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    const d = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; targetId = e.id; }
  }

  const proj = _spawnPlayerProjectile(state, p.position.x + 15, p.position.y - 10, speed * Math.cos(angle), speed * Math.sin(angle) - 100, cfg.damage, 10, 4, cfg.color, 0xffaa00, DragoonSkillId.STARFALL, 1, 6, true);
  proj.homingTarget = targetId;
}

function _thunderStrike(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.THUNDERSTORM];
  const cx = state.input.mouseX + state.cameraX + (Math.random() - 0.5) * 120;
  const cy = state.input.mouseY + (Math.random() - 0.5) * 120;
  const radius = 50;
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - cx;
    const dy = e.position.y - cy;
    if (dx * dx + dy * dy < (radius + e.size * 15) * (radius + e.size * 15)) {
      _damageEnemy(state, e, cfg.damage);
    }
  }
  _onLightningStrike?.(cx, cy);
  _onExplosion?.(cx, cy, radius, cfg.color);
}

function _frostNova(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.FROST_NOVA];
  const radius = 180;
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    if (dx * dx + dy * dy < radius * radius) {
      _damageEnemy(state, e, cfg.damage);
      e.slowFactor = 0.3;
      e.slowTimer = 3;
    }
  }
  _onExplosion?.(p.position.x, p.position.y, radius, cfg.color);
}

function _meteorStrike(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.METEOR_SHOWER];
  const x = state.cameraX + state.screenW * 0.3 + Math.random() * state.screenW * 0.65;
  const y = Math.random() * state.screenH * 0.8;
  const explosion: DragoonExplosion = {
    id: state.nextId++,
    position: { x, y },
    radius: 0, maxRadius: 60 + Math.random() * 30,
    timer: 0, maxTimer: 0.4,
    color: cfg.color, damage: cfg.damage,
    hitEnemies: new Set(),
  };
  state.explosions.push(explosion);
  _onExplosion?.(x, y, explosion.maxRadius, cfg.color);
}

// Chronomancer
function _timeWarp(state: DragoonState): void {
  const dur = SKILL_CONFIGS[DragoonSkillId.TIME_WARP].duration;
  // Slow all enemies
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    e.slowFactor = 0.2;
    e.slowTimer = dur;
  }
  // Speed up player
  state.player.speedMultiplier = 1.5;
  state.player.speedMultTimer = dur;
  _onExplosion?.(state.player.position.x, state.player.position.y, 200, SKILL_CONFIGS[DragoonSkillId.TIME_WARP].color);
}

function _temporalLoop(state: DragoonState): void {
  // Reverse all enemy projectiles and make them player-owned
  for (const proj of state.projectiles) {
    if (proj.isPlayerOwned) continue;
    proj.velocity.x *= -1;
    proj.velocity.y *= -1;
    proj.isPlayerOwned = true;
    proj.damage *= 2;
    proj.color = SKILL_CONFIGS[DragoonSkillId.TEMPORAL_LOOP].color;
    proj.trailColor = 0xcc88ff;
    proj.lifetime = 3;
    proj.hitEnemies = new Set();
  }
  _onExplosion?.(state.player.position.x, state.player.position.y, 150, SKILL_CONFIGS[DragoonSkillId.TEMPORAL_LOOP].color);
}

// Void Weaver
// Singularity: stored position for pull effect
let _singularityPos = { x: 0, y: 0 };

function _singularity(state: DragoonState): void {
  _singularityPos.x = state.input.mouseX + state.cameraX;
  _singularityPos.y = state.input.mouseY;
  _onExplosion?.(_singularityPos.x, _singularityPos.y, 120, SKILL_CONFIGS[DragoonSkillId.SINGULARITY].color);
}

function _singularityPull(state: DragoonState, dt: number): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.SINGULARITY];
  const radius = 200;
  const pullStrength = 300;

  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = _singularityPos.x - e.position.x;
    const dy = _singularityPos.y - e.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius && dist > 10) {
      const force = pullStrength * (1 - dist / radius) * dt;
      e.position.x += (dx / dist) * force;
      e.position.y += (dy / dist) * force;
      // Damage enemies near center
      if (dist < 60) {
        _damageEnemy(state, e, cfg.damage * dt);
      }
    }
  }
}

function _mirrorImage(state: DragoonState): void {
  const p = state.player;
  const dur = SKILL_CONFIGS[DragoonSkillId.MIRROR_IMAGE].duration;
  const offsets = [{ x: -40, y: -40 }, { x: -40, y: 40 }];
  for (const off of offsets) {
    const clone: DragoonCompanion = {
      id: state.nextId++,
      position: { x: p.position.x + off.x, y: p.position.y + off.y },
      velocity: { x: 0, y: 0 },
      lifetime: dur,
      attackTimer: 0.3,
      type: "clone",
      damage: SKILL_CONFIGS[DragoonSkillId.MIRROR_IMAGE].damage,
    };
    state.companions.push(clone);
  }
}

// ---------------------------------------------------------------------------
// STORM RANGER skills
// ---------------------------------------------------------------------------

function _chainLightning(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.CHAIN_LIGHTNING];
  const bounces = 5;
  const bounceRange = 200;

  // Find nearest enemy
  let current: DragoonEnemy | null = null;
  let minDist = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    const d = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; current = e; }
  }
  if (!current) return;

  const hit = new Set<number>();
  for (let i = 0; i < bounces && current; i++) {
    hit.add(current.id);
    _damageEnemy(state, current, cfg.damage);
    _onLightningStrike?.(current.position.x, current.position.y);

    // Find next closest unhit enemy
    let next: DragoonEnemy | null = null;
    let nextDist = Infinity;
    for (const e of state.enemies) {
      if (!e.alive || hit.has(e.id) || e.isAllied) continue;
      const dx = e.position.x - current!.position.x;
      const dy = e.position.y - current!.position.y;
      const d = dx * dx + dy * dy;
      if (d < bounceRange * bounceRange && d < nextDist) { nextDist = d; next = e; }
    }
    current = next;
  }
}

function _galeForce(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.GALE_FORCE];
  const radius = 250;
  const pushForce = 400;

  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius) {
      _damageEnemy(state, e, cfg.damage);
      // Push away from player
      if (dist > 10) {
        e.position.x += (dx / dist) * pushForce * 0.3;
        e.position.y += (dy / dist) * pushForce * 0.1;
      }
    }
  }
  _onExplosion?.(p.position.x, p.position.y, radius, cfg.color);
}

function _spawnHawk(state: DragoonState): void {
  const p = state.player;
  const hawk: DragoonCompanion = {
    id: state.nextId++,
    position: { x: p.position.x + 30, y: p.position.y - 50 },
    velocity: { x: 0, y: 0 },
    lifetime: SKILL_CONFIGS[DragoonSkillId.HAWK_COMPANION].duration,
    attackTimer: 0,
    type: "hawk",
    damage: SKILL_CONFIGS[DragoonSkillId.HAWK_COMPANION].damage,
  };
  state.companions.push(hawk);
}

function _spawnTornado(_state: DragoonState): void {
  // Tornado is handled via channeling - creates explosions that drift right
}

function _tornadoStrike(state: DragoonState, skill: import("../state/DragoonState").DragoonSkillState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.TORNADO];
  const totalDur = cfg.duration;
  const elapsed = totalDur - skill.activeTimer;

  // Tornado moves from player position to the right
  const tx = state.player.position.x + 100 + elapsed * 200;
  const ty = state.player.position.y + Math.sin(elapsed * 6) * 80;

  const explosion: DragoonExplosion = {
    id: state.nextId++,
    position: { x: tx, y: ty },
    radius: 0, maxRadius: 70,
    timer: 0, maxTimer: 0.3,
    color: cfg.color, damage: cfg.damage,
    hitEnemies: new Set(),
  };
  state.explosions.push(explosion);
  _onExplosion?.(tx, ty, 70, cfg.color);
}

function _windWalk(state: DragoonState): void {
  const dur = SKILL_CONFIGS[DragoonSkillId.WIND_WALK].duration;
  state.player.invincTimer = dur;
  state.player.speedMultiplier = 1.5;
  state.player.speedMultTimer = dur;
  _onExplosion?.(state.player.position.x, state.player.position.y, 100, SKILL_CONFIGS[DragoonSkillId.WIND_WALK].color);
}

// Tempest Lord
function _hurricaneStrike(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.HURRICANE];
  // Damage all visible enemies
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    if (e.position.x > state.cameraX - 50 && e.position.x < state.cameraX + state.screenW + 50) {
      _damageEnemy(state, e, cfg.damage);
    }
  }
  // Lightning effects at random positions
  for (let i = 0; i < 3; i++) {
    const rx = state.cameraX + Math.random() * state.screenW;
    const ry = Math.random() * state.screenH;
    _onLightningStrike?.(rx, ry);
  }
}

function _thunderArmorTick(state: DragoonState, dt: number): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.THUNDER_ARMOR];
  const radius = 120;
  // Zap nearby enemies periodically
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - state.player.position.x;
    const dy = e.position.y - state.player.position.y;
    if (dx * dx + dy * dy < radius * radius) {
      _damageEnemy(state, e, cfg.damage * dt * 2);
    }
  }
}

// Beastmaster
function _spawnWolfPack(state: DragoonState): void {
  const p = state.player;
  const dur = SKILL_CONFIGS[DragoonSkillId.WOLF_PACK].duration;
  for (let i = 0; i < 3; i++) {
    const wolf: DragoonCompanion = {
      id: state.nextId++,
      position: { x: p.position.x - 30 - i * 20, y: p.position.y + (i - 1) * 40 },
      velocity: { x: 0, y: 0 },
      lifetime: dur,
      attackTimer: 0,
      type: "wolf",
      damage: SKILL_CONFIGS[DragoonSkillId.WOLF_PACK].damage,
    };
    state.companions.push(wolf);
  }
}

function _eagleFury(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.EAGLE_FURY];
  // Create a line of explosions across the screen
  const y = state.player.position.y;
  for (let i = 0; i < 10; i++) {
    const x = state.cameraX + (i / 9) * state.screenW;
    const explosion: DragoonExplosion = {
      id: state.nextId++,
      position: { x, y: y + (Math.random() - 0.5) * 40 },
      radius: 0, maxRadius: 80,
      timer: -i * 0.08, maxTimer: 0.4, // staggered
      color: cfg.color, damage: cfg.damage,
      hitEnemies: new Set(),
    };
    state.explosions.push(explosion);
  }
  _onExplosion?.(state.player.position.x, y, 200, cfg.color);
}

// ---------------------------------------------------------------------------
// BLOOD KNIGHT skills
// ---------------------------------------------------------------------------

function _crimsonSlash(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.CRIMSON_SLASH];
  // Fire 5 projectiles in a forward cone
  const baseAngle = Math.atan2(state.input.mouseY - p.position.y, (state.input.mouseX + state.cameraX) - p.position.x);
  for (let i = -2; i <= 2; i++) {
    const angle = baseAngle + i * 0.2;
    const speed = 500;
    _spawnPlayerProjectile(state, p.position.x + 15, p.position.y, Math.cos(angle) * speed, Math.sin(angle) * speed, cfg.damage, 10, 1.5, cfg.color, 0xaa0000, DragoonSkillId.CRIMSON_SLASH, 0, 5, false);
  }
}

function _hemorrhage(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.HEMORRHAGE];
  const cx = state.input.mouseX + state.cameraX;
  const cy = state.input.mouseY;
  const radius = 120;

  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - cx;
    const dy = e.position.y - cy;
    if (dx * dx + dy * dy < radius * radius) {
      e.dotDamage = cfg.damage;
      e.dotTimer = cfg.duration;
    }
  }
  _onExplosion?.(cx, cy, radius, cfg.color);
}

function _execution(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.EXECUTION];
  // Find lowest HP enemy
  let target: DragoonEnemy | null = null;
  let lowestHp = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    if (e.hp < lowestHp) { lowestHp = e.hp; target = e; }
  }
  if (target) {
    _damageEnemy(state, target, cfg.damage);
    _onExplosion?.(target.position.x, target.position.y, 60, cfg.color);
    _onLightningStrike?.(target.position.x, target.position.y);
  }
}

// Death Knight
function _raiseDead(state: DragoonState): void {
  const dur = SKILL_CONFIGS[DragoonSkillId.RAISE_DEAD].duration;
  // Raise up to 3 recently dead enemies as allies
  const toRaise = state.recentDeadEnemies.splice(0, 3);
  for (const dead of toRaise) {
    const ally: DragoonEnemy = {
      id: state.nextId++,
      type: dead.type,
      position: { x: dead.position.x, y: dead.position.y },
      velocity: { x: 80, y: 0 }, // moves toward enemies (right)
      hp: 50,
      maxHp: 50,
      alive: true,
      isBoss: false,
      bossPhase: 0,
      attackTimer: 1,
      hitTimer: 0,
      deathTimer: 0,
      slowFactor: 1,
      slowTimer: 0,
      size: dead.size,
      scoreValue: 0,
      pattern: EnemyPattern.STRAIGHT,
      patternTimer: 0,
      patternParam: 0,
      fireRate: 1.5,
      color: 0x228822,
      glowColor: 0x44ff44,
      dotDamage: 0,
      dotTimer: 0,
      damageAmp: 1,
      damageAmpTimer: 0,
      isAllied: true,
      alliedTimer: dur,
    };
    state.enemies.push(ally);
    _onExplosion?.(dead.position.x, dead.position.y, 40, 0x44ff44);
  }
}

// Paladin
function _holyNova(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.HOLY_NOVA];
  const radius = 220;

  // Heal player
  p.hp = Math.min(p.maxHp, p.hp + 30);

  // Damage all enemies in radius
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    if (dx * dx + dy * dy < radius * radius) {
      _damageEnemy(state, e, cfg.damage);
    }
  }
  _onExplosion?.(p.position.x, p.position.y, radius, cfg.color);
}

function _consecrationTick(state: DragoonState, dt: number): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.CONSECRATION];
  const radius = 140;

  // Heal player slowly
  p.hp = Math.min(p.maxHp, p.hp + 5 * dt);

  // Damage nearby enemies
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    if (dx * dx + dy * dy < radius * radius) {
      _damageEnemy(state, e, cfg.damage * dt * 2);
    }
  }
}

// ---------------------------------------------------------------------------
// SHADOW ASSASSIN skills
// ---------------------------------------------------------------------------

function _fanOfKnives(state: DragoonState): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.FAN_OF_KNIVES];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const speed = 600;
    _spawnPlayerProjectile(state, p.position.x, p.position.y, Math.cos(angle) * speed, Math.sin(angle) * speed, cfg.damage, 8, 1.5, cfg.color, 0xaaaaaa, DragoonSkillId.FAN_OF_KNIVES, 1, 4, false);
  }
}

function _spawnPoisonCloud(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.POISON_CLOUD];
  state.poisonClouds.push({
    id: state.nextId++,
    position: { x: state.input.mouseX + state.cameraX, y: state.input.mouseY },
    radius: 100,
    timer: cfg.duration,
    maxTimer: cfg.duration,
    damagePerTick: cfg.damage,
    tickAccumulator: 0,
    color: cfg.color,
  });
}

function _shadowStep(state: DragoonState): void {
  const p = state.player;
  // Teleport to mouse position
  p.position.x = state.input.mouseX + state.cameraX;
  p.position.y = state.input.mouseY;
  // Clamp to world bounds
  const margin = 30;
  p.position.x = Math.max(margin, Math.min(state.worldWidth - margin, p.position.x));
  p.position.y = Math.max(margin, Math.min(state.screenH - margin, p.position.y));
  // Brief invincibility
  p.invincTimer = Math.max(p.invincTimer, SKILL_CONFIGS[DragoonSkillId.SHADOW_STEP].duration);
  _onExplosion?.(p.position.x, p.position.y, 60, SKILL_CONFIGS[DragoonSkillId.SHADOW_STEP].color);
}

function _markForDeath(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.MARK_FOR_DEATH];
  // Find nearest enemy to cursor
  const mx = state.input.mouseX + state.cameraX;
  const my = state.input.mouseY;
  let target: DragoonEnemy | null = null;
  let minDist = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - mx;
    const dy = e.position.y - my;
    const d = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; target = e; }
  }
  if (target && minDist < 200 * 200) {
    target.damageAmp = 3;
    target.damageAmpTimer = cfg.duration;
    _onExplosion?.(target.position.x, target.position.y, 40, cfg.color);
  }
}

// Ninja
function _shadowCloneArmy(state: DragoonState): void {
  const p = state.player;
  const dur = SKILL_CONFIGS[DragoonSkillId.SHADOW_CLONE_ARMY].duration;
  const offsets = [
    { x: -50, y: -50 }, { x: -50, y: 50 },
    { x: 50, y: -50 }, { x: 50, y: 50 },
  ];
  for (const off of offsets) {
    const clone: DragoonCompanion = {
      id: state.nextId++,
      position: { x: p.position.x + off.x, y: p.position.y + off.y },
      velocity: { x: 0, y: 0 },
      lifetime: dur,
      attackTimer: 0.15,
      type: "clone",
      damage: SKILL_CONFIGS[DragoonSkillId.SHADOW_CLONE_ARMY].damage,
    };
    state.companions.push(clone);
  }
}

function _bladeStormTick(state: DragoonState, dt: number): void {
  const p = state.player;
  const cfg = SKILL_CONFIGS[DragoonSkillId.BLADE_STORM];
  const radius = 100;

  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    if (dx * dx + dy * dy < radius * radius) {
      _damageEnemy(state, e, cfg.damage * dt * 3);
    }
  }
}

// Phantom
function _soulSiphonTick(state: DragoonState): void {
  const cfg = SKILL_CONFIGS[DragoonSkillId.SOUL_SIPHON];
  const cx = state.input.mouseX + state.cameraX;
  const cy = state.input.mouseY;
  const radius = 120;
  let healed = false;

  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - cx;
    const dy = e.position.y - cy;
    if (dx * dx + dy * dy < radius * radius) {
      _damageEnemy(state, e, cfg.damage);
      healed = true;
    }
  }
  if (healed) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5);
  }
}

// ---------------------------------------------------------------------------
// Companion updates
// ---------------------------------------------------------------------------

function _updateCompanions(state: DragoonState, dt: number): void {
  const p = state.player;

  for (const c of state.companions) {
    c.lifetime -= dt;
    c.attackTimer -= dt;

    // Follow player
    const targetX = p.position.x + (c.type === "wolf" ? -40 : -30);
    const targetY = p.position.y;
    const dx = targetX - c.position.x;
    const dy = targetY - c.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 20) {
      const speed = c.type === "wolf" ? 400 : 350;
      c.position.x += (dx / dist) * speed * dt;
      c.position.y += (dy / dist) * speed * dt;
    }

    // Attack
    if (c.attackTimer <= 0) {
      c.attackTimer = c.type === "clone" ? 0.2 : (c.type === "hawk" ? 0.5 : 0.6);

      // Find nearest enemy
      let target: DragoonEnemy | null = null;
      let minD = Infinity;
      for (const e of state.enemies) {
        if (!e.alive || e.isAllied) continue;
        const edx = e.position.x - c.position.x;
        const edy = e.position.y - c.position.y;
        const d = edx * edx + edy * edy;
        if (d < minD) { minD = d; target = e; }
      }

      if (target) {
        const angle = Math.atan2(target.position.y - c.position.y, target.position.x - c.position.x);
        const speed = c.type === "wolf" ? 500 : 700;
        const color = c.type === "wolf" ? 0x88aa66 : (c.type === "hawk" ? 0xddaa44 : 0x8844cc);
        _spawnPlayerProjectile(state, c.position.x, c.position.y, Math.cos(angle) * speed, Math.sin(angle) * speed, c.damage, 6, 1.5, color, color, null, 0, 3, false);
      }
    }
  }

  state.companions = state.companions.filter(c => c.lifetime > 0);
}

// ---------------------------------------------------------------------------
// Poison cloud updates
// ---------------------------------------------------------------------------

function _updatePoisonClouds(state: DragoonState, dt: number): void {
  for (const cloud of state.poisonClouds) {
    cloud.timer -= dt;
    cloud.tickAccumulator += dt;

    // Damage enemies inside every 0.5s
    if (cloud.tickAccumulator >= 0.5) {
      cloud.tickAccumulator -= 0.5;
      for (const e of state.enemies) {
        if (!e.alive || e.isAllied) continue;
        const dx = e.position.x - cloud.position.x;
        const dy = e.position.y - cloud.position.y;
        if (dx * dx + dy * dy < cloud.radius * cloud.radius) {
          _damageEnemy(state, e, cloud.damagePerTick);
          e.slowFactor = Math.min(e.slowFactor, 0.6);
          e.slowTimer = Math.max(e.slowTimer, 0.5);
        }
      }
    }
  }

  state.poisonClouds = state.poisonClouds.filter(c => c.timer > 0);
}

// ---------------------------------------------------------------------------
// Player buff updates
// ---------------------------------------------------------------------------

function _updatePlayerBuffs(state: DragoonState, dt: number): void {
  const p = state.player;

  if (p.speedMultTimer > 0) {
    p.speedMultTimer -= dt;
    if (p.speedMultTimer <= 0) { p.speedMultiplier = 1; p.speedMultTimer = 0; }
  }
  if (p.damageMultTimer > 0) {
    p.damageMultTimer -= dt;
    if (p.damageMultTimer <= 0) { p.damageMultiplier = 1; p.damageMultTimer = 0; }
  }
  if (p.soulHarvestTimer > 0) p.soulHarvestTimer -= dt;
  if (p.thunderArmorTimer > 0) p.thunderArmorTimer -= dt;
  if (p.consecrateTimer > 0) p.consecrateTimer -= dt;
  if (p.phaseShiftTimer > 0) p.phaseShiftTimer -= dt;
  if (p.bladeStormTimer > 0) p.bladeStormTimer -= dt;
}

// ---------------------------------------------------------------------------
// Enemy DoT updates
// ---------------------------------------------------------------------------

function _updateEnemyDoTs(state: DragoonState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive) continue;

    // DoT damage
    if (e.dotTimer > 0) {
      e.dotTimer -= dt;
      _damageEnemy(state, e, e.dotDamage * dt);
    }

    // Damage amp expiry
    if (e.damageAmpTimer > 0) {
      e.damageAmpTimer -= dt;
      if (e.damageAmpTimer <= 0) {
        e.damageAmp = 1;
      }
    }

    // Allied timer
    if (e.isAllied && e.alliedTimer > 0) {
      e.alliedTimer -= dt;
      if (e.alliedTimer <= 0) {
        e.alive = false;
        e.deathTimer = 0.3;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Projectile helpers
// ---------------------------------------------------------------------------

function _spawnPlayerProjectile(
  state: DragoonState, x: number, y: number, vx: number, vy: number,
  damage: number, radius: number, lifetime: number,
  color: number, trailColor: number, skillId: DragoonSkillId | null,
  pierce: number, size: number, homing: boolean,
): DragoonProjectile {
  const dmgMult = state.player.damageMultiplier;
  const proj: DragoonProjectile = {
    id: state.nextId++,
    position: { x, y },
    velocity: { x: vx, y: vy },
    damage: Math.floor(damage * dmgMult),
    radius,
    lifetime,
    isPlayerOwned: true,
    skillId,
    color,
    trailColor,
    pierce,
    hitEnemies: new Set(),
    homing,
    homingTarget: null,
    size,
    glowIntensity: 0.8,
  };
  state.projectiles.push(proj);
  return proj;
}

// ---------------------------------------------------------------------------
// Projectile updates
// ---------------------------------------------------------------------------

function _updatePlayerProjectiles(state: DragoonState, dt: number): void {
  const margin = DragoonBalance.PROJECTILE_CLEANUP_MARGIN;

  for (const proj of state.projectiles) {
    if (!proj.isPlayerOwned) continue;

    // Homing behavior
    if (proj.homing && proj.homingTarget !== null) {
      const target = state.enemies.find(e => e.id === proj.homingTarget && e.alive && !e.isAllied);
      if (target) {
        const dx = target.position.x - proj.position.x;
        const dy = target.position.y - proj.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          const turnSpeed = 6;
          const curAngle = Math.atan2(proj.velocity.y, proj.velocity.x);
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - curAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const newAngle = curAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed * dt);
          const speed = Math.sqrt(proj.velocity.x * proj.velocity.x + proj.velocity.y * proj.velocity.y);
          proj.velocity.x = Math.cos(newAngle) * speed;
          proj.velocity.y = Math.sin(newAngle) * speed;
        }
      } else {
        let bestDist = Infinity;
        let bestId: number | null = null;
        for (const e of state.enemies) {
          if (!e.alive || e.isAllied) continue;
          const dx = e.position.x - proj.position.x;
          const dy = e.position.y - proj.position.y;
          const d = dx * dx + dy * dy;
          if (d < bestDist) { bestDist = d; bestId = e.id; }
        }
        proj.homingTarget = bestId;
      }
    }

    proj.position.x += proj.velocity.x * dt;
    proj.position.y += proj.velocity.y * dt;
    proj.lifetime -= dt;

    // Check collision with enemies
    for (const enemy of state.enemies) {
      if (!enemy.alive || proj.hitEnemies.has(enemy.id) || enemy.isAllied) continue;
      const dx = proj.position.x - enemy.position.x;
      const dy = proj.position.y - enemy.position.y;
      const hitDist = proj.radius + enemy.size * 15;
      if (dx * dx + dy * dy < hitDist * hitDist) {
        proj.hitEnemies.add(enemy.id);
        _damageEnemy(state, enemy, proj.damage);
        if (proj.pierce <= 0) {
          proj.lifetime = -1;
          break;
        }
        proj.pierce--;
      }
    }
  }

  // Remove expired / off-screen
  state.projectiles = state.projectiles.filter(p => {
    if (!p.isPlayerOwned) return true;
    if (p.lifetime <= 0) return false;
    if (p.position.x < state.cameraX - margin || p.position.x > state.cameraX + state.screenW + margin) return false;
    if (p.position.y < -margin || p.position.y > state.screenH + margin) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Enemy behavior
// ---------------------------------------------------------------------------

function _updateEnemyBehavior(state: DragoonState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive) {
      e.deathTimer -= dt;
      continue;
    }

    // Allied enemies move right and attack other enemies
    if (e.isAllied) {
      e.position.x += 80 * dt;
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.fireRate;
        _alliedEnemyFire(state, e);
      }
      continue;
    }

    // Slow
    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer <= 0) e.slowFactor = 1;
    }

    e.hitTimer = Math.max(0, e.hitTimer - dt);
    e.patternTimer += dt;

    const sf = e.slowFactor;

    switch (e.pattern) {
      case EnemyPattern.STRAIGHT:
        e.position.x += e.velocity.x * sf * dt;
        e.position.y += e.velocity.y * sf * dt;
        break;

      case EnemyPattern.SINE_WAVE:
        e.position.x += e.velocity.x * sf * dt;
        e.position.y += Math.sin(e.patternTimer * 2.5) * 80 * dt;
        break;

      case EnemyPattern.CIRCLE: {
        const cx = e.position.x + e.velocity.x * sf * dt * 0.3;
        e.position.x = cx;
        e.position.y += Math.sin(e.patternTimer * 3) * 100 * dt;
        break;
      }

      case EnemyPattern.DIVE: {
        const dx = state.player.position.x - e.position.x;
        const dy = state.player.position.y - e.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          const speed = 250 * sf;
          e.position.x += (dx / dist) * speed * dt;
          e.position.y += (dy / dist) * speed * dt;
        }
        if (e.position.x < -50) e.alive = false;
        break;
      }

      case EnemyPattern.HOVER:
        if (e.position.x > state.cameraX + state.screenW * 0.65) {
          e.position.x += e.velocity.x * sf * dt;
        } else {
          e.position.y += Math.sin(e.patternTimer * 1.5) * 30 * dt;
          e.position.x += Math.sin(e.patternTimer * 0.7) * 15 * dt;
        }
        break;

      case EnemyPattern.GROUND:
        e.position.x += e.velocity.x * sf * dt;
        break;

      case EnemyPattern.ZIGZAG: {
        e.position.x += e.velocity.x * sf * dt;
        const zigPhase = Math.floor(e.patternTimer / 0.8);
        const zigDir = zigPhase % 2 === 0 ? 1 : -1;
        e.position.y += zigDir * e.velocity.x * -0.6 * sf * dt;
        break;
      }

      case EnemyPattern.V_FORMATION: {
        e.position.x += e.velocity.x * sf * dt;
        const formIdx = e.patternParam;
        const vOffsetY = Math.abs(formIdx) * 25;
        const targetY = (state.screenH * 0.4) + vOffsetY * Math.sign(formIdx);
        const yDiff = targetY - e.position.y;
        e.position.y += Math.sign(yDiff) * Math.min(Math.abs(yDiff), 120 * sf * dt);
        break;
      }

      case EnemyPattern.TELEPORT: {
        e.position.x += e.velocity.x * sf * dt * 0.3;
        e.position.y += Math.sin(e.patternTimer * 1.5) * 20 * dt;
        e.patternParam -= dt;
        if (e.patternParam <= 0) {
          e.patternParam = 2.5 + Math.random() * 1.5;
          e.position.x = state.cameraX + state.screenW * 0.4 + Math.random() * state.screenW * 0.5;
          e.position.y = 60 + Math.random() * (state.screenH * 0.7);
        }
        break;
      }

      case EnemyPattern.BOSS_PATTERN:
        _updateBoss(state, e, dt);
        break;
    }

    // Fire at player
    if (e.fireRate > 0 && !e.isBoss) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.fireRate + Math.random() * 0.5;
        _enemyFire(state, e);
      }
    }

    // Remove if off-screen left
    if (e.position.x < state.cameraX - 100 && e.pattern !== EnemyPattern.BOSS_PATTERN) {
      e.alive = false;
    }
  }
}

function _alliedEnemyFire(state: DragoonState, ally: DragoonEnemy): void {
  // Allied enemies shoot at the nearest non-allied enemy
  let target: DragoonEnemy | null = null;
  let minDist = Infinity;
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied || e.id === ally.id) continue;
    const dx = e.position.x - ally.position.x;
    const dy = e.position.y - ally.position.y;
    const d = dx * dx + dy * dy;
    if (d < minDist) { minDist = d; target = e; }
  }
  if (target) {
    const angle = Math.atan2(target.position.y - ally.position.y, target.position.x - ally.position.x);
    _spawnPlayerProjectile(state, ally.position.x, ally.position.y, Math.cos(angle) * 300, Math.sin(angle) * 300, 10, 6, 2, 0x44ff44, 0x22aa22, null, 0, 4, false);
  }
}

function _updateBoss(state: DragoonState, boss: DragoonEnemy, dt: number): void {
  const sf = boss.slowFactor;
  const sw = state.screenW;
  const sh = state.screenH;

  if (boss.position.x > state.cameraX + sw * 0.7) {
    boss.position.x -= 80 * dt;
  }

  const phase = Math.floor(boss.patternTimer / 5) % 3;
  switch (phase) {
    case 0:
      boss.position.y += Math.sin(boss.patternTimer * 1.2) * 60 * sf * dt;
      break;
    case 1: {
      const dy = state.player.position.y - boss.position.y;
      boss.position.y += Math.sign(dy) * Math.min(Math.abs(dy), 120 * sf * dt);
      break;
    }
    case 2:
      boss.position.x += Math.sin(boss.patternTimer * 2) * 40 * sf * dt;
      boss.position.y += Math.cos(boss.patternTimer * 1.5) * 60 * sf * dt;
      break;
  }

  boss.position.x = Math.max(state.cameraX + sw * 0.5, Math.min(state.cameraX + sw - 50, boss.position.x));
  boss.position.y = Math.max(60, Math.min(sh - 60, boss.position.y));

  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    boss.attackTimer = boss.fireRate;
    boss.bossPhase = (boss.bossPhase + 1) % 4;

    switch (boss.bossPhase) {
      case 0:
        for (let i = -3; i <= 3; i++) {
          const angle = Math.PI + i * 0.2;
          _spawnEnemyProjectile(state, boss, angle, 250, boss.glowColor);
        }
        break;
      case 1: {
        const dx = state.player.position.x - boss.position.x;
        const dy = state.player.position.y - boss.position.y;
        const angle = Math.atan2(dy, dx);
        for (let i = 0; i < 3; i++) {
          _spawnEnemyProjectile(state, boss, angle + (i - 1) * 0.1, 300 + i * 50, boss.glowColor);
        }
        break;
      }
      case 2:
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          _spawnEnemyProjectile(state, boss, angle, 180, boss.glowColor);
        }
        break;
      case 3: {
        const dx = state.player.position.x - boss.position.x;
        const dy = state.player.position.y - boss.position.y;
        const angle = Math.atan2(dy, dx);
        _spawnEnemyProjectile(state, boss, angle, 350, boss.glowColor);
        break;
      }
    }
  }
}

function _enemyFire(state: DragoonState, enemy: DragoonEnemy): void {
  const dx = state.player.position.x - enemy.position.x;
  const dy = state.player.position.y - enemy.position.y;
  const angle = Math.atan2(dy, dx);
  _spawnEnemyProjectile(state, enemy, angle, 200, enemy.glowColor);
}

function _spawnEnemyProjectile(state: DragoonState, source: DragoonEnemy, angle: number, speed: number, color: number): void {
  const dmgScale = 1 + state.wave * DragoonBalance.ENEMY_DMG_SCALE;
  const baseDmg = source.isBoss ? 15 : 8;

  const proj: DragoonProjectile = {
    id: state.nextId++,
    position: { x: source.position.x, y: source.position.y },
    velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    damage: Math.floor(baseDmg * dmgScale),
    radius: source.isBoss ? 8 : 5,
    lifetime: 5,
    isPlayerOwned: false,
    skillId: null,
    color,
    trailColor: color,
    pierce: 0,
    hitEnemies: new Set(),
    homing: false,
    homingTarget: null,
    size: source.isBoss ? 6 : 4,
    glowIntensity: 0.6,
  };
  state.projectiles.push(proj);
}

// ---------------------------------------------------------------------------
// Enemy projectiles
// ---------------------------------------------------------------------------

function _updateEnemyProjectiles(state: DragoonState, dt: number): void {
  const margin = DragoonBalance.PROJECTILE_CLEANUP_MARGIN;

  state.projectiles = state.projectiles.filter(p => {
    if (p.isPlayerOwned) return true;
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    p.lifetime -= dt;
    if (p.lifetime <= 0) return false;
    if (p.position.x < state.cameraX - margin || p.position.x > state.cameraX + state.screenW + margin) return false;
    if (p.position.y < -margin || p.position.y > state.screenH + margin) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Player collision
// ---------------------------------------------------------------------------

function _checkPlayerCollisions(state: DragoonState): void {
  if (state.player.invincTimer > 0) return;
  const p = state.player;
  const hitR = DragoonBalance.PLAYER_HIT_RADIUS;

  // Enemy projectiles
  for (const proj of state.projectiles) {
    if (proj.isPlayerOwned) continue;
    const dx = proj.position.x - p.position.x;
    const dy = proj.position.y - p.position.y;
    if (dx * dx + dy * dy < (hitR + proj.radius) * (hitR + proj.radius)) {
      proj.lifetime = -1;
      if (p.shieldActive) {
        // Blood Shield charges
        if (p.bloodShieldCharges > 0) {
          p.bloodShieldCharges--;
          p.hp = Math.min(p.maxHp, p.hp + Math.floor(proj.damage * 0.5));
          if (p.bloodShieldCharges <= 0) {
            p.shieldActive = false;
            p.shieldTimer = 0;
          }
        }
        continue;
      }
      // Thunder Armor reduces damage
      let dmg = proj.damage;
      if (p.thunderArmorTimer > 0) dmg = Math.floor(dmg * 0.5);
      p.hp -= dmg;
      p.invincTimer = DragoonBalance.PLAYER_INVINCIBILITY;
      p.comboCount = 0;
      _onPlayerHit?.();
      if (p.hp <= 0) {
        p.hp = 0;
        state.gameOver = true;
      }
      break;
    }
  }

  // Contact with enemies
  for (const e of state.enemies) {
    if (!e.alive || e.isAllied) continue;
    const dx = e.position.x - p.position.x;
    const dy = e.position.y - p.position.y;
    const contactDist = hitR + e.size * 12;
    if (dx * dx + dy * dy < contactDist * contactDist) {
      if (p.shieldActive) continue;
      let contactDmg = e.isBoss ? 20 : 10;
      if (p.thunderArmorTimer > 0) contactDmg = Math.floor(contactDmg * 0.5);
      p.hp -= contactDmg;
      p.invincTimer = DragoonBalance.PLAYER_INVINCIBILITY;
      p.comboCount = 0;
      _onPlayerHit?.();
      if (p.hp <= 0) {
        p.hp = 0;
        state.gameOver = true;
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Explosions
// ---------------------------------------------------------------------------

function _updateExplosions(state: DragoonState, dt: number): void {
  for (const ex of state.explosions) {
    ex.timer += dt;
    if (ex.timer < 0) continue; // staggered start
    ex.radius = (ex.timer / ex.maxTimer) * ex.maxRadius;

    for (const e of state.enemies) {
      if (!e.alive || ex.hitEnemies.has(e.id) || e.isAllied) continue;
      const dx = e.position.x - ex.position.x;
      const dy = e.position.y - ex.position.y;
      if (dx * dx + dy * dy < (ex.radius + e.size * 12) * (ex.radius + e.size * 12)) {
        ex.hitEnemies.add(e.id);
        _damageEnemy(state, e, ex.damage);
      }
    }
  }

  state.explosions = state.explosions.filter(ex => ex.timer < ex.maxTimer);
}

// ---------------------------------------------------------------------------
// Shield
// ---------------------------------------------------------------------------

function _updateShield(state: DragoonState, dt: number): void {
  const p = state.player;
  if (p.shieldActive) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) {
      p.shieldActive = false;
      p.shieldTimer = 0;
      p.bloodShieldCharges = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Boss entrance
// ---------------------------------------------------------------------------

function _updateBossEntrance(state: DragoonState, dt: number): void {
  if (state.bossEntranceTimer > 0) {
    state.bossEntranceTimer -= dt;
    if (state.bossEntranceTimer <= 0) {
      state.bossEntranceTimer = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

function _spawnPickup(state: DragoonState, x: number, y: number): void {
  if (Math.random() >= DragoonBalance.PICKUP_DROP_CHANCE) return;

  const rand = Math.random();
  let type: DragoonPickupType;
  if (rand < 0.4) {
    type = DragoonPickupType.HEALTH_ORB;
  } else if (rand < 0.75) {
    type = DragoonPickupType.MANA_ORB;
  } else {
    type = DragoonPickupType.SCORE_MULTIPLIER;
  }

  const pickup: DragoonPickup = {
    id: state.nextId++,
    position: { x, y },
    velocity: { x: -20 + (Math.random() - 0.5) * 30, y: (Math.random() - 0.5) * 40 },
    type,
    lifetime: DragoonBalance.PICKUP_LIFETIME,
    bobTimer: Math.random() * Math.PI * 2,
    collected: false,
  };
  state.pickups.push(pickup);
}

function _updatePickups(state: DragoonState, dt: number): void {
  const p = state.player;
  const collectR = DragoonBalance.PICKUP_COLLECT_RADIUS;

  for (const pickup of state.pickups) {
    if (pickup.collected) continue;

    pickup.position.x += pickup.velocity.x * dt;
    pickup.position.y += pickup.velocity.y * dt;
    pickup.velocity.x *= 0.98;
    pickup.velocity.y *= 0.98;
    pickup.bobTimer += dt;
    pickup.lifetime -= dt;

    if (pickup.lifetime <= 0) {
      pickup.collected = true;
      continue;
    }

    const dx = pickup.position.x - p.position.x;
    const dy = pickup.position.y - p.position.y;
    if (dx * dx + dy * dy < collectR * collectR) {
      pickup.collected = true;
      switch (pickup.type) {
        case DragoonPickupType.HEALTH_ORB:
          p.hp = Math.min(p.maxHp, p.hp + DragoonBalance.PICKUP_HEALTH_AMOUNT);
          break;
        case DragoonPickupType.MANA_ORB:
          p.mana = Math.min(p.maxMana, p.mana + DragoonBalance.PICKUP_MANA_AMOUNT);
          break;
        case DragoonPickupType.SCORE_MULTIPLIER:
          p.scoreMultiplier = DragoonBalance.PICKUP_SCORE_MULT;
          p.scoreMultTimer = DragoonBalance.PICKUP_SCORE_MULT_DURATION;
          break;
      }
    }
  }

  state.pickups = state.pickups.filter(pk => !pk.collected);
}

function _updateScoreMult(state: DragoonState, dt: number): void {
  const p = state.player;
  if (p.scoreMultTimer > 0) {
    p.scoreMultTimer -= dt;
    if (p.scoreMultTimer <= 0) {
      p.scoreMultTimer = 0;
      p.scoreMultiplier = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// XP & Leveling
// ---------------------------------------------------------------------------

function _grantXP(state: DragoonState, amount: number): void {
  const p = state.player;
  p.xp += amount;

  while (p.xp >= p.xpToNext && p.level < 30) {
    p.xp -= p.xpToNext;
    p.level++;
    p.xpToNext = xpForLevel(p.level + 1);
    _onLevelUp?.(p.level);

    // Small stat boost per level
    p.maxHp += 3;
    p.hp = Math.min(p.maxHp, p.hp + 3);
    p.maxMana += 2;
    p.mana = Math.min(p.maxMana, p.mana + 2);

    // Check for subclass unlock
    if (p.level === DragoonBalance.SUBCLASS_LEVEL && !state.subclassUnlocked) {
      _triggerSubclassChoice(state);
    }

    // Check for unlockable skill unlocks
    for (const entry of UNLOCKABLE_SKILLS) {
      if (p.level === entry.level && !state.unlockedSkills.includes(entry.skillId)) {
        state.unlockedSkills.push(entry.skillId);
        // Auto-equip if no unlockable skill is equipped yet
        if (!state.equippedUnlockSkill) {
          state.equippedUnlockSkill = entry.skillId;
          const cfg = SKILL_CONFIGS[entry.skillId];
          state.unlockSkillState = { id: entry.skillId, cooldown: 0, maxCooldown: cfg.cooldown, active: false, activeTimer: 0 };
        }
        _onSkillUnlock?.(entry.skillId);
      }
    }
  }
}

function _triggerSubclassChoice(state: DragoonState): void {
  const classDef = CLASS_DEFINITIONS[state.classId];
  if (!classDef) return;
  state.subclassChoiceActive = true;
  state.subclassOptions = [classDef.subclasses[0], classDef.subclasses[1]];
  state.paused = true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _damageEnemy(state: DragoonState, enemy: DragoonEnemy, damage: number): void {
  if (enemy.isAllied) return; // Don't damage allied enemies
  const isCrit = Math.random() < 0.15;
  const ampMult = enemy.damageAmp || 1;
  const finalDmg = Math.floor((isCrit ? damage * 1.8 : damage) * ampMult);
  enemy.hp -= finalDmg;
  enemy.hitTimer = 0.1;

  _onHit?.(enemy.position.x, enemy.position.y, finalDmg, isCrit);

  // Combo
  state.player.comboCount++;
  state.player.comboTimer = DragoonBalance.COMBO_TIMEOUT;

  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.deathTimer = 0.5;
    const comboMult = 1 + state.player.comboCount * DragoonBalance.COMBO_SCORE_MULT;
    const scoreGain = Math.floor(enemy.scoreValue * comboMult * state.player.scoreMultiplier);
    state.player.score += scoreGain;
    _onExplosion?.(enemy.position.x, enemy.position.y, enemy.size * 25, enemy.glowColor);
    _spawnPickup(state, enemy.position.x, enemy.position.y);

    // Grant XP
    _grantXP(state, enemy.scoreValue);

    // Soul Harvest chain explosion
    if (state.player.soulHarvestTimer > 0) {
      const explosion: DragoonExplosion = {
        id: state.nextId++,
        position: { x: enemy.position.x, y: enemy.position.y },
        radius: 0, maxRadius: 80,
        timer: 0, maxTimer: 0.4,
        color: 0x22cc66,
        damage: SKILL_CONFIGS[DragoonSkillId.SOUL_HARVEST].damage,
        hitEnemies: new Set([enemy.id]),
      };
      state.explosions.push(explosion);
      _onExplosion?.(enemy.position.x, enemy.position.y, 80, 0x22cc66);
    }

    // Track dead enemies for Raise Dead
    state.recentDeadEnemies.push({
      type: enemy.type,
      position: { x: enemy.position.x, y: enemy.position.y },
      size: enemy.size,
      color: enemy.color,
      glowColor: enemy.glowColor,
    });
    if (state.recentDeadEnemies.length > 5) state.recentDeadEnemies.shift();
  }
}

function _updateMana(state: DragoonState, dt: number): void {
  state.player.mana = Math.min(state.player.maxMana, state.player.mana + state.player.manaRegen * dt);
}

function _updateCombo(state: DragoonState, dt: number): void {
  if (state.player.comboTimer > 0) {
    state.player.comboTimer -= dt;
    if (state.player.comboTimer <= 0) {
      state.player.comboCount = 0;
    }
  }
}

function _updateInvincibility(state: DragoonState, dt: number): void {
  if (state.player.invincTimer > 0) state.player.invincTimer -= dt;
}

function _cleanupDead(state: DragoonState): void {
  state.enemies = state.enemies.filter(e => e.alive || e.deathTimer > 0);
}
