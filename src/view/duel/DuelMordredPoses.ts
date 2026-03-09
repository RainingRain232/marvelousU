// ---------------------------------------------------------------------------
// Mordred — The Usurper
// Skeleton pose data for the duel fighting game.
// Black armor, jagged dark sword, dark twisted crown, spiked pauldrons,
// tattered dark red cape. Aggressive hunched-forward stance.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const MORDRED_PALETTE: FighterPalette = {
  skin: 0xccaa88,
  body: 0x222233,        // black armor
  pants: 0x111122,       // very dark leggings
  shoes: 0x111111,       // black boots
  hair: 0x110000,        // dark red/black
  eyes: 0xcc2222,        // red eyes
  outline: 0x0a0a15,     // near-black outline
  gloves: 0x222233,      // dark gauntlets
  belt: 0x331111,        // dark red-brown belt
  accent: 0x880000,      // dark red cape
  weapon: 0x444455,      // dark blade steel
  weaponAccent: 0xcc2222, // red gems/accents
};

// ---- Poses -----------------------------------------------------------------

export const MORDRED_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, aggressive hunched-forward stance, subtle sway) --
  idle: [
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),        // front: sword held forward aggressively
      arm(-24, -166, -36, -144, -28, -120),      // back: fist clenched at side
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
    pose(
      head(8, -179),
      torso(4, -125, 58, 46, 88, 0.06),
      arm(28, -165, 42, -141, 36, -117),
      arm(-24, -165, -36, -143, -28, -119),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
    pose(
      head(8, -178),
      torso(4, -124, 58, 46, 88, 0.06),
      arm(28, -164, 42, -140, 36, -116),
      arm(-24, -164, -36, -142, -28, -118),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
    pose(
      head(8, -179),
      torso(4, -125, 58, 46, 88, 0.06),
      arm(28, -165, 42, -141, 36, -117),
      arm(-24, -165, -36, -143, -28, -119),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- walk_forward (4 frames, aggressive prowling stride) --
  walk_forward: [
    pose(
      head(10, -180),
      torso(6, -126, 58, 46, 88, 0.08),
      arm(30, -166, 44, -144, 40, -120),
      arm(-22, -166, -32, -140, -24, -116),
      leg(16, -82, 30, -46, 32, 0),
      leg(-12, -82, -6, -40, -18, 0),
    ),
    pose(
      head(12, -179),
      torso(8, -125, 58, 46, 88, 0.1),
      arm(32, -165, 46, -142, 42, -118),
      arm(-20, -165, -28, -138, -20, -114),
      leg(16, -82, 22, -42, 16, 0),
      leg(-12, -82, -12, -42, -12, 0),
    ),
    pose(
      head(10, -180),
      torso(6, -126, 58, 46, 88, 0.08),
      arm(30, -166, 42, -144, 38, -120),
      arm(-22, -166, -34, -140, -28, -116),
      leg(16, -82, 0, -40, -14, 0),
      leg(-12, -82, 24, -46, 28, 0),
    ),
    pose(
      head(8, -179),
      torso(4, -125, 58, 46, 88, 0.06),
      arm(28, -165, 40, -142, 36, -118),
      arm(-24, -165, -36, -138, -30, -114),
      leg(16, -82, 16, -42, 16, 0),
      leg(-12, -82, -12, -42, -12, 0),
    ),
  ],

  // -- walk_back (4 frames, guarded backward step) --
  walk_back: [
    pose(
      head(6, -180),
      torso(2, -126, 58, 46, 88, 0.02),
      arm(26, -166, 38, -148, 30, -128),
      arm(-26, -166, -40, -146, -36, -122),
      leg(16, -82, 10, -46, -4, 0),
      leg(-12, -82, -22, -40, -26, 0),
    ),
    pose(
      head(4, -179),
      torso(0, -125, 58, 46, 88, 0.0),
      arm(24, -165, 36, -146, 28, -126),
      arm(-28, -165, -42, -144, -38, -120),
      leg(16, -82, 16, -42, 16, 0),
      leg(-12, -82, -12, -42, -12, 0),
    ),
    pose(
      head(6, -180),
      torso(2, -126, 58, 46, 88, 0.02),
      arm(26, -166, 38, -148, 30, -128),
      arm(-26, -166, -40, -146, -36, -122),
      leg(16, -82, 26, -40, 28, 0),
      leg(-12, -82, -6, -46, 8, 0),
    ),
    pose(
      head(4, -179),
      torso(0, -125, 58, 46, 88, 0.0),
      arm(24, -165, 36, -146, 28, -126),
      arm(-28, -165, -42, -144, -38, -120),
      leg(16, -82, 16, -42, 16, 0),
      leg(-12, -82, -12, -42, -12, 0),
    ),
  ],

  // -- crouch (1 frame, low menacing crouch) --
  crouch: [
    pose(
      head(6, -126),
      torso(4, -82, 60, 48, 68, 0.1),
      arm(28, -112, 38, -88, 34, -68),
      arm(-24, -112, -32, -92, -26, -72),
      leg(18, -48, 30, -24, 24, 0),
      leg(-14, -48, -26, -24, -20, 0),
    ),
  ],

  // -- jump (2 frames: leap up, peak with sword raised menacingly) --
  jump: [
    pose(
      head(8, -186),
      torso(4, -134, 58, 46, 86, 0.06),
      arm(28, -172, 46, -162, 54, -182),
      arm(-24, -172, -34, -152, -26, -136),
      leg(16, -90, 24, -66, 20, -46),
      leg(-12, -90, -20, -64, -16, -44),
    ),
    pose(
      head(8, -192),
      torso(4, -140, 58, 46, 86, 0.06),
      arm(28, -178, 48, -172, 58, -196),
      arm(-24, -178, -36, -156, -28, -140),
      leg(16, -96, 26, -70, 30, -52),
      leg(-12, -96, -18, -62, -22, -48),
    ),
  ],

  // -- light_high: vicious quick stab (3 frames) --
  light_high: [
    // startup: pull sword back, coil
    pose(
      head(6, -180),
      torso(2, -126, 58, 46, 88, -0.04),
      arm(26, -166, 18, -144, 4, -132),
      arm(-26, -166, -36, -144, -30, -122),
      leg(16, -82, 20, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
    // extended stab: sword arm thrust forward
    pose(
      head(12, -178),
      torso(8, -124, 58, 46, 88, 0.1),
      arm(32, -164, 58, -150, 90, -146),
      arm(-20, -164, -32, -142, -26, -118),
      leg(16, -82, 22, -42, 20, 0),
      leg(-12, -82, -16, -44, -16, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- med_high: savage horizontal cleave (3 frames) --
  med_high: [
    // startup: sword drawn back high
    pose(
      head(4, -181),
      torso(0, -126, 58, 46, 88, -0.1),
      arm(26, -166, 12, -168, -8, -172),
      arm(-26, -166, -38, -144, -32, -122),
      leg(16, -82, 22, -44, 20, 0),
      leg(-12, -82, -16, -44, -18, 0),
    ),
    // savage horizontal cleave: wide arc
    pose(
      head(14, -177),
      torso(8, -123, 58, 46, 88, 0.14),
      arm(32, -163, 62, -144, 92, -126),
      arm(-20, -163, -32, -140, -24, -116),
      leg(16, -82, 24, -42, 22, 0),
      leg(-12, -82, -16, -44, -18, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 44, -142, 38, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- heavy_high: brutal overhead chop (4 frames) --
  heavy_high: [
    // windup: sword raised high overhead
    pose(
      head(2, -182),
      torso(-2, -127, 58, 46, 88, -0.08),
      arm(26, -167, 24, -184, 20, -208),
      arm(-26, -167, -38, -148, -34, -126),
      leg(16, -82, 22, -44, 20, 0),
      leg(-12, -82, -18, -44, -20, 0),
    ),
    // downward chop: sword crashing down
    pose(
      head(12, -177),
      torso(6, -122, 58, 46, 88, 0.16),
      arm(30, -162, 56, -146, 76, -106),
      arm(-22, -162, -30, -140, -22, -114),
      leg(16, -82, 24, -42, 24, 0),
      leg(-12, -82, -14, -44, -16, 0),
    ),
    // impact: sword low, body committed forward
    pose(
      head(16, -174),
      torso(10, -119, 58, 46, 88, 0.2),
      arm(34, -159, 64, -126, 84, -84),
      arm(-18, -159, -28, -136, -20, -110),
      leg(16, -82, 26, -40, 26, 0),
      leg(-12, -82, -14, -46, -18, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- light_low: shin hack (3 frames) --
  light_low: [
    // startup: lift leg
    pose(
      head(6, -180),
      torso(2, -128, 58, 46, 88, 0.02),
      arm(26, -168, 38, -146, 30, -126),
      arm(-26, -168, -38, -144, -34, -122),
      leg(16, -82, 30, -52, 32, -28),
      leg(-12, -82, -18, -44, -20, 0),
    ),
    // kick extended low
    pose(
      head(4, -179),
      torso(0, -127, 58, 46, 88, -0.04),
      arm(24, -167, 36, -144, 28, -124),
      arm(-28, -167, -40, -142, -36, -120),
      leg(16, -82, 44, -50, 72, -28),
      leg(-12, -82, -20, -42, -22, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- med_low: crouching dark blade thrust (3 frames) --
  med_low: [
    // startup: crouch, pull sword back
    pose(
      head(6, -170),
      torso(4, -118, 58, 46, 82, 0.1),
      arm(28, -156, 32, -126, 18, -102),
      arm(-24, -156, -36, -134, -32, -112),
      leg(16, -76, 24, -40, 22, 0),
      leg(-12, -76, -18, -40, -18, 0),
    ),
    // low thrust: sword thrust forward and low
    pose(
      head(12, -167),
      torso(8, -114, 58, 46, 82, 0.18),
      arm(32, -152, 58, -106, 88, -76),
      arm(-20, -152, -32, -130, -26, -108),
      leg(16, -76, 26, -38, 24, 0),
      leg(-12, -76, -18, -42, -20, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- heavy_low: dark sweep launcher (4 frames) --
  heavy_low: [
    // windup: crouch deep, wind sword to back
    pose(
      head(4, -150),
      torso(0, -100, 60, 48, 72, -0.08),
      arm(28, -132, 14, -120, -12, -112),
      arm(-24, -132, -38, -116, -36, -96),
      leg(18, -64, 30, -32, 26, 0),
      leg(-14, -64, -26, -32, -24, 0),
    ),
    // sweep: sword sweeps low across the ground
    pose(
      head(14, -146),
      torso(8, -96, 60, 48, 72, 0.22),
      arm(34, -128, 62, -80, 88, -18),
      arm(-18, -128, -30, -110, -22, -90),
      leg(18, -64, 34, -28, 32, 0),
      leg(-14, -64, -24, -36, -26, 0),
    ),
    // hold: sword extended at ground level
    pose(
      head(16, -144),
      torso(10, -94, 60, 48, 72, 0.24),
      arm(36, -126, 66, -76, 94, -12),
      arm(-16, -126, -28, -108, -20, -88),
      leg(18, -64, 36, -26, 34, 0),
      leg(-14, -64, -24, -36, -26, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- dark_thrust: lunging forward dark stab (3 frames) --
  dark_thrust: [
    // startup: pull sword way back, lean back
    pose(
      head(0, -181),
      torso(-2, -127, 58, 46, 88, -0.14),
      arm(24, -167, 8, -152, -12, -142),
      arm(-26, -167, -40, -148, -36, -126),
      leg(16, -82, 20, -44, 16, 0),
      leg(-12, -82, -20, -44, -22, 0),
    ),
    // lunge: body drives forward, sword fully extended with dark energy
    pose(
      head(22, -175),
      torso(16, -121, 58, 46, 88, 0.18),
      arm(40, -161, 68, -144, 98, -136),
      arm(-8, -161, -22, -138, -14, -114),
      leg(16, -82, 34, -46, 40, 0),
      leg(-12, -82, -6, -40, -8, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- treachery_cleave: devastating overhead (4 frames) --
  treachery_cleave: [
    // big windup: sword held high behind head
    pose(
      head(0, -183),
      torso(-4, -128, 58, 46, 88, -0.12),
      arm(24, -168, 16, -188, 8, -212),
      arm(-26, -168, -40, -152, -38, -132),
      leg(16, -82, 22, -44, 20, 0),
      leg(-12, -82, -18, -44, -20, 0),
    ),
    // overhead slam: sword crashing down with dark power
    pose(
      head(14, -174),
      torso(8, -120, 58, 46, 88, 0.22),
      arm(34, -160, 58, -136, 74, -90),
      arm(-18, -160, -28, -136, -20, -110),
      leg(16, -82, 26, -40, 26, 0),
      leg(-12, -82, -14, -46, -18, 0),
    ),
    // impact hold: sword slammed into ground
    pose(
      head(18, -170),
      torso(12, -116, 58, 46, 88, 0.26),
      arm(36, -156, 66, -110, 82, -56),
      arm(-16, -156, -26, -132, -18, -106),
      leg(16, -82, 28, -38, 30, 0),
      leg(-12, -82, -14, -48, -20, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- shadow_sweep: ground-level dark sweep (3 frames) --
  shadow_sweep: [
    // startup: drop low
    pose(
      head(6, -144),
      torso(4, -96, 60, 48, 70, 0.08),
      arm(28, -128, 22, -106, 8, -96),
      arm(-24, -128, -36, -112, -32, -92),
      leg(18, -60, 32, -30, 28, 0),
      leg(-14, -60, -26, -32, -26, 0),
    ),
    // ground sweep: sword sweeps at ankle height
    pose(
      head(16, -140),
      torso(10, -92, 60, 48, 70, 0.26),
      arm(36, -124, 64, -66, 94, -8),
      arm(-16, -124, -28, -106, -20, -86),
      leg(18, -60, 38, -26, 36, 0),
      leg(-14, -60, -24, -34, -28, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- usurper_rise: anti-air rising slash (4 frames) --
  usurper_rise: [
    // crouch startup: coil low with dark energy
    pose(
      head(6, -144),
      torso(4, -96, 60, 48, 70, 0.04),
      arm(28, -128, 32, -104, 22, -86),
      arm(-24, -128, -36, -112, -32, -92),
      leg(18, -60, 32, -30, 28, 0),
      leg(-14, -60, -26, -32, -26, 0),
    ),
    // upward slash: rising, sword sweeping up
    pose(
      head(12, -170),
      torso(8, -118, 58, 46, 84, 0.1),
      arm(32, -158, 54, -152, 68, -182),
      arm(-20, -158, -32, -136, -26, -114),
      leg(16, -76, 24, -42, 22, 0),
      leg(-12, -76, -16, -42, -16, 0),
    ),
    // peak: airborne, sword high
    pose(
      head(10, -196),
      torso(6, -144, 58, 46, 84, 0.08),
      arm(30, -182, 46, -192, 52, -218),
      arm(-22, -182, -34, -164, -28, -146),
      leg(16, -100, 24, -76, 22, -58),
      leg(-12, -100, -16, -72, -18, -52),
    ),
    // recovery: landing
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- grab: iron grip (3 frames) --
  grab: [
    // reach: both arms extend forward to seize
    pose(
      head(12, -179),
      torso(8, -125, 58, 46, 88, 0.1),
      arm(32, -165, 54, -152, 72, -142, true),
      arm(-20, -165, -6, -146, 18, -136, true),
      leg(16, -82, 24, -42, 24, 0),
      leg(-12, -82, -14, -44, -16, 0),
    ),
    // crush: gripping and slamming
    pose(
      head(16, -177),
      torso(12, -123, 58, 46, 88, 0.16),
      arm(34, -163, 56, -148, 64, -132),
      arm(-18, -163, 8, -142, 38, -132),
      leg(16, -82, 26, -40, 26, 0),
      leg(-12, -82, -14, -46, -18, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- dark_charge: rushing forward with dark energy (3 frames) --
  dark_charge: [
    // crouch behind sword
    pose(
      head(4, -176),
      torso(0, -124, 58, 46, 88, -0.06),
      arm(26, -164, 32, -146, 24, -132),
      arm(-26, -164, -8, -148, 12, -138),
      leg(16, -82, 22, -44, 20, 0),
      leg(-12, -82, -18, -44, -20, 0),
    ),
    // lunging forward with dark energy
    pose(
      head(20, -173),
      torso(16, -120, 58, 46, 88, 0.18),
      arm(38, -160, 54, -144, 60, -128),
      arm(-8, -160, 16, -144, 44, -134),
      leg(16, -82, 34, -46, 40, 0),
      leg(-12, -82, -6, -40, -8, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- betrayal_blade: massive upward swing (4 frames) --
  betrayal_blade: [
    // deep crouch gathering dark power
    pose(
      head(4, -144),
      torso(0, -96, 60, 48, 70, -0.04),
      arm(28, -128, 20, -104, 8, -86),
      arm(-24, -128, -36, -112, -32, -92),
      leg(18, -60, 30, -30, 26, 0),
      leg(-14, -60, -26, -30, -24, 0),
    ),
    // explosive upward slash
    pose(
      head(14, -180),
      torso(10, -126, 58, 46, 88, 0.14),
      arm(34, -166, 54, -172, 64, -206),
      arm(-18, -166, -28, -144, -22, -120),
      leg(16, -82, 24, -42, 24, 0),
      leg(-12, -82, -14, -44, -16, 0),
    ),
    // peak: airborne, sword high
    pose(
      head(12, -200),
      torso(8, -148, 58, 46, 86, 0.1),
      arm(32, -186, 46, -200, 52, -236),
      arm(-20, -186, -34, -168, -28, -150),
      leg(16, -104, 24, -78, 22, -58),
      leg(-12, -104, -16, -74, -18, -54),
    ),
    // recovery landing
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- doom_slash: wide cross pattern slash (3 frames, reuses similar to cross_slash) --
  doom_slash: [
    // windup: sword drawn high to one side
    pose(
      head(2, -182),
      torso(-2, -127, 58, 46, 88, -0.1),
      arm(26, -167, 14, -172, -6, -178),
      arm(-26, -167, -38, -148, -34, -126),
      leg(16, -82, 22, -44, 20, 0),
      leg(-12, -82, -16, -44, -18, 0),
    ),
    // cross slash: wide X pattern
    pose(
      head(14, -176),
      torso(8, -122, 58, 46, 88, 0.16),
      arm(34, -162, 62, -140, 92, -118),
      arm(-18, -162, -28, -138, -20, -114),
      leg(16, -82, 26, -42, 26, 0),
      leg(-12, -82, -14, -44, -16, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- dark_parry: counter stance with dark riposte (3 frames, reuses parry pattern) --
  dark_parry: [
    // parry stance: sword held vertically in front
    pose(
      head(4, -182),
      torso(-2, -128, 58, 46, 88, -0.06),
      arm(26, -168, 32, -156, 26, -142),
      arm(-26, -168, -14, -154, 6, -144),
      leg(16, -82, 20, -44, 18, 0),
      leg(-12, -82, -18, -44, -18, 0),
    ),
    // counter strike: explosive riposte forward
    pose(
      head(16, -176),
      torso(10, -122, 58, 46, 88, 0.18),
      arm(34, -162, 60, -146, 88, -132),
      arm(-18, -162, -28, -140, -20, -116),
      leg(16, -82, 26, -42, 26, 0),
      leg(-12, -82, -14, -44, -16, 0),
    ),
    // recovery
    pose(
      head(8, -180),
      torso(4, -126, 58, 46, 88, 0.06),
      arm(28, -166, 42, -142, 36, -118),
      arm(-24, -166, -36, -144, -28, -120),
      leg(16, -82, 22, -44, 18, 0),
      leg(-12, -82, -16, -44, -14, 0),
    ),
  ],

  // -- block_stand (1 frame: sword held defensively in front) --
  block_stand: [
    pose(
      head(2, -181),
      torso(-2, -127, 58, 46, 88, -0.04),
      arm(26, -167, 32, -152, 26, -138),
      arm(-26, -167, -12, -152, 6, -142),
      leg(16, -82, 20, -44, 18, 0),
      leg(-12, -82, -18, -44, -18, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched with sword guarding) --
  block_crouch: [
    pose(
      head(2, -128),
      torso(0, -84, 60, 48, 68, -0.04),
      arm(26, -114, 30, -96, 24, -78),
      arm(-26, -114, -10, -98, 8, -88),
      leg(18, -50, 30, -24, 24, 0),
      leg(-14, -50, -26, -24, -22, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-4, -178),
      torso(-4, -124, 58, 46, 88, -0.14),
      arm(22, -164, 10, -144, -2, -126),
      arm(-30, -164, -46, -142, -50, -118),
      leg(16, -82, 12, -42, 6, 0),
      leg(-12, -82, -20, -44, -24, 0),
    ),
    pose(
      head(-8, -176),
      torso(-8, -122, 58, 46, 88, -0.2),
      arm(18, -162, 4, -142, -10, -124),
      arm(-34, -162, -50, -140, -56, -116),
      leg(16, -82, 8, -40, 2, 0),
      leg(-12, -82, -24, -46, -28, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    // falling
    pose(
      head(-12, -136),
      torso(-10, -92, 58, 46, 78, -0.38),
      arm(14, -126, -2, -106, -18, -92),
      arm(-36, -126, -50, -104, -56, -84),
      leg(16, -52, 22, -26, 26, 0),
      leg(-12, -52, -22, -28, -28, 0),
    ),
    // lying on ground
    pose(
      head(-48, -18),
      torso(-22, -16, 58, 46, 88, -1.52),
      arm(-2, -32, -22, -20, -42, -12),
      arm(-42, -8, -58, -4, -68, 2),
      leg(16, -8, 32, -4, 48, 0),
      leg(-12, -8, -6, -4, 8, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground menacingly) --
  get_up: [
    // pushing up
    pose(
      head(-16, -86),
      torso(-8, -56, 58, 46, 68, -0.42),
      arm(14, -86, 22, -52, 28, -28),
      arm(-32, -86, -42, -52, -40, -26),
      leg(16, -22, 26, -10, 24, 0),
      leg(-12, -22, -20, -12, -18, 0),
    ),
    // nearly standing, hunched aggressively
    pose(
      head(6, -166),
      torso(2, -114, 58, 46, 83, -0.06),
      arm(26, -152, 36, -132, 30, -112),
      arm(-26, -152, -38, -134, -34, -114),
      leg(16, -72, 22, -38, 20, 0),
      leg(-12, -72, -18, -38, -16, 0),
    ),
  ],

  // -- victory (2 frames: sword planted in ground, menacing pose) --
  victory: [
    // plant sword down, stand tall
    pose(
      head(8, -186),
      torso(4, -130, 58, 46, 90, 0.04),
      arm(28, -170, 48, -140, 58, -100),           // sword arm pointing down
      arm(-24, -170, -34, -148, -26, -128),
      leg(16, -84, 20, -44, 18, 0),
      leg(-12, -84, -16, -44, -14, 0),
    ),
    // triumphant hold: arms wide, asserting dominance
    pose(
      head(8, -188),
      torso(4, -132, 58, 46, 90, 0.04),
      arm(28, -172, 50, -138, 60, -96),
      arm(-24, -172, -44, -150, -52, -130),
      leg(16, -84, 22, -44, 20, 0),
      leg(-12, -84, -18, -44, -16, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed, sword fallen away) --
  defeat: [
    pose(
      head(-52, -16),
      torso(-26, -14, 58, 46, 88, -1.56),
      arm(-6, -30, -26, -16, -48, -8),
      arm(-46, -6, -62, -2, -72, 4),
      leg(16, -6, 34, -2, 50, 0),
      leg(-12, -6, -4, -2, 10, 0),
    ),
  ],
};

// ---- Draw extras (jagged dark sword, twisted crown, spiked pauldrons) ------

/**
 * Draw Mordred's tattered dark red cape behind the body (called before skeleton).
 */
export function drawMordredBackExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const capeColor = pal.accent ?? 0x880000;

  if (p.torso && p.backArm) {
    const capeTop = p.torso.y - p.torso.height / 2;
    const capeX = p.torso.x - p.torso.topWidth / 2 - 2;
    const capeBottom = p.torso.y + p.torso.height / 2 + 20;
    const capeMid = (capeTop + capeBottom) / 2;

    // Tattered dark cape — wider and more ragged than Arthur's
    g.moveTo(capeX, capeTop);
    g.quadraticCurveTo(capeX - 22, capeMid - 5, capeX - 14, capeBottom);
    // Jagged tattered bottom edge
    g.lineTo(capeX - 8, capeBottom - 6);
    g.lineTo(capeX - 2, capeBottom + 3);
    g.lineTo(capeX + 4, capeBottom - 4);
    g.lineTo(capeX + 8, capeBottom + 1);
    g.lineTo(capeX + 10, capeBottom - 5);
    g.quadraticCurveTo(capeX - 6, capeMid + 5, capeX + 4, capeTop + 4);
    g.closePath();
    g.fill({ color: capeColor, alpha: 0.75 });

    // Dark inner shadow on cape
    g.moveTo(capeX + 1, capeTop + 6);
    g.quadraticCurveTo(capeX - 16, capeMid, capeX - 8, capeBottom - 4);
    g.lineTo(capeX - 2, capeBottom - 8);
    g.quadraticCurveTo(capeX - 10, capeMid, capeX + 2, capeTop + 8);
    g.closePath();
    g.fill({ color: 0x220000, alpha: 0.3 });
  }
}

/**
 * Draw Mordred's jagged dark sword, twisted crown/helm, and spiked pauldrons.
 */
export function drawMordredExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const weaponColor = pal.weapon ?? 0x444455;
  const gemColor = pal.weaponAccent ?? 0xcc2222;
  const armorColor = pal.body ?? 0x222233;
  const armorHighlight = 0x333344;
  const armorShadow = 0x111122;

  // --- Dark armor detail overlays on torso ---
  if (p.torso) {
    const t = p.torso;
    const lsx = t.x - t.topWidth / 2 - 4;
    const rsx = t.x + t.topWidth / 2 + 4;
    const sy = t.y - t.height / 2 - 2;

    // Left spiked pauldron
    g.roundRect(lsx - 10, sy - 4, 20, 16, 3);
    g.fill({ color: armorColor });
    g.roundRect(lsx - 10, sy - 4, 20, 16, 3);
    g.stroke({ color: armorHighlight, width: 1 });
    // Spike on left pauldron
    g.moveTo(lsx - 6, sy - 4);
    g.lineTo(lsx - 2, sy - 16);
    g.lineTo(lsx + 2, sy - 4);
    g.closePath();
    g.fill({ color: armorColor });
    g.moveTo(lsx - 6, sy - 4);
    g.lineTo(lsx - 2, sy - 16);
    g.lineTo(lsx + 2, sy - 4);
    g.stroke({ color: armorHighlight, width: 1 });
    // Second smaller spike
    g.moveTo(lsx + 4, sy - 3);
    g.lineTo(lsx + 6, sy - 10);
    g.lineTo(lsx + 8, sy - 3);
    g.closePath();
    g.fill({ color: armorColor });

    // Right spiked pauldron
    g.roundRect(rsx - 10, sy - 4, 20, 16, 3);
    g.fill({ color: armorColor });
    g.roundRect(rsx - 10, sy - 4, 20, 16, 3);
    g.stroke({ color: armorHighlight, width: 1 });
    // Spike on right pauldron
    g.moveTo(rsx - 2, sy - 4);
    g.lineTo(rsx + 2, sy - 16);
    g.lineTo(rsx + 6, sy - 4);
    g.closePath();
    g.fill({ color: armorColor });
    g.moveTo(rsx - 2, sy - 4);
    g.lineTo(rsx + 2, sy - 16);
    g.lineTo(rsx + 6, sy - 4);
    g.stroke({ color: armorHighlight, width: 1 });
    // Second smaller spike
    g.moveTo(rsx - 8, sy - 3);
    g.lineTo(rsx - 6, sy - 10);
    g.lineTo(rsx - 4, sy - 3);
    g.closePath();
    g.fill({ color: armorColor });

    // Dark chest plate line detail
    g.moveTo(t.x, t.y - t.height / 2 + 6);
    g.lineTo(t.x, t.y + t.height / 2 - 10);
    g.stroke({ color: armorHighlight, width: 1, alpha: 0.3 });

    // Horizontal dark armor segment
    g.moveTo(t.x - t.topWidth / 3, t.y - 4);
    g.lineTo(t.x + t.topWidth / 3, t.y - 4);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.5 });

    // Red gem on chest
    g.circle(t.x, t.y - t.height / 4, 3);
    g.fill({ color: gemColor });
    g.circle(t.x, t.y - t.height / 4, 3);
    g.stroke({ color: 0x330000, width: 1 });
  }

  // --- Knee guards on legs (dark spiked) ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 8, ky - 6, 16, 12, 3);
    g.fill({ color: armorColor });
    g.roundRect(kx - 8, ky - 6, 16, 12, 3);
    g.stroke({ color: armorHighlight, width: 1 });
    // Small spike on knee guard
    g.moveTo(kx - 2, ky - 6);
    g.lineTo(kx, ky - 12);
    g.lineTo(kx + 2, ky - 6);
    g.closePath();
    g.fill({ color: armorColor });
  }
  if (p.backLeg) {
    const kx = p.backLeg.kneeX;
    const ky = p.backLeg.kneeY;
    g.roundRect(kx - 7, ky - 5, 14, 10, 3);
    g.fill({ color: armorShadow });
    g.roundRect(kx - 7, ky - 5, 14, 10, 3);
    g.stroke({ color: armorColor, width: 1 });
  }

  // --- Dark boot detail ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    g.moveTo(fx - 6, fy - 8);
    g.lineTo(fx + 8, fy - 8);
    g.stroke({ color: 0x220000, width: 2 });
    // Dark buckle
    g.roundRect(fx - 1, fy - 10, 5, 5, 1);
    g.fill({ color: armorColor });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 5, fy - 7);
    g.lineTo(fx + 7, fy - 7);
    g.stroke({ color: 0x220000, width: 1.5 });
    g.roundRect(fx, fy - 9, 4, 4, 1);
    g.fill({ color: armorColor });
  }

  // --- Gauntlet detail on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    // Spiked elbow guard
    g.circle(ex, ey, 6);
    g.fill({ color: armorColor });
    g.circle(ex, ey, 6);
    g.stroke({ color: armorHighlight, width: 1 });
    // Small elbow spike
    g.moveTo(ex - 2, ey - 5);
    g.lineTo(ex, ey - 11);
    g.lineTo(ex + 2, ey - 5);
    g.closePath();
    g.fill({ color: armorColor });
    // Dark rivet
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx, my, 2);
    g.fill({ color: armorHighlight });
  }

  // --- Jagged dark sword in front arm ---
  if (p.frontArm) {
    const hx = p.frontArm.handX;
    const hy = p.frontArm.handY;
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;

    // Blade direction: extend from hand away from elbow
    const dx = hx - ex;
    const dy = hy - ey;
    const len = Math.sqrt(dx * dx + dy * dy);
    const bladeLen = 54;
    const nx = len > 0 ? dx / len : 1;
    const ny = len > 0 ? dy / len : 0;
    const tipX = hx + nx * bladeLen;
    const tipY = hy + ny * bladeLen;

    // Perpendicular for jagged edges
    const px = -ny;
    const py = nx;

    // Jagged blade outline (dark, wider than Arthur's)
    g.moveTo(hx + px * 4, hy + py * 4);
    // Jagged edge points along the blade
    g.lineTo(hx + nx * bladeLen * 0.2 + px * 5, hy + ny * bladeLen * 0.2 + py * 5);
    g.lineTo(hx + nx * bladeLen * 0.3 + px * 3, hy + ny * bladeLen * 0.3 + py * 3);
    g.lineTo(hx + nx * bladeLen * 0.5 + px * 6, hy + ny * bladeLen * 0.5 + py * 6);
    g.lineTo(hx + nx * bladeLen * 0.6 + px * 3, hy + ny * bladeLen * 0.6 + py * 3);
    g.lineTo(hx + nx * bladeLen * 0.8 + px * 4, hy + ny * bladeLen * 0.8 + py * 4);
    g.lineTo(tipX, tipY);
    // Return along other edge with jagged points
    g.lineTo(hx + nx * bladeLen * 0.8 - px * 4, hy + ny * bladeLen * 0.8 - py * 4);
    g.lineTo(hx + nx * bladeLen * 0.6 - px * 2, hy + ny * bladeLen * 0.6 - py * 2);
    g.lineTo(hx + nx * bladeLen * 0.5 - px * 5, hy + ny * bladeLen * 0.5 - py * 5);
    g.lineTo(hx + nx * bladeLen * 0.3 - px * 2, hy + ny * bladeLen * 0.3 - py * 2);
    g.lineTo(hx + nx * bladeLen * 0.2 - px * 4, hy + ny * bladeLen * 0.2 - py * 4);
    g.lineTo(hx - px * 3, hy - py * 3);
    g.closePath();
    g.fill({ color: 0x0a0a15 });

    // Blade fill (dark steel)
    g.moveTo(hx + px * 3, hy + py * 3);
    g.lineTo(hx + nx * bladeLen * 0.2 + px * 4, hy + ny * bladeLen * 0.2 + py * 4);
    g.lineTo(hx + nx * bladeLen * 0.3 + px * 2, hy + ny * bladeLen * 0.3 + py * 2);
    g.lineTo(hx + nx * bladeLen * 0.5 + px * 5, hy + ny * bladeLen * 0.5 + py * 5);
    g.lineTo(hx + nx * bladeLen * 0.6 + px * 2, hy + ny * bladeLen * 0.6 + py * 2);
    g.lineTo(hx + nx * bladeLen * 0.8 + px * 3, hy + ny * bladeLen * 0.8 + py * 3);
    g.lineTo(tipX, tipY);
    g.lineTo(hx + nx * bladeLen * 0.8 - px * 3, hy + ny * bladeLen * 0.8 - py * 3);
    g.lineTo(hx + nx * bladeLen * 0.6 - px * 1, hy + ny * bladeLen * 0.6 - py * 1);
    g.lineTo(hx + nx * bladeLen * 0.5 - px * 4, hy + ny * bladeLen * 0.5 - py * 4);
    g.lineTo(hx + nx * bladeLen * 0.3 - px * 1, hy + ny * bladeLen * 0.3 - py * 1);
    g.lineTo(hx + nx * bladeLen * 0.2 - px * 3, hy + ny * bladeLen * 0.2 - py * 3);
    g.lineTo(hx - px * 2, hy - py * 2);
    g.closePath();
    g.fill({ color: weaponColor });

    // Dark blade fuller (red glowing groove)
    const fullerStart = 0.15;
    const fullerEnd = 0.75;
    g.moveTo(hx + nx * bladeLen * fullerStart, hy + ny * bladeLen * fullerStart);
    g.lineTo(hx + nx * bladeLen * fullerEnd, hy + ny * bladeLen * fullerEnd);
    g.stroke({ color: gemColor, width: 1.5, cap: "round", alpha: 0.5 });

    // Dark blade edge highlight
    g.moveTo(hx + py * 1, hy - px * 1);
    g.lineTo(tipX + py * 1, tipY - px * 1);
    g.stroke({ color: 0x666677, width: 1, cap: "round", alpha: 0.5 });

    // Crossguard (dark with red gems, perpendicular to blade)
    const guardLen = 14;
    const gx1 = hx + py * guardLen;
    const gy1 = hy - px * guardLen;
    const gx2 = hx - py * guardLen;
    const gy2 = hy + px * guardLen;

    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: 0x0a0a15, width: 8, cap: "round" });
    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: armorColor, width: 6, cap: "round" });

    // Red gem on each crossguard end
    g.circle(gx1, gy1, 3);
    g.fill({ color: gemColor });
    g.circle(gx1, gy1, 1.5);
    g.fill({ color: 0xff4444 });
    g.circle(gx2, gy2, 3);
    g.fill({ color: gemColor });
    g.circle(gx2, gy2, 1.5);
    g.fill({ color: 0xff4444 });

    // Pommel (dark with red gem)
    const pommelX = hx - nx * 8;
    const pommelY = hy - ny * 8;
    g.circle(pommelX, pommelY, 5);
    g.fill({ color: 0x0a0a15 });
    g.circle(pommelX, pommelY, 4);
    g.fill({ color: armorColor });
    g.circle(pommelX - nx * 0.5, pommelY - ny * 0.5, 2);
    g.fill({ color: gemColor });
  }

  // --- Dark twisted crown/helm (drawn over the head) ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;

    // Dark twisted crown with jagged points
    const crownBase = hy - hr + 3;
    // Left spike
    g.moveTo(hx - 12, crownBase);
    g.lineTo(hx - 10, crownBase - 14);
    g.lineTo(hx - 7, crownBase);
    g.closePath();
    g.fill({ color: armorColor });
    // Center spike (tallest)
    g.moveTo(hx - 4, crownBase);
    g.lineTo(hx, crownBase - 20);
    g.lineTo(hx + 4, crownBase);
    g.closePath();
    g.fill({ color: armorColor });
    // Right spike
    g.moveTo(hx + 7, crownBase);
    g.lineTo(hx + 10, crownBase - 14);
    g.lineTo(hx + 12, crownBase);
    g.closePath();
    g.fill({ color: armorColor });

    // Crown band
    g.moveTo(hx - 14, crownBase + 2);
    g.lineTo(hx + 14, crownBase + 2);
    g.stroke({ color: armorColor, width: 4 });
    g.moveTo(hx - 14, crownBase + 2);
    g.lineTo(hx + 14, crownBase + 2);
    g.stroke({ color: armorHighlight, width: 2 });

    // Red gem in center of crown band
    g.circle(hx, crownBase + 2, 2.5);
    g.fill({ color: gemColor });
    g.circle(hx, crownBase + 2, 1.2);
    g.fill({ color: 0xff4444 });

    // Helm visor slit (menacing)
    g.moveTo(hx - 8, hy - 2);
    g.lineTo(hx + 8, hy - 2);
    g.stroke({ color: 0x0a0a15, width: 2 });
    // Red eye glow behind visor
    g.moveTo(hx - 5, hy - 2);
    g.lineTo(hx + 5, hy - 2);
    g.stroke({ color: gemColor, width: 1, alpha: 0.6 });
  }
}
