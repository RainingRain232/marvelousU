// Leader definitions — each leader grants a passive bonus to the player.
// Leaders have no combat stats; they provide flat buffs applied at game start
// and/or each round reset.

import { UnitType, BuildingType } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeaderId = string;

export interface LeaderDef {
  id: LeaderId;
  name: string;
  title: string;
  /** Flavor/lore sentence shown in the leader card. */
  flavor: string;
  /** Short one-line description of the bonus, shown as the "bonus" tag. */
  bonusLabel: string;
  /** Structured bonus data consumed by the game systems. */
  bonus: LeaderBonus;
}

/** Discriminated union of all bonus types. */
export type LeaderBonus =
  | { type: "unit_start_level"; unitSource: "stables"; level: number }
  | { type: "unit_start_level_building"; building: BuildingType; level: number }
  | { type: "unit_start_level_type"; unitType: UnitType; level: number }
  | { type: "spawn_unit_near_castle"; unitType: UnitType; bonusLevel?: number }
  | { type: "gold_bonus"; amount: number }
  | { type: "income_multiplier"; multiplier: number }
  | { type: "base_health_bonus"; amount: number }
  | { type: "unit_atk_multiplier"; multiplier: number }
  | { type: "unit_hp_multiplier"; multiplier: number }
  | { type: "spawn_speed_multiplier"; multiplier: number }
  | { type: "capture_speed_multiplier"; multiplier: number }
  | { type: "building_cost_reduction"; multiplier: number }
  | { type: "unit_cost_reduction"; multiplier: number }
  | { type: "none" };

// ---------------------------------------------------------------------------
// Leader definitions
// ---------------------------------------------------------------------------

