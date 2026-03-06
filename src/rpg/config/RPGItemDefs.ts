// RPG item definitions
// Tier guide: T1=Common, T2=Uncommon, T3=Rare, T4=Epic (boss), T5=Legendary (hardest boss)
import { AbilityType } from "@/types";
import type { RPGItem } from "@rpg/state/RPGState";

// ===========================================================================
// Consumables
// ===========================================================================

export const ITEM_HEALTH_POTION: RPGItem = {
  id: "health_potion", name: "Health Potion", type: "consumable",
  stats: { hp: 50 }, description: "Restores 50 HP.", value: 25,
};
export const ITEM_GREATER_HEALTH_POTION: RPGItem = {
  id: "greater_health_potion", name: "Greater Health Potion", type: "consumable",
  stats: { hp: 150 }, description: "Restores 150 HP.", value: 80,
};
export const ITEM_MEGA_HEALTH_POTION: RPGItem = {
  id: "mega_health_potion", name: "Mega Health Potion", type: "consumable",
  stats: { hp: 400 }, description: "Restores 400 HP.", value: 200,
};
export const ITEM_FULL_RESTORE: RPGItem = {
  id: "full_restore", name: "Full Restore", type: "consumable",
  stats: { hp: 9999 }, description: "Fully restores HP.", value: 500,
};
export const ITEM_MANA_POTION: RPGItem = {
  id: "mana_potion", name: "Mana Potion", type: "consumable",
  stats: { mp: 30 }, description: "Restores 30 MP.", value: 30,
};
export const ITEM_GREATER_MANA_POTION: RPGItem = {
  id: "greater_mana_potion", name: "Greater Mana Potion", type: "consumable",
  stats: { mp: 80 }, description: "Restores 80 MP.", value: 90,
};
export const ITEM_ELIXIR: RPGItem = {
  id: "elixir", name: "Elixir", type: "consumable",
  stats: { hp: 100, mp: 30 }, description: "Restores 100 HP and 30 MP.", value: 120,
};
export const ITEM_GRAND_ELIXIR: RPGItem = {
  id: "grand_elixir", name: "Grand Elixir", type: "consumable",
  stats: { hp: 9999, mp: 9999 }, description: "Fully restores HP and MP.", value: 800,
};
export const ITEM_ANTIDOTE: RPGItem = {
  id: "antidote", name: "Antidote", type: "consumable",
  stats: {}, description: "Cures poison.", value: 15,
};
export const ITEM_FIRE_SCROLL: RPGItem = {
  id: "fire_scroll", name: "Fire Scroll", type: "consumable",
  stats: {}, description: "Casts Fireball on all enemies.",
  abilityType: AbilityType.FIREBALL, value: 60,
};
export const ITEM_SMOKE_BOMB: RPGItem = {
  id: "smoke_bomb", name: "Smoke Bomb", type: "consumable",
  stats: {}, description: "Guarantees escape from non-boss battles.", value: 40,
};
export const ITEM_PHOENIX_DOWN: RPGItem = {
  id: "phoenix_down", name: "Phoenix Down", type: "consumable",
  stats: { hp: 100 }, description: "Revives a fallen ally with 100 HP.", value: 300,
};

// ===========================================================================
// Weapons — T1 to T5
// ===========================================================================

// --- T1: Common ---
export const ITEM_RUSTY_DAGGER: RPGItem = {
  id: "rusty_dagger", name: "Rusty Dagger", type: "weapon",
  stats: { atk: 2 }, description: "A worn-out dagger. Better than fists.", value: 15,
};
export const ITEM_WOODEN_CLUB: RPGItem = {
  id: "wooden_club", name: "Wooden Club", type: "weapon",
  stats: { atk: 3 }, description: "A crude wooden club.", value: 20,
};
export const ITEM_IRON_SWORD: RPGItem = {
  id: "iron_sword", name: "Iron Sword", type: "weapon",
  stats: { atk: 5 }, description: "A sturdy iron blade.", value: 50,
};
export const ITEM_HUNTING_BOW: RPGItem = {
  id: "hunting_bow", name: "Hunting Bow", type: "weapon",
  stats: { atk: 4, speed: 0.1 }, description: "A simple bow for hunting.", value: 45,
};
export const ITEM_APPRENTICE_WAND: RPGItem = {
  id: "apprentice_wand", name: "Apprentice Wand", type: "weapon",
  stats: { atk: 3, mp: 10 }, description: "A novice caster's wand.", value: 40,
};

