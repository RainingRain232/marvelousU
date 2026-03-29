// ---------------------------------------------------------------------------
// Settlers – HTML overlay HUD (enhanced with minimap, wiki, save/load, etc.)
// ---------------------------------------------------------------------------

import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { RESOURCE_META, ResourceType, FOOD_TYPES } from "../config/SettlersResourceDefs";
import { canUpgradeBuilding, getUpgradeCost, getEffectiveProductionTime, TRADEABLE_RESOURCES } from "../systems/SettlersBuildingSystem";
import { Biome, Deposit, Visibility } from "../state/SettlersMap";
import { SB } from "../config/SettlersBalance";
import type { SettlersState, SettlersTool, SettlersSkirmishSettings } from "../state/SettlersState";
import { AI_PERSONALITY_LABELS, AI_PERSONALITY_DESCRIPTIONS } from "../state/SettlersPlayer";
import { getNextRoadQuality, getRoadUpgradeCost } from "../systems/SettlersRoadSystem";
import { calculateScore } from "../systems/SettlersMilitarySystem";
import {
  setMasterVolume, getMasterVolume,
  setSfxVolume, getSfxVolume,
  setMusicVolume, getMusicVolume,
  toggleMute, isMuted,
  playUIClick,
} from "../systems/SettlersAudioSystem";

// Production chain data for the wiki panel
const PRODUCTION_CHAINS: { name: string; steps: string[] }[] = [
  { name: "Construction", steps: ["Wood -> Sawmill -> Planks", "Mountain -> Quarry -> Stone"] },
  { name: "Food", steps: ["Forest -> Hunter -> Meat", "Water -> Fisher -> Fish", "Meadow -> Farm -> Wheat -> Mill -> Flour", "Flour + Water -> Bakery -> Bread"] },
  { name: "Beer", steps: ["Wheat + Water -> Brewery -> Beer"] },
  { name: "Iron", steps: ["Mountain -> Iron Mine (food) -> Iron Ore", "Mountain -> Coal Mine (food) -> Coal", "Iron Ore + Coal -> Smelter -> Iron"] },
  { name: "Gold", steps: ["Mountain -> Gold Mine (food) -> Gold Ore", "Gold Ore + Coal -> Mint -> Gold"] },
  { name: "Military", steps: ["Iron + Coal -> Swordsmith -> Sword", "Iron + Coal -> Shieldsmith -> Shield", "Sword + Shield + Beer -> Barracks -> Soldier", "Planks + Iron -> Bowyer -> Bow", "Bow + Beer -> Archery Range -> Archer", "Sword + Shield + Beer + 2 Bread -> Stable -> Knight"] },
  { name: "Trade", steps: ["Market: convert resources (3:1 or 2:1 raw-to-raw)", "Build a Market and select sell/buy resources"] },
];

export class SettlersHUD {
  private _root!: HTMLDivElement;
  private _resourceBar!: HTMLDivElement;
  private _buildMenu!: HTMLDivElement;
  private _infoPanel!: HTMLDivElement;
  private _toolIndicator!: HTMLDivElement;
  private _pauseOverlay!: HTMLDivElement;
  private _gameOverOverlay!: HTMLDivElement;
  private _minimap!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _wikiPanel!: HTMLDivElement;
  private _notification!: HTMLDivElement;
  private _notificationTimer = 0;
  private _wikiVisible = false;
  private _tooltip!: HTMLDivElement;
  private _toast!: HTMLDivElement;
  private _toastTimer = 0;
  private _gameOverShown = false;
  private _audioPanel!: HTMLDivElement;
  private _audioPanelVisible = false;
  private _muteBtn!: HTMLButtonElement;
  private _aiPersonalityIndicator!: HTMLDivElement;
  private _skirmishOverlay!: HTMLDivElement;
  private _chainsPanel!: HTMLDivElement;
  private _chainsPanelVisible = false;
  private _minimapLegend!: HTMLDivElement;
  private _minimapLegendVisible = false;
  private _minimapMouseDown: ((e: MouseEvent) => void) | null = null;
  private _minimapMouseMove: ((e: MouseEvent) => void) | null = null;

  // Camera info for minimap viewport indicator
  private _cameraTargetX = 0;
  private _cameraTargetZ = 0;
  private _cameraDistance = 40;
  private _cameraYaw = 0;
  private _cameraPitch = 0;

  // Callbacks
  onSelectBuildingType: ((type: SettlersBuildingType) => void) | null = null;
  onSelectTool: ((tool: SettlersTool) => void) | null = null;
  onExit: (() => void) | null = null;
  onSave: (() => void) | null = null;
  onLoad: (() => void) | null = null;
  onMinimapClick: ((worldX: number, worldZ: number) => void) | null = null;
  onQueueAdd: ((buildingId: string, itemType: string) => void) | null = null;
  onQueueRemove: ((buildingId: string, index: number) => void) | null = null;
  onUpgrade: ((buildingId: string) => void) | null = null;
  onMarketTrade: ((buildingId: string, sell: ResourceType | null, buy: ResourceType | null) => void) | null = null;
  onRoadUpgrade: ((roadId: string) => void) | null = null;
  onStartGame: ((settings: SettlersSkirmishSettings) => void) | null = null;

  build(): void {
    this._root = document.createElement("div");
    this._root.id = "settlers-hud";
    this._root.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 20; font-family: 'Segoe UI', system-ui, sans-serif; color: #e0d8c8;
    `;
    document.body.appendChild(this._root);

    // --- Resource bar (top) ---
    this._resourceBar = document.createElement("div");
    this._resourceBar.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; height: 40px;
      background: linear-gradient(180deg, rgba(20,18,48,0.95) 0%, rgba(12,10,30,0.92) 100%);
      display: flex; align-items: center;
      padding: 0 16px; gap: 16px; font-size: 13px; pointer-events: auto;
      border-bottom: 2px solid rgba(180,160,100,0.25);
      box-shadow: 0 2px 12px rgba(0,0,0,0.4);
      backdrop-filter: blur(8px);
    `;
    this._root.appendChild(this._resourceBar);

    // --- Tool indicator (top-right) ---
    this._toolIndicator = document.createElement("div");
    this._toolIndicator.style.cssText = `
      position: absolute; top: 50px; right: 12px; padding: 8px 16px;
      background: linear-gradient(135deg, rgba(20,18,48,0.92), rgba(30,25,60,0.92));
      border-radius: 8px; font-size: 14px; font-weight: 600;
      pointer-events: auto; border: 1px solid rgba(180,160,100,0.3);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      backdrop-filter: blur(6px);
    `;
    this._root.appendChild(this._toolIndicator);

    // --- AI Personality indicator (top-right, below tool indicator) ---
    this._aiPersonalityIndicator = document.createElement("div");
    this._aiPersonalityIndicator.style.cssText = `
      position: absolute; top: 90px; right: 12px; padding: 6px 14px;
      background: linear-gradient(135deg, rgba(40,15,15,0.92), rgba(50,20,20,0.92));
      border-radius: 8px; font-size: 12px;
      pointer-events: auto; border: 1px solid rgba(200,80,80,0.3);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      backdrop-filter: blur(6px); display: none; cursor: default;
      transition: all 0.3s ease;
    `;
    this._root.appendChild(this._aiPersonalityIndicator);

    // --- Build menu (bottom) ---
    this._buildMenu = document.createElement("div");
    this._buildMenu.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 0;
      background: linear-gradient(0deg, rgba(12,10,30,0.95) 0%, rgba(20,18,48,0.92) 100%);
      padding: 10px 14px;
      pointer-events: auto; display: flex; flex-wrap: wrap; gap: 5px;
      align-items: center;
      border-top: 2px solid rgba(180,160,100,0.25); max-height: 170px;
      overflow-y: auto;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.4);
      backdrop-filter: blur(8px);
    `;
    this._root.appendChild(this._buildMenu);
    this._buildBuildMenu();

    // --- Info panel (right) ---
    this._infoPanel = document.createElement("div");
    this._infoPanel.style.cssText = `
      position: absolute; top: 90px; right: 12px; width: 240px;
      background: linear-gradient(135deg, rgba(20,18,48,0.94), rgba(14,12,35,0.94));
      border-radius: 10px; padding: 12px 14px;
      pointer-events: auto; font-size: 12px; display: none;
      border: 1px solid rgba(180,160,100,0.25);
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      backdrop-filter: blur(8px);
    `;
    this._root.appendChild(this._infoPanel);

    // --- Minimap (bottom-left) ---
    this._minimap = document.createElement("canvas");
    this._minimap.width = 160;
    this._minimap.height = 160;
    this._minimap.style.cssText = `
      position: absolute; bottom: 180px; left: 10px;
      background: rgba(12,10,30,0.95); border: 2px solid rgba(180,160,100,0.3);
      border-radius: 8px; pointer-events: auto; image-rendering: pixelated;
      box-shadow: 0 2px 12px rgba(0,0,0,0.5);
    `;
    this._root.appendChild(this._minimap);
    this._minimapCtx = this._minimap.getContext("2d")!;

    // Minimap click handler — move camera to clicked world position
    this._minimapMouseDown = (e: MouseEvent) => {
      e.stopPropagation();
      this._handleMinimapClick(e);
    };
    this._minimapMouseMove = (e: MouseEvent) => {
      if (e.buttons & 1) {
        e.stopPropagation();
        this._handleMinimapClick(e);
      }
    };
    this._minimap.addEventListener("mousedown", this._minimapMouseDown);
    this._minimap.addEventListener("mousemove", this._minimapMouseMove);

    // --- Audio control panel (above minimap, toggleable) ---
    this._buildAudioPanel();

    // --- Wiki panel (toggleable) ---
    this._wikiPanel = document.createElement("div");
    this._wikiPanel.style.cssText = `
      position: absolute; top: 90px; left: 12px; width: 300px; max-height: 420px;
      background: linear-gradient(135deg, rgba(20,18,48,0.95), rgba(14,12,35,0.95));
      border-radius: 10px; padding: 14px;
      pointer-events: auto; font-size: 11px; display: none; overflow-y: auto;
      border: 1px solid rgba(180,160,100,0.25);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
    `;
    this._buildWikiPanel();
    this._root.appendChild(this._wikiPanel);

    // --- Notification ---
    this._notification = document.createElement("div");
    this._notification.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 24px; color: #ffd700; text-shadow: 0 0 12px rgba(255,215,0,0.4), 2px 2px 8px #000;
      display: none; pointer-events: none; transition: opacity 0.3s;
      font-weight: 600; letter-spacing: 1px;
    `;
    this._root.appendChild(this._notification);

