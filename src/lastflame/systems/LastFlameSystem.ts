// ---------------------------------------------------------------------------
// The Last Flame — Core game systems (v2)
// Damage system, shadow variants, sprint, wave events, contested oil
// ---------------------------------------------------------------------------

import type { LFState, ShadowVariant, LFMeta, LFRunSummary } from "../types";
import { generateRoom, generatePillars } from "../state/LastFlameState";
import { LF } from "../config/LastFlameBalance";

// Line-of-sight check: returns true if no pillar blocks the path from (ax,ay) to (bx,by)
function hasLineOfSight(state: LFState, ax: number, ay: number, bx: number, by: number): boolean {
  const ddx = bx - ax, ddy = by - ay;
  const len = Math.sqrt(ddx * ddx + ddy * ddy);
  if (len <= 0) return true;
  const nx = ddx / len, ny = ddy / len;
  for (const p of state.pillars) {
    // Point-to-line distance from pillar center to the line (ax,ay)-(bx,by)
    const apx = p.x - ax, apy = p.y - ay;
    const proj = apx * nx + apy * ny; // projection along line
    if (proj < 0 || proj > len) continue; // pillar is behind or beyond the line segment
    const perpDist = Math.abs(apx * ny - apy * nx); // perpendicular distance
    if (perpDist < p.radius + 2) return false; // blocked
  }
  return true;
}

// ---------------------------------------------------------------------------
// Player movement + sprint
// ---------------------------------------------------------------------------

export function updatePlayer(state: LFState, dt: number, keys: Set<string>): void {
  let mx = 0, my = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) my -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) my += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) mx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
  const len = Math.sqrt(mx * mx + my * my);
  if (len > 0) { mx /= len; my /= len; }

  state.sprinting = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && len > 0;
  if (state.sprinting && !state.tutFirstSprint) { state.tutFirstSprint = true; spawnFloatText(state, state.playerX, state.playerY - 30, "Sprint is fast but burns 3x fuel!", 0xffffff, 1.0); }
  const speedMult = state.sprinting ? LF.SPRINT_SPEED_MULT : 1.0;

  let nx = state.playerX + mx * state.playerSpeed * speedMult * dt;
  let ny = state.playerY + my * state.playerSpeed * speedMult * dt;

  // Pillar collision
  for (const p of state.pillars) {
    const dx = nx - p.x, dy = ny - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < p.radius + LF.PLAYER_RADIUS) {
      const push = p.radius + LF.PLAYER_RADIUS - dist;
      nx += (dx / dist) * push;
      ny += (dy / dist) * push;
    }
  }

  // Wind hazard: push player in a constant direction (shadows unaffected)
  if (state.roomConfig.hazard === "wind") {
    nx += Math.cos(state.windAngle) * LF.WIND_FORCE * dt;
    ny += Math.sin(state.windAngle) * LF.WIND_FORCE * dt;
  }

  nx = Math.max(LF.PLAYER_RADIUS, Math.min(state.arenaW - LF.PLAYER_RADIUS, nx));
  ny = Math.max(LF.PLAYER_RADIUS, Math.min(state.arenaH - LF.PLAYER_RADIUS, ny));
  state.playerX = nx;
  state.playerY = ny;
}

// ---------------------------------------------------------------------------
// Fuel & light — with movement cost
// ---------------------------------------------------------------------------

export function updateFuel(state: LFState, dt: number, keys: Set<string>): boolean {
  // Movement costs fuel
  let mx = 0, my = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) my -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) my += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) mx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
  const moving = Math.abs(mx) + Math.abs(my) > 0;

  let drainMult = 1.0;
  // Room hazard: damp = +20% drain (applied multiplicatively)
  const dampMult = state.roomConfig.hazard === "damp" ? 1.2 : 1.0;
  if (state.sprinting) drainMult = LF.SPRINT_DRAIN_MULT * dampMult;
  else if (moving) drainMult = LF.MOVE_DRAIN_MULT * dampMult;
  else drainMult = dampMult; // standing still in damp room still gets the penalty
  if (state.flareTimer > 0) drainMult = 0; // flare cost paid upfront

  // Difficulty scaling: after wave 10, fuel drain increases by 5% per wave
  const fuelDrainScale = state.wave > 10 ? 1 + (state.wave - 10) * 0.05 : 1.0;
  state.fuel = Math.max(0, state.fuel - LF.FUEL_DRAIN_PER_SEC * dt * drainMult * fuelDrainScale);

  // Stalker effect: reduce max light radius
  const stalkerCount = state.shadows.filter(s => s.alive && s.variant === "stalker").length;
  if (stalkerCount > 0) {
    state.maxLightRadius = Math.max(LF.LIGHT_RADIUS_MIN + 30,
      state.maxLightRadius - LF.STALKER_LIGHT_DRAIN * stalkerCount * dt);
  } else {
    // Restore max light radius (speed from upgrade)
    const maxLR = state.activeMutators.includes("glass_flame") ? LF.LIGHT_RADIUS_MAX * 1.3 : LF.LIGHT_RADIUS_MAX;
    state.maxLightRadius = Math.min(maxLR, state.maxLightRadius + state.lightRecoveryRate * dt);
  }

  // Light radius
  // Desperate blaze: below 20% fuel, light doesn't shrink further
  const effectiveFuel = (state.activeMutators.includes("desperate_blaze") && state.fuel < 0.2 && state.fuel > 0) ? 0.2 : state.fuel;
  // Iron wick: 25% slower drain
  const ironWick = state.activeMutators.includes("iron_wick");
  if (ironWick) state.fuel = Math.max(0, state.fuel + LF.FUEL_DRAIN_PER_SEC * dt * drainMult * 0.25); // counteract 25%
  const baseLR = LF.LIGHT_RADIUS_MIN + (state.maxLightRadius - LF.LIGHT_RADIUS_MIN) * effectiveFuel;
  const flicker = (Math.sin(state.time * 12) * 0.5 + Math.sin(state.time * 7.3) * 0.3 + Math.sin(state.time * 19) * 0.2) * LF.LIGHT_FLICKER_AMOUNT;

  if (state.flareTimer > 0) {
    state.flareRadius = baseLR * LF.FLARE_RADIUS_MULT;
    state.lightRadius = state.flareRadius + flicker;
  } else {
    state.lightRadius = baseLR + flicker;
    state.flareRadius = 0;
  }

  // Low fuel tutorial hint
  if (state.fuel < 0.3 && !state.tutFirstLowFuel) {
    state.tutFirstLowFuel = true;
    spawnFloatText(state, state.playerX, state.playerY - 35, "Fuel low! Find oil or stand still to conserve!", LF.COLOR_DANGER, 1.2);
  }

  return state.fuel <= 0;
}

