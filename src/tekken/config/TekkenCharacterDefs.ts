import type { TekkenCharacterDef, TekkenMoveDef } from "../state/TekkenState";
import { TekkenAttackHeight, TekkenLimb } from "../../types";
import {
  KNIGHT_MOVES,
  BERSERKER_MOVES,
  MONK_MOVES,
  PALADIN_MOVES,
  ASSASSIN_MOVES,
  WARLORD_MOVES,
  NIMUE_MOVES,
  PELLINORE_MOVES,
  TRISTAN_MOVES,
  IGRAINE_MOVES,
  LOT_MOVES,
  ECTOR_MOVES,
} from "./TekkenMoveDefs";

function rageArt(id: string, name: string, damage: number): TekkenMoveDef {
  return {
    id,
    name,
    type: "rage",
    height: TekkenAttackHeight.MID,
    limb: TekkenLimb.RIGHT_PUNCH,
    startup: 20,
    active: 5,
    recovery: 40,
    onHit: 0,
    onBlock: -22,
    onCounterHit: 0,
    damage,
    chipDamage: 8,
    isLauncher: false,
    launchHeight: 0,
    launchGravity: 0,
    isScrew: false,
    isBound: false,
    isHoming: false,
    isPowerCrush: true,
    hasHighCrush: false,
    hasLowCrush: false,
    knockback: 1.0,
    wallSplat: true,
    hitbox: { x: 0.3, y: 0.9, z: 0, w: 0.6, h: 0.4, d: 0.5 },
    advanceDistance: 0.3,
  };
}

