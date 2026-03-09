// ---------------------------------------------------------------------------
// Tristan – The Sorrowful Knight
// Skeleton pose data for the duel fighting game.
// Dark blue armor, silver accents, dark brown hair, elegant lance.
// Spear fighter — quick precise thrusts, long reach, melancholy style.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const TRISTAN_PALETTE: FighterPalette = {
  skin: 0xddbb99,
  body: 0x445577,        // dark blue armor
  pants: 0x334466,        // dark blue armored leggings
  shoes: 0x443333,        // dark leather boots
  hair: 0x332211,         // dark brown
  eyes: 0x668899,
  outline: 0x222233,
  gloves: 0x445577,       // dark blue gauntlets
  belt: 0x553322,         // leather belt
  accent: 0x334466,       // dark blue half-cape
  weapon: 0xccccdd,       // lance shaft (silver)
  weaponAccent: 0x88aacc, // lance point (blue steel)
};

// ---- Poses -----------------------------------------------------------------

export const TRISTAN_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, reserved stance, lance held upright at side) --
  idle: [
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
    pose(
      head(3, -185),
      torso(0, -129, 52, 40, 88),
      arm(22, -169, 34, -147, 30, -125),
      arm(-22, -169, -34, -147, -28, -119),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
    pose(
      head(3, -184),
      torso(0, -128, 52, 40, 88),
      arm(22, -168, 34, -146, 30, -124),
      arm(-22, -168, -34, -146, -28, -118),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
    pose(
      head(3, -185),
      torso(0, -129, 52, 40, 88),
      arm(22, -169, 34, -147, 30, -125),
      arm(-22, -169, -34, -147, -28, -119),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- walk_forward (4 frames, measured stride with lance) --
  walk_forward: [
    pose(
      head(4, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 36, -148, 32, -126),
      arm(-22, -170, -30, -145, -24, -118),
      leg(11, -85, 24, -48, 26, 0),
      leg(-11, -85, -5, -42, -16, 0),
    ),
    pose(
      head(6, -185),
      torso(2, -129, 52, 40, 88),
      arm(24, -169, 38, -145, 34, -123),
      arm(-20, -169, -28, -142, -22, -116),
      leg(11, -85, 16, -44, 11, 0),
      leg(-11, -85, -11, -44, -11, 0),
    ),
    pose(
      head(4, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -32, -145, -26, -118),
      leg(11, -85, -3, -42, -12, 0),
      leg(-11, -85, 18, -48, 22, 0),
    ),
    pose(
      head(2, -185),
      torso(-2, -129, 52, 40, 88),
      arm(20, -169, 32, -145, 28, -123),
      arm(-24, -169, -34, -142, -30, -116),
      leg(11, -85, 11, -44, 11, 0),
      leg(-11, -85, -11, -44, -11, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious retreat, lance forward) --
  walk_back: [
    pose(
      head(2, -186),
      torso(-2, -130, 52, 40, 88),
      arm(20, -170, 32, -150, 28, -130),
      arm(-24, -170, -36, -148, -32, -126),
      leg(11, -85, 5, -48, -7, 0),
      leg(-11, -85, -20, -42, -24, 0),
    ),
    pose(
      head(0, -185),
      torso(-4, -129, 52, 40, 88),
      arm(18, -169, 30, -148, 26, -128),
      arm(-26, -169, -38, -146, -34, -124),
      leg(11, -85, 11, -44, 11, 0),
      leg(-11, -85, -11, -44, -11, 0),
    ),
    pose(
      head(2, -186),
      torso(-2, -130, 52, 40, 88),
      arm(20, -170, 32, -150, 28, -130),
      arm(-24, -170, -36, -148, -32, -126),
      leg(11, -85, 20, -42, 24, 0),
      leg(-11, -85, -5, -48, 7, 0),
    ),
    pose(
      head(0, -185),
      torso(-4, -129, 52, 40, 88),
      arm(18, -169, 30, -148, 26, -128),
      arm(-26, -169, -38, -146, -34, -124),
      leg(11, -85, 11, -44, 11, 0),
      leg(-11, -85, -11, -44, -11, 0),
    ),
  ],

  // -- crouch (1 frame, low guard with lance forward) --
  crouch: [
    pose(
      head(2, -132),
      torso(0, -86, 54, 44, 70),
      arm(22, -116, 36, -93, 44, -73),
      arm(-22, -116, -30, -95, -26, -76),
      leg(13, -51, 24, -26, 19, 0),
      leg(-13, -51, -24, -26, -19, 0),
    ),
  ],

  // -- jump (2 frames: leap with lance angled down) --
  jump: [
    pose(
      head(4, -191),
      torso(0, -139, 52, 40, 86),
      arm(22, -177, 40, -163, 53, -151),
      arm(-22, -177, -34, -156, -26, -141),
      leg(11, -95, 18, -69, 15, -49),
      leg(-11, -95, -18, -69, -15, -49),
    ),
    pose(
      head(4, -196),
      torso(0, -143, 52, 40, 86),
      arm(22, -181, 46, -171, 63, -161),
      arm(-22, -181, -36, -159, -28, -143),
      leg(11, -99, 20, -73, 24, -56),
      leg(-11, -99, -16, -66, -21, -51),
    ),
  ],

  // -- light_high: quick lance jab (3 frames) --
  light_high: [
    // startup: pull lance back
    pose(
      head(1, -186),
      torso(-2, -130, 52, 40, 88, -0.04),
      arm(20, -170, 12, -150, 3, -138),
      arm(-24, -170, -36, -148, -30, -126),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
    // extended jab: lance thrust far forward
    pose(
      head(7, -184),
      torso(4, -128, 52, 40, 88, 0.06),
      arm(26, -168, 56, -152, 88, -146),
      arm(-18, -168, -32, -146, -26, -122),
      leg(11, -85, 17, -44, 15, 0),
      leg(-11, -85, -15, -46, -15, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- med_high: horizontal lance sweep (3 frames) --
  med_high: [
    // startup: wind lance back
    pose(
      head(-1, -187),
      torso(-3, -130, 52, 40, 88, -0.08),
      arm(20, -170, 6, -168, -14, -170),
      arm(-24, -170, -36, -148, -32, -126),
      leg(11, -85, 17, -45, 15, 0),
      leg(-11, -85, -15, -45, -17, 0),
    ),
    // wide horizontal sweep
    pose(
      head(9, -183),
      torso(5, -127, 52, 40, 88, 0.1),
      arm(26, -167, 58, -145, 93, -129),
      arm(-18, -167, -30, -144, -24, -118),
      leg(11, -85, 19, -44, 17, 0),
      leg(-11, -85, -15, -46, -17, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- heavy_high: overhead lance slam (4 frames) --
  heavy_high: [
    // windup: lance raised high overhead
    pose(
      head(-1, -187),
      torso(-3, -131, 52, 40, 88, -0.06),
      arm(22, -170, 18, -186, 13, -216),
      arm(-22, -170, -13, -186, -8, -212),
      leg(11, -85, 17, -45, 15, 0),
      leg(-11, -85, -17, -45, -19, 0),
    ),
    // lance coming down
    pose(
      head(7, -183),
      torso(4, -127, 52, 40, 88, 0.12),
      arm(26, -167, 50, -148, 70, -108),
      arm(-18, -167, -3, -148, 18, -108),
      leg(11, -85, 19, -44, 19, 0),
      leg(-11, -85, -13, -46, -15, 0),
    ),
    // impact: lance driven into ground
    pose(
      head(11, -179),
      torso(6, -123, 52, 40, 88, 0.16),
      arm(28, -163, 56, -128, 78, -83),
      arm(-16, -163, 6, -128, 28, -83),
      leg(11, -85, 21, -42, 21, 0),
      leg(-11, -85, -13, -48, -17, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- light_low: low lance poke at shins (3 frames) --
  light_low: [
    // startup: dip lance low
    pose(
      head(2, -184),
      torso(-1, -130, 52, 40, 88, 0.04),
      arm(21, -170, 28, -140, 20, -112),
      arm(-23, -170, -34, -148, -30, -126),
      leg(11, -85, 17, -45, 15, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
    // low poke extended
    pose(
      head(5, -183),
      torso(3, -128, 52, 40, 88, 0.1),
      arm(24, -168, 50, -112, 78, -42),
      arm(-20, -168, -32, -146, -26, -122),
      leg(11, -85, 19, -44, 17, 0),
      leg(-11, -85, -15, -46, -15, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- med_low: crouching lance sweep (3 frames) --
  med_low: [
    // startup: crouch and pull lance back
    pose(
      head(1, -173),
      torso(0, -121, 52, 40, 82, 0.08),
      arm(22, -159, 26, -131, 10, -106),
      arm(-22, -159, -34, -139, -30, -116),
      leg(11, -79, 19, -42, 17, 0),
      leg(-11, -79, -17, -42, -17, 0),
    ),
    // low sweep: lance sweeps at ankle level
    pose(
      head(7, -171),
      torso(4, -119, 52, 40, 82, 0.16),
      arm(26, -157, 54, -109, 86, -76),
      arm(-18, -157, -28, -135, -22, -113),
      leg(11, -79, 21, -40, 19, 0),
      leg(-11, -79, -17, -44, -19, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- heavy_low: rising lance butt strike, launcher (4 frames) --
  heavy_low: [
    // windup: crouch, lance inverted
    pose(
      head(-1, -156),
      torso(-3, -106, 54, 42, 74, -0.1),
      arm(22, -139, 6, -121, -14, -109),
      arm(-22, -139, -34, -119, -32, -99),
      leg(13, -69, 24, -36, 21, 0),
      leg(-13, -69, -24, -36, -22, 0),
    ),
    // sweep: lance butt sweeps at ground level
    pose(
      head(9, -151),
      torso(5, -101, 54, 42, 74, 0.18),
      arm(26, -134, 54, -83, 82, -19),
      arm(-18, -134, -28, -113, -20, -93),
      leg(13, -69, 28, -31, 26, 0),
      leg(-13, -69, -22, -38, -24, 0),
    ),
    // hold
    pose(
      head(11, -149),
      torso(6, -99, 54, 42, 74, 0.2),
      arm(28, -132, 58, -79, 86, -15),
      arm(-16, -132, -26, -111, -18, -91),
      leg(13, -69, 30, -29, 28, 0),
      leg(-13, -69, -22, -38, -24, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- lance_pierce: forward long lunge (3 frames) --
  lance_pierce: [
    // startup: pull lance far back, lean back
    pose(
      head(-4, -187),
      torso(-6, -131, 52, 40, 88, -0.12),
      arm(20, -170, 0, -156, -20, -146),
      arm(-24, -170, -38, -150, -34, -131),
      leg(11, -85, 15, -45, 11, 0),
      leg(-11, -85, -19, -45, -21, 0),
    ),
    // lunge: body drives forward, lance extends max range
    pose(
      head(19, -179),
      torso(14, -124, 52, 40, 88, 0.18),
      arm(36, -164, 68, -148, 103, -141),
      arm(-8, -164, -20, -142, -14, -119),
      leg(11, -85, 32, -48, 38, 0),
      leg(-11, -85, -5, -42, -7, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- sorrow_impale: overhead downward impale (4 frames) --
  sorrow_impale: [
    // raise lance overhead, mournful posture
    pose(
      head(-1, -189),
      torso(-2, -132, 52, 40, 88, -0.06),
      arm(22, -172, 20, -191, 18, -220),
      arm(-22, -172, -16, -191, -14, -216),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -15, 0),
    ),
    // lance descending
    pose(
      head(6, -184),
      torso(3, -128, 52, 40, 88, 0.1),
      arm(25, -168, 46, -150, 62, -118),
      arm(-19, -168, -2, -150, 14, -118),
      leg(11, -85, 18, -44, 16, 0),
      leg(-11, -85, -14, -46, -16, 0),
    ),
    // full-force impale into ground
    pose(
      head(11, -177),
      torso(7, -122, 52, 40, 88, 0.2),
      arm(30, -162, 56, -130, 73, -81),
      arm(-14, -162, 10, -130, 24, -81),
      leg(11, -85, 22, -42, 22, 0),
      leg(-11, -85, -13, -48, -17, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- lance_trip: low sweeping lance trip (3 frames) --
  lance_trip: [
    // wind up: lance held wide at low angle
    pose(
      head(-1, -185),
      torso(-2, -130, 52, 40, 88, -0.06),
      arm(20, -170, 6, -161, -14, -156),
      arm(-24, -170, -40, -148, -53, -141),
      leg(11, -85, 17, -45, 15, 0),
      leg(-11, -85, -17, -45, -17, 0),
    ),
    // sweep: lance sweeps at ankle level
    pose(
      head(9, -181),
      torso(6, -126, 52, 40, 88, 0.14),
      arm(28, -166, 60, -139, 93, -119),
      arm(-16, -166, -8, -139, 12, -119),
      leg(11, -85, 21, -44, 21, 0),
      leg(-11, -85, -15, -46, -17, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- mourning_rise: anti-air rising lance thrust (4 frames) --
  mourning_rise: [
    // crouch to gather power
    pose(
      head(1, -149),
      torso(0, -101, 54, 42, 71),
      arm(22, -133, 26, -109, 16, -89),
      arm(-22, -133, -34, -116, -30, -96),
      leg(13, -65, 26, -33, 22, 0),
      leg(-13, -65, -24, -35, -24, 0),
    ),
    // thrust upward: rising with lance pointed to sky
    pose(
      head(7, -179),
      torso(4, -125, 52, 40, 84, 0.08),
      arm(26, -165, 43, -171, 50, -201),
      arm(-18, -165, -8, -171, -3, -196),
      leg(11, -83, 19, -44, 17, 0),
      leg(-11, -83, -15, -44, -15, 0),
    ),
    // peak: airborne with lance high
    pose(
      head(5, -203),
      torso(2, -151, 52, 40, 84, 0.05),
      arm(24, -189, 38, -201, 44, -233),
      arm(-20, -189, -4, -201, 0, -229),
      leg(11, -107, 19, -83, 17, -63),
      leg(-11, -107, -15, -79, -17, -59),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- grab: lance pin (3 frames) --
  grab: [
    // reach: both arms extend to grab
    pose(
      head(7, -185),
      torso(4, -129, 52, 40, 88, 0.06),
      arm(24, -169, 46, -155, 64, -146, true),
      arm(-20, -169, -6, -150, 14, -141, true),
      leg(11, -85, 19, -44, 19, 0),
      leg(-11, -85, -13, -46, -15, 0),
    ),
    // pin: press lance shaft against opponent
    pose(
      head(11, -183),
      torso(8, -127, 52, 40, 88, 0.12),
      arm(28, -167, 53, -148, 63, -136),
      arm(-16, -167, 10, -148, 28, -136),
      leg(11, -85, 21, -42, 21, 0),
      leg(-11, -85, -13, -48, -17, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- grief_charge: rushing forward lance charge (3 frames) --
  grief_charge: [
    // couch lance: tuck under arm, lean forward
    pose(
      head(7, -181),
      torso(4, -126, 52, 40, 88, 0.1),
      arm(26, -166, 40, -148, 53, -139),
      arm(-18, -166, -13, -148, 2, -139),
      leg(11, -85, 19, -46, 17, 0),
      leg(-11, -85, -17, -46, -19, 0),
    ),
    // charge forward: full extension
    pose(
      head(17, -177),
      torso(14, -122, 52, 40, 88, 0.18),
      arm(34, -162, 58, -144, 88, -136),
      arm(-6, -162, 14, -144, 32, -136),
      leg(11, -85, 32, -48, 38, 0),
      leg(-11, -85, -3, -42, -5, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- lance_toss: projectile spear throw (3 frames) --
  lance_toss: [
    // wind up: arm cocked back
    pose(
      head(-3, -187),
      torso(-5, -131, 52, 40, 88, -0.12),
      arm(18, -170, -2, -176, -20, -181),
      arm(-26, -170, -40, -150, -36, -129),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -17, -45, -19, 0),
    ),
    // throw: arm whips forward, releasing lance
    pose(
      head(11, -181),
      torso(8, -126, 52, 40, 88, 0.15),
      arm(30, -166, 58, -148, 83, -141, true),
      arm(-14, -166, -26, -142, -20, -119),
      leg(11, -85, 22, -44, 22, 0),
      leg(-11, -85, -13, -48, -17, 0),
    ),
    // recovery: hand empty
    pose(
      head(3, -186),
      torso(0, -130, 52, 40, 88),
      arm(22, -170, 34, -148, 30, -126, true),
      arm(-22, -170, -34, -148, -28, -120),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
  ],

  // -- block_stand (1 frame: lance shaft held horizontal across body) --
  block_stand: [
    pose(
      head(-1, -187),
      torso(-3, -131, 52, 40, 88, -0.05),
      arm(20, -171, 34, -156, 43, -143),
      arm(-24, -171, -6, -156, 10, -143),
      leg(11, -85, 15, -46, 13, 0),
      leg(-11, -85, -17, -46, -17, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched behind lance) --
  block_crouch: [
    pose(
      head(-3, -133),
      torso(-4, -89, 54, 44, 69, -0.06),
      arm(20, -119, 32, -101, 40, -86),
      arm(-24, -119, -4, -101, 12, -86),
      leg(13, -54, 24, -27, 19, 0),
      leg(-13, -54, -24, -27, -21, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-9, -183),
      torso(-6, -128, 52, 40, 88, -0.12),
      arm(16, -168, 4, -148, -8, -131),
      arm(-28, -168, -44, -145, -48, -121),
      leg(11, -85, 7, -44, 1, 0),
      leg(-11, -85, -19, -46, -23, 0),
    ),
    pose(
      head(-13, -181),
      torso(-10, -126, 52, 40, 88, -0.18),
      arm(12, -166, -2, -145, -16, -129),
      arm(-32, -166, -48, -142, -54, -119),
      leg(11, -85, 3, -42, -3, 0),
      leg(-11, -85, -23, -48, -27, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    pose(
      head(-16, -141),
      torso(-12, -96, 52, 40, 79, -0.35),
      arm(8, -131, -9, -111, -24, -96),
      arm(-34, -131, -48, -109, -54, -89),
      leg(11, -56, 17, -29, 21, 0),
      leg(-11, -56, -21, -31, -27, 0),
    ),
    pose(
      head(-51, -21),
      torso(-26, -19, 52, 40, 88, -1.5),
      arm(-6, -36, -26, -23, -46, -16),
      arm(-46, -11, -61, -6, -71, -1),
      leg(11, -11, 27, -6, 41, 0),
      leg(-11, -11, -5, -6, 4, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground) --
  get_up: [
    pose(
      head(-21, -91),
      torso(-12, -61, 52, 40, 69, -0.4),
      arm(6, -91, 16, -56, 20, -31),
      arm(-30, -91, -40, -56, -38, -29),
      leg(11, -26, 21, -13, 19, 0),
      leg(-11, -26, -19, -15, -17, 0),
    ),
    pose(
      head(1, -171),
      torso(-2, -119, 52, 40, 83, -0.08),
      arm(20, -157, 30, -136, 24, -116),
      arm(-24, -157, -36, -139, -32, -119),
      leg(11, -76, 17, -41, 15, 0),
      leg(-11, -76, -17, -41, -15, 0),
    ),
  ],

  // -- victory (2 frames: lance held sorrowfully at side, head bowed) --
  victory: [
    pose(
      head(2, -188),
      torso(0, -132, 52, 40, 88),
      arm(22, -172, 32, -192, 36, -223),
      arm(-22, -172, -34, -150, -26, -131),
      leg(11, -85, 15, -45, 13, 0),
      leg(-11, -85, -15, -45, -13, 0),
    ),
    pose(
      head(2, -190),
      torso(0, -134, 52, 40, 88),
      arm(22, -174, 30, -196, 34, -229),
      arm(-22, -174, -36, -155, -30, -136),
      leg(11, -85, 17, -45, 15, 0),
      leg(-11, -85, -17, -45, -15, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed with lance dropped) --
  defeat: [
    pose(
      head(-56, -19),
      torso(-29, -17, 52, 40, 88, -1.55),
      arm(-9, -33, -29, -19, -51, -11),
      arm(-47, -9, -64, -3, -74, 1),
      leg(11, -9, 29, -4, 44, 0),
      leg(-11, -9, -4, -4, 5, 0),
    ),
  ],
};

// ---- Draw extras (elegant lance, armor shoulder guards) --------------------

/**
 * Draw Tristan's dark blue half-cape behind the body (called before skeleton).
 */
export function drawTristanBackExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const capeColor = pal.accent ?? 0x334466;
  const capeDark = 0x223355;

  if (p.torso && p.backArm) {
    const capeTop = p.torso.y - p.torso.height / 2;
    const capeX = p.torso.x - p.torso.topWidth / 2 - 3;
    const capeBottom = p.torso.y + p.torso.height / 2 + 30;
    const capeMid = (capeTop + capeBottom) / 2;

    // Main half-cape body — dark blue flowing fabric
    g.moveTo(capeX + 6, capeTop);
    g.quadraticCurveTo(capeX - 24, capeMid - 6, capeX - 18, capeBottom);
    g.lineTo(capeX + 6, capeBottom - 8);
    g.quadraticCurveTo(capeX - 12, capeMid, capeX + 6, capeTop + 4);
    g.closePath();
    g.fill({ color: capeColor, alpha: 0.8 });

    // Inner fold shadow
    g.moveTo(capeX + 2, capeTop + 10);
    g.quadraticCurveTo(capeX - 14, capeMid + 5, capeX - 8, capeBottom - 8);
    g.stroke({ color: capeDark, width: 1.5, alpha: 0.5 });

    // Silver trim along cape edge
    g.moveTo(capeX + 6, capeTop + 2);
    g.quadraticCurveTo(capeX - 22, capeMid - 4, capeX - 16, capeBottom - 2);
    g.stroke({ color: 0x99aabb, width: 1, alpha: 0.5 });
  }
}

/**
 * Draw Tristan's elegant lance and armor shoulder guards (called after skeleton).
 */
export function drawTristanExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const shaftColor = pal.weapon ?? 0xccccdd;
  const lancePointColor = pal.weaponAccent ?? 0x88aacc;
  const armorColor = pal.body ?? 0x445577;
  const armorHighlight = 0x556688;
  const armorShadow = 0x334455;
  const silverTrim = 0x99aabb;

  // --- Armor shoulder guards on torso ---
  if (p.torso) {
    const t = p.torso;

    // Shoulder pauldrons — ornate, dark blue with silver trim
    const lsx = t.x - t.topWidth / 2 - 5;
    const rsx = t.x + t.topWidth / 2 + 5;
    const sy = t.y - t.height / 2 - 2;

    // Left pauldron
    g.roundRect(lsx - 10, sy - 5, 21, 16, 5);
    g.fill({ color: armorColor });
    g.roundRect(lsx - 10, sy - 5, 21, 16, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(lsx - 6, sy + 4);
    g.lineTo(lsx + 9, sy + 4);
    g.stroke({ color: armorShadow, width: 1 });
    // Silver trim on pauldron
    g.moveTo(lsx - 8, sy - 3);
    g.lineTo(lsx + 9, sy - 3);
    g.stroke({ color: silverTrim, width: 1.5, alpha: 0.6 });

    // Right pauldron
    g.roundRect(rsx - 11, sy - 5, 21, 16, 5);
    g.fill({ color: armorColor });
    g.roundRect(rsx - 11, sy - 5, 21, 16, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(rsx - 7, sy + 4);
    g.lineTo(rsx + 8, sy + 4);
    g.stroke({ color: armorShadow, width: 1 });
    // Silver trim
    g.moveTo(rsx - 9, sy - 3);
    g.lineTo(rsx + 8, sy - 3);
    g.stroke({ color: silverTrim, width: 1.5, alpha: 0.6 });

    // Chest plate — vertical center line
    g.moveTo(t.x, t.y - t.height / 2 + 6);
    g.lineTo(t.x, t.y + t.height / 2 - 10);
    g.stroke({ color: armorHighlight, width: 1, alpha: 0.4 });

    // Horizontal armor segment
    g.moveTo(t.x - t.topWidth / 3, t.y - 4);
    g.lineTo(t.x + t.topWidth / 3, t.y - 4);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.5 });

    // Sorrow emblem — teardrop shape on chest
    g.moveTo(t.x, t.y - t.height / 2 + 10);
    g.quadraticCurveTo(t.x + 5, t.y - t.height / 2 + 18, t.x, t.y - t.height / 2 + 24);
    g.quadraticCurveTo(t.x - 5, t.y - t.height / 2 + 18, t.x, t.y - t.height / 2 + 10);
    g.closePath();
    g.fill({ color: silverTrim, alpha: 0.7 });
  }

  // --- Knee guards ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 7, ky - 6, 14, 12, 4);
    g.fill({ color: armorColor });
    g.roundRect(kx - 7, ky - 6, 14, 12, 4);
    g.stroke({ color: armorHighlight, width: 1 });
  }
  if (p.backLeg) {
    const kx = p.backLeg.kneeX;
    const ky = p.backLeg.kneeY;
    g.roundRect(kx - 6, ky - 5, 12, 10, 3);
    g.fill({ color: armorShadow });
    g.roundRect(kx - 6, ky - 5, 12, 10, 3);
    g.stroke({ color: armorColor, width: 1 });
  }

  // --- Boot detail ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    g.moveTo(fx - 5, fy - 8);
    g.lineTo(fx + 7, fy - 8);
    g.stroke({ color: 0x332222, width: 2 });
    g.roundRect(fx - 1, fy - 10, 4, 4, 1);
    g.fill({ color: silverTrim });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 4, fy - 7);
    g.lineTo(fx + 6, fy - 7);
    g.stroke({ color: 0x332222, width: 1.5 });
    g.roundRect(fx, fy - 9, 3, 3, 1);
    g.fill({ color: silverTrim });
  }

  // --- Elbow guard on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    g.circle(ex, ey, 5);
    g.fill({ color: armorColor });
    g.circle(ex, ey, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    // Silver rivet
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx, my, 2);
    g.fill({ color: silverTrim });
  }

  // --- Elegant lance in front arm ---
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

    // Lance shaft — longer than typical spear, more ornate
    const shaftForward = 72;
    const shaftBack = 24;
    const tipX = hx + nx * shaftForward;
    const tipY = hy + ny * shaftForward;
    const buttX = hx - nx * shaftBack;
    const buttY = hy - ny * shaftBack;

    // Shaft outline
    g.moveTo(buttX, buttY);
    g.lineTo(tipX, tipY);
    g.stroke({ color: 0x222233, width: 6, cap: "round" });

    // Shaft fill (silver)
    g.moveTo(buttX, buttY);
    g.lineTo(tipX, tipY);
    g.stroke({ color: shaftColor, width: 4, cap: "round" });

    // Decorative spiral groove on shaft
    const midShaftX = (hx + tipX) / 2;
    const midShaftY = (hy + tipY) / 2;
    g.moveTo(hx + ny * 0.8, hy - nx * 0.8);
    g.lineTo(midShaftX + ny * 0.8, midShaftY - nx * 0.8);
    g.stroke({ color: silverTrim, width: 1, cap: "round", alpha: 0.4 });

    // Second groove line
    g.moveTo(hx - ny * 0.8, hy + nx * 0.8);
    g.lineTo(midShaftX - ny * 0.8, midShaftY + nx * 0.8);
    g.stroke({ color: 0xaabbcc, width: 1, cap: "round", alpha: 0.3 });

    // --- Lance point (elongated, elegant blue-steel tip) ---
    const pointLen = 24;
    const pointTipX = tipX + nx * pointLen;
    const pointTipY = tipY + ny * pointLen;
    const pointW = 5;

    // Lance point outline
    g.moveTo(tipX, tipY);
    g.lineTo(tipX + ny * pointW, tipY - nx * pointW);
    g.lineTo(pointTipX, pointTipY);
    g.lineTo(tipX - ny * pointW, tipY + nx * pointW);
    g.closePath();
    g.fill({ color: 0x222233 });

    // Lance point fill (blue steel)
    const inset = 1.5;
    g.moveTo(tipX + nx * inset, tipY + ny * inset);
    g.lineTo(tipX + ny * (pointW - inset), tipY - nx * (pointW - inset));
    g.lineTo(pointTipX - nx * inset, pointTipY - ny * inset);
    g.lineTo(tipX - ny * (pointW - inset), tipY + nx * (pointW - inset));
    g.closePath();
    g.fill({ color: lancePointColor });

    // Lance point highlight (center ridge)
    g.moveTo(tipX + nx * 3, tipY + ny * 3);
    g.lineTo(pointTipX - nx * 2, pointTipY - ny * 2);
    g.stroke({ color: 0xbbddee, width: 1.5, cap: "round", alpha: 0.7 });

    // --- Cross-guard / hand-guard (ornate silver ring) ---
    const guardX = hx + nx * 2;
    const guardY = hy + ny * 2;
    const guardW = 8;
    g.moveTo(guardX + ny * guardW, guardY - nx * guardW);
    g.lineTo(guardX - ny * guardW, guardY + nx * guardW);
    g.stroke({ color: 0x222233, width: 4, cap: "round" });
    g.moveTo(guardX + ny * guardW, guardY - nx * guardW);
    g.lineTo(guardX - ny * guardW, guardY + nx * guardW);
    g.stroke({ color: silverTrim, width: 2.5, cap: "round" });

    // --- Butt cap (silver end cap on shaft butt) ---
    const capX = buttX - nx * 3;
    const capY = buttY - ny * 3;
    g.circle(capX, capY, 4);
    g.fill({ color: 0x222233 });
    g.circle(capX, capY, 3);
    g.fill({ color: shaftColor });
  }

  // --- Helm detail (Tristan has an open-face helm with silver trim) ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;
    // Silver trim around helm
    g.moveTo(hx - 10, hy - hr + 4);
    g.lineTo(hx + 12, hy - hr + 4);
    g.stroke({ color: silverTrim, width: 2, cap: "round" });
    // Small visor ridge
    g.moveTo(hx - 8, hy - hr + 8);
    g.lineTo(hx + 10, hy - hr + 8);
    g.stroke({ color: armorShadow, width: 1.5, cap: "round", alpha: 0.5 });
  }
}