export function tryFlare(state: LFState): boolean {
  // Double flare charge system
  if (state.flareTimer > 0) return false;
  if (state.flareCharges <= 0 && state.flareCooldown > 0) return false;
  if (state.fuel < LF.FLARE_COST + 0.05) return false;

  const flareCostMult = state.activeMutators.includes("bonfire") ? 1.5 : 1.0;
  state.fuel -= LF.FLARE_COST * flareCostMult;
  state.flareTimer = LF.FLARE_DURATION;
  state.flareCharges--;
  if (state.flareCharges <= 0) {
    state.flareCooldown = state.flareCooldownBase;
  }
  state.flaresUsed++;
  if (!state.tutFirstFlare) { state.tutFirstFlare = true; spawnFloatText(state, state.playerX, state.playerY - 35, "Flare burns shadows & costs fuel!", 0xffffff, 1.0); }

  let burned = 0;
  for (const s of state.shadows) {
    if (!s.alive) continue;
    const dx = s.x - state.playerX, dy = s.y - state.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const flareRadMult = state.activeMutators.includes("bonfire") ? 1.5 : 1.0;
    if (dist < LF.FLARE_DAMAGE_RADIUS * flareRadMult) {
      s.hp--;
      if (s.hp <= 0) {
        s.alive = false;
        burned++;
        state.shadowsBurned++;
        trackCombo(state);
        if (s.variant === "nest") handleNestDeath(state, s.x, s.y);
        applyPyromaniac(state, s.x, s.y);
        spawnParticles(state, s.x, s.y, 8, LF.COLOR_SHADOW_DART);
      } else {
        // Brute survived — flee
        s.state = "flee";
        s.dartDuration = 1.5;
        spawnParticles(state, s.x, s.y, 4, LF.COLOR_SHADOW_DART);
        spawnFloatText(state, s.x, s.y - 10, `${s.hp} HP`, LF.COLOR_SHADOW_EYE, 0.8);
      }
      spawnParticles(state, s.x, s.y, 4, LF.COLOR_FLARE);
    }
  }

  // Bonfire mutator: bigger flare radius (applied in tryFlare cost above)
  const pts = LF.SCORE_SHADOW_BURN * burned + LF.SCORE_FLARE_MULTI * Math.max(0, burned - 1);
  if (burned > 0) {
    state.score += pts;
    spawnFloatText(state, state.playerX, state.playerY - 20,
      burned > 1 ? `FLARE x${burned}! +${pts}` : `BURN! +${pts}`, LF.COLOR_FLARE, burned > 1 ? 1.8 : 1.2);
    // Shadow feast mutator
    applyShadowFeast(state, burned);
  }

  // Flare chain mechanic: 3+ kills refunds 25% flare fuel cost
  if (burned >= 3) {
    const refund = LF.FLARE_COST * flareCostMult * 0.25;
    state.fuel = Math.min(1, state.fuel + refund);
    spawnFloatText(state, state.playerX, state.playerY - 35, "CHAIN FLARE!", LF.COLOR_FLAME_CORE, 1.6);
  }

  spawnParticles(state, state.playerX, state.playerY, 15, LF.COLOR_FLAME);
  state.screenShake = LF.SHAKE_DURATION;
  state.screenFlashColor = LF.COLOR_FLARE;
  state.screenFlashTimer = LF.FLASH_DURATION * 2;
  return true;
}

// ---------------------------------------------------------------------------
// Shadows — with variants
// ---------------------------------------------------------------------------

