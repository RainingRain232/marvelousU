// ---------------------------------------------------------------------------
// Race mode — game state
// ---------------------------------------------------------------------------

import type { HorseDef, TrackDef } from "../config/RaceConfig";
import { HORSES, TRACKS, RaceConfig } from "../config/RaceConfig";

export enum RacePhase {
  TRACK_SELECT = "track_select",
  COUNTDOWN = "countdown",
  RACING = "racing",
  FINISHED = "finished",
}

export interface Racer {
  id: string;
  name: string;
  horse: HorseDef;
  x: number;
  y: number;
  speed: number;
  angle: number;
  stamina: number;
  waypointIndex: number;
  lap: number;
  finished: boolean;
  finishTime: number;
  isPlayer: boolean;
  galloping: boolean;
  // AI behavior
  aiTargetSpeed: number;
  aiSteerNoise: number;
}

export interface RaceState {
  phase: RacePhase;
  track: TrackDef;
  trackIndex: number;
  racers: Racer[];
  countdown: number;
  elapsedTime: number;
  gold: number;
  currentBet: number;
  horseIndex: number;
  finishOrder: string[];
  announcements: { text: string; color: number; timer: number }[];
  particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number }[];
  log: string[];
  totalRaces: number;
  totalWins: number;
  // Player input
  playerSteerInput: number; // -1 left, 0 auto, 1 right
  // Track power-ups
  powerUps: { x: number; y: number; type: "speed" | "stamina" | "shield"; collected: boolean }[];
  playerShield: number; // seconds of shield remaining
  // Championship
  championshipRaces: number; // 0 = single race, 3 = championship
  championshipResults: number[]; // place per race
}

const AI_NAMES = ["Sir Galahad", "Lady Morgana", "Baron Hector", "Dame Elspeth", "Lord Bors", "Squire Tam"];

export function createRaceState(trackIndex: number, horseIndex: number, gold: number): RaceState {
  const baseTrack = TRACKS[Math.min(trackIndex, TRACKS.length - 1)];
  // Deep-copy the track so we can add extra obstacles for difficulty scaling
  const track: TrackDef = {
    ...baseTrack,
    waypoints: baseTrack.waypoints.map(w => ({ ...w })),
    obstacles: baseTrack.obstacles.map(o => ({ ...o })),
  };

  // Difficulty scaling: add extra obstacles on harder tracks
  const extraObs = trackIndex * RaceConfig.EXTRA_OBSTACLES_PER_TRACK;
  const wp = track.waypoints;
  for (let i = 0; i < extraObs; i++) {
    const wpIdx = Math.floor(Math.random() * wp.length);
    const a = wp[wpIdx], b = wp[(wpIdx + 1) % wp.length];
    const t = 0.2 + Math.random() * 0.6;
    const offset = (Math.random() - 0.5) * track.width * 0.6;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / dist, ny = dx / dist;
    track.obstacles.push({
      x: a.x + dx * t + nx * offset,
      y: a.y + dy * t + ny * offset,
      r: 10 + Math.random() * 5,
    });
  }

  const playerHorse = HORSES[Math.min(horseIndex, HORSES.length - 1)];
  const start = track.waypoints[0];

  const racers: Racer[] = [];
  // Player
  racers.push({
    id: "player", name: "You", horse: playerHorse,
    x: start.x, y: start.y + 15, speed: 0, angle: 0,
    stamina: playerHorse.stamina, waypointIndex: 0, lap: 0,
    finished: false, finishTime: 0, isPlayer: true, galloping: false,
    aiTargetSpeed: 0, aiSteerNoise: 0,
  });

  // AI racers — scale speed with track difficulty
  const aiSpeedScale = 1 + trackIndex * RaceConfig.AI_SPEED_SCALE_PER_TRACK;
  for (let i = 0; i < RaceConfig.AI_COUNT; i++) {
    const aiHorse = HORSES[Math.floor(Math.random() * HORSES.length)];
    racers.push({
      id: `ai_${i}`, name: AI_NAMES[i % AI_NAMES.length], horse: aiHorse,
      x: start.x, y: start.y - 15 - i * 12, speed: 0, angle: 0,
      stamina: aiHorse.stamina, waypointIndex: 0, lap: 0,
      finished: false, finishTime: 0, isPlayer: false, galloping: false,
      aiTargetSpeed: aiHorse.maxSpeed * (0.7 + Math.random() * 0.25) * aiSpeedScale,
      aiSteerNoise: (Math.random() - 0.5) * 0.3,
    });
  }

  return {
    phase: RacePhase.COUNTDOWN,
    track, trackIndex,
    racers,
    countdown: 3,
    elapsedTime: 0,
    gold,
    currentBet: 0,
    horseIndex,
    finishOrder: [],
    announcements: [{ text: "GET READY!", color: 0xffaa44, timer: 2 }],
    particles: [],
    log: [`${track.name} — ${track.laps} laps`],
    totalRaces: 0,
    totalWins: 0,
    playerSteerInput: 0,
    powerUps: generatePowerUps(track),
    playerShield: 0,
    championshipRaces: 0,
    championshipResults: [],
  };
}

function generatePowerUps(track: TrackDef): RaceState["powerUps"] {
  const pups: RaceState["powerUps"] = [];
  const types: ("speed" | "stamina" | "shield")[] = ["speed", "stamina", "shield"];
  // Place 3-4 power-ups along the track
  const wp = track.waypoints;
  for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
    const wpIdx = Math.floor(Math.random() * wp.length);
    const a = wp[wpIdx], b = wp[(wpIdx + 1) % wp.length];
    const t = 0.3 + Math.random() * 0.4;
    pups.push({
      x: a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 20,
      y: a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 20,
      type: types[Math.floor(Math.random() * types.length)],
      collected: false,
    });
  }
  return pups;
}
