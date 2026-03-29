// ---------------------------------------------------------------------------
// Igwaine — Game Systems (pure functions operating on state)
// ---------------------------------------------------------------------------

import { IgwainePhase, EnemyKind, EnemyAI, Virtue, PerkId, WaveModifier } from "../types";
import type { IgwaineState, Enemy, Projectile, PerkChoice } from "../types";
import { IGB, ENEMY_DEFS, VIRTUE_COLORS, ALL_PERKS, DIFFICULTY_SETTINGS, WAVE_MODIFIER_LABELS } from "../config/IgwaineBalance";

// ---------------------------------------------------------------------------
// Solar power — the core mechanic
// ---------------------------------------------------------------------------

export function getSunPower(sunPhase: number): number {
  const noon = Math.sin(sunPhase * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  return IGB.SUN_POWER_MIN + noon * (IGB.SUN_POWER_MAX - IGB.SUN_POWER_MIN);
}

export function getSunBrightness(sunPhase: number): number {
  return Math.sin(sunPhase * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
}

// ---------------------------------------------------------------------------
// Player movement
// ---------------------------------------------------------------------------

export function movePlayer(s: IgwaineState, dx: number, dy: number, dt: number): void {
  const speedBonus = 1 + s.virtues[Virtue.CHASTITY] * IGB.VIRTUE_BONUS_PER_STACK * 4;
  // Slow while charging
  const chargeSlow = s.chargeTime > 0 ? 0.5 : 1;
  // Banshee fear slow
  const fearSlow = s.fearTimer > 0 ? s.fearSlowFactor : 1;
  const speed = s.dashTimer > 0 ? IGB.DASH_SPEED : IGB.PLAYER_SPEED * speedBonus * chargeSlow * fearSlow;

  if (s.dashTimer > 0) {
    s.px += s.pvx * dt;
    s.py += s.pvy * dt;
    s.dashTimer -= dt;
  } else {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      s.pvx = (dx / len) * speed;
      s.pvy = (dy / len) * speed;
    } else {
      s.pvx = 0;
      s.pvy = 0;
    }
    s.px += s.pvx * dt;
    s.py += s.pvy * dt;
  }

  _clampPlayerToArena(s);
}

function _clampPlayerToArena(s: IgwaineState): void {
  const cx = s.screenW / 2, cy = s.screenH / 2;
  const ox = s.px - cx, oy = s.py - cy;
  const dist = Math.sqrt(ox * ox + oy * oy);
  if (dist > IGB.ARENA_RADIUS - IGB.PLAYER_RADIUS) {
    const a = Math.atan2(oy, ox);
    s.px = cx + Math.cos(a) * (IGB.ARENA_RADIUS - IGB.PLAYER_RADIUS);
    s.py = cy + Math.sin(a) * (IGB.ARENA_RADIUS - IGB.PLAYER_RADIUS);
  }
}

// ---------------------------------------------------------------------------
// Attack — normal, multi-shot, and charged
// ---------------------------------------------------------------------------

export function playerAttack(s: IgwaineState, dirX: number, dirY: number): void {
  if (s.attackCd > 0) return;
  if (s.perkChoice) return; // can't attack during perk selection
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  if (len === 0) return;

  const sunBright = s.eclipseTimer > 0 ? 0 : getSunBrightness(s.sunPhase);
  const sunPow = s.eclipseTimer > 0 ? IGB.SUN_POWER_MIN : getEffectiveSunPower(s);
  const dmgBonus = 1 + s.virtues[Virtue.FELLOWSHIP] * IGB.VIRTUE_BONUS_PER_STACK * 4;
  const goldenMult = s.goldenHourTimer > 0 ? IGB.GOLDEN_HOUR_DMG_MULT : 1;
  const dmg = IGB.PLAYER_PROJ_DMG * sunPow * dmgBonus * goldenMult;
  const nx = dirX / len, ny = dirY / len;

  s.aimDirX = nx;
  s.aimDirY = ny;

  let pierce = 0;
  if (sunBright > IGB.PIERCE_SUN_THRESHOLD) {
    const t = (sunBright - IGB.PIERCE_SUN_THRESHOLD) / (1 - IGB.PIERCE_SUN_THRESHOLD);
    pierce = Math.floor(t * IGB.PIERCE_MAX);
  }

  const projColor = _lerpColor(IGB.COLOR_MOON, IGB.COLOR_SUN, sunBright);
  const projRadius = getEffectiveProjRadius(s) + (pierce > 0 ? 1.5 : 0);
  const projSpeed = getEffectiveProjSpeed(s);

  const extraShots = Math.floor(s.virtues[Virtue.FELLOWSHIP] / IGB.MULTISHOT_THRESHOLD);
  const totalShots = 1 + Math.min(extraShots, 4);
  const baseAngle = Math.atan2(ny, nx);

  for (let i = 0; i < totalShots; i++) {
    const spread = (i - (totalShots - 1) / 2) * IGB.MULTISHOT_SPREAD;
    const a = baseAngle + spread;
    const sx = Math.cos(a), sy = Math.sin(a);

    s.projectiles.push({
      x: s.px + sx * 20, y: s.py + sy * 20,
      vx: sx * projSpeed, vy: sy * projSpeed,
      dmg: totalShots > 1 ? dmg * 0.7 : dmg,
      life: IGB.PLAYER_PROJ_LIFE, fromPlayer: true,
      radius: projRadius, color: projColor,
      pierce, trail: pierce > 0, charged: false,
    });
  }

  s.attackCd = getEffectiveAttackCd(s);
}

export function startCharge(s: IgwaineState, dirX: number, dirY: number): void {
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  if (len === 0) return;
  s.chargeAimX = dirX / len;
  s.chargeAimY = dirY / len;
}

export function updateCharge(s: IgwaineState, dirX: number, dirY: number, dt: number): void {
  if (s.chargeTime > 0) {
    s.chargeTime += dt;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len > 0) {
      s.chargeAimX = dirX / len;
      s.chargeAimY = dirY / len;
    }
  }
}

export function fireChargedShot(s: IgwaineState): void {
  if (s.chargeTime < IGB.CHARGE_TIME_MIN) { s.chargeTime = 0; return; }
  if (s.energy < IGB.CHARGE_ENERGY_COST) { s.chargeTime = 0; return; }

  const chargePct = Math.min(1, (s.chargeTime - IGB.CHARGE_TIME_MIN) / (IGB.CHARGE_TIME_MAX - IGB.CHARGE_TIME_MIN));
  s.chargeTime = 0;
  s.energy -= IGB.CHARGE_ENERGY_COST;

  const sunPow = getSunPower(s.sunPhase);
  const sunBright = getSunBrightness(s.sunPhase);
  const dmgBonus = 1 + s.virtues[Virtue.FELLOWSHIP] * IGB.VIRTUE_BONUS_PER_STACK * 4;
  const dmg = IGB.PLAYER_PROJ_DMG * sunPow * dmgBonus * (1 + chargePct * (IGB.CHARGE_DMG_MULT - 1));
  const radius = IGB.PLAYER_PROJ_RADIUS * (1 + chargePct * (IGB.CHARGE_RADIUS_MULT - 1));

  s.projectiles.push({
    x: s.px + s.chargeAimX * 20,
    y: s.py + s.chargeAimY * 20,
    vx: s.chargeAimX * IGB.PLAYER_PROJ_SPEED * IGB.CHARGE_SPEED_MULT,
    vy: s.chargeAimY * IGB.PLAYER_PROJ_SPEED * IGB.CHARGE_SPEED_MULT,
    dmg,
    life: IGB.PLAYER_PROJ_LIFE * 1.5,
    fromPlayer: true,
    radius,
    color: _lerpColor(IGB.COLOR_CHARGED, IGB.COLOR_SUN, sunBright),
    pierce: 2 + Math.floor(chargePct * 3),
    trail: true,
    charged: true,
  });

  s.aimDirX = s.chargeAimX;
  s.aimDirY = s.chargeAimY;
  s.screenShake = 3 + chargePct * 4;

  // Charge release burst
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    s.particles.push({
      x: s.px, y: s.py,
      vx: Math.cos(a) * 100 + s.chargeAimX * 80,
      vy: Math.sin(a) * 100 + s.chargeAimY * 80,
      life: 0.3, maxLife: 0.3,
      color: IGB.COLOR_CHARGED, size: 3 + chargePct * 2,
    });
  }
}

// ---------------------------------------------------------------------------
// Solar Flare ultimate
// ---------------------------------------------------------------------------

export function trySolarFlare(s: IgwaineState): void {
  if (s.solarFlareCd > 0) return;
  const sunBright = getSunBrightness(s.sunPhase);
  if (sunBright < IGB.SOLAR_FLARE_THRESHOLD) return;
  if (s.energy < IGB.SOLAR_FLARE_ENERGY_COST) return;

  s.energy -= IGB.SOLAR_FLARE_ENERGY_COST;
  s.solarFlareCd = IGB.SOLAR_FLARE_CD;
  s.screenShake = 12;

  s.shockwaves.push({
    x: s.px, y: s.py, radius: 0,
    maxRadius: IGB.SOLAR_FLARE_RADIUS, life: 0.5, maxLife: 0.5,
    color: IGB.COLOR_SOLAR_FLARE, dmg: IGB.SOLAR_FLARE_DMG * getSunPower(s.sunPhase),
    fromPlayer: true, hit: new Set(),
  });

  for (let i = 0; i < 30; i++) {
    const a = (Math.PI * 2 * i) / 30;
    s.particles.push({ x: s.px, y: s.py, vx: Math.cos(a) * 300 + (Math.random() - 0.5) * 60, vy: Math.sin(a) * 300 + (Math.random() - 0.5) * 60, life: 0.6, maxLife: 0.6, color: IGB.COLOR_SOLAR_FLARE, size: 5 });
  }
  s.floatingTexts.push({ x: s.px, y: s.py - 30, text: "SOLAR FLARE!", life: 1.5, color: IGB.COLOR_SOLAR_FLARE, scale: 1.8 });
}

// ---------------------------------------------------------------------------
// Pentangle Synergy — all 5 virtues trigger a massive burst
// ---------------------------------------------------------------------------