export function updateShadows(state: LFState, dt: number): boolean {
  let playerHit = false;

  state.shadowSpawnTimer -= dt;
  // Difficulty scaling: after wave 15, max shadows alive increases
  const maxShadowBonus = state.wave > 15 ? state.wave - 15 : 0;
  const maxShadows = Math.min(LF.SHADOW_MAX + maxShadowBonus, 3 + state.wave);
  if (state.shadowSpawnTimer <= 0 && state.shadows.filter(s => s.alive).length < maxShadows) {
    state.shadowSpawnTimer = Math.max(1.5, LF.SHADOW_SPAWN_INTERVAL - state.wave * 0.2);
    spawnShadow(state, "normal");
  }

  const px = state.playerX, py = state.playerY;
  const lr = state.lightRadius;

  for (const s of state.shadows) {
    if (!s.alive) continue;
    const dx = px - s.x, dy = py - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Shadow AI
    const mothBoost = state.activeMutators.includes("moth_light") ? 1.3 : 1.0; // shadows 30% faster with moth_light
    const beaconBoost = state.activeMutators.includes("beacon") ? LF.BEACON_SHADOW_SPEED_MULT : 1.0; // shadows 20% faster with beacon
    const speedMult = (s.variant === "brute" ? LF.BRUTE_SPEED_MULT : s.variant === "nest" ? LF.NEST_SPEED_MULT : 1.0) * mothBoost * beaconBoost;

    switch (s.state) {
      case "lurk": {
        const targetDist = lr + LF.SHADOW_LURK_DISTANCE;
        const toPlayerDx = dx / dist, toPlayerDy = dy / dist;
        const tangentX = -toPlayerDy, tangentY = toPlayerDx;
        const distCorrection = (targetDist - dist) * 0.02;

        // Variant-specific lurk movement
        if (s.variant === "stalker") {
          // Stalkers: orbit at fixed distance, NEVER dart — they are pressure not damage
          s.vx = tangentX * LF.SHADOW_SPEED_LURK * 0.6 + toPlayerDx * distCorrection * LF.SHADOW_SPEED_LURK * 0.5;
          s.vy = tangentY * LF.SHADOW_SPEED_LURK * 0.6 + toPlayerDy * distCorrection * LF.SHADOW_SPEED_LURK * 0.5;
          // Stalkers don't dart — they just orbit and drain light
          break;
        } else if (s.variant === "phantom") {
          // Phantoms: faster lurk speed (55 px/s), mostly invisible, same orbit pattern
          const phantomSpeed = LF.PHANTOM_SPEED / LF.SHADOW_SPEED_LURK; // speed ratio
          s.vx = (tangentX * LF.SHADOW_SPEED_LURK * phantomSpeed + toPlayerDx * distCorrection * LF.SHADOW_SPEED_LURK) * speedMult;
          s.vy = (tangentY * LF.SHADOW_SPEED_LURK * phantomSpeed + toPlayerDy * distCorrection * LF.SHADOW_SPEED_LURK) * speedMult;
        } else if (s.variant === "nest") {
          // Nests: slow, steady approach — less orbital, more direct
          s.vx = (tangentX * LF.SHADOW_SPEED_LURK * 0.4 + toPlayerDx * distCorrection * LF.SHADOW_SPEED_LURK * 1.2) * speedMult;
          s.vy = (tangentY * LF.SHADOW_SPEED_LURK * 0.4 + toPlayerDy * distCorrection * LF.SHADOW_SPEED_LURK * 1.2) * speedMult;
        } else if (s.variant === "swarm") {
          // Swarms: erratic twitchy movement with high-frequency direction changes
          const twitch = Math.sin(state.time * 15 + s.eyePhase * 7) * LF.SHADOW_SPEED_LURK * 0.8;
          s.vx = (tangentX * LF.SHADOW_SPEED_LURK + toPlayerDx * distCorrection * LF.SHADOW_SPEED_LURK + twitch) * speedMult;
          s.vy = (tangentY * LF.SHADOW_SPEED_LURK + toPlayerDy * distCorrection * LF.SHADOW_SPEED_LURK + Math.cos(state.time * 13 + s.eyePhase * 5) * LF.SHADOW_SPEED_LURK * 0.6) * speedMult;
        } else {
          // Normal + brute: standard orbit
          s.vx = (tangentX * LF.SHADOW_SPEED_LURK + toPlayerDx * distCorrection * LF.SHADOW_SPEED_LURK) * speedMult;
          s.vy = (tangentY * LF.SHADOW_SPEED_LURK + toPlayerDy * distCorrection * LF.SHADOW_SPEED_LURK) * speedMult;
        }

        s.dartTimer -= dt;
        if (s.dartTimer <= 0) {
          if (hasLineOfSight(state, s.x, s.y, px, py)) {
            if (s.variant === "brute") {
              s.state = "wind";
              s.dartDuration = LF.BRUTE_WIND_DURATION;
              s.vx = 0; s.vy = 0;
            } else if (s.variant === "phantom") {
              // Phantom: shorter telegraph (barely visible warning)
              s.state = "telegraph";
              s.dartDuration = LF.PHANTOM_TELEGRAPH_DURATION;
              s.vx = 0; s.vy = 0;
            } else {
              // Normal + swarm + nest: enter telegraph before dart
              s.state = "telegraph";
              s.dartDuration = LF.TELEGRAPH_DURATION;
              s.vx = 0; s.vy = 0; // freeze during telegraph
            }
          } else {
            s.dartTimer = 0.5 + Math.random() * 0.5;
            s.vx = tangentX * LF.SHADOW_SPEED_LURK * 2 * speedMult;
            s.vy = tangentY * LF.SHADOW_SPEED_LURK * 2 * speedMult;
          }
        }
        break;
      }
      case "telegraph": {
        // Normal/swarm pre-dart warning — frozen, eyes flare, then dart
        s.dartDuration -= dt;
        s.vx = 0; s.vy = 0;
        if (s.dartDuration <= 0) {
          s.state = "dart";
          s.dartDuration = LF.SHADOW_DART_DURATION;
          // Difficulty scaling: after wave 12, dart speed increases by 10% per wave
          const dartSpeedScale = state.wave > 12 ? 1 + (state.wave - 12) * 0.10 : 1.0;
          const dartSpeed = (LF.SHADOW_SPEED_DART + state.wave * 10) * speedMult * dartSpeedScale;
          s.vx = (dx / dist) * dartSpeed;
          s.vy = (dy / dist) * dartSpeed;
        }
        break;
      }
      case "wind": {
        // Brute wind-up — telegraph, then dart
        s.dartDuration -= dt;
        s.vx = 0; s.vy = 0; // frozen during wind
        if (s.dartDuration <= 0) {
          s.state = "dart";
          s.dartDuration = LF.SHADOW_DART_DURATION * 1.5;
          const dartSpeedScale = state.wave > 12 ? 1 + (state.wave - 12) * 0.10 : 1.0;
          const dartSpeed = (LF.SHADOW_SPEED_DART + state.wave * 10) * speedMult * dartSpeedScale;
          s.vx = (dx / dist) * dartSpeed;
          s.vy = (dy / dist) * dartSpeed;
        }
        break;
      }
      case "dart": {
        s.dartDuration -= dt;
        if (s.dartDuration <= 0) {
          s.state = "lurk";
          const interval = s.variant === "swarm" ? LF.SWARM_DART_INTERVAL :
            s.variant === "phantom" ? LF.PHANTOM_DART_INTERVAL :
            LF.SHADOW_DART_INTERVAL_MIN + Math.random() * (LF.SHADOW_DART_INTERVAL_MAX - LF.SHADOW_DART_INTERVAL_MIN);
          s.dartTimer = interval;
        }
        break;
      }
      case "flee": {
        s.vx = -(dx / dist) * LF.SHADOW_SPEED_DART * 1.5 * speedMult;
        s.vy = -(dy / dist) * LF.SHADOW_SPEED_DART * 1.5 * speedMult;
        s.dartDuration -= dt;
        if (s.dartDuration <= 0) {
          s.state = "lurk";
          s.dartTimer = 2 + Math.random() * 2;
        }
        break;
      }
    }

    s.x += s.vx * dt;
    s.y += s.vy * dt;

    // Pillar collision
    for (const p of state.pillars) {
      const pdx = s.x - p.x, pdy = s.y - p.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < p.radius + s.radius) {
        s.x += (pdx / pdist) * (p.radius + s.radius - pdist);
        s.y += (pdy / pdist) * (p.radius + s.radius - pdist);
      }
    }

    s.x = Math.max(s.radius, Math.min(state.arenaW - s.radius, s.x));
    s.y = Math.max(s.radius, Math.min(state.arenaH - s.radius, s.y));

    // Player collision — damage instead of instant death
    if (dist < LF.PLAYER_RADIUS + s.radius && s.state === "dart" && state.invulnTimer <= 0) {
      const dmgMult = state.activeMutators.includes("glass_flame") ? 1.5 : 1.0;
      state.fuel -= s.fuelDamage * dmgMult;
      // Ember shield auto-flare on hit
      if (state.activeMutators.includes("ember_shield") && state.flareCooldown <= 0) {
        tryFlare(state);
      }
      state.invulnTimer = LF.INVULN_DURATION;
      state.dodgeTimer = 0; // reset dodge bonus timer on hit
      state.hitsAbsorbed++;
      if (!state.tutFirstHit) { state.tutFirstHit = true; spawnFloatText(state, state.playerX, state.playerY - 35, "Hits drain fuel! Use pillars for cover!", 0xffffff, 1.0); }
      s.state = "flee";
      s.dartDuration = 1.0;
      spawnParticles(state, px, py, 10, LF.COLOR_DANGER);
      spawnFloatText(state, px, py - 15, `-${Math.round(s.fuelDamage * 100)}% FUEL`, LF.COLOR_DANGER, 1.3);
      state.screenShake = LF.SHAKE_DURATION * 1.5;
      state.screenFlashColor = LF.COLOR_DANGER;
      state.screenFlashTimer = LF.FLASH_DURATION * 2;
      if (state.fuel <= 0) playerHit = true; // die only if fuel gone
    }
  }

  // --- Coordinated behaviors ---

  // Pincer: when 2 lurking shadows are on opposite sides, sync their darts
  const lurkers = state.shadows.filter(s => s.alive && s.state === "lurk");
  for (let a = 0; a < lurkers.length; a++) {
    for (let b = a + 1; b < lurkers.length; b++) {
      const sa = lurkers[a], sb = lurkers[b];
      const ax = sa.x - px, ay = sa.y - py;
      const bx = sb.x - px, by = sb.y - py;
      const dot = ax * bx + ay * by;
      const magA = Math.sqrt(ax * ax + ay * ay) || 1;
      const magB = Math.sqrt(bx * bx + by * by) || 1;
      const cosAngle = dot / (magA * magB);
      // cosAngle near -1 means opposite sides
      if (cosAngle < -0.7 && sa.dartTimer < 1.0 && sb.dartTimer < 1.0) {
        sa.dartTimer = 0.3; sb.dartTimer = 0.3; // sync their darts
      }
    }
  }

  // Swarm flock: swarm shadows near each other sync dart timing
  const swarms = state.shadows.filter(s => s.alive && s.variant === "swarm" && s.state === "lurk");
  if (swarms.length >= 2) {
    // If any swarm is about to dart, trigger all nearby swarms
    for (const sw of swarms) {
      if (sw.dartTimer <= 0.3) {
        for (const other of swarms) {
          if (other !== sw) {
            const sdx = sw.x - other.x, sdy = sw.y - other.y;
            if (Math.sqrt(sdx * sdx + sdy * sdy) < 60) {
              other.dartTimer = Math.min(other.dartTimer, 0.5);
            }
          }
        }
      }
    }
  }

  state.shadows = state.shadows.filter(s => s.alive);
  return playerHit;
}

