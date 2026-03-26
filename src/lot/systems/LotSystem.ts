// ---------------------------------------------------------------------------
// LOT: Fate's Gambit — core game systems (improved)
// ---------------------------------------------------------------------------

import { LOT, DIFFICULTY_MULT, type LotType, LOT_DISPLAY } from "../config/LotConfig";
import type {
  LotState, LotEnemy, Vec3, EnemyType,
  BuffType, UpgradeId, MutationType,
} from "../state/LotState";
import { genLotId, BUFF_INFO, UPGRADE_DEFS, MUTATION_INFO, KILL_STREAKS } from "../state/LotState";

// ---- Helpers ----
function distXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
function dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function normalize3(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function rng(): number { return Math.random(); }
function rngRange(a: number, b: number): number { return a + rng() * (b - a); }

// ---- Buff/upgrade helpers ----
function hasBuff(state: LotState, type: BuffType): boolean {
  return state.buffs.some(b => b.type === type);
}
function getUpgrade(state: LotState, id: UpgradeId): number {
  return state.upgrades[id];
}
function getDamageMult(state: LotState): number {
  let mult = 1 + getUpgrade(state, "tempered_blade") * 0.15;
  if (hasBuff(state, "blood_oath")) mult *= 1.3;
  if (hasBuff(state, "berserker_rage")) {
    const hpPct = state.player.hp / state.player.maxHp;
    mult *= 1 + (1 - hpPct) * 0.8;
  }
  if (hasBuff(state, "glass_cannon")) mult *= 1.6;
  // Combo damage bonus
  const comboBonus = Math.min(state.player.comboCount * LOT.COMBO_DAMAGE_BONUS, LOT.COMBO_MAX_BONUS);
  mult *= 1 + comboBonus;
  return mult;
}
function getEnemyDamageTakenMult(state: LotState): number {
  return hasBuff(state, "focus_fire") ? 2.0 : 1.0;
}
function getMoveMult(state: LotState): number {
  let mult = 1;
  if (hasBuff(state, "swift_feet")) mult *= 1.2;
  if (hasBuff(state, "fortress")) mult *= 0.6;
  return mult;
}
function getDodgeCdMult(state: LotState): number {
  let mult = 1 - getUpgrade(state, "quick_recovery") * 0.2;
  if (hasBuff(state, "phantom_dodge")) mult *= 0.6;
  return mult;
}
function getIframeMult(state: LotState): number {
  return hasBuff(state, "phantom_dodge") ? 2 : 1;
}
function getFortuneDropChance(state: LotState): number {
  return LOT.FORTUNE_RARE_DROP_CHANCE + getUpgrade(state, "fortune_seeker") * 0.1;
}
function getHeavyChargeTime(state: LotState): number {
  return Math.max(0.2, LOT.HEAVY_CHARGE_TIME - getUpgrade(state, "heavy_mastery") * 0.15);
}
function getEffectiveMaxHp(state: LotState): number {
  let hp = LOT.MAX_HP + getUpgrade(state, "fortified_armor") * 15 + (hasBuff(state, "iron_skin") ? 25 : 0);
  if (hasBuff(state, "fortress")) hp *= 1.5;
  if (hasBuff(state, "glass_cannon")) hp *= 0.6;
  return Math.round(hp);
}
function getEffectiveMaxStamina(state: LotState): number {
  return LOT.STAMINA_MAX + getUpgrade(state, "endurance") * 20;
}
function getScoreMult(state: LotState): number {
  return state.mutation === "blood_moon" ? LOT.BLOOD_MOON_SCORE_MULT : 1;
}

// ---- Lot drawing ----
export function drawLot(state: LotState): LotType {
  const weights: Record<string, number> = { ...LOT.LOT_WEIGHTS };
  if (state.round < 3) weights.boss_fight = 0;
  if (state.round < 2) weights.fate_duel = 0;

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const [type, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return type as LotType;
  }
  return "monster_wave";
}

export function rerollLot(state: LotState): void {
  if (state.fortune < LOT.REROLL_COST || state.rerolled) return;
  state.fortune -= LOT.REROLL_COST;
  state.rerolled = true;
  let newLot = drawLot(state);
  let attempts = 0;
  while (newLot === state.drawnLot && attempts < 10) { newLot = drawLot(state); attempts++; }
  state.drawnLot = newLot;
  addNotification(state, `Re-rolled! New lot: ${LOT_DISPLAY[newLot].name}`, LOT_DISPLAY[newLot].color);
}

// ---- Mutation ----
function rollMutation(state: LotState): MutationType {
  if (state.round < LOT.MUTATION_START_ROUND) return "none";
  const types: MutationType[] = ["frozen", "overgrown", "blood_moon", "fog", "runic_overcharge"];
  return rng() < 0.6 ? types[Math.floor(rng() * types.length)] : "none";
}

// ---- Phase management ----
export function updatePhase(state: LotState, dt: number): void {
  if (state.phase === "menu" || state.phase === "game_over") return;

  // Slow motion timer (replaces setTimeout)
  if (state.slowMotionTimer > 0) {
    state.slowMotionTimer -= dt;
    if (state.slowMotionTimer <= 0) state.slowMotionScale = 1;
  }

  state.phaseTimer -= dt;

  if (state.phase === "draw") {
    if (state.phaseTimer <= 0) {
      state.currentLot = state.drawnLot!;
      state.phase = "active";
      setupLotChallenge(state);
    }
    return;
  }

  if (state.phase === "victory") {
    if (state.phaseTimer <= 0) {
      // Go to buff selection
      state.phase = "buff_select";
      state.phaseTimer = LOT.BUFF_SELECT_DURATION;
      state.buffChoices = generateBuffChoices(state);
      // Heal player between rounds
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
      state.player.stamina = getEffectiveMaxStamina(state);
      // Fortune for flawless
      if (state.flawless) {
        state.fortune = Math.min(LOT.MAX_FORTUNE, state.fortune + LOT.FORTUNE_PER_FLAWLESS);
        addNotification(state, "Flawless! +1 Fortune", "#ffd700");
      }
      // Decrement buff durations
      for (const buff of state.buffs) {
        if (buff.roundsLeft > 0) buff.roundsLeft--;
      }
      state.buffs = state.buffs.filter(b => b.roundsLeft !== 0);
    }
    return;
  }

  if (state.phase === "buff_select") {
    if (state.phaseTimer <= 0 || state.buffChoices.length === 0) {
      state.phase = "intermission";
      state.phaseTimer = LOT.INTERMISSION_DURATION;
      state.buffChoices = [];
    }
    return;
  }

  if (state.phase === "intermission") {
    if (state.phaseTimer <= 0) {
      beginDrawPhase(state);
    }
    return;
  }

  if (state.phase === "active") {
    checkLotCompletion(state, dt);
  }
}

export function beginDrawPhase(state: LotState): void {
  state.round++;
  state.roundKills = 0;
  state.flawless = true;
  state.rerolled = false;
  state.drawnLot = drawLot(state);
  state.phase = "draw";
  state.phaseTimer = LOT.DRAW_PHASE_DURATION;
  state.enemies = [];
  state.obstacles = [];
  state.treasures = [];
  state.spawnQueue = [];
  state.projectiles = [];
  state.shockwaves = [];
  state.curseRadius = LOT.ARENA_RADIUS;
  state.obstacleTimeLeft = 0;
  state.telegraphs = [];
  state.shrines = [];
  state.player.fateShieldUsed = false;
  state.player.burnTargets.clear();

  // Roll arena mutation
  state.mutation = rollMutation(state);
  state.runicExplosions = [];
  if (state.mutation !== "none") {
    const info = MUTATION_INFO[state.mutation];
    addNotification(state, `Arena: ${info.name} — ${info.desc}`, info.color);
  }

  // Update max HP/stamina from upgrades
  state.player.maxHp = getEffectiveMaxHp(state);
  state.player.hp = Math.min(state.player.hp, state.player.maxHp);

  generatePillars(state);
  addNotification(state, `Round ${state.round} — Drawing lot...`, "#ffd700");
}

function generatePillars(state: LotState): void {
  state.pillars = [];
  let count = LOT.PILLAR_COUNT + Math.floor(state.round / 3);
  if (state.mutation === "overgrown") count *= 3;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rngRange(-0.2, 0.2);
    const dist = rngRange(10, LOT.ARENA_RADIUS - 5);
    state.pillars.push({
      pos: { x: Math.cos(angle) * dist, y: 0, z: Math.sin(angle) * dist },
      height: rngRange(6, LOT.PILLAR_HEIGHT),
      radius: LOT.PILLAR_RADIUS,
      hp: LOT.PILLAR_HP,
      destroyed: false,
      crumbleTimer: 0,
    });
  }
}

// ---- Buff system ----
function generateBuffChoices(state: LotState): BuffType[] {
  const all: BuffType[] = ["blood_oath", "iron_skin", "swift_feet", "vampiric_edge",
    "fortunes_favor", "berserker_rage", "phantom_dodge", "elemental_sword",
    "glass_cannon", "focus_fire", "fortress"];
  // Filter out buffs already active (permanent ones)
  const available = all.filter(b => {
    if (BUFF_INFO[b].duration === -1 && hasBuff(state, b)) return false;
    return true;
  });
  // Pick 3
  const choices: BuffType[] = [];
  while (choices.length < 3 && available.length > 0) {
    const idx = Math.floor(rng() * available.length);
    choices.push(available.splice(idx, 1)[0]);
  }
  return choices;
}

export function selectBuff(state: LotState, type: BuffType): void {
  if (!state.buffChoices.includes(type)) return;
  const info = BUFF_INFO[type];

  if (type === "fortunes_favor") {
    state.fortune = Math.min(LOT.MAX_FORTUNE, state.fortune + 1);
  } else if (type === "iron_skin") {
    state.buffs.push({ type, roundsLeft: -1 });
    state.player.maxHp = getEffectiveMaxHp(state);
    state.player.hp = Math.min(state.player.hp + 25, state.player.maxHp);
  } else if (type === "glass_cannon") {
    state.buffs.push({ type, roundsLeft: -1 });
    state.player.maxHp = getEffectiveMaxHp(state);
    state.player.hp = Math.min(state.player.hp, state.player.maxHp);
  } else if (type === "fortress") {
    state.buffs.push({ type, roundsLeft: -1 });
    state.player.maxHp = getEffectiveMaxHp(state);
    state.player.hp += Math.round(LOT.MAX_HP * 0.5);
    state.player.hp = Math.min(state.player.hp, state.player.maxHp);
  } else {
    state.buffs.push({ type, roundsLeft: info.duration });
  }

  addNotification(state, `${info.icon} ${info.name} activated!`, info.color);
  state.buffChoices = [];
  // Advance to intermission
  state.phase = "intermission";
  state.phaseTimer = LOT.INTERMISSION_DURATION;
}

