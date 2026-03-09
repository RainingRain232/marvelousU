// ---------------------------------------------------------------------------
// Ector – "The Humble Lord" – Engineer / Gadgeteer archer pose data
// Crossbow engineer with traps, gadgets, leather work vest, practical armor
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette --------------------------------------------------------------

export const ECTOR_PALETTE: FighterPalette = {
  skin: 0xddbb99,           // weathered skin
  body: 0x887766,           // leather work vest
  pants: 0x665544,          // sturdy work pants
  shoes: 0x554433,          // heavy boots
  hair: 0x888888,           // gray / aging hair
  eyes: 0x667755,           // green-gray eyes
  outline: 0x222233,
  gloves: 0x887766,         // leather work gloves
  belt: 0x775533,           // tool belt leather
  accent: 0x998877,         // tool belt accent
  weapon: 0x777788,         // crossbow metal
  weaponAccent: 0x664422,   // crossbow wood stock
};

// ---- Poses ----------------------------------------------------------------

export const ECTOR_POSES: Record<string, FighterPose[]> = {

  // ---------- idle (4 frames, sturdy engineer stance with crossbow ready) ----
  idle: [
    pose(
      head(4, -182),
      torso(0, -128, 50, 40, 88, 0),
      arm(24, -168, 40, -146, 44, -124, false),
      arm(-24, -168, -40, -148, -38, -126, false),
      leg(14, -84, 20, -44, 18, 0),
      leg(-14, -84, -22, -44, -24, 0),
    ),
    pose(
      head(4, -184),
      torso(0, -130, 50, 40, 88, 0),
      arm(24, -170, 40, -148, 44, -126, false),
      arm(-24, -170, -40, -150, -38, -128, false),
      leg(14, -84, 20, -44, 18, 0),
      leg(-14, -84, -22, -44, -24, 0),
    ),
    pose(
      head(4, -182),
      torso(0, -128, 50, 40, 88, 0),
      arm(24, -168, 40, -146, 44, -124, false),
      arm(-24, -168, -40, -148, -38, -126, false),
      leg(14, -84, 20, -44, 18, 0),
      leg(-14, -84, -22, -44, -24, 0),
    ),
    pose(
      head(4, -180),
      torso(0, -126, 50, 40, 88, 0),
      arm(24, -166, 40, -144, 44, -122, false),
      arm(-24, -166, -40, -146, -38, -124, false),
      leg(14, -84, 20, -44, 18, 0),
      leg(-14, -84, -22, -44, -24, 0),
    ),
  ],

  // ---------- walk_forward (4 frames, practical forward stride) -------------
  walk_forward: [
    pose(
      head(7, -182),
      torso(3, -128, 50, 40, 88, 0.04),
      arm(27, -168, 43, -143, 50, -118, false),
      arm(-21, -168, -34, -146, -24, -124, false),
      leg(18, -84, 32, -44, 34, 0),
      leg(-10, -84, -20, -44, -22, 0),
    ),
    pose(
      head(10, -182),
      torso(6, -128, 50, 40, 88, 0.06),
      arm(30, -168, 46, -140, 54, -116, false),
      arm(-18, -168, -30, -144, -20, -120, false),
      leg(22, -84, 38, -42, 44, 0),
      leg(-6, -84, -12, -46, -10, 0),
    ),
    pose(
      head(7, -182),
      torso(3, -128, 50, 40, 88, 0.04),
      arm(27, -168, 42, -146, 48, -120, false),
      arm(-21, -168, -36, -148, -26, -126, false),
      leg(18, -84, 24, -44, 22, 0),
      leg(-10, -84, -26, -42, -32, 0),
    ),
    pose(
      head(10, -182),
      torso(6, -128, 50, 40, 88, 0.06),
      arm(30, -168, 44, -142, 52, -118, false),
      arm(-18, -168, -28, -144, -22, -122, false),
      leg(22, -84, 16, -46, 10, 0),
      leg(-6, -84, -32, -40, -40, 0),
    ),
  ],

  // ---------- walk_back (4 frames, cautious backstep) ----------------------
  walk_back: [
    pose(
      head(-2, -182),
      torso(-4, -128, 50, 40, 88, -0.04),
      arm(20, -168, 36, -148, 40, -126, false),
      arm(-28, -168, -44, -146, -42, -124, false),
      leg(10, -84, 12, -44, 10, 0),
      leg(-18, -84, -30, -44, -34, 0),
    ),
    pose(
      head(-5, -182),
      torso(-7, -128, 50, 40, 88, -0.06),
      arm(17, -168, 32, -150, 36, -128, false),
      arm(-31, -168, -48, -144, -46, -120, false),
      leg(6, -84, 0, -46, -4, 0),
      leg(-22, -84, -38, -42, -44, 0),
    ),
    pose(
      head(-2, -182),
      torso(-4, -128, 50, 40, 88, -0.04),
      arm(20, -168, 36, -148, 40, -126, false),
      arm(-28, -168, -44, -146, -42, -124, false),
      leg(10, -84, 18, -44, 20, 0),
      leg(-18, -84, -24, -46, -22, 0),
    ),
    pose(
      head(-5, -182),
      torso(-7, -128, 50, 40, 88, -0.06),
      arm(17, -168, 34, -146, 38, -124, false),
      arm(-31, -168, -46, -148, -44, -124, false),
      leg(6, -84, 22, -42, 26, 0),
      leg(-22, -84, -20, -46, -16, 0),
    ),
  ],

  // ---------- crouch (1 frame, low practical crouch) -----------------------
  crouch: [
    pose(
      head(4, -128),
      torso(0, -84, 52, 42, 68, 0.08),
      arm(26, -116, 42, -92, 46, -70, false),
      arm(-26, -116, -40, -94, -36, -72, false),
      leg(16, -48, 36, -20, 26, 0),
      leg(-16, -48, -32, -18, -22, 0),
    ),
  ],

  // ---------- jump (2 frames, practical leap) ------------------------------
  jump: [
    // rising
    pose(
      head(4, -198),
      torso(0, -148, 50, 38, 82, -0.04),
      arm(24, -186, 44, -168, 50, -152, true),
      arm(-24, -186, -42, -170, -48, -156, true),
      leg(14, -106, 24, -84, 20, -60),
      leg(-14, -106, -22, -80, -18, -56),
    ),
    // peak
    pose(
      head(4, -206),
      torso(0, -156, 50, 38, 80, 0),
      arm(24, -194, 48, -178, 56, -166, true),
      arm(-24, -194, -46, -180, -54, -168, true),
      leg(14, -116, 30, -98, 24, -76),
      leg(-14, -116, -28, -94, -20, -70),
    ),
  ],

  // ---------- light_high (3 frames: startup, stock jab, recovery) ----------
  light_high: [
    // startup – pull crossbow back
    pose(
      head(6, -182),
      torso(3, -128, 50, 40, 88, 0.08),
      arm(27, -168, 16, -152, 2, -138, false),
      arm(-21, -168, -38, -152, -42, -138, false),
      leg(16, -84, 22, -44, 20, 0),
      leg(-12, -84, -20, -44, -22, 0),
    ),
    // stock jab – thrust crossbow forward
    pose(
      head(10, -181),
      torso(6, -127, 50, 40, 88, 0.14),
      arm(30, -167, 54, -156, 74, -148, false),
      arm(-18, -167, -30, -148, -22, -134, false),
      leg(20, -84, 26, -44, 24, 0),
      leg(-8, -84, -16, -44, -18, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- med_high (3 frames: startup, crossbow swing, recovery) -------
  med_high: [
    // startup – wind crossbow to the side
    pose(
      head(3, -182),
      torso(0, -128, 50, 40, 88, -0.10),
      arm(24, -168, 10, -158, -8, -146, false),
      arm(-24, -168, -42, -158, -54, -146, false),
      leg(14, -84, 20, -44, 18, 0),
      leg(-14, -84, -22, -44, -24, 0),
    ),
    // crossbow swing – horizontal arc
    pose(
      head(12, -180),
      torso(6, -126, 50, 40, 88, 0.20),
      arm(32, -166, 58, -152, 80, -142, false),
      arm(-12, -166, -22, -146, -10, -130, false),
      leg(20, -84, 26, -42, 26, 0),
      leg(-6, -84, -16, -44, -18, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- heavy_high (4 frames: windup, overhead slam, impact, recovery)
  heavy_high: [
    // windup – raise crossbow high
    pose(
      head(2, -184),
      torso(0, -130, 50, 40, 88, -0.06),
      arm(24, -170, 20, -194, 24, -210, false),
      arm(-24, -170, -20, -196, -22, -212, false),
      leg(14, -84, 18, -44, 16, 0),
      leg(-14, -84, -20, -44, -22, 0),
    ),
    // overhead slam – bring crossbow down
    pose(
      head(12, -178),
      torso(6, -124, 50, 40, 88, 0.22),
      arm(32, -164, 56, -146, 70, -118, false),
      arm(-8, -164, 8, -144, 20, -116, false),
      leg(20, -84, 30, -42, 30, 0),
      leg(-6, -84, -14, -44, -16, 0),
    ),
    // impact – crossbow hits low
    pose(
      head(14, -176),
      torso(8, -122, 50, 40, 88, 0.26),
      arm(34, -162, 60, -132, 74, -102, false),
      arm(-4, -162, 14, -132, 26, -102, false),
      leg(22, -84, 32, -40, 32, 0),
      leg(-4, -84, -12, -44, -14, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- light_low (3 frames: startup, shin kick, recovery) -----------
  light_low: [
    // startup – shift weight
    pose(
      head(4, -181),
      torso(2, -127, 50, 40, 88, 0.06),
      arm(26, -167, 42, -146, 46, -124, false),
      arm(-22, -167, -38, -146, -36, -126, false),
      leg(16, -84, 26, -48, 22, -10),
      leg(-12, -84, -24, -40, -28, 0),
    ),
    // shin kick – snap forward
    pose(
      head(8, -180),
      torso(4, -126, 50, 40, 88, 0.10),
      arm(28, -166, 44, -144, 48, -120, false),
      arm(-20, -166, -34, -144, -32, -122, false),
      leg(20, -84, 44, -52, 72, -28),
      leg(-8, -84, -24, -38, -30, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- med_low (3 frames: startup, wrench swipe, recovery) ----------
  med_low: [
    // startup – drop low
    pose(
      head(6, -152),
      torso(3, -102, 50, 42, 76, 0.12),
      arm(27, -140, 43, -116, 47, -92, false),
      arm(-21, -140, -36, -118, -32, -96, false),
      leg(18, -64, 34, -34, 32, -6),
      leg(-10, -64, -20, -36, -22, 0),
    ),
    // wrench swipe – extend low along ground
    pose(
      head(12, -118),
      torso(8, -78, 52, 44, 58, 0.30),
      arm(32, -106, 50, -82, 54, -58, false),
      arm(-14, -106, -30, -86, -26, -64, false),
      leg(24, -48, 54, -22, 84, -8),
      leg(-4, -48, -18, -28, -22, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- heavy_low (4 frames: windup, boot sweep, hold, recovery) -----
  heavy_low: [
    // windup – coil down
    pose(
      head(3, -158),
      torso(0, -106, 50, 42, 78, -0.08),
      arm(24, -144, 38, -122, 42, -98, false),
      arm(-24, -144, -40, -124, -38, -102, false),
      leg(14, -66, 22, -36, 18, -4),
      leg(-14, -66, -26, -34, -30, 0),
    ),
    // boot sweep – full rotation low
    pose(
      head(8, -132),
      torso(4, -88, 52, 44, 66, 0.24),
      arm(30, -120, 48, -96, 52, -72, false),
      arm(-16, -120, -34, -98, -30, -76, false),
      leg(20, -54, 52, -28, 88, -10),
      leg(-6, -54, -20, -30, -24, 0),
    ),
    // hold – leg extended
    pose(
      head(10, -135),
      torso(6, -90, 52, 44, 66, 0.20),
      arm(32, -122, 50, -98, 54, -74, false),
      arm(-14, -122, -32, -100, -28, -78, false),
      leg(22, -56, 58, -30, 84, -6),
      leg(-4, -56, -18, -32, -20, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- crossbow_bolt (3 frames: aim, fire, recovery) ----------------
  crossbow_bolt: [
    // aim – level crossbow forward
    pose(
      head(6, -184),
      torso(2, -130, 50, 40, 88, 0.10),
      arm(28, -170, 50, -164, 66, -158, true),
      arm(-20, -170, -12, -162, -28, -156, false),
      leg(16, -84, 22, -44, 20, 0),
      leg(-12, -84, -22, -44, -24, 0),
    ),
    // fire – bolt released, slight recoil
    pose(
      head(8, -182),
      torso(4, -128, 50, 40, 88, 0.14),
      arm(30, -168, 54, -162, 72, -156, true),
      arm(-18, -168, -10, -160, -24, -148, true),
      leg(18, -84, 24, -44, 22, 0),
      leg(-10, -84, -20, -44, -22, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- bomb_lob (4 frames: reach, lob arc, explosion, recovery) -----
  bomb_lob: [
    // reach back for bomb
    pose(
      head(2, -183),
      torso(0, -129, 50, 40, 88, -0.10),
      arm(22, -169, 8, -158, -8, -145, false),
      arm(-26, -169, -44, -156, -52, -140, false),
      leg(14, -84, 20, -44, 18, 0),
      leg(-14, -84, -22, -44, -24, 0),
    ),
    // lob arc – arm overhead throwing
    pose(
      head(8, -184),
      torso(4, -130, 50, 40, 88, 0.08),
      arm(28, -172, 36, -198, 42, -218, false),
      arm(-20, -172, -30, -152, -24, -132, false),
      leg(18, -84, 24, -44, 22, 0),
      leg(-10, -84, -20, -44, -22, 0),
    ),
    // bomb in flight – follow through
    pose(
      head(12, -181),
      torso(6, -127, 50, 40, 88, 0.16),
      arm(32, -167, 54, -158, 68, -148, false),
      arm(-16, -167, -26, -150, -18, -134, false),
      leg(20, -84, 26, -42, 26, 0),
      leg(-8, -84, -16, -44, -18, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- caltrops (3 frames: crouch, scatter, recovery) ---------------
  caltrops: [
    // crouch down, reach for caltrops
    pose(
      head(4, -146),
      torso(2, -98, 50, 42, 70, 0.10),
      arm(24, -130, 32, -94, 38, -58, false),
      arm(-24, -130, -30, -98, -26, -72, false),
      leg(16, -62, 26, -32, 24, 0),
      leg(-12, -62, -20, -32, -18, 0),
    ),
    // scatter caltrops on ground
    pose(
      head(8, -142),
      torso(6, -94, 50, 42, 68, 0.16),
      arm(26, -126, 46, -68, 58, -14, false),
      arm(-22, -126, -24, -88, -20, -58, false),
      leg(18, -58, 28, -30, 26, 0),
      leg(-10, -58, -16, -32, -16, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- retreat_shot (3 frames: crouch, backflip+fire, land) ----------
  retreat_shot: [
    // crouch – coil for jump back
    pose(
      head(2, -144),
      torso(0, -96, 50, 42, 74, -0.06),
      arm(24, -132, 40, -110, 44, -88, false),
      arm(-24, -132, -38, -112, -36, -90, false),
      leg(14, -58, 26, -28, 20, 0),
      leg(-14, -58, -24, -30, -22, 0),
    ),
    // backflip + fire – body inverted, crossbow aimed forward
    pose(
      head(-18, -188),
      torso(-12, -152, 48, 38, 78, -0.45),
      arm(8, -190, -10, -202, -28, -196, true),
      arm(-32, -190, -48, -206, -58, -192, true),
      leg(0, -112, -16, -136, -26, -158),
      leg(-24, -112, -36, -138, -42, -162),
    ),
    // land – return to ground
    pose(
      head(-8, -184),
      torso(-6, -130, 50, 40, 88, -0.04),
      arm(16, -170, 34, -150, 40, -128, false),
      arm(-32, -170, -46, -148, -44, -126, false),
      leg(6, -84, 14, -44, 12, 0),
      leg(-22, -84, -28, -44, -30, 0),
    ),
  ],

  // ---------- rapid_bolts (3 frames: draw, rapid fire, recovery) -----------
  rapid_bolts: [
    // draw – level crossbow
    pose(
      head(5, -184),
      torso(0, -130, 50, 40, 88, -0.04),
      arm(24, -170, 12, -154, -4, -142, false),
      arm(-24, -170, -40, -152, -48, -136, false),
      leg(14, -84, 18, -44, 20, 0),
      leg(-14, -84, -20, -44, -22, 0),
    ),
    // rapid fire – bolts releasing in burst
    pose(
      head(8, -181),
      torso(4, -127, 50, 40, 88, 0.08),
      arm(26, -167, 56, -156, 92, -150, false),
      arm(-22, -167, -32, -148, -26, -128, false),
      leg(16, -84, 20, -44, 22, 0),
      leg(-12, -84, -18, -44, -20, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88),
      arm(25, -168, 40, -146, 44, -124, false),
      arm(-23, -168, -40, -148, -38, -126, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -22, -44, -24, 0),
    ),
  ],

  // ---------- grab (3 frames: reach, wrench strike, recovery) --------------
  grab: [
    // reach – lunge forward to grab
    pose(
      head(12, -180),
      torso(8, -126, 50, 40, 88, 0.16),
      arm(34, -166, 58, -152, 76, -146, true),
      arm(-8, -166, -20, -148, -12, -132, true),
      leg(22, -84, 32, -42, 32, 0),
      leg(-4, -84, -14, -44, -16, 0),
    ),
    // wrench strike – bash with wrench
    pose(
      head(16, -179),
      torso(12, -125, 50, 40, 88, 0.20),
      arm(38, -165, 60, -146, 68, -128, false),
      arm(-4, -165, 12, -142, 26, -126, false),
      leg(26, -84, 34, -40, 34, 0),
      leg(0, -84, -10, -44, -12, 0),
    ),
    // recovery
    pose(
      head(5, -182),
      torso(1, -128, 50, 40, 88, 0.04),
      arm(25, -168, 42, -148, 46, -126, false),
      arm(-23, -168, -38, -148, -36, -128, false),
      leg(15, -84, 20, -44, 18, 0),
      leg(-13, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- block_stand (1 frame, crossbow held defensively) -------------
  block_stand: [
    pose(
      head(2, -184),
      torso(-2, -130, 50, 40, 88, -0.06),
      arm(22, -170, 32, -150, 22, -128, false),
      arm(-26, -170, -16, -148, -12, -126, false),
      leg(12, -84, 16, -44, 14, 0),
      leg(-16, -84, -22, -44, -24, 0),
    ),
  ],

  // ---------- block_crouch (1 frame, crouched guard) -----------------------
  block_crouch: [
    pose(
      head(2, -130),
      torso(-2, -86, 52, 42, 68, -0.08),
      arm(24, -120, 32, -98, 22, -78, false),
      arm(-28, -120, -18, -96, -14, -76, false),
      leg(16, -50, 32, -22, 24, 0),
      leg(-16, -50, -30, -20, -24, 0),
    ),
  ],

  // ---------- hit_stun (2 frames, recoiling from hit) ----------------------
  hit_stun: [
    // recoil back
    pose(
      head(-8, -180),
      torso(-6, -126, 50, 40, 88, -0.14),
      arm(18, -166, 6, -146, -4, -128, true),
      arm(-30, -166, -46, -146, -52, -128, true),
      leg(8, -84, 12, -44, 10, 0),
      leg(-20, -84, -28, -44, -30, 0),
    ),
    // staggering
    pose(
      head(-12, -178),
      torso(-10, -124, 50, 40, 88, -0.20),
      arm(14, -164, 0, -144, -12, -126, true),
      arm(-34, -164, -50, -144, -58, -126, true),
      leg(4, -84, 8, -44, 6, 0),
      leg(-24, -84, -32, -44, -34, 0),
    ),
  ],

  // ---------- knockdown (2 frames, falling then lying) ---------------------
  knockdown: [
    // falling backward
    pose(
      head(-14, -138),
      torso(-10, -94, 50, 40, 88, -0.50),
      arm(10, -133, -6, -108, -18, -88, true),
      arm(-30, -133, -48, -110, -56, -90, true),
      leg(0, -54, 10, -28, 14, 0),
      leg(-20, -54, -28, -26, -26, 0),
    ),
    // lying on ground
    pose(
      head(-48, -26),
      torso(-24, -22, 50, 40, 88, -1.50),
      arm(-8, -36, -28, -28, -46, -18, true),
      arm(-38, -36, -56, -26, -70, -16, true),
      leg(2, -10, 22, -6, 40, 0),
      leg(-16, -8, 2, -4, 18, 0),
    ),
  ],

  // ---------- get_up (2 frames, pushing up steadily) -----------------------
  get_up: [
    // pushing up off ground
    pose(
      head(-8, -98),
      torso(-4, -60, 50, 42, 66, -0.30),
      arm(16, -92, 32, -58, 34, -38, false),
      arm(-28, -92, -42, -56, -40, -34, false),
      leg(6, -28, 22, -14, 18, 0),
      leg(-18, -26, -26, -12, -22, 0),
    ),
    // standing up
    pose(
      head(2, -172),
      torso(0, -120, 50, 40, 84, -0.02),
      arm(24, -162, 40, -142, 44, -120, false),
      arm(-24, -162, -38, -144, -36, -122, false),
      leg(14, -78, 20, -40, 18, 0),
      leg(-14, -78, -20, -42, -22, 0),
    ),
  ],

  // ---------- victory (2 frames, crossbow raised triumphantly) -------------
  victory: [
    // raise crossbow overhead
    pose(
      head(4, -188),
      torso(0, -132, 50, 40, 90, 0),
      arm(24, -174, 30, -198, 22, -220, false),
      arm(-24, -174, -30, -200, -22, -222, false),
      leg(14, -86, 20, -46, 18, 0),
      leg(-14, -86, -22, -46, -24, 0),
    ),
    // triumphant hold
    pose(
      head(4, -190),
      torso(0, -134, 50, 40, 90, 0),
      arm(24, -176, 32, -202, 26, -224, true),
      arm(-24, -176, -32, -204, -26, -226, true),
      leg(14, -86, 18, -46, 16, 0),
      leg(-14, -86, -20, -46, -22, 0),
    ),
  ],

  // ---------- defeat (1 frame, collapsed) ----------------------------------
  defeat: [
    pose(
      head(-46, -22),
      torso(-22, -20, 50, 40, 88, -1.55),
      arm(-6, -34, -26, -24, -44, -14, true),
      arm(-38, -32, -54, -22, -68, -12, true),
      leg(4, -8, 24, -4, 42, 0),
      leg(-14, -6, 2, -2, 20, 0),
    ),
  ],
};

// ---- Draw extras (crossbow, tool belt, practical armor details) -----------

export function drawEctorExtras(g: Graphics, p: FighterPose, pal: FighterPalette, isFlashing: boolean, flashColor: number): void {
  const metalColor = pal.weapon ?? 0x777788;
  const woodColor = pal.weaponAccent ?? 0x664422;
  const beltColor = pal.accent ?? 0x998877;
  const hairColor = isFlashing ? flashColor : (pal.hair ?? 0x888888);

  // -- Short gray hair (practical, no-nonsense) --
  const headX = p.head.x;
  const headY = p.head.y;
  const hr = p.head.radius ?? 24;

  // Short cropped hair on top and sides
  g.moveTo(headX - hr + 2, headY - 4);
  g.quadraticCurveTo(headX - hr - 2, headY - hr - 4, headX, headY - hr - 6);
  g.quadraticCurveTo(headX + hr + 2, headY - hr - 4, headX + hr - 2, headY - 4);
  g.lineTo(headX + hr - 4, headY + 2);
  g.quadraticCurveTo(headX + hr - 2, headY - hr - 2, headX, headY - hr - 4);
  g.quadraticCurveTo(headX - hr + 2, headY - hr - 2, headX - hr + 4, headY + 2);
  g.closePath();
  g.fill({ color: 0x222233 });

  // Hair fill
  g.moveTo(headX - hr + 3, headY - 3);
  g.quadraticCurveTo(headX - hr, headY - hr - 2, headX, headY - hr - 4);
  g.quadraticCurveTo(headX + hr, headY - hr - 2, headX + hr - 3, headY - 3);
  g.lineTo(headX + hr - 5, headY + 1);
  g.quadraticCurveTo(headX + hr - 1, headY - hr, headX, headY - hr - 2);
  g.quadraticCurveTo(headX - hr + 1, headY - hr, headX - hr + 5, headY + 1);
  g.closePath();
  g.fill({ color: hairColor });

  // -- Bushy eyebrows (aging, experienced look) --
  g.moveTo(headX + 2, headY - 10);
  g.lineTo(headX + 14, headY - 12);
  g.stroke({ color: hairColor, width: 2.5, cap: "round" });
  g.moveTo(headX - 6, headY - 9);
  g.lineTo(headX + 1, headY - 11);
  g.stroke({ color: hairColor, width: 2 });

  // -- Short beard / stubble --
  g.moveTo(headX - 4, headY + 10);
  g.quadraticCurveTo(headX + 4, headY + 16, headX + 12, headY + 10);
  g.stroke({ color: hairColor, width: 2, cap: "round" });
  g.moveTo(headX - 2, headY + 12);
  g.quadraticCurveTo(headX + 5, headY + 18, headX + 10, headY + 12);
  g.stroke({ color: hairColor, width: 1.5, cap: "round", alpha: 0.6 });

  // -- Crossbow (boxy / mechanical, different from bow) --
  const hx = p.frontArm.handX;
  const hy = p.frontArm.handY;

  // Crossbow stock (wooden body, horizontal)
  const stockLen = 38;
  const stockW = 5;

  // Stock outline
  g.rect(hx - 4, hy - stockW / 2 - 1, stockLen + 5, stockW + 2);
  g.fill({ color: 0x222233 });
  // Stock fill (wood)
  g.rect(hx - 3, hy - stockW / 2, stockLen + 3, stockW);
  g.fill({ color: woodColor });

  // Crossbow prod (the horizontal bow limbs at the front) - metal
  const prodX = hx + stockLen - 4;
  const prodLen = 22;

  // Top limb outline + fill
  g.moveTo(prodX, hy);
  g.lineTo(prodX + 6, hy - prodLen);
  g.stroke({ color: 0x222233, width: 5, cap: "round" });
  g.moveTo(prodX, hy);
  g.lineTo(prodX + 6, hy - prodLen);
  g.stroke({ color: metalColor, width: 3, cap: "round" });

  // Bottom limb outline + fill
  g.moveTo(prodX, hy);
  g.lineTo(prodX + 6, hy + prodLen);
  g.stroke({ color: 0x222233, width: 5, cap: "round" });
  g.moveTo(prodX, hy);
  g.lineTo(prodX + 6, hy + prodLen);
  g.stroke({ color: metalColor, width: 3, cap: "round" });

  // Crossbow string
  g.moveTo(prodX + 6, hy - prodLen);
  g.lineTo(prodX + 6, hy + prodLen);
  g.stroke({ color: 0xcccccc, width: 1.2, cap: "round" });

  // Trigger mechanism (small rectangle on underside of stock)
  g.rect(hx + 8, hy + stockW / 2, 8, 6);
  g.fill({ color: metalColor });
  g.rect(hx + 8, hy + stockW / 2, 8, 6);
  g.stroke({ color: 0x222233, width: 1 });

  // Metal rail on top of stock
  g.moveTo(hx + 2, hy - stockW / 2);
  g.lineTo(hx + stockLen - 2, hy - stockW / 2);
  g.stroke({ color: metalColor, width: 1.5 });

  // -- Tool belt details --
  if (p.torso) {
    const t = p.torso;
    const beltY = t.y + t.height / 2 - 6;

    // Tool belt pouch (left side)
    g.roundRect(t.x + t.bottomWidth / 2 - 2, beltY - 3, 10, 12, 2);
    g.fill({ color: beltColor });
    g.roundRect(t.x + t.bottomWidth / 2 - 2, beltY - 3, 10, 12, 2);
    g.stroke({ color: 0x222233, width: 1 });

    // Wrench hanging from belt
    g.moveTo(t.x + t.bottomWidth / 2 + 10, beltY);
    g.lineTo(t.x + t.bottomWidth / 2 + 10, beltY + 14);
    g.stroke({ color: metalColor, width: 2, cap: "round" });
    // Wrench head
    g.circle(t.x + t.bottomWidth / 2 + 10, beltY + 16, 3);
    g.stroke({ color: metalColor, width: 1.5 });

    // Small pouch (right side)
    g.roundRect(t.x - t.bottomWidth / 2 - 8, beltY - 2, 8, 10, 2);
    g.fill({ color: beltColor });
    g.roundRect(t.x - t.bottomWidth / 2 - 8, beltY - 2, 8, 10, 2);
    g.stroke({ color: 0x222233, width: 1 });

    // Belt buckle (practical square buckle)
    g.rect(t.x - 4, beltY, 8, 6);
    g.fill({ color: metalColor });
    g.rect(t.x - 4, beltY, 8, 6);
    g.stroke({ color: 0x222233, width: 1 });
  }

  // -- Leather vest detail lines (practical armor stitching) --
  if (p.torso) {
    const t = p.torso;
    // Vest collar
    g.moveTo(t.x - 8, t.y - t.height / 2 + 4);
    g.lineTo(t.x, t.y - t.height / 2 + 10);
    g.lineTo(t.x + 8, t.y - t.height / 2 + 4);
    g.stroke({ color: 0x222233, width: 1.2 });

    // Center seam
    g.moveTo(t.x, t.y - t.height / 2 + 10);
    g.lineTo(t.x, t.y + t.height / 2 - 8);
    g.stroke({ color: 0x222233, width: 0.8, alpha: 0.5 });

    // Rivets (small metal dots)
    g.circle(t.x + 10, t.y - 8, 1.5);
    g.fill({ color: metalColor });
    g.circle(t.x + 10, t.y + 4, 1.5);
    g.fill({ color: metalColor });
    g.circle(t.x - 10, t.y - 8, 1.5);
    g.fill({ color: metalColor });
    g.circle(t.x - 10, t.y + 4, 1.5);
    g.fill({ color: metalColor });
  }

  // -- Bolt quiver on back (small case for crossbow bolts) --
  const qx = p.torso.x - 22;
  const qy = p.torso.y - 18;
  const qw = 8;
  const qh = 32;

  // Quiver body
  g.roundRect(qx - qw / 2 - 1, qy - 1, qw + 2, qh + 2, 2);
  g.fill({ color: 0x222233 });
  g.roundRect(qx - qw / 2, qy, qw, qh, 2);
  g.fill({ color: woodColor });

  // Quiver strap
  g.moveTo(qx, qy + 2);
  g.lineTo(qx + 14, qy - 10);
  g.stroke({ color: woodColor, width: 2 });

  // Bolt tips sticking out
  for (let i = 0; i < 3; i++) {
    const bx = qx - 2 + i * 2;
    const by = qy - 1;
    g.moveTo(bx, by);
    g.lineTo(bx, by - 6);
    g.stroke({ color: metalColor, width: 1.2, cap: "round" });
    // Bolt point
    g.moveTo(bx - 1.5, by - 5);
    g.lineTo(bx, by - 8);
    g.lineTo(bx + 1.5, by - 5);
    g.closePath();
    g.fill({ color: metalColor });
  }
}
