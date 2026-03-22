// ---------------------------------------------------------------------------
// Shadowhand mode — noise propagation system
// ---------------------------------------------------------------------------

import type { HeistState } from "../state/ShadowhandState";
import { AlertLevel } from "../state/ShadowhandState";
import { ShadowhandConfig } from "../config/ShadowhandConfig";

export function createNoiseEvent(
  heist: HeistState,
  x: number,
  y: number,
  radius: number,
  source: string,
): void {
  heist.noiseEvents.push({
    x, y,
    radius,
    timer: radius / ShadowhandConfig.NOISE_DECAY_RATE,
    source,
  });
}

export function emitWalkNoise(heist: HeistState, thiefId: string, x: number, y: number, noiseMult: number, running: boolean, crouching: boolean): void {
  let base = running ? ShadowhandConfig.NOISE_RUN : crouching ? ShadowhandConfig.NOISE_CROUCH : ShadowhandConfig.NOISE_WALK;
  base *= noiseMult;
  if (base > 0.3) {
    createNoiseEvent(heist, x, y, base, thiefId);
  }
}

export function emitActionNoise(heist: HeistState, x: number, y: number, noiseLevel: number, source: string): void {
  createNoiseEvent(heist, x, y, noiseLevel, source);
}

export function updateNoiseEvents(heist: HeistState, dt: number): void {
  // Decay noise events
  for (let i = heist.noiseEvents.length - 1; i >= 0; i--) {
    heist.noiseEvents[i].timer -= dt;
    if (heist.noiseEvents[i].timer <= 0) {
      heist.noiseEvents.splice(i, 1);
    }
  }
}

export function guardsHearNoise(heist: HeistState): void {
  for (const noise of heist.noiseEvents) {
    for (const guard of heist.guards) {
      if (guard.stunTimer > 0 || guard.sleepTimer > 0) continue;

      const dx = guard.x - noise.x;
      const dy = guard.y - noise.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= noise.radius) {
        const intensity = 1.0 - dist / noise.radius;
        const alertIncrease = intensity * 20;

        guard.alertTimer += alertIncrease;

        if (guard.alertTimer >= ShadowhandConfig.ALERT_ALARMED_THRESHOLD) {
          guard.alertLevel = AlertLevel.ALARMED;
          guard.investigating = { x: noise.x, y: noise.y };
        } else if (guard.alertTimer >= ShadowhandConfig.ALERT_SUSPICIOUS_THRESHOLD) {
          guard.alertLevel = AlertLevel.SUSPICIOUS;
          guard.investigating = { x: noise.x, y: noise.y };
        }
      }
    }
  }
}

export function updateGlobalAlert(heist: HeistState, dt: number): void {
  // Check if any guard is alarmed
  const anyAlarmed = heist.guards.some(g => g.alertLevel === AlertLevel.ALARMED);
  const anySuspicious = heist.guards.some(g => g.alertLevel === AlertLevel.SUSPICIOUS);

  if (anyAlarmed) {
    heist.globalAlert = AlertLevel.ALARMED;
    heist.globalAlertTimer = ShadowhandConfig.ALERT_LOCKDOWN_TIMER;
    // Count reinforcement timer
    if (heist.reinforcementsSpawned < 3) {
      heist.reinforcementTimer += dt;
    }
  } else if (anySuspicious) {
    heist.globalAlert = AlertLevel.SUSPICIOUS;
  } else if (heist.globalAlertTimer > 0) {
    heist.globalAlertTimer -= dt;
    if (heist.globalAlertTimer <= 0) {
      heist.globalAlert = AlertLevel.UNAWARE;
    }
  } else {
    heist.globalAlert = AlertLevel.UNAWARE;
  }
}
