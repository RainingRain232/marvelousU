// ---------------------------------------------------------------------------
// Plague Doctor — configuration & constants
// ---------------------------------------------------------------------------

import type { Perk, NarrativeEvent } from "../state/PlagueState";
import { WeatherType } from "../state/PlagueState";

export const PlagueConfig = {
  TILE_SIZE: 44,
  MOVES_PER_TURN: 4,
  ACTIONS_PER_TURN: 2,
  HERBS_PER_GATHER: 2,
  HERBS_TO_CRAFT_REMEDY: 2,
  REMEDIES_PER_CRAFT: 1,
  TREAT_HERB_COST: 1,
  TREAT_REMEDY_COST: 1,
  LEECH_CURE_CHANCE: 0.6,
  SPREAD_CHANCE: 0.25,
  QUARANTINE_BLOCK: true,
  FUMIGATION_TURNS: 3,
  INFECTION_ADVANCE_CHANCE: 0.5,
  RAT_MOVE_CHANCE: 0.7,
  RAT_INFECT_CHANCE: 0.4,
  RAT_SPAWN_INTERVAL: 5,
  RAT_SPAWN_MAX: 6,
  MARKET_HERB_PRICE: 2,
  MARKET_MASK_PRICE: 3,
  MARKET_LEECH_PRICE: 4,
  MARKET_REMEDY_PRICE: 6,
  GOLD_PER_CURE: 1,
  GOLD_PER_RAT_KILL: 2,
  GOLD_PERFECT_DAY: 3,
  EXPOSURE_TREAT_NO_MASK: 2,
  EXPOSURE_TREAT_MASK: 0,
  CHURCH_HEAL: 3,
  SCORE_PER_CURE: 10,
  SCORE_PER_RAT: 5,
  SCORE_PER_DAY_SURVIVED: 3,
  SCORE_PERFECT_DAY: 15,
  SCORE_DEATH_PENALTY: -8,
  SCORE_WIN_BONUS: 100,
  SCORE_HARBINGER_DEFEAT: 50,
  MOVE_ANIM_SPEED: 12,
  VISION_RANGE: 4,
  PERK_INTERVAL: 5,
  COMBO_GOLD_PER_STEP: 1,
  COMBO_SCORE_PER_STEP: 5,
  APPRENTICE_HIRE_COST: 8,

  // Plague waves
  WAVE_INTERVAL: 7,
  WAVE_EXTRA_SPREAD: 0.35,  // Added to spread chance during wave
  WAVE_EXTRA_ADVANCE: 0.3,

  // Harbinger
  HARBINGER_SPAWN_DAY: 12,
  HARBINGER_HP: 4,
  HARBINGER_INFECT_CHANCE: 0.9,  // Chance to infect house it enters

  // Warn
  WARN_DURATION: 3,
  WARN_RESIST: 0.5,  // 50% chance to resist infection when warned

  DIFFICULTIES: [
    { name: "Apprentice", spreadMult: 0.7, advanceMult: 0.6, movesBonus: 1, desc: "Slower spread, extra moves, fewer rats" },
    { name: "Physician",  spreadMult: 1.0, advanceMult: 1.0, movesBonus: 0, desc: "The standard challenge" },
    { name: "Black Death", spreadMult: 1.4, advanceMult: 1.3, movesBonus: -1, desc: "Fast spread, fewer moves, more rats" },
  ] as const,
} as const;

export const TILE_COLORS: Record<number, { bg: number; label: string }> = {
  0: { bg: 0x2a2a22, label: "Empty" }, 1: { bg: 0x8b6914, label: "House" },
  2: { bg: 0x2277aa, label: "Well" }, 3: { bg: 0xc4a84a, label: "Church" },
  4: { bg: 0x7a5020, label: "Workshop" }, 5: { bg: 0x333333, label: "Cemetery" },
  6: { bg: 0x504030, label: "Road" }, 7: { bg: 0x555555, label: "Wall" },
  8: { bg: 0x996633, label: "Market" }, 9: { bg: 0x886644, label: "Barricade" },
};