export function tryPentangleSynergy(s: IgwaineState): void {
  if (s.pentangleSynergyCd > 0) return;
  const allVirtues = Object.values(Virtue);
  if (!allVirtues.every(v => s.virtues[v] >= 1)) return;

  s.pentangleSynergyCd = IGB.PENTANGLE_CD;
  s.pentangleBurstTimer = IGB.PENTANGLE_BURST_DURATION;
  s.screenShake = 15;

  // Consume one of each virtue
  for (const v of allVirtues) s.virtues[v]--;

  // Create massive pentangle-shaped shockwave
  s.shockwaves.push({
    x: s.px, y: s.py, radius: 0,
    maxRadius: IGB.PENTANGLE_RADIUS, life: 0.8, maxLife: 0.8,
    color: IGB.COLOR_PENTANGLE_BURST, dmg: IGB.PENTANGLE_DMG * getSunPower(s.sunPhase),
    fromPlayer: true, hit: new Set(),
  });

  // 5-color burst particles — one color per virtue
  const colors = Object.values(VIRTUE_COLORS);
  for (let i = 0; i < 50; i++) {
    const a = (Math.PI * 2 * i) / 50;
    s.particles.push({
      x: s.px, y: s.py,
      vx: Math.cos(a) * 350 + (Math.random() - 0.5) * 80,
      vy: Math.sin(a) * 350 + (Math.random() - 0.5) * 80,
      life: 0.8, maxLife: 0.8,
      color: colors[i % 5], size: 6,
    });
  }

  // Full heal
  s.hp = s.maxHp;
  s.energy = s.maxEnergy;
  s.floatingTexts.push({ x: s.px, y: s.py - 40, text: "PENTANGLE SYNERGY!", life: 2.0, color: IGB.COLOR_PENTANGLE_BURST, scale: 2.0 });
}

// ---------------------------------------------------------------------------
// Dash
// ---------------------------------------------------------------------------

export function tryDash(s: IgwaineState): void {
  if (s.dashCd > 0 || s.dashTimer > 0) return;
  if (s.energy < 20) return;
  // If standing still, dash in aim direction
  let dvx = s.pvx, dvy = s.pvy;
  const len = Math.sqrt(dvx * dvx + dvy * dvy);
  if (len < 1) {
    dvx = s.aimDirX * IGB.DASH_SPEED;
    dvy = s.aimDirY * IGB.DASH_SPEED;
    const alen = Math.sqrt(dvx * dvx + dvy * dvy);
    if (alen < 1) return;
  }
  s.pvx = dvx; s.pvy = dvy;
  s.dashTimer = IGB.DASH_DURATION;
  s.dashCd = IGB.DASH_CD;
  s.invulnTimer = IGB.DASH_DURATION + 0.05;
  s.energy -= 20;
  for (let i = 0; i < 8; i++) {
    s.particles.push({ x: s.px, y: s.py, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, life: 0.4, maxLife: 0.4, color: IGB.COLOR_GOLD, size: 3 });
  }
}

// ---------------------------------------------------------------------------
// Wave spawning
// ---------------------------------------------------------------------------

export function spawnWave(s: IgwaineState): void {
  s.wave++;
  s.waveAnnounceTimer = IGB.WAVE_ANNOUNCE_DURATION;
  const diff = DIFFICULTY_SETTINGS[s.difficulty];

  // Between-wave heal
  if (s.wave > 1) {
    const heal = IGB.BETWEEN_WAVE_HEAL;
    s.hp = Math.min(s.hp + heal, s.maxHp);
    s.floatingTexts.push({ x: s.px, y: s.py - 25, text: `+${heal} HP`, life: 0.8, color: 0xaa88ff, scale: 1 });
  }

  // Sun accelerates in later waves
  s.sunSpeed = ((1 / IGB.SUN_CYCLE_DURATION) + s.wave * IGB.SUN_SPEED_ACCEL) * diff.sunCycleMult;

  // Pick a random wave modifier (30% chance after wave 3)
  if (s.wave > 3 && Math.random() < 0.3) {
    const mods = [WaveModifier.SWIFT, WaveModifier.ARMORED, WaveModifier.VAMPIRIC, WaveModifier.SWARM, WaveModifier.VOLATILE, WaveModifier.SHIELDED, WaveModifier.MOONLIT, WaveModifier.CURSED];
    s.waveModifier = mods[Math.floor(Math.random() * mods.length)];
    const ml = WAVE_MODIFIER_LABELS[s.waveModifier];
    s.waveModifierText = ml.name;
    s.floatingTexts.push({ x: s.screenW / 2, y: s.screenH / 2, text: ml.name + ": " + ml.desc, life: 2.5, color: ml.color, scale: 1.3 });
  } else {
    s.waveModifier = WaveModifier.NONE;
    s.waveModifierText = "";
  }

  let count = Math.min(Math.floor(IGB.WAVE_BASE_COUNT + (s.wave - 1) * IGB.WAVE_COUNT_SCALE), IGB.WAVE_MAX_ENEMIES);
  if (s.waveModifier === WaveModifier.SWARM) count = Math.min(Math.ceil(count * 1.5), 35);
  const isBossWave = s.wave % IGB.GREEN_KNIGHT_WAVE_INTERVAL === 0;
  const cx = s.screenW / 2, cy = s.screenH / 2;
  const waveKinds = _getWaveComposition(s.wave);

  for (let i = 0; i < count; i++) {
    const kind = waveKinds[i % waveKinds.length];
    const def = ENEMY_DEFS[kind];
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const spawnR = IGB.ARENA_RADIUS - 20;
    const hpScale = Math.pow(IGB.ENEMY_HP_SCALE, s.wave - 1) * diff.enemyHpMult;
    const dmgScale = Math.pow(IGB.ENEMY_DMG_SCALE, s.wave - 1) * diff.enemyDmgMult;

    const e = _createEnemy(kind, def, cx + Math.cos(angle) * spawnR, cy + Math.sin(angle) * spawnR, hpScale, dmgScale, s.wave);
    e.speed *= diff.enemySpeedMult;
    // Elite chance (after wave 4, not bosses)
    if (s.wave >= IGB.ELITE_FIRST_WAVE && kind !== EnemyKind.GREEN_KNIGHT && Math.random() < IGB.ELITE_CHANCE) {
      e.elite = true;
      e.hp *= IGB.ELITE_HP_MULT;
      e.maxHp *= IGB.ELITE_HP_MULT;
      e.speed *= IGB.ELITE_SPEED_MULT;
      e.dmg *= IGB.ELITE_DMG_MULT;
      e.radius *= 1.15;
    }
    _applyWaveModifier(e, s.waveModifier);
    s.enemies.push(e);
  }

  if (isBossWave) {
    const def = ENEMY_DEFS[EnemyKind.GREEN_KNIGHT];
    const hpScale = Math.pow(IGB.ENEMY_HP_SCALE, s.wave - 1);
    const dmgScale = Math.pow(IGB.ENEMY_DMG_SCALE, s.wave - 1);
    const angle = Math.random() * Math.PI * 2;
    const boss = _createEnemy(EnemyKind.GREEN_KNIGHT, def, cx + Math.cos(angle) * (IGB.ARENA_RADIUS - 30), cy + Math.sin(angle) * (IGB.ARENA_RADIUS - 30), hpScale, dmgScale, s.wave);
    boss.regenRate = IGB.GREEN_KNIGHT_REGEN * (1 + s.wave * 0.1);
    boss.spawnFlash = IGB.BOSS_SPAWN_FLASH;
    s.enemies.push(boss);

    for (let i = 0; i < 20; i++) {
      const a = (Math.PI * 2 * i) / 20;
      s.particles.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, life: 0.8, maxLife: 0.8, color: IGB.COLOR_GREEN_KNIGHT, size: 5 });
    }
    s.screenShake = 8;
    s.floatingTexts.push({ x: cx, y: cy - 60, text: "THE GREEN KNIGHT", life: 2.0, color: IGB.COLOR_GREEN_KNIGHT, scale: 1.5 });
  }

  s.enemiesRemaining = s.enemies.length;

  // Spawn arena hazards starting at wave 6, one more every 4 waves
  if (s.wave >= IGB.HAZARD_FIRST_WAVE) {
    const hazardCount = 1 + Math.floor((s.wave - IGB.HAZARD_FIRST_WAVE) / 4);
    s.hazards = [];
    for (let hi = 0; hi < Math.min(hazardCount, 4); hi++) {
      s.hazards.push({
        angle: (Math.PI * 2 * hi) / hazardCount,
        arcWidth: IGB.HAZARD_ARC_WIDTH,
        innerRadius: 60 + hi * 30,
        outerRadius: 140 + hi * 30,
        rotSpeed: IGB.HAZARD_ROT_SPEED * (hi % 2 === 0 ? 1 : -1),
        dmg: IGB.HAZARD_DMG,
        color: 0xff4411,
      });
    }
  }
}


function _getWaveComposition(wave: number): EnemyKind[] {
  if (wave <= 2) return [EnemyKind.WRAITH];
  if (wave <= 3) return [EnemyKind.WRAITH, EnemyKind.SHADE];
  if (wave <= 5) return [EnemyKind.WRAITH, EnemyKind.SHADE, EnemyKind.DARK_KNIGHT];
  if (wave <= 7) return [EnemyKind.WRAITH, EnemyKind.SHADE, EnemyKind.DARK_KNIGHT, EnemyKind.SPECTER];
  if (wave <= 9) return [EnemyKind.SHADE, EnemyKind.DARK_KNIGHT, EnemyKind.SPECTER, EnemyKind.REVENANT, EnemyKind.BANSHEE];
  return [EnemyKind.DARK_KNIGHT, EnemyKind.SPECTER, EnemyKind.REVENANT, EnemyKind.BANSHEE, EnemyKind.SPECTER, EnemyKind.DARK_KNIGHT];
}

function _createEnemy(kind: EnemyKind, def: typeof ENEMY_DEFS[EnemyKind], x: number, y: number, hpScale: number, dmgScale: number, wave: number): Enemy {
  return {
    x, y, vx: 0, vy: 0,
    hp: IGB.ENEMY_BASE_HP * def.hp * hpScale,
    maxHp: IGB.ENEMY_BASE_HP * def.hp * hpScale,
    kind, ai: def.ai,
    speed: def.speed + wave * 2,
    dmg: IGB.ENEMY_BASE_DMG * def.dmg * dmgScale,
    radius: def.radius, attackCd: def.attackCd,
    attackTimer: def.attackCd * Math.random(),
    color: def.color, regenRate: def.regen,
    stunTimer: 0, flashTimer: 0,
    circleAngle: Math.random() * Math.PI * 2,
    shootCd: IGB.SPECTER_SHOOT_CD,
    shootTimer: IGB.SPECTER_SHOOT_CD * Math.random(),
    chargeTimer: 0, chargeCd: IGB.BOSS_CHARGE_CD + Math.random() * 2,
    charging: false, chargeTargetX: 0, chargeTargetY: 0,
    slamCd: IGB.BOSS_SLAM_CD + Math.random() * 3, slamTimer: 0,
    spawnFlash: 0, splitCount: def.splitCount,
    bossShootCd: IGB.BOSS_SHOOT_CD + Math.random() * 2,
    bossSummonCd: IGB.BOSS_SUMMON_CD + Math.random() * 4,
    phaseTimer: 0,
    phaseCd: IGB.WRAITH_PHASE_CD * (0.7 + Math.random() * 0.6),
    spawnImmunity: IGB.SPAWN_IMMUNITY,
    shieldedTimer: 0,
    screamCd: IGB.BANSHEE_SCREAM_CD * (0.5 + Math.random() * 0.5),
    teleportCd: IGB.BANSHEE_TELEPORT_CD * (0.5 + Math.random() * 0.5),
    elite: false,
    enraged: false,
  };
}

