// ---------------------------------------------------------------------------
// Duel mode – Merlin (Archmage of Avalon) skeleton pose data
// Staff-wielding mage with arcane specials. Long robes, pointed hat, beard.
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

export const MERLIN_PALETTE: FighterPalette = {
  body: 0x3344aa,        // deep blue/purple robes
  pants: 0x2a2a66,       // dark blue
  shoes: 0x554422,       // brown boots
  skin: 0xeeddcc,        // pale
  hair: 0xccccdd,        // white/silver
  eyes: 0x4466dd,        // blue
  outline: 0x111122,
  gloves: 0x443366,      // dark purple
  belt: 0x886633,
  weapon: 0x8b6914,      // staff wood
  weaponAccent: 0x8888ff, // crystal glow
};

// ---- Poses -----------------------------------------------------------------

export const MERLIN_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, subtle sway, staff held vertically) -------------------
  idle: [
    pose(
      head(0, -185),
      torso(0, -130, 52, 46, 90, 0),
      arm(22, -170, 30, -145, 25, -120, false),   // front: hand near staff mid
      arm(-22, -170, -28, -148, -20, -125, false), // back: relaxed
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
    pose(
      head(0, -186),
      torso(0, -131, 52, 46, 90, 0),
      arm(22, -171, 31, -146, 26, -121, false),
      arm(-22, -171, -27, -149, -19, -126, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
    pose(
      head(0, -184),
      torso(0, -129, 52, 46, 90, 0),
      arm(22, -169, 29, -144, 24, -119, false),
      arm(-22, -169, -29, -147, -21, -124, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
    pose(
      head(0, -185),
      torso(0, -130, 52, 46, 90, 0),
      arm(22, -170, 30, -145, 25, -120, false),
      arm(-22, -170, -28, -148, -20, -125, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- walk_forward (4 frames, robed stride) ---------------------------------
  walk_forward: [
    pose(
      head(2, -185),
      torso(2, -130, 52, 46, 90, 0.03),
      arm(24, -170, 32, -146, 28, -120, false),
      arm(-20, -170, -26, -146, -18, -122, false),
      leg(14, -85, 22, -46, 28, 0),
      leg(-10, -85, -18, -44, -24, 0),
    ),
    pose(
      head(4, -184),
      torso(4, -129, 52, 46, 90, 0.05),
      arm(26, -169, 34, -144, 30, -118, false),
      arm(-18, -169, -24, -144, -16, -120, false),
      leg(16, -85, 18, -42, 14, 0),
      leg(-8, -85, -12, -48, -8, 0),
    ),
    pose(
      head(2, -185),
      torso(2, -130, 52, 46, 90, 0.03),
      arm(24, -170, 32, -146, 28, -120, false),
      arm(-20, -170, -26, -146, -18, -122, false),
      leg(14, -85, 8, -44, -4, 0),
      leg(-10, -85, -4, -46, 8, 0),
    ),
    pose(
      head(4, -184),
      torso(4, -129, 52, 46, 90, 0.05),
      arm(26, -169, 34, -144, 30, -118, false),
      arm(-18, -169, -24, -144, -16, -120, false),
      leg(16, -85, 24, -46, 30, 0),
      leg(-8, -85, -16, -44, -22, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious backward step) --------------------------
  walk_back: [
    pose(
      head(-2, -185),
      torso(-2, -130, 52, 46, 90, -0.03),
      arm(20, -170, 28, -146, 24, -120, false),
      arm(-24, -170, -30, -148, -24, -126, false),
      leg(10, -85, 6, -46, 0, 0),
      leg(-14, -85, -20, -44, -28, 0),
    ),
    pose(
      head(-4, -184),
      torso(-4, -129, 52, 46, 90, -0.05),
      arm(18, -169, 26, -144, 22, -118, false),
      arm(-26, -169, -32, -146, -26, -124, false),
      leg(8, -85, 14, -42, 18, 0),
      leg(-16, -85, -14, -48, -10, 0),
    ),
    pose(
      head(-2, -185),
      torso(-2, -130, 52, 46, 90, -0.03),
      arm(20, -170, 28, -146, 24, -120, false),
      arm(-24, -170, -30, -148, -24, -126, false),
      leg(10, -85, 2, -44, -6, 0),
      leg(-14, -85, -8, -46, 2, 0),
    ),
    pose(
      head(-4, -184),
      torso(-4, -129, 52, 46, 90, -0.05),
      arm(18, -169, 26, -144, 22, -118, false),
      arm(-26, -169, -32, -146, -26, -124, false),
      leg(8, -85, -2, -46, -10, 0),
      leg(-16, -85, -22, -44, -30, 0),
    ),
  ],

  // -- crouch (1 frame, hunched over) ----------------------------------------
  crouch: [
    pose(
      head(4, -130),
      torso(2, -85, 52, 50, 70, 0.12),
      arm(24, -115, 32, -95, 30, -75, false),
      arm(-20, -115, -26, -95, -22, -78, false),
      leg(14, -50, 22, -25, 18, 0),
      leg(-10, -50, -18, -25, -14, 0),
    ),
  ],

  // -- jump (2 frames, robes flowing) ----------------------------------------
  jump: [
    // ascending
    pose(
      head(0, -190),
      torso(0, -135, 52, 50, 90, -0.05),
      arm(22, -175, 34, -158, 40, -140, true),
      arm(-22, -175, -30, -155, -25, -135, false),
      leg(12, -90, 18, -60, 24, -35),
      leg(-12, -90, -16, -65, -20, -40),
    ),
    // descending
    pose(
      head(0, -188),
      torso(0, -133, 52, 50, 90, 0.03),
      arm(22, -173, 30, -150, 26, -128, true),
      arm(-22, -173, -28, -152, -24, -132, false),
      leg(12, -88, 20, -55, 26, -25),
      leg(-12, -88, -18, -58, -22, -30),
    ),
  ],

  // -- light_high (3 frames: startup, staff poke forward, recovery) ----------
  light_high: [
    // startup: pull staff back
    pose(
      head(0, -185),
      torso(2, -130, 52, 46, 90, -0.05),
      arm(22, -170, 14, -150, 5, -135, false),
      arm(-22, -170, -28, -148, -20, -125, false),
      leg(12, -85, 16, -45, 18, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
    // poke: staff extends far forward
    pose(
      head(4, -184),
      torso(6, -129, 52, 46, 90, 0.08),
      arm(24, -169, 50, -152, 90, -145, false),
      arm(-20, -169, -24, -146, -16, -122, false),
      leg(14, -85, 18, -44, 22, 0),
      leg(-10, -85, -16, -46, -20, 0),
    ),
    // recovery
    pose(
      head(2, -185),
      torso(2, -130, 52, 46, 90, 0.02),
      arm(22, -170, 36, -150, 40, -130, false),
      arm(-22, -170, -28, -148, -20, -125, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- med_high (3 frames: startup, horizontal staff swing, recovery) --------
  med_high: [
    // startup: wind up to side
    pose(
      head(-2, -185),
      torso(0, -130, 52, 46, 90, -0.1),
      arm(22, -170, 10, -155, -5, -145, false),
      arm(-22, -170, -30, -148, -35, -130, false),
      leg(12, -85, 16, -45, 20, 0),
      leg(-12, -85, -16, -45, -20, 0),
    ),
    // swing: horizontal arc across
    pose(
      head(6, -183),
      torso(6, -128, 52, 46, 90, 0.12),
      arm(24, -168, 55, -155, 95, -148, false),
      arm(-20, -168, -18, -145, -10, -120, false),
      leg(14, -85, 20, -44, 24, 0),
      leg(-10, -85, -14, -46, -18, 0),
    ),
    // recovery
    pose(
      head(2, -185),
      torso(2, -130, 52, 46, 90, 0.03),
      arm(22, -170, 38, -150, 45, -132, false),
      arm(-22, -170, -26, -148, -20, -125, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- heavy_high (4 frames: windup, overhead staff slam, impact, recovery) --
  heavy_high: [
    // windup: raise staff overhead
    pose(
      head(0, -184),
      torso(-2, -130, 52, 46, 90, -0.08),
      arm(22, -170, 20, -190, 18, -210, false),
      arm(-22, -170, -20, -188, -18, -205, false),
      leg(12, -85, 16, -46, 20, 0),
      leg(-12, -85, -16, -46, -20, 0),
    ),
    // slam downward
    pose(
      head(6, -182),
      torso(6, -127, 52, 46, 90, 0.15),
      arm(24, -167, 50, -140, 80, -100, false),
      arm(-20, -167, -14, -142, -4, -118, false),
      leg(14, -85, 20, -43, 24, 0),
      leg(-10, -85, -14, -46, -18, 0),
    ),
    // impact: staff hits ground forward
    pose(
      head(8, -180),
      torso(8, -125, 52, 46, 90, 0.18),
      arm(26, -165, 58, -120, 90, -40, false),
      arm(-18, -165, -10, -138, -2, -110, false),
      leg(16, -85, 22, -42, 26, 0),
      leg(-8, -85, -12, -46, -16, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(4, -129, 52, 46, 90, 0.05),
      arm(24, -169, 38, -148, 40, -125, false),
      arm(-20, -169, -26, -146, -20, -122, false),
      leg(14, -85, 16, -44, 18, 0),
      leg(-10, -85, -14, -45, -16, 0),
    ),
  ],

  // -- light_low (3 frames: startup, low staff poke, recovery) ---------------
  light_low: [
    // startup: crouch slightly
    pose(
      head(2, -165),
      torso(2, -110, 52, 48, 80, 0.08),
      arm(22, -145, 30, -120, 28, -95, false),
      arm(-22, -145, -28, -122, -22, -100, false),
      leg(12, -70, 18, -38, 22, 0),
      leg(-12, -70, -16, -38, -18, 0),
    ),
    // low poke: extend staff at ankle height
    pose(
      head(6, -163),
      torso(6, -108, 52, 48, 80, 0.14),
      arm(24, -143, 50, -95, 90, -30, false),
      arm(-20, -143, -24, -118, -16, -95, false),
      leg(14, -70, 20, -36, 24, 0),
      leg(-10, -70, -16, -38, -18, 0),
    ),
    // recovery
    pose(
      head(2, -168),
      torso(2, -112, 52, 48, 82, 0.05),
      arm(22, -148, 36, -115, 38, -90, false),
      arm(-22, -148, -26, -122, -20, -100, false),
      leg(12, -72, 16, -38, 18, 0),
      leg(-12, -72, -14, -38, -16, 0),
    ),
  ],

  // -- med_low (3 frames: startup, staff sweep, recovery) --------------------
  med_low: [
    // startup: crouch with staff pulled back
    pose(
      head(0, -160),
      torso(0, -105, 52, 48, 78, -0.06),
      arm(22, -140, 12, -118, 0, -95, false),
      arm(-22, -140, -28, -120, -24, -98, false),
      leg(12, -66, 18, -36, 22, 0),
      leg(-12, -66, -18, -36, -20, 0),
    ),
    // sweep: staff arcs low across ground
    pose(
      head(8, -158),
      torso(8, -103, 52, 48, 78, 0.16),
      arm(26, -138, 56, -80, 100, -20, false),
      arm(-18, -138, -14, -115, -6, -90, false),
      leg(16, -66, 24, -34, 28, 0),
      leg(-8, -66, -14, -38, -16, 0),
    ),
    // recovery
    pose(
      head(4, -162),
      torso(4, -107, 52, 48, 80, 0.05),
      arm(24, -142, 38, -108, 42, -80, false),
      arm(-20, -142, -26, -120, -20, -98, false),
      leg(14, -68, 18, -36, 20, 0),
      leg(-10, -68, -16, -38, -18, 0),
    ),
  ],

  // -- heavy_low (4 frames: windup, ground slam, impact, recovery) -----------
  heavy_low: [
    // windup: raise staff high while crouching
    pose(
      head(0, -162),
      torso(0, -108, 52, 48, 80, -0.08),
      arm(22, -143, 20, -175, 18, -205, false),
      arm(-22, -143, -20, -170, -18, -200, false),
      leg(12, -68, 18, -36, 22, 0),
      leg(-12, -68, -18, -36, -20, 0),
    ),
    // slam down toward ground
    pose(
      head(6, -155),
      torso(6, -100, 52, 50, 76, 0.2),
      arm(24, -135, 48, -90, 75, -30, false),
      arm(-18, -135, -12, -105, -2, -75, false),
      leg(14, -64, 22, -34, 26, 0),
      leg(-10, -64, -16, -36, -18, 0),
    ),
    // impact: staff slams into ground
    pose(
      head(8, -150),
      torso(8, -95, 52, 52, 72, 0.25),
      arm(26, -130, 54, -65, 80, -5, false),
      arm(-18, -130, -10, -95, 0, -65, false),
      leg(16, -60, 24, -32, 28, 0),
      leg(-8, -60, -14, -34, -16, 0),
    ),
    // recovery
    pose(
      head(4, -162),
      torso(4, -107, 52, 48, 80, 0.06),
      arm(24, -142, 36, -115, 38, -85, false),
      arm(-20, -142, -26, -120, -20, -98, false),
      leg(14, -68, 18, -36, 20, 0),
      leg(-10, -68, -16, -36, -18, 0),
    ),
  ],

  // -- arcane_bolt (3 frames: staff raises, thrust forward casting, recovery)
  arcane_bolt: [
    // staff raises: gathering energy
    pose(
      head(-2, -186),
      torso(-2, -131, 52, 46, 90, -0.06),
      arm(22, -171, 24, -195, 26, -215, true),
      arm(-22, -171, -26, -190, -24, -210, true),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
    // thrust forward: casting bolt
    pose(
      head(6, -184),
      torso(6, -129, 52, 46, 90, 0.1),
      arm(24, -169, 55, -165, 95, -160, true),
      arm(-20, -169, -18, -148, -10, -125, false),
      leg(14, -85, 18, -44, 22, 0),
      leg(-10, -85, -16, -46, -20, 0),
    ),
    // recovery
    pose(
      head(2, -185),
      torso(2, -130, 52, 46, 90, 0.03),
      arm(22, -170, 34, -155, 38, -138, false),
      arm(-22, -170, -26, -148, -20, -125, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- thunder_strike (3 frames: staff raised high, lightning call, recovery)
  thunder_strike: [
    // staff raised: thrust skyward
    pose(
      head(0, -186),
      torso(0, -131, 52, 46, 90, -0.04),
      arm(22, -171, 26, -200, 30, -230, true),
      arm(-22, -171, -20, -195, -16, -222, true),
      leg(12, -85, 16, -46, 20, 0),
      leg(-12, -85, -16, -46, -20, 0),
    ),
    // lightning call: arms wide, energy flowing
    pose(
      head(0, -188),
      torso(0, -133, 52, 46, 90, 0),
      arm(22, -173, 45, -195, 60, -215, true),
      arm(-22, -173, -40, -192, -55, -210, true),
      leg(12, -85, 18, -46, 22, 0),
      leg(-12, -85, -18, -46, -22, 0),
    ),
    // recovery
    pose(
      head(0, -185),
      torso(0, -130, 52, 46, 90, 0),
      arm(22, -170, 30, -152, 28, -132, false),
      arm(-22, -170, -28, -150, -24, -128, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- frost_wave (3 frames: staff sweeps low, casting, recovery) ------------
  frost_wave: [
    // staff sweeps low: pulling back for low cast
    pose(
      head(0, -170),
      torso(2, -118, 52, 48, 84, 0.08),
      arm(22, -155, 18, -125, 12, -95, false),
      arm(-22, -155, -28, -130, -24, -105, false),
      leg(12, -76, 18, -40, 22, 0),
      leg(-12, -76, -16, -40, -18, 0),
    ),
    // casting: sweep staff forward at ground level
    pose(
      head(6, -168),
      torso(6, -116, 52, 48, 84, 0.15),
      arm(24, -153, 52, -90, 95, -25, true),
      arm(-20, -153, -16, -125, -8, -100, false),
      leg(14, -76, 20, -38, 24, 0),
      leg(-10, -76, -16, -40, -18, 0),
    ),
    // recovery
    pose(
      head(2, -172),
      torso(2, -120, 52, 48, 86, 0.04),
      arm(22, -158, 34, -125, 36, -95, false),
      arm(-22, -158, -26, -132, -22, -108, false),
      leg(12, -78, 16, -40, 18, 0),
      leg(-12, -78, -14, -40, -16, 0),
    ),
  ],

  // -- teleport (3 frames: crouch, vanish pose, reappear) --------------------
  teleport: [
    // crouch: gathering energy
    pose(
      head(0, -145),
      torso(0, -95, 52, 52, 72, 0),
      arm(22, -128, 16, -105, 10, -80, true),
      arm(-22, -128, -16, -105, -10, -80, true),
      leg(12, -59, 20, -30, 22, 0),
      leg(-12, -59, -20, -30, -22, 0),
    ),
    // vanish: body compressed, arms wrapped
    pose(
      head(0, -120),
      torso(0, -75, 40, 36, 55, 0),
      arm(18, -100, 8, -80, 0, -65, false),
      arm(-18, -100, -8, -80, 0, -65, false),
      leg(10, -48, 8, -24, 6, 0),
      leg(-10, -48, -8, -24, -6, 0),
    ),
    // reappear: standing tall
    pose(
      head(0, -188),
      torso(0, -132, 52, 46, 90, 0),
      arm(22, -172, 35, -158, 42, -140, true),
      arm(-22, -172, -35, -158, -42, -140, true),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- arcane_storm (3 frames: raise staff, channel overhead, recovery) ------
  arcane_storm: [
    // raise staff skyward
    pose(
      head(0, -188),
      torso(0, -133, 52, 46, 90, -0.04),
      arm(22, -173, 28, -205, 34, -240, true),
      arm(-22, -173, -26, -200, -30, -232, true),
      leg(12, -85, 16, -46, 20, 0),
      leg(-12, -85, -16, -46, -20, 0),
    ),
    // channeling storm energy, arms wide
    pose(
      head(0, -190),
      torso(0, -135, 52, 46, 90, 0),
      arm(22, -175, 48, -200, 65, -220, true),
      arm(-22, -175, -48, -198, -65, -215, true),
      leg(12, -85, 18, -46, 22, 0),
      leg(-12, -85, -18, -46, -22, 0),
    ),
    // recovery
    pose(
      head(0, -185),
      torso(0, -130, 52, 46, 90, 0),
      arm(22, -170, 30, -152, 28, -132, false),
      arm(-22, -170, -28, -150, -24, -128, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- mystic_barrier (3 frames: stance, barrier hold, recovery) ------------
  mystic_barrier: [
    // hands crossed in front, defensive stance
    pose(
      head(-2, -186),
      torso(-2, -131, 52, 46, 90, -0.06),
      arm(22, -171, 10, -155, -5, -145, true),
      arm(-22, -171, -10, -155, 5, -145, true),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
    // barrier up: arms spread forming a shield
    pose(
      head(0, -188),
      torso(0, -133, 52, 46, 90, 0),
      arm(22, -173, 36, -180, 44, -195, true),
      arm(-22, -173, -36, -178, -44, -192, true),
      leg(12, -85, 16, -46, 20, 0),
      leg(-12, -85, -16, -46, -20, 0),
    ),
    // recovery
    pose(
      head(0, -185),
      torso(0, -130, 52, 46, 90, 0),
      arm(22, -170, 30, -152, 28, -132, false),
      arm(-22, -170, -28, -150, -24, -128, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- grab (3 frames: reach with staff, pin, recovery) ----------------------
  grab: [
    // reach: extend staff to hook opponent
    pose(
      head(4, -184),
      torso(4, -129, 52, 46, 90, 0.08),
      arm(24, -169, 52, -158, 85, -150, false),
      arm(-20, -169, -24, -146, -18, -122, false),
      leg(14, -85, 18, -44, 22, 0),
      leg(-10, -85, -14, -46, -18, 0),
    ),
    // pin: staff hooks and pulls
    pose(
      head(6, -183),
      torso(6, -128, 52, 46, 90, 0.1),
      arm(24, -168, 48, -150, 70, -140, false),
      arm(-20, -168, -18, -145, -12, -120, false),
      leg(14, -85, 20, -43, 24, 0),
      leg(-10, -85, -14, -46, -18, 0),
    ),
    // recovery
    pose(
      head(2, -185),
      torso(2, -130, 52, 46, 90, 0.03),
      arm(22, -170, 34, -150, 38, -130, false),
      arm(-22, -170, -26, -148, -20, -125, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- block_stand (1 frame, staff held across body) -------------------------
  block_stand: [
    pose(
      head(-2, -185),
      torso(-2, -130, 52, 46, 90, -0.06),
      arm(22, -170, 18, -148, 12, -125, false),
      arm(-22, -170, -18, -148, -12, -125, false),
      leg(12, -85, 14, -45, 16, 0),
      leg(-12, -85, -14, -45, -16, 0),
    ),
  ],

  // -- block_crouch (1 frame, crouched behind staff) -------------------------
  block_crouch: [
    pose(
      head(-2, -132),
      torso(-2, -88, 52, 50, 72, -0.08),
      arm(22, -120, 16, -100, 10, -78, false),
      arm(-22, -120, -16, -100, -10, -78, false),
      leg(12, -52, 20, -26, 22, 0),
      leg(-12, -52, -20, -26, -22, 0),
    ),
  ],

  // -- hit_stun (2 frames, recoiling) ----------------------------------------
  hit_stun: [
    // reel back
    pose(
      head(-8, -182),
      torso(-6, -128, 52, 46, 90, -0.15),
      arm(18, -168, 10, -148, 5, -128, true),
      arm(-26, -168, -34, -150, -38, -130, true),
      leg(8, -85, 10, -46, 8, 0),
      leg(-16, -85, -20, -44, -24, 0),
    ),
    // stagger
    pose(
      head(-12, -180),
      torso(-10, -126, 52, 46, 90, -0.2),
      arm(14, -166, 6, -145, 0, -122, true),
      arm(-30, -166, -38, -148, -44, -128, true),
      leg(4, -85, 8, -48, 6, 0),
      leg(-20, -85, -24, -42, -28, 0),
    ),
  ],

  // -- knockdown (2 frames, falling then lying) ------------------------------
  knockdown: [
    // falling backward
    pose(
      head(-14, -150),
      torso(-10, -100, 52, 46, 80, -0.5),
      arm(10, -135, 0, -110, -8, -85, true),
      arm(-30, -135, -38, -112, -44, -90, true),
      leg(2, -60, 12, -35, 20, -10),
      leg(-22, -60, -18, -30, -12, -5),
    ),
    // lying on ground
    pose(
      head(-40, -20),
      torso(-20, -18, 52, 46, 90, -1.5),
      arm(8, -30, -10, -22, -30, -16, true),
      arm(-48, -30, -58, -18, -68, -12, true),
      leg(20, -15, 35, -10, 50, -5),
      leg(-10, -12, 5, -8, 20, -5),
    ),
  ],

  // -- get_up (2 frames, rising with staff) ----------------------------------
  get_up: [
    // pushing up with staff
    pose(
      head(-8, -100),
      torso(-4, -65, 52, 48, 70, -0.3),
      arm(18, -95, 28, -60, 35, -30, false),
      arm(-26, -95, -30, -65, -28, -35, false),
      leg(8, -30, 18, -15, 22, 0),
      leg(-16, -30, -14, -15, -10, 0),
    ),
    // standing up
    pose(
      head(-2, -175),
      torso(-2, -122, 52, 46, 86, -0.08),
      arm(20, -160, 28, -140, 26, -118, false),
      arm(-24, -160, -30, -142, -26, -120, false),
      leg(10, -80, 14, -42, 16, 0),
      leg(-14, -80, -14, -42, -16, 0),
    ),
  ],

  // -- victory (2 frames, staff raised with crystal glowing) -----------------
  victory: [
    // staff raised triumphantly
    pose(
      head(0, -188),
      torso(0, -133, 52, 46, 90, 0),
      arm(22, -173, 28, -200, 32, -230, true),
      arm(-22, -173, -30, -155, -35, -135, true),
      leg(12, -85, 16, -46, 20, 0),
      leg(-12, -85, -16, -46, -20, 0),
    ),
    // flourish: both arms wide
    pose(
      head(0, -190),
      torso(0, -135, 52, 46, 90, 0),
      arm(22, -175, 42, -205, 50, -235, true),
      arm(-22, -175, -42, -200, -50, -225, true),
      leg(12, -85, 18, -46, 22, 0),
      leg(-12, -85, -18, -46, -22, 0),
    ),
  ],

  // -- defeat (1 frame, collapsed over staff) --------------------------------
  defeat: [
    pose(
      head(10, -55),
      torso(5, -40, 52, 48, 60, 0.6),
      arm(22, -62, 30, -35, 35, -10, true),
      arm(-12, -62, -18, -35, -22, -12, true),
      leg(14, -10, 24, -5, 30, 0),
      leg(-8, -10, -4, -5, 0, 0),
    ),
  ],
};

// ---- Merlin extras (staff, crystal, hat, beard) ----------------------------

/**
 * Draw Merlin's character-specific details:
 * - Gnarled wooden staff from hand position with crystal on top
 * - Pointed wizard hat on head
 * - Long white beard
 */
export function drawMerlinExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  isFlashing: boolean,
  flashColor: number,
): void {
  const staffColor = isFlashing ? flashColor : (pal.weapon ?? 0x8b6914);
  const crystalColor = isFlashing ? flashColor : (pal.weaponAccent ?? 0x8888ff);

  // -- Staff ----------------------------------------------------------------
  // Staff runs from the front hand to a point above it (or to ground)
  const hx = p.frontArm.handX;
  const hy = p.frontArm.handY;

  // Calculate staff direction: from hand, extend the staff ~100px
  // The staff angle is determined by the arm direction (elbow to hand)
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
  g.stroke({ color: 0x221100, width: 7, cap: "round" });

  // Staff shaft (fill)
  g.moveTo(sBottomX, sBottomY);
  g.lineTo(sTopX, sTopY);
  g.stroke({ color: staffColor, width: 5, cap: "round" });

  // Gnarled knots on the staff (two small bumps)
  const midX = (sBottomX + sTopX) / 2;
  const midY = (sBottomY + sTopY) / 2;
  g.circle(midX, midY, 4);
  g.fill({ color: 0x6b4f12 });
  g.circle(midX + nx * -15, midY + ny * -15, 3);
  g.fill({ color: 0x6b4f12 });

  // Crystal on top (glow)
  g.circle(sTopX, sTopY, 10);
  g.fill({ color: crystalColor, alpha: 0.25 });

  // Crystal on top (core)
  g.circle(sTopX, sTopY, 6);
  g.fill({ color: crystalColor, alpha: 0.85 });

  // Crystal highlight
  g.circle(sTopX - 2, sTopY - 2, 2.5);
  g.fill({ color: 0xffffff, alpha: 0.6 });

  // -- Pointed hat ----------------------------------------------------------
  const headX = p.head.x;
  const headY = p.head.y;
  const hr = p.head.radius ?? 24;
  const hatColor = isFlashing ? flashColor : 0x2a3388;
  const hatBandColor = isFlashing ? flashColor : 0x886633;
  const hatStarColor = isFlashing ? flashColor : 0xdddd88;

  // Hat brim (ellipse behind head)
  g.ellipse(headX + 2, headY - hr + 2, hr + 10, 5);
  g.fill({ color: hatColor });

  // Hat cone (triangle)
  g.moveTo(headX - hr - 4, headY - hr + 4);
  g.lineTo(headX + 8, headY - hr - 50);
  g.lineTo(headX + hr + 4, headY - hr + 4);
  g.closePath();
  g.fill({ color: hatColor });

  // Hat band
  g.moveTo(headX - hr - 2, headY - hr + 4);
  g.lineTo(headX + hr + 2, headY - hr + 4);
  g.stroke({ color: hatBandColor, width: 3 });

  // Hat star accent
  g.circle(headX + 4, headY - hr - 20, 3);
  g.fill({ color: hatStarColor, alpha: 0.7 });

  // -- Beard ----------------------------------------------------------------
  const beardColor = isFlashing ? flashColor : pal.hair;
  const mouthY = headY + 10;

  // Beard: flows down from chin area
  // Main beard shape (three strands for flowing look)
  // Center strand
  g.moveTo(headX - 4, mouthY);
  g.quadraticCurveTo(headX, mouthY + 30, headX - 2, mouthY + 50);
  g.stroke({ color: beardColor, width: 8, cap: "round" });

  // Left strand
  g.moveTo(headX - 10, mouthY - 2);
  g.quadraticCurveTo(headX - 14, mouthY + 22, headX - 12, mouthY + 40);
  g.stroke({ color: beardColor, width: 6, cap: "round" });

  // Right strand
  g.moveTo(headX + 4, mouthY);
  g.quadraticCurveTo(headX + 8, mouthY + 18, headX + 6, mouthY + 35);
  g.stroke({ color: beardColor, width: 5, cap: "round" });
}
