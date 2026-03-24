// ---------------------------------------------------------------------------
// Prince of Camelot — Game Logic System
// ---------------------------------------------------------------------------

import type { CamelotState, Enemy, Crate, MovingPlatform } from "../types";
import { TileType as T, CamelotPhase } from "../types";
import { TILE, GRAVITY, MAX_FALL, PLAYER_SPEED, JUMP_FORCE, WALL_SLIDE_SPEED, ROLL_SPEED, ROLL_DURATION, INVULN_TIME, DASH_SPEED, DASH_DURATION, DASH_COST, ROLL_COST, ATTACK_COST, STAMINA_MAX, STAMINA_REGEN, PARRY_WINDOW, COMBO_WINDOW, HIT_FREEZE, PAL, XP_VALUES, COIN_COUNTS, WALL_JUMP_FORCE, WALL_JUMP_HORIZONTAL, WALL_JUMP_COOLDOWN, MAGE_CAST_COOLDOWN, MAGE_BLINK_COOLDOWN, MAGE_SHIELD_HP, MAGE_SPELL_SPEED, EXECUTION_ZOOM, EXECUTION_SLOWMO, EXECUTION_DURATION, COMBO_FINISHER_FREEZE, COMBO_FINISHER_PARTICLES, WATER_SLOW, LAVA_DAMAGE_INTERVAL, AIR_DASH_SPEED, AIR_DASH_DURATION, AIR_DASH_COST, CHARGE_TIME, CHARGE_DAMAGE_MULT, CHARGE_RANGE_MULT, CHARGE_KNOCKBACK, BLOOD_MOON_INTERVAL, BLOOD_MOON_DURATION, BLOOD_MOON_DAMAGE_MULT, BLOOD_MOON_SPEED_MULT, ENV_KILL_XP } from "../config/CamelotConfig";
import { playSound } from "./CamelotAudio";
import { createEnemy } from "../state/CamelotState";

// ===== Input Helpers =====

export function isLeft(s: CamelotState): boolean {
  return !!(s.keys["ArrowLeft"] || s.keys["KeyA"] || (s.gpAxes[0] < -0.3));
}

export function isRight(s: CamelotState): boolean {
  return !!(s.keys["ArrowRight"] || s.keys["KeyD"] || (s.gpAxes[0] > 0.3));
}

export function isJump(s: CamelotState): boolean {
  return !!(s.justPressed["ArrowUp"] || s.justPressed["KeyW"] || s.justPressed["Space"] || s.gpJustPressed[0]);
}

export function isDown(s: CamelotState): boolean {
  return !!(s.keys["ArrowDown"] || s.keys["KeyS"] || (s.gpAxes[1] > 0.3));
}

export function isAttack(s: CamelotState): boolean {
  return !!(s.justPressed["KeyJ"] || s.justPressed["KeyZ"] || s.gpJustPressed[2]);
}

export function isRoll(s: CamelotState): boolean {
  return !!(s.justPressed["KeyK"] || s.justPressed["KeyX"] || s.gpJustPressed[1]);
}

export function isParry(s: CamelotState): boolean {
  return !!(s.justPressed["KeyL"] || s.justPressed["KeyC"] || s.gpJustPressed[3]);
}

export function isDash(s: CamelotState): boolean {
  return !!(s.justPressed["ShiftLeft"] || s.justPressed["ShiftRight"] || s.gpJustPressed[5]);
}

export function isInteract(s: CamelotState): boolean {
  return !!(s.justPressed["KeyE"] || s.justPressed["Enter"] || s.gpJustPressed[4]);
}

// ===== Collision Helpers =====

export function getTile(s: CamelotState, x: number, y: number): number {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || ty >= s.levelData.height || tx >= s.levelData.width) return T.STONE;
  return s.levelData.tiles[ty][tx];
}

export function isSolid(s: CamelotState, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || ty >= s.levelData.height || tx >= s.levelData.width) return true;
  const t = s.levelData.tiles[ty][tx];
  return t === T.STONE || t === T.BRICK || t === T.WOOD_FLOOR || t === T.MOSS_STONE || t === T.GATE;
}

export function isPlatform(s: CamelotState, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || ty >= s.levelData.height || tx >= s.levelData.width) return false;
  const t = s.levelData.tiles[ty][tx];
  return t === T.PLATFORM || t === T.CRUMBLE;
}

export function isLadder(s: CamelotState, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || ty >= s.levelData.height || tx >= s.levelData.width) return false;
  return s.levelData.tiles[ty][tx] === T.LADDER;
}

export function entityCollision(s: CamelotState, e: { x: number; y: number; w: number; h: number }, dx: number, dy: number): boolean {
  const nx = e.x + dx;
  const ny = e.y + dy;
  // Check four corners
  const left = nx - e.w / 2;
  const right = nx + e.w / 2 - 1;
  const top = ny - e.h;
  const bottom = ny - 1;
  const txL = Math.floor(left / TILE);
  const txR = Math.floor(right / TILE);
  const tyT = Math.floor(top / TILE);
  const tyB = Math.floor(bottom / TILE);
  for (let ty = tyT; ty <= tyB; ty++) {
    for (let tx = txL; tx <= txR; tx++) {
      if (isSolid(s, tx, ty)) return true;
    }
  }
  // Check crate collision
  for (const c of s.crates) {
    if (c.hp <= 0) continue;
    if (nx - e.w / 2 < c.x + c.w && nx + e.w / 2 > c.x &&
        ny - e.h < c.y + c.h && ny > c.y) return true;
  }
  return false;
}

export function checkPlatform(s: CamelotState, e: { x: number; y: number; w: number; h: number; vy: number }, dy: number): boolean {
  if (dy < 0) return false;
  // If holding down, pass through platforms
  if (s.keys["ArrowDown"] || s.keys["KeyS"] || (s.gpAxes[1] > 0.3)) return false;
  const ny = e.y + dy;
  const left = Math.floor((e.x - e.w / 2) / TILE);
  const right = Math.floor((e.x + e.w / 2 - 1) / TILE);
  const tyOld = Math.floor((e.y - 1) / TILE);
  const tyNew = Math.floor((ny - 1) / TILE);
  if (tyNew > tyOld) {
    for (let tx = left; tx <= right; tx++) {
      if (isPlatform(s, tx, tyNew)) return true;
    }
  }
  return false;
}

export function checkPlatformEnemy(s: CamelotState, e: { x: number; y: number; w: number; h: number; vy: number }, dy: number): boolean {
  if (dy < 0) return false;
  const ny = e.y + dy;
  const left = Math.floor((e.x - e.w / 2) / TILE);
  const right = Math.floor((e.x + e.w / 2 - 1) / TILE);
  const tyOld = Math.floor((e.y - 1) / TILE);
  const tyNew = Math.floor((ny - 1) / TILE);
  if (tyNew > tyOld) {
    for (let tx = left; tx <= right; tx++) {
      if (isPlatform(s, tx, tyNew)) return true;
    }
  }
  return false;
}

export function checkMovingPlatform(s: CamelotState, e: { x: number; y: number; w: number; h: number; vy: number; vx?: number }): MovingPlatform | null {
  for (const mp of s.movingPlatforms) {
    if (e.x - e.w / 2 < mp.x + mp.w && e.x + e.w / 2 > mp.x &&
        e.y >= mp.y && e.y <= mp.y + mp.h + 4 && e.vy >= 0) {
      return mp;
    }
  }
  return null;
}

export function hasLineOfSight(s: CamelotState, x1: number, y1: number, x2: number, y2: number): boolean {
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const steps = Math.ceil(dist / (TILE / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;
    const tx = Math.floor(cx / TILE);
    const ty = Math.floor(cy / TILE);
    if (isSolid(s, tx, ty)) return false;
  }
  return true;
}

// ===== Particle Spawners =====

export function spawnParticle(s: CamelotState, x: number, y: number, vx: number, vy: number, color: string, life: number, size: number = 3): void {
  s.particles.push({ x, y, vx, vy, color, life, maxLife: life, size });
}

export function spawnBlood(s: CamelotState, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const colors = PAL.blood;
    spawnParticle(s, x, y,
      (Math.random() - 0.5) * 6,
      -Math.random() * 5 - 1,
      colors[Math.floor(Math.random() * colors.length)],
      20 + Math.random() * 15,
      2 + Math.random() * 3);
  }
}

export function spawnSparks(s: CamelotState, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    spawnParticle(s, x, y,
      (Math.random() - 0.5) * 8,
      -Math.random() * 6 - 2,
      Math.random() > 0.5 ? "#fff" : "#ff0",
      10 + Math.random() * 10,
      2 + Math.random() * 2);
  }
}

export function spawnDust(s: CamelotState, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    spawnParticle(s, x, y,
      (Math.random() - 0.5) * 3,
      -Math.random() * 2 - 0.5,
      PAL.stone[Math.floor(Math.random() * PAL.stone.length)],
      15 + Math.random() * 10,
      2 + Math.random() * 3);
  }
}

export function spawnCoinBurst(s: CamelotState, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    spawnParticle(s, x, y,
      (Math.random() - 0.5) * 5,
      -Math.random() * 4 - 2,
      PAL.gold[Math.floor(Math.random() * PAL.gold.length)],
      20 + Math.random() * 10,
      3 + Math.random() * 2);
  }
}

export function spawnParryFlash(s: CamelotState, x: number, y: number): void {
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    spawnParticle(s, x, y,
      Math.cos(angle) * 4,
      Math.sin(angle) * 4,
      "#fff",
      10 + Math.random() * 5,
      3 + Math.random() * 2);
  }
}