// ---- Upgrade system ----
export function purchaseUpgrade(state: LotState, id: UpgradeId): boolean {
  const def = UPGRADE_DEFS[id];
  const level = state.upgrades[id];
  if (level >= def.maxLevel) return false;
  const cost = def.costs[level];
  if (state.score < cost) return false;

  state.score -= cost;
  state.upgrades[id] = level + 1;

  // Apply immediate effects
  if (id === "fortified_armor") {
    state.player.maxHp = getEffectiveMaxHp(state);
    state.player.hp = Math.min(state.player.hp + 15, state.player.maxHp);
  }

  addNotification(state, `Upgraded ${def.name} to Lv${level + 1}!`, def.color);
  return true;
}

// ---- Challenge setup ----
function setupLotChallenge(state: LotState): void {
  const lot = state.currentLot!;
  const d = DIFFICULTY_MULT[state.difficulty];
  const display = LOT_DISPLAY[lot];
  addNotification(state, `${display.icon} ${display.name}: ${display.desc}`, display.color);

  // Start appropriate music
  if (lot === "boss_fight") LotAudio.startMusic("boss");
  else LotAudio.startMusic("combat");

  // Blood moon mutation empowers enemies
  const enemyMult = state.mutation === "blood_moon" ? LOT.BLOOD_MOON_ENEMY_MULT : 1;

  switch (lot) {
    case "monster_wave": setupMonsterWave(state, d, enemyMult); break;
    case "obstacle_gauntlet": setupObstacleGauntlet(state); break;
    case "treasure_hunt": setupTreasureHunt(state); break;
    case "boss_fight": setupBossFight(state, d, enemyMult); break;
    case "cursed_arena": setupCursedArena(state, d, enemyMult); break;
    case "fate_duel": setupFateDuel(state, d, enemyMult); break;
  }

  // Runic overcharge mutation setup
  if (state.mutation === "runic_overcharge") {
    setupRunicExplosions(state);
  }
}

function setupMonsterWave(state: LotState, d: { hp: number; dmg: number; count: number; fortune: number }, enemyMult: number): void {
  const round = state.round;
  // Spawn a combat shrine in the arena
  if (round >= 2) {
    const shrineTypes: ("power" | "speed" | "armor")[] = ["power", "speed", "armor"];
    const angle = rng() * Math.PI * 2;
    const dist = rngRange(10, LOT.ARENA_RADIUS - 8);
    state.shrines.push({
      pos: { x: Math.cos(angle) * dist, y: 0.5, z: Math.sin(angle) * dist },
      type: shrineTypes[Math.floor(rng() * 3)],
      timer: 20, collected: false,
    });
  }
  const count = Math.floor((LOT.WAVE_BASE_COUNT + round * LOT.WAVE_COUNT_PER_ROUND) * d.count * enemyMult);
  for (let i = 0; i < count; i++) {
    const roll = rng();
    let type: EnemyType;
    if (round >= 5 && roll < 0.05) type = "necromancer";
    else if (round >= 4 && roll < 0.1) type = "skeleton_archer";
    else if (roll < 0.55) type = "skeleton";
    else if (roll < 0.8) type = "wraith";
    else type = "golem";
    state.spawnQueue.push({ type, delay: i * 0.8 + rngRange(0, 0.4) });
  }
}

function setupObstacleGauntlet(state: LotState): void {
  const round = state.round;
  state.obstacleTimeLeft = LOT.GAUNTLET_BASE_TIME + round * LOT.GAUNTLET_TIME_PER_ROUND;

  const spikeCount = 4 + Math.floor(round * 0.8);
  for (let i = 0; i < spikeCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rngRange(5, LOT.ARENA_RADIUS - 3);
    state.obstacles.push({
      id: genLotId(), type: "spike_trap",
      pos: { x: Math.cos(angle) * dist, y: 0, z: Math.sin(angle) * dist },
      radius: 2.0, damage: LOT.SPIKE_TRAP_DAMAGE + round * 2,
      timer: rngRange(0, LOT.SPIKE_TRAP_CD), active: false, angle: 0, speed: 0,
    });
  }
  const fireCount = 2 + Math.floor(round * 0.5);
  for (let i = 0; i < fireCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rngRange(8, LOT.ARENA_RADIUS - 5);
    state.obstacles.push({
      id: genLotId(), type: "fire_pillar",
      pos: { x: Math.cos(angle) * dist, y: 0, z: Math.sin(angle) * dist },
      radius: LOT.FIRE_PILLAR_RADIUS, damage: LOT.FIRE_PILLAR_DAMAGE + round,
      timer: 0, active: true, angle: 0, speed: 0,
    });
  }
  const pendulumCount = 2 + Math.floor(round * 0.4);
  for (let i = 0; i < pendulumCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rngRange(6, LOT.ARENA_RADIUS - 4);
    state.obstacles.push({
      id: genLotId(), type: "pendulum",
      pos: { x: Math.cos(angle) * dist, y: 3, z: Math.sin(angle) * dist },
      radius: 1.5, damage: LOT.PENDULUM_DAMAGE + round * 3,
      timer: 0, active: true, angle: rng() * Math.PI * 2, speed: LOT.PENDULUM_SPEED + round * 0.1,
    });
  }
  const enemyCount = Math.floor(2 + round * 0.5);
  for (let i = 0; i < enemyCount; i++) {
    state.spawnQueue.push({ type: "skeleton", delay: i * 1.5 + 2 });
  }
}

function setupTreasureHunt(state: LotState): void {
  const round = state.round;
  const count = LOT.TREASURE_COUNT + Math.floor(round * 0.5);
  state.treasureTimeLeft = LOT.TREASURE_TIME_LIMIT - Math.min(round * 1.5, 10);
  state.treasuresCollected = 0;
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rngRange(5, LOT.ARENA_RADIUS - 3);
    const typeRoll = rng();
    state.treasures.push({
      id: genLotId(),
      pos: { x: Math.cos(angle) * dist, y: 1.0 + Math.sin(i * 0.5) * 0.5, z: Math.sin(angle) * dist },
      collected: false,
      type: typeRoll < LOT.TREASURE_FORTUNE_CHANCE ? "fortune" : typeRoll < 0.5 ? "heal" : "gold",
      glowTimer: rng() * Math.PI * 2,
    });
  }
  for (let i = 0; i < 2 + Math.floor(round * 0.3); i++) {
    state.spawnQueue.push({ type: "wraith", delay: i * 2 + 3 });
  }
}

function setupBossFight(state: LotState, d: { hp: number; dmg: number; count: number; fortune: number }, enemyMult: number): void {
  const round = state.round;
  const bossHp = (LOT.BOSS_HP_BASE + round * LOT.BOSS_HP_PER_ROUND) * d.hp;
  const angle = rng() * Math.PI * 2;
  const boss = createEnemy("boss",
    { x: Math.cos(angle) * 15, y: 0, z: Math.sin(angle) * 15 },
    bossHp, LOT.BOSS_DAMAGE * d.dmg * enemyMult, LOT.BOSS_SPEED,
  );
  boss.attackRange = 4.0;
  boss.attackCd = LOT.BOSS_ATTACK_CD;
  boss.bossPhase = 1;
  state.enemies.push(boss);
  addNotification(state, "A CHAMPION OF FATE APPEARS!", "#cc00ff");
}

function setupCursedArena(state: LotState, d: { hp: number; dmg: number; count: number; fortune: number }, enemyMult: number): void {
  state.curseRadius = LOT.ARENA_RADIUS;
  const round = state.round;
  const count = Math.floor((3 + round * 1.2) * d.count * enemyMult);
  for (let i = 0; i < count; i++) {
    const type: EnemyType = rng() < 0.5 ? "skeleton" : "wraith";
    state.spawnQueue.push({ type, delay: i * 0.6 });
  }
}

function setupFateDuel(state: LotState, d: { hp: number; dmg: number; count: number; fortune: number }, enemyMult: number): void {
  const round = state.round;
  const hp = (LOT.DUEL_CHAMPION_HP_BASE + round * LOT.DUEL_CHAMPION_HP_PER_ROUND) * d.hp;
  const champ = createEnemy("champion",
    { x: 0, y: 0, z: -15 },
    hp, LOT.DUEL_CHAMPION_DAMAGE * d.dmg * enemyMult, LOT.DUEL_CHAMPION_SPEED,
  );
  champ.attackRange = 2.5;
  champ.attackCd = 0.8;
  state.enemies.push(champ);
  addNotification(state, "A fate champion challenges you!", "#ffffff");
}

function setupRunicExplosions(state: LotState): void {
  // Place explosions on existing rune positions
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const d = 20;
    state.runicExplosions.push({
      pos: { x: Math.cos(angle) * d, y: 0, z: Math.sin(angle) * d },
      timer: LOT.RUNIC_EXPLOSION_CD + rngRange(0, 3),
      radius: LOT.RUNIC_EXPLOSION_RADIUS,
      warned: false,
    });
  }
}

function createEnemy(type: EnemyType, pos: Vec3, hp: number, damage: number, speed: number): LotEnemy {
  return {
    id: genLotId(), type, pos: { ...pos }, vel: { x: 0, y: 0, z: 0 },
    hp, maxHp: hp, damage, speed,
    attackRange: LOT.SKELETON_ATTACK_RANGE, attackCd: LOT.SKELETON_ATTACK_CD,
    attackTimer: 0, behavior: "idle", behaviorTimer: 0, yaw: 0,
    hitFlash: 0, specialCd: 5, specialTimer: 0, dead: false, deathTimer: 0,
    bossPhase: 1, flankIndex: 0,
    burning: 0, stunVisual: 0, walkCycle: rng() * Math.PI * 2, elite: false, spawnTimer: 0.6,
  };
}

