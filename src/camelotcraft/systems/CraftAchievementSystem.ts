// ---------------------------------------------------------------------------
// Camelot Craft – Achievement / milestone notification system
// ---------------------------------------------------------------------------

import type { CraftState } from "../state/CraftState";
import { addMessage } from "../state/CraftState";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (state: CraftState) => boolean;
  unlocked: boolean;
}

const _achievements: Achievement[] = [
  { id: "first_block", name: "Getting Started", description: "Mine your first block", icon: "⛏",
    check: (s) => s.player.blocksMined >= 1, unlocked: false },
  { id: "first_craft", name: "The Smith's Path", description: "Craft your first tool", icon: "🔨",
    check: (s) => s.quests.some(q => q.id === "craft_first_tool" && q.completed), unlocked: false },
  { id: "iron_age", name: "The Iron Age", description: "Mine 10 iron ore", icon: "⚒",
    check: (s) => s.quests.some(q => q.id === "mine_iron" && q.completed), unlocked: false },
  { id: "home_sweet", name: "Home Sweet Home", description: "Place 50 blocks", icon: "🏠",
    check: (s) => s.player.blocksPlaced >= 50, unlocked: false },
  { id: "builder", name: "Master Builder", description: "Place 200 blocks", icon: "🏰",
    check: (s) => s.player.blocksPlaced >= 200, unlocked: false },
  { id: "architect", name: "Royal Architect", description: "Place 500 blocks", icon: "👑",
    check: (s) => s.player.blocksPlaced >= 500, unlocked: false },
  { id: "first_kill", name: "Defender of the Realm", description: "Slay your first enemy", icon: "⚔",
    check: (s) => s.quests.some(q => q.id === "defeat_dragon" && q.progress >= 1) ||
                   s.player.xp > 0, unlocked: false },
  { id: "level5", name: "Rising Knight", description: "Reach level 5", icon: "🌟",
    check: (s) => s.player.level >= 5, unlocked: false },
  { id: "level10", name: "Veteran Warrior", description: "Reach level 10", icon: "⭐",
    check: (s) => s.player.level >= 10, unlocked: false },
  { id: "excalibur", name: "The Once and Future King", description: "Find Excalibur", icon: "🗡",
    check: (s) => s.player.hasExcalibur, unlocked: false },
  { id: "grail", name: "Grail Knight", description: "Find the Holy Grail", icon: "🏆",
    check: (s) => s.player.hasGrail, unlocked: false },
  { id: "knights12", name: "The Round Table", description: "Recruit all 12 Knights", icon: "🛡",
    check: (s) => s.player.knightsRecruited >= 12, unlocked: false },
  { id: "survivor", name: "Survivor", description: "Survive 10 days", icon: "🌅",
    check: (s) => s.dayNumber >= 10, unlocked: false },
  { id: "deep_diver", name: "Deep Diver", description: "Reach Y level 5 underground", icon: "💎",
    check: (s) => s.player.position.y <= 5, unlocked: false },
  { id: "dragon_slayer", name: "Dragon Slayer", description: "Defeat the Dragon", icon: "🐉",
    check: (s) => s.quests.some(q => q.id === "defeat_dragon" && q.completed), unlocked: false },
  { id: "victory", name: "Legend of Camelot", description: "Complete all quests", icon: "👑",
    check: (s) => s.quests.every(q => q.completed), unlocked: false },
];

let _notificationEl: HTMLDivElement | null = null;

function showAchievementNotification(achievement: Achievement): void {
  if (_notificationEl) _notificationEl.remove();

  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; top:60px; left:50%; transform:translateX(-50%);
    background:linear-gradient(135deg, rgba(40,30,10,0.95), rgba(60,45,15,0.95));
    border:2px solid #FFD700; border-radius:10px; padding:12px 24px;
    color:white; font-family:Georgia,serif; z-index:50;
    display:flex; align-items:center; gap:12px;
    box-shadow:0 0 20px rgba(255,215,0,0.4), inset 0 0 10px rgba(255,215,0,0.1);
    animation:ccFadeIn 0.5s ease;
  `;
  el.innerHTML = `
    <span style="font-size:28px;">${achievement.icon}</span>
    <div>
      <div style="color:#FFD700;font-size:14px;font-weight:bold;letter-spacing:1px;">
        Achievement Unlocked!
      </div>
      <div style="font-size:16px;margin-top:2px;">${achievement.name}</div>
      <div style="font-size:11px;opacity:0.7;margin-top:2px;">${achievement.description}</div>
    </div>
  `;
  document.body.appendChild(el);
  _notificationEl = el;

  // Fade out after 4 seconds
  setTimeout(() => {
    el.style.transition = "opacity 0.5s, transform 0.5s";
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) translateY(-10px)";
    setTimeout(() => el.remove(), 500);
  }, 4000);
}

/** Check all achievements. Call every few seconds. */
export function checkAchievements(state: CraftState): void {
  for (const ach of _achievements) {
    if (ach.unlocked) continue;
    if (ach.check(state)) {
      ach.unlocked = true;
      showAchievementNotification(ach);
      addMessage(state, `Achievement: ${ach.name} — ${ach.description}`, 0xFFD700);
    }
  }
}

/** Get all achievements for display. */
export function getAchievements(): Achievement[] {
  return _achievements;
}

/** Get unlock count. */
export function getAchievementCount(): { unlocked: number; total: number } {
  return {
    unlocked: _achievements.filter(a => a.unlocked).length,
    total: _achievements.length,
  };
}
