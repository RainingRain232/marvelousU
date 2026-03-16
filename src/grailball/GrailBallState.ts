// ---------------------------------------------------------------------------
// Grail Ball -- Game State
// All mutable match data lives here. Pure data, no logic.
// ---------------------------------------------------------------------------

import {
  GBPlayerClass, GBMatchPhase, GBPowerUpType,
  GBWeatherType, GBPosition, getPositionForSlot,
  GB_CLASS_STATS, GB_FORMATION, GB_FIELD, GB_MATCH, GB_STAMINA,
  GB_CAREER, GB_REPLAY, GB_FORMATION_TEMPLATES,
  GB_WEATHER_EFFECTS, GB_POSITION_ABILITIES,
  type GBTeamDef, type GBWeatherEffect,
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

  // Fatigue system
  fatigueFactor: number;       // 1.0 = fresh, decreases toward 0 with fatigue
  totalDistanceRun: number;    // cumulative distance for fatigue tracking
  isSubstitute: boolean;       // on bench, available as sub

  // Position ability
  position: GBPosition;
  positionAbilityCooldown: number;
  positionAbilityActive: boolean;
  positionAbilityTimer: number;

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

  // Enhanced ball physics
  spin: Vec3;                  // angular velocity (spin axis)
  curve: number;               // current lateral curve force
  surfaceType: "grass" | "mud" | "stone"; // affects friction
  lastBounceTime: number;      // time of last bounce
  bounceCount: number;         // number of bounces since last throw
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
  type: "goal" | "foul" | "tackle" | "save" | "ability" | "powerup" | "halftime"
      | "match_start" | "match_end" | "overtime" | "penalty" | "substitution"
      | "header" | "volley" | "injury_time" | "ceremony";
  text: string;
  teamIndex?: number;
  playerId?: number;
}

// ---------------------------------------------------------------------------
// Replay system state
// ---------------------------------------------------------------------------
export interface GBReplayFrame {
  players: Array<{ id: number; pos: Vec3; vel: Vec3; facing: number; action: GBPlayerAction; hasOrb: boolean }>;
  orbPos: Vec3;
  orbVel: Vec3;
  orbCarrier: number | null;
  matchClock: number;
}

export interface GBReplayMoment {
  type: "goal" | "save" | "foul" | "ability";
  timestamp: number;
  frames: GBReplayFrame[];
  scorerId?: number;
  teamIndex?: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Penalty shootout state
// ---------------------------------------------------------------------------
export interface GBPenaltyState {
  round: number;             // current round (1-based)
  shooterTeam: number;       // which team is shooting
  scores: [number, number];  // penalty scores
  attempts: [number, number]; // total attempts
  shooterId: number | null;  // current shooter
  keeperId: number | null;   // current keeper
  phase: "aiming" | "shooting" | "result" | "done";
  aimAngle: number;          // current aim direction
  aimPower: number;          // shot power
  shotTimer: number;         // time remaining to shoot
  resultTimer: number;       // display result time
  history: Array<{ team: number; scored: boolean; shooter: string }>;
}

// ---------------------------------------------------------------------------
// Career mode state
// ---------------------------------------------------------------------------
export interface GBCareerSeason {
  year: number;
  leagueTable: GBLeagueEntry[];
  fixtures: GBFixture[];
  currentFixture: number;
  cupRound: number;
  cupEliminated: boolean;
}

export interface GBLeagueEntry {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface GBFixture {
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  isCup: boolean;
}

export interface GBPlayerProgression {
  playerId: string;
  name: string;
  cls: GBPlayerClass;
  seasonGoals: number;
  seasonAssists: number;
  seasonTackles: number;
  rating: number;            // 1-100
  potential: number;         // max rating
  speedBonus: number;
  tackleBonus: number;
  magicBonus: number;
}

export interface GBCareerState {
  active: boolean;
  playerTeamId: string;
  season: GBCareerSeason;
  transferBudget: number;
  trophies: Array<{ type: "league" | "cup"; year: number }>;
  allTimeStats: {
    totalWins: number;
    totalDraws: number;
    totalLosses: number;
    totalGoalsFor: number;
    totalGoalsAgainst: number;
    seasonsPlayed: number;
  };
  roster: GBPlayerProgression[];
  subsUsed: number;
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

  // Replay system
  replayMoments: GBReplayMoment[];
  replayRecording: GBReplayFrame[];
  replayActive: boolean;
  replayPlaybackIndex: number;
  replayPlaybackTimer: number;
  replayCurrentMoment: GBReplayMoment | null;
  replayCameraAngle: number;   // index into camera angles

