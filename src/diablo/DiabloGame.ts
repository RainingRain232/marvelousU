import { DiabloRenderer, getTerrainHeight } from "./DiabloRenderer";
import {
  DiabloState, DiabloEnemy, DiabloProjectile, DiabloLoot,
  DiabloTreasureChest, DiabloAOE,
  DiabloClass, DiabloMapId, DiabloPhase, ItemRarity, DiabloDifficulty,
  SkillId, EnemyState, EnemyType, StatusEffect, TimeOfDay, DamageType,
  DiabloItem, DiabloEquipment, DiabloPotion, PotionType,
  VendorType, DiabloVendor, DiabloTownfolk, TownfolkRole,
  BossAbility, EnemyBehavior,
  DiabloQuest, QuestType, CraftType,
  TalentEffectType,
  ParticleType, Weather,
  MapModifier, LootFilterLevel,
  PetType, PetSpecies, PetAIState, DiabloPet,
  CraftingStationType, MaterialType, AdvancedCraftingRecipe,
  createDefaultPlayer, createDefaultState
} from "./DiabloTypes";
import {
  SKILL_DEFS, MAP_CONFIGS, ENEMY_DEFS, ITEM_DATABASE, SET_BONUSES,
  LOOT_TABLES, RARITY_NAMES, XP_TABLE,
  ENEMY_SPAWN_WEIGHTS,
  VENDOR_DEFS, generateVendorInventory,
  DIFFICULTY_CONFIGS,
  BOSS_PHASE_CONFIGS,
  TALENT_TREES, TALENT_BRANCH_NAMES,
  POTION_DATABASE, ENEMY_DAMAGE_TYPES,
  QUEST_DATABASE,
  MAP_COMPLETION_REWARDS,
  CRAFTING_RECIPES,
  SALVAGE_MATERIAL_YIELDS,
  LANTERN_CONFIGS,
  SKILL_BRANCHES,
  UNLOCKABLE_SKILLS,
  MAP_SPECIFIC_ITEMS,
  MAP_MODIFIER_DEFS, ELEMENTAL_REACTIONS, PARAGON_XP_TABLE,
  PET_DEFS, PET_DROP_TABLE, PET_XP_TABLE,
  ADVANCED_CRAFTING_RECIPES, CRAFTING_MATERIALS, MATERIAL_DROP_TABLE,
} from "./DiabloConfig";

// ────────────────────────────────────────────────────────────────────────────
// Rarity color strings for UI (hex CSS colors)
// ────────────────────────────────────────────────────────────────────────────
const RARITY_CSS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: "#cccccc",
  [ItemRarity.UNCOMMON]: "#44ff44",
  [ItemRarity.RARE]: "#4488ff",
  [ItemRarity.EPIC]: "#aa44ff",
  [ItemRarity.LEGENDARY]: "#ff8800",
  [ItemRarity.MYTHIC]: "#ff2222",
  [ItemRarity.DIVINE]: "#ffd700",
};

// Rarity glow box-shadow effects (stronger for higher rarities)
const RARITY_GLOW: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: "none",
  [ItemRarity.UNCOMMON]: "0 0 4px #44ff44",
  [ItemRarity.RARE]: "0 0 6px #4488ff",
  [ItemRarity.EPIC]: "0 0 8px #aa44ff, 0 0 3px #aa44ff inset",
  [ItemRarity.LEGENDARY]: "0 0 10px #ff8800, 0 0 5px #ff8800 inset",
  [ItemRarity.MYTHIC]: "0 0 12px #ff2222, 0 0 6px #ff2222 inset",
  [ItemRarity.DIVINE]: "0 0 14px #ffd700, 0 0 7px #ffd700 inset",
};

// Border width by rarity
const RARITY_BORDER: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.UNCOMMON]: 1,
  [ItemRarity.RARE]: 2,
  [ItemRarity.EPIC]: 2,
  [ItemRarity.LEGENDARY]: 3,
  [ItemRarity.MYTHIC]: 3,
  [ItemRarity.DIVINE]: 3,
};

// Rarity tier number (for stars display)
const RARITY_TIER: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.UNCOMMON]: 2,
  [ItemRarity.RARE]: 3,
  [ItemRarity.EPIC]: 4,
  [ItemRarity.LEGENDARY]: 5,
  [ItemRarity.MYTHIC]: 6,
  [ItemRarity.DIVINE]: 7,
};

// Background tint RGBA (low opacity rarity color)
const RARITY_BG: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: "rgba(204,204,204,0.06)",
  [ItemRarity.UNCOMMON]: "rgba(68,255,68,0.10)",
  [ItemRarity.RARE]: "rgba(68,136,255,0.10)",
  [ItemRarity.EPIC]: "rgba(170,68,255,0.12)",
  [ItemRarity.LEGENDARY]: "rgba(255,136,0,0.13)",
  [ItemRarity.MYTHIC]: "rgba(255,34,34,0.14)",
  [ItemRarity.DIVINE]: "rgba(255,215,0,0.15)",
};

// Rarity badge symbol (corner indicator)
const RARITY_BADGE: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: "",
  [ItemRarity.UNCOMMON]: "\u25C6",
  [ItemRarity.RARE]: "\u25C6",
  [ItemRarity.EPIC]: "\u25C6",
  [ItemRarity.LEGENDARY]: "\u2726",
  [ItemRarity.MYTHIC]: "\u2726",
  [ItemRarity.DIVINE]: "\u2726",
};

// Whether this rarity gets the pulse animation class
function rarityNeedsAnim(r: ItemRarity): boolean {
  return r === ItemRarity.LEGENDARY || r === ItemRarity.MYTHIC || r === ItemRarity.DIVINE;
}

// Map any item slot string to a canonical equip key (handles config items that may
// use non-enum string values like "MAIN_HAND", "HEAD", "CHEST", etc.)
function resolveEquipKey(slot: string): keyof DiabloEquipment | null {
  const s = slot as string;
  if (s === "HELMET" || s === "HEAD") return "helmet";
  if (s === "BODY" || s === "CHEST") return "body";
  if (s === "GAUNTLETS" || s === "HANDS") return "gauntlets";
  if (s === "LEGS") return "legs";
  if (s === "FEET") return "feet";
  if (s === "ACCESSORY_1" || s === "RING" || s === "AMULET") return "accessory1";
  if (s === "ACCESSORY_2") return "accessory2";
  if (s === "WEAPON" || s === "MAIN_HAND") return "weapon";
  if (s === "LANTERN") return "lantern";
  if (s === "OFF_HAND" || s === "BELT" || s === "QUIVER" || s === "ORB") return null;
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Map clear kill targets per map
// ────────────────────────────────────────────────────────────────────────────
const MAP_KILL_TARGET: Record<DiabloMapId, number> = {
  [DiabloMapId.FOREST]: 50,
  [DiabloMapId.ELVEN_VILLAGE]: 40,
  [DiabloMapId.NECROPOLIS_DUNGEON]: 60,
  [DiabloMapId.VOLCANIC_WASTES]: 70,
  [DiabloMapId.ABYSSAL_RIFT]: 80,
  [DiabloMapId.DRAGONS_SANCTUM]: 100,
  [DiabloMapId.SUNSCORCH_DESERT]: 35,
  [DiabloMapId.EMERALD_GRASSLANDS]: 30,
  [DiabloMapId.WHISPERING_MARSH]: 35,
  [DiabloMapId.CRYSTAL_CAVERNS]: 40,
  [DiabloMapId.FROZEN_TUNDRA]: 55,
  [DiabloMapId.HAUNTED_CATHEDRAL]: 60,
  [DiabloMapId.THORNWOOD_THICKET]: 55,
  [DiabloMapId.CLOCKWORK_FOUNDRY]: 75,
  [DiabloMapId.CRIMSON_CITADEL]: 80,
  [DiabloMapId.STORMSPIRE_PEAK]: 85,
  [DiabloMapId.SHADOW_REALM]: 90,
  [DiabloMapId.PRIMORDIAL_ABYSS]: 120,
  [DiabloMapId.MOONLIT_GROVE]: 25,
  [DiabloMapId.CORAL_DEPTHS]: 35,
  [DiabloMapId.ANCIENT_LIBRARY]: 40,
  [DiabloMapId.JADE_TEMPLE]: 50,
  [DiabloMapId.ASHEN_BATTLEFIELD]: 55,
  [DiabloMapId.FUNGAL_DEPTHS]: 70,
  [DiabloMapId.OBSIDIAN_FORTRESS]: 80,
  [DiabloMapId.CELESTIAL_RUINS]: 90,
  [DiabloMapId.INFERNAL_THRONE]: 100,
  [DiabloMapId.ASTRAL_VOID]: 130,
  [DiabloMapId.SHATTERED_COLOSSEUM]: 25,
  [DiabloMapId.PETRIFIED_GARDEN]: 30,
  [DiabloMapId.SUNKEN_CITADEL]: 40,
  [DiabloMapId.WYRMSCAR_CANYON]: 50,
  [DiabloMapId.PLAGUEROT_SEWERS]: 55,
  [DiabloMapId.ETHEREAL_SANCTUM]: 75,
  [DiabloMapId.IRON_WASTES]: 80,
  [DiabloMapId.BLIGHTED_THRONE]: 95,
  [DiabloMapId.CHRONO_LABYRINTH]: 110,
  [DiabloMapId.ELDRITCH_NEXUS]: 140,
  [DiabloMapId.CITY_RUINS]: 30,
  [DiabloMapId.CITY]: 35,
  [DiabloMapId.CAMELOT]: 0,
};

// ────────────────────────────────────────────────────────────────────────────
// Boss names per map
// ────────────────────────────────────────────────────────────────────────────
const BOSS_NAMES: Record<DiabloMapId, string[]> = {
  [DiabloMapId.FOREST]: ["Oakrot the Ancient", "Grimfang Alpha", "Bandit King Varros"],
  [DiabloMapId.ELVEN_VILLAGE]: ["Shadowlord Ael'thar", "Corrupted Archon", "Darkstalker Prime"],
  [DiabloMapId.NECROPOLIS_DUNGEON]: ["Lich Overlord Morthis", "Bonecrusher", "Wraith King Null"],
  [DiabloMapId.VOLCANIC_WASTES]: ["Ignis the Unquenched", "Emberlord Pyraxis", "Magma King Volrath"],
  [DiabloMapId.ABYSSAL_RIFT]: ["Xal'thuun the Void Maw", "Entropy Incarnate", "Riftlord Nihilus"],
  [DiabloMapId.DRAGONS_SANCTUM]: ["Vyrathion the Ancient", "Drakemaw the Endless", "Scorchfather Pyranax"],
  [DiabloMapId.SUNSCORCH_DESERT]: ["Sandclaw the Burrower", "Dune Reaver Kassim", "Mirage Serpent"],
  [DiabloMapId.EMERALD_GRASSLANDS]: ["Thunderhoof the Wild", "Warchief Garon", "Skytalon the Fierce"],
  [DiabloMapId.WHISPERING_MARSH]: ["Murkfang the Bloated", "Swamp Witch Hessia", "Hydra Broodmother"],
  [DiabloMapId.CRYSTAL_CAVERNS]: ["Geode King Crysanthus", "Shard Weaver", "Prismatic Terror"],
  [DiabloMapId.FROZEN_TUNDRA]: ["Frostjaw the Undying", "Blizzard Warden Kael", "Glacier Breaker"],
  [DiabloMapId.HAUNTED_CATHEDRAL]: ["Archbishop Maledict", "The Desecrator", "Doom Gargoyle Grath"],
  [DiabloMapId.THORNWOOD_THICKET]: ["Thornqueen Brambliss", "Rotfather Mycos", "Blightweaver Nyx"],
  [DiabloMapId.CLOCKWORK_FOUNDRY]: ["Forgefire Construct VII", "The Brass Overlord", "Titan-Frame Omega"],
  [DiabloMapId.CRIMSON_CITADEL]: ["Count Sanguinar", "The Crimson Inquisitor", "Blood Archon Vex"],
  [DiabloMapId.STORMSPIRE_PEAK]: ["Stormcaller Zephyros", "Thunder Wyrm Voltaris", "Gale Lord Tempestus"],
  [DiabloMapId.SHADOW_REALM]: ["The Dreaming Horror", "Nightmare Sovereign", "Oblivion Incarnate"],
  [DiabloMapId.PRIMORDIAL_ABYSS]: ["Maw of the Void", "Entropy Colossus", "The Primordial Hunger"],
  [DiabloMapId.MOONLIT_GROVE]: ["Silvanus the Moonstruck", "Duskfang Alpha", "Titania's Shadow"],
  [DiabloMapId.CORAL_DEPTHS]: ["Leviathan Spawn Thalassos", "Siren Empress Calypsa", "The Drowned Colossus"],
  [DiabloMapId.ANCIENT_LIBRARY]: ["Archmage Scriptus", "The Living Encyclopedia", "Grimoire Tyrant Lexicon"],
  [DiabloMapId.JADE_TEMPLE]: ["Stone Guardian Xian", "Serpent God Quetzal", "The Jade Sovereign"],
  [DiabloMapId.ASHEN_BATTLEFIELD]: ["General Ashfall", "The Undying Marshal", "War Titan Bellicus"],
  [DiabloMapId.FUNGAL_DEPTHS]: ["Mycorrhiza Prime", "Sporequeen Toxica", "The Fungal Overmind"],
  [DiabloMapId.OBSIDIAN_FORTRESS]: ["Dark Castellan Malachar", "Obsidian Overlord Nox", "The Black Sovereign"],
  [DiabloMapId.CELESTIAL_RUINS]: ["Archon Stellaris", "The Fallen Star", "Cosmic Judge Astraeus"],
  [DiabloMapId.INFERNAL_THRONE]: ["Demon King Abaddon", "Hellfire Sovereign Surtur", "The Undying Tyrant"],
  [DiabloMapId.ASTRAL_VOID]: ["Reality Eater Oblivion", "The Unmaker", "Void Emperor Nihilax"],
  [DiabloMapId.SHATTERED_COLOSSEUM]: ["Champion Maxentius", "Beastmaster Ferox", "The Arena Reborn"],
  [DiabloMapId.PETRIFIED_GARDEN]: ["Gorgon Empress Lithia", "Basilisk Primus", "The Living Statue"],
  [DiabloMapId.SUNKEN_CITADEL]: ["Admiral Davy Depths", "The Drowned Leviathan", "Abyssal Castellan Nereus"],
  [DiabloMapId.WYRMSCAR_CANYON]: ["Broodmother Cindrax", "Canyon Lord Scorchion", "The First Flame"],
  [DiabloMapId.PLAGUEROT_SEWERS]: ["Plague King Festus", "The Bile Colossus", "Ratking Supreme"],
  [DiabloMapId.ETHEREAL_SANCTUM]: ["High Arbiter Kael", "The Unbound Seraph", "Phase Lord Etherion"],
  [DiabloMapId.IRON_WASTES]: ["Siege Lord Decimax", "The Rust Titan", "War Engine Omega"],
  [DiabloMapId.BLIGHTED_THRONE]: ["King Malachar the Rotting", "Crown of Pestilence", "The Undying Court"],
  [DiabloMapId.CHRONO_LABYRINTH]: ["Chronarch Tempus", "The Paradox Engine", "Time Eater Ouroboros"],
  [DiabloMapId.ELDRITCH_NEXUS]: ["Overmind Xul'tharax", "The Convergence", "Elder Brain Infinitus"],
  [DiabloMapId.CITY_RUINS]: ["Captain Harren the Undying", "The Rubble Colossus", "Gatekeeper Voss"],
  [DiabloMapId.CITY]: ["Warden-Commander Blackthorn", "The Iron Magistrate", "Sergeant Grieves"],
  [DiabloMapId.CAMELOT]: [],
};

// ────────────────────────────────────────────────────────────────────────────
// Main quest: The Fall of Excalibur — hints per map
// ────────────────────────────────────────────────────────────────────────────
const EXCALIBUR_QUEST_INFO: Partial<Record<DiabloMapId, { fragment: string; hint: string; lore: string }>> = {
  [DiabloMapId.SUNSCORCH_DESERT]: {
    fragment: "The Pommel of Excalibur",
    hint: "Sir Bedivere's tomb lies among the southern ruins. Seek the Sandsworn Revenant that guards it.",
    lore: "Bedivere carried the Pommel into the desert but fell to Mordred's curse. His body still clutches the shard.",
  },
  [DiabloMapId.EMERALD_GRASSLANDS]: {
    fragment: "The Crossguard of Excalibur",
    hint: "The raider camp to the northeast holds what Sir Percival died to protect. Look for Warchief Garon.",
    lore: "Percival sheltered refugees here, but Mordred's Oathbreaker found him. The Crossguard was taken as a trophy.",
  },
  [DiabloMapId.FOREST]: {
    fragment: "The Lower Blade of Excalibur",
    hint: "Morgan le Fay planted the shard in the Great Oak at the forest's heart. The corruption spreads from there.",
    lore: "The forest itself has become the guardian. Cut through the Blighted Heartwood to claim what was stolen.",
  },
  [DiabloMapId.ELVEN_VILLAGE]: {
    fragment: "The Upper Blade of Excalibur",
    hint: "Archon Sylvaris has gone mad with the fragment's power. He lurks in the central crystal spire.",
    lore: "The elves meant well when they kept the blade, but its unsheathed power shattered the Archon's mind.",
  },
  [DiabloMapId.NECROPOLIS_DUNGEON]: {
    fragment: "The Blade Core of Excalibur",
    hint: "Deep in the catacombs, a death knight waits — one who was once Sir Lancelot. Steel yourself.",
    lore: "Lancelot descended alone to reclaim the Core. Mordred's necromancers slew him and raised his corpse as a guardian.",
  },
  [DiabloMapId.VOLCANIC_WASTES]: {
    fragment: "The Enchantment Rune of Excalibur",
    hint: "The demon Balor consumed Merlin's essence along with the Rune. He burns in the deepest caldera.",
    lore: "Merlin's binding magic gave Excalibur its power. Without the Rune, the blade is but common steel.",
  },
  [DiabloMapId.ABYSSAL_RIFT]: {
    fragment: "The Scabbard of Excalibur",
    hint: "Morgan le Fay fled into the void with the Scabbard. She prepares a ritual to destroy it — hurry.",
    lore: "The Scabbard grants invulnerability to its bearer. Morgan knows that without it, Mordred can still be slain.",
  },
  [DiabloMapId.DRAGONS_SANCTUM]: {
    fragment: "The Soul of the Blade",
    hint: "Aurelion the Eternal bonded with Excalibur's sentient core. Prove your worth to the gold dragon.",
    lore: "The Soul chose the dragon to survive. It will not yield to the unworthy — but it yearns to be whole again.",
  },
  [DiabloMapId.WHISPERING_MARSH]: {
    fragment: "The Hilt Binding of Excalibur",
    hint: "Deep within the miasma, Sir Galahad's spirit guards the binding. Purify the marsh to reach him.",
    lore: "Galahad wrapped the Hilt Binding in holy cloth and sank it in the marsh, hoping the corruption would never find it.",
  },
  [DiabloMapId.CRYSTAL_CAVERNS]: {
    fragment: "The Crystal Focus of Excalibur",
    hint: "The crystal deep in the caverns amplified Excalibur's power. The Prismatic Wyrm has swallowed it whole.",
    lore: "Merlin embedded a crystal focus in the blade to channel ley lines. When shattered, it fell into the earth.",
  },
  [DiabloMapId.FROZEN_TUNDRA]: {
    fragment: "The Frozen Edge of Excalibur",
    hint: "The blade fragment lies entombed in eternal ice. Only by slaying the Glacial Titan can the ice be broken.",
    lore: "Sir Gawain carried the Edge to the tundra's heart, where he froze it in place with his dying breath.",
  },
  [DiabloMapId.HAUNTED_CATHEDRAL]: {
    fragment: "The Sacred Blessing of Excalibur",
    hint: "The cathedral's altar still holds the blessing. Free the spirits of the corrupted priests to reclaim it.",
    lore: "The Archbishop was tasked with guarding Excalibur's divine enchantment, but Mordred's curse turned faith to madness.",
  },
  [DiabloMapId.THORNWOOD_THICKET]: {
    fragment: "The Living Heartwood of Excalibur",
    hint: "The Thornmother has absorbed the heartwood into her being. Slay her to reclaim the shard of living steel.",
    lore: "The Lady of the Lake embedded life into the blade. The heartwood shard grew roots and became part of the thicket.",
  },
};

const CAMELOT_FIRST_VISIT_TEXT = [
  "Mordred has betrayed Camelot and shattered Excalibur.",
  "Eight fragments lie scattered across the corrupted lands.",
  "Speak to the merchants for guidance. Recover the shards.",
  "Reforge the blade. End Mordred's reign.",
];

// ────────────────────────────────────────────────────────────────────────────
// Merchant dialogue lines (story flavor)
// ────────────────────────────────────────────────────────────────────────────
const VENDOR_DIALOGUE: Record<VendorType, string[]> = {
  [VendorType.BLACKSMITH]: [
    "I forged arms for the Round Table once. Now I forge them for you — the last hope of Camelot.",
    "Mordred's forces grow bolder each day. The patrols have stopped returning from the Necropolis.",
    "Excalibur... I held it once, to sharpen the edge. There was a hum in the steel, like a heartbeat. We must make it whole.",
    "Sir Lancelot was the finest swordsman I ever knew. If he truly fell in the catacombs... be careful down there.",
    "The desert traders say Bedivere's tomb glows at night. The Pommel still calls out for the blade.",
  ],
  [VendorType.ARCANIST]: [
    "I sense the fragments scattered across the land — each one pulses with Merlin's residual magic.",
    "Morgan le Fay was my teacher once, before the darkness took her. She hides in the Rift now, the coward.",
    "The elves of Aelindor sealed their village after the Archon went mad. Whatever he found, it broke him.",
    "When Excalibur shattered, I felt it in my bones. Every mage did. The world's magic... fractured.",
    "The Enchantment Rune is the key. Without Merlin's binding, the blade is just metal. The demon Balor must fall.",
  ],
  [VendorType.ALCHEMIST]: [
    "I've been brewing restoratives day and night. The wounded keep coming, and the dead... the dead keep rising.",
    "Brother monks in the Necropolis fell silent weeks ago. I fear the worst for their relics — and their souls.",
    "The volcanic wastes reek of brimstone and stolen magic. Something terrible feeds on Merlin's power there.",
    "Stock up on potions before the Abyssal Rift. The void drains life from the unwary.",
    "I pray for Arthur's return from Avalon. Until then, you carry Camelot's hope on your shoulders.",
  ],
  [VendorType.JEWELER]: [
    "These gems once adorned the crowns of Camelot. Now I sell them to fund the resistance.",
    "The grasslands were peaceful once. Now raiders ride under Mordred's black banner.",
    "I've heard whispers of a dragon in the eastern sanctum — old as the world, guarding something precious.",
    "If you find the Scabbard of Excalibur, bring it here. I can verify its authenticity by the gemwork.",
    "Mordred wears a crown of black iron. When you face him, aim for the arrogance.",
  ],
  [VendorType.GENERAL_MERCHANT]: [
    "I've traveled every road in this kingdom. They're all dangerous now. Mordred's patrols are everywhere.",
    "The forest has gone wrong — trees moving, shadows with teeth. It wasn't like that before the blade shattered.",
    "I sell a bit of everything because everyone needs a bit of everything these days. Dark times.",
    "A merchant from the desert told me he saw a tomb glowing blue at night. That's unnatural, that is.",
    "You look like you can handle yourself. Good. Camelot needs fighters, not merchants. ...Don't tell anyone I said that.",
  ],
};

const NIGHT_BOSS_MAP: Partial<Record<DiabloMapId, EnemyType>> = {
  [DiabloMapId.FOREST]: EnemyType.NIGHT_FOREST_WENDIGO,
  [DiabloMapId.ELVEN_VILLAGE]: EnemyType.NIGHT_ELVEN_BANSHEE_QUEEN,
  [DiabloMapId.NECROPOLIS_DUNGEON]: EnemyType.NIGHT_NECRO_DEATH_KNIGHT,
  [DiabloMapId.VOLCANIC_WASTES]: EnemyType.NIGHT_VOLCANIC_INFERNO_TITAN,
  [DiabloMapId.ABYSSAL_RIFT]: EnemyType.NIGHT_RIFT_VOID_EMPEROR,
  [DiabloMapId.DRAGONS_SANCTUM]: EnemyType.NIGHT_DRAGON_SHADOW_WYRM,
  [DiabloMapId.SUNSCORCH_DESERT]: EnemyType.NIGHT_DESERT_SANDSTORM_DJINN,
  [DiabloMapId.EMERALD_GRASSLANDS]: EnemyType.NIGHT_GRASSLAND_STAMPEDE_KING,
  [DiabloMapId.WHISPERING_MARSH]: EnemyType.NIGHT_MARSH_SWAMP_MOTHER,
  [DiabloMapId.CRYSTAL_CAVERNS]: EnemyType.NIGHT_CAVERNS_CRYSTAL_KING,
  [DiabloMapId.FROZEN_TUNDRA]: EnemyType.NIGHT_TUNDRA_FROST_EMPRESS,
  [DiabloMapId.HAUNTED_CATHEDRAL]: EnemyType.NIGHT_CATHEDRAL_ARCH_LICH,
  [DiabloMapId.THORNWOOD_THICKET]: EnemyType.NIGHT_THORNWOOD_BLIGHT_LORD,
  [DiabloMapId.CLOCKWORK_FOUNDRY]: EnemyType.NIGHT_FOUNDRY_IRON_TYRANT,
  [DiabloMapId.CRIMSON_CITADEL]: EnemyType.NIGHT_CITADEL_BLOOD_EMPEROR,
  [DiabloMapId.STORMSPIRE_PEAK]: EnemyType.NIGHT_STORMSPIRE_THUNDER_GOD,
  [DiabloMapId.SHADOW_REALM]: EnemyType.NIGHT_SHADOW_DREAM_EATER,
  [DiabloMapId.PRIMORDIAL_ABYSS]: EnemyType.NIGHT_ABYSS_WORLD_ENDER,
  [DiabloMapId.CITY_RUINS]: EnemyType.NIGHT_RUINS_REVENANT_KING,
  [DiabloMapId.CITY]: EnemyType.NIGHT_CITY_SHADOW_MAGISTRATE,
};

const DAY_BOSS_MAP: Partial<Record<DiabloMapId, EnemyType>> = {
  [DiabloMapId.FOREST]: EnemyType.DAY_FOREST_STAG_GUARDIAN,
  [DiabloMapId.ELVEN_VILLAGE]: EnemyType.DAY_ELVEN_CORRUPTED_SENTINEL,
  [DiabloMapId.NECROPOLIS_DUNGEON]: EnemyType.DAY_NECRO_BONE_GOLEM,
  [DiabloMapId.VOLCANIC_WASTES]: EnemyType.DAY_VOLCANIC_EMBER_BRUTE,
  [DiabloMapId.ABYSSAL_RIFT]: EnemyType.DAY_RIFT_VOID_STALKER,
  [DiabloMapId.DRAGONS_SANCTUM]: EnemyType.DAY_DRAGON_DRAKE_MATRIARCH,
  [DiabloMapId.SUNSCORCH_DESERT]: EnemyType.DAY_DESERT_SAND_GOLEM,
  [DiabloMapId.EMERALD_GRASSLANDS]: EnemyType.DAY_GRASSLAND_BULL_CHIEFTAIN,
  [DiabloMapId.WHISPERING_MARSH]: EnemyType.DAY_MARSH_BOG_TROLL,
  [DiabloMapId.CRYSTAL_CAVERNS]: EnemyType.DAY_CAVERNS_CRYSTAL_SPIDER,
  [DiabloMapId.FROZEN_TUNDRA]: EnemyType.DAY_TUNDRA_FROST_BEAR,
  [DiabloMapId.HAUNTED_CATHEDRAL]: EnemyType.DAY_CATHEDRAL_FALLEN_TEMPLAR,
  [DiabloMapId.THORNWOOD_THICKET]: EnemyType.DAY_THORNWOOD_VINE_COLOSSUS,
  [DiabloMapId.CLOCKWORK_FOUNDRY]: EnemyType.DAY_FOUNDRY_BRONZE_SENTINEL,
  [DiabloMapId.CRIMSON_CITADEL]: EnemyType.DAY_CITADEL_BLOODHOUND_ALPHA,
  [DiabloMapId.STORMSPIRE_PEAK]: EnemyType.DAY_STORMSPIRE_WIND_ELEMENTAL,
  [DiabloMapId.SHADOW_REALM]: EnemyType.DAY_SHADOW_SHADE_STALKER,
  [DiabloMapId.PRIMORDIAL_ABYSS]: EnemyType.DAY_ABYSS_LESSER_HORROR,
  [DiabloMapId.CITY_RUINS]: EnemyType.DAY_RUINS_FALLEN_CAPTAIN,
  [DiabloMapId.CITY]: EnemyType.DAY_CITY_CORRUPT_WARDEN,
};

// ────────────────────────────────────────────────────────────────────────────
// DiabloGame
// ────────────────────────────────────────────────────────────────────────────
export class DiabloGame {
  private _state!: DiabloState;
  private _renderer!: DiabloRenderer;
  private _hud!: HTMLDivElement;
  private _menuEl!: HTMLDivElement;
  private _rafId: number = 0;
  private _lastTime: number = 0;
  private _keys: Set<string> = new Set();
  private _mouseX: number = 0;
  private _mouseY: number = 0;
  private _mouseDown: boolean = false;
  private _nextId: number = 1;
  private _targetEnemyId: string | null = null;
  private _phaseBeforeOverlay: DiabloPhase = DiabloPhase.CLASS_SELECT;

  // First-person mode
  private _firstPerson: boolean = false;
  private _fpYaw: number = 0;
  private _fpPitch: number = 0;
  private _pointerLocked: boolean = false;
  private _mouseDX: number = 0;
  private _mouseDY: number = 0;

  // Bound event handlers
  private _boundKeyDown!: (e: KeyboardEvent) => void;
  private _boundKeyUp!: (e: KeyboardEvent) => void;
  private _boundMouseMove!: (e: MouseEvent) => void;
  private _boundMouseDown!: (e: MouseEvent) => void;
  private _boundMouseUp!: (e: MouseEvent) => void;
  private _boundContextMenu!: (e: MouseEvent) => void;
  private _boundResize!: () => void;

  // HUD element references
  private _hpBar!: HTMLDivElement;
  private _mpBar!: HTMLDivElement;
  private _xpBar!: HTMLDivElement;
  private _goldText!: HTMLDivElement;
  private _levelText!: HTMLDivElement;
  private _killText!: HTMLDivElement;
  private _topRightPanel!: HTMLDivElement;
  private _hpText!: HTMLDivElement;
  private _mpText!: HTMLDivElement;
  private _skillSlots: HTMLDivElement[] = [];
  private _skillCooldownOverlays: HTMLDivElement[] = [];
  private _fpsCrosshair!: HTMLDivElement;
  private _viewModeLabel!: HTMLDivElement;

  // HP/Mana change tracking for visual effects
  private _prevHp: number = -1;
  private _prevMana: number = -1;
  private _hpFlashTimer: number = 0;
  private _manaFlashTimer: number = 0;
  private _hpOrbWrap!: HTMLDivElement;
  private _mpOrbWrap!: HTMLDivElement;

  // Minimap
  private _minimapCanvas!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;

  // Vendor interaction hint
  private _vendorHint!: HTMLDivElement;
  private _chestHint!: HTMLDivElement;

  // Quest popup element
  private _questPopup!: HTMLDivElement;

  // Death overlay (ac6cb424)
  private _deathOverlay!: HTMLDivElement;
  private _isDead: boolean = false;

  // Potion HUD slots (ad1a2850)
  private _potionHudSlots: HTMLDivElement[] = [];

  // Fullscreen map (aece2d8c)
  private _fullmapCanvas!: HTMLCanvasElement;
  private _fullmapCtx!: CanvasRenderingContext2D;
  private _fullmapVisible: boolean = false;
  private _weatherText!: HTMLDivElement;
  private _mapNameLabel!: HTMLDivElement;
  private _xpLevelText!: HTMLDivElement;

  // Quest tracker (a270b216)
  private _questTracker!: HTMLDivElement;
  private _chestsOpened: number = 0;
  private _goldEarnedTotal: number = 0;

  // Safe zone (enemy-free spawn area)
  // @ts-ignore assigned but value never read (reserved for future use)
  private _safeZoneX: number = 0;
  // @ts-ignore assigned but value never read (reserved for future use)
  private _safeZoneZ: number = 0;
  // @ts-ignore assigned but value never read (reserved for future use)
  private _safeZoneRadius: number = 20;

  // Hit freeze & slow motion
  private _hitFreezeTimer: number = 0;
  private _slowMotionTimer: number = 0;
  private _slowMotionScale: number = 1;

  // DPS tracking
  private _dpsDisplay!: HTMLDivElement;
  private _combatLog: { time: number; damage: number }[] = [];
  private _currentDps: number = 0;

  // Skill queue
  private _queuedSkillIdx: number = -1;

  // Loot filter
  private _lootFilterLevel: LootFilterLevel = LootFilterLevel.SHOW_ALL;

  // Legendary hit counter (for "Every 5th Strike")
  // @ts-ignore used by legendary effects
  private _hitCounter: number = 0;

  // Berserker stacks
  // @ts-ignore used by legendary effects
  private _berserkerStacks: { expiry: number }[] = [];

  // Pet system
  private _petBuffs: { type: string; value: number; remaining: number }[] = [];

  // Advanced crafting
  // @ts-ignore used by crafting UI state
  private _craftingUIOpen: boolean = false;

  // ──────────────────────────────────────────────────────────────
  //  BOOT
  // ──────────────────────────────────────────────────────────────
  async boot(): Promise<void> {
    this._state = createDefaultState();
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer = new DiabloRenderer();
    this._renderer.init(w, h);
    document.body.appendChild(this._renderer.canvas);

    // HUD overlay
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;" +
      "font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;display:none;";
    document.body.appendChild(this._hud);

    // Menu overlay
    this._menuEl = document.createElement("div");
    this._menuEl.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;z-index:20;";
    document.body.appendChild(this._menuEl);

    // Bind events
    this._keys = new Set();
    this._boundKeyDown = (e: KeyboardEvent) => this._onKeyDown(e);
    this._boundKeyUp = (e: KeyboardEvent) => this._onKeyUp(e);
    this._boundMouseMove = (e: MouseEvent) => this._onMouseMove(e);
    this._boundMouseDown = (e: MouseEvent) => this._onMouseDown(e);
    this._boundMouseUp = (e: MouseEvent) => this._onMouseUp(e);
    this._boundContextMenu = (e: MouseEvent) => this._onContextMenu(e);
    this._boundResize = () => this._onResize();

    window.addEventListener("keydown", this._boundKeyDown);
    window.addEventListener("keyup", this._boundKeyUp);
    window.addEventListener("mousemove", this._boundMouseMove);
    window.addEventListener("mousedown", this._boundMouseDown);
    window.addEventListener("mouseup", this._boundMouseUp);
    window.addEventListener("contextmenu", this._boundContextMenu);
    window.addEventListener("resize", this._boundResize);
    document.addEventListener("pointerlockchange", () => {
      this._pointerLocked = document.pointerLockElement === this._renderer.canvas;
      if (!this._pointerLocked && this._firstPerson) {
        this._firstPerson = false;
        this._renderer.firstPerson = false;
      }
    });

    this._buildHUD();
    this._showClassSelect();
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._gameLoop);
  }

  // ──────────────────────────────────────────────────────────────
  //  DESTROY
  // ──────────────────────────────────────────────────────────────
  destroy(): void {
    cancelAnimationFrame(this._rafId);
    window.removeEventListener("keydown", this._boundKeyDown);
    window.removeEventListener("keyup", this._boundKeyUp);
    window.removeEventListener("mousemove", this._boundMouseMove);
    window.removeEventListener("mousedown", this._boundMouseDown);
    window.removeEventListener("mouseup", this._boundMouseUp);
    window.removeEventListener("contextmenu", this._boundContextMenu);
    window.removeEventListener("resize", this._boundResize);
    if (this._hud && this._hud.parentElement) {
      this._hud.parentElement.removeChild(this._hud);
    }
    if (this._menuEl && this._menuEl.parentElement) {
      this._menuEl.parentElement.removeChild(this._menuEl);
    }
    this._renderer.dispose();
  }

  // ──────────────────────────────────────────────────────────────
  //  INPUT HANDLERS
  // ──────────────────────────────────────────────────────────────
  private _onKeyDown(e: KeyboardEvent): void {
    this._keys.add(e.code);
    if (this._state.phase === DiabloPhase.PLAYING) {
      if (e.code === "Digit1") this._activateSkill(0);
      else if (e.code === "Digit2") this._activateSkill(1);
      else if (e.code === "Digit3") this._activateSkill(2);
      else if (e.code === "Digit4") this._activateSkill(3);
      else if (e.code === "Digit5") this._activateSkill(4);
      else if (e.code === "Digit6") this._activateSkill(5);
      else if (e.code === "KeyI") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showInventory();
      } else if (e.code === "Escape") {
        this._state.phase = DiabloPhase.PAUSED;
        this._showPauseMenu();
      } else if (e.code === "KeyJ") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showQuestBoard();
      } else if (e.code === "KeyT") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showTalentTree();
      } else if (e.code === "Space") { e.preventDefault(); } // dodge handled in processInput
      else if (e.code === "Tab") {
        e.preventDefault();
        const levels = [LootFilterLevel.SHOW_ALL, LootFilterLevel.HIDE_COMMON, LootFilterLevel.RARE_PLUS, LootFilterLevel.EPIC_PLUS];
        const curIdx = levels.indexOf(this._lootFilterLevel);
        this._lootFilterLevel = levels[(curIdx + 1) % levels.length];
        this._state.player.lootFilter = this._lootFilterLevel;
        const names = ['Show All', 'Hide Common', 'Rare+', 'Epic+'];
        this._addFloatingText(this._state.player.x, this._state.player.y + 3, this._state.player.z, `Filter: ${names[(curIdx + 1) % levels.length]}`, '#ffdd00');
      }
      else if (e.code === "KeyH") {
        // Toggle DPS display
        this._state.player.dpsDisplayVisible = !this._state.player.dpsDisplayVisible;
      }
      else if (e.code === "KeyQ") {
        this._useQuickPotion(PotionType.HEALTH);
      } else if (e.code === "KeyE" && this._state.currentMap !== DiabloMapId.CAMELOT) {
        this._useQuickPotion(PotionType.MANA);
      } else if (e.code === "F1") {
        e.preventDefault();
        this._usePotionSlot(0);
      } else if (e.code === "F2") {
        e.preventDefault();
        this._usePotionSlot(1);
      } else if (e.code === "F3") {
        e.preventDefault();
        this._usePotionSlot(2);
      } else if (e.code === "F4") {
        e.preventDefault();
        this._usePotionSlot(3);
      } else if (e.code === "KeyE" && this._state.currentMap === DiabloMapId.CAMELOT) {
        const p = this._state.player;
        let nearestVendor: DiabloVendor | null = null;
        let nearestDist = 4;
        for (const v of this._state.vendors) {
          const d = this._dist(p.x, p.z, v.x, v.z);
          if (d < nearestDist) {
            nearestDist = d;
            nearestVendor = v;
          }
        }
        if (nearestVendor) {
          if (nearestVendor.type === VendorType.BLACKSMITH) {
            this._showCraftingUI(nearestVendor, 'blacksmith');
          } else if (nearestVendor.type === VendorType.JEWELER) {
            this._showCraftingUI(nearestVendor, 'jeweler');
          } else {
            this._showVendorShop(nearestVendor);
          }
        }
      } else if (e.code === "KeyM") {
        this._fullmapVisible = !this._fullmapVisible;
        this._fullmapCanvas.style.display = this._fullmapVisible ? "block" : "none";
      } else if (e.code === "Space") {
        this._doDodgeRoll();
      } else if (e.code === "KeyP" || e.code === "KeyL") {
        this._toggleLantern();
      } else if (e.code === "KeyK") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showSkillSwapMenu();
      } else if (e.code === "KeyF") {
        this._openNearestChest();
      } else if (e.code === "KeyC") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showCharacterOverview();
      } else if (e.code === "KeyV") {
        this._firstPerson = !this._firstPerson;
        this._renderer.firstPerson = this._firstPerson;
        if (this._firstPerson) {
          this._fpYaw = this._state.player.angle;
          this._fpPitch = 0;
          this._renderer.canvas.requestPointerLock();
        } else if (document.pointerLockElement) {
          document.exitPointerLock();
        }
      } else if (e.code === "KeyN") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showCollection();
      } else if (e.code === "KeyG") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showPetManagement();
      } else if (e.code === "KeyB") {
        this._phaseBeforeOverlay = DiabloPhase.PLAYING;
        this._state.phase = DiabloPhase.INVENTORY;
        if (this._firstPerson && document.pointerLockElement) document.exitPointerLock();
        this._showAdvancedCraftingUI();
      }
    } else if (this._state.phase === DiabloPhase.INVENTORY) {
      if (e.code === "Escape" || e.code === "KeyI" || e.code === "KeyT" || e.code === "KeyC" || e.code === "KeyN") {
        this._closeOverlay();
      } else if (e.code === "KeyS") {
        this._showStash();
      }
    } else if (this._state.phase === DiabloPhase.CLASS_SELECT) {
      // no-op: class select handles its own UI
    } else if (this._state.phase === DiabloPhase.PAUSED) {
      if (e.code === "Escape") {
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = "";
      }
    }
  }

  private _onKeyUp(e: KeyboardEvent): void {
    this._keys.delete(e.code);
  }

  private _onMouseMove(e: MouseEvent): void {
    this._mouseX = e.clientX;
    this._mouseY = e.clientY;
    if (this._firstPerson && this._pointerLocked) {
      this._mouseDX += e.movementX;
      this._mouseDY += e.movementY;
    }
  }

  private _onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this._mouseDown = true;
      if (this._state.phase === DiabloPhase.PLAYING) {
        // Check vendor interaction on Camelot
        if (this._state.currentMap === DiabloMapId.CAMELOT) {
          const p = this._state.player;
          let nearestVendor: DiabloVendor | null = null;
          let nearestDist = 3;
          for (const v of this._state.vendors) {
            const d = this._dist(p.x, p.z, v.x, v.z);
            if (d < nearestDist) {
              nearestDist = d;
              nearestVendor = v;
            }
          }
          if (nearestVendor) {
            this._showVendorShop(nearestVendor);
            return;
          }
        }

        // First person: left click fires active skill or attacks nearest enemy in look direction
        if (this._firstPerson && this._pointerLocked) {
          // Try to fire a skill (use slot 0 by default, or whichever the player has selected)
          const p = this._state.player;
          if (p.skills.length > 0) {
            this._activateSkill(0);
          }
          // Also auto-target nearest enemy in look direction for melee
          const sinY = Math.sin(this._fpYaw);
          const cosY = Math.cos(this._fpYaw);
          let bestId: string | null = null;
          let bestScore = Infinity;
          for (const enemy of this._state.enemies) {
            if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
            const dx = enemy.x - p.x;
            const dz = enemy.z - p.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > 15) continue;
            // Dot product with look direction (higher = more aligned)
            const dot = (-sinY * dx + -cosY * dz) / (dist || 1);
            if (dot > 0.5) { // within ~60 degree cone
              const score = dist * (2 - dot); // prefer close + aligned
              if (score < bestScore) {
                bestScore = score;
                bestId = enemy.id;
              }
            }
          }
          if (bestId) this._targetEnemyId = bestId;
          return;
        }

        const target = this._renderer.getClickTarget(this._mouseX, this._mouseY, this._state);
        if (target) {
          if (target.type === "enemy") {
            this._targetEnemyId = target.id;
          } else if (target.type === "chest") {
            this._openChest(target.id);
          } else if (target.type === "loot") {
            this._pickupLoot(target.id);
          }
        } else {
          this._targetEnemyId = null;
        }
      }
    }
  }

  private _onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this._mouseDown = false;
  }

  private _onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private _onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer.resize(w, h);
  }

  // ──────────────────────────────────────────────────────────────
  //  CLASS SELECT SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showClassSelect(): void {
    const classes: {
      cls: DiabloClass;
      icon: string;
      name: string;
      desc: string;
      str: number;
      dex: number;
      int: number;
      vit: number;
    }[] = [
      {
        cls: DiabloClass.WARRIOR,
        icon: "\u2694\uFE0F",
        name: "WARRIOR",
        desc: "A stalwart champion clad in heavy armor. Masters devastating melee attacks and can withstand tremendous punishment.",
        str: 25, dex: 8, int: 5, vit: 22,
      },
      {
        cls: DiabloClass.MAGE,
        icon: "\uD83D\uDD2E",
        name: "MAGE",
        desc: "An arcane scholar wielding elemental forces. Commands fire, ice, and lightning to devastate foes from afar.",
        str: 5, dex: 8, int: 28, vit: 14,
      },
      {
        cls: DiabloClass.RANGER,
        icon: "\uD83C\uDFF9",
        name: "RANGER",
        desc: "A swift hunter of deadly precision. Rains arrows upon enemies and uses cunning traps to control the battlefield.",
        str: 8, dex: 26, int: 7, vit: 16,
      },
      {
        cls: DiabloClass.PALADIN,
        icon: "\u{1F6E1}\uFE0F",
        name: "PALADIN",
        desc: "A holy knight channeling divine light. Wields sacred powers to smite evil and shield the faithful.",
        str: 20, dex: 8, int: 15, vit: 24,
      },
      {
        cls: DiabloClass.NECROMANCER,
        icon: "\uD83D\uDC80",
        name: "NECROMANCER",
        desc: "A master of death and decay. Commands undead armies and wields dark curses to drain the life from foes.",
        str: 6, dex: 10, int: 25, vit: 16,
      },
      {
        cls: DiabloClass.ASSASSIN,
        icon: "\uD83D\uDDE1\uFE0F",
        name: "ASSASSIN",
        desc: "A lethal shadow operative striking from the darkness. Dual-wields poisoned blades with blinding speed.",
        str: 14, dex: 28, int: 6, vit: 15,
      },
    ];

    const classColors: Record<string, string> = {
      WARRIOR: "#e85030", MAGE: "#5080ff", RANGER: "#40cc40",
      PALADIN: "#ffd740", NECROMANCER: "#b050e0", ASSASSIN: "#cc40cc",
    };
    const maxStat = 30;
    let cardsHtml = "";
    for (const c of classes) {
      const cc = classColors[c.name] || "#c8a84e";
      const statBar = (label: string, val: number, color: string) => {
        const pct = Math.round((val / maxStat) * 100);
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <span style="color:${color};font-size:11px;width:28px;text-align:right;font-weight:bold;">${label}</span>
          <div style="flex:1;height:8px;background:rgba(0,0,0,0.5);border-radius:4px;border:1px solid #3a3020;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${color},${color}aa);border-radius:4px;box-shadow:0 0 4px ${color}80;"></div>
          </div>
          <span style="color:#ddd;font-size:11px;width:20px;">${val}</span>
        </div>`;
      };
      cardsHtml += `
        <div class="diablo-class-card" data-class="${c.cls}" style="
          width:220px;background:rgba(20,15,10,0.95);
          border:3px solid #5a4a2a;border-top-color:#8a7a4a;border-left-color:#7a6a3a;
          border-right-color:#3a2a1a;border-bottom-color:#2a1a0a;
          border-radius:12px;padding:28px 24px;cursor:pointer;text-align:center;
          transition:border-color 0.3s,box-shadow 0.3s;position:relative;
          background-image:repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(200,168,78,0.015) 8px,rgba(200,168,78,0.015) 16px);
        ">
          <!-- Corner rivets -->
          <div style="position:absolute;top:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;bottom:6px;left:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;bottom:6px;right:6px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd740,#8a6a20);box-shadow:0 1px 2px rgba(0,0,0,0.6);"></div>
          <!-- Glowing rune circle behind icon -->
          <div style="position:relative;display:inline-block;margin-bottom:12px;">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,${cc}30 0%,${cc}10 40%,transparent 70%);border:1px solid ${cc}30;box-shadow:0 0 20px ${cc}20;"></div>
            <div style="font-size:64px;position:relative;z-index:1;filter:drop-shadow(0 0 8px ${cc}60);">${c.icon}</div>
          </div>
          <div style="font-size:24px;color:#c8a84e;font-weight:bold;letter-spacing:2px;margin-bottom:12px;text-shadow:0 0 10px rgba(200,168,78,0.3);">${c.name}</div>
          <p style="color:#aaa;font-size:13px;line-height:1.5;margin-bottom:16px;">${c.desc}</p>
          <div style="padding:0 4px;">
            ${statBar("STR", c.str, "#e88")}
            ${statBar("DEX", c.dex, "#8e8")}
            ${statBar("INT", c.int, "#88e")}
            ${statBar("VIT", c.vit, "#ee8")}
          </div>
        </div>`;
    }

    // Build difficulty selector
    const difficulties = [
      DiabloDifficulty.DAGGER,
      DiabloDifficulty.CLEAVER,
      DiabloDifficulty.LONGSWORD,
      DiabloDifficulty.BASTARD_SWORD,
      DiabloDifficulty.CLAYMORE,
      DiabloDifficulty.FLAMBERGE,
    ];
    let diffHtml = "";
    for (const diff of difficulties) {
      const cfg = DIFFICULTY_CONFIGS[diff];
      const isActive = this._state.difficulty === diff;
      diffHtml += `<button class="diff-btn" data-diff="${diff}" style="
        cursor:pointer;padding:8px 16px;font-size:14px;border-radius:6px;transition:0.2s;
        background:${isActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)"};
        border:2px solid ${isActive ? cfg.color : "#3a3a2a"};
        color:${isActive ? cfg.color : "#666"};
        font-family:'Georgia',serif;font-weight:bold;
      ">${cfg.icon} ${cfg.label}<br><span style="font-size:11px;font-weight:normal;opacity:0.7;">${cfg.subtitle}</span></button>`;
    }

    const hasSave = this._hasSave();
    const menuBtnStyle =
      "padding:12px 28px;font-size:15px;letter-spacing:2px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;";
    const loadBtnStyle =
      "padding:12px 28px;font-size:15px;letter-spacing:2px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #44a;border-radius:8px;color:#68f;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;";
    const exitBtnStyle =
      "padding:12px 28px;font-size:15px;letter-spacing:2px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #a44;border-radius:8px;color:#e66;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;";

    const saveBtns = hasSave
      ? `<button id="diablo-cs-load" style="${loadBtnStyle}">LOAD GAME</button>
         <button id="diablo-cs-stash" style="${menuBtnStyle}">STASH</button>
         <button id="diablo-cs-inventory" style="${menuBtnStyle}">INVENTORY</button>
         <button id="diablo-cs-character" style="${menuBtnStyle}">CHARACTER</button>`
      : "";

    this._menuEl.innerHTML = `
      <style>
        @keyframes cs-flame-flicker {
          0%, 100% { text-shadow: 0 0 8px #ff6600, 0 0 16px #ff4400, 0 -4px 12px #ff8800; transform: scaleY(1); }
          25% { text-shadow: 0 0 12px #ff8800, 0 0 20px #ff6600, 0 -6px 16px #ffaa00; transform: scaleY(1.08); }
          50% { text-shadow: 0 0 6px #ff4400, 0 0 14px #ff2200, 0 -3px 10px #ff6600; transform: scaleY(0.95); }
          75% { text-shadow: 0 0 10px #ff6600, 0 0 18px #ff4400, 0 -5px 14px #ff8800; transform: scaleY(1.05); }
        }
        @keyframes cs-title-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(200,168,78,0.5), 0 2px 4px rgba(0,0,0,0.8); }
          50% { text-shadow: 0 0 30px rgba(200,168,78,0.7), 0 0 60px rgba(200,168,78,0.2), 0 2px 4px rgba(0,0,0,0.8); }
        }
      </style>
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;position:relative;overflow:hidden;
      ">
        <!-- Ornate gothic page border -->
        <div style="position:absolute;inset:8px;border:2px solid #5a4a2a;border-radius:4px;pointer-events:none;
          box-shadow:inset 0 0 30px rgba(0,0,0,0.5),0 0 1px #3a2a1a;"></div>
        <div style="position:absolute;inset:12px;border:1px solid #3a2a1a;border-radius:2px;pointer-events:none;"></div>
        <!-- Corner ornaments -->
        <div style="position:absolute;top:14px;left:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>
        <div style="position:absolute;top:14px;right:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>
        <div style="position:absolute;bottom:14px;left:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>
        <div style="position:absolute;bottom:14px;right:14px;color:#5a4a2a;font-size:20px;">&#9670;</div>

        <!-- Title with flame braziers -->
        <div style="display:flex;align-items:center;gap:24px;margin-bottom:8px;">
          <div style="font-size:32px;animation:cs-flame-flicker 0.6s ease-in-out infinite;color:#ff6600;">&#x1F525;</div>
          <div style="text-align:center;">
            <h1 style="
              color:#c8a84e;font-size:48px;letter-spacing:4px;margin:0;
              animation:cs-title-glow 3s ease-in-out infinite;
              font-family:'Georgia',serif;
            ">CHOOSE YOUR CLASS</h1>
            <div style="color:#8a7a4a;font-size:14px;letter-spacing:6px;margin-top:6px;font-family:'Georgia',serif;
              text-shadow:0 0 10px rgba(200,168,78,0.2);">&#10038; Choose Your Champion &#10038;</div>
          </div>
          <div style="font-size:32px;animation:cs-flame-flicker 0.6s ease-in-out infinite 0.3s;color:#ff6600;">&#x1F525;</div>
        </div>

        <!-- Decorative divider -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:80px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
          <span style="color:#c8a84e;font-size:14px;">&#9884;</span>
          <div style="width:40px;height:1px;background:#5a4a2a;"></div>
          <span style="color:#c8a84e;font-size:10px;">&#9830;</span>
          <div style="width:40px;height:1px;background:#5a4a2a;"></div>
          <span style="color:#c8a84e;font-size:14px;">&#9884;</span>
          <div style="width:80px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;justify-content:center;">
          <span style="color:#888;font-size:14px;align-self:center;margin-right:8px;font-family:'Georgia',serif;">DIFFICULTY:</span>
          ${diffHtml}
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">${cardsHtml}</div>
        <div style="display:flex;gap:14px;margin-top:30px;flex-wrap:wrap;justify-content:center;">
          ${saveBtns}
          <button id="diablo-cs-controls" style="${menuBtnStyle}">CONTROLS</button>
          <button id="diablo-cs-exit" style="${exitBtnStyle}">EXIT</button>
        </div>
      </div>`;

    const cards = this._menuEl.querySelectorAll(".diablo-class-card") as NodeListOf<HTMLDivElement>;
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        card.style.borderColor = "#c8a84e";
        card.style.boxShadow = "0 0 20px rgba(200,168,78,0.3)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.borderColor = "#5a4a2a";
        card.style.boxShadow = "none";
      });
      card.addEventListener("click", () => {
        const cls = card.getAttribute("data-class") as DiabloClass;
        this._state.player = createDefaultPlayer(cls);
        this._showMapSelect();
      });
    });

    // Wire up difficulty buttons
    const diffBtns = this._menuEl.querySelectorAll(".diff-btn") as NodeListOf<HTMLButtonElement>;
    diffBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this._state.difficulty = btn.getAttribute("data-diff") as DiabloDifficulty;
        diffBtns.forEach((b) => {
          const bDiff = b.getAttribute("data-diff") as DiabloDifficulty;
          const bCfg = DIFFICULTY_CONFIGS[bDiff];
          const isNowActive = bDiff === this._state.difficulty;
          b.style.background = isNowActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)";
          b.style.borderColor = isNowActive ? bCfg.color : "#3a3a2a";
          b.style.color = isNowActive ? bCfg.color : "#666";
        });
      });
    });

    // Hover helper for class-select menu buttons
    const csHover = (id: string, hBorder: string, hShadow: string, hBg: string, rBorder: string, rBg: string) => {
      const el = this._menuEl.querySelector(id) as HTMLButtonElement | null;
      if (!el) return;
      el.addEventListener("mouseenter", () => { el.style.borderColor = hBorder; el.style.boxShadow = `0 0 15px ${hShadow}`; el.style.background = hBg; });
      el.addEventListener("mouseleave", () => { el.style.borderColor = rBorder; el.style.boxShadow = "none"; el.style.background = rBg; });
    };
    // Standard gold buttons
    csHover("#diablo-cs-controls", "#c8a84e", "rgba(200,168,78,0.3)", "rgba(50,40,20,0.95)", "#5a4a2a", "rgba(40,30,15,0.9)");
    csHover("#diablo-cs-stash", "#c8a84e", "rgba(200,168,78,0.3)", "rgba(50,40,20,0.95)", "#5a4a2a", "rgba(40,30,15,0.9)");
    csHover("#diablo-cs-inventory", "#c8a84e", "rgba(200,168,78,0.3)", "rgba(50,40,20,0.95)", "#5a4a2a", "rgba(40,30,15,0.9)");
    csHover("#diablo-cs-character", "#c8a84e", "rgba(200,168,78,0.3)", "rgba(50,40,20,0.95)", "#5a4a2a", "rgba(40,30,15,0.9)");
    // Load button (blue)
    csHover("#diablo-cs-load", "#68f", "rgba(100,100,255,0.3)", "rgba(30,30,50,0.95)", "#44a", "rgba(40,30,15,0.9)");
    // Exit button (red)
    csHover("#diablo-cs-exit", "#e44", "rgba(255,80,80,0.3)", "rgba(50,20,20,0.95)", "#a44", "rgba(40,30,15,0.9)");

    // Click handlers
    const csClick = (id: string, fn: () => void) => {
      const el = this._menuEl.querySelector(id);
      if (el) el.addEventListener("click", fn);
    };
    csClick("#diablo-cs-load", () => this._loadGame());
    csClick("#diablo-cs-controls", () => { this._phaseBeforeOverlay = DiabloPhase.CLASS_SELECT; this._state.phase = DiabloPhase.INVENTORY; this._showControls(); });
    csClick("#diablo-cs-exit", () => window.dispatchEvent(new CustomEvent("diabloExit")));

    // Stash/Inventory/Character need a loaded save to have meaningful data
    if (hasSave) {
      csClick("#diablo-cs-stash", () => {
        this._phaseBeforeOverlay = DiabloPhase.CLASS_SELECT;
        const raw = localStorage.getItem("diablo_save");
        if (raw) {
          const save = JSON.parse(raw);
          this._state.persistentStash = (() => { const s = save.persistentStash || []; while (s.length < 150) s.push({ item: null }); return s; })();
          this._state.player = { ...save.player, skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)) };
          this._state.persistentGold = save.persistentGold;
        }
        this._state.phase = DiabloPhase.INVENTORY;
        this._showStash();
      });
      csClick("#diablo-cs-inventory", () => {
        this._phaseBeforeOverlay = DiabloPhase.CLASS_SELECT;
        const raw = localStorage.getItem("diablo_save");
        if (raw) {
          const save = JSON.parse(raw);
          this._state.player = { ...save.player, skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)) };
          this._state.persistentGold = save.persistentGold;
        }
        this._state.phase = DiabloPhase.INVENTORY;
        this._showInventory();
      });
      csClick("#diablo-cs-character", () => {
        this._phaseBeforeOverlay = DiabloPhase.CLASS_SELECT;
        const raw = localStorage.getItem("diablo_save");
        if (raw) {
          const save = JSON.parse(raw);
          this._state.player = { ...save.player, skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)) };
        }
        this._state.phase = DiabloPhase.INVENTORY;
        this._showCharacterOverview();
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  MAP SELECT SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showMapSelect(): void {
    const maps: {
      id: DiabloMapId;
      icon: string;
      name: string;
      desc: string;
      difficulty: string;
      isSafe?: boolean;
    }[] = [
      {
        id: DiabloMapId.CAMELOT,
        icon: "\uD83C\uDFF0",
        name: "Camelot",
        desc: "The great citadel. Visit merchants, manage your gear, and prepare for adventure.",
        difficulty: "Safe Zone",
        isSafe: true,
      },
      // ── 1 star ──
      {
        id: DiabloMapId.EMERALD_GRASSLANDS,
        icon: "\uD83C\uDF3F",
        name: "Emerald Grasslands",
        desc: "Rolling green hills dotted with wildflowers. Raiders and wild beasts roam the open plains.",
        difficulty: "\u2B50",
      },
      {
        id: DiabloMapId.SUNSCORCH_DESERT,
        icon: "\uD83C\uDFDC\uFE0F",
        name: "Sunscorch Desert",
        desc: "Sun-blasted dunes and ancient ruins half-buried in sand. Scorpions and bandits prey on travelers.",
        difficulty: "\u2B50",
      },
      {
        id: DiabloMapId.FOREST,
        icon: "\uD83C\uDF32",
        name: "Darkwood Forest",
        desc: "Ancient woods teeming with wildlife turned hostile. Bandits lurk among the trees.",
        difficulty: "\u2B50",
      },
      {
        id: DiabloMapId.MOONLIT_GROVE,
        icon: "\uD83C\uDF19",
        name: "Moonlit Grove",
        desc: "A mystical clearing bathed in eternal moonlight. Fey creatures dance among silver-leafed trees.",
        difficulty: "\u2B50",
      },
      {
        id: DiabloMapId.SHATTERED_COLOSSEUM,
        icon: "\uD83C\uDFDF\uFE0F",
        name: "Shattered Colosseum",
        desc: "A ruined gladiatorial arena where spectral fighters battle for an audience of ghosts.",
        difficulty: "\u2B50",
      },
      // ── 2 stars ──
      {
        id: DiabloMapId.ELVEN_VILLAGE,
        icon: "\u2728",
        name: "Aelindor",
        desc: "A once-peaceful elven settlement, now corrupted by dark magic. Shadows stir between the crystal spires.",
        difficulty: "\u2B50\u2B50",
      },
      {
        id: DiabloMapId.CORAL_DEPTHS,
        icon: "\uD83E\uDEBB",
        name: "Coral Depths",
        desc: "Sunken ruins encrusted with bioluminescent coral. Predatory sea creatures guard forgotten treasures.",
        difficulty: "\u2B50\u2B50",
      },
      {
        id: DiabloMapId.ANCIENT_LIBRARY,
        icon: "\uD83D\uDCDA",
        name: "Ancient Library",
        desc: "An impossibly vast library where forbidden knowledge animates its guardians. Sentient tomes and ink-born horrors lurk.",
        difficulty: "\u2B50\u2B50",
      },
      {
        id: DiabloMapId.PETRIFIED_GARDEN,
        icon: "\uD83E\uDEA8",
        name: "Petrified Garden",
        desc: "A cursed garden where a gorgon queen turned everything to stone. Statues line the frozen paths.",
        difficulty: "\u2B50\u2B50",
      },
      {
        id: DiabloMapId.SUNKEN_CITADEL,
        icon: "\uD83C\uDF0A",
        name: "Sunken Citadel",
        desc: "A grand fortress dragged beneath the waves. Drowned knights patrol flooded corridors lit by bioluminescent algae.",
        difficulty: "\u2B50\u2B50",
      },
      {
        id: DiabloMapId.CITY_RUINS,
        icon: "\uD83C\uDFDA\uFE0F",
        name: "City Ruins",
        desc: "The shattered remains of a once-great city. Corrupted watchmen still patrol their forgotten posts.",
        difficulty: "\u2B50\u2B50",
      },
      // ── 3 stars ──
      {
        id: DiabloMapId.NECROPOLIS_DUNGEON,
        icon: "\uD83D\uDC80",
        name: "Necropolis Depths",
        desc: "The catacombs beneath a fallen fortress. The dead do not rest here.",
        difficulty: "\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.JADE_TEMPLE,
        icon: "\uD83C\uDFDB\uFE0F",
        name: "Jade Temple",
        desc: "A crumbling jungle temple where jade constructs guard forgotten rituals. Tribal shamans have awakened the old gods.",
        difficulty: "\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.ASHEN_BATTLEFIELD,
        icon: "\u2694\uFE0F",
        name: "Ashen Battlefield",
        desc: "Scarred remnants of a cataclysmic war. Ghostly soldiers fight an endless battle among shattered siege engines.",
        difficulty: "\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.WYRMSCAR_CANYON,
        icon: "\uD83D\uDC32",
        name: "Wyrmscar Canyon",
        desc: "A canyon scorched black by generations of dragonfire. Wyverns circle overhead while drakes swarm below.",
        difficulty: "\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.PLAGUEROT_SEWERS,
        icon: "\u2620\uFE0F",
        name: "Plaguerot Sewers",
        desc: "Festering tunnels beneath a city consumed by plague. The infected have devolved into something inhuman.",
        difficulty: "\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.CITY,
        icon: "\uD83C\uDFE0",
        name: "City of Thornwall",
        desc: "A walled city under the grip of a corrupt garrison. Armored enforcers patrol the market squares and shadowy alleyways.",
        difficulty: "\u2B50\u2B50\u2B50",
      },
      // ── 4 stars ──
      {
        id: DiabloMapId.VOLCANIC_WASTES,
        icon: "\uD83C\uDF0B",
        name: "Volcanic Wastes",
        desc: "A scorched hellscape of molten rivers and ash storms. Demons forged in flame roam the ruins.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.FUNGAL_DEPTHS,
        icon: "\uD83C\uDF44",
        name: "Fungal Depths",
        desc: "Cavernous tunnels choked with towering bioluminescent mushrooms. The air is thick with toxic spores.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.OBSIDIAN_FORTRESS,
        icon: "\uD83C\uDFF0",
        name: "Obsidian Fortress",
        desc: "A fortress carved from volcanic glass reflecting hellfire. Demonic legions drill in its courtyards.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.ETHEREAL_SANCTUM,
        icon: "\uD83D\uDD2E",
        name: "Ethereal Sanctum",
        desc: "A temple phasing between multiple planes of existence. Its guardians shift between corporeal and spectral forms.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.IRON_WASTES,
        icon: "\u2699\uFE0F",
        name: "Iron Wastes",
        desc: "A blasted wasteland of rusting war machines. Self-repairing automatons build ever-deadlier forms from the wreckage.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50",
      },
      // ── 5 stars ──
      {
        id: DiabloMapId.ABYSSAL_RIFT,
        icon: "\uD83C\uDF0C",
        name: "Abyssal Rift",
        desc: "A tear in reality. Eldritch horrors drift between shattered islands of stone above the void.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.CELESTIAL_RUINS,
        icon: "\u2B50",
        name: "Celestial Ruins",
        desc: "Shattered temples floating among the stars. Fallen cosmic guardians patrol bridges of pure light.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.INFERNAL_THRONE,
        icon: "\uD83D\uDD25",
        name: "Infernal Throne",
        desc: "The seat of demonic power. Rivers of molten souls flow beneath a throne of compressed agony.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.BLIGHTED_THRONE,
        icon: "\uD83D\uDC51",
        name: "Blighted Throne",
        desc: "The corrupted throne room of a king who bargained with dark powers. His nightmarish court still holds session.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.CHRONO_LABYRINTH,
        icon: "\u231B",
        name: "Chrono Labyrinth",
        desc: "A maze where corridors loop through fractured timelines. Past and future collide with every step.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
      // ── 6 stars ──
      {
        id: DiabloMapId.DRAGONS_SANCTUM,
        icon: "\uD83D\uDC09",
        name: "Dragon's Sanctum",
        desc: "The ancient lair of the Elder Dragons. Gold-encrusted caverns echo with primordial fury.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.ASTRAL_VOID,
        icon: "\uD83C\uDF0C",
        name: "Astral Void",
        desc: "The space between dimensions where reality unravels. Entities older than creation drift through fractured timelines.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
      {
        id: DiabloMapId.ELDRITCH_NEXUS,
        icon: "\uD83E\uDDE0",
        name: "Eldritch Nexus",
        desc: "The convergence of all dark dimensions. Alien intelligences probe the boundaries of sanity in impossible geometries.",
        difficulty: "\u2B50\u2B50\u2B50\u2B50\u2B50\u2B50",
      },
    ];

    let cardsHtml = "";
    for (const m of maps) {
      cardsHtml += `
        <div class="diablo-map-card" data-map="${m.id}" style="
          width:220px;background:rgba(20,15,10,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:30px;cursor:pointer;text-align:center;
          transition:border-color 0.3s,box-shadow 0.3s;
        ">
          <div style="font-size:64px;margin-bottom:12px;">${m.icon}</div>
          <div style="font-size:22px;color:#c8a84e;font-weight:bold;letter-spacing:2px;margin-bottom:12px;">${m.name}</div>
          <p style="color:#aaa;font-size:14px;line-height:1.5;margin-bottom:16px;">${m.desc}</p>
          <div style="font-size:20px;color:${m.isSafe ? '#44ff44' : '#ff8'};">Difficulty: ${m.difficulty}</div>
        </div>`;
    }

    const todOptions: { value: TimeOfDay; label: string; icon: string }[] = [
      { value: TimeOfDay.DAY, label: "DAY", icon: "\u2600\uFE0F" },
      { value: TimeOfDay.DAWN, label: "DAWN", icon: "\uD83C\uDF05" },
      { value: TimeOfDay.DUSK, label: "DUSK", icon: "\uD83C\uDF07" },
      { value: TimeOfDay.NIGHT, label: "NIGHT", icon: "\uD83C\uDF19" },
    ];
    let todHtml = "";
    for (const t of todOptions) {
      const isActive = this._state.timeOfDay === t.value;
      todHtml += `<button class="tod-btn" data-tod="${t.value}" style="
        cursor:pointer;padding:10px 20px;font-size:16px;border-radius:6px;transition:0.2s;
        background:${isActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)"};
        border:2px solid ${isActive ? "#c8a84e" : "#3a3a2a"};
        color:${isActive ? "#ffd700" : "#888"};
        font-family:'Georgia',serif;
      ">${t.icon} ${t.label}</button>`;
    }

    // Map modifier toggles
    const modifiers = [
      { id: 'ENEMY_SPEED', name: 'Swift', icon: '\uD83D\uDCA8', desc: 'Enemies 40% faster', color: '#44ccff', dropBonus: 15 },
      { id: 'ENEMY_FIRE_RESIST', name: 'Fireproof', icon: '\uD83D\uDD25', desc: '50% fire resist', color: '#ff4400', dropBonus: 10 },
      { id: 'ENEMY_ICE_RESIST', name: 'Frostbound', icon: '\u2744\uFE0F', desc: '50% ice resist', color: '#4488ff', dropBonus: 10 },
      { id: 'ENEMY_LIGHTNING_RESIST', name: 'Grounded', icon: '\u26A1', desc: '50% lightning resist', color: '#ffdd00', dropBonus: 10 },
      { id: 'ENEMY_THORNS', name: 'Thorns', icon: '\uD83C\uDF39', desc: '15% damage reflect', color: '#ff4488', dropBonus: 20 },
      { id: 'ENEMY_REGEN', name: 'Regenerating', icon: '\uD83D\uDC9A', desc: 'Enemies regen', color: '#44ff44', dropBonus: 15 },
      { id: 'EXTRA_ELITES', name: 'Champions', icon: '\uD83D\uDC51', desc: 'More bosses', color: '#ffd700', dropBonus: 25 },
      { id: 'EXPLOSIVE_DEATH', name: 'Volatile', icon: '\uD83D\uDCA5', desc: 'Enemies explode', color: '#ff8800', dropBonus: 15 },
      { id: 'DOUBLE_HP', name: 'Fortified', icon: '\uD83D\uDEE1\uFE0F', desc: 'Double enemy HP', color: '#888888', dropBonus: 30 },
      { id: 'VAMPIRIC', name: 'Vampiric', icon: '\uD83E\uDDDB', desc: 'Enemies lifesteal', color: '#cc0000', dropBonus: 20 },
    ];
    let modHtml = '';
    for (const mod of modifiers) {
      modHtml += `<button class="mod-btn" data-mod="${mod.id}" style="
        cursor:pointer;padding:6px 12px;font-size:13px;border-radius:6px;transition:0.2s;
        background:rgba(30,20,10,0.7);border:2px solid #3a3a2a;color:#888;
        font-family:'Georgia',serif;display:flex;align-items:center;gap:6px;
      " title="${mod.desc} (+${mod.dropBonus}% drop rate)">
        <span style="font-size:18px;">${mod.icon}</span>
        <span>${mod.name}</span>
        <span style="font-size:10px;color:#4a4;margin-left:4px;">+${mod.dropBonus}%\uD83C\uDF81</span>
      </button>`;
    }

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="
          color:#c8a84e;font-size:42px;letter-spacing:4px;margin-bottom:30px;
          text-shadow:0 0 20px rgba(200,168,78,0.5),0 2px 4px rgba(0,0,0,0.8);
          font-family:'Georgia',serif;
        ">SELECT YOUR DESTINATION</h1>
        <div style="font-size:16px;color:${DIFFICULTY_CONFIGS[this._state.difficulty].color};margin-bottom:12px;font-family:'Georgia',serif;">
          ${DIFFICULTY_CONFIGS[this._state.difficulty].icon} ${DIFFICULTY_CONFIGS[this._state.difficulty].label} Difficulty
        </div>
        <div style="display:flex;gap:8px;margin-bottom:20px;">${todHtml}</div>
        <div style="margin-bottom:12px;text-align:center;">
          <div style="color:#c8a84e;font-size:14px;letter-spacing:2px;margin-bottom:8px;">MAP MODIFIERS (increase drop rate)</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:900px;">${modHtml}</div>
          <div id="total-drop-bonus" style="color:#4a4;font-size:13px;margin-top:6px;">Total drop rate bonus: +0%</div>
        </div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;max-width:95vw;overflow-y:auto;max-height:60vh;padding:10px;">${cardsHtml}</div>
      </div>`;

    // Wire up time-of-day buttons
    const todBtns = this._menuEl.querySelectorAll(".tod-btn") as NodeListOf<HTMLButtonElement>;
    todBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this._state.timeOfDay = btn.getAttribute("data-tod") as TimeOfDay;
        // Update visual state for all buttons
        todBtns.forEach((b) => {
          const isNowActive = b.getAttribute("data-tod") === this._state.timeOfDay;
          b.style.background = isNowActive ? "rgba(60,50,20,0.9)" : "rgba(30,20,10,0.7)";
          b.style.borderColor = isNowActive ? "#c8a84e" : "#3a3a2a";
          b.style.color = isNowActive ? "#ffd700" : "#888";
        });
      });
    });

    // Wire up map modifier buttons
    const activeModifiers: Set<string> = new Set();
    const modBtns = this._menuEl.querySelectorAll(".mod-btn") as NodeListOf<HTMLButtonElement>;
    const dropBonusLabel = this._menuEl.querySelector("#total-drop-bonus") as HTMLDivElement;
    modBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const modId = btn.getAttribute("data-mod")!;
        if (activeModifiers.has(modId)) {
          activeModifiers.delete(modId);
          btn.style.background = "rgba(30,20,10,0.7)";
          btn.style.borderColor = "#3a3a2a";
          btn.style.color = "#888";
        } else {
          activeModifiers.add(modId);
          const mod = modifiers.find(m => m.id === modId)!;
          btn.style.background = "rgba(60,50,20,0.9)";
          btn.style.borderColor = mod.color;
          btn.style.color = mod.color;
        }
        // Update total drop bonus display
        let totalBonus = 0;
        for (const id of activeModifiers) {
          const m = modifiers.find(mod => mod.id === id);
          if (m) totalBonus += m.dropBonus;
        }
        if (dropBonusLabel) {
          dropBonusLabel.textContent = `Total drop rate bonus: +${totalBonus}%`;
          dropBonusLabel.style.color = totalBonus > 0 ? '#44ff44' : '#4a4';
        }
      });
    });

    const cards = this._menuEl.querySelectorAll(".diablo-map-card") as NodeListOf<HTMLDivElement>;
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        card.style.borderColor = "#c8a84e";
        card.style.boxShadow = "0 0 20px rgba(200,168,78,0.3)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.borderColor = "#5a4a2a";
        card.style.boxShadow = "none";
      });
      card.addEventListener("click", () => {
        const mapId = card.getAttribute("data-map") as DiabloMapId;
        this._state.activeMapModifiers = [...activeModifiers] as MapModifier[];
        this._startMap(mapId);
      });
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  START MAP
  // ──────────────────────────────────────────────────────────────
  private _startMap(mapId: DiabloMapId): void {
    this._state.currentMap = mapId;
    this._state.enemies = [];
    this._state.projectiles = [];
    this._state.loot = [];
    this._state.treasureChests = [];
    this._state.aoeEffects = [];
    this._state.floatingTexts = [];
    this._state.particles = [];
    this._state.killCount = 0;
    this._state.totalEnemiesSpawned = 0;
    this._state.spawnTimer = 0;
    this._targetEnemyId = null;
    this._fullmapVisible = false;
    if (this._fullmapCanvas) this._fullmapCanvas.style.display = "none";

    const weathers = [Weather.NORMAL, Weather.FOGGY, Weather.CLEAR, Weather.STORMY];
    this._state.weather = weathers[Math.floor(Math.random() * weathers.length)];

    // Apply map modifier speed multiplier to spawned enemies
    // (modifiers are already set from map select, stored in this._state.activeMapModifiers)

    const mapCfg = MAP_CONFIGS[mapId];
    const gridW = mapCfg.width;
    const gridD = mapCfg.depth;
    this._state.exploredGrid = [];
    for (let x = 0; x < gridW; x++) {
      this._state.exploredGrid[x] = [];
      for (let z = 0; z < gridD; z++) {
        this._state.exploredGrid[x][z] = false;
      }
    }
    // Spawn player near a random corner of the map (with padding)
    const cornerPadX = gridW * 0.12;
    const cornerPadZ = gridD * 0.12;
    const corners = [
      { x: cornerPadX, z: cornerPadZ },
      { x: gridW - cornerPadX, z: cornerPadZ },
      { x: cornerPadX, z: gridD - cornerPadZ },
      { x: gridW - cornerPadX, z: gridD - cornerPadZ },
    ];
    const corner = corners[Math.floor(Math.random() * corners.length)];
    const spawnX = corner.x + (Math.random() * 2 - 1);
    const spawnZ = corner.z + (Math.random() * 2 - 1);

    this._state.player.x = spawnX;
    this._state.player.y = getTerrainHeight(spawnX, spawnZ);
    this._state.player.z = spawnZ;
    // Mark spawn location as enemy-free safe zone
    this._safeZoneX = spawnX;
    this._safeZoneZ = spawnZ;
    this._safeZoneRadius = 40;
    this._revealAroundPlayer(spawnX, spawnZ);
    this._state.player.hp = this._state.player.maxHp;
    this._state.player.mana = this._state.player.maxMana;

    this._renderer.buildMap(mapId);
    this._renderer.buildPlayer(this._state.player.class);
    this._renderer.applyTimeOfDay(this._state.timeOfDay, mapId);
    this._renderer.applyWeather(this._state.weather);

    // Auto-enable lantern on map entry if one is equipped
    if (this._state.player.equipment.lantern) {
      const lanternCfg = LANTERN_CONFIGS[this._state.player.equipment.lantern.name];
      if (lanternCfg) {
        this._state.player.lanternOn = true;
        this._renderer.setPlayerLantern(true, lanternCfg.intensity, lanternCfg.distance, lanternCfg.color);
      }
    }

    if (mapId === DiabloMapId.CAMELOT) {
      // Camelot is a safe hub: no enemies or chests, spawn vendors instead
      this._state.vendors = VENDOR_DEFS.map((vd) => ({
        id: this._genId(),
        type: vd.type,
        name: vd.name,
        x: vd.x,
        z: vd.z,
        inventory: generateVendorInventory(vd.type, this._state.player.level),
        icon: vd.icon,
      }));
      if ((this._renderer as any).syncVendors) {
        (this._renderer as any).syncVendors(
          this._state.vendors.map((v) => ({ x: v.x, z: v.z, type: v.type, name: v.name, icon: v.icon }))
        );
      }
      // Spawn townfolk wandering around Camelot
      this._spawnCamelotTownfolk();
    } else {
      this._state.vendors = [];
      this._state.townfolk = [];
      this._spawnInitialEnemies();
      this._spawnInitialChests();
    }

    this._state.phase = DiabloPhase.PLAYING;
    this._menuEl.innerHTML = "";
    this._hud.style.display = "block";
    this._recalculatePlayerStats();

    // Main quest popup on map entry
    if (mapId === DiabloMapId.CAMELOT) {
      this._showQuestPopup(
        "\u2694\uFE0F The Fall of Excalibur",
        CAMELOT_FIRST_VISIT_TEXT.join("<br>"),
        null,
        8000,
      );
    } else {
      const questInfo = EXCALIBUR_QUEST_INFO[mapId];
      if (questInfo) {
        this._showQuestPopup(
          `\u2694\uFE0F ${questInfo.fragment}`,
          questInfo.hint,
          questInfo.lore,
          7000,
        );
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  INVENTORY SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showInventory(): void {
    const p = this._state.player;

    // Inject rarity pulse animation styles (once)
    if (!document.getElementById("inv-rarity-anim-style")) {
      const styleEl = document.createElement("style");
      styleEl.id = "inv-rarity-anim-style";
      styleEl.textContent = `
        @keyframes inv-glow-legendary {
          0%, 100% { box-shadow: 0 0 10px #ff8800, 0 0 5px #ff8800 inset; }
          50% { box-shadow: 0 0 16px #ff8800, 0 0 8px #ff8800 inset, 0 0 24px rgba(255,136,0,0.3); }
        }
        @keyframes inv-glow-mythic {
          0%, 100% { box-shadow: 0 0 12px #ff2222, 0 0 6px #ff2222 inset; }
          50% { box-shadow: 0 0 18px #ff2222, 0 0 9px #ff2222 inset, 0 0 28px rgba(255,34,34,0.3); }
        }
        @keyframes inv-glow-divine {
          0%, 100% { box-shadow: 0 0 14px #ffd700, 0 0 7px #ffd700 inset; }
          50% { box-shadow: 0 0 20px #ffd700, 0 0 10px #ffd700 inset, 0 0 32px rgba(255,215,0,0.35); }
        }
        .inv-anim-legendary { animation: inv-glow-legendary 2s ease-in-out infinite; }
        .inv-anim-mythic    { animation: inv-glow-mythic 1.8s ease-in-out infinite; }
        .inv-anim-divine    { animation: inv-glow-divine 2.2s ease-in-out infinite; }
        .equip-slot:hover, .inv-slot:hover { filter: brightness(1.25); transform: scale(1.04); }
        .equip-slot, .inv-slot { transition: filter 0.15s, transform 0.15s, box-shadow 0.3s; }
      `;
      document.head.appendChild(styleEl);
    }

    const slotDefs: { key: keyof DiabloEquipment; label: string; gridArea: string }[] = [
      { key: "helmet", label: "Helmet", gridArea: "1/2/2/3" },
      { key: "weapon", label: "Weapon", gridArea: "2/1/3/2" },
      { key: "body", label: "Body", gridArea: "2/2/3/3" },
      { key: "accessory1", label: "Accessory 1", gridArea: "2/3/3/4" },
      { key: "gauntlets", label: "Gauntlets", gridArea: "3/1/4/2" },
      { key: "legs", label: "Legs", gridArea: "3/2/4/3" },
      { key: "accessory2", label: "Accessory 2", gridArea: "3/3/4/4" },
      { key: "feet", label: "Feet", gridArea: "4/2/5/3" },
      { key: "lantern", label: "Lantern [L/P]", gridArea: "4/3/5/4" },
    ];

    const animClass = (r: ItemRarity) => {
      if (r === ItemRarity.LEGENDARY) return "inv-anim-legendary";
      if (r === ItemRarity.MYTHIC) return "inv-anim-mythic";
      if (r === ItemRarity.DIVINE) return "inv-anim-divine";
      return "";
    };

    let equipHtml = "";
    for (const sd of slotDefs) {
      const item = p.equipment[sd.key];
      const borderColor = item ? RARITY_CSS[item.rarity] : "#555";
      const borderW = item ? RARITY_BORDER[item.rarity] : 1;
      const glow = item ? RARITY_GLOW[item.rarity] : "none";
      const bg = item ? RARITY_BG[item.rarity] : "rgba(15,10,5,0.9)";
      const anim = item && rarityNeedsAnim(item.rarity) ? animClass(item.rarity) : "";
      const badge = item && RARITY_BADGE[item.rarity]
        ? `<div style="position:absolute;top:2px;right:3px;font-size:9px;color:${RARITY_CSS[item.rarity]};text-shadow:0 0 4px ${RARITY_CSS[item.rarity]};line-height:1;">${RARITY_BADGE[item.rarity]}</div>`
        : "";
      const content = item
        ? `<div style="font-size:28px;">${item.icon}</div><div style="font-size:10px;color:${RARITY_CSS[item.rarity]};margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:68px;text-shadow:0 0 6px ${RARITY_CSS[item.rarity]}40;">${item.name}</div>${badge}`
        : `<div style="font-size:11px;color:#555;">${sd.label}</div>`;
      equipHtml += `
        <div class="equip-slot ${anim}" data-equip-key="${sd.key}" style="
          grid-area:${sd.gridArea};width:74px;height:74px;background:${bg};
          border:${borderW}px solid ${borderColor};border-radius:6px;display:flex;flex-direction:column;
          align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;
          position:relative;box-shadow:${glow};
        ">${content}</div>`;
    }

    let invHtml = "";
    for (let i = 0; i < p.inventory.length; i++) {
      const slot = p.inventory[i];
      const item = slot.item;
      const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
      const borderW = item ? RARITY_BORDER[item.rarity] : 1;
      const glow = item ? RARITY_GLOW[item.rarity] : "none";
      const bg = item ? RARITY_BG[item.rarity] : "rgba(15,10,5,0.85)";
      const anim = item && rarityNeedsAnim(item.rarity) ? animClass(item.rarity) : "";
      const badge = item && RARITY_BADGE[item.rarity]
        ? `<div style="position:absolute;top:1px;right:2px;font-size:8px;color:${RARITY_CSS[item.rarity]};text-shadow:0 0 4px ${RARITY_CSS[item.rarity]};line-height:1;">${RARITY_BADGE[item.rarity]}</div>`
        : "";
      const content = item
        ? `<div style="font-size:24px;">${item.icon}</div>${badge}`
        : "";
      invHtml += `
        <div class="inv-slot ${anim}" data-inv-idx="${i}" style="
          width:62px;height:62px;background:${bg};border:${borderW}px solid ${borderColor};
          border-radius:4px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;pointer-events:auto;position:relative;box-shadow:${glow};
        ">${content}</div>`;
    }

    // Player stats
    const stats = this._getEffectiveStats();
    const statsHtml = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 14px;font-size:12px;">
        <div style="color:#e88;">STR: ${stats.strength}</div>
        <div style="color:#8e8;">DEX: ${stats.dexterity}</div>
        <div style="color:#88e;">INT: ${stats.intelligence}</div>
        <div style="color:#ee8;">VIT: ${stats.vitality}</div>
        <div style="color:#aaa;">Armor: ${stats.armor}</div>
        <div style="color:#f88;">Crit: ${(stats.critChance * 100).toFixed(1)}%</div>
        <div style="color:#8af;">Speed: ${stats.moveSpeed.toFixed(1)}</div>
        <div style="color:#fa8;">AtkSpd: ${stats.attackSpeed.toFixed(2)}</div>
        <div style="color:#af8;">CritDmg: ${(stats.critDamage * 100).toFixed(0)}%</div>
      </div>`;

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;
        background:rgba(0,0,0,0.90);
        background-image:radial-gradient(ellipse at center,rgba(40,30,15,0.15) 0%,transparent 70%);
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;position:relative;
      ">
        <!-- Parchment-style inner panel -->
        <div style="position:relative;padding:24px 36px;
          background:linear-gradient(180deg,rgba(30,24,14,0.95) 0%,rgba(20,16,8,0.98) 100%);
          border:2px solid #5a4a2a;border-radius:8px;
          box-shadow:inset 0 0 60px rgba(0,0,0,0.3),0 0 30px rgba(0,0,0,0.5);">
          <!-- Inner decorative border -->
          <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-radius:6px;pointer-events:none;"></div>

          <!-- Title with ornamental flourishes -->
          <div style="text-align:center;margin-bottom:18px;">
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:6px;">
              <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#c8a84e);"></div>
              <span style="color:#c8a84e;font-size:10px;">\u2726</span>
              <span style="color:#5a4a2a;font-size:14px;">\u269C</span>
              <span style="color:#c8a84e;font-size:10px;">\u2726</span>
              <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#c8a84e);"></div>
            </div>
            <h2 style="color:#c8a84e;font-size:32px;letter-spacing:5px;margin:0;font-family:'Georgia',serif;
              text-shadow:0 0 16px rgba(200,168,78,0.35), 0 2px 4px rgba(0,0,0,0.6);">
              INVENTORY
            </h2>
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:6px;">
              <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#c8a84e);"></div>
              <span style="color:#c8a84e;font-size:10px;">\u2726</span>
              <span style="color:#5a4a2a;font-size:14px;">\u269C</span>
              <span style="color:#c8a84e;font-size:10px;">\u2726</span>
              <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#c8a84e);"></div>
            </div>
          </div>
          <div style="display:flex;gap:40px;align-items:flex-start;">
            <!-- Equipment -->
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
                <div style="width:30px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
                <span style="color:#a08850;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Equipment</span>
                <div style="width:30px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
              </div>
              <div style="display:grid;grid-template-columns:74px 74px 74px;grid-template-rows:74px 74px 74px 74px;gap:6px;">
                ${equipHtml}
              </div>
              <!-- Gold filigree connection line -->
              <div style="width:100%;height:1px;background:linear-gradient(to right,transparent,#5a4a2a40,transparent);margin-top:8px;"></div>
            </div>
            <!-- Vertical section divider with ornament -->
            <div style="display:flex;flex-direction:column;align-items:center;align-self:stretch;margin:20px 0;gap:0;">
              <div style="color:#5a4a2a;font-size:10px;">\u25C6</div>
              <div style="flex:1;width:1px;background:linear-gradient(to bottom,#5a4a2a,#5a4a2a);"></div>
              <div style="color:#c8a84e;font-size:12px;">\u25C6</div>
              <div style="flex:1;width:1px;background:linear-gradient(to bottom,#5a4a2a,#5a4a2a);"></div>
              <div style="color:#5a4a2a;font-size:10px;">\u25C6</div>
            </div>
            <!-- Inventory Grid -->
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
                <div style="width:30px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
                <span style="color:#a08850;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Backpack</span>
                <div style="width:30px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(8,62px);grid-template-rows:repeat(5,62px);gap:4px;">
                ${invHtml}
              </div>
            </div>
          </div>
          <!-- Horizontal section divider with diamond ornaments -->
          <div style="display:flex;align-items:center;gap:8px;margin:16px auto 12px;width:70%;justify-content:center;">
            <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
            <span style="color:#c8a84e;font-size:10px;">\u25C6</span>
            <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
            <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>
          <!-- Bottom bar: gold, materials, stats -->
          <div style="display:flex;gap:30px;align-items:center;justify-content:center;">
            <div style="display:flex;align-items:center;gap:6px;background:rgba(50,40,10,0.5);border:1px solid #5a4a2a;border-radius:6px;padding:8px 16px;">
              <span style="font-size:18px;">\uD83E\uDE99</span>
              <span style="font-size:16px;color:#ffd700;font-weight:bold;">${p.gold}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;background:rgba(10,30,50,0.4);border:1px solid #3a5a7a;border-radius:6px;padding:8px 16px;">
              <span style="font-size:14px;color:#88ccff;">\u2699 Materials:</span>
              <span style="font-size:15px;color:#aaddff;font-weight:bold;">${p.salvageMaterials}</span>
            </div>
            <div style="background:rgba(20,15,10,0.9);border:1px solid #5a4a2a;border-radius:8px;padding:12px 16px;">
              ${statsHtml}
            </div>
          </div>
          <div style="margin-top:12px;display:flex;gap:16px;align-items:center;justify-content:center;">
            <button id="inv-stash-btn" style="
              padding:10px 24px;font-size:15px;letter-spacing:2px;font-weight:bold;
              background:linear-gradient(180deg,rgba(50,40,20,0.95),rgba(30,22,10,0.95));
              border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              text-shadow:0 1px 3px rgba(0,0,0,0.5);
            ">STASH</button>
            <div style="color:#888;font-size:12px;">Press <span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:2px 10px;font-family:monospace;color:#fff;">S</span> to open Shared Stash</div>
          </div>
          <div style="margin-top:10px;color:#666;font-size:12px;text-align:center;">Press <span style="color:#aaa;">I</span> or <span style="color:#aaa;">Escape</span> to close</div>
        </div>
        <!-- Tooltip container -->
        <div id="inv-tooltip" style="
          display:none;position:fixed;z-index:100;background:rgba(8,4,2,0.97);
          border:2px solid #5a4a2a;border-radius:8px;padding:0;max-width:300px;
          pointer-events:none;color:#ccc;font-size:13px;overflow:hidden;
          box-shadow:0 4px 20px rgba(0,0,0,0.7),0 0 1px #c8a84e;
        "></div>
      </div>`;

    // Wire up equipment slot clicks (unequip)
    const equipSlots = this._menuEl.querySelectorAll(".equip-slot") as NodeListOf<HTMLDivElement>;
    equipSlots.forEach((el) => {
      const key = el.getAttribute("data-equip-key") as keyof DiabloEquipment;
      el.addEventListener("click", () => {
        const item = p.equipment[key];
        if (!item) return;
        const emptyIdx = p.inventory.findIndex((s) => s.item === null);
        if (emptyIdx < 0) return;
        p.inventory[emptyIdx].item = item;
        (p.equipment as any)[key] = null;
        if (key === "lantern" && p.lanternOn) {
          p.lanternOn = false;
          this._renderer.setPlayerLantern(false);
        }
        this._recalculatePlayerStats();
        this._showInventory();
      });
      el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.equipment[key]));
      el.addEventListener("mouseleave", () => this._hideItemTooltip());
    });

    // Wire up inventory slot clicks (equip) and right-click (drop)
    const invSlots = this._menuEl.querySelectorAll(".inv-slot") as NodeListOf<HTMLDivElement>;
    invSlots.forEach((el) => {
      const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
      el.addEventListener("click", () => {
        const item = p.inventory[idx].item;
        if (!item) return;
        const ek = resolveEquipKey(item.slot as string);
        if (!ek) return;
        const existing = p.equipment[ek];
        (p.equipment as any)[ek] = item;
        p.inventory[idx].item = existing;
        if (ek === "lantern" && p.lanternOn) {
          const cfg = LANTERN_CONFIGS[item.name];
          if (cfg) this._renderer.setPlayerLantern(true, cfg.intensity, cfg.distance, cfg.color);
        }
        this._recalculatePlayerStats();
        this._showInventory();
      });
      el.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const item = p.inventory[idx].item;
        if (!item) return;
        p.inventory[idx].item = null;
        const loot: DiabloLoot = {
          id: this._genId(),
          item,
          x: p.x + (Math.random() * 2 - 1),
          y: 0,
          z: p.z + (Math.random() * 2 - 1),
          timer: 0,
        };
        this._state.loot.push(loot);
        this._showInventory();
      });
      el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.inventory[idx].item));
      el.addEventListener("mouseleave", () => this._hideItemTooltip());
    });

    // Stash button
    const stashBtn = this._menuEl.querySelector("#inv-stash-btn") as HTMLButtonElement | null;
    if (stashBtn) {
      stashBtn.addEventListener("mouseenter", () => {
        stashBtn.style.borderColor = "#c8a84e";
        stashBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
        stashBtn.style.background = "rgba(50,40,20,0.95)";
      });
      stashBtn.addEventListener("mouseleave", () => {
        stashBtn.style.borderColor = "#5a4a2a";
        stashBtn.style.boxShadow = "none";
        stashBtn.style.background = "rgba(40,30,15,0.9)";
      });
      stashBtn.addEventListener("click", () => {
        this._showStash();
      });
    }
  }

  private _showItemTooltip(ev: MouseEvent, item: DiabloItem | null): void {
    if (!item) return;
    const tooltip = this._menuEl.querySelector("#inv-tooltip") as HTMLDivElement;
    if (!tooltip) return;

    const rarityColor = RARITY_CSS[item.rarity];
    const rarityName = RARITY_NAMES[item.rarity];
    const stats = item.stats as any;
    let statsLines = "";
    const statLabels: Record<string, string> = {
      strength: "Strength", dexterity: "Dexterity", intelligence: "Intelligence",
      vitality: "Vitality", armor: "Armor", critChance: "Crit Chance",
      critDamage: "Crit Damage", attackSpeed: "Attack Speed", moveSpeed: "Move Speed",
      fireResist: "Fire Resist", iceResist: "Ice Resist", lightningResist: "Lightning Resist",
      poisonResist: "Poison Resist", lifeSteal: "Life Steal", manaRegen: "Mana Regen",
      bonusDamage: "Bonus Damage", bonusHealth: "Bonus Health", bonusMana: "Bonus Mana",
      damage: "Damage", speed: "Speed", lifeRegen: "Life Regen",
    };
    for (const k of Object.keys(stats)) {
      if (stats[k] && stats[k] !== 0) {
        const label = statLabels[k] || k;
        const val = stats[k];
        const clr = val > 0 ? "#8f8" : "#f88";
        const sgn = val > 0 ? "+" : "";
        statsLines += `<div style="color:${clr};font-size:12px;padding:1px 0;">${sgn}${val} ${label}</div>`;
      }
    }

    // Item comparison with currently equipped
    let comparisonLines = "";
    const equipKey = resolveEquipKey(item.slot as string);
    if (equipKey) {
      const equipped = this._state.player.equipment[equipKey];
      if (equipped && equipped.id !== item.id) {
        comparisonLines += `<div style="border-top:1px solid rgba(90,74,42,0.3);margin:6px 0;padding-top:6px;">`;
        comparisonLines += `<div style="color:#c8a84e;font-size:11px;font-weight:bold;margin-bottom:4px;">vs. ${equipped.name}</div>`;
        const eqStats = equipped.stats as any;
        for (const k of Object.keys(statLabels)) {
          const newVal = (stats[k] || 0) as number;
          const oldVal = (eqStats[k] || 0) as number;
          const diff = newVal - oldVal;
          if (diff !== 0) {
            const clr = diff > 0 ? "#44ff44" : "#ff4444";
            const arrow = diff > 0 ? "\u25B2" : "\u25BC";
            comparisonLines += `<div style="color:${clr};font-size:11px;padding:1px 0;">${arrow} ${diff > 0 ? '+' : ''}${diff} ${statLabels[k] || k}</div>`;
          }
        }
        comparisonLines += `</div>`;
      }
    }

    // Lantern light properties
    let lanternLines = "";
    if (item.type === "LANTERN") {
      const lcfg = LANTERN_CONFIGS[item.name];
      if (lcfg) {
        const colorHex = '#' + lcfg.color.toString(16).padStart(6, '0');
        lanternLines = `
          <div style="border-top:1px solid rgba(90,74,42,0.3);margin:6px 0;padding-top:6px;">
            <div style="color:#c8a84e;font-size:12px;font-weight:bold;margin-bottom:4px;">Light Properties</div>
            <div style="color:#ffcc66;font-size:12px;padding:1px 0;">Intensity: ${lcfg.intensity.toFixed(1)}</div>
            <div style="color:#ffcc66;font-size:12px;padding:1px 0;">Range: ${lcfg.distance} units</div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;padding:1px 0;">
              <span style="color:#ffcc66;">Color:</span>
              <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${colorHex};border:1px solid #555;box-shadow:0 0 6px ${colorHex};"></span>
            </div>
          </div>`;
      }
    }

    let legendaryLine = "";
    if (item.legendaryAbility) {
      legendaryLine = `<div style="color:#ff8800;margin-top:6px;font-style:italic;border-left:2px solid #ff880060;padding-left:6px;">${item.legendaryAbility}</div>`;
    }
    let setLine = "";
    if ((item as any).setName) {
      setLine = `<div style="color:#44ff44;margin-top:4px;font-size:12px;">Set: ${(item as any).setName}</div>`;
    }

    const stars = "\u2605".repeat(RARITY_TIER[item.rarity]);

    tooltip.innerHTML = `
      <!-- Ornate border with rarity glow -->
      <div style="position:absolute;inset:-1px;border:2px solid ${rarityColor}60;border-radius:9px;pointer-events:none;
        box-shadow:0 0 12px ${rarityColor}30,inset 0 0 12px ${rarityColor}10;"></div>
      <!-- Corner decorations -->
      <div style="position:absolute;top:2px;left:2px;color:${rarityColor};font-size:7px;opacity:0.6;">&#9670;</div>
      <div style="position:absolute;top:2px;right:2px;color:${rarityColor};font-size:7px;opacity:0.6;">&#9670;</div>
      <div style="position:absolute;bottom:2px;left:2px;color:${rarityColor};font-size:7px;opacity:0.6;">&#9670;</div>
      <div style="position:absolute;bottom:2px;right:2px;color:${rarityColor};font-size:7px;opacity:0.6;">&#9670;</div>
      <!-- Rarity color top bar -->
      <div style="height:4px;background:linear-gradient(90deg,transparent,${rarityColor},transparent);"></div>
      <!-- Content area with subtle rarity gradient background -->
      <div style="padding:14px 16px;background:linear-gradient(180deg, ${RARITY_BG[item.rarity]} 0%, rgba(8,4,2,0) 40%);position:relative;">
        <!-- Item name & rarity header -->
        <div style="border-bottom:1px solid rgba(90,74,42,0.5);padding-bottom:8px;margin-bottom:8px;">
          <div style="color:${rarityColor};font-size:16px;font-weight:bold;text-shadow:0 0 8px ${rarityColor}40;">${item.icon} ${item.name}</div>
          <div style="color:${rarityColor};font-size:11px;margin-top:3px;letter-spacing:1px;">
            <span style="font-size:10px;">${stars}</span> ${rarityName}
          </div>
        </div>
        <!-- Slot/type -->
        <div style="color:#888;font-size:11px;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">${item.slot || item.type}</div>
        <!-- Separator with diamond ornaments -->
        <div style="display:flex;align-items:center;gap:6px;margin:4px 0 6px;">
          <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a60);"></div>
          <span style="color:#5a4a2a;font-size:6px;">&#9670;</span>
          <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a60);"></div>
        </div>
        <!-- Stats -->
        ${statsLines}
        ${comparisonLines}
        ${lanternLines}
        ${legendaryLine}
        ${setLine}
        <!-- Separator with diamond ornaments before description -->
        <div style="display:flex;align-items:center;gap:6px;margin:8px 0 6px;">
          <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a60);"></div>
          <span style="color:#5a4a2a;font-size:6px;">&#9670;</span>
          <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a60);"></div>
        </div>
        <div style="color:#777;font-size:11px;font-style:italic;line-height:1.4;">${item.description}</div>
      </div>
      <!-- Rarity color bottom bar -->
      <div style="height:2px;background:linear-gradient(90deg,transparent,${rarityColor}40,transparent);"></div>
    `;
    tooltip.style.display = "block";
    tooltip.style.left = Math.min(ev.clientX + 16, window.innerWidth - 320) + "px";
    tooltip.style.top = Math.min(ev.clientY + 16, window.innerHeight - 250) + "px";
  }

  private _hideItemTooltip(): void {
    const tooltip = this._menuEl.querySelector("#inv-tooltip") as HTMLDivElement;
    if (tooltip) tooltip.style.display = "none";
  }

  // ──────────────────────────────────────────────────────────────
  //  PAUSE MENU
  // ──────────────────────────────────────────────────────────────
  private _showPauseMenu(): void {
    const btnBase =
      "width:280px;padding:14px 0;margin:8px 0;font-size:18px;letter-spacing:3px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;";
    const exitBtn =
      "width:280px;padding:14px 0;margin:8px 0;font-size:18px;letter-spacing:3px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #a44;border-radius:8px;color:#e66;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;";

    const saveBtn =
      "width:280px;padding:14px 0;margin:8px 0;font-size:18px;letter-spacing:3px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #4a4;border-radius:8px;color:#6c6;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;";
    const loadBtn =
      "width:280px;padding:14px 0;margin:8px 0;font-size:18px;letter-spacing:3px;font-weight:bold;" +
      "background:rgba(40,30,15,0.9);border:2px solid #44a;border-radius:8px;color:#68f;" +
      "cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;";

    const loadBtnHtml = this._hasSave()
      ? `<button id="diablo-load-btn" style="${loadBtn}">LOAD GAME</button>`
      : "";

    this._menuEl.innerHTML = `
      <style>
        @keyframes pause-candle {
          0%, 100% { opacity:0.7; text-shadow: 0 0 6px #ff8800, 0 -3px 8px #ff6600; }
          33% { opacity:1; text-shadow: 0 0 10px #ffaa00, 0 -5px 12px #ff8800; }
          66% { opacity:0.85; text-shadow: 0 0 8px #ff6600, 0 -4px 10px #ff4400; }
        }
        @keyframes pause-glow-spread {
          0% { box-shadow: 0 0 0px rgba(200,168,78,0); }
          100% { box-shadow: 0 0 20px rgba(200,168,78,0.4); }
        }
      </style>
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;position:relative;
      ">
        <!-- Decorative stone frame around button column -->
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;
          padding:30px 60px 24px;border:2px solid #5a4a2a;border-radius:8px;
          background:rgba(10,8,4,0.6);
          box-shadow:inset 0 0 40px rgba(0,0,0,0.4),0 0 2px #3a2a1a;">
          <!-- Inner border -->
          <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-radius:6px;pointer-events:none;"></div>

          <!-- Vertical chain decorations -->
          <div style="position:absolute;left:-20px;top:40px;bottom:40px;width:12px;display:flex;flex-direction:column;align-items:center;gap:2px;overflow:hidden;">
            ${Array.from({length:20}).map(() => '<div style="width:8px;height:12px;border:2px solid #5a4a2a;border-radius:3px;"></div>').join("")}
          </div>
          <div style="position:absolute;right:-20px;top:40px;bottom:40px;width:12px;display:flex;flex-direction:column;align-items:center;gap:2px;overflow:hidden;">
            ${Array.from({length:20}).map(() => '<div style="width:8px;height:12px;border:2px solid #5a4a2a;border-radius:3px;"></div>').join("")}
          </div>

          <!-- Flickering candles on sides -->
          <div style="position:absolute;left:-36px;top:20px;font-size:20px;animation:pause-candle 0.8s ease-in-out infinite;">&#x1F56F;</div>
          <div style="position:absolute;right:-36px;top:20px;font-size:20px;animation:pause-candle 0.8s ease-in-out infinite 0.4s;">&#x1F56F;</div>

          <!-- Skull decoration above title -->
          <div style="font-size:28px;margin-bottom:4px;filter:drop-shadow(0 0 6px rgba(200,168,78,0.3));">&#9760;</div>

          <h1 style="color:#c8a84e;font-size:48px;letter-spacing:6px;margin-bottom:6px;
            font-family:'Georgia',serif;text-shadow:0 0 20px rgba(200,168,78,0.4);">PAUSED</h1>

          <!-- Decorative divider under title -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
            <div style="width:60px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
            <span style="color:#5a4a2a;font-size:12px;">&#9884;</span>
            <span style="color:#c8a84e;font-size:8px;">&#9830;</span>
            <span style="color:#5a4a2a;font-size:12px;">&#9884;</span>
            <div style="width:60px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
          </div>

          <button id="diablo-resume-btn" style="${btnBase}">&#9876; RESUME</button>
          <button id="diablo-controls-btn" style="${btnBase}">&#9881; CONTROLS</button>
          <button id="diablo-inventory-btn" style="${btnBase}">&#9878; INVENTORY</button>
          <button id="diablo-character-btn" style="${btnBase}">&#10022; CHARACTER</button>
          <button id="diablo-skilltree-btn" style="${btnBase}">&#10040; SKILL TREE</button>
          <button id="diablo-skillswap-btn" style="${btnBase}">&#8644; SWAP SKILLS</button>
          <button id="diablo-stash-btn" style="${btnBase}">&#9878; STASH</button>
          <button id="diablo-collection-btn" style="${btnBase}">&#10070; COLLECTION</button>
          <button id="diablo-save-btn" style="${saveBtn}">&#10004; SAVE GAME</button>
          ${loadBtnHtml}
          <button id="diablo-charselect-btn" style="${btnBase}">&#9733; CHARACTER SELECT</button>
          <button id="diablo-exit-btn" style="${exitBtn}">&#10008; EXIT</button>
          <div style="margin-top:24px;color:#888;font-size:12px;letter-spacing:1px;
            font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
            text-shadow:0 1px 3px rgba(0,0,0,0.6);">
            Press <span style="color:#c8a84e;">V</span> to toggle First Person view
          </div>
        </div>
      </div>`;

    // Hover effects for standard buttons
    const stdBtns = this._menuEl.querySelectorAll("#diablo-resume-btn,#diablo-controls-btn,#diablo-inventory-btn,#diablo-character-btn,#diablo-skilltree-btn,#diablo-skillswap-btn,#diablo-stash-btn,#diablo-collection-btn,#diablo-charselect-btn") as NodeListOf<HTMLButtonElement>;
    stdBtns.forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        btn.style.borderColor = "#c8a84e";
        btn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
        btn.style.background = "rgba(50,40,20,0.95)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.borderColor = "#5a4a2a";
        btn.style.boxShadow = "none";
        btn.style.background = "rgba(40,30,15,0.9)";
      });
    });

    // Hover for save button
    const saveBtnEl = this._menuEl.querySelector("#diablo-save-btn") as HTMLButtonElement;
    saveBtnEl.addEventListener("mouseenter", () => {
      saveBtnEl.style.borderColor = "#6c6";
      saveBtnEl.style.boxShadow = "0 0 15px rgba(100,200,100,0.3)";
      saveBtnEl.style.background = "rgba(30,50,30,0.95)";
    });
    saveBtnEl.addEventListener("mouseleave", () => {
      saveBtnEl.style.borderColor = "#4a4";
      saveBtnEl.style.boxShadow = "none";
      saveBtnEl.style.background = "rgba(40,30,15,0.9)";
    });

    // Hover for load button
    const loadBtnEl = this._menuEl.querySelector("#diablo-load-btn") as HTMLButtonElement | null;
    if (loadBtnEl) {
      loadBtnEl.addEventListener("mouseenter", () => {
        loadBtnEl.style.borderColor = "#68f";
        loadBtnEl.style.boxShadow = "0 0 15px rgba(100,100,255,0.3)";
        loadBtnEl.style.background = "rgba(30,30,50,0.95)";
      });
      loadBtnEl.addEventListener("mouseleave", () => {
        loadBtnEl.style.borderColor = "#44a";
        loadBtnEl.style.boxShadow = "none";
        loadBtnEl.style.background = "rgba(40,30,15,0.9)";
      });
      loadBtnEl.addEventListener("click", () => {
        this._loadGame();
      });
    }

    // Hover effects for exit button
    const exitBtnEl = this._menuEl.querySelector("#diablo-exit-btn") as HTMLButtonElement;
    exitBtnEl.addEventListener("mouseenter", () => {
      exitBtnEl.style.borderColor = "#e44";
      exitBtnEl.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      exitBtnEl.style.background = "rgba(50,40,20,0.95)";
    });
    exitBtnEl.addEventListener("mouseleave", () => {
      exitBtnEl.style.borderColor = "#a44";
      exitBtnEl.style.boxShadow = "none";
      exitBtnEl.style.background = "rgba(40,30,15,0.9)";
    });

    this._menuEl.querySelector("#diablo-resume-btn")!.addEventListener("click", () => {
      this._state.phase = DiabloPhase.PLAYING;
      this._menuEl.innerHTML = "";
    });
    this._menuEl.querySelector("#diablo-controls-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._showControls();
    });
    this._menuEl.querySelector("#diablo-inventory-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._showInventory();
    });
    this._menuEl.querySelector("#diablo-character-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._showCharacterOverview();
    });
    this._menuEl.querySelector("#diablo-skilltree-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._state.phase = DiabloPhase.INVENTORY;
      this._showSkillTreeScreen();
    });
    this._menuEl.querySelector("#diablo-skillswap-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._state.phase = DiabloPhase.INVENTORY;
      this._showSkillSwapMenu();
    });
    this._menuEl.querySelector("#diablo-stash-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._showStash();
    });
    this._menuEl.querySelector("#diablo-collection-btn")!.addEventListener("click", () => {
      this._phaseBeforeOverlay = DiabloPhase.PAUSED;
      this._state.phase = DiabloPhase.INVENTORY;
      this._showCollection();
    });
    this._menuEl.querySelector("#diablo-charselect-btn")!.addEventListener("click", () => {
      this._state.phase = DiabloPhase.CLASS_SELECT;
      this._showClassSelect();
    });
    this._menuEl.querySelector("#diablo-save-btn")!.addEventListener("click", () => {
      this._saveGame();
    });
    this._menuEl.querySelector("#diablo-exit-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  CONTROLS SCREEN
  // ──────────────────────────────────────────────────────────────
  private _backToMenu(): void {
    if (this._phaseBeforeOverlay === DiabloPhase.CLASS_SELECT) {
      this._state.phase = DiabloPhase.CLASS_SELECT;
      this._showClassSelect();
    } else {
      this._showPauseMenu();
    }
  }

  private _closeOverlay(): void {
    if (this._phaseBeforeOverlay === DiabloPhase.CLASS_SELECT) {
      this._state.phase = DiabloPhase.CLASS_SELECT;
      this._showClassSelect();
    } else {
      this._state.phase = DiabloPhase.PLAYING;
      this._menuEl.innerHTML = "";
      if (this._firstPerson) {
        this._renderer.canvas.requestPointerLock();
      }
    }
  }

  private _showControls(): void {
    const p = this._state.player;

    const keyCap = (key: string): string =>
      `<span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:2px 10px;font-family:monospace;min-width:40px;text-align:center;color:#fff;">${key}</span>`;

    const row = (key: string, desc: string): string =>
      `<div style="display:flex;align-items:center;gap:15px;margin:6px 0;">${keyCap(key)}<span style="color:#ccc;">${desc}</span></div>`;

    const sectionHeader = (title: string): string =>
      `<div style="font-size:20px;color:#c8a84e;border-bottom:1px solid #5a4a2a;padding-bottom:4px;margin-bottom:10px;margin-top:20px;font-weight:bold;">${title}</div>`;

    // Build skills section
    let skillsHtml = "";
    for (let i = 0; i < p.skills.length; i++) {
      const def = SKILL_DEFS[p.skills[i]];
      if (!def) continue;
      skillsHtml += `<div style="display:flex;align-items:center;gap:15px;margin:6px 0;">
        ${keyCap(String(i + 1))}
        <span style="font-size:18px;">${def.icon}</span>
        <span style="color:#c8a84e;font-weight:bold;">${def.name}</span>
        <span style="color:#999;font-size:13px;"> — ${def.description}</span>
      </div>`;
    }

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <div style="
          max-width:700px;width:90%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:30px 40px;max-height:85vh;overflow-y:auto;
        ">
          <h1 style="color:#c8a84e;font-size:36px;letter-spacing:4px;margin:0 0 20px 0;text-align:center;
            font-family:'Georgia',serif;text-shadow:0 0 15px rgba(200,168,78,0.4);">CONTROLS</h1>

          ${sectionHeader("MOVEMENT")}
          ${row("W / \u2191", "Move Forward")}
          ${row("S / \u2193", "Move Backward")}
          ${row("A / \u2190", "Move Left")}
          ${row("D / \u2192", "Move Right")}
          ${row("SPACE", "Dodge Roll (brief invulnerability)")}

          ${sectionHeader("COMBAT")}
          ${row("Left Click", "Attack / Select Target")}
          ${row("Right Click", "Block (Warrior/Ranger)")}
          ${row("1-6", "Activate Skills")}

          ${sectionHeader("SKILLS")}
          ${skillsHtml}

          ${sectionHeader("POTIONS")}
          ${row("Q", "Quick-use Health Potion")}
          ${row("E", "Quick-use Mana Potion (outside Camelot)")}
          ${row("F1-F4", "Use Potion from Quick Slots")}

          ${sectionHeader("INTERACTION")}
          ${row("F", "Open nearby Chest")}
          ${row("E", "Interact (Vendors / Crafting in Camelot)")}

          ${sectionHeader("INTERFACE")}
          ${row("I", "Open Inventory")}
          ${row("T", "Open Talent Tree")}
          ${row("K", "Swap Skills Menu")}
          ${row("J", "Quest Journal")}
          ${row("G", "Pet Management")}
          ${row("B", "Advanced Crafting")}
          ${row("L / P", "Toggle Lantern")}
          ${row("M", "Toggle Fullscreen Map")}
          ${row("ESC", "Pause Menu")}

          <div style="text-align:center;margin-top:30px;">
            <button id="diablo-controls-back" style="
              width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            ">BACK</button>
          </div>
        </div>
      </div>`;

    const backBtn = this._menuEl.querySelector("#diablo-controls-back") as HTMLButtonElement;
    backBtn.addEventListener("mouseenter", () => {
      backBtn.style.borderColor = "#c8a84e";
      backBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      backBtn.style.background = "rgba(50,40,20,0.95)";
    });
    backBtn.addEventListener("mouseleave", () => {
      backBtn.style.borderColor = "#5a4a2a";
      backBtn.style.boxShadow = "none";
      backBtn.style.background = "rgba(40,30,15,0.9)";
    });
    backBtn.addEventListener("click", () => {
      this._backToMenu();
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  COLLECTION / CODEX MENU
  // ──────────────────────────────────────────────────────────────
  private _showCollection(): void {
    // Inject styles once
    if (!document.getElementById("codex-menu-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "codex-menu-styles";
      styleEl.textContent = `
        .diablo-menu-scroll::-webkit-scrollbar { width: 8px; }
        .diablo-menu-scroll::-webkit-scrollbar-track { background: rgba(10,8,4,0.6); border-radius: 4px; }
        .diablo-menu-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #5a4a2a, #3a2a1a); border-radius: 4px; border: 1px solid #6b5a3a; }
        .diablo-menu-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #7a6a4a, #5a4a2a); }
        @keyframes codex-panel-enter { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .codex-panel-anim { animation: codex-panel-enter 0.3s ease-out; }
        @keyframes codex-legendary-shimmer { 0%,100% { background-position: -200% center; } 50% { background-position: 200% center; } }
        .codex-item:hover { transform: scale(1.08); filter: brightness(1.2); }
        .codex-item { transition: transform 0.2s, filter 0.2s; cursor: pointer; }
        .codex-map-section:hover { border-color: #7a6a4a; }
        .codex-map-section { transition: border-color 0.3s; }
      `;
      document.head.appendChild(styleEl);
    }

    const p = this._state.player;

    // Build set of all owned item names
    const ownedNames = new Set<string>();
    const eqKeys: (keyof DiabloEquipment)[] = ["helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern"];
    for (const k of eqKeys) {
      const it = p.equipment[k];
      if (it) ownedNames.add(it.name);
    }
    for (const slot of p.inventory) {
      if (slot.item) ownedNames.add(slot.item.name);
    }
    for (const slot of this._state.persistentStash) {
      if (slot.item) ownedNames.add(slot.item.name);
    }
    for (const slot of this._state.persistentInventory) {
      if (slot.item) ownedNames.add(slot.item.name);
    }

    // Build item lookup by name
    const itemByName: Record<string, DiabloItem> = {};
    for (const it of ITEM_DATABASE) {
      itemByName[it.name] = it;
    }

    // Build set bonus lookup by setName
    const setBonusByName: Record<string, { pieces: number; bonusDescription: string }> = {};
    for (const sb of SET_BONUSES) {
      setBonusByName[sb.setName] = { pieces: sb.pieces, bonusDescription: sb.bonusDescription };
    }

    // Totals
    let totalSets = 0;
    let collectedSets = 0;
    let totalUniques = 0;
    let collectedUniques = 0;

    // Build map sections HTML
    let mapSectionsHtml = "";
    const mapIds = Object.keys(MAP_SPECIFIC_ITEMS);

    for (const mapId of mapIds) {
      const itemNames = MAP_SPECIFIC_ITEMS[mapId];
      const mapCfg = MAP_CONFIGS[mapId as DiabloMapId];
      const mapDisplayName = mapCfg ? mapCfg.name : mapId;

      // Separate set items and unique items
      const setItems: DiabloItem[] = [];
      const uniqueItems: DiabloItem[] = [];
      let setName = "";

      for (const name of itemNames) {
        const it = itemByName[name];
        if (!it) continue;
        if (it.setName) {
          setItems.push(it);
          if (!setName) setName = it.setName;
        } else if (it.rarity === ItemRarity.LEGENDARY || it.legendaryAbility) {
          uniqueItems.push(it);
        }
      }

      // Level range from items
      const allItems = [...setItems, ...uniqueItems];
      const levels = allItems.map(i => i.level).filter(l => l > 0);
      const minLevel = levels.length > 0 ? Math.min(...levels) : 0;
      const maxLevel = levels.length > 0 ? Math.max(...levels) : 0;
      const levelStr = minLevel === maxLevel ? `Lv ${minLevel}` : `Lv ${minLevel}-${maxLevel}`;

      // Set progress
      const setOwned = setItems.filter(i => ownedNames.has(i.name)).length;
      const setTotal = setItems.length;
      if (setTotal > 0) {
        totalSets++;
        if (setOwned >= setTotal) collectedSets++;
      }

      // Unique progress
      for (const ui of uniqueItems) {
        totalUniques++;
        if (ownedNames.has(ui.name)) collectedUniques++;
      }

      // Set bonus info
      const bonus = setName ? setBonusByName[setName] : null;
      const setProgressPct = setTotal > 0 ? Math.round((setOwned / setTotal) * 100) : 0;

      // Build set items row
      let setItemsHtml = "";
      for (const it of setItems) {
        const owned = ownedNames.has(it.name);
        const color = RARITY_CSS[it.rarity];
        const glow = owned ? `box-shadow: 0 0 10px ${color}, 0 0 4px ${color} inset;` : "";
        const overlay = owned ? "" : `
          <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);border-radius:6px;
            display:flex;align-items:center;justify-content:center;font-size:24px;color:#555;">?</div>`;
        const filter = owned ? "" : "filter: grayscale(0.8) brightness(0.5);";
        setItemsHtml += `
          <div class="codex-item codex-set-item" data-item-name="${it.name}" style="
            position:relative;width:62px;height:62px;background:rgba(15,10,5,0.9);
            border:2px solid ${owned ? color : '#3a3a3a'};border-radius:6px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            ${glow}${filter}
          ">
            <div style="font-size:24px;">${it.icon}</div>
            <div style="font-size:8px;color:${owned ? color : '#666'};margin-top:2px;
              text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
              max-width:56px;">${it.name.split(/\s/).slice(-1)[0]}</div>
            ${overlay}
          </div>`;
      }

      // Build unique items
      let uniqueItemsHtml = "";
      for (const it of uniqueItems) {
        const owned = ownedNames.has(it.name);
        const color = RARITY_CSS[it.rarity];
        const glow = owned ? `box-shadow: 0 0 14px ${color}, 0 0 6px ${color} inset, 0 0 20px rgba(255,136,0,0.2);` : "";
        const overlay = owned ? "" : `
          <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);border-radius:6px;
            display:flex;align-items:center;justify-content:center;font-size:24px;color:#555;">?</div>`;
        const filter = owned ? "" : "filter: grayscale(0.8) brightness(0.5);";
        const legendaryBorder = owned ? `border-image: linear-gradient(135deg, #ffd700, #ff8800, #ffd700) 1;` : "";
        uniqueItemsHtml += `
          <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
            <div class="codex-item codex-unique-item" data-item-name="${it.name}" style="
              position:relative;width:62px;height:62px;min-width:62px;
              background:rgba(15,10,5,0.9);
              border:2px solid ${owned ? '#ffd700' : '#3a3a3a'};border-radius:6px;
              display:flex;flex-direction:column;align-items:center;justify-content:center;
              ${glow}${filter}${legendaryBorder}
            ">
              <div style="font-size:24px;">${it.icon}</div>
              ${overlay}
            </div>
            <div style="flex:1;">
              <div style="color:${owned ? color : '#555'};font-size:13px;font-weight:bold;
                font-family:'Cinzel','Georgia',serif;">${owned ? it.name : '???'}</div>
              ${it.legendaryAbility && owned ? `
                <div style="color:#ff8800;font-size:11px;font-style:italic;margin-top:2px;
                  border-left:2px solid rgba(255,136,0,0.4);padding-left:6px;
                  background:linear-gradient(90deg,rgba(255,136,0,0.06),transparent);
                ">${it.legendaryAbility}</div>` : (it.legendaryAbility ? `
                <div style="color:#555;font-size:11px;font-style:italic;margin-top:2px;">
                  Legendary power unknown...</div>` : "")}
            </div>
          </div>`;
      }

      // Set bonus callout
      let setBonusHtml = "";
      if (bonus && setName) {
        const bonusActive = setOwned >= (bonus.pieces || setTotal);
        setBonusHtml = `
          <div style="margin-top:8px;padding:8px 10px;
            background:${bonusActive ? 'rgba(68,255,68,0.08)' : 'rgba(30,24,14,0.6)'};
            border:1px solid ${bonusActive ? 'rgba(68,255,68,0.3)' : 'rgba(90,74,42,0.2)'};
            border-radius:4px;">
            <div style="font-size:11px;color:${bonusActive ? '#44ff44' : '#666'};">
              <span style="color:${bonusActive ? '#6f6' : '#888'};">&#9830; Set Bonus (${bonus.pieces || setTotal}pc):</span>
              ${bonus.bonusDescription}
            </div>
          </div>`;
      }

      mapSectionsHtml += `
        <div class="codex-map-section" style="
          background:linear-gradient(135deg,rgba(22,16,8,0.95),rgba(30,22,12,0.9));
          border:1px solid rgba(90,74,42,0.3);border-radius:8px;padding:16px;margin-bottom:12px;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div>
              <span style="color:#c8a84e;font-size:15px;font-weight:bold;
                font-family:'Cinzel','Georgia',serif;letter-spacing:1px;">
                &#10070; ${mapDisplayName}
              </span>
              <span style="color:#888;font-size:11px;margin-left:8px;">${levelStr}</span>
            </div>
            <div style="color:#888;font-size:11px;">Drop Location</div>
          </div>

          ${setItems.length > 0 ? `
            <div style="margin-bottom:6px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="color:#44ff44;font-size:12px;font-family:'Cinzel','Georgia',serif;">
                  ${setName}</span>
                <span style="color:#888;font-size:11px;">${setOwned}/${setTotal} pieces</span>
                <div style="flex:1;height:4px;background:rgba(30,24,14,0.8);border-radius:2px;
                  max-width:120px;overflow:hidden;">
                  <div style="width:${setProgressPct}%;height:100%;
                    background:linear-gradient(90deg,#44ff44,#88ff88);border-radius:2px;
                    transition:width 0.3s;"></div>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${setItemsHtml}
              </div>
            </div>
            ${setBonusHtml}
          ` : ""}

          ${uniqueItems.length > 0 ? `
            <div style="margin-top:${setItems.length > 0 ? '12' : '0'}px;
              border-top:${setItems.length > 0 ? '1px solid rgba(90,74,42,0.2)' : 'none'};
              padding-top:${setItems.length > 0 ? '10' : '0'}px;">
              <div style="color:#ff8800;font-size:11px;margin-bottom:4px;letter-spacing:1px;">
                &#10022; LEGENDARY</div>
              ${uniqueItemsHtml}
            </div>
          ` : ""}
        </div>`;
    }

    // Summary counts
    const totalSetPieces = Object.values(MAP_SPECIFIC_ITEMS).reduce((sum, names) => {
      return sum + names.filter(n => { const it = itemByName[n]; return it && !!it.setName; }).length;
    }, 0);
    const ownedSetPieces = Object.values(MAP_SPECIFIC_ITEMS).reduce((sum, names) => {
      return sum + names.filter(n => { const it = itemByName[n]; return it && !!it.setName && ownedNames.has(n); }).length;
    }, 0);

    this._menuEl.innerHTML = `
      <div style="
        position:absolute;inset:0;background:rgba(0,0,0,0.85);display:flex;
        align-items:center;justify-content:center;z-index:100;pointer-events:auto;
      ">
        <div class="codex-panel-anim" style="
          width:min(820px,92vw);max-height:88vh;overflow-y:auto;
          background:rgba(18,12,6,0.97);border:2px solid #c8a84e;border-radius:12px;
          padding:28px 32px;position:relative;
          box-shadow:0 0 40px rgba(200,168,78,0.15), 0 0 80px rgba(0,0,0,0.6);
          font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
          color:#ddd;
        " class="diablo-menu-scroll">

          <!-- Corner flourishes -->
          <div style="position:absolute;top:6px;left:10px;color:rgba(200,168,78,0.25);
            font-size:18px;pointer-events:none;">&#9884;</div>
          <div style="position:absolute;top:6px;right:10px;color:rgba(200,168,78,0.25);
            font-size:18px;pointer-events:none;">&#9884;</div>
          <div style="position:absolute;bottom:6px;left:10px;color:rgba(200,168,78,0.25);
            font-size:18px;pointer-events:none;">&#9884;</div>
          <div style="position:absolute;bottom:6px;right:10px;color:rgba(200,168,78,0.25);
            font-size:18px;pointer-events:none;">&#9884;</div>

          <!-- Title -->
          <div style="text-align:center;margin-bottom:20px;">
            <div style="color:rgba(200,168,78,0.4);font-size:12px;letter-spacing:4px;">
              ${'═'.repeat(20)}</div>
            <h2 style="color:#c8a84e;font-size:28px;letter-spacing:6px;margin:8px 0;
              text-shadow:0 0 20px rgba(200,168,78,0.3);
              font-family:'Cinzel','Georgia',serif;">
              &#10070; COLLECTION CODEX &#10070;</h2>
            <div style="color:rgba(200,168,78,0.4);font-size:12px;letter-spacing:4px;">
              ${'═'.repeat(20)}</div>
          </div>

          <!-- Summary bar -->
          <div style="display:flex;justify-content:center;gap:32px;margin-bottom:20px;
            padding:10px 16px;background:rgba(30,24,14,0.6);border:1px solid rgba(90,74,42,0.3);
            border-radius:6px;">
            <div style="text-align:center;">
              <div style="color:#44ff44;font-size:18px;font-weight:bold;">
                ${collectedSets}/${totalSets}</div>
              <div style="color:#888;font-size:10px;letter-spacing:1px;">SETS COMPLETE</div>
            </div>
            <div style="width:1px;background:rgba(90,74,42,0.3);"></div>
            <div style="text-align:center;">
              <div style="color:#44ff44;font-size:18px;font-weight:bold;">
                ${ownedSetPieces}/${totalSetPieces}</div>
              <div style="color:#888;font-size:10px;letter-spacing:1px;">SET PIECES</div>
            </div>
            <div style="width:1px;background:rgba(90,74,42,0.3);"></div>
            <div style="text-align:center;">
              <div style="color:#ff8800;font-size:18px;font-weight:bold;">
                ${collectedUniques}/${totalUniques}</div>
              <div style="color:#888;font-size:10px;letter-spacing:1px;">LEGENDARIES</div>
            </div>
          </div>

          <!-- Map sections -->
          ${mapSectionsHtml}

          <!-- Close button -->
          <div style="text-align:center;margin-top:20px;">
            <button id="codex-close-btn" style="
              width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;
              color:#c8a84e;cursor:pointer;transition:all 0.2s;
              font-family:'Georgia',serif;pointer-events:auto;
            ">CLOSE</button>
          </div>

          <div style="text-align:center;margin-top:12px;color:#555;font-size:10px;
            letter-spacing:1px;">Press <span style="color:#c8a84e;">N</span> or
            <span style="color:#c8a84e;">ESC</span> to close</div>

        </div>
        <div id="inv-tooltip" style="
          position:fixed;display:none;pointer-events:none;z-index:200;
          background:rgba(12,8,4,0.97);border:2px solid #5a4a2a;border-radius:8px;
          padding:12px;max-width:280px;min-width:180px;
          box-shadow:0 4px 20px rgba(0,0,0,0.8);
          font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
        "></div>
      </div>`;

    // Wire close button
    const closeBtn = this._menuEl.querySelector("#codex-close-btn") as HTMLButtonElement;
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.borderColor = "#c8a84e";
      closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      closeBtn.style.background = "rgba(50,40,20,0.95)";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.borderColor = "#5a4a2a";
      closeBtn.style.boxShadow = "none";
      closeBtn.style.background = "rgba(40,30,15,0.9)";
    });
    closeBtn.addEventListener("click", () => {
      this._closeOverlay();
    });

    // Wire item tooltips
    const codexItems = this._menuEl.querySelectorAll(".codex-item[data-item-name]");
    codexItems.forEach((el) => {
      const name = el.getAttribute("data-item-name") || "";
      const it = itemByName[name];
      if (it && ownedNames.has(name)) {
        el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev as MouseEvent, it));
        el.addEventListener("mouseleave", () => this._hideItemTooltip());
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  SKILL SWAP MENU
  // ──────────────────────────────────────────────────────────────
  private _showSkillSwapMenu(): void {
    const p = this._state.player;
    const allAvailable = [...p.skills, ...p.unlockedSkills.filter(s => !p.skills.includes(s))];
    let selectedSlot = -1;

    const render = () => {
      // Build active skill slots
      let activeHtml = "";
      for (let i = 0; i < 6; i++) {
        const skillId = p.skills[i];
        const def = skillId ? SKILL_DEFS[skillId] : null;
        const isSelected = selectedSlot === i;
        activeHtml += `<div class="swap-active-slot" data-slot="${i}" style="
          width:80px;height:80px;background:rgba(15,10,5,0.9);border:2px solid ${isSelected ? '#ffd700' : '#5a4a2a'};
          border-radius:8px;display:flex;flex-direction:column;align-items:center;
          justify-content:center;cursor:pointer;transition:all 0.2s;position:relative;
          ${isSelected ? 'box-shadow:0 0 15px rgba(255,215,0,0.4);' : ''}
        ">
          <div style="font-size:28px;">${def ? def.icon : '—'}</div>
          <div style="font-size:10px;color:#c8a84e;margin-top:4px;">${def ? def.name : 'Empty'}</div>
          <div style="position:absolute;top:2px;left:6px;font-size:10px;color:#888;">${i + 1}</div>
        </div>`;
      }

      // Build available skills pool
      let poolHtml = "";
      for (const skillId of allAvailable) {
        const def = SKILL_DEFS[skillId];
        if (!def) continue;
        const isEquipped = p.skills.includes(skillId);
        const unlockEntry = UNLOCKABLE_SKILLS[p.class].find(e => e.skillId === skillId);
        const levelLabel = unlockEntry ? `Lv.${unlockEntry.level}` : "Base";
        poolHtml += `<div class="swap-pool-skill" data-skill="${skillId}" style="
          width:100%;padding:8px 12px;background:rgba(15,10,5,${isEquipped ? '0.6' : '0.9'});
          border:1px solid ${isEquipped ? '#5a5a2a' : '#5a4a2a'};border-radius:6px;
          display:flex;align-items:center;gap:10px;cursor:pointer;transition:all 0.2s;
          ${isEquipped ? 'opacity:0.6;' : ''}
        ">
          <div style="font-size:24px;">${def.icon}</div>
          <div style="flex:1;">
            <div style="color:#c8a84e;font-weight:bold;font-size:14px;">${def.name}
              <span style="color:#888;font-weight:normal;font-size:11px;margin-left:6px;">[${levelLabel}]</span>
              ${isEquipped ? '<span style="color:#5a5;font-size:11px;margin-left:6px;">EQUIPPED</span>' : ''}
            </div>
            <div style="color:#999;font-size:12px;">${def.description}</div>
            <div style="color:#666;font-size:11px;margin-top:2px;">
              CD: ${def.cooldown}s · Mana: ${def.manaCost} · DMG: ${def.damageMultiplier}x
            </div>
          </div>
        </div>`;
      }

      // No unlocked skills message
      if (p.unlockedSkills.length === 0) {
        poolHtml += `<div style="color:#888;text-align:center;padding:20px;font-style:italic;">
          No bonus skills unlocked yet. New skills unlock every 3 levels.
        </div>`;
      }

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:600px;width:90%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
            border-radius:12px;padding:30px;max-height:85vh;overflow-y:auto;
          ">
            <h1 style="color:#c8a84e;font-size:32px;letter-spacing:4px;margin:0 0 8px 0;text-align:center;
              font-family:'Georgia',serif;text-shadow:0 0 15px rgba(200,168,78,0.4);">SWAP SKILLS</h1>
            <p style="color:#888;font-size:13px;text-align:center;margin:0 0 20px 0;">
              Click a slot, then click a skill to assign it. Press [K] to close.
            </p>

            <div style="margin-bottom:20px;">
              <div style="color:#c8a84e;font-size:14px;margin-bottom:8px;letter-spacing:2px;">ACTIVE SKILLS</div>
              <div style="display:flex;gap:6px;justify-content:center;">${activeHtml}</div>
            </div>

            <div>
              <div style="color:#c8a84e;font-size:14px;margin-bottom:8px;letter-spacing:2px;">AVAILABLE SKILLS</div>
              <div style="display:flex;flex-direction:column;gap:4px;">${poolHtml}</div>
            </div>

            <div style="text-align:center;margin-top:20px;">
              <button id="diablo-swapskill-back" style="
                width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              ">BACK</button>
            </div>
          </div>
        </div>`;

      // Wire active slot clicks
      const slotEls = this._menuEl.querySelectorAll(".swap-active-slot") as NodeListOf<HTMLDivElement>;
      slotEls.forEach(el => {
        el.addEventListener("mouseenter", () => {
          if (selectedSlot !== parseInt(el.getAttribute("data-slot")!)) {
            el.style.borderColor = "#c8a84e";
            el.style.boxShadow = "0 0 10px rgba(200,168,78,0.2)";
          }
        });
        el.addEventListener("mouseleave", () => {
          if (selectedSlot !== parseInt(el.getAttribute("data-slot")!)) {
            el.style.borderColor = "#5a4a2a";
            el.style.boxShadow = "none";
          }
        });
        el.addEventListener("click", () => {
          selectedSlot = parseInt(el.getAttribute("data-slot")!);
          render();
        });
      });

      // Wire pool skill clicks
      const poolEls = this._menuEl.querySelectorAll(".swap-pool-skill") as NodeListOf<HTMLDivElement>;
      poolEls.forEach(el => {
        el.addEventListener("mouseenter", () => {
          el.style.borderColor = "#c8a84e";
          el.style.background = "rgba(30,20,10,0.9)";
        });
        el.addEventListener("mouseleave", () => {
          const sid = el.getAttribute("data-skill") as SkillId;
          const equipped = p.skills.includes(sid);
          el.style.borderColor = equipped ? "#5a5a2a" : "#5a4a2a";
          el.style.background = `rgba(15,10,5,${equipped ? '0.6' : '0.9'})`;
        });
        el.addEventListener("click", () => {
          if (selectedSlot < 0) {
            // Auto-select first slot
            selectedSlot = 0;
            render();
            return;
          }
          const newSkillId = el.getAttribute("data-skill") as SkillId;
          // Check if this skill is already in another slot
          const existingIdx = p.skills.indexOf(newSkillId);
          if (existingIdx >= 0 && existingIdx !== selectedSlot) {
            // Swap: put the old skill from selectedSlot into existingIdx
            const oldSkill = p.skills[selectedSlot];
            p.skills[existingIdx] = oldSkill;
          }
          p.skills[selectedSlot] = newSkillId;
          selectedSlot = -1;
          render();
        });
      });

      // Back button
      const backBtn = this._menuEl.querySelector("#diablo-swapskill-back") as HTMLButtonElement;
      backBtn.addEventListener("mouseenter", () => {
        backBtn.style.borderColor = "#c8a84e";
        backBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
        backBtn.style.background = "rgba(50,40,20,0.95)";
      });
      backBtn.addEventListener("mouseleave", () => {
        backBtn.style.borderColor = "#5a4a2a";
        backBtn.style.boxShadow = "none";
        backBtn.style.background = "rgba(40,30,15,0.9)";
      });
      backBtn.addEventListener("click", () => {
        this._backToMenu();
      });
    };

    render();
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Open nearest chest (F key)
  // ──────────────────────────────────────────────────────────────
  private _openNearestChest(): void {
    const p = this._state.player;
    let nearest: DiabloTreasureChest | null = null;
    let nearestDist = 3;
    for (const chest of this._state.treasureChests) {
      if (chest.opened) continue;
      const d = this._dist(p.x, p.z, chest.x, chest.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = chest;
      }
    }
    if (nearest) {
      this._openChest(nearest.id);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  CHARACTER OVERVIEW SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showCharacterOverview(): void {
    const p = this._state.player;
    const stats = this._getEffectiveStats();

    // Class info
    const classIcons: Record<DiabloClass, string> = {
      [DiabloClass.WARRIOR]: "\u2694\uFE0F",
      [DiabloClass.MAGE]: "\uD83D\uDD2E",
      [DiabloClass.RANGER]: "\uD83C\uDFF9",
      [DiabloClass.PALADIN]: "\u{1F6E1}\uFE0F",
      [DiabloClass.NECROMANCER]: "\uD83D\uDC80",
      [DiabloClass.ASSASSIN]: "\uD83D\uDDE1\uFE0F",
    };
    const classColors: Record<DiabloClass, string> = {
      [DiabloClass.WARRIOR]: "#aab",
      [DiabloClass.MAGE]: "#a4f",
      [DiabloClass.RANGER]: "#4c4",
      [DiabloClass.PALADIN]: "#ffd700",
      [DiabloClass.NECROMANCER]: "#8f8",
      [DiabloClass.ASSASSIN]: "#c44",
    };
    const classIcon = classIcons[p.class] || "\u2694\uFE0F";
    const className = p.class.charAt(0).toUpperCase() + p.class.slice(1).toLowerCase();
    const classColor = classColors[p.class] || "#ccc";

    // XP bar
    const xpPct = p.xpToNext > 0 ? Math.min(100, (p.xp / p.xpToNext) * 100) : 100;
    const xpToGo = Math.max(0, p.xpToNext - p.xp);

    // Stat color coding: high=green, medium=yellow, low=red
    const baseMaxStats: Record<DiabloClass, { str: number; dex: number; int: number; vit: number }> = {
      [DiabloClass.WARRIOR]: { str: 25, dex: 8, int: 5, vit: 22 },
      [DiabloClass.MAGE]: { str: 5, dex: 8, int: 28, vit: 14 },
      [DiabloClass.RANGER]: { str: 8, dex: 26, int: 7, vit: 16 },
      [DiabloClass.PALADIN]: { str: 20, dex: 8, int: 15, vit: 24 },
      [DiabloClass.NECROMANCER]: { str: 6, dex: 10, int: 25, vit: 16 },
      [DiabloClass.ASSASSIN]: { str: 14, dex: 28, int: 6, vit: 15 },
    };
    const baseCls = baseMaxStats[p.class];
    const maxForLevel = (base: number) => base + (p.level - 1) * 3 + 30; // generous ceiling
    const statColor = (val: number, base: number): string => {
      const max = maxForLevel(base);
      const ratio = val / max;
      if (ratio > 0.7) return "#4f4";
      if (ratio > 0.4) return "#ff4";
      return "#f44";
    };

    // Resists from equipment
    let fireResist = 0, iceResist = 0, lightningResist = 0, poisonResist = 0;
    let lifeSteal = 0, manaRegen = 0;
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (!item) continue;
      const s = item.stats as any;
      if (s.fireResist) fireResist += s.fireResist;
      if (s.iceResist) iceResist += s.iceResist;
      if (s.lightningResist) lightningResist += s.lightningResist;
      if (s.poisonResist) poisonResist += s.poisonResist;
      if (s.lifeSteal) lifeSteal += s.lifeSteal;
      if (s.manaRegen) manaRegen += s.manaRegen;
    }
    const charTalentBonuses = this._getTalentBonuses();
    const allResistBonus = charTalentBonuses[TalentEffectType.RESISTANCE_ALL] || 0;
    fireResist += allResistBonus;
    iceResist += allResistBonus;
    lightningResist += allResistBonus;
    poisonResist += allResistBonus;

    // Section header helper
    const sectionHeader = (title: string): string =>
      `<div style="font-size:20px;color:#c8a84e;border-bottom:1px solid #5a4a2a;padding-bottom:4px;margin-bottom:10px;margin-top:24px;font-weight:bold;">${title}</div>`;

    // Section 1: Class & Level
    const sec1 = `
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:48px;">${classIcon}</div>
        <div style="font-size:28px;color:${classColor};font-weight:bold;letter-spacing:2px;margin:4px 0;">${className.toUpperCase()}</div>
        <div style="font-size:18px;color:#ccc;">Level ${p.level}</div>
        <div style="font-size:14px;color:#999;margin-top:6px;">${p.xp} / ${p.xpToNext} XP</div>
        <div style="width:300px;height:12px;background:rgba(30,25,15,0.9);border:1px solid #5a4a2a;border-radius:6px;margin:6px auto 0;overflow:hidden;">
          <div style="width:${xpPct}%;height:100%;background:linear-gradient(90deg,#c8a84e,#ffd700);border-radius:5px;"></div>
        </div>
        <div style="font-size:12px;color:#888;margin-top:4px;">${xpToGo} XP to next level</div>
      </div>`;

    // Section 2: Base Stats (2x grid)
    const tt = (tip: string) => `cursor:help;border-bottom:1px dotted #666;`;
    const sec2 = `
      ${sectionHeader("BASE STATS")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:14px;">
        <div style="${tt("")}" title="Increases melee damage. Warriors gain 1.5x STR as bonus damage.">STR: <span style="color:${statColor(stats.strength, baseCls.str)};font-weight:bold;">${stats.strength}</span></div>
        <div style="${tt("")}" title="Increases ranged damage and dodge. Rangers gain 1.3x DEX as bonus damage.">DEX: <span style="color:${statColor(stats.dexterity, baseCls.dex)};font-weight:bold;">${stats.dexterity}</span></div>
        <div style="${tt("")}" title="Increases spell damage and max mana (+0.8 per level per point). Mages gain 1.2x INT as bonus damage.">INT: <span style="color:${statColor(stats.intelligence, baseCls.int)};font-weight:bold;">${stats.intelligence}</span></div>
        <div style="${tt("")}" title="Increases max HP (+2 per level per point). Higher vitality means more survivability.">VIT: <span style="color:${statColor(stats.vitality, baseCls.vit)};font-weight:bold;">${stats.vitality}</span></div>
        <div style="color:#aaa;${tt("")}" title="Reduces incoming damage. Damage reduction = armor / (armor + 200).">Armor: <span style="color:#fff;">${stats.armor}</span></div>
        <div style="color:#aaa;${tt("")}" title="Chance for attacks to critically strike, dealing bonus damage.">Crit Chance: <span style="color:#ff8;">${(stats.critChance * 100).toFixed(1)}%</span></div>
        <div style="color:#aaa;${tt("")}" title="Bonus damage multiplier when a critical hit occurs.">Crit Damage: <span style="color:#ff8;">${(stats.critDamage * 100).toFixed(0)}%</span></div>
        <div style="color:#aaa;${tt("")}" title="How fast your character moves across the map.">Move Speed: <span style="color:#fff;">${stats.moveSpeed.toFixed(1)}</span></div>
        <div style="color:#aaa;${tt("")}" title="Number of attacks per second. Higher means faster combat.">Attack Speed: <span style="color:#fff;">${stats.attackSpeed.toFixed(2)}</span></div>
      </div>`;

    // Section 3: Defensive Stats
    const sec3 = `
      ${sectionHeader("DEFENSIVE STATS")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:14px;">
        <div style="color:#e44;${tt("")}" title="Hit Points. When HP reaches 0 you die. Increased by Vitality.">HP: <span style="color:#fff;">${Math.floor(p.hp)} / ${p.maxHp}</span></div>
        <div style="color:#48f;${tt("")}" title="Mana pool for casting skills. Increased by Intelligence. Regenerates over time.">Mana: <span style="color:#fff;">${Math.floor(p.mana)} / ${p.maxMana}</span></div>
        <div style="color:#f84;${tt("")}" title="Reduces fire damage taken. Reduction = resist / (resist + 100).">Fire Resist: <span style="color:#fff;">${fireResist}</span> <span style="color:#888;font-size:11px;">(${(fireResist / (fireResist + 100) * 100).toFixed(1)}% red.)</span></div>
        <div style="color:#8df;${tt("")}" title="Reduces ice damage taken. Reduction = resist / (resist + 100).">Ice Resist: <span style="color:#fff;">${iceResist}</span> <span style="color:#888;font-size:11px;">(${(iceResist / (iceResist + 100) * 100).toFixed(1)}% red.)</span></div>
        <div style="color:#ff4;${tt("")}" title="Reduces lightning damage taken. Reduction = resist / (resist + 100).">Lightning Resist: <span style="color:#fff;">${lightningResist}</span> <span style="color:#888;font-size:11px;">(${(lightningResist / (lightningResist + 100) * 100).toFixed(1)}% red.)</span></div>
        <div style="color:#4f4;${tt("")}" title="Reduces poison damage taken. Reduction = resist / (resist + 100).">Poison Resist: <span style="color:#fff;">${poisonResist}</span> <span style="color:#888;font-size:11px;">(${(poisonResist / (poisonResist + 100) * 100).toFixed(1)}% red.)</span></div>
        <div style="color:#f88;${tt("")}" title="Percentage of damage dealt that is recovered as HP.">Life Steal: <span style="color:#fff;">${lifeSteal}%</span></div>
        <div style="color:#8af;${tt("")}" title="Mana recovered per second passively.">Mana Regen: <span style="color:#fff;">${manaRegen}</span></div>
      </div>`;

    // Section 4: Skill Details
    const weaponDmg = this._getWeaponDamage();
    let skillCardsHtml = "";
    for (let i = 0; i < p.skills.length; i++) {
      const def = SKILL_DEFS[p.skills[i]];
      if (!def) continue;

      // Compute base damage matching _getSkillDamage logic
      let primaryStat = 0;
      switch (p.class) {
        case DiabloClass.WARRIOR: primaryStat = p.strength * 1.5; break;
        case DiabloClass.MAGE: primaryStat = p.intelligence * 1.2; break;
        case DiabloClass.RANGER: primaryStat = p.dexterity * 1.3; break;
      }
      let bonusDmg = 0;
      for (const key of equipKeys) {
        const item = p.equipment[key];
        if (item) {
          const s = item.stats as any;
          if (s.bonusDamage) bonusDmg += s.bonusDamage;
        }
      }
      const baseDamage = (primaryStat + weaponDmg + bonusDmg) * (def.damageMultiplier || 1);
      const effectiveCd = Math.max(def.cooldown, 1 / stats.attackSpeed);
      const dps = def.damageMultiplier > 0
        ? (baseDamage * (1 + stats.critChance * stats.critDamage)) / effectiveCd
        : 0;

      // Status effect display
      let statusHtml = "";
      if (def.statusEffect) {
        const effectIcons: Record<string, string> = {
          BURNING: "\uD83D\uDD25", FROZEN: "\u2744\uFE0F", SHOCKED: "\u26A1",
          POISONED: "\u2620\uFE0F", SLOWED: "\uD83D\uDC22", STUNNED: "\uD83D\uDCAB",
          BLEEDING: "\uD83E\uDE78", WEAKENED: "\uD83D\uDCA7",
        };
        const eIcon = effectIcons[def.statusEffect] || "";
        statusHtml = `<span style="color:#f84;font-size:12px;margin-left:8px;">${eIcon} ${def.statusEffect}</span>`;
      }

      // AOE display
      let aoeHtml = "";
      if (def.aoeRadius) {
        aoeHtml = `<span style="color:#8af;font-size:12px;margin-left:8px;">AOE: ${def.aoeRadius} radius</span>`;
      }

      const keyCap = `<span style="display:inline-block;background:rgba(60,50,30,0.8);border:1px solid #888;border-radius:4px;padding:2px 10px;font-family:monospace;min-width:24px;text-align:center;color:#fff;font-size:14px;">${i + 1}</span>`;

      skillCardsHtml += `
        <div style="
          background:rgba(15,10,5,0.9);border-left:4px solid ${classColor};
          border-radius:6px;padding:12px;margin-bottom:8px;
        ">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            ${keyCap}
            <span style="font-size:22px;">${def.icon}</span>
            <span style="color:#c8a84e;font-weight:bold;font-size:16px;">${def.name}</span>
          </div>
          <div style="color:#aaa;font-size:13px;margin-bottom:6px;">${def.description}</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#999;">
            <span>\u23F0 ${def.cooldown}sec</span>
            <span style="color:#48f;">Mana: ${def.manaCost}</span>
            <span style="color:#fa8;">Type: ${def.damageType}</span>
            ${statusHtml}
            ${aoeHtml}
          </div>
          ${def.damageMultiplier > 0 ? `
          <div style="margin-top:6px;display:flex;gap:16px;font-size:13px;">
            <span style="color:#c8a84e;font-weight:bold;">Est. DPS: ${dps.toFixed(1)}</span>
            <span style="color:#ccc;">Damage/Hit: ${baseDamage.toFixed(1)}</span>
          </div>` : ""}
        </div>`;
    }
    const sec4 = `${sectionHeader("SKILL DETAILS")}${skillCardsHtml}`;

    // Section 5: Equipment Summary
    const slotLabels: { key: keyof DiabloEquipment; label: string }[] = [
      { key: "helmet", label: "Helmet" },
      { key: "body", label: "Body" },
      { key: "weapon", label: "Weapon" },
      { key: "gauntlets", label: "Gauntlets" },
      { key: "legs", label: "Legs" },
      { key: "feet", label: "Feet" },
      { key: "accessory1", label: "Accessory 1" },
      { key: "accessory2", label: "Accessory 2" },
      { key: "lantern", label: "Lantern" },
    ];
    let equipListHtml = "";
    for (const sl of slotLabels) {
      const item = p.equipment[sl.key];
      if (item) {
        equipListHtml += `<div style="margin:4px 0;"><span style="color:#888;">${sl.label}:</span> <span style="color:${RARITY_CSS[item.rarity]};font-weight:bold;">${item.name}</span></div>`;
      } else {
        equipListHtml += `<div style="margin:4px 0;"><span style="color:#888;">${sl.label}:</span> <span style="color:#555;">Empty</span></div>`;
      }
    }
    const sec5 = `${sectionHeader("EQUIPMENT SUMMARY")}<div style="font-size:14px;">${equipListHtml}</div>`;

    // Section 6: Set Bonuses
    const equippedNames: string[] = [];
    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (item && item.setName) equippedNames.push(item.setName);
    }
    let activeSets = "";
    for (const sb of SET_BONUSES) {
      const count = equippedNames.filter((n) => n === sb.setName).length;
      if (count >= sb.pieces) {
        activeSets += `<div style="margin:4px 0;color:#4f4;font-size:14px;"><span style="font-weight:bold;">${sb.setName}</span> (${sb.pieces}pc) — ${sb.bonusDescription}</div>`;
      }
    }
    if (!activeSets) {
      activeSets = `<div style="color:#555;font-size:14px;">No active set bonuses</div>`;
    }
    const sec6 = `${sectionHeader("SET BONUSES ACTIVE")}${activeSets}`;

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <div style="
          max-width:800px;width:90%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:30px 40px;max-height:85vh;overflow-y:auto;
        ">
          <h1 style="color:#c8a84e;font-size:36px;letter-spacing:4px;margin:0 0 10px 0;text-align:center;
            font-family:'Georgia',serif;text-shadow:0 0 15px rgba(200,168,78,0.4);">CHARACTER OVERVIEW</h1>
          <div style="text-align:center;color:#888;font-size:12px;margin-bottom:6px;">Press C or Escape to close</div>
          ${sec1}${sec2}${sec3}${sec4}${sec5}${sec6}
          <div style="text-align:center;margin-top:30px;display:flex;gap:16px;justify-content:center;">
            <button id="diablo-char-skilltree" style="
              width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a8a2a;border-radius:8px;color:#8c8;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            ">SKILL TREE</button>
            <button id="diablo-char-back" style="
              width:200px;padding:12px 0;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            ">BACK</button>
          </div>
        </div>
      </div>`;

    const backBtn = this._menuEl.querySelector("#diablo-char-back") as HTMLButtonElement;
    backBtn.addEventListener("mouseenter", () => {
      backBtn.style.borderColor = "#c8a84e";
      backBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      backBtn.style.background = "rgba(50,40,20,0.95)";
    });
    backBtn.addEventListener("mouseleave", () => {
      backBtn.style.borderColor = "#5a4a2a";
      backBtn.style.boxShadow = "none";
      backBtn.style.background = "rgba(40,30,15,0.9)";
    });
    backBtn.addEventListener("click", () => {
      this._backToMenu();
    });

    const stBtn = this._menuEl.querySelector("#diablo-char-skilltree") as HTMLButtonElement;
    stBtn.addEventListener("mouseenter", () => {
      stBtn.style.borderColor = "#8c8";
      stBtn.style.boxShadow = "0 0 15px rgba(100,200,100,0.3)";
      stBtn.style.background = "rgba(30,50,30,0.95)";
    });
    stBtn.addEventListener("mouseleave", () => {
      stBtn.style.borderColor = "#5a8a2a";
      stBtn.style.boxShadow = "none";
      stBtn.style.background = "rgba(40,30,15,0.9)";
    });
    stBtn.addEventListener("click", () => {
      this._showSkillTreeScreen();
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  GAME OVER SCREEN (kept for potential future use)
  // ──────────────────────────────────────────────────────────────
  // @ts-ignore unused-method kept intentionally
  private _showGameOver(): void {
    this._state.phase = DiabloPhase.GAME_OVER;
    const p = this._state.player;
    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="color:#cc2222;font-size:52px;letter-spacing:6px;margin-bottom:30px;
          font-family:'Georgia',serif;text-shadow:0 0 30px rgba(200,30,30,0.6);">YOU HAVE FALLEN</h1>
        <div style="background:rgba(20,10,10,0.9);border:1px solid #5a2a2a;border-radius:10px;padding:24px;margin-bottom:30px;">
          <div style="font-size:16px;margin-bottom:8px;">Kills: <span style="color:#ff8;">${this._state.killCount}</span></div>
          <div style="font-size:16px;margin-bottom:8px;">Gold: <span style="color:#ffd700;">${p.gold}</span></div>
          <div style="font-size:16px;">Level: <span style="color:#8af;">${p.level}</span></div>
        </div>
        <button id="diablo-return-btn" style="
          background:rgba(40,15,15,0.9);border:2px solid #c8a84e;color:#c8a84e;font-size:20px;
          padding:14px 50px;cursor:pointer;border-radius:8px;
          font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
        ">RETURN TO MENU</button>
      </div>`;

    this._menuEl.querySelector("#diablo-return-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  VICTORY SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showVictory(): void {
    this._state.phase = DiabloPhase.VICTORY;
    const p = this._state.player;

    // Transfer inventory to persistent stash
    this._state.persistentGold += p.gold;
    this._state.persistentLevel = Math.max(this._state.persistentLevel, p.level);
    this._state.persistentXp = Math.max(this._state.persistentXp, p.xp);
    for (let i = 0; i < p.inventory.length; i++) {
      if (p.inventory[i].item && i < this._state.persistentInventory.length) {
        if (this._state.persistentInventory[i].item === null) {
          this._state.persistentInventory[i].item = p.inventory[i].item;
        }
      }
    }

    const reward = MAP_COMPLETION_REWARDS[this._state.currentMap];
    const rewardHtml = reward ? `
      <div style="font-size:14px;color:#c8a84e;margin-top:8px;font-style:italic;">${reward.bonusMessage}</div>
    ` : "";
    const clearedCount = Object.keys(this._state.completedMaps).length;
    const totalMaps = 8;

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;
      ">
        <h1 style="color:#ffd700;font-size:52px;letter-spacing:6px;margin-bottom:30px;
          font-family:'Georgia',serif;text-shadow:0 0 30px rgba(255,215,0,0.5);">MAP CLEARED!</h1>
        <div style="background:rgba(20,18,10,0.9);border:1px solid #5a4a2a;border-radius:10px;padding:24px;margin-bottom:30px;">
          <div style="font-size:16px;margin-bottom:8px;">Kills: <span style="color:#ff8;">${this._state.killCount}</span></div>
          <div style="font-size:16px;margin-bottom:8px;">Gold: <span style="color:#ffd700;">${p.gold}</span></div>
          <div style="font-size:16px;margin-bottom:8px;">Level: <span style="color:#8af;">${p.level}</span></div>
          <div style="font-size:14px;color:#888;margin-top:8px;">Maps cleared: ${clearedCount}/${totalMaps}</div>
          ${rewardHtml}
        </div>
        <div style="display:flex;gap:16px;">
          <button id="diablo-nextmap-btn" style="
            background:rgba(15,30,15,0.9);border:2px solid #c8a84e;color:#c8a84e;font-size:18px;
            padding:14px 40px;cursor:pointer;border-radius:8px;
            font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
          ">SELECT ANOTHER MAP</button>
          <button id="diablo-exit-btn" style="
            background:rgba(40,15,15,0.9);border:2px solid #a44;color:#e66;font-size:18px;
            padding:14px 40px;cursor:pointer;border-radius:8px;
            font-family:'Georgia',serif;letter-spacing:2px;pointer-events:auto;
          ">EXIT</button>
        </div>
      </div>`;

    this._menuEl.querySelector("#diablo-nextmap-btn")!.addEventListener("click", () => {
      this._showMapSelect();
    });
    this._menuEl.querySelector("#diablo-exit-btn")!.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("diabloExit"));
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  BUILD HUD
  // ──────────────────────────────────────────────────────────────
  private _buildHUD(): void {
    this._hud.innerHTML = "";

    // Inject CSS keyframe animations for HUD effects
    const hudStyleEl = document.createElement("style");
    hudStyleEl.textContent = `
      @keyframes hud-blood-drip {
        0%, 100% { opacity:0.6; transform:translateX(-50%) scaleY(1); }
        50% { opacity:1; transform:translateX(-50%) scaleY(1.5); }
      }
      @keyframes hud-arcane-particles {
        0% { box-shadow:0 0 4px 2px rgba(100,100,255,0.6), 8px -6px 3px 1px rgba(120,80,255,0.4), -6px -8px 2px 1px rgba(80,120,255,0.5); }
        33% { box-shadow:-4px -10px 4px 2px rgba(120,80,255,0.5), 6px 4px 3px 1px rgba(80,120,255,0.6), 10px -4px 2px 1px rgba(100,100,255,0.4); }
        66% { box-shadow:6px -4px 4px 2px rgba(80,120,255,0.4), -8px 2px 3px 1px rgba(100,100,255,0.6), 2px -12px 2px 1px rgba(120,80,255,0.5); }
        100% { box-shadow:0 0 4px 2px rgba(100,100,255,0.6), 8px -6px 3px 1px rgba(120,80,255,0.4), -6px -8px 2px 1px rgba(80,120,255,0.5); }
      }
      @keyframes hud-xp-pulse {
        0%, 100% { box-shadow:0 0 10px rgba(255,215,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2); }
        50% { box-shadow:0 0 20px rgba(255,215,0,0.9), 0 0 40px rgba(255,215,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3); }
      }
      @keyframes hud-torch-flicker {
        0%, 100% { opacity:0.85; transform:scaleX(1) scaleY(1); }
        25% { opacity:1; transform:scaleX(1.05) scaleY(1.1); }
        50% { opacity:0.75; transform:scaleX(0.95) scaleY(0.95); }
        75% { opacity:0.95; transform:scaleX(1.02) scaleY(1.05); }
      }
      @keyframes hud-torch-glow {
        0%, 100% { box-shadow:0 0 15px 8px rgba(255,140,20,0.3), 0 0 30px 12px rgba(255,100,0,0.15); }
        50% { box-shadow:0 0 20px 12px rgba(255,140,20,0.45), 0 0 40px 16px rgba(255,100,0,0.2); }
      }
      @keyframes hud-compass-spin {
        0% { transform:translate(-50%,-50%) rotate(0deg); }
        100% { transform:translate(-50%,-50%) rotate(360deg); }
      }
    `;
    this._hud.appendChild(hudStyleEl);

    // Health orb - bottom left (ornate)
    this._hpOrbWrap = document.createElement("div");
    const hpOrbWrap = this._hpOrbWrap;
    hpOrbWrap.style.cssText = `
      position:absolute;bottom:22px;left:22px;width:150px;height:150px;
      display:flex;align-items:center;justify-content:center;
      filter:drop-shadow(0 0 12px rgba(180,20,20,0.35));
    `;
    // Outer decorative ring
    const hpRingOuter = document.createElement("div");
    hpRingOuter.style.cssText = `
      position:absolute;width:146px;height:146px;border-radius:50%;
      border:3px solid transparent;
      background:conic-gradient(from 0deg, #8b6914, #c8a84e, #e8d07a, #c8a84e, #8b6914, #6b4f0e, #8b6914) border-box;
      -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite:xor;mask-composite:exclude;
      pointer-events:none;
    `;
    // Inner decorative ring
    const hpRingInner = document.createElement("div");
    hpRingInner.style.cssText = `
      position:absolute;width:146px;height:146px;border-radius:50%;
      border:2px solid rgba(60,5,5,0.8);
      box-shadow:0 0 6px rgba(0,0,0,0.6);
      pointer-events:none;
    `;
    const hpOrb = document.createElement("div");
    hpOrb.style.cssText = `
      width:130px;height:130px;border-radius:50%;
      background:radial-gradient(circle at 35% 35%, rgba(60,10,10,0.9), rgba(20,2,2,0.97));
      overflow:hidden;position:relative;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 20px rgba(180,20,20,0.5), inset 0 0 30px rgba(0,0,0,0.6),
        inset 0 0 60px rgba(120,10,10,0.2);
    `;
    this._hpBar = document.createElement("div");
    this._hpBar.style.cssText = `
      position:absolute;bottom:0;left:0;width:100%;height:100%;
      background:radial-gradient(circle at 40% 40%, rgba(220,40,40,0.9), rgba(140,10,10,0.85));
      border-radius:50%;transition:height 0.3s;
      box-shadow:inset 0 -5px 15px rgba(255,60,60,0.3);
    `;
    // Inner glow overlay
    const hpGlow = document.createElement("div");
    hpGlow.style.cssText = `
      position:absolute;top:10%;left:15%;width:40%;height:30%;
      background:radial-gradient(ellipse, rgba(255,180,180,0.25), transparent);
      border-radius:50%;pointer-events:none;z-index:2;
    `;
    this._hpText = document.createElement("div");
    this._hpText.style.cssText = `
      position:relative;z-index:3;color:#ffcccc;font-size:14px;font-weight:bold;text-align:center;
      text-shadow:0 1px 4px rgba(0,0,0,0.95), 0 0 10px rgba(200,20,20,0.4);
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    `;
    // Skull decoration on top
    const hpSkull = document.createElement("div");
    hpSkull.style.cssText = `
      position:absolute;top:-8px;left:50%;transform:translateX(-50%);z-index:4;
      font-size:16px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
      color:#c8a84e;pointer-events:none;
    `;
    hpSkull.textContent = "\u2020";
    // Corner flourishes (4 positions)
    const hpFlourishes = [
      { top: "2px", left: "2px", rot: "0deg" },
      { top: "2px", right: "2px", rot: "90deg" },
      { bottom: "2px", left: "2px", rot: "270deg" },
      { bottom: "2px", right: "2px", rot: "180deg" },
    ];
    for (const pos of hpFlourishes) {
      const fl = document.createElement("div");
      let posStr = `position:absolute;width:14px;height:14px;pointer-events:none;z-index:5;`;
      if (pos.top) posStr += `top:${pos.top};`;
      if (pos.bottom) posStr += `bottom:${pos.bottom};`;
      if (pos.left) posStr += `left:${pos.left};`;
      if (pos.right) posStr += `right:${pos.right};`;
      posStr += `transform:rotate(${pos.rot});font-size:10px;color:#c8a84e;text-shadow:0 0 4px rgba(200,168,78,0.4);`;
      fl.style.cssText = posStr;
      fl.textContent = "\u269C";
      hpOrbWrap.appendChild(fl);
    }
    hpOrb.appendChild(this._hpBar);
    hpOrb.appendChild(hpGlow);
    hpOrb.appendChild(this._hpText);
    hpOrbWrap.appendChild(hpRingOuter);
    hpOrbWrap.appendChild(hpRingInner);
    hpOrbWrap.appendChild(hpOrb);
    hpOrbWrap.appendChild(hpSkull);

    // === HP Orb enhancements ===
    // Second outer ring (dark metal, behind existing gold ring)
    const hpRingOuter2 = document.createElement("div");
    hpRingOuter2.style.cssText = `
      position:absolute;width:144px;height:144px;border-radius:50%;
      border:4px solid transparent;
      background:conic-gradient(from 0deg, #3a2a10, #5a4420, #3a2a10, #2a1a08, #3a2a10) border-box;
      -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite:xor;mask-composite:exclude;
      pointer-events:none;z-index:-1;
    `;
    hpOrbWrap.appendChild(hpRingOuter2);

    // Tick marks (8 radial lines around the ring)
    for (let t = 0; t < 8; t++) {
      const tick = document.createElement("div");
      tick.style.cssText = `
        position:absolute;width:2px;height:10px;
        background:linear-gradient(180deg, #c8a84e, rgba(139,105,20,0.3));
        top:50%;left:50%;transform-origin:0 0;
        transform:rotate(${t * 45}deg) translate(-1px, -72px);
        pointer-events:none;z-index:6;
      `;
      hpOrbWrap.appendChild(tick);
    }

    // Animated blood drip at top of orb
    const hpBloodDrip = document.createElement("div");
    hpBloodDrip.style.cssText = `
      position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:7;
      width:6px;height:12px;border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;
      background:radial-gradient(circle at 40% 30%, rgba(220,40,40,0.9), rgba(140,10,10,0.7));
      animation:hud-blood-drip 2s ease-in-out infinite;
      pointer-events:none;
    `;
    hpOrbWrap.appendChild(hpBloodDrip);

    // Chain link decoration connecting to skill bar
    const hpChain = document.createElement("div");
    hpChain.style.cssText = `
      position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);z-index:6;
      width:8px;height:20px;pointer-events:none;
      background:repeating-linear-gradient(180deg, #8b6914 0px, #c8a84e 2px, #8b6914 4px, transparent 4px, transparent 6px);
      border-radius:2px;
      filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));
    `;
    hpOrbWrap.appendChild(hpChain);

    // Bottom ornament (fleur-de-lis)
    const hpBottomOrnament = document.createElement("div");
    hpBottomOrnament.style.cssText = `
      position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);z-index:8;
      font-size:16px;color:#c8a84e;pointer-events:none;
      filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
      text-shadow:0 0 6px rgba(200,168,78,0.4);
    `;
    hpBottomOrnament.textContent = "\u269C";
    hpOrbWrap.appendChild(hpBottomOrnament);

    this._hud.appendChild(hpOrbWrap);

    // Mana orb - bottom right (ornate)
    this._mpOrbWrap = document.createElement("div");
    const mpOrbWrap = this._mpOrbWrap;
    mpOrbWrap.style.cssText = `
      position:absolute;bottom:22px;right:22px;width:150px;height:150px;
      display:flex;align-items:center;justify-content:center;
      filter:drop-shadow(0 0 12px rgba(30,30,200,0.35));
    `;
    // Outer decorative ring (silver/blue)
    const mpRingOuter = document.createElement("div");
    mpRingOuter.style.cssText = `
      position:absolute;width:146px;height:146px;border-radius:50%;
      border:3px solid transparent;
      background:conic-gradient(from 0deg, #4a5a8b, #7a8ac8, #a0b0e8, #7a8ac8, #4a5a8b, #3a4a6b, #4a5a8b) border-box;
      -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite:xor;mask-composite:exclude;
      pointer-events:none;
    `;
    // Inner ring
    const mpRingInner = document.createElement("div");
    mpRingInner.style.cssText = `
      position:absolute;width:136px;height:136px;border-radius:50%;
      border:2px solid rgba(5,5,60,0.8);
      box-shadow:0 0 6px rgba(0,0,0,0.6);
      pointer-events:none;
    `;
    const mpOrb = document.createElement("div");
    mpOrb.style.cssText = `
      width:130px;height:130px;border-radius:50%;
      background:radial-gradient(circle at 35% 35%, rgba(10,10,60,0.9), rgba(2,2,20,0.97));
      overflow:hidden;position:relative;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 20px rgba(30,30,200,0.5), inset 0 0 30px rgba(0,0,0,0.6),
        inset 0 0 60px rgba(10,10,120,0.2);
    `;
    this._mpBar = document.createElement("div");
    this._mpBar.style.cssText = `
      position:absolute;bottom:0;left:0;width:100%;height:100%;
      background:radial-gradient(circle at 40% 40%, rgba(60,60,240,0.9), rgba(20,20,140,0.85));
      border-radius:50%;transition:height 0.3s;
      box-shadow:inset 0 -5px 15px rgba(60,60,255,0.3);
    `;
    // Inner glow
    const mpGlow = document.createElement("div");
    mpGlow.style.cssText = `
      position:absolute;top:10%;left:15%;width:40%;height:30%;
      background:radial-gradient(ellipse, rgba(180,180,255,0.25), transparent);
      border-radius:50%;pointer-events:none;z-index:2;
    `;
    this._mpText = document.createElement("div");
    this._mpText.style.cssText = `
      position:relative;z-index:3;color:#ccccff;font-size:14px;font-weight:bold;text-align:center;
      text-shadow:0 1px 4px rgba(0,0,0,0.95), 0 0 10px rgba(30,30,200,0.4);
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    `;
    // Arcane rune decoration on top
    const mpRune = document.createElement("div");
    mpRune.style.cssText = `
      position:absolute;top:-8px;left:50%;transform:translateX(-50%);z-index:4;
      font-size:16px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
      color:#7a8ac8;pointer-events:none;
    `;
    mpRune.textContent = "\u2726";
    // Corner rune flourishes
    const mpFlourishes = [
      { top: "2px", left: "2px", rot: "0deg" },
      { top: "2px", right: "2px", rot: "90deg" },
      { bottom: "2px", left: "2px", rot: "270deg" },
      { bottom: "2px", right: "2px", rot: "180deg" },
    ];
    for (const pos of mpFlourishes) {
      const fl = document.createElement("div");
      let posStr = `position:absolute;width:14px;height:14px;pointer-events:none;z-index:5;`;
      if (pos.top) posStr += `top:${pos.top};`;
      if (pos.bottom) posStr += `bottom:${pos.bottom};`;
      if (pos.left) posStr += `left:${pos.left};`;
      if (pos.right) posStr += `right:${pos.right};`;
      posStr += `transform:rotate(${pos.rot});font-size:10px;color:#7a8ac8;text-shadow:0 0 4px rgba(100,120,200,0.4);`;
      fl.style.cssText = posStr;
      fl.textContent = "\u2727";
      mpOrbWrap.appendChild(fl);
    }
    mpOrb.appendChild(this._mpBar);
    mpOrb.appendChild(mpGlow);
    mpOrb.appendChild(this._mpText);
    mpOrbWrap.appendChild(mpRingOuter);
    mpOrbWrap.appendChild(mpRingInner);
    mpOrbWrap.appendChild(mpOrb);
    mpOrbWrap.appendChild(mpRune);

    // === MP Orb enhancements ===
    // Second outer ring (silver metal, behind existing ring)
    const mpRingOuter2 = document.createElement("div");
    mpRingOuter2.style.cssText = `
      position:absolute;width:144px;height:144px;border-radius:50%;
      border:4px solid transparent;
      background:conic-gradient(from 0deg, #2a2a3a, #3a3a5a, #2a2a3a, #1a1a28, #2a2a3a) border-box;
      -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite:xor;mask-composite:exclude;
      pointer-events:none;z-index:-1;
    `;
    mpOrbWrap.appendChild(mpRingOuter2);

    // Tick marks (8 radial lines)
    for (let t = 0; t < 8; t++) {
      const tick = document.createElement("div");
      tick.style.cssText = `
        position:absolute;width:2px;height:10px;
        background:linear-gradient(180deg, #7a8ac8, rgba(74,90,139,0.3));
        top:50%;left:50%;transform-origin:0 0;
        transform:rotate(${t * 45}deg) translate(-1px, -72px);
        pointer-events:none;z-index:6;
      `;
      mpOrbWrap.appendChild(tick);
    }

    // Arcane energy particles effect
    const mpArcaneParticles = document.createElement("div");
    mpArcaneParticles.style.cssText = `
      position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:7;
      width:4px;height:4px;border-radius:50%;
      background:rgba(120,100,255,0.8);
      animation:hud-arcane-particles 3s ease-in-out infinite;
      pointer-events:none;
    `;
    mpOrbWrap.appendChild(mpArcaneParticles);

    // Chain link decoration connecting to skill bar
    const mpChain = document.createElement("div");
    mpChain.style.cssText = `
      position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);z-index:6;
      width:8px;height:20px;pointer-events:none;
      background:repeating-linear-gradient(180deg, #4a5a8b 0px, #7a8ac8 2px, #4a5a8b 4px, transparent 4px, transparent 6px);
      border-radius:2px;
      filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));
    `;
    mpOrbWrap.appendChild(mpChain);

    // Bottom rune ornament
    const mpBottomOrnament = document.createElement("div");
    mpBottomOrnament.style.cssText = `
      position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);z-index:8;
      font-size:16px;color:#7a8ac8;pointer-events:none;
      filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
      text-shadow:0 0 6px rgba(100,120,200,0.4);
    `;
    mpBottomOrnament.textContent = "\u25C6";
    mpOrbWrap.appendChild(mpBottomOrnament);

    this._hud.appendChild(mpOrbWrap);

    // Skill bar - bottom center (ornate stone bar)
    const skillBarBg = document.createElement("div");
    skillBarBg.style.cssText = `
      position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
      padding:10px 18px;display:flex;gap:8px;
      background:linear-gradient(180deg, rgba(45,38,25,0.95), rgba(25,20,10,0.97), rgba(35,28,18,0.95));
      border:2px solid #8b7a4a;border-radius:8px;
      box-shadow:0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,168,78,0.2),
        inset 0 -1px 0 rgba(0,0,0,0.4), 0 0 1px rgba(200,168,78,0.3);
    `;
    // Left end-cap ornament
    const skillCapL = document.createElement("div");
    skillCapL.style.cssText = `
      position:absolute;left:-10px;top:50%;transform:translateY(-50%);
      font-size:20px;color:#c8a84e;filter:drop-shadow(0 0 4px rgba(200,168,78,0.4));
      pointer-events:none;
    `;
    skillCapL.textContent = "\uD83D\uDDFF";
    skillBarBg.appendChild(skillCapL);
    // Right end-cap ornament (gargoyle)
    const skillCapR = document.createElement("div");
    skillCapR.style.cssText = `
      position:absolute;right:-14px;top:50%;transform:translateY(-50%) scaleX(-1);
      font-size:20px;color:#c8a84e;filter:drop-shadow(0 0 4px rgba(200,168,78,0.4));
      pointer-events:none;
    `;
    skillCapR.textContent = "\uD83D\uDDFF";
    skillBarBg.appendChild(skillCapR);

    // Top decorative border strip (gothic repeating pattern via box-shadow)
    const skillTopBorder = document.createElement("div");
    skillTopBorder.style.cssText = `
      position:absolute;top:-6px;left:10px;right:10px;height:4px;pointer-events:none;
      background:linear-gradient(90deg, transparent, #c8a84e, #e8d07a, #c8a84e, transparent);
      box-shadow:0 -2px 0 rgba(139,105,20,0.4),
        -20px -4px 0 1px rgba(200,168,78,0.15), 0px -4px 0 1px rgba(200,168,78,0.2), 20px -4px 0 1px rgba(200,168,78,0.15),
        -40px -4px 0 1px rgba(200,168,78,0.1), 40px -4px 0 1px rgba(200,168,78,0.1);
      z-index:10;
    `;
    skillBarBg.appendChild(skillTopBorder);

    // Bottom shadow/depth strip for 3D beveled effect
    const skillBottomStrip = document.createElement("div");
    skillBottomStrip.style.cssText = `
      position:absolute;bottom:-4px;left:4px;right:4px;height:4px;pointer-events:none;
      background:linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.1));
      border-radius:0 0 8px 8px;z-index:10;
    `;
    skillBarBg.appendChild(skillBottomStrip);

    // Runic inscription strip below skill bar
    const runicStrip = document.createElement("div");
    runicStrip.style.cssText = `
      position:absolute;bottom:-16px;left:20px;right:20px;height:12px;pointer-events:none;
      text-align:center;font-size:8px;letter-spacing:3px;
      color:rgba(200,168,78,0.35);z-index:10;
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      text-shadow:0 0 4px rgba(200,168,78,0.15);
    `;
    runicStrip.textContent = "\u16A0 \u16B1 \u16C1 \u16A2 \u16B3 \u16C7 \u16A8 \u16B7 \u16C9 \u16AA";
    skillBarBg.appendChild(runicStrip);

    this._skillSlots = [];
    this._skillCooldownOverlays = [];
    for (let i = 0; i < 6; i++) {
      const slotWrap = document.createElement("div");
      slotWrap.style.cssText = `
        position:relative;width:78px;height:78px;
      `;
      const slot = document.createElement("div");
      slot.style.cssText = `
        width:78px;height:78px;background:linear-gradient(180deg, rgba(30,25,15,0.95), rgba(12,8,3,0.97));
        border:2px solid #9a8a4a;border-radius:6px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;position:relative;overflow:hidden;
        box-shadow:inset 0 1px 0 rgba(200,168,78,0.2), inset 0 -1px 0 rgba(0,0,0,0.3),
          0 2px 8px rgba(0,0,0,0.5), inset 0 0 20px rgba(200,168,78,0.03);
      `;
      // Ornate frame corners on each slot
      const cornerDeco = document.createElement("div");
      cornerDeco.style.cssText = `
        position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:4;
        border-radius:6px;
        box-shadow:inset 2px 2px 0 rgba(200,168,78,0.15), inset -2px -2px 0 rgba(200,168,78,0.1);
      `;

      const cdOverlay = document.createElement("div");
      cdOverlay.style.cssText = `
        position:absolute;top:0;left:0;width:100%;height:0%;
        background:rgba(0,0,0,0.65);transition:height 0.1s;pointer-events:none;
      `;

      const cdText = document.createElement("div");
      cdText.style.cssText = `
        position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        font-size:18px;font-weight:bold;color:#fff;z-index:3;
        text-shadow:0 0 4px #000,0 0 8px #000;pointer-events:none;display:none;
      `;
      cdText.className = "skill-cd-text";

      const keyLabel = document.createElement("div");
      keyLabel.style.cssText = `
        position:absolute;bottom:2px;right:4px;font-size:10px;color:#9a8a5a;z-index:2;
        font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      `;
      keyLabel.textContent = String(i + 1);

      const iconEl = document.createElement("div");
      iconEl.style.cssText = "font-size:30px;z-index:1;";
      iconEl.className = "skill-icon";

      // Inner bevel highlight (raised stone look)
      const innerBevel = document.createElement("div");
      innerBevel.style.cssText = `
        position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;
        border-radius:6px;
        border-top:1px solid rgba(200,180,120,0.25);
        border-left:1px solid rgba(200,180,120,0.2);
        border-bottom:1px solid rgba(0,0,0,0.5);
        border-right:1px solid rgba(0,0,0,0.4);
      `;

      slot.appendChild(cdOverlay);
      slot.appendChild(iconEl);
      slot.appendChild(cdText);
      slot.appendChild(keyLabel);
      slot.appendChild(cornerDeco);
      slot.appendChild(innerBevel);
      slotWrap.appendChild(slot);

      // Divider line between slots (not after last one)
      if (i < 5) {
        const divider = document.createElement("div");
        divider.style.cssText = `
          position:absolute;right:-4px;top:4px;bottom:4px;width:2px;pointer-events:none;z-index:6;
          background:linear-gradient(180deg, transparent, #c8a84e, #e8d07a, #c8a84e, transparent);
          box-shadow:0 0 4px rgba(200,168,78,0.3);
        `;
        slotWrap.appendChild(divider);
      }

      skillBarBg.appendChild(slotWrap);
      this._skillSlots.push(slot);
      this._skillCooldownOverlays.push(cdOverlay);
    }
    this._hud.appendChild(skillBarBg);

    // XP bar - very bottom (ornate, enhanced)
    const xpContainer = document.createElement("div");
    xpContainer.style.cssText = `
      position:absolute;bottom:0;left:0;width:100%;height:18px;
      background:linear-gradient(180deg, rgba(30,22,8,0.95), rgba(15,10,3,0.95));
      border-top:2px solid rgba(200,168,78,0.4);
      box-shadow:inset 0 1px 3px rgba(0,0,0,0.5);
    `;
    // Gothic-style repeating peaks border on top
    const xpGothicBorder = document.createElement("div");
    xpGothicBorder.style.cssText = `
      position:absolute;top:-6px;left:0;right:0;height:4px;pointer-events:none;z-index:4;
      background:repeating-linear-gradient(90deg,
        transparent 0px, transparent 8px,
        rgba(200,168,78,0.3) 8px, rgba(200,168,78,0.3) 10px,
        transparent 10px, transparent 18px);
    `;
    xpContainer.appendChild(xpGothicBorder);
    // Filigree left end-cap (wider ornamental)
    const xpCapL = document.createElement("div");
    xpCapL.style.cssText = `
      position:absolute;left:2px;top:50%;transform:translateY(-50%);z-index:3;
      font-size:14px;color:#c8a84e;pointer-events:none;
      filter:drop-shadow(0 0 3px rgba(200,168,78,0.4));
    `;
    xpCapL.textContent = "\u2761\u25C0";
    xpContainer.appendChild(xpCapL);
    // Filigree right end-cap
    const xpCapR = document.createElement("div");
    xpCapR.style.cssText = `
      position:absolute;right:2px;top:50%;transform:translateY(-50%);z-index:3;
      font-size:14px;color:#c8a84e;pointer-events:none;
      filter:drop-shadow(0 0 3px rgba(200,168,78,0.4));
    `;
    xpCapR.textContent = "\u25B6\u2761";
    xpContainer.appendChild(xpCapR);
    // Segment marks every 10%
    for (let s = 1; s < 10; s++) {
      const seg = document.createElement("div");
      seg.style.cssText = `
        position:absolute;left:${s * 10}%;top:2px;bottom:2px;width:1px;z-index:2;
        background:linear-gradient(180deg, rgba(200,168,78,0.5), rgba(200,168,78,0.15));
        pointer-events:none;
      `;
      xpContainer.appendChild(seg);
    }
    this._xpBar = document.createElement("div");
    this._xpBar.style.cssText = `
      height:100%;width:0%;
      background:linear-gradient(90deg,#6b5500,#ffd700,#fff4aa,#ffd700);
      transition:width 0.3s;
      box-shadow:0 0 10px rgba(255,215,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
    `;
    xpContainer.appendChild(this._xpBar);
    // Level indicator text embedded in bar
    this._xpLevelText = document.createElement("div");
    this._xpLevelText.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3;
      font-size:10px;color:#e8d07a;font-weight:bold;pointer-events:none;
      text-shadow:0 0 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.8);
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      letter-spacing:1px;
    `;
    xpContainer.appendChild(this._xpLevelText);
    this._hud.appendChild(xpContainer);

    // Top right info (parchment panel, enhanced)
    const topRight = document.createElement("div");
    topRight.style.cssText = `
      position:absolute;top:16px;right:20px;text-align:right;
      background:linear-gradient(180deg, rgba(35,28,15,0.9), rgba(20,15,8,0.92), rgba(30,24,12,0.9));
      border:2px solid #7a6a3a;border-radius:8px;
      padding:14px 18px;min-width:160px;
      box-shadow:0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,168,78,0.15),
        inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 1px rgba(200,168,78,0.2),
        inset 0 0 0 1px rgba(200,168,78,0.08), 0 0 0 1px rgba(0,0,0,0.3);
      transition:border-color 0.3s, box-shadow 0.3s;
    `;
    this._topRightPanel = topRight;
    // Top ornament for the panel
    const panelOrnament = document.createElement("div");
    panelOrnament.style.cssText = `
      position:absolute;top:-8px;left:50%;transform:translateX(-50%);
      font-size:14px;color:#c8a84e;filter:drop-shadow(0 0 3px rgba(200,168,78,0.3));
      pointer-events:none;
    `;
    panelOrnament.textContent = "\u2736";
    topRight.appendChild(panelOrnament);
    this._goldText = document.createElement("div");
    this._goldText.style.cssText = `
      font-size:20px;color:#ffd700;margin-bottom:6px;
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      text-shadow:0 0 8px rgba(255,215,0,0.4), 0 1px 3px rgba(0,0,0,0.8);
      letter-spacing:0.5px;
    `;
    this._levelText = document.createElement("div");
    this._levelText.style.cssText = `
      font-size:18px;color:#c8a84e;margin-bottom:5px;
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      text-shadow:0 0 6px rgba(200,168,78,0.3), 0 1px 2px rgba(0,0,0,0.7);
    `;
    this._killText = document.createElement("div");
    this._killText.style.cssText = `
      font-size:15px;color:#bbb;
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      text-shadow:0 1px 2px rgba(0,0,0,0.6);
    `;
    topRight.appendChild(this._goldText);

    // Separator between gold and level
    const sep1 = document.createElement("div");
    sep1.style.cssText = `
      width:100%;height:1px;margin:4px 0;pointer-events:none;
      background:linear-gradient(90deg, transparent, rgba(200,168,78,0.4), rgba(200,168,78,0.6), rgba(200,168,78,0.4), transparent);
    `;
    topRight.appendChild(sep1);

    topRight.appendChild(this._levelText);

    // Separator between level and kills
    const sep2 = document.createElement("div");
    sep2.style.cssText = `
      width:100%;height:1px;margin:4px 0;pointer-events:none;
      background:linear-gradient(90deg, transparent, rgba(200,168,78,0.3), rgba(200,168,78,0.5), rgba(200,168,78,0.3), transparent);
    `;
    topRight.appendChild(sep2);

    topRight.appendChild(this._killText);

    // Corner metal brackets (L-shaped gold corners)
    const bracketPositions = [
      { top: "3px", left: "3px", borderSides: "border-top:2px solid #c8a84e;border-left:2px solid #c8a84e;" },
      { top: "3px", right: "3px", borderSides: "border-top:2px solid #c8a84e;border-right:2px solid #c8a84e;" },
      { bottom: "3px", left: "3px", borderSides: "border-bottom:2px solid #c8a84e;border-left:2px solid #c8a84e;" },
      { bottom: "3px", right: "3px", borderSides: "border-bottom:2px solid #c8a84e;border-right:2px solid #c8a84e;" },
    ];
    for (const bp of bracketPositions) {
      const bracket = document.createElement("div");
      let bStyle = `position:absolute;width:12px;height:12px;pointer-events:none;z-index:5;${bp.borderSides}`;
      if (bp.top) bStyle += `top:${bp.top};`;
      if (bp.bottom) bStyle += `bottom:${bp.bottom};`;
      if (bp.left) bStyle += `left:${bp.left};`;
      if (bp.right) bStyle += `right:${bp.right};`;
      bracket.style.cssText = bStyle;
      topRight.appendChild(bracket);
    }

    // Wax seal decoration at the bottom
    const waxSeal = document.createElement("div");
    waxSeal.style.cssText = `
      position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);z-index:6;
      width:24px;height:24px;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle at 40% 35%, #cc3333, #8b1a1a, #5a0a0a);
      box-shadow:0 1px 4px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,100,100,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:12px;color:rgba(180,40,40,0.8);text-shadow:0 0 2px rgba(0,0,0,0.4);
    `;
    waxSeal.textContent = "\u2605";
    topRight.appendChild(waxSeal);

    this._hud.appendChild(topRight);

    // Minimap canvas — top-left corner (ornate frame)
    const minimapWrap = document.createElement("div");
    minimapWrap.style.cssText = `
      position:absolute;top:12px;left:12px;width:216px;height:216px;
      display:flex;align-items:center;justify-content:center;
    `;
    // Ornate outer frame
    const mmFrame = document.createElement("div");
    mmFrame.style.cssText = `
      position:absolute;width:216px;height:216px;border-radius:6px;
      border:3px solid transparent;pointer-events:none;
      background:linear-gradient(135deg, #8b6914, #c8a84e, #e8d07a, #c8a84e, #8b6914) border-box;
      -webkit-mask:linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite:xor;mask-composite:exclude;
      box-shadow:0 0 8px rgba(200,168,78,0.3);
    `;
    minimapWrap.appendChild(mmFrame);
    // Inner thick border
    const mmInner = document.createElement("div");
    mmInner.style.cssText = `
      position:absolute;width:208px;height:208px;border-radius:4px;
      border:2px solid rgba(40,30,10,0.9);pointer-events:none;
      box-shadow:inset 0 0 6px rgba(0,0,0,0.5);
    `;
    minimapWrap.appendChild(mmInner);
    // Corner rivets (small gold circles)
    const mmCorners = [
      { top: "-5px", left: "-5px" },
      { top: "-5px", right: "-5px" },
      { bottom: "-5px", left: "-5px" },
      { bottom: "-5px", right: "-5px" },
    ];
    for (const pos of mmCorners) {
      const c = document.createElement("div");
      let cStyle = `position:absolute;width:10px;height:10px;border-radius:50%;z-index:3;pointer-events:none;
        background:radial-gradient(circle at 35% 35%, #e8d07a, #c8a84e, #8b6914);
        box-shadow:0 1px 3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,200,0.3);`;
      if (pos.top) cStyle += `top:${pos.top};`;
      if (pos.bottom) cStyle += `bottom:${pos.bottom};`;
      if (pos.left) cStyle += `left:${pos.left};`;
      if (pos.right) cStyle += `right:${pos.right};`;
      c.style.cssText = cStyle;
      minimapWrap.appendChild(c);
    }

    // Chain/rope edge effect around minimap frame
    const mmChainEdge = document.createElement("div");
    mmChainEdge.style.cssText = `
      position:absolute;width:222px;height:222px;border-radius:6px;pointer-events:none;z-index:1;
      top:50%;left:50%;transform:translate(-50%,-50%);
      box-shadow:
        inset 3px 0 0 -1px rgba(139,105,20,0.25), inset -3px 0 0 -1px rgba(139,105,20,0.25),
        inset 0 3px 0 -1px rgba(139,105,20,0.25), inset 0 -3px 0 -1px rgba(139,105,20,0.25),
        3px 0 0 -1px rgba(139,105,20,0.15), -3px 0 0 -1px rgba(139,105,20,0.15),
        0 3px 0 -1px rgba(139,105,20,0.15), 0 -3px 0 -1px rgba(139,105,20,0.15);
    `;
    minimapWrap.appendChild(mmChainEdge);

    // 4 compass point labels (N, S, E, W)
    const compassLabels = [
      { label: "N", top: "-2px", left: "50%", extra: "transform:translateX(-50%);" },
      { label: "S", bottom: "-2px", left: "50%", extra: "transform:translateX(-50%);" },
      { label: "E", right: "-1px", top: "50%", extra: "transform:translateY(-50%);" },
      { label: "W", left: "1px", top: "50%", extra: "transform:translateY(-50%);" },
    ];
    for (const cl of compassLabels) {
      const lbl = document.createElement("div");
      let lStyle = `position:absolute;z-index:4;font-size:11px;color:#e8d07a;font-weight:bold;pointer-events:none;
        text-shadow:0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(200,168,78,0.3);
        font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;`;
      if (cl.top) lStyle += `top:${cl.top};`;
      if (cl.bottom) lStyle += `bottom:${cl.bottom};`;
      if (cl.left) lStyle += `left:${cl.left};`;
      if (cl.right) lStyle += `right:${cl.right};`;
      if (cl.extra) lStyle += cl.extra;
      lbl.style.cssText = lStyle;
      lbl.textContent = cl.label;
      minimapWrap.appendChild(lbl);
    }

    // Rotating compass needle overlay
    const compassNeedle = document.createElement("div");
    compassNeedle.style.cssText = `
      position:absolute;top:50%;left:50%;z-index:5;pointer-events:none;
      width:2px;height:20px;
      background:linear-gradient(180deg, #cc2222 0%, #cc2222 50%, #cccccc 50%, #cccccc 100%);
      transform-origin:center center;
      animation:hud-compass-spin 30s linear infinite;
      transform:translate(-50%,-50%) rotate(0deg);
      opacity:0.6;
    `;
    minimapWrap.appendChild(compassNeedle);

    // Parchment texture background behind the map canvas
    const mmParchment = document.createElement("div");
    mmParchment.style.cssText = `
      position:absolute;width:204px;height:204px;border-radius:3px;pointer-events:none;z-index:0;
      background:
        radial-gradient(ellipse at 20% 20%, rgba(180,160,120,0.08), transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(160,140,100,0.06), transparent 50%),
        radial-gradient(ellipse at 50% 50%, rgba(140,120,80,0.04), transparent 70%),
        linear-gradient(180deg, rgba(120,100,60,0.05), rgba(80,60,30,0.08));
    `;
    minimapWrap.appendChild(mmParchment);

    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 200;
    this._minimapCanvas.height = 200;
    this._minimapCanvas.style.cssText = `
      width:200px;height:200px;border-radius:3px;background:rgba(0,0,0,0.6);
      box-shadow:inset 0 0 10px rgba(0,0,0,0.4);z-index:1;position:relative;
    `;
    this._minimapCtx = this._minimapCanvas.getContext("2d")!;
    minimapWrap.appendChild(this._minimapCanvas);
    this._hud.appendChild(minimapWrap);

    // Dedicated map name label below minimap
    this._mapNameLabel = document.createElement("div");
    this._mapNameLabel.style.cssText = `
      position:absolute;top:234px;left:12px;width:216px;text-align:center;
      font-size:13px;color:#e8d07a;font-weight:bold;
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      text-shadow:0 0 6px rgba(200,168,78,0.3), 0 1px 3px rgba(0,0,0,0.8);
      background:linear-gradient(90deg, transparent, rgba(25,20,10,0.7), transparent);
      padding:3px 0;letter-spacing:1px;pointer-events:none;
    `;
    this._hud.appendChild(this._mapNameLabel);

    // Fullscreen map overlay (aece2d8c)
    this._fullmapCanvas = document.createElement("canvas");
    this._fullmapCanvas.width = 400;
    this._fullmapCanvas.height = 400;
    this._fullmapCanvas.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;
      border:3px solid #c8a84e;border-radius:8px;background:rgba(0,0,0,0.85);
      display:none;z-index:5;
    `;
    this._fullmapCtx = this._fullmapCanvas.getContext("2d")!;
    this._hud.appendChild(this._fullmapCanvas);

    // Weather text (aece2d8c) - ornate
    this._weatherText = document.createElement("div");
    this._weatherText.style.cssText = `
      position:absolute;top:258px;left:12px;width:216px;text-align:center;
      font-size:12px;color:#b8a878;
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      text-shadow:0 1px 3px rgba(0,0,0,0.7);
      background:linear-gradient(90deg, transparent, rgba(20,16,8,0.6), transparent);
      padding:2px 0;letter-spacing:0.5px;
    `;
    this._hud.appendChild(this._weatherText);

    // Potion bar (ad1a2850) - ornate, enhanced with flask shapes
    const potionBarBg = document.createElement("div");
    potionBarBg.style.cssText = `
      position:absolute;bottom:22px;left:50%;transform:translateX(280px);display:flex;gap:6px;
      background:linear-gradient(180deg, rgba(20,30,15,0.9), rgba(10,18,8,0.92));
      border:2px solid #5a7a3a;border-radius:8px;padding:8px 12px;
      box-shadow:0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(100,180,78,0.12),
        0 0 1px rgba(100,180,78,0.2);
    `;

    // Wooden rack background (horizontal wood grain lines)
    const woodenRack = document.createElement("div");
    woodenRack.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;
      border-radius:6px;overflow:hidden;
      background:repeating-linear-gradient(0deg,
        transparent 0px, transparent 6px,
        rgba(90,60,20,0.08) 6px, rgba(90,60,20,0.08) 7px,
        transparent 7px, transparent 13px,
        rgba(70,45,15,0.06) 13px, rgba(70,45,15,0.06) 14px);
    `;
    potionBarBg.appendChild(woodenRack);

    this._potionHudSlots = [];
    const potionLabels = ["F1", "F2", "F3", "F4"];
    const potionColors = [
      "rgba(200,40,40,0.5)", "rgba(60,60,220,0.5)", "rgba(40,180,40,0.5)", "rgba(200,180,40,0.5)"
    ];
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.style.cssText = `
        width:58px;height:70px;background:linear-gradient(180deg, rgba(20,28,15,0.95), rgba(8,14,4,0.97));
        border:2px solid #6a8a4a;display:flex;flex-direction:column;
        align-items:center;justify-content:center;position:relative;overflow:hidden;
        box-shadow:inset 0 1px 0 rgba(100,180,78,0.2), inset 0 -1px 0 rgba(0,0,0,0.3),
          0 2px 6px rgba(0,0,0,0.4), inset 0 0 15px rgba(80,160,60,0.03);
        clip-path:polygon(25% 0%, 75% 0%, 80% 8%, 80% 12%, 100% 20%, 100% 100%, 0% 100%, 0% 20%, 20% 12%, 20% 8%);
      `;

      // Cork/stopper decoration at top
      const cork = document.createElement("div");
      cork.style.cssText = `
        position:absolute;top:0px;left:50%;transform:translateX(-50%);z-index:4;
        width:20px;height:6px;pointer-events:none;
        background:linear-gradient(180deg, #8b7355, #6b5335, #8b7355);
        border-radius:2px 2px 0 0;
        box-shadow:0 1px 2px rgba(0,0,0,0.4);
      `;
      slot.appendChild(cork);

      // Liquid level indicator (colored fill from bottom)
      const liquidLevel = document.createElement("div");
      liquidLevel.style.cssText = `
        position:absolute;bottom:0;left:0;width:100%;height:60%;z-index:0;
        background:linear-gradient(0deg, ${potionColors[i]}, transparent);
        pointer-events:none;transition:height 0.3s;
      `;
      slot.appendChild(liquidLevel);

      // Frame corners
      const potCorner = document.createElement("div");
      potCorner.style.cssText = `
        position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:3;
        box-shadow:inset 2px 2px 0 rgba(100,180,78,0.1), inset -2px -2px 0 rgba(100,180,78,0.08);
      `;
      const keyLabel = document.createElement("div");
      keyLabel.style.cssText = `
        position:absolute;bottom:2px;right:3px;font-size:9px;color:#7a9a5a;z-index:2;
        font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
      `;
      keyLabel.textContent = potionLabels[i];
      const iconEl = document.createElement("div");
      iconEl.style.cssText = "font-size:22px;z-index:1;";
      iconEl.className = "potion-icon";
      slot.appendChild(iconEl);
      slot.appendChild(keyLabel);
      slot.appendChild(potCorner);
      potionBarBg.appendChild(slot);
      this._potionHudSlots.push(slot);
    }
    this._hud.appendChild(potionBarBg);

    // Quest tracker (a270b216) - ornate scroll style
    this._questTracker = document.createElement("div");
    this._questTracker.style.cssText = `
      position:absolute;top:16px;right:20px;margin-top:100px;width:240px;
      background:linear-gradient(180deg, rgba(30,24,12,0.9), rgba(15,12,6,0.92), rgba(25,20,10,0.9));
      border:2px solid #6a5a2a;border-radius:8px;
      padding:12px 14px;font-size:13px;color:#ccc;display:none;
      box-shadow:0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,168,78,0.15),
        inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 1px rgba(200,168,78,0.2);
      font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif;
    `;
    // Scroll top decoration
    const questScrollTop = document.createElement("div");
    questScrollTop.style.cssText = `
      position:absolute;top:-7px;left:50%;transform:translateX(-50%);
      font-size:12px;color:#c8a84e;pointer-events:none;letter-spacing:4px;
      filter:drop-shadow(0 0 3px rgba(200,168,78,0.3));
    `;
    questScrollTop.textContent = "\u2E31 \u2736 \u2E31";
    this._questTracker.appendChild(questScrollTop);
    // Scroll bottom decoration
    const questScrollBot = document.createElement("div");
    questScrollBot.style.cssText = `
      position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
      font-size:12px;color:#c8a84e;pointer-events:none;letter-spacing:4px;
      filter:drop-shadow(0 0 3px rgba(200,168,78,0.3));
    `;
    questScrollBot.textContent = "\u2E31 \u2736 \u2E31";
    this._questTracker.appendChild(questScrollBot);
    this._hud.appendChild(this._questTracker);

    // Vendor interaction hint
    this._vendorHint = document.createElement("div");
    this._vendorHint.style.cssText = `
      position:absolute;bottom:100px;left:50%;transform:translateX(-50%);
      padding:8px 20px;background:rgba(10,8,4,0.85);border:1px solid #5a4a2a;
      border-radius:6px;color:#c8a84e;font-size:14px;font-weight:bold;
      letter-spacing:1px;display:none;white-space:nowrap;
    `;
    this._hud.appendChild(this._vendorHint);

    // Chest interaction hint
    this._chestHint = document.createElement("div");
    this._chestHint.style.cssText = `
      position:absolute;bottom:120px;left:50%;transform:translateX(-50%);
      padding:8px 20px;background:rgba(10,8,4,0.85);border:1px solid #5a4a2a;
      border-radius:6px;color:#ffd700;font-size:14px;font-weight:bold;
      letter-spacing:1px;display:none;white-space:nowrap;
    `;
    this._hud.appendChild(this._chestHint);

    // Quest popup (centered, semi-transparent parchment style)
    this._questPopup = document.createElement("div");
    this._questPopup.style.cssText = `
      position:absolute;top:12%;left:50%;transform:translateX(-50%);
      max-width:550px;width:90%;padding:20px 30px;
      background:linear-gradient(180deg, rgba(35,28,15,0.95) 0%, rgba(25,20,10,0.95) 100%);
      border:2px solid #5a4a2a;border-radius:10px;
      box-shadow:0 0 30px rgba(200,168,78,0.15), inset 0 0 20px rgba(0,0,0,0.3);
      color:#ccbb99;font-family:'Georgia',serif;text-align:center;
      display:none;z-index:5;pointer-events:none;
      transition:opacity 0.8s ease-out;
    `;
    this._hud.appendChild(this._questPopup);

    this._deathOverlay = document.createElement("div");
    this._deathOverlay.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(80,0,0,0.7);display:none;
      flex-direction:column;align-items:center;justify-content:center;
      color:#fff;pointer-events:none;
    `;
    this._deathOverlay.innerHTML = `
      <div style="font-size:48px;font-family:'Georgia',serif;color:#cc2222;
        text-shadow:0 0 30px rgba(200,30,30,0.6);letter-spacing:4px;">YOU HAVE DIED</div>
      <div id="diablo-respawn-timer" style="font-size:20px;color:#c8a84e;margin-top:16px;"></div>
      <div id="diablo-gold-loss" style="font-size:16px;color:#ff8888;margin-top:8px;"></div>
    `;
    this._hud.appendChild(this._deathOverlay);

    // FPS crosshair (hidden by default)
    this._fpsCrosshair = document.createElement("div");
    this._fpsCrosshair.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;display:none;
    `;
    this._fpsCrosshair.innerHTML =
      `<div style="position:absolute;width:3px;height:3px;border:1px solid rgba(255,255,255,0.9);border-radius:50%;left:-1px;top:-1px"></div>` +
      `<div style="position:absolute;width:14px;height:2px;background:rgba(255,255,255,0.6);left:5px;top:0"></div>` +
      `<div style="position:absolute;width:14px;height:2px;background:rgba(255,255,255,0.6);right:5px;top:0;transform:translateX(100%)"></div>` +
      `<div style="position:absolute;width:2px;height:14px;background:rgba(255,255,255,0.6);left:0;top:5px"></div>` +
      `<div style="position:absolute;width:2px;height:14px;background:rgba(255,255,255,0.6);left:0;bottom:5px;transform:translateY(100%)"></div>`;
    this._hud.appendChild(this._fpsCrosshair);

    // View mode indicator — hidden from main HUD (shown in pause menu instead)
    this._viewModeLabel = document.createElement("div");
    this._viewModeLabel.style.cssText = `
      position:absolute;top:10px;left:50%;transform:translateX(-50%);
      font-size:11px;color:#888;letter-spacing:1px;pointer-events:none;display:none;
    `;
    this._viewModeLabel.textContent = "";
    this._hud.appendChild(this._viewModeLabel);

    // DPS display
    this._dpsDisplay = document.createElement("div");
    this._dpsDisplay.style.cssText = `
      position:absolute;bottom:140px;right:20px;background:rgba(0,0,0,0.7);
      border:1px solid #5a4a2a;border-radius:6px;padding:8px 12px;display:none;
      font-family:'Georgia',serif;color:#c8a84e;font-size:13px;min-width:120px;
    `;
    this._dpsDisplay.innerHTML = `<div style="font-size:10px;color:#888;margin-bottom:2px;">DPS METER</div><div id="dps-value">0</div>`;
    this._hud.appendChild(this._dpsDisplay);

    // Loot filter label
    const lootFilterLabel = document.createElement("div");
    lootFilterLabel.id = "loot-filter-label";
    lootFilterLabel.style.cssText = `
      position:absolute;bottom:110px;right:20px;color:#ffdd00;font-size:11px;
      font-family:'Georgia',serif;opacity:0.7;
    `;
    lootFilterLabel.textContent = "Filter: Show All (Tab)";
    this._hud.appendChild(lootFilterLabel);

    // === Animated torches flanking the skill bar ===
    const torchPositions = [
      { side: "left", xOffset: "-300px" },
      { side: "right", xOffset: "300px" },
    ];
    for (const tp of torchPositions) {
      const torchWrap = document.createElement("div");
      torchWrap.style.cssText = `
        position:absolute;bottom:36px;left:50%;
        transform:translateX(calc(${tp.xOffset} - 50%));
        width:24px;height:56px;pointer-events:none;z-index:10;
      `;
      // Torch bracket (wall mount)
      const bracket = document.createElement("div");
      bracket.style.cssText = `
        position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
        width:14px;height:6px;
        background:linear-gradient(180deg, #8b7a4a, #5a4a2a);
        border-radius:2px;
        box-shadow:0 1px 2px rgba(0,0,0,0.5);
      `;
      torchWrap.appendChild(bracket);
      // Torch handle
      const torchHandle = document.createElement("div");
      torchHandle.style.cssText = `
        position:absolute;bottom:4px;left:50%;transform:translateX(-50%);
        width:8px;height:32px;
        background:linear-gradient(180deg, #8b6914, #6b4f0e, #4a3508, #6b4f0e);
        border-radius:2px 2px 3px 3px;
        box-shadow:inset 1px 0 0 rgba(200,168,78,0.2), inset -1px 0 0 rgba(0,0,0,0.3),
          0 0 3px rgba(0,0,0,0.5);
      `;
      torchWrap.appendChild(torchHandle);
      // Torch cup (holds fire)
      const cup = document.createElement("div");
      cup.style.cssText = `
        position:absolute;bottom:32px;left:50%;transform:translateX(-50%);
        width:16px;height:8px;
        background:linear-gradient(180deg, #5a4a2a, #3a2a1a);
        border-radius:2px 2px 4px 4px;
        box-shadow:0 1px 2px rgba(0,0,0,0.4);
      `;
      torchWrap.appendChild(cup);
      // Flame (centered above cup)
      const flame = document.createElement("div");
      flame.style.cssText = `
        position:absolute;bottom:38px;left:50%;transform:translateX(-50%);
        width:14px;height:20px;
        background:radial-gradient(ellipse at 50% 70%, #ffdd44, #ff8800, #ff4400, transparent);
        border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;
        animation:hud-torch-flicker 0.4s ease-in-out infinite alternate;
        filter:blur(0.5px);
      `;
      torchWrap.appendChild(flame);
      // Inner flame core
      const flameCore = document.createElement("div");
      flameCore.style.cssText = `
        position:absolute;bottom:40px;left:50%;transform:translateX(-50%);
        width:6px;height:10px;
        background:radial-gradient(ellipse at 50% 60%, #ffffcc, #ffee66, transparent);
        border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;
        pointer-events:none;
      `;
      torchWrap.appendChild(flameCore);
      // Flame glow
      const flameGlow = document.createElement("div");
      flameGlow.style.cssText = `
        position:absolute;bottom:40px;left:50%;transform:translateX(-50%);
        width:10px;height:10px;border-radius:50%;
        animation:hud-torch-glow 0.6s ease-in-out infinite alternate;
        pointer-events:none;
      `;
      torchWrap.appendChild(flameGlow);
      this._hud.appendChild(torchWrap);
    }

    // === NEW: Gothic frame border around entire HUD viewport ===
    const gothicFrame = document.createElement("div");
    gothicFrame.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;
      box-shadow:
        inset 0 0 0 3px rgba(20,15,5,0.8),
        inset 0 0 0 5px rgba(139,105,20,0.3),
        inset 0 0 0 6px rgba(200,168,78,0.15),
        inset 0 0 0 8px rgba(20,15,5,0.6),
        inset 0 0 30px rgba(0,0,0,0.3);
    `;
    this._hud.appendChild(gothicFrame);

    // Corner demon face ornaments (dark gradients shaped with border-radius)
    const cornerOrnPositions = [
      { top: "4px", left: "4px", rot: "0deg" },
      { top: "4px", right: "4px", rot: "90deg" },
      { bottom: "22px", left: "4px", rot: "270deg" },
      { bottom: "22px", right: "4px", rot: "180deg" },
    ];
    for (const cp of cornerOrnPositions) {
      const demon = document.createElement("div");
      let dStyle = `position:absolute;width:28px;height:28px;pointer-events:none;z-index:1;
        background:radial-gradient(circle at 50% 40%,
          rgba(200,168,78,0.25), rgba(100,80,30,0.2) 40%, rgba(20,15,5,0.4) 70%, transparent);
        border-radius:40% 40% 50% 50%;
        box-shadow:0 0 6px rgba(200,168,78,0.1);
        transform:rotate(${cp.rot});`;
      if (cp.top) dStyle += `top:${cp.top};`;
      if (cp.bottom) dStyle += `bottom:${cp.bottom};`;
      if (cp.left) dStyle += `left:${cp.left};`;
      if (cp.right) dStyle += `right:${cp.right};`;
      demon.style.cssText = dStyle;
      // Small face detail
      demon.innerHTML = `<div style="position:absolute;top:30%;left:50%;transform:translateX(-50%);
        font-size:10px;color:rgba(200,168,78,0.3);pointer-events:none;">\u2620</div>`;
      this._hud.appendChild(demon);
    }

    // Thin gold pinstripe inside the stone border
    const goldPinstripe = document.createElement("div");
    goldPinstripe.style.cssText = `
      position:absolute;top:6px;left:6px;right:6px;bottom:6px;pointer-events:none;z-index:0;
      border:1px solid rgba(200,168,78,0.12);
      border-radius:2px;
    `;
    this._hud.appendChild(goldPinstripe);
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE HUD
  // ──────────────────────────────────────────────────────────────
  private _updateHUD(): void {
    const p = this._state.player;

    // DPS calculation
    const now = performance.now();
    this._combatLog = this._combatLog.filter(e => now - e.time < 5000);
    const totalDmg = this._combatLog.reduce((s, e) => s + e.damage, 0);
    this._currentDps = this._combatLog.length > 0 ? totalDmg / 5 : 0;

    // FPS crosshair + view mode label
    if (this._fpsCrosshair) this._fpsCrosshair.style.display = this._firstPerson ? "block" : "none";
    // View mode label removed from HUD — hint is in the pause menu instead

    // Health orb
    const hpPct = Math.max(0, p.hp / p.maxHp);
    this._hpBar.style.height = (hpPct * 100) + "%";
    this._hpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;

    // Detect HP change and trigger flash (threshold high enough to ignore minor regen ticks)
    const hpDelta = p.hp - this._prevHp;
    if (this._prevHp >= 0 && Math.abs(hpDelta) > 2) {
      this._hpFlashTimer = hpDelta < 0 ? 0.5 : 0.4;
    }
    this._prevHp = p.hp;
    if (this._hpFlashTimer > 0) {
      this._hpFlashTimer -= 0.016; // roughly per-frame at 60fps
      const fi = Math.min(1, this._hpFlashTimer * 3);
      const isLoss = fi > 0;
      if (isLoss) {
        const pulse = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
        this._hpOrbWrap.style.filter = `drop-shadow(0 0 ${12 + fi * 16}px rgba(255,40,40,${0.5 * fi * pulse})) drop-shadow(0 0 ${6 + fi * 8}px rgba(255,100,100,${0.3 * fi}))`;
      }
    } else {
      this._hpOrbWrap.style.filter = 'drop-shadow(0 0 12px rgba(180,20,20,0.35))';
    }

    // Mana orb
    const mpPct = Math.max(0, p.mana / p.maxMana);
    this._mpBar.style.height = (mpPct * 100) + "%";
    this._mpText.textContent = `${Math.ceil(p.mana)}/${p.maxMana}`;

    // Detect Mana change and trigger flash (only on significant changes like skill use)
    const manaDelta = p.mana - this._prevMana;
    if (this._prevMana >= 0 && Math.abs(manaDelta) > 5) {
      this._manaFlashTimer = manaDelta < 0 ? 0.4 : 0.35;
    }
    this._prevMana = p.mana;
    if (this._manaFlashTimer > 0) {
      this._manaFlashTimer -= 0.016;
      const mi = Math.min(1, this._manaFlashTimer * 3);
      const pulse = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
      this._mpOrbWrap.style.filter = `drop-shadow(0 0 ${12 + mi * 16}px rgba(60,60,255,${0.5 * mi * pulse})) drop-shadow(0 0 ${6 + mi * 8}px rgba(120,120,255,${0.3 * mi}))`;
    } else {
      this._mpOrbWrap.style.filter = 'drop-shadow(0 0 12px rgba(30,30,200,0.35))';
    }

    // Skill bar
    for (let i = 0; i < 6; i++) {
      const skillId = p.skills[i];
      if (!skillId) continue;
      const def = SKILL_DEFS[skillId];
      if (!def) continue;
      const iconEl = this._skillSlots[i].querySelector(".skill-icon") as HTMLDivElement;
      if (iconEl) iconEl.textContent = def.icon;

      const cd = p.skillCooldowns.get(skillId) || 0;
      const maxCd = def.cooldown;
      const cdTextEl = this._skillSlots[i].querySelector(".skill-cd-text") as HTMLDivElement | null;
      if (cd > 0) {
        const pct = Math.min(100, (cd / maxCd) * 100);
        this._skillCooldownOverlays[i].style.height = pct + "%";
        if (cdTextEl) {
          cdTextEl.style.display = "block";
          cdTextEl.textContent = cd >= 1 ? Math.ceil(cd).toString() : cd.toFixed(1);
        }
      } else {
        this._skillCooldownOverlays[i].style.height = "0%";
        if (cdTextEl) cdTextEl.style.display = "none";
      }

      // Ability glow effect when skill is actively being used
      const isActive = p.activeSkillId === skillId && p.activeSkillAnimTimer > 0;
      if (isActive) {
        const glowIntensity = Math.min(1, p.activeSkillAnimTimer * 4);
        const pulseGlow = 0.7 + Math.sin(Date.now() * 0.012) * 0.3;
        const gI = glowIntensity * pulseGlow;
        this._skillSlots[i].style.boxShadow =
          `inset 0 0 20px rgba(255,215,100,${0.4 * gI}), ` +
          `0 0 12px rgba(255,200,60,${0.5 * gI}), ` +
          `0 0 24px rgba(255,180,40,${0.3 * gI})`;
        this._skillSlots[i].style.borderColor = `rgba(255,215,100,${0.7 * gI + 0.3})`;
      } else {
        this._skillSlots[i].style.boxShadow =
          'inset 0 1px 0 rgba(200,168,78,0.2), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5), inset 0 0 20px rgba(200,168,78,0.03)';
        this._skillSlots[i].style.borderColor = '#9a8a4a';
      }
    }

    // XP bar
    const xpPct = p.xpToNext > 0 ? (p.xp / p.xpToNext) * 100 : 0;
    this._xpBar.style.width = Math.min(100, xpPct) + "%";
    // Pulsing glow when near level up (>90% XP)
    if (xpPct > 90) {
      this._xpBar.style.animation = "hud-xp-pulse 1.2s ease-in-out infinite";
    } else {
      this._xpBar.style.animation = "none";
    }
    if (this._xpLevelText) {
      this._xpLevelText.textContent = `Level ${p.level}  \u2014  ${Math.floor(xpPct)}%`;
    }

    // Top right
    this._goldText.innerHTML = `<span style="filter:drop-shadow(0 0 3px rgba(255,215,0,0.4))">\uD83E\uDE99</span> ${p.gold.toLocaleString()}`;
    this._levelText.innerHTML = `\u2694 Level ${p.level}`;
    this._killText.innerHTML = `\u2620 ${this._state.killCount} Kills` +
      (this._state.deathCount > 0 ? `  &nbsp;\u2620 ${this._state.deathCount} Deaths` : "");

    // Glow border when talent points are available
    if (p.talentPoints > 0) {
      this._topRightPanel.style.borderColor = "#ffd700";
      this._topRightPanel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5), 0 0 12px rgba(255,215,0,0.5), 0 0 24px rgba(255,215,0,0.25), inset 0 0 8px rgba(255,215,0,0.1)";
    } else {
      this._topRightPanel.style.borderColor = "#7a6a3a";
      this._topRightPanel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,168,78,0.15), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 1px rgba(200,168,78,0.2), inset 0 0 0 1px rgba(200,168,78,0.08), 0 0 0 1px rgba(0,0,0,0.3)";
    }

    // Potion slots (ad1a2850)
    for (let i = 0; i < 4; i++) {
      const pot = p.potionSlots[i];
      const iconEl = this._potionHudSlots[i].querySelector(".potion-icon") as HTMLDivElement;
      if (iconEl) iconEl.textContent = pot ? pot.icon : "";
      const onCd = p.potionCooldown > 0;
      this._potionHudSlots[i].style.borderColor = onCd ? "#5a2a2a" : "#6a8a4a";
      this._potionHudSlots[i].style.opacity = onCd ? "0.5" : "1";
    }

    // Minimap
    this._updateMinimap();
    if (this._fullmapVisible) {
      this._updateFullmap();
    }

    // Map name label
    if (this._mapNameLabel) {
      const mapNameMap: Record<string, string> = {
        [DiabloMapId.FOREST]: "Darkwood Forest",
        [DiabloMapId.ELVEN_VILLAGE]: "Aelindor",
        [DiabloMapId.NECROPOLIS_DUNGEON]: "Necropolis Depths",
        [DiabloMapId.VOLCANIC_WASTES]: "Volcanic Wastes",
        [DiabloMapId.ABYSSAL_RIFT]: "Abyssal Rift",
        [DiabloMapId.DRAGONS_SANCTUM]: "Dragon's Sanctum",
        [DiabloMapId.SUNSCORCH_DESERT]: "Sunscorch Desert",
        [DiabloMapId.EMERALD_GRASSLANDS]: "Emerald Grasslands",
        [DiabloMapId.CAMELOT]: "Camelot",
      };
      this._mapNameLabel.textContent = mapNameMap[this._state.currentMap] || this._state.currentMap.replace(/_/g, ' ');
    }

    // Weather text (aece2d8c) - with icons
    const weatherLabels: Record<Weather, string> = {
      [Weather.NORMAL]: "",
      [Weather.FOGGY]: "\uD83C\uDF2B\uFE0F Foggy",
      [Weather.CLEAR]: "\u2600\uFE0F Clear Skies",
      [Weather.STORMY]: "\u26C8\uFE0F Stormy",
    };
    this._weatherText.textContent = weatherLabels[this._state.weather] || "";

    // Quest tracker (a270b216)
    this._updateQuestTracker();

    // Vendor hint (Camelot only)
    if (this._state.currentMap === DiabloMapId.CAMELOT) {
      let nearestVendor: DiabloVendor | null = null;
      let nearestDist = 4;
      for (const v of this._state.vendors) {
        const d = this._dist(p.x, p.z, v.x, v.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestVendor = v;
        }
      }
      if (nearestVendor) {
        this._vendorHint.style.display = "block";
        const action = nearestVendor.type === VendorType.BLACKSMITH ? "forge/salvage"
          : nearestVendor.type === VendorType.JEWELER ? "reroll stats"
          : "trade";
        this._vendorHint.textContent = `Press [E] to ${action} with ${nearestVendor.name}`;
      } else {
        this._vendorHint.style.display = "none";
      }
    } else {
      this._vendorHint.style.display = "none";
    }

    // Chest proximity hint
    let nearestChest = false;
    for (const chest of this._state.treasureChests) {
      if (chest.opened) continue;
      const d = this._dist(p.x, p.z, chest.x, chest.z);
      if (d < 4) {
        nearestChest = true;
        break;
      }
    }
    if (nearestChest) {
      this._chestHint.style.display = "block";
      this._chestHint.textContent = "Press [F] to open chest";
    } else {
      this._chestHint.style.display = "none";
    }

    // DPS meter update
    if (this._state.player.dpsDisplayVisible && this._dpsDisplay) {
      this._dpsDisplay.style.display = "block";
      const dpsVal = this._dpsDisplay.querySelector("#dps-value");
      if (dpsVal) dpsVal.textContent = `${Math.round(this._currentDps).toLocaleString()} DPS`;
    } else if (this._dpsDisplay) {
      this._dpsDisplay.style.display = "none";
    }

    // Loot filter label update
    const filterLabel = this._hud.querySelector("#loot-filter-label") as HTMLDivElement;
    if (filterLabel) {
      const names: Record<string, string> = { SHOW_ALL: 'Show All', HIDE_COMMON: 'Hide Common', RARE_PLUS: 'Rare+', EPIC_PLUS: 'Epic+' };
      filterLabel.textContent = `Filter: ${names[this._lootFilterLevel] || 'Show All'} (Tab)`;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  GAME LOOP
  // ──────────────────────────────────────────────────────────────
  private _gameLoop = (ts: number): void => {
    const dt = Math.min((ts - this._lastTime) / 1000, 0.1);
    // Hit freeze: skip simulation frames
    if (this._hitFreezeTimer > 0) {
      this._hitFreezeTimer -= dt;
      this._renderer.update(this._state, 0);
      this._rafId = requestAnimationFrame(this._gameLoop);
      return;
    }
    // Slow motion scaling
    const timeScale = this._slowMotionTimer > 0 ? this._slowMotionScale : 1;
    if (this._slowMotionTimer > 0) this._slowMotionTimer -= dt;
    const scaledDt = dt * timeScale;
    this._lastTime = ts;

    if (this._state.phase === DiabloPhase.PLAYING) {
      if (this._isDead) {
        this._updateDeathRespawn(scaledDt);
      } else {
        this._processInput(scaledDt);
        this._updatePlayer(scaledDt);
        this._updateEnemies(scaledDt);
        this._updateBossAbilities(scaledDt);
        this._updateCombat(scaledDt);
        this._updateProjectiles(scaledDt);
        this._updateAOE(scaledDt);
        this._updateLoot(scaledDt);
        this._updateSpawning(scaledDt);
        this._updateStatusEffects(scaledDt);
        this._updateFloatingText(scaledDt);
        this._updateTownfolk(scaledDt);
        this._updatePets(scaledDt);
        this._updateCraftingQueue(scaledDt);
        this._updatePetBuffs(scaledDt);
        this._checkMapClear();
        this._revealAroundPlayer(this._state.player.x, this._state.player.z);

        // Quest popup fade
        if (this._questPopupTimer > 0) {
          this._questPopupTimer -= dt * 1000;
          if (this._questPopupTimer <= 1500) {
            this._questPopup.style.opacity = String(Math.max(0, this._questPopupTimer / 1500));
          }
          if (this._questPopupTimer <= 0) {
            this._questPopup.style.display = "none";
            this._questPopupTimer = 0;
          }
        }
      }
      this._updateHUD();
    }

    this._renderer.update(this._state, dt);
    this._rafId = requestAnimationFrame(this._gameLoop);
  };

  // ──────────────────────────────────────────────────────────────
  //  PROCESS INPUT
  // ──────────────────────────────────────────────────────────────
  private _processInput(dt: number): void {
    const p = this._state.player;

    if (this._firstPerson && this._pointerLocked) {
      // FPS mouse look
      const sens = 0.002;
      this._fpYaw -= this._mouseDX * sens;
      this._fpPitch = Math.max(-Math.PI / 2 * 0.95, Math.min(Math.PI / 2 * 0.95, this._fpPitch - this._mouseDY * sens));
      this._mouseDX = 0;
      this._mouseDY = 0;

      p.angle = this._fpYaw;

      // Continuous skill/attack while holding mouse in FPS
      if (this._mouseDown && p.skills.length > 0) {
        this._activateSkill(0);
      }

      // WASD relative to facing direction
      let forward = 0;
      let strafe = 0;
      if (this._keys.has("KeyW") || this._keys.has("ArrowUp")) forward = 1;
      if (this._keys.has("KeyS") || this._keys.has("ArrowDown")) forward = -1;
      if (this._keys.has("KeyA") || this._keys.has("ArrowLeft")) strafe = -1;
      if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) strafe = 1;

      const len = Math.sqrt(forward * forward + strafe * strafe);
      if (len > 0) {
        forward /= len;
        strafe /= len;
      }

      const sinY = Math.sin(this._fpYaw);
      const cosY = Math.cos(this._fpYaw);
      const speed = p.moveSpeed;
      p.x += (-sinY * forward + cosY * strafe) * speed * dt;
      p.z += (-cosY * forward - sinY * strafe) * speed * dt;

      // Pass pitch to renderer
      this._renderer.fpPitch = this._fpPitch;
      this._renderer.fpYaw = this._fpYaw;
    } else {
      let dx = 0;
      let dz = 0;
      if (this._keys.has("KeyW") || this._keys.has("ArrowUp")) dz -= 1;
      if (this._keys.has("KeyS") || this._keys.has("ArrowDown")) dz += 1;
      if (this._keys.has("KeyA") || this._keys.has("ArrowLeft")) dx -= 1;
      if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) dx += 1;

      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) {
        dx /= len;
        dz /= len;
      }

      const speed = p.moveSpeed;
      p.x += dx * speed * dt;
      p.z += dz * speed * dt;

      // Face mouse direction
      const worldMouse = this._getMouseWorldPos();
      p.angle = Math.atan2(worldMouse.x - p.x, worldMouse.z - p.z);
    }

    // Clamp to map bounds
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2;
    p.x = Math.max(-halfW, Math.min(halfW, p.x));
    p.z = Math.max(-halfD, Math.min(halfD, p.z));
    p.y = getTerrainHeight(p.x, p.z);

    // Update camera target to follow player
    this._state.camera.targetX = p.x;
    this._state.camera.targetZ = p.z;
    this._state.camera.x += (p.x + Math.sin(this._state.camera.angle) * this._state.camera.distance - this._state.camera.x) * 3 * dt;
    this._state.camera.z += (p.z + Math.cos(this._state.camera.angle) * this._state.camera.distance - this._state.camera.z) * 3 * dt;

    // Dodge roll (spacebar)
    if (this._keys.has("Space") && p.dodgeCooldown <= 0 && !p.isDodging) {
      p.isDodging = true;
      p.dodgeTimer = 0.3; // 300ms roll duration
      p.dodgeCooldown = 1.5; // 1.5s cooldown
      p.invulnTimer = 0.3; // i-frames during roll
      // Roll in movement direction or facing direction
      let dx = 0, dz = 0;
      if (this._keys.has("KeyW") || this._keys.has("ArrowUp")) dz -= 1;
      if (this._keys.has("KeyS") || this._keys.has("ArrowDown")) dz += 1;
      if (this._keys.has("KeyA") || this._keys.has("ArrowLeft")) dx -= 1;
      if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) dx += 1;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) { dx /= len; dz /= len; }
      else { dx = Math.sin(p.angle); dz = Math.cos(p.angle); }
      p.dodgeVx = dx * p.moveSpeed * 3; // 3x speed during roll
      p.dodgeVz = dz * p.moveSpeed * 3;
      this._renderer.spawnParticles(ParticleType.DUST, p.x, p.y, p.z, 8, this._state.particles);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE PLAYER
  // ──────────────────────────────────────────────────────────────
  private _updatePlayer(dt: number): void {
    const p = this._state.player;

    // Dodge roll movement
    if (p.dodgeCooldown > 0) p.dodgeCooldown -= dt;
    if (p.isDodging) {
      p.dodgeTimer -= dt;
      p.x += p.dodgeVx * dt;
      p.z += p.dodgeVz * dt;
      if (p.dodgeTimer <= 0) {
        p.isDodging = false;
        p.dodgeVx = 0;
        p.dodgeVz = 0;
      }
      return; // Skip other updates during dodge
    }

    // Process queued skill
    if (this._queuedSkillIdx >= 0) {
      const qIdx = this._queuedSkillIdx;
      this._queuedSkillIdx = -1;
      this._activateSkill(qIdx);
    }

    // Mana regen
    const manaRegenBase = 1.0 + p.intelligence * 0.05;
    p.mana = Math.min(p.maxMana, p.mana + manaRegenBase * dt);

    // Cooldowns
    for (const [skillId, cd] of p.skillCooldowns) {
      if (cd > 0) {
        p.skillCooldowns.set(skillId, Math.max(0, cd - dt));
      }
    }

    // Attack timer
    if (p.attackTimer > 0) {
      p.attackTimer -= dt;
    }

    // Invuln timer
    if (p.invulnTimer > 0) {
      p.invulnTimer -= dt;
    }

    // Skill anim timer
    if (p.activeSkillAnimTimer > 0) {
      p.activeSkillAnimTimer -= dt;
      if (p.activeSkillAnimTimer <= 0) {
        p.activeSkillId = null;
      }
    }

    // Potion cooldown (ad1a2850)
    if (p.potionCooldown > 0) {
      p.potionCooldown = Math.max(0, p.potionCooldown - dt);
    }
    // Potion buff durations (ad1a2850)
    for (let i = p.activePotionBuffs.length - 1; i >= 0; i--) {
      p.activePotionBuffs[i].remaining -= dt;
      if (p.activePotionBuffs[i].remaining <= 0) {
        p.activePotionBuffs.splice(i, 1);
        this._recalculatePlayerStats();
      }
    }
    // Mana regen from talents (ad1a2850)
    const talentManaRegen = this._getTalentBonuses()[TalentEffectType.MANA_REGEN] || 0;
    if (talentManaRegen > 0) {
      p.mana = Math.min(p.maxMana, p.mana + talentManaRegen * dt);
    }

    // Level up check
    while (p.level < XP_TABLE.length - 1 && p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = p.level < XP_TABLE.length ? XP_TABLE[p.level] : XP_TABLE[XP_TABLE.length - 1] * 1.5;

      // Stat increases
      p.strength += 3;
      p.dexterity += 3;
      p.intelligence += 3;
      p.vitality += 4;
      p.maxHp += Math.floor(p.vitality * 2);
      p.maxMana += Math.floor(p.intelligence * 0.8);
      p.hp = p.maxHp;
      p.mana = p.maxMana;
      p.talentPoints += 1;

      this._addFloatingText(p.x, p.y + 3, p.z, "LEVEL UP!", "#ffd700");
      this._renderer.spawnParticles(ParticleType.LEVEL_UP, p.x, p.y + 0.5, p.z, 20 + Math.floor(Math.random() * 11), this._state.particles);
      this._renderer.shakeCamera(0.2, 0.3);
      this._recalculatePlayerStats();

      // Unlock base class skills progressively at levels 2-5
      const BASE_SKILL_UNLOCK: Record<string, SkillId[]> = {
        [DiabloClass.WARRIOR]: [SkillId.CLEAVE, SkillId.SHIELD_BASH, SkillId.WHIRLWIND, SkillId.BATTLE_CRY, SkillId.GROUND_SLAM, SkillId.BLADE_FURY],
        [DiabloClass.MAGE]: [SkillId.FIREBALL, SkillId.ICE_NOVA, SkillId.LIGHTNING_BOLT, SkillId.METEOR, SkillId.ARCANE_SHIELD, SkillId.CHAIN_LIGHTNING],
        [DiabloClass.RANGER]: [SkillId.MULTI_SHOT, SkillId.POISON_ARROW, SkillId.EVASIVE_ROLL, SkillId.EXPLOSIVE_TRAP, SkillId.RAIN_OF_ARROWS, SkillId.PIERCING_SHOT],
      };
      const baseSkills = BASE_SKILL_UNLOCK[p.class] || [];
      // Skills unlock at: lv1=2 skills, lv2=3, lv3=4, lv4=5, lv5=6
      const unlockedCount = Math.min(baseSkills.length, 2 + (p.level - 1));
      for (let i = 0; i < unlockedCount; i++) {
        if (!p.skills.includes(baseSkills[i])) {
          p.skills.push(baseSkills[i]);
          const def = SKILL_DEFS[baseSkills[i]];
          this._addFloatingText(p.x, p.y + 4, p.z, `NEW SKILL: ${def.name}!`, "#44ffff");
        }
      }
      // Also check for bonus skill unlocks (every 3 levels)
      const unlockList = UNLOCKABLE_SKILLS[p.class];
      for (const entry of unlockList) {
        if (p.level >= entry.level && !p.unlockedSkills.includes(entry.skillId)) {
          p.unlockedSkills.push(entry.skillId);
          const def = SKILL_DEFS[entry.skillId];
          this._addFloatingText(p.x, p.y + 4, p.z, `NEW SKILL: ${def.name}!`, "#44ffff");
        }
      }
    }

    // Paragon XP (after max normal level or always accumulate)
    if (p.level >= 100) {
      p.paragonXp += Math.floor(p.xp);
      p.xp = 0;
      while (p.paragonXp >= p.paragonXpToNext) {
        p.paragonXp -= p.paragonXpToNext;
        p.paragonLevel++;
        p.paragonXpToNext = PARAGON_XP_TABLE[Math.min(p.paragonLevel, PARAGON_XP_TABLE.length - 1)];
        // Small stat bonus per paragon level
        p.paragonBonuses['bonusDamage'] = (p.paragonBonuses['bonusDamage'] || 0) + 1;
        p.paragonBonuses['bonusHp'] = (p.paragonBonuses['bonusHp'] || 0) + 5;
        p.paragonBonuses['bonusMana'] = (p.paragonBonuses['bonusMana'] || 0) + 2;
        this._addFloatingText(p.x, p.y + 3, p.z, `PARAGON ${p.paragonLevel}!`, '#ffd700');
        this._renderer.spawnParticles(ParticleType.LEVEL_UP, p.x, p.y + 1, p.z, 30, this._state.particles);
      }
    }

    // Increment global time
    this._state.time += dt;
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE ENEMIES (AI STATE MACHINE)
  // ──────────────────────────────────────────────────────────────
  private _updateEnemies(dt: number): void {
    const p = this._state.player;
    const toRemove: string[] = [];

    for (const enemy of this._state.enemies) {
      const dist = this._dist(enemy.x, enemy.z, p.x, p.z);
      const effectiveSpeed = this._getEnemyEffectiveSpeed(enemy);

      // Check for stun
      const isStunned = enemy.statusEffects.some((e) => e.effect === StatusEffect.STUNNED);
      const isFrozen = enemy.statusEffects.some((e) => e.effect === StatusEffect.FROZEN);

      const effectiveAggroRange = this._state.weather === Weather.FOGGY ? enemy.aggroRange * 0.8 : enemy.aggroRange;

      switch (enemy.state) {
        case EnemyState.IDLE: {
          enemy.stateTimer += dt;
          if (dist <= effectiveAggroRange) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          } else if (enemy.stateTimer > 3 && Math.random() < 0.02) {
            // Random patrol
            enemy.state = EnemyState.PATROL;
            enemy.stateTimer = 0;
            enemy.patrolTarget = {
              x: enemy.x + (Math.random() * 10 - 5),
              y: 0,
              z: enemy.z + (Math.random() * 10 - 5),
            };
          }
          break;
        }
        case EnemyState.PATROL: {
          if (isStunned || isFrozen) break;
          enemy.stateTimer += dt;
          if (enemy.patrolTarget) {
            const pdist = this._dist(enemy.x, enemy.z, enemy.patrolTarget.x, enemy.patrolTarget.z);
            if (pdist < 1 || enemy.stateTimer > 5) {
              enemy.state = EnemyState.IDLE;
              enemy.stateTimer = 0;
              enemy.patrolTarget = null;
            } else {
              const dx = enemy.patrolTarget.x - enemy.x;
              const dz = enemy.patrolTarget.z - enemy.z;
              const pLen = Math.sqrt(dx * dx + dz * dz);
              if (pLen > 0) {
                enemy.x += (dx / pLen) * effectiveSpeed * 0.5 * dt;
                enemy.z += (dz / pLen) * effectiveSpeed * 0.5 * dt;
                enemy.angle = Math.atan2(dx, dz);
              }
            }
          }
          // Aggro check
          if (dist <= effectiveAggroRange) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          }
          break;
        }
        case EnemyState.CHASE: {
          if (isStunned || isFrozen) break;
          const behavior = enemy.behavior || EnemyBehavior.MELEE_BASIC;

          if (behavior === EnemyBehavior.RANGED) {
            const preferredDist = 10;
            const tooClose = 4;
            if (enemy.rangedCooldown === undefined) enemy.rangedCooldown = 0;
            enemy.rangedCooldown = Math.max(0, (enemy.rangedCooldown || 0) - dt);
            if (dist < tooClose) {
              const dx = enemy.x - p.x;
              const dz = enemy.z - p.z;
              const bLen = Math.sqrt(dx * dx + dz * dz);
              if (bLen > 0) { enemy.x += (dx / bLen) * effectiveSpeed * dt; enemy.z += (dz / bLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(p.x - enemy.x, p.z - enemy.z);
            } else if (dist > preferredDist + 2) {
              const dx = p.x - enemy.x; const dz = p.z - enemy.z;
              const cLen = Math.sqrt(dx * dx + dz * dz);
              if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(dx, dz);
            } else {
              enemy.angle = Math.atan2(p.x - enemy.x, p.z - enemy.z);
              if (enemy.rangedCooldown <= 0) { this._enemyFireProjectile(enemy); enemy.rangedCooldown = 2.0; }
            }
            if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
          } else if (behavior === EnemyBehavior.HEALER) {
            let healTarget: DiabloEnemy | null = null;
            let healDist = 8;
            for (const ally of this._state.enemies) {
              if (ally.id === enemy.id) continue;
              if (ally.state === EnemyState.DYING || ally.state === EnemyState.DEAD) continue;
              if (ally.hp >= ally.maxHp) continue;
              const ad = this._dist(enemy.x, enemy.z, ally.x, ally.z);
              if (ad < healDist) { healDist = ad; healTarget = ally; }
            }
            if (healTarget && dist > 3) {
              const dx = healTarget.x - enemy.x; const dz = healTarget.z - enemy.z;
              const hLen = Math.sqrt(dx * dx + dz * dz);
              if (hLen > 2) { enemy.x += (dx / hLen) * effectiveSpeed * 0.8 * dt; enemy.z += (dz / hLen) * effectiveSpeed * 0.8 * dt; }
              enemy.angle = Math.atan2(dx, dz);
              healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healTarget.maxHp * 0.05 * dt);
              enemy.healTarget = healTarget.id;
            } else {
              enemy.healTarget = null;
              if (dist <= enemy.attackRange) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; }
              else {
                const dx = p.x - enemy.x; const dz = p.z - enemy.z;
                const cLen = Math.sqrt(dx * dx + dz * dz);
                if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
                enemy.angle = Math.atan2(dx, dz);
              }
            }
            if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
          } else if (behavior === EnemyBehavior.SHIELDED) {
            if (enemy.shieldCooldown === undefined) enemy.shieldCooldown = 5;
            if (enemy.shieldActive === undefined) enemy.shieldActive = false;
            enemy.shieldCooldown = Math.max(0, (enemy.shieldCooldown || 0) - dt);
            if (enemy.shieldActive) {
              enemy.stateTimer += dt;
              if (enemy.stateTimer > 2) { enemy.shieldActive = false; enemy.shieldCooldown = 5; enemy.stateTimer = 0; }
            } else if (enemy.shieldCooldown <= 0) { enemy.shieldActive = true; enemy.stateTimer = 0; }
            if (dist <= enemy.attackRange) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; }
            else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
            else {
              const dx = p.x - enemy.x; const dz = p.z - enemy.z;
              const cLen = Math.sqrt(dx * dx + dz * dz);
              if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(dx, dz);
            }
          } else if (behavior === EnemyBehavior.FLANKER) {
            if (enemy.flankerAngle === undefined) { enemy.flankerAngle = p.angle + Math.PI * (0.5 + Math.random()); }
            const flankDist = 3;
            const targetX = p.x + Math.sin(enemy.flankerAngle) * flankDist;
            const targetZ = p.z + Math.cos(enemy.flankerAngle) * flankDist;
            const ftDist = this._dist(enemy.x, enemy.z, targetX, targetZ);
            if (ftDist < 1.5 && dist <= enemy.attackRange * 1.5) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; enemy.flankerAngle = undefined; }
            else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; enemy.flankerAngle = undefined; }
            else {
              const dx = targetX - enemy.x; const dz = targetZ - enemy.z;
              const fLen = Math.sqrt(dx * dx + dz * dz);
              if (fLen > 0) { enemy.x += (dx / fLen) * effectiveSpeed * 1.1 * dt; enemy.z += (dz / fLen) * effectiveSpeed * 1.1 * dt; }
              enemy.angle = Math.atan2(p.x - enemy.x, p.z - enemy.z);
            }
          } else {
            if (dist <= enemy.attackRange) { enemy.state = EnemyState.ATTACK; enemy.attackTimer = 0.5; enemy.stateTimer = 0; }
            else if (!enemy.isBoss && dist > enemy.aggroRange * 1.5) { enemy.state = EnemyState.IDLE; enemy.stateTimer = 0; }
            else {
              const dx = p.x - enemy.x; const dz = p.z - enemy.z;
              const cLen = Math.sqrt(dx * dx + dz * dz);
              if (cLen > 0) { enemy.x += (dx / cLen) * effectiveSpeed * dt; enemy.z += (dz / cLen) * effectiveSpeed * dt; }
              enemy.angle = Math.atan2(dx, dz);
            }
          }
          break;
        }
        case EnemyState.ATTACK: {
          if (isStunned || isFrozen) break;
          // Face player
          const adx = p.x - enemy.x;
          const adz = p.z - enemy.z;
          enemy.angle = Math.atan2(adx, adz);

          enemy.attackTimer -= dt;
          if (enemy.attackTimer <= 0) {
            if (dist <= enemy.attackRange * 1.2) {
              // Deal damage to player
              if (p.invulnTimer <= 0) {
                let rawDmg = enemy.damage;
                // Check weakened
                const isWeakened = enemy.statusEffects.some((e) => e.effect === StatusEffect.WEAKENED);
                if (isWeakened) rawDmg *= 0.7;

                const mitigated = this._applyPlayerDefenses(rawDmg, enemy.damageType);
                p.hp -= mitigated;
                this._addFloatingText(p.x, p.y + 2, p.z, `-${Math.round(mitigated)}`, "#ff4444");

                if (enemy.isBoss) {
                  this._renderer.shakeCamera(0.25, 0.3);
                }
                this._renderer.spawnParticles(ParticleType.BLOOD, p.x, p.y + 1, p.z, 3 + Math.floor(Math.random() * 3), this._state.particles);

                if (p.hp <= 0) {
                  p.hp = 0;
                  this._triggerDeath();
                  return;
                }
              }
            }
            enemy.attackTimer = 1.5;
            if (dist > enemy.attackRange * 1.5) {
              enemy.state = EnemyState.CHASE;
              enemy.stateTimer = 0;
            }
          }
          break;
        }
        case EnemyState.HURT: {
          enemy.stateTimer += dt;
          if (enemy.stateTimer >= 0.3) {
            enemy.state = EnemyState.CHASE;
            enemy.stateTimer = 0;
          }
          break;
        }
        case EnemyState.DYING: {
          enemy.deathTimer += dt;
          if (enemy.deathTimer >= 1.0) {
            enemy.state = EnemyState.DEAD;
            enemy.deathTimer = 0;
          }
          break;
        }
        case EnemyState.DEAD: {
          enemy.deathTimer += dt;
          if (enemy.deathTimer >= 3.0) {
            toRemove.push(enemy.id);
          }
          break;
        }
      }

      // Map modifier: Enemy regen
      if (this._state.activeMapModifiers.includes(MapModifier.ENEMY_REGEN)) {
        if (enemy.hp < enemy.maxHp && enemy.state !== EnemyState.DYING && enemy.state !== EnemyState.DEAD) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.02 * dt);
        }
      }
      // Keep enemies on terrain
      enemy.y = getTerrainHeight(enemy.x, enemy.z);
    }

    this._state.enemies = this._state.enemies.filter((e) => !toRemove.includes(e.id));
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE COMBAT (auto-attack targeted enemy)
  // ──────────────────────────────────────────────────────────────
  private _updateCombat(dt: number): void {
    if (!this._targetEnemyId) return;
    const p = this._state.player;
    const target = this._state.enemies.find((e) => e.id === this._targetEnemyId);
    if (!target || target.state === EnemyState.DYING || target.state === EnemyState.DEAD) {
      this._targetEnemyId = null;
      return;
    }

    const dist = this._dist(p.x, p.z, target.x, target.z);
    const attackRange = 3.0; // base melee range

    if (dist > attackRange) {
      // Move toward target if holding mouse
      if (this._mouseDown) {
        const dx = target.x - p.x;
        const dz = target.z - p.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) {
          p.x += (dx / len) * p.moveSpeed * dt;
          p.z += (dz / len) * p.moveSpeed * dt;
        }
      }
      return;
    }

    if (p.attackTimer > 0) return;

    // Calculate damage
    let baseDamage = 0;
    const weaponBonus = this._getWeaponDamage();
    switch (p.class) {
      case DiabloClass.WARRIOR:
        baseDamage = p.strength * 1.5 + weaponBonus;
        break;
      case DiabloClass.MAGE:
        baseDamage = p.intelligence * 1.2 + weaponBonus;
        break;
      case DiabloClass.RANGER:
        baseDamage = p.dexterity * 1.3 + weaponBonus;
        break;
    }

    // Check for buff
    const hasBattleCry = p.statusEffects.some((e) => e.source === "BATTLE_CRY");
    if (hasBattleCry) baseDamage *= 1.3;

    // Talent damage bonus (ad1a2850)
    const talentBonuses = this._getTalentBonuses();
    if (talentBonuses[TalentEffectType.BONUS_DAMAGE_PERCENT]) {
      baseDamage *= (1 + talentBonuses[TalentEffectType.BONUS_DAMAGE_PERCENT] / 100);
    }
    for (const buff of p.activePotionBuffs) {
      if (buff.type === PotionType.STRENGTH) baseDamage *= (1 + buff.value / 100);
    }

    // Crit check
    const isCrit = Math.random() < p.critChance;
    if (isCrit) baseDamage *= p.critDamage;

    let finalDamage = Math.max(1, baseDamage - target.armor * 0.2);
    if (target.shieldActive) finalDamage *= 0.2;
    if (target.bossShieldTimer && target.bossShieldTimer > 0) finalDamage *= 0.1;

    target.hp -= finalDamage;

    // Map modifier: Thorns
    if (this._state.activeMapModifiers.includes(MapModifier.ENEMY_THORNS)) {
      const thornsDmg = finalDamage * 0.15;
      p.hp -= thornsDmg;
      this._addFloatingText(p.x, p.y + 2, p.z, `${Math.round(thornsDmg)} thorns`, '#ff4488');
    }

    this._combatLog.push({ time: performance.now(), damage: finalDamage });

    // Floating text
    if (isCrit) {
      this._addFloatingText(target.x, target.y + 2.5, target.z, `CRIT! ${Math.round(finalDamage)}`, "#ff4444");
      this._renderer.shakeCamera(0.15, 0.2);
      this._hitFreezeTimer = 0.04; // 40ms freeze frame on crit
    } else {
      this._addFloatingText(target.x, target.y + 2, target.z, `${Math.round(finalDamage)}`, "#ffff44");
    }

    this._spawnHitParticles(target, DamageType.PHYSICAL);

    // Life steal
    const lifeStealPct = this._getLifeSteal();
    if (lifeStealPct > 0) {
      const healed = finalDamage * lifeStealPct / 100;
      p.hp = Math.min(p.maxHp, p.hp + healed);
      if (healed > 1) {
        this._renderer.spawnParticles(ParticleType.HEAL, p.x, p.y + 0.5, p.z, 5 + Math.floor(Math.random() * 4), this._state.particles);
      }
    }

    // Reset attack timer
    p.attackTimer = 1.0 / p.attackSpeed;
    p.isAttacking = true;

    // Check enemy death
    if (target.hp <= 0) {
      target.hp = 0;
      target.state = EnemyState.DYING;
      target.deathTimer = 0;
      if (target.isBoss) {
        this._slowMotionTimer = 1.5;
        this._slowMotionScale = 0.3;
        this._renderer.shakeCamera(0.8, 1.2);
      }
      const meleeXpMult = this._state.weather === Weather.CLEAR ? 1.1 : 1.0;
      p.xp += Math.floor(target.xpReward * meleeXpMult);
      const goldFromKill = Math.floor(5 + Math.random() * 10 * target.level);
      p.gold += goldFromKill;
      this._goldEarnedTotal += goldFromKill;
      this._state.killCount++;
      this._targetEnemyId = null;

      this._renderer.spawnParticles(ParticleType.DUST, target.x, target.y + 0.5, target.z, 8 + Math.floor(Math.random() * 5), this._state.particles);

      // Roll loot
      const lootItems = this._rollLoot(target);
      for (const item of lootItems) {
        const loot: DiabloLoot = {
          id: this._genId(),
          item,
          x: target.x + (Math.random() * 2 - 1),
          y: 0,
          z: target.z + (Math.random() * 2 - 1),
          timer: 0,
        };
        this._state.loot.push(loot);
      }

      // Pet XP and drops
      this._grantPetXp(Math.floor(target.xpReward * 0.5));
      this._rollPetDrop(target.isBoss);
      this._rollMaterialDrop();
    } else {
      // Stagger
      if (!target.isBoss && Math.random() < 0.3) {
        target.state = EnemyState.HURT;
        target.stateTimer = 0;
      }
    }
  }

  private _checkElementalReaction(enemy: DiabloEnemy, newEffect: StatusEffect): void {
    for (const reaction of ELEMENTAL_REACTIONS) {
      const [e1, e2] = reaction.elements;
      const hasOther = enemy.statusEffects.some(se =>
        (se.effect === e1 && newEffect === e2 as any) ||
        (se.effect === e2 && newEffect === e1 as any)
      );
      if (hasOther) {
        // Trigger reaction
        const baseDmg = reaction.damage * (1 + this._state.player.level * 0.1);
        // Damage all enemies in radius
        for (const e of this._state.enemies) {
          if (e.state === EnemyState.DYING || e.state === EnemyState.DEAD) continue;
          const dist = this._dist(enemy.x, enemy.z, e.x, e.z);
          if (dist <= reaction.radius) {
            e.hp -= baseDmg;
            this._addFloatingText(e.x, e.y + 2.5, e.z, `${reaction.result.replace('_', ' ')}!`, '#ff44ff');
            if (e.hp <= 0) this._killEnemy(e);
          }
        }
        this._renderer.shakeCamera(0.3, 0.4);
        this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 15, this._state.particles);
        // Remove consumed effects
        enemy.statusEffects = enemy.statusEffects.filter(se => se.effect !== e1 && se.effect !== e2);
        break;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  SKILL BRANCH MODIFIERS
  // ──────────────────────────────────────────────────────────────
  private _getSkillBranchModifiers(skillId: SkillId): {
    damageMult: number; cooldownMult: number; manaCostMult: number;
    aoeRadiusMult: number; extraProjectiles: number;
    statusOverride: string | null; bonusEffects: Set<string>;
  } {
    const result = {
      damageMult: 1, cooldownMult: 1, manaCostMult: 1,
      aoeRadiusMult: 1, extraProjectiles: 0,
      statusOverride: null as string | null, bonusEffects: new Set<string>(),
    };
    const branches = this._state.player.skillBranches;
    for (const bd of SKILL_BRANCHES) {
      if (bd.skillId !== skillId) continue;
      const key = `${skillId}_b${bd.tier}`;
      const choice = branches[key];
      if (!choice) continue;
      const opt = choice === 1 ? bd.optionA : bd.optionB;
      if (opt.damageMult) result.damageMult *= opt.damageMult;
      if (opt.cooldownMult) result.cooldownMult *= opt.cooldownMult;
      if (opt.manaCostMult) result.manaCostMult *= opt.manaCostMult;
      if (opt.aoeRadiusMult) result.aoeRadiusMult *= opt.aoeRadiusMult;
      if (opt.extraProjectiles) result.extraProjectiles += opt.extraProjectiles;
      if (opt.statusOverride) result.statusOverride = opt.statusOverride;
      if (opt.bonusEffect) result.bonusEffects.add(opt.bonusEffect);
    }
    return result;
  }

  // ──────────────────────────────────────────────────────────────
  //  ACTIVATE SKILL
  // ──────────────────────────────────────────────────────────────
  private _activateSkill(idx: number): void {
    const p = this._state.player;
    if (idx >= p.skills.length) return;
    const skillId = p.skills[idx];
    const def = SKILL_DEFS[skillId];
    if (!def) return;

    const cd = p.skillCooldowns.get(skillId) || 0;
    if (cd > 0) {
      this._queuedSkillIdx = idx; // Queue this skill
      return;
    }
    const branchMods = this._getSkillBranchModifiers(skillId);
    if (p.mana < Math.ceil(def.manaCost * branchMods.manaCostMult)) return;

    p.mana -= Math.ceil(def.manaCost * branchMods.manaCostMult);
    const talentBonusesCd = this._getTalentBonuses();
    const cdReduction = talentBonusesCd[TalentEffectType.SKILL_COOLDOWN_REDUCTION] || 0;
    const effectiveCooldown = def.cooldown * branchMods.cooldownMult * (1 - cdReduction / 100);
    p.skillCooldowns.set(skillId, effectiveCooldown);
    p.activeSkillId = skillId;
    p.activeSkillAnimTimer = 0.5;

    const worldMouse = this._getMouseWorldPos();
    const angle = Math.atan2(worldMouse.x - p.x, worldMouse.z - p.z);
    const baseDmg = this._getSkillDamage(def);
    const modDmg = baseDmg * branchMods.damageMult;
    const modRadius = (r: number) => r * branchMods.aoeRadiusMult;
    const modStatus = branchMods.statusOverride
      ? branchMods.statusOverride as StatusEffect
      : def.statusEffect;

    switch (skillId) {
      // ── PROJECTILE SKILLS ──
      case SkillId.FIREBALL:
      case SkillId.LIGHTNING_BOLT:
      case SkillId.POISON_ARROW:
      case SkillId.PIERCING_SHOT:
      case SkillId.SMITE:
      case SkillId.BONE_SPEAR:
      case SkillId.HOLY_BOLT:
      case SkillId.SPIRIT_BARRAGE:
      case SkillId.CRIPPLING_THROW: {
        this._createProjectile(p.x, p.y + 1, p.z, angle, modDmg, def, skillId);
        // Branch effect: extra projectiles for projectile skills
        if (branchMods.extraProjectiles > 0) {
          for (let i = 1; i <= branchMods.extraProjectiles; i++) {
            const offsetAngle = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 0.15;
            this._createProjectile(p.x, p.y + 1, p.z, angle + offsetAngle, modDmg, def, skillId);
          }
        }
        // Branch effect: HEAL_ON_BURN
        if (branchMods.bonusEffects.has('HEAL_ON_BURN')) {
          p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.10));
          this._addFloatingText(p.x, p.y + 3, p.z, `+${Math.round(p.maxHp * 0.10)} HP`, "#44ff44");
        }
        // Branch effect: GUARANTEED_CRIT
        if (branchMods.bonusEffects.has('GUARANTEED_CRIT')) {
          // Damage already boosted via damageMult; add visual cue
          this._addFloatingText(p.x, p.y + 3, p.z, "CRITICAL!", "#ff4444");
        }
        break;
      }

      case SkillId.MULTI_SHOT: {
        const spread = 0.3;
        const arrowCount = 5 + branchMods.extraProjectiles;
        const half = Math.floor(arrowCount / 2);
        for (let i = -half; i <= half; i++) {
          this._createProjectile(p.x, p.y + 1, p.z, angle + i * spread, modDmg * 0.8, def, skillId);
        }
        break;
      }

      case SkillId.CHAIN_LIGHTNING: {
        // Fires a projectile that, on hit, chains to nearby enemies
        this._createProjectile(p.x, p.y + 1, p.z, angle, modDmg, def, skillId);
        break;
      }

      // ── AOE AT PLAYER ──
      case SkillId.CLEAVE:
      case SkillId.WHIRLWIND:
      case SkillId.ICE_NOVA:
      case SkillId.GROUND_SLAM:
      case SkillId.BLADE_FURY:
      case SkillId.SHIELD_BASH:
      case SkillId.HOLY_STRIKE:
      case SkillId.CONSECRATION:
      case SkillId.JUDGMENT:
      case SkillId.HOLY_NOVA:
      case SkillId.CORPSE_EXPLOSION:
      case SkillId.DEATH_NOVA:
      case SkillId.POISON_NOVA:
      case SkillId.SHADOW_STAB:
      case SkillId.FAN_OF_KNIVES:
      case SkillId.BLADE_FLURRY:
      case SkillId.VENOMOUS_STRIKE:
      case SkillId.BLADE_DANCE:
      case SkillId.BLESSED_HAMMER:
      case SkillId.LIFE_TAP: {
        const radius = modRadius(def.aoeRadius || 3);
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: p.x,
          y: 0,
          z: p.z,
          radius,
          damage: modDmg,
          damageType: def.damageType,
          duration: 0.3,
          timer: 0,
          ownerId: "player",
          tickInterval: 0.3,
          lastTickTimer: 0,
          statusEffect: modStatus,
        };
        this._state.aoeEffects.push(aoe);
        // Immediate damage tick for melee AOE
        this._tickAOEDamage(aoe);
        // Visual burst for melee AoE skills
        if (skillId === SkillId.WHIRLWIND) {
          this._renderer.shakeCamera(0.2, 0.3);
          this._renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 10, this._state.particles);
          this._renderer.spawnParticles(ParticleType.SPARK, p.x, 0.5, p.z, 6, this._state.particles);
        } else if (skillId === SkillId.ICE_NOVA) {
          this._renderer.shakeCamera(0.25, 0.35);
          this._renderer.spawnParticles(ParticleType.ICE, p.x, 0.5, p.z, 15, this._state.particles);
          this._renderer.spawnParticles(ParticleType.ICE, p.x, 1.0, p.z, 8, this._state.particles);
        } else if (skillId === SkillId.GROUND_SLAM) {
          this._renderer.shakeCamera(0.35, 0.5);
          this._renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 15, this._state.particles);
          this._renderer.spawnParticles(ParticleType.SPARK, p.x, 0.3, p.z, 8, this._state.particles);
        } else if (skillId === SkillId.BLADE_FURY) {
          this._renderer.shakeCamera(0.15, 0.25);
          this._renderer.spawnParticles(ParticleType.SPARK, p.x, 1.0, p.z, 10, this._state.particles);
        } else if (skillId === SkillId.SHIELD_BASH) {
          this._renderer.shakeCamera(0.2, 0.2);
          this._renderer.spawnParticles(ParticleType.SPARK, p.x, 1.0, p.z, 6, this._state.particles);
        }
        // Branch effect: LIFE_STEAL_AOE — heal 15% of damage dealt
        if (branchMods.bonusEffects.has('LIFE_STEAL_AOE')) {
          const healAmt = Math.round(modDmg * 0.15);
          p.hp = Math.min(p.maxHp, p.hp + healAmt);
          this._addFloatingText(p.x, p.y + 3, p.z, `+${healAmt} HP`, "#44ff44");
        }
        // Branch effect: GUARANTEED_CRIT — multiply by crit damage
        if (branchMods.bonusEffects.has('GUARANTEED_CRIT')) {
          this._addFloatingText(p.x, p.y + 3, p.z, "CRITICAL!", "#ff4444");
        }
        // Branch effect: EXECUTE_LOW_HP
        if (branchMods.bonusEffects.has('EXECUTE_LOW_HP')) {
          this._addFloatingText(p.x, p.y + 3.5, p.z, "EXECUTE!", "#ff2222");
        }
        break;
      }

      // ── AOE AT TARGET ──
      case SkillId.METEOR: {
        const radius = modRadius(def.aoeRadius || 6);
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: worldMouse.x,
          y: 0,
          z: worldMouse.z,
          radius,
          damage: modDmg,
          damageType: def.damageType,
          duration: 1.5,
          timer: 0,
          ownerId: "player",
          tickInterval: 0.5,
          lastTickTimer: 0,
          statusEffect: modStatus,
        };
        this._state.aoeEffects.push(aoe);
        // Massive meteor impact visuals
        this._renderer.shakeCamera(0.6, 0.8);
        this._renderer.spawnParticles(ParticleType.FIRE, worldMouse.x, 0.5, worldMouse.z, 25, this._state.particles);
        this._renderer.spawnParticles(ParticleType.FIRE, worldMouse.x, 1.5, worldMouse.z, 15, this._state.particles);
        this._renderer.spawnParticles(ParticleType.DUST, worldMouse.x, 0, worldMouse.z, 12, this._state.particles);
        this._renderer.spawnParticles(ParticleType.SPARK, worldMouse.x, 1.0, worldMouse.z, 10, this._state.particles);
        break;
      }

      case SkillId.RAIN_OF_ARROWS: {
        const radius = modRadius(def.aoeRadius || 6);
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: worldMouse.x,
          y: 0,
          z: worldMouse.z,
          radius,
          damage: modDmg,
          damageType: def.damageType,
          duration: 2.0,
          timer: 0,
          ownerId: "player",
          tickInterval: 0.4,
          lastTickTimer: 0,
          statusEffect: modStatus,
        };
        this._state.aoeEffects.push(aoe);
        break;
      }

      case SkillId.EXPLOSIVE_TRAP: {
        const radius = modRadius(def.aoeRadius || 4);
        const trapStatus = modStatus || StatusEffect.BURNING;
        const aoe: DiabloAOE = {
          id: this._genId(),
          x: worldMouse.x,
          y: 0,
          z: worldMouse.z,
          radius,
          damage: modDmg,
          damageType: def.damageType,
          duration: 10.0, // trap lasts 10 seconds
          timer: 0,
          ownerId: "player",
          tickInterval: 10.0, // only triggers once
          lastTickTimer: 0,
          statusEffect: trapStatus,
        };
        this._state.aoeEffects.push(aoe);
        break;
      }

      // ── BUFFS ──
      case SkillId.BATTLE_CRY: {
        p.statusEffects.push({
          effect: StatusEffect.STUNNED, // Placeholder effect type; source is what matters
          duration: 10,
          source: "BATTLE_CRY",
        });
        this._addFloatingText(p.x, p.y + 3, p.z, "BATTLE CRY!", "#ffd700");
        // Branch effect: BUFF_ATTACK_SPEED
        if (branchMods.bonusEffects.has('BUFF_ATTACK_SPEED')) {
          p.attackSpeed *= 1.3;
          this._addFloatingText(p.x, p.y + 3.5, p.z, "Attack Speed UP!", "#88ff88");
        }
        // Branch effect: DEBUFF_ENEMIES
        if (branchMods.bonusEffects.has('DEBUFF_ENEMIES')) {
          this._addFloatingText(p.x, p.y + 3.5, p.z, "Enemies Weakened!", "#ff8844");
        }
        // Branch effect: HEAL_ON_CRY
        if (branchMods.bonusEffects.has('HEAL_ON_CRY')) {
          const healAmt = Math.round(p.maxHp * 0.10);
          p.hp = Math.min(p.maxHp, p.hp + healAmt);
          this._addFloatingText(p.x, p.y + 4, p.z, `+${healAmt} HP`, "#44ff44");
        }
        // Branch effect: BERSERKER_MODE
        if (branchMods.bonusEffects.has('BERSERKER_MODE')) {
          this._addFloatingText(p.x, p.y + 4, p.z, "BERSERKER!", "#ff2222");
        }
        break;
      }

      case SkillId.ARCANE_SHIELD:
      case SkillId.DIVINE_SHIELD:
      case SkillId.AVENGING_WRATH:
      case SkillId.LAY_ON_HANDS:
      case SkillId.AEGIS_OF_LIGHT:
      case SkillId.RIGHTEOUS_FURY:
      case SkillId.RAISE_SKELETON:
      case SkillId.BLOOD_GOLEM:
      case SkillId.ARMY_OF_THE_DEAD:
      case SkillId.BONE_ARMOR:
      case SkillId.REVIVE:
      case SkillId.SMOKE_SCREEN:
      case SkillId.DEATH_MARK:
      case SkillId.SHADOW_CLONE:
      case SkillId.VANISH:
      case SkillId.ASSASSINATE:
      case SkillId.EXECUTE:
      case SkillId.CURSE_OF_FRAILTY: {
        p.invulnTimer = 8;
        const buffName = def.name || skillId;
        this._addFloatingText(p.x, p.y + 3, p.z, `${buffName}!`, "#aa44ff");
        break;
      }

      case SkillId.EVASIVE_ROLL: {
        // Dash forward, brief invuln
        const dashDist = 6;
        p.x += Math.sin(angle) * dashDist;
        p.z += Math.cos(angle) * dashDist;
        p.invulnTimer = 0.8;
        this._addFloatingText(p.x, p.y + 2, p.z, "DODGE!", "#44ff44");
        break;
      }

      // ── WARRIOR UNLOCKABLE SKILLS ──
      case SkillId.LEAP: {
        // Leap to target location, AOE on landing
        const leapDist = Math.min(12, Math.sqrt((worldMouse.x - p.x) ** 2 + (worldMouse.z - p.z) ** 2));
        p.x += Math.sin(angle) * leapDist;
        p.z += Math.cos(angle) * leapDist;
        p.invulnTimer = 0.5;
        const radius = modRadius(def.aoeRadius || 4);
        const aoe: DiabloAOE = {
          id: this._genId(), x: p.x, y: 0, z: p.z, radius,
          damage: modDmg, damageType: def.damageType, duration: 0.3, timer: 0,
          ownerId: "player", tickInterval: 0.3, lastTickTimer: 0, statusEffect: modStatus,
        };
        this._state.aoeEffects.push(aoe);
        this._tickAOEDamage(aoe);
        this._addFloatingText(p.x, p.y + 3, p.z, "LEAP!", "#ffd700");
        this._renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 10, this._state.particles);
        // Clamp to map bounds
        const mapLeap = MAP_CONFIGS[this._state.currentMap];
        p.x = Math.max(-mapLeap.width / 2, Math.min(mapLeap.width / 2, p.x));
        p.z = Math.max(-((mapLeap as any).depth || mapLeap.width) / 2, Math.min(((mapLeap as any).depth || mapLeap.width) / 2, p.z));
        break;
      }

      case SkillId.IRON_SKIN: {
        p.statusEffects.push({ effect: StatusEffect.STUNNED, duration: 8, source: "IRON_SKIN" });
        this._addFloatingText(p.x, p.y + 3, p.z, "IRON SKIN!", "#aaaaff");
        // Temporary armor boost handled via source check in damage calc
        break;
      }

      case SkillId.TAUNT: {
        const tauntRadius = modRadius(def.aoeRadius || 8);
        for (const enemy of this._state.enemies) {
          const d = this._dist(p.x, p.z, enemy.x, enemy.z);
          if (d < tauntRadius && enemy.state !== EnemyState.DEAD && enemy.state !== EnemyState.DYING) {
            enemy.state = EnemyState.CHASE;
            enemy.targetId = "player";
          }
        }
        this._addFloatingText(p.x, p.y + 3, p.z, "TAUNT!", "#ff8844");
        break;
      }

      case SkillId.CRUSHING_BLOW: {
        // Single target melee — use AOE with tiny radius
        const cbRadius = modRadius(2.5);
        const cbAoe: DiabloAOE = {
          id: this._genId(), x: p.x + Math.sin(angle) * 2, y: 0, z: p.z + Math.cos(angle) * 2,
          radius: cbRadius, damage: modDmg, damageType: def.damageType, duration: 0.2, timer: 0,
          ownerId: "player", tickInterval: 0.2, lastTickTimer: 0, statusEffect: modStatus,
        };
        this._state.aoeEffects.push(cbAoe);
        this._tickAOEDamage(cbAoe);
        this._addFloatingText(p.x, p.y + 3, p.z, "CRUSH!", "#ff4444");
        break;
      }

      case SkillId.INTIMIDATING_ROAR:
      case SkillId.EARTHQUAKE:
      case SkillId.FROST_BARRIER:
      case SkillId.MANA_SIPHON:
      case SkillId.TIME_WARP:
      case SkillId.NET_TRAP: {
        // AOE centered on player (or target for NET_TRAP)
        const aoeCenterX = skillId === SkillId.NET_TRAP ? worldMouse.x : p.x;
        const aoeCenterZ = skillId === SkillId.NET_TRAP ? worldMouse.z : p.z;
        const aoeR = modRadius(def.aoeRadius || 6);
        const bigAoe: DiabloAOE = {
          id: this._genId(), x: aoeCenterX, y: 0, z: aoeCenterZ, radius: aoeR,
          damage: modDmg, damageType: def.damageType,
          duration: def.duration || 1.0, timer: 0,
          ownerId: "player", tickInterval: 0.5, lastTickTimer: 0, statusEffect: modStatus,
        };
        this._state.aoeEffects.push(bigAoe);
        this._tickAOEDamage(bigAoe);
        const labels: Partial<Record<SkillId, string>> = {
          [SkillId.INTIMIDATING_ROAR]: "ROAR!",
          [SkillId.EARTHQUAKE]: "EARTHQUAKE!",
          [SkillId.FROST_BARRIER]: "FROST BARRIER!",
          [SkillId.MANA_SIPHON]: "SIPHON!",
          [SkillId.TIME_WARP]: "TIME WARP!",
          [SkillId.NET_TRAP]: "TRAPPED!",
        };
        this._addFloatingText(p.x, p.y + 3, p.z, labels[skillId] || "!", "#44ffff");
        // Mana Siphon: restore mana
        if (skillId === SkillId.MANA_SIPHON) {
          const manaGain = Math.round(p.maxMana * 0.25);
          p.mana = Math.min(p.maxMana, p.mana + manaGain);
          const hpGain = Math.round(p.maxHp * 0.10);
          p.hp = Math.min(p.maxHp, p.hp + hpGain);
          this._addFloatingText(p.x, p.y + 3.5, p.z, `+${manaGain} Mana +${hpGain} HP`, "#4488ff");
        }
        if (skillId === SkillId.EARTHQUAKE) {
          this._renderer.shakeCamera(0.7, 1.0);
          this._renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 25, this._state.particles);
          this._renderer.spawnParticles(ParticleType.DUST, p.x + 2, 0, p.z + 2, 10, this._state.particles);
          this._renderer.spawnParticles(ParticleType.DUST, p.x - 2, 0, p.z - 2, 10, this._state.particles);
          this._renderer.spawnParticles(ParticleType.SPARK, p.x, 0.3, p.z, 8, this._state.particles);
        }
        if (skillId === SkillId.FROST_BARRIER) {
          this._renderer.shakeCamera(0.2, 0.3);
          this._renderer.spawnParticles(ParticleType.ICE, p.x, 0.5, p.z, 12, this._state.particles);
        }
        if (skillId === SkillId.TIME_WARP) {
          this._renderer.shakeCamera(0.15, 0.25);
          this._renderer.spawnParticles(ParticleType.SPARK, p.x, 1.0, p.z, 10, this._state.particles);
        }
        if (skillId === SkillId.INTIMIDATING_ROAR) {
          this._renderer.shakeCamera(0.3, 0.4);
          this._renderer.spawnParticles(ParticleType.DUST, p.x, 0.5, p.z, 8, this._state.particles);
        }
        break;
      }

      // ── MAGE UNLOCKABLE SKILLS ──
      case SkillId.SUMMON_ELEMENTAL: {
        // Spawn a temporary allied "elemental" enemy that fights for the player
        // Implemented as a series of AOE ticks around a projected point
        const summonX = p.x + Math.sin(angle) * 3;
        const summonZ = p.z + Math.cos(angle) * 3;
        const elemAoe: DiabloAOE = {
          id: this._genId(), x: summonX, y: 0, z: summonZ,
          radius: modRadius(3), damage: modDmg,
          damageType: def.damageType, duration: 15, timer: 0,
          ownerId: "player", tickInterval: 1.5, lastTickTimer: 0,
          statusEffect: modStatus || StatusEffect.BURNING,
        };
        this._state.aoeEffects.push(elemAoe);
        this._addFloatingText(summonX, 2, summonZ, "ELEMENTAL!", "#ff8844");
        this._renderer.spawnParticles(ParticleType.FIRE, summonX, 0.5, summonZ, 12, this._state.particles);
        break;
      }

      case SkillId.BLINK: {
        // Teleport to target location
        const blinkDist = Math.min(15, Math.sqrt((worldMouse.x - p.x) ** 2 + (worldMouse.z - p.z) ** 2));
        // Damage at departure point
        if (modDmg > 0) {
          const departAoe: DiabloAOE = {
            id: this._genId(), x: p.x, y: 0, z: p.z,
            radius: modRadius(def.aoeRadius || 2), damage: modDmg,
            damageType: DamageType.ARCANE, duration: 0.3, timer: 0,
            ownerId: "player", tickInterval: 0.3, lastTickTimer: 0,
          };
          this._state.aoeEffects.push(departAoe);
          this._tickAOEDamage(departAoe);
        }
        this._renderer.spawnParticles(ParticleType.SPARK, p.x, 1, p.z, 8, this._state.particles);
        p.x += Math.sin(angle) * blinkDist;
        p.z += Math.cos(angle) * blinkDist;
        p.invulnTimer = 0.3;
        // Clamp to map bounds
        const mapBlink = MAP_CONFIGS[this._state.currentMap];
        p.x = Math.max(-mapBlink.width / 2, Math.min(mapBlink.width / 2, p.x));
        p.z = Math.max(-((mapBlink as any).depth || mapBlink.width) / 2, Math.min(((mapBlink as any).depth || mapBlink.width) / 2, p.z));
        this._renderer.spawnParticles(ParticleType.SPARK, p.x, 1, p.z, 8, this._state.particles);
        this._addFloatingText(p.x, p.y + 3, p.z, "BLINK!", "#aa44ff");
        break;
      }

      case SkillId.ARCANE_MISSILES: {
        // Fire multiple projectiles in a spread
        const missileCount = 5 + branchMods.extraProjectiles;
        const spread = 0.2;
        const half = Math.floor(missileCount / 2);
        for (let i = -half; i <= half; i++) {
          if (missileCount % 2 === 0 && i === 0) continue;
          this._createProjectile(p.x, p.y + 1, p.z, angle + i * spread, modDmg * 0.6, def, skillId);
        }
        this._addFloatingText(p.x, p.y + 3, p.z, "ARCANE MISSILES!", "#aa44ff");
        break;
      }

      // ── RANGER UNLOCKABLE SKILLS ──
      case SkillId.GRAPPLING_HOOK: {
        // Dash to target location
        const hookDist = Math.min(15, Math.sqrt((worldMouse.x - p.x) ** 2 + (worldMouse.z - p.z) ** 2));
        p.x += Math.sin(angle) * hookDist;
        p.z += Math.cos(angle) * hookDist;
        p.invulnTimer = 0.3;
        // Clamp to map bounds
        const mapHook = MAP_CONFIGS[this._state.currentMap];
        p.x = Math.max(-mapHook.width / 2, Math.min(mapHook.width / 2, p.x));
        p.z = Math.max(-((mapHook as any).depth || mapHook.width) / 2, Math.min(((mapHook as any).depth || mapHook.width) / 2, p.z));
        // Damage on arrival
        if (modDmg > 0) {
          const hookAoe: DiabloAOE = {
            id: this._genId(), x: p.x, y: 0, z: p.z,
            radius: 2, damage: modDmg,
            damageType: def.damageType, duration: 0.2, timer: 0,
            ownerId: "player", tickInterval: 0.2, lastTickTimer: 0,
          };
          this._state.aoeEffects.push(hookAoe);
          this._tickAOEDamage(hookAoe);
        }
        this._addFloatingText(p.x, p.y + 2, p.z, "HOOK!", "#88ff44");
        break;
      }

      case SkillId.CAMOUFLAGE: {
        p.invulnTimer = 5;
        p.statusEffects.push({ effect: StatusEffect.STUNNED, duration: 5, source: "CAMOUFLAGE" });
        // Drop aggro from all enemies
        for (const enemy of this._state.enemies) {
          if (enemy.state === EnemyState.CHASE) {
            enemy.state = EnemyState.IDLE;
            enemy.stateTimer = 0;
          }
        }
        this._addFloatingText(p.x, p.y + 3, p.z, "CAMOUFLAGE!", "#44aa44");
        break;
      }

      case SkillId.FIRE_VOLLEY: {
        const arrowCount = 7 + branchMods.extraProjectiles;
        const fvSpread = 0.25;
        const fvHalf = Math.floor(arrowCount / 2);
        for (let i = -fvHalf; i <= fvHalf; i++) {
          this._createProjectile(p.x, p.y + 1, p.z, angle + i * fvSpread, modDmg * 0.7, def, skillId);
        }
        this._addFloatingText(p.x, p.y + 3, p.z, "FIRE VOLLEY!", "#ff6622");
        break;
      }

      case SkillId.WIND_WALK: {
        p.statusEffects.push({ effect: StatusEffect.STUNNED, duration: 5, source: "WIND_WALK" });
        p.moveSpeed *= 1.8;
        p.invulnTimer = 0.5;
        this._addFloatingText(p.x, p.y + 3, p.z, "WIND WALK!", "#88ffff");
        break;
      }

      case SkillId.SHADOW_STRIKE: {
        // Find nearest enemy and teleport behind them
        let nearestEnemy: DiabloEnemy | null = null;
        let nearestDist = 12;
        for (const enemy of this._state.enemies) {
          if (enemy.state === EnemyState.DEAD || enemy.state === EnemyState.DYING) continue;
          const d = this._dist(p.x, p.z, enemy.x, enemy.z);
          if (d < nearestDist) {
            nearestDist = d;
            nearestEnemy = enemy;
          }
        }
        if (nearestEnemy) {
          const behindAngle = Math.atan2(p.x - nearestEnemy.x, p.z - nearestEnemy.z);
          p.x = nearestEnemy.x + Math.sin(behindAngle) * 1.5;
          p.z = nearestEnemy.z + Math.cos(behindAngle) * 1.5;
          // Deal damage
          const ssAoe: DiabloAOE = {
            id: this._genId(), x: nearestEnemy.x, y: 0, z: nearestEnemy.z,
            radius: modRadius(2), damage: modDmg,
            damageType: def.damageType, duration: 0.2, timer: 0,
            ownerId: "player", tickInterval: 0.2, lastTickTimer: 0,
          };
          this._state.aoeEffects.push(ssAoe);
          this._tickAOEDamage(ssAoe);
          this._addFloatingText(nearestEnemy.x, 3, nearestEnemy.z, "BACKSTAB!", "#ff44ff");
          this._renderer.spawnParticles(ParticleType.SPARK, nearestEnemy.x, 1, nearestEnemy.z, 8, this._state.particles);
        } else {
          this._addFloatingText(p.x, p.y + 2, p.z, "No target!", "#ff4444");
          // Refund mana
          p.mana = Math.min(p.maxMana, p.mana + Math.ceil(def.manaCost * branchMods.manaCostMult));
          p.skillCooldowns.set(skillId, 0);
        }
        break;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE PROJECTILES
  // ──────────────────────────────────────────────────────────────
  private _updateProjectiles(dt: number): void {
    const toRemove: string[] = [];

    for (const proj of this._state.projectiles) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.z += proj.vz * dt;
      proj.lifetime += dt;

      if (proj.lifetime > proj.maxLifetime) {
        toRemove.push(proj.id);
        continue;
      }

      // Bounds check
      const mapCfg = MAP_CONFIGS[this._state.currentMap];
      const halfW = mapCfg.width / 2 + 10;
      if (Math.abs(proj.x) > halfW || Math.abs(proj.z) > halfW) {
        toRemove.push(proj.id);
        continue;
      }

      if (proj.isPlayerOwned) {
        let hitCount = 0;
        for (const enemy of this._state.enemies) {
          if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
          const dist = this._dist(proj.x, proj.z, enemy.x, enemy.z);
          if (dist < proj.radius + 0.5) {
            // Hit
            let finalDmg = Math.max(1, proj.damage - enemy.armor * 0.15);
            if (enemy.shieldActive) finalDmg *= 0.2;
            if (enemy.bossShieldTimer && enemy.bossShieldTimer > 0) finalDmg *= 0.1;
            enemy.hp -= finalDmg;
            this._addFloatingText(enemy.x, enemy.y + 2, enemy.z, `${Math.round(finalDmg)}`, "#ffff44");

            this._spawnHitParticles(enemy, proj.damageType);
            this._renderer.shakeCamera(0.08, 0.1);

            // Apply status effect if applicable
            const def = proj.skillId ? SKILL_DEFS[proj.skillId] : null;
            if (def && def.statusEffect) {
              enemy.statusEffects.push({
                effect: def.statusEffect,
                duration: 3,
                source: proj.skillId || "projectile",
              });
              this._checkElementalReaction(enemy, def.statusEffect);
            }

            // Chain lightning bounce
            if (proj.skillId === SkillId.CHAIN_LIGHTNING) {
              this._chainLightningBounce(enemy, proj.damage * 0.7, 4);
            }

            if (enemy.hp <= 0) {
              this._killEnemy(enemy);
            } else if (!enemy.isBoss && Math.random() < 0.2) {
              enemy.state = EnemyState.HURT;
              enemy.stateTimer = 0;
            }

            hitCount++;
            // Piercing shot can hit up to 5
            if (proj.skillId === SkillId.PIERCING_SHOT) {
              if (hitCount >= 5) {
                toRemove.push(proj.id);
                break;
              }
            } else {
              toRemove.push(proj.id);
              break;
            }
          }
        }
      } else {
        const pp = this._state.player;
        if (pp.invulnTimer <= 0) {
          const dist = this._dist(proj.x, proj.z, pp.x, pp.z);
          if (dist < proj.radius + 0.5) {
            const mitigated = Math.max(1, proj.damage - pp.armor * 0.3);
            pp.hp -= mitigated;
            this._addFloatingText(pp.x, pp.y + 2, pp.z, `-${Math.round(mitigated)}`, "#ff4444");
            toRemove.push(proj.id);
            if (pp.hp <= 0) {
              pp.hp = 0;
              this._triggerDeath();
              break;
            }
          }
        }
      }
    }

    this._state.projectiles = this._state.projectiles.filter((p) => !toRemove.includes(p.id));
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE AOE
  // ──────────────────────────────────────────────────────────────
  private _updateAOE(dt: number): void {
    const toRemove: string[] = [];

    for (const aoe of this._state.aoeEffects) {
      aoe.timer += dt;
      aoe.lastTickTimer += dt;

      if (aoe.lastTickTimer >= aoe.tickInterval) {
        this._tickAOEDamage(aoe);
        aoe.lastTickTimer = 0;
      }

      // Explosive trap proximity trigger
      if (aoe.tickInterval >= 10) {
        for (const enemy of this._state.enemies) {
          if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
          const dist = this._dist(aoe.x, aoe.z, enemy.x, enemy.z);
          if (dist < aoe.radius) {
            this._tickAOEDamage(aoe);
            aoe.timer = aoe.duration; // Force removal
            break;
          }
        }
      }

      if (aoe.timer >= aoe.duration) {
        toRemove.push(aoe.id);
      }
    }

    this._state.aoeEffects = this._state.aoeEffects.filter((a) => !toRemove.includes(a.id));
  }

  private _tickAOEDamage(aoe: DiabloAOE): void {
    if (aoe.ownerId === "player") {
      for (const enemy of this._state.enemies) {
        if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
        const dist = this._dist(aoe.x, aoe.z, enemy.x, enemy.z);
        if (dist <= aoe.radius) {
          const finalDmg = Math.max(1, aoe.damage - enemy.armor * 0.15);
          enemy.hp -= finalDmg;
          this._addFloatingText(enemy.x, enemy.y + 2, enemy.z, `${Math.round(finalDmg)}`, "#ff8844");

          this._spawnHitParticles(enemy, aoe.damageType);
          // Spawn extra AoE impact particles based on damage type
          switch (aoe.damageType) {
            case DamageType.FIRE:
              this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 0.5, enemy.z, 4 + Math.floor(Math.random() * 3), this._state.particles);
              break;
            case DamageType.ICE:
              this._renderer.spawnParticles(ParticleType.ICE, enemy.x, enemy.y + 0.5, enemy.z, 4 + Math.floor(Math.random() * 3), this._state.particles);
              break;
            case DamageType.LIGHTNING:
              this._renderer.spawnParticles(ParticleType.LIGHTNING, enemy.x, enemy.y + 0.5, enemy.z, 3 + Math.floor(Math.random() * 3), this._state.particles);
              this._renderer.spawnParticles(ParticleType.SPARK, enemy.x, enemy.y + 1, enemy.z, 2, this._state.particles);
              break;
            case DamageType.POISON:
              this._renderer.spawnParticles(ParticleType.POISON, enemy.x, enemy.y + 0.3, enemy.z, 3 + Math.floor(Math.random() * 2), this._state.particles);
              break;
          }
          this._renderer.shakeCamera(0.15, 0.2);

          if (aoe.statusEffect) {
            const existing = enemy.statusEffects.find((e) => e.effect === aoe.statusEffect);
            if (existing) {
              existing.duration = Math.max(existing.duration, 3);
            } else {
              enemy.statusEffects.push({
                effect: aoe.statusEffect,
                duration: 3,
                source: "aoe",
              });
              this._checkElementalReaction(enemy, aoe.statusEffect!);
            }
          }

          if (enemy.hp <= 0) {
            this._killEnemy(enemy);
          }
        }
      }
    } else {
      const pp = this._state.player;
      if (pp.invulnTimer <= 0) {
        const dist = this._dist(aoe.x, aoe.z, pp.x, pp.z);
        if (dist <= aoe.radius) {
          const mitigated = Math.max(1, aoe.damage - pp.armor * 0.3);
          pp.hp -= mitigated;
          this._addFloatingText(pp.x, pp.y + 2, pp.z, `-${Math.round(mitigated)}`, "#ff4444");
          if (pp.hp <= 0) { pp.hp = 0; this._triggerDeath(); }
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE LOOT
  // ──────────────────────────────────────────────────────────────
  private _updateLoot(dt: number): void {
    const p = this._state.player;
    const toRemove: string[] = [];

    for (const loot of this._state.loot) {
      loot.timer += dt;

      // Loot filter: hide filtered items
      const rarityOrder = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.LEGENDARY, ItemRarity.MYTHIC, ItemRarity.DIVINE];
      const minRarityIdx = this._lootFilterLevel === LootFilterLevel.HIDE_COMMON ? 1 :
        this._lootFilterLevel === LootFilterLevel.RARE_PLUS ? 2 :
        this._lootFilterLevel === LootFilterLevel.EPIC_PLUS ? 3 : 0;
      if (rarityOrder.indexOf(loot.item.rarity) < minRarityIdx) continue;

      // Auto-pickup within 2 units
      const dist = this._dist(p.x, p.z, loot.x, loot.z);
      if (dist < 2) {
        const emptyIdx = p.inventory.findIndex((s) => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = { ...loot.item, id: this._genId() };
          this._addFloatingText(p.x, p.y + 2.5, p.z, `+${loot.item.name}`, RARITY_CSS[loot.item.rarity]);
          toRemove.push(loot.id);
        }
      }

      // Expire after 60 seconds
      if (loot.timer > 60) {
        toRemove.push(loot.id);
      }
    }

    this._state.loot = this._state.loot.filter((l) => !toRemove.includes(l.id));
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE SPAWNING
  // ──────────────────────────────────────────────────────────────
  private _updateSpawning(dt: number): void {
    if (this._state.currentMap === DiabloMapId.CAMELOT) return;

    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const spawnInterval = (mapCfg as any).spawnInterval || 4;

    this._state.spawnTimer += dt;
    const effectiveMaxEnemies = Math.round(mapCfg.maxEnemies * DIFFICULTY_CONFIGS[this._state.difficulty].maxEnemiesMult);
    if (this._state.spawnTimer >= spawnInterval && this._state.enemies.length < effectiveMaxEnemies) {
      this._spawnEnemy();
      this._state.spawnTimer = 0;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE STATUS EFFECTS
  // ──────────────────────────────────────────────────────────────
  private _updateStatusEffects(dt: number): void {
    const p = this._state.player;

    // Player effects
    for (let i = p.statusEffects.length - 1; i >= 0; i--) {
      const eff = p.statusEffects[i];
      eff.duration -= dt;

      switch (eff.effect) {
        case StatusEffect.BURNING:
          p.hp -= 5 * dt;
          if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
          break;
        case StatusEffect.POISONED:
          p.hp -= 3 * dt;
          if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
          break;
        case StatusEffect.BLEEDING:
          p.hp -= 4 * dt;
          if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); return; }
          break;
        case StatusEffect.FROZEN:
          p.moveSpeed = 0;
          break;
        case StatusEffect.SLOWED:
          // Handled in movement calc below
          break;
      }

      if (eff.duration <= 0) {
        p.statusEffects.splice(i, 1);
      }
    }

    // Restore speed if no longer frozen
    if (!p.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) {
      this._recalculatePlayerStats();
    }

    // Enemy effects
    for (const enemy of this._state.enemies) {
      if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
      for (let i = enemy.statusEffects.length - 1; i >= 0; i--) {
        const eff = enemy.statusEffects[i];
        eff.duration -= dt;

        switch (eff.effect) {
          case StatusEffect.BURNING:
            enemy.hp -= 5 * dt;
            break;
          case StatusEffect.POISONED:
            enemy.hp -= 3 * dt;
            break;
          case StatusEffect.BLEEDING:
            enemy.hp -= 4 * dt;
            break;
        }

        if (enemy.hp <= 0) {
          this._killEnemy(enemy);
        }

        if (eff.duration <= 0) {
          enemy.statusEffects.splice(i, 1);
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  UPDATE FLOATING TEXT
  // ──────────────────────────────────────────────────────────────
  private _updateFloatingText(dt: number): void {
    for (let i = this._state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this._state.floatingTexts[i];
      ft.timer += dt;
      // Lively arc: fast upward initially, decelerating + slight horizontal drift
      const t = ft.timer;
      ft.vy = Math.max(0.3, ft.vy - 3.5 * dt); // decelerate
      ft.y += ft.vy * dt * 3;
      // Horizontal scatter (seeded by id hash)
      const idHash = ft.id.charCodeAt(0) + ft.id.charCodeAt(ft.id.length - 1);
      ft.x += Math.sin(t * 4 + idHash) * 0.3 * dt;
      ft.z += Math.cos(t * 3 + idHash * 0.7) * 0.2 * dt;
      if (ft.timer > 1.8) {
        this._state.floatingTexts.splice(i, 1);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  TOWNFOLK
  // ──────────────────────────────────────────────────────────────

  private _spawnCamelotTownfolk(): void {
    this._state.townfolk = [];
    const roles: Array<{ role: TownfolkRole; name: string; x: number; z: number; radius: number }> = [
      // Market area townsfolk
      { role: 'peasant', name: 'Peasant', x: -5, z: 5, radius: 12 },
      { role: 'peasant', name: 'Farmer', x: 8, z: -3, radius: 10 },
      { role: 'peasant', name: 'Villager', x: 3, z: 12, radius: 10 },
      { role: 'maiden', name: 'Maiden', x: -8, z: 8, radius: 8 },
      { role: 'maiden', name: 'Townswoman', x: 12, z: 2, radius: 10 },
      // Near castle
      { role: 'noble', name: 'Lord Cedric', x: -18, z: -15, radius: 8 },
      { role: 'noble', name: 'Lady Eleanor', x: -12, z: -20, radius: 8 },
      { role: 'guard', name: 'Town Guard', x: 0, z: -10, radius: 15 },
      { role: 'guard', name: 'Town Guard', x: 15, z: 5, radius: 12 },
      { role: 'guard', name: 'Gate Guard', x: 0, z: 20, radius: 6 },
      // Religious & artisan quarter
      { role: 'monk', name: 'Brother Thomas', x: 18, z: -12, radius: 8 },
      { role: 'monk', name: 'Sister Mary', x: 20, z: -8, radius: 6 },
      // Entertainment
      { role: 'bard', name: 'Lute Player', x: -2, z: 0, radius: 12 },
      { role: 'bard', name: 'Storyteller', x: 10, z: 10, radius: 10 },
      // Children playing
      { role: 'child', name: 'Street Urchin', x: 5, z: 8, radius: 14 },
      { role: 'child', name: 'Young Squire', x: -10, z: 0, radius: 12 },
      // More wanderers
      { role: 'peasant', name: 'Beggar', x: -15, z: 10, radius: 15 },
      { role: 'peasant', name: 'Woodcutter', x: 20, z: 15, radius: 10 },
      { role: 'maiden', name: 'Flower Girl', x: 0, z: 15, radius: 12 },
      { role: 'noble', name: 'Court Jester', x: -5, z: -12, radius: 10 },
    ];

    for (const def of roles) {
      const tf: DiabloTownfolk = {
        id: this._genId(),
        role: def.role,
        name: def.name,
        x: def.x,
        y: getTerrainHeight(def.x, def.z),
        z: def.z,
        angle: Math.random() * Math.PI * 2,
        speed: def.role === 'child' ? 2.0 : def.role === 'guard' ? 1.8 : def.role === 'noble' ? 1.0 : 1.4,
        wanderTarget: null,
        wanderTimer: Math.random() * 5,
        homeX: def.x,
        homeZ: def.z,
        wanderRadius: def.radius,
      };
      this._state.townfolk.push(tf);
    }
  }

  private _updateTownfolk(dt: number): void {
    if (this._state.currentMap !== DiabloMapId.CAMELOT) return;

    const mapCfg = MAP_CONFIGS[DiabloMapId.CAMELOT];
    const halfW = mapCfg.width / 2 - 2;
    const halfD = mapCfg.depth / 2 - 2;

    for (const tf of this._state.townfolk) {
      tf.wanderTimer -= dt;

      if (tf.wanderTimer <= 0) {
        // Pick a new wander target within radius of home
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * tf.wanderRadius;
        let tx = tf.homeX + Math.cos(angle) * dist;
        let tz = tf.homeZ + Math.sin(angle) * dist;
        // Clamp to map bounds
        tx = Math.max(-halfW, Math.min(halfW, tx));
        tz = Math.max(-halfD, Math.min(halfD, tz));
        tf.wanderTarget = { x: tx, z: tz };
        tf.wanderTimer = 3 + Math.random() * 6; // pause 3-9 seconds between wanders
      }

      if (tf.wanderTarget) {
        const dx = tf.wanderTarget.x - tf.x;
        const dz = tf.wanderTarget.z - tf.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.5) {
          tf.wanderTarget = null;
        } else {
          const moveSpeed = tf.speed * dt;
          tf.x += (dx / dist) * moveSpeed;
          tf.z += (dz / dist) * moveSpeed;
          tf.angle = Math.atan2(dx, dz);
          tf.y = getTerrainHeight(tf.x, tf.z);
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  CHECK MAP CLEAR
  // ──────────────────────────────────────────────────────────────
  private _checkMapClear(): void {
    if (this._state.phase !== DiabloPhase.PLAYING) return;
    if (this._state.currentMap === DiabloMapId.CAMELOT) return;
    const target = MAP_KILL_TARGET[this._state.currentMap] || 50;
    if (this._state.killCount >= target) {
      const aliveEnemies = this._state.enemies.filter(
        (e) => e.state !== EnemyState.DYING && e.state !== EnemyState.DEAD
      );
      if (aliveEnemies.length === 0) {
        this._onMapComplete();
        this._showVictory();
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  ROLL LOOT
  // ──────────────────────────────────────────────────────────────
  private _rollLoot(enemy: DiabloEnemy): DiabloItem[] {
    const items: DiabloItem[] = [];
    const table = LOOT_TABLES[enemy.type];
    if (!table) return items;

    // Calculate drop rate bonus from map modifiers
    let dropRateBonus = 0;
    for (const mod of this._state.activeMapModifiers) {
      const modDef = MAP_MODIFIER_DEFS[mod];
      if (modDef) dropRateBonus += modDef.dropRateBonus;
    }
    const dropMult = 1 + dropRateBonus / 100;

    for (const entry of table) {
      if (Math.random() < entry.chance * dropMult) {
        const item = this._pickRandomItemOfRarity(entry.rarity);
        if (item) {
          items.push({ ...item, id: this._genId() });
        }
      }
    }

    // Boss guaranteed rare+ drop
    if (enemy.isBoss && items.length === 0) {
      const rareItems = ITEM_DATABASE.filter(
        (it) => it.rarity === ItemRarity.RARE || it.rarity === ItemRarity.EPIC || it.rarity === ItemRarity.LEGENDARY
      );
      if (rareItems.length > 0) {
        const pick = rareItems[Math.floor(Math.random() * rareItems.length)];
        items.push({ ...pick, id: this._genId() });
      }
    }

    // Map-specific set/unique drops (bosses: guaranteed, regular enemies: small chance)
    const mapKey = this._state.currentMap as string;
    const mapItemNames = MAP_SPECIFIC_ITEMS[mapKey];
    if (mapItemNames) {
      const dropChance = enemy.isBoss ? 1.0 : 0.04;
      if (Math.random() < dropChance) {
        const name = mapItemNames[Math.floor(Math.random() * mapItemNames.length)];
        const mapItem = ITEM_DATABASE.find((it) => it.name === name);
        if (mapItem) {
          items.push({ ...mapItem, id: this._genId() });
        }
      }
    }

    return items;
  }

  private _pickRandomItemOfRarity(rarity: ItemRarity): DiabloItem | null {
    const pool = ITEM_DATABASE.filter((it) => it.rarity === rarity);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ──────────────────────────────────────────────────────────────
  //  SPAWN ENEMY
  // ──────────────────────────────────────────────────────────────
  private _spawnEnemy(): void {
    const p = this._state.player;
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const weights = ENEMY_SPAWN_WEIGHTS[this._state.currentMap];
    if (!weights || weights.length === 0) return;

    // Pick enemy type from weighted table
    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosenType = weights[0].type;
    for (const w of weights) {
      roll -= w.weight;
      if (roll <= 0) {
        chosenType = w.type;
        break;
      }
    }

    // Night boss re-spawn check (once per 10 kills at night)
    if (this._state.timeOfDay === TimeOfDay.NIGHT && this._state.killCount > 0 && this._state.killCount % 10 === 0) {
      this._spawnNightBoss();
    }
    // Day boss re-spawn check (once per 15 kills when not night)
    if (this._state.timeOfDay !== TimeOfDay.NIGHT && this._state.killCount > 0 && this._state.killCount % 15 === 0) {
      this._spawnDayBoss();
    }

    // Boss spawn every 20 kills
    let isBossSpawn = false;
    if (this._state.killCount > 0 && this._state.killCount % 20 === 0 && this._state.totalEnemiesSpawned > 0) {
      const existingBoss = this._state.enemies.find((e) => e.isBoss && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING);
      if (!existingBoss) {
        isBossSpawn = true;
      }
    }

    const def = ENEMY_DEFS[chosenType];
    if (!def) return;

    // Random position 30-50 units from player, within map bounds
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 20;
    const halfW = mapCfg.width / 2 - 2;
    const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2 - 2;

    let ex = p.x + Math.cos(angle) * dist;
    let ez = p.z + Math.sin(angle) * dist;
    ex = Math.max(-halfW, Math.min(halfW, ex));
    ez = Math.max(-halfD, Math.min(halfD, ez));

    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];
    let hpMult = (isBossSpawn ? 5 : 1) * diffCfg.hpMult;
    let dmgMult = (isBossSpawn ? 2 : 1) * diffCfg.damageMult;
    // Apply map modifier effects
    for (const mod of this._state.activeMapModifiers) {
      const modDef = MAP_MODIFIER_DEFS[mod];
      if (modDef) {
        hpMult *= modDef.enemyHpMult;
        dmgMult *= modDef.enemyDamageMult;
      }
    }
    // Extra elites modifier
    if (this._state.activeMapModifiers.includes(MapModifier.EXTRA_ELITES)) {
      if (!isBossSpawn && this._state.killCount > 0 && this._state.killCount % 12 === 0) {
        const existingBoss2 = this._state.enemies.find((e) => e.isBoss && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING);
        if (!existingBoss2) isBossSpawn = true;
      }
    }
    const armorMult = (isBossSpawn ? 1.5 : 1) * diffCfg.armorMult;
    const bossNames = BOSS_NAMES[this._state.currentMap] || ["Dark Champion"];
    const bossName = bossNames[Math.floor(Math.random() * bossNames.length)];

    const enemy: DiabloEnemy = {
      id: this._genId(),
      type: chosenType,
      x: ex,
      y: getTerrainHeight(ex, ez),
      z: ez,
      angle: Math.random() * Math.PI * 2,
      hp: def.hp * hpMult,
      maxHp: def.hp * hpMult,
      damage: def.damage * dmgMult,
      armor: def.armor * armorMult,
      speed: def.speed * diffCfg.speedMult,
      state: EnemyState.IDLE,
      targetId: null,
      attackTimer: 1.0,
      attackRange: def.attackRange,
      aggroRange: def.aggroRange * (isBossSpawn ? 1.3 : 1),
      xpReward: Math.round(def.xpReward * (isBossSpawn ? 5 : 1) * diffCfg.xpMult),
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: isBossSpawn || def.isBoss,
      bossName: isBossSpawn ? bossName : undefined,
      scale: def.scale * (isBossSpawn ? 1.8 : 1),
      level: def.level + (isBossSpawn ? 5 : 0),
      damageType: ENEMY_DAMAGE_TYPES[chosenType] || DamageType.PHYSICAL,
      behavior: def.behavior,
    };

    this._state.enemies.push(enemy);
    this._state.totalEnemiesSpawned++;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Kill enemy
  // ──────────────────────────────────────────────────────────────
  private _killEnemy(enemy: DiabloEnemy): void {
    if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) return;
    enemy.hp = 0;
    enemy.state = EnemyState.DYING;
    enemy.deathTimer = 0;

    this._renderer.spawnParticles(ParticleType.DUST, enemy.x, enemy.y + 0.5, enemy.z, 8 + Math.floor(Math.random() * 5), this._state.particles);

    // Map modifier: Explosive death
    if (this._state.activeMapModifiers.includes(MapModifier.EXPLOSIVE_DEATH)) {
      const p = this._state.player;
      const explodeDmg = enemy.maxHp * 0.3;
      const explodeRadius = 4;
      // Damage player if nearby
      const distToPlayer = this._dist(enemy.x, enemy.z, p.x, p.z);
      if (distToPlayer < explodeRadius && p.invulnTimer <= 0) {
        p.hp -= explodeDmg;
        this._addFloatingText(p.x, p.y + 2, p.z, `${Math.round(explodeDmg)} EXPLOSION`, '#ff8800');
      }
      this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 20, this._state.particles);
      this._renderer.shakeCamera(0.3, 0.3);
    }

    const p = this._state.player;
    const xpMult = (this._state.weather === Weather.CLEAR ? 1.1 : 1.0) * (1 + this._hasPetBuff('xpBonus'));
    p.xp += Math.floor(enemy.xpReward * xpMult);
    const goldMult = (1 + this._hasPetBuff('goldBonus'));
    const goldEarned = Math.floor((5 + Math.random() * 10 * enemy.level) * DIFFICULTY_CONFIGS[this._state.difficulty].goldMult * goldMult);
    p.gold += goldEarned;
    this._goldEarnedTotal += goldEarned;
    this._state.killCount++;

    // Roll loot
    const lootItems = this._rollLoot(enemy);
    for (const item of lootItems) {
      const loot: DiabloLoot = {
        id: this._genId(),
        item,
        x: enemy.x + (Math.random() * 2 - 1),
        y: 0,
        z: enemy.z + (Math.random() * 2 - 1),
        timer: 0,
      };
      this._state.loot.push(loot);
    }

    // 5% chance to drop a potion
    if (Math.random() < 0.05) {
      const pot = POTION_DATABASE[Math.floor(Math.random() * POTION_DATABASE.length)];
      const droppedPotion: DiabloPotion = { ...pot, id: this._genId() };
      p.potions.push(droppedPotion);
      this._addFloatingText(enemy.x, enemy.y + 2, enemy.z, `+${pot.name}`, "#44ff44");
    }

    this._updateQuestProgress(QuestType.KILL_COUNT, this._state.currentMap);
    this._updateQuestProgress(QuestType.KILL_SPECIFIC, enemy.type);
    if (enemy.isBoss) {
      this._updateQuestProgress(QuestType.BOSS_KILL, this._state.currentMap);
      if ((enemy.type as string).startsWith("NIGHT_")) {
        this._updateQuestProgress(QuestType.NIGHT_BOSS, undefined);
      }
    }
    this._updateQuestProgress(QuestType.COLLECT_GOLD, undefined);

    // Pet XP, pet egg drops, crafting material drops
    this._grantPetXp(Math.floor(enemy.xpReward * 0.5));
    this._rollPetDrop(enemy.isBoss);
    this._rollMaterialDrop();
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Create projectile
  // ──────────────────────────────────────────────────────────────
  private _createProjectile(
    x: number, y: number, z: number,
    angle: number, damage: number,
    def: any, skillId: SkillId
  ): void {
    const speed = 20;
    const proj: DiabloProjectile = {
      id: this._genId(),
      x, y, z,
      vx: Math.sin(angle) * speed,
      vy: 0,
      vz: Math.cos(angle) * speed,
      speed,
      damage,
      damageType: def.damageType,
      radius: 0.3,
      ownerId: "player",
      isPlayerOwned: true,
      lifetime: 0,
      maxLifetime: 3.0,
      skillId,
    };
    this._state.projectiles.push(proj);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Chain lightning bounce
  // ──────────────────────────────────────────────────────────────
  private _chainLightningBounce(fromEnemy: DiabloEnemy, damage: number, bouncesLeft: number): void {
    if (bouncesLeft <= 0) return;

    let nearest: DiabloEnemy | null = null;
    let nearestDist = 10;
    for (const enemy of this._state.enemies) {
      if (enemy.id === fromEnemy.id) continue;
      if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
      const d = this._dist(fromEnemy.x, fromEnemy.z, enemy.x, enemy.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = enemy;
      }
    }

    if (nearest) {
      const finalDmg = Math.max(1, damage - nearest.armor * 0.1);
      nearest.hp -= finalDmg;
      this._addFloatingText(nearest.x, nearest.y + 2, nearest.z, `${Math.round(finalDmg)}`, "#8888ff");

      if (nearest.hp <= 0) {
        this._killEnemy(nearest);
      }

      // Apply shocked
      nearest.statusEffects.push({
        effect: StatusEffect.SHOCKED,
        duration: 2,
        source: "chain_lightning",
      });
      this._checkElementalReaction(nearest, StatusEffect.SHOCKED);

      this._chainLightningBounce(nearest, damage * 0.7, bouncesLeft - 1);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Open chest
  // ──────────────────────────────────────────────────────────────
  private _openChest(chestId: string): void {
    const chest = this._state.treasureChests.find((c) => c.id === chestId);
    if (!chest || chest.opened) return;

    const p = this._state.player;
    const dist = this._dist(p.x, p.z, chest.x, chest.z);
    if (dist > 3) return;

    chest.opened = true;
    for (const item of chest.items) {
      const loot: DiabloLoot = {
        id: this._genId(),
        item: { ...item, id: this._genId() },
        x: chest.x + (Math.random() * 3 - 1.5),
        y: 0,
        z: chest.z + (Math.random() * 3 - 1.5),
        timer: 0,
      };
      this._state.loot.push(loot);
    }

    // Gold bonus
    const goldBonus = Math.floor(20 + Math.random() * 50);
    p.gold += goldBonus;
    this._goldEarnedTotal += goldBonus;
    this._addFloatingText(chest.x, 2, chest.z, `+${goldBonus} Gold`, "#ffd700");

    this._chestsOpened++;
    this._updateQuestProgress(QuestType.TREASURE_HUNT, undefined);
    this._updateQuestProgress(QuestType.COLLECT_GOLD, undefined);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Pickup loot manually
  // ──────────────────────────────────────────────────────────────
  private _pickupLoot(lootId: string): void {
    const lootIdx = this._state.loot.findIndex((l) => l.id === lootId);
    if (lootIdx < 0) return;
    const loot = this._state.loot[lootIdx];

    const p = this._state.player;
    const dist = this._dist(p.x, p.z, loot.x, loot.z);
    if (dist > 4) return;

    const emptyIdx = p.inventory.findIndex((s) => s.item === null);
    if (emptyIdx < 0) {
      this._addFloatingText(p.x, p.y + 2, p.z, "Inventory Full!", "#ff4444");
      return;
    }

    p.inventory[emptyIdx].item = { ...loot.item, id: this._genId() };
    this._addFloatingText(p.x, p.y + 2.5, p.z, `+${loot.item.name}`, RARITY_CSS[loot.item.rarity]);
    this._renderer.spawnParticles(ParticleType.GOLD, loot.x, loot.y + 0.5, loot.z, 4 + Math.floor(Math.random() * 3), this._state.particles);
    this._state.loot.splice(lootIdx, 1);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Generate chest loot
  // ──────────────────────────────────────────────────────────────
  private _generateChestLoot(rarity: ItemRarity): DiabloItem[] {
    const items: DiabloItem[] = [];
    const count = rarity === ItemRarity.EPIC ? 3 : rarity === ItemRarity.RARE ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const item = this._pickRandomItemOfRarity(rarity);
      if (item) items.push({ ...item, id: this._genId() });
    }
    // Always add a common item too
    const common = this._pickRandomItemOfRarity(ItemRarity.COMMON);
    if (common) items.push({ ...common, id: this._genId() });
    return items;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Dodge roll (space bar)
  // ──────────────────────────────────────────────────────────────
  private _doDodgeRoll(): void {
    const p = this._state.player;
    if (p.invulnTimer > 0) return;
    const worldMouse = this._getMouseWorldPos();
    const angle = Math.atan2(worldMouse.x - p.x, worldMouse.z - p.z);
    p.x += Math.sin(angle) * 4;
    p.z += Math.cos(angle) * 4;
    p.invulnTimer = 0.4;

    // Clamp to map bounds
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2;
    p.x = Math.max(-halfW, Math.min(halfW, p.x));
    p.z = Math.max(-halfD, Math.min(halfD, p.z));
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Add floating text
  // ──────────────────────────────────────────────────────────────
  private _addFloatingText(x: number, y: number, z: number, text: string, color: string): void {
    this._state.floatingTexts.push({
      id: this._genId(),
      text,
      x,
      y,
      z,
      color,
      timer: 0,
      vy: 2,
    });
  }

  private _questPopupTimer: number = 0;

  private _showQuestPopup(title: string, body: string, lore: string | null, duration: number): void {
    const loreHtml = lore
      ? `<div style="margin-top:10px;font-size:12px;color:#887755;font-style:italic;line-height:1.5;">${lore}</div>`
      : "";
    this._questPopup.innerHTML = `
      <div style="font-size:11px;color:#665533;letter-spacing:3px;margin-bottom:6px;">THE FALL OF EXCALIBUR</div>
      <div style="font-size:20px;color:#ffd700;font-weight:bold;margin-bottom:10px;text-shadow:0 0 8px rgba(255,215,0,0.3);">${title}</div>
      <div style="font-size:14px;color:#ccbb99;line-height:1.7;">${body}</div>
      ${loreHtml}
    `;
    this._questPopup.style.display = "block";
    this._questPopup.style.opacity = "1";
    this._questPopupTimer = duration;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Distance
  // ──────────────────────────────────────────────────────────────
  private _dist(x1: number, z1: number, x2: number, z2: number): number {
    return Math.hypot(x2 - x1, z2 - z1);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Generate ID
  // ──────────────────────────────────────────────────────────────
  private _genId(): string {
    return "d" + (this._nextId++);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Recalculate player stats
  // ──────────────────────────────────────────────────────────────
  private _recalculatePlayerStats(): void {
    const p = this._state.player;
    const base = createDefaultPlayer(p.class);

    // Scale base stats by level
    const lvlBonus = (p.level - 1) * 3;
    p.strength = base.strength + lvlBonus;
    p.dexterity = base.dexterity + lvlBonus;
    p.intelligence = base.intelligence + lvlBonus;
    p.vitality = base.vitality + (p.level - 1) * 4;
    p.armor = base.armor;
    p.moveSpeed = base.moveSpeed;
    p.attackSpeed = base.attackSpeed;
    p.critChance = base.critChance;
    p.critDamage = base.critDamage;
    // Apply equipment stats
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    const equippedNames: string[] = [];
    let bonusHealthFromGear = 0;
    let bonusManaFromGear = 0;

    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (!item) continue;
      equippedNames.push(item.name);
      const stats = item.stats as any;
      if (stats.strength) p.strength += stats.strength;
      if (stats.dexterity) p.dexterity += stats.dexterity;
      if (stats.intelligence) p.intelligence += stats.intelligence;
      if (stats.vitality) p.vitality += stats.vitality;
      if (stats.armor) p.armor += stats.armor;
      if (stats.critChance) p.critChance += stats.critChance / 100;
      if (stats.critDamage) p.critDamage += stats.critDamage / 100;
      if (stats.attackSpeed) p.attackSpeed += stats.attackSpeed / 100;
      if (stats.moveSpeed || stats.speed) p.moveSpeed += (stats.moveSpeed || stats.speed || 0);
      if (stats.bonusHealth) bonusHealthFromGear += stats.bonusHealth;
      if (stats.bonusMana) bonusManaFromGear += stats.bonusMana;
    }

    // Check set bonuses
    for (const setBonus of SET_BONUSES) {
      const setItemNames = (setBonus as any).itemNames as string[] | undefined;
      if (!setItemNames) continue;
      const requiredPieces = (setBonus as any).requiredPieces || 2;
      const matchCount = setItemNames.filter((n) => equippedNames.includes(n)).length;
      if (matchCount >= requiredPieces) {
        const bs = setBonus.bonusStats as any;
        if (bs.strength) p.strength += bs.strength;
        if (bs.dexterity) p.dexterity += bs.dexterity;
        if (bs.intelligence) p.intelligence += bs.intelligence;
        if (bs.vitality) p.vitality += bs.vitality;
        if (bs.armor) p.armor += bs.armor;
        if (bs.critChance) p.critChance += bs.critChance / 100;
        if (bs.critDamage) p.critDamage += bs.critDamage / 100;
        if (bs.attackSpeed) p.attackSpeed += bs.attackSpeed / 100;
        if (bs.moveSpeed) p.moveSpeed += bs.moveSpeed;
        if (bs.manaRegen) { /* applied in update */ }
        if (bs.bonusDamage) { /* applied in damage calc */ }
        if (bs.lifeSteal) { /* applied in damage calc */ }
      }
    }

    // Calculate maxHp/maxMana AFTER all vitality/intelligence bonuses are applied
    p.maxHp = base.maxHp + (p.level - 1) * Math.floor(p.vitality * 2) + bonusHealthFromGear;
    p.maxMana = base.maxMana + (p.level - 1) * Math.floor(p.intelligence * 0.8) + bonusManaFromGear;

    // Apply talent effects
    const talentBonuses = this._getTalentBonuses();
    if (talentBonuses[TalentEffectType.BONUS_HP_PERCENT]) {
      p.maxHp = Math.floor(p.maxHp * (1 + talentBonuses[TalentEffectType.BONUS_HP_PERCENT] / 100));
    }
    if (talentBonuses[TalentEffectType.BONUS_MANA_PERCENT]) {
      p.maxMana = Math.floor(p.maxMana * (1 + talentBonuses[TalentEffectType.BONUS_MANA_PERCENT] / 100));
    }
    if (talentBonuses[TalentEffectType.BONUS_ARMOR]) {
      p.armor += talentBonuses[TalentEffectType.BONUS_ARMOR];
    }
    if (talentBonuses[TalentEffectType.BONUS_CRIT_CHANCE]) {
      p.critChance += talentBonuses[TalentEffectType.BONUS_CRIT_CHANCE] / 100;
    }
    if (talentBonuses[TalentEffectType.BONUS_CRIT_DAMAGE]) {
      p.critDamage += talentBonuses[TalentEffectType.BONUS_CRIT_DAMAGE] / 100;
    }
    if (talentBonuses[TalentEffectType.BONUS_ATTACK_SPEED]) {
      p.attackSpeed += talentBonuses[TalentEffectType.BONUS_ATTACK_SPEED] / 100;
    }
    if (talentBonuses[TalentEffectType.BONUS_MOVE_SPEED]) {
      p.moveSpeed += talentBonuses[TalentEffectType.BONUS_MOVE_SPEED];
    }

    // Apply potion buffs
    for (const buff of p.activePotionBuffs) {
      if (buff.type === PotionType.SPEED) {
        p.moveSpeed *= (1 + buff.value / 100);
      }
    }

    // Make sure hp/mana don't exceed new max
    p.hp = Math.min(p.hp, p.maxHp);
    p.mana = Math.min(p.mana, p.maxMana);

    // Apply frozen override if applicable
    if (p.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) {
      p.moveSpeed = 0;
    }
    // Apply slowed
    if (p.statusEffects.some((e) => e.effect === StatusEffect.SLOWED)) {
      p.moveSpeed *= 0.5;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get effective stats (for display)
  // ──────────────────────────────────────────────────────────────
  private _getEffectiveStats(): {
    strength: number; dexterity: number; intelligence: number;
    vitality: number; armor: number; critChance: number;
    moveSpeed: number; attackSpeed: number; critDamage: number;
  } {
    const p = this._state.player;
    return {
      strength: p.strength,
      dexterity: p.dexterity,
      intelligence: p.intelligence,
      vitality: p.vitality,
      armor: p.armor,
      critChance: p.critChance,
      moveSpeed: p.moveSpeed,
      attackSpeed: p.attackSpeed,
      critDamage: p.critDamage,
    };
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get weapon damage bonus
  // ──────────────────────────────────────────────────────────────
  private _getWeaponDamage(): number {
    const weapon = this._state.player.equipment.weapon;
    if (!weapon) return 5;
    const stats = weapon.stats as any;
    return (stats.damage || 0) + (stats.bonusDamage || 0);
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get life steal percentage
  // ──────────────────────────────────────────────────────────────
  private _getLifeSteal(): number {
    let ls = 0;
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    for (const key of equipKeys) {
      const item = this._state.player.equipment[key];
      if (item) {
        const stats = item.stats as any;
        if (stats.lifeSteal) ls += stats.lifeSteal;
      }
    }
    const talentBonusesLs = this._getTalentBonuses();
    if (talentBonusesLs[TalentEffectType.LIFE_STEAL_PERCENT]) {
      ls += talentBonusesLs[TalentEffectType.LIFE_STEAL_PERCENT];
    }
    return ls;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get skill damage
  // ──────────────────────────────────────────────────────────────
  private _getSkillDamage(def: any): number {
    const p = this._state.player;
    let base = 0;
    const weaponBonus = this._getWeaponDamage();
    switch (p.class) {
      case DiabloClass.WARRIOR:
        base = p.strength * 1.5 + weaponBonus;
        break;
      case DiabloClass.MAGE:
        base = p.intelligence * 1.2 + weaponBonus;
        break;
      case DiabloClass.RANGER:
        base = p.dexterity * 1.3 + weaponBonus;
        break;
    }
    const hasBattleCry = p.statusEffects.some((e) => e.source === "BATTLE_CRY");
    if (hasBattleCry) base *= 1.3;

    // Apply equipped bonus damage
    let bonusDmg = 0;
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (item) {
        const stats = item.stats as any;
        if (stats.bonusDamage) bonusDmg += stats.bonusDamage;
      }
    }

    let total = (base + bonusDmg) * (def.damageMultiplier || 1);

    const talentBonusesSkill = this._getTalentBonuses();
    if (talentBonusesSkill[TalentEffectType.BONUS_DAMAGE_PERCENT]) {
      total *= (1 + talentBonusesSkill[TalentEffectType.BONUS_DAMAGE_PERCENT] / 100);
    }

    // Strength potion buff
    for (const buff of p.activePotionBuffs) {
      if (buff.type === PotionType.STRENGTH) {
        total *= (1 + buff.value / 100);
      }
    }

    return total;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get enemy effective speed
  // ──────────────────────────────────────────────────────────────
  private _getEnemyEffectiveSpeed(enemy: DiabloEnemy): number {
    let speed = enemy.speed;
    if (enemy.statusEffects.some((e) => e.effect === StatusEffect.FROZEN)) return 0;
    if (enemy.statusEffects.some((e) => e.effect === StatusEffect.SLOWED)) speed *= 0.5;
    if (this._state.weather === Weather.STORMY) speed *= 1.1;
    return speed;
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Get mouse world position
  // ──────────────────────────────────────────────────────────────
  private _getMouseWorldPos(): { x: number; z: number } {
    const p = this._state.player;

    // First person: project forward from player in look direction
    if (this._firstPerson) {
      const range = 10;
      return {
        x: p.x - Math.sin(this._fpYaw) * range,
        z: p.z - Math.cos(this._fpYaw) * range,
      };
    }

    // Approximate: map screen coordinates to world using isometric projection
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Center of screen is roughly where the player is
    const dx = (this._mouseX - w / 2) / (w / 2);
    const dz = (this._mouseY - h / 2) / (h / 2);

    // Scale factor based on camera distance
    const camDist = this._state.camera.distance;
    const scale = camDist * 0.6;

    // Isometric-ish mapping: screen x maps to world x+z, screen y maps to world z-x
    const worldX = p.x + dx * scale;
    const worldZ = p.z + dz * scale;

    return { x: worldX, z: worldZ };
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Spawn initial enemies (extracted from _startMap)
  // ──────────────────────────────────────────────────────────────
  private _spawnInitialEnemies(): void {
    const initialCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < initialCount; i++) {
      this._spawnEnemy();
    }
    // Ensure no enemies spawn too close to the player
    const p = this._state.player;
    for (const e of this._state.enemies) {
      const dx = e.x - p.x;
      const dz = e.z - p.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 40) {
        const angle = Math.atan2(dz, dx);
        e.x = p.x + Math.cos(angle) * (40 + Math.random() * 15);
        e.z = p.z + Math.sin(angle) * (40 + Math.random() * 15);
        e.y = getTerrainHeight(e.x, e.z);
      }
    }
    // Spawn special night boss if time is NIGHT, otherwise spawn day boss
    if (this._state.timeOfDay === TimeOfDay.NIGHT) {
      this._spawnNightBoss();
    } else {
      this._spawnDayBoss();
    }
  }

  private _spawnNightBoss(): void {
    const nightBossType = NIGHT_BOSS_MAP[this._state.currentMap];
    if (!nightBossType) return;
    // Check if night boss already exists
    const existingNightBoss = this._state.enemies.find(
      (e) => e.type === nightBossType && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING
    );
    if (existingNightBoss) return;

    const def = ENEMY_DEFS[nightBossType];
    if (!def) return;

    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2 - 5;
    const halfD = ((mapCfg as any).depth || mapCfg.width) / 2 - 5;
    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];

    const enemy: DiabloEnemy = {
      id: this._genId(),
      type: nightBossType,
      x: (Math.random() - 0.5) * halfW * 1.2,
      y: 0,
      z: (Math.random() - 0.5) * halfD * 1.2,
      angle: Math.random() * Math.PI * 2,
      hp: def.hp * diffCfg.hpMult,
      maxHp: def.hp * diffCfg.hpMult,
      damage: def.damage * diffCfg.damageMult,
      damageType: ENEMY_DAMAGE_TYPES[nightBossType] || DamageType.PHYSICAL,
      armor: def.armor * diffCfg.armorMult,
      speed: def.speed * diffCfg.speedMult,
      state: EnemyState.IDLE,
      targetId: null,
      attackTimer: 1.0,
      attackRange: def.attackRange,
      aggroRange: def.aggroRange,
      xpReward: Math.round(def.xpReward * diffCfg.xpMult),
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: true,
      bossName: def.name,
      scale: def.scale,
      level: def.level,
    };

    this._state.enemies.push(enemy);
    this._state.totalEnemiesSpawned++;

    // Announce the night boss spawn
    const px = this._state.player.x;
    const py = this._state.player.y;
    const pz = this._state.player.z;
    this._addFloatingText(px, py + 4, pz, `${def.name} has awoken!`, "#ff44ff");
    this._addFloatingText(px, py + 3, pz, "A creature of the night stalks this land...", "#cc88ff");
  }

  private _spawnDayBoss(): void {
    const dayBossType = DAY_BOSS_MAP[this._state.currentMap];
    if (!dayBossType) return;
    // Don't spawn during night (night has its own boss)
    if (this._state.timeOfDay === TimeOfDay.NIGHT) return;
    // Check if day boss already exists
    const existing = this._state.enemies.find(
      (e) => e.type === dayBossType && e.state !== EnemyState.DEAD && e.state !== EnemyState.DYING
    );
    if (existing) return;

    const def = ENEMY_DEFS[dayBossType];
    if (!def) return;

    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2 - 5;
    const halfD = ((mapCfg as any).depth || mapCfg.width) / 2 - 5;
    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];

    const enemy: DiabloEnemy = {
      id: this._genId(),
      type: dayBossType,
      x: (Math.random() - 0.5) * halfW * 1.2,
      y: 0,
      z: (Math.random() - 0.5) * halfD * 1.2,
      angle: Math.random() * Math.PI * 2,
      hp: def.hp * diffCfg.hpMult,
      maxHp: def.hp * diffCfg.hpMult,
      damage: def.damage * diffCfg.damageMult,
      damageType: ENEMY_DAMAGE_TYPES[dayBossType] || DamageType.PHYSICAL,
      armor: def.armor * diffCfg.armorMult,
      speed: def.speed * diffCfg.speedMult,
      state: EnemyState.IDLE,
      targetId: null,
      attackTimer: 1.0,
      attackRange: def.attackRange,
      aggroRange: def.aggroRange,
      xpReward: Math.round(def.xpReward * diffCfg.xpMult),
      lootTable: [],
      deathTimer: 0,
      stateTimer: 0,
      patrolTarget: null,
      statusEffects: [],
      isBoss: true,
      bossName: def.name,
      scale: def.scale,
      level: def.level,
    };

    this._state.enemies.push(enemy);
    this._state.totalEnemiesSpawned++;

    const px = this._state.player.x;
    const py = this._state.player.y;
    const pz = this._state.player.z;
    this._addFloatingText(px, py + 4, pz, `${def.name} roams this land!`, "#ffaa44");
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Spawn initial chests (extracted from _startMap)
  // ──────────────────────────────────────────────────────────────
  private _spawnInitialChests(): void {
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const mapW = mapCfg.width;
    const mapD = (mapCfg as any).depth || (mapCfg as any).height || mapCfg.width;
    const chestCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < chestCount; i++) {
      const halfW = mapW / 2 - 5;
      const halfD = mapD / 2 - 5;
      const cx = (Math.random() * 2 - 1) * halfW;
      const cz = (Math.random() * 2 - 1) * halfD;
      const roll = Math.random();
      const rarity = roll < 0.02
        ? ItemRarity.EPIC
        : roll < 0.12
          ? ItemRarity.RARE
          : roll < 0.45
            ? ItemRarity.UNCOMMON
            : ItemRarity.COMMON;
      const chestItems = this._generateChestLoot(rarity);
      const chest: DiabloTreasureChest = {
        id: this._genId(),
        x: cx,
        y: 0,
        z: cz,
        opened: false,
        rarity,
        items: chestItems,
      };
      this._state.treasureChests.push(chest);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  HELPER: Check if save exists
  // ──────────────────────────────────────────────────────────────
  private _hasSave(): boolean {
    return localStorage.getItem("diablo_save") !== null;
  }

  // ──────────────────────────────────────────────────────────────
  //  SAVE GAME
  // ──────────────────────────────────────────────────────────────
  private _saveGame(): void {
    const save = {
      version: 2,
      timestamp: Date.now(),
      player: {
        ...this._state.player,
        skillCooldowns: Object.fromEntries(this._state.player.skillCooldowns),
      },
      currentMap: this._state.currentMap,
      timeOfDay: this._state.timeOfDay,
      killCount: this._state.killCount,
      persistentInventory: this._state.persistentInventory,
      persistentGold: this._state.persistentGold,
      persistentLevel: this._state.persistentLevel,
      persistentXp: this._state.persistentXp,
      persistentStash: this._state.persistentStash,
      mapCleared: this._state.mapCleared,
      difficulty: this._state.difficulty,
      playerTalents: this._state.player.talents,
      playerTalentPoints: this._state.player.talentPoints,
      playerPotions: this._state.player.potions,
      playerPotionSlots: this._state.player.potionSlots,
      activeQuests: this._state.activeQuests,
      completedQuestIds: this._state.completedQuestIds,
      completedMaps: this._state.completedMaps,
      chestsOpened: this._chestsOpened,
      goldEarnedTotal: this._goldEarnedTotal,
    };
    localStorage.setItem("diablo_save", JSON.stringify(save));

    // Show floating notification
    const notification = document.createElement("div");
    notification.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "color:#4f4;font-size:28px;font-weight:bold;font-family:'Georgia',serif;" +
      "text-shadow:0 0 15px rgba(0,255,0,0.5);pointer-events:none;" +
      "transition:opacity 1s;opacity:1;z-index:50;";
    notification.textContent = "Game Saved!";
    this._menuEl.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = "0";
    }, 800);
    setTimeout(() => {
      if (notification.parentElement) notification.parentElement.removeChild(notification);
    }, 2000);
  }

  // ──────────────────────────────────────────────────────────────
  //  LOAD GAME
  // ──────────────────────────────────────────────────────────────
  private _loadGame(): void {
    const raw = localStorage.getItem("diablo_save");
    if (!raw) return;
    const save = JSON.parse(raw);
    // Restore player state
    this._state.player = {
      ...save.player,
      skillCooldowns: new Map(Object.entries(save.player.skillCooldowns)),
      talents: save.playerTalents || save.player.talents || {},
      talentPoints: save.playerTalentPoints ?? save.player.talentPoints ?? 0,
      potions: save.playerPotions || save.player.potions || [],
      potionSlots: save.playerPotionSlots || save.player.potionSlots || [null, null, null, null],
      potionCooldown: 0,
      activePotionBuffs: [],
      lanternOn: save.player.lanternOn || false,
      skillBranches: save.player.skillBranches || {},
      unlockedSkills: save.player.unlockedSkills || [],
    };
    // Restore lantern light if it was on
    if (this._state.player.lanternOn && this._state.player.equipment.lantern) {
      const cfg = LANTERN_CONFIGS[this._state.player.equipment.lantern.name];
      if (cfg) this._renderer.setPlayerLantern(true, cfg.intensity, cfg.distance, cfg.color);
    }
    this._state.currentMap = save.currentMap;
    this._state.timeOfDay = save.timeOfDay || TimeOfDay.DAY;
    this._state.killCount = save.killCount;
    this._state.persistentInventory = save.persistentInventory;
    this._state.persistentGold = save.persistentGold;
    this._state.persistentLevel = save.persistentLevel;
    this._state.persistentXp = save.persistentXp;
    this._state.persistentStash = (() => { const s = save.persistentStash || []; while (s.length < 150) s.push({ item: null }); return s; })();
    this._state.mapCleared = save.mapCleared;
    this._state.difficulty = save.difficulty || DiabloDifficulty.DAGGER;
    this._state.activeQuests = save.activeQuests || [];
    this._state.completedQuestIds = save.completedQuestIds || [];
    this._state.completedMaps = save.completedMaps || {};
    this._chestsOpened = save.chestsOpened || 0;
    this._goldEarnedTotal = save.goldEarnedTotal || 0;
    // Rebuild the map
    this._renderer.buildMap(this._state.currentMap);
    this._renderer.buildPlayer(this._state.player.class);
    this._renderer.applyTimeOfDay(this._state.timeOfDay, this._state.currentMap);
    // Spawn fresh enemies and chests (or vendors for Camelot)
    this._state.enemies = [];
    this._state.projectiles = [];
    this._state.loot = [];
    this._state.treasureChests = [];
    this._state.aoeEffects = [];
    this._state.floatingTexts = [];
    this._state.particles = [];
    this._state.vendors = [];
    this._state.townfolk = [];
    if (this._state.currentMap === DiabloMapId.CAMELOT) {
      this._state.vendors = VENDOR_DEFS.map((vd) => ({
        id: this._genId(),
        type: vd.type,
        name: vd.name,
        x: vd.x,
        z: vd.z,
        inventory: generateVendorInventory(vd.type, this._state.player.level),
        icon: vd.icon,
      }));
      if ((this._renderer as any).syncVendors) {
        (this._renderer as any).syncVendors(
          this._state.vendors.map((v) => ({ x: v.x, z: v.z, type: v.type, name: v.name, icon: v.icon }))
        );
      }
      this._spawnCamelotTownfolk();
    } else {
      this._spawnInitialEnemies();
      this._spawnInitialChests();
    }
    // Set to playing
    this._state.phase = DiabloPhase.PLAYING;
    this._menuEl.innerHTML = "";
    this._hud.style.display = "block";
    this._recalculatePlayerStats();
  }

  // ──────────────────────────────────────────────────────────────
  //  SHARED STASH SCREEN
  // ──────────────────────────────────────────────────────────────
  private _showStash(): void {
    const p = this._state.player;
    const stash = this._state.persistentStash;

    // Build inventory grid (8x5 = 40 slots)
    let invHtml = "";
    for (let i = 0; i < p.inventory.length; i++) {
      const slot = p.inventory[i];
      const item = slot.item;
      const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
      const content = item
        ? `<div style="font-size:22px;">${item.icon}</div>`
        : "";
      invHtml += `
        <div class="stash-inv-slot" data-inv-idx="${i}" style="
          width:55px;height:55px;background:rgba(15,10,5,0.85);border:1px solid ${borderColor};
          border-radius:4px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;pointer-events:auto;position:relative;
        ">${content}</div>`;
    }

    // Build stash grid (10x15 = 150 slots)
    let stashHtml = "";
    for (let i = 0; i < stash.length; i++) {
      const slot = stash[i];
      const item = slot.item;
      const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
      const content = item
        ? `<div style="font-size:22px;">${item.icon}</div>`
        : "";
      stashHtml += `
        <div class="stash-slot" data-stash-idx="${i}" style="
          width:55px;height:55px;background:rgba(15,10,5,0.85);border:1px solid ${borderColor};
          border-radius:4px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;pointer-events:auto;position:relative;
        ">${content}</div>`;
    }

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.90);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <h2 style="color:#ffd700;font-size:32px;letter-spacing:3px;margin-bottom:16px;font-family:'Georgia',serif;
          text-shadow:0 0 15px rgba(255,215,0,0.4);">
          SHARED STASH
        </h2>
        <div style="display:flex;gap:30px;align-items:flex-start;">
          <!-- Inventory Panel -->
          <div>
            <div style="color:#c8a84e;font-size:14px;margin-bottom:8px;text-align:center;font-weight:bold;">INVENTORY</div>
            <div style="display:grid;grid-template-columns:repeat(8,55px);grid-template-rows:repeat(5,55px);gap:3px;">
              ${invHtml}
            </div>
          </div>
          <!-- Stash Panel -->
          <div>
            <div style="color:#c8a84e;font-size:14px;margin-bottom:8px;text-align:center;font-weight:bold;">STASH</div>
            <div style="display:grid;grid-template-columns:repeat(10,55px);gap:3px;max-height:700px;overflow-y:auto;">
              ${stashHtml}
            </div>
          </div>
        </div>
        <!-- Bottom bar -->
        <div style="margin-top:16px;display:flex;gap:30px;align-items:center;">
          <div style="font-size:16px;color:#ffd700;">\uD83E\uDE99 ${p.gold}</div>
          <button id="stash-back-btn" style="
            padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
            background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
            cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
          ">BACK</button>
        </div>
        <div id="stash-status" style="margin-top:10px;color:#ff4444;font-size:14px;min-height:20px;"></div>
        <!-- Tooltip container -->
        <div id="inv-tooltip" style="
          display:none;position:fixed;z-index:100;background:rgba(10,5,2,0.96);border:2px solid #5a4a2a;
          border-radius:8px;padding:14px;max-width:280px;pointer-events:none;color:#ccc;font-size:13px;
        "></div>
      </div>`;

    const statusEl = this._menuEl.querySelector("#stash-status") as HTMLDivElement;
    const showStatus = (msg: string, color: string) => {
      statusEl.textContent = msg;
      statusEl.style.color = color;
      setTimeout(() => { statusEl.textContent = ""; }, 1500);
    };

    // Wire up inventory slots (click to transfer to stash)
    const invSlots = this._menuEl.querySelectorAll(".stash-inv-slot") as NodeListOf<HTMLDivElement>;
    invSlots.forEach((el) => {
      const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
      el.addEventListener("click", () => {
        const item = p.inventory[idx].item;
        if (!item) return;
        const emptyStashIdx = stash.findIndex((s) => s.item === null);
        if (emptyStashIdx < 0) {
          showStatus("No space in stash!", "#ff4444");
          return;
        }
        stash[emptyStashIdx].item = item;
        p.inventory[idx].item = null;
        this._showStash(); // Re-render
      });
      el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.inventory[idx].item));
      el.addEventListener("mouseleave", () => this._hideItemTooltip());
    });

    // Wire up stash slots (click to transfer to inventory)
    const stashSlots = this._menuEl.querySelectorAll(".stash-slot") as NodeListOf<HTMLDivElement>;
    stashSlots.forEach((el) => {
      const idx = parseInt(el.getAttribute("data-stash-idx")!, 10);
      el.addEventListener("click", () => {
        const item = stash[idx].item;
        if (!item) return;
        const emptyInvIdx = p.inventory.findIndex((s) => s.item === null);
        if (emptyInvIdx < 0) {
          showStatus("No space in inventory!", "#ff4444");
          return;
        }
        p.inventory[emptyInvIdx].item = item;
        stash[idx].item = null;
        this._showStash(); // Re-render
      });
      el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, stash[idx].item));
      el.addEventListener("mouseleave", () => this._hideItemTooltip());
    });

    // Back button
    const backBtn = this._menuEl.querySelector("#stash-back-btn") as HTMLButtonElement;
    backBtn.addEventListener("mouseenter", () => {
      backBtn.style.borderColor = "#c8a84e";
      backBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      backBtn.style.background = "rgba(50,40,20,0.95)";
    });
    backBtn.addEventListener("mouseleave", () => {
      backBtn.style.borderColor = "#5a4a2a";
      backBtn.style.boxShadow = "none";
      backBtn.style.background = "rgba(40,30,15,0.9)";
    });
    backBtn.addEventListener("click", () => {
      this._backToMenu();
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  VENDOR SHOP
  // ──────────────────────────────────────────────────────────────
  private _vendorDialogueIdx: Record<string, number> = {};

  private _showVendorShop(vendor: DiabloVendor): void {
    const p = this._state.player;
    this._phaseBeforeOverlay = DiabloPhase.PLAYING;
    this._state.phase = DiabloPhase.INVENTORY;

    const renderShop = () => {
      // Vendor wares grid
      let waresHtml = "";
      for (let i = 0; i < vendor.inventory.length; i++) {
        const item = vendor.inventory[i];
        const rarityColor = RARITY_CSS[item.rarity];
        const canAfford = p.gold >= item.value;
        const priceColor = canAfford ? "#ffd700" : "#ff4444";
        waresHtml += `
          <div class="vendor-ware" data-ware-idx="${i}" style="
            width:120px;height:120px;background:rgba(15,10,5,0.9);border:2px solid ${rarityColor};
            border-radius:6px;display:flex;flex-direction:column;align-items:center;
            justify-content:center;cursor:pointer;pointer-events:auto;position:relative;
            transition:border-color 0.2s,box-shadow 0.2s;
          ">
            <div style="font-size:32px;">${item.icon}</div>
            <div style="font-size:11px;color:${rarityColor};margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;text-align:center;">${item.name}</div>
            <div style="font-size:12px;color:${priceColor};margin-top:2px;">\uD83E\uDE99 ${item.value}</div>
          </div>`;
      }
      if (vendor.inventory.length === 0 && vendor.type !== VendorType.ALCHEMIST) {
        waresHtml = `<div style="color:#888;font-size:14px;grid-column:1/-1;text-align:center;padding:30px;">Sold out!</div>`;
      }

      // Potion wares for Alchemist
      let potionWaresHtml = "";
      if (vendor.type === VendorType.ALCHEMIST) {
        for (let i = 0; i < POTION_DATABASE.length; i++) {
          const pot = POTION_DATABASE[i];
          const canAfford = p.gold >= pot.cost;
          const priceColor = canAfford ? "#ffd700" : "#ff4444";
          potionWaresHtml += `
            <div class="vendor-potion" data-potion-idx="${i}" style="
              width:120px;height:120px;background:rgba(15,10,5,0.9);border:2px solid #3a5a2a;
              border-radius:6px;display:flex;flex-direction:column;align-items:center;
              justify-content:center;cursor:pointer;pointer-events:auto;position:relative;
              transition:border-color 0.2s,box-shadow 0.2s;
            ">
              <div style="font-size:32px;">${pot.icon}</div>
              <div style="font-size:11px;color:#8f8;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;text-align:center;">${pot.name}</div>
              <div style="font-size:10px;color:#aaa;margin-top:2px;">${pot.type === 'HEALTH' ? `Heal ${pot.value}` : pot.type === 'MANA' ? `Restore ${pot.value}` : pot.type === 'REJUVENATION' ? `Heal ${pot.value}+Mana` : pot.duration ? `${pot.duration}s buff` : ''}</div>
              <div style="font-size:12px;color:${priceColor};margin-top:2px;">\u{1FA99} ${pot.cost}</div>
            </div>`;
        }
      }

      // Player inventory grid for selling
      let invHtml = "";
      for (let i = 0; i < p.inventory.length; i++) {
        const slot = p.inventory[i];
        const item = slot.item;
        const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
        const content = item
          ? `<div style="font-size:20px;">${item.icon}</div>`
          : "";
        invHtml += `
          <div class="vendor-inv-slot" data-inv-idx="${i}" style="
            width:55px;height:55px;background:rgba(15,10,5,0.85);border:1px solid ${borderColor};
            border-radius:4px;display:flex;align-items:center;justify-content:center;
            cursor:pointer;pointer-events:auto;position:relative;
          ">${content}</div>`;
      }

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:920px;width:92%;position:relative;
            background:linear-gradient(180deg,rgba(28,20,10,0.98),rgba(15,10,5,0.95));
            border:2px solid #5a4a2a;
            border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
            box-shadow:inset 0 0 40px rgba(0,0,0,0.3),0 0 20px rgba(0,0,0,0.5);
            background-image:repeating-linear-gradient(0deg,transparent,transparent 20px,rgba(90,74,42,0.03) 20px,rgba(90,74,42,0.03) 21px);
          ">
            <!-- Inner decorative border -->
            <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-radius:10px;pointer-events:none;"></div>

            <!-- Hanging sign decoration -->
            <div style="text-align:center;margin-bottom:4px;">
              <div style="display:inline-block;position:relative;">
                <div style="display:flex;justify-content:center;gap:120px;margin-bottom:-2px;">
                  <div style="width:2px;height:12px;background:#5a4a2a;"></div>
                  <div style="width:2px;height:12px;background:#5a4a2a;"></div>
                </div>
                <div style="display:inline-block;background:linear-gradient(180deg,rgba(60,45,20,0.9),rgba(40,28,12,0.9));border:2px solid #5a4a2a;border-radius:6px;padding:8px 24px;
                  box-shadow:0 4px 12px rgba(0,0,0,0.4);">
                  <div style="font-size:32px;color:#c8a84e;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">
                    ${vendor.icon} ${vendor.name}
                  </div>
                </div>
              </div>
              <div style="font-size:14px;color:#888;margin-top:6px;">${(VENDOR_DEFS.find(vd => vd.type === vendor.type) || { description: "" }).description}</div>
            </div>

            <!-- Dialogue box -->
            <div style="margin-bottom:14px;background:rgba(30,25,15,0.9);border:1px solid #3a3a2a;border-radius:8px;padding:12px 18px;display:flex;align-items:center;gap:14px;">
              <div style="font-size:36px;flex-shrink:0;">${vendor.icon}</div>
              <div style="flex:1;">
                <div id="vendor-dialogue-text" style="font-size:13px;color:#ccbb99;font-style:italic;line-height:1.5;font-family:'Georgia',serif;min-height:36px;">
                  "${(VENDOR_DIALOGUE[vendor.type] || ["..."])[this._vendorDialogueIdx[vendor.type] || 0]}"
                </div>
              </div>
              <button id="vendor-talk-btn" style="
                padding:8px 16px;font-size:12px;background:rgba(40,35,20,0.9);border:1px solid #5a4a2a;
                border-radius:6px;color:#c8a84e;cursor:pointer;font-family:'Georgia',serif;
                pointer-events:auto;white-space:nowrap;transition:border-color 0.2s;
              ">Talk</button>
            </div>

            <!-- Two panels side by side -->
            <div style="display:flex;gap:24px;align-items:flex-start;">
              <!-- Left: Vendor's Wares -->
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
                  <div style="width:40px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
                  <span style="color:#c8a84e;font-size:14px;font-weight:bold;">VENDOR'S WARES</span>
                  <div style="width:40px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,120px);gap:6px;max-height:420px;overflow-y:auto;justify-content:center;">
                  ${waresHtml}
                </div>
              </div>

              ${vendor.type === VendorType.ALCHEMIST ? `
              <!-- Potions -->
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
                  <div style="width:40px;height:1px;background:linear-gradient(to right,transparent,#3a8a2a);"></div>
                  <span style="color:#3a8a2a;font-size:14px;font-weight:bold;">POTIONS</span>
                  <div style="width:40px;height:1px;background:linear-gradient(to left,transparent,#3a8a2a);"></div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,120px);gap:6px;max-height:420px;overflow-y:auto;justify-content:center;">
                  ${potionWaresHtml}
                </div>
              </div>` : ""}

              <!-- Right: Player's Items to Sell -->
              <div style="flex:0 0 auto;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;">
                  <div style="width:40px;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
                  <span style="color:#c8a84e;font-size:14px;font-weight:bold;">YOUR ITEMS (click to sell)</span>
                  <div style="width:40px;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(8,55px);grid-template-rows:repeat(5,55px);gap:3px;">
                  ${invHtml}
                </div>
              </div>
            </div>

            <!-- Bottom bar with coin pile decoration -->
            <div style="display:flex;align-items:center;gap:8px;margin:16px auto 0;justify-content:center;">
              <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#5a4a2a);"></div>
              <span style="color:#5a4a2a;font-size:8px;">\u25C6</span>
              <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#5a4a2a);"></div>
            </div>
            <div style="margin-top:10px;display:flex;justify-content:center;align-items:center;gap:30px;">
              <div style="display:flex;align-items:center;gap:6px;background:rgba(50,40,10,0.5);border:1px solid #5a4a2a;border-radius:6px;padding:8px 16px;position:relative;">
                <span style="font-size:14px;position:absolute;left:-10px;top:-6px;opacity:0.4;">\uD83E\uDE99</span>
                <span style="font-size:18px;">\uD83E\uDE99</span>
                <span style="font-size:18px;color:#ffd700;font-weight:bold;">${p.gold} gold</span>
                <span style="font-size:12px;position:absolute;right:-8px;bottom:-4px;opacity:0.3;">\uD83E\uDE99</span>
              </div>
              <button id="vendor-close-btn" style="
                padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
                background:linear-gradient(180deg,rgba(50,40,20,0.95),rgba(30,22,10,0.95));
                border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
                text-shadow:0 1px 3px rgba(0,0,0,0.5);
              ">CLOSE</button>
            </div>
            <div id="vendor-status" style="margin-top:8px;text-align:center;color:#ff4444;font-size:14px;min-height:20px;"></div>
            <!-- Tooltip container -->
            <div id="inv-tooltip" style="
              display:none;position:fixed;z-index:100;background:rgba(10,5,2,0.96);border:2px solid #5a4a2a;
              border-radius:8px;padding:14px;max-width:280px;pointer-events:none;color:#ccc;font-size:13px;
            "></div>
          </div>
        </div>`;

      const statusEl = this._menuEl.querySelector("#vendor-status") as HTMLDivElement;
      const showStatus = (msg: string, color: string) => {
        statusEl.textContent = msg;
        statusEl.style.color = color;
        setTimeout(() => { statusEl.textContent = ""; }, 1500);
      };

      // Wire up vendor ware clicks (buy)
      const wareSlots = this._menuEl.querySelectorAll(".vendor-ware") as NodeListOf<HTMLDivElement>;
      wareSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-ware-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => {
          el.style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
          this._showItemTooltip(ev, vendor.inventory[idx]);
        });
        el.addEventListener("mouseleave", () => {
          el.style.boxShadow = "none";
          this._hideItemTooltip();
        });
        el.addEventListener("click", () => {
          const item = vendor.inventory[idx];
          if (!item) return;
          if (p.gold < item.value) {
            showStatus("Not enough gold!", "#ff4444");
            return;
          }
          const emptyIdx = p.inventory.findIndex((s) => s.item === null);
          if (emptyIdx < 0) {
            showStatus("Inventory Full!", "#ff4444");
            return;
          }
          p.gold -= item.value;
          p.inventory[emptyIdx].item = { ...item, id: this._genId() };
          vendor.inventory.splice(idx, 1);
          showStatus(`Purchased ${item.name}!`, "#44ff44");
          renderShop();
        });
      });

      // Wire up potion buy clicks
      const potionSlots = this._menuEl.querySelectorAll(".vendor-potion") as NodeListOf<HTMLDivElement>;
      potionSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-potion-idx")!, 10);
        el.addEventListener("mouseenter", () => {
          el.style.boxShadow = "0 0 12px rgba(60,180,60,0.3)";
          el.style.borderColor = "#5a8a2a";
        });
        el.addEventListener("mouseleave", () => {
          el.style.boxShadow = "none";
          el.style.borderColor = "#3a5a2a";
        });
        el.addEventListener("click", () => {
          const pot = POTION_DATABASE[idx];
          if (!pot) return;
          if (p.gold < pot.cost) {
            showStatus("Not enough gold!", "#ff4444");
            return;
          }
          p.gold -= pot.cost;
          const newPot: DiabloPotion = { ...pot, id: this._genId() };
          // Try to assign to an empty potion slot first
          let assigned = false;
          for (let s = 0; s < 4; s++) {
            if (!p.potionSlots[s]) {
              p.potionSlots[s] = newPot;
              assigned = true;
              break;
            }
          }
          if (!assigned) {
            p.potions.push(newPot);
          }
          showStatus(`Purchased ${pot.name}!`, "#44ff44");
          renderShop();
        });
      });

      // Wire up player inventory slots (sell)
      const invSlots = this._menuEl.querySelectorAll(".vendor-inv-slot") as NodeListOf<HTMLDivElement>;
      invSlots.forEach((el) => {
        const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.inventory[idx].item));
        el.addEventListener("mouseleave", () => this._hideItemTooltip());
        el.addEventListener("click", () => {
          const item = p.inventory[idx].item;
          if (!item) return;
          const sellValue = Math.max(1, Math.floor(item.value * 0.5));
          p.gold += sellValue;
          p.inventory[idx].item = null;
          showStatus(`Sold ${item.name} for ${sellValue} gold`, "#ffd700");
          renderShop();
        });
      });

      // Close button
      const closeBtn = this._menuEl.querySelector("#vendor-close-btn") as HTMLButtonElement;
      closeBtn.addEventListener("mouseenter", () => {
        closeBtn.style.borderColor = "#c8a84e";
        closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
        closeBtn.style.background = "rgba(50,40,20,0.95)";
      });
      closeBtn.addEventListener("mouseleave", () => {
        closeBtn.style.borderColor = "#5a4a2a";
        closeBtn.style.boxShadow = "none";
        closeBtn.style.background = "rgba(40,30,15,0.9)";
      });
      closeBtn.addEventListener("click", () => {
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = "";
      });

      // Talk button — cycle dialogue
      const talkBtn = this._menuEl.querySelector("#vendor-talk-btn") as HTMLButtonElement | null;
      if (talkBtn) {
        talkBtn.addEventListener("click", () => {
          const lines = VENDOR_DIALOGUE[vendor.type] || [];
          if (lines.length === 0) return;
          const idx = ((this._vendorDialogueIdx[vendor.type] || 0) + 1) % lines.length;
          this._vendorDialogueIdx[vendor.type] = idx;
          const textEl = this._menuEl.querySelector("#vendor-dialogue-text") as HTMLDivElement | null;
          if (textEl) textEl.textContent = `"${lines[idx]}"`;
        });
        talkBtn.addEventListener("mouseenter", () => {
          talkBtn.style.borderColor = "#c8a84e";
          talkBtn.style.background = "rgba(50,40,20,0.95)";
        });
        talkBtn.addEventListener("mouseleave", () => {
          talkBtn.style.borderColor = "#5a4a2a";
          talkBtn.style.background = "rgba(40,35,20,0.9)";
        });
      }
    };

    renderShop();
  }

  // ──────────────────────────────────────────────────────────────
  //  MINIMAP
  // ──────────────────────────────────────────────────────────────
  private _drawMinimapContent(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const p = this._state.player;
    const mapId = this._state.currentMap;
    const mapCfg = MAP_CONFIGS[mapId];
    const mapW = mapCfg.width;
    const mapD = mapCfg.depth;

    ctx.clearRect(0, 0, W, H);

    const bgColors: Record<string, string> = {
      [DiabloMapId.FOREST]: "rgba(10,30,10,0.85)",
      [DiabloMapId.ELVEN_VILLAGE]: "rgba(10,25,30,0.85)",
      [DiabloMapId.NECROPOLIS_DUNGEON]: "rgba(20,10,30,0.85)",
      [DiabloMapId.CAMELOT]: "rgba(30,22,12,0.85)",
    };
    ctx.fillStyle = bgColors[mapId] || "rgba(15,15,15,0.85)";
    ctx.fillRect(0, 0, W, H);

    const scale = Math.min(W / mapW, H / mapD) * 0.85;
    const cx = W / 2;
    const cy = H / 2;

    const toMx = (wx: number) => cx + wx * scale;
    const toMy = (wz: number) => cy + wz * scale;

    const halfW = mapW / 2;
    const halfD = mapD / 2;

    // Grid overlay
    ctx.strokeStyle = "rgba(90,74,42,0.15)";
    ctx.lineWidth = 0.5;
    const gridStep = 20;
    for (let gx = -halfW; gx <= halfW; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(toMx(gx), toMy(-halfD));
      ctx.lineTo(toMx(gx), toMy(halfD));
      ctx.stroke();
    }
    for (let gz = -halfD; gz <= halfD; gz += gridStep) {
      ctx.beginPath();
      ctx.moveTo(toMx(-halfW), toMy(gz));
      ctx.lineTo(toMx(halfW), toMy(gz));
      ctx.stroke();
    }

    // Map border
    ctx.strokeStyle = "rgba(200,168,78,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(toMx(-halfW), toMy(-halfD), mapW * scale, mapD * scale);

    // Fog of war overlay for combat maps
    const useFogOfWar = mapId !== DiabloMapId.CAMELOT && this._state.exploredGrid.length > 0;

    if (mapId === DiabloMapId.CAMELOT) {
      // Walls
      ctx.strokeStyle = "rgba(80,80,80,0.7)";
      ctx.lineWidth = 2;
      ctx.strokeRect(toMx(-halfW + 1), toMy(-halfD + 1), (mapW - 2) * scale, (mapD - 2) * scale);

      // Roads
      ctx.strokeStyle = "rgba(100,70,40,0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(toMx(-halfW), toMy(0));
      ctx.lineTo(toMx(halfW), toMy(0));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toMx(0), toMy(-halfD));
      ctx.lineTo(toMx(0), toMy(halfD));
      ctx.stroke();

      // Castle
      ctx.fillStyle = "rgba(70,65,55,0.5)";
      ctx.fillRect(toMx(-10), toMy(-halfD + 2), 20 * scale, 8 * scale);

      // Buildings
      ctx.strokeStyle = "rgba(90,85,75,0.5)";
      ctx.lineWidth = 1;
      const bldgs = [
        { x: -20, z: -15, w: 8, h: 6 },
        { x: 12, z: -15, w: 8, h: 6 },
        { x: -20, z: 8, w: 8, h: 6 },
        { x: 12, z: 8, w: 8, h: 6 },
        { x: -5, z: -22, w: 10, h: 5 },
      ];
      for (const b of bldgs) {
        ctx.strokeRect(toMx(b.x), toMy(b.z), b.w * scale, b.h * scale);
      }

      // Vendors as blue dots
      const vendorColors: Record<string, string> = {
        [VendorType.BLACKSMITH]: "#4488ff",
        [VendorType.ARCANIST]: "#4488ff",
        [VendorType.ALCHEMIST]: "#4488ff",
        [VendorType.JEWELER]: "#4488ff",
        [VendorType.GENERAL_MERCHANT]: "#4488ff",
      };
      ctx.font = `${Math.max(7, W / 25)}px sans-serif`;
      for (const v of this._state.vendors) {
        const mx = toMx(v.x);
        const my = toMy(v.z);
        ctx.fillStyle = vendorColors[v.type] || "#4488ff";
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(200,190,170,0.8)";
        ctx.fillText(v.name.split(" ")[0], mx + 5, my + 3);
      }
    } else {
      // Enemies
      for (const enemy of this._state.enemies) {
        if (enemy.state === EnemyState.DEAD) continue;
        if (enemy.type && (enemy.type as string).startsWith("NIGHT_")) continue;
        if (useFogOfWar && !this._isExplored(enemy.x, enemy.z)) continue;
        const mx = toMx(enemy.x);
        const my = toMy(enemy.z);
        ctx.fillStyle = "#ff3333";
        const r = enemy.isBoss ? 4 : 2;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Loot (colored by rarity)
      for (const loot of this._state.loot) {
        if (useFogOfWar && !this._isExplored(loot.x, loot.z)) continue;
        ctx.fillStyle = RARITY_CSS[loot.item.rarity] || "#ffff00";
        ctx.beginPath();
        ctx.arc(toMx(loot.x), toMy(loot.z), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Treasure chests as yellow dots
      for (const chest of this._state.treasureChests) {
        if (chest.opened) continue;
        if (useFogOfWar && !this._isExplored(chest.x, chest.z)) continue;
        ctx.fillStyle = "#ffdd00";
        ctx.beginPath();
        ctx.arc(toMx(chest.x), toMy(chest.z), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fog of war darkening
      if (useFogOfWar) {
        const fogStepPx = Math.max(2, Math.floor(scale));
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        for (let wx = -halfW; wx < halfW; wx += fogStepPx / scale) {
          for (let wz = -halfD; wz < halfD; wz += fogStepPx / scale) {
            if (!this._isExplored(wx, wz)) {
              ctx.fillRect(toMx(wx), toMy(wz), fogStepPx, fogStepPx);
            }
          }
        }
      }

      // Landmarks as grey shapes
      ctx.fillStyle = "rgba(120,110,100,0.3)";
      ctx.fillRect(toMx(-5), toMy(-5), 10 * scale, 10 * scale);
    }

    // Player as green arrow/triangle
    const pmx = toMx(p.x);
    const pmy = toMy(p.z);
    ctx.save();
    ctx.translate(pmx, pmy);
    ctx.rotate(this._firstPerson ? -p.angle : -p.angle + Math.PI);
    ctx.fillStyle = "#44ff44";
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-3.5, 4);
    ctx.lineTo(3.5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Map name removed from minimap canvas — shown only below the minimap
  }

  private _updateMinimap(): void {
    this._drawMinimapContent(this._minimapCtx, 200, 200);
  }

  private _updateFullmap(): void {
    this._drawMinimapContent(this._fullmapCtx, 400, 400);
  }

  // ──────────────────────────────────────────────────────────────
  //  MAP COMPLETION
  // ──────────────────────────────────────────────────────────────
  private _onMapComplete(): void {
    const p = this._state.player;
    const mapId = this._state.currentMap;
    const reward = MAP_COMPLETION_REWARDS[mapId];
    if (!reward) return;

    const completionKey = `${mapId}_${this._state.difficulty}_${this._state.timeOfDay}`;
    const isFirstClear = !this._state.completedMaps[completionKey];
    const isNight = this._state.timeOfDay === TimeOfDay.NIGHT;
    const diffCfg = DIFFICULTY_CONFIGS[this._state.difficulty];

    let goldReward = Math.floor(reward.gold * diffCfg.goldMult);
    let xpReward = Math.floor(reward.xp * diffCfg.xpMult);
    if (isNight) { goldReward = Math.floor(goldReward * 1.5); xpReward = Math.floor(xpReward * 1.5); }
    if (isFirstClear) { goldReward *= 2; xpReward *= 2; }

    p.gold += goldReward;
    p.xp += xpReward;

    const item = this._pickRandomItemOfRarity(reward.guaranteedDropRarity);
    if (item) {
      const loot: DiabloLoot = {
        id: this._genId(), item: { ...item, id: this._genId() },
        x: p.x + (Math.random() * 2 - 1), y: 0, z: p.z + (Math.random() * 2 - 1), timer: 0,
      };
      this._state.loot.push(loot);
    }

    this._addFloatingText(p.x, p.y + 4, p.z, "MAP CLEARED!", "#ffd700");
    this._addFloatingText(p.x, p.y + 3, p.z, `+${goldReward} Gold  +${xpReward} XP`, "#ffd700");
    if (isFirstClear) {
      this._addFloatingText(p.x, p.y + 2, p.z, "FIRST CLEAR BONUS!", "#44ff44");
    }
    this._addFloatingText(p.x, p.y + 1, p.z, reward.bonusMessage, "#c8a84e");

    this._state.completedMaps[completionKey] = true;

    this._updateQuestProgress(QuestType.CLEAR_MAP, mapId);
  }

  // ──────────────────────────────────────────────────────────────
  //  DEATH / RESPAWN
  // ──────────────────────────────────────────────────────────────
  private _triggerDeath(): void {
    if (this._isDead) return;
    this._isDead = true;
    this._state.deathCount++;
    const p = this._state.player;
    const goldLoss = Math.floor(p.gold * 0.1);
    p.gold -= goldLoss;
    this._state.deathGoldLoss = goldLoss;
    this._state.respawnTimer = 5.0;

    this._deathOverlay.style.display = "flex";
    const goldEl = this._deathOverlay.querySelector("#diablo-gold-loss") as HTMLDivElement;
    if (goldEl) goldEl.textContent = goldLoss > 0 ? `Lost ${goldLoss} gold` : "";
  }

  private _updateDeathRespawn(dt: number): void {
    this._state.respawnTimer -= dt;
    const timerEl = this._deathOverlay.querySelector("#diablo-respawn-timer") as HTMLDivElement;
    if (timerEl) timerEl.textContent = `Respawning in ${Math.ceil(this._state.respawnTimer)}...`;

    if (this._state.respawnTimer <= 0) {
      this._isDead = false;
      this._deathOverlay.style.display = "none";
      const p = this._state.player;
      // Respawn near a random corner of the map
      const rMapCfg = MAP_CONFIGS[this._state.currentMap];
      const rPadX = rMapCfg.width * 0.12;
      const rPadZ = rMapCfg.depth * 0.12;
      const rCorners = [
        { x: rPadX, z: rPadZ },
        { x: rMapCfg.width - rPadX, z: rPadZ },
        { x: rPadX, z: rMapCfg.depth - rPadZ },
        { x: rMapCfg.width - rPadX, z: rMapCfg.depth - rPadZ },
      ];
      const rCorner = rCorners[Math.floor(Math.random() * rCorners.length)];
      p.x = rCorner.x + (Math.random() * 2 - 1);
      p.z = rCorner.z + (Math.random() * 2 - 1);
      p.hp = Math.floor(p.maxHp * 0.5);
      p.mana = Math.floor(p.maxMana * 0.5);
      p.invulnTimer = 3.0;
      p.statusEffects = [];
      this._state.respawnTimer = 0;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  BOSS ABILITIES
  // ──────────────────────────────────────────────────────────────
  private _updateBossAbilities(dt: number): void {
    const p = this._state.player;
    const phases = BOSS_PHASE_CONFIGS[this._state.currentMap];
    if (!phases || phases.length === 0) return;

    for (const enemy of this._state.enemies) {
      if (!enemy.isBoss) continue;
      if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;

      if (enemy.bossPhase === undefined) enemy.bossPhase = 0;
      if (enemy.bossAbilityCooldown === undefined) enemy.bossAbilityCooldown = 3;

      const hpPct = enemy.hp / enemy.maxHp;
      let targetPhase = 0;
      for (let i = phases.length - 1; i >= 0; i--) {
        if (hpPct <= phases[i].hpThreshold) {
          targetPhase = i;
        }
      }

      if (targetPhase > enemy.bossPhase) {
        enemy.bossPhase = targetPhase;
        const phase = phases[targetPhase];
        enemy.damage = enemy.damage * phase.damageMultiplier;
        enemy.speed = enemy.speed * phase.speedMultiplier;
        this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, phase.name, "#ff00ff");
        enemy.bossAbilityCooldown = 1.0;
      }

      const phase = phases[enemy.bossPhase];
      if (!phase || phase.abilities.length === 0) continue;

      if (enemy.bossShieldTimer !== undefined && enemy.bossShieldTimer > 0) {
        enemy.bossShieldTimer -= dt;
      }

      enemy.bossAbilityCooldown = Math.max(0, enemy.bossAbilityCooldown - dt);
      if (enemy.bossAbilityCooldown > 0) continue;

      const dist = this._dist(enemy.x, enemy.z, p.x, p.z);
      if (dist > enemy.aggroRange * 2) continue;

      const ability = phase.abilities[Math.floor(Math.random() * phase.abilities.length)];
      enemy.bossAbilityCooldown = 4.0;

      switch (ability) {
        case BossAbility.GROUND_SLAM: {
          const aoe: DiabloAOE = {
            id: this._genId(),
            x: enemy.x, y: 0, z: enemy.z,
            radius: 6, damage: enemy.damage * 1.5,
            damageType: DamageType.PHYSICAL,
            duration: 0.5, timer: 0,
            ownerId: enemy.id, tickInterval: 0.5, lastTickTimer: 0,
          };
          this._state.aoeEffects.push(aoe);
          this._renderer.spawnParticles(ParticleType.DUST, enemy.x, enemy.y + 0.5, enemy.z, 20, this._state.particles);
          this._renderer.shakeCamera(0.3, 0.4);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "GROUND SLAM!", "#ff8844");
          break;
        }
        case BossAbility.CHARGE: {
          const dx = p.x - enemy.x;
          const dz = p.z - enemy.z;
          const cLen = Math.sqrt(dx * dx + dz * dz);
          if (cLen > 0) {
            enemy.x += (dx / cLen) * 6;
            enemy.z += (dz / cLen) * 6;
          }
          if (this._dist(enemy.x, enemy.z, p.x, p.z) < 3 && p.invulnTimer <= 0) {
            const dmg = Math.max(1, enemy.damage * 2 - p.armor * 0.3);
            p.hp -= dmg;
            this._addFloatingText(p.x, p.y + 2, p.z, `-${Math.round(dmg)}`, "#ff4444");
            if (p.hp <= 0) { p.hp = 0; this._triggerDeath(); }
          }
          this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 15, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "CHARGE!", "#ffaa00");
          break;
        }
        case BossAbility.SUMMON_ADDS: {
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const addEnemy: DiabloEnemy = {
              id: this._genId(),
              type: EnemyType.SKELETON_WARRIOR,
              x: enemy.x + Math.cos(angle) * 4, y: 0, z: enemy.z + Math.sin(angle) * 4,
              angle: Math.random() * Math.PI * 2,
              hp: enemy.maxHp * 0.1, maxHp: enemy.maxHp * 0.1,
              damage: enemy.damage * 0.3, damageType: DamageType.PHYSICAL, armor: 2, speed: 4,
              state: EnemyState.CHASE, targetId: null,
              attackTimer: 1.0, attackRange: 2.0, aggroRange: 20,
              xpReward: 10, lootTable: [], deathTimer: 0, stateTimer: 0,
              patrolTarget: null, statusEffects: [], isBoss: false,
              scale: 0.8, level: enemy.level,
            };
            this._state.enemies.push(addEnemy);
          }
          this._renderer.spawnParticles(ParticleType.LIGHTNING, enemy.x, enemy.y + 1, enemy.z, 15, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "SUMMON!", "#aa44ff");
          break;
        }
        case BossAbility.ENRAGE: {
          if (!enemy.bossEnraged) {
            enemy.bossEnraged = true;
            enemy.damage *= 1.5;
            enemy.speed *= 1.3;
            this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 25, this._state.particles);
            this._renderer.shakeCamera(0.2, 0.5);
            this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "ENRAGED!", "#ff0000");
          }
          break;
        }
        case BossAbility.SHIELD: {
          enemy.bossShieldTimer = 4.0;
          this._renderer.spawnParticles(ParticleType.ICE, enemy.x, enemy.y + 1, enemy.z, 15, this._state.particles);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "SHIELD!", "#4488ff");
          break;
        }
        case BossAbility.METEOR_RAIN: {
          for (let i = 0; i < 5; i++) {
            const mx = p.x + (Math.random() * 12 - 6);
            const mz = p.z + (Math.random() * 12 - 6);
            const aoe: DiabloAOE = {
              id: this._genId(),
              x: mx, y: 0, z: mz,
              radius: 3, damage: enemy.damage * 1.2,
              damageType: DamageType.FIRE,
              duration: 1.0, timer: 0,
              ownerId: enemy.id, tickInterval: 0.5, lastTickTimer: 0,
            };
            this._state.aoeEffects.push(aoe);
          }
          this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 2, enemy.z, 30, this._state.particles);
          this._renderer.shakeCamera(0.4, 0.6);
          this._addFloatingText(enemy.x, enemy.y + 3, enemy.z, "METEOR RAIN!", "#ff4400");
          break;
        }
      }
    }
  }

  private _enemyFireProjectile(enemy: DiabloEnemy): void {
    const p = this._state.player;
    const dx = p.x - enemy.x;
    const dz = p.z - enemy.z;
    const angle = Math.atan2(dx, dz);
    const speed = 15;
    const proj: DiabloProjectile = {
      id: this._genId(),
      x: enemy.x, y: 1, z: enemy.z,
      vx: Math.sin(angle) * speed, vy: 0, vz: Math.cos(angle) * speed,
      speed,
      damage: enemy.damage * 0.8,
      damageType: DamageType.PHYSICAL,
      radius: 0.3,
      ownerId: enemy.id,
      isPlayerOwned: false,
      lifetime: 0,
      maxLifetime: 3.0,
    };
    this._state.projectiles.push(proj);
  }

  // ──────────────────────────────────────────────────────────────
  //  TALENT TREE
  // ──────────────────────────────────────────────────────────────
  private _getTalentBonuses(): Partial<Record<TalentEffectType, number>> {
    const p = this._state.player;
    const tree = TALENT_TREES[p.class];
    const result: Partial<Record<TalentEffectType, number>> = {};
    for (const node of tree) {
      const rank = p.talents[node.id] || 0;
      if (rank > 0) {
        for (const eff of node.effects) {
          result[eff.type] = (result[eff.type] || 0) + eff.value * rank;
        }
      }
    }
    return result;
  }

  private _getTalentPointsInBranch(branch: number): number {
    const p = this._state.player;
    const tree = TALENT_TREES[p.class];
    let total = 0;
    for (const node of tree) {
      if (node.branch === branch) {
        total += (p.talents[node.id] || 0);
      }
    }
    return total;
  }

  private _showSkillTreeScreen(): void {
    const p = this._state.player;

    // All skills for the player's class, ordered by unlock level
    const SKILL_UNLOCK_LEVELS: Partial<Record<SkillId, number>> = {
      // Warrior
      [SkillId.CLEAVE]: 1, [SkillId.SHIELD_BASH]: 3, [SkillId.WHIRLWIND]: 6,
      [SkillId.BATTLE_CRY]: 10, [SkillId.GROUND_SLAM]: 15, [SkillId.BLADE_FURY]: 20,
      [SkillId.LEAP]: 3, [SkillId.IRON_SKIN]: 6, [SkillId.TAUNT]: 9,
      [SkillId.CRUSHING_BLOW]: 12, [SkillId.INTIMIDATING_ROAR]: 15, [SkillId.EARTHQUAKE]: 18,
      // Mage
      [SkillId.FIREBALL]: 1, [SkillId.LIGHTNING_BOLT]: 3, [SkillId.ICE_NOVA]: 6,
      [SkillId.ARCANE_SHIELD]: 10, [SkillId.METEOR]: 15, [SkillId.CHAIN_LIGHTNING]: 20,
      [SkillId.SUMMON_ELEMENTAL]: 3, [SkillId.BLINK]: 6, [SkillId.FROST_BARRIER]: 9,
      [SkillId.ARCANE_MISSILES]: 12, [SkillId.MANA_SIPHON]: 15, [SkillId.TIME_WARP]: 18,
      // Ranger
      [SkillId.MULTI_SHOT]: 1, [SkillId.POISON_ARROW]: 3, [SkillId.EVASIVE_ROLL]: 6,
      [SkillId.EXPLOSIVE_TRAP]: 10, [SkillId.RAIN_OF_ARROWS]: 15, [SkillId.PIERCING_SHOT]: 20,
      [SkillId.GRAPPLING_HOOK]: 3, [SkillId.CAMOUFLAGE]: 6, [SkillId.NET_TRAP]: 9,
      [SkillId.FIRE_VOLLEY]: 12, [SkillId.WIND_WALK]: 15, [SkillId.SHADOW_STRIKE]: 18,
    };

    // Skill upgrade descriptions per level tier
    const SKILL_UPGRADES: Record<number, string> = {
      5: "+10% damage",
      10: "+15% damage, -1s cooldown",
      15: "+20% damage, -10% mana cost",
      20: "+25% damage, -2s cooldown",
      25: "+30% damage, +1 range",
      30: "+40% damage, -15% mana cost",
      35: "+50% damage, +AOE radius",
      40: "+60% damage, -3s cooldown",
    };

    // Get all skills for current class
    const classSkills = Object.values(SKILL_DEFS).filter((s) => s.class === p.class);
    classSkills.sort((a, b) => (SKILL_UNLOCK_LEVELS[a.id] || 99) - (SKILL_UNLOCK_LEVELS[b.id] || 99));

    let skillsHtml = "";
    for (const def of classSkills) {
      const unlockLvl = SKILL_UNLOCK_LEVELS[def.id] || 1;
      const unlocked = p.level >= unlockLvl;
      const isActive = p.skills.includes(def.id);
      const borderColor = isActive ? "#c8a84e" : unlocked ? "#5a8a2a" : "#3a3a3a";
      const opacity = unlocked ? "1" : "0.5";

      const statusText = isActive
        ? `<span style="color:#ffd700;font-weight:bold;">EQUIPPED</span>`
        : unlocked
          ? `<span style="color:#5a5;">UNLOCKED</span>`
          : `<span style="color:#888;">Unlocks at Level ${unlockLvl}</span>`;

      // Status effect info
      let statusEffHtml = "";
      if (def.statusEffect) {
        statusEffHtml = `<span style="color:#f84;">Applies: ${def.statusEffect}</span>`;
      }

      // AOE info
      let aoeHtml = "";
      if (def.aoeRadius) {
        aoeHtml = `<span style="color:#8af;">AOE: ${def.aoeRadius} radius</span>`;
      }

      // Build upgrade progression
      let upgradeHtml = "";
      const upgradeLevels = [5, 10, 15, 20, 25, 30, 35, 40];
      for (const uLvl of upgradeLevels) {
        if (uLvl <= unlockLvl) continue; // skip upgrades below unlock level
        const reached = p.level >= uLvl;
        const color = reached ? "#6c6" : "#555";
        const check = reached ? "+" : "-";
        upgradeHtml += `<div style="color:${color};font-size:11px;margin-left:8px;">${check} Lv.${uLvl}: ${SKILL_UPGRADES[uLvl]}</div>`;
      }

      // Build specialization / branch choices
      const skillBranches = SKILL_BRANCHES.filter((b) => b.skillId === def.id);
      const totalTalentSpent = Object.values(p.talents).reduce((sum, v) => sum + v, 0);
      let branchHtml = "";
      for (const bd of skillBranches) {
        const key = `${bd.skillId}_b${bd.tier}`;
        const choice = p.skillBranches[key] || 0;
        const meetsReq = totalTalentSpent >= bd.talentReq;

        const renderOption = (opt: typeof bd.optionA, optIdx: 1 | 2) => {
          const isChosen = choice === optIdx;
          const isOther = choice > 0 && !isChosen;
          let modifiers = "";
          if (opt.damageMult && opt.damageMult !== 1) modifiers += `<span style="color:#fa8;">Dmg x${opt.damageMult}</span> `;
          if (opt.cooldownMult && opt.cooldownMult !== 1) modifiers += `<span style="color:#8af;">CD x${opt.cooldownMult}</span> `;
          if (opt.manaCostMult && opt.manaCostMult !== 1) modifiers += `<span style="color:#48f;">Mana x${opt.manaCostMult}</span> `;
          if (opt.aoeRadiusMult && opt.aoeRadiusMult !== 1) modifiers += `<span style="color:#8af;">AoE x${opt.aoeRadiusMult}</span> `;
          if (opt.extraProjectiles) modifiers += `<span style="color:#ff8;">+${opt.extraProjectiles} proj</span> `;
          if (opt.statusOverride) modifiers += `<span style="color:#f84;">${opt.statusOverride}</span> `;

          const borderCol = isChosen ? "#ffd700" : isOther ? "#2a2a2a" : meetsReq ? "#5a8a2a" : "#3a3a3a";
          const opac = isOther ? "0.4" : (!meetsReq && !isChosen) ? "0.5" : "1";
          const canChoose = !choice && meetsReq;

          return `<div class="branch-opt" data-branch-key="${key}" data-branch-choice="${optIdx}" style="
            flex:1;background:rgba(10,8,4,0.9);border:2px solid ${borderCol};border-radius:6px;
            padding:8px;opacity:${opac};cursor:${canChoose ? "pointer" : "default"};
            pointer-events:auto;transition:border-color 0.2s;min-width:0;
          ">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:18px;">${opt.icon}</span>
              <span style="color:${isChosen ? "#ffd700" : "#c8a84e"};font-weight:bold;font-size:12px;">${opt.name}</span>
            </div>
            <div style="color:#aaa;font-size:10px;margin-bottom:4px;">${opt.description}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:10px;">${modifiers}</div>
            ${isChosen ? '<div style="color:#ffd700;font-size:10px;margin-top:4px;font-weight:bold;">CHOSEN</div>' : ""}
            ${canChoose ? '<div style="color:#5a5;font-size:10px;margin-top:4px;font-weight:bold;">CHOOSE</div>' : ""}
          </div>`;
        };

        const reqText = meetsReq
          ? ""
          : `<div style="color:#888;font-size:10px;margin-bottom:4px;">Requires ${bd.talentReq} talent points invested (${totalTalentSpent} / ${bd.talentReq})</div>`;

        branchHtml += `
          <div style="margin-top:6px;">
            <div style="font-size:11px;color:#c8a84e;margin-bottom:4px;">Tier ${bd.tier} Specialization</div>
            ${reqText}
            <div style="display:flex;gap:8px;">
              ${renderOption(bd.optionA, 1)}
              ${renderOption(bd.optionB, 2)}
            </div>
          </div>`;
      }

      skillsHtml += `
        <div style="
          background:rgba(15,10,5,0.9);border:2px solid ${borderColor};border-radius:8px;
          padding:14px;opacity:${opacity};transition:border-color 0.2s;margin-bottom:10px;
        ">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span style="font-size:28px;">${def.icon}</span>
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="color:#c8a84e;font-weight:bold;font-size:16px;">${def.name}</span>
                ${statusText}
              </div>
              <div style="color:#aaa;font-size:12px;margin-top:2px;">${def.description}</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#999;margin-bottom:6px;">
            <span>Cooldown: ${def.cooldown}s</span>
            <span style="color:#48f;">Mana: ${def.manaCost}</span>
            <span style="color:#fa8;">Type: ${def.damageType}</span>
            <span>Dmg: x${def.damageMultiplier}</span>
            ${statusEffHtml}
            ${aoeHtml}
          </div>
          ${upgradeHtml ? `<div style="border-top:1px solid #333;padding-top:4px;margin-top:4px;">
            <div style="font-size:11px;color:#888;margin-bottom:2px;">Level Upgrades:</div>
            ${upgradeHtml}
          </div>` : ""}
          ${branchHtml ? `<div style="border-top:1px solid #444;padding-top:6px;margin-top:6px;">
            <div style="font-size:12px;color:#c8a84e;font-weight:bold;margin-bottom:4px;">Specializations</div>
            ${branchHtml}
          </div>` : ""}
        </div>`;
    }

    // Talent summary
    const talentBonuses = this._getTalentBonuses();
    const cdr = talentBonuses[TalentEffectType.SKILL_COOLDOWN_REDUCTION] || 0;
    const bonusDmg = talentBonuses[TalentEffectType.BONUS_DAMAGE_PERCENT] || 0;
    let talentSummary = "";
    if (cdr > 0) talentSummary += `<span style="color:#8af;margin-right:12px;">CDR: ${cdr}%</span>`;
    if (bonusDmg > 0) talentSummary += `<span style="color:#fa8;margin-right:12px;">+${bonusDmg}% Damage</span>`;
    if (!talentSummary) talentSummary = `<span style="color:#555;">No talent bonuses yet</span>`;

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.90);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <h2 style="color:#c8a84e;font-size:32px;letter-spacing:3px;margin-bottom:4px;font-family:'Georgia',serif;
          text-shadow:0 0 15px rgba(200,168,78,0.4);">SKILL TREE</h2>
        <div style="font-size:14px;color:#888;margin-bottom:12px;">Level ${p.level} ${p.class.charAt(0).toUpperCase() + p.class.slice(1).toLowerCase()} — Talent Points: <span style="color:#ffd700;">${p.talentPoints}</span></div>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <button id="st-tab-skills" style="
            padding:8px 24px;font-size:14px;letter-spacing:2px;font-weight:bold;
            background:rgba(60,50,20,0.9);border:2px solid #c8a84e;border-radius:6px;color:#ffd700;
            cursor:pointer;font-family:'Georgia',serif;pointer-events:auto;
          ">SKILLS</button>
          <button id="st-tab-talents" style="
            padding:8px 24px;font-size:14px;letter-spacing:2px;font-weight:bold;
            background:rgba(30,20,10,0.7);border:2px solid #3a3a2a;border-radius:6px;color:#888;
            cursor:pointer;font-family:'Georgia',serif;pointer-events:auto;
          ">TALENTS</button>
        </div>
        <div style="max-width:600px;width:90%;max-height:60vh;overflow-y:auto;padding:4px;">
          ${skillsHtml}
        </div>
        <div style="margin-top:12px;padding:8px 16px;background:rgba(20,15,10,0.9);border:1px solid #5a4a2a;border-radius:8px;font-size:13px;">
          Talent Bonuses: ${talentSummary}
        </div>
        <div style="margin-top:10px;color:#888;font-size:12px;">Press Escape to close</div>
      </div>`;

    // Tab switching
    this._menuEl.querySelector("#st-tab-talents")!.addEventListener("click", () => {
      this._showTalentTree();
    });
    this._menuEl.querySelector("#st-tab-skills")!.addEventListener("mouseenter", (ev) => {
      (ev.target as HTMLElement).style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
    });
    this._menuEl.querySelector("#st-tab-skills")!.addEventListener("mouseleave", (ev) => {
      (ev.target as HTMLElement).style.boxShadow = "none";
    });
    this._menuEl.querySelector("#st-tab-talents")!.addEventListener("mouseenter", (ev) => {
      (ev.target as HTMLElement).style.borderColor = "#c8a84e";
      (ev.target as HTMLElement).style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
    });
    this._menuEl.querySelector("#st-tab-talents")!.addEventListener("mouseleave", (ev) => {
      (ev.target as HTMLElement).style.borderColor = "#3a3a2a";
      (ev.target as HTMLElement).style.boxShadow = "none";
    });

    // Wire up branch specialization choice buttons
    const branchOpts = this._menuEl.querySelectorAll(".branch-opt") as NodeListOf<HTMLDivElement>;
    branchOpts.forEach((el) => {
      const key = el.getAttribute("data-branch-key")!;
      const choiceVal = parseInt(el.getAttribute("data-branch-choice")!, 10);
      const currentChoice = p.skillBranches[key] || 0;
      const bd = SKILL_BRANCHES.find((b) => `${b.skillId}_b${b.tier}` === key);
      if (!bd) return;
      const totalSpent = Object.values(p.talents).reduce((sum, v) => sum + v, 0);
      const canChoose = !currentChoice && totalSpent >= bd.talentReq;

      if (canChoose) {
        el.addEventListener("mouseenter", () => {
          el.style.borderColor = "#c8a84e";
          el.style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.borderColor = "#5a8a2a";
          el.style.boxShadow = "none";
        });
        el.addEventListener("click", () => {
          p.skillBranches[key] = choiceVal;
          this._showSkillTreeScreen(); // refresh to show chosen state
        });
      }
    });
  }

  private _showTalentTree(): void {
    const p = this._state.player;
    const tree = TALENT_TREES[p.class];
    const branchNames = TALENT_BRANCH_NAMES[p.class];

    const renderTree = () => {
      let branchesHtml = "";
      for (let b = 0; b < 3; b++) {
        const branchNodes = tree.filter((n) => n.branch === b);
        const pointsInBranch = this._getTalentPointsInBranch(b);

        let nodesHtml = "";
        for (const node of branchNodes.sort((a, c) => a.tier - c.tier)) {
          const rank = p.talents[node.id] || 0;
          const isMaxed = rank >= node.maxRank;
          const tierReq = node.tier * 3;
          const hasPrereq = !node.requires || (p.talents[node.requires] || 0) > 0;
          const hasTierReq = pointsInBranch >= tierReq;
          const canInvest = p.talentPoints > 0 && !isMaxed && hasPrereq && hasTierReq;
          const borderColor = isMaxed ? "#ffd700" : canInvest ? "#5a8a2a" : "#3a3a3a";
          const opacity = (rank > 0 || canInvest) ? "1" : "0.5";

          let effectsText = "";
          for (const eff of node.effects) {
            effectsText += `<div style="font-size:10px;color:#8f8;">+${eff.value * Math.max(1, rank)} total</div>`;
          }

          nodesHtml += `
            <div class="talent-node" data-talent-id="${node.id}" style="
              width:148px;background:rgba(15,10,5,0.9);
              border:2px solid ${borderColor};
              border-radius:8px;padding:10px;cursor:${canInvest ? "pointer" : "default"};
              pointer-events:auto;opacity:${opacity};transition:border-color 0.2s,box-shadow 0.3s;
              position:relative;
              ${isMaxed ? "box-shadow:0 0 10px rgba(255,215,0,0.2),inset 0 0 10px rgba(255,215,0,0.05);" : rank > 0 ? "box-shadow:0 0 8px rgba(90,138,42,0.2);" : ""}
            ">
              ${isMaxed ? '<div style="position:absolute;top:3px;right:3px;color:#ffd700;font-size:8px;">\u2605</div>' : ""}
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <div style="position:relative;display:inline-block;">
                  ${rank > 0 ? '<div style="position:absolute;inset:-3px;border-radius:50%;background:radial-gradient(circle,' + (isMaxed ? 'rgba(255,215,0,0.15)' : 'rgba(90,138,42,0.1)') + ',transparent 70%);"></div>' : ""}
                  <span style="font-size:20px;position:relative;z-index:1;">${node.icon}</span>
                </div>
                <span style="color:#c8a84e;font-size:13px;font-weight:bold;">${node.name}</span>
              </div>
              <div style="font-size:11px;color:#aaa;margin-bottom:4px;">${node.description}</div>
              <div style="font-size:12px;color:${isMaxed ? "#ffd700" : "#ccc"};">${rank}/${node.maxRank}</div>
              ${effectsText}
            </div>`;
        }

        branchesHtml += `
          <div style="display:flex;flex-direction:column;gap:8px;align-items:center;
            background:rgba(10,8,4,0.4);border:1px solid #3a2a1a;border-radius:8px;padding:12px 10px;">
            <div style="color:#c8a84e;font-size:16px;font-weight:bold;letter-spacing:1px;padding-bottom:4px;width:100%;text-align:center;
              border-bottom:1px solid #5a4a2a;text-shadow:0 0 8px rgba(200,168,78,0.2);">${branchNames[b]}</div>
            <div style="font-size:11px;color:#888;">${pointsInBranch} points invested</div>
            ${nodesHtml}
          </div>`;
      }

      // Summary of active bonuses
      const bonuses = this._getTalentBonuses();
      let summaryHtml = "";
      const effectLabels: Record<string, string> = {
        [TalentEffectType.BONUS_DAMAGE_PERCENT]: "Damage",
        [TalentEffectType.BONUS_HP_PERCENT]: "HP",
        [TalentEffectType.BONUS_MANA_PERCENT]: "Mana",
        [TalentEffectType.BONUS_ARMOR]: "Armor",
        [TalentEffectType.BONUS_CRIT_CHANCE]: "Crit Chance",
        [TalentEffectType.BONUS_CRIT_DAMAGE]: "Crit Damage",
        [TalentEffectType.BONUS_ATTACK_SPEED]: "Atk Speed",
        [TalentEffectType.BONUS_MOVE_SPEED]: "Move Speed",
        [TalentEffectType.SKILL_COOLDOWN_REDUCTION]: "CDR",
        [TalentEffectType.LIFE_STEAL_PERCENT]: "Life Steal",
        [TalentEffectType.MANA_REGEN]: "Mana Regen",
        [TalentEffectType.BONUS_AOE_RADIUS]: "AoE Radius",
        [TalentEffectType.RESISTANCE_ALL]: "All Resist",
      };
      for (const [key, val] of Object.entries(bonuses)) {
        if (val && val > 0) {
          const label = effectLabels[key] || key;
          const isPercent = key.includes("PERCENT") || key.includes("COOLDOWN") || key.includes("CRIT") || key.includes("DAMAGE_PERCENT") || key.includes("HP_PERCENT") || key.includes("MANA_PERCENT") || key.includes("ATTACK_SPEED");
          summaryHtml += `<span style="color:#8f8;font-size:12px;margin-right:12px;">+${val}${isPercent ? "%" : ""} ${label}</span>`;
        }
      }
      if (!summaryHtml) summaryHtml = `<span style="color:#666;font-size:12px;">No talents invested</span>`;

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.90);display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;position:relative;
        ">
          <!-- Stone tablet background -->
          <div style="position:relative;padding:24px 30px;
            background:linear-gradient(180deg,rgba(25,20,12,0.98),rgba(18,14,8,0.98));
            border:2px solid #5a4a2a;border-radius:8px;
            box-shadow:inset 0 0 50px rgba(0,0,0,0.3),0 0 20px rgba(0,0,0,0.5);
            background-image:repeating-linear-gradient(90deg,transparent,transparent 30px,rgba(90,74,42,0.02) 30px,rgba(90,74,42,0.02) 31px);">
            <!-- Inner border -->
            <div style="position:absolute;inset:4px;border:1px solid #3a2a1a;border-radius:6px;pointer-events:none;"></div>

            <!-- Title with flourishes -->
            <div style="text-align:center;margin-bottom:4px;">
              <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:4px;">
                <div style="width:50px;height:1px;background:linear-gradient(to right,transparent,#c8a84e);"></div>
                <span style="color:#c8a84e;font-size:10px;">\u2726</span>
                <div style="width:50px;height:1px;background:linear-gradient(to left,transparent,#c8a84e);"></div>
              </div>
              <h2 style="color:#c8a84e;font-size:32px;letter-spacing:3px;margin:0 0 4px;font-family:'Georgia',serif;
                text-shadow:0 0 15px rgba(200,168,78,0.4);">TALENT TREE</h2>
              <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px;">
                <div style="width:50px;height:1px;background:linear-gradient(to right,transparent,#c8a84e);"></div>
                <span style="color:#c8a84e;font-size:10px;">\u2726</span>
                <div style="width:50px;height:1px;background:linear-gradient(to left,transparent,#c8a84e);"></div>
              </div>
            </div>
            <div style="font-size:16px;color:#ffd700;margin-bottom:16px;text-align:center;text-shadow:0 0 8px rgba(255,215,0,0.2);">Available Points: ${p.talentPoints}</div>
            <div style="display:flex;gap:24px;align-items:flex-start;">${branchesHtml}</div>
            <!-- Summary with ornate frame -->
            <div style="margin-top:16px;padding:10px 16px;background:rgba(20,15,10,0.9);border:1px solid #5a4a2a;border-radius:8px;
              box-shadow:inset 0 0 20px rgba(0,0,0,0.2);text-align:center;">
              ${summaryHtml}
            </div>
            <div style="margin-top:12px;color:#888;font-size:12px;text-align:center;">Press T or Escape to close</div>
          </div>
        </div>`;

      // Wire up talent node clicks
      const nodes = this._menuEl.querySelectorAll(".talent-node") as NodeListOf<HTMLDivElement>;
      nodes.forEach((el) => {
        const talentId = el.getAttribute("data-talent-id")!;
        const node = tree.find((n) => n.id === talentId)!;
        const rank = p.talents[node.id] || 0;
        const isMaxed = rank >= node.maxRank;
        const pointsInBranch = this._getTalentPointsInBranch(node.branch);
        const tierReq = node.tier * 3;
        const hasPrereq = !node.requires || (p.talents[node.requires] || 0) > 0;
        const hasTierReq = pointsInBranch >= tierReq;
        const canInvest = p.talentPoints > 0 && !isMaxed && hasPrereq && hasTierReq;

        if (canInvest) {
          el.addEventListener("mouseenter", () => {
            el.style.borderColor = "#c8a84e";
            el.style.boxShadow = "0 0 12px rgba(200,168,78,0.3)";
          });
          el.addEventListener("mouseleave", () => {
            el.style.borderColor = "#5a8a2a";
            el.style.boxShadow = "none";
          });
          el.addEventListener("click", () => {
            p.talents[node.id] = (p.talents[node.id] || 0) + 1;
            p.talentPoints--;
            this._recalculatePlayerStats();
            renderTree();
          });
        }
      });
    };

    renderTree();
  }

  // ──────────────────────────────────────────────────────────────
  //  LANTERN TOGGLE
  // ──────────────────────────────────────────────────────────────
  private _toggleLantern(): void {
    const p = this._state.player;
    if (!p.equipment.lantern) {
      this._addFloatingText(p.x, p.y + 2, p.z, "No lantern equipped!", "#ff4444");
      return;
    }
    p.lanternOn = !p.lanternOn;
    const cfg = LANTERN_CONFIGS[p.equipment.lantern.name];
    if (p.lanternOn && cfg) {
      this._renderer.setPlayerLantern(true, cfg.intensity, cfg.distance, cfg.color);
      this._addFloatingText(p.x, p.y + 2, p.z, "Lantern ON", "#ffcc44");
    } else {
      this._renderer.setPlayerLantern(false);
      this._addFloatingText(p.x, p.y + 2, p.z, "Lantern OFF", "#888888");
      p.lanternOn = false;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  POTION SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _useQuickPotion(type: PotionType.HEALTH | PotionType.MANA): void {
    const p = this._state.player;
    if (p.potionCooldown > 0) return;

    // Find from potion slots first, then inventory
    for (let i = 0; i < 4; i++) {
      const pot = p.potionSlots[i];
      if (pot && ((type === PotionType.HEALTH && (pot.type === PotionType.HEALTH || pot.type === PotionType.REJUVENATION))
        || (type === PotionType.MANA && (pot.type === PotionType.MANA || pot.type === PotionType.REJUVENATION)))) {
        this._consumePotion(pot, i);
        return;
      }
    }
    // Fallback to potion inventory
    for (let i = 0; i < p.potions.length; i++) {
      const pot = p.potions[i];
      if ((type === PotionType.HEALTH && (pot.type === PotionType.HEALTH || pot.type === PotionType.REJUVENATION))
        || (type === PotionType.MANA && (pot.type === PotionType.MANA || pot.type === PotionType.REJUVENATION))) {
        this._consumePotionFromInventory(i);
        return;
      }
    }
  }

  private _usePotionSlot(slotIdx: number): void {
    const p = this._state.player;
    if (p.potionCooldown > 0) return;
    const pot = p.potionSlots[slotIdx];
    if (!pot) return;
    this._consumePotion(pot, slotIdx);
  }

  private _consumePotion(pot: DiabloPotion, slotIdx: number): void {
    const p = this._state.player;
    this._applyPotionEffect(pot);
    p.potionSlots[slotIdx] = null;
    p.potionCooldown = pot.cooldown;
  }

  private _consumePotionFromInventory(idx: number): void {
    const p = this._state.player;
    const pot = p.potions[idx];
    this._applyPotionEffect(pot);
    p.potions.splice(idx, 1);
    p.potionCooldown = pot.cooldown;
  }

  private _applyPotionEffect(pot: DiabloPotion): void {
    const p = this._state.player;
    switch (pot.type) {
      case PotionType.HEALTH:
        p.hp = Math.min(p.maxHp, p.hp + pot.value);
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value} HP`, "#44ff44");
        break;
      case PotionType.MANA:
        p.mana = Math.min(p.maxMana, p.mana + pot.value);
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value} Mana`, "#4488ff");
        break;
      case PotionType.REJUVENATION:
        p.hp = Math.min(p.maxHp, p.hp + pot.value);
        p.mana = Math.min(p.maxMana, p.mana + 150);
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value} HP`, "#44ff44");
        this._addFloatingText(p.x, p.y + 3.5, p.z, "+150 Mana", "#4488ff");
        break;
      case PotionType.STRENGTH:
        p.activePotionBuffs.push({ type: PotionType.STRENGTH, value: pot.value, remaining: pot.duration || 30 });
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value}% Damage!`, "#ff8800");
        break;
      case PotionType.SPEED:
        p.activePotionBuffs.push({ type: PotionType.SPEED, value: pot.value, remaining: pot.duration || 20 });
        this._addFloatingText(p.x, p.y + 2.5, p.z, `+${pot.value}% Speed!`, "#44ffff");
        this._recalculatePlayerStats();
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  ELEMENTAL RESISTANCE DAMAGE REDUCTION
  // ──────────────────────────────────────────────────────────────
  private _getPlayerResistances(): { fire: number; ice: number; lightning: number; poison: number } {
    const p = this._state.player;
    let fire = 0, ice = 0, lightning = 0, poison = 0;
    const equipKeys: (keyof DiabloEquipment)[] = [
      "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
    ];
    for (const key of equipKeys) {
      const item = p.equipment[key];
      if (!item) continue;
      const s = item.stats as any;
      if (s.fireResist) fire += s.fireResist;
      if (s.iceResist) ice += s.iceResist;
      if (s.lightningResist) lightning += s.lightningResist;
      if (s.poisonResist) poison += s.poisonResist;
    }
    const talentBonuses = this._getTalentBonuses();
    const allResist = talentBonuses[TalentEffectType.RESISTANCE_ALL] || 0;
    fire += allResist;
    ice += allResist;
    lightning += allResist;
    poison += allResist;
    return { fire, ice, lightning, poison };
  }

  private _applyPlayerDefenses(rawDmg: number, dmgType: DamageType): number {
    const p = this._state.player;
    const resists = this._getPlayerResistances();

    // Physical: armor only
    if (dmgType === DamageType.PHYSICAL) {
      return Math.max(1, rawDmg - p.armor * 0.3);
    }

    // Apply armor first
    let afterArmor = Math.max(1, rawDmg - p.armor * 0.15);

    // Get elemental resistance
    let resist = 0;
    switch (dmgType) {
      case DamageType.FIRE: resist = resists.fire; break;
      case DamageType.ICE: resist = resists.ice; break;
      case DamageType.LIGHTNING: resist = resists.lightning; break;
      case DamageType.POISON: resist = resists.poison; break;
      case DamageType.ARCANE:
      case DamageType.SHADOW:
        resist = (resists.fire + resists.ice + resists.lightning + resists.poison) / 4;
        break;
      default:
        resist = 0;
    }

    // Diminishing returns: reduction = resist / (resist + 100)
    const reduction = resist / (resist + 100);
    return Math.max(1, afterArmor * (1 - reduction));
  }

  // ──────────────────────────────────────────────────────────────
  //  QUEST SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _updateQuestTracker(): void {
    const active = this._state.activeQuests.filter(q => q.isActive && !q.isComplete);
    if (active.length === 0) {
      this._questTracker.style.display = "none";
      return;
    }
    this._questTracker.style.display = "block";
    let html = `<div style="color:#c8a84e;font-size:13px;font-weight:bold;margin-bottom:6px;border-bottom:1px solid #5a4a2a;padding-bottom:4px;">QUESTS</div>`;
    for (const q of active) {
      const pct = Math.min(100, (q.progress / q.required) * 100);
      html += `
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:#ddd;margin-bottom:2px;">${q.name}</div>
          <div style="width:100%;height:6px;background:rgba(30,25,15,0.9);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#c8a84e,#ffd700);border-radius:3px;"></div>
          </div>
          <div style="font-size:10px;color:#888;margin-top:1px;">${q.progress}/${q.required}</div>
        </div>`;
    }
    this._questTracker.innerHTML = html;
  }

  private _updateQuestProgress(type: QuestType, context: string | undefined): void {
    for (const quest of this._state.activeQuests) {
      if (quest.isComplete || !quest.isActive) continue;
      if (quest.type !== type) continue;

      let matches = false;
      switch (type) {
        case QuestType.KILL_COUNT:
          if (quest.mapId && quest.mapId === context) matches = true;
          else if (!quest.mapId) matches = true;
          break;
        case QuestType.KILL_SPECIFIC:
          if (quest.target.enemyType === context) matches = true;
          break;
        case QuestType.CLEAR_MAP:
          if (quest.id === 'q_completionist') {
            quest.progress = Object.keys(this._state.completedMaps).length;
            if (quest.progress >= quest.required) this._completeQuest(quest);
            return;
          }
          if (quest.target.mapId === context || !quest.target.mapId) matches = true;
          break;
        case QuestType.BOSS_KILL:
          if (!quest.mapId || quest.mapId === context) matches = true;
          break;
        case QuestType.NIGHT_BOSS:
          matches = true;
          break;
        case QuestType.COLLECT_GOLD:
          quest.progress = this._state.player.gold;
          if (quest.progress >= quest.required) this._completeQuest(quest);
          return;
        case QuestType.TREASURE_HUNT:
          quest.progress = this._chestsOpened;
          if (quest.progress >= quest.required) this._completeQuest(quest);
          return;
      }

      if (matches) {
        quest.progress++;
        if (quest.progress >= quest.required) {
          this._completeQuest(quest);
        }
      }
    }
  }

  private _completeQuest(quest: DiabloQuest): void {
    quest.isComplete = true;
    quest.isActive = false;
    this._state.completedQuestIds.push(quest.id);

    const p = this._state.player;
    p.gold += quest.rewards.gold;
    p.xp += quest.rewards.xp;

    if (quest.rewards.itemRarity) {
      const item = this._pickRandomItemOfRarity(quest.rewards.itemRarity);
      if (item) {
        const emptyIdx = p.inventory.findIndex(s => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = { ...item, id: this._genId() };
        } else {
          const loot: DiabloLoot = {
            id: this._genId(), item: { ...item, id: this._genId() },
            x: p.x + (Math.random() * 2 - 1), y: 0, z: p.z + (Math.random() * 2 - 1), timer: 0,
          };
          this._state.loot.push(loot);
        }
      }
    }

    this._addFloatingText(p.x, p.y + 4, p.z, `QUEST COMPLETE: ${quest.name}!`, "#ffd700");
    this._addFloatingText(p.x, p.y + 3, p.z, `+${quest.rewards.gold} Gold  +${quest.rewards.xp} XP`, "#c8a84e");

    this._state.activeQuests = this._state.activeQuests.filter(q => q.id !== quest.id);
  }

  private _showQuestBoard(): void {
    const available = QUEST_DATABASE.filter(
      q => !this._state.completedQuestIds.includes(q.id) &&
           !this._state.activeQuests.some(aq => aq.id === q.id)
    );
    const active = this._state.activeQuests.filter(q => q.isActive);
    const completed = this._state.completedQuestIds;

    let availHtml = "";
    for (const q of available) {
      const rewardText = `${q.rewards.gold}g + ${q.rewards.xp}xp${q.rewards.itemRarity ? ` + ${RARITY_NAMES[q.rewards.itemRarity]} item` : ""}`;
      const rewardColor = q.rewards.itemRarity ? RARITY_CSS[q.rewards.itemRarity] : "#ffd700";
      availHtml += `
        <div class="quest-available" data-quest-id="${q.id}" style="
          background:rgba(20,15,8,0.9);border:1px solid #5a4a2a;border-radius:6px;padding:12px;
          cursor:pointer;transition:border-color 0.2s;pointer-events:auto;
        ">
          <div style="color:#c8a84e;font-weight:bold;font-size:14px;">${q.name}</div>
          <div style="color:#aaa;font-size:12px;margin:4px 0;">${q.description}</div>
          <div style="color:${rewardColor};font-size:11px;">Reward: ${rewardText}</div>
          <div style="color:#888;font-size:11px;">Goal: ${q.required}</div>
        </div>`;
    }

    let activeHtml = "";
    for (const q of active) {
      const pct = Math.min(100, (q.progress / q.required) * 100);
      activeHtml += `
        <div class="quest-active" data-quest-id="${q.id}" style="
          background:rgba(20,15,8,0.9);border:1px solid #c8a84e;border-radius:6px;padding:12px;
          pointer-events:auto;
        ">
          <div style="color:#ffd700;font-weight:bold;font-size:14px;">${q.name}</div>
          <div style="color:#aaa;font-size:12px;margin:4px 0;">${q.description}</div>
          <div style="width:100%;height:8px;background:rgba(30,25,15,0.9);border-radius:4px;overflow:hidden;margin:6px 0;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#c8a84e,#ffd700);border-radius:4px;"></div>
          </div>
          <div style="color:#888;font-size:11px;">${q.progress}/${q.required}</div>
          <button class="quest-abandon" data-quest-id="${q.id}" style="
            margin-top:6px;padding:4px 12px;font-size:11px;background:rgba(60,20,20,0.8);
            border:1px solid #a44;border-radius:4px;color:#e66;cursor:pointer;pointer-events:auto;
          ">Abandon</button>
        </div>`;
    }

    const canAccept = active.length < 5;

    this._menuEl.innerHTML = `
      <div style="
        width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
        align-items:center;justify-content:center;color:#fff;pointer-events:auto;
      ">
        <div style="
          max-width:900px;width:92%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
          border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
        ">
          <h2 style="color:#c8a84e;font-size:32px;letter-spacing:3px;margin:0 0 16px;text-align:center;font-family:'Georgia',serif;
            text-shadow:0 0 15px rgba(200,168,78,0.4);">QUEST BOARD</h2>
          <div style="color:#888;font-size:12px;text-align:center;margin-bottom:16px;">${completed.length} quests completed | ${active.length}/5 active</div>
          <div style="display:flex;gap:20px;">
            <div style="flex:1;min-width:0;">
              <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;">AVAILABLE QUESTS</div>
              <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">
                ${availHtml || '<div style="color:#666;font-size:13px;">No quests available.</div>'}
              </div>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="color:#ffd700;font-size:14px;font-weight:bold;margin-bottom:8px;">ACTIVE QUESTS</div>
              <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">
                ${activeHtml || '<div style="color:#666;font-size:13px;">No active quests.</div>'}
              </div>
            </div>
          </div>
          <div id="quest-status" style="margin-top:10px;text-align:center;color:#ff4444;font-size:14px;min-height:20px;"></div>
          <div style="text-align:center;margin-top:16px;">
            <button id="quest-close-btn" style="
              padding:12px 40px;font-size:18px;letter-spacing:3px;font-weight:bold;
              background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
              cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
            ">CLOSE</button>
          </div>
          <div style="text-align:center;margin-top:8px;color:#888;font-size:12px;">Press J or Escape to close</div>
        </div>
      </div>`;

    const statusEl = this._menuEl.querySelector("#quest-status") as HTMLDivElement;
    const showStatus = (msg: string, color: string) => {
      statusEl.textContent = msg;
      statusEl.style.color = color;
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    };

    const availSlots = this._menuEl.querySelectorAll(".quest-available") as NodeListOf<HTMLDivElement>;
    availSlots.forEach(el => {
      el.addEventListener("mouseenter", () => { el.style.borderColor = "#c8a84e"; });
      el.addEventListener("mouseleave", () => { el.style.borderColor = "#5a4a2a"; });
      el.addEventListener("click", () => {
        if (!canAccept) {
          showStatus("Max 5 active quests!", "#ff4444");
          return;
        }
        const qId = el.getAttribute("data-quest-id")!;
        const qDef = QUEST_DATABASE.find(q => q.id === qId);
        if (!qDef) return;
        const quest: DiabloQuest = {
          ...qDef,
          progress: 0,
          isComplete: false,
          isActive: true,
        };
        if (quest.type === QuestType.COLLECT_GOLD) quest.progress = this._state.player.gold;
        if (quest.type === QuestType.TREASURE_HUNT) quest.progress = this._chestsOpened;
        this._state.activeQuests.push(quest);
        showStatus(`Accepted: ${quest.name}`, "#44ff44");
        this._showQuestBoard();
      });
    });

    const abandonBtns = this._menuEl.querySelectorAll(".quest-abandon") as NodeListOf<HTMLButtonElement>;
    abandonBtns.forEach(btn => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const qId = btn.getAttribute("data-quest-id")!;
        this._state.activeQuests = this._state.activeQuests.filter(q => q.id !== qId);
        showStatus("Quest abandoned.", "#ff8800");
        this._showQuestBoard();
      });
    });

    const closeBtn = this._menuEl.querySelector("#quest-close-btn") as HTMLButtonElement;
    closeBtn.addEventListener("mouseenter", () => {
      closeBtn.style.borderColor = "#c8a84e";
      closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)";
      closeBtn.style.background = "rgba(50,40,20,0.95)";
    });
    closeBtn.addEventListener("mouseleave", () => {
      closeBtn.style.borderColor = "#5a4a2a";
      closeBtn.style.boxShadow = "none";
      closeBtn.style.background = "rgba(40,30,15,0.9)";
    });
    closeBtn.addEventListener("click", () => { this._closeOverlay(); });
  }

  // ──────────────────────────────────────────────────────────────
  //  CRAFTING SYSTEM
  // ──────────────────────────────────────────────────────────────
  private _showCraftingUI(vendor: DiabloVendor, mode: 'blacksmith' | 'jeweler'): void {
    const p = this._state.player;
    this._phaseBeforeOverlay = DiabloPhase.PLAYING;
    this._state.phase = DiabloPhase.INVENTORY;

    const renderCrafting = () => {
      const isBlacksmith = mode === 'blacksmith';
      const title = isBlacksmith ? `${vendor.icon} ${vendor.name} -- Forge & Salvage` : `${vendor.icon} ${vendor.name} -- Reroll Stats`;

      const recipes = isBlacksmith
        ? CRAFTING_RECIPES.filter(r => r.type === CraftType.UPGRADE_RARITY)
        : CRAFTING_RECIPES.filter(r => r.type === CraftType.REROLL_STATS);

      let recipesHtml = "";
      for (const r of recipes) {
        const canAfford = p.gold >= r.cost && p.salvageMaterials >= (r.materialCost || 0);
        const costColor = canAfford ? "#ffd700" : "#ff4444";
        const inputColor = r.inputRarity ? RARITY_CSS[r.inputRarity] : "#ccc";
        const outputColor = r.outputRarity ? RARITY_CSS[r.outputRarity] : inputColor;
        const successPct = Math.round(r.successChance * 100);
        recipesHtml += `
          <div class="craft-recipe" data-recipe-id="${r.id}" style="
            background:rgba(20,15,8,0.9);border:1px solid #5a4a2a;border-radius:6px;padding:12px;
            cursor:pointer;transition:border-color 0.2s;pointer-events:auto;
          ">
            <div style="color:${outputColor};font-weight:bold;font-size:14px;">${r.name}</div>
            <div style="color:#aaa;font-size:12px;margin:4px 0;">${r.description}</div>
            <div style="font-size:11px;color:${costColor};">Cost: ${r.cost}g + ${r.materialCost || 0} materials</div>
            <div style="font-size:11px;color:${successPct === 100 ? '#44ff44' : '#ff8800'};">Success: ${successPct}%</div>
          </div>`;
      }

      let invHtml = "";
      for (let i = 0; i < p.inventory.length; i++) {
        const slot = p.inventory[i];
        const item = slot.item;
        const borderColor = item ? RARITY_CSS[item.rarity] : "#3a3a3a";
        const content = item ? `<div style="font-size:20px;">${item.icon}</div>` : "";
        invHtml += `
          <div class="craft-inv-slot" data-inv-idx="${i}" style="
            width:55px;height:55px;background:rgba(15,10,5,0.85);border:1px solid ${borderColor};
            border-radius:4px;display:flex;align-items:center;justify-content:center;
            cursor:pointer;pointer-events:auto;position:relative;
          ">${content}</div>`;
      }

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:950px;width:92%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
            border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
          ">
            <div style="text-align:center;margin-bottom:16px;">
              <div style="font-size:28px;color:#c8a84e;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">${title}</div>
            </div>
            <div style="display:flex;gap:20px;align-items:flex-start;">
              <div style="flex:0 0 250px;">
                <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;">RECIPES</div>
                <div style="display:flex;flex-direction:column;gap:8px;max-height:350px;overflow-y:auto;">
                  ${recipesHtml}
                </div>
                ${isBlacksmith ? `
                <div style="margin-top:16px;">
                  <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;">SALVAGE</div>
                  <div style="color:#aaa;font-size:12px;margin-bottom:8px;">Right-click an item below to salvage it for materials.</div>
                </div>` : ""}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="color:#c8a84e;font-size:14px;font-weight:bold;margin-bottom:8px;">YOUR ITEMS</div>
                <div style="display:grid;grid-template-columns:repeat(8,55px);grid-template-rows:repeat(5,55px);gap:3px;">
                  ${invHtml}
                </div>
              </div>
            </div>
            <div style="margin-top:16px;display:flex;justify-content:center;align-items:center;gap:20px;">
              <div style="font-size:16px;color:#ffd700;">Gold: ${p.gold}</div>
              <div style="font-size:16px;color:#88ccff;">Materials: ${p.salvageMaterials}</div>
              <button id="craft-shop-btn" style="
                padding:10px 24px;font-size:14px;letter-spacing:2px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              ">SHOP</button>
              <button id="craft-close-btn" style="
                padding:10px 24px;font-size:14px;letter-spacing:2px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;transition:all 0.2s;font-family:'Georgia',serif;pointer-events:auto;
              ">CLOSE</button>
            </div>
            <div id="craft-status" style="margin-top:10px;text-align:center;color:#ff4444;font-size:14px;min-height:20px;"></div>
            <div id="inv-tooltip" style="
              display:none;position:fixed;z-index:100;background:rgba(10,5,2,0.96);border:2px solid #5a4a2a;
              border-radius:8px;padding:14px;max-width:280px;pointer-events:none;color:#ccc;font-size:13px;
            "></div>
          </div>
        </div>`;

      const statusEl = this._menuEl.querySelector("#craft-status") as HTMLDivElement;
      const showStatus = (msg: string, color: string) => {
        statusEl.textContent = msg;
        statusEl.style.color = color;
        setTimeout(() => { statusEl.textContent = ""; }, 2500);
      };

      // Recipe click
      const recipeSlots = this._menuEl.querySelectorAll(".craft-recipe") as NodeListOf<HTMLDivElement>;
      recipeSlots.forEach(el => {
        el.addEventListener("mouseenter", () => { el.style.borderColor = "#c8a84e"; });
        el.addEventListener("mouseleave", () => { el.style.borderColor = "#5a4a2a"; });
        el.addEventListener("click", () => {
          const rId = el.getAttribute("data-recipe-id")!;
          const recipe = CRAFTING_RECIPES.find(r => r.id === rId);
          if (!recipe) return;

          if (p.gold < recipe.cost) { showStatus("Not enough gold!", "#ff4444"); return; }
          if (p.salvageMaterials < (recipe.materialCost || 0)) { showStatus("Not enough materials!", "#ff4444"); return; }

          if (recipe.type === CraftType.UPGRADE_RARITY) {
            const inputItems: number[] = [];
            for (let i = 0; i < p.inventory.length; i++) {
              if (p.inventory[i].item && p.inventory[i].item!.rarity === recipe.inputRarity) {
                inputItems.push(i);
                if (inputItems.length >= (recipe.inputCount || 3)) break;
              }
            }
            if (inputItems.length < (recipe.inputCount || 3)) {
              showStatus(`Need ${recipe.inputCount || 3} ${RARITY_NAMES[recipe.inputRarity!]} items!`, "#ff4444");
              return;
            }

            p.gold -= recipe.cost;
            p.salvageMaterials -= recipe.materialCost || 0;

            if (Math.random() < recipe.successChance) {
              for (const idx of inputItems) p.inventory[idx].item = null;
              const outputItem = this._pickRandomItemOfRarity(recipe.outputRarity!);
              if (outputItem) {
                const emptyIdx = p.inventory.findIndex(s => s.item === null);
                if (emptyIdx >= 0) p.inventory[emptyIdx].item = { ...outputItem, id: this._genId() };
              }
              showStatus(`Forged a ${RARITY_NAMES[recipe.outputRarity!]} item!`, "#ffd700");
            } else {
              for (const idx of inputItems) p.inventory[idx].item = null;
              const returned = Math.floor((recipe.materialCost || 0) * 0.5);
              p.salvageMaterials += returned;
              showStatus(`Forge failed! Items destroyed. ${returned} materials returned.`, "#ff4444");
            }
            renderCrafting();
          } else if (recipe.type === CraftType.REROLL_STATS) {
            const itemIdx = p.inventory.findIndex(s => s.item && s.item.rarity === recipe.inputRarity);
            if (itemIdx < 0) {
              showStatus(`Need a ${RARITY_NAMES[recipe.inputRarity!]} item!`, "#ff4444");
              return;
            }
            p.gold -= recipe.cost;
            p.salvageMaterials -= recipe.materialCost || 0;

            const item = p.inventory[itemIdx].item!;
            const pool = ITEM_DATABASE.filter(it => it.rarity === item.rarity && it.slot === item.slot);
            if (pool.length > 0) {
              const donor = pool[Math.floor(Math.random() * pool.length)];
              item.stats = { ...donor.stats };
            }
            showStatus(`Rerolled stats on ${item.name}!`, "#44ff44");
            renderCrafting();
          }
        });
      });

      // Inventory slots with tooltips and salvage on right-click
      const invSlots = this._menuEl.querySelectorAll(".craft-inv-slot") as NodeListOf<HTMLDivElement>;
      invSlots.forEach(el => {
        const idx = parseInt(el.getAttribute("data-inv-idx")!, 10);
        el.addEventListener("mouseenter", (ev) => this._showItemTooltip(ev, p.inventory[idx].item));
        el.addEventListener("mouseleave", () => this._hideItemTooltip());
        if (isBlacksmith) {
          el.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const item = p.inventory[idx].item;
            if (!item) return;
            const materials = SALVAGE_MATERIAL_YIELDS[item.rarity] || 1;
            p.salvageMaterials += materials;
            p.inventory[idx].item = null;
            showStatus(`Salvaged ${item.name} for ${materials} materials.`, "#88ccff");
            renderCrafting();
          });
        }
      });

      // Shop button
      const shopBtn = this._menuEl.querySelector("#craft-shop-btn") as HTMLButtonElement;
      shopBtn.addEventListener("mouseenter", () => { shopBtn.style.borderColor = "#c8a84e"; shopBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)"; });
      shopBtn.addEventListener("mouseleave", () => { shopBtn.style.borderColor = "#5a4a2a"; shopBtn.style.boxShadow = "none"; });
      shopBtn.addEventListener("click", () => { this._showVendorShop(vendor); });

      // Close button
      const closeBtn = this._menuEl.querySelector("#craft-close-btn") as HTMLButtonElement;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.borderColor = "#c8a84e"; closeBtn.style.boxShadow = "0 0 15px rgba(200,168,78,0.3)"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.borderColor = "#5a4a2a"; closeBtn.style.boxShadow = "none"; });
      closeBtn.addEventListener("click", () => {
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = "";
      });
    };

    renderCrafting();
  }

  // ──────────────────────────────────────────────────────────────
  //  FOG OF WAR / EXPLORATION
  // ──────────────────────────────────────────────────────────────
  private _revealAroundPlayer(px: number, pz: number): void {
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = mapCfg.depth / 2;
    const revealRadius = 40;
    const gx = Math.floor(px + halfW);
    const gz = Math.floor(pz + halfD);
    const grid = this._state.exploredGrid;
    for (let dx = -revealRadius; dx <= revealRadius; dx++) {
      for (let dz = -revealRadius; dz <= revealRadius; dz++) {
        if (dx * dx + dz * dz > revealRadius * revealRadius) continue;
        const x = gx + dx;
        const z = gz + dz;
        if (x >= 0 && x < mapCfg.width && z >= 0 && z < mapCfg.depth) {
          if (grid[x]) grid[x][z] = true;
        }
      }
    }
  }

  private _isExplored(wx: number, wz: number): boolean {
    const mapCfg = MAP_CONFIGS[this._state.currentMap];
    const halfW = mapCfg.width / 2;
    const halfD = mapCfg.depth / 2;
    const gx = Math.floor(wx + halfW);
    const gz = Math.floor(wz + halfD);
    const grid = this._state.exploredGrid;
    if (gx < 0 || gx >= mapCfg.width || gz < 0 || gz >= mapCfg.depth) return false;
    return grid[gx] ? grid[gx][gz] : false;
  }

  // ══════════════════════════════════════════════════════════════
  //  PET SYSTEM
  // ══════════════════════════════════════════════════════════════

  /** Create a new pet from a species definition. */
  private _createPet(species: PetSpecies): DiabloPet {
    const def = PET_DEFS[species];
    return {
      id: this._genId(),
      species,
      petType: def.petType,
      customName: def.name,
      icon: def.icon,
      level: 1,
      xp: 0,
      xpToNext: PET_XP_TABLE[0] || 80,
      hp: def.baseHp,
      maxHp: def.baseHp,
      damage: def.baseDamage,
      armor: def.baseArmor,
      moveSpeed: def.moveSpeed,
      attackRange: def.attackRange,
      attackSpeed: def.attackSpeed,
      aggroRange: def.aggroRange,
      lootPickupRange: def.lootPickupRange || 0,
      x: this._state.player.x + 2,
      y: 0,
      z: this._state.player.z + 2,
      angle: 0,
      aiState: PetAIState.FOLLOWING,
      targetId: null,
      attackTimer: 0,
      abilityCooldowns: {},
      equipment: { collar: null, charm: null },
      isSummoned: false,
      loyalty: 50,
    };
  }

  /** Try to drop a pet egg when an enemy is killed. */
  private _rollPetDrop(isBoss: boolean): void {
    const mapId = this._state.currentMap;
    const p = this._state.player;
    for (const drop of PET_DROP_TABLE) {
      if (drop.mapId !== mapId) continue;
      if (drop.bossOnly && !isBoss) continue;
      if (Math.random() < drop.chance) {
        // Check if player already owns this species
        if (p.pets.some(pet => pet.species === drop.species)) continue;
        if (p.pets.length >= p.maxPets) {
          this._addFloatingText(p.x, p.y + 3, p.z, "Pet inventory full!", "#ff4444");
          return;
        }
        const newPet = this._createPet(drop.species);
        p.pets.push(newPet);
        const def = PET_DEFS[drop.species];
        this._addFloatingText(p.x, p.y + 4, p.z, `PET FOUND: ${def.name}!`, "#ffd700");
        return;
      }
    }
  }

  /** Summon / dismiss a pet. Only one can be active at a time. */
  private _summonPet(petId: string): void {
    const p = this._state.player;
    // Dismiss currently active pet
    for (const pet of p.pets) {
      if (pet.isSummoned) {
        pet.isSummoned = false;
        pet.aiState = PetAIState.IDLE;
      }
    }
    const pet = p.pets.find(pt => pt.id === petId);
    if (!pet) return;
    pet.isSummoned = true;
    pet.aiState = PetAIState.FOLLOWING;
    pet.hp = pet.maxHp;
    pet.x = p.x + 2;
    pet.z = p.z + 2;
    p.activePetId = pet.id;
    this._addFloatingText(p.x, p.y + 3, p.z, `${pet.customName} summoned!`, "#44ffff");
  }

  private _dismissPet(): void {
    const p = this._state.player;
    const pet = p.pets.find(pt => pt.id === p.activePetId);
    if (pet) {
      pet.isSummoned = false;
      pet.aiState = PetAIState.IDLE;
      this._addFloatingText(p.x, p.y + 3, p.z, `${pet.customName} dismissed.`, "#aaaaaa");
    }
    p.activePetId = null;
  }

  /** Award XP to the active pet. */
  private _grantPetXp(amount: number): void {
    const p = this._state.player;
    const pet = p.pets.find(pt => pt.id === p.activePetId && pt.isSummoned);
    if (!pet) return;
    pet.xp += amount;
    while (pet.xp >= pet.xpToNext && pet.level < 50) {
      pet.xp -= pet.xpToNext;
      pet.level++;
      const def = PET_DEFS[pet.species];
      pet.maxHp = def.baseHp + def.hpPerLevel * (pet.level - 1);
      pet.hp = pet.maxHp;
      pet.damage = def.baseDamage + def.damagePerLevel * (pet.level - 1);
      pet.armor = def.baseArmor + def.armorPerLevel * (pet.level - 1);
      pet.xpToNext = PET_XP_TABLE[Math.min(pet.level - 1, PET_XP_TABLE.length - 1)];
      if (pet.loyalty < 100) pet.loyalty = Math.min(100, pet.loyalty + 5);
      this._addFloatingText(p.x, p.y + 4, p.z, `${pet.customName} LEVEL ${pet.level}!`, "#44ff44");
    }
  }

  /** Main pet AI update each frame. */
  private _updatePets(dt: number): void {
    const p = this._state.player;
    const pet = p.pets.find(pt => pt.id === p.activePetId && pt.isSummoned);
    if (!pet) return;

    // Reduce ability cooldowns
    for (const key of Object.keys(pet.abilityCooldowns)) {
      if (pet.abilityCooldowns[key] > 0) pet.abilityCooldowns[key] -= dt;
    }
    pet.attackTimer = Math.max(0, pet.attackTimer - dt);

    // Pet regeneration (slow)
    if (pet.hp < pet.maxHp) {
      pet.hp = Math.min(pet.maxHp, pet.hp + pet.maxHp * 0.005 * dt);
    }

    const distToPlayer = this._dist(pet.x, pet.z, p.x, p.z);

    // Loot collection for loot pets
    if (pet.petType === PetType.LOOT && pet.lootPickupRange > 0) {
      const pickupRange = pet.lootPickupRange;
      for (let i = this._state.loot.length - 1; i >= 0; i--) {
        const loot = this._state.loot[i];
        const lootDist = this._dist(pet.x, pet.z, loot.x, loot.z);
        if (lootDist < pickupRange) {
          // Pick up loot for the player
          const emptySlot = p.inventory.findIndex(s => s.item === null);
          if (emptySlot >= 0) {
            p.inventory[emptySlot].item = { ...loot.item, id: this._genId() };
            this._addFloatingText(loot.x, loot.y + 1, loot.z, `${pet.customName} picked up ${loot.item.name}`, "#44ffff");
            this._state.loot.splice(i, 1);
            pet.aiState = PetAIState.COLLECTING_LOOT;
            // Brief state then back to following
            setTimeout(() => { if (pet.isSummoned) pet.aiState = PetAIState.FOLLOWING; }, 500);
          }
        }
      }
    }

    // Combat AI for combat pets
    if (pet.petType === PetType.COMBAT && pet.aggroRange > 0) {
      let nearestEnemy: DiabloEnemy | null = null;
      let nearestEnemyDist = pet.aggroRange;
      for (const enemy of this._state.enemies) {
        if (enemy.state === EnemyState.DEAD) continue;
        const d = this._dist(pet.x, pet.z, enemy.x, enemy.z);
        if (d < nearestEnemyDist) {
          nearestEnemyDist = d;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy && nearestEnemyDist < pet.aggroRange) {
        pet.aiState = PetAIState.ATTACKING;
        pet.targetId = nearestEnemy.id;
        // Move toward enemy
        const dx = nearestEnemy.x - pet.x;
        const dz = nearestEnemy.z - pet.z;
        const dist = Math.hypot(dx, dz);
        pet.angle = Math.atan2(dx, dz);

        if (dist > pet.attackRange) {
          pet.x += (dx / dist) * pet.moveSpeed * dt;
          pet.z += (dz / dist) * pet.moveSpeed * dt;
        } else if (pet.attackTimer <= 0) {
          // Attack!
          const loyaltyMult = 0.5 + (pet.loyalty / 100) * 0.5;
          const dmg = pet.damage * loyaltyMult;
          nearestEnemy.hp -= dmg;
          pet.attackTimer = 1 / pet.attackSpeed;
          this._addFloatingText(nearestEnemy.x, nearestEnemy.y + 2, nearestEnemy.z, String(Math.round(dmg)), "#44ffff");

          // Try to use abilities
          const def = PET_DEFS[pet.species];
          for (const ability of def.abilities) {
            if (ability.unlocksAtLevel > pet.level) continue;
            if ((pet.abilityCooldowns[ability.id] || 0) > 0) continue;
            if (ability.damageMultiplier && ability.damageMultiplier > 0) {
              const abilDmg = pet.damage * ability.damageMultiplier * loyaltyMult;
              nearestEnemy.hp -= abilDmg;
              pet.abilityCooldowns[ability.id] = ability.cooldown;
              this._addFloatingText(nearestEnemy.x, nearestEnemy.y + 3, nearestEnemy.z, `${ability.name}! ${Math.round(abilDmg)}`, "#ff8800");
              break; // one ability per frame
            }
            if (ability.buffType) {
              this._applyPetBuff(ability);
              pet.abilityCooldowns[ability.id] = ability.cooldown;
              break;
            }
          }
        }
      } else {
        pet.aiState = PetAIState.FOLLOWING;
        pet.targetId = null;
      }
    }

    // Utility pet abilities (auto-use)
    if (pet.petType === PetType.UTILITY) {
      const def = PET_DEFS[pet.species];
      for (const ability of def.abilities) {
        if (ability.unlocksAtLevel > pet.level) continue;
        if ((pet.abilityCooldowns[ability.id] || 0) > 0) continue;
        // Auto heal when owner is low
        if (ability.healAmount && ability.healAmount > 0 && p.hp < p.maxHp * 0.5) {
          const healVal = ability.healAmount * p.maxHp;
          p.hp = Math.min(p.maxHp, p.hp + healVal);
          pet.abilityCooldowns[ability.id] = ability.cooldown;
          this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +${Math.round(healVal)} HP`, "#44ff44");
          break;
        }
        // Auto buff
        if (ability.buffType && ability.buffDuration && ability.buffDuration > 0) {
          // Only auto-use certain buffs when conditions warrant
          const shouldBuff =
            (ability.buffType === 'cleanse' && p.statusEffects.length > 0) ||
            (ability.buffType === 'cooldownReduce') ||
            (ability.buffType === 'damageReduction' && p.hp < p.maxHp * 0.4) ||
            (ability.buffType === 'taunt' && this._state.enemies.filter(e => e.state !== EnemyState.DEAD && this._dist(e.x, e.z, p.x, p.z) < 8).length >= 3);
          if (shouldBuff) {
            this._applyPetBuff(ability);
            pet.abilityCooldowns[ability.id] = ability.cooldown;
            break;
          }
        }
      }
    }

    // Following behavior (return to player if too far)
    if (pet.aiState === PetAIState.FOLLOWING || distToPlayer > 25) {
      if (distToPlayer > 3) {
        const dx = p.x - pet.x;
        const dz = p.z - pet.z;
        const dist = Math.hypot(dx, dz);
        const speed = distToPlayer > 15 ? pet.moveSpeed * 2 : pet.moveSpeed;
        pet.x += (dx / dist) * speed * dt;
        pet.z += (dz / dist) * speed * dt;
        pet.angle = Math.atan2(dx, dz);
      }
      // Teleport if really far
      if (distToPlayer > 40) {
        pet.x = p.x + 2;
        pet.z = p.z + 2;
      }
    }
  }

  /** Apply a pet buff to the player. */
  private _applyPetBuff(ability: { id: string; name: string; buffType?: string; buffDuration?: number; healAmount?: number }): void {
    if (!ability.buffType) return;
    const p = this._state.player;

    switch (ability.buffType) {
      case 'damage':
        this._petBuffs.push({ type: 'damage', value: 0.15, remaining: ability.buffDuration || 10 });
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +15% DMG`, "#ff8800");
        break;
      case 'attackSpeed':
        this._petBuffs.push({ type: 'attackSpeed', value: 1.0, remaining: ability.buffDuration || 8 });
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! 2x ATK SPD`, "#ffdd00");
        break;
      case 'fireResist':
        this._petBuffs.push({ type: 'fireResist', value: 50, remaining: ability.buffDuration || 15 });
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +50 Fire Res`, "#ff4400");
        break;
      case 'invuln':
        p.invulnTimer = Math.max(p.invulnTimer, ability.buffDuration || 3);
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! Invulnerable`, "#ffffff");
        break;
      case 'damageReduction':
        this._petBuffs.push({ type: 'damageReduction', value: 0.5, remaining: ability.buffDuration || 6 });
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! -50% DMG taken`, "#4488ff");
        break;
      case 'cleanse':
        p.statusEffects = [];
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! Cleansed`, "#ffffff");
        break;
      case 'cooldownReduce':
        for (const [skillId, cd] of p.skillCooldowns) {
          p.skillCooldowns.set(skillId, Math.max(0, cd - 3));
        }
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! -3s CDs`, "#44ffff");
        break;
      case 'xpBonus':
        this._petBuffs.push({ type: 'xpBonus', value: 0.2, remaining: ability.buffDuration || 30 });
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +20% XP`, "#ffd700");
        break;
      case 'lootRange':
        this._petBuffs.push({ type: 'lootRange', value: 0.5, remaining: ability.buffDuration || 20 });
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +50% Pickup`, "#44ff44");
        break;
      case 'goldBonus':
        this._petBuffs.push({ type: 'goldBonus', value: 0.25, remaining: ability.buffDuration || 30 });
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +25% Gold`, "#ffd700");
        break;
      case 'lootMagnet':
        // Pull all loot to player
        for (const loot of this._state.loot) {
          loot.x = p.x + (Math.random() - 0.5) * 2;
          loot.z = p.z + (Math.random() - 0.5) * 2;
        }
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! All loot pulled!`, "#ffd700");
        break;
      case 'spellAmp':
        this._petBuffs.push({ type: 'spellAmp', value: 0.5, remaining: ability.buffDuration || 10 });
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}! +50% Spell DMG`, "#aa44ff");
        break;
      default:
        this._addFloatingText(p.x, p.y + 3, p.z, `${ability.name}!`, "#44ffff");
        break;
    }
  }

  /** Update pet buff timers. */
  private _updatePetBuffs(dt: number): void {
    for (let i = this._petBuffs.length - 1; i >= 0; i--) {
      this._petBuffs[i].remaining -= dt;
      if (this._petBuffs[i].remaining <= 0) {
        this._petBuffs.splice(i, 1);
      }
    }
  }

  /** Check if a pet buff is active. */
  private _hasPetBuff(type: string): number {
    let total = 0;
    for (const buff of this._petBuffs) {
      if (buff.type === type) total += buff.value;
    }
    return total;
  }

  // ──────────────────────────────────────────────────────────────
  //  PET MANAGEMENT UI
  // ──────────────────────────────────────────────────────────────
  private _showPetManagement(): void {
    const p = this._state.player;
    this._phaseBeforeOverlay = DiabloPhase.PLAYING;
    this._state.phase = DiabloPhase.INVENTORY;

    const renderPetUI = () => {
      const activePet = p.pets.find(pt => pt.id === p.activePetId && pt.isSummoned);

      let petListHtml = "";
      if (p.pets.length === 0) {
        petListHtml = `<div style="color:#887755;font-style:italic;padding:20px;text-align:center;">
          No pets found yet. Defeat enemies to discover pet companions!</div>`;
      }
      for (const pet of p.pets) {
        const def = PET_DEFS[pet.species];
        const isActive = pet.id === p.activePetId && pet.isSummoned;
        const borderColor = isActive ? "#ffd700" : "#5a4a2a";
        const typeBadge = pet.petType === PetType.COMBAT ? "COMBAT" :
          pet.petType === PetType.LOOT ? "LOOT" : "UTILITY";
        const typeColor = pet.petType === PetType.COMBAT ? "#ff4444" :
          pet.petType === PetType.LOOT ? "#ffd700" : "#44ff44";

        let abilitiesHtml = "";
        for (const ability of def.abilities) {
          const unlocked = pet.level >= ability.unlocksAtLevel;
          const color = unlocked ? "#cccccc" : "#555555";
          abilitiesHtml += `<div style="color:${color};font-size:11px;margin:2px 0;">
            ${ability.icon} ${ability.name} ${unlocked ? "" : `(Lv.${ability.unlocksAtLevel})`}
            <span style="color:#888;font-size:10px;">${ability.description}</span>
          </div>`;
        }

        petListHtml += `
          <div class="pet-card" data-pet-id="${pet.id}" style="
            background:rgba(20,15,8,0.9);border:2px solid ${borderColor};border-radius:8px;
            padding:14px;cursor:pointer;transition:border-color 0.2s;pointer-events:auto;
          ">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <span style="font-size:32px;">${pet.icon}</span>
              <div>
                <div style="color:#c8a84e;font-weight:bold;font-size:16px;">${pet.customName}</div>
                <div style="font-size:11px;color:${typeColor};font-weight:bold;">${typeBadge}</div>
                <div style="font-size:12px;color:#aaa;">Level ${pet.level} | Loyalty: ${Math.round(pet.loyalty)}%</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;color:#aaa;margin-bottom:8px;">
              <div>HP: <span style="color:#ff4444;">${Math.round(pet.hp)}/${pet.maxHp}</span></div>
              <div>DMG: <span style="color:#ff8800;">${Math.round(pet.damage)}</span></div>
              <div>Armor: <span style="color:#4488ff;">${Math.round(pet.armor)}</span></div>
              <div>Speed: <span style="color:#44ff44;">${pet.moveSpeed.toFixed(1)}</span></div>
              <div>XP: <span style="color:#ffd700;">${pet.xp}/${pet.xpToNext}</span></div>
              ${pet.lootPickupRange > 0 ? `<div>Pickup: <span style="color:#ffdd00;">${pet.lootPickupRange}</span></div>` : ""}
            </div>
            <div style="margin-bottom:8px;">
              <div style="font-size:11px;color:#c8a84e;font-weight:bold;margin-bottom:4px;">ABILITIES</div>
              ${abilitiesHtml}
            </div>
            <div style="display:flex;gap:8px;">
              <button class="pet-summon-btn" data-pet-id="${pet.id}" style="
                flex:1;padding:8px;font-size:12px;font-weight:bold;
                background:${isActive ? "rgba(80,40,20,0.9)" : "rgba(40,30,15,0.9)"};
                border:1px solid ${isActive ? "#ff4444" : "#5a4a2a"};border-radius:6px;
                color:${isActive ? "#ff4444" : "#c8a84e"};cursor:pointer;pointer-events:auto;
              ">${isActive ? "DISMISS" : "SUMMON"}</button>
            </div>
          </div>`;
      }

      // Active pet status
      let activeStatusHtml = "";
      if (activePet) {
        const hpPct = Math.round((activePet.hp / activePet.maxHp) * 100);
        activeStatusHtml = `
          <div style="background:rgba(20,15,8,0.9);border:2px solid #ffd700;border-radius:8px;padding:14px;margin-bottom:16px;">
            <div style="color:#ffd700;font-weight:bold;font-size:14px;margin-bottom:8px;">ACTIVE COMPANION</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:36px;">${activePet.icon}</span>
              <div style="flex:1;">
                <div style="color:#c8a84e;font-weight:bold;">${activePet.customName} <span style="color:#aaa;font-weight:normal;">Lv.${activePet.level}</span></div>
                <div style="background:#333;border-radius:3px;height:8px;margin-top:4px;overflow:hidden;">
                  <div style="background:#ff4444;height:100%;width:${hpPct}%;transition:width 0.3s;"></div>
                </div>
                <div style="font-size:10px;color:#aaa;margin-top:2px;">HP: ${Math.round(activePet.hp)}/${activePet.maxHp} | AI: ${activePet.aiState}</div>
              </div>
            </div>
          </div>`;
      }

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:700px;width:92%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
            border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
          ">
            <div style="text-align:center;margin-bottom:16px;">
              <div style="font-size:28px;color:#c8a84e;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">
                PET COMPANIONS
              </div>
              <div style="font-size:12px;color:#887755;margin-top:4px;">
                ${p.pets.length} / ${p.maxPets} pets | Defeat enemies to find new companions
              </div>
            </div>
            ${activeStatusHtml}
            <div style="display:flex;flex-direction:column;gap:12px;">
              ${petListHtml}
            </div>
            <div style="text-align:center;margin-top:16px;">
              <button id="pet-close-btn" style="
                padding:10px 30px;font-size:14px;letter-spacing:2px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;pointer-events:auto;font-family:'Georgia',serif;
              ">CLOSE</button>
            </div>
          </div>
        </div>`;

      // Summon/dismiss buttons
      const summonBtns = this._menuEl.querySelectorAll(".pet-summon-btn") as NodeListOf<HTMLButtonElement>;
      summonBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const petId = btn.getAttribute("data-pet-id")!;
          const pet = p.pets.find(pt => pt.id === petId);
          if (!pet) return;
          if (pet.isSummoned) {
            this._dismissPet();
          } else {
            this._summonPet(petId);
          }
          renderPetUI();
        });
      });

      // Close
      const closeBtn = this._menuEl.querySelector("#pet-close-btn") as HTMLButtonElement;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.borderColor = "#c8a84e"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.borderColor = "#5a4a2a"; });
      closeBtn.addEventListener("click", () => {
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = "";
      });
    };

    renderPetUI();
  }

  // ══════════════════════════════════════════════════════════════
  //  ADVANCED CRAFTING SYSTEM
  // ══════════════════════════════════════════════════════════════

  /** Roll material drops from enemy kills. */
  private _rollMaterialDrop(): void {
    const mapId = this._state.currentMap;
    const p = this._state.player;
    const entry = MATERIAL_DROP_TABLE.find(e => e.mapId === mapId);
    if (!entry) return;

    for (const drop of entry.drops) {
      if (Math.random() < drop.chance) {
        const count = drop.countMin + Math.floor(Math.random() * (drop.countMax - drop.countMin + 1));
        p.crafting.materials[drop.type] = (p.crafting.materials[drop.type] || 0) + count;
        const mat = CRAFTING_MATERIALS[drop.type];
        this._addFloatingText(p.x, p.y + 3, p.z, `+${count} ${mat.icon} ${mat.name}`, "#88ccff");
      }
    }
  }

  /** Award crafting XP and handle crafting level ups. */
  private _grantCraftingXp(amount: number): void {
    const cs = this._state.player.crafting;
    cs.craftingXp += amount;
    while (cs.craftingXp >= cs.craftingXpToNext) {
      cs.craftingXp -= cs.craftingXpToNext;
      cs.craftingLevel++;
      cs.craftingXpToNext = Math.floor(100 * Math.pow(1.15, cs.craftingLevel - 1));
      // Discover recipes at certain levels
      this._checkRecipeDiscovery();
      this._addFloatingText(
        this._state.player.x, this._state.player.y + 4, this._state.player.z,
        `Crafting Level ${cs.craftingLevel}!`, "#88ccff"
      );
    }
  }

  /** Check if new recipes should be discovered based on crafting level. */
  private _checkRecipeDiscovery(): void {
    const cs = this._state.player.crafting;
    for (const recipe of ADVANCED_CRAFTING_RECIPES) {
      if (cs.discoveredRecipes.includes(recipe.id)) continue;
      if (cs.craftingLevel >= recipe.levelRequired) {
        cs.discoveredRecipes.push(recipe.id);
        this._addFloatingText(
          this._state.player.x, this._state.player.y + 5, this._state.player.z,
          `Recipe Discovered: ${recipe.name}!`, "#ffd700"
        );
      }
    }
  }

  /** Process crafting queue progress. */
  private _updateCraftingQueue(dt: number): void {
    const cs = this._state.player.crafting;
    if (cs.craftingQueue.length === 0) return;

    const current = cs.craftingQueue[0];
    current.progress += dt;
    if (current.progress >= current.duration) {
      // Craft completed
      cs.craftingQueue.shift();
      const recipe = ADVANCED_CRAFTING_RECIPES.find(r => r.id === current.recipeId);
      if (!recipe) return;

      if (Math.random() < recipe.successChance) {
        this._completeCraft(recipe);
        this._addFloatingText(
          this._state.player.x, this._state.player.y + 3, this._state.player.z,
          `Crafted ${recipe.name}!`, "#ffd700"
        );
      } else {
        // Failed — return some materials
        for (const mat of recipe.materials) {
          const returned = Math.floor(mat.count * 0.3);
          cs.materials[mat.type] = (cs.materials[mat.type] || 0) + returned;
        }
        this._addFloatingText(
          this._state.player.x, this._state.player.y + 3, this._state.player.z,
          `Crafting failed! Some materials returned.`, "#ff4444"
        );
      }
      this._grantCraftingXp(recipe.levelRequired * 10 + 20);
    }
  }

  /** Complete a craft and give the player the output item. */
  private _completeCraft(recipe: AdvancedCraftingRecipe): void {
    const p = this._state.player;

    // Potion recipes
    if (recipe.id === 'adv_craft_health_potion') {
      const potion: DiabloPotion = {
        id: this._genId(), name: 'Crafted Health Elixir', type: PotionType.HEALTH,
        icon: '\u2764\uFE0F', value: 80, cooldown: 5, cost: 0,
      };
      p.potions.push(potion);
      return;
    }
    if (recipe.id === 'adv_craft_mana_potion') {
      const potion: DiabloPotion = {
        id: this._genId(), name: 'Crafted Mana Elixir', type: PotionType.MANA,
        icon: '\uD83D\uDCA7', value: 60, cooldown: 5, cost: 0,
      };
      p.potions.push(potion);
      return;
    }

    // Item recipe — generate an item of the output rarity and slot
    if (recipe.outputSlot && recipe.outputRarity) {
      const pool = ITEM_DATABASE.filter(it => it.rarity === recipe.outputRarity && it.slot === recipe.outputSlot);
      let outputItem: DiabloItem | null = null;
      if (pool.length > 0) {
        outputItem = { ...pool[Math.floor(Math.random() * pool.length)], id: this._genId() };
      } else {
        // Fallback: pick any item of the right rarity
        outputItem = this._pickRandomItemOfRarity(recipe.outputRarity);
        if (outputItem) outputItem = { ...outputItem, id: this._genId() };
      }
      if (outputItem) {
        const emptyIdx = p.inventory.findIndex(s => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = outputItem;
        } else {
          this._addFloatingText(p.x, p.y + 3, p.z, "Inventory full!", "#ff4444");
        }
      }
    } else if (recipe.outputRarity) {
      const outputItem = this._pickRandomItemOfRarity(recipe.outputRarity);
      if (outputItem) {
        const emptyIdx = p.inventory.findIndex(s => s.item === null);
        if (emptyIdx >= 0) {
          p.inventory[emptyIdx].item = { ...outputItem, id: this._genId() };
        }
      }
    }
  }

  /** Check if the player can afford a recipe. */
  private _canAffordRecipe(recipe: AdvancedCraftingRecipe): boolean {
    const p = this._state.player;
    const cs = p.crafting;
    if (p.gold < recipe.goldCost) return false;
    if (p.salvageMaterials < recipe.salvageCost) return false;
    for (const mat of recipe.materials) {
      if ((cs.materials[mat.type] || 0) < mat.count) return false;
    }
    return true;
  }

  /** Consume recipe costs. */
  private _payRecipeCost(recipe: AdvancedCraftingRecipe): void {
    const p = this._state.player;
    const cs = p.crafting;
    p.gold -= recipe.goldCost;
    p.salvageMaterials -= recipe.salvageCost;
    for (const mat of recipe.materials) {
      cs.materials[mat.type] -= mat.count;
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  ADVANCED CRAFTING UI
  // ──────────────────────────────────────────────────────────────
  private _showAdvancedCraftingUI(): void {
    const p = this._state.player;
    const cs = p.crafting;
    this._phaseBeforeOverlay = DiabloPhase.PLAYING;
    this._state.phase = DiabloPhase.INVENTORY;
    this._craftingUIOpen = true;

    let selectedStation: CraftingStationType = CraftingStationType.BLACKSMITH_FORGE;

    const renderCraftUI = () => {
      const stations = [
        { type: CraftingStationType.BLACKSMITH_FORGE, name: 'Blacksmith', icon: '\u2694\uFE0F' },
        { type: CraftingStationType.JEWELER_BENCH, name: 'Jeweler', icon: '\uD83D\uDC8E' },
        { type: CraftingStationType.ALCHEMIST_TABLE, name: 'Alchemist', icon: '\u2697\uFE0F' },
        { type: CraftingStationType.ENCHANTER_ALTAR, name: 'Enchanter', icon: '\uD83D\uDD2E' },
      ];

      let stationTabsHtml = "";
      for (const st of stations) {
        const isActive = st.type === selectedStation;
        stationTabsHtml += `
          <button class="craft-station-tab" data-station="${st.type}" style="
            flex:1;padding:10px;font-size:13px;font-weight:bold;
            background:${isActive ? "rgba(60,45,20,0.95)" : "rgba(30,22,10,0.9)"};
            border:1px solid ${isActive ? "#c8a84e" : "#5a4a2a"};border-radius:6px 6px 0 0;
            color:${isActive ? "#ffd700" : "#887755"};cursor:pointer;pointer-events:auto;
            border-bottom:${isActive ? "2px solid #c8a84e" : "none"};
          ">${st.icon} ${st.name}</button>`;
      }

      // Filter recipes by station and discovered
      const recipes = ADVANCED_CRAFTING_RECIPES.filter(
        r => r.station === selectedStation && cs.discoveredRecipes.includes(r.id)
      );

      let recipesHtml = "";
      if (recipes.length === 0) {
        recipesHtml = `<div style="color:#887755;font-style:italic;padding:20px;text-align:center;">
          No recipes discovered for this station yet. Level up crafting to discover more!</div>`;
      }
      for (const recipe of recipes) {
        const canAfford = this._canAffordRecipe(recipe);
        const meetsLevel = cs.craftingLevel >= recipe.levelRequired;
        const borderColor = canAfford && meetsLevel ? "#5a4a2a" : "#3a2a1a";
        const outputColor = recipe.outputRarity ? RARITY_CSS[recipe.outputRarity] : "#cccccc";
        const successPct = Math.round(recipe.successChance * 100);

        let matsHtml = "";
        for (const mat of recipe.materials) {
          const matDef = CRAFTING_MATERIALS[mat.type];
          const have = cs.materials[mat.type] || 0;
          const enough = have >= mat.count;
          matsHtml += `<span style="color:${enough ? "#44ff44" : "#ff4444"};font-size:11px;">
            ${matDef.icon} ${mat.count} ${matDef.name} (${have})</span> `;
        }

        // Check if it's being crafted
        const inQueue = cs.craftingQueue.find(q => q.recipeId === recipe.id);
        let progressHtml = "";
        if (inQueue) {
          const pct = Math.round((inQueue.progress / inQueue.duration) * 100);
          progressHtml = `<div style="margin-top:6px;background:#333;border-radius:3px;height:6px;overflow:hidden;">
            <div style="background:#ffd700;height:100%;width:${pct}%;transition:width 0.3s;"></div>
          </div><div style="font-size:10px;color:#ffd700;margin-top:2px;">Crafting... ${pct}%</div>`;
        }

        recipesHtml += `
          <div class="adv-craft-recipe" data-recipe-id="${recipe.id}" style="
            background:rgba(20,15,8,0.9);border:1px solid ${borderColor};border-radius:6px;padding:12px;
            cursor:${canAfford && meetsLevel ? "pointer" : "not-allowed"};
            opacity:${canAfford && meetsLevel ? "1" : "0.6"};
            transition:border-color 0.2s;pointer-events:auto;
          ">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:22px;">${recipe.icon}</span>
              <div>
                <div style="color:${outputColor};font-weight:bold;font-size:14px;">${recipe.name}</div>
                <div style="color:#aaa;font-size:11px;">${recipe.description}</div>
              </div>
            </div>
            <div style="margin-top:6px;">${matsHtml}</div>
            <div style="display:flex;gap:12px;margin-top:4px;font-size:11px;">
              <span style="color:${p.gold >= recipe.goldCost ? "#ffd700" : "#ff4444"};">Gold: ${recipe.goldCost}</span>
              ${recipe.salvageCost > 0 ? `<span style="color:${p.salvageMaterials >= recipe.salvageCost ? "#88ccff" : "#ff4444"};">Materials: ${recipe.salvageCost}</span>` : ""}
              <span style="color:${successPct >= 80 ? "#44ff44" : successPct >= 50 ? "#ffdd00" : "#ff4444"};">Success: ${successPct}%</span>
              ${!meetsLevel ? `<span style="color:#ff4444;">Requires Lv.${recipe.levelRequired}</span>` : ""}
            </div>
            ${progressHtml}
          </div>`;
      }

      // Materials inventory
      let matsInvHtml = "";
      for (const [matType, count] of Object.entries(cs.materials) as [MaterialType, number][]) {
        if (count <= 0) continue;
        const matDef = CRAFTING_MATERIALS[matType];
        if (!matDef) continue;
        matsInvHtml += `
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#ccc;">
            <span style="font-size:16px;">${matDef.icon}</span>
            <span>${matDef.name}:</span>
            <span style="color:#ffd700;font-weight:bold;">${count}</span>
          </div>`;
      }
      if (!matsInvHtml) {
        matsInvHtml = `<div style="color:#665533;font-style:italic;font-size:12px;">No materials yet.</div>`;
      }

      this._menuEl.innerHTML = `
        <div style="
          width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
          align-items:center;justify-content:center;color:#fff;pointer-events:auto;
        ">
          <div style="
            max-width:950px;width:92%;background:rgba(15,10,5,0.95);border:2px solid #5a4a2a;
            border-radius:12px;padding:24px 30px;max-height:88vh;overflow-y:auto;
          ">
            <div style="text-align:center;margin-bottom:12px;">
              <div style="font-size:28px;color:#c8a84e;font-weight:bold;letter-spacing:2px;font-family:'Georgia',serif;">
                CRAFTING WORKSHOP
              </div>
              <div style="font-size:12px;color:#887755;margin-top:4px;">
                Crafting Level: ${cs.craftingLevel} | XP: ${cs.craftingXp}/${cs.craftingXpToNext}
              </div>
            </div>
            <div style="display:flex;gap:2px;margin-bottom:2px;">
              ${stationTabsHtml}
            </div>
            <div style="display:flex;gap:20px;align-items:flex-start;">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;padding:8px 0;">
                  ${recipesHtml}
                </div>
              </div>
              <div style="flex:0 0 200px;">
                <div style="color:#c8a84e;font-size:13px;font-weight:bold;margin-bottom:8px;">MATERIALS</div>
                <div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">
                  ${matsInvHtml}
                </div>
                <div style="margin-top:12px;font-size:12px;">
                  <div style="color:#ffd700;">Gold: ${p.gold}</div>
                  <div style="color:#88ccff;">Salvage: ${p.salvageMaterials}</div>
                </div>
              </div>
            </div>
            <div style="margin-top:16px;display:flex;justify-content:center;gap:20px;">
              <button id="adv-craft-close-btn" style="
                padding:10px 30px;font-size:14px;letter-spacing:2px;font-weight:bold;
                background:rgba(40,30,15,0.9);border:2px solid #5a4a2a;border-radius:8px;color:#c8a84e;
                cursor:pointer;pointer-events:auto;font-family:'Georgia',serif;
              ">CLOSE</button>
            </div>
            <div id="adv-craft-status" style="margin-top:8px;text-align:center;color:#ff4444;font-size:14px;min-height:20px;"></div>
          </div>
        </div>`;

      // Status helper
      const statusEl = this._menuEl.querySelector("#adv-craft-status") as HTMLDivElement;
      const showStatus = (msg: string, color: string) => {
        statusEl.textContent = msg;
        statusEl.style.color = color;
        setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 2500);
      };

      // Station tab clicks
      const tabBtns = this._menuEl.querySelectorAll(".craft-station-tab") as NodeListOf<HTMLButtonElement>;
      tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          selectedStation = btn.getAttribute("data-station") as CraftingStationType;
          renderCraftUI();
        });
      });

      // Recipe clicks
      const recipeEls = this._menuEl.querySelectorAll(".adv-craft-recipe") as NodeListOf<HTMLDivElement>;
      recipeEls.forEach(el => {
        el.addEventListener("mouseenter", () => { el.style.borderColor = "#c8a84e"; });
        el.addEventListener("mouseleave", () => { el.style.borderColor = "#5a4a2a"; });
        el.addEventListener("click", () => {
          const recipeId = el.getAttribute("data-recipe-id")!;
          const recipe = ADVANCED_CRAFTING_RECIPES.find(r => r.id === recipeId);
          if (!recipe) return;

          if (cs.craftingLevel < recipe.levelRequired) {
            showStatus(`Requires crafting level ${recipe.levelRequired}!`, "#ff4444");
            return;
          }
          if (!this._canAffordRecipe(recipe)) {
            showStatus("Not enough resources!", "#ff4444");
            return;
          }
          if (cs.craftingQueue.some(q => q.recipeId === recipeId)) {
            showStatus("Already crafting this recipe!", "#ff8800");
            return;
          }

          this._payRecipeCost(recipe);
          // Crafting duration based on recipe complexity
          const duration = 1.0 + recipe.levelRequired * 0.2;
          cs.craftingQueue.push({ recipeId: recipe.id, progress: 0, duration });
          showStatus(`Started crafting ${recipe.name}...`, "#ffd700");
          renderCraftUI();
        });
      });

      // Close
      const closeBtn = this._menuEl.querySelector("#adv-craft-close-btn") as HTMLButtonElement;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.borderColor = "#c8a84e"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.borderColor = "#5a4a2a"; });
      closeBtn.addEventListener("click", () => {
        this._craftingUIOpen = false;
        this._state.phase = DiabloPhase.PLAYING;
        this._menuEl.innerHTML = "";
      });
    };

    renderCraftUI();
  }

  // ──────────────────────────────────────────────────────────────
  //  HIT PARTICLES
  // ──────────────────────────────────────────────────────────────
  private _spawnHitParticles(enemy: DiabloEnemy, damageType: DamageType): void {
    const isArmored = enemy.type === EnemyType.BONE_GOLEM || enemy.type === EnemyType.SAND_GOLEM ||
      enemy.type === EnemyType.INFERNAL_KNIGHT || enemy.type === EnemyType.DRAKE_GUARDIAN;

    switch (damageType) {
      case DamageType.FIRE:
        this._renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 1, enemy.z, 5 + Math.floor(Math.random() * 4), this._state.particles);
        break;
      case DamageType.ICE:
        this._renderer.spawnParticles(ParticleType.ICE, enemy.x, enemy.y + 1, enemy.z, 5 + Math.floor(Math.random() * 4), this._state.particles);
        break;
      case DamageType.POISON:
        this._renderer.spawnParticles(ParticleType.POISON, enemy.x, enemy.y + 1, enemy.z, 3 + Math.floor(Math.random() * 3), this._state.particles);
        break;
      case DamageType.LIGHTNING:
        this._renderer.spawnParticles(ParticleType.LIGHTNING, enemy.x, enemy.y + 1, enemy.z, 4 + Math.floor(Math.random() * 3), this._state.particles);
        break;
      default:
        if (isArmored) {
          this._renderer.spawnParticles(ParticleType.SPARK, enemy.x, enemy.y + 1, enemy.z, 3 + Math.floor(Math.random() * 4), this._state.particles);
        } else {
          this._renderer.spawnParticles(ParticleType.BLOOD, enemy.x, enemy.y + 1, enemy.z, 3 + Math.floor(Math.random() * 4), this._state.particles);
        }
        break;
    }
  }
}
