// ---------------------------------------------------------------------------
// 3Dragon mode — combat system (projectiles, collisions, skills)
// ---------------------------------------------------------------------------

import type { ThreeDragonState, TDProjectile, TDEnemy, TDExplosion, TDPowerUp, Vec3, TDHazard, TDBossMechanicState, TDHazardType, TDPlayer } from "../state/ThreeDragonState";
import { TDSkillId, TDEnemyPattern, TDEnemyType } from "../state/ThreeDragonState";
import { TDBalance, TD_SKILL_CONFIGS, TD_SKILL_UNLOCK_ORDER, TD_MAP_BY_ID, TD_PHYSICAL_SKILLS, TD_LIGHTNING_SKILLS, TD_FIRE_SKILLS, TD_SYNERGIES } from "../config/ThreeDragonConfig";

// Callbacks for FX
let _onExplosion: ((x: number, y: number, z: number, radius: number, color: number) => void) | null = null;
let _onHit: ((x: number, y: number, z: number, damage: number, isCrit: boolean) => void) | null = null;
let _onPlayerHit: (() => void) | null = null;
let _onLightningStrike: ((x: number, y: number, z: number) => void) | null = null;
let _onEnemyDeath: ((x: number, y: number, z: number, size: number, color: number, glowColor: number, isBoss: boolean) => void) | null = null;
let _onBossKill: ((x: number, y: number, z: number, size: number, color: number, glowColor: number) => void) | null = null;
let _onPowerUpCollect: ((x: number, y: number, z: number, type: "health" | "mana") => void) | null = null;
let _onDamageNumber: ((x: number, y: number, z: number, damage: number, isCrit: boolean, isElite: boolean) => void) | null = null;
let _onSkillUnlock: ((skillId: TDSkillId, skillName: string) => void) | null = null;
let _onLevelUp: ((level: number) => void) | null = null;
let _onSynergyPopup: ((text: string, color: string, x: number, y: number, z: number) => void) | null = null;

export const ThreeDragonCombatSystem = {
  setExplosionCallback(cb: typeof _onExplosion): void { _onExplosion = cb; },
  setHitCallback(cb: typeof _onHit): void { _onHit = cb; },
  setPlayerHitCallback(cb: typeof _onPlayerHit): void { _onPlayerHit = cb; },
  setLightningCallback(cb: typeof _onLightningStrike): void { _onLightningStrike = cb; },
  setEnemyDeathCallback(cb: typeof _onEnemyDeath): void { _onEnemyDeath = cb; },
  setBossKillCallback(cb: typeof _onBossKill): void { _onBossKill = cb; },
  setPowerUpCollectCallback(cb: typeof _onPowerUpCollect): void { _onPowerUpCollect = cb; },
  setDamageNumberCallback(cb: typeof _onDamageNumber): void { _onDamageNumber = cb; },
  setSkillUnlockCallback(cb: typeof _onSkillUnlock): void { _onSkillUnlock = cb; },
  setLevelUpCallback(cb: typeof _onLevelUp): void { _onLevelUp = cb; },
  setSynergyPopupCallback(cb: typeof _onSynergyPopup): void { _onSynergyPopup = cb; },

  update(state: ThreeDragonState, dt: number): void {
    _updateSkillCooldowns(state, dt);
    _handleSkillActivation(state, dt);
    _updatePlayerProjectiles(state, dt);
    _updateEnemyBehavior(state, dt);
    _updateBossMechanics(state, dt);
    _updateEnemyProjectiles(state, dt);
    _updateExplosions(state, dt);
    _checkPlayerCollisions(state);
    _updateMana(state, dt);
    _updateCombo(state, dt);
    _updateInvincibility(state, dt);
    _updateShield(state, dt);
    _updatePowerUps(state, dt);
    _updateHazards(state, dt);
    _updateStatusEffects(state, dt);
    _updateSynergyPopups(state, dt);
    _cleanupDead(state);
  },
};

function _dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function _dist3sq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function _createDefaultStatusEffects() {
  return { frozen: 0, burning: 0, wet: 0, stunned: 0 };
}

function _createDefaultBossMechanics(): TDBossMechanicState {
  return {
    fireBreathActive: false,
    fireBreathTimer: 0,
    fireBreathAngle: 0,
    fireBreathCooldown: 5,
    lightningZones: [],
    lightningZoneCooldown: 4,
    shadowCloneIds: [],
    shadowCloneCooldown: 8,
    hydraHeads: [],
    hydraInitialized: false,
    voidTeleportTimer: 5,
    voidTeleportCooldown: 5,
    voidInvincible: false,
    voidInvincibleTimer: 0,
    voidZones: [],
  };
}

// ---------------------------------------------------------------------------
// Status effects update
// ---------------------------------------------------------------------------

function _updateStatusEffects(state: ThreeDragonState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (!e.statusEffects) e.statusEffects = _createDefaultStatusEffects();
    const se = e.statusEffects;
    if (se.frozen > 0) se.frozen -= dt;
    if (se.burning > 0) {
      se.burning -= dt;
      // Burning does damage over time
      if (Math.random() < dt * 2) {
        e.hp -= 3;
        e.hitTimer = 0.05;
      }
    }
    if (se.wet > 0) se.wet -= dt;
    if (se.stunned > 0) {
      se.stunned -= dt;
      e.slowFactor = 0;
      e.slowTimer = Math.max(e.slowTimer, se.stunned);
    }
  }
}

// ---------------------------------------------------------------------------
// Synergy popups
// ---------------------------------------------------------------------------

function _updateSynergyPopups(state: ThreeDragonState, dt: number): void {
  state.synergyPopups = state.synergyPopups.filter(p => {
    p.timer -= dt;
    return p.timer > 0;
  });
}

function _triggerSynergy(state: ThreeDragonState, synergyId: string, x: number, y: number, z: number): void {
  const syn = TD_SYNERGIES[synergyId];
  if (!syn) return;
  state.synergyPopups.push({
    text: syn.name,
    color: syn.color,
    position: { x, y, z },
    timer: 1.5,
  });
  _onSynergyPopup?.(syn.name, syn.color, x, y, z);
}

// ---------------------------------------------------------------------------
// Skill cooldowns & activation
// ---------------------------------------------------------------------------

function _updateSkillCooldowns(state: ThreeDragonState, dt: number): void {
  const cdr = state.upgradeState.cooldownReduction;
  for (const skill of state.skills) {
    if (skill.cooldown > 0) skill.cooldown -= dt * (1 + cdr);
    if (skill.activeTimer > 0) skill.activeTimer -= dt;
    if (skill.activeTimer <= 0) skill.active = false;
  }
}

function _handleSkillActivation(state: ThreeDragonState, dt: number): void {
  const inp = state.input;
  const p = state.player;

  // Arcane Bolt (auto-fire on mouse hold)
  const bolt = state.skills.find(s => s.id === TDSkillId.ARCANE_BOLT)!;
  if (inp.fire && bolt.cooldown <= 0) {
    bolt.cooldown = bolt.maxCooldown;
    _fireArcaneBolt(state);
  }

  // Equipped skills mapped to keys 1-5
  const skillInputs = [inp.skill1, inp.skill2, inp.skill3, inp.skill4, inp.skill5];
  const skillInputClear = [
    () => { inp.skill1 = false; },
    () => { inp.skill2 = false; },
    () => { inp.skill3 = false; },
    () => { inp.skill4 = false; },
    () => { inp.skill5 = false; },
  ];

  for (let slot = 0; slot < 5; slot++) {
    const equippedId = state.equippedSkills[slot];
    if (!equippedId) continue;

    if (skillInputs[slot]) {
      skillInputClear[slot]();
      const skill = state.skills.find(s => s.id === equippedId);
      if (!skill) continue;
      const cfg = TD_SKILL_CONFIGS[equippedId];
      if (!cfg) continue;
      if (skill.cooldown <= 0 && p.mana >= cfg.manaCost) {
        skill.cooldown = skill.maxCooldown;
        p.mana -= cfg.manaCost;
        _activateSkill(state, equippedId, skill, cfg);
      }
    }
  }

  // Channeling skills — tick their effects over duration
  _tickChannelingSkills(state, dt);

  // Shadow Dive tick
  if (p.shadowDiveActive) {
    p.shadowDiveTimer -= dt;
    if (p.shadowDiveTimer <= 0) {
      _endShadowDive(state);
    }
  }
}