// ---- Player update ----
export function updatePlayer(state: LotState, dt: number): void {
  if (state.phase !== "active" && state.phase !== "intermission") return;
  const p = state.player;
  const keys = state.keys;
  const moveMult = getMoveMult(state);

  // Camera rotation
  if (state.pointerLocked) {
    p.yaw -= state.mouseDX * 0.003;
    p.pitch = clamp(p.pitch - state.mouseDY * 0.003, -1.2, 1.2);
    state.mouseDX = 0;
    state.mouseDY = 0;
  }

  // Movement
  const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
  let mx = 0, mz = 0;
  if (keys.has("w") || keys.has("arrowup")) { mx += sinY; mz += cosY; }
  if (keys.has("s") || keys.has("arrowdown")) { mx -= sinY; mz -= cosY; }
  if (keys.has("a") || keys.has("arrowleft")) { mx += cosY; mz -= sinY; }
  if (keys.has("d") || keys.has("arrowright")) { mx -= cosY; mz += sinY; }

  const maxStamina = getEffectiveMaxStamina(state);
  const sprint = keys.has("shift") && p.stamina > 0;
  const speed = (sprint ? LOT.SPRINT_SPEED : LOT.MOVE_SPEED) * moveMult;
  const mLen = Math.sqrt(mx * mx + mz * mz);

  if (p.dodgeTimer > 0) {
    p.dodgeTimer -= dt;
  } else {
    if (mLen > 0.01) {
      mx = (mx / mLen) * speed;
      mz = (mz / mLen) * speed;
    }
    p.vel.x = mx;
    p.vel.z = mz;
  }

  // Dodge (Q key — separate from jump)
  if (keys.has("q") && p.dodgeCooldown <= 0 && p.stamina >= LOT.STAMINA_DODGE_COST && mLen > 0.01) {
    p.dodgeTimer = LOT.DODGE_DURATION;
    p.dodgeCooldown = LOT.DODGE_COOLDOWN * getDodgeCdMult(state);
    p.iframeTimer = LOT.DODGE_IFRAMES * getIframeMult(state);
    p.stamina -= LOT.STAMINA_DODGE_COST;
    p.vel.x = (mx / mLen) * LOT.DODGE_SPEED;
    p.vel.z = (mz / mLen) * LOT.DODGE_SPEED;
    spawnParticles(state, p.pos, 8, "#88aaff", 3, 0.15);
    LotAudio.play("dodge");
  }

  // Jump (space)
  if (keys.has(" ") && p.grounded) {
    p.vel.y = LOT.JUMP_FORCE;
    p.grounded = false;
  }

  // Gravity
  p.vel.y += LOT.GRAVITY * dt;

  // Apply velocity
  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  p.pos.z += p.vel.z * dt;

  // Frozen mutation: icy sliding
  if (state.mutation === "frozen" && p.grounded) {
    // Less control: velocity persists more
    p.vel.x *= LOT.FROZEN_DRAG;
    p.vel.z *= LOT.FROZEN_DRAG;
  }

  // Ground
  if (p.pos.y <= 1) { p.pos.y = 1; p.vel.y = 0; p.grounded = true; }

  // Arena bounds
  const pDist = Math.sqrt(p.pos.x * p.pos.x + p.pos.z * p.pos.z);
  const effectiveRadius = state.currentLot === "cursed_arena" ? state.curseRadius : LOT.ARENA_RADIUS;
  if (pDist > effectiveRadius - 1) {
    const scale = (effectiveRadius - 1) / pDist;
    p.pos.x *= scale;
    p.pos.z *= scale;
  }

  // Pillar collision
  for (const pillar of state.pillars) {
    if (pillar.destroyed) continue;
    const d = distXZ(p.pos, pillar.pos);
    if (d < pillar.radius + 0.8) {
      const pushDist = pillar.radius + 0.8 - d;
      const dx = p.pos.x - pillar.pos.x;
      const dz = p.pos.z - pillar.pos.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      p.pos.x += (dx / len) * pushDist;
      p.pos.z += (dz / len) * pushDist;
    }
  }

  // Stamina
  if (sprint && mLen > 0.01) {
    p.stamina = Math.max(0, p.stamina - LOT.STAMINA_SPRINT_DRAIN * dt);
  } else {
    p.stamina = Math.min(maxStamina, p.stamina + LOT.STAMINA_REGEN * dt);
  }

  // Cooldowns
  p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);
  p.iframeTimer = Math.max(0, p.iframeTimer - dt);
  p.attackTimer = Math.max(0, p.attackTimer - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.comboTimer = Math.max(0, p.comboTimer - dt);
  if (p.comboTimer <= 0) p.comboCount = 0;
  p.killStreakTimer = Math.max(0, p.killStreakTimer - dt);
  if (p.killStreakTimer <= 0) p.killStreak = 0;
  p.lastHitTimer = Math.max(0, p.lastHitTimer - dt);

  // Blocking
  p.blocking = state.rightMouseDown && p.stamina > LOT.SHIELD_STAMINA_COST;

  // HP regen
  const regenMult = state.phase === "intermission" ? 3 : 1;
  p.hp = Math.min(p.maxHp, p.hp + LOT.HP_REGEN * regenMult * dt);

  // Burn DoT on enemies
  if (hasBuff(state, "elemental_sword")) {
    for (const [enemyId, remaining] of p.burnTargets) {
      const enemy = state.enemies.find(e => e.id === enemyId);
      if (!enemy || enemy.dead) { p.burnTargets.delete(enemyId); continue; }
      enemy.hp -= 3 * dt;
      if (enemy.hp <= 0 && !enemy.dead) {
        enemy.dead = true; enemy.deathTimer = 1.0;
        state.roundKills++; state.totalKills++;
        state.score += Math.round(50 * getScoreMult(state));
        onEnemyKill(state, enemy);
      }
      const newRemaining = remaining - dt;
      if (newRemaining <= 0) p.burnTargets.delete(enemyId);
      else p.burnTargets.set(enemyId, newRemaining);
    }
  }

  // Sword trail: push sword tip position
  const tipX = p.pos.x + Math.sin(p.yaw) * 1.5 + Math.cos(p.yaw) * 0.6;
  const tipY = p.pos.y + 1.3;
  const tipZ = p.pos.z + Math.cos(p.yaw) * 1.5 - Math.sin(p.yaw) * 0.6;
  state.swordTrail.push({ x: tipX, y: tipY, z: tipZ });
  if (state.swordTrail.length > 12) state.swordTrail.shift();
}

// ---- Player attacks ----
export function updatePlayerAttacks(state: LotState, dt: number): void {
  if (state.phase !== "active") return;
  const p = state.player;

  if (state.mouseDown && p.attackTimer <= 0 && !p.blocking) {
    p.heavyCharging = true;
    p.heavyChargeTimer += dt;
    if (p.heavyChargeTimer >= getHeavyChargeTime(state)) {
      performHeavyAttack(state);
      p.heavyCharging = false;
      p.heavyChargeTimer = 0;
    }
  } else if (!state.mouseDown && p.heavyCharging) {
    if (p.attackTimer <= 0) performLightAttack(state);
    p.heavyCharging = false;
    p.heavyChargeTimer = 0;
  }
}

// ---- Player abilities ----
export function updateAbilities(state: LotState, dt: number): void {
  if (state.phase !== "active") return;
  const p = state.player;
  const keys = state.keys;

  p.whirlwindCd = Math.max(0, p.whirlwindCd - dt);
  p.dashStrikeCd = Math.max(0, p.dashStrikeCd - dt);
  p.reflectCd = Math.max(0, p.reflectCd - dt);

  // Whirlwind (E key) — spin attack hitting all nearby enemies
  if (keys.has("e") && p.whirlwindCd <= 0 && p.stamina >= LOT.WHIRLWIND_STAMINA && p.whirlwindActive <= 0) {
    p.whirlwindCd = LOT.WHIRLWIND_CD;
    p.whirlwindActive = LOT.WHIRLWIND_DURATION;
    p.stamina -= LOT.WHIRLWIND_STAMINA;
    LotAudio.play("heavySwing");
    addNotification(state, "Whirlwind!", "#88ccff");
  }
  if (p.whirlwindActive > 0) {
    p.whirlwindActive -= dt;
    const dmgMult = getDamageMult(state);
    // Damage all nearby enemies each tick
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (distXZ(p.pos, e.pos) < LOT.WHIRLWIND_RADIUS) {
        if (state.tick % 4 === 0) { // Damage every 4 ticks to avoid spam
          damageEnemy(state, e, Math.round(LOT.WHIRLWIND_DAMAGE * dmgMult * dt * 4), false);
        }
      }
    }
    // Visual: ring of particles
    if (state.tick % 2 === 0) {
      const angle = (state.tick * 0.3) % (Math.PI * 2);
      spawnParticles(state, {
        x: p.pos.x + Math.cos(angle) * LOT.WHIRLWIND_RADIUS * 0.7,
        y: p.pos.y + 0.5,
        z: p.pos.z + Math.sin(angle) * LOT.WHIRLWIND_RADIUS * 0.7,
      }, 3, "#88ccff", 2, 0.15);
    }
    state.screenShake = Math.max(state.screenShake, 0.1);
  }

  // Dash Strike (R key) — lunge forward dealing AOE damage
  if (keys.has("r") && p.dashStrikeCd <= 0 && p.stamina >= LOT.DASH_STRIKE_STAMINA) {
    p.dashStrikeCd = LOT.DASH_STRIKE_CD;
    p.stamina -= LOT.DASH_STRIKE_STAMINA;
    p.iframeTimer = 0.3;
    // Lunge forward
    const dir = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
    p.vel.x = dir.x * LOT.DASH_STRIKE_SPEED;
    p.vel.z = dir.z * LOT.DASH_STRIKE_SPEED;
    // Hit everything along path
    const dmgMult = getDamageMult(state);
    for (const e of state.enemies) {
      if (e.dead) continue;
      // Check if enemy is near the line between start and target
      const toE = { x: e.pos.x - p.pos.x, z: e.pos.z - p.pos.z };
      const proj = (toE.x * dir.x + toE.z * dir.z);
      if (proj < 0 || proj > LOT.DASH_STRIKE_DISTANCE) continue;
      const perpX = toE.x - dir.x * proj;
      const perpZ = toE.z - dir.z * proj;
      const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
      if (perpDist < LOT.DASH_STRIKE_RADIUS) {
        damageEnemy(state, e, Math.round(LOT.DASH_STRIKE_DAMAGE * dmgMult), true);
        const kb = normalize3({ x: e.pos.x - p.pos.x, y: 3, z: e.pos.z - p.pos.z });
        e.vel.x += kb.x * 10;
        e.vel.y += kb.y * 6;
        e.vel.z += kb.z * 10;
      }
    }
    // Trail particles
    for (let t = 0; t < LOT.DASH_STRIKE_DISTANCE; t += 1.5) {
      spawnParticles(state, {
        x: p.pos.x + dir.x * t,
        y: p.pos.y + 0.5,
        z: p.pos.z + dir.z * t,
      }, 4, "#ff8844", 3, 0.2);
    }
    state.screenShake = 0.4;
    state.hitStopTimer = 0.08;
    LotAudio.play("heavyHit");
    addNotification(state, "Dash Strike!", "#ff8844");
  }

  // Reflect (F key) — brief window that reflects projectiles and damages melee attackers
  if (keys.has("f") && p.reflectCd <= 0 && p.stamina >= LOT.REFLECT_STAMINA && p.reflectActive <= 0) {
    p.reflectCd = LOT.REFLECT_CD;
    p.reflectActive = LOT.REFLECT_DURATION;
    p.stamina -= LOT.REFLECT_STAMINA;
    LotAudio.play("block");
    addNotification(state, "Reflect!", "#ffdd44");
  }
  if (p.reflectActive > 0) {
    p.reflectActive -= dt;
    p.iframeTimer = Math.max(p.iframeTimer, 0.05); // Partial protection
    // Reflect projectiles
    for (const proj of state.projectiles) {
      if (!proj.fromEnemy) continue;
      if (dist3(proj.pos, p.pos) < 3) {
        proj.vel.x *= -1;
        proj.vel.z *= -1;
        proj.fromEnemy = false;
        proj.damage *= 2;
        proj.color = "#ffdd44";
        spawnParticles(state, proj.pos, 6, "#ffdd44", 4, 0.15);
        LotAudio.play("block");
      }
    }
  }
}

