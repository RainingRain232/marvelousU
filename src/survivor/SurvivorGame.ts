// ---------------------------------------------------------------------------
// Survivor mode orchestrator — boots the game, runs the loop, manages views
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle, AnimatedSprite, Ticker } from "pixi.js";
import { UnitType, UnitState } from "@/types";
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

  // Player sprite
  private _playerSprite: AnimatedSprite | null = null;

  // Enemy views: id -> { container, sprite }
  private _enemyViews = new Map<number, { container: Container; sprite: AnimatedSprite | null; hpBar: Graphics }>();
  // Gem views: id -> Graphics
  private _gemViews = new Map<number, Graphics>();

  // HUD elements
  private _hudContainer = new Container();
  private _hpBarBg!: Graphics;
  private _hpBarFill!: Graphics;
  private _xpBarBg!: Graphics;
  private _xpBarFill!: Graphics;
  private _timerText!: Text;
  private _killText!: Text;
  private _levelText!: Text;
  // Level-up UI
  private _levelUpOverlay = new Container();

  // Results UI
  private _resultsOverlay = new Container();

  // Character select UI
  private _charSelectOverlay = new Container();

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();
    this._showCharacterSelect();
  }

  // ---------------------------------------------------------------------------
  // Character Select Screen
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
    title.position.set(sw / 2, 30);
    this._charSelectOverlay.addChild(title);

    // Character cards
    const unlockedChars = SURVIVOR_CHARACTERS.filter((c) => c.unlocked);
    const cardW = 200;
    const cardH = 220;
    const gap = 16;
    const totalW = unlockedChars.length * cardW + (unlockedChars.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const startY = 100;

    for (let i = 0; i < unlockedChars.length; i++) {
      const charDef = unlockedChars[i];
      const card = this._buildCharCard(charDef, cardW, cardH);
      card.position.set(startX + i * (cardW + gap), startY);
      this._charSelectOverlay.addChild(card);
    }

    viewManager.addToLayer("ui", this._charSelectOverlay);
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
      preview.position.set(w / 2, 60);
      preview.scale.set(2);
      card.addChild(preview);
    }

    // Name
    const nameText = new Text({ text: charDef.name, style: STYLE_CHAR_NAME });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(w / 2, 110);
    card.addChild(nameText);

    // Weapon
    const weaponDef = WEAPON_DEFS[charDef.startingWeapon];
    const weaponText = new Text({ text: weaponDef.name, style: STYLE_CHAR_DESC });
    weaponText.anchor.set(0.5, 0);
    weaponText.position.set(w / 2, 140);
    card.addChild(weaponText);

    // Description
    const descText = new Text({ text: charDef.description, style: STYLE_CHAR_DESC });
    descText.anchor.set(0.5, 0);
    descText.position.set(w / 2, 165);
    descText.style.wordWrap = true;
    descText.style.wordWrapWidth = w - 20;
    card.addChild(descText);

    // Click handler
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
    const mapDef = SURVIVOR_MAPS[0]; // default to meadow
    this._state = createSurvivorState(charDef, mapDef.mapType, mapDef.width, mapDef.height);

    // Setup world layers
    this._worldLayer.removeChildren();
    this._enemyContainer.removeChildren();
    this._gemContainer.removeChildren();
    this._projectileContainer.removeChildren();
    this._playerContainer.removeChildren();
    this._weaponFxContainer.removeChildren();
    this._enemyViews.clear();
    this._gemViews.clear();

    this._worldLayer.addChild(this._enemyContainer);
    this._worldLayer.addChild(this._gemContainer);
    this._worldLayer.addChild(this._projectileContainer);
    this._worldLayer.addChild(this._weaponFxContainer);
    this._worldLayer.addChild(this._playerContainer);

    viewManager.addToLayer("units", this._worldLayer);

    // Draw terrain
    const bf = {
      grid: this._buildSimpleGrid(mapDef.width, mapDef.height),
      width: mapDef.width,
      height: mapDef.height,
    };
    gridRenderer.init(viewManager);
    gridRenderer.draw(bf, mapDef.mapType);

    // Setup camera
    viewManager.camera.setMapSize(mapDef.width, mapDef.height);
    viewManager.camera.zoom = 1.5;
    this._syncCamera();

    // Create player sprite
    this._createPlayerSprite(charDef.unitType);

    // Build HUD
    this._buildHUD();

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
    const sw = viewManager.screenWidth;

    // HP bar
    const hpY = 10;
    this._hpBarBg = new Graphics().roundRect(10, hpY, 200, 16, 4).fill({ color: 0x330000 }).roundRect(10, hpY, 200, 16, 4).stroke({ color: 0x882222, width: 1 });
    this._hpBarFill = new Graphics().roundRect(10, hpY, 200, 16, 4).fill({ color: 0xcc2222 });
    this._hudContainer.addChild(this._hpBarBg, this._hpBarFill);

    // XP bar
    const xpY = 30;
    this._xpBarBg = new Graphics().roundRect(10, xpY, 200, 10, 3).fill({ color: 0x002233 }).roundRect(10, xpY, 200, 10, 3).stroke({ color: 0x224488, width: 1 });
    this._xpBarFill = new Graphics().roundRect(10, xpY, 200, 10, 3).fill({ color: 0x4488ff });
    this._hudContainer.addChild(this._xpBarBg, this._xpBarFill);

    // Timer
    this._timerText = new Text({ text: "00:00", style: STYLE_HUD });
    this._timerText.anchor.set(0.5, 0);
    this._timerText.position.set(sw / 2, 10);
    this._hudContainer.addChild(this._timerText);

    // Kill count
    this._killText = new Text({ text: "Kills: 0", style: STYLE_HUD_SMALL });
    this._killText.anchor.set(1, 0);
    this._killText.position.set(sw - 10, 10);
    this._hudContainer.addChild(this._killText);

    // Level
    this._levelText = new Text({ text: "Lv.1", style: STYLE_HUD });
    this._levelText.position.set(215, 10);
    this._hudContainer.addChild(this._levelText);

    viewManager.addToLayer("ui", this._hudContainer);
  }

  private _updateHUD(): void {
    const s = this._state;
    const hpRatio = Math.max(0, s.player.hp / s.player.maxHp);
    const xpRatio = s.xpToNext > 0 ? Math.min(1, s.xp / s.xpToNext) : 0;

    // HP bar
    this._hpBarFill.clear().roundRect(10, 10, 200 * hpRatio, 16, 4).fill({ color: hpRatio > 0.3 ? 0xcc2222 : 0xff0000 });

    // XP bar
    this._xpBarFill.clear().roundRect(10, 30, 200 * xpRatio, 10, 3).fill({ color: 0x4488ff });

    // Timer
    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    this._timerText.text = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    // Kills
    this._killText.text = `Kills: ${s.totalKills}`;

    // Level
    this._levelText.text = `Lv.${s.level}`;
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

      // Type badge
      const badge = new Text({
        text: choice.isNew ? "NEW" : `Lv.${choice.level}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: choice.isNew ? 0x44ff44 : 0xffd700, fontWeight: "bold" }),
      });
      badge.anchor.set(1, 0);
      badge.position.set(cardW - 10, 8);
      card.addChild(badge);

      // Name
      const name = new Text({ text: choice.name, style: STYLE_CHOICE });
      name.position.set(10, 10);
      card.addChild(name);

      // Type
      const typeLabel = new Text({
        text: choice.type === "weapon" ? "WEAPON" : "PASSIVE",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: choice.type === "weapon" ? 0xff8844 : 0x44aaff }),
      });
      typeLabel.position.set(10, 32);
      card.addChild(typeLabel);

      // Description
      const desc = new Text({ text: choice.description, style: STYLE_CHOICE_DESC });
      desc.position.set(10, 50);
      desc.style.wordWrap = true;
      desc.style.wordWrapWidth = cardW - 20;
      card.addChild(desc);

      card.on("pointerdown", () => {
        this._selectUpgrade(choice);
      });
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

    // Check if another level-up is pending (multiple levels at once)
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

    // Dim
    const dim = new Graphics().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });
    this._resultsOverlay.addChild(dim);

    // Card
    const cardW = 400;
    const cardH = 360;
    const cx = (sw - cardW) / 2;
    const cy = (sh - cardH) / 2;
    const card = new Graphics()
      .roundRect(cx, cy, cardW, cardH, 12)
      .fill({ color: 0x0a0a18, alpha: 0.95 })
      .roundRect(cx, cy, cardW, cardH, 12)
      .stroke({ color: 0xff4444, width: 2 });
    this._resultsOverlay.addChild(card);

    // Title
    const title = new Text({ text: "DEFEATED", style: STYLE_RESULT_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, cy + 20);
    this._resultsOverlay.addChild(title);

    // Stats
    const mins = Math.floor(s.gameTime / 60);
    const secs = Math.floor(s.gameTime % 60);
    const stats = [
      `Time Survived:  ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      `Enemies Killed: ${s.totalKills}`,
      `Level Reached:  ${s.level}`,
      `Damage Dealt:   ${Math.floor(s.totalDamageDealt)}`,
      `Gold Earned:    ${s.gold}`,
      `Character:      ${s.player.characterDef.name}`,
    ];

    let sy = cy + 80;
    for (const stat of stats) {
      const t = new Text({ text: stat, style: STYLE_RESULT_STAT });
      t.anchor.set(0.5, 0);
      t.position.set(sw / 2, sy);
      this._resultsOverlay.addChild(t);
      sy += 28;
    }

    // Weapons summary
    sy += 10;
    const weaponsLabel = new Text({ text: "Weapons:", style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffd700 }) });
    weaponsLabel.anchor.set(0.5, 0);
    weaponsLabel.position.set(sw / 2, sy);
    this._resultsOverlay.addChild(weaponsLabel);
    sy += 22;

    for (const ws of s.weapons) {
      const def = WEAPON_DEFS[ws.id];
      const t = new Text({
        text: `${def.name} Lv.${ws.level}${ws.evolved ? " (EVOLVED)" : ""}`,
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
    // Center camera on player
    cam.x = -px + cam.screenW / (2 * cam.zoom);
    cam.y = -py + cam.screenH / (2 * cam.zoom);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(): void {
    const s = this._state;

    // Update player sprite position
    const px = s.player.position.x * TS;
    const py = s.player.position.y * TS;
    this._playerContainer.position.set(px, py);

    // Flash on invincibility
    if (this._playerSprite) {
      this._playerSprite.alpha = s.player.invincibilityTimer > 0 ? 0.5 : 1.0;

      // Sync animation to movement
      const isMoving = s.input.left || s.input.right || s.input.up || s.input.down;
      const targetFrames = animationManager.getFrames(
        s.player.characterDef.unitType,
        isMoving ? UnitState.MOVE : UnitState.IDLE,
      );
      if (targetFrames.length > 0 && this._playerSprite.textures !== targetFrames) {
        this._playerSprite.textures = targetFrames;
        this._playerSprite.play();
      }

      // Facing
      if (s.input.left) this._playerSprite.scale.x = -Math.abs(this._playerSprite.scale.x);
      else if (s.input.right) this._playerSprite.scale.x = Math.abs(this._playerSprite.scale.x);
    }

    // Render enemies
    this._renderEnemies(s);

    // Render gems
    this._renderGems(s);

    // Render projectiles
    this._renderProjectiles(s);

    // Update HUD
    this._updateHUD();

    // Camera follow
    this._syncCamera();
  }

  private _renderEnemies(s: SurvivorState): void {
    // Track which IDs are still present
    const activeIds = new Set<number>();

    for (const enemy of s.enemies) {
      activeIds.add(enemy.id);
      let view = this._enemyViews.get(enemy.id);

      if (!view) {
        // Create new enemy view
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

        // HP bar
        const hpBar = new Graphics();
        container.addChild(hpBar);

        this._enemyContainer.addChild(container);
        view = { container, sprite, hpBar };
        this._enemyViews.set(enemy.id, view);
      }

      // Update position
      view.container.position.set(enemy.position.x * TS, enemy.position.y * TS);
      view.container.zIndex = enemy.position.y;
      view.container.alpha = enemy.alive ? 1 : Math.max(0, enemy.deathTimer / 0.8);

      // Facing — look toward player
      if (view.sprite) {
        const dx = s.player.position.x - enemy.position.x;
        view.sprite.scale.x = dx < 0 ? -Math.abs(view.sprite.scale.x) : Math.abs(view.sprite.scale.x);
        // Hit flash
        view.sprite.tint = enemy.hitTimer > 0 ? 0xff4444 : 0xffffff;
      }

      // HP bar
      if (enemy.alive) {
        const hpRatio = enemy.hp / enemy.maxHp;
        const barW = enemy.isBoss ? 48 : 24;
        const barH = 3;
        const barY = -(enemy.isBoss ? 40 : 20);
        view.hpBar.clear()
          .rect(-barW / 2, barY, barW, barH).fill({ color: 0x330000 })
          .rect(-barW / 2, barY, barW * hpRatio, barH).fill({ color: hpRatio > 0.5 ? 0x22cc22 : hpRatio > 0.25 ? 0xccaa22 : 0xcc2222 });
        view.hpBar.visible = hpRatio < 1;
      } else {
        view.hpBar.visible = false;
        // Switch to death animation
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

    // Remove stale views
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
        // Diamond shape
        const sz = 3 + gem.tier;
        view.moveTo(0, -sz).lineTo(sz, 0).lineTo(0, sz).lineTo(-sz, 0).closePath().fill({ color });
        this._gemContainer.addChild(view);
        this._gemViews.set(gem.id, view);
      }

      view.position.set(gem.position.x * TS, gem.position.y * TS);
    }

    // Remove stale
    for (const [id, view] of this._gemViews) {
      if (!activeIds.has(id)) {
        this._gemContainer.removeChild(view);
        view.destroy();
        this._gemViews.delete(id);
      }
    }
  }

  private _renderProjectiles(s: SurvivorState): void {
    // Simple: rebuild every frame (projectiles are short-lived)
    this._projectileContainer.removeChildren();
    for (const proj of s.projectiles) {
      const g = new Graphics();
      const def = WEAPON_DEFS[proj.weaponId];
      g.circle(0, 0, 3).fill({ color: def?.color ?? 0xffffff });
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
    this._render();
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    SurvivorInputSystem.destroy();
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
