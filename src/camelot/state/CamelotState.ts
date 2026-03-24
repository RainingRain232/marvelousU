// ---------------------------------------------------------------------------
// Prince of Camelot — State Creation & Management
// ---------------------------------------------------------------------------

import type { CamelotState, Player, Enemy, EnemyDef, Crate } from "../types";
import { CamelotPhase } from "../types";
import { TILE, STAMINA_MAX } from "../config/CamelotConfig";
import { buildLevels } from "../systems/CamelotLevels";

export function createPlayer(x: number, y: number): Player {
  return {
    x, y, vx: 0, vy: 0, w: 24, h: 36, facing: 1,
    grounded: false, onLadder: false,
    hp: 6, maxHp: 6, stamina: STAMINA_MAX,
    attacking: 0, attackCooldown: 0, comboStep: 0, comboTimer: 0,
    rolling: 0, rollDir: 1, dashing: 0, dashDir: 1,
    parrying: 0, parrySuccess: false,
    invuln: 0, dead: false,
    coyoteTime: 0, jumpBuffer: 0, wallSliding: false,
    swordLevel: 0, hasDoubleJump: false, hasShield: false, shieldHP: 0,
    jumpsLeft: 1,
    anim: "idle", animFrame: 0, animTimer: 0,
    checkpoint: { x, y }, crumbleTouched: new Set(),
    trail: [],
    attackBuffer: 0, rollBuffer: 0, dashBuffer: 0, parryBuffer: 0,
    squashX: 1, squashY: 1, landingLag: 0,
    footstepTimer: 0,
    plunging: false,
    killStreak: 0, killStreakTimer: 0,
    wallJumpCooldown: 0,
    executionZoom: 0,
    comboFinisherTimer: 0,
    airDashing: 0, airDashDir: 1, airDashUsed: false,
    chargeTimer: 0, charging: false,
  };
}

export function createEnemy(def: EnemyDef): Enemy {
  const base = {
    x: def.x, y: def.y, vx: 0, vy: 0, facing: -1, grounded: false,
    invuln: 0, anim: "idle", animFrame: 0, animTimer: 0,
    patrol: def.patrol || 3, patrolOrigin: def.x, patrolDir: -1,
    alertTimer: 0, attackTimer: 0, stunTimer: 0,
    dead: false, deathTimer: 0, windupTimer: 0, idleTimer: 0,
  };
  switch (def.type) {
    case "guard": return { ...base, type: "guard", w: 24, h: 36, hp: 3, maxHp: 3, speed: 1.5, damage: 1, attackRange: 40, color: "#808090" };
    case "archer": return { ...base, type: "archer", w: 24, h: 36, hp: 2, maxHp: 2, speed: 1, damage: 1, attackRange: 250, color: "#608040" };
    case "knight": return { ...base, type: "knight", w: 28, h: 38, hp: 5, maxHp: 5, speed: 1.8, damage: 2, attackRange: 50, color: "#5050a0" };
    case "shielder": return { ...base, type: "shielder", w: 28, h: 38, hp: 4, maxHp: 4, speed: 1.2, damage: 1, attackRange: 45, color: "#708070", blocking: true };
    case "mage": return { ...base, type: "mage", w: 24, h: 36, hp: 4, maxHp: 4, speed: 1.3, damage: 2, attackRange: 200, color: "#6040a0", castTimer: 90, blinkTimer: 200, shieldActive: false, mageShieldHP: 0 };
    case "boss": return { ...base, type: "boss", w: 40, h: 52, hp: 20, maxHp: 20, speed: 2, damage: 2, attackRange: 60, color: "#602060", phase: 1, phaseTimer: 0, specialTimer: 0, slamTimer: 0, teleportTimer: 0, summonTimer: 0 };
  }
}

export function createCrate(x: number, y: number): Crate {
  return { x, y, w: TILE, h: TILE, hp: 2, maxHp: 2, shakeTimer: 0 };
}

export function createInitialState(): CamelotState {
  const allLevels = buildLevels();
  const lvl = allLevels[0];
  return {
    phase: CamelotPhase.START,
    gameRunning: false,
    gameTime: 0,
    camera: { x: 0, y: 0 },
    currentLevel: 0,
    player: createPlayer(lvl.spawn.x, lvl.spawn.y),
    enemies: lvl.enemies.map(e => createEnemy(e)),
    particles: [],
    projectiles: [],
    pickups: lvl.pickups.map(p => ({ ...p })),
    movingPlatforms: lvl.movingPlatforms.map(p => ({ ...p })),
    crates: lvl.crates.map(c => createCrate(c.x, c.y)),
    traps: lvl.traps.map(t => ({ ...t })),
    levelData: lvl,
    allLevels,
    totalKills: 0, totalCoins: 0, totalTime: 0,
    shake: 0, hitFreeze: 0,
    fadeAlpha: 0, fadeDir: 0, fadeCallback: null,
    dialogueQueue: [],
    dialogueActive: false,
    floatingTexts: [],
    playerXP: 0, playerLevel: 1,
    persistentState: { swordLevel: 0, hasDoubleJump: false, hasShield: false, shieldHP: 0, maxHpBonus: 0, staminaBonus: 0 },
    introCamera: null,
    timeScale: 1.0,
    vignetteTimer: 0, vignetteColor: "red",
    cameraZoom: 1.0,
    checkpointActive: null,
    lives: 3,
    shopActive: false, shopItems: [], shopSelection: 0,
    crtEnabled: false,
    tallyTimer: 0, tallyData: null,
    bestTime: 99999, bestKills: 0,
    weatherParticles: [],
    bloodMoonTimer: 0, bloodMoonActive: false,
    keys: {}, justPressed: {},
    gpButtons: {}, gpJustPressed: {}, gpAxes: [0, 0, 0, 0],
  };
}

export function loadLevel(s: CamelotState, idx: number): void {
  s.levelData = s.allLevels[idx];
  s.player = createPlayer(s.levelData.spawn.x, s.levelData.spawn.y);
  // Restore persistent upgrades
  s.player.swordLevel = s.persistentState.swordLevel;
  s.player.hasDoubleJump = s.persistentState.hasDoubleJump;
  s.player.hasShield = s.persistentState.hasShield;
  s.player.shieldHP = s.persistentState.shieldHP;
  s.player.maxHp += s.persistentState.maxHpBonus;
  s.player.hp = s.player.maxHp;
  s.enemies = s.levelData.enemies.map(e => createEnemy(e));
  s.particles = []; s.projectiles = []; s.floatingTexts = [];
  s.pickups = s.levelData.pickups.map(p => ({ ...p }));
  s.movingPlatforms = s.levelData.movingPlatforms.map(p => ({ ...p }));
  s.crates = s.levelData.crates.map(c => createCrate(c.x, c.y));
  s.traps = s.levelData.traps.map(t => ({ ...t }));
  // Intro camera pan
  s.introCamera = { tx: s.levelData.spawn.x, ty: s.levelData.spawn.y, timer: 0, phase: "pan" };
}