function spawnShadow(state: LFState, variant: ShadowVariant): void {
  const side = Math.floor(Math.random() * 4);
  let sx: number, sy: number;
  if (side === 0) { sx = Math.random() * state.arenaW; sy = 0; }
  else if (side === 1) { sx = state.arenaW; sy = Math.random() * state.arenaH; }
  else if (side === 2) { sx = Math.random() * state.arenaW; sy = state.arenaH; }
  else { sx = 0; sy = Math.random() * state.arenaH; }

  let hp: number = 1, radius: number = LF.SHADOW_RADIUS, fuelDamage: number = LF.SHADOW_HIT_FUEL_COST;
  if (variant === "brute") { hp = LF.BRUTE_HP; radius = LF.BRUTE_RADIUS; fuelDamage = LF.BRUTE_FUEL_DAMAGE; }
  else if (variant === "swarm") { radius = LF.SWARM_RADIUS; fuelDamage = LF.SHADOW_HIT_FUEL_COST * 0.5; }
  else if (variant === "stalker") { radius = LF.SHADOW_RADIUS + 2; fuelDamage = LF.SHADOW_HIT_FUEL_COST * 0.7; }
  else if (variant === "phantom") { hp = 1; radius = LF.PHANTOM_RADIUS; fuelDamage = LF.SHADOW_HIT_FUEL_COST * 0.6; }
  else if (variant === "nest") { hp = LF.NEST_HP; radius = LF.NEST_RADIUS; fuelDamage = LF.SHADOW_HIT_FUEL_COST * 0.8; }

  const dartInterval = variant === "swarm" ? LF.SWARM_DART_INTERVAL :
    variant === "phantom" ? LF.PHANTOM_DART_INTERVAL :
    LF.SHADOW_DART_INTERVAL_MIN + Math.random() * (LF.SHADOW_DART_INTERVAL_MAX - LF.SHADOW_DART_INTERVAL_MIN);

  state.shadows.push({
    x: sx, y: sy, vx: 0, vy: 0,
    state: "lurk",
    dartTimer: dartInterval,
    dartDuration: 0,
    hp, radius, eyePhase: Math.random() * Math.PI * 2,
    alive: true, variant, fuelDamage,
  });
}

/** Handle nest death: spawn swarm children at the nest's position */
function handleNestDeath(state: LFState, nx: number, ny: number): void {
  for (let i = 0; i < LF.NEST_SPAWN_COUNT; i++) {
    const offset = 8;
    const angle = Math.random() * Math.PI * 2;
    state.shadows.push({
      x: nx + Math.cos(angle) * offset, y: ny + Math.sin(angle) * offset,
      vx: 0, vy: 0, state: "lurk",
      dartTimer: LF.SWARM_DART_INTERVAL + Math.random() * 0.5,
      dartDuration: 0, hp: 1, radius: LF.SWARM_RADIUS,
      eyePhase: Math.random() * Math.PI * 2,
      alive: true, variant: "swarm",
      fuelDamage: LF.SHADOW_HIT_FUEL_COST * 0.5,
    });
  }
  spawnFloatText(state, nx, ny - 15, "NEST BURST!", LF.COLOR_SHADOW_EYE, 1.2);
  spawnParticles(state, nx, ny, 6, LF.COLOR_SHADOW_BODY);
}