    // --- Pause overlay ---
    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 48px; color: #ffd700; text-shadow: 2px 2px 8px #000;
      display: none; pointer-events: none;
    `;
    this._pauseOverlay.textContent = "PAUSED";
    this._root.appendChild(this._pauseOverlay);

    // --- Game over overlay ---
    this._gameOverOverlay = document.createElement("div");
    this._gameOverOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); display: none; align-items: center;
      justify-content: center; flex-direction: column; pointer-events: auto;
    `;
    this._root.appendChild(this._gameOverOverlay);

    // --- Toast notification (for build errors, etc.) ---
    this._toast = document.createElement("div");
    this._toast.style.cssText = `
      position: absolute; bottom: 180px; left: 50%; transform: translateX(-50%);
      padding: 8px 20px; background: rgba(180,40,40,0.92); color: #ffe0e0;
      border-radius: 6px; font-size: 14px; pointer-events: none; display: none;
      border: 1px solid rgba(255,100,100,0.4); text-shadow: 1px 1px 2px #000;
      transition: opacity 0.3s; white-space: nowrap;
    `;
    this._root.appendChild(this._toast);

    // --- Skirmish settings overlay ---
    this._buildSkirmishOverlay();

    // --- Production chains panel ---
    this._chainsPanel = document.createElement("div");
    this._chainsPanel.style.cssText = `
      position: absolute; top: 90px; left: 12px; width: 340px; max-height: 500px;
      background: linear-gradient(135deg, rgba(20,18,48,0.96), rgba(14,12,35,0.96));
      border-radius: 10px; padding: 14px;
      pointer-events: auto; font-size: 11px; display: none; overflow-y: auto;
      border: 1px solid rgba(180,160,100,0.25);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
    `;
    this._root.appendChild(this._chainsPanel);

    // --- Minimap legend ---
    this._minimapLegend = document.createElement("div");
    this._minimapLegend.style.cssText = `
      position: absolute; bottom: 345px; left: 10px; width: 156px;
      background: rgba(12,10,30,0.95); border: 1px solid rgba(180,160,100,0.25);
      border-radius: 6px; padding: 8px; pointer-events: auto; font-size: 10px;
      display: none; color: #c8c0b0;
    `;
    this._minimapLegend.innerHTML = `
      <div style="color:#ffd700;font-size:11px;margin-bottom:4px;font-weight:bold;">Minimap Legend</div>
      <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:8px;height:8px;background:#7a7a7a;border-radius:50%;"></span> Iron Deposit</div>
      <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:8px;height:8px;background:#ffd700;border-radius:50%;"></span> Gold Deposit</div>
      <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:8px;height:8px;background:#333;border-radius:50%;border:1px solid #666;"></span> Coal Deposit</div>
      <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:8px;height:8px;background:#999;border-radius:50%;"></span> Stone Deposit</div>
      <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:8px;height:8px;background:#5599bb;border-radius:50%;"></span> Fish</div>
      <div style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px;">
        <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:8px;height:8px;background:#4488ff;border-radius:50%;"></span> Your Building</div>
        <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:8px;height:8px;background:#ff4444;border-radius:50%;"></span> Enemy Building</div>
        <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:6px;height:6px;background:#88ff88;border-radius:50%;"></span> Your Soldier</div>
        <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:6px;height:6px;background:#ff6666;border-radius:50%;"></span> Enemy Soldier</div>
        <div style="display:flex;align-items:center;gap:4px;margin:2px 0;"><span style="display:inline-block;width:10px;height:2px;background:#ff4444;"></span> Enemy Border</div>
      </div>
    `;
    this._root.appendChild(this._minimapLegend);

    // Minimap legend toggle (click on minimap border area)
    const legendToggle = document.createElement("div");
    legendToggle.style.cssText = `
      position: absolute; bottom: 338px; left: 10px; width: 20px; height: 16px;
      background: rgba(20,18,48,0.85); border: 1px solid rgba(180,160,100,0.3);
      border-radius: 3px; pointer-events: auto; cursor: pointer;
      font-size: 9px; color: #aaa; text-align: center; line-height: 16px;
    `;
    legendToggle.textContent = "?";
    legendToggle.title = "Toggle minimap legend";
    legendToggle.onclick = () => {
      this._minimapLegendVisible = !this._minimapLegendVisible;
      this._minimapLegend.style.display = this._minimapLegendVisible ? "block" : "none";
    };
    this._root.appendChild(legendToggle);

