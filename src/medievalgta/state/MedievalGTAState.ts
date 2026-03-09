// Medieval GTA – shared state types and factory function

export interface GTAVec2 { x: number; y: number; }

export type GTANPCType =
  | 'civilian_m' | 'civilian_f'
  | 'merchant' | 'blacksmith_npc' | 'priest' | 'bard' | 'stable_master' | 'tavern_keeper'
  | 'guard' | 'knight' | 'archer_guard' | 'army_soldier'
  | 'criminal' | 'bandit';

export type GTANPCBehavior =
  | 'wander' | 'patrol' | 'idle' | 'stand'
  | 'flee' | 'chase_player' | 'attack_player'
  | 'dead';

export type GTAPlayerState =
  | 'idle' | 'walking' | 'running'
  | 'on_horse_idle' | 'on_horse_moving'
  | 'attacking' | 'blocking' | 'rolling'
  | 'dead';

export type GTAHorseState = 'free' | 'tied' | 'ridden_by_player' | 'ridden_by_npc';

export type GTAQuestStatus = 'available' | 'active' | 'completed' | 'failed';

export type GTAItemType = 'gold_pile' | 'health_potion' | 'sword' | 'bow' | 'key' | 'supply_crate' | 'letter' | 'treasure_chest';

export type GTABuildingType =
  | 'castle' | 'castle_tower' | 'barracks' | 'church' | 'tavern'
  | 'market_stall' | 'blacksmith_shop' | 'stable' | 'prison' | 'temple'
  | 'house_large' | 'house_medium' | 'house_small'
  | 'wall_h' | 'wall_v' | 'wall_tower' | 'gate_n' | 'gate_s' | 'gate_e' | 'gate_w'
  | 'well' | 'fountain' | 'tree_cluster' | 'cart' | 'hay_bale'
  | 'farm_field' | 'farmhouse' | 'mill';

export type GTAFacingDir = 'n' | 's' | 'e' | 'w';

export interface GTAPlayer {
  pos: GTAVec2;
  vel: GTAVec2;
  hp: number;
  maxHp: number;
  state: GTAPlayerState;
  facing: number;           // radians, 0 = right
  facingDir: GTAFacingDir;
  gold: number;
  wantedLevel: number;      // 0-5
  wantedDecayTimer: number;
  onHorse: boolean;
  mountedHorseId: string | null;
  weapon: 'fists' | 'sword' | 'bow';
  attackCooldown: number;
  attackTimer: number;
  blockTimer: number;
  rollTimer: number;
  rollVel: GTAVec2;
  invincibleTimer: number;
  activeQuestIds: string[];
  completedQuestIds: string[];
  dialogCooldown: number;
  runStamina: number;       // 0-100
  runStaminaRegen: number;
  stealAnimTimer: number;
  hasBow: boolean;
  pickpocketCooldown: number;
  killStreak: number;
  killStreakTimer: number;
}

export interface GTANPC {
  id: string;
  type: GTANPCType;
  name: string;
  pos: GTAVec2;
  vel: GTAVec2;
  hp: number;
  maxHp: number;
  behavior: GTANPCBehavior;
  facing: number;
  facingDir: GTAFacingDir;
  patrolPath: GTAVec2[];
  patrolIndex: number;
  patrolDir: 1 | -1;
  wanderTarget: GTAVec2 | null;
  wanderTimer: number;
  chaseTimer: number;
  attackTimer: number;
  attackCooldown: number;
  alertRadius: number;
  aggroRadius: number;
  dialogLines: string[];
  questId: string | null;
  onHorse: boolean;
  colorVariant: number;     // 0-3
  dead: boolean;
  deathTimer: number;
  homePos: GTAVec2;
  damage: number;
  speed: number;
}

export interface GTAHorse {
  id: string;
  pos: GTAVec2;
  vel: GTAVec2;
  state: GTAHorseState;
  facing: number;
  facingDir: GTAFacingDir;
  hp: number;
  maxHp: number;
  color: 'brown' | 'black' | 'white' | 'grey';
  basePos: GTAVec2;
  speed: number;
}

export interface GTABuilding {
  id: string;
  type: GTABuildingType;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  label?: string;
  interactable?: boolean;
  interactRadius?: number;
  blocksMovement?: boolean;
}

export interface GTAQuestObjective {
  type: 'kill' | 'collect' | 'reach' | 'talk' | 'escort';
  description: string;
  targetNpcId?: string;
  targetPos?: GTAVec2;
  targetRadius?: number;
  targetNpcType?: GTANPCType;
  killCount?: number;
  killCurrent?: number;
  itemType?: GTAItemType;
  itemCount?: number;
  itemCurrent?: number;
  completed: boolean;
}