function _activateSkill(state: ThreeDragonState, id: TDSkillId, skill: import("../state/ThreeDragonState").TDSkillState, cfg: import("../config/ThreeDragonConfig").TDSkillConfig): void {
  const p = state.player;
  switch (id) {
    case TDSkillId.CELESTIAL_LANCE:
      _fireCelestialLance(state);
      break;
    case TDSkillId.THUNDERSTORM:
      skill.active = true;
      skill.activeTimer = cfg.duration;
      break;
    case TDSkillId.FROST_NOVA:
      _frostNova(state);
      break;
    case TDSkillId.METEOR_SHOWER:
      skill.active = true;
      skill.activeTimer = cfg.duration;
      break;
    case TDSkillId.DIVINE_SHIELD:
      skill.active = true;
      skill.activeTimer = cfg.duration;
      p.shieldActive = true;
      p.shieldTimer = cfg.duration;
      break;
    case TDSkillId.FIRE_BREATH:
      skill.active = true;
      skill.activeTimer = cfg.duration;
      break;
    case TDSkillId.ICE_STORM:
      skill.active = true;
      skill.activeTimer = cfg.duration;
      break;
    case TDSkillId.LIGHTNING_BOLT:
      _lightningBolt(state);
      break;
    case TDSkillId.DRAGON_ROAR:
      _dragonRoar(state);
      skill.active = true;
      skill.activeTimer = cfg.duration;
      break;
    case TDSkillId.WING_GUST:
      _wingGust(state);
      state.lastWingGustTime = state.gameTime;
      break;
    case TDSkillId.HEALING_FLAME:
      skill.active = true;
      skill.activeTimer = cfg.duration;
      break;
    case TDSkillId.SHADOW_DIVE:
      _startShadowDive(state, cfg);
      skill.active = true;
      skill.activeTimer = cfg.duration;
      break;
    case TDSkillId.CHAIN_LIGHTNING:
      _chainLightning(state);
      break;
  }
}

function _tickChannelingSkills(state: ThreeDragonState, dt: number): void {
  // Thunderstorm channeling
  const thunderSkill = state.skills.find(s => s.id === TDSkillId.THUNDERSTORM);
  if (thunderSkill && thunderSkill.active && thunderSkill.activeTimer > 0) {
    const interval = 0.25;
    const tPrev = thunderSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / interval) - Math.floor(thunderSkill.activeTimer / interval);
    for (let i = 0; i < strikes; i++) {
      _thunderStrike(state);
    }
  }

  // Meteor channeling
  const meteorSkill = state.skills.find(s => s.id === TDSkillId.METEOR_SHOWER);
  if (meteorSkill && meteorSkill.active && meteorSkill.activeTimer > 0) {
    const interval = 0.3;
    const tPrev = meteorSkill.activeTimer + dt;
    const strikes = Math.floor(tPrev / interval) - Math.floor(meteorSkill.activeTimer / interval);
    for (let i = 0; i < strikes; i++) {
      _meteorStrike(state);
    }
  }

  // Fire Breath channeling
  const fireBreathSkill = state.skills.find(s => s.id === TDSkillId.FIRE_BREATH);
  if (fireBreathSkill && fireBreathSkill.active && fireBreathSkill.activeTimer > 0) {
    const interval = 0.15;
    const tPrev = fireBreathSkill.activeTimer + dt;
    const ticks = Math.floor(tPrev / interval) - Math.floor(fireBreathSkill.activeTimer / interval);
    for (let i = 0; i < ticks; i++) {
      _fireBreathTick(state);
    }
  }

  // Ice Storm channeling
  const iceStormSkill = state.skills.find(s => s.id === TDSkillId.ICE_STORM);
  if (iceStormSkill && iceStormSkill.active && iceStormSkill.activeTimer > 0) {
    const interval = 0.2;
    const tPrev = iceStormSkill.activeTimer + dt;
    const ticks = Math.floor(tPrev / interval) - Math.floor(iceStormSkill.activeTimer / interval);
    for (let i = 0; i < ticks; i++) {
      _iceStormTick(state);
    }
  }

  // Healing Flame channeling
  const healFlameSkill = state.skills.find(s => s.id === TDSkillId.HEALING_FLAME);
  if (healFlameSkill && healFlameSkill.active && healFlameSkill.activeTimer > 0) {
    const interval = 0.5;
    const tPrev = healFlameSkill.activeTimer + dt;
    const ticks = Math.floor(tPrev / interval) - Math.floor(healFlameSkill.activeTimer / interval);
    for (let i = 0; i < ticks; i++) {
      const p = state.player;
      const healAmt = 5;
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      _onExplosion?.(p.position.x, p.position.y, p.position.z, 3, 0x44ff88);
    }
  }
}

// ---------------------------------------------------------------------------
// Skill implementations
// ---------------------------------------------------------------------------

function _fireArcaneBolt(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.ARCANE_BOLT];

  // Aim toward mouse — convert screen coords to world-space bias
  const mx = (state.input.mouseX / state.screenW - 0.5) * 2; // -1 to 1
  const my = -(state.input.mouseY / state.screenH - 0.5) * 2; // -1 to 1 (inverted)
  const spread = (Math.random() - 0.5) * 0.5;
  const spreadY = (Math.random() - 0.5) * 0.3;

  const proj: TDProjectile = {
    id: state.nextId++,
    position: { x: p.position.x, y: p.position.y, z: p.position.z - 2 },
    velocity: { x: mx * 25 + spread * 10, y: my * 12 + spreadY * 5, z: -55 },
    damage: cfg.damage,
    radius: 0.8,
    lifetime: 3,
    isPlayerOwned: true,
    skillId: TDSkillId.ARCANE_BOLT,
    color: cfg.color,
    trailColor: 0x4488cc,
    pierce: 0,
    hitEnemies: new Set(),
    homing: false,
    homingTarget: null,
    size: 0.3,
    glowIntensity: 0.8,
  };
  state.projectiles.push(proj);
}

function _fireCelestialLance(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.CELESTIAL_LANCE];

  // Piercing lance that goes through enemies
  const proj: TDProjectile = {
    id: state.nextId++,
    position: { x: p.position.x, y: p.position.y, z: p.position.z - 2 },
    velocity: { x: 0, y: 0, z: -80 },
    damage: cfg.damage,
    radius: 2,
    lifetime: 4,
    isPlayerOwned: true,
    skillId: TDSkillId.CELESTIAL_LANCE,
    color: cfg.color,
    trailColor: 0xffffdd,
    pierce: 5,
    hitEnemies: new Set(),
    homing: false,
    homingTarget: null,
    size: 1.0,
    glowIntensity: 2.0,
  };
  state.projectiles.push(proj);

  _onExplosion?.(p.position.x, p.position.y, p.position.z - 3, 3, cfg.color);
}

function _thunderStrike(state: ThreeDragonState): void {
  const cfg = TD_SKILL_CONFIGS[TDSkillId.THUNDERSTORM];
  const p = state.player;

  // Strike ahead of player with randomness
  const cx = p.position.x + (Math.random() - 0.5) * 20;
  const cy = p.position.y + (Math.random() - 0.5) * 8;
  const cz = p.position.z - 20 - Math.random() * 30;

  const radius = 5;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (_dist3(e.position, { x: cx, y: cy, z: cz }) < radius + e.size * 2) {
      _damageEnemy(state, e, cfg.damage, TDSkillId.THUNDERSTORM);
    }
  }

  _onLightningStrike?.(cx, cy, cz);
  _onExplosion?.(cx, cy, cz, radius, cfg.color);
}

function _frostNova(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.FROST_NOVA];
  const radius = 18;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (_dist3(e.position, p.position) < radius) {
      _damageEnemy(state, e, cfg.damage, TDSkillId.FROST_NOVA);
      e.slowFactor = 0.3;
      e.slowTimer = 3;
      // Apply frozen status
      if (!e.statusEffects) e.statusEffects = _createDefaultStatusEffects();
      e.statusEffects.frozen = 3;
    }
  }

  _onExplosion?.(p.position.x, p.position.y, p.position.z, radius, cfg.color);
}

function _meteorStrike(state: ThreeDragonState): void {
  const cfg = TD_SKILL_CONFIGS[TDSkillId.METEOR_SHOWER];
  const p = state.player;

  const x = p.position.x + (Math.random() - 0.5) * 30;
  const y = (Math.random()) * 12 + 2;
  const z = p.position.z - 15 - Math.random() * 40;

  const explosion: TDExplosion = {
    id: state.nextId++,
    position: { x, y, z },
    radius: 0,
    maxRadius: 5 + Math.random() * 3,
    timer: 0,
    maxTimer: 0.5,
    color: cfg.color,
    damage: cfg.damage,
    hitEnemies: new Set(),
  };
  state.explosions.push(explosion);

  _onExplosion?.(x, y, z, explosion.maxRadius, cfg.color);
}

