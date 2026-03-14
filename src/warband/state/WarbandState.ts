// ---------------------------------------------------------------------------
// Warband mode – central game state
// ---------------------------------------------------------------------------

import type { WeaponDef } from "../config/WeaponDefs";
import type { ArmorDef, ArmorSlot } from "../config/ArmorDefs";
import type { CreatureType } from "../config/CreatureDefs";
import { WB } from "../config/WarbandBalanceConfig";

// ---- Enums ----------------------------------------------------------------

export enum WarbandPhase {
  MENU = "menu",
  SHOP = "shop",
  BATTLE = "battle",
  RESULTS = "results",
}

export enum BattleType {
  OPEN_FIELD = "open_field",
  SIEGE = "siege",
  DUEL = "duel",
  CAMERA_VIEW = "camera_view",
  ARMY_BATTLE = "army_battle",
}

export enum CombatDirection {
  LEFT_SWING = 0,   // swing from left to right
  RIGHT_SWING = 1,  // swing from right to left
  OVERHEAD = 2,     // overhead downward swing
  STAB = 3,         // forward thrust
}

export enum FighterCombatState {
  IDLE = "idle",
  WINDING = "winding",
  RELEASING = "releasing",
  RECOVERY = "recovery",
  BLOCKING = "blocking",
  STAGGERED = "staggered",
  DRAWING = "drawing", // bow draw / crossbow reload
  AIMING = "aiming",
  DEAD = "dead",
}

export enum CameraMode {
  FIRST_PERSON = "first_person",
  THIRD_PERSON = "third_person",
}

export enum FormationType {
  LINE = "line",
  COLUMN = "column",
  WEDGE = "wedge",
  SQUARE = "square",
  SCATTER = "scatter",
}

export enum TroopOrder {
  CHARGE = "charge",
  HOLD = "hold",
  FOLLOW = "follow",
}

export type Team = "player" | "enemy";

// ---- Vec3 -----------------------------------------------------------------

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function vec3Dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function vec3DistXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vec3Normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.0001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// ---- Skeleton Bone State --------------------------------------------------

export interface BoneTransform {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

export interface SkeletonPose {
  hips: BoneTransform;
  spine: BoneTransform;
  chest: BoneTransform;
  neck: BoneTransform;
  head: BoneTransform;
  leftUpperArm: BoneTransform;
  leftForearm: BoneTransform;
  leftHand: BoneTransform;
  rightUpperArm: BoneTransform;
  rightForearm: BoneTransform;
  rightHand: BoneTransform;
  leftThigh: BoneTransform;
  leftShin: BoneTransform;
  leftFoot: BoneTransform;
  rightThigh: BoneTransform;
  rightShin: BoneTransform;
  rightFoot: BoneTransform;
}

// ---- Equipment Loadout ----------------------------------------------------

export interface EquipmentLoadout {
  mainHand: WeaponDef | null;
  offHand: WeaponDef | null; // shield or secondary weapon
  armor: Partial<Record<ArmorSlot, ArmorDef | null>>;
}

// ---- Fighter Entity -------------------------------------------------------

export interface WarbandFighter {
  id: string;
  name: string;
  team: Team;
  isPlayer: boolean;

  // Transform
  position: Vec3;
  rotation: number; // Y-axis facing angle (radians)
  velocity: Vec3;
  onGround: boolean;

  // Stats
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;

  // Combat
  combatState: FighterCombatState;
  attackDirection: CombatDirection;
  blockDirection: CombatDirection;
  stateTimer: number; // ticks remaining in current combat state
  lastHitBy: string | null; // fighter id

  // Equipment
  equipment: EquipmentLoadout;
  inventory: (WeaponDef | ArmorDef)[];
  gold: number;

  // Ranged
  ammo: number;
  maxAmmo: number;

  // Mount
  mountId: string | null; // horse id if mounted
  isMounted: boolean;

  // Creature (null for humanoid fighters)
  creatureType: CreatureType | null;
  creatureRadius: number; // effective collision radius
  scale: number; // visual & collision scale (1.0 = normal human)

  // Animation
  walkCycle: number; // 0-1 walk animation phase
  animBlend: number; // blend factor for animation transitions

  // AI state (null for player)
  ai: AIState | null;

  // Spell cooldown
  lastSpellTick: number;

  // Morale
  morale: number;   // 0-100
  fleeing: boolean;

  // Stats tracking
  kills: number;
  damage_dealt: number;
  damage_taken: number;
  blocks: number;
  headshots: number;
  spellsCast: number;
  longestStreak: number;
  currentStreak: number;
}

// ---- AI State -------------------------------------------------------------

export interface AIState {
  targetId: string | null;
  decisionTimer: number;
  reactionDelay: number;
  blockChance: number;
  aggressiveness: number; // 0-1
  preferredRange: number; // ideal distance from target
  strafeDir: number; // -1 or 1
  strafeTimer: number;
}

// ---- Projectile -----------------------------------------------------------

export interface WarbandProjectile {
  id: string;
  ownerId: string;
  ownerTeam: Team;
  position: Vec3;
  velocity: Vec3;
  damage: number;
  gravity: number;
  alive: boolean;
  age: number; // ticks since launched
  projectileColor?: number; // magic ray color (set for staff projectiles)