// --- T2: Uncommon ---
export const ITEM_STEEL_SWORD: RPGItem = {
  id: "steel_sword", name: "Steel Sword", type: "weapon",
  stats: { atk: 12 }, description: "A finely forged steel sword.", value: 150,
};
export const ITEM_BATTLE_HAMMER: RPGItem = {
  id: "battle_hammer", name: "Battle Hammer", type: "weapon",
  stats: { atk: 11, def: 2 }, description: "Hits hard and sturdy to hold.", value: 140,
};
export const ITEM_MAGIC_STAFF: RPGItem = {
  id: "magic_staff", name: "Magic Staff", type: "weapon",
  stats: { atk: 8, mp: 15 }, description: "Imbued with arcane power.", value: 120,
};
export const ITEM_LONGBOW: RPGItem = {
  id: "longbow", name: "Longbow", type: "weapon",
  stats: { atk: 10, speed: 0.1 }, description: "A tall bow with great range.", value: 130,
};
export const ITEM_RAPIER: RPGItem = {
  id: "rapier", name: "Rapier", type: "weapon",
  stats: { atk: 9, speed: 0.3 }, description: "A swift thrusting blade.", value: 160,
};

// --- T3: Rare ---
export const ITEM_WAR_AXE: RPGItem = {
  id: "war_axe", name: "War Axe", type: "weapon",
  stats: { atk: 15 }, description: "A heavy war axe.", value: 200,
};
export const ITEM_FLAMEBLADE: RPGItem = {
  id: "flameblade", name: "Flameblade", type: "weapon",
  stats: { atk: 18, speed: -0.1 }, description: "A blade wreathed in fire.", value: 350,
};
export const ITEM_FROST_STAFF: RPGItem = {
  id: "frost_staff", name: "Frost Staff", type: "weapon",
  stats: { atk: 14, mp: 25 }, description: "Channels the cold of winter.", value: 300,
};
export const ITEM_COMPOSITE_BOW: RPGItem = {
  id: "composite_bow", name: "Composite Bow", type: "weapon",
  stats: { atk: 14, speed: 0.2 }, description: "A bow of layered horn and wood.", value: 280,
};
export const ITEM_MITHRIL_DAGGER: RPGItem = {
  id: "mithril_dagger", name: "Mithril Dagger", type: "weapon",
  stats: { atk: 13, speed: 0.4 }, description: "Light as air, sharp as hate.", value: 320,
};

// --- T4: Epic (boss drops) ---
export const ITEM_DRAGONSLAYER: RPGItem = {
  id: "dragonslayer", name: "Dragonslayer", type: "weapon",
  stats: { atk: 25 }, description: "Forged to fell dragons.", value: 600,
};
export const ITEM_ARCHMAGE_STAFF: RPGItem = {
  id: "archmage_staff", name: "Archmage Staff", type: "weapon",
  stats: { atk: 16, mp: 40 }, description: "The pinnacle of arcane craft.", value: 550,
};
export const ITEM_VOIDCLEAVER: RPGItem = {
  id: "voidcleaver", name: "Voidcleaver", type: "weapon",
  stats: { atk: 22, speed: 0.2 }, description: "Cuts through reality itself.", value: 580,
};
export const ITEM_SOULREAPER: RPGItem = {
  id: "soulreaper", name: "Soulreaper", type: "weapon",
  stats: { atk: 20, hp: 30 }, description: "Drains the life of foes.", value: 520,
};

// --- T5: Legendary ---
export const ITEM_EXCALIBUR: RPGItem = {
  id: "excalibur", name: "Excalibur", type: "weapon",
  stats: { atk: 35, def: 8, hp: 50 }, description: "The legendary holy sword.", value: 999,
};
export const ITEM_RAGNAROK: RPGItem = {
  id: "ragnarok", name: "Ragnarok", type: "weapon",
  stats: { atk: 40, speed: -0.3 }, description: "The blade of the end times.", value: 999,
};
export const ITEM_STAFF_OF_ETERNITY: RPGItem = {
  id: "staff_of_eternity", name: "Staff of Eternity", type: "weapon",
  stats: { atk: 22, mp: 60, speed: 0.2 }, description: "Channels infinite mana.", value: 999,
};

// ===========================================================================
// Armor — T1 to T5
// ===========================================================================

// --- T1 ---
export const ITEM_PADDED_VEST: RPGItem = {
  id: "padded_vest", name: "Padded Vest", type: "armor",
  stats: { def: 2 }, description: "Lightly padded cloth armor.", value: 20,
};
export const ITEM_LEATHER_ARMOR: RPGItem = {
  id: "leather_armor", name: "Leather Armor", type: "armor",
  stats: { def: 4 }, description: "Simple leather protection.", value: 40,
};

// --- T2 ---
export const ITEM_SCALE_MAIL: RPGItem = {
  id: "scale_mail", name: "Scale Mail", type: "armor",
  stats: { def: 6, speed: -0.1 }, description: "Overlapping metal scales.", value: 90,
};
export const ITEM_CHAINMAIL: RPGItem = {
  id: "chainmail", name: "Chainmail", type: "armor",
  stats: { def: 8 }, description: "Interlocking iron rings.", value: 120,
};
export const ITEM_BRIGANDINE: RPGItem = {
  id: "brigandine", name: "Brigandine", type: "armor",
  stats: { def: 7, atk: 1 }, description: "Riveted plates within cloth.", value: 110,
};