// ---------------------------------------------------------------------------
// New unlockable skill implementations
// ---------------------------------------------------------------------------

function _fireBreathTick(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.FIRE_BREATH];
  const coneRange = 20;
  const coneAngle = 0.6; // radians half-angle

  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = e.position.x - p.position.x;
    const dz = e.position.z - p.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > coneRange || dist < 1) continue;
    // Cone check: enemy must be ahead (negative z) and within angle
    const angle = Math.abs(Math.atan2(dx, -dz));
    if (angle < coneAngle) {
      _damageEnemy(state, e, cfg.damage * 0.4, TDSkillId.FIRE_BREATH);
      // Apply burning status
      if (!e.statusEffects) e.statusEffects = _createDefaultStatusEffects();
      e.statusEffects.burning = 2;
    }
  }
  // Visual
  const fireX = p.position.x + (Math.random() - 0.5) * 6;
  const fireY = p.position.y + (Math.random() - 0.5) * 3;
  const fireZ = p.position.z - 8 - Math.random() * 12;
  _onExplosion?.(fireX, fireY, fireZ, 3, cfg.color);
}

function _iceStormTick(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.ICE_STORM];
  const radius = 15;

  const cx = p.position.x + (Math.random() - 0.5) * 20;
  const cy = p.position.y + (Math.random() - 0.5) * 6;
  const cz = p.position.z - 15 - Math.random() * 25;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (_dist3(e.position, { x: cx, y: cy, z: cz }) < radius) {
      _damageEnemy(state, e, cfg.damage * 0.3, TDSkillId.ICE_STORM);
      e.slowFactor = 0.3;
      e.slowTimer = Math.max(e.slowTimer, 1.5);
      // Apply frozen status
      if (!e.statusEffects) e.statusEffects = _createDefaultStatusEffects();
      e.statusEffects.frozen = Math.max(e.statusEffects.frozen, 1.5);
    }
  }
  _onExplosion?.(cx, cy, cz, 4, cfg.color);
}

function _lightningBolt(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.LIGHTNING_BOLT];

  // Find nearest enemy
  let nearest: TDEnemy | null = null;
  let nearestDist = Infinity;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = _dist3(e.position, p.position);
    if (d < nearestDist && d < 50) {
      nearest = e;
      nearestDist = d;
    }
  }
  if (nearest) {
    _damageEnemy(state, nearest, cfg.damage, TDSkillId.LIGHTNING_BOLT);
    _onLightningStrike?.(nearest.position.x, nearest.position.y, nearest.position.z);
    _onExplosion?.(nearest.position.x, nearest.position.y, nearest.position.z, 4, cfg.color);
  } else {
    // No target — fire forward
    _onLightningStrike?.(p.position.x, p.position.y, p.position.z - 30);
    _onExplosion?.(p.position.x, p.position.y, p.position.z - 30, 4, cfg.color);
  }
}

function _dragonRoar(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.DRAGON_ROAR];
  const radius = 22;

  // Resonance synergy: if Wing Gust was used within 2s, double stun duration
  const timeSinceGust = state.gameTime - state.lastWingGustTime;
  const resonanceActive = timeSinceGust <= 2;
  const stunDuration = resonanceActive ? cfg.duration * 2 : cfg.duration;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (_dist3(e.position, p.position) < radius) {
      _damageEnemy(state, e, cfg.damage, TDSkillId.DRAGON_ROAR);
      // Stun = full slow for duration
      e.slowFactor = 0;
      e.slowTimer = Math.max(e.slowTimer, stunDuration);
      if (!e.statusEffects) e.statusEffects = _createDefaultStatusEffects();
      e.statusEffects.stunned = Math.max(e.statusEffects.stunned, stunDuration);
    }
  }

  if (resonanceActive) {
    _triggerSynergy(state, "resonance", p.position.x, p.position.y + 2, p.position.z);
  }

  _onExplosion?.(p.position.x, p.position.y, p.position.z, radius, cfg.color);
}

function _wingGust(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.WING_GUST];
  const radius = 18;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = _dist3(e.position, p.position);
    if (d < radius && d > 0.5) {
      _damageEnemy(state, e, cfg.damage, TDSkillId.WING_GUST);
      // Push enemies away
      const dx = e.position.x - p.position.x;
      const dy = e.position.y - p.position.y;
      const dz = e.position.z - p.position.z;
      const pushForce = 20 / Math.max(1, d * 0.5);
      e.position.x += (dx / d) * pushForce;
      e.position.y += (dy / d) * pushForce;
      e.position.z += (dz / d) * pushForce;
    }
  }
  _onExplosion?.(p.position.x, p.position.y, p.position.z, radius, cfg.color);
}

function _startShadowDive(state: ThreeDragonState, cfg: import("../config/ThreeDragonConfig").TDSkillConfig): void {
  const p = state.player;
  p.shadowDiveActive = true;
  p.shadowDiveTimer = cfg.duration;
  p.invincTimer = cfg.duration + 0.2; // invincible during shadow dive
  state.shadowDiveAttackedDuringInvuln = false;
  _onExplosion?.(p.position.x, p.position.y, p.position.z, 5, cfg.color);
}

function _endShadowDive(state: ThreeDragonState): void {
  const p = state.player;
  p.shadowDiveActive = false;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.SHADOW_DIVE];
  // AoE damage on exit
  const radius = 12;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (_dist3(e.position, p.position) < radius) {
      _damageEnemy(state, e, cfg.damage, TDSkillId.SHADOW_DIVE);
    }
  }
  _onExplosion?.(p.position.x, p.position.y, p.position.z, radius, cfg.color);
}

function _chainLightning(state: ThreeDragonState): void {
  const p = state.player;
  const cfg = TD_SKILL_CONFIGS[TDSkillId.CHAIN_LIGHTNING];
  const maxChains = 6;
  const chainRange = 15;

  const hit = new Set<number>();
  let current: Vec3 = { ...p.position };

  for (let chain = 0; chain < maxChains; chain++) {
    let nearest: TDEnemy | null = null;
    let nearestDist = Infinity;
    for (const e of state.enemies) {
      if (!e.alive || hit.has(e.id)) continue;
      const d = _dist3(e.position, current);
      if (d < nearestDist && d < chainRange) {
        nearest = e;
        nearestDist = d;
      }
    }
    if (!nearest) break;
    hit.add(nearest.id);
    _damageEnemy(state, nearest, cfg.damage, TDSkillId.CHAIN_LIGHTNING);
    _onLightningStrike?.(nearest.position.x, nearest.position.y, nearest.position.z);
    current = { ...nearest.position };
  }

  if (hit.size > 0) {
    _onExplosion?.(p.position.x, p.position.y, p.position.z, 5, cfg.color);
  }
}

// ---------------------------------------------------------------------------
// XP & Level system
// ---------------------------------------------------------------------------

