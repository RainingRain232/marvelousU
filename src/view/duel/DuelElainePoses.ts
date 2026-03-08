// ---------------------------------------------------------------------------
// Elaine – "The Lily Maid" – Archer fighter pose data
// Longbow archer with agile kicks, green leather armor, hooded cloak
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette --------------------------------------------------------------

export const ELAINE_PALETTE: FighterPalette = {
  body: 0x448844,         // forest green leather armor
  pants: 0x336633,        // dark green pants
  shoes: 0x664422,        // brown boots
  skin: 0xeeccaa,         // light skin
  hair: 0x994422,         // auburn/red-brown hair
  eyes: 0x44aa44,         // green eyes
  outline: 0x222222,
  gloves: 0x886644,       // leather gloves
  belt: 0x775533,
  weapon: 0x8b6914,       // bow wood
  weaponAccent: 0xddbb44, // bowstring / gold trim
};

// ---- Poses ----------------------------------------------------------------

export const ELAINE_POSES: Record<string, FighterPose[]> = {

  // ---------- idle (4 frames, light bouncing ready stance) ------------------
  idle: [
    pose(
      head(5, -185),
      torso(0, -130, 48, 38, 88, 0),
      arm(22, -170, 38, -148, 42, -125, false),
      arm(-22, -170, -38, -150, -35, -128, false),
      leg(12, -85, 18, -44, 16, 0),
      leg(-12, -85, -20, -44, -22, 0),
    ),
    pose(
      head(5, -187),
      torso(0, -132, 48, 38, 88, 0),
      arm(22, -172, 38, -150, 42, -127, false),
      arm(-22, -172, -38, -152, -35, -130, false),
      leg(12, -85, 18, -44, 16, 0),
      leg(-12, -85, -20, -44, -22, 0),
    ),
    pose(
      head(5, -185),
      torso(0, -130, 48, 38, 88, 0),
      arm(22, -170, 38, -148, 42, -125, false),
      arm(-22, -170, -38, -150, -35, -128, false),
      leg(12, -85, 18, -44, 16, 0),
      leg(-12, -85, -20, -44, -22, 0),
    ),
    pose(
      head(5, -183),
      torso(0, -128, 48, 38, 88, 0),
      arm(22, -168, 38, -146, 42, -123, false),
      arm(-22, -168, -38, -148, -35, -126, false),
      leg(12, -85, 18, -44, 16, 0),
      leg(-12, -85, -20, -44, -22, 0),
    ),
  ],

  // ---------- walk_forward (4 frames, agile forward step) ------------------
  walk_forward: [
    pose(
      head(8, -185),
      torso(4, -130, 48, 38, 88, 0.04),
      arm(26, -170, 42, -145, 50, -120, false),
      arm(-18, -170, -30, -148, -20, -125, false),
      leg(16, -85, 30, -44, 32, 0),
      leg(-8, -85, -18, -44, -20, 0),
    ),
    pose(
      head(12, -185),
      torso(8, -130, 48, 38, 88, 0.06),
      arm(30, -170, 46, -142, 55, -118, false),
      arm(-14, -170, -28, -145, -15, -122, false),
      leg(20, -85, 38, -42, 44, 0),
      leg(-4, -85, -10, -46, -8, 0),
    ),
    pose(
      head(8, -185),
      torso(4, -130, 48, 38, 88, 0.04),
      arm(26, -170, 40, -148, 48, -122, false),
      arm(-18, -170, -32, -150, -22, -128, false),
      leg(16, -85, 22, -44, 20, 0),
      leg(-8, -85, -24, -42, -30, 0),
    ),
    pose(
      head(12, -185),
      torso(8, -130, 48, 38, 88, 0.06),
      arm(30, -170, 44, -144, 52, -120, false),
      arm(-14, -170, -26, -146, -18, -124, false),
      leg(20, -85, 14, -46, 8, 0),
      leg(-4, -85, -30, -40, -38, 0),
    ),
  ],

  // ---------- walk_back (4 frames, light backstep) -------------------------
  walk_back: [
    pose(
      head(-2, -185),
      torso(-4, -130, 48, 38, 88, -0.04),
      arm(18, -170, 34, -150, 38, -128, false),
      arm(-26, -170, -42, -148, -40, -125, false),
      leg(8, -85, 10, -44, 8, 0),
      leg(-16, -85, -28, -44, -32, 0),
    ),
    pose(
      head(-6, -185),
      torso(-8, -130, 48, 38, 88, -0.06),
      arm(14, -170, 30, -152, 34, -130, false),
      arm(-30, -170, -46, -146, -44, -122, false),
      leg(4, -85, -2, -46, -6, 0),
      leg(-20, -85, -36, -42, -42, 0),
    ),
    pose(
      head(-2, -185),
      torso(-4, -130, 48, 38, 88, -0.04),
      arm(18, -170, 34, -150, 38, -128, false),
      arm(-26, -170, -42, -148, -40, -125, false),
      leg(8, -85, 16, -44, 18, 0),
      leg(-16, -85, -22, -46, -20, 0),
    ),
    pose(
      head(-6, -185),
      torso(-8, -130, 48, 38, 88, -0.06),
      arm(14, -170, 32, -148, 36, -126, false),
      arm(-30, -170, -44, -150, -42, -126, false),
      leg(4, -85, 20, -42, 24, 0),
      leg(-20, -85, -18, -46, -14, 0),
    ),
  ],

  // ---------- crouch (1 frame, low crouch) ---------------------------------
  crouch: [
    pose(
      head(5, -130),
      torso(0, -85, 50, 40, 70, 0.08),
      arm(24, -118, 40, -95, 44, -72, false),
      arm(-24, -118, -38, -96, -34, -74, false),
      leg(14, -50, 34, -20, 24, 0),
      leg(-14, -50, -30, -18, -20, 0),
    ),
  ],

  // ---------- jump (2 frames, acrobatic leap) ------------------------------
  jump: [
    // rising
    pose(
      head(5, -200),
      torso(0, -150, 48, 36, 82, -0.04),
      arm(22, -188, 42, -170, 50, -155, true),
      arm(-22, -188, -40, -172, -48, -158, true),
      leg(12, -108, 22, -85, 18, -62),
      leg(-12, -108, -20, -82, -16, -58),
    ),
    // peak / floating
    pose(
      head(5, -210),
      torso(0, -158, 48, 36, 80, 0),
      arm(22, -196, 46, -180, 55, -168, true),
      arm(-22, -196, -44, -182, -52, -170, true),
      leg(12, -118, 28, -100, 22, -78),
      leg(-12, -118, -26, -96, -18, -72),
    ),
  ],

  // ---------- light_high (3 frames: startup, quick bow strike, recovery) ---
  light_high: [
    // startup – pull bow back
    pose(
      head(8, -185),
      torso(4, -130, 48, 38, 88, 0.08),
      arm(26, -170, 14, -155, 0, -140, false),
      arm(-18, -170, -35, -155, -40, -140, false),
      leg(14, -85, 20, -44, 18, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
    // quick bow strike – jab bow forward
    pose(
      head(12, -184),
      torso(8, -129, 48, 38, 88, 0.14),
      arm(30, -169, 52, -158, 72, -150, false),
      arm(-14, -169, -28, -150, -20, -135, false),
      leg(18, -85, 24, -44, 22, 0),
      leg(-6, -85, -14, -44, -16, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- med_high (3 frames: startup, bow swing, recovery) ------------
  med_high: [
    // startup – wind up bow to the side
    pose(
      head(4, -185),
      torso(0, -130, 48, 38, 88, -0.10),
      arm(22, -170, 8, -160, -10, -148, false),
      arm(-22, -170, -40, -160, -52, -148, false),
      leg(12, -85, 18, -44, 16, 0),
      leg(-12, -85, -20, -44, -22, 0),
    ),
    // bow swing – horizontal arc
    pose(
      head(14, -183),
      torso(8, -128, 48, 38, 88, 0.20),
      arm(32, -168, 56, -155, 78, -145, false),
      arm(-10, -168, -20, -148, -8, -132, false),
      leg(18, -85, 24, -42, 24, 0),
      leg(-4, -85, -14, -44, -16, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- heavy_high (4 frames: windup, overhead bow slam, impact, recovery)
  heavy_high: [
    // windup – raise bow high
    pose(
      head(2, -186),
      torso(0, -131, 48, 38, 88, -0.06),
      arm(22, -172, 18, -195, 22, -210, false),
      arm(-22, -172, -18, -196, -20, -212, false),
      leg(12, -85, 16, -44, 14, 0),
      leg(-12, -85, -18, -44, -20, 0),
    ),
    // overhead slam – bring bow down hard
    pose(
      head(14, -180),
      torso(8, -126, 48, 38, 88, 0.22),
      arm(32, -166, 54, -148, 68, -120, false),
      arm(-6, -166, 10, -146, 22, -118, false),
      leg(18, -85, 28, -42, 28, 0),
      leg(-4, -85, -12, -44, -14, 0),
    ),
    // impact – bow hits low
    pose(
      head(16, -178),
      torso(10, -124, 48, 38, 88, 0.26),
      arm(34, -164, 58, -135, 72, -105, false),
      arm(-2, -164, 16, -134, 28, -104, false),
      leg(20, -85, 30, -40, 30, 0),
      leg(-2, -85, -10, -44, -12, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- light_low (3 frames: startup, shin kick, recovery) -----------
  light_low: [
    // startup – shift weight
    pose(
      head(4, -184),
      torso(2, -129, 48, 38, 88, 0.06),
      arm(24, -169, 40, -148, 44, -126, false),
      arm(-20, -169, -36, -148, -34, -128, false),
      leg(14, -85, 24, -48, 20, -10),
      leg(-10, -85, -22, -40, -26, 0),
    ),
    // shin kick – quick snap forward
    pose(
      head(10, -183),
      torso(6, -128, 48, 38, 88, 0.10),
      arm(28, -168, 44, -145, 48, -122, false),
      arm(-16, -168, -32, -146, -30, -124, false),
      leg(18, -85, 42, -52, 70, -30),
      leg(-6, -85, -22, -38, -28, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- med_low (3 frames: startup, slide kick, recovery) ------------
  med_low: [
    // startup – drop low
    pose(
      head(8, -155),
      torso(4, -105, 48, 40, 78, 0.12),
      arm(26, -142, 42, -118, 46, -95, false),
      arm(-18, -142, -34, -120, -30, -98, false),
      leg(16, -66, 32, -34, 30, -6),
      leg(-8, -66, -18, -36, -20, 0),
    ),
    // slide kick – extend low along ground
    pose(
      head(14, -120),
      torso(10, -80, 50, 42, 60, 0.30),
      arm(32, -108, 48, -85, 52, -62, false),
      arm(-12, -108, -28, -88, -24, -66, false),
      leg(22, -50, 52, -22, 82, -8),
      leg(-2, -50, -16, -28, -20, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- heavy_low (4 frames: windup, sweep kick, hold, recovery) -----
  heavy_low: [
    // windup – coil down
    pose(
      head(4, -160),
      torso(0, -108, 48, 40, 80, -0.08),
      arm(22, -146, 36, -124, 40, -100, false),
      arm(-22, -146, -38, -126, -36, -104, false),
      leg(12, -68, 20, -36, 16, -4),
      leg(-12, -68, -24, -34, -28, 0),
    ),
    // sweep kick – full rotation low
    pose(
      head(10, -135),
      torso(6, -90, 50, 42, 68, 0.24),
      arm(30, -122, 46, -98, 50, -74, false),
      arm(-14, -122, -32, -100, -28, -78, false),
      leg(18, -56, 50, -28, 85, -10),
      leg(-4, -56, -18, -30, -22, 0),
    ),
    // hold – leg extended
    pose(
      head(12, -138),
      torso(8, -92, 50, 42, 68, 0.20),
      arm(32, -124, 48, -100, 52, -76, false),
      arm(-12, -124, -30, -102, -26, -80, false),
      leg(20, -58, 55, -30, 80, -6),
      leg(-2, -58, -16, -32, -18, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- power_shot (3 frames: draw bow, release arrow, recovery) -----
  power_shot: [
    // draw bow – pull string back
    pose(
      head(6, -186),
      torso(2, -131, 48, 38, 88, 0.10),
      arm(26, -171, 48, -165, 62, -160, true),   // front arm pushes bow out
      arm(-18, -171, -10, -165, -30, -160, false), // back arm draws string
      leg(14, -85, 20, -44, 18, 0),
      leg(-10, -85, -20, -44, -22, 0),
    ),
    // release – arrow loosed
    pose(
      head(10, -185),
      torso(4, -130, 48, 38, 88, 0.14),
      arm(28, -170, 52, -164, 70, -158, true),   // front arm extended with bow
      arm(-16, -170, -8, -162, -22, -150, true),  // back arm follows through
      leg(16, -85, 22, -44, 20, 0),
      leg(-8, -85, -18, -44, -20, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- rain_of_arrows (3 frames: aim high, release volley, recovery) -
  rain_of_arrows: [
    // aim high – bow pointed upward
    pose(
      head(0, -188),
      torso(-2, -132, 48, 38, 88, -0.12),
      arm(20, -174, 26, -200, 34, -220, true),   // front arm aims bow skyward
      arm(-24, -174, -14, -198, -28, -215, false), // back arm draws
      leg(12, -85, 18, -44, 16, 0),
      leg(-12, -85, -20, -44, -22, 0),
    ),
    // release volley – arrows fly
    pose(
      head(4, -186),
      torso(0, -130, 48, 38, 88, -0.06),
      arm(22, -172, 30, -198, 40, -216, true),   // bow still aimed up
      arm(-22, -172, -10, -190, -20, -204, true), // back arm released
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -20, -44, -22, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- leg_sweep (3 frames: startup, sweep, recovery) ---------------
  leg_sweep: [
    // startup – crouch and shift weight
    pose(
      head(4, -150),
      torso(0, -100, 50, 40, 74, 0.10),
      arm(24, -136, 40, -112, 44, -90, false),
      arm(-22, -136, -38, -114, -34, -92, false),
      leg(14, -62, 24, -32, 18, -4),
      leg(-12, -62, -22, -34, -26, 0),
    ),
    // sweep – low spinning leg
    pose(
      head(8, -130),
      torso(4, -86, 50, 42, 64, 0.28),
      arm(28, -116, 44, -92, 48, -68, false),
      arm(-16, -116, -34, -94, -30, -72, false),
      leg(18, -54, 52, -24, 82, -6),
      leg(-4, -54, -16, -28, -18, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- backflip_shot (4 frames: crouch, flip backward, shoot mid-flip, land)
  backflip_shot: [
    // crouch – coil for jump
    pose(
      head(2, -145),
      torso(0, -98, 48, 40, 76, -0.06),
      arm(22, -134, 38, -112, 42, -90, false),
      arm(-22, -134, -36, -114, -34, -92, false),
      leg(12, -60, 24, -28, 18, 0),
      leg(-12, -60, -22, -30, -20, 0),
    ),
    // flip backward – body inverted, arcing back
    pose(
      head(-20, -190),
      torso(-14, -155, 46, 36, 80, -0.50),
      arm(6, -192, -12, -205, -30, -198, true),
      arm(-34, -192, -50, -208, -60, -195, true),
      leg(-2, -115, -18, -138, -28, -160),
      leg(-26, -115, -38, -140, -44, -164),
    ),
    // shoot mid-flip – aiming forward while upside-down
    pose(
      head(-30, -175),
      torso(-24, -140, 46, 36, 80, -0.40),
      arm(-4, -178, 18, -185, 40, -180, true),    // front arm – bow aimed forward
      arm(-44, -178, -30, -182, -20, -175, false), // back arm drew and released
      leg(-12, -100, -24, -125, -32, -148),
      leg(-36, -100, -44, -128, -48, -152),
    ),
    // land – return to ground
    pose(
      head(-10, -186),
      torso(-8, -131, 48, 38, 88, -0.04),
      arm(14, -171, 32, -152, 38, -130, false),
      arm(-30, -171, -44, -150, -42, -128, false),
      leg(4, -85, 12, -44, 10, 0),
      leg(-20, -85, -26, -44, -28, 0),
    ),
  ],

  // ---------- grab (3 frames: reach, bind, recovery) -----------------------
  grab: [
    // reach – lunge forward to grapple
    pose(
      head(14, -183),
      torso(10, -128, 48, 38, 88, 0.16),
      arm(34, -168, 56, -155, 74, -148, true),
      arm(-6, -168, -18, -150, -10, -135, true),
      leg(20, -85, 30, -42, 30, 0),
      leg(-2, -85, -12, -44, -14, 0),
    ),
    // bind – wrap bowstring around opponent
    pose(
      head(18, -182),
      torso(14, -127, 48, 38, 88, 0.20),
      arm(38, -167, 58, -148, 66, -130, false),
      arm(-2, -167, 14, -145, 28, -128, false),
      leg(24, -85, 32, -40, 32, 0),
      leg(2, -85, -8, -44, -10, 0),
    ),
    // recovery
    pose(
      head(6, -185),
      torso(2, -130, 48, 38, 88, 0.04),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-20, -170, -36, -150, -34, -130, false),
      leg(14, -85, 18, -44, 16, 0),
      leg(-10, -85, -18, -44, -20, 0),
    ),
  ],

  // ---------- block_stand (1 frame, bow held across body) ------------------
  block_stand: [
    pose(
      head(2, -186),
      torso(-2, -131, 48, 38, 88, -0.06),
      arm(20, -172, 30, -152, 20, -130, false),    // front arm holds bow vertical
      arm(-24, -172, -14, -150, -10, -128, false),  // back arm braces bow
      leg(10, -85, 14, -44, 12, 0),
      leg(-14, -85, -20, -44, -22, 0),
    ),
  ],

  // ---------- block_crouch (1 frame, crouched guard) -----------------------
  block_crouch: [
    pose(
      head(2, -132),
      torso(-2, -88, 50, 40, 70, -0.08),
      arm(22, -122, 30, -100, 20, -80, false),
      arm(-26, -122, -16, -98, -12, -78, false),
      leg(14, -52, 30, -22, 22, 0),
      leg(-14, -52, -28, -20, -22, 0),
    ),
  ],

  // ---------- hit_stun (2 frames, recoiling) -------------------------------
  hit_stun: [
    // recoil back
    pose(
      head(-8, -182),
      torso(-6, -128, 48, 38, 88, -0.14),
      arm(16, -168, 4, -148, -6, -130, true),
      arm(-28, -168, -44, -148, -50, -130, true),
      leg(6, -85, 10, -44, 8, 0),
      leg(-18, -85, -26, -44, -28, 0),
    ),
    // staggering
    pose(
      head(-12, -180),
      torso(-10, -126, 48, 38, 88, -0.20),
      arm(12, -166, -2, -146, -14, -128, true),
      arm(-32, -166, -48, -146, -56, -128, true),
      leg(2, -85, 6, -44, 4, 0),
      leg(-22, -85, -30, -44, -32, 0),
    ),
  ],

  // ---------- knockdown (2 frames, falling then lying) ---------------------
  knockdown: [
    // falling backward
    pose(
      head(-16, -140),
      torso(-12, -95, 48, 38, 88, -0.50),
      arm(8, -135, -8, -110, -20, -90, true),
      arm(-32, -135, -50, -112, -58, -92, true),
      leg(-2, -55, 8, -28, 12, 0),
      leg(-22, -55, -30, -26, -28, 0),
    ),
    // lying on ground
    pose(
      head(-50, -28),
      torso(-25, -24, 48, 38, 88, -1.50),
      arm(-10, -38, -30, -30, -48, -20, true),
      arm(-40, -38, -58, -28, -72, -18, true),
      leg(0, -12, 20, -8, 38, -2),
      leg(-18, -10, -2, -6, 16, 0),
    ),
  ],

  // ---------- get_up (2 frames, springing up) ------------------------------
  get_up: [
    // pushing up off ground
    pose(
      head(-10, -100),
      torso(-6, -62, 48, 40, 68, -0.30),
      arm(14, -94, 30, -60, 32, -40, false),
      arm(-26, -94, -40, -58, -38, -36, false),
      leg(4, -30, 20, -14, 16, 0),
      leg(-16, -28, -24, -12, -20, 0),
    ),
    // springing to feet
    pose(
      head(2, -175),
      torso(0, -122, 48, 38, 86, -0.02),
      arm(22, -164, 38, -144, 42, -122, false),
      arm(-22, -164, -36, -146, -34, -124, false),
      leg(12, -80, 18, -40, 16, 0),
      leg(-12, -80, -18, -42, -20, 0),
    ),
  ],

  // ---------- victory (2 frames, bow raised triumphantly) ------------------
  victory: [
    // raise bow overhead
    pose(
      head(4, -190),
      torso(0, -134, 48, 38, 90, 0),
      arm(22, -176, 28, -200, 20, -222, false),    // front arm lifts bow high
      arm(-22, -176, -28, -202, -20, -224, false),  // back arm raised too
      leg(12, -88, 18, -46, 16, 0),
      leg(-12, -88, -20, -46, -22, 0),
    ),
    // triumphant hold
    pose(
      head(4, -192),
      torso(0, -136, 48, 38, 90, 0),
      arm(22, -178, 30, -204, 24, -226, true),
      arm(-22, -178, -30, -206, -24, -228, true),
      leg(12, -88, 16, -46, 14, 0),
      leg(-12, -88, -18, -46, -20, 0),
    ),
  ],

  // ---------- defeat (1 frame, collapsed) ----------------------------------
  defeat: [
    pose(
      head(-48, -24),
      torso(-24, -22, 48, 38, 88, -1.55),
      arm(-8, -36, -28, -26, -46, -16, true),
      arm(-40, -34, -56, -24, -70, -14, true),
      leg(2, -10, 22, -6, 40, 0),
      leg(-16, -8, 0, -4, 18, 0),
    ),
  ],
};

// ---- Draw extras (longbow, bowstring, quiver, hood) -----------------------

export function drawElaineExtras(g: Graphics, p: FighterPose, pal: FighterPalette): void {
  const bowColor = pal.weapon ?? 0x8b6914;
  const stringColor = pal.weaponAccent ?? 0xddbb44;
  const quiverColor = 0x775533;
  const arrowTipColor = 0xaaaaaa;

  // -- Longbow (curved arc from front hand) --
  const hx = p.frontArm.handX;
  const hy = p.frontArm.handY;

  // Bow stave – curved arc extending above and below the hand
  const bowLen = 55;
  const bowCurve = 18;

  // Top limb of bow
  g.moveTo(hx, hy);
  g.quadraticCurveTo(hx + bowCurve, hy - bowLen * 0.5, hx + 4, hy - bowLen);
  g.stroke({ color: 0x222222, width: 6, cap: "round" });
  g.moveTo(hx, hy);
  g.quadraticCurveTo(hx + bowCurve, hy - bowLen * 0.5, hx + 4, hy - bowLen);
  g.stroke({ color: bowColor, width: 4, cap: "round" });

  // Bottom limb of bow
  g.moveTo(hx, hy);
  g.quadraticCurveTo(hx + bowCurve, hy + bowLen * 0.5, hx + 4, hy + bowLen);
  g.stroke({ color: 0x222222, width: 6, cap: "round" });
  g.moveTo(hx, hy);
  g.quadraticCurveTo(hx + bowCurve, hy + bowLen * 0.5, hx + 4, hy + bowLen);
  g.stroke({ color: bowColor, width: 4, cap: "round" });

  // Bowstring – straight line from tip to tip
  g.moveTo(hx + 4, hy - bowLen);
  g.lineTo(hx + 4, hy + bowLen);
  g.stroke({ color: stringColor, width: 1.5, cap: "round" });

  // -- Quiver on back (behind torso, near back shoulder) --
  const qx = p.torso.x - 20;
  const qy = p.torso.y - 20;
  const qw = 10;
  const qh = 40;

  // Quiver body outline + fill
  g.roundRect(qx - qw / 2 - 1, qy - 1, qw + 2, qh + 2, 3);
  g.fill({ color: 0x222222 });
  g.roundRect(qx - qw / 2, qy, qw, qh, 3);
  g.fill({ color: quiverColor });

  // Arrow tips sticking out of quiver
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
  }

  // -- Hood outline on head --
  const headX = p.head.x;
  const headY = p.head.y;
  const hr = p.head.radius ?? 24;

  // Hood is a slightly larger arc behind/over the head
  g.moveTo(headX - hr - 4, headY + 6);
  g.quadraticCurveTo(headX - hr - 6, headY - hr - 8, headX, headY - hr - 10);
  g.quadraticCurveTo(headX + hr + 6, headY - hr - 8, headX + hr + 4, headY + 6);
  g.stroke({ color: 0x336633, width: 5, cap: "round", join: "round" });
  g.moveTo(headX - hr - 4, headY + 6);
  g.quadraticCurveTo(headX - hr - 6, headY - hr - 8, headX, headY - hr - 10);
  g.quadraticCurveTo(headX + hr + 6, headY - hr - 8, headX + hr + 4, headY + 6);
  g.stroke({ color: 0x448844, width: 3, cap: "round", join: "round" });
}
