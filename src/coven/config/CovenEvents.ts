// ---------------------------------------------------------------------------
// Coven mode — story events during foraging
// ---------------------------------------------------------------------------

import type { CovenTerrain, IngredientId } from "../state/CovenState";

export interface CovenEvent {
  id: string;
  title: string;
  description: string;
  terrains: CovenTerrain[] | null; // null = any terrain
  choices: CovenEventChoice[];
  minDay?: number;
  unique?: boolean;
}

export interface CovenEventChoice {
  label: string;
  outcome: CovenEventOutcome;
}

export interface CovenEventOutcome {
  text: string;
  health?: number;
  mana?: number;
  ingredients?: { id: IngredientId; count: number }[];
  ingredientLoss?: IngredientId;
  learnSpell?: string;
  revealHexes?: number;
}

export const COVEN_EVENTS: CovenEvent[] = [
  {
    id: "wounded_traveler", title: "The Wounded Traveler",
    description: "A man lies bleeding beside the path. He looks up at you with terrified eyes. 'Please... the wolves...' He's been mauled. You could help him — but healing draws attention.",
    terrains: ["clearing", "deep_woods"],
    choices: [
      { label: "Heal him", outcome: { text: "You spend precious herbs binding his wounds. He whispers thanks and stumbles away. He'll tell no one — probably.", health: -5, mana: -10, ingredients: [{ id: "crow_feather", count: 2 }] } },
      { label: "Leave him", outcome: { text: "You walk past. His eyes follow you. The forest will decide his fate.", mana: 5 } },
    ],
  },
  {
    id: "ancient_tome", title: "The Forgotten Grimoire",
    description: "Half-buried in the rubble, a book. Its pages are yellowed but intact. Ancient spells, written in a hand you almost recognize — Merlin's?",
    terrains: ["ruins"],
    unique: true,
    choices: [
      { label: "Study the pages", outcome: { text: "Hours pass as you decipher the cramped script. New knowledge floods your mind — Shadow Bolt, a lance of pure darkness.", mana: 20, learnSpell: "shadow_bolt" } },
      { label: "Take it for later", outcome: { text: "You tuck the grimoire into your pack. Its weight feels significant.", ingredients: [{ id: "ancient_bone", count: 1 }], learnSpell: "sleep_fog" } },
    ],
  },
  {
    id: "fae_bargain", title: "The Fae Bargain",
    description: "A tiny figure perches on a mushroom, grinning. 'Witch! I have something you want.' It holds up a glowing crystal. 'But everything has a price, yes?'",
    terrains: ["clearing", "ley_line"],
    choices: [
      { label: "What's your price?", outcome: { text: "'Your prettiest ingredient!' The fae snatches a moonstone from your pack and replaces it with a ley crystal. 'Fair trade!' it cackles, and vanishes.", ingredientLoss: "moonstone", ingredients: [{ id: "ley_crystal", count: 1 }] } },
      { label: "Decline", outcome: { text: "The fae pouts, then grins wider. 'You'll need me someday, witch!' It vanishes in a puff of glitter.", mana: 3 } },
    ],
  },
  {
    id: "herb_lore", title: "The Herb Garden",
    description: "Someone once tended a garden here. Medicinal herbs grow in neat rows, gone wild but still potent. A healer's garden, abandoned when the inquisitors came.",
    terrains: ["village", "clearing"],
    choices: [
      { label: "Harvest everything", outcome: { text: "You fill your pouches with foxglove, mugwort, and nightshade. A bounty.", ingredients: [{ id: "foxglove", count: 3 }, { id: "mugwort", count: 3 }, { id: "nightshade", count: 2 }] } },
    ],
  },
  {
    id: "dead_witch", title: "The Fallen Witch",
    description: "A body lies at the base of a tree, weeks dead. A witch — you can tell by the silver rings and the grimoire clutched to her chest. The inquisitors got her. But they didn't find everything.",
    terrains: ["deep_woods", "swamp"],
    unique: true,
    choices: [
      { label: "Search her belongings", outcome: { text: "In a hidden pocket: moonstone dust, a vial of shadow essence, and her grimoire with Drain Life inscribed in blood.", ingredients: [{ id: "moonstone", count: 1 }, { id: "shadow_essence", count: 1 }], revealHexes: 2, learnSpell: "drain_life" } },
      { label: "Bury her", outcome: { text: "You dig with your hands. As you lay her to rest, her magic passes to you — Banishment, the spell that could have saved her.", mana: 25, health: 10, learnSpell: "banishment" } },
    ],
  },
  {
    id: "cave_crystals", title: "The Crystal Cavern",
    description: "Deep in the cave, crystals grow from the walls — pulsing faintly with magical energy. You could chip some free, but disturbing them might wake something.",
    terrains: ["cave"],
    choices: [
      { label: "Harvest crystals", outcome: { text: "You carefully extract three crystals. The cave groans. Something stirs deeper in. Time to leave.", ingredients: [{ id: "ley_crystal", count: 1 }, { id: "moonstone", count: 1 }] } },
      { label: "Leave them", outcome: { text: "Wisdom wins. You back away slowly. The crystals pulse — grateful?", mana: 10 } },
    ],
  },
  {
    id: "village_sympathy", title: "The Sympathizer",
    description: "An old woman watches you from a cottage window. She opens her door a crack. 'I know what you are. My daughter was one. Come inside — quickly, before they see.'",
    terrains: ["village"],
    choices: [
      { label: "Accept her hospitality", outcome: { text: "She feeds you broth and bandages your scratches. 'The inquisitors passed through yesterday,' she warns. 'They're looking for someone.' She gives you her daughter's herbs.", health: 20, ingredients: [{ id: "mugwort", count: 2 }, { id: "hemlock", count: 1 }] } },
      { label: "Decline — too risky", outcome: { text: "You nod and slip back into the trees. Trust is a luxury.", mana: 5 } },
    ],
  },
  {
    id: "graveyard_whispers", title: "Whispers from the Graves",
    description: "The tombstones murmur. Not words — feelings. Sorrow. Anger. Fear. One grave is open, the earth freshly turned. Something was buried here. Something that wants out.",
    terrains: ["graveyard"],
    choices: [
      { label: "Reach into the grave", outcome: { text: "Your fingers close on cold metal — a silver mirror, cracked but still potent with old magic. The whispers quiet.", ingredients: [{ id: "silver_dust", count: 2 }, { id: "ancient_bone", count: 1 }] } },
      { label: "Walk away quickly", outcome: { text: "Some graves should stay closed. You hurry away, the whispers fading behind you.", mana: 5 } },
    ],
  },
  {
    id: "storm_brewing", title: "The Storm",
    description: "Lightning flickers on the horizon. The air crackles with static. A storm is coming — and storms supercharge ley lines. If you're standing on one when lightning strikes...",
    terrains: null,
    minDay: 5,
    choices: [
      { label: "Race to a ley line", outcome: { text: "You sprint through the rain. Lightning strikes the standing stones ahead. Power surges through the earth and into you. Your mana blazes.", mana: 30, health: -10 } },
      { label: "Take shelter", outcome: { text: "You huddle under a tree and wait. The storm passes. You're dry but feel you missed something.", health: 5 } },
    ],
  },
  {
    id: "inquisitor_camp", title: "The Abandoned Camp",
    description: "An inquisitor camp, recently vacated. Papers scattered in haste. Maps marked with search patterns. And — there — a crate of confiscated ingredients. They took these from other witches.",
    terrains: ["clearing", "village"],
    unique: true,
    minDay: 6,
    choices: [
      { label: "Raid the camp", outcome: { text: "You grab everything you can carry. Dragon scales, sulfur, iron filings — the inquisitors' stolen hoard. They'll notice it's gone.", ingredients: [{ id: "dragon_scale", count: 1 }, { id: "sulfur", count: 2 }, { id: "iron_filings", count: 2 }], revealHexes: 3 } },
      { label: "Study their maps", outcome: { text: "You memorize their patrol routes. Now you know where they'll be — and won't be.", revealHexes: 5 } },
    ],
  },
];
