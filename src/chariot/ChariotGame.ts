/**
 * CHARIOT — 3D Medieval Chariot Racing
 *
 * Race through Arthurian landscapes in a horse-drawn chariot.
 * Features: 5 tracks, 7 AI opponents, power-ups, drifting, whip, tournament mode.
 *
 * Controls:
 *   W / ↑      — accelerate
 *   S / ↓      — brake / reverse
 *   A / ←      — steer left
 *   D / →      — steer right
 *   SPACE       — drift (hold while turning for boost)
 *   F           — whip horses (short burst, cooldown)
 *   E           — use power-up
 *   V           — toggle rear-view camera
 *   ESC         — pause
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ChariotAudio } from "./ChariotAudio";

// ─── constants ───────────────────────────────────────────────────────────────

const TRACK_COUNT = 5;
const AI_COUNT = 7;
const LAPS_PER_RACE = 3;

// physics
const MAX_SPEED = 38;
const ACCEL = 22;
const BRAKE_FORCE = 30;
const DRAG = 0.4;
const STEER_SPEED = 2.2;
const STEER_RETURN = 4.0;
const MAX_STEER = 0.7;
const DRIFT_STEER_MULT = 1.6;
const DRIFT_DRAG_MULT = 0.6;
const DRIFT_BOOST_TIME = 0.8;
const DRIFT_BOOST_SPEED = 8;
const GRAVITY = 25;
const GROUND_Y = 0.15;

// whip
const WHIP_BOOST = 12;
const WHIP_DURATION = 0.6;
const WHIP_COOLDOWN = 3.0;

// camera
const CAM_DIST = 16;
const CAM_HEIGHT = 7.5;
const CAM_SMOOTH = 4;
const CAM_LOOK_AHEAD = 10;
const CAM_BASE_FOV = 68;
const CAM_SPEED_FOV_ADD = 15; // max extra FOV at top speed
const CAM_BOOST_FOV_ADD = 10; // extra FOV during boost

// track generation
const TRACK_WIDTH = 18;
const WALL_HEIGHT = 2.5;

// power-ups
const POWERUP_INTERVAL = 40;
const POWERUP_FLOAT_HEIGHT = 1.5;

// slipstream
const SLIPSTREAM_DIST = 12;
const SLIPSTREAM_ANGLE = 0.4; // radians cone behind leader
const SLIPSTREAM_BONUS = 4;

// start boost
const START_BOOST_WINDOW = 0.3; // seconds after GO to press W for perfect start
const START_BOOST_SPEED = 15;

// colors
const COL_GOLD = 0xdaa520;
const COL_DARK = 0x0a0a14;

// weather
type Weather = "clear" | "rain" | "night" | "fog" | "storm";
const WEATHER_TYPES: Weather[] = ["clear", "rain", "night", "fog", "storm"];
const WEATHER_LABELS: Record<Weather, string> = {
  clear: "CLEAR", rain: "RAIN", night: "NIGHT", fog: "DENSE FOG", storm: "THUNDERSTORM",
};
const WEATHER_GRIP: Record<Weather, number> = {
  clear: 1.0, rain: 0.78, night: 0.92, fog: 0.88, storm: 0.7,
};
const WEATHER_VIS: Record<Weather, [number, number]> = { // [fogNear, fogFar]
  clear: [30, 180], rain: [15, 90], night: [20, 100], fog: [5, 40], storm: [10, 60],
};

// damage
const DAMAGE_MAX = 100;
const WALL_DAMAGE = 8;
const COLLISION_DAMAGE = 8;
const DAMAGE_SPEED_PENALTY = 0.25; // 25% speed loss at max damage

// ghost
const GHOST_SAMPLE_RATE = 0.1;

// jump ramps
const RAMP_LAUNCH_SPEED = 14;
const RAMP_AIRTIME_GRAVITY = 18;

// pit stop
const PIT_REPAIR_RATE = 60; // damage repaired per second
const PIT_SPEED_LIMIT = 15;

// AI personalities
type AIPersonality = "aggressive" | "defensive" | "speedster" | "tactical" | "balanced";
const AI_PERSONALITIES: AIPersonality[] = ["aggressive", "defensive", "speedster", "tactical", "balanced", "aggressive", "speedster"];

// chariot colors (player selection)
const CHARIOT_COLORS = [
  { name: "ROYAL GOLD", color: 0xdaa520 },
  { name: "CRIMSON",    color: 0xcc2222 },
  { name: "MIDNIGHT",   color: 0x2244aa },
  { name: "EMERALD",    color: 0x228844 },
  { name: "IVORY",      color: 0xddccaa },
  { name: "SHADOW",     color: 0x333344 },
  { name: "PHOENIX",    color: 0xff6600 },
  { name: "AMETHYST",   color: 0x8844cc },
];

// difficulty
const DIFFICULTY_SETTINGS = {
  easy:   { aiSpeedRange: [0.72, 0.85], rubberBand: 3.0, label: "SQUIRE" },
  medium: { aiSpeedRange: [0.85, 0.95], rubberBand: 2.0, label: "KNIGHT" },
  hard:   { aiSpeedRange: [0.93, 1.02], rubberBand: 0.5, label: "LEGEND" },
} as const;
type Difficulty = keyof typeof DIFFICULTY_SETTINGS;

// ─── types ───────────────────────────────────────────────────────────────────

type Phase = "title" | "flyover" | "countdown" | "racing" | "finish" | "results" | "paused";
type PowerUpType = "boost" | "shield" | "lightning" | "oil";

interface TrackPoint {
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  right: THREE.Vector3;
  bank: number;
  width: number;
}

interface TrackDef {
  name: string;
  points: TrackPoint[];
  totalLength: number;
  sceneryColor: number;
  groundColor: number;
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  ambientColor: number;
  sunColor: number;
  sunDir: THREE.Vector3;
  desc: string;
}

interface Racer {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  speed: number;
  steer: number;
  angle: number;
  trackProgress: number;
  lap: number;
  lapTimes: number[];
  finished: boolean;
  finishTime: number;
  drifting: boolean;
  driftTimer: number;
  driftBoostTimer: number;
  shieldTimer: number;
  shieldMesh: THREE.Mesh | null;
  boostTimer: number;
  slowTimer: number;
  whipTimer: number;
  whipCooldown: number;
  powerUp: PowerUpType | null;
  isPlayer: boolean;
  name: string;
  color: number;
  placement: number;
  nameTag: THREE.Sprite | null;
  // AI
  aiSteerNoise: number;
  aiSpeedFactor: number;
  aiReactionDelay: number;
  aiPersonality: AIPersonality;
  aiRamCooldown: number;
  slipstreaming: boolean;
  damage: number;
  airborne: boolean;
  airVelocityY: number;
  inPit: boolean;
  wallHitCooldown: number;
  collisionCooldown: number;
  // stat tracking
  topSpeed: number;
  powerUpsUsed: number;
  // animation
  horsePhase: number;
  lastTrackIdx: number;
}

interface PowerUpPickup {
  mesh: THREE.Mesh;
  type: PowerUpType;
  trackDist: number;
  collected: boolean;
  respawnTimer: number;
}

interface GhostFrame {
  x: number; z: number; y: number; angle: number;
}

interface Achievement {
  id: string;
  name: string;
  desc: string;
  check: (g: ChariotGame) => boolean;
}

interface OilSlick {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  life: number;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

// ─── track definitions ───────────────────────────────────────────────────────

const TRACK_DEFS: {
  name: string;
  desc: string;
  seed: number;
  curves: number;
  hills: number;
  length: number;
  sceneryColor: number;
  groundColor: number;
  skyColor: number;
  fogColor: number;
  ambientColor: number;
  sunColor: number;
  sunDir: [number, number, number];
  hazardColor: number;
  specialScenery: string;
}[] = [
  {
    name: "CAMELOT CIRCUIT",
    desc: "Castle streets & cobblestone — the classic",
    seed: 42, curves: 8, hills: 0.3, length: 220,
    sceneryColor: 0x556644, groundColor: 0x887766,
    skyColor: 0x5588cc, fogColor: 0x5588cc,
    ambientColor: 0x445566, sunColor: 0xffeedd, sunDir: [1, 2, 0.5],
    hazardColor: 0x998877, specialScenery: "castle",
  },
  {
    name: "ENCHANTED FOREST",
    desc: "Twisting paths through Merlin's woods",
    seed: 137, curves: 10, hills: 0.4, length: 260,
    sceneryColor: 0x224422, groundColor: 0x3a5530,
    skyColor: 0x223322, fogColor: 0x1a2a1a,
    ambientColor: 0x223322, sunColor: 0x88cc88, sunDir: [0.5, 1, -0.3],
    hazardColor: 0x225522, specialScenery: "forest",
  },
  {
    name: "CLIFFSIDE PASS",
    desc: "Mountain edges above the clouds",
    seed: 256, curves: 9, hills: 0.7, length: 240,
    sceneryColor: 0x887766, groundColor: 0x776655,
    skyColor: 0x88aacc, fogColor: 0xccddee,
    ambientColor: 0x667788, sunColor: 0xffffff, sunDir: [0, 2, 1],
    hazardColor: 0xaabbcc, specialScenery: "mountain",
  },
  {
    name: "AVALON SHORES",
    desc: "Misty beaches of the sacred isle",
    seed: 404, curves: 10, hills: 0.2, length: 200,
    sceneryColor: 0xccbb88, groundColor: 0xddcc99,
    skyColor: 0x99aabb, fogColor: 0xaabbcc,
    ambientColor: 0x778899, sunColor: 0xffeebb, sunDir: [-1, 1.5, 0],
    hazardColor: 0x4477aa, specialScenery: "shore",
  },
  {
    name: "DRAGON'S MAW",
    desc: "Volcanic canyons of fire and shadow",
    seed: 666, curves: 10, hills: 0.6, length: 280,
    sceneryColor: 0x331111, groundColor: 0x442211,
    skyColor: 0x220808, fogColor: 0x331111,
    ambientColor: 0x441111, sunColor: 0xff6622, sunDir: [0, 1, -1],
    hazardColor: 0xff4400, specialScenery: "volcanic",
  },
];

const AI_NAMES = [
  "Sir Galahad", "Sir Percival", "Sir Bors", "Sir Tristan",
  "Lady Elaine", "Sir Gareth", "Sir Kay",
];
const AI_COLORS = [0xcc3333, 0x33cc33, 0x3333cc, 0xcccc33, 0xcc33cc, 0x33cccc, 0xff8800];

const AI_TITLES = [
  "The Purest Knight", "Seeker of the Grail", "The Steadfast", "Champion of Cornwall",
  "Lady of Astolat", "The Gentle Knight", "The Seneschal",
];
const AI_TAUNTS = [
  ["Your chariot shall eat my dust!", "Purity is my fuel!", "None shall outpace the Grail's chosen!"],
  ["The Grail guides my reins!", "Catch me if ye can!", "My quest never ends!"],
  ["Steady and strong wins the race!", "I'll outlast you all!", "No wall shall stop me!"],
  ["Cornwall breeds the fastest steeds!", "Watch and weep!", "I ride like the wind!"],
  ["Grace and speed, Sir Knight!", "Underestimate me at your peril!", "The lady takes the lead!"],
  ["A gentle overtake, pardon me!", "Slow and steady? Not today!", "Gareth rides!"],
  ["The King's steward always wins!", "Order on the track!", "Make way for the Seneschal!"],
];
const AI_DEFEAT_QUOTES = [
  "The purest knight... humbled.", "A noble race, champion.", "I shall pray for swifter steeds.",
  "Cornwall demands a rematch!", "Well raced, champion.", "Gareth bows to the victor.",
  "The Seneschal concedes... this time.",
];

// career stats
const LS_CAREER = "chariot_career";

interface CareerStats {
  totalRaces: number;
  wins: number;
  podiums: number;
  totalDriftTime: number;
  totalOvertakes: number;
  tournamentsWon: number;
}

function loadCareerStats(): CareerStats {
  try {
    return { totalRaces: 0, wins: 0, podiums: 0, totalDriftTime: 0, totalOvertakes: 0, tournamentsWon: 0,
      ...JSON.parse(localStorage.getItem(LS_CAREER) || "{}") };
  } catch { return { totalRaces: 0, wins: 0, podiums: 0, totalDriftTime: 0, totalOvertakes: 0, tournamentsWon: 0 }; }
}

function saveCareerStats(s: CareerStats): void {
  localStorage.setItem(LS_CAREER, JSON.stringify(s));
}

const POWERUP_TYPES: PowerUpType[] = ["boost", "shield", "lightning", "oil"];
const POWERUP_COLORS: Record<PowerUpType, number> = {
  boost: 0xff8800, shield: 0x4488ff, lightning: 0xffff00, oil: 0x444444,
};
const POWERUP_NAMES: Record<PowerUpType, string> = {
  boost: "MERLIN'S HASTE", shield: "HOLY SHIELD", lightning: "THUNDER BOLT", oil: "GREEK FIRE",
};

// ─── seeded RNG ──────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_KEY = "chariot_best_times";

function loadBestTimes(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch { return {}; }
}

function saveBestTime(trackName: string, time: number): boolean {
  const bests = loadBestTimes();
  if (!bests[trackName] || time < bests[trackName]) {
    bests[trackName] = time;
    localStorage.setItem(LS_KEY, JSON.stringify(bests));
    return true;
  }
  return false;
}

// ─── track generation ────────────────────────────────────────────────────────

function generateTrack(def: (typeof TRACK_DEFS)[number]): TrackDef {
  const rng = mulberry32(def.seed);

  // Use fewer coarse control points for the base shape to avoid zigzag.
  // The curves param controls how many gentle bends exist, not noise per point.
  const coarseCount = 16 + Math.floor(def.curves * 0.8); // 24-30 control points
  const coarsePts: THREE.Vector3[] = [];
  const coarseAngleStep = (Math.PI * 2) / coarseCount;

  for (let i = 0; i < coarseCount; i++) {
    const baseAngle = coarseAngleStep * i;
    // Smooth radius variation using low-frequency sine waves instead of per-point noise
    const radiusNoise = Math.sin(baseAngle * 2 + rng() * Math.PI * 2) * 15
                      + Math.sin(baseAngle * 3 + rng() * Math.PI * 2) * 10
                      + (rng() - 0.5) * def.curves * 0.8;
    const radius = 80 + radiusNoise;
    const x = Math.cos(baseAngle) * radius;
    const z = Math.sin(baseAngle) * radius;
    const y = Math.sin(baseAngle * 3 + rng() * 2) * def.hills * 8 + rng() * def.hills * 4;
    coarsePts.push(new THREE.Vector3(x, Math.max(0, y), z));
  }

  // Catmull-Rom subdivision: interpolate coarse points into the target segment count
  const targetCount = def.length;
  const subsPerSeg = Math.ceil(targetCount / coarseCount);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < coarsePts.length; i++) {
    const p0 = coarsePts[(i - 1 + coarsePts.length) % coarsePts.length];
    const p1 = coarsePts[i];
    const p2 = coarsePts[(i + 1) % coarsePts.length];
    const p3 = coarsePts[(i + 2) % coarsePts.length];

    for (let t = 0; t < subsPerSeg; t++) {
      const f = t / subsPerSeg;
      const tt = f * f;
      const ttt = tt * f;
      const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * f + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt);
      const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * f + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt);
      const z = 0.5 * (2 * p1.z + (-p0.z + p2.z) * f + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * tt + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * ttt);
      pts.push(new THREE.Vector3(x, Math.max(0, y), z));
    }
  }

  // Multiple smoothing passes with wider kernel to eliminate sharp corners
  let smoothInput = pts;
  for (let pass = 0; pass < 5; pass++) {
    const smoothOutput: THREE.Vector3[] = [];
    const n = smoothInput.length;
    for (let i = 0; i < n; i++) {
      const p2 = smoothInput[(i - 2 + n) % n];
      const p1 = smoothInput[(i - 1 + n) % n];
      const c  = smoothInput[i];
      const n1 = smoothInput[(i + 1) % n];
      const n2 = smoothInput[(i + 2) % n];
      // Gaussian-like kernel: [1, 2, 4, 2, 1] / 10
      smoothOutput.push(new THREE.Vector3(
        (p2.x + p1.x * 2 + c.x * 4 + n1.x * 2 + n2.x) / 10,
        Math.max(0, (p2.y + p1.y * 2 + c.y * 4 + n1.y * 2 + n2.y) / 10),
        (p2.z + p1.z * 2 + c.z * 4 + n1.z * 2 + n2.z) / 10,
      ));
    }
    smoothInput = smoothOutput;
  }
  const smoothed = smoothInput;

  const trackPoints: TrackPoint[] = [];
  let totalLength = 0;
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < smoothed.length; i++) {
    const curr = smoothed[i];
    const next = smoothed[(i + 1) % smoothed.length];
    const prev = smoothed[(i - 1 + smoothed.length) % smoothed.length];
    const dir = new THREE.Vector3().subVectors(next, curr).normalize();
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const prevDir = new THREE.Vector3().subVectors(curr, prev).normalize();
    const curvature = dir.x * prevDir.z - dir.z * prevDir.x;
    const bank = curvature * 15;

    trackPoints.push({
      pos: curr.clone(), dir: dir.clone(), right: right.clone(), bank,
      width: TRACK_WIDTH + (rng() - 0.5) * 2,
    });
    if (i > 0) totalLength += curr.distanceTo(prev);
  }
  totalLength += smoothed[smoothed.length - 1].distanceTo(smoothed[0]);

  return {
    name: def.name, desc: def.desc, points: trackPoints, totalLength,
    sceneryColor: def.sceneryColor, groundColor: def.groundColor,
    skyColor: def.skyColor, fogColor: def.fogColor, fogNear: 30, fogFar: 180,
    ambientColor: def.ambientColor, sunColor: def.sunColor,
    sunDir: new THREE.Vector3(...def.sunDir).normalize(),
  };
}

// ─── chariot mesh builder ────────────────────────────────────────────────────

function buildChariotMesh(color: number, isPlayer: boolean): THREE.Group {
  const g = new THREE.Group();

  // ── Materials ──
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.75, metalness: 0.05 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8, metalness: 0.05 });
  const woodPlanks = new THREE.MeshStandardMaterial({ color: 0x705530, roughness: 0.7, metalness: 0.05 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.25, metalness: 0.8 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.75 });
  const teamMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.35 });
  const teamGlow = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.35, metalness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.25, metalness: 0.8, emissive: 0x442200, emissiveIntensity: 0.1 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85, metalness: 0 });

  // ── Chariot body: planked floor with bevelled edges ──
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 2.8, 4, 1, 6), woodMat);
  floor.position.set(0, 0.45, 0); floor.castShadow = true; g.add(floor);
  // Plank lines on floor
  for (let pz = -1.2; pz <= 1.2; pz += 0.4) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.02, 0.02), woodDark);
    plank.position.set(0, 0.52, pz); g.add(plank);
  }

  // Side walls: shaped panels with reinforcement strips
  for (const sx of [-0.8, 0.8]) {
    // Main wall panel
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 2.8, 1, 2, 6), woodPlanks);
    wall.position.set(sx, 0.82, 0); wall.castShadow = true; g.add(wall);
    // Team color trim along top
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 2.8), teamGlow);
    trim.position.set(sx, 1.13, 0); g.add(trim);
    // Metal reinforcement bands
    for (const bz of [-0.9, 0, 0.9]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.04), metalDark);
      band.position.set(sx, 0.82, bz); g.add(band);
    }
    // Corner posts (vertical pillars at front/back of walls)
    for (const pz of [-1.35, 1.35]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8), metalDark);
      post.position.set(sx, 0.86, pz); g.add(post);
      // Gold cap on post
      const postCap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), goldMat);
      postCap.position.set(sx, 1.22, pz); g.add(postCap);
    }
  }

  // Front shield: curved with more segments
  const frontGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.9, 24, 2, false, -0.7, 1.4);
  const frontMesh = new THREE.Mesh(frontGeo, teamMat);
  frontMesh.rotation.z = Math.PI / 2; frontMesh.rotation.y = Math.PI / 2;
  frontMesh.position.set(0, 0.88, -1.4); frontMesh.castShadow = true; g.add(frontMesh);
  // Decorative metal rim on front shield
  const frontRimGeo = new THREE.TorusGeometry(1.3, 0.03, 8, 24, 1.4);
  const frontRim = new THREE.Mesh(frontRimGeo, goldMat);
  frontRim.rotation.z = Math.PI / 2; frontRim.rotation.y = Math.PI / 2;
  frontRim.position.set(0, 0.88, -1.43); g.add(frontRim);

  // Emblem circle on front shield (larger, with ring)
  const emblemRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.28, 24), goldMat);
  emblemRing.position.set(0, 0.92, -1.62); emblemRing.rotation.y = Math.PI; g.add(emblemRing);
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.15 }));
  emblem.position.set(0, 0.92, -1.61); emblem.rotation.y = Math.PI; g.add(emblem);

  // Back rail with curve
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.08, 4, 2, 1), woodDark);
  backRail.position.set(0, 0.75, 1.4); g.add(backRail);
  // Back rail metal trim
  const backTrim = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.04, 0.1), goldMat);
  backTrim.position.set(0, 0.96, 1.4); g.add(backTrim);

  // ── Wheels: higher-poly rims with 8 spokes and iron tire ──
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.45, metalness: 0.45 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.6 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.25, metalness: 0.65 });

  for (const [wx, wy, wz] of [[-1.0, 0.38, -0.9], [1.0, 0.38, -0.9], [-1.0, 0.38, 0.9], [1.0, 0.38, 0.9]] as [number, number, number][]) {
    // Iron tire (outer ring)
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.04, 12, 32), tireMat);
    tire.name = "wheel"; tire.position.set(wx, wy, wz); tire.rotation.y = Math.PI / 2; tire.castShadow = true; g.add(tire);
    // Wooden rim inside tire
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 10, 28), rimMat);
    rim.position.set(wx, wy, wz); rim.rotation.y = Math.PI / 2; g.add(rim);
    // Hub (larger, more detailed)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12), hubMat);
    hub.position.set(wx, wy, wz); hub.rotation.x = Math.PI / 2; g.add(hub);
    // 8 spokes
    for (let s = 0; s < 8; s++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.28, 12), rimMat);
      const a = (s / 8) * Math.PI * 2;
      spoke.position.set(wx, wy + Math.sin(a) * 0.18, wz + Math.cos(a) * 0.18);
      spoke.rotation.x = a;
      g.add(spoke);
    }
    // Decorative axle cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), goldMat);
    cap.position.set(wx + (wx > 0 ? 0.12 : -0.12), wy, wz); g.add(cap);
    // Axle shaft
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), metalDark);
    axle.position.set(wx + (wx > 0 ? 0.05 : -0.05), wy, wz); axle.rotation.z = Math.PI / 2; g.add(axle);
  }

  // ── Horses: higher-poly organic shapes ──
  const horseMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.65, metalness: 0 });
  const horseLightMat = new THREE.MeshStandardMaterial({ color: 0x997755, roughness: 0.65, metalness: 0 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.45, metalness: 0.1 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x775544, roughness: 0.65 });

  for (let h = 0; h < 2; h++) {
    const hg = new THREE.Group(); hg.name = `horse_${h}`;

    // Body: barrel chest (smooth ellipsoid)
    const bodyGeo = new THREE.SphereGeometry(0.55, 16, 12);
    bodyGeo.scale(0.6, 0.55, 1.3);
    const hBodyMesh = new THREE.Mesh(bodyGeo, horseMat);
    hBodyMesh.position.set(0, 0.7, 0); hBodyMesh.castShadow = true; hg.add(hBodyMesh);
    // Belly underside (slightly lighter)
    const bellyGeo = new THREE.SphereGeometry(0.45, 12, 8);
    bellyGeo.scale(0.5, 0.3, 1.1);
    const belly = new THREE.Mesh(bellyGeo, horseLightMat);
    belly.position.set(0, 0.5, 0); hg.add(belly);

    // Haunches (rear muscle mass)
    const haunchGeo = new THREE.SphereGeometry(0.35, 12, 10);
    haunchGeo.scale(0.7, 0.65, 0.6);
    const haunch = new THREE.Mesh(haunchGeo, horseMat);
    haunch.position.set(0, 0.72, 0.5); hg.add(haunch);

    // Chest (front muscle mass)
    const chestGeo = new THREE.SphereGeometry(0.3, 12, 10);
    chestGeo.scale(0.65, 0.7, 0.5);
    const chest = new THREE.Mesh(chestGeo, horseMat);
    chest.position.set(0, 0.78, -0.5); hg.add(chest);

    // Neck: tapered with more segments
    const neckGeo = new THREE.CylinderGeometry(0.13, 0.22, 0.75, 12, 8);
    const neck = new THREE.Mesh(neckGeo, horseLightMat);
    neck.name = "neck"; neck.position.set(0, 1.05, -0.7); neck.rotation.x = -0.5; neck.castShadow = true; hg.add(neck);

    // Head: elongated with jaw shape
    const headGeo = new THREE.SphereGeometry(0.2, 12, 10);
    headGeo.scale(0.7, 0.65, 1.4);
    const head = new THREE.Mesh(headGeo, horseLightMat);
    head.name = "head"; head.position.set(0, 1.28, -1.1); head.rotation.x = -0.15; head.castShadow = true; hg.add(head);
    // Snout/muzzle
    const snoutGeo = new THREE.SphereGeometry(0.12, 16, 12);
    snoutGeo.scale(0.8, 0.6, 1.0);
    const snout = new THREE.Mesh(snoutGeo, new THREE.MeshStandardMaterial({ color: 0xaa9977, roughness: 0.6 }));
    snout.position.set(0, 1.22, -1.35); hg.add(snout);
    // Nostrils
    for (const nx of [-0.05, 0.05]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), new THREE.MeshStandardMaterial({ color: 0x443322 }));
      nostril.position.set(nx, 1.2, -1.42); hg.add(nostril);
    }
    // Eyes
    for (const ex of [-0.1, 0.1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.2, metalness: 0.3 }));
      eye.position.set(ex, 1.32, -1.15); hg.add(eye);
    }

    // Ears (two curved cones)
    for (const ex of [-0.08, 0.08]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 8), horseLightMat);
      ear.position.set(ex, 1.42, -0.98); ear.rotation.x = -0.3; hg.add(ear);
    }

    // Mane: multiple ridges along neck
    const maneColor = isPlayer ? 0x443322 : new THREE.Color(color).lerp(new THREE.Color(0x443322), 0.6).getHex();
    const maneMat = new THREE.MeshStandardMaterial({ color: maneColor, roughness: 0.85 });
    for (let mi = 0; mi < 5; mi++) {
      const maneSegGeo = new THREE.BoxGeometry(0.035, 0.12 + mi * 0.02, 0.14);
      const maneSeg = new THREE.Mesh(maneSegGeo, maneMat);
      maneSeg.position.set(0, 1.18 - mi * 0.03, -0.2 - mi * 0.15);
      maneSeg.rotation.x = -0.3; hg.add(maneSeg);
    }

    // Saddle blanket (team colored, shaped)
    const saddleColor = isPlayer ? color : new THREE.Color(color).lerp(new THREE.Color(0x444444), 0.3).getHex();
    const saddleMat = new THREE.MeshStandardMaterial({ color: saddleColor, roughness: 0.55 });
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.55, 2, 1, 2), saddleMat);
    saddle.position.set(0, 1.02, 0.1); hg.add(saddle);
    // Saddle edge trim
    const saddleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.02, 0.02), goldMat);
    saddleTrim.position.set(0, 1.04, -0.17); hg.add(saddleTrim);

    // Tail: multi-segment flowing
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x554422, roughness: 0.8 });
    for (let ti = 0; ti < 3; ti++) {
      const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.01 + (2 - ti) * 0.012, 0.015 + (2 - ti) * 0.015, 0.25, 6), tailMat);
      tailSeg.name = ti === 0 ? "tail" : "";
      tailSeg.position.set(0, 0.85 - ti * 0.08, 0.85 + ti * 0.2);
      tailSeg.rotation.x = 0.5 + ti * 0.15; hg.add(tailSeg);
    }

    // Legs: upper + lower segments with knee joint
    const legPositions = [[-0.2, 0, -0.45], [0.2, 0, -0.45], [-0.2, 0, 0.45], [0.2, 0, 0.45]];
    for (let li = 0; li < 4; li++) {
      const lp = legPositions[li];
      // Upper leg (thicker)
      const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.35, 8), legMat);
      upperLeg.name = `leg_${li}`;
      upperLeg.position.set(lp[0], 0.35 + lp[1], lp[2]); upperLeg.castShadow = true; hg.add(upperLeg);
      // Knee joint
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), legMat);
      knee.position.set(lp[0], 0.18 + lp[1], lp[2]); hg.add(knee);
      // Lower leg (thinner)
      const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 8), legMat);
      lowerLeg.position.set(lp[0], 0.03 + lp[1], lp[2]); lowerLeg.castShadow = true; hg.add(lowerLeg);
      // Hoof (wider, shaped)
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.07, 10), hoofMat);
      hoof.position.set(lp[0], -0.12 + lp[1], lp[2]); hg.add(hoof);
    }

    // Bridle/harness on head
    const bridleMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.6, metalness: 0.1 });
    const noseband = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 12, 16), bridleMat);
    noseband.position.set(0, 1.25, -1.2); noseband.rotation.y = Math.PI / 2; hg.add(noseband);
    // Bit ring
    const bitRing = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 12, 12), metalMat);
    bitRing.position.set(0.12, 1.2, -1.2); hg.add(bitRing);

    // Reins (to chariot)
    const reinMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.7 });
    const rein = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.2, 12), reinMat);
    rein.position.set(0, 0.92, 1.0); rein.rotation.x = Math.PI / 2; hg.add(rein);

    hg.position.set(h === 0 ? -0.7 : 0.7, 0, -3.2); g.add(hg);
  }

  // ── Yoke & harness connecting horses to chariot ──
  const yokeMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.7, metalness: 0.1 });
  // Central pole (tongue)
  const tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 8), yokeMat);
  tongue.position.set(0, 0.55, -1.6); tongue.rotation.x = Math.PI / 2; g.add(tongue);
  // Cross yoke bar
  const yokeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), yokeMat);
  yokeBar.position.set(0, 0.6, -3.1); yokeBar.rotation.z = Math.PI / 2; g.add(yokeBar);
  // Yoke pads on each horse
  for (const yx of [-0.7, 0.7]) {
    const yokePad = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 16, Math.PI), leatherMat);
    yokePad.position.set(yx, 0.72, -3.1); yokePad.rotation.y = Math.PI / 2; g.add(yokePad);
  }
  // Metal fittings on yoke
  for (const fx of [-0.9, 0, 0.9]) {
    const fitting = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10), metalDark);
    fitting.position.set(fx, 0.6, -3.1); fitting.rotation.z = Math.PI / 2; g.add(fitting);
  }

  // ── Decorative shields on chariot sides ──
  for (const sx of [-0.86, 0.86]) {
    const shieldBack = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), woodDark);
    shieldBack.position.set(sx, 0.85, 0); shieldBack.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(shieldBack);
    const shieldFace = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), teamMat);
    shieldFace.position.set(sx > 0 ? sx + 0.01 : sx - 0.01, 0.85, 0); shieldFace.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(shieldFace);
    const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), goldMat);
    shieldBoss.position.set(sx > 0 ? sx + 0.02 : sx - 0.02, 0.85, 0); g.add(shieldBoss);
    const shieldRim = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.22, 16), metalDark);
    shieldRim.position.set(sx > 0 ? sx + 0.015 : sx - 0.015, 0.85, 0); shieldRim.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(shieldRim);
  }

  // ── Lantern hooks on front posts ──
  for (const lx of [-0.8, 0.8]) {
    // Hook arm
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 12), metalDark);
    hook.position.set(lx, 1.25, -1.3); hook.rotation.z = lx > 0 ? -0.4 : 0.4; g.add(hook);
    // Lantern cage
    const lanternCage = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 8, 1, true), metalDark);
    lanternCage.position.set(lx + (lx > 0 ? 0.08 : -0.08), 1.15, -1.3); g.add(lanternCage);
    // Lantern glow
    const lanternGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff8811, emissiveIntensity: 0.8 }),
    );
    lanternGlow.position.set(lx + (lx > 0 ? 0.08 : -0.08), 1.15, -1.3); g.add(lanternGlow);
  }

  // ── Rider: fully armored knight ──
  const armorColor = isPlayer ? color : new THREE.Color(color).lerp(new THREE.Color(0x444444), 0.2).getHex();
  const armorMat = new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.35, metalness: 0.55 });
  const chainmailMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.7 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xddbb88, roughness: 0.6 });

  // Torso: shaped breastplate
  const torsoGeo = new THREE.BoxGeometry(0.48, 0.65, 0.38, 3, 3, 2);
  const torso = new THREE.Mesh(torsoGeo, armorMat);
  torso.position.set(0, 1.2, 0.3); torso.castShadow = true; g.add(torso);
  // Chest plate ridge
  const chestRidge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.02), metalDark);
  chestRidge.position.set(0, 1.25, 0.11); g.add(chestRidge);
  // Belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.4), leatherMat);
  belt.position.set(0, 0.92, 0.3); g.add(belt);
  // Belt buckle
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), goldMat);
  buckle.position.set(0, 0.92, 0.1); g.add(buckle);

  // Shoulders: pauldrons
  for (const sx of [-0.3, 0.3]) {
    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), armorMat);
    pauldron.position.set(sx, 1.5, 0.3); pauldron.castShadow = true; g.add(pauldron);
    // Pauldron edge trim
    const pauldronTrim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 12, 16, Math.PI), goldMat);
    pauldronTrim.position.set(sx, 1.44, 0.3); pauldronTrim.rotation.x = Math.PI / 2; pauldronTrim.rotation.z = sx > 0 ? 0.3 : -0.3; g.add(pauldronTrim);
  }

  // Arms
  for (const sx of [-0.32, 0.32]) {
    // Upper arm
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 8), chainmailMat);
    upperArm.position.set(sx, 1.3, 0.3); g.add(upperArm);
    // Elbow
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), armorMat);
    elbow.position.set(sx, 1.14, 0.3); g.add(elbow);
    // Forearm (reaching forward for reins)
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.35, 8), chainmailMat);
    forearm.position.set(sx, 1.1, 0.1); forearm.rotation.x = -0.8; g.add(forearm);
    // Gauntlet
    const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.12, 2, 1, 2), armorMat);
    gauntlet.position.set(sx, 1.0, -0.1); g.add(gauntlet);
  }

  // Legs (standing in chariot)
  for (const sx of [-0.12, 0.12]) {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.35, 8), armorMat);
    thigh.position.set(sx, 0.72, 0.3); g.add(thigh);
    const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 8), armorMat);
    greave.position.set(sx, 0.42, 0.3); g.add(greave);
    // Knee cop
    const kneeCop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), goldMat);
    kneeCop.position.set(sx, 0.57, 0.2); g.add(kneeCop);
  }

  // Head
  const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), skinMat);
  riderHead.position.set(0, 1.72, 0.3); riderHead.castShadow = true; g.add(riderHead);

  // Helmet: great helm with crest
  const helmetColor = isPlayer ? COL_GOLD : new THREE.Color(color).lerp(new THREE.Color(0x888888), 0.3).getHex();
  const helmetMat = new THREE.MeshStandardMaterial({ color: helmetColor, roughness: 0.2, metalness: 0.85 });
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), helmetMat);
  helmet.position.set(0, 1.78, 0.3); helmet.castShadow = true; g.add(helmet);
  // Helmet face guard
  const faceGuard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.08, 3, 2, 1), helmetMat);
  faceGuard.position.set(0, 1.7, 0.1); g.add(faceGuard);
  // Visor slit
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.09), new THREE.MeshBasicMaterial({ color: 0x080808 }));
  visor.position.set(0, 1.72, 0.08); g.add(visor);
  // Breathing holes
  for (let bh = 0; bh < 3; bh++) {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.01, 6), new THREE.MeshBasicMaterial({ color: 0x080808 }));
    hole.position.set(-0.06 + bh * 0.06, 1.66, 0.06); g.add(hole);
  }
  // Helmet crest (plume)
  const crestColor = isPlayer ? color : new THREE.Color(color).getHex();
  const crestMat = new THREE.MeshStandardMaterial({ color: crestColor, roughness: 0.7 });
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.3, 1, 2, 4), crestMat);
  crest.position.set(0, 1.95, 0.3); g.add(crest);
  // Crest flowing back
  const crestTail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.2), crestMat);
  crestTail.position.set(0, 1.88, 0.52); crestTail.rotation.x = 0.3; g.add(crestTail);

  // Cape (team color, wider with more segments for better flow)
  const capeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0, side: THREE.DoubleSide });
  const capeGeo = new THREE.PlaneGeometry(0.55, 0.8, 3, 6);
  const cape = new THREE.Mesh(capeGeo, capeMat);
  cape.name = "cape"; cape.position.set(0, 1.25, 0.72); cape.rotation.x = 0.25; g.add(cape);
  // Cape clasp at neck
  const capeClasp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), goldMat);
  capeClasp.position.set(0, 1.55, 0.5); g.add(capeClasp);

  // Whip arm
  const whipArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.7 }));
  whipArm.name = "whip"; whipArm.position.set(0.3, 1.5, -0.3); whipArm.rotation.x = Math.PI / 2; whipArm.visible = false; g.add(whipArm);

  return g;
}

// ─── name tag sprite ─────────────────────────────────────────────────────────

function makeNameTag(name: string, color: number): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = `rgba(0,0,0,0.5)`;
  ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
  ctx.fillText(name, 64, 22);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3, 0.8, 1);
  return sprite;
}

// ─── procedural textures ─────────────────────────────────────────────────────

function makeGroundTexture(baseColor: number, size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  const col = new THREE.Color(baseColor);
  const r = Math.floor(col.r * 255), g = Math.floor(col.g * 255), b = Math.floor(col.b * 255);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);
  // noise overlay for terrain grain
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    d[i] = Math.max(0, Math.min(255, d[i] + noise));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
  }
  // subtle grass/dirt patches
  for (let p = 0; p < 40; p++) {
    const px = Math.random() * size, py = Math.random() * size;
    const pr = 5 + Math.random() * 15;
    const variation = (Math.random() - 0.5) * 40;
    ctx.fillStyle = `rgba(${r + variation},${g + variation + 10},${b + variation - 5},0.3)`;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(60, 60);
  return tex;
}

function makeWallTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#555555";
  ctx.fillRect(0, 0, size, size);
  // stone block pattern
  const bw = size / 4, bh = size / 3;
  for (let row = 0; row < 4; row++) {
    const offset = (row % 2) * bw * 0.5;
    for (let col = 0; col < 5; col++) {
      const x = col * bw + offset - bw * 0.5;
      const y = row * bh;
      const shade = 70 + Math.random() * 30;
      ctx.fillStyle = `rgb(${shade},${shade},${shade + 5})`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
  // noise
  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 15;
    imgData.data[i] += n; imgData.data[i + 1] += n; imgData.data[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeCloudTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.clearRect(0, 0, size, size);
  // soft cloud blobs
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 10 + Math.random() * 40;
    const alpha = 0.02 + Math.random() * 0.06;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── main game class ─────────────────────────────────────────────────────────

export class ChariotGame {
  // Three.js
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _canvas!: HTMLCanvasElement;
  private _clock = new THREE.Clock();
  private _animFrame = 0;
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;

  // state
  private _phase: Phase = "title";
  private _dt = 0;
  private _time = 0;
  private _raceTime = 0;
  private _countdownTimer = 0;
  private _flyoverTimer = 0;
  private _flyoverDuration = 4.0;
  private _pausedPhase: Phase = "racing";
  private _difficulty: Difficulty = "medium";

  // juiciness state
  private _timeScale = 1.0;
  private _finishCamSweep = false;
  private _finishCamAngle = 0;
  private _fadeOverlay!: HTMLDivElement;
  private _fadeOpacity = 0;
  private _fadeTarget = 0;
  private _fadeCallback: (() => void) | null = null;
  private _finalLapActive = false;
  private _brakingVisual = false;
  private _finishTimeout: ReturnType<typeof setTimeout> | null = null;
  private _resultsTimeout: ReturnType<typeof setTimeout> | null = null;
  private _lastPlayerPlacement = 0;
  private _posFlashTimer = 0;
  private _pickupFlashTimer = 0;
  private _rearView = false;

  // track
  private _currentTrackIdx = 0;
  private _track!: TrackDef;
  private _trackMesh!: THREE.Group;
  private _trackCumDist: number[] = []; // precomputed cumulative distances

  // racers
  private _racers: Racer[] = [];
  private _player!: Racer;

  // power-ups, hazards
  private _powerUps: PowerUpPickup[] = [];
  private _oilSlicks: OilSlick[] = [];

  // particles
  private _particles: Particle[] = [];

  // camera shake
  private _shakeIntensity = 0;
  private _shakeDecay = 5;

  // speed lines overlay
  private _speedLinesCanvas!: HTMLCanvasElement;
  private _speedLinesCtx!: CanvasRenderingContext2D;

  // wrong-way
  private _wrongWay = false;

  // input
  private _keys = new Set<string>();
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onKeyUp!: (e: KeyboardEvent) => void;
  private _onResize!: () => void;

  // HUD
  private _hud!: HTMLDivElement;
  private _hudPos!: HTMLDivElement;
  private _hudLap!: HTMLDivElement;
  private _hudPowerUp!: HTMLDivElement;
  private _hudTimer!: HTMLDivElement;
  private _hudCenter!: HTMLDivElement;
  private _hudMinimap!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _hudDriftBar!: HTMLDivElement;
  private _hudLeaderboard!: HTMLDivElement;
  private _hudWhipBar!: HTMLDivElement;
  private _hudWrongWay!: HTMLDivElement;
  private _hudLapTimes!: HTMLDivElement;
  private _hudBoostVignette!: HTMLDivElement;

  // tournament
  private _tournamentMode = false;
  private _tournamentScores: { name: string; points: number }[] = [];
  private _tournamentTrackIdx = 0;

  // scenery
  private _sceneryObjects: THREE.Object3D[] = [];

  // lap tracking
  private _lastProgress = new Map<Racer, number>();

  // new best time flag
  private _newBestTime = false;

  // audio
  private _audio = new ChariotAudio();

  // announcer
  private _announcerQueue: { text: string; time: number }[] = [];
  private _announcerTimer = 0;

  // start boost
  private _startBoostAvailable = false;
  private _startBoostUsed = false;
  private _goTime = 0;

  // flame trail pool
  private _flameParticles: Particle[] = [];

  // weather
  private _weather: Weather = "clear";
  private _rainDrops: THREE.Points | null = null;
  private _rainPositions: Float32Array | null = null;

  // ghost replay
  private _ghostFrames: GhostFrame[] = [];
  private _ghostBestFrames: GhostFrame[] | null = null;
  private _ghostMesh: THREE.Group | null = null;
  private _ghostSampleTimer = 0;

  // achievements
  private _achievementsUnlocked: Set<string> = new Set();
  private _achievementPopup: { text: string; timer: number } | null = null;
  private _hudAchievement!: HTMLDivElement;
  private _totalDriftTime = 0;
  private _totalWhips = 0;
  private _wallHits = 0;
  private _overtakeCount = 0;
  private _perfectStartDone = false;

  // position tracking for announcer
  private _lastPlacement = 0;
  private _posChangeTimer = 0;

  // touch controls
  private _touchControls!: HTMLDivElement;
  private _touchState = { left: false, right: false, accel: false, brake: false, drift: false };

  // damage HUD
  private _hudDamage!: HTMLDivElement;

  // pause menu
  private _pauseMenu!: HTMLDivElement;
  private _pauseMenuIdx = 0;

  // tutorial
  private _tutorialShown = false;
  private _tutorialOverlay!: HTMLDivElement;


  // skid marks
  private _skidMarks: THREE.Mesh[] = [];
  private _skidMarkTimer = 0;

  // ramps
  private _rampZones: { pos: THREE.Vector3; dir: THREE.Vector3; trackIdx: number }[] = [];

  // pit stop
  private _pitEntry: { pos: THREE.Vector3; dir: THREE.Vector3 } | null = null;

  // customization
  private _playerColorIdx = 0;

  // reverse mode
  private _reverseMode = false;

  // stats
  private _playerPowerUpsUsed = 0;

  // ── public API ─────────────────────────────────────────────────────────────

  async boot(): Promise<void> {
    this._initThree();
    this._buildHUD();
    this._buildSpeedLines();
    this._bindInput();
    this._audio.init();
    this._showTitle();

    const loop = () => {
      this._animFrame = requestAnimationFrame(loop);
      this._dt = Math.min(this._clock.getDelta(), 0.05);
      this._time += this._dt;
      this._update();
      this._composer.render();
    };
    loop();
  }

  destroy(): void {
    cancelAnimationFrame(this._animFrame);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("resize", this._onResize);
    if (this._hud?.parentNode) this._hud.parentNode.removeChild(this._hud);
    if (this._speedLinesCanvas?.parentNode) this._speedLinesCanvas.parentNode.removeChild(this._speedLinesCanvas);
    if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    this._renderer?.dispose();
    this._audio.destroy();
    this._destroyExtras();
  }

  // ── Three.js init ──────────────────────────────────────────────────────────

  private _initThree(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;";
    document.getElementById("pixi-container")!.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true });
    this._renderer.setSize(w, h);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 0.8;

    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(CAM_BASE_FOV, w / h, 0.5, 300);

    // post-processing: bloom makes emissive materials glow
    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this._scene, this._camera));
    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h), 0.5, 0.3, 0.8 // strength, radius, threshold
    );
    this._composer.addPass(this._bloomPass);
    this._composer.addPass(new OutputPass());
  }

  // ── speed lines overlay ────────────────────────────────────────────────────

  private _buildSpeedLines(): void {
    this._speedLinesCanvas = document.createElement("canvas");
    this._speedLinesCanvas.width = window.innerWidth;
    this._speedLinesCanvas.height = window.innerHeight;
    this._speedLinesCanvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;opacity:0;transition:opacity 0.2s;";
    document.getElementById("pixi-container")!.appendChild(this._speedLinesCanvas);
    this._speedLinesCtx = this._speedLinesCanvas.getContext("2d")!;
  }

  private _updateSpeedLines(): void {
    if (!this._player) return;
    const speedPct = this._player.speed / MAX_SPEED;
    const boosting = this._player.boostTimer > 0 || this._player.driftBoostTimer > 0 || this._player.whipTimer > 0;

    if (speedPct < 0.6 && !boosting) {
      this._speedLinesCanvas.style.opacity = "0";
      return;
    }

    const intensity = boosting ? 0.35 : Math.max(0, (speedPct - 0.6) * 0.6);
    this._speedLinesCanvas.style.opacity = String(intensity);

    const ctx = this._speedLinesCtx;
    const w = this._speedLinesCanvas.width, h = this._speedLinesCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const lineCount = boosting ? 40 : 20;
    ctx.strokeStyle = boosting ? "rgba(255,180,60,0.4)" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = boosting ? 2 : 1;

    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2 + this._time * 2;
      const r1 = 100 + Math.random() * 80;
      const r2 = r1 + 150 + Math.random() * 200;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }
  }

  // ── input ──────────────────────────────────────────────────────────────────

  private _bindInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      this._keys.add(k);

      if (k === "escape") {
        if (this._phase === "title") {
          window.dispatchEvent(new Event("chariotExit"));
          return;
        }
        if (this._phase === "racing" || this._phase === "countdown" || this._phase === "flyover") {
          this._pausedPhase = this._phase;
          this._phase = "paused";
          this._pauseMenuIdx = 0;
          this._showPauseMenu();
        } else if (this._phase === "paused") {
          this._hidePauseMenu();
          this._phase = this._pausedPhase;
          this._updateHUDCenter("");
        } else if (this._phase === "results") {
          window.dispatchEvent(new Event("chariotExit"));
        }
      }

      // pause menu navigation
      if (this._phase === "paused") {
        if (k === "arrowup" || k === "w") {
          this._pauseMenuIdx = Math.max(0, this._pauseMenuIdx - 1);
          this._showPauseMenu();
        }
        if (k === "arrowdown" || k === "s") {
          this._pauseMenuIdx = Math.min(3, this._pauseMenuIdx + 1);
          this._showPauseMenu();
        }
        if (k === "enter" || k === " ") {
          this._executePauseOption();
        }
      }

      // Skip flyover with Enter/Space
      if (this._phase === "flyover" && (k === "enter" || k === " ")) {
        this._flyoverTimer = 0; // will transition to countdown on next frame
      }

      // dismiss tutorial on any key
      if (this._tutorialOverlay.style.display === "block" && (this._phase === "countdown" || this._phase === "flyover")) {
        this._dismissTutorial();
      }

      if (k === "e" && this._phase === "racing") {
        this._usePowerUp();
      }

      if (k === "f" && this._phase === "racing") {
        this._whip();
      }

      if (k === "v" && this._phase === "racing") {
        this._rearView = !this._rearView;
      }

      if (k === "r" && this._phase === "racing") {
        // 180-degree U-turn
        const p = this._racers[0];
        if (p) {
          p.angle += Math.PI;
          p.speed *= 0.3; // lose most speed on a U-turn
        }
      }

      if (k === "m") {
        this._audio.toggleMute();
      }

      // title screen
      if (this._phase === "title") {
        if (k === "enter" || k === " ") {
          if (this._tournamentMode) {
            this._tournamentTrackIdx = 0;
            this._tournamentScores = [];
          }
          const trackToRace = this._tournamentMode ? 0 : this._currentTrackIdx;
          this._fadeToBlack(0.4, () => this._startRace(trackToRace));
        }
        if (k === "arrowleft" || k === "a") {
          this._currentTrackIdx = (this._currentTrackIdx - 1 + TRACK_COUNT) % TRACK_COUNT;
          this._showTitle();
        }
        if (k === "arrowright" || k === "d") {
          this._currentTrackIdx = (this._currentTrackIdx + 1) % TRACK_COUNT;
          this._showTitle();
        }
        if (k === "t") {
          this._tournamentMode = !this._tournamentMode;
          this._showTitle();
        }
        if (k === "1") { this._difficulty = "easy"; this._showTitle(); }
        if (k === "2") { this._difficulty = "medium"; this._showTitle(); }
        if (k === "3") { this._difficulty = "hard"; this._showTitle(); }
        if (k === "w" || k === "arrowup") {
          const idx = WEATHER_TYPES.indexOf(this._weather);
          this._weather = WEATHER_TYPES[(idx + 1) % WEATHER_TYPES.length];
          this._showTitle();
        }
        if (k === "r") { this._reverseMode = !this._reverseMode; this._showTitle(); }
        if (k === "c") {
          this._playerColorIdx = (this._playerColorIdx + 1) % CHARIOT_COLORS.length;
          this._showTitle();
        }
      }

      if (this._phase === "results" && (k === "enter" || k === " ")) {
        if (this._tournamentMode && this._tournamentTrackIdx < TRACK_COUNT - 1) {
          this._tournamentTrackIdx++;
          this._fadeToBlack(0.4, () => this._startRace(this._tournamentTrackIdx));
        } else {
          this._tournamentMode = false;
          this._tournamentScores = [];
          this._tournamentTrackIdx = 0;
          this._fadeToBlack(0.4, () => this._showTitle());
        }
      }
    };

    this._onKeyUp = (e: KeyboardEvent) => { this._keys.delete(e.key.toLowerCase()); };

    this._onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(w, h);
      this._composer.setSize(w, h);
      this._speedLinesCanvas.width = w;
      this._speedLinesCanvas.height = h;
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("resize", this._onResize);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    this._hud = document.createElement("div");
    this._hud.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:11;pointer-events:none;font-family:'Segoe UI',monospace;color:#ddd;";
    document.getElementById("pixi-container")!.appendChild(this._hud);

    this._hud.innerHTML = `
      <div id="ch-pos" style="position:absolute;top:20px;right:30px;font-size:52px;font-weight:bold;color:#daa520;text-shadow:0 2px 12px rgba(218,165,32,0.6);transition:transform 0.15s;"></div>
      <div id="ch-lap" style="position:absolute;top:80px;right:30px;font-size:15px;color:#aaa;letter-spacing:1px;"></div>
      <div id="ch-laptimes" style="position:absolute;top:102px;right:30px;font-size:11px;color:#666;"></div>
      <canvas id="ch-speedo" width="160" height="160" style="position:absolute;bottom:10px;right:15px;"></canvas>
      <div id="ch-powerup" style="position:absolute;bottom:90px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;pointer-events:none;">
        <canvas id="ch-pu-icon" width="44" height="44" style="border-radius:50%;"></canvas>
        <div id="ch-pu-text" style="font-size:13px;color:#ff8800;text-shadow:0 0 10px rgba(255,136,0,0.5);letter-spacing:1px;"></div>
      </div>
      <div id="ch-timer" style="position:absolute;top:20px;left:30px;font-size:16px;color:#777;font-weight:bold;"></div>
      <div id="ch-center" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;text-align:center;color:#daa520;text-shadow:0 0 20px rgba(218,165,32,0.7);white-space:pre-line;pointer-events:auto;line-height:1.5;"></div>
      <canvas id="ch-minimap" width="200" height="200" style="position:absolute;bottom:15px;left:15px;border:1px solid rgba(218,165,32,0.3);border-radius:8px;background:rgba(0,0,0,0.65);"></canvas>
      <div id="ch-drift" style="position:absolute;bottom:60px;left:50%;transform:translateX(-50%);width:140px;height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
        <div id="ch-drift-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#ff4400,#ffaa00,#ffff44);border-radius:4px;transition:width 0.1s;box-shadow:0 0 8px rgba(255,170,0,0.5);"></div>
      </div>
      <div id="ch-whip" style="position:absolute;bottom:45px;left:50%;transform:translateX(-50%);width:80px;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
        <div id="ch-whip-fill" style="height:100%;width:100%;background:linear-gradient(90deg,#aa8844,#daa520);border-radius:3px;"></div>
      </div>
      <div id="ch-leaderboard" style="position:absolute;top:50px;left:30px;font-size:12px;color:#888;line-height:1.7;"></div>
      <div id="ch-wrongway" style="position:absolute;top:35%;left:50%;transform:translateX(-50%);font-size:36px;font-weight:bold;color:#ff2222;text-shadow:0 0 20px rgba(255,0,0,0.6);opacity:0;transition:opacity 0.2s;">WRONG WAY!</div>
      <div id="ch-turn-indicator" style="position:absolute;top:50%;right:30px;transform:translateY(-50%);font-size:48px;color:rgba(218,165,32,0.5);text-shadow:0 0 10px rgba(218,165,32,0.3);opacity:0;transition:opacity 0.3s;pointer-events:none;"></div>
      <div id="ch-vignette" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 0.3s;background:radial-gradient(ellipse at center,transparent 50%,rgba(255,120,0,0.25) 100%);"></div>
      <div id="ch-announcer" style="position:absolute;top:18%;left:50%;transform:translateX(-50%);font-size:20px;font-weight:bold;color:#fff;text-shadow:0 0 15px rgba(255,255,255,0.5),0 2px 4px rgba(0,0,0,0.8);opacity:0;transition:opacity 0.3s;text-align:center;letter-spacing:2px;pointer-events:none;"></div>
      <div id="ch-slipstream" style="position:absolute;bottom:110px;left:50%;transform:translateX(-50%);font-size:11px;color:#66bbff;opacity:0;transition:opacity 0.3s;letter-spacing:1px;">SLIPSTREAM!</div>
      <div id="ch-damage" style="position:absolute;bottom:30px;left:200px;width:100px;">
        <div style="font-size:9px;color:#666;margin-bottom:2px;">CHARIOT</div>
        <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
          <div id="ch-damage-fill" style="height:100%;width:100%;background:linear-gradient(90deg,#44cc44,#aacc44);border-radius:3px;transition:width 0.3s,background 0.3s;"></div>
        </div>
      </div>
      <div id="ch-posflash" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 0.1s;"></div>
      <div id="ch-achievement" style="position:absolute;top:12%;left:50%;transform:translateX(-50%);font-size:14px;color:#ffd700;text-shadow:0 0 12px rgba(255,215,0,0.6);opacity:0;transition:opacity 0.4s;text-align:center;padding:8px 20px;background:rgba(0,0,0,0.6);border:1px solid rgba(255,215,0,0.3);border-radius:6px;pointer-events:none;"></div>
    `;

    // touch controls (hidden by default, shown on touch devices)
    this._touchControls = document.createElement("div");
    this._touchControls.id = "ch-touch";
    this._touchControls.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:12;pointer-events:none;display:none;";
    this._touchControls.innerHTML = `
      <div id="ch-t-left" style="position:absolute;bottom:80px;left:30px;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.2);pointer-events:auto;display:flex;align-items:center;justify-content:center;font-size:24px;color:rgba(255,255,255,0.4);user-select:none;">&#9664;</div>
      <div id="ch-t-right" style="position:absolute;bottom:80px;left:120px;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.2);pointer-events:auto;display:flex;align-items:center;justify-content:center;font-size:24px;color:rgba(255,255,255,0.4);user-select:none;">&#9654;</div>
      <div id="ch-t-accel" style="position:absolute;bottom:80px;right:30px;width:80px;height:80px;border-radius:50%;background:rgba(100,255,100,0.15);border:2px solid rgba(100,255,100,0.3);pointer-events:auto;display:flex;align-items:center;justify-content:center;font-size:10px;color:rgba(255,255,255,0.5);user-select:none;">GO</div>
      <div id="ch-t-brake" style="position:absolute;bottom:80px;right:130px;width:60px;height:60px;border-radius:50%;background:rgba(255,100,100,0.15);border:2px solid rgba(255,100,100,0.3);pointer-events:auto;display:flex;align-items:center;justify-content:center;font-size:9px;color:rgba(255,255,255,0.4);user-select:none;">BRK</div>
      <div id="ch-t-drift" style="position:absolute;bottom:170px;right:80px;width:55px;height:55px;border-radius:50%;background:rgba(255,180,0,0.15);border:2px solid rgba(255,180,0,0.3);pointer-events:auto;display:flex;align-items:center;justify-content:center;font-size:9px;color:rgba(255,255,255,0.4);user-select:none;">DRFT</div>
    `;
    document.getElementById("pixi-container")!.appendChild(this._touchControls);

    this._hudPos = document.getElementById("ch-pos") as HTMLDivElement;
    this._hudLap = document.getElementById("ch-lap") as HTMLDivElement;
    this._speedoCanvas = document.getElementById("ch-speedo") as HTMLCanvasElement;
    this._speedoCtx = this._speedoCanvas.getContext("2d")!;
    this._puIconCanvas = document.getElementById("ch-pu-icon") as HTMLCanvasElement;
    this._puIconCtx = this._puIconCanvas.getContext("2d")!;
    this._puTextEl = document.getElementById("ch-pu-text") as HTMLDivElement;
    this._hudPowerUp = document.getElementById("ch-powerup") as HTMLDivElement;
    this._hudTimer = document.getElementById("ch-timer") as HTMLDivElement;
    this._hudCenter = document.getElementById("ch-center") as HTMLDivElement;
    this._hudMinimap = document.getElementById("ch-minimap") as HTMLCanvasElement;
    this._minimapCtx = this._hudMinimap.getContext("2d")!;
    this._hudDriftBar = document.getElementById("ch-drift-fill") as HTMLDivElement;
    this._hudWhipBar = document.getElementById("ch-whip-fill") as HTMLDivElement;
    this._hudLeaderboard = document.getElementById("ch-leaderboard") as HTMLDivElement;
    this._hudWrongWay = document.getElementById("ch-wrongway") as HTMLDivElement;
    this._hudLapTimes = document.getElementById("ch-laptimes") as HTMLDivElement;
    this._hudBoostVignette = document.getElementById("ch-vignette") as HTMLDivElement;
    this._announcerHud = document.getElementById("ch-announcer") as HTMLDivElement;
    this._slipstreamHud = document.getElementById("ch-slipstream") as HTMLDivElement;
    this._hudDamage = document.getElementById("ch-damage-fill") as HTMLDivElement;
    this._hudAchievement = document.getElementById("ch-achievement") as HTMLDivElement;
    this._posFlashEl = document.getElementById("ch-posflash") as HTMLDivElement;

    // detect touch device
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      this._touchControls.style.display = "block";
      this._bindTouchControls();
    }

    // load achievements
    this._loadAchievements();

    // fade overlay for transitions
    this._fadeOverlay = document.createElement("div");
    this._fadeOverlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:15;background:#000;opacity:0;pointer-events:none;transition:none;";
    document.getElementById("pixi-container")!.appendChild(this._fadeOverlay);

    // pause menu (hidden by default)
    this._pauseMenu = document.createElement("div");
    this._pauseMenu.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:13;display:none;background:rgba(0,0,0,0.75);";
    this._pauseMenu.innerHTML = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:monospace;">
      <div style="font-size:32px;color:#daa520;text-shadow:0 0 20px rgba(218,165,32,0.5);margin-bottom:30px;letter-spacing:4px;">PAUSED</div>
      <div id="ch-pm-0" style="font-size:18px;padding:10px 40px;margin:6px;cursor:pointer;border:1px solid transparent;border-radius:4px;color:#ddd;transition:all 0.15s;">RESUME</div>
      <div id="ch-pm-1" style="font-size:18px;padding:10px 40px;margin:6px;cursor:pointer;border:1px solid transparent;border-radius:4px;color:#ddd;transition:all 0.15s;">RESTART RACE</div>
      <div id="ch-pm-2" style="font-size:18px;padding:10px 40px;margin:6px;cursor:pointer;border:1px solid transparent;border-radius:4px;color:#ddd;transition:all 0.15s;">CONTROLS</div>
      <div id="ch-pm-3" style="font-size:18px;padding:10px 40px;margin:6px;cursor:pointer;border:1px solid transparent;border-radius:4px;color:#ddd;transition:all 0.15s;">QUIT TO MENU</div>
      <div id="ch-pm-stats" style="margin-top:25px;font-size:11px;color:#666;line-height:1.8;"></div>
    </div>`;
    document.getElementById("pixi-container")!.appendChild(this._pauseMenu);

    // click handlers for pause menu
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById(`ch-pm-${i}`)!;
      el.addEventListener("click", () => { this._pauseMenuIdx = i; this._executePauseOption(); });
      el.addEventListener("mouseenter", () => { this._pauseMenuIdx = i; this._showPauseMenu(); });
    }

    // tutorial overlay
    this._tutorialOverlay = document.createElement("div");
    this._tutorialOverlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:14;display:none;background:rgba(0,0,0,0.85);pointer-events:auto;cursor:pointer;";
    this._tutorialOverlay.innerHTML = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:monospace;max-width:550px;color:#ddd;line-height:2;">
      <div style="font-size:28px;color:#daa520;margin-bottom:20px;letter-spacing:3px;">HOW TO RACE</div>
      <div style="text-align:left;font-size:13px;">
        <div style="color:#daa520;font-size:15px;margin:12px 0 6px;">CONTROLS</div>
        <span style="color:#fff;">W / &#x2191;</span> Accelerate &nbsp;&nbsp; <span style="color:#fff;">S / &#x2193;</span> Brake<br>
        <span style="color:#fff;">A / &#x2190;</span> Steer Left &nbsp;&nbsp; <span style="color:#fff;">D / &#x2192;</span> Steer Right<br>
        <span style="color:#fff;">SPACE</span> Drift (hold while turning) &nbsp; <span style="color:#fff;">F</span> Whip<br>
        <span style="color:#fff;">E</span> Use Power-Up &nbsp; <span style="color:#fff;">R</span> U-Turn &nbsp; <span style="color:#fff;">V</span> Rear View &nbsp; <span style="color:#fff;">M</span> Mute<br><br>
        <div style="color:#daa520;font-size:15px;margin:12px 0 6px;">TIPS</div>
        <span style="color:#ff8800;">Drift Boost:</span> Hold SPACE while turning, release for speed burst<br>
        <span style="color:#ff8800;">Perfect Start:</span> Press W right when "GO!" appears<br>
        <span style="color:#ff8800;">Slipstream:</span> Draft behind opponents for free speed<br>
        <span style="color:#ff8800;">Pit Stop:</span> Drive slowly through green PIT zone to repair damage<br>
        <span style="color:#ff8800;">Ramps:</span> Hit ramps at speed to go airborne!<br>
      </div>
      <div style="margin-top:25px;font-size:14px;color:#888;">Click or press any key to start</div>
    </div>`;
    this._tutorialOverlay.addEventListener("click", () => { this._dismissTutorial(); });
    document.getElementById("pixi-container")!.appendChild(this._tutorialOverlay);

    // check if first run
    this._tutorialShown = localStorage.getItem("chariot_tutorial_seen") === "1";
  }

  private _announcerHud!: HTMLDivElement;
  private _slipstreamHud!: HTMLDivElement;
  private _posFlashEl!: HTMLDivElement;
  private _speedoCanvas!: HTMLCanvasElement;
  private _speedoCtx!: CanvasRenderingContext2D;
  private _puIconCanvas!: HTMLCanvasElement;
  private _puIconCtx!: CanvasRenderingContext2D;
  private _puTextEl!: HTMLDivElement;
  private _lastCountdownNum = -1;

  private _updateHUDCenter(text: string): void {
    this._hudCenter.textContent = text;
  }

  private _updateHUD(): void {
    if (this._phase === "title" || this._phase === "paused") return;
    const p = this._player;

    // position (with bounce animation)
    const pos = p.placement;
    const suffix = pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th";
    const newPosText = `${pos}${suffix}`;
    if (this._hudPos.textContent !== newPosText) {
      this._hudPos.textContent = newPosText;
      this._hudPos.style.transform = "scale(1.3)";
      setTimeout(() => { this._hudPos.style.transform = "scale(1)"; }, 150);
    }

    // lap
    const lap = Math.min(p.lap + 1, LAPS_PER_RACE);
    this._hudLap.textContent = `LAP ${lap} / ${LAPS_PER_RACE}`;

    // lap times
    if (p.lapTimes.length > 0) {
      const lapStrs = p.lapTimes.map((t, i) => {
        const lapTime = i === 0 ? t : t - p.lapTimes[i - 1];
        return `L${i + 1}: ${this._formatTime(lapTime)}`;
      });
      this._hudLapTimes.textContent = lapStrs.join("  ");
    } else {
      this._hudLapTimes.textContent = "";
    }

    // speedometer gauge
    this._drawSpeedometer(p.speed / MAX_SPEED, Math.floor(p.speed * 3.2));

    // power-up icon
    if (p.powerUp) {
      this._drawPowerUpIcon(p.powerUp);
      this._puTextEl.textContent = `[E] ${POWERUP_NAMES[p.powerUp]}`;
      this._puTextEl.style.color = `#${POWERUP_COLORS[p.powerUp].toString(16).padStart(6, "0")}`;
      this._puIconCanvas.style.display = "block";
      this._puTextEl.style.display = "block";
    } else {
      this._puIconCanvas.style.display = "none";
      this._puTextEl.style.display = "none";
    }

    // timer
    this._hudTimer.textContent = this._formatTime(this._raceTime);

    // drift bar
    if (p.drifting) {
      const pct = Math.min(p.driftTimer / DRIFT_BOOST_TIME * 100, 100);
      this._hudDriftBar.style.width = `${pct}%`;
    } else {
      this._hudDriftBar.style.width = "0%";
    }

    // whip cooldown
    const whipPct = p.whipCooldown > 0 ? Math.max(0, 1 - p.whipCooldown / WHIP_COOLDOWN) * 100 : 100;
    this._hudWhipBar.style.width = `${whipPct}%`;

    // leaderboard
    const sorted = [...this._racers].sort((a, b) => a.placement - b.placement);
    let lb = "";
    for (const r of sorted) {
      const col = `#${r.color.toString(16).padStart(6, "0")}`;
      const marker = r.isPlayer ? " font-weight:bold;" : "";
      const arrow = r.isPlayer ? " ◄" : "";
      const lapStr = r.finished ? "FIN" : `L${r.lap + 1}`;
      lb += `<div style="color:${col};${marker}">${r.placement}. ${r.name} <span style="color:#555">${lapStr}</span>${arrow}</div>`;
    }
    this._hudLeaderboard.innerHTML = lb;

    // wrong-way
    this._hudWrongWay.style.opacity = this._wrongWay ? String(0.6 + Math.sin(this._time * 8) * 0.4) : "0";

    // Turn indicator — look ahead on track to show upcoming turn direction
    const turnEl = document.getElementById("ch-turn-indicator");
    if (turnEl && this._track) {
      const lookAheadPts = 25; // look ~25 track points ahead
      const currentIdx = p.lastTrackIdx ?? 0;
      const aheadIdx = (currentIdx + lookAheadPts) % this._track.points.length;
      const currentPt = this._track.points[currentIdx];
      const aheadPt = this._track.points[aheadIdx];
      if (currentPt && aheadPt) {
        // Calculate turn angle between current direction and look-ahead direction
        const dx = aheadPt.pos.x - currentPt.pos.x;
        const dz = aheadPt.pos.z - currentPt.pos.z;
        const aheadAngle = Math.atan2(dx, dz);
        let turnDelta = aheadAngle - p.angle;
        while (turnDelta > Math.PI) turnDelta -= Math.PI * 2;
        while (turnDelta < -Math.PI) turnDelta += Math.PI * 2;

        if (Math.abs(turnDelta) > 0.3) {
          turnEl.style.opacity = String(Math.min(0.8, Math.abs(turnDelta) * 0.8));
          turnEl.textContent = turnDelta > 0 ? "⟶" : "⟵";
          turnEl.style.right = turnDelta > 0 ? "30px" : "";
          turnEl.style.left = turnDelta > 0 ? "" : "30px";
        } else {
          turnEl.style.opacity = "0";
        }
      }
    }

    // boost vignette (don't override final lap tint)
    if (!this._finalLapActive) {
      const boosting = p.boostTimer > 0 || p.driftBoostTimer > 0 || p.whipTimer > 0;
      this._hudBoostVignette.style.opacity = boosting ? "1" : "0";
    }

    // damage bar
    const hpPct = Math.max(0, (DAMAGE_MAX - p.damage) / DAMAGE_MAX * 100);
    this._hudDamage.style.width = `${hpPct}%`;
    this._hudDamage.style.background = hpPct > 60 ? "linear-gradient(90deg,#44cc44,#aacc44)"
      : hpPct > 30 ? "linear-gradient(90deg,#ccaa44,#cc8844)" : "linear-gradient(90deg,#cc4444,#cc2222)";

    // achievement popup
    if (this._achievementPopup) {
      this._achievementPopup.timer -= this._dt;
      if (this._achievementPopup.timer <= 0) {
        this._hudAchievement.style.opacity = "0";
        this._achievementPopup = null;
      } else if (this._achievementPopup.timer < 0.5) {
        this._hudAchievement.style.opacity = String(this._achievementPopup.timer / 0.5);
      }
    }

    // minimap & speed lines
    this._drawMinimap();
    this._updateSpeedLines();
  }

  private _drawMinimap(): void {
    const ctx = this._minimapCtx;
    const w = 200, h = 200;
    ctx.clearRect(0, 0, w, h);
    if (!this._track) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const pt of this._track.points) {
      if (pt.pos.x < minX) minX = pt.pos.x;
      if (pt.pos.x > maxX) maxX = pt.pos.x;
      if (pt.pos.z < minZ) minZ = pt.pos.z;
      if (pt.pos.z > maxZ) maxZ = pt.pos.z;
    }
    const rangeX = maxX - minX || 1, rangeZ = maxZ - minZ || 1;
    const scale = Math.min((w - 20) / rangeX, (h - 20) / rangeZ);
    const offX = (w - rangeX * scale) / 2, offZ = (h - rangeZ * scale) / 2;
    const toScreen = (p: THREE.Vector3) => ({ x: (p.x - minX) * scale + offX, y: (p.z - minZ) * scale + offZ });

    // track line (thicker, with glow)
    ctx.strokeStyle = "rgba(218,165,32,0.15)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let i = 0; i < this._track.points.length; i++) {
      const s = toScreen(this._track.points[i].pos);
      i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
    }
    ctx.closePath(); ctx.stroke();
    // brighter center line
    ctx.strokeStyle = "rgba(218,165,32,0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < this._track.points.length; i++) {
      const s = toScreen(this._track.points[i].pos);
      i === 0 ? ctx.moveTo(s.x, s.y) : ctx.lineTo(s.x, s.y);
    }
    ctx.closePath(); ctx.stroke();

    // start line marker
    const s0 = toScreen(this._track.points[0].pos);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(s0.x - 4, s0.y - 4, 8, 8);

    // racers
    for (const racer of this._racers) {
      const s = toScreen(racer.pos);
      const col = racer.isPlayer ? "#daa520" : `#${racer.color.toString(16).padStart(6, "0")}`;
      ctx.fillStyle = col;
      if (racer.isPlayer) {
        // glow behind player
        ctx.shadowColor = "#daa520"; ctx.shadowBlur = 8;
        ctx.beginPath();
        const a = racer.angle;
        ctx.moveTo(s.x + Math.sin(a) * 6, s.y + Math.cos(a) * 6);
        ctx.lineTo(s.x + Math.sin(a + 2.5) * 4, s.y + Math.cos(a + 2.5) * 4);
        ctx.lineTo(s.x + Math.sin(a - 2.5) * 4, s.y + Math.cos(a - 2.5) * 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    // oil slicks
    ctx.fillStyle = "rgba(68,68,68,0.6)";
    for (const slick of this._oilSlicks) {
      const s = toScreen(slick.pos);
      ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── title screen ───────────────────────────────────────────────────────────

  private _showTitle(): void {
    this._phase = "title";
    this._clearScene();
    this._scene.background = new THREE.Color(COL_DARK);
    this._scene.fog = new THREE.Fog(COL_DARK, 20, 80);

    this._scene.add(new THREE.AmbientLight(0x334455, 0.6));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(10, 20, 5); this._scene.add(sun);

    // show 3 chariots on title
    for (let i = 0; i < 3; i++) {
      const c = buildChariotMesh(i === 1 ? COL_GOLD : AI_COLORS[i], i === 1);
      c.position.set((i - 1) * 5, 0, i === 1 ? -1 : 0);
      c.rotation.y = -0.3 + (i - 1) * 0.15;
      this._scene.add(c);
    }

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this._scene.add(ground);

    this._camera.position.set(5, 5, 10);
    this._camera.lookAt(0, 1, 0);

    const def = TRACK_DEFS[this._currentTrackIdx];
    const diff = DIFFICULTY_SETTINGS[this._difficulty];
    const bests = loadBestTimes();
    const bestStr = bests[def.name] ? `Best: ${this._formatTime(bests[def.name])}` : "No best time yet";

    this._updateHUDCenter(
      `C H A R I O T\nMedieval Chariot Racing\n\n` +
      `Track ${this._currentTrackIdx + 1}/${TRACK_COUNT}: ${def.name}\n${def.desc}\n${bestStr}\n\n` +
      `${diff.label} [1/2/3]  ·  ${WEATHER_LABELS[this._weather]} [W]  ·  ${this._reverseMode ? "REVERSE" : "NORMAL"} [R]\n` +
      `${CHARIOT_COLORS[this._playerColorIdx].name} [C]  ·  Tournament: ${this._tournamentMode ? "ON" : "OFF"} [T]\n\n` +
      `← → Track  ·  ENTER Race  ·  ESC Exit` +
      (this._achievementsUnlocked.size > 0 ? `\n${this._achievementsUnlocked.size}/${this._achievements.length} Achievements` : "") +
      this._buildCareerText()
    );

    // hide racing HUD elements
    this._hudPos.textContent = "";
    this._hudLap.textContent = "";
    this._speedoCtx.clearRect(0, 0, 160, 160);
    this._hudPowerUp.textContent = "";
    this._hudTimer.textContent = "";
    this._hudDriftBar.style.width = "0%";
    this._hudWhipBar.style.width = "100%";
    this._hudLeaderboard.innerHTML = "";
    this._hudWrongWay.style.opacity = "0";
    this._hudLapTimes.textContent = "";
    this._hudBoostVignette.style.opacity = "0";
    this._speedLinesCanvas.style.opacity = "0";

    // Draw track preview on minimap
    const previewTrack = generateTrack(def);
    const ctx = this._minimapCtx;
    const mw = 200, mh = 200;
    ctx.clearRect(0, 0, mw, mh);
    // Background
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, mw, mh);

    let pMinX = Infinity, pMaxX = -Infinity, pMinZ = Infinity, pMaxZ = -Infinity;
    for (const pt of previewTrack.points) {
      if (pt.pos.x < pMinX) pMinX = pt.pos.x;
      if (pt.pos.x > pMaxX) pMaxX = pt.pos.x;
      if (pt.pos.z < pMinZ) pMinZ = pt.pos.z;
      if (pt.pos.z > pMaxZ) pMaxZ = pt.pos.z;
    }
    const pRangeX = pMaxX - pMinX || 1, pRangeZ = pMaxZ - pMinZ || 1;
    const pScale = Math.min((mw - 30) / pRangeX, (mh - 30) / pRangeZ);
    const pOffX = (mw - pRangeX * pScale) / 2, pOffZ = (mh - pRangeZ * pScale) / 2;

    // Track outline (thick)
    ctx.strokeStyle = "rgba(100,80,50,0.5)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < previewTrack.points.length; i++) {
      const px = (previewTrack.points[i].pos.x - pMinX) * pScale + pOffX;
      const py = (previewTrack.points[i].pos.z - pMinZ) * pScale + pOffZ;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    // Track center (bright)
    ctx.strokeStyle = "rgba(218,165,32,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < previewTrack.points.length; i++) {
      const px = (previewTrack.points[i].pos.x - pMinX) * pScale + pOffX;
      const py = (previewTrack.points[i].pos.z - pMinZ) * pScale + pOffZ;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    // Start marker
    const s0x = (previewTrack.points[0].pos.x - pMinX) * pScale + pOffX;
    const s0z = (previewTrack.points[0].pos.z - pMinZ) * pScale + pOffZ;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(s0x - 3, s0z - 3, 6, 6);
    // Label
    ctx.fillStyle = "rgba(218,165,32,0.6)";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TRACK PREVIEW", mw / 2, mh - 5);
  }

  // ── race start ─────────────────────────────────────────────────────────────

  private _startRace(trackIdx: number): void {
    this._currentTrackIdx = trackIdx;
    this._track = generateTrack(TRACK_DEFS[trackIdx]);
    if (this._reverseMode) {
      this._track.points.reverse();
      // recalculate directions for reversed track
      const pts = this._track.points;
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        pts[i].dir = new THREE.Vector3().subVectors(next.pos, pts[i].pos).normalize();
        pts[i].right = new THREE.Vector3().crossVectors(pts[i].dir, up).normalize();
      }
    }
    // precompute cumulative distances for O(1) lookup
    this._trackCumDist = [0];
    for (let i = 1; i < this._track.points.length; i++) {
      this._trackCumDist[i] = this._trackCumDist[i - 1] + this._track.points[i - 1].pos.distanceTo(this._track.points[i].pos);
    }

    this._raceTime = 0;
    this._newBestTime = false;
    this._wrongWay = false;
    this._rearView = false;
    this._lastProgress.clear();
    this._oilSlicks = [];
    this._ghostFrames = [];
    this._ghostSampleTimer = 0;
    this._totalDriftTime = 0;
    this._totalWhips = 0;
    this._wallHits = 0;
    this._overtakeCount = 0;
    this._perfectStartDone = false;
    this._lastPlacement = 0;
    this._posChangeTimer = 0;
    this._flameParticles = [];
    this._rainDrops = null;
    this._playerPowerUpsUsed = 0;
    this._rampZones = [];
    this._skidMarks = [];
    this._skidMarkTimer = 0;
    this._timeScale = 1.0;
    this._finishCamSweep = false;
    this._finalLapActive = false;
    this._brakingVisual = false;
    // Clear pending timeouts from previous race
    if (this._finishTimeout) { clearTimeout(this._finishTimeout); this._finishTimeout = null; }
    if (this._resultsTimeout) { clearTimeout(this._resultsTimeout); this._resultsTimeout = null; }
    this._lastPlayerPlacement = 0;
    this._posFlashTimer = 0;
    this._pickupFlashTimer = 0;
    this._lastCountdownNum = -1;
    this._pitEntry = null;
    this._clearScene();
    this._buildTrackScene();
    this._spawnRacers();
    this._spawnPowerUps();
    this._spawnRamps();
    this._spawnPitStop();
    this._spawnCheckpoints();
    this._loadGhost();
    this._particles = [];

    this._phase = "flyover";
    this._flyoverTimer = this._flyoverDuration;
    this._updateHUDCenter(this._track.name);
    this._hudCenter.style.fontSize = "28px";

    // show tutorial on first play, opponent taunt after
    if (!this._tutorialShown) {
      this._showTutorialIfNeeded();
    } else {
      this._showPreRaceIntro();
    }
  }

  // ── scene building ─────────────────────────────────────────────────────────

  private _clearScene(): void {
    // dispose all geometries and materials to prevent GPU memory leaks
    this._scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else if (obj.material) {
          (obj.material as THREE.Material).dispose();
        }
      }
      if (obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        (obj.material as THREE.Material)?.dispose();
      }
    });
    while (this._scene.children.length > 0) this._scene.remove(this._scene.children[0]);
    this._sceneryObjects = [];
  }

  private _buildTrackScene(): void {
    const track = this._track;
    const w = this._weather;

    // weather-modified sky & fog
    let skyCol = track.skyColor;
    let fogCol = track.fogColor;
    let ambientIntensity = 0.5;
    let sunIntensity = 1.2;
    const [fogNear, fogFar] = WEATHER_VIS[w];

    if (w === "night") {
      skyCol = 0x080818; fogCol = 0x080818;
      ambientIntensity = 0.2; sunIntensity = 0.3;
    } else if (w === "rain") {
      skyCol = new THREE.Color(track.skyColor).lerp(new THREE.Color(0x444455), 0.6).getHex();
      fogCol = skyCol; ambientIntensity = 0.35; sunIntensity = 0.6;
    } else if (w === "fog") {
      fogCol = new THREE.Color(track.skyColor).lerp(new THREE.Color(0xcccccc), 0.7).getHex();
      skyCol = fogCol; ambientIntensity = 0.6; sunIntensity = 0.4;
    } else if (w === "storm") {
      skyCol = 0x1a1a2a; fogCol = 0x1a1a2a;
      ambientIntensity = 0.25; sunIntensity = 0.3;
    }

    this._scene.background = new THREE.Color(skyCol);
    this._scene.fog = new THREE.Fog(fogCol, fogNear, fogFar);

    this._scene.add(new THREE.AmbientLight(track.ambientColor, ambientIntensity));
    const sun = new THREE.DirectionalLight(track.sunColor, sunIntensity);
    sun.position.copy(track.sunDir).multiplyScalar(50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
    this._scene.add(sun);
    this._scene.add(new THREE.HemisphereLight(track.skyColor, track.groundColor, 0.3));

    this._buildTrackMesh();

    const groundTex = makeGroundTexture(track.groundColor);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; ground.receiveShadow = true;
    this._scene.add(ground);

    this._buildScenery();
    this._buildStartLine();
    this._buildTrackDecorations();
    if (track.skyColor < 0x333333 || w === "night" || w === "storm") this._buildStars();
    if (w !== "night" && w !== "storm") this._buildCloudDome(skyCol);
    if (w === "rain" || w === "storm") this._buildRain();
    if (w === "storm") this._buildStormLighting();
    this._buildGrassStrips();
  }

  private _buildTrackMesh(): void {
    const pts = this._track.points;
    this._trackMesh = new THREE.Group();

    // road surface with curb markings (4 verts per segment: left-curb, left-road, right-road, right-curb)
    const rv: number[] = [];
    const rc: number[] = [];
    const ri: number[] = [];
    const CURB_W = 0.8;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const hw = p.width / 2;
      // apply banking: raise outer edge on curves
      const bankAmount = Math.max(-1.2, Math.min(1.2, p.bank * 0.08));
      const lc = p.pos.clone().add(p.right.clone().multiplyScalar(-(hw + CURB_W)));
      const lr = p.pos.clone().add(p.right.clone().multiplyScalar(-hw));
      const rr = p.pos.clone().add(p.right.clone().multiplyScalar(hw));
      const rcpt = p.pos.clone().add(p.right.clone().multiplyScalar(hw + CURB_W));
      lc.y += 0.01 - bankAmount; lr.y += 0.02 - bankAmount * 0.7;
      rr.y += 0.02 + bankAmount * 0.7; rcpt.y += 0.01 + bankAmount;

      rv.push(lc.x, lc.y, lc.z, lr.x, lr.y, lr.z, rr.x, rr.y, rr.z, rcpt.x, rcpt.y, rcpt.z);

      // curb: alternating red/white — brighter for visibility
      const cs = Math.floor(i / 4) % 2;
      const cR = cs ? 0.9 : 1.0, cG = cs ? 0.15 : 0.95, cB = cs ? 0.15 : 0.95;
      // road: lighter surface with clear stripe pattern
      const rs = Math.floor(i / 8) % 2;
      const rR = rs ? 0.45 : 0.38, rG = rs ? 0.42 : 0.36, rB = rs ? 0.40 : 0.34;

      rc.push(cR, cG, cB, rR, rG, rB, rR, rG, rB, cR, cG, cB);

      if (i > 0) {
        const base = (i - 1) * 4;
        // left curb quad
        ri.push(base, base + 1, base + 4, base + 1, base + 5, base + 4);
        // road quad
        ri.push(base + 1, base + 2, base + 5, base + 2, base + 6, base + 5);
        // right curb quad
        ri.push(base + 2, base + 3, base + 6, base + 3, base + 7, base + 6);
      }
    }
    // close loop
    const last = (pts.length - 1) * 4;
    ri.push(last, last + 1, 0, last + 1, 1, 0);
    ri.push(last + 1, last + 2, 1, last + 2, 2, 1);
    ri.push(last + 2, last + 3, 2, last + 3, 3, 2);

    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute("position", new THREE.Float32BufferAttribute(rv, 3));
    rGeo.setAttribute("color", new THREE.Float32BufferAttribute(rc, 3));
    rGeo.setIndex(ri);
    rGeo.computeVertexNormals();
    const rMesh = new THREE.Mesh(rGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 }));
    rMesh.receiveShadow = true;
    this._trackMesh.add(rMesh);

    // center line (dashed — bright yellow for visibility)
    const centerVerts: number[] = [];
    const centerColors: number[] = [];
    const centerIdx: number[] = [];
    const LINE_W = 0.22;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const isDash = Math.floor(i / 6) % 2 === 0;
      if (!isDash) continue;
      const l = p.pos.clone().add(p.right.clone().multiplyScalar(-LINE_W));
      const r = p.pos.clone().add(p.right.clone().multiplyScalar(LINE_W));
      l.y += 0.03; r.y += 0.03;
      const vi = centerVerts.length / 3;
      centerVerts.push(l.x, l.y, l.z, r.x, r.y, r.z);
      centerColors.push(0.9, 0.9, 0.6, 0.9, 0.9, 0.6);
      if (vi >= 2) {
        centerIdx.push(vi - 2, vi - 1, vi, vi - 1, vi + 1, vi);
      }
    }
    if (centerVerts.length > 0) {
      const clGeo = new THREE.BufferGeometry();
      clGeo.setAttribute("position", new THREE.Float32BufferAttribute(centerVerts, 3));
      clGeo.setAttribute("color", new THREE.Float32BufferAttribute(centerColors, 3));
      clGeo.setIndex(centerIdx);
      clGeo.computeVertexNormals();
      this._trackMesh.add(new THREE.Mesh(clGeo, new THREE.MeshBasicMaterial({ vertexColors: true })));
    }

    // Edge guide lines (bright yellow lines along inner edges of curb)
    for (const side of [-1, 1]) {
      const edgeVerts: number[] = [];
      const edgeColors: number[] = [];
      const edgeIdx: number[] = [];
      const EDGE_W = 0.12;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const hw = p.width / 2 - 0.3;
        const l = p.pos.clone().add(p.right.clone().multiplyScalar(side * hw - EDGE_W));
        const r = p.pos.clone().add(p.right.clone().multiplyScalar(side * hw + EDGE_W));
        l.y += 0.035; r.y += 0.035;
        const vi = edgeVerts.length / 3;
        edgeVerts.push(l.x, l.y, l.z, r.x, r.y, r.z);
        edgeColors.push(0.9, 0.8, 0.2, 0.9, 0.8, 0.2);
        if (vi >= 2) edgeIdx.push(vi - 2, vi - 1, vi, vi - 1, vi + 1, vi);
      }
      if (edgeVerts.length > 0) {
        const eGeo = new THREE.BufferGeometry();
        eGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgeVerts, 3));
        eGeo.setAttribute("color", new THREE.Float32BufferAttribute(edgeColors, 3));
        eGeo.setIndex(edgeIdx); eGeo.computeVertexNormals();
        this._trackMesh.add(new THREE.Mesh(eGeo, new THREE.MeshBasicMaterial({ vertexColors: true })));
      }
    }

    // Direction arrows on the road surface every 30 track points
    for (let i = 0; i < pts.length; i += 30) {
      const p = pts[i];
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xccccaa, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
      // Arrow shape: triangle pointing in track direction
      const arrowGeo = new THREE.BufferGeometry();
      const fwd = p.dir.clone().multiplyScalar(1.5);
      const side = p.right.clone().multiplyScalar(0.8);
      const tip = p.pos.clone().add(fwd); tip.y += 0.04;
      const bl = p.pos.clone().sub(fwd).sub(side); bl.y += 0.04;
      const br = p.pos.clone().sub(fwd).add(side); br.y += 0.04;
      arrowGeo.setAttribute("position", new THREE.Float32BufferAttribute([
        tip.x, tip.y, tip.z, bl.x, bl.y, bl.z, br.x, br.y, br.z,
      ], 3));
      arrowGeo.setIndex([0, 1, 2]);
      arrowGeo.computeVertexNormals();
      this._trackMesh.add(new THREE.Mesh(arrowGeo, arrowMat));
    }

    // barriers / walls with stone texture
    const wallTex = makeWallTexture();
    wallTex.repeat.set(0.1, 0.3);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.05 });
    for (let side = -1; side <= 1; side += 2) {
      const wv: number[] = [], wi: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const hw = p.width / 2 + CURB_W + 1.5;
        const base = p.pos.clone().add(p.right.clone().multiplyScalar(side * hw));
        const top = base.clone(); top.y += WALL_HEIGHT;
        wv.push(base.x, base.y, base.z, top.x, top.y, top.z);
        if (i > 0) {
          const idx = (i - 1) * 2;
          wi.push(idx, idx + 2, idx + 1, idx + 1, idx + 2, idx + 3);
        }
      }
      const wGeo = new THREE.BufferGeometry();
      wGeo.setAttribute("position", new THREE.Float32BufferAttribute(wv, 3));
      wGeo.setIndex(wi); wGeo.computeVertexNormals();
      const wMesh = new THREE.Mesh(wGeo, wallMat);
      wMesh.castShadow = true;
      this._trackMesh.add(wMesh);
    }

    this._scene.add(this._trackMesh);
  }

  private _buildScenery(): void {
    const track = this._track;
    const def = TRACK_DEFS[this._currentTrackIdx];
    const rng = mulberry32(def.seed + 999);

    for (let i = 0; i < track.points.length; i += 5) {
      const pt = track.points[i];
      for (let side = -1; side <= 1; side += 2) {
        if (rng() > 0.55) continue;
        const dist = pt.width / 2 + 4 + rng() * 25;
        const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));

        if (def.specialScenery === "forest" || (def.specialScenery !== "volcanic" && rng() > 0.35)) {
          // tree
          const trunkH = 2 + rng() * 4;
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.3, trunkH, 12),
            new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 })
          );
          trunk.position.copy(pos); trunk.position.y = trunkH / 2; trunk.castShadow = true;
          this._scene.add(trunk); this._sceneryObjects.push(trunk);

          const foliageColor = new THREE.Color(track.sceneryColor).offsetHSL(0, 0, (rng() - 0.5) * 0.1);
          // use cone for forest, sphere otherwise
          const foliageGeo = def.specialScenery === "forest"
            ? new THREE.ConeGeometry(1.5 + rng(), 3 + rng() * 2, 6)
            : new THREE.SphereGeometry(1.2 + rng() * 1.5, 16, 12);
          const foliage = new THREE.Mesh(foliageGeo, new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.85 }));
          foliage.position.copy(pos); foliage.position.y = trunkH + 1; foliage.castShadow = true;
          this._scene.add(foliage); this._sceneryObjects.push(foliage);
        } else {
          // rock
          const rockSize = 0.5 + rng() * 2;
          const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(rockSize, 0),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(track.groundColor).offsetHSL(0, 0, (rng() - 0.5) * 0.15), roughness: 0.9 })
          );
          rock.position.copy(pos); rock.position.y = rockSize * 0.4;
          rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
          rock.castShadow = true;
          this._scene.add(rock); this._sceneryObjects.push(rock);
        }
      }
    }

    // architectural scenery: track-specific structures
    const archMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.7, metalness: 0.1 });
    if (def.specialScenery === "castle") {
      // castle tower clusters along track sides
      for (let i = 40; i < track.points.length; i += 80 + Math.floor(rng() * 40)) {
        const pt = track.points[i % track.points.length];
        const side = rng() > 0.5 ? 1 : -1;
        const dist = pt.width / 2 + 8 + rng() * 15;
        const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));

        // main tower
        const towerH = 8 + rng() * 6;
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, towerH, 8), archMat);
        tower.position.copy(pos); tower.position.y = towerH / 2; tower.castShadow = true;
        this._scene.add(tower); this._sceneryObjects.push(tower);
        // crenellations (top ring)
        const cren = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.8, 8), archMat);
        cren.position.copy(pos); cren.position.y = towerH; this._scene.add(cren); this._sceneryObjects.push(cren);
        // turret cone
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.7 }));
        cone.position.copy(pos); cone.position.y = towerH + 1.6; cone.castShadow = true;
        this._scene.add(cone); this._sceneryObjects.push(cone);

        // connecting wall section
        if (rng() > 0.4) {
          const wallLen = 6 + rng() * 8;
          const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, wallLen), archMat);
          wall.position.copy(pos);
          wall.position.y = 2.5;
          wall.position.add(pt.dir.clone().multiplyScalar(wallLen / 2 + 2));
          wall.rotation.y = Math.atan2(pt.dir.x, pt.dir.z);
          wall.castShadow = true;
          this._scene.add(wall); this._sceneryObjects.push(wall);
        }
      }

      // ─── GRAND CASTLE in the center of the track loop ─────────────────
      // Compute centroid of all track points to find the "inside" of the circuit
      const cx = track.points.reduce((s, p) => s + p.pos.x, 0) / track.points.length;
      const cz = track.points.reduce((s, p) => s + p.pos.z, 0) / track.points.length;
      const castlePos = new THREE.Vector3(cx, 0, cz);

      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x999088, roughness: 0.75, metalness: 0.05 });
      const stoneDarkMat = new THREE.MeshStandardMaterial({ color: 0x776e65, roughness: 0.8 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.65 });
      const roofBlueMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.5, metalness: 0.15 });
      const bannerMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.6 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, roughness: 0.3, metalness: 0.6 });

      // Main keep (central tall building)
      const keepH = 22;
      const keep = new THREE.Mesh(new THREE.BoxGeometry(10, keepH, 12), stoneMat);
      keep.position.copy(castlePos); keep.position.y = keepH / 2; keep.castShadow = true;
      this._scene.add(keep); this._sceneryObjects.push(keep);
      // Keep battlements
      for (let bx = -4; bx <= 4; bx += 2) {
        for (let bz = -5; bz <= 5; bz += 2) {
          if (Math.abs(bx) < 4 && Math.abs(bz) < 5) continue; // only edges
          const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), stoneDarkMat);
          merlon.position.set(castlePos.x + bx, keepH + 0.75, castlePos.z + bz);
          merlon.castShadow = true;
          this._scene.add(merlon); this._sceneryObjects.push(merlon);
        }
      }
      // Keep roof (peaked)
      const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(8, 6, 4), roofBlueMat);
      keepRoof.position.copy(castlePos); keepRoof.position.y = keepH + 3;
      keepRoof.rotation.y = Math.PI / 4; keepRoof.castShadow = true;
      this._scene.add(keepRoof); this._sceneryObjects.push(keepRoof);

      // Main keep windows (rows of glowing slots)
      for (let row = 0; row < 3; row++) {
        for (const side of [-1, 1]) {
          for (let w = -1; w <= 1; w++) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.3),
              new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 1.2 }));
            win.position.set(castlePos.x + side * 5.05, 8 + row * 5, castlePos.z + w * 3);
            this._scene.add(win); this._sceneryObjects.push(win);
          }
        }
      }

      // 4 corner towers
      const towerOffsets = [
        { x: -8, z: -10 }, { x: 8, z: -10 }, { x: -8, z: 10 }, { x: 8, z: 10 }
      ];
      for (const off of towerOffsets) {
        const th = 18 + rng() * 4;
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, th, 10), stoneMat);
        tw.position.set(castlePos.x + off.x, th / 2, castlePos.z + off.z);
        tw.castShadow = true;
        this._scene.add(tw); this._sceneryObjects.push(tw);
        // tower battlements
        const tCren = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 1, 10), stoneDarkMat);
        tCren.position.set(castlePos.x + off.x, th, castlePos.z + off.z);
        this._scene.add(tCren); this._sceneryObjects.push(tCren);
        // tower cone roof
        const tRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4, 10), roofMat);
        tRoof.position.set(castlePos.x + off.x, th + 2, castlePos.z + off.z);
        tRoof.castShadow = true;
        this._scene.add(tRoof); this._sceneryObjects.push(tRoof);
        // flag on top
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 6), stoneDarkMat);
        pole.position.set(castlePos.x + off.x, th + 4.5, castlePos.z + off.z);
        this._scene.add(pole); this._sceneryObjects.push(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.2), bannerMat);
        flag.material.side = THREE.DoubleSide;
        flag.position.set(castlePos.x + off.x + 1.25, th + 6.5, castlePos.z + off.z);
        this._scene.add(flag); this._sceneryObjects.push(flag);
        // tower window slits
        for (let wy = 0; wy < 3; wy++) {
          const tWin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3),
            new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 0.8 }));
          tWin.position.set(castlePos.x + off.x + (off.x > 0 ? 2.55 : -2.55), 5 + wy * 5, castlePos.z + off.z);
          this._scene.add(tWin); this._sceneryObjects.push(tWin);
        }
      }

      // Curtain walls connecting the 4 towers
      const wallPairs = [
        [towerOffsets[0], towerOffsets[1]], // front
        [towerOffsets[2], towerOffsets[3]], // back
        [towerOffsets[0], towerOffsets[2]], // left
        [towerOffsets[1], towerOffsets[3]], // right
      ];
      for (const [a, b] of wallPairs) {
        const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
        const dx = b.x - a.x, dz = b.z - a.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);
        const cWallH = 10;
        const cWall = new THREE.Mesh(new THREE.BoxGeometry(1.5, cWallH, len - 4), stoneMat);
        cWall.position.set(castlePos.x + mx, cWallH / 2, castlePos.z + mz);
        cWall.rotation.y = angle; cWall.castShadow = true;
        this._scene.add(cWall); this._sceneryObjects.push(cWall);
        // wall-top walkway battlements
        for (let m = -Math.floor(len / 3); m <= Math.floor(len / 3); m++) {
          const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.0), stoneDarkMat);
          const frac = m / (len / 3);
          merlon.position.set(
            castlePos.x + a.x + (b.x - a.x) * (0.5 + frac * 0.4),
            cWallH + 0.6,
            castlePos.z + a.z + (b.z - a.z) * (0.5 + frac * 0.4)
          );
          this._scene.add(merlon); this._sceneryObjects.push(merlon);
        }
      }

      // Grand gatehouse (front wall, facing nearest track point)
      const gateH = 14;
      const gate = new THREE.Mesh(new THREE.BoxGeometry(6, gateH, 3), stoneDarkMat);
      gate.position.set(castlePos.x, gateH / 2, castlePos.z - 10);
      gate.castShadow = true;
      this._scene.add(gate); this._sceneryObjects.push(gate);
      // Gate archway (dark opening)
      const archway = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 3.5),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 }));
      archway.position.set(castlePos.x, 2.5, castlePos.z - 10);
      this._scene.add(archway); this._sceneryObjects.push(archway);
      // Portcullis grate
      const portcullis = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 4.5),
        new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      portcullis.position.set(castlePos.x, 2.5, castlePos.z - 8.5);
      this._scene.add(portcullis); this._sceneryObjects.push(portcullis);
      // Gate towers (flanking)
      for (const side of [-1, 1]) {
        const gTower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, gateH + 2, 8), stoneMat);
        gTower.position.set(castlePos.x + side * 4.5, (gateH + 2) / 2, castlePos.z - 10);
        gTower.castShadow = true;
        this._scene.add(gTower); this._sceneryObjects.push(gTower);
        const gRoof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 3, 8), roofMat);
        gRoof.position.set(castlePos.x + side * 4.5, gateH + 2.5, castlePos.z - 10);
        this._scene.add(gRoof); this._sceneryObjects.push(gRoof);
      }

      // Central spire on the keep (tallest point)
      const spireH = 12;
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, spireH, 8), stoneMat);
      spire.position.copy(castlePos); spire.position.y = keepH + 5 + spireH / 2;
      spire.castShadow = true;
      this._scene.add(spire); this._sceneryObjects.push(spire);
      const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5, 8), roofBlueMat);
      spireRoof.position.copy(castlePos); spireRoof.position.y = keepH + 5 + spireH + 2.5;
      this._scene.add(spireRoof); this._sceneryObjects.push(spireRoof);
      // Gold finial at very top
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), goldMat);
      finial.position.copy(castlePos); finial.position.y = keepH + 5 + spireH + 5.5;
      this._scene.add(finial); this._sceneryObjects.push(finial);

      // ─── TOWN BUILDINGS around the castle ─────────────────────────────
      // Scatter medieval buildings in the circuit interior
      const buildingConfigs = [
        { dx: -20, dz: -5, w: 5, h: 7, d: 6 },
        { dx: -22, dz: 8, w: 4, h: 5, d: 5 },
        { dx: 20, dz: -3, w: 6, h: 6, d: 5 },
        { dx: 18, dz: 12, w: 4, h: 8, d: 4 },
        { dx: -15, dz: -18, w: 5, h: 5, d: 7 },
        { dx: 14, dz: -16, w: 6, h: 6, d: 5 },
        { dx: -5, dz: 22, w: 5, h: 6, d: 5 },
        { dx: 8, dz: 20, w: 4, h: 5, d: 6 },
        { dx: -25, dz: -15, w: 4, h: 4, d: 4 },
        { dx: 25, dz: 8, w: 3, h: 5, d: 5 },
        { dx: 0, dz: -22, w: 7, h: 5, d: 5 },
        { dx: -12, dz: 18, w: 5, h: 7, d: 4 },
      ];
      const houseMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.8 });
      const houseDarkMat = new THREE.MeshStandardMaterial({ color: 0x998866, roughness: 0.85 });
      const timberMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.9 });

      for (const bc of buildingConfigs) {
        const bx = castlePos.x + bc.dx, bz = castlePos.z + bc.dz;
        // Main building body
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(bc.w, bc.h, bc.d), houseMat);
        bldg.position.set(bx, bc.h / 2, bz); bldg.castShadow = true;
        bldg.rotation.y = rng() * Math.PI * 0.5;
        this._scene.add(bldg); this._sceneryObjects.push(bldg);
        // Peaked roof
        const roofH = 2 + rng() * 2;
        const bRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bc.w, bc.d) * 0.75, roofH, 4),
          rng() > 0.5 ? roofMat : roofBlueMat);
        bRoof.position.set(bx, bc.h + roofH / 2, bz); bRoof.rotation.y = bldg.rotation.y + Math.PI / 4;
        bRoof.castShadow = true;
        this._scene.add(bRoof); this._sceneryObjects.push(bRoof);
        // Timber frame accents (horizontal beams)
        for (let ty = 0; ty < 2; ty++) {
          const beam = new THREE.Mesh(new THREE.BoxGeometry(bc.w + 0.3, 0.2, 0.2), timberMat);
          beam.position.set(bx, 2 + ty * (bc.h / 2 - 1), bz + bc.d / 2 + 0.1);
          beam.rotation.y = bldg.rotation.y;
          this._scene.add(beam); this._sceneryObjects.push(beam);
        }
        // Window (warm glow)
        const bWin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.2),
          new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 0.6 }));
        bWin.position.set(bx + bc.w / 2 * 0.3, bc.h * 0.6, bz + bc.d / 2 + 0.15);
        bWin.rotation.y = bldg.rotation.y;
        this._scene.add(bWin); this._sceneryObjects.push(bWin);
        // Door
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.2), timberMat);
        door.position.set(bx - bc.w / 2 * 0.3, 1, bz + bc.d / 2 + 0.15);
        door.rotation.y = bldg.rotation.y;
        this._scene.add(door); this._sceneryObjects.push(door);
      }

      // Church/chapel with bell tower
      {
        const chX = castlePos.x - 18, chZ = castlePos.z - 18;
        // Nave
        const nave = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 14), stoneMat);
        nave.position.set(chX, 4, chZ); nave.castShadow = true;
        this._scene.add(nave); this._sceneryObjects.push(nave);
        // Nave roof
        const naveRoof = new THREE.Mesh(new THREE.ConeGeometry(5, 4, 4), roofMat);
        naveRoof.position.set(chX, 10, chZ); naveRoof.rotation.y = Math.PI / 4;
        naveRoof.castShadow = true;
        this._scene.add(naveRoof); this._sceneryObjects.push(naveRoof);
        // Bell tower
        const bellTH = 16;
        const bellTower = new THREE.Mesh(new THREE.BoxGeometry(4, bellTH, 4), stoneDarkMat);
        bellTower.position.set(chX, bellTH / 2, chZ - 8); bellTower.castShadow = true;
        this._scene.add(bellTower); this._sceneryObjects.push(bellTower);
        // Bell tower spire
        const bellSpire = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6, 4), roofBlueMat);
        bellSpire.position.set(chX, bellTH + 3, chZ - 8); bellSpire.rotation.y = Math.PI / 4;
        this._scene.add(bellSpire); this._sceneryObjects.push(bellSpire);
        // Cross on top
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), goldMat);
        crossV.position.set(chX, bellTH + 7, chZ - 8);
        this._scene.add(crossV); this._sceneryObjects.push(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.2), goldMat);
        crossH.position.set(chX, bellTH + 7.5, chZ - 8);
        this._scene.add(crossH); this._sceneryObjects.push(crossH);
        // Stained glass window (front)
        const stainedGlass = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x4488cc, emissive: 0x2266aa, emissiveIntensity: 1.5, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
        stainedGlass.position.set(chX, 5, chZ + 7.05);
        this._scene.add(stainedGlass); this._sceneryObjects.push(stainedGlass);
      }

      // Market square with fountain
      {
        const fX = castlePos.x + 15, fZ = castlePos.z - 15;
        // Fountain basin
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 1.5, 16), stoneMat);
        basin.position.set(fX, 0.75, fZ);
        this._scene.add(basin); this._sceneryObjects.push(basin);
        // Fountain pillar
        const fPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 4, 12), stoneDarkMat);
        fPillar.position.set(fX, 2, fZ);
        this._scene.add(fPillar); this._sceneryObjects.push(fPillar);
        // Fountain top (bowl)
        const fBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.8, 0.8, 12), stoneMat);
        fBowl.position.set(fX, 4.2, fZ);
        this._scene.add(fBowl); this._sceneryObjects.push(fBowl);
        // Water surface
        const water = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.1, 16),
          new THREE.MeshStandardMaterial({ color: 0x3366aa, transparent: true, opacity: 0.5, metalness: 0.3 }));
        water.position.set(fX, 1.2, fZ);
        this._scene.add(water); this._sceneryObjects.push(water);
        // Market stalls around fountain
        for (let ms = 0; ms < 4; ms++) {
          const ma = (ms / 4) * Math.PI * 2 + 0.3;
          const stallX = fX + Math.cos(ma) * 7, stallZ = fZ + Math.sin(ma) * 7;
          // Stall frame
          const stall = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 2), timberMat);
          stall.position.set(stallX, 1.25, stallZ); stall.rotation.y = ma;
          this._scene.add(stall); this._sceneryObjects.push(stall);
          // Stall canopy
          const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 2.5),
            new THREE.MeshStandardMaterial({ color: [0xcc3333, 0x3333cc, 0xcccc33, 0x33cc33][ms], roughness: 0.7 }));
          canopy.position.set(stallX, 2.7, stallZ); canopy.rotation.y = ma;
          this._scene.add(canopy); this._sceneryObjects.push(canopy);
        }
      }

      // Watchtower (standalone tall tower further out)
      {
        const wtX = castlePos.x + 30, wtZ = castlePos.z + 20;
        const wtH = 20;
        const wt = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.8, wtH, 8), stoneDarkMat);
        wt.position.set(wtX, wtH / 2, wtZ); wt.castShadow = true;
        this._scene.add(wt); this._sceneryObjects.push(wt);
        const wtCren = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.2, 8), stoneMat);
        wtCren.position.set(wtX, wtH, wtZ);
        this._scene.add(wtCren); this._sceneryObjects.push(wtCren);
        const wtRoof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.5, 8), roofMat);
        wtRoof.position.set(wtX, wtH + 2, wtZ); wtRoof.castShadow = true;
        this._scene.add(wtRoof); this._sceneryObjects.push(wtRoof);
      }
    }

    if (def.specialScenery === "mountain") {
      // tall rock spires and snow-capped peaks
      for (let i = 20; i < track.points.length; i += 35 + Math.floor(rng() * 25)) {
        const pt = track.points[i % track.points.length];
        const side = rng() > 0.5 ? 1 : -1;
        const dist = pt.width / 2 + 10 + rng() * 25;
        const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
        const h = 6 + rng() * 12;
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(1.5 + rng() * 2, h, 6),
          new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.8 })
        );
        spire.position.copy(pos); spire.position.y = h / 2; spire.castShadow = true;
        this._scene.add(spire); this._sceneryObjects.push(spire);
        // snow cap
        const snow = new THREE.Mesh(
          new THREE.ConeGeometry(0.8 + rng(), h * 0.3, 6),
          new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.3, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.15 })
        );
        snow.position.copy(pos); snow.position.y = h * 0.85;
        this._scene.add(snow); this._sceneryObjects.push(snow);
      }

      // --- Additional mountain scenery ---
      {
        const rng = mulberry32(def.seed + 5555);

        // Ice crystals (12 translucent blue cone clusters)
        for (let c = 0; c < 12; c++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 4 + rng() * 15;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const clusterGroup = new THREE.Group();
          const crystalCount = 3 + Math.floor(rng() * 4);
          for (let j = 0; j < crystalCount; j++) {
            const ch = 1 + rng() * 2.5;
            const crystal = new THREE.Mesh(
              new THREE.ConeGeometry(0.2 + rng() * 0.3, ch, 5),
              new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.4 })
            );
            crystal.position.set((rng() - 0.5) * 1.2, ch / 2, (rng() - 0.5) * 1.2);
            crystal.rotation.z = (rng() - 0.5) * 0.3;
            clusterGroup.add(crystal);
          }
          clusterGroup.position.copy(pos);
          this._scene.add(clusterGroup); this._sceneryObjects.push(clusterGroup);
        }

        // Mountain goat figures (6)
        for (let g = 0; g < 6; g++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 6 + rng() * 12;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const goatGroup = new THREE.Group();
          const goatMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.8 });
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.4), goatMat);
          body.position.y = 0.5; goatGroup.add(body);
          const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), goatMat);
          head.position.set(0.45, 0.7, 0); goatGroup.add(head);
          // legs
          for (const lx of [-0.25, 0.25]) {
            for (const lz of [-0.12, 0.12]) {
              const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), goatMat);
              leg.position.set(lx, 0.17, lz); goatGroup.add(leg);
            }
          }
          goatGroup.position.copy(pos);
          goatGroup.rotation.y = rng() * Math.PI * 2;
          this._scene.add(goatGroup); this._sceneryObjects.push(goatGroup);
        }

        // Rope bridges (3 suspended between peaks)
        for (let b = 0; b < 3; b++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 15 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const bridgeGroup = new THREE.Group();
          const ropeMat = new THREE.MeshStandardMaterial({ color: 0x886644, roughness: 0.9 });
          const plankMat = new THREE.MeshStandardMaterial({ color: 0x775533, roughness: 0.85 });
          const bridgeLen = 6 + rng() * 4;
          // main rope
          const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, bridgeLen, 6), ropeMat);
          rope.rotation.z = Math.PI / 2; rope.position.y = 0; bridgeGroup.add(rope);
          // railing ropes
          for (const ry of [0.4, -0.4]) {
            const railing = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, bridgeLen, 6), ropeMat);
            railing.rotation.z = Math.PI / 2; railing.position.set(0, 0.5, ry); bridgeGroup.add(railing);
          }
          // planks
          for (let p = -bridgeLen / 2 + 0.3; p < bridgeLen / 2; p += 0.5) {
            const plank = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.8), plankMat);
            plank.position.set(p, -0.02, 0); bridgeGroup.add(plank);
          }
          bridgeGroup.position.copy(pos);
          bridgeGroup.position.y = 4 + rng() * 6;
          bridgeGroup.rotation.y = rng() * Math.PI;
          this._scene.add(bridgeGroup); this._sceneryObjects.push(bridgeGroup);
        }

        // Cave entrances (4 dark half-sphere openings)
        for (let c = 0; c < 4; c++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 12 + rng() * 15;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const cave = new THREE.Mesh(
            new THREE.SphereGeometry(2 + rng() * 1.5, 12, 8, 0, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, side: THREE.DoubleSide })
          );
          cave.position.copy(pos); cave.position.y = 0;
          cave.rotation.y = rng() * Math.PI * 2;
          this._scene.add(cave); this._sceneryObjects.push(cave);
        }

        // Alpine flowers (20 small colorful dots)
        const flowerColors = [0xff66aa, 0xffaa33, 0xaa66ff, 0x66ccff, 0xffff55];
        for (let f = 0; f < 20; f++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 2 + rng() * 8;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const flower = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 + rng() * 0.06, 6, 4),
            new THREE.MeshStandardMaterial({ color: flowerColors[Math.floor(rng() * flowerColors.length)], roughness: 0.5 })
          );
          flower.position.copy(pos); flower.position.y = 0.05;
          this._scene.add(flower); this._sceneryObjects.push(flower);
        }

        // Eagle nests (4 twig-colored torus on spires)
        for (let n = 0; n < 4; n++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 12 + rng() * 20;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const nest = new THREE.Mesh(
            new THREE.TorusGeometry(0.6, 0.15, 8, 12),
            new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.95 })
          );
          nest.position.copy(pos); nest.position.y = 8 + rng() * 6;
          nest.rotation.x = Math.PI / 2;
          this._scene.add(nest); this._sceneryObjects.push(nest);
        }

        // Avalanche debris (8 scattered rock piles)
        for (let a = 0; a < 8; a++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 5 + rng() * 15;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const pileGroup = new THREE.Group();
          const rockMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });
          const rockCount = 4 + Math.floor(rng() * 5);
          for (let r = 0; r < rockCount; r++) {
            const rock = new THREE.Mesh(
              new THREE.DodecahedronGeometry(0.3 + rng() * 0.5, 0),
              rockMat
            );
            rock.position.set((rng() - 0.5) * 2, rng() * 0.4, (rng() - 0.5) * 2);
            rock.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);
            pileGroup.add(rock);
          }
          pileGroup.position.copy(pos);
          this._scene.add(pileGroup); this._sceneryObjects.push(pileGroup);
        }

        // Mountain stream (3 thin blue transparent ribbons)
        for (let s = 0; s < 3; s++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 8 + rng() * 12;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const streamLen = 5 + rng() * 8;
          const stream = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.05, streamLen),
            new THREE.MeshStandardMaterial({ color: 0x4488cc, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.2 })
          );
          stream.position.copy(pos); stream.position.y = 0.02;
          stream.rotation.y = rng() * Math.PI;
          stream.rotation.x = (rng() - 0.5) * 0.4; // slope
          this._scene.add(stream); this._sceneryObjects.push(stream);
        }

        // Wind-bent flags (6 colored planes on poles)
        const flagColors = [0xff3333, 0x3333ff, 0xffff33, 0x33ff33, 0xff33ff, 0xff8833];
        for (let f = 0; f < 6; f++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 6;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const flagGroup = new THREE.Group();
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 3, 6),
            new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 })
          );
          pole.position.y = 1.5; flagGroup.add(pole);
          const flag = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.5),
            new THREE.MeshStandardMaterial({ color: flagColors[f % flagColors.length], roughness: 0.6, side: THREE.DoubleSide })
          );
          flag.position.set(0.4, 2.8, 0);
          flag.rotation.z = -0.15; // wind bent
          flagGroup.add(flag);
          flagGroup.position.copy(pos);
          this._scene.add(flagGroup); this._sceneryObjects.push(flagGroup);
        }
      }
    }

    if (def.specialScenery === "forest") {
      // ruined stone arches & standing stones
      for (let i = 50; i < track.points.length; i += 70 + Math.floor(rng() * 30)) {
        const pt = track.points[i % track.points.length];
        const side = rng() > 0.5 ? 1 : -1;
        const dist = pt.width / 2 + 5 + rng() * 10;
        const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
        // standing stone
        const stoneH = 3 + rng() * 3;
        const stone = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, stoneH, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.9 })
        );
        stone.position.copy(pos); stone.position.y = stoneH / 2;
        stone.rotation.y = rng() * Math.PI;
        stone.rotation.z = (rng() - 0.5) * 0.15; // slight lean
        stone.castShadow = true;
        this._scene.add(stone); this._sceneryObjects.push(stone);
      }

      // --- Additional forest scenery ---
      {
        const rng = mulberry32(def.seed + 5555);

        // Mushroom circles (8 groups of 5-8 small mushrooms)
        for (let g = 0; g < 8; g++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 4 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const mushCount = 5 + Math.floor(rng() * 4);
          const circleR = 0.8 + rng() * 0.6;
          for (let m = 0; m < mushCount; m++) {
            const angle = (m / mushCount) * Math.PI * 2;
            const mx = pos.x + Math.cos(angle) * circleR;
            const mz = pos.z + Math.sin(angle) * circleR;
            // stem
            const stem = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6),
              new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.7 })
            );
            stem.position.set(mx, 0.1, mz);
            this._scene.add(stem); this._sceneryObjects.push(stem);
            // cap (red with white spots implied by color)
            const cap = new THREE.Mesh(
              new THREE.SphereGeometry(0.08 + rng() * 0.04, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
              new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 })
            );
            cap.position.set(mx, 0.2, mz);
            this._scene.add(cap); this._sceneryObjects.push(cap);
            // white spot on cap
            const spot = new THREE.Mesh(
              new THREE.SphereGeometry(0.02, 4, 4),
              new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
            );
            spot.position.set(mx, 0.24, mz);
            this._scene.add(spot); this._sceneryObjects.push(spot);
          }
        }

        // Fallen logs (10 mossy logs)
        for (let l = 0; l < 10; l++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 12;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const logLen = 2 + rng() * 3;
          const logR = 0.15 + rng() * 0.15;
          const log = new THREE.Mesh(
            new THREE.CylinderGeometry(logR, logR * 1.1, logLen, 8),
            new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.95 })
          );
          log.position.copy(pos); log.position.y = logR;
          log.rotation.z = Math.PI / 2;
          log.rotation.y = rng() * Math.PI;
          this._scene.add(log); this._sceneryObjects.push(log);
          // moss patches on log
          for (let mp = 0; mp < 3; mp++) {
            const moss = new THREE.Mesh(
              new THREE.SphereGeometry(0.1 + rng() * 0.08, 6, 4),
              new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.9 })
            );
            moss.position.copy(pos);
            moss.position.y = logR * 2;
            moss.position.x += (rng() - 0.5) * logLen * 0.6;
            moss.position.z += (rng() - 0.5) * 0.3;
            this._scene.add(moss); this._sceneryObjects.push(moss);
          }
        }

        // Firefly lights (15 tiny warm PointLights)
        for (let f = 0; f < 15; f++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 2 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const light = new THREE.PointLight(0xffee66, 0.3, 5);
          light.position.copy(pos); light.position.y = 1 + rng() * 3;
          this._scene.add(light);
          // tiny visible sphere for the firefly
          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 4, 4),
            new THREE.MeshStandardMaterial({ color: 0xffee66, emissive: 0xffee66, emissiveIntensity: 2.0 })
          );
          glow.position.copy(light.position);
          this._scene.add(glow); this._sceneryObjects.push(glow);
        }

        // Glowing fungi on tree trunks (20 small emissive green spheres)
        for (let g = 0; g < 20; g++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 8;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const fungus = new THREE.Mesh(
            new THREE.SphereGeometry(0.06 + rng() * 0.04, 6, 4),
            new THREE.MeshStandardMaterial({ color: 0x33ff66, emissive: 0x33ff66, emissiveIntensity: 1.5, roughness: 0.4 })
          );
          fungus.position.copy(pos); fungus.position.y = 0.5 + rng() * 2.5;
          this._scene.add(fungus); this._sceneryObjects.push(fungus);
        }

        // Stone bridge/arch (2 broken stone arches)
        for (let a = 0; a < 2; a++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 8 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const archGroup = new THREE.Group();
          const archMat = new THREE.MeshStandardMaterial({ color: 0x778877, roughness: 0.9 });
          // left pillar
          const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), archMat);
          pillarL.position.set(-1.2, 1.5, 0); archGroup.add(pillarL);
          // right pillar
          const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), archMat);
          pillarR.position.set(1.2, 1.1, 0); archGroup.add(pillarR);
          // arch top (partially broken - tilted)
          const archTop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.6), archMat);
          archTop.position.set(0, 2.8, 0);
          archTop.rotation.z = 0.15; // slightly collapsed
          archGroup.add(archTop);
          // fallen stone block
          const fallen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), archMat);
          fallen.position.set(0.8, 0.25, 0.5);
          fallen.rotation.y = 0.4;
          archGroup.add(fallen);
          archGroup.position.copy(pos);
          archGroup.rotation.y = rng() * Math.PI;
          this._scene.add(archGroup); this._sceneryObjects.push(archGroup);
        }

        // Fern bushes (25 small green sphere clusters)
        for (let f = 0; f < 25; f++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 2 + rng() * 8;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const fernGroup = new THREE.Group();
          const fernMat = new THREE.MeshStandardMaterial({ color: 0x338833, roughness: 0.8 });
          const frondCount = 3 + Math.floor(rng() * 3);
          for (let fr = 0; fr < frondCount; fr++) {
            const frond = new THREE.Mesh(
              new THREE.SphereGeometry(0.15 + rng() * 0.1, 6, 4),
              fernMat
            );
            frond.position.set((rng() - 0.5) * 0.4, 0.1 + rng() * 0.15, (rng() - 0.5) * 0.4);
            frond.scale.y = 0.5;
            fernGroup.add(frond);
          }
          fernGroup.position.copy(pos);
          this._scene.add(fernGroup); this._sceneryObjects.push(fernGroup);
        }

        // Ancient tree stumps (3 large flat cylinders with moss)
        for (let s = 0; s < 3; s++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 5 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const stumpR = 0.8 + rng() * 0.6;
          const stump = new THREE.Mesh(
            new THREE.CylinderGeometry(stumpR, stumpR * 1.15, 0.6, 10),
            new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.95 })
          );
          stump.position.copy(pos); stump.position.y = 0.3;
          this._scene.add(stump); this._sceneryObjects.push(stump);
          // moss top
          const mossTop = new THREE.Mesh(
            new THREE.CylinderGeometry(stumpR * 0.9, stumpR * 0.9, 0.08, 10),
            new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.9 })
          );
          mossTop.position.copy(pos); mossTop.position.y = 0.62;
          this._scene.add(mossTop); this._sceneryObjects.push(mossTop);
        }

        // Cobweb decorations (8 thin white translucent planes)
        for (let w = 0; w < 8; w++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 8;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const web = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8 + rng() * 0.6, 0.8 + rng() * 0.6),
            new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, roughness: 0.3, side: THREE.DoubleSide })
          );
          web.position.copy(pos); web.position.y = 1.5 + rng() * 2;
          web.rotation.y = rng() * Math.PI;
          web.rotation.x = (rng() - 0.5) * 0.5;
          this._scene.add(web); this._sceneryObjects.push(web);
        }

        // Owl perches (5 small sphere+cone shapes)
        for (let o = 0; o < 5; o++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 4 + rng() * 8;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const owlGroup = new THREE.Group();
          const owlMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.7 });
          // body
          const owlBody = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), owlMat);
          owlBody.position.y = 0; owlGroup.add(owlBody);
          // head
          const owlHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), owlMat);
          owlHead.position.y = 0.16; owlGroup.add(owlHead);
          // ear tufts (two small cones)
          for (const ex of [-0.04, 0.04]) {
            const ear = new THREE.Mesh(
              new THREE.ConeGeometry(0.02, 0.06, 4),
              owlMat
            );
            ear.position.set(ex, 0.24, 0); owlGroup.add(ear);
          }
          // eyes
          for (const ex of [-0.03, 0.03]) {
            const eye = new THREE.Mesh(
              new THREE.SphereGeometry(0.015, 4, 4),
              new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1.0 })
            );
            eye.position.set(ex, 0.17, 0.07); owlGroup.add(eye);
          }
          owlGroup.position.copy(pos);
          owlGroup.position.y = 3 + rng() * 3;
          this._scene.add(owlGroup); this._sceneryObjects.push(owlGroup);
        }
      }
    }
  }

  private _buildTrackDecorations(): void {
    const def = TRACK_DEFS[this._currentTrackIdx];
    const track = this._track;
    const rng = mulberry32(def.seed + 1234);

    // spectator stands every ~60 segments
    for (let i = 30; i < track.points.length; i += 55 + Math.floor(rng() * 20)) {
      const pt = track.points[i % track.points.length];
      const side = rng() > 0.5 ? 1 : -1;
      const dist = pt.width / 2 + 3;
      const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));

      // stand platform
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.85 })
      );
      stand.position.copy(pos); stand.position.y = 0.75; stand.castShadow = true;
      const angle = Math.atan2(pt.dir.x, pt.dir.z);
      stand.rotation.y = angle;
      this._scene.add(stand); this._sceneryObjects.push(stand);

      // spectators with body shapes
      const specColors = [0xcc4444, 0x44cc44, 0x4444cc, 0xcccc44, 0xcc44cc, 0x44cccc, 0xcc8844];
      for (let s = 0; s < 6; s++) {
        const specGroup = new THREE.Group();
        const xOff = (s - 2.5) * 0.45;
        // body (capsule-like: cylinder + sphere top)
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.12, 0.5, 12),
          new THREE.MeshStandardMaterial({ color: specColors[s % specColors.length], roughness: 0.7 })
        );
        body.position.set(0, 0.25, 0); specGroup.add(body);
        // head
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xddbb88, roughness: 0.6 })
        );
        head.position.set(0, 0.55, 0); specGroup.add(head);
        specGroup.position.copy(pos);
        specGroup.position.y = 1.55;
        specGroup.position.x += xOff;
        specGroup.position.z += (Math.random() - 0.5) * 0.3;
        specGroup.name = `spectator_${i}_${s}`;
        this._scene.add(specGroup); this._sceneryObjects.push(specGroup);
      }
    }

    // track-specific decorations
    if (def.specialScenery === "castle") {
      // torch posts along walls
      for (let i = 0; i < track.points.length; i += 30) {
        const pt = track.points[i];
        for (const side of [-1, 1]) {
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * (pt.width / 2 + 1.5)));
          const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 3, 12),
            new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.85 })
          );
          post.position.copy(pos); post.position.y = 1.5; this._scene.add(post);
          // flame
          const flame = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0xff8833, emissive: 0xff6622, emissiveIntensity: 2.0, toneMapped: false })
          );
          flame.position.copy(pos); flame.position.y = 3.2; this._scene.add(flame);
          // point light (sparse, only every other)
          if (i % 60 === 0) {
            const light = new THREE.PointLight(0xff6622, 0.6, 15);
            light.position.copy(pos); light.position.y = 3.2; this._scene.add(light);
          }
        }
      }
    }

    if (def.specialScenery === "volcanic") {
      // lava pools beside track
      for (let i = 20; i < track.points.length; i += 40 + Math.floor(rng() * 20)) {
        const pt = track.points[i % track.points.length];
        const side = rng() > 0.5 ? 1 : -1;
        const dist = pt.width / 2 + 6 + rng() * 10;
        const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
        const lavaSize = 2 + rng() * 4;
        const lava = new THREE.Mesh(
          new THREE.CircleGeometry(lavaSize, 12),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 1.5, toneMapped: false })
        );
        lava.rotation.x = -Math.PI / 2; lava.position.copy(pos); lava.position.y = -0.3;
        this._scene.add(lava); this._sceneryObjects.push(lava);
        // glow
        const glow = new THREE.PointLight(0xff4400, 0.6, 25);
        glow.position.copy(pos); glow.position.y = 1; this._scene.add(glow);
      }

      // --- Additional volcanic scenery ---
      {
        const rng = mulberry32(def.seed + 5555);

        // Obsidian pillars (10 dark glossy tapered cylinders)
        for (let op = 0; op < 10; op++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 5 + rng() * 15;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const pH = 3 + rng() * 5;
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3 + rng() * 0.3, 0.6 + rng() * 0.4, pH, 6),
            new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.2, metalness: 0.5 })
          );
          pillar.position.copy(pos); pillar.position.y = pH / 2;
          pillar.castShadow = true;
          this._scene.add(pillar); this._sceneryObjects.push(pillar);
        }

        // Lava geysers (6 bright orange/yellow cone eruptions with PointLight)
        for (let lg = 0; lg < 6; lg++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 6 + rng() * 12;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const geyserH = 2 + rng() * 3;
          const geyser = new THREE.Mesh(
            new THREE.ConeGeometry(0.5 + rng() * 0.3, geyserH, 8),
            new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 2.0, roughness: 0.3 })
          );
          geyser.position.copy(pos); geyser.position.y = geyserH / 2;
          this._scene.add(geyser); this._sceneryObjects.push(geyser);
          // geyser light
          const gLight = new THREE.PointLight(0xff6600, 0.8, 15);
          gLight.position.copy(pos); gLight.position.y = geyserH;
          this._scene.add(gLight);
        }

        // Charred dead trees (12 black bare trunks with thin branch cylinders)
        for (let dt = 0; dt < 12; dt++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 4 + rng() * 12;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const treeGroup = new THREE.Group();
          const charMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
          const tH = 2 + rng() * 3;
          // trunk
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, tH, 6), charMat);
          trunk.position.y = tH / 2; treeGroup.add(trunk);
          // branches (2-4 thin cylinders)
          const branchCount = 2 + Math.floor(rng() * 3);
          for (let br = 0; br < branchCount; br++) {
            const bLen = 0.5 + rng() * 1;
            const branch = new THREE.Mesh(
              new THREE.CylinderGeometry(0.02, 0.04, bLen, 5),
              charMat
            );
            branch.position.y = tH * (0.5 + rng() * 0.4);
            branch.rotation.z = (rng() > 0.5 ? 1 : -1) * (0.5 + rng() * 0.8);
            branch.position.x = (rng() - 0.5) * 0.3;
            treeGroup.add(branch);
          }
          treeGroup.position.copy(pos);
          treeGroup.castShadow = true;
          this._scene.add(treeGroup); this._sceneryObjects.push(treeGroup);
        }

        // Volcanic rocks (15 dark dodecahedrons scattered around)
        for (let vr = 0; vr < 15; vr++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 12;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const rockSize = 0.3 + rng() * 0.6;
          const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(rockSize, 0),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.85 })
          );
          rock.position.copy(pos); rock.position.y = rockSize * 0.5;
          rock.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);
          this._scene.add(rock); this._sceneryObjects.push(rock);
        }

        // Smoke vents (8 translucent grey sphere puffs)
        for (let sv = 0; sv < 8; sv++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 4 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const smokeGroup = new THREE.Group();
          const smokeMat = new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.25, roughness: 0.9 });
          // stack of rising puffs
          for (let puff = 0; puff < 4; puff++) {
            const puffMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.3 + puff * 0.15, 8, 6),
              smokeMat
            );
            puffMesh.position.y = puff * 0.6;
            smokeGroup.add(puffMesh);
          }
          smokeGroup.position.copy(pos);
          smokeGroup.position.y = 0.2;
          this._scene.add(smokeGroup); this._sceneryObjects.push(smokeGroup);
        }

        // Fire elementals (4 small orange emissive sphere clusters)
        for (let fe = 0; fe < 4; fe++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 5 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const elemGroup = new THREE.Group();
          const fireMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5, roughness: 0.3 });
          // core
          const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), fireMat);
          core.position.y = 0.5; elemGroup.add(core);
          // orbiting flame spheres
          for (let orb = 0; orb < 4; orb++) {
            const orbAngle = (orb / 4) * Math.PI * 2;
            const flame = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), fireMat);
            flame.position.set(Math.cos(orbAngle) * 0.35, 0.5 + Math.sin(orbAngle) * 0.2, Math.sin(orbAngle) * 0.35);
            elemGroup.add(flame);
          }
          // top flame
          const topFlame = new THREE.Mesh(
            new THREE.ConeGeometry(0.12, 0.3, 6),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 2.0, roughness: 0.3 })
          );
          topFlame.position.y = 0.85; elemGroup.add(topFlame);
          elemGroup.position.copy(pos);
          this._scene.add(elemGroup); this._sceneryObjects.push(elemGroup);
        }

        // Bone piles (6 off-white sphere clusters near track)
        for (let bp = 0; bp < 6; bp++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 6;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const boneGroup = new THREE.Group();
          const boneMat = new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.7 });
          const boneCount = 4 + Math.floor(rng() * 4);
          for (let bn = 0; bn < boneCount; bn++) {
            const bone = new THREE.Mesh(
              new THREE.SphereGeometry(0.05 + rng() * 0.06, 6, 4),
              boneMat
            );
            bone.position.set((rng() - 0.5) * 0.5, rng() * 0.15, (rng() - 0.5) * 0.5);
            boneGroup.add(bone);
          }
          // a couple of elongated "long bones"
          for (let lb = 0; lb < 2; lb++) {
            const longBone = new THREE.Mesh(
              new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5),
              boneMat
            );
            longBone.position.set((rng() - 0.5) * 0.4, 0.04, (rng() - 0.5) * 0.4);
            longBone.rotation.z = Math.PI / 2;
            longBone.rotation.y = rng() * Math.PI;
            boneGroup.add(longBone);
          }
          boneGroup.position.copy(pos);
          this._scene.add(boneGroup); this._sceneryObjects.push(boneGroup);
        }

        // Ruined columns (5 broken dark stone cylinders, some toppled)
        for (let rc = 0; rc < 5; rc++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 5 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const colGroup = new THREE.Group();
          const colMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85 });
          const colH = 2 + rng() * 3;
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, colH, 8), colMat);
          if (rng() > 0.5) {
            // standing but broken
            col.position.y = colH / 2;
          } else {
            // toppled
            col.rotation.z = Math.PI / 2;
            col.position.y = 0.35;
            col.position.x += (rng() - 0.5) * 1;
          }
          colGroup.add(col);
          // broken capital on top or beside
          const capital = new THREE.Mesh(
            new THREE.CylinderGeometry(0.45, 0.35, 0.25, 8),
            colMat
          );
          if (col.rotation.z === 0) {
            capital.position.y = colH + 0.12;
          } else {
            capital.position.set((rng() - 0.5) * 1.5, 0.12, (rng() - 0.5) * 0.5);
          }
          colGroup.add(capital);
          colGroup.position.copy(pos);
          colGroup.rotation.y = rng() * Math.PI;
          this._scene.add(colGroup); this._sceneryObjects.push(colGroup);
        }

        // Ember particles (10 tiny orange emissive spheres floating in air)
        for (let em = 0; em < 10; em++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 2 + rng() * 12;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const ember = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 4, 4),
            new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.5, roughness: 0.3 })
          );
          ember.position.copy(pos); ember.position.y = 1 + rng() * 4;
          this._scene.add(ember); this._sceneryObjects.push(ember);
        }

        // Cracked earth (8 dark lines on ground made of thin box meshes)
        for (let ce = 0; ce < 8; ce++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const crackGroup = new THREE.Group();
          const crackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
          const segCount = 3 + Math.floor(rng() * 3);
          let cx = 0, cz = 0;
          for (let seg = 0; seg < segCount; seg++) {
            const segLen = 0.5 + rng() * 1.5;
            const segAngle = rng() * Math.PI * 2;
            const crack = new THREE.Mesh(
              new THREE.BoxGeometry(segLen, 0.02, 0.04),
              crackMat
            );
            cx += Math.cos(segAngle) * segLen * 0.5;
            cz += Math.sin(segAngle) * segLen * 0.5;
            crack.position.set(cx, 0.01, cz);
            crack.rotation.y = segAngle;
            crackGroup.add(crack);
            cx += Math.cos(segAngle) * segLen * 0.5;
            cz += Math.sin(segAngle) * segLen * 0.5;
          }
          crackGroup.position.copy(pos);
          this._scene.add(crackGroup); this._sceneryObjects.push(crackGroup);
        }
      }
    }

    if (def.specialScenery === "shore") {
      // water plane
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(600, 600),
        new THREE.MeshStandardMaterial({ color: 0x3366aa, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.3 })
      );
      water.rotation.x = -Math.PI / 2; water.position.y = -1.5; this._scene.add(water);

      // --- Additional shore scenery ---
      {
        const rng = mulberry32(def.seed + 5555);

        // Palm trees (12 tall trunks with green sphere clusters)
        for (let p = 0; p < 12; p++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 4 + rng() * 12;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const palmGroup = new THREE.Group();
          const trunkH = 4 + rng() * 3;
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.25, trunkH, 8),
            new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 })
          );
          trunk.position.y = trunkH / 2; palmGroup.add(trunk);
          // slight lean
          palmGroup.rotation.z = (rng() - 0.5) * 0.15;
          // leaf clusters on top
          const leafMat = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.7 });
          for (let lf = 0; lf < 5; lf++) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.6 + rng() * 0.3, 8, 6), leafMat);
            const la = (lf / 5) * Math.PI * 2;
            leaf.position.set(Math.cos(la) * 0.6, trunkH + 0.1, Math.sin(la) * 0.6);
            leaf.scale.set(1, 0.4, 1.5);
            palmGroup.add(leaf);
          }
          palmGroup.position.copy(pos);
          palmGroup.castShadow = true;
          this._scene.add(palmGroup); this._sceneryObjects.push(palmGroup);
        }

        // Seashells (20 small white/pink hemispheres)
        const shellColors = [0xffeedd, 0xffccbb, 0xeeddcc, 0xffddee, 0xffffff];
        for (let s = 0; s < 20; s++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 2 + rng() * 8;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const shell = new THREE.Mesh(
            new THREE.SphereGeometry(0.06 + rng() * 0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: shellColors[Math.floor(rng() * shellColors.length)], roughness: 0.4, metalness: 0.1 })
          );
          shell.position.copy(pos); shell.position.y = 0.01;
          shell.rotation.y = rng() * Math.PI * 2;
          this._scene.add(shell); this._sceneryObjects.push(shell);
        }

        // Driftwood (8 pale brown cylinder logs)
        for (let d = 0; d < 8; d++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 10;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const dLen = 1.5 + rng() * 2.5;
          const driftwood = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08 + rng() * 0.08, 0.1 + rng() * 0.06, dLen, 6),
            new THREE.MeshStandardMaterial({ color: 0xbbaa88, roughness: 0.95 })
          );
          driftwood.position.copy(pos); driftwood.position.y = 0.06;
          driftwood.rotation.z = Math.PI / 2;
          driftwood.rotation.y = rng() * Math.PI;
          this._scene.add(driftwood); this._sceneryObjects.push(driftwood);
        }

        // Sandcastles (2 clusters of sand-colored cylinders+cones)
        for (let sc = 0; sc < 2; sc++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 4 + rng() * 6;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const castleGroup = new THREE.Group();
          const sandMat = new THREE.MeshStandardMaterial({ color: 0xddcc88, roughness: 0.9 });
          // main tower
          const mainTower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8), sandMat);
          mainTower.position.y = 0.4; castleGroup.add(mainTower);
          const mainTop = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 8), sandMat);
          mainTop.position.y = 0.92; castleGroup.add(mainTop);
          // side towers
          for (const tx of [-0.5, 0.5]) {
            const sideTower = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.5, 8), sandMat);
            sideTower.position.set(tx, 0.25, 0); castleGroup.add(sideTower);
            const sideTop = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 8), sandMat);
            sideTop.position.set(tx, 0.58, 0); castleGroup.add(sideTop);
          }
          // wall between towers
          const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.08), sandMat);
          wall.position.set(0, 0.15, 0.18); castleGroup.add(wall);
          castleGroup.position.copy(pos);
          this._scene.add(castleGroup); this._sceneryObjects.push(castleGroup);
        }

        // Fishing boats (3 simple boat shapes)
        for (let b = 0; b < 3; b++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 10 + rng() * 15;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const boatGroup = new THREE.Group();
          // hull
          const hull = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.3, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.8 })
          );
          hull.position.y = 0; boatGroup.add(hull);
          // mast
          const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6),
            new THREE.MeshStandardMaterial({ color: 0x665533, roughness: 0.85 })
          );
          mast.position.y = 0.85; boatGroup.add(mast);
          // sail
          const sail = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.6, side: THREE.DoubleSide })
          );
          sail.position.set(0.15, 0.9, 0); boatGroup.add(sail);
          boatGroup.position.copy(pos);
          boatGroup.position.y = -1.2; // floating on water
          boatGroup.rotation.y = rng() * Math.PI * 2;
          this._scene.add(boatGroup); this._sceneryObjects.push(boatGroup);
        }

        // Seagulls (10 tiny white sphere+plane wing shapes high up)
        for (let sg = 0; sg < 10; sg++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 5 + rng() * 20;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const gullGroup = new THREE.Group();
          const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
          // body
          const gullBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), whiteMat);
          gullGroup.add(gullBody);
          // wings
          for (const wx of [-1, 1]) {
            const wing = new THREE.Mesh(
              new THREE.PlaneGeometry(0.2, 0.06),
              whiteMat
            );
            wing.position.set(wx * 0.12, 0.01, 0);
            wing.rotation.z = wx * 0.3;
            gullGroup.add(wing);
          }
          gullGroup.position.copy(pos);
          gullGroup.position.y = 8 + rng() * 10;
          gullGroup.rotation.y = rng() * Math.PI * 2;
          this._scene.add(gullGroup); this._sceneryObjects.push(gullGroup);
        }

        // Lighthouse (1 tall white/red striped cylinder with light)
        {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 25 + rng() * 15;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const lhGroup = new THREE.Group();
          const lhH = 10;
          // main tower (white)
          const tower = new THREE.Mesh(
            new THREE.CylinderGeometry(1, 1.5, lhH, 12),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 })
          );
          tower.position.y = lhH / 2; lhGroup.add(tower);
          // red stripes
          for (let stripe = 0; stripe < 3; stripe++) {
            const stripeM = new THREE.Mesh(
              new THREE.CylinderGeometry(1.02 + (0.5 - stripe * 0.15), 1.18 + (0.5 - stripe * 0.15), 0.8, 12),
              new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 })
            );
            stripeM.position.y = 2 + stripe * 3; lhGroup.add(stripeM);
          }
          // lantern room
          const lanternRoom = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1, 1.5, 12),
            new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 })
          );
          lanternRoom.position.y = lhH + 0.75; lhGroup.add(lanternRoom);
          // dome
          const dome = new THREE.Mesh(
            new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 })
          );
          dome.position.y = lhH + 1.5; lhGroup.add(dome);
          // beacon light
          const beacon = new THREE.PointLight(0xffffcc, 1.5, 60);
          beacon.position.y = lhH + 1; lhGroup.add(beacon);
          lhGroup.position.copy(pos);
          this._scene.add(lhGroup); this._sceneryObjects.push(lhGroup);
        }

        // Tide pools (6 small blue circles with rock borders)
        for (let tp = 0; tp < 6; tp++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 6;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const poolR = 0.4 + rng() * 0.4;
          // water circle
          const pool = new THREE.Mesh(
            new THREE.CircleGeometry(poolR, 12),
            new THREE.MeshStandardMaterial({ color: 0x3388bb, transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.2 })
          );
          pool.rotation.x = -Math.PI / 2;
          pool.position.copy(pos); pool.position.y = 0.02;
          this._scene.add(pool); this._sceneryObjects.push(pool);
          // rock border
          const rockBorder = new THREE.Mesh(
            new THREE.TorusGeometry(poolR, 0.08, 6, 12),
            new THREE.MeshStandardMaterial({ color: 0x667766, roughness: 0.9 })
          );
          rockBorder.rotation.x = Math.PI / 2;
          rockBorder.position.copy(pos); rockBorder.position.y = 0.05;
          this._scene.add(rockBorder); this._sceneryObjects.push(rockBorder);
        }

        // Beach umbrellas (4 cone+pole combinations)
        const umbrellaColors = [0xff3333, 0x3333ff, 0xffff33, 0x33cc33];
        for (let u = 0; u < 4; u++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 3 + rng() * 6;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const umbGroup = new THREE.Group();
          // pole
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 2, 6),
            new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4 })
          );
          pole.position.y = 1; umbGroup.add(pole);
          // canopy
          const canopy = new THREE.Mesh(
            new THREE.ConeGeometry(0.8, 0.4, 12),
            new THREE.MeshStandardMaterial({ color: umbrellaColors[u], roughness: 0.6 })
          );
          canopy.position.y = 2.1;
          canopy.rotation.x = Math.PI; // point down to make umbrella shape
          umbGroup.add(canopy);
          umbGroup.position.copy(pos);
          this._scene.add(umbGroup); this._sceneryObjects.push(umbGroup);
        }

        // Coral formations underwater (8 colorful branching shapes)
        const coralColors = [0xff4466, 0xff8844, 0xaa44ff, 0x44ddaa, 0xffaa44, 0xff66aa, 0x44aaff, 0xaaff44];
        for (let cr = 0; cr < 8; cr++) {
          const idx = Math.floor(rng() * track.points.length);
          const pt = track.points[idx % track.points.length];
          const side = rng() > 0.5 ? 1 : -1;
          const dist = pt.width / 2 + 8 + rng() * 15;
          const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
          const coralGroup = new THREE.Group();
          const coralMat = new THREE.MeshStandardMaterial({ color: coralColors[cr], roughness: 0.6 });
          // main stalk
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.8, 6), coralMat);
          stalk.position.y = 0.4; coralGroup.add(stalk);
          // branches
          const branchCount = 3 + Math.floor(rng() * 3);
          for (let br = 0; br < branchCount; br++) {
            const branch = new THREE.Mesh(
              new THREE.CylinderGeometry(0.04, 0.08, 0.4 + rng() * 0.3, 5),
              coralMat
            );
            const ba = (br / branchCount) * Math.PI * 2;
            branch.position.set(Math.cos(ba) * 0.15, 0.5 + rng() * 0.3, Math.sin(ba) * 0.15);
            branch.rotation.z = (rng() - 0.5) * 0.8;
            coralGroup.add(branch);
          }
          // tip spheres
          for (let t = 0; t < 2; t++) {
            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), coralMat);
            tip.position.set((rng() - 0.5) * 0.3, 0.7 + rng() * 0.2, (rng() - 0.5) * 0.3);
            coralGroup.add(tip);
          }
          coralGroup.position.copy(pos);
          coralGroup.position.y = -1.8; // underwater
          this._scene.add(coralGroup); this._sceneryObjects.push(coralGroup);
        }
      }
    }
  }

  private _buildStartLine(): void {
    const pt = this._track.points[0];
    const hw = pt.width / 2;

    // checkerboard
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 8;
    const ctx = canvas.getContext("2d")!;
    for (let x = 0; x < 64; x++) for (let y = 0; y < 8; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#ffffff" : "#111111";
      ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    const startMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(pt.width, 3),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.8, roughness: 0.6 })
    );
    startMesh.rotation.x = -Math.PI / 2;
    startMesh.position.copy(pt.pos); startMesh.position.y += 0.05;
    const angle = Math.atan2(pt.dir.x, pt.dir.z);
    startMesh.rotation.z = angle;
    this._scene.add(startMesh);

    // arch with poles
    const archMat = new THREE.MeshStandardMaterial({ color: COL_GOLD, roughness: 0.25, metalness: 0.8 });
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6, 8), archMat);
      pole.position.copy(pt.pos).add(pt.right.clone().multiplyScalar(s * hw));
      pole.position.y = 3; pole.castShadow = true; this._scene.add(pole);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(pt.width + 1, 0.4, 0.4), archMat);
    beam.position.copy(pt.pos); beam.position.y = 6; beam.rotation.y = angle; beam.castShadow = true;
    this._scene.add(beam);

    // banner text
    const bc = document.createElement("canvas");
    bc.width = 256; bc.height = 48;
    const bctx = bc.getContext("2d")!;
    bctx.fillStyle = "#1a1020"; bctx.fillRect(0, 0, 256, 48);
    bctx.fillStyle = "#daa520"; bctx.font = "bold 28px monospace"; bctx.textAlign = "center";
    bctx.fillText(this._track.name, 128, 34);
    const bMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(pt.width - 2, 1.5),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, roughness: 0.5 })
    );
    bMesh.position.copy(pt.pos); bMesh.position.y = 5; bMesh.rotation.y = angle;
    this._scene.add(bMesh);
  }

  private _buildStars(): void {
    const positions = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const theta = Math.random() * Math.PI * 2, phi = Math.random() * Math.PI * 0.5, r = 200;
      positions[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      positions[i * 3 + 1] = Math.cos(phi) * r;
      positions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    this._scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true })));
  }

  // ── racer spawning ─────────────────────────────────────────────────────────

  private _spawnRacers(): void {
    this._racers = [];
    const startPt = this._track.points[0];
    const diff = DIFFICULTY_SETTINGS[this._difficulty];

    for (let i = 0; i < AI_COUNT + 1; i++) {
      const isPlayer = i === 0;
      const color = isPlayer ? CHARIOT_COLORS[this._playerColorIdx].color : AI_COLORS[i - 1];
      const name = isPlayer ? "YOU" : AI_NAMES[i - 1];
      const mesh = buildChariotMesh(color, isPlayer);

      const col = i % 2, row = Math.floor(i / 2);
      const lateralOff = (col - 0.5) * 4, forwardOff = -row * 5 - 2;
      const spawnPos = startPt.pos.clone()
        .add(startPt.right.clone().multiplyScalar(lateralOff))
        .add(startPt.dir.clone().multiplyScalar(forwardOff));
      spawnPos.y = GROUND_Y;
      mesh.position.copy(spawnPos);
      const angle = Math.atan2(startPt.dir.x, startPt.dir.z);
      mesh.rotation.y = angle;
      this._scene.add(mesh);

      // name tag for AI
      let nameTag: THREE.Sprite | null = null;
      if (!isPlayer) {
        nameTag = makeNameTag(name, color);
        nameTag.position.set(0, 3.5, 0);
        mesh.add(nameTag);
      }

      // shield bubble: solid inner + wireframe outer for layered look
      const shieldGeo = new THREE.SphereGeometry(2.5, 20, 14);
      const shieldCol = isPlayer ? 0x4488ff : new THREE.Color(color).lerp(new THREE.Color(0x4488ff), 0.5).getHex();
      const shieldMat = new THREE.MeshStandardMaterial({
        color: shieldCol, emissive: shieldCol, emissiveIntensity: 0.5,
        transparent: true, opacity: 0, roughness: 0.1, metalness: 0.3,
        side: THREE.DoubleSide, toneMapped: false,
      });
      const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      shieldMesh.position.set(0, 1, 0);
      mesh.add(shieldMesh);
      // wireframe overlay
      const shieldWire = new THREE.Mesh(
        new THREE.SphereGeometry(2.6, 12, 8),
        new THREE.MeshBasicMaterial({ color: shieldCol, wireframe: true, transparent: true, opacity: 0 })
      );
      shieldWire.name = "shieldWire";
      shieldWire.position.set(0, 1, 0);
      mesh.add(shieldWire);

      // headlight (visible at night/storm, subtle otherwise)
      const headlightIntensity = (this._weather === "night" || this._weather === "storm") ? 1.2 : 0.2;
      if (headlightIntensity > 0.5 || isPlayer) {
        const headlight = new THREE.SpotLight(isPlayer ? 0xffeedd : 0xddccaa, headlightIntensity, 30, 0.5, 0.6);
        headlight.position.set(0, 1.5, -3.5);
        headlight.target.position.set(0, 0, -15);
        mesh.add(headlight);
        mesh.add(headlight.target);
        // headlight glow mesh
        const glowMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 10),
          new THREE.MeshBasicMaterial({ color: 0xffeedd })
        );
        glowMesh.position.set(0, 1.5, -3.5);
        mesh.add(glowMesh);
      }

      // ground shadow circle (fake shadow for better grounding)
      const shadowGeo = new THREE.CircleGeometry(2.5, 16);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
      const shadowCircle = new THREE.Mesh(shadowGeo, shadowMat);
      shadowCircle.rotation.x = -Math.PI / 2;
      shadowCircle.position.set(0, 0.02, 0);
      shadowCircle.name = "groundShadow";
      mesh.add(shadowCircle);

      const rng = mulberry32(i * 777 + this._currentTrackIdx * 13);
      const [aiMin, aiMax] = diff.aiSpeedRange;

      const racer: Racer = {
        mesh, pos: spawnPos.clone(), speed: 0, steer: 0, angle,
        trackProgress: forwardOff < 0 ? this._track.totalLength + forwardOff : 0,
        lap: 0, lapTimes: [], finished: false, finishTime: 0,
        drifting: false, driftTimer: 0, driftBoostTimer: 0,
        shieldTimer: 0, shieldMesh, boostTimer: 0, slowTimer: 0,
        whipTimer: 0, whipCooldown: 0, slipstreaming: false, damage: 0,
        airborne: false, airVelocityY: 0, inPit: false,
        wallHitCooldown: 0, collisionCooldown: 0,
        topSpeed: 0, powerUpsUsed: 0,
        powerUp: null, isPlayer, name, color, placement: i + 1, nameTag,
        aiSteerNoise: (rng() - 0.5) * 0.3,
        aiSpeedFactor: aiMin + rng() * (aiMax - aiMin),
        aiReactionDelay: rng() * 0.3,
        aiPersonality: isPlayer ? "balanced" : AI_PERSONALITIES[i - 1],
        aiRamCooldown: 0,
        horsePhase: rng() * Math.PI * 2,
        lastTrackIdx: 0,
      };

      this._racers.push(racer);
      if (isPlayer) this._player = racer;
    }
  }

  // ── power-up spawning ──────────────────────────────────────────────────────

  private _spawnPowerUps(): void {
    this._powerUps = [];
    const track = this._track;
    const rng = mulberry32(TRACK_DEFS[this._currentTrackIdx].seed + 500);

    for (let i = POWERUP_INTERVAL; i < track.points.length; i += POWERUP_INTERVAL) {
      const pt = track.points[i % track.points.length];
      const type = POWERUP_TYPES[Math.floor(rng() * POWERUP_TYPES.length)];
      const lateralOff = (rng() - 0.5) * pt.width * 0.5;
      const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(lateralOff));
      pos.y = POWERUP_FLOAT_HEIGHT;

      const puColor = POWERUP_COLORS[type];
      const puMat = new THREE.MeshStandardMaterial({
        color: puColor, emissive: puColor, emissiveIntensity: 2.5,
        toneMapped: false, metalness: 0.4, roughness: 0.15,
      });
      const whiteMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0, toneMapped: false,
      });
      const crystalMat = new THREE.MeshStandardMaterial({
        color: puColor, emissive: puColor, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.35, toneMapped: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Group() as THREE.Group & { rotation: THREE.Euler; position: THREE.Vector3 };
      mesh.position.copy(pos);
      this._scene.add(mesh);

      // Outer crystal shell (icosahedron — visible from distance)
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), crystalMat);
      mesh.add(shell);

      // Inner solid icon per type (scaled up for visibility)
      if (type === "boost") {
        // Large winged arrow
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0, 12), puMat);
        shaft.rotation.z = Math.PI / 2;
        mesh.add(shaft);
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 12), puMat);
        head.rotation.z = -Math.PI / 2; head.position.x = 0.7;
        mesh.add(head);
        // Fletching at back
        const fletch = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 12), puMat);
        fletch.rotation.z = Math.PI / 2; fletch.position.x = -0.6;
        mesh.add(fletch);
        // Swept wings
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.35), puMat);
          wing.position.set(0, side * 0.25, 0);
          wing.rotation.x = side * 0.3;
          mesh.add(wing);
          const wingTip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.2), puMat);
          wingTip.position.set(-0.3, side * 0.4, 0);
          wingTip.rotation.x = side * 0.5;
          mesh.add(wingTip);
        }
        // Speed lines (trailing)
        for (let sl = 0; sl < 3; sl++) {
          const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), whiteMat);
          line.rotation.z = Math.PI / 2;
          line.position.set(-0.9, (sl - 1) * 0.2, 0);
          line.material = new THREE.MeshStandardMaterial({ color: puColor, emissive: puColor, emissiveIntensity: 1.5, transparent: true, opacity: 0.5, toneMapped: false });
          mesh.add(line);
        }
      } else if (type === "shield") {
        // Large shield with boss/rivets
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), puMat);
        body.scale.set(0.85, 1.1, 0.35);
        mesh.add(body);
        // Shield border rim
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 12, 32), new THREE.MeshStandardMaterial({ color: 0x88bbff, emissive: 0x4488ff, emissiveIntensity: 1.0, metalness: 0.6, roughness: 0.2, toneMapped: false }));
        rim.scale.set(0.85, 1.1, 1);
        rim.position.z = 0.05;
        mesh.add(rim);
        // Central boss (raised circle)
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), whiteMat);
        boss.position.z = 0.22; boss.scale.z = 0.5;
        mesh.add(boss);
        // Cross emblem
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.1), whiteMat);
        crossV.position.z = 0.15; mesh.add(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.1), whiteMat);
        crossH.position.set(0, 0.12, 0.15); mesh.add(crossH);
        // Corner rivets
        for (let rv = 0; rv < 8; rv++) {
          const rvA = (rv / 8) * Math.PI * 2;
          const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xccddff, metalness: 0.7, roughness: 0.2, toneMapped: false }));
          rivet.position.set(Math.cos(rvA) * 0.45, Math.sin(rvA) * 0.5, 0.18);
          mesh.add(rivet);
        }
      } else if (type === "lightning") {
        // Large bold lightning bolt
        const boltMat = new THREE.MeshStandardMaterial({ color: 0xffff44, emissive: 0xffff00, emissiveIntensity: 4.0, toneMapped: false });
        // Main zigzag bolt shape (thicker, more visible)
        const boltParts = [
          { x: 0.15, y: 0.55, rx: -0.5, w: 0.22, h: 0.55 },
          { x: -0.05, y: 0.1, rx: 0.3, w: 0.28, h: 0.5 },
          { x: 0.1, y: -0.35, rx: -0.4, w: 0.22, h: 0.5 },
        ];
        for (const bp of boltParts) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(bp.w, bp.h, 0.15), boltMat);
          seg.position.set(bp.x, bp.y, 0);
          seg.rotation.z = bp.rx;
          mesh.add(seg);
        }
        // Pointed tip at bottom
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8), boltMat);
        tip.position.set(0.15, -0.7, 0); tip.rotation.z = 0.2;
        mesh.add(tip);
        // Electric crackling arcs around the bolt
        for (let arc = 0; arc < 6; arc++) {
          const arcMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3 + Math.random() * 0.3, 6),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffaa, emissiveIntensity: 3.0, toneMapped: false }));
          arcMesh.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.3);
          arcMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          mesh.add(arcMesh);
        }
        // Bright inner glow
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.3, toneMapped: false }));
        mesh.add(glow);
      } else if (type === "oil") {
        // Detailed Greek fire amphora
        const vaseMat = new THREE.MeshStandardMaterial({ color: 0x996644, roughness: 0.6, metalness: 0.15 });
        const vaseDarkMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 });
        // Body (lathe profile - use sphere scaled)
        const vaseBody = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 14), vaseMat);
        vaseBody.scale.set(1, 1.4, 1); vaseBody.position.y = -0.1;
        mesh.add(vaseBody);
        // Neck
        const vaseNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.35, 14), vaseMat);
        vaseNeck.position.y = 0.4; mesh.add(vaseNeck);
        // Lip/rim
        const vaseRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 10, 20), vaseMat);
        vaseRim.position.y = 0.58; vaseRim.rotation.x = Math.PI / 2; mesh.add(vaseRim);
        // Handles (two side handles)
        for (const hs of [-1, 1]) {
          const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 12, Math.PI), vaseDarkMat);
          handle.position.set(hs * 0.35, 0.25, 0);
          handle.rotation.z = hs * Math.PI / 2;
          mesh.add(handle);
        }
        // Decorative band around belly
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 20), vaseDarkMat);
        band.position.y = 0; band.rotation.x = Math.PI / 2; mesh.add(band);
        // Pattern dots on band
        for (let pd = 0; pd < 10; pd++) {
          const pda = (pd / 10) * Math.PI * 2;
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), vaseDarkMat);
          dot.position.set(Math.cos(pda) * 0.43, -0.1 + Math.sin(pd * 1.2) * 0.05, Math.sin(pda) * 0.43);
          mesh.add(dot);
        }
        // Big flames erupting from top
        const flameMat = new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 3.0, toneMapped: false });
        const flameInnerMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 3.5, toneMapped: false });
        // Central tall flame
        const mainFlame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 10), flameInnerMat);
        mainFlame.position.y = 0.85; mesh.add(mainFlame);
        // Ring of flames
        for (let fi = 0; fi < 6; fi++) {
          const fa = (fi / 6) * Math.PI * 2;
          const fh = 0.25 + Math.random() * 0.2;
          const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, fh, 8), flameMat);
          flame.position.set(Math.cos(fa) * 0.1, 0.6 + fh / 2, Math.sin(fa) * 0.1);
          mesh.add(flame);
        }
        // Fire glow light
        const fireLight = new THREE.PointLight(0xff4400, 0.8, 5);
        fireLight.position.y = 0.8; mesh.add(fireLight);
      }

      // Ground ring pattern (triple rings)
      for (let gr = 0; gr < 3; gr++) {
        const ringR = 0.7 + gr * 0.4;
        const ringOp = 0.35 - gr * 0.1;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(ringR - 0.06, ringR + 0.06, 32),
          new THREE.MeshStandardMaterial({ color: puColor, emissive: puColor, emissiveIntensity: 0.8, transparent: true, opacity: ringOp, side: THREE.DoubleSide, toneMapped: false })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -POWERUP_FLOAT_HEIGHT + 0.04 + gr * 0.01;
        mesh.add(ring);
      }

      // Vertical light beam (dual tapered)
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.15, 7, 12),
        new THREE.MeshBasicMaterial({ color: puColor, transparent: true, opacity: 0.1, toneMapped: false })
      );
      beam.position.y = 2; mesh.add(beam);
      // Inner bright beam
      const beamInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.06, 5, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, toneMapped: false })
      );
      beamInner.position.y = 1.5; mesh.add(beamInner);

      // Orbiting sparkles (6, larger)
      for (let sp = 0; sp < 6; sp++) {
        const sparkle = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.07, 0),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: puColor, emissiveIntensity: 2.0, toneMapped: false })
        );
        const spA = (sp / 6) * Math.PI * 2;
        sparkle.position.set(Math.cos(spA) * 1.0, Math.sin(spA * 2) * 0.4, Math.sin(spA) * 1.0);
        mesh.add(sparkle);
      }

      // Point light for the powerup itself
      const puLight = new THREE.PointLight(puColor, 0.6, 8);
      puLight.position.y = 0.5; mesh.add(puLight);

      let dist = 0;
      for (let j = 0; j < i && j < track.points.length - 1; j++) {
        dist += track.points[j].pos.distanceTo(track.points[j + 1].pos);
      }
      this._powerUps.push({ mesh, type, trackDist: dist, collected: false, respawnTimer: 0 });
    }
  }

  // ── update loop ────────────────────────────────────────────────────────────

  private _update(): void {
    // apply time scale (for slow-mo finish)
    this._dt *= this._timeScale;
    const dt = this._dt;

    // update fade overlay
    this._updateFade(this._dt);

    if (this._phase === "title") {
      const t = this._time * 0.25;
      this._camera.position.set(Math.cos(t) * 10, 4 + Math.sin(t * 0.7), Math.sin(t) * 10);
      this._camera.lookAt(0, 1, 0);
      return;
    }
    if (this._phase === "paused") return;

    // Flyover: camera orbits the track showing the layout
    if (this._phase === "flyover") {
      this._flyoverTimer -= dt;
      const t = 1 - this._flyoverTimer / this._flyoverDuration; // 0→1
      // Fly along the track at ~1/3 of the way through
      const trackLen = this._track.points.length;
      const flyIdx = Math.floor(t * trackLen * 0.8) % trackLen;
      const flyPt = this._track.points[flyIdx];
      const lookIdx = (flyIdx + 20) % trackLen;
      const lookPt = this._track.points[lookIdx];
      // High-up cinematic camera
      this._camera.position.set(
        flyPt.pos.x + flyPt.right.x * 8,
        flyPt.pos.y + 12,
        flyPt.pos.z + flyPt.right.z * 8,
      );
      this._camera.lookAt(lookPt.pos.x, lookPt.pos.y + 1, lookPt.pos.z);
      this._renderer.render(this._scene, this._camera);
      // Transition to countdown
      if (this._flyoverTimer <= 0) {
        this._phase = "countdown";
        this._countdownTimer = 3.5;
        this._updateHUDCenter("3");
        this._hudCenter.style.fontSize = "72px";
      }
      return;
    }

    if (this._phase === "countdown") {
      const prevNum = Math.ceil(this._countdownTimer);
      this._countdownTimer -= dt;
      const num = Math.ceil(this._countdownTimer);
      if (num > 0 && num <= 3) {
        this._updateHUDCenter(`${num}`);
        this._hudCenter.style.fontSize = "90px";
        if (num !== prevNum && num !== this._lastCountdownNum) {
          this._lastCountdownNum = num;
          this._audio.playCountdown(num);
          // pop-in animation: scale up then shrink
          this._hudCenter.style.transition = "transform 0.15s ease-out, opacity 0.1s";
          this._hudCenter.style.transform = "translate(-50%,-50%) scale(1.8)";
          this._hudCenter.style.opacity = "1";
          setTimeout(() => {
            this._hudCenter.style.transition = "transform 0.6s ease-in";
            this._hudCenter.style.transform = "translate(-50%,-50%) scale(0.9)";
            this._hudCenter.style.opacity = "0.6";
          }, 150);
        }
      } else if (this._countdownTimer <= 0) {
        if (prevNum > 0) {
          this._audio.playCountdown(0);
          this._goTime = this._time;
          this._startBoostAvailable = true;
          this._startBoostUsed = false;
          this._lastCountdownNum = -1;
        }
        this._updateHUDCenter("GO!");
        this._hudCenter.style.fontSize = "80px";
        this._hudCenter.style.color = "#44ff44";
        this._hudCenter.style.transform = "translate(-50%,-50%) scale(1.5)";
        this._hudCenter.style.textShadow = "0 0 40px rgba(68,255,68,0.8), 0 0 80px rgba(68,255,68,0.4)";
        if (this._countdownTimer < -0.6) {
          this._phase = "racing";
          this._updateHUDCenter("");
          this._hudCenter.style.fontSize = "28px";
          this._hudCenter.style.color = "#daa520";
          this._hudCenter.style.transform = "translate(-50%,-50%)";
          this._hudCenter.style.textShadow = "0 0 20px rgba(218,165,32,0.7)";
          this._hudCenter.style.transition = "none";
          this._hudCenter.style.opacity = "1";
        }
      }
      this._updateCamera(dt);
      this._animateHorses(dt);
      return;
    }

    if (this._phase === "racing") {
      this._raceTime += dt;
      this._updatePlayerInput(dt);
      this._updateRacerPhysics(this._player, dt);

      for (const racer of this._racers) {
        if (!racer.isPlayer) {
          this._updateAI(racer, dt);
          this._updateRacerPhysics(racer, dt);
        }
      }

      this._updateRacerCollisions();
      this._updatePowerUps(dt);
      this._updateOilSlicks(dt);
      this._updateSlipstream(dt);
      this._updateLapTracking();
      this._updatePlacements();
      this._updateWrongWay();
      this._updateParticles(dt);
      this._updateFlameTrail(dt);
      this._updateAnnouncer(dt);
      this._updateGhostRecord(dt);
      this._updateGhostPlayback(dt);
      this._updateRain(dt);
      this._updateSkidMarks(dt);
      this._updateAIDust();
      this._updateRamps(dt);
      this._updatePitStop(dt);
      this._updateDamageVisuals();
      this._updateOvertakeTracking();
      this._updateBrakeLights();
      this._updatePositionFlash(dt);
      this._updateFinalLapIntensity();
      this._updatePickupFlash(dt);
      this._trackStats();
      this._checkAchievements();

      // continuous audio
      const speedPct = this._player.speed / MAX_SPEED;
      const isBoosting = this._player.boostTimer > 0 || this._player.driftBoostTimer > 0 || this._player.whipTimer > 0;
      this._audio.updateEngine(speedPct, isBoosting);
      this._audio.updateWind(speedPct);
      this._audio.updateGallop(dt, speedPct);

      if (this._player.finished) {
        this._phase = "finish";
        // slow-mo finish + cinematic sweep
        this._timeScale = 0.3;
        this._finishCamSweep = true;
        this._finishCamAngle = this._player.angle;
        // delay results until slow-mo ends
        this._finishTimeout = setTimeout(() => {
          this._finishTimeout = null;
          this._timeScale = 1.0;
          this._finishCamSweep = false;
          this._showResults();
        }, 2500);
      }
    }

    if (this._phase === "finish") {
      for (const racer of this._racers) {
        if (!racer.isPlayer && !racer.finished) {
          this._updateAI(racer, dt);
          this._updateRacerPhysics(racer, dt);
        }
      }
      this._updateParticles(dt);
    }

    this._animateHorses(dt);
    this._updateCamera(dt);
    this._updateHUD();
    this._animatePowerUps(dt);
    this._updateShieldVisuals(dt);
    this._updateEnvironmentEffects(dt);
  }

  // ── player input ───────────────────────────────────────────────────────────

  private _updatePlayerInput(dt: number): void {
    const p = this._player;
    if (p.finished) return;

    if (this._keys.has("w") || this._keys.has("arrowup") || this._touchState.accel) {
      p.speed += ACCEL * dt;
      // start boost check
      if (this._startBoostAvailable && !this._startBoostUsed) {
        const timeSinceGo = this._time - this._goTime;
        if (timeSinceGo <= START_BOOST_WINDOW) {
          p.speed += START_BOOST_SPEED;
          p.boostTimer = 1.0;
          this._startBoostUsed = true;
          this._startBoostAvailable = false;
          this._shakeIntensity = 0.2;
          this._audio.playStartBoost();
          this._announce("PERFECT START!");
          this._spawnSparks(p.pos.clone(), 20);
          this._perfectStartDone = true;
        } else {
          this._startBoostAvailable = false;
        }
      }
    }
    if (this._keys.has("s") || this._keys.has("arrowdown") || this._touchState.brake) p.speed -= BRAKE_FORCE * dt;

    const steerInput = (this._keys.has("a") || this._keys.has("arrowleft") || this._touchState.left ? 1 : 0) -
      (this._keys.has("d") || this._keys.has("arrowright") || this._touchState.right ? 1 : 0);

    // drift
    const wantDrift = (this._keys.has(" ") || this._touchState.drift) && Math.abs(steerInput) > 0 && p.speed > MAX_SPEED * 0.4;
    if (wantDrift && !p.drifting) {
      p.drifting = true; p.driftTimer = 0;
      this._audio.playDriftStart();
    }
    if (!wantDrift && p.drifting) {
      if (p.driftTimer >= DRIFT_BOOST_TIME) {
        p.driftBoostTimer = 1.0;
        this._shakeIntensity = 0.15;
        this._spawnSparks(p.pos.clone(), 12);
        this._audio.playDriftBoost();
      }
      p.drifting = false; p.driftTimer = 0;
    }
    if (p.drifting) { p.driftTimer += dt; this._totalDriftTime += dt; }

    const steerMult = p.drifting ? DRIFT_STEER_MULT : 1.0;
    if (steerInput !== 0) {
      p.steer += steerInput * STEER_SPEED * steerMult * dt;
      p.steer = Math.max(-MAX_STEER, Math.min(MAX_STEER, p.steer));
    } else {
      if (Math.abs(p.steer) < STEER_RETURN * dt) p.steer = 0;
      else p.steer -= Math.sign(p.steer) * STEER_RETURN * dt;
    }

    // whip cooldown
    if (p.whipCooldown > 0) p.whipCooldown -= dt;
    if (p.whipTimer > 0) p.whipTimer -= dt;
  }

  private _whip(): void {
    const p = this._player;
    if (p.whipCooldown > 0 || p.finished) return;
    p.whipTimer = WHIP_DURATION;
    p.whipCooldown = WHIP_COOLDOWN;
    p.speed += WHIP_BOOST;
    this._shakeIntensity = 0.1;
    this._audio.playWhipCrack();
    this._totalWhips++;

    // show whip arm briefly
    const whipMesh = p.mesh.getObjectByName("whip");
    if (whipMesh) {
      whipMesh.visible = true;
      setTimeout(() => { whipMesh.visible = false; }, 300);
    }
  }

  // ── racer physics ──────────────────────────────────────────────────────────

  private _updateRacerPhysics(racer: Racer, dt: number): void {
    let maxSpd = MAX_SPEED * (racer.isPlayer ? 1 : racer.aiSpeedFactor);
    if (racer.boostTimer > 0) { maxSpd += DRIFT_BOOST_SPEED; racer.boostTimer -= dt; }
    if (racer.driftBoostTimer > 0) { maxSpd += DRIFT_BOOST_SPEED; racer.driftBoostTimer -= dt; }
    if (racer.whipTimer > 0) { maxSpd += WHIP_BOOST * 0.5; racer.whipTimer -= dt; }
    if (racer.slowTimer > 0) { maxSpd *= 0.5; racer.slowTimer -= dt; }
    if (racer.wallHitCooldown > 0) racer.wallHitCooldown -= dt;
    if (racer.collisionCooldown > 0) racer.collisionCooldown -= dt;

    // damage speed penalty
    const dmgPenalty = 1 - (racer.damage / DAMAGE_MAX) * DAMAGE_SPEED_PENALTY;
    maxSpd *= dmgPenalty;

    racer.speed = Math.max(-MAX_SPEED * 0.3, Math.min(maxSpd, racer.speed));
    const dragMult = racer.drifting ? DRIFT_DRAG_MULT : 1.0;
    racer.speed -= racer.speed * DRAG * dragMult * dt;

    // weather grip affects turning
    const grip = WEATHER_GRIP[this._weather];
    const turnRate = racer.steer * (racer.speed / MAX_SPEED) * 2.5 * grip;
    racer.angle += turnRate * dt;
    racer.pos.x += Math.sin(racer.angle) * racer.speed * dt;
    racer.pos.z += Math.cos(racer.angle) * racer.speed * dt;

    // track constraint
    const nearest = this._findNearestTrackPoint(racer.pos);
    if (nearest) {
      const pt = this._track.points[nearest.index];
      const toRacer = new THREE.Vector3().subVectors(racer.pos, pt.pos);
      const lateral = toRacer.dot(pt.right);
      const hw = pt.width / 2;

      if (Math.abs(lateral) > hw) {
        // Push racer inward (not just to edge — slightly inside to prevent sticking)
        racer.pos.copy(pt.pos).add(pt.right.clone().multiplyScalar(Math.sign(lateral) * (hw - 0.5)));
        racer.speed *= 0.88; // gentle speed loss on wall scrape
        // Only apply wall damage once per impact (cooldown-based)
        if (racer.wallHitCooldown <= 0) {
          racer.damage = Math.min(DAMAGE_MAX, racer.damage + WALL_DAMAGE);
          racer.wallHitCooldown = 0.5; // 500ms cooldown between wall damage ticks
        }
        // Gentle nudge away from wall (not a dramatic deflection)
        const wallNormalAngle = Math.atan2(pt.right.x, pt.right.z) * -Math.sign(lateral);
        const angleDiff = racer.angle - wallNormalAngle;
        racer.angle -= angleDiff * 0.08;
        if (racer.isPlayer) {
          this._spawnSparks(racer.pos.clone(), 4);
          this._shakeIntensity = Math.max(this._shakeIntensity, 0.08);
          this._audio.playWallHit();
          this._wallHits++;
        }
      }

      // terrain grip: off-road penalty near track edges
      const lateralPct = Math.abs(lateral) / hw;
      if (lateralPct > 0.85) {
        // near edge: reduced grip
        const edgePenalty = (lateralPct - 0.85) / 0.15; // 0..1 at edge
        racer.speed -= racer.speed * edgePenalty * 0.8 * dt;
      }

      const bankEffect = Math.max(-1.2, Math.min(1.2, pt.bank * 0.08));
      racer.pos.y = pt.pos.y + GROUND_Y + bankEffect * (lateral / hw) * 0.3;
      racer.trackProgress = nearest.dist;
      racer.lastTrackIdx = nearest.index;

      // tilt chariot with banking
      racer.mesh.rotation.z = -racer.steer * 0.15 + bankEffect * 0.05;
    }

    racer.mesh.position.copy(racer.pos);
    racer.mesh.rotation.y = racer.angle + Math.PI;

    // dust
    if (racer.isPlayer && racer.speed > MAX_SPEED * 0.5 && Math.random() > 0.65) {
      this._spawnDust(racer.pos.clone());
    }
    // drift sparks
    if (racer.isPlayer && racer.drifting && Math.random() > 0.4) {
      this._spawnSparks(racer.pos.clone(), 2);
    }

    // check oil slick collision
    for (const slick of this._oilSlicks) {
      if (slick.life <= 0) continue;
      const d = racer.pos.distanceTo(slick.pos);
      if (d < 3 && racer.shieldTimer <= 0 && racer.slowTimer <= 0) {
        racer.slowTimer = 1.5;
        racer.speed *= 0.4;
        if (racer.isPlayer) {
          this._shakeIntensity = Math.max(this._shakeIntensity, 0.25);
          this._audio.playOilSlip();
        }
      }
    }
  }

  private _findNearestTrackPoint(pos: THREE.Vector3): { index: number; dist: number } | null {
    const pts = this._track.points;
    let bestDist = Infinity, bestIdx = 0;

    const step = Math.max(1, Math.floor(pts.length / 200));
    for (let i = 0; i < pts.length; i += step) {
      const d = pos.distanceToSquared(pts[i].pos);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }

    const searchRange = step * 2;
    bestDist = Infinity;
    for (let i = bestIdx - searchRange; i <= bestIdx + searchRange; i++) {
      const idx = ((i % pts.length) + pts.length) % pts.length;
      const d = pos.distanceToSquared(pts[idx].pos);
      if (d < bestDist) { bestDist = d; bestIdx = idx; }
    }

    return { index: bestIdx, dist: this._trackCumDist[bestIdx] ?? 0 };
  }

  // ── wrong-way detection ────────────────────────────────────────────────────

  private _updateWrongWay(): void {
    const p = this._player;
    if (p.finished) { this._wrongWay = false; return; }
    const pt = this._track.points[p.lastTrackIdx];
    const forward = new THREE.Vector3(Math.sin(p.angle), 0, Math.cos(p.angle));
    const dot = forward.dot(pt.dir);
    this._wrongWay = dot < -0.3 && p.speed > 3;
  }

  // ── AI ─────────────────────────────────────────────────────────────────────

  private _updateAI(racer: Racer, dt: number): void {
    if (racer.finished) { racer.speed *= 0.95; return; }

    const pts = this._track.points;
    const nearest = this._findNearestTrackPoint(racer.pos);
    if (!nearest) return;

    const personality = racer.aiPersonality;
    racer.aiRamCooldown = Math.max(0, racer.aiRamCooldown - dt);

    // look-ahead distance varies by personality
    const baseLookAhead = personality === "speedster" ? 20 : personality === "aggressive" ? 10 : 15;
    const lookAhead = baseLookAhead + racer.speed * 0.3;
    let targetIdx = nearest.index, accDist = 0;
    while (accDist < lookAhead) {
      const nextIdx = (targetIdx + 1) % pts.length;
      accDist += pts[targetIdx].pos.distanceTo(pts[nextIdx].pos);
      targetIdx = nextIdx;
    }

    const toTarget = new THREE.Vector3().subVectors(pts[targetIdx].pos, racer.pos);
    const targetAngle = Math.atan2(toTarget.x, toTarget.z);
    let angleDiff = targetAngle - racer.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    racer.steer = Math.max(-MAX_STEER, Math.min(MAX_STEER, angleDiff * 1.5 + racer.aiSteerNoise * 0.1));

    // speed behavior by personality
    const speedMult = personality === "speedster" ? 1.05 : personality === "defensive" ? 0.92 : 1.0;
    if (racer.speed < MAX_SPEED * racer.aiSpeedFactor * speedMult) racer.speed += ACCEL * 0.9 * dt;

    // Rubber-banding: AI adjusts speed based on distance to player (lap-aware)
    const player = this._player;
    if (player && !player.finished) {
      const totalTrackLen = this._track.totalLength || 1;
      const aiTotal = (racer.lap || 0) * totalTrackLen + racer.trackProgress;
      const playerTotal = (player.lap || 0) * totalTrackLen + player.trackProgress;
      const distToPlayer = aiTotal - playerTotal;
      if (distToPlayer > 30) {
        // AI is far ahead → slow down slightly (let player catch up)
        racer.speed *= 0.995;
      } else if (distToPlayer < -40) {
        // AI is far behind → speed boost to keep race competitive
        racer.speed = Math.min(MAX_SPEED * 1.1, racer.speed + ACCEL * 0.4 * dt);
      }
    }

    // brake behavior
    const brakeSensitivity = personality === "speedster" ? 0.7 : personality === "defensive" ? 0.35 : 0.5;
    if (Math.abs(angleDiff) > brakeSensitivity && racer.speed > MAX_SPEED * 0.6) {
      racer.speed -= BRAKE_FORCE * (personality === "defensive" ? 0.7 : 0.5) * dt;
    }

    // AI drifting: drift through sharp corners for speed boost
    const driftThreshold = personality === "speedster" ? 0.35 : personality === "aggressive" ? 0.5 : personality === "defensive" ? 0.6 : 0.45;
    const wantAIDrift = Math.abs(angleDiff) > driftThreshold && racer.speed > MAX_SPEED * 0.4 && Math.abs(racer.steer) > 0.2;
    if (wantAIDrift && !racer.drifting) {
      racer.drifting = true; racer.driftTimer = 0;
    }
    if (!wantAIDrift && racer.drifting) {
      if (racer.driftTimer >= DRIFT_BOOST_TIME) {
        racer.driftBoostTimer = 0.8;
      }
      racer.drifting = false; racer.driftTimer = 0;
    }
    if (racer.drifting) racer.driftTimer += dt;

    // aggressive: steer toward nearby opponents to ram
    if (personality === "aggressive" && racer.aiRamCooldown <= 0) {
      for (const other of this._racers) {
        if (other === racer) continue;
        const dist = racer.pos.distanceTo(other.pos);
        if (dist < 6 && dist > 2) {
          const toOther = new THREE.Vector3().subVectors(other.pos, racer.pos).normalize();
          const ramAngle = Math.atan2(toOther.x, toOther.z);
          let ramDiff = ramAngle - racer.angle;
          while (ramDiff > Math.PI) ramDiff -= Math.PI * 2;
          while (ramDiff < -Math.PI) ramDiff += Math.PI * 2;
          if (Math.abs(ramDiff) < 0.8) {
            racer.steer += ramDiff * 0.5;
            racer.steer = Math.max(-MAX_STEER, Math.min(MAX_STEER, racer.steer));
          }
          break;
        }
      }
    }

    // defensive: use shield power-up ASAP, avoid nearby racers
    if (personality === "defensive") {
      if (racer.powerUp === "shield") {
        racer.shieldTimer = 5.0; racer.powerUp = null;
      }
      // steer away from very close opponents
      for (const other of this._racers) {
        if (other === racer) continue;
        const dist = racer.pos.distanceTo(other.pos);
        if (dist < 4) {
          const away = new THREE.Vector3().subVectors(racer.pos, other.pos).normalize();
          racer.steer += away.dot(pts[nearest.index].right) * 0.3;
          break;
        }
      }
    }

    // whip frequency by personality
    const whipChance = personality === "speedster" ? 0.008 : personality === "aggressive" ? 0.006 : 0.004;
    if (racer.whipCooldown <= 0 && Math.random() < whipChance) {
      racer.whipTimer = WHIP_DURATION; racer.whipCooldown = WHIP_COOLDOWN;
      racer.speed += WHIP_BOOST;
    }
    if (racer.whipCooldown > 0) racer.whipCooldown -= dt;
    // whipTimer is already decremented in _updateRacerPhysics — don't double-decrement here

    // power-up usage by personality
    const puChance = personality === "tactical" ? 0.025 : personality === "aggressive" ? 0.015 : 0.01;
    if (racer.powerUp && Math.random() < puChance) {
      // tactical: save lightning for 1st place, use oil when ahead
      if (personality === "tactical") {
        if (racer.powerUp === "lightning" && racer.placement > 2) this._useAIPowerUp(racer);
        else if (racer.powerUp === "oil" && racer.placement <= 3) this._useAIPowerUp(racer);
        else if (racer.powerUp === "boost" || racer.powerUp === "shield") this._useAIPowerUp(racer);
      } else {
        this._useAIPowerUp(racer);
      }
    }

    // rubber-banding
    const diff = DIFFICULTY_SETTINGS[this._difficulty];
    if (racer.placement > 4) racer.speed += diff.rubberBand * dt;
  }

  private _useAIPowerUp(racer: Racer): void {
    if (!racer.powerUp) return;
    switch (racer.powerUp) {
      case "boost": racer.boostTimer = 2.0; break;
      case "shield": racer.shieldTimer = 5.0; break;
      case "lightning": {
        const ahead = this._racers.find(r => r !== racer && r.placement === racer.placement - 1);
        if (ahead && ahead.shieldTimer <= 0) { ahead.slowTimer = 2.0; ahead.speed *= 0.4; }
        break;
      }
      case "oil":
        this._spawnOilSlick(racer.pos.clone());
        break;
    }
    racer.powerUp = null;
  }

  // ── power-up usage (player) ────────────────────────────────────────────────

  private _usePowerUp(): void {
    const p = this._player;
    if (!p.powerUp) return;

    switch (p.powerUp) {
      case "boost":
        p.boostTimer = 2.5;
        this._spawnSparks(p.pos.clone(), 15);
        this._shakeIntensity = 0.15;
        this._audio.playBoost();
        this._announce("MERLIN'S HASTE!");
        break;
      case "shield":
        p.shieldTimer = 6.0;
        this._audio.playShieldActivate();
        this._announce("HOLY SHIELD!");
        break;
      case "lightning": {
        const ahead = this._racers.find(r => !r.isPlayer && r.placement === p.placement - 1);
        if (ahead && ahead.shieldTimer <= 0) {
          ahead.slowTimer = 3.0; ahead.speed *= 0.3;
          this._spawnLightningBolt(ahead);
          this._shakeIntensity = 0.2;
          this._audio.playLightningStrike();
          this._announce(`THUNDER BOLT hits ${ahead.name}!`);
        }
        break;
      }
      case "oil":
        this._spawnOilSlick(p.pos.clone());
        this._audio.playOilDrop();
        break;
    }
    p.powerUp = null;
    this._playerPowerUpsUsed++;
  }

  private _spawnLightningBolt(target: Racer): void {
    // vertical lightning bolt on target
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BoxGeometry(0.15, 2, 0.15);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffff44, emissive: 0xffff44, emissiveIntensity: 3.0, transparent: true, opacity: 1.0, toneMapped: false });
      const bolt = new THREE.Mesh(geo, mat);
      bolt.position.copy(target.pos);
      bolt.position.y = 2 + i * 2.5;
      bolt.position.x += (Math.random() - 0.5) * 2;
      bolt.position.z += (Math.random() - 0.5) * 2;
      bolt.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);
      this._scene.add(bolt);
      this._particles.push({
        mesh: bolt,
        vel: new THREE.Vector3(0, -5, 0),
        life: 0.6,
        maxLife: 0.6,
      });
    }
    this._spawnSparks(target.pos.clone(), 25);
  }

  // ── oil slick system ───────────────────────────────────────────────────────

  private _spawnOilSlick(pos: THREE.Vector3): void {
    const geo = new THREE.CircleGeometry(2.5, 12);
    const mat = new THREE.MeshLambertMaterial({
      color: 0x222222, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos); mesh.position.y = 0.05;
    this._scene.add(mesh);
    this._oilSlicks.push({ mesh, pos: pos.clone(), life: 12 });
  }

  private _updateOilSlicks(dt: number): void {
    for (let i = this._oilSlicks.length - 1; i >= 0; i--) {
      const slick = this._oilSlicks[i];
      slick.life -= dt;
      if (slick.life <= 0) {
        this._scene.remove(slick.mesh);
        slick.mesh.geometry.dispose();
        (slick.mesh.material as THREE.Material).dispose();
        this._oilSlicks.splice(i, 1);
      } else if (slick.life < 3) {
        // fade out
        (slick.mesh.material as THREE.MeshLambertMaterial).opacity = slick.life / 3 * 0.7;
      }
    }
  }

  // ── shield visuals ─────────────────────────────────────────────────────────

  private _updateShieldVisuals(_dt: number): void {
    for (const racer of this._racers) {
      if (!racer.shieldMesh) continue;
      const mat = racer.shieldMesh.material as THREE.MeshStandardMaterial;
      const wire = racer.mesh.getObjectByName("shieldWire");
      if (racer.shieldTimer > 0) {
        const pulse = 0.12 + Math.sin(this._time * 6) * 0.06;
        mat.opacity = pulse;
        mat.emissiveIntensity = 0.3 + Math.sin(this._time * 8) * 0.2;
        racer.shieldMesh.rotation.y += _dt * 2;
        racer.shieldMesh.scale.setScalar(1 + Math.sin(this._time * 4) * 0.03);
        if (wire) {
          (wire as THREE.Mesh).rotation.y -= _dt * 1.5;
          ((wire as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = pulse * 0.6;
        }
        racer.shieldTimer -= _dt;
      } else {
        mat.opacity = 0;
        if (wire) ((wire as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  }

  // ── collisions ─────────────────────────────────────────────────────────────

  private _updateRacerCollisions(): void {
    for (let i = 0; i < this._racers.length; i++) {
      for (let j = i + 1; j < this._racers.length; j++) {
        const a = this._racers[i], b = this._racers[j];
        const dist = a.pos.distanceTo(b.pos);
        if (dist < 2.5) {
          const dir = new THREE.Vector3().subVectors(a.pos, b.pos).normalize();
          const overlap = 2.5 - dist;
          a.pos.add(dir.clone().multiplyScalar(overlap * 0.5));
          b.pos.add(dir.clone().multiplyScalar(-overlap * 0.5));
          const avgSpeed = (a.speed + b.speed) / 2;
          a.speed = a.speed * 0.7 + avgSpeed * 0.3;
          b.speed = b.speed * 0.7 + avgSpeed * 0.3;
          // Only apply collision damage with cooldown to prevent per-frame stacking
          if (a.collisionCooldown <= 0) {
            a.damage = Math.min(DAMAGE_MAX, a.damage + COLLISION_DAMAGE);
            a.collisionCooldown = 0.5;
          }
          if (b.collisionCooldown <= 0) {
            b.damage = Math.min(DAMAGE_MAX, b.damage + COLLISION_DAMAGE);
            b.collisionCooldown = 0.5;
          }
          const mid = a.pos.clone().add(b.pos).multiplyScalar(0.5);
          this._spawnSparks(mid, 4);
          if (a.isPlayer || b.isPlayer) {
            this._shakeIntensity = Math.max(this._shakeIntensity, 0.12);
            this._audio.playChariotCollision();
          }
        }
      }
    }
  }

  // ── power-up collection ────────────────────────────────────────────────────

  private _updatePowerUps(dt: number): void {
    for (const pu of this._powerUps) {
      if (pu.collected) {
        pu.respawnTimer -= dt;
        if (pu.respawnTimer <= 0) { pu.collected = false; pu.mesh.visible = true; }
        continue;
      }
      for (const racer of this._racers) {
        if (racer.powerUp) continue;
        if (racer.pos.distanceTo(pu.mesh.position) < 2.5) {
          racer.powerUp = pu.type;
          pu.collected = true; pu.mesh.visible = false; pu.respawnTimer = 10;
          if (racer.isPlayer) {
            this._audio.playPowerUpCollect();
            this._pickupFlashTimer = 0.3;
            // brief scale pulse on player chariot
            racer.mesh.scale.setScalar(1.08);
            setTimeout(() => { racer.mesh.scale.setScalar(1); }, 150);
          }
          break;
        }
      }
    }
  }

  private _animatePowerUps(_dt: number): void {
    for (const pu of this._powerUps) {
      if (!pu.collected) {
        pu.mesh.rotation.y += _dt * 2;
        pu.mesh.position.y = POWERUP_FLOAT_HEIGHT + Math.sin(this._time * 3 + pu.trackDist) * 0.3;
      }
    }
  }

  // ── lap tracking ───────────────────────────────────────────────────────────

  private _updateLapTracking(): void {
    const totalLen = this._track.totalLength;
    for (const racer of this._racers) {
      if (racer.finished) continue;
      const progress = racer.trackProgress / totalLen;
      const lastProg = this._lastProgress.get(racer) ?? progress;

      if (lastProg > 0.85 && progress < 0.15) {
        racer.lap++;
        racer.lapTimes.push(this._raceTime);
        if (racer.isPlayer && racer.lap < LAPS_PER_RACE) {
          this._hudCenter.textContent = `LAP ${racer.lap + 1}`;
          this._hudCenter.style.fontSize = "48px";
          this._audio.playLapComplete();
          if (racer.lap === LAPS_PER_RACE - 1) this._announce("FINAL LAP!");
          setTimeout(() => { if (this._phase === "racing") this._hudCenter.textContent = ""; }, 1200);
        }
        if (racer.lap >= LAPS_PER_RACE) {
          racer.finished = true; racer.finishTime = this._raceTime;
        }
      }
      if (lastProg < 0.15 && progress > 0.85 && racer.lap > 0) {
        racer.lap--; racer.lapTimes.pop();
      }
      this._lastProgress.set(racer, progress);
    }
  }

  // ── placements ─────────────────────────────────────────────────────────────

  private _updatePlacements(): void {
    const sorted = [...this._racers].sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      return (b.lap * this._track.totalLength + b.trackProgress) - (a.lap * this._track.totalLength + a.trackProgress);
    });
    for (let i = 0; i < sorted.length; i++) sorted[i].placement = i + 1;
  }

  // ── camera ─────────────────────────────────────────────────────────────────

  private _camRoll = 0;
  private _camHeightOffset = 0;

  private _updateCamera(dt: number): void {
    const p = this._player;

    // finish line cinematic sweep: orbit around the player
    if (this._finishCamSweep) {
      this._finishCamAngle += dt * 1.2;
      const orbitDist = 10;
      const tx = p.pos.x + Math.sin(this._finishCamAngle) * orbitDist;
      const tz = p.pos.z + Math.cos(this._finishCamAngle) * orbitDist;
      const ty = p.pos.y + 5;
      this._camera.position.x += (tx - this._camera.position.x) * 3 * dt;
      this._camera.position.y += (ty - this._camera.position.y) * 3 * dt;
      this._camera.position.z += (tz - this._camera.position.z) * 3 * dt;
      this._camera.lookAt(p.pos.x, p.pos.y + 1.5, p.pos.z);
      // bloom spike during slow-mo
      this._bloomPass.strength = 0.9;
      return;
    }

    const speedPct = Math.max(0, p.speed / MAX_SPEED);
    const boosting = p.boostTimer > 0 || p.driftBoostTimer > 0 || p.whipTimer > 0;

    // dynamic FOV: wider at speed, even wider on boost, tighter on drift
    const driftFov = p.drifting ? 3 : 0;
    const targetFov = CAM_BASE_FOV + speedPct * CAM_SPEED_FOV_ADD + (boosting ? CAM_BOOST_FOV_ADD : 0) + driftFov;
    this._camera.fov += (targetFov - this._camera.fov) * 4 * dt;
    this._camera.updateProjectionMatrix();

    // cinematic lean: camera rolls into turns
    const targetRoll = -p.steer * 0.08 * speedPct;
    this._camRoll += (targetRoll - this._camRoll) * 3 * dt;

    // dynamic height: higher at speed, lower in tight turns, much higher when airborne
    const airHeight = p.airborne ? 3 : 0;
    const turnLower = Math.abs(p.steer) * 0.8;
    const speedLift = speedPct * 1.0;
    const targetHeightOff = speedLift - turnLower + airHeight;
    this._camHeightOffset += (targetHeightOff - this._camHeightOffset) * 2.5 * dt;

    // dynamic distance: pull back at high speed
    const dynDist = CAM_DIST + speedPct * 2 + (boosting ? 2 : 0);

    // camera position
    const camAngleDir = this._rearView ? -1 : 1;
    // offset camera slightly to the outside of turns for better visibility
    const turnOffset = p.steer * 3.0 * speedPct;
    const camAngle = p.angle;
    const behindX = p.pos.x - Math.sin(camAngle) * dynDist * camAngleDir + Math.cos(camAngle) * turnOffset;
    const behindZ = p.pos.z - Math.cos(camAngle) * dynDist * camAngleDir - Math.sin(camAngle) * turnOffset;
    const behindY = p.pos.y + CAM_HEIGHT + this._camHeightOffset;

    this._camera.position.x += (behindX - this._camera.position.x) * CAM_SMOOTH * dt;
    this._camera.position.y += (behindY - this._camera.position.y) * CAM_SMOOTH * dt;
    this._camera.position.z += (behindZ - this._camera.position.z) * CAM_SMOOTH * dt;

    // camera shake
    if (this._shakeIntensity > 0) {
      this._camera.position.x += (Math.random() - 0.5) * this._shakeIntensity;
      this._camera.position.y += (Math.random() - 0.5) * this._shakeIntensity * 0.5;
      this._shakeIntensity = Math.max(0, this._shakeIntensity - this._shakeDecay * dt);
    }

    // subtle speed vibration at very high speed
    if (speedPct > 0.85) {
      const vibe = (speedPct - 0.85) * 0.3;
      this._camera.position.x += (Math.random() - 0.5) * vibe * 0.08;
      this._camera.position.y += (Math.random() - 0.5) * vibe * 0.04;
    }

    // look-ahead: further at speed, leads into turns
    const dynLookAhead = CAM_LOOK_AHEAD + speedPct * 5;
    const lookDir = this._rearView ? -1 : 1;
    const lookTarget = new THREE.Vector3(
      p.pos.x + Math.sin(p.angle) * dynLookAhead * lookDir,
      p.pos.y + 1 + (p.airborne ? 0.5 : 0),
      p.pos.z + Math.cos(p.angle) * dynLookAhead * lookDir
    );
    this._camera.lookAt(lookTarget);

    // apply roll
    this._camera.rotation.z += this._camRoll;
  }

  // ── horse animation ────────────────────────────────────────────────────────

  private _animateHorses(dt: number): void {
    for (const racer of this._racers) {
      const speedFactor = Math.abs(racer.speed) / MAX_SPEED;
      // gallop speed: walk < 0.3, trot 0.3-0.6, canter 0.6-0.8, gallop > 0.8
      const gallopRate = speedFactor < 0.3 ? 6 : speedFactor < 0.6 ? 9 : speedFactor < 0.8 ? 11 : 14;
      racer.horsePhase += dt * speedFactor * gallopRate;

      for (let h = 0; h < 2; h++) {
        const horseGroup = racer.mesh.getObjectByName(`horse_${h}`);
        if (!horseGroup) continue;

        // body bounce: vertical + forward lean at high speed
        const bounce = Math.sin(racer.horsePhase + h * Math.PI) * 0.15 * speedFactor;
        horseGroup.position.y = bounce;
        // body sway side to side at high speed
        horseGroup.rotation.z = Math.sin(racer.horsePhase * 0.5 + h * 1.5) * 0.04 * speedFactor;

        // gallop gait: front and back legs alternate (diagonal pairs)
        for (let li = 0; li < 4; li++) {
          const leg = horseGroup.getObjectByName(`leg_${li}`);
          if (!leg) continue;
          // diagonal gait: front-left/back-right together, front-right/back-left together
          const diag = (li === 0 || li === 3) ? 0 : Math.PI;
          const phase = racer.horsePhase + diag + h * 0.4;
          const amplitude = speedFactor < 0.3 ? 0.3 : speedFactor < 0.6 ? 0.5 : 0.7;
          // leg swing: forward/back with slight up motion at peak
          leg.rotation.x = Math.sin(phase) * amplitude * speedFactor;
          // hooves lift higher at gallop
          if (li < 2) { // front legs: more forward reach
            leg.position.y = 0.08 + Math.max(0, Math.sin(phase)) * 0.08 * speedFactor;
          }
        }

        // neck: bob with gallop, lean forward at speed
        const neck = horseGroup.getObjectByName("neck");
        if (neck) {
          const baseLean = -0.5 - speedFactor * 0.2; // leans more forward at speed
          neck.rotation.x = baseLean + Math.sin(racer.horsePhase + h * Math.PI) * 0.12 * speedFactor;
        }

        // head: follows neck with slight delay, nostrils flare at high speed
        const head = horseGroup.getObjectByName("head");
        if (head) {
          head.rotation.x = -0.15 + Math.sin(racer.horsePhase * 0.9 + h * Math.PI + 0.3) * 0.1 * speedFactor;
        }

        // tail: streams behind more at speed, sweeping wider
        const tail = horseGroup.getObjectByName("tail");
        if (tail) {
          tail.rotation.x = 0.4 + speedFactor * 0.4 + Math.sin(racer.horsePhase * 0.8 + h) * 0.25 * speedFactor;
          tail.rotation.z = Math.sin(racer.horsePhase * 0.5 + h) * 0.3 * speedFactor;
        }
      }

      // cape flutter (player & AI)
      const cape = racer.mesh.getObjectByName("cape");
      if (cape) {
        cape.rotation.x = 0.3 + speedFactor * 0.5 + Math.sin(racer.horsePhase * 1.5) * 0.15 * speedFactor;
        cape.rotation.z = Math.sin(racer.horsePhase * 0.7) * 0.1;
      }

      // wheel rotation on torus rims
      racer.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.name === "wheel") {
          child.rotation.z += racer.speed * dt * 0.8;
        }
      });
    }
  }

  // ── particles ──────────────────────────────────────────────────────────────

  private _spawnDust(pos: THREE.Vector3): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x887766, transparent: true, opacity: 0.4 })
    );
    mesh.position.copy(pos); mesh.position.y += 0.2; this._scene.add(mesh);
    this._particles.push({
      mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2),
      life: 1.0, maxLife: 1.0,
    });
  }

  private _spawnSparks(pos: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      const sparkColor = Math.random() > 0.3 ? 0xffaa44 : 0xffdd66;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 12, 10),
        new THREE.MeshStandardMaterial({ color: sparkColor, emissive: sparkColor, emissiveIntensity: 2.0, toneMapped: false })
      );
      mesh.position.copy(pos); this._scene.add(mesh);
      this._particles.push({
        mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 5 + 2, (Math.random() - 0.5) * 8),
        life: 0.5 + Math.random() * 0.3, maxLife: 0.8,
      });
    }
  }

  private _updateParticles(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this._scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this._particles.splice(i, 1);
        continue;
      }
      p.vel.y -= GRAVITY * 0.3 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      const alpha = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      (p.mesh.material as THREE.MeshBasicMaterial).transparent = true;
    }
  }

  // ── results screen ─────────────────────────────────────────────────────────

  private _showResults(): void {
    // check for new best time
    this._newBestTime = saveBestTime(this._track.name, this._player.finishTime);
    this._saveGhostIfBest();

    // update career stats
    this._updateCareerStats();

    // victory/defeat audio + effects
    if (this._player.placement <= 3) {
      this._audio.playVictory();
    } else {
      this._audio.playDefeat();
    }

    // victory confetti + sparks for podium
    if (this._player.placement <= 3) {
      for (let i = 0; i < 40; i++) {
        setTimeout(() => {
          if (this._phase === "finish" || this._phase === "results") {
            this._spawnConfetti(8);
            if (this._player.placement === 1) {
              this._spawnSparks(this._player.pos.clone().add(new THREE.Vector3(0, 3, 0)), 5);
            }
          }
        }, i * 80);
      }
    }

    // defeat quote from winner AI
    if (this._player.placement > 1) {
      const winnerIdx = this._racers.findIndex(r => !r.isPlayer && r.placement === 1);
      if (winnerIdx >= 0) {
        const ai = this._racers[winnerIdx];
        const aiIdx = AI_NAMES.indexOf(ai.name);
        if (aiIdx >= 0) {
          this._announce(`${ai.name}: "${AI_TAUNTS[aiIdx][0]}"`);
        }
      }
    } else {
      // player won — show defeat quote from 2nd place
      const secondIdx = this._racers.findIndex(r => !r.isPlayer && r.placement === 2);
      if (secondIdx >= 0) {
        const aiIdx = AI_NAMES.indexOf(this._racers[secondIdx].name);
        if (aiIdx >= 0) this._announce(AI_DEFEAT_QUOTES[aiIdx]);
      }
    }

    this._resultsTimeout = setTimeout(() => {
      this._resultsTimeout = null;
      this._phase = "results";

      const sorted = [...this._racers].sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        return a.placement - b.placement;
      });

      const pointTable = [10, 7, 5, 4, 3, 2, 1, 0];
      let text = ``;

      // header
      if (this._player.placement === 1) {
        text += `VICTORY!\n`;
      } else if (this._player.placement <= 3) {
        text += `PODIUM FINISH!\n`;
      } else {
        text += `RACE COMPLETE\n`;
      }
      text += `${this._track.name}\n`;
      if (this._newBestTime) text += `NEW BEST TIME!\n`;
      text += `\n`;

      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];
        const timeStr = r.finished ? this._formatTime(r.finishTime) : "DNF";
        const pts = pointTable[i] ?? 0;
        const marker = r.isPlayer ? " ◄" : "";
        text += `${i + 1}. ${r.name.padEnd(14)} ${timeStr}  +${pts}pts${marker}\n`;

        if (this._tournamentMode) {
          const existing = this._tournamentScores.find(s => s.name === r.name);
          if (existing) existing.points += pts;
          else this._tournamentScores.push({ name: r.name, points: pts });
        }
      }

      // lap times
      if (this._player.lapTimes.length > 0) {
        text += `\nYour laps: `;
        for (let i = 0; i < this._player.lapTimes.length; i++) {
          const lt = i === 0 ? this._player.lapTimes[0] : this._player.lapTimes[i] - this._player.lapTimes[i - 1];
          text += `${this._formatTime(lt)}  `;
        }
        text += `\n`;
      }

      // detailed stats
      text += this._buildStatsText();

      if (this._tournamentMode) {
        text += `\nTOURNAMENT (Race ${this._tournamentTrackIdx + 1}/${TRACK_COUNT}):\n`;
        const standings = [...this._tournamentScores].sort((a, b) => b.points - a.points);
        for (let i = 0; i < standings.length; i++) {
          const s = standings[i];
          const marker = s.name === "YOU" ? " ◄" : "";
          text += `${i + 1}. ${s.name.padEnd(14)} ${s.points}pts${marker}\n`;
        }
      }

      text += this._buildCareerText();
      // build styled HTML results instead of plain text
      let html = `<div style="background:rgba(0,0,0,0.7);border:1px solid rgba(218,165,32,0.4);border-radius:8px;padding:20px 30px;max-width:520px;font-family:monospace;">`;
      // header
      const headerColor = this._player.placement === 1 ? "#daa520" : this._player.placement <= 3 ? "#ccaa44" : "#888";
      const headerText = this._player.placement === 1 ? "VICTORY!" : this._player.placement <= 3 ? "PODIUM FINISH!" : "RACE COMPLETE";
      html += `<div style="font-size:24px;color:${headerColor};text-align:center;margin-bottom:4px;letter-spacing:3px;text-shadow:0 0 15px ${headerColor};">${headerText}</div>`;
      html += `<div style="font-size:12px;color:#888;text-align:center;margin-bottom:12px;">${this._track.name}${this._newBestTime ? ' — <span style="color:#ffdd44;">NEW BEST TIME!</span>' : ''}</div>`;
      html += `<div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;font-size:12px;white-space:pre;line-height:1.6;">`;
      html += text;
      html += `</div>`;
      html += `<div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:10px;padding-top:8px;font-size:11px;color:#666;text-align:center;">ENTER — Continue &nbsp; | &nbsp; ESC — Exit</div>`;
      html += `</div>`;

      this._hudCenter.style.fontSize = "13px";
      this._hudCenter.style.textAlign = "left";
      this._hudCenter.innerHTML = html;
    }, 2000);
  }

  private _formatTime(t: number): string {
    const mins = Math.floor(t / 60), secs = Math.floor(t % 60), ms = Math.floor((t % 1) * 100);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  }

  // ── slipstream / drafting ──────────────────────────────────────────────────

  private _slipstreamSoundCooldown = 0;

  private _updateSlipstream(dt: number): void {
    this._slipstreamSoundCooldown -= dt;

    for (const racer of this._racers) {
      racer.slipstreaming = false;

      // check if behind another racer within cone
      for (const other of this._racers) {
        if (other === racer || other.finished) continue;

        const toOther = new THREE.Vector3().subVectors(other.pos, racer.pos);
        const dist = toOther.length();
        if (dist > SLIPSTREAM_DIST || dist < 2) continue;

        // check if other is ahead in same direction
        toOther.normalize();
        const forward = new THREE.Vector3(Math.sin(racer.angle), 0, Math.cos(racer.angle));
        const dot = forward.dot(toOther);

        if (dot > Math.cos(SLIPSTREAM_ANGLE)) {
          racer.slipstreaming = true;
          racer.speed += SLIPSTREAM_BONUS * dt;
          break;
        }
      }

      // audio & visual for player
      if (racer.isPlayer) {
        this._slipstreamHud.style.opacity = racer.slipstreaming ? "1" : "0";
        if (racer.slipstreaming && this._slipstreamSoundCooldown <= 0) {
          this._audio.playSlipstream();
          this._slipstreamSoundCooldown = 1.5;
        }
      }
    }
  }

  // ── flame trail (boost visuals) ────────────────────────────────────────────

  private _updateFlameTrail(dt: number): void {
    const p = this._player;
    const isBoosting = p.boostTimer > 0 || p.driftBoostTimer > 0 || p.whipTimer > 0;

    if (isBoosting && Math.random() > 0.3) {
      // spawn flame particles behind chariot
      const behind = new THREE.Vector3(
        p.pos.x - Math.sin(p.angle) * 2 + (Math.random() - 0.5) * 0.8,
        p.pos.y + 0.5 + Math.random() * 0.3,
        p.pos.z - Math.cos(p.angle) * 2 + (Math.random() - 0.5) * 0.8
      );
      const flameColor = Math.random() > 0.5 ? 0xff6600 : 0xffaa00;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 + Math.random() * 0.15, 12, 10),
        new THREE.MeshStandardMaterial({ color: flameColor, emissive: flameColor, emissiveIntensity: 1.5, transparent: true, opacity: 0.85, toneMapped: false })
      );
      mesh.position.copy(behind);
      this._scene.add(mesh);
      this._flameParticles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 1
        ),
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
      });
    }

    // drift smoke
    if (p.drifting && Math.random() > 0.5) {
      const smokePos = p.pos.clone();
      smokePos.y += 0.1;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2 + Math.random() * 0.2, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3 })
      );
      mesh.position.copy(smokePos);
      this._scene.add(mesh);
      this._flameParticles.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1, Math.random() * 1.5 + 0.5, (Math.random() - 0.5) * 1),
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
      });
    }

    // update flame particles
    for (let i = this._flameParticles.length - 1; i >= 0; i--) {
      const fp = this._flameParticles[i];
      fp.life -= dt;
      if (fp.life <= 0) {
        this._scene.remove(fp.mesh);
        fp.mesh.geometry.dispose();
        (fp.mesh.material as THREE.Material).dispose();
        this._flameParticles.splice(i, 1);
        continue;
      }
      fp.mesh.position.add(fp.vel.clone().multiplyScalar(dt));
      fp.vel.y += dt * 2; // flames rise
      const alpha = fp.life / fp.maxLife;
      (fp.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.6;
      fp.mesh.scale.setScalar(1 + (1 - alpha) * 1.5); // expand as they fade
    }
  }

  // ── announcer system ───────────────────────────────────────────────────────

  private _announce(text: string): void {
    this._announcerQueue.push({ text, time: 2.0 });
  }

  private _updateAnnouncer(dt: number): void {
    if (this._announcerTimer > 0) {
      this._announcerTimer -= dt;
      if (this._announcerTimer <= 0) {
        this._announcerHud.style.opacity = "0";
      } else if (this._announcerTimer < 0.5) {
        this._announcerHud.style.opacity = String(this._announcerTimer / 0.5);
      }
    }

    // show next queued announcement
    if (this._announcerTimer <= 0 && this._announcerQueue.length > 0) {
      const next = this._announcerQueue.shift()!;
      this._announcerHud.textContent = next.text;
      this._announcerHud.style.opacity = "1";
      this._announcerTimer = next.time;
    }

  }

  // ── overtake tracking ──────────────────────────────────────────────────────

  private _updateOvertakeTracking(): void {
    const p = this._player;
    this._posChangeTimer -= this._dt;

    if (this._lastPlacement === 0) { this._lastPlacement = p.placement; return; }

    if (p.placement < this._lastPlacement && this._posChangeTimer <= 0) {
      this._overtakeCount++;
      const diff = this._lastPlacement - p.placement;
      if (p.placement === 1) {
        this._announce("TAKES THE LEAD!");
      } else if (diff >= 2) {
        this._announce(`UP ${diff} PLACES!`);
      } else {
        const passed = this._racers.find(r => r.placement === p.placement + 1);
        if (passed) this._announce(`PASSES ${passed.name.toUpperCase()}!`);
      }
      this._posChangeTimer = 3;
    } else if (p.placement > this._lastPlacement && this._posChangeTimer <= 0) {
      if (p.placement === this._racers.length) {
        this._announce("LAST PLACE!");
      }
      this._posChangeTimer = 3;
    }

    this._lastPlacement = p.placement;
  }

  // ── ghost replay system ────────────────────────────────────────────────────

  private _updateGhostRecord(dt: number): void {
    if (this._phase !== "racing") return;
    this._ghostSampleTimer -= dt;
    if (this._ghostSampleTimer <= 0) {
      this._ghostSampleTimer = GHOST_SAMPLE_RATE;
      const p = this._player;
      this._ghostFrames.push({ x: p.pos.x, z: p.pos.z, y: p.pos.y, angle: p.angle });
    }
  }

  private _updateGhostPlayback(_dt: number): void {
    if (!this._ghostBestFrames || this._ghostBestFrames.length === 0) return;

    if (!this._ghostMesh) {
      this._ghostMesh = buildChariotMesh(0x4488ff, false);
      this._ghostMesh.traverse(child => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.Material & { transparent: boolean; opacity: number }).transparent = true;
          (child.material as THREE.Material & { transparent: boolean; opacity: number }).opacity = 0.25;
        }
      });
      this._scene.add(this._ghostMesh);
    }

    const frameIdx = Math.floor(this._raceTime / GHOST_SAMPLE_RATE);
    if (frameIdx < this._ghostBestFrames.length) {
      const f = this._ghostBestFrames[frameIdx];
      this._ghostMesh.position.set(f.x, f.y, f.z);
      this._ghostMesh.rotation.y = f.angle + Math.PI;
      this._ghostMesh.visible = true;
    } else {
      this._ghostMesh.visible = false;
    }
  }

  // save ghost on race end
  private _saveGhostIfBest(): void {
    if (this._ghostFrames.length === 0) return;
    const key = `chariot_ghost_${TRACK_DEFS[this._currentTrackIdx].name}`;
    try {
      const existing = localStorage.getItem(key);
      const existingTime = existing ? JSON.parse(existing).time : Infinity;
      if (this._player.finishTime < existingTime) {
        localStorage.setItem(key, JSON.stringify({
          time: this._player.finishTime,
          frames: this._ghostFrames,
        }));
      }
    } catch { /* ignore */ }
  }

  private _loadGhost(): void {
    const key = `chariot_ghost_${TRACK_DEFS[this._currentTrackIdx].name}`;
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        this._ghostBestFrames = parsed.frames;
      } else {
        this._ghostBestFrames = null;
      }
    } catch { this._ghostBestFrames = null; }
    this._ghostMesh = null;
  }

  // ── rain particle system ───────────────────────────────────────────────────

  private _buildRain(): void {
    const count = this._weather === "storm" ? 3000 : 1500;
    this._rainPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this._rainPositions[i * 3] = (Math.random() - 0.5) * 200;
      this._rainPositions[i * 3 + 1] = Math.random() * 60;
      this._rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(this._rainPositions, 3));
    const mat = new THREE.PointsMaterial({
      color: this._weather === "storm" ? 0x8888cc : 0xaaaacc,
      size: this._weather === "storm" ? 0.15 : 0.1,
      transparent: true, opacity: 0.5, sizeAttenuation: true,
    });
    this._rainDrops = new THREE.Points(geo, mat);
    this._scene.add(this._rainDrops);
  }

  private _updateRain(dt: number): void {
    if (!this._rainDrops || !this._rainPositions) return;
    const speed = this._weather === "storm" ? 80 : 40;
    const p = this._player;
    for (let i = 0; i < this._rainPositions.length / 3; i++) {
      this._rainPositions[i * 3 + 1] -= speed * dt;
      if (this._rainPositions[i * 3 + 1] < -2) {
        this._rainPositions[i * 3] = p.pos.x + (Math.random() - 0.5) * 200;
        this._rainPositions[i * 3 + 1] = 50 + Math.random() * 20;
        this._rainPositions[i * 3 + 2] = p.pos.z + (Math.random() - 0.5) * 200;
      }
    }
    this._rainDrops.geometry.attributes.position.needsUpdate = true;
    // rain follows player
    this._rainDrops.position.set(0, 0, 0);
  }

  private _stormFlashTimer = 0;
  private _stormFlashDuration = 0;

  private _buildStormLighting(): void {
    const flash = new THREE.DirectionalLight(0xccccff, 0);
    flash.position.set(0, 50, 0);
    flash.name = "stormFlash";
    this._scene.add(flash);
  }

  private _updateEnvironmentEffects(dt: number): void {
    // storm lightning flash
    if (this._weather === "storm") {
      this._stormFlashTimer -= dt;
      const flash = this._scene.getObjectByName("stormFlash") as THREE.DirectionalLight | undefined;
      if (flash) {
        if (this._stormFlashTimer <= 0) {
          // random interval between flashes: 3-8 seconds
          this._stormFlashTimer = 3 + Math.random() * 5;
          this._stormFlashDuration = 0.15 + Math.random() * 0.1;
          flash.intensity = 3 + Math.random() * 2;
          // bloom spike during flash
          this._bloomPass.strength = 1.5;
        }
        if (this._stormFlashDuration > 0) {
          this._stormFlashDuration -= dt;
          if (this._stormFlashDuration <= 0) {
            flash.intensity = 0;
            this._bloomPass.strength = this._getBaseBloomStrength();
          } else {
            // flicker
            flash.intensity = (Math.random() > 0.5 ? 4 : 0.5);
          }
        }
      }
    }

    // animate water (shore track)
    if (TRACK_DEFS[this._currentTrackIdx].specialScenery === "shore") {
      this._scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.position.y < -1 && (obj.geometry as THREE.PlaneGeometry)?.parameters?.width === 600) {
          obj.position.y = -1.5 + Math.sin(this._time * 0.8) * 0.15;
          // subtle color shift
          const mat = obj.material as THREE.MeshStandardMaterial;
          const phase = Math.sin(this._time * 0.3) * 0.5 + 0.5;
          mat.color.setRGB(0.2 + phase * 0.05, 0.4 + phase * 0.05, 0.65 + phase * 0.05);
        }
      });
    }

    // torch flame flicker (animate flame meshes and their point lights)
    if (TRACK_DEFS[this._currentTrackIdx].specialScenery === "castle") {
      this._scene.traverse(obj => {
        if (obj instanceof THREE.PointLight && obj.color.r > 0.8) {
          obj.intensity = 0.4 + Math.sin(this._time * 8 + obj.position.x) * 0.3 + Math.random() * 0.1;
        }
      });
    }

    // lava glow pulse (volcanic track)
    if (TRACK_DEFS[this._currentTrackIdx].specialScenery === "volcanic") {
      this._scene.traverse(obj => {
        if (obj instanceof THREE.PointLight && obj.color.r > 0.9 && obj.color.g < 0.4) {
          obj.intensity = 0.3 + Math.sin(this._time * 2 + obj.position.x * 0.1) * 0.2;
        }
      });
    }

    // dynamic bloom intensity: brighter at night, muted in fog
    if (this._weather !== "storm") {
      this._bloomPass.strength = this._getBaseBloomStrength();
    }

    // slowly rotate cloud dome
    const dome = this._scene.getObjectByName("cloudDome");
    if (dome) dome.rotation.y += dt * 0.005;

    // spectator cheering: bobbing + occasional jumping
    this._scene.traverse(obj => {
      if (obj.name.startsWith("spectator_")) {
        const baseY = 1.55;
        const cheer = Math.sin(this._time * 5 + obj.position.x * 3);
        obj.position.y = baseY + cheer * 0.06;
        // arms up on positive half of wave
        obj.rotation.z = cheer > 0.5 ? (cheer - 0.5) * 0.3 : 0;
      }
    });

    // banner waving: oscillate banners/flags
    this._scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        const geo = obj.geometry as THREE.PlaneGeometry;
        if (geo?.parameters?.width && geo.parameters.width > 3 && obj.position.y > 4) {
          // likely a banner/flag plane
          obj.rotation.z += Math.sin(this._time * 3 + obj.position.x) * 0.003;
        }
      }
    });
  }

  private _getBaseBloomStrength(): number {
    switch (this._weather) {
      case "night": return 0.7;
      case "storm": return 0.6;
      case "fog": return 0.3;
      case "rain": return 0.4;
      default: return 0.45;
    }
  }

  // ── touch controls ─────────────────────────────────────────────────────────

  private _bindTouchControls(): void {
    const bind = (id: string, key: keyof typeof this._touchState) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("touchstart", (e) => { e.preventDefault(); this._touchState[key] = true; }, { passive: false });
      el.addEventListener("touchend", () => { this._touchState[key] = false; });
      el.addEventListener("touchcancel", () => { this._touchState[key] = false; });
    };
    bind("ch-t-left", "left");
    bind("ch-t-right", "right");
    bind("ch-t-accel", "accel");
    bind("ch-t-brake", "brake");
    bind("ch-t-drift", "drift");
  }

  // ── achievements ───────────────────────────────────────────────────────────

  private _achievements: Achievement[] = [
    { id: "first_win", name: "CHAMPION", desc: "Win a race", check: (g) => g._player?.finished && g._player.placement === 1 },
    { id: "podium", name: "ON THE PODIUM", desc: "Finish in top 3", check: (g) => g._player?.finished && g._player.placement <= 3 },
    { id: "perfect_start", name: "LIGHTNING REFLEXES", desc: "Get a perfect start", check: (g) => g._perfectStartDone },
    { id: "drift_master", name: "DRIFT KING", desc: "Drift for 10+ seconds in a race", check: (g) => g._totalDriftTime >= 10 },
    { id: "drift_legend", name: "DRIFT LEGEND", desc: "Drift for 30+ seconds in a race", check: (g) => g._totalDriftTime >= 30 },
    { id: "whip_happy", name: "TASKMASTER", desc: "Use whip 10 times in a race", check: (g) => g._totalWhips >= 10 },
    { id: "no_damage", name: "UNTOUCHABLE", desc: "Finish with no damage", check: (g) => g._player?.finished && g._player.damage === 0 },
    { id: "come_from_behind", name: "COMEBACK KID", desc: "Win after being in last place", check: (g) => g._player?.finished && g._player.placement === 1 && g._overtakeCount >= 6 },
    { id: "overtaker", name: "AGGRESSIVE DRIVER", desc: "Overtake 5+ racers", check: (g) => g._overtakeCount >= 5 },
    { id: "storm_win", name: "STORM RIDER", desc: "Win in a thunderstorm", check: (g) => g._player?.finished && g._player.placement === 1 && g._weather === "storm" },
    { id: "night_win", name: "MIDNIGHT RACER", desc: "Win at night", check: (g) => g._player?.finished && g._player.placement === 1 && g._weather === "night" },
    { id: "all_tracks", name: "ROAD WARRIOR", desc: "Set a best time on all 5 tracks", check: () => { const b = loadBestTimes(); return TRACK_DEFS.every(t => b[t.name]); } },
    { id: "speed_demon", name: "SPEED DEMON", desc: "Reach 130+ MPH", check: (g) => g._player && g._player.speed * 3.2 >= 130 },
    { id: "hard_win", name: "LEGEND", desc: "Win on Legend difficulty", check: (g) => g._player?.finished && g._player.placement === 1 && g._difficulty === "hard" },
    { id: "tournament_win", name: "GRAND CHAMPION", desc: "Win a full tournament", check: (g) => {
      if (!g._tournamentMode || g._tournamentTrackIdx < TRACK_COUNT - 1) return false;
      const you = g._tournamentScores.find(s => s.name === "YOU");
      if (!you) return false;
      return g._tournamentScores.every(s => s.name === "YOU" || s.points <= you.points);
    }},
  ];

  private _loadAchievements(): void {
    try {
      const saved = JSON.parse(localStorage.getItem("chariot_achievements") || "[]");
      this._achievementsUnlocked = new Set(saved);
    } catch { this._achievementsUnlocked = new Set(); }
  }

  private _saveAchievements(): void {
    localStorage.setItem("chariot_achievements", JSON.stringify([...this._achievementsUnlocked]));
  }

  private _checkAchievements(): void {
    for (const a of this._achievements) {
      if (this._achievementsUnlocked.has(a.id)) continue;
      if (a.check(this)) {
        this._achievementsUnlocked.add(a.id);
        this._saveAchievements();
        this._showAchievementPopup(a);
      }
    }
  }

  private _showAchievementPopup(a: Achievement): void {
    this._hudAchievement.innerHTML = `ACHIEVEMENT UNLOCKED<br><b>${a.name}</b><br><span style="font-size:11px;color:#ccc;">${a.desc}</span>`;
    this._hudAchievement.style.opacity = "1";
    this._achievementPopup = { text: a.name, timer: 4.0 };
  }

  // ── jump ramps ──────────────────────────────────────────────────────────────

  private _spawnRamps(): void {
    this._rampZones = [];
    const track = this._track;
    const rng = mulberry32(TRACK_DEFS[this._currentTrackIdx].seed + 777);
    // 2-4 ramps per track
    const count = 2 + Math.floor(rng() * 3);
    const spacing = Math.floor(track.points.length / (count + 1));

    for (let r = 0; r < count; r++) {
      const idx = spacing * (r + 1) + Math.floor((rng() - 0.5) * spacing * 0.3);
      const pt = track.points[idx % track.points.length];

      // ramp mesh: angled wedge
      const rampGeo = new THREE.BoxGeometry(pt.width * 0.6, 0.5, 4);
      const rampMat = new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.7 });
      const ramp = new THREE.Mesh(rampGeo, rampMat);
      ramp.position.copy(pt.pos);
      ramp.position.y += 0.25;
      const angle = Math.atan2(pt.dir.x, pt.dir.z);
      ramp.rotation.y = angle;
      ramp.rotation.x = -0.15; // slight upward tilt
      ramp.castShadow = true;
      this._scene.add(ramp);

      // warning stripes on ramp
      const stripeGeo = new THREE.BoxGeometry(pt.width * 0.6, 0.02, 0.3);
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.6, toneMapped: false });
      for (let s = -1; s <= 1; s++) {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.copy(pt.pos);
        stripe.position.y += 0.52;
        stripe.position.add(pt.dir.clone().multiplyScalar(s * 1.2));
        stripe.rotation.y = angle;
        this._scene.add(stripe);
      }

      this._rampZones.push({ pos: pt.pos.clone(), dir: pt.dir.clone(), trackIdx: idx % track.points.length });
    }
  }

  private _updateRamps(_dt: number): void {
    for (const racer of this._racers) {
      if (racer.airborne) {
        // apply gravity
        racer.airVelocityY -= RAMP_AIRTIME_GRAVITY * _dt;
        racer.pos.y += racer.airVelocityY * _dt;

        // check landing
        const nearest = this._findNearestTrackPoint(racer.pos);
        if (nearest) {
          const groundY = this._track.points[nearest.index].pos.y + GROUND_Y;
          if (racer.pos.y <= groundY) {
            racer.pos.y = groundY;
            racer.airborne = false;
            racer.airVelocityY = 0;
            if (racer.isPlayer) {
              this._shakeIntensity = 0.15;
              this._spawnDust(racer.pos.clone());
              this._spawnDust(racer.pos.clone());
            }
          }
        }
        racer.mesh.position.copy(racer.pos);
        continue;
      }

      // check if hitting a ramp
      for (const ramp of this._rampZones) {
        const dist = racer.pos.distanceTo(ramp.pos);
        if (dist < 3 && racer.speed > MAX_SPEED * 0.3) {
          const forward = new THREE.Vector3(Math.sin(racer.angle), 0, Math.cos(racer.angle));
          const dot = forward.dot(ramp.dir);
          if (Math.abs(dot) > 0.5) {
            racer.airborne = true;
            racer.airVelocityY = RAMP_LAUNCH_SPEED * (racer.speed / MAX_SPEED);
            if (racer.isPlayer) {
              this._announce("AIRBORNE!");
              this._shakeIntensity = 0.1;
            }
            break;
          }
        }
      }
    }
  }

  // ── pit stop ───────────────────────────────────────────────────────────────

  private _spawnPitStop(): void {
    // pit stop at ~40% around the track
    const idx = Math.floor(this._track.points.length * 0.4);
    const pt = this._track.points[idx];
    this._pitEntry = { pos: pt.pos.clone(), dir: pt.dir.clone() };

    // pit lane marker
    const markerGeo = new THREE.BoxGeometry(1, 3, 0.2);
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, emissive: 0x44aa44, emissiveIntensity: 0.5, toneMapped: false });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.copy(pt.pos).add(pt.right.clone().multiplyScalar(pt.width / 2 - 1));
    marker.position.y = 1.5;
    marker.rotation.y = Math.atan2(pt.dir.x, pt.dir.z);
    this._scene.add(marker);

    // PIT text
    const pitCanvas = document.createElement("canvas");
    pitCanvas.width = 64; pitCanvas.height = 32;
    const ctx = pitCanvas.getContext("2d")!;
    ctx.fillStyle = "#44aa44"; ctx.font = "bold 24px monospace"; ctx.textAlign = "center";
    ctx.fillText("PIT", 32, 24);
    const pitTex = new THREE.CanvasTexture(pitCanvas);
    const pitSprite = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 1),
      new THREE.MeshBasicMaterial({ map: pitTex, transparent: true })
    );
    pitSprite.position.copy(marker.position); pitSprite.position.y = 3.5;
    pitSprite.rotation.y = marker.rotation.y;
    this._scene.add(pitSprite);

    // green floor zone
    const pitFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(pt.width * 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x225522, transparent: true, opacity: 0.5, roughness: 0.8 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.copy(pt.pos).add(pt.right.clone().multiplyScalar(pt.width * 0.25));
    pitFloor.position.y = 0.04;
    pitFloor.rotation.z = Math.atan2(pt.dir.x, pt.dir.z);
    this._scene.add(pitFloor);
  }

  private _updatePitStop(dt: number): void {
    if (!this._pitEntry) return;
    const p = this._player;

    const dist = p.pos.distanceTo(this._pitEntry.pos);
    const wasPit = p.inPit;
    p.inPit = dist < 8 && p.speed < PIT_SPEED_LIMIT + 5;

    if (p.inPit && p.damage > 0) {
      p.damage = Math.max(0, p.damage - PIT_REPAIR_RATE * dt);
      // slow down in pit
      if (p.speed > PIT_SPEED_LIMIT) p.speed = PIT_SPEED_LIMIT;
    }

    if (p.inPit && !wasPit && p.damage > 20) {
      this._announce("PIT STOP — REPAIRING");
    }
    if (!p.inPit && wasPit && p.damage <= 0) {
      this._announce("REPAIRS COMPLETE!");
    }
  }

  // ── checkpoint markers ─────────────────────────────────────────────────────

  private _spawnCheckpoints(): void {
    const track = this._track;
    const thirds = [
      Math.floor(track.points.length / 3),
      Math.floor(track.points.length * 2 / 3),
    ];

    for (let c = 0; c < thirds.length; c++) {
      const pt = track.points[thirds[c]];
      const hw = pt.width / 2;
      const angle = Math.atan2(pt.dir.x, pt.dir.z);

      // two poles with connecting beam
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x4488cc, emissive: 0x224466, emissiveIntensity: 0.4, toneMapped: false });
      for (const s of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 12), poleMat);
        pole.position.copy(pt.pos).add(pt.right.clone().multiplyScalar(s * hw));
        pole.position.y = 2; pole.castShadow = true; this._scene.add(pole);
      }

      // connecting beam with checkpoint number
      const beam = new THREE.Mesh(new THREE.BoxGeometry(pt.width, 0.25, 0.25), poleMat);
      beam.position.copy(pt.pos); beam.position.y = 4; beam.rotation.y = angle;
      this._scene.add(beam);

      // sector label
      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 64; labelCanvas.height = 32;
      const lctx = labelCanvas.getContext("2d")!;
      lctx.fillStyle = "#4488cc"; lctx.font = "bold 20px monospace"; lctx.textAlign = "center";
      lctx.fillText(`S${c + 2}`, 32, 24);
      const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.8),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas), transparent: true })
      );
      labelMesh.position.copy(pt.pos); labelMesh.position.y = 4.8; labelMesh.rotation.y = angle;
      this._scene.add(labelMesh);
    }
  }

  // ── visual damage ──────────────────────────────────────────────────────────

  private _updateDamageVisuals(): void {
    const p = this._player;
    const dmgPct = p.damage / DAMAGE_MAX;

    // smoke at high damage
    if (dmgPct > 0.5 && Math.random() < dmgPct * 0.3) {
      const smokePos = p.pos.clone();
      smokePos.y += 1.5 + Math.random() * 0.5;
      smokePos.x += (Math.random() - 0.5) * 0.8;
      smokePos.z += (Math.random() - 0.5) * 0.8;
      const size = 0.15 + dmgPct * 0.2;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 12, 10),
        new THREE.MeshBasicMaterial({ color: dmgPct > 0.8 ? 0x222222 : 0x666666, transparent: true, opacity: 0.4 })
      );
      mesh.position.copy(smokePos);
      this._scene.add(mesh);
      this._particles.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.5 + Math.random(), (Math.random() - 0.5) * 0.5),
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
      });
    }

    // sparks at critical damage
    if (dmgPct > 0.8 && Math.random() < 0.05) {
      this._spawnSparks(p.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), 2);
    }

    // tilt chariot slightly when damaged
    if (dmgPct > 0.3) {
      p.mesh.rotation.x = Math.sin(this._time * 3) * dmgPct * 0.03;
    }
  }

  // ── stat tracking ──────────────────────────────────────────────────────────

  private _trackStats(): void {
    for (const racer of this._racers) {
      if (racer.speed > racer.topSpeed) racer.topSpeed = racer.speed;
    }
  }

  // ── enhanced results with stats ────────────────────────────────────────────

  private _buildStatsText(): string {
    const p = this._player;
    let s = "\nYOUR STATS:\n";
    s += `Top Speed: ${Math.floor(p.topSpeed * 3.2)} MPH\n`;
    s += `Drift Time: ${this._totalDriftTime.toFixed(1)}s\n`;
    s += `Whip Uses: ${this._totalWhips}\n`;
    s += `Overtakes: ${this._overtakeCount}\n`;
    s += `Power-Ups Used: ${this._playerPowerUpsUsed}\n`;
    s += `Wall Hits: ${this._wallHits}\n`;
    s += `Damage Taken: ${Math.floor(p.damage)}%\n`;
    if (this._perfectStartDone) s += `Perfect Start!\n`;
    return s;
  }

  // ── pause menu ──────────────────────────────────────────────────────────────

  private _showPauseMenu(): void {
    this._pauseMenu.style.display = "block";
    this._updateHUDCenter("");
    // highlight selected option
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById(`ch-pm-${i}`);
      if (!el) continue;
      if (i === this._pauseMenuIdx) {
        el.style.color = "#daa520";
        el.style.borderColor = "rgba(218,165,32,0.5)";
        el.style.background = "rgba(218,165,32,0.1)";
        el.style.textShadow = "0 0 10px rgba(218,165,32,0.4)";
      } else {
        el.style.color = "#888";
        el.style.borderColor = "transparent";
        el.style.background = "none";
        el.style.textShadow = "none";
      }
    }
    // show current race stats
    const statsEl = document.getElementById("ch-pm-stats");
    if (statsEl && this._player) {
      const p = this._player;
      statsEl.innerHTML = `Position: ${p.placement}/${this._racers.length} &nbsp; Lap: ${p.lap + 1}/${LAPS_PER_RACE} &nbsp; Damage: ${Math.floor(p.damage)}%<br>Time: ${this._formatTime(this._raceTime)} &nbsp; Speed: ${Math.floor(p.speed * 3.2)} MPH`;
    }
  }

  private _hidePauseMenu(): void {
    this._pauseMenu.style.display = "none";
  }

  private _executePauseOption(): void {
    switch (this._pauseMenuIdx) {
      case 0: // resume
        this._hidePauseMenu();
        this._phase = this._pausedPhase;
        break;
      case 1: // restart
        this._hidePauseMenu();
        this._fadeToBlack(0.3, () => this._startRace(this._currentTrackIdx));
        break;
      case 2: // controls
        this._showControlsFromPause();
        break;
      case 3: // quit
        this._hidePauseMenu();
        this._fadeToBlack(0.3, () => this._showTitle());
        break;
    }
  }

  private _showControlsFromPause(): void {
    this._tutorialOverlay.style.display = "block";
    // override click to return to pause
    const handler = () => {
      this._tutorialOverlay.style.display = "none";
      this._tutorialOverlay.removeEventListener("click", handler);
    };
    this._tutorialOverlay.addEventListener("click", handler);
  }

  // ── tutorial ───────────────────────────────────────────────────────────────

  private _showTutorialIfNeeded(): void {
    if (this._tutorialShown) return;
    this._tutorialOverlay.style.display = "block";
  }

  private _dismissTutorial(): void {
    this._tutorialOverlay.style.display = "none";
    this._tutorialShown = true;
    localStorage.setItem("chariot_tutorial_seen", "1");
  }

  // ── pre-race opponent intro ────────────────────────────────────────────────

  private _showPreRaceIntro(): void {
    // pick a random AI to taunt
    const rng = mulberry32(Math.floor(this._time * 100));
    const idx = Math.floor(rng() * AI_COUNT);
    const taunts = AI_TAUNTS[idx];
    const taunt = taunts[Math.floor(rng() * taunts.length)];
    const name = AI_NAMES[idx];
    const title = AI_TITLES[idx];
    this._announce(`${name}, ${title}:\n"${taunt}"`);
  }

  // ── career stats ───────────────────────────────────────────────────────────

  private _updateCareerStats(): void {
    const stats = loadCareerStats();
    stats.totalRaces++;
    if (this._player.placement === 1) stats.wins++;
    if (this._player.placement <= 3) stats.podiums++;
    stats.totalDriftTime += this._totalDriftTime;
    stats.totalOvertakes += this._overtakeCount;

    // check tournament win
    if (this._tournamentMode && this._tournamentTrackIdx >= TRACK_COUNT - 1) {
      const you = this._tournamentScores.find(s => s.name === "YOU");
      if (you && this._tournamentScores.every(s => s.name === "YOU" || s.points <= you.points)) {
        stats.tournamentsWon++;
      }
    }

    saveCareerStats(stats);
  }

  private _buildCareerText(): string {
    const s = loadCareerStats();
    if (s.totalRaces === 0) return "";
    let t = "\nCAREER: ";
    t += `${s.totalRaces} races`;
    t += ` · ${s.wins} wins`;
    t += ` · ${s.podiums} podiums`;
    if (s.tournamentsWon > 0) t += ` · ${s.tournamentsWon} tournaments`;
    t += `\n`;
    return t;
  }

  // ── confetti celebration ───────────────────────────────────────────────────

  private _spawnConfetti(count: number): void {
    const colors = [0xdaa520, 0xcc2222, 0x2244aa, 0x22cc44, 0xffcc00, 0xcc33cc, 0xffffff];
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 + Math.random() * 0.1, 0.02, 0.15 + Math.random() * 0.1),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, transparent: true, opacity: 1.0, toneMapped: false })
      );
      const p = this._player.pos;
      mesh.position.set(
        p.x + (Math.random() - 0.5) * 8,
        p.y + 4 + Math.random() * 8,
        p.z + (Math.random() - 0.5) * 8
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this._scene.add(mesh);
      this._particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 2 - 1,
          (Math.random() - 0.5) * 4
        ),
        life: 3 + Math.random() * 2,
        maxLife: 5,
      });
    }
  }

  // ── cleanup ────────────────────────────────────────────────────────────────

  // ── speedometer gauge ───────────────────────────────────────────────────────

  private _drawSpeedometer(pct: number, mph: number): void {
    const ctx = this._speedoCtx;
    const w = 160, h = 160;
    const cx = w / 2, cy = h / 2 + 10;
    const r = 65;
    ctx.clearRect(0, 0, w, h);

    // background arc
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 10;
    ctx.stroke();

    // speed arc (gradient from green to red)
    const speedAngle = startAngle + pct * (endAngle - startAngle);
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, speedAngle);
    const arcColor = pct > 0.8 ? "#ff4444" : pct > 0.5 ? "#ffaa44" : "#44cc44";
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.shadowColor = arcColor;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // tick marks
    for (let i = 0; i <= 10; i++) {
      const a = startAngle + (i / 10) * (endAngle - startAngle);
      const inner = r - 15;
      const outer = r - 7;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.strokeStyle = i > pct * 10 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)";
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // needle
    const needleAngle = startAngle + Math.min(pct, 1.05) * (endAngle - startAngle);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (r - 20), cy + Math.sin(needleAngle) * (r - 20));
    ctx.strokeStyle = "#daa520";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#daa520";
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#daa520";
    ctx.fill();

    // MPH text
    ctx.fillStyle = pct > 0.8 ? "#ff6644" : "#ddd";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${mph}`, cx, cy + 28);
    ctx.fillStyle = "#666";
    ctx.font = "9px monospace";
    ctx.fillText("MPH", cx, cy + 40);
  }

  // ── power-up icon ──────────────────────────────────────────────────────────

  private _drawPowerUpIcon(type: PowerUpType): void {
    const ctx = this._puIconCtx;
    const s = 44;
    ctx.clearRect(0, 0, s, s);
    const color = `#${POWERUP_COLORS[type].toString(16).padStart(6, "0")}`;

    // glowing circle background
    const grad = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.6, color + "88");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // border
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, 18, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // symbol
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const symbols: Record<PowerUpType, string> = { boost: "\u26A1", shield: "\u2764", lightning: "\u2607", oil: "\u2622" };
    ctx.fillText(symbols[type], s / 2, s / 2);
  }

  // ── cloud dome ──────────────────────────────────────────────────────────────

  private _buildCloudDome(_skyColor: number): void {
    const cloudTex = makeCloudTexture();
    const domeGeo = new THREE.SphereGeometry(250, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshBasicMaterial({
      map: cloudTex, transparent: true, opacity: 0.6, side: THREE.BackSide,
      depthWrite: false,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.name = "cloudDome";
    dome.position.y = -5;
    this._scene.add(dome);
  }

  // ── grass strips along track edges ─────────────────────────────────────────

  private _buildGrassStrips(): void {
    const track = this._track;
    const def = TRACK_DEFS[this._currentTrackIdx];
    if (def.specialScenery === "volcanic" || def.specialScenery === "shore") return;

    const rng = mulberry32(def.seed + 2222);
    const grassColor = new THREE.Color(def.sceneryColor).lerp(new THREE.Color(0x446633), 0.5);

    for (let i = 0; i < track.points.length; i += 3) {
      const pt = track.points[i];
      for (const side of [-1, 1]) {
        if (rng() > 0.6) continue;
        const dist = pt.width / 2 + 1.5 + rng() * 2;
        const pos = pt.pos.clone().add(pt.right.clone().multiplyScalar(side * dist));
        // grass tuft: thin tall triangle
        const h = 0.3 + rng() * 0.4;
        const blade = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, h, 8),
          new THREE.MeshStandardMaterial({ color: grassColor.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.08), roughness: 0.85 })
        );
        blade.position.copy(pos); blade.position.y = h / 2;
        blade.rotation.z = (rng() - 0.5) * 0.3;
        this._scene.add(blade);
      }
    }
  }

  // ── skid marks ─────────────────────────────────────────────────────────────

  private _updateSkidMarks(dt: number): void {
    const p = this._player;
    this._skidMarkTimer -= dt;

    if (p.drifting && p.speed > MAX_SPEED * 0.3 && this._skidMarkTimer <= 0) {
      this._skidMarkTimer = 0.05; // one mark every 50ms

      // dark tire mark on road surface
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 1.2),
        new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.4, depthWrite: false })
      );
      mark.rotation.x = -Math.PI / 2;
      mark.position.copy(p.pos);
      mark.position.y = 0.03; // just above road
      mark.rotation.z = p.angle;
      this._scene.add(mark);
      this._skidMarks.push(mark);

      // fade old marks and cleanup
      if (this._skidMarks.length > 200) {
        const old = this._skidMarks.shift()!;
        this._scene.remove(old);
        old.geometry.dispose();
        (old.material as THREE.Material).dispose();
      }
    }

    // slowly fade all marks and remove fully faded ones
    for (let i = this._skidMarks.length - 1; i >= 0; i--) {
      const mark = this._skidMarks[i];
      const mat = mark.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - dt * 0.03);
      if (mat.opacity <= 0) {
        this._scene.remove(mark);
        mark.geometry.dispose();
        mat.dispose();
        this._skidMarks.splice(i, 1);
      }
    }
  }

  // ── AI dust trails ─────────────────────────────────────────────────────────

  private _updateAIDust(): void {
    for (const racer of this._racers) {
      if (racer.isPlayer || racer.airborne) continue;
      if (racer.speed > MAX_SPEED * 0.55 && Math.random() > 0.8) {
        const dustPos = racer.pos.clone();
        dustPos.y += 0.1;
        dustPos.x += (Math.random() - 0.5) * 0.5;
        dustPos.z += (Math.random() - 0.5) * 0.5;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 3, 3),
          new THREE.MeshBasicMaterial({ color: 0x998877, transparent: true, opacity: 0.25 })
        );
        mesh.position.copy(dustPos);
        this._scene.add(mesh);
        this._particles.push({
          mesh,
          vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.5 + 0.5, (Math.random() - 0.5) * 1.5),
          life: 0.6, maxLife: 0.6,
        });
      }
    }
  }

  // ── fade transitions ────────────────────────────────────────────────────────

  private _fadeToBlack(_duration: number, cb: () => void): void {
    this._fadeTarget = 1;
    this._fadeCallback = () => {
      cb();
      // fade back in
      setTimeout(() => { this._fadeTarget = 0; }, 100);
    };
  }

  private _updateFade(dt: number): void {
    if (this._fadeTarget > this._fadeOpacity) {
      this._fadeOpacity = Math.min(1, this._fadeOpacity + dt * 3);
    } else if (this._fadeTarget < this._fadeOpacity) {
      this._fadeOpacity = Math.max(0, this._fadeOpacity - dt * 2);
    }
    this._fadeOverlay.style.opacity = String(this._fadeOpacity);
    if (this._fadeOpacity >= 0.95 && this._fadeCallback) {
      const cb = this._fadeCallback;
      this._fadeCallback = null;
      cb();
    }
  }

  // ── brake lights ───────────────────────────────────────────────────────────

  private _updateBrakeLights(): void {
    const p = this._player;
    const braking = this._keys.has("s") || this._keys.has("arrowdown") || this._touchState.brake;

    if (braking && !this._brakingVisual) {
      this._brakingVisual = true;
      // add red glow to back of chariot
      const brakeLight = new THREE.PointLight(0xff2200, 1.0, 8);
      brakeLight.name = "brakeLight";
      brakeLight.position.set(0, 0.8, 1.4);
      p.mesh.add(brakeLight);
      const brakeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 2.0, toneMapped: false })
      );
      brakeMesh.name = "brakeLightMesh";
      brakeMesh.position.set(0, 0.8, 1.4);
      p.mesh.add(brakeMesh);
    } else if (!braking && this._brakingVisual) {
      this._brakingVisual = false;
      const bl = p.mesh.getObjectByName("brakeLight");
      const bm = p.mesh.getObjectByName("brakeLightMesh") as THREE.Mesh | undefined;
      if (bl) p.mesh.remove(bl);
      if (bm) {
        p.mesh.remove(bm);
        bm.geometry.dispose();
        (bm.material as THREE.Material).dispose();
      }
    }
  }

  // ── position change flash ──────────────────────────────────────────────────

  private _updatePositionFlash(dt: number): void {
    const p = this._player;
    if (this._posFlashTimer > 0) {
      this._posFlashTimer -= dt;
      this._posFlashEl.style.opacity = String(Math.max(0, this._posFlashTimer * 3));
    }

    if (this._lastPlayerPlacement > 0 && p.placement !== this._lastPlayerPlacement) {
      if (p.placement < this._lastPlayerPlacement) {
        // gained position: gold flash
        this._posFlashEl.style.background = "radial-gradient(ellipse at center, rgba(218,165,32,0.2) 0%, transparent 70%)";
        this._posFlashTimer = 0.4;
        this._posFlashEl.style.opacity = "1";
        // make position number green briefly
        this._hudPos.style.color = "#44ff44";
        setTimeout(() => { this._hudPos.style.color = "#daa520"; }, 600);
      } else {
        // lost position: red flash
        this._posFlashEl.style.background = "radial-gradient(ellipse at center, rgba(255,30,30,0.15) 0%, transparent 70%)";
        this._posFlashTimer = 0.3;
        this._posFlashEl.style.opacity = "1";
        this._hudPos.style.color = "#ff4444";
        setTimeout(() => { this._hudPos.style.color = "#daa520"; }, 600);
      }
    }
    this._lastPlayerPlacement = p.placement;
  }

  // ── final lap intensity ────────────────────────────────────────────────────

  private _updateFinalLapIntensity(): void {
    const p = this._player;
    const isFinal = p.lap === LAPS_PER_RACE - 1 && !p.finished;

    if (isFinal && !this._finalLapActive) {
      this._finalLapActive = true;
      // red-tinted vignette
      this._hudBoostVignette.style.background = "radial-gradient(ellipse at center, transparent 40%, rgba(200,40,20,0.2) 100%)";
      this._hudBoostVignette.style.opacity = "1";
      // bloom spike
      this._bloomPass.strength = Math.max(this._bloomPass.strength, 0.7);
    } else if (!isFinal && this._finalLapActive) {
      this._finalLapActive = false;
      this._hudBoostVignette.style.background = "radial-gradient(ellipse at center,transparent 50%,rgba(255,120,0,0.25) 100%)";
      this._hudBoostVignette.style.opacity = "0";
    }

    // pulse the bloom during final lap
    if (this._finalLapActive) {
      this._bloomPass.strength = this._getBaseBloomStrength() + 0.2 + Math.sin(this._time * 2) * 0.1;
    }
  }

  // ── power-up pickup pulse ──────────────────────────────────────────────────

  private _updatePickupFlash(dt: number): void {
    if (this._pickupFlashTimer > 0) {
      this._pickupFlashTimer -= dt;
      // white flash overlay
      this._posFlashEl.style.background = "radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 60%)";
      this._posFlashEl.style.opacity = String(Math.max(0, this._pickupFlashTimer * 4));
    }
  }

  private _destroyExtras(): void {
    if (this._touchControls?.parentNode) this._touchControls.parentNode.removeChild(this._touchControls);
    if (this._pauseMenu?.parentNode) this._pauseMenu.parentNode.removeChild(this._pauseMenu);
    if (this._tutorialOverlay?.parentNode) this._tutorialOverlay.parentNode.removeChild(this._tutorialOverlay);
    if (this._fadeOverlay?.parentNode) this._fadeOverlay.parentNode.removeChild(this._fadeOverlay);
  }
}
