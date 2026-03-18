// ---------------------------------------------------------------------------
// Terraria – Day/night cycle
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import type { TerrariaState } from "../state/TerrariaState";

export function updateDayNight(state: TerrariaState, dt: number): void {
  state.totalTime += dt;
  state.timeOfDay += dt / TB.DAY_LENGTH;
  if (state.timeOfDay >= 1) {
    state.timeOfDay -= 1;
    state.dayNumber++;
  }

  // Sunlight level varies with time of day
  // Full light at noon (0.5), dim at dawn/dusk, dark at midnight (0.0)
  const t = state.timeOfDay;
  const sunCurve = Math.max(0, Math.sin(t * Math.PI * 2 - Math.PI / 2));
  const newSunlight = Math.floor(3 + sunCurve * (TB.MAX_LIGHT - 3));
  if (newSunlight !== state.sunlightLevel) {
    state.sunlightLevel = newSunlight;
    // Mark all chunks for lighting recalc
    for (const chunk of state.chunks.values()) {
      chunk.lightDirty = true;
    }
  }
}
