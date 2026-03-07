// ---------------------------------------------------------------------------
// Meta-progression upgrade definitions — permanent stat boosts
// ---------------------------------------------------------------------------

export interface SurvivorMetaUpgrade {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costPerLevel: number[];
  stat: string;
  valuePerLevel: number;
}

export const META_UPGRADES: SurvivorMetaUpgrade[] = [
  {
    id: "max_hp",
    name: "Vitality",
    description: "+10 max HP per level",
    maxLevel: 10,
    costPerLevel: [50, 100, 150, 200, 300, 400, 500, 700, 900, 1200],
    stat: "hp",
    valuePerLevel: 10,
  },
  {
    id: "move_speed",
    name: "Swiftness",
    description: "+3% move speed per level",
    maxLevel: 5,
    costPerLevel: [100, 200, 400, 600, 1000],
    stat: "speed",
    valuePerLevel: 0.03,
  },
  {
    id: "damage",
    name: "Might",
    description: "+5% damage per level",
    maxLevel: 10,
    costPerLevel: [75, 150, 250, 400, 600, 800, 1000, 1300, 1600, 2000],
    stat: "atk",
    valuePerLevel: 0.05,
  },
  {
    id: "xp_gain",
    name: "Wisdom",
    description: "+5% XP per level",
    maxLevel: 5,
    costPerLevel: [100, 200, 350, 500, 800],
    stat: "xpMult",
    valuePerLevel: 0.05,
  },
  {
    id: "pickup_radius",
    name: "Magnetism",
    description: "+0.5 pickup radius per level",
    maxLevel: 5,
    costPerLevel: [50, 100, 200, 300, 500],
    stat: "pickupRadius",
    valuePerLevel: 0.5,
  },
  {
    id: "gold_gain",
    name: "Greed",
    description: "+10% gold per level",
    maxLevel: 5,
    costPerLevel: [200, 400, 600, 1000, 1500],
    stat: "goldMult",
    valuePerLevel: 0.10,
  },
];
