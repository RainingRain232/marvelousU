// ---------------------------------------------------------------------------
// Tekken mode – Character customization / cosmetic skins
// Weapon and armor skin definitions per character
// ---------------------------------------------------------------------------

export type TekkenSkinSlot = "weapon" | "armor" | "helmet" | "accessory";

export interface TekkenSkinDef {
  id: string;
  characterId: string;
  slot: TekkenSkinSlot;
  name: string;
  description: string;
  /** Color overrides applied to the character model */
  colorOverrides: {
    primary?: number;
    secondary?: number;
    accent?: number;
  };
  /** Whether the skin is unlocked by default */
  defaultUnlocked: boolean;
  /** Unlock condition description (for display) */
  unlockCondition?: string;
}

export const TEKKEN_SKINS: TekkenSkinDef[] = [
  // ── Knight ──────────────────────────────────────────────────────────────
  { id: "knight_default_weapon",  characterId: "knight", slot: "weapon",    name: "Iron Longsword",       description: "Standard-issue knightly blade.",        colorOverrides: {},                                    defaultUnlocked: true },
  { id: "knight_flame_sword",     characterId: "knight", slot: "weapon",    name: "Flamberge",            description: "A wavy blade that glows like embers.",   colorOverrides: { accent: 0xff4400 },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Knight" },
  { id: "knight_frost_sword",     characterId: "knight", slot: "weapon",    name: "Frostbrand",           description: "A blade forged in glacial ice.",         colorOverrides: { accent: 0x44aaff },                  defaultUnlocked: false, unlockCondition: "Complete Arcade mode as Knight" },
  { id: "knight_gold_armor",      characterId: "knight", slot: "armor",     name: "Golden Plate",         description: "Ornate ceremonial armor.",               colorOverrides: { primary: 0xddaa22, secondary: 0xffcc44 }, defaultUnlocked: false, unlockCondition: "Reach Gold rank" },
  { id: "knight_dark_armor",      characterId: "knight", slot: "armor",     name: "Shadow Plate",         description: "Armor steeped in darkness.",             colorOverrides: { primary: 0x222222, secondary: 0x333344 }, defaultUnlocked: false, unlockCondition: "Win 25 matches as Knight" },
  { id: "knight_crown",           characterId: "knight", slot: "helmet",    name: "Champion's Crown",     description: "A crown of the tournament victor.",      colorOverrides: { accent: 0xffdd00 },                  defaultUnlocked: false, unlockCondition: "Win a tournament" },

  // ── Berserker ───────────────────────────────────────────────────────────
  { id: "berserker_default_weapon", characterId: "berserker", slot: "weapon",  name: "Spiked Gauntlets",    description: "Iron-studded brawler's fists.",          colorOverrides: {},                                    defaultUnlocked: true },
  { id: "berserker_blood_fists",    characterId: "berserker", slot: "weapon",  name: "Bloodsteel Knuckles", description: "Gauntlets stained crimson.",             colorOverrides: { accent: 0xcc0000 },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Berserker" },
  { id: "berserker_war_paint",      characterId: "berserker", slot: "armor",   name: "War Paint",           description: "Tribal markings of the northern clans.", colorOverrides: { primary: 0x661111, secondary: 0x110000 }, defaultUnlocked: false, unlockCondition: "Complete Arcade mode as Berserker" },
  { id: "berserker_bone_armor",     characterId: "berserker", slot: "armor",   name: "Bone Harness",        description: "Armor made from beast bones.",           colorOverrides: { primary: 0xccbb99, secondary: 0x998866 }, defaultUnlocked: false, unlockCondition: "Win 25 matches as Berserker" },

  // ── Monk ────────────────────────────────────────────────────────────────
  { id: "monk_default_weapon",     characterId: "monk", slot: "weapon",   name: "Wrapped Fists",         description: "Simple cloth hand wraps.",               colorOverrides: {},                                    defaultUnlocked: true },
  { id: "monk_jade_fists",         characterId: "monk", slot: "weapon",   name: "Jade Palm Guards",      description: "Blessed jade bracers.",                  colorOverrides: { accent: 0x44cc66 },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Monk" },
  { id: "monk_golden_robes",       characterId: "monk", slot: "armor",    name: "Golden Vestments",      description: "Ceremonial temple garments.",             colorOverrides: { primary: 0xddaa00, secondary: 0xcc8800 }, defaultUnlocked: false, unlockCondition: "Complete Arcade mode as Monk" },

  // ── Paladin ─────────────────────────────────────────────────────────────
  { id: "paladin_default_weapon",  characterId: "paladin", slot: "weapon",  name: "Holy Mace",            description: "A blessed flanged mace.",                colorOverrides: {},                                    defaultUnlocked: true },
  { id: "paladin_radiant_mace",    characterId: "paladin", slot: "weapon",  name: "Radiant Scepter",      description: "A mace wreathed in divine light.",       colorOverrides: { accent: 0xffffaa },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Paladin" },
  { id: "paladin_dark_crusader",   characterId: "paladin", slot: "armor",   name: "Dark Crusader Plate",  description: "Armor from a forgotten crusade.",        colorOverrides: { primary: 0x333344, secondary: 0x222233 }, defaultUnlocked: false, unlockCondition: "Complete Arcade mode as Paladin" },

  // ── Assassin ────────────────────────────────────────────────────────────
  { id: "assassin_default_weapon", characterId: "assassin", slot: "weapon",  name: "Shadow Daggers",       description: "Twin blackened blades.",                 colorOverrides: {},                                    defaultUnlocked: true },
  { id: "assassin_venom_blades",   characterId: "assassin", slot: "weapon",  name: "Venomfang Daggers",    description: "Blades dripping with green venom.",      colorOverrides: { accent: 0x44ff22 },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Assassin" },
  { id: "assassin_phantom_cloak",  characterId: "assassin", slot: "armor",   name: "Phantom Cloak",        description: "A cloak that shimmers with shadow.",     colorOverrides: { primary: 0x220044, secondary: 0x110022 }, defaultUnlocked: false, unlockCondition: "Complete Arcade mode as Assassin" },

  // ── Warlord ─────────────────────────────────────────────────────────────
  { id: "warlord_default_weapon",  characterId: "warlord", slot: "weapon",   name: "Battle Axe",           description: "A heavy double-headed axe.",             colorOverrides: {},                                    defaultUnlocked: true },
  { id: "warlord_molten_axe",      characterId: "warlord", slot: "weapon",   name: "Molten Cleaver",       description: "An axe forged in volcanic fire.",        colorOverrides: { accent: 0xff6600 },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Warlord" },
  { id: "warlord_tyrant_plate",    characterId: "warlord", slot: "armor",    name: "Tyrant's Plate",       description: "Armor of a conquering warlord.",         colorOverrides: { primary: 0x111100, secondary: 0x332200 }, defaultUnlocked: false, unlockCondition: "Complete Arcade mode as Warlord" },

  // ── Nimue ───────────────────────────────────────────────────────────────
  { id: "nimue_default_weapon",    characterId: "nimue", slot: "weapon",     name: "Water Staff",          description: "A staff channeling lake water.",         colorOverrides: {},                                    defaultUnlocked: true },
  { id: "nimue_frost_staff",       characterId: "nimue", slot: "weapon",     name: "Frostweave Staff",     description: "A staff encased in eternal ice.",        colorOverrides: { accent: 0xaaeeff },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Nimue" },
  { id: "nimue_coral_robes",       characterId: "nimue", slot: "armor",      name: "Coral Vestments",      description: "Robes woven from deep-sea coral.",       colorOverrides: { primary: 0xcc4466, secondary: 0xee6688 }, defaultUnlocked: false, unlockCondition: "Complete Arcade mode as Nimue" },

  // ── Pellinore ───────────────────────────────────────────────────────────
  { id: "pellinore_default_weapon", characterId: "pellinore", slot: "weapon", name: "Hunting Spear",       description: "A sturdy boar-hunting spear.",           colorOverrides: {},                                    defaultUnlocked: true },
  { id: "pellinore_beast_spear",    characterId: "pellinore", slot: "weapon", name: "Beast Fang Spear",    description: "Tipped with the Questing Beast's fang.", colorOverrides: { accent: 0xddbb00 },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Pellinore" },

  // ── Tristan ─────────────────────────────────────────────────────────────
  { id: "tristan_default_weapon",  characterId: "tristan", slot: "weapon",   name: "Twin Rapiers",         description: "Elegant matched dueling blades.",        colorOverrides: {},                                    defaultUnlocked: true },
  { id: "tristan_rose_blades",     characterId: "tristan", slot: "weapon",   name: "Rose Thorns",          description: "Rapiers etched with rose motifs.",       colorOverrides: { accent: 0xff4466 },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Tristan" },

  // ── Igraine ─────────────────────────────────────────────────────────────
  { id: "igraine_default_weapon",  characterId: "igraine", slot: "weapon",   name: "Cornwall Saber",       description: "A curved saber of Cornwall steel.",      colorOverrides: {},                                    defaultUnlocked: true },
  { id: "igraine_silver_saber",    characterId: "igraine", slot: "weapon",   name: "Moonsilver Saber",     description: "A blade that gleams like moonlight.",    colorOverrides: { accent: 0xccccff },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Igraine" },

  // ── Lot ─────────────────────────────────────────────────────────────────
  { id: "lot_default_weapon",      characterId: "lot", slot: "weapon",       name: "War Mace",             description: "A brutal spiked mace.",                  colorOverrides: {},                                    defaultUnlocked: true },
  { id: "lot_siege_mace",          characterId: "lot", slot: "weapon",       name: "Siege Breaker",        description: "A mace that toppled castle gates.",      colorOverrides: { accent: 0xcc8833 },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Lot" },

  // ── Ector ───────────────────────────────────────────────────────────────
  { id: "ector_default_weapon",    characterId: "ector", slot: "weapon",     name: "Training Sword",       description: "A well-worn master's blade.",            colorOverrides: {},                                    defaultUnlocked: true },
  { id: "ector_veteran_blade",     characterId: "ector", slot: "weapon",     name: "Veteran's Edge",       description: "A blade notched by a thousand lessons.", colorOverrides: { accent: 0xaabb88 },                  defaultUnlocked: false, unlockCondition: "Win 10 matches as Ector" },
];

/** Get all skins for a specific character */
export function getSkinsForCharacter(characterId: string): TekkenSkinDef[] {
  return TEKKEN_SKINS.filter(s => s.characterId === characterId);
}

/** Get skins for a specific character and slot */
export function getSkinsForSlot(characterId: string, slot: TekkenSkinSlot): TekkenSkinDef[] {
  return TEKKEN_SKINS.filter(s => s.characterId === characterId && s.slot === slot);
}
