import type { DiabloState } from "./DiabloTypes";
import { ACHIEVEMENT_DEFS, MAP_CONFIGS } from "./DiabloConfig";

// ──────────────────────────────────────────────────────────────
//  ACHIEVEMENT SYSTEM
// ──────────────────────────────────────────────────────────────

export function initAchievements(state: DiabloState): void {
  const p = state.player;
  if (p.achievements.length === 0) {
    p.achievements = ACHIEVEMENT_DEFS.map(def => ({
      ...def,
      progress: 0,
      unlocked: false,
    }));
  }
}

/**
 * Update an achievement's progress (set to max of current vs new).
 * Returns side-effect info when an achievement is newly unlocked.
 */
export function updateAchievement(
  state: DiabloState,
  id: string,
  progress: number,
): { unlocked: true; name: string } | null {
  const p = state.player;
  const achievement = p.achievements.find(a => a.id === id);
  if (!achievement || achievement.unlocked) return null;

  achievement.progress = Math.max(achievement.progress, progress);

  if (achievement.progress >= achievement.requirement) {
    achievement.unlocked = true;
    p.achievementNotifications.push(id);

    // Award rewards
    if (achievement.reward) {
      if (achievement.reward.gold) p.gold += achievement.reward.gold;
      if (achievement.reward.xp) p.xp += achievement.reward.xp;
      if (achievement.reward.cosmeticId && !p.unlockedCosmetics.includes(achievement.reward.cosmeticId)) {
        p.unlockedCosmetics.push(achievement.reward.cosmeticId);
      }
    }

    return { unlocked: true, name: achievement.name };
  }
  return null;
}

export function incrementAchievement(
  state: DiabloState,
  id: string,
  amount: number = 1,
): { unlocked: true; name: string } | null {
  const p = state.player;
  const achievement = p.achievements.find(a => a.id === id);
  if (!achievement || achievement.unlocked) return null;
  return updateAchievement(state, id, achievement.progress + amount);
}

// ──────────────────────────────────────────────────────────────
//  ACHIEVEMENT UI
// ──────────────────────────────────────────────────────────────

export function showAchievements(
  menuEl: HTMLDivElement,
  state: DiabloState,
  onClose: () => void,
): void {
  menuEl.innerHTML = '';
  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,15,10,0.95);border:2px solid #8b6914;border-radius:8px;padding:20px;color:#fff;font-family:Georgia,serif;min-width:500px;max-height:80vh;overflow-y:auto;z-index:100;pointer-events:auto;';

  const unlocked = state.player.achievements.filter(a => a.unlocked).length;
  const total = state.player.achievements.length;
  panel.innerHTML = `<h2 style="text-align:center;color:#ffd700;margin:0 0 15px;">Achievements (${unlocked}/${total})</h2>`;

  const categories: ('combat' | 'exploration' | 'collection' | 'challenge' | 'quest')[] = ['combat', 'exploration', 'collection', 'challenge', 'quest'];
  for (const cat of categories) {
    const catAchs = state.player.achievements.filter(a => a.category === cat);
    const catLabel = document.createElement('h3');
    catLabel.style.cssText = 'color:#b8860b;margin:10px 0 5px;font-size:14px;text-transform:uppercase;';
    catLabel.textContent = cat;
    panel.appendChild(catLabel);

    for (const ach of catAchs) {
      const row = document.createElement('div');
      const opacity = ach.unlocked ? '1' : '0.5';
      const check = ach.unlocked ? '\u2713' : `${ach.progress}/${ach.requirement}`;
      row.style.cssText = `padding:4px 8px;margin:2px 0;background:rgba(255,255,255,0.05);border-radius:3px;font-size:12px;opacity:${opacity};display:flex;justify-content:space-between;`;
      row.innerHTML = `<span>${ach.icon} ${ach.name} — <span style="color:#aaa;">${ach.description}</span></span><span style="color:${ach.unlocked ? '#44ff44' : '#888'};">${check}</span>`;
      panel.appendChild(row);
    }
  }

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'display:block;margin:15px auto 0;padding:8px 20px;background:#555;color:#fff;border:1px solid #888;border-radius:4px;cursor:pointer;font-family:Georgia,serif;';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', onClose);
  panel.appendChild(closeBtn);
  menuEl.appendChild(panel);
}