/** Track kill combo: increment combo, award bonus points */
function trackCombo(state: LFState): void {
  if (state.comboTimer > 0) {
    state.comboCount++;
    const bonus = LF.COMBO_BONUS * state.comboCount;
    state.score += bonus;
    if (state.comboCount >= 2) {
      spawnFloatText(state, state.playerX, state.playerY - 40,
        `COMBO x${state.comboCount}! +${bonus}`, 0xffaa00, 1.0 + state.comboCount * 0.2);
    }
  } else {
    state.comboCount = 1;
  }
  state.comboTimer = LF.COMBO_WINDOW;
}

// ---------------------------------------------------------------------------
// Oil — contested spawning
// ---------------------------------------------------------------------------

export function updateOil(state: LFState, dt: number): void {
  state.oilSpawnTimer -= dt;
  if (state.oilSpawnTimer <= 0 && state.oilDrops.length < LF.OIL_MAX) {
    state.oilSpawnTimer = state.oilSpawnInterval; // uses upgrade-reduced interval
    const outerBias = Math.random() < 0.6; // 60% chance to spawn in outer ring
    for (let i = 0; i < 30; i++) {
      let ox: number, oy: number;
      if (outerBias) {
        // Spawn near edges where shadows lurk
        const side = Math.floor(Math.random() * 4);
        const margin = 30 + Math.random() * 50;
        if (side === 0) { ox = margin + Math.random() * (state.arenaW - margin * 2); oy = margin; }
        else if (side === 1) { ox = state.arenaW - margin; oy = margin + Math.random() * (state.arenaH - margin * 2); }
        else if (side === 2) { ox = margin + Math.random() * (state.arenaW - margin * 2); oy = state.arenaH - margin; }
        else { ox = margin; oy = margin + Math.random() * (state.arenaH - margin * 2); }
      } else {
        ox = 20 + Math.random() * (state.arenaW - 40);
        oy = 20 + Math.random() * (state.arenaH - 40);
      }
      const dx = ox - state.playerX, dy = oy - state.playerY;
      if (Math.sqrt(dx * dx + dy * dy) < 40) continue;
      if (state.pillars.some(p => Math.sqrt((p.x - ox) ** 2 + (p.y - oy) ** 2) < p.radius + 10)) continue;

      // Large oil always spawns far
      const farFromPlayer = Math.sqrt(dx * dx + dy * dy) > state.lightRadius;
      const amount = farFromPlayer
        ? LF.OIL_AMOUNT_MAX - 0.02 + Math.random() * 0.05 // big oil far away
        : LF.OIL_AMOUNT_MIN + Math.random() * (LF.OIL_AMOUNT_MAX - LF.OIL_AMOUNT_MIN);

      state.oilDrops.push({ x: ox, y: oy, amount, age: 0, pulse: Math.random() * Math.PI * 2 });
      break;
    }
  }

  // Oil magnet pull (from upgrade)
  // Moth light mutator: oil drifts toward player naturally
  if (state.activeMutators.includes("moth_light")) {
    for (const o of state.oilDrops) {
      const mdx = state.playerX - o.x, mdy = state.playerY - o.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mDist > 0 && mDist < 200) {
        const pull = (1.0 - mDist / 200) * 20 * dt;
        o.x += (mdx / mDist) * pull; o.y += (mdy / mDist) * pull;
      }
    }
  }

  // Beacon mutator: oil attracts from 3x distance
  const beaconActive = state.activeMutators.includes("beacon");
  const effectiveMagnetRadius = beaconActive
    ? Math.max(state.oilMagnetRadius, 40) * LF.BEACON_ATTRACT_MULT
    : state.oilMagnetRadius;

  if (effectiveMagnetRadius > 0) {
    for (const o of state.oilDrops) {
      const mdx = state.playerX - o.x, mdy = state.playerY - o.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mDist > 0 && mDist < effectiveMagnetRadius) {
        const pull = (1.0 - mDist / effectiveMagnetRadius) * 60 * dt;
        o.x += (mdx / mDist) * pull;
        o.y += (mdy / mDist) * pull;
      }
    }
  }

  for (const o of state.oilDrops) {
    o.age += dt;
    const dx = state.playerX - o.x, dy = state.playerY - o.y;
    if (Math.sqrt(dx * dx + dy * dy) < LF.PLAYER_RADIUS + LF.OIL_RADIUS) {
      state.fuel = Math.min(1, state.fuel + o.amount);
      state.oilCollected++;
      state.score += LF.SCORE_OIL;
      spawnParticles(state, o.x, o.y, 6, LF.COLOR_OIL);
      const pct = Math.round(o.amount * 100);
      spawnFloatText(state, o.x, o.y - 10, `+${pct}% FUEL`, LF.COLOR_OIL, o.amount > 0.25 ? 1.3 : 1.0);
      if (!state.tutFirstOil) { state.tutFirstOil = true; spawnFloatText(state, state.playerX, state.playerY - 30, "Oil keeps your flame alive!", 0xffffff, 1.2); }
      o.age = LF.OIL_LIFETIME + 1;
    }
  }

  state.oilDrops = state.oilDrops.filter(o => o.age < LF.OIL_LIFETIME);
}

// ---------------------------------------------------------------------------
// Waves — with events and shadow variants
// ---------------------------------------------------------------------------

