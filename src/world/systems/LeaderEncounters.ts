// Leader-specific encounter system for world mode.
//
// Each leader can have a unique quest tile that spawns on the world map.
// When the player's army reaches the quest tile, a thematic encounter triggers
// with a reward tied to that leader's Arthurian lore.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import type { WorldArmy } from "@world/state/WorldArmy";
import { createWorldArmy, type ArmyUnit } from "@world/state/WorldArmy";
import { hexDistance, type HexCoord } from "@world/hex/HexCoord";
import { nextId } from "@world/state/WorldState";
import { TerrainType } from "@world/config/TerrainDefs";
import { UnitType } from "@/types";
import type { LeaderId } from "@sim/config/LeaderDefs";

// ---------------------------------------------------------------------------
// Encounter definitions
// ---------------------------------------------------------------------------

export interface LeaderEncounterDef {
  leaderId: LeaderId;
  title: string;
  description: string;
  /** Item ID awarded on completion (from ArmoryItemDefs). */
  itemReward: string | null;
  /** Gold awarded on completion. */
  goldReward: number;
  /** Mana awarded on completion. */
  manaReward: number;
  /** Food awarded on completion. */
  foodReward: number;
  /** Dialog text shown when the player arrives. */
  dialogTitle: string;
  dialogText: string;
  /** Color for notifications/events. */
  color: number;
  /** Preferred terrain for quest tile placement. */
  preferredTerrain: TerrainType | null;
  /** Guardian units protecting the quest tile (null = no fight). */
  guardians: ArmyUnit[] | null;
}