// ---------------------------------------------------------------------------
// Eclipse event
// ---------------------------------------------------------------------------

export function updateEclipse(s: IgwaineState, dt: number): void {
  if (s.wave < IGB.ECLIPSE_FIRST_WAVE) return;

  if (s.eclipseTimer > 0) {
    s.eclipseTimer -= dt;
    // Sun stays frozen during eclipse (don't overwrite sunPhase, it was saved)
    if (s.eclipseTimer <= 0) {
      s.eclipseTimer = 0;
      s.sunPhase = s.preEclipseSunPhase; // restore sun position
      s.floatingTexts.push({ x: s.screenW / 2, y: s.screenH / 2 - 40, text: "The sun returns...", life: 1.5, color: IGB.COLOR_GOLD, scale: 1.3 });
    }
    return;
  }

  s.eclipseNext -= dt;
  if (s.eclipseNext <= 0) {
    s.preEclipseSunPhase = s.sunPhase; // save sun position
    s.eclipseTimer = IGB.ECLIPSE_DURATION;
    s.eclipseNext = IGB.ECLIPSE_INTERVAL_MIN + Math.random() * (IGB.ECLIPSE_INTERVAL_MAX - IGB.ECLIPSE_INTERVAL_MIN);
    s.screenShake = 6;
    s.floatingTexts.push({ x: s.screenW / 2, y: s.screenH / 2 - 40, text: "ECLIPSE!", life: 2.0, color: IGB.COLOR_ECLIPSE, scale: 1.8 });

    // Spawn shadow swarm
    const cx = s.screenW / 2, cy = s.screenH / 2;
    const hpScale = Math.pow(IGB.ENEMY_HP_SCALE, s.wave - 1);
    const dmgScale = Math.pow(IGB.ENEMY_DMG_SCALE, s.wave - 1);
    for (let i = 0; i < IGB.ECLIPSE_SHADE_COUNT; i++) {
      const a = (Math.PI * 2 * i) / IGB.ECLIPSE_SHADE_COUNT;
      const def = ENEMY_DEFS[EnemyKind.SHADE];
      const e = _createEnemy(EnemyKind.SHADE, def, cx + Math.cos(a) * (IGB.ARENA_RADIUS - 15), cy + Math.sin(a) * (IGB.ARENA_RADIUS - 15), hpScale * 1.3, dmgScale * 1.2, s.wave);
      e.speed *= 1.3;
      s.enemies.push(e);
    }
    s.enemiesRemaining = s.enemies.length;
  }
}

// ---------------------------------------------------------------------------
// Update enemies — with diverse AI behaviors + separation
// ---------------------------------------------------------------------------

export function updateEnemies(s: IgwaineState, dt: number): void {
  const sunBright = s.eclipseTimer > 0 ? 0 : getSunBrightness(s.sunPhase);
  const enemyPowerMult = 1.5 - sunBright * 0.8;

  for (let idx = 0; idx < s.enemies.length; idx++) {
    const e = s.enemies[idx];
    if (e.spawnImmunity > 0) e.spawnImmunity -= dt;
    if (e.shieldedTimer > 0) e.shieldedTimer -= dt;
    if (e.spawnFlash > 0) e.spawnFlash -= dt;
    if (e.slamTimer > 0) e.slamTimer -= dt;
    if (e.stunTimer > 0) { e.stunTimer -= dt; continue; }
    if (e.flashTimer > 0) e.flashTimer -= dt;

    if (e.regenRate > 0) e.hp = Math.min(e.hp + e.regenRate * dt, e.maxHp);

    // Wraith phase toggle
    if (e.kind === EnemyKind.WRAITH) {
      if (e.phaseTimer > 0) { e.phaseTimer -= dt; }
      else { e.phaseCd -= dt; if (e.phaseCd <= 0) { e.phaseTimer = IGB.WRAITH_PHASE_DURATION; e.phaseCd = IGB.WRAITH_PHASE_CD * (0.7 + Math.random() * 0.6); } }
    }

    const dx = s.px - e.x, dy = s.py - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;

    switch (e.ai) {
      case EnemyAI.CHASE: _aiChase(e, nx, ny, dist, enemyPowerMult, dt); break;
      case EnemyAI.CIRCLE: _aiCircle(e, s.px, s.py, dist, enemyPowerMult, dt); break;
      case EnemyAI.FLANK: _aiFlank(e, s.px, s.py, nx, ny, dist, enemyPowerMult, dt); break;
      case EnemyAI.RANGED: _aiRanged(e, s, nx, ny, dist, enemyPowerMult, dt); break;
      case EnemyAI.BOSS: _aiBoss(e, s, nx, ny, dist, enemyPowerMult, dt); break;
      case EnemyAI.BANSHEE: _aiBanshee(e, s, nx, ny, dist, enemyPowerMult, dt); break;
    }

    // Arena clamping + border damage
    const acx = s.screenW / 2, acy = s.screenH / 2;
    const ex = e.x - acx, ey = e.y - acy;
    const ed = Math.sqrt(ex * ex + ey * ey);
    if (ed > IGB.ARENA_RADIUS - e.radius) {
      const a = Math.atan2(ey, ex);
      e.x = acx + Math.cos(a) * (IGB.ARENA_RADIUS - e.radius);
      e.y = acy + Math.sin(a) * (IGB.ARENA_RADIUS - e.radius);
      // Border damage
      if (ed > IGB.ARENA_RADIUS - e.radius + 2) {
        e.hp -= IGB.ARENA_BORDER_DMG * dt;
        if (e.hp <= 0) { _killEnemy(s, idx); idx--; continue; }
      }
    }

    // Melee attack
    if (dist < e.radius + IGB.PLAYER_RADIUS + 4) {
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        _meleeHitPlayer(s, e, enemyPowerMult);
        e.attackTimer = e.attackCd;
      }
    }

    // Dark Knight shield bash
    if (e.kind === EnemyKind.DARK_KNIGHT && dist < IGB.DARK_KNIGHT_BASH_RANGE) {
      e.chargeCd -= dt; // reuse chargeCd for bash cooldown
      if (e.chargeCd <= 0 && s.invulnTimer <= 0) {
        e.chargeCd = IGB.DARK_KNIGHT_BASH_CD;
        // Stun player
        s.stunTimer = Math.max(s.stunTimer, IGB.DARK_KNIGHT_BASH_STUN);
        // Heavy knockback
        const bdx = s.px - e.x, bdy = s.py - e.y;
        const bd = Math.sqrt(bdx * bdx + bdy * bdy);
        if (bd > 0.1) { s.px += (bdx / bd) * IGB.DARK_KNIGHT_BASH_KNOCKBACK; s.py += (bdy / bd) * IGB.DARK_KNIGHT_BASH_KNOCKBACK; _clampPlayerToArena(s); }
        s.screenShake = 5;
        s.floatingTexts.push({ x: s.px, y: s.py - 25, text: "BASHED!", life: 0.8, color: 0x4444aa, scale: 1.2 });
        // Bash particles
        for (let bi = 0; bi < 6; bi++) { const ba = (Math.PI * 2 * bi) / 6; s.particles.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 80, vy: Math.sin(ba) * 80, life: 0.3, maxLife: 0.3, color: 0x6666aa, size: 3 }); }
      }
    }
  }

  // Enemy-enemy separation
  _separateEnemies(s, dt);
}

function _separateEnemies(s: IgwaineState, dt: number): void {
  for (let i = 0; i < s.enemies.length; i++) {
    for (let j = i + 1; j < s.enemies.length; j++) {
      const a = s.enemies[i], b = s.enemies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b.radius + IGB.ENEMY_SEPARATION_RADIUS;
      if (dist < minDist && dist > 0.1) {
        const overlap = (minDist - dist) * 0.5;
        const nx = dx / dist, ny = dy / dist;
        const force = IGB.ENEMY_SEPARATION_FORCE * dt;
        a.x -= nx * overlap * force;
        a.y -= ny * overlap * force;
        b.x += nx * overlap * force;
        b.y += ny * overlap * force;
      }
    }
  }
}

function _aiChase(e: Enemy, nx: number, ny: number, dist: number, mult: number, dt: number): void {
  if (dist > e.radius + IGB.PLAYER_RADIUS) {
    const spd = e.speed * mult;
    e.vx = nx * spd; e.vy = ny * spd;
    e.x += e.vx * dt; e.y += e.vy * dt;
  }
}

function _aiCircle(e: Enemy, px: number, py: number, dist: number, mult: number, dt: number): void {
  const targetDist = 80;
  const spd = e.speed * mult;
  e.circleAngle += dt * 2.0;
  if (dist > targetDist + 30) {
    const dx = px - e.x, dy = py - e.y, d = Math.sqrt(dx * dx + dy * dy);
    e.vx = (dx / d) * spd; e.vy = (dy / d) * spd;
  } else {
    const ox = px + Math.cos(e.circleAngle) * targetDist;
    const oy = py + Math.sin(e.circleAngle) * targetDist;
    const odx = ox - e.x, ody = oy - e.y, od = Math.sqrt(odx * odx + ody * ody);
    if (od > 1) { e.vx = (odx / od) * spd; e.vy = (ody / od) * spd; }
  }
  e.x += e.vx * dt; e.y += e.vy * dt;
}

function _aiFlank(e: Enemy, px: number, py: number, nx: number, ny: number, dist: number, mult: number, dt: number): void {
  const spd = e.speed * mult;
  const perpX = -ny, perpY = nx;
  const flankSign = e.circleAngle > Math.PI ? 1 : -1;
  if (dist > 60) {
    const mx = nx * 0.6 + perpX * 0.4 * flankSign;
    const my = ny * 0.6 + perpY * 0.4 * flankSign;
    const ml = Math.sqrt(mx * mx + my * my);
    e.vx = (mx / ml) * spd; e.vy = (my / ml) * spd;
  } else {
    e.vx = nx * spd * 1.2; e.vy = ny * spd * 1.2;
  }
  e.x += e.vx * dt; e.y += e.vy * dt;
}

function _aiRanged(e: Enemy, s: IgwaineState, nx: number, ny: number, dist: number, mult: number, dt: number): void {
  const spd = e.speed * mult;
  const preferred = IGB.SPECTER_PREFERRED_DIST;
  if (dist < preferred - 30) { e.vx = -nx * spd * 0.8; e.vy = -ny * spd * 0.8; }
  else if (dist > preferred + 40) { e.vx = nx * spd; e.vy = ny * spd; }
  else {
    e.circleAngle += dt * 1.5;
    const sx = -ny, sy = nx, sign = Math.sin(e.circleAngle) > 0 ? 1 : -1;
    e.vx = sx * spd * 0.5 * sign; e.vy = sy * spd * 0.5 * sign;
  }
  e.x += e.vx * dt; e.y += e.vy * dt;

  e.shootTimer -= dt;
  if (e.shootTimer <= 0 && dist < 300) {
    e.shootTimer = e.shootCd;
    s.projectiles.push({ x: e.x, y: e.y, vx: nx * IGB.SPECTER_PROJ_SPEED, vy: ny * IGB.SPECTER_PROJ_SPEED, dmg: e.dmg * IGB.SPECTER_PROJ_DMG_MULT * mult, life: IGB.SPECTER_PROJ_LIFE, fromPlayer: false, radius: 4, color: 0x6666cc, pierce: 0, trail: false, charged: false });
  }
}