/**
 * Processes the next achievement notification from the queue.
 * Returns info about the achievement to display, or null if none pending.
 */
export function processAchievementNotifications(
  state: DiabloState,
): { id: string; name: string; description: string } | null {
  if (state.player.achievementNotifications.length === 0) return null;

  const achId = state.player.achievementNotifications.shift()!;
  const ach = state.player.achievements.find(a => a.id === achId);
  if (!ach) return null;

  return { id: ach.id, name: ach.name, description: ach.description };
}

// ──────────────────────────────────────────────────────────────
//  DAILY CHALLENGE SYSTEM
// ──────────────────────────────────────────────────────────────

export function generateDailyChallenges(state: DiabloState): void {
  const p = state.player;
  const today = new Date().toISOString().split('T')[0];

  if (p.lastDailyDate === today && p.dailyChallenges.length > 0) return;

  // Check streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (p.lastDailyDate === yesterday) {
    p.dailyStreak++;
  } else if (p.lastDailyDate !== today) {
    p.dailyStreak = 1;
  }
  p.lastDailyDate = today;

  // Generate 3 daily challenges
  const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
  const rng = (n: number) => ((seed * 16807 + n * 2147483647) % 2147483647) / 2147483647;

  const streakBonus = 1 + (p.dailyStreak - 1) * 0.1;

  p.dailyChallenges = [
    {
      id: `daily-kill-${today}`,
      name: 'Slaughter',
      description: `Kill ${50 + Math.floor(rng(1) * 100)} enemies`,
      type: 'kill',
      target: 50 + Math.floor(rng(1) * 100),
      progress: 0,
      completed: false,
      reward: { gold: Math.floor(500 * streakBonus), xp: Math.floor(200 * streakBonus) },
      generatedDate: today,
    },
    {
      id: `daily-gold-${today}`,
      name: 'Fortune Seeker',
      description: `Collect ${1000 + Math.floor(rng(2) * 2000)} gold`,
      type: 'collect_gold',
      target: 1000 + Math.floor(rng(2) * 2000),
      progress: 0,
      completed: false,
      reward: { gold: Math.floor(800 * streakBonus), xp: Math.floor(300 * streakBonus), keystones: 1 },
      generatedDate: today,
    },
    {
      id: `daily-boss-${today}`,
      name: 'Boss Bounty',
      description: `Defeat ${2 + Math.floor(rng(3) * 3)} bosses`,
      type: 'boss_kill',
      target: 2 + Math.floor(rng(3) * 3),
      progress: 0,
      completed: false,
      reward: { gold: Math.floor(1000 * streakBonus), xp: Math.floor(500 * streakBonus), keystones: 1 },
      generatedDate: today,
    },
  ];
}

export interface DailyProgressResult {
  completed: boolean;
  challengeName: string;
  rewardGold: number;
  rewardXp: number;
  rewardKeystones: number;
}

/**
 * Update daily challenge progress. Returns completed challenges (if any)
 * so the caller can handle side-effects (floating text, sound, keystones).
 */
export function updateDailyProgress(
  state: DiabloState,
  type: string,
  amount: number = 1,
): DailyProgressResult[] {
  const results: DailyProgressResult[] = [];
  for (const challenge of state.player.dailyChallenges) {
    if (challenge.completed || challenge.type !== type) continue;
    challenge.progress += amount;
    if (challenge.progress >= challenge.target) {
      challenge.completed = true;
      const p = state.player;
      p.gold += challenge.reward.gold;
      p.xp += challenge.reward.xp;
      if (challenge.reward.keystones) {
        state.greaterRift.keystones += challenge.reward.keystones;
      }
      results.push({
        completed: true,
        challengeName: challenge.name,
        rewardGold: challenge.reward.gold,
        rewardXp: challenge.reward.xp,
        rewardKeystones: challenge.reward.keystones || 0,
      });
    }
  }
  return results;
}

// ──────────────────────────────────────────────────────────────
//  QUEST TRACKER HUD
// ──────────────────────────────────────────────────────────────

