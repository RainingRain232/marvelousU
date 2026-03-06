export interface BanterLine {
  trigger: "dungeon_enter" | "boss_victory" | "low_hp" | "town_enter" | "level_up" | "party_wipe" | "first_battle" | "night_travel" | "weather_rain" | "weather_snow";
  lines: string[];
}

export const BANTER_LINES: BanterLine[] = [
  { trigger: "dungeon_enter", lines: [
    "This place gives me chills...",
    "Stay close, everyone.",
    "I've got a bad feeling about this.",
    "Let's find what we came for and get out.",
  ]},
  { trigger: "boss_victory", lines: [
    "We did it! I can't believe we won!",
    "That was close... too close.",
    "Victory is ours!",
    "I knew we could do it!",
  ]},
  { trigger: "low_hp", lines: [
    "I can't keep going much longer...",
    "We need to rest soon.",
    "I'm barely standing...",
  ]},
  { trigger: "town_enter", lines: [
    "Finally, a real bed!",
    "Time to resupply.",
    "I could use a drink.",
    "Let's see what they have for sale.",
  ]},
  { trigger: "level_up", lines: [
    "I feel stronger!",
    "That training paid off!",
    "I'm getting the hang of this!",
  ]},
  { trigger: "party_wipe", lines: [
    "We weren't ready...",
    "We'll come back stronger.",
  ]},
  { trigger: "first_battle", lines: [
    "Here they come! Ready yourselves!",
    "This is it... our first real fight!",
  ]},
  { trigger: "night_travel", lines: [
    "It's dark out here... watch your step.",
    "The creatures grow bolder at night.",
    "We should find shelter soon.",
  ]},
  { trigger: "weather_rain", lines: [
    "This rain won't let up...",
    "At least it hides our tracks.",
  ]},
  { trigger: "weather_snow", lines: [
    "I can barely feel my fingers.",
    "The cold bites deep...",
  ]},
];

export function getRandomBanter(trigger: BanterLine["trigger"], seed: number): string | null {
  const entry = BANTER_LINES.find(b => b.trigger === trigger);
  if (!entry) return null;
  return entry.lines[seed % entry.lines.length];
}
