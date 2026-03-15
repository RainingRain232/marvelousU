// ---------------------------------------------------------------------------
// Grail Ball -- Game State
// All mutable match data lives here. Pure data, no logic.
// ---------------------------------------------------------------------------

import {
  GBPlayerClass, GBMatchPhase, GBPowerUpType,
  GB_CLASS_STATS, GB_FORMATION, GB_FIELD, GB_MATCH,
  type GBTeamDef,
} from "./GrailBallConfig";

// ---------------------------------------------------------------------------
// Vec3 helper
// ---------------------------------------------------------------------------
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function v3(x = 0, y = 0, z = 0): Vec3 { return { x, y, z }; }

export function v3Dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function v3Dist3D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function v3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

export function v3Normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.0001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function v3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function v3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function v3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function v3Len(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

// ---------------------------------------------------------------------------
// Player state
// ---------------------------------------------------------------------------

export enum GBPlayerAction {
  IDLE = "idle",
  RUNNING = "running",
  SPRINTING = "sprinting",
  CARRYING = "carrying",
  THROWING = "throwing",
  TACKLING = "tackling",
  STUNNED = "stunned",
  CASTING = "casting",
  CELEBRATING = "celebrating",
  FOULED_OUT = "fouled_out",
}

export interface GBPlayer {
  id: number;
  teamIndex: number;     // 0 or 1
  slotIndex: number;     // 0..6
  cls: GBPlayerClass;
  name: string;

  // Transform
  pos: Vec3;
  vel: Vec3;
  facing: number;        // radians (0 = +x)
  targetPos: Vec3 | null;

  // Stats
  stamina: number;
  maxStamina: number;
  staminaRegen: number;
  speed: number;
  sprintMultiplier: number;
  tacklePower: number;
  throwPower: number;
  catchRadius: number;
  size: number;

  // Status
  action: GBPlayerAction;
  actionTimer: number;
  abilityCooldown: number;
  tackleCooldown: number;
  hasOrb: boolean;
  stunTimer: number;
  foulTimer: number;

  // Throw charge
  throwCharging: boolean;
  throwChargeTime: number;

  // Power-up
  activePowerUp: GBPowerUpType | null;
  powerUpTimer: number;

  // Animation
  animPhase: number;       // 0..1 loop for run cycle etc.
  animBlend: number;       // blend between idle and current action
  lastActionChange: number; // timestamp of last action change

  // AI hints
  aiRole: "chase_orb" | "defend" | "attack" | "support" | "mark" | "return";
  aiTarget: number | null; // id of player to mark, or null
}

// ---------------------------------------------------------------------------
// Orb (ball) state
// ---------------------------------------------------------------------------
export interface GBOrb {
  pos: Vec3;
  vel: Vec3;
  carrier: number | null;     // player id or null if free
  lastThrownBy: number | null;
  lastTeam: number | null;    // team that last touched it
  trail: Vec3[];              // recent positions for trail effect
  glowIntensity: number;
  inFlight: boolean;
}

// ---------------------------------------------------------------------------
// Power-up
// ---------------------------------------------------------------------------
export interface GBPowerUp {
  id: number;
  type: GBPowerUpType;
  pos: Vec3;
  active: boolean;
  spawnTimer: number;
  bobPhase: number;
}

// ---------------------------------------------------------------------------
// Match event (for event feed)
// ---------------------------------------------------------------------------
export interface GBMatchEvent {
  time: number;     // match clock
  type: "goal" | "foul" | "tackle" | "save" | "ability" | "powerup" | "halftime" | "match_start" | "match_end" | "overtime";
  text: string;
  teamIndex?: number;
  playerId?: number;
}

// ---------------------------------------------------------------------------
// Full match state
// ---------------------------------------------------------------------------
export interface GBMatchState {
  phase: GBMatchPhase;
  phaseTimer: number;

  // Teams
  teamDefs: [GBTeamDef, GBTeamDef];
  scores: [number, number];

  // Clock
  matchClock: number;        // seconds elapsed in current half
  half: number;              // 1 or 2
  overtime: boolean;

  // Entities
  players: GBPlayer[];
  orb: GBOrb;
  powerUps: GBPowerUp[];

  // Control
  selectedPlayerId: number;  // which player the human controls
  humanTeam: number;         // 0 or 1

  // Events
  events: GBMatchEvent[];

  // Merlin referee
  merlinPos: Vec3;
  merlinTarget: Vec3;
  merlinSpeech: string | null;
  merlinSpeechTimer: number;

  // Power-up spawn timer
  nextPowerUpSpawn: number;

  // Camera
  cameraShake: number;
  slowMoTimer: number;
  slowMoFactor: number;

  // Goal celebration
  lastGoalTeam: number;
  lastGoalScorer: number;

  // Stats
  possession: [number, number];  // time-based possession tracking
  shots: [number, number];
  saves: [number, number];
  tackles: [number, number];
  fouls: [number, number];

  // Next unique id
  nextId: number;
}

// ---------------------------------------------------------------------------
// Player names by class
// ---------------------------------------------------------------------------
const KNIGHT_NAMES = [
  "Sir Galahad", "Sir Lancelot", "Sir Gawain", "Sir Percival",
  "Sir Bors", "Sir Kay", "Sir Tristan", "Sir Bedivere",
  "Sir Gareth", "Sir Lamorak", "Sir Agravaine", "Sir Gaheris",
  "Sir Tor", "Sir Pellinore", "Sir Ector", "Sir Lionel",
];

const ROGUE_NAMES = [
  "Robin of Locksley", "Puck the Swift", "Shadow Marian",
  "Wren Nightshade", "Dagger Tom", "Silk Finch",
  "Raven Black", "Fox the Quick", "Viper Lane",
  "Ash the Shade", "Dart Hollow", "Wisp the Sly",
];

const MAGE_NAMES = [
  "Morgan le Fay", "Nimue", "Elaine of Astolat",
  "Morgause", "Viviane", "Igraine the Wise",
  "Taliesin", "Blaise", "Pelleas the Arcane",
  "Myrddin", "Fata Morgana", "Cerridwen",
];

const GATEKEEPER_NAMES = [
  "The Iron Sentinel", "Gorlois the Unyielding", "The Green Knight",
  "Brastias Ironwall", "The Black Gate", "Caradoc Strongarm",
  "Dagonet the Immovable", "Hector Shieldbearer",
];

function pickName(cls: GBPlayerClass, teamIdx: number, slotIdx: number): string {
  const pool = cls === GBPlayerClass.GATEKEEPER ? GATEKEEPER_NAMES
    : cls === GBPlayerClass.KNIGHT ? KNIGHT_NAMES
    : cls === GBPlayerClass.ROGUE ? ROGUE_NAMES
    : MAGE_NAMES;
  return pool[(teamIdx * 7 + slotIdx) % pool.length];
}

// ---------------------------------------------------------------------------
// Create initial match state
// ---------------------------------------------------------------------------
export function createMatchState(
  team1: GBTeamDef,
  team2: GBTeamDef,
  humanTeam = 0,
): GBMatchState {
  let nextId = 1;
  const players: GBPlayer[] = [];

  for (let ti = 0; ti < 2; ti++) {
    const teamDef = ti === 0 ? team1 : team2;
    const sign = ti === 0 ? -1 : 1; // team0 left, team1 right

    for (let si = 0; si < GB_FORMATION.length; si++) {
      const slot = GB_FORMATION[si];
      const stats = GB_CLASS_STATS[slot.cls];

      // Apply team modifiers
      const speedMod = teamDef.speedMod;
      const tackleMod = teamDef.tackleMod;
      const magicMod = teamDef.magicMod;

      const px = sign * slot.baseX * GB_FIELD.HALF_LENGTH;
      const pz = slot.baseZ * GB_FIELD.HALF_WIDTH;

      const player: GBPlayer = {
        id: nextId++,
        teamIndex: ti,
        slotIndex: si,
        cls: slot.cls,
        name: pickName(slot.cls, ti, si),

        pos: v3(px, 0, pz),
        vel: v3(),
        facing: ti === 0 ? 0 : Math.PI,
        targetPos: null,

        stamina: stats.maxStamina,
        maxStamina: stats.maxStamina,
        staminaRegen: stats.staminaRegen,
        speed: stats.speed * speedMod,
        sprintMultiplier: stats.sprintMultiplier,
        tacklePower: stats.tacklePower * tackleMod,
        throwPower: stats.throwPower * (slot.cls === GBPlayerClass.MAGE ? magicMod : 1),
        catchRadius: stats.catchRadius,
        size: stats.size,

        action: GBPlayerAction.IDLE,
        actionTimer: 0,
        abilityCooldown: 0,
        tackleCooldown: 0,
        hasOrb: false,
        stunTimer: 0,
        foulTimer: 0,

        throwCharging: false,
        throwChargeTime: 0,

        activePowerUp: null,
        powerUpTimer: 0,

        animPhase: Math.random(),
        animBlend: 0,
        lastActionChange: 0,

        aiRole: "defend",
        aiTarget: null,
      };

      players.push(player);
    }
  }

  const state: GBMatchState = {
    phase: GBMatchPhase.PRE_GAME,
    phaseTimer: 3,

    teamDefs: [team1, team2],
    scores: [0, 0],

    matchClock: 0,
    half: 1,
    overtime: false,

    players,
    orb: {
      pos: v3(0, 1, 0),
      vel: v3(),
      carrier: null,
      lastThrownBy: null,
      lastTeam: null,
      trail: [],
      glowIntensity: 1,
      inFlight: false,
    },
    powerUps: [],

    selectedPlayerId: players.find(p => p.teamIndex === humanTeam && p.cls === GBPlayerClass.ROGUE)?.id ?? players[humanTeam === 0 ? 3 : 10].id,
    humanTeam,

    events: [],

    merlinPos: v3(0, 12, 0),
    merlinTarget: v3(0, 12, 0),
    merlinSpeech: null,
    merlinSpeechTimer: 0,

    nextPowerUpSpawn: GB_MATCH.POWERUP_SPAWN_INTERVAL,

    cameraShake: 0,
    slowMoTimer: 0,
    slowMoFactor: 1,

    lastGoalTeam: -1,
    lastGoalScorer: -1,

    possession: [0, 0],
    shots: [0, 0],
    saves: [0, 0],
    tackles: [0, 0],
    fouls: [0, 0],

    nextId,
  };

  return state;
}

// ---------------------------------------------------------------------------
// Utility: get player by id
// ---------------------------------------------------------------------------
export function getPlayer(state: GBMatchState, id: number): GBPlayer | undefined {
  return state.players.find(p => p.id === id);
}

export function getOrbCarrier(state: GBMatchState): GBPlayer | undefined {
  if (state.orb.carrier == null) return undefined;
  return getPlayer(state, state.orb.carrier);
}

export function getTeamPlayers(state: GBMatchState, teamIndex: number): GBPlayer[] {
  return state.players.filter(p => p.teamIndex === teamIndex);
}

export function getSelectedPlayer(state: GBMatchState): GBPlayer | undefined {
  return getPlayer(state, state.selectedPlayerId);
}

// ---------------------------------------------------------------------------
// Reset positions for kickoff
// ---------------------------------------------------------------------------
export function resetPositionsForKickoff(state: GBMatchState, _scoringTeam: number): void {
  for (const p of state.players) {
    const slot = GB_FORMATION[p.slotIndex];
    const sign = p.teamIndex === 0 ? -1 : 1;
    p.pos.x = sign * slot.baseX * GB_FIELD.HALF_LENGTH;
    p.pos.y = 0;
    p.pos.z = slot.baseZ * GB_FIELD.HALF_WIDTH;
    p.vel = v3();
    p.facing = p.teamIndex === 0 ? 0 : Math.PI;
    p.action = GBPlayerAction.IDLE;
    p.actionTimer = 0;
    p.hasOrb = false;
    p.stunTimer = 0;
    p.throwCharging = false;
    p.throwChargeTime = 0;
  }

  // Orb at center
  state.orb.pos = v3(0, 1, 0);
  state.orb.vel = v3();
  state.orb.carrier = null;
  state.orb.lastThrownBy = null;
  state.orb.inFlight = false;
  state.orb.trail = [];
}

// ---------------------------------------------------------------------------
// Push event
// ---------------------------------------------------------------------------
export function pushEvent(state: GBMatchState, type: GBMatchEvent["type"], text: string, teamIndex?: number, playerId?: number): void {
  state.events.push({
    time: state.matchClock,
    type,
    text,
    teamIndex,
    playerId,
  });
  // Keep last 50 events
  if (state.events.length > 50) state.events.shift();
}
