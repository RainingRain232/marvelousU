// ---------------------------------------------------------------------------
// Kingdom – State Factory (v4)
// ---------------------------------------------------------------------------

import { KingdomPhase, KingdomChar, PowerState } from "../types";
import type { KingdomState, Player } from "../types";

export function createKingdomState(sw: number, sh: number): KingdomState {
  const tileSize = Math.floor(sh / 15);
  return {
    phase: KingdomPhase.TITLE,
    character: KingdomChar.ARTHUR,
    charSelectIndex: 0,
    player: createPlayer(3, 11),
    world: 1, level: 1,
    tiles: [], levelWidth: 0, levelHeight: 15,
    enemies: [], items: [], projectiles: [], particles: [],
    blockAnims: [], coinAnims: [], scorePopups: [],
    floatingCoins: [], movingPlatforms: [],
    score: 0, coins: 0, lives: 3, time: 400,
    cameraX: 0, cameraTargetX: 0,
    screenShakeTimer: 0, screenShakeIntensity: 0,
    levelIntroTimer: 0, levelClearTimer: 0,
    flagSliding: false, flagSlideY: 0, walkingToEnd: false,
    coinBlockHits: new Map(),
    pauseMenuIndex: 0,
    checkpointX: -1, checkpointY: -1, hasCheckpoint: false,
    bonusRoom: null, bonusRoomSavedTiles: null, bonusRoomSavedCamera: 0,
    bonusRoomSavedCoins: [], pipeEntrances: [],
    bossDeathTimer: 0, bossDeathActive: false,
    sw, sh, tileSize,
    highScore: loadHighScore(),
    questionBlockItems: new Map(),
    totalEnemiesKilled: 0, totalCoinsCollected: 0,
  };
}

export function createPlayer(x: number, y: number): Player {
  return {
    x, y, vx: 0, vy: 0, width: 0.75, height: 0.9,
    power: PowerState.SMALL, facing: 1,
    grounded: false, jumping: false, running: false,
    invincibleTimer: 0, starTimer: 0, deathTimer: 0,
    growTimer: 0, shrinkTimer: 0,
    hasDoubleJumped: false, hoverTimer: 0,
    dashTimer: 0, dashCooldown: 0,
    swordTimer: 0, swordCooldown: 0,
    stompCombo: 0, stompComboTimer: 0,
    coyoteTimer: 0, jumpBufferTimer: 0, wallSlideDir: 0,
    crouching: false, slideTimer: 0, onPlatformIdx: -1,
    landingTimer: 0, lastAirVy: 0,
    animFrame: 0, animTimer: 0, skidding: false,
  };
}

export function resetPlayerForLevel(s: KingdomState, startX: number, startY: number): void {
  const p = s.player;
  Object.assign(p, {
    x: startX, y: startY, vx: 0, vy: 0, facing: 1,
    grounded: false, jumping: false, running: false,
    invincibleTimer: 0, starTimer: 0, deathTimer: 0,
    growTimer: 0, shrinkTimer: 0,
    hasDoubleJumped: false, hoverTimer: 0,
    dashTimer: 0, dashCooldown: 0,
    swordTimer: 0, swordCooldown: 0,
    stompCombo: 0, stompComboTimer: 0,
    coyoteTimer: 0, jumpBufferTimer: 0, wallSlideDir: 0,
    crouching: false, slideTimer: 0, onPlatformIdx: -1,
    landingTimer: 0, lastAirVy: 0,
    animFrame: 0, animTimer: 0, skidding: false,
  });
}

export function loadHighScore(): number {
  try { return parseInt(localStorage.getItem("kingdom_highscore") || "0", 10) || 0; } catch { return 0; }
}
export function saveHighScore(score: number): void {
  try { localStorage.setItem("kingdom_highscore", String(score)); } catch { /* noop */ }
}
