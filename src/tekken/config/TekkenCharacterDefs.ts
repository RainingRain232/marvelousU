import type { TekkenCharacterDef, TekkenMoveDef } from "../state/TekkenState";
import { TekkenAttackHeight, TekkenLimb } from "../../types";
import { UNIVERSAL_MOVES } from "./TekkenMoveDefs";

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
    moveList: UNIVERSAL_MOVES,
    comboRoutes: [
      ["d/f+2", "d/f+1", "d/f+1", "d/f+4", "3"],
      ["u/f+3", "d/f+1", "d/f+4", "4"],
    ],
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
    moveList: UNIVERSAL_MOVES,
    comboRoutes: [
      ["d/f+2", "2", "d/f+1", "d/f+4", "4"],
      ["d+2", "d/f+1", "d/f+1", "d/f+4", "3"],
    ],
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
    moveList: UNIVERSAL_MOVES,
    comboRoutes: [
      ["d/f+2", "1", "d/f+1", "d/f+4", "d/f+3"],
      ["u/f+3", "d/f+1", "d/f+4", "3"],
    ],
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
    moveList: UNIVERSAL_MOVES,
    comboRoutes: [
      ["d/f+2", "d/f+1", "d/f+4", "3"],
    ],
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
    moveList: UNIVERSAL_MOVES,
    comboRoutes: [
      ["d/f+2", "1", "d/f+1", "d/f+4", "4"],
      ["u/f+3", "d/f+1", "d/f+1", "d/f+4", "3"],
    ],
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
    moveList: UNIVERSAL_MOVES,
    comboRoutes: [
      ["d/f+2", "d/f+1", "d/f+4", "4"],
    ],
    rageArt: rageArt("warlord_rage_art", "Crushing Devastation", 55),
    walkSpeed: 0.03,
    dashSpeed: 0.07,
    backdashDist: 0.45,
  },
];

export const TEKKEN_CHARACTER_IDS: string[] = TEKKEN_CHARACTERS.map((c) => c.id);