function _aiBoss(e: Enemy, s: IgwaineState, nx: number, ny: number, dist: number, mult: number, dt: number): void {
  // Enrage check — below 30% HP
  if (!e.enraged && e.hp < e.maxHp * IGB.BOSS_ENRAGE_THRESHOLD) {
    e.enraged = true;
    s.screenShake = 12;
    s.screenFlashTimer = 0.2;
    s.screenFlashColor = IGB.COLOR_ENRAGE;
    s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 25, text: "ENRAGED!", life: 2.0, color: IGB.COLOR_ENRAGE, scale: 1.8 });
    // Enrage burst particles
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      s.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, maxLife: 0.6, color: IGB.COLOR_ENRAGE, size: 5 });
    }
  }
  const enrageMult = e.enraged ? IGB.BOSS_ENRAGE_SPEED_MULT : 1;
  const cdMult = e.enraged ? IGB.BOSS_ENRAGE_ATTACK_MULT : 1;
  const spd = e.speed * mult * enrageMult;
  if (e.charging) {
    const cdx = e.chargeTargetX - e.x, cdy = e.chargeTargetY - e.y;
    const cd = Math.sqrt(cdx * cdx + cdy * cdy);
    if (cd < 20 || e.chargeTimer <= 0) { e.charging = false; e.chargeTimer = 0; }
    else {
      e.vx = (cdx / cd) * IGB.BOSS_CHARGE_SPEED; e.vy = (cdy / cd) * IGB.BOSS_CHARGE_SPEED;
      e.x += e.vx * dt; e.y += e.vy * dt; e.chargeTimer -= dt;
      if (dist < e.radius + IGB.PLAYER_RADIUS + 8) _meleeHitPlayer(s, e, mult * IGB.BOSS_CHARGE_DMG_MULT);
      return;
    }
  }
  if (dist > e.radius + IGB.PLAYER_RADIUS) { e.vx = nx * spd; e.vy = ny * spd; e.x += e.vx * dt; e.y += e.vy * dt; }

  e.chargeCd -= dt;
  if (e.chargeCd <= 0 && dist > 80 && dist < 300) {
    e.charging = true; e.chargeTimer = IGB.BOSS_CHARGE_DURATION;
    e.chargeTargetX = s.px; e.chargeTargetY = s.py;
    e.chargeCd = (IGB.BOSS_CHARGE_CD + Math.random() * 2) * cdMult;
    for (let i = 0; i < 6; i++) s.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100, life: 0.3, maxLife: 0.3, color: 0x44ff44, size: 4 });
  }

  e.slamCd -= dt;
  if (e.slamCd <= 0 && dist < 100) {
    e.slamCd = (IGB.BOSS_SLAM_CD + Math.random() * 3) * cdMult; e.slamTimer = 0.4; s.screenShake = 10;
    const slamRadius = e.enraged ? IGB.BOSS_ENRAGE_SLAM_RADIUS : IGB.BOSS_SLAM_RADIUS;
    const slamDmg = IGB.BOSS_SLAM_DMG * mult * (e.enraged ? 1.5 : 1);
    s.shockwaves.push({ x: e.x, y: e.y, radius: 0, maxRadius: slamRadius, life: 0.4, maxLife: 0.4, color: e.enraged ? IGB.COLOR_ENRAGE : IGB.COLOR_BOSS_SLAM, dmg: slamDmg, fromPlayer: false, hit: new Set() });
    s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 15, text: "SLAM!", life: 0.8, color: IGB.COLOR_GREEN_KNIGHT, scale: 1.3 });
  }

  // Boss escalation: green fire projectiles (wave 10+)
  if (s.wave >= IGB.BOSS_SHOOT_FIRST_WAVE) {
    e.bossShootCd -= dt;
    if (e.bossShootCd <= 0) {
      e.bossShootCd = IGB.BOSS_SHOOT_CD;
      const count = IGB.BOSS_PROJ_COUNT;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count;
        s.projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * IGB.BOSS_PROJ_SPEED, vy: Math.sin(a) * IGB.BOSS_PROJ_SPEED, dmg: e.dmg * 0.5 * mult, life: 1.5, fromPlayer: false, radius: 5, color: 0x44ff44, pierce: 0, trail: false, charged: false });
      }
      s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 20, text: "GREEN FIRE!", life: 0.6, color: 0x44ff44, scale: 1.1 });
    }
  }

  // Boss escalation: summon wraiths (wave 15+)
  if (s.wave >= IGB.BOSS_SUMMON_FIRST_WAVE) {
    e.bossSummonCd -= dt;
    if (e.bossSummonCd <= 0) {
      e.bossSummonCd = IGB.BOSS_SUMMON_CD + Math.random() * 4;
      const hpScale = Math.pow(IGB.ENEMY_HP_SCALE, s.wave - 1);
      const dmgScale = Math.pow(IGB.ENEMY_DMG_SCALE, s.wave - 1);
      for (let i = 0; i < IGB.BOSS_SUMMON_COUNT; i++) {
        const sa = Math.random() * Math.PI * 2;
        const minion = _createEnemy(EnemyKind.WRAITH, ENEMY_DEFS[EnemyKind.WRAITH], e.x + Math.cos(sa) * 30, e.y + Math.sin(sa) * 30, hpScale * 0.6, dmgScale * 0.5, s.wave);
        minion.spawnFlash = 0.4;
        s.enemies.push(minion);
        s.particles.push({ x: minion.x, y: minion.y, vx: Math.cos(sa) * 40, vy: Math.sin(sa) * 40, life: 0.4, maxLife: 0.4, color: IGB.COLOR_GREEN_KNIGHT, size: 4 });
      }
      s.enemiesRemaining = s.enemies.length;
      s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 25, text: "SUMMON!", life: 0.8, color: 0x88ff88, scale: 1.2 });
    }
  }
}

function _aiBanshee(e: Enemy, s: IgwaineState, nx: number, ny: number, dist: number, mult: number, dt: number): void {
  const spd = e.speed * mult;
  // Keep medium distance from player, drift sideways
  const preferred = 120;
  if (dist < preferred - 20) { e.vx = -nx * spd; e.vy = -ny * spd; }
  else if (dist > preferred + 40) { e.vx = nx * spd * 0.8; e.vy = ny * spd * 0.8; }
  else {
    const sx = -ny, sy = nx;
    e.circleAngle += dt * 1.8;
    const sign = Math.sin(e.circleAngle) > 0 ? 1 : -1;
    e.vx = sx * spd * 0.6 * sign; e.vy = sy * spd * 0.6 * sign;
  }
  e.x += e.vx * dt; e.y += e.vy * dt;

  // Fear scream — slows the player
  e.screamCd -= dt;
  if (e.screamCd <= 0 && dist < IGB.BANSHEE_SCREAM_RADIUS) {
    e.screamCd = IGB.BANSHEE_SCREAM_CD;
    s.fearTimer = IGB.BANSHEE_FEAR_DURATION;
    s.fearSlowFactor = IGB.BANSHEE_FEAR_SLOW;
    s.screenShake = Math.max(s.screenShake, 4);
    s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 15, text: "SCREAM!", life: 1.0, color: IGB.COLOR_BANSHEE, scale: 1.3 });
    s.floatingTexts.push({ x: s.px, y: s.py - 25, text: "FEARED!", life: 1.0, color: IGB.COLOR_FEAR, scale: 1.1 });
    // Scream ring particles
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      s.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.5, maxLife: 0.5, color: IGB.COLOR_BANSHEE, size: 3 });
    }
    // Scream also shockwave (visual only, no damage)
    s.shockwaves.push({ x: e.x, y: e.y, radius: 0, maxRadius: IGB.BANSHEE_SCREAM_RADIUS, life: 0.4, maxLife: 0.4, color: IGB.COLOR_FEAR, dmg: 0, fromPlayer: false, hit: new Set() });
  }

  // Short-range teleport — blink to a random nearby position
  e.teleportCd -= dt;
  if (e.teleportCd <= 0 && dist < 200) {
    e.teleportCd = IGB.BANSHEE_TELEPORT_CD;
    const cx = s.screenW / 2, cy = s.screenH / 2;
    const teleAngle = Math.random() * Math.PI * 2;
    const newX = e.x + Math.cos(teleAngle) * IGB.BANSHEE_TELEPORT_RANGE;
    const newY = e.y + Math.sin(teleAngle) * IGB.BANSHEE_TELEPORT_RANGE;
    // Clamp to arena
    const ox = newX - cx, oy = newY - cy;
    const od = Math.sqrt(ox * ox + oy * oy);
    if (od < IGB.ARENA_RADIUS - e.radius - 10) {
      // Vanish particles at old position
      for (let i = 0; i < 6; i++) s.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0.3, maxLife: 0.3, color: IGB.COLOR_BANSHEE, size: 3 });
      e.x = newX; e.y = newY;
      // Appear particles at new position
      for (let i = 0; i < 6; i++) s.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0.3, maxLife: 0.3, color: IGB.COLOR_BANSHEE, size: 3 });
    }
  }
}

