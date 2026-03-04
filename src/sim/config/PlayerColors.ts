// Centralized player color definitions for all renderers and UI.

const PLAYER_COLOR_MAP: Record<string, number> = {
  p1: 0x4488ff, // Blue
  p2: 0xff4444, // Red
  p3: 0x44bb44, // Green
  p4: 0xffaa22, // Orange
};

const NEUTRAL_COLOR = 0xeeeeee;

/** Returns the display color for a player, or neutral white if owner is null/unknown. */
export function getPlayerColor(owner: string | null): number {
  if (!owner) return NEUTRAL_COLOR;
  return PLAYER_COLOR_MAP[owner] ?? NEUTRAL_COLOR;
}
