// ---------------------------------------------------------------------------
// Round Table – Knight (Character) Definitions
// ---------------------------------------------------------------------------

import { KnightDef, KnightId } from "../types";

export const KNIGHT_DEFS: Record<KnightId, KnightDef> = {
  [KnightId.LANCELOT]: {
    id: KnightId.LANCELOT,
    name: "Lancelot",
    title: "The Peerless Blade",
    description:
      "The greatest knight of the Round Table. An aggressive warrior whose strikes flow like water — each killing blow fuels the next.",
    maxHp: 75,
    startingDeckIds: [
      "strike", "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend",
      "lancelot_flurry",
    ],
    passiveName: "Peerless Edge",
    passiveDesc: "The first time you deal unblocked damage each turn, draw 1 card.",
    color: 0xd4af37,
  },

  [KnightId.GAWAIN]: {
    id: KnightId.GAWAIN,
    name: "Gawain",
    title: "Knight of the Sun",
    description:
      "His strength waxes with the sun. Every third combat his power surges, but he pays the price when the sun sets.",
    maxHp: 85,
    startingDeckIds: [
      "strike", "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend",
      "gawain_sunfire",
    ],
    passiveName: "Solar Tide",
    passiveDesc: "Every 3rd combat: gain 2 Strength at combat start. Other combats: enemies gain 1 Strength.",
    color: 0xff8c00,
  },

  [KnightId.PERCIVAL]: {
    id: KnightId.PERCIVAL,
    name: "Percival",
    title: "The Pure Knight",
    description:
      "The only knight worthy to find the Grail. Unplayed cards become shields — patience is his greatest weapon.",
    maxHp: 80,
    startingDeckIds: [
      "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend", "defend",
      "percival_prayer",
    ],
    passiveName: "Grail Patience",
    passiveDesc: "At end of turn, gain 1 Block for each unplayed card in hand.",
    color: 0xc0c0c0,
  },

  [KnightId.MORGAUSE]: {
    id: KnightId.MORGAUSE,
    name: "Morgause",
    title: "The Witch-Queen",
    description:
      "Arthur's half-sister walks between light and dark. Her curses empower her — corruption is strength.",
    maxHp: 70,
    startingDeckIds: [
      "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend",
      "morgause_hex", "curse_doubt",
    ],
    passiveName: "Dark Embrace",
    passiveDesc: "Whenever you draw a Curse card, gain 1 Energy and deal 3 damage to a random enemy.",
    color: 0x8b00ff,
  },

  [KnightId.TRISTAN]: {
    id: KnightId.TRISTAN,
    name: "Tristan",
    title: "The Wounded Knight",
    description:
      "A knight of sorrow and poison. His lingering wounds mirror the venom he inflicts upon his foes.",
    maxHp: 72,
    startingDeckIds: [
      "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend",
      "tristan_envenom", "tristan_envenom",
    ],
    passiveName: "Festering Wounds",
    passiveDesc: "At the start of combat, apply 1 Poison to ALL enemies.",
    color: 0x228b22,
  },
};

export const ALL_KNIGHT_IDS = Object.values(KnightId);
