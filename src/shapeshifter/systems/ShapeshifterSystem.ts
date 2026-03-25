// ---------------------------------------------------------------------------
// Shapeshifter — Core game systems
// Transform between Wolf, Eagle, and Bear forms mid-combat
// ---------------------------------------------------------------------------

import type { SSState, SSEnemy, SSEnemyKind, SSForm, SSBossKind } from "../types";
import { SS } from "../config/ShapeshifterBalance";

const FORM_COLORS_SYS: Record<SSForm, number> = { wolf: SS.COLOR_WOLF_BRIGHT, eagle: SS.COLOR_EAGLE_BRIGHT, bear: SS.COLOR_BEAR_BRIGHT };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function randRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

// ---------------------------------------------------------------------------
// Player movement + cooldown timers
// ---------------------------------------------------------------------------

export function updatePlayer(state: SSState, dt: number, keys: Set<string>): void {
  // Wolf lunge movement — highest priority
  if (state.wolfLunging && state.wolfLungeTimer > 0) {
    state.wolfLungeTimer -= dt;
    state.playerX += Math.cos(state.wolfLungeAngle) * SS.WOLF_LUNGE_SPEED * dt;
    state.playerY += Math.sin(state.wolfLungeAngle) * SS.WOLF_LUNGE_SPEED * dt;
    if (state.wolfLungeTimer <= 0) {
      state.wolfLunging = false;
      state.wolfLungeTimer = 0;
    }
  } else if (state.eagleDiving && state.eagleDiveTimer > 0) {
    // Eagle dive movement — head toward eagleDiveX/Y
    state.eagleDiveTimer -= dt;
    const a = angle(state.playerX, state.playerY, state.eagleDiveX, state.eagleDiveY);
    state.playerX += Math.cos(a) * SS.EAGLE_DIVE_SPEED * dt;
    state.playerY += Math.sin(a) * SS.EAGLE_DIVE_SPEED * dt;
    const d = dist(state.playerX, state.playerY, state.eagleDiveX, state.eagleDiveY);
    if (state.eagleDiveTimer <= 0 || d < 8) {
      // Perfect dive bonus — count hits BEFORE dealing damage
      let diveHitCount = 0;
      for (const e2 of state.enemies) {
        if (!e2.alive) continue;
        if (dist(e2.x, e2.y, state.eagleDiveX, state.eagleDiveY) < SS.EAGLE_DIVE_RADIUS + e2.radius) {
          diveHitCount++;
        }
      }
      // Landing — AoE damage
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const ed = dist(e.x, e.y, state.eagleDiveX, state.eagleDiveY);
        if (ed < SS.EAGLE_DIVE_RADIUS + e.radius) {
          damageEnemy(state, e, SS.EAGLE_DIVE_DAMAGE);
        }
      }
      if (diveHitCount >= 3) {
        state.score += 25 * diveHitCount;
        spawnFloatText(state, state.eagleDiveX, state.eagleDiveY - 30, `PERFECT DIVE x${diveHitCount}!`, SS.COLOR_GOLD, 1.5);
        state.screenFlashColor = SS.COLOR_EAGLE_BRIGHT;
        state.screenFlashTimer = SS.FLASH_DURATION;
      }
      spawnShockwave(state, state.eagleDiveX, state.eagleDiveY, SS.EAGLE_DIVE_RADIUS * 2, SS.COLOR_EAGLE_BRIGHT);
      spawnParticles(state, state.eagleDiveX, state.eagleDiveY, SS.COLOR_EAGLE_BRIGHT, 12);
      state.screenShake = SS.SHAKE_INTENSITY;
      state.eagleDiving = false;
      state.eagleDiveTimer = 0;
      state.invulnTimer = 0;
    }
  } else {
    // Normal WASD movement
    let mx = 0, my = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
      mx /= len; my /= len;
      state.moveAngle = Math.atan2(my, mx);
    }

    // Speed depends on current form and sprint state
    let speed: number;
    if (state.currentForm === "wolf") {
      speed = state.wolfSprinting ? SS.WOLF_SPRINT_SPEED : SS.WOLF_SPEED;
    } else if (state.currentForm === "eagle") {
      speed = SS.EAGLE_SPEED;
    } else {
      speed = SS.BEAR_SPEED;
    }

    // Swamp slow check
    let swampSlow = false;
    for (const h of state.arenaHazards) {
      if (h.kind === "swamp" && h.active) {
        if (dist(state.playerX, state.playerY, h.x, h.y) < h.radius) {
          swampSlow = true;
          break;
        }
      }
    }
    if (swampSlow) speed *= 0.5;

    state.playerX += mx * speed * dt;
    state.playerY += my * speed * dt;

    // Footstep particles when moving
    const isMoving = mx !== 0 || my !== 0;
    if (isMoving) {
      state.footstepTimer -= dt;
      if (state.footstepTimer <= 0) {
        state.footstepTimer = 0.12;
        const footColor =
          state.currentForm === "wolf" ? SS.COLOR_WOLF :
          state.currentForm === "eagle" ? SS.COLOR_EAGLE :
          SS.COLOR_BEAR;
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 8 + Math.random() * 12;
          state.particles.push({
            x: state.playerX + (Math.random() - 0.5) * 6,
            y: state.playerY + state.playerRadius,
            vx: Math.cos(a) * spd,
            vy: -Math.abs(Math.sin(a)) * spd * 0.4 - 3,
            life: 0.22, maxLife: 0.22,
            color: footColor, size: 1.5 + Math.random() * 0.8,
          });
        }
      }
    } else {
      state.footstepTimer = 0;
    }
  }

  // Constrain to arena
  const margin = state.playerRadius + 5;
  state.playerX = clamp(state.playerX, margin, state.arenaW - margin);
  state.playerY = clamp(state.playerY, margin, state.arenaH - margin);

  // Update all cooldown timers
  if (state.formSwitchTimer > 0) state.formSwitchTimer -= dt;
  if (state.wolfLungeTimer < 0) state.wolfLungeTimer = 0;
  if (state.wolfSprintTimer > 0) {
    state.wolfSprintTimer -= dt;
    if (state.wolfSprintTimer <= 0) {
      state.wolfSprinting = false;
      state.wolfSprintTimer = 0;
    }
  }
  if (state.eagleBoltCooldown > 0) state.eagleBoltCooldown -= dt;
  if (state.eagleDiveCooldown > 0) state.eagleDiveCooldown -= dt;
  if (state.bearSwipeCooldown > 0) state.bearSwipeCooldown -= dt;
  if (state.bearRoarCooldown > 0) state.bearRoarCooldown -= dt;
  if (state.bearSlamCooldown > 0) state.bearSlamCooldown -= dt;
  if (state.invulnTimer > 0) state.invulnTimer -= dt;

  // Whirlwind damage tick (eagle ultimate)
  if (state.whirlwindTimer > 0) {
    state.whirlwindTimer -= dt;
    state.whirlwindDamageTimer -= dt;
    if (state.whirlwindDamageTimer <= 0) {
      state.whirlwindDamageTimer = 0.25;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const d = dist(e.x, e.y, state.playerX, state.playerY);
        if (d < SS.EAGLE_WHIRLWIND_RADIUS + e.radius) {
          damageEnemy(state, e, SS.EAGLE_WHIRLWIND_DAMAGE);
        }
      }
      spawnParticles(state, state.playerX, state.playerY, SS.COLOR_EAGLE_BRIGHT, 4);
    }
    if (state.whirlwindTimer <= 0) {
      state.whirlwindTimer = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Form switching
// ---------------------------------------------------------------------------

export function switchForm(state: SSState, form: SSForm): void {
  if (state.currentForm === form) return;
  if (state.formSwitchTimer > 0) return;

  const prevForm = state.currentForm;

  // Leaving bear form — remove bear HP bonus (but don't kill player)
  if (prevForm === "bear") {
    state.maxHP -= SS.BEAR_HP_BONUS;
    state.playerHP = Math.min(state.playerHP, state.maxHP);
    if (state.playerHP < 1) state.playerHP = 1;
  }

  state.currentForm = form;
  state.formSwitchTimer = SS.FORM_SWITCH_COOLDOWN;

  // Entering bear form — gain HP bonus
  if (form === "bear") {
    state.maxHP += SS.BEAR_HP_BONUS;
    state.playerHP = Math.min(state.playerHP + SS.BEAR_HP_BONUS, state.maxHP);
  }

  // Form-change particle burst
  const formColor =
    form === "wolf" ? SS.COLOR_WOLF_BRIGHT :
    form === "eagle" ? SS.COLOR_EAGLE_BRIGHT :
    SS.COLOR_BEAR_BRIGHT;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const spd = 60 + Math.random() * 60;
    state.particles.push({
      x: state.playerX,
      y: state.playerY,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.4, maxLife: 0.4,
      color: formColor, size: 2.5 + Math.random() * 1.5,
    });
  }

  // Float text with form name
  const formName = form === "wolf" ? "WOLF" : form === "eagle" ? "EAGLE" : "BEAR";
  spawnFloatText(state, state.playerX, state.playerY - 20, formName, formColor, 1.0);
  spawnShockwave(state, state.playerX, state.playerY, 40, formColor);

  // Form switch combo — rapid switching grants bonuses
  state.formSwitchCombo++;
  state.formSwitchComboTimer = 2.0;
  if (state.formSwitchCombo === 3) {
    spawnFloatText(state, state.playerX, state.playerY - 35, "WILD SURGE!", SS.COLOR_GOLD, 1.4);
    state.score += 20;
    // Heal 1 HP
    state.playerHP = Math.min(state.maxHP, state.playerHP + 1);
    spawnParticles(state, state.playerX, state.playerY, SS.COLOR_GOLD, 10);
    state.formSwitchCombo = 0;
  }
}

