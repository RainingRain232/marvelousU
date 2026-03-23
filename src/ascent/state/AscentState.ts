// Camelot Ascent – State Factory & Persistence

import type { AscentState, AscentPlayer, AscentMeta, Platform } from "../types";
import { AscentPhase, PlatformType } from "../types";
import { ASCENT_BALANCE as B } from "../config/AscentBalance";

const META_STORAGE_KEY = "camelot_ascent_meta";

// ---------------------------------------------------------------------------
// Player factory
// ---------------------------------------------------------------------------

export function createPlayer(): AscentPlayer {
  return {
    x: B.WORLD_WIDTH / 2,
    y: 0, // will be placed on the starting platform
    vx: 0,
    vy: 0,
    width: B.PLAYER_WIDTH,
    height: B.PLAYER_HEIGHT,
    facing: 1,
    grounded: false,
    jumpsLeft: B.MAX_JUMPS,
    maxJumps: B.MAX_JUMPS,
    hp: B.STARTING_HP,
    maxHp: B.STARTING_HP,
    invincibleTimer: 0,
    shieldActive: false,
    speedBoostTimer: 0,
    score: 0,
    coins: 0,
    highestY: 0,
    floor: 0,
    combo: 0,
    comboTimer: 0,
    highestCombo: 0,
    attackCooldown: 0,
    wallSliding: false,
    dashTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// Initial platform generation (a small set so the player has somewhere to land)
// ---------------------------------------------------------------------------

function createStartingPlatforms(): Platform[] {
  const platforms: Platform[] = [];

  // A wide floor platform directly under the player
  platforms.push({
    x: B.WORLD_WIDTH / 2 - 80,
    y: 40, // slightly below player spawn (positive Y = down in screen coords -> we treat Y as "up")
    width: 160,
    type: PlatformType.NORMAL,
    moveSpeed: 0,
    moveRange: 0,
    movePhase: 0,
    crumbleTimer: 0,
    active: true,
  });

  // A few more normal platforms above so the player can start climbing
  const rows = 8;
  for (let i = 1; i <= rows; i++) {
    const y = -(i * B.PLATFORM_SPACING_Y);
    const w =
      B.PLATFORM_MIN_WIDTH +
      Math.random() * (B.PLATFORM_MAX_WIDTH - B.PLATFORM_MIN_WIDTH);
    const x = Math.random() * (B.WORLD_WIDTH - w);
    platforms.push({
      x,
      y,
      width: w,
      type: PlatformType.NORMAL,
      moveSpeed: 0,
      moveRange: 0,
      movePhase: 0,
      crumbleTimer: 0,
      active: true,
    });
  }

  return platforms;
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

export function createAscentState(startPhase: AscentPhase = AscentPhase.PLAYING): AscentState {
  const meta = loadAscentMeta();
  const player = createPlayer();
  player.y = 0; // player starts at y=0, first platform is at y=40

  // Apply meta unlockables
  if (meta.unlockedTripleJump) {
    player.maxJumps = 3;
    player.jumpsLeft = 3;
  }
  if (meta.permanentExtraHp > 0) {
    player.hp += meta.permanentExtraHp;
    player.maxHp += meta.permanentExtraHp;
  }

  return {
    phase: startPhase,
    player,
    platforms: createStartingPlatforms(),
    enemies: [],
    projectiles: [],
    pickups: [],
    cameraY: 0,
    time: 0,
    floor: 0,
    bossActive: false,
    bossHp: 0,
    bossMaxHp: 0,
    highScore: meta.highScore,
    deathCount: meta.totalDeaths,
  };
}

// ---------------------------------------------------------------------------
// Meta persistence (localStorage)
// ---------------------------------------------------------------------------

function defaultMeta(): AscentMeta {
  return {
    highScore: 0,
    bestFloor: 0,
    totalCoins: 0,
    totalDeaths: 0,
    gamesPlayed: 0,
    unlockedDash: false,
    unlockedTripleJump: false,
    unlockedProjectile: false,
    permanentExtraHp: 0,
  };
}

export function loadAscentMeta(): AscentMeta {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return defaultMeta();
    const parsed = JSON.parse(raw) as Partial<AscentMeta>;
    // Merge with defaults so any missing fields are filled in
    return { ...defaultMeta(), ...parsed };
  } catch {
    return defaultMeta();
  }
}

export function saveAscentMeta(meta: AscentMeta): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // storage full or unavailable – silently ignore
  }
}
