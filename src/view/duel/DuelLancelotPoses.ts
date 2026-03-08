// ---------------------------------------------------------------------------
// Lancelot – The Peerless Knight
// Skeleton pose data for the duel fighting game.
// Gleaming plate armor, yellow cloak, long spear with pennant.
// Spear fighter — long range thrusts, sweeps, and lunging attacks.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const LANCELOT_PALETTE: FighterPalette = {
  skin: 0xddbb99,
  body: 0x7788aa,        // polished blue-steel plate armor
  pants: 0x556677,        // dark steel armored leggings
  shoes: 0x443322,        // dark leather boots
  hair: 0xccaa55,         // golden blond
  eyes: 0x4488aa,
  outline: 0x222233,
  gloves: 0x7788aa,       // steel gauntlets
  belt: 0x553311,         // dark leather belt
  accent: 0xddcc44,       // yellow cloak
  weapon: 0xaabb88,       // ash wood spear shaft
  weaponAccent: 0xccccdd, // steel spear head
};

// ---- Poses -----------------------------------------------------------------

export const LANCELOT_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, confident stance, spear held upright at side) --
  idle: [
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),          // front: spear hand at side
      arm(-24, -170, -36, -148, -30, -120),        // back: relaxed
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
    pose(
      head(4, -184),
      torso(0, -129, 54, 42, 90),
      arm(24, -169, 36, -147, 32, -124),
      arm(-24, -169, -36, -147, -30, -119),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
    pose(
      head(4, -183),
      torso(0, -128, 54, 42, 90),
      arm(24, -168, 36, -146, 32, -123),
      arm(-24, -168, -36, -146, -30, -118),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
    pose(
      head(4, -184),
      torso(0, -129, 54, 42, 90),
      arm(24, -169, 36, -147, 32, -124),
      arm(-24, -169, -36, -147, -30, -119),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- walk_forward (4 frames, measured stride with spear) --
  walk_forward: [
    pose(
      head(5, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 38, -148, 34, -125),
      arm(-24, -170, -32, -145, -26, -118),
      leg(12, -85, 26, -48, 28, 0),
      leg(-12, -85, -6, -42, -18, 0),
    ),
    pose(
      head(7, -184),
      torso(2, -129, 54, 42, 90),
      arm(26, -169, 40, -145, 36, -122),
      arm(-22, -169, -30, -142, -24, -116),
      leg(12, -85, 18, -44, 12, 0),
      leg(-12, -85, -12, -44, -12, 0),
    ),
    pose(
      head(5, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -34, -145, -28, -118),
      leg(12, -85, -4, -42, -14, 0),
      leg(-12, -85, 20, -48, 24, 0),
    ),
    pose(
      head(3, -184),
      torso(-2, -129, 54, 42, 90),
      arm(22, -169, 34, -145, 30, -122),
      arm(-26, -169, -36, -142, -32, -116),
      leg(12, -85, 12, -44, 12, 0),
      leg(-12, -85, -12, -44, -12, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious retreat, spear pointed forward) --
  walk_back: [
    pose(
      head(3, -185),
      torso(-2, -130, 54, 42, 90),
      arm(22, -170, 34, -150, 30, -130),
      arm(-26, -170, -38, -148, -34, -125),
      leg(12, -85, 6, -48, -8, 0),
      leg(-12, -85, -22, -42, -26, 0),
    ),
    pose(
      head(1, -184),
      torso(-4, -129, 54, 42, 90),
      arm(20, -169, 32, -148, 28, -128),
      arm(-28, -169, -40, -146, -36, -123),
      leg(12, -85, 12, -44, 12, 0),
      leg(-12, -85, -12, -44, -12, 0),
    ),
    pose(
      head(3, -185),
      torso(-2, -130, 54, 42, 90),
      arm(22, -170, 34, -150, 30, -130),
      arm(-26, -170, -38, -148, -34, -125),
      leg(12, -85, 22, -42, 26, 0),
      leg(-12, -85, -6, -48, 8, 0),
    ),
    pose(
      head(1, -184),
      torso(-4, -129, 54, 42, 90),
      arm(20, -169, 32, -148, 28, -128),
      arm(-28, -169, -40, -146, -36, -123),
      leg(12, -85, 12, -44, 12, 0),
      leg(-12, -85, -12, -44, -12, 0),
    ),
  ],

  // -- crouch (1 frame, low guard with spear forward) --
  crouch: [
    pose(
      head(3, -130),
      torso(0, -85, 56, 46, 70),
      arm(24, -115, 38, -92, 45, -72),
      arm(-24, -115, -32, -95, -28, -75),
      leg(14, -50, 26, -25, 20, 0),
      leg(-14, -50, -26, -25, -20, 0),
    ),
  ],

  // -- jump (2 frames: leap with spear angled down) --
  jump: [
    pose(
      head(5, -190),
      torso(0, -138, 54, 42, 88),
      arm(24, -176, 42, -162, 55, -150),
      arm(-24, -176, -36, -155, -28, -140),
      leg(12, -94, 20, -68, 16, -48),
      leg(-12, -94, -20, -68, -16, -48),
    ),
    pose(
      head(5, -195),
      torso(0, -142, 54, 42, 88),
      arm(24, -180, 48, -170, 65, -160),
      arm(-24, -180, -38, -158, -30, -142),
      leg(12, -98, 22, -72, 26, -55),
      leg(-12, -98, -18, -65, -23, -50),
    ),
  ],

  // -- light_high: quick spear jab (3 frames) --
  light_high: [
    // startup: pull spear back
    pose(
      head(2, -185),
      torso(-2, -130, 54, 42, 90, -0.04),
      arm(22, -170, 14, -150, 5, -138),
      arm(-26, -170, -38, -148, -32, -125),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
    // extended jab: spear thrust far forward
    pose(
      head(8, -183),
      torso(4, -128, 54, 42, 90, 0.06),
      arm(28, -168, 58, -152, 90, -145),
      arm(-20, -168, -34, -146, -28, -122),
      leg(12, -85, 18, -44, 16, 0),
      leg(-12, -85, -16, -46, -16, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- med_high: horizontal spear sweep (3 frames) --
  med_high: [
    // startup: wind spear back
    pose(
      head(0, -186),
      torso(-3, -130, 54, 42, 90, -0.08),
      arm(22, -170, 8, -168, -12, -170),
      arm(-26, -170, -38, -148, -34, -125),
      leg(12, -85, 18, -45, 16, 0),
      leg(-12, -85, -16, -45, -18, 0),
    ),
    // wide horizontal sweep
    pose(
      head(10, -182),
      torso(5, -127, 54, 42, 90, 0.1),
      arm(28, -167, 60, -145, 95, -128),
      arm(-20, -167, -32, -144, -26, -118),
      leg(12, -85, 20, -44, 18, 0),
      leg(-12, -85, -16, -46, -18, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- heavy_high: overhead spear slam (4 frames) --
  heavy_high: [
    // windup: spear raised high overhead with both hands
    pose(
      head(0, -186),
      torso(-3, -131, 54, 42, 90, -0.06),
      arm(24, -170, 20, -185, 15, -215),
      arm(-24, -170, -15, -185, -10, -210),
      leg(12, -85, 18, -45, 16, 0),
      leg(-12, -85, -18, -45, -20, 0),
    ),
    // spear coming down
    pose(
      head(8, -182),
      torso(4, -127, 54, 42, 90, 0.12),
      arm(28, -167, 52, -148, 72, -108),
      arm(-20, -167, -5, -148, 20, -108),
      leg(12, -85, 20, -44, 20, 0),
      leg(-12, -85, -14, -46, -16, 0),
    ),
    // impact: spear driven into ground
    pose(
      head(12, -178),
      torso(6, -123, 54, 42, 90, 0.16),
      arm(30, -163, 58, -128, 80, -82),
      arm(-18, -163, 8, -128, 30, -82),
      leg(12, -85, 22, -42, 22, 0),
      leg(-12, -85, -14, -48, -18, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- light_low: low spear poke at legs (3 frames) --
  light_low: [
    // startup: dip spear low
    pose(
      head(3, -183),
      torso(-1, -130, 54, 42, 90, 0.04),
      arm(23, -170, 30, -140, 22, -110),
      arm(-25, -170, -36, -148, -32, -125),
      leg(12, -85, 18, -45, 16, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
    // low poke extended
    pose(
      head(6, -182),
      torso(3, -128, 54, 42, 90, 0.1),
      arm(26, -168, 52, -110, 80, -40),
      arm(-22, -168, -34, -146, -28, -122),
      leg(12, -85, 20, -44, 18, 0),
      leg(-12, -85, -16, -46, -16, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- med_low: crouching spear sweep (3 frames) --
  med_low: [
    // startup: crouch and pull spear back
    pose(
      head(2, -172),
      torso(0, -120, 54, 42, 84, 0.08),
      arm(24, -158, 28, -130, 12, -105),
      arm(-24, -158, -36, -138, -32, -115),
      leg(12, -78, 20, -42, 18, 0),
      leg(-12, -78, -18, -42, -18, 0),
    ),
    // low sweep: spear sweeps at ankle level
    pose(
      head(8, -170),
      torso(4, -118, 54, 42, 84, 0.16),
      arm(28, -156, 56, -108, 88, -75),
      arm(-20, -156, -30, -134, -24, -112),
      leg(12, -78, 22, -40, 20, 0),
      leg(-12, -78, -18, -44, -20, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- heavy_low: trip with spear butt (4 frames) --
  heavy_low: [
    // windup: crouch, spear inverted
    pose(
      head(0, -155),
      torso(-3, -105, 56, 44, 75, -0.1),
      arm(24, -138, 8, -120, -12, -108),
      arm(-24, -138, -36, -118, -34, -98),
      leg(14, -68, 26, -35, 22, 0),
      leg(-14, -68, -26, -35, -24, 0),
    ),
    // sweep: spear butt sweeps at ground level
    pose(
      head(10, -150),
      torso(5, -100, 56, 44, 75, 0.18),
      arm(28, -133, 56, -82, 84, -18),
      arm(-20, -133, -30, -112, -22, -92),
      leg(14, -68, 30, -30, 28, 0),
      leg(-14, -68, -24, -38, -26, 0),
    ),
    // hold
    pose(
      head(12, -148),
      torso(6, -98, 56, 44, 75, 0.2),
      arm(30, -131, 60, -78, 88, -14),
      arm(-18, -131, -28, -110, -20, -90),
      leg(14, -68, 32, -28, 30, 0),
      leg(-14, -68, -24, -38, -26, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- spear_lunge: long-range piercing thrust (3 frames) --
  spear_lunge: [
    // startup: pull spear far back, lean back
    pose(
      head(-3, -186),
      torso(-6, -131, 54, 42, 90, -0.12),
      arm(22, -170, 2, -155, -18, -145),
      arm(-26, -170, -40, -150, -36, -130),
      leg(12, -85, 16, -45, 12, 0),
      leg(-12, -85, -20, -45, -22, 0),
    ),
    // lunge: body drives forward, spear extends max range
    pose(
      head(20, -178),
      torso(14, -124, 54, 42, 90, 0.18),
      arm(38, -164, 70, -148, 105, -140),
      arm(-10, -164, -22, -142, -16, -118),
      leg(12, -85, 34, -48, 40, 0),
      leg(-12, -85, -6, -42, -8, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- lance_charge: rushing charge with spear couched (3 frames) --
  lance_charge: [
    // couch spear: tuck under arm, lean forward
    pose(
      head(8, -180),
      torso(4, -126, 54, 42, 90, 0.1),
      arm(28, -166, 42, -148, 55, -138),
      arm(-20, -166, -15, -148, 0, -138),
      leg(12, -85, 20, -46, 18, 0),
      leg(-12, -85, -18, -46, -20, 0),
    ),
    // charge forward: full extension
    pose(
      head(18, -176),
      torso(14, -122, 54, 42, 90, 0.18),
      arm(36, -162, 60, -144, 90, -135),
      arm(-8, -162, 12, -144, 30, -135),
      leg(12, -85, 34, -48, 40, 0),
      leg(-12, -85, -4, -42, -6, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- spear_vault: vault over spear for anti-air kick (4 frames) --
  spear_vault: [
    // plant spear into ground
    pose(
      head(5, -180),
      torso(2, -126, 54, 42, 88, 0.06),
      arm(26, -166, 40, -130, 45, -80),
      arm(-22, -166, -10, -130, 0, -80),
      leg(12, -82, 20, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
    // vault up: body rising
    pose(
      head(10, -200),
      torso(6, -148, 54, 42, 86, 0.1),
      arm(28, -186, 42, -155, 45, -100),
      arm(-20, -186, -8, -155, 0, -100),
      leg(12, -104, 30, -90, 45, -75),
      leg(-12, -104, -16, -80, -20, -65),
    ),
    // kick at peak
    pose(
      head(8, -210),
      torso(4, -158, 54, 42, 86, 0.05),
      arm(26, -196, 40, -168, 42, -120),
      arm(-22, -196, -10, -168, -5, -120),
      leg(12, -114, 38, -100, 60, -90),
      leg(-12, -114, -20, -88, -24, -70),
    ),
    // recovery landing
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- lance_sweep: 360 spear spin (3 frames) --
  lance_sweep: [
    // wind up: spear held wide
    pose(
      head(0, -184),
      torso(-2, -130, 54, 42, 90, -0.06),
      arm(22, -170, 8, -160, -12, -155),
      arm(-26, -170, -42, -148, -55, -140),
      leg(12, -85, 18, -45, 16, 0),
      leg(-12, -85, -18, -45, -18, 0),
    ),
    // spin: spear sweeps in a full arc
    pose(
      head(10, -180),
      torso(6, -126, 54, 42, 90, 0.14),
      arm(30, -166, 62, -138, 95, -118),
      arm(-18, -166, -10, -138, 10, -118),
      leg(12, -85, 22, -44, 22, 0),
      leg(-12, -85, -16, -46, -18, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- rising_lance: upward spear thrust, anti-air (4 frames) --
  rising_lance: [
    // crouch to gather power
    pose(
      head(2, -148),
      torso(0, -100, 56, 44, 72),
      arm(24, -132, 28, -108, 18, -88),
      arm(-24, -132, -36, -115, -32, -95),
      leg(14, -64, 28, -32, 24, 0),
      leg(-14, -64, -26, -34, -26, 0),
    ),
    // thrust upward: rising with spear pointed to sky
    pose(
      head(8, -178),
      torso(4, -124, 54, 42, 86, 0.08),
      arm(28, -164, 45, -170, 52, -200),
      arm(-20, -164, -10, -170, -5, -195),
      leg(12, -82, 20, -44, 18, 0),
      leg(-12, -82, -16, -44, -16, 0),
    ),
    // peak: airborne with spear high
    pose(
      head(6, -202),
      torso(2, -150, 54, 42, 86, 0.05),
      arm(26, -188, 40, -200, 46, -232),
      arm(-22, -188, -6, -200, -2, -228),
      leg(12, -106, 20, -82, 18, -62),
      leg(-12, -106, -16, -78, -18, -58),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- spear_throw: ranged projectile throw (3 frames) --
  spear_throw: [
    // wind up: arm cocked back
    pose(
      head(-2, -186),
      torso(-5, -131, 54, 42, 90, -0.12),
      arm(20, -170, 0, -175, -18, -180),
      arm(-28, -170, -42, -150, -38, -128),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -18, -45, -20, 0),
    ),
    // throw: arm whips forward, releasing spear
    pose(
      head(12, -180),
      torso(8, -126, 54, 42, 90, 0.15),
      arm(32, -166, 60, -148, 85, -140, true),
      arm(-16, -166, -28, -142, -22, -118),
      leg(12, -85, 24, -44, 24, 0),
      leg(-12, -85, -14, -48, -18, 0),
    ),
    // recovery: hand empty
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125, true),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- counter_stance: parry with spear shaft (3 frames) --
  counter_stance: [
    // guard: spear held horizontal, blocking
    pose(
      head(2, -186),
      torso(-2, -131, 54, 42, 90, -0.04),
      arm(24, -170, 40, -155, 55, -145),
      arm(-24, -170, -10, -155, 5, -145),
      leg(12, -85, 16, -46, 14, 0),
      leg(-12, -85, -18, -46, -18, 0),
    ),
    // deflect: spear swings to parry
    pose(
      head(6, -184),
      torso(2, -129, 54, 42, 90, 0.06),
      arm(26, -169, 48, -152, 65, -138),
      arm(-22, -169, 0, -152, 18, -138),
      leg(12, -85, 18, -44, 16, 0),
      leg(-12, -85, -16, -46, -16, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- spear_whirlwind: spinning spear attack (3 frames) --
  spear_whirlwind: [
    // wind up
    pose(
      head(-2, -184),
      torso(-4, -130, 54, 42, 90, -0.1),
      arm(20, -170, 5, -165, -15, -162),
      arm(-28, -170, -45, -148, -58, -138),
      leg(12, -85, 18, -45, 16, 0),
      leg(-12, -85, -18, -45, -18, 0),
    ),
    // full spin: arms extended, spear tracing a circle
    pose(
      head(8, -182),
      torso(4, -128, 54, 42, 90, 0.12),
      arm(28, -168, 58, -142, 90, -125),
      arm(-20, -168, -5, -142, 15, -125),
      leg(12, -85, 22, -44, 22, 0),
      leg(-12, -85, -16, -46, -18, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- grab: spear shaft choke (3 frames) --
  grab: [
    // reach: both arms extend to grab
    pose(
      head(8, -184),
      torso(4, -129, 54, 42, 90, 0.06),
      arm(26, -169, 48, -155, 66, -145, true),
      arm(-22, -169, -8, -150, 12, -140, true),
      leg(12, -85, 20, -44, 20, 0),
      leg(-12, -85, -14, -46, -16, 0),
    ),
    // choke: pin with spear shaft across throat
    pose(
      head(12, -182),
      torso(8, -127, 54, 42, 90, 0.12),
      arm(30, -167, 55, -148, 65, -135),
      arm(-18, -167, 8, -148, 30, -135),
      leg(12, -85, 22, -42, 22, 0),
      leg(-12, -85, -14, -48, -18, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- block_stand (1 frame: spear shaft held across body) --
  block_stand: [
    pose(
      head(0, -186),
      torso(-3, -131, 54, 42, 90, -0.05),
      arm(22, -171, 36, -155, 45, -142),
      arm(-26, -171, -8, -155, 8, -142),
      leg(12, -85, 16, -46, 14, 0),
      leg(-12, -85, -18, -46, -18, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched behind spear) --
  block_crouch: [
    pose(
      head(-2, -132),
      torso(-4, -88, 56, 46, 70, -0.06),
      arm(22, -118, 34, -100, 42, -85),
      arm(-26, -118, -6, -100, 10, -85),
      leg(14, -53, 26, -26, 20, 0),
      leg(-14, -53, -26, -26, -22, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-8, -182),
      torso(-6, -128, 54, 42, 90, -0.12),
      arm(18, -168, 6, -148, -6, -130),
      arm(-30, -168, -46, -145, -50, -120),
      leg(12, -85, 8, -44, 2, 0),
      leg(-12, -85, -20, -46, -24, 0),
    ),
    pose(
      head(-12, -180),
      torso(-10, -126, 54, 42, 90, -0.18),
      arm(14, -166, 0, -145, -14, -128),
      arm(-34, -166, -50, -142, -56, -118),
      leg(12, -85, 4, -42, -2, 0),
      leg(-12, -85, -24, -48, -28, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    pose(
      head(-15, -140),
      torso(-12, -95, 54, 42, 80, -0.35),
      arm(10, -130, -7, -110, -22, -95),
      arm(-36, -130, -50, -108, -56, -88),
      leg(12, -55, 18, -28, 22, 0),
      leg(-12, -55, -22, -30, -28, 0),
    ),
    pose(
      head(-50, -20),
      torso(-25, -18, 54, 42, 90, -1.5),
      arm(-5, -35, -25, -22, -45, -15),
      arm(-45, -10, -60, -5, -70, 0),
      leg(12, -10, 28, -5, 42, 0),
      leg(-12, -10, -6, -5, 3, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground) --
  get_up: [
    pose(
      head(-20, -90),
      torso(-12, -60, 54, 42, 70, -0.4),
      arm(8, -90, 18, -55, 22, -30),
      arm(-32, -90, -42, -55, -40, -28),
      leg(12, -25, 22, -12, 20, 0),
      leg(-12, -25, -20, -14, -18, 0),
    ),
    pose(
      head(2, -170),
      torso(-2, -118, 54, 42, 85, -0.08),
      arm(22, -156, 32, -135, 26, -115),
      arm(-26, -156, -38, -138, -34, -118),
      leg(12, -75, 18, -40, 16, 0),
      leg(-12, -75, -18, -40, -16, 0),
    ),
  ],

  // -- victory (2 frames: spear raised in salute) --
  victory: [
    pose(
      head(4, -190),
      torso(0, -132, 54, 42, 90),
      arm(24, -172, 34, -192, 38, -222),
      arm(-24, -172, -36, -150, -28, -130),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
    pose(
      head(4, -192),
      torso(0, -134, 54, 42, 90),
      arm(24, -174, 32, -196, 36, -228),
      arm(-24, -174, -38, -155, -32, -135),
      leg(12, -85, 18, -45, 16, 0),
      leg(-12, -85, -18, -45, -16, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed with spear dropped) --
  defeat: [
    pose(
      head(-55, -18),
      torso(-28, -16, 54, 42, 90, -1.55),
      arm(-8, -32, -28, -18, -50, -10),
      arm(-48, -8, -65, -2, -75, 2),
      leg(12, -8, 30, -3, 45, 0),
      leg(-12, -8, -3, -3, 6, 0),
    ),
  ],

  // -- cross_spear: lunging cross-body spear strike (3 frames) --
  cross_spear: [
    pose(
      head(-2, -184),
      torso(-4, -130, 54, 42, 90, -0.1),
      arm(20, -170, 5, -165, -15, -160),
      arm(-28, -170, -42, -155, -50, -140),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -16, 0),
    ),
    pose(
      head(14, -178),
      torso(10, -124, 54, 42, 90, 0.16),
      arm(34, -164, 64, -140, 98, -122),
      arm(-14, -164, 10, -140, 35, -122),
      leg(12, -85, 28, -46, 32, 0),
      leg(-12, -85, -10, -44, -12, 0),
    ),
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],

  // -- overhead_impale: overhead power thrust downward (3 frames) --
  overhead_impale: [
    // raise spear overhead
    pose(
      head(0, -188),
      torso(-2, -132, 54, 42, 90, -0.06),
      arm(24, -172, 22, -190, 20, -218),
      arm(-24, -172, -18, -190, -16, -214),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -16, 0),
    ),
    // slam down: full-force overhead
    pose(
      head(12, -176),
      torso(8, -122, 54, 42, 90, 0.2),
      arm(32, -162, 58, -130, 75, -80),
      arm(-16, -162, 8, -130, 22, -80),
      leg(12, -85, 24, -42, 24, 0),
      leg(-12, -85, -14, -48, -18, 0),
    ),
    // recovery
    pose(
      head(4, -185),
      torso(0, -130, 54, 42, 90),
      arm(24, -170, 36, -148, 32, -125),
      arm(-24, -170, -36, -148, -30, -120),
      leg(12, -85, 16, -45, 14, 0),
      leg(-12, -85, -16, -45, -14, 0),
    ),
  ],
};

// ---- Draw extras (spear, armor details, yellow cloak) ----------------------

/**
 * Draw Lancelot's yellow cloak behind the body (called before skeleton).
 */
export function drawLancelotBackExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const cloakColor = pal.accent ?? 0xddcc44;
  const cloakDark = 0xbb9922;

  if (p.torso && p.backArm) {
    const cloakTop = p.torso.y - p.torso.height / 2;
    const cloakX = p.torso.x - p.torso.topWidth / 2 - 3;
    const cloakBottom = p.torso.y + p.torso.height / 2 + 25;
    const cloakMid = (cloakTop + cloakBottom) / 2;

    // Main cloak body — flowing yellow fabric
    g.moveTo(cloakX + 6, cloakTop);
    g.quadraticCurveTo(cloakX - 22, cloakMid - 8, cloakX - 15, cloakBottom);
    g.lineTo(cloakX + 8, cloakBottom - 5);
    g.quadraticCurveTo(cloakX - 10, cloakMid, cloakX + 6, cloakTop + 4);
    g.closePath();
    g.fill({ color: cloakColor, alpha: 0.75 });

    // Inner fold shadow
    g.moveTo(cloakX + 2, cloakTop + 10);
    g.quadraticCurveTo(cloakX - 12, cloakMid + 5, cloakX - 6, cloakBottom - 8);
    g.stroke({ color: cloakDark, width: 1.5, alpha: 0.4 });

    // Second fold on right side for wider cloak look
    const rX = p.torso.x + p.torso.topWidth / 2 + 2;
    g.moveTo(rX - 4, cloakTop + 2);
    g.quadraticCurveTo(rX + 10, cloakMid - 5, rX + 5, cloakBottom - 10);
    g.lineTo(rX - 2, cloakBottom - 12);
    g.quadraticCurveTo(rX + 4, cloakMid, rX - 4, cloakTop + 6);
    g.closePath();
    g.fill({ color: cloakColor, alpha: 0.55 });
  }
}

export function drawLancelotExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const shaftColor = pal.weapon ?? 0xaabb88;
  const spearheadColor = pal.weaponAccent ?? 0xccccdd;
  const armorColor = pal.body ?? 0x7788aa;
  const armorHighlight = 0x99aabb;
  const armorShadow = 0x556677;
  const cloakColor = pal.accent ?? 0xddcc44;

  // --- Armor detail overlays on torso ---
  if (p.torso) {
    const t = p.torso;

    // Shoulder pauldrons — slightly more ornate than Arthur's
    const lsx = t.x - t.topWidth / 2 - 5;
    const rsx = t.x + t.topWidth / 2 + 5;
    const sy = t.y - t.height / 2 - 2;

    // Left pauldron
    g.roundRect(lsx - 9, sy - 4, 20, 15, 5);
    g.fill({ color: armorColor });
    g.roundRect(lsx - 9, sy - 4, 20, 15, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(lsx - 5, sy + 4);
    g.lineTo(lsx + 9, sy + 4);
    g.stroke({ color: armorShadow, width: 1 });
    // Gold trim on pauldron
    g.moveTo(lsx - 7, sy - 2);
    g.lineTo(lsx + 9, sy - 2);
    g.stroke({ color: cloakColor, width: 1.5, alpha: 0.6 });

    // Right pauldron
    g.roundRect(rsx - 11, sy - 4, 20, 15, 5);
    g.fill({ color: armorColor });
    g.roundRect(rsx - 11, sy - 4, 20, 15, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(rsx - 7, sy + 4);
    g.lineTo(rsx + 7, sy + 4);
    g.stroke({ color: armorShadow, width: 1 });
    // Gold trim
    g.moveTo(rsx - 9, sy - 2);
    g.lineTo(rsx + 7, sy - 2);
    g.stroke({ color: cloakColor, width: 1.5, alpha: 0.6 });

    // Chest plate line detail
    g.moveTo(t.x, t.y - t.height / 2 + 6);
    g.lineTo(t.x, t.y + t.height / 2 - 10);
    g.stroke({ color: armorHighlight, width: 1, alpha: 0.4 });

    // Horizontal armor segment
    g.moveTo(t.x - t.topWidth / 3, t.y - 4);
    g.lineTo(t.x + t.topWidth / 3, t.y - 4);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.5 });

    // Gold fleur-de-lis emblem hint on chest (simplified as a diamond)
    g.moveTo(t.x, t.y - t.height / 2 + 12);
    g.lineTo(t.x + 5, t.y - t.height / 2 + 18);
    g.lineTo(t.x, t.y - t.height / 2 + 24);
    g.lineTo(t.x - 5, t.y - t.height / 2 + 18);
    g.closePath();
    g.fill({ color: cloakColor, alpha: 0.7 });
  }

  // --- Knee guards ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 8, ky - 6, 16, 12, 4);
    g.fill({ color: armorColor });
    g.roundRect(kx - 8, ky - 6, 16, 12, 4);
    g.stroke({ color: armorHighlight, width: 1 });
  }
  if (p.backLeg) {
    const kx = p.backLeg.kneeX;
    const ky = p.backLeg.kneeY;
    g.roundRect(kx - 7, ky - 5, 14, 10, 3);
    g.fill({ color: armorShadow });
    g.roundRect(kx - 7, ky - 5, 14, 10, 3);
    g.stroke({ color: armorColor, width: 1 });
  }

  // --- Boot detail ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    g.moveTo(fx - 6, fy - 8);
    g.lineTo(fx + 8, fy - 8);
    g.stroke({ color: 0x332211, width: 2 });
    g.roundRect(fx - 1, fy - 10, 5, 5, 1);
    g.fill({ color: cloakColor });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 5, fy - 7);
    g.lineTo(fx + 7, fy - 7);
    g.stroke({ color: 0x332211, width: 1.5 });
    g.roundRect(fx, fy - 9, 4, 4, 1);
    g.fill({ color: cloakColor });
  }

  // --- Elbow guard on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    g.circle(ex, ey, 6);
    g.fill({ color: armorColor });
    g.circle(ex, ey, 6);
    g.stroke({ color: armorHighlight, width: 1 });
    // Rivet
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx, my, 2);
    g.fill({ color: armorHighlight });
  }

  // --- Spear in front arm ---
  if (p.frontArm) {
    const hx = p.frontArm.handX;
    const hy = p.frontArm.handY;
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;

    // Direction: extend from hand away from elbow
    const dx = hx - ex;
    const dy = hy - ey;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len > 0 ? dx / len : 1;
    const ny = len > 0 ? dy / len : 0;

    // Spear shaft — longer than a sword
    const shaftForward = 68;
    const shaftBack = 22;
    const tipX = hx + nx * shaftForward;
    const tipY = hy + ny * shaftForward;
    const buttX = hx - nx * shaftBack;
    const buttY = hy - ny * shaftBack;

    // Shaft outline
    g.moveTo(buttX, buttY);
    g.lineTo(tipX, tipY);
    g.stroke({ color: 0x222233, width: 6, cap: "round" });

    // Shaft fill (ash wood)
    g.moveTo(buttX, buttY);
    g.lineTo(tipX, tipY);
    g.stroke({ color: shaftColor, width: 4, cap: "round" });

    // Wood grain line
    g.moveTo(buttX + ny * 0.5, buttY - nx * 0.5);
    g.lineTo(tipX + ny * 0.5, tipY - nx * 0.5);
    g.stroke({ color: 0x889966, width: 1, cap: "round", alpha: 0.3 });

    // --- Spearhead (leaf-shaped steel tip) ---
    const spearLen = 20;
    const spearTipX = tipX + nx * spearLen;
    const spearTipY = tipY + ny * spearLen;
    const spearW = 6;

    // Spearhead outline
    g.moveTo(tipX, tipY);
    g.lineTo(tipX + ny * spearW, tipY - nx * spearW);
    g.lineTo(spearTipX, spearTipY);
    g.lineTo(tipX - ny * spearW, tipY + nx * spearW);
    g.closePath();
    g.fill({ color: 0x222233 });

    // Spearhead fill
    const inset = 1.5;
    g.moveTo(tipX + nx * inset, tipY + ny * inset);
    g.lineTo(tipX + ny * (spearW - inset), tipY - nx * (spearW - inset));
    g.lineTo(spearTipX - nx * inset, spearTipY - ny * inset);
    g.lineTo(tipX - ny * (spearW - inset), tipY + nx * (spearW - inset));
    g.closePath();
    g.fill({ color: spearheadColor });

    // Spearhead highlight (center ridge)
    g.moveTo(tipX + nx * 3, tipY + ny * 3);
    g.lineTo(spearTipX - nx * 2, spearTipY - ny * 2);
    g.stroke({ color: 0xeeeeff, width: 1.5, cap: "round", alpha: 0.7 });

    // --- Yellow pennant / banner below spearhead ---
    const pennantX = tipX + nx * 2;
    const pennantY = tipY + ny * 2;
    const perpX = ny;
    const perpY = -nx;
    const flagLen = 16;
    const flagW = 10;

    g.moveTo(pennantX, pennantY);
    g.lineTo(pennantX + perpX * flagW + nx * flagLen * 0.3, pennantY + perpY * flagW + ny * flagLen * 0.3);
    g.lineTo(pennantX + nx * flagLen * 0.15, pennantY + ny * flagLen * 0.15 + perpY * flagW * 0.5);
    g.lineTo(pennantX + perpX * flagW * 0.8 + nx * flagLen * 0.6, pennantY + perpY * flagW * 0.8 + ny * flagLen * 0.6);
    g.lineTo(pennantX + nx * flagLen * 0.5, pennantY + ny * flagLen * 0.5);
    g.closePath();
    g.fill({ color: cloakColor, alpha: 0.85 });

    // Pennant border
    g.moveTo(pennantX, pennantY);
    g.lineTo(pennantX + perpX * flagW + nx * flagLen * 0.3, pennantY + perpY * flagW + ny * flagLen * 0.3);
    g.stroke({ color: 0xbb9922, width: 1, alpha: 0.6 });

    // --- Butt cap (steel end cap on shaft butt) ---
    const capX = buttX - nx * 3;
    const capY = buttY - ny * 3;
    g.circle(capX, capY, 4);
    g.fill({ color: 0x222233 });
    g.circle(capX, capY, 3);
    g.fill({ color: spearheadColor });
  }

  // --- Helm visor detail (Lancelot has an open-face helm with gold trim) ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;
    // Gold trim around helm
    g.moveTo(hx - 10, hy - hr + 4);
    g.lineTo(hx + 12, hy - hr + 4);
    g.stroke({ color: cloakColor, width: 2, cap: "round" });
    // Small crest — gold-tipped spike
    g.moveTo(hx + 1, hy - hr + 2);
    g.lineTo(hx + 1, hy - hr - 10);
    g.stroke({ color: cloakColor, width: 3, cap: "round" });
    g.circle(hx + 1, hy - hr - 10, 2);
    g.fill({ color: cloakColor });
  }
}