// --- T3 ---
export const ITEM_PLATE_ARMOR: RPGItem = {
  id: "plate_armor", name: "Plate Armor", type: "armor",
  stats: { def: 15, speed: -0.2 }, description: "Heavy plate. Slower but tough.", value: 300,
};
export const ITEM_MAGE_ROBES: RPGItem = {
  id: "mage_robes", name: "Mage Robes", type: "armor",
  stats: { def: 6, mp: 20, speed: 0.1 }, description: "Enchanted robes for casters.", value: 260,
};

// --- T4 ---
export const ITEM_DRAGONSCALE_ARMOR: RPGItem = {
  id: "dragonscale_armor", name: "Dragonscale Armor", type: "armor",
  stats: { def: 22, hp: 40 }, description: "Made from true dragon scales.", value: 650,
};
export const ITEM_SHADOW_CLOAK: RPGItem = {
  id: "shadow_cloak", name: "Shadow Cloak", type: "armor",
  stats: { def: 14, speed: 0.4 }, description: "Woven from living shadow.", value: 550,
};

// --- T5 ---
export const ITEM_MYTHRIL_MAIL: RPGItem = {
  id: "mythril_mail", name: "Mythril Mail", type: "armor",
  stats: { def: 25, speed: 0.2, hp: 30 }, description: "Light as silk, strong as dragon bone.", value: 999,
};
export const ITEM_DIVINE_PLATE: RPGItem = {
  id: "divine_plate", name: "Divine Plate", type: "armor",
  stats: { def: 30, hp: 60, speed: -0.3 }, description: "Blessed by the gods themselves.", value: 999,
};

// ===========================================================================
// Helmets — T1 to T5
// ===========================================================================

// --- T1 ---
export const ITEM_CLOTH_HOOD: RPGItem = {
  id: "cloth_hood", name: "Cloth Hood", type: "helmet",
  stats: { def: 1, mp: 5 }, description: "A mage's cloth hood.", value: 15,
};
export const ITEM_LEATHER_CAP: RPGItem = {
  id: "leather_cap", name: "Leather Cap", type: "helmet",
  stats: { def: 2 }, description: "A simple leather cap.", value: 25,
};

// --- T2 ---
export const ITEM_IRON_HELM: RPGItem = {
  id: "iron_helm", name: "Iron Helm", type: "helmet",
  stats: { def: 5 }, description: "Sturdy iron helmet.", value: 80,
};
export const ITEM_STEEL_HELM: RPGItem = {
  id: "steel_helm", name: "Steel Helm", type: "helmet",
  stats: { def: 6 }, description: "A well-forged steel helmet.", value: 100,
};
export const ITEM_WIZARD_HAT: RPGItem = {
  id: "wizard_hat", name: "Wizard Hat", type: "helmet",
  stats: { def: 2, mp: 15 }, description: "Pointy hat of a learned wizard.", value: 90,
};

// --- T3 ---
export const ITEM_GREAT_HELM: RPGItem = {
  id: "great_helm", name: "Great Helm", type: "helmet",
  stats: { def: 9, speed: -0.1 }, description: "Massive helm. Heavy but protective.", value: 200,
};
export const ITEM_HORNED_HELM: RPGItem = {
  id: "horned_helm", name: "Horned Helm", type: "helmet",
  stats: { def: 8, atk: 3 }, description: "Intimidating horned war helmet.", value: 220,
};

// --- T4 ---
export const ITEM_CROWN_OF_THORNS: RPGItem = {
  id: "crown_of_thorns", name: "Crown of Thorns", type: "helmet",
  stats: { def: 10, atk: 6 }, description: "Pain fuels power.", value: 500,
};
export const ITEM_DRAGON_CROWN: RPGItem = {
  id: "dragon_crown", name: "Dragon Crown", type: "helmet",
  stats: { def: 12, hp: 30 }, description: "Forged from a dragon's horn.", value: 480,
};

// --- T5 ---
export const ITEM_DIADEM_OF_STARS: RPGItem = {
  id: "diadem_of_stars", name: "Diadem of Stars", type: "helmet",
  stats: { def: 10, mp: 30, speed: 0.2 }, description: "Woven starlight crown.", value: 999,
};
export const ITEM_HELM_OF_DOMINION: RPGItem = {
  id: "helm_of_dominion", name: "Helm of Dominion", type: "helmet",
  stats: { def: 16, atk: 5, hp: 20 }, description: "Worn by ancient warlords.", value: 999,
};

