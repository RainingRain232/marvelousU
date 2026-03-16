// GTAWantedSystem.ts – Wanted-level management. No PixiJS.
import type { MedievalGTAState, GTANPCType, GTANPC, GTABountyHunterState } from '../state/MedievalGTAState';
import { GTAConfig, BOUNTY_HUNTER_TIERS, BOUNTY_HUNTER_SPAWN_LOCATIONS } from '../config/MedievalGTAConfig';
import type { GTABountyHunterDef } from '../config/MedievalGTAConfig';
import { NPC_DEFINITIONS } from '../config/NPCDefs';

// ─── Wanted color ────────────────────────────────────────────────────────────

export function getWantedColor(level: number): number {
  if (level <= 0) return 0xffffff;
  if (level <= 2) return 0xffff00;
  if (level === 3) return 0xff8800;
  return 0xff0000; // 4–5
}

// ─── Guard response tier ─────────────────────────────────────────────────────

export type GuardResponseLevel = 'none' | 'alert' | 'chase' | 'lethal';

export function getGuardResponseLevel(wantedLevel: number): GuardResponseLevel {
  if (wantedLevel <= 0) return 'none';
  if (wantedLevel === 1) return 'alert';
  if (wantedLevel <= 3) return 'chase';
  return 'lethal';
}

// ─── NPC type classification ─────────────────────────────────────────────────

export function isHostileNPCType(type: GTANPCType): boolean {
  return (
    type === 'guard' ||
    type === 'knight' ||
    type === 'archer_guard' ||
    type === 'army_soldier'
  );
}

// ─── increaseWanted ──────────────────────────────────────────────────────────

export function increaseWanted(state: MedievalGTAState, amount: number): void {
  if (amount <= 0) return;

  const p         = state.player;
  const prevLevel = p.wantedLevel;
  p.wantedLevel   = Math.min(5, p.wantedLevel + amount);

  // Reset / extend decay timer based on new level
  p.wantedDecayTimer = GTAConfig.WANTED_DECAY_TIME * p.wantedLevel;

  if (p.wantedLevel !== prevLevel) {
    // Build wanted star string
    const stars = '★'.repeat(p.wantedLevel) + '☆'.repeat(5 - p.wantedLevel);
    state.notifications.push({
      id:    `wanted_${state.nextId++}`,
      text:  `WANTED LEVEL ${stars}`,
      timer: 3.0,
      color: getWantedColor(p.wantedLevel),
    });
  }
}

// ─── Reinforcement spawning ──────────────────────────────────────────────────

const GATE_POSITIONS = [
  GTAConfig.GATE_N,
  GTAConfig.GATE_S,
  GTAConfig.GATE_E,
  GTAConfig.GATE_W,
];

const MAX_REINFORCEMENTS = 4;
let _reinforcementCount = 0;
let _reinforcementTimer = 0;

function spawnReinforcementGuard(state: MedievalGTAState): void {
  if (_reinforcementCount >= MAX_REINFORCEMENTS) return;

  // Pick a random gate
  const gate = GATE_POSITIONS[Math.floor(Math.random() * GATE_POSITIONS.length)];
  const def = NPC_DEFINITIONS['guard'];

  const id = `reinf_guard_${state.nextId++}`;
  const npc: GTANPC = {
    id,
    type: 'guard',
    name: 'Reinforcement Guard',
    pos: { x: gate.x + (Math.random() - 0.5) * 60, y: gate.y + (Math.random() - 0.5) * 60 },
    vel: { x: 0, y: 0 },
    hp: def.hp,
    maxHp: def.hp,
    behavior: 'chase_player',
    facing: 0,
    facingDir: 's',
    patrolPath: [],
    patrolIndex: 0,
    patrolDir: 1,
    wanderTarget: null,
    wanderTimer: 0,
    chaseTimer: 30,
    attackTimer: 0,
    attackCooldown: def.attackCooldown,
    alertRadius: def.alertRadius,
    aggroRadius: def.aggroRadius,
    dialogLines: def.dialogLines,
    questId: null,
    onHorse: false,
    colorVariant: Math.floor(Math.random() * def.colorVariants),
    dead: false,
    deathTimer: 0,
    homePos: { x: gate.x, y: gate.y },
    damage: def.damage,
    speed: def.speed * 1.2, // reinforcements are faster
  };

  state.npcs.set(id, npc);
  _reinforcementCount++;
}

