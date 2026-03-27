import type { DiabloState } from "./DiabloTypes";

// ──────────────────────────────────────────────────────────────
//  HELPER: Check if save exists
// ──────────────────────────────────────────────────────────────
export function hasSave(): boolean {
  return localStorage.getItem("diablo_save") !== null;
}

// ──────────────────────────────────────────────────────────────
//  SAVE GAME
// ──────────────────────────────────────────────────────────────
export interface SaveContext {
  state: DiabloState;
  menuEl: HTMLDivElement;
  chestsOpened: number;
  goldEarnedTotal: number;
  totalKills: number;
}

export function saveGame(ctx: SaveContext): void {
  const { state, menuEl, chestsOpened, goldEarnedTotal, totalKills } = ctx;
  const save = {
    version: 2,
    timestamp: Date.now(),
    player: {
      ...state.player,
      skillCooldowns: Object.fromEntries(state.player.skillCooldowns),
    },
    currentMap: state.currentMap,
    timeOfDay: state.timeOfDay,
    killCount: state.killCount,
    persistentInventory: state.persistentInventory,
    persistentGold: state.persistentGold,
    persistentLevel: state.persistentLevel,
    persistentXp: state.persistentXp,
    persistentStash: state.persistentStash,
    mapCleared: state.mapCleared,
    difficulty: state.difficulty,
    playerTalents: state.player.talents,
    playerTalentPoints: state.player.talentPoints,
    playerPotions: state.player.potions,
    playerPotionSlots: state.player.potionSlots,
    activeQuests: state.activeQuests,
    completedQuestIds: state.completedQuestIds,
    completedMaps: state.completedMaps,
    chestsOpened: chestsOpened,
    goldEarnedTotal: goldEarnedTotal,
    totalKills: totalKills,
    greaterRift: {
      bestRiftLevel: state.greaterRift.bestRiftLevel,
      keystones: state.greaterRift.keystones,
    },
    excaliburFragments: state.player.excaliburFragments,
    excaliburReforged: state.player.excaliburReforged,
    mordredDefeated: state.player.mordredDefeated,
    // Retention features
    achievements: state.player.achievements,
    dailyChallenges: state.player.dailyChallenges,
    dailyStreak: state.player.dailyStreak,
    lastDailyDate: state.player.lastDailyDate,
    unlockedCosmetics: state.player.unlockedCosmetics,
    activeTrail: state.player.activeTrail,
    activeAura: state.player.activeAura,
    activeTitle: state.player.activeTitle,
  };
  // Backup previous save before overwriting
  const prevSave = localStorage.getItem("diablo_save");
  if (prevSave) {
    localStorage.setItem("diablo_save_backup", prevSave);
  }
  localStorage.setItem("diablo_save", JSON.stringify(save));

  // Show floating notification
  const notification = document.createElement("div");
  notification.style.cssText =
    "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
    "color:#4f4;font-size:28px;font-weight:bold;font-family:'Georgia',serif;" +
    "text-shadow:0 0 15px rgba(0,255,0,0.5);pointer-events:none;" +
    "transition:opacity 1s;opacity:1;z-index:50;";
  notification.textContent = "Game Saved!";
  menuEl.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
  }, 800);
  setTimeout(() => {
    if (notification.parentElement) notification.parentElement.removeChild(notification);
  }, 2000);
}

// ──────────────────────────────────────────────────────────────
//  SAVE RECOVERY PROMPT
// ──────────────────────────────────────────────────────────────
export function showSaveRecoveryPrompt(menuEl: HTMLDivElement): void {
  menuEl.innerHTML = '';
  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(30,10,10,0.95);border:2px solid #ff4444;border-radius:8px;padding:25px;color:#fff;font-family:Georgia,serif;max-width:450px;text-align:center;z-index:200;';

  const hasBackup = localStorage.getItem("diablo_save_backup") !== null;

  panel.innerHTML = `
    <h2 style="color:#ff4444;margin:0 0 15px;">Save Data Corrupted</h2>
    <p style="color:#aaa;font-size:14px;margin-bottom:15px;">
      Your save data could not be loaded. This may have been caused by a browser issue.
    </p>
    ${hasBackup ? `
      <button id="recovery-backup" style="padding:8px 20px;background:#44aa44;color:#fff;border:1px solid #44ff44;border-radius:4px;cursor:pointer;font-family:Georgia,serif;margin:5px;display:block;width:100%;">
        Restore Backup Save
      </button>
    ` : ''}
    <button id="recovery-fresh" style="padding:8px 20px;background:#555;color:#fff;border:1px solid #888;border-radius:4px;cursor:pointer;font-family:Georgia,serif;margin:5px;display:block;width:100%;">
      Start Fresh
    </button>
    <button id="recovery-export" style="padding:8px 20px;background:#335;color:#fff;border:1px solid #558;border-radius:4px;cursor:pointer;font-family:Georgia,serif;margin:5px;display:block;width:100%;">
      Export Corrupted Data (for debug)
    </button>
  `;
  menuEl.appendChild(panel);

  if (hasBackup) {
    document.getElementById('recovery-backup')?.addEventListener('click', () => {
      const backup = localStorage.getItem("diablo_save_backup");
      if (backup) {
        localStorage.setItem("diablo_save", backup);
        location.reload();
      }
    });
  }

  document.getElementById('recovery-fresh')?.addEventListener('click', () => {
    localStorage.removeItem("diablo_save");
    localStorage.removeItem("diablo_save_backup");
    location.reload();
  });

  document.getElementById('recovery-export')?.addEventListener('click', () => {
    const corrupted = localStorage.getItem("diablo_save") || '';
    const blob = new Blob([corrupted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diablo_save_corrupted.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}
