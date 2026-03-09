// ---------------------------------------------------------------------------
// Galahad — The Pure Knight
// Skeleton pose data for the duel fighting game.
// White/silver holy armor, round shield with grail emblem, radiant white sword.
// Very upright, shield-forward defensive stance.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const GALAHAD_PALETTE: FighterPalette = {
  skin: 0xeeddcc,
  body: 0xccccdd,        // white/silver armor
  pants: 0xaaaabc,        // lighter armored leggings
  shoes: 0x887766,        // brown leather boots
  hair: 0xddcc88,         // light blonde
  eyes: 0x5588cc,         // blue
  outline: 0x222233,
  gloves: 0xccccdd,       // silver gauntlets
  belt: 0x887744,         // tan leather belt
  accent: 0xffffff,       // white tabard
  weapon: 0xeeeeff,       // bright white blade
  weaponAccent: 0x88ccff, // blue holy glow
};

// ---- Poses -----------------------------------------------------------------

export const GALAHAD_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, very upright shield-forward defensive stance) --
  idle: [
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),         // front: sword held at guard
      arm(-26, -172, -36, -155, -28, -140),       // back: shield arm raised in front
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
    pose(
      head(3, -187),
      torso(0, -131, 56, 44, 92),
      arm(26, -171, 40, -149, 35, -127),
      arm(-26, -171, -36, -154, -28, -139),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
    pose(
      head(3, -186),
      torso(0, -130, 56, 44, 92),
      arm(26, -170, 40, -148, 35, -126),
      arm(-26, -170, -36, -153, -28, -138),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
    pose(
      head(3, -187),
      torso(0, -131, 56, 44, 92),
      arm(26, -171, 40, -149, 35, -127),
      arm(-26, -171, -36, -154, -28, -139),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- walk_forward (4 frames, measured upright stride) --
  walk_forward: [
    pose(
      head(4, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 42, -152, 38, -130),
      arm(-26, -172, -34, -154, -26, -138),
      leg(14, -86, 26, -48, 28, 0),
      leg(-14, -86, -6, -42, -18, 0),
    ),
    pose(
      head(6, -187),
      torso(2, -131, 56, 44, 92),
      arm(28, -171, 44, -150, 40, -128),
      arm(-24, -171, -32, -152, -24, -136),
      leg(14, -86, 18, -44, 14, 0),
      leg(-14, -86, -14, -44, -14, 0),
    ),
    pose(
      head(4, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -152, 36, -130),
      arm(-26, -172, -36, -154, -28, -138),
      leg(14, -86, -4, -42, -14, 0),
      leg(-14, -86, 20, -48, 24, 0),
    ),
    pose(
      head(2, -187),
      torso(-2, -131, 56, 44, 92),
      arm(24, -171, 38, -150, 34, -128),
      arm(-28, -171, -38, -152, -30, -136),
      leg(14, -86, 14, -44, 14, 0),
      leg(-14, -86, -14, -44, -14, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious backward step, shield forward) --
  walk_back: [
    pose(
      head(2, -188),
      torso(-2, -132, 56, 44, 92),
      arm(24, -172, 36, -154, 30, -135),
      arm(-28, -172, -32, -156, -24, -142),
      leg(14, -86, 6, -48, -8, 0),
      leg(-14, -86, -22, -42, -26, 0),
    ),
    pose(
      head(0, -187),
      torso(-4, -131, 56, 44, 92),
      arm(22, -171, 34, -152, 28, -133),
      arm(-30, -171, -34, -154, -26, -140),
      leg(14, -86, 14, -44, 14, 0),
      leg(-14, -86, -14, -44, -14, 0),
    ),
    pose(
      head(2, -188),
      torso(-2, -132, 56, 44, 92),
      arm(24, -172, 36, -154, 30, -135),
      arm(-28, -172, -32, -156, -24, -142),
      leg(14, -86, 22, -42, 26, 0),
      leg(-14, -86, -6, -48, 8, 0),
    ),
    pose(
      head(0, -187),
      torso(-4, -131, 56, 44, 92),
      arm(22, -171, 34, -152, 28, -133),
      arm(-30, -171, -34, -154, -26, -140),
      leg(14, -86, 14, -44, 14, 0),
      leg(-14, -86, -14, -44, -14, 0),
    ),
  ],

  // -- crouch (1 frame, low guard behind shield) --
  crouch: [
    pose(
      head(2, -132),
      torso(0, -88, 58, 48, 72),
      arm(26, -118, 34, -94, 28, -74),
      arm(-26, -118, -30, -100, -22, -88),
      leg(16, -52, 28, -26, 22, 0),
      leg(-16, -52, -28, -26, -22, 0),
    ),
  ],

  // -- jump (2 frames: leap up, peak with sword raised) --
  jump: [
    pose(
      head(4, -192),
      torso(0, -140, 56, 44, 90),
      arm(26, -178, 44, -168, 52, -190),
      arm(-26, -178, -36, -158, -28, -144),
      leg(14, -96, 22, -70, 18, -50),
      leg(-14, -96, -22, -70, -18, -50),
    ),
    pose(
      head(4, -198),
      torso(0, -146, 56, 44, 90),
      arm(26, -184, 46, -180, 56, -202),
      arm(-26, -184, -38, -164, -30, -148),
      leg(14, -102, 24, -76, 28, -58),
      leg(-14, -102, -20, -68, -24, -52),
    ),
  ],

  // -- light_high: quick holy jab (3 frames) --
  light_high: [
    // startup: pull sword back
    pose(
      head(2, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 16, -150, 2, -138),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
    // extended jab: sword arm thrust forward
    pose(
      head(6, -186),
      torso(3, -130, 56, 44, 92, 0.05),
      arm(28, -170, 56, -158, 86, -152),
      arm(-24, -170, -34, -153, -26, -138),
      leg(14, -86, 18, -44, 16, 0),
      leg(-14, -86, -16, -46, -16, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- med_high: horizontal blessed slash (3 frames) --
  med_high: [
    // startup: sword drawn back high
    pose(
      head(-1, -189),
      torso(-2, -132, 56, 44, 92, -0.08),
      arm(26, -172, 12, -172, -8, -178),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 18, -45, 16, 0),
      leg(-14, -86, -16, -45, -18, 0),
    ),
    // horizontal slash: wide arc
    pose(
      head(8, -185),
      torso(4, -130, 56, 44, 92, 0.1),
      arm(28, -170, 58, -150, 90, -132),
      arm(-24, -170, -34, -150, -26, -135),
      leg(14, -86, 20, -44, 18, 0),
      leg(-14, -86, -16, -46, -18, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- heavy_high: overhead consecrated blow (4 frames) --
  heavy_high: [
    // windup: sword raised high overhead
    pose(
      head(-1, -189),
      torso(-3, -133, 56, 44, 92, -0.06),
      arm(26, -172, 22, -188, 18, -215),
      arm(-26, -172, -36, -156, -28, -140),
      leg(14, -86, 18, -45, 16, 0),
      leg(-14, -86, -18, -45, -20, 0),
    ),
    // downward strike
    pose(
      head(7, -185),
      torso(4, -130, 56, 44, 92, 0.12),
      arm(28, -170, 52, -152, 72, -112),
      arm(-24, -170, -32, -148, -24, -130),
      leg(14, -86, 20, -44, 20, 0),
      leg(-14, -86, -14, -46, -16, 0),
    ),
    // impact: sword low, body committed
    pose(
      head(10, -182),
      torso(6, -127, 56, 44, 92, 0.15),
      arm(30, -167, 60, -132, 80, -90),
      arm(-22, -167, -30, -144, -22, -126),
      leg(14, -86, 22, -42, 22, 0),
      leg(-14, -86, -14, -48, -18, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- light_low: shin kick (3 frames) --
  light_low: [
    // startup: lift leg
    pose(
      head(2, -188),
      torso(-2, -134, 56, 44, 92),
      arm(24, -174, 38, -152, 32, -132),
      arm(-28, -174, -36, -155, -28, -140),
      leg(14, -86, 28, -56, 30, -32),
      leg(-14, -86, -18, -45, -20, 0),
    ),
    // kick extended
    pose(
      head(0, -186),
      torso(-4, -133, 56, 44, 92, -0.05),
      arm(22, -173, 36, -150, 28, -130),
      arm(-30, -173, -38, -153, -30, -138),
      leg(14, -86, 42, -54, 68, -32),
      leg(-14, -86, -20, -44, -22, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- med_low: low poke (3 frames) --
  med_low: [
    // startup: crouch slightly, pull sword back
    pose(
      head(2, -178),
      torso(0, -124, 56, 44, 86, 0.08),
      arm(26, -162, 30, -132, 16, -108),
      arm(-26, -162, -34, -142, -28, -125),
      leg(14, -82, 22, -42, 18, 0),
      leg(-14, -82, -18, -42, -18, 0),
    ),
    // low poke: sword thrust low and forward
    pose(
      head(7, -175),
      torso(4, -120, 56, 44, 86, 0.15),
      arm(28, -158, 56, -112, 86, -82),
      arm(-24, -158, -32, -138, -26, -122),
      leg(14, -82, 22, -40, 20, 0),
      leg(-14, -82, -18, -44, -20, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- heavy_low: radiant sweep / launcher (4 frames) --
  heavy_low: [
    // windup: crouch, wind sword to back
    pose(
      head(0, -158),
      torso(-3, -108, 58, 46, 76, -0.1),
      arm(26, -140, 12, -128, -14, -118),
      arm(-26, -140, -38, -124, -36, -105),
      leg(16, -70, 28, -36, 24, 0),
      leg(-16, -70, -28, -36, -26, 0),
    ),
    // sweep: sword sweeps low across the ground
    pose(
      head(10, -153),
      torso(5, -103, 58, 46, 76, 0.18),
      arm(30, -135, 58, -88, 86, -22),
      arm(-22, -135, -32, -118, -24, -98),
      leg(16, -70, 32, -32, 30, 0),
      leg(-16, -70, -24, -38, -26, 0),
    ),
    // hold: sword extended at ground level
    pose(
      head(12, -150),
      torso(6, -100, 58, 46, 76, 0.2),
      arm(32, -132, 62, -82, 92, -16),
      arm(-20, -132, -30, -115, -22, -95),
      leg(16, -70, 34, -30, 32, 0),
      leg(-16, -70, -24, -38, -26, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- holy_thrust: forward lunging stab (3 frames) --
  holy_thrust: [
    // startup: pull sword way back, lean back
    pose(
      head(-3, -189),
      torso(-5, -133, 56, 44, 92, -0.12),
      arm(24, -172, 6, -158, -14, -148),
      arm(-28, -172, -38, -156, -32, -142),
      leg(14, -86, 16, -45, 12, 0),
      leg(-14, -86, -20, -45, -22, 0),
    ),
    // lunge: body drives forward, sword fully extended
    pose(
      head(16, -183),
      torso(10, -128, 56, 44, 92, 0.15),
      arm(34, -168, 64, -150, 96, -142),
      arm(-16, -168, -26, -148, -18, -130),
      leg(14, -86, 30, -48, 36, 0),
      leg(-14, -86, -6, -42, -8, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- divine_cleave: overhead slam (4 frames) --
  divine_cleave: [
    // big windup: sword held high behind head
    pose(
      head(-3, -190),
      torso(-5, -134, 56, 44, 92, -0.1),
      arm(24, -174, 16, -194, 6, -218),
      arm(-28, -174, -38, -158, -34, -142),
      leg(14, -86, 18, -46, 16, 0),
      leg(-14, -86, -18, -46, -20, 0),
    ),
    // overhead slam: sword crashing down
    pose(
      head(8, -183),
      torso(5, -128, 56, 44, 92, 0.18),
      arm(30, -168, 54, -142, 70, -98),
      arm(-22, -168, -30, -146, -22, -128),
      leg(14, -86, 22, -42, 22, 0),
      leg(-14, -86, -14, -48, -18, 0),
    ),
    // impact hold: sword slammed down
    pose(
      head(12, -178),
      torso(8, -123, 56, 44, 92, 0.22),
      arm(32, -163, 62, -118, 78, -62),
      arm(-20, -163, -28, -140, -20, -122),
      leg(14, -86, 24, -40, 26, 0),
      leg(-14, -86, -14, -50, -20, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- purifying_sweep: ground-level holy sweep (3 frames) --
  purifying_sweep: [
    // startup: drop low
    pose(
      head(2, -150),
      torso(0, -102, 58, 46, 74, 0.05),
      arm(26, -134, 20, -112, 6, -102),
      arm(-26, -134, -34, -118, -30, -100),
      leg(16, -66, 30, -34, 26, 0),
      leg(-16, -66, -26, -34, -26, 0),
    ),
    // ground sweep: sword sweeps at ankle height
    pose(
      head(10, -147),
      torso(6, -98, 58, 46, 74, 0.22),
      arm(32, -130, 60, -72, 92, -12),
      arm(-20, -130, -30, -114, -22, -94),
      leg(16, -66, 34, -30, 34, 0),
      leg(-16, -66, -24, -36, -28, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- ascending_light: anti-air rising slash (4 frames) --
  ascending_light: [
    // crouch startup: coil low
    pose(
      head(2, -150),
      torso(0, -102, 58, 46, 74),
      arm(26, -134, 30, -110, 22, -92),
      arm(-26, -134, -34, -118, -30, -100),
      leg(16, -66, 30, -34, 26, 0),
      leg(-16, -66, -26, -34, -26, 0),
    ),
    // upward slash: rising, sword sweeping up
    pose(
      head(6, -178),
      torso(4, -124, 56, 44, 88, 0.08),
      arm(28, -164, 50, -158, 66, -188),
      arm(-24, -164, -34, -144, -28, -126),
      leg(14, -82, 22, -44, 18, 0),
      leg(-14, -82, -16, -44, -16, 0),
    ),
    // peak: airborne, sword high
    pose(
      head(5, -204),
      torso(2, -150, 56, 44, 88, 0.05),
      arm(28, -188, 42, -198, 48, -224),
      arm(-24, -188, -36, -172, -30, -154),
      leg(14, -106, 22, -82, 20, -62),
      leg(-14, -106, -16, -78, -18, -58),
    ),
    // recovery: landing
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- grab: shield slam (3 frames) --
  grab: [
    // reach: arms extend forward to grab
    pose(
      head(6, -186),
      torso(4, -131, 56, 44, 92, 0.06),
      arm(28, -171, 50, -158, 68, -148, true),
      arm(-24, -171, -8, -155, 16, -144, true),
      leg(14, -86, 20, -44, 20, 0),
      leg(-14, -86, -14, -46, -16, 0),
    ),
    // bash: shield arm slams forward
    pose(
      head(10, -184),
      torso(8, -129, 56, 44, 92, 0.12),
      arm(30, -169, 52, -152, 60, -138),
      arm(-22, -169, 6, -148, 36, -138),
      leg(14, -86, 22, -42, 22, 0),
      leg(-14, -86, -14, -48, -18, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- shield_rush: charging forward with shield (3 frames) --
  shield_rush: [
    // crouch behind shield
    pose(
      head(-1, -183),
      torso(-3, -130, 56, 44, 92, -0.08),
      arm(24, -170, 30, -154, 24, -138),
      arm(-28, -170, -8, -156, 12, -146),
      leg(14, -86, 18, -46, 16, 0),
      leg(-14, -86, -18, -46, -20, 0),
    ),
    // lunging forward with shield
    pose(
      head(14, -180),
      torso(10, -126, 56, 44, 92, 0.15),
      arm(34, -166, 50, -150, 55, -134),
      arm(-14, -166, 14, -150, 42, -140),
      leg(14, -86, 30, -48, 36, 0),
      leg(-14, -86, -6, -42, -8, 0),
    ),
    // recovery
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- grail_strike: massive holy downward slash (4 frames) --
  grail_strike: [
    // deep crouch gathering holy power
    pose(
      head(0, -150),
      torso(-2, -102, 58, 46, 74, -0.06),
      arm(26, -134, 18, -110, 6, -92),
      arm(-26, -134, -36, -118, -32, -100),
      leg(16, -66, 28, -34, 24, 0),
      leg(-16, -66, -26, -34, -24, 0),
    ),
    // explosive upward slash
    pose(
      head(8, -188),
      torso(6, -132, 56, 44, 92, 0.12),
      arm(30, -172, 50, -178, 60, -214),
      arm(-22, -172, -30, -152, -24, -134),
      leg(14, -86, 20, -44, 20, 0),
      leg(-14, -86, -14, -46, -16, 0),
    ),
    // peak — sword high, airborne
    pose(
      head(6, -208),
      torso(4, -155, 56, 44, 90, 0.08),
      arm(28, -193, 42, -208, 48, -244),
      arm(-24, -193, -36, -176, -30, -158),
      leg(14, -110, 22, -84, 20, -64),
      leg(-14, -110, -16, -80, -18, -60),
    ),
    // recovery landing
    pose(
      head(3, -188),
      torso(0, -132, 56, 44, 92),
      arm(26, -172, 40, -150, 35, -128),
      arm(-26, -172, -36, -155, -28, -140),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
  ],

  // -- block_stand (1 frame: shield raised prominently in front) --
  block_stand: [
    pose(
      head(-1, -189),
      torso(-3, -133, 56, 44, 92, -0.05),
      arm(24, -173, 30, -158, 24, -142),
      arm(-28, -173, -8, -158, 10, -148),
      leg(14, -86, 16, -46, 14, 0),
      leg(-14, -86, -18, -46, -18, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched behind shield) --
  block_crouch: [
    pose(
      head(-3, -134),
      torso(-4, -90, 58, 48, 72, -0.06),
      arm(24, -120, 28, -100, 22, -82),
      arm(-28, -120, -6, -104, 12, -96),
      leg(16, -55, 28, -28, 22, 0),
      leg(-16, -55, -28, -28, -24, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-8, -184),
      torso(-6, -130, 56, 44, 92, -0.12),
      arm(20, -170, 8, -150, -4, -132),
      arm(-32, -170, -46, -148, -50, -124),
      leg(14, -86, 10, -44, 4, 0),
      leg(-14, -86, -20, -46, -24, 0),
    ),
    pose(
      head(-12, -182),
      torso(-10, -128, 56, 44, 92, -0.18),
      arm(16, -168, 2, -148, -12, -130),
      arm(-36, -168, -50, -145, -56, -120),
      leg(14, -86, 6, -42, 0, 0),
      leg(-14, -86, -24, -48, -28, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    // falling
    pose(
      head(-15, -142),
      torso(-12, -98, 56, 44, 82, -0.35),
      arm(12, -132, -4, -112, -18, -98),
      arm(-38, -132, -50, -110, -56, -90),
      leg(14, -58, 20, -30, 24, 0),
      leg(-14, -58, -22, -32, -28, 0),
    ),
    // lying on ground
    pose(
      head(-50, -20),
      torso(-25, -18, 56, 44, 92, -1.5),
      arm(-5, -35, -25, -22, -45, -15),
      arm(-45, -10, -60, -5, -70, 0),
      leg(14, -10, 30, -5, 45, 0),
      leg(-14, -10, -8, -5, 5, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground) --
  get_up: [
    // pushing up
    pose(
      head(-20, -92),
      torso(-12, -62, 56, 44, 72, -0.4),
      arm(10, -92, 20, -57, 25, -32),
      arm(-34, -92, -44, -57, -40, -30),
      leg(14, -27, 24, -14, 22, 0),
      leg(-14, -27, -22, -14, -20, 0),
    ),
    // nearly standing
    pose(
      head(2, -172),
      torso(-2, -120, 56, 44, 86, -0.08),
      arm(24, -158, 36, -138, 30, -118),
      arm(-28, -158, -38, -142, -34, -124),
      leg(14, -78, 18, -40, 16, 0),
      leg(-14, -78, -18, -40, -16, 0),
    ),
  ],

  // -- victory (2 frames: sword raised, triumphant holy pose) --
  victory: [
    // raise sword heavenward
    pose(
      head(3, -192),
      torso(0, -134, 56, 44, 92),
      arm(26, -174, 36, -194, 40, -222),
      arm(-26, -174, -36, -155, -28, -138),
      leg(14, -86, 16, -45, 14, 0),
      leg(-14, -86, -16, -45, -14, 0),
    ),
    // triumphant hold: kneeling in prayer
    pose(
      head(3, -194),
      torso(0, -136, 56, 44, 92),
      arm(26, -176, 34, -198, 38, -228),
      arm(-26, -176, -38, -158, -32, -142),
      leg(14, -86, 18, -45, 16, 0),
      leg(-14, -86, -18, -45, -16, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed on the ground) --
  defeat: [
    pose(
      head(-55, -18),
      torso(-28, -16, 56, 44, 92, -1.55),
      arm(-8, -32, -28, -18, -50, -10),
      arm(-48, -8, -65, -2, -75, 2),
      leg(14, -8, 32, -3, 48, 0),
      leg(-14, -8, -5, -3, 8, 0),
    ),
  ],
};

// ---- Draw extras (sword, shield, armor details) ----------------------------

/**
 * Draw Galahad's white tabard/surcoat behind the body (called before skeleton).
 */
export function drawGalahadBackExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const tabardColor = pal.accent ?? 0xffffff;

  if (p.torso && p.backArm) {
    const capeTop = p.torso.y - p.torso.height / 2;
    const capeX = p.torso.x - p.torso.topWidth / 2 - 2;
    const capeBottom = p.torso.y + p.torso.height / 2 + 18;
    const capeMid = (capeTop + capeBottom) / 2;

    // White tabard/surcoat flowing behind
    g.moveTo(capeX, capeTop);
    g.quadraticCurveTo(capeX - 14, capeMid, capeX - 8, capeBottom);
    g.lineTo(capeX + 8, capeBottom - 2);
    g.quadraticCurveTo(capeX - 4, capeMid, capeX + 4, capeTop + 4);
    g.closePath();
    g.fill({ color: tabardColor, alpha: 0.75 });

    // Subtle cross emblem on tabard
    const crossX = capeX - 2;
    const crossY = capeMid - 4;
    g.moveTo(crossX, crossY - 10);
    g.lineTo(crossX, crossY + 10);
    g.stroke({ color: 0x88ccff, width: 2, alpha: 0.5 });
    g.moveTo(crossX - 6, crossY);
    g.lineTo(crossX + 6, crossY);
    g.stroke({ color: 0x88ccff, width: 2, alpha: 0.5 });
  }
}

/**
 * Draw Galahad's radiant white sword, round shield with grail emblem, and armor pauldrons.
 */
export function drawGalahadExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const weaponColor = pal.weapon ?? 0xeeeeff;
  const holyGlow = pal.weaponAccent ?? 0x88ccff;
  const armorColor = pal.body ?? 0xccccdd;
  const armorHighlight = 0xddddee;
  const armorShadow = 0x9999aa;

  // --- Armor pauldrons on torso ---
  if (p.torso) {
    const t = p.torso;
    const lsx = t.x - t.topWidth / 2 - 4;
    const rsx = t.x + t.topWidth / 2 + 4;
    const sy = t.y - t.height / 2 - 2;

    // Left pauldron (larger, more ornate)
    g.roundRect(lsx - 10, sy - 4, 20, 16, 5);
    g.fill({ color: armorColor });
    g.roundRect(lsx - 10, sy - 4, 20, 16, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    // Holy cross rivet on pauldron
    g.moveTo(lsx, sy + 1);
    g.lineTo(lsx, sy + 8);
    g.stroke({ color: holyGlow, width: 1.5, alpha: 0.6 });
    g.moveTo(lsx - 3, sy + 4);
    g.lineTo(lsx + 3, sy + 4);
    g.stroke({ color: holyGlow, width: 1.5, alpha: 0.6 });

    // Right pauldron
    g.roundRect(rsx - 10, sy - 4, 20, 16, 5);
    g.fill({ color: armorColor });
    g.roundRect(rsx - 10, sy - 4, 20, 16, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(rsx, sy + 1);
    g.lineTo(rsx, sy + 8);
    g.stroke({ color: holyGlow, width: 1.5, alpha: 0.6 });
    g.moveTo(rsx - 3, sy + 4);
    g.lineTo(rsx + 3, sy + 4);
    g.stroke({ color: holyGlow, width: 1.5, alpha: 0.6 });

    // Chest plate center line detail
    g.moveTo(t.x, t.y - t.height / 2 + 6);
    g.lineTo(t.x, t.y + t.height / 2 - 10);
    g.stroke({ color: armorHighlight, width: 1, alpha: 0.4 });

    // Horizontal armor segment line
    g.moveTo(t.x - t.topWidth / 3, t.y - 4);
    g.lineTo(t.x + t.topWidth / 3, t.y - 4);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.5 });
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

  // --- Gauntlet detail on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    g.circle(ex, ey, 6);
    g.fill({ color: armorColor });
    g.circle(ex, ey, 6);
    g.stroke({ color: armorHighlight, width: 1 });
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx, my, 2);
    g.fill({ color: armorHighlight });
  }

  // --- Round shield on back arm (with cross/grail emblem) ---
  if (p.backArm) {
    const sx = p.backArm.handX;
    const sy = p.backArm.handY;
    const shieldR = 32;
    const shieldCX = sx + 2;
    const shieldCY = sy - 4;

    // Shield outline (dark border)
    g.circle(shieldCX, shieldCY, shieldR + 2);
    g.fill({ color: 0x222233 });

    // Shield rim (silver)
    g.circle(shieldCX, shieldCY, shieldR);
    g.fill({ color: armorColor });

    // Shield face (white/silver with slight blue tint)
    g.circle(shieldCX, shieldCY, shieldR - 3);
    g.fill({ color: 0xeeeeff });

    // Inner ring detail
    g.circle(shieldCX, shieldCY, shieldR - 8);
    g.stroke({ color: armorShadow, width: 1.5 });

    // Cross emblem centered on shield
    g.moveTo(shieldCX, shieldCY - 18);
    g.lineTo(shieldCX, shieldCY + 18);
    g.stroke({ color: holyGlow, width: 5 });
    g.moveTo(shieldCX - 13, shieldCY - 2);
    g.lineTo(shieldCX + 13, shieldCY - 2);
    g.stroke({ color: holyGlow, width: 5 });

    // Grail cup emblem below the cross (small goblet shape)
    const gx = shieldCX;
    const gy = shieldCY + 10;
    // Cup bowl
    g.moveTo(gx - 5, gy);
    g.quadraticCurveTo(gx - 5, gy + 6, gx, gy + 7);
    g.quadraticCurveTo(gx + 5, gy + 6, gx + 5, gy);
    g.closePath();
    g.fill({ color: 0xddaa44 });
    // Cup stem
    g.moveTo(gx, gy + 7);
    g.lineTo(gx, gy + 11);
    g.stroke({ color: 0xddaa44, width: 1.5 });
    // Cup base
    g.moveTo(gx - 3, gy + 11);
    g.lineTo(gx + 3, gy + 11);
    g.stroke({ color: 0xddaa44, width: 1.5 });

    // Shield boss (central rivet)
    g.circle(shieldCX, shieldCY - 2, 4);
    g.fill({ color: 0x222233 });
    g.circle(shieldCX, shieldCY - 2, 3);
    g.fill({ color: armorHighlight });

    // Decorative rivets around the rim
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const rx = shieldCX + Math.cos(a) * (shieldR - 5);
      const ry = shieldCY + Math.sin(a) * (shieldR - 5);
      g.circle(rx, ry, 1.5);
      g.fill({ color: armorHighlight });
    }
  }

  // --- Radiant white sword in front arm ---
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

    // Blade glow (wider, faint blue)
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke({ color: holyGlow, width: 10, cap: "round", alpha: 0.25 });

    // Blade outline
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke({ color: 0x222233, width: 7, cap: "round" });

    // Blade fill (bright white)
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke({ color: weaponColor, width: 5, cap: "round" });

    // Blade highlight (thin bright white line)
    g.moveTo(hx + ny * 1, hy - nx * 1);
    g.lineTo(tipX + ny * 1, tipY - nx * 1);
    g.stroke({ color: 0xffffff, width: 1.5, cap: "round" });

    // Blade fuller (groove down center)
    const fullerStart = 0.15;
    const fullerEnd = 0.85;
    g.moveTo(hx + nx * bladeLen * fullerStart, hy + ny * bladeLen * fullerStart);
    g.lineTo(hx + nx * bladeLen * fullerEnd, hy + ny * bladeLen * fullerEnd);
    g.stroke({ color: holyGlow, width: 1.5, cap: "round", alpha: 0.5 });

    // Crossguard (perpendicular to blade)
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
    g.stroke({ color: 0xddaa44, width: 5, cap: "round" });

    // Crossguard end caps
    g.circle(gx1, gy1, 3);
    g.fill({ color: 0xddaa44 });
    g.circle(gx2, gy2, 3);
    g.fill({ color: 0xddaa44 });

    // Pommel (small circle behind the hand)
    const pommelX = hx - nx * 7;
    const pommelY = hy - ny * 7;
    g.circle(pommelX, pommelY, 5);
    g.fill({ color: 0x222233 });
    g.circle(pommelX, pommelY, 4);
    g.fill({ color: 0xddaa44 });
    // Blue gem in pommel
    g.circle(pommelX - nx * 0.5, pommelY - ny * 0.5, 1.5);
    g.fill({ color: holyGlow });
  }

  // --- Halo / holy glow above head ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;
    // Subtle holy halo above head
    g.ellipse(hx, hy - hr - 4, 14, 4);
    g.stroke({ color: holyGlow, width: 2, alpha: 0.4 });
    g.ellipse(hx, hy - hr - 4, 12, 3);
    g.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
  }
}