function performLightAttack(state: LotState): void {
  const p = state.player;
  p.attackTimer = LOT.ATTACK_COOLDOWN;
  const dir = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
  const dmgMult = getDamageMult(state);

  let hit = false;
  for (const e of state.enemies) {
    if (e.dead) continue;
    if (distXZ(p.pos, e.pos) > LOT.ATTACK_RANGE) continue;
    const toE = { x: e.pos.x - p.pos.x, z: e.pos.z - p.pos.z };
    if (dir.x * toE.x + dir.z * toE.z < 0) continue;

    const dmg = Math.round(LOT.ATTACK_DAMAGE * dmgMult);
    damageEnemy(state, e, dmg, false);
    hit = true;
    if (hasBuff(state, "elemental_sword")) { p.burnTargets.set(e.id, 3); e.burning = 3; }
  }
  if (hit) {
    p.comboCount++;
    p.comboTimer = 2.0;
    state.screenShake = Math.max(state.screenShake, 0.15);
    state.hitStopTimer = 0.05;
    LotAudio.play("hit");
    if (hasBuff(state, "vampiric_edge")) {
      const heal = Math.round(LOT.ATTACK_DAMAGE * dmgMult * 0.05);
      p.hp = Math.min(p.maxHp, p.hp + heal);
    }
  }
  LotAudio.play("swing");
  state.attackArcTimer = 0.2;
  state.attackArcHeavy = false;
  spawnAttackParticles(state, "light");
}

function performHeavyAttack(state: LotState): void {
  const p = state.player;
  p.attackTimer = LOT.HEAVY_COOLDOWN;
  const dir = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
  const dmgMult = getDamageMult(state);

  let hit = false;
  for (const e of state.enemies) {
    if (e.dead) continue;
    if (distXZ(p.pos, e.pos) > LOT.HEAVY_RANGE) continue;
    const toE = { x: e.pos.x - p.pos.x, z: e.pos.z - p.pos.z };
    if (dir.x * toE.x + dir.z * toE.z < 0) continue;

    const dmg = Math.round(LOT.HEAVY_DAMAGE * dmgMult);
    damageEnemy(state, e, dmg, true);
    hit = true;
    if (hasBuff(state, "elemental_sword")) { p.burnTargets.set(e.id, 3); e.burning = 3; }

    // Knockback with trail particles
    const kb = normalize3({ x: toE.x, y: 2, z: toE.z });
    e.vel.x += kb.x * 12;
    e.vel.y += kb.y * 8;
    e.vel.z += kb.z * 12;
    spawnParticles(state, e.pos, 8, "#ffcc44", 5, 0.18);
  }
  if (hit) {
    p.comboCount += 2;
    p.comboTimer = 2.5;
    state.screenShake = Math.max(state.screenShake, 0.45);
    state.hitStopTimer = 0.12;
    state.screenFlash = 0.3;
    state.screenFlashColor = "#ffffff";
    LotAudio.play("heavyHit");
    if (hasBuff(state, "vampiric_edge")) {
      const heal = Math.round(LOT.HEAVY_DAMAGE * dmgMult * 0.05);
      p.hp = Math.min(p.maxHp, p.hp + heal);
    }
  }
  LotAudio.play("heavySwing");
  state.attackArcTimer = 0.3;
  state.attackArcHeavy = true;
  spawnAttackParticles(state, "heavy");
  // Ground impact decal
  const impactPos: Vec3 = {
    x: p.pos.x + Math.sin(p.yaw) * 2,
    y: 0,
    z: p.pos.z + Math.cos(p.yaw) * 2,
  };
  state.decals.push({ pos: impactPos, radius: 1.5, color: "#554422", life: 8.0 });
}

function damageEnemy(state: LotState, e: LotEnemy, dmg: number, crit: boolean): void {
  dmg = Math.round(dmg * getEnemyDamageTakenMult(state));
  // Champion parry check
  if (e.behavior === "parry") {
    dealDamageToPlayer(state, e.damage * 2, e.pos);
    e.behavior = "chase";
    addNotification(state, "PARRIED!", "#ff4444");
    LotAudio.play("block");
    return;
  }

  e.hp -= dmg;
  e.hitFlash = 0.2;
  e.behavior = "stunned";
  e.behaviorTimer = crit ? 0.4 : 0.15;

  state.damageNumbers.push({
    pos: { x: e.pos.x, y: e.pos.y + 3, z: e.pos.z },
    value: dmg, timer: 1.0, crit,
  });

  // Per-type directional hit particles
  const hitDir = normalize3({ x: e.pos.x - state.player.pos.x, y: 0.5, z: e.pos.z - state.player.pos.z });
  const hitPos: Vec3 = { x: e.pos.x, y: e.pos.y + 1.2, z: e.pos.z };
  const hitColor = e.type === "wraith" ? "#aa66ff" : e.type === "golem" ? "#aa8866"
    : e.type === "boss" ? "#ff4488" : e.type === "necromancer" ? "#66ff66"
    : e.type === "skeleton_archer" ? "#ddbb88" : "#ff6644";
  const hitCount = crit ? 18 : 8;
  for (let i = 0; i < hitCount; i++) {
    state.particles.push({
      pos: { x: hitPos.x + rngRange(-0.3, 0.3), y: hitPos.y + rngRange(-0.2, 0.4), z: hitPos.z + rngRange(-0.3, 0.3) },
      vel: { x: hitDir.x * rngRange(2, 6) + rngRange(-1, 1), y: rngRange(1, 4), z: hitDir.z * rngRange(2, 6) + rngRange(-1, 1) },
      life: rngRange(0.2, 0.6), maxLife: 0.6, color: hitColor, size: crit ? rngRange(0.15, 0.3) : rngRange(0.08, 0.18),
    });
  }
  // Impact decal on ground
  if (crit) {
    state.decals.push({ pos: { x: e.pos.x, y: 0, z: e.pos.z }, radius: 0.8, color: hitColor, life: 6.0 });
  }

  if (e.hp <= 0) {
    e.dead = true;
    e.deathTimer = 1.0;
    state.roundKills++;
    state.totalKills++;
    const scoreBase = crit ? 150 : 100;
    state.score += Math.round(scoreBase * getScoreMult(state));
    onEnemyKill(state, e);
    spawnDeathParticles(state, e.pos, e.type, e.elite);
    LotAudio.play("kill");
  }
}

function onEnemyKill(state: LotState, e: LotEnemy): void {
  const p = state.player;
  // Elite guaranteed fortune drop + bonus score
  if (e.elite) {
    state.fortune = Math.min(LOT.MAX_FORTUNE, state.fortune + 1);
    state.score += Math.round(200 * getScoreMult(state));
    addNotification(state, "Elite slain! +1 Fortune", "#ffd700");
  }
  // Fortune drop
  if (rng() < getFortuneDropChance(state)) {
    state.fortune = Math.min(LOT.MAX_FORTUNE, state.fortune + 1);
    addNotification(state, "+1 Fortune!", "#ffd700");
  }
  // Life drain upgrade
  if (getUpgrade(state, "life_drain") > 0) {
    p.hp = Math.min(p.maxHp, p.hp + 3);
  }
  // Kill streak
  p.killStreak++;
  p.killStreakTimer = 3.0;
  for (let i = KILL_STREAKS.length - 1; i >= 0; i--) {
    if (p.killStreak >= KILL_STREAKS[i].count) {
      state.killStreakLabel = KILL_STREAKS[i].label;
      state.killStreakTimer = 2.0;
      state.killStreakColor = KILL_STREAKS[i].color;
      break;
    }
  }
  // Boss phase transitions
  if (e.type === "boss" && !e.dead) {
    checkBossPhaseTransition(state, e);
  }
}

function checkBossPhaseTransition(state: LotState, boss: LotEnemy): void {
  const hpPct = boss.hp / boss.maxHp;
  if (boss.bossPhase === 1 && hpPct <= 0.5) {
    boss.bossPhase = 2;
    boss.speed *= 1.3;
    addNotification(state, "THE BOSS ENRAGES!", "#ff4444");
    state.screenShake = 0.5;
    // Spawn adds
    for (let i = 0; i < 2; i++) {
      state.spawnQueue.push({ type: "skeleton", delay: 0.5 + i * 0.5 });
    }
  }
  if (boss.bossPhase === 2 && hpPct <= 0.25) {
    boss.bossPhase = 3;
    boss.damage *= 1.3;
    addNotification(state, "FINAL PHASE — BERSERK!", "#ff0000");
    state.screenShake = 0.8;
  }
}

// ---- Enemy AI ----
export function updateEnemies(state: LotState, dt: number): void {
  if (state.phase !== "active") return;
  const p = state.player;

  // Assign flank indices for skeletons
  const skeletons = state.enemies.filter(e => e.type === "skeleton" && !e.dead);
  for (let i = 0; i < skeletons.length; i++) skeletons[i].flankIndex = i;

  for (const e of state.enemies) {
    if (e.dead) { e.deathTimer -= dt; continue; }

    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.attackTimer = Math.max(0, e.attackTimer - dt);
    e.specialTimer = Math.max(0, e.specialTimer - dt);

    // Spawn emergence: enemies are invulnerable and rising during spawn
    if (e.spawnTimer > 0) {
      e.spawnTimer -= dt;
      continue; // Skip AI while spawning
    }

    // Walk cycle animation
    if (e.behavior === "chase" || e.behavior === "flank") {
      e.walkCycle += dt * e.speed * 1.5;
    }
    // Burn visual + flame particles
    e.burning = Math.max(0, e.burning - dt);
    if (e.burning > 0 && state.tick % 4 === 0) {
      state.particles.push({
        pos: { x: e.pos.x + rngRange(-0.3, 0.3), y: e.pos.y + rngRange(0.5, 1.5), z: e.pos.z + rngRange(-0.3, 0.3) },
        vel: { x: rngRange(-0.5, 0.5), y: rngRange(2, 4), z: rngRange(-0.5, 0.5) },
        life: rngRange(0.2, 0.5), maxLife: 0.5, color: rng() > 0.5 ? "#ff6622" : "#ffaa22", size: rngRange(0.08, 0.15),
      });
    }
    // Stun visual
    if (e.behavior === "stunned") {
      e.stunVisual = e.behaviorTimer;
      e.behaviorTimer -= dt;
      if (e.behaviorTimer <= 0) e.behavior = "chase";
      applyEnemyPhysics(e, dt, state);
      continue;
    }
    e.stunVisual = Math.max(0, e.stunVisual - dt);

    const d = distXZ(p.pos, e.pos);
    const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
    e.yaw = Math.atan2(dx, dz);

    switch (e.type) {
      case "skeleton": updateSkeleton(state, e, d, dt, skeletons.length); break;
      case "skeleton_archer": updateSkeletonArcher(state, e, d, dt); break;
      case "wraith": updateWraith(state, e, d, dt); break;
      case "golem": updateGolem(state, e, d, dt); break;
      case "boss": updateBoss(state, e, d, dt); break;
      case "champion": updateChampion(state, e, d, dt); break;
      case "necromancer": updateNecromancer(state, e, d, dt); break;
    }

    applyEnemyPhysics(e, dt, state);

    // Arena bounds
    const eDist = Math.sqrt(e.pos.x * e.pos.x + e.pos.z * e.pos.z);
    const effectiveRadius = state.currentLot === "cursed_arena" ? state.curseRadius : LOT.ARENA_RADIUS;
    if (eDist > effectiveRadius - 1) {
      const scale = (effectiveRadius - 1) / eDist;
      e.pos.x *= scale; e.pos.z *= scale;
    }
  }

  state.enemies = state.enemies.filter(e => !e.dead || e.deathTimer > 0);
}

