// Initial quest definitions for Medieval GTA

import type { GTAQuest } from '../state/MedievalGTAState';

export function getInitialQuests(): GTAQuest[] {
  return [
    // ── Quest 1: The Missing Merchant ─────────────────────────────────────────
    {
      id: 'q_missing_merchant',
      title: 'The Missing Merchant',
      description:
        'Margaret at the market square is beside herself with worry. Her husband Edmund, ' +
        'a merchant, left for the south gate this morning and has not returned. ' +
        'Find Edmund near the south gate and speak to him, then return to Margaret.',
      giverNpcId: 'npc_worried_wife',
      status: 'available',
      objectives: [
        {
          type: 'talk',
          description: 'Find merchant Edmund near the south gate and speak to him.',
          targetNpcId: 'npc_missing_merchant',
          targetPos: { x: 1950, y: 2350 },
          targetRadius: 200,
          completed: false,
        },
      ],
      reward: {
        gold: 50,
        description: '50 gold coins',
      },
      completionDialog:
        'You found him! Alive and well — thank the Lord! Here is your coin, as promised. ' +
        'Edmund will make his way home directly. You have done us a great kindness.',
    },

    // ── Quest 2: Bandit Trouble ───────────────────────────────────────────────
    {
      id: 'q_bandit_trouble',
      title: 'Bandit Trouble',
      description:
        'Captain Gareth at the barracks is desperate. Three criminals have taken up ' +
        'positions near the prison and the southern quarter, terrorizing merchants and ' +
        'civilians alike. The guards cannot leave their posts. Eliminate the criminals ' +
        'to restore order.',
      giverNpcId: 'npc_captain_gareth',
      status: 'available',
      objectives: [
        {
          type: 'kill',
          description: 'Eliminate 3 criminals near the prison and southern quarter.',
          targetNpcType: 'criminal',
          killCount: 3,
          killCurrent: 0,
          completed: false,
        },
      ],
      reward: {
        gold: 80,
        description: '80 gold coins',
      },
      completionDialog:
        'Three criminals dealt with? Ha! You have a talent for this. The streets will be ' +
        'safer for a while. Take your coin — you have earned it twice over.',
    },

    // ── Quest 3: The Holy Relic ───────────────────────────────────────────────
    {
      id: 'q_holy_relic',
      title: 'The Holy Relic',
      description:
        'Father Aldous at the church is troubled. A blessed key — a holy relic of great ' +
        'significance — was accidentally left at the tavern by a visiting monk. ' +
        'Retrieve the key from the tavern area before it falls into the wrong hands.',
      giverNpcId: 'npc_priest_aldous',
      status: 'available',
      objectives: [
        {
          type: 'collect',
          description: 'Retrieve the holy key from the tavern area.',
          itemType: 'key',
          itemCount: 1,
          itemCurrent: 0,
          targetPos: { x: 2400, y: 1350 },
          targetRadius: 150,
          completed: false,
        },
      ],
      reward: {
        gold: 60,
        description: '60 gold coins',
      },
      completionDialog:
        'The relic is safe! You have done the church a great service this day. ' +
        'Accept this gold with the blessings of the Almighty. Go in peace.',
    },

    // ── Quest 4: Royal Escort ─────────────────────────────────────────────────
    {
      id: 'q_royal_escort',
      title: 'Royal Escort',
      description:
        'Sir Percival at the barracks carries an urgent message for the king but fears ' +
        'an ambush from criminals who have been tipped off about his route. ' +
        'Escort him safely through the city streets to the castle gates.',
      giverNpcId: 'npc_knight_3',
      status: 'available',
      objectives: [
        {
          type: 'escort',
          description: 'Escort Sir Percival safely to the castle gates.',
          targetNpcId: 'npc_knight_3',
          targetPos: { x: 1075, y: 1050 },
          targetRadius: 100,
          completed: false,
        },
      ],
      reward: {
        gold: 100,
        description: '100 gold coins',
      },
      completionDialog:
        'We made it — and you did not let a single blade touch me. ' +
        'The king shall hear of your bravery this day. Take this gold with my thanks, ' +
        'and know that a knight of the Round Table is in your debt.',
    },

    // ── Quest 5: Tax Collection ───────────────────────────────────────────────
    {
      id: 'q_tax_collection',
      title: 'Tax Collection',
      description:
        'Steward Aldric at the castle requires the quarterly tax payments from three ' +
        'market merchants: the silk trader, the spice dealer, and the fruit seller. ' +
        'Speak to each merchant to collect the taxes, then return to the steward.',
      giverNpcId: 'npc_steward',
      status: 'available',
      objectives: [
        {
          type: 'talk',
          description: 'Collect taxes from Aldric the Silk Trader.',
          targetNpcId: 'npc_merch_1',
          completed: false,
        },
        {
          type: 'talk',
          description: 'Collect taxes from Oswald the Spice Dealer.',
          targetNpcId: 'npc_merch_2',
          completed: false,
        },
        {
          type: 'talk',
          description: 'Collect taxes from Gilbert the Fruit Seller.',
          targetNpcId: 'npc_merch_3',
          completed: false,
        },
      ],
      reward: {
        gold: 40,
        description: '40 gold coins and a fine sword',
      },
      completionDialog:
        'All three payments collected — the lord will be most pleased. ' +
        'Here is your reward, and take this sword as a token of the crown\'s gratitude. ' +
        'You have proven yourself useful. We may have need of you again.',
    },

    // ── Quest 6: Horse Thief ──────────────────────────────────────────────────
    {
      id: 'q_horse_thief',
      title: 'Horse Thief',
      description:
        'Old Harlan at the stable reports that his best mare has been stolen. ' +
        'The thief was last seen riding south through the gate. ' +
        'Find the horse outside the south gate and ride it back to the stable.',
      giverNpcId: 'npc_stable_master',
      status: 'available',
      objectives: [
        {
          type: 'reach',
          description: 'Find the stolen horse outside the south gate.',
          targetPos: { x: 2000, y: 2700 },
          targetRadius: 150,
          completed: false,
        },
        {
          type: 'reach',
          description: 'Ride the horse back to the stable.',
          targetPos: { x: 2825, y: 2000 },
          targetRadius: 120,
          completed: false,
        },
      ],
      reward: {
        gold: 70,
        description: '70 gold coins',
      },
      completionDialog:
        'My mare! You brought her back safe and sound. Bless you, stranger. ' +
        'Here is every coin I promised and more. If you ever need a horse, ' +
        'you know where to find me.',
    },
  ];
}

// Backward-compatible export for existing code that may reference INITIAL_QUESTS
export const INITIAL_QUESTS: GTAQuest[] = getInitialQuests();
