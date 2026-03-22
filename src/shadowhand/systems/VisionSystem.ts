// ---------------------------------------------------------------------------
// Shadowhand mode — guard vision cone & line-of-sight system
// ---------------------------------------------------------------------------

import type { HeistState, Guard, ThiefUnit, MapTile } from "../state/ShadowhandState";
import { AlertLevel } from "../state/ShadowhandState";
import { ShadowhandConfig } from "../config/ShadowhandConfig";
import type { ShadowhandDifficulty } from "../config/ShadowhandConfig";
import { getDifficulty } from "../config/ShadowhandConfig";

export interface VisionResult {
  guardId: string;
  thiefId: string;
  distance: number;
  inCone: boolean;
  peripheral: boolean;
  inShadow: boolean;
}

function lineOfSight(tiles: MapTile[][], x0: number, y0: number, x1: number, y1: number): boolean {
  // Bresenham ray cast — blocked by walls and closed doors
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0, cy = y0;

  while (cx !== x1 || cy !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
    if (cx === x1 && cy === y1) break;
    if (cy < 0 || cy >= tiles.length || cx < 0 || cx >= tiles[0].length) return false;
    const t = tiles[cy][cx].type;
    if (t === "wall" || t === "locked_door") return false;
    // Smoke blocks vision
    if (tiles[cy][cx].smoke > 0) return false;
  }
  return true;
}

function angleBetween(a: number, b: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
}

export function checkGuardVision(
  guard: Guard,
  thief: ThiefUnit,
  tiles: MapTile[][],
  difficulty: ShadowhandDifficulty,
): VisionResult | null {
  if (guard.stunTimer > 0 || guard.sleepTimer > 0) return null;
  if (!thief.alive || thief.captured) return null;

  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const diff = getDifficulty(difficulty);
  const range = ShadowhandConfig.GUARD_VISION_RANGE * diff.guardVisionMult;

  if (dist > range) return null;

  // Line of sight check
  const gx = Math.round(guard.x), gy = Math.round(guard.y);
  const tx = Math.round(thief.x), ty = Math.round(thief.y);
  if (!lineOfSight(tiles, gx, gy, tx, ty)) return null;

  // Angle check for cone
  const angleToThief = Math.atan2(dy, dx);
  const angleDiff = angleBetween(guard.angle, angleToThief);
  const inCone = angleDiff <= ShadowhandConfig.GUARD_VISION_ANGLE;
  const peripheral = !inCone && dist <= ShadowhandConfig.GUARD_PERIPHERAL_RANGE;

  if (!inCone && !peripheral) return null;

  // Shadow check
  const thiefTile = tiles[Math.round(thief.y)]?.[Math.round(thief.x)];
  const inShadow = thiefTile ? !thiefTile.lit : true;

  // Disguise check — in lit areas, disguised thieves aren't detected
  if (thief.disguised && !inShadow && !guard.isElite) return null;

  // Shadow meld — invisible in darkness
  if (thief.shadowMeld && inShadow) return null;

  return {
    guardId: guard.id,
    thiefId: thief.id,
    distance: dist,
    inCone,
    peripheral,
    inShadow,
  };
}

export function calculateDetectionRate(result: VisionResult, thief: ThiefUnit): number {
  let rate = 10; // base detection per second

  // Distance falloff
  rate *= 1.0 - (result.distance / ShadowhandConfig.GUARD_VISION_RANGE) * 0.5;

  // Peripheral = much slower detection
  if (result.peripheral) rate *= 0.3;

  // Shadow = harder to see
  if (result.inShadow) rate *= ShadowhandConfig.SHADOW_DETECTION_MULT;

  // Moving = easier to spot
  if (thief.moving) rate *= ShadowhandConfig.MOVING_DETECTION_MULT;

  // Crouching = harder to spot
  if (thief.crouching) rate *= 0.5;

  return Math.max(rate, 0);
}

export function updateGuardVision(heist: HeistState, difficulty: ShadowhandDifficulty, dt: number): VisionResult[] {
  const allSightings: VisionResult[] = [];
  const diffSettings = getDifficulty(difficulty);

  for (const guard of heist.guards) {
    let bestSighting: VisionResult | null = null;
    let bestRate = 0;

    for (const thief of heist.thieves) {
      const result = checkGuardVision(guard, thief, heist.map.tiles, difficulty);
      if (result) {
        const rate = calculateDetectionRate(result, thief);
        if (rate > bestRate) {
          bestSighting = result;
          bestRate = rate;
        }
        allSightings.push(result);
      }
    }

    if (bestSighting) {
      // Increase alert
      guard.alertTimer += bestRate * dt * diffSettings.alertMult;
      guard.canSeeThief = bestSighting.thiefId;

      if (guard.alertTimer >= ShadowhandConfig.ALERT_ALARMED_THRESHOLD) {
        guard.alertLevel = AlertLevel.ALARMED;
      } else if (guard.alertTimer >= ShadowhandConfig.ALERT_SUSPICIOUS_THRESHOLD) {
        guard.alertLevel = AlertLevel.SUSPICIOUS;
        const thief = heist.thieves.find(t => t.id === bestSighting!.thiefId);
        if (thief) guard.investigating = { x: thief.x, y: thief.y };
      }
    } else {
      // Decay alert when nothing visible
      guard.canSeeThief = null;
      if (guard.alertTimer > 0 && guard.alertLevel !== AlertLevel.ALARMED) {
        guard.alertTimer = Math.max(0, guard.alertTimer - ShadowhandConfig.ALERT_DECAY_RATE * dt);
        if (guard.alertTimer < ShadowhandConfig.ALERT_SUSPICIOUS_THRESHOLD) {
          guard.alertLevel = AlertLevel.UNAWARE;
          guard.investigating = null;
        }
      }
    }
  }

  return allSightings;
}
