// ---------------------------------------------------------------------------
// Pellinore – The Questing King
// Skeleton pose data for the duel fighting game.
// Fur-lined leather armor, massive double-headed war axe, beast king build.
// Pellinore is BIGGER and BURLIER than other characters — wider stance,
// lower center of gravity, heavier limbs.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const PELLINORE_PALETTE: FighterPalette = {
  skin: 0xcc9966,
  body: 0x886644,        // fur-lined leather armor
  pants: 0x665533,        // dark brown leather pants
  shoes: 0x443322,        // heavy dark boots
  hair: 0x665533,         // wild brown mane
  eyes: 0x887744,
  outline: 0x222211,
  gloves: 0x886644,       // leather gauntlets
  belt: 0x774411,         // thick leather belt
  accent: 0xaa7733,       // fur trim accent
  weapon: 0x888899,       // axe head iron
  weaponAccent: 0x664422, // axe handle wood
};

// ---- Poses -----------------------------------------------------------------
// Pellinore is heavier/wider: torso is bigger (62x48), stance is lower,
// legs are spread wider than Arthur's standard 14px offset (using 18).

export const PELLINORE_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, wide low stance, axe resting on right shoulder) --
  idle: [
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),         // front: axe arm, hand near shoulder
      arm(-30, -174, -42, -150, -36, -128),       // back arm at side
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
    pose(
      head(4, -187),
      torso(0, -131, 62, 48, 92),
      arm(30, -173, 42, -154, 38, -134),
      arm(-30, -173, -42, -149, -36, -127),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
    pose(
      head(4, -186),
      torso(0, -130, 62, 48, 92),
      arm(30, -172, 42, -153, 38, -133),
      arm(-30, -172, -42, -148, -36, -126),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
    pose(
      head(4, -187),
      torso(0, -131, 62, 48, 92),
      arm(30, -173, 42, -154, 38, -134),
      arm(-30, -173, -42, -149, -36, -127),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- walk_forward (4 frames, lumbering heavy stride) --
  walk_forward: [
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 44, -156, 40, -136),
      arm(-30, -174, -38, -148, -32, -124),
      leg(18, -86, 32, -48, 34, 0),
      leg(-18, -86, -10, -42, -22, 0),
    ),
    pose(
      head(6, -187),
      torso(2, -131, 62, 48, 92),
      arm(32, -173, 46, -152, 42, -132),
      arm(-28, -173, -36, -146, -30, -122),
      leg(18, -86, 22, -44, 18, 0),
      leg(-18, -86, -18, -44, -18, 0),
    ),
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -156, 38, -136),
      arm(-30, -174, -40, -148, -34, -124),
      leg(18, -86, -4, -42, -18, 0),
      leg(-18, -86, 26, -48, 30, 0),
    ),
    pose(
      head(2, -187),
      torso(-2, -131, 62, 48, 92),
      arm(28, -173, 40, -152, 36, -132),
      arm(-32, -173, -42, -146, -38, -122),
      leg(18, -86, 18, -44, 18, 0),
      leg(-18, -86, -18, -44, -18, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious backward step) --
  walk_back: [
    pose(
      head(2, -188),
      torso(-2, -132, 62, 48, 92),
      arm(28, -174, 38, -158, 32, -140),
      arm(-32, -174, -44, -150, -40, -128),
      leg(18, -86, 10, -48, -4, 0),
      leg(-18, -86, -28, -42, -32, 0),
    ),
    pose(
      head(0, -187),
      torso(-4, -131, 62, 48, 92),
      arm(26, -173, 36, -156, 30, -138),
      arm(-34, -173, -46, -148, -42, -126),
      leg(18, -86, 18, -44, 18, 0),
      leg(-18, -86, -18, -44, -18, 0),
    ),
    pose(
      head(2, -188),
      torso(-2, -132, 62, 48, 92),
      arm(28, -174, 38, -158, 32, -140),
      arm(-32, -174, -44, -150, -40, -128),
      leg(18, -86, 28, -42, 32, 0),
      leg(-18, -86, -10, -48, 4, 0),
    ),
    pose(
      head(0, -187),
      torso(-4, -131, 62, 48, 92),
      arm(26, -173, 36, -156, 30, -138),
      arm(-34, -173, -46, -148, -42, -126),
      leg(18, -86, 18, -44, 18, 0),
      leg(-18, -86, -18, -44, -18, 0),
    ),
  ],

  // -- crouch (1 frame, low hunched guard) --
  crouch: [
    pose(
      head(2, -132),
      torso(0, -88, 64, 50, 72),
      arm(30, -118, 38, -95, 34, -75),
      arm(-30, -118, -38, -98, -34, -78),
      leg(20, -52, 32, -26, 26, 0),
      leg(-20, -52, -32, -26, -26, 0),
    ),
  ],

  // -- jump (2 frames: leap up, peak with axe raised) --
  jump: [
    pose(
      head(4, -194),
      torso(0, -140, 62, 48, 90),
      arm(30, -180, 46, -172, 54, -195),
      arm(-30, -180, -40, -160, -34, -145),
      leg(18, -96, 26, -70, 22, -50),
      leg(-18, -96, -26, -70, -22, -50),
    ),
    pose(
      head(4, -198),
      torso(0, -144, 62, 48, 90),
      arm(30, -184, 48, -180, 58, -205),
      arm(-30, -184, -42, -164, -36, -148),
      leg(18, -100, 28, -74, 32, -58),
      leg(-18, -100, -24, -68, -28, -54),
    ),
  ],

  // -- light_high: axe jab (3 frames) --
  light_high: [
    // startup: pull axe back
    pose(
      head(2, -188),
      torso(-2, -132, 62, 48, 92),
      arm(30, -174, 18, -155, 4, -140),
      arm(-30, -174, -40, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
    // strike: axe thrust forward
    pose(
      head(8, -186),
      torso(4, -130, 62, 48, 92, 0.06),
      arm(32, -172, 58, -158, 90, -152),
      arm(-28, -172, -38, -148, -34, -126),
      leg(18, -86, 26, -44, 22, 0),
      leg(-18, -86, -22, -46, -20, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- med_high: horizontal axe swing (3 frames) --
  med_high: [
    // startup: axe drawn back high
    pose(
      head(-2, -189),
      torso(-4, -132, 62, 48, 92, -0.1),
      arm(30, -174, 14, -175, -8, -180),
      arm(-30, -174, -42, -150, -38, -128),
      leg(18, -86, 24, -46, 22, 0),
      leg(-18, -86, -22, -46, -24, 0),
    ),
    // swing: wide arc across
    pose(
      head(10, -185),
      torso(6, -129, 62, 48, 92, 0.12),
      arm(32, -170, 62, -150, 95, -132),
      arm(-28, -170, -38, -148, -32, -124),
      leg(18, -86, 26, -44, 24, 0),
      leg(-18, -86, -22, -46, -22, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- heavy_high: massive overhead axe chop (4 frames) --
  heavy_high: [
    // windup: axe raised high overhead with both hands
    pose(
      head(-2, -190),
      torso(-4, -134, 62, 48, 92, -0.08),
      arm(30, -176, 24, -195, 20, -220),
      arm(-30, -176, -20, -192, -16, -218),
      leg(18, -86, 24, -46, 22, 0),
      leg(-18, -86, -24, -46, -24, 0),
    ),
    // downward strike: axe crashing down
    pose(
      head(10, -183),
      torso(5, -128, 62, 48, 92, 0.14),
      arm(32, -170, 56, -148, 76, -108),
      arm(-28, -170, -18, -146, 8, -108),
      leg(18, -86, 26, -42, 26, 0),
      leg(-18, -86, -20, -48, -22, 0),
    ),
    // impact: axe buried low, body fully committed
    pose(
      head(14, -178),
      torso(8, -122, 62, 48, 92, 0.18),
      arm(34, -164, 64, -125, 84, -80),
      arm(-26, -164, -12, -122, 12, -82),
      leg(18, -86, 28, -40, 28, 0),
      leg(-18, -86, -20, -50, -24, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- light_low: heavy boot kick (3 frames) --
  light_low: [
    // startup: lift leg
    pose(
      head(2, -188),
      torso(-2, -134, 62, 48, 92),
      arm(28, -176, 40, -156, 34, -136),
      arm(-32, -176, -42, -152, -38, -130),
      leg(18, -86, 32, -56, 36, -32),
      leg(-18, -86, -24, -46, -26, 0),
    ),
    // kick extended
    pose(
      head(0, -186),
      torso(-4, -132, 62, 48, 92, -0.05),
      arm(26, -174, 38, -154, 30, -134),
      arm(-34, -174, -44, -150, -40, -128),
      leg(18, -86, 46, -54, 76, -32),
      leg(-18, -86, -26, -44, -28, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- med_low: crouching axe sweep (3 frames) --
  med_low: [
    // startup: crouch, pull axe back
    pose(
      head(2, -178),
      torso(0, -124, 62, 48, 86, 0.08),
      arm(30, -162, 34, -135, 18, -112),
      arm(-30, -162, -40, -140, -36, -118),
      leg(18, -82, 26, -42, 24, 0),
      leg(-18, -82, -24, -42, -22, 0),
    ),
    // low sweep: axe sweeps at leg level
    pose(
      head(8, -175),
      torso(4, -120, 62, 48, 86, 0.16),
      arm(32, -158, 60, -112, 90, -82),
      arm(-28, -158, -36, -138, -30, -116),
      leg(18, -82, 28, -40, 26, 0),
      leg(-18, -82, -24, -44, -24, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- heavy_low: savage launcher (4 frames) --
  heavy_low: [
    // windup: deep crouch, wind axe down and back
    pose(
      head(-2, -158),
      torso(-4, -108, 64, 50, 76, -0.12),
      arm(30, -140, 14, -128, -12, -118),
      arm(-30, -140, -42, -124, -40, -104),
      leg(20, -70, 32, -36, 28, 0),
      leg(-20, -70, -32, -36, -30, 0),
    ),
    // rising axe: sweeping upward from ground
    pose(
      head(10, -165),
      torso(6, -115, 62, 48, 82, 0.14),
      arm(32, -150, 58, -120, 78, -70),
      arm(-28, -150, -36, -128, -30, -108),
      leg(20, -70, 30, -34, 28, 0),
      leg(-20, -70, -28, -38, -28, 0),
    ),
    // hold: axe high after launch
    pose(
      head(12, -172),
      torso(8, -120, 62, 48, 86, 0.16),
      arm(34, -158, 60, -145, 72, -175),
      arm(-26, -158, -34, -136, -28, -116),
      leg(20, -70, 32, -32, 30, 0),
      leg(-20, -70, -28, -38, -30, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- axe_cleave: lunging forward chop (3 frames) --
  axe_cleave: [
    // startup: pull axe back, lean away
    pose(
      head(-4, -189),
      torso(-6, -133, 62, 48, 92, -0.14),
      arm(28, -174, 8, -160, -12, -150),
      arm(-32, -174, -44, -152, -40, -132),
      leg(18, -86, 22, -46, 18, 0),
      leg(-18, -86, -26, -46, -28, 0),
    ),
    // lunge: body drives forward, axe cleaves down
    pose(
      head(18, -182),
      torso(14, -127, 62, 48, 92, 0.16),
      arm(38, -168, 68, -148, 98, -130),
      arm(-18, -168, -30, -144, -22, -120),
      leg(18, -86, 36, -48, 42, 0),
      leg(-18, -86, -10, -42, -12, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- beast_slam: massive overhead slam (4 frames) --
  beast_slam: [
    // windup: axe held high behind head with both arms
    pose(
      head(-4, -191),
      torso(-6, -135, 62, 48, 92, -0.1),
      arm(28, -176, 18, -198, 10, -225),
      arm(-32, -176, -18, -196, -10, -222),
      leg(18, -86, 24, -46, 22, 0),
      leg(-18, -86, -24, -46, -24, 0),
    ),
    // axe crashing down
    pose(
      head(12, -180),
      torso(6, -126, 62, 48, 92, 0.2),
      arm(34, -168, 58, -140, 74, -96),
      arm(-26, -168, -14, -138, 6, -96),
      leg(18, -86, 28, -42, 28, 0),
      leg(-18, -86, -20, -48, -22, 0),
    ),
    // impact: axe smashed into ground, earth shakes
    pose(
      head(16, -174),
      torso(10, -118, 62, 48, 92, 0.24),
      arm(36, -160, 66, -110, 84, -55),
      arm(-24, -160, -10, -108, 14, -56),
      leg(18, -86, 30, -38, 30, 0),
      leg(-18, -86, -20, -52, -26, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- ground_smash: axe into ground, low shockwave (3 frames) --
  ground_smash: [
    // startup: raise axe overhead
    pose(
      head(0, -190),
      torso(-2, -134, 62, 48, 92, -0.06),
      arm(30, -176, 26, -192, 22, -215),
      arm(-30, -176, -24, -190, -20, -212),
      leg(18, -86, 24, -46, 22, 0),
      leg(-18, -86, -24, -46, -24, 0),
    ),
    // slam: axe buries into ground
    pose(
      head(14, -172),
      torso(8, -116, 64, 50, 80, 0.22),
      arm(34, -152, 62, -100, 80, -30),
      arm(-26, -152, -12, -98, 10, -32),
      leg(20, -74, 32, -36, 30, 0),
      leg(-20, -74, -28, -40, -28, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- savage_rise: anti-air rising axe uppercut (4 frames) --
  savage_rise: [
    // crouch startup: coil low
    pose(
      head(2, -150),
      torso(0, -102, 64, 50, 74),
      arm(30, -134, 34, -112, 24, -94),
      arm(-30, -134, -40, -118, -36, -98),
      leg(20, -66, 34, -34, 30, 0),
      leg(-20, -66, -32, -34, -30, 0),
    ),
    // rising: axe sweeping upward
    pose(
      head(8, -178),
      torso(4, -124, 62, 48, 88, 0.1),
      arm(32, -166, 54, -160, 68, -192),
      arm(-28, -166, -38, -144, -32, -122),
      leg(18, -82, 26, -44, 24, 0),
      leg(-18, -82, -22, -44, -22, 0),
    ),
    // peak: airborne, axe high
    pose(
      head(6, -205),
      torso(2, -152, 62, 48, 88, 0.06),
      arm(32, -192, 46, -202, 52, -230),
      arm(-28, -192, -40, -172, -34, -155),
      leg(18, -108, 26, -82, 24, -64),
      leg(-18, -108, -22, -78, -24, -58),
    ),
    // recovery: landing
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- grab: bear crush (3 frames) --
  grab: [
    // reach: both arms extend forward to grab
    pose(
      head(8, -186),
      torso(4, -130, 62, 48, 92, 0.08),
      arm(32, -172, 54, -158, 72, -148, true),
      arm(-28, -172, -12, -154, 18, -144, true),
      leg(18, -86, 26, -44, 24, 0),
      leg(-18, -86, -20, -46, -22, 0),
    ),
    // crush: arms squeeze inward, bear-hugging
    pose(
      head(12, -184),
      torso(8, -128, 62, 48, 92, 0.14),
      arm(34, -170, 48, -152, 55, -138),
      arm(-26, -170, 2, -148, 30, -138),
      leg(18, -86, 28, -42, 26, 0),
      leg(-18, -86, -20, -48, -22, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- stampede: rushing forward bull charge (3 frames) --
  stampede: [
    // crouch behind shoulder, ready to charge
    pose(
      head(-2, -182),
      torso(-4, -130, 62, 48, 92, -0.1),
      arm(28, -172, 34, -154, 28, -138),
      arm(-32, -172, -14, -156, 8, -146),
      leg(18, -86, 24, -46, 22, 0),
      leg(-18, -86, -24, -46, -26, 0),
    ),
    // charging forward, head down, shoulder leading
    pose(
      head(20, -176),
      torso(16, -124, 62, 48, 92, 0.2),
      arm(38, -166, 54, -150, 58, -134),
      arm(-14, -166, 8, -150, 36, -140),
      leg(18, -86, 36, -48, 42, 0),
      leg(-18, -86, -8, -42, -10, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- questing_blow: massive single hit (4 frames) --
  questing_blow: [
    // deep windup: axe behind body, coiled
    pose(
      head(-6, -186),
      torso(-8, -132, 62, 48, 92, -0.16),
      arm(26, -174, 4, -168, -20, -162),
      arm(-34, -174, -46, -155, -50, -138),
      leg(18, -86, 22, -46, 18, 0),
      leg(-18, -86, -26, -46, -28, 0),
    ),
    // swing beginning: body uncoiling
    pose(
      head(6, -184),
      torso(2, -130, 62, 48, 92, 0.06),
      arm(30, -172, 48, -162, 62, -168),
      arm(-30, -172, -38, -150, -32, -130),
      leg(18, -86, 24, -44, 22, 0),
      leg(-18, -86, -22, -46, -22, 0),
    ),
    // full impact: axe swings through with devastating force
    pose(
      head(16, -178),
      torso(10, -124, 62, 48, 92, 0.22),
      arm(36, -166, 68, -138, 100, -118),
      arm(-24, -166, -28, -142, -20, -118),
      leg(18, -86, 30, -40, 30, 0),
      leg(-18, -86, -18, -50, -22, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- block_stand (1 frame: axe held vertically as guard) --
  block_stand: [
    pose(
      head(0, -189),
      torso(-4, -133, 62, 48, 92, -0.06),
      arm(28, -175, 34, -160, 28, -145),
      arm(-32, -175, -14, -158, 6, -148),
      leg(18, -86, 22, -46, 20, 0),
      leg(-18, -86, -24, -46, -24, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched with axe blocking) --
  block_crouch: [
    pose(
      head(-2, -134),
      torso(-4, -90, 64, 50, 72, -0.08),
      arm(28, -120, 32, -100, 26, -84),
      arm(-32, -120, -12, -104, 8, -96),
      leg(20, -55, 32, -28, 26, 0),
      leg(-20, -55, -32, -28, -28, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward, heavy body) --
  hit_stun: [
    pose(
      head(-10, -184),
      torso(-8, -130, 62, 48, 92, -0.14),
      arm(22, -172, 8, -152, -6, -135),
      arm(-36, -172, -50, -148, -54, -124),
      leg(18, -86, 12, -44, 6, 0),
      leg(-18, -86, -26, -46, -30, 0),
    ),
    pose(
      head(-14, -182),
      torso(-12, -128, 62, 48, 92, -0.2),
      arm(18, -170, 2, -150, -14, -132),
      arm(-40, -170, -56, -146, -62, -122),
      leg(18, -86, 8, -42, 2, 0),
      leg(-18, -86, -30, -48, -34, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    // falling
    pose(
      head(-18, -142),
      torso(-14, -97, 62, 48, 82, -0.38),
      arm(14, -132, -6, -112, -22, -97),
      arm(-40, -132, -54, -110, -60, -90),
      leg(18, -57, 24, -30, 28, 0),
      leg(-18, -57, -28, -32, -34, 0),
    ),
    // lying on ground
    pose(
      head(-55, -22),
      torso(-28, -20, 62, 48, 92, -1.5),
      arm(-8, -38, -28, -24, -48, -16),
      arm(-48, -12, -64, -6, -74, 0),
      leg(18, -12, 36, -6, 52, 0),
      leg(-18, -12, -10, -6, 4, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground, heavy push-up) --
  get_up: [
    // pushing up
    pose(
      head(-22, -92),
      torso(-14, -62, 62, 48, 72, -0.42),
      arm(12, -92, 24, -58, 28, -32),
      arm(-36, -92, -48, -58, -44, -30),
      leg(18, -28, 28, -14, 26, 0),
      leg(-18, -28, -26, -16, -24, 0),
    ),
    // nearly standing
    pose(
      head(2, -172),
      torso(-2, -120, 62, 48, 86, -0.1),
      arm(28, -160, 38, -140, 32, -120),
      arm(-32, -160, -42, -142, -38, -122),
      leg(18, -78, 24, -42, 22, 0),
      leg(-18, -78, -24, -42, -22, 0),
    ),
  ],

  // -- victory (2 frames: axe raised overhead triumphantly, roaring) --
  victory: [
    // raise axe
    pose(
      head(4, -192),
      torso(0, -134, 62, 48, 92),
      arm(30, -176, 38, -195, 44, -225),
      arm(-30, -176, -38, -195, -40, -222),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
    // triumphant hold: both arms up, roaring
    pose(
      head(4, -194),
      torso(0, -136, 62, 48, 92),
      arm(30, -178, 40, -200, 46, -232),
      arm(-30, -178, -40, -200, -42, -228),
      leg(18, -86, 26, -45, 22, 0),
      leg(-18, -86, -26, -45, -22, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed on the ground, axe fallen beside) --
  defeat: [
    pose(
      head(-58, -20),
      torso(-30, -18, 62, 48, 92, -1.55),
      arm(-10, -34, -30, -20, -52, -12),
      arm(-50, -10, -68, -4, -78, 2),
      leg(18, -10, 36, -4, 52, 0),
      leg(-18, -10, -8, -4, 6, 0),
    ),
  ],

  // -- wild_swing: wide arc horizontal sweep (3 frames -- uses E+D) --
  wild_swing: [
    // startup: wind axe far back
    pose(
      head(-4, -188),
      torso(-6, -132, 62, 48, 92, -0.14),
      arm(28, -174, 6, -172, -18, -176),
      arm(-32, -174, -44, -152, -42, -130),
      leg(18, -86, 22, -46, 20, 0),
      leg(-18, -86, -24, -46, -26, 0),
    ),
    // wide swing: axe arcs through with massive range
    pose(
      head(12, -182),
      torso(8, -126, 62, 48, 92, 0.18),
      arm(34, -168, 66, -142, 100, -120),
      arm(-26, -168, -34, -144, -26, -120),
      leg(18, -86, 28, -42, 28, 0),
      leg(-18, -86, -20, -48, -22, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 62, 48, 92),
      arm(30, -174, 42, -155, 38, -135),
      arm(-30, -174, -42, -150, -36, -128),
      leg(18, -86, 24, -45, 20, 0),
      leg(-18, -86, -24, -45, -20, 0),
    ),
  ],

  // -- beast_guard: counter stance (1 frame held pose, shown as 3 for anim) --
  beast_guard: [
    // guard stance: axe held vertically, braced
    pose(
      head(0, -190),
      torso(-4, -134, 62, 48, 92, -0.06),
      arm(28, -176, 36, -165, 32, -150),
      arm(-32, -176, -18, -162, 2, -152),
      leg(18, -86, 26, -46, 24, 0),
      leg(-18, -86, -26, -46, -26, 0),
    ),
  ],
};

// ---- Draw extras (massive double-headed war axe, fur-trimmed armor) --------

export function drawPellinoreExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const weaponColor = pal.weapon ?? 0x888899;
  const handleColor = pal.weaponAccent ?? 0x664422;
  const furColor = pal.accent ?? 0xaa7733;
  const leatherColor = pal.body ?? 0x886644;
  const leatherDark = 0x664422;
  const outlineColor = pal.outline ?? 0x222211;

  // --- Fur-trimmed armor details on torso ---
  if (p.torso) {
    const t = p.torso;
    const topY = t.y - t.height / 2;
    const botY = t.y + t.height / 2;

    // Thick shoulder fur pads
    const lsx = t.x - t.topWidth / 2 - 6;
    const rsx = t.x + t.topWidth / 2 + 6;
    const sy = topY - 2;

    // Left fur shoulder pad
    g.roundRect(lsx - 10, sy - 5, 22, 18, 6);
    g.fill({ color: furColor });
    g.roundRect(lsx - 10, sy - 5, 22, 18, 6);
    g.stroke({ color: leatherDark, width: 1 });
    // Fur texture lines
    g.moveTo(lsx - 6, sy + 2);
    g.lineTo(lsx - 2, sy + 8);
    g.stroke({ color: leatherDark, width: 1, alpha: 0.5 });
    g.moveTo(lsx + 2, sy + 1);
    g.lineTo(lsx + 5, sy + 7);
    g.stroke({ color: leatherDark, width: 1, alpha: 0.5 });

    // Right fur shoulder pad
    g.roundRect(rsx - 12, sy - 5, 22, 18, 6);
    g.fill({ color: furColor });
    g.roundRect(rsx - 12, sy - 5, 22, 18, 6);
    g.stroke({ color: leatherDark, width: 1 });
    g.moveTo(rsx - 8, sy + 2);
    g.lineTo(rsx - 4, sy + 8);
    g.stroke({ color: leatherDark, width: 1, alpha: 0.5 });
    g.moveTo(rsx - 2, sy + 1);
    g.lineTo(rsx + 2, sy + 7);
    g.stroke({ color: leatherDark, width: 1, alpha: 0.5 });

    // Leather chest straps (X pattern)
    g.moveTo(t.x - t.topWidth / 3, topY + 6);
    g.lineTo(t.x + t.topWidth / 3, botY - 8);
    g.stroke({ color: leatherDark, width: 3 });
    g.moveTo(t.x + t.topWidth / 3, topY + 6);
    g.lineTo(t.x - t.topWidth / 3, botY - 8);
    g.stroke({ color: leatherDark, width: 3 });

    // Center buckle where straps cross
    const cx = t.x;
    const cy = t.y;
    g.roundRect(cx - 5, cy - 5, 10, 10, 2);
    g.fill({ color: 0x996633 });
    g.roundRect(cx - 5, cy - 5, 10, 10, 2);
    g.stroke({ color: outlineColor, width: 1 });

    // Fur collar trim along top of torso
    g.moveTo(t.x - t.topWidth / 2 + 2, topY + 2);
    g.quadraticCurveTo(t.x - t.topWidth / 4, topY - 4, t.x, topY + 1);
    g.quadraticCurveTo(t.x + t.topWidth / 4, topY - 4, t.x + t.topWidth / 2 - 2, topY + 2);
    g.stroke({ color: furColor, width: 4 });
  }

  // --- Thick leather belt with large buckle ---
  if (p.torso) {
    const t = p.torso;
    const beltY = t.y + t.height / 2 - 4;
    const beltW = t.topWidth * 0.9;
    g.roundRect(t.x - beltW / 2, beltY - 4, beltW, 8, 2);
    g.fill({ color: pal.belt ?? 0x774411 });
    g.roundRect(t.x - beltW / 2, beltY - 4, beltW, 8, 2);
    g.stroke({ color: outlineColor, width: 1 });
    // Belt buckle
    g.roundRect(t.x - 6, beltY - 5, 12, 10, 2);
    g.fill({ color: 0xbb8833 });
    g.roundRect(t.x - 6, beltY - 5, 12, 10, 2);
    g.stroke({ color: outlineColor, width: 1 });
  }

  // --- Knee guards (leather, not plate) ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 9, ky - 7, 18, 14, 4);
    g.fill({ color: leatherColor });
    g.roundRect(kx - 9, ky - 7, 18, 14, 4);
    g.stroke({ color: leatherDark, width: 1 });
  }
  if (p.backLeg) {
    const kx = p.backLeg.kneeX;
    const ky = p.backLeg.kneeY;
    g.roundRect(kx - 8, ky - 6, 16, 12, 3);
    g.fill({ color: leatherDark });
    g.roundRect(kx - 8, ky - 6, 16, 12, 3);
    g.stroke({ color: leatherColor, width: 1 });
  }

  // --- Heavy boot straps ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    g.moveTo(fx - 7, fy - 9);
    g.lineTo(fx + 9, fy - 9);
    g.stroke({ color: leatherDark, width: 2 });
    g.moveTo(fx - 6, fy - 14);
    g.lineTo(fx + 8, fy - 14);
    g.stroke({ color: leatherDark, width: 2 });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 6, fy - 8);
    g.lineTo(fx + 8, fy - 8);
    g.stroke({ color: leatherDark, width: 1.5 });
    g.moveTo(fx - 5, fy - 13);
    g.lineTo(fx + 7, fy - 13);
    g.stroke({ color: leatherDark, width: 1.5 });
  }

  // --- Leather arm wraps / gauntlet detail ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    g.roundRect(ex - 7, ey - 6, 14, 12, 4);
    g.fill({ color: leatherColor });
    g.roundRect(ex - 7, ey - 6, 14, 12, 4);
    g.stroke({ color: leatherDark, width: 1 });
    // Wrist wrap
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx, my, 3);
    g.fill({ color: leatherDark });
  }

  // --- MASSIVE DOUBLE-HEADED WAR AXE in front arm ---
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

    // Perpendicular for axe head width
    const px = -ny;
    const py = nx;

    const handleLen = 55;
    const tipX = hx + nx * handleLen;
    const tipY = hy + ny * handleLen;

    // --- Handle (thick wooden shaft) ---
    // Handle outline
    g.moveTo(hx - nx * 8, hy - ny * 8);
    g.lineTo(tipX, tipY);
    g.stroke({ color: outlineColor, width: 9, cap: "round" });

    // Handle fill
    g.moveTo(hx - nx * 8, hy - ny * 8);
    g.lineTo(tipX, tipY);
    g.stroke({ color: handleColor, width: 7, cap: "round" });

    // Handle wood grain
    const grainStart = 0.1;
    const grainEnd = 0.9;
    g.moveTo(
      hx + nx * handleLen * grainStart + px * 1,
      hy + ny * handleLen * grainStart + py * 1,
    );
    g.lineTo(
      hx + nx * handleLen * grainEnd + px * 1,
      hy + ny * handleLen * grainEnd + py * 1,
    );
    g.stroke({ color: 0x553311, width: 1, alpha: 0.5 });

    // --- Double axe head (two crescents, one on each side of the shaft tip) ---
    const headPos = 0.75; // position along handle where axe head sits
    const axX = hx + nx * handleLen * headPos;
    const axY = hy + ny * handleLen * headPos;
    const headSize = 22;

    // Axe head side 1 (right/positive perpendicular)
    const h1cx = axX + px * (headSize * 0.6);
    const h1cy = axY + py * (headSize * 0.6);

    g.moveTo(axX + nx * headSize * 0.5, axY + ny * headSize * 0.5);
    g.quadraticCurveTo(
      h1cx + nx * headSize * 0.3, h1cy + ny * headSize * 0.3,
      h1cx, h1cy,
    );
    g.quadraticCurveTo(
      h1cx - nx * headSize * 0.3, h1cy - ny * headSize * 0.3,
      axX - nx * headSize * 0.5, axY - ny * headSize * 0.5,
    );
    g.closePath();
    g.fill({ color: outlineColor });

    // Inner fill side 1
    g.moveTo(axX + nx * headSize * 0.4, axY + ny * headSize * 0.4);
    g.quadraticCurveTo(
      h1cx + nx * headSize * 0.2 - px * 2, h1cy + ny * headSize * 0.2 - py * 2,
      h1cx - px * 2, h1cy - py * 2,
    );
    g.quadraticCurveTo(
      h1cx - nx * headSize * 0.2 - px * 2, h1cy - ny * headSize * 0.2 - py * 2,
      axX - nx * headSize * 0.4, axY - ny * headSize * 0.4,
    );
    g.closePath();
    g.fill({ color: weaponColor });

    // Axe head side 2 (left/negative perpendicular)
    const h2cx = axX - px * (headSize * 0.6);
    const h2cy = axY - py * (headSize * 0.6);

    g.moveTo(axX + nx * headSize * 0.5, axY + ny * headSize * 0.5);
    g.quadraticCurveTo(
      h2cx + nx * headSize * 0.3, h2cy + ny * headSize * 0.3,
      h2cx, h2cy,
    );
    g.quadraticCurveTo(
      h2cx - nx * headSize * 0.3, h2cy - ny * headSize * 0.3,
      axX - nx * headSize * 0.5, axY - ny * headSize * 0.5,
    );
    g.closePath();
    g.fill({ color: outlineColor });

    // Inner fill side 2
    g.moveTo(axX + nx * headSize * 0.4, axY + ny * headSize * 0.4);
    g.quadraticCurveTo(
      h2cx + nx * headSize * 0.2 + px * 2, h2cy + ny * headSize * 0.2 + py * 2,
      h2cx + px * 2, h2cy + py * 2,
    );
    g.quadraticCurveTo(
      h2cx - nx * headSize * 0.2 + px * 2, h2cy - ny * headSize * 0.2 + py * 2,
      axX - nx * headSize * 0.4, axY - ny * headSize * 0.4,
    );
    g.closePath();
    g.fill({ color: weaponColor });

    // Axe head highlight (sheen on metal)
    g.moveTo(
      axX + px * headSize * 0.3 + nx * headSize * 0.2,
      axY + py * headSize * 0.3 + ny * headSize * 0.2,
    );
    g.lineTo(
      axX + px * headSize * 0.3 - nx * headSize * 0.2,
      axY + py * headSize * 0.3 - ny * headSize * 0.2,
    );
    g.stroke({ color: 0xbbbbcc, width: 1.5, alpha: 0.6 });

    g.moveTo(
      axX - px * headSize * 0.3 + nx * headSize * 0.2,
      axY - py * headSize * 0.3 + ny * headSize * 0.2,
    );
    g.lineTo(
      axX - px * headSize * 0.3 - nx * headSize * 0.2,
      axY - py * headSize * 0.3 - ny * headSize * 0.2,
    );
    g.stroke({ color: 0xbbbbcc, width: 1.5, alpha: 0.6 });

    // Central rivet on axe head where it meets the shaft
    g.circle(axX, axY, 4);
    g.fill({ color: outlineColor });
    g.circle(axX, axY, 3);
    g.fill({ color: 0x999999 });

    // Handle wrapping (leather grip near hand)
    for (let i = 0; i < 3; i++) {
      const wrapT = 0.05 + i * 0.12;
      const wx = hx + nx * handleLen * wrapT;
      const wy = hy + ny * handleLen * wrapT;
      g.moveTo(wx + px * 4, wy + py * 4);
      g.lineTo(wx - px * 4, wy - py * 4);
      g.stroke({ color: leatherDark, width: 2 });
    }

    // Pommel (spiked end cap)
    const pommelX = hx - nx * 10;
    const pommelY = hy - ny * 10;
    g.circle(pommelX, pommelY, 5);
    g.fill({ color: outlineColor });
    g.circle(pommelX, pommelY, 4);
    g.fill({ color: 0x777788 });
    // Spike on pommel
    g.moveTo(pommelX - nx * 4, pommelY - ny * 4);
    g.lineTo(pommelX - nx * 12, pommelY - ny * 12);
    g.stroke({ color: 0x777788, width: 3, cap: "round" });
    g.moveTo(pommelX - nx * 4, pommelY - ny * 4);
    g.lineTo(pommelX - nx * 12, pommelY - ny * 12);
    g.stroke({ color: outlineColor, width: 5, cap: "round" });
    g.moveTo(pommelX - nx * 4, pommelY - ny * 4);
    g.lineTo(pommelX - nx * 12, pommelY - ny * 12);
    g.stroke({ color: 0x777788, width: 3, cap: "round" });
  }

  // --- Wild mane / beard detail over head ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;

    // Wild bushy hair/mane flowing back
    g.moveTo(hx - hr + 2, hy - 4);
    g.quadraticCurveTo(hx - hr - 8, hy - hr * 0.6, hx - 4, hy - hr - 4);
    g.quadraticCurveTo(hx + 6, hy - hr - 8, hx + hr - 2, hy - hr + 4);
    g.quadraticCurveTo(hx + hr + 6, hy - hr * 0.4, hx + hr, hy);
    g.stroke({ color: pal.hair ?? 0x665533, width: 4 });

    // Thicker mane on back of head
    g.moveTo(hx - hr - 2, hy - 2);
    g.quadraticCurveTo(hx - hr - 12, hy + 4, hx - hr - 6, hy + hr * 0.5);
    g.stroke({ color: pal.hair ?? 0x665533, width: 3 });

    // Bushy beard
    g.moveTo(hx - hr * 0.4, hy + hr * 0.6);
    g.quadraticCurveTo(hx, hy + hr + 10, hx + hr * 0.4, hy + hr * 0.6);
    g.fill({ color: pal.hair ?? 0x665533, alpha: 0.8 });

    // Beard outline strokes for bushiness
    g.moveTo(hx - hr * 0.3, hy + hr * 0.7);
    g.quadraticCurveTo(hx - 4, hy + hr + 6, hx, hy + hr + 8);
    g.stroke({ color: pal.hair ?? 0x665533, width: 2 });
    g.moveTo(hx + hr * 0.3, hy + hr * 0.7);
    g.quadraticCurveTo(hx + 4, hy + hr + 6, hx, hy + hr + 8);
    g.stroke({ color: pal.hair ?? 0x665533, width: 2 });
  }
}