  // Spell projectile (AoE on impact)
  isSpell?: boolean;
  aoeRadius?: number;
  aoeDamage?: number;
  aoeColor?: number;
}

// ---- Horse ----------------------------------------------------------------

export type HorseArmorTier = "light" | "medium" | "heavy";

export interface HorseState {
  id: string;
  hp: number;
  maxHp: number;
  armorTier: HorseArmorTier;
  riderId: string | null;
  position: Vec3;
  rotation: number;
  alive: boolean;
  walkCycle: number;
}

export function createHorse(
  id: string,
  armorTier: HorseArmorTier,
  position: Vec3,
  riderId: string | null,
): HorseState {
  const hpMap = { light: WB.HORSE_HP_LIGHT, medium: WB.HORSE_HP_MEDIUM, heavy: WB.HORSE_HP_HEAVY };
  const hp = hpMap[armorTier];
  return {
    id,
    hp,
    maxHp: hp,
    armorTier,
    riderId,
    position: { ...position },
    rotation: riderId ? 0 : Math.PI,
    alive: true,
    walkCycle: 0,
  };
}

// ---- Weapon Pickup --------------------------------------------------------

export interface WeaponPickup {
  id: string;
  position: Vec3;
  weapon: WeaponDef;
  age: number;
}

// ---- Game State -----------------------------------------------------------

export interface WarbandState {
  phase: WarbandPhase;
  battleType: BattleType;
  cameraMode: CameraMode;

  fighters: WarbandFighter[];
  horses: HorseState[];
  projectiles: WarbandProjectile[];
  pickups: WeaponPickup[];

  tick: number;
  battleTimer: number; // ticks remaining

  // Player reference
  playerId: string;

  // Score
  playerTeamAlive: number;
  enemyTeamAlive: number;

  // Round
  round: number;
  playerWins: number;
  enemyWins: number;

  // Siege capture
  siegeCaptureProgress: number; // ticks of capture accumulated
  siegeAttackersInZone: number; // count of attackers in capture zone
  siegeDefendersInZone: number; // count of defenders in capture zone

  // Pause
  paused: boolean;

  // Match options
  difficulty: 'easy' | 'normal' | 'hard' | 'brutal';
  weather: 'clear' | 'rain' | 'fog' | 'night';
  moraleEnabled: boolean;
  friendlyFire: boolean;
  doubleDamage: boolean;
  noRanged: boolean;
  allCavalry: boolean;
  creatureAbilities: boolean;

  // Formations & orders (army battle)
  formation: FormationType;
  troopOrder: TroopOrder;

  // Screen dimensions (for input mapping)
  screenW: number;
  screenH: number;
}

// ---- Factory --------------------------------------------------------------

export function createDefaultFighter(
  id: string,
  name: string,
  team: Team,
  isPlayer: boolean,
  position: Vec3,
): WarbandFighter {
  return {
    id,
    name,
    team,
    isPlayer,
    position,
    rotation: team === "player" ? Math.PI : 0,
    velocity: vec3(),
    onGround: true,

    hp: 100,
    maxHp: 100,
    stamina: WB.STAMINA_MAX,
    maxStamina: WB.STAMINA_MAX,

    combatState: FighterCombatState.IDLE,
    attackDirection: CombatDirection.RIGHT_SWING,
    blockDirection: CombatDirection.RIGHT_SWING,
    stateTimer: 0,
    lastHitBy: null,

    equipment: {
      mainHand: null,
      offHand: null,
      armor: {},
    },
    inventory: [],
    gold: WB.STARTING_GOLD,

    ammo: 0,
    maxAmmo: 0,

    mountId: null,
    isMounted: false,

    creatureType: null,
    creatureRadius: WB.FIGHTER_RADIUS,
    scale: 1.0,

    walkCycle: 0,
    animBlend: 0,

    ai: isPlayer
      ? null
      : {
          targetId: null,
          decisionTimer: 0,
          reactionDelay: WB.AI_REACTION_TICKS_NORMAL,
          blockChance: WB.AI_BLOCK_CHANCE_NORMAL,
          aggressiveness: 0.5,
          preferredRange: 2.0,
          strafeDir: 1,
          strafeTimer: 0,
        },

    lastSpellTick: -9999,

    morale: 100,
    fleeing: false,

    kills: 0,
    damage_dealt: 0,
    damage_taken: 0,
    blocks: 0,
    headshots: 0,
    spellsCast: 0,
    longestStreak: 0,
    currentStreak: 0,
  };
}

export function createWarbandState(
  battleType: BattleType,
  screenW: number,
  screenH: number,
): WarbandState {
  return {
    phase: WarbandPhase.SHOP,
    battleType,
    cameraMode: CameraMode.THIRD_PERSON,

    fighters: [],
    horses: [],
    projectiles: [],
    pickups: [],

    tick: 0,
    battleTimer: battleType === BattleType.SIEGE
      ? WB.SIEGE_BATTLE_TICKS
      : 60 * WB.TICKS_PER_SEC,

    playerId: "player_0",

    playerTeamAlive: battleType === BattleType.DUEL ? 1 : WB.TEAM_SIZE,
    enemyTeamAlive: battleType === BattleType.DUEL ? 1 : WB.TEAM_SIZE,

    round: 1,
    playerWins: 0,
    enemyWins: 0,

    siegeCaptureProgress: 0,
    siegeAttackersInZone: 0,
    siegeDefendersInZone: 0,

    paused: false,

    difficulty: 'normal',
    weather: 'clear',
    moraleEnabled: true,
    friendlyFire: false,
    doubleDamage: false,
    noRanged: false,
    allCavalry: false,
    creatureAbilities: true,

    formation: FormationType.LINE,
    troopOrder: TroopOrder.CHARGE,

    screenW,
    screenH,
  };
}