// ---------------------------------------------------------------------------
// Primary attack
// ---------------------------------------------------------------------------

export function tryAttack(state: SSState): void {
  switch (state.currentForm) {
    case "wolf":  tryWolfLunge(state); break;
    case "eagle": tryEagleBolt(state); break;
    case "bear":  tryBearSwipe(state); break;
  }
}

function tryWolfLunge(state: SSState): void {
  // wolfLungeTimer doubles as attack cooldown when not lunging
  if (state.wolfLunging) return;
  if (state.wolfLungeCooldownTimer > 0) return;

  state.wolfLunging = true;
  state.wolfLungeTimer = SS.WOLF_LUNGE_DURATION;
  state.wolfLungeAngle = state.aimAngle;
  state.invulnTimer = SS.WOLF_LUNGE_DURATION; // invuln during lunge
  state.wolfLungeCooldownTimer = SS.WOLF_LUNGE_COOLDOWN;

  const sprintBonus = state.wolfSprinting ? 2 : 1;

  // Create forward slash
  state.slashes.push({
    x: state.playerX + Math.cos(state.aimAngle) * 20,
    y: state.playerY + Math.sin(state.aimAngle) * 20,
    angle: state.aimAngle,
    radius: SS.WOLF_LUNGE_RANGE,
    life: 0.15, maxLife: 0.15,
    damage: SS.WOLF_LUNGE_DAMAGE * (1 + state.wolfPowerLevel * 0.2) * (1 + state.formMastery.wolf * 0.05) * sprintBonus,
    form: "wolf",
    hitIds: [],
  });

  if (state.wolfSprinting) {
    spawnFloatText(state, state.playerX, state.playerY - 28, "SPRINT STRIKE!", SS.COLOR_WOLF_BRIGHT, 1.0);
  }

  spawnParticles(state, state.playerX, state.playerY, SS.COLOR_WOLF_BRIGHT, 5);
}

function tryEagleBolt(state: SSState): void {
  if (state.eagleBoltCooldown > 0) return;
  state.eagleBoltCooldown = SS.EAGLE_BOLT_COOLDOWN;

  // Combo fire rate bonus
  if (state.comboCount > 0) {
    state.eagleBoltCooldown *= Math.max(0.7, 1 - state.comboCount * 0.04);
  }

  state.projectiles.push({
    x: state.playerX,
    y: state.playerY,
    vx: Math.cos(state.aimAngle) * SS.EAGLE_BOLT_SPEED,
    vy: Math.sin(state.aimAngle) * SS.EAGLE_BOLT_SPEED,
    damage: SS.EAGLE_BOLT_DAMAGE * (1 + state.eaglePowerLevel * 0.2) * (1 + state.formMastery.eagle * 0.05),
    radius: SS.EAGLE_BOLT_RADIUS,
    life: SS.EAGLE_BOLT_LIFE,
    color: SS.COLOR_EAGLE_BRIGHT,
    fromEnemy: false,
    kind: "feather",
  });

  // Muzzle particles
  for (let i = 0; i < 2; i++) {
    const spread = (Math.random() - 0.5) * 0.7;
    state.particles.push({
      x: state.playerX,
      y: state.playerY,
      vx: Math.cos(state.aimAngle + spread) * 80,
      vy: Math.sin(state.aimAngle + spread) * 80,
      life: 0.18, maxLife: 0.18,
      color: SS.COLOR_EAGLE_BRIGHT, size: 2 + Math.random(),
    });
  }
}

function tryBearSwipe(state: SSState): void {
  if (state.bearSwipeCooldown > 0) return;
  state.bearSwipeCooldown = SS.BEAR_SWIPE_COOLDOWN;

  state.slashes.push({
    x: state.playerX,
    y: state.playerY,
    angle: state.aimAngle,
    radius: SS.BEAR_SWIPE_RADIUS,
    life: 0.2, maxLife: 0.2,
    damage: SS.BEAR_SWIPE_DAMAGE * (1 + state.bearPowerLevel * 0.2) * (1 + state.formMastery.bear * 0.05),
    form: "bear",
    hitIds: [],
  });

  state.screenShake = Math.max(state.screenShake, 2);
  spawnParticles(state, state.playerX, state.playerY, SS.COLOR_BEAR_BRIGHT, 7);
}

// ---------------------------------------------------------------------------
// Ability (Shift)
// ---------------------------------------------------------------------------

export function tryAbility(state: SSState): void {
  switch (state.currentForm) {
    case "wolf":  tryWolfSprint(state); break;
    case "eagle": tryEagleDive(state); break;
    case "bear":  tryBearRoar(state); break;
  }
}

function tryWolfSprint(state: SSState): void {
  if (state.wolfSprintCooldownTimer > 0) return;
  if (state.wolfSprinting) return;

  state.wolfSprinting = true;
  state.wolfSprintTimer = SS.WOLF_SPRINT_DURATION;
  state.wolfSprintCooldownTimer = SS.WOLF_SPRINT_COOLDOWN;

  // Sprint particles
  for (let i = 0; i < 10; i++) {
    const a = state.moveAngle + Math.PI + (Math.random() - 0.5) * 1.2;
    const spd = 40 + Math.random() * 50;
    state.particles.push({
      x: state.playerX,
      y: state.playerY,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.3, maxLife: 0.3,
      color: SS.COLOR_WOLF_BRIGHT, size: 2 + Math.random() * 1.5,
    });
  }
  spawnFloatText(state, state.playerX, state.playerY - 18, "SPRINT!", SS.COLOR_WOLF_BRIGHT, 0.7);
}

function tryEagleDive(state: SSState): void {
  if (state.eagleDiveCooldown > 0) return;
  if (state.eagleDiving) return;

  state.eagleDiveCooldown = SS.EAGLE_DIVE_COOLDOWN;
  state.eagleDiving = true;
  state.eagleDiveTimer = SS.EAGLE_DIVE_DURATION;
  state.invulnTimer = SS.EAGLE_DIVE_DURATION;

  // Target = aimAngle * EAGLE_DIVE_RADIUS distance from player
  state.eagleDiveX = state.playerX + Math.cos(state.aimAngle) * SS.EAGLE_DIVE_RADIUS * 2.2;
  state.eagleDiveY = state.playerY + Math.sin(state.aimAngle) * SS.EAGLE_DIVE_RADIUS * 2.2;

  // Clamp dive target to arena
  state.eagleDiveX = clamp(state.eagleDiveX, SS.PLAYER_RADIUS + 10, state.arenaW - SS.PLAYER_RADIUS - 10);
  state.eagleDiveY = clamp(state.eagleDiveY, SS.PLAYER_RADIUS + 10, state.arenaH - SS.PLAYER_RADIUS - 10);

  spawnFloatText(state, state.playerX, state.playerY - 18, "DIVE!", SS.COLOR_EAGLE_BRIGHT, 0.7);
}

