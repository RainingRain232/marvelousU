// ---------------------------------------------------------------------------
// Bedivere — The Loyal Hand
// Skeleton pose data for the duel fighting game.
// Heavy iron plate armor, short sword + massive tower shield, no cape.
// Wide, low, shield-forward stance. Heaviest build in the roster.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const BEDIVERE_PALETTE: FighterPalette = {
  skin: 0xddbb99,
  body: 0x777788,        // heavy iron armor
  pants: 0x555566,        // dark armored leggings
  shoes: 0x554433,        // brown leather boots
  hair: 0x665544,         // brown
  eyes: 0x557766,
  outline: 0x222233,
  gloves: 0x777788,       // iron gauntlets
  belt: 0x664422,         // leather belt
  accent: 0x556644,       // olive drab (no cape, used for details)
  weapon: 0xbbbbcc,       // short sword blade
  weaponAccent: 0x888899, // iron crossguard
};

// ---- Poses -----------------------------------------------------------------

export const BEDIVERE_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, wide low shield-forward stance, subtle breathing) --
  idle: [
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),          // front: sword held low at side
      arm(-28, -166, -42, -148, -38, -128),        // back: shield arm forward-ish
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
    pose(
      head(3, -181),
      torso(0, -125, 60, 48, 88),
      arm(28, -165, 40, -141, 32, -117),
      arm(-28, -165, -42, -147, -38, -127),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
    pose(
      head(3, -180),
      torso(0, -124, 60, 48, 88),
      arm(28, -164, 40, -140, 32, -116),
      arm(-28, -164, -42, -146, -38, -126),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
    pose(
      head(3, -181),
      torso(0, -125, 60, 48, 88),
      arm(28, -165, 40, -141, 32, -117),
      arm(-28, -165, -42, -147, -38, -127),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- walk_forward (4 frames, heavy plodding stride) --
  walk_forward: [
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 42, -145, 36, -122),
      arm(-28, -166, -38, -144, -32, -122),
      leg(16, -82, 30, -45, 32, 0),
      leg(-16, -82, -10, -40, -22, 0),
    ),
    pose(
      head(5, -181),
      torso(2, -125, 60, 48, 88),
      arm(30, -165, 44, -142, 38, -120),
      arm(-26, -165, -36, -142, -30, -120),
      leg(16, -82, 22, -42, 18, 0),
      leg(-16, -82, -16, -42, -16, 0),
    ),
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -145, 34, -122),
      arm(-28, -166, -40, -144, -36, -122),
      leg(16, -82, -4, -40, -18, 0),
      leg(-16, -82, 24, -45, 28, 0),
    ),
    pose(
      head(1, -181),
      torso(-2, -125, 60, 48, 88),
      arm(26, -165, 38, -142, 32, -120),
      arm(-30, -165, -42, -142, -38, -120),
      leg(16, -82, 16, -42, 16, 0),
      leg(-16, -82, -16, -42, -16, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious backward shuffle behind shield) --
  walk_back: [
    pose(
      head(1, -182),
      torso(-2, -126, 60, 48, 88),
      arm(26, -166, 36, -148, 28, -130),
      arm(-30, -166, -44, -148, -40, -128),
      leg(16, -82, 10, -45, -4, 0),
      leg(-16, -82, -26, -40, -30, 0),
    ),
    pose(
      head(-1, -181),
      torso(-4, -125, 60, 48, 88),
      arm(24, -165, 34, -146, 26, -128),
      arm(-32, -165, -46, -146, -42, -126),
      leg(16, -82, 16, -42, 16, 0),
      leg(-16, -82, -16, -42, -16, 0),
    ),
    pose(
      head(1, -182),
      torso(-2, -126, 60, 48, 88),
      arm(26, -166, 36, -148, 28, -130),
      arm(-30, -166, -44, -148, -40, -128),
      leg(16, -82, 26, -40, 30, 0),
      leg(-16, -82, -10, -45, 4, 0),
    ),
    pose(
      head(-1, -181),
      torso(-4, -125, 60, 48, 88),
      arm(24, -165, 34, -146, 26, -128),
      arm(-32, -165, -46, -146, -42, -126),
      leg(16, -82, 16, -42, 16, 0),
      leg(-16, -82, -16, -42, -16, 0),
    ),
  ],

  // -- crouch (1 frame, low behind tower shield) --
  crouch: [
    pose(
      head(1, -128),
      torso(0, -82, 62, 50, 68),
      arm(28, -112, 36, -88, 30, -68),
      arm(-28, -112, -38, -94, -34, -74),
      leg(18, -48, 30, -24, 24, 0),
      leg(-18, -48, -30, -24, -24, 0),
    ),
  ],

  // -- jump (2 frames: leap up, peak) --
  jump: [
    pose(
      head(3, -188),
      torso(0, -134, 60, 48, 86),
      arm(28, -174, 42, -162, 36, -145),
      arm(-28, -174, -40, -155, -34, -140),
      leg(16, -90, 24, -66, 20, -46),
      leg(-16, -90, -24, -66, -20, -46),
    ),
    pose(
      head(3, -192),
      torso(0, -138, 60, 48, 86),
      arm(28, -178, 44, -168, 38, -150),
      arm(-28, -178, -42, -158, -36, -142),
      leg(16, -94, 26, -70, 28, -52),
      leg(-16, -94, -22, -64, -26, -48),
    ),
  ],

  // -- light_high: quick shield jab (3 frames) --
  light_high: [
    // startup: pull shield arm back
    pose(
      head(1, -182),
      torso(-2, -126, 60, 48, 88),
      arm(26, -166, 36, -148, 28, -130),
      arm(-30, -166, -44, -150, -40, -132),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
    // shield jab: back arm thrusts forward
    pose(
      head(6, -181),
      torso(3, -125, 60, 48, 88, 0.05),
      arm(30, -165, 42, -144, 34, -122),
      arm(-26, -165, -8, -148, 18, -140),
      leg(16, -82, 24, -42, 22, 0),
      leg(-16, -82, -20, -44, -20, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- med_high: horizontal iron chop (3 frames) --
  med_high: [
    // startup: sword drawn back high
    pose(
      head(-2, -183),
      torso(-3, -127, 60, 48, 88, -0.08),
      arm(26, -167, 10, -168, -10, -172),
      arm(-30, -167, -44, -148, -40, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -22, 0),
    ),
    // horizontal chop: sword sweeps across
    pose(
      head(8, -180),
      torso(4, -124, 60, 48, 88, 0.1),
      arm(30, -164, 56, -145, 78, -128),
      arm(-26, -164, -38, -144, -32, -122),
      leg(16, -82, 24, -42, 22, 0),
      leg(-16, -82, -20, -44, -22, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- heavy_high: overhead tower slam (4 frames) --
  heavy_high: [
    // windup: sword raised high overhead
    pose(
      head(-2, -184),
      torso(-4, -128, 60, 48, 88, -0.06),
      arm(26, -168, 20, -185, 16, -208),
      arm(-30, -168, -44, -150, -40, -132),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -24, 0),
    ),
    // downward strike
    pose(
      head(6, -180),
      torso(3, -124, 60, 48, 88, 0.12),
      arm(30, -164, 50, -148, 68, -108),
      arm(-26, -164, -36, -142, -28, -118),
      leg(16, -82, 24, -42, 24, 0),
      leg(-16, -82, -18, -44, -20, 0),
    ),
    // impact: sword low, body committed
    pose(
      head(10, -177),
      torso(5, -121, 60, 48, 88, 0.16),
      arm(32, -161, 58, -128, 76, -85),
      arm(-24, -161, -34, -138, -26, -114),
      leg(16, -82, 26, -40, 26, 0),
      leg(-16, -82, -18, -46, -22, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- light_low: shin kick behind shield (3 frames) --
  light_low: [
    // startup: lift leg
    pose(
      head(1, -182),
      torso(-2, -128, 60, 48, 88),
      arm(26, -168, 38, -148, 30, -128),
      arm(-30, -168, -42, -148, -38, -128),
      leg(16, -82, 30, -52, 32, -28),
      leg(-16, -82, -22, -42, -24, 0),
    ),
    // kick extended
    pose(
      head(-2, -181),
      torso(-4, -127, 60, 48, 88, -0.05),
      arm(24, -167, 36, -146, 28, -126),
      arm(-32, -167, -44, -146, -40, -126),
      leg(16, -82, 44, -50, 68, -28),
      leg(-16, -82, -24, -42, -26, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- med_low: low crouching sword cut (3 frames) --
  med_low: [
    // startup: crouch, pull sword back
    pose(
      head(1, -172),
      torso(0, -118, 60, 48, 82, 0.08),
      arm(28, -156, 32, -128, 16, -102),
      arm(-28, -156, -40, -136, -36, -114),
      leg(16, -76, 24, -40, 22, 0),
      leg(-16, -76, -22, -40, -22, 0),
    ),
    // low cut: sword thrust low
    pose(
      head(6, -169),
      torso(3, -114, 60, 48, 82, 0.15),
      arm(30, -152, 54, -108, 80, -78),
      arm(-26, -152, -36, -132, -30, -110),
      leg(16, -76, 26, -38, 24, 0),
      leg(-16, -76, -22, -42, -24, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- heavy_low: shield sweep launcher (4 frames) --
  heavy_low: [
    // windup: crouch low, wind shield arm back
    pose(
      head(-2, -152),
      torso(-4, -102, 62, 50, 72, -0.1),
      arm(28, -134, 22, -112, 10, -95),
      arm(-28, -134, -44, -118, -42, -100),
      leg(18, -66, 30, -33, 26, 0),
      leg(-18, -66, -30, -33, -28, 0),
    ),
    // shield sweep: back arm sweeps low across ground
    pose(
      head(8, -148),
      torso(4, -98, 62, 50, 72, 0.18),
      arm(32, -130, 48, -88, 60, -50),
      arm(-24, -130, -8, -85, 20, -18),
      leg(18, -66, 34, -28, 32, 0),
      leg(-18, -66, -28, -36, -30, 0),
    ),
    // hold: shield extended at ground level
    pose(
      head(10, -146),
      torso(5, -96, 62, 50, 72, 0.2),
      arm(34, -128, 50, -85, 62, -45),
      arm(-22, -128, -5, -80, 25, -14),
      leg(18, -66, 36, -26, 34, 0),
      leg(-18, -66, -28, -36, -30, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- shield_thrust: forward shield bash (3 frames) --
  shield_thrust: [
    // startup: crouch behind shield, brace
    pose(
      head(-2, -180),
      torso(-4, -124, 60, 48, 88, -0.1),
      arm(24, -164, 32, -148, 24, -132),
      arm(-30, -164, -14, -150, 6, -142),
      leg(16, -82, 22, -44, 20, 0),
      leg(-16, -82, -22, -44, -24, 0),
    ),
    // bash: lunge forward, shield arm slams out
    pose(
      head(14, -176),
      torso(10, -120, 60, 48, 88, 0.14),
      arm(34, -160, 48, -144, 50, -128),
      arm(-18, -160, 8, -146, 36, -136),
      leg(16, -82, 34, -46, 40, 0),
      leg(-16, -82, -10, -40, -12, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- tower_slam: overhead shield slam (4 frames) --
  tower_slam: [
    // big windup: shield raised overhead
    pose(
      head(-4, -184),
      torso(-6, -128, 60, 48, 88, -0.1),
      arm(24, -168, 14, -188, 4, -212),
      arm(-32, -168, -20, -186, -10, -210),
      leg(16, -82, 22, -44, 20, 0),
      leg(-16, -82, -22, -44, -24, 0),
    ),
    // slam coming down
    pose(
      head(8, -178),
      torso(4, -122, 60, 48, 88, 0.16),
      arm(30, -162, 52, -140, 68, -98),
      arm(-24, -162, -10, -138, 8, -100),
      leg(16, -82, 26, -42, 26, 0),
      leg(-16, -82, -18, -46, -22, 0),
    ),
    // impact hold
    pose(
      head(12, -174),
      torso(6, -118, 60, 48, 88, 0.22),
      arm(32, -158, 58, -115, 74, -62),
      arm(-22, -158, -4, -112, 16, -65),
      leg(16, -82, 28, -40, 30, 0),
      leg(-16, -82, -18, -48, -24, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- low_bash: low shield sweep (3 frames) --
  low_bash: [
    // startup: drop low
    pose(
      head(0, -146),
      torso(0, -98, 62, 50, 70, 0.05),
      arm(28, -130, 22, -108, 8, -98),
      arm(-28, -130, -40, -114, -36, -94),
      leg(18, -62, 32, -30, 28, 0),
      leg(-18, -62, -30, -32, -30, 0),
    ),
    // sweep: shield sweeps along ground
    pose(
      head(10, -142),
      torso(5, -94, 62, 50, 70, 0.2),
      arm(32, -126, 48, -78, 58, -40),
      arm(-22, -126, -6, -76, 22, -12),
      leg(18, -62, 36, -26, 36, 0),
      leg(-18, -62, -28, -34, -32, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- rising_guard: anti-air shield uppercut (4 frames) --
  rising_guard: [
    // crouch startup: coil low
    pose(
      head(1, -146),
      torso(0, -98, 62, 50, 70),
      arm(28, -130, 32, -106, 22, -88),
      arm(-28, -130, -40, -112, -36, -92),
      leg(18, -62, 32, -30, 28, 0),
      leg(-18, -62, -30, -32, -30, 0),
    ),
    // rising: shield arm sweeping upward
    pose(
      head(6, -172),
      torso(3, -118, 60, 48, 84, 0.08),
      arm(30, -158, 44, -150, 38, -132),
      arm(-26, -158, -12, -155, 8, -180),
      leg(16, -76, 24, -42, 22, 0),
      leg(-16, -76, -20, -42, -20, 0),
    ),
    // peak: airborne, shield high
    pose(
      head(4, -198),
      torso(2, -144, 60, 48, 84, 0.05),
      arm(28, -184, 40, -178, 34, -162),
      arm(-26, -184, -10, -192, 6, -218),
      leg(16, -100, 24, -78, 22, -58),
      leg(-16, -100, -20, -72, -22, -52),
    ),
    // recovery: landing
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- grab: tower crush (3 frames) --
  grab: [
    // reach: arms extend forward to grab
    pose(
      head(6, -181),
      torso(3, -125, 60, 48, 88, 0.06),
      arm(30, -165, 52, -152, 70, -142, true),
      arm(-26, -165, -12, -148, 14, -138, true),
      leg(16, -82, 24, -42, 24, 0),
      leg(-16, -82, -18, -44, -20, 0),
    ),
    // crush: slam shield down on grabbed opponent
    pose(
      head(10, -178),
      torso(6, -122, 60, 48, 88, 0.14),
      arm(32, -162, 50, -145, 56, -130),
      arm(-24, -162, 4, -140, 32, -125),
      leg(16, -82, 26, -40, 26, 0),
      leg(-16, -82, -18, -46, -22, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- fortress_charge: rushing forward with shield (3 frames) --
  fortress_charge: [
    // crouch behind shield, brace for charge
    pose(
      head(-2, -178),
      torso(-4, -122, 60, 48, 88, -0.1),
      arm(24, -162, 30, -148, 22, -134),
      arm(-30, -162, -12, -150, 8, -142),
      leg(16, -82, 22, -44, 20, 0),
      leg(-16, -82, -22, -44, -24, 0),
    ),
    // charging forward: full body behind shield
    pose(
      head(18, -174),
      torso(14, -118, 60, 48, 88, 0.18),
      arm(38, -158, 52, -142, 54, -126),
      arm(-10, -158, 14, -144, 42, -134),
      leg(16, -82, 36, -46, 42, 0),
      leg(-16, -82, -6, -38, -8, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- last_stand: massive committed hit (4 frames) --
  last_stand: [
    // deep windup: crouch low gathering power
    pose(
      head(-2, -148),
      torso(-3, -100, 62, 50, 72, -0.06),
      arm(28, -132, 18, -108, 4, -90),
      arm(-28, -132, -42, -114, -38, -94),
      leg(18, -64, 30, -32, 26, 0),
      leg(-18, -64, -30, -32, -28, 0),
    ),
    // explosive forward strike: sword and shield together
    pose(
      head(10, -178),
      torso(6, -124, 60, 48, 88, 0.14),
      arm(32, -164, 56, -150, 80, -138),
      arm(-24, -164, -4, -148, 24, -136),
      leg(16, -82, 28, -42, 30, 0),
      leg(-16, -82, -16, -44, -18, 0),
    ),
    // full extension: both weapons slammed forward
    pose(
      head(14, -175),
      torso(8, -120, 60, 48, 88, 0.2),
      arm(34, -160, 62, -140, 88, -128),
      arm(-20, -160, 8, -140, 38, -128),
      leg(16, -82, 30, -40, 32, 0),
      leg(-16, -82, -16, -46, -20, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- block_stand (1 frame: tower shield raised in front) --
  block_stand: [
    pose(
      head(-2, -183),
      torso(-4, -127, 60, 48, 88, -0.06),
      arm(24, -167, 30, -152, 22, -138),
      arm(-30, -167, -12, -155, 6, -145),
      leg(16, -82, 20, -44, 18, 0),
      leg(-16, -82, -22, -44, -22, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched behind tower shield) --
  block_crouch: [
    pose(
      head(-4, -130),
      torso(-5, -86, 62, 50, 68, -0.06),
      arm(24, -116, 28, -96, 20, -78),
      arm(-30, -116, -10, -98, 8, -90),
      leg(18, -52, 30, -26, 24, 0),
      leg(-18, -52, -30, -26, -26, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-10, -179),
      torso(-8, -124, 60, 48, 88, -0.12),
      arm(20, -164, 8, -146, -6, -128),
      arm(-34, -164, -50, -142, -54, -118),
      leg(16, -82, 12, -42, 6, 0),
      leg(-16, -82, -24, -44, -28, 0),
    ),
    pose(
      head(-14, -177),
      torso(-12, -122, 60, 48, 88, -0.18),
      arm(16, -162, 2, -142, -12, -126),
      arm(-38, -162, -54, -140, -60, -116),
      leg(16, -82, 8, -40, 2, 0),
      leg(-16, -82, -28, -46, -32, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    // falling
    pose(
      head(-18, -138),
      torso(-14, -92, 60, 48, 78, -0.35),
      arm(10, -126, -6, -108, -22, -92),
      arm(-40, -126, -54, -106, -60, -86),
      leg(16, -52, 22, -26, 26, 0),
      leg(-16, -52, -26, -28, -32, 0),
    ),
    // lying on ground
    pose(
      head(-52, -20),
      torso(-28, -18, 60, 48, 88, -1.5),
      arm(-8, -34, -28, -22, -48, -14),
      arm(-48, -10, -62, -4, -72, 0),
      leg(16, -10, 32, -4, 48, 0),
      leg(-16, -10, -8, -4, 6, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground) --
  get_up: [
    // pushing up
    pose(
      head(-22, -88),
      torso(-14, -58, 60, 48, 68, -0.4),
      arm(10, -88, 22, -54, 26, -28),
      arm(-36, -88, -48, -54, -44, -26),
      leg(16, -24, 26, -12, 24, 0),
      leg(-16, -24, -24, -14, -22, 0),
    ),
    // nearly standing
    pose(
      head(0, -168),
      torso(-3, -114, 60, 48, 82, -0.08),
      arm(26, -152, 36, -132, 28, -112),
      arm(-30, -152, -42, -136, -38, -116),
      leg(16, -72, 22, -38, 20, 0),
      leg(-16, -72, -22, -38, -20, 0),
    ),
  ],

  // -- victory (2 frames: sword raised, shield planted) --
  victory: [
    // raise sword, plant shield
    pose(
      head(3, -186),
      torso(0, -128, 60, 48, 88),
      arm(28, -168, 36, -186, 40, -214),
      arm(-28, -168, -40, -148, -36, -128),
      leg(16, -82, 20, -42, 18, 0),
      leg(-16, -82, -20, -42, -18, 0),
    ),
    // triumphant hold
    pose(
      head(3, -188),
      torso(0, -130, 60, 48, 88),
      arm(28, -170, 34, -190, 38, -220),
      arm(-28, -170, -42, -152, -38, -132),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed on the ground) --
  defeat: [
    pose(
      head(-58, -18),
      torso(-30, -16, 60, 48, 88, -1.55),
      arm(-10, -32, -30, -18, -52, -10),
      arm(-50, -8, -68, -2, -78, 2),
      leg(16, -8, 34, -3, 50, 0),
      leg(-16, -8, -6, -3, 8, 0),
    ),
  ],

  // -- shield_cross: wide horizontal shield sweep (3 frames — reuse like cross_slash) --
  shield_cross: [
    // startup: wind shield arm back
    pose(
      head(-2, -183),
      torso(-4, -127, 60, 48, 88, -0.1),
      arm(24, -167, 16, -168, -6, -172),
      arm(-32, -167, -48, -152, -52, -138),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -24, 0),
    ),
    // wide sweep: shield arm swings across body
    pose(
      head(10, -179),
      torso(6, -123, 60, 48, 88, 0.14),
      arm(32, -163, 50, -146, 44, -128),
      arm(-22, -163, 10, -144, 42, -126),
      leg(16, -82, 26, -42, 26, 0),
      leg(-16, -82, -18, -44, -22, 0),
    ),
    // recovery
    pose(
      head(3, -182),
      torso(0, -126, 60, 48, 88),
      arm(28, -166, 40, -142, 32, -118),
      arm(-28, -166, -42, -148, -38, -128),
      leg(16, -82, 22, -42, 20, 0),
      leg(-16, -82, -22, -42, -20, 0),
    ),
  ],

  // -- iron_wall: counter stance (3 frames — long hold) --
  iron_wall: [
    // brace: hunker behind shield
    pose(
      head(-4, -180),
      torso(-6, -124, 60, 48, 88, -0.08),
      arm(22, -164, 28, -150, 20, -136),
      arm(-32, -164, -14, -152, 4, -144),
      leg(16, -82, 24, -44, 22, 0),
      leg(-16, -82, -24, -44, -24, 0),
    ),
    // counter hold: shield fully forward, ready to retaliate
    pose(
      head(0, -181),
      torso(-2, -125, 60, 48, 88, -0.04),
      arm(26, -165, 32, -150, 26, -134),
      arm(-28, -165, -8, -152, 12, -144),
      leg(16, -82, 22, -44, 20, 0),
      leg(-16, -82, -22, -44, -22, 0),
    ),
    // recovery / riposte
    pose(
      head(8, -180),
      torso(4, -124, 60, 48, 88, 0.1),
      arm(30, -164, 54, -146, 78, -132),
      arm(-24, -164, -36, -144, -30, -122),
      leg(16, -82, 24, -42, 22, 0),
      leg(-16, -82, -20, -44, -22, 0),
    ),
  ],
};

// ---- Draw extras (short sword, massive tower shield, heavy armor) ----------

/**
 * Draw Bedivere's heavy back armor/pauldron (called before skeleton).
 * No cape — too practical for that.
 */
export function drawBedivereBackExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const armorColor = pal.body ?? 0x777788;
  const armorShadow = 0x555566;

  if (p.torso && p.backArm) {
    const t = p.torso;
    const topY = t.y - t.height / 2;

    // Heavy back plate — visible behind the torso
    const plateX = t.x - t.topWidth / 2 - 6;
    const plateW = t.topWidth + 12;
    const plateH = t.height * 0.6;
    g.roundRect(plateX, topY - 2, plateW, plateH, 4);
    g.fill({ color: armorShadow, alpha: 0.6 });

    // Back pauldron (large shoulder guard visible from behind)
    const bsx = p.backArm.shoulderX;
    const bsy = p.backArm.shoulderY;
    g.roundRect(bsx - 14, bsy - 8, 22, 18, 5);
    g.fill({ color: armorColor, alpha: 0.8 });
    g.roundRect(bsx - 14, bsy - 8, 22, 18, 5);
    g.stroke({ color: armorShadow, width: 1 });

    // Extra armor plate on back — reinforced spine guard
    g.moveTo(t.x - 4, topY + 4);
    g.lineTo(t.x + 4, topY + 4);
    g.lineTo(t.x + 3, topY + plateH - 4);
    g.lineTo(t.x - 3, topY + plateH - 4);
    g.closePath();
    g.fill({ color: armorColor, alpha: 0.5 });
  }
}

/**
 * Draw Bedivere's equipment: short sword in front hand, MASSIVE tower shield
 * on back arm, and heavy armor detail overlays.
 */
export function drawBedivereExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const weaponColor = pal.weapon ?? 0xbbbbcc;
  const crossguardColor = pal.weaponAccent ?? 0x888899;
  const armorColor = pal.body ?? 0x777788;
  const armorHighlight = 0x999aaa;
  const armorShadow = 0x555566;
  const accentColor = pal.accent ?? 0x556644;

  // --- Heavy armor detail overlays on torso ---
  if (p.torso) {
    const t = p.torso;
    const lsx = t.x - t.topWidth / 2 - 6;
    const rsx = t.x + t.topWidth / 2 + 6;
    const sy = t.y - t.height / 2 - 2;

    // Left pauldron — extra large for tank
    g.roundRect(lsx - 12, sy - 5, 24, 18, 5);
    g.fill({ color: armorColor });
    g.roundRect(lsx - 12, sy - 5, 24, 18, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    // Rivet line on pauldron
    g.moveTo(lsx - 6, sy + 6);
    g.lineTo(lsx + 10, sy + 6);
    g.stroke({ color: armorShadow, width: 1 });
    // Extra plate on pauldron
    g.roundRect(lsx - 8, sy + 10, 18, 8, 2);
    g.fill({ color: armorShadow });

    // Right pauldron — extra large
    g.roundRect(rsx - 12, sy - 5, 24, 18, 5);
    g.fill({ color: armorColor });
    g.roundRect(rsx - 12, sy - 5, 24, 18, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    g.moveTo(rsx - 6, sy + 6);
    g.lineTo(rsx + 10, sy + 6);
    g.stroke({ color: armorShadow, width: 1 });
    g.roundRect(rsx - 8, sy + 10, 18, 8, 2);
    g.fill({ color: armorShadow });

    // Chest plate — heavy reinforced center plate
    const cpX = t.x - t.topWidth / 4;
    const cpY = t.y - t.height / 2 + 4;
    const cpW = t.topWidth / 2;
    const cpH = t.height - 12;
    g.roundRect(cpX, cpY, cpW, cpH, 3);
    g.fill({ color: armorColor, alpha: 0.3 });
    g.roundRect(cpX, cpY, cpW, cpH, 3);
    g.stroke({ color: armorHighlight, width: 1, alpha: 0.5 });

    // Horizontal armor segment lines (multiple for heavy look)
    g.moveTo(t.x - t.topWidth / 3, t.y - 8);
    g.lineTo(t.x + t.topWidth / 3, t.y - 8);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.5 });
    g.moveTo(t.x - t.topWidth / 3, t.y + 4);
    g.lineTo(t.x + t.topWidth / 3, t.y + 4);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.4 });

    // Belt buckle (sturdy)
    const by = t.y + t.height / 2 - 6;
    g.roundRect(t.x - 6, by - 3, 12, 6, 2);
    g.fill({ color: crossguardColor });
    g.roundRect(t.x - 6, by - 3, 12, 6, 2);
    g.stroke({ color: armorShadow, width: 1 });
  }

  // --- Heavy knee guards on legs ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 10, ky - 7, 20, 14, 5);
    g.fill({ color: armorColor });
    g.roundRect(kx - 10, ky - 7, 20, 14, 5);
    g.stroke({ color: armorHighlight, width: 1 });
    // Rivet
    g.circle(kx, ky, 2.5);
    g.fill({ color: armorHighlight });
  }
  if (p.backLeg) {
    const kx = p.backLeg.kneeX;
    const ky = p.backLeg.kneeY;
    g.roundRect(kx - 9, ky - 6, 18, 12, 4);
    g.fill({ color: armorShadow });
    g.roundRect(kx - 9, ky - 6, 18, 12, 4);
    g.stroke({ color: armorColor, width: 1 });
  }

  // --- Boot detail (reinforced greaves) ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    // Greave strap
    g.moveTo(fx - 8, fy - 10);
    g.lineTo(fx + 10, fy - 10);
    g.stroke({ color: 0x553311, width: 2 });
    g.moveTo(fx - 7, fy - 16);
    g.lineTo(fx + 9, fy - 16);
    g.stroke({ color: 0x553311, width: 1.5 });
    // Buckle
    g.roundRect(fx - 1, fy - 12, 5, 5, 1);
    g.fill({ color: crossguardColor });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 6, fy - 9);
    g.lineTo(fx + 8, fy - 9);
    g.stroke({ color: 0x553311, width: 1.5 });
    g.roundRect(fx, fy - 11, 4, 4, 1);
    g.fill({ color: crossguardColor });
  }

  // --- Gauntlet detail on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    // Heavy elbow guard
    g.circle(ex, ey, 7);
    g.fill({ color: armorColor });
    g.circle(ex, ey, 7);
    g.stroke({ color: armorHighlight, width: 1 });
    // Rivet dots on forearm
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx - 3, my, 2);
    g.fill({ color: armorHighlight });
    g.circle(mx + 3, my, 2);
    g.fill({ color: armorHighlight });
  }

  // --- MASSIVE Tower Shield on back arm ---
  if (p.backArm) {
    const sx = p.backArm.handX;
    const sy = p.backArm.handY;
    const shieldW = 58;        // much wider than Arthur's kite shield (48)
    const shieldH = 96;        // much taller too (72)
    const shieldX = sx - shieldW / 2 + 2;
    const shieldY = sy - shieldH * 0.5;

    // Tower shield shape: tall rectangular with slightly rounded top
    // Outline
    g.roundRect(shieldX, shieldY, shieldW, shieldH, 4);
    g.fill({ color: 0x222233 });

    // Shield face (iron/olive drab)
    const inset = 3;
    g.roundRect(shieldX + inset, shieldY + inset, shieldW - inset * 2, shieldH - inset * 2, 3);
    g.fill({ color: armorColor });

    // Steel rim highlight — top
    g.moveTo(shieldX + 2, shieldY + 2);
    g.lineTo(shieldX + shieldW - 2, shieldY + 2);
    g.stroke({ color: armorHighlight, width: 2 });

    // Steel rim highlight — bottom
    g.moveTo(shieldX + 2, shieldY + shieldH - 2);
    g.lineTo(shieldX + shieldW - 2, shieldY + shieldH - 2);
    g.stroke({ color: armorHighlight, width: 1.5 });

    // Side rims
    g.moveTo(shieldX + 1, shieldY + 4);
    g.lineTo(shieldX + 1, shieldY + shieldH - 4);
    g.stroke({ color: armorHighlight, width: 1.5 });
    g.moveTo(shieldX + shieldW - 1, shieldY + 4);
    g.lineTo(shieldX + shieldW - 1, shieldY + shieldH - 4);
    g.stroke({ color: armorHighlight, width: 1.5 });

    // Horizontal reinforcement bands
    const bandY1 = shieldY + shieldH * 0.25;
    const bandY2 = shieldY + shieldH * 0.5;
    const bandY3 = shieldY + shieldH * 0.75;
    g.moveTo(shieldX + inset, bandY1);
    g.lineTo(shieldX + shieldW - inset, bandY1);
    g.stroke({ color: armorShadow, width: 2 });
    g.moveTo(shieldX + inset, bandY2);
    g.lineTo(shieldX + shieldW - inset, bandY2);
    g.stroke({ color: armorShadow, width: 2 });
    g.moveTo(shieldX + inset, bandY3);
    g.lineTo(shieldX + shieldW - inset, bandY3);
    g.stroke({ color: armorShadow, width: 2 });

    // Central vertical reinforcement
    g.moveTo(shieldX + shieldW / 2, shieldY + inset + 2);
    g.lineTo(shieldX + shieldW / 2, shieldY + shieldH - inset - 2);
    g.stroke({ color: armorShadow, width: 2.5 });

    // Shield boss (central rivet/umbo)
    const cx = shieldX + shieldW / 2;
    const cy = shieldY + shieldH * 0.4;
    g.circle(cx, cy, 8);
    g.fill({ color: 0x222233 });
    g.circle(cx, cy, 7);
    g.fill({ color: armorHighlight });
    g.circle(cx, cy, 4);
    g.fill({ color: armorColor });
    g.circle(cx, cy, 2);
    g.fill({ color: armorHighlight });

    // Olive drab accent — small emblem below boss
    g.roundRect(cx - 8, cy + 14, 16, 12, 2);
    g.fill({ color: accentColor, alpha: 0.6 });

    // Corner rivets (8 total — 2 per corner area)
    const rivetInset = 8;
    g.circle(shieldX + rivetInset, shieldY + rivetInset, 2.5);
    g.fill({ color: armorHighlight });
    g.circle(shieldX + shieldW - rivetInset, shieldY + rivetInset, 2.5);
    g.fill({ color: armorHighlight });
    g.circle(shieldX + rivetInset, shieldY + shieldH - rivetInset, 2.5);
    g.fill({ color: armorHighlight });
    g.circle(shieldX + shieldW - rivetInset, shieldY + shieldH - rivetInset, 2.5);
    g.fill({ color: armorHighlight });
    // Mid-edge rivets
    g.circle(shieldX + rivetInset, bandY2, 2);
    g.fill({ color: armorHighlight });
    g.circle(shieldX + shieldW - rivetInset, bandY2, 2);
    g.fill({ color: armorHighlight });
  }

  // --- Short Sword in front arm ---
  if (p.frontArm) {
    const hx = p.frontArm.handX;
    const hy = p.frontArm.handY;
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;

    // Blade direction: extend from hand away from elbow
    const dx = hx - ex;
    const dy = hy - ey;
    const len = Math.sqrt(dx * dx + dy * dy);
    const bladeLen = 36;       // shorter than Arthur's 50
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

    // Blade fuller (groove)
    const fullerStart = 0.15;
    const fullerEnd = 0.8;
    g.moveTo(hx + nx * bladeLen * fullerStart, hy + ny * bladeLen * fullerStart);
    g.lineTo(hx + nx * bladeLen * fullerEnd, hy + ny * bladeLen * fullerEnd);
    g.stroke({ color: armorShadow, width: 1.5, cap: "round", alpha: 0.4 });

    // Blade highlight
    g.moveTo(hx + ny * 1, hy - nx * 1);
    g.lineTo(tipX + ny * 1, tipY - nx * 1);
    g.stroke({ color: 0xddddee, width: 1.5, cap: "round" });

    // Crossguard (perpendicular, wider and sturdier for a short sword)
    const guardLen = 10;
    const gx1 = hx + ny * guardLen;
    const gy1 = hy - nx * guardLen;
    const gx2 = hx - ny * guardLen;
    const gy2 = hy + nx * guardLen;

    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: 0x222233, width: 7, cap: "round" });
    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: crossguardColor, width: 5, cap: "round" });

    // Crossguard end caps
    g.circle(gx1, gy1, 3);
    g.fill({ color: crossguardColor });
    g.circle(gx2, gy2, 3);
    g.fill({ color: crossguardColor });

    // Pommel (sturdy iron ball)
    const pommelX = hx - nx * 7;
    const pommelY = hy - ny * 7;
    g.circle(pommelX, pommelY, 5);
    g.fill({ color: 0x222233 });
    g.circle(pommelX, pommelY, 4);
    g.fill({ color: crossguardColor });
  }

  // --- Helm detail (flat-topped great helm, no plume — practical) ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;

    // Flat-top helm bar across visor
    g.moveTo(hx - hr * 0.6, hy + 2);
    g.lineTo(hx + hr * 0.6, hy + 2);
    g.stroke({ color: armorColor, width: 3 });

    // Visor slit
    g.moveTo(hx - hr * 0.4, hy + 1);
    g.lineTo(hx + hr * 0.4, hy + 1);
    g.stroke({ color: 0x111122, width: 2 });

    // Helm crown reinforcement
    g.moveTo(hx - hr * 0.5, hy - hr + 6);
    g.lineTo(hx + hr * 0.5, hy - hr + 6);
    g.stroke({ color: armorHighlight, width: 1.5, alpha: 0.5 });
  }
}