function applyEnemyPhysics(e: LotEnemy, dt: number, state: LotState): void {
  e.vel.y += LOT.GRAVITY * dt;
  e.pos.x += e.vel.x * dt;
  e.pos.y += e.vel.y * dt;
  e.pos.z += e.vel.z * dt;
  if (e.pos.y <= 0) { e.pos.y = 0; e.vel.y = 0; }
  const drag = state.mutation === "frozen" ? LOT.FROZEN_DRAG : 0.92;
  e.vel.x *= drag;
  e.vel.z *= drag;
}

function updateSkeleton(state: LotState, e: LotEnemy, d: number, dt: number, totalSkeletons: number): void {
  // Flanking AI: if 3+ skeletons, spread around player
  if (totalSkeletons >= 3 && d > e.attackRange * 1.5) {
    e.behavior = "flank";
    const flankOffset = ((e.flankIndex / totalSkeletons) - 0.5) * Math.PI;
    const targetAngle = state.player.yaw + Math.PI + flankOffset;
    const targetDist = e.attackRange * 1.2;
    const targetX = state.player.pos.x + Math.sin(targetAngle) * targetDist;
    const targetZ = state.player.pos.z + Math.cos(targetAngle) * targetDist;
    moveToward(e, { x: targetX, y: 0, z: targetZ }, e.speed * 1.1, dt);
  } else if (d > e.attackRange) {
    e.behavior = "chase";
    moveToward(e, state.player.pos, e.speed, dt);
  } else if (e.attackTimer <= 0) {
    e.behavior = "attack";
    attackPlayer(state, e);
    e.attackTimer = e.attackCd;
  } else {
    e.behavior = "idle";
  }
}

function updateSkeletonArcher(state: LotState, e: LotEnemy, d: number, dt: number): void {
  // Stay at range, fire projectiles
  if (d < LOT.ARCHER_RANGE * 0.5) {
    // Retreat
    const away = normalize3({ x: e.pos.x - state.player.pos.x, y: 0, z: e.pos.z - state.player.pos.z });
    e.pos.x += away.x * e.speed * dt;
    e.pos.z += away.z * e.speed * dt;
    e.behavior = "chase";
  } else if (d > LOT.ARCHER_RANGE) {
    moveToward(e, state.player.pos, e.speed, dt);
    e.behavior = "chase";
  } else if (e.attackTimer <= 0) {
    // Fire arrow projectile
    e.behavior = "ranged";
    e.attackTimer = LOT.ARCHER_FIRE_CD;
    const dir = normalize3({ x: state.player.pos.x - e.pos.x, y: 0.5, z: state.player.pos.z - e.pos.z });
    state.projectiles.push({
      id: genLotId(),
      pos: { x: e.pos.x, y: e.pos.y + 1.5, z: e.pos.z },
      vel: { x: dir.x * LOT.ARCHER_PROJECTILE_SPEED, y: dir.y * LOT.ARCHER_PROJECTILE_SPEED, z: dir.z * LOT.ARCHER_PROJECTILE_SPEED },
      damage: e.damage,
      radius: 0.3,
      life: 3.0,
      fromEnemy: true,
      color: "#ff8844",
    });
    LotAudio.play("arrowFire");
  }
}

function updateWraith(state: LotState, e: LotEnemy, d: number, dt: number): void {
  e.pos.y = 1.5 + Math.sin(state.gameTime * 2 + e.id) * 0.5;

  if (e.behavior === "phase_dash") {
    e.behaviorTimer -= dt;
    // During phase dash, move fast in stored direction
    if (e.behaviorTimer <= 0) e.behavior = "chase";
    return;
  }

  if (e.specialTimer <= 0 && d > 8) {
    // Teleport near player, then phase dash through
    const angle = rng() * Math.PI * 2;
    e.pos.x = state.player.pos.x + Math.cos(angle) * 5;
    e.pos.z = state.player.pos.z + Math.sin(angle) * 5;
    e.specialTimer = LOT.WRAITH_TELEPORT_CD;
    spawnParticles(state, e.pos, 12, "#8844ff", 5, 0.25);

    // Phase dash through player
    const dir = normalize3({ x: state.player.pos.x - e.pos.x, y: 0, z: state.player.pos.z - e.pos.z });
    e.vel.x = dir.x * 20;
    e.vel.z = dir.z * 20;
    e.behavior = "phase_dash";
    e.behaviorTimer = 0.3;

    // Damage if close during dash
    if (d < 3) {
      dealDamageToPlayer(state, e.damage, e.pos);
    }
  } else if (d > e.attackRange) {
    moveToward(e, state.player.pos, e.speed, dt);
    e.behavior = "chase";
  } else if (e.attackTimer <= 0) {
    attackPlayer(state, e);
    e.attackTimer = e.attackCd;
    e.behavior = "attack";
  }
}

function updateGolem(state: LotState, e: LotEnemy, d: number, dt: number): void {
  if (e.specialTimer <= 0 && d < LOT.GOLEM_SLAM_RADIUS) {
    e.behavior = "slam";
    e.specialTimer = 8;
    // Ground telegraph before shockwave
    state.telegraphs.push({
      pos: { ...e.pos }, radius: LOT.GOLEM_SLAM_RADIUS,
      timer: 0.4, maxTimer: 0.4, color: "#ff8844",
    });
    // Shockwave (delayed slightly by telegraph)
    state.shockwaves.push({
      pos: { ...e.pos }, radius: 0, maxRadius: LOT.GOLEM_SLAM_RADIUS,
      speed: 15, damage: LOT.GOLEM_DAMAGE * 1.5, hit: false,
    });
    state.screenShake = Math.max(state.screenShake, 0.5);
    spawnSlamParticles(state, e.pos, LOT.GOLEM_SLAM_RADIUS);
    LotAudio.play("slam");
  } else if (d > e.attackRange) {
    e.behavior = "chase";
    moveToward(e, state.player.pos, e.speed, dt);
  } else if (e.attackTimer <= 0) {
    e.behavior = "attack";
    attackPlayer(state, e);
    e.attackTimer = e.attackCd;
  }
}

function updateBoss(state: LotState, e: LotEnemy, d: number, dt: number): void {
  // Phase transitions
  const hpPct = e.hp / e.maxHp;
  if (e.bossPhase === 1 && hpPct <= 0.5) checkBossPhaseTransition(state, e);
  if (e.bossPhase === 2 && hpPct <= 0.25) checkBossPhaseTransition(state, e);

  if (e.behavior === "charge") {
    e.behaviorTimer -= dt;
    if (e.behaviorTimer <= 0) e.behavior = "chase";
    if (distXZ(state.player.pos, e.pos) < 3) {
      dealDamageToPlayer(state, LOT.BOSS_CHARGE_DAMAGE, e.pos);
      state.screenShake = 0.6;
      e.behavior = "chase";
    }
    return;
  }
  if (e.behavior === "slam") {
    e.behaviorTimer -= dt;
    if (e.behaviorTimer <= 0) e.behavior = "chase";
    return;
  }

  if (e.specialTimer <= 0 && d > 10) {
    e.behavior = "charge";
    e.specialTimer = LOT.BOSS_CHARGE_CD;
    const dir = normalize3({ x: state.player.pos.x - e.pos.x, y: 0, z: state.player.pos.z - e.pos.z });
    e.vel.x = dir.x * LOT.BOSS_CHARGE_SPEED;
    e.vel.z = dir.z * LOT.BOSS_CHARGE_SPEED;
    e.behaviorTimer = 0.8;
    LotAudio.play("bossCharge");
  } else if (e.specialTimer <= 2 && d < LOT.BOSS_SLAM_RADIUS && (e.behavior as string) !== "slam") {
    e.behavior = "slam";
    e.behaviorTimer = 0.5;
    // Telegraph circle
    state.telegraphs.push({
      pos: { ...e.pos }, radius: LOT.BOSS_SLAM_RADIUS,
      timer: 0.5, maxTimer: 0.5, color: "#ff2244",
    });
    state.shockwaves.push({
      pos: { ...e.pos }, radius: 0, maxRadius: LOT.BOSS_SLAM_RADIUS,
      speed: 18, damage: LOT.BOSS_SLAM_DAMAGE, hit: false,
    });
    state.screenShake = 1.0;
    state.screenFlash = 0.4;
    state.screenFlashColor = "#ff4400";
    spawnSlamParticles(state, e.pos, LOT.BOSS_SLAM_RADIUS);
    LotAudio.play("slam");

    // Phase 2+: also fire projectiles
    if (e.bossPhase >= 2) {
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        state.projectiles.push({
          id: genLotId(),
          pos: { x: e.pos.x, y: 2, z: e.pos.z },
          vel: { x: Math.cos(angle) * 12, y: 3, z: Math.sin(angle) * 12 },
          damage: e.damage * 0.5, radius: 0.5, life: 2.0,
          fromEnemy: true, color: "#ff2200",
        });
      }
    }
  } else if (d > e.attackRange) {
    e.behavior = "chase";
    moveToward(e, state.player.pos, e.speed, dt);
  } else if (e.attackTimer <= 0) {
    e.behavior = "attack";
    attackPlayer(state, e);
    e.attackTimer = e.attackCd;
  }
}

function updateChampion(state: LotState, e: LotEnemy, d: number, dt: number): void {
  // Parry mechanic
  if (e.behavior === "parry") {
    e.behaviorTimer -= dt;
    if (e.behaviorTimer <= 0) {
      e.behavior = "chase";
      e.behaviorTimer = 0.3; // brief vulnerability
    }
    return;
  }

  // Occasionally enter parry stance (visible telegraph)
  if (e.specialTimer <= 0 && d < e.attackRange * 2 && rng() < LOT.CHAMPION_PARRY_CHANCE) {
    e.behavior = "parry";
    e.behaviorTimer = LOT.CHAMPION_PARRY_DURATION;
    e.specialTimer = 5;
    return;
  }

  if (d > e.attackRange * 1.5) {
    e.behavior = "chase";
    moveToward(e, state.player.pos, e.speed, dt);
  } else if (d <= e.attackRange && e.attackTimer <= 0) {
    e.behavior = "attack";
    attackPlayer(state, e);
    e.attackTimer = e.attackCd;
    // Dodge back
    if (rng() < 0.4) {
      const dir = normalize3({ x: e.pos.x - state.player.pos.x, y: 0, z: e.pos.z - state.player.pos.z });
      e.vel.x += dir.x * 15;
      e.vel.z += dir.z * 15;
    }
  } else {
    // Strafe
    const angle = Math.atan2(state.player.pos.x - e.pos.x, state.player.pos.z - e.pos.z) + Math.PI / 2;
    e.pos.x += Math.sin(angle) * e.speed * 0.5 * dt;
    e.pos.z += Math.cos(angle) * e.speed * 0.5 * dt;
    e.behavior = "chase";
  }
}

