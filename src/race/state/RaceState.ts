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
}

const AI_NAMES = ["Sir Galahad", "Lady Morgana", "Baron Hector", "Dame Elspeth", "Lord Bors", "Squire Tam"];

export function createRaceState(trackIndex: number, horseIndex: number, gold: number): RaceState {
  const track = TRACKS[Math.min(trackIndex, TRACKS.length - 1)];
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

  // AI racers
  for (let i = 0; i < RaceConfig.AI_COUNT; i++) {
    const aiHorse = HORSES[Math.floor(Math.random() * HORSES.length)];
    racers.push({
      id: `ai_${i}`, name: AI_NAMES[i % AI_NAMES.length], horse: aiHorse,
      x: start.x, y: start.y - 15 - i * 12, speed: 0, angle: 0,
      stamina: aiHorse.stamina, waypointIndex: 0, lap: 0,
      finished: false, finishTime: 0, isPlayer: false, galloping: false,
      aiTargetSpeed: aiHorse.maxSpeed * (0.7 + Math.random() * 0.25),
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
  };
}
