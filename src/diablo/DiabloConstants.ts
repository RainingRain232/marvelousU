// ────────────────────────────────────────────────────────────────────────────
// Diablo — Shared constants (rarity styles, map data, lore, boss names, etc.)
// ────────────────────────────────────────────────────────────────────────────

import {
  DiabloMapId, DiabloClass, ItemRarity, EnemyType, VendorType, Weather,
  DiabloEquipment,
} from "./DiabloTypes";

// ────────────────────────────────────────────────────────────────────────────
// Rarity color strings for UI (hex CSS colors)
// ────────────────────────────────────────────────────────────────────────────
export const RARITY_CSS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: "#cccccc",
  [ItemRarity.UNCOMMON]: "#44ff44",
  [ItemRarity.RARE]: "#4488ff",
  [ItemRarity.EPIC]: "#aa44ff",
  [ItemRarity.LEGENDARY]: "#ff8800",
  [ItemRarity.MYTHIC]: "#ff2222",
  [ItemRarity.DIVINE]: "#ffd700",
};

// Rarity glow box-shadow effects (stronger for higher rarities)
export const RARITY_GLOW: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: "none",
  [ItemRarity.UNCOMMON]: "0 0 4px #44ff44",
  [ItemRarity.RARE]: "0 0 6px #4488ff",
  [ItemRarity.EPIC]: "0 0 8px #aa44ff, 0 0 3px #aa44ff inset",
  [ItemRarity.LEGENDARY]: "0 0 10px #ff8800, 0 0 5px #ff8800 inset",
  [ItemRarity.MYTHIC]: "0 0 12px #ff2222, 0 0 6px #ff2222 inset",
  [ItemRarity.DIVINE]: "0 0 14px #ffd700, 0 0 7px #ffd700 inset",
};

// Border width by rarity
export const RARITY_BORDER: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.UNCOMMON]: 1,
  [ItemRarity.RARE]: 2,
  [ItemRarity.EPIC]: 2,
  [ItemRarity.LEGENDARY]: 3,
  [ItemRarity.MYTHIC]: 3,
  [ItemRarity.DIVINE]: 3,
};

// Rarity tier number (for stars display)
export const RARITY_TIER: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.UNCOMMON]: 2,
  [ItemRarity.RARE]: 3,
  [ItemRarity.EPIC]: 4,
  [ItemRarity.LEGENDARY]: 5,
  [ItemRarity.MYTHIC]: 6,
  [ItemRarity.DIVINE]: 7,
};

// Background tint RGBA (low opacity rarity color)
export const RARITY_BG: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: "rgba(204,204,204,0.06)",
  [ItemRarity.UNCOMMON]: "rgba(68,255,68,0.10)",
  [ItemRarity.RARE]: "rgba(68,136,255,0.10)",
  [ItemRarity.EPIC]: "rgba(170,68,255,0.12)",
  [ItemRarity.LEGENDARY]: "rgba(255,136,0,0.13)",
  [ItemRarity.MYTHIC]: "rgba(255,34,34,0.14)",
  [ItemRarity.DIVINE]: "rgba(255,215,0,0.15)",
};

// Rarity badge symbol (corner indicator)
export const RARITY_BADGE: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: "",
  [ItemRarity.UNCOMMON]: "\u25C6",
  [ItemRarity.RARE]: "\u25C6",
  [ItemRarity.EPIC]: "\u25C6",
  [ItemRarity.LEGENDARY]: "\u2726",
  [ItemRarity.MYTHIC]: "\u2726",
  [ItemRarity.DIVINE]: "\u2726",
};

// Whether this rarity gets the pulse animation class
export function rarityNeedsAnim(r: ItemRarity): boolean {
  return r === ItemRarity.LEGENDARY || r === ItemRarity.MYTHIC || r === ItemRarity.DIVINE;
}

