// RPG item definitions
// Tier guide: T1=Common, T2=Uncommon, T3=Rare, T4=Epic (boss), T5=Legendary (hardest boss)
import { AbilityType } from "@/types";
import type { RPGItem } from "@rpg/state/RPGState";

// ===========================================================================
// Consumables
// ===========================================================================

export const ITEM_HERB: RPGItem = {
  id: "herb", name: "Herb", type: "consumable",
  stats: { hp: 20 }, description: "A common healing herb. Restores 20 HP.", value: 8,
};
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
export const ITEM_MINOR_MANA_POTION: RPGItem = {
  id: "minor_mana_potion", name: "Minor Mana Potion", type: "consumable",
  stats: { mp: 10 }, description: "Restores 10 MP.", value: 12,
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
export const ITEM_BANDAGE: RPGItem = {
  id: "bandage", name: "Bandage", type: "consumable",
  stats: { hp: 30 }, description: "A cloth bandage. Restores 30 HP.", value: 12,
};
export const ITEM_DRIED_MEAT: RPGItem = {
  id: "dried_meat", name: "Dried Meat", type: "consumable",
  stats: { hp: 40 }, description: "Preserved meat ration. Restores 40 HP.", value: 18,
};

// ===========================================================================
// Weapons — T1 to T5
// ===========================================================================

// --- T1: Common (atk 1–6) ---
export const ITEM_STICK: RPGItem = {
  id: "stick", name: "Stick", type: "weapon",
  stats: { atk: 1 }, description: "A sturdy branch. Barely a weapon.", value: 5,
};
export const ITEM_RUSTY_DAGGER: RPGItem = {
  id: "rusty_dagger", name: "Rusty Dagger", type: "weapon",
  stats: { atk: 2 }, description: "A worn-out dagger.", value: 15,
};
export const ITEM_WOODEN_CLUB: RPGItem = {
  id: "wooden_club", name: "Wooden Club", type: "weapon",
  stats: { atk: 3 }, description: "A crude wooden club.", value: 20,
};
export const ITEM_STONE_AXE: RPGItem = {
  id: "stone_axe", name: "Stone Axe", type: "weapon",
  stats: { atk: 3, speed: -0.1 }, description: "A chipped stone axe.", value: 18,
};
export const ITEM_BRONZE_DAGGER: RPGItem = {
  id: "bronze_dagger", name: "Bronze Dagger", type: "weapon",
  stats: { atk: 3, speed: 0.1 }, description: "A small bronze blade. Quick.", value: 25,
};
export const ITEM_SHORTBOW: RPGItem = {
  id: "shortbow", name: "Shortbow", type: "weapon",
  stats: { atk: 3 }, description: "A compact bow for beginners.", value: 22,
};
export const ITEM_HUNTING_BOW: RPGItem = {
  id: "hunting_bow", name: "Hunting Bow", type: "weapon",
  stats: { atk: 4, speed: 0.1 }, description: "A simple bow for hunting.", value: 45,
};
export const ITEM_IRON_DAGGER: RPGItem = {
  id: "iron_dagger", name: "Iron Dagger", type: "weapon",
  stats: { atk: 4, speed: 0.2 }, description: "Small but swift iron blade.", value: 35,
};
export const ITEM_APPRENTICE_WAND: RPGItem = {
  id: "apprentice_wand", name: "Apprentice Wand", type: "weapon",
  stats: { atk: 3, mp: 10 }, description: "A novice caster's wand.", value: 40,
};
export const ITEM_GNARLED_STAFF: RPGItem = {
  id: "gnarled_staff", name: "Gnarled Staff", type: "weapon",
  stats: { atk: 2, mp: 8, hp: 5 }, description: "A twisted wooden staff.", value: 30,
};
export const ITEM_IRON_SWORD: RPGItem = {
  id: "iron_sword", name: "Iron Sword", type: "weapon",
  stats: { atk: 5 }, description: "A sturdy iron blade.", value: 50,
};
export const ITEM_IRON_MACE: RPGItem = {
  id: "iron_mace", name: "Iron Mace", type: "weapon",
  stats: { atk: 5, def: 1 }, description: "A heavy iron mace.", value: 48,
};
export const ITEM_BRONZE_SWORD: RPGItem = {
  id: "bronze_sword", name: "Bronze Sword", type: "weapon",
  stats: { atk: 4 }, description: "A bronze short sword.", value: 38,
};
export const ITEM_IRON_SPEAR: RPGItem = {
  id: "iron_spear", name: "Iron Spear", type: "weapon",
  stats: { atk: 6, speed: -0.1 }, description: "A long iron-tipped spear.", value: 55,
};
export const ITEM_WORN_CUTLASS: RPGItem = {
  id: "worn_cutlass", name: "Worn Cutlass", type: "weapon",
  stats: { atk: 4, speed: 0.1 }, description: "A pirate's old cutlass.", value: 42,
};

// --- T2: Uncommon (atk 7–13) ---
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
export const ITEM_STEEL_MACE: RPGItem = {
  id: "steel_mace", name: "Steel Mace", type: "weapon",
  stats: { atk: 10, def: 2 }, description: "Flanged steel mace. Crushes armor.", value: 135,
};
export const ITEM_BROADAXE: RPGItem = {
  id: "broadaxe", name: "Broadaxe", type: "weapon",
  stats: { atk: 13, speed: -0.2 }, description: "Wide-bladed and devastating.", value: 155,
};
export const ITEM_CROSSBOW: RPGItem = {
  id: "crossbow", name: "Crossbow", type: "weapon",
  stats: { atk: 11, speed: -0.1 }, description: "Mechanical and powerful.", value: 145,
};
export const ITEM_SCIMITAR: RPGItem = {
  id: "scimitar", name: "Scimitar", type: "weapon",
  stats: { atk: 10, speed: 0.2 }, description: "A curved slashing blade.", value: 140,
};
export const ITEM_HALBERD: RPGItem = {
  id: "halberd", name: "Halberd", type: "weapon",
  stats: { atk: 12, def: 1, speed: -0.1 }, description: "Axe-spear hybrid. Versatile.", value: 160,
};
export const ITEM_ENCHANTED_BOW: RPGItem = {
  id: "enchanted_bow", name: "Enchanted Bow", type: "weapon",
  stats: { atk: 9, mp: 10 }, description: "A bow that hums with magic.", value: 150,
};
export const ITEM_OAK_STAFF: RPGItem = {
  id: "oak_staff", name: "Oak Staff", type: "weapon",
  stats: { atk: 7, mp: 18, hp: 10 }, description: "Sturdy druidic staff.", value: 125,
};
export const ITEM_TWIN_DAGGERS: RPGItem = {
  id: "twin_daggers", name: "Twin Daggers", type: "weapon",
  stats: { atk: 8, speed: 0.4 }, description: "A matched pair. Blindingly fast.", value: 165,
};
export const ITEM_BASTARD_SWORD: RPGItem = {
  id: "bastard_sword", name: "Bastard Sword", type: "weapon",
  stats: { atk: 11, hp: 5 }, description: "Hand-and-a-half sword.", value: 148,
};
export const ITEM_MORNING_STAR: RPGItem = {
  id: "morning_star", name: "Morning Star", type: "weapon",
  stats: { atk: 12, speed: -0.1 }, description: "Spiked ball on a chain.", value: 152,
};
export const ITEM_CRYSTAL_WAND: RPGItem = {
  id: "crystal_wand", name: "Crystal Wand", type: "weapon",
  stats: { atk: 7, mp: 20 }, description: "Focuses magical energy.", value: 135,
};

// --- T3: Rare (atk 14–20) ---
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
export const ITEM_THUNDER_SPEAR: RPGItem = {
  id: "thunder_spear", name: "Thunder Spear", type: "weapon",
  stats: { atk: 16, speed: 0.1 }, description: "Crackles with static.", value: 310,
};
export const ITEM_CLAYMORE: RPGItem = {
  id: "claymore", name: "Claymore", type: "weapon",
  stats: { atk: 19, speed: -0.2 }, description: "A massive two-handed blade.", value: 340,
};
export const ITEM_RUNIC_STAFF: RPGItem = {
  id: "runic_staff", name: "Runic Staff", type: "weapon",
  stats: { atk: 12, mp: 30, def: 2 }, description: "Carved with ancient runes.", value: 330,
};
export const ITEM_ASSASSIN_BLADE: RPGItem = {
  id: "assassin_blade", name: "Assassin's Blade", type: "weapon",
  stats: { atk: 15, speed: 0.3 }, description: "Silent and lethal.", value: 350,
};

// --- T4: Epic (boss drops, atk 20–28) ---
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

// --- T1 (def 1–4) ---
export const ITEM_TORN_SHIRT: RPGItem = {
  id: "torn_shirt", name: "Torn Shirt", type: "armor",
  stats: { def: 1 }, description: "Barely counts as armor.", value: 5,
};
export const ITEM_PADDED_VEST: RPGItem = {
  id: "padded_vest", name: "Padded Vest", type: "armor",
  stats: { def: 2 }, description: "Lightly padded cloth armor.", value: 20,
};
export const ITEM_HIDE_TUNIC: RPGItem = {
  id: "hide_tunic", name: "Hide Tunic", type: "armor",
  stats: { def: 3, hp: 5 }, description: "Rough animal hide tunic.", value: 28,
};
export const ITEM_LEATHER_ARMOR: RPGItem = {
  id: "leather_armor", name: "Leather Armor", type: "armor",
  stats: { def: 4 }, description: "Simple leather protection.", value: 40,
};
export const ITEM_TRAVELERS_CLOAK: RPGItem = {
  id: "travelers_cloak", name: "Traveler's Cloak", type: "armor",
  stats: { def: 2, speed: 0.1 }, description: "Light cloak for the road.", value: 30,
};
export const ITEM_ACOLYTE_ROBE: RPGItem = {
  id: "acolyte_robe", name: "Acolyte Robe", type: "armor",
  stats: { def: 1, mp: 8 }, description: "A student mage's robe.", value: 25,
};

// --- T2 (def 5–9) ---
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
export const ITEM_SPLINT_ARMOR: RPGItem = {
  id: "splint_armor", name: "Splint Armor", type: "armor",
  stats: { def: 7 }, description: "Metal strips riveted together.", value: 100,
};
export const ITEM_REINFORCED_LEATHER: RPGItem = {
  id: "reinforced_leather", name: "Reinforced Leather", type: "armor",
  stats: { def: 5, speed: 0.1 }, description: "Leather with steel studs.", value: 85,
};
export const ITEM_BATTLE_VEST: RPGItem = {
  id: "battle_vest", name: "Battle Vest", type: "armor",
  stats: { def: 5, atk: 2 }, description: "Designed for aggressive fighters.", value: 95,
};
export const ITEM_DRUIDS_GARB: RPGItem = {
  id: "druids_garb", name: "Druid's Garb", type: "armor",
  stats: { def: 4, mp: 12, hp: 10 }, description: "Woven with natural magic.", value: 105,
};
export const ITEM_SCOUTS_JACKET: RPGItem = {
  id: "scouts_jacket", name: "Scout's Jacket", type: "armor",
  stats: { def: 5, speed: 0.2 }, description: "Light armor for scouts.", value: 95,
};

// --- T3 (def 10–16) ---
export const ITEM_PLATE_ARMOR: RPGItem = {
  id: "plate_armor", name: "Plate Armor", type: "armor",
  stats: { def: 15, speed: -0.2 }, description: "Heavy plate. Slower but tough.", value: 300,
};
export const ITEM_MAGE_ROBES: RPGItem = {
  id: "mage_robes", name: "Mage Robes", type: "armor",
  stats: { def: 6, mp: 20, speed: 0.1 }, description: "Enchanted robes for casters.", value: 260,
};
export const ITEM_TEMPLAR_ARMOR: RPGItem = {
  id: "templar_armor", name: "Templar Armor", type: "armor",
  stats: { def: 12, hp: 15 }, description: "Holy warrior's armor.", value: 280,
};
export const ITEM_WARDEN_COAT: RPGItem = {
  id: "warden_coat", name: "Warden's Coat", type: "armor",
  stats: { def: 10, speed: 0.1, hp: 10 }, description: "Balanced protection for rangers.", value: 270,
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

// --- T1 (def 1–3) ---
export const ITEM_STRAW_HAT: RPGItem = {
  id: "straw_hat", name: "Straw Hat", type: "helmet",
  stats: { def: 1 }, description: "Keeps the sun out.", value: 5,
};
export const ITEM_CLOTH_HOOD: RPGItem = {
  id: "cloth_hood", name: "Cloth Hood", type: "helmet",
  stats: { def: 1, mp: 5 }, description: "A mage's cloth hood.", value: 15,
};
export const ITEM_LEATHER_CAP: RPGItem = {
  id: "leather_cap", name: "Leather Cap", type: "helmet",
  stats: { def: 2 }, description: "A simple leather cap.", value: 25,
};
export const ITEM_FUR_CAP: RPGItem = {
  id: "fur_cap", name: "Fur Cap", type: "helmet",
  stats: { def: 2, hp: 3 }, description: "Warm fur-lined cap.", value: 22,
};
export const ITEM_BRONZE_CIRCLET: RPGItem = {
  id: "bronze_circlet", name: "Bronze Circlet", type: "helmet",
  stats: { def: 1, mp: 5, speed: 0.1 }, description: "A thin bronze band.", value: 28,
};
export const ITEM_IRON_SKULLCAP: RPGItem = {
  id: "iron_skullcap", name: "Iron Skullcap", type: "helmet",
  stats: { def: 3 }, description: "Simple iron head cover.", value: 35,
};
export const ITEM_BANDIT_MASK: RPGItem = {
  id: "bandit_mask", name: "Bandit Mask", type: "helmet",
  stats: { def: 1, atk: 1, speed: 0.1 }, description: "A menacing face cover.", value: 30,
};

// --- T2 (def 4–7) ---
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
export const ITEM_CHAIN_COIF: RPGItem = {
  id: "chain_coif", name: "Chain Coif", type: "helmet",
  stats: { def: 4 }, description: "Chainmail head covering.", value: 70,
};
export const ITEM_SALLET: RPGItem = {
  id: "sallet", name: "Sallet", type: "helmet",
  stats: { def: 5, speed: 0.1 }, description: "Sleek helmet with visor.", value: 95,
};
export const ITEM_BARBUTE: RPGItem = {
  id: "barbute", name: "Barbute", type: "helmet",
  stats: { def: 6, speed: -0.1 }, description: "T-shaped visor helmet.", value: 90,
};
export const ITEM_DRUIDS_WREATH: RPGItem = {
  id: "druids_wreath", name: "Druid's Wreath", type: "helmet",
  stats: { def: 3, mp: 10, hp: 8 }, description: "Woven vine crown.", value: 85,
};
export const ITEM_ARCHERS_HOOD: RPGItem = {
  id: "archers_hood", name: "Archer's Hood", type: "helmet",
  stats: { def: 3, speed: 0.2 }, description: "Lightweight hood. No obstruction.", value: 80,
};
export const ITEM_SKULL_HELM: RPGItem = {
  id: "skull_helm", name: "Skull Helm", type: "helmet",
  stats: { def: 5, atk: 2 }, description: "Bone-decorated war helm.", value: 100,
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
export const ITEM_ARCANE_CROWN: RPGItem = {
  id: "arcane_crown", name: "Arcane Crown", type: "helmet",
  stats: { def: 5, mp: 20, atk: 2 }, description: "Crown of a battle mage.", value: 230,
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

// --- T1 (def 1–4) ---
export const ITEM_POT_LID: RPGItem = {
  id: "pot_lid", name: "Pot Lid", type: "shield",
  stats: { def: 1 }, description: "A kitchen pot lid. Desperate times.", value: 3,
};
export const ITEM_BUCKLER: RPGItem = {
  id: "buckler", name: "Buckler", type: "shield",
  stats: { def: 2, speed: 0.1 }, description: "A small, nimble shield.", value: 20,
};
export const ITEM_WOODEN_SHIELD: RPGItem = {
  id: "wooden_shield", name: "Wooden Shield", type: "shield",
  stats: { def: 3 }, description: "A basic wooden shield.", value: 30,
};
export const ITEM_HIDE_SHIELD: RPGItem = {
  id: "hide_shield", name: "Hide Shield", type: "shield",
  stats: { def: 3, hp: 3 }, description: "Stretched animal hide over wood.", value: 28,
};
export const ITEM_BRONZE_SHIELD: RPGItem = {
  id: "bronze_shield", name: "Bronze Shield", type: "shield",
  stats: { def: 4 }, description: "A round bronze shield.", value: 40,
};

// --- T2 (def 5–9) ---
export const ITEM_IRON_SHIELD: RPGItem = {
  id: "iron_shield", name: "Iron Shield", type: "shield",
  stats: { def: 7 }, description: "A solid iron shield.", value: 100,
};
export const ITEM_STEEL_SHIELD: RPGItem = {
  id: "steel_shield", name: "Steel Shield", type: "shield",
  stats: { def: 8 }, description: "Polished steel protection.", value: 120,
};
export const ITEM_KITE_SHIELD: RPGItem = {
  id: "kite_shield", name: "Kite Shield", type: "shield",
  stats: { def: 6, hp: 8 }, description: "Long shield covering the body.", value: 95,
};
export const ITEM_HEATER_SHIELD: RPGItem = {
  id: "heater_shield", name: "Heater Shield", type: "shield",
  stats: { def: 7, speed: 0.1 }, description: "Well-balanced knight's shield.", value: 110,
};
export const ITEM_ROUND_SHIELD: RPGItem = {
  id: "round_shield", name: "Round Shield", type: "shield",
  stats: { def: 5, speed: 0.2 }, description: "Light and easy to maneuver.", value: 85,
};
export const ITEM_SPIKED_BUCKLER: RPGItem = {
  id: "spiked_buckler", name: "Spiked Buckler", type: "shield",
  stats: { def: 4, atk: 2, speed: 0.1 }, description: "Small shield with a spike.", value: 90,
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
export const ITEM_WARDENS_SHIELD: RPGItem = {
  id: "wardens_shield", name: "Warden's Shield", type: "shield",
  stats: { def: 11, hp: 15 }, description: "Standard issue for elite guards.", value: 260,
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

// --- T1 (def 1–3) ---
export const ITEM_TORN_BREECHES: RPGItem = {
  id: "torn_breeches", name: "Torn Breeches", type: "legs",
  stats: { def: 1 }, description: "Barely held together.", value: 5,
};
export const ITEM_LINEN_TROUSERS: RPGItem = {
  id: "linen_trousers", name: "Linen Trousers", type: "legs",
  stats: { def: 1, speed: 0.1 }, description: "Light and comfortable.", value: 15,
};
export const ITEM_CLOTH_PANTS: RPGItem = {
  id: "cloth_pants", name: "Cloth Pants", type: "legs",
  stats: { def: 1 }, description: "Simple cloth legwear.", value: 20,
};
export const ITEM_HIDE_LEGGINGS: RPGItem = {
  id: "hide_leggings", name: "Hide Leggings", type: "legs",
  stats: { def: 2 }, description: "Rough animal hide leggings.", value: 22,
};
export const ITEM_LEATHER_CHAPS: RPGItem = {
  id: "leather_chaps", name: "Leather Chaps", type: "legs",
  stats: { def: 2, speed: 0.1 }, description: "Open-sided leather leg covers.", value: 28,
};
export const ITEM_PADDED_LEGGINGS: RPGItem = {
  id: "padded_leggings", name: "Padded Leggings", type: "legs",
  stats: { def: 3 }, description: "Thick padded cloth leggings.", value: 32,
};
export const ITEM_ACOLYTE_SKIRT: RPGItem = {
  id: "acolyte_skirt", name: "Acolyte Skirt", type: "legs",
  stats: { def: 1, mp: 5 }, description: "A novice mage's skirt.", value: 18,
};

// --- T2 (def 4–6) ---
export const ITEM_STUDDED_LEGGINGS: RPGItem = {
  id: "studded_leggings", name: "Studded Leggings", type: "legs",
  stats: { def: 4, atk: 1 }, description: "Leather with metal studs.", value: 80,
};
export const ITEM_CHAIN_LEGGINGS: RPGItem = {
  id: "chain_leggings", name: "Chain Leggings", type: "legs",
  stats: { def: 5 }, description: "Chainmail leg protection.", value: 90,
};
export const ITEM_IRON_TASSETS: RPGItem = {
  id: "iron_tassets", name: "Iron Tassets", type: "legs",
  stats: { def: 5, speed: -0.1 }, description: "Hanging iron plate strips.", value: 85,
};
export const ITEM_SCOUTS_TROUSERS: RPGItem = {
  id: "scouts_trousers", name: "Scout's Trousers", type: "legs",
  stats: { def: 3, speed: 0.2 }, description: "Light and flexible.", value: 80,
};
export const ITEM_BATTLEMAGE_KILT: RPGItem = {
  id: "battlemage_kilt", name: "Battlemage Kilt", type: "legs",
  stats: { def: 3, mp: 12 }, description: "Enchanted battle kilt.", value: 95,
};
export const ITEM_STEEL_LEGGINGS: RPGItem = {
  id: "steel_leggings", name: "Steel Leggings", type: "legs",
  stats: { def: 6 }, description: "Forged steel leg protection.", value: 100,
};
export const ITEM_REINFORCED_PANTS: RPGItem = {
  id: "reinforced_pants", name: "Reinforced Pants", type: "legs",
  stats: { def: 4, hp: 8 }, description: "Leather with metal knee plates.", value: 88,
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
export const ITEM_WARDENS_LEGGINGS: RPGItem = {
  id: "wardens_leggings", name: "Warden's Leggings", type: "legs",
  stats: { def: 8, speed: 0.1, hp: 10 }, description: "Elite guard leggings.", value: 240,
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
export const ITEM_BARE_WRAPS: RPGItem = {
  id: "bare_wraps", name: "Foot Wraps", type: "boots",
  stats: { speed: 0.1 }, description: "Strips of cloth around feet.", value: 5,
};
export const ITEM_SANDALS: RPGItem = {
  id: "sandals", name: "Sandals", type: "boots",
  stats: { speed: 0.1 }, description: "Light and breezy.", value: 15,
};
export const ITEM_HIDE_SHOES: RPGItem = {
  id: "hide_shoes", name: "Hide Shoes", type: "boots",
  stats: { def: 1 }, description: "Simple animal hide shoes.", value: 12,
};
export const ITEM_LEATHER_BOOTS: RPGItem = {
  id: "leather_boots", name: "Leather Boots", type: "boots",
  stats: { def: 2, speed: 0.2 }, description: "Sturdy leather boots.", value: 50,
};
export const ITEM_PADDED_SLIPPERS: RPGItem = {
  id: "padded_slippers", name: "Padded Slippers", type: "boots",
  stats: { mp: 5, speed: 0.1 }, description: "Soft slippers for mages.", value: 20,
};
export const ITEM_TRAVELERS_BOOTS: RPGItem = {
  id: "travelers_boots", name: "Traveler's Boots", type: "boots",
  stats: { def: 1, speed: 0.2 }, description: "Made for long roads.", value: 35,
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
export const ITEM_CHAIN_BOOTS: RPGItem = {
  id: "chain_boots", name: "Chain Boots", type: "boots",
  stats: { def: 3, speed: 0.1 }, description: "Chainmail foot covering.", value: 80,
};
export const ITEM_STUDDED_BOOTS: RPGItem = {
  id: "studded_boots", name: "Studded Boots", type: "boots",
  stats: { def: 3, atk: 1 }, description: "Steel-studded kicking boots.", value: 85,
};
export const ITEM_SPRINTERS_SHOES: RPGItem = {
  id: "sprinters_shoes", name: "Sprinter's Shoes", type: "boots",
  stats: { speed: 0.4 }, description: "Featherweight racing shoes.", value: 95,
};
export const ITEM_MAGES_SLIPPERS: RPGItem = {
  id: "mages_slippers", name: "Mage's Slippers", type: "boots",
  stats: { def: 1, mp: 10, speed: 0.1 }, description: "Enchanted comfortable slippers.", value: 90,
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
export const ITEM_WARDENS_BOOTS: RPGItem = {
  id: "wardens_boots", name: "Warden's Boots", type: "boots",
  stats: { def: 5, speed: 0.2, hp: 8 }, description: "Elite guard footwear.", value: 220,
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
export const ITEM_TWIG_RING: RPGItem = {
  id: "twig_ring", name: "Twig Ring", type: "ring",
  stats: { hp: 3 }, description: "A ring of woven twigs.", value: 5,
};
export const ITEM_BONE_RING: RPGItem = {
  id: "bone_ring", name: "Bone Ring", type: "ring",
  stats: { atk: 1, hp: 5 }, description: "Carved from monster bone.", value: 20,
};
export const ITEM_COPPER_RING: RPGItem = {
  id: "copper_ring", name: "Copper Ring", type: "ring",
  stats: { atk: 2 }, description: "A simple copper ring.", value: 30,
};
export const ITEM_IRON_BAND: RPGItem = {
  id: "iron_band", name: "Iron Band", type: "ring",
  stats: { def: 1, hp: 5 }, description: "A plain iron ring.", value: 22,
};
export const ITEM_CHARM_RING: RPGItem = {
  id: "charm_ring", name: "Charm Ring", type: "ring",
  stats: { mp: 5 }, description: "A ring with a small charm.", value: 18,
};
export const ITEM_SHELL_RING: RPGItem = {
  id: "shell_ring", name: "Shell Ring", type: "ring",
  stats: { def: 1, speed: 0.1 }, description: "Made from sea shell.", value: 15,
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
export const ITEM_JADE_RING: RPGItem = {
  id: "jade_ring", name: "Jade Ring", type: "ring",
  stats: { def: 3, hp: 10 }, description: "Cool green jade ring.", value: 105,
};
export const ITEM_ONYX_RING: RPGItem = {
  id: "onyx_ring", name: "Onyx Ring", type: "ring",
  stats: { atk: 3, speed: 0.2 }, description: "Dark and mysterious.", value: 115,
};
export const ITEM_OPAL_RING: RPGItem = {
  id: "opal_ring", name: "Opal Ring", type: "ring",
  stats: { def: 2, mp: 10, hp: 5 }, description: "Iridescent opal stone.", value: 108,
};
export const ITEM_GARNET_RING: RPGItem = {
  id: "garnet_ring", name: "Garnet Ring", type: "ring",
  stats: { atk: 5, hp: 5 }, description: "Deep red garnet stone.", value: 112,
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
export const ITEM_DIAMOND_RING: RPGItem = {
  id: "diamond_ring", name: "Diamond Ring", type: "ring",
  stats: { atk: 5, def: 5, speed: 0.1 }, description: "Perfectly cut diamond.", value: 280,
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
export const ITEM_WOODEN_CHARM: RPGItem = {
  id: "wooden_charm", name: "Wooden Charm", type: "accessory",
  stats: { hp: 10 }, description: "A carved wooden good-luck piece.", value: 12,
};
export const ITEM_RABBIT_FOOT: RPGItem = {
  id: "rabbit_foot", name: "Rabbit's Foot", type: "accessory",
  stats: { speed: 0.1, hp: 5 }, description: "Supposedly lucky.", value: 18,
};
export const ITEM_FEATHER_TOKEN: RPGItem = {
  id: "feather_token", name: "Feather Token", type: "accessory",
  stats: { speed: 0.15 }, description: "Light as a feather.", value: 20,
};
export const ITEM_STONE_PENDANT: RPGItem = {
  id: "stone_pendant", name: "Stone Pendant", type: "accessory",
  stats: { def: 2 }, description: "A heavy stone pendant.", value: 22,
};
export const ITEM_HERB_POUCH: RPGItem = {
  id: "herb_pouch", name: "Herb Pouch", type: "accessory",
  stats: { hp: 15, mp: 5 }, description: "Fragrant healing herbs.", value: 30,
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
export const ITEM_HEALERS_BROOCH: RPGItem = {
  id: "healers_brooch", name: "Healer's Brooch", type: "accessory",
  stats: { hp: 20, mp: 10 }, description: "Worn by field medics.", value: 95,
};
export const ITEM_WOLF_FANG: RPGItem = {
  id: "wolf_fang", name: "Wolf Fang", type: "accessory",
  stats: { atk: 3, speed: 0.2 }, description: "Fang of an alpha wolf.", value: 90,
};
export const ITEM_MANA_CRYSTAL: RPGItem = {
  id: "mana_crystal", name: "Mana Crystal", type: "accessory",
  stats: { mp: 20, atk: 1 }, description: "Glowing blue crystal.", value: 105,
};
export const ITEM_SILVER_LOCKET: RPGItem = {
  id: "silver_locket", name: "Silver Locket", type: "accessory",
  stats: { hp: 15, def: 3 }, description: "Contains a tiny portrait.", value: 100,
};
export const ITEM_SCOUTS_BADGE: RPGItem = {
  id: "scouts_badge", name: "Scout's Badge", type: "accessory",
  stats: { speed: 0.3, def: 2 }, description: "Mark of a trained scout.", value: 95,
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
export const ITEM_BATTLE_HORN: RPGItem = {
  id: "battle_horn", name: "Battle Horn", type: "accessory",
  stats: { atk: 5, def: 3, hp: 15 }, description: "Rallies nearby allies.", value: 270,
};
export const ITEM_ARCANE_FOCUS: RPGItem = {
  id: "arcane_focus", name: "Arcane Focus", type: "accessory",
  stats: { atk: 4, mp: 20 }, description: "Concentrates magical energy.", value: 255,
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
  herb: ITEM_HERB,
  health_potion: ITEM_HEALTH_POTION,
  greater_health_potion: ITEM_GREATER_HEALTH_POTION,
  mega_health_potion: ITEM_MEGA_HEALTH_POTION,
  full_restore: ITEM_FULL_RESTORE,
  minor_mana_potion: ITEM_MINOR_MANA_POTION,
  mana_potion: ITEM_MANA_POTION,
  greater_mana_potion: ITEM_GREATER_MANA_POTION,
  elixir: ITEM_ELIXIR,
  grand_elixir: ITEM_GRAND_ELIXIR,
  antidote: ITEM_ANTIDOTE,
  fire_scroll: ITEM_FIRE_SCROLL,
  smoke_bomb: ITEM_SMOKE_BOMB,
  phoenix_down: ITEM_PHOENIX_DOWN,
  bandage: ITEM_BANDAGE,
  dried_meat: ITEM_DRIED_MEAT,
  // Weapons T1
  stick: ITEM_STICK,
  rusty_dagger: ITEM_RUSTY_DAGGER,
  wooden_club: ITEM_WOODEN_CLUB,
  stone_axe: ITEM_STONE_AXE,
  bronze_dagger: ITEM_BRONZE_DAGGER,
  shortbow: ITEM_SHORTBOW,
  hunting_bow: ITEM_HUNTING_BOW,
  iron_dagger: ITEM_IRON_DAGGER,
  apprentice_wand: ITEM_APPRENTICE_WAND,
  gnarled_staff: ITEM_GNARLED_STAFF,
  iron_sword: ITEM_IRON_SWORD,
  iron_mace: ITEM_IRON_MACE,
  bronze_sword: ITEM_BRONZE_SWORD,
  iron_spear: ITEM_IRON_SPEAR,
  worn_cutlass: ITEM_WORN_CUTLASS,
  // Weapons T2
  steel_sword: ITEM_STEEL_SWORD,
  battle_hammer: ITEM_BATTLE_HAMMER,
  magic_staff: ITEM_MAGIC_STAFF,
  longbow: ITEM_LONGBOW,
  rapier: ITEM_RAPIER,
  steel_mace: ITEM_STEEL_MACE,
  broadaxe: ITEM_BROADAXE,
  crossbow: ITEM_CROSSBOW,
  scimitar: ITEM_SCIMITAR,
  halberd: ITEM_HALBERD,
  enchanted_bow: ITEM_ENCHANTED_BOW,
  oak_staff: ITEM_OAK_STAFF,
  twin_daggers: ITEM_TWIN_DAGGERS,
  bastard_sword: ITEM_BASTARD_SWORD,
  morning_star: ITEM_MORNING_STAR,
  crystal_wand: ITEM_CRYSTAL_WAND,
  // Weapons T3
  war_axe: ITEM_WAR_AXE,
  flameblade: ITEM_FLAMEBLADE,
  frost_staff: ITEM_FROST_STAFF,
  composite_bow: ITEM_COMPOSITE_BOW,
  mithril_dagger: ITEM_MITHRIL_DAGGER,
  thunder_spear: ITEM_THUNDER_SPEAR,
  claymore: ITEM_CLAYMORE,
  runic_staff: ITEM_RUNIC_STAFF,
  assassin_blade: ITEM_ASSASSIN_BLADE,
  // Weapons T4–T5
  dragonslayer: ITEM_DRAGONSLAYER,
  archmage_staff: ITEM_ARCHMAGE_STAFF,
  voidcleaver: ITEM_VOIDCLEAVER,
  soulreaper: ITEM_SOULREAPER,
  excalibur: ITEM_EXCALIBUR,
  ragnarok: ITEM_RAGNAROK,
  staff_of_eternity: ITEM_STAFF_OF_ETERNITY,
  // Armor
  torn_shirt: ITEM_TORN_SHIRT,
  padded_vest: ITEM_PADDED_VEST,
  hide_tunic: ITEM_HIDE_TUNIC,
  leather_armor: ITEM_LEATHER_ARMOR,
  travelers_cloak: ITEM_TRAVELERS_CLOAK,
  acolyte_robe: ITEM_ACOLYTE_ROBE,
  scale_mail: ITEM_SCALE_MAIL,
  chainmail: ITEM_CHAINMAIL,
  brigandine: ITEM_BRIGANDINE,
  splint_armor: ITEM_SPLINT_ARMOR,
  reinforced_leather: ITEM_REINFORCED_LEATHER,
  battle_vest: ITEM_BATTLE_VEST,
  druids_garb: ITEM_DRUIDS_GARB,
  scouts_jacket: ITEM_SCOUTS_JACKET,
  plate_armor: ITEM_PLATE_ARMOR,
  mage_robes: ITEM_MAGE_ROBES,
  templar_armor: ITEM_TEMPLAR_ARMOR,
  warden_coat: ITEM_WARDEN_COAT,
  dragonscale_armor: ITEM_DRAGONSCALE_ARMOR,
  shadow_cloak: ITEM_SHADOW_CLOAK,
  mythril_mail: ITEM_MYTHRIL_MAIL,
  divine_plate: ITEM_DIVINE_PLATE,
  // Helmets
  straw_hat: ITEM_STRAW_HAT,
  cloth_hood: ITEM_CLOTH_HOOD,
  leather_cap: ITEM_LEATHER_CAP,
  fur_cap: ITEM_FUR_CAP,
  bronze_circlet: ITEM_BRONZE_CIRCLET,
  iron_skullcap: ITEM_IRON_SKULLCAP,
  bandit_mask: ITEM_BANDIT_MASK,
  iron_helm: ITEM_IRON_HELM,
  steel_helm: ITEM_STEEL_HELM,
  wizard_hat: ITEM_WIZARD_HAT,
  chain_coif: ITEM_CHAIN_COIF,
  sallet: ITEM_SALLET,
  barbute: ITEM_BARBUTE,
  druids_wreath: ITEM_DRUIDS_WREATH,
  archers_hood: ITEM_ARCHERS_HOOD,
  skull_helm: ITEM_SKULL_HELM,
  great_helm: ITEM_GREAT_HELM,
  horned_helm: ITEM_HORNED_HELM,
  arcane_crown: ITEM_ARCANE_CROWN,
  crown_of_thorns: ITEM_CROWN_OF_THORNS,
  dragon_crown: ITEM_DRAGON_CROWN,
  diadem_of_stars: ITEM_DIADEM_OF_STARS,
  helm_of_dominion: ITEM_HELM_OF_DOMINION,
  // Shields
  pot_lid: ITEM_POT_LID,
  buckler: ITEM_BUCKLER,
  wooden_shield: ITEM_WOODEN_SHIELD,
  hide_shield: ITEM_HIDE_SHIELD,
  bronze_shield: ITEM_BRONZE_SHIELD,
  iron_shield: ITEM_IRON_SHIELD,
  steel_shield: ITEM_STEEL_SHIELD,
  kite_shield: ITEM_KITE_SHIELD,
  heater_shield: ITEM_HEATER_SHIELD,
  round_shield: ITEM_ROUND_SHIELD,
  spiked_buckler: ITEM_SPIKED_BUCKLER,
  tower_shield: ITEM_TOWER_SHIELD,
  spiked_shield: ITEM_SPIKED_SHIELD,
  wardens_shield: ITEM_WARDENS_SHIELD,
  aegis: ITEM_AEGIS,
  infernal_ward: ITEM_INFERNAL_WARD,
  mirror_shield: ITEM_MIRROR_SHIELD,
  // Legs
  torn_breeches: ITEM_TORN_BREECHES,
  linen_trousers: ITEM_LINEN_TROUSERS,
  cloth_pants: ITEM_CLOTH_PANTS,
  hide_leggings: ITEM_HIDE_LEGGINGS,
  leather_chaps: ITEM_LEATHER_CHAPS,
  padded_leggings: ITEM_PADDED_LEGGINGS,
  acolyte_skirt: ITEM_ACOLYTE_SKIRT,
  studded_leggings: ITEM_STUDDED_LEGGINGS,
  chain_leggings: ITEM_CHAIN_LEGGINGS,
  iron_tassets: ITEM_IRON_TASSETS,
  scouts_trousers: ITEM_SCOUTS_TROUSERS,
  battlemage_kilt: ITEM_BATTLEMAGE_KILT,
  steel_leggings: ITEM_STEEL_LEGGINGS,
  reinforced_pants: ITEM_REINFORCED_PANTS,
  plate_greaves: ITEM_PLATE_GREAVES,
  enchanted_skirt: ITEM_ENCHANTED_SKIRT,
  wardens_leggings: ITEM_WARDENS_LEGGINGS,
  dragon_tassets: ITEM_DRAGON_TASSETS,
  phantom_leggings: ITEM_PHANTOM_LEGGINGS,
  celestial_greaves: ITEM_CELESTIAL_GREAVES,
  // Boots
  bare_wraps: ITEM_BARE_WRAPS,
  sandals: ITEM_SANDALS,
  hide_shoes: ITEM_HIDE_SHOES,
  leather_boots: ITEM_LEATHER_BOOTS,
  padded_slippers: ITEM_PADDED_SLIPPERS,
  travelers_boots: ITEM_TRAVELERS_BOOTS,
  steel_sabatons: ITEM_STEEL_SABATONS,
  ranger_boots: ITEM_RANGER_BOOTS,
  chain_boots: ITEM_CHAIN_BOOTS,
  studded_boots: ITEM_STUDDED_BOOTS,
  sprinters_shoes: ITEM_SPRINTERS_SHOES,
  mages_slippers: ITEM_MAGES_SLIPPERS,
  iron_greaves: ITEM_IRON_GREAVES,
  winged_boots: ITEM_WINGED_BOOTS,
  knights_greaves: ITEM_KNIGHTS_GREAVES,
  wardens_boots: ITEM_WARDENS_BOOTS,
  shadowstep_boots: ITEM_SHADOWSTEP_BOOTS,
  titan_stompers: ITEM_TITAN_STOMPERS,
  boots_of_the_wind: ITEM_BOOTS_OF_THE_WIND,
  // Rings
  twig_ring: ITEM_TWIG_RING,
  bone_ring: ITEM_BONE_RING,
  copper_ring: ITEM_COPPER_RING,
  iron_band: ITEM_IRON_BAND,
  charm_ring: ITEM_CHARM_RING,
  shell_ring: ITEM_SHELL_RING,
  silver_ring: ITEM_SILVER_RING,
  ruby_ring: ITEM_RUBY_RING,
  sapphire_ring: ITEM_SAPPHIRE_RING,
  jade_ring: ITEM_JADE_RING,
  onyx_ring: ITEM_ONYX_RING,
  opal_ring: ITEM_OPAL_RING,
  garnet_ring: ITEM_GARNET_RING,
  gold_ring: ITEM_GOLD_RING,
  emerald_ring: ITEM_EMERALD_RING,
  diamond_ring: ITEM_DIAMOND_RING,
  dragon_ring: ITEM_DRAGON_RING,
  lich_ring: ITEM_LICH_RING,
  band_of_eternity: ITEM_BAND_OF_ETERNITY,
  // Accessories
  lucky_charm: ITEM_LUCKY_CHARM,
  health_amulet: ITEM_HEALTH_AMULET,
  wooden_charm: ITEM_WOODEN_CHARM,
  rabbit_foot: ITEM_RABBIT_FOOT,
  feather_token: ITEM_FEATHER_TOKEN,
  stone_pendant: ITEM_STONE_PENDANT,
  herb_pouch: ITEM_HERB_POUCH,
  speed_ring: ITEM_SPEED_RING,
  war_pendant: ITEM_WAR_PENDANT,
  iron_talisman: ITEM_IRON_TALISMAN,
  healers_brooch: ITEM_HEALERS_BROOCH,
  wolf_fang: ITEM_WOLF_FANG,
  mana_crystal: ITEM_MANA_CRYSTAL,
  silver_locket: ITEM_SILVER_LOCKET,
  scouts_badge: ITEM_SCOUTS_BADGE,
  crystal_pendant: ITEM_CRYSTAL_PENDANT,
  berserker_charm: ITEM_BERSERKER_CHARM,
  guardian_brooch: ITEM_GUARDIAN_BROOCH,
  battle_horn: ITEM_BATTLE_HORN,
  arcane_focus: ITEM_ARCANE_FOCUS,
  phoenix_feather_acc: ITEM_PHOENIX_FEATHER_ACC,
  demon_fang: ITEM_DEMON_FANG,
  holy_symbol: ITEM_HOLY_SYMBOL,
  orb_of_dominion: ITEM_ORB_OF_DOMINION,
  cosmic_pendant: ITEM_COSMIC_PENDANT,
};

// ===========================================================================
// Shop pool system — random 15-item selection per visit, refreshes every 20 steps
// ===========================================================================

export type ShopTier = "starter" | "mid" | "late";

/** Pool definition: common items always available, rare items appear occasionally. */
export interface ShopPool {
  consumables: RPGItem[];
  common: RPGItem[];
  rare: RPGItem[];
}

const STARTER_POOL: ShopPool = {
  consumables: [
    ITEM_HERB, ITEM_BANDAGE, ITEM_HEALTH_POTION, ITEM_MINOR_MANA_POTION,
    ITEM_MANA_POTION, ITEM_ANTIDOTE, ITEM_SMOKE_BOMB, ITEM_DRIED_MEAT,
  ],
  common: [
    // Weapons T1
    ITEM_RUSTY_DAGGER, ITEM_WOODEN_CLUB, ITEM_STONE_AXE, ITEM_BRONZE_DAGGER,
    ITEM_SHORTBOW, ITEM_IRON_DAGGER, ITEM_APPRENTICE_WAND, ITEM_GNARLED_STAFF,
    ITEM_IRON_SWORD, ITEM_IRON_MACE, ITEM_BRONZE_SWORD, ITEM_HUNTING_BOW,
    ITEM_WORN_CUTLASS, ITEM_IRON_SPEAR,
    // Armor T1
    ITEM_PADDED_VEST, ITEM_HIDE_TUNIC, ITEM_LEATHER_ARMOR, ITEM_TRAVELERS_CLOAK,
    ITEM_ACOLYTE_ROBE,
    // Helmets T1
    ITEM_CLOTH_HOOD, ITEM_LEATHER_CAP, ITEM_FUR_CAP, ITEM_BRONZE_CIRCLET,
    ITEM_IRON_SKULLCAP, ITEM_BANDIT_MASK,
    // Shields T1
    ITEM_BUCKLER, ITEM_WOODEN_SHIELD, ITEM_HIDE_SHIELD, ITEM_BRONZE_SHIELD,
    // Legs T1
    ITEM_LINEN_TROUSERS, ITEM_CLOTH_PANTS, ITEM_HIDE_LEGGINGS, ITEM_LEATHER_CHAPS,
    ITEM_PADDED_LEGGINGS, ITEM_ACOLYTE_SKIRT,
    // Boots T1
    ITEM_SANDALS, ITEM_HIDE_SHOES, ITEM_LEATHER_BOOTS, ITEM_PADDED_SLIPPERS,
    ITEM_TRAVELERS_BOOTS,
    // Rings T1
    ITEM_TWIG_RING, ITEM_BONE_RING, ITEM_COPPER_RING, ITEM_IRON_BAND,
    ITEM_CHARM_RING, ITEM_SHELL_RING,
    // Accessories T1
    ITEM_WOODEN_CHARM, ITEM_RABBIT_FOOT, ITEM_FEATHER_TOKEN, ITEM_STONE_PENDANT,
    ITEM_HERB_POUCH, ITEM_LUCKY_CHARM, ITEM_HEALTH_AMULET,
  ],
  rare: [
    // T2 items — rare in starter shops
    ITEM_STEEL_SWORD, ITEM_RAPIER, ITEM_MAGIC_STAFF, ITEM_LONGBOW,
    ITEM_CHAINMAIL, ITEM_SCALE_MAIL, ITEM_REINFORCED_LEATHER,
    ITEM_IRON_HELM, ITEM_STEEL_HELM, ITEM_IRON_SHIELD, ITEM_STEEL_SHIELD,
    ITEM_CHAIN_LEGGINGS, ITEM_STUDDED_LEGGINGS,
    ITEM_RANGER_BOOTS, ITEM_CHAIN_BOOTS,
    ITEM_SILVER_RING, ITEM_RUBY_RING,
    ITEM_SPEED_RING, ITEM_WAR_PENDANT,
  ],
};

const MID_POOL: ShopPool = {
  consumables: [
    ITEM_HEALTH_POTION, ITEM_GREATER_HEALTH_POTION, ITEM_MANA_POTION,
    ITEM_GREATER_MANA_POTION, ITEM_ELIXIR, ITEM_FIRE_SCROLL, ITEM_SMOKE_BOMB,
    ITEM_DRIED_MEAT, ITEM_ANTIDOTE,
  ],
  common: [
    // Weapons T2
    ITEM_STEEL_SWORD, ITEM_BATTLE_HAMMER, ITEM_MAGIC_STAFF, ITEM_LONGBOW,
    ITEM_RAPIER, ITEM_STEEL_MACE, ITEM_BROADAXE, ITEM_CROSSBOW, ITEM_SCIMITAR,
    ITEM_HALBERD, ITEM_ENCHANTED_BOW, ITEM_OAK_STAFF, ITEM_TWIN_DAGGERS,
    ITEM_BASTARD_SWORD, ITEM_MORNING_STAR, ITEM_CRYSTAL_WAND,
    // Armor T2
    ITEM_SCALE_MAIL, ITEM_CHAINMAIL, ITEM_BRIGANDINE, ITEM_SPLINT_ARMOR,
    ITEM_REINFORCED_LEATHER, ITEM_BATTLE_VEST, ITEM_DRUIDS_GARB, ITEM_SCOUTS_JACKET,
    // Helmets T2
    ITEM_IRON_HELM, ITEM_STEEL_HELM, ITEM_WIZARD_HAT, ITEM_CHAIN_COIF,
    ITEM_SALLET, ITEM_BARBUTE, ITEM_DRUIDS_WREATH, ITEM_ARCHERS_HOOD, ITEM_SKULL_HELM,
    // Shields T2
    ITEM_IRON_SHIELD, ITEM_STEEL_SHIELD, ITEM_KITE_SHIELD, ITEM_HEATER_SHIELD,
    ITEM_ROUND_SHIELD, ITEM_SPIKED_BUCKLER,
    // Legs T2
    ITEM_STUDDED_LEGGINGS, ITEM_CHAIN_LEGGINGS, ITEM_IRON_TASSETS,
    ITEM_SCOUTS_TROUSERS, ITEM_BATTLEMAGE_KILT, ITEM_STEEL_LEGGINGS,
    ITEM_REINFORCED_PANTS,
    // Boots T2
    ITEM_STEEL_SABATONS, ITEM_RANGER_BOOTS, ITEM_CHAIN_BOOTS, ITEM_STUDDED_BOOTS,
    ITEM_SPRINTERS_SHOES, ITEM_MAGES_SLIPPERS,
    // Rings T2
    ITEM_SILVER_RING, ITEM_RUBY_RING, ITEM_SAPPHIRE_RING, ITEM_JADE_RING,
    ITEM_ONYX_RING, ITEM_OPAL_RING, ITEM_GARNET_RING,
    // Accessories T2
    ITEM_SPEED_RING, ITEM_WAR_PENDANT, ITEM_IRON_TALISMAN, ITEM_HEALERS_BROOCH,
    ITEM_WOLF_FANG, ITEM_MANA_CRYSTAL, ITEM_SILVER_LOCKET, ITEM_SCOUTS_BADGE,
  ],
  rare: [
    // T3 items — rare in mid shops
    ITEM_WAR_AXE, ITEM_FLAMEBLADE, ITEM_FROST_STAFF, ITEM_COMPOSITE_BOW,
    ITEM_MITHRIL_DAGGER, ITEM_CLAYMORE, ITEM_ASSASSIN_BLADE,
    ITEM_PLATE_ARMOR, ITEM_MAGE_ROBES, ITEM_TEMPLAR_ARMOR,
    ITEM_GREAT_HELM, ITEM_HORNED_HELM, ITEM_ARCANE_CROWN,
    ITEM_TOWER_SHIELD, ITEM_SPIKED_SHIELD,
    ITEM_PLATE_GREAVES, ITEM_ENCHANTED_SKIRT,
    ITEM_WINGED_BOOTS, ITEM_KNIGHTS_GREAVES,
    ITEM_GOLD_RING, ITEM_EMERALD_RING, ITEM_DIAMOND_RING,
    ITEM_CRYSTAL_PENDANT, ITEM_GUARDIAN_BROOCH, ITEM_BERSERKER_CHARM,
  ],
};

const LATE_POOL: ShopPool = {
  consumables: [
    ITEM_GREATER_HEALTH_POTION, ITEM_MEGA_HEALTH_POTION,
    ITEM_GREATER_MANA_POTION, ITEM_ELIXIR, ITEM_FIRE_SCROLL,
    ITEM_PHOENIX_DOWN, ITEM_SMOKE_BOMB,
  ],
  common: [
    // Weapons T3
    ITEM_WAR_AXE, ITEM_FLAMEBLADE, ITEM_FROST_STAFF, ITEM_COMPOSITE_BOW,
    ITEM_MITHRIL_DAGGER, ITEM_THUNDER_SPEAR, ITEM_CLAYMORE, ITEM_RUNIC_STAFF,
    ITEM_ASSASSIN_BLADE,
    // Armor T3
    ITEM_PLATE_ARMOR, ITEM_MAGE_ROBES, ITEM_TEMPLAR_ARMOR, ITEM_WARDEN_COAT,
    // Helmets T3
    ITEM_GREAT_HELM, ITEM_HORNED_HELM, ITEM_ARCANE_CROWN,
    // Shields T3
    ITEM_TOWER_SHIELD, ITEM_SPIKED_SHIELD, ITEM_WARDENS_SHIELD,
    // Legs T3
    ITEM_PLATE_GREAVES, ITEM_ENCHANTED_SKIRT, ITEM_WARDENS_LEGGINGS,
    // Boots T3
    ITEM_IRON_GREAVES, ITEM_WINGED_BOOTS, ITEM_KNIGHTS_GREAVES, ITEM_WARDENS_BOOTS,
    // Rings T3
    ITEM_GOLD_RING, ITEM_EMERALD_RING, ITEM_DIAMOND_RING,
    // Accessories T3
    ITEM_CRYSTAL_PENDANT, ITEM_BERSERKER_CHARM, ITEM_GUARDIAN_BROOCH,
    ITEM_BATTLE_HORN, ITEM_ARCANE_FOCUS,
  ],
  rare: [],
};

export const SHOP_POOLS: Record<ShopTier, ShopPool> = {
  starter: STARTER_POOL,
  mid: MID_POOL,
  late: LATE_POOL,
};

const SHOP_MAX_ITEMS = 15;
const SHOP_CONSUMABLE_SLOTS = 4;
const SHOP_RARE_CHANCE = 0.15;

/**
 * Generate a shop inventory of up to 15 items from a pool using a seed.
 * Always includes some consumables. Rare items appear ~15% of the time.
 */
export function generateShopInventory(tier: ShopTier, seed: number): RPGItem[] {
  // Simple seeded RNG (mulberry32)
  let s = seed | 0;
  function next(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const pool = SHOP_POOLS[tier];
  const result: RPGItem[] = [];
  const usedIds = new Set<string>();

  // Pick consumables first (always 4)
  const shuffledCons = [...pool.consumables];
  for (let i = shuffledCons.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [shuffledCons[i], shuffledCons[j]] = [shuffledCons[j], shuffledCons[i]];
  }
  for (let i = 0; i < Math.min(SHOP_CONSUMABLE_SLOTS, shuffledCons.length); i++) {
    result.push(shuffledCons[i]);
    usedIds.add(shuffledCons[i].id);
  }

  // Fill remaining slots from common + rare pools
  const equipSlots = SHOP_MAX_ITEMS - result.length;
  for (let i = 0; i < equipSlots; i++) {
    const useRare = pool.rare.length > 0 && next() < SHOP_RARE_CHANCE;
    const source = useRare ? pool.rare : pool.common;

    // Pick a random item not already in the shop
    let attempts = 0;
    let item: RPGItem | null = null;
    while (attempts < 20) {
      const candidate = source[Math.floor(next() * source.length)];
      if (!usedIds.has(candidate.id)) {
        item = candidate;
        break;
      }
      attempts++;
    }
    // Fallback: try common pool if rare failed
    if (!item && useRare) {
      for (let a = 0; a < 20; a++) {
        const candidate = pool.common[Math.floor(next() * pool.common.length)];
        if (!usedIds.has(candidate.id)) {
          item = candidate;
          break;
        }
      }
    }

    if (item) {
      result.push(item);
      usedIds.add(item.id);
    }
  }

  return result;
}
