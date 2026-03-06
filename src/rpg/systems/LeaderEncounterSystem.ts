// Leader encounter system — placement, blessing management, dynamic spawns
import type { Vec2 } from "@/types";
import { OverworldTileType } from "@/types";
import type { SeededRandom } from "@sim/utils/random";
import type { OverworldTile, OverworldEntity, OverworldState, NPCData } from "@rpg/state/OverworldState";
import type { RPGState } from "@rpg/state/RPGState";
import {
  LEADER_ENCOUNTER_DEFS,
  type LeaderBlessing,
  type LeaderEncounterDef,
} from "@rpg/config/LeaderEncounterDefs";
import { getLeader } from "@sim/config/LeaderDefs";

// ---------------------------------------------------------------------------
// Placement during world generation
// ---------------------------------------------------------------------------

/** Biome string → OverworldTileType mapping for preferred biome checks. */
const BIOME_MAP: Record<string, string> = {
  grass: OverworldTileType.GRASS,
  forest: OverworldTileType.FOREST,
  sand: OverworldTileType.SAND,
  snow: OverworldTileType.SNOW,
  path: OverworldTileType.PATH,
};

/**
 * Place legendary leader NPCs on the overworld during generation.
 * Only places leaders with static spawn types (roadside, wilderness, town_visitor).
 * Dynamic types (post_battle, dungeon_exit) are spawned at runtime.
 *
 * Not all leaders are placed every run — the seed determines which ~8-10 appear.
 */