function _grantXP(state: ThreeDragonState, amount: number): void {
  const p = state.player;
  p.xp += amount;

  while (p.xp >= p.xpToNextLevel) {
    p.xp -= p.xpToNextLevel;
    p.level++;
    p.xpToNextLevel = TDBalance.XP_LEVEL_BASE + (p.level - 1) * TDBalance.XP_LEVEL_GROWTH;

    _onLevelUp?.(p.level);

    // Check for skill unlocks at this level
    for (const unlock of TD_SKILL_UNLOCK_ORDER) {
      if (unlock.level === p.level && !state.unlockedSkills.includes(unlock.skillId)) {
        state.unlockedSkills.push(unlock.skillId);
        state.pendingUnlocks.push(unlock.skillId);
        // Add the skill to the skills array so it can be tracked
        const cfg = TD_SKILL_CONFIGS[unlock.skillId];
        if (cfg) {
          state.skills.push({
            id: unlock.skillId,
            cooldown: 0,
            maxCooldown: cfg.cooldown,
            active: false,
            activeTimer: 0,
          });
        }
        _onSkillUnlock?.(unlock.skillId, cfg?.name ?? "Unknown Skill");
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Projectile updates
// ---------------------------------------------------------------------------

function _updatePlayerProjectiles(state: ThreeDragonState, dt: number): void {
  const maxDist = TDBalance.PROJECTILE_CLEANUP_DIST;

  for (const proj of state.projectiles) {
    if (!proj.isPlayerOwned) continue;

    // Homing
    if (proj.homing && proj.homingTarget !== null) {
      const target = state.enemies.find(e => e.id === proj.homingTarget && e.alive);
      if (target) {
        const dx = target.position.x - proj.position.x;
        const dy = target.position.y - proj.position.y;
        const dz = target.position.z - proj.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 1) {
          const turnSpeed = 4;
          const speed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2 + proj.velocity.z ** 2);
          proj.velocity.x += (dx / dist) * turnSpeed * dt * speed;
          proj.velocity.y += (dy / dist) * turnSpeed * dt * speed;
          proj.velocity.z += (dz / dist) * turnSpeed * dt * speed;
          // Renormalize
          const newSpeed = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2 + proj.velocity.z ** 2);
          const ratio = speed / newSpeed;
          proj.velocity.x *= ratio;
          proj.velocity.y *= ratio;
          proj.velocity.z *= ratio;
        }
      }
    }

    proj.position.x += proj.velocity.x * dt;
    proj.position.y += proj.velocity.y * dt;
    proj.position.z += proj.velocity.z * dt;
    proj.lifetime -= dt;

    // Collision with enemies
    for (const enemy of state.enemies) {
      if (!enemy.alive || proj.hitEnemies.has(enemy.id)) continue;
      // Void Emperor invincibility check
      if (enemy.bossMechanics?.voidInvincible) continue;
      const hitDist = proj.radius + enemy.size * 1.5;
      if (_dist3sq(proj.position, enemy.position) < hitDist * hitDist) {
        proj.hitEnemies.add(enemy.id);
        _damageEnemy(state, enemy, proj.damage, proj.skillId);

        // Shadow Strike synergy: attacking during Shadow Dive invulnerability
        if (state.player.shadowDiveActive && !state.shadowDiveAttackedDuringInvuln) {
          state.shadowDiveAttackedDuringInvuln = true;
          _triggerSynergy(state, "shadow_strike", enemy.position.x, enemy.position.y + 2, enemy.position.z);
        }

        if (proj.pierce <= 0) {
          proj.lifetime = -1;
          break;
        }
        proj.pierce--;
      }
    }
  }

  // Remove expired / distant
  const pz = state.player.position.z;
  state.projectiles = state.projectiles.filter(p => {
    if (!p.isPlayerOwned) return true;
    if (p.lifetime <= 0) return false;
    if (Math.abs(p.position.z - pz) > maxDist) return false;
    if (Math.abs(p.position.x) > 50) return false;
    if (p.position.y < -5 || p.position.y > 30) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Enemy behavior
// ---------------------------------------------------------------------------

function _updateEnemyBehavior(state: ThreeDragonState, dt: number): void {
  const pPos = state.player.position;

  // Apply haste modifier
  const hasteActive = state.activeModifiers.includes("haste");
  const hasteMult = hasteActive ? 1.5 : 1.0;

  for (const e of state.enemies) {
    if (!e.alive) {
      e.deathTimer -= dt;
      continue;
    }

    // Ensure statusEffects exist
    if (!e.statusEffects) e.statusEffects = _createDefaultStatusEffects();

    if (e.slowTimer > 0) {
      e.slowTimer -= dt;
      if (e.slowTimer <= 0) e.slowFactor = 1;
    }

    e.hitTimer = Math.max(0, e.hitTimer - dt);
    e.patternTimer += dt;
    e.rotationY += e.rotationSpeed * dt;

    const sf = e.slowFactor * hasteMult;

    switch (e.pattern) {
      case TDEnemyPattern.STRAIGHT:
        e.position.x += e.velocity.x * sf * dt;
        e.position.y += e.velocity.y * sf * dt;
        e.position.z += e.velocity.z * sf * dt;
        break;

      case TDEnemyPattern.SINE_WAVE:
        e.position.x += e.velocity.x * sf * dt + Math.sin(e.patternTimer * 2) * 6 * dt;
        e.position.y += Math.cos(e.patternTimer * 1.5) * 3 * dt;
        e.position.z += e.velocity.z * sf * dt;
        break;

      case TDEnemyPattern.SPIRAL:
        e.position.x += Math.sin(e.patternTimer * 3) * 8 * sf * dt;
        e.position.y += Math.cos(e.patternTimer * 3) * 5 * sf * dt;
        e.position.z += e.velocity.z * sf * dt;
        break;

      case TDEnemyPattern.SWARM: {
        // Move toward player in swarm
        e.position.x += e.velocity.x * sf * dt + Math.sin(e.patternTimer * 5 + e.id) * 4 * dt;
        e.position.y += Math.sin(e.patternTimer * 3 + e.id * 0.7) * 3 * dt;
        e.position.z += e.velocity.z * sf * dt;
        break;
      }

      case TDEnemyPattern.DIVE: {
        const dx = pPos.x - e.position.x;
        const dy = pPos.y - e.position.y;
        const dz = pPos.z - e.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 2) {
          const speed = 20 * sf;
          e.position.x += (dx / dist) * speed * dt;
          e.position.y += (dy / dist) * speed * dt;
          e.position.z += (dz / dist) * speed * dt;
        }
        break;
      }

      case TDEnemyPattern.HOVER:
        // Move to position ahead of player and hover
        if (e.position.z > pPos.z - 25) {
          e.position.z += e.velocity.z * sf * dt;
        } else {
          e.position.y += Math.sin(e.patternTimer * 1.5) * 2 * dt;
          e.position.x += Math.sin(e.patternTimer * 0.7) * 3 * dt;
          // Keep pace with player
          e.position.z = pPos.z - 25 + Math.sin(e.patternTimer * 0.5) * 5;
        }
        break;

      case TDEnemyPattern.GROUND:
        e.position.x += e.velocity.x * sf * dt;
        e.position.z += e.velocity.z * sf * dt;
        e.position.y = 0;
        break;

      case TDEnemyPattern.BOSS_PATTERN:
        _updateBoss(state, e, dt);
        break;

      case TDEnemyPattern.CHASE: {
        // Always fly toward the player's position
        const dx = pPos.x - e.position.x;
        const dy = pPos.y - e.position.y;
        const dz = pPos.z - e.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > 1.5) {
          const speed = (14 + state.wave * 0.5) * sf;
          e.position.x += (dx / dist) * speed * dt;
          e.position.y += (dy / dist) * speed * dt;
          e.position.z += (dz / dist) * speed * dt;
        }
        // Slight weave to make it less predictable
        e.position.x += Math.sin(e.patternTimer * 4 + e.id) * 2 * dt;
        e.position.y += Math.cos(e.patternTimer * 3 + e.id * 0.5) * 1.5 * dt;
        break;
      }

      case TDEnemyPattern.SNIPE: {
        // Find a vantage point to the side/above the player and hover there, firing
        const targetX = pPos.x + Math.sin(e.id * 2.7) * 20;
        const targetY = pPos.y + 5 + Math.abs(Math.cos(e.id * 1.3)) * 8;
        const targetZ = pPos.z - 30 - Math.sin(e.id * 0.9) * 10;
        const sdx = targetX - e.position.x;
        const sdy = targetY - e.position.y;
        const sdz = targetZ - e.position.z;
        const sdist = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz);
        if (sdist > 3) {
          const speed = 8 * sf;
          e.position.x += (sdx / sdist) * speed * dt;
          e.position.y += (sdy / sdist) * speed * dt;
          e.position.z += (sdz / sdist) * speed * dt;
        } else {
          // Gentle hover at vantage point
          e.position.y += Math.sin(e.patternTimer * 1.5) * 1.5 * dt;
          e.position.x += Math.cos(e.patternTimer * 0.8) * 1 * dt;
          // Keep pace with scrolling
          e.position.z = pPos.z - 30 + Math.sin(e.patternTimer * 0.4) * 5;
        }
        break;
      }
    }

    if (e.isBoss && !e.isShadowClone) {
      const hpPct = e.hp / e.maxHp;
      // Phase 2: below 50% HP — faster attacks, more aggressive
      if (hpPct < 0.5 && e.bossPhase < 1) {
        e.bossPhase = 1;
        e.fireRate = Math.max(0.2, e.fireRate * 0.6);
        e.velocity.x *= 1.4;
        e.velocity.z *= 1.3;
      }
      // Phase 3: below 25% HP — enraged, much faster
      if (hpPct < 0.25 && e.bossPhase < 2) {
        e.bossPhase = 2;
        e.fireRate = Math.max(0.15, e.fireRate * 0.5);
        e.velocity.x *= 1.3;
        e.velocity.z *= 1.2;
      }
    }

    // Enemy firing
    if (e.fireRate > 0 && !e.isBoss) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = e.fireRate + Math.random() * 0.5;
        _enemyFire(state, e);
      }
    }

    // Remove if too far behind player
    if (e.position.z > pPos.z + 20 && e.pattern !== TDEnemyPattern.BOSS_PATTERN) {
      e.alive = false;
    }
  }
}