// ===========================================================================
// Shields — T1 to T5
// ===========================================================================

// --- T1 ---
export const ITEM_BUCKLER: RPGItem = {
  id: "buckler", name: "Buckler", type: "shield",
  stats: { def: 2, speed: 0.1 }, description: "A small, nimble shield.", value: 20,
};
export const ITEM_WOODEN_SHIELD: RPGItem = {
  id: "wooden_shield", name: "Wooden Shield", type: "shield",
  stats: { def: 3 }, description: "A basic wooden shield.", value: 30,
};

// --- T2 ---
export const ITEM_IRON_SHIELD: RPGItem = {
  id: "iron_shield", name: "Iron Shield", type: "shield",
  stats: { def: 7 }, description: "A solid iron shield.", value: 100,
};
export const ITEM_STEEL_SHIELD: RPGItem = {
  id: "steel_shield", name: "Steel Shield", type: "shield",
  stats: { def: 8 }, description: "Polished steel protection.", value: 120,
};

// --- T3 ---
export const ITEM_TOWER_SHIELD: RPGItem = {
  id: "tower_shield", name: "Tower Shield", type: "shield",
  stats: { def: 12, speed: -0.2 }, description: "Massive tower shield.", value: 250,
};
export const ITEM_SPIKED_SHIELD: RPGItem = {
  id: "spiked_shield", name: "Spiked Shield", type: "shield",
  stats: { def: 10, atk: 3 }, description: "Defensive and offensive.", value: 240,
};

// --- T4 ---
export const ITEM_AEGIS: RPGItem = {
  id: "aegis", name: "Aegis", type: "shield",
  stats: { def: 16, hp: 30 }, description: "Shield of mythical guardians.", value: 550,
};
export const ITEM_INFERNAL_WARD: RPGItem = {
  id: "infernal_ward", name: "Infernal Ward", type: "shield",
  stats: { def: 14, atk: 4, hp: 20 }, description: "Forged in hellfire.", value: 520,
};

// --- T5 ---
export const ITEM_MIRROR_SHIELD: RPGItem = {
  id: "mirror_shield", name: "Mirror Shield", type: "shield",
  stats: { def: 18, speed: 0.1, hp: 20 }, description: "Reflects all evil.", value: 999,
};

// ===========================================================================
// Legs — T1 to T5
// ===========================================================================

// --- T1 ---
export const ITEM_LINEN_TROUSERS: RPGItem = {
  id: "linen_trousers", name: "Linen Trousers", type: "legs",
  stats: { def: 1, speed: 0.1 }, description: "Light and comfortable.", value: 15,
};
export const ITEM_CLOTH_PANTS: RPGItem = {
  id: "cloth_pants", name: "Cloth Pants", type: "legs",
  stats: { def: 1 }, description: "Simple cloth legwear.", value: 20,
};

// --- T2 ---
export const ITEM_STUDDED_LEGGINGS: RPGItem = {
  id: "studded_leggings", name: "Studded Leggings", type: "legs",
  stats: { def: 4, atk: 1 }, description: "Leather with metal studs.", value: 80,
};
export const ITEM_CHAIN_LEGGINGS: RPGItem = {
  id: "chain_leggings", name: "Chain Leggings", type: "legs",
  stats: { def: 5 }, description: "Chainmail leg protection.", value: 90,
};

// --- T3 ---
export const ITEM_PLATE_GREAVES: RPGItem = {
  id: "plate_greaves", name: "Plate Greaves", type: "legs",
  stats: { def: 10, speed: -0.1 }, description: "Heavy plate leg armor.", value: 220,
};
export const ITEM_ENCHANTED_SKIRT: RPGItem = {
  id: "enchanted_skirt", name: "Enchanted Skirt", type: "legs",
  stats: { def: 6, mp: 15, speed: 0.1 }, description: "Magic-woven battle skirt.", value: 200,
};

// --- T4 ---
export const ITEM_DRAGON_TASSETS: RPGItem = {
  id: "dragon_tassets", name: "Dragon Tassets", type: "legs",
  stats: { def: 14, hp: 25 }, description: "Dragonscale leg guards.", value: 500,
};
export const ITEM_PHANTOM_LEGGINGS: RPGItem = {
  id: "phantom_leggings", name: "Phantom Leggings", type: "legs",
  stats: { def: 10, speed: 0.4 }, description: "Phase through attacks.", value: 480,
};

// --- T5 ---
export const ITEM_CELESTIAL_GREAVES: RPGItem = {
  id: "celestial_greaves", name: "Celestial Greaves", type: "legs",
  stats: { def: 16, speed: 0.2, hp: 20 }, description: "Forged in the heavens.", value: 999,
};

// ===========================================================================
// Boots — T1 to T5
// ===========================================================================

