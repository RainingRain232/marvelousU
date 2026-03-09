// ---------------------------------------------------------------------------
// Guinevere -- Queen of Camelot
// Skeleton pose data for the duel fighting game.
// Golden plate armor, blessed longsword, crown/tiara, white flowing cape.
// Slightly more upright regal posture than Arthur.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const GUINEVERE_PALETTE: FighterPalette = {
  skin: 0xeeddcc,
  body: 0xccaa44,       // golden plate armor
  pants: 0x887744,       // dark gold armored leggings
  shoes: 0x664422,       // brown leather boots
  hair: 0xaa7722,        // auburn hair
  eyes: 0x44aa66,
  outline: 0x222233,
  gloves: 0xccaa44,      // golden gauntlets
  belt: 0x885522,        // brown leather belt
  accent: 0xffffff,      // white cape
  weapon: 0xccccdd,      // blessed blade steel
  weaponAccent: 0xddaa33, // gold fittings
};

// ---- Poses -----------------------------------------------------------------

export const GUINEVERE_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, subtle breathing bob, upright regal stance) --
  idle: [
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -148, 28, -124),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
    pose(
      head(4, -187),
      torso(0, -131, 52, 42, 92),
      arm(24, -171, 36, -147, 28, -123),
      arm(-24, -171, -36, -149, -30, -127),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
    pose(
      head(4, -186),
      torso(0, -130, 52, 42, 92),
      arm(24, -170, 36, -146, 28, -122),
      arm(-24, -170, -36, -148, -30, -126),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
    pose(
      head(4, -187),
      torso(0, -131, 52, 42, 92),
      arm(24, -171, 36, -147, 28, -123),
      arm(-24, -171, -36, -149, -30, -127),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- walk_forward (4 frames, graceful armored stride) --
  walk_forward: [
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 38, -150, 33, -128),
      arm(-24, -172, -33, -148, -26, -124),
      leg(13, -86, 26, -49, 28, 0),
      leg(-13, -86, -6, -43, -18, 0),
    ),
    pose(
      head(6, -187),
      torso(2, -131, 52, 42, 92),
      arm(26, -171, 40, -147, 36, -125),
      arm(-22, -171, -30, -145, -23, -121),
      leg(13, -86, 18, -45, 12, 0),
      leg(-13, -86, -13, -45, -13, 0),
    ),
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 30, -128),
      arm(-24, -172, -36, -148, -30, -124),
      leg(13, -86, -4, -43, -14, 0),
      leg(-13, -86, 20, -49, 24, 0),
    ),
    pose(
      head(2, -187),
      torso(-2, -131, 52, 42, 92),
      arm(22, -171, 34, -147, 28, -125),
      arm(-26, -171, -38, -145, -34, -121),
      leg(13, -86, 13, -45, 13, 0),
      leg(-13, -86, -13, -45, -13, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious regal retreat) --
  walk_back: [
    pose(
      head(2, -188),
      torso(-2, -132, 52, 42, 92),
      arm(22, -172, 33, -152, 26, -132),
      arm(-26, -172, -40, -150, -36, -128),
      leg(13, -86, 6, -49, -8, 0),
      leg(-13, -86, -22, -43, -26, 0),
    ),
    pose(
      head(0, -187),
      torso(-4, -131, 52, 42, 92),
      arm(20, -171, 31, -150, 24, -130),
      arm(-28, -171, -42, -148, -38, -126),
      leg(13, -86, 13, -45, 13, 0),
      leg(-13, -86, -13, -45, -13, 0),
    ),
    pose(
      head(2, -188),
      torso(-2, -132, 52, 42, 92),
      arm(22, -172, 33, -152, 26, -132),
      arm(-26, -172, -40, -150, -36, -128),
      leg(13, -86, 22, -43, 26, 0),
      leg(-13, -86, -6, -49, 8, 0),
    ),
    pose(
      head(0, -187),
      torso(-4, -131, 52, 42, 92),
      arm(20, -171, 31, -150, 24, -130),
      arm(-28, -171, -42, -148, -38, -126),
      leg(13, -86, 13, -45, 13, 0),
      leg(-13, -86, -13, -45, -13, 0),
    ),
  ],

  // -- crouch (1 frame, low guard with sword) --
  crouch: [
    pose(
      head(2, -132),
      torso(0, -87, 54, 46, 72),
      arm(24, -117, 33, -92, 28, -72),
      arm(-24, -117, -33, -97, -28, -77),
      leg(15, -52, 26, -26, 20, 0),
      leg(-15, -52, -26, -26, -20, 0),
    ),
  ],

  // -- jump (2 frames: leap up, peak with sword raised) --
  jump: [
    pose(
      head(4, -193),
      torso(0, -140, 52, 42, 90),
      arm(24, -178, 40, -168, 48, -188),
      arm(-24, -178, -36, -158, -28, -142),
      leg(13, -96, 20, -70, 16, -50),
      leg(-13, -96, -20, -70, -16, -50),
    ),
    pose(
      head(4, -198),
      torso(0, -145, 52, 42, 90),
      arm(24, -183, 43, -178, 53, -200),
      arm(-24, -183, -38, -162, -30, -145),
      leg(13, -100, 22, -74, 26, -57),
      leg(-13, -100, -18, -67, -23, -52),
    ),
  ],

  // -- light_high: quick blessed jab (3 frames) --
  light_high: [
    // startup: pull sword back
    pose(
      head(2, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 13, -150, -2, -138),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
    // extended jab: sword arm thrust forward
    pose(
      head(7, -187),
      torso(3, -131, 52, 42, 92, 0.05),
      arm(26, -171, 53, -157, 83, -152),
      arm(-22, -171, -34, -148, -28, -125),
      leg(13, -86, 18, -45, 16, 0),
      leg(-13, -86, -16, -47, -16, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- med_high: horizontal radiant slash (3 frames) --
  med_high: [
    // startup: sword drawn back high
    pose(
      head(-1, -189),
      torso(-2, -132, 52, 42, 92, -0.08),
      arm(24, -172, 8, -172, -12, -177),
      arm(-24, -172, -38, -150, -33, -128),
      leg(13, -86, 18, -46, 16, 0),
      leg(-13, -86, -16, -46, -18, 0),
    ),
    // horizontal slash: wide arc across
    pose(
      head(9, -186),
      torso(5, -130, 52, 42, 92, 0.1),
      arm(26, -170, 56, -150, 86, -132),
      arm(-22, -170, -34, -147, -26, -123),
      leg(13, -86, 20, -45, 18, 0),
      leg(-13, -86, -16, -47, -18, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 38, -147, 33, -123),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- heavy_high: overhead sanctified strike (4 frames) --
  heavy_high: [
    // windup: sword raised high overhead
    pose(
      head(-1, -189),
      torso(-3, -133, 52, 42, 92, -0.06),
      arm(24, -172, 20, -188, 16, -213),
      arm(-24, -172, -38, -152, -34, -132),
      leg(13, -86, 18, -46, 16, 0),
      leg(-13, -86, -18, -46, -20, 0),
    ),
    // downward strike: sword coming down
    pose(
      head(7, -186),
      torso(4, -130, 52, 42, 92, 0.12),
      arm(26, -170, 50, -152, 70, -112),
      arm(-22, -170, -32, -146, -24, -120),
      leg(13, -86, 20, -45, 20, 0),
      leg(-13, -86, -14, -47, -16, 0),
    ),
    // impact: sword low, body committed
    pose(
      head(11, -183),
      torso(6, -127, 52, 42, 92, 0.15),
      arm(28, -167, 58, -132, 78, -90),
      arm(-20, -167, -30, -142, -22, -117),
      leg(13, -86, 22, -43, 22, 0),
      leg(-13, -86, -14, -49, -18, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- light_low: swift royal kick (3 frames) --
  light_low: [
    // startup: lift leg
    pose(
      head(2, -188),
      torso(-2, -134, 52, 42, 92),
      arm(22, -174, 34, -152, 26, -132),
      arm(-26, -174, -38, -150, -34, -128),
      leg(13, -86, 26, -56, 28, -32),
      leg(-13, -86, -18, -46, -20, 0),
    ),
    // kick extended
    pose(
      head(-1, -187),
      torso(-4, -133, 52, 42, 92, -0.05),
      arm(20, -173, 32, -150, 24, -130),
      arm(-28, -173, -40, -148, -36, -126),
      leg(13, -86, 40, -53, 68, -32),
      leg(-13, -86, -20, -45, -22, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- med_low: low blessing sword poke (3 frames) --
  med_low: [
    // startup: crouch slightly, pull sword back
    pose(
      head(2, -178),
      torso(0, -124, 52, 42, 87, 0.08),
      arm(24, -162, 28, -132, 13, -107),
      arm(-24, -162, -36, -140, -32, -117),
      leg(13, -82, 20, -43, 18, 0),
      leg(-13, -82, -18, -43, -18, 0),
    ),
    // low poke: sword thrust low and forward
    pose(
      head(7, -175),
      torso(4, -120, 52, 42, 87, 0.15),
      arm(26, -158, 53, -112, 83, -82),
      arm(-22, -158, -32, -137, -26, -114),
      leg(13, -82, 22, -41, 20, 0),
      leg(-13, -82, -18, -45, -20, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- heavy_low: divine sweep launcher (4 frames) --
  heavy_low: [
    // windup: crouch, wind sword to back
    pose(
      head(-1, -158),
      torso(-3, -107, 54, 44, 77, -0.1),
      arm(24, -140, 8, -127, -17, -117),
      arm(-24, -140, -38, -122, -36, -102),
      leg(15, -70, 26, -36, 22, 0),
      leg(-15, -70, -26, -36, -24, 0),
    ),
    // sweep: sword sweeps low across the ground
    pose(
      head(9, -153),
      torso(5, -102, 54, 44, 77, 0.18),
      arm(28, -135, 56, -87, 83, -22),
      arm(-20, -135, -32, -117, -24, -97),
      leg(15, -70, 30, -32, 28, 0),
      leg(-15, -70, -24, -39, -26, 0),
    ),
    // hold: sword extended at ground level
    pose(
      head(11, -151),
      torso(6, -100, 54, 44, 77, 0.2),
      arm(30, -133, 60, -82, 88, -17),
      arm(-18, -133, -30, -114, -22, -94),
      leg(15, -70, 32, -30, 30, 0),
      leg(-15, -70, -24, -39, -26, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- divine_thrust: lunging forward stab (3 frames) --
  divine_thrust: [
    // startup: pull sword way back, lean back
    pose(
      head(-3, -189),
      torso(-5, -133, 52, 42, 92, -0.12),
      arm(22, -172, 3, -157, -17, -147),
      arm(-26, -172, -40, -152, -36, -132),
      leg(13, -86, 16, -46, 12, 0),
      leg(-13, -86, -20, -46, -22, 0),
    ),
    // lunge: body drives forward, sword fully extended
    pose(
      head(17, -183),
      torso(12, -128, 52, 42, 92, 0.15),
      arm(34, -168, 63, -150, 93, -142),
      arm(-12, -168, -26, -144, -18, -120),
      leg(13, -86, 30, -49, 36, 0),
      leg(-13, -86, -6, -43, -8, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- holy_cleave: big overhead slam (4 frames) --
  holy_cleave: [
    // big windup: sword held high behind head
    pose(
      head(-3, -190),
      torso(-5, -134, 52, 42, 92, -0.1),
      arm(22, -174, 13, -192, 3, -217),
      arm(-26, -174, -40, -157, -38, -137),
      leg(13, -86, 18, -47, 16, 0),
      leg(-13, -86, -18, -47, -20, 0),
    ),
    // overhead slam: sword crashing down
    pose(
      head(9, -183),
      torso(5, -127, 52, 42, 92, 0.18),
      arm(28, -167, 53, -142, 68, -97),
      arm(-20, -167, -30, -142, -22, -117),
      leg(13, -86, 22, -43, 22, 0),
      leg(-13, -86, -14, -49, -18, 0),
    ),
    // impact hold: sword slammed low
    pose(
      head(13, -178),
      torso(8, -122, 52, 42, 92, 0.22),
      arm(30, -162, 60, -117, 76, -62),
      arm(-18, -162, -28, -138, -20, -112),
      leg(13, -86, 24, -41, 26, 0),
      leg(-13, -86, -14, -51, -20, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- sanctified_sweep: ground-level sweep (3 frames) --
  sanctified_sweep: [
    // startup: drop low
    pose(
      head(1, -150),
      torso(0, -102, 54, 44, 74, 0.05),
      arm(24, -134, 18, -112, 3, -102),
      arm(-24, -134, -36, -117, -32, -97),
      leg(15, -66, 28, -34, 24, 0),
      leg(-15, -66, -26, -36, -26, 0),
    ),
    // ground sweep: sword sweeps at ankle height
    pose(
      head(11, -147),
      torso(6, -98, 54, 44, 74, 0.22),
      arm(30, -130, 58, -72, 88, -12),
      arm(-18, -130, -30, -112, -22, -92),
      leg(15, -66, 33, -30, 32, 0),
      leg(-15, -66, -24, -37, -28, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- radiant_rise: anti-air rising slash (4 frames) --
  radiant_rise: [
    // crouch startup: coil low
    pose(
      head(2, -150),
      torso(0, -102, 54, 44, 74),
      arm(24, -134, 28, -110, 18, -92),
      arm(-24, -134, -36, -117, -32, -97),
      leg(15, -66, 28, -34, 24, 0),
      leg(-15, -66, -26, -36, -26, 0),
    ),
    // upward slash: rising, sword sweeping up
    pose(
      head(7, -178),
      torso(4, -124, 52, 42, 88, 0.08),
      arm(26, -164, 48, -157, 63, -187),
      arm(-22, -164, -34, -142, -28, -120),
      leg(13, -82, 20, -45, 18, 0),
      leg(-13, -82, -16, -45, -16, 0),
    ),
    // peak: airborne, sword high
    pose(
      head(5, -203),
      torso(2, -150, 52, 42, 88, 0.05),
      arm(26, -188, 40, -197, 46, -222),
      arm(-22, -188, -36, -170, -30, -152),
      leg(13, -106, 20, -82, 18, -62),
      leg(-13, -106, -16, -77, -18, -57),
    ),
    // recovery: landing
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- grab: royal decree (3 frames) --
  grab: [
    // reach: arms extend forward to grab
    pose(
      head(7, -187),
      torso(4, -131, 52, 42, 92, 0.06),
      arm(26, -171, 48, -157, 66, -147, true),
      arm(-22, -171, -8, -152, 13, -142, true),
      leg(13, -86, 20, -45, 20, 0),
      leg(-13, -86, -14, -47, -16, 0),
    ),
    // decree: commanding push forward
    pose(
      head(11, -185),
      torso(8, -129, 52, 42, 92, 0.12),
      arm(28, -169, 50, -152, 58, -137),
      arm(-20, -169, 7, -147, 33, -137),
      leg(13, -86, 22, -43, 22, 0),
      leg(-13, -86, -14, -49, -18, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- royal_charge (3 frames: wind up, charge, recovery) --
  royal_charge: [
    // crouch behind sword
    pose(
      head(-1, -183),
      torso(-3, -130, 52, 42, 92, -0.08),
      arm(22, -170, 28, -152, 20, -137),
      arm(-26, -170, -8, -154, 12, -144),
      leg(13, -86, 18, -47, 16, 0),
      leg(-13, -86, -18, -47, -20, 0),
    ),
    // lunging forward with blade leading
    pose(
      head(15, -181),
      torso(12, -126, 52, 42, 92, 0.15),
      arm(32, -166, 58, -150, 88, -142),
      arm(-12, -166, 10, -150, 38, -140),
      leg(13, -86, 30, -49, 36, 0),
      leg(-13, -86, -6, -43, -8, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- blessed_blade (4 frames: crouch, massive rising slash, peak, recovery) --
  blessed_blade: [
    // deep crouch gathering holy power
    pose(
      head(-1, -150),
      torso(-2, -102, 54, 44, 74, -0.06),
      arm(24, -134, 16, -110, 3, -92),
      arm(-24, -134, -36, -117, -32, -97),
      leg(15, -66, 26, -34, 22, 0),
      leg(-15, -66, -26, -34, -24, 0),
    ),
    // explosive upward slash with holy energy
    pose(
      head(9, -188),
      torso(6, -132, 52, 42, 92, 0.12),
      arm(28, -172, 48, -177, 58, -212),
      arm(-20, -172, -30, -150, -24, -128),
      leg(13, -86, 20, -45, 20, 0),
      leg(-13, -86, -14, -47, -16, 0),
    ),
    // peak -- sword high, airborne
    pose(
      head(7, -208),
      torso(4, -154, 52, 42, 90, 0.08),
      arm(26, -192, 40, -207, 46, -242),
      arm(-22, -192, -36, -174, -30, -157),
      leg(13, -110, 20, -84, 18, -64),
      leg(-13, -110, -16, -80, -18, -60),
    ),
    // recovery landing
    pose(
      head(4, -188),
      torso(0, -132, 52, 42, 92),
      arm(24, -172, 36, -150, 28, -128),
      arm(-24, -172, -36, -150, -30, -128),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
  ],

  // -- block_stand (1 frame: sword guard raised) --
  block_stand: [
    pose(
      head(-1, -189),
      torso(-3, -133, 52, 42, 92, -0.05),
      arm(22, -173, 28, -157, 20, -142),
      arm(-26, -173, -8, -157, 10, -147),
      leg(13, -86, 16, -47, 14, 0),
      leg(-13, -86, -18, -47, -18, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched with sword guard) --
  block_crouch: [
    pose(
      head(-3, -134),
      torso(-4, -90, 54, 46, 72, -0.06),
      arm(22, -120, 26, -100, 18, -82),
      arm(-26, -120, -6, -102, 12, -94),
      leg(15, -55, 26, -28, 20, 0),
      leg(-15, -55, -26, -28, -22, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-9, -185),
      torso(-6, -130, 52, 42, 92, -0.12),
      arm(18, -170, 6, -150, -7, -132),
      arm(-30, -170, -46, -147, -50, -122),
      leg(13, -86, 8, -45, 2, 0),
      leg(-13, -86, -20, -47, -24, 0),
    ),
    pose(
      head(-13, -183),
      torso(-10, -128, 52, 42, 92, -0.18),
      arm(14, -168, 0, -147, -14, -130),
      arm(-34, -168, -50, -144, -56, -120),
      leg(13, -86, 4, -43, -2, 0),
      leg(-13, -86, -24, -49, -28, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    // falling
    pose(
      head(-16, -142),
      torso(-12, -97, 52, 42, 82, -0.35),
      arm(10, -132, -7, -112, -22, -97),
      arm(-36, -132, -50, -110, -56, -90),
      leg(13, -57, 18, -30, 22, 0),
      leg(-13, -57, -22, -32, -28, 0),
    ),
    // lying on ground
    pose(
      head(-52, -22),
      torso(-25, -20, 52, 42, 92, -1.5),
      arm(-5, -37, -25, -24, -45, -17),
      arm(-45, -12, -60, -7, -70, -2),
      leg(13, -12, 28, -7, 43, 0),
      leg(-13, -12, -6, -7, 7, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground) --
  get_up: [
    // pushing up
    pose(
      head(-21, -92),
      torso(-12, -62, 52, 42, 72, -0.4),
      arm(8, -92, 18, -57, 23, -32),
      arm(-32, -92, -43, -57, -40, -30),
      leg(13, -27, 22, -14, 20, 0),
      leg(-13, -27, -20, -16, -18, 0),
    ),
    // nearly standing
    pose(
      head(1, -173),
      torso(-2, -120, 52, 42, 87, -0.08),
      arm(22, -158, 32, -137, 26, -117),
      arm(-26, -158, -38, -140, -34, -120),
      leg(13, -77, 18, -42, 16, 0),
      leg(-13, -77, -18, -42, -16, 0),
    ),
  ],

  // -- victory (2 frames: sword raised triumphantly with regal composure) --
  victory: [
    // raise sword
    pose(
      head(4, -193),
      torso(0, -134, 52, 42, 92),
      arm(24, -174, 33, -192, 38, -220),
      arm(-24, -174, -36, -152, -28, -132),
      leg(13, -86, 16, -46, 14, 0),
      leg(-13, -86, -16, -46, -14, 0),
    ),
    // triumphant hold
    pose(
      head(4, -195),
      torso(0, -136, 52, 42, 92),
      arm(24, -176, 32, -197, 36, -226),
      arm(-24, -176, -38, -157, -33, -137),
      leg(13, -86, 18, -46, 16, 0),
      leg(-13, -86, -18, -46, -16, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed on the ground) --
  defeat: [
    pose(
      head(-57, -20),
      torso(-28, -18, 52, 42, 92, -1.55),
      arm(-8, -34, -28, -20, -50, -12),
      arm(-48, -10, -65, -4, -75, 0),
      leg(13, -10, 30, -5, 46, 0),
      leg(-13, -10, -3, -5, 10, 0),
    ),
  ],
};

// ---- Draw extras (longsword, crown, armor details) --------------------------

/**
 * Draw Guinevere's white cape behind the body (called before skeleton).
 */
export function drawGuinevereBackExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const capeColor = pal.accent ?? 0xffffff;

  if (p.torso && p.backArm) {
    const capeTop = p.torso.y - p.torso.height / 2;
    const capeX = p.torso.x - p.torso.topWidth / 2 - 2;
    const capeBottom = p.torso.y + p.torso.height / 2 + 18;
    const capeMid = (capeTop + capeBottom) / 2;

    // White flowing cape (slightly longer than Arthur's)
    g.moveTo(capeX, capeTop);
    g.quadraticCurveTo(capeX - 20, capeMid, capeX - 12, capeBottom);
    g.lineTo(capeX + 6, capeBottom - 2);
    g.quadraticCurveTo(capeX - 10, capeMid, capeX + 4, capeTop + 4);
    g.closePath();
    g.fill({ color: capeColor, alpha: 0.75 });

    // Cape highlight shimmer
    g.moveTo(capeX - 2, capeTop + 5);
    g.quadraticCurveTo(capeX - 12, capeMid - 5, capeX - 6, capeBottom - 10);
    g.stroke({ color: 0xeeeeff, width: 1, alpha: 0.3 });

    // Gold trim along cape edge
    g.moveTo(capeX - 1, capeTop + 2);
    g.quadraticCurveTo(capeX - 19, capeMid, capeX - 11, capeBottom);
    g.stroke({ color: 0xddaa33, width: 1.5, alpha: 0.6 });
  }
}

/**
 * Draw Guinevere's longsword, crown/tiara, and armor details (called after skeleton).
 */
export function drawGuinevereExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const weaponColor = pal.weapon ?? 0xccccdd;
  const goldColor = pal.weaponAccent ?? 0xddaa33;
  const armorColor = pal.body ?? 0xccaa44;
  const armorHighlight = 0xddcc66;
  const armorShadow = 0x997733;

  // --- Armor detail overlays on torso ---
  if (p.torso) {
    const t = p.torso;
    // Shoulder pauldrons (golden armor plates)
    const lsx = t.x - t.topWidth / 2 - 3;
    const rsx = t.x + t.topWidth / 2 + 3;
    const sy = t.y - t.height / 2 - 2;

    // Left pauldron
    g.roundRect(lsx - 7, sy - 2, 16, 13, 4);
    g.fill({ color: armorColor });
    g.roundRect(lsx - 7, sy - 2, 16, 13, 4);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(lsx - 3, sy + 4);
    g.lineTo(lsx + 7, sy + 4);
    g.stroke({ color: armorShadow, width: 1 });

    // Right pauldron
    g.roundRect(rsx - 9, sy - 2, 16, 13, 4);
    g.fill({ color: armorColor });
    g.roundRect(rsx - 9, sy - 2, 16, 13, 4);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(rsx - 5, sy + 4);
    g.lineTo(rsx + 5, sy + 4);
    g.stroke({ color: armorShadow, width: 1 });

    // Chest plate line detail
    g.moveTo(t.x, t.y - t.height / 2 + 6);
    g.lineTo(t.x, t.y + t.height / 2 - 10);
    g.stroke({ color: armorHighlight, width: 1, alpha: 0.4 });

    // Horizontal armor segment lines
    g.moveTo(t.x - t.topWidth / 3, t.y - 4);
    g.lineTo(t.x + t.topWidth / 3, t.y - 4);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.5 });

    // Gold belt buckle detail
    g.roundRect(t.x - 5, t.y + t.height / 2 - 8, 10, 7, 2);
    g.fill({ color: goldColor });
    g.roundRect(t.x - 5, t.y + t.height / 2 - 8, 10, 7, 2);
    g.stroke({ color: armorShadow, width: 1 });
  }

  // --- Knee guards on legs ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 7, ky - 5, 14, 11, 3);
    g.fill({ color: armorColor });
    g.roundRect(kx - 7, ky - 5, 14, 11, 3);
    g.stroke({ color: armorHighlight, width: 1 });
  }
  if (p.backLeg) {
    const kx = p.backLeg.kneeX;
    const ky = p.backLeg.kneeY;
    g.roundRect(kx - 6, ky - 4, 12, 9, 3);
    g.fill({ color: armorShadow });
    g.roundRect(kx - 6, ky - 4, 12, 9, 3);
    g.stroke({ color: armorColor, width: 1 });
  }

  // --- Boot detail (gold buckle straps) ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    g.moveTo(fx - 5, fy - 8);
    g.lineTo(fx + 7, fy - 8);
    g.stroke({ color: 0x553311, width: 2 });
    g.roundRect(fx - 1, fy - 10, 5, 5, 1);
    g.fill({ color: goldColor });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 4, fy - 7);
    g.lineTo(fx + 6, fy - 7);
    g.stroke({ color: 0x553311, width: 1.5 });
    g.roundRect(fx, fy - 9, 4, 4, 1);
    g.fill({ color: goldColor });
  }

  // --- Gauntlet details on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    // Elbow guard
    g.circle(ex, ey, 5);
    g.fill({ color: armorColor });
    g.circle(ex, ey, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    // Rivet dot on forearm
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx, my, 2);
    g.fill({ color: armorHighlight });
  }

  // --- Blessed Longsword in front arm (golden fittings) ---
  if (p.frontArm) {
    const hx = p.frontArm.handX;
    const hy = p.frontArm.handY;
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;

    // Blade direction: extend from hand away from elbow
    const dx = hx - ex;
    const dy = hy - ey;
    const len = Math.sqrt(dx * dx + dy * dy);
    const bladeLen = 52;
    const nx = len > 0 ? dx / len : 1;
    const ny = len > 0 ? dy / len : 0;
    const tipX = hx + nx * bladeLen;
    const tipY = hy + ny * bladeLen;

    // Blade outline
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke({ color: 0x222233, width: 7, cap: "round" });

    // Blade fill
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke({ color: weaponColor, width: 5, cap: "round" });

    // Blade fuller (groove down center)
    const fullerStart = 0.15;
    const fullerEnd = 0.85;
    g.moveTo(hx + nx * bladeLen * fullerStart, hy + ny * bladeLen * fullerStart);
    g.lineTo(hx + nx * bladeLen * fullerEnd, hy + ny * bladeLen * fullerEnd);
    g.stroke({ color: 0x9999aa, width: 1.5, cap: "round", alpha: 0.4 });

    // Holy glow highlight on blade (brighter than Arthur's)
    g.moveTo(hx + ny * 1, hy - nx * 1);
    g.lineTo(tipX + ny * 1, tipY - nx * 1);
    g.stroke({ color: 0xffffee, width: 1.5, cap: "round" });

    // Second highlight for blessed effect
    g.moveTo(hx - ny * 1, hy + nx * 1);
    g.lineTo(tipX - ny * 0.5, tipY + nx * 0.5);
    g.stroke({ color: 0xffeedd, width: 1, cap: "round", alpha: 0.5 });

    // Crossguard (perpendicular to blade, gold)
    const guardLen = 13;
    const gx1 = hx + ny * guardLen;
    const gy1 = hy - nx * guardLen;
    const gx2 = hx - ny * guardLen;
    const gy2 = hy + nx * guardLen;

    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: 0x222233, width: 7, cap: "round" });
    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: goldColor, width: 5, cap: "round" });

    // Crossguard end caps (ornate gold)
    g.circle(gx1, gy1, 3.5);
    g.fill({ color: goldColor });
    g.circle(gx1, gy1, 2);
    g.fill({ color: 0xffee88 });
    g.circle(gx2, gy2, 3.5);
    g.fill({ color: goldColor });
    g.circle(gx2, gy2, 2);
    g.fill({ color: 0xffee88 });

    // Pommel (ornate gold pommel with gem)
    const pommelX = hx - nx * 7;
    const pommelY = hy - ny * 7;
    g.circle(pommelX, pommelY, 5);
    g.fill({ color: 0x222233 });
    g.circle(pommelX, pommelY, 4);
    g.fill({ color: goldColor });
    g.circle(pommelX - nx * 0.5, pommelY - ny * 0.5, 2);
    g.fill({ color: 0xeeffee }); // green gem in pommel
  }

  // --- Crown/Tiara on head ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;

    // Tiara base (golden band across top of head)
    const crownY = hy - hr + 4;
    const crownW = hr * 1.1;

    // Gold band
    g.moveTo(hx - crownW, crownY + 2);
    g.lineTo(hx - crownW + 3, crownY - 2);
    g.lineTo(hx + crownW - 3, crownY - 2);
    g.lineTo(hx + crownW, crownY + 2);
    g.stroke({ color: goldColor, width: 3 });

    // Three points of the crown
    // Center point (tallest)
    g.moveTo(hx - 3, crownY - 2);
    g.lineTo(hx, crownY - 14);
    g.lineTo(hx + 3, crownY - 2);
    g.closePath();
    g.fill({ color: goldColor });

    // Left point
    g.moveTo(hx - crownW * 0.6 - 2, crownY - 1);
    g.lineTo(hx - crownW * 0.6, crownY - 10);
    g.lineTo(hx - crownW * 0.6 + 2, crownY - 1);
    g.closePath();
    g.fill({ color: goldColor });

    // Right point
    g.moveTo(hx + crownW * 0.6 - 2, crownY - 1);
    g.lineTo(hx + crownW * 0.6, crownY - 10);
    g.lineTo(hx + crownW * 0.6 + 2, crownY - 1);
    g.closePath();
    g.fill({ color: goldColor });

    // Gem on center point
    g.circle(hx, crownY - 10, 2.5);
    g.fill({ color: 0x44aa66 }); // emerald gem matching eye color

    // Small gems on side points
    g.circle(hx - crownW * 0.6, crownY - 7, 1.5);
    g.fill({ color: 0xeeffee });
    g.circle(hx + crownW * 0.6, crownY - 7, 1.5);
    g.fill({ color: 0xeeffee });

    // Gold band highlight
    g.moveTo(hx - crownW + 4, crownY);
    g.lineTo(hx + crownW - 4, crownY);
    g.stroke({ color: 0xffee88, width: 1, alpha: 0.6 });
  }
}
