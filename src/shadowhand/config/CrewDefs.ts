// ---------------------------------------------------------------------------
// Shadowhand mode — crew archetype definitions
// ---------------------------------------------------------------------------

export type CrewRole = "cutpurse" | "sapmaster" | "shade" | "brawler" | "charlatan" | "alchemist";

export interface CrewArchetype {
  role: CrewRole;
  name: string;
  desc: string;
  color: number;
  hp: number;
  speed: number; // multiplier
  noiseMultiplier: number;
  visionRange: number; // tiles the thief can see
  abilities: string[];
  traits: string[];
}

export const CREW_ARCHETYPES: Record<CrewRole, CrewArchetype> = {
  cutpurse: {
    role: "cutpurse",
    name: "Cutpurse",
    desc: "Fastest thief. Can pickpocket keys from guards without takedown.",
    color: 0x44cc88,
    hp: 80,
    speed: 1.3,
    noiseMultiplier: 0.8,
    visionRange: 5,
    abilities: ["pickpocket", "sprint", "distract_coin"],
    traits: ["nimble_fingers", "light_footed"],
  },
  sapmaster: {
    role: "sapmaster",
    name: "Sapmaster",
    desc: "Lock and trap specialist. Slow but opens every path.",
    color: 0xccaa44,
    hp: 90,
    speed: 0.85,
    noiseMultiplier: 0.9,
    visionRange: 4,
    abilities: ["lockpick_silent", "disarm_trap", "find_secret"],
    traits: ["keen_eye", "patient_hands"],
  },
  shade: {
    role: "shade",
    name: "Shade",
    desc: "Near-invisible in darkness. Can extinguish torches at range.",
    color: 0x6644cc,
    hp: 70,
    speed: 1.1,
    noiseMultiplier: 0.5,
    visionRange: 6,
    abilities: ["shadow_meld", "extinguish", "shadow_step"],
    traits: ["shadow_born", "dark_vision"],
  },
  brawler: {
    role: "brawler",
    name: "Brawler",
    desc: "Silent takedowns, can carry heavy loot and break through walls.",
    color: 0xcc4444,
    hp: 140,
    speed: 0.9,
    noiseMultiplier: 1.2,
    visionRange: 4,
    abilities: ["takedown", "carry_heavy", "breach_wall"],
    traits: ["iron_grip", "thick_skull"],
  },
  charlatan: {
    role: "charlatan",
    name: "Charlatan",
    desc: "Master of disguise. Can bluff past guards in lit areas.",
    color: 0xcc8844,
    hp: 85,
    speed: 1.0,
    noiseMultiplier: 1.0,
    visionRange: 5,
    abilities: ["disguise", "bluff", "distract_talk"],
    traits: ["silver_tongue", "quick_change"],
  },
  alchemist: {
    role: "alchemist",
    name: "Alchemist",
    desc: "Smoke bombs, sleeping gas, acid for locks. Utility wildcard.",
    color: 0x44aacc,
    hp: 75,
    speed: 0.95,
    noiseMultiplier: 0.9,
    visionRange: 5,
    abilities: ["smoke_bomb", "sleep_dart", "acid_vial"],
    traits: ["brewer", "chemical_resistance"],
  },
};

export const ALL_CREW_ROLES: CrewRole[] = ["cutpurse", "sapmaster", "shade", "brawler", "charlatan", "alchemist"];

export interface CrewMember {
  id: string;
  role: CrewRole;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  noiseMultiplier: number;
  visionRange: number;
  level: number;
  xp: number;
  alive: boolean;
  captured: boolean;
  cooldowns: Map<string, number>;
}

// Name pool for random crew generation
const FIRST_NAMES = [
  "Wren", "Finch", "Marten", "Thistle", "Ash", "Bramble", "Slate", "Ember",
  "Thorn", "Rue", "Moss", "Flint", "Brier", "Dusk", "Sable", "Hazel",
  "Rook", "Yarrow", "Ivy", "Cinder", "Dagger", "Silk", "Shadow", "Fog",
  "Blade", "Wisp", "Spark", "Hollow", "Vex", "Nimble", "Twist", "Ghost",
];

export function generateCrewName(seed: number): string {
  return FIRST_NAMES[Math.abs(seed) % FIRST_NAMES.length];
}

export function createCrewMember(role: CrewRole, id: string, nameSeed: number): CrewMember {
  const arch = CREW_ARCHETYPES[role];
  return {
    id,
    role,
    name: generateCrewName(nameSeed),
    hp: arch.hp,
    maxHp: arch.hp,
    speed: arch.speed,
    noiseMultiplier: arch.noiseMultiplier,
    visionRange: arch.visionRange,
    level: 1,
    xp: 0,
    alive: true,
    captured: false,
    cooldowns: new Map(),
  };
}
