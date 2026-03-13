// Medieval GTA 3D – state types and factory

export interface Vec3 { x: number; y: number; z: number; }

export type WeaponType = 'fists' | 'sword' | 'axe' | 'mace' | 'spear' | 'bow' | 'crossbow';

export type NPCType3D =
  | 'civilian_m' | 'civilian_f'
  | 'merchant' | 'blacksmith' | 'priest' | 'bard' | 'tavern_keeper' | 'stable_master'
  | 'guard' | 'knight' | 'archer' | 'soldier'
  | 'criminal' | 'bandit' | 'assassin';

export type NPCBehavior3D =
  | 'wander' | 'patrol' | 'stand' | 'idle'
  | 'flee' | 'chase_player' | 'attack_player'
  | 'dead';

export type PlayerState3D =
  | 'idle' | 'walking' | 'running'
  | 'on_horse_idle' | 'on_horse_moving'
  | 'attacking' | 'blocking' | 'rolling'
  | 'dead';

export type HorseColor3D = 'brown' | 'black' | 'white' | 'grey' | 'chestnut';
export type HorseState3D = 'free' | 'tied' | 'ridden_by_player' | 'ridden_by_npc';

export interface Player3D {
  pos: Vec3;
  vel: Vec3;
  rotation: number; // Y-axis rotation in radians
  hp: number;
  maxHp: number;
  state: PlayerState3D;
  gold: number;
  wantedLevel: number;
  wantedDecayTimer: number;
  onHorse: boolean;
  mountedHorseId: string | null;
  weapon: WeaponType;
  weapons: WeaponType[];
  weaponIndex: number;
  attackCooldown: number;
  attackTimer: number;
  blockTimer: number;
  rollTimer: number;
  rollDir: Vec3;
  invincibleTimer: number;
  stamina: number;
  staminaRegen: number;
  killStreak: number;
  killStreakTimer: number;
  dialogCooldown: number;
  stealCooldown: number;
}

export interface NPC3D {
  id: string;
  type: NPCType3D;
  name: string;
  pos: Vec3;
  vel: Vec3;
  rotation: number;
  hp: number;
  maxHp: number;
  behavior: NPCBehavior3D;
  patrolPath: Vec3[];
  patrolIndex: number;
  patrolDir: 1 | -1;
  wanderTarget: Vec3 | null;
  wanderTimer: number;
  chaseTimer: number;
  attackTimer: number;
  attackCooldown: number;
  alertRadius: number;
  aggroRadius: number;
  damage: number;
  speed: number;
  dead: boolean;
  deathTimer: number;
  homePos: Vec3;
  colorVariant: number;
}

export interface Horse3D {
  id: string;
  pos: Vec3;
  vel: Vec3;
  rotation: number;
  hp: number;
  maxHp: number;
  state: HorseState3D;
  color: HorseColor3D;
  basePos: Vec3;
  speed: number;
}

export interface Building3D {
  id: string;
  type: string;
  pos: Vec3;
  size: Vec3; // width, height, depth
  rotation: number;
  name: string;
  interactable: boolean;
  blocksMovement: boolean;
}

export interface Item3D {
  id: string;
  type: string;
  pos: Vec3;
  amount: number;
  collected: boolean;
}

export interface Projectile3D {
  id: string;
  pos: Vec3;
  vel: Vec3;
  damage: number;
  life: number;
  ownedByPlayer: boolean;
}

export interface Particle3D {
  pos: Vec3;
  vel: Vec3;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export interface Notification3D {
  id: string;
  text: string;
  timer: number;
  color: number;
}

export interface GTA3DState {
  tick: number;
  gameTime: number;
  player: Player3D;
  npcs: Map<string, NPC3D>;
  horses: Map<string, Horse3D>;
  buildings: Building3D[];
  items: Item3D[];
  projectiles: Projectile3D[];
  particles: Particle3D[];
  notifications: Notification3D[];
  worldSize: number;
  cityRadius: number;
  dayTime: number;
  daySpeed: number;
  paused: boolean;
  gameOver: boolean;
  screenW: number;
  screenH: number;
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  rightMouseDown: boolean;
  nextId: number;
  cameraX: number;
  cameraZ: number;
  cameraTargetX: number;
  cameraTargetZ: number;
}

export function createGTA3DState(sw: number, sh: number): GTA3DState {
  return {
    tick: 0,
    gameTime: 0,
    player: {
      pos: { x: 0, y: 0, z: 10 },
      vel: { x: 0, y: 0, z: 0 },
      rotation: 0,
      hp: 100,
      maxHp: 100,
      state: 'idle',
      gold: 50,
      wantedLevel: 0,
      wantedDecayTimer: 0,
      onHorse: false,
      mountedHorseId: null,
      weapon: 'sword',
      weapons: ['fists', 'sword'],
      weaponIndex: 1,
      attackCooldown: 0,
      attackTimer: 0,
      blockTimer: 0,
      rollTimer: 0,
      rollDir: { x: 0, y: 0, z: 0 },
      invincibleTimer: 0,
      stamina: 100,
      staminaRegen: 15,
      killStreak: 0,
      killStreakTimer: 0,
      dialogCooldown: 0,
      stealCooldown: 0,
    },
    npcs: new Map(),
    horses: new Map(),
    buildings: [],
    items: [],
    projectiles: [],
    particles: [],
    notifications: [],
    worldSize: 200,
    cityRadius: 60,
    dayTime: 0.25,
    daySpeed: 0.002,
    paused: false,
    gameOver: false,
    screenW: sw,
    screenH: sh,
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    rightMouseDown: false,
    nextId: 1,
    cameraX: 0,
    cameraZ: 10,
    cameraTargetX: 0,
    cameraTargetZ: 10,
  };
}

export function genId3D(state: GTA3DState): string {
  return `id_${state.nextId++}`;
}
