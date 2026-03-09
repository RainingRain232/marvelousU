// GTAWantedSystem.ts – Wanted-level management. No PixiJS.
import type { MedievalGTAState, GTANPCType, GTANPC } from '../state/MedievalGTAState';
import { GTAConfig } from '../config/MedievalGTAConfig';
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

// ─── updateWanted ────────────────────────────────────────────────────────────

function updateBountyHunter(state: MedievalGTAState): void {
  const p = state.player;

  // Reset flag when wanted drops below 5
  if (p.wantedLevel < 5) {
    state.bountyHunterSpawned = false;
    return;
  }

  // Spawn bounty hunter at wanted 5 if not already spawned
  if (p.wantedLevel >= 5 && !state.bountyHunterSpawned) {
    state.bountyHunterSpawned = true;

    // Spawn from a random gate
    const gate = GATE_POSITIONS[Math.floor(Math.random() * GATE_POSITIONS.length)];
    const id = `bounty_hunter_${state.nextId++}`;
    const npc: GTANPC = {
      id,
      type: 'knight',
      name: 'Bounty Hunter',
      pos: { x: gate.x + (Math.random() - 0.5) * 60, y: gate.y + (Math.random() - 0.5) * 60 },
      vel: { x: 0, y: 0 },
      hp: 200,
      maxHp: 200,
      behavior: 'chase_player',
      facing: 0,
      facingDir: 's',
      patrolPath: [],
      patrolIndex: 0,
      patrolDir: 1,
      wanderTarget: null,
      wanderTimer: 0,
      chaseTimer: 999,
      attackTimer: 0,
      attackCooldown: 0.8,
      alertRadius: 9999,
      aggroRadius: 9999,
      dialogLines: ['You have a price on your head!', 'Justice will be served!'],
      questId: null,
      onHorse: false,
      colorVariant: 0,
      dead: false,
      deathTimer: 0,
      homePos: { x: gate.x, y: gate.y },
      damage: 30,
      speed: 180,
    };
    state.npcs.set(id, npc);

    state.notifications.push({
      id: `notif_${state.nextId++}`,
      text: 'A Bounty Hunter is after you!',
      timer: 4.0,
      color: 0xff0000,
    });
  }
}

export function updateWanted(state: MedievalGTAState, dt: number): void {
  const p = state.player;
  if (p.state === 'dead') return;

  // Reinforcement spawning
  updateReinforcements(state, dt);

  // Bounty hunter at wanted 5
  updateBountyHunter(state);

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
