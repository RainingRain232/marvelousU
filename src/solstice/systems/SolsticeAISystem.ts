import { SB } from "../config/SolsticeBalance";
import { SolsticeState, SolUnit, UnitKind, findNextHop, spawnUnit } from "../state/SolsticeState";

// ---------------------------------------------------------------------------
// AI system — decides spawns and unit movement for the ai faction
// ---------------------------------------------------------------------------

export function updateAI(state: SolsticeState, dt: number): void {
  if (state.phase !== "playing") return;

  state.aiSpawnTimer -= dt;
  state.aiThinkTimer -= dt;

  const adj = state.platforms.map(p => p.adjacentIds);

  // -- strategic thinking --
  if (state.aiThinkTimer <= 0) {
    state.aiThinkTimer = SB.AI_THINK_INTERVAL;
    _thinkMovement(state, adj);
  }

  // -- spawning --
  if (state.aiSpawnTimer <= 0) {
    state.aiSpawnTimer = SB.AI_SPAWN_INTERVAL + (Math.random() - 0.5) * 3;
    _trySpawn(state);
  }
}

function _trySpawn(state: SolsticeState): void {
  const aiUnits = [...state.units.values()].filter(u => u.owner === "ai" && !u.isDead);
  if (aiUnits.length >= SB.MAX_UNITS_PER_SIDE) return;

  // Pick unit type based on current situation
  const playerUnits = [...state.units.values()].filter(u => u.owner === "player" && !u.isDead);
  const isWinning   = state.platforms.filter(p => p.owner === "ai").length >= 4;

  let kind: UnitKind;
  const r = Math.random();
  if (isWinning) {
    // Winning: keep pressure with guardians and wardens
    kind = r < 0.5 ? "guardian" : r < 0.8 ? "warden" : "invoker";
  } else if (playerUnits.length > aiUnits.length + 2) {
    // Outnumbered: buy invokers to even the field
    kind = r < 0.4 ? "invoker" : r < 0.75 ? "warden" : "guardian";
  } else {
    kind = r < 0.45 ? "guardian" : r < 0.78 ? "warden" : "invoker";
  }

  const cost = SB.UNITS[kind].cost;
  if (state.aiEssence >= cost) {
    state.aiEssence -= cost;
    spawnUnit(state, "ai", kind, 6);
  }
}

function _thinkMovement(state: SolsticeState, adj: number[][]): void {
  const aiUnits = [...state.units.values()].filter(u => u.owner === "ai" && !u.isDead && u.destPlatId === null);

  for (const unit of aiUnits) {
    const target = _chooseTarget(state, unit, adj);
    if (target !== null && target !== unit.platId) {
      const hop = findNextHop(unit.platId, target, adj);
      if (hop !== null) {
        unit.destPlatId = hop;
        unit.bridgeT    = 0;
      }
    }
  }
}

function _chooseTarget(state: SolsticeState, unit: SolUnit, adj: number[][]): number | null {
  const platforms = state.platforms;

  // Priority 1: player-occupied platform adjacent to current
  for (const nid of platforms[unit.platId].adjacentIds) {
    if (platforms[nid].owner === "player") return nid;
  }

  // Priority 2: nearest neutral platform
  let bestNeutral: number | null = null;
  let bestDist = Infinity;
  for (const p of platforms) {
    if (p.owner !== "neutral") continue;
    const d = _bfsDist(unit.platId, p.id, adj);
    if (d < bestDist) { bestDist = d; bestNeutral = p.id; }
  }
  if (bestNeutral !== null) return bestNeutral;

  // Priority 3: nearest player platform
  let bestPlayer: number | null = null;
  bestDist = Infinity;
  for (const p of platforms) {
    if (p.owner !== "player") continue;
    const d = _bfsDist(unit.platId, p.id, adj);
    if (d < bestDist) { bestDist = d; bestPlayer = p.id; }
  }
  return bestPlayer;
}

function _bfsDist(fromId: number, toId: number, adj: number[][]): number {
  if (fromId === toId) return 0;
  const visited = new Set([fromId]);
  const queue: Array<[number, number]> = adj[fromId].map(n => [n, 1]);
  for (let i = 0; i < queue.length; i++) {
    const [cur, dist] = queue[i];
    if (cur === toId) return dist;
    if (!visited.has(cur)) {
      visited.add(cur);
      for (const nb of adj[cur]) {
        if (!visited.has(nb)) queue.push([nb, dist + 1]);
      }
    }
  }
  return Infinity;
}