// --- T1 ---
export const ITEM_SANDALS: RPGItem = {
  id: "sandals", name: "Sandals", type: "boots",
  stats: { speed: 0.1 }, description: "Light and breezy.", value: 15,
};
export const ITEM_LEATHER_BOOTS: RPGItem = {
  id: "leather_boots", name: "Leather Boots", type: "boots",
  stats: { def: 2, speed: 0.2 }, description: "Sturdy leather boots.", value: 50,
};

// --- T2 ---
export const ITEM_STEEL_SABATONS: RPGItem = {
  id: "steel_sabatons", name: "Steel Sabatons", type: "boots",
  stats: { def: 4 }, description: "Heavy steel foot armor.", value: 90,
};
export const ITEM_RANGER_BOOTS: RPGItem = {
  id: "ranger_boots", name: "Ranger Boots", type: "boots",
  stats: { def: 2, speed: 0.3 }, description: "Made for long treks.", value: 100,
};

// --- T3 ---
export const ITEM_IRON_GREAVES: RPGItem = {
  id: "iron_greaves", name: "Iron Greaves", type: "boots",
  stats: { def: 5, speed: -0.1 }, description: "Heavy iron boots.", value: 140,
};
export const ITEM_WINGED_BOOTS: RPGItem = {
  id: "winged_boots", name: "Winged Boots", type: "boots",
  stats: { speed: 0.5, def: 3 }, description: "Enchanted for great speed.", value: 280,
};
export const ITEM_KNIGHTS_GREAVES: RPGItem = {
  id: "knights_greaves", name: "Knight's Greaves", type: "boots",
  stats: { def: 7, speed: -0.1 }, description: "Plate boots of a knight.", value: 200,
};

// --- T4 ---
export const ITEM_SHADOWSTEP_BOOTS: RPGItem = {
  id: "shadowstep_boots", name: "Shadowstep Boots", type: "boots",
  stats: { speed: 0.6, atk: 3 }, description: "Move unseen, strike fast.", value: 500,
};
export const ITEM_TITAN_STOMPERS: RPGItem = {
  id: "titan_stompers", name: "Titan Stompers", type: "boots",
  stats: { def: 10, atk: 4, speed: -0.2 }, description: "Every step shakes the earth.", value: 480,
};

// --- T5 ---
export const ITEM_BOOTS_OF_THE_WIND: RPGItem = {
  id: "boots_of_the_wind", name: "Boots of the Wind", type: "boots",
  stats: { speed: 0.8, def: 5, hp: 15 }, description: "Run like the wind itself.", value: 999,
};

// ===========================================================================
// Rings — T1 to T5
// ===========================================================================

// --- T1 ---
export const ITEM_BONE_RING: RPGItem = {
  id: "bone_ring", name: "Bone Ring", type: "ring",
  stats: { atk: 1, hp: 5 }, description: "Carved from monster bone.", value: 20,
};
export const ITEM_COPPER_RING: RPGItem = {
  id: "copper_ring", name: "Copper Ring", type: "ring",
  stats: { atk: 2 }, description: "A simple copper ring.", value: 30,
};

// --- T2 ---
export const ITEM_SILVER_RING: RPGItem = {
  id: "silver_ring", name: "Silver Ring", type: "ring",
  stats: { atk: 4, def: 2 }, description: "A polished silver ring.", value: 100,
};
export const ITEM_RUBY_RING: RPGItem = {
  id: "ruby_ring", name: "Ruby Ring", type: "ring",
  stats: { atk: 6 }, description: "Set with a blazing ruby.", value: 120,
};
export const ITEM_SAPPHIRE_RING: RPGItem = {
  id: "sapphire_ring", name: "Sapphire Ring", type: "ring",
  stats: { mp: 15, def: 2 }, description: "Set with a deep blue sapphire.", value: 110,
};

// --- T3 ---
export const ITEM_GOLD_RING: RPGItem = {
  id: "gold_ring", name: "Gold Ring", type: "ring",
  stats: { atk: 6, def: 4, hp: 20 }, description: "A gleaming gold ring.", value: 250,
};
export const ITEM_EMERALD_RING: RPGItem = {
  id: "emerald_ring", name: "Emerald Ring", type: "ring",
  stats: { def: 5, hp: 25, speed: 0.1 }, description: "Set with a verdant emerald.", value: 260,
};

// --- T4 ---
export const ITEM_DRAGON_RING: RPGItem = {
  id: "dragon_ring", name: "Dragon Ring", type: "ring",
  stats: { atk: 10, hp: 40 }, description: "Contains a dragon's fury.", value: 550,
};
export const ITEM_LICH_RING: RPGItem = {
  id: "lich_ring", name: "Lich Ring", type: "ring",
  stats: { atk: 6, mp: 30, def: 4 }, description: "Radiates undeath.", value: 520,
};

