// ---------------------------------------------------------------------------
// The Last Flame — State factory & persistence (v2)
// ---------------------------------------------------------------------------

import { LFPhase } from "../types";
import type { LFState, LFMeta, LFPillar, LFRoomConfig } from "../types";
import { LF } from "../config/LastFlameBalance";

// ---------------------------------------------------------------------------
// Room generation — each room has unique geometry and atmosphere
// ---------------------------------------------------------------------------

const ROOM_TEMPLATES: Array<Omit<LFRoomConfig, "arenaW" | "arenaH">> = [
  { pillarCount: 6, pillarRadiusMin: 12, pillarRadiusMax: 22, floorDark: 0x08060e, floorLight: 0x0e0c16, bgColor: 0x020208, roomName: "The Entrance", hazard: "none" },
  { pillarCount: 8, pillarRadiusMin: 10, pillarRadiusMax: 18, floorDark: 0x060610, floorLight: 0x0a0a18, bgColor: 0x010108, roomName: "The Corridors", hazard: "none" },
  { pillarCount: 4, pillarRadiusMin: 18, pillarRadiusMax: 28, floorDark: 0x080812, floorLight: 0x0c0c1a, bgColor: 0x010110, roomName: "The Great Hall", hazard: "wind" },
  { pillarCount: 10, pillarRadiusMin: 8, pillarRadiusMax: 14, floorDark: 0x050508, floorLight: 0x0a0810, bgColor: 0x020206, roomName: "The Maze", hazard: "none" },
  { pillarCount: 5, pillarRadiusMin: 14, pillarRadiusMax: 24, floorDark: 0x060812, floorLight: 0x080c18, bgColor: 0x010210, roomName: "The Cistern", hazard: "damp" },
  { pillarCount: 3, pillarRadiusMin: 20, pillarRadiusMax: 30, floorDark: 0x0a0806, floorLight: 0x100c0a, bgColor: 0x040204, roomName: "The Forge", hazard: "oil_floor" },
  { pillarCount: 7, pillarRadiusMin: 10, pillarRadiusMax: 20, floorDark: 0x040410, floorLight: 0x080818, bgColor: 0x010114, roomName: "The Abyss", hazard: "wind" },
  { pillarCount: 12, pillarRadiusMin: 6, pillarRadiusMax: 12, floorDark: 0x030308, floorLight: 0x060610, bgColor: 0x010106, roomName: "The Labyrinth", hazard: "damp" },
];

export function generateRoom(depth: number): LFRoomConfig {
  const template = ROOM_TEMPLATES[depth % ROOM_TEMPLATES.length];
  // Rooms get slightly smaller as you descend (more claustrophobic)
  const shrink = Math.min(depth * 15, 100);
  return {
    arenaW: Math.max(500, LF.ARENA_W - shrink),
    arenaH: Math.max(400, LF.ARENA_H - shrink),
    ...template,
  };
}

export function generatePillars(config: LFRoomConfig): LFPillar[] {
  const pillars: LFPillar[] = [];
  for (let i = 0; i < config.pillarCount; i++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const px = 40 + Math.random() * (config.arenaW - 80);
      const py = 40 + Math.random() * (config.arenaH - 80);
      const pr = config.pillarRadiusMin + Math.random() * (config.pillarRadiusMax - config.pillarRadiusMin);
      const dx = px - config.arenaW / 2, dy = py - config.arenaH / 2;
      if (Math.sqrt(dx * dx + dy * dy) < 60) continue;
      if (pillars.some(p => Math.sqrt((p.x - px) ** 2 + (p.y - py) ** 2) < p.radius + pr + 20)) continue;
      pillars.push({ x: px, y: py, radius: pr });
      break;
    }
  }
  return pillars;
}

const META_KEY = "lastflame_meta";
const DEFAULT_UPGRADES = { startFuel: 0, flareCooldown: 0, lightRecovery: 0, oilMagnet: 0, doubleFlare: 0, oilFrequency: 0, startingMutator: 0 };