function _updateBoss(state: ThreeDragonState, boss: TDEnemy, dt: number): void {
  const sf = boss.slowFactor;
  const pPos = state.player.position;

  // Move to position ahead of player
  const targetZ = pPos.z - 30;
  if (boss.position.z < targetZ - 5) {
    boss.position.z += 8 * dt;
  } else if (boss.position.z > targetZ + 5) {
    boss.position.z -= 4 * dt;
  }

  // Keep pace with player scroll
  boss.position.z = Math.min(boss.position.z, pPos.z - 15);

  // Phase movement
  const phase = Math.floor(boss.patternTimer / 5) % 3;
  switch (phase) {
    case 0:
      boss.position.x += Math.sin(boss.patternTimer * 1.2) * 8 * sf * dt;
      boss.position.y += Math.cos(boss.patternTimer * 0.8) * 4 * sf * dt;
      break;
    case 1: {
      const dy = pPos.y - boss.position.y;
      const dx = pPos.x - boss.position.x;
      boss.position.y += Math.sign(dy) * Math.min(Math.abs(dy), 8 * sf * dt);
      boss.position.x += Math.sign(dx) * Math.min(Math.abs(dx), 6 * sf * dt);
      break;
    }
    case 2:
      boss.position.x += Math.sin(boss.patternTimer * 2) * 10 * sf * dt;
      boss.position.y += Math.cos(boss.patternTimer * 1.5) * 6 * sf * dt;
      break;
  }

  // Clamp
  boss.position.x = Math.max(-20, Math.min(20, boss.position.x));
  boss.position.y = Math.max(4, Math.min(20, boss.position.y));

  // Boss firing
  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    boss.attackTimer = boss.fireRate;

    // Shadow clones chase but don't do special attack patterns
    if (boss.isShadowClone) {
      // Simple aimed shot
      const dx = pPos.x - boss.position.x;
      const dy = pPos.y - boss.position.y;
      const dz = pPos.z - boss.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 0) {
        _spawnEnemyProjectile3D(state, boss, {
          x: (dx / dist) * 20,
          y: (dy / dist) * 20,
          z: (dz / dist) * 20,
        }, boss.glowColor);
      }
      return;
    }

    const attackPhase = boss.bossPhase;
    boss.bossPhase = (boss.bossPhase + 1) % 4;

    switch (attackPhase) {
      case 0: // Spread shot
        for (let i = -3; i <= 3; i++) {
          const angle = i * 0.25;
          _spawnEnemyProjectile3D(state, boss,
            { x: Math.sin(angle) * 15, y: 0, z: 25 }, boss.glowColor);
        }
        break;
      case 1: // Aimed at player
        {
          const dx = pPos.x - boss.position.x;
          const dy = pPos.y - boss.position.y;
          const dz = pPos.z - boss.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > 0) {
            const speed = 25;
            for (let i = 0; i < 3; i++) {
              _spawnEnemyProjectile3D(state, boss, {
                x: (dx / dist) * (speed + i * 5),
                y: (dy / dist) * (speed + i * 5),
                z: (dz / dist) * (speed + i * 5),
              }, boss.glowColor);
            }
          }
        }
        break;
      case 2: // Ring
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          _spawnEnemyProjectile3D(state, boss,
            { x: Math.cos(a) * 12, y: Math.sin(a) * 12, z: 8 }, boss.glowColor);
        }
        break;
      case 3: // Rapid aimed
        {
          const dx = pPos.x - boss.position.x;
          const dy = pPos.y - boss.position.y;
          const dz = pPos.z - boss.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > 0) {
            _spawnEnemyProjectile3D(state, boss, {
              x: (dx / dist) * 30,
              y: (dy / dist) * 30,
              z: (dz / dist) * 30,
            }, boss.glowColor);
          }
        }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Boss-specific mechanics
// ---------------------------------------------------------------------------