// --- T5 ---
export const ITEM_BAND_OF_ETERNITY: RPGItem = {
  id: "band_of_eternity", name: "Band of Eternity", type: "ring",
  stats: { atk: 10, def: 8, hp: 40, speed: 0.3 }, description: "Time bends around it.", value: 999,
};

// ===========================================================================
// Accessories — T1 to T5
// ===========================================================================

// --- T1 ---
export const ITEM_LUCKY_CHARM: RPGItem = {
  id: "lucky_charm", name: "Lucky Charm", type: "accessory",
  stats: { speed: 0.2 }, description: "Feels lucky to hold.", value: 25,
};
export const ITEM_HEALTH_AMULET: RPGItem = {
  id: "health_amulet", name: "Amulet of Vitality", type: "accessory",
  stats: { hp: 30 }, description: "Increases max HP by 30.", value: 80,
};

// --- T2 ---
export const ITEM_SPEED_RING: RPGItem = {
  id: "speed_ring", name: "Ring of Haste", type: "accessory",
  stats: { speed: 0.5 }, description: "Increases speed.", value: 100,
};
export const ITEM_WAR_PENDANT: RPGItem = {
  id: "war_pendant", name: "War Pendant", type: "accessory",
  stats: { atk: 5 }, description: "Stirs the blood for battle.", value: 110,
};
export const ITEM_IRON_TALISMAN: RPGItem = {
  id: "iron_talisman", name: "Iron Talisman", type: "accessory",
  stats: { def: 5 }, description: "Hardens the skin.", value: 100,
};

// --- T3 ---
export const ITEM_CRYSTAL_PENDANT: RPGItem = {
  id: "crystal_pendant", name: "Crystal Pendant", type: "accessory",
  stats: { atk: 3, def: 3, mp: 15 }, description: "A balanced mystical gem.", value: 250,
};
export const ITEM_BERSERKER_CHARM: RPGItem = {
  id: "berserker_charm", name: "Berserker Charm", type: "accessory",
  stats: { atk: 8, speed: 0.2, def: -2 }, description: "Power at the cost of defense.", value: 240,
};
export const ITEM_GUARDIAN_BROOCH: RPGItem = {
  id: "guardian_brooch", name: "Guardian Brooch", type: "accessory",
  stats: { def: 8, hp: 25 }, description: "Protects its wearer.", value: 260,
};

// --- T4 ---
export const ITEM_PHOENIX_FEATHER_ACC: RPGItem = {
  id: "phoenix_feather_acc", name: "Phoenix Feather", type: "accessory",
  stats: { hp: 60, mp: 20 }, description: "Radiates warmth and life.", value: 500,
};
export const ITEM_DEMON_FANG: RPGItem = {
  id: "demon_fang", name: "Demon Fang", type: "accessory",
  stats: { atk: 10, speed: 0.3 }, description: "Torn from a demon lord.", value: 520,
};
export const ITEM_HOLY_SYMBOL: RPGItem = {
  id: "holy_symbol", name: "Holy Symbol", type: "accessory",
  stats: { def: 10, hp: 40, mp: 15 }, description: "A relic of divine protection.", value: 540,
};

// --- T5 ---
export const ITEM_ORB_OF_DOMINION: RPGItem = {
  id: "orb_of_dominion", name: "Orb of Dominion", type: "accessory",
  stats: { atk: 10, def: 8, hp: 50, mp: 25 }, description: "Command all before you.", value: 999,
};
export const ITEM_COSMIC_PENDANT: RPGItem = {
  id: "cosmic_pendant", name: "Cosmic Pendant", type: "accessory",
  stats: { atk: 6, def: 6, hp: 30, mp: 30, speed: 0.3 }, description: "Contains a captured star.", value: 999,
};

// ===========================================================================
// All items registry
// ===========================================================================