export function spawnShieldBreak(s: CamelotState, x: number, y: number): void {
  for (let i = 0; i < 15; i++) {
    spawnParticle(s, x, y,
      (Math.random() - 0.5) * 8,
      -Math.random() * 6 - 2,
      Math.random() > 0.5 ? "#4080c0" : "#80c0ff",
      20 + Math.random() * 15,
      3 + Math.random() * 3);
  }
}

export function spawnCoin(s: CamelotState, x: number, y: number): void {
  s.pickups.push({
    type: "coin",
    x: x + (Math.random() - 0.5) * 20,
    y: y - 10,
    vy: -Math.random() * 4 - 2,
    vx: (Math.random() - 0.5) * 3,
    life: 300,
  });
}

export function spawnFloatingText(s: CamelotState, x: number, y: number, text: string, color: string = "#fff"): void {
  s.floatingTexts.push({
    x, y, text, color,
    life: 45, maxLife: 45, vy: -1.5,
  });
}

export function spawnAmbientDust(s: CamelotState, canvasW: number, canvasH: number): void {
  if (Math.random() < 0.02) {
    spawnParticle(s,
      s.camera.x + Math.random() * canvasW,
      s.camera.y + Math.random() * canvasH,
      (Math.random() - 0.5) * 0.3,
      -Math.random() * 0.2 - 0.1,
      "rgba(255,255,255,0.15)",
      60 + Math.random() * 60,
      1 + Math.random() * 2);
  }
}

// ===== XP System =====

export function xpForLevel(lvl: number): number {
  return 50 + (lvl - 1) * 30;
}

export function grantXP(s: CamelotState, amount: number): void {
  s.playerXP += amount;
  while (s.playerXP >= xpForLevel(s.playerLevel)) {
    s.playerXP -= xpForLevel(s.playerLevel);
    s.playerLevel++;
    // Level up bonuses
    s.player.maxHp++;
    s.player.hp = s.player.maxHp;
    s.persistentState.maxHpBonus++;
    spawnFloatingText(s, s.player.x, s.player.y - s.player.h, "LEVEL UP!", "#ff0");
    playSound("powerup");
  }
}

// ===== Damage =====

export function hurtPlayer(s: CamelotState, dmg: number): void {
  const p = s.player;
  if (p.dead || p.invuln > 0 || p.rolling > 0) return;

  // Parry check
  if (p.parrying > 0) {
    p.parrySuccess = true;
    playSound("parry");
    s.hitFreeze = HIT_FREEZE + 2;
    s.shake = 6;
    return;
  }

  // Shield absorb
  if (p.hasShield && p.shieldHP > 0) {
    p.shieldHP--;
    if (p.shieldHP <= 0) {
      p.hasShield = false;
      spawnShieldBreak(s, p.x, p.y - p.h / 2);
      playSound("hit");
    } else {
      spawnSparks(s, p.x, p.y - p.h / 2, 5);
      playSound("parry");
    }
    p.invuln = INVULN_TIME / 2;
    return;
  }

  p.hp -= dmg;
  p.invuln = INVULN_TIME;
  s.shake = 8;
  s.hitFreeze = HIT_FREEZE;
  s.vignetteTimer = 15;
  s.vignetteColor = "red";
  spawnBlood(s, p.x, p.y - p.h / 2, 10);
  playSound("hit");

  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    p.anim = "dead";
    spawnBlood(s, p.x, p.y - p.h / 2, 20);
    playSound("die");

    // Respawn logic
    if (s.lives > 0 && s.checkpointActive) {
      s.lives--;
      const cp = s.checkpointActive;
      setTimeout(() => {
        p.dead = false;
        p.hp = p.maxHp;
        p.x = cp.x;
        p.y = cp.y;
        p.vx = 0;
        p.vy = 0;
        p.invuln = INVULN_TIME * 2;
        p.anim = "idle";
        s.particles = [];
      }, 600);
    } else {
      s.phase = CamelotPhase.DEAD;
    }
  }
}