function _meleeHitPlayer(s: IgwaineState, e: Enemy, mult: number): void {
  // Riposte check — perfect shield timing
  if (s.riposteWindow > 0 && s.shielding && s.energy > 0) {
    s.riposteWindow = 0;
    s.riposteFlashTimer = 0.3;
    s.invulnTimer = IGB.RIPOSTE_INVULN;
    s.screenShake = Math.max(s.screenShake, 6);
    s.floatingTexts.push({ x: s.px, y: s.py - 35, text: "RIPOSTE!", life: 1.2, color: IGB.COLOR_RIPOSTE, scale: 1.5 });
    // Counter-attack shockwave
    s.shockwaves.push({ x: s.px, y: s.py, radius: 0, maxRadius: IGB.RIPOSTE_RADIUS, life: 0.3, maxLife: 0.3, color: IGB.COLOR_RIPOSTE, dmg: IGB.RIPOSTE_DMG * (1 + s.virtues[Virtue.COURTESY] * 0.3), fromPlayer: true, hit: new Set() });
    // Riposte particles
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      s.particles.push({ x: s.px, y: s.py, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.35, maxLife: 0.35, color: IGB.COLOR_RIPOSTE, size: 4 });
    }
    return; // no damage taken on riposte
  }

  let dmg = e.dmg * mult;
  const wasShielding = s.shielding && s.energy > 0;
  if (wasShielding) {
    const shieldBonus = Math.min(1, 1 + s.virtues[Virtue.COURTESY] * IGB.VIRTUE_BONUS_PER_STACK * 3);
    dmg *= (1 - IGB.SHIELD_BLOCK * shieldBonus);
  }
  if (s.invulnTimer <= 0) {
    s.hp -= dmg;
    s.invulnTimer = IGB.INVULN_ON_HIT;
    s.screenShake = Math.max(s.screenShake, 4);
    if (wasShielding) {
      s.floatingTexts.push({ x: s.px, y: s.py - 30, text: "BLOCKED", life: 0.6, color: IGB.COLOR_SHIELD, scale: 1.1 });
    }
    s.floatingTexts.push({ x: s.px, y: s.py - 20, text: `-${Math.round(dmg)}`, life: 0.8, color: wasShielding ? 0x6688aa : IGB.COLOR_HP, scale: 1 });
    // Player knockback
    const dx = s.px - e.x, dy = s.py - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0.1) {
      s.px += (dx / d) * IGB.KNOCKBACK_PLAYER;
      s.py += (dy / d) * IGB.KNOCKBACK_PLAYER;
      _clampPlayerToArena(s);
    }
    // Thorns perk (Juggernaut synergy = 3x damage)
    const thorns = _perkCount(s, PerkId.THORNS);
    if (thorns > 0) {
      const thornsMult = hasSynergy(s, "Juggernaut") ? 3 : 1;
      const thornsDmg = 5 * thorns * thornsMult;
      e.hp -= thornsDmg;
      e.flashTimer = 0.1;
      s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 5, text: `THORNS -${thornsDmg}`, life: 0.7, color: 0xddaa44, scale: 1.0 });
    }
  }
}

// ---------------------------------------------------------------------------
// Update projectiles
// ---------------------------------------------------------------------------

export function updateProjectiles(s: IgwaineState, dt: number): void {
  for (let i = s.projectiles.length - 1; i >= 0; i--) {
    const p = s.projectiles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;

    if (p.trail && p.fromPlayer && Math.random() < 0.6) {
      s.particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.2, maxLife: 0.2, color: p.color, size: p.charged ? 3 : 2 });
    }

    if (p.life <= 0) { s.projectiles.splice(i, 1); continue; }

    const cx = s.screenW / 2, cy = s.screenH / 2;
    if (Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2) > IGB.ARENA_RADIUS + 20) { s.projectiles.splice(i, 1); continue; }

    if (p.fromPlayer) {
      for (let j = s.enemies.length - 1; j >= 0; j--) {
        const e = s.enemies[j];
        if (e.phaseTimer > 0 || e.spawnImmunity > 0) continue; // immune
        if (Math.sqrt((p.x - e.x) ** 2 + (p.y - e.y) ** 2) < p.radius + e.radius) {
          let hitDmg = p.dmg;
          if (e.shieldedTimer > 0) { hitDmg *= 0.5; s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 15, text: "RESIST", life: 0.4, color: 0x4488cc, scale: 0.8 }); }
          e.hp -= hitDmg; e.stunTimer = 0.1; e.flashTimer = 0.15;
          s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 5, text: `-${Math.round(hitDmg)}`, life: 0.6, color: IGB.COLOR_GOLD, scale: 1 });

          // Knockback
          const kbForce = p.charged ? IGB.CHARGE_KNOCKBACK : IGB.KNOCKBACK_BASE;
          const kdx = e.x - p.x, kdy = e.y - p.y;
          const kd = Math.sqrt(kdx * kdx + kdy * kdy);
          if (kd > 0.1) { e.x += (kdx / kd) * kbForce * 0.3; e.y += (kdy / kd) * kbForce * 0.3; }

          for (let k = 0; k < 4; k++) s.particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150, life: 0.3, maxLife: 0.3, color: p.color, size: 2 });

          if (e.hp <= 0) { _killEnemy(s, j); if (j <= i) { /* array shifted */ } }

          if (p.pierce > 0) { p.pierce--; p.dmg *= 0.7; }
          else { s.projectiles.splice(i, 1); break; }
        }
      }
    } else {
      if (Math.sqrt((p.x - s.px) ** 2 + (p.y - s.py) ** 2) < p.radius + IGB.PLAYER_RADIUS) {
        // Shield reflect
        if (s.shielding && s.energy >= 10 && s.virtues[Virtue.COURTESY] >= IGB.SHIELD_REFLECT_THRESHOLD) {
          s.energy -= 10;
          p.fromPlayer = true;
          p.dmg *= IGB.SHIELD_REFLECT_DMG_MULT;
          p.vx = -p.vx; p.vy = -p.vy;
          p.color = IGB.COLOR_SHIELD;
          p.life = 0.8;
          s.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.2, maxLife: 0.2, color: IGB.COLOR_SHIELD, size: 8 });
          continue;
        }
        let dmg = p.dmg;
        if (s.shielding && s.energy > 0) { dmg *= (1 - IGB.SHIELD_BLOCK * Math.min(1, 1 + s.virtues[Virtue.COURTESY] * IGB.VIRTUE_BONUS_PER_STACK * 3)); }
        if (s.invulnTimer <= 0) {
          s.hp -= dmg; s.invulnTimer = IGB.INVULN_ON_HIT; s.screenShake = Math.max(s.screenShake, 3);
          s.floatingTexts.push({ x: s.px, y: s.py - 20, text: `-${Math.round(dmg)}`, life: 0.8, color: IGB.COLOR_HP, scale: 1 });
        }
        s.projectiles.splice(i, 1);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Update shockwaves
// ---------------------------------------------------------------------------

