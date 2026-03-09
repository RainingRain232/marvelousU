// ---------------------------------------------------------------------------
// Duel mode – Morgan le Fay (The Fay Enchantress) skeleton pose data
// Dark mage with staff, dark magic, illusions. Flowing dark robes, black hair.
// ---------------------------------------------------------------------------

import { Graphics } from "pixi.js";
import {
  FighterPose,
  FighterPalette,
  pose,
  arm,
  leg,
  torso,
  head,
} from "./DuelSkeletonRenderer";

// ---- Palette ---------------------------------------------------------------

export const MORGAN_PALETTE: FighterPalette = {
  skin: 0xddccbb,
  body: 0x442266,        // dark purple robes
  pants: 0x331155,
  shoes: 0x332244,
  hair: 0x111111,        // black
  eyes: 0xaa44ff,        // purple glowing
  outline: 0x111122,
  gloves: 0x553377,
  belt: 0x664422,
  accent: 0x8844cc,      // purple magic glow
  weapon: 0x553322,      // staff dark wood
  weaponAccent: 0xaa44ff, // crystal purple
};

// ---- Poses -----------------------------------------------------------------

export const MORGAN_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, subtle sway, staff held vertically) -------------------
  idle: [
    pose(
      head(0, -183),
      torso(0, -128, 50, 44, 88, 0),
      arm(20, -168, 28, -143, 23, -118, false),
      arm(-20, -168, -26, -146, -18, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    pose(
      head(0, -184),
      torso(0, -129, 50, 44, 88, 0),
      arm(20, -169, 29, -144, 24, -119, false),
      arm(-20, -169, -25, -147, -17, -124, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    pose(
      head(0, -182),
      torso(0, -127, 50, 44, 88, 0),
      arm(20, -167, 27, -142, 22, -117, false),
      arm(-20, -167, -27, -145, -19, -122, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    pose(
      head(0, -183),
      torso(0, -128, 50, 44, 88, 0),
      arm(20, -168, 28, -143, 23, -118, false),
      arm(-20, -168, -26, -146, -18, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- walk_forward (4 frames, robed stride) ---------------------------------
  walk_forward: [
    pose(
      head(2, -183),
      torso(2, -128, 50, 44, 88, 0.03),
      arm(22, -168, 30, -144, 26, -118, false),
      arm(-18, -168, -24, -144, -16, -120, false),
      leg(13, -83, 21, -44, 27, 0),
      leg(-9, -83, -17, -43, -23, 0),
    ),
    pose(
      head(4, -182),
      torso(4, -127, 50, 44, 88, 0.05),
      arm(24, -167, 32, -142, 28, -116, false),
      arm(-16, -167, -22, -142, -14, -118, false),
      leg(15, -83, 17, -41, 13, 0),
      leg(-7, -83, -11, -46, -7, 0),
    ),
    pose(
      head(2, -183),
      torso(2, -128, 50, 44, 88, 0.03),
      arm(22, -168, 30, -144, 26, -118, false),
      arm(-18, -168, -24, -144, -16, -120, false),
      leg(13, -83, 7, -43, -5, 0),
      leg(-9, -83, -3, -44, 7, 0),
    ),
    pose(
      head(4, -182),
      torso(4, -127, 50, 44, 88, 0.05),
      arm(24, -167, 32, -142, 28, -116, false),
      arm(-16, -167, -22, -142, -14, -118, false),
      leg(15, -83, 23, -44, 29, 0),
      leg(-7, -83, -15, -43, -21, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious backward step) --------------------------
  walk_back: [
    pose(
      head(-2, -183),
      torso(-2, -128, 50, 44, 88, -0.03),
      arm(18, -168, 26, -144, 22, -118, false),
      arm(-22, -168, -28, -146, -22, -124, false),
      leg(9, -83, 5, -44, -1, 0),
      leg(-13, -83, -19, -43, -27, 0),
    ),
    pose(
      head(-4, -182),
      torso(-4, -127, 50, 44, 88, -0.05),
      arm(16, -167, 24, -142, 20, -116, false),
      arm(-24, -167, -30, -144, -24, -122, false),
      leg(7, -83, 13, -41, 17, 0),
      leg(-15, -83, -13, -46, -9, 0),
    ),
    pose(
      head(-2, -183),
      torso(-2, -128, 50, 44, 88, -0.03),
      arm(18, -168, 26, -144, 22, -118, false),
      arm(-22, -168, -28, -146, -22, -124, false),
      leg(9, -83, 1, -43, -7, 0),
      leg(-13, -83, -7, -44, 1, 0),
    ),
    pose(
      head(-4, -182),
      torso(-4, -127, 50, 44, 88, -0.05),
      arm(16, -167, 24, -142, 20, -116, false),
      arm(-24, -167, -30, -144, -24, -122, false),
      leg(7, -83, -3, -44, -11, 0),
      leg(-15, -83, -21, -43, -29, 0),
    ),
  ],

  // -- crouch (1 frame, hunched over) ----------------------------------------
  crouch: [
    pose(
      head(4, -128),
      torso(2, -83, 50, 48, 68, 0.12),
      arm(22, -113, 30, -93, 28, -73, false),
      arm(-18, -113, -24, -93, -20, -76, false),
      leg(13, -48, 21, -24, 17, 0),
      leg(-9, -48, -17, -24, -13, 0),
    ),
  ],

  // -- jump (2 frames, robes flowing) ----------------------------------------
  jump: [
    // ascending
    pose(
      head(0, -188),
      torso(0, -133, 50, 48, 88, -0.05),
      arm(20, -173, 32, -156, 38, -138, true),
      arm(-20, -173, -28, -153, -23, -133, false),
      leg(11, -88, 17, -58, 23, -33),
      leg(-11, -88, -15, -63, -19, -38),
    ),
    // descending
    pose(
      head(0, -186),
      torso(0, -131, 50, 48, 88, 0.03),
      arm(20, -171, 28, -148, 24, -126, true),
      arm(-20, -171, -26, -150, -22, -130, false),
      leg(11, -86, 19, -53, 25, -23),
      leg(-11, -86, -17, -56, -21, -28),
    ),
  ],

  // -- light_high (3 frames: startup, staff poke forward, recovery) ----------
  light_high: [
    // startup: pull staff back
    pose(
      head(0, -183),
      torso(2, -128, 50, 44, 88, -0.05),
      arm(20, -168, 12, -148, 3, -133, false),
      arm(-20, -168, -26, -146, -18, -123, false),
      leg(11, -83, 15, -44, 17, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    // poke: staff extends far forward
    pose(
      head(4, -182),
      torso(6, -127, 50, 44, 88, 0.08),
      arm(22, -167, 48, -150, 88, -143, false),
      arm(-18, -167, -22, -144, -14, -120, false),
      leg(13, -83, 17, -43, 21, 0),
      leg(-9, -83, -15, -44, -19, 0),
    ),
    // recovery
    pose(
      head(2, -183),
      torso(2, -128, 50, 44, 88, 0.02),
      arm(20, -168, 34, -148, 38, -128, false),
      arm(-20, -168, -26, -146, -18, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- med_high (3 frames: startup, horizontal staff swing, recovery) --------
  med_high: [
    // startup: wind up to side
    pose(
      head(-2, -183),
      torso(0, -128, 50, 44, 88, -0.1),
      arm(20, -168, 8, -153, -7, -143, false),
      arm(-20, -168, -28, -146, -33, -128, false),
      leg(11, -83, 15, -44, 19, 0),
      leg(-11, -83, -15, -44, -19, 0),
    ),
    // swing: horizontal arc across
    pose(
      head(6, -181),
      torso(6, -126, 50, 44, 88, 0.12),
      arm(22, -166, 53, -153, 93, -146, false),
      arm(-18, -166, -16, -143, -8, -118, false),
      leg(13, -83, 19, -43, 23, 0),
      leg(-9, -83, -13, -44, -17, 0),
    ),
    // recovery
    pose(
      head(2, -183),
      torso(2, -128, 50, 44, 88, 0.03),
      arm(20, -168, 36, -148, 43, -130, false),
      arm(-20, -168, -24, -146, -18, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- heavy_high (4 frames: windup, overhead slam, impact, recovery) --------
  heavy_high: [
    // windup: raise staff overhead
    pose(
      head(0, -182),
      torso(-2, -128, 50, 44, 88, -0.08),
      arm(20, -168, 18, -188, 16, -208, false),
      arm(-20, -168, -18, -186, -16, -203, false),
      leg(11, -83, 15, -44, 19, 0),
      leg(-11, -83, -15, -44, -19, 0),
    ),
    // slam downward
    pose(
      head(6, -180),
      torso(6, -125, 50, 44, 88, 0.15),
      arm(22, -165, 48, -138, 78, -98, false),
      arm(-18, -165, -12, -140, -2, -116, false),
      leg(13, -83, 19, -42, 23, 0),
      leg(-9, -83, -13, -44, -17, 0),
    ),
    // impact: staff hits ground forward
    pose(
      head(8, -178),
      torso(8, -123, 50, 44, 88, 0.18),
      arm(24, -163, 56, -118, 88, -38, false),
      arm(-16, -163, -8, -136, 0, -108, false),
      leg(15, -83, 21, -41, 25, 0),
      leg(-7, -83, -11, -44, -15, 0),
    ),
    // recovery
    pose(
      head(4, -182),
      torso(4, -127, 50, 44, 88, 0.05),
      arm(22, -167, 36, -146, 38, -123, false),
      arm(-18, -167, -24, -144, -18, -120, false),
      leg(13, -83, 15, -43, 17, 0),
      leg(-9, -83, -13, -44, -15, 0),
    ),
  ],

  // -- light_low (3 frames: startup, low staff poke, recovery) ---------------
  light_low: [
    // startup: crouch slightly
    pose(
      head(2, -163),
      torso(2, -108, 50, 46, 78, 0.08),
      arm(20, -143, 28, -118, 26, -93, false),
      arm(-20, -143, -26, -120, -20, -98, false),
      leg(11, -68, 17, -37, 21, 0),
      leg(-11, -68, -15, -37, -17, 0),
    ),
    // low poke: extend staff at ankle height
    pose(
      head(6, -161),
      torso(6, -106, 50, 46, 78, 0.14),
      arm(22, -141, 48, -93, 88, -28, false),
      arm(-18, -141, -22, -116, -14, -93, false),
      leg(13, -68, 19, -35, 23, 0),
      leg(-9, -68, -15, -37, -17, 0),
    ),
    // recovery
    pose(
      head(2, -166),
      torso(2, -110, 50, 46, 80, 0.05),
      arm(20, -146, 34, -113, 36, -88, false),
      arm(-20, -146, -24, -120, -18, -98, false),
      leg(11, -70, 15, -37, 17, 0),
      leg(-11, -70, -13, -37, -15, 0),
    ),
  ],

  // -- med_low (3 frames: startup, staff sweep, recovery) --------------------
  med_low: [
    // startup: crouch with staff pulled back
    pose(
      head(0, -158),
      torso(0, -103, 50, 46, 76, -0.06),
      arm(20, -138, 10, -116, -2, -93, false),
      arm(-20, -138, -26, -118, -22, -96, false),
      leg(11, -64, 17, -35, 21, 0),
      leg(-11, -64, -17, -35, -19, 0),
    ),
    // sweep: staff arcs low across ground
    pose(
      head(8, -156),
      torso(8, -101, 50, 46, 76, 0.16),
      arm(24, -136, 54, -78, 98, -18, false),
      arm(-16, -136, -12, -113, -4, -88, false),
      leg(15, -64, 23, -33, 27, 0),
      leg(-7, -64, -13, -37, -15, 0),
    ),
    // recovery
    pose(
      head(4, -160),
      torso(4, -105, 50, 46, 78, 0.05),
      arm(22, -140, 36, -106, 40, -78, false),
      arm(-18, -140, -24, -118, -18, -96, false),
      leg(13, -66, 17, -35, 19, 0),
      leg(-9, -66, -15, -37, -17, 0),
    ),
  ],

  // -- heavy_low (4 frames: windup, ground slam, impact, recovery) -----------
  heavy_low: [
    // windup: raise staff high while crouching
    pose(
      head(0, -160),
      torso(0, -106, 50, 46, 78, -0.08),
      arm(20, -141, 18, -173, 16, -203, false),
      arm(-20, -141, -18, -168, -16, -198, false),
      leg(11, -66, 17, -35, 21, 0),
      leg(-11, -66, -17, -35, -19, 0),
    ),
    // slam down toward ground
    pose(
      head(6, -153),
      torso(6, -98, 50, 48, 74, 0.2),
      arm(22, -133, 46, -88, 73, -28, false),
      arm(-16, -133, -10, -103, 0, -73, false),
      leg(13, -62, 21, -33, 25, 0),
      leg(-9, -62, -15, -35, -17, 0),
    ),
    // impact: staff slams into ground with shadow burst
    pose(
      head(8, -148),
      torso(8, -93, 50, 50, 70, 0.25),
      arm(24, -128, 52, -63, 78, -3, false),
      arm(-16, -128, -8, -93, 2, -63, false),
      leg(15, -58, 23, -31, 27, 0),
      leg(-7, -58, -13, -33, -15, 0),
    ),
    // recovery
    pose(
      head(4, -160),
      torso(4, -105, 50, 46, 78, 0.06),
      arm(22, -140, 34, -113, 36, -83, false),
      arm(-18, -140, -24, -118, -18, -96, false),
      leg(13, -66, 17, -35, 19, 0),
      leg(-9, -66, -15, -35, -17, 0),
    ),
  ],

  // -- shadow_bolt (3 frames: staff raises, thrust forward casting, recovery)
  shadow_bolt: [
    // staff raises: gathering dark energy
    pose(
      head(-2, -184),
      torso(-2, -129, 50, 44, 88, -0.06),
      arm(20, -169, 22, -193, 24, -213, true),
      arm(-20, -169, -24, -188, -22, -208, true),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    // thrust forward: casting shadow bolt
    pose(
      head(6, -182),
      torso(6, -127, 50, 44, 88, 0.1),
      arm(22, -167, 53, -163, 93, -158, true),
      arm(-18, -167, -16, -146, -8, -123, false),
      leg(13, -83, 17, -43, 21, 0),
      leg(-9, -83, -15, -44, -19, 0),
    ),
    // recovery
    pose(
      head(2, -183),
      torso(2, -128, 50, 44, 88, 0.03),
      arm(20, -168, 32, -153, 36, -136, false),
      arm(-20, -168, -24, -146, -18, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- hex_strike (4 frames: raise, channel curse, strike down, recovery) ----
  hex_strike: [
    // raise staff skyward
    pose(
      head(0, -184),
      torso(0, -129, 50, 44, 88, -0.04),
      arm(20, -169, 24, -198, 28, -228, true),
      arm(-20, -169, -18, -193, -14, -220, true),
      leg(11, -83, 15, -44, 19, 0),
      leg(-11, -83, -15, -44, -19, 0),
    ),
    // channel hex energy
    pose(
      head(0, -186),
      torso(0, -131, 50, 44, 88, 0),
      arm(20, -171, 40, -193, 55, -213, true),
      arm(-20, -171, -38, -190, -50, -208, true),
      leg(11, -83, 17, -44, 21, 0),
      leg(-11, -83, -17, -44, -21, 0),
    ),
    // curse strikes down
    pose(
      head(4, -184),
      torso(4, -129, 50, 44, 88, 0.06),
      arm(22, -169, 44, -178, 58, -190, true),
      arm(-18, -169, -34, -175, -46, -185, true),
      leg(13, -83, 17, -44, 21, 0),
      leg(-9, -83, -15, -44, -19, 0),
    ),
    // recovery
    pose(
      head(0, -183),
      torso(0, -128, 50, 44, 88, 0),
      arm(20, -168, 28, -150, 26, -130, false),
      arm(-20, -168, -26, -148, -22, -126, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- dark_wave (3 frames: staff sweeps low, casting, recovery) -------------
  dark_wave: [
    // staff sweeps low: pulling back for low cast
    pose(
      head(0, -168),
      torso(2, -116, 50, 46, 82, 0.08),
      arm(20, -153, 16, -123, 10, -93, false),
      arm(-20, -153, -26, -128, -22, -103, false),
      leg(11, -74, 17, -39, 21, 0),
      leg(-11, -74, -15, -39, -17, 0),
    ),
    // casting: sweep staff forward at ground level
    pose(
      head(6, -166),
      torso(6, -114, 50, 46, 82, 0.15),
      arm(22, -151, 50, -88, 93, -23, true),
      arm(-18, -151, -14, -123, -6, -98, false),
      leg(13, -74, 19, -37, 23, 0),
      leg(-9, -74, -15, -39, -17, 0),
    ),
    // recovery
    pose(
      head(2, -170),
      torso(2, -118, 50, 46, 84, 0.04),
      arm(20, -156, 32, -123, 34, -93, false),
      arm(-20, -156, -24, -130, -20, -106, false),
      leg(11, -76, 15, -39, 17, 0),
      leg(-11, -76, -13, -39, -15, 0),
    ),
  ],

  // -- shadow_step (3 frames: crouch, vanish, reappear) ----------------------
  shadow_step: [
    // crouch: gathering shadow energy
    pose(
      head(0, -143),
      torso(0, -93, 50, 50, 70, 0),
      arm(20, -126, 14, -103, 8, -78, true),
      arm(-20, -126, -14, -103, -8, -78, true),
      leg(11, -57, 19, -29, 21, 0),
      leg(-11, -57, -19, -29, -21, 0),
    ),
    // vanish: body compressed in shadow
    pose(
      head(0, -118),
      torso(0, -73, 38, 34, 53, 0),
      arm(16, -98, 6, -78, -2, -63, false),
      arm(-16, -98, -6, -78, 2, -63, false),
      leg(9, -46, 7, -23, 5, 0),
      leg(-9, -46, -7, -23, -5, 0),
    ),
    // reappear: standing tall with dark aura
    pose(
      head(0, -186),
      torso(0, -130, 50, 44, 88, 0),
      arm(20, -170, 33, -156, 40, -138, true),
      arm(-20, -170, -33, -156, -40, -138, true),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- grab (3 frames: reach with staff, soul grip, recovery) ----------------
  grab: [
    // reach: extend staff to hook opponent
    pose(
      head(4, -182),
      torso(4, -127, 50, 44, 88, 0.08),
      arm(22, -167, 50, -156, 83, -148, false),
      arm(-18, -167, -22, -144, -16, -120, false),
      leg(13, -83, 17, -43, 21, 0),
      leg(-9, -83, -13, -44, -17, 0),
    ),
    // soul grip: dark energy pulls
    pose(
      head(6, -181),
      torso(6, -126, 50, 44, 88, 0.1),
      arm(22, -166, 46, -148, 68, -138, true),
      arm(-18, -166, -16, -143, -10, -118, false),
      leg(13, -83, 19, -42, 23, 0),
      leg(-9, -83, -13, -44, -17, 0),
    ),
    // recovery
    pose(
      head(2, -183),
      torso(2, -128, 50, 44, 88, 0.03),
      arm(20, -168, 32, -148, 36, -128, false),
      arm(-20, -168, -24, -146, -18, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- curse_storm (4 frames: raise, channel, storm peak, recovery) ----------
  curse_storm: [
    // raise staff skyward
    pose(
      head(0, -186),
      torso(0, -131, 50, 44, 88, -0.04),
      arm(20, -171, 26, -203, 32, -238, true),
      arm(-20, -171, -24, -198, -28, -230, true),
      leg(11, -83, 15, -44, 19, 0),
      leg(-11, -83, -15, -44, -19, 0),
    ),
    // channeling dark storm energy
    pose(
      head(0, -188),
      torso(0, -133, 50, 44, 88, 0),
      arm(20, -173, 44, -198, 60, -218, true),
      arm(-20, -173, -44, -196, -60, -213, true),
      leg(11, -83, 17, -44, 21, 0),
      leg(-11, -83, -17, -44, -21, 0),
    ),
    // storm peak: arms wide, energy surging
    pose(
      head(0, -190),
      torso(0, -135, 50, 44, 88, 0),
      arm(20, -175, 48, -202, 68, -222, true),
      arm(-20, -175, -48, -200, -68, -218, true),
      leg(11, -83, 19, -44, 23, 0),
      leg(-11, -83, -19, -44, -23, 0),
    ),
    // recovery
    pose(
      head(0, -183),
      torso(0, -128, 50, 44, 88, 0),
      arm(20, -168, 28, -150, 26, -130, false),
      arm(-20, -168, -26, -148, -22, -126, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- block_stand (1 frame, staff held across body) -------------------------
  block_stand: [
    pose(
      head(-2, -183),
      torso(-2, -128, 50, 44, 88, -0.06),
      arm(20, -168, 16, -146, 10, -123, false),
      arm(-20, -168, -16, -146, -10, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- block_crouch (1 frame, crouched behind staff) -------------------------
  block_crouch: [
    pose(
      head(-2, -130),
      torso(-2, -86, 50, 48, 70, -0.08),
      arm(20, -118, 14, -98, 8, -76, false),
      arm(-20, -118, -14, -98, -8, -76, false),
      leg(11, -50, 19, -25, 21, 0),
      leg(-11, -50, -19, -25, -21, 0),
    ),
  ],

  // -- hit_stun (2 frames, recoiling) ----------------------------------------
  hit_stun: [
    // reel back
    pose(
      head(-8, -180),
      torso(-6, -126, 50, 44, 88, -0.15),
      arm(16, -166, 8, -146, 3, -126, true),
      arm(-24, -166, -32, -148, -36, -128, true),
      leg(7, -83, 9, -44, 7, 0),
      leg(-15, -83, -19, -43, -23, 0),
    ),
    // stagger
    pose(
      head(-12, -178),
      torso(-10, -124, 50, 44, 88, -0.2),
      arm(12, -164, 4, -143, -2, -120, true),
      arm(-28, -164, -36, -146, -42, -126, true),
      leg(3, -83, 7, -46, 5, 0),
      leg(-19, -83, -23, -41, -27, 0),
    ),
  ],

  // -- knockdown (2 frames, falling then lying) ------------------------------
  knockdown: [
    // falling backward
    pose(
      head(-14, -148),
      torso(-10, -98, 50, 44, 78, -0.5),
      arm(8, -133, -2, -108, -10, -83, true),
      arm(-28, -133, -36, -110, -42, -88, true),
      leg(1, -58, 11, -33, 19, -8),
      leg(-21, -58, -17, -29, -11, -4),
    ),
    // lying on ground
    pose(
      head(-40, -18),
      torso(-20, -16, 50, 44, 88, -1.5),
      arm(6, -28, -12, -20, -32, -14, true),
      arm(-46, -28, -56, -16, -66, -10, true),
      leg(19, -13, 34, -8, 49, -4),
      leg(-9, -10, 6, -6, 21, -4),
    ),
  ],

  // -- get_up (2 frames, rising with staff) ----------------------------------
  get_up: [
    // pushing up with staff
    pose(
      head(-8, -98),
      torso(-4, -63, 50, 46, 68, -0.3),
      arm(16, -93, 26, -58, 33, -28, false),
      arm(-24, -93, -28, -63, -26, -33, false),
      leg(7, -28, 17, -14, 21, 0),
      leg(-15, -28, -13, -14, -9, 0),
    ),
    // standing up
    pose(
      head(-2, -173),
      torso(-2, -120, 50, 44, 84, -0.08),
      arm(18, -158, 26, -138, 24, -116, false),
      arm(-22, -158, -28, -140, -24, -118, false),
      leg(9, -78, 13, -41, 15, 0),
      leg(-13, -78, -13, -41, -15, 0),
    ),
  ],

  // -- victory (2 frames, staff raised with dark energy swirling) ------------
  victory: [
    // staff raised triumphantly
    pose(
      head(0, -186),
      torso(0, -131, 50, 44, 88, 0),
      arm(20, -171, 26, -198, 30, -228, true),
      arm(-20, -171, -28, -153, -33, -133, true),
      leg(11, -83, 15, -44, 19, 0),
      leg(-11, -83, -15, -44, -19, 0),
    ),
    // flourish: both arms wide with dark energy
    pose(
      head(0, -188),
      torso(0, -133, 50, 44, 88, 0),
      arm(20, -173, 40, -203, 48, -233, true),
      arm(-20, -173, -40, -198, -48, -223, true),
      leg(11, -83, 17, -44, 21, 0),
      leg(-11, -83, -17, -44, -21, 0),
    ),
  ],

  // -- defeat (1 frame, collapsed over staff) --------------------------------
  defeat: [
    pose(
      head(10, -53),
      torso(5, -38, 50, 46, 58, 0.6),
      arm(20, -60, 28, -33, 33, -8, true),
      arm(-10, -60, -16, -33, -20, -10, true),
      leg(13, -8, 23, -4, 29, 0),
      leg(-7, -8, -3, -4, 1, 0),
    ),
  ],
};

// ---- Morgan extras (dark staff, purple crystal, magic runes, flowing robes)

/**
 * Draw Morgan le Fay's character-specific details:
 * - Dark wooden staff with purple crystal on top
 * - Floating magic runes around her
 * - Flowing dark robes effect
 */
export function drawMorganExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  isFlashing: boolean,
  flashColor: number,
): void {
  const staffColor = isFlashing ? flashColor : (pal.weapon ?? 0x553322);
  const crystalColor = isFlashing ? flashColor : (pal.weaponAccent ?? 0xaa44ff);
  const accentColor = isFlashing ? flashColor : (pal.accent ?? 0x8844cc);

  // -- Staff ----------------------------------------------------------------
  // Staff runs from the front hand extending in the arm direction
  const hx = p.frontArm.handX;
  const hy = p.frontArm.handY;

  // Calculate staff direction from elbow to hand
  const dx = hx - p.frontArm.elbowX;
  const dy = hy - p.frontArm.elbowY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  // Staff endpoints: bottom extends past hand, top extends opposite direction
  const sBottomX = hx + nx * 35;
  const sBottomY = Math.min(hy + ny * 35, 0);
  const sTopX = hx - nx * 60;
  const sTopY = hy - ny * 60;

  // Staff shaft (outline)
  g.moveTo(sBottomX, sBottomY);
  g.lineTo(sTopX, sTopY);
  g.stroke({ color: 0x110808, width: 7, cap: "round" });

  // Staff shaft (fill — dark wood)
  g.moveTo(sBottomX, sBottomY);
  g.lineTo(sTopX, sTopY);
  g.stroke({ color: staffColor, width: 5, cap: "round" });

  // Dark vine wrapping around staff (two small accent marks)
  const midX = (sBottomX + sTopX) / 2;
  const midY = (sBottomY + sTopY) / 2;
  g.circle(midX, midY, 3.5);
  g.fill({ color: 0x331144 });
  g.circle(midX + nx * -14, midY + ny * -14, 3);
  g.fill({ color: 0x331144 });

  // Purple crystal on top (outer glow)
  g.circle(sTopX, sTopY, 11);
  g.fill({ color: crystalColor, alpha: 0.2 });

  // Purple crystal on top (inner glow)
  g.circle(sTopX, sTopY, 7);
  g.fill({ color: crystalColor, alpha: 0.7 });

  // Crystal highlight
  g.circle(sTopX - 2, sTopY - 2, 2.5);
  g.fill({ color: 0xeeddff, alpha: 0.6 });

  // -- Magic runes floating around -----------------------------------------
  // Small glowing rune symbols orbiting her body
  const torsoX = p.torso.x;
  const torsoY = p.torso.y;
  const time = Date.now() * 0.002;

  // Rune 1: orbits around torso
  const rune1X = torsoX + Math.cos(time) * 30;
  const rune1Y = torsoY - 40 + Math.sin(time * 1.3) * 12;
  g.circle(rune1X, rune1Y, 3);
  g.fill({ color: accentColor, alpha: 0.5 });
  g.circle(rune1X, rune1Y, 1.5);
  g.fill({ color: 0xeeddff, alpha: 0.7 });

  // Rune 2: orbits opposite side
  const rune2X = torsoX + Math.cos(time + 2.1) * 35;
  const rune2Y = torsoY - 20 + Math.sin(time * 0.9 + 1.0) * 10;
  g.circle(rune2X, rune2Y, 2.5);
  g.fill({ color: accentColor, alpha: 0.4 });
  g.circle(rune2X, rune2Y, 1.2);
  g.fill({ color: 0xeeddff, alpha: 0.6 });

  // Rune 3: near the head
  const rune3X = torsoX + Math.cos(time + 4.2) * 25;
  const rune3Y = torsoY - 65 + Math.sin(time * 1.1 + 2.0) * 8;
  g.circle(rune3X, rune3Y, 2);
  g.fill({ color: accentColor, alpha: 0.35 });
  g.circle(rune3X, rune3Y, 1);
  g.fill({ color: 0xeeddff, alpha: 0.5 });

  // -- Flowing dark robes ---------------------------------------------------
  // Extended robe bottom flowing from torso base
  const robeBaseY = torsoY + (p.torso.height * 0.5);
  const robeLeftX = torsoX - p.torso.bottomWidth * 0.5 - 6;
  const robeRightX = torsoX + p.torso.bottomWidth * 0.5 + 6;
  const robeMidX = torsoX;

  // Robe drape: a flowing shape below the torso
  const robeColor = isFlashing ? flashColor : 0x331155;
  const robeOutline = isFlashing ? flashColor : 0x220a44;

  // Left robe panel
  g.moveTo(robeLeftX, robeBaseY);
  g.quadraticCurveTo(
    robeLeftX - 8,
    robeBaseY + 18,
    robeLeftX - 4 + Math.sin(time * 1.5) * 3,
    robeBaseY + 35,
  );
  g.lineTo(robeMidX - 4, robeBaseY + 30);
  g.lineTo(robeMidX - 2, robeBaseY);
  g.closePath();
  g.fill({ color: robeColor, alpha: 0.8 });

  // Right robe panel
  g.moveTo(robeRightX, robeBaseY);
  g.quadraticCurveTo(
    robeRightX + 8,
    robeBaseY + 18,
    robeRightX + 4 + Math.sin(time * 1.5 + 1.0) * 3,
    robeBaseY + 35,
  );
  g.lineTo(robeMidX + 4, robeBaseY + 30);
  g.lineTo(robeMidX + 2, robeBaseY);
  g.closePath();
  g.fill({ color: robeColor, alpha: 0.8 });

  // Robe edge accent lines
  g.moveTo(robeLeftX, robeBaseY);
  g.quadraticCurveTo(
    robeLeftX - 8,
    robeBaseY + 18,
    robeLeftX - 4 + Math.sin(time * 1.5) * 3,
    robeBaseY + 35,
  );
  g.stroke({ color: robeOutline, width: 1.5, alpha: 0.6 });

  g.moveTo(robeRightX, robeBaseY);
  g.quadraticCurveTo(
    robeRightX + 8,
    robeBaseY + 18,
    robeRightX + 4 + Math.sin(time * 1.5 + 1.0) * 3,
    robeBaseY + 35,
  );
  g.stroke({ color: robeOutline, width: 1.5, alpha: 0.6 });

  // Subtle purple trim on robe edges
  g.moveTo(robeLeftX - 4 + Math.sin(time * 1.5) * 3, robeBaseY + 35);
  g.lineTo(robeRightX + 4 + Math.sin(time * 1.5 + 1.0) * 3, robeBaseY + 35);
  g.stroke({ color: accentColor, width: 1, alpha: 0.4 });
}
