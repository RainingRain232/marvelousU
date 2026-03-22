// ---------------------------------------------------------------------------
// Exodus mode — event definitions
// ---------------------------------------------------------------------------

import type { ExodusEvent } from "../state/ExodusState";

// ---------------------------------------------------------------------------
// The Ashen Fields (Region 0)
// ---------------------------------------------------------------------------

const ASHEN_EVENTS: ExodusEvent[] = [
  {
    id: "burned_village",
    title: "The Burned Village",
    description: "Smoke rises from a cluster of cottages. Bodies line the road. Among the ruins, you hear a child crying.",
    region: "ashen_fields",
    choices: [
      {
        label: "Search for survivors",
        description: "Send soldiers to comb the wreckage",
        outcome: { text: "Your soldiers pull seven survivors from the rubble — peasants and a wounded smith. They beg to join the caravan.", memberGain: [{ role: "peasant", count: 5 }, { role: "craftsman", count: 1 }], food: -5, morale: 5, mercy: 3, chainEventId: "village_survivors_gratitude" },
      },
      {
        label: "Scavenge supplies only",
        description: "Take what's useful and move on",
        outcome: { text: "You gather food stores and a cache of arrows from the ruins. The crying stops on its own.", food: 15, supplies: 8, morale: -5, hope: -3, mercy: -3 },
      },
      {
        label: "Pass by quickly",
        description: "Mordred's shadow is close — you cannot stop",
        outcome: { text: "The caravan marches past in silence. Some look back. None speak.", morale: -3 },
      },
    ],
  },
  {
    id: "scattered_knights",
    title: "Knights of the Fallen Table",
    description: "A band of weary knights blocks the road. Their tabards are torn but recognizable — they served at Camelot. Their leader steps forward: \"We thought everyone was dead.\"",
    region: "ashen_fields",
    choices: [
      {
        label: "Welcome them",
        description: "\"Join us. We march to Avalon.\"",
        outcome: { text: "\"Avalon? Then the stories are true.\" Six knights and their squires fall in beside your column. Hope stirs.", memberGain: [{ role: "knight", count: 3 }, { role: "soldier", count: 4 }], morale: 10, hope: 5 },
      },
      {
        label: "Test their loyalty",
        description: "\"How do we know you're not Mordred's spies?\"",
        outcome: { text: "They submit to questioning. One knight cannot meet your gaze. He flees into the night — confirming your caution was wise. The rest prove true.", memberGain: [{ role: "knight", count: 2 }, { role: "soldier", count: 3 }], morale: 3 },
      },
    ],
  },
  {
    id: "abandoned_granary",
    title: "The Granary",
    description: "An intact stone granary stands alone in a field of ash. Its doors are sealed with a heavy iron lock. Rats scurry at its base.",
    region: "ashen_fields",
    choices: [
      {
        label: "Break in",
        description: "Use supplies to force the lock",
        outcome: { text: "Inside: barrels of salted meat, dried grain, and a barrel of mead. A feast for the road.", food: 25, supplies: -2, morale: 8 },
      },
      {
        label: "Set a trap",
        description: "The granary could lure Mordred's scouts — rig it to collapse",
        outcome: { text: "Your craftsmen rig the structure. When scouts investigate, the roof comes down. You hear the crash from half a league away.", supplies: -3, pursuerDelay: 1, morale: 5 },
      },
    ],
  },
  {
    id: "refugees_on_road",
    title: "The Refugees",
    description: "A hundred souls trudge along the road — families with carts, elders on mules, children clutching dolls. They see your banners and weep with relief.",
    region: "ashen_fields",
    choices: [
      {
        label: "Take them all",
        description: "\"Every soul matters. We leave no one behind.\"",
        outcome: { text: "The caravan swells. The pace slows. The food stretches thinner. But the children smile, and your knights walk taller.", memberGain: [{ role: "refugee", count: 12 }, { role: "peasant", count: 4 }], food: -10, morale: 5, hope: 8 },
      },
      {
        label: "Take only those who can work",
        description: "\"We need strong backs, not more mouths\"",
        outcome: { text: "You select the able-bodied. The rest watch in silence as you march away. A woman curses your name.", memberGain: [{ role: "peasant", count: 6 }, { role: "soldier", count: 2 }], morale: -8, hope: -5 },
      },
      {
        label: "Give them food and directions",
        description: "\"Head south. Avoid the roads.\"",
        outcome: { text: "You share what you can spare. They bless you as they go. Whether they'll survive... you try not to think about it.", food: -8, morale: 3, hope: 2 },
      },
    ],
  },
  {
    id: "old_battlefield",
    title: "Field of the Fallen",
    description: "The remains of a great battle scar the land. Rusted swords jut from the earth like headstones. Crows circle overhead.",
    region: "ashen_fields",
    choices: [
      {
        label: "Salvage equipment",
        description: "Scavenge arms and armor from the dead",
        outcome: { text: "Your soldiers gather serviceable blades and mail shirts. The dead have no further need.", supplies: 12, morale: -3 },
      },
      {
        label: "Bury the dead",
        description: "Give them proper rites",
        outcome: { text: "It takes half a day, but your people lay the fallen to rest. A priest among the refugees speaks the old words. Something settles in the air.", daysLost: 1, morale: 10, hope: 5 },
      },
    ],
  },
  {
    id: "merchant_cart",
    title: "The Merchant",
    description: "A lone merchant guards an overturned cart. He eyes your soldiers nervously. \"I've got food — good food. But nothing's free in these times.\"",
    region: "ashen_fields",
    choices: [
      {
        label: "Trade supplies for food",
        description: "Fair exchange",
        outcome: { text: "He drives a hard bargain, but the meat is fresh and the bread is real.", food: 20, supplies: -8 },
      },
      {
        label: "Offer protection",
        description: "\"Join us. Your goods, our swords.\"",
        outcome: { text: "He considers. Then nods. \"Better than dying alone on this road.\" He brings his cart into the column.", food: 12, memberGain: [{ role: "peasant", count: 1 }], morale: 3 },
      },
      {
        label: "Take his goods by force",
        description: "He has what you need. You have swords.",
        outcome: { text: "He doesn't resist. But your soldiers exchange uneasy glances. This isn't what they signed up for.", food: 25, supplies: 5, morale: -15, hope: -8 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// The Thornwood (Region 1)
// ---------------------------------------------------------------------------

const THORNWOOD_EVENTS: ExodusEvent[] = [
  {
    id: "elven_patrol",
    title: "The Elven Patrol",
    description: "Arrows thud into the trees around you. From the canopy, silver-haired figures materialize — elven scouts, bows drawn. Their captain speaks: \"Camelot's people are not welcome in the Thornwood. Turn back.\"",
    region: "thornwood",
    choices: [
      {
        label: "Negotiate",
        description: "\"We seek only passage. Mordred hunts us.\"",
        outcome: { text: "The captain's eyes soften at Mordred's name. \"We know the darkness that follows you. Pass through — but quickly. And take our wounded with you; we cannot carry them.\"", memberGain: [{ role: "archer", count: 3 }], morale: 5, revealHexes: 3 },
      },
      {
        label: "Stand your ground",
        description: "\"We pass whether you will it or not.\"",
        outcome: { text: "Arrows fly. Your knights charge. The skirmish is brief but bloody. The elves retreat into the canopy, and you push through — but at cost.", combat: true, combatDanger: 2, morale: -5 },
      },
    ],
  },
  {
    id: "fae_circle",
    title: "The Fairy Ring",
    description: "A perfect circle of mushrooms glows with pale light in a forest clearing. The air hums. Your scouts report that time feels... wrong here. Minutes stretch to hours.",
    region: "thornwood",
    choices: [
      {
        label: "Step into the circle",
        description: "Perhaps the Fae can help",
        outcome: { text: "The world shimmers. A voice like bells: \"Brave mortals. I shall give you a gift — but gifts always have a price.\" Your scouts gain preternatural awareness, but three of your soldiers vanish.", memberLoss: 3, revealHexes: 5, hope: 5 },
      },
      {
        label: "Leave an offering",
        description: "Place food at the circle's edge",
        outcome: { text: "By morning, the food is gone. In its place: a bundle of healing herbs and a scrap of parchment showing safe paths through the wood.", food: -5, supplies: 5, revealHexes: 3 },
      },
      {
        label: "Avoid it entirely",
        description: "The Fae are not to be trusted",
        outcome: { text: "You give the circle a wide berth. Some of the refugees look back longingly. The forest seems darker after that.", morale: -2 },
      },
    ],
  },
  {
    id: "thornwood_ambush",
    title: "Ambush in the Thorns",
    description: "The trail narrows between walls of ancient thorn. Perfect place for an ambush — and ambush comes. Raiders burst from the undergrowth, targeting your supply carts.",
    region: "thornwood",
    choices: [
      {
        label: "Fight them off",
        description: "Knights to the front!",
        outcome: { text: "Your knights form a wall of steel. The raiders break against it — but not before torching one supply cart.", combat: true, combatDanger: 2, supplies: -5 },
      },
      {
        label: "Sacrifice the rear cart",
        description: "Let them take one cart while you push forward",
        outcome: { text: "The raiders seize the cart and melt back into the thorns. A costly trade, but no one died.", food: -12, supplies: -6 },
      },
    ],
  },
  {
    id: "hidden_grove",
    title: "The Hidden Grove",
    description: "Your scouts discover a sheltered grove with a spring of clear water, fruit trees, and soft grass. It's the first safe place you've seen in days.",
    region: "thornwood",
    choices: [
      {
        label: "Rest here for a day",
        description: "Let the caravan recover",
        outcome: { text: "For one blessed day, there is peace. The wounded heal. Children play. Your people remember what they're fighting for.", food: 8, morale: 15, hope: 5, woundedCount: -3, daysLost: 1 },
      },
      {
        label: "Forage and move on",
        description: "Gather what you can but keep moving",
        outcome: { text: "You strip the grove of its bounty. The fruit is sweet. But Mordred's shadow presses on.", food: 15 },
      },
    ],
  },
  {
    id: "spider_nest",
    title: "The Webbed Path",
    description: "Giant webs span the trees ahead, thick as rope. Dark shapes skitter in the canopy. The only other path adds two days to your journey.",
    region: "thornwood",
    choices: [
      {
        label: "Burn through",
        description: "Torches forward — cut a path",
        outcome: { text: "Fire catches the webs. The spiders flee screaming. The path clears — but the fire spreads. You march through smoke and embers.", supplies: -3, woundedCount: 2 },
      },
      {
        label: "Take the long way",
        description: "Detour around the nest",
        outcome: { text: "Two days lost, but your people are unharmed. The forest eventually thins.", daysLost: 2, morale: -3 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// The Blighted Marches (Region 2)
// ---------------------------------------------------------------------------

const BLIGHTED_EVENTS: ExodusEvent[] = [
  {
    id: "plague_village",
    title: "The Plague Village",
    description: "A village stands in the mist, but no smoke rises from its chimneys. As you approach, you see the marks on the doors — plague. Survivors stumble toward your column, reaching out with blistered hands.",
    region: "blighted_marches",
    choices: [
      {
        label: "Help them",
        description: "Your healers may find a cure",
        outcome: { text: "Your healers work through the night. Most can be saved — but the plague touches your own. Three soldiers fall ill.", memberGain: [{ role: "refugee", count: 6 }], woundedCount: 3, morale: 5, hope: 8, supplies: -5, mercy: 4, chainEventId: "plague_spreads" },
      },
      {
        label: "Keep your distance",
        description: "The caravan cannot risk infection",
        outcome: { text: "You march past. The sick watch you go. Some of your people weep. A healer breaks ranks and stays behind.", memberLoss: 1, morale: -10, hope: -5 },
      },
    ],
  },
  {
    id: "undead_risen",
    title: "The Restless Dead",
    description: "The ground churns. Skeletal hands claw upward. The marsh is thick with the dead — soldiers from some ancient war, risen by the corruption that spreads from Camelot's fall.",
    region: "blighted_marches",
    choices: [
      {
        label: "Stand and fight",
        description: "Form ranks! Holy steel!",
        outcome: { text: "The dead are slow but relentless. Your knights cleave through bone and rust, but the horde keeps coming. You cut your way through — barely.", combat: true, combatDanger: 3, morale: -5 },
      },
      {
        label: "Run",
        description: "Move fast — don't stop for anything",
        outcome: { text: "The caravan breaks into a desperate sprint. Carts bounce over roots and stones. You lose supplies as they tumble. But the dead cannot keep up.", food: -5, supplies: -8, memberLoss: 1, morale: -3 },
      },
    ],
  },
  {
    id: "ancient_tomb",
    title: "The Sealed Tomb",
    description: "A stone door set into a hillside, covered in ancient runes. Your scouts report the runes are Merlin's hand — old magic, powerful magic. Something waits inside.",
    region: "blighted_marches",
    choices: [
      {
        label: "Open it",
        description: "Merlin's legacy may save us",
        outcome: { text: "The door groans open. Inside: a crystal staff that hums with power, and a warning carved in stone: \"For the last of Camelot.\" Hope flares in your heart.", relicId: "merlins_staff", hope: 15, morale: 10 },
      },
      {
        label: "Leave it sealed",
        description: "Some doors should stay closed",
        outcome: { text: "You trace the runes with a finger, then turn away. Not all power is worth the risk.", morale: 2 },
      },
    ],
    unique: true,
  },
  {
    id: "sinking_ground",
    title: "The Sinking Ground",
    description: "The marsh underfoot grows soft. Carts begin to sink. A peasant cries out as the mud swallows him to the waist. More of the ground is giving way.",
    region: "blighted_marches",
    choices: [
      {
        label: "Lighten the carts",
        description: "Dump weight to cross faster",
        outcome: { text: "You dump supplies and food into the mud to create bridges. The caravan crosses, muddy but alive.", food: -10, supplies: -5 },
      },
      {
        label: "Find solid ground",
        description: "Scouts search for a safe path",
        outcome: { text: "Your scouts find a ridge of solid rock winding through the bog. It takes hours, but the caravan crosses without losing anything.", daysLost: 1 },
      },
    ],
  },
  {
    id: "corrupted_well",
    title: "The Corrupted Well",
    description: "A well stands at a crossroads, its water black as ink. But your people are desperately thirsty, and the next water source is a day's march away.",
    region: "blighted_marches",
    choices: [
      {
        label: "Boil the water",
        description: "Your healers may be able to purify it",
        outcome: { text: "The water, boiled, turns merely grey. It tastes of iron and regret. But it quenches thirst. Only one person falls ill.", woundedCount: 1, morale: -2 },
      },
      {
        label: "March on thirsty",
        description: "Don't risk it",
        outcome: { text: "A long, hard march with parched throats. Morale wavers, but no one is poisoned.", morale: -8, food: -5 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// The Iron Peaks (Region 3)
// ---------------------------------------------------------------------------

const IRON_PEAKS_EVENTS: ExodusEvent[] = [
  {
    id: "dwarven_hold",
    title: "The Dwarven Hold",
    description: "Massive stone gates carved into the mountainside. Dwarven runes glow faintly. A voice echoes from within: \"State your business, surface-dweller. We do not welcome guests.\"",
    region: "iron_peaks",
    choices: [
      {
        label: "Request shelter",
        description: "\"We seek passage through the mountains\"",
        outcome: { text: "\"Passage costs gold — or service. There is a troll in the eastern mines. Kill it, and we'll open our tunnels to you.\"", combat: true, combatDanger: 3, revealHexes: 4 },
      },
      {
        label: "Offer your craftsmen's skills",
        description: "\"Our smiths can work alongside yours\"",
        outcome: { text: "The dwarves accept. Your craftsmen learn new techniques. The dwarves gift you iron and provisions for the mountain crossing.", food: 15, supplies: 15, morale: 8 },
      },
      {
        label: "Move on",
        description: "Trust no one behind closed doors",
        outcome: { text: "The gates remain sealed as you pass. The mountain path ahead will be harder without shelter.", morale: -2 },
      },
    ],
  },
  {
    id: "mountain_pass",
    title: "The Narrow Pass",
    description: "Snow blasts through a gap between towering peaks. The pass is narrow — your carts can barely fit. And the weather is worsening.",
    region: "iron_peaks",
    choices: [
      {
        label: "Push through",
        description: "Speed over safety",
        outcome: { text: "Ice and wind batter the caravan. Carts slide on frozen stone. You lose supplies to the abyss, but reach the other side.", supplies: -8, woundedCount: 2, morale: -5 },
      },
      {
        label: "Wait for the storm to pass",
        description: "Shelter and wait",
        outcome: { text: "A day huddled against the mountain. Food dwindles. But when the storm breaks, the crossing is clear.", daysLost: 1, food: -8 },
      },
      {
        label: "Send scouts for another route",
        description: "There may be a safer path",
        outcome: { text: "Your scouts find a longer but sheltered valley route. It adds a day but avoids the worst of the storms.", daysLost: 1, morale: 3 },
      },
    ],
  },
  {
    id: "avalanche",
    title: "Avalanche!",
    description: "A rumble shakes the mountain. Snow and rock cascade toward the caravan. You have seconds to react.",
    region: "iron_peaks",
    choices: [
      {
        label: "Take cover!",
        description: "Press against the cliff wall",
        outcome: { text: "Most of the caravan presses flat against the rock. The avalanche thunders past. But the rear guard is buried. Your soldiers dig frantically.", memberLoss: 2, woundedCount: 3, supplies: -5, morale: -8 },
      },
      {
        label: "Run forward!",
        description: "Sprint ahead of the slide",
        outcome: { text: "The caravan surges forward. You outrun the worst of it, but carts are lost to the cascade.", food: -8, supplies: -10, morale: -3 },
      },
    ],
  },
  {
    id: "hermit_shrine",
    title: "The Mountain Hermit",
    description: "A tiny shrine perches on a ledge, tended by an ancient hermit. He watches your caravan with knowing eyes. \"I have been waiting for you,\" he says simply.",
    region: "iron_peaks",
    choices: [
      {
        label: "Listen to him",
        description: "What does he know?",
        outcome: { text: "He speaks of Avalon — not as myth, but as fact. He has seen it in visions. \"The western shore. Where the mist parts. You are closer than you think.\" Hope surges through the caravan like fire.", hope: 20, morale: 10, revealHexes: 3 },
      },
      {
        label: "Ask him to join you",
        description: "\"Come with us, old father\"",
        outcome: { text: "He shakes his head. \"My place is here. But take these.\" He presses dried herbs and a map into your hands.", food: 5, supplies: 5, revealHexes: 4 },
      },
    ],
    unique: true,
  },
  {
    id: "eagle_aerie",
    title: "The Eagle's Nest",
    description: "Giant eagles circle a crag above. Their riders — men in feathered cloaks — descend to parley. \"We've watched your journey,\" their chief says. \"The dark host is three days behind you.\"",
    region: "iron_peaks",
    choices: [
      {
        label: "Ask for scouts",
        description: "\"Your eyes in the sky could save us\"",
        outcome: { text: "The eagle riders agree to fly ahead and report what lies in your path. For two days, you will know exactly where to go.", revealHexes: 6, morale: 8, hope: 5 },
      },
      {
        label: "Ask them to harass the pursuer",
        description: "\"Slow Mordred's advance\"",
        outcome: { text: "The eagles dive-bomb the pursuing army's vanguard. Mordred loses a day untangling chaos.", pursuerDelay: 2, morale: 10 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// The Shattered Coast (Region 4)
// ---------------------------------------------------------------------------

const SHATTERED_COAST_EVENTS: ExodusEvent[] = [
  {
    id: "shipwreck_beach",
    title: "The Shipwreck",
    description: "A great ship lies broken on the rocks, its hull shattered by storm. But its cargo hold is intact — and there are survivors clinging to the wreckage.",
    region: "shattered_coast",
    choices: [
      {
        label: "Rescue survivors and salvage",
        description: "Both the people and the cargo",
        outcome: { text: "Sailors and merchants pulled from the sea join your caravan. Barrels of food and timber are hauled from the hold. \"Where are we?\" a sailor asks. \"Where you need to be,\" you answer.", memberGain: [{ role: "peasant", count: 3 }, { role: "craftsman", count: 2 }], food: 15, supplies: 10, morale: 8 },
      },
      {
        label: "Salvage the ship for materials",
        description: "You need a fleet, not more mouths",
        outcome: { text: "The timber and rope will help build boats. The survivors drift away — you have no room for them.", supplies: 20, morale: -5, hope: -3 },
      },
    ],
  },
  {
    id: "last_harbor",
    title: "The Last Harbor",
    description: "A small fishing village clings to the coast. The villagers eye your army with suspicion, but their elder hobbles forward. \"You seek the western crossing, don't you? Everyone who comes this way does.\"",
    region: "shattered_coast",
    choices: [
      {
        label: "Ask for boats",
        description: "\"We need to cross the sea\"",
        outcome: { text: "\"Boats cost. Help us drive off the raiders that plague our waters, and we'll give you our fishing fleet.\"", combat: true, combatDanger: 3, supplies: 10 },
      },
      {
        label: "Trade for supplies",
        description: "\"We need food for the last stretch\"",
        outcome: { text: "The villagers trade fish and water for your excess arms. A fair deal.", food: 20, supplies: -5, morale: 5 },
      },
    ],
  },
  {
    id: "mordred_vanguard",
    title: "Mordred's Vanguard",
    description: "Black banners crest the hill behind you. Not the main host — a fast-moving vanguard of cavalry, sent ahead to cut off your escape. There is no avoiding this fight.",
    region: "shattered_coast",
    choices: [
      {
        label: "Ambush them",
        description: "Use the terrain — fight on your terms",
        outcome: { text: "Your knights lie in wait behind the coastal rocks. When the vanguard rides into the narrows, you spring the trap. Steel clashes on stone.", combat: true, combatDanger: 4, pursuerDelay: 2, morale: 8, hope: 5 },
      },
      {
        label: "Rear guard action",
        description: "Send your best to hold the line while the caravan runs",
        outcome: { text: "Your finest knights volunteer. They know they may not return. The caravan flees to the sound of battle behind them.", memberLoss: 3, morale: -10, hope: -5, pursuerDelay: 3 },
      },
    ],
  },
  {
    id: "grail_chapel_coast",
    title: "The Grail Chapel",
    description: "A chapel stands alone on the cliff edge, its stained glass glowing with otherworldly light. Inside, on an altar of white stone, sits a chalice that seems to pulse with life.",
    region: "shattered_coast",
    choices: [
      {
        label: "Take the Grail",
        description: "This is what you've been searching for",
        outcome: { text: "As your hands close around the chalice, warmth floods through the caravan. The wounded rise. The weary stand tall. Hope blazes like a beacon. Avalon is real — and it is close.", relicId: "holy_grail", hope: 30, morale: 20, woundedCount: -99 },
      },
      {
        label: "Pray at the altar",
        description: "You are not worthy to take it, but you can ask for guidance",
        outcome: { text: "Light fills the chapel. A vision: the western mist parting, revealing green shores. You know the way now.", hope: 15, morale: 10, revealHexes: 6 },
      },
    ],
    unique: true,
  },
  {
    id: "final_shore",
    title: "The Western Shore",
    description: "The sea stretches before you, grey and vast. Through the mist, you think — no, you KNOW — you can see land. Green land. Avalon.",
    region: "shattered_coast",
    choices: [
      {
        label: "Build rafts and cross",
        description: "Use every scrap of wood",
        outcome: { text: "Your craftsmen work through the night. By dawn, a fleet of crude rafts bobs in the surf. It's not elegant — but it will carry your people home.", supplies: -15 },
      },
      {
        label: "Wait for the tide",
        description: "The old stories say the sea parts at dawn",
        outcome: { text: "You wait. At first light, the mist parts. The water recedes. A causeway of white stone emerges from the waves, leading west. The old stories were true.", hope: 10, morale: 10 },
      },
    ],
    unique: true,
    minDay: 25,
  },
];

// ---------------------------------------------------------------------------
// Universal events (any region)
// ---------------------------------------------------------------------------

// Additional Shattered Coast events for final-region climax
const COAST_EXTRA_EVENTS: ExodusEvent[] = [
  {
    id: "fishing_village",
    title: "The Fisherfolk",
    description: "A village of fisherfolk hauls nets from the grey sea. They're weathered, suspicious, but not hostile. Their elder studies your caravan with shrewd eyes. 'You're not the first to come seeking passage west.'",
    region: "shattered_coast",
    choices: [
      {
        label: "Trade for fish",
        description: "\"We need food for the last stretch.\"",
        outcome: { text: "The fisherfolk trade generously — salted cod, dried kelp, fresh water. 'The western crossing needs full bellies,' the elder says. 'And prayers.'", food: 25, supplies: -3, morale: 5 },
      },
      {
        label: "Ask about the crossing",
        description: "\"Has anyone crossed to Avalon?\"",
        outcome: { text: "The elder's face changes. 'My grandmother did. Came back different. Said the island was real but you have to believe — really believe — or the mist won't part.' She traces a path on a scrap of sailcloth.", revealHexes: 4, hope: 8, morale: 3 },
      },
    ],
  },
  {
    id: "lighthouse_keeper",
    title: "The Lighthouse",
    description: "A crumbling lighthouse stands on the cliff edge, its fire still burning. An old keeper tends the flame alone. 'I keep the light for those who seek Avalon,' he says. 'Not many come anymore.'",
    region: "shattered_coast",
    unique: true,
    choices: [
      {
        label: "Ask for guidance",
        description: "\"Show us the way.\"",
        outcome: { text: "He leads you to the top. In the light, you see the coastline stretch west — and there, through a gap in the mist, a smudge of green. 'There,' he whispers. 'Avalon.' Hope blazes through the caravan like wildfire.", hope: 18, morale: 12, revealHexes: 5 },
      },
      {
        label: "Rest here for the night",
        description: "The lighthouse is warm and safe.",
        outcome: { text: "For one night, you sleep behind stone walls with a fire above. The light keeps the darkness at bay. In the morning, everyone walks taller.", morale: 10, woundedCount: -2, hope: 5 },
      },
    ],
  },
  {
    id: "sea_cave",
    title: "The Sea Cave",
    description: "A cave mouth gapes in the cliff face, half-flooded by tide. Your scouts report glinting metal deep inside — and the sound of singing. Not human singing.",
    region: "shattered_coast",
    choices: [
      {
        label: "Investigate",
        description: "Send scouts into the cave",
        outcome: { text: "The scouts return wide-eyed. Inside: a cache of silver coins, ancient armor, and a sword that glows faintly blue. The singing stopped when they entered. Whatever lives there let them take its treasure.", supplies: 12, relicId: "lady_lake_blessing", morale: 5 },
      },
      {
        label: "Leave it alone",
        description: "Singing caves are not to be trifled with",
        outcome: { text: "Wise. The cave watches you pass with ancient patience.", morale: 2 },
      },
    ],
    unique: true,
  },
  {
    id: "refugee_fleet",
    title: "The Refugee Fleet",
    description: "Dozens of crude rafts bob in a sheltered cove. Other refugees — from kingdoms beyond Camelot — are building a fleet. Their leader, a woman with a captain's bearing, hails you. 'Heading west? So are we. Strength in numbers.'",
    region: "shattered_coast",
    unique: true,
    choices: [
      {
        label: "Join forces",
        description: "A combined crossing is safer",
        outcome: { text: "Your craftsmen and theirs work together. The fleet grows. For the first time in weeks, you're not alone. The sea doesn't seem so vast with allies.", memberGain: [{ role: "soldier", count: 3 }, { role: "craftsman", count: 2 }, { role: "refugee", count: 5 }], morale: 12, hope: 10 },
      },
      {
        label: "Trade supplies",
        description: "Help them, but keep the caravans separate",
        outcome: { text: "You exchange food for timber and rope. Both groups benefit. 'May we meet again on green shores,' the captain says.", food: -10, supplies: 15, morale: 5 },
      },
    ],
  },
  {
    id: "tidal_crossing",
    title: "The Tidal Flat",
    description: "At low tide, a causeway of stone emerges from the waves — stepping stones stretching westward into the mist. Your scouts say it only appears for two hours before the sea reclaims it.",
    region: "shattered_coast",
    unique: true,
    minDay: 20,
    choices: [
      {
        label: "Run for it",
        description: "Sprint across before the tide returns",
        outcome: { text: "The caravan races across the slippery stones. Carts bounce. People stumble. The sea nips at your heels. But you make it — every last soul — to the far shore. You're closer to Avalon than ever.", morale: 8, hope: 15, woundedCount: 1 },
      },
      {
        label: "Wait for another way",
        description: "Too risky with the whole caravan",
        outcome: { text: "You watch the causeway sink beneath the waves. Perhaps there's another way. Perhaps it will appear again tomorrow.", morale: -3 },
      },
    ],
  },
  {
    id: "sea_storm",
    title: "The Storm at Sea",
    description: "A massive storm rolls in from the east — black clouds, lightning, waves that crash against the cliffs. Your camp is exposed on the headland.",
    region: "shattered_coast",
    choices: [
      {
        label: "Shelter in the cliffs",
        description: "Find cover in the rock formations",
        outcome: { text: "You huddle in sea caves and behind boulders. The storm rages for hours. When it clears, the world is washed clean and the air smells of salt and hope.", morale: -3, daysLost: 1 },
      },
      {
        label: "Use the storm as cover",
        description: "Mordred's scouts can't track you in this",
        outcome: { text: "The storm blinds pursuit. You march through the downpour, guided by lightning flashes. Miserable but invisible. Mordred loses your trail.", pursuerDelay: 2, morale: -5, woundedCount: 1 },
      },
    ],
  },
  {
    id: "mermaid_warning",
    title: "The Voice from the Waves",
    description: "At dusk, a voice rises from the waves — not a scream, but a song. Beautiful, haunting, impossible. A face appears in the water. Not human. Close to human. 'Turn back,' it says. 'The crossing claims all who are not worthy.'",
    region: "shattered_coast",
    unique: true,
    choices: [
      {
        label: "\"We are worthy.\"",
        description: "Declare your purpose",
        outcome: { text: "The face studies you. Then smiles — a terrible, ancient smile. 'Perhaps. The mist will judge.' It sinks beneath the waves. Your people are shaken but resolved.", hope: 5, morale: -5 },
      },
      {
        label: "Ask for help",
        description: "\"Will you guide us?\"",
        outcome: { text: "'Guide you?' A laugh like breaking waves. 'I am the last warning, not a guide. But...' A pearl rises from the water. 'Take this. The mist respects it.' The pearl is cold as deep water.", relicId: "round_table_fragment", hope: 8 },
      },
    ],
  },
];

const UNIVERSAL_EVENTS: ExodusEvent[] = [
  {
    id: "deserters_caught",
    title: "Deserters",
    description: "Three soldiers are caught sneaking away in the night. They claim they were scouting, but their packs are full of stolen food. Your people watch to see what you'll do.",
    region: null,
    choices: [
      {
        label: "Show mercy",
        description: "\"We need every sword. Fall back in line.\"",
        outcome: { text: "The soldiers return, shame-faced. Others wonder if desertion carries no consequence.", morale: -5 },
      },
      {
        label: "Exile them",
        description: "\"Take your packs and go. You're on your own.\"",
        outcome: { text: "They stumble into the darkness. The caravan is smaller, but discipline holds.", memberLoss: 3, food: -5, morale: 5 },
      },
    ],
  },
  {
    id: "campfire_stories",
    title: "Campfire Stories",
    description: "Around the evening fire, an old knight begins to tell stories of Camelot in its glory. Others join in — tales of tournaments, feasts, the Round Table at its best.",
    region: null,
    choices: [
      {
        label: "Join the stories",
        description: "Share your own memories of better days",
        outcome: { text: "For a few hours, the caravan forgets its sorrows. Laughter rings out for the first time in days. Even the refugees smile.", morale: 12, hope: 5 },
      },
      {
        label: "Keep watch instead",
        description: "Someone has to stay vigilant",
        outcome: { text: "You patrol the perimeter while your people find comfort in memory. The night passes safely.", morale: 3 },
      },
    ],
  },
  {
    id: "child_born",
    title: "A New Life",
    description: "A refugee woman goes into labor. The caravan halts. In a makeshift tent, surrounded by the sounds of an exodus, a child is born into the world.",
    region: null,
    choices: [
      {
        label: "Celebrate",
        description: "A new life — even now, especially now",
        outcome: { text: "The baby's first cry cuts through the despair like a blade of light. Knights kneel. Soldiers weep. This is why you march. This is why it matters.", morale: 15, hope: 12 },
      },
    ],
    unique: true,
  },
  {
    id: "scout_report",
    title: "Scout Report",
    description: "Your scouts return breathless. They've mapped the terrain ahead and have vital information about what lies in your path.",
    region: null,
    choices: [
      {
        label: "Hear the report",
        description: "What did you find?",
        outcome: { text: "The scouts spread a rough map on the ground, marking safe routes and dangers. Knowledge is power.", revealHexes: 4, morale: 3 },
      },
    ],
  },
  {
    id: "supply_rot",
    title: "Spoiled Supplies",
    description: "The damp has gotten into the food stores. Half a cart of grain has gone to mould. The stench is terrible.",
    region: null,
    choices: [
      {
        label: "Salvage what you can",
        description: "Pick through for anything edible",
        outcome: { text: "Your people sort through the ruin. Some is saved. Most is not.", food: -12 },
      },
      {
        label: "Ration strictly",
        description: "Cut portions until you find more food",
        outcome: { text: "Half rations. No one complains — not out loud. But hunger gnaws at morale.", food: -8, morale: -5 },
      },
    ],
  },
  {
    id: "knight_sacrifice",
    title: "The Last Stand",
    description: "Mordred's scouts have found your trail. A veteran knight approaches you. \"Let me lead the rear guard. I'll buy you time.\" His eyes are calm. He knows what he's asking.",
    region: null,
    minDay: 10,
    choices: [
      {
        label: "Accept his sacrifice",
        description: "\"Your name will be remembered.\"",
        outcome: { text: "He clasps your arm, mounts his horse, and rides back the way you came. You hear the clash of steel in the distance. Then silence. The caravan marches on, but the knight does not return. He will not be forgotten.", memberLoss: 1, pursuerDelay: 3, morale: 5, hope: 10 },
      },
      {
        label: "Refuse",
        description: "\"We lose no more. We run together.\"",
        outcome: { text: "He nods, jaw tight. \"Then we'd better run fast.\" The caravan quickens its pace.", morale: 5 },
      },
    ],
    unique: true,
  },
  {
    id: "excalibur_shard",
    title: "A Shard of Excalibur",
    description: "In the ruins of a wayside shrine, something gleams beneath the rubble. A fragment of a blade — but not just any blade. The metal shines with an inner light that no forge can replicate.",
    region: null,
    minDay: 8,
    choices: [
      {
        label: "Take the shard",
        description: "Excalibur's power endures, even broken",
        outcome: { text: "The shard hums in your hand. Your knights feel its pull — ancient, righteous, unwavering. This is proof that the old magic lives. Avalon is real.", relicId: "excalibur_shard", hope: 12, morale: 8 },
      },
    ],
    unique: true,
  },
  {
    id: "mutiny_brewing",
    title: "Whispers of Mutiny",
    description: "Your scouts report discontent among the soldiers. A small group questions your leadership. \"Why should we march to our deaths for a myth?\" they mutter. The tension is palpable.",
    region: null,
    minDay: 12,
    choices: [
      {
        label: "Address the caravan",
        description: "Speak to everyone — inspire them",
        outcome: { text: "You stand before your people and speak of Avalon, of duty, of what they've already survived. Your voice carries across the camp. When you finish, there is silence — then a knight begins to beat his sword against his shield. Others join. The rhythm builds. The mutiny dies unborn.", morale: 15, hope: 10 },
      },
      {
        label: "Confront the ringleaders privately",
        description: "Deal with this quietly",
        outcome: { text: "You speak to them alone. Some are genuinely afraid. You listen, acknowledge their fear, and remind them what awaits if they turn back. Most fall back in line. One leaves in the night.", memberLoss: 1, morale: 5 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Relic definitions
// ---------------------------------------------------------------------------

export const RELIC_DEFS: Record<string, { name: string; description: string; effect: string; bonusAtk?: number; bonusHp?: number; bonusHeal?: number; bonusHope?: number }> = {
  excalibur_shard: { name: "Shard of Excalibur", description: "A fragment of the legendary blade", effect: "+8 ATK to all fighters in combat", bonusAtk: 8 },
  merlins_staff: { name: "Merlin's Staff", description: "The wizard's crystal staff", effect: "Heal 4 wounded per camp", bonusHeal: 4 },
  holy_grail: { name: "The Holy Grail", description: "The sacred chalice of Camelot", effect: "+5 Hope per day, heal all wounded", bonusHope: 5 },
  minor_relic: { name: "Arthurian Relic", description: "A relic of the old kingdom", effect: "+15 HP to all fighters", bonusHp: 15 },
  round_table_fragment: { name: "Round Table Fragment", description: "A piece of the legendary table", effect: "+10 HP to all fighters", bonusHp: 10 },
  mordred_banner: { name: "Mordred's Torn Banner", description: "Taken from a fallen scout of the host", effect: "+2 Hope per day, weakens pursuer", bonusHope: 2 },
  lady_lake_blessing: { name: "Lady of the Lake's Blessing", description: "A silver light that heals and protects", effect: "Heal 2 wounded per camp, +5 HP", bonusHeal: 2, bonusHp: 5 },
};

// ---------------------------------------------------------------------------
// All events combined
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Region transition events (triggered when entering a new region)
// ---------------------------------------------------------------------------

const REGION_TRANSITION_EVENTS: ExodusEvent[] = [
  {
    id: "enter_thornwood",
    title: "The Edge of the Thornwood",
    description: "The trees close in around the caravan like a living wall. The last sunlight fades. Your scouts report the forest extends for leagues in every direction. There is no path — you must make one.",
    region: "thornwood",
    isRegionTransition: true,
    unique: true,
    choices: [
      {
        label: "Send scouts ahead",
        description: "Map a safe route through the canopy",
        outcome: { text: "Your scouts disappear into the green darkness. Hours later, they return with scratches and a rough path marked on bark. It won't be easy, but it's passable.", revealHexes: 3, morale: 3 },
      },
      {
        label: "March straight in",
        description: "The caravan is strong. We push through.",
        outcome: { text: "Branches tear at cloaks and carts. The forest fights you every step. But you are Camelot's last — you do not yield to trees.", morale: -3, woundedCount: 1 },
      },
    ],
  },
  {
    id: "enter_blighted",
    title: "The Blighted Threshold",
    description: "The ground turns black beneath your feet. The grass withers. A healer gasps — she can feel the corruption in the air, a dark magic seeping from the east. This land is dying.",
    region: "blighted_marches",
    isRegionTransition: true,
    unique: true,
    choices: [
      {
        label: "Have healers bless the caravan",
        description: "Ward against corruption",
        outcome: { text: "The healers burn sacred herbs and speak the old words. A pale light settles over the caravan. It won't stop the blight, but it may slow it.", morale: 5, hope: 3, supplies: -2 },
      },
      {
        label: "Cover your faces and press on",
        description: "Practical protection",
        outcome: { text: "Cloth wraps faces. Eyes water. The march continues, grim and silent, through lands that should not be.", morale: -5 },
      },
    ],
  },
  {
    id: "enter_iron_peaks",
    title: "The Foothills",
    description: "The mountains rise before you like the walls of the world. Snow caps glitter in the sun. The path narrows, climbing steeply. Your carts creak in protest.",
    region: "iron_peaks",
    isRegionTransition: true,
    unique: true,
    choices: [
      {
        label: "Lighten the carts",
        description: "Dump unnecessary weight for the climb",
        outcome: { text: "You leave behind furniture, luxury goods, and personal treasures. The peasants weep. The carts move faster. The mountains don't care about sentiment.", supplies: -5, food: -3, morale: -3 },
      },
      {
        label: "Take the long route around",
        description: "Follow the valley floor — slower but flatter",
        outcome: { text: "An extra day's march, but the carts survive intact. The mountains loom above, patient and vast.", daysLost: 1 },
      },
    ],
  },
  {
    id: "enter_coast",
    title: "The Salt Wind",
    description: "You crest the final ridge and see it: the sea. Endless, grey-green, stretching to the horizon. Somewhere beyond that mist lies Avalon. The caravan stops. Some weep. Some pray. Some simply stare.",
    region: "shattered_coast",
    isRegionTransition: true,
    unique: true,
    choices: [
      {
        label: "Let them take it in",
        description: "This moment matters",
        outcome: { text: "For a long moment, the only sound is the wind and the distant crash of waves. Then, slowly, someone begins to sing. Others join. The old hymn of Camelot rises over the coast. Hope burns bright.", morale: 15, hope: 12 },
      },
      {
        label: "Keep moving",
        description: "We're not there yet. Move.",
        outcome: { text: "There's no time for sentiment. Mordred is close. The caravan descends toward the shore at a forced march.", morale: -2 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Boss encounters (one per region, high difficulty, unique rewards)
// ---------------------------------------------------------------------------

const BOSS_EVENTS: ExodusEvent[] = [
  {
    id: "boss_thornwood_treant",
    title: "The Ancient Treant",
    description: "A massive tree moves. Its roots tear from the earth, its eyes — knotholes as old as the world — fix upon your caravan. 'NONE SHALL PASS,' it rumbles, and the forest shudders.",
    region: "thornwood",
    isBoss: true,
    unique: true,
    minDay: 6,
    choices: [
      {
        label: "Fight the Treant",
        description: "Axes and fire against living wood",
        outcome: { text: "The battle is titanic. The Treant's roots sweep aside your soldiers like toys. But fire catches its bark, and your knights hack at its trunk. It falls — slowly, majestically — and the path opens. In its heartwood, something glows.", combat: true, combatDanger: 4, relicId: "round_table_fragment", morale: 10, hope: 5 },
      },
      {
        label: "Speak to it",
        description: "\"We are not enemies of the forest\"",
        outcome: { text: "'You carry the scent of Camelot,' the Treant rumbles. 'The old king was a friend to the green. Pass — but take nothing.' The forest parts. A path opens, lined with ancient sentinels.", revealHexes: 5, morale: 8, mercy: 3 },
      },
    ],
  },
  {
    id: "boss_blighted_lich",
    title: "The Lich of the Barrow",
    description: "A barrow mound blocks your path. From its entrance, a figure emerges — a lich, crowned in rusted iron, its eyes burning with cold fire. 'You carry light into darkness,' it whispers. 'I cannot allow that.'",
    region: "blighted_marches",
    isBoss: true,
    unique: true,
    minDay: 10,
    choices: [
      {
        label: "Fight the Lich",
        description: "Holy steel against dark magic",
        outcome: { text: "The lich's magic tears through your ranks. Soldiers scream as shadows consume them. But your knights press forward, blades bright, and one strikes the crown from the lich's skull. It crumbles to dust. In the barrow: treasures from an older age.", combat: true, combatDanger: 5, relicId: "lady_lake_blessing", morale: 8, hope: 10, memberLoss: 2 },
      },
      {
        label: "Offer a bargain",
        description: "\"What do you want, dead king?\"",
        outcome: { text: "'Company,' the lich says. 'Leave me three souls and I will let you pass.' A terrible price — but it opens the way.", memberLoss: 3, morale: -15, hope: -5, mercy: -5 },
      },
      {
        label: "Find another way around",
        description: "This enemy is beyond you",
        outcome: { text: "You give the barrow a wide berth. It costs two days, and the lich's laughter follows you. But your people are alive.", daysLost: 2, morale: -5 },
      },
    ],
  },
  {
    id: "boss_iron_dragon",
    title: "The Mountain Drake",
    description: "A shadow passes overhead. Then again. A drake — not a true dragon, but deadly enough — circles the mountain pass. Its scales are iron-grey, its breath frost and fire intertwined.",
    region: "iron_peaks",
    isBoss: true,
    unique: true,
    minDay: 14,
    choices: [
      {
        label: "Fight the Drake",
        description: "Archers! Knights! Form up!",
        outcome: { text: "The drake dives. Your archers fill the sky with arrows while knights brace with shields. It's a desperate battle — the drake's breath scars the mountainside. But a lucky arrow finds its eye, and the beast crashes into the rocks. Your people cheer. In its nest: a cache of ancient treasures.", combat: true, combatDanger: 5, relicId: "mordred_banner", supplies: 15, morale: 15, hope: 8 },
      },
      {
        label: "Distract it",
        description: "Lure the drake away with a burning cart",
        outcome: { text: "Your craftsmen rig a cart with oil and fire. It blazes down the mountainside. The drake follows, curious. You have minutes to cross the pass before it returns.", food: -10, supplies: -8, morale: 5 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Consequence/chain events (triggered by previous choices)
// ---------------------------------------------------------------------------

const CHAIN_EVENTS: ExodusEvent[] = [
  {
    id: "refugee_gratitude",
    title: "Refugee Gratitude",
    description: "The refugees you saved gather before you. Their eldest speaks: 'You showed us mercy when the world showed none. We want to fight for you. Some of us were soldiers, once.'",
    region: null,
    unique: true,
    requiresMercy: 5,
    minDay: 8,
    choices: [
      {
        label: "Accept their service",
        description: "\"Every sword arm counts\"",
        outcome: { text: "Three refugees step forward — a farmer who once served in the levy, a blacksmith's apprentice, and a woman with steady hands. They take up arms with grim determination.", memberGain: [{ role: "soldier", count: 3 }], morale: 8, hope: 5 },
      },
      {
        label: "Let them serve in their own way",
        description: "\"You serve by surviving\"",
        outcome: { text: "The refugees nod. They take over camp duties — cooking, mending, carrying. Your soldiers are freed to focus on defense. The caravan runs more smoothly.", food: 5, supplies: 5, morale: 5, mercy: 2 },
      },
    ],
  },
  {
    id: "pragmatic_reputation",
    title: "A Cold Reputation",
    description: "Whispers spread through the caravan. 'The commander left those people to die.' 'They took the merchant's goods by force.' The soldiers exchange uneasy glances. Your reputation precedes you.",
    region: null,
    unique: true,
    requiresMercy: -8,
    minDay: 10,
    choices: [
      {
        label: "Address the concerns",
        description: "\"Every choice I made kept us alive\"",
        outcome: { text: "You speak plainly. Some accept your reasoning. Others look away. But the march continues.", morale: 5 },
      },
      {
        label: "Ignore them",
        description: "They'll understand when they reach Avalon",
        outcome: { text: "The whispers continue. Trust erodes like sand.", morale: -8, hope: -3 },
      },
    ],
  },
  {
    id: "excalibur_vision",
    title: "The Lady's Vision",
    description: "The shard of Excalibur pulses with light. In your dreams, a woman's voice speaks from deep water: 'The blade remembers. When you reach the shore, plunge it into the waves. I will answer.'",
    region: null,
    unique: true,
    requiresRelic: "excalibur_shard",
    minDay: 15,
    choices: [
      {
        label: "Share the vision",
        description: "Tell the caravan what you saw",
        outcome: { text: "The knights kneel. The refugees whisper prayers. Even the cynics fall silent. If the Lady of the Lake speaks, Avalon must be real. Hope blazes.", hope: 20, morale: 12 },
      },
      {
        label: "Keep it to yourself",
        description: "They'll think you've gone mad",
        outcome: { text: "You carry the vision alone. The weight of knowledge presses on you. But you know now — Avalon is real.", hope: 8 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// More universal events
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Chained follow-up events (triggered by chainEventId)
// ---------------------------------------------------------------------------

const CHAIN_FOLLOWUPS: ExodusEvent[] = [
  {
    id: "village_survivors_gratitude",
    title: "The Survivors Speak",
    description: "The villagers you rescued gather around the campfire. The smith speaks: 'You didn't have to stop. Most wouldn't have.' He holds up a battered shield. 'This was my grandfather's. Take it.'",
    region: null,
    unique: true,
    choices: [
      {
        label: "Accept with thanks",
        description: "Every gift matters",
        outcome: { text: "The shield is old but strong. Your knights will put it to good use. The survivors watch you with something like reverence.", supplies: 5, morale: 5, mercy: 2 },
      },
    ],
  },
  {
    id: "plague_spreads",
    title: "The Plague Spreads",
    description: "Three days after helping the plague village, the sickness surfaces in your caravan. Two soldiers collapse with fever. The healers exchange grim looks.",
    region: null,
    unique: true,
    choices: [
      {
        label: "Quarantine the sick",
        description: "Isolate them before it spreads further",
        outcome: { text: "The sick are placed in a separate cart, tended by your bravest healer. After two agonizing days, the fever breaks. They survive — barely.", woundedCount: 2, food: -5 },
      },
      {
        label: "Push through",
        description: "We can't afford to slow down",
        outcome: { text: "The sick march alongside the healthy. One more falls ill. But the caravan doesn't stop.", woundedCount: 3, morale: -5 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Caravan split events
// ---------------------------------------------------------------------------

const SPLIT_EVENTS: ExodusEvent[] = [
  {
    id: "split_the_caravan",
    title: "The Crossroads",
    description: "The path forks. Your scouts report that the northern route is faster but dangerous — bandits control the hills. The southern route is safer but adds two days. You don't have time for both. A knight steps forward: 'Split the caravan. I'll take the fighters north. Send the civilians south.'",
    region: null,
    unique: true,
    minDay: 8,
    choices: [
      {
        label: "Split the caravan",
        description: "Fighters north, civilians south. Regroup in two days.",
        outcome: { text: "You divide your people. The knight clasps your arm. 'We'll meet you at the river.' He leads the fighters into the hills. For two days, you are vulnerable — but fast.", memberLoss: 4, morale: -8, hope: -3, pursuerDelay: 1, daysLost: 0 },
      },
      {
        label: "Stay together — take the south",
        description: "We don't split up. We go slow but safe.",
        outcome: { text: "The caravan stays whole. The southern road is long and muddy, but there are no ambushes. Two days lost — but everyone is alive.", daysLost: 2, morale: 3, mercy: 1 },
      },
      {
        label: "Stay together — fight through the north",
        description: "Together we're strong enough. Push through.",
        outcome: { text: "The caravan pushes through the bandit territory as one. The bandits attack. Your knights form a wall of steel. It works — barely.", combat: true, combatDanger: 3, morale: 5 },
      },
    ],
  },
  {
    id: "bridge_or_ford",
    title: "The River Crossing",
    description: "A wide river blocks the path. The bridge is intact but held by mercenaries demanding a toll — half your food stores. The ford downstream is free but treacherous.",
    region: null,
    unique: true,
    minDay: 5,
    choices: [
      {
        label: "Pay the toll",
        description: "Give them what they want",
        outcome: { text: "The mercenaries take your food with a grin. 'Pleasure doing business.' Your people cross the bridge in silence, stomachs growling.", food: -30, morale: -5 },
      },
      {
        label: "Ford the river",
        description: "Risk the current",
        outcome: { text: "The water is chest-deep and fast. Carts are swept sideways. Supplies tumble into the current. But everyone makes it across — soaked, shivering, alive.", supplies: -8, woundedCount: 1, food: -5 },
      },
      {
        label: "Storm the bridge",
        description: "They're mercenaries, not soldiers. Take it.",
        outcome: { text: "Your knights charge the barricade. The mercenaries scatter after the first clash — they didn't expect resistance. The bridge is yours.", combat: true, combatDanger: 2, morale: 8, supplies: 5 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// More mercy-gated events
// ---------------------------------------------------------------------------

const MERCY_EVENTS: ExodusEvent[] = [
  {
    id: "refugees_defend",
    title: "The Refugees Fight Back",
    description: "The refugees you've protected throughout the journey approach you with crude weapons — sharpened sticks, kitchen knives, stones in slings. 'We won't let Mordred take what you've given us,' their leader says. 'Let us fight.'",
    region: null,
    unique: true,
    requiresMercy: 12,
    minDay: 12,
    choices: [
      {
        label: "Accept their service",
        description: "\"Every hand counts. Train with the soldiers.\"",
        outcome: { text: "The refugees drill with your soldiers. They'll never be knights, but they're brave and they know what they're fighting for. Five step forward as volunteer fighters.", memberGain: [{ role: "soldier", count: 5 }], morale: 12, hope: 8 },
      },
      {
        label: "Decline gently",
        description: "\"Your courage honors us. But stay safe.\"",
        outcome: { text: "They nod, disappointed but understanding. Their willingness alone boosts the caravan's spirit.", morale: 8, hope: 5 },
      },
    ],
  },
  {
    id: "pragmatist_efficiency",
    title: "Survival Calculus",
    description: "Your ruthless efficiency has earned grudging respect. A former quartermaster approaches: 'You make hard choices. Let me handle rationing — I know how to make food last.'",
    region: null,
    unique: true,
    requiresMercy: -12,
    minDay: 10,
    choices: [
      {
        label: "Put him in charge",
        description: "Efficiency saves lives in the long run",
        outcome: { text: "The quartermaster implements strict rationing. Portions shrink but last longer. Some grumble, but bellies don't go empty.", food: 15, morale: -5, mercy: -2 },
      },
      {
        label: "Decline",
        description: "\"We share equally or not at all\"",
        outcome: { text: "He shrugs and walks away. Your people notice your restraint.", morale: 3, mercy: 3 },
      },
    ],
  },
  {
    id: "abandoned_allies_return",
    title: "Ghosts of Choices Past",
    description: "Survivors from a group you left behind block the road ahead. They're gaunt, furious, armed. 'You left us to die,' their leader snarls. 'Now you'll share what you have — or we'll take it.'",
    region: null,
    unique: true,
    requiresMercy: -8,
    minDay: 14,
    choices: [
      {
        label: "Give them supplies",
        description: "\"You're right. We owe you this.\"",
        outcome: { text: "You hand over food and supplies. Their anger fades. Some even join your caravan. The cost of pragmatism, paid in full.", food: -15, supplies: -8, memberGain: [{ role: "soldier", count: 2 }], morale: 5, mercy: 5 },
      },
      {
        label: "Fight them",
        description: "\"We can't afford to lose more.\"",
        outcome: { text: "Steel meets steel. Former allies die at your hands. The caravan watches in horror. You've crossed a line.", combat: true, combatDanger: 2, morale: -15, hope: -8, mercy: -5 },
      },
    ],
  },
];

const MORE_UNIVERSAL_EVENTS: ExodusEvent[] = [
  {
    id: "veteran_duel",
    title: "The Challenge",
    description: "A grizzled knight challenges a younger soldier to a sparring match. Others gather to watch. It could boost morale — or cause an injury you can't afford.",
    region: null,
    choices: [
      {
        label: "Allow it",
        description: "A little sport lifts spirits",
        outcome: { text: "Steel rings. The young soldier fights well — better than anyone expected. The knight yields with a smile. 'Camelot breeds warriors,' he says. The crowd cheers.", morale: 8 },
      },
      {
        label: "Forbid it",
        description: "We can't risk injuries",
        outcome: { text: "'Sir, we fight real enemies — we don't need to fight each other.' The knight scowls but obeys. The moment passes.", morale: -2 },
      },
    ],
  },
  {
    id: "wounded_choice",
    title: "The Wounded",
    description: "Three wounded soldiers can no longer keep pace. The caravan slows to match them. Mordred's host gains ground with every hour.",
    region: null,
    minDay: 7,
    choices: [
      {
        label: "Build a litter",
        description: "We carry our own (-3 supplies, slower)",
        outcome: { text: "Craftsmen build stretchers from spare wood. The caravan slows, but no one is left behind. The wounded weep with gratitude.", supplies: -3, daysLost: 1, morale: 10, hope: 5, mercy: 3 },
      },
      {
        label: "Give them supplies and leave them",
        description: "They'll survive. Probably.",
        outcome: { text: "You leave food and a map. The wounded watch the caravan march away. One raises a hand in salute. You don't look back.", memberLoss: 3, food: -5, morale: -10, hope: -3, mercy: -5 },
      },
      {
        label: "Conscript peasants to carry them",
        description: "Everyone contributes",
        outcome: { text: "The peasants grumble but comply. The wounded ride on tired backs. It works, but resentment simmers.", morale: -3 },
      },
    ],
  },
  {
    id: "trader_caravan",
    title: "Fellow Travelers",
    description: "Another caravan appears on the road — merchants heading east. EAST. Into Mordred's territory. They either don't know or don't care.",
    region: null,
    minDay: 4,
    choices: [
      {
        label: "Warn them",
        description: "\"Turn back! Mordred's host is coming!\"",
        outcome: { text: "They listen, pale-faced. Half join your caravan. The rest stubbornly press on, convinced their goods will buy safety. You pray they're right.", memberGain: [{ role: "peasant", count: 3 }, { role: "craftsman", count: 1 }], morale: 5, mercy: 2 },
      },
      {
        label: "Trade with them",
        description: "Their loss is your gain",
        outcome: { text: "You trade supplies for food. Fair exchange. They march east. You march west. Two caravans in the dying world, ships passing in the night.", food: 15, supplies: -5 },
      },
    ],
  },
  {
    id: "storm",
    title: "The Storm",
    description: "Black clouds roll in from the east. Lightning splits the sky. Rain hammers down. The caravan grinds to a halt as the road becomes a river of mud.",
    region: null,
    choices: [
      {
        label: "Make camp and wait",
        description: "Shelter until it passes",
        outcome: { text: "You huddle in tents while the world rages outside. Thunder shakes the earth. By dawn, the storm has passed. The world is washed clean.", daysLost: 1, morale: -2 },
      },
      {
        label: "Push through",
        description: "We've faced worse than rain",
        outcome: { text: "The caravan slogsthrough mud and wind. A cart overturns. Lightning strikes a tree nearby, showering sparks. Terrifying — but you keep moving.", supplies: -3, woundedCount: 1, morale: -5 },
      },
    ],
  },
];

export const ALL_EVENTS: ExodusEvent[] = [
  ...ASHEN_EVENTS,
  ...THORNWOOD_EVENTS,
  ...BLIGHTED_EVENTS,
  ...IRON_PEAKS_EVENTS,
  ...SHATTERED_COAST_EVENTS,
  ...COAST_EXTRA_EVENTS,
  ...UNIVERSAL_EVENTS,
  ...REGION_TRANSITION_EVENTS,
  ...BOSS_EVENTS,
  ...CHAIN_EVENTS,
  ...CHAIN_FOLLOWUPS,
  ...SPLIT_EVENTS,
  ...MERCY_EVENTS,
  ...MORE_UNIVERSAL_EVENTS,
];

export function getEventsForRegion(regionId: string): ExodusEvent[] {
  return ALL_EVENTS.filter((e) => e.region === regionId || e.region === null);
}