export interface GTAQuest {
  id: string;
  title: string;
  description: string;
  giverNpcId: string;
  status: GTAQuestStatus;
  objectives: GTAQuestObjective[];
  reward: { gold: number; description: string };
  completionDialog: string;
}

export interface GTAItem {
  id: string;
  type: GTAItemType;
  pos: GTAVec2;
  amount: number;
  collected: boolean;
}

export interface GTAProjectile {
  id: string;
  pos: GTAVec2;
  vel: GTAVec2;
  damage: number;
  life: number; // seconds remaining
  ownedByPlayer: boolean;
}

export interface GTAParticle {
  pos: GTAVec2;
  vel: GTAVec2;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export interface GTANotification {
  text: string;
  timer: number;
  color: number;
  id: string;
}

export interface MedievalGTAState {
  tick: number;
  timeElapsed: number;
  player: GTAPlayer;
  npcs: Map<string, GTANPC>;
  horses: Map<string, GTAHorse>;
  buildings: GTABuilding[];
  items: GTAItem[];
  quests: GTAQuest[];
  projectiles: GTAProjectile[];
  particles: GTAParticle[];
  notifications: GTANotification[];
  bountyHunterSpawned: boolean;
  worldWidth: number;
  worldHeight: number;
  cityBounds: { x: number; y: number; w: number; h: number };
  wallThickness: number;
  cameraX: number;
  cameraY: number;
  cameraTargetX: number;
  cameraTargetY: number;
  dayTime: number;          // 0=dawn 0.25=noon 0.5=dusk 0.75=midnight
  daySpeed: number;
  paused: boolean;
  gameOver: boolean;
  showQuestLog: boolean;
  showPauseMenu: boolean;
  dialogNpcId: string | null;
  dialogText: string;
  dialogOptions: Array<{ text: string; action: string }>;
  keys: Set<string>;
  mousePos: GTAVec2;
  mouseWorldPos: GTAVec2;
  mouseDown: boolean;
  rightMouseDown: boolean;
  nextId: number;
  screenWidth: number;
  screenHeight: number;
  interactKey: boolean;
  lastInteractKey: boolean;
}

export function createMedievalGTAState(): MedievalGTAState {
  return {
    tick: 0,
    timeElapsed: 0,

    player: {
      pos: { x: 2000, y: 1500 },
      vel: { x: 0, y: 0 },
      hp: 100,
      maxHp: 100,
      state: 'idle',
      facing: 0,
      facingDir: 's',
      gold: 50,
      wantedLevel: 0,
      wantedDecayTimer: 0,
      onHorse: false,
      mountedHorseId: null,
      weapon: 'sword',
      attackCooldown: 0,
      attackTimer: 0,
      blockTimer: 0,
      rollTimer: 0,
      rollVel: { x: 0, y: 0 },
      invincibleTimer: 0,
      activeQuestIds: [],
      completedQuestIds: [],
      dialogCooldown: 0,
      runStamina: 100,
      runStaminaRegen: 15,
      stealAnimTimer: 0,
      hasBow: false,
      pickpocketCooldown: 0,
      killStreak: 0,
      killStreakTimer: 0,
    },

    npcs: new Map<string, GTANPC>(),
    horses: new Map<string, GTAHorse>(),
    buildings: [],
    items: [],
    quests: [],
    projectiles: [],
    particles: [],
    notifications: [],
    bountyHunterSpawned: false,

    worldWidth: 4000,
    worldHeight: 3000,
    cityBounds: { x: 800, y: 500, w: 2400, h: 2000 },
    wallThickness: 40,

    cameraX: 2000,
    cameraY: 1500,
    cameraTargetX: 2000,
    cameraTargetY: 1500,

    dayTime: 0.25,
    daySpeed: 0.003,

    paused: false,
    gameOver: false,
    showQuestLog: false,
    showPauseMenu: false,
    dialogNpcId: null,
    dialogText: '',
    dialogOptions: [],

    keys: new Set<string>(),
    mousePos: { x: 0, y: 0 },
    mouseWorldPos: { x: 0, y: 0 },
    mouseDown: false,
    rightMouseDown: false,
    nextId: 1,

    screenWidth: 1200,
    screenHeight: 800,
    interactKey: false,
    lastInteractKey: false,
  };
}

export function genId(state: MedievalGTAState): string {
  const id = `id_${state.nextId}`;
  state.nextId += 1;
  return id;
}
