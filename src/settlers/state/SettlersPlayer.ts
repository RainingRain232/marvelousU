// ---------------------------------------------------------------------------
// Settlers – Player state
// ---------------------------------------------------------------------------

import { ResourceType } from "../config/SettlersResourceDefs";

/** AI personality types that determine strategic behavior */
export type AIPersonality = "balanced" | "rusher" | "turtle" | "economist" | "expansionist";

export const AI_PERSONALITY_LABELS: Record<AIPersonality, string> = {
  balanced: "Balanced",
  rusher: "Rusher",
  turtle: "Turtle",
  economist: "Economist",
  expansionist: "Expansionist",
};

export const AI_PERSONALITY_DESCRIPTIONS: Record<AIPersonality, string> = {
  balanced: "A well-rounded opponent with no particular focus.",
  rusher: "Prioritizes early military aggression. Attacks fast with fewer soldiers.",
  turtle: "Builds heavy defenses and a strong economy before striking.",
  economist: "Races toward economic victory by amassing gold.",
  expansionist: "Aggressively claims territory, spreading wide before building deep.",
};

export interface SettlersPlayer {
  id: string;
  name: string;
  color: number;       // hex color for territory/units
  isAI: boolean;

  /** Global resource storage (sum of all storehouses + HQ) */
  storage: Map<ResourceType, number>;

  /** Available workers (not yet assigned to buildings) */
  availableWorkers: number;
  /** Total soldiers not garrisoned */
  freeSoldiers: number;

  /** HQ building ID */
  hqId: string;

  /** Has this player been eliminated? */
  defeated: boolean;

  /** AI personality (only relevant for AI players) */
  aiPersonality: AIPersonality | null;

  /** Whether the AI personality has been revealed to the human player */
  aiPersonalityRevealed: boolean;
}
