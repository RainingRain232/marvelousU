/**
 * CraftDayNightSystem.ts
 *
 * Day/night cycle system for Camelot Craft.
 * Manages sun position, ambient lighting, sky color, and fog color
 * based on a continuous time-of-day value that wraps at 1.0.
 */

import { CB } from '../config/CraftBalance';
import { CraftState } from '../state/CraftState';

// ---- Color helpers (pack/unpack 0xRRGGBB) ----

function unpackRGB(color: number): [number, number, number] {
  return [
    (color >> 16) & 0xff,
    (color >> 8) & 0xff,
    color & 0xff,
  ];
}

function packRGB(r: number, g: number, b: number): number {
  return (
    (Math.round(clamp(r, 0, 255)) << 16) |
    (Math.round(clamp(g, 0, 255)) << 8) |
    Math.round(clamp(b, 0, 255))
  );
}

function lerpColor(a: number, b: number, t: number): number {
  const [ar, ag, ab] = unpackRGB(a);
  const [br, bg, bb] = unpackRGB(b);
  return packRGB(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t,
  );
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ---- Pre-defined palette colors ----

const NIGHT_SKY = 0x0a0a2e;
const DAWN_SKY = 0xd4764e;
const DUSK_SKY = 0xc45830;
const NIGHT_FOG = 0x080820;
const DAWN_FOG = 0xb8603c;
const DUSK_FOG = 0xa04828;

// ---- Public API ----

/**
 * Advance the day/night cycle.
 * `state.timeOfDay` is in [0, 1) where 0 = midnight, 0.5 = noon.
 * When timeOfDay wraps past 1.0, dayNumber is incremented.
 */
export function updateDayNight(state: CraftState, dt: number): void {
  const increment = dt / CB.DAY_LENGTH;
  state.timeOfDay += increment;

  while (state.timeOfDay >= 1.0) {
    state.timeOfDay -= 1.0;
    state.dayNumber += 1;
  }
}

/**
 * Return the sun angle in radians for the given time of day.
 * 0      = eastern horizon (sunrise direction)
 * PI/2   = zenith (directly overhead)
 * PI     = western horizon (sunset direction)
 *
 * The sun travels a full semicircle during the daytime portion and
 * sits below the horizon at night.  We map timeOfDay [0,1) so that
 * 0.25 = sunrise, 0.5 = noon, 0.75 = sunset.
 */
export function getSunAngle(timeOfDay: number): number {
  // Daytime spans roughly 0.25 .. 0.75
  const dayStart = 0.25;
  const dayEnd = 0.75;

  if (timeOfDay >= dayStart && timeOfDay <= dayEnd) {
    // Normalise within day portion: 0 at sunrise, 1 at sunset
    const t = (timeOfDay - dayStart) / (dayEnd - dayStart);
    return t * Math.PI; // 0 -> PI
  }

  // Night: sun is below horizon.  Return negative angle so callers
  // can detect "below horizon" easily.
  if (timeOfDay > dayEnd) {
    const t = (timeOfDay - dayEnd) / (1.0 - dayEnd + dayStart);
    return Math.PI + t * Math.PI; // PI -> 2*PI (below horizon arc)
  }

  // Before sunrise
  const t = (timeOfDay + (1.0 - dayEnd)) / (1.0 - dayEnd + dayStart);
  return Math.PI + t * Math.PI;
}

/**
 * Return ambient sunlight level in [0, 1].
 * Full brightness at noon, dim during dawn/dusk transitions,
 * dark at night.
 */
export function getSunlight(timeOfDay: number): number {
  const dawnStart = CB.DAWN_START; // e.g. 0.20
  const dawnEnd = CB.DAWN_END;     // e.g. 0.30
  const duskStart = CB.DUSK_START; // e.g. 0.70
  const duskEnd = CB.DUSK_END;     // e.g. 0.80

  const NIGHT_LIGHT = 0.05;
  const DAY_LIGHT = 1.0;

  // Full day
  if (timeOfDay >= dawnEnd && timeOfDay <= duskStart) {
    return DAY_LIGHT;
  }

  // Dawn transition
  if (timeOfDay >= dawnStart && timeOfDay < dawnEnd) {
    const t = smoothstep(dawnStart, dawnEnd, timeOfDay);
    return NIGHT_LIGHT + (DAY_LIGHT - NIGHT_LIGHT) * t;
  }

  // Dusk transition
  if (timeOfDay > duskStart && timeOfDay <= duskEnd) {
    const t = smoothstep(duskStart, duskEnd, timeOfDay);
    return DAY_LIGHT - (DAY_LIGHT - NIGHT_LIGHT) * t;
  }

  // Night
  return NIGHT_LIGHT;
}

/**
 * Interpolate sky color based on time of day.
 * `baseSkyColor` is the default daytime sky (e.g. 0x87ceeb).
 * Returns an 0xRRGGBB integer.
 */
export function getSkyColor(timeOfDay: number, baseSkyColor: number): number {
  const dawnStart = CB.DAWN_START;
  const dawnEnd = CB.DAWN_END;
  const duskStart = CB.DUSK_START;
  const duskEnd = CB.DUSK_END;

  // Full day
  if (timeOfDay >= dawnEnd && timeOfDay <= duskStart) {
    return baseSkyColor;
  }

  // Dawn rising
  if (timeOfDay >= dawnStart && timeOfDay < dawnEnd) {
    const t = smoothstep(dawnStart, dawnEnd, timeOfDay);
    // night -> dawn color -> day color
    if (t < 0.5) {
      return lerpColor(NIGHT_SKY, DAWN_SKY, t * 2);
    }
    return lerpColor(DAWN_SKY, baseSkyColor, (t - 0.5) * 2);
  }

  // Dusk falling
  if (timeOfDay > duskStart && timeOfDay <= duskEnd) {
    const t = smoothstep(duskStart, duskEnd, timeOfDay);
    if (t < 0.5) {
      return lerpColor(baseSkyColor, DUSK_SKY, t * 2);
    }
    return lerpColor(DUSK_SKY, NIGHT_SKY, (t - 0.5) * 2);
  }

  // Night
  return NIGHT_SKY;
}

/**
 * Interpolate fog color based on time of day.
 * `baseFogColor` is the default daytime fog color.
 * Returns an 0xRRGGBB integer.
 */
export function getFogColor(timeOfDay: number, baseFogColor: number): number {
  const dawnStart = CB.DAWN_START;
  const dawnEnd = CB.DAWN_END;
  const duskStart = CB.DUSK_START;
  const duskEnd = CB.DUSK_END;

  // Full day
  if (timeOfDay >= dawnEnd && timeOfDay <= duskStart) {
    return baseFogColor;
  }

  // Dawn
  if (timeOfDay >= dawnStart && timeOfDay < dawnEnd) {
    const t = smoothstep(dawnStart, dawnEnd, timeOfDay);
    if (t < 0.5) {
      return lerpColor(NIGHT_FOG, DAWN_FOG, t * 2);
    }
    return lerpColor(DAWN_FOG, baseFogColor, (t - 0.5) * 2);
  }

  // Dusk
  if (timeOfDay > duskStart && timeOfDay <= duskEnd) {
    const t = smoothstep(duskStart, duskEnd, timeOfDay);
    if (t < 0.5) {
      return lerpColor(baseFogColor, DUSK_FOG, t * 2);
    }
    return lerpColor(DUSK_FOG, NIGHT_FOG, (t - 0.5) * 2);
  }

  // Night
  return NIGHT_FOG;
}