function updateNecromancer(state: LotState, e: LotEnemy, d: number, dt: number): void {
  // Stay at range, resurrect dead enemies
  if (d < LOT.NECRO_RANGE * 0.4) {
    const away = normalize3({ x: e.pos.x - state.player.pos.x, y: 0, z: e.pos.z - state.player.pos.z });
    e.pos.x += away.x * e.speed * dt;
    e.pos.z += away.z * e.speed * dt;
    e.behavior = "chase";
  } else if (e.specialTimer <= 0) {
    // Try to resurrect a dead enemy
    const deadEnemy = state.enemies.find(de => de.dead && de.deathTimer > 0 && de.type === "skeleton"
      && distXZ(e.pos, de.pos) < LOT.NECRO_RESURRECT_RANGE);
    if (deadEnemy) {
      e.behavior = "resurrect";
      e.specialTimer = LOT.NECRO_RESURRECT_CD;
      // Resurrect with 50% HP
      deadEnemy.dead = false;
      deadEnemy.hp = deadEnemy.maxHp * 0.5;
      deadEnemy.deathTimer = 0;
      deadEnemy.behavior = "chase";
      spawnParticles(state, deadEnemy.pos, 15, "#44ff44", 4, 0.2);
      addNotification(state, "Enemy resurrected!", "#44ff44");
    } else {
      e.behavior = "chase";
      if (d > LOT.NECRO_RANGE) moveToward(e, state.player.pos, e.speed, dt);
    }
  } else if (d > LOT.NECRO_RANGE) {
    moveToward(e, state.player.pos, e.speed, dt);
    e.behavior = "chase";
  }
}

function moveToward(e: LotEnemy, target: Vec3, speed: number, dt: number): void {
  const dx = target.x - e.pos.x, dz = target.z - e.pos.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len > 0.5) {
    e.pos.x += (dx / len) * speed * dt;
    e.pos.z += (dz / len) * speed * dt;
  }
}

function attackPlayer(state: LotState, e: LotEnemy): void {
  dealDamageToPlayer(state, e.damage, e.pos);
  state.screenShake = Math.max(state.screenShake, 0.2);
}

function dealDamageToPlayer(state: LotState, rawDmg: number, sourcePos: Vec3): void {
  const p = state.player;
  if (p.iframeTimer > 0) return;

  let dmg = rawDmg;
  if (hasBuff(state, "blood_oath")) dmg *= 1.15;
  if (p.blocking) {
    dmg *= (1 - LOT.SHIELD_BLOCK_REDUCTION);
    p.stamina -= LOT.SHIELD_STAMINA_COST;
    LotAudio.play("block");
    // Shield spark particles
    spawnParticles(state, { x: p.pos.x - Math.sin(p.yaw) * 0.5, y: p.pos.y + 1.2, z: p.pos.z - Math.cos(p.yaw) * 0.5 }, 8, "#aaccff", 5, 0.12);
  } else {
    LotAudio.play("playerHit");
    // Blood particles on hit
    spawnParticles(state, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 6, "#ff2222", 3, 0.15);
  }

  p.hp -= dmg;
  p.hitFlash = 0.3;
  state.flawless = false;
  state.screenShake = Math.max(state.screenShake, 0.3);
  p.killStreak = 0; // reset kill streak on hit

  // Directional damage indicator
  p.lastHitDir = Math.atan2(sourcePos.x - p.pos.x, sourcePos.z - p.pos.z) - p.yaw;
  p.lastHitTimer = 0.8;

  state.damageNumbers.push({
    pos: { x: p.pos.x, y: p.pos.y + 2, z: p.pos.z },
    value: Math.round(dmg), timer: 1.0, crit: false,
  });

  // Fate's Shield: survive lethal hit
  if (p.hp <= 0 && getUpgrade(state, "fates_shield") > 0 && !p.fateShieldUsed) {
    p.hp = 1;
    p.fateShieldUsed = true;
    p.iframeTimer = 1.5;
    addNotification(state, "Fate's Shield saves you!", "#ffdd44");
    state.screenShake = 0.8;
    LotAudio.play("fateShield");
    return;
  }

  if (p.hp <= 0) {
    p.hp = 0;
    state.phase = "game_over";
    state.bestRound = Math.max(state.bestRound, state.round);
    addNotification(state, "FATE HAS CLAIMED YOU", "#ff4444");
    LotAudio.play("death");
    LotAudio.stopMusic();
  }
}

// ---- Spawn queue ----
export function updateSpawnQueue(state: LotState, dt: number): void {
  if (state.phase !== "active") return;
  const d = DIFFICULTY_MULT[state.difficulty];
  const round = state.round;

  for (const item of state.spawnQueue) item.delay -= dt;

  const ready = state.spawnQueue.filter(i => i.delay <= 0);
  state.spawnQueue = state.spawnQueue.filter(i => i.delay > 0);

  for (const item of ready) {
    const angle = rng() * Math.PI * 2;
    const dist = rngRange(LOT.ARENA_RADIUS * 0.5, LOT.ARENA_RADIUS - 3);
    const pos: Vec3 = { x: Math.cos(angle) * dist, y: 0, z: Math.sin(angle) * dist };

    const hpScale = 1 + round * LOT.ENEMY_HP_SCALE;
    const dmgScale = 1 + round * LOT.ENEMY_DAMAGE_SCALE;
    const enemyMult = state.mutation === "blood_moon" ? LOT.BLOOD_MOON_ENEMY_MULT : 1;

    let hp: number, dmg: number, spd: number;
    switch (item.type) {
      case "skeleton":
        hp = LOT.SKELETON_HP * hpScale * d.hp; dmg = LOT.SKELETON_DAMAGE * dmgScale * d.dmg * enemyMult; spd = LOT.SKELETON_SPEED; break;
      case "skeleton_archer":
        hp = LOT.ARCHER_HP * hpScale * d.hp; dmg = LOT.ARCHER_DAMAGE * dmgScale * d.dmg * enemyMult; spd = LOT.ARCHER_SPEED; break;
      case "wraith":
        hp = LOT.WRAITH_HP * hpScale * d.hp; dmg = LOT.WRAITH_DAMAGE * dmgScale * d.dmg * enemyMult; spd = LOT.WRAITH_SPEED; break;
      case "golem":
        hp = LOT.GOLEM_HP * hpScale * d.hp; dmg = LOT.GOLEM_DAMAGE * dmgScale * d.dmg * enemyMult; spd = LOT.GOLEM_SPEED; break;
      case "necromancer":
        hp = LOT.NECRO_HP * hpScale * d.hp; dmg = LOT.NECRO_DAMAGE * dmgScale * d.dmg * enemyMult; spd = LOT.NECRO_SPEED; break;
      default:
        hp = LOT.SKELETON_HP * hpScale * d.hp; dmg = LOT.SKELETON_DAMAGE * dmgScale * d.dmg * enemyMult; spd = LOT.SKELETON_SPEED;
    }

    const enemy = createEnemy(item.type, pos, hp, dmg, spd);
    if (state.mutation === "blood_moon") enemy.speed *= LOT.BLOOD_MOON_ENEMY_MULT;
    // Elite variant chance (not bosses/champions)
    if (item.type !== "boss" && item.type !== "champion" && rng() < LOT.ELITE_CHANCE + state.round * 0.01) {
      enemy.elite = true;
      enemy.hp *= LOT.ELITE_HP_MULT;
      enemy.maxHp *= LOT.ELITE_HP_MULT;
      enemy.damage *= LOT.ELITE_DAMAGE_MULT;
    }
    state.enemies.push(enemy);
    spawnParticles(state, pos, enemy.elite ? 15 : 10, enemy.elite ? "#ffd700" : "#ff2222", 4, 0.2);
  }
}

// ---- Projectiles ----
export function updateProjectiles(state: LotState, dt: number): void {
  for (const proj of state.projectiles) {
    proj.vel.y += LOT.GRAVITY * 0.3 * dt;
    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;
    proj.pos.z += proj.vel.z * dt;
    proj.life -= dt;

    // Hit player?
    if (proj.fromEnemy && dist3(proj.pos, state.player.pos) < proj.radius + 0.8) {
      dealDamageToPlayer(state, proj.damage, proj.pos);
      proj.life = 0;
      spawnParticles(state, proj.pos, 6, proj.color, 3, 0.15);
    }
    // Reflected projectiles hit enemies
    if (!proj.fromEnemy) {
      for (const e of state.enemies) {
        if (e.dead) continue;
        if (dist3(proj.pos, e.pos) < proj.radius + 1.0) {
          damageEnemy(state, e, proj.damage, true);
          proj.life = 0;
          spawnParticles(state, proj.pos, 8, proj.color, 4, 0.2);
          break;
        }
      }
    }

    // Hit ground
    if (proj.pos.y <= 0) {
      proj.life = 0;
      spawnParticles(state, proj.pos, 4, proj.color, 2, 0.1);
    }
  }
  state.projectiles = state.projectiles.filter(p => p.life > 0);
}

// ---- Shockwaves ----
export function updateShockwaves(state: LotState, dt: number): void {
  for (const sw of state.shockwaves) {
    sw.radius += sw.speed * dt;
    // Jump over it to avoid damage
    if (!sw.hit && state.player.grounded) {
      const d = distXZ(state.player.pos, sw.pos);
      if (d < sw.radius + 1 && d > sw.radius - 2) {
        dealDamageToPlayer(state, sw.damage * (1 - d / sw.maxRadius), sw.pos);
        sw.hit = true;
      }
    }
  }
  state.shockwaves = state.shockwaves.filter(sw => sw.radius < sw.maxRadius);
}

// ---- Obstacles ----
export function updateObstacles(state: LotState, dt: number): void {
  if (state.phase !== "active") return;

  for (const obs of state.obstacles) {
    switch (obs.type) {
      case "spike_trap":
        obs.timer -= dt;
        if (obs.timer <= 0) { obs.active = !obs.active; obs.timer = LOT.SPIKE_TRAP_CD; }
        if (obs.active && distXZ(state.player.pos, obs.pos) < obs.radius) {
          if (state.player.iframeTimer <= 0) {
            dealDamageToPlayer(state, obs.damage, obs.pos);
            state.player.iframeTimer = 0.5;
          }
        }
        break;
      case "fire_pillar":
        if (distXZ(state.player.pos, obs.pos) < obs.radius) {
          if (state.player.iframeTimer <= 0) {
            dealDamageToPlayer(state, obs.damage * dt * 3, obs.pos);
          }
        }
        for (const e of state.enemies) {
          if (!e.dead && distXZ(e.pos, obs.pos) < obs.radius) {
            damageEnemy(state, e, obs.damage * dt * 2, false);
          }
        }
        break;
      case "pendulum": {
        obs.angle += obs.speed * dt;
        const swing = Math.sin(obs.angle) * 8;
        const px = obs.pos.x + swing;
        const pendPos: Vec3 = { x: px, y: obs.pos.y, z: obs.pos.z };
        if (dist3(state.player.pos, pendPos) < obs.radius + 0.8) {
          if (state.player.iframeTimer <= 0) {
            dealDamageToPlayer(state, obs.damage, pendPos);
            state.player.iframeTimer = 0.5;
            state.player.vel.x += Math.sign(swing) * 10;
          }
        }
        break;
      }
    }
  }
}

