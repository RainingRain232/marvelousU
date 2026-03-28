import {
  DiabloState, DiabloEnemy, DiabloItem, DiabloLoot,
  DiabloMapId, GreaterRiftState, DamageType, EnemyState,
  EnemyBehavior, EnemyType, GRLeaderboardEntry,
  RiftPylonType, RiftPylon,
} from "./DiabloTypes";
import { MAP_CONFIGS, ENEMY_DEFS, GREATER_RIFT_CONFIG } from "./DiabloConfig";

// ────────────────────────────────────────────────────────────────────────────
// Rift Context — everything the rift system needs from the game
// ────────────────────────────────────────────────────────────────────────────

export interface RiftContext {
  state: DiabloState;
  genId: () => string;
  addFloatingText: (x: number, y: number, z: number, text: string, color: string) => void;
  updateAchievement: (id: string, progress: number) => void;
  addLeaderboardEntry: (entry: GRLeaderboardEntry) => void;
  rollLoot: (enemy: DiabloEnemy) => DiabloItem[];
  startMap: (mapId: DiabloMapId) => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Exported functions
// ────────────────────────────────────────────────────────────────────────────

export function startGreaterRift(ctx: RiftContext, level: number): void {
  const rift = ctx.state.greaterRift;
  if (rift.keystones <= 0) return;

  rift.keystones--;
  rift.level = level;
  rift.state = GreaterRiftState.IN_PROGRESS;
  rift.progressBar = 0;
  rift.currentKills = 0;

  const cfg = GREATER_RIFT_CONFIG;
  rift.timeLimit = Math.max(cfg.minTimeLimit, cfg.baseTimeLimit + level * cfg.timeBonusPerLevel);
  rift.timeRemaining = rift.timeLimit;
  rift.killsForProgress = cfg.baseKillsRequired + level * cfg.killsPerLevel;
  rift.enemyHpMultiplier = 1 + level * cfg.hpScalePerLevel;
  rift.enemyDamageMultiplier = 1 + level * cfg.damageScalePerLevel;
  rift.xpMultiplier = 1 + level * cfg.xpScalePerLevel;
  rift.lootBonusMultiplier = 1 + level * cfg.lootScalePerLevel;

  // Reset pylons
  rift.pylons = [];
  rift.activePylonBuff = null;

  // Start a random map
  const riftableMaps = Object.values(DiabloMapId).filter(
    id => id !== DiabloMapId.CAMELOT && id !== DiabloMapId.CITY && id !== DiabloMapId.CITY_RUINS
  );
  const randomMap = riftableMaps[Math.floor(Math.random() * riftableMaps.length)];
  ctx.state.currentMap = randomMap;
  ctx.startMap(randomMap);

  // Spawn 1-3 pylons at random positions across the map
  const mapCfg = MAP_CONFIGS[randomMap];
  const halfW = mapCfg.width / 2 - 5;
  const halfD = ((mapCfg as any).depth || mapCfg.width) / 2 - 5;
  const numPylons = 1 + Math.floor(Math.random() * 3); // 1-3
  const pylonTypes = Object.values(RiftPylonType);
  const usedTypes: RiftPylonType[] = [];
  for (let i = 0; i < numPylons; i++) {
    let ptype: RiftPylonType;
    do {
      ptype = pylonTypes[Math.floor(Math.random() * pylonTypes.length)];
    } while (usedTypes.includes(ptype) && usedTypes.length < pylonTypes.length);
    usedTypes.push(ptype);
    const px = (Math.random() * 2 - 1) * halfW;
    const pz = (Math.random() * 2 - 1) * halfD;
    rift.pylons.push({
      id: `pylon-${ctx.genId()}`,
      type: ptype,
      x: px, y: 0, z: pz,
      consumed: false,
    });
  }
}

export function updateGreaterRift(ctx: RiftContext, dt: number): void {
  const rift = ctx.state.greaterRift;
  if (rift.state === GreaterRiftState.NOT_ACTIVE) return;

  if (rift.state === GreaterRiftState.IN_PROGRESS || rift.state === GreaterRiftState.BOSS_SPAWNED) {
    rift.timeRemaining -= dt;

    if (rift.timeRemaining <= 0) {
      rift.state = GreaterRiftState.FAILED;
      ctx.addFloatingText(ctx.state.player.x, ctx.state.player.y + 3, ctx.state.player.z, 'RIFT FAILED!', '#ff2222');
      return;
    }
  }

  if (rift.state === GreaterRiftState.IN_PROGRESS) {
    rift.progressBar = Math.min(100, (rift.currentKills / rift.killsForProgress) * 100);

    if (rift.progressBar >= 100) {
      rift.state = GreaterRiftState.BOSS_SPAWNED;
      ctx.addFloatingText(ctx.state.player.x, ctx.state.player.y + 4, ctx.state.player.z, 'RIFT GUARDIAN APPROACHES!', '#ff8800');
      // Spawn a super-boss
      spawnRiftGuardian(ctx);
    }
  }
}

export function spawnRiftGuardian(ctx: RiftContext): void {
  const p = ctx.state.player;
  const rift = ctx.state.greaterRift;
  const mapCfg = MAP_CONFIGS[ctx.state.currentMap];
  const enemyTypes = mapCfg.enemyTypes;
  const bossType = enemyTypes[enemyTypes.length - 1]; // Use the strongest enemy type

  // Spawn at a distance from the player
  const angle = Math.random() * Math.PI * 2;
  const dist = 15 + Math.random() * 10;
  const bx = p.x + Math.sin(angle) * dist;
  const bz = p.z + Math.cos(angle) * dist;

  const enemyDef = ENEMY_DEFS[bossType];
  const baseHp = (enemyDef?.hp || 500) * rift.enemyHpMultiplier * 5; // 5x for guardian
  const baseDmg = (enemyDef?.damage || 30) * rift.enemyDamageMultiplier * 3;

  const guardian: DiabloEnemy = {
    id: `rift-guardian-${ctx.genId()}`,
    type: bossType,
    x: bx, y: 0, z: bz,
    angle: 0,
    hp: baseHp,
    maxHp: baseHp,
    damage: baseDmg,
    damageType: DamageType.PHYSICAL,
    armor: 20 + rift.level * 2,
    speed: 3.5,
    state: EnemyState.CHASE,
    targetId: null,
    attackTimer: 0,
    attackRange: 3,
    aggroRange: 50, // Always aggro
    xpReward: Math.floor(500 * rift.xpMultiplier),
    lootTable: [],
    deathTimer: 0,
    stateTimer: 0,
    patrolTarget: null,
    statusEffects: [],
    isBoss: true,
    bossName: `Rift Guardian (GR ${rift.level})`,
    scale: 2.5,
    level: Math.min(100, 20 + rift.level),
    behavior: EnemyBehavior.MELEE_BASIC,
    bossPhase: 0,
    bossAbilityCooldown: 0,
    bossEnraged: false,
    bossShieldTimer: 0,
  };

  ctx.state.enemies.push(guardian);
}

export function onRiftEnemyKill(ctx: RiftContext): void {
  const rift = ctx.state.greaterRift;
  if (rift.state === GreaterRiftState.IN_PROGRESS) {
    rift.currentKills++;
  }
}

export function onRiftGuardianKill(ctx: RiftContext): void {
  const rift = ctx.state.greaterRift;
  if (rift.state === GreaterRiftState.BOSS_SPAWNED) {
    rift.state = GreaterRiftState.COMPLETED;
    if (rift.level > rift.bestRiftLevel) {
      rift.bestRiftLevel = rift.level;
    }
    // Reward keystones
    rift.keystones += 2;
    // Achievement tracking: greater rift complete
    ctx.updateAchievement('rift_runner', rift.level);
    ctx.updateAchievement('rift_master', rift.level);
    ctx.updateAchievement('rift_legend', rift.level);

    // Add leaderboard entry
    ctx.addLeaderboardEntry({
      playerName: ctx.state.multiplayer.playerName || 'Hero',
      class: ctx.state.player.class,
      level: ctx.state.player.level,
      grLevel: rift.level,
      timeRemaining: rift.timeRemaining,
      date: new Date().toISOString().split('T')[0],
    });

    ctx.addFloatingText(
      ctx.state.player.x, ctx.state.player.y + 4, ctx.state.player.z,
      `GR ${rift.level} CLEARED! +2 Keystones`, '#ffd700'
    );

    // Bonus loot shower
    for (let i = 0; i < 3 + Math.floor(rift.level / 10); i++) {
      const lootAngle = Math.random() * Math.PI * 2;
      const lootDist = 1 + Math.random() * 3;
      const lx = ctx.state.player.x + Math.sin(lootAngle) * lootDist;
      const lz = ctx.state.player.z + Math.cos(lootAngle) * lootDist;
      const lootLevel = Math.min(20 + rift.level, 100);
      const lootItems = ctx.rollLoot({
        type: EnemyType.SKELETON_WARRIOR,
        level: lootLevel,
        isBoss: true,
        lootTable: [],
      } as unknown as DiabloEnemy);
      for (const item of lootItems) {
        const loot: DiabloLoot = {
          id: ctx.genId(),
          item,
          x: lx + (Math.random() * 2 - 1),
          y: 0,
          z: lz + (Math.random() * 2 - 1),
          timer: 0,
        };
        ctx.state.loot.push(loot);
      }
    }
  }
}