export const ALL_RPG_ITEMS: Record<string, RPGItem> = {
  // Consumables
  health_potion: ITEM_HEALTH_POTION,
  greater_health_potion: ITEM_GREATER_HEALTH_POTION,
  mega_health_potion: ITEM_MEGA_HEALTH_POTION,
  full_restore: ITEM_FULL_RESTORE,
  mana_potion: ITEM_MANA_POTION,
  greater_mana_potion: ITEM_GREATER_MANA_POTION,
  elixir: ITEM_ELIXIR,
  grand_elixir: ITEM_GRAND_ELIXIR,
  antidote: ITEM_ANTIDOTE,
  fire_scroll: ITEM_FIRE_SCROLL,
  smoke_bomb: ITEM_SMOKE_BOMB,
  phoenix_down: ITEM_PHOENIX_DOWN,
  // Weapons
  rusty_dagger: ITEM_RUSTY_DAGGER,
  wooden_club: ITEM_WOODEN_CLUB,
  iron_sword: ITEM_IRON_SWORD,
  hunting_bow: ITEM_HUNTING_BOW,
  apprentice_wand: ITEM_APPRENTICE_WAND,
  steel_sword: ITEM_STEEL_SWORD,
  battle_hammer: ITEM_BATTLE_HAMMER,
  magic_staff: ITEM_MAGIC_STAFF,
  longbow: ITEM_LONGBOW,
  rapier: ITEM_RAPIER,
  war_axe: ITEM_WAR_AXE,
  flameblade: ITEM_FLAMEBLADE,
  frost_staff: ITEM_FROST_STAFF,
  composite_bow: ITEM_COMPOSITE_BOW,
  mithril_dagger: ITEM_MITHRIL_DAGGER,
  dragonslayer: ITEM_DRAGONSLAYER,
  archmage_staff: ITEM_ARCHMAGE_STAFF,
  voidcleaver: ITEM_VOIDCLEAVER,
  soulreaper: ITEM_SOULREAPER,
  excalibur: ITEM_EXCALIBUR,
  ragnarok: ITEM_RAGNAROK,
  staff_of_eternity: ITEM_STAFF_OF_ETERNITY,
  // Armor
  padded_vest: ITEM_PADDED_VEST,
  leather_armor: ITEM_LEATHER_ARMOR,
  scale_mail: ITEM_SCALE_MAIL,
  chainmail: ITEM_CHAINMAIL,
  brigandine: ITEM_BRIGANDINE,
  plate_armor: ITEM_PLATE_ARMOR,
  mage_robes: ITEM_MAGE_ROBES,
  dragonscale_armor: ITEM_DRAGONSCALE_ARMOR,
  shadow_cloak: ITEM_SHADOW_CLOAK,
  mythril_mail: ITEM_MYTHRIL_MAIL,
  divine_plate: ITEM_DIVINE_PLATE,
  // Helmets
  cloth_hood: ITEM_CLOTH_HOOD,
  leather_cap: ITEM_LEATHER_CAP,
  iron_helm: ITEM_IRON_HELM,
  steel_helm: ITEM_STEEL_HELM,
  wizard_hat: ITEM_WIZARD_HAT,
  great_helm: ITEM_GREAT_HELM,
  horned_helm: ITEM_HORNED_HELM,
  crown_of_thorns: ITEM_CROWN_OF_THORNS,
  dragon_crown: ITEM_DRAGON_CROWN,
  diadem_of_stars: ITEM_DIADEM_OF_STARS,
  helm_of_dominion: ITEM_HELM_OF_DOMINION,
  // Shields
  buckler: ITEM_BUCKLER,
  wooden_shield: ITEM_WOODEN_SHIELD,
  iron_shield: ITEM_IRON_SHIELD,
  steel_shield: ITEM_STEEL_SHIELD,
  tower_shield: ITEM_TOWER_SHIELD,
  spiked_shield: ITEM_SPIKED_SHIELD,
  aegis: ITEM_AEGIS,
  infernal_ward: ITEM_INFERNAL_WARD,
  mirror_shield: ITEM_MIRROR_SHIELD,
  // Legs
  linen_trousers: ITEM_LINEN_TROUSERS,
  cloth_pants: ITEM_CLOTH_PANTS,
  studded_leggings: ITEM_STUDDED_LEGGINGS,
  chain_leggings: ITEM_CHAIN_LEGGINGS,
  plate_greaves: ITEM_PLATE_GREAVES,
  enchanted_skirt: ITEM_ENCHANTED_SKIRT,
  dragon_tassets: ITEM_DRAGON_TASSETS,
  phantom_leggings: ITEM_PHANTOM_LEGGINGS,
  celestial_greaves: ITEM_CELESTIAL_GREAVES,
  // Boots
  sandals: ITEM_SANDALS,
  leather_boots: ITEM_LEATHER_BOOTS,
  steel_sabatons: ITEM_STEEL_SABATONS,
  ranger_boots: ITEM_RANGER_BOOTS,
  iron_greaves: ITEM_IRON_GREAVES,
  winged_boots: ITEM_WINGED_BOOTS,
  knights_greaves: ITEM_KNIGHTS_GREAVES,
  shadowstep_boots: ITEM_SHADOWSTEP_BOOTS,
  titan_stompers: ITEM_TITAN_STOMPERS,
  boots_of_the_wind: ITEM_BOOTS_OF_THE_WIND,
  // Rings
  bone_ring: ITEM_BONE_RING,
  copper_ring: ITEM_COPPER_RING,
  silver_ring: ITEM_SILVER_RING,
  ruby_ring: ITEM_RUBY_RING,
  sapphire_ring: ITEM_SAPPHIRE_RING,
  gold_ring: ITEM_GOLD_RING,
  emerald_ring: ITEM_EMERALD_RING,
  dragon_ring: ITEM_DRAGON_RING,
  lich_ring: ITEM_LICH_RING,
  band_of_eternity: ITEM_BAND_OF_ETERNITY,
  // Accessories
  lucky_charm: ITEM_LUCKY_CHARM,
  health_amulet: ITEM_HEALTH_AMULET,
  speed_ring: ITEM_SPEED_RING,
  war_pendant: ITEM_WAR_PENDANT,
  iron_talisman: ITEM_IRON_TALISMAN,
  crystal_pendant: ITEM_CRYSTAL_PENDANT,
  berserker_charm: ITEM_BERSERKER_CHARM,
  guardian_brooch: ITEM_GUARDIAN_BROOCH,
  phoenix_feather_acc: ITEM_PHOENIX_FEATHER_ACC,
  demon_fang: ITEM_DEMON_FANG,
  holy_symbol: ITEM_HOLY_SYMBOL,
  orb_of_dominion: ITEM_ORB_OF_DOMINION,
  cosmic_pendant: ITEM_COSMIC_PENDANT,
};