  // Injury time
  injuryTime: number;            // calculated injury time for current half
  injuryTimeAnnounced: boolean;
  stoppageAccumulator: number;   // accumulated stoppage events

  // Penalty shootout
  penaltyState: GBPenaltyState | null;

  // Formation
  teamFormations: [string, string];  // formation template ids per team
  pressureMode: [GBPressureMode, GBPressureMode]; // tactical mode per team

  // Substitutions
  subsRemaining: [number, number];
  benchPlayers: GBPlayer[];

  // Career
  careerState: GBCareerState | null;

  // Weather
  weather: GBWeatherType;
  weatherEffect: GBWeatherEffect;

  // Local multiplayer
  localMultiplayer: boolean;
  player2Team: number;           // 0 or 1 (which team P2 controls)
  selectedPlayer2Id: number;     // which player P2 controls
}

export type GBPressureMode = "balanced" | "offensive" | "defensive" | "ultra_attack" | "park_the_bus";

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
  weather?: GBWeatherType,
  localMultiplayer = false,
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

        fatigueFactor: 1.0,
        totalDistanceRun: 0,
        isSubstitute: false,

        position: getPositionForSlot(si),
        positionAbilityCooldown: 0,
        positionAbilityActive: false,
        positionAbilityTimer: 0,

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
      spin: v3(),
      curve: 0,
      surfaceType: "grass",
      lastBounceTime: 0,
      bounceCount: 0,
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

    // Replay
    replayMoments: [],
    replayRecording: [],
    replayActive: false,
    replayPlaybackIndex: 0,
    replayPlaybackTimer: 0,
    replayCurrentMoment: null,
    replayCameraAngle: 0,

    // Injury time
    injuryTime: 0,
    injuryTimeAnnounced: false,
    stoppageAccumulator: 0,

    // Penalty
    penaltyState: null,

    // Formation
    teamFormations: ["1-2-2-2", "1-2-2-2"],
    pressureMode: ["balanced", "balanced"],

    // Subs
    subsRemaining: [GB_MATCH.MAX_SUBS, GB_MATCH.MAX_SUBS],
    benchPlayers: [],

    // Career
    careerState: null,

    // Weather
    weather: weather ?? GBWeatherType.CLEAR,
    weatherEffect: GB_WEATHER_EFFECTS[weather ?? GBWeatherType.CLEAR],

    // Local multiplayer
    localMultiplayer,
    player2Team: localMultiplayer ? 1 : 0,
    selectedPlayer2Id: localMultiplayer
      ? (players.find(p => p.teamIndex === 1 && p.cls === GBPlayerClass.ROGUE)?.id ?? players[10].id)
      : 0,
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
  state.orb.spin = v3();
  state.orb.curve = 0;
  state.orb.bounceCount = 0;
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

