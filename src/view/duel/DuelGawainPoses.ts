// ---------------------------------------------------------------------------
// Gawain – "Knight of the Sun" – Mounted archer / horse archer pose data
// Composite bow archer with golden leather armor, sun-themed decorations
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette --------------------------------------------------------------

export const GAWAIN_PALETTE: FighterPalette = {
  skin: 0xddbb99,           // warm tanned skin
  body: 0xcc8822,           // golden leather armor
  pants: 0x886633,          // brown riding pants
  shoes: 0x664422,          // dark brown boots
  hair: 0xddaa44,           // golden blonde hair
  eyes: 0xdd8822,           // amber eyes
  outline: 0x222233,        // dark blue-black outline
  gloves: 0xaa7722,         // golden-brown leather gloves
  belt: 0x774411,           // dark leather belt
  accent: 0xffcc00,         // sun gold accent
  weapon: 0xaa8844,         // composite bow wood
  weaponAccent: 0xffcc00,   // sun glow on bow
};

// ---- Poses ----------------------------------------------------------------

export const GAWAIN_POSES: Record<string, FighterPose[]> = {

  // ---------- idle (4 frames, confident upright stance) --------------------
  idle: [
    pose(
      head(4, -186),
      torso(0, -131, 50, 40, 90, 0),
      arm(24, -172, 40, -150, 44, -126, false),
      arm(-24, -172, -40, -152, -38, -130, false),
      leg(14, -86, 20, -45, 18, 0),
      leg(-14, -86, -22, -45, -24, 0),
    ),
    pose(
      head(4, -188),
      torso(0, -133, 50, 40, 90, 0),
      arm(24, -174, 40, -152, 44, -128, false),
      arm(-24, -174, -40, -154, -38, -132, false),
      leg(14, -86, 20, -45, 18, 0),
      leg(-14, -86, -22, -45, -24, 0),
    ),
    pose(
      head(4, -186),
      torso(0, -131, 50, 40, 90, 0),
      arm(24, -172, 40, -150, 44, -126, false),
      arm(-24, -172, -40, -152, -38, -130, false),
      leg(14, -86, 20, -45, 18, 0),
      leg(-14, -86, -22, -45, -24, 0),
    ),
    pose(
      head(4, -184),
      torso(0, -129, 50, 40, 90, 0),
      arm(24, -170, 40, -148, 44, -124, false),
      arm(-24, -170, -40, -150, -38, -128, false),
      leg(14, -86, 20, -45, 18, 0),
      leg(-14, -86, -22, -45, -24, 0),
    ),
  ],

  // ---------- walk_forward (4 frames, purposeful stride) -------------------
  walk_forward: [
    pose(
      head(7, -186),
      torso(4, -131, 50, 40, 90, 0.04),
      arm(28, -172, 44, -146, 52, -122, false),
      arm(-20, -172, -32, -150, -22, -128, false),
      leg(18, -86, 32, -44, 34, 0),
      leg(-10, -86, -20, -45, -22, 0),
    ),
    pose(
      head(11, -186),
      torso(8, -131, 50, 40, 90, 0.06),
      arm(32, -172, 48, -144, 58, -120, false),
      arm(-16, -172, -28, -148, -18, -124, false),
      leg(22, -86, 40, -42, 46, 0),
      leg(-6, -86, -12, -47, -10, 0),
    ),
    pose(
      head(7, -186),
      torso(4, -131, 50, 40, 90, 0.04),
      arm(28, -172, 42, -150, 50, -124, false),
      arm(-20, -172, -34, -152, -24, -130, false),
      leg(18, -86, 24, -45, 22, 0),
      leg(-10, -86, -26, -42, -32, 0),
    ),
    pose(
      head(11, -186),
      torso(8, -131, 50, 40, 90, 0.06),
      arm(32, -172, 46, -146, 54, -122, false),
      arm(-16, -172, -28, -148, -20, -126, false),
      leg(22, -86, 16, -47, 10, 0),
      leg(-6, -86, -32, -40, -40, 0),
    ),
  ],

  // ---------- walk_back (4 frames, cautious backstep) ----------------------
  walk_back: [
    pose(
      head(-3, -186),
      torso(-4, -131, 50, 40, 90, -0.04),
      arm(20, -172, 36, -152, 40, -130, false),
      arm(-28, -172, -44, -150, -42, -128, false),
      leg(10, -86, 12, -45, 10, 0),
      leg(-18, -86, -30, -45, -34, 0),
    ),
    pose(
      head(-7, -186),
      torso(-8, -131, 50, 40, 90, -0.06),
      arm(16, -172, 32, -154, 36, -132, false),
      arm(-32, -172, -48, -148, -46, -124, false),
      leg(6, -86, 0, -47, -4, 0),
      leg(-22, -86, -38, -42, -44, 0),
    ),
    pose(
      head(-3, -186),
      torso(-4, -131, 50, 40, 90, -0.04),
      arm(20, -172, 36, -152, 40, -130, false),
      arm(-28, -172, -44, -150, -42, -128, false),
      leg(10, -86, 18, -45, 20, 0),
      leg(-18, -86, -24, -47, -22, 0),
    ),
    pose(
      head(-7, -186),
      torso(-8, -131, 50, 40, 90, -0.06),
      arm(16, -172, 34, -150, 38, -128, false),
      arm(-32, -172, -46, -152, -44, -128, false),
      leg(6, -86, 22, -42, 26, 0),
      leg(-22, -86, -20, -47, -16, 0),
    ),
  ],

  // ---------- crouch (1 frame, low guard stance) ---------------------------
  crouch: [
    pose(
      head(4, -132),
      torso(0, -86, 52, 42, 72, 0.08),
      arm(26, -120, 42, -96, 46, -74, false),
      arm(-26, -120, -40, -98, -36, -76, false),
      leg(16, -52, 36, -22, 26, 0),
      leg(-16, -52, -32, -20, -22, 0),
    ),
  ],

  // ---------- jump (2 frames, athletic leap) -------------------------------
  jump: [
    // rising
    pose(
      head(4, -202),
      torso(0, -152, 50, 38, 84, -0.04),
      arm(24, -190, 44, -172, 52, -158, true),
      arm(-24, -190, -42, -174, -50, -160, true),
      leg(14, -110, 24, -88, 20, -64),
      leg(-14, -110, -22, -84, -18, -60),
    ),
    // peak / floating
    pose(
      head(4, -212),
      torso(0, -160, 50, 38, 82, 0),
      arm(24, -198, 48, -182, 58, -170, true),
      arm(-24, -198, -46, -184, -54, -172, true),
      leg(14, -120, 30, -102, 24, -80),
      leg(-14, -120, -28, -98, -20, -74),
    ),
  ],

  // ---------- light_high (3 frames: startup, bow jab, recovery) ------------
  light_high: [
    // startup – pull bow back
    pose(
      head(7, -186),
      torso(4, -131, 50, 40, 90, 0.08),
      arm(28, -172, 16, -156, 2, -142, false),
      arm(-20, -172, -37, -156, -42, -142, false),
      leg(16, -86, 22, -45, 20, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
    // bow jab – thrust bow forward
    pose(
      head(11, -185),
      torso(8, -130, 50, 40, 90, 0.14),
      arm(32, -170, 54, -160, 74, -152, false),
      arm(-16, -170, -30, -152, -22, -138, false),
      leg(20, -86, 26, -45, 24, 0),
      leg(-8, -86, -16, -45, -18, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- med_high (3 frames: startup, sun swing, recovery) ------------
  med_high: [
    // startup – wind up bow to the side
    pose(
      head(3, -186),
      torso(0, -131, 50, 40, 90, -0.10),
      arm(24, -172, 10, -162, -8, -150, false),
      arm(-24, -172, -42, -162, -54, -150, false),
      leg(14, -86, 20, -45, 18, 0),
      leg(-14, -86, -22, -45, -24, 0),
    ),
    // sun swing – horizontal arc
    pose(
      head(13, -184),
      torso(8, -129, 50, 40, 90, 0.20),
      arm(34, -170, 58, -156, 80, -148, false),
      arm(-12, -170, -22, -150, -10, -134, false),
      leg(20, -86, 26, -43, 26, 0),
      leg(-6, -86, -16, -45, -18, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- heavy_high (4 frames: windup, slam, impact, recovery) --------
  heavy_high: [
    // windup – raise bow high
    pose(
      head(2, -188),
      torso(0, -132, 50, 40, 90, -0.06),
      arm(24, -174, 20, -198, 24, -214, false),
      arm(-24, -174, -20, -200, -22, -216, false),
      leg(14, -86, 18, -45, 16, 0),
      leg(-14, -86, -20, -45, -22, 0),
    ),
    // overhead slam – bring bow down hard
    pose(
      head(13, -181),
      torso(8, -127, 50, 40, 90, 0.22),
      arm(34, -168, 56, -150, 70, -122, false),
      arm(-8, -168, 8, -148, 20, -120, false),
      leg(20, -86, 30, -43, 30, 0),
      leg(-6, -86, -14, -45, -16, 0),
    ),
    // impact – bow connects low
    pose(
      head(15, -179),
      torso(10, -125, 50, 40, 90, 0.26),
      arm(36, -166, 60, -138, 74, -108, false),
      arm(-4, -166, 14, -136, 26, -106, false),
      leg(22, -86, 32, -41, 32, 0),
      leg(-4, -86, -12, -45, -14, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- light_low (3 frames: startup, sun kick, recovery) ------------
  light_low: [
    // startup – shift weight
    pose(
      head(3, -185),
      torso(2, -130, 50, 40, 90, 0.06),
      arm(26, -170, 42, -150, 46, -128, false),
      arm(-22, -170, -38, -150, -36, -130, false),
      leg(16, -86, 26, -50, 22, -12),
      leg(-12, -86, -24, -42, -28, 0),
    ),
    // sun kick – quick snap forward
    pose(
      head(9, -184),
      torso(6, -129, 50, 40, 90, 0.10),
      arm(30, -170, 46, -148, 50, -124, false),
      arm(-18, -170, -34, -148, -32, -126, false),
      leg(20, -86, 44, -54, 72, -32),
      leg(-8, -86, -24, -40, -30, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- med_low (3 frames: startup, low knee, recovery) --------------
  med_low: [
    // startup – drop low
    pose(
      head(7, -156),
      torso(4, -106, 50, 42, 80, 0.12),
      arm(28, -144, 44, -120, 48, -98, false),
      arm(-20, -144, -36, -122, -32, -100, false),
      leg(18, -68, 34, -36, 32, -8),
      leg(-10, -68, -20, -38, -22, 0),
    ),
    // low knee – extend low
    pose(
      head(13, -122),
      torso(10, -82, 52, 44, 62, 0.28),
      arm(34, -110, 50, -88, 54, -65, false),
      arm(-14, -110, -30, -90, -26, -68, false),
      leg(24, -52, 54, -24, 84, -10),
      leg(-4, -52, -18, -30, -22, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- heavy_low (4 frames: windup, sweep, hold, recovery) ----------
  heavy_low: [
    // windup – coil down
    pose(
      head(3, -162),
      torso(0, -110, 50, 42, 82, -0.08),
      arm(24, -148, 38, -126, 42, -102, false),
      arm(-24, -148, -40, -128, -38, -106, false),
      leg(14, -70, 22, -38, 18, -6),
      leg(-14, -70, -26, -36, -30, 0),
    ),
    // sweep kick – full rotation low
    pose(
      head(9, -138),
      torso(6, -92, 52, 44, 70, 0.24),
      arm(32, -124, 48, -100, 52, -76, false),
      arm(-16, -124, -34, -102, -30, -80, false),
      leg(20, -58, 52, -30, 88, -12),
      leg(-6, -58, -20, -32, -24, 0),
    ),
    // hold – leg extended
    pose(
      head(11, -140),
      torso(8, -94, 52, 44, 70, 0.20),
      arm(34, -126, 50, -102, 54, -78, false),
      arm(-14, -126, -32, -104, -28, -82, false),
      leg(22, -60, 58, -32, 82, -8),
      leg(-4, -60, -18, -34, -20, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- sun_arrow (3 frames: draw bow, release, recovery) ------------
  sun_arrow: [
    // draw bow – pull string back
    pose(
      head(5, -187),
      torso(2, -132, 50, 40, 90, 0.10),
      arm(28, -172, 50, -166, 64, -162, true),    // front arm pushes bow out
      arm(-20, -172, -12, -166, -32, -162, false), // back arm draws string
      leg(16, -86, 22, -45, 20, 0),
      leg(-12, -86, -22, -45, -24, 0),
    ),
    // release – arrow loosed with sun flash
    pose(
      head(9, -186),
      torso(4, -131, 50, 40, 90, 0.14),
      arm(30, -172, 54, -166, 72, -160, true),    // front arm extended with bow
      arm(-18, -172, -10, -164, -24, -152, true),  // back arm follows through
      leg(18, -86, 24, -45, 22, 0),
      leg(-10, -86, -20, -45, -22, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- blazing_rain (4 frames: aim high, charge, release, recovery) -
  blazing_rain: [
    // aim high – bow pointed skyward
    pose(
      head(0, -190),
      torso(-2, -134, 50, 40, 90, -0.12),
      arm(22, -176, 28, -202, 36, -222, true),    // front arm aims bow skyward
      arm(-26, -176, -16, -200, -30, -218, false), // back arm draws
      leg(14, -86, 20, -45, 18, 0),
      leg(-14, -86, -22, -45, -24, 0),
    ),
    // charge sun energy – glow building
    pose(
      head(2, -189),
      torso(0, -133, 50, 40, 90, -0.10),
      arm(24, -175, 30, -200, 38, -220, true),
      arm(-24, -175, -14, -198, -28, -216, false),
      leg(14, -86, 20, -45, 18, 0),
      leg(-14, -86, -22, -45, -24, 0),
    ),
    // release volley – blazing arrows fly
    pose(
      head(4, -187),
      torso(0, -131, 50, 40, 90, -0.06),
      arm(24, -174, 32, -200, 42, -218, true),    // bow still aimed up
      arm(-24, -174, -12, -192, -22, -206, true),  // back arm released
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -22, -45, -24, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- low_kick (3 frames: startup, kick, recovery) -----------------
  low_kick: [
    // startup – crouch and shift weight
    pose(
      head(3, -152),
      torso(0, -102, 52, 42, 76, 0.10),
      arm(26, -138, 42, -114, 46, -92, false),
      arm(-24, -138, -40, -116, -36, -94, false),
      leg(16, -64, 26, -34, 20, -6),
      leg(-14, -64, -24, -36, -28, 0),
    ),
    // low kick – sweeping leg
    pose(
      head(7, -132),
      torso(4, -88, 52, 44, 66, 0.28),
      arm(30, -118, 46, -94, 50, -70, false),
      arm(-18, -118, -36, -96, -32, -74, false),
      leg(20, -56, 54, -26, 84, -8),
      leg(-6, -56, -18, -30, -20, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- solar_flip (3 frames: crouch, backflip+shoot, land) ----------
  solar_flip: [
    // crouch – coil for jump
    pose(
      head(2, -148),
      torso(0, -100, 50, 42, 78, -0.06),
      arm(24, -136, 40, -114, 44, -92, false),
      arm(-24, -136, -38, -116, -36, -94, false),
      leg(14, -62, 26, -30, 20, 0),
      leg(-14, -62, -24, -32, -22, 0),
    ),
    // backflip – body inverted, firing arrow mid-air
    pose(
      head(-22, -192),
      torso(-16, -158, 48, 38, 82, -0.48),
      arm(4, -194, 20, -208, 42, -202, true),     // front arm – bow aimed forward
      arm(-36, -194, -28, -210, -18, -198, false), // back arm released
      leg(-4, -118, -20, -140, -30, -162),
      leg(-28, -118, -40, -142, -46, -166),
    ),
    // land – return to ground
    pose(
      head(-12, -188),
      torso(-10, -132, 50, 40, 90, -0.04),
      arm(16, -172, 34, -154, 40, -132, false),
      arm(-32, -172, -46, -152, -44, -130, false),
      leg(6, -86, 14, -45, 12, 0),
      leg(-22, -86, -28, -45, -30, 0),
    ),
  ],

  // ---------- grab (3 frames: reach, bow strike, recovery) -----------------
  grab: [
    // reach – lunge forward to grapple
    pose(
      head(13, -184),
      torso(10, -129, 50, 40, 90, 0.16),
      arm(36, -170, 58, -156, 76, -150, true),
      arm(-8, -170, -20, -152, -12, -138, true),
      leg(22, -86, 32, -43, 32, 0),
      leg(-4, -86, -14, -45, -16, 0),
    ),
    // bow strike – slam bow into opponent
    pose(
      head(17, -183),
      torso(14, -128, 50, 40, 90, 0.20),
      arm(40, -168, 60, -150, 68, -132, false),
      arm(0, -168, 12, -148, 26, -130, false),
      leg(26, -86, 34, -41, 34, 0),
      leg(0, -86, -10, -45, -12, 0),
    ),
    // recovery
    pose(
      head(5, -186),
      torso(2, -131, 50, 40, 90, 0.04),
      arm(26, -172, 42, -152, 46, -130, false),
      arm(-22, -172, -38, -152, -36, -132, false),
      leg(16, -86, 20, -45, 18, 0),
      leg(-12, -86, -20, -45, -22, 0),
    ),
  ],

  // ---------- rapid_volley (3 frames: draw, rapid fire, recovery) ----------
  rapid_volley: [
    // draw back bow
    pose(
      head(4, -187),
      torso(0, -132, 50, 40, 90, -0.05),
      arm(24, -172, 12, -158, -4, -148, false),
      arm(-24, -172, -40, -156, -48, -140, false),
      leg(14, -86, 18, -45, 20, 0),
      leg(-14, -86, -20, -45, -22, 0),
    ),
    // rapid fire – arm extended, releasing arrows in burst
    pose(
      head(7, -185),
      torso(4, -130, 50, 40, 90, 0.08),
      arm(26, -170, 58, -160, 92, -154, false),
      arm(-22, -170, -32, -152, -28, -132, false),
      leg(16, -86, 20, -45, 22, 0),
      leg(-12, -86, -18, -45, -20, 0),
    ),
    // recovery
    pose(
      head(4, -186),
      torso(0, -131, 50, 40, 90, 0),
      arm(24, -172, 40, -150, 44, -126, false),
      arm(-24, -172, -40, -152, -38, -130, false),
      leg(14, -86, 20, -45, 18, 0),
      leg(-14, -86, -22, -45, -24, 0),
    ),
  ],

  // ---------- block_stand (1 frame, bow held across body) ------------------
  block_stand: [
    pose(
      head(2, -187),
      torso(-2, -132, 50, 40, 90, -0.06),
      arm(22, -174, 32, -154, 22, -132, false),    // front arm holds bow vertical
      arm(-26, -174, -16, -152, -12, -130, false),  // back arm braces bow
      leg(12, -86, 16, -45, 14, 0),
      leg(-16, -86, -22, -45, -24, 0),
    ),
  ],

  // ---------- block_crouch (1 frame, crouched guard) -----------------------
  block_crouch: [
    pose(
      head(2, -134),
      torso(-2, -90, 52, 42, 72, -0.08),
      arm(24, -124, 32, -102, 22, -82, false),
      arm(-28, -124, -18, -100, -14, -80, false),
      leg(16, -54, 32, -24, 24, 0),
      leg(-16, -54, -30, -22, -24, 0),
    ),
  ],

  // ---------- hit_stun (2 frames, recoiling) -------------------------------
  hit_stun: [
    // recoil back
    pose(
      head(-9, -183),
      torso(-6, -129, 50, 40, 90, -0.14),
      arm(18, -170, 6, -150, -4, -132, true),
      arm(-30, -170, -46, -150, -52, -132, true),
      leg(8, -86, 12, -45, 10, 0),
      leg(-20, -86, -28, -45, -30, 0),
    ),
    // staggering
    pose(
      head(-13, -181),
      torso(-10, -127, 50, 40, 90, -0.20),
      arm(14, -168, 0, -148, -12, -130, true),
      arm(-34, -168, -50, -148, -58, -130, true),
      leg(4, -86, 8, -45, 6, 0),
      leg(-24, -86, -32, -45, -34, 0),
    ),
  ],

  // ---------- knockdown (2 frames, falling then lying) ---------------------
  knockdown: [
    // falling backward
    pose(
      head(-18, -142),
      torso(-14, -97, 50, 40, 90, -0.50),
      arm(6, -137, -10, -112, -22, -92, true),
      arm(-34, -137, -52, -114, -60, -94, true),
      leg(-4, -57, 6, -30, 10, 0),
      leg(-24, -57, -32, -28, -30, 0),
    ),
    // lying on ground
    pose(
      head(-52, -30),
      torso(-27, -26, 50, 40, 90, -1.50),
      arm(-12, -40, -32, -32, -50, -22, true),
      arm(-42, -40, -60, -30, -74, -20, true),
      leg(-2, -14, 18, -10, 36, -4),
      leg(-20, -12, -4, -8, 14, 0),
    ),
  ],

  // ---------- get_up (2 frames, springing up) ------------------------------
  get_up: [
    // pushing up off ground
    pose(
      head(-12, -102),
      torso(-8, -64, 50, 42, 70, -0.30),
      arm(16, -96, 32, -62, 34, -42, false),
      arm(-28, -96, -42, -60, -40, -38, false),
      leg(6, -32, 22, -16, 18, 0),
      leg(-18, -30, -26, -14, -22, 0),
    ),
    // springing to feet
    pose(
      head(2, -177),
      torso(0, -124, 50, 40, 88, -0.02),
      arm(24, -166, 40, -146, 44, -124, false),
      arm(-24, -166, -38, -148, -36, -126, false),
      leg(14, -82, 20, -42, 18, 0),
      leg(-14, -82, -20, -44, -22, 0),
    ),
  ],

  // ---------- victory (2 frames, bow raised with sun salute) ---------------
  victory: [
    // raise bow overhead
    pose(
      head(3, -192),
      torso(0, -136, 50, 40, 92, 0),
      arm(24, -178, 30, -204, 22, -226, false),    // front arm lifts bow high
      arm(-24, -178, -30, -206, -22, -228, false),  // back arm raised in salute
      leg(14, -90, 20, -47, 18, 0),
      leg(-14, -90, -22, -47, -24, 0),
    ),
    // triumphant hold – sun salute
    pose(
      head(3, -194),
      torso(0, -138, 50, 40, 92, 0),
      arm(24, -180, 32, -208, 26, -230, true),
      arm(-24, -180, -32, -210, -26, -232, true),
      leg(14, -90, 18, -47, 16, 0),
      leg(-14, -90, -20, -47, -22, 0),
    ),
  ],

  // ---------- defeat (1 frame, collapsed) ----------------------------------
  defeat: [
    pose(
      head(-50, -26),
      torso(-26, -24, 50, 40, 90, -1.55),
      arm(-10, -38, -30, -28, -48, -18, true),
      arm(-42, -36, -58, -26, -72, -16, true),
      leg(0, -12, 20, -8, 38, -2),
      leg(-18, -10, -2, -6, 16, 0),
    ),
  ],
};

// ---- Draw extras (composite bow, sun emblem, golden decorations) ----------

export function drawGawainExtras(g: Graphics, p: FighterPose, pal: FighterPalette, isFlashing: boolean, flashColor: number): void {
  const bowColor = pal.weapon ?? 0xaa8844;
  const sunGlow = pal.weaponAccent ?? 0xffcc00;
  const accentColor = pal.accent ?? 0xffcc00;
  const hairColor = isFlashing ? flashColor : (pal.hair ?? 0xddaa44);

  // -- Short golden hair (styled upward, knightly) --
  const headX = p.head.x;
  const headY = p.head.y;
  const hr = p.head.radius ?? 24;

  // Hair mass – short, swept-back golden hair
  g.moveTo(headX - hr + 2, headY - 2);
  g.quadraticCurveTo(headX - hr - 4, headY - hr + 2, headX, headY - hr - 6);
  g.quadraticCurveTo(headX + hr + 4, headY - hr + 2, headX + hr - 2, headY - 2);
  g.quadraticCurveTo(headX + hr + 2, headY - 10, headX + hr - 4, headY + 6);
  g.lineTo(headX - hr + 4, headY + 6);
  g.quadraticCurveTo(headX - hr - 2, headY - 10, headX - hr + 2, headY - 2);
  g.closePath();
  g.fill({ color: 0x222233 }); // outline

  g.moveTo(headX - hr + 3, headY - 1);
  g.quadraticCurveTo(headX - hr - 2, headY - hr + 4, headX, headY - hr - 4);
  g.quadraticCurveTo(headX + hr + 2, headY - hr + 4, headX + hr - 3, headY - 1);
  g.quadraticCurveTo(headX + hr, headY - 9, headX + hr - 5, headY + 5);
  g.lineTo(headX - hr + 5, headY + 5);
  g.quadraticCurveTo(headX - hr, headY - 9, headX - hr + 3, headY - 1);
  g.closePath();
  g.fill({ color: hairColor });

  // Hair highlights
  g.moveTo(headX - 6, headY - hr - 2);
  g.quadraticCurveTo(headX, headY - hr - 8, headX + 8, headY - hr);
  g.stroke({ color: 0xeebb55, width: 1, alpha: 0.4 });

  // -- Sun emblem on chest armor --
  if (p.torso) {
    const t = p.torso;
    const emblemX = t.x + 2;
    const emblemY = t.y + t.height * 0.3;
    const emblemR = 6;

    // Sun circle (outline then fill)
    g.circle(emblemX, emblemY, emblemR + 1);
    g.fill({ color: 0x222233 });
    g.circle(emblemX, emblemY, emblemR);
    g.fill({ color: accentColor });

    // Sun rays – 8 small lines radiating outward
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const rx1 = emblemX + Math.cos(angle) * (emblemR + 1);
      const ry1 = emblemY + Math.sin(angle) * (emblemR + 1);
      const rx2 = emblemX + Math.cos(angle) * (emblemR + 5);
      const ry2 = emblemY + Math.sin(angle) * (emblemR + 5);
      g.moveTo(rx1, ry1);
      g.lineTo(rx2, ry2);
      g.stroke({ color: accentColor, width: 1.5, cap: "round" });
    }

    // Inner sun dot
    g.circle(emblemX, emblemY, 2);
    g.fill({ color: 0xff8800 });

    // Belt buckle – golden sun
    const beltY = t.y + t.height / 2 - 6;
    g.roundRect(t.x - 4, beltY, 8, 6, 1);
    g.fill({ color: accentColor });
    g.roundRect(t.x - 4, beltY, 8, 6, 1);
    g.stroke({ color: 0x222233, width: 1 });
  }

  // -- Composite bow (more ornate than Elaine's longbow, with golden trim) --
  const hx = p.frontArm.handX;
  const hy = p.frontArm.handY;

  // Composite bow has a shorter, more recurved shape
  const bowLen = 48;
  const bowCurve = 22;
  const tipCurve = -8; // recurved tips

  // Top limb of bow – outline
  g.moveTo(hx, hy);
  g.quadraticCurveTo(hx + bowCurve, hy - bowLen * 0.5, hx + 6, hy - bowLen);
  g.stroke({ color: 0x222233, width: 6, cap: "round" });
  // Top limb fill
  g.moveTo(hx, hy);
  g.quadraticCurveTo(hx + bowCurve, hy - bowLen * 0.5, hx + 6, hy - bowLen);
  g.stroke({ color: bowColor, width: 4, cap: "round" });

  // Top recurved tip
  g.moveTo(hx + 6, hy - bowLen);
  g.quadraticCurveTo(hx + 2, hy - bowLen - 4, hx + tipCurve, hy - bowLen - 2);
  g.stroke({ color: 0x222233, width: 4, cap: "round" });
  g.moveTo(hx + 6, hy - bowLen);
  g.quadraticCurveTo(hx + 2, hy - bowLen - 4, hx + tipCurve, hy - bowLen - 2);
  g.stroke({ color: bowColor, width: 2.5, cap: "round" });

  // Bottom limb of bow – outline
  g.moveTo(hx, hy);
  g.quadraticCurveTo(hx + bowCurve, hy + bowLen * 0.5, hx + 6, hy + bowLen);
  g.stroke({ color: 0x222233, width: 6, cap: "round" });
  // Bottom limb fill
  g.moveTo(hx, hy);
  g.quadraticCurveTo(hx + bowCurve, hy + bowLen * 0.5, hx + 6, hy + bowLen);
  g.stroke({ color: bowColor, width: 4, cap: "round" });

  // Bottom recurved tip
  g.moveTo(hx + 6, hy + bowLen);
  g.quadraticCurveTo(hx + 2, hy + bowLen + 4, hx + tipCurve, hy + bowLen + 2);
  g.stroke({ color: 0x222233, width: 4, cap: "round" });
  g.moveTo(hx + 6, hy + bowLen);
  g.quadraticCurveTo(hx + 2, hy + bowLen + 4, hx + tipCurve, hy + bowLen + 2);
  g.stroke({ color: bowColor, width: 2.5, cap: "round" });

  // Golden decoration bands on bow limbs
  const bandPositions = [0.3, 0.6];
  for (const bp of bandPositions) {
    // Top limb bands
    const tbx = hx + bowCurve * Math.sin(bp * Math.PI) * 0.7;
    const tby = hy - bowLen * bp;
    g.circle(tbx, tby, 3);
    g.fill({ color: sunGlow, alpha: 0.7 });

    // Bottom limb bands
    const bbx = hx + bowCurve * Math.sin(bp * Math.PI) * 0.7;
    const bby = hy + bowLen * bp;
    g.circle(bbx, bby, 3);
    g.fill({ color: sunGlow, alpha: 0.7 });
  }

  // Grip wrap at center – golden leather
  g.roundRect(hx - 3, hy - 6, 8, 12, 2);
  g.fill({ color: sunGlow });
  g.roundRect(hx - 3, hy - 6, 8, 12, 2);
  g.stroke({ color: 0x222233, width: 1 });

  // Bowstring – straight line from tip to tip
  g.moveTo(hx + tipCurve, hy - bowLen - 2);
  g.lineTo(hx + tipCurve, hy + bowLen + 2);
  g.stroke({ color: sunGlow, width: 1.5, cap: "round" });

  // -- Quiver on back (with golden-fletched arrows) --
  const qx = p.torso.x - 22;
  const qy = p.torso.y - 18;
  const qw = 10;
  const qh = 38;

  // Quiver body outline + fill
  g.roundRect(qx - qw / 2 - 1, qy - 1, qw + 2, qh + 2, 3);
  g.fill({ color: 0x222233 });
  g.roundRect(qx - qw / 2, qy, qw, qh, 3);
  g.fill({ color: 0x886633 });

  // Golden trim on quiver top
  g.roundRect(qx - qw / 2, qy - 1, qw, 4, 1);
  g.fill({ color: sunGlow });

  // Quiver strap
  g.moveTo(qx, qy);
  g.lineTo(qx + 18, qy - 12);
  g.stroke({ color: 0x886633, width: 2 });

  // Arrow tips sticking out
  const arrowTipColor = 0xcccccc;
  for (let i = 0; i < 3; i++) {
    const ax = qx - 3 + i * 3;
    const ay = qy - 2;
    g.moveTo(ax, ay);
    g.lineTo(ax, ay - 8);
    g.stroke({ color: arrowTipColor, width: 1.5, cap: "round" });
    // Arrowhead
    g.moveTo(ax - 2, ay - 6);
    g.lineTo(ax, ay - 10);
    g.lineTo(ax + 2, ay - 6);
    g.closePath();
    g.fill({ color: arrowTipColor });
    // Golden fletching
    g.moveTo(ax - 1, ay + 2);
    g.lineTo(ax - 3, ay + 6);
    g.stroke({ color: sunGlow, width: 1 });
    g.moveTo(ax + 1, ay + 2);
    g.lineTo(ax + 3, ay + 6);
    g.stroke({ color: sunGlow, width: 1 });
  }

  // -- Shoulder pauldron accents (golden trim on armor) --
  // Front shoulder
  const fsx = p.frontArm.shoulderX;
  const fsy = p.frontArm.shoulderY;
  g.moveTo(fsx - 6, fsy + 2);
  g.quadraticCurveTo(fsx, fsy - 8, fsx + 8, fsy + 2);
  g.stroke({ color: sunGlow, width: 2.5, cap: "round" });

  // Back shoulder
  const bsx = p.backArm.shoulderX;
  const bsy = p.backArm.shoulderY;
  g.moveTo(bsx - 6, bsy + 2);
  g.quadraticCurveTo(bsx, bsy - 8, bsx + 8, bsy + 2);
  g.stroke({ color: sunGlow, width: 2.5, cap: "round" });
}
