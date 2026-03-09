// ---------------------------------------------------------------------------
// Lot — King of Orkney
// Death knight / dark warrior skeleton pose data for duel fighting game.
// Heavy dark iron armor, cursed two-handed greatsword, tattered green cape,
// dark crown with green gems, eerie green glowing eyes.
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette ---------------------------------------------------------------

export const LOT_PALETTE: FighterPalette = {
  skin: 0xbbaa88,         // pale, deathly skin
  body: 0x333344,         // dark iron armor
  pants: 0x222233,        // dark armored leggings
  shoes: 0x222222,        // black iron boots
  hair: 0x222222,         // black
  eyes: 0x88ff88,         // eerie green glow
  outline: 0x111122,
  gloves: 0x333344,       // dark iron gauntlets
  belt: 0x222211,         // blackened leather belt
  accent: 0x44aa44,       // ghostly green
  weapon: 0x556666,       // dark steel greatsword blade
  weaponAccent: 0x44aa44, // green rune glow
};

// ---- Poses -----------------------------------------------------------------
// Lot is a heavy death knight. He holds a massive two-handed greatsword.
// Both arms grip the weapon. Stance is wide, menacing, and grounded.

export const LOT_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, heavy breathing, menacing two-handed greatsword stance) --
  idle: [
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),         // front: both hands on greatsword hilt
      arm(-28, -174, -18, -152, 15, -132),        // back arm reaches across to grip
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
    pose(
      head(4, -187),
      torso(0, -131, 60, 48, 92),
      arm(28, -173, 40, -149, 35, -127),
      arm(-28, -173, -18, -151, 15, -131),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
    pose(
      head(4, -186),
      torso(0, -130, 60, 48, 92),
      arm(28, -172, 40, -148, 35, -126),
      arm(-28, -172, -18, -150, 15, -130),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
    pose(
      head(4, -187),
      torso(0, -131, 60, 48, 92),
      arm(28, -173, 40, -149, 35, -127),
      arm(-28, -173, -18, -151, 15, -131),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- walk_forward (4 frames, heavy armored stomping stride) --
  walk_forward: [
    pose(
      head(6, -188),
      torso(2, -132, 60, 48, 92),
      arm(30, -174, 42, -150, 38, -128),
      arm(-26, -174, -16, -150, 18, -130),
      leg(16, -88, 30, -48, 32, 0),
      leg(-16, -88, -10, -44, -22, 0),
    ),
    pose(
      head(8, -187),
      torso(4, -131, 60, 48, 92),
      arm(32, -173, 44, -148, 40, -126),
      arm(-24, -173, -14, -148, 20, -128),
      leg(16, -88, 22, -45, 16, 0),
      leg(-16, -88, -16, -45, -16, 0),
    ),
    pose(
      head(6, -188),
      torso(2, -132, 60, 48, 92),
      arm(30, -174, 42, -150, 38, -128),
      arm(-26, -174, -16, -150, 18, -130),
      leg(16, -88, -4, -44, -18, 0),
      leg(-16, -88, 24, -48, 28, 0),
    ),
    pose(
      head(4, -187),
      torso(0, -131, 60, 48, 92),
      arm(28, -173, 40, -149, 36, -127),
      arm(-28, -173, -18, -151, 16, -131),
      leg(16, -88, 16, -45, 16, 0),
      leg(-16, -88, -16, -45, -16, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious backward stomp) --
  walk_back: [
    pose(
      head(2, -188),
      torso(-2, -132, 60, 48, 92),
      arm(26, -174, 36, -152, 30, -132),
      arm(-30, -174, -22, -152, 10, -135),
      leg(16, -88, 10, -48, -4, 0),
      leg(-16, -88, -26, -44, -30, 0),
    ),
    pose(
      head(0, -187),
      torso(-4, -131, 60, 48, 92),
      arm(24, -173, 34, -150, 28, -130),
      arm(-32, -173, -24, -150, 8, -133),
      leg(16, -88, 16, -45, 16, 0),
      leg(-16, -88, -16, -45, -16, 0),
    ),
    pose(
      head(2, -188),
      torso(-2, -132, 60, 48, 92),
      arm(26, -174, 36, -152, 30, -132),
      arm(-30, -174, -22, -152, 10, -135),
      leg(16, -88, 26, -44, 30, 0),
      leg(-16, -88, -10, -48, 4, 0),
    ),
    pose(
      head(0, -187),
      torso(-4, -131, 60, 48, 92),
      arm(24, -173, 34, -150, 28, -130),
      arm(-32, -173, -24, -150, 8, -133),
      leg(16, -88, 16, -45, 16, 0),
      leg(-16, -88, -16, -45, -16, 0),
    ),
  ],

  // -- crouch (1 frame, low guard with greatsword held across) --
  crouch: [
    pose(
      head(3, -132),
      torso(0, -88, 62, 50, 72),
      arm(28, -118, 38, -95, 35, -72),
      arm(-28, -118, -16, -95, 12, -76),
      leg(18, -52, 30, -26, 24, 0),
      leg(-18, -52, -30, -26, -24, 0),
    ),
  ],

  // -- jump (2 frames: leap up, peak with greatsword raised overhead) --
  jump: [
    pose(
      head(4, -194),
      torso(0, -140, 60, 48, 90),
      arm(28, -180, 42, -170, 48, -192),
      arm(-28, -180, -16, -168, 22, -190),
      leg(16, -96, 24, -70, 20, -50),
      leg(-16, -96, -24, -70, -20, -50),
    ),
    pose(
      head(4, -200),
      torso(0, -146, 60, 48, 90),
      arm(28, -186, 45, -180, 52, -205),
      arm(-28, -186, -14, -178, 26, -203),
      leg(16, -102, 26, -76, 30, -58),
      leg(-16, -102, -22, -68, -28, -54),
    ),
  ],

  // -- light_high: heavy greatsword jab (3 frames) --
  light_high: [
    // startup: pull greatsword back
    pose(
      head(2, -188),
      torso(-2, -132, 60, 48, 92, -0.06),
      arm(26, -174, 14, -152, -2, -138),
      arm(-30, -174, -22, -155, -10, -142),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
    // thrust: greatsword jab forward
    pose(
      head(10, -186),
      torso(5, -130, 60, 48, 92, 0.08),
      arm(32, -172, 58, -158, 90, -152),
      arm(-22, -172, -4, -155, 62, -150),
      leg(16, -88, 22, -45, 20, 0),
      leg(-16, -88, -20, -47, -20, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- med_high: wide horizontal greatsword slash (3 frames) --
  med_high: [
    // startup: sword drawn back high, two-handed
    pose(
      head(-2, -189),
      torso(-4, -133, 60, 48, 92, -0.1),
      arm(26, -174, 8, -175, -14, -178),
      arm(-30, -174, -22, -172, -32, -175),
      leg(16, -88, 22, -46, 20, 0),
      leg(-16, -88, -20, -46, -22, 0),
    ),
    // wide slash: massive arc across body
    pose(
      head(12, -185),
      torso(6, -129, 60, 48, 92, 0.14),
      arm(32, -170, 62, -150, 95, -132),
      arm(-22, -170, 8, -152, 68, -136),
      leg(16, -88, 24, -44, 22, 0),
      leg(-16, -88, -20, -48, -22, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- heavy_high: massive overhead greatsword slam (4 frames) --
  heavy_high: [
    // windup: greatsword raised high overhead with both hands
    pose(
      head(-2, -190),
      torso(-4, -134, 60, 48, 92, -0.08),
      arm(26, -176, 22, -195, 18, -220),
      arm(-30, -176, -14, -192, 2, -218),
      leg(16, -88, 22, -46, 20, 0),
      leg(-16, -88, -22, -46, -24, 0),
    ),
    // downward strike: greatsword crashing down
    pose(
      head(10, -184),
      torso(5, -128, 60, 48, 92, 0.16),
      arm(30, -170, 55, -152, 75, -112),
      arm(-24, -170, -2, -150, 48, -116),
      leg(16, -88, 24, -44, 24, 0),
      leg(-16, -88, -18, -48, -20, 0),
    ),
    // impact: greatsword slammed into ground
    pose(
      head(14, -178),
      torso(8, -122, 60, 48, 92, 0.22),
      arm(32, -164, 64, -118, 82, -68),
      arm(-20, -164, 6, -120, 55, -72),
      leg(16, -88, 28, -42, 28, 0),
      leg(-16, -88, -18, -50, -24, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- light_low: heavy boot kick (3 frames) --
  light_low: [
    // startup: lift leg
    pose(
      head(2, -188),
      torso(-2, -134, 60, 48, 92),
      arm(26, -176, 38, -154, 32, -132),
      arm(-30, -176, -20, -154, 12, -136),
      leg(16, -88, 30, -58, 32, -32),
      leg(-16, -88, -22, -46, -24, 0),
    ),
    // kick extended
    pose(
      head(0, -186),
      torso(-4, -132, 60, 48, 92, -0.06),
      arm(24, -174, 36, -152, 30, -130),
      arm(-32, -174, -22, -152, 10, -134),
      leg(16, -88, 44, -54, 72, -32),
      leg(-16, -88, -24, -46, -26, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- med_low: crouching greatsword sweep (3 frames) --
  med_low: [
    // startup: crouch, wind back
    pose(
      head(2, -178),
      torso(0, -124, 60, 48, 86, 0.1),
      arm(28, -164, 32, -134, 16, -108),
      arm(-28, -164, -16, -136, -2, -112),
      leg(16, -82, 24, -44, 22, 0),
      leg(-16, -82, -22, -44, -22, 0),
    ),
    // low sweep: greatsword thrust low and forward
    pose(
      head(10, -174),
      torso(6, -120, 60, 48, 86, 0.18),
      arm(32, -160, 58, -112, 88, -82),
      arm(-22, -160, 4, -115, 60, -86),
      leg(16, -82, 26, -42, 24, 0),
      leg(-16, -82, -22, -46, -24, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- heavy_low: massive low greatsword sweep launcher (4 frames) --
  heavy_low: [
    // windup: deep crouch, wind greatsword to back
    pose(
      head(-2, -158),
      torso(-4, -108, 62, 50, 76, -0.12),
      arm(28, -142, 10, -128, -16, -118),
      arm(-28, -142, -20, -130, -32, -122),
      leg(18, -70, 30, -36, 26, 0),
      leg(-18, -70, -30, -36, -28, 0),
    ),
    // sweep: greatsword sweeps low across the ground
    pose(
      head(12, -152),
      torso(6, -102, 62, 50, 76, 0.22),
      arm(32, -136, 60, -88, 88, -22),
      arm(-20, -136, 4, -92, 60, -28),
      leg(18, -70, 34, -32, 32, 0),
      leg(-18, -70, -28, -38, -30, 0),
    ),
    // hold: greatsword extended at ground level
    pose(
      head(14, -150),
      torso(8, -100, 62, 50, 76, 0.25),
      arm(34, -134, 64, -82, 94, -16),
      arm(-18, -134, 8, -88, 66, -22),
      leg(18, -70, 36, -30, 34, 0),
      leg(-18, -70, -28, -38, -30, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- death_thrust: lunging forward stab (3 frames) --
  death_thrust: [
    // startup: pull greatsword way back, lean back
    pose(
      head(-4, -190),
      torso(-6, -134, 60, 48, 92, -0.14),
      arm(24, -176, 4, -158, -18, -148),
      arm(-32, -176, -22, -160, -30, -152),
      leg(16, -88, 20, -46, 16, 0),
      leg(-16, -88, -24, -46, -26, 0),
    ),
    // lunge: body drives forward, greatsword fully extended
    pose(
      head(20, -182),
      torso(14, -128, 60, 48, 92, 0.18),
      arm(38, -170, 68, -150, 100, -142),
      arm(-16, -170, 14, -152, 72, -146),
      leg(16, -88, 34, -50, 40, 0),
      leg(-16, -88, -10, -44, -12, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- orkney_cleave: devastating overhead cleave (4 frames) --
  orkney_cleave: [
    // big windup: greatsword held high behind head, both hands
    pose(
      head(-4, -192),
      torso(-6, -136, 60, 48, 92, -0.12),
      arm(24, -178, 16, -198, 6, -224),
      arm(-32, -178, -18, -196, -8, -222),
      leg(16, -88, 22, -48, 20, 0),
      leg(-16, -88, -22, -48, -24, 0),
    ),
    // overhead slam: greatsword crashing down
    pose(
      head(12, -182),
      torso(6, -126, 60, 48, 92, 0.2),
      arm(32, -168, 58, -142, 74, -98),
      arm(-22, -168, 2, -144, 46, -102),
      leg(16, -88, 26, -44, 26, 0),
      leg(-16, -88, -18, -50, -22, 0),
    ),
    // impact hold: greatsword slammed deep
    pose(
      head(16, -176),
      torso(10, -120, 60, 48, 92, 0.26),
      arm(34, -162, 66, -118, 82, -62),
      arm(-18, -162, 10, -122, 56, -66),
      leg(16, -88, 28, -42, 30, 0),
      leg(-16, -88, -18, -52, -24, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- reaper_sweep: ground-level death sweep (3 frames) --
  reaper_sweep: [
    // startup: drop low
    pose(
      head(0, -150),
      torso(-2, -102, 62, 50, 74, 0.06),
      arm(28, -136, 22, -114, 6, -102),
      arm(-28, -136, -18, -116, -6, -106),
      leg(18, -66, 32, -34, 28, 0),
      leg(-18, -66, -30, -36, -30, 0),
    ),
    // ground sweep: greatsword sweeps at ankle height
    pose(
      head(14, -147),
      torso(8, -98, 62, 50, 74, 0.26),
      arm(34, -132, 64, -72, 95, -12),
      arm(-18, -132, 8, -78, 66, -18),
      leg(18, -66, 38, -30, 36, 0),
      leg(-18, -66, -28, -38, -32, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- death_rise: anti-air rising slash with dark energy (4 frames) --
  death_rise: [
    // crouch startup: coil low, greatsword held at side
    pose(
      head(2, -150),
      torso(0, -102, 62, 50, 74),
      arm(28, -136, 32, -112, 22, -92),
      arm(-28, -136, -16, -114, 0, -96),
      leg(18, -66, 32, -34, 28, 0),
      leg(-18, -66, -30, -36, -30, 0),
    ),
    // upward slash: rising, greatsword sweeping up
    pose(
      head(8, -178),
      torso(4, -124, 60, 48, 88, 0.1),
      arm(30, -166, 52, -160, 68, -190),
      arm(-24, -166, -2, -158, 40, -188),
      leg(16, -82, 24, -46, 22, 0),
      leg(-16, -82, -20, -46, -20, 0),
    ),
    // peak: airborne, greatsword high
    pose(
      head(6, -204),
      torso(2, -150, 60, 48, 88, 0.06),
      arm(30, -190, 44, -200, 50, -228),
      arm(-24, -190, -4, -198, 22, -226),
      leg(16, -106, 24, -82, 22, -62),
      leg(-16, -106, -20, -78, -22, -58),
    ),
    // recovery: landing
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- grab: death grip (3 frames) --
  grab: [
    // reach: both arms extend forward to grab
    pose(
      head(10, -186),
      torso(5, -130, 60, 48, 92, 0.08),
      arm(30, -172, 52, -158, 72, -148, true),
      arm(-24, -172, -8, -154, 18, -142, true),
      leg(16, -88, 24, -46, 24, 0),
      leg(-16, -88, -18, -48, -20, 0),
    ),
    // crush: gripping and lifting opponent
    pose(
      head(14, -184),
      torso(8, -128, 60, 48, 92, 0.14),
      arm(32, -170, 54, -152, 64, -138),
      arm(-22, -170, 8, -148, 38, -138),
      leg(16, -88, 26, -44, 26, 0),
      leg(-16, -88, -18, -50, -22, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- dark_charge: rushing forward with dark energy (3 frames) --
  dark_charge: [
    // crouch behind greatsword, shoulder forward
    pose(
      head(-2, -182),
      torso(-4, -130, 60, 48, 92, -0.1),
      arm(26, -172, 32, -154, 24, -138),
      arm(-30, -172, -14, -156, 4, -142),
      leg(16, -88, 22, -48, 20, 0),
      leg(-16, -88, -22, -48, -24, 0),
    ),
    // lunging forward, greatsword leading
    pose(
      head(18, -180),
      torso(14, -126, 60, 48, 92, 0.18),
      arm(36, -168, 58, -148, 78, -132),
      arm(-16, -168, 10, -150, 50, -136),
      leg(16, -88, 34, -50, 40, 0),
      leg(-16, -88, -10, -44, -12, 0),
    ),
    // recovery
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- soul_reap: massive single hit with dark energy (4 frames) --
  soul_reap: [
    // deep crouch gathering dark power
    pose(
      head(-2, -152),
      torso(-4, -104, 62, 50, 74, -0.08),
      arm(28, -138, 18, -112, 6, -94),
      arm(-28, -138, -18, -114, -8, -98),
      leg(18, -68, 30, -34, 26, 0),
      leg(-18, -68, -30, -34, -28, 0),
    ),
    // explosive upward slash
    pose(
      head(12, -188),
      torso(8, -132, 60, 48, 92, 0.14),
      arm(32, -174, 54, -178, 64, -216),
      arm(-22, -174, 0, -176, 36, -214),
      leg(16, -88, 24, -46, 24, 0),
      leg(-16, -88, -18, -48, -20, 0),
    ),
    // peak: airborne, greatsword high with dark energy
    pose(
      head(8, -210),
      torso(4, -156, 60, 48, 90, 0.08),
      arm(30, -196, 44, -210, 50, -245),
      arm(-24, -196, -2, -208, 24, -243),
      leg(16, -112, 24, -86, 22, -66),
      leg(-16, -112, -20, -82, -22, -62),
    ),
    // recovery landing
    pose(
      head(4, -188),
      torso(0, -132, 60, 48, 92),
      arm(28, -174, 40, -150, 35, -128),
      arm(-28, -174, -18, -152, 15, -132),
      leg(16, -88, 20, -46, 18, 0),
      leg(-16, -88, -20, -46, -18, 0),
    ),
  ],

  // -- block_stand (1 frame: greatsword held vertically in front) --
  block_stand: [
    pose(
      head(-2, -190),
      torso(-4, -134, 60, 48, 92, -0.06),
      arm(24, -176, 28, -158, 20, -142),
      arm(-30, -176, -14, -160, 2, -146),
      leg(16, -88, 20, -48, 18, 0),
      leg(-16, -88, -22, -48, -22, 0),
    ),
  ],

  // -- block_crouch (1 frame: crouched behind greatsword) --
  block_crouch: [
    pose(
      head(-4, -134),
      torso(-6, -90, 62, 50, 72, -0.08),
      arm(24, -120, 28, -100, 22, -82),
      arm(-30, -120, -12, -102, 4, -86),
      leg(18, -55, 30, -28, 24, 0),
      leg(-18, -55, -30, -28, -26, 0),
    ),
  ],

  // -- hit_stun (2 frames: recoiling backward) --
  hit_stun: [
    pose(
      head(-10, -184),
      torso(-8, -130, 60, 48, 92, -0.14),
      arm(20, -172, 6, -150, -8, -132),
      arm(-34, -172, -28, -152, -18, -136),
      leg(16, -88, 12, -46, 6, 0),
      leg(-16, -88, -24, -48, -28, 0),
    ),
    pose(
      head(-14, -182),
      torso(-12, -128, 60, 48, 92, -0.2),
      arm(16, -170, 0, -148, -14, -130),
      arm(-38, -170, -32, -150, -22, -134),
      leg(16, -88, 8, -44, 2, 0),
      leg(-16, -88, -28, -50, -32, 0),
    ),
  ],

  // -- knockdown (2 frames: falling then lying) --
  knockdown: [
    // falling
    pose(
      head(-18, -142),
      torso(-14, -98, 60, 48, 82, -0.38),
      arm(10, -134, -8, -114, -22, -98),
      arm(-40, -134, -34, -112, -24, -100),
      leg(16, -58, 22, -30, 26, 0),
      leg(-16, -58, -26, -32, -32, 0),
    ),
    // lying on ground
    pose(
      head(-52, -22),
      torso(-28, -20, 60, 48, 92, -1.5),
      arm(-6, -38, -28, -24, -48, -16),
      arm(-48, -12, -62, -6, -72, 0),
      leg(16, -12, 32, -6, 48, 0),
      leg(-16, -12, -10, -6, 6, 0),
    ),
  ],

  // -- get_up (2 frames: rising from ground) --
  get_up: [
    // pushing up
    pose(
      head(-22, -92),
      torso(-14, -62, 60, 48, 72, -0.42),
      arm(10, -94, 22, -58, 28, -32),
      arm(-36, -94, -28, -58, -18, -32),
      leg(16, -28, 26, -14, 24, 0),
      leg(-16, -28, -24, -16, -22, 0),
    ),
    // nearly standing
    pose(
      head(0, -172),
      torso(-4, -120, 60, 48, 86, -0.1),
      arm(26, -160, 36, -138, 30, -118),
      arm(-30, -160, -18, -140, 8, -122),
      leg(16, -78, 22, -42, 20, 0),
      leg(-16, -78, -22, -42, -20, 0),
    ),
  ],

  // -- victory (2 frames: greatsword planted in ground, menacing pose) --
  victory: [
    // plant greatsword in ground, arms crossed
    pose(
      head(4, -192),
      torso(0, -134, 60, 48, 92),
      arm(28, -176, 40, -155, 42, -132),
      arm(-28, -176, -38, -156, -36, -134),
      leg(16, -88, 22, -46, 20, 0),
      leg(-16, -88, -22, -46, -20, 0),
    ),
    // menacing hold, slight lean forward
    pose(
      head(6, -194),
      torso(2, -136, 60, 48, 92, 0.04),
      arm(30, -178, 42, -157, 44, -134),
      arm(-26, -178, -36, -158, -34, -136),
      leg(16, -88, 24, -46, 22, 0),
      leg(-16, -88, -24, -46, -22, 0),
    ),
  ],

  // -- defeat (1 frame: collapsed on the ground) --
  defeat: [
    pose(
      head(-58, -20),
      torso(-30, -18, 60, 48, 92, -1.55),
      arm(-10, -35, -30, -20, -52, -12),
      arm(-50, -10, -66, -4, -78, 2),
      leg(16, -10, 34, -4, 50, 0),
      leg(-16, -10, -6, -4, 8, 0),
    ),
  ],
};

// ---- Draw extras (greatsword, armor details, dark crown) ------------------

/**
 * Draw Lot's tattered ghostly green cape/cloak behind the body (called before skeleton).
 */
export function drawLotBackExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const capeColor = pal.accent ?? 0x44aa44;

  if (p.torso && p.backArm) {
    const capeTop = p.torso.y - p.torso.height / 2;
    const capeX = p.torso.x - p.torso.topWidth / 2 - 3;
    const capeBottom = p.torso.y + p.torso.height / 2 + 25;
    const capeMid = (capeTop + capeBottom) / 2;
    const capeWidth = 22;

    // Main tattered cloak shape (wider, more ragged than Arthur's cape)
    g.moveTo(capeX, capeTop);
    g.quadraticCurveTo(capeX - capeWidth, capeMid - 10, capeX - capeWidth + 4, capeBottom);
    g.lineTo(capeX - capeWidth + 10, capeBottom - 6);
    g.lineTo(capeX - capeWidth + 8, capeBottom + 4);
    g.lineTo(capeX - 6, capeBottom - 2);
    g.lineTo(capeX - 2, capeBottom + 6);
    g.lineTo(capeX + 6, capeBottom - 4);
    g.quadraticCurveTo(capeX - 4, capeMid + 5, capeX + 4, capeTop + 4);
    g.closePath();
    g.fill({ color: capeColor, alpha: 0.5 });

    // Tattered edge highlights — ghostly glow effect
    g.moveTo(capeX - capeWidth + 4, capeBottom);
    g.lineTo(capeX - capeWidth + 10, capeBottom - 6);
    g.stroke({ color: capeColor, width: 1, alpha: 0.8 });

    g.moveTo(capeX - capeWidth + 8, capeBottom + 4);
    g.lineTo(capeX - 6, capeBottom - 2);
    g.stroke({ color: capeColor, width: 1, alpha: 0.7 });

    g.moveTo(capeX - 2, capeBottom + 6);
    g.lineTo(capeX + 6, capeBottom - 4);
    g.stroke({ color: capeColor, width: 1, alpha: 0.6 });

    // Inner cloak darkness
    g.moveTo(capeX - 2, capeTop + 8);
    g.quadraticCurveTo(capeX - capeWidth + 6, capeMid, capeX - capeWidth + 10, capeBottom - 8);
    g.lineTo(capeX + 2, capeBottom - 10);
    g.quadraticCurveTo(capeX - 2, capeMid + 4, capeX + 2, capeTop + 10);
    g.closePath();
    g.fill({ color: 0x111122, alpha: 0.35 });
  }
}

/**
 * Draw Lot's cursed greatsword, skull/death motif armor, and dark crown.
 */
export function drawLotExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  _isFlashing: boolean,
  _flashColor: number,
): void {
  const weaponColor = pal.weapon ?? 0x556666;
  const runeGlow = pal.weaponAccent ?? 0x44aa44;
  const armorColor = pal.body ?? 0x333344;
  const armorHighlight = 0x555566;
  const armorShadow = 0x222233;
  const greenGem = 0x44aa44;

  // --- Dark iron armor detail overlays on torso ---
  if (p.torso) {
    const t = p.torso;
    const lsx = t.x - t.topWidth / 2 - 5;
    const rsx = t.x + t.topWidth / 2 + 5;
    const sy = t.y - t.height / 2 - 2;

    // Left pauldron — larger, spiked dark iron
    g.roundRect(lsx - 10, sy - 5, 22, 16, 4);
    g.fill({ color: armorColor });
    g.roundRect(lsx - 10, sy - 5, 22, 16, 4);
    g.stroke({ color: armorHighlight, width: 1 });
    // Spike on pauldron
    g.moveTo(lsx - 6, sy - 5);
    g.lineTo(lsx - 2, sy - 14);
    g.lineTo(lsx + 2, sy - 5);
    g.closePath();
    g.fill({ color: armorColor });
    g.moveTo(lsx - 6, sy - 5);
    g.lineTo(lsx - 2, sy - 14);
    g.lineTo(lsx + 2, sy - 5);
    g.closePath();
    g.stroke({ color: armorHighlight, width: 1 });

    // Right pauldron — larger, spiked dark iron
    g.roundRect(rsx - 12, sy - 5, 22, 16, 4);
    g.fill({ color: armorColor });
    g.roundRect(rsx - 12, sy - 5, 22, 16, 4);
    g.stroke({ color: armorHighlight, width: 1 });
    // Spike on pauldron
    g.moveTo(rsx - 2, sy - 5);
    g.lineTo(rsx + 2, sy - 14);
    g.lineTo(rsx + 6, sy - 5);
    g.closePath();
    g.fill({ color: armorColor });
    g.moveTo(rsx - 2, sy - 5);
    g.lineTo(rsx + 2, sy - 14);
    g.lineTo(rsx + 6, sy - 5);
    g.closePath();
    g.stroke({ color: armorHighlight, width: 1 });

    // Skull motif on chest plate
    const cx = t.x;
    const cy = t.y - 6;
    // Skull outline
    g.roundRect(cx - 7, cy - 8, 14, 12, 4);
    g.fill({ color: armorShadow });
    g.roundRect(cx - 7, cy - 8, 14, 12, 4);
    g.stroke({ color: armorHighlight, width: 1, alpha: 0.6 });
    // Eye sockets
    g.circle(cx - 3, cy - 3, 2);
    g.fill({ color: greenGem, alpha: 0.6 });
    g.circle(cx + 3, cy - 3, 2);
    g.fill({ color: greenGem, alpha: 0.6 });
    // Jaw line
    g.moveTo(cx - 4, cy + 1);
    g.lineTo(cx + 4, cy + 1);
    g.stroke({ color: armorHighlight, width: 1, alpha: 0.5 });

    // Horizontal armor segment lines
    g.moveTo(t.x - t.topWidth / 3, t.y + 8);
    g.lineTo(t.x + t.topWidth / 3, t.y + 8);
    g.stroke({ color: armorShadow, width: 1, alpha: 0.5 });
  }

  // --- Knee guards on legs (dark iron, larger) ---
  if (p.frontLeg) {
    const kx = p.frontLeg.kneeX;
    const ky = p.frontLeg.kneeY;
    g.roundRect(kx - 9, ky - 7, 18, 14, 4);
    g.fill({ color: armorColor });
    g.roundRect(kx - 9, ky - 7, 18, 14, 4);
    g.stroke({ color: armorHighlight, width: 1 });
    // Small spike on knee
    g.moveTo(kx - 2, ky - 7);
    g.lineTo(kx, ky - 13);
    g.lineTo(kx + 2, ky - 7);
    g.closePath();
    g.fill({ color: armorColor });
  }
  if (p.backLeg) {
    const kx = p.backLeg.kneeX;
    const ky = p.backLeg.kneeY;
    g.roundRect(kx - 8, ky - 6, 16, 12, 3);
    g.fill({ color: armorShadow });
    g.roundRect(kx - 8, ky - 6, 16, 12, 3);
    g.stroke({ color: armorColor, width: 1 });
  }

  // --- Boot detail (dark iron boots with spikes) ---
  if (p.frontLeg) {
    const fx = p.frontLeg.footX;
    const fy = p.frontLeg.footY;
    g.moveTo(fx - 7, fy - 9);
    g.lineTo(fx + 9, fy - 9);
    g.stroke({ color: armorShadow, width: 2 });
    // Iron buckle
    g.roundRect(fx - 1, fy - 11, 5, 5, 1);
    g.fill({ color: armorHighlight });
  }
  if (p.backLeg) {
    const fx = p.backLeg.footX;
    const fy = p.backLeg.footY;
    g.moveTo(fx - 6, fy - 8);
    g.lineTo(fx + 8, fy - 8);
    g.stroke({ color: armorShadow, width: 1.5 });
    g.roundRect(fx, fy - 10, 4, 4, 1);
    g.fill({ color: armorHighlight });
  }

  // --- Gauntlet rivets on front arm ---
  if (p.frontArm) {
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;
    // Elbow guard — dark iron
    g.circle(ex, ey, 7);
    g.fill({ color: armorColor });
    g.circle(ex, ey, 7);
    g.stroke({ color: armorHighlight, width: 1 });
    // Spike on elbow
    const mx = (ex + p.frontArm.handX) / 2;
    const my = (ey + p.frontArm.handY) / 2;
    g.circle(mx, my, 2.5);
    g.fill({ color: armorHighlight });
  }

  // --- Cursed Two-Handed Greatsword in front arm ---
  if (p.frontArm) {
    const hx = p.frontArm.handX;
    const hy = p.frontArm.handY;
    const ex = p.frontArm.elbowX;
    const ey = p.frontArm.elbowY;

    // Blade direction: extend from hand away from elbow
    const dx = hx - ex;
    const dy = hy - ey;
    const len = Math.sqrt(dx * dx + dy * dy);
    const bladeLen = 68; // larger than a normal sword
    const nx = len > 0 ? dx / len : 1;
    const ny = len > 0 ? dy / len : 0;
    const tipX = hx + nx * bladeLen;
    const tipY = hy + ny * bladeLen;

    // Perpendicular for blade width
    const px = -ny;
    const py = nx;

    // Blade outline (wider for greatsword)
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke({ color: 0x111122, width: 10, cap: "round" });

    // Blade fill — dark steel
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke({ color: weaponColor, width: 8, cap: "round" });

    // Blade fuller (groove down center)
    const fullerStart = 0.12;
    const fullerEnd = 0.88;
    g.moveTo(hx + nx * bladeLen * fullerStart, hy + ny * bladeLen * fullerStart);
    g.lineTo(hx + nx * bladeLen * fullerEnd, hy + ny * bladeLen * fullerEnd);
    g.stroke({ color: armorShadow, width: 2, cap: "round", alpha: 0.5 });

    // Green rune glow lines along blade
    const runeStart1 = 0.2;
    const runeEnd1 = 0.4;
    g.moveTo(hx + nx * bladeLen * runeStart1 + px * 2, hy + ny * bladeLen * runeStart1 + py * 2);
    g.lineTo(hx + nx * bladeLen * runeEnd1 + px * 2, hy + ny * bladeLen * runeEnd1 + py * 2);
    g.stroke({ color: runeGlow, width: 1.5, cap: "round", alpha: 0.8 });

    const runeStart2 = 0.5;
    const runeEnd2 = 0.7;
    g.moveTo(hx + nx * bladeLen * runeStart2 - px * 2, hy + ny * bladeLen * runeStart2 - py * 2);
    g.lineTo(hx + nx * bladeLen * runeEnd2 - px * 2, hy + ny * bladeLen * runeEnd2 - py * 2);
    g.stroke({ color: runeGlow, width: 1.5, cap: "round", alpha: 0.8 });

    // Third rune near tip
    const runeStart3 = 0.75;
    const runeEnd3 = 0.9;
    g.moveTo(hx + nx * bladeLen * runeStart3 + px * 1, hy + ny * bladeLen * runeStart3 + py * 1);
    g.lineTo(hx + nx * bladeLen * runeEnd3 + px * 1, hy + ny * bladeLen * runeEnd3 + py * 1);
    g.stroke({ color: runeGlow, width: 1, cap: "round", alpha: 0.6 });

    // Blade edge highlight
    g.moveTo(hx + py * 3, hy - px * 3);
    g.lineTo(tipX + py * 2, tipY - px * 2);
    g.stroke({ color: 0x778888, width: 1.5, cap: "round", alpha: 0.5 });

    // Large crossguard (perpendicular to blade, wider for greatsword)
    const guardLen = 16;
    const gx1 = hx + py * guardLen;
    const gy1 = hy - px * guardLen;
    const gx2 = hx - py * guardLen;
    const gy2 = hy + px * guardLen;

    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: 0x111122, width: 8, cap: "round" });
    g.moveTo(gx1, gy1);
    g.lineTo(gx2, gy2);
    g.stroke({ color: armorColor, width: 6, cap: "round" });

    // Crossguard end spikes (pointed)
    g.moveTo(gx1, gy1);
    g.lineTo(gx1 + py * 4 + nx * 3, gy1 - px * 4 + ny * 3);
    g.stroke({ color: armorColor, width: 3, cap: "round" });
    g.moveTo(gx2, gy2);
    g.lineTo(gx2 - py * 4 + nx * 3, gy2 + px * 4 + ny * 3);
    g.stroke({ color: armorColor, width: 3, cap: "round" });

    // Green gem in crossguard center
    g.circle(hx, hy, 4);
    g.fill({ color: 0x111122 });
    g.circle(hx, hy, 3);
    g.fill({ color: runeGlow });
    g.circle(hx - nx * 0.5, hy - ny * 0.5, 1.5);
    g.fill({ color: 0xaaffaa, alpha: 0.8 }); // gem highlight

    // Pommel (larger for two-handed grip)
    const pommelX = hx - nx * 10;
    const pommelY = hy - ny * 10;
    g.circle(pommelX, pommelY, 6);
    g.fill({ color: 0x111122 });
    g.circle(pommelX, pommelY, 5);
    g.fill({ color: armorColor });
    // Skull on pommel
    g.circle(pommelX, pommelY - 1, 2.5);
    g.fill({ color: armorHighlight });
    g.circle(pommelX - 1, pommelY - 2, 0.8);
    g.fill({ color: 0x111122 });
    g.circle(pommelX + 1, pommelY - 2, 0.8);
    g.fill({ color: 0x111122 });
  }

  // --- Dark crown with green gems (drawn over the head) ---
  if (p.head) {
    const hx = p.head.x;
    const hy = p.head.y;
    const hr = p.head.radius ?? 24;

    // Crown base band
    const crownBase = hy - hr + 4;
    const crownWidth = hr * 1.1;
    g.moveTo(hx - crownWidth, crownBase + 4);
    g.lineTo(hx - crownWidth, crownBase);
    g.lineTo(hx + crownWidth, crownBase);
    g.lineTo(hx + crownWidth, crownBase + 4);
    g.closePath();
    g.fill({ color: armorColor });
    g.moveTo(hx - crownWidth, crownBase);
    g.lineTo(hx + crownWidth, crownBase);
    g.stroke({ color: armorHighlight, width: 1 });

    // Crown points (5 jagged points)
    const points = 5;
    const pointSpacing = (crownWidth * 2) / (points - 1);
    for (let i = 0; i < points; i++) {
      const px = hx - crownWidth + i * pointSpacing;
      const pointHeight = (i === 2) ? 14 : 10; // center point is tallest
      g.moveTo(px - 3, crownBase);
      g.lineTo(px, crownBase - pointHeight);
      g.lineTo(px + 3, crownBase);
      g.closePath();
      g.fill({ color: armorColor });
      g.moveTo(px - 3, crownBase);
      g.lineTo(px, crownBase - pointHeight);
      g.lineTo(px + 3, crownBase);
      g.closePath();
      g.stroke({ color: armorHighlight, width: 0.8 });

      // Green gem at base of each point
      if (i % 2 === 0) {
        g.circle(px, crownBase - 2, 2);
        g.fill({ color: greenGem });
        g.circle(px - 0.5, crownBase - 2.5, 0.8);
        g.fill({ color: 0xaaffaa, alpha: 0.7 }); // gem highlight
      }
    }
  }
}