export function updateWave(state: LFState, dt: number): void {
  // Wave announcement pause — shadows don't spawn during this
  if (state.waveAnnounceTimer > 0) {
    state.waveAnnounceTimer -= dt;
    return;
  }

  state.waveTimer -= dt;
  // Track remaining wave shadows for wave clear bonus
  if (state.waveShadowsRemaining > 0) {
    const alive = state.shadows.filter(s => s.alive).length;
    state.waveShadowsRemaining = alive;
  }
  if (state.waveTimer <= 0) {
    // Wave clear bonus: if all shadows from previous wave are dead before next wave spawns
    if (state.wave > 0 && state.waveShadowsRemaining === 0 && state.shadows.filter(s => s.alive).length === 0) {
      state.score += LF.SCORE_WAVE_CLEAR;
      spawnFloatText(state, state.playerX, state.playerY - 45, `WAVE CLEAR! +${LF.SCORE_WAVE_CLEAR}`, LF.COLOR_OIL, 1.8);
    }
    state.wave++;
    state.waveTimer = LF.WAVE_INTERVAL;

    const isCalm = state.wave % LF.CALM_WAVE_INTERVAL === 0;
    const isOdd = state.wave % 2 === 1;
    const isEclipse = state.wave % LF.ECLIPSE_WAVE_INTERVAL === 0;

    if (isCalm) {
      // --- CALM WAVE: fewer enemies, generous oil, breathing room ---
      state.waveName = `Wave ${state.wave}: Respite`;
      spawnShadow(state, "normal"); // just 1 shadow
      // Generous oil
      for (let i = 0; i < 3; i++) {
        const ox = 30 + Math.random() * (state.arenaW - 60);
        const oy = 30 + Math.random() * (state.arenaH - 60);
        state.oilDrops.push({ x: ox, y: oy, amount: LF.OIL_AMOUNT_MAX, age: 0, pulse: Math.random() * Math.PI * 2 });
      }
      spawnFloatText(state, state.playerX, state.playerY - 30, "RESPITE", LF.COLOR_OIL, 1.5);
      state.screenFlashColor = LF.COLOR_OIL; state.screenFlashTimer = LF.FLASH_DURATION;
      // Offer mutator choice at respite
      generateMutatorChoices(state);
    } else if (isEclipse) {
      // --- ECLIPSE WAVE: all shadows dart ---
      state.waveName = `Wave ${state.wave}: Eclipse`;
      const burst = 2 + Math.floor(state.wave / 3);
      for (let i = 0; i < burst; i++) spawnShadow(state, "normal");
      // Trigger eclipse
      for (const s of state.shadows) {
        if (s.alive && s.state === "lurk") {
          s.state = "dart"; s.dartDuration = LF.SHADOW_DART_DURATION * 1.5;
          const edx = state.playerX - s.x, edy = state.playerY - s.y;
          const edist = Math.sqrt(edx * edx + edy * edy) || 1;
          s.vx = (edx / edist) * LF.SHADOW_SPEED_DART; s.vy = (edy / edist) * LF.SHADOW_SPEED_DART;
        }
      }
      spawnFloatText(state, state.playerX, state.playerY - 30, "SHADOW ECLIPSE!", LF.COLOR_SHADOW_DART, 2.0);
      state.screenShake = LF.SHAKE_DURATION * 2;
    } else if (isOdd) {
      // --- PRESSURE WAVE: many weak enemies, resource-scarce ---
      state.waveName = `Wave ${state.wave}: Swarm`;
      const burst = 3 + Math.floor(state.wave / 2);
      for (let i = 0; i < burst; i++) {
        spawnShadow(state, state.wave >= 2 && Math.random() < 0.4 ? "swarm" : "normal");
      }
      spawnFloatText(state, state.playerX, state.playerY - 30, "DARKNESS DEEPENS", LF.COLOR_SHADOW_EYE, 1.3);
    } else {
      // --- EVEN WAVE: oil surge then hard threat ---
      state.waveName = `Wave ${state.wave}: Trial`;
      // Oil first
      for (let i = 0; i < 2; i++) {
        const ox = 30 + Math.random() * (state.arenaW - 60);
        const oy = 30 + Math.random() * (state.arenaH - 60);
        state.oilDrops.push({ x: ox, y: oy, amount: LF.OIL_AMOUNT_MIN + Math.random() * 0.1, age: 0, pulse: Math.random() * Math.PI * 2 });
      }
      // Then a hard threat
      if (state.wave >= 5 && Math.random() < 0.5) {
        spawnShadow(state, "brute");
        spawnFloatText(state, state.playerX, state.playerY - 30, "BRUTE INCOMING", 0x661144, 1.5);
      } else {
        const burst = 2 + Math.floor(state.wave / 3);
        for (let i = 0; i < burst; i++) spawnShadow(state, "normal");
        spawnFloatText(state, state.playerX, state.playerY - 30, "TRIAL BEGINS", LF.COLOR_FLAME, 1.3);
      }
    }

    // Stalker on schedule
    if (state.wave >= LF.STALKER_START_WAVE && state.wave % 3 === 0 && !isCalm) {
      spawnShadow(state, "stalker");
      spawnFloatText(state, state.playerX, state.playerY - 45, "STALKER APPROACHES...", LF.COLOR_SHADOW_EYE, 1.5);
    }

    // Phantom spawn (wave 6+, ~15% chance on non-calm waves)
    if (state.wave >= LF.PHANTOM_START_WAVE && !isCalm && Math.random() < 0.15) {
      spawnShadow(state, "phantom");
      spawnFloatText(state, state.playerX, state.playerY - 50, "SOMETHING UNSEEN...", 0x664488, 1.3);
    }

    // Nest spawn (wave 8+, ~10% chance on non-calm waves)
    if (state.wave >= LF.NEST_START_WAVE && !isCalm && Math.random() < 0.10) {
      spawnShadow(state, "nest");
      spawnFloatText(state, state.playerX, state.playerY - 55, "NEST APPROACHES!", 0x442266, 1.5);
    }

    // Random secondary event on non-calm waves
    if (!isCalm && !isEclipse && state.wave >= 3 && Math.random() < 0.3) {
      state.fuel = Math.max(0.1, state.fuel - 0.1);
      spawnFloatText(state, state.playerX, state.playerY - 20, "BLACKOUT! -10%", LF.COLOR_DANGER, 1.0);
      state.screenFlashColor = LF.COLOR_DARKNESS; state.screenFlashTimer = LF.FLASH_DURATION * 2;
    }

    state.screenShake = Math.max(state.screenShake, LF.SHAKE_DURATION * 0.5);
    // Track shadows alive at wave start for wave clear bonus
    state.waveShadowsRemaining = state.shadows.filter(s => s.alive).length;
    // Wave announcement pause
    state.waveAnnounceTimer = LF.WAVE_ANNOUNCE_DURATION;
  }
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export function updateTimers(state: LFState, dt: number): void {
  state.time += dt;
  state.score += LF.SCORE_PER_SECOND * dt;
  if (state.flareCooldown > 0) {
    state.flareCooldown -= dt;
    if (state.flareCooldown <= 0) state.flareCharges = state.flareMaxCharges; // recharge all charges
  }
  if (state.flareTimer > 0) state.flareTimer -= dt;
  if (state.invulnTimer > 0) state.invulnTimer -= dt;
  if (state.screenShake > 0) state.screenShake -= dt;
  if (state.screenFlashTimer > 0) state.screenFlashTimer -= dt;
  // Combo timer
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.comboCount = 0;
  }
  // Dodge bonus: every 15s without taking a hit
  state.dodgeTimer += dt;
  if (state.dodgeTimer >= LF.DODGE_BONUS_INTERVAL) {
    state.dodgeTimer -= LF.DODGE_BONUS_INTERVAL;
    state.score += LF.SCORE_DODGE_BONUS;
    spawnFloatText(state, state.playerX, state.playerY - 40, `DODGE MASTER +${LF.SCORE_DODGE_BONUS}`, LF.COLOR_FLAME, 1.5);
  }
  // Wind hazard: change direction periodically
  if (state.roomConfig.hazard === "wind") {
    state.windChangeTimer -= dt;
    if (state.windChangeTimer <= 0) {
      state.windAngle = Math.random() * Math.PI * 2;
      state.windChangeTimer = LF.WIND_CHANGE_INTERVAL;
    }
  }
}

