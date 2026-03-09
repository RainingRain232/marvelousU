// ---------------------------------------------------------------------------
// Uther – "The Pendragon" – Crossbow / Archer fighter pose data
// Regal older king with heavy crossbow, dragon-themed red/gold royal armor
// ---------------------------------------------------------------------------

import { FighterPose, FighterPalette, pose, arm, leg, torso, head } from "./DuelSkeletonRenderer";
import { Graphics } from "pixi.js";

// ---- Palette --------------------------------------------------------------

export const UTHER_PALETTE: FighterPalette = {
  skin: 0xddbb99,          // weathered older skin
  body: 0x993322,           // red/gold royal armor
  pants: 0x663322,          // dark red-brown pants
  shoes: 0x554433,          // dark leather boots
  hair: 0xaaaaaa,           // silver/gray hair
  eyes: 0x667788,           // steel-blue eyes
  outline: 0x222233,        // dark outline
  gloves: 0x993322,         // red gauntlets
  belt: 0x774411,           // gold-brown belt
  weapon: 0x888899,         // crossbow metal
  weaponAccent: 0xcc4422,   // dragon red accents
};

// Accent color for dragon details
const ACCENT = 0xcc4422;

// ---- Poses ----------------------------------------------------------------

export const UTHER_POSES: Record<string, FighterPose[]> = {

  // ---------- idle (4 frames, regal upright stance with subtle sway) --------
  idle: [
    pose(
      head(4, -190),
      torso(0, -135, 52, 42, 92, 0),
      arm(24, -176, 42, -155, 48, -132, false),
      arm(-24, -176, -40, -157, -38, -135, false),
      leg(14, -88, 20, -46, 18, 0),
      leg(-14, -88, -22, -46, -24, 0),
    ),
    pose(
      head(4, -192),
      torso(0, -137, 52, 42, 92, 0),
      arm(24, -178, 42, -157, 48, -134, false),
      arm(-24, -178, -40, -159, -38, -137, false),
      leg(14, -88, 20, -46, 18, 0),
      leg(-14, -88, -22, -46, -24, 0),
    ),
    pose(
      head(4, -190),
      torso(0, -135, 52, 42, 92, 0),
      arm(24, -176, 42, -155, 48, -132, false),
      arm(-24, -176, -40, -157, -38, -135, false),
      leg(14, -88, 20, -46, 18, 0),
      leg(-14, -88, -22, -46, -24, 0),
    ),
    pose(
      head(4, -188),
      torso(0, -133, 52, 42, 92, 0),
      arm(24, -174, 42, -153, 48, -130, false),
      arm(-24, -174, -40, -155, -38, -133, false),
      leg(14, -88, 20, -46, 18, 0),
      leg(-14, -88, -22, -46, -24, 0),
    ),
  ],

  // ---------- walk_forward (4 frames, measured regal stride) ----------------
  walk_forward: [
    pose(
      head(6, -190),
      torso(3, -135, 52, 42, 92, 0.03),
      arm(27, -176, 44, -152, 52, -128, false),
      arm(-21, -176, -34, -155, -26, -132, false),
      leg(18, -88, 30, -46, 32, 0),
      leg(-10, -88, -20, -46, -22, 0),
    ),
    pose(
      head(10, -190),
      torso(6, -135, 52, 42, 92, 0.05),
      arm(30, -176, 48, -150, 56, -126, false),
      arm(-18, -176, -30, -152, -22, -128, false),
      leg(22, -88, 38, -44, 42, 0),
      leg(-6, -88, -12, -48, -10, 0),
    ),
    pose(
      head(6, -190),
      torso(3, -135, 52, 42, 92, 0.03),
      arm(27, -176, 44, -154, 50, -130, false),
      arm(-21, -176, -36, -156, -28, -134, false),
      leg(18, -88, 22, -46, 20, 0),
      leg(-10, -88, -26, -44, -32, 0),
    ),
    pose(
      head(10, -190),
      torso(6, -135, 52, 42, 92, 0.05),
      arm(30, -176, 46, -152, 54, -128, false),
      arm(-18, -176, -32, -154, -24, -130, false),
      leg(22, -88, 16, -48, 10, 0),
      leg(-6, -88, -32, -42, -40, 0),
    ),
  ],

  // ---------- walk_back (4 frames, guarded retreat) -------------------------
  walk_back: [
    pose(
      head(-2, -190),
      torso(-3, -135, 52, 42, 92, -0.03),
      arm(20, -176, 38, -157, 42, -135, false),
      arm(-28, -176, -44, -155, -42, -132, false),
      leg(10, -88, 12, -46, 10, 0),
      leg(-18, -88, -30, -46, -34, 0),
    ),
    pose(
      head(-6, -190),
      torso(-6, -135, 52, 42, 92, -0.05),
      arm(16, -176, 34, -159, 38, -137, false),
      arm(-32, -176, -48, -153, -46, -130, false),
      leg(6, -88, 0, -48, -4, 0),
      leg(-22, -88, -38, -44, -44, 0),
    ),
    pose(
      head(-2, -190),
      torso(-3, -135, 52, 42, 92, -0.03),
      arm(20, -176, 38, -157, 42, -135, false),
      arm(-28, -176, -44, -155, -42, -132, false),
      leg(10, -88, 18, -46, 20, 0),
      leg(-18, -88, -24, -48, -22, 0),
    ),
    pose(
      head(-6, -190),
      torso(-6, -135, 52, 42, 92, -0.05),
      arm(16, -176, 36, -155, 40, -133, false),
      arm(-32, -176, -46, -157, -44, -134, false),
      leg(6, -88, 22, -44, 26, 0),
      leg(-22, -88, -20, -48, -16, 0),
    ),
  ],

  // ---------- crouch (1 frame, crouched guard) ------------------------------
  crouch: [
    pose(
      head(4, -138),
      torso(0, -92, 54, 44, 74, 0.06),
      arm(26, -126, 44, -102, 48, -78, false),
      arm(-26, -126, -42, -104, -38, -80, false),
      leg(16, -54, 36, -22, 26, 0),
      leg(-16, -54, -32, -20, -22, 0),
    ),
  ],

  // ---------- jump (2 frames, heavy but commanding leap) --------------------
  jump: [
    // rising
    pose(
      head(4, -205),
      torso(0, -155, 52, 40, 86, -0.03),
      arm(24, -192, 44, -175, 52, -160, true),
      arm(-24, -192, -42, -177, -50, -162, true),
      leg(14, -112, 24, -88, 20, -65),
      leg(-14, -112, -22, -86, -18, -62),
    ),
    // peak
    pose(
      head(4, -215),
      torso(0, -163, 52, 40, 84, 0),
      arm(24, -200, 48, -185, 58, -172, true),
      arm(-24, -200, -46, -187, -54, -174, true),
      leg(14, -122, 30, -104, 24, -82),
      leg(-14, -122, -28, -100, -20, -76),
    ),
  ],

  // ---------- light_high (3 frames: startup, stock jab, recovery) -----------
  light_high: [
    // startup – pull crossbow back
    pose(
      head(6, -190),
      torso(3, -135, 52, 42, 92, 0.06),
      arm(26, -176, 16, -160, 2, -146, false),
      arm(-22, -176, -38, -160, -42, -146, false),
      leg(16, -88, 22, -46, 20, 0),
      leg(-12, -88, -20, -46, -22, 0),
    ),
    // stock jab – thrust crossbow stock forward
    pose(
      head(10, -189),
      torso(6, -134, 52, 42, 92, 0.12),
      arm(30, -175, 54, -164, 76, -156, false),
      arm(-18, -175, -30, -156, -22, -140, false),
      leg(20, -88, 26, -46, 24, 0),
      leg(-8, -88, -16, -46, -18, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- med_high (3 frames: windup, crossbow swing, recovery) ---------
  med_high: [
    // windup – wind crossbow to the side
    pose(
      head(2, -190),
      torso(0, -135, 52, 42, 92, -0.08),
      arm(24, -176, 10, -166, -8, -154, false),
      arm(-24, -176, -42, -166, -54, -154, false),
      leg(14, -88, 20, -46, 18, 0),
      leg(-14, -88, -22, -46, -24, 0),
    ),
    // crossbow swing – horizontal arc with heavy crossbow
    pose(
      head(12, -188),
      torso(6, -133, 52, 42, 92, 0.18),
      arm(32, -174, 58, -160, 82, -150, false),
      arm(-12, -174, -22, -154, -10, -138, false),
      leg(20, -88, 26, -44, 26, 0),
      leg(-6, -88, -16, -46, -18, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- heavy_high (4 frames: windup, overhead slam, impact, recovery)
  heavy_high: [
    // windup – raise crossbow high overhead
    pose(
      head(2, -192),
      torso(0, -136, 52, 42, 92, -0.04),
      arm(24, -178, 20, -200, 24, -218, false),
      arm(-24, -178, -20, -202, -22, -220, false),
      leg(14, -88, 18, -46, 16, 0),
      leg(-14, -88, -20, -46, -22, 0),
    ),
    // overhead slam – bring crossbow down hard
    pose(
      head(12, -186),
      torso(6, -131, 52, 42, 92, 0.20),
      arm(32, -172, 56, -154, 70, -126, false),
      arm(-8, -172, 8, -152, 20, -124, false),
      leg(20, -88, 30, -44, 30, 0),
      leg(-6, -88, -14, -46, -16, 0),
    ),
    // impact – crossbow hits low
    pose(
      head(14, -184),
      torso(8, -130, 52, 42, 92, 0.24),
      arm(34, -170, 60, -140, 74, -110, false),
      arm(-4, -170, 14, -140, 26, -110, false),
      leg(22, -88, 32, -42, 32, 0),
      leg(-4, -88, -12, -46, -14, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- light_low (3 frames: startup, boot kick, recovery) ------------
  light_low: [
    // startup – shift weight
    pose(
      head(4, -189),
      torso(2, -134, 52, 42, 92, 0.04),
      arm(25, -175, 42, -154, 46, -132, false),
      arm(-23, -175, -39, -155, -37, -134, false),
      leg(16, -88, 26, -50, 22, -12),
      leg(-12, -88, -24, -42, -28, 0),
    ),
    // boot kick – snap forward
    pose(
      head(8, -188),
      torso(4, -133, 52, 42, 92, 0.08),
      arm(28, -174, 44, -152, 48, -128, false),
      arm(-20, -174, -36, -152, -34, -130, false),
      leg(20, -88, 44, -54, 72, -32),
      leg(-8, -88, -24, -40, -30, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- med_low (3 frames: startup, stock sweep, recovery) ------------
  med_low: [
    // startup – drop lower
    pose(
      head(6, -160),
      torso(3, -110, 52, 44, 80, 0.10),
      arm(27, -148, 44, -124, 48, -100, false),
      arm(-21, -148, -38, -126, -34, -104, false),
      leg(18, -68, 34, -36, 32, -6),
      leg(-10, -68, -20, -38, -22, 0),
    ),
    // stock sweep – crossbow low sweep
    pose(
      head(12, -128),
      torso(8, -86, 54, 46, 64, 0.26),
      arm(34, -114, 52, -90, 58, -66, false),
      arm(-14, -114, -30, -94, -26, -72, false),
      leg(24, -54, 54, -24, 84, -8),
      leg(-4, -54, -18, -30, -22, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- heavy_low (4 frames: windup, dragon tail sweep, hold, recovery)
  heavy_low: [
    // windup – coil down
    pose(
      head(3, -165),
      torso(0, -114, 52, 44, 82, -0.06),
      arm(24, -152, 38, -130, 42, -106, false),
      arm(-24, -152, -40, -132, -38, -110, false),
      leg(14, -72, 22, -38, 18, -4),
      leg(-14, -72, -26, -36, -30, 0),
    ),
    // dragon tail sweep – full rotation low
    pose(
      head(8, -140),
      torso(4, -96, 54, 46, 72, 0.22),
      arm(30, -128, 48, -104, 52, -80, false),
      arm(-16, -128, -34, -106, -30, -84, false),
      leg(20, -60, 52, -30, 88, -10),
      leg(-6, -60, -20, -32, -24, 0),
    ),
    // hold – leg extended
    pose(
      head(10, -142),
      torso(6, -98, 54, 46, 72, 0.18),
      arm(32, -130, 50, -106, 54, -82, false),
      arm(-14, -130, -32, -108, -28, -86, false),
      leg(22, -62, 58, -32, 84, -6),
      leg(-4, -62, -18, -34, -20, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- dragon_bolt (3 frames: aim crossbow, fire, recovery) ----------
  dragon_bolt: [
    // aim – raise crossbow to shoulder, sight down
    pose(
      head(6, -191),
      torso(2, -136, 52, 42, 92, 0.08),
      arm(28, -177, 50, -170, 66, -166, true),    // front arm extends crossbow
      arm(-20, -177, -12, -170, -32, -166, false), // back arm steadies stock
      leg(16, -88, 22, -46, 20, 0),
      leg(-12, -88, -22, -46, -24, 0),
    ),
    // fire – bolt released, recoil
    pose(
      head(10, -190),
      torso(4, -135, 52, 42, 92, 0.12),
      arm(30, -176, 54, -168, 74, -164, true),    // front arm extended with crossbow
      arm(-18, -176, -10, -168, -24, -156, true),  // back arm follows through
      leg(18, -88, 24, -46, 22, 0),
      leg(-10, -88, -20, -46, -22, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- fire_rain (4 frames: aim skyward, hold, rain, recovery) -------
  fire_rain: [
    // aim skyward – crossbow pointed up
    pose(
      head(0, -193),
      torso(-2, -137, 52, 42, 92, -0.10),
      arm(22, -180, 28, -206, 36, -226, true),    // front arm aims crossbow skyward
      arm(-26, -180, -16, -204, -30, -222, false), // back arm draws lever
      leg(14, -88, 20, -46, 18, 0),
      leg(-14, -88, -22, -46, -24, 0),
    ),
    // hold – charged shot
    pose(
      head(2, -192),
      torso(0, -136, 52, 42, 92, -0.08),
      arm(24, -179, 30, -204, 38, -224, true),
      arm(-24, -179, -14, -202, -28, -218, false),
      leg(14, -88, 20, -46, 18, 0),
      leg(-14, -88, -22, -46, -24, 0),
    ),
    // rain – fire bolts descending
    pose(
      head(4, -191),
      torso(0, -135, 52, 42, 92, -0.04),
      arm(24, -178, 32, -202, 40, -220, true),
      arm(-24, -178, -12, -196, -24, -210, true),
      leg(16, -88, 20, -46, 18, 0),
      leg(-12, -88, -22, -46, -24, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- low_shot (3 frames: crouch aim, fire low, recovery) -----------
  low_shot: [
    // crouch aim – kneel and aim crossbow low
    pose(
      head(6, -145),
      torso(2, -98, 52, 44, 76, 0.12),
      arm(26, -134, 46, -108, 60, -94, true),
      arm(-22, -134, -10, -110, -28, -98, false),
      leg(18, -60, 32, -28, 26, 0),
      leg(-12, -60, -22, -30, -18, 0),
    ),
    // fire low – bolt skims ground
    pose(
      head(10, -143),
      torso(6, -96, 52, 44, 76, 0.16),
      arm(30, -132, 52, -104, 70, -88, true),
      arm(-18, -132, -6, -106, -20, -90, true),
      leg(20, -60, 34, -28, 28, 0),
      leg(-10, -60, -20, -30, -16, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- pendragon_retreat (3 frames: crouch, backflip+fire, land) -----
  pendragon_retreat: [
    // crouch – coil for backflip
    pose(
      head(2, -150),
      torso(0, -104, 52, 44, 78, -0.04),
      arm(24, -140, 40, -118, 44, -96, false),
      arm(-24, -140, -38, -120, -36, -98, false),
      leg(14, -64, 26, -30, 20, 0),
      leg(-14, -64, -24, -32, -22, 0),
    ),
    // backflip – inverted, firing crossbow forward
    pose(
      head(-22, -195),
      torso(-16, -160, 50, 40, 84, -0.45),
      arm(4, -196, -14, -210, -32, -202, true),
      arm(-36, -196, -52, -212, -62, -200, true),
      leg(-4, -120, -20, -142, -30, -165),
      leg(-28, -120, -40, -144, -46, -168),
    ),
    // land – return to ground
    pose(
      head(-12, -191),
      torso(-10, -136, 52, 42, 92, -0.04),
      arm(16, -177, 34, -158, 40, -136, false),
      arm(-32, -177, -46, -156, -44, -134, false),
      leg(6, -88, 14, -46, 12, 0),
      leg(-22, -88, -28, -46, -30, 0),
    ),
  ],

  // ---------- siege_volley (3 frames: brace, rapid fire, recovery) ----------
  siege_volley: [
    // brace – plant feet, level crossbow
    pose(
      head(4, -190),
      torso(0, -135, 52, 42, 92, -0.04),
      arm(24, -176, 12, -162, -4, -150, false),
      arm(-24, -176, -40, -160, -48, -144, false),
      leg(18, -88, 20, -46, 22, 0),
      leg(-18, -88, -24, -46, -26, 0),
    ),
    // rapid fire – three bolts loosed
    pose(
      head(8, -189),
      torso(4, -134, 52, 42, 92, 0.06),
      arm(26, -175, 56, -164, 92, -158, false),
      arm(-22, -175, -32, -156, -26, -136, false),
      leg(16, -88, 22, -46, 20, 0),
      leg(-12, -88, -18, -46, -20, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- grab (3 frames: reach, crown strike, recovery) ----------------
  grab: [
    // reach – lunge forward to grapple
    pose(
      head(12, -188),
      torso(8, -133, 52, 42, 92, 0.14),
      arm(34, -174, 58, -160, 76, -152, true),
      arm(-8, -174, -20, -156, -12, -140, true),
      leg(22, -88, 32, -44, 32, 0),
      leg(0, -88, -14, -46, -16, 0),
    ),
    // crown strike – headbutt/crown smash
    pose(
      head(16, -186),
      torso(12, -132, 52, 42, 92, 0.18),
      arm(38, -173, 60, -154, 68, -136, false),
      arm(-4, -173, 12, -150, 26, -134, false),
      leg(26, -88, 34, -42, 34, 0),
      leg(2, -88, -10, -46, -12, 0),
    ),
    // recovery
    pose(
      head(5, -190),
      torso(1, -135, 52, 42, 92, 0.02),
      arm(25, -176, 42, -156, 46, -134, false),
      arm(-23, -176, -39, -157, -37, -135, false),
      leg(15, -88, 20, -46, 18, 0),
      leg(-13, -88, -21, -46, -23, 0),
    ),
  ],

  // ---------- block_stand (1 frame, crossbow held across body) --------------
  block_stand: [
    pose(
      head(2, -191),
      torso(-2, -136, 52, 42, 92, -0.05),
      arm(22, -178, 32, -158, 22, -136, false),    // front arm holds crossbow vertical
      arm(-26, -178, -16, -156, -12, -134, false),  // back arm braces
      leg(12, -88, 16, -46, 14, 0),
      leg(-16, -88, -22, -46, -24, 0),
    ),
  ],

  // ---------- block_crouch (1 frame, crouched guard) ------------------------
  block_crouch: [
    pose(
      head(2, -140),
      torso(-2, -94, 54, 44, 74, -0.06),
      arm(24, -128, 32, -106, 22, -86, false),
      arm(-28, -128, -18, -104, -14, -84, false),
      leg(16, -56, 32, -24, 24, 0),
      leg(-16, -56, -30, -22, -24, 0),
    ),
  ],

  // ---------- hit_stun (2 frames, recoiling) --------------------------------
  hit_stun: [
    // recoil back
    pose(
      head(-8, -187),
      torso(-6, -133, 52, 42, 92, -0.12),
      arm(18, -174, 6, -154, -4, -136, true),
      arm(-30, -174, -46, -154, -52, -136, true),
      leg(8, -88, 12, -46, 10, 0),
      leg(-20, -88, -28, -46, -30, 0),
    ),
    // staggering
    pose(
      head(-12, -185),
      torso(-10, -131, 52, 42, 92, -0.18),
      arm(14, -172, 0, -152, -12, -134, true),
      arm(-34, -172, -50, -152, -58, -134, true),
      leg(4, -88, 8, -46, 6, 0),
      leg(-24, -88, -32, -46, -34, 0),
    ),
  ],

  // ---------- knockdown (2 frames, falling then lying) ----------------------
  knockdown: [
    // falling backward
    pose(
      head(-16, -145),
      torso(-12, -100, 52, 42, 92, -0.48),
      arm(8, -140, -8, -116, -20, -96, true),
      arm(-34, -140, -52, -118, -60, -98, true),
      leg(0, -58, 10, -30, 14, 0),
      leg(-24, -58, -32, -28, -30, 0),
    ),
    // lying on ground
    pose(
      head(-52, -30),
      torso(-28, -26, 52, 42, 92, -1.50),
      arm(-12, -40, -32, -32, -50, -22, true),
      arm(-42, -40, -60, -30, -74, -20, true),
      leg(2, -14, 22, -10, 40, -2),
      leg(-20, -12, -4, -8, 14, 0),
    ),
  ],

  // ---------- get_up (2 frames, pushing up regally) -------------------------
  get_up: [
    // pushing up off ground
    pose(
      head(-10, -106),
      torso(-6, -68, 52, 44, 72, -0.28),
      arm(16, -100, 32, -66, 34, -44, false),
      arm(-28, -100, -42, -64, -40, -40, false),
      leg(6, -34, 22, -16, 18, 0),
      leg(-18, -32, -26, -14, -22, 0),
    ),
    // rising to feet
    pose(
      head(2, -180),
      torso(0, -128, 52, 42, 90, -0.02),
      arm(24, -170, 40, -150, 44, -128, false),
      arm(-24, -170, -38, -152, -36, -130, false),
      leg(14, -84, 20, -42, 18, 0),
      leg(-14, -84, -20, -44, -22, 0),
    ),
  ],

  // ---------- victory (2 frames, crossbow raised, regal triumph) ------------
  victory: [
    // raise crossbow overhead
    pose(
      head(4, -194),
      torso(0, -138, 52, 42, 94, 0),
      arm(24, -180, 30, -206, 22, -228, false),    // front arm lifts crossbow high
      arm(-24, -180, -30, -208, -22, -230, false),  // back arm raised
      leg(14, -90, 20, -48, 18, 0),
      leg(-14, -90, -22, -48, -24, 0),
    ),
    // triumphant hold – proud kingly stance
    pose(
      head(4, -196),
      torso(0, -140, 52, 42, 94, 0),
      arm(24, -182, 32, -210, 26, -232, true),
      arm(-24, -182, -32, -212, -26, -234, true),
      leg(14, -90, 18, -48, 16, 0),
      leg(-14, -90, -20, -48, -22, 0),
    ),
  ],

  // ---------- defeat (1 frame, collapsed on ground) -------------------------
  defeat: [
    pose(
      head(-50, -26),
      torso(-26, -24, 52, 42, 92, -1.55),
      arm(-10, -38, -30, -28, -48, -18, true),
      arm(-42, -36, -58, -26, -72, -16, true),
      leg(4, -12, 24, -8, 42, 0),
      leg(-18, -10, -2, -6, 16, 0),
    ),
  ],
};

// ---- Draw extras (heavy crossbow, crown, dragon armor details) ------------

export function drawUtherExtras(g: Graphics, p: FighterPose, pal: FighterPalette, isFlashing: boolean, flashColor: number): void {
  const metalColor = pal.weapon ?? 0x888899;
  const dragonRed = pal.weaponAccent ?? ACCENT;
  const goldTrim = 0xddaa33;
  const hairColor = isFlashing ? flashColor : (pal.hair ?? 0xaaaaaa);

  const headX = p.head.x;
  const headY = p.head.y;
  const hr = p.head.radius ?? 24;

  // -- Short silver hair / cropped beard --
  // Hair on top, slightly longer behind
  g.moveTo(headX - hr + 2, headY - 2);
  g.quadraticCurveTo(headX - hr - 2, headY - hr + 2, headX, headY - hr - 4);
  g.quadraticCurveTo(headX + hr + 2, headY - hr + 2, headX + hr - 2, headY - 2);
  g.quadraticCurveTo(headX + hr + 4, headY + 8, headX + hr - 4, headY + 14);
  g.lineTo(headX + hr - 6, headY + 6);
  g.closePath();
  g.fill({ color: 0x222233 }); // outline
  g.moveTo(headX - hr + 3, headY - 1);
  g.quadraticCurveTo(headX - hr - 1, headY - hr + 3, headX, headY - hr - 3);
  g.quadraticCurveTo(headX + hr + 1, headY - hr + 3, headX + hr - 3, headY - 1);
  g.quadraticCurveTo(headX + hr + 3, headY + 7, headX + hr - 5, headY + 13);
  g.lineTo(headX + hr - 7, headY + 5);
  g.closePath();
  g.fill({ color: hairColor });

  // Beard – short, dignified
  g.moveTo(headX + 2, headY + 10);
  g.quadraticCurveTo(headX + 8, headY + 16, headX + 4, headY + 22);
  g.quadraticCurveTo(headX, headY + 24, headX - 4, headY + 22);
  g.quadraticCurveTo(headX - 8, headY + 16, headX + 2, headY + 10);
  g.closePath();
  g.fill({ color: hairColor });

  // Beard texture lines
  g.moveTo(headX + 2, headY + 12);
  g.lineTo(headX + 2, headY + 20);
  g.stroke({ color: 0x999999, width: 0.8, alpha: 0.4 });
  g.moveTo(headX + 5, headY + 13);
  g.lineTo(headX + 4, headY + 19);
  g.stroke({ color: 0x999999, width: 0.8, alpha: 0.4 });
  g.moveTo(headX - 1, headY + 13);
  g.lineTo(headX - 2, headY + 19);
  g.stroke({ color: 0x999999, width: 0.8, alpha: 0.4 });

  // -- Crown – golden crown with red dragon jewels --
  const crownBaseY = headY - hr - 2;
  const crownW = hr + 4;
  // Crown base band
  g.roundRect(headX - crownW / 2 - 1, crownBaseY - 1, crownW + 2, 10, 1);
  g.fill({ color: 0x222233 }); // outline
  g.roundRect(headX - crownW / 2, crownBaseY, crownW, 8, 1);
  g.fill({ color: goldTrim });

  // Crown points (5 points)
  const pointCount = 5;
  const pointSpacing = crownW / (pointCount - 1);
  for (let i = 0; i < pointCount; i++) {
    const px = headX - crownW / 2 + i * pointSpacing;
    const pointH = i % 2 === 0 ? 10 : 7;
    // Point outline
    g.moveTo(px - 3, crownBaseY);
    g.lineTo(px, crownBaseY - pointH);
    g.lineTo(px + 3, crownBaseY);
    g.closePath();
    g.fill({ color: 0x222233 });
    // Point fill
    g.moveTo(px - 2, crownBaseY);
    g.lineTo(px, crownBaseY - pointH + 1);
    g.lineTo(px + 2, crownBaseY);
    g.closePath();
    g.fill({ color: goldTrim });
  }
  // Center jewel (red dragon gem)
  g.circle(headX, crownBaseY + 4, 2.5);
  g.fill({ color: dragonRed });
  // Side jewels
  g.circle(headX - crownW / 4, crownBaseY + 4, 1.8);
  g.fill({ color: dragonRed });
  g.circle(headX + crownW / 4, crownBaseY + 4, 1.8);
  g.fill({ color: dragonRed });

  // -- Heavy crossbow (larger/more ornate than a regular bow) --
  const hx = p.frontArm.handX;
  const hy = p.frontArm.handY;

  // Crossbow stock – thick horizontal bar
  const stockLen = 38;
  const stockW = 5;
  // Stock outline
  g.moveTo(hx - 4, hy - stockW / 2 - 1);
  g.lineTo(hx + stockLen + 2, hy - stockW / 2 - 1);
  g.lineTo(hx + stockLen + 2, hy + stockW / 2 + 1);
  g.lineTo(hx - 4, hy + stockW / 2 + 1);
  g.closePath();
  g.fill({ color: 0x222233 });
  // Stock fill
  g.moveTo(hx - 3, hy - stockW / 2);
  g.lineTo(hx + stockLen + 1, hy - stockW / 2);
  g.lineTo(hx + stockLen + 1, hy + stockW / 2);
  g.lineTo(hx - 3, hy + stockW / 2);
  g.closePath();
  g.fill({ color: metalColor });

  // Crossbow limbs – thick curved arms extending from front of stock
  const limbX = hx + stockLen - 4;
  const limbSpread = 32;
  const limbCurve = 14;

  // Top limb outline
  g.moveTo(limbX, hy);
  g.quadraticCurveTo(limbX + limbCurve + 2, hy - limbSpread * 0.5, limbX + 6, hy - limbSpread);
  g.stroke({ color: 0x222233, width: 7, cap: "round" });
  // Top limb fill
  g.moveTo(limbX, hy);
  g.quadraticCurveTo(limbX + limbCurve, hy - limbSpread * 0.5, limbX + 5, hy - limbSpread);
  g.stroke({ color: metalColor, width: 5, cap: "round" });

  // Bottom limb outline
  g.moveTo(limbX, hy);
  g.quadraticCurveTo(limbX + limbCurve + 2, hy + limbSpread * 0.5, limbX + 6, hy + limbSpread);
  g.stroke({ color: 0x222233, width: 7, cap: "round" });
  // Bottom limb fill
  g.moveTo(limbX, hy);
  g.quadraticCurveTo(limbX + limbCurve, hy + limbSpread * 0.5, limbX + 5, hy + limbSpread);
  g.stroke({ color: metalColor, width: 5, cap: "round" });

  // Crossbow string – straight line from limb tip to limb tip
  g.moveTo(limbX + 5, hy - limbSpread);
  g.lineTo(limbX + 5, hy + limbSpread);
  g.stroke({ color: 0xbbbbcc, width: 1.5, cap: "round" });

  // Dragon head decoration on stock front
  const dhx = hx + stockLen - 2;
  const dhy = hy;
  // Dragon snout
  g.moveTo(dhx, dhy - 4);
  g.lineTo(dhx + 8, dhy);
  g.lineTo(dhx, dhy + 4);
  g.closePath();
  g.fill({ color: dragonRed });
  // Dragon eye
  g.circle(dhx - 2, dhy - 2, 1.2);
  g.fill({ color: goldTrim });

  // Dragon wing flourishes on limbs
  // Top limb dragon wing
  g.moveTo(limbX + 2, hy - limbSpread * 0.4);
  g.quadraticCurveTo(limbX + limbCurve + 6, hy - limbSpread * 0.6, limbX + 8, hy - limbSpread * 0.8);
  g.stroke({ color: dragonRed, width: 2, cap: "round" });
  // Bottom limb dragon wing
  g.moveTo(limbX + 2, hy + limbSpread * 0.4);
  g.quadraticCurveTo(limbX + limbCurve + 6, hy + limbSpread * 0.6, limbX + 8, hy + limbSpread * 0.8);
  g.stroke({ color: dragonRed, width: 2, cap: "round" });

  // -- Armor details: dragon emblem on torso --
  if (p.torso) {
    const t = p.torso;
    const cx = t.x;
    const cy = t.y + t.height * 0.3;

    // Small dragon silhouette on chest plate
    // Dragon body curve
    g.moveTo(cx - 6, cy + 4);
    g.quadraticCurveTo(cx - 2, cy - 6, cx + 4, cy - 4);
    g.quadraticCurveTo(cx + 8, cy - 2, cx + 6, cy + 4);
    g.quadraticCurveTo(cx + 2, cy + 8, cx - 6, cy + 4);
    g.closePath();
    g.fill({ color: dragonRed, alpha: 0.6 });

    // Dragon wing hints
    g.moveTo(cx + 2, cy - 2);
    g.quadraticCurveTo(cx + 10, cy - 8, cx + 8, cy);
    g.stroke({ color: dragonRed, width: 1.2, alpha: 0.5 });
    g.moveTo(cx - 2, cy - 2);
    g.quadraticCurveTo(cx - 10, cy - 8, cx - 8, cy);
    g.stroke({ color: dragonRed, width: 1.2, alpha: 0.5 });

    // Gold trim lines on armor
    const beltY = t.y + t.height / 2 - 6;
    // Shoulder pauldron accents
    g.moveTo(t.x - t.topWidth / 2, t.y - 2);
    g.lineTo(t.x - t.topWidth / 2 - 6, t.y + 4);
    g.stroke({ color: goldTrim, width: 2, cap: "round" });
    g.moveTo(t.x + t.topWidth / 2, t.y - 2);
    g.lineTo(t.x + t.topWidth / 2 + 6, t.y + 4);
    g.stroke({ color: goldTrim, width: 2, cap: "round" });

    // Belt buckle with dragon motif
    g.roundRect(t.x - 4, beltY, 8, 6, 1);
    g.fill({ color: goldTrim });
    g.circle(t.x, beltY + 3, 1.5);
    g.fill({ color: dragonRed });
  }
}