export function hurtEnemy(s: CamelotState, e: Enemy, dmg: number, dir: number): void {
  if (e.dead || e.invuln > 0) return;

  // Shielder block check
  if (e.type === "shielder" && e.blocking && Math.sign(e.facing) !== Math.sign(dir)) {
    spawnSparks(s, e.x + dir * 15, e.y - e.h / 2, 8);
    playSound("parry");
    s.hitFreeze = HIT_FREEZE;
    return;
  }

  // Mage magic shield absorb
  if (e.type === "mage" && e.shieldActive && e.mageShieldHP! > 0) {
    e.mageShieldHP!--;
    spawnSparks(s, e.x, e.y - e.h / 2, 10);
    playSound("parry");
    s.hitFreeze = HIT_FREEZE;
    if (e.mageShieldHP! <= 0) {
      e.shieldActive = false;
      spawnFloatingText(s, e.x, e.y - e.h, "SHIELD BROKEN!", "#f44");
      for (let i = 0; i < 12; i++) {
        spawnParticle(s, e.x + (Math.random() - 0.5) * 30, e.y - e.h / 2 + (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, "#8040ff", 15, 3);
      }
    }
    return;
  }

  e.hp -= dmg;
  e.invuln = 12;
  e.vx = dir * 4;
  e.stunTimer = 20;
  s.hitFreeze = HIT_FREEZE;
  s.shake = 4;
  spawnBlood(s, e.x, e.y - e.h / 2, 8);
  playSound("hit");

  // Environmental kill check — knocked into spikes/lava
  const envTx = Math.floor((e.x + dir * e.w) / TILE);
  const envTy = Math.floor(e.y / TILE);
  if (envTx >= 0 && envTy >= 0 && envTy < s.levelData.height && envTx < s.levelData.width) {
    const envTile = s.levelData.tiles[envTy][envTx];
    if (envTile === T.SPIKE_UP || envTile === T.SPIKE_DOWN || envTile === T.LAVA) {
      e.hp = 0; // instant death from environment
      spawnFloatingText(s, e.x, e.y - e.h, "ENVIRONMENTAL!", "#ff4");
      grantXP(s, ENV_KILL_XP);
      s.shake = 8;
    }
  }

  if (e.hp <= 0) {
    e.dead = true;
    e.deathTimer = 30;
    e.vx = dir * 6;
    e.vy = -4;
    s.totalKills++;

    // XP & coins
    grantXP(s, XP_VALUES[e.type] || 10);
    const coinCount = COIN_COUNTS[e.type] || 2;
    for (let i = 0; i < coinCount; i++) {
      spawnCoin(s, e.x, e.y - e.h / 2);
    }

    // Kill streak
    s.player.killStreak++;
    s.player.killStreakTimer = 120;
    if (s.player.killStreak >= 3) {
      spawnFloatingText(s, s.player.x, s.player.y - s.player.h - 10,
        s.player.killStreak + "x STREAK!", "#f80");
    }

    // Boss death
    if (e.type === "boss") {
      s.shake = 20;
      s.timeScale = 0.3;
      s.vignetteTimer = 60;
      s.vignetteColor = "#602060";
      playSound("boss_roar");

      // Cascading death effects
      setTimeout(() => {
        s.timeScale = 1.0;
        spawnBlood(s, e.x, e.y - e.h / 2, 30);
        s.shake = 15;
      }, 500);
      setTimeout(() => {
        spawnBlood(s, e.x, e.y - e.h / 2, 20);
        s.shake = 10;
      }, 1000);
      setTimeout(() => {
        // Boss is fully dead — save and show win
        saveHighScore(s);
        s.phase = CamelotPhase.WIN;
      }, 1500);
    }
  }
}

export function hitCrate(s: CamelotState, c: Crate, dmg: number, dir: number): void {
  c.hp -= dmg;
  c.shakeTimer = 8;
  spawnDust(s, c.x + c.w / 2, c.y + c.h / 2, 5);
  playSound("hit");
  if (c.hp <= 0) {
    // Crate destroyed — spawn random pickup
    const rng = Math.random();
    if (rng < 0.4) {
      s.pickups.push({ type: "health", x: c.x + c.w / 2, y: c.y });
    } else if (rng < 0.7) {
      spawnCoin(s, c.x + c.w / 2, c.y);
      spawnCoin(s, c.x + c.w / 2, c.y);
    }
    // Crate explosion particles
    for (let i = 0; i < 10; i++) {
      spawnParticle(s, c.x + c.w / 2, c.y + c.h / 2,
        (Math.random() - 0.5) * 6 + dir * 2,
        -Math.random() * 5 - 1,
        PAL.wood[Math.floor(Math.random() * PAL.wood.length)],
        20 + Math.random() * 15,
        3 + Math.random() * 4);
    }
  }
}

// ===== Exit Check =====

export function checkExit(s: CamelotState): boolean {
  const p = s.player;
  const tx = Math.floor(p.x / TILE);
  const ty = Math.floor((p.y - 1) / TILE);
  if (tx >= 0 && ty >= 0 && ty < s.levelData.height && tx < s.levelData.width) {
    return s.levelData.tiles[ty][tx] === T.EXIT;
  }
  return false;
}

// ===== Update Player =====

export function updatePlayer(s: CamelotState): void {
  const p = s.player;
  if (p.dead) return;

  // Timer decrements
  if (p.invuln > 0) p.invuln--;
  if (p.attackCooldown > 0) p.attackCooldown--;
  if (p.coyoteTime > 0) p.coyoteTime--;
  if (p.jumpBuffer > 0) p.jumpBuffer--;
  if (p.parrying > 0) p.parrying--;
  if (p.comboTimer > 0) p.comboTimer--; else p.comboStep = 0;
  if (p.attackBuffer > 0) p.attackBuffer--;
  if (p.wallJumpCooldown > 0) p.wallJumpCooldown--;
  if (p.comboFinisherTimer > 0) p.comboFinisherTimer--;
  if (p.airDashing > 0) p.airDashing--;
  // Execution zoom recovery
  if (p.executionZoom > 0) {
    p.executionZoom--;
    if (p.executionZoom <= 0) { s.timeScale = 1.0; s.cameraZoom = 1.0; }
  }
  // Charged attack — hold attack to charge, release to unleash
  if (s.keys["KeyJ"] || s.keys["KeyZ"] || s.gpButtons[2]) {
    if (!p.charging && p.attacking <= 0 && p.stamina >= ATTACK_COST * 2) {
      p.charging = true;
      p.chargeTimer = 0;
    }
    if (p.charging) p.chargeTimer++;
  } else if (p.charging && p.chargeTimer >= CHARGE_TIME) {
    // Release fully charged attack!
    p.charging = false;
    p.attacking = 16;
    p.attackCooldown = 25;
    p.stamina -= ATTACK_COST * 2;
    p.comboStep = 2; // treat as finisher
    p.comboTimer = COMBO_WINDOW;
    const atkRange = (38 + p.swordLevel * 4) * CHARGE_RANGE_MULT;
    const dmg = Math.ceil((1 + p.swordLevel) * CHARGE_DAMAGE_MULT);
    // Hit all enemies in range
    for (const e of s.enemies) {
      if (e.dead || e.invuln > 0) continue;
      const edx = Math.abs(p.x + p.facing * atkRange / 2 - e.x);
      const edy = Math.abs((p.y - p.h / 2) - (e.y - e.h / 2));
      if (edx < atkRange / 2 + e.w / 2 && edy < e.h) {
        hurtEnemy(s, e, dmg, p.facing);
        e.vx = p.facing * CHARGE_KNOCKBACK;
      }
    }
    s.shake = 10;
    s.hitFreeze = 8;
    s.vignetteTimer = 12;
    s.vignetteColor = "white";
    playSound("slash3");
    playSound("boss_slam");
    // Shockwave particles
    for (let i = 0; i < 20; i++) {
      spawnParticle(s, p.x + p.facing * 15, p.y - p.h / 2,
        p.facing * (2 + Math.random() * 6), (Math.random() - 0.5) * 4,
        PAL.gold[Math.floor(Math.random() * 3)], 15 + Math.random() * 10, 3 + Math.random() * 3);
    }
    spawnFloatingText(s, p.x + p.facing * 20, p.y - p.h - 10, "HEAVY!", "#ff8");
  } else {
    p.charging = false;
    p.chargeTimer = 0;
  }
  if (p.rollBuffer > 0) p.rollBuffer--;
  if (p.dashBuffer > 0) p.dashBuffer--;
  if (p.parryBuffer > 0) p.parryBuffer--;
  if (p.landingLag > 0) p.landingLag--;
  p.animTimer++;

  // Variable jump height
  if (p.vy < -2 && !s.keys["ArrowUp"] && !s.keys["KeyW"] && !s.keys["Space"]) {
    p.vy *= 0.7;
  }

  // Squash/stretch lerp
  p.squashX += (1 - p.squashX) * 0.2;
  p.squashY += (1 - p.squashY) * 0.2;

  // Stamina regen
  if (p.attacking <= 0 && p.rolling <= 0 && p.dashing <= 0) {
    p.stamina = Math.min(STAMINA_MAX, p.stamina + STAMINA_REGEN);
  }

  // Trail for dash
  if (p.dashing > 0) {
    p.trail.push({ x: p.x, y: p.y, life: 8 });
  }
  p.trail = p.trail.filter(t => { t.life--; return t.life > 0; });

  // Kill streak timer
  if (p.killStreakTimer > 0) {
    p.killStreakTimer--;
    if (p.killStreakTimer <= 0) p.killStreak = 0;
  }

  // Ladder detection
  const onLadderTx = Math.floor(p.x / TILE);
  const onLadderTy = Math.floor((p.y - p.h / 2) / TILE);
  p.onLadder = isLadder(s, onLadderTx, onLadderTy);

  if (p.onLadder) {
    // Ladder movement
    p.vy = 0;
    p.grounded = true;
    if (s.keys["ArrowUp"] || s.keys["KeyW"]) p.vy = -3;
    if (s.keys["ArrowDown"] || s.keys["KeyS"]) p.vy = 3;
    if (isJump(s)) {
      p.onLadder = false;
      p.vy = JUMP_FORCE;
      p.grounded = false;
      playSound("jump");
    }
  }

  // Dashing state
  if (p.dashing > 0) {
    p.dashing--;
    p.vx = p.dashDir * DASH_SPEED;
    p.vy = 0;
    p.invuln = 2;
    // Move with collision
    if (!entityCollision(s, p, p.vx, 0)) {
      p.x += p.vx;
    }
    spawnDust(s, p.x, p.y, 1);
    p.anim = "dash";
    return;
  }

  // Rolling state
  if (p.rolling > 0) {
    p.rolling--;
    p.vx = p.rollDir * ROLL_SPEED;
    p.invuln = 2;
    // Move with collision
    if (!entityCollision(s, p, p.vx, 0)) {
      p.x += p.vx;
    }
    // Apply gravity during roll
    if (!p.onLadder) {
      p.vy = Math.min(p.vy + GRAVITY, MAX_FALL);
      if (!entityCollision(s, p, 0, p.vy) && !checkPlatform(s, p, p.vy)) {
        p.y += p.vy;
      } else {
        if (p.vy > 0) p.grounded = true;
        p.vy = 0;
      }
    }
    spawnDust(s, p.x, p.y, 1);
    p.anim = "roll";
    return;
  }

  // Attack state
  if (p.attacking > 0) {
    p.attacking--;

    // Hit detection on enemies at peak of swing (frame 3-6)
    if (p.attacking >= p.attackCooldown - 6 && p.attacking <= p.attackCooldown - 3) {
      // No — check on specific frames
    }
    if (p.attacking === 8 || p.attacking === 7) {
      const atkRange = 38 + p.swordLevel * 4;
      const atkX = p.x + p.facing * atkRange / 2;
      const atkY = p.y - p.h / 2;
      const dmg = 1 + p.swordLevel + (p.comboStep >= 2 ? 1 : 0);

      for (const e of s.enemies) {
        if (e.dead || e.invuln > 0) continue;
        const dx = Math.abs(atkX - e.x);
        const dy = Math.abs(atkY - (e.y - e.h / 2));
        if (dx < atkRange / 2 + e.w / 2 && dy < e.h) {
          hurtEnemy(s, e, dmg, p.facing);
        }
      }

      // Hit crates
      for (const c of s.crates) {
        if (c.hp <= 0) continue;
        const cx = c.x + c.w / 2;
        const cy = c.y + c.h / 2;
        const dx = Math.abs(atkX - cx);
        const dy = Math.abs(atkY - cy);
        if (dx < atkRange / 2 + c.w / 2 && dy < c.h) {
          hitCrate(s, c, dmg, p.facing);
        }
      }

      // Projectile deflection during attack
      for (const proj of s.projectiles) {
        if (proj.fromPlayer) continue;
        const dx = Math.abs(atkX - proj.x);
        const dy = Math.abs(atkY - proj.y);
        if (dx < atkRange / 2 + 8 && dy < 20) {
          proj.vx = -proj.vx * 1.5;
          proj.fromPlayer = true;
          proj.damage = 2;
          spawnSparks(s, proj.x, proj.y, 5);
          playSound("parry");
        }
      }
    }

    // Slow movement during attack
    p.vx *= 0.7;
    if (!entityCollision(s, p, p.vx, 0)) p.x += p.vx;
    // Gravity during attack
    if (!p.onLadder) {
      p.vy = Math.min(p.vy + GRAVITY, MAX_FALL);
      if (!entityCollision(s, p, 0, p.vy) && !checkPlatform(s, p, p.vy)) {
        p.y += p.vy;
      } else {
        if (p.vy > 0) p.grounded = true;
        p.vy = 0;
      }
    }
    p.anim = "attack" + p.comboStep;
    return;
  }

  // Plunge attack (down+attack while airborne)
  if (!p.grounded && !p.onLadder && isDown(s) && (isAttack(s) || p.attackBuffer > 0) && !p.plunging) {
    p.plunging = true;
    p.vy = 10;
    p.vx = 0;
    playSound("dash");
  }

  // Plunge landing
  if (p.plunging && p.grounded) {
    p.plunging = false;
    s.shake = 8;
    spawnDust(s, p.x, p.y, 12);
    playSound("boss_slam");
    // AoE damage
    const aoeDist = 60;
    for (const e of s.enemies) {
      if (e.dead) continue;
      const dx = Math.abs(p.x - e.x);
      const dy = Math.abs(p.y - e.y);
      if (dx < aoeDist && dy < aoeDist) {
        hurtEnemy(s, e, 2 + p.swordLevel, p.x < e.x ? 1 : -1);
      }
    }
    p.landingLag = 8;
    p.squashX = 1.3;
    p.squashY = 0.7;
  }

  // Movement
  let moveDir = 0;
  if (isLeft(s)) moveDir = -1;
  if (isRight(s)) moveDir = 1;

  if (moveDir !== 0) p.facing = moveDir;

  // Smooth acceleration
  const targetSpeed = moveDir * PLAYER_SPEED;
  if (p.grounded) {
    p.vx += (targetSpeed - p.vx) * 0.3;
  } else {
    p.vx += (targetSpeed - p.vx) * 0.15;
  }

  // Footstep sounds
  if (p.grounded && Math.abs(p.vx) > 1) {
    p.footstepTimer++;
    if (p.footstepTimer >= 12) {
      p.footstepTimer = 0;
      playSound("footstep");
    }
  } else {
    p.footstepTimer = 0;
  }

  // Input buffering
  if (isJump(s)) p.jumpBuffer = 8;
  if (isAttack(s)) p.attackBuffer = 8;
  if (isRoll(s)) p.rollBuffer = 8;
  if (isDash(s)) p.dashBuffer = 8;
  if (isParry(s)) p.parryBuffer = 8;

  // Ground check with coyote time
  const wasGrounded = p.grounded;
  p.grounded = false;

  // Check solid below
  const checkY = p.y + 1;
  const left = Math.floor((p.x - p.w / 2) / TILE);
  const right = Math.floor((p.x + p.w / 2 - 1) / TILE);
  const belowTy = Math.floor(checkY / TILE);
  for (let tx = left; tx <= right; tx++) {
    if (isSolid(s, tx, belowTy)) { p.grounded = true; break; }
  }

  // Check platform below (only if not holding down)
  if (!p.grounded && !(s.keys["ArrowDown"] || s.keys["KeyS"] || (s.gpAxes[1] > 0.3))) {
    const tyOld = Math.floor((p.y - 1) / TILE);
    const tyNew = Math.floor(checkY / TILE);
    if (tyNew > tyOld) {
      for (let tx = left; tx <= right; tx++) {
        if (isPlatform(s, tx, tyNew)) { p.grounded = true; break; }
      }
    }
  }

  // Moving platform check
  const mp = checkMovingPlatform(s, p);
  if (mp) {
    p.grounded = true;
    // Carry player with platform
    if (mp.vx !== undefined) p.x += mp.vx;
    if (mp.vy2 !== undefined) p.y += mp.vy2;
  }

  // Coyote time
  if (wasGrounded && !p.grounded) {
    p.coyoteTime = 6;
  }
  if (p.grounded) {
    p.coyoteTime = 0;
    p.jumpsLeft = p.hasDoubleJump ? 2 : 1;
  }

  // Landing squash
  if (p.grounded && !wasGrounded && p.vy >= 0) {
    p.squashX = 1.3;
    p.squashY = 0.7;
    spawnDust(s, p.x, p.y, 4);
  }

  // Wall slide
  p.wallSliding = false;
  if (!p.grounded && p.vy > 0 && moveDir !== 0) {
    // Check wall in movement direction
    const wallCheckX = p.x + moveDir * (p.w / 2 + 2);
    const wallTx = Math.floor(wallCheckX / TILE);
    const wallTy = Math.floor((p.y - p.h / 2) / TILE);
    if (isSolid(s, wallTx, wallTy)) {
      p.wallSliding = true;
      p.vy = Math.min(p.vy, WALL_SLIDE_SPEED);
      if (p.animTimer % 8 === 0) spawnDust(s, p.x + moveDir * p.w / 2, p.y - p.h / 2, 1);
    }
  }

  // Jump (ground, wall, double)
  if (p.jumpBuffer > 0 && !p.plunging) {
    if (p.grounded || p.coyoteTime > 0) {
      // Ground jump
      p.vy = JUMP_FORCE;
      p.grounded = false;
      p.coyoteTime = 0;
      p.jumpBuffer = 0;
      p.jumpsLeft--;
      p.squashX = 0.75;
      p.squashY = 1.25;
      spawnDust(s, p.x, p.y, 4);
      playSound("jump");
    } else if (p.wallSliding && p.wallJumpCooldown <= 0) {
      // Wall jump — stronger, with cooldown to prevent spamming
      p.vy = WALL_JUMP_FORCE;
      p.vx = -moveDir * WALL_JUMP_HORIZONTAL;
      p.facing = -moveDir;
      p.wallSliding = false;
      p.jumpBuffer = 0;
      p.wallJumpCooldown = WALL_JUMP_COOLDOWN;
      p.squashX = 0.7;
      p.squashY = 1.3;
      spawnDust(s, p.x + moveDir * p.w / 2, p.y, 6);
      // Wall kick particles
      for (let i = 0; i < 4; i++) {
        spawnParticle(s, p.x + moveDir * p.w / 2, p.y - p.h / 3,
          moveDir * (1 + Math.random() * 2), -Math.random() * 2,
          "#8a8070", 12 + Math.random() * 8, 2 + Math.random() * 2);
      }
      playSound("jump");
    } else if (p.jumpsLeft > 0 && p.hasDoubleJump) {
      // Double jump
      p.vy = JUMP_FORCE * 0.85;
      p.jumpsLeft--;
      p.jumpBuffer = 0;
      p.squashX = 0.8;
      p.squashY = 1.2;
      spawnDust(s, p.x, p.y, 6);
      playSound("jump");
    }
  }

  // Attack combo
  if ((p.attackBuffer > 0 || isAttack(s)) && p.attackCooldown <= 0 && p.stamina >= ATTACK_COST && p.landingLag <= 0) {
    p.attacking = 12;
    p.attackCooldown = 18;
    p.attackBuffer = 0;
    p.stamina -= ATTACK_COST;
    if (p.comboTimer > 0) {
      p.comboStep = Math.min(p.comboStep + 1, 2);
    } else {
      p.comboStep = 0;
    }
    p.comboTimer = COMBO_WINDOW;
    playSound("slash" + (p.comboStep + 1));
    // Combo finisher (3rd hit) — screen flash + particle burst
    if (p.comboStep === 2) {
      s.hitFreeze = COMBO_FINISHER_FREEZE;
      s.vignetteTimer = 10;
      s.vignetteColor = "white";
      p.comboFinisherTimer = 15;
      for (let i = 0; i < COMBO_FINISHER_PARTICLES; i++) {
        const angle = (i / COMBO_FINISHER_PARTICLES) * Math.PI * 2;
        spawnParticle(s, p.x + p.facing * 20, p.y - p.h / 2,
          Math.cos(angle) * 4 + p.facing * 2, Math.sin(angle) * 4,
          PAL.gold[Math.floor(Math.random() * PAL.gold.length)],
          15 + Math.random() * 10, 3 + Math.random() * 2);
      }
    }
  }

  // Parry
  if ((p.parryBuffer > 0 || isParry(s)) && p.parrying <= 0 && p.stamina >= ATTACK_COST) {
    p.parrying = PARRY_WINDOW;
    p.parrySuccess = false;
    p.parryBuffer = 0;
    p.stamina -= ATTACK_COST;
  }

  // Roll
  if ((p.rollBuffer > 0 || isRoll(s)) && p.grounded && p.rolling <= 0 && p.stamina >= ROLL_COST) {
    p.rolling = ROLL_DURATION;
    p.rollDir = p.facing;
    p.rollBuffer = 0;
    p.stamina -= ROLL_COST;
    p.squashX = 1.4;
    p.squashY = 0.6;
    playSound("dash");
  }

  // Dash
  if ((p.dashBuffer > 0 || isDash(s)) && p.dashing <= 0 && p.stamina >= DASH_COST) {
    p.dashing = DASH_DURATION;
    p.dashDir = p.facing;
    p.dashBuffer = 0;
    p.stamina -= DASH_COST;
    playSound("dash");
  }

  // Air dash (mid-air horizontal dash, one per airborne)
  if (!p.grounded && !p.airDashUsed && p.airDashing <= 0 && isDash(s) && p.stamina >= AIR_DASH_COST) {
    p.airDashing = AIR_DASH_DURATION;
    p.airDashDir = p.facing;
    p.airDashUsed = true;
    p.stamina -= AIR_DASH_COST;
    p.vy = 0; // cancel vertical momentum
    p.invuln = AIR_DASH_DURATION; // brief iframes
    playSound("dash");
    spawnFloatingText(s, p.x, p.y - p.h, "AIR DASH!", "#80f");
    // After-image trail
    for (let i = 0; i < 4; i++) {
      p.trail.push({ x: p.x - p.facing * i * 8, y: p.y, life: 10 });
    }
  }
  // Air dash movement
  if (p.airDashing > 0) {
    p.vx = p.airDashDir * AIR_DASH_SPEED;
    p.vy = 0; // maintain altitude during air dash
  }
  // Reset air dash on landing
  if (p.grounded) p.airDashUsed = false;

  // Gravity
  if (!p.onLadder) {
    p.vy = Math.min(p.vy + GRAVITY, MAX_FALL);
  }

  // X movement with collision
  if (!entityCollision(s, p, p.vx, 0)) {
    p.x += p.vx;
  } else {
    // Slide along wall
    p.vx = 0;
  }

  // Y movement with collision
  if (!entityCollision(s, p, 0, p.vy) && !checkPlatform(s, p, p.vy)) {
    p.y += p.vy;
  } else {
    if (p.vy > 0) p.grounded = true;
    p.vy = 0;
  }

  // Spike damage
  const spikeTx = Math.floor(p.x / TILE);
  const spikeTy = Math.floor((p.y - 1) / TILE);
  if (spikeTx >= 0 && spikeTy >= 0 && spikeTy < s.levelData.height && spikeTx < s.levelData.width) {
    const spikeTile = s.levelData.tiles[spikeTy][spikeTx];
    if (spikeTile === T.SPIKE_UP || spikeTile === T.SPIKE_DOWN) {
      hurtPlayer(s, 2);
      p.vy = -6;
    }
  }

  // Crumble tile detection
  if (p.grounded) {
    const crTx = Math.floor(p.x / TILE);
    const crTy = Math.floor(p.y / TILE);
    if (crTx >= 0 && crTy >= 0 && crTy < s.levelData.height && crTx < s.levelData.width) {
      if (s.levelData.tiles[crTy][crTx] === T.CRUMBLE) {
        const key = crTx + "," + crTy;
        if (!p.crumbleTouched.has(key)) {
          p.crumbleTouched.add(key);
          setTimeout(() => {
            if (s.levelData.tiles[crTy] && s.levelData.tiles[crTy][crTx] === T.CRUMBLE) {
              s.levelData.tiles[crTy][crTx] = T.EMPTY;
              spawnDust(s, crTx * TILE + TILE / 2, crTy * TILE + TILE / 2, 8);
              playSound("crumble");
            }
          }, 400);
        }
      }
    }
  }

  // Pickup collection
  for (let i = s.pickups.length - 1; i >= 0; i--) {
    const pk = s.pickups[i];
    const dx = Math.abs(p.x - pk.x);
    const dy = Math.abs((p.y - p.h / 2) - pk.y);
    if (dx < 24 && dy < 24) {
      switch (pk.type) {
        case "health":
          if (p.hp < p.maxHp) {
            p.hp = Math.min(p.hp + 2, p.maxHp);
            spawnFloatingText(s, p.x, p.y - p.h, "+2 HP", "#0f0");
            playSound("heal");
          } else continue; // Don't pick up if full
          break;
        case "sword":
          p.swordLevel = Math.min(p.swordLevel + 1, 3);
          s.persistentState.swordLevel = p.swordLevel;
          spawnFloatingText(s, p.x, p.y - p.h, "SWORD UP!", "#ff0");
          playSound("powerup");
          break;
        case "coin":
          s.totalCoins++;
          spawnCoinBurst(s, pk.x, pk.y);
          playSound("coin");
          break;
        case "doublejump":
          p.hasDoubleJump = true;
          s.persistentState.hasDoubleJump = true;
          spawnFloatingText(s, p.x, p.y - p.h, "DOUBLE JUMP!", "#0ff");
          playSound("powerup");
          break;
        case "shield":
          p.hasShield = true;
          p.shieldHP = 3;
          s.persistentState.hasShield = true;
          s.persistentState.shieldHP = 3;
          spawnFloatingText(s, p.x, p.y - p.h, "SHIELD!", "#48f");
          playSound("powerup");
          break;
      }
      s.pickups.splice(i, 1);
    }
  }

  // Execution of stunned enemies — cinematic slowmo zoom
  if (isInteract(s)) {
    for (const e of s.enemies) {
      if (e.dead || e.stunTimer <= 0) continue;
      const dx = Math.abs(p.x - e.x);
      const dy = Math.abs((p.y - p.h / 2) - (e.y - e.h / 2));
      if (dx < 40 && dy < 40) {
        hurtEnemy(s, e, e.hp, p.facing);
        spawnFloatingText(s, e.x, e.y - e.h, "EXECUTE!", "#ff4400");
        s.hitFreeze = HIT_FREEZE + 6;
        // Cinematic execution: slowmo + zoom
        s.timeScale = EXECUTION_SLOWMO;
        s.cameraZoom = EXECUTION_ZOOM;
        s.vignetteTimer = 30;
        s.vignetteColor = "white";
        p.executionZoom = EXECUTION_DURATION;
        // Extra XP for executions
        grantXP(s, 15);
        spawnFloatingText(s, e.x, e.y - e.h - 20, "+15 XP", "#e8c050");
        // Burst of sparks
        for (let i = 0; i < 15; i++) {
          spawnSparks(s, e.x, e.y - e.h / 2, 2);
        }
        break;
      }
    }
  }

  // Lever interaction
  if (isInteract(s)) {
    const leverTx = Math.floor(p.x / TILE);
    const leverTy = Math.floor((p.y - p.h / 2) / TILE);
    // Check a small area around the player
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ltx = leverTx + dx;
        const lty = leverTy + dy;
        if (ltx >= 0 && lty >= 0 && lty < s.levelData.height && ltx < s.levelData.width) {
          if (s.levelData.tiles[lty][ltx] === T.LEVER) {
            // Open all gates on this level
            for (let gy = 0; gy < s.levelData.height; gy++) {
              for (let gx = 0; gx < s.levelData.width; gx++) {
                if (s.levelData.tiles[gy][gx] === T.GATE) {
                  s.levelData.tiles[gy][gx] = T.EMPTY;
                }
              }
            }
            s.levelData.tiles[lty][ltx] = T.EMPTY;
            playSound("lever");
            s.shake = 6;
          }
        }
      }
    }
  }

  // Checkpoint activation
  const cpTx = Math.floor(p.x / TILE);
  const cpTy = Math.floor((p.y - 1) / TILE);
  if (cpTx >= 0 && cpTy >= 0 && cpTy < s.levelData.height && cpTx < s.levelData.width) {
    if (s.levelData.tiles[cpTy][cpTx] === T.CHECKPOINT) {
      const cpX = cpTx * TILE + TILE / 2;
      const cpY = cpTy * TILE;
      if (!s.checkpointActive || s.checkpointActive.x !== cpX || s.checkpointActive.y !== cpY) {
        s.checkpointActive = { x: cpX, y: cpY, levelIdx: s.currentLevel };
        p.checkpoint = { x: cpX, y: cpY };
        spawnFloatingText(s, cpX, cpY - 20, "CHECKPOINT", "#0f0");
        playSound("checkpoint");
      }
    }
  }

  // Water tile: slow movement + bubbles
  const waterTx = Math.floor(p.x / TILE);
  const waterTy = Math.floor(p.y / TILE);
  if (waterTx >= 0 && waterTy >= 0 && waterTy < s.levelData.height && waterTx < s.levelData.width) {
    const waterTile = s.levelData.tiles[waterTy][waterTx];
    if (waterTile === T.WATER_SURFACE) {
      p.vx *= WATER_SLOW;
      p.vy *= 0.8;
      if (Math.random() < 0.1) {
        spawnParticle(s, p.x + (Math.random() - 0.5) * p.w, p.y,
          0, -1 - Math.random(), "rgba(100,160,255,0.5)", 15 + Math.random() * 10, 2 + Math.random() * 2);
      }
    }
    if (waterTile === T.LAVA) {
      // Lava damages periodically
      if (s.gameTime % LAVA_DAMAGE_INTERVAL === 0) {
        hurtPlayer(s, 1);
        s.shake = 4;
      }
      p.vx *= 0.4;
      p.vy *= 0.6;
      if (Math.random() < 0.2) {
        spawnParticle(s, p.x + (Math.random() - 0.5) * p.w, p.y - 4,
          (Math.random() - 0.5) * 2, -Math.random() * 3 - 1,
          Math.random() > 0.5 ? "#ff4400" : "#ff8800", 12 + Math.random() * 8, 3 + Math.random() * 2);
      }
    }
  }

  // Fall death
  if (p.y > s.levelData.height * TILE + 100) {
    hurtPlayer(s, p.hp);
  }

  // Animation state
  if (p.grounded) {
    if (Math.abs(p.vx) > 0.5) {
      p.anim = "run";
      p.animFrame = Math.floor(p.animTimer / 6) % 4;
    } else {
      p.anim = "idle";
      p.animFrame = Math.floor(p.animTimer / 20) % 2;
    }
  } else if (p.wallSliding) {
    p.anim = "wallslide";
    p.animFrame = 0;
  } else if (p.plunging) {
    p.anim = "plunge";
    p.animFrame = 0;
  } else {
    p.anim = p.vy < 0 ? "jump" : "fall";
    p.animFrame = 0;
  }

  if (p.onLadder) p.anim = "ladder";
}