function tryBearRoar(state: SSState): void {
  if (state.bearRoarCooldown > 0) return;

  state.bearRoarCooldown = SS.BEAR_ROAR_COOLDOWN;

  let stunCount = 0;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(e.x, e.y, state.playerX, state.playerY);
    if (d < SS.BEAR_ROAR_RADIUS + e.radius) {
      e.stunTimer = SS.BEAR_ROAR_STUN_DURATION;
      e.state = "stunned";
      stunCount++;
    }
  }

  spawnShockwave(state, state.playerX, state.playerY, SS.BEAR_ROAR_RADIUS * 2, SS.COLOR_BEAR_BRIGHT);
  spawnParticles(state, state.playerX, state.playerY, SS.COLOR_BEAR_BRIGHT, 14);
  state.screenShake = SS.SHAKE_INTENSITY;

  const label = stunCount > 0 ? `ROAR! x${stunCount}` : "ROAR!";
  spawnFloatText(state, state.playerX, state.playerY - 22, label, SS.COLOR_BEAR_BRIGHT, 1.0);
}

// ---------------------------------------------------------------------------
// Ultimate (Q)
// ---------------------------------------------------------------------------

export function tryUltimate(state: SSState): void {
  switch (state.currentForm) {
    case "wolf":  tryWolfUltimate(state); break;
    case "eagle": tryEagleUltimate(state); break;
    case "bear":  tryBearUltimate(state); break;
  }
}

function tryWolfUltimate(state: SSState): void {
  if (state.wolfUltCooldownTimer > 0) return;
  state.wolfUltCooldownTimer = SS.ALLY_SUMMON_COOLDOWN;

  for (let i = 0; i < SS.WOLF_ALLY_COUNT; i++) {
    const a = (i / SS.WOLF_ALLY_COUNT) * Math.PI * 2 + state.aimAngle;
    const spawnDist = 30 + i * 10;
    state.allies.push({
      x: state.playerX + Math.cos(a) * spawnDist,
      y: state.playerY + Math.sin(a) * spawnDist,
      hp: SS.ALLY_HP,
      maxHp: SS.ALLY_HP,
      kind: "wolf",
      speed: SS.ALLY_SPEED * 1.2,
      radius: SS.ALLY_RADIUS,
      life: SS.ALLY_DURATION + state.allyDurationBonus,
      attackTimer: 0,
      targetEid: "",
    });
    spawnParticles(state, state.playerX + Math.cos(a) * spawnDist, state.playerY + Math.sin(a) * spawnDist, SS.COLOR_WOLF_BRIGHT, 6);
  }
  spawnFloatText(state, state.playerX, state.playerY - 24, "WOLF PACK!", SS.COLOR_WOLF_BRIGHT, 1.0);
}

function tryEagleUltimate(state: SSState): void {
  if (state.eagleUltCooldownTimer > 0) return;
  state.eagleUltCooldownTimer = SS.ALLY_SUMMON_COOLDOWN + 3;

  // Whirlwind — spinning damage zone around player
  state.whirlwindTimer = SS.EAGLE_WHIRLWIND_DURATION;
  state.whirlwindDamageTimer = 0;

  spawnShockwave(state, state.playerX, state.playerY, SS.EAGLE_WHIRLWIND_RADIUS * 2, SS.COLOR_EAGLE_BRIGHT);
  spawnParticles(state, state.playerX, state.playerY, SS.COLOR_EAGLE_BRIGHT, 18);
  spawnFloatText(state, state.playerX, state.playerY - 24, "WHIRLWIND!", SS.COLOR_EAGLE_BRIGHT, 1.2);
}

function tryBearUltimate(state: SSState): void {
  if (state.bearSlamCooldown > 0) return;
  state.bearSlamCooldown = SS.BEAR_SLAM_COOLDOWN;

  // Earthquake slam — massive AoE
  let killCount = 0;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(e.x, e.y, state.playerX, state.playerY);
    if (d < SS.BEAR_SLAM_RADIUS + e.radius) {
      damageEnemy(state, e, SS.BEAR_SLAM_DAMAGE * (1 + state.bearPowerLevel * 0.2));
      if (!e.alive) killCount++;
    }
  }

  spawnShockwave(state, state.playerX, state.playerY, SS.BEAR_SLAM_RADIUS * 2.5, SS.COLOR_BEAR_BRIGHT);
  spawnParticles(state, state.playerX, state.playerY, SS.COLOR_BEAR_BRIGHT, 20);
  state.screenShake = SS.SHAKE_INTENSITY * 2.5;
  state.screenFlashTimer = 0.1;
  state.screenFlashColor = SS.COLOR_BEAR_BRIGHT;
  spawnFloatText(state, state.playerX, state.playerY - 26, "EARTHQUAKE!", SS.COLOR_BEAR_BRIGHT, 1.4);
}

// ---------------------------------------------------------------------------
// Slashes
// ---------------------------------------------------------------------------

