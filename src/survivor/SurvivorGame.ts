// ---------------------------------------------------------------------------
// Survivor mode orchestrator — boots the game, runs the loop, manages views
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle, AnimatedSprite, Ticker } from "pixi.js";
import { UnitType, UnitState, MapType } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { viewManager } from "@view/ViewManager";
import { animationManager } from "@view/animation/AnimationManager";
import { gridRenderer } from "@view/GridRenderer";
import { SurvivorBalance, SURVIVOR_MAPS } from "./config/SurvivorBalanceConfig";
import { SURVIVOR_CHARACTERS } from "./config/SurvivorCharacterDefs";
import type { SurvivorCharacterDef } from "./config/SurvivorCharacterDefs";
import { WEAPON_DEFS } from "./config/SurvivorWeaponDefs";
import { createSurvivorState } from "./state/SurvivorState";
import type { SurvivorState } from "./state/SurvivorState";
import { SurvivorInputSystem } from "./systems/SurvivorInputSystem";
import { SurvivorWaveSystem } from "./systems/SurvivorWaveSystem";
import { SurvivorCombatSystem } from "./systems/SurvivorCombatSystem";
import { SurvivorPickupSystem } from "./systems/SurvivorPickupSystem";
import { generateUpgradeChoices, applyUpgrade } from "./systems/SurvivorLevelSystem";
import type { UpgradeChoice } from "./systems/SurvivorLevelSystem";
import { audioManager } from "@audio/AudioManager";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = BalanceConfig.TILE_SIZE;
const DT = SurvivorBalance.SIM_TICK_MS / 1000;

// Styles
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffffff, fontWeight: "bold" });
const STYLE_HUD_SMALL = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xcccccc });
const STYLE_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 28, fill: 0xffd700, fontWeight: "bold", letterSpacing: 3 });
const STYLE_CHOICE = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold" });
const STYLE_CHOICE_DESC = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc });
const STYLE_RESULT_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 36, fill: 0xff4444, fontWeight: "bold", letterSpacing: 2 });
const STYLE_RESULT_STAT = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff });
const STYLE_CHAR_NAME = new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold" });
const STYLE_CHAR_DESC = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc });
const STYLE_BTN = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffffff, fontWeight: "bold" });

// ---------------------------------------------------------------------------
// Floating damage number
// ---------------------------------------------------------------------------

interface DmgNumber {
  text: Text;
  lifetime: number;
  vy: number;
}

// ---------------------------------------------------------------------------
// Weapon FX particle
// ---------------------------------------------------------------------------

interface WeaponFXParticle {
  gfx: Graphics;
  lifetime: number;
  vx: number;
  vy: number;
  startAlpha: number;
}

// ---------------------------------------------------------------------------
// SurvivorGame
// ---------------------------------------------------------------------------

export class SurvivorGame {
  private _state!: SurvivorState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _simAccumulator = 0;

  // View containers
  private _worldLayer = new Container();
  private _enemyContainer = new Container();
  private _gemContainer = new Container();
  private _projectileContainer = new Container();
  private _playerContainer = new Container();
  private _weaponFxContainer = new Container();
  private _dmgNumberContainer = new Container();

  // Player sprite
  private _playerSprite: AnimatedSprite | null = null;

  // Enemy views: id -> view
  private _enemyViews = new Map<number, { container: Container; sprite: AnimatedSprite | null; hpBar: Graphics }>();
  // Gem views: id -> Graphics
  private _gemViews = new Map<number, Graphics>();
  // Floating damage numbers
  private _dmgNumbers: DmgNumber[] = [];
  // Weapon FX particles
  private _weaponFxParticles: WeaponFXParticle[] = [];
  // Orbiting FX objects for spinning blade / fireball ring
  private _orbitGfx: Graphics[] = [];
  // Chest views
  private _chestViews = new Map<number, Graphics>();
  // Notification banners
  private _notifications: { text: Text; lifetime: number }[] = [];

  // HUD elements
  private _hudContainer = new Container();
  private _hpBarBg!: Graphics;
  private _hpBarFill!: Graphics;
  private _hpText!: Text;
  private _xpBarBg!: Graphics;
  private _xpBarFill!: Graphics;
  private _timerText!: Text;
  private _killText!: Text;
  private _levelText!: Text;
  private _weaponHudContainer = new Container();
  private _bossWarning: Text | null = null;
  private _bossWarningTimer = 0;

  // Boss HP bar (UI layer)
  private _bossHpContainer = new Container();
  private _bossHpBarBg!: Graphics;
  private _bossHpBarFill!: Graphics;
  private _bossNameText!: Text;

  // Level-up UI
  private _levelUpOverlay = new Container();

  // Results UI
  private _resultsOverlay = new Container();

  // Character select UI
  private _charSelectOverlay = new Container();

  // Map selection state
  private _selectedMapIndex = 0;

  // Screen shake
  private _shakeTimer = 0;
  private _shakeIntensity = 0;

