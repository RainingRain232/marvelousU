// ---------------------------------------------------------------------------
// Rampart — HTML HUD overlay
// ---------------------------------------------------------------------------

import { RAMPART, TOWER_DEFS, ENEMY_DEFS, DIFFICULTIES, getWaveComposition } from "../config/RampartConfig";
import type { RampartState } from "../state/RampartState";
import { getUpgradeCost, getTowerSellValue, getTowerEffectiveDamage, getTowerEffectiveRange, getTowerEffectiveFireRate, cycleTowerTargetMode } from "../systems/RampartSystem";

export class RampartHUD {
  private _root!: HTMLDivElement;
  private _topBar!: HTMLDivElement;
  private _towerPanel!: HTMLDivElement;
  private __waveInfo!: HTMLDivElement;
  private _castleBar!: HTMLDivElement;
  private _castleBarFill!: HTMLDivElement;
  private _goldDisplay!: HTMLSpanElement;
  private _waveDisplay!: HTMLSpanElement;
  private _scoreDisplay!: HTMLSpanElement;
  private _killsDisplay!: HTMLSpanElement;
  private _timerDisplay!: HTMLDivElement;
  private _centerMessage!: HTMLDivElement;
  private _menuOverlay!: HTMLDivElement;
  private _gameOverOverlay!: HTMLDivElement;
  private _victoryOverlay!: HTMLDivElement;
  private _speedBtn!: HTMLButtonElement;
  private _enemyCountDisplay!: HTMLSpanElement;
  private _waveClearBanner!: HTMLDivElement;
  private _dmgNumberContainer!: HTMLDivElement;
  private _pauseOverlay!: HTMLDivElement;
  private _towerTooltip!: HTMLDivElement;
  private _wavePreview!: HTMLDivElement;

  private _onExit: (() => void) | null = null;
  private _onStart: (() => void) | null = null;
  private _onSelectTower: ((id: string) => void) | null = null;
  private _onToggleSpeed: (() => void) | null = null;
  private _onSellTower: ((towerId: number) => void) | null = null;
  private _onUpgradeTower: ((towerId: number) => void) | null = null;
  private _onSetDifficulty: ((id: string) => void) | null = null;
  private _projectToScreen: ((x: number, y: number, z: number, sw: number, sh: number) => { x: number; y: number; visible: boolean }) | null = null;