export function updateSlashes(state: SSState, dt: number): void {
  for (let i = state.slashes.length - 1; i >= 0; i--) {
    const s = state.slashes[i];
    s.life -= dt;
    if (s.life <= 0) {
      state.slashes.splice(i, 1);
      continue;
    }

    // Check collision with enemies
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (s.hitIds.includes(e.eid)) continue;

      const d = dist(s.x, s.y, e.x, e.y);
      let hit = false;

      if (s.form === "wolf") {
        // Wolf slash: narrow and long — check within range and within a narrow forward cone
        if (d < s.radius + e.radius) {
          const a = angle(s.x, s.y, e.x, e.y);
          const diff = Math.abs(normalizeAngle(a - s.angle));
          if (diff < 0.5) hit = true;
        }
      } else if (s.form === "bear") {
        // Bear swipe: wide arc
        if (d < s.radius + e.radius) {
          const a = angle(s.x, s.y, e.x, e.y);
          const diff = Math.abs(normalizeAngle(a - s.angle));
          if (diff < SS.BEAR_SWIPE_ARC) hit = true;
        }
      }

      if (hit) {
        s.hitIds.push(e.eid);
        damageEnemy(state, e, s.damage);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

export function updateProjectiles(state: SSState, dt: number): boolean {
  let playerDied = false;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    // Out of bounds or expired
    if (p.life <= 0 || p.x < 0 || p.x > state.arenaW || p.y < 0 || p.y > state.arenaH) {
      state.projectiles.splice(i, 1);
      continue;
    }

    if (p.fromEnemy) {
      // Check player hit
      if (state.invulnTimer <= 0) {
        const d = dist(p.x, p.y, state.playerX, state.playerY);
        if (d < p.radius + state.playerRadius) {
          state.projectiles.splice(i, 1);
          if (hitPlayer(state, p.damage)) playerDied = true;
          continue;
        }
      }
    } else {
      // Player projectile — hit enemies
      let removed = false;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d < p.radius + e.radius) {
          damageEnemy(state, e, p.damage);
          state.projectiles.splice(i, 1);
          removed = true;
          break;
        }
      }
      if (removed) continue;
    }
  }

  return playerDied;
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

export function updateEnemies(state: SSState, dt: number): boolean {
  let playerDied = false;

  for (const e of state.enemies) {
    if (!e.alive) continue;

    // Stun
    if (e.stunTimer > 0) {
      e.stunTimer -= dt;
      if (e.stunTimer <= 0) {
        e.stunTimer = 0;
        e.state = "approach";
      }
      // Flash timer still counts
      if (e.flashTimer > 0) e.flashTimer -= dt;
      continue;
    }

    if (e.flashTimer > 0) e.flashTimer -= dt;
    if (e.stateTimer > 0) e.stateTimer -= dt;
    if (e.spawnTimer > 0) { e.spawnTimer -= dt; continue; }

    // Reset speed each frame (swamp modifies it in updateHazards)
    e.speed = e.baseSpeed;

    const effSpeed = e.speed * dt;

    switch (e.kind) {
      case "goblin": {
        // Fast melee — charges player
        const d = dist(e.x, e.y, state.playerX, state.playerY);
        if (e.state === "attack") {
          if (e.stateTimer <= 0) {
            if (hitPlayer(state, SS.GOBLIN_DAMAGE)) playerDied = true;
            e.state = "approach";
            e.stateTimer = 0.5;
          }
        } else {
          if (d < SS.GOBLIN_ATTACK_RANGE + state.playerRadius) {
            e.state = "attack";
            e.stateTimer = 0.2;
          } else {
            const a = angle(e.x, e.y, state.playerX, state.playerY);
            e.x += Math.cos(a) * effSpeed;
            e.y += Math.sin(a) * effSpeed;
          }
        }
        break;
      }

      case "orc_archer": {
        // Keeps distance, fires arrows
        const d = dist(e.x, e.y, state.playerX, state.playerY);
        if (d < SS.ORC_ARCHER_KEEP_DIST) {
          // Back away
          const a = angle(state.playerX, state.playerY, e.x, e.y);
          e.x += Math.cos(a) * effSpeed * 0.8;
          e.y += Math.sin(a) * effSpeed * 0.8;
        } else if (d > SS.ORC_ARCHER_KEEP_DIST + 40) {
          // Approach to keep distance range
          const a = angle(e.x, e.y, state.playerX, state.playerY);
          e.x += Math.cos(a) * effSpeed * 0.5;
          e.y += Math.sin(a) * effSpeed * 0.5;
        }
        // Fire timer
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = SS.ORC_ARCHER_FIRE_INTERVAL + randRange(-0.3, 0.3);
          const a = angle(e.x, e.y, state.playerX, state.playerY);
          state.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * 180,
            vy: Math.sin(a) * 180,
            damage: 1, radius: 4, life: 2.5,
            color: 0x885500, fromEnemy: true, kind: "arrow",
          });
        }
        break;
      }

      case "troll": {
        // Slow, tanky melee
        const d = dist(e.x, e.y, state.playerX, state.playerY);
        if (e.state === "attack") {
          if (e.stateTimer <= 0) {
            if (hitPlayer(state, SS.TROLL_DAMAGE)) playerDied = true;
            e.state = "approach";
            e.stateTimer = 1.2;
          }
        } else {
          if (d < SS.TROLL_ATTACK_RANGE + state.playerRadius) {
            e.state = "attack";
            e.stateTimer = 0.6;
          } else {
            const a = angle(e.x, e.y, state.playerX, state.playerY);
            e.x += Math.cos(a) * effSpeed;
            e.y += Math.sin(a) * effSpeed;
          }
        }
        break;
      }

      case "shadow_wolf": {
        // Very fast, erratic — dashes past player
        const a = angle(e.x, e.y, state.playerX, state.playerY) + (Math.random() - 0.5) * 1.4;
        e.x += Math.cos(a) * effSpeed;
        e.y += Math.sin(a) * effSpeed;

        // Contact damage
        const dw = dist(e.x, e.y, state.playerX, state.playerY);
        if (dw < e.radius + state.playerRadius + 4 && e.stateTimer <= 0) {
          if (hitPlayer(state, SS.SHADOW_WOLF_DAMAGE)) playerDied = true;
          e.stateTimer = 0.6;
        }
        break;
      }

      case "dark_druid": {
        // Keeps max distance, periodically summons goblins
        const d = dist(e.x, e.y, state.playerX, state.playerY);
        if (d < SS.DARK_DRUID_KEEP_DIST) {
          const a = angle(state.playerX, state.playerY, e.x, e.y);
          e.x += Math.cos(a) * effSpeed;
          e.y += Math.sin(a) * effSpeed;
        } else if (d > SS.DARK_DRUID_KEEP_DIST + 50) {
          const a = angle(e.x, e.y, state.playerX, state.playerY);
          e.x += Math.cos(a) * effSpeed * 0.4;
          e.y += Math.sin(a) * effSpeed * 0.4;
        }

        // Summon goblins
        e.summonTimer -= dt;
        if (e.summonTimer <= 0) {
          e.summonTimer = SS.DARK_DRUID_SUMMON_INTERVAL;
          // Max 2 active goblins per druid (approximate via total active check)
          const activeGoblins = state.enemies.filter(x => x.alive && x.kind === "goblin").length;
          if (activeGoblins < 8) {
            for (let i = 0; i < 2; i++) {
              spawnEnemy(state, "goblin", e.x + randRange(-25, 25), e.y + randRange(-25, 25), state.wave);
            }
            spawnParticles(state, e.x, e.y, 0x44cc44, 8);
            spawnFloatText(state, e.x, e.y - 14, "SUMMON", 0x44cc44, 0.8);
          }
        }
        break;
      }
    }

    // Constrain to arena
    e.x = clamp(e.x, e.radius + 5, state.arenaW - e.radius - 5);
    e.y = clamp(e.y, e.radius + 5, state.arenaH - e.radius - 5);
  }

  return playerDied;
}

// ---------------------------------------------------------------------------
// Allies
// ---------------------------------------------------------------------------

export function updateAllies(state: SSState, dt: number): void {
  for (let i = state.allies.length - 1; i >= 0; i--) {
    const ally = state.allies[i];
    ally.life -= dt;
    if (ally.life <= 0 || ally.hp <= 0) {
      spawnParticles(state, ally.x, ally.y, SS.COLOR_WOLF, 4);
      state.allies.splice(i, 1);
      continue;
    }

    ally.attackTimer = Math.max(0, ally.attackTimer - dt);

    // Find nearest living enemy
    let nearest: SSEnemy | null = null;
    let nearestDist = Infinity;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const d = dist(ally.x, ally.y, e.x, e.y);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }

    if (!nearest) continue;
    ally.targetEid = nearest.eid;

    switch (ally.kind) {
      case "wolf": {
        // Melee lunge toward nearest enemy
        const a = angle(ally.x, ally.y, nearest.x, nearest.y);
        ally.x += Math.cos(a) * ally.speed * dt;
        ally.y += Math.sin(a) * ally.speed * dt;
        if (nearestDist < ally.radius + nearest.radius + 8 && ally.attackTimer <= 0) {
          ally.attackTimer = SS.ALLY_ATTACK_COOLDOWN;
          damageEnemy(state, nearest, SS.ALLY_DAMAGE);
        }
        break;
      }
      case "eagle": {
        // Keep moderate distance and fire bolts
        if (nearestDist < 60) {
          const a = angle(nearest.x, nearest.y, ally.x, ally.y);
          ally.x += Math.cos(a) * ally.speed * 0.8 * dt;
          ally.y += Math.sin(a) * ally.speed * 0.8 * dt;
        } else {
          const a = angle(ally.x, ally.y, nearest.x, nearest.y);
          ally.x += Math.cos(a) * ally.speed * 0.5 * dt;
          ally.y += Math.sin(a) * ally.speed * 0.5 * dt;
        }
        if (ally.attackTimer <= 0 && nearestDist < 150) {
          ally.attackTimer = SS.ALLY_ATTACK_COOLDOWN;
          const a = angle(ally.x, ally.y, nearest.x, nearest.y);
          state.projectiles.push({
            x: ally.x, y: ally.y,
            vx: Math.cos(a) * SS.EAGLE_BOLT_SPEED * 0.8,
            vy: Math.sin(a) * SS.EAGLE_BOLT_SPEED * 0.8,
            damage: SS.ALLY_DAMAGE, radius: 3, life: 1.5,
            color: SS.COLOR_EAGLE_BRIGHT, fromEnemy: false, kind: "feather",
          });
        }
        break;
      }
      case "bear": {
        // Slow, swipes at nearby enemies
        const a = angle(ally.x, ally.y, nearest.x, nearest.y);
        ally.x += Math.cos(a) * ally.speed * 0.7 * dt;
        ally.y += Math.sin(a) * ally.speed * 0.7 * dt;
        if (nearestDist < ally.radius + nearest.radius + 14 && ally.attackTimer <= 0) {
          ally.attackTimer = SS.ALLY_ATTACK_COOLDOWN * 1.5;
          // Swipe all nearby enemies
          for (const e of state.enemies) {
            if (!e.alive) continue;
            if (dist(ally.x, ally.y, e.x, e.y) < ally.radius + e.radius + 14) {
              damageEnemy(state, e, SS.ALLY_DAMAGE * 2);
            }
          }
        }
        break;
      }
    }

    // Constrain allies to arena
    ally.x = clamp(ally.x, ally.radius + 5, state.arenaW - ally.radius - 5);
    ally.y = clamp(ally.y, ally.radius + 5, state.arenaH - ally.radius - 5);
  }
}

// ---------------------------------------------------------------------------
// Wave progression
// ---------------------------------------------------------------------------

