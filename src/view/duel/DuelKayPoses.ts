// ---------------------------------------------------------------------------
// Kay – Seneschal of Camelot
// Skeleton pose data for the duel fighting game.
// Brown leather and mail armor, military pike — practical, no-nonsense fighter.
// Spear fighter — long-range pike thrusts, sweeps, and authoritative slams.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const KAY_PALETTE: FighterPalette = {
  skin: 0xddbb99,
  body: 0x776655,        // brown leather/mail
  pants: 0x554433,        // dark brown trousers
  shoes: 0x443322,        // dark leather boots
  hair: 0x553322,         // dark brown
  eyes: 0x556644,
  outline: 0x222233,
  gloves: 0x776655,       // leather gauntlets
  belt: 0x553322,         // dark leather belt
  accent: 0x886644,       // brown accent
  weapon: 0x998877,       // pike shaft
  weaponAccent: 0x888899, // pike head (steel)
};

// ---- Poses -----------------------------------------------------------------

export const KAY_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, sturdy stance, pike held upright at side) --
  idle: [
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    pose(
      head(3, -184),
      torso(0, -129, 56, 44, 90),
      arm(25, -169, 37, -147, 33, -124),
      arm(-25, -169, -37, -147, -31, -119),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    pose(
      head(3, -183),
      torso(0, -128, 56, 44, 90),
      arm(25, -168, 37, -146, 33, -123),
      arm(-25, -168, -37, -146, -31, -118),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    pose(
      head(3, -184),
      torso(0, -129, 56, 44, 90),
      arm(25, -169, 37, -147, 33, -124),
      arm(-25, -169, -37, -147, -31, -119),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- walk_forward (4 frames, heavy measured stride) --
  walk_forward: [
    pose(
      head(4, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 39, -148, 35, -125),
      arm(-25, -170, -33, -145, -27, -118),
      leg(13, -85, 27, -48, 29, 0),
      leg(-13, -85, -7, -42, -19, 0),
    ),
    pose(
      head(6, -184),
      torso(2, -129, 56, 44, 90),
      arm(27, -169, 41, -145, 37, -122),
      arm(-23, -169, -31, -142, -25, -116),
      leg(13, -85, 19, -44, 13, 0),
      leg(-13, -85, -13, -44, -13, 0),
    ),
    pose(
      head(4, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -35, -145, -29, -118),
      leg(13, -85, -5, -42, -15, 0),
      leg(-13, -85, 21, -48, 25, 0),
    ),
    pose(
      head(2, -184),
      torso(-2, -129, 56, 44, 90),
      arm(23, -169, 35, -145, 31, -122),
      arm(-27, -169, -37, -142, -33, -116),
      leg(13, -85, 13, -44, 13, 0),
      leg(-13, -85, -13, -44, -13, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious retreat with pike forward) --
  walk_back: [
    pose(
      head(2, -185),
      torso(-2, -130, 56, 44, 90),
      arm(23, -170, 35, -150, 31, -130),
      arm(-27, -170, -39, -148, -35, -125),
      leg(13, -85, 7, -48, -7, 0),
      leg(-13, -85, -23, -42, -27, 0),
    ),
    pose(
      head(0, -184),
      torso(-4, -129, 56, 44, 90),
      arm(21, -169, 33, -148, 29, -128),
      arm(-29, -169, -41, -146, -37, -123),
      leg(13, -85, 13, -44, 13, 0),
      leg(-13, -85, -13, -44, -13, 0),
    ),
    pose(
      head(2, -185),
      torso(-2, -130, 56, 44, 90),
      arm(23, -170, 35, -150, 31, -130),
      arm(-27, -170, -39, -148, -35, -125),
      leg(13, -85, 23, -42, 27, 0),
      leg(-13, -85, -7, -48, 7, 0),
    ),
    pose(
      head(0, -184),
      torso(-4, -129, 56, 44, 90),
      arm(21, -169, 33, -148, 29, -128),
      arm(-29, -169, -41, -146, -37, -123),
      leg(13, -85, 13, -44, 13, 0),
      leg(-13, -85, -13, -44, -13, 0),
    ),
  ],

  // -- crouch (1 frame, low guard with pike angled forward) --
  crouch: [
    pose(
      head(2, -130),
      torso(0, -85, 58, 46, 70),
      arm(25, -115, 39, -92, 46, -72),
      arm(-25, -115, -33, -95, -29, -75),
      leg(15, -50, 27, -25, 21, 0),
      leg(-15, -50, -27, -25, -21, 0),
    ),
  ],

  // -- jump (2 frames, pike angled downward) --
  jump: [
    pose(
      head(4, -190),
      torso(0, -138, 56, 44, 88),
      arm(25, -176, 43, -162, 56, -150),
      arm(-25, -176, -37, -155, -29, -140),
      leg(13, -94, 21, -68, 17, -48),
      leg(-13, -94, -21, -68, -17, -48),
    ),
    pose(
      head(4, -195),
      torso(0, -142, 56, 44, 88),
      arm(25, -180, 49, -170, 66, -160),
      arm(-25, -180, -39, -158, -31, -142),
      leg(13, -98, 23, -72, 27, -55),
      leg(-13, -98, -19, -65, -24, -50),
    ),
  ],

  // -- light_high: quick pike jab (3 frames) --
  light_high: [
    // startup: pull pike back
    pose(
      head(1, -185),
      torso(-2, -130, 56, 44, 90, -0.04),
      arm(23, -170, 15, -150, 6, -138),
      arm(-27, -170, -39, -148, -33, -125),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    // extended jab: pike thrust far forward
    pose(
      head(7, -183),
      torso(4, -128, 56, 44, 90, 0.06),
      arm(29, -168, 59, -152, 92, -145),
      arm(-21, -168, -35, -146, -29, -122),
      leg(13, -85, 19, -44, 17, 0),
      leg(-13, -85, -17, -46, -17, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- med_high: horizontal shaft strike (3 frames) --
  med_high: [
    // startup: wind pike back
    pose(
      head(-1, -186),
      torso(-3, -130, 56, 44, 90, -0.08),
      arm(23, -170, 9, -168, -11, -170),
      arm(-27, -170, -39, -148, -35, -125),
      leg(13, -85, 19, -45, 17, 0),
      leg(-13, -85, -17, -45, -19, 0),
    ),
    // wide horizontal strike
    pose(
      head(9, -182),
      torso(5, -127, 56, 44, 90, 0.1),
      arm(29, -167, 61, -145, 96, -128),
      arm(-21, -167, -33, -144, -27, -118),
      leg(13, -85, 21, -44, 19, 0),
      leg(-13, -85, -17, -46, -19, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- heavy_high: overhead pike slam (4 frames) --
  heavy_high: [
    // windup: pike raised high overhead
    pose(
      head(-1, -186),
      torso(-3, -131, 56, 44, 90, -0.06),
      arm(25, -170, 21, -185, 16, -215),
      arm(-25, -170, -16, -185, -11, -210),
      leg(13, -85, 19, -45, 17, 0),
      leg(-13, -85, -19, -45, -21, 0),
    ),
    // pike coming down
    pose(
      head(7, -182),
      torso(4, -127, 56, 44, 90, 0.12),
      arm(29, -167, 53, -148, 73, -108),
      arm(-21, -167, -6, -148, 19, -108),
      leg(13, -85, 21, -44, 21, 0),
      leg(-13, -85, -15, -46, -17, 0),
    ),
    // impact: pike driven down
    pose(
      head(11, -178),
      torso(6, -123, 56, 44, 90, 0.16),
      arm(31, -163, 59, -128, 81, -82),
      arm(-19, -163, 7, -128, 29, -82),
      leg(13, -85, 23, -42, 23, 0),
      leg(-13, -85, -15, -48, -19, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- light_low: low pike poke at shins (3 frames) --
  light_low: [
    // startup: dip pike low
    pose(
      head(2, -183),
      torso(-1, -130, 56, 44, 90, 0.04),
      arm(24, -170, 31, -140, 23, -110),
      arm(-26, -170, -37, -148, -33, -125),
      leg(13, -85, 19, -45, 17, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    // low poke extended
    pose(
      head(5, -182),
      torso(3, -128, 56, 44, 90, 0.1),
      arm(27, -168, 53, -110, 82, -40),
      arm(-23, -168, -35, -146, -29, -122),
      leg(13, -85, 21, -44, 19, 0),
      leg(-13, -85, -17, -46, -17, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- med_low: crouching pike sweep (3 frames) --
  med_low: [
    // startup: crouch and pull pike back
    pose(
      head(1, -172),
      torso(0, -120, 56, 44, 84, 0.08),
      arm(25, -158, 29, -130, 13, -105),
      arm(-25, -158, -37, -138, -33, -115),
      leg(13, -78, 21, -42, 19, 0),
      leg(-13, -78, -19, -42, -19, 0),
    ),
    // low sweep: pike sweeps at ankle level
    pose(
      head(7, -170),
      torso(4, -118, 56, 44, 84, 0.16),
      arm(29, -156, 57, -108, 89, -75),
      arm(-21, -156, -31, -134, -25, -112),
      leg(13, -78, 23, -40, 21, 0),
      leg(-13, -78, -19, -44, -21, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- heavy_low: butt-end sweep, launcher (4 frames) --
  heavy_low: [
    // windup: crouch, pike inverted
    pose(
      head(-1, -155),
      torso(-3, -105, 58, 46, 75, -0.1),
      arm(25, -138, 9, -120, -11, -108),
      arm(-25, -138, -37, -118, -35, -98),
      leg(15, -68, 27, -35, 23, 0),
      leg(-15, -68, -27, -35, -25, 0),
    ),
    // sweep: pike butt sweeps at ground level
    pose(
      head(9, -150),
      torso(5, -100, 58, 46, 75, 0.18),
      arm(29, -133, 57, -82, 85, -18),
      arm(-21, -133, -31, -112, -23, -92),
      leg(15, -68, 31, -30, 29, 0),
      leg(-15, -68, -25, -38, -27, 0),
    ),
    // hold
    pose(
      head(11, -148),
      torso(6, -98, 58, 46, 75, 0.2),
      arm(31, -131, 61, -78, 89, -14),
      arm(-19, -131, -29, -110, -21, -90),
      leg(15, -68, 33, -28, 31, 0),
      leg(-15, -68, -25, -38, -27, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- pike_thrust: long-range forward lunge (3 frames) --
  pike_thrust: [
    // startup: pull pike far back, lean back
    pose(
      head(-4, -186),
      torso(-6, -131, 56, 44, 90, -0.12),
      arm(23, -170, 3, -155, -17, -145),
      arm(-27, -170, -41, -150, -37, -130),
      leg(13, -85, 17, -45, 13, 0),
      leg(-13, -85, -21, -45, -23, 0),
    ),
    // lunge: body drives forward, pike at max extension
    pose(
      head(19, -178),
      torso(14, -124, 56, 44, 90, 0.18),
      arm(39, -164, 71, -148, 108, -140),
      arm(-11, -164, -23, -142, -17, -118),
      leg(13, -85, 35, -48, 41, 0),
      leg(-13, -85, -7, -42, -9, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- authority_slam: overhead two-handed slam (4 frames) --
  authority_slam: [
    // raise pike high overhead with both hands
    pose(
      head(-1, -188),
      torso(-2, -132, 56, 44, 90, -0.06),
      arm(25, -172, 23, -190, 21, -218),
      arm(-25, -172, -19, -190, -17, -214),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -17, 0),
    ),
    // pike descending
    pose(
      head(8, -180),
      torso(5, -126, 56, 44, 90, 0.14),
      arm(30, -166, 54, -140, 72, -100),
      arm(-20, -166, -4, -140, 18, -100),
      leg(13, -85, 21, -44, 19, 0),
      leg(-13, -85, -15, -46, -17, 0),
    ),
    // slam impact: full force
    pose(
      head(13, -176),
      torso(8, -122, 56, 44, 90, 0.2),
      arm(33, -162, 59, -130, 76, -78),
      arm(-17, -162, 9, -130, 23, -78),
      leg(13, -85, 25, -42, 25, 0),
      leg(-13, -85, -15, -48, -19, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- pike_sweep: low spinning pike sweep (3 frames) --
  pike_sweep: [
    // wind up: pike held wide low
    pose(
      head(-1, -184),
      torso(-2, -130, 56, 44, 90, -0.06),
      arm(23, -170, 9, -160, -11, -155),
      arm(-27, -170, -43, -148, -56, -140),
      leg(13, -85, 19, -45, 17, 0),
      leg(-13, -85, -19, -45, -19, 0),
    ),
    // spin: pike sweeps in a low arc
    pose(
      head(9, -180),
      torso(6, -126, 56, 44, 90, 0.14),
      arm(31, -166, 63, -138, 96, -118),
      arm(-19, -166, -11, -138, 9, -118),
      leg(13, -85, 23, -44, 23, 0),
      leg(-13, -85, -17, -46, -19, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- pike_vault: anti-air vault kick off pike (4 frames) --
  pike_vault: [
    // plant pike into ground
    pose(
      head(4, -180),
      torso(2, -126, 56, 44, 88, 0.06),
      arm(27, -166, 41, -130, 46, -80),
      arm(-23, -166, -11, -130, -1, -80),
      leg(13, -82, 21, -44, 19, 0),
      leg(-13, -82, -17, -44, -15, 0),
    ),
    // vault up: body rising
    pose(
      head(9, -200),
      torso(6, -148, 56, 44, 86, 0.1),
      arm(29, -186, 43, -155, 46, -100),
      arm(-21, -186, -9, -155, -1, -100),
      leg(13, -104, 31, -90, 46, -75),
      leg(-13, -104, -17, -80, -21, -65),
    ),
    // kick at peak
    pose(
      head(7, -210),
      torso(4, -158, 56, 44, 86, 0.05),
      arm(27, -196, 41, -168, 43, -120),
      arm(-23, -196, -11, -168, -6, -120),
      leg(13, -114, 39, -100, 61, -90),
      leg(-13, -114, -21, -88, -25, -70),
    ),
    // recovery landing
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- grab: pike shove (3 frames) --
  grab: [
    // reach: arms extend to grab with pike shaft
    pose(
      head(7, -184),
      torso(4, -129, 56, 44, 90, 0.06),
      arm(27, -169, 49, -155, 67, -145, true),
      arm(-23, -169, -9, -150, 11, -140, true),
      leg(13, -85, 21, -44, 21, 0),
      leg(-13, -85, -15, -46, -17, 0),
    ),
    // shove: pike shaft drives opponent back
    pose(
      head(11, -182),
      torso(8, -127, 56, 44, 90, 0.12),
      arm(31, -167, 56, -148, 66, -135),
      arm(-19, -167, 7, -148, 29, -135),
      leg(13, -85, 23, -42, 23, 0),
      leg(-13, -85, -15, -48, -19, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- bull_rush: charging forward rush with pike (3 frames) --
  bull_rush: [
    // couch pike: tuck under arm, lean forward
    pose(
      head(7, -180),
      torso(4, -126, 56, 44, 90, 0.1),
      arm(29, -166, 43, -148, 56, -138),
      arm(-21, -166, -16, -148, -1, -138),
      leg(13, -85, 21, -46, 19, 0),
      leg(-13, -85, -19, -46, -21, 0),
    ),
    // charge forward: full extension
    pose(
      head(17, -176),
      torso(14, -122, 56, 44, 90, 0.18),
      arm(37, -162, 61, -144, 91, -135),
      arm(-9, -162, 11, -144, 29, -135),
      leg(13, -85, 35, -48, 41, 0),
      leg(-13, -85, -5, -42, -7, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- pike_toss: throw pike as projectile (3 frames) --
  pike_toss: [
    // wind up: arm cocked back with pike
    pose(
      head(-3, -186),
      torso(-5, -131, 56, 44, 90, -0.12),
      arm(21, -170, 1, -175, -17, -180),
      arm(-29, -170, -43, -150, -39, -128),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -19, -45, -21, 0),
    ),
    // throw: arm whips forward releasing pike
    pose(
      head(11, -180),
      torso(8, -126, 56, 44, 90, 0.15),
      arm(33, -166, 61, -148, 86, -140, true),
      arm(-17, -166, -29, -142, -23, -118),
      leg(13, -85, 25, -44, 25, 0),
      leg(-13, -85, -15, -48, -19, 0),
    ),
    // recovery: hand empty
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125, true),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- pike_storm: rapid pike thrusts (3 frames) --
  pike_storm: [
    // wind up
    pose(
      head(-3, -184),
      torso(-4, -130, 56, 44, 90, -0.1),
      arm(21, -170, 6, -165, -14, -160),
      arm(-29, -170, -43, -155, -51, -140),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -17, 0),
    ),
    // wide cross-body lunge
    pose(
      head(13, -178),
      torso(10, -124, 56, 44, 90, 0.16),
      arm(35, -164, 65, -140, 99, -122),
      arm(-15, -164, 9, -140, 34, -122),
      leg(13, -85, 29, -46, 33, 0),
      leg(-13, -85, -11, -44, -13, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- stern_guard: counter stance, pike shaft parry (3 frames) --
  stern_guard: [
    // guard: pike held horizontal across body
    pose(
      head(1, -186),
      torso(-2, -131, 56, 44, 90, -0.04),
      arm(25, -170, 41, -155, 56, -145),
      arm(-25, -170, -11, -155, 4, -145),
      leg(13, -85, 17, -46, 15, 0),
      leg(-13, -85, -19, -46, -19, 0),
    ),
    // deflect: pike swings to parry and riposte
    pose(
      head(5, -184),
      torso(2, -129, 56, 44, 90, 0.06),
      arm(27, -169, 49, -152, 66, -138),
      arm(-23, -169, -1, -152, 17, -138),
      leg(13, -85, 19, -44, 17, 0),
      leg(-13, -85, -17, -46, -17, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- seneschal_fury: forward rushing pike assault, zeal 1 (3 frames) --
  seneschal_fury: [
    // wind up
    pose(
      head(-3, -184),
      torso(-4, -130, 56, 44, 90, -0.1),
      arm(21, -170, 6, -165, -14, -162),
      arm(-29, -170, -46, -148, -59, -138),
      leg(13, -85, 19, -45, 17, 0),
      leg(-13, -85, -19, -45, -19, 0),
    ),
    // full rush: arms extended, pike driving forward
    pose(
      head(16, -176),
      torso(12, -124, 56, 44, 90, 0.16),
      arm(37, -164, 67, -142, 100, -130),
      arm(-13, -164, 7, -142, 28, -130),
      leg(13, -85, 33, -46, 37, 0),
      leg(-13, -85, -9, -44, -11, 0),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- martial_authority: launcher zeal 2 (3 frames) --
  martial_authority: [
    // crouch to gather power
    pose(
      head(1, -148),
      torso(0, -100, 58, 46, 72),
      arm(25, -132, 29, -108, 19, -88),
      arm(-25, -132, -37, -115, -33, -95),
      leg(15, -64, 29, -32, 25, 0),
      leg(-15, -64, -27, -34, -27, 0),
    ),
    // rising thrust upward: pike skyward
    pose(
      head(7, -202),
      torso(4, -150, 56, 44, 86, 0.08),
      arm(29, -188, 46, -200, 53, -232),
      arm(-21, -188, -7, -200, -3, -228),
      leg(13, -106, 21, -82, 19, -62),
      leg(-13, -106, -17, -78, -19, -58),
    ),
    // recovery
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(25, -170, 37, -148, 33, -125),
      arm(-25, -170, -37, -148, -31, -120),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- block_stand (1 frame: pike shaft held across body) --
  block_stand: [
    pose(
      head(-1, -186),
      torso(-3, -131, 56, 44, 90, -0.05),
      arm(23, -171, 37, -155, 46, -142),
      arm(-27, -171, -9, -155, 7, -142),
      leg(13, -85, 17, -46, 15, 0),
      leg(-13, -85, -19, -46, -19, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched behind pike) --
  block_crouch: [
    pose(
      head(-3, -132),
      torso(-4, -88, 58, 48, 70, -0.06),
      arm(23, -118, 35, -100, 43, -85),
      arm(-27, -118, -7, -100, 9, -85),
      leg(15, -53, 27, -26, 21, 0),
      leg(-15, -53, -27, -26, -23, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-9, -182),
      torso(-6, -128, 56, 44, 90, -0.12),
      arm(19, -168, 7, -148, -5, -130),
      arm(-31, -168, -47, -145, -51, -120),
      leg(13, -85, 9, -44, 3, 0),
      leg(-13, -85, -21, -46, -25, 0),
    ),
    pose(
      head(-13, -180),
      torso(-10, -126, 56, 44, 90, -0.18),
      arm(15, -166, 1, -145, -13, -128),
      arm(-35, -166, -51, -142, -57, -118),
      leg(13, -85, 5, -42, -1, 0),
      leg(-13, -85, -25, -48, -29, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    pose(
      head(-16, -140),
      torso(-12, -95, 56, 44, 80, -0.35),
      arm(11, -130, -6, -110, -21, -95),
      arm(-37, -130, -51, -108, -57, -88),
      leg(13, -55, 19, -28, 23, 0),
      leg(-13, -55, -23, -30, -29, 0),
    ),
    pose(
      head(-51, -20),
      torso(-25, -18, 56, 44, 90, -1.5),
      arm(-6, -35, -26, -22, -46, -15),
      arm(-46, -10, -61, -5, -71, 0),
      leg(13, -10, 29, -5, 43, 0),
      leg(-13, -10, -7, -5, 2, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground) --
  get_up: [
    pose(
      head(-21, -90),
      torso(-12, -60, 56, 44, 70, -0.4),
      arm(9, -90, 19, -55, 23, -30),
      arm(-33, -90, -43, -55, -41, -28),
      leg(13, -25, 23, -12, 21, 0),
      leg(-13, -25, -21, -14, -19, 0),
    ),
    pose(
      head(1, -170),
      torso(-2, -118, 56, 44, 85, -0.08),
      arm(23, -156, 33, -135, 27, -115),
      arm(-27, -156, -39, -138, -35, -118),
      leg(13, -75, 19, -40, 17, 0),
      leg(-13, -75, -19, -40, -17, 0),
    ),
  ],

  // -- victory (2 frames: pike planted, arms folded / authoritative pose) --
  victory: [
    pose(
      head(3, -190),
      torso(0, -132, 56, 44, 90),
      arm(25, -172, 35, -192, 39, -222),
      arm(-25, -172, -37, -150, -29, -130),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    pose(
      head(3, -192),
      torso(0, -134, 56, 44, 90),
      arm(25, -174, 33, -196, 37, -228),
      arm(-25, -174, -39, -155, -33, -135),
      leg(13, -85, 19, -45, 17, 0),
      leg(-13, -85, -19, -45, -17, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed with pike dropped) --
  defeat: [
    pose(
      head(-56, -18),
      torso(-28, -16, 56, 44, 90, -1.55),
      arm(-9, -32, -29, -18, -51, -10),
      arm(-49, -8, -66, -2, -76, 2),
      leg(13, -8, 31, -3, 46, 0),
      leg(-13, -8, -4, -3, 5, 0),
    ),
  ],
};

// ---- Draw extras (military pike, practical armor details) -------------------

/**
 * Draw Kay's front extras: military pike (longer, simpler than Lancelot's spear),
 * practical armor details — leather/mail over chain.
 */
export function drawKayExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const shaftColor = pal.weapon ?? 0x998877;
  const pikeheadColor = pal.weaponAccent ?? 0x888899;
  const armorColor = pal.body ?? 0x776655;
  const armorHighlight = 0x998877;
  const armorShadow = 0x554433;
  const accentColor = pal.accent ?? 0x886644;

  // --- Armor detail overlays on torso ---
  if (p.torso) {
    const t = p.torso;

    // Shoulder guards — practical leather/mail, no fancy ornamentation
    const lsx = t.x - t.topWidth / 2 - 4;
    const rsx = t.x + t.topWidth / 2 + 4;
    const sy = t.y - t.height / 2 - 2;

    // Left shoulder guard
    g.roundRect(lsx - 8, sy - 3, 18, 13, 4);
    g.fill({ color: armorColor });
    g.roundRect(lsx - 8, sy - 3, 18, 13, 4);
    g.stroke({ color: armorHighlight, width: 1 });
    // Rivets
    g.circle(lsx - 3, sy + 3, 1.5);
    g.fill({ color: armorHighlight });
    g.circle(lsx + 7, sy + 3, 1.5);
    g.fill({ color: armorHighlight });

    // Right shoulder guard
    g.roundRect(rsx - 10, sy - 3, 18, 13, 4);
    g.fill({ color: armorColor });
    g.roundRect(rsx - 10, sy - 3, 18, 13, 4);
    g.stroke({ color: armorHighlight, width: 1 });
    // Rivets
    g.circle(rsx - 5, sy + 3, 1.5);
    g.fill({ color: armorHighlight });
    g.circle(rsx + 5, sy + 3, 1.5);
    g.fill({ color: armorHighlight });

    // Chain mail texture lines across chest
    g.moveTo(t.x - t.topWidth / 3, t.y - t.height / 2 + 8);
    g.lineTo(t.x + t.topWidth / 3, t.y - t.height / 2 + 8);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.4 });

    g.moveTo(t.x - t.topWidth / 3, t.y - t.height / 2 + 14);
    g.lineTo(t.x + t.topWidth / 3, t.y - t.height / 2 + 14);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.3 });

    g.moveTo(t.x - t.topWidth / 3, t.y - t.height / 2 + 20);
    g.lineTo(t.x + t.topWidth / 3, t.y - t.height / 2 + 20);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.3 });

    // Belt buckle — simple square
    g.roundRect(t.x - 6, t.y + t.height / 2 - 10, 12, 8, 2);
    g.fill({ color: accentColor });
    g.roundRect(t.x - 6, t.y + t.height / 2 - 10, 12, 8, 2);
    g.stroke({ color: armorShadow, width: 1 });
  }

  // --- Knee guards (simple leather pads) ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 7, ky - 5, 14, 10, 3);
    g.fill({ color: armorColor });
    g.roundRect(kx - 7, ky - 5, 14, 10, 3);
    g.stroke({ color: armorHighlight, width: 1 });
  }
  if (p.backLeg) {
    const kx = p.backLeg.kneeX;
    const ky = p.backLeg.kneeY;
    g.roundRect(kx - 6, ky - 4, 12, 8, 3);
    g.fill({ color: armorShadow });
    g.roundRect(kx - 6, ky - 4, 12, 8, 3);
    g.stroke({ color: armorColor, width: 1 });
  }

  // --- Boot straps ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    g.moveTo(fx - 6, fy - 8);
    g.lineTo(fx + 7, fy - 8);
    g.stroke({ color: 0x332211, width: 2 });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 5, fy - 7);
    g.lineTo(fx + 6, fy - 7);
    g.stroke({ color: 0x332211, width: 1.5 });
  }

  // --- Elbow guard on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    g.circle(ex, ey, 5);
    g.fill({ color: armorColor });
    g.circle(ex, ey, 5);
    g.stroke({ color: armorHighlight, width: 1 });
  }

  // --- Military Pike in front arm ---
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

    // Military pike shaft — longer than Lancelot's spear
    const shaftForward = 78;
    const shaftBack = 28;
    const tipX = hx + nx * shaftForward;
    const tipY = hy + ny * shaftForward;
    const buttX = hx - nx * shaftBack;
    const buttY = hy - ny * shaftBack;

    // Shaft outline
    g.moveTo(buttX, buttY);
    g.lineTo(tipX, tipY);
    g.stroke({ color: 0x222233, width: 7, cap: "round" });

    // Shaft fill (darker wood)
    g.moveTo(buttX, buttY);
    g.lineTo(tipX, tipY);
    g.stroke({ color: shaftColor, width: 5, cap: "round" });

    // Wood grain line
    g.moveTo(buttX + ny * 0.5, buttY - nx * 0.5);
    g.lineTo(tipX + ny * 0.5, tipY - nx * 0.5);
    g.stroke({ color: 0x887766, width: 1, cap: "round", alpha: 0.3 });

    // --- Pike head (simple, utilitarian steel point) ---
    const pikeLen = 24;
    const pikeTipX = tipX + nx * pikeLen;
    const pikeTipY = tipY + ny * pikeLen;
    const pikeW = 5;

    // Pike head outline
    g.moveTo(tipX, tipY);
    g.lineTo(tipX + ny * pikeW, tipY - nx * pikeW);
    g.lineTo(pikeTipX, pikeTipY);
    g.lineTo(tipX - ny * pikeW, tipY + nx * pikeW);
    g.closePath();
    g.fill({ color: 0x222233 });

    // Pike head fill
    const inset = 1.5;
    g.moveTo(tipX + nx * inset, tipY + ny * inset);
    g.lineTo(tipX + ny * (pikeW - inset), tipY - nx * (pikeW - inset));
    g.lineTo(pikeTipX - nx * inset, pikeTipY - ny * inset);
    g.lineTo(tipX - ny * (pikeW - inset), tipY + nx * (pikeW - inset));
    g.closePath();
    g.fill({ color: pikeheadColor });

    // Pike head center ridge
    g.moveTo(tipX + nx * 3, tipY + ny * 3);
    g.lineTo(pikeTipX - nx * 2, pikeTipY - ny * 2);
    g.stroke({ color: 0xaaaabb, width: 1.5, cap: "round", alpha: 0.6 });

    // --- Cross guard (simple steel bar below pike head) ---
    const crossX = tipX + nx * 2;
    const crossY = tipY + ny * 2;
    const crossLen = 8;
    g.moveTo(crossX + ny * crossLen, crossY - nx * crossLen);
    g.lineTo(crossX - ny * crossLen, crossY + nx * crossLen);
    g.stroke({ color: 0x222233, width: 4, cap: "round" });
    g.moveTo(crossX + ny * crossLen, crossY - nx * crossLen);
    g.lineTo(crossX - ny * crossLen, crossY + nx * crossLen);
    g.stroke({ color: pikeheadColor, width: 2.5, cap: "round" });

    // --- Butt cap (simple steel cap on shaft end) ---
    const capX = buttX - nx * 3;
    const capY = buttY - ny * 3;
    g.circle(capX, capY, 4);
    g.fill({ color: 0x222233 });
    g.circle(capX, capY, 3);
    g.fill({ color: pikeheadColor });
  }

  // --- Helm detail (simple open-face helm, practical) ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;
    // Simple nasal guard
    g.moveTo(hx + 1, hy - hr + 2);
    g.lineTo(hx + 1, hy - hr + 14);
    g.stroke({ color: armorColor, width: 3, cap: "round" });
    // Helm brim
    g.moveTo(hx - 12, hy - hr + 3);
    g.lineTo(hx + 14, hy - hr + 3);
    g.stroke({ color: armorColor, width: 2.5, cap: "round" });
  }
}