export const LEADER_ENCOUNTERS: LeaderEncounterDef[] = [
  {
    leaderId: "gawain",
    title: "The Green Chapel",
    description: "Gawain faces the Green Knight in single combat!",
    itemReward: "gawains_girdle",
    goldReward: 0,
    manaReward: 0,
    foodReward: 0,
    dialogTitle: "The Green Chapel",
    dialogText: `A chapel of living moss rises from the forest floor. The Green Knight awaits within, his axe gleaming.\n\n"You kept your word, Sir Gawain. Now strike true — and accept what comes."\n\nGawain triumphs in the contest of honour. The Green Knight awards the enchanted girdle.`,
    color: 0x44aa44,
    preferredTerrain: TerrainType.FOREST,
    guardians: [
      { unitType: UnitType.KNIGHT, count: 1, hpPerUnit: 100 },
    ],
  },
  {
    leaderId: "lancelot",
    title: "The Lake",
    description: "The Lady of the Lake offers Lancelot an enchanted shield!",
    itemReward: "lancelots_shield",
    goldReward: 0,
    manaReward: 0,
    foodReward: 0,
    dialogTitle: "The Enchanted Lake",
    dialogText: `The lake's surface ripples and a pale hand rises from the water, bearing a shield of unearthly beauty.\n\n"Take this, my son," Nimue whispers from below the surface. "It shall ward you as I once warded you from all harm."\n\nLancelot claims his mother's gift.`,
    color: 0x4488cc,
    preferredTerrain: TerrainType.GRASSLAND,
    guardians: null,
  },
  {
    leaderId: "guinevere",
    title: "The Court of Love",
    description: "Guinevere presides over a diplomatic gathering!",
    itemReward: null,
    goldReward: 200,
    manaReward: 20,
    foodReward: 0,
    dialogTitle: "The Court of Love",
    dialogText: `In a meadow strewn with flowers, lords and ladies gather for a festival of chivalry. Guinevere's grace and wisdom resolve old grudges and forge new bonds.\n\nThe treasury swells with gifts from grateful vassals.`,
    color: 0xff88aa,
    preferredTerrain: TerrainType.GRASSLAND,
    guardians: null,
  },
  {
    leaderId: "mordred",
    title: "The Shadow Throne",
    description: "Mordred seizes power through treachery!",
    itemReward: "mordreds_crown",
    goldReward: 150,
    manaReward: 0,
    foodReward: 0,
    dialogTitle: "The Shadow Throne",
    dialogText: `In a ruined tower, a circle of conspirators awaits. They kneel before Mordred, offering a crown of black iron.\n\n"The throne of Camelot is yours by right of blood," they whisper. "Take it — and all that comes with it."\n\nMordred dons the Usurper's Crown.`,
    color: 0x442244,
    preferredTerrain: TerrainType.HILLS,
    guardians: [
      { unitType: UnitType.DARK_SAVANT, count: 1, hpPerUnit: 100 },
    ],
  },
  {
    leaderId: "pellinore",
    title: "The Questing Beast",
    description: "Pellinore tracks and confronts the Questing Beast!",
    itemReward: "pellinores_horn",
    goldReward: 0,
    manaReward: 0,
    foodReward: 0,
    dialogTitle: "The Questing Beast",
    dialogText: `After a lifetime of pursuit, the Questing Beast stands before you at last. Part serpent, part leopard, its belly rumbles with the sound of thirty hounds.\n\nPellinore sounds his hunting horn — and the Beast yields to its true master. It shall serve you now as companion and weapon.`,
    color: 0x44ddaa,
    preferredTerrain: TerrainType.FOREST,
    guardians: [
      { unitType: UnitType.TROLL, count: 2, hpPerUnit: 100 },
      { unitType: UnitType.SPIDER, count: 3, hpPerUnit: 100 },
    ],
  },
  {
    leaderId: "nimue",
    title: "The Enchanted Spring",
    description: "Nimue discovers a wellspring of ancient magic!",
    itemReward: "nimues_veil",
    goldReward: 0,
    manaReward: 50,
    foodReward: 0,
    dialogTitle: "The Enchanted Spring",
    dialogText: `Deep in the forest, Nimue finds a spring that pulses with raw magic. The water sings with the voice of the old world.\n\nShe drinks deep, and the Veil of the Lake settles upon her shoulders — gossamer thin, yet harder than steel.`,
    color: 0x88ccee,
    preferredTerrain: TerrainType.FOREST,
    guardians: null,
  },
  {
    leaderId: "morgan",
    title: "The Fay Circle",
    description: "Morgan le Fay discovers a fairy ring of power!",
    itemReward: null,
    goldReward: 0,
    manaReward: 80,
    foodReward: 0,
    dialogTitle: "The Fay Circle",
    dialogText: `A ring of pale mushrooms glows with eldritch light in the moonlit glade. Morgan steps into the circle and the veil between worlds parts.\n\nThe fae bow before their kin. Ancient knowledge floods her mind — entire schools of magic laid bare in an instant.`,
    color: 0x9944cc,
    preferredTerrain: TerrainType.FOREST,
    guardians: null,
  },
  {
    leaderId: "merlin",
    title: "The Crystal Cave",
    description: "Merlin enters his legendary cave of visions!",
    itemReward: "merlins_staff",
    goldReward: 0,
    manaReward: 30,
    foodReward: 0,
    dialogTitle: "The Crystal Cave",
    dialogText: `Within the hill, crystals line every surface, each one holding a fragment of the future. Merlin's staff hums with resonance.\n\n"I remember this place," he murmurs. "This is where I first learned to see."\n\nThe staff blazes with renewed power.`,
    color: 0x8844ff,
    preferredTerrain: TerrainType.HILLS,
    guardians: null,
  },
  {
    leaderId: "galahad",
    title: "The Siege Perilous",
    description: "Galahad sits in the forbidden seat and survives!",
    itemReward: null,
    goldReward: 300,
    manaReward: 30,
    foodReward: 20,
    dialogTitle: "The Siege Perilous",
    dialogText: `In an ancient hall, a single chair waits — the Siege Perilous, death to any unworthy knight who sits upon it.\n\nGalahad takes his seat. Light blazes. The chair accepts him.\n\nDivine grace floods the land. Your coffers swell with heaven's bounty.`,
    color: 0xffeeaa,
    preferredTerrain: TerrainType.PLAINS,
    guardians: null,
  },
  {
    leaderId: "percival",
    title: "The Fisher King's Hall",
    description: "Percival finds the wounded king and asks the question!",
    itemReward: null,
    goldReward: 100,
    manaReward: 20,
    foodReward: 30,
    dialogTitle: "The Fisher King's Hall",
    dialogText: `In a castle that appears only to the worthy, a wounded king lies on a bier. The Grail floats before him, untouchable.\n\n"Whom does the Grail serve?" Percival asks — the question others failed to speak.\n\nThe Fisher King smiles. The land heals. Abundance follows.`,
    color: 0xeedd88,
    preferredTerrain: TerrainType.GRASSLAND,
    guardians: null,
  },
  {
    leaderId: "tristan",
    title: "The White Ship",
    description: "Tristan discovers a vessel of legend on the shore!",
    itemReward: null,
    goldReward: 250,
    manaReward: 0,
    foodReward: 0,
    dialogTitle: "The White Ship",
    dialogText: `On a desolate beach, a ship of white wood rests — crewless, yet laden with treasure from far-off Cornwall.\n\nTristan recognises the vessel that once bore him across the Irish Sea. He claims the treasure within.`,
    color: 0xaaddff,
    preferredTerrain: TerrainType.PLAINS,
    guardians: null,
  },
  {
    leaderId: "bedivere",
    title: "The Last Stand",
    description: "Bedivere rallies the last defenders of Camelot!",
    itemReward: null,
    goldReward: 0,
    manaReward: 0,
    foodReward: 50,
    dialogTitle: "The Last Stand",
    dialogText: `At a windswept ruin, a band of grizzled veterans recognise Bedivere — the last loyal hand of Arthur.\n\n"We never stopped fighting, my lord," their captain says. "Command us."\n\nBattle-hardened soldiers rally to your cause.`,
    color: 0x88aacc,
    preferredTerrain: TerrainType.HILLS,
    guardians: null,
  },
  {
    leaderId: "kay",
    title: "The Hidden Treasury",
    description: "Kay discovers Camelot's secret vault!",
    itemReward: null,
    goldReward: 400,
    manaReward: 0,
    foodReward: 0,
    dialogTitle: "The Hidden Treasury",
    dialogText: `Beneath a crumbling keep, Kay finds a vault sealed with his own mark — the Seneschal's seal, placed there in better days.\n\n"I always planned ahead," Kay says with a rare smile. Inside: a fortune in gold, set aside for the kingdom's darkest hour.`,
    color: 0xffcc44,
    preferredTerrain: TerrainType.HILLS,
    guardians: null,
  },
  {
    leaderId: "elaine",
    title: "The Tower of Astolat",
    description: "Elaine's tower yields a cache of enchanted arrows!",
    itemReward: null,
    goldReward: 100,
    manaReward: 15,
    foodReward: 0,
    dialogTitle: "The Tower of Astolat",
    dialogText: `Elaine's old tower still stands, its armoury untouched. Within: quivers of arrows fletched with starlight feathers and bows strung with moonbeam.\n\nThe Lily Maid's legacy endures.`,
    color: 0xddaacc,
    preferredTerrain: TerrainType.PLAINS,
    guardians: null,
  },
  {
    leaderId: "igraine",
    title: "The Sacred Grove",
    description: "Igraine visits a holy site of healing!",
    itemReward: null,
    goldReward: 0,
    manaReward: 30,
    foodReward: 40,
    dialogTitle: "The Sacred Grove",
    dialogText: `In a grove of ancient oaks, an altar radiates warmth and peace. Igraine kneels and the land responds — crops flourish and the sick are healed.\n\nThe Duchess's faith brings abundance to all.`,
    color: 0x88cc88,
    preferredTerrain: TerrainType.FOREST,
    guardians: null,
  },
  {
    leaderId: "ector",
    title: "The Old Estate",
    description: "Ector reclaims the estate where he raised young Arthur!",
    itemReward: null,
    goldReward: 350,
    manaReward: 0,
    foodReward: 30,
    dialogTitle: "The Old Estate",
    dialogText: `The manor house where a boy named Wart once played at swords still stands, its cellars well-stocked.\n\n"I always keep my stores full," Ector says fondly. "You never know when a future king might need feeding."`,
    color: 0xccaa66,
    preferredTerrain: TerrainType.GRASSLAND,
    guardians: null,
  },
  {
    leaderId: "bors",
    title: "The Chapel of the Grail",
    description: "Bors kneels before the Grail and receives its blessing!",
    itemReward: null,
    goldReward: 100,
    manaReward: 25,
    foodReward: 25,
    dialogTitle: "The Chapel of the Grail",
    dialogText: `In a humble roadside chapel, Bors kneels. He is no saint — merely steadfast. But the Grail knows its own.\n\nLight fills the chapel. Bors rises stronger, the blessing of his pilgrimage complete.`,
    color: 0xeedd88,
    preferredTerrain: TerrainType.PLAINS,
    guardians: null,
  },
  {
    leaderId: "uther",
    title: "The Dragon Banner",
    description: "Uther reclaims the Pendragon standard!",
    itemReward: null,
    goldReward: 200,
    manaReward: 0,
    foodReward: 0,
    dialogTitle: "The Dragon Banner",
    dialogText: `Atop a storm-lashed hill, Uther's war banner — the crimson dragon — still flies above the ruins of his first fortress.\n\n"Under this banner I forged a kingdom," Uther growls. "And I shall forge one again."\n\nGold flows from lords who rally to the Pendragon.`,
    color: 0xcc4422,
    preferredTerrain: TerrainType.HILLS,
    guardians: [
      { unitType: UnitType.SWORDSMAN, count: 4, hpPerUnit: 100 },
    ],
  },
  {
    leaderId: "lot",
    title: "The Orkney Stones",
    description: "Lot discovers the ancient standing stones of Orkney!",
    itemReward: null,
    goldReward: 100,
    manaReward: 40,
    foodReward: 0,
    dialogTitle: "The Orkney Stones",
    dialogText: `Massive standing stones hum with power on a windswept headland — the circle of Lot's ancestors.\n\n"My forefathers drew strength from these stones," Lot says. "And so shall I."\n\nAncient energy courses through the land.`,
    color: 0x8888aa,
    preferredTerrain: TerrainType.TUNDRA,
    guardians: null,
  },
];