export function updateWave(state: SSState, dt: number): void {
  const liveEnemies = state.enemies.filter(e => e.alive).length;

  // Announce timer
  if (state.waveAnnounceTimer > 0) state.waveAnnounceTimer -= dt;

  state.waveTimer -= dt;
  if (state.waveTimer > 0) return;
  // Don't start new wave if too many enemies alive (cap at ENEMY_MAX)
  if (liveEnemies >= SS.ENEMY_MAX) return;

  // Advance wave
  state.wave++;
  state.waveTimer = SS.WAVE_INTERVAL;
  state.enemiesKilled = 0;

  const w = state.wave;
  const hpScale = 1 + (w - 1) * 0.15;

  // Check for wave events
  let waveEvent = "";
  let customSpawns: Array<{ kind: SSEnemyKind; count: number }> = [];

  if (w === 3)  { waveEvent = "GOBLIN RUSH";      customSpawns = [{ kind: "goblin", count: 6 }]; }
  else if (w === 5)  { waveEvent = "SHADOW PACK"; customSpawns = [{ kind: "shadow_wolf", count: 4 }]; }
  else if (w === 7)  { waveEvent = "HUNTER'S TRIAL";   customSpawns = [{ kind: "shadow_wolf", count: 3 }, { kind: "orc_archer", count: 2 }]; }
  else if (w === 8)  { waveEvent = "TROLL SIEGE"; customSpawns = [{ kind: "troll", count: 3 }]; }
  else if (w === 10) { waveEvent = "ALPHA BEAST"; spawnBoss(state, "alpha_beast"); customSpawns = []; }
  else if (w === 12) { waveEvent = "CROSSBOW VOLLEY"; customSpawns = [{ kind: "orc_archer", count: 5 }]; }
  else if (w === 14) { waveEvent = "DRUID COUNCIL";    customSpawns = [{ kind: "dark_druid", count: 4 }]; }
  else if (w === 15) { waveEvent = "BLOOD MOON";   customSpawns = []; } // speed/HP buff handled below
  else if (w === 17) { waveEvent = "ELITE VANGUARD";   customSpawns = [{ kind: "troll", count: 2 }, { kind: "shadow_wolf", count: 3 }]; }
  else if (w === 20) { waveEvent = "ANCIENT TREANT"; spawnBoss(state, "ancient_treant"); customSpawns = []; }
  else if (w === 25) { waveEvent = "NATURE'S WRATH";   customSpawns = [{ kind: "troll", count: 3 }, { kind: "dark_druid", count: 3 }, { kind: "shadow_wolf", count: 3 }]; }
  else if (w === 30) { waveEvent = "CHIMERA"; spawnBoss(state, "chimera"); customSpawns = []; }
  else if (w > 30 && w % 10 === 0) {
    const bossKinds: SSBossKind[] = ["alpha_beast", "ancient_treant", "chimera"];
    const bossIdx = Math.floor((w - 30) / 10 - 1) % 3;
    spawnBoss(state, bossKinds[bossIdx]);
    if (state.boss) {
      const scale = 1 + (w - 30) * 0.1;
      state.boss.hp = Math.ceil(state.boss.hp * scale);
      state.boss.maxHp = state.boss.hp;
    }
    waveEvent = "BOSS";
    customSpawns = [];
  }
  // Repeating events after wave 20 (every 5 non-event waves)
  else if (w > 20 && w % 5 === 0) {
    const events = ["HORDE", "ELITE SWARM", "BEAST TIDE"];
    const idx = Math.floor(Math.random() * events.length);
    waveEvent = events[idx];
    if (idx === 0) customSpawns = [{ kind: "goblin", count: 12 }];
    else if (idx === 1) {
      customSpawns = [{ kind: "troll", count: 2 }, { kind: "dark_druid", count: 2 }];
      // Mark as elite after spawning (handled below)
    }
    else customSpawns = [{ kind: "shadow_wolf", count: 8 }];
  }

  state.waveEventActive = waveEvent;
  if (waveEvent) {
    state.waveAnnounceTimer = 3.0;
    spawnFloatText(state, state.arenaW / 2, state.arenaH / 2, waveEvent, SS.COLOR_DANGER, 2.5);
  }

  // Determine available enemy types for this wave
  const available: SSEnemyKind[] = ["goblin"];
  if (w >= 2) available.push("orc_archer");
  if (w >= 3) available.push("shadow_wolf");
  if (w >= 4) available.push("troll");
  if (w >= 6) available.push("dark_druid");

  // Spawn custom event enemies
  if (customSpawns.length > 0) {
    for (const { kind, count } of customSpawns) {
      for (let i = 0; i < count; i++) {
        spawnEnemyEdge(state, kind, w, hpScale);
      }
    }
  } else {
    // Standard wave spawning — scale count with wave
    const baseCount = 4 + Math.floor(w * 1.5);
    const count = Math.min(baseCount, SS.ENEMY_MAX);
    for (let i = 0; i < count; i++) {
      const kind = available[Math.floor(Math.random() * available.length)];
      spawnEnemyEdge(state, kind, w, hpScale);
    }
  }

  // Arena hazards every 4 waves
  if (w > 0 && w % 4 === 0 && !state.bossWave) {
    const hazardKinds: Array<"bramble" | "swamp" | "spirit_well"> = ["bramble", "swamp", "spirit_well"];
    const count = 1 + Math.floor(w / 10);
    for (let hi = 0; hi < Math.min(3, count); hi++) {
      state.arenaHazards.push({
        x: randRange(60, state.arenaW - 60),
        y: randRange(60, state.arenaH - 60),
        kind: hazardKinds[Math.floor(Math.random() * hazardKinds.length)],
        radius: 35 + Math.random() * 15,
        life: SS.WAVE_INTERVAL, maxLife: SS.WAVE_INTERVAL,
        active: true,
        activeTimer: 2.0 + Math.random() * 2,
      });
    }
  }

  // Blood Moon: buff all spawned enemies
  if (w === 15 || state.bloodMoonActive) {
    if (w === 15) state.bloodMoonActive = true;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      e.speed = e.baseSpeed * 1.5;
      e.maxHp = Math.ceil(e.maxHp * 1.5);
      e.hp = e.maxHp;
    }
  }

  // Elite enemies: 15% chance per enemy after wave 8
  if (w > 8) {
    for (const e of state.enemies) {
      if (!e.alive || e.elite) continue;
      if (Math.random() < 0.15) {
        e.elite = true;
        e.hp = Math.ceil(e.hp * 1.5);
        e.maxHp = Math.ceil(e.maxHp * 1.5);
        e.speed *= 1.2;
      }
    }
  }
}

function spawnEnemyEdge(state: SSState, kind: SSEnemyKind, wave: number, hpScale: number): void {
  // Pick random edge
  const edge = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  const m = 15;
  if (edge === 0) { x = randRange(m, state.arenaW - m); y = m; }
  else if (edge === 1) { x = randRange(m, state.arenaW - m); y = state.arenaH - m; }
  else if (edge === 2) { x = m; y = randRange(m, state.arenaH - m); }
  else { x = state.arenaW - m; y = randRange(m, state.arenaH - m); }
  spawnEnemy(state, kind, x, y, wave, hpScale);
}

function spawnEnemy(state: SSState, kind: SSEnemyKind, x: number, y: number, _wave: number, hpScale = 1): void {
  const id = `e${state.nextEnemyId++}`;
  let hp = 1, speed = 60, radius = 7;
  switch (kind) {
    case "goblin":     hp = SS.GOBLIN_HP;      speed = SS.GOBLIN_SPEED;      radius = SS.GOBLIN_RADIUS;      break;
    case "orc_archer": hp = SS.ORC_ARCHER_HP;  speed = SS.ORC_ARCHER_SPEED;  radius = SS.ORC_ARCHER_RADIUS;  break;
    case "troll":      hp = SS.TROLL_HP;       speed = SS.TROLL_SPEED;       radius = SS.TROLL_RADIUS;       break;
    case "shadow_wolf":hp = SS.SHADOW_WOLF_HP; speed = SS.SHADOW_WOLF_SPEED; radius = SS.SHADOW_WOLF_RADIUS; break;
    case "dark_druid": hp = SS.DARK_DRUID_HP;  speed = SS.DARK_DRUID_SPEED;  radius = SS.DARK_DRUID_RADIUS;  break;
  }
  const scaledHp = Math.ceil(hp * hpScale);
  state.enemies.push({
    eid: id,
    x, y,
    hp: scaledHp, maxHp: scaledHp,
    kind, alive: true, radius,
    speed, baseSpeed: speed,
    flashTimer: 0,
    state: "approach", stateTimer: 0,
    stunTimer: 0, spawnTimer: 0.3,
    elite: false,
    fireTimer: SS.ORC_ARCHER_FIRE_INTERVAL * Math.random(),
    summonTimer: SS.DARK_DRUID_SUMMON_INTERVAL * Math.random(),
  });
}

// ---------------------------------------------------------------------------
// Kill & rewards
// ---------------------------------------------------------------------------

