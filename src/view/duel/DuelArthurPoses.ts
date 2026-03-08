// ---------------------------------------------------------------------------
// Arthur – The Once and Future King
// Skeleton pose data for the duel fighting game.
// Full plate armor, great helm, longsword + kite shield, crimson cape.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const ARTHUR_PALETTE: FighterPalette = {
  skin: 0xddbb99,
  body: 0x888899,      // silver/steel plate armor
  pants: 0x555566,      // dark gray armored leggings
  shoes: 0x664422,      // brown leather boots
  hair: 0x553322,       // dark brown (under helm, barely visible)
  eyes: 0x446688,
  outline: 0x222233,
  gloves: 0x888899,     // steel gauntlets
  belt: 0x664422,       // brown leather belt
  accent: 0xbb2222,     // crimson cape
  weapon: 0xccccdd,     // sword blade steel
  weaponAccent: 0xddaa33, // gold crossguard
};

// ---- Poses -----------------------------------------------------------------

export const ARTHUR_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, subtle breathing bob, wide knightly stance) --
  idle: [
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -145, 30, -120),        // front: sword held at rest
      arm(-26, -170, -40, -148, -35, -125),      // back: shield arm at side
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
    pose(
      head(5, -184),
      torso(0, -129, 56, 44, 90),
      arm(26, -169, 38, -144, 30, -119),
      arm(-26, -169, -40, -147, -35, -124),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
    pose(
      head(5, -183),
      torso(0, -128, 56, 44, 90),
      arm(26, -168, 38, -143, 30, -118),
      arm(-26, -168, -40, -146, -35, -123),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
    pose(
      head(5, -184),
      torso(0, -129, 56, 44, 90),
      arm(26, -169, 38, -144, 30, -119),
      arm(-26, -169, -40, -147, -35, -124),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- walk_forward (4 frames, heavy armored stride) --
  walk_forward: [
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 40, -148, 35, -125),
      arm(-26, -170, -35, -145, -28, -120),
      leg(14, -85, 28, -48, 30, 0),
      leg(-14, -85, -8, -42, -20, 0),
    ),
    pose(
      head(7, -184),
      torso(2, -129, 56, 44, 90),
      arm(28, -169, 42, -145, 38, -122),
      arm(-24, -169, -32, -142, -25, -118),
      leg(14, -85, 20, -44, 14, 0),
      leg(-14, -85, -14, -44, -14, 0),
    ),
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 32, -125),
      arm(-26, -170, -38, -145, -32, -120),
      leg(14, -85, -2, -42, -16, 0),
      leg(-14, -85, 22, -48, 26, 0),
    ),
    pose(
      head(3, -184),
      torso(-2, -129, 56, 44, 90),
      arm(24, -169, 36, -145, 30, -122),
      arm(-28, -169, -40, -142, -36, -118),
      leg(14, -85, 14, -44, 14, 0),
      leg(-14, -85, -14, -44, -14, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious backward step) --
  walk_back: [
    pose(
      head(3, -185),
      torso(-2, -130, 56, 44, 90),
      arm(24, -170, 35, -150, 28, -130),
      arm(-28, -170, -42, -148, -38, -125),
      leg(14, -85, 8, -48, -6, 0),
      leg(-14, -85, -24, -42, -28, 0),
    ),
    pose(
      head(1, -184),
      torso(-4, -129, 56, 44, 90),
      arm(22, -169, 33, -148, 26, -128),
      arm(-30, -169, -44, -146, -40, -123),
      leg(14, -85, 14, -44, 14, 0),
      leg(-14, -85, -14, -44, -14, 0),
    ),
    pose(
      head(3, -185),
      torso(-2, -130, 56, 44, 90),
      arm(24, -170, 35, -150, 28, -130),
      arm(-28, -170, -42, -148, -38, -125),
      leg(14, -85, 24, -42, 28, 0),
      leg(-14, -85, -8, -48, 6, 0),
    ),
    pose(
      head(1, -184),
      torso(-4, -129, 56, 44, 90),
      arm(22, -169, 33, -148, 26, -128),
      arm(-30, -169, -44, -146, -40, -123),
      leg(14, -85, 14, -44, 14, 0),
      leg(-14, -85, -14, -44, -14, 0),
    ),
  ],

  // -- crouch (1 frame, low guard behind shield) --
  crouch: [
    pose(
      head(3, -130),
      torso(0, -85, 58, 48, 70),
      arm(26, -115, 35, -90, 30, -70),
      arm(-26, -115, -35, -95, -30, -75),
      leg(16, -50, 28, -25, 22, 0),
      leg(-16, -50, -28, -25, -22, 0),
    ),
  ],

  // -- jump (2 frames: leap up, peak with sword raised) --
  jump: [
    pose(
      head(5, -190),
      torso(0, -138, 56, 44, 88),
      arm(26, -176, 42, -165, 50, -185),         // sword arm raised
      arm(-26, -176, -38, -155, -30, -140),
      leg(14, -94, 22, -68, 18, -48),
      leg(-14, -94, -22, -68, -18, -48),
    ),
    pose(
      head(5, -195),
      torso(0, -142, 56, 44, 88),
      arm(26, -180, 45, -175, 55, -198),          // sword thrust upward at peak
      arm(-26, -180, -40, -158, -32, -142),
      leg(14, -98, 24, -72, 28, -55),
      leg(-14, -98, -20, -65, -25, -50),
    ),
  ],

  // -- light_high: quick jab (3 frames) --
  light_high: [
    // startup: pull sword back
    pose(
      head(3, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 15, -148, 0, -135),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
    // extended jab: sword arm thrust forward
    pose(
      head(8, -184),
      torso(3, -129, 56, 44, 90, 0.05),
      arm(28, -169, 55, -155, 85, -150),
      arm(-24, -169, -36, -146, -30, -122),
      leg(14, -85, 20, -44, 18, 0),
      leg(-14, -85, -18, -46, -18, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- med_high: horizontal slash (3 frames) --
  med_high: [
    // startup: sword drawn back high
    pose(
      head(0, -186),
      torso(-2, -130, 56, 44, 90, -0.08),
      arm(26, -170, 10, -170, -10, -175),
      arm(-26, -170, -40, -148, -35, -125),
      leg(14, -85, 20, -45, 18, 0),
      leg(-14, -85, -18, -45, -20, 0),
    ),
    // horizontal slash: wide arc across
    pose(
      head(10, -183),
      torso(5, -128, 56, 44, 90, 0.1),
      arm(28, -168, 58, -148, 88, -130),
      arm(-24, -168, -36, -145, -28, -120),
      leg(14, -85, 22, -44, 20, 0),
      leg(-14, -85, -18, -46, -20, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 40, -145, 35, -120),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- heavy_high: overhead strike (4 frames) --
  heavy_high: [
    // windup: sword raised high overhead
    pose(
      head(0, -186),
      torso(-3, -131, 56, 44, 90, -0.06),
      arm(26, -170, 22, -185, 18, -210),
      arm(-26, -170, -40, -150, -36, -130),
      leg(14, -85, 20, -45, 18, 0),
      leg(-14, -85, -20, -45, -22, 0),
    ),
    // downward strike: sword coming down
    pose(
      head(8, -183),
      torso(4, -128, 56, 44, 90, 0.12),
      arm(28, -168, 52, -150, 72, -110),
      arm(-24, -168, -34, -144, -26, -118),
      leg(14, -85, 22, -44, 22, 0),
      leg(-14, -85, -16, -46, -18, 0),
    ),
    // impact: sword low, body committed
    pose(
      head(12, -180),
      torso(6, -125, 56, 44, 90, 0.15),
      arm(30, -165, 60, -130, 80, -88),
      arm(-22, -165, -32, -140, -24, -115),
      leg(14, -85, 24, -42, 24, 0),
      leg(-14, -85, -16, -48, -20, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- light_low: armored kick (3 frames) --
  light_low: [
    // startup: lift leg
    pose(
      head(3, -185),
      torso(-2, -132, 56, 44, 90),
      arm(24, -172, 36, -150, 28, -130),
      arm(-28, -172, -40, -148, -36, -125),
      leg(14, -85, 28, -55, 30, -30),
      leg(-14, -85, -20, -45, -22, 0),
    ),
    // kick extended
    pose(
      head(0, -184),
      torso(-4, -131, 56, 44, 90, -0.05),
      arm(22, -171, 34, -148, 26, -128),
      arm(-30, -171, -42, -146, -38, -123),
      leg(14, -85, 42, -52, 70, -30),
      leg(-14, -85, -22, -44, -24, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- med_low: low poke (3 frames) --
  med_low: [
    // startup: crouch slightly, pull sword back
    pose(
      head(3, -175),
      torso(0, -122, 56, 44, 85, 0.08),
      arm(26, -160, 30, -130, 15, -105),
      arm(-26, -160, -38, -138, -34, -115),
      leg(14, -80, 22, -42, 20, 0),
      leg(-14, -80, -20, -42, -20, 0),
    ),
    // low poke: sword thrust low and forward
    pose(
      head(8, -172),
      torso(4, -118, 56, 44, 85, 0.15),
      arm(28, -156, 55, -110, 85, -80),
      arm(-24, -156, -34, -135, -28, -112),
      leg(14, -80, 24, -40, 22, 0),
      leg(-14, -80, -20, -44, -22, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- heavy_low: sweep (4 frames) --
  heavy_low: [
    // windup: crouch, wind sword to back
    pose(
      head(0, -155),
      torso(-3, -105, 58, 46, 75, -0.1),
      arm(26, -138, 10, -125, -15, -115),
      arm(-26, -138, -40, -120, -38, -100),
      leg(16, -68, 28, -35, 24, 0),
      leg(-16, -68, -28, -35, -26, 0),
    ),
    // sweep: sword sweeps low across the ground
    pose(
      head(10, -150),
      torso(5, -100, 58, 46, 75, 0.18),
      arm(30, -133, 58, -85, 85, -20),
      arm(-22, -133, -34, -115, -26, -95),
      leg(16, -68, 32, -30, 30, 0),
      leg(-16, -68, -26, -38, -28, 0),
    ),
    // hold: sword extended at ground level
    pose(
      head(12, -148),
      torso(6, -98, 58, 46, 75, 0.2),
      arm(32, -131, 62, -80, 90, -15),
      arm(-20, -131, -32, -112, -24, -92),
      leg(16, -68, 34, -28, 32, 0),
      leg(-16, -68, -26, -38, -28, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- sword_thrust: lunging stab (3 frames) --
  sword_thrust: [
    // startup: pull sword way back, lean back
    pose(
      head(-2, -186),
      torso(-5, -131, 56, 44, 90, -0.12),
      arm(24, -170, 5, -155, -15, -145),
      arm(-28, -170, -42, -150, -38, -130),
      leg(14, -85, 18, -45, 14, 0),
      leg(-14, -85, -22, -45, -24, 0),
    ),
    // lunge: body drives forward, sword fully extended
    pose(
      head(18, -180),
      torso(12, -126, 56, 44, 90, 0.15),
      arm(36, -166, 65, -148, 95, -140),
      arm(-14, -166, -28, -142, -20, -118),
      leg(14, -85, 32, -48, 38, 0),
      leg(-14, -85, -8, -42, -10, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- overhead_cleave: big overhead slam (4 frames) --
  overhead_cleave: [
    // big windup: sword held high behind head
    pose(
      head(-2, -187),
      torso(-5, -132, 56, 44, 90, -0.1),
      arm(24, -172, 15, -190, 5, -215),
      arm(-28, -172, -42, -155, -40, -135),
      leg(14, -85, 20, -46, 18, 0),
      leg(-14, -85, -20, -46, -22, 0),
    ),
    // overhead slam: sword crashing down
    pose(
      head(10, -180),
      torso(5, -125, 56, 44, 90, 0.18),
      arm(30, -165, 55, -140, 70, -95),
      arm(-22, -165, -32, -140, -24, -115),
      leg(14, -85, 24, -42, 24, 0),
      leg(-14, -85, -16, -48, -20, 0),
    ),
    // impact hold: sword slammed into ground
    pose(
      head(14, -175),
      torso(8, -120, 56, 44, 90, 0.22),
      arm(32, -160, 62, -115, 78, -60),
      arm(-20, -160, -30, -136, -22, -110),
      leg(14, -85, 26, -40, 28, 0),
      leg(-14, -85, -16, -50, -22, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- low_sweep: ground-level sweep (3 frames) --
  low_sweep: [
    // startup: drop low
    pose(
      head(2, -148),
      torso(0, -100, 58, 46, 72, 0.05),
      arm(26, -132, 20, -110, 5, -100),
      arm(-26, -132, -38, -115, -34, -95),
      leg(16, -64, 30, -32, 26, 0),
      leg(-16, -64, -28, -34, -28, 0),
    ),
    // ground sweep: sword sweeps at ankle height
    pose(
      head(12, -145),
      torso(6, -96, 58, 46, 72, 0.22),
      arm(32, -128, 60, -70, 90, -10),
      arm(-20, -128, -32, -110, -24, -90),
      leg(16, -64, 35, -28, 34, 0),
      leg(-16, -64, -26, -36, -30, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- rising_slash: anti-air uppercut (4 frames) --
  rising_slash: [
    // crouch startup: coil low
    pose(
      head(3, -148),
      torso(0, -100, 58, 46, 72),
      arm(26, -132, 30, -108, 20, -90),
      arm(-26, -132, -38, -115, -34, -95),
      leg(16, -64, 30, -32, 26, 0),
      leg(-16, -64, -28, -34, -28, 0),
    ),
    // upward slash: rising, sword sweeping up
    pose(
      head(8, -175),
      torso(4, -122, 56, 44, 86, 0.08),
      arm(28, -162, 50, -155, 65, -185),
      arm(-24, -162, -36, -140, -30, -118),
      leg(14, -80, 22, -44, 20, 0),
      leg(-14, -80, -18, -44, -18, 0),
    ),
    // peak: airborne, sword high
    pose(
      head(6, -200),
      torso(2, -148, 56, 44, 86, 0.05),
      arm(28, -186, 42, -195, 48, -220),
      arm(-24, -186, -38, -168, -32, -150),
      leg(14, -104, 22, -80, 20, -60),
      leg(-14, -104, -18, -75, -20, -55),
    ),
    // recovery: landing
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- grab: shield bash (3 frames) --
  grab: [
    // reach: arms extend forward to grab
    pose(
      head(8, -184),
      torso(4, -129, 56, 44, 90, 0.06),
      arm(28, -169, 50, -155, 68, -145, true),
      arm(-24, -169, -10, -150, 15, -140, true),
      leg(14, -85, 22, -44, 22, 0),
      leg(-14, -85, -16, -46, -18, 0),
    ),
    // bash: shield arm slams forward
    pose(
      head(12, -182),
      torso(8, -127, 56, 44, 90, 0.12),
      arm(30, -167, 52, -150, 60, -135),
      arm(-22, -167, 5, -145, 35, -135),     // shield arm swings forward for bash
      leg(14, -85, 24, -42, 24, 0),
      leg(-14, -85, -16, -48, -20, 0),
    ),
    // recovery
    pose(
      head(5, -185),
      torso(0, -130, 56, 44, 90),
      arm(26, -170, 38, -148, 30, -125),
      arm(-26, -170, -38, -148, -32, -125),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
  ],

  // -- block_stand (1 frame: shield raised in front) --
  block_stand: [
    pose(
      head(0, -186),
      torso(-3, -131, 56, 44, 90, -0.05),
      arm(24, -171, 30, -155, 22, -140),          // sword arm pulled back
      arm(-28, -171, -10, -155, 8, -145),          // shield arm in front of body
      leg(14, -85, 18, -46, 16, 0),
      leg(-14, -85, -20, -46, -20, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched behind shield) --
  block_crouch: [
    pose(
      head(-2, -132),
      torso(-4, -88, 58, 48, 70, -0.06),
      arm(24, -118, 28, -98, 20, -80),
      arm(-28, -118, -8, -100, 10, -92),           // shield arm covering front
      leg(16, -53, 28, -26, 22, 0),
      leg(-16, -53, -28, -26, -24, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-8, -182),
      torso(-6, -128, 56, 44, 90, -0.12),
      arm(20, -168, 8, -148, -5, -130),
      arm(-32, -168, -48, -145, -52, -120),
      leg(14, -85, 10, -44, 4, 0),
      leg(-14, -85, -22, -46, -26, 0),
    ),
    pose(
      head(-12, -180),
      torso(-10, -126, 56, 44, 90, -0.18),
      arm(16, -166, 2, -145, -12, -128),
      arm(-36, -166, -52, -142, -58, -118),
      leg(14, -85, 6, -42, 0, 0),
      leg(-14, -85, -26, -48, -30, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    // falling
    pose(
      head(-15, -140),
      torso(-12, -95, 56, 44, 80, -0.35),
      arm(12, -130, -5, -110, -20, -95),
      arm(-38, -130, -52, -108, -58, -88),
      leg(14, -55, 20, -28, 24, 0),
      leg(-14, -55, -24, -30, -30, 0),
    ),
    // lying on ground
    pose(
      head(-50, -20),
      torso(-25, -18, 56, 44, 90, -1.5),
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
      head(-20, -90),
      torso(-12, -60, 56, 44, 70, -0.4),
      arm(10, -90, 20, -55, 25, -30),
      arm(-34, -90, -45, -55, -42, -28),
      leg(14, -25, 24, -12, 22, 0),
      leg(-14, -25, -22, -14, -20, 0),
    ),
    // nearly standing
    pose(
      head(2, -170),
      torso(-2, -118, 56, 44, 85, -0.08),
      arm(24, -156, 34, -135, 28, -115),
      arm(-28, -156, -40, -138, -36, -118),
      leg(14, -75, 20, -40, 18, 0),
      leg(-14, -75, -20, -40, -18, 0),
    ),
  ],

  // -- victory (2 frames: sword raised triumphantly) --
  victory: [
    // raise sword
    pose(
      head(5, -190),
      torso(0, -132, 56, 44, 90),
      arm(26, -172, 35, -190, 40, -218),           // sword held high
      arm(-26, -172, -38, -150, -30, -130),
      leg(14, -85, 18, -45, 16, 0),
      leg(-14, -85, -18, -45, -16, 0),
    ),
    // triumphant hold
    pose(
      head(5, -192),
      torso(0, -134, 56, 44, 90),
      arm(26, -174, 34, -195, 38, -224),           // sword high in the air
      arm(-26, -174, -40, -155, -35, -135),
      leg(14, -85, 20, -45, 18, 0),
      leg(-14, -85, -20, -45, -18, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed on the ground) --
  defeat: [
    pose(
      head(-55, -18),
      torso(-28, -16, 56, 44, 90, -1.55),
      arm(-8, -32, -28, -18, -50, -10),
      arm(-48, -8, -65, -2, -75, 2),
      leg(14, -8, 32, -3, 48, 0),
      leg(-14, -8, -5, -3, 8, 0),
    ),
  ],
};

// ---- Draw extras (sword, shield, armor details) ----------------------------

export function drawArthurExtras(g: Graphics, p: FighterPose, pal: FighterPalette): void {
  const weaponColor = pal.weapon ?? 0xccccdd;
  const crossguardColor = pal.weaponAccent ?? 0xddaa33;
  const shieldColor = pal.accent ?? 0xbb2222;

  // --- Shield on back arm ---
  if (p.backArm) {
    const sx = p.backArm.handX;
    const sy = p.backArm.handY;
    // Kite shield: taller than wide, pointed bottom
    // Outline
    g.roundRect(sx - 13, sy - 20, 22, 36, 4);
    g.fill({ color: 0x222233 });
    // Shield face (crimson with steel border)
    g.roundRect(sx - 11, sy - 18, 18, 32, 3);
    g.fill({ color: shieldColor });
    // Steel rim
    g.roundRect(sx - 11, sy - 18, 18, 32, 3);
    g.stroke({ color: 0x888899, width: 2 });
    // Cross emblem on shield
    g.moveTo(sx - 2, sy - 12);
    g.lineTo(sx - 2, sy + 6);
    g.stroke({ color: crossguardColor, width: 3 });
    g.moveTo(sx - 8, sy - 5);
    g.lineTo(sx + 4, sy - 5);
    g.stroke({ color: crossguardColor, width: 3 });
  }

  // --- Sword in front arm ---
  if (p.frontArm) {
    const hx = p.frontArm.handX;
    const hy = p.frontArm.handY;
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;

    // Blade direction: extend from hand away from elbow
    const dx = hx - ex;
    const dy = hy - ey;
    const len = Math.sqrt(dx * dx + dy * dy);
    const bladeLen = 50;
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

    // Blade highlight (thinner, lighter line)
    g.moveTo(hx + ny * 1, hy - nx * 1);
    g.lineTo(tipX + ny * 1, tipY - nx * 1);
    g.stroke({ color: 0xeeeeff, width: 1.5, cap: "round" });

    // Crossguard (perpendicular to blade)
    const guardLen = 10;
    const gx1 = hx + ny * guardLen;
    const gy1 = hy - nx * guardLen;
    const gx2 = hx - ny * guardLen;
    const gy2 = hy + nx * guardLen;

    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: 0x222233, width: 6, cap: "round" });
    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: crossguardColor, width: 4, cap: "round" });

    // Pommel (small circle behind the hand)
    const pommelX = hx - nx * 6;
    const pommelY = hy - ny * 6;
    g.circle(pommelX, pommelY, 4);
    g.fill({ color: 0x222233 });
    g.circle(pommelX, pommelY, 3);
    g.fill({ color: crossguardColor });
  }

  // --- Helm visor slit (drawn over head) ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    // Great helm covers the head — draw a visor slit
    g.moveTo(hx - 2, hy - 3);
    g.lineTo(hx + 12, hy - 3);
    g.stroke({ color: 0x222233, width: 3 });
    // Helm top ridge
    g.moveTo(hx - 6, hy - 18);
    g.lineTo(hx + 8, hy - 18);
    g.stroke({ color: 0x999aaa, width: 2, cap: "round" });
  }

  // --- Cape (drawn from shoulders, flowing behind) ---
  if (p.torso && p.backArm) {
    const capeTop = p.torso.y - p.torso.height / 2;
    const capeX = p.torso.x - p.torso.topWidth / 2 - 2;
    const capeBottom = p.torso.y + p.torso.height / 2 + 15;
    const capeMid = (capeTop + capeBottom) / 2;

    // Cape flowing behind (simple quadratic curve)
    g.moveTo(capeX, capeTop);
    g.quadraticCurveTo(capeX - 18, capeMid, capeX - 10, capeBottom);
    g.lineTo(capeX + 5, capeBottom - 2);
    g.quadraticCurveTo(capeX - 8, capeMid, capeX + 4, capeTop + 4);
    g.closePath();
    g.fill({ color: shieldColor, alpha: 0.7 });
  }
}