export function updateQuestTracker(
  trackerEl: HTMLDivElement,
  state: DiabloState,
  currentMap: string,
): void {
  const active = state.activeQuests.filter(q => q.isActive && !q.isComplete);
  const dailies = state.player.dailyChallenges.filter(d => !d.completed);
  const bounties = state.activeBounties.filter(b => !b.isComplete && b.isActive);
  if (active.length === 0 && dailies.length === 0 && bounties.length === 0 && state.player.prestigeLevel === 0) {
    trackerEl.style.display = "none";
    return;
  }
  // Don't re-show if user manually closed it
  if (trackerEl.dataset.userHidden === "true") return;
  trackerEl.style.display = "block";
  let html = '';
  if (active.length > 0) {
    html += `<div style="color:#c8a84e;font-size:13px;font-weight:bold;margin-bottom:6px;border-bottom:1px solid #5a4a2a;padding-bottom:4px;">QUESTS</div>`;
    for (const q of active) {
      const pct = Math.min(100, (q.progress / q.required) * 100);
      html += `
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:#ddd;margin-bottom:2px;">${q.name}</div>
          <div style="width:100%;height:6px;background:rgba(30,25,15,0.9);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#c8a84e,#ffd700);border-radius:3px;"></div>
          </div>
          <div style="font-size:10px;color:#888;margin-top:1px;">${q.progress}/${q.required}</div>
        </div>`;
    }
  }
  if (dailies.length > 0) {
    const streak = state.player.dailyStreak;
    html += `<div style="color:#44aaff;font-size:13px;font-weight:bold;margin:8px 0 6px;border-bottom:1px solid #2a3a5a;padding-bottom:4px;">DAILY CHALLENGES ${streak > 1 ? `(${streak} day streak!)` : ''}</div>`;
    for (const d of dailies) {
      const pct = Math.min(100, (d.progress / d.target) * 100);
      html += `
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:#ddd;margin-bottom:2px;">${d.name}: ${d.description}</div>
          <div style="width:100%;height:6px;background:rgba(15,20,30,0.9);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#4488ff,#44aaff);border-radius:3px;"></div>
          </div>
          <div style="font-size:10px;color:#888;margin-top:1px;">${d.progress}/${d.target} | +${d.reward.gold}g +${d.reward.xp}xp</div>
        </div>`;
    }
  }
  // Bounty tracker
  const activeBounties = state.activeBounties.filter(b => !b.isComplete && b.isActive);
  if (activeBounties.length > 0) {
    html += `<div style="color:#ffd700;font-size:13px;font-weight:bold;margin:8px 0 6px;border-bottom:1px solid #5a4a2a;padding-bottom:4px;">BOUNTIES</div>`;
    for (const b of activeBounties) {
      const isOnMap = b.mapId === currentMap;
      const mapName = MAP_CONFIGS[b.mapId as keyof typeof MAP_CONFIGS]?.name || b.mapId;
      html += `
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:${isOnMap ? '#ff8800' : '#ddd'};margin-bottom:2px;">${b.targetName}</div>
          <div style="font-size:10px;color:#888;">${mapName} | +${b.reward.gold}g +${b.reward.xp}xp${b.reward.keystones ? ' +1 key' : ''}</div>
        </div>`;
    }
  }

  // Prestige indicator
  if (state.player.prestigeLevel > 0) {
    html += `<div style="color:#ffd700;font-size:10px;margin-top:6px;border-top:1px solid #5a4a2a;padding-top:4px;">Prestige ${state.player.prestigeLevel} | +${state.player.prestigeBonuses.damagePercent}% DMG +${state.player.prestigeBonuses.hpPercent}% HP</div>`;
  }

  // Reopen hint
  html += `<div style="color:#555;font-size:9px;margin-top:8px;text-align:center;border-top:1px solid #3a2a1a;padding-top:4px;">Press O to close/reopen</div>`;

  // Update the content container (not the tracker itself, to preserve close button)
  const contentEl = trackerEl.querySelector("#quest-tracker-content") as HTMLDivElement | null;
  if (contentEl) {
    contentEl.innerHTML = html;
  } else {
    trackerEl.innerHTML = html;
  }
}
