import { SB } from "../config/SolsticeBalance";

export type UnitKind   = "guardian" | "warden" | "invoker";
export type Owner      = "player" | "ai" | "neutral";
export type SolPhase   = "playing" | "victory" | "defeat";

export interface SolPlatform {
  id:             number;
  pos:            { x: number; y: number; z: number };
  adjacentIds:    number[];
  owner:          Owner;
  /** 0 = fully player, 0.5 = neutral, 1 = fully ai */
  captureProgress: number;
  isBase:         boolean;
  isCenter:       boolean;
}

export interface SolUnit {
  id:           string;
  owner:        "player" | "ai";
  kind:         UnitKind;
  hp:           number;
  maxHp:        number;
  platId:       number;
  destPlatId:   number | null;
  bridgeT:      number;
  attackTimer:  number;
  offsetX:      number;
  offsetZ:      number;
  x:            number;
  y:            number;
  z:            number;
  isDead:       boolean;
  spawnFlash:   number;
}

export interface SolsticeState {
  phase:        SolPhase;
  elapsed:      number;
  cycleT:       number;       // 0..1 within full day+night cycle
  playerEssence: number;
  aiEssence:    number;
  playerScore:  number;
  aiScore:      number;
  platforms:    SolPlatform[];
  units:        Map<string, SolUnit>;
  nextUnitId:   number;
  aiSpawnTimer: number;
  aiThinkTimer: number;
  alignmentFlash: number;     // countdown for visual flash
  alignmentMsg:   string;
  victoryMessage: string;
  rallyPlatId:    number | null;
  essenceRate:    number;     // for HUD display
}

// ---------------------------------------------------------------------------
// Platform layout
// ---------------------------------------------------------------------------

const LAYOUT = [
  { x: -27, y:  2, z: 22,  adj: [1],           base: true,  center: false },
  { x: -17, y:  7, z:  5,  adj: [0, 2, 3],     base: false, center: false },
  { x:  -9, y: 12, z: -13, adj: [1, 3],         base: false, center: false },
  { x:   0, y: 19, z:   0, adj: [1, 2, 4, 5],  base: false, center: true  },
  { x:   9, y: 12, z: -13, adj: [3, 5],         base: false, center: false },
  { x:  17, y:  7, z:  5,  adj: [3, 4, 6],     base: false, center: false },
  { x:  27, y:  2, z: 22,  adj: [5],            base: true,  center: false },
];

export function createSolsticeState(): SolsticeState {
  const platforms: SolPlatform[] = LAYOUT.map((p, id) => ({
    id,
    pos:             { x: p.x, y: p.y, z: p.z },
    adjacentIds:     p.adj,
    owner:           id === 0 ? "player" : id === 6 ? "ai" : "neutral",
    captureProgress: id === 0 ? 0 : id === 6 ? 1 : 0.5,
    isBase:          p.base,
    isCenter:        p.center,
  }));

  return {
    phase:          "playing",
    elapsed:        0,
    cycleT:         0.08,
    playerEssence:  SB.START_ESSENCE,
    aiEssence:      SB.START_ESSENCE,
    playerScore:    0,
    aiScore:        0,
    platforms,
    units:          new Map(),
    nextUnitId:     1,
    aiSpawnTimer:   4,
    aiThinkTimer:   2,
    alignmentFlash: 0,
    alignmentMsg:   "",
    victoryMessage: "",
    rallyPlatId:    null,
    essenceRate:    0,
  };
}

export function spawnUnit(
  state:  SolsticeState,
  owner:  "player" | "ai",
  kind:   UnitKind,
  platId: number,
): SolUnit {
  const stats = SB.UNITS[kind];
  const angle  = Math.random() * Math.PI * 2;
  const r      = Math.random() * SB.PLATFORM_RADIUS * 0.5;
  const unit: SolUnit = {
    id:          `u${state.nextUnitId++}`,
    owner,
    kind,
    hp:          stats.hp,
    maxHp:       stats.hp,
    platId,
    destPlatId:  null,
    bridgeT:     0,
    attackTimer: Math.random() * SB.ATTACK_INTERVAL,
    offsetX:     Math.cos(angle) * r,
    offsetZ:     Math.sin(angle) * r,
    x: 0, y: 0, z: 0,
    isDead:      false,
    spawnFlash:  1.0,
  };
  state.units.set(unit.id, unit);
  return unit;
}

// BFS to find next hop from fromId toward toId
export function findNextHop(
  fromId: number,
  toId:   number,
  adj:    number[][],
): number | null {
  if (fromId === toId) return null;
  const visited = new Set([fromId]);
  const queue: Array<[number, number]> = adj[fromId].map(n => [n, n]);
  for (let i = 0; i < queue.length; i++) {
    const [cur, firstHop] = queue[i];
    if (cur === toId) return firstHop;
    if (!visited.has(cur)) {
      visited.add(cur);
      for (const nb of adj[cur]) {
        if (!visited.has(nb)) queue.push([nb, firstHop]);
      }
    }
  }
  return null;
}