  // Damage tracking for FX (set by combat system via callback)
  private _pendingDmgNumbers: { x: number; y: number; amount: number; isCrit: boolean; isHeal: boolean }[] = [];
  private _pendingWeaponFx: { x: number; y: number; color: number; radius: number }[] = [];

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._showCharacterSelect();
  }

  // ---------------------------------------------------------------------------
  // Character Select Screen (with map selection)
  // ---------------------------------------------------------------------------

  private _showCharacterSelect(): void {
    this._charSelectOverlay.removeChildren();
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    // Background
    const bg = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x0a0a18, alpha: 0.95 });
    this._charSelectOverlay.addChild(bg);

    // Title
    const title = new Text({ text: "SELECT SURVIVOR", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 20);
    this._charSelectOverlay.addChild(title);

    // Character cards
    const unlockedChars = SURVIVOR_CHARACTERS.filter((c) => c.unlocked);
    const cardW = 180;
    const cardH = 210;
    const gap = 12;
    const totalW = unlockedChars.length * cardW + (unlockedChars.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const startY = 70;

    for (let i = 0; i < unlockedChars.length; i++) {
      const charDef = unlockedChars[i];
      const card = this._buildCharCard(charDef, cardW, cardH);
      card.position.set(startX + i * (cardW + gap), startY);
      this._charSelectOverlay.addChild(card);
    }

    // Map selection section
    const mapSectionY = startY + cardH + 20;
    const mapTitle = new Text({ text: "SELECT MAP", style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold" }) });
    mapTitle.anchor.set(0.5, 0);
    mapTitle.position.set(sw / 2, mapSectionY);
    this._charSelectOverlay.addChild(mapTitle);

    const mapCardW = 140;
    const mapCardH = 60;
    const mapGap = 10;
    const mapTotalW = SURVIVOR_MAPS.length * mapCardW + (SURVIVOR_MAPS.length - 1) * mapGap;
    const mapStartX = (sw - mapTotalW) / 2;
    const mapStartY = mapSectionY + 30;

    for (let i = 0; i < SURVIVOR_MAPS.length; i++) {
      const mapDef = SURVIVOR_MAPS[i];
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      card.position.set(mapStartX + i * (mapCardW + mapGap), mapStartY);

      const isSelected = i === this._selectedMapIndex;
      const mapBg = new Graphics()
        .roundRect(0, 0, mapCardW, mapCardH, 6)
        .fill({ color: isSelected ? 0x2a3a4a : 0x1a1a2e, alpha: 0.9 })
        .roundRect(0, 0, mapCardW, mapCardH, 6)
        .stroke({ color: isSelected ? 0xffd700 : 0x445566, width: isSelected ? 2 : 1 });
      card.addChild(mapBg);

      // Map color swatch
      const swatchColor = this._getMapSwatchColor(mapDef.mapType);
      const swatch = new Graphics().roundRect(8, 8, 20, 20, 3).fill({ color: swatchColor });
      card.addChild(swatch);

      const nameText = new Text({ text: mapDef.name, style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: isSelected ? 0xffd700 : 0xaabbcc, fontWeight: isSelected ? "bold" : "normal" }) });
      nameText.position.set(34, 8);
      card.addChild(nameText);

      const sizeText = new Text({ text: `${mapDef.width}×${mapDef.height}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x667788 }) });
      sizeText.position.set(34, 28);
      card.addChild(sizeText);

      const idx = i;
      card.on("pointerdown", () => {
        this._selectedMapIndex = idx;
        this._showCharacterSelect(); // refresh
      });
      card.on("pointerover", () => { if (idx !== this._selectedMapIndex) mapBg.tint = 0x3366aa; });
      card.on("pointerout", () => { mapBg.tint = 0xffffff; });

      this._charSelectOverlay.addChild(card);
    }

    viewManager.addToLayer("ui", this._charSelectOverlay);
  }

  private _getMapSwatchColor(mapType: MapType): number {
    switch (mapType) {
      case MapType.MEADOW: return 0x44aa44;
      case MapType.FOREST: return 0x226633;
      case MapType.TUNDRA: return 0xaaccdd;
      case MapType.VOLCANIC: return 0xcc4422;
      case MapType.SWAMP: return 0x446644;
      case MapType.DESERT: return 0xccaa66;
      default: return 0x888888;
    }
  }

  private _buildCharCard(charDef: SurvivorCharacterDef, w: number, h: number): Container {
    const card = new Container();
    card.eventMode = "static";
    card.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill({ color: 0x1a1a2e, alpha: 0.9 })
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: 0x4488cc, width: 2 });
    card.addChild(bg);

    // Character sprite preview
    const frames = animationManager.getFrames(charDef.unitType, UnitState.IDLE);
    if (frames.length > 0) {
      const preview = new AnimatedSprite(frames);
      preview.animationSpeed = 0.12;
      preview.play();
      preview.anchor.set(0.5, 0.5);
      preview.position.set(w / 2, 55);
      preview.scale.set(2);
      card.addChild(preview);
    }

    const nameText = new Text({ text: charDef.name, style: STYLE_CHAR_NAME });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(w / 2, 100);
    card.addChild(nameText);

    const weaponDef = WEAPON_DEFS[charDef.startingWeapon];
    const weaponText = new Text({ text: weaponDef.name, style: STYLE_CHAR_DESC });
    weaponText.anchor.set(0.5, 0);
    weaponText.position.set(w / 2, 125);
    card.addChild(weaponText);

    const descText = new Text({ text: charDef.description, style: STYLE_CHAR_DESC });
    descText.anchor.set(0.5, 0);
    descText.position.set(w / 2, 148);
    descText.style.wordWrap = true;
    descText.style.wordWrapWidth = w - 20;
    card.addChild(descText);

    card.on("pointerdown", () => {
      viewManager.removeFromLayer("ui", this._charSelectOverlay);
      this._startGame(charDef);
    });
    card.on("pointerover", () => { bg.tint = 0x3366aa; });
    card.on("pointerout", () => { bg.tint = 0xffffff; });

    return card;
  }

  // ---------------------------------------------------------------------------
  // Start Game
  // ---------------------------------------------------------------------------

  private _startGame(charDef: SurvivorCharacterDef): void {
    const mapDef = SURVIVOR_MAPS[this._selectedMapIndex];
    this._state = createSurvivorState(charDef, mapDef.mapType, mapDef.width, mapDef.height);

    // Clear all
    this._worldLayer.removeChildren();
    this._enemyContainer.removeChildren();
    this._gemContainer.removeChildren();
    this._projectileContainer.removeChildren();
    this._playerContainer.removeChildren();
    this._weaponFxContainer.removeChildren();
    this._dmgNumberContainer.removeChildren();
    this._enemyViews.clear();
    this._gemViews.clear();
    this._dmgNumbers = [];
    this._weaponFxParticles = [];
    this._orbitGfx = [];
    this._pendingDmgNumbers = [];
    this._pendingWeaponFx = [];

    this._worldLayer.addChild(this._gemContainer);
    this._worldLayer.addChild(this._enemyContainer);
    this._worldLayer.addChild(this._projectileContainer);
    this._worldLayer.addChild(this._weaponFxContainer);
    this._worldLayer.addChild(this._playerContainer);
    this._worldLayer.addChild(this._dmgNumberContainer);

    viewManager.addToLayer("units", this._worldLayer);

    // Draw terrain
    const bf = {
      grid: this._buildSimpleGrid(mapDef.width, mapDef.height),
      width: mapDef.width,
      height: mapDef.height,
    };
    gridRenderer.init(viewManager);
    gridRenderer.draw(bf, mapDef.mapType);

    // Camera
    viewManager.camera.setMapSize(mapDef.width, mapDef.height);
    viewManager.camera.zoom = 1.5;
    this._syncCamera();

    // Player sprite
    this._createPlayerSprite(charDef.unitType);

    // Build HUD
    this._buildHUD();

    // Init combat damage callback
    SurvivorCombatSystem.setDamageCallback((x, y, amount, isCrit) => {
      this._pendingDmgNumbers.push({ x, y, amount, isCrit, isHeal: false });
    });
    SurvivorCombatSystem.setWeaponFxCallback((x, y, color, radius) => {
      this._pendingWeaponFx.push({ x, y, color, radius });
    });
    SurvivorCombatSystem.setPlayerHitCallback(() => {
      this._shakeTimer = 0.2;
      this._shakeIntensity = 6;
    });
    SurvivorPickupSystem.setChestCallback((type, value) => {
      let msg = "";
      if (type === "gold") msg = `+${value} GOLD!`;
      else if (type === "heal") msg = "FULL HEAL!";
      else if (type === "bomb") msg = "SCREEN CLEAR!";
      this._showNotification(msg, type === "gold" ? 0xffd700 : type === "heal" ? 0x44ff44 : 0xff4444);
    });

    // Init systems
    SurvivorInputSystem.init(this._state);

    // Start game loop
    this._tickerCb = (ticker: Ticker) => {
      this._gameLoop(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _buildSimpleGrid(w: number, h: number): { x: number; y: number; walkable: boolean; owner: null; buildingId: null; zone: "neutral" }[][] {
    const grid: { x: number; y: number; walkable: boolean; owner: null; buildingId: null; zone: "neutral" }[][] = [];
    for (let y = 0; y < h; y++) {
      const row: { x: number; y: number; walkable: boolean; owner: null; buildingId: null; zone: "neutral" }[] = [];
      for (let x = 0; x < w; x++) {
        row.push({ x, y, walkable: true, owner: null, buildingId: null, zone: "neutral" });
      }
      grid.push(row);
    }
    return grid;
  }

  private _createPlayerSprite(unitType: UnitType): void {
    const frames = animationManager.getFrames(unitType, UnitState.IDLE);
    if (frames.length > 0) {
      this._playerSprite = new AnimatedSprite(frames);
      this._playerSprite.animationSpeed = 0.15;
      this._playerSprite.play();
      this._playerSprite.anchor.set(0.5, 0.75);
      this._playerSprite.scale.set(1.5);
      this._playerContainer.addChild(this._playerSprite);
    }
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private _buildHUD(): void {
    this._hudContainer.removeChildren();
    this._weaponHudContainer.removeChildren();
    this._bossHpContainer.removeChildren();
    const sw = viewManager.screenWidth;

    // HP bar (wider, more prominent)
    const hpY = 10;
    const hpW = 260;
    this._hpBarBg = new Graphics()
      .roundRect(10, hpY, hpW, 18, 5).fill({ color: 0x330000 })
      .roundRect(10, hpY, hpW, 18, 5).stroke({ color: 0x882222, width: 1 });
    this._hpBarFill = new Graphics();
    this._hpText = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffffff }) });
    this._hpText.anchor.set(0.5, 0.5);
    this._hpText.position.set(10 + hpW / 2, hpY + 9);
    this._hudContainer.addChild(this._hpBarBg, this._hpBarFill, this._hpText);

    // XP bar (full width at bottom)
    const xpH = 8;
    this._xpBarBg = new Graphics().rect(0, viewManager.screenHeight - xpH, sw, xpH).fill({ color: 0x001122 });
    this._xpBarFill = new Graphics();
    this._hudContainer.addChild(this._xpBarBg, this._xpBarFill);

    // Timer (top center)
    this._timerText = new Text({ text: "00:00", style: new TextStyle({ fontFamily: "monospace", fontSize: 20, fill: 0xffffff, fontWeight: "bold" }) });
    this._timerText.anchor.set(0.5, 0);
    this._timerText.position.set(sw / 2, 8);
    this._hudContainer.addChild(this._timerText);

    // Kill count
    this._killText = new Text({ text: "Kills: 0", style: STYLE_HUD_SMALL });
    this._killText.anchor.set(1, 0);
    this._killText.position.set(sw - 10, 10);
    this._hudContainer.addChild(this._killText);

    // Level
    this._levelText = new Text({ text: "Lv.1", style: STYLE_HUD });
    this._levelText.position.set(10 + hpW + 8, 12);
    this._hudContainer.addChild(this._levelText);

    // Weapon icons (bottom left)
    this._weaponHudContainer.position.set(10, viewManager.screenHeight - 55);
    this._hudContainer.addChild(this._weaponHudContainer);

    // Boss HP bar (hidden initially)
    const bossBarW = 300;
    this._bossHpBarBg = new Graphics()
      .roundRect(0, 0, bossBarW, 14, 4).fill({ color: 0x330000 })
      .roundRect(0, 0, bossBarW, 14, 4).stroke({ color: 0xff4444, width: 1 });
    this._bossHpBarFill = new Graphics();
    this._bossNameText = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xff6644, fontWeight: "bold" }) });
    this._bossNameText.anchor.set(0.5, 0);
    this._bossNameText.position.set(bossBarW / 2, -16);
    this._bossHpContainer.addChild(this._bossHpBarBg, this._bossHpBarFill, this._bossNameText);
    this._bossHpContainer.position.set((sw - bossBarW) / 2, 40);
    this._bossHpContainer.visible = false;
    this._hudContainer.addChild(this._bossHpContainer);

    viewManager.addToLayer("ui", this._hudContainer);
  }

  private _updateHUD(): void {
    const s = this._state;
    const sw = viewManager.screenWidth;
    const hpRatio = Math.max(0, s.player.hp / s.player.maxHp);
    const xpRatio = s.xpToNext > 0 ? Math.min(1, s.xp / s.xpToNext) : 0;
    const hpW = 260;

    // HP bar
    const hpColor = hpRatio > 0.5 ? 0xcc2222 : hpRatio > 0.25 ? 0xcc6600 : 0xff0000;
    this._hpBarFill.clear().roundRect(10, 10, hpW * hpRatio, 18, 5).fill({ color: hpColor });
    this._hpText.text = `${Math.ceil(s.player.hp)} / ${Math.ceil(s.player.maxHp)}`;

    // XP bar (full width at bottom)
    const xpH = 8;
    const sh = viewManager.screenHeight;
    this._xpBarFill.clear().rect(0, sh - xpH, sw * xpRatio, xpH).fill({ color: 0x4488ff });

    // Timer
    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    this._timerText.text = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    // Kills
    this._killText.text = `Kills: ${s.totalKills}`;

    // Level
    this._levelText.text = `Lv.${s.level}`;

    // Weapon icons
    this._updateWeaponHud(s);

    // Boss HP bar
    this._updateBossHud(s);

    // Boss warning
    if (this._bossWarningTimer > 0) {
      this._bossWarningTimer -= DT;
      if (!this._bossWarning) {
        this._bossWarning = new Text({
          text: "BOSS INCOMING!",
          style: new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: 0xff4444, fontWeight: "bold", letterSpacing: 3 }),
        });
        this._bossWarning.anchor.set(0.5, 0.5);
        this._bossWarning.position.set(sw / 2, 80);
        this._hudContainer.addChild(this._bossWarning);
      }
      this._bossWarning.alpha = Math.abs(Math.sin(this._bossWarningTimer * 6));
      if (this._bossWarningTimer <= 0 && this._bossWarning) {
        this._hudContainer.removeChild(this._bossWarning);
        this._bossWarning.destroy();
        this._bossWarning = null;
      }
    }
  }

  private _updateWeaponHud(s: SurvivorState): void {
    this._weaponHudContainer.removeChildren();
    const iconSize = 36;
    const gap = 4;
    for (let i = 0; i < s.weapons.length; i++) {
      const ws = s.weapons[i];
      const def = WEAPON_DEFS[ws.id];
      const icon = new Container();

      const bg = new Graphics()
        .roundRect(0, 0, iconSize, iconSize, 4)
        .fill({ color: 0x1a1a2e, alpha: 0.85 })
        .roundRect(0, 0, iconSize, iconSize, 4)
        .stroke({ color: ws.evolved ? 0xffd700 : def.color, width: ws.evolved ? 2 : 1 });
      icon.addChild(bg);

      // Weapon color dot
      const dot = new Graphics().circle(iconSize / 2, iconSize / 2 - 4, 6).fill({ color: def.color });
      icon.addChild(dot);

      // Level text
      const lvl = new Text({
        text: ws.evolved ? "MAX" : `${ws.level}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: ws.evolved ? 0xffd700 : 0xaabbcc }),
      });
      lvl.anchor.set(0.5, 1);
      lvl.position.set(iconSize / 2, iconSize - 2);
      icon.addChild(lvl);

      icon.position.set(i * (iconSize + gap), 0);
      this._weaponHudContainer.addChild(icon);
    }
  }

  private _updateBossHud(s: SurvivorState): void {
    const boss = s.enemies.find((e) => e.isBoss && e.alive);
    if (boss) {
      this._bossHpContainer.visible = true;
      const hpRatio = boss.hp / boss.maxHp;
      this._bossHpBarFill.clear().roundRect(0, 0, 300 * hpRatio, 14, 4).fill({ color: 0xff4444 });
      const unitDef = UNIT_DEFINITIONS[boss.type];
      this._bossNameText.text = unitDef?.description ?? boss.type.toUpperCase();
    } else {
      this._bossHpContainer.visible = false;
    }
  }

  private _showNotification(msg: string, color: number): void {
    const sw = viewManager.screenWidth;
    const text = new Text({
      text: msg,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: color, fontWeight: "bold", letterSpacing: 2 }),
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(sw / 2, viewManager.screenHeight * 0.25);
    this._hudContainer.addChild(text);
    this._notifications.push({ text, lifetime: 2.0 });
  }

  private _updateNotifications(dt: number): void {
    for (let i = this._notifications.length - 1; i >= 0; i--) {
      const n = this._notifications[i];
      n.lifetime -= dt;
      n.text.alpha = Math.min(1, n.lifetime / 0.5);
      n.text.position.y -= dt * 15; // drift up
      if (n.lifetime <= 0) {
        this._hudContainer.removeChild(n.text);
        n.text.destroy();
        this._notifications.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Level-up UI
  // ---------------------------------------------------------------------------

  private _showLevelUp(): void {
    const choices = generateUpgradeChoices(this._state);
    this._levelUpOverlay.removeChildren();

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    // Dim background
    const dim = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });
    this._levelUpOverlay.addChild(dim);

    // Title
    const title = new Text({ text: `LEVEL UP! (Lv.${this._state.level})`, style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, sh * 0.15);
    this._levelUpOverlay.addChild(title);

    // Choice cards
    const cardW = 220;
    const cardH = 120;
    const gap = 16;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const startY = sh * 0.35;

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      card.position.set(startX + i * (cardW + gap), startY);

      const bg = new Graphics()
        .roundRect(0, 0, cardW, cardH, 8)
        .fill({ color: 0x1a1a2e, alpha: 0.95 })
        .roundRect(0, 0, cardW, cardH, 8)
        .stroke({ color: choice.color, width: 2 });
      card.addChild(bg);

      const badge = new Text({
        text: choice.isNew ? "NEW" : `Lv.${choice.level}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: choice.isNew ? 0x44ff44 : 0xffd700, fontWeight: "bold" }),
      });
      badge.anchor.set(1, 0);
      badge.position.set(cardW - 10, 8);
      card.addChild(badge);

      const name = new Text({ text: choice.name, style: STYLE_CHOICE });
      name.position.set(10, 10);
      card.addChild(name);

      const typeLabel = new Text({
        text: choice.type === "weapon" ? "WEAPON" : "PASSIVE",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: choice.type === "weapon" ? 0xff8844 : 0x44aaff }),
      });
      typeLabel.position.set(10, 32);
      card.addChild(typeLabel);

      const desc = new Text({ text: choice.description, style: STYLE_CHOICE_DESC });
      desc.position.set(10, 50);
      desc.style.wordWrap = true;
      desc.style.wordWrapWidth = cardW - 20;
      card.addChild(desc);

      card.on("pointerdown", () => this._selectUpgrade(choice));
      card.on("pointerover", () => { bg.tint = 0x3366aa; });
      card.on("pointerout", () => { bg.tint = 0xffffff; });

      this._levelUpOverlay.addChild(card);
    }

    viewManager.addToLayer("ui", this._levelUpOverlay);
  }

  private _selectUpgrade(choice: UpgradeChoice): void {
    applyUpgrade(this._state, choice);
    viewManager.removeFromLayer("ui", this._levelUpOverlay);
    this._levelUpOverlay.removeChildren();

    if (this._state.levelUpPending) {
      this._showLevelUp();
    }
  }

  // ---------------------------------------------------------------------------
  // Results Screen
  // ---------------------------------------------------------------------------

  private _showResults(): void {
    this._resultsOverlay.removeChildren();
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;
    const s = this._state;

    const dim = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });
    this._resultsOverlay.addChild(dim);

    const cardW = 420;
    const cardH = 400;
    const cx = (sw - cardW) / 2;
    const cy = (sh - cardH) / 2;
    const card = new Graphics()
      .roundRect(cx, cy, cardW, cardH, 12)
      .fill({ color: 0x0a0a18, alpha: 0.95 })
      .roundRect(cx, cy, cardW, cardH, 12)
      .stroke({ color: 0xff4444, width: 2 });
    this._resultsOverlay.addChild(card);

    const title = new Text({ text: "DEFEATED", style: STYLE_RESULT_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, cy + 20);
    this._resultsOverlay.addChild(title);

    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    const stats = [
      `Time Survived:  ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      `Enemies Killed: ${s.totalKills}`,
      `Level Reached:  ${s.level}`,
      `Damage Dealt:   ${Math.floor(s.totalDamageDealt)}`,
      `Gold Earned:    ${s.gold}`,
      `Character:      ${s.player.characterDef.name}`,
      `Map:            ${SURVIVOR_MAPS[this._selectedMapIndex].name}`,
    ];

    let sy = cy + 75;
    for (const stat of stats) {
      const t = new Text({ text: stat, style: STYLE_RESULT_STAT });
      t.anchor.set(0.5, 0);
      t.position.set(sw / 2, sy);
      this._resultsOverlay.addChild(t);
      sy += 26;
    }

    // Weapons summary
    sy += 8;
    const weaponsLabel = new Text({ text: "Weapons:", style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffd700 }) });
    weaponsLabel.anchor.set(0.5, 0);
    weaponsLabel.position.set(sw / 2, sy);
    this._resultsOverlay.addChild(weaponsLabel);
    sy += 20;

    for (const ws of s.weapons) {
      const def = WEAPON_DEFS[ws.id];
      const t = new Text({
        text: `${def.name} Lv.${ws.level}${ws.evolved ? " [EVOLVED]" : ""}`,
        style: STYLE_CHAR_DESC,
      });
      t.anchor.set(0.5, 0);
      t.position.set(sw / 2, sy);
      this._resultsOverlay.addChild(t);
      sy += 18;
    }

    // Return button
    const btnW = 200;
    const btnH = 44;
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.position.set((sw - btnW) / 2, cy + cardH - 60);
    const btnBg = new Graphics()
      .roundRect(0, 0, btnW, btnH, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, btnW, btnH, 6)
      .stroke({ color: 0x4488cc, width: 2 });
    btn.addChild(btnBg);
    const btnLabel = new Text({ text: "RETURN TO MENU", style: STYLE_BTN });
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(btnW / 2, btnH / 2);
    btn.addChild(btnLabel);
    btn.on("pointerdown", () => window.location.reload());
    btn.on("pointerover", () => { btnBg.tint = 0xaaddff; });
    btn.on("pointerout", () => { btnBg.tint = 0xffffff; });
    this._resultsOverlay.addChild(btn);

    viewManager.addToLayer("ui", this._resultsOverlay);
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  private _syncCamera(): void {
    const cam = viewManager.camera;
    const px = this._state.player.position.x * TS;
    const py = this._state.player.position.y * TS;

    // Smooth follow
    const targetX = -px + cam.screenW / (2 * cam.zoom);
    const targetY = -py + cam.screenH / (2 * cam.zoom);
    cam.x += (targetX - cam.x) * 0.12;
    cam.y += (targetY - cam.y) * 0.12;

    // Screen shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= DT;
      const shake = this._shakeIntensity * (this._shakeTimer / 0.2);
      cam.x += (Math.random() * 2 - 1) * shake;
      cam.y += (Math.random() * 2 - 1) * shake;
    }
  }

  // ---------------------------------------------------------------------------
  // Visual FX
  // ---------------------------------------------------------------------------

  private _spawnDamageNumbers(): void {
    for (const dn of this._pendingDmgNumbers) {
      const text = new Text({
        text: dn.isHeal ? `+${Math.ceil(dn.amount)}` : `-${Math.ceil(dn.amount)}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: dn.isCrit ? 16 : 12,
          fill: dn.isHeal ? 0x44ff44 : dn.isCrit ? 0xffd700 : 0xff4444,
          fontWeight: dn.isCrit ? "bold" : "normal",
        }),
      });
      text.anchor.set(0.5, 0.5);
      text.position.set(dn.x * TS + (Math.random() * 20 - 10), dn.y * TS - 20);
      this._dmgNumberContainer.addChild(text);
      this._dmgNumbers.push({ text, lifetime: 0.8, vy: -40 });
    }
    this._pendingDmgNumbers = [];
  }

  private _updateDamageNumbers(dt: number): void {
    for (let i = this._dmgNumbers.length - 1; i >= 0; i--) {
      const dn = this._dmgNumbers[i];
      dn.lifetime -= dt;
      dn.text.position.y += dn.vy * dt;
      dn.text.alpha = Math.max(0, dn.lifetime / 0.5);
      if (dn.lifetime <= 0) {
        this._dmgNumberContainer.removeChild(dn.text);
        dn.text.destroy();
        this._dmgNumbers.splice(i, 1);
      }
    }
  }

  private _spawnWeaponFx(): void {
    for (const fx of this._pendingWeaponFx) {
      // AoE pulse ring
      const ring = new Graphics()
        .circle(0, 0, fx.radius * TS * 0.3)
        .stroke({ color: fx.color, width: 2, alpha: 0.7 });
      ring.position.set(fx.x * TS, fx.y * TS);
      this._weaponFxContainer.addChild(ring);
      this._weaponFxParticles.push({ gfx: ring, lifetime: 0.4, vx: 0, vy: 0, startAlpha: 0.7 });

      // Sparks
      for (let i = 0; i < 4; i++) {
        const spark = new Graphics().circle(0, 0, 2).fill({ color: fx.color });
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 40;
        spark.position.set(fx.x * TS, fx.y * TS);
        this._weaponFxContainer.addChild(spark);
        this._weaponFxParticles.push({
          gfx: spark,
          lifetime: 0.3 + Math.random() * 0.2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          startAlpha: 1,
        });
      }
    }
    this._pendingWeaponFx = [];
  }

  private _updateWeaponFx(dt: number): void {
    for (let i = this._weaponFxParticles.length - 1; i >= 0; i--) {
      const p = this._weaponFxParticles[i];
      p.lifetime -= dt;
      p.gfx.position.x += p.vx * dt;
      p.gfx.position.y += p.vy * dt;
      p.gfx.alpha = p.startAlpha * Math.max(0, p.lifetime / 0.4);
      // Scale up rings
      if (p.vx === 0 && p.vy === 0) {
        const scale = 1 + (1 - p.lifetime / 0.4) * 2;
        p.gfx.scale.set(scale);
      }
      if (p.lifetime <= 0) {
        this._weaponFxContainer.removeChild(p.gfx);
        p.gfx.destroy();
        this._weaponFxParticles.splice(i, 1);
      }
    }
  }

  private _renderOrbitingWeapons(s: SurvivorState): void {
    // Cleanup old
    for (const g of this._orbitGfx) {
      this._weaponFxContainer.removeChild(g);
      g.destroy();
    }
    this._orbitGfx = [];

    const px = s.player.position.x * TS;
    const py = s.player.position.y * TS;
    const time = s.gameTime;

    for (const ws of s.weapons) {
      if (ws.id === "fireball_ring" || ws.id === "spinning_blade") {
        const def = WEAPON_DEFS[ws.id];
        const count = def.baseCount + def.countPerLevel * (ws.level - 1);
        const radius = (def.baseArea + def.areaPerLevel * (ws.level - 1)) * s.player.areaMultiplier * TS * 0.6;
        const speed = ws.id === "spinning_blade" ? 4 : 2;

        for (let i = 0; i < count; i++) {
          const angle = time * speed + (i * Math.PI * 2) / count;
          const ox = Math.cos(angle) * radius;
          const oy = Math.sin(angle) * radius;

          const g = new Graphics();
          if (ws.id === "fireball_ring") {
            g.circle(0, 0, 5).fill({ color: 0xff6600, alpha: 0.9 });
            g.circle(0, 0, 3).fill({ color: 0xffcc00, alpha: 0.8 });
          } else {
            // Blade
            g.rect(-6, -2, 12, 4).fill({ color: 0xcccccc, alpha: 0.9 });
            g.rotation = angle;
          }
          g.position.set(px + ox, py + oy);
          this._weaponFxContainer.addChild(g);
          this._orbitGfx.push(g);
        }
      } else if (ws.id === "holy_circle") {
        // Pulsing aura
        const radius = (WEAPON_DEFS[ws.id].baseArea + WEAPON_DEFS[ws.id].areaPerLevel * (ws.level - 1)) * s.player.areaMultiplier * TS * 0.6;
        const pulse = 0.7 + Math.sin(time * 3) * 0.3;
        const g = new Graphics()
          .circle(0, 0, radius * pulse)
          .stroke({ color: 0xffd700, width: 1.5, alpha: 0.3 });
        g.position.set(px, py);
        this._weaponFxContainer.addChild(g);
        this._orbitGfx.push(g);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(dt: number): void {
    const s = this._state;

    // Player sprite
    const px = s.player.position.x * TS;
    const py = s.player.position.y * TS;
    this._playerContainer.position.set(px, py);

    if (this._playerSprite) {
      this._playerSprite.alpha = s.player.invincibilityTimer > 0
        ? (Math.sin(s.gameTime * 20) > 0 ? 0.3 : 0.8)
        : 1.0;

      const isMoving = s.input.left || s.input.right || s.input.up || s.input.down;
      const targetFrames = animationManager.getFrames(
        s.player.characterDef.unitType,
        isMoving ? UnitState.MOVE : UnitState.IDLE,
      );
      if (targetFrames.length > 0 && this._playerSprite.textures !== targetFrames) {
        this._playerSprite.textures = targetFrames;
        this._playerSprite.play();
      }

      if (s.input.left) this._playerSprite.scale.x = -Math.abs(this._playerSprite.scale.x);
      else if (s.input.right) this._playerSprite.scale.x = Math.abs(this._playerSprite.scale.x);
    }

    // Render entities
    this._renderEnemies(s);
    this._renderGems(s);
    this._renderChests(s);
    this._renderProjectiles(s);
    this._renderOrbitingWeapons(s);

    // VFX
    this._spawnDamageNumbers();
    this._updateDamageNumbers(dt);
    this._spawnWeaponFx();
    this._updateWeaponFx(dt);

    // HUD
    this._updateHUD();
    this._updateNotifications(dt);

    // Camera
    this._syncCamera();
  }

  private _renderEnemies(s: SurvivorState): void {
    const activeIds = new Set<number>();

    for (const enemy of s.enemies) {
      activeIds.add(enemy.id);
      let view = this._enemyViews.get(enemy.id);

      if (!view) {
        const container = new Container();
        let sprite: AnimatedSprite | null = null;

        const frames = animationManager.getFrames(enemy.type, UnitState.MOVE);
        if (frames.length > 0) {
          sprite = new AnimatedSprite(frames);
          sprite.animationSpeed = 0.12;
          sprite.play();
          sprite.anchor.set(0.5, 0.75);
          const unitDef = UNIT_DEFINITIONS[enemy.type];
          const scale = enemy.isBoss ? SurvivorBalance.BOSS_SIZE_MULTIPLIER : 1.0;
          const defW = unitDef?.size?.width ?? 1;
          const defH = unitDef?.size?.height ?? 1;
          sprite.scale.set(scale * Math.max(defW, defH) * 0.8);
          container.addChild(sprite);
        }

        // Boss indicator glow
        if (enemy.isBoss) {
          const glow = new Graphics()
            .circle(0, -10, 24)
            .fill({ color: 0xff4444, alpha: 0.15 });
          container.addChildAt(glow, 0);
        }

        const hpBar = new Graphics();
        container.addChild(hpBar);

        this._enemyContainer.addChild(container);
        view = { container, sprite, hpBar };
        this._enemyViews.set(enemy.id, view);
      }

      view.container.position.set(enemy.position.x * TS, enemy.position.y * TS);
      view.container.zIndex = enemy.position.y;
      view.container.alpha = enemy.alive ? 1 : Math.max(0, enemy.deathTimer / 0.8);

      if (view.sprite) {
        const dx = s.player.position.x - enemy.position.x;
        view.sprite.scale.x = dx < 0 ? -Math.abs(view.sprite.scale.x) : Math.abs(view.sprite.scale.x);
        view.sprite.tint = enemy.hitTimer > 0 ? 0xff4444 : 0xffffff;
      }

      if (enemy.alive) {
        const hpRatio = enemy.hp / enemy.maxHp;
        const barW = enemy.isBoss ? 48 : 24;
        const barH = enemy.isBoss ? 5 : 3;
        const barY = -(enemy.isBoss ? 40 : 20);
        view.hpBar.clear()
          .rect(-barW / 2, barY, barW, barH).fill({ color: 0x330000 })
          .rect(-barW / 2, barY, barW * hpRatio, barH).fill({ color: hpRatio > 0.5 ? 0x22cc22 : hpRatio > 0.25 ? 0xccaa22 : 0xcc2222 });
        view.hpBar.visible = hpRatio < 1;
      } else {
        view.hpBar.visible = false;
        if (view.sprite) {
          const deathFrames = animationManager.getFrames(enemy.type, UnitState.DIE);
          if (deathFrames.length > 0 && view.sprite.textures !== deathFrames) {
            view.sprite.textures = deathFrames;
            view.sprite.loop = false;
            view.sprite.play();
          }
        }
      }
    }

    for (const [id, view] of this._enemyViews) {
      if (!activeIds.has(id)) {
        this._enemyContainer.removeChild(view.container);
        view.container.destroy({ children: true });
        this._enemyViews.delete(id);
      }
    }

    this._enemyContainer.sortChildren();
  }

  private _renderGems(s: SurvivorState): void {
    const activeIds = new Set<number>();

    for (const gem of s.gems) {
      if (!gem.alive) continue;
      activeIds.add(gem.id);
      let view = this._gemViews.get(gem.id);

      if (!view) {
        const color = SurvivorBalance.GEM_COLORS[gem.tier] ?? 0x44ff44;
        view = new Graphics();
        const sz = 3 + gem.tier;
        view.moveTo(0, -sz).lineTo(sz, 0).lineTo(0, sz).lineTo(-sz, 0).closePath().fill({ color });
        // Glow
        view.circle(0, 0, sz + 1).fill({ color, alpha: 0.2 });
        this._gemContainer.addChild(view);
        this._gemViews.set(gem.id, view);
      }

      view.position.set(gem.position.x * TS, gem.position.y * TS);
      // Gentle bob
      view.position.y += Math.sin(s.gameTime * 4 + gem.id) * 2;
    }

    for (const [id, view] of this._gemViews) {
      if (!activeIds.has(id)) {
        this._gemContainer.removeChild(view);
        view.destroy();
        this._gemViews.delete(id);
      }
    }
  }

  private _renderChests(s: SurvivorState): void {
    const activeIds = new Set<number>();

    for (const chest of s.chests) {
      if (!chest.alive) continue;
      activeIds.add(chest.id);
      let view = this._chestViews.get(chest.id);

      if (!view) {
        view = new Graphics();
        const color = chest.type === "gold" ? 0xffd700 : chest.type === "heal" ? 0x44ff44 : 0xff4444;
        // Chest body
        view.roundRect(-8, -6, 16, 12, 2).fill({ color: 0x8b4513 });
        // Lid
        view.roundRect(-9, -8, 18, 5, 2).fill({ color: 0xa0522d });
        // Lock/gem
        view.circle(0, -2, 3).fill({ color });
        // Glow
        view.circle(0, 0, 14).fill({ color, alpha: 0.15 });
        this._gemContainer.addChild(view);
        this._chestViews.set(chest.id, view);
      }

      view.position.set(chest.position.x * TS, chest.position.y * TS);
      // Gentle pulse
      const pulse = 1 + Math.sin(s.gameTime * 3 + chest.id) * 0.08;
      view.scale.set(pulse);
    }

    for (const [id, view] of this._chestViews) {
      if (!activeIds.has(id)) {
        this._gemContainer.removeChild(view);
        view.destroy();
        this._chestViews.delete(id);
      }
    }
  }

  private _renderProjectiles(s: SurvivorState): void {
    this._projectileContainer.removeChildren();
    for (const proj of s.projectiles) {
      const def = WEAPON_DEFS[proj.weaponId];
      const g = new Graphics();
      // Arrow-like shape
      const color = def?.color ?? 0xffffff;
      g.circle(0, 0, 3).fill({ color });
      g.circle(0, 0, 5).fill({ color, alpha: 0.3 });
      g.position.set(proj.position.x * TS, proj.position.y * TS);
      this._projectileContainer.addChild(g);
    }
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(rawDt: number): void {
    if (!this._state) return;

    // Show level-up if pending
    if (this._state.levelUpPending && this._levelUpOverlay.children.length === 0) {
      this._showLevelUp();
    }

    // Show results if game over
    if (this._state.gameOver && this._resultsOverlay.children.length === 0) {
      this._showResults();
    }

    // Check for boss spawn warning
    if (this._state.bossTimer <= 3 && this._state.bossTimer + DT > 3) {
      this._bossWarningTimer = 3;
    }

    // Fixed timestep simulation
    if (!this._state.paused && !this._state.levelUpPending && !this._state.gameOver) {
      this._simAccumulator += rawDt;
      const maxDt = DT;
      while (this._simAccumulator >= maxDt) {
        this._simAccumulator -= maxDt;
        this._state.gameTime += maxDt;
        SurvivorInputSystem.update(this._state, maxDt);
        SurvivorWaveSystem.update(this._state, maxDt);
        SurvivorCombatSystem.update(this._state, maxDt);
        SurvivorPickupSystem.update(this._state, maxDt);
      }
    }

    // Always render
    this._render(rawDt);
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    SurvivorInputSystem.destroy();
    SurvivorCombatSystem.setDamageCallback(null);
    SurvivorCombatSystem.setWeaponFxCallback(null);
    SurvivorCombatSystem.setPlayerHitCallback(null);
    SurvivorPickupSystem.setChestCallback(null);
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }
    viewManager.clearWorld();
    viewManager.removeFromLayer("ui", this._hudContainer);
    viewManager.removeFromLayer("ui", this._levelUpOverlay);
    viewManager.removeFromLayer("ui", this._resultsOverlay);
    viewManager.removeFromLayer("ui", this._charSelectOverlay);
  }
}