export function updateShockwaves(s: IgwaineState, dt: number): void {
  for (let i = s.shockwaves.length - 1; i >= 0; i--) {
    const sw = s.shockwaves[i];
    sw.life -= dt;
    sw.radius = sw.maxRadius * (1 - sw.life / sw.maxLife);
    if (sw.life <= 0) { s.shockwaves.splice(i, 1); continue; }

    if (sw.fromPlayer) {
      for (let j = s.enemies.length - 1; j >= 0; j--) {
        if (sw.hit.has(j)) continue;
        const e = s.enemies[j];
        if (Math.sqrt((e.x - sw.x) ** 2 + (e.y - sw.y) ** 2) < sw.radius + e.radius) {
          sw.hit.add(j);
          e.hp -= sw.dmg; e.stunTimer = 0.3; e.flashTimer = 0.2;
          // Knockback from shockwave center
          const kdx = e.x - sw.x, kdy = e.y - sw.y, kd = Math.sqrt(kdx * kdx + kdy * kdy);
          if (kd > 0.1) { e.x += (kdx / kd) * 50; e.y += (kdy / kd) * 50; }
          s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 5, text: `-${Math.round(sw.dmg)}`, life: 0.8, color: IGB.COLOR_SOLAR_FLARE, scale: 1.2 });
          if (e.hp <= 0) _killEnemy(s, j);
        }
      }
    } else {
      if (!sw.hit.has(-1) && Math.sqrt((s.px - sw.x) ** 2 + (s.py - sw.y) ** 2) < sw.radius + IGB.PLAYER_RADIUS) {
        sw.hit.add(-1);
        if (s.invulnTimer <= 0) {
          let dmg = sw.dmg;
          if (s.shielding && s.energy > 0) dmg *= 0.3;
          s.hp -= dmg; s.invulnTimer = IGB.INVULN_ON_HIT; s.screenShake = Math.max(s.screenShake, 6);
          s.floatingTexts.push({ x: s.px, y: s.py - 20, text: `-${Math.round(dmg)}`, life: 0.8, color: IGB.COLOR_HP, scale: 1 });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Kill enemy — combo, score, drops, revenant split
// ---------------------------------------------------------------------------

function _killEnemy(s: IgwaineState, idx: number): void {
  const e = s.enemies[idx];

  s.combo++; s.comboTimer = IGB.COMBO_DECAY;
  if (s.combo > s.bestCombo) s.bestCombo = s.combo;

  // Kill streak
  s.streakCount++;
  s.streakTimer = IGB.STREAK_WINDOW;
  if (s.streakCount === 2) { s.streakText = "DOUBLE KILL"; s.streakTextTimer = 1.2; }
  else if (s.streakCount === 3) { s.streakText = "TRIPLE KILL"; s.streakTextTimer = 1.5; }
  else if (s.streakCount === 4) { s.streakText = "QUAD KILL"; s.streakTextTimer = 1.5; }
  else if (s.streakCount >= 5) { s.streakText = "RAMPAGE!"; s.streakTextTimer = 2.0; s.screenFlashTimer = 0.15; s.screenFlashColor = IGB.COLOR_COMBO; }

  // Slow-mo on combo milestones
  if (s.combo === 5 || s.combo === 10 || s.combo === 15 || s.combo === 20) {
    s.slowMoTimer = IGB.SLOWMO_DURATION;
    s.slowMoFactor = IGB.SLOWMO_FACTOR;
  }

  // Combo milestone rewards — tangible benefits for maintaining combos
  if (s.combo >= IGB.COMBO_MILESTONE_1 && s.lastComboReward < IGB.COMBO_MILESTONE_1) {
    s.lastComboReward = IGB.COMBO_MILESTONE_1;
    s.energy = Math.min(s.energy + 40, s.maxEnergy);
    s.floatingTexts.push({ x: s.px, y: s.py - 40, text: "COMBO: ENERGY BURST!", life: 1.5, color: IGB.COLOR_ENERGY, scale: 1.3 });
    s.screenFlashTimer = 0.1; s.screenFlashColor = IGB.COLOR_ENERGY;
  }
  if (s.combo >= IGB.COMBO_MILESTONE_2 && s.lastComboReward < IGB.COMBO_MILESTONE_2) {
    s.lastComboReward = IGB.COMBO_MILESTONE_2;
    const heal = Math.round(s.maxHp * 0.2);
    s.hp = Math.min(s.hp + heal, s.maxHp);
    s.floatingTexts.push({ x: s.px, y: s.py - 40, text: `COMBO: HEAL +${heal}!`, life: 1.5, color: 0x44ff44, scale: 1.3 });
    s.screenFlashTimer = 0.1; s.screenFlashColor = 0x44ff44;
  }
  if (s.combo >= IGB.COMBO_MILESTONE_3 && s.lastComboReward < IGB.COMBO_MILESTONE_3) {
    s.lastComboReward = IGB.COMBO_MILESTONE_3;
    s.invulnTimer = Math.max(s.invulnTimer, 1.0);
    s.shockwaves.push({ x: s.px, y: s.py, radius: 0, maxRadius: 150, life: 0.5, maxLife: 0.5, color: IGB.COLOR_COMBO, dmg: 30, fromPlayer: true, hit: new Set() });
    s.floatingTexts.push({ x: s.px, y: s.py - 40, text: "COMBO: NOVA + INVULN!", life: 2.0, color: IGB.COLOR_COMBO, scale: 1.6 });
    s.screenFlashTimer = 0.15; s.screenFlashColor = IGB.COLOR_COMBO;
    s.screenShake = Math.max(s.screenShake, 8);
    for (let i = 0; i < 20; i++) {
      const a = (Math.PI * 2 * i) / 20;
      s.particles.push({ x: s.px, y: s.py, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, maxLife: 0.5, color: IGB.COLOR_COMBO, size: 4 });
    }
  }

  // Screen flash on boss kill
  if (e.kind === EnemyKind.GREEN_KNIGHT) {
    s.screenFlashTimer = 0.3;
    s.screenFlashColor = IGB.COLOR_GREEN_KNIGHT;
  }

  const sunBright = s.eclipseTimer > 0 ? 0 : getSunBrightness(s.sunPhase);
  const comboMult = 1 + s.combo * IGB.COMBO_SCORE_MULT;
  const nightMult = sunBright < 0.3 ? IGB.NIGHT_KILL_BONUS : 1;
  const bossBonus = e.kind === EnemyKind.GREEN_KNIGHT ? 3 : 1;
  const cursedMult = s.waveModifier === WaveModifier.CURSED ? 2 : 1;
  const goldenHourMult = s.goldenHourTimer > 0 ? 1.5 : 1;
  const totalScore = Math.round(e.maxHp * bossBonus * comboMult * nightMult * cursedMult * goldenHourMult);

  s.score += totalScore; s.kills++;
  s.screenShake = Math.max(s.screenShake, e.kind === EnemyKind.GREEN_KNIGHT ? 10 : 3);

  let scoreText = `+${totalScore}`;
  let scoreScale = 1;
  if (s.combo >= 3) { scoreText += ` x${s.combo}`; scoreScale = 1 + Math.min(s.combo * 0.1, 0.8); }
  if (nightMult > 1) scoreText += " NIGHT!";
  s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 15, text: scoreText, life: 1.0, color: s.combo >= 5 ? IGB.COLOR_COMBO : IGB.COLOR_GOLD, scale: scoreScale });

  const burstCount = e.kind === EnemyKind.GREEN_KNIGHT ? 24 : 12;
  for (let i = 0; i < burstCount; i++) {
    const a = (Math.PI * 2 * i) / burstCount;
    const spd = e.kind === EnemyKind.GREEN_KNIGHT ? 180 : 120;
    s.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * spd + (Math.random() - 0.5) * 40, vy: Math.sin(a) * spd + (Math.random() - 0.5) * 40, life: 0.5, maxLife: 0.5, color: e.color, size: e.kind === EnemyKind.GREEN_KNIGHT ? 6 : 4 });
  }

  // Soul ascending effect (vertical particles rising)
  const soulCount = e.kind === EnemyKind.GREEN_KNIGHT ? 6 : 3;
  for (let si = 0; si < soulCount; si++) {
    s.particles.push({
      x: e.x + (Math.random() - 0.5) * e.radius, y: e.y,
      vx: (Math.random() - 0.5) * 15, vy: -80 - Math.random() * 60,
      life: 0.7 + Math.random() * 0.3, maxLife: 1.0,
      color: e.kind === EnemyKind.GREEN_KNIGHT ? 0x88ff88 : _lerpColor(e.color, 0xffffff, 0.4),
      size: e.kind === EnemyKind.GREEN_KNIGHT ? 3 : 2,
    });
  }

  // Wave modifier: volatile — enemies explode on death
  if (s.waveModifier === WaveModifier.VOLATILE) {
    s.shockwaves.push({ x: e.x, y: e.y, radius: 0, maxRadius: 50, life: 0.3, maxLife: 0.3, color: 0xff4422, dmg: 8, fromPlayer: true, hit: new Set() });
  }

  // Perk: lifesteal (Juggernaut synergy = 2x heal)
  const lifestealCount = _perkCount(s, PerkId.LIFESTEAL);
  if (lifestealCount > 0) {
    const lsHeal = 2 * lifestealCount * (hasSynergy(s, "Juggernaut") ? 2 : 1);
    s.hp = Math.min(s.hp + lsHeal, s.maxHp);
  }

  // Perk: dash reset on kill
  const dashResetCount = _perkCount(s, PerkId.DASH_RESET_ON_KILL);
  if (dashResetCount > 0) s.dashCd = Math.max(0, s.dashCd - 0.8 * dashResetCount);

  // Perk: explosion on kill (Artillery synergy = 50% bigger)
  const explosionCount = _perkCount(s, PerkId.EXPLOSION_ON_KILL);
  if (explosionCount > 0) {
    const artilleryMult = hasSynergy(s, "Artillery") ? 1.5 : 1;
    s.shockwaves.push({ x: e.x, y: e.y, radius: 0, maxRadius: (40 + explosionCount * 15) * artilleryMult, life: 0.25, maxLife: 0.25, color: 0xff4422, dmg: 10 * explosionCount, fromPlayer: true, hit: new Set() });
  }

  // Perk: chain lightning — arcs to nearby enemies
  const chainCount = _perkCount(s, PerkId.CHAIN_LIGHTNING);
  if (chainCount > 0) {
    const maxChains = IGB.CHAIN_LIGHTNING_CHAINS + (chainCount - 1);
    const chainDmg = IGB.CHAIN_LIGHTNING_DMG * chainCount;
    const hit = new Set<number>();
    let lastX = e.x, lastY = e.y;
    for (let ci = 0; ci < maxChains && s.enemies.length > 0; ci++) {
      let closest = -1, closestDist: number = IGB.CHAIN_LIGHTNING_RANGE;
      for (let j = 0; j < s.enemies.length; j++) {
        if (hit.has(j)) continue;
        const ce = s.enemies[j];
        if (ce.spawnImmunity > 0) continue;
        const cdx = ce.x - lastX, cdy = ce.y - lastY;
        const cd = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cd < closestDist) { closest = j; closestDist = cd; }
      }
      if (closest < 0) break;
      hit.add(closest);
      const target = s.enemies[closest];
      // Lightning visual particles along the arc
      const dx = target.x - lastX, dy = target.y - lastY;
      const steps = 4;
      for (let pi = 0; pi < steps; pi++) {
        const t = (pi + 1) / steps;
        s.particles.push({ x: lastX + dx * t + (Math.random() - 0.5) * 12, y: lastY + dy * t + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.25, maxLife: 0.25, color: IGB.COLOR_CHAIN_LIGHTNING, size: 3 });
      }
      target.hp -= chainDmg;
      target.flashTimer = 0.15;
      target.stunTimer = Math.max(target.stunTimer, 0.15);
      s.floatingTexts.push({ x: target.x, y: target.y - target.radius - 5, text: `⚡-${Math.round(chainDmg)}`, life: 0.6, color: IGB.COLOR_CHAIN_LIGHTNING, scale: 1.0 });
      if (target.hp <= 0) { _killEnemy(s, closest); }
      lastX = target.x; lastY = target.y;
    }
  }

  // Perk: thorns
  const thornsCount = _perkCount(s, PerkId.THORNS);
  // (thorns applied in melee hit, handled there)

  // Elite kill bonus — guaranteed HP orb + virtue drop + extra score
  if (e.elite) {
    s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 30, text: "ELITE SLAIN!", life: 1.2, color: IGB.COLOR_ELITE, scale: 1.4 });
    s.score += Math.round(e.maxHp * IGB.ELITE_SCORE_MULT);
    s.hpOrbs.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y + (Math.random() - 0.5) * 10, healAmount: IGB.HP_ORB_HEAL * 2, life: IGB.HP_ORB_LIFE });
    s.virtuePickups.push({ x: e.x, y: e.y, virtue: _pickSmartVirtue(s), life: IGB.VIRTUE_DURATION });
    s.screenFlashTimer = 0.12;
    s.screenFlashColor = IGB.COLOR_ELITE;
  }

  // HP orb drop
  if (Math.random() < IGB.HP_ORB_DROP_CHANCE) {
    s.hpOrbs.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y + (Math.random() - 0.5) * 10, healAmount: IGB.HP_ORB_HEAL, life: IGB.HP_ORB_LIFE });
  }

  // Virtue drop — biased toward your lowest virtue to enable pentangle synergy
  if (Math.random() < IGB.VIRTUE_DROP_CHANCE || e.kind === EnemyKind.GREEN_KNIGHT) {
    s.virtuePickups.push({ x: e.x, y: e.y, virtue: _pickSmartVirtue(s), life: IGB.VIRTUE_DURATION });
    if (e.kind === EnemyKind.GREEN_KNIGHT) {
      s.virtuePickups.push({ x: e.x + 15, y: e.y + 10, virtue: _pickSmartVirtue(s), life: IGB.VIRTUE_DURATION });
    }
  }

  // Level-up check
  s.killsToLevel--;
  if (s.killsToLevel <= 0) {
    _triggerLevelUp(s);
  }

  // Revenant split
  if (e.splitCount > 0) {
    const childHp = e.maxHp * IGB.REVENANT_SPLIT_HP_RATIO;
    const childRadius = e.radius * IGB.REVENANT_SPLIT_SIZE_RATIO;
    for (let si = 0; si < 2; si++) {
      const splitAngle = Math.random() * Math.PI * 2;
      const child: Enemy = {
        x: e.x + Math.cos(splitAngle) * 15, y: e.y + Math.sin(splitAngle) * 15,
        vx: Math.cos(splitAngle) * 60, vy: Math.sin(splitAngle) * 60,
        hp: childHp, maxHp: childHp, kind: EnemyKind.REVENANT, ai: EnemyAI.CHASE,
        speed: e.speed * 1.15, dmg: e.dmg * 0.6, radius: childRadius,
        attackCd: e.attackCd * 0.8, attackTimer: e.attackCd * Math.random(),
        color: _lerpColor(e.color, 0xccaa66, 0.3), regenRate: 0,
        stunTimer: 0.2, flashTimer: 0.15,
        circleAngle: Math.random() * Math.PI * 2,
        shootCd: 0, shootTimer: 0,
        chargeTimer: 0, chargeCd: 99, charging: false, chargeTargetX: 0, chargeTargetY: 0,
        slamCd: 99, slamTimer: 0, spawnFlash: 0.3,
        splitCount: e.splitCount - 1,
        bossShootCd: 99, bossSummonCd: 99,
        phaseTimer: 0, phaseCd: 99,
        spawnImmunity: 0.3, shieldedTimer: 0,
        screamCd: 99, teleportCd: 99,
        elite: false, enraged: false,
      };
      s.enemies.push(child);
    }
    s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 25, text: "SPLIT!", life: 0.6, color: IGB.COLOR_REVENANT, scale: 1.1 });
  }

  s.enemies.splice(idx, 1);
  s.enemiesRemaining = s.enemies.length;
}

// ---------------------------------------------------------------------------
// Update virtue pickups
// ---------------------------------------------------------------------------

