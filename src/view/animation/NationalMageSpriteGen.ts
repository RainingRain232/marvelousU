// Per-race palettes for national mage sprites.
//
// Each race with magic >= 1 gets a distinct MagePalette so their national
// mages are visually identifiable.  The generic mage generator in
// StormMageSpriteGen.ts (generateMageFrames) is reused — only colors change.
//
// Races: Man (blue/gold), Elf (green/silver), Adept (purple/arcane),
//        Elements (orange/amber), OP (white/gold radiant).

import type { MagePalette } from "@view/animation/StormMageSpriteGen";

// ---------------------------------------------------------------------------
// Man — royal blue robes with gold trim
// ---------------------------------------------------------------------------
export const PALETTE_NATIONAL_MAN: MagePalette = {
  robe:    0x334488,
  robeDk:  0x223366,
  robeHi:  0x5577aa,
  hat:     0x2a3a78,
  hatDk:   0x1a2a58,
  hatBand: 0xccaa55,
  magic:   0x6699dd,
  magicHi: 0xccddff,
};

// ---------------------------------------------------------------------------
// Elf — forest green robes with silver accents
// ---------------------------------------------------------------------------
export const PALETTE_NATIONAL_ELF: MagePalette = {
  robe:    0x2a7a3a,
  robeDk:  0x1a5a2a,
  robeHi:  0x4aaa5a,
  hat:     0x226a2e,
  hatDk:   0x144a1e,
  hatBand: 0xaaddbb,
  magic:   0x66dd88,
  magicHi: 0xddffee,
};

// ---------------------------------------------------------------------------
// Adept — deep purple robes with arcane glow
// ---------------------------------------------------------------------------
export const PALETTE_NATIONAL_ADEPT: MagePalette = {
  robe:    0x5533aa,
  robeDk:  0x3a2288,
  robeHi:  0x7755cc,
  hat:     0x4a2a9a,
  hatDk:   0x331a6a,
  hatBand: 0xbb88ee,
  magic:   0xaa77ff,
  magicHi: 0xeeddff,
};

// ---------------------------------------------------------------------------
// Elements — fiery orange/amber robes with elemental magic
// ---------------------------------------------------------------------------
export const PALETTE_NATIONAL_ELEMENTS: MagePalette = {
  robe:    0xaa5522,
  robeDk:  0x883a11,
  robeHi:  0xcc7744,
  hat:     0x994411,
  hatDk:   0x662e0a,
  hatBand: 0xffcc66,
  magic:   0xff8844,
  magicHi: 0xffddbb,
};

// ---------------------------------------------------------------------------
// OP — radiant white/gold robes with divine magic
// ---------------------------------------------------------------------------
export const PALETTE_NATIONAL_OP: MagePalette = {
  robe:    0xeedd88,
  robeDk:  0xccbb66,
  robeHi:  0xffeeaa,
  hat:     0xddcc77,
  hatDk:   0xbbaa55,
  hatBand: 0xffffff,
  magic:   0xffee88,
  magicHi: 0xfffff0,
};

// ---------------------------------------------------------------------------
// Race ID → sprite key mapping
// ---------------------------------------------------------------------------

/** Maps a raceId to the national mage sprite sheet key. */
export const RACE_NATIONAL_MAGE_KEY: Record<string, string> = {
  man:      "national_mage_man",
  elf:      "national_mage_elf",
  adept:    "national_mage_adept",
  elements: "national_mage_elements",
  op:       "national_mage_op",
};

/** All national mage sprite keys (for AnimationManager preloading). */
export const ALL_NATIONAL_MAGE_KEYS: string[] = Object.values(RACE_NATIONAL_MAGE_KEY);

/** Maps sprite key → palette for generation. */
export const NATIONAL_MAGE_PALETTES: Record<string, MagePalette> = {
  national_mage_man:      PALETTE_NATIONAL_MAN,
  national_mage_elf:      PALETTE_NATIONAL_ELF,
  national_mage_adept:    PALETTE_NATIONAL_ADEPT,
  national_mage_elements: PALETTE_NATIONAL_ELEMENTS,
  national_mage_op:       PALETTE_NATIONAL_OP,
};