// ---- Runic explosions ----
export function updateRunicExplosions(state: LotState, dt: number): void {
  if (state.mutation !== "runic_overcharge" || state.phase !== "active") return;

  for (const rune of state.runicExplosions) {
    rune.timer -= dt;
    if (rune.timer <= LOT.RUNIC_WARN_TIME && !rune.warned) {
      rune.warned = true;
      // Warning glow handled by renderer
    }
    if (rune.timer <= 0) {
      // Explode!
      rune.timer = LOT.RUNIC_EXPLOSION_CD + rngRange(0, 2);
      rune.warned = false;
      const d = distXZ(state.player.pos, rune.pos);
      if (d < rune.radius) {
        dealDamageToPlayer(state, LOT.RUNIC_EXPLOSION_DAMAGE * (1 - d / rune.radius), rune.pos);
      }
      // Damage enemies too
      for (const e of state.enemies) {
        if (!e.dead && distXZ(e.pos, rune.pos) < rune.radius) {
          damageEnemy(state, e, LOT.RUNIC_EXPLOSION_DAMAGE * 0.5, false);
        }
      }
      spawnParticles(state, { ...rune.pos, y: 1 }, 20, "#aa44ff", 8, 0.3);
      state.screenShake = Math.max(state.screenShake, 0.3);
      LotAudio.play("runicBlast");
    }
  }
}

// ---- Treasures ----
export function updateTreasures(state: LotState, dt: number): void {
  if (state.phase !== "active" || state.currentLot !== "treasure_hunt") return;

  state.treasureTimeLeft -= dt;
  if (state.treasureTimeLeft <= 0) {
    dealDamageToPlayer(state, 999, state.player.pos);
    return;
  }

  for (const t of state.treasures) {
    if (t.collected) continue;
    t.glowTimer += dt * 3;

    if (distXZ(state.player.pos, t.pos) < 2.5) {
      t.collected = true;
      state.treasuresCollected++;
      state.score += Math.round(200 * getScoreMult(state));

      switch (t.type) {
        case "heal":
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + LOT.TREASURE_HEAL);
          addNotification(state, `+${LOT.TREASURE_HEAL} HP`, "#44ff44");
          break;
        case "fortune":
          state.fortune = Math.min(LOT.MAX_FORTUNE, state.fortune + 1);
          addNotification(state, "+1 Fortune!", "#ffd700");
          break;
        case "gold":
          state.score += Math.round(300 * getScoreMult(state));
          addNotification(state, "+300 Score", "#ffdd00");
          break;
      }
      spawnParticles(state, t.pos, 15, t.type === "fortune" ? "#ffd700" : t.type === "heal" ? "#44ff44" : "#ffdd00", 5, 0.25);
      LotAudio.play("treasure");
    }
  }
}

// ---- Cursed arena ----
export function updateCurseArena(state: LotState, dt: number): void {
  if (state.phase !== "active" || state.currentLot !== "cursed_arena") return;
  state.curseRadius = Math.max(LOT.CURSE_MIN_RADIUS, state.curseRadius - LOT.CURSE_SHRINK_RATE * dt);
  const pDist = Math.sqrt(state.player.pos.x ** 2 + state.player.pos.z ** 2);
  if (pDist > state.curseRadius) {
    dealDamageToPlayer(state, LOT.CURSE_DAMAGE_OUTSIDE * dt, state.player.pos);
  }
}

// ---- Obstacle gauntlet timer ----
export function updateObstacleTimer(state: LotState, dt: number): void {
  if (state.phase !== "active" || state.currentLot !== "obstacle_gauntlet") return;
  state.obstacleTimeLeft -= dt;
}

// ---- Completion checks ----
function checkLotCompletion(state: LotState, _dt: number): void {
  const lot = state.currentLot!;
  let complete = false;

  switch (lot) {
    case "monster_wave":
    case "cursed_arena":
      complete = state.enemies.filter(e => !e.dead).length === 0 && state.spawnQueue.length === 0;
      break;
    case "obstacle_gauntlet": {
      const enemiesCleared = state.enemies.filter(e => !e.dead).length === 0 && state.spawnQueue.length === 0;
      complete = state.obstacleTimeLeft <= 0 || enemiesCleared;
      break;
    }
    case "treasure_hunt":
      complete = state.treasures.length > 0 && state.treasures.every(t => t.collected);
      break;
    case "boss_fight":
    case "fate_duel":
      complete = state.enemies.filter(e => !e.dead).length === 0;
      break;
  }

  if (complete) {
    state.phase = "victory";
    state.phaseTimer = LOT.VICTORY_DELAY;
    const scoreGain = Math.round((500 + state.round * 100) * getScoreMult(state));
    state.score += scoreGain;
    addNotification(state, `Round ${state.round} Complete! +${scoreGain} Score`, "#44ff44");
    state.slowMotionScale = 0.3;
    state.slowMotionTimer = 1.5;
    LotAudio.play("victory");
    LotAudio.startMusic("victory");
  }
}

// ---- Pillar destruction ----
export function updatePillars(state: LotState, dt: number): void {
  for (const pil of state.pillars) {
    if (pil.destroyed) {
      pil.crumbleTimer = Math.max(0, pil.crumbleTimer - dt);
      continue;
    }
    // Boss charges destroy pillars
    for (const e of state.enemies) {
      if (e.dead) continue;
      if ((e.type === "boss" && e.behavior === "charge") || (e.type === "golem" && e.behavior === "slam")) {
        if (distXZ(e.pos, pil.pos) < pil.radius + 1.5) {
          pil.hp -= 50;
        }
      }
    }
    // Heavy attacks near pillars damage them
    const p = state.player;
    if (p.attackTimer > LOT.HEAVY_COOLDOWN * 0.8 && distXZ(p.pos, pil.pos) < LOT.HEAVY_RANGE + pil.radius) {
      pil.hp -= 20;
    }
    if (pil.hp <= 0) {
      pil.destroyed = true;
      pil.crumbleTimer = 2.0;
      // Damage nearby enemies
      for (const e of state.enemies) {
        if (e.dead) continue;
        const d = distXZ(e.pos, pil.pos);
        if (d < LOT.PILLAR_BREAK_DAMAGE_RADIUS) {
          damageEnemy(state, e, LOT.PILLAR_BREAK_DAMAGE * (1 - d / LOT.PILLAR_BREAK_DAMAGE_RADIUS), true);
        }
      }
      spawnParticles(state, { x: pil.pos.x, y: pil.height / 2, z: pil.pos.z }, 25, "#665577", 8, 0.4);
      state.screenShake = Math.max(state.screenShake, 0.4);
      LotAudio.play("slam");
      addNotification(state, "Pillar destroyed!", "#aa88cc");
      state.score += Math.round(50 * getScoreMult(state));
    }
  }
}

// ---- Effects ----
export function updateParticles(state: LotState, dt: number): void {
  for (const p of state.particles) {
    p.vel.y += LOT.GRAVITY * 0.3 * dt;
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
  if (state.particles.length > 500) state.particles.splice(0, state.particles.length - 500);

  for (const d of state.damageNumbers) { d.pos.y += 2 * dt; d.timer -= dt; }
  state.damageNumbers = state.damageNumbers.filter(d => d.timer > 0);

  state.screenShake *= Math.max(0, 1 - 5 * dt);
  if (state.screenShake < 0.01) state.screenShake = 0;

  // Screen flash decay
  state.screenFlash *= Math.max(0, 1 - 6 * dt);
  if (state.screenFlash < 0.01) state.screenFlash = 0;

  // Ground telegraphs
  for (const t of state.telegraphs) t.timer -= dt;
  state.telegraphs = state.telegraphs.filter(t => t.timer > 0);

  // Ground decals
  for (const d of state.decals) d.life -= dt;
  state.decals = state.decals.filter(d => d.life > 0);
  if (state.decals.length > 30) state.decals.splice(0, state.decals.length - 30);

  // Attack arc timer
  state.attackArcTimer = Math.max(0, state.attackArcTimer - dt);

  // Combat shrines
  for (const s of state.shrines) {
    if (s.collected) continue;
    s.timer -= dt;
    if (s.timer <= 0) { s.collected = true; continue; }
    if (distXZ(state.player.pos, s.pos) < 2.5) {
      s.collected = true;
      switch (s.type) {
        case "power": addNotification(state, "Power shrine! +30% damage for 15s", "#ff6644"); break;
        case "speed": addNotification(state, "Speed shrine! +30% speed for 15s", "#44ccff"); break;
        case "armor": addNotification(state, "Armor shrine! -30% damage taken for 15s", "#88aacc"); break;
      }
      spawnParticles(state, s.pos, 15, "#ffd700", 5, 0.25);
      LotAudio.play("treasure");
    }
  }

  if (state.hitStopTimer > 0) state.hitStopTimer -= dt;

  for (const n of state.notifications) n.timer -= dt;
  state.notifications = state.notifications.filter(n => n.timer > 0);

  // Kill streak timer
  if (state.killStreakTimer > 0) {
    state.killStreakTimer -= dt;
    if (state.killStreakTimer <= 0) { state.killStreakLabel = ""; }
  }

  // Ambient particles (embers / wisps depending on lot)
  if (state.phase === "active" && state.tick % 10 === 0) {
    const color = state.currentLot === "cursed_arena" ? "#00cccc"
      : state.currentLot === "treasure_hunt" ? "#ffd700"
      : state.mutation === "blood_moon" ? "#ff4422"
      : "#ff6633";
    const angle = rng() * Math.PI * 2;
    const dist = rng() * LOT.ARENA_RADIUS;
    state.particles.push({
      pos: { x: Math.cos(angle) * dist, y: rngRange(0.5, 6), z: Math.sin(angle) * dist },
      vel: { x: rngRange(-0.3, 0.3), y: rngRange(0.5, 1.5), z: rngRange(-0.3, 0.3) },
      life: rngRange(3, 8), maxLife: 8, color, size: rngRange(0.05, 0.12),
    });
  }
}

// ---- Particle spawners ----
function spawnParticles(state: LotState, pos: Vec3, count: number, color: string, speed: number, size: number): void {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      pos: { x: pos.x + rngRange(-0.5, 0.5), y: pos.y + rngRange(0, 1), z: pos.z + rngRange(-0.5, 0.5) },
      vel: { x: rngRange(-speed, speed), y: rngRange(2, speed * 2), z: rngRange(-speed, speed) },
      life: rngRange(0.3, 1.0), maxLife: 1.0, color, size: rngRange(size * 0.5, size * 1.5),
    });
  }
}