export function placeLeaderNPCs(
  grid: OverworldTile[][],
  rng: SeededRandom,
  width: number,
  height: number,
  placements: Vec2[],
  entities: Map<string, OverworldEntity>,
  townPositions: Vec2[],
  findPlacement: (
    grid: OverworldTile[][],
    rng: SeededRandom,
    width: number,
    height: number,
    existing: Vec2[],
    minDist: number,
  ) => Vec2 | null,
): void {
  // Shuffle leader defs so different leaders appear each run
  const shuffled = [...LEADER_ENCOUNTER_DEFS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.int(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Cap static placements at ~10 to keep them rare
  let placed = 0;
  const MAX_LEADERS = 10;

  for (const def of shuffled) {
    if (placed >= MAX_LEADERS) break;

    // Skip dynamic spawn types — handled at runtime
    if (def.spawnType === "post_battle" || def.spawnType === "dungeon_exit") continue;

    const leaderDef = getLeader(def.leaderId);
    if (!leaderDef) continue;

    if (def.spawnType === "town_visitor") {
      // Add leader as an NPC entity near a town
      if (townPositions.length === 0) continue;
      const townIdx = rng.int(0, townPositions.length);
      const townPos = townPositions[townIdx];

      // Find walkable tile adjacent to town
      const offsets = [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
        { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
      ];
      let pos: Vec2 | null = null;
      for (const off of offsets) {
        const tx = townPos.x + off.x;
        const ty = townPos.y + off.y;
        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          const tile = grid[ty][tx];
          if (tile.walkable && !tile.entityId) {
            pos = { x: tx, y: ty };
            break;
          }
        }
      }
      if (!pos) continue;

      _placeLeaderEntity(grid, entities, placements, pos, def, leaderDef.name, leaderDef.title);
      placed++;
      continue;
    }

    // roadside or wilderness — use findPlacement with biome preference
    if (def.preferredBiomes && def.preferredBiomes.length > 0) {
      // Try biome-preferred placement first
      const pos = _findBiomePlacement(grid, rng, width, height, placements, 20, def.preferredBiomes);
      if (pos) {
        _placeLeaderEntity(grid, entities, placements, pos, def, leaderDef.name, leaderDef.title);
        placed++;
        continue;
      }
    }

    // Fallback: any walkable tile
    const pos = findPlacement(grid, rng, width, height, placements, 20);
    if (pos) {
      _placeLeaderEntity(grid, entities, placements, pos, def, leaderDef.name, leaderDef.title);
      placed++;
    }
  }
}

/** Try to find placement on tiles matching preferred biomes. */
function _findBiomePlacement(
  grid: OverworldTile[][],
  rng: SeededRandom,
  width: number,
  height: number,
  existing: Vec2[],
  minDist: number,
  biomes: string[],
): Vec2 | null {
  const targetTypes = biomes.map(b => BIOME_MAP[b]).filter(Boolean);

  for (let attempt = 0; attempt < 500; attempt++) {
    const x = rng.int(4, width - 4);
    const y = rng.int(4, height - 4);
    const tile = grid[y][x];
    if (!tile.walkable || tile.entityId) continue;
    if (!targetTypes.includes(tile.type)) continue;

    let tooClose = false;
    for (const e of existing) {
      if (Math.abs(e.x - x) + Math.abs(e.y - y) < minDist) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    return { x, y };
  }
  return null;
}

/** Create and register a leader NPC entity. */
function _placeLeaderEntity(
  grid: OverworldTile[][],
  entities: Map<string, OverworldEntity>,
  placements: Vec2[],
  pos: Vec2,
  def: LeaderEncounterDef,
  name: string,
  title: string,
): void {
  const entityId = `leader_${def.leaderId}`;
  grid[pos.y][pos.x].entityId = entityId;
  grid[pos.y][pos.x].encounterRate = 0;
  placements.push(pos);

  const npcData: NPCData = {
    dialogue: def.introDialogue,
    questId: def.questNpcId,
    leaderId: def.leaderId,
  };

  entities.set(entityId, {
    id: entityId,
    type: "npc",
    position: pos,
    name: `${name}, ${title}`,
    data: npcData,
  });
}

// ---------------------------------------------------------------------------
// Dynamic leader spawning (post-battle / dungeon-exit)
// ---------------------------------------------------------------------------

/**
 * Check if a leader should spawn after a boss kill.
 * Returns the placed entity if a leader was spawned, null otherwise.
 */
export function checkPostBattleLeaderSpawn(
  rpg: RPGState,
  overworld: OverworldState,
): OverworldEntity | null {
  for (const def of LEADER_ENCOUNTER_DEFS) {
    if (def.spawnType !== "post_battle") continue;
    if (!def.spawnCondition?.requiredBossKill) continue;
    if (!rpg.completedQuests.has("boss_" + def.spawnCondition.requiredBossKill) &&
        !_hasKilledBoss(rpg, def.spawnCondition.requiredBossKill)) continue;
    if (rpg.metLeaders.has(def.leaderId)) continue;
    if (overworld.entities.has(`leader_${def.leaderId}`)) continue;

    const leaderDef = getLeader(def.leaderId);
    if (!leaderDef) continue;

    // Place adjacent to party position
    const pos = _findAdjacentWalkable(overworld, rpg.overworldPosition);
    if (!pos) continue;

    const entityId = `leader_${def.leaderId}`;
    const npcData: NPCData = {
      dialogue: def.introDialogue,
      questId: def.questNpcId,
      leaderId: def.leaderId,
    };

    const entity: OverworldEntity = {
      id: entityId,
      type: "npc",
      position: pos,
      name: `${leaderDef.name}, ${leaderDef.title}`,
      data: npcData,
    };

    overworld.grid[pos.y][pos.x].entityId = entityId;
    overworld.grid[pos.y][pos.x].encounterRate = 0;
    overworld.entities.set(entityId, entity);

    return entity;
  }
  return null;
}

/**
 * Check if a leader should spawn after clearing a dungeon.
 * Called when the player exits a dungeon.
 */
export function checkDungeonExitLeaderSpawn(
  rpg: RPGState,
  overworld: OverworldState,
): OverworldEntity | null {
  for (const def of LEADER_ENCOUNTER_DEFS) {
    if (def.spawnType !== "dungeon_exit") continue;
    if (!def.spawnCondition?.requiredBossKill) continue;
    if (!_hasKilledBoss(rpg, def.spawnCondition.requiredBossKill)) continue;
    if (rpg.metLeaders.has(def.leaderId)) continue;
    if (overworld.entities.has(`leader_${def.leaderId}`)) continue;

    const leaderDef = getLeader(def.leaderId);
    if (!leaderDef) continue;

    const pos = _findAdjacentWalkable(overworld, rpg.overworldPosition);
    if (!pos) continue;

    const entityId = `leader_${def.leaderId}`;
    const npcData: NPCData = {
      dialogue: def.introDialogue,
      questId: def.questNpcId,
      leaderId: def.leaderId,
    };

    const entity: OverworldEntity = {
      id: entityId,
      type: "npc",
      position: pos,
      name: `${leaderDef.name}, ${leaderDef.title}`,
      data: npcData,
    };

    overworld.grid[pos.y][pos.x].entityId = entityId;
    overworld.grid[pos.y][pos.x].encounterRate = 0;
    overworld.entities.set(entityId, entity);

    return entity;
  }
  return null;
}

/** Check if the player has killed a specific boss (by checking quest kill tracking). */
function _hasKilledBoss(rpg: RPGState, bossId: string): boolean {
  // Check if any quest has a completed kill objective for this boss
  for (const quest of rpg.quests) {
    for (const obj of quest.objectives) {
      if (obj.type === "kill" && obj.targetId === bossId && obj.current >= obj.required) {
        return true;
      }
    }
  }
  // Also check visitedDungeons as a proxy — bosses are at the end of dungeons
  return false;
}

function _findAdjacentWalkable(overworld: OverworldState, center: Vec2): Vec2 | null {
  const offsets = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
  ];
  for (const off of offsets) {
    const tx = center.x + off.x;
    const ty = center.y + off.y;
    if (tx >= 0 && tx < overworld.width && ty >= 0 && ty < overworld.height) {
      const tile = overworld.grid[ty][tx];
      if (tile.walkable && !tile.entityId) {
        return { x: tx, y: ty };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Blessing management
// ---------------------------------------------------------------------------

/** Grant a leader blessing to the party. */
export function grantBlessing(rpg: RPGState, leaderId: string, blessing: LeaderBlessing): void {
  // Don't stack duplicate blessings
  if (rpg.leaderBlessings.some(b => b.blessingId === blessing.id)) return;

  rpg.leaderBlessings.push({
    blessingId: blessing.id,
    leaderId,
    name: blessing.name,
    effect: blessing.effect,
    remainingSteps: blessing.duration,
  });
}

/** Tick down blessing durations. Called each overworld step. */
export function tickBlessings(rpg: RPGState): void {
  rpg.leaderBlessings = rpg.leaderBlessings.filter(b => {
    if (b.remainingSteps === -1) return true;
    b.remainingSteps--;
    return b.remainingSteps > 0;
  });
}

// ---------------------------------------------------------------------------
// Blessing effect queries (called from combat and overworld systems)
// ---------------------------------------------------------------------------

/** Get total ATK multiplier from active blessings. */
export function getBlessingAtkMultiplier(rpg: RPGState): number {
  let mult = 1;
  for (const b of rpg.leaderBlessings) {
    if (b.effect.type === "party_atk_bonus") mult *= b.effect.multiplier;
  }
  return mult;
}

/** Get total DEF multiplier from active blessings. */
export function getBlessingDefMultiplier(rpg: RPGState): number {
  let mult = 1;
  for (const b of rpg.leaderBlessings) {
    if (b.effect.type === "party_def_bonus") mult *= b.effect.multiplier;
  }
  return mult;
}

/** Get total XP multiplier from active blessings. */
export function getBlessingXpMultiplier(rpg: RPGState): number {
  let mult = 1;
  for (const b of rpg.leaderBlessings) {
    if (b.effect.type === "party_xp_multiplier") mult *= b.effect.multiplier;
  }
  return mult;
}

/** Get total gold find multiplier from active blessings. */
export function getBlessingGoldMultiplier(rpg: RPGState): number {
  let mult = 1;
  for (const b of rpg.leaderBlessings) {
    if (b.effect.type === "gold_find_bonus") mult *= b.effect.multiplier;
  }
  return mult;
}

/** Get encounter rate multiplier from active blessings. */
export function getBlessingEncounterRateMult(rpg: RPGState): number {
  let mult = 1;
  for (const b of rpg.leaderBlessings) {
    if (b.effect.type === "encounter_rate_reduction") mult *= b.effect.multiplier;
  }
  return mult;
}

/** Get total HP regen per step from active blessings. */
export function getBlessingHpRegenPerStep(rpg: RPGState): number {
  let total = 0;
  for (const b of rpg.leaderBlessings) {
    if (b.effect.type === "party_hp_regen") total += b.effect.amountPerStep;
  }
  return total;
}

/**
 * Apply per-step HP regen from blessings to the party.
 * Called each overworld step alongside tickBlessings.
 */
export function applyBlessingHpRegen(rpg: RPGState): void {
  const regen = getBlessingHpRegenPerStep(rpg);
  if (regen <= 0) return;

  for (const member of rpg.party) {
    if (member.hp > 0 && member.hp < member.maxHp) {
      member.hp = Math.min(member.maxHp, member.hp + regen);
    }
  }
}

// ---------------------------------------------------------------------------
// Leader meeting check (for NPC interaction)
// ---------------------------------------------------------------------------

/**
 * Check spawn conditions for a leader. Returns true if the player
 * qualifies to meet this leader based on party level, quests, etc.
 */
export function meetsLeaderSpawnCondition(rpg: RPGState, def: LeaderEncounterDef): boolean {
  if (!def.spawnCondition) return true;

  if (def.spawnCondition.minPartyLevel) {
    const avgLevel = rpg.party.length > 0
      ? rpg.party.reduce((sum, m) => sum + m.level, 0) / rpg.party.length
      : 0;
    if (avgLevel < def.spawnCondition.minPartyLevel) return false;
  }

  if (def.spawnCondition.requiredCompletedQuest) {
    if (!rpg.completedQuests.has(def.spawnCondition.requiredCompletedQuest)) return false;
  }

  return true;
}
