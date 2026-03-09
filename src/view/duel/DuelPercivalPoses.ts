// ---------------------------------------------------------------------------
// Percival – Seeker of the Grail
// Skeleton pose data for the duel fighting game.
// Crusader armor (blue/silver), heater shield with cross, crusader sword,
// blue surcoat/tabard over chainmail.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const PERCIVAL_PALETTE: FighterPalette = {
  skin: 0xddbb99,
  body: 0x6688aa,       // blue steel armor
  pants: 0x445566,       // dark blue-gray armored leggings
  shoes: 0x554433,       // dark brown leather boots
  hair: 0x885533,        // brown hair
  eyes: 0x4488cc,
  outline: 0x222233,
  gloves: 0x6688aa,      // blue steel gauntlets
  belt: 0x664422,        // brown leather belt
  accent: 0x4466aa,      // blue tabard
  weapon: 0xccccdd,      // crusader sword blade
  weaponAccent: 0x88aacc, // blue steel accents
};

// ---- Poses -----------------------------------------------------------------

export const PERCIVAL_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, subtle breathing bob, crusader stance) --
  idle: [
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -144, 29, -119),        // front: sword held at ready
      arm(-25, -169, -39, -147, -34, -124),      // back: shield arm at side
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    pose(
      head(4, -183),
      torso(0, -129, 55, 43, 89),
      arm(25, -168, 37, -143, 29, -118),
      arm(-25, -168, -39, -146, -34, -123),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    pose(
      head(4, -182),
      torso(0, -128, 55, 43, 89),
      arm(25, -167, 37, -142, 29, -117),
      arm(-25, -167, -39, -145, -34, -122),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    pose(
      head(4, -183),
      torso(0, -129, 55, 43, 89),
      arm(25, -168, 37, -143, 29, -118),
      arm(-25, -168, -39, -146, -34, -123),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- walk_forward (4 frames, steady crusader stride) --
  walk_forward: [
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 39, -147, 34, -124),
      arm(-25, -169, -34, -144, -27, -119),
      leg(13, -85, 27, -48, 29, 0),
      leg(-13, -85, -7, -42, -19, 0),
    ),
    pose(
      head(6, -183),
      torso(2, -129, 55, 43, 89),
      arm(27, -168, 41, -144, 37, -121),
      arm(-23, -168, -31, -141, -24, -117),
      leg(13, -85, 19, -44, 13, 0),
      leg(-13, -85, -13, -44, -13, 0),
    ),
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 31, -124),
      arm(-25, -169, -37, -144, -31, -119),
      leg(13, -85, -3, -42, -15, 0),
      leg(-13, -85, 21, -48, 25, 0),
    ),
    pose(
      head(2, -183),
      torso(-2, -129, 55, 43, 89),
      arm(23, -168, 35, -144, 29, -121),
      arm(-27, -168, -39, -141, -35, -117),
      leg(13, -85, 13, -44, 13, 0),
      leg(-13, -85, -13, -44, -13, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious backward step) --
  walk_back: [
    pose(
      head(2, -184),
      torso(-2, -130, 55, 43, 89),
      arm(23, -169, 34, -149, 27, -129),
      arm(-27, -169, -41, -147, -37, -124),
      leg(13, -85, 7, -48, -5, 0),
      leg(-13, -85, -23, -42, -27, 0),
    ),
    pose(
      head(0, -183),
      torso(-4, -129, 55, 43, 89),
      arm(21, -168, 32, -147, 25, -127),
      arm(-29, -168, -43, -145, -39, -122),
      leg(13, -85, 13, -44, 13, 0),
      leg(-13, -85, -13, -44, -13, 0),
    ),
    pose(
      head(2, -184),
      torso(-2, -130, 55, 43, 89),
      arm(23, -169, 34, -149, 27, -129),
      arm(-27, -169, -41, -147, -37, -124),
      leg(13, -85, 23, -42, 27, 0),
      leg(-13, -85, -7, -48, 5, 0),
    ),
    pose(
      head(0, -183),
      torso(-4, -129, 55, 43, 89),
      arm(21, -168, 32, -147, 25, -127),
      arm(-29, -168, -43, -145, -39, -122),
      leg(13, -85, 13, -44, 13, 0),
      leg(-13, -85, -13, -44, -13, 0),
    ),
  ],

  // -- crouch (1 frame, low guard behind shield) --
  crouch: [
    pose(
      head(2, -129),
      torso(0, -85, 57, 47, 69),
      arm(25, -114, 34, -89, 29, -69),
      arm(-25, -114, -34, -94, -29, -74),
      leg(15, -50, 27, -25, 21, 0),
      leg(-15, -50, -27, -25, -21, 0),
    ),
  ],

  // -- jump (2 frames: leap up, peak with sword raised) --
  jump: [
    pose(
      head(4, -189),
      torso(0, -137, 55, 43, 87),
      arm(25, -175, 41, -164, 49, -184),         // sword arm raised
      arm(-25, -175, -37, -154, -29, -139),
      leg(13, -93, 21, -67, 17, -47),
      leg(-13, -93, -21, -67, -17, -47),
    ),
    pose(
      head(4, -194),
      torso(0, -141, 55, 43, 87),
      arm(25, -179, 44, -174, 54, -197),          // sword thrust upward at peak
      arm(-25, -179, -39, -157, -31, -141),
      leg(13, -97, 23, -71, 27, -54),
      leg(-13, -97, -19, -64, -24, -49),
    ),
  ],

  // -- light_high: quick crusader jab (3 frames) --
  light_high: [
    // startup: pull sword back
    pose(
      head(2, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 14, -147, -1, -134),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    // extended jab: sword arm thrust forward
    pose(
      head(7, -183),
      torso(3, -129, 55, 43, 89, 0.05),
      arm(27, -168, 54, -154, 84, -149),
      arm(-23, -168, -35, -145, -29, -121),
      leg(13, -85, 19, -44, 17, 0),
      leg(-13, -85, -17, -46, -17, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- med_high: horizontal cross slash (3 frames) --
  med_high: [
    // startup: sword drawn back high
    pose(
      head(-1, -185),
      torso(-2, -130, 55, 43, 89, -0.08),
      arm(25, -169, 9, -169, -11, -174),
      arm(-25, -169, -39, -147, -34, -124),
      leg(13, -85, 19, -45, 17, 0),
      leg(-13, -85, -17, -45, -19, 0),
    ),
    // horizontal slash: wide arc across
    pose(
      head(9, -182),
      torso(5, -128, 55, 43, 89, 0.1),
      arm(27, -167, 57, -147, 87, -129),
      arm(-23, -167, -35, -144, -27, -119),
      leg(13, -85, 21, -44, 19, 0),
      leg(-13, -85, -17, -46, -19, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 39, -144, 34, -119),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- heavy_high: overhead crusader strike (4 frames) --
  heavy_high: [
    // windup: sword raised high overhead
    pose(
      head(-1, -185),
      torso(-3, -131, 55, 43, 89, -0.06),
      arm(25, -169, 21, -184, 17, -209),
      arm(-25, -169, -39, -149, -35, -129),
      leg(13, -85, 19, -45, 17, 0),
      leg(-13, -85, -19, -45, -21, 0),
    ),
    // downward strike: sword coming down
    pose(
      head(7, -182),
      torso(4, -128, 55, 43, 89, 0.12),
      arm(27, -167, 51, -149, 71, -109),
      arm(-23, -167, -33, -143, -25, -117),
      leg(13, -85, 21, -44, 21, 0),
      leg(-13, -85, -15, -46, -17, 0),
    ),
    // impact: sword low, body committed
    pose(
      head(11, -179),
      torso(6, -125, 55, 43, 89, 0.15),
      arm(29, -164, 59, -129, 79, -87),
      arm(-21, -164, -31, -139, -23, -114),
      leg(13, -85, 23, -42, 23, 0),
      leg(-13, -85, -15, -48, -19, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- light_low: pilgrim kick (3 frames) --
  light_low: [
    // startup: lift leg
    pose(
      head(2, -184),
      torso(-2, -132, 55, 43, 89),
      arm(23, -171, 35, -149, 27, -129),
      arm(-27, -171, -39, -147, -35, -124),
      leg(13, -85, 27, -55, 29, -30),
      leg(-13, -85, -19, -45, -21, 0),
    ),
    // kick extended
    pose(
      head(-1, -183),
      torso(-4, -131, 55, 43, 89, -0.05),
      arm(21, -170, 33, -147, 25, -127),
      arm(-29, -170, -41, -145, -37, -122),
      leg(13, -85, 41, -52, 69, -30),
      leg(-13, -85, -21, -44, -23, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- med_low: low thrust (3 frames) --
  med_low: [
    // startup: crouch slightly, pull sword back
    pose(
      head(2, -174),
      torso(0, -122, 55, 43, 84, 0.08),
      arm(25, -159, 29, -129, 14, -104),
      arm(-25, -159, -37, -137, -33, -114),
      leg(13, -80, 21, -42, 19, 0),
      leg(-13, -80, -19, -42, -19, 0),
    ),
    // low thrust: sword thrust low and forward
    pose(
      head(7, -171),
      torso(4, -118, 55, 43, 84, 0.15),
      arm(27, -155, 54, -109, 84, -79),
      arm(-23, -155, -33, -134, -27, -111),
      leg(13, -80, 23, -40, 21, 0),
      leg(-13, -80, -19, -44, -21, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- heavy_low: grail sweep launcher (4 frames) --
  heavy_low: [
    // windup: crouch, wind sword to back
    pose(
      head(-1, -154),
      torso(-3, -105, 57, 45, 74, -0.1),
      arm(25, -137, 9, -124, -16, -114),
      arm(-25, -137, -39, -119, -37, -99),
      leg(15, -68, 27, -35, 23, 0),
      leg(-15, -68, -27, -35, -25, 0),
    ),
    // sweep: sword sweeps low across the ground
    pose(
      head(9, -149),
      torso(5, -100, 57, 45, 74, 0.18),
      arm(29, -132, 57, -84, 84, -19),
      arm(-21, -132, -33, -114, -25, -94),
      leg(15, -68, 31, -30, 29, 0),
      leg(-15, -68, -25, -38, -27, 0),
    ),
    // hold: sword extended at ground level
    pose(
      head(11, -147),
      torso(6, -98, 57, 45, 74, 0.2),
      arm(31, -130, 61, -79, 89, -14),
      arm(-19, -130, -31, -111, -23, -91),
      leg(15, -68, 33, -28, 31, 0),
      leg(-15, -68, -25, -38, -27, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- quest_thrust: lunging stab (3 frames) --
  quest_thrust: [
    // startup: pull sword way back, lean back
    pose(
      head(-3, -185),
      torso(-5, -131, 55, 43, 89, -0.12),
      arm(23, -169, 4, -154, -16, -144),
      arm(-27, -169, -41, -149, -37, -129),
      leg(13, -85, 17, -45, 13, 0),
      leg(-13, -85, -21, -45, -23, 0),
    ),
    // lunge: body drives forward, sword fully extended
    pose(
      head(17, -179),
      torso(12, -126, 55, 43, 89, 0.15),
      arm(35, -165, 64, -147, 94, -139),
      arm(-13, -165, -27, -141, -19, -117),
      leg(13, -85, 31, -48, 37, 0),
      leg(-13, -85, -7, -42, -9, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- pilgrim_cleave: big overhead slam (4 frames) --
  pilgrim_cleave: [
    // big windup: sword held high behind head
    pose(
      head(-3, -186),
      torso(-5, -132, 55, 43, 89, -0.1),
      arm(23, -171, 14, -189, 4, -214),
      arm(-27, -171, -41, -154, -39, -134),
      leg(13, -85, 19, -46, 17, 0),
      leg(-13, -85, -19, -46, -21, 0),
    ),
    // overhead slam: sword crashing down
    pose(
      head(9, -179),
      torso(5, -125, 55, 43, 89, 0.18),
      arm(29, -164, 54, -139, 69, -94),
      arm(-21, -164, -31, -139, -23, -114),
      leg(13, -85, 23, -42, 23, 0),
      leg(-13, -85, -15, -48, -19, 0),
    ),
    // impact hold: sword slammed down
    pose(
      head(13, -174),
      torso(8, -120, 55, 43, 89, 0.22),
      arm(31, -159, 61, -114, 77, -59),
      arm(-19, -159, -29, -135, -21, -109),
      leg(13, -85, 25, -40, 27, 0),
      leg(-13, -85, -15, -50, -21, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- seeker_sweep: ground-level sweep (3 frames) --
  seeker_sweep: [
    // startup: drop low
    pose(
      head(1, -147),
      torso(0, -100, 57, 45, 71, 0.05),
      arm(25, -131, 19, -109, 4, -99),
      arm(-25, -131, -37, -114, -33, -94),
      leg(15, -64, 29, -32, 25, 0),
      leg(-15, -64, -27, -34, -27, 0),
    ),
    // ground sweep: sword sweeps at ankle height
    pose(
      head(11, -144),
      torso(6, -96, 57, 45, 71, 0.22),
      arm(31, -127, 59, -69, 89, -9),
      arm(-19, -127, -31, -109, -23, -89),
      leg(15, -64, 34, -28, 33, 0),
      leg(-15, -64, -25, -36, -29, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- grail_rise: anti-air rising slash (4 frames) --
  grail_rise: [
    // crouch startup: coil low
    pose(
      head(2, -147),
      torso(0, -100, 57, 45, 71),
      arm(25, -131, 29, -107, 19, -89),
      arm(-25, -131, -37, -114, -33, -94),
      leg(15, -64, 29, -32, 25, 0),
      leg(-15, -64, -27, -34, -27, 0),
    ),
    // upward slash: rising, sword sweeping up
    pose(
      head(7, -174),
      torso(4, -122, 55, 43, 85, 0.08),
      arm(27, -161, 49, -154, 64, -184),
      arm(-23, -161, -35, -139, -29, -117),
      leg(13, -80, 21, -44, 19, 0),
      leg(-13, -80, -17, -44, -17, 0),
    ),
    // peak: airborne, sword high
    pose(
      head(5, -199),
      torso(2, -147, 55, 43, 85, 0.05),
      arm(27, -185, 41, -194, 47, -219),
      arm(-23, -185, -37, -167, -31, -149),
      leg(13, -103, 21, -79, 19, -59),
      leg(-13, -103, -17, -74, -19, -54),
    ),
    // recovery: landing
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- grab: gauntlet slam (3 frames) --
  grab: [
    // reach: arms extend forward to grab
    pose(
      head(7, -183),
      torso(4, -129, 55, 43, 89, 0.06),
      arm(27, -168, 49, -154, 67, -144, true),
      arm(-23, -168, -9, -149, 14, -139, true),
      leg(13, -85, 21, -44, 21, 0),
      leg(-13, -85, -15, -46, -17, 0),
    ),
    // slam: gauntlet slams down on opponent
    pose(
      head(11, -181),
      torso(8, -127, 55, 43, 89, 0.12),
      arm(29, -166, 51, -149, 59, -134),
      arm(-21, -166, 6, -144, 34, -134),
      leg(13, -85, 23, -42, 23, 0),
      leg(-13, -85, -15, -48, -19, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- zealous_charge (3 frames: wind up, charge, recovery) --
  zealous_charge: [
    // crouch behind shield
    pose(
      head(-1, -179),
      torso(-3, -128, 55, 43, 89, -0.08),
      arm(23, -167, 29, -149, 21, -134),
      arm(-27, -167, -9, -151, 11, -141),
      leg(13, -85, 19, -46, 17, 0),
      leg(-13, -85, -19, -46, -21, 0),
    ),
    // lunging forward with shield and sword
    pose(
      head(15, -177),
      torso(12, -124, 55, 43, 89, 0.15),
      arm(33, -163, 49, -147, 54, -131),
      arm(-13, -163, 13, -147, 39, -137),
      leg(13, -85, 31, -48, 37, 0),
      leg(-13, -85, -7, -42, -9, 0),
    ),
    // recovery
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- quest_strike (4 frames: crouch, massive rising slash, peak, recovery) --
  quest_strike: [
    // deep crouch gathering power
    pose(
      head(-1, -147),
      torso(-2, -100, 57, 45, 71, -0.06),
      arm(25, -131, 17, -107, 4, -89),
      arm(-25, -131, -37, -114, -33, -94),
      leg(15, -64, 27, -32, 23, 0),
      leg(-15, -64, -27, -32, -25, 0),
    ),
    // explosive upward slash
    pose(
      head(9, -184),
      torso(6, -130, 55, 43, 89, 0.12),
      arm(29, -169, 49, -174, 59, -209),
      arm(-21, -169, -31, -147, -25, -124),
      leg(13, -85, 21, -44, 21, 0),
      leg(-13, -85, -15, -46, -17, 0),
    ),
    // peak — sword high, airborne
    pose(
      head(7, -204),
      torso(4, -151, 55, 43, 87, 0.08),
      arm(27, -189, 41, -204, 47, -239),
      arm(-23, -189, -37, -171, -31, -154),
      leg(13, -107, 21, -81, 19, -61),
      leg(-13, -107, -17, -77, -19, -57),
    ),
    // recovery landing
    pose(
      head(4, -184),
      torso(0, -130, 55, 43, 89),
      arm(25, -169, 37, -147, 29, -124),
      arm(-25, -169, -37, -147, -31, -124),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
  ],

  // -- block_stand (1 frame: shield raised in front) --
  block_stand: [
    pose(
      head(-1, -185),
      torso(-3, -131, 55, 43, 89, -0.05),
      arm(23, -170, 29, -154, 21, -139),          // sword arm pulled back
      arm(-27, -170, -9, -154, 9, -144),           // shield arm in front of body
      leg(13, -85, 17, -46, 15, 0),
      leg(-13, -85, -19, -46, -19, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched behind shield) --
  block_crouch: [
    pose(
      head(-3, -131),
      torso(-4, -88, 57, 47, 69, -0.06),
      arm(23, -117, 27, -97, 19, -79),
      arm(-27, -117, -7, -99, 11, -91),            // shield arm covering front
      leg(15, -53, 27, -26, 21, 0),
      leg(-15, -53, -27, -26, -23, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-9, -181),
      torso(-6, -128, 55, 43, 89, -0.12),
      arm(19, -167, 7, -147, -6, -129),
      arm(-31, -167, -47, -144, -51, -119),
      leg(13, -85, 9, -44, 3, 0),
      leg(-13, -85, -21, -46, -25, 0),
    ),
    pose(
      head(-13, -179),
      torso(-10, -126, 55, 43, 89, -0.18),
      arm(15, -165, 1, -144, -13, -127),
      arm(-35, -165, -51, -141, -57, -117),
      leg(13, -85, 5, -42, -1, 0),
      leg(-13, -85, -25, -48, -29, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    // falling
    pose(
      head(-16, -139),
      torso(-12, -95, 55, 43, 79, -0.35),
      arm(11, -129, -6, -109, -21, -94),
      arm(-37, -129, -51, -107, -57, -87),
      leg(13, -55, 19, -28, 23, 0),
      leg(-13, -55, -23, -30, -29, 0),
    ),
    // lying on ground
    pose(
      head(-51, -19),
      torso(-25, -18, 55, 43, 89, -1.5),
      arm(-6, -34, -26, -21, -46, -14),
      arm(-46, -9, -61, -4, -71, 1),
      leg(13, -9, 31, -4, 46, 0),
      leg(-13, -9, -7, -4, 6, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground) --
  get_up: [
    // pushing up
    pose(
      head(-21, -89),
      torso(-12, -60, 55, 43, 69, -0.4),
      arm(9, -89, 19, -54, 24, -29),
      arm(-33, -89, -44, -54, -41, -27),
      leg(13, -25, 23, -12, 21, 0),
      leg(-13, -25, -21, -14, -19, 0),
    ),
    // nearly standing
    pose(
      head(1, -169),
      torso(-2, -118, 55, 43, 84, -0.08),
      arm(23, -155, 33, -134, 27, -114),
      arm(-27, -155, -39, -137, -35, -117),
      leg(13, -75, 19, -40, 17, 0),
      leg(-13, -75, -19, -40, -17, 0),
    ),
  ],

  // -- victory (2 frames: sword raised triumphantly, grail pose) --
  victory: [
    // raise sword
    pose(
      head(4, -189),
      torso(0, -132, 55, 43, 89),
      arm(25, -171, 34, -189, 39, -217),           // sword held high
      arm(-25, -171, -37, -149, -29, -129),
      leg(13, -85, 17, -45, 15, 0),
      leg(-13, -85, -17, -45, -15, 0),
    ),
    // triumphant hold
    pose(
      head(4, -191),
      torso(0, -134, 55, 43, 89),
      arm(25, -173, 33, -194, 37, -223),           // sword high in the air
      arm(-25, -173, -39, -154, -34, -134),
      leg(13, -85, 19, -45, 17, 0),
      leg(-13, -85, -19, -45, -17, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed on the ground) --
  defeat: [
    pose(
      head(-56, -17),
      torso(-28, -16, 55, 43, 89, -1.55),
      arm(-9, -31, -29, -17, -51, -9),
      arm(-49, -7, -66, -1, -76, 3),
      leg(13, -7, 31, -2, 47, 0),
      leg(-13, -7, -4, -2, 9, 0),
    ),
  ],
};

// ---- Draw extras (crusader sword, heater shield, armor details) -------------

/**
 * Draw Percival's blue surcoat/tabard behind the body (called before skeleton).
 */
export function drawPercivalBackExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const tabardColor = pal.accent ?? 0x4466aa;

  if (p.torso && p.backArm) {
    const tabardTop = p.torso.y - p.torso.height / 2;
    const tabardX = p.torso.x - p.torso.topWidth / 2 - 2;
    const tabardBottom = p.torso.y + p.torso.height / 2 + 18;
    const tabardMid = (tabardTop + tabardBottom) / 2;

    // Surcoat/tabard flowing behind (draped fabric)
    g.moveTo(tabardX, tabardTop);
    g.quadraticCurveTo(tabardX - 14, tabardMid, tabardX - 8, tabardBottom);
    g.lineTo(tabardX + 8, tabardBottom - 1);
    g.quadraticCurveTo(tabardX - 4, tabardMid, tabardX + 6, tabardTop + 4);
    g.closePath();
    g.fill({ color: tabardColor, alpha: 0.7 });

    // Right side panel of tabard
    const tabardRX = p.torso.x + p.torso.topWidth / 2 + 2;
    g.moveTo(tabardRX, tabardTop);
    g.quadraticCurveTo(tabardRX + 14, tabardMid, tabardRX + 8, tabardBottom);
    g.lineTo(tabardRX - 8, tabardBottom - 1);
    g.quadraticCurveTo(tabardRX + 4, tabardMid, tabardRX - 6, tabardTop + 4);
    g.closePath();
    g.fill({ color: tabardColor, alpha: 0.6 });

    // Tabard cross emblem on back (faint)
    const cx = p.torso.x;
    const cy = p.torso.y;
    g.moveTo(cx, cy - 12);
    g.lineTo(cx, cy + 10);
    g.stroke({ color: 0xaaccee, width: 3, alpha: 0.25 });
    g.moveTo(cx - 8, cy - 2);
    g.lineTo(cx + 8, cy - 2);
    g.stroke({ color: 0xaaccee, width: 3, alpha: 0.25 });
  }
}

export function drawPercivalExtras(g: Graphics, p: FighterPose, pal: FighterPalette, _isFlashing: boolean, _flashColor: number): void {
  const weaponColor = pal.weapon ?? 0xccccdd;
  const accentColor = pal.weaponAccent ?? 0x88aacc;
  const tabardColor = pal.accent ?? 0x4466aa;
  const armorColor = pal.body ?? 0x6688aa;
  const armorHighlight = 0x8eaacc;
  const armorShadow = 0x4e6688;

  // --- Armor detail overlays on torso ---
  if (p.torso) {
    const t = p.torso;
    // Shoulder pauldrons (rounded crusader style)
    const lsx = t.x - t.topWidth / 2 - 4;
    const rsx = t.x + t.topWidth / 2 + 4;
    const sy = t.y - t.height / 2 - 2;

    // Left pauldron
    g.roundRect(lsx - 7, sy - 2, 17, 13, 5);
    g.fill({ color: armorColor });
    g.roundRect(lsx - 7, sy - 2, 17, 13, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(lsx - 3, sy + 4);
    g.lineTo(lsx + 8, sy + 4);
    g.stroke({ color: armorShadow, width: 1 });

    // Right pauldron
    g.roundRect(rsx - 9, sy - 2, 17, 13, 5);
    g.fill({ color: armorColor });
    g.roundRect(rsx - 9, sy - 2, 17, 13, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(rsx - 5, sy + 4);
    g.lineTo(rsx + 6, sy + 4);
    g.stroke({ color: armorShadow, width: 1 });

    // Chest plate cross detail (crusader emblem)
    const cx = t.x;
    const cy = t.y - 2;
    g.moveTo(cx, cy - 14);
    g.lineTo(cx, cy + 12);
    g.stroke({ color: accentColor, width: 3, alpha: 0.5 });
    g.moveTo(cx - 9, cy - 2);
    g.lineTo(cx + 9, cy - 2);
    g.stroke({ color: accentColor, width: 3, alpha: 0.5 });

    // Horizontal armor segment lines
    g.moveTo(t.x - t.topWidth / 3, t.y - 5);
    g.lineTo(t.x + t.topWidth / 3, t.y - 5);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.5 });

    // Tabard front panel (blue fabric over armor)
    const tabardTop = t.y + 2;
    const tabardBottom = t.y + t.height / 2 + 12;
    g.moveTo(cx - 10, tabardTop);
    g.lineTo(cx + 10, tabardTop);
    g.lineTo(cx + 8, tabardBottom);
    g.lineTo(cx - 8, tabardBottom);
    g.closePath();
    g.fill({ color: tabardColor, alpha: 0.6 });

    // Tabard front cross
    const tcy = (tabardTop + tabardBottom) / 2;
    g.moveTo(cx, tabardTop + 2);
    g.lineTo(cx, tabardBottom - 2);
    g.stroke({ color: 0xaaccee, width: 2, alpha: 0.4 });
    g.moveTo(cx - 5, tcy);
    g.lineTo(cx + 5, tcy);
    g.stroke({ color: 0xaaccee, width: 2, alpha: 0.4 });
  }

  // --- Knee guards on legs ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 7, ky - 5, 14, 11, 4);
    g.fill({ color: armorColor });
    g.roundRect(kx - 7, ky - 5, 14, 11, 4);
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

  // --- Boot detail (straps) ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    g.moveTo(fx - 5, fy - 7);
    g.lineTo(fx + 7, fy - 7);
    g.stroke({ color: 0x553311, width: 2 });
    g.roundRect(fx - 1, fy - 9, 4, 4, 1);
    g.fill({ color: accentColor });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 4, fy - 6);
    g.lineTo(fx + 6, fy - 6);
    g.stroke({ color: 0x553311, width: 1.5 });
    g.roundRect(fx, fy - 8, 3, 3, 1);
    g.fill({ color: accentColor });
  }

  // --- Gauntlet rivets on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    // Elbow guard
    g.circle(ex, ey, 5);
    g.fill({ color: armorColor });
    g.circle(ex, ey, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    // Rivet dots on forearm
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx, my, 1.5);
    g.fill({ color: armorHighlight });
  }

  // --- Heater shield on back arm (smaller than Arthur's kite shield) ---
  if (p.backArm) {
    const sx = p.backArm.handX;
    const sy = p.backArm.handY;
    const shieldW = 42;
    const shieldH = 52;
    const shieldX = sx - shieldW / 2 + 2;
    const shieldY = sy - shieldH * 0.4;

    // Heater shield shape: flat top, pointed bottom
    // Outline
    g.moveTo(shieldX, shieldY);
    g.lineTo(shieldX + shieldW, shieldY);
    g.lineTo(shieldX + shieldW, shieldY + shieldH * 0.5);
    g.lineTo(shieldX + shieldW / 2, shieldY + shieldH);
    g.lineTo(shieldX, shieldY + shieldH * 0.5);
    g.closePath();
    g.fill({ color: 0x222233 });

    // Shield face (blue)
    const inset = 3;
    g.moveTo(shieldX + inset, shieldY + inset);
    g.lineTo(shieldX + shieldW - inset, shieldY + inset);
    g.lineTo(shieldX + shieldW - inset, shieldY + shieldH * 0.48);
    g.lineTo(shieldX + shieldW / 2, shieldY + shieldH - inset * 2);
    g.lineTo(shieldX + inset, shieldY + shieldH * 0.48);
    g.closePath();
    g.fill({ color: tabardColor });

    // Steel rim highlight (top edge)
    g.moveTo(shieldX + 1, shieldY + 1);
    g.lineTo(shieldX + shieldW - 1, shieldY + 1);
    g.stroke({ color: 0x99aabb, width: 2 });

    // Bottom rim
    g.moveTo(shieldX + 1, shieldY + shieldH * 0.5);
    g.lineTo(shieldX + shieldW / 2, shieldY + shieldH);
    g.lineTo(shieldX + shieldW - 1, shieldY + shieldH * 0.5);
    g.stroke({ color: 0x99aabb, width: 1.5 });

    // Cross emblem centered on shield (crusader cross)
    const cx = shieldX + shieldW / 2;
    const cy = shieldY + shieldH * 0.35;
    // Vertical bar
    g.moveTo(cx, cy - 14);
    g.lineTo(cx, cy + 14);
    g.stroke({ color: 0xddddee, width: 5 });
    // Horizontal bar
    g.moveTo(cx - 10, cy - 2);
    g.lineTo(cx + 10, cy - 2);
    g.stroke({ color: 0xddddee, width: 5 });

    // Cross outline (dark border on cross for definition)
    g.moveTo(cx, cy - 15);
    g.lineTo(cx, cy + 15);
    g.stroke({ color: 0x222244, width: 7 });
    g.moveTo(cx - 11, cy - 2);
    g.lineTo(cx + 11, cy - 2);
    g.stroke({ color: 0x222244, width: 7 });
    // Re-draw cross fill on top of outline
    g.moveTo(cx, cy - 14);
    g.lineTo(cx, cy + 14);
    g.stroke({ color: 0xddddee, width: 4 });
    g.moveTo(cx - 10, cy - 2);
    g.lineTo(cx + 10, cy - 2);
    g.stroke({ color: 0xddddee, width: 4 });

    // Shield boss (central rivet)
    g.circle(cx, cy - 2, 3);
    g.fill({ color: 0x222233 });
    g.circle(cx, cy - 2, 2);
    g.fill({ color: armorHighlight });

    // Corner rivets
    g.circle(shieldX + 7, shieldY + 7, 1.5);
    g.fill({ color: armorHighlight });
    g.circle(shieldX + shieldW - 7, shieldY + 7, 1.5);
    g.fill({ color: armorHighlight });
    g.circle(shieldX + shieldW / 2, shieldY + shieldH - 8, 1.5);
    g.fill({ color: armorHighlight });
  }

  // --- Crusader sword in front arm ---
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
    g.stroke({ color: armorShadow, width: 1.5, cap: "round", alpha: 0.4 });

    // Blade highlight
    g.moveTo(hx + ny * 1, hy - nx * 1);
    g.lineTo(tipX + ny * 1, tipY - nx * 1);
    g.stroke({ color: 0xeeeeff, width: 1.5, cap: "round" });

    // Crossguard (perpendicular to blade, wider crusader style)
    const guardLen = 14;
    const gx1 = hx + ny * guardLen;
    const gy1 = hy - nx * guardLen;
    const gx2 = hx - ny * guardLen;
    const gy2 = hy + nx * guardLen;

    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: 0x222233, width: 7, cap: "round" });
    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: accentColor, width: 5, cap: "round" });

    // Crossguard end caps (square crusader style)
    g.roundRect(gx1 - 3, gy1 - 3, 6, 6, 1);
    g.fill({ color: accentColor });
    g.roundRect(gx2 - 3, gy2 - 3, 6, 6, 1);
    g.fill({ color: accentColor });

    // Pommel (disc pommel, crusader style)
    const pommelX = hx - nx * 8;
    const pommelY = hy - ny * 8;
    g.circle(pommelX, pommelY, 5);
    g.fill({ color: 0x222233 });
    g.circle(pommelX, pommelY, 4);
    g.fill({ color: accentColor });
    // Small cross engraving on pommel
    g.moveTo(pommelX - 2, pommelY);
    g.lineTo(pommelX + 2, pommelY);
    g.stroke({ color: 0xddddee, width: 1 });
    g.moveTo(pommelX, pommelY - 2);
    g.lineTo(pommelX, pommelY + 2);
    g.stroke({ color: 0xddddee, width: 1 });
  }

  // --- Helm detail (flat-top great helm with cross visor slit) ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;

    // Flat top plate on helm
    g.moveTo(hx - hr * 0.6, hy - hr + 3);
    g.lineTo(hx + hr * 0.6, hy - hr + 3);
    g.stroke({ color: armorColor, width: 3 });
    g.moveTo(hx - hr * 0.6, hy - hr + 3);
    g.lineTo(hx + hr * 0.6, hy - hr + 3);
    g.stroke({ color: armorHighlight, width: 1.5 });

    // Visor cross slit
    g.moveTo(hx - 6, hy - 2);
    g.lineTo(hx + 6, hy - 2);
    g.stroke({ color: 0x111122, width: 2 });
    g.moveTo(hx, hy - 6);
    g.lineTo(hx, hy + 2);
    g.stroke({ color: 0x111122, width: 1.5 });

    // Small blue plume/crest (shorter than Arthur's)
    g.moveTo(hx - 3, hy - hr + 1);
    g.quadraticCurveTo(hx, hy - hr - 10, hx + 8, hy - hr + 1);
    g.fill({ color: tabardColor, alpha: 0.8 });
  }
}