function updateReinforcements(state: MedievalGTAState, dt: number): void {
  const p = state.player;

  // Reset reinforcement count when wanted drops below 4
  if (p.wantedLevel < 4) {
    _reinforcementCount = 0;
    _reinforcementTimer = 0;
    return;
  }

  // Spawn reinforcements periodically at wanted >= 4
  _reinforcementTimer -= dt;
  if (_reinforcementTimer <= 0) {
    spawnReinforcementGuard(state);
    _reinforcementTimer = 5 + Math.random() * 3; // every 5-8 seconds
  }
}

// ─── Bounty Hunter Helpers ───────────────────────────────────────────────────

/** Maximum simultaneous bounty hunters in the world */
const MAX_BOUNTY_HUNTERS = 3;

/** Time between bounty hunter spawn attempts (seconds) */
const BOUNTY_HUNTER_SPAWN_INTERVAL = 20;

/** Pick a spawn position based on hunter tactics */
function pickBountyHunterSpawnPos(
  def: GTABountyHunterDef,
  playerPos: { x: number; y: number },
): { x: number; y: number } {
  const locs = BOUNTY_HUNTER_SPAWN_LOCATIONS;
  let candidates: { x: number; y: number }[];

  switch (def.tactics) {
    case 'ambush': {
      // Ambush hunters spawn at inns or roads near the player
      candidates = [...locs.inns, ...locs.roads];
      break;
    }
    case 'ranged': {
      // Ranged hunters spawn at city gates (elevated / distant positions)
      candidates = [...locs.cityGates, ...locs.roads];
      break;
    }
    case 'direct':
    default: {
      // Direct hunters spawn at gates
      candidates = [...locs.cityGates];
      break;
    }
  }

  // Sort by distance to player and pick a nearby one (ambush) or far one (direct/ranged)
  candidates.sort((a, b) => {
    const da = (a.x - playerPos.x) ** 2 + (a.y - playerPos.y) ** 2;
    const db = (b.x - playerPos.x) ** 2 + (b.y - playerPos.y) ** 2;
    return da - db;
  });

  if (def.tactics === 'ambush') {
    // Pick one of the closest positions
    const idx = Math.floor(Math.random() * Math.min(2, candidates.length));
    const pos = candidates[idx];
    return { x: pos.x + (Math.random() - 0.5) * 80, y: pos.y + (Math.random() - 0.5) * 80 };
  }

  // Direct / ranged: pick a random gate/road
  const pos = candidates[Math.floor(Math.random() * candidates.length)];
  return { x: pos.x + (Math.random() - 0.5) * 60, y: pos.y + (Math.random() - 0.5) * 60 };
}

/** Spawn a bounty hunter NPC from a tier definition */
function spawnBountyHunter(
  state: MedievalGTAState,
  def: GTABountyHunterDef,
): void {
  const spawnPos = pickBountyHunterSpawnPos(def, state.player.pos);
  const id = `bounty_hunter_${state.nextId++}`;

  // Determine initial behavior based on tactics
  let behavior: 'chase_player' | 'ambush' | 'hunt_player';
  if (def.tactics === 'ambush') {
    behavior = 'ambush';
  } else {
    behavior = 'hunt_player';
  }

  const npc: GTANPC = {
    id,
    type: 'bounty_hunter',
    name: def.name,
    pos: { x: spawnPos.x, y: spawnPos.y },
    vel: { x: 0, y: 0 },
    hp: def.hp,
    maxHp: def.hp,
    behavior,
    facing: 0,
    facingDir: 's',
    patrolPath: [],
    patrolIndex: 0,
    patrolDir: 1,
    wanderTarget: null,
    wanderTimer: 0,
    chaseTimer: 999,
    attackTimer: 0,
    attackCooldown: def.attackCooldown,
    alertRadius: 9999,
    aggroRadius: 9999,
    dialogLines: def.dialogLines,
    questId: null,
    onHorse: false,
    colorVariant: def.tier % 4,
    dead: false,
    deathTimer: 0,
    homePos: { x: spawnPos.x, y: spawnPos.y },
    damage: def.damage,
    speed: def.speed,
  };

  state.npcs.set(id, npc);

  // Track in active bounty hunters list
  const hunterState: GTABountyHunterState = {
    npcId: id,
    tier: def.tier,
    tactics: def.tactics,
    bribeCost: def.bribeCost,
    bountyReduction: def.bountyReduction,
    spawnTime: state.timeElapsed,
  };
  state.activeBountyHunters.push(hunterState);

  state.notifications.push({
    id: `notif_${state.nextId++}`,
    text: `${def.name} is hunting you!`,
    timer: 4.0,
    color: 0xff4400,
  });
}

/** Get eligible bounty hunter tiers for the current wanted level */
function getEligibleHunterDefs(wantedLevel: number): GTABountyHunterDef[] {
  return BOUNTY_HUNTER_TIERS.filter(h => wantedLevel >= h.minWantedLevel);
}