// ---------------------------------------------------------------------------
// Particles & float text
// ---------------------------------------------------------------------------

export function spawnParticles(state: LFState, x: number, y: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, spd = 30 + Math.random() * 60;
    state.particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: LF.PARTICLE_LIFETIME, maxLife: LF.PARTICLE_LIFETIME, color, size: 1.5 + Math.random() * 3 });
  }
}

export function updateParticles(state: LFState, dt: number): void {
  for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; }
  state.particles = state.particles.filter(p => p.life > 0);
}

export function spawnFloatText(state: LFState, x: number, y: number, text: string, color: number, scale: number): void {
  state.floatTexts.push({ x, y, text, color, life: 1.5, maxLife: 1.5, scale });
}

export function updateFloatTexts(state: LFState, dt: number): void {
  for (const ft of state.floatTexts) { ft.y -= dt * 30; ft.life -= dt; }
  state.floatTexts = state.floatTexts.filter(ft => ft.life > 0);
}

export function spawnDeathEffect(state: LFState): void {
  spawnParticles(state, state.playerX, state.playerY, 20, LF.COLOR_FLAME);
  spawnParticles(state, state.playerX, state.playerY, 10, LF.COLOR_FLAME_OUTER);
  state.screenShake = LF.SHAKE_DURATION * 3;
  state.screenFlashColor = LF.COLOR_DARKNESS;
  state.screenFlashTimer = LF.FLASH_DURATION * 4;
}

// ---------------------------------------------------------------------------
// Run mutator system — choices at Respite waves
// ---------------------------------------------------------------------------

const ALL_MUTATORS = [
  { id: "kindling_trail", name: "Kindling Trail", desc: "Moving leaves fire that damages shadows" },
  { id: "moth_light", name: "Moth Light", desc: "Oil drifts toward you, but shadows approach faster" },
  { id: "ember_shield", name: "Ember Shield", desc: "Hits auto-flare, but flare CD doubles" },
  { id: "desperate_blaze", name: "Desperate Blaze", desc: "Below 20% fuel, light doesn't shrink" },
  { id: "bonfire", name: "Bonfire", desc: "Flare radius +50%, flare cost +50%" },
  { id: "iron_wick", name: "Iron Wick", desc: "Fuel drains 25% slower, move 15% slower" },
  { id: "shadow_feast", name: "Shadow Feast", desc: "Burning shadows restores 5% fuel each" },
  { id: "glass_flame", name: "Glass Flame", desc: "Light radius +30%, hits do 50% more damage" },
  { id: "pyromaniac", name: "Pyromaniac", desc: "Shadow kills create chain explosions" },
  { id: "beacon", name: "Beacon", desc: "Oil visible from afar, shadows faster" },
];

export function generateMutatorChoices(state: LFState): void {
  const available = ALL_MUTATORS.filter(m => !state.activeMutators.includes(m.id));
  // Shuffle
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  state.mutatorChoices = available.slice(0, Math.min(2, available.length));
  if (state.mutatorChoices.length > 0) {
    state.choosingMutator = true;
  }
}

export function selectMutator(state: LFState, index: number): void {
  if (index < 0 || index >= state.mutatorChoices.length) return;
  const chosen = state.mutatorChoices[index];
  state.activeMutators.push(chosen.id);

  // Apply immediate effects
  switch (chosen.id) {
    case "ember_shield":
      state.flareCooldownBase *= 2;
      break;
    case "iron_wick":
      state.playerSpeed *= 0.85;
      break;
    case "glass_flame":
      state.maxLightRadius *= 1.3;
      break;
  }

  spawnFloatText(state, state.playerX, state.playerY - 25, chosen.name + "!", LF.COLOR_FLAME, 1.5);
  state.screenFlashColor = LF.COLOR_FLAME; state.screenFlashTimer = LF.FLASH_DURATION * 2;
  state.mutatorChoices = [];
  state.choosingMutator = false;

  // Trigger room transition after mutator choice
  state.roomTransitionTimer = 1.5; // light collapses, room regenerates, light expands
}

/** Transition to a new room — regenerate terrain, preserve player progress */
export function transitionRoom(state: LFState): void {
  state.roomDepth++;
  const newRoom = generateRoom(state.roomDepth);
  // Clamp to screen (use current arena as reference since we don't have sw/sh here)
  const aw = Math.min(newRoom.arenaW, state.arenaW + 50); // allow some growth
  const ah = Math.min(newRoom.arenaH, state.arenaH + 50);
  const actualRoom = { ...newRoom, arenaW: aw, arenaH: ah };

  // Regenerate terrain
  state.arenaW = aw;
  state.arenaH = ah;
  state.roomConfig = actualRoom;
  state.pillars = generatePillars(actualRoom);

  // Reposition player to center of new room
  state.playerX = aw / 2;
  state.playerY = ah / 2;

  // Scatter surviving shadows to edges
  for (const s of state.shadows) {
    if (!s.alive) continue;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { s.x = Math.random() * aw; s.y = 0; }
    else if (side === 1) { s.x = aw; s.y = Math.random() * ah; }
    else if (side === 2) { s.x = Math.random() * aw; s.y = ah; }
    else { s.x = 0; s.y = Math.random() * ah; }
    s.state = "lurk";
  }

  // Clear oil drops (new room, new oil)
  state.oilDrops = [];

  spawnFloatText(state, aw / 2, ah / 2 - 30, actualRoom.roomName, LF.COLOR_FLAME, 2.0);
  state.screenFlashColor = LF.COLOR_DARKNESS; state.screenFlashTimer = LF.FLASH_DURATION * 3;
}