// ---------------------------------------------------------------------------
// Encounter state tracking
// ---------------------------------------------------------------------------

export interface LeaderEncounterState {
  /** Map of leaderId → hex position of the quest tile. */
  questHexes: Map<string, HexCoord>;
  /** Set of leader IDs whose quests have been completed. */
  completedQuests: Set<string>;
}

export function createLeaderEncounterState(): LeaderEncounterState {
  return {
    questHexes: new Map(),
    completedQuests: new Set(),
  };
}

// ---------------------------------------------------------------------------
// Placement — called during world setup
// ---------------------------------------------------------------------------

/** Place a quest tile for the player's leader on the world map. */
export function placeLeaderEncounter(
  state: WorldState,
  encounterState: LeaderEncounterState,
  leaderId: string,
  startPositions: HexCoord[],
): void {
  const encounter = LEADER_ENCOUNTERS.find((e) => e.leaderId === leaderId);
  if (!encounter) return; // Arthur uses Sword in the Stone instead

  // Find a suitable hex: not too close to starts, not occupied
  const allTiles = state.grid.allTilesArray();
  // Shuffle for randomness
  for (let i = allTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]];
  }

  for (const tile of allTiles) {
    if (tile.cityId || tile.armyId || tile.campId) continue;
    if (tile.terrain === TerrainType.WATER || tile.terrain === TerrainType.MOUNTAINS) continue;

    // Prefer specified terrain if possible (but don't require it)
    const coord: HexCoord = { q: tile.q, r: tile.r };

    // Not too close to player starts (min 5 hexes)
    let tooClose = false;
    for (const sp of startPositions) {
      if (hexDistance(coord, sp) < 5) { tooClose = true; break; }
    }
    if (tooClose) continue;

    // Not too close to center (Avalon)
    if (hexDistance(coord, { q: 0, r: 0 }) < 4) continue;

    // Not too close to sword hex
    if (state.swordHex && hexDistance(coord, state.swordHex) < 3) continue;

    // Place guardian army if defined
    if (encounter.guardians) {
      const armyId = nextId(state, "army");
      const army = createWorldArmy(armyId, "barbarian", coord, [...encounter.guardians], false);
      army.movementPoints = 0;
      army.maxMovementPoints = 0;
      state.armies.set(armyId, army);
      tile.armyId = armyId;
    }

    encounterState.questHexes.set(leaderId, coord);
    return;
  }
}