export const TEKKEN_CHARACTERS: TekkenCharacterDef[] = [
  // ── Knight ────────────────────────────────────────────────────────────
  {
    id: "knight",
    name: "Sir Aldric",
    title: "The Iron Bulwark",
    archetype: "balanced",
    colors: {
      primary: 0x2255aa,
      secondary: 0xaabbcc,
      accent: 0xddaa22,
      skin: 0xe8c4a0,
      hair: 0x4a3520,
    },
    moveList: KNIGHT_MOVES,
    comboRoutes: [
      ["knight_rising_blade", "d/f+1", "knight_cross_slash_1", "d/f+4", "3"],
      ["u/f+3", "d/f+1", "knight_sword_thrust", "d/f+4", "4"],
      ["knight_destrier_scythe", "d/f+1", "knight_bulwark_rush", "knight_crusaders_orbit", "d/f+4", "3"],
    ],
    advancedComboRoutes: [
      ["knight_rising_blade", "d/f+1", "knight_cross_slash_1", "d/f+1", "d/f+4", "3"],
      ["knight_sky_cleave", "d/f+1", "knight_sword_thrust", "knight_counter_slash", "d/f+4", "4"],
    ],
    expertComboRoutes: [
      ["knight_rising_blade", "d/f+1", "knight_cross_slash_1", "d/f+1", "knight_sword_thrust", "d/f+4", "3", "4"],
      ["knight_sky_cleave", "knight_double_slash_1", "d/f+1", "knight_sword_thrust", "knight_counter_slash", "d/f+4", "3"],
      ["knight_rising_blade", "knight_cross_slash_1", "knight_running_slash", "d/f+1", "knight_evasive_backslash", "d/f+4", "4"],
    ],
    victoryPoseType: "weapon_flourish",
    rageArt: rageArt("knight_rage_art", "Iron Judgment", 55),
    walkSpeed: 0.035,
    dashSpeed: 0.08,
    backdashDist: 0.6,
  },

  // ── Berserker ─────────────────────────────────────────────────────────
  {
    id: "berserker",
    name: "Bjorn Ironfist",
    title: "The Unbroken",
    archetype: "rushdown",
    colors: {
      primary: 0x882222,
      secondary: 0x553322,
      accent: 0x111111,
      skin: 0xd4a574,
      hair: 0x883322,
    },
    moveList: BERSERKER_MOVES,
    comboRoutes: [
      ["d/f+2", "berserker_hammerfist", "berserker_gut_punch", "d/f+4", "4"],
      ["berserker_skull_crusher", "berserker_gut_punch", "d/f+1", "d/f+4", "3"],
      ["berserker_wrath", "berserker_warpath_elbow", "berserker_gut_punch", "berserker_demolition_slam", "d/f+4", "4"],
    ],
    advancedComboRoutes: [
      ["berserker_leaping_smash", "berserker_hammerfist", "berserker_gut_punch", "d/f+1", "d/f+4", "4"],
      ["berserker_skull_crusher", "berserker_gut_punch", "berserker_wild_swing_1", "berserker_hammerfist", "d/f+4", "3"],
    ],
    expertComboRoutes: [
      ["berserker_leaping_smash", "berserker_headbutt", "berserker_gut_punch", "d/f+1", "berserker_hammerfist", "d/f+4", "4", "3"],
      ["d/f+2", "berserker_wild_swing_1", "berserker_gut_punch", "berserker_hammerfist", "berserker_running_tackle", "d/f+4", "3"],
      ["berserker_leaping_smash", "berserker_skull_crusher", "berserker_gut_punch", "d/f+1", "berserker_hammerfist", "d/f+4", "4"],
    ],
    victoryPoseType: "flex",
    rageArt: rageArt("berserker_rage_art", "Berserker Rampage", 55),
    walkSpeed: 0.04,
    dashSpeed: 0.09,
    backdashDist: 0.5,
  },

  // ── Monk ──────────────────────────────────────────────────────────────
  {
    id: "monk",
    name: "Brother Cedric",
    title: "Fist of the Monastery",
    archetype: "mixup",
    colors: {
      primary: 0xdd8822,
      secondary: 0x664422,
      accent: 0xddaa22,
      skin: 0xf0d0b0,
      hair: 0x222222,
    },
    moveList: MONK_MOVES,
    comboRoutes: [
      ["monk_sky_fist", "monk_palm_strike", "d/f+1", "d/f+4", "d/f+3"],
      ["d/f+2", "monk_palm_strike", "monk_flowing_palm", "d/f+4", "3"],
      ["monk_ascending_dragon", "monk_palm_strike", "monk_spiral_wind_kick", "monk_thunder_palm_thrust", "d/f+4", "3"],
    ],
    advancedComboRoutes: [
      ["monk_dragon_uppercut", "monk_palm_strike", "d/f+1", "monk_flowing_palm", "d/f+4", "d/f+3"],
      ["d/f+2", "monk_tiger_palm", "monk_flowing_palm", "monk_stance_combo_1", "d/f+4", "3"],
    ],
    expertComboRoutes: [
      ["monk_dragon_uppercut", "monk_palm_strike", "monk_tiger_palm", "monk_flowing_palm", "monk_stance_combo_1", "d/f+4", "d/f+3", "3"],
      ["d/f+2", "monk_tiger_palm", "monk_flowing_palm", "d/f+1", "monk_flying_kick", "d/f+4", "d/f+3"],
      ["monk_dragon_uppercut", "monk_flowing_palm", "monk_palm_strike", "monk_spinning_dodge", "d/f+1", "d/f+4", "3"],
    ],
    victoryPoseType: "bow",
    rageArt: rageArt("monk_rage_art", "Thousand Palm Strike", 55),
    walkSpeed: 0.038,
    dashSpeed: 0.085,
    backdashDist: 0.55,
  },

  // ── Paladin ───────────────────────────────────────────────────────────
  {
    id: "paladin",
    name: "Lady Isolde",
    title: "The Radiant Shield",
    archetype: "defensive",
    colors: {
      primary: 0xeeeeff,
      secondary: 0xddaa22,
      accent: 0x3366bb,
      skin: 0xf0d0b0,
      hair: 0xaa8844,
    },
    moveList: PALADIN_MOVES,
    comboRoutes: [
      ["paladin_divine_smite", "d/f+1", "paladin_holy_strike", "d/f+4", "3"],
      ["d/f+2", "paladin_holy_strike", "d/f+1", "d/f+4", "4"],
    ],
    advancedComboRoutes: [
      ["paladin_heavens_strike", "d/f+1", "paladin_holy_strike", "paladin_counter_thrust", "d/f+4", "3"],
      ["d/f+2", "paladin_holy_strike", "paladin_judgment_combo_1", "paladin_counter_thrust", "d/f+4", "4"],
    ],
    expertComboRoutes: [
      ["paladin_heavens_strike", "d/f+1", "paladin_holy_strike", "paladin_judgment_combo_1", "paladin_counter_thrust", "d/f+4", "3", "4"],
      ["d/f+2", "paladin_holy_strike", "paladin_charging_shield", "d/f+1", "paladin_counter_thrust", "d/f+4", "4"],
      ["paladin_heavens_strike", "paladin_holy_strike", "paladin_judgment_combo_1", "d/f+1", "paladin_evasive_shield", "d/f+4", "3"],
    ],
    victoryPoseType: "kneel",
    rageArt: rageArt("paladin_rage_art", "Divine Retribution", 55),
    walkSpeed: 0.032,
    dashSpeed: 0.075,
    backdashDist: 0.65,
  },

  // ── Assassin ──────────────────────────────────────────────────────────
  {
    id: "assassin",
    name: "Shade",
    title: "The Unseen Blade",
    archetype: "evasive",
    colors: {
      primary: 0x442266,
      secondary: 0x111111,
      accent: 0xbb2222,
      skin: 0xc49060,
      hair: 0x111111,
    },
    moveList: ASSASSIN_MOVES,
    comboRoutes: [
      ["assassin_death_from_above", "assassin_shadow_stab", "d/f+1", "d/f+4", "4"],
      ["d/f+2", "assassin_phantom_slash", "d/f+1", "d/f+4", "3"],
    ],
    advancedComboRoutes: [
      ["assassin_death_from_above", "assassin_shadow_stab", "assassin_counter_elbow", "assassin_phantom_slash", "d/f+4", "4"],
      ["assassin_rising_dagger", "assassin_phantom_slash", "assassin_triple_slash_1", "d/f+1", "d/f+4", "3"],
    ],
    expertComboRoutes: [
      ["assassin_death_from_above", "assassin_shadow_stab", "assassin_counter_elbow", "assassin_phantom_slash", "assassin_triple_slash_1", "d/f+4", "4", "3"],
      ["assassin_rising_dagger", "assassin_phantom_slash", "assassin_shadow_stab", "assassin_backstep_flip", "assassin_counter_elbow", "d/f+4", "3"],
      ["assassin_death_from_above", "assassin_triple_slash_1", "assassin_phantom_slash", "assassin_shadow_stab", "d/f+1", "d/f+4", "4"],
    ],
    victoryPoseType: "taunt",
    rageArt: rageArt("assassin_rage_art", "Shadow Execution", 55),
    walkSpeed: 0.042,
    dashSpeed: 0.095,
    backdashDist: 0.7,
  },

  // ── Warlord ───────────────────────────────────────────────────────────
  {
    id: "warlord",
    name: "Gorm the Red",
    title: "Breaker of Shields",
    archetype: "power",
    colors: {
      primary: 0x225522,
      secondary: 0x553322,
      accent: 0xddaa22,
      skin: 0xd4a574,
      hair: 0x664422,
    },
    moveList: WARLORD_MOVES,
    comboRoutes: [
      ["warlord_execution_chop", "d/f+1", "warlord_axe_cleave", "d/f+4", "4"],
      ["d/f+2", "d/f+1", "warlord_axe_cleave", "d/f+4", "3"],
    ],
    advancedComboRoutes: [
      ["warlord_meteor_drop", "d/f+1", "warlord_axe_cleave", "warlord_armor_check", "d/f+4", "4"],
      ["d/f+2", "warlord_double_axe_1", "warlord_axe_cleave", "warlord_charging_stomp", "d/f+4", "3"],
    ],
    expertComboRoutes: [
      ["warlord_meteor_drop", "d/f+1", "warlord_axe_cleave", "warlord_double_axe_1", "warlord_armor_check", "d/f+4", "4", "3"],
      ["d/f+2", "warlord_double_axe_1", "warlord_axe_cleave", "warlord_charging_stomp", "warlord_sidestep_slam", "d/f+4", "4"],
      ["warlord_meteor_drop", "warlord_axe_cleave", "d/f+1", "warlord_double_axe_1", "warlord_armor_check", "d/f+4", "3"],
    ],
    victoryPoseType: "fist_pump",
    rageArt: rageArt("warlord_rage_art", "Crushing Devastation", 55),
    walkSpeed: 0.03,
    dashSpeed: 0.07,
    backdashDist: 0.45,
  },

  // ── Nimue (Lady of the Lake) ────────────────────────────────────────────
  {
    id: "nimue",
    name: "Nimue",
    title: "Lady of the Lake",
    archetype: "zoner",
    colors: {
      primary: 0x2266bb,
      secondary: 0x88ccee,
      accent: 0xaaddff,
      skin: 0xf0d0b0,
      hair: 0x112244,
    },
    moveList: NIMUE_MOVES,
    comboRoutes: [
      ["nimue_geyser_burst", "d/f+1", "nimue_ice_lance", "d/f+4", "3"],
      ["d/f+2", "nimue_frost_jab", "nimue_reflux_kick", "d/f+4", "4"],
    ],
    advancedComboRoutes: [
      ["nimue_cascade_strike", "d/f+1", "nimue_ice_lance", "nimue_reflux_kick", "d/f+4", "3"],
      ["d/f+2", "nimue_frost_jab", "nimue_ice_lance", "nimue_mist_step", "d/f+4", "4"],
    ],
    expertComboRoutes: [
      ["nimue_cascade_strike", "d/f+1", "nimue_ice_lance", "nimue_frost_jab", "nimue_reflux_kick", "d/f+4", "3", "4"],
      ["d/f+2", "nimue_frost_jab", "nimue_ice_lance", "nimue_mist_step", "nimue_torrent_blast", "d/f+4", "3"],
      ["nimue_geyser_burst", "nimue_ice_lance", "d/f+1", "nimue_reflux_kick", "nimue_undertow", "d/f+4", "4"],
    ],
    victoryPoseType: "magic_flourish",
    rageArt: rageArt("nimue_rage_art", "Avalon's Deluge", 55),
    walkSpeed: 0.034,
    dashSpeed: 0.078,
    backdashDist: 0.65,
    aiProfile: {
      aggression: 0.3,
      throwFrequency: 0.2,
      whiffPunishRate: 0.7,
      pressureStyle: 0.2,
      defensiveness: 0.7,
      pokeFrequency: 0.8,
      launcherFrequency: 0.3,
    },
  },

  // ── Pellinore (King Pellinore) ──────────────────────────────────────────
  {
    id: "pellinore",
    name: "King Pellinore",
    title: "The Questing Beast Hunter",
    archetype: "grappler",
    colors: {
      primary: 0x886633,
      secondary: 0x443322,
      accent: 0xddbb44,
      skin: 0xd4a574,
      hair: 0x555555,
    },
    moveList: PELLINORE_MOVES,
    comboRoutes: [
      ["pellinore_uppercut_slam", "d/f+1", "pellinore_bull_charge", "d/f+4", "4"],
      ["d/f+2", "pellinore_headbutt", "pellinore_hammer_fist", "d/f+4", "3"],
    ],
    advancedComboRoutes: [
      ["pellinore_body_splash", "d/f+1", "pellinore_bull_charge", "pellinore_hammer_fist", "d/f+4", "4"],
      ["d/f+2", "pellinore_headbutt", "pellinore_gut_kick", "pellinore_bull_charge", "d/f+4", "3"],
    ],
    expertComboRoutes: [
      ["pellinore_body_splash", "d/f+1", "pellinore_bull_charge", "pellinore_headbutt", "pellinore_hammer_fist", "d/f+4", "4", "3"],
      ["d/f+2", "pellinore_headbutt", "pellinore_gut_kick", "pellinore_bull_charge", "pellinore_charging_knee", "d/f+4", "3"],
      ["pellinore_uppercut_slam", "pellinore_bull_charge", "d/f+1", "pellinore_hammer_fist", "pellinore_ground_slam", "d/f+4", "4"],
    ],
    victoryPoseType: "fist_pump",
    rageArt: rageArt("pellinore_rage_art", "Beast Hunter's Fury", 55),
    walkSpeed: 0.028,
    dashSpeed: 0.065,
    backdashDist: 0.4,
    aiProfile: {
      aggression: 0.6,
      throwFrequency: 0.9,
      whiffPunishRate: 0.5,
      pressureStyle: 0.7,
      defensiveness: 0.3,
      pokeFrequency: 0.3,
      launcherFrequency: 0.3,
    },
  },

  // ── Tristan (Sir Tristan) ──────────────────────────────────────────────
  {
    id: "tristan",
    name: "Sir Tristan",
    title: "The Relentless Blade",
    archetype: "rushdown",
    colors: {
      primary: 0xcc3333,
      secondary: 0x222222,
      accent: 0xeecc44,
      skin: 0xe8c4a0,
      hair: 0x331111,
    },
    moveList: TRISTAN_MOVES,
    comboRoutes: [
      ["tristan_rising_dual", "d/f+1", "tristan_feint_stab", "d/f+4", "4"],
      ["d/f+2", "tristan_twin_slash", "tristan_whip_kick", "d/f+4", "3"],
    ],
    advancedComboRoutes: [
      ["tristan_aerial_cross", "d/f+1", "tristan_feint_stab", "tristan_whip_kick", "d/f+4", "4"],
      ["d/f+2", "tristan_twin_slash", "tristan_rush_stab", "tristan_spinning_back", "d/f+4", "3"],
    ],
    expertComboRoutes: [
      ["tristan_aerial_cross", "d/f+1", "tristan_feint_stab", "tristan_twin_slash", "tristan_whip_kick", "d/f+4", "4", "3"],
      ["d/f+2", "tristan_twin_slash", "tristan_rush_stab", "tristan_spinning_back", "tristan_feint_stab", "d/f+4", "3"],
      ["tristan_rising_dual", "tristan_feint_stab", "d/f+1", "tristan_whip_kick", "tristan_quick_sweep", "d/f+4", "4"],
    ],
    victoryPoseType: "weapon_flourish",
    rageArt: rageArt("tristan_rage_art", "Lovers' Tempest", 55),
    walkSpeed: 0.042,
    dashSpeed: 0.095,
    backdashDist: 0.5,
    aiProfile: {
      aggression: 0.9,
      throwFrequency: 0.3,
      whiffPunishRate: 0.5,
      pressureStyle: 0.9,
      defensiveness: 0.1,
      pokeFrequency: 0.4,
      launcherFrequency: 0.5,
    },
  },

  // ── Igraine (Igraine of Cornwall) ───────────────────────────────────────
  {
    id: "igraine",
    name: "Igraine",
    title: "The Iron Rose",
    archetype: "balanced",
    colors: {
      primary: 0x668899,
      secondary: 0xccccdd,
      accent: 0xcc6644,
      skin: 0xf0d0b0,
      hair: 0x553322,
    },
    moveList: IGRAINE_MOVES,
    comboRoutes: [
      ["igraine_crescent_blade", "d/f+1", "igraine_straight_thrust", "d/f+4", "3"],
      ["d/f+2", "igraine_quick_cut", "igraine_spinning_guard", "d/f+4", "4"],
    ],
    advancedComboRoutes: [
      ["igraine_sky_arc", "d/f+1", "igraine_straight_thrust", "igraine_spinning_guard", "d/f+4", "3"],
      ["d/f+2", "igraine_quick_cut", "igraine_straight_thrust", "igraine_backstep_slash", "d/f+4", "4"],
    ],
    expertComboRoutes: [
      ["igraine_sky_arc", "d/f+1", "igraine_straight_thrust", "igraine_quick_cut", "igraine_spinning_guard", "d/f+4", "3", "4"],
      ["d/f+2", "igraine_quick_cut", "igraine_straight_thrust", "igraine_backstep_slash", "igraine_charging_thrust", "d/f+4", "4"],
      ["igraine_crescent_blade", "igraine_straight_thrust", "d/f+1", "igraine_spinning_guard", "igraine_heel_sweep", "d/f+4", "3"],
    ],
    victoryPoseType: "kneel",
    rageArt: rageArt("igraine_rage_art", "Cornwall's Resolve", 55),
    walkSpeed: 0.035,
    dashSpeed: 0.08,
    backdashDist: 0.6,
    aiProfile: {
      aggression: 0.5,
      throwFrequency: 0.4,
      whiffPunishRate: 0.6,
      pressureStyle: 0.5,
      defensiveness: 0.5,
      pokeFrequency: 0.6,
      launcherFrequency: 0.4,
    },
  },

  // ── Lot (King Lot) ──────────────────────────────────────────────────────
  {
    id: "lot",
    name: "King Lot",
    title: "The Orkney Warlord",
    archetype: "power",
    colors: {
      primary: 0x444444,
      secondary: 0x222222,
      accent: 0xbb8833,
      skin: 0xd4a574,
      hair: 0x333333,
    },
    moveList: LOT_MOVES,
    comboRoutes: [
      ["lot_earthsplitter", "d/f+1", "lot_war_hammer", "d/f+4", "4"],
      ["d/f+2", "lot_gauntlet_strike", "lot_mace_swing", "d/f+4", "3"],
    ],
    advancedComboRoutes: [
      ["lot_skyfall_hammer", "d/f+1", "lot_war_hammer", "lot_mace_swing", "d/f+4", "4"],
      ["d/f+2", "lot_gauntlet_strike", "lot_war_hammer", "lot_armored_elbow", "d/f+4", "3"],
    ],
    expertComboRoutes: [
      ["lot_skyfall_hammer", "d/f+1", "lot_war_hammer", "lot_gauntlet_strike", "lot_mace_swing", "d/f+4", "4", "3"],
      ["d/f+2", "lot_gauntlet_strike", "lot_war_hammer", "lot_armored_elbow", "lot_battering_ram", "d/f+4", "3"],
      ["lot_earthsplitter", "lot_war_hammer", "d/f+1", "lot_mace_swing", "lot_ground_crush", "d/f+4", "4"],
    ],
    victoryPoseType: "fist_pump",
    rageArt: rageArt("lot_rage_art", "Orkney Annihilation", 55),
    walkSpeed: 0.028,
    dashSpeed: 0.068,
    backdashDist: 0.4,
    aiProfile: {
      aggression: 0.6,
      throwFrequency: 0.4,
      whiffPunishRate: 0.4,
      pressureStyle: 0.6,
      defensiveness: 0.4,
      pokeFrequency: 0.3,
      launcherFrequency: 0.6,
    },
  },

  // ── Ector (Sir Ector) ───────────────────────────────────────────────────
  {
    id: "ector",
    name: "Sir Ector",
    title: "The Master-at-Arms",
    archetype: "technical",
    colors: {
      primary: 0x336655,
      secondary: 0xbbccbb,
      accent: 0xddddaa,
      skin: 0xe8c4a0,
      hair: 0x887766,
    },
    moveList: ECTOR_MOVES,
    comboRoutes: [
      ["ector_counter_uppercut", "d/f+1", "ector_precise_thrust", "d/f+4", "3"],
      ["d/f+2", "ector_feint_jab", "ector_spinning_riposte", "d/f+4", "4"],
    ],
    advancedComboRoutes: [
      ["ector_rising_counter", "d/f+1", "ector_precise_thrust", "ector_spinning_riposte", "d/f+4", "3"],
      ["d/f+2", "ector_feint_jab", "ector_precise_thrust", "ector_evasive_elbow", "d/f+4", "4"],
    ],
    expertComboRoutes: [
      ["ector_rising_counter", "d/f+1", "ector_precise_thrust", "ector_feint_jab", "ector_spinning_riposte", "d/f+4", "3", "4"],
      ["d/f+2", "ector_feint_jab", "ector_precise_thrust", "ector_evasive_elbow", "ector_punish_thrust", "d/f+4", "4"],
      ["ector_counter_uppercut", "ector_precise_thrust", "d/f+1", "ector_spinning_riposte", "ector_punishment_sweep", "d/f+4", "3"],
    ],
    victoryPoseType: "bow",
    rageArt: rageArt("ector_rage_art", "Veteran's Judgment", 55),
    walkSpeed: 0.036,
    dashSpeed: 0.082,
    backdashDist: 0.6,
    aiProfile: {
      aggression: 0.3,
      throwFrequency: 0.3,
      whiffPunishRate: 0.9,
      pressureStyle: 0.3,
      defensiveness: 0.8,
      pokeFrequency: 0.7,
      launcherFrequency: 0.4,
    },
  },
];

export const TEKKEN_CHARACTER_IDS: string[] = TEKKEN_CHARACTERS.map((c) => c.id);