export const LEADER_DEFINITIONS: LeaderDef[] = [
  {
    id: "arthur",
    name: "Arthur",
    title: "The Once and Future King",
    flavor: "Crowned by destiny and bound by the oath of Camelot, Arthur drew the sword from the stone when no other hand could move it. He forged a fractured land into a single kingdom through courage, justice, and an unbreakable will. Knights rallied to his banner not for gold or glory, but because Arthur embodied a dream — that honour could rule where tyranny once reigned. Even now, legends whisper that he sleeps beneath the hollow hills, waiting for the hour of Britain's greatest need.",
    bonusLabel: "Stables units start at Level 2.",
    bonus: { type: "unit_start_level", unitSource: "stables", level: 2 },
  },
  {
    id: "merlin",
    name: "Merlin",
    title: "Archmage of Avalon",
    flavor: "Born of mortal woman and otherworldly spirit, Merlin walked between worlds before Arthur ever drew breath. It was Merlin who set the sword in the stone, who raised Camelot's walls with whispered words, and who saw the future in the flames — though he could never change it. His counsel shaped kings and toppled pretenders, yet for all his foresight he could not escape the fate that love wove for him. They say his voice still echoes in the deep places of the earth, guiding those wise enough to listen.",
    bonusLabel: "Mages start at Level 1. A Storm Mage spawns near your castle at battle start.",
    bonus: { type: "unit_start_level_building", building: BuildingType.MAGE_TOWER, level: 1 },
  },
  {
    id: "guinevere",
    name: "Guinevere",
    title: "Queen of Camelot",
    flavor: "The fairest queen to grace the throne of Camelot, Guinevere's beauty was matched only by her fierce resolve. She held court when Arthur rode to war, dispensing justice with a wisdom that silenced even the most quarrelsome lords. Her presence on the ramparts rallied defenders who might otherwise have broken, and her voice carried the authority of the crown itself.",
    bonusLabel: "All units have +20% attack.",
    bonus: { type: "unit_atk_multiplier", multiplier: 1.2 },
  },
  {
    id: "lancelot",
    name: "Lancelot",
    title: "Knight of the Lake",
    flavor: "Raised by the Lady of the Lake in a realm beneath the waters, Lancelot emerged as the most fearsome warrior the Round Table ever knew. No knight could match his blade, no fortress could withstand his siege. His lance shattered shields like kindling, and armies that saw his banner approaching often surrendered before the first charge.",
    bonusLabel: "Siege units spawn 30% faster.",
    bonus: { type: "spawn_speed_multiplier", multiplier: 0.7 },
  },
  {
    id: "morgan",
    name: "Morgan le Fay",
    title: "The Fay Enchantress",
    flavor: "Half-sister to the king and mistress of the old magics, Morgan le Fay learned her craft in the hidden places of Avalon where the veil between worlds grows thin. She commands illusion and enchantment with a subtlety that makes even Merlin wary. Wealth flows to her through arcane bargains, and her coffers are never empty.",
    bonusLabel: "Start with +300 bonus gold.",
    bonus: { type: "gold_bonus", amount: 300 },
  },
  {
    id: "gawain",
    name: "Gawain",
    title: "Knight of the Sun",
    flavor: "Nephew to Arthur and champion of the common folk, Gawain's strength waxes with the sun — at noon he fights with the fury of three men. He accepted the Green Knight's challenge when no other dared, and walked into certain death with a smile. His resilience is legendary; wounds that would fell lesser warriors barely slow his stride.",
    bonusLabel: "All units have +15% HP.",
    bonus: { type: "unit_hp_multiplier", multiplier: 1.15 },
  },
  {
    id: "galahad",
    name: "Galahad",
    title: "The Pure Knight",
    flavor: "Son of Lancelot yet untouched by his father's sins, Galahad alone proved worthy to sit in the Siege Perilous — the seat at the Round Table that destroyed all who were unworthy. His purity of heart opened doors that strength could not, and divine providence blessed every venture he undertook with abundance and prosperity.",
    bonusLabel: "Gold income is +25% higher.",
    bonus: { type: "income_multiplier", multiplier: 1.25 },
  },
  {
    id: "percival",
    name: "Percival",
    title: "Seeker of the Grail",
    flavor: "A simple boy raised in the Welsh wilderness, Percival came to Camelot knowing nothing of knighthood — and left as one of the three who beheld the Holy Grail. His innocence was his shield, his earnestness his sword. He builds and fortifies with the same honest dedication he brought to his sacred quest.",
    bonusLabel: "Buildings cost 15% less gold.",
    bonus: { type: "building_cost_reduction", multiplier: 0.85 },
  },
  {
    id: "tristan",
    name: "Tristan",
    title: "The Sorrowful Knight",
    flavor: "The finest swordsman of Cornwall, Tristan's blade sang with a melancholy that belied its lethality. He won kingdoms through single combat and claimed contested ground with a swiftness that left his enemies reeling. Where others laid siege, Tristan simply walked in and planted his standard before the defenders could react.",
    bonusLabel: "Neutral buildings are captured 40% faster.",
    bonus: { type: "capture_speed_multiplier", multiplier: 0.6 },
  },
  {
    id: "nimue",
    name: "Nimue",
    title: "Lady of the Lake",
    flavor: "Guardian of the sacred waters and keeper of Excalibur, Nimue wields power older than any mortal kingdom. It was she who gave Arthur the sword that made him invincible, and she who raised Lancelot beneath enchanted waves. Her blessing wards castle walls with ancient magic, making them far harder to breach.",
    bonusLabel: "Base starts with +500 extra health.",
    bonus: { type: "base_health_bonus", amount: 500 },
  },
  {
    id: "kay",
    name: "Kay",
    title: "Seneschal of Camelot",
    flavor: "Arthur's foster-brother and the steward who kept Camelot running while its knights rode to glory. Kay managed the treasury, supplied the armies, and negotiated with merchants so shrewdly that every coin stretched further under his watch. He may lack the romance of a questing knight, but without Kay there would be no kingdom to quest for.",
    bonusLabel: "All units cost 10% less gold.",
    bonus: { type: "unit_cost_reduction", multiplier: 0.9 },
  },
  {
    id: "bedivere",
    name: "Bedivere",
    title: "The Loyal Hand",
    flavor: "The first knight to swear fealty to Arthur and the last to stand beside him at Camlann, Bedivere's loyalty never wavered through decades of war and treachery. He lost a hand in battle yet fought on, and his endurance in the shield wall became the stuff of legend. Where Bedivere stands, the line does not break.",
    bonusLabel: "All units have +25% HP.",
    bonus: { type: "unit_hp_multiplier", multiplier: 1.25 },
  },
  {
    id: "elaine",
    name: "Elaine",
    title: "The Lily Maid",
    flavor: "The Lady of Astolat whose unrequited devotion became the saddest tale in all of Camelot. Yet beneath the tragedy lay a keen mind and a deadly eye — Elaine trained the archers of Astolat, and her bowmen were feared across the realm. Under her tutelage, every arrow found its mark with uncanny precision.",
    bonusLabel: "Archers start at Level 1.",
    bonus: { type: "unit_start_level_type", unitType: UnitType.ARCHER, level: 1 },
  },
  {
    id: "mordred",
    name: "Mordred",
    title: "The Usurper",
    flavor: "Arthur's illegitimate son, born of treachery and raised in shadow, Mordred craved the throne with a hunger that consumed all other feeling. His warriors fight with a frenzied speed born of desperation and ambition, striking before their foes can mount a defence. At Camlann he proved that even the greatest kingdom can fall to one who fights without scruple.",
    bonusLabel: "All units have +15% attack speed.",
    bonus: { type: "unit_atk_multiplier", multiplier: 1.15 },
  },
  {
    id: "igraine",
    name: "Igraine",
    title: "Duchess of Cornwall",
    flavor: "Mother of Arthur and Morgan both, Igraine endured the schemes of kings and sorcerers with a grace that hid iron resolve. A devout woman, she founded temples and sanctuaries across the realm, and the healers she patronised trained faster and more skilfully than any in the land. Her legacy of mercy outlasted every war her children fought.",
    bonusLabel: "Temples train units 25% faster.",
    bonus: { type: "spawn_speed_multiplier", multiplier: 0.75 },
  },
  {
    id: "pellinore",
    name: "Pellinore",
    title: "The Questing King",
    flavor: "Sworn to hunt the Questing Beast — a creature no mortal could catch — Pellinore spent his life pursuing monsters through the wild places of the world. His kinship with beasts is unmatched; creatures that flee from other men rally to Pellinore's call. The dens he establishes produce beasts of unusual cunning and ferocity.",
    bonusLabel: "Creature Den units start at Level 1.",
    bonus: { type: "unit_start_level_building", building: BuildingType.CREATURE_DEN, level: 1 },
  },
  {
    id: "ector",
    name: "Ector",
    title: "The Humble Lord",
    flavor: "The quiet lord who raised young Arthur as his own, never seeking glory or reward. Ector managed his estates with such prudence that his lands prospered even in the leanest years. His treasury was always full, his people always fed, and when the time came to support his foster-son's claim to the throne, he had gold enough to outfit an army.",
    bonusLabel: "Start with +500 bonus gold.",
    bonus: { type: "gold_bonus", amount: 500 },
  },
  {
    id: "bors",
    name: "Bors",
    title: "The Steadfast",
    flavor: "One of the three knights to achieve the Grail, Bors was neither the purest nor the mightiest — but he was the most dependable. In every battle he stood exactly where he was needed, neither advancing too far nor retreating too soon. His soldiers absorbed his quiet confidence, fighting with both greater fortitude and sharper steel.",
    bonusLabel: "All units have +10% HP and +10% attack.",
    bonus: { type: "unit_hp_multiplier", multiplier: 1.1 },
  },
  {
    id: "uther",
    name: "Uther",
    title: "The Pendragon",
    flavor: "Arthur's father and the dragon-bannered king who first united the warring lords of Britain by force of arms. Uther ruled through strength and cunning, extracting tribute from every corner of his domain. Under the Pendragon's iron gaze, gold flowed ceaselessly into the royal coffers, funding campaigns that crushed all who defied the crown.",
    bonusLabel: "Gold income is +15% higher.",
    bonus: { type: "income_multiplier", multiplier: 1.15 },
  },
  {
    id: "lot",
    name: "Lot",
    title: "King of Orkney",
    flavor: "Ruler of the storm-battered northern isles and father to Gawain, Lot built his fortress on cliffs so sheer that no army could scale them. His keeps were legendary for their impregnability — thick-walled, deep-moated, and provisioned to withstand siege for years. Those who shelter behind Lot's defences find their strongholds nearly unbreakable.",
    bonusLabel: "Base starts with +1000 extra health.",
    bonus: { type: "base_health_bonus", amount: 1000 },
  },
  {
    id: "isolde",
    name: "Isolde",
    title: "The Fair Healer",
    flavor: "Princess of Ireland and the most gifted healer in all the isles, Isolde learned the names of every herb and salve before she could hold a sword. She mended wounds that should have been mortal — including those of Tristan, the very knight who slew her uncle. Their doomed love became legend, but her skill in the healing arts endured long after the poets fell silent.",
    bonusLabel: "Base starts with +500 extra health.",
    bonus: { type: "base_health_bonus", amount: 500 },
  },
  {
    id: "gareth",
    name: "Gareth",
    title: "Knight of Many Colours",
    flavor: "Brother to Gawain and nephew to the king, Gareth came to Camelot and served a full year in the kitchens before requesting knighthood. Kay mocked him as 'Beaumains' — pretty hands — but when the year ended, Gareth rode out and defeated the Red Knight, the Blue Knight, and the Green Knight in succession. His humility proved sharper than any blade.",
    bonusLabel: "Creature Den units start at Level 1.",
    bonus: { type: "unit_start_level_building", building: BuildingType.CREATURE_DEN, level: 1 },
  },
  {
    id: "agravain",
    name: "Agravain",
    title: "The Dark Knight",
    flavor: "Son of King Lot and brother to Gawain, Agravain earned the name 'Dark Knight' not for villainy but for doing what no other knight had the stomach to do. He exposed Lancelot and Guinevere's affair — a truth every knight of the Round Table knew but none dared speak. It destroyed Camelot, and Lancelot killed him for it, but Agravain went to his grave calling it honesty.",
    bonusLabel: "Base starts with +1000 extra health.",
    bonus: { type: "base_health_bonus", amount: 1000 },
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getLeader(id: LeaderId): LeaderDef | undefined {
  return LEADER_DEFINITIONS.find((l) => l.id === id);
}
