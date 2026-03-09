// ---------------------------------------------------------------------------
// Duel mode – Nimue (Lady of the Lake) skeleton pose data
// Staff-wielding water mage with fluid, graceful movements.
// Flowing robes, dark blue-black hair, cyan eyes, elegant staff with water crystal.
// ---------------------------------------------------------------------------

import { Graphics } from "pixi.js";
import {
  FighterPose,
  FighterPalette,
  pose,
  arm,
  leg,
  torso,
  head,
} from "./DuelSkeletonRenderer";

// ---- Palette ---------------------------------------------------------------

export const NIMUE_PALETTE: FighterPalette = {
  skin: 0xeeddcc,        // pale
  body: 0x3366aa,        // deep blue flowing robes
  pants: 0x224488,       // darker blue
  shoes: 0x334455,       // dark grey-blue
  hair: 0x112244,        // dark blue-black
  eyes: 0x44ccff,        // cyan
  outline: 0x112233,
  gloves: 0x4477aa,      // blue gloves
  belt: 0x88aacc,        // silver-blue belt
  accent: 0x44ccff,      // water glow
  weapon: 0x778899,      // elegant staff (silver-grey)
  weaponAccent: 0x44ccff, // water crystal glow
};

// ---- Poses -----------------------------------------------------------------

