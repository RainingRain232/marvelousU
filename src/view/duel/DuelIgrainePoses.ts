// ---------------------------------------------------------------------------
// Duel mode – Igraine (Duchess of Cornwall) skeleton pose data
// Cleric/healer mage with ceremonial staff, holy/light magic. Flowing gold
// robes, circlet/tiara, auburn hair, elegant noble bearing.
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

export const IGRAINE_PALETTE: FighterPalette = {
  skin: 0xeeddcc,          // pale noble skin
  body: 0xccbb88,          // gold/cream robes
  pants: 0xaa9966,         // muted gold lower robes
  shoes: 0x887755,         // soft leather shoes
  hair: 0xaa7733,          // auburn
  eyes: 0x66aa88,          // green-hazel
  outline: 0x222233,
  gloves: 0xccbb88,        // matching robe gauntlets
  belt: 0xaa8844,          // ornate gold belt
  accent: 0xffee88,        // holy gold glow
  weapon: 0xddcc99,        // golden ceremonial staff
  weaponAccent: 0xffee88,  // holy crystal
};

// ---- Poses -----------------------------------------------------------------

export const IGRAINE_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, serene stance, staff held upright) ---------------------
  idle: [
    pose(
      head(0, -183),
      torso(0, -128, 50, 44, 88, 0),
      arm(20, -168, 28, -143, 24, -118, false),   // front: hand near staff mid
      arm(-20, -168, -26, -146, -18, -123, false), // back: relaxed at side
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    pose(
      head(0, -184),
      torso(0, -129, 50, 44, 88, 0),
      arm(20, -169, 29, -144, 25, -119, false),
      arm(-20, -169, -25, -147, -17, -124, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    pose(
      head(0, -182),
      torso(0, -127, 50, 44, 88, 0),
      arm(20, -167, 27, -142, 23, -117, false),
      arm(-20, -167, -27, -145, -19, -122, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    pose(
      head(0, -183),
      torso(0, -128, 50, 44, 88, 0),
      arm(20, -168, 28, -143, 24, -118, false),
      arm(-20, -168, -26, -146, -18, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- walk_forward (4 frames, graceful stride) -------------------------------
  walk_forward: [
    pose(
      head(2, -183),
      torso(2, -128, 50, 44, 88, 0.03),
      arm(22, -168, 30, -144, 26, -118, false),
      arm(-18, -168, -24, -144, -16, -120, false),
      leg(13, -83, 20, -44, 26, 0),
      leg(-9, -83, -16, -43, -22, 0),
    ),
    pose(
      head(3, -182),
      torso(3, -127, 50, 44, 88, 0.04),
      arm(23, -167, 32, -142, 28, -116, false),
      arm(-17, -167, -22, -142, -14, -118, false),
      leg(15, -83, 16, -41, 12, 0),
      leg(-7, -83, -10, -46, -6, 0),
    ),
    pose(
      head(2, -183),
      torso(2, -128, 50, 44, 88, 0.03),
      arm(22, -168, 30, -144, 26, -118, false),
      arm(-18, -168, -24, -144, -16, -120, false),
      leg(13, -83, 6, -43, -4, 0),
      leg(-9, -83, -2, -44, 6, 0),
    ),
    pose(
      head(3, -182),
      torso(3, -127, 50, 44, 88, 0.04),
      arm(23, -167, 32, -142, 28, -116, false),
      arm(-17, -167, -22, -142, -14, -118, false),
      leg(15, -83, 22, -44, 28, 0),
      leg(-7, -83, -14, -43, -20, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious retreat) ---------------------------------
  walk_back: [
    pose(
      head(-2, -183),
      torso(-2, -128, 50, 44, 88, -0.03),
      arm(18, -168, 26, -144, 22, -118, false),
      arm(-22, -168, -28, -146, -22, -124, false),
      leg(9, -83, 4, -44, -2, 0),
      leg(-13, -83, -18, -43, -26, 0),
    ),
    pose(
      head(-3, -182),
      torso(-3, -127, 50, 44, 88, -0.04),
      arm(17, -167, 24, -142, 20, -116, false),
      arm(-23, -167, -30, -144, -24, -122, false),
      leg(7, -83, 12, -41, 16, 0),
      leg(-15, -83, -12, -46, -8, 0),
    ),
    pose(
      head(-2, -183),
      torso(-2, -128, 50, 44, 88, -0.03),
      arm(18, -168, 26, -144, 22, -118, false),
      arm(-22, -168, -28, -146, -22, -124, false),
      leg(9, -83, 0, -43, -8, 0),
      leg(-13, -83, -6, -44, 0, 0),
    ),
    pose(
      head(-3, -182),
      torso(-3, -127, 50, 44, 88, -0.04),
      arm(17, -167, 24, -142, 20, -116, false),
      arm(-23, -167, -30, -144, -24, -122, false),
      leg(7, -83, -4, -44, -12, 0),
      leg(-15, -83, -20, -43, -28, 0),
    ),
  ],

  // -- crouch (1 frame, kneeling stance) --------------------------------------
  crouch: [
    pose(
      head(3, -128),
      torso(2, -83, 50, 48, 68, 0.1),
      arm(22, -113, 30, -93, 28, -73, false),
      arm(-18, -113, -24, -93, -20, -76, false),
      leg(13, -48, 20, -24, 16, 0),
      leg(-9, -48, -16, -24, -12, 0),
    ),
  ],

  // -- jump (2 frames, robes flowing) -----------------------------------------
  jump: [
    // ascending
    pose(
      head(0, -188),
      torso(0, -133, 50, 48, 88, -0.04),
      arm(20, -173, 32, -156, 38, -138, true),
      arm(-20, -173, -28, -153, -23, -133, false),
      leg(11, -88, 16, -58, 22, -33),
      leg(-11, -88, -14, -63, -18, -38),
    ),
    // descending
    pose(
      head(0, -186),
      torso(0, -131, 50, 48, 88, 0.03),
      arm(20, -171, 28, -148, 24, -126, true),
      arm(-20, -171, -26, -150, -22, -130, false),
      leg(11, -86, 18, -53, 24, -23),
      leg(-11, -86, -16, -56, -20, -28),
    ),
  ],

  // -- light_high (3 frames: startup, staff poke with light, recovery) --------
  light_high: [
    // startup: pull staff back
    pose(
      head(0, -183),
      torso(2, -128, 50, 44, 88, -0.05),
      arm(20, -168, 12, -148, 3, -133, false),
      arm(-20, -168, -26, -146, -18, -123, false),
      leg(11, -83, 14, -44, 16, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    // poke: staff extends forward with holy gleam
    pose(
      head(4, -182),
      torso(5, -127, 50, 44, 88, 0.07),
      arm(22, -167, 48, -150, 88, -143, false),
      arm(-18, -167, -22, -144, -14, -120, false),
      leg(13, -83, 16, -43, 20, 0),
      leg(-9, -83, -14, -44, -18, 0),
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

  // -- med_high (3 frames: wind-up, horizontal arc, recovery) -----------------
  med_high: [
    // startup: wind to side
    pose(
      head(-2, -183),
      torso(0, -128, 50, 44, 88, -0.09),
      arm(20, -168, 8, -153, -6, -143, false),
      arm(-20, -168, -28, -146, -33, -128, false),
      leg(11, -83, 14, -44, 18, 0),
      leg(-11, -83, -14, -44, -18, 0),
    ),
    // swing: horizontal arc with light trail
    pose(
      head(5, -181),
      torso(5, -126, 50, 44, 88, 0.11),
      arm(22, -166, 52, -153, 92, -146, false),
      arm(-18, -166, -16, -143, -8, -118, false),
      leg(13, -83, 18, -43, 22, 0),
      leg(-9, -83, -12, -44, -16, 0),
    ),
    // recovery
    pose(
      head(2, -183),
      torso(2, -128, 50, 44, 88, 0.03),
      arm(20, -168, 36, -148, 42, -130, false),
      arm(-20, -168, -24, -146, -18, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- heavy_high (4 frames: raise staff, overhead slam, impact, recovery) ----
  heavy_high: [
    // windup: raise staff overhead
    pose(
      head(0, -182),
      torso(-2, -128, 50, 44, 88, -0.07),
      arm(20, -168, 18, -188, 16, -208, false),
      arm(-20, -168, -18, -186, -16, -203, false),
      leg(11, -83, 14, -44, 18, 0),
      leg(-11, -83, -14, -44, -18, 0),
    ),
    // slam downward
    pose(
      head(5, -180),
      torso(5, -125, 50, 44, 88, 0.14),
      arm(22, -165, 48, -138, 78, -98, false),
      arm(-18, -165, -12, -140, -2, -116, false),
      leg(13, -83, 18, -42, 22, 0),
      leg(-9, -83, -12, -44, -16, 0),
    ),
    // impact: staff hits with holy burst
    pose(
      head(7, -178),
      torso(7, -123, 50, 44, 88, 0.17),
      arm(24, -163, 56, -118, 88, -38, false),
      arm(-16, -163, -8, -136, 0, -108, false),
      leg(15, -83, 20, -41, 24, 0),
      leg(-7, -83, -10, -44, -14, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(3, -127, 50, 44, 88, 0.04),
      arm(22, -167, 36, -146, 38, -123, false),
      arm(-18, -167, -24, -144, -18, -120, false),
      leg(13, -83, 14, -43, 16, 0),
      leg(-9, -83, -12, -44, -14, 0),
    ),
  ],

  // -- light_low (3 frames: crouch, low poke, recovery) -----------------------
  light_low: [
    // startup: crouch slightly
    pose(
      head(2, -163),
      torso(2, -108, 50, 46, 78, 0.07),
      arm(20, -143, 28, -118, 26, -93, false),
      arm(-20, -143, -26, -120, -20, -98, false),
      leg(11, -68, 16, -36, 20, 0),
      leg(-11, -68, -14, -36, -16, 0),
    ),
    // low poke: extend staff at ankle height
    pose(
      head(5, -161),
      torso(5, -106, 50, 46, 78, 0.13),
      arm(22, -141, 48, -93, 88, -28, false),
      arm(-18, -141, -22, -116, -14, -93, false),
      leg(13, -68, 18, -34, 22, 0),
      leg(-9, -68, -14, -36, -16, 0),
    ),
    // recovery
    pose(
      head(2, -166),
      torso(2, -110, 50, 46, 80, 0.04),
      arm(20, -146, 34, -113, 36, -88, false),
      arm(-20, -146, -24, -120, -18, -98, false),
      leg(11, -70, 14, -36, 16, 0),
      leg(-11, -70, -12, -36, -14, 0),
    ),
  ],

  // -- med_low (3 frames: crouch, sweeping arc, recovery) ---------------------
  med_low: [
    // startup: crouch with staff pulled back
    pose(
      head(0, -158),
      torso(0, -103, 50, 46, 76, -0.05),
      arm(20, -138, 10, -116, -2, -93, false),
      arm(-20, -138, -26, -118, -22, -96, false),
      leg(11, -64, 16, -34, 20, 0),
      leg(-11, -64, -16, -34, -18, 0),
    ),
    // sweep: staff arcs low across ground with light trail
    pose(
      head(7, -156),
      torso(7, -101, 50, 46, 76, 0.15),
      arm(24, -136, 54, -78, 98, -18, false),
      arm(-16, -136, -12, -113, -4, -88, false),
      leg(15, -64, 22, -32, 26, 0),
      leg(-7, -64, -12, -36, -14, 0),
    ),
    // recovery
    pose(
      head(3, -160),
      torso(3, -105, 50, 46, 78, 0.04),
      arm(22, -140, 36, -106, 40, -78, false),
      arm(-18, -140, -24, -118, -18, -96, false),
      leg(13, -66, 16, -34, 18, 0),
      leg(-9, -66, -14, -36, -16, 0),
    ),
  ],

  // -- heavy_low (4 frames: windup, slam down, holy burst, recovery) ----------
  heavy_low: [
    // windup: raise staff high while crouching
    pose(
      head(0, -160),
      torso(0, -106, 50, 46, 78, -0.07),
      arm(20, -141, 18, -173, 16, -203, false),
      arm(-20, -141, -18, -168, -16, -198, false),
      leg(11, -66, 16, -34, 20, 0),
      leg(-11, -66, -16, -34, -18, 0),
    ),
    // slam down toward ground
    pose(
      head(5, -153),
      torso(5, -98, 50, 48, 74, 0.18),
      arm(22, -133, 46, -88, 73, -28, false),
      arm(-16, -133, -10, -103, 0, -73, false),
      leg(13, -62, 20, -32, 24, 0),
      leg(-9, -62, -14, -34, -16, 0),
    ),
    // impact: holy burst erupts from ground
    pose(
      head(7, -148),
      torso(7, -93, 50, 50, 70, 0.24),
      arm(24, -128, 52, -63, 78, -3, false),
      arm(-16, -128, -8, -93, 2, -63, false),
      leg(15, -58, 22, -30, 26, 0),
      leg(-7, -58, -12, -32, -14, 0),
    ),
    // recovery
    pose(
      head(3, -160),
      torso(3, -105, 50, 46, 78, 0.05),
      arm(22, -140, 34, -113, 36, -83, false),
      arm(-18, -140, -24, -118, -18, -96, false),
      leg(13, -66, 16, -34, 18, 0),
      leg(-9, -66, -14, -34, -16, 0),
    ),
  ],

  // -- holy_bolt (3 frames: gather light, cast forward, recovery) -------------
  holy_bolt: [
    // gathering: staff raises, holy light forms
    pose(
      head(-2, -184),
      torso(-2, -129, 50, 44, 88, -0.05),
      arm(20, -169, 22, -193, 24, -213, true),
      arm(-20, -169, -24, -188, -22, -208, true),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
    // cast: thrust forward sending holy orb
    pose(
      head(5, -182),
      torso(5, -127, 50, 44, 88, 0.09),
      arm(22, -167, 53, -163, 93, -158, true),
      arm(-18, -167, -16, -146, -8, -123, false),
      leg(13, -83, 16, -43, 20, 0),
      leg(-9, -83, -14, -44, -18, 0),
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

  // -- divine_strike (4 frames: raise, channel, pillar call, recovery) --------
  divine_strike: [
    // raise staff skyward
    pose(
      head(0, -184),
      torso(0, -129, 50, 44, 88, -0.03),
      arm(20, -169, 24, -198, 28, -228, true),
      arm(-20, -169, -18, -193, -14, -220, true),
      leg(11, -83, 14, -44, 18, 0),
      leg(-11, -83, -14, -44, -18, 0),
    ),
    // channeling: arms up wide calling holy pillar
    pose(
      head(0, -186),
      torso(0, -131, 50, 44, 88, 0),
      arm(20, -171, 42, -193, 58, -213, true),
      arm(-20, -171, -38, -190, -52, -208, true),
      leg(11, -83, 16, -44, 20, 0),
      leg(-11, -83, -16, -44, -20, 0),
    ),
    // pillar descends: arms extended, light raining
    pose(
      head(0, -188),
      torso(0, -133, 50, 44, 88, 0),
      arm(20, -173, 46, -198, 62, -218, true),
      arm(-20, -173, -44, -195, -58, -213, true),
      leg(11, -83, 18, -44, 22, 0),
      leg(-11, -83, -18, -44, -22, 0),
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

  // -- sacred_wave (3 frames: low stance, cast ground wave, recovery) ---------
  sacred_wave: [
    // low stance: pulling back for ground cast
    pose(
      head(0, -168),
      torso(2, -116, 50, 46, 82, 0.07),
      arm(20, -153, 16, -123, 10, -93, false),
      arm(-20, -153, -26, -128, -22, -103, false),
      leg(11, -74, 16, -38, 20, 0),
      leg(-11, -74, -14, -38, -16, 0),
    ),
    // cast: sweep staff forward at ground level with holy wave
    pose(
      head(5, -166),
      torso(5, -114, 50, 46, 82, 0.14),
      arm(22, -151, 50, -88, 93, -23, true),
      arm(-18, -151, -14, -123, -6, -98, false),
      leg(13, -74, 18, -36, 22, 0),
      leg(-9, -74, -14, -38, -16, 0),
    ),
    // recovery
    pose(
      head(2, -170),
      torso(2, -118, 50, 46, 84, 0.04),
      arm(20, -156, 32, -123, 34, -93, false),
      arm(-20, -156, -24, -130, -20, -106, false),
      leg(11, -76, 14, -38, 16, 0),
      leg(-11, -76, -12, -38, -14, 0),
    ),
  ],

  // -- grace_step (3 frames: kneel, shimmer/vanish, reappear) -----------------
  grace_step: [
    // kneel: gathering holy energy
    pose(
      head(0, -143),
      torso(0, -93, 50, 50, 70, 0),
      arm(20, -126, 14, -103, 8, -78, true),
      arm(-20, -126, -14, -103, -8, -78, true),
      leg(11, -57, 18, -28, 20, 0),
      leg(-11, -57, -18, -28, -20, 0),
    ),
    // vanish: body compressed, holy light wrapping
    pose(
      head(0, -118),
      torso(0, -73, 38, 34, 53, 0),
      arm(16, -98, 6, -78, -2, -63, false),
      arm(-16, -98, -6, -78, 2, -63, false),
      leg(9, -46, 7, -23, 5, 0),
      leg(-9, -46, -7, -23, -5, 0),
    ),
    // reappear: standing with holy afterglow
    pose(
      head(0, -186),
      torso(0, -130, 50, 44, 88, 0),
      arm(20, -170, 33, -156, 40, -138, true),
      arm(-20, -170, -33, -156, -40, -138, true),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- grab (3 frames: reach with staff, rebuke, recovery) --------------------
  grab: [
    // reach: extend staff to hook opponent
    pose(
      head(3, -182),
      torso(3, -127, 50, 44, 88, 0.07),
      arm(22, -167, 50, -156, 83, -148, false),
      arm(-18, -167, -22, -144, -16, -120, false),
      leg(13, -83, 16, -43, 20, 0),
      leg(-9, -83, -12, -44, -16, 0),
    ),
    // rebuke: staff hooks and pushes with holy force
    pose(
      head(5, -181),
      torso(5, -126, 50, 44, 88, 0.09),
      arm(22, -166, 46, -148, 68, -138, false),
      arm(-18, -166, -16, -143, -10, -118, false),
      leg(13, -83, 18, -42, 22, 0),
      leg(-9, -83, -12, -44, -16, 0),
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

  // -- heaven_storm (4 frames: raise, channel wide, rain, recovery) -----------
  heaven_storm: [
    // raise staff skyward
    pose(
      head(0, -186),
      torso(0, -131, 50, 44, 88, -0.03),
      arm(20, -171, 26, -203, 32, -238, true),
      arm(-20, -171, -24, -198, -28, -230, true),
      leg(11, -83, 14, -44, 18, 0),
      leg(-11, -83, -14, -44, -18, 0),
    ),
    // channeling: arms spread wide, holy storm forming
    pose(
      head(0, -188),
      torso(0, -133, 50, 44, 88, 0),
      arm(20, -173, 46, -198, 63, -218, true),
      arm(-20, -173, -46, -196, -63, -213, true),
      leg(11, -83, 16, -44, 20, 0),
      leg(-11, -83, -16, -44, -20, 0),
    ),
    // rain: holy light pours down, arms extended
    pose(
      head(0, -190),
      torso(0, -135, 50, 44, 88, 0),
      arm(20, -175, 50, -202, 68, -222, true),
      arm(-20, -175, -50, -200, -68, -218, true),
      leg(11, -83, 18, -44, 22, 0),
      leg(-11, -83, -18, -44, -22, 0),
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

  // -- block_stand (1 frame, staff held across body) --------------------------
  block_stand: [
    pose(
      head(-2, -183),
      torso(-2, -128, 50, 44, 88, -0.05),
      arm(20, -168, 16, -146, 10, -123, false),
      arm(-20, -168, -16, -146, -10, -123, false),
      leg(11, -83, 13, -44, 15, 0),
      leg(-11, -83, -13, -44, -15, 0),
    ),
  ],

  // -- block_crouch (1 frame, crouched behind staff) --------------------------
  block_crouch: [
    pose(
      head(-2, -130),
      torso(-2, -86, 50, 48, 70, -0.07),
      arm(20, -118, 14, -98, 8, -76, false),
      arm(-20, -118, -14, -98, -8, -76, false),
      leg(11, -50, 18, -24, 20, 0),
      leg(-11, -50, -18, -24, -20, 0),
    ),
  ],

  // -- hit_stun (2 frames, recoiling) -----------------------------------------
  hit_stun: [
    // reel back
    pose(
      head(-7, -180),
      torso(-5, -126, 50, 44, 88, -0.14),
      arm(16, -166, 8, -146, 3, -126, true),
      arm(-24, -166, -32, -148, -36, -128, true),
      leg(7, -83, 8, -44, 6, 0),
      leg(-15, -83, -18, -43, -22, 0),
    ),
    // stagger
    pose(
      head(-11, -178),
      torso(-9, -124, 50, 44, 88, -0.19),
      arm(12, -164, 4, -143, -2, -120, true),
      arm(-28, -164, -36, -146, -42, -126, true),
      leg(3, -83, 6, -46, 4, 0),
      leg(-19, -83, -22, -41, -26, 0),
    ),
  ],

  // -- knockdown (2 frames, falling then lying) --------------------------------
  knockdown: [
    // falling backward
    pose(
      head(-13, -148),
      torso(-9, -98, 50, 44, 78, -0.48),
      arm(8, -133, -2, -108, -10, -83, true),
      arm(-28, -133, -36, -110, -42, -88, true),
      leg(1, -58, 10, -33, 18, -8),
      leg(-20, -58, -16, -28, -10, -3),
    ),
    // lying on ground
    pose(
      head(-38, -18),
      torso(-18, -16, 50, 44, 88, -1.48),
      arm(6, -28, -12, -20, -28, -14, true),
      arm(-46, -28, -56, -16, -66, -10, true),
      leg(18, -13, 33, -8, 48, -3),
      leg(-8, -10, 7, -6, 18, -3),
    ),
  ],

  // -- get_up (2 frames, rising gracefully) -----------------------------------
  get_up: [
    // pushing up with staff
    pose(
      head(-7, -98),
      torso(-3, -63, 50, 46, 68, -0.28),
      arm(16, -93, 26, -58, 33, -28, false),
      arm(-24, -93, -28, -63, -26, -33, false),
      leg(7, -28, 16, -13, 20, 0),
      leg(-14, -28, -12, -13, -8, 0),
    ),
    // standing up
    pose(
      head(-2, -173),
      torso(-2, -120, 50, 44, 84, -0.07),
      arm(18, -158, 26, -138, 24, -116, false),
      arm(-22, -158, -28, -140, -24, -118, false),
      leg(9, -78, 12, -40, 14, 0),
      leg(-13, -78, -12, -40, -14, 0),
    ),
  ],

  // -- victory (2 frames, staff raised with holy glow) ------------------------
  victory: [
    // staff raised in benediction
    pose(
      head(0, -186),
      torso(0, -131, 50, 44, 88, 0),
      arm(20, -171, 26, -198, 30, -228, true),
      arm(-20, -171, -28, -153, -33, -133, true),
      leg(11, -83, 14, -44, 18, 0),
      leg(-11, -83, -14, -44, -18, 0),
    ),
    // arms wide, blessing
    pose(
      head(0, -188),
      torso(0, -133, 50, 44, 88, 0),
      arm(20, -173, 40, -203, 48, -233, true),
      arm(-20, -173, -40, -198, -48, -223, true),
      leg(11, -83, 16, -44, 20, 0),
      leg(-11, -83, -16, -44, -20, 0),
    ),
  ],

  // -- defeat (1 frame, collapsed with staff) ---------------------------------
  defeat: [
    pose(
      head(8, -53),
      torso(4, -38, 50, 46, 58, 0.55),
      arm(20, -60, 28, -33, 33, -8, true),
      arm(-10, -60, -16, -33, -20, -10, true),
      leg(13, -8, 22, -3, 28, 0),
      leg(-7, -8, -2, -3, 2, 0),
    ),
  ],
};

// ---- Igraine extras (golden ceremonial staff, holy crystal, circlet, robes) -

/**
 * Draw Igraine's character-specific details:
 * - Golden ceremonial staff from hand position with holy crystal on top
 * - Noble circlet / tiara on head
 * - Flowing robe details
 */
export function drawIgraineExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  isFlashing: boolean,
  flashColor: number,
): void {
  const staffColor = isFlashing ? flashColor : (pal.weapon ?? 0xddcc99);
  const crystalColor = isFlashing ? flashColor : (pal.weaponAccent ?? 0xffee88);
  const accentColor = isFlashing ? flashColor : (pal.accent ?? 0xffee88);

  // -- Staff ----------------------------------------------------------------
  // Staff runs from the front hand to a point above it
  const hx = p.frontArm.handX;
  const hy = p.frontArm.handY;

  // Calculate staff direction from arm angle
  const dx = hx - p.frontArm.elbowX;
  const dy = hy - p.frontArm.elbowY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  // Staff endpoints: bottom extends past hand, top extends opposite direction
  const sBottomX = hx + nx * 30;
  const sBottomY = Math.min(hy + ny * 30, 0);
  const sTopX = hx - nx * 65;
  const sTopY = hy - ny * 65;

  // Staff shaft (outline)
  g.moveTo(sBottomX, sBottomY);
  g.lineTo(sTopX, sTopY);
  g.stroke({ color: 0x221100, width: 6, cap: "round" });

  // Staff shaft (fill — golden)
  g.moveTo(sBottomX, sBottomY);
  g.lineTo(sTopX, sTopY);
  g.stroke({ color: staffColor, width: 4, cap: "round" });

  // Decorative bands on staff (two gold rings)
  const midX = (sBottomX + sTopX) / 2;
  const midY = (sBottomY + sTopY) / 2;
  g.circle(midX, midY, 3.5);
  g.fill({ color: accentColor });
  g.circle(midX + nx * -18, midY + ny * -18, 3);
  g.fill({ color: accentColor });

  // Holy crystal on top (outer glow)
  g.circle(sTopX, sTopY, 11);
  g.fill({ color: crystalColor, alpha: 0.2 });

  // Holy crystal on top (inner glow)
  g.circle(sTopX, sTopY, 7);
  g.fill({ color: crystalColor, alpha: 0.35 });

  // Holy crystal on top (core)
  g.circle(sTopX, sTopY, 4.5);
  g.fill({ color: crystalColor, alpha: 0.9 });

  // Crystal highlight
  g.circle(sTopX - 1.5, sTopY - 2, 2);
  g.fill({ color: 0xffffff, alpha: 0.7 });

  // -- Circlet / Tiara ------------------------------------------------------
  const headX = p.head.x;
  const headY = p.head.y;
  const hr = p.head.radius ?? 22;
  const circletColor = isFlashing ? flashColor : accentColor;
  const gemColor = isFlashing ? flashColor : 0xffddaa;

  // Circlet band (arc across forehead)
  { const sa = -Math.PI * 0.85, r = hr + 2; g.moveTo(headX + r * Math.cos(sa), headY - 2 + r * Math.sin(sa)); }
  g.arc(headX, headY - 2, hr + 2, -Math.PI * 0.85, -Math.PI * 0.15);
  g.stroke({ color: circletColor, width: 3 });

  // Central gem on circlet
  g.circle(headX, headY - hr - 1, 3);
  g.fill({ color: gemColor, alpha: 0.9 });

  // Small gems on sides
  g.circle(headX - hr * 0.65, headY - hr * 0.75, 2);
  g.fill({ color: gemColor, alpha: 0.7 });
  g.circle(headX + hr * 0.65, headY - hr * 0.75, 2);
  g.fill({ color: gemColor, alpha: 0.7 });

  // -- Flowing robe details -------------------------------------------------
  const torsoBottomY = p.torso.y + (p.torso.height ?? 44) * 0.5;
  const torsoX = p.torso.x;
  const robeColor = isFlashing ? flashColor : (pal.body ?? 0xccbb88);
  const robeBorderColor = isFlashing ? flashColor : accentColor;

  // Robe flap on the left (front draping)
  g.moveTo(torsoX - 18, torsoBottomY);
  g.quadraticCurveTo(torsoX - 22, torsoBottomY + 22, torsoX - 16, torsoBottomY + 42);
  g.quadraticCurveTo(torsoX - 12, torsoBottomY + 50, torsoX - 8, torsoBottomY + 55);
  g.stroke({ color: robeColor, width: 3, alpha: 0.6 });

  // Robe flap on the right
  g.moveTo(torsoX + 18, torsoBottomY);
  g.quadraticCurveTo(torsoX + 22, torsoBottomY + 22, torsoX + 16, torsoBottomY + 42);
  g.quadraticCurveTo(torsoX + 12, torsoBottomY + 50, torsoX + 8, torsoBottomY + 55);
  g.stroke({ color: robeColor, width: 3, alpha: 0.6 });

  // Gold trim along robe edges
  g.moveTo(torsoX - 16, torsoBottomY + 42);
  g.lineTo(torsoX - 8, torsoBottomY + 55);
  g.stroke({ color: robeBorderColor, width: 1.5, alpha: 0.5 });
  g.moveTo(torsoX + 16, torsoBottomY + 42);
  g.lineTo(torsoX + 8, torsoBottomY + 55);
  g.stroke({ color: robeBorderColor, width: 1.5, alpha: 0.5 });

  // Belt accent - ornate clasp at waist
  const beltY = p.torso.y + 4;
  g.circle(torsoX, beltY, 3.5);
  g.fill({ color: circletColor, alpha: 0.8 });
}