  build(onExit: () => void): void {
    this._onExit = onExit;

    this._root = document.createElement("div");
    this._root.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;font-family:'Trebuchet MS',sans-serif;color:#fff;";
    document.body.appendChild(this._root);

    // Top bar
    this._topBar = document.createElement("div");
    this._topBar.style.cssText = "pointer-events:auto;position:absolute;top:0;left:0;right:0;height:48px;background:linear-gradient(180deg,rgba(0,0,0,0.7),rgba(0,0,0,0.3));display:flex;align-items:center;padding:0 16px;gap:24px;font-size:15px;";
    this._root.appendChild(this._topBar);

    // Back button
    const backBtn = document.createElement("button");
    backBtn.textContent = "EXIT";
    backBtn.style.cssText = "pointer-events:auto;background:#8b0000;color:#fff;border:1px solid #aa2222;padding:6px 14px;cursor:pointer;font-size:13px;font-weight:bold;letter-spacing:1px;border-radius:3px;";
    backBtn.onclick = () => this._onExit?.();
    this._topBar.appendChild(backBtn);

    // Castle HP bar
    const castleLabel = document.createElement("span");
    castleLabel.textContent = "CASTLE";
    castleLabel.style.cssText = "font-size:12px;letter-spacing:1px;opacity:0.8;";
    this._topBar.appendChild(castleLabel);

    this._castleBar = document.createElement("div");
    this._castleBar.style.cssText = "width:180px;height:14px;background:#333;border:1px solid #555;border-radius:2px;overflow:hidden;";
    this._topBar.appendChild(this._castleBar);

    this._castleBarFill = document.createElement("div");
    this._castleBarFill.style.cssText = "height:100%;background:linear-gradient(90deg,#44ff44,#88ff44);transition:width 0.3s;width:100%;";
    this._castleBar.appendChild(this._castleBarFill);

    // Gold
    this._goldDisplay = document.createElement("span");
    this._goldDisplay.style.cssText = "color:#ffd700;font-weight:bold;font-size:16px;";
    this._topBar.appendChild(this._goldDisplay);

    // Wave
    this._waveDisplay = document.createElement("span");
    this._waveDisplay.style.cssText = "font-size:14px;opacity:0.9;";
    this._topBar.appendChild(this._waveDisplay);

    // Score
    this._scoreDisplay = document.createElement("span");
    this._scoreDisplay.style.cssText = "font-size:13px;opacity:0.7;";
    this._topBar.appendChild(this._scoreDisplay);

    // Kills
    this._killsDisplay = document.createElement("span");
    this._killsDisplay.style.cssText = "font-size:13px;opacity:0.7;";
    this._topBar.appendChild(this._killsDisplay);

    // Enemy count
    this._enemyCountDisplay = document.createElement("span");
    this._enemyCountDisplay.style.cssText = "font-size:13px;color:#ff8866;";
    this._topBar.appendChild(this._enemyCountDisplay);

    // Spacer
    const spacer = document.createElement("div");
    spacer.style.cssText = "flex:1;";
    this._topBar.appendChild(spacer);

    // Speed button
    this._speedBtn = document.createElement("button");
    this._speedBtn.textContent = "1x";
    this._speedBtn.style.cssText = "pointer-events:auto;background:#444;color:#fff;border:1px solid #666;padding:4px 10px;cursor:pointer;font-size:13px;border-radius:3px;";
    this._speedBtn.onclick = () => this._onToggleSpeed?.();
    this._topBar.appendChild(this._speedBtn);

    // Tower selection panel (bottom)
    this._towerPanel = document.createElement("div");
    this._towerPanel.style.cssText = "pointer-events:auto;position:absolute;bottom:0;left:0;right:0;height:90px;background:linear-gradient(0deg,rgba(0,0,0,0.8),rgba(0,0,0,0.4));display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;";
    this._root.appendChild(this._towerPanel);

    // Build tower buttons
    const towerIds = Object.keys(TOWER_DEFS);
    for (const id of towerIds) {
      const def = TOWER_DEFS[id];
      const btn = document.createElement("div");
      btn.dataset.towerId = id;
      btn.style.cssText = `pointer-events:auto;cursor:pointer;width:100px;padding:8px;background:rgba(40,40,40,0.9);border:2px solid #555;border-radius:6px;text-align:center;transition:all 0.15s;`;
      btn.innerHTML = `
        <div style="font-size:13px;font-weight:bold;color:#${def.color.toString(16).padStart(6, "0")}">${def.name}</div>
        <div style="font-size:11px;color:#ffd700;margin:2px 0">${def.cost}g</div>
        <div style="font-size:10px;color:#aaa">${def.description}</div>
      `;
      btn.onclick = () => this._onSelectTower?.(id);
      btn.onmouseenter = () => { btn.style.background = "rgba(80,80,80,0.9)"; };
      btn.onmouseleave = () => { btn.style.background = "rgba(40,40,40,0.9)"; };
      this._towerPanel.appendChild(btn);
    }

    // Hotkey hints
    const hotkeyDiv = document.createElement("div");
    hotkeyDiv.style.cssText = "position:absolute;bottom:95px;left:50%;transform:translateX(-50%);font-size:11px;color:#888;";
    hotkeyDiv.textContent = "[1-5] Select Tower   [U] Upgrade   [X] Sell   [T] Target Mode   [RMB] Rotate   [Scroll] Zoom   [Space] Next Wave   [Esc] Pause";
    this._root.appendChild(hotkeyDiv);

    // Wave timer / center message
    this._timerDisplay = document.createElement("div");
    this._timerDisplay.style.cssText = "position:absolute;top:60px;left:50%;transform:translateX(-50%);font-size:24px;font-weight:bold;text-shadow:0 2px 8px rgba(0,0,0,0.8);display:none;";
    this._root.appendChild(this._timerDisplay);

    this._centerMessage = document.createElement("div");
    this._centerMessage.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:32px;font-weight:bold;text-shadow:0 2px 12px rgba(0,0,0,0.9);display:none;text-align:center;";
    this._root.appendChild(this._centerMessage);

    // Menu overlay
    this._menuOverlay = document.createElement("div");
    this._menuOverlay.style.cssText = "pointer-events:auto;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;flex-direction:column;align-items:center;justify-content:center;";
    this._root.appendChild(this._menuOverlay);

    const title = document.createElement("div");
    title.style.cssText = "font-size:52px;font-weight:bold;letter-spacing:6px;text-shadow:0 4px 20px rgba(0,0,0,0.9);margin-bottom:8px;background:linear-gradient(180deg,#ffd700,#cc8800);-webkit-background-clip:text;-webkit-text-fill-color:transparent;";
    title.textContent = "RAMPART";
    this._menuOverlay.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.style.cssText = "font-size:18px;opacity:0.7;margin-bottom:32px;letter-spacing:2px;";
    subtitle.textContent = "CASTLE TOWER DEFENSE";
    this._menuOverlay.appendChild(subtitle);

    const desc = document.createElement("div");
    desc.style.cssText = "font-size:14px;max-width:500px;text-align:center;line-height:1.6;opacity:0.8;margin-bottom:32px;";
    desc.textContent = "Place archer towers, catapults, mage towers and more to defend your castle against 25 waves of medieval invaders. Earn gold from kills to build and upgrade your defenses. Protect the castle at all costs!";
    this._menuOverlay.appendChild(desc);

    // Difficulty selector
    const diffRow = document.createElement("div");
    diffRow.style.cssText = "display:flex;gap:10px;margin-bottom:24px;";
    this._menuOverlay.appendChild(diffRow);

    for (const diff of DIFFICULTIES) {
      const btn = document.createElement("button");
      btn.dataset.diffId = diff.id;
      const isNormal = diff.id === "normal";
      btn.style.cssText = `pointer-events:auto;padding:10px 20px;font-size:14px;font-weight:bold;cursor:pointer;border-radius:4px;border:2px solid ${isNormal ? "#ffd700" : "#555"};background:${isNormal ? "rgba(80,80,40,0.9)" : "rgba(40,40,40,0.9)"};color:#fff;min-width:110px;text-align:center;`;
      btn.innerHTML = `<div>${diff.name}</div><div style="font-size:11px;color:#aaa;font-weight:normal;margin-top:2px;">${diff.description}</div>`;
      btn.onclick = () => {
        this._onSetDifficulty?.(diff.id);
        // Update visual selection
        diffRow.querySelectorAll("button").forEach(b => {
          b.style.borderColor = b.dataset.diffId === diff.id ? "#ffd700" : "#555";
          b.style.background = b.dataset.diffId === diff.id ? "rgba(80,80,40,0.9)" : "rgba(40,40,40,0.9)";
        });
      };
      diffRow.appendChild(btn);
    }

    const startBtn = document.createElement("button");
    startBtn.textContent = "DEFEND THE CASTLE";
    startBtn.style.cssText = "pointer-events:auto;background:linear-gradient(180deg,#228822,#115511);color:#fff;border:2px solid #44aa44;padding:14px 40px;font-size:20px;font-weight:bold;cursor:pointer;letter-spacing:2px;border-radius:4px;text-shadow:0 2px 4px rgba(0,0,0,0.5);";
    startBtn.onmouseenter = () => { startBtn.style.background = "linear-gradient(180deg,#33aa33,#227722)"; };
    startBtn.onmouseleave = () => { startBtn.style.background = "linear-gradient(180deg,#228822,#115511)"; };
    startBtn.onclick = () => this._onStart?.();
    this._menuOverlay.appendChild(startBtn);

    // Game over overlay (hidden)
    this._gameOverOverlay = document.createElement("div");
    this._gameOverOverlay.style.cssText = "pointer-events:auto;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(80,0,0,0.6);display:none;flex-direction:column;align-items:center;justify-content:center;";
    this._root.appendChild(this._gameOverOverlay);

    const goTitle = document.createElement("div");
    goTitle.style.cssText = "font-size:48px;font-weight:bold;color:#ff4444;text-shadow:0 4px 20px rgba(0,0,0,0.9);margin-bottom:16px;";
    goTitle.textContent = "CASTLE FALLEN";
    this._gameOverOverlay.appendChild(goTitle);

    const goStats = document.createElement("div");
    goStats.id = "rampart-go-stats";
    goStats.style.cssText = "font-size:18px;margin-bottom:32px;text-align:center;line-height:1.8;";
    this._gameOverOverlay.appendChild(goStats);

    const goBtn = document.createElement("button");
    goBtn.textContent = "RETURN TO MENU";
    goBtn.style.cssText = "pointer-events:auto;background:#8b0000;color:#fff;border:2px solid #cc4444;padding:12px 30px;font-size:18px;font-weight:bold;cursor:pointer;letter-spacing:2px;border-radius:4px;";
    goBtn.onclick = () => this._onExit?.();
    this._gameOverOverlay.appendChild(goBtn);

    // Victory overlay (hidden)
    this._victoryOverlay = document.createElement("div");
    this._victoryOverlay.style.cssText = "pointer-events:auto;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,40,0,0.6);display:none;flex-direction:column;align-items:center;justify-content:center;";
    this._root.appendChild(this._victoryOverlay);

    const vicTitle = document.createElement("div");
    vicTitle.style.cssText = "font-size:48px;font-weight:bold;color:#ffd700;text-shadow:0 4px 20px rgba(0,0,0,0.9);margin-bottom:16px;";
    vicTitle.textContent = "VICTORY!";
    this._victoryOverlay.appendChild(vicTitle);

    const vicSub = document.createElement("div");
    vicSub.style.cssText = "font-size:22px;margin-bottom:8px;color:#88ff88;";
    vicSub.textContent = "The castle stands!";
    this._victoryOverlay.appendChild(vicSub);

    const vicStats = document.createElement("div");
    vicStats.id = "rampart-vic-stats";
    vicStats.style.cssText = "font-size:18px;margin-bottom:32px;text-align:center;line-height:1.8;";
    this._victoryOverlay.appendChild(vicStats);

    const vicBtn = document.createElement("button");
    vicBtn.textContent = "RETURN TO MENU";
    vicBtn.style.cssText = "pointer-events:auto;background:linear-gradient(180deg,#228822,#115511);color:#fff;border:2px solid #44aa44;padding:12px 30px;font-size:18px;font-weight:bold;cursor:pointer;letter-spacing:2px;border-radius:4px;";
    vicBtn.onclick = () => this._onExit?.();
    this._victoryOverlay.appendChild(vicBtn);

    // Pause overlay
    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = "pointer-events:auto;position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:none;flex-direction:column;align-items:center;justify-content:center;";
    this._root.appendChild(this._pauseOverlay);

    const pauseBox = document.createElement("div");
    pauseBox.style.cssText = "background:rgba(15,15,25,0.95);border:2px solid #5588bb;border-radius:12px;padding:32px 40px;max-width:480px;width:90%;text-align:center;";
    this._pauseOverlay.appendChild(pauseBox);

    const pauseTitle = document.createElement("div");
    pauseTitle.style.cssText = "font-size:42px;font-weight:bold;letter-spacing:4px;text-shadow:0 4px 20px rgba(0,0,0,0.9);margin-bottom:16px;color:#5588bb;";
    pauseTitle.textContent = "PAUSED";
    pauseBox.appendChild(pauseTitle);

    // Tab buttons
    const tabRow = document.createElement("div");
    tabRow.style.cssText = "display:flex;gap:4px;margin-bottom:16px;justify-content:center;";
    pauseBox.appendChild(tabRow);

    const tabContent = document.createElement("div");
    tabContent.style.cssText = "text-align:left;margin-bottom:20px;min-height:160px;";
    pauseBox.appendChild(tabContent);

    const tabs = ["Controls", "Introduction", "Game Concepts"];
    const tabBtns: HTMLButtonElement[] = [];

    const showTab = (idx: number) => {
      tabBtns.forEach((b, i) => {
        b.style.background = i === idx ? "#336699" : "rgba(50,50,80,0.5)";
        b.style.color = i === idx ? "#fff" : "#888";
        b.style.borderColor = i === idx ? "#5588bb" : "#444";
      });
      if (idx === 0) {
        tabContent.innerHTML = [
          ["Click", "Place tower / Select"],
          ["1-6", "Tower hotkeys"],
          ["U", "Upgrade selected tower"],
          ["X", "Sell selected tower"],
          ["WASD", "Move camera"],
          ["Scroll", "Zoom in/out"],
          ["T", "Toggle speed (1x/2x)"],
          ["ESC", "Pause / Resume"],
        ].map(([key, desc]) =>
          `<div style="line-height:2;font-size:13px;color:#bbb;"><span style="display:inline-block;min-width:70px;color:#ffd700;font-weight:bold;">${key}</span> <span style="color:#666;">\u2014</span> ${desc}</div>`
        ).join("");
      } else if (idx === 1) {
        tabContent.innerHTML = `
          <div style="font-size:14px;font-weight:bold;color:#5588bb;margin-bottom:8px;">RAMPART</div>
          <div style="font-size:13px;line-height:1.7;color:#aaa;">
            Defend your castle against 25 waves of medieval invaders! Place and upgrade
            towers strategically during the preparation phase, then watch your defenses
            hold the line as enemies march toward your gates.<br><br>
            Earn gold from defeating enemies and spend it on new towers or upgrades.
            Harder difficulties spawn stronger enemies and give less gold.
            Can you survive all 25 waves?
          </div>`;
      } else {
        tabContent.innerHTML = `
          <div style="font-size:13px;line-height:1.7;color:#aaa;">
            <div style="color:#ffd700;font-weight:bold;margin-bottom:4px;">Tower Types</div>
            <b style="color:#ccc;">Archer</b> — Fast attack, low damage, cheap<br>
            <b style="color:#ccc;">Catapult</b> — Slow, high AoE splash damage<br>
            <b style="color:#ccc;">Ballista</b> — Long range, piercing bolts<br>
            <b style="color:#ccc;">Mage</b> — Magic damage, slows enemies<br>
            <b style="color:#ccc;">Flame</b> — Short range, burns over time<br><br>
            <div style="color:#ffd700;font-weight:bold;margin-bottom:4px;">Upgrading</div>
            Towers can be upgraded up to level 3. Each level increases damage,
            range, and attack speed. Upgraded towers change appearance.<br><br>
            <div style="color:#ffd700;font-weight:bold;margin-bottom:4px;">Strategy Tips</div>
            Place towers near chokepoints. Mix tower types for best coverage.
            Upgrade key towers before building new ones. Save gold for tough waves.
          </div>`;
      }
    };

    for (let i = 0; i < tabs.length; i++) {
      const btn = document.createElement("button");
      btn.textContent = tabs[i];
      btn.style.cssText = "pointer-events:auto;padding:6px 14px;font-size:12px;font-weight:bold;border:1px solid #444;border-radius:4px;cursor:pointer;letter-spacing:1px;transition:all 0.15s;";
      btn.onclick = () => showTab(i);
      tabRow.appendChild(btn);
      tabBtns.push(btn);
    }
    showTab(0);

    const resumeBtn = document.createElement("button");
    resumeBtn.textContent = "RESUME";
    resumeBtn.style.cssText = "pointer-events:auto;background:linear-gradient(180deg,#336699,#224466);color:#fff;border:2px solid #5588bb;padding:12px 36px;font-size:18px;font-weight:bold;cursor:pointer;letter-spacing:2px;border-radius:4px;margin-bottom:12px;width:100%;";
    resumeBtn.onclick = () => { /* toggled via state.paused from game */ };
    resumeBtn.dataset.action = "resume";
    pauseBox.appendChild(resumeBtn);

    const pauseExitBtn = document.createElement("button");
    pauseExitBtn.textContent = "EXIT TO MENU";
    pauseExitBtn.style.cssText = "pointer-events:auto;background:#8b0000;color:#fff;border:2px solid #cc4444;padding:10px 30px;font-size:15px;font-weight:bold;cursor:pointer;letter-spacing:1px;border-radius:4px;width:100%;";
    pauseExitBtn.onclick = () => this._onExit?.();
    pauseBox.appendChild(pauseExitBtn);

    // Tower tooltip (shown when a placed tower is selected)
    this._towerTooltip = document.createElement("div");
    this._towerTooltip.style.cssText = "pointer-events:auto;position:absolute;right:16px;top:60px;width:220px;background:rgba(20,20,30,0.92);border:1px solid #555;border-radius:8px;padding:14px;display:none;font-size:13px;line-height:1.6;";
    this._root.appendChild(this._towerTooltip);

    // Wave preview (shown during prep phase)
    this._wavePreview = document.createElement("div");
    this._wavePreview.style.cssText = "position:absolute;top:90px;left:50%;transform:translateX(-50%);background:rgba(20,20,30,0.85);border:1px solid #555;border-radius:8px;padding:10px 18px;display:none;font-size:13px;text-align:center;line-height:1.5;";
    this._root.appendChild(this._wavePreview);

    // Wave clear banner
    this._waveClearBanner = document.createElement("div");
    this._waveClearBanner.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:bold;text-shadow:0 2px 12px rgba(0,0,0,0.9);display:none;text-align:center;color:#88ff88;transition:opacity 0.5s;";
    this._root.appendChild(this._waveClearBanner);

    // Damage number overlay container
    this._dmgNumberContainer = document.createElement("div");
    this._dmgNumberContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;";
    this._root.appendChild(this._dmgNumberContainer);
  }