export function updateVirtuePickups(s: IgwaineState, dt: number): void {
  for (let i = s.virtuePickups.length - 1; i >= 0; i--) {
    const vp = s.virtuePickups[i];
    // Pilgrim synergy — virtue pickups decay at half rate
    vp.life -= dt * (hasSynergy(s, "Pilgrim") ? 0.5 : 1);
    if (vp.life <= 0) { s.virtuePickups.splice(i, 1); continue; }

    const dx = s.px - vp.x, dy = s.py - vp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const magnetRange = 60 + _perkCount(s, PerkId.MAGNETIC_RANGE) * 40;
    if (dist < magnetRange && dist > 2) {
      const pull = 120 / dist;
      vp.x += (dx / dist) * pull * dt * 60;
      vp.y += (dy / dist) * pull * dt * 60;
    }

    if (dist < IGB.PLAYER_RADIUS + 16) {
      const stacks = isDoubleVirtue(s) ? 2 : 1;
      s.virtues[vp.virtue] += stacks;
      const label = stacks > 1 ? `+${stacks} ${vp.virtue.toUpperCase()}` : `+${vp.virtue.toUpperCase()}`;
      s.floatingTexts.push({ x: vp.x, y: vp.y - 15, text: label, life: 1.2, color: VIRTUE_COLORS[vp.virtue], scale: stacks > 1 ? 1.3 : 1.1 });
      if (vp.virtue === Virtue.PIETY) s.hp = Math.min(s.hp + 10 * stacks, s.maxHp);
      if (vp.virtue === Virtue.GENEROSITY) s.energy = Math.min(s.energy + 15 * stacks, s.maxEnergy);
      s.virtuePickups.splice(i, 1);

      tryPentangleSynergy(s);
    }
  }
}

// ---------------------------------------------------------------------------
// Update timers & regen
// ---------------------------------------------------------------------------

export function updateTimers(s: IgwaineState, dt: number): void {
  s.gameTime += dt;
  if (s.eclipseTimer <= 0 && s.waveModifier !== WaveModifier.MOONLIT) s.sunPhase = (s.sunPhase + s.sunSpeed * dt) % 1;
  if (s.waveModifier === WaveModifier.MOONLIT && s.eclipseTimer <= 0) s.sunPhase = 0;
  if (s.attackCd > 0) s.attackCd -= dt;
  if (s.dashCd > 0) s.dashCd -= dt;
  if (s.invulnTimer > 0) s.invulnTimer -= dt;
  if (s.solarFlareCd > 0) s.solarFlareCd -= dt;
  if (s.pentangleSynergyCd > 0) s.pentangleSynergyCd -= dt;
  if (s.pentangleBurstTimer > 0) s.pentangleBurstTimer -= dt;
  if (s.waveAnnounceTimer > 0) s.waveAnnounceTimer -= dt;
  if (s.waveClearBonusTimer > 0) s.waveClearBonusTimer -= dt;
  if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - IGB.SHAKE_DECAY * dt);

  if (s.combo > 0) { s.comboTimer -= dt; if (s.comboTimer <= 0) { s.combo = 0; s.comboTimer = 0; s.lastComboReward = 0; } }

  // Kill streak decay
  if (s.streakTimer > 0) { s.streakTimer -= dt; if (s.streakTimer <= 0) { s.streakCount = 0; } }
  if (s.streakTextTimer > 0) s.streakTextTimer -= dt;

  // Slow-mo decay
  if (s.slowMoTimer > 0) { s.slowMoTimer -= dt; if (s.slowMoTimer <= 0) { s.slowMoFactor = 1; } }

  // Screen flash decay
  if (s.screenFlashTimer > 0) s.screenFlashTimer -= dt;

  // Stun timer (player stun from bash)
  if (s.stunTimer > 0) s.stunTimer -= dt;

  // Fear timer (Banshee scream)
  if (s.fearTimer > 0) { s.fearTimer -= dt; if (s.fearTimer <= 0) { s.fearTimer = 0; s.fearSlowFactor = 1; } }

  // Riposte window decay
  if (s.riposteWindow > 0) s.riposteWindow -= dt;
  if (s.riposteFlashTimer > 0) s.riposteFlashTimer -= dt;

  // Orbital Blades rotation (Blademaster synergy = 50% faster + 50% more damage)
  const bladeCount = _perkCount(s, PerkId.ORBITAL_BLADES);
  if (bladeCount > 0) {
    const bmSynergy = hasSynergy(s, "Blademaster");
    s.orbitalAngle += IGB.ORBITAL_BLADE_SPEED * (bmSynergy ? 1.5 : 1) * dt;
    // Damage enemies touching orbital blades
    const bladeTotal = bladeCount + 1; // 2 blades base, +1 per extra stack
    for (let bi = 0; bi < bladeTotal; bi++) {
      const ba = s.orbitalAngle + (Math.PI * 2 * bi) / bladeTotal;
      const bx = s.px + Math.cos(ba) * IGB.ORBITAL_BLADE_RADIUS;
      const by = s.py + Math.sin(ba) * IGB.ORBITAL_BLADE_RADIUS;
      for (const e of s.enemies) {
        if (e.spawnImmunity > 0 || e.phaseTimer > 0) continue;
        const edx = e.x - bx, edy = e.y - by;
        const ed = Math.sqrt(edx * edx + edy * edy);
        if (ed < e.radius + 6) {
          // Use stunTimer as hit cooldown check (if >0.3, was recently hit by blade)
          if (e.flashTimer <= 0) {
            const bladeDmg = IGB.ORBITAL_BLADE_DMG * bladeCount * (bmSynergy ? 1.5 : 1);
            e.hp -= bladeDmg;
            e.flashTimer = IGB.ORBITAL_BLADE_HIT_CD;
            s.floatingTexts.push({ x: e.x, y: e.y - e.radius - 5, text: `-${Math.round(bladeDmg)}`, life: 0.4, color: IGB.COLOR_ORBITAL, scale: 0.9 });
            // Small spark
            s.particles.push({ x: bx, y: by, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.2, maxLife: 0.2, color: IGB.COLOR_ORBITAL, size: 3 });
          }
        }
      }
    }
  }

  // Golden Hour — triggers during dawn/dusk transitions
  if (s.goldenHourTimer > 0) {
    s.goldenHourTimer -= dt;
    if (s.goldenHourTimer <= 0) { s.goldenHourTimer = 0; s.goldenHourTriggered = false; }
  }
  if (s.eclipseTimer <= 0 && s.goldenHourTimer <= 0) {
    const sunBr = getSunBrightness(s.sunPhase);
    // Dawn/dusk is when brightness crosses ~0.5
    const isDawnDusk = sunBr > 0.4 && sunBr < 0.6;
    if (isDawnDusk && !s.goldenHourTriggered) {
      s.goldenHourTriggered = true;
      s.goldenHourTimer = IGB.GOLDEN_HOUR_DURATION;
      s.screenFlashTimer = 0.15;
      s.screenFlashColor = IGB.COLOR_GOLDEN_HOUR;
      s.floatingTexts.push({ x: s.screenW / 2, y: s.screenH / 2 - 50, text: "GOLDEN HOUR!", life: 2.0, color: IGB.COLOR_GOLDEN_HOUR, scale: 1.5 });
    } else if (!isDawnDusk) {
      s.goldenHourTriggered = false; // reset so it can trigger again next transition
    }
  }

  const sunBright = s.eclipseTimer > 0 ? 0 : getSunBrightness(s.sunPhase);
  s.solarFlareReady = sunBright >= IGB.SOLAR_FLARE_THRESHOLD && s.solarFlareCd <= 0 && s.energy >= IGB.SOLAR_FLARE_ENERGY_COST;

  // Pentangle readiness
  const allV = Object.values(Virtue);
  s.pentangleSynergyReady = allV.every(v => s.virtues[v] >= 1) && s.pentangleSynergyCd <= 0;

  const eRegenBonus = 1 + s.virtues[Virtue.GENEROSITY] * IGB.VIRTUE_BONUS_PER_STACK * 5;
  const goldenEnergyMult = s.goldenHourTimer > 0 ? IGB.GOLDEN_HOUR_ENERGY_REGEN_MULT : 1;
  const eRegen = IGB.ENERGY_REGEN * (0.5 + sunBright) * eRegenBonus * goldenEnergyMult;
  if (s.shielding) {
    s.energy -= IGB.SHIELD_DRAIN * dt;
    if (s.energy <= 0) { s.energy = 0; s.shielding = false; }
  } else {
    s.energy = Math.min(s.energy + eRegen * dt, s.maxEnergy);
  }

  const pietyRegen = s.virtues[Virtue.PIETY] * 1.5;
  if (pietyRegen > 0) s.hp = Math.min(s.hp + pietyRegen * dt, s.maxHp);
}

export function updateParticles(s: IgwaineState, dt: number): void {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= 0.95; p.vy *= 0.95;
    if (p.life <= 0) s.particles.splice(i, 1);
  }
  for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
    const ft = s.floatingTexts[i];
    ft.y -= 30 * dt; ft.life -= dt;
    if (ft.life <= 0) s.floatingTexts.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Wave management — with wave clear bonus
// ---------------------------------------------------------------------------