export function killEnemy(state: SSState, enemy: SSEnemy): void {
  enemy.alive = false;
  state.enemiesKilled++;
  state.totalKills++;

  // Score
  let killScore = 0;
  switch (enemy.kind) {
    case "goblin":      killScore = SS.GOBLIN_SCORE; break;
    case "orc_archer":  killScore = SS.ORC_ARCHER_SCORE; break;
    case "troll":       killScore = SS.TROLL_SCORE; break;
    case "shadow_wolf": killScore = SS.SHADOW_WOLF_SCORE; break;
    case "dark_druid":  killScore = SS.DARK_DRUID_SCORE; break;
  }
  if (enemy.elite) killScore = Math.ceil(killScore * 1.5);

  // Form advantage bonus
  const formAdvantage =
    (state.currentForm === "wolf" && enemy.kind === "shadow_wolf") ||
    (state.currentForm === "eagle" && enemy.kind === "orc_archer") ||
    (state.currentForm === "bear" && enemy.kind === "troll");
  if (formAdvantage) {
    killScore = Math.ceil(killScore * 1.5);
    spawnFloatText(state, enemy.x, enemy.y - 25, "FORM BONUS!", FORM_COLORS_SYS[state.currentForm], 1.0);
  }

  // Combo
  state.comboCount++;
  state.comboTimer = 3.0;

  // Combo milestones
  if (state.comboCount === 10) {
    spawnFloatText(state, state.playerX, state.playerY - 40, "10x COMBO!", 0xffaa00, 1.5);
    state.score += 50;
  } else if (state.comboCount === 20) {
    spawnFloatText(state, state.playerX, state.playerY - 40, "20x COMBO!", 0xff6600, 1.8);
    state.score += 150;
    state.screenFlashColor = 0xff6600;
    state.screenFlashTimer = SS.FLASH_DURATION;
  } else if (state.comboCount === 50) {
    spawnFloatText(state, state.playerX, state.playerY - 40, "50x COMBO!!", SS.COLOR_GOLD, 2.5);
    state.score += 500;
    state.screenFlashColor = SS.COLOR_GOLD;
    state.screenFlashTimer = SS.FLASH_DURATION * 2;
    state.screenShake = SS.SHAKE_INTENSITY * 2;
  }

  if (state.comboCount > state.bestCombo) state.bestCombo = state.comboCount;
  const comboMul = 1 + (state.comboCount - 1) * 0.1;
  state.score += Math.ceil(killScore * comboMul);

  // Kill streak
  state.killStreakCount++;
  state.killStreakTimer = 2.5;

  if (state.killStreakCount === 2) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "DOUBLE KILL!", 0xffaa00, 1.2);
    state.score += 10;
  } else if (state.killStreakCount === 3) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "TRIPLE KILL!", 0xff6600, 1.4);
    state.score += 25;
  } else if (state.killStreakCount === 4) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "MEGA KILL!", 0xff2200, 1.6);
    state.score += 50;
  } else if (state.killStreakCount >= 5) {
    spawnFloatText(state, state.playerX, state.playerY - 30, "UNSTOPPABLE!", SS.COLOR_GOLD, 2.0);
    state.score += 100;
    state.screenFlashColor = SS.COLOR_GOLD;
    state.screenFlashTimer = SS.FLASH_DURATION;
  }

  // Track form kills and mastery
  const form = state.currentForm;
  state.formKills[form]++;
  if (state.formKills[form] % 15 === 0) {
    state.formMastery[form]++;
    const mastColor =
      form === "wolf" ? SS.COLOR_WOLF_BRIGHT :
      form === "eagle" ? SS.COLOR_EAGLE_BRIGHT :
      SS.COLOR_BEAR_BRIGHT;
    spawnFloatText(state, state.playerX, state.playerY - 32,
      `${form.toUpperCase()} MASTERY ${state.formMastery[form]}!`, mastColor, 1.5);
    state.screenFlashColor = mastColor;
    state.screenFlashTimer = SS.FLASH_DURATION;
    state.screenShake = SS.SHAKE_INTENSITY;
  }

  // Death effects
  spawnDeathEffect(state, enemy.x, enemy.y, getEnemyColor(enemy.kind));
  state.bloodStains.push({ x: enemy.x, y: enemy.y, size: enemy.radius * 1.5 + Math.random() * 4, alpha: 0.5 });

  // Hitstop for impact feel
  state.hitstopFrames = 2;
  if (enemy.elite) {
    state.hitstopFrames = 4;
    spawnParticles(state, enemy.x, enemy.y, SS.COLOR_GOLD, 10);
    spawnShockwave(state, enemy.x, enemy.y, enemy.radius * 5, SS.COLOR_GOLD);
    state.screenShake = Math.max(state.screenShake, SS.SHAKE_INTENSITY * 1.5);
  }

  // Float damage/kill text
  spawnFloatText(state, enemy.x, enemy.y - 10, String(Math.ceil(killScore * comboMul)), SS.COLOR_GOLD, 0.9);
  if (state.comboCount >= 5) {
    spawnFloatText(state, enemy.x, enemy.y - 22, `${state.comboCount}x COMBO!`, SS.COLOR_GOLD, 1.0);
  }

  // Pickups
  const r = Math.random();
  if (r < 0.20) {
    state.pickups.push({ x: enemy.x, y: enemy.y, kind: "health", life: 8.0, radius: 7 });
  } else if (r < 0.35) {
    state.pickups.push({ x: enemy.x, y: enemy.y, kind: "score_orb", life: 8.0, radius: 6 });
  } else if (r < 0.45) {
    state.pickups.push({ x: enemy.x, y: enemy.y, kind: "form_charge", life: 8.0, radius: 6 });
  }
}

// ---------------------------------------------------------------------------
// Damage helpers
// ---------------------------------------------------------------------------

export function damageEnemy(state: SSState, enemy: SSEnemy, damage: number): void {
  enemy.hp -= damage;
  enemy.flashTimer = 0.1;
  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
  } else {
    spawnParticles(state, enemy.x, enemy.y, getEnemyColor(enemy.kind), 3);
    spawnFloatText(state, enemy.x, enemy.y - 10, String(Math.ceil(damage)), 0xffffff, 0.6);
  }
}

export function hitPlayer(state: SSState, damage: number): boolean {
  if (state.invulnTimer > 0) return false;
  // Bear form damage reduction
  if (state.currentForm === "bear") {
    damage = Math.max(1, Math.ceil(damage * 0.75));
  }
  state.playerHP -= damage;
  state.invulnTimer = SS.INVULN_DURATION;
  state.screenShake = SS.SHAKE_INTENSITY;
  state.screenFlashTimer = SS.FLASH_DURATION * 0.5;
  state.screenFlashColor = SS.COLOR_DANGER;
  spawnParticles(state, state.playerX, state.playerY, SS.COLOR_DANGER, 8);

  // Reset combo on getting hit
  if (state.comboCount > 0) {
    state.comboCount = 0;
    state.comboTimer = 0;
  }

  if (state.playerHP <= 0) {
    state.playerHP = 0;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export function updateTimers(state: SSState, dt: number): void {
  state.time += dt;

  // Combo timer
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.comboCount = 0;
      state.comboTimer = 0;
    }
  }

  // Kill streak timer
  if (state.killStreakTimer > 0) {
    state.killStreakTimer -= dt;
    if (state.killStreakTimer <= 0) {
      state.killStreakCount = 0;
      state.killStreakTimer = 0;
    }
  }

  // Wolf sprint cooldown
  if (state.wolfSprintCooldownTimer > 0) {
    state.wolfSprintCooldownTimer -= dt;
    if (state.wolfSprintCooldownTimer < 0) state.wolfSprintCooldownTimer = 0;
  }
  if (state.wolfLungeCooldownTimer > 0) {
    state.wolfLungeCooldownTimer -= dt;
    if (state.wolfLungeCooldownTimer < 0) state.wolfLungeCooldownTimer = 0;
  }
  if (state.wolfUltCooldownTimer > 0) {
    state.wolfUltCooldownTimer -= dt;
    if (state.wolfUltCooldownTimer < 0) state.wolfUltCooldownTimer = 0;
  }
  if (state.eagleUltCooldownTimer > 0) {
    state.eagleUltCooldownTimer -= dt;
    if (state.eagleUltCooldownTimer < 0) state.eagleUltCooldownTimer = 0;
  }

  if (state.formSwitchComboTimer > 0) {
    state.formSwitchComboTimer -= dt;
    if (state.formSwitchComboTimer <= 0) {
      state.formSwitchCombo = 0;
    }
  }

  // Screen shake decay
  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - dt * 20);
  }
  if (state.screenFlashTimer > 0) {
    state.screenFlashTimer = Math.max(0, state.screenFlashTimer - dt);
  }

  // Score per second
  state.score += SS.SCORE_PER_SECOND * dt;

  // Remove dead enemies
  state.enemies = state.enemies.filter(e => e.alive);
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