function spawnAttackParticles(state: LotState, type: "light" | "heavy"): void {
  const p = state.player;
  const fwd: Vec3 = { x: Math.sin(p.yaw) * 2, y: 1.5, z: Math.cos(p.yaw) * 2 };
  const hitPos: Vec3 = { x: p.pos.x + fwd.x, y: p.pos.y + fwd.y, z: p.pos.z + fwd.z };
  const color = type === "heavy" ? "#ffaa22" : "#ffffff";
  spawnParticles(state, hitPos, type === "heavy" ? 15 : 6, color, 4, 0.2);
}

function spawnDeathParticles(state: LotState, pos: Vec3, type: EnemyType, elite = false): void {
  const color = type === "wraith" ? "#8844ff" : type === "golem" ? "#886644"
    : type === "boss" ? "#ff22ff" : type === "necromancer" ? "#44ff44" : "#ff4444";
  const hitPos: Vec3 = { x: pos.x, y: pos.y + 1.5, z: pos.z };
  if (type === "boss" || type === "champion") {
    // Massive death explosion
    spawnParticles(state, hitPos, 80, color, 12, 0.4);
    spawnParticles(state, hitPos, 40, "#ffffff", 8, 0.25);
    // Ring burst
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      state.particles.push({
        pos: { ...hitPos },
        vel: { x: Math.cos(angle) * 15, y: rngRange(1, 4), z: Math.sin(angle) * 15 },
        life: 1.2, maxLife: 1.2, color, size: 0.5,
      });
    }
    // Boss death shockwave
    state.shockwaves.push({
      pos: { ...pos }, radius: 0, maxRadius: 15,
      speed: 25, damage: 0, hit: true, // visual only
    });
    state.screenShake = 1.2;
    state.screenFlash = 0.6;
    state.screenFlashColor = color;
    state.slowMotionScale = 0.15;
    state.slowMotionTimer = 2.0;
    LotAudio.play("slam");
    LotAudio.play("kill");
  } else {
    // Type-specific death effects
    spawnParticles(state, hitPos, 25, color, 6, 0.3);
    if (type === "skeleton" || type === "skeleton_archer") {
      // Bone fragments scatter
      for (let i = 0; i < 8; i++) {
        state.particles.push({
          pos: { ...hitPos }, vel: { x: rngRange(-5, 5), y: rngRange(3, 8), z: rngRange(-5, 5) },
          life: rngRange(0.5, 1.2), maxLife: 1.2, color: "#eeddcc", size: rngRange(0.12, 0.25),
        });
      }
    } else if (type === "wraith") {
      // Ethereal wisps spiral upward
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        state.particles.push({
          pos: { ...hitPos }, vel: { x: Math.cos(angle) * 3, y: rngRange(4, 8), z: Math.sin(angle) * 3 },
          life: rngRange(0.8, 1.5), maxLife: 1.5, color: "#bb88ff", size: rngRange(0.15, 0.3),
        });
      }
    } else if (type === "golem") {
      // Rubble chunks with ground impact
      for (let i = 0; i < 10; i++) {
        state.particles.push({
          pos: { x: hitPos.x, y: 0.5, z: hitPos.z }, vel: { x: rngRange(-4, 4), y: rngRange(2, 6), z: rngRange(-4, 4) },
          life: rngRange(0.6, 1.0), maxLife: 1.0, color: "#776655", size: rngRange(0.2, 0.4),
        });
      }
      state.decals.push({ pos: { x: hitPos.x, y: 0, z: hitPos.z }, radius: 2.0, color: "#443322", life: 10.0 });
      state.screenShake = Math.max(state.screenShake, 0.3);
    } else if (type === "necromancer") {
      // Green soul release
      for (let i = 0; i < 15; i++) {
        state.particles.push({
          pos: { ...hitPos }, vel: { x: rngRange(-2, 2), y: rngRange(5, 10), z: rngRange(-2, 2) },
          life: rngRange(1.0, 2.0), maxLife: 2.0, color: "#44ff44", size: rngRange(0.1, 0.2),
        });
      }
    }
    // Scorch decal for all deaths
    if (elite) {
      state.decals.push({ pos: { x: hitPos.x, y: 0, z: hitPos.z }, radius: 1.2, color: "#cc8800", life: 8.0 });
    }
  }
}

function spawnSlamParticles(state: LotState, pos: Vec3, radius: number): void {
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    state.particles.push({
      pos: { x: pos.x, y: 0.1, z: pos.z },
      vel: { x: Math.cos(angle) * radius * 0.8, y: rngRange(2, 5), z: Math.sin(angle) * radius * 0.8 },
      life: 0.8, maxLife: 0.8, color: "#ff8844", size: 0.3,
    });
  }
}

// ---- Notifications ----
export function addNotification(state: LotState, text: string, color: string): void {
  state.notifications.push({ text, color, timer: 3.5 });
  if (state.notifications.length > 6) state.notifications.shift();
}

// ---------------------------------------------------------------------------
// Procedural Audio using Web Audio API
// ---------------------------------------------------------------------------
export const LotAudio = (() => {
  let ctx: AudioContext | null = null;

  function getCtx(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noise(duration: number, gain: number, filterFreq?: number): void {
    const c = getCtx();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const source = c.createBufferSource();
    source.buffer = buffer;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    source.connect(g);
    if (filterFreq) {
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(filterFreq, c.currentTime);
      g.connect(f).connect(c.destination);
    } else {
      g.connect(c.destination);
    }
    source.start();
  }

  function tone(freq: number, duration: number, gain: number, type: OscillatorType = "sine"): void {
    const c = getCtx();
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(g).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  function play(sound: string): void {
    try {
      switch (sound) {
        case "swing":
          noise(0.08, 0.15, 1500);
          break;
        case "heavySwing":
          noise(0.12, 0.2, 800);
          tone(200, 0.1, 0.1, "sawtooth");
          break;
        case "hit":
          tone(80, 0.1, 0.2, "sine");
          noise(0.04, 0.25, 2000);
          break;
        case "heavyHit":
          tone(60, 0.15, 0.3, "sine");
          noise(0.06, 0.3, 1500);
          tone(120, 0.08, 0.15, "square");
          break;
        case "kill":
          tone(400, 0.15, 0.1, "triangle");
          tone(200, 0.2, 0.08, "sine");
          break;
        case "block":
          tone(800, 0.08, 0.15, "square");
          tone(850, 0.08, 0.12, "square");
          break;
        case "dodge":
          noise(0.1, 0.1, 3000);
          break;
        case "playerHit":
          tone(150, 0.2, 0.2, "sawtooth");
          noise(0.05, 0.15, 500);
          break;
        case "slam":
          tone(40, 0.3, 0.35, "sine");
          noise(0.15, 0.2, 300);
          break;
        case "bossCharge":
          tone(100, 0.4, 0.15, "sawtooth");
          break;
        case "arrowFire":
          noise(0.06, 0.12, 4000);
          break;
        case "treasure": {
          const c = getCtx();
          [523, 659, 784].forEach((f, i) => {
            const osc = c.createOscillator();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(f, c.currentTime + i * 0.05);
            const g = c.createGain();
            g.gain.setValueAtTime(0.12, c.currentTime + i * 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.05 + 0.15);
            osc.connect(g).connect(c.destination);
            osc.start(c.currentTime + i * 0.05);
            osc.stop(c.currentTime + i * 0.05 + 0.15);
          });
          break;
        }
        case "victory":
          [261, 329, 392, 523].forEach((f, i) => {
            tone(f, 0.8 - i * 0.1, 0.1, "triangle");
          });
          break;
        case "death":
          tone(200, 0.5, 0.2, "sawtooth");
          tone(100, 0.8, 0.15, "sine");
          break;
        case "fateShield":
          tone(880, 0.3, 0.15, "triangle");
          tone(1100, 0.2, 0.1, "triangle");
          break;
        case "runicBlast":
          tone(150, 0.2, 0.2, "sine");
          noise(0.1, 0.2, 600);
          break;
      }
    } catch {
      // Audio context may not be available
    }
  }

  // ---- Ambient music system ----
  let _musicOscs: OscillatorNode[] = [];
  let _musicGains: GainNode[] = [];
  let _musicPlaying = false;

  function startMusic(mood: "menu" | "combat" | "boss" | "victory"): void {
    stopMusic();
    try {
      const c = getCtx();
      const now = c.currentTime;

      // Base drone
      const droneOsc = c.createOscillator();
      droneOsc.type = "sine";
      const droneGain = c.createGain();
      droneGain.gain.setValueAtTime(0, now);
      droneGain.gain.linearRampToValueAtTime(0.06, now + 2);

      // Pad
      const padOsc = c.createOscillator();
      padOsc.type = "triangle";
      const padGain = c.createGain();
      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.04, now + 3);

      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, now);

      switch (mood) {
        case "menu":
          droneOsc.frequency.setValueAtTime(65, now); // C2
          padOsc.frequency.setValueAtTime(196, now); // G3
          filter.frequency.setValueAtTime(300, now);
          break;
        case "combat":
          droneOsc.frequency.setValueAtTime(73, now); // D2
          padOsc.frequency.setValueAtTime(220, now); // A3
          filter.frequency.setValueAtTime(600, now);
          droneGain.gain.linearRampToValueAtTime(0.08, now + 1);
          break;
        case "boss":
          droneOsc.frequency.setValueAtTime(55, now); // A1
          padOsc.frequency.setValueAtTime(165, now); // E3
          padOsc.type = "sawtooth";
          filter.frequency.setValueAtTime(800, now);
          droneGain.gain.linearRampToValueAtTime(0.1, now + 1);
          padGain.gain.linearRampToValueAtTime(0.06, now + 1);
          break;
        case "victory":
          droneOsc.frequency.setValueAtTime(130, now); // C3
          padOsc.frequency.setValueAtTime(330, now); // E4
          filter.frequency.setValueAtTime(1000, now);
          break;
      }

      droneOsc.connect(droneGain).connect(filter).connect(c.destination);
      padOsc.connect(padGain).connect(filter);
      droneOsc.start();
      padOsc.start();

      _musicOscs = [droneOsc, padOsc];
      _musicGains = [droneGain, padGain];
      _musicPlaying = true;
    } catch { /* audio unavailable */ }
  }

  function stopMusic(): void {
    if (!_musicPlaying) return;
    try {
      const c = getCtx();
      for (const g of _musicGains) {
        g.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.5);
      }
      setTimeout(() => {
        for (const o of _musicOscs) try { o.stop(); } catch { /* already stopped */ }
        _musicOscs = [];
        _musicGains = [];
      }, 600);
    } catch { /* */ }
    _musicPlaying = false;
  }

  return { play, startMusic, stopMusic };
})();