/** Apply kindling trail damage (called from game loop when moving) */
export function applyKindlingTrail(state: LFState, _dt: number): void {
  // Kindling trail works with mutator OR in oil_floor rooms
  const hasTrail = state.activeMutators.includes("kindling_trail") || state.roomConfig.hazard === "oil_floor";
  if (!hasTrail) return;

  // Damage any shadow within trail range (wider range, any state)
  const trailRange = state.roomConfig.hazard === "oil_floor" ? 25 : 18;
  for (const s of state.shadows) {
    if (!s.alive) continue;
    const dx = s.x - state.playerX, dy = s.y - state.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < state.lightRadius * 0.5 && dist < trailRange + state.lightRadius * 0.15) {
      // Only damage shadows inside the light (trail = fire, fire = light)
      s.hp--;
      if (s.hp <= 0) {
        s.alive = false;
        state.shadowsBurned++;
        trackCombo(state);
        if (s.variant === "nest") handleNestDeath(state, s.x, s.y);
        applyPyromaniac(state, s.x, s.y);
        spawnParticles(state, s.x, s.y, 4, LF.COLOR_FLAME);
        spawnFloatText(state, s.x, s.y - 10, "BURNED!", LF.COLOR_FLAME, 0.8);
        applyShadowFeast(state, 1);
      }
    }
  }
}

/** Apply pyromaniac chain explosion at a kill location */
function applyPyromaniac(state: LFState, killX: number, killY: number): void {
  if (!state.activeMutators.includes("pyromaniac")) return;
  for (const s of state.shadows) {
    if (!s.alive) continue;
    const dx = s.x - killX, dy = s.y - killY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < LF.PYROMANIAC_RADIUS) {
      s.hp--;
      if (s.hp <= 0) {
        s.alive = false;
        state.shadowsBurned++;
        trackCombo(state);
        if (s.variant === "nest") handleNestDeath(state, s.x, s.y);
        spawnParticles(state, s.x, s.y, 6, LF.COLOR_FLAME_OUTER);
        spawnFloatText(state, s.x, s.y - 10, "CHAIN!", LF.COLOR_FLAME_OUTER, 1.0);
        applyShadowFeast(state, 1);
        // Note: no recursive pyromaniac to avoid infinite chains
      }
    }
  }
  spawnParticles(state, killX, killY, 4, LF.COLOR_FLAME_OUTER);
}

/** Apply shadow feast (restore fuel on shadow burn) */
export function applyShadowFeast(state: LFState, burned: number): void {
  if (!state.activeMutators.includes("shadow_feast") || burned <= 0) return;
  const restore = burned * 0.05;
  state.fuel = Math.min(1, state.fuel + restore);
  spawnFloatText(state, state.playerX, state.playerY - 15, `+${Math.round(restore * 100)}% FUEL`, LF.COLOR_OIL, 0.8);
}

// ---------------------------------------------------------------------------
// Milestone system
// ---------------------------------------------------------------------------

interface MilestoneDef { id: string; name: string; emberReward: number; check: (m: LFMeta) => boolean; }

const MILESTONES: MilestoneDef[] = [
  { id: "first_blood", name: "First Blood", emberReward: 5, check: m => m.totalShadowsBurned >= 1 },
  { id: "shadow_slayer", name: "Shadow Slayer", emberReward: 15, check: m => m.totalShadowsBurned >= 50 },
  { id: "shadow_lord", name: "Shadow Lord", emberReward: 30, check: m => m.totalShadowsBurned >= 200 },
  { id: "oil_collector", name: "Oil Collector", emberReward: 10, check: m => m.totalOilCollected >= 25 },
  { id: "oil_hoarder", name: "Oil Hoarder", emberReward: 25, check: m => m.totalOilCollected >= 100 },
  { id: "survivor_1", name: "Minute Man", emberReward: 10, check: m => m.bestTime >= 60 },
  { id: "survivor_2", name: "Enduring Flame", emberReward: 25, check: m => m.bestTime >= 120 },
  { id: "survivor_3", name: "Eternal Light", emberReward: 50, check: m => m.bestTime >= 180 },
  { id: "wave_5", name: "Into the Deep", emberReward: 10, check: m => m.gamesPlayed >= 1 && m.bestTime >= 100 },
  { id: "wave_10", name: "Abyss Walker", emberReward: 30, check: m => m.bestTime >= 200 },
  { id: "score_50", name: "Keeper", emberReward: 10, check: m => m.highScore >= 50 },
  { id: "score_100", name: "Guardian", emberReward: 20, check: m => m.highScore >= 100 },
  { id: "score_200", name: "Beacon", emberReward: 40, check: m => m.highScore >= 200 },
  { id: "veteran", name: "Veteran", emberReward: 15, check: m => m.gamesPlayed >= 10 },
  { id: "dedicated", name: "Dedicated", emberReward: 30, check: m => m.gamesPlayed >= 25 },
];

export function checkMilestones(meta: LFMeta): string[] {
  const newUnlocks: string[] = [];
  for (const ms of MILESTONES) {
    if (!meta.milestones.includes(ms.id) && ms.check(meta)) {
      meta.milestones.push(ms.id);
      meta.embers += ms.emberReward;
      newUnlocks.push(`${ms.name} (+${ms.emberReward})`);
    }
  }
  return newUnlocks;
}

export function getMilestoneProgress(meta: LFMeta): { earned: number; total: number } {
  return { earned: meta.milestones.length, total: MILESTONES.length };
}

// ---------------------------------------------------------------------------
// Run history
// ---------------------------------------------------------------------------

export function recordRun(meta: LFMeta, state: LFState): void {
  const summary: LFRunSummary = {
    score: Math.floor(state.score),
    wave: state.wave,
    time: Math.floor(state.time),
    mutators: [...state.activeMutators],
    deathCause: state.deathCause || "Unknown",
  };
  meta.runHistory.push(summary);
  if (meta.runHistory.length > 5) meta.runHistory.shift(); // keep last 5
}