export function updateWaveLogic(s: IgwaineState, dt: number): boolean {
  if (s.enemies.length === 0 && s.phase === IgwainePhase.PLAYING) {
    // Wave clear bonus — fire once when wave first clears
    if (s.wave > 0 && s.waveClearBonusTimer <= 0 && s.waveDelay >= IGB.WAVE_DELAY - 0.05) {
      const bonus = IGB.WAVE_CLEAR_BONUS_BASE + s.wave * IGB.WAVE_CLEAR_BONUS_SCALE;
      s.score += bonus;
      s.waveClearBonusTimer = 1.2;
      s.floatingTexts.push({ x: s.screenW / 2, y: s.screenH / 2 + 30, text: `WAVE CLEAR +${bonus}`, life: 1.2, color: IGB.COLOR_GOLD, scale: 1.3 });
    }

    s.waveDelay -= dt;
    if (s.waveDelay <= 0) {
      spawnWave(s);
      s.waveDelay = IGB.WAVE_DELAY;
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Arena hazards
// ---------------------------------------------------------------------------

export function updateHazards(s: IgwaineState, dt: number): void {
  const cx = s.screenW / 2, cy = s.screenH / 2;
  for (const h of s.hazards) {
    h.angle += h.rotSpeed * dt;

    // Check if player is in hazard zone
    const pdx = s.px - cx, pdy = s.py - cy;
    const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
    if (pDist >= h.innerRadius && pDist <= h.outerRadius) {
      let pAngle = Math.atan2(pdy, pdx) - h.angle;
      // Normalize angle to [-PI, PI]
      while (pAngle > Math.PI) pAngle -= Math.PI * 2;
      while (pAngle < -Math.PI) pAngle += Math.PI * 2;
      if (Math.abs(pAngle) < h.arcWidth / 2) {
        if (s.invulnTimer <= 0 && !s.shielding) {
          s.hp -= h.dmg * dt;
          if (Math.random() < 0.1) s.floatingTexts.push({ x: s.px, y: s.py - 15, text: "BURN!", life: 0.4, color: 0xff4411, scale: 0.9 });
        }
      }
    }

    // Check enemies in hazard
    for (const e of s.enemies) {
      const edx = e.x - cx, edy = e.y - cy;
      const eDist = Math.sqrt(edx * edx + edy * edy);
      if (eDist >= h.innerRadius && eDist <= h.outerRadius) {
        let eAngle = Math.atan2(edy, edx) - h.angle;
        while (eAngle > Math.PI) eAngle -= Math.PI * 2;
        while (eAngle < -Math.PI) eAngle += Math.PI * 2;
        if (Math.abs(eAngle) < h.arcWidth / 2) {
          e.hp -= h.dmg * dt * 0.5; // enemies take half
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// HP orbs
// ---------------------------------------------------------------------------

export function updateHpOrbs(s: IgwaineState, dt: number): void {
  const magnetRange = 60 + _perkCount(s, PerkId.MAGNETIC_RANGE) * 40;
  for (let i = s.hpOrbs.length - 1; i >= 0; i--) {
    const orb = s.hpOrbs[i];
    orb.life -= dt;
    if (orb.life <= 0) { s.hpOrbs.splice(i, 1); continue; }

    const dx = s.px - orb.x, dy = s.py - orb.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < magnetRange && dist > 2) {
      const pull = 100 / dist;
      orb.x += (dx / dist) * pull * dt * 60;
      orb.y += (dy / dist) * pull * dt * 60;
    }
    if (dist < IGB.PLAYER_RADIUS + IGB.HP_ORB_RADIUS) {
      s.hp = Math.min(s.hp + orb.healAmount, s.maxHp);
      s.floatingTexts.push({ x: orb.x, y: orb.y - 10, text: `+${orb.healAmount}`, life: 0.6, color: 0x44ff44, scale: 0.9 });
      s.hpOrbs.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Level-up / Perk system
// ---------------------------------------------------------------------------

function _perkCount(s: IgwaineState, id: PerkId): number {
  return s.perkCounts[id] ?? 0;
}

function _triggerLevelUp(s: IgwaineState): void {
  s.level++;
  s.killsToLevel = IGB.KILLS_PER_LEVEL + s.level * 2;
  s.screenFlashTimer = 0.2;
  s.screenFlashColor = IGB.COLOR_GOLD;

  // Pick 3 random perks (no duplicates in the same choice)
  const shuffled = [...ALL_PERKS].sort(() => Math.random() - 0.5);
  const options = shuffled.slice(0, IGB.PERK_CHOICES);
  s.perkChoice = { options };
  // Game pauses during perk selection (handled in orchestrator)
}

export function selectPerk(s: IgwaineState, index: number): void {
  if (!s.perkChoice || index < 0 || index >= s.perkChoice.options.length) return;
  const perk = s.perkChoice.options[index];
  s.perks.push(perk.id);
  s.perkCounts[perk.id] = (s.perkCounts[perk.id] ?? 0) + 1;
  s.perkChoice = null;

  // Apply immediate effects
  _applyPerk(s, perk.id);

  s.floatingTexts.push({ x: s.screenW / 2, y: s.screenH / 2 - 20, text: perk.name.toUpperCase(), life: 1.5, color: perk.color, scale: 1.5 });

  // Check perk synergies after every perk pick
  _checkPerkSynergies(s);
}

function _checkPerkSynergies(s: IgwaineState): void {
  const prev = s.activeSynergies.length;
  s.activeSynergies = [];

  // Synergy: Stormcaller (Chain Lightning + Proj Speed + ATK Speed)
  // → Projectiles chain even without kills (on hit, 30% chance to arc)
  if (_perkCount(s, PerkId.CHAIN_LIGHTNING) > 0 && _perkCount(s, PerkId.PROJ_SPEED) > 0 && _perkCount(s, PerkId.ATK_SPEED) > 0) {
    s.activeSynergies.push("Stormcaller");
  }

  // Synergy: Juggernaut (MAX_HP + Thorns + Lifesteal)
  // → Thorns deals 3x damage, lifesteal heals 2x
  if (_perkCount(s, PerkId.MAX_HP) > 0 && _perkCount(s, PerkId.THORNS) > 0 && _perkCount(s, PerkId.LIFESTEAL) > 0) {
    s.activeSynergies.push("Juggernaut");
  }

  // Synergy: Artillery (Proj Size + Explosion on Kill + Orbital Blades)
  // → Explosions are 50% bigger
  if (_perkCount(s, PerkId.PROJ_SIZE) > 0 && _perkCount(s, PerkId.EXPLOSION_ON_KILL) > 0 && _perkCount(s, PerkId.ORBITAL_BLADES) > 0) {
    s.activeSynergies.push("Artillery");
  }

  // Synergy: Pilgrim (Double Virtue + Magnetic Range + Solar Intensity)
  // → Virtue pickups last twice as long
  if (_perkCount(s, PerkId.DOUBLE_VIRTUE) > 0 && _perkCount(s, PerkId.MAGNETIC_RANGE) > 0 && _perkCount(s, PerkId.SOLAR_INTENSITY) > 0) {
    s.activeSynergies.push("Pilgrim");
  }

  // Synergy: Blademaster (ATK Speed + Dash Reset + Orbital Blades)
  // → Orbital blades spin 50% faster and deal 50% more damage
  if (_perkCount(s, PerkId.ATK_SPEED) > 0 && _perkCount(s, PerkId.DASH_RESET_ON_KILL) > 0 && _perkCount(s, PerkId.ORBITAL_BLADES) > 0) {
    s.activeSynergies.push("Blademaster");
  }

  // Announce new synergies
  for (const syn of s.activeSynergies) {
    if (prev === 0 || !s.activeSynergies.includes(syn)) {
      // This is newly activated
    }
  }
  if (s.activeSynergies.length > prev) {
    const newest = s.activeSynergies[s.activeSynergies.length - 1];
    s.floatingTexts.push({ x: s.screenW / 2, y: s.screenH / 2 + 20, text: `SYNERGY: ${newest.toUpperCase()}!`, life: 2.5, color: IGB.COLOR_SYNERGY, scale: 1.6 });
    s.screenFlashTimer = 0.2;
    s.screenFlashColor = IGB.COLOR_SYNERGY;
    s.screenShake = Math.max(s.screenShake, 5);
  }
}

/** Check if a synergy is active */
export function hasSynergy(s: IgwaineState, name: string): boolean {
  return s.activeSynergies.includes(name);
}

function _applyPerk(s: IgwaineState, id: PerkId): void {
  switch (id) {
    case PerkId.MAX_HP:
      s.maxHp += 20;
      s.hp = s.maxHp;
      break;
    case PerkId.MAX_ENERGY:
      s.maxEnergy += 25;
      s.energy = s.maxEnergy;
      break;
    case PerkId.SOLAR_INTENSITY:
      // Handled dynamically in getSunPower
      break;
    default:
      // Most perks are passive, checked at point of use via _perkCount
      break;
  }
}

// Perk-modified getters (exported for use in attack/render)
export function getEffectiveAttackCd(s: IgwaineState): number {
  const atkSpeedMult = Math.pow(0.85, _perkCount(s, PerkId.ATK_SPEED));
  return IGB.PLAYER_ATTACK_CD * atkSpeedMult;
}

export function getEffectiveProjRadius(s: IgwaineState): number {
  return IGB.PLAYER_PROJ_RADIUS * (1 + _perkCount(s, PerkId.PROJ_SIZE) * 0.25);
}

export function getEffectiveProjSpeed(s: IgwaineState): number {
  return IGB.PLAYER_PROJ_SPEED * (1 + _perkCount(s, PerkId.PROJ_SPEED) * 0.2);
}

export function getEffectiveSunPower(s: IgwaineState): number {
  const solarCount = _perkCount(s, PerkId.SOLAR_INTENSITY);
  const minPow = Math.max(0.2, IGB.SUN_POWER_MIN - solarCount * 0.15);
  const maxPow = IGB.SUN_POWER_MAX + solarCount * 0.5;
  const noon = Math.sin(s.sunPhase * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  return minPow + noon * (maxPow - minPow);
}

export function isDoubleVirtue(s: IgwaineState): boolean {
  return _perkCount(s, PerkId.DOUBLE_VIRTUE) > 0;
}

function _applyWaveModifier(e: Enemy, mod: WaveModifier): void {
  switch (mod) {
    case WaveModifier.SWIFT: e.speed *= 1.4; break;
    case WaveModifier.ARMORED: e.hp *= 1.5; e.maxHp *= 1.5; break;
    case WaveModifier.VAMPIRIC: e.regenRate = e.maxHp * 0.02; break;
    case WaveModifier.SWARM: e.radius *= 0.8; e.hp *= 0.7; e.maxHp *= 0.7; break;
    case WaveModifier.SHIELDED: e.shieldedTimer = 3; break; // 3 seconds of 50% damage resist
    case WaveModifier.MOONLIT: break; // handled in sun phase
    case WaveModifier.CURSED: e.dmg *= 2; break; // enemies deal double damage
  }
}

export function checkDeath(s: IgwaineState, dt: number): boolean {
  if (s.hp <= 0 && s.phase === IgwainePhase.PLAYING) {
    s.hp = 0;
    s.deathTimer = 1.5; // death animation duration
    s.slowMoTimer = 1.5;
    s.slowMoFactor = 0.15;
    s.screenShake = 15;
    s.screenFlashTimer = 0.3;
    s.screenFlashColor = IGB.COLOR_DANGER;
    // Calculate shards earned this run
    const diffMult = s.difficulty === "hard" ? 2.0 : s.difficulty === "easy" ? 0.5 : 1.0;
    s.shardsEarned = Math.floor((s.wave * 3 + s.bestCombo + Math.floor(s.score / 500)) * diffMult);
    // Death burst from player
    for (let i = 0; i < 20; i++) {
      const a = (Math.PI * 2 * i) / 20;
      s.particles.push({ x: s.px, y: s.py, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.8, maxLife: 0.8, color: IGB.COLOR_PLAYER, size: 5 });
    }
    return true;
  }
  // Death animation timer
  if (s.deathTimer > 0) {
    s.deathTimer -= dt;
    if (s.deathTimer <= 0) {
      s.phase = IgwainePhase.DEAD;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/** 50% chance to drop your lowest virtue, 50% random — makes pentangle synergy achievable */
function _pickSmartVirtue(s: IgwaineState): Virtue {
  const allV = Object.values(Virtue);
  if (Math.random() < 0.5) {
    // Pick the virtue with the lowest count
    let lowest = allV[0], lowestCount = s.virtues[allV[0]];
    for (const v of allV) {
      if (s.virtues[v] < lowestCount) { lowest = v; lowestCount = s.virtues[v]; }
    }
    return lowest;
  }
  return allV[Math.floor(Math.random() * allV.length)];
}

function _lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