export function loadLFMeta(): LFMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as LFMeta;
      if (m.embers === undefined) m.embers = 0;
      if (!m.upgrades) m.upgrades = { ...DEFAULT_UPGRADES };
      // Migrate new fields
      if (m.upgrades.doubleFlare === undefined) m.upgrades.doubleFlare = 0;
      if (m.upgrades.oilFrequency === undefined) m.upgrades.oilFrequency = 0;
      if (m.upgrades.startingMutator === undefined) m.upgrades.startingMutator = 0;
      if (!m.milestones) m.milestones = [];
      if (!m.runHistory) m.runHistory = [];
      return m;
    }
  } catch { /* ignore */ }
  return { highScore: 0, bestTime: 0, gamesPlayed: 0, totalShadowsBurned: 0, totalOilCollected: 0, embers: 0, upgrades: { ...DEFAULT_UPGRADES }, milestones: [], runHistory: [] };
}

export function saveLFMeta(meta: LFMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

export function createLFState(sw: number, sh: number, meta?: LFMeta): LFState {
  const m = meta || loadLFMeta();
  const room = generateRoom(0);
  const aw = Math.min(room.arenaW, sw - 20);
  const ah = Math.min(room.arenaH, sh - 20);
  const actualRoom = { ...room, arenaW: aw, arenaH: ah };
  const pillars = generatePillars(actualRoom);

  // Apply upgrades
  const startFuel = LF.FUEL_START + (m.upgrades?.startFuel ?? 0) * 0.05;
  const flareCd = LF.FLARE_COOLDOWN - (m.upgrades?.flareCooldown ?? 0) * 0.5;
  const lightRecovery = 3 + (m.upgrades?.lightRecovery ?? 0) * 2;
  const oilMagnet = (m.upgrades?.oilMagnet ?? 0) > 0 ? 40 : 0;
  const flareCharges = (m.upgrades?.doubleFlare ?? 0) > 0 ? 2 : 1;
  const oilSpawnInterval = LF.OIL_SPAWN_INTERVAL - (m.upgrades?.oilFrequency ?? 0) * 0.8;

  return {
    phase: LFPhase.START,
    arenaW: aw, arenaH: ah,
    playerX: aw / 2, playerY: ah / 2,
    playerSpeed: LF.PLAYER_SPEED,
    fuel: Math.min(1, startFuel),
    lightRadius: LF.LIGHT_RADIUS_MAX * startFuel,
    maxLightRadius: LF.LIGHT_RADIUS_MAX,
    flareCooldown: 0, flareTimer: 0, flareRadius: 0, flareCharges: flareCharges, flareMaxCharges: flareCharges,
    shadows: [], shadowSpawnTimer: 3.0,
    oilDrops: [], oilSpawnTimer: oilSpawnInterval,
    pillars,
    lightRecoveryRate: lightRecovery, oilMagnetRadius: oilMagnet, flareCooldownBase: flareCd, oilSpawnInterval: oilSpawnInterval,
    roomDepth: 0, roomConfig: actualRoom, roomTransitionTimer: 0,
    activeMutators: [], mutatorChoices: [], choosingMutator: false, deathCause: "",
    dyingTimer: 0, waveAnnounceTimer: 0, waveName: "",
    tutFirstOil: false, tutFirstFlare: false, tutFirstHit: false, tutFirstSprint: false, tutFirstLowFuel: false,
    invulnTimer: 0, sprinting: false,
    score: 0, highScore: m.highScore,
    shadowsBurned: 0, oilCollected: 0, flaresUsed: 0, hitsAbsorbed: 0,
    particles: [], floatTexts: [],
    screenShake: 0, screenFlashColor: 0xffffff, screenFlashTimer: 0,
    wave: 0, waveTimer: LF.WAVE_INTERVAL,
    comboCount: 0, comboTimer: 0,
    windAngle: Math.random() * Math.PI * 2, windChangeTimer: LF.WIND_CHANGE_INTERVAL,
    dodgeTimer: 0,
    waveShadowsRemaining: 0,
    time: 0,
  };
}
