// The Holy Grail Quest — multi-stage quest system for world mode.
//
// The Grail Chapel spawns on the map after turn 15, guarded by cursed undead
// knights who failed the quest. Any player can attempt it, but Galahad,
// Percival, or Bors get combat advantages.
//
// Claiming the Grail grants a choice: heal the wasteland (terraform dead tiles)
// or eternal blessing (+HP to the Grail finder permanently via armory item).

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import type { WorldArmy } from "@world/state/WorldArmy";
import { createWorldArmy, type ArmyUnit } from "@world/state/WorldArmy";
import { hexSpiral, hexDistance, type HexCoord } from "@world/hex/HexCoord";
import { nextId } from "@world/state/WorldState";
import { TerrainType } from "@world/config/TerrainDefs";
import { UnitType } from "@/types";
import { cureWasteland } from "@world/systems/MorgaineEscalation";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface GrailQuestState {
  /** Hex where the Grail Chapel is placed (null = not yet spawned). */
  chapelHex: HexCoord | null;
  /** Whether the Grail has been claimed. */
  claimed: boolean;
  /** Turn the chapel was placed. */
  spawnTurn: number;
  /** Whether the chapel guardians have been defeated. */
  guardiansDefeated: boolean;
}

export function createGrailQuestState(): GrailQuestState {
  return {
    chapelHex: null,
    claimed: false,
    spawnTurn: 0,
    guardiansDefeated: false,
  };
}

// ---------------------------------------------------------------------------
// Grail Knight leaders (get combat bonus)
// ---------------------------------------------------------------------------

const GRAIL_KNIGHTS = new Set(["galahad", "percival", "bors"]);

export function isGrailKnight(leaderId: string | null): boolean {
  return leaderId !== null && GRAIL_KNIGHTS.has(leaderId);
}

// ---------------------------------------------------------------------------
// Spawn the Grail Chapel
// ---------------------------------------------------------------------------

export interface GrailSpawnEvent {
  title: string;
  description: string;
  color: number;
}

/** Attempt to spawn the Grail Chapel. Called each turn after turn 15. Returns event if spawned. */
export function trySpawnGrailChapel(
  state: WorldState,
  grailState: GrailQuestState,
): GrailSpawnEvent | null {
  if (grailState.chapelHex !== null) return null; // Already spawned
  if (state.turn < 15) return null;

  // 20% chance each turn after turn 15
  if (Math.random() > 0.20) return null;

  // Find a remote tile for the chapel
  const allTiles = state.grid.allTilesArray();
  const center = { q: 0, r: 0 };

  // Shuffle
  for (let i = allTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]];
  }

  for (const tile of allTiles) {
    if (tile.cityId || tile.armyId || tile.campId) continue;
    if (tile.terrain === TerrainType.WATER || tile.terrain === TerrainType.MOUNTAINS) continue;
    if (tile.owner) continue; // Unclaimed only

    const coord: HexCoord = { q: tile.q, r: tile.r };

    // Must be far from center and from all player starts
    if (hexDistance(coord, center) < 6) continue;

    // Not near sword
    if (state.swordHex && hexDistance(coord, state.swordHex) < 4) continue;

    // Place guardians — cursed undead knights
    const units: ArmyUnit[] = [
      { unitType: UnitType.DEATH_KNIGHT, count: 3, hpPerUnit: 100 },
      { unitType: UnitType.NECROMANCER, count: 2, hpPerUnit: 100 },
      { unitType: UnitType.BANSHEE, count: 2, hpPerUnit: 100 },
    ];

    const armyId = nextId(state, "army");
    const army = createWorldArmy(armyId, "barbarian", coord, units, false);
    army.movementPoints = 0;
    army.maxMovementPoints = 0;
    army.name = "Cursed Knights";
    state.armies.set(armyId, army);
    tile.armyId = armyId;

    grailState.chapelHex = coord;
    grailState.spawnTurn = state.turn;

    return {
      title: "The Grail Chapel Appears!",
      description: "A chapel of holy light has been sighted in the wilderness, guarded by cursed knights who failed the quest. Seek the Grail!",
      color: 0xffeeaa,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Check proximity — triggered when player army moves near chapel
// ---------------------------------------------------------------------------

export function checkGrailProximity(
  grailState: GrailQuestState,
  playerArmy: WorldArmy,
  state: WorldState,
): boolean {
  if (!grailState.chapelHex || grailState.claimed) return false;
  if (playerArmy.owner === "barbarian" || playerArmy.owner === "morgaine") return false;
  if (hexDistance(playerArmy.position, grailState.chapelHex) > 1) return false;

  // Check guardians defeated
  const tile = state.grid.getTile(grailState.chapelHex.q, grailState.chapelHex.r);
  if (tile?.armyId) {
    // Guardians still present
    return false;
  }

  grailState.guardiansDefeated = true;
  return true;
}

// ---------------------------------------------------------------------------
// Grail reward options
// ---------------------------------------------------------------------------

export type GrailChoice = "heal_wasteland" | "eternal_blessing";

/** Apply the chosen Grail reward. */
export function applyGrailReward(
  state: WorldState,
  grailState: GrailQuestState,
  player: WorldPlayer,
  choice: GrailChoice,
): void {
  grailState.claimed = true;

  if (choice === "heal_wasteland") {
    // Terraform wasteland tiles around the player's capital (radius 5)
    const playerCities = [...state.cities.values()].filter(
      (c) => c.owner === player.id && c.isCapital,
    );
    const capital = playerCities[0];
    if (capital) {
      // Use the dedicated cure function for Morgaine wasteland
      cureWasteland(state, capital.position, 5, player.id);
      // Also cure non-Morgaine desert/tundra/swamp
      for (const hex of hexSpiral(capital.position, 5)) {
        const tile = state.grid.getTile(hex.q, hex.r);
        if (!tile) continue;
        if (tile.terrain === TerrainType.TUNDRA || tile.terrain === TerrainType.SWAMP) {
          tile.terrain = TerrainType.GRASSLAND;
        }
      }
    }
    // Also cure a ring around Avalon itself (push back the wasteland)
    cureWasteland(state, { q: 0, r: 0 }, 4, null);
    // Mana bonus
    player.mana += 50;
  } else {
    // Eternal blessing — grant the Holy Grail armory item
    player.armoryItems.push("holy_grail");
    // Also give gold bonus
    player.gold += 200;
  }
}