export function updateParticles(state: SSState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.88;
    p.vy *= 0.88;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

export function spawnParticles(state: SSState, x: number, y: number, color: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 30 + Math.random() * 60;
    state.particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.3 + Math.random() * 0.3, maxLife: 0.6,
      color, size: 1.5 + Math.random() * 2,
    });
  }
}

// ---------------------------------------------------------------------------
// Float texts
// ---------------------------------------------------------------------------

export function updateFloatTexts(state: SSState, dt: number): void {
  for (let i = state.floatTexts.length - 1; i >= 0; i--) {
    const f = state.floatTexts[i];
    f.y -= 28 * dt;
    f.life -= dt;
    if (f.life <= 0) state.floatTexts.splice(i, 1);
  }
}

export function spawnFloatText(state: SSState, x: number, y: number, text: string, color: number, duration: number): void {
  state.floatTexts.push({ x, y, text, color, life: duration, maxLife: duration, scale: 1 });
}

// ---------------------------------------------------------------------------
// Shockwaves
// ---------------------------------------------------------------------------

export function updateShockwaves(state: SSState, dt: number): void {
  for (let i = state.shockwaves.length - 1; i >= 0; i--) {
    const s = state.shockwaves[i];
    s.life -= dt;
    s.radius = s.maxRadius * (1 - s.life / s.maxLife);
    if (s.life <= 0) state.shockwaves.splice(i, 1);
  }
}

export function spawnShockwave(state: SSState, x: number, y: number, maxRadius: number, color: number): void {
  state.shockwaves.push({ x, y, radius: 0, maxRadius, life: 0.35, maxLife: 0.35, color });
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

export function updatePickups(state: SSState, dt: number): void {
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    p.life -= dt;
    if (p.life <= 0) { state.pickups.splice(i, 1); continue; }

    // Magnetic attraction when player is near
    const attractDist = 70;
    const d0 = dist(p.x, p.y, state.playerX, state.playerY);
    if (d0 < attractDist && d0 > 0) {
      const attractSpeed = 100 * (1 - d0 / attractDist);
      const attractAngle = angle(p.x, p.y, state.playerX, state.playerY);
      p.x += Math.cos(attractAngle) * attractSpeed * dt;
      p.y += Math.sin(attractAngle) * attractSpeed * dt;
    }

    const d = dist(p.x, p.y, state.playerX, state.playerY);
    if (d < p.radius + state.playerRadius + 2) {
      // Collect
      switch (p.kind) {
        case "health":
          state.playerHP = Math.min(state.playerHP + 1, state.maxHP);
          spawnFloatText(state, p.x, p.y - 8, "+HP", 0x44ff88, 0.7);
          break;
        case "score_orb":
          state.score += 25 * (1 + (state.comboCount - 1) * 0.1);
          spawnFloatText(state, p.x, p.y - 8, "+25", SS.COLOR_GOLD, 0.7);
          break;
        case "form_charge":
          // Reduce all form cooldowns by 30%
          state.bearRoarCooldown = Math.max(0, state.bearRoarCooldown * 0.7);
          state.eagleDiveCooldown = Math.max(0, state.eagleDiveCooldown * 0.7);
          state.bearSlamCooldown = Math.max(0, state.bearSlamCooldown * 0.7);
          spawnFloatText(state, p.x, p.y - 8, "CHARGE!", 0xaa44ff, 0.8);
          break;
      }
      state.pickups.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Boss system
// ---------------------------------------------------------------------------

function spawnBoss(state: SSState, kind: SSBossKind): void {
  const hpMap: Record<SSBossKind, number> = {
    alpha_beast: 45,
    ancient_treant: 55,
    chimera: 65,
  };
  const speedMap: Record<SSBossKind, number> = {
    alpha_beast: 70,
    ancient_treant: 25,
    chimera: 50,
  };
  state.boss = {
    x: state.arenaW / 2, y: 50,
    hp: hpMap[kind], maxHp: hpMap[kind],
    kind, radius: 20, speed: speedMap[kind],
    phase: 0, phaseTimer: 5.0,
    attackTimer: 0, alive: true, flashTimer: 0,
  };
  state.bossWave = true;
  state.bossAnnounceTimer = 2.5;
  const names: Record<SSBossKind, string> = {
    alpha_beast: "ALPHA BEAST",
    ancient_treant: "ANCIENT TREANT",
    chimera: "CHIMERA",
  };
  spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, names[kind], SS.COLOR_DANGER, 2.5);
  state.screenFlashColor = SS.COLOR_DANGER;
  state.screenFlashTimer = SS.FLASH_DURATION * 4;
  state.screenShake = SS.SHAKE_INTENSITY * 3;
}

export function updateBoss(state: SSState, dt: number): boolean {
  const boss = state.boss;
  if (!boss || !boss.alive) return false;

  let playerHit = false;
  const px = state.playerX, py = state.playerY;
  const a = angle(boss.x, boss.y, px, py);
  const d = dist(boss.x, boss.y, px, py);

  if (boss.flashTimer > 0) boss.flashTimer -= dt;
  if (state.bossAnnounceTimer > 0) { state.bossAnnounceTimer -= dt; return false; }

  // Phase cycling
  boss.phaseTimer -= dt;
  if (boss.phaseTimer <= 0) {
    boss.phase = (boss.phase + 1) % 3;
    boss.phaseTimer = 5.0;
    boss.attackTimer = 0;
  }

  // Constrain
  const bm = boss.radius + 5;
  boss.x = clamp(boss.x, bm, state.arenaW - bm);
  boss.y = clamp(boss.y, bm, state.arenaH - bm);

  switch (boss.kind) {
    case "alpha_beast": {
      if (boss.phase === 0) {
        // Charge at player
        boss.x += Math.cos(a) * boss.speed * 2.5 * dt;
        boss.y += Math.sin(a) * boss.speed * 2.5 * dt;
        if (d < boss.radius + state.playerRadius + 5) {
          if (hitPlayer(state, 2)) playerHit = true;
        }
      } else if (boss.phase === 1) {
        // Howl — summon 3 shadow wolves
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 4.0;
          for (let i = 0; i < 3; i++) {
            const sa = Math.random() * Math.PI * 2;
            const sx = boss.x + Math.cos(sa) * 60;
            const sy = boss.y + Math.sin(sa) * 60;
            spawnEnemy(state, "shadow_wolf", clamp(sx, 20, state.arenaW - 20), clamp(sy, 20, state.arenaH - 20), state.wave);
          }
          spawnFloatText(state, boss.x, boss.y - 20, "HOWL!", 0xff4444, 1.2);
          state.screenShake = SS.SHAKE_INTENSITY * 1.5;
        }
        boss.x += Math.cos(a) * boss.speed * 0.3 * dt;
        boss.y += Math.sin(a) * boss.speed * 0.3 * dt;
      } else {
        // Leap slam — jump to player and AoE
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 3.0;
          boss.x = px + Math.cos(a + Math.PI) * 30;
          boss.y = py + Math.sin(a + Math.PI) * 30;
          boss.x = clamp(boss.x, bm, state.arenaW - bm);
          boss.y = clamp(boss.y, bm, state.arenaH - bm);
          if (d < 60) { if (hitPlayer(state, 2)) playerHit = true; }
          spawnShockwave(state, boss.x, boss.y, 80, 0xff4444);
          spawnParticles(state, boss.x, boss.y, 0xff4444, 10);
          state.screenShake = SS.SHAKE_INTENSITY * 2;
        }
      }
      break;
    }
    case "ancient_treant": {
      if (boss.phase === 0) {
        // Root attack — spawn thorn projectiles in star pattern
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 2.5;
          for (let i = 0; i < 8; i++) {
            const ta = (i / 8) * Math.PI * 2;
            state.projectiles.push({
              x: boss.x, y: boss.y,
              vx: Math.cos(ta) * 120, vy: Math.sin(ta) * 120,
              damage: 1, radius: 4, life: 3.0,
              color: 0x44aa22, fromEnemy: true, kind: "thorn",
            });
          }
          spawnParticles(state, boss.x, boss.y, 0x44aa22, 8);
        }
        // Slow approach
        if (d > 80) {
          boss.x += Math.cos(a) * boss.speed * dt;
          boss.y += Math.sin(a) * boss.speed * dt;
        }
      } else if (boss.phase === 1) {
        // Heal + summon goblins
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 5.0;
          boss.hp = Math.min(boss.maxHp, boss.hp + Math.ceil(boss.maxHp * 0.05));
          for (let i = 0; i < 4; i++) {
            const sa = Math.random() * Math.PI * 2;
            spawnEnemy(state, "goblin", boss.x + Math.cos(sa) * 50, boss.y + Math.sin(sa) * 50, state.wave);
          }
          spawnFloatText(state, boss.x, boss.y - 20, "REGROWTH!", 0x44cc44, 1.2);
          spawnParticles(state, boss.x, boss.y, 0x44cc44, 8);
        }
      } else {
        // Vine slam — damage in large radius
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 3.0;
          if (d < 100) { if (hitPlayer(state, 2)) playerHit = true; }
          spawnShockwave(state, boss.x, boss.y, 100, 0x44aa22);
          state.screenShake = SS.SHAKE_INTENSITY * 2;
        }
        boss.x += Math.cos(a) * boss.speed * 0.5 * dt;
        boss.y += Math.sin(a) * boss.speed * 0.5 * dt;
      }
      break;
    }
    case "chimera": {
      if (boss.phase === 0) {
        // Lion phase — fast charge
        boss.x += Math.cos(a) * boss.speed * 2 * dt;
        boss.y += Math.sin(a) * boss.speed * 2 * dt;
        if (d < boss.radius + state.playerRadius + 8) {
          if (hitPlayer(state, 2)) playerHit = true;
        }
      } else if (boss.phase === 1) {
        // Goat phase — fire projectiles in fan
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 2.0;
          for (let i = 0; i < 5; i++) {
            const fa = a - 0.4 + (i * 0.8 / 4);
            state.projectiles.push({
              x: boss.x, y: boss.y,
              vx: Math.cos(fa) * 160, vy: Math.sin(fa) * 160,
              damage: 1, radius: 4, life: 3.0,
              color: 0xff8822, fromEnemy: true, kind: "arrow",
            });
          }
        }
        if (d > 100) {
          boss.x += Math.cos(a) * boss.speed * 0.5 * dt;
          boss.y += Math.sin(a) * boss.speed * 0.5 * dt;
        }
      } else {
        // Snake phase — teleport and strike
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 2.5;
          const ta = Math.random() * Math.PI * 2;
          boss.x = px + Math.cos(ta) * 50;
          boss.y = py + Math.sin(ta) * 50;
          boss.x = clamp(boss.x, bm, state.arenaW - bm);
          boss.y = clamp(boss.y, bm, state.arenaH - bm);
          spawnParticles(state, boss.x, boss.y, 0x884488, 8);
          const sd = dist(boss.x, boss.y, px, py);
          if (sd < boss.radius + state.playerRadius + 20) {
            if (hitPlayer(state, 2)) playerHit = true;
          }
          state.screenShake = SS.SHAKE_INTENSITY;
        }
      }
      break;
    }
  }

  return playerHit;
}