  // Track stoppages for injury time
  if (type === "foul" || type === "goal" || type === "substitution") {
    state.stoppageAccumulator += type === "goal" ? 4 : type === "foul" ? 2 : 1.5;
  }
}

// ---------------------------------------------------------------------------
// Fatigue helpers
// ---------------------------------------------------------------------------
export function getStaminaFraction(p: GBPlayer): number {
  return p.stamina / p.maxStamina;
}

export function isFatigued(p: GBPlayer): boolean {
  return getStaminaFraction(p) < GB_STAMINA.LOW_STAMINA_THRESHOLD;
}

export function isCriticallyFatigued(p: GBPlayer): boolean {
  return getStaminaFraction(p) < GB_STAMINA.CRITICAL_STAMINA_THRESHOLD;
}

export function getFatigueSpeedMultiplier(p: GBPlayer): number {
  if (isCriticallyFatigued(p)) return GB_STAMINA.CRITICAL_SPEED_MULT;
  if (isFatigued(p)) return GB_STAMINA.FATIGUE_SPEED_MULT;
  return 1.0;
}

export function getFatigueAccuracyMultiplier(p: GBPlayer): number {
  if (isCriticallyFatigued(p)) return GB_STAMINA.CRITICAL_ACCURACY_MULT;
  if (isFatigued(p)) return GB_STAMINA.FATIGUE_ACCURACY_MULT;
  return 1.0;
}

export function getFatigueTackleMultiplier(p: GBPlayer): number {
  if (isFatigued(p)) return GB_STAMINA.FATIGUE_TACKLE_MULT;
  return 1.0;
}

// ---------------------------------------------------------------------------
// Weather helpers
// ---------------------------------------------------------------------------

/** Apply weather speed modifier to a player's effective speed */
export function getWeatherSpeedMultiplier(state: GBMatchState): number {
  return state.weatherEffect.playerSpeedMult;
}

/** Get wind force that should be applied to the orb each frame */
export function getWeatherWindForce(state: GBMatchState): { x: number; z: number } {
  return state.weatherEffect.windForce;
}

/** Get ball friction multiplier (slippery in rain, etc.) */
export function getWeatherBallFriction(state: GBMatchState): number {
  return state.weatherEffect.ballFrictionMult;
}

// ---------------------------------------------------------------------------
// Position ability helpers
// ---------------------------------------------------------------------------

/** Check if a position ability can be activated */
export function canUsePositionAbility(p: GBPlayer): boolean {
  const abilityDef = GB_POSITION_ABILITIES[p.position];
  return p.positionAbilityCooldown <= 0
    && p.stamina >= abilityDef.staminaCost
    && !p.positionAbilityActive;
}

/** Tick position ability cooldowns and active timers */
export function tickPositionAbility(p: GBPlayer, dt: number): void {
  if (p.positionAbilityCooldown > 0) {
    p.positionAbilityCooldown = Math.max(0, p.positionAbilityCooldown - dt);
  }
  if (p.positionAbilityActive) {
    p.positionAbilityTimer -= dt;
    if (p.positionAbilityTimer <= 0) {
      p.positionAbilityActive = false;
      p.positionAbilityTimer = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Multiplayer helpers
// ---------------------------------------------------------------------------

/** Get the player controlled by player 2 in local multiplayer */
export function getSelectedPlayer2(state: GBMatchState): GBPlayer | undefined {
  if (!state.localMultiplayer) return undefined;
  return getPlayer(state, state.selectedPlayer2Id);
}

// ---------------------------------------------------------------------------
// Replay helpers
// ---------------------------------------------------------------------------
export function captureReplayFrame(state: GBMatchState): GBReplayFrame {
  return {
    players: state.players.map(p => ({
      id: p.id,
      pos: v3(p.pos.x, p.pos.y, p.pos.z),
      vel: v3(p.vel.x, p.vel.y, p.vel.z),
      facing: p.facing,
      action: p.action,
      hasOrb: p.hasOrb,
    })),
    orbPos: v3(state.orb.pos.x, state.orb.pos.y, state.orb.pos.z),
    orbVel: v3(state.orb.vel.x, state.orb.vel.y, state.orb.vel.z),
    orbCarrier: state.orb.carrier,
    matchClock: state.matchClock,
  };
}

export function saveReplayMoment(
  state: GBMatchState,
  type: GBReplayMoment["type"],
  description: string,
  scorerId?: number,
  teamIndex?: number,
): void {
  const moment: GBReplayMoment = {
    type,
    timestamp: state.matchClock,
    frames: [...state.replayRecording],
    scorerId,
    teamIndex,
    description,
  };
  state.replayMoments.push(moment);
  if (state.replayMoments.length > GB_REPLAY.MAX_MOMENTS) {
    state.replayMoments.shift();
  }
}

// ---------------------------------------------------------------------------
// Career mode helpers
// ---------------------------------------------------------------------------
export function createCareerState(playerTeamId: string): GBCareerState {
  const teams = GB_FORMATION_TEMPLATES; // just to reference the import
  void teams; // suppress unused warning

  const leagueTable: GBLeagueEntry[] = [];
  // Use the imported GB_TEAMS from config won't work here, so we build minimal entries
  // This will be populated by the career system

  return {
    active: true,
    playerTeamId,
    season: {
      year: 1,
      leagueTable,
      fixtures: [],
      currentFixture: 0,
      cupRound: 1,
      cupEliminated: false,
    },
    transferBudget: GB_CAREER.TRANSFER_BUDGET_BASE,
    trophies: [],
    allTimeStats: {
      totalWins: 0,
      totalDraws: 0,
      totalLosses: 0,
      totalGoalsFor: 0,
      totalGoalsAgainst: 0,
      seasonsPlayed: 0,
    },
    roster: [],
    subsUsed: 0,
  };
}

// ---------------------------------------------------------------------------
// Penalty shootout helpers
// ---------------------------------------------------------------------------
export function createPenaltyState(): GBPenaltyState {
  return {
    round: 1,
    shooterTeam: 0,
    scores: [0, 0],
    attempts: [0, 0],
    shooterId: null,
    keeperId: null,
    phase: "aiming",
    aimAngle: 0,
    aimPower: 0.7,
    shotTimer: GB_MATCH.PENALTY_SHOT_TIME,
    resultTimer: 0,
    history: [],
  };
}