  bindStart(onStart: () => void): void {
    this._onStart = onStart;
  }

  bindSelectTower(onSelect: (id: string) => void): void {
    this._onSelectTower = onSelect;
  }

  bindToggleSpeed(onToggle: () => void): void {
    this._onToggleSpeed = onToggle;
  }

  bindSellTower(onSell: (towerId: number) => void): void {
    this._onSellTower = onSell;
  }

  bindUpgradeTower(onUpgrade: (towerId: number) => void): void {
    this._onUpgradeTower = onUpgrade;
  }

  bindSetDifficulty(fn: (id: string) => void): void {
    this._onSetDifficulty = fn;
  }

  bindProjector(fn: (x: number, y: number, z: number, sw: number, sh: number) => { x: number; y: number; visible: boolean }): void {
    this._projectToScreen = fn;
  }

  bindResume(onResume: () => void): void {
    const resumeBtn = this._pauseOverlay.querySelector("[data-action='resume']") as HTMLButtonElement | null;
    if (resumeBtn) resumeBtn.onclick = () => onResume();
  }

  update(state: RampartState): void {
    // Gold
    this._goldDisplay.textContent = `${state.gold}g`;

    // Wave
    this._waveDisplay.textContent = `Wave ${state.wave} / ${RAMPART.MAX_WAVES}`;

    // Score & kills
    this._scoreDisplay.textContent = `Score: ${state.score}`;
    this._killsDisplay.textContent = `Kills: ${state.totalKills}`;

    // Castle HP
    const ratio = state.castleHp / state.castleMaxHp;
    this._castleBarFill.style.width = `${ratio * 100}%`;
    if (ratio > 0.6) {
      this._castleBarFill.style.background = "linear-gradient(90deg,#44ff44,#88ff44)";
    } else if (ratio > 0.3) {
      this._castleBarFill.style.background = "linear-gradient(90deg,#ffaa00,#ffcc00)";
    } else {
      this._castleBarFill.style.background = "linear-gradient(90deg,#ff4444,#ff6644)";
    }

    // Speed button
    this._speedBtn.textContent = `${state.gameSpeed}x`;

    // Enemy count
    if (state.phase === "wave" && state.enemiesAlive > 0) {
      this._enemyCountDisplay.textContent = `Enemies: ${state.enemiesAlive}`;
      this._enemyCountDisplay.style.display = "";
    } else {
      this._enemyCountDisplay.style.display = "none";
    }

    // Wave clear banner
    if (state.waveClearTimer > 0) {
      this._waveClearBanner.style.display = "block";
      this._waveClearBanner.textContent = state.waveClearMessage;
      this._waveClearBanner.style.opacity = String(Math.min(1, state.waveClearTimer));
    } else {
      this._waveClearBanner.style.display = "none";
    }

    // Tower selection highlight
    const btns = this._towerPanel.querySelectorAll("[data-tower-id]") as NodeListOf<HTMLElement>;
    btns.forEach(btn => {
      const id = btn.dataset.towerId!;
      const def = TOWER_DEFS[id];
      const selected = state.selectedTower === id;
      const canAfford = state.gold >= def.cost;
      btn.style.borderColor = selected ? "#ffd700" : "#555";
      btn.style.opacity = canAfford ? "1" : "0.5";
    });

    // Wave timer
    if (state.phase === "prep") {
      this._timerDisplay.style.display = "block";
      this._timerDisplay.textContent = `Next wave in ${Math.ceil(state.waveTimer)}s  [SPACE to start now]`;
    } else {
      this._timerDisplay.style.display = "none";
    }

    // Overlays
    this._menuOverlay.style.display = state.phase === "menu" ? "flex" : "none";

    if (state.phase === "gameover") {
      this._gameOverOverlay.style.display = "flex";
      const stats = document.getElementById("rampart-go-stats");
      if (stats) stats.innerHTML = `Survived ${state.wave} waves<br>Kills: ${state.totalKills}<br>Score: ${state.score}<br>Difficulty: ${state.difficulty.name}${this._buildTowerStats(state)}`;
    } else {
      this._gameOverOverlay.style.display = "none";
    }

    if (state.phase === "victory") {
      this._victoryOverlay.style.display = "flex";
      const stats = document.getElementById("rampart-vic-stats");
      if (stats) stats.innerHTML = `All ${RAMPART.MAX_WAVES} waves defeated!<br>Castle HP: ${state.castleHp}/${state.castleMaxHp}<br>Kills: ${state.totalKills}<br>Score: ${state.score}<br>Difficulty: ${state.difficulty.name}${this._buildTowerStats(state)}`;
    } else {
      this._victoryOverlay.style.display = "none";
    }

    // Center message for wave start
    if (state.waveActive && state.spawnQueue.length > 0 && state.gameTime < 2) {
      this._centerMessage.style.display = "block";
      this._centerMessage.textContent = `WAVE ${state.wave}`;
      this._centerMessage.style.opacity = "1";
    } else {
      this._centerMessage.style.display = "none";
    }

    // Pause overlay
    const showPause = state.paused && (state.phase === "prep" || state.phase === "wave");
    this._pauseOverlay.style.display = showPause ? "flex" : "none";

    // Tower tooltip
    this._updateTowerTooltip(state);

    // Wave preview
    this._updateWavePreview(state);

    // Damage numbers
    this._updateDamageNumbers(state);
  }