export function checkBossHits(state: SSState): void {
  const boss = state.boss;
  if (!boss || !boss.alive) return;

  // Slash hits
  for (const s of state.slashes) {
    if (s.hitIds.includes("boss")) continue;
    const d = dist(s.x, s.y, boss.x, boss.y);
    if (d < s.radius + boss.radius) {
      boss.hp -= s.damage;
      boss.flashTimer = 0.1;
      s.hitIds.push("boss");
      spawnParticles(state, boss.x, boss.y, 0xff4444, 4);
      spawnFloatText(state, boss.x, boss.y - 15, String(Math.ceil(s.damage)), 0xffffff, 0.8);
    }
  }

  // Projectile hits (player projectiles only)
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (p.fromEnemy) continue;
    const d = dist(p.x, p.y, boss.x, boss.y);
    if (d < p.radius + boss.radius) {
      boss.hp -= p.damage;
      boss.flashTimer = 0.1;
      spawnParticles(state, p.x, p.y, 0xff4444, 3);
      spawnFloatText(state, boss.x, boss.y - 15, String(Math.ceil(p.damage)), 0xffffff, 0.7);
      state.projectiles.splice(i, 1);
    }
  }

  // Boss death
  if (boss.hp <= 0) {
    boss.alive = false;
    state.bossWave = false;
    state.score += 200;
    spawnFloatText(state, boss.x, boss.y, "BOSS DEFEATED!", SS.COLOR_GOLD, 2.0);
    spawnShockwave(state, boss.x, boss.y, 120, SS.COLOR_GOLD);
    spawnParticles(state, boss.x, boss.y, SS.COLOR_GOLD, 20);
    spawnParticles(state, boss.x, boss.y, SS.COLOR_DANGER, 15);
    state.screenShake = SS.SHAKE_INTENSITY * 3;
    state.screenFlashColor = SS.COLOR_GOLD;
    state.screenFlashTimer = SS.FLASH_DURATION * 3;
    state.hitstopFrames = 6;
    // Drop health pickup
    state.pickups.push({ x: boss.x, y: boss.y, kind: "health", life: 15, radius: 8 });
    state.boss = null;
  }
}

// ---------------------------------------------------------------------------
// Death effect
// ---------------------------------------------------------------------------

export function spawnDeathEffect(state: SSState, x: number, y: number, color: number): void {
  spawnParticles(state, x, y, color, 10);
  spawnShockwave(state, x, y, 30, color);
}

// ---------------------------------------------------------------------------
// Enemy color
// ---------------------------------------------------------------------------

export function getEnemyColor(kind: SSEnemyKind): number {
  switch (kind) {
    case "goblin":      return 0x44aa22;
    case "orc_archer":  return 0x885500;
    case "troll":       return 0x336633;
    case "shadow_wolf": return 0x6622aa;
    case "dark_druid":  return 0x223388;
  }
}

// ---------------------------------------------------------------------------
// Arena Hazards
// ---------------------------------------------------------------------------

export function updateHazards(state: SSState, dt: number): boolean {
  let playerHit = false;

  for (let i = state.arenaHazards.length - 1; i >= 0; i--) {
    const h = state.arenaHazards[i];
    h.life -= dt;
    if (h.life <= 0) { state.arenaHazards.splice(i, 1); continue; }

    h.activeTimer -= dt;
    if (h.activeTimer <= 0) {
      h.active = !h.active;
      h.activeTimer = h.kind === "bramble" ? 2.0 : h.kind === "swamp" ? 3.0 : 2.5;
    }

    if (!h.active) continue;

    switch (h.kind) {
      case "bramble": {
        // Damages player and enemies that enter
        const pd = dist(h.x, h.y, state.playerX, state.playerY);
        if (pd < h.radius + state.playerRadius && state.invulnTimer <= 0) {
          if (hitPlayer(state, 1)) playerHit = true;
        }
        for (const e of state.enemies) {
          if (!e.alive || e.spawnTimer > 0) continue;
          if (dist(h.x, h.y, e.x, e.y) < h.radius + e.radius) {
            damageEnemy(state, e, 0.3 * dt);
          }
        }
        break;
      }
      case "swamp": {
        // Slows player and enemies inside
        const pd = dist(h.x, h.y, state.playerX, state.playerY);
        if (pd < h.radius) {
          // Player slow handled in updatePlayer via state check
        }
        for (const e of state.enemies) {
          if (!e.alive) continue;
          if (dist(h.x, h.y, e.x, e.y) < h.radius + e.radius) {
            e.speed = e.baseSpeed * 0.5;
          }
        }
        break;
      }
      case "spirit_well": {
        // Heals player inside, damages enemies
        const pd = dist(h.x, h.y, state.playerX, state.playerY);
        if (pd < h.radius) {
          state.playerHP = Math.min(state.maxHP, state.playerHP + 0.5 * dt);
        }
        for (const e of state.enemies) {
          if (!e.alive) continue;
          if (dist(h.x, h.y, e.x, e.y) < h.radius + e.radius) {
            damageEnemy(state, e, 0.5 * dt);
          }
        }
        break;
      }
    }
  }

  return playerHit;
}

// ---------------------------------------------------------------------------
// Normalize angle helper
// ---------------------------------------------------------------------------

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