function _updateBossMechanics(state: ThreeDragonState, dt: number): void {
  for (const boss of state.enemies) {
    if (!boss.alive || !boss.isBoss || boss.isShadowClone) continue;
    if (!boss.bossMechanics) boss.bossMechanics = _createDefaultBossMechanics();
    const bm = boss.bossMechanics;
    const pPos = state.player.position;

    switch (boss.type) {
      // ----- Ancient Dragon: Fire breath attack -----
      case TDEnemyType.BOSS_ANCIENT_DRAGON: {
        bm.fireBreathCooldown -= dt;
        if (bm.fireBreathActive) {
          bm.fireBreathTimer -= dt;
          // Damage player if in cone
          const dx = pPos.x - boss.position.x;
          const dz = pPos.z - boss.position.z;
          const distXZ = Math.sqrt(dx * dx + dz * dz);
          const angleToPlayer = Math.atan2(dx, dz);
          const angleDiff = Math.abs(angleToPlayer - bm.fireBreathAngle);
          if (distXZ < 20 && angleDiff < 0.5) {
            // Player is in cone — damage if not invincible
            if (state.player.invincTimer <= 0 && !state.player.shieldActive) {
              state.player.hp -= 12 * dt;
              if (Math.random() < dt * 3) _onPlayerHit?.();
              if (state.player.hp <= 0) { state.player.hp = 0; state.gameOver = true; }
            }
          }
          // Also damage enemies in the cone
          for (const e of state.enemies) {
            if (!e.alive || e.id === boss.id || e.isBoss) continue;
            const edx = e.position.x - boss.position.x;
            const edz = e.position.z - boss.position.z;
            const eDist = Math.sqrt(edx * edx + edz * edz);
            const eAngle = Math.atan2(edx, edz);
            if (eDist < 20 && Math.abs(eAngle - bm.fireBreathAngle) < 0.5) {
              e.hp -= 5 * dt;
              if (e.hp <= 0) { e.alive = false; e.deathTimer = 0.5; }
            }
          }
          // Visual: fire particles
          if (Math.random() < dt * 10) {
            _onExplosion?.(
              boss.position.x + Math.sin(bm.fireBreathAngle) * (5 + Math.random() * 15),
              boss.position.y + (Math.random() - 0.5) * 4,
              boss.position.z + Math.cos(bm.fireBreathAngle) * (5 + Math.random() * 15),
              3, 0xff4400,
            );
          }
          if (bm.fireBreathTimer <= 0) bm.fireBreathActive = false;
        } else if (bm.fireBreathCooldown <= 0) {
          bm.fireBreathActive = true;
          bm.fireBreathTimer = 2;
          bm.fireBreathCooldown = 6;
          // Aim toward player
          bm.fireBreathAngle = Math.atan2(pPos.x - boss.position.x, pPos.z - boss.position.z);
        }
        break;
      }

      // ----- Storm Colossus: Lightning zones -----
      case TDEnemyType.BOSS_STORM_COLOSSUS: {
        bm.lightningZoneCooldown -= dt;
        // Update existing zones
        bm.lightningZones = bm.lightningZones.filter(zone => {
          zone.timer -= dt;
          // Damage player and enemies in zone
          const zonePos = zone.position;
          if (_dist3(pPos, zonePos) < zone.radius) {
            if (state.player.invincTimer <= 0 && !state.player.shieldActive) {
              state.player.hp -= 8 * dt;
              if (Math.random() < dt * 2) _onPlayerHit?.();
              if (state.player.hp <= 0) { state.player.hp = 0; state.gameOver = true; }
            }
          }
          for (const e of state.enemies) {
            if (!e.alive || e.id === boss.id || e.isBoss) continue;
            if (_dist3(e.position, zonePos) < zone.radius) {
              e.hp -= 5 * dt;
              if (e.hp <= 0) { e.alive = false; e.deathTimer = 0.5; }
            }
          }
          return zone.timer > 0;
        });
        // Spawn new zones
        if (bm.lightningZoneCooldown <= 0) {
          bm.lightningZoneCooldown = 4;
          for (let i = 0; i < 3; i++) {
            bm.lightningZones.push({
              position: {
                x: pPos.x + (Math.random() - 0.5) * 20,
                y: pPos.y + (Math.random() - 0.5) * 6,
                z: pPos.z - 10 - Math.random() * 20,
              },
              timer: 3,
              radius: 5,
            });
          }
          // Visual per zone
          for (const zone of bm.lightningZones) {
            _onLightningStrike?.(zone.position.x, zone.position.y, zone.position.z);
          }
        }
        break;
      }

      // ----- Death Knight: Shadow clones -----
      case TDEnemyType.BOSS_DEATH_KNIGHT: {
        bm.shadowCloneCooldown -= dt;
        // Clean up dead clone references
        bm.shadowCloneIds = bm.shadowCloneIds.filter(id => {
          const clone = state.enemies.find(e => e.id === id);
          return clone && clone.alive;
        });
        if (bm.shadowCloneCooldown <= 0 && bm.shadowCloneIds.length < 2) {
          bm.shadowCloneCooldown = 10;
          const clonesToSpawn = 2 - bm.shadowCloneIds.length;
          for (let i = 0; i < clonesToSpawn; i++) {
            const clone: TDEnemy = {
              id: state.nextId++,
              type: TDEnemyType.BOSS_DEATH_KNIGHT,
              position: {
                x: boss.position.x + (Math.random() - 0.5) * 10,
                y: boss.position.y + (Math.random() - 0.5) * 4,
                z: boss.position.z + (Math.random() - 0.5) * 6,
              },
              velocity: { x: 0, y: 0, z: 4 },
              hp: Math.floor(boss.maxHp * 0.3),
              maxHp: Math.floor(boss.maxHp * 0.3),
              alive: true,
              isBoss: true,
              isElite: false,
              bossPhase: 0,
              attackTimer: 2,
              hitTimer: 0,
              deathTimer: 0,
              slowFactor: 1,
              slowTimer: 0,
              size: boss.size * 0.7,
              scoreValue: 200,
              pattern: TDEnemyPattern.BOSS_PATTERN,
              patternTimer: Math.random() * Math.PI * 2,
              patternParam: 0,
              fireRate: boss.fireRate * 2,
              color: 0x220044,
              glowColor: 0x6600aa,
              rotationY: 0,
              rotationSpeed: 1,
              statusEffects: _createDefaultStatusEffects(),
              isShadowClone: true,
              parentBossId: boss.id,
            };
            state.enemies.push(clone);
            bm.shadowCloneIds.push(clone.id);
            _onExplosion?.(clone.position.x, clone.position.y, clone.position.z, 4, 0x9900ff);
          }
        }
        break;
      }

      // ----- Celestial Hydra: 3 heads with independent attacks -----
      case TDEnemyType.BOSS_CELESTIAL_HYDRA: {
        if (!bm.hydraInitialized) {
          bm.hydraInitialized = true;
          const headHp = Math.floor(boss.maxHp / 3);
          bm.hydraHeads = [
            { alive: true, hp: headHp, maxHp: headHp, attackTimer: 1.5, pattern: 0 }, // spread
            { alive: true, hp: headHp, maxHp: headHp, attackTimer: 2.0, pattern: 1 }, // aimed
            { alive: true, hp: headHp, maxHp: headHp, attackTimer: 2.5, pattern: 2 }, // ring
          ];
        }
        // Each head fires independently
        for (let h = 0; h < bm.hydraHeads.length; h++) {
          const head = bm.hydraHeads[h];
          if (!head.alive) continue;
          head.attackTimer -= dt;
          if (head.attackTimer <= 0) {
            head.attackTimer = 1.5 + Math.random();
            const headOffset = (h - 1) * 4;
            const headPos: Vec3 = {
              x: boss.position.x + headOffset,
              y: boss.position.y + 2,
              z: boss.position.z,
            };
            const fakeBoss = { ...boss, position: headPos };
            switch (head.pattern) {
              case 0: // Spread
                for (let i = -2; i <= 2; i++) {
                  const angle = i * 0.3;
                  _spawnEnemyProjectile3D(state, fakeBoss,
                    { x: Math.sin(angle) * 15, y: 0, z: 25 }, 0x44ffaa);
                }
                break;
              case 1: // Aimed
                {
                  const adx = pPos.x - headPos.x;
                  const ady = pPos.y - headPos.y;
                  const adz = pPos.z - headPos.z;
                  const adist = Math.sqrt(adx * adx + ady * ady + adz * adz);
                  if (adist > 0) {
                    _spawnEnemyProjectile3D(state, fakeBoss, {
                      x: (adx / adist) * 25,
                      y: (ady / adist) * 25,
                      z: (adz / adist) * 25,
                    }, 0x44ffaa);
                  }
                }
                break;
              case 2: // Ring
                for (let i = 0; i < 8; i++) {
                  const a = (i / 8) * Math.PI * 2;
                  _spawnEnemyProjectile3D(state, fakeBoss,
                    { x: Math.cos(a) * 10, y: Math.sin(a) * 10, z: 6 }, 0x44ffaa);
                }
                break;
            }
          }
        }
        break;
      }

      // ----- Void Emperor: Teleport + void zones -----
      case TDEnemyType.BOSS_VOID_EMPEROR: {
        bm.voidTeleportTimer -= dt;
        // Invincible timer during teleport
        if (bm.voidInvincible) {
          bm.voidInvincibleTimer -= dt;
          if (bm.voidInvincibleTimer <= 0) {
            bm.voidInvincible = false;
          }
        }
        // Update void zones
        bm.voidZones = bm.voidZones.filter(vz => {
          vz.timer -= dt;
          // Damage player in zone
          if (_dist3(pPos, vz.position) < vz.radius) {
            if (state.player.invincTimer <= 0 && !state.player.shieldActive) {
              state.player.hp -= 10 * dt;
              if (Math.random() < dt * 2) _onPlayerHit?.();
              if (state.player.hp <= 0) { state.player.hp = 0; state.gameOver = true; }
            }
          }
          return vz.timer > 0;
        });
        // Teleport
        if (bm.voidTeleportTimer <= 0) {
          bm.voidTeleportTimer = 5;
          // Leave void zone at old position
          bm.voidZones.push({
            position: { ...boss.position },
            timer: 5,
            radius: 6,
          });
          _onExplosion?.(boss.position.x, boss.position.y, boss.position.z, 6, 0xff00ff);
          // Teleport to random position
          boss.position.x = (Math.random() - 0.5) * 30;
          boss.position.y = 6 + Math.random() * 12;
          boss.position.z = pPos.z - 20 - Math.random() * 15;
          bm.voidInvincible = true;
          bm.voidInvincibleTimer = 0.8;
          _onExplosion?.(boss.position.x, boss.position.y, boss.position.z, 6, 0xff00ff);
        }
        break;
      }
    }
  }
}

function _enemyFire(state: ThreeDragonState, enemy: TDEnemy): void {
  const pPos = state.player.position;
  const dx = pPos.x - enemy.position.x;
  const dy = pPos.y - enemy.position.y;
  const dz = pPos.z - enemy.position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist > 0) {
    const speed = 18;
    _spawnEnemyProjectile3D(state, enemy, {
      x: (dx / dist) * speed,
      y: (dy / dist) * speed,
      z: (dz / dist) * speed,
    }, enemy.glowColor);
  }
}

function _spawnEnemyProjectile3D(state: ThreeDragonState, source: TDEnemy, vel: Vec3, color: number): void {
  const dmgScale = 1 + state.wave * TDBalance.ENEMY_DMG_SCALE;
  const baseDmg = source.isBoss ? 15 : 8;

  const proj: TDProjectile = {
    id: state.nextId++,
    position: { x: source.position.x, y: source.position.y, z: source.position.z },
    velocity: vel,
    damage: Math.floor(baseDmg * dmgScale),
    radius: source.isBoss ? 1 : 0.6,
    lifetime: 6,
    isPlayerOwned: false,
    skillId: null,
    color,
    trailColor: color,
    pierce: 0,
    hitEnemies: new Set(),
    homing: false,
    homingTarget: null,
    size: source.isBoss ? 0.5 : 0.3,
    glowIntensity: 0.6,
  };
  state.projectiles.push(proj);
}

// ---------------------------------------------------------------------------
// Enemy projectiles
// ---------------------------------------------------------------------------