// ===== Update Enemy =====

export function updateEnemy(s: CamelotState, e: Enemy): boolean {
  if (e.dead) {
    e.deathTimer--;
    e.vy += GRAVITY;
    e.y += e.vy;
    e.x += e.vx;
    e.vx *= 0.9;
    return e.deathTimer > 0;
  }

  if (e.invuln > 0) e.invuln--;
  if (e.stunTimer > 0) {
    e.stunTimer--;
    e.vx *= 0.8;
    e.anim = "stun";
    // Gravity
    e.vy = Math.min(e.vy + GRAVITY, MAX_FALL);
    if (!entityCollision(s, e, 0, e.vy) && !checkPlatformEnemy(s, e, e.vy)) {
      e.y += e.vy;
    } else {
      if (e.vy > 0) e.grounded = true;
      e.vy = 0;
    }
    return true;
  }

  if (e.type === "boss") {
    updateBoss(s, e);
    return true;
  }

  if (e.type === "mage") {
    updateMage(s, e);
    return true;
  }

  e.animTimer++;
  const p = s.player;
  const dx = p.x - e.x;
  const dy = (p.y - p.h / 2) - (e.y - e.h / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const canSee = dist < 300 && hasLineOfSight(s, e.x, e.y - e.h / 2, p.x, p.y - p.h / 2);

  // Alert management
  if (canSee && !p.dead) {
    e.alertTimer = 120;
    e.facing = dx > 0 ? 1 : -1;
  }

  if (e.alertTimer > 0) {
    e.alertTimer--;

    // Shielder block facing
    if (e.type === "shielder") {
      e.blocking = dist < 100;
    }

    // Windup timer for attacks
    if (e.windupTimer > 0) {
      e.windupTimer--;
      if (e.windupTimer === 0) {
        // Execute attack
        if (e.type === "archer") {
          // Fire arrow
          const angle = Math.atan2(dy, dx);
          s.projectiles.push({
            x: e.x, y: e.y - e.h / 2,
            vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
            damage: e.damage, fromPlayer: false, life: 120,
            w: 8, h: 4,
          });
          playSound("arrow_fire");
        } else {
          // Melee attack
          if (dist < e.attackRange + 10) {
            hurtPlayer(s, e.damage);
          }
          playSound("enemy_swing");
        }
        e.attackTimer = e.type === "archer" ? 80 : 50;
        e.anim = "attack";
      }
      return true;
    }

    // Attack check
    if (e.attackTimer > 0) {
      e.attackTimer--;
    } else if (dist < e.attackRange) {
      // Start windup
      e.windupTimer = e.type === "archer" ? 30 : 15;
      e.anim = "windup";
      return true;
    }

    // Chase
    if (dist > e.attackRange * 0.6 && e.type !== "archer") {
      e.vx = e.facing * e.speed;
    } else if (e.type === "archer" && dist < 80) {
      // Archer retreats when too close
      e.vx = -e.facing * e.speed;
    } else {
      e.vx *= 0.8;
    }
  } else {
    // Patrol
    e.idleTimer++;
    const patrolDist = Math.abs(e.x - e.patrolOrigin);
    if (patrolDist > e.patrol * TILE) {
      e.patrolDir *= -1;
      e.facing = e.patrolDir;
    }
    e.vx = e.patrolDir * e.speed * 0.5;
    e.anim = "patrol";
  }

  // Gravity
  e.vy = Math.min(e.vy + GRAVITY, MAX_FALL);

  // X collision
  if (!entityCollision(s, e, e.vx, 0)) {
    e.x += e.vx;
  } else {
    e.vx = 0;
    if (e.alertTimer <= 0) {
      e.patrolDir *= -1;
      e.facing = e.patrolDir;
    }
  }

  // Y collision
  e.grounded = false;
  if (!entityCollision(s, e, 0, e.vy) && !checkPlatformEnemy(s, e, e.vy)) {
    e.y += e.vy;
  } else {
    if (e.vy > 0) e.grounded = true;
    e.vy = 0;
  }

  // Edge detection for patrol (don't walk off edges)
  if (e.grounded && e.alertTimer <= 0) {
    const aheadX = e.x + e.patrolDir * (e.w / 2 + 4);
    const aheadTx = Math.floor(aheadX / TILE);
    const belowTy = Math.floor((e.y + 4) / TILE);
    if (!isSolid(s, aheadTx, belowTy) && !isPlatform(s, aheadTx, belowTy)) {
      e.patrolDir *= -1;
      e.facing = e.patrolDir;
    }
  }

  // Animation
  if (e.alertTimer > 0 && e.windupTimer <= 0 && e.attackTimer <= 0) {
    e.anim = Math.abs(e.vx) > 0.3 ? "chase" : "alert";
  }
  e.animFrame = Math.floor(e.animTimer / 8) % 4;

  return true;
}

// ===== Update Boss =====

export function updateBoss(s: CamelotState, e: Enemy): void {
  e.animTimer++;
  const p = s.player;
  const dx = p.x - e.x;
  const dist = Math.abs(dx);
  e.facing = dx > 0 ? 1 : -1;

  // Phase management
  if (!e.phase) e.phase = 1;
  if (!e.phaseTimer) e.phaseTimer = 0;
  if (!e.specialTimer) e.specialTimer = 0;
  if (!e.slamTimer) e.slamTimer = 0;
  if (!e.teleportTimer) e.teleportTimer = 0;
  if (!e.summonTimer) e.summonTimer = 0;

  e.phaseTimer!++;

  // Phase transitions
  if (e.hp <= e.maxHp * 0.6 && e.phase === 1) {
    e.phase = 2;
    e.phaseTimer = 0;
    playSound("boss_roar");
    s.shake = 12;
    spawnFloatingText(s, e.x, e.y - e.h, "PHASE 2!", "#f0f");
  }
  if (e.hp <= e.maxHp * 0.3 && e.phase === 2) {
    e.phase = 3;
    e.phaseTimer = 0;
    playSound("boss_roar");
    s.shake = 15;
    spawnFloatingText(s, e.x, e.y - e.h, "FINAL PHASE!", "#f00");
  }

  // Attack timers
  if (e.attackTimer! > 0) e.attackTimer!--;
  if (e.specialTimer! > 0) e.specialTimer!--;
  if (e.slamTimer! > 0) e.slamTimer!--;
  if (e.teleportTimer! > 0) e.teleportTimer!--;
  if (e.summonTimer! > 0) e.summonTimer!--;

  // Boss attacks
  if (e.attackTimer! <= 0 && dist < e.attackRange + 20) {
    // Melee combo
    hurtPlayer(s, e.damage);
    playSound("enemy_swing");
    e.attackTimer = 35 - (e.phase! * 5);
    e.anim = "attack";
    s.shake = 4;
  }

  // Slam attack
  if (e.slamTimer! <= 0 && e.phase! >= 2) {
    e.slamTimer = 120 - (e.phase! * 15);
    e.vy = -10;
    setTimeout(() => {
      // Slam landing
      s.shake = 12;
      playSound("boss_slam");
      spawnDust(s, e.x, e.y, 15);
      // Ground shockwave projectiles
      s.projectiles.push({
        x: e.x - 30, y: e.y - 5, vx: -4, vy: 0,
        damage: 1, fromPlayer: false, life: 40, w: 20, h: 20, isSlam: true,
      });
      s.projectiles.push({
        x: e.x + 30, y: e.y - 5, vx: 4, vy: 0,
        damage: 1, fromPlayer: false, life: 40, w: 20, h: 20, isSlam: true,
      });
    }, 400);
  }

  // Teleport (phase 2+)
  if (e.teleportTimer! <= 0 && e.phase! >= 2 && dist > 200) {
    e.teleportTimer = 180;
    // Teleport near player
    for (let i = 0; i < 10; i++) {
      spawnParticle(s, e.x, e.y - e.h / 2,
        (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6,
        "#602060", 15 + Math.random() * 10, 4);
    }
    e.x = p.x + (Math.random() > 0.5 ? 80 : -80);
    for (let i = 0; i < 10; i++) {
      spawnParticle(s, e.x, e.y - e.h / 2,
        (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6,
        "#602060", 15 + Math.random() * 10, 4);
    }
  }

  // Summon minions (phase 3) — now summons mages too
  if (e.summonTimer! <= 0 && e.phase! >= 3) {
    e.summonTimer = 250;
    playSound("boss_roar");
    spawnFloatingText(s, e.x, e.y - e.h, "ARISE!", "#f0f");
    // Summon a guard and a mage
    const g1 = createEnemy({ type: "guard", x: e.x - 60, y: e.y - 40, patrol: 2 });
    const m1 = createEnemy({ type: "mage", x: e.x + 80, y: e.y - 40, patrol: 3 });
    g1.alertTimer = 120;
    m1.alertTimer = 120;
    s.enemies.push(g1, m1);
    // Summon portal particles
    for (let i = 0; i < 15; i++) {
      spawnParticle(s, e.x - 60, e.y - 30, (Math.random() - 0.5) * 4, -Math.random() * 4, "#a040ff", 20, 3);
      spawnParticle(s, e.x + 80, e.y - 30, (Math.random() - 0.5) * 4, -Math.random() * 4, "#a040ff", 20, 3);
    }
  }

  // Magic barrage (phase 2+) — fire 3 projectiles in a spread
  if (e.specialTimer! <= 0 && e.phase! >= 2 && dist < 250) {
    e.specialTimer = 100 - (e.phase! * 10);
    playSound("arrow_fire");
    for (let i = -1; i <= 1; i++) {
      const spreadAngle = Math.atan2((p.y - p.h/2) - (e.y - e.h/2), dx) + i * 0.3;
      s.projectiles.push({
        x: e.x, y: e.y - e.h / 2,
        vx: Math.cos(spreadAngle) * 4.5, vy: Math.sin(spreadAngle) * 4.5,
        damage: 1, fromPlayer: false, life: 80,
        w: 10, h: 10,
      });
    }
    // Spell circle particles
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      spawnParticle(s, e.x + Math.cos(a) * 25, e.y - e.h / 2 + Math.sin(a) * 25,
        Math.cos(a) * 3, Math.sin(a) * 3,
        e.phase === 3 ? "#ff4040" : "#c060ff", 12, 2);
    }
  }

  // Movement chase
  if (dist > e.attackRange * 0.8) {
    e.vx = e.facing * e.speed * (e.phase === 3 ? 1.3 : 1);
  } else {
    e.vx *= 0.85;
  }

  // Gravity
  e.vy = Math.min(e.vy + GRAVITY, MAX_FALL);

  // X collision
  if (!entityCollision(s, e, e.vx, 0)) {
    e.x += e.vx;
  } else {
    e.vx = 0;
  }

  // Y collision
  e.grounded = false;
  if (!entityCollision(s, e, 0, e.vy) && !checkPlatformEnemy(s, e, e.vy)) {
    e.y += e.vy;
  } else {
    if (e.vy > 0) e.grounded = true;
    e.vy = 0;
  }

  // Boss aura particles
  if (e.animTimer % 4 === 0) {
    spawnParticle(s, e.x + (Math.random() - 0.5) * e.w,
      e.y - Math.random() * e.h,
      (Math.random() - 0.5) * 2, -Math.random() * 2,
      e.phase === 3 ? "#f04040" : "#602060",
      15 + Math.random() * 10, 2 + Math.random() * 2);
  }

  e.animFrame = Math.floor(e.animTimer / 8) % 4;
}

// ===== Update Mage =====

function updateMage(s: CamelotState, e: Enemy): void {
  e.animTimer++;
  const p = s.player;
  const dx = p.x - e.x;
  const dy = (p.y - p.h / 2) - (e.y - e.h / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const canSee = dist < 350 && hasLineOfSight(s, e.x, e.y - e.h / 2, p.x, p.y - p.h / 2);

  if (canSee && !p.dead) { e.alertTimer = 150; e.facing = dx > 0 ? 1 : -1; }
  if (e.alertTimer > 0) e.alertTimer--;

  // Init mage timers
  if (e.castTimer === undefined) e.castTimer = MAGE_CAST_COOLDOWN;
  if (e.blinkTimer === undefined) e.blinkTimer = MAGE_BLINK_COOLDOWN;
  if (e.shieldActive === undefined) e.shieldActive = false;
  if (e.mageShieldHP === undefined) e.mageShieldHP = 0;

  e.castTimer!--;
  e.blinkTimer!--;

  // Magic shield — activates when low HP
  if (e.hp <= e.maxHp / 2 && !e.shieldActive && e.mageShieldHP! <= 0) {
    e.shieldActive = true;
    e.mageShieldHP = MAGE_SHIELD_HP;
    spawnFloatingText(s, e.x, e.y - e.h, "SHIELD!", "#80f");
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      spawnParticle(s, e.x + Math.cos(a) * 20, e.y - e.h / 2 + Math.sin(a) * 20,
        Math.cos(a) * 2, Math.sin(a) * 2, "#a060ff", 15, 3);
    }
  }

  // Cast spell projectile
  if (e.castTimer! <= 0 && e.alertTimer > 0 && canSee) {
    e.castTimer = MAGE_CAST_COOLDOWN;
    const angle = Math.atan2(dy, dx);
    // Fire homing-ish magic bolt
    s.projectiles.push({
      x: e.x, y: e.y - e.h / 2,
      vx: Math.cos(angle) * MAGE_SPELL_SPEED, vy: Math.sin(angle) * MAGE_SPELL_SPEED,
      damage: 2, fromPlayer: false, life: 100,
      w: 12, h: 12,
    });
    playSound("boss_roar");
    e.anim = "cast";
    // Cast particles
    for (let i = 0; i < 6; i++) {
      spawnParticle(s, e.x, e.y - e.h / 2,
        (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4,
        "#a040ff", 10 + Math.random() * 8, 2 + Math.random() * 2);
    }
  }

  // Blink teleport — teleports away when player gets close
  if (e.blinkTimer! <= 0 && dist < 80 && e.alertTimer > 0) {
    e.blinkTimer = MAGE_BLINK_COOLDOWN;
    // Poof particles at origin
    for (let i = 0; i < 10; i++) {
      spawnParticle(s, e.x, e.y - e.h / 2,
        (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6,
        "#8040c0", 12 + Math.random() * 8, 3 + Math.random() * 2);
    }
    // Teleport to a safe distance
    const blinkDist = 120 + Math.random() * 80;
    const blinkDir = Math.random() > 0.5 ? 1 : -1;
    e.x += blinkDir * blinkDist;
    // Keep in level bounds
    e.x = Math.max(TILE * 2, Math.min(e.x, (s.levelData.width - 2) * TILE));
    // Poof particles at destination
    for (let i = 0; i < 10; i++) {
      spawnParticle(s, e.x, e.y - e.h / 2,
        (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6,
        "#c060ff", 12 + Math.random() * 8, 3 + Math.random() * 2);
    }
    playSound("dash");
  }

  // Hover movement — mages float and keep distance
  if (e.alertTimer > 0) {
    if (dist < 120) {
      e.vx = -e.facing * e.speed; // retreat
    } else if (dist > 200) {
      e.vx = e.facing * e.speed * 0.5; // approach slowly
    } else {
      e.vx *= 0.9; // maintain distance
    }
  } else {
    // Patrol
    const patrolDist = Math.abs(e.x - e.patrolOrigin);
    if (patrolDist > e.patrol * TILE) { e.patrolDir *= -1; e.facing = e.patrolDir; }
    e.vx = e.patrolDir * e.speed * 0.4;
  }

  // Gravity (mages float slightly)
  e.vy = Math.min(e.vy + GRAVITY * 0.5, MAX_FALL * 0.5);

  // Collision
  if (!entityCollision(s, e, e.vx, 0)) e.x += e.vx; else e.vx = 0;
  e.grounded = false;
  if (!entityCollision(s, e, 0, e.vy) && !checkPlatformEnemy(s, e, e.vy)) {
    e.y += e.vy;
  } else { if (e.vy > 0) e.grounded = true; e.vy = 0; }

  // Floating particles
  if (e.animTimer % 6 === 0) {
    spawnParticle(s, e.x + (Math.random() - 0.5) * e.w, e.y,
      0, -0.5 - Math.random(), "#6040a0", 12 + Math.random() * 8, 1 + Math.random());
  }

  // Shield aura particles
  if (e.shieldActive && e.mageShieldHP! > 0 && e.animTimer % 4 === 0) {
    const a = (e.animTimer * 0.1) % (Math.PI * 2);
    spawnParticle(s, e.x + Math.cos(a) * 18, e.y - e.h / 2 + Math.sin(a) * 18,
      0, 0, "#a080ff", 8, 2);
  }

  e.animFrame = Math.floor(e.animTimer / 8) % 4;
  if (e.alertTimer > 0 && e.castTimer! > MAGE_CAST_COOLDOWN - 15) e.anim = "cast";
  else if (e.alertTimer > 0) e.anim = "alert";
  else e.anim = "patrol";
}

// ===== Blood Moon Event =====

export function updateBloodMoon(s: CamelotState): void {
  s.bloodMoonTimer++;
  if (!s.bloodMoonActive && s.bloodMoonTimer >= BLOOD_MOON_INTERVAL) {
    // Trigger blood moon
    s.bloodMoonActive = true;
    s.bloodMoonTimer = 0;
    s.shake = 6;
    s.vignetteTimer = 20;
    s.vignetteColor = "red";
    spawnFloatingText(s, s.player.x, s.player.y - s.player.h - 20, "BLOOD MOON RISES!", "#ff2020");
    playSound("boss_roar");
    // Buff all enemies
    for (const e of s.enemies) {
      if (e.dead) continue;
      e.speed *= BLOOD_MOON_SPEED_MULT;
      e.damage = Math.ceil(e.damage * BLOOD_MOON_DAMAGE_MULT);
    }
  }
  if (s.bloodMoonActive && s.bloodMoonTimer >= BLOOD_MOON_DURATION) {
    // End blood moon
    s.bloodMoonActive = false;
    s.bloodMoonTimer = 0;
    spawnFloatingText(s, s.player.x, s.player.y - s.player.h - 20, "Blood moon fades...", "#804040");
    // Restore enemy stats
    for (const e of s.enemies) {
      if (e.dead) continue;
      e.speed /= BLOOD_MOON_SPEED_MULT;
      e.damage = Math.max(1, Math.floor(e.damage / BLOOD_MOON_DAMAGE_MULT));
    }
  }
}

// ===== Weather Particles =====

export function updateWeather(s: CamelotState, canvasW: number, canvasH: number): void {
  if (!s.weatherParticles) s.weatherParticles = [];

  // Spawn weather based on level type
  const bg = s.levelData.bg;
  if (bg === "tower") {
    // Rain
    if (Math.random() < 0.4) {
      s.weatherParticles.push({
        x: s.camera.x + Math.random() * canvasW,
        y: s.camera.y - 10,
        vx: -1 - Math.random(), vy: 8 + Math.random() * 4,
        life: 60, size: 1 + Math.random(),
      });
    }
  } else if (bg === "throne") {
    // Floating embers
    if (Math.random() < 0.08) {
      s.weatherParticles.push({
        x: s.camera.x + Math.random() * canvasW,
        y: s.camera.y + canvasH + 5,
        vx: (Math.random() - 0.5) * 0.8, vy: -1 - Math.random() * 1.5,
        life: 120 + Math.random() * 60, size: 1 + Math.random() * 2,
      });
    }
  } else if (bg === "dungeon") {
    // Dripping water
    if (Math.random() < 0.02) {
      s.weatherParticles.push({
        x: s.camera.x + Math.random() * canvasW,
        y: s.camera.y,
        vx: 0, vy: 2 + Math.random(),
        life: 80, size: 2,
      });
    }
  }

  // Update weather particles
  for (let i = s.weatherParticles.length - 1; i >= 0; i--) {
    const wp = s.weatherParticles[i];
    wp.x += wp.vx;
    wp.y += wp.vy;
    wp.life--;
    if (wp.life <= 0) s.weatherParticles.splice(i, 1);
  }
}

// ===== Save/Load High Scores =====

export function saveHighScore(s: CamelotState): void {
  try {
    const data = {
      bestTime: Math.min(s.bestTime || 99999, s.totalTime),
      bestKills: Math.max(s.bestKills || 0, s.totalKills),
    };
    localStorage.setItem("camelot_save", JSON.stringify(data));
  } catch { /* storage unavailable */ }
}

export function loadHighScore(s: CamelotState): void {
  try {
    const raw = localStorage.getItem("camelot_save");
    if (raw) {
      const data = JSON.parse(raw);
      s.bestTime = data.bestTime || 99999;
      s.bestKills = data.bestKills || 0;
    }
  } catch { /* storage unavailable */ }
}

// ===== Update Projectiles =====

export function updateProjectiles(s: CamelotState): void {
  for (let i = s.projectiles.length - 1; i >= 0; i--) {
    const proj = s.projectiles[i];
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.life--;

    // Gravity for non-slam projectiles
    if (!proj.isSlam) {
      proj.vy += 0.05;
    }

    // Wall collision
    const tx = Math.floor(proj.x / TILE);
    const ty = Math.floor(proj.y / TILE);
    if (isSolid(s, tx, ty)) {
      spawnSparks(s, proj.x, proj.y, 3);
      s.projectiles.splice(i, 1);
      continue;
    }

    // Hit player
    if (!proj.fromPlayer) {
      const p = s.player;
      const dx = Math.abs(proj.x - p.x);
      const dy = Math.abs(proj.y - (p.y - p.h / 2));
      if (dx < proj.w / 2 + p.w / 2 && dy < proj.h / 2 + p.h / 2) {
        hurtPlayer(s, proj.damage);
        s.projectiles.splice(i, 1);
        continue;
      }
    }

    // Hit enemies (player projectiles / deflected)
    if (proj.fromPlayer) {
      for (const e of s.enemies) {
        if (e.dead) continue;
        const dx = Math.abs(proj.x - e.x);
        const dy = Math.abs(proj.y - (e.y - e.h / 2));
        if (dx < proj.w / 2 + e.w / 2 && dy < proj.h / 2 + e.h / 2) {
          hurtEnemy(s, e, proj.damage, proj.vx > 0 ? 1 : -1);
          s.projectiles.splice(i, 1);
          break;
        }
      }
      if (!s.projectiles[i]) continue;
    }

    // Slam projectile particle trail
    if (proj.isSlam) {
      spawnParticle(s, proj.x, proj.y,
        (Math.random() - 0.5) * 2, -Math.random() * 2 - 1,
        "#f80", 8 + Math.random() * 5, 3);
    }

    if (proj.life <= 0) {
      s.projectiles.splice(i, 1);
    }
  }
}

// ===== Update Moving Platforms =====

export function updateMovingPlatforms(s: CamelotState): void {
  for (const mp of s.movingPlatforms) {
    if (mp.originX === undefined) mp.originX = mp.x;
    if (mp.originY === undefined) mp.originY = mp.y;
    if (mp.t === undefined) mp.t = 0;

    mp.t += mp.speed * 0.02;
    const prevX = mp.x;
    const prevY = mp.y;

    mp.x = mp.originX + Math.sin(mp.t) * mp.range * mp.dx;
    mp.y = mp.originY + Math.sin(mp.t) * mp.range * mp.dy;

    // Store velocity for carrying entities
    mp.vx = mp.x - prevX;
    mp.vy2 = mp.y - prevY;
  }
}

// ===== Update Particles =====

export function updateParticles(s: CamelotState): void {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const pt = s.particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += 0.1; // particle gravity
    pt.life--;
    if (pt.life <= 0) {
      s.particles.splice(i, 1);
    }
  }
}

// ===== Update Floating Texts =====

export function updateFloatingTexts(s: CamelotState): void {
  for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
    const ft = s.floatingTexts[i];
    ft.y += ft.vy;
    ft.life--;
    if (ft.life <= 0) {
      s.floatingTexts.splice(i, 1);
    }
  }
}

// ===== Update Traps =====

export function updateTraps(s: CamelotState, _canvasW: number, _canvasH: number): void {
  for (const trap of s.traps) {
    if (trap.type === "blade") {
      if (trap.angle === undefined) trap.angle = 0;
      trap.angle += 0.05;
      // Check collision with player
      const p = s.player;
      const bladeLen = trap.len || TILE * 2;
      const bx = trap.x + Math.cos(trap.angle) * bladeLen / 2;
      const by = trap.y + Math.sin(trap.angle) * bladeLen / 2;
      const dx = Math.abs(bx - p.x);
      const dy = Math.abs(by - (p.y - p.h / 2));
      if (dx < 20 && dy < 20) {
        hurtPlayer(s, 1);
      }
      // Spark particles
      if (Math.random() < 0.1) {
        spawnSparks(s, bx, by, 1);
      }
    } else if (trap.type === "arrow") {
      // Arrow trap: fires arrows periodically from wall
      if (trap.timer === undefined) trap.timer = 0;
      trap.timer++;
      if (trap.timer % 120 === 0) {
        // Fire arrow projectile
        const p = s.player;
        const dirX = p.x > trap.x ? 1 : -1;
        s.projectiles.push({
          x: trap.x, y: trap.y,
          vx: dirX * 5, vy: 0,
          damage: 1, fromPlayer: false, life: 80,
          w: 10, h: 3,
        });
        playSound("arrow_fire");
      }
    } else if (trap.type === "fire") {
      if (trap.timer === undefined) trap.timer = 0;
      trap.timer++;
      trap.active = (trap.timer % 120) < 60;
      if (trap.active) {
        // Check collision with player
        const p = s.player;
        const dx = Math.abs(trap.x + TILE / 2 - p.x);
        const dy = Math.abs(trap.y - TILE - (p.y - p.h / 2));
        if (dx < TILE / 2 + p.w / 2 && dy < TILE + p.h / 2) {
          hurtPlayer(s, 1);
        }
        // Fire particles
        if (Math.random() < 0.3) {
          spawnParticle(s,
            trap.x + TILE / 2 + (Math.random() - 0.5) * 16,
            trap.y - Math.random() * TILE,
            (Math.random() - 0.5) * 2,
            -Math.random() * 3 - 1,
            Math.random() > 0.5 ? "#f80" : "#ff0",
            10 + Math.random() * 10,
            2 + Math.random() * 3);
        }
      }
    }
  }
}

// ===== Update Camera =====

export function updateCamera(s: CamelotState, canvasW: number, canvasH: number): void {
  // Intro camera pan
  if (s.introCamera) {
    const ic = s.introCamera;
    ic.timer++;
    if (ic.phase === "pan") {
      // Pan from level start overview to player spawn
      const t = Math.min(ic.timer / 90, 1);
      const eased = t * t * (3 - 2 * t); // smoothstep
      s.camera.x = ic.tx - canvasW / 2;
      s.camera.y = (s.levelData.height * TILE / 2 - canvasH / 2) * (1 - eased) + (ic.ty - canvasH / 2) * eased;
      if (ic.timer >= 90) {
        ic.phase = "settle";
        ic.timer = 0;
      }
      return;
    }
    if (ic.phase === "settle") {
      if (ic.timer >= 20) {
        s.introCamera = null;
      }
      return;
    }
  }

  const p = s.player;
  const targetX = p.x - canvasW / 2;
  const targetY = p.y - p.h / 2 - canvasH / 2 + 40;

  // Smooth camera follow
  s.camera.x += (targetX - s.camera.x) * 0.08;
  s.camera.y += (targetY - s.camera.y) * 0.08;

  // Clamp camera to level bounds
  const maxX = s.levelData.width * TILE - canvasW;
  const maxY = s.levelData.height * TILE - canvasH;
  s.camera.x = Math.max(0, Math.min(s.camera.x, maxX));
  s.camera.y = Math.max(0, Math.min(s.camera.y, maxY));

  // Screen shake
  if (s.shake > 0) {
    s.camera.x += (Math.random() - 0.5) * s.shake * 2;
    s.camera.y += (Math.random() - 0.5) * s.shake * 2;
    s.shake *= 0.85;
    if (s.shake < 0.5) s.shake = 0;
  }
}

// ===== Update Fade =====

export function updateFade(s: CamelotState): void {
  if (s.fadeDir !== 0) {
    s.fadeAlpha += s.fadeDir * 0.04;
    if (s.fadeAlpha >= 1) {
      s.fadeAlpha = 1;
      s.fadeDir = -1;
      if (s.fadeCallback) {
        s.fadeCallback();
        s.fadeCallback = null;
      }
    }
    if (s.fadeAlpha <= 0) {
      s.fadeAlpha = 0;
      s.fadeDir = 0;
    }
  }
}

export function fadeToBlack(s: CamelotState, cb: () => void): void {
  s.fadeDir = 1;
  s.fadeAlpha = 0;
  s.fadeCallback = cb;
}

// ===== Update Shop =====

export function updateShop(s: CamelotState): void {
  if (!s.shopActive) return;

  if (s.justPressed["ArrowUp"] || s.justPressed["KeyW"] || s.gpJustPressed[12]) {
    s.shopSelection = Math.max(0, s.shopSelection - 1);
  }
  if (s.justPressed["ArrowDown"] || s.justPressed["KeyS"] || s.gpJustPressed[13]) {
    s.shopSelection = Math.min(s.shopItems.length - 1, s.shopSelection + 1);
  }
  if (s.justPressed["Enter"] || s.justPressed["KeyE"] || s.justPressed["KeyJ"] || s.gpJustPressed[0]) {
    const item = s.shopItems[s.shopSelection];
    if (item && s.totalCoins >= item.cost) {
      s.totalCoins -= item.cost;
      item.action();
      playSound("shop_buy");
      spawnFloatingText(s, s.player.x, s.player.y - s.player.h, item.name, "#ff0");
    }
  }
  if (s.justPressed["Escape"] || s.gpJustPressed[1]) {
    s.shopActive = false;
  }
}

// ===== Gamepad Polling =====

export function pollGamepad(s: CamelotState): void {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gamepads[0];
  if (!gp) return;

  const prevButtons = { ...s.gpButtons };
  s.gpJustPressed = {};

  for (let i = 0; i < gp.buttons.length; i++) {
    const pressed = gp.buttons[i].pressed;
    s.gpButtons[i] = pressed;
    if (pressed && !prevButtons[i]) {
      s.gpJustPressed[i] = true;
    }
  }

  s.gpAxes = [];
  for (let i = 0; i < gp.axes.length; i++) {
    s.gpAxes[i] = gp.axes[i];
  }
}