    // --- Hover tooltip (for build menu buttons) ---
    this._tooltip = document.createElement("div");
    this._tooltip.style.cssText = `
      position: absolute; padding: 10px 14px; background: linear-gradient(135deg, rgba(16,14,38,0.97), rgba(10,8,25,0.97));
      color: #e0d8c8; border-radius: 8px; font-size: 11px; pointer-events: none;
      display: none; z-index: 30; max-width: 280px; line-height: 1.6;
      border: 1px solid rgba(180,160,100,0.3); box-shadow: 0 6px 20px rgba(0,0,0,0.6);
      backdrop-filter: blur(10px);
    `;
    this._root.appendChild(this._tooltip);
  }

  showNotification(text: string): void {
    this._notification.textContent = text;
    this._notification.style.display = "block";
    this._notification.style.opacity = "1";
    this._notificationTimer = 2.0;
  }

  /** Show an error/info toast that fades after ~2 seconds */
  showToast(text: string, isError = true): void {
    this._toast.textContent = text;
    this._toast.style.background = isError
      ? "rgba(180,40,40,0.92)"
      : "rgba(40,120,60,0.92)";
    this._toast.style.color = isError ? "#ffe0e0" : "#e0ffe0";
    this._toast.style.display = "block";
    this._toast.style.opacity = "1";
    this._toastTimer = 2.0;
  }

  private _buildWikiPanel(): void {
    let html = `<div style="font-size:14px;color:#ffd700;margin-bottom:8px;">Production Chains</div>`;
    for (const chain of PRODUCTION_CHAINS) {
      html += `<div style="color:#aaddff;margin-top:6px;font-weight:bold;">${chain.name}</div>`;
      for (const step of chain.steps) {
        html += `<div style="color:#b8c8a0;padding-left:8px;">${step}</div>`;
      }
    }
    html += `<div style="margin-top:12px;color:#888;">Press [H] to toggle this panel</div>`;
    this._wikiPanel.innerHTML = html;
  }

  toggleWiki(): void {
    this._wikiVisible = !this._wikiVisible;
    this._wikiPanel.style.display = this._wikiVisible ? "block" : "none";
  }

  toggleAudioPanel(): void {
    this._audioPanelVisible = !this._audioPanelVisible;
    this._audioPanel.style.display = this._audioPanelVisible ? "block" : "none";
    playUIClick();
  }

  private _buildAudioPanel(): void {
    this._audioPanel = document.createElement("div");
    this._audioPanel.style.cssText = `
      position: absolute; bottom: 340px; left: 8px; width: 160px;
      background: rgba(16,16,42,0.92); border-radius: 6px; padding: 10px;
      pointer-events: auto; font-size: 11px; display: none;
      border: 1px solid rgba(255,255,255,0.15);
    `;

    const titleRow = document.createElement("div");
    titleRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";
    const title = document.createElement("span");
    title.style.cssText = "color: #ffd700; font-size: 12px;";
    title.textContent = "Audio";

    this._muteBtn = document.createElement("button");
    this._muteBtn.style.cssText = `
      padding: 2px 8px; background: #2a2a4a; color: #e0d8c8; border: 1px solid #555;
      border-radius: 3px; cursor: pointer; font-family: monospace; font-size: 11px;
    `;
    this._muteBtn.textContent = isMuted() ? "Unmute" : "Mute";
    this._muteBtn.onclick = () => {
      const nowMuted = toggleMute();
      this._muteBtn.textContent = nowMuted ? "Unmute" : "Mute";
      this._muteBtn.style.background = nowMuted ? "#4a2a2a" : "#2a2a4a";
    };

    titleRow.appendChild(title);
    titleRow.appendChild(this._muteBtn);
    this._audioPanel.appendChild(titleRow);

    this._createVolumeSlider("Master", getMasterVolume(), (v) => {
      setMasterVolume(v);
    });
    this._createVolumeSlider("SFX", getSfxVolume(), (v) => {
      setSfxVolume(v);
    });
    this._createVolumeSlider("Music", getMusicVolume(), (v) => {
      setMusicVolume(v);
    });

    this._root.appendChild(this._audioPanel);
  }

  private _createVolumeSlider(label: string, initialValue: number, onChange: (v: number) => void): void {
    const row = document.createElement("div");
    row.style.cssText = "margin-bottom: 6px;";

    const lbl = document.createElement("div");
    lbl.style.cssText = "color: #aaa; font-size: 10px; margin-bottom: 2px;";
    lbl.textContent = label;
    row.appendChild(lbl);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.value = String(Math.round(initialValue * 100));
    slider.style.cssText = `
      width: 100%; height: 12px; cursor: pointer;
      accent-color: #6688aa; background: #333;
    `;
    slider.oninput = () => {
      onChange(parseInt(slider.value) / 100);
    };
    row.appendChild(slider);

    this._audioPanel.appendChild(row);
  }

  // -----------------------------------------------------------------------
  // Skirmish Settings Overlay
  // -----------------------------------------------------------------------

  private _buildSkirmishOverlay(): void {
    this._skirmishOverlay = document.createElement("div");
    this._skirmishOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(ellipse at center, rgba(16,14,40,0.98) 0%, rgba(0,0,0,0.97) 100%);
      display: flex; align-items: center; justify-content: center; flex-direction: column;
      pointer-events: auto; z-index: 50;
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      background: linear-gradient(135deg, rgba(28,24,58,0.98), rgba(18,15,40,0.98));
      border: 1px solid rgba(180,160,100,0.35); border-radius: 12px;
      padding: 28px 36px; min-width: 380px; max-width: 440px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.7);
    `;

    panel.innerHTML = `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:28px;color:#ffd700;text-shadow:0 0 12px rgba(255,215,0,0.3);letter-spacing:2px;font-weight:bold;">SETTLERS</div>
        <div style="font-size:14px;color:#998866;margin-top:4px;">Skirmish Setup</div>
      </div>

      <div style="margin-bottom:14px;">
        <label style="color:#aaddff;font-size:12px;display:block;margin-bottom:4px;">Map Size</label>
        <select id="skirmish-map-size" style="width:100%;padding:6px 10px;background:#1a1838;color:#e0d8c8;border:1px solid rgba(180,160,100,0.3);border-radius:5px;font-size:13px;font-family:inherit;cursor:pointer;">
          <option value="small">Small (48 x 48)</option>
          <option value="normal" selected>Normal (64 x 64)</option>
          <option value="large">Large (96 x 96)</option>
        </select>
      </div>

      <div style="margin-bottom:14px;">
        <label style="color:#aaddff;font-size:12px;display:block;margin-bottom:4px;">Difficulty</label>
        <select id="skirmish-difficulty" style="width:100%;padding:6px 10px;background:#1a1838;color:#e0d8c8;border:1px solid rgba(180,160,100,0.3);border-radius:5px;font-size:13px;font-family:inherit;cursor:pointer;">
          <option value="easy">Easy</option>
          <option value="normal" selected>Normal</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <div style="margin-bottom:14px;">
        <label style="color:#aaddff;font-size:12px;display:block;margin-bottom:4px;">Starting Resources</label>
        <select id="skirmish-resources" style="width:100%;padding:6px 10px;background:#1a1838;color:#e0d8c8;border:1px solid rgba(180,160,100,0.3);border-radius:5px;font-size:13px;font-family:inherit;cursor:pointer;">
          <option value="low">Low</option>
          <option value="normal" selected>Normal</option>
          <option value="high">High</option>
        </select>
      </div>

      <div style="margin-bottom:20px;">
        <label style="color:#aaddff;font-size:12px;display:block;margin-bottom:4px;">Win Condition</label>
        <select id="skirmish-win" style="width:100%;padding:6px 10px;background:#1a1838;color:#e0d8c8;border:1px solid rgba(180,160,100,0.3);border-radius:5px;font-size:13px;font-family:inherit;cursor:pointer;">
          <option value="military">Military Only (destroy enemy HQ)</option>
          <option value="economic">Economic Only (50 gold)</option>
          <option value="both" selected>Both (military or economic)</option>
        </select>
      </div>

      <button id="skirmish-start-btn" style="
        width:100%;padding:12px;font-size:18px;font-family:inherit;
        background:linear-gradient(180deg, #3a5a2a, #2a4a1a);color:#ccffaa;
        border:1px solid rgba(120,180,80,0.5);border-radius:8px;cursor:pointer;
        letter-spacing:1px;font-weight:bold;transition:all 0.2s;
        text-shadow:0 1px 3px rgba(0,0,0,0.5);
      ">Start Game</button>
    `;

    this._skirmishOverlay.appendChild(panel);
    this._root.appendChild(this._skirmishOverlay);

    // Wire up start button
    const startBtn = panel.querySelector("#skirmish-start-btn") as HTMLButtonElement;
    startBtn.onmouseenter = () => { startBtn.style.background = "linear-gradient(180deg, #4a7a3a, #3a6a2a)"; };
    startBtn.onmouseleave = () => { startBtn.style.background = "linear-gradient(180deg, #3a5a2a, #2a4a1a)"; };
    startBtn.onclick = () => {
      const mapSize = (panel.querySelector("#skirmish-map-size") as HTMLSelectElement).value as SettlersSkirmishSettings["mapSize"];
      const difficulty = (panel.querySelector("#skirmish-difficulty") as HTMLSelectElement).value as SettlersSkirmishSettings["difficulty"];
      const startingResources = (panel.querySelector("#skirmish-resources") as HTMLSelectElement).value as SettlersSkirmishSettings["startingResources"];
      const winCondition = (panel.querySelector("#skirmish-win") as HTMLSelectElement).value as SettlersSkirmishSettings["winCondition"];
      this._skirmishOverlay.style.display = "none";
      this.onStartGame?.({ mapSize, difficulty, startingResources, winCondition });
      playUIClick();
    };
  }

  /** Show the skirmish overlay (called before game starts) */
  showSkirmishSettings(): void {
    this._skirmishOverlay.style.display = "flex";
  }

  /** Hide the skirmish overlay */
  hideSkirmishSettings(): void {
    this._skirmishOverlay.style.display = "none";
  }

  // -----------------------------------------------------------------------
  // Production Chains Panel
  // -----------------------------------------------------------------------

  toggleChainsPanel(): void {
    this._chainsPanelVisible = !this._chainsPanelVisible;
    this._chainsPanel.style.display = this._chainsPanelVisible ? "block" : "none";
    if (this._chainsPanelVisible && this._wikiVisible) {
      this._wikiVisible = false;
      this._wikiPanel.style.display = "none";
    }
    playUIClick();
  }

  private _updateChainsPanel(state: SettlersState): void {
    if (!this._chainsPanelVisible) return;

    // Gather production stats per building type for the player
    const typeStats = new Map<SettlersBuildingType, { count: number; active: number; producing: number }>();

    for (const [, building] of state.buildings) {
      if (building.owner !== "p0") continue;
      const def = BUILDING_DEFS[building.type];
      if (def.productionTime <= 0) continue;

      let entry = typeStats.get(building.type);
      if (!entry) { entry = { count: 0, active: 0, producing: 0 }; typeStats.set(building.type, entry); }
      entry.count++;
      if (building.active && building.constructionProgress >= 1) {
        entry.active++;
        // Check if it's actually producing (has inputs or no inputs needed)
        const hasInputs = def.inputs.length === 0 || building.inputStorage.some(s => s.amount > 0);
        if (hasInputs) entry.producing++;
      }
    }

    if (typeStats.size === 0) {
      this._chainsPanel.innerHTML = `
        <div style="font-size:14px;color:#ffd700;margin-bottom:8px;">Active Production Chains</div>
        <div style="color:#888;font-style:italic;">No production buildings yet.</div>
        <div style="margin-top:8px;color:#666;font-size:10px;">Build economy buildings to see production chain stats here.</div>
      `;
      return;
    }

    let html = `<div style="font-size:14px;color:#ffd700;margin-bottom:10px;">Active Production Chains</div>`;

    // Group by chain relationship
    const chainGroups: { name: string; types: SettlersBuildingType[] }[] = [
      { name: "Wood/Construction", types: [SettlersBuildingType.WOODCUTTER, SettlersBuildingType.SAWMILL, SettlersBuildingType.QUARRY] },
      { name: "Food", types: [SettlersBuildingType.FISHER, SettlersBuildingType.HUNTER, SettlersBuildingType.FARM, SettlersBuildingType.MILL, SettlersBuildingType.BAKERY] },
      { name: "Beer", types: [SettlersBuildingType.BREWERY] },
      { name: "Iron", types: [SettlersBuildingType.IRON_MINE, SettlersBuildingType.COAL_MINE, SettlersBuildingType.SMELTER] },
      { name: "Gold", types: [SettlersBuildingType.GOLD_MINE, SettlersBuildingType.MINT] },
      { name: "Military", types: [SettlersBuildingType.SWORD_SMITH, SettlersBuildingType.SHIELD_SMITH, SettlersBuildingType.BARRACKS] },
    ];

    for (const group of chainGroups) {
      const activeTypes = group.types.filter(t => typeStats.has(t));
      if (activeTypes.length === 0) continue;

      html += `<div style="color:#aaddff;font-weight:bold;margin-top:8px;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:3px;">${group.name}</div>`;

      for (const bType of activeTypes) {
        const stats = typeStats.get(bType)!;
        const def = BUILDING_DEFS[bType];
        const outputPerMin = def.productionTime > 0 ? (stats.producing * 60 / def.productionTime).toFixed(1) : "0";
        const inputPerMin = def.inputs.length > 0 && def.productionTime > 0
          ? (stats.producing * 60 / def.productionTime).toFixed(1) : "-";

        // Detect bottleneck: more consumers than producers for the needed resource
        let isBottleneck = false;
        if (def.inputs.length > 0 && stats.active > 0 && stats.producing < stats.active) {
          isBottleneck = true;
        }

        const statusColor = isBottleneck ? "#ff6644" : stats.producing > 0 ? "#88cc44" : "#888";
        const bgColor = isBottleneck ? "rgba(180,60,40,0.15)" : "transparent";

        html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;margin:1px 0;border-radius:4px;background:${bgColor};">`;
        html += `<div style="flex:1;">`;
        html += `<span style="color:#d0c8b0;">${def.label}</span>`;
        html += `<span style="color:#777;font-size:10px;"> x${stats.count}</span>`;
        if (stats.producing < stats.active) {
          html += `<span style="color:#ff8844;font-size:10px;"> (${stats.active - stats.producing} idle)</span>`;
        }
        html += `</div>`;
        html += `<div style="text-align:right;font-size:10px;">`;
        if (def.outputs.length > 0) {
          html += `<span style="color:${statusColor};">${outputPerMin}/min</span>`;
        }
        if (def.inputs.length > 0) {
          html += `<span style="color:#999;margin-left:6px;">needs ${inputPerMin}/min</span>`;
        }
        html += `</div></div>`;

        // Show flow arrows for inputs/outputs
        if (isBottleneck) {
          const missing = def.inputs
            .map(i => RESOURCE_META[i.type].label)
            .join(", ");
          html += `<div style="color:#ff6644;font-size:10px;padding-left:12px;margin-bottom:2px;">Bottleneck: waiting for ${missing}</div>`;
        }
      }

      // Draw simple flow arrows between related building types
      if (activeTypes.length > 1) {
        const flowParts: string[] = [];
        for (const bType of activeTypes) {
          const def = BUILDING_DEFS[bType];
          const outputNames = def.outputs.map(o => RESOURCE_META[o.type].label);
          if (outputNames.length > 0) {
            flowParts.push(`${def.label} -> ${outputNames.join(", ")}`);
          }
        }
        if (flowParts.length > 0) {
          html += `<div style="color:#666;font-size:9px;padding-left:8px;margin-top:2px;">Flow: ${flowParts.join(" -> ")}</div>`;
        }
      }
    }

    html += `<div style="margin-top:10px;color:#666;font-size:10px;">Red = bottleneck (consumption > production)</div>`;
    this._chainsPanel.innerHTML = html;
  }

  // -----------------------------------------------------------------------
  // Bottleneck Warnings
  // -----------------------------------------------------------------------

  private _updateBottleneckWarnings(state: SettlersState): void {
    const dt = 1 / 60; // approximate frame dt

    for (const [id, building] of state.buildings) {
      if (building.owner !== "p0") continue;
      if (!building.active || building.constructionProgress < 1) continue;

      const def = BUILDING_DEFS[building.type];
      if (def.productionTime <= 0) continue;
      if (def.type === SettlersBuildingType.BARRACKS) continue;

      // Check if building is idle (has inputs required but none available)
      if (def.inputs.length > 0) {
        let hasAllInputs = true;
        let missingResource: string | null = null;
        for (const input of def.inputs) {
          const isMine = def.type === SettlersBuildingType.IRON_MINE ||
                         def.type === SettlersBuildingType.GOLD_MINE ||
                         def.type === SettlersBuildingType.COAL_MINE;
          if (isMine && FOOD_TYPES.has(input.type)) {
            const hasFood = building.inputStorage.some(
              (s) => FOOD_TYPES.has(s.type) && s.amount >= input.amount,
            );
            if (!hasFood) { hasAllInputs = false; missingResource = "food"; }
          } else {
            const stored = building.inputStorage.find((s) => s.type === input.type);
            if (!stored || stored.amount < input.amount) {
              hasAllInputs = false;
              missingResource = RESOURCE_META[input.type].label;
            }
          }
        }

        let info = state.bottlenecks.get(id);
        if (!info) {
          info = { idleSeconds: 0, warned: false, missingResource: null };
          state.bottlenecks.set(id, info);
        }

        if (!hasAllInputs) {
          info.idleSeconds += dt;
          info.missingResource = missingResource;

          if (info.idleSeconds >= SB.BOTTLENECK_IDLE_THRESHOLD && !info.warned) {
            info.warned = true;
            this.showToast(`Your ${def.label} has been idle - missing ${missingResource}!`, true);
          }
        } else {
          // Building is producing - reset
          if (info.warned) {
            info.warned = false;
          }
          info.idleSeconds = 0;
          info.missingResource = null;
        }
      }
    }

    // Check flag capacity warnings
    for (const [, building] of state.buildings) {
      if (building.owner !== "p0") continue;
      const flag = state.flags.get(building.flagId);
      if (!flag) continue;

      if (flag.inventory.length >= SB.FLAG_NEAR_FULL_THRESHOLD) {
        if (!state.flagWarnings.has(flag.id)) {
          state.flagWarnings.add(flag.id);
          const def = BUILDING_DEFS[building.type];
          this.showToast(`Flag near ${def.label} is almost full!`, true);
        }
      } else if (flag.inventory.length < SB.FLAG_NEAR_FULL_THRESHOLD - 2) {
        // Reset warning when flag empties a bit
        state.flagWarnings.delete(flag.id);
      }
    }

    // Clean up bottleneck entries for demolished buildings
    for (const [id] of state.bottlenecks) {
      if (!state.buildings.has(id)) {
        state.bottlenecks.delete(id);
      }
    }
  }

  private _buildBuildMenu(): void {
    // Tool buttons
    const tools: { tool: SettlersTool; label: string; key: string }[] = [
      { tool: "select", label: "Select", key: "ESC" },
      { tool: "road", label: "Road", key: "R" },
      { tool: "flag", label: "Flag", key: "F" },
      { tool: "demolish", label: "Demolish", key: "X" },
      { tool: "attack", label: "Attack", key: "T" },
    ];

    for (const t of tools) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        padding: 5px 12px; background: linear-gradient(180deg, #35305a, #2a2548);
        color: #e0d8c8; border: 1px solid rgba(180,160,100,0.3);
        border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 12px;
        font-weight: 500; transition: all 0.15s; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      `;
      btn.textContent = `[${t.key}] ${t.label}`;
      btn.onmouseenter = () => { btn.style.background = "linear-gradient(180deg, #4a4570, #3a3560)"; btn.style.borderColor = "rgba(200,180,120,0.5)"; };
      btn.onmouseleave = () => { btn.style.background = "linear-gradient(180deg, #35305a, #2a2548)"; btn.style.borderColor = "rgba(180,160,100,0.3)"; };
      btn.onclick = () => this.onSelectTool?.(t.tool);
      this._buildMenu.appendChild(btn);
    }

    // Save/Load/Wiki/Chains buttons
    const utilBtns: { label: string; action: () => void }[] = [
      { label: "[F5] Save", action: () => this.onSave?.() },
      { label: "[F9] Load", action: () => this.onLoad?.() },
      { label: "[H] Wiki", action: () => this.toggleWiki() },
      { label: "Chains", action: () => this.toggleChainsPanel() },
      { label: "[M] Audio", action: () => this.toggleAudioPanel() },
    ];
    for (const u of utilBtns) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        padding: 5px 12px; background: linear-gradient(180deg, #3a2850, #2e2045);
        color: #d0c8e8; border: 1px solid rgba(160,120,200,0.3);
        border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 12px;
        font-weight: 500; transition: all 0.15s; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      `;
      btn.onmouseenter = () => { btn.style.background = "linear-gradient(180deg, #4a3868, #3a2e58)"; btn.style.borderColor = "rgba(180,140,220,0.5)"; };
      btn.onmouseleave = () => { btn.style.background = "linear-gradient(180deg, #3a2850, #2e2045)"; btn.style.borderColor = "rgba(160,120,200,0.3)"; };
      btn.textContent = u.label;
      btn.onclick = u.action;
      this._buildMenu.appendChild(btn);
    }

    // Separator
    const sep = document.createElement("div");
    sep.style.cssText = "width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(180,160,100,0.3), transparent); margin: 5px 0;";
    this._buildMenu.appendChild(sep);

    // Building buttons by category
    const categories = ["economy", "military", "infrastructure"] as const;
    for (const cat of categories) {
      const catLabel = document.createElement("span");
      catLabel.style.cssText = "color: rgba(180,160,100,0.7); font-size: 10px; margin-right: 6px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;";
      catLabel.textContent = cat;
      this._buildMenu.appendChild(catLabel);

      for (const def of Object.values(BUILDING_DEFS)) {
        if (def.category !== cat) continue;
        if (def.type === SettlersBuildingType.HEADQUARTERS) continue;

        const btn = document.createElement("button");
        const catColors: Record<string, string[]> = {
          economy: ["#1a3a28", "#254535", "rgba(80,160,100,0.3)", "#c0d8b0"],
          military: ["#3a1a1a", "#452525", "rgba(180,80,80,0.3)", "#e0b8b8"],
          infrastructure: ["#1a2a3a", "#253540", "rgba(80,120,180,0.3)", "#b8c8e0"],
        };
        const cc = catColors[cat] || catColors.economy;
        btn.style.cssText = `
          padding: 4px 10px; background: linear-gradient(180deg, ${cc[1]}, ${cc[0]});
          color: ${cc[3]}; border: 1px solid ${cc[2]};
          border-radius: 5px; cursor: pointer; font-family: inherit; font-size: 11px;
          font-weight: 500; transition: all 0.15s; text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        `;
        btn.textContent = def.label;
        btn.onclick = () => {
          this.onSelectBuildingType?.(def.type);
          this.onSelectTool?.("build");
        };
        btn.onmouseenter = (e) => {
          this._tooltip.innerHTML = this._buildingTooltipHTML(def);
          this._tooltip.style.display = "block";
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          this._tooltip.style.left = `${rect.left}px`;
          this._tooltip.style.top = `${rect.top - this._tooltip.offsetHeight - 6}px`;
        };
        btn.onmouseleave = () => {
          this._tooltip.style.display = "none";
        };
        this._buildMenu.appendChild(btn);
      }
    }
  }

  private _buildingTooltipHTML(def: (typeof BUILDING_DEFS)[SettlersBuildingType]): string {
    let html = `<div style="font-size:13px;color:#ffd700;margin-bottom:4px;font-weight:bold;">${def.label}</div>`;
    html += `<div style="color:#aaa;margin-bottom:4px;">Size: ${def.size} (${def.footprint.w}x${def.footprint.h})</div>`;

    if (def.constructionCost.length > 0) {
      html += `<div style="color:#ff9966;">Cost: ${def.constructionCost.map((c) => `${c.amount} ${RESOURCE_META[c.type].label}`).join(", ")}</div>`;
    }
    if (def.requiresTerrain) {
      html += `<div style="color:#cc88ff;">Requires: ${def.requiresTerrain} terrain</div>`;
    }

    if (def.inputs.length > 0 || def.outputs.length > 0) {
      html += `<div style="margin-top:4px;border-top:1px solid #444;padding-top:4px;">`;
      if (def.inputs.length > 0) {
        html += `<div style="color:#aaddff;">Consumes: ${def.inputs.map((i) => `${i.amount} ${RESOURCE_META[i.type].label}`).join(", ")}</div>`;
      }
      if (def.outputs.length > 0) {
        html += `<div style="color:#aaffaa;">Produces: ${def.outputs.map((o) => `${o.amount} ${RESOURCE_META[o.type].label}`).join(", ")}</div>`;
      }
      if (def.productionTime > 0) {
        html += `<div style="color:#888;">Cycle: ${def.productionTime}s</div>`;
      }
      html += `</div>`;
    }

    if (def.garrisonSlots > 0) {
      html += `<div style="color:#ff8888;margin-top:2px;">Garrison: ${def.garrisonSlots} soldiers</div>`;
    }
    if (def.territoryRadius > 0) {
      html += `<div style="color:#88ccff;">Territory: ${def.territoryRadius} tiles</div>`;
    }

    // Description based on category
    const descriptions: Partial<Record<SettlersBuildingType, string>> = {
      [SettlersBuildingType.WOODCUTTER]: "Harvests wood from nearby forest tiles.",
      [SettlersBuildingType.SAWMILL]: "Processes raw wood into planks for construction.",
      [SettlersBuildingType.QUARRY]: "Extracts stone from mountain terrain.",
      [SettlersBuildingType.FISHER]: "Catches fish from nearby water tiles.",
      [SettlersBuildingType.HUNTER]: "Hunts game in forests for meat.",
      [SettlersBuildingType.FARM]: "Grows wheat on meadow terrain.",
      [SettlersBuildingType.MILL]: "Grinds wheat into flour.",
      [SettlersBuildingType.BAKERY]: "Bakes bread from flour and water.",
      [SettlersBuildingType.BREWERY]: "Brews beer from wheat and water.",
      [SettlersBuildingType.IRON_MINE]: "Mines iron ore from mountains. Requires food.",
      [SettlersBuildingType.GOLD_MINE]: "Mines gold ore from mountains. Requires food.",
      [SettlersBuildingType.COAL_MINE]: "Mines coal from mountains. Requires food.",
      [SettlersBuildingType.SMELTER]: "Smelts iron ore with coal into iron bars.",
      [SettlersBuildingType.MINT]: "Refines gold ore with coal into gold coins.",
      [SettlersBuildingType.SWORD_SMITH]: "Forges swords from iron and coal.",
      [SettlersBuildingType.SHIELD_SMITH]: "Crafts shields from iron and coal.",
      [SettlersBuildingType.BARRACKS]: "Trains soldiers using sword, shield, and beer.",
      [SettlersBuildingType.BOWYER]: "Crafts bows from planks and iron.",
      [SettlersBuildingType.ARCHERY_RANGE]: "Trains archers using bow and beer. Ranged unit.",
      [SettlersBuildingType.STABLE]: "Trains knights. Fast, powerful mounted units.",
      [SettlersBuildingType.GUARD_HOUSE]: "Small military outpost. Extends territory.",
      [SettlersBuildingType.WATCHTOWER]: "Medium military building. Good territory range.",
      [SettlersBuildingType.FORTRESS]: "Large military stronghold. Maximum territory.",
      [SettlersBuildingType.WALL]: "Stone wall. Blocks enemy movement. Cheap to build.",
      [SettlersBuildingType.GATE]: "Gate passage. Allies pass through, enemies blocked.",
      [SettlersBuildingType.CATAPULT_TOWER]: "Ranged tower. Garrison soldiers to deal AOE damage.",
      [SettlersBuildingType.STOREHOUSE]: "Additional storage for your settlement.",
    };
    const desc = descriptions[def.type];
    if (desc) {
      html += `<div style="color:#bbb;margin-top:4px;font-style:italic;border-top:1px solid #333;padding-top:4px;">${desc}</div>`;
    }

    return html;
  }

  update(state: SettlersState): void {
    // Resource bar
    const player = state.players.get("p0");
    if (player) {
      let html = "";
      const show: ResourceType[] = [
        ResourceType.WOOD, ResourceType.PLANKS, ResourceType.STONE,
        ResourceType.IRON_ORE, ResourceType.IRON, ResourceType.COAL,
        ResourceType.GOLD_ORE, ResourceType.GOLD,
        ResourceType.WHEAT, ResourceType.FLOUR, ResourceType.BREAD,
        ResourceType.FISH, ResourceType.MEAT, ResourceType.BEER,
        ResourceType.SWORD, ResourceType.SHIELD, ResourceType.BOW,
      ];
      for (const r of show) {
        const count = player.storage.get(r) || 0;
        if (count > 0 || r === ResourceType.PLANKS || r === ResourceType.STONE || r === ResourceType.WOOD) {
          const meta = RESOURCE_META[r];
          const hexColor = "#" + meta.color.toString(16).padStart(6, "0");
          html += `<span style="color:${hexColor}">${meta.label}:${count}</span> `;
        }
      }
      // Count total workers: idle + assigned (walking or working)
      let assignedWorkers = 0;
      for (const [, w] of state.workers) {
        if (w.owner === player.id) assignedWorkers++;
      }
      const totalWorkers = player.availableWorkers + assignedWorkers;
      html += `<span style="color:#88aacc">Workers:${player.availableWorkers} idle / ${totalWorkers} total</span>`;
      html += ` <span style="color:#cc8888">Soldiers:${player.freeSoldiers}</span>`;
      const score = calculateScore(state, "p0");
      html += ` <span style="color:#ffd700">Score:${score}</span>`;
      // Gold victory progress
      const gold = player.storage.get(ResourceType.GOLD) || 0;
      if (gold > 0) html += ` <span style="color:#ffa500">Gold Victory:${gold}/50</span>`;
      this._resourceBar.innerHTML = html;
    }

    // AI personality indicator
    const aiPlayer = state.players.get("p1");
    if (aiPlayer && aiPlayer.isAI && aiPlayer.aiPersonality) {
      if (aiPlayer.aiPersonalityRevealed) {
        this._aiPersonalityIndicator.style.display = "block";
        const pLabel = AI_PERSONALITY_LABELS[aiPlayer.aiPersonality];
        const pDesc = AI_PERSONALITY_DESCRIPTIONS[aiPlayer.aiPersonality];
        const personalityColors: Record<string, string> = {
          balanced: "#aabbcc",
          rusher: "#ff6644",
          turtle: "#44aa88",
          economist: "#ffcc44",
          expansionist: "#aa66ff",
        };
        const pColor = personalityColors[aiPlayer.aiPersonality] || "#cc8888";
        this._aiPersonalityIndicator.innerHTML =
          `<span style="color:#999;font-size:10px;">Enemy AI:</span> ` +
          `<span style="color:${pColor};font-weight:bold;">${pLabel}</span>`;
        this._aiPersonalityIndicator.title = pDesc;
      } else {
        this._aiPersonalityIndicator.style.display = "block";
        this._aiPersonalityIndicator.innerHTML =
          `<span style="color:#999;font-size:10px;">Enemy AI:</span> ` +
          `<span style="color:#666;font-style:italic;">Unknown</span>`;
        this._aiPersonalityIndicator.title = "AI personality will be revealed after first contact or 5 minutes.";
      }
    }

    // Tool indicator
    const speedLabel = state.gameSpeed !== 1 ? ` | Speed: ${Math.round(state.gameSpeed * 100)}%` : "";
    const mapModeLabel = ` | Map: ${state.mapMode}`;
    const eventCount = state.eventState ? state.eventState.events.length : 0;
    const eventLabel = eventCount > 0 ? ` | Events: ${eventCount}` : "";
    this._toolIndicator.textContent = `Tool: ${state.selectedTool.toUpperCase()}${
      state.selectedBuildingType ? " - " + BUILDING_DEFS[state.selectedBuildingType].label : ""
    }${speedLabel}${mapModeLabel}${eventLabel}`;

    // Pause
    this._pauseOverlay.style.display = state.paused ? "block" : "none";

    // Notification fade
    if (this._notificationTimer > 0) {
      this._notificationTimer -= 1 / 60;
      if (this._notificationTimer <= 0.5) {
        this._notification.style.opacity = String(this._notificationTimer / 0.5);
      }
      if (this._notificationTimer <= 0) {
        this._notification.style.display = "none";
      }
    }

    // Toast fade
    if (this._toastTimer > 0) {
      this._toastTimer -= 1 / 60;
      if (this._toastTimer <= 0.5) {
        this._toast.style.opacity = String(Math.max(0, this._toastTimer / 0.5));
      }
      if (this._toastTimer <= 0) {
        this._toast.style.display = "none";
      }
    }

    // Game over
    if (state.gameOver && !this._gameOverShown) {
      this._gameOverShown = true;
      this._gameOverOverlay.style.display = "flex";
      const isVictory = state.winner === "p0";
      const p0Score = calculateScore(state, "p0");
      const p1Score = calculateScore(state, "p1");
      // Determine victory type
      const p0Gold = state.players.get("p0")?.storage.get(ResourceType.GOLD) || 0;
      const p1Gold = state.players.get("p1")?.storage.get(ResourceType.GOLD) || 0;
      let victoryType = "Conquest";
      if (p0Gold >= 50 || p1Gold >= 50) victoryType = "Economic";
      // Check territory
      const map = state.map;
      let p0Territory = 0;
      let p1Territory = 0;
      let buildable = 0;
      for (let i = 0; i < map.width * map.height; i++) {
        if (map.buildable[i] === 0) continue;
        buildable++;
        if (map.territory[i] === 0) p0Territory++;
        else if (map.territory[i] === 1) p1Territory++;
      }
      if (buildable > 0 && (p0Territory / buildable > 0.7 || p1Territory / buildable > 0.7)) victoryType = "Dominance";

      // Count buildings
      let p0Buildings = 0, p1Buildings = 0;
      for (const [, b] of state.buildings) {
        if (b.owner === "p0") p0Buildings++;
        else p1Buildings++;
      }

      // Count soldiers
      let p0Soldiers = 0, p1Soldiers = 0;
      for (const [, s] of state.soldiers) {
        if (s.owner === "p0") p0Soldiers++;
        else p1Soldiers++;
      }

      const overlayBg = isVictory
        ? "radial-gradient(ellipse at center, rgba(40,50,20,0.95) 0%, rgba(0,0,0,0.92) 100%)"
        : "radial-gradient(ellipse at center, rgba(60,10,10,0.95) 0%, rgba(0,0,0,0.92) 100%)";

      this._gameOverOverlay.style.background = overlayBg;

      this._gameOverOverlay.innerHTML = `
        <div style="text-align:center; animation: fadeIn 0.5s ease-out;">
          <div style="font-size: 56px; color: ${isVictory ? "#ffd700" : "#ff4444"}; text-shadow: 0 0 20px ${isVictory ? "rgba(255,215,0,0.5)" : "rgba(255,0,0,0.4)"}, 2px 2px 8px #000; letter-spacing: 4px;">
            ${isVictory ? "VICTORY!" : "DEFEAT"}
          </div>
          <div style="font-size: 20px; color: ${isVictory ? "#aaddaa" : "#ddaaaa"}; margin-top: 8px; letter-spacing: 2px;">
            ${victoryType} ${isVictory ? "Victory" : "- The enemy has won"}
          </div>

          <div style="margin-top: 24px; padding: 16px 24px; background: rgba(0,0,0,0.4); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: inline-block;">
            <div style="font-size: 16px; color: #ffd700; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px;">Game Summary</div>
            <table style="color: #ccc; font-size: 14px; border-collapse: collapse; text-align: left;">
              <tr><td style="padding: 3px 16px 3px 0; color: #888;">Score</td><td style="padding: 3px 8px; color: #88bbff;">${p0Score}</td><td style="padding: 3px 8px; color: #ff8888;">${p1Score}</td></tr>
              <tr><td style="padding: 3px 16px 3px 0; color: #888;">Buildings</td><td style="padding: 3px 8px; color: #88bbff;">${p0Buildings}</td><td style="padding: 3px 8px; color: #ff8888;">${p1Buildings}</td></tr>
              <tr><td style="padding: 3px 16px 3px 0; color: #888;">Soldiers</td><td style="padding: 3px 8px; color: #88bbff;">${p0Soldiers}</td><td style="padding: 3px 8px; color: #ff8888;">${p1Soldiers}</td></tr>
              <tr><td style="padding: 3px 16px 3px 0; color: #888;">Gold</td><td style="padding: 3px 8px; color: #88bbff;">${p0Gold}</td><td style="padding: 3px 8px; color: #ff8888;">${p1Gold}</td></tr>
            </table>
            <div style="margin-top: 6px; font-size: 11px; color: #666;">
              <span style="color: #88bbff;">You</span> vs <span style="color: #ff8888;">Enemy${
                aiPlayer?.aiPersonality ? ` (${AI_PERSONALITY_LABELS[aiPlayer.aiPersonality]})` : ""
              }</span>
            </div>
          </div>

          <div style="margin-top: 24px;">
            <button id="settlers-exit-btn" style="
              padding: 12px 40px; font-size: 18px; font-family: monospace;
              background: linear-gradient(180deg, #3a3a6a, #2a2a4a); color: #e0d8c8;
              border: 1px solid #666; border-radius: 8px; cursor: pointer;
              letter-spacing: 1px; transition: background 0.2s;
            " onmouseover="this.style.background='linear-gradient(180deg, #4a4a8a, #3a3a6a)'"
              onmouseout="this.style.background='linear-gradient(180deg, #3a3a6a, #2a2a4a)'">
              Return to Menu
            </button>
          </div>
        </div>
      `;
      const exitBtn = document.getElementById("settlers-exit-btn");
      if (exitBtn) exitBtn.onclick = () => this.onExit?.();
    }

    // Info panel for selected building
    this._updateInfoPanel(state);

    // Minimap (every 15 ticks to save perf)
    if (state.tick % 15 === 0) {
      this._updateMinimap(state);
    }

    // Bottleneck warnings (every 60 ticks ~ 1 second)
    if (state.tick % 60 === 0 && !state.paused && !state.gameOver) {
      this._updateBottleneckWarnings(state);
    }

    // Production chains panel (every 30 ticks)
    if (state.tick % 30 === 0) {
      this._updateChainsPanel(state);
    }
  }

  private _updateInfoPanel(state: SettlersState): void {
    if (state.selectedBuildingId) {
      const building = state.buildings.get(state.selectedBuildingId);
      if (building) {
        this._infoPanel.style.display = "block";
        const def = BUILDING_DEFS[building.type];
        const ownerPlayer = state.players.get(building.owner);
        const ownerName = ownerPlayer ? ownerPlayer.name : building.owner;
        const ownerColor = building.owner === "p0" ? "#88bbff" : "#ff8888";

        const levelStr = building.level > 1 ? ` (Lvl ${building.level})` : "";
        const starStr = building.level > 1 ? " " + "\u2605".repeat(building.level - 1) : "";
        let html = `<div style="font-size:14px;color:#ffd700;margin-bottom:2px;font-weight:bold;">${def.label}${levelStr}<span style="color:#ffaa00;">${starStr}</span></div>`;
        html += `<div style="font-size:11px;color:${ownerColor};margin-bottom:6px;">Owner: ${ownerName}</div>`;

        // HP bar
        const hpPct = Math.max(0, building.hp / building.maxHp);
        const hpColor = hpPct > 0.5 ? "#4a4" : hpPct > 0.25 ? "#aa4" : "#a44";
        html += `<div style="margin-bottom:2px;font-size:11px;">HP: ${building.hp}/${building.maxHp}</div>`;
        html += `<div style="background:#333;height:6px;border-radius:3px;margin-bottom:6px;">
          <div style="width:${hpPct * 100}%;height:100%;background:${hpColor};border-radius:3px;"></div></div>`;

        if (building.constructionProgress < 1) {
          // --- Under construction ---
          const pct = Math.floor(building.constructionProgress * 100);
          html += `<div style="color:#4488cc;font-weight:bold;">Under Construction</div>`;
          html += `<div style="font-size:11px;">Progress: ${pct}%</div>`;
          html += `<div style="background:#333;height:6px;border-radius:3px;margin:4px 0;">
            <div style="width:${pct}%;height:100%;background:#4488cc;border-radius:3px;"></div></div>`;
          const remaining = building.constructionNeeds.filter(n => n.amount > 0);
          if (remaining.length > 0) {
            html += `<div style="color:#ff8;font-size:11px;">Still needs: ${remaining.map((n) => `${n.amount} ${RESOURCE_META[n.type].label}`).join(", ")}</div>`;
          } else {
            html += `<div style="color:#88cc44;font-size:11px;">All materials delivered</div>`;
          }
        } else if (building.upgradeProgress > 0 && building.upgradeProgress < 1) {
          // --- Upgrading ---
          const pct = Math.floor(building.upgradeProgress * 100);
          html += `<div style="color:#cc88ff;font-weight:bold;">Upgrading to Level ${building.level + 1}</div>`;
          html += `<div style="font-size:11px;">Progress: ${pct}%</div>`;
          html += `<div style="background:#333;height:6px;border-radius:3px;margin:4px 0;">
            <div style="width:${pct}%;height:100%;background:#cc88ff;border-radius:3px;"></div></div>`;
        } else {
          // --- Completed building ---

          // Worker status (for production buildings)
          if (def.productionTime > 0) {
            const workerStatus = building.workerId ? "Assigned" : "Waiting for worker";
            const workerColor = building.workerId ? "#88cc44" : "#ff8844";
            html += `<div style="font-size:11px;margin-bottom:4px;">Worker: <span style="color:${workerColor};">${workerStatus}</span></div>`;
          }

          // Production status
          if (def.productionTime > 0) {
            let prodStatus: string;
            let prodStatusColor: string;
            const hasInputs = def.inputs.length === 0 || building.inputStorage.some(s => s.amount > 0);

            if (!building.active) {
              prodStatus = "Inactive";
              prodStatusColor = "#888";
            } else if (!hasInputs && def.inputs.length > 0) {
              prodStatus = "Waiting for materials";
              prodStatusColor = "#ff8844";
            } else {
              prodStatus = "Producing";
              prodStatusColor = "#88cc44";
            }
            html += `<div style="font-size:11px;color:${prodStatusColor};margin-bottom:4px;">Status: ${prodStatus}</div>`;

            if (def.type !== SettlersBuildingType.BARRACKS) {
              const effTime = getEffectiveProductionTime(building);
              const prodPct = Math.max(0, 1 - building.productionTimer / effTime);
              html += `<div style="font-size:11px;">Cycle: ${Math.floor(prodPct * 100)}%</div>`;
              html += `<div style="background:#333;height:4px;border-radius:2px;margin:2px 0;">
                <div style="width:${prodPct * 100}%;height:100%;background:#88cc44;border-radius:2px;"></div></div>`;
            }
          }

          // Current inventory
          if (building.inputStorage.length > 0) {
            html += `<div style="margin-top:6px;font-size:11px;color:#aaddff;border-top:1px solid #333;padding-top:4px;">`;
            html += `<span style="color:#7799bb;">Input inventory:</span><br>`;
            for (const s of building.inputStorage) {
              const needed = def.inputs.find(i => i.type === s.type);
              const neededAmt = needed ? needed.amount : 1;
              const fillColor = s.amount >= neededAmt ? "#88cc44" : s.amount > 0 ? "#cccc44" : "#cc4444";
              html += `<span style="color:${fillColor};">${RESOURCE_META[s.type].label}: ${s.amount}</span> `;
            }
            html += `</div>`;
          }
          if (building.outputStorage.length > 0) {
            html += `<div style="font-size:11px;color:#aaffaa;">`;
            html += `<span style="color:#77bb77;">Output inventory:</span><br>`;
            for (const s of building.outputStorage) {
              html += `${RESOURCE_META[s.type].label}: ${s.amount} `;
            }
            html += `</div>`;
          }

          // Garrison (military buildings)
          if (building.garrisonSlots > 0) {
            const garrisonPct = building.garrison.length / building.garrisonSlots;
            const garrisonColor = garrisonPct >= 1 ? "#88cc44" : garrisonPct > 0 ? "#cccc44" : "#cc4444";
            html += `<div style="margin-top:6px;border-top:1px solid #333;padding-top:4px;">`;
            html += `<div style="font-size:11px;">Garrison: <span style="color:${garrisonColor};">${building.garrison.length}/${building.garrisonSlots}</span></div>`;
            html += `<div style="background:#333;height:4px;border-radius:2px;margin:2px 0;">
              <div style="width:${garrisonPct * 100}%;height:100%;background:${garrisonColor};border-radius:2px;"></div></div>`;
            if (building.garrison.length > 0) {
              html += `<div style="font-size:10px;color:#aaa;">`;
              for (const sId of building.garrison) {
                const soldier = state.soldiers.get(sId);
                if (soldier) {
                  const rankStr = soldier.rank > 0 ? ` Rank ${soldier.rank}` : "";
                  html += `<div>Soldier${rankStr} (HP: ${soldier.hp}/${soldier.maxHp})</div>`;
                }
              }
              html += `</div>`;
            }
            html += `</div>`;
          }

          // Production queue display (for unit-producing buildings)
          const unitProducers: Record<string, { unitLabel: string; queueLabel: string }> = {
            [SettlersBuildingType.BARRACKS]: { unitLabel: "Soldier", queueLabel: "soldier" },
            [SettlersBuildingType.ARCHERY_RANGE]: { unitLabel: "Archer", queueLabel: "archer" },
            [SettlersBuildingType.STABLE]: { unitLabel: "Knight", queueLabel: "knight" },
          };
          const producerInfo = unitProducers[def.type];
          if (producerInfo && building.owner === "p0") {
            html += `<div style="margin-top:8px;border-top:1px solid #444;padding-top:6px;">`;
            html += `<div style="color:#ffcc44;margin-bottom:4px;">Production Queue (${building.productionQueue.length}/${SB.MAX_PRODUCTION_QUEUE})</div>`;

            if (building.productionQueue.length > 0) {
              for (let qi = 0; qi < building.productionQueue.length; qi++) {
                const item = building.productionQueue[qi];
                const isActive = qi === 0 && item.timeRemaining >= 0;
                let itemHtml = `<div style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;">`;
                itemHtml += `<span style="color:${isActive ? "#88ff88" : "#aaa"};">`;
                if (isActive) {
                  const pct = Math.floor((1 - item.timeRemaining / def.productionTime) * 100);
                  itemHtml += `${producerInfo.unitLabel} (${pct}%)`;
                } else {
                  itemHtml += `${producerInfo.unitLabel} (queued)`;
                }
                itemHtml += `</span>`;
                // Cancel button (cannot cancel active item)
                if (!isActive) {
                  itemHtml += `<button class="settlers-queue-cancel" data-qi="${qi}" style="
                    background:#5a2222;color:#ff8888;border:1px solid #883333;border-radius:3px;
                    cursor:pointer;font-family:monospace;font-size:10px;padding:1px 6px;
                  ">X</button>`;
                }
                itemHtml += `</div>`;
                html += itemHtml;
              }
            } else {
              html += `<div style="color:#666;font-style:italic;">Empty - click Train to add</div>`;
            }

            // Add to queue button
            if (building.productionQueue.length < SB.MAX_PRODUCTION_QUEUE) {
              html += `<button id="settlers-queue-add" style="
                margin-top:4px;width:100%;padding:4px 8px;background:#2a4a2a;color:#88cc88;
                border:1px solid #3a6a3a;border-radius:4px;cursor:pointer;
                font-family:monospace;font-size:12px;
              ">+ Train ${producerInfo.unitLabel}</button>`;
            }
            html += `</div>`;
          }

          // Production chain info
          if (def.inputs.length > 0 || def.outputs.length > 0) {
            const effTime = getEffectiveProductionTime(building);
            html += `<div style="margin-top:6px;color:#888;border-top:1px solid #333;padding-top:4px;font-size:10px;">`;
            if (def.inputs.length > 0) {
              html += `Needs: ${def.inputs.map(i => `${i.amount} ${RESOURCE_META[i.type].label}`).join(" + ")}<br>`;
            }
            if (def.outputs.length > 0) {
              html += `Makes: ${def.outputs.map(o => `${o.amount} ${RESOURCE_META[o.type].label}`).join(" + ")}`;
            } else if (def.type === SettlersBuildingType.BARRACKS) {
              html += `Makes: 1 Soldier`;
            } else if (def.type === SettlersBuildingType.ARCHERY_RANGE) {
              html += `Makes: 1 Archer`;
            } else if (def.type === SettlersBuildingType.STABLE) {
              html += `Makes: 1 Knight`;
            }
            html += `<br>Every ${effTime.toFixed(1)}s`;
            if (building.level > 1) {
              html += ` <span style="color:#cc88ff;">(base ${def.productionTime}s)</span>`;
            }
            html += `</div>`;
          }

          // Market UI
          if (def.type === SettlersBuildingType.MARKET && building.owner === "p0") {
            html += `<div style="margin-top:8px;border-top:1px solid #444;padding-top:6px;">`;
            html += `<div style="color:#ffcc44;margin-bottom:4px;">Trade Configuration</div>`;

            // Sell dropdown
            html += `<div style="font-size:11px;margin-bottom:3px;">Sell resource:</div>`;
            html += `<select id="settlers-market-sell" style="width:100%;padding:3px;background:#1a1a30;color:#e0d8c8;border:1px solid #444;border-radius:4px;font-size:11px;margin-bottom:6px;">`;
            html += `<option value="">-- None --</option>`;
            for (const rt of TRADEABLE_RESOURCES) {
              const sel = building.marketSellResource === rt ? " selected" : "";
              html += `<option value="${rt}"${sel}>${RESOURCE_META[rt].label}</option>`;
            }
            html += `</select>`;

            // Buy dropdown
            html += `<div style="font-size:11px;margin-bottom:3px;">Buy resource:</div>`;
            html += `<select id="settlers-market-buy" style="width:100%;padding:3px;background:#1a1a30;color:#e0d8c8;border:1px solid #444;border-radius:4px;font-size:11px;margin-bottom:6px;">`;
            html += `<option value="">-- None --</option>`;
            for (const rt of TRADEABLE_RESOURCES) {
              const sel = building.marketBuyResource === rt ? " selected" : "";
              html += `<option value="${rt}"${sel}>${RESOURCE_META[rt].label}</option>`;
            }
            html += `</select>`;

            // Trade rate info
            if (building.marketSellResource && building.marketBuyResource && building.marketSellResource !== building.marketBuyResource) {
              const bothRaw = ["wood","stone","iron_ore","gold_ore","coal","wheat","water","fish"].includes(building.marketSellResource) &&
                              ["wood","stone","iron_ore","gold_ore","coal","wheat","water","fish"].includes(building.marketBuyResource);
              const rate = bothRaw ? SB.TRADE_RATE_RAW_TO_RAW : SB.TRADE_RATE_DEFAULT;
              html += `<div style="font-size:10px;color:#88cc44;">Rate: ${rate} ${RESOURCE_META[building.marketSellResource].label} -> 1 ${RESOURCE_META[building.marketBuyResource].label}</div>`;
              const effTime = getEffectiveProductionTime(building);
              html += `<div style="font-size:10px;color:#888;">Trade every ${effTime.toFixed(1)}s</div>`;
            }
            html += `</div>`;
          }

          // Upgrade button (for player buildings that are fully built and not HQ/storehouse)
          if (building.owner === "p0" && building.level < SB.MAX_BUILDING_LEVEL
              && def.type !== SettlersBuildingType.HEADQUARTERS
              && def.type !== SettlersBuildingType.STOREHOUSE
              && building.upgradeProgress === 0) {
            const upgradeError = canUpgradeBuilding(state, building.id);
            const costs = getUpgradeCost(building);
            html += `<div style="margin-top:8px;border-top:1px solid #444;padding-top:6px;">`;
            if (costs) {
              html += `<div style="font-size:10px;color:#aaa;margin-bottom:3px;">Upgrade to Lvl ${building.level + 1}: ${costs.map(c => `${c.amount} ${RESOURCE_META[c.type].label}`).join(", ")}</div>`;
            }
            const canUpgrade = upgradeError === null;
            const btnStyle = canUpgrade
              ? "background:#2a4a5a;color:#88ccff;border:1px solid #3a6a8a;cursor:pointer;"
              : "background:#2a2a2a;color:#666;border:1px solid #333;cursor:not-allowed;";
            html += `<button id="settlers-upgrade-btn" ${canUpgrade ? "" : "disabled"} style="
              width:100%;padding:4px 8px;border-radius:4px;font-family:monospace;font-size:12px;${btnStyle}
            ">Upgrade</button>`;
            if (upgradeError && upgradeError !== "Already max level") {
              html += `<div style="font-size:9px;color:#aa6644;margin-top:2px;">${upgradeError}</div>`;
            }
            html += `</div>`;
          }
        }

        this._infoPanel.innerHTML = html;

        // Wire up queue button handlers for unit-producing buildings
        const queueLabels: Record<string, string> = {
          [SettlersBuildingType.BARRACKS]: "soldier",
          [SettlersBuildingType.ARCHERY_RANGE]: "archer",
          [SettlersBuildingType.STABLE]: "knight",
        };
        const queueLabel = queueLabels[def.type];
        if (queueLabel && building.owner === "p0") {
          const addBtn = document.getElementById("settlers-queue-add");
          if (addBtn) {
            addBtn.onclick = () => this.onQueueAdd?.(building.id, queueLabel);
          }
          const cancelBtns = this._infoPanel.querySelectorAll(".settlers-queue-cancel");
          cancelBtns.forEach((btn) => {
            const qi = parseInt((btn as HTMLElement).dataset.qi || "0", 10);
            (btn as HTMLElement).onclick = () => this.onQueueRemove?.(building.id, qi);
          });
        }

        // Wire up upgrade button
        const upgradeBtn = document.getElementById("settlers-upgrade-btn");
        if (upgradeBtn) {
          upgradeBtn.onclick = () => this.onUpgrade?.(building.id);
        }

        // Wire up market dropdowns
        if (def.type === SettlersBuildingType.MARKET && building.owner === "p0") {
          const sellSelect = document.getElementById("settlers-market-sell") as HTMLSelectElement | null;
          const buySelect = document.getElementById("settlers-market-buy") as HTMLSelectElement | null;
          const updateTrade = () => {
            const sell = sellSelect?.value ? sellSelect.value as ResourceType : null;
            const buy = buySelect?.value ? buySelect.value as ResourceType : null;
            this.onMarketTrade?.(building.id, sell, buy);
          };
          if (sellSelect) sellSelect.onchange = updateTrade;
          if (buySelect) buySelect.onchange = updateTrade;
        }
      } else {
        this._infoPanel.style.display = "none";
      }
    } else if (state.selectedRoadId) {
      const road = state.roads.get(state.selectedRoadId);
      if (road && road.owner === "p0") {
        this._infoPanel.style.display = "block";
        const qualityLabel = road.quality === "paved" ? "Paved" : road.quality === "stone" ? "Stone" : "Dirt";
        const speedMult = road.quality === "paved" ? "2x" : road.quality === "stone" ? "1.5x" : "1x";
        const qualityColor = road.quality === "paved" ? "#ddddff" : road.quality === "stone" ? "#bbbbbb" : "#b09868";

        let html = `<div style="font-size:14px;color:#ffd700;margin-bottom:2px;font-weight:bold;">Road Segment</div>`;
        html += `<div style="font-size:11px;margin-bottom:6px;">Quality: <span style="color:${qualityColor};font-weight:bold;">${qualityLabel}</span></div>`;
        html += `<div style="font-size:11px;margin-bottom:4px;">Carrier Speed: <span style="color:#88cc44;">${speedMult}</span></div>`;
        html += `<div style="font-size:11px;margin-bottom:6px;">Length: ${road.path.length} tiles</div>`;

        const nextQuality = getNextRoadQuality(road.quality);
        if (nextQuality) {
          const cost = getRoadUpgradeCost(nextQuality);
          const nextLabel = nextQuality === "paved" ? "Paved" : "Stone";
          const player = state.players.get("p0");
          const stoneAvail = player ? (player.storage.get(ResourceType.STONE) || 0) : 0;
          const ironAvail = player ? (player.storage.get(ResourceType.IRON) || 0) : 0;
          const canAfford = stoneAvail >= cost.stone && ironAvail >= cost.iron;
          const costStr = cost.iron > 0
            ? `${cost.stone} Stone + ${cost.iron} Iron`
            : `${cost.stone} Stone`;

          html += `<div style="margin-top:8px;border-top:1px solid #444;padding-top:6px;">`;
          html += `<div style="color:#aaa;font-size:11px;margin-bottom:4px;">Upgrade to ${nextLabel}: ${costStr}</div>`;
          html += `<button id="settlers-road-upgrade" style="
            width:100%;padding:5px 8px;
            background:${canAfford ? "#2a4a3a" : "#3a2a2a"};
            color:${canAfford ? "#88ccaa" : "#887766"};
            border:1px solid ${canAfford ? "#3a6a4a" : "#553333"};
            border-radius:4px;cursor:${canAfford ? "pointer" : "not-allowed"};
            font-family:monospace;font-size:12px;
          "${canAfford ? "" : " disabled"}>Upgrade to ${nextLabel}</button>`;
          html += `</div>`;
        } else {
          html += `<div style="margin-top:6px;color:#888;font-size:10px;">Maximum quality reached</div>`;
        }

        this._infoPanel.innerHTML = html;

        // Wire up road upgrade button via delegation (survives innerHTML rewrites)
        this._infoPanel.onclick = (e) => {
          const target = (e.target as HTMLElement).closest("#settlers-road-upgrade") as HTMLElement | null;
          if (target && !target.hasAttribute("disabled") && state.selectedRoadId) {
            e.stopPropagation();
            this.onRoadUpgrade?.(state.selectedRoadId);
          }
          // Flag info close is handled by panel click passthrough
        };
      } else {
        this._infoPanel.style.display = "none";
      }
    } else if (state.selectedFlagId) {
      const flag = state.flags.get(state.selectedFlagId);
      if (flag) {
        this._infoPanel.style.display = "block";
        let html = `<div style="font-size:14px;font-weight:bold;color:#ffd700;margin-bottom:8px;">Flag</div>`;
        html += `<div style="color:#aaa;font-size:11px;margin-bottom:4px;">Position: (${flag.tileX}, ${flag.tileZ})</div>`;
        html += `<div style="color:#aaa;font-size:11px;margin-bottom:4px;">Connected roads: ${flag.connectedRoads.length}</div>`;
        if (flag.buildingId) {
          const bld = state.buildings.get(flag.buildingId);
          html += `<div style="color:#88aacc;font-size:11px;margin-bottom:6px;">Building: ${bld?.type ?? flag.buildingId}</div>`;
        }
        html += `<div style="border-top:1px solid #444;margin-top:6px;padding-top:6px;">`;
        html += `<div style="color:#ccc;font-size:12px;font-weight:bold;margin-bottom:4px;">Resources (${flag.inventory.length}/8)</div>`;
        if (flag.inventory.length === 0) {
          html += `<div style="color:#666;font-size:11px;font-style:italic;">Empty</div>`;
        } else {
          // Group resources by type
          const counts = new Map<string, number>();
          for (const item of flag.inventory) {
            counts.set(item.type, (counts.get(item.type) || 0) + 1);
          }
          for (const [type, count] of counts) {
            const name = type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            const barW = Math.min(100, count * 25);
            html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">`;
            html += `<div style="flex:1;color:#cda;font-size:11px;">${name}</div>`;
            html += `<div style="width:${barW}px;height:6px;background:#4a6a3a;border-radius:3px;"></div>`;
            html += `<div style="color:#aaa;font-size:10px;width:16px;text-align:right;">${count}</div>`;
            html += `</div>`;
          }
        }
        html += `</div>`;
        this._infoPanel.innerHTML = html;
      } else {
        state.selectedFlagId = null;
        this._infoPanel.style.display = "none";
      }
    } else {
      this._infoPanel.style.display = "none";
    }
  }

  private _updateMinimap(state: SettlersState): void {
    const ctx = this._minimapCtx;
    const cw = this._minimap.width;
    const ch = this._minimap.height;
    const map = state.map;
    const sx = cw / map.width;
    const sz = ch / map.height;

    ctx.clearRect(0, 0, cw, ch);

    const vis = map.visibility[0]; // human player fog of war

    // Draw terrain biomes (with fog of war)
    for (let tz = 0; tz < map.height; tz++) {
      for (let tx = 0; tx < map.width; tx++) {
        const idx = tz * map.width + tx;
        const tileVis = vis[idx];
        const biome = map.biomes[idx];
        const territory = map.territory[idx];

        // HIDDEN tiles are dark on minimap
        if (tileVis === Visibility.HIDDEN) {
          ctx.fillStyle = "#111";
          ctx.fillRect(tx * sx, tz * sz, sx + 0.5, sz + 0.5);
          continue;
        }

        let color: string;
        switch (biome) {
          case Biome.WATER: color = "#1a6090"; break;
          case Biome.MEADOW: color = "#5da040"; break;
          case Biome.FOREST: color = "#3a7a2c"; break;
          case Biome.MOUNTAIN: color = "#8a8a7e"; break;
          case Biome.DESERT: color = "#c4a854"; break;
          default: color = "#444"; break;
        }

        ctx.fillStyle = color;
        ctx.fillRect(tx * sx, tz * sz, sx + 0.5, sz + 0.5);

        // Dim explored (non-visible) tiles
        if (tileVis === Visibility.EXPLORED) {
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.fillRect(tx * sx, tz * sz, sx + 0.5, sz + 0.5);
        }

        // Territory tint overlay (only in visible tiles)
        if (territory >= 0 && tileVis === Visibility.VISIBLE) {
          ctx.fillStyle = territory === 0 ? "rgba(51,136,255,0.25)" : "rgba(255,51,51,0.25)";
          ctx.fillRect(tx * sx, tz * sz, sx + 0.5, sz + 0.5);
        }

        // Resource deposit indicators
        const deposit = map.deposits[idx];
        if (deposit !== Deposit.NONE) {
          let dColor: string;
          switch (deposit) {
            case Deposit.IRON: dColor = "#7a7a7a"; break;   // gray
            case Deposit.GOLD: dColor = "#ffd700"; break;   // yellow
            case Deposit.COAL: dColor = "#222222"; break;   // black
            case Deposit.STONE: dColor = "#999999"; break;  // light gray
            case Deposit.FISH: dColor = "#5599bb"; break;   // blue
            default: dColor = "#fff"; break;
          }
          ctx.fillStyle = dColor;
          const dotRadius = Math.max(1.2, sx * 0.6);
          ctx.beginPath();
          ctx.arc(tx * sx + sx / 2, tz * sz + sz / 2, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw enemy territory borders (red outline for enemy territory edges)
    ctx.strokeStyle = "rgba(255,60,60,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let tz = 0; tz < map.height; tz++) {
      for (let tx = 0; tx < map.width; tx++) {
        const idx = tz * map.width + tx;
        const owner = map.territory[idx];
        if (owner !== 1) continue;

        const px = tx * sx;
        const pz = tz * sz;

        if (tz === 0 || map.territory[(tz - 1) * map.width + tx] !== 1) {
          ctx.moveTo(px, pz); ctx.lineTo(px + sx, pz);
        }
        if (tz === map.height - 1 || map.territory[(tz + 1) * map.width + tx] !== 1) {
          ctx.moveTo(px, pz + sz); ctx.lineTo(px + sx, pz + sz);
        }
        if (tx === 0 || map.territory[tz * map.width + tx - 1] !== 1) {
          ctx.moveTo(px, pz); ctx.lineTo(px, pz + sz);
        }
        if (tx === map.width - 1 || map.territory[tz * map.width + tx + 1] !== 1) {
          ctx.moveTo(px + sx, pz); ctx.lineTo(px + sx, pz + sz);
        }
      }
    }
    ctx.stroke();

    // Draw buildings (own = always; enemy = only if tile is EXPLORED or VISIBLE)
    for (const [, building] of state.buildings) {
      const def = BUILDING_DEFS[building.type];
      const bcx = building.tileX + Math.floor(def.footprint.w / 2);
      const bcz = building.tileZ + Math.floor(def.footprint.h / 2);
      const bIdx = bcz * map.width + bcx;
      if (building.owner !== "p0" && (bIdx < 0 || bIdx >= vis.length || vis[bIdx] === Visibility.HIDDEN)) continue;
      ctx.fillStyle = building.owner === "p0" ? "#4488ff" : "#ff4444";
      ctx.fillRect(
        building.tileX * sx,
        building.tileZ * sz,
        def.footprint.w * sx,
        def.footprint.h * sz,
      );
    }

    // Draw soldiers as colored dots (fog-aware: enemy only visible in VISIBLE tiles)
    for (const [, soldier] of state.soldiers) {
      if (soldier.state === "garrisoned") continue;
      const stx = soldier.position.x / SB.TILE_SIZE;
      const stz = soldier.position.z / SB.TILE_SIZE;
      if (soldier.owner !== "p0") {
        const sIdx = Math.floor(stz) * map.width + Math.floor(stx);
        if (sIdx < 0 || sIdx >= vis.length || vis[sIdx] !== Visibility.VISIBLE) continue;
      }
      const isFriendly = soldier.owner === "p0";
      ctx.fillStyle = isFriendly ? "#88ff88" : "#ff6666";
      ctx.beginPath();
      ctx.arc(stx * sx, stz * sz, isFriendly ? 1.8 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw flags (fog-aware: enemy only in EXPLORED or VISIBLE)
    for (const [, flag] of state.flags) {
      if (flag.owner !== "p0") {
        const fIdx = flag.tileZ * map.width + flag.tileX;
        if (fIdx < 0 || fIdx >= vis.length || vis[fIdx] === Visibility.HIDDEN) continue;
      }
      ctx.fillStyle = flag.owner === "p0" ? "rgba(170,204,255,0.6)" : "rgba(255,170,170,0.5)";
      ctx.fillRect(flag.tileX * sx - 0.3, flag.tileZ * sz - 0.3, 1.2, 1.2);
    }

    // Draw camera viewport indicator
    this._drawMinimapViewport(ctx, cw, ch, map.width, map.height);
  }

  /** Draw the camera's approximate viewport rectangle on the minimap */
  private _drawMinimapViewport(
    ctx: CanvasRenderingContext2D,
    cw: number, ch: number,
    mapTilesW: number, mapTilesH: number,
  ): void {
    const mapWorldW = mapTilesW * SB.TILE_SIZE;
    const mapWorldH = mapTilesH * SB.TILE_SIZE;

    // Camera target in minimap coords
    const cx = (this._cameraTargetX / mapWorldW) * cw;
    const cy = (this._cameraTargetZ / mapWorldH) * ch;

    // Approximate visible area based on camera distance and pitch
    // The visible width/height on the ground depends on distance, fov, and pitch
    const dist = this._cameraDistance;
    const pitch = this._cameraPitch;
    const fovFactor = 1.2; // approximate scaling

    // Half-width and half-height of visible area in world units
    const visHalfW = dist * Math.cos(pitch) * fovFactor * 0.7;
    const visHalfH = dist * fovFactor * 0.5;

    // Convert to minimap pixels
    const rectHalfW = (visHalfW / mapWorldW) * cw;
    const rectHalfH = (visHalfH / mapWorldH) * ch;

    // Rotate the rectangle based on camera yaw
    const yaw = this._cameraYaw;
    const corners = [
      [-rectHalfW, -rectHalfH],
      [ rectHalfW, -rectHalfH],
      [ rectHalfW,  rectHalfH],
      [-rectHalfW,  rectHalfH],
    ];

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < corners.length; i++) {
      const [rx, ry] = corners[i];
      // Rotate by yaw
      const rotX = rx * Math.cos(yaw) - ry * Math.sin(yaw);
      const rotY = rx * Math.sin(yaw) + ry * Math.cos(yaw);
      const px = cx + rotX;
      const py = cy + rotY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Small cross at center
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy);
    ctx.lineTo(cx + 3, cy);
    ctx.moveTo(cx, cy - 3);
    ctx.lineTo(cx, cy + 3);
    ctx.stroke();
    ctx.restore();
  }

  /** Update camera info for minimap viewport indicator (called from game loop) */
  updateCamera(targetX: number, targetZ: number, distance: number, yaw: number, pitch: number): void {
    this._cameraTargetX = targetX;
    this._cameraTargetZ = targetZ;
    this._cameraDistance = distance;
    this._cameraYaw = yaw;
    this._cameraPitch = pitch;
  }

  /** Handle click on minimap to move camera */
  private _handleMinimapClick(e: MouseEvent): void {
    const rect = this._minimap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert minimap pixel to world coordinates
    const mapWorldW = SB.MAP_WIDTH * SB.TILE_SIZE;
    const mapWorldH = SB.MAP_HEIGHT * SB.TILE_SIZE;
    const worldX = (mx / this._minimap.width) * mapWorldW;
    const worldZ = (my / this._minimap.height) * mapWorldH;

    this.onMinimapClick?.(worldX, worldZ);
  }

  destroy(): void {
    // Remove minimap event listeners
    if (this._minimap) {
      if (this._minimapMouseDown) this._minimap.removeEventListener("mousedown", this._minimapMouseDown);
      if (this._minimapMouseMove) this._minimap.removeEventListener("mousemove", this._minimapMouseMove);
      this._minimapMouseDown = null;
      this._minimapMouseMove = null;
    }
    // Clean up all callbacks to prevent dangling references
    this.onSelectBuildingType = null;
    this.onSelectTool = null;
    this.onExit = null;
    this.onSave = null;
    this.onLoad = null;
    this.onMinimapClick = null;
    this.onQueueAdd = null;
    this.onQueueRemove = null;
    this.onUpgrade = null;
    this.onMarketTrade = null;
    this.onRoadUpgrade = null;
    this.onStartGame = null;
    this._root.remove();
  }
}