export const INFECTION_COLORS: Record<number, number> = { 0: 0x44aa44, 1: 0xbbbb33, 2: 0xdd7722, 3: 0xcc2222, 4: 0x222222 };
export const INFECTION_LABELS: Record<number, string> = { 0: "Healthy", 1: "Rumored", 2: "Infected", 3: "Dying", 4: "Dead" };
export const DISTRICT_NAMES: Record<number, string> = { 0: "Slums", 1: "Market Quarter", 2: "Noble Quarter", 3: "Outskirts" };
export const DISTRICT_COLORS: Record<number, number> = { 0: 0x665544, 1: 0x887755, 2: 0x8899aa, 3: 0x667766 };
export const MUTATION_NAMES: Record<number, string> = { 0: "None", 1: "Airborne", 2: "Resilient", 3: "Fast", 4: "Necromantic" };
export const MUTATION_DESCRIPTIONS: Record<number, string> = {
  0: "", 1: "The plague spreads diagonally now!", 2: "Herbs are less effective — treatment only reduces by one stage.",
  3: "Infections advance twice as fast!", 4: "The dead spread plague to their neighbors...",
};

export const WEATHER_INFO: Record<number, { name: string; desc: string; color: number; icon: string }> = {
  [WeatherType.CLEAR]:      { name: "Clear",      desc: "Normal conditions",                    color: 0xddddaa, icon: "*" },
  [WeatherType.RAIN]:        { name: "Rain",        desc: "Spread chance -30%, vision -1",        color: 0x6688aa, icon: "~" },
  [WeatherType.WIND_NORTH]:  { name: "North Wind",  desc: "Plague spreads southward more easily", color: 0x88aacc, icon: "v" },
  [WeatherType.WIND_SOUTH]:  { name: "South Wind",  desc: "Plague spreads northward more easily", color: 0x88aacc, icon: "^" },
  [WeatherType.FOG]:         { name: "Fog",          desc: "Vision -2, rats more active",          color: 0x888888, icon: "?" },
  [WeatherType.STORM]:       { name: "Storm",        desc: "Movement costs double, but no spread", color: 0x556688, icon: "!" },
};

export const RATING_THRESHOLDS = [
  { min: 350, label: "S", color: 0xffd700, title: "Legendary Physician" },
  { min: 240, label: "A", color: 0x44ff44, title: "Master Healer" },
  { min: 150, label: "B", color: 0x44aaff, title: "Competent Doctor" },
  { min: 80,  label: "C", color: 0xdddd44, title: "Apprentice Physician" },
  { min: 0,   label: "D", color: 0xff6644, title: "Barber Surgeon" },
] as const;

export const UNLOCK_MILESTONES = [
  { wins: 1, label: "First Victory", reward: "Start with Thick Skin perk" },
  { wins: 3, label: "Seasoned Doctor", reward: "Start with Herbalist perk" },
  { wins: 5, label: "Plague Slayer", reward: "Start with Swift Feet perk" },
] as const;

export const ALL_PERKS: Perk[] = [
  { id: "swift_feet", name: "Swift Feet", desc: "+1 move per turn", color: 0x4488ff },
  { id: "extra_action", name: "Tireless", desc: "+1 action per turn", color: 0xff8844 },
  { id: "herbalist", name: "Herbalist", desc: "Gather +1 extra herb per visit", color: 0x66bb66 },
  { id: "thick_skin", name: "Thick Skin", desc: "Treating without mask costs only 1 HP", color: 0xddccaa },
  { id: "eagle_eye", name: "Eagle Eye", desc: "+2 vision range", color: 0x88ccff },
  { id: "potent_remedy", name: "Potent Remedy", desc: "Remedies also fumigate the treated tile", color: 0x44ddcc },
  { id: "rat_catcher", name: "Rat Catcher", desc: "Killing rats doesn't cost an action", color: 0xaa7744 },
  { id: "bulk_buyer", name: "Haggler", desc: "Market prices reduced by 1g", color: 0xffd700 },
  { id: "iron_will", name: "Iron Will", desc: "+3 max health", color: 0xff4444 },
  { id: "fire_walk", name: "Fumigator", desc: "Moving through a house auto-fumigates 1 turn", color: 0xaaddaa },
  { id: "gold_touch", name: "Golden Touch", desc: "+1 gold per 2 cures", color: 0xffd700 },
  { id: "leech_master", name: "Leech Master", desc: "Leeches always succeed + you keep the leech", color: 0xcc8888 },
  { id: "second_wind", name: "Second Wind", desc: "Church heals to full HP", color: 0xddddaa },
  { id: "quarantine_pro", name: "Quarantine Expert", desc: "Quarantining is free (no action cost)", color: 0xff6644 },
  { id: "scouts_report", name: "Scout's Report", desc: "Reveal all tiles briefly at start of each turn", color: 0x88aaff },
  { id: "weatherproof", name: "Weatherproof", desc: "Ignore negative weather effects", color: 0x88aacc },
  { id: "smite", name: "Smite", desc: "Abilities cooldown 1 turn faster", color: 0xffdd44 },
];