// ---------------------------------------------------------------------------
// Trigger check — called when player army moves
// ---------------------------------------------------------------------------

/** Check if a player army is near their leader's quest tile. Returns encounter info if triggered. */
export function checkLeaderEncounter(
  encounterState: LeaderEncounterState,
  playerArmy: WorldArmy,
  player: WorldPlayer,
): LeaderEncounterDef | null {
  if (!player.leaderId) return null;
  if (playerArmy.owner !== player.id) return null;

  // Already completed
  if (encounterState.completedQuests.has(player.leaderId)) return null;

  const questHex = encounterState.questHexes.get(player.leaderId);
  if (!questHex) return null;

  // Must be within 1 hex of the quest tile
  if (hexDistance(playerArmy.position, questHex) > 1) return null;

  const encounter = LEADER_ENCOUNTERS.find((e) => e.leaderId === player.leaderId);
  if (!encounter) return null;

  return encounter;
}

/** Mark a leader encounter as completed and apply rewards. */
export function completeLeaderEncounter(
  encounterState: LeaderEncounterState,
  player: WorldPlayer,
  encounter: LeaderEncounterDef,
): void {
  encounterState.completedQuests.add(encounter.leaderId);

  // Apply rewards
  if (encounter.itemReward) {
    player.armoryItems.push(encounter.itemReward);
  }
  player.gold += encounter.goldReward;
  player.mana += encounter.manaReward;
  player.food += encounter.foodReward;
}

/** Get the encounter definition for a given leader. */
export function getEncounterForLeader(leaderId: string): LeaderEncounterDef | undefined {
  return LEADER_ENCOUNTERS.find((e) => e.leaderId === leaderId);
}