function _updateEnemyProjectiles(state: ThreeDragonState, dt: number): void {
  const pz = state.player.position.z;

  state.projectiles = state.projectiles.filter(p => {
    if (p.isPlayerOwned) return true;
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    p.position.z += p.velocity.z * dt;
    p.lifetime -= dt;
    if (p.lifetime <= 0) return false;
    if (Math.abs(p.position.z - pz) > TDBalance.PROJECTILE_CLEANUP_DIST) return false;
    if (Math.abs(p.position.x) > 50) return false;
    if (p.position.y < -5 || p.position.y > 30) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Player collision
// ---------------------------------------------------------------------------

function _checkPlayerCollisions(state: ThreeDragonState): void {
  if (state.player.invincTimer > 0) return;
  const p = state.player;
  const hitR = TDBalance.PLAYER_HIT_RADIUS;

  // Shield blocks damage
  if (p.shieldActive) return;

  // Enemy projectiles
  for (const proj of state.projectiles) {
    if (proj.isPlayerOwned) continue;
    if (_dist3sq(proj.position, p.position) < (hitR + proj.radius) * (hitR + proj.radius)) {
      let dmg = proj.damage;
      // Vampiric modifier: enemies heal
      if (state.activeModifiers.includes("vampiric")) {
        // Find the source — just heal all bosses a bit
        for (const e of state.enemies) {
          if (e.alive && e.isBoss) {
            e.hp = Math.min(e.maxHp, e.hp + Math.floor(dmg * 0.1));
          }
        }
      }
      p.hp -= dmg;
      proj.lifetime = -1;
      p.invincTimer = TDBalance.PLAYER_INVINCIBILITY;
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
    if (!e.alive) continue;
    const contactDist = hitR + e.size * 1.5;
    if (_dist3sq(e.position, p.position) < contactDist * contactDist) {
      const dmg = e.isBoss ? 20 : 10;
      p.hp -= dmg;
      p.invincTimer = TDBalance.PLAYER_INVINCIBILITY;
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

function _updateExplosions(state: ThreeDragonState, dt: number): void {
  for (const ex of state.explosions) {
    ex.timer += dt;
    ex.radius = (ex.timer / ex.maxTimer) * ex.maxRadius;

    for (const e of state.enemies) {
      if (!e.alive || ex.hitEnemies.has(e.id)) continue;
      if (e.bossMechanics?.voidInvincible) continue;
      if (_dist3sq(e.position, ex.position) < (ex.radius + e.size * 1.5) * (ex.radius + e.size * 1.5)) {
        ex.hitEnemies.add(e.id);
        _damageEnemy(state, e, ex.damage, TDSkillId.METEOR_SHOWER);
      }
    }
  }

  state.explosions = state.explosions.filter(ex => ex.timer < ex.maxTimer);
}

// ---------------------------------------------------------------------------
// Hazards
// ---------------------------------------------------------------------------

function _updateHazards(state: ThreeDragonState, dt: number): void {
  if (state.betweenWaves) return;

  const mapCfg = TD_MAP_BY_ID[state.mapId];
  if (!mapCfg?.hazards) return;

  const p = state.player;

  // Spawn timers
  for (const hCfg of mapCfg.hazards) {
    const key = hCfg.type;
    if (!state.hazardSpawnTimers[key]) state.hazardSpawnTimers[key] = hCfg.interval * Math.random();
    state.hazardSpawnTimers[key] -= dt;

    if (state.hazardSpawnTimers[key] <= 0) {
      state.hazardSpawnTimers[key] = hCfg.interval;
      _spawnHazard(state, hCfg, p);
    }
  }

  // Update existing hazards
  state.hazards = state.hazards.filter(h => {
    h.timer -= dt;

    if (h.phase === "warning") {
      if (h.timer <= 0) {
        h.phase = "active";
        h.timer = h.duration;
        h.hitEntities = new Set();
      }
      return true;
    }

    if (h.phase === "active") {
      // Special: leaf tornado and blizzard move
      if (h.type === "leaf_tornado") {
        h.position.x += h.velocity.x * dt;
        h.position.z += h.velocity.z * dt;
        // Push player sideways if caught
        if (_dist3(p.position, h.position) < h.radius) {
          p.position.x += h.velocity.x * 0.5 * dt;
        }
      }
      if (h.type === "blizzard_wind") {
        // Push player sideways
        p.position.x += h.velocity.x * dt;
      }
      if (h.type === "water_spout" && _dist3(p.position, h.position) < h.radius) {
        p.position.y += 8 * dt; // push upward
      }

      // Damage on contact (only once per active period for most hazards)
      if (h.damage > 0) {
        // Player
        if (!h.hitEntities.has(-1) && _dist3(p.position, h.position) < h.radius) {
          if (p.invincTimer <= 0 && !p.shieldActive) {
            p.hp -= h.damage;
            h.hitEntities.add(-1);
            _onPlayerHit?.();
            if (p.hp <= 0) { p.hp = 0; state.gameOver = true; }
          }
        }
        // Enemies (hazards damage enemies too!)
        for (const e of state.enemies) {
          if (!e.alive || h.hitEntities.has(e.id)) continue;
          if (_dist3(e.position, h.position) < h.radius + e.size) {
            e.hp -= h.damage;
            h.hitEntities.add(e.id);
            e.hitTimer = 0.1;
            if (e.hp <= 0) {
              e.alive = false;
              e.deathTimer = 0.5;
              _onEnemyDeath?.(e.position.x, e.position.y, e.position.z, e.size, e.color, e.glowColor, e.isBoss);
            }
          }
        }
      }

      if (h.timer <= 0) {
        h.phase = "fading";
        h.timer = 0.5;
      }
      return true;
    }

    // Fading
    return h.timer > 0;
  });
}

function _spawnHazard(
  state: ThreeDragonState,
  hCfg: { type: TDHazardType; interval: number; damage: number; radius: number; warningDuration: number; activeDuration: number },
  p: TDPlayer,
): void {
  const basePos: Vec3 = {
    x: p.position.x + (Math.random() - 0.5) * 30,
    y: p.position.y + (Math.random() - 0.5) * 8,
    z: p.position.z - 10 - Math.random() * 30,
  };

  let vel: Vec3 = { x: 0, y: 0, z: 0 };

  switch (hCfg.type) {
    case "lava_geyser":
      basePos.y = 0; // ground level
      break;
    case "blizzard_wind":
      vel = { x: (Math.random() < 0.5 ? -12 : 12), y: 0, z: 0 };
      break;
    case "crystal_shard":
      basePos.y = p.position.y + 15; // falls from above
      vel = { x: 0, y: -20, z: 0 };
      break;
    case "lightning_strike":
      // random ground position near player
      break;
    case "water_spout":
      basePos.y = 0;
      break;
    case "leaf_tornado":
      basePos.x = (Math.random() < 0.5 ? -30 : 30);
      vel = { x: basePos.x > 0 ? -8 : 8, y: 0, z: -3 };
      break;
  }

  const hazard: TDHazard = {
    id: state.nextId++,
    type: hCfg.type,
    position: basePos,
    velocity: vel,
    timer: hCfg.warningDuration > 0 ? hCfg.warningDuration : hCfg.activeDuration,
    phase: hCfg.warningDuration > 0 ? "warning" : "active",
    radius: hCfg.radius,
    damage: hCfg.damage,
    duration: hCfg.activeDuration,
    warningDuration: hCfg.warningDuration,
    hitEntities: new Set(),
  };
  state.hazards.push(hazard);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _damageEnemy(state: ThreeDragonState, enemy: TDEnemy, damage: number, skillId?: TDSkillId | null): void {
  // Void Emperor invincibility
  if (enemy.bossMechanics?.voidInvincible) return;

  // Apply upgrade damage multiplier
  let finalDmg = damage * state.upgradeState.damageMult;

  // Shadow Strike synergy: 2x damage during Shadow Dive
  if (state.player.shadowDiveActive && skillId) {
    finalDmg *= 2;
    // Only trigger popup once
    if (!state.shadowDiveAttackedDuringInvuln) {
      state.shadowDiveAttackedDuringInvuln = true;
      _triggerSynergy(state, "shadow_strike", enemy.position.x, enemy.position.y + 2, enemy.position.z);
    }
  }

  // Ensure statusEffects
  if (!enemy.statusEffects) enemy.statusEffects = _createDefaultStatusEffects();
  const se = enemy.statusEffects;

  // Synergy checks
  if (skillId) {
    // Shatter: frozen enemies take +50% from physical attacks
    if (se.frozen > 0 && TD_PHYSICAL_SKILLS.includes(skillId)) {
      finalDmg *= 1.5;
      _triggerSynergy(state, "shatter", enemy.position.x, enemy.position.y + 2, enemy.position.z);
    }

    // Conductor: lightning skills deal +30% to wet/frozen enemies
    if ((se.frozen > 0 || se.wet > 0) && TD_LIGHTNING_SKILLS.includes(skillId)) {
      finalDmg *= 1.3;
      _triggerSynergy(state, "conductor", enemy.position.x, enemy.position.y + 2, enemy.position.z);
    }

    // Ignite: fire on frozen enemies = steam explosion
    if (se.frozen > 0 && TD_FIRE_SKILLS.includes(skillId)) {
      se.frozen = 0; // Thaw
      // Steam explosion AoE
      const steamRadius = 8;
      const steamDmg = finalDmg * 0.5;
      for (const other of state.enemies) {
        if (!other.alive || other.id === enemy.id) continue;
        if (_dist3(other.position, enemy.position) < steamRadius) {
          other.hp -= steamDmg;
          other.hitTimer = 0.1;
          _onHit?.(other.position.x, other.position.y, other.position.z, steamDmg, false);
        }
      }
      _onExplosion?.(enemy.position.x, enemy.position.y, enemy.position.z, steamRadius, 0xcccccc);
      _triggerSynergy(state, "ignite", enemy.position.x, enemy.position.y + 2, enemy.position.z);
    }
  }

  // Armored modifier: enemies take 40% less damage
  if (state.activeModifiers.includes("armored")) {
    finalDmg *= 0.6;
  }

  const critChance = 0.15 + state.upgradeState.critChanceBonus;
  const isCrit = Math.random() < critChance;
  if (isCrit) finalDmg = Math.floor(finalDmg * 1.8);
  else finalDmg = Math.floor(finalDmg);

  enemy.hp -= finalDmg;
  enemy.hitTimer = 0.1;

  _onHit?.(enemy.position.x, enemy.position.y, enemy.position.z, finalDmg, isCrit);
  _onDamageNumber?.(enemy.position.x, enemy.position.y + enemy.size, enemy.position.z, finalDmg, isCrit, enemy.isElite);

  state.player.comboCount++;
  state.player.comboTimer = TDBalance.COMBO_TIMEOUT;

  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.deathTimer = 0.5;
    const comboMult = 1 + state.player.comboCount * TDBalance.COMBO_SCORE_MULT;
    state.player.score += Math.floor(enemy.scoreValue * comboMult);
    _onExplosion?.(enemy.position.x, enemy.position.y, enemy.position.z, enemy.size * 3, enemy.glowColor);

    // Death Knight shadow clone: killing a clone damages the boss
    if (enemy.isShadowClone && enemy.parentBossId) {
      const parentBoss = state.enemies.find(e => e.id === enemy.parentBossId && e.alive);
      if (parentBoss) {
        const cloneDmg = Math.floor(parentBoss.maxHp * 0.05);
        parentBoss.hp -= cloneDmg;
        parentBoss.hitTimer = 0.2;
        _onHit?.(parentBoss.position.x, parentBoss.position.y, parentBoss.position.z, cloneDmg, true);
        _onDamageNumber?.(parentBoss.position.x, parentBoss.position.y + parentBoss.size, parentBoss.position.z, cloneDmg, true, false);
      }
    }

    // Explosive modifier: enemies explode on death
    if (state.activeModifiers.includes("explosive") && !enemy.isBoss) {
      const explRadius = 5;
      const explDmg = 10;
      // Damage player
      if (_dist3(state.player.position, enemy.position) < explRadius) {
        if (state.player.invincTimer <= 0 && !state.player.shieldActive) {
          state.player.hp -= explDmg;
          _onPlayerHit?.();
          if (state.player.hp <= 0) { state.player.hp = 0; state.gameOver = true; }
        }
      }
      _onExplosion?.(enemy.position.x, enemy.position.y, enemy.position.z, explRadius, 0xff4400);
    }

    // Enemy death callback
    _onEnemyDeath?.(enemy.position.x, enemy.position.y, enemy.position.z, enemy.size, enemy.color, enemy.glowColor, enemy.isBoss);

    // Grant XP
    const xpAmount = enemy.isBoss ? TDBalance.XP_PER_KILL_BOSS : TDBalance.XP_PER_KILL_BASE + Math.floor(enemy.scoreValue * 0.05);
    _grantXP(state, xpAmount);

    // Boss kill: callback + slow-mo
    if (enemy.isBoss && !enemy.isShadowClone) {
      _onBossKill?.(enemy.position.x, enemy.position.y, enemy.position.z, enemy.size, enemy.color, enemy.glowColor);
      state.slowMoTimer = 1.5;
      state.slowMoFactor = 0.2;
    }

    // Roll for power-up drop
    if (Math.random() < TDBalance.POWERUP_DROP_CHANCE) {
      const isHealth = Math.random() < TDBalance.POWERUP_HEALTH_RATIO;
      const powerUp: TDPowerUp = {
        id: state.nextId++,
        position: { x: enemy.position.x, y: enemy.position.y, z: enemy.position.z },
        velocity: {
          x: (Math.random() - 0.5) * 8,
          y: 5 + Math.random() * 5,
          z: (Math.random() - 0.5) * 8,
        },
        type: isHealth ? "health" : "mana",
        value: isHealth ? TDBalance.POWERUP_HEALTH_VALUE : TDBalance.POWERUP_MANA_VALUE,
        lifetime: TDBalance.POWERUP_LIFETIME,
        collected: false,
        magnetTimer: 0.5,
      };
      state.powerUps.push(powerUp);
    }
  }
}

function _updateMana(state: ThreeDragonState, dt: number): void {
  state.player.mana = Math.min(state.player.maxMana, state.player.mana + state.player.manaRegen * dt);
}

function _updateCombo(state: ThreeDragonState, dt: number): void {
  if (state.player.comboTimer > 0) {
    state.player.comboTimer -= dt;
    if (state.player.comboTimer <= 0) state.player.comboCount = 0;
  }
}

function _updateInvincibility(state: ThreeDragonState, dt: number): void {
  if (state.player.invincTimer > 0) state.player.invincTimer -= dt;
}

function _updateShield(state: ThreeDragonState, dt: number): void {
  if (state.player.shieldTimer > 0) {
    state.player.shieldTimer -= dt;
    if (state.player.shieldTimer <= 0) {
      state.player.shieldActive = false;
    }
  }
}

function _updatePowerUps(state: ThreeDragonState, dt: number): void {
  const p = state.player;

  for (const pu of state.powerUps) {
    if (pu.collected) continue;

    // Apply gravity
    pu.velocity.y -= 15 * dt;

    // Move
    pu.position.x += pu.velocity.x * dt;
    pu.position.y += pu.velocity.y * dt;
    pu.position.z += pu.velocity.z * dt;

    // Floor bounce
    if (pu.position.y < 1) {
      pu.position.y = 1;
      pu.velocity.y = Math.abs(pu.velocity.y) * 0.3;
      pu.velocity.x *= 0.5;
      pu.velocity.z *= 0.5;
    }

    // Decrement lifetime
    pu.lifetime -= dt;

    // Magnet timer
    if (pu.magnetTimer > 0) {
      pu.magnetTimer -= dt;
      continue;
    }

    // Magnet: accelerate toward player if within radius
    const dx = p.position.x - pu.position.x;
    const dy = p.position.y - pu.position.y;
    const dz = p.position.z - pu.position.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const magnetR = TDBalance.POWERUP_MAGNET_RADIUS;

    if (distSq < magnetR * magnetR) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.1) {
        const speed = TDBalance.POWERUP_MAGNET_SPEED;
        pu.velocity.x = (dx / dist) * speed;
        pu.velocity.y = (dy / dist) * speed;
        pu.velocity.z = (dz / dist) * speed;
      }
    }

    // Collect if within radius
    const collectR = TDBalance.POWERUP_COLLECT_RADIUS;
    if (distSq < collectR * collectR) {
      pu.collected = true;
      if (pu.type === "health") {
        p.hp = Math.min(p.maxHp, p.hp + pu.value);
      } else {
        p.mana = Math.min(p.maxMana, p.mana + pu.value);
      }
      _onPowerUpCollect?.(pu.position.x, pu.position.y, pu.position.z, pu.type);
    }
  }

  // Filter out collected or expired
  state.powerUps = state.powerUps.filter(pu => !pu.collected && pu.lifetime > 0);
}

function _cleanupDead(state: ThreeDragonState): void {
  state.enemies = state.enemies.filter(e => e.alive || e.deathTimer > 0);
}