export const NIMUE_POSES: Record<string, FighterPose[]> = {

  // -- idle (4 frames, gentle swaying, staff held gracefully) -----------------
  idle: [
    pose(
      head(0, -187),
      torso(0, -132, 50, 44, 90, 0),
      arm(20, -172, 28, -148, 24, -122, false),   // front: hand on staff mid
      arm(-20, -172, -26, -150, -18, -128, false), // back: relaxed at side
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
    pose(
      head(1, -189),
      torso(1, -134, 50, 44, 90, 0.01),
      arm(21, -174, 29, -150, 25, -124, false),
      arm(-19, -174, -25, -152, -17, -130, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
    pose(
      head(-1, -186),
      torso(-1, -131, 50, 44, 90, -0.01),
      arm(19, -171, 27, -147, 23, -121, false),
      arm(-21, -171, -27, -149, -19, -127, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
    pose(
      head(0, -188),
      torso(0, -133, 50, 44, 90, 0),
      arm(20, -173, 28, -149, 24, -123, false),
      arm(-20, -173, -26, -151, -18, -129, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
  ],

  // -- walk_forward (4 frames, flowing glide) ---------------------------------
  walk_forward: [
    pose(
      head(2, -187),
      torso(2, -132, 50, 44, 90, 0.03),
      arm(22, -172, 30, -148, 26, -122, false),
      arm(-18, -172, -24, -148, -16, -124, false),
      leg(13, -86, 20, -46, 26, 0),
      leg(-9, -86, -16, -44, -22, 0),
    ),
    pose(
      head(3, -186),
      torso(3, -131, 50, 44, 90, 0.05),
      arm(23, -171, 32, -146, 28, -120, false),
      arm(-17, -171, -22, -146, -14, -122, false),
      leg(15, -86, 16, -42, 12, 0),
      leg(-7, -86, -10, -48, -6, 0),
    ),
    pose(
      head(2, -187),
      torso(2, -132, 50, 44, 90, 0.03),
      arm(22, -172, 30, -148, 26, -122, false),
      arm(-18, -172, -24, -148, -16, -124, false),
      leg(13, -86, 6, -44, -6, 0),
      leg(-9, -86, -2, -46, 10, 0),
    ),
    pose(
      head(3, -186),
      torso(3, -131, 50, 44, 90, 0.05),
      arm(23, -171, 32, -146, 28, -120, false),
      arm(-17, -171, -22, -146, -14, -122, false),
      leg(15, -86, 22, -46, 28, 0),
      leg(-7, -86, -14, -44, -20, 0),
    ),
  ],

  // -- walk_back (4 frames, cautious retreat) ---------------------------------
  walk_back: [
    pose(
      head(-2, -187),
      torso(-2, -132, 50, 44, 90, -0.03),
      arm(18, -172, 26, -148, 22, -122, false),
      arm(-22, -172, -28, -150, -22, -128, false),
      leg(9, -86, 4, -46, -2, 0),
      leg(-13, -86, -18, -44, -26, 0),
    ),
    pose(
      head(-3, -186),
      torso(-3, -131, 50, 44, 90, -0.05),
      arm(17, -171, 24, -146, 20, -120, false),
      arm(-23, -171, -30, -148, -24, -126, false),
      leg(7, -86, 12, -42, 16, 0),
      leg(-15, -86, -12, -48, -8, 0),
    ),
    pose(
      head(-2, -187),
      torso(-2, -132, 50, 44, 90, -0.03),
      arm(18, -172, 26, -148, 22, -122, false),
      arm(-22, -172, -28, -150, -22, -128, false),
      leg(9, -86, 0, -44, -8, 0),
      leg(-13, -86, -6, -46, 4, 0),
    ),
    pose(
      head(-3, -186),
      torso(-3, -131, 50, 44, 90, -0.05),
      arm(17, -171, 24, -146, 20, -120, false),
      arm(-23, -171, -30, -148, -24, -126, false),
      leg(7, -86, -4, -46, -12, 0),
      leg(-15, -86, -20, -44, -28, 0),
    ),
  ],

  // -- crouch (1 frame, elegant low stance) -----------------------------------
  crouch: [
    pose(
      head(3, -132),
      torso(2, -88, 50, 48, 72, 0.1),
      arm(22, -118, 30, -98, 28, -78, false),
      arm(-18, -118, -24, -98, -20, -80, false),
      leg(13, -52, 20, -26, 16, 0),
      leg(-9, -52, -16, -26, -12, 0),
    ),
  ],

  // -- jump (2 frames, robes billowing) ---------------------------------------
  jump: [
    // ascending — arms raised, graceful
    pose(
      head(0, -192),
      torso(0, -137, 50, 48, 90, -0.04),
      arm(20, -177, 32, -162, 38, -145, true),
      arm(-20, -177, -28, -158, -24, -138, false),
      leg(11, -92, 16, -62, 22, -38),
      leg(-11, -92, -14, -66, -18, -42),
    ),
    // descending — robes flowing upward
    pose(
      head(0, -190),
      torso(0, -135, 50, 48, 90, 0.03),
      arm(20, -175, 28, -152, 24, -130, true),
      arm(-20, -175, -26, -154, -22, -134, false),
      leg(11, -90, 18, -58, 24, -28),
      leg(-11, -90, -16, -60, -20, -32),
    ),
  ],

  // -- light_high (3 frames: water whip snap) ---------------------------------
  light_high: [
    // startup: draw water whip back
    pose(
      head(0, -187),
      torso(1, -132, 50, 44, 90, -0.04),
      arm(20, -172, 12, -152, 3, -138, false),
      arm(-20, -172, -26, -150, -18, -128, false),
      leg(11, -86, 15, -46, 17, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
    // snap: whip extends forward
    pose(
      head(4, -186),
      torso(5, -131, 50, 44, 90, 0.08),
      arm(22, -171, 48, -155, 88, -148, false),
      arm(-18, -171, -22, -148, -14, -124, false),
      leg(13, -86, 17, -44, 21, 0),
      leg(-9, -86, -15, -46, -19, 0),
    ),
    // recovery
    pose(
      head(2, -187),
      torso(2, -132, 50, 44, 90, 0.02),
      arm(20, -172, 34, -152, 38, -132, false),
      arm(-20, -172, -26, -150, -18, -128, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
  ],

  // -- med_high (3 frames: horizontal staff sweep with water trail) -----------
  med_high: [
    // startup: wind up to side
    pose(
      head(-2, -187),
      torso(0, -132, 50, 44, 90, -0.1),
      arm(20, -172, 8, -157, -6, -147, false),
      arm(-20, -172, -28, -150, -33, -132, false),
      leg(11, -86, 15, -46, 19, 0),
      leg(-11, -86, -15, -46, -19, 0),
    ),
    // sweep: horizontal arc
    pose(
      head(5, -185),
      torso(5, -130, 50, 44, 90, 0.12),
      arm(22, -170, 52, -157, 92, -150, false),
      arm(-18, -170, -16, -147, -8, -122, false),
      leg(13, -86, 19, -44, 23, 0),
      leg(-9, -86, -13, -46, -17, 0),
    ),
    // recovery
    pose(
      head(2, -187),
      torso(2, -132, 50, 44, 90, 0.03),
      arm(20, -172, 36, -152, 43, -134, false),
      arm(-20, -172, -24, -150, -18, -128, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
  ],

  // -- heavy_high (4 frames: overhead water cascade slam) ---------------------
  heavy_high: [
    // windup: raise staff overhead
    pose(
      head(0, -186),
      torso(-2, -132, 50, 44, 90, -0.08),
      arm(20, -172, 18, -192, 16, -212, false),
      arm(-20, -172, -18, -190, -16, -208, false),
      leg(11, -86, 15, -46, 19, 0),
      leg(-11, -86, -15, -46, -19, 0),
    ),
    // slam downward
    pose(
      head(5, -184),
      torso(5, -129, 50, 44, 90, 0.14),
      arm(22, -169, 48, -142, 78, -102, false),
      arm(-18, -169, -12, -144, -2, -120, false),
      leg(13, -86, 19, -43, 23, 0),
      leg(-9, -86, -13, -46, -17, 0),
    ),
    // impact: water splash
    pose(
      head(7, -182),
      torso(7, -127, 50, 44, 90, 0.18),
      arm(24, -167, 56, -122, 88, -42, false),
      arm(-16, -167, -8, -140, 0, -112, false),
      leg(15, -86, 21, -42, 25, 0),
      leg(-7, -86, -11, -46, -15, 0),
    ),
    // recovery
    pose(
      head(3, -186),
      torso(3, -131, 50, 44, 90, 0.04),
      arm(22, -171, 36, -150, 38, -128, false),
      arm(-18, -171, -24, -148, -18, -124, false),
      leg(13, -86, 15, -44, 17, 0),
      leg(-9, -86, -13, -46, -15, 0),
    ),
  ],

  // -- light_low (3 frames: low water whip lash) ------------------------------
  light_low: [
    // startup: crouch slightly
    pose(
      head(2, -167),
      torso(2, -112, 50, 46, 82, 0.08),
      arm(20, -148, 28, -122, 26, -97, false),
      arm(-20, -148, -26, -124, -20, -102, false),
      leg(11, -72, 17, -38, 21, 0),
      leg(-11, -72, -15, -38, -17, 0),
    ),
    // lash: water tendril at ankle height
    pose(
      head(5, -165),
      torso(5, -110, 50, 46, 82, 0.14),
      arm(22, -146, 48, -97, 88, -32, false),
      arm(-18, -146, -22, -120, -14, -97, false),
      leg(13, -72, 19, -36, 23, 0),
      leg(-9, -72, -15, -38, -17, 0),
    ),
    // recovery
    pose(
      head(2, -170),
      torso(2, -114, 50, 46, 84, 0.04),
      arm(20, -150, 34, -117, 36, -92, false),
      arm(-20, -150, -24, -124, -18, -102, false),
      leg(11, -74, 15, -38, 17, 0),
      leg(-11, -74, -13, -38, -15, 0),
    ),
  ],

  // -- med_low (3 frames: crouching water sweep) ------------------------------
  med_low: [
    // startup: crouch with staff pulled back
    pose(
      head(0, -162),
      torso(0, -107, 50, 46, 80, -0.06),
      arm(20, -142, 10, -120, -2, -97, false),
      arm(-20, -142, -26, -122, -22, -100, false),
      leg(11, -68, 17, -36, 21, 0),
      leg(-11, -68, -17, -36, -19, 0),
    ),
    // sweep: water arc low across ground
    pose(
      head(7, -160),
      torso(7, -105, 50, 46, 80, 0.16),
      arm(24, -140, 54, -82, 98, -22, false),
      arm(-16, -140, -12, -117, -4, -92, false),
      leg(15, -68, 23, -34, 27, 0),
      leg(-7, -68, -13, -38, -15, 0),
    ),
    // recovery
    pose(
      head(3, -164),
      torso(3, -109, 50, 46, 82, 0.04),
      arm(22, -144, 36, -110, 40, -82, false),
      arm(-18, -144, -24, -122, -18, -100, false),
      leg(13, -70, 17, -36, 19, 0),
      leg(-9, -70, -15, -38, -17, 0),
    ),
  ],

  // -- heavy_low (4 frames: geyser burst launcher) ----------------------------
  heavy_low: [
    // windup: raise staff while crouching
    pose(
      head(0, -164),
      torso(0, -110, 50, 46, 82, -0.08),
      arm(20, -145, 18, -177, 16, -207, false),
      arm(-20, -145, -18, -172, -16, -202, false),
      leg(11, -70, 17, -36, 21, 0),
      leg(-11, -70, -17, -36, -19, 0),
    ),
    // slam down
    pose(
      head(5, -157),
      torso(5, -102, 50, 48, 78, 0.2),
      arm(22, -137, 46, -92, 73, -32, false),
      arm(-16, -137, -10, -107, 0, -77, false),
      leg(13, -66, 21, -34, 25, 0),
      leg(-9, -66, -15, -36, -17, 0),
    ),
    // impact: water erupts upward
    pose(
      head(7, -152),
      torso(7, -97, 50, 50, 74, 0.25),
      arm(24, -132, 52, -67, 78, -7, false),
      arm(-16, -132, -8, -97, 2, -67, false),
      leg(15, -62, 23, -32, 27, 0),
      leg(-7, -62, -13, -34, -15, 0),
    ),
    // recovery
    pose(
      head(3, -164),
      torso(3, -109, 50, 46, 82, 0.06),
      arm(22, -144, 34, -117, 36, -87, false),
      arm(-18, -144, -24, -122, -18, -100, false),
      leg(13, -70, 17, -36, 19, 0),
      leg(-9, -70, -15, -36, -17, 0),
    ),
  ],

  // -- water_bolt (3 frames: gather water, cast forward, recovery) ------------
  water_bolt: [
    // gather: pull hands back gathering water
    pose(
      head(-2, -188),
      torso(-2, -133, 50, 44, 90, -0.06),
      arm(20, -173, 22, -197, 24, -217, true),
      arm(-20, -173, -24, -192, -22, -212, true),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
    // cast: thrust forward releasing water bolt
    pose(
      head(5, -186),
      torso(5, -131, 50, 44, 90, 0.1),
      arm(22, -171, 53, -167, 93, -162, true),
      arm(-18, -171, -16, -150, -8, -128, false),
      leg(13, -86, 17, -44, 21, 0),
      leg(-9, -86, -15, -46, -19, 0),
    ),
    // recovery
    pose(
      head(2, -187),
      torso(2, -132, 50, 44, 90, 0.03),
      arm(20, -172, 32, -157, 36, -140, false),
      arm(-20, -172, -24, -150, -18, -128, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
  ],

  // -- tidal_strike (4 frames: raise, channel, crash, recovery) ---------------
  tidal_strike: [
    // raise: staff skyward
    pose(
      head(0, -188),
      torso(0, -133, 50, 44, 90, -0.04),
      arm(20, -173, 24, -202, 28, -232, true),
      arm(-20, -173, -18, -197, -14, -224, true),
      leg(11, -86, 15, -46, 19, 0),
      leg(-11, -86, -15, -46, -19, 0),
    ),
    // channel: arms wide channeling water above
    pose(
      head(0, -190),
      torso(0, -135, 50, 44, 90, 0),
      arm(20, -175, 43, -197, 58, -217, true),
      arm(-20, -175, -38, -194, -53, -212, true),
      leg(11, -86, 17, -46, 21, 0),
      leg(-11, -86, -17, -46, -21, 0),
    ),
    // crash: arms sweep down directing water
    pose(
      head(4, -186),
      torso(4, -131, 50, 44, 90, 0.1),
      arm(22, -171, 46, -155, 68, -135, true),
      arm(-18, -171, -14, -148, -4, -125, false),
      leg(13, -86, 17, -44, 21, 0),
      leg(-9, -86, -15, -46, -19, 0),
    ),
    // recovery
    pose(
      head(0, -187),
      torso(0, -132, 50, 44, 90, 0),
      arm(20, -172, 28, -154, 26, -134, false),
      arm(-20, -172, -26, -152, -22, -130, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
  ],

  // -- frost_wave (3 frames: crouch gather ice, cast low, recovery) -----------
  frost_wave: [
    // gather ice: crouch with staff pulled low
    pose(
      head(0, -172),
      torso(2, -120, 50, 46, 86, 0.08),
      arm(20, -157, 16, -127, 10, -97, false),
      arm(-20, -157, -26, -132, -22, -107, false),
      leg(11, -78, 17, -40, 21, 0),
      leg(-11, -78, -15, -40, -17, 0),
    ),
    // cast: sweep staff forward at ground level releasing ice
    pose(
      head(5, -170),
      torso(5, -118, 50, 46, 86, 0.15),
      arm(22, -155, 50, -92, 93, -27, true),
      arm(-18, -155, -14, -127, -6, -102, false),
      leg(13, -78, 19, -38, 23, 0),
      leg(-9, -78, -15, -40, -17, 0),
    ),
    // recovery
    pose(
      head(2, -174),
      torso(2, -122, 50, 46, 88, 0.04),
      arm(20, -160, 32, -127, 34, -97, false),
      arm(-20, -160, -24, -134, -20, -110, false),
      leg(11, -80, 15, -40, 17, 0),
      leg(-11, -80, -13, -40, -15, 0),
    ),
  ],

  // -- mist_step (3 frames: crouch, dissolve, reappear) -----------------------
  mist_step: [
    // crouch: gathering mist
    pose(
      head(0, -147),
      torso(0, -97, 50, 50, 74, 0),
      arm(20, -130, 14, -107, 8, -82, true),
      arm(-20, -130, -14, -107, -8, -82, true),
      leg(11, -61, 19, -30, 21, 0),
      leg(-11, -61, -19, -30, -21, 0),
    ),
    // dissolve: body compressed into mist
    pose(
      head(0, -122),
      torso(0, -77, 38, 34, 57, 0),
      arm(16, -102, 6, -82, -2, -67, false),
      arm(-16, -102, -6, -82, 2, -67, false),
      leg(9, -50, 7, -25, 5, 0),
      leg(-9, -50, -7, -25, -5, 0),
    ),
    // reappear: standing tall with water wisps
    pose(
      head(0, -190),
      torso(0, -134, 50, 44, 90, 0),
      arm(20, -174, 33, -160, 40, -142, true),
      arm(-20, -174, -33, -160, -40, -142, true),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
  ],

  // -- grab (3 frames: water tendril reach, bind, recovery) -------------------
  grab: [
    // reach: extend water tendril forward
    pose(
      head(3, -186),
      torso(3, -131, 50, 44, 90, 0.08),
      arm(22, -171, 50, -160, 83, -152, false),
      arm(-18, -171, -22, -148, -16, -124, false),
      leg(13, -86, 17, -44, 21, 0),
      leg(-9, -86, -13, -46, -17, 0),
    ),
    // bind: tendrils wrap opponent
    pose(
      head(5, -185),
      torso(5, -130, 50, 44, 90, 0.1),
      arm(22, -170, 46, -152, 68, -142, false),
      arm(-18, -170, -16, -147, -10, -122, false),
      leg(13, -86, 19, -43, 23, 0),
      leg(-9, -86, -13, -46, -17, 0),
    ),
    // recovery
    pose(
      head(2, -187),
      torso(2, -132, 50, 44, 90, 0.03),
      arm(20, -172, 32, -152, 36, -132, false),
      arm(-20, -172, -24, -150, -18, -128, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
  ],

  // -- lake_storm (4 frames: raise, channel, storm, recovery) -----------------
  lake_storm: [
    // raise staff skyward
    pose(
      head(0, -190),
      torso(0, -135, 50, 44, 90, -0.04),
      arm(20, -175, 26, -207, 32, -242, true),
      arm(-20, -175, -24, -202, -28, -234, true),
      leg(11, -86, 15, -46, 19, 0),
      leg(-11, -86, -15, -46, -19, 0),
    ),
    // channel: arms wide, water swirling
    pose(
      head(0, -192),
      torso(0, -137, 50, 44, 90, 0),
      arm(20, -177, 46, -202, 63, -222, true),
      arm(-20, -177, -46, -200, -63, -218, true),
      leg(11, -86, 17, -46, 21, 0),
      leg(-11, -86, -17, -46, -21, 0),
    ),
    // storm descends: directing pillars of water
    pose(
      head(3, -188),
      torso(3, -133, 50, 44, 90, 0.06),
      arm(22, -173, 42, -160, 56, -145, true),
      arm(-18, -173, -38, -158, -50, -140, true),
      leg(13, -86, 17, -44, 21, 0),
      leg(-9, -86, -15, -46, -19, 0),
    ),
    // recovery
    pose(
      head(0, -187),
      torso(0, -132, 50, 44, 90, 0),
      arm(20, -172, 28, -154, 26, -134, false),
      arm(-20, -172, -26, -152, -22, -130, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
  ],

  // -- block_stand (1 frame, staff held across body as water barrier) ---------
  block_stand: [
    pose(
      head(-2, -187),
      torso(-2, -132, 50, 44, 90, -0.06),
      arm(20, -172, 16, -150, 10, -128, false),
      arm(-20, -172, -16, -150, -10, -128, false),
      leg(11, -86, 13, -46, 15, 0),
      leg(-11, -86, -13, -46, -15, 0),
    ),
  ],

  // -- block_crouch (1 frame, crouched behind water barrier) ------------------
  block_crouch: [
    pose(
      head(-2, -134),
      torso(-2, -90, 50, 48, 74, -0.08),
      arm(20, -122, 14, -102, 8, -80, false),
      arm(-20, -122, -14, -102, -8, -80, false),
      leg(11, -54, 19, -27, 21, 0),
      leg(-11, -54, -19, -27, -21, 0),
    ),
  ],

  // -- hit_stun (2 frames, recoiling) -----------------------------------------
  hit_stun: [
    // reel back
    pose(
      head(-7, -184),
      torso(-5, -130, 50, 44, 90, -0.15),
      arm(16, -170, 8, -150, 3, -130, true),
      arm(-24, -170, -32, -152, -36, -132, true),
      leg(7, -86, 9, -46, 7, 0),
      leg(-15, -86, -19, -44, -23, 0),
    ),
    // stagger
    pose(
      head(-11, -182),
      torso(-9, -128, 50, 44, 90, -0.2),
      arm(12, -168, 4, -147, -2, -124, true),
      arm(-28, -168, -36, -150, -42, -130, true),
      leg(3, -86, 7, -48, 5, 0),
      leg(-19, -86, -23, -42, -27, 0),
    ),
  ],

  // -- knockdown (2 frames, falling then lying) -------------------------------
  knockdown: [
    // falling backward
    pose(
      head(-13, -152),
      torso(-9, -102, 50, 44, 82, -0.5),
      arm(8, -137, -2, -112, -10, -87, true),
      arm(-28, -137, -36, -114, -42, -92, true),
      leg(1, -62, 10, -36, 18, -12),
      leg(-21, -62, -17, -30, -11, -6),
    ),
    // lying on ground
    pose(
      head(-38, -22),
      torso(-18, -19, 50, 44, 90, -1.5),
      arm(6, -32, -12, -24, -32, -18, true),
      arm(-46, -32, -56, -20, -66, -14, true),
      leg(18, -16, 33, -11, 48, -6),
      leg(-8, -13, 7, -9, 22, -6),
    ),
  ],

  // -- get_up (2 frames, rising gracefully) -----------------------------------
  get_up: [
    // pushing up with staff
    pose(
      head(-7, -102),
      torso(-3, -67, 50, 46, 72, -0.3),
      arm(16, -97, 26, -62, 33, -32, false),
      arm(-24, -97, -28, -67, -26, -37, false),
      leg(7, -32, 17, -16, 21, 0),
      leg(-15, -32, -13, -16, -9, 0),
    ),
    // standing up
    pose(
      head(-2, -177),
      torso(-2, -124, 50, 44, 88, -0.08),
      arm(18, -162, 26, -142, 24, -120, false),
      arm(-22, -162, -28, -144, -24, -122, false),
      leg(9, -82, 13, -42, 15, 0),
      leg(-13, -82, -13, -42, -15, 0),
    ),
  ],

  // -- victory (2 frames, staff raised with water swirling) -------------------
  victory: [
    // staff raised triumphantly, water orbiting
    pose(
      head(0, -190),
      torso(0, -135, 50, 44, 90, 0),
      arm(20, -175, 26, -202, 30, -232, true),
      arm(-20, -175, -28, -157, -33, -137, true),
      leg(11, -86, 15, -46, 19, 0),
      leg(-11, -86, -15, -46, -19, 0),
    ),
    // flourish: both arms wide, water radiating
    pose(
      head(0, -192),
      torso(0, -137, 50, 44, 90, 0),
      arm(20, -177, 40, -207, 48, -237, true),
      arm(-20, -177, -40, -202, -48, -227, true),
      leg(11, -86, 17, -46, 21, 0),
      leg(-11, -86, -17, -46, -21, 0),
    ),
  ],

  // -- defeat (1 frame, collapsed gracefully) ---------------------------------
  defeat: [
    pose(
      head(8, -57),
      torso(4, -42, 50, 46, 62, 0.6),
      arm(20, -64, 28, -37, 33, -12, true),
      arm(-10, -64, -16, -37, -20, -14, true),
      leg(13, -12, 22, -6, 28, 0),
      leg(-7, -12, -3, -6, 1, 0),
    ),
  ],
};

// ---- Nimue extras (elegant staff, water crystal, flowing water effects) -----

/**
 * Draw Nimue's character-specific details:
 * - Elegant silver staff from hand position with water crystal on top
 * - Flowing water effects around feet and hands
 * - Graceful robe details
 */
export function drawNimueExtras(
  g: Graphics,
  p: FighterPose,
  pal: FighterPalette,
  isFlashing: boolean,
  flashColor: number,
): void {
  const staffColor = isFlashing ? flashColor : (pal.weapon ?? 0x778899);
  const crystalColor = isFlashing ? flashColor : (pal.weaponAccent ?? 0x44ccff);
  const accentColor = isFlashing ? flashColor : (pal.accent ?? 0x44ccff);

  // -- Staff ----------------------------------------------------------------
  // Staff runs from the front hand extending both directions
  const hx = p.frontArm.handX;
  const hy = p.frontArm.handY;

  // Calculate staff direction from elbow to hand
  const dx = hx - p.frontArm.elbowX;
  const dy = hy - p.frontArm.elbowY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  // Staff endpoints: bottom extends past hand, top extends opposite direction
  const sBottomX = hx + nx * 30;
  const sBottomY = Math.min(hy + ny * 30, 0);
  const sTopX = hx - nx * 65;
  const sTopY = hy - ny * 65;

  // Staff shaft (outline)
  g.moveTo(sBottomX, sBottomY);
  g.lineTo(sTopX, sTopY);
  g.stroke({ color: 0x112233, width: 6, cap: "round" });

  // Staff shaft (fill — silver-grey, elegant)
  g.moveTo(sBottomX, sBottomY);
  g.lineTo(sTopX, sTopY);
  g.stroke({ color: staffColor, width: 4, cap: "round" });

  // Subtle silver highlight along staff
  const sMidX = (sBottomX + sTopX) / 2;
  const sMidY = (sBottomY + sTopY) / 2;
  g.moveTo(sMidX - nx * 15, sMidY - ny * 15);
  g.lineTo(sMidX + nx * 15, sMidY + ny * 15);
  g.stroke({ color: 0xaabbcc, width: 1.5, alpha: 0.4, cap: "round" });

  // Decorative spiral band near the top (small accent ring)
  const bandX = sTopX + nx * 10;
  const bandY = sTopY + ny * 10;
  g.circle(bandX, bandY, 3.5);
  g.fill({ color: accentColor, alpha: 0.4 });

  // -- Water Crystal on top -------------------------------------------------
  // Outer glow
  g.circle(sTopX, sTopY, 11);
  g.fill({ color: crystalColor, alpha: 0.2 });

  // Inner glow
  g.circle(sTopX, sTopY, 7);
  g.fill({ color: crystalColor, alpha: 0.5 });

  // Crystal core
  g.circle(sTopX, sTopY, 4);
  g.fill({ color: 0xccffff, alpha: 0.85 });

  // Crystal highlight sparkle
  g.circle(sTopX - 2, sTopY - 2, 2);
  g.fill({ color: 0xffffff, alpha: 0.7 });

  // -- Flowing water effects around feet ------------------------------------
  const footY = 0;
  const baseX = (p.frontLeg.footX + p.backLeg.footX) / 2;

  // Small ripple circles at feet (like standing in shallow water)
  g.ellipse(baseX, footY, 18, 3);
  g.stroke({ color: accentColor, width: 1.2, alpha: 0.3 });

  g.ellipse(baseX, footY + 1, 26, 4);
  g.stroke({ color: accentColor, width: 1, alpha: 0.2 });

  // Tiny water droplets near front hand (as if magic gathers)
  const fhx = p.frontArm.handX;
  const fhy = p.frontArm.handY;
  g.circle(fhx + 6, fhy - 4, 2);
  g.fill({ color: accentColor, alpha: 0.35 });

  g.circle(fhx - 4, fhy - 8, 1.5);
  g.fill({ color: accentColor, alpha: 0.25 });

  // -- Graceful robe detail -------------------------------------------------
  // Flowing robe hemline curve (below the torso)
  const robeColor = isFlashing ? flashColor : pal.body;
  const tX = p.torso.x;
  const tBottom = p.torso.y + (p.torso.height ?? 90) * 0.35;

  // Small curved robe flare at the hip level
  g.moveTo(tX - 18, tBottom);
  g.quadraticCurveTo(tX - 22, tBottom + 8, tX - 16, tBottom + 14);
  g.stroke({ color: robeColor, width: 2, alpha: 0.5 });

  g.moveTo(tX + 18, tBottom);
  g.quadraticCurveTo(tX + 22, tBottom + 8, tX + 16, tBottom + 14);
  g.stroke({ color: robeColor, width: 2, alpha: 0.5 });
}