  private _updateDamageNumbers(state: RampartState): void {
    if (!this._projectToScreen) {
      this._dmgNumberContainer.innerHTML = "";
      return;
    }

    // Rebuild each frame (damage numbers are short-lived)
    const frags: string[] = [];
    for (const d of state.damageNumbers) {
      const screen = this._projectToScreen(d.x, d.y, d.z, state.sw, state.sh);
      if (!screen.visible) continue;

      const alpha = Math.min(1, d.life);
      const colorHex = "#" + d.color.toString(16).padStart(6, "0");
      const isGold = d.value < 0;
      const text = isGold ? `+${-d.value}g` : String(d.value);
      const fontSize = isGold ? 15 : (d.value >= 30 ? 18 : d.value >= 15 ? 15 : 13);
      const bold = d.value >= 15 || isGold ? "font-weight:bold;" : "";

      frags.push(
        `<div style="position:absolute;left:${screen.x | 0}px;top:${screen.y | 0}px;transform:translate(-50%,-50%);color:${colorHex};font-size:${fontSize}px;${bold}opacity:${alpha.toFixed(2)};text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:none;white-space:nowrap;">${text}</div>`
      );
    }
    this._dmgNumberContainer.innerHTML = frags.join("");
  }

  private _updateTowerTooltip(state: RampartState): void {
    if (state.selectedPlacedTower === null || state.phase === "menu" || state.phase === "gameover" || state.phase === "victory") {
      this._towerTooltip.style.display = "none";
      return;
    }

    const tower = state.towers.find(t => t.id === state.selectedPlacedTower);
    if (!tower) {
      this._towerTooltip.style.display = "none";
      return;
    }

    this._towerTooltip.style.display = "block";

    const def = tower.def;
    const effDmg = getTowerEffectiveDamage(tower).toFixed(1);
    const effRange = getTowerEffectiveRange(tower).toFixed(1);
    const effRate = getTowerEffectiveFireRate(tower).toFixed(2);
    const sellValue = getTowerSellValue(tower);
    const canUpgrade = tower.level < RAMPART.MAX_TOWER_LEVEL;
    const upgCost = canUpgrade ? getUpgradeCost(tower) : 0;
    const canAffordUpgrade = state.gold >= upgCost;

    const levelStars = "★".repeat(tower.level) + "☆".repeat(RAMPART.MAX_TOWER_LEVEL - tower.level);
    const colorHex = "#" + def.color.toString(16).padStart(6, "0");
    const targetLabels = { first: "First (closest to castle)", strongest: "Strongest HP", weakest: "Weakest HP", closest: "Closest to tower" };
    const targetLabel = targetLabels[tower.targetMode];

    this._towerTooltip.innerHTML = `
      <div style="font-size:16px;font-weight:bold;color:${colorHex};margin-bottom:6px;">${def.name}</div>
      <div style="color:#ffd700;margin-bottom:8px;font-size:14px;">${levelStars}</div>
      <div style="color:#ccc;">Damage: <span style="color:#ff8844">${effDmg}</span></div>
      <div style="color:#ccc;">Range: <span style="color:#88bbff">${effRange}</span></div>
      <div style="color:#ccc;">Fire Rate: <span style="color:#88ff88">${effRate}/s</span></div>
      <div style="color:#ccc;">DPS: <span style="color:#ffcc44">${(parseFloat(effDmg) * parseFloat(effRate)).toFixed(1)}</span></div>
      <div style="color:#999;margin-top:4px;font-size:12px;">Kills: ${tower.kills} &nbsp; Total Dmg: ${tower.totalDamage}</div>
      <div style="margin-top:8px;">
        <button data-action="target" style="pointer-events:auto;width:100%;background:#333;color:#aaa;border:1px solid #555;padding:4px 0;font-size:11px;cursor:pointer;border-radius:3px;">Target: ${targetLabel} [T]</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        ${canUpgrade ? `<button data-action="upgrade" style="pointer-events:auto;flex:1;background:${canAffordUpgrade ? "linear-gradient(180deg,#336699,#224466)" : "#333"};color:#fff;border:1px solid ${canAffordUpgrade ? "#5588bb" : "#555"};padding:6px 0;font-size:12px;font-weight:bold;cursor:${canAffordUpgrade ? "pointer" : "default"};border-radius:3px;opacity:${canAffordUpgrade ? "1" : "0.5"};">UPGRADE ${upgCost}g</button>` : `<div style="flex:1;text-align:center;color:#888;font-size:11px;padding:6px 0;">MAX LEVEL</div>`}
        <button data-action="sell" style="pointer-events:auto;flex:1;background:#6b2222;color:#ffd700;border:1px solid #994444;padding:6px 0;font-size:12px;font-weight:bold;cursor:pointer;border-radius:3px;">SELL ${sellValue}g</button>
      </div>
      <div style="font-size:11px;color:#666;margin-top:8px;text-align:center;">Click elsewhere to deselect</div>
    `;

    // Bind button events
    const upgradeBtn = this._towerTooltip.querySelector("[data-action='upgrade']") as HTMLButtonElement | null;
    if (upgradeBtn && canAffordUpgrade) {
      upgradeBtn.onclick = () => this._onUpgradeTower?.(tower.id);
    }
    const sellBtn = this._towerTooltip.querySelector("[data-action='sell']") as HTMLButtonElement | null;
    if (sellBtn) {
      sellBtn.onclick = () => this._onSellTower?.(tower.id);
    }
    const targetBtn = this._towerTooltip.querySelector("[data-action='target']") as HTMLButtonElement | null;
    if (targetBtn) {
      targetBtn.onclick = () => cycleTowerTargetMode(tower);
    }
  }

  private _updateWavePreview(state: RampartState): void {
    if (state.phase !== "prep" || state.wave >= RAMPART.MAX_WAVES) {
      this._wavePreview.style.display = "none";
      return;
    }

    this._wavePreview.style.display = "block";
    const nextWave = state.wave + 1;
    const composition = getWaveComposition(nextWave);

    let html = `<div style="font-size:14px;font-weight:bold;color:#ffcc44;margin-bottom:6px;">NEXT: Wave ${nextWave}</div>`;
    html += `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">`;
    for (const entry of composition) {
      const def = ENEMY_DEFS[entry.enemyId];
      if (!def) continue;
      const colorHex = "#" + def.color.toString(16).padStart(6, "0");
      html += `<div style="text-align:center;"><span style="color:${colorHex};font-weight:bold;">${entry.count}x</span> <span style="color:#ccc;">${def.name}</span></div>`;
    }
    html += `</div>`;

    this._wavePreview.innerHTML = html;
  }

  private _buildTowerStats(state: RampartState): string {
    if (state.towers.length === 0) return "";
    // Sort by kills descending
    const sorted = [...state.towers].sort((a, b) => b.kills - a.kills);
    let html = `<br><div style="font-size:14px;margin-top:12px;color:#aaa;">Tower Performance</div>`;
    html += `<div style="font-size:12px;margin-top:6px;text-align:left;max-height:120px;overflow-y:auto;">`;
    for (const t of sorted.slice(0, 8)) {
      const color = "#" + t.def.color.toString(16).padStart(6, "0");
      html += `<div style="margin:2px 0;"><span style="color:${color};">${t.def.name}</span> Lv${t.level} — <span style="color:#ffd700;">${t.kills} kills</span>, ${t.totalDamage} dmg</div>`;
    }
    if (sorted.length > 8) html += `<div style="color:#666;">...and ${sorted.length - 8} more</div>`;
    html += `</div>`;
    return html;
  }

  cleanup(): void {
    if (this._root.parentElement) {
      this._root.parentElement.removeChild(this._root);
    }
  }
}