export const NARRATIVE_EVENTS: NarrativeEvent[] = [
  { id: "noble_bribe", title: "A Noble's Plea", text: "Lord Ashworth begs you to treat his estate first. He offers 8 gold, but the slums are in worse shape.",
    choices: [{ label: "Accept the gold (+8g, -5 score)", effect: "noble_accept" }, { label: "Refuse and tend the poor (+10 score)", effect: "noble_refuse" }] },
  { id: "witch_remedy", title: "The Wise Woman", text: "An old woman claims she has a powerful folk remedy. It looks suspicious, but could be genuine.",
    choices: [{ label: "Trust her (+2 remedies)", effect: "witch_trust" }, { label: "Refuse (she curses you, -1 HP)", effect: "witch_refuse" }, { label: "Buy it for 4g (+2 remedies, -4g)", effect: "witch_buy" }] },
  { id: "rat_king", title: "The Rat King", text: "Hunters have cornered a massive rat nest. They can destroy it, but need your herbs to smoke them out.",
    choices: [{ label: "Give 3 herbs (remove all rats)", effect: "ratking_give" }, { label: "Decline (rats multiply)", effect: "ratking_decline" }] },
  { id: "fleeing_family", title: "Fleeing Refugees", text: "A family tries to flee the city. Letting them go risks spreading plague outside, but keeping them risks more infection inside.",
    choices: [{ label: "Let them go (-2 population)", effect: "flee_let" }, { label: "Keep them (+1 pop, 30% infection risk)", effect: "flee_keep" }] },
  { id: "church_donation", title: "The Bishop's Collection", text: "The Bishop offers to raise funds, but wants you to skip treating today to attend the sermon.",
    choices: [{ label: "Attend (+10g, lose remaining actions)", effect: "bishop_attend" }, { label: "Politely decline", effect: "bishop_decline" }] },
  { id: "apprentice_offer", title: "A Willing Student", text: "A young barber's apprentice wants to help you fight the plague. They could treat one nearby house per turn.",
    choices: [{ label: "Hire for 8g (gain apprentice)", effect: "apprentice_hire" }, { label: "Too risky, decline", effect: "apprentice_decline" }] },
  { id: "quarantine_riot", title: "Quarantine Riot!", text: "Citizens are breaking quarantine barriers! They demand freedom, but it will spread the plague.",
    choices: [{ label: "Reinforce quarantines (-3g)", effect: "riot_reinforce" }, { label: "Let them break free (all quarantines removed)", effect: "riot_free" }] },
  { id: "miracle_spring", title: "Miracle Spring", text: "Pilgrims claim a spring has healing waters.",
    choices: [{ label: "Bless the water (+3 HP, +2 herbs)", effect: "spring_bless" }, { label: "Debunk it (+5 score)", effect: "spring_debunk" }] },
  { id: "harbinger_sighting", title: "Dark Omen", text: "Townsfolk report a cloaked figure walking through the streets at night, leaving sickness in its wake. It must be stopped.",
    choices: [{ label: "Prepare to confront it (+2 masks)", effect: "harbinger_prep" }, { label: "Pray for protection (+2 HP)", effect: "harbinger_pray" }] },
  { id: "weather_ritual", title: "Weather Ritual", text: "A druid offers to change the weather for a price.",
    choices: [{ label: "Pay 5g for Rain (slows plague)", effect: "weather_rain" }, { label: "Pay 3g for Clear skies", effect: "weather_clear" }, { label: "Decline", effect: "weather_decline" }] },
];
