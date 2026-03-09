// ---------------------------------------------------------------------------
// Bors – The Steadfast
// Skeleton pose data for the duel fighting game.
// Stocky axe-wielding knight. Heavy chain mail, battle axe, wide sturdy stance.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const BORS_PALETTE: FighterPalette = {
  skin: 0xcc9977,
  body: 0x667766,        // dark green chain mail
  pants: 0x445544,        // dark green trousers
  shoes: 0x443322,        // dark brown boots
  hair: 0x554422,         // brown hair
  eyes: 0x667755,
  outline: 0x222222,
  gloves: 0x667766,       // mail gauntlets
  belt: 0x664422,         // leather belt
  accent: 0x556644,       // green accent
  weapon: 0x888899,       // axe blade steel
  weaponAccent: 0x664422, // axe handle wood
};

// ---- Poses -----------------------------------------------------------------
// Bors is stocky and wide. Torso is broader, stance is wider than Arthur.
// Base standing: head ~-180, torso y ~-125, torso width 62/50, legs wider apart.

export const BORS_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, subtle breathing, wide sturdy stance, axe at rest) --
  idle: [
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),         // front: axe hand at rest
      arm(-30, -165, -42, -142, -38, -118),       // back: arm at side
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
    pose(
      head(4, -179),
      torso(0, -124, 62, 50, 88),
      arm(30, -164, 42, -139, 35, -114),
      arm(-30, -164, -42, -141, -38, -117),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
    pose(
      head(4, -178),
      torso(0, -123, 62, 50, 88),
      arm(30, -163, 42, -138, 35, -113),
      arm(-30, -163, -42, -140, -38, -116),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
    pose(
      head(4, -179),
      torso(0, -124, 62, 50, 88),
      arm(30, -164, 42, -139, 35, -114),
      arm(-30, -164, -42, -141, -38, -117),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- walk_forward (4 frames, heavy lumbering stride) --
  walk_forward: [
    pose(
      head(6, -180),
      torso(2, -125, 62, 50, 88),
      arm(32, -165, 44, -142, 40, -118),
      arm(-28, -165, -38, -140, -34, -116),
      leg(18, -80, 30, -44, 32, 0),
      leg(-18, -80, -10, -40, -22, 0),
    ),
    pose(
      head(8, -179),
      torso(4, -124, 62, 50, 88),
      arm(34, -164, 46, -140, 42, -115),
      arm(-26, -164, -36, -138, -30, -114),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -18, -42, -18, 0),
    ),
    pose(
      head(6, -180),
      torso(2, -125, 62, 50, 88),
      arm(32, -165, 42, -142, 38, -118),
      arm(-28, -165, -40, -140, -36, -116),
      leg(18, -80, -4, -40, -18, 0),
      leg(-18, -80, 26, -44, 28, 0),
    ),
    pose(
      head(4, -179),
      torso(0, -124, 62, 50, 88),
      arm(30, -164, 40, -140, 36, -115),
      arm(-30, -164, -42, -138, -38, -114),
      leg(18, -80, 18, -42, 18, 0),
      leg(-18, -80, -18, -42, -18, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious backward step) --
  walk_back: [
    pose(
      head(2, -180),
      torso(-2, -125, 62, 50, 88),
      arm(28, -165, 38, -145, 30, -125),
      arm(-32, -165, -44, -142, -40, -120),
      leg(18, -80, 10, -44, -4, 0),
      leg(-18, -80, -28, -40, -30, 0),
    ),
    pose(
      head(0, -179),
      torso(-4, -124, 62, 50, 88),
      arm(26, -164, 36, -144, 28, -124),
      arm(-34, -164, -46, -140, -42, -118),
      leg(18, -80, 18, -42, 18, 0),
      leg(-18, -80, -18, -42, -18, 0),
    ),
    pose(
      head(2, -180),
      torso(-2, -125, 62, 50, 88),
      arm(28, -165, 38, -145, 30, -125),
      arm(-32, -165, -44, -142, -40, -120),
      leg(18, -80, 28, -40, 30, 0),
      leg(-18, -80, -10, -44, 4, 0),
    ),
    pose(
      head(0, -179),
      torso(-4, -124, 62, 50, 88),
      arm(26, -164, 36, -144, 28, -124),
      arm(-34, -164, -46, -140, -42, -118),
      leg(18, -80, 18, -42, 18, 0),
      leg(-18, -80, -18, -42, -18, 0),
    ),
  ],

  // -- crouch (1 frame, low guard with axe ready) --
  crouch: [
    pose(
      head(3, -125),
      torso(0, -80, 64, 52, 68),
      arm(30, -110, 38, -85, 34, -65),
      arm(-30, -110, -38, -90, -34, -70),
      leg(20, -48, 30, -24, 24, 0),
      leg(-20, -48, -30, -24, -24, 0),
    ),
  ],

  // -- jump (2 frames: leap up, peak with axe raised) --
  jump: [
    pose(
      head(4, -186),
      torso(0, -132, 62, 50, 86),
      arm(30, -172, 45, -162, 52, -180),
      arm(-30, -172, -40, -152, -34, -136),
      leg(18, -88, 24, -64, 22, -44),
      leg(-18, -88, -24, -64, -22, -44),
    ),
    pose(
      head(4, -190),
      torso(0, -136, 62, 50, 86),
      arm(30, -176, 48, -172, 56, -194),
      arm(-30, -176, -42, -156, -36, -140),
      leg(18, -92, 26, -68, 30, -52),
      leg(-18, -92, -22, -62, -26, -48),
    ),
  ],

  // -- light_high: quick handle jab (3 frames) --
  light_high: [
    // startup: pull axe back
    pose(
      head(2, -180),
      torso(-2, -125, 62, 50, 88),
      arm(30, -165, 18, -142, 5, -128),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
    // extended jab: axe handle thrust forward
    pose(
      head(8, -178),
      torso(4, -123, 62, 50, 88, 0.06),
      arm(32, -163, 58, -150, 88, -145),
      arm(-28, -163, -38, -140, -34, -116),
      leg(18, -80, 24, -42, 22, 0),
      leg(-18, -80, -22, -44, -22, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- med_high: horizontal axe chop (3 frames) --
  med_high: [
    // startup: axe drawn back high
    pose(
      head(0, -181),
      torso(-3, -125, 62, 50, 88, -0.08),
      arm(30, -165, 12, -168, -8, -172),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 24, -42, 22, 0),
      leg(-18, -80, -22, -42, -22, 0),
    ),
    // horizontal chop: wide sweeping arc
    pose(
      head(10, -177),
      torso(5, -122, 62, 50, 88, 0.12),
      arm(32, -162, 60, -142, 92, -125),
      arm(-28, -162, -38, -138, -32, -114),
      leg(18, -80, 26, -42, 24, 0),
      leg(-18, -80, -22, -44, -22, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- heavy_high: overhead axe slam (4 frames) --
  heavy_high: [
    // windup: axe raised high overhead
    pose(
      head(0, -182),
      torso(-4, -126, 62, 50, 88, -0.08),
      arm(30, -166, 24, -184, 20, -210),
      arm(-30, -166, -42, -146, -38, -125),
      leg(18, -80, 24, -42, 22, 0),
      leg(-18, -80, -24, -42, -24, 0),
    ),
    // downward strike: axe crashing down
    pose(
      head(8, -176),
      torso(4, -121, 62, 50, 88, 0.14),
      arm(32, -161, 55, -144, 75, -105),
      arm(-28, -161, -36, -138, -30, -112),
      leg(18, -80, 26, -40, 26, 0),
      leg(-18, -80, -20, -44, -22, 0),
    ),
    // impact: axe low, body committed
    pose(
      head(12, -173),
      torso(7, -118, 62, 50, 88, 0.18),
      arm(34, -158, 62, -124, 82, -82),
      arm(-26, -158, -34, -134, -28, -108),
      leg(18, -80, 28, -38, 28, 0),
      leg(-18, -80, -20, -46, -24, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- light_low: boot stomp (3 frames) --
  light_low: [
    // startup: lift leg
    pose(
      head(2, -180),
      torso(-2, -127, 62, 50, 88),
      arm(28, -167, 38, -144, 32, -122),
      arm(-32, -167, -42, -142, -38, -118),
      leg(18, -80, 30, -52, 32, -28),
      leg(-18, -80, -24, -42, -24, 0),
    ),
    // stomp extended
    pose(
      head(0, -179),
      torso(-4, -126, 62, 50, 88, -0.04),
      arm(26, -166, 36, -142, 30, -120),
      arm(-34, -166, -44, -140, -40, -116),
      leg(18, -80, 44, -48, 72, -25),
      leg(-18, -80, -26, -42, -26, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- med_low: low axe sweep (3 frames) --
  med_low: [
    // startup: crouch, wind axe back low
    pose(
      head(2, -170),
      torso(0, -116, 62, 50, 82, 0.08),
      arm(30, -154, 32, -125, 18, -100),
      arm(-30, -154, -40, -132, -36, -110),
      leg(18, -75, 24, -38, 22, 0),
      leg(-18, -75, -22, -38, -22, 0),
    ),
    // low sweep: axe thrust low and forward
    pose(
      head(8, -167),
      torso(5, -112, 62, 50, 82, 0.16),
      arm(32, -150, 58, -105, 88, -75),
      arm(-28, -150, -36, -128, -30, -106),
      leg(18, -75, 26, -36, 24, 0),
      leg(-18, -75, -22, -40, -24, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- heavy_low: ground splitter launcher (4 frames) --
  heavy_low: [
    // windup: deep crouch, wind axe to back
    pose(
      head(0, -148),
      torso(-3, -100, 64, 52, 72, -0.1),
      arm(30, -132, 12, -118, -12, -110),
      arm(-30, -132, -42, -114, -40, -95),
      leg(20, -64, 30, -32, 26, 0),
      leg(-20, -64, -30, -32, -28, 0),
    ),
    // sweep: axe sweeps low across the ground
    pose(
      head(10, -144),
      torso(6, -96, 64, 52, 72, 0.2),
      arm(34, -128, 60, -80, 88, -16),
      arm(-26, -128, -36, -108, -28, -88),
      leg(20, -64, 34, -28, 32, 0),
      leg(-20, -64, -28, -36, -30, 0),
    ),
    // hold: axe extended at ground level
    pose(
      head(12, -142),
      torso(8, -94, 64, 52, 72, 0.22),
      arm(36, -126, 64, -76, 92, -10),
      arm(-24, -126, -34, -106, -26, -86),
      leg(20, -64, 36, -26, 34, 0),
      leg(-20, -64, -28, -36, -30, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- axe_lunge: lunging forward chop (3 frames) --
  axe_lunge: [
    // startup: pull axe way back, lean back
    pose(
      head(-2, -181),
      torso(-5, -126, 62, 50, 88, -0.12),
      arm(28, -166, 8, -150, -12, -140),
      arm(-32, -166, -44, -144, -40, -125),
      leg(18, -80, 22, -42, 18, 0),
      leg(-18, -80, -26, -42, -28, 0),
    ),
    // lunge: body drives forward, axe fully extended
    pose(
      head(18, -175),
      torso(12, -120, 62, 50, 88, 0.16),
      arm(38, -160, 68, -142, 98, -132),
      arm(-18, -160, -30, -136, -22, -112),
      leg(18, -80, 34, -44, 40, 0),
      leg(-18, -80, -10, -40, -12, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- overhead_axe: big overhead slam (4 frames) --
  overhead_axe: [
    // big windup: axe held high behind head
    pose(
      head(-2, -182),
      torso(-5, -127, 62, 50, 88, -0.1),
      arm(28, -167, 18, -186, 10, -215),
      arm(-32, -167, -44, -150, -42, -130),
      leg(18, -80, 24, -42, 22, 0),
      leg(-18, -80, -24, -42, -26, 0),
    ),
    // overhead slam: axe crashing down
    pose(
      head(10, -175),
      torso(5, -120, 62, 50, 88, 0.18),
      arm(34, -160, 58, -135, 72, -90),
      arm(-26, -160, -34, -134, -26, -108),
      leg(18, -80, 28, -40, 28, 0),
      leg(-18, -80, -20, -46, -24, 0),
    ),
    // impact hold: axe slammed down hard
    pose(
      head(14, -170),
      torso(8, -115, 62, 50, 88, 0.24),
      arm(36, -155, 64, -110, 80, -55),
      arm(-24, -155, -32, -130, -24, -104),
      leg(18, -80, 30, -38, 30, 0),
      leg(-18, -80, -20, -48, -26, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- low_chop: low sweeping axe (3 frames) --
  low_chop: [
    // startup: drop low
    pose(
      head(2, -142),
      torso(0, -95, 64, 52, 70, 0.06),
      arm(30, -126, 22, -104, 8, -94),
      arm(-30, -126, -40, -108, -36, -88),
      leg(20, -60, 32, -30, 28, 0),
      leg(-20, -60, -30, -32, -30, 0),
    ),
    // ground chop: axe sweeps at ankle height
    pose(
      head(12, -138),
      torso(6, -90, 64, 52, 70, 0.24),
      arm(34, -122, 62, -65, 92, -6),
      arm(-26, -122, -34, -104, -26, -84),
      leg(20, -60, 36, -26, 36, 0),
      leg(-20, -60, -28, -34, -32, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- rising_axe: anti-air upward axe swing (4 frames) --
  rising_axe: [
    // crouch startup: coil low
    pose(
      head(2, -142),
      torso(0, -95, 64, 52, 70),
      arm(30, -126, 32, -102, 24, -84),
      arm(-30, -126, -40, -108, -36, -88),
      leg(20, -60, 32, -30, 28, 0),
      leg(-20, -60, -30, -32, -30, 0),
    ),
    // upward slash: rising, axe sweeping up
    pose(
      head(8, -170),
      torso(4, -116, 62, 50, 84, 0.08),
      arm(32, -156, 52, -150, 66, -180),
      arm(-28, -156, -38, -134, -32, -112),
      leg(18, -75, 24, -40, 22, 0),
      leg(-18, -75, -22, -40, -22, 0),
    ),
    // peak: airborne, axe high
    pose(
      head(6, -195),
      torso(2, -142, 62, 50, 84, 0.05),
      arm(32, -182, 44, -192, 50, -218),
      arm(-28, -182, -40, -164, -34, -146),
      leg(18, -98, 24, -76, 22, -56),
      leg(-18, -98, -22, -72, -24, -52),
    ),
    // recovery: landing
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- grab: bear hug (3 frames) --
  grab: [
    // reach: arms extend forward to grab
    pose(
      head(8, -178),
      torso(4, -123, 62, 50, 88, 0.06),
      arm(32, -163, 52, -150, 70, -140, true),
      arm(-28, -163, -12, -145, 18, -135, true),
      leg(18, -80, 26, -42, 26, 0),
      leg(-18, -80, -20, -44, -22, 0),
    ),
    // crush: arms wrap around opponent
    pose(
      head(12, -176),
      torso(8, -121, 62, 50, 88, 0.12),
      arm(34, -161, 54, -148, 62, -130),
      arm(-26, -161, 8, -142, 38, -128),
      leg(18, -80, 28, -40, 28, 0),
      leg(-18, -80, -20, -46, -24, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- bull_charge (3 frames: wind up, charge, recovery) --
  bull_charge: [
    // crouch behind shoulder
    pose(
      head(0, -175),
      torso(-3, -122, 62, 50, 88, -0.1),
      arm(28, -162, 32, -144, 26, -128),
      arm(-32, -162, -12, -146, 12, -136),
      leg(18, -80, 24, -42, 22, 0),
      leg(-18, -80, -24, -42, -26, 0),
    ),
    // lunging forward with shoulder
    pose(
      head(16, -172),
      torso(12, -118, 62, 50, 88, 0.16),
      arm(38, -158, 52, -142, 58, -126),
      arm(-18, -158, 14, -142, 42, -132),
      leg(18, -80, 34, -44, 40, 0),
      leg(-18, -80, -10, -40, -12, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- steadfast_blow (4 frames: wind up, swing, impact, recovery) --
  steadfast_blow: [
    // deep wind-up: axe way back, weight on back leg
    pose(
      head(-4, -182),
      torso(-6, -127, 62, 50, 88, -0.14),
      arm(26, -167, 6, -170, -14, -178),
      arm(-34, -167, -46, -148, -44, -128),
      leg(18, -80, 16, -44, 12, 0),
      leg(-18, -80, -28, -42, -30, 0),
    ),
    // massive swing: huge axe arc
    pose(
      head(12, -174),
      torso(8, -119, 62, 50, 88, 0.18),
      arm(36, -159, 62, -140, 90, -110),
      arm(-24, -159, -30, -134, -22, -108),
      leg(18, -80, 30, -40, 32, 0),
      leg(-18, -80, -16, -46, -18, 0),
    ),
    // impact: full extension, body committed
    pose(
      head(16, -170),
      torso(10, -115, 62, 50, 88, 0.22),
      arm(38, -155, 66, -120, 92, -80),
      arm(-22, -155, -28, -130, -20, -104),
      leg(18, -80, 32, -38, 34, 0),
      leg(-18, -80, -18, -48, -22, 0),
    ),
    // recovery
    pose(
      head(4, -180),
      torso(0, -125, 62, 50, 88),
      arm(30, -165, 42, -140, 35, -115),
      arm(-30, -165, -42, -142, -38, -118),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
  ],

  // -- whirlwind_axe: wide spinning axe (not listed in poses spec but needed as special) --
  // (reuse steadfast_blow pattern if not explicitly in pose list)

  // -- block_stand (1 frame: axe held defensively in front) --
  block_stand: [
    pose(
      head(0, -181),
      torso(-3, -126, 62, 50, 88, -0.05),
      arm(28, -166, 32, -150, 26, -135),
      arm(-32, -166, -14, -150, 6, -140),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -24, -42, -24, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched behind axe) --
  block_crouch: [
    pose(
      head(-2, -126),
      torso(-4, -82, 64, 54, 68, -0.06),
      arm(28, -112, 30, -92, 24, -74),
      arm(-32, -112, -10, -94, 10, -86),
      leg(20, -50, 30, -24, 24, 0),
      leg(-20, -50, -30, -24, -26, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-8, -176),
      torso(-6, -122, 62, 50, 88, -0.12),
      arm(24, -162, 10, -142, -4, -124),
      arm(-36, -162, -50, -138, -54, -114),
      leg(18, -80, 12, -42, 6, 0),
      leg(-18, -80, -26, -44, -30, 0),
    ),
    pose(
      head(-12, -174),
      torso(-10, -120, 62, 50, 88, -0.18),
      arm(20, -160, 4, -138, -10, -122),
      arm(-40, -160, -54, -136, -60, -112),
      leg(18, -80, 8, -40, 2, 0),
      leg(-18, -80, -30, -46, -34, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    // falling
    pose(
      head(-15, -134),
      torso(-12, -90, 62, 50, 78, -0.35),
      arm(16, -124, -2, -104, -18, -90),
      arm(-40, -124, -54, -102, -60, -82),
      leg(18, -52, 22, -26, 26, 0),
      leg(-18, -52, -26, -28, -32, 0),
    ),
    // lying on ground
    pose(
      head(-52, -18),
      torso(-26, -16, 62, 50, 88, -1.5),
      arm(-4, -32, -24, -20, -44, -12),
      arm(-48, -8, -62, -4, -72, 0),
      leg(18, -8, 34, -4, 48, 0),
      leg(-18, -8, -8, -4, 6, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground) --
  get_up: [
    // pushing up
    pose(
      head(-18, -85),
      torso(-12, -56, 62, 50, 68, -0.4),
      arm(12, -84, 22, -50, 26, -26),
      arm(-36, -84, -46, -50, -44, -24),
      leg(18, -22, 26, -10, 24, 0),
      leg(-18, -22, -24, -12, -22, 0),
    ),
    // nearly standing
    pose(
      head(2, -165),
      torso(-2, -112, 62, 50, 82, -0.08),
      arm(28, -150, 36, -128, 30, -108),
      arm(-32, -150, -42, -132, -38, -112),
      leg(18, -70, 22, -38, 20, 0),
      leg(-18, -70, -22, -38, -20, 0),
    ),
  ],

  // -- victory (2 frames: axe raised triumphantly) --
  victory: [
    // raise axe
    pose(
      head(4, -185),
      torso(0, -127, 62, 50, 88),
      arm(30, -167, 38, -186, 42, -215),
      arm(-30, -167, -40, -145, -34, -125),
      leg(18, -80, 22, -42, 20, 0),
      leg(-18, -80, -22, -42, -20, 0),
    ),
    // triumphant hold
    pose(
      head(4, -187),
      torso(0, -129, 62, 50, 88),
      arm(30, -169, 36, -192, 40, -222),
      arm(-30, -169, -42, -150, -36, -130),
      leg(18, -80, 24, -42, 22, 0),
      leg(-18, -80, -24, -42, -22, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed on the ground) --
  defeat: [
    pose(
      head(-56, -16),
      torso(-28, -14, 62, 50, 88, -1.55),
      arm(-6, -30, -26, -16, -48, -8),
      arm(-50, -6, -66, -2, -76, 2),
      leg(18, -6, 36, -2, 50, 0),
      leg(-18, -6, -6, -2, 8, 0),
    ),
  ],
};

// ---- Draw extras (battle axe, chain mail details) ---------------------------

/**
 * Draw Bors's front extras: battle axe in front hand, armor/mail details.
 */
export function drawBorsExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const weaponColor = pal.weapon ?? 0x888899;
  const handleColor = pal.weaponAccent ?? 0x664422;
  const mailColor = pal.body ?? 0x667766;
  const mailHighlight = 0x889988;
  const mailShadow = 0x445544;
  const accentColor = pal.accent ?? 0x556644;

  // --- Chain mail detail overlays on torso ---
  if (p.torso) {
    const t = p.torso;
    const lsx = t.x - t.topWidth / 2 - 2;
    const rsx = t.x + t.topWidth / 2 + 2;
    const sy = t.y - t.height / 2 - 2;

    // Shoulder mail guards (rounded, less ornate than plate)
    g.roundRect(lsx - 6, sy - 2, 16, 12, 5);
    g.fill({ color: mailColor });
    g.roundRect(lsx - 6, sy - 2, 16, 12, 5);
    g.stroke({ color: mailHighlight, width: 1 });

    g.roundRect(rsx - 8, sy - 2, 16, 12, 5);
    g.fill({ color: mailColor });
    g.roundRect(rsx - 8, sy - 2, 16, 12, 5);
    g.stroke({ color: mailHighlight, width: 1 });

    // Chain mail pattern on chest (horizontal lines representing rings)
    const chestTop = t.y - t.height / 2 + 6;
    const chestBot = t.y + t.height / 2 - 8;
    for (let row = chestTop; row < chestBot; row += 6) {
      g.moveTo(t.x - t.topWidth / 3, row);
      g.lineTo(t.x + t.topWidth / 3, row);
      g.stroke({ color: mailShadow, width: 0.8, alpha: 0.35 });
    }

    // Belt across waist
    const beltY = t.y + t.height / 2 - 4;
    g.moveTo(t.x - t.bottomWidth / 2 + 2, beltY);
    g.lineTo(t.x + t.bottomWidth / 2 - 2, beltY);
    g.stroke({ color: handleColor, width: 4 });
    // Belt buckle
    g.roundRect(t.x - 4, beltY - 3, 8, 6, 1);
    g.fill({ color: 0xbbaa66 });
  }

  // --- Knee guards on legs ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 9, ky - 6, 18, 12, 4);
    g.fill({ color: mailColor });
    g.roundRect(kx - 9, ky - 6, 18, 12, 4);
    g.stroke({ color: mailHighlight, width: 1 });
  }
  if (p.backLeg) {
    const kx = p.backLeg.kneeX;
    const ky = p.backLeg.kneeY;
    g.roundRect(kx - 8, ky - 5, 16, 10, 3);
    g.fill({ color: mailShadow });
    g.roundRect(kx - 8, ky - 5, 16, 10, 3);
    g.stroke({ color: mailColor, width: 1 });
  }

  // --- Boot straps ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    g.moveTo(fx - 7, fy - 8);
    g.lineTo(fx + 9, fy - 8);
    g.stroke({ color: 0x332211, width: 2 });
    g.moveTo(fx - 6, fy - 14);
    g.lineTo(fx + 8, fy - 14);
    g.stroke({ color: 0x332211, width: 1.5 });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 6, fy - 7);
    g.lineTo(fx + 8, fy - 7);
    g.stroke({ color: 0x332211, width: 1.5 });
  }

  // --- Gauntlet detail on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    // Elbow mail guard
    g.circle(ex, ey, 7);
    g.fill({ color: mailColor });
    g.circle(ex, ey, 7);
    g.stroke({ color: mailHighlight, width: 1 });
    // Forearm bracer rivet
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx, my, 2.5);
    g.fill({ color: mailHighlight });
  }

  // --- Battle Axe in front arm ---
  if (p.frontArm) {
    const hx = p.frontArm.handX;
    const hy = p.frontArm.handY;
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;

    // Handle direction: extend from hand away from elbow
    const dx = hx - ex;
    const dy = hy - ey;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len > 0 ? dx / len : 1;
    const ny = len > 0 ? dy / len : 0;

    // Perpendicular for blade width
    const px = -ny;
    const py = nx;

    const handleLen = 52;
    const tipX = hx + nx * handleLen;
    const tipY = hy + ny * handleLen;

    // Handle outline
    g.moveTo(hx - nx * 5, hy - ny * 5);
    g.lineTo(tipX, tipY);
    g.stroke({ color: 0x222222, width: 8, cap: "round" });

    // Handle fill (wooden)
    g.moveTo(hx - nx * 5, hy - ny * 5);
    g.lineTo(tipX, tipY);
    g.stroke({ color: handleColor, width: 6, cap: "round" });

    // Handle wood grain detail
    const grainStart = 0.1;
    const grainEnd = 0.7;
    g.moveTo(
      hx + nx * handleLen * grainStart + px * 1,
      hy + ny * handleLen * grainStart + py * 1,
    );
    g.lineTo(
      hx + nx * handleLen * grainEnd + px * 1,
      hy + ny * handleLen * grainEnd + py * 1,
    );
    g.stroke({ color: 0x553311, width: 1, cap: "round", alpha: 0.4 });

    // Axe head position (near the tip of the handle)
    const bladeBaseX = hx + nx * handleLen * 0.72;
    const bladeBaseY = hy + ny * handleLen * 0.72;
    const bladeTipX = hx + nx * handleLen * 0.95;
    const bladeTipY = hy + ny * handleLen * 0.95;

    // Single-headed battle axe blade (practical, not ornate)
    // Blade extends to one side of the handle
    const bladeWidth = 22;
    const bladeExtend = 18;

    // Blade outline
    g.moveTo(bladeBaseX, bladeBaseY);
    g.quadraticCurveTo(
      bladeBaseX + px * bladeWidth + nx * bladeExtend * 0.3,
      bladeBaseY + py * bladeWidth + ny * bladeExtend * 0.3,
      bladeTipX + px * bladeWidth * 0.6,
      bladeTipY + py * bladeWidth * 0.6,
    );
    g.lineTo(bladeTipX, bladeTipY);
    g.lineTo(bladeBaseX + nx * (bladeTipX - bladeBaseX) * 0.15, bladeBaseY + ny * (bladeTipY - bladeBaseY) * 0.15);
    g.closePath();
    g.fill({ color: 0x222222 });

    // Blade face (steel)
    const inset = 2;
    g.moveTo(bladeBaseX + px * inset, bladeBaseY + py * inset);
    g.quadraticCurveTo(
      bladeBaseX + px * (bladeWidth - inset) + nx * bladeExtend * 0.3,
      bladeBaseY + py * (bladeWidth - inset) + ny * bladeExtend * 0.3,
      bladeTipX + px * (bladeWidth * 0.6 - inset),
      bladeTipY + py * (bladeWidth * 0.6 - inset),
    );
    g.lineTo(bladeTipX - nx * inset * 0.5, bladeTipY - ny * inset * 0.5);
    g.closePath();
    g.fill({ color: weaponColor });

    // Blade edge highlight
    g.moveTo(
      bladeBaseX + px * bladeWidth * 0.5,
      bladeBaseY + py * bladeWidth * 0.5,
    );
    g.quadraticCurveTo(
      bladeBaseX + px * bladeWidth * 0.8 + nx * bladeExtend * 0.2,
      bladeBaseY + py * bladeWidth * 0.8 + ny * bladeExtend * 0.2,
      bladeTipX + px * bladeWidth * 0.3,
      bladeTipY + py * bladeWidth * 0.3,
    );
    g.stroke({ color: 0xbbbbcc, width: 1.5, cap: "round", alpha: 0.6 });

    // Metal band where blade meets handle
    const bandX = hx + nx * handleLen * 0.68;
    const bandY = hy + ny * handleLen * 0.68;
    g.moveTo(bandX + px * 6, bandY + py * 6);
    g.lineTo(bandX - px * 6, bandY - py * 6);
    g.stroke({ color: 0x222222, width: 5, cap: "round" });
    g.moveTo(bandX + px * 5, bandY + py * 5);
    g.lineTo(bandX - px * 5, bandY - py * 5);
    g.stroke({ color: 0x999999, width: 3, cap: "round" });

    // Pommel (butt of handle)
    const pommelX = hx - nx * 6;
    const pommelY = hy - ny * 6;
    g.circle(pommelX, pommelY, 5);
    g.fill({ color: 0x222222 });
    g.circle(pommelX, pommelY, 4);
    g.fill({ color: 0x777777 });
  }

  // --- Stubble/beard hint on head ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;
    // Short cropped hair tuft on top
    g.moveTo(hx - 6, hy - hr + 2);
    g.lineTo(hx - 2, hy - hr - 4);
    g.lineTo(hx + 4, hy - hr - 3);
    g.lineTo(hx + 8, hy - hr + 2);
    g.stroke({ color: pal.hair ?? 0x554422, width: 3, cap: "round" });

    // Chin/jaw stubble (small marks below head)
    g.moveTo(hx - 4, hy + hr - 6);
    g.lineTo(hx - 3, hy + hr - 2);
    g.stroke({ color: 0x443322, width: 1.5, alpha: 0.4 });
    g.moveTo(hx + 2, hy + hr - 6);
    g.lineTo(hx + 3, hy + hr - 2);
    g.stroke({ color: 0x443322, width: 1.5, alpha: 0.4 });

    // Green headband accent
    g.moveTo(hx - hr + 4, hy - 4);
    g.quadraticCurveTo(hx, hy - hr + 4, hx + hr - 4, hy - 4);
    g.stroke({ color: accentColor, width: 2.5, alpha: 0.7 });
  }
}