// ─── updateWanted ────────────────────────────────────────────────────────────

function updateBountyHunters(state: MedievalGTAState, dt: number): void {
  const p = state.player;

  // Clean up dead bounty hunters and grant bounty reduction
  for (let i = state.activeBountyHunters.length - 1; i >= 0; i--) {
    const bh = state.activeBountyHunters[i];
    const npc = state.npcs.get(bh.npcId);

    if (!npc || npc.dead) {
      // Bounty hunter was defeated – reduce wanted level
      if (npc?.dead) {
        p.wantedLevel = Math.max(0, p.wantedLevel - bh.bountyReduction);
        state.notifications.push({
          id: `notif_${state.nextId++}`,
          text: `Bounty hunter defeated! -${bh.bountyReduction} wanted`,
          timer: 3.0,
          color: 0x44ff44,
        });
      }
      state.activeBountyHunters.splice(i, 1);
    }
  }

  // Do not spawn bounty hunters at low wanted levels
  if (p.wantedLevel < 2) {
    state.bountyHunterSpawnTimer = 0;
    return;
  }

  // Spawn timer
  state.bountyHunterSpawnTimer -= dt;
  if (state.bountyHunterSpawnTimer > 0) return;

  // Reset spawn timer – shorter intervals at higher wanted levels
  const intervalScale = Math.max(0.4, 1.0 - (p.wantedLevel - 2) * 0.15);
  state.bountyHunterSpawnTimer = BOUNTY_HUNTER_SPAWN_INTERVAL * intervalScale;

  // Check if we are at max capacity
  if (state.activeBountyHunters.length >= MAX_BOUNTY_HUNTERS) return;

  // Pick a random eligible hunter tier
  const eligible = getEligibleHunterDefs(p.wantedLevel);
  if (eligible.length === 0) return;

  const def = eligible[Math.floor(Math.random() * eligible.length)];
  spawnBountyHunter(state, def);
}

/** Attempt to bribe a bounty hunter NPC. Returns true if successful. */
export function attemptBribeBountyHunter(
  state: MedievalGTAState,
  npcId: string,
): boolean {
  const bh = state.activeBountyHunters.find(h => h.npcId === npcId);
  if (!bh) return false;

  const p = state.player;
  if (p.gold < bh.bribeCost) {
    state.notifications.push({
      id: `notif_${state.nextId++}`,
      text: `Not enough gold to bribe! Need ${bh.bribeCost}g`,
      timer: 2.5,
      color: 0xff8800,
    });
    return false;
  }

  // Pay the bribe
  p.gold -= bh.bribeCost;

  // Remove the bounty hunter NPC
  const npc = state.npcs.get(npcId);
  if (npc) {
    npc.dead = true;
    npc.behavior = 'dead';
    npc.deathTimer = 0.5;
  }

  // Remove from active list
  const idx = state.activeBountyHunters.indexOf(bh);
  if (idx >= 0) state.activeBountyHunters.splice(idx, 1);

  state.notifications.push({
    id: `notif_${state.nextId++}`,
    text: `Bounty hunter bribed for ${bh.bribeCost}g`,
    timer: 3.0,
    color: 0xffdd00,
  });

  return true;
}

export function updateWanted(state: MedievalGTAState, dt: number): void {
  const p = state.player;
  if (p.state === 'dead') return;

  // Reinforcement spawning
  updateReinforcements(state, dt);

  // Tiered bounty hunter spawning and tracking
  updateBountyHunters(state, dt);

  if (p.wantedLevel <= 0) return;

  p.wantedDecayTimer -= dt;
  if (p.wantedDecayTimer <= 0) {
    p.wantedLevel      = Math.max(0, p.wantedLevel - 1);
    p.wantedDecayTimer = 0;

    if (p.wantedLevel > 0) {
      // Start timer for the next level
      p.wantedDecayTimer = GTAConfig.WANTED_DECAY_TIME * p.wantedLevel;
    }

    if (p.wantedLevel === 0) {
      state.notifications.push({
        id:    `wanted_clear_${state.nextId++}`,
        text:  'Wanted level cleared',
        timer: 2.5,
        color: 0x44ff44,
      });
    } else {
      const stars = '★'.repeat(p.wantedLevel) + '☆'.repeat(5 - p.wantedLevel);
      state.notifications.push({
        id:    `wanted_${state.nextId++}`,
        text:  `WANTED LEVEL ${stars}`,
        timer: 2.0,
        color: getWantedColor(p.wantedLevel),
      });
    }
  }
}