// Map any item slot string to a canonical equip key (handles config items that may
// use non-enum string values like "MAIN_HAND", "HEAD", "CHEST", etc.)
export function resolveEquipKey(slot: string): keyof DiabloEquipment | null {
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
export const MAP_KILL_TARGET: Record<DiabloMapId, number> = {
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
  [DiabloMapId.RIVERSIDE_VILLAGE]: 0,
  [DiabloMapId.CAMELOT]: 0,
};

// ────────────────────────────────────────────────────────────────────────────
// Boss names per map
// ────────────────────────────────────────────────────────────────────────────
export const BOSS_NAMES: Record<DiabloMapId, string[]> = {
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
  [DiabloMapId.RIVERSIDE_VILLAGE]: [],
  [DiabloMapId.CAMELOT]: [],
};

// ────────────────────────────────────────────────────────────────────────────
// Main quest: The Fall of Excalibur — hints per map
// ────────────────────────────────────────────────────────────────────────────
export const EXCALIBUR_QUEST_INFO: Partial<Record<DiabloMapId, { fragment: string; hint: string; lore: string }>> = {
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

export const CAMELOT_FIRST_VISIT_TEXT = [
  "Mordred has betrayed Camelot and shattered Excalibur.",
  "Eight fragments lie scattered across the corrupted lands.",
  "Speak to the merchants for guidance. Recover the shards.",
  "Reforge the blade. End Mordred's reign.",
];

// ────────────────────────────────────────────────────────────────────────────
// Merchant dialogue lines (story flavor)
// ────────────────────────────────────────────────────────────────────────────
export const VENDOR_DIALOGUE: Record<VendorType, string[]> = {
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

export const NIGHT_BOSS_MAP: Partial<Record<DiabloMapId, EnemyType>> = {
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

// ────────────────────────────────────────────────────────────────────────────
// Lore discovery points — flavor text near landmarks
// ────────────────────────────────────────────────────────────────────────────
export interface LorePoint { x: number; z: number; radius: number; title: string; text: string; }
export const MAP_LORE_POINTS: Partial<Record<DiabloMapId, LorePoint[]>> = {
  [DiabloMapId.EMERALD_GRASSLANDS]: [
    { x: -22, z: 19, radius: 8, title: "The Old Windmill", text: "This mill once ground grain for three villages. When the miller's daughter vanished one harvest moon, the blades stopped turning. Locals say you can still hear grinding stones on windless nights." },
    { x: 25, z: -22, radius: 8, title: "Thornfield Farmstead", text: "The Thornfield family farmed this land for seven generations. They abandoned it overnight when their cattle began speaking in tongues. The barn door has never been opened since." },
    { x: 0, z: -10, radius: 6, title: "The Stone Bridge", text: "Built by dwarven masons in the Third Age, this bridge has survived floods, wars, and a dragon's tantrum. The runes carved beneath it are said to ward off river spirits." },
    { x: 8, z: 13, radius: 6, title: "The Campfire Ring", text: "Wandering knights gather here to trade stories and sharpen blades. The ashes never fully cool — some say a fire elemental sleeps beneath the stones, keeping travelers warm." },
  ],
  [DiabloMapId.FOREST]: [
    { x: 0, z: 0, radius: 10, title: "The Heart of Darkwood", text: "At the forest's center stands an oak so ancient its roots drink from underground rivers. Druids once held council here before the corruption spread through the soil." },
    { x: -30, z: -20, radius: 8, title: "Poacher's Camp", text: "Discarded traps and weathered tents mark where the Blackthorn poachers operated. They hunted everything — until the forest began hunting them back." },
    { x: 25, z: 30, radius: 8, title: "The Whispering Clearing", text: "Trees lean inward here as if sharing a secret. Those who rest in this clearing report dreams of a silver stag leading them deeper into the wood." },
  ],
  [DiabloMapId.SUNSCORCH_DESERT]: [
    { x: 0, z: 0, radius: 10, title: "The Buried Colossus", text: "A hand of carved stone rises from the dunes — the only visible remnant of a titan that fell in battle ages ago. Sand traders use it as a landmark, though its fingers seem to shift between visits." },
    { x: -30, z: 20, radius: 8, title: "Oasis of False Promise", text: "This waterhole appears clear and inviting, but its waters carry a subtle venom. Desert nomads know to drink only after boiling. Many a careless traveler has met their end here." },
  ],
  [DiabloMapId.NECROPOLIS_DUNGEON]: [
    { x: 0, z: 0, radius: 8, title: "The Ossuary Gate", text: "Ten thousand skulls line the entrance hall, each belonging to a soldier of the Last Crusade. Their eye sockets glow faintly on moonless nights, as if still standing watch." },
    { x: -20, z: -15, radius: 8, title: "The Embalmer's Chamber", text: "Jars of preserving fluid still line the shelves, each labeled in a language predating the kingdom. Whatever lies in the sealed sarcophagi was meant to stay preserved — not to rise again." },
  ],
  [DiabloMapId.VOLCANIC_WASTES]: [
    { x: 10, z: -20, radius: 8, title: "The Crucible", text: "Blacksmiths once forged legendary weapons in this natural furnace. The last sword made here — Ashbringer — shattered upon striking a demon lord and released a wildfire that still burns." },
    { x: -25, z: 15, radius: 8, title: "Obsidian Flow", text: "This river of cooled glass formed when two volcanoes erupted simultaneously. Alchemists prize its shards, claiming they can trap souls within the glassy surface." },
  ],
  [DiabloMapId.ELVEN_VILLAGE]: [
    { x: 0, z: 0, radius: 10, title: "The Crystal Spires", text: "These towers once channeled moonlight into pure arcane energy. When the corruption came, the light turned inward, and the elves who remained were transformed into something between living and shadow." },
    { x: 20, z: -20, radius: 8, title: "The Singing Fountain", text: "Enchanted water still flows here, humming melodies that change with the seasons. The elves believed it foretold the future — its current song is a dirge." },
  ],
  [DiabloMapId.ABYSSAL_RIFT]: [
    { x: 0, z: 0, radius: 10, title: "The Rift Scar", text: "When the Archmage Nihilus tore reality apart, this wound in the world refused to heal. Time flows differently here — a moment inside can be an hour outside, or the reverse." },
  ],
  [DiabloMapId.DRAGONS_SANCTUM]: [
    { x: 0, z: 0, radius: 10, title: "The Hoard Plateau", text: "Mountains of gold stretch as far as the eye can see, accumulated over millennia by the Elder Dragons. Each coin bears the face of a conquered king — there are thousands of different faces." },
  ],
  [DiabloMapId.CRYSTAL_CAVERNS]: [
    { x: 0, z: 15, radius: 8, title: "The Resonance Chamber", text: "Strike any crystal here and the entire cavern hums in harmony. The dwarves discovered that certain melodies could grow new crystals, others could shatter them — and one forbidden chord could collapse the mountain." },
  ],
  [DiabloMapId.FROZEN_TUNDRA]: [
    { x: -20, z: 0, radius: 8, title: "The Frozen Legion", text: "An entire army stands encased in ice, swords raised mid-charge. No one knows what froze them so instantly. Their faces show not fear, but surprise — whatever struck them, they never saw it coming." },
  ],
  [DiabloMapId.HAUNTED_CATHEDRAL]: [
    { x: 0, z: 0, radius: 8, title: "The Desecrated Altar", text: "Holy symbols have been inverted, prayer books rewritten in blood. The archbishop who turned claimed he heard God speak from below the crypt. The voice still whispers to those who kneel." },
  ],
  [DiabloMapId.CITY_RUINS]: [
    { x: 0, z: 0, radius: 10, title: "The Broken Gate", text: "The city fell in a single night. The gate, forged from blessed iron, was torn apart from the inside. Whatever destroyed this city did not invade — it was already within the walls." },
    { x: 20, z: 20, radius: 8, title: "The Clocktower", text: "The great clock stopped at midnight and has never been repaired. Scavengers avoid it, claiming the bell tolls on its own when death walks nearby." },
  ],
  [DiabloMapId.CITY]: [
    { x: 0, z: 0, radius: 10, title: "Market Square", text: "Thornwall's market was once the busiest in the realm. Now the stalls are empty but for the garrison's enforcers, who tax the air itself. Merchants whisper of a resistance gathering in the sewers below." },
    { x: -15, z: -20, radius: 8, title: "The Warden's Tower", text: "Commander Blackthorn watches from the highest window, day and night, never sleeping. Guards speak in hushed tones of the deal he struck — eternal vigilance in exchange for something far worse than death." },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
// Portal NPC — a wandering hermit near the town portal on adventure maps
// ────────────────────────────────────────────────────────────────────────────
export const PORTAL_NPC_NAME = "Old Cedric the Wayfarer";

export const PORTAL_NPC_GREETING: string[] = [
  "Ah, another soul brave enough to venture here. Come, rest a moment by the portal.",
  "The portal hums with Camelot's magic. As long as it stands, there is hope.",
  "I've wandered these lands since before Mordred's betrayal. I know a thing or two.",
  "Need supplies? I carry a few odds and ends. Nothing fancy, but it'll keep you alive.",
  "Take care out there. The darkness is thicker than it used to be.",
];

export const PORTAL_NPC_RUMORS: Partial<Record<DiabloMapId, string[]>> = {
  [DiabloMapId.EMERALD_GRASSLANDS]: [
    "The grasslands were Camelot's breadbasket once. Now raiders burn the fields and the beasts have gone feral.",
    "Warchief Garon's raiders took something precious from Sir Percival — a piece of Excalibur's crossguard. He wears it as a trophy.",
    "The old windmill to the west still turns on windless nights. The miller's ghost doesn't know he's dead.",
  ],
  [DiabloMapId.FOREST]: [
    "The Great Oak at the forest's heart bleeds black sap since Morgan le Fay planted a shard of Excalibur in its roots.",
    "Poachers used to hunt these woods. Then the trees started hunting them back. The forest is alive — and angry.",
    "I heard whispers of a silver stag deep in the woods. Druids say it guards the path to something ancient.",
  ],
  [DiabloMapId.SUNSCORCH_DESERT]: [
    "Sir Bedivere's tomb glows blue at night. He still clutches the Pommel of Excalibur, even in death.",
    "The oasis to the south looks inviting, but its waters are poisoned. Many careless travelers never left.",
    "A buried colossus lies beneath the dunes — a titan felled in an age before memory. Its fingers shift between visits.",
  ],
  [DiabloMapId.NECROPOLIS_DUNGEON]: [
    "Sir Lancelot went down alone to reclaim the Blade Core. Mordred's necromancers killed him and raised his corpse as a guardian.",
    "Ten thousand skulls line the entrance. Soldiers of the Last Crusade, still standing watch after all these years.",
    "The dead do not rest here. Whatever lurks below is older than the catacombs themselves.",
  ],
  [DiabloMapId.VOLCANIC_WASTES]: [
    "The demon Balor consumed Merlin's essence along with the Enchantment Rune. He burns in the deepest caldera.",
    "Blacksmiths once forged legendary weapons in these natural furnaces. The last sword made here — Ashbringer — shattered and started a wildfire that still burns.",
    "The air reeks of brimstone and stolen magic. Something terrible feeds on Merlin's power here.",
  ],
  [DiabloMapId.ELVEN_VILLAGE]: [
    "Archon Sylvaris went mad when they brought the Upper Blade to the crystal spire. The fragment's power shattered his mind.",
    "The singing fountain still hums, but its song has turned to a dirge. The elves who remain are half-shadow now.",
    "The elves sealed their village after the corruption. Whatever the Archon found, it broke him beyond repair.",
  ],
  [DiabloMapId.ABYSSAL_RIFT]: [
    "Morgan le Fay fled into the void with the Scabbard. She's preparing a ritual to destroy it — you must hurry.",
    "Time flows differently inside the Rift. A moment inside can be an hour outside, or the reverse.",
    "The Scabbard grants invulnerability. Without it, Mordred can still be slain — that's why Morgan hides it here.",
  ],
  [DiabloMapId.DRAGONS_SANCTUM]: [
    "Aurelion the Eternal bonded with Excalibur's sentient core. The Soul of the Blade chose the dragon to survive.",
    "Mountains of gold stretch as far as the eye can see. Each coin bears the face of a conquered king.",
    "The Soul will not yield to the unworthy — but it yearns to be whole again. Prove yourself.",
  ],
  [DiabloMapId.WHISPERING_MARSH]: [
    "Sir Galahad wrapped the Hilt Binding in holy cloth and sank it in the marsh, hoping the corruption would never find it.",
    "The swamp has eyes and teeth. Bog gas and ancient magic mix in ways that drive men mad.",
    "Deep within the miasma, Galahad's spirit still guards what he died to protect.",
  ],
  [DiabloMapId.CRYSTAL_CAVERNS]: [
    "Merlin embedded a crystal focus in Excalibur to channel ley lines. When the blade shattered, the focus fell into the earth.",
    "Strike any crystal here and the entire cavern hums. One forbidden chord could collapse the mountain.",
    "The Prismatic Wyrm has swallowed the Crystal Focus whole. You'll have to cut it out of the beast.",
  ],
  [DiabloMapId.FROZEN_TUNDRA]: [
    "Sir Gawain carried the Frozen Edge to the tundra's heart and froze it in place with his dying breath.",
    "An entire army stands encased in ice, swords raised mid-charge. Whatever froze them, they never saw it coming.",
    "Only by slaying the Glacial Titan can the eternal ice be broken and the fragment reclaimed.",
  ],
  [DiabloMapId.HAUNTED_CATHEDRAL]: [
    "The Archbishop was tasked with guarding Excalibur's divine enchantment, but Mordred's curse turned faith to madness.",
    "Holy symbols have been inverted, prayer books rewritten in blood. The voice below the crypt still whispers.",
    "Free the spirits of the corrupted priests to reclaim the Sacred Blessing.",
  ],
  [DiabloMapId.THORNWOOD_THICKET]: [
    "The Lady of the Lake embedded life into Excalibur. When the blade shattered, the heartwood shard grew roots and became part of the thicket.",
    "The Thornmother has absorbed the Living Heartwood into her being. She must be slain to reclaim it.",
    "Watch your step — the thorns here are alive and hungry.",
  ],
  [DiabloMapId.CITY]: [
    "Commander Blackthorn watches from the highest window, never sleeping. They say he traded something precious for eternal vigilance.",
    "Thornwall's market was the busiest in the realm. Now the garrison taxes the air itself.",
    "Merchants whisper of a resistance gathering in the sewers below the market square.",
  ],
  [DiabloMapId.CITY_RUINS]: [
    "The city fell in a single night. The gate was torn apart from the inside — whatever destroyed this place was already within.",
    "The great clocktower stopped at midnight. Scavengers avoid it — the bell tolls on its own when death walks nearby.",
    "Corrupted watchmen still patrol their forgotten posts. They don't know the city they guard is dust.",
  ],
};

// Fallback rumors for maps without specific entries
export const PORTAL_NPC_GENERIC_RUMORS: string[] = [
  "Mordred's corruption seeps deeper every day. The land itself is dying.",
  "I've heard tell of powerful artifacts scattered across these lands. Keep your eyes sharp.",
  "The fragments of Excalibur call out to each other. Can you feel it? A hum in the air.",
  "Be careful of the night. Stronger creatures stir when the sun sets.",
  "Camelot's merchants may charge more, but at least their goods are reliable. Mine are... functional.",
];

export const DAY_BOSS_MAP: Partial<Record<DiabloMapId, EnemyType>> = {
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
// Hoisted constant arrays/maps (avoid re-creating per frame)
// ────────────────────────────────────────────────────────────────────────────
export const RARITY_ORDER = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.LEGENDARY, ItemRarity.MYTHIC, ItemRarity.DIVINE] as const;

export const MAP_NAME_MAP: Record<string, string> = {
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

export const WEATHER_LABELS: Record<Weather, string> = {
  [Weather.NORMAL]: "",
  [Weather.FOGGY]: "\uD83C\uDF2B\uFE0F Foggy",
  [Weather.CLEAR]: "\u2600\uFE0F Clear Skies",
  [Weather.STORMY]: "\u26C8\uFE0F Stormy",
};

// ────────────────────────────────────────────────────────────────────────────
// Spawn quotes — per class, per map (character says a line on entering a map)
// ────────────────────────────────────────────────────────────────────────────
export const SPAWN_QUOTES: Partial<Record<DiabloMapId, Record<DiabloClass, string>>> = {
  [DiabloMapId.FOREST]: {
    [DiabloClass.WARRIOR]: "These woods remind me of the training grounds. Time to cut some timber.",
    [DiabloClass.MAGE]: "I sense ancient ley lines beneath these roots...",
    [DiabloClass.RANGER]: "Finally, home turf. Every tree is an ally.",
    [DiabloClass.PALADIN]: "The light fades here. Stay vigilant.",
    [DiabloClass.NECROMANCER]: "So many bones buried under these leaves. Delightful.",
    [DiabloClass.ASSASSIN]: "Good. Plenty of shadows to work with.",
  },
  [DiabloMapId.ELVEN_VILLAGE]: {
    [DiabloClass.WARRIOR]: "Elven lands... I'll try not to break anything.",
    [DiabloClass.MAGE]: "The arcane resonance here is extraordinary.",
    [DiabloClass.RANGER]: "The elves taught me everything I know about the bow.",
    [DiabloClass.PALADIN]: "Even the elves need the Light's protection now.",
    [DiabloClass.NECROMANCER]: "Elves live so long, yet they still fear death. How quaint.",
    [DiabloClass.ASSASSIN]: "Beautiful place. Shame about the monsters.",
  },
  [DiabloMapId.NECROPOLIS_DUNGEON]: {
    [DiabloClass.WARRIOR]: "A graveyard. Lovely. At least the dead fight fair.",
    [DiabloClass.MAGE]: "The veil between worlds is thin here. I must be careful.",
    [DiabloClass.RANGER]: "Arrows work on the undead, right? ...Right?",
    [DiabloClass.PALADIN]: "This unholy ground shall be purified!",
    [DiabloClass.NECROMANCER]: "Ah, the Necropolis. I feel right at home.",
    [DiabloClass.ASSASSIN]: "Can't backstab a skeleton. This'll be interesting.",
  },
  [DiabloMapId.VOLCANIC_WASTES]: {
    [DiabloClass.WARRIOR]: "Hot enough to forge a blade. I like it.",
    [DiabloClass.MAGE]: "Fire magic is amplified here. Excellent.",
    [DiabloClass.RANGER]: "Bowstrings don't last long in this heat...",
    [DiabloClass.PALADIN]: "The fires of judgement burn eternal.",
    [DiabloClass.NECROMANCER]: "Even the dead don't rest in this inferno.",
    [DiabloClass.ASSASSIN]: "The heat haze makes for perfect camouflage.",
  },
  [DiabloMapId.ABYSSAL_RIFT]: {
    [DiabloClass.WARRIOR]: "I've stared into the abyss before. It blinked first.",
    [DiabloClass.MAGE]: "The void calls to me... I must resist.",
    [DiabloClass.RANGER]: "Can't track what doesn't leave footprints.",
    [DiabloClass.PALADIN]: "By the Light, what manner of evil lurks here?",
    [DiabloClass.NECROMANCER]: "The boundary between realms is... deliciously thin.",
    [DiabloClass.ASSASSIN]: "Darkness within darkness. My kind of place.",
  },
  [DiabloMapId.DRAGONS_SANCTUM]: {
    [DiabloClass.WARRIOR]: "Dragon scales make the finest armor. Let's go shopping.",
    [DiabloClass.MAGE]: "Dragonfire and sorcery — a volatile combination.",
    [DiabloClass.RANGER]: "I once shot a dragon. Once.",
    [DiabloClass.PALADIN]: "Even dragons bow before the righteous.",
    [DiabloClass.NECROMANCER]: "Imagine raising a dragon from the dead...",
    [DiabloClass.ASSASSIN]: "Find the soft spot under the chin. Simple.",
  },
  [DiabloMapId.SUNSCORCH_DESERT]: {
    [DiabloClass.WARRIOR]: "Sand in my armor. This is going to be a long day.",
    [DiabloClass.MAGE]: "Mirages everywhere. Hard to tell what's real.",
    [DiabloClass.RANGER]: "At least there's no underbrush to trip over.",
    [DiabloClass.PALADIN]: "The sun's fury rivals the Light itself.",
    [DiabloClass.NECROMANCER]: "The desert preserves the dead beautifully.",
    [DiabloClass.ASSASSIN]: "Nowhere to hide out here. I hate deserts.",
  },
  [DiabloMapId.EMERALD_GRASSLANDS]: {
    [DiabloClass.WARRIOR]: "Open field. Good. No excuses, just steel.",
    [DiabloClass.MAGE]: "The wind carries whispers of old magic here.",
    [DiabloClass.RANGER]: "I can see for miles. Nothing sneaks up on me here.",
    [DiabloClass.PALADIN]: "Green pastures. Almost peaceful... almost.",
    [DiabloClass.NECROMANCER]: "All this life... it's almost nauseating.",
    [DiabloClass.ASSASSIN]: "Too exposed. I'll have to be quick.",
  },
  [DiabloMapId.WHISPERING_MARSH]: {
    [DiabloClass.WARRIOR]: "My boots are already soaked. Wonderful.",
    [DiabloClass.MAGE]: "Bog gas and spell components — same difference.",
    [DiabloClass.RANGER]: "The swamp has eyes. And teeth.",
    [DiabloClass.PALADIN]: "Even the muck cannot dim the Light.",
    [DiabloClass.NECROMANCER]: "Swamps are nature's graveyards. Perfect.",
    [DiabloClass.ASSASSIN]: "The fog will serve me well.",
  },
  [DiabloMapId.CRYSTAL_CAVERNS]: {
    [DiabloClass.WARRIOR]: "Pretty rocks. Hope they shatter like the rest.",
    [DiabloClass.MAGE]: "These crystals pulse with raw mana!",
    [DiabloClass.RANGER]: "Echoes everywhere. No sneaking in here.",
    [DiabloClass.PALADIN]: "The Light refracts beautifully through crystal.",
    [DiabloClass.NECROMANCER]: "Crystals trap souls. I wonder what's inside these...",
    [DiabloClass.ASSASSIN]: "Every surface is a mirror. Annoying.",
  },
  [DiabloMapId.FROZEN_TUNDRA]: {
    [DiabloClass.WARRIOR]: "Cold keeps the blood pumping. I'm ready.",
    [DiabloClass.MAGE]: "Ice magic flows like water here.",
    [DiabloClass.RANGER]: "Tracks in the snow. Easy prey.",
    [DiabloClass.PALADIN]: "The cold tests the faithful. I shall not falter.",
    [DiabloClass.NECROMANCER]: "The cold preserves my minions. Efficient.",
    [DiabloClass.ASSASSIN]: "White snow, dark shadows. Perfect contrast.",
  },
  [DiabloMapId.HAUNTED_CATHEDRAL]: {
    [DiabloClass.WARRIOR]: "Ghosts can't parry a sword. Or can they?",
    [DiabloClass.MAGE]: "Spectral energies saturate this place.",
    [DiabloClass.RANGER]: "Arrows pass right through ghosts. This is bad.",
    [DiabloClass.PALADIN]: "This holy ground has been desecrated. No more!",
    [DiabloClass.NECROMANCER]: "The spirits here are... chatty.",
    [DiabloClass.ASSASSIN]: "Even ghosts have patterns. I'll find theirs.",
  },
  [DiabloMapId.CAMELOT]: {
    [DiabloClass.WARRIOR]: "Camelot. The war table awaits.",
    [DiabloClass.MAGE]: "The towers of Camelot hum with enchantments.",
    [DiabloClass.RANGER]: "Good to rest the bowstring for a while.",
    [DiabloClass.PALADIN]: "Home. May the Light guard these walls.",
    [DiabloClass.NECROMANCER]: "Even Camelot's graveyards are... well maintained.",
    [DiabloClass.ASSASSIN]: "I know every shadow in this city.",
  },
  [DiabloMapId.CRIMSON_CITADEL]: {
    [DiabloClass.WARRIOR]: "A fortress. Finally, a proper siege.",
    [DiabloClass.MAGE]: "Blood magic lingers in these walls.",
    [DiabloClass.RANGER]: "High walls and narrow corridors. Not ideal.",
    [DiabloClass.PALADIN]: "This crimson stain upon the land ends today.",
    [DiabloClass.NECROMANCER]: "So much death within these walls. I approve.",
    [DiabloClass.ASSASSIN]: "Fortresses have blind spots. I know them all.",
  },
  [DiabloMapId.SHADOW_REALM]: {
    [DiabloClass.WARRIOR]: "Can't swing a sword at nothing... or can I?",
    [DiabloClass.MAGE]: "Reality bends here. Fascinating and terrifying.",
    [DiabloClass.RANGER]: "No light, no shadows, no tracks. Just... nothing.",
    [DiabloClass.PALADIN]: "The Light pierces even this abyss!",
    [DiabloClass.NECROMANCER]: "The boundary between life and death doesn't exist here.",
    [DiabloClass.ASSASSIN]: "I AM the shadow. This is my domain.",
  },
  [DiabloMapId.INFERNAL_THRONE]: {
    [DiabloClass.WARRIOR]: "The throne of demons. Let's dethrone them.",
    [DiabloClass.MAGE]: "Hellfire and brimstone. My shield spells better hold.",
    [DiabloClass.RANGER]: "Fire-tipped arrows it is, then.",
    [DiabloClass.PALADIN]: "Into the heart of evil itself. The Light will prevail!",
    [DiabloClass.NECROMANCER]: "Even demons can be raised. They just complain more.",
    [DiabloClass.ASSASSIN]: "Kill the king, the kingdom falls. Simple.",
  },
};