// ===========================================================================
// Shop inventories (T1–T3 only; T4/T5 are loot-only)
// ===========================================================================

export const STARTER_TOWN_SHOP: RPGItem[] = [
  // Consumables
  ITEM_HEALTH_POTION, ITEM_MANA_POTION, ITEM_ANTIDOTE, ITEM_SMOKE_BOMB,
  // Equipment T1
  ITEM_RUSTY_DAGGER, ITEM_IRON_SWORD, ITEM_HUNTING_BOW, ITEM_APPRENTICE_WAND,
  ITEM_PADDED_VEST, ITEM_LEATHER_ARMOR,
  ITEM_CLOTH_HOOD, ITEM_LEATHER_CAP,
  ITEM_BUCKLER, ITEM_WOODEN_SHIELD,
  ITEM_LINEN_TROUSERS, ITEM_CLOTH_PANTS,
  ITEM_SANDALS, ITEM_LEATHER_BOOTS,
  ITEM_BONE_RING, ITEM_COPPER_RING,
  ITEM_LUCKY_CHARM, ITEM_HEALTH_AMULET,
];

export const MID_TOWN_SHOP: RPGItem[] = [
  // Consumables
  ITEM_HEALTH_POTION, ITEM_GREATER_HEALTH_POTION, ITEM_MANA_POTION,
  ITEM_GREATER_MANA_POTION, ITEM_ELIXIR, ITEM_FIRE_SCROLL, ITEM_SMOKE_BOMB,
  // Equipment T2
  ITEM_STEEL_SWORD, ITEM_BATTLE_HAMMER, ITEM_MAGIC_STAFF, ITEM_LONGBOW, ITEM_RAPIER,
  ITEM_SCALE_MAIL, ITEM_CHAINMAIL, ITEM_BRIGANDINE,
  ITEM_IRON_HELM, ITEM_STEEL_HELM, ITEM_WIZARD_HAT,
  ITEM_IRON_SHIELD, ITEM_STEEL_SHIELD,
  ITEM_STUDDED_LEGGINGS, ITEM_CHAIN_LEGGINGS,
  ITEM_STEEL_SABATONS, ITEM_RANGER_BOOTS,
  ITEM_SILVER_RING, ITEM_RUBY_RING, ITEM_SAPPHIRE_RING,
  ITEM_SPEED_RING, ITEM_WAR_PENDANT, ITEM_IRON_TALISMAN,
];

export const LATE_TOWN_SHOP: RPGItem[] = [
  // Consumables
  ITEM_GREATER_HEALTH_POTION, ITEM_MEGA_HEALTH_POTION,
  ITEM_GREATER_MANA_POTION, ITEM_ELIXIR, ITEM_FIRE_SCROLL,
  ITEM_PHOENIX_DOWN, ITEM_SMOKE_BOMB,
  // Equipment T3
  ITEM_WAR_AXE, ITEM_FLAMEBLADE, ITEM_FROST_STAFF, ITEM_COMPOSITE_BOW, ITEM_MITHRIL_DAGGER,
  ITEM_PLATE_ARMOR, ITEM_MAGE_ROBES,
  ITEM_GREAT_HELM, ITEM_HORNED_HELM,
  ITEM_TOWER_SHIELD, ITEM_SPIKED_SHIELD,
  ITEM_PLATE_GREAVES, ITEM_ENCHANTED_SKIRT,
  ITEM_IRON_GREAVES, ITEM_WINGED_BOOTS, ITEM_KNIGHTS_GREAVES,
  ITEM_GOLD_RING, ITEM_EMERALD_RING,
  ITEM_CRYSTAL_PENDANT, ITEM_BERSERKER_CHARM, ITEM_GUARDIAN_BROOCH,
];
