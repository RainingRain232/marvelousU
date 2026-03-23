// ---------------------------------------------------------------------------
// Round Table – Narrative Event Definitions
// ---------------------------------------------------------------------------

import { EventDef } from "../types";

export const EVENT_DEFS: EventDef[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ACT 1 EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "wounded_knight", title: "A Wounded Knight",
    description: "A knight lies bleeding by the roadside, clutching a shattered lance. He begs you for aid.",
    image: "wounded_knight", act: 1,
    choices: [
      {
        text: "Give him your healing potion. (Lose 15 HP, gain a Virtue card, Purity +5)",
        effects: [
          { type: "damage", value: 15 },
          { type: "add_card", value: "faith" },
          { type: "purity", value: 5 },
        ],
      },
      {
        text: "Take his gold pouch while he sleeps. (Gain 50 Gold, Purity -5)",
        effects: [
          { type: "gold", value: 50 },
          { type: "purity", value: -5 },
        ],
      },
      {
        text: "Leave him. You cannot risk the delay.",
        effects: [],
      },
    ],
  },
  {
    id: "old_chapel", title: "The Old Chapel",
    description: "You find a crumbling chapel deep in the woods. The altar still glows faintly with divine light.",
    image: "chapel", act: 1,
    choices: [
      {
        text: "Pray at the altar. (Heal 25% HP, Purity +3)",
        effects: [
          { type: "heal", value: 0.25 },
          { type: "purity", value: 3 },
        ],
      },
      {
        text: "Loot the offering box. (Gain 75 Gold, Purity -8, gain Curse)",
        effects: [
          { type: "gold", value: 75 },
          { type: "purity", value: -8 },
          { type: "add_card", value: "curse_regret" },
        ],
      },
      {
        text: "Upgrade a card at the enchanted font.",
        effects: [{ type: "upgrade_card", value: 1 }],
      },
    ],
  },
  {
    id: "travelling_merchant", title: "Travelling Merchant",
    description: "A jovial merchant with a cart full of oddities blocks the road. 'Fancy a trade, good knight?'",
    image: "merchant", act: 0, // any act
    choices: [
      {
        text: "Buy a random Relic. (Pay 90 Gold)",
        effects: [
          { type: "gold", value: -90 },
          { type: "add_relic", value: "random_common" },
        ],
        condition: (s) => s.gold >= 90,
      },
      {
        text: "Trade max HP for a rare card. (Lose 8 Max HP, gain a random rare card)",
        effects: [
          { type: "max_hp", value: -8 },
          { type: "add_card", value: "random_rare" },
        ],
      },
      {
        text: "Decline and move on.",
        effects: [],
      },
    ],
  },
  {
    id: "mysterious_chest", title: "The Mysterious Chest",
    description: "An ornate chest with no lock.",
    image: "mysterious_chest", act: 0, // any act
    choices: [
      {
        text: "Open it. (Gain a random relic, 50% chance of a Curse)",
        effects: [
          { type: "add_relic", value: "random_common" },
          { type: "add_card", value: "curse_doubt" },
        ],
      },
      {
        text: "Sell it to the next merchant. (Gain 80 Gold)",
        effects: [{ type: "gold", value: 80 }],
      },
      {
        text: "Leave it alone.",
        effects: [],
      },
    ],
  },
  {
    id: "wandering_bard", title: "The Wandering Bard",
    description: "A bard plays a melancholy tune.",
    image: "wandering_bard", act: 0, // any act
    choices: [
      {
        text: "Listen to the song. (Heal 15 HP, Purity +2)",
        effects: [
          { type: "heal", value: 15 },
          { type: "purity", value: 2 },
        ],
      },
      {
        text: "Request a battle song. (Gain a Strength card)",
        effects: [{ type: "add_card", value: "inflame" }],
      },
      {
        text: "Ignore him and move on.",
        effects: [],
      },
    ],
  },
  {
    id: "blacksmith_forge", title: "The Blacksmith's Forge",
    description: "A weathered blacksmith offers to improve your gear.",
    image: "blacksmith_forge", act: 1,
    choices: [
      {
        text: "Ask him to upgrade your equipment. (Upgrade a random card)",
        effects: [{ type: "upgrade_card", value: 1 }],
      },
      {
        text: "Ask him to melt something down. (Remove a card)",
        effects: [{ type: "remove_card", value: 1 }],
      },
      {
        text: "Leave.",
        effects: [],
      },
    ],
  },
  {
    id: "bandit_ambush", title: "Bandit Ambush",
    description: "Bandits surround you! 'Your gold or your life!'",
    image: "bandit_ambush", act: 1,
    choices: [
      {
        text: "Pay them off. (Lose 30 Gold)",
        effects: [{ type: "gold", value: -30 }],
        condition: (s) => s.gold >= 30,
      },
      {
        text: "Fight your way out. (Take 12 damage, gain 30 Gold)",
        effects: [
          { type: "damage", value: 12 },
          { type: "gold", value: 30 },
        ],
      },
      {
        text: "Surrender a card. (Lose a random card)",
        effects: [{ type: "remove_card", value: 1 }],
      },
    ],
  },
  {
    id: "fairy_ring", title: "The Fairy Ring",
    description: "Mushrooms form a perfect circle in a moonlit glade. You feel reality thin here.",
    image: "fairy_ring", act: 1,
    choices: [
      {
        text: "Step into the ring. (Transform a random card into a random card of higher rarity)",
        effects: [{ type: "transform_card", value: 1 }],
      },
      {
        text: "Gather the mushrooms. (Gain 2 random potions, but gain a Curse)",
        effects: [
          { type: "add_card", value: "curse_doubt" },
        ],
      },
      {
        text: "Back away carefully.",
        effects: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACT 2 EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "lady_of_the_lake", title: "The Lady of the Lake",
    description: "A shimmering figure rises from the still waters. She offers you a gift — but at what cost?",
    image: "lady_lake", act: 2,
    choices: [
      {
        text: "Accept her blessing. (Gain 12 Max HP, Purity +5)",
        effects: [
          { type: "max_hp", value: 12 },
          { type: "purity", value: 5 },
        ],
      },
      {
        text: "Demand Excalibur's power. (Gain Excalibur Strike card, Purity -10)",
        effects: [
          { type: "add_card", value: "excalibur_strike" },
          { type: "purity", value: -10 },
        ],
      },
      {
        text: "Bow respectfully and leave.",
        effects: [{ type: "purity", value: 2 }],
      },
    ],
  },
  {
    id: "cursed_graveyard", title: "The Cursed Graveyard",
    description: "Tombstones litter a fog-choked field. A spectral voice whispers: 'Leave behind what weighs you down...'",
    image: "graveyard", act: 2,
    choices: [
      {
        text: "Remove a card from your deck.",
        effects: [{ type: "remove_card", value: 1 }],
      },
      {
        text: "Commune with the dead. (Gain 2 random cards, take 10 damage)",
        effects: [
          { type: "damage", value: 10 },
          { type: "add_card", value: "random_uncommon" },
          { type: "add_card", value: "random_uncommon" },
        ],
      },
      {
        text: "Flee before the spirits notice you.",
        effects: [],
      },
    ],
  },
  {
    id: "enchanted_spring", title: "The Enchanted Spring",
    description: "Crystalline waters bubble from ancient stones.",
    image: "enchanted_spring", act: 2,
    choices: [
      {
        text: "Drink deeply. (Heal to full, lose 5 Max HP)",
        effects: [
          { type: "heal", value: 1.0 },
          { type: "max_hp", value: -5 },
        ],
      },
      {
        text: "Fill a vial. (Gain a random potion)",
        effects: [{ type: "add_relic", value: "random_potion" }],
      },
      {
        text: "Meditate by the waters. (Upgrade 2 random cards, Purity +4)",
        effects: [
          { type: "upgrade_card", value: 1 },
          { type: "upgrade_card", value: 1 },
          { type: "purity", value: 4 },
        ],
      },
    ],
  },
  {
    id: "dark_altar", title: "The Dark Altar",
    description: "A blood-stained altar pulses with forbidden power.",
    image: "dark_altar", act: 2,
    choices: [
      {
        text: "Sacrifice your blood. (Lose 10 HP, gain a random rare card, Purity -6)",
        effects: [
          { type: "damage", value: 10 },
          { type: "add_card", value: "random_rare" },
          { type: "purity", value: -6 },
        ],
      },
      {
        text: "Destroy the altar. (Take 8 damage, Purity +8)",
        effects: [
          { type: "damage", value: 8 },
          { type: "purity", value: 8 },
        ],
      },
      {
        text: "Leave this place.",
        effects: [],
      },
    ],
  },
  {
    id: "round_table_ghost", title: "The Fallen Knight's Spirit",
    description: "The spirit of a fallen knight materializes.",
    image: "round_table_ghost", act: 2,
    choices: [
      {
        text: "Accept his quest. (Gain a random relic, lose 10% HP)",
        effects: [
          { type: "add_relic", value: "random_common" },
          { type: "damage", value: 0.1 },
        ],
      },
      {
        text: "Challenge him to a duel. (Take 15 damage, gain 40 Gold)",
        effects: [
          { type: "damage", value: 15 },
          { type: "gold", value: 40 },
        ],
      },
      {
        text: "Pay your respects. (Purity +5)",
        effects: [{ type: "purity", value: 5 }],
      },
    ],
  },
  {
    id: "hermit_sage", title: "The Hermit Sage",
    description: "An old man sits beside a dying fire. 'I have forgotten more than you will ever know,' he rasps.",
    image: "hermit", act: 2,
    choices: [
      {
        text: "Ask for wisdom. (Upgrade 2 random cards)",
        effects: [
          { type: "upgrade_card", value: 1 },
          { type: "upgrade_card", value: 1 },
        ],
      },
      {
        text: "Ask for strength. (Gain 40 Gold, lose 7 Max HP)",
        effects: [
          { type: "gold", value: 40 },
          { type: "max_hp", value: -7 },
        ],
      },
      {
        text: "Share your provisions. (Lose 20 Gold, Heal to full, Purity +3)",
        effects: [
          { type: "gold", value: -20 },
          { type: "heal", value: 1.0 },
          { type: "purity", value: 3 },
        ],
        condition: (s) => s.gold >= 20,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACT 3 EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "mordreds_offer", title: "Mordred's Offer",
    description: "Mordred appears before you, smiling coldly. 'Join me, and the Grail will be ours. Refuse, and suffer.'",
    image: "mordred", act: 3,
    choices: [
      {
        text: "Refuse. (Take 15 damage, Purity +10, gain Holy Light card)",
        effects: [
          { type: "damage", value: 15 },
          { type: "purity", value: 10 },
          { type: "add_card", value: "holy_light" },
        ],
      },
      {
        text: "Accept his dark power. (Gain Demon Form, gain 15 Max HP, Purity -15)",
        effects: [
          { type: "add_card", value: "demon_form" },
          { type: "max_hp", value: 15 },
          { type: "purity", value: -15 },
        ],
      },
      {
        text: "Try to deceive him. (50% chance: gain both. 50% chance: take 30 damage)",
        effects: [
          { type: "damage", value: 15 }, // simplified — always middle ground
          { type: "add_card", value: "random_rare" },
        ],
      },
    ],
  },
  {
    id: "final_temptation", title: "The Final Temptation",
    description: "A mirror shows you as king, powerful and alone.",
    image: "final_temptation", act: 3,
    choices: [
      {
        text: "Accept the crown. (Gain 3 Strength cards, Purity -12)",
        effects: [
          { type: "add_card", value: "inflame" },
          { type: "add_card", value: "inflame" },
          { type: "add_card", value: "inflame" },
          { type: "purity", value: -12 },
        ],
      },
      {
        text: "Shatter the mirror. (Take 10 damage, gain a random relic, Purity +6)",
        effects: [
          { type: "damage", value: 10 },
          { type: "add_relic", value: "random_common" },
          { type: "purity", value: 6 },
        ],
      },
      {
        text: "Walk away. (Heal 20 HP, Purity +3)",
        effects: [
          { type: "heal", value: 20 },
          { type: "purity", value: 3 },
        ],
      },
    ],
  },
  {
    id: "avalon_gate", title: "The Gates of Avalon",
    description: "The gates of Avalon shimmer before you.",
    image: "avalon_gate", act: 3,
    choices: [
      {
        text: "Enter Avalon. (Remove 3 cards, heal to full, Purity +10)",
        effects: [
          { type: "remove_card", value: 1 },
          { type: "remove_card", value: 1 },
          { type: "remove_card", value: 1 },
          { type: "heal", value: 1.0 },
          { type: "purity", value: 10 },
        ],
      },
      {
        text: "Steal power from the gate. (Gain 2 rare cards, Purity -8)",
        effects: [
          { type: "add_card", value: "random_rare" },
          { type: "add_card", value: "random_rare" },
          { type: "purity", value: -8 },
        ],
      },
      {
        text: "Pray at the threshold. (Upgrade all cards, Purity +5)",
        effects: [
          { type: "upgrade_card", value: 99 },
          { type: "purity", value: 5 },
        ],
      },
    ],
  },
  {
    id: "grail_vision", title: "A Vision of the Grail",
    description: "Golden light fills your eyes. You see the Holy Grail, shimmering at the end of your path. It asks: what do you seek?",
    image: "grail_vision", act: 3,
    choices: [
      {
        text: "Purification. (Remove 2 cards, Purity +8, Heal 30% HP)",
        effects: [
          { type: "remove_card", value: 1 },
          { type: "remove_card", value: 1 },
          { type: "purity", value: 8 },
          { type: "heal", value: 0.3 },
        ],
      },
      {
        text: "Power. (Gain 3 Rare cards, Purity -5)",
        effects: [
          { type: "add_card", value: "random_rare" },
          { type: "add_card", value: "random_rare" },
          { type: "add_card", value: "random_rare" },
          { type: "purity", value: -5 },
        ],
      },
      {
        text: "Nothing. The Grail is the journey, not the destination. (Gain 20 Max HP, Purity +15)",
        effects: [
          { type: "max_hp", value: 20 },
          { type: "purity", value: 15 },
        ],
      },
    ],
  },
];

export const EVENT_MAP: Map<string, EventDef> = new Map();
for (const e of EVENT_DEFS) EVENT_MAP.set(e.id, e);

export function getEventDef(id: string): EventDef {
  const def = EVENT_MAP.get(id);
  if (!def) throw new Error(`Unknown event: ${id}`);
  return def;
}

export function getEventsForAct(act: number): EventDef[] {
  return EVENT_DEFS.filter(e => e.act === 0 || e.act === act);
}
