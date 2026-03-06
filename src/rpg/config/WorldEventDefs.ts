// Random world event definitions for the overworld
// These trigger periodically while exploring and present the player with choices.

export interface WorldEventChoice {
  label: string;
  effects: {
    gold?: number;
    karma?: number;
    xp?: number;
    reputation?: number;
    encounterTrigger?: string; // encounter ID to force battle
    buff?: { type: string; duration: number; magnitude: number };
    consumeItem?: string; // item ID consumed
  };
}

export interface WorldEventDef {
  id: string;
  title: string;
  description: string;
  choices: WorldEventChoice[];
}

export const WORLD_EVENTS: WorldEventDef[] = [
  // 1. Overturned Cart
  {
    id: "overturned_cart",
    title: "Overturned Cart",
    description: "You come across an overturned merchant cart on the road. Goods are scattered everywhere, and the driver is pinned beneath a broken wheel.",
    choices: [
      {
        label: "Help the merchant",
        effects: { karma: 10, gold: 30 },
      },
      {
        label: "Loot the cart",
        effects: { gold: 50, karma: -10 },
      },
    ],
  },
  // 2. Wounded Traveler
  {
    id: "wounded_traveler",
    title: "Wounded Traveler",
    description: "A wounded traveler lies at the side of the road, clutching a bleeding wound. They beg for help.",
    choices: [
      {
        label: "Heal with an herb",
        effects: { consumeItem: "herb", xp: 50, karma: 5 },
      },
      {
        label: "Ignore and walk on",
        effects: { karma: -2 },
      },
    ],
  },
  // 3. Mysterious Shrine
  {
    id: "mysterious_shrine",
    title: "Mysterious Shrine",
    description: "A weathered stone shrine stands at the crossroads, faintly glowing with ancient magic. Offerings of coins and flowers surround it.",
    choices: [
      {
        label: "Pray at the shrine",
        effects: { buff: { type: "atk", duration: 50, magnitude: 5 } },
      },
      {
        label: "Smash the shrine for gold",
        effects: { gold: 40, karma: -5 },
      },
    ],
  },
  // 4. Merchant Caravan
  {
    id: "merchant_caravan",
    title: "Merchant Caravan",
    description: "A well-guarded merchant caravan is camped along the road. The lead merchant eyes you warily but offers to sell a potion.",
    choices: [
      {
        label: "Buy a potion (-30 gold)",
        effects: { gold: -30 },
      },
      {
        label: "Rob the caravan",
        effects: { encounterTrigger: "bandit_ambush", gold: 80, karma: -15 },
      },
    ],
  },
  // 5. Ambush
  {
    id: "ambush",
    title: "Ambush!",
    description: "Bandits leap from the bushes! There is no escape -- you must fight!",
    choices: [
      {
        label: "Fight!",
        effects: { encounterTrigger: "bandit_ambush", xp: 20 },
      },
    ],
  },
  // 6. Lost Child
  {
    id: "lost_child",
    title: "Lost Child",
    description: "A crying child is wandering alone in the wilderness, clearly lost and frightened.",
    choices: [
      {
        label: "Help the child find their way home",
        effects: { karma: 20, xp: 40 },
      },
      {
        label: "Ignore the child",
        effects: { karma: -5 },
      },
    ],
  },
  // 7. Fairy Ring
  {
    id: "fairy_ring",
    title: "Fairy Ring",
    description: "A circle of glowing mushrooms pulses with otherworldly light. You feel a strange pull toward the center.",
    choices: [
      {
        label: "Step into the ring",
        effects: { buff: { type: "fairy_ring", duration: 0, magnitude: 0 } }, // handled specially: 50% heal, 50% poison
      },
      {
        label: "Walk away",
        effects: {},
      },
    ],
  },
  // 8. Abandoned Camp
  {
    id: "abandoned_camp",
    title: "Abandoned Camp",
    description: "You stumble upon a recently abandoned campsite. A pack lies open near the cold fire pit.",
    choices: [
      {
        label: "Search the camp",
        effects: { gold: 15, xp: 10 }, // random item granted by system
      },
      {
        label: "Leave it alone",
        effects: {},
      },
    ],
  },
  // 9. Old Well
  {
    id: "old_well",
    title: "Old Well",
    description: "An ancient stone well sits in a clearing. The water inside shimmers with a faint glow.",
    choices: [
      {
        label: "Throw in a coin for luck",
        effects: { gold: -10, buff: { type: "luck", duration: 30, magnitude: 1 } },
      },
      {
        label: "Drink from the well",
        effects: { buff: { type: "heal_party_30", duration: 0, magnitude: 30 } }, // heal party 30%
      },
    ],
  },
  // 10. Haunted Ruins
  {
    id: "haunted_ruins",
    title: "Haunted Ruins",
    description: "Crumbling ruins loom before you. An eerie moan echoes from deep within, but faint glimmers of treasure catch your eye.",
    choices: [
      {
        label: "Explore the ruins",
        effects: { encounterTrigger: "dungeon_undead", xp: 50 },
      },
      {
        label: "Flee",
        effects: {},
      },
    ],
  },
];
