// JRPG-style turn-based battle view — animated sprites from AnimationManager
import { Container, Graphics, Text, AnimatedSprite } from "pixi.js";
import { TurnBattlePhase, TurnBattleAction, UnitState, UpgradeType, RPGElementType } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";
import type { TurnBattleState, TurnBattleCombatant } from "@rpg/state/TurnBattleState";
import type { RPGState } from "@rpg/state/RPGState";
import { animationManager } from "@view/animation/AnimationManager";
import { getAbilityName, getAbilityMpCost, getAbilityDescription, canUseAbility, getEffectiveSpeed, getSpellName, getSpellMpCost, getSpellDescription, canCastSpell } from "@rpg/systems/TurnBattleSystem";
import { drawTerrainDecorationAt } from "@view/world/WorldMapRenderer";
import { TerrainType } from "@world/config/TerrainDefs";
import { ELEMENT_COLORS } from "@rpg/config/ElementDefs";
import { t } from "@/i18n/i18n";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const ENEMY_AREA_Y = 130;
const PARTY_AREA_Y_OFFSET = 170; // from bottom
const HP_BAR_WIDTH = 100;
const HP_BAR_HEIGHT = 8;
const MP_BAR_HEIGHT = 5;
const LB_BAR_HEIGHT = 5;
const COMBATANT_SPACING = 140;
const SPRITE_DISPLAY_SIZE = 80;
const TWEEN_DISTANCE = 40;
const TWEEN_DURATION_MS = 200;

// ---------------------------------------------------------------------------
// Per-combatant sprite entry
// ---------------------------------------------------------------------------

interface BattleSpriteEntry {
  sprite: AnimatedSprite;
  wrapper: Container;
  barsContainer: Container;
  baseX: number;
  baseY: number;
  currentState: UnitState;
  isDead: boolean;
  isParty: boolean;
  tweening: boolean;
  /** Limit gauge bar Graphics for pulse animation when full. */
  lbBarFill?: Graphics;
}

// ---------------------------------------------------------------------------
// TurnBattleView
// ---------------------------------------------------------------------------

export class TurnBattleView {
  private vm!: ViewManager;
  private battleState!: TurnBattleState;
  _rpg!: RPGState;

  private bgContainer = new Container();
  private combatantsContainer = new Container();
  private menuContainer = new Container();
  private logContainer = new Container();
  private turnIndicatorContainer = new Container();
  private turnOrderContainer = new Container();

  private _bgGraphic = new Graphics();
  private _menuTexts: Text[] = [];
  private _logText!: Text;
  private _turnIndicator!: Text;
  private _turnArrow: Graphics | null = null;
  private _turnArrowTick = 0;
  private _turnArrowInterval: ReturnType<typeof setInterval> | null = null;

  private _spriteMap = new Map<string, BattleSpriteEntry>();

  private _selectedMenuIndex = 0;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _unsubs: Array<() => void> = [];
  /** Track all active animation intervals so they can be cleared on destroy. */
  private _activeIntervals: Set<ReturnType<typeof setInterval>> = new Set();

  // --- Battle speed toggle ---
  private _speedButtonContainer = new Container();
  private _battleSpeed: 1 | 2 | 4 = 1;

  // --- Log scroll state ---
  private _logScrollOffset = 0;
  private _onLogWheel: ((e: WheelEvent) => void) | null = null;

  // --- LB pulse interval ---
  private _lbPulseInterval: ReturnType<typeof setInterval> | null = null;
  private _lbPulseTick = 0;

  // --- VFX container for spell particle effects ---
  private _vfxContainer = new Container();

  // Callbacks for input
  onActionSelected: ((action: TurnBattleAction) => void) | null = null;
  onTargetSelected: ((targetId: string) => void) | null = null;
  onItemSelected: ((itemId: string) => void) | null = null;
  onHelpRequested: (() => void) | null = null;
  /** Called when a learned spell is selected (instead of legacy ability). */
  onSpellSelected: ((spellId: UpgradeType) => void) | null = null;
  private _targetIndex = 0;
  private _selectableTargets: TurnBattleCombatant[] = [];
  private _itemPickMode = false;
  private _itemPickIndex = 0;
  /** Spell picker sub-menu state. */
  private _spellPickMode = false;
  private _spellPickIndex = 0;

  init(vm: ViewManager, battleState: TurnBattleState, rpg: RPGState): void {
    this.vm = vm;
    this.battleState = battleState;
    this._rpg = rpg;

    // Background
    this._drawBackground();
    this.bgContainer.addChild(this._bgGraphic);
    vm.addToLayer("background", this.bgContainer);

    // Combatants
    vm.addToLayer("units", this.combatantsContainer);

    // Menu
    vm.addToLayer("ui", this.menuContainer);

    // Log
    this._logText = new Text({
      text: "",
      style: { fontFamily: "monospace", fontSize: 12, fill: 0xcccccc, wordWrap: true, wordWrapWidth: 300 },
    });
    this._logText.position.set(vm.screenWidth - 320, 20);
    this.logContainer.addChild(this._logText);
    vm.addToLayer("ui", this.logContainer);

    // Turn indicator
    this._turnIndicator = new Text({
      text: "",
      style: { fontFamily: "monospace", fontSize: 14, fill: 0xffcc00, fontWeight: "bold" },
    });
    this._turnIndicator.anchor.set(0.5, 0);
    this._turnIndicator.position.set(vm.screenWidth / 2, 10);
    this.turnIndicatorContainer.addChild(this._turnIndicator);
    vm.addToLayer("ui", this.turnIndicatorContainer);

    // Turn order bar
    vm.addToLayer("ui", this.turnOrderContainer);

    // VFX layer (above combatants)
    vm.addToLayer("units", this._vfxContainer);

    // Battle speed toggle button
    this._battleSpeed = rpg.battleSpeed ?? 1;
    this._drawSpeedButton();
    vm.addToLayer("ui", this._speedButtonContainer);

    // LB pulse interval
    this._lbPulseTick = 0;
    this._lbPulseInterval = setInterval(() => {
      this._lbPulseTick++;
      for (const [id, entry] of this._spriteMap) {
        if (entry.lbBarFill) {
          const c = this.battleState.combatants.find(cb => cb.id === id);
          if (c && c.limitGauge >= 100) {
            entry.lbBarFill.alpha = 0.6 + 0.4 * Math.sin(this._lbPulseTick * 0.15);
          }
        }
      }
    }, 50);
    this._activeIntervals.add(this._lbPulseInterval);

    // Disable camera panning
    vm.camera.x = 0;
    vm.camera.y = 0;
    vm.camera.zoom = 1;

    // Create animated sprites for all combatants
    this._createCombatantSprites();
    this._updateBars();
    this._drawMenu();
    this._updateLog();
    this._updateTurnIndicator();
    this._drawTurnOrder();
    this._setupInput();

    // Listen for battle events
    this._unsubs.push(EventBus.on("rpgTurnBattleDamage", (e) => {
      this._onDamage(e.targetId, e.damage);
      this._updateBars();
      this._updateLog();

      // Screen shake on critical hit
      if (e.isCritical) {
        this._screenShake();
      }

      // Spell/ability VFX based on attacker element
      const attacker = this.battleState.combatants.find(c => c.id === e.attackerId);
      if (attacker) {
        const targetEntry = this._spriteMap.get(e.targetId);
        if (targetEntry) {
          this._spawnElementVFX(attacker.element, targetEntry.baseX, targetEntry.baseY, e.damage < 0);
        }
      }
    }));

    this._unsubs.push(EventBus.on("rpgTurnBattleAction", (e) => {
      this._onAction(e.combatantId, e.action);
      this._updateBars();
      this._drawMenu();
      this._updateLog();
      this._drawTurnOrder();
    }));
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];

    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }

    if (this._turnArrowInterval) {
      clearInterval(this._turnArrowInterval);
      this._turnArrowInterval = null;
    }

    if (this._lbPulseInterval) {
      clearInterval(this._lbPulseInterval);
      this._activeIntervals.delete(this._lbPulseInterval);
      this._lbPulseInterval = null;
    }

    if (this._onLogWheel) {
      window.removeEventListener("wheel", this._onLogWheel);
      this._onLogWheel = null;
    }

    // Clear all animation intervals (damage floats, attack tweens, etc.)
    for (const id of this._activeIntervals) clearInterval(id);
    this._activeIntervals.clear();

    this.vm.removeFromLayer("background", this.bgContainer);
    this.vm.removeFromLayer("units", this.combatantsContainer);
    this.vm.removeFromLayer("ui", this.menuContainer);
    this.vm.removeFromLayer("ui", this.logContainer);
    this.vm.removeFromLayer("ui", this.turnIndicatorContainer);
    this.vm.removeFromLayer("ui", this.turnOrderContainer);
    this.vm.removeFromLayer("ui", this._speedButtonContainer);
    this.vm.removeFromLayer("units", this._vfxContainer);

    this.bgContainer.destroy({ children: true });
    this.combatantsContainer.destroy({ children: true });
    this.menuContainer.destroy({ children: true });
    this.logContainer.destroy({ children: true });
    this.turnIndicatorContainer.destroy({ children: true });
    this.turnOrderContainer.destroy({ children: true });
    this._speedButtonContainer.destroy({ children: true });
    this._vfxContainer.destroy({ children: true });

    this._spriteMap.clear();
  }

  /** Called by the battle system to refresh the view after state changes. */
  refresh(): void {
    this._itemPickMode = false;
    this._updateBars();
    this._drawMenu();
    this._updateLog();
    this._updateTurnIndicator();
    this._drawTurnOrder();
  }

  // ---------------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------------

  private _drawBackground(): void {
    this._bgGraphic.clear();
    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;
    const ctx = this.battleState.battleContext;
    const palette = _getBattlePalette(ctx);
    const stripes = 20;
    const stripeH = Math.ceil(H / stripes);

    for (let i = 0; i < stripes; i++) {
      const t = i / (stripes - 1);
      const color = _lerpColor(palette.top, palette.bottom, t);
      this._bgGraphic.rect(0, i * stripeH, W, stripeH + 1);
      this._bgGraphic.fill({ color });
    }

    // Ground region (lower 40%)
    const groundY = H * 0.6;
    this._bgGraphic.rect(0, groundY, W, H - groundY);
    this._bgGraphic.fill({ color: palette.ground, alpha: 0.4 });

    // Terrain decorations on the ground area using the world map renderer
    const terrain = _biomeToTerrain(ctx);
    if (terrain) {
      // Tile decorations across the ground in a grid pattern
      const spacing = 80;
      const cols = Math.ceil(W / spacing) + 1;
      const rows = Math.ceil((H - groundY) / spacing) + 1;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * spacing + (row % 2 === 0 ? 0 : spacing * 0.5);
          const cy = groundY + row * spacing * 0.8 + spacing * 0.3;
          drawTerrainDecorationAt(this._bgGraphic, terrain, cx, cy);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sprite creation
  // ---------------------------------------------------------------------------

  private _createCombatantSprites(): void {
    const screenW = this.vm.screenWidth;
    const screenH = this.vm.screenHeight;
    const LINE_GAP = 70; // vertical gap between front and back lines

    // --- Enemies ---
    const enemyFront = this.battleState.combatants.filter(c => !c.isPartyMember && c.line === 1);
    const enemyBack = this.battleState.combatants.filter(c => !c.isPartyMember && c.line === 2);

    // Dynamic spacing to fit up to 10 enemies
    const maxEnemyLine = Math.max(enemyFront.length, enemyBack.length, 1);
    const enemySpacing = Math.min(COMBATANT_SPACING, (screenW - 60) / maxEnemyLine);

    // Back line (further from center = higher up)
    if (enemyBack.length > 0) {
      const startX = (screenW - enemyBack.length * enemySpacing) / 2;
      for (let i = 0; i < enemyBack.length; i++) {
        const x = startX + i * enemySpacing + enemySpacing / 2;
        this._createSpriteEntry(enemyBack[i], x, ENEMY_AREA_Y - LINE_GAP / 2, false);
      }
    }
    // Front line (closer to center = lower)
    {
      const startX = (screenW - enemyFront.length * enemySpacing) / 2;
      for (let i = 0; i < enemyFront.length; i++) {
        const x = startX + i * enemySpacing + enemySpacing / 2;
        this._createSpriteEntry(enemyFront[i], x, ENEMY_AREA_Y + LINE_GAP / 2, false);
      }
    }

    // --- Party ---
    const partyFront = this.battleState.combatants.filter(c => c.isPartyMember && c.line === 1);
    const partyBack = this.battleState.combatants.filter(c => c.isPartyMember && c.line === 2);
    const partyBaseY = screenH - PARTY_AREA_Y_OFFSET;

    // Front line (closer to center = higher up)
    {
      const startX = (screenW - partyFront.length * COMBATANT_SPACING) / 2;
      for (let i = 0; i < partyFront.length; i++) {
        const x = startX + i * COMBATANT_SPACING + COMBATANT_SPACING / 2;
        this._createSpriteEntry(partyFront[i], x, partyBaseY - LINE_GAP / 2, true);
      }
    }
    // Back line (further from center = lower)
    if (partyBack.length > 0) {
      const startX = (screenW - partyBack.length * COMBATANT_SPACING) / 2;
      for (let i = 0; i < partyBack.length; i++) {
        const x = startX + i * COMBATANT_SPACING + COMBATANT_SPACING / 2;
        this._createSpriteEntry(partyBack[i], x, partyBaseY + LINE_GAP / 2, true);
      }
    }

    // Line labels
    this._drawLineLabels(screenW, screenH, LINE_GAP);
  }

  private _drawLineLabels(_screenW: number, screenH: number, lineGap: number): void {
    const labelStyle = { fontFamily: "monospace", fontSize: 9, fill: 0x666688 };

    // Enemy labels
    const eFront = new Text({ text: t("rpg.front_label"), style: labelStyle });
    eFront.anchor.set(0, 0.5);
    eFront.position.set(4, ENEMY_AREA_Y + lineGap / 2);
    this.combatantsContainer.addChild(eFront);

    const eBack = new Text({ text: t("rpg.back_label"), style: labelStyle });
    eBack.anchor.set(0, 0.5);
    eBack.position.set(4, ENEMY_AREA_Y - lineGap / 2);
    this.combatantsContainer.addChild(eBack);

    // Party labels
    const partyBaseY = screenH - PARTY_AREA_Y_OFFSET;
    const pFront = new Text({ text: t("rpg.front_label"), style: labelStyle });
    pFront.anchor.set(0, 0.5);
    pFront.position.set(4, partyBaseY - lineGap / 2);
    this.combatantsContainer.addChild(pFront);

    const pBack = new Text({ text: t("rpg.back_label"), style: labelStyle });
    pBack.anchor.set(0, 0.5);
    pBack.position.set(4, partyBaseY + lineGap / 2);
    this.combatantsContainer.addChild(pBack);
  }

  private _createSpriteEntry(c: TurnBattleCombatant, x: number, y: number, isParty: boolean): void {
    const wrapper = new Container();
    wrapper.position.set(x, y);
    this.combatantsContainer.addChild(wrapper);

    // Shadow ellipse
    const shadow = new Graphics();
    shadow.ellipse(0, 10, 28, 8);
    shadow.fill({ color: 0x000000, alpha: 0.3 });
    wrapper.addChild(shadow);

    // Create animated sprite
    const frames = animationManager.getFrames(c.unitType, UnitState.IDLE);
    const sprite = new AnimatedSprite(frames);
    const frameSet = animationManager.getFrameSet(c.unitType, UnitState.IDLE);

    sprite.anchor.set(0.5, 0.75);
    sprite.width = SPRITE_DISPLAY_SIZE;
    sprite.height = SPRITE_DISPLAY_SIZE;
    sprite.animationSpeed = frameSet.fps / 60;
    sprite.loop = true;
    sprite.play();

    // Enemies face left, party faces right
    if (!isParty) {
      sprite.scale.x = -Math.abs(sprite.scale.x);
    }

    wrapper.addChild(sprite);

    // Bars container (positioned below the sprite)
    const barsContainer = new Container();
    barsContainer.position.set(0, 20);
    wrapper.addChild(barsContainer);

    // Name text
    const nameText = new Text({
      text: c.name,
      style: { fontFamily: "monospace", fontSize: 10, fill: 0xffffff },
    });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(0, 0);
    barsContainer.addChild(nameText);

    // Element icon (small colored circle next to name)
    const elemColor = ELEMENT_COLORS[c.element] ?? 0x999999;
    const elemIcon = new Graphics();
    elemIcon.circle(0, 0, 5);
    elemIcon.fill({ color: elemColor });
    // Position to the right of the name text
    elemIcon.position.set(nameText.width / 2 + 8, 5);
    barsContainer.addChild(elemIcon);

    const entry: BattleSpriteEntry = {
      sprite,
      wrapper,
      barsContainer,
      baseX: x,
      baseY: y,
      currentState: UnitState.IDLE,
      isDead: false,
      isParty,
      tweening: false,
    };

    this._spriteMap.set(c.id, entry);
  }

  // ---------------------------------------------------------------------------
  // Update bars (HP/MP) without recreating sprites
  // ---------------------------------------------------------------------------

  private _updateBars(): void {
    for (const c of this.battleState.combatants) {
      const entry = this._spriteMap.get(c.id);
      if (!entry) continue;

      // Clear old bar graphics (keep name text at index 0)
      while (entry.barsContainer.children.length > 1) {
        entry.barsContainer.removeChildAt(entry.barsContainer.children.length - 1).destroy();
      }

      const isDead = c.hp <= 0;

      // HP bar
      const hpBar = new Graphics();
      const hpRatio = Math.max(0, c.hp / c.maxHp);
      const barX = -HP_BAR_WIDTH / 2;
      const barY = 14;

      hpBar.rect(barX, barY, HP_BAR_WIDTH, HP_BAR_HEIGHT);
      hpBar.fill({ color: 0x333333 });
      hpBar.rect(barX, barY, HP_BAR_WIDTH * hpRatio, HP_BAR_HEIGHT);
      hpBar.fill({ color: hpRatio > 0.5 ? 0x44aa44 : hpRatio > 0.25 ? 0xaaaa44 : 0xaa4444 });
      entry.barsContainer.addChild(hpBar);

      // HP text
      const hpText = new Text({
        text: `${Math.max(0, Math.ceil(c.hp))}/${c.maxHp}`,
        style: { fontFamily: "monospace", fontSize: 9, fill: 0xffffff },
      });
      hpText.anchor.set(0.5, 0);
      hpText.position.set(0, barY + HP_BAR_HEIGHT + 1);
      entry.barsContainer.addChild(hpText);

      // MP bar (party only)
      if (entry.isParty) {
        const mpBarY = barY + HP_BAR_HEIGHT + 14;
        const mpRatio = c.maxMp > 0 ? Math.max(0, c.mp / c.maxMp) : 0;
        hpBar.rect(barX, mpBarY, HP_BAR_WIDTH, MP_BAR_HEIGHT);
        hpBar.fill({ color: 0x222233 });
        hpBar.rect(barX, mpBarY, HP_BAR_WIDTH * mpRatio, MP_BAR_HEIGHT);
        hpBar.fill({ color: 0x4444cc });

        const mpText = new Text({
          text: `MP ${Math.max(0, Math.ceil(c.mp))}/${c.maxMp}`,
          style: { fontFamily: "monospace", fontSize: 8, fill: 0x8888ff },
        });
        mpText.anchor.set(0.5, 0);
        mpText.position.set(0, mpBarY + MP_BAR_HEIGHT + 1);
        entry.barsContainer.addChild(mpText);

        // Limit Gauge bar (below MP bar)
        const lbBarY = mpBarY + MP_BAR_HEIGHT + 12;
        const lbRatio = Math.max(0, Math.min(1, (c.limitGauge ?? 0) / 100));
        const lbBg = new Graphics();
        lbBg.rect(barX, lbBarY, HP_BAR_WIDTH, LB_BAR_HEIGHT);
        lbBg.fill({ color: 0x332200 });
        entry.barsContainer.addChild(lbBg);

        const lbFill = new Graphics();
        lbFill.rect(barX, lbBarY, HP_BAR_WIDTH * lbRatio, LB_BAR_HEIGHT);
        lbFill.fill({ color: lbRatio >= 1 ? 0xff8800 : 0xcc8800 });
        entry.barsContainer.addChild(lbFill);
        entry.lbBarFill = lbRatio >= 1 ? lbFill : undefined;

        const lbLabel = new Text({
          text: "LB",
          style: { fontFamily: "monospace", fontSize: 7, fill: 0xffaa44 },
        });
        lbLabel.anchor.set(1, 0.5);
        lbLabel.position.set(barX - 3, lbBarY + LB_BAR_HEIGHT / 2);
        entry.barsContainer.addChild(lbLabel);
      }

      // Defend tint
      if (c.isDefending && !isDead) {
        entry.sprite.tint = 0x88aacc;
      } else {
        entry.sprite.tint = 0xffffff;
      }

      // Target selection highlight
      if (this.battleState.phase === TurnBattlePhase.SELECT_TARGET) {
        const targetC = this._selectableTargets[this._targetIndex];
        if (targetC && targetC.id === c.id) {
          const ring = new Graphics();
          ring.circle(0, -10, 44);
          ring.stroke({ color: 0xffcc00, width: 3, alpha: 0.8 });
          entry.barsContainer.addChild(ring);
        }
      }

      // Status effect icons
      if (c.statusEffects.length > 0 && !isDead) {
        const iconY = entry.isParty ? barY + HP_BAR_HEIGHT + 30 : barY + HP_BAR_HEIGHT + 14;
        for (let si = 0; si < c.statusEffects.length; si++) {
          const se = c.statusEffects[si];
          const iconX = barX + si * 16;
          const iconG = new Graphics();
          iconG.circle(iconX + 6, iconY, 5);
          iconG.fill({ color: _statusColor(se.type) });
          entry.barsContainer.addChild(iconG);

          const label = new Text({
            text: _statusAbbrev(se.type),
            style: { fontFamily: "monospace", fontSize: 7, fill: 0xffffff },
          });
          label.anchor.set(0.5, 0.5);
          label.position.set(iconX + 6, iconY);
          entry.barsContainer.addChild(label);
        }
      }

      // Dead handling — if newly dead, play die animation
      if (isDead && !entry.isDead) {
        entry.isDead = true;
        this._playState(entry, c, UnitState.DIE, false);
        entry.sprite.onComplete = () => {
          entry.sprite.gotoAndStop(entry.sprite.totalFrames - 1);
          entry.wrapper.alpha = 0.3;
        };
      }

      // Alpha for already-dead (in case of refresh)
      if (isDead && entry.currentState === UnitState.DIE) {
        // Already handled
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Animation state management
  // ---------------------------------------------------------------------------

  private _playState(entry: BattleSpriteEntry, c: TurnBattleCombatant, state: UnitState, loop: boolean): void {
    const frames = animationManager.getFrames(c.unitType, state);
    const frameSet = animationManager.getFrameSet(c.unitType, state);

    // Preserve facing direction
    const scaleSign = entry.sprite.scale.x < 0 ? -1 : 1;

    entry.sprite.textures = frames;
    entry.sprite.animationSpeed = frameSet.fps / 60;
    entry.sprite.loop = loop;
    entry.sprite.width = SPRITE_DISPLAY_SIZE;
    entry.sprite.height = SPRITE_DISPLAY_SIZE;
    entry.sprite.scale.x = scaleSign * Math.abs(entry.sprite.scale.x);
    entry.sprite.onComplete = undefined;
    entry.sprite.gotoAndPlay(0);
    entry.currentState = state;
  }

  private _returnToIdle(entry: BattleSpriteEntry, c: TurnBattleCombatant): void {
    if (entry.isDead) return;
    this._playState(entry, c, UnitState.IDLE, true);
  }

  // ---------------------------------------------------------------------------
  // Battle event handlers
  // ---------------------------------------------------------------------------

  private _onAction(combatantId: string, action: TurnBattleAction): void {
    const entry = this._spriteMap.get(combatantId);
    if (!entry || entry.isDead || entry.tweening) return;

    const c = this.battleState.combatants.find(cb => cb.id === combatantId);
    if (!c) return;

    if (action === TurnBattleAction.ATTACK || action === TurnBattleAction.ABILITY) {
      this._playAttackAnimation(entry, c);
    } else if (action === TurnBattleAction.DEFEND) {
      // Defend just updates tint via _updateBars
    }
  }

  private _onDamage(targetId: string, damage: number): void {
    if (damage <= 0) return;
    const entry = this._spriteMap.get(targetId);
    if (!entry) return;

    // Flash red briefly
    entry.sprite.tint = 0xff4444;
    setTimeout(() => {
      if (!entry.isDead) {
        const c = this.battleState.combatants.find(cb => cb.id === targetId);
        entry.sprite.tint = c?.isDefending ? 0x88aacc : 0xffffff;
      }
    }, this._getSpeedDuration(150));

    // Show floating damage number
    const dmgText = new Text({
      text: `-${damage}`,
      style: { fontFamily: "monospace", fontSize: 16, fill: 0xff4444, fontWeight: "bold" },
    });
    dmgText.anchor.set(0.5);
    dmgText.position.set(0, -50);
    entry.wrapper.addChild(dmgText);

    // Float up and fade
    const floatDuration = this._getSpeedDuration(600);
    let elapsed = 0;
    const floatInterval = setInterval(() => {
      elapsed += 16;
      dmgText.position.y -= 1;
      dmgText.alpha = Math.max(0, 1 - elapsed / floatDuration);
      if (elapsed >= floatDuration) {
        clearInterval(floatInterval);
        this._activeIntervals.delete(floatInterval);
        dmgText.destroy();
      }
    }, 16);
    this._activeIntervals.add(floatInterval);
  }

  private _playAttackAnimation(entry: BattleSpriteEntry, c: TurnBattleCombatant): void {
    entry.tweening = true;

    // Tween forward
    const direction = entry.isParty ? -1 : 1; // party moves up, enemies move down
    const startY = entry.baseY;
    const targetY = startY + direction * TWEEN_DISTANCE;
    const startTime = Date.now();

    // Play attack animation
    this._playState(entry, c, UnitState.ATTACK, false);

    const tweenDuration = this._getSpeedDuration(TWEEN_DURATION_MS);
    const tweenForward = setInterval(() => {
      const t = Math.min(1, (Date.now() - startTime) / tweenDuration);
      const ease = t * (2 - t); // ease-out quad
      entry.wrapper.position.y = startY + (targetY - startY) * ease;

      if (t >= 1) {
        clearInterval(tweenForward);
        this._activeIntervals.delete(tweenForward);

        // Wait for attack animation to finish, then tween back
        entry.sprite.onComplete = () => {
          const returnStart = Date.now();
          const tweenBack = setInterval(() => {
            const t2 = Math.min(1, (Date.now() - returnStart) / tweenDuration);
            const ease2 = t2 * (2 - t2);
            entry.wrapper.position.y = targetY + (startY - targetY) * ease2;

            if (t2 >= 1) {
              clearInterval(tweenBack);
              this._activeIntervals.delete(tweenBack);
              entry.wrapper.position.y = startY;
              entry.tweening = false;
              this._returnToIdle(entry, c);
            }
          }, 16);
          this._activeIntervals.add(tweenBack);
        };
      }
    }, 16);
    this._activeIntervals.add(tweenForward);
  }

  // ---------------------------------------------------------------------------
  // Turn indicator with arrow
  // ---------------------------------------------------------------------------

  private _updateTurnIndicator(): void {
    const currentId = this.battleState.turnOrder[this.battleState.currentTurnIndex];
    const current = this.battleState.combatants.find(c => c.id === currentId);
    if (current) {
      this._turnIndicator.text = `Round ${this.battleState.round} - ${current.name}'s Turn`;
    }

    // Remove old arrow
    if (this._turnArrow) {
      this._turnArrow.destroy();
      this._turnArrow = null;
    }
    if (this._turnArrowInterval) {
      clearInterval(this._turnArrowInterval);
      this._turnArrowInterval = null;
    }

    if (!currentId) return;
    const entry = this._spriteMap.get(currentId);
    if (!entry || entry.isDead) return;

    // Create pulsing arrow above active combatant
    this._turnArrow = new Graphics();
    entry.wrapper.addChild(this._turnArrow);
    this._turnArrowTick = 0;

    const drawArrow = () => {
      if (!this._turnArrow) return;
      this._turnArrow.clear();
      const bob = Math.sin(this._turnArrowTick * 0.1) * 3;
      const ay = -55 + bob;
      // Small downward-pointing triangle
      this._turnArrow.moveTo(-6, ay - 8);
      this._turnArrow.lineTo(6, ay - 8);
      this._turnArrow.lineTo(0, ay);
      this._turnArrow.closePath();
      this._turnArrow.fill({ color: 0xffcc00, alpha: 0.9 });
      this._turnArrowTick++;
    };

    drawArrow();
    this._turnArrowInterval = setInterval(drawArrow, 50);
  }

  // ---------------------------------------------------------------------------
  // Turn order bar
  // ---------------------------------------------------------------------------

  private _drawTurnOrder(): void {
    this.turnOrderContainer.removeChildren();

    const turnOrder = this.battleState.turnOrder;
    const currentIdx = this.battleState.currentTurnIndex;
    const maxShow = Math.min(turnOrder.length, 10);

    // Show from current turn onward
    const barX = 10;
    const barY = 32;
    const slotW = 70;
    const slotH = 22;
    const gap = 2;

    // Background
    const bg = new Graphics();
    bg.roundRect(barX - 4, barY - 4, maxShow * (slotW + gap) + 4, slotH + 8, 4);
    bg.fill({ color: 0x0e0e1a, alpha: 0.8 });
    bg.stroke({ color: 0x333355, width: 1 });
    this.turnOrderContainer.addChild(bg);

    for (let i = 0; i < maxShow; i++) {
      const orderIdx = (currentIdx + i) % turnOrder.length;
      const id = turnOrder[orderIdx];
      const c = this.battleState.combatants.find(cb => cb.id === id);
      if (!c) continue;

      const x = barX + i * (slotW + gap);
      const isCurrent = i === 0;
      const isDead = c.hp <= 0;

      // Slot background
      const slot = new Graphics();
      slot.roundRect(x, barY, slotW, slotH, 3);
      if (isCurrent) {
        slot.fill({ color: 0x3a3a1a, alpha: 0.9 });
        slot.stroke({ color: 0xffcc00, width: 1 });
      } else {
        slot.fill({ color: c.isPartyMember ? 0x1a2a1a : 0x2a1a1a, alpha: 0.7 });
      }
      this.turnOrderContainer.addChild(slot);

      // Name (truncated)
      const displayName = c.name.length > 7 ? c.name.slice(0, 6) + "." : c.name;
      const spd = Math.round(getEffectiveSpeed(c));
      const nameText = new Text({
        text: `${displayName} ${spd}`,
        style: {
          fontFamily: "monospace",
          fontSize: 9,
          fill: isDead ? 0x555555 : (isCurrent ? 0xffcc00 : (c.isPartyMember ? 0x88ff88 : 0xff8888)),
        },
      });
      nameText.position.set(x + 4, barY + 4);
      this.turnOrderContainer.addChild(nameText);
    }
  }

  // ---------------------------------------------------------------------------
  // Menu drawing (unchanged logic)
  // ---------------------------------------------------------------------------

  private _drawMenu(): void {
    this.menuContainer.removeChildren();
    for (const t of this._menuTexts) t.destroy();
    this._menuTexts = [];

    if (this.battleState.phase !== TurnBattlePhase.SELECT_ACTION) return;

    // Show item picker instead of action menu when in item pick mode
    if (this._itemPickMode) {
      this._drawItemPicker();
      return;
    }

    // Show spell picker when in spell pick mode
    if (this._spellPickMode) {
      this._drawSpellPicker();
      return;
    }

    // Get ability name for the current combatant
    const currentId = this.battleState.turnOrder[this.battleState.currentTurnIndex];
    const current = this.battleState.combatants.find(c => c.id === currentId);
    const hasSpells = current && current.knownSpells && current.knownSpells.length > 0;
    const abilityType = current?.abilityTypes[0] ?? null;
    const abilityName = hasSpells ? "Spells" : (current ? getAbilityName(abilityType) : "Ability");
    const abilityUsable = hasSpells || (currentId ? canUseAbility(this.battleState, currentId) : true);

    // Build actions list dynamically — include Limit Break only when gauge is full
    const actions: TurnBattleAction[] = [
      TurnBattleAction.ATTACK,
      TurnBattleAction.ABILITY,
      TurnBattleAction.DEFEND,
      TurnBattleAction.ITEM,
      TurnBattleAction.SWAP_ROW,
    ];
    if (current && (current.limitGauge ?? 0) >= 100) {
      actions.push(TurnBattleAction.LIMIT_BREAK);
    }
    actions.push(TurnBattleAction.FLEE);
    const menuEntries = actions.length + 1; // +1 for Help

    const menuX = 30;
    const menuY = this.vm.screenHeight - 200;
    const menuW = 160;

    // Menu background
    const bg = new Graphics();
    bg.roundRect(menuX - 10, menuY - 10, menuW, menuEntries * 28 + 20, 6);
    bg.fill({ color: 0x1a1a3e, alpha: 0.9 });
    bg.stroke({ color: 0x4444aa, width: 1 });
    this.menuContainer.addChild(bg);

    for (let i = 0; i < menuEntries; i++) {
      const isSelected = i === this._selectedMenuIndex;
      let label: string;
      let disabled = false;
      if (i < actions.length) {
        if (actions[i] === TurnBattleAction.ABILITY) {
          label = abilityName;
          if (!hasSpells && !abilityUsable) {
            const cost = getAbilityMpCost(abilityType);
            label += ` (${cost} MP)`;
            disabled = true;
          }
        } else if (actions[i] === TurnBattleAction.SWAP_ROW) {
          label = "Swap Row";
        } else if (actions[i] === TurnBattleAction.LIMIT_BREAK) {
          label = "Limit Break";
        } else {
          label = actions[i].charAt(0).toUpperCase() + actions[i].slice(1);
        }
      } else {
        label = "Help";
      }

      let defaultColor = 0xcccccc;
      if (disabled) defaultColor = 0x555555;
      else if (i >= actions.length) defaultColor = 0x888888; // Help
      else if (actions[i] === TurnBattleAction.LIMIT_BREAK) defaultColor = 0xFF8800;

      const text = new Text({
        text: `${isSelected ? ">" : " "} ${label}`,
        style: {
          fontFamily: "monospace",
          fontSize: 14,
          fill: disabled ? 0x555555 : (isSelected ? 0xffcc00 : defaultColor),
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      text.position.set(menuX, menuY + i * 28);
      this.menuContainer.addChild(text);
      this._menuTexts.push(text);
    }

    // Tooltip for selected action
    if (this._selectedMenuIndex < actions.length) {
      const selectedAction = actions[this._selectedMenuIndex];
      let tooltipText = "";
      if (selectedAction === TurnBattleAction.ABILITY) {
        if (hasSpells) {
          tooltipText = "Open spell list.";
        } else {
          const cost = getAbilityMpCost(abilityType);
          const desc = getAbilityDescription(abilityType);
          tooltipText = `${desc}\nCost: ${cost} MP`;
        }
      } else if (selectedAction === TurnBattleAction.LIMIT_BREAK) {
        tooltipText = "Unleash a devastating attack\nusing your full Limit gauge.";
      }

      if (tooltipText) {
        const tipX = menuX + menuW + 4;
        const tipY = menuY - 10;
        const tipBg = new Graphics();
        tipBg.roundRect(tipX, tipY, 190, 50, 4);
        tipBg.fill({ color: 0x1a1a3e, alpha: 0.92 });
        tipBg.stroke({ color: 0x4444aa, width: 1 });
        this.menuContainer.addChild(tipBg);

        const tipLabel = new Text({
          text: tooltipText,
          style: { fontFamily: "monospace", fontSize: 10, fill: 0xcccccc, wordWrap: true, wordWrapWidth: 180, lineHeight: 14 },
        });
        tipLabel.position.set(tipX + 6, tipY + 6);
        this.menuContainer.addChild(tipLabel);
      }
    }
  }

  private _drawItemPicker(): void {
    const consumables = this._rpg.inventory.items.filter(s => s.item.type === "consumable");

    const menuX = 30;
    const menuY = this.vm.screenHeight - 200;
    const itemH = Math.max(consumables.length, 1) * 24 + 40;

    // Panel background
    const bg = new Graphics();
    bg.roundRect(menuX - 10, menuY - 10, 260, itemH, 6);
    bg.fill({ color: 0x1a1a3e, alpha: 0.9 });
    bg.stroke({ color: 0x4444aa, width: 1 });
    this.menuContainer.addChild(bg);

    // Header
    const header = new Text({
      text: t("rpg.use_item"),
      style: { fontFamily: "monospace", fontSize: 12, fill: 0x88bbff, fontWeight: "bold" },
    });
    header.position.set(menuX, menuY);
    this.menuContainer.addChild(header);

    if (consumables.length === 0) {
      const empty = new Text({
        text: t("rpg.no_consumables"),
        style: { fontFamily: "monospace", fontSize: 12, fill: 0x888888 },
      });
      empty.position.set(menuX, menuY + 20);
      this.menuContainer.addChild(empty);
      return;
    }

    for (let i = 0; i < consumables.length; i++) {
      const { item, quantity } = consumables[i];
      const isSelected = i === this._itemPickIndex;
      const statsStr = _formatItemStats(item);

      const text = new Text({
        text: `${isSelected ? ">" : " "} ${item.name} x${quantity}  ${statsStr}`,
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fill: isSelected ? 0xffcc00 : 0xcccccc,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      text.position.set(menuX, menuY + 20 + i * 24);
      this.menuContainer.addChild(text);
      this._menuTexts.push(text);
    }
  }

  private _drawSpellPicker(): void {
    const currentId = this.battleState.turnOrder[this.battleState.currentTurnIndex];
    const current = this.battleState.combatants.find(c => c.id === currentId);
    const spells = current?.knownSpells ?? [];

    const menuX = 30;
    const menuY = this.vm.screenHeight - 200;
    const rows = Math.max(spells.length, 1);
    const panelH = rows * 24 + 40;

    const bg = new Graphics();
    bg.roundRect(menuX - 10, menuY - 10, 300, panelH, 6);
    bg.fill({ color: 0x1a1a3e, alpha: 0.9 });
    bg.stroke({ color: 0x4444aa, width: 1 });
    this.menuContainer.addChild(bg);

    const header = new Text({
      text: t("rpg.cast_spell"),
      style: { fontFamily: "monospace", fontSize: 12, fill: 0x88bbff, fontWeight: "bold" },
    });
    header.position.set(menuX, menuY);
    this.menuContainer.addChild(header);

    if (spells.length === 0) {
      const empty = new Text({
        text: t("rpg.no_spells"),
        style: { fontFamily: "monospace", fontSize: 12, fill: 0x888888 },
      });
      empty.position.set(menuX, menuY + 20);
      this.menuContainer.addChild(empty);
      return;
    }

    const spellPanelW = 300;
    for (let i = 0; i < spells.length; i++) {
      const spellId = spells[i];
      const isSelected = i === this._spellPickIndex;
      const name = getSpellName(spellId);
      const cost = getSpellMpCost(spellId);
      const canCast = canCastSpell(this.battleState, currentId!, spellId);
      const color = !canCast ? 0x555555 : (isSelected ? 0xffcc00 : 0xcccccc);

      const text = new Text({
        text: `${isSelected ? ">" : " "} ${name}  (${cost} MP)`,
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fill: color,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      text.position.set(menuX, menuY + 20 + i * 24);
      this.menuContainer.addChild(text);
      this._menuTexts.push(text);
    }

    // Tooltip for selected spell
    if (this._spellPickIndex < spells.length) {
      const selSpell = spells[this._spellPickIndex];
      const desc = getSpellDescription(selSpell);
      if (desc) {
        const tipX = menuX + spellPanelW + 4;
        const tipY = menuY - 10;
        const tipBg = new Graphics();
        tipBg.roundRect(tipX, tipY, 190, 50, 4);
        tipBg.fill({ color: 0x1a1a3e, alpha: 0.92 });
        tipBg.stroke({ color: 0x4444aa, width: 1 });
        this.menuContainer.addChild(tipBg);

        const tipLabel = new Text({
          text: desc,
          style: { fontFamily: "monospace", fontSize: 10, fill: 0xcccccc, wordWrap: true, wordWrapWidth: 180, lineHeight: 14 },
        });
        tipLabel.position.set(tipX + 6, tipY + 6);
        this.menuContainer.addChild(tipLabel);
      }
    }
  }

  private _updateLog(): void {
    // Remove old log children (keep original _logText hidden; use colored texts)
    this.logContainer.removeChildren();
    this._logText.text = "";

    const log = this.battleState.log;
    const maxVisible = 8;
    // Clamp scroll offset
    this._logScrollOffset = Math.max(0, Math.min(this._logScrollOffset, Math.max(0, log.length - maxVisible)));
    const startIdx = Math.max(0, log.length - maxVisible - this._logScrollOffset);
    const endIdx = Math.min(log.length, startIdx + maxVisible);
    const visible = log.slice(startIdx, endIdx);

    const logX = this.vm.screenWidth - 320;
    const logY = 20;

    // Background panel
    const bg = new Graphics();
    bg.roundRect(logX - 6, logY - 4, 312, maxVisible * 16 + 8, 4);
    bg.fill({ color: 0x0a0a14, alpha: 0.7 });
    this.logContainer.addChild(bg);

    for (let i = 0; i < visible.length; i++) {
      const line = visible[i];
      const color = _getLogLineColor(line);
      const txt = new Text({
        text: line,
        style: { fontFamily: "monospace", fontSize: 11, fill: color, wordWrap: true, wordWrapWidth: 300 },
      });
      txt.position.set(logX, logY + i * 16);
      this.logContainer.addChild(txt);
    }

    // Scroll indicator
    if (log.length > maxVisible) {
      const indicator = new Text({
        text: `[${log.length - maxVisible - this._logScrollOffset + 1}-${log.length - this._logScrollOffset}/${log.length}]`,
        style: { fontFamily: "monospace", fontSize: 8, fill: 0x666666 },
      });
      indicator.position.set(logX, logY + maxVisible * 16 + 2);
      this.logContainer.addChild(indicator);
    }

    // Setup mouse wheel listener for log scroll (once)
    if (!this._onLogWheel) {
      this._onLogWheel = (e: WheelEvent) => {
        const log = this.battleState.log;
        if (log.length <= maxVisible) return;
        if (e.deltaY < 0) {
          this._logScrollOffset = Math.min(this._logScrollOffset + 1, log.length - maxVisible);
        } else {
          this._logScrollOffset = Math.max(this._logScrollOffset - 1, 0);
        }
        this._updateLog();
      };
      window.addEventListener("wheel", this._onLogWheel);
    }
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  /** Build the current actions list (matches _drawMenu logic). */
  private _getCurrentActions(): TurnBattleAction[] {
    const currentId = this.battleState.turnOrder[this.battleState.currentTurnIndex];
    const current = this.battleState.combatants.find(c => c.id === currentId);
    const actions: TurnBattleAction[] = [
      TurnBattleAction.ATTACK,
      TurnBattleAction.ABILITY,
      TurnBattleAction.DEFEND,
      TurnBattleAction.ITEM,
      TurnBattleAction.SWAP_ROW,
    ];
    if (current && (current.limitGauge ?? 0) >= 100) {
      actions.push(TurnBattleAction.LIMIT_BREAK);
    }
    actions.push(TurnBattleAction.FLEE);
    return actions;
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      // Spell pick sub-mode
      if (this._spellPickMode && this.battleState.phase === TurnBattlePhase.SELECT_ACTION) {
        const currentId = this.battleState.turnOrder[this.battleState.currentTurnIndex];
        const current = this.battleState.combatants.find(c => c.id === currentId);
        const spells = current?.knownSpells ?? [];
        switch (e.code) {
          case "ArrowUp":
          case "KeyW":
            this._spellPickIndex = Math.max(0, this._spellPickIndex - 1);
            this._drawMenu();
            break;
          case "ArrowDown":
          case "KeyS":
            this._spellPickIndex = Math.min(spells.length - 1, this._spellPickIndex + 1);
            this._drawMenu();
            break;
          case "Enter":
          case "Space":
            if (spells.length > 0 && this._spellPickIndex < spells.length) {
              const spellId = spells[this._spellPickIndex];
              if (canCastSpell(this.battleState, currentId!, spellId)) {
                this._spellPickMode = false;
                this.onSpellSelected?.(spellId);
              }
            }
            break;
          case "Escape":
            this._spellPickMode = false;
            this._drawMenu();
            break;
        }
        return;
      }

      // Item pick sub-mode (before target selection)
      if (this._itemPickMode && this.battleState.phase === TurnBattlePhase.SELECT_ACTION) {
        const consumables = this._rpg.inventory.items.filter(s => s.item.type === "consumable");
        switch (e.code) {
          case "ArrowUp":
          case "KeyW":
            this._itemPickIndex = Math.max(0, this._itemPickIndex - 1);
            this._drawMenu();
            break;
          case "ArrowDown":
          case "KeyS":
            this._itemPickIndex = Math.min(consumables.length - 1, this._itemPickIndex + 1);
            this._drawMenu();
            break;
          case "Enter":
          case "Space":
            if (consumables.length > 0 && this._itemPickIndex < consumables.length) {
              this._itemPickMode = false;
              this.onItemSelected?.(consumables[this._itemPickIndex].item.id);
            }
            break;
          case "Escape":
            this._itemPickMode = false;
            this._drawMenu();
            break;
        }
        return;
      }

      if (this.battleState.phase === TurnBattlePhase.SELECT_ACTION) {
        const actions = this._getCurrentActions();
        const menuEntries = actions.length + 1; // +1 for Help
        switch (e.code) {
          case "ArrowUp":
          case "KeyW":
            this._selectedMenuIndex = Math.max(0, this._selectedMenuIndex - 1);
            this._drawMenu();
            break;
          case "ArrowDown":
          case "KeyS":
            this._selectedMenuIndex = Math.min(menuEntries - 1, this._selectedMenuIndex + 1);
            this._drawMenu();
            break;
          case "Enter":
          case "Space": {
            // Help entry is after the action list
            if (this._selectedMenuIndex >= actions.length) {
              this.onHelpRequested?.();
              break;
            }
            const selectedAction = actions[this._selectedMenuIndex];
            // Intercept ITEM action to show item picker first
            if (selectedAction === TurnBattleAction.ITEM) {
              const consumables = this._rpg.inventory.items.filter(s => s.item.type === "consumable");
              if (consumables.length === 0) {
                this.battleState.log.push("No items to use!");
                this._updateLog();
              } else {
                this._itemPickMode = true;
                this._itemPickIndex = 0;
                this._drawMenu();
              }
            } else if (selectedAction === TurnBattleAction.ABILITY) {
              // Check if combatant has learned spells — show spell picker
              const cid = this.battleState.turnOrder[this.battleState.currentTurnIndex];
              const cur = this.battleState.combatants.find(c => c.id === cid);
              if (cur && cur.knownSpells && cur.knownSpells.length > 0) {
                this._spellPickMode = true;
                this._spellPickIndex = 0;
                this._drawMenu();
              } else if (!canUseAbility(this.battleState, cid!)) {
                this.battleState.log.push(`${cur?.name ?? "Unit"} doesn't have enough MP!`);
                this._updateLog();
              } else {
                this.onActionSelected?.(selectedAction);
              }
            } else {
              this.onActionSelected?.(selectedAction);
            }
            break;
          }
        }
      } else if (this.battleState.phase === TurnBattlePhase.SELECT_TARGET) {
        switch (e.code) {
          case "ArrowLeft":
          case "KeyA":
            this._targetIndex = Math.max(0, this._targetIndex - 1);
            this._updateBars(); // Re-render target highlight
            break;
          case "ArrowRight":
          case "KeyD":
            this._targetIndex = Math.min(this._selectableTargets.length - 1, this._targetIndex + 1);
            this._updateBars(); // Re-render target highlight
            break;
          case "Enter":
          case "Space":
            if (this._selectableTargets.length > 0) {
              this.onTargetSelected?.(this._selectableTargets[this._targetIndex].id);
            }
            break;
          case "Escape":
            // Go back to action selection
            this.battleState.phase = TurnBattlePhase.SELECT_ACTION;
            this._drawMenu();
            this._updateBars();
            break;
        }
      }
    };

    window.addEventListener("keydown", this._onKeyDown);
  }

  // ---------------------------------------------------------------------------
  // Battle Speed Toggle
  // ---------------------------------------------------------------------------

  private _drawSpeedButton(): void {
    this._speedButtonContainer.removeChildren();

    const btnX = this.vm.screenWidth - 50;
    const btnY = 4;

    const bg = new Graphics();
    bg.roundRect(btnX, btnY, 42, 22, 4);
    bg.fill({ color: 0x1a1a3e, alpha: 0.9 });
    bg.stroke({ color: 0x4444aa, width: 1 });
    this._speedButtonContainer.addChild(bg);

    const label = new Text({
      text: `${this._battleSpeed}x`,
      style: { fontFamily: "monospace", fontSize: 12, fill: 0xffcc00, fontWeight: "bold" },
    });
    label.position.set(btnX + 8, btnY + 3);
    this._speedButtonContainer.addChild(label);

    // Make interactive
    bg.eventMode = "static";
    bg.cursor = "pointer";
    bg.on("pointertap", () => {
      if (this._battleSpeed === 1) this._battleSpeed = 2;
      else if (this._battleSpeed === 2) this._battleSpeed = 4;
      else this._battleSpeed = 1;
      this._rpg.battleSpeed = this._battleSpeed;
      this._drawSpeedButton();
    });
  }

  /** Get effective tween/delay duration adjusted for battle speed. */
  private _getSpeedDuration(baseMs: number): number {
    return baseMs / this._battleSpeed;
  }

  // ---------------------------------------------------------------------------
  // Screen Shake on Critical Hit
  // ---------------------------------------------------------------------------

  private _screenShake(): void {
    const container = this.combatantsContainer;
    const origX = container.position.x;
    const origY = container.position.y;
    const duration = 200;
    const startTime = Date.now();

    const shakeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(shakeInterval);
        this._activeIntervals.delete(shakeInterval);
        container.position.set(origX, origY);
        return;
      }
      container.position.set(
        origX + (Math.random() * 6 - 3),
        origY + (Math.random() * 6 - 3),
      );
    }, 16);
    this._activeIntervals.add(shakeInterval);
  }

  // ---------------------------------------------------------------------------
  // Spell / Ability Visual Effects
  // ---------------------------------------------------------------------------

  private _spawnElementVFX(element: RPGElementType, x: number, y: number, isHeal: boolean): void {
    if (isHeal || element === RPGElementType.HOLY) {
      this._spawnHealVFX(x, y);
      return;
    }

    switch (element) {
      case RPGElementType.FIRE:
        this._spawnBurstVFX(x, y, 8, [0xFF4400, 0xFF6600, 0xFF8800]);
        break;
      case RPGElementType.COLD:
        this._spawnBurstVFX(x, y, 8, [0x44AAFF, 0xAADDFF, 0xFFFFFF]);
        break;
      case RPGElementType.LIGHTNING:
        this._spawnLightningVFX(x, y);
        break;
      case RPGElementType.NATURE:
        this._spawnBurstVFX(x, y, 6, [0x44BB44, 0x88FF88]);
        break;
      case RPGElementType.DARK:
        this._spawnBurstVFX(x, y, 6, [0x8844CC, 0x440066]);
        break;
      default:
        // Physical — small white burst
        this._spawnBurstVFX(x, y, 4, [0xFFFFFF, 0xCCCCCC]);
        break;
    }
  }

  private _spawnBurstVFX(cx: number, cy: number, count: number, colors: number[]): void {
    const duration = this._getSpeedDuration(400);
    const particles: { g: Graphics; vx: number; vy: number }[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 1.5 + Math.random();
      const g = new Graphics();
      const color = colors[i % colors.length];
      g.circle(0, 0, 3 + Math.random() * 2);
      g.fill({ color, alpha: 0.9 });
      g.position.set(cx, cy);
      this._vfxContainer.addChild(g);
      particles.push({ g, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      for (const p of particles) {
        p.g.position.x += p.vx;
        p.g.position.y += p.vy;
        p.g.alpha = 1 - t;
        p.g.scale.set(1 - t * 0.5);
      }
      if (t >= 1) {
        clearInterval(interval);
        this._activeIntervals.delete(interval);
        for (const p of particles) {
          p.g.destroy();
        }
      }
    }, 16);
    this._activeIntervals.add(interval);
  }

  private _spawnLightningVFX(cx: number, cy: number): void {
    const duration = this._getSpeedDuration(300);
    const lines: Graphics[] = [];

    for (let i = 0; i < 4; i++) {
      const g = new Graphics();
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
      const len = 20 + Math.random() * 15;
      g.moveTo(cx, cy);
      // Jagged line
      const mx = cx + Math.cos(angle) * len * 0.5 + (Math.random() - 0.5) * 8;
      const my = cy + Math.sin(angle) * len * 0.5 + (Math.random() - 0.5) * 8;
      g.lineTo(mx, my);
      g.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      g.stroke({ color: 0xFFDD00, width: 2, alpha: 0.9 });
      this._vfxContainer.addChild(g);
      lines.push(g);
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      for (const l of lines) l.alpha = 1 - t;
      if (t >= 1) {
        clearInterval(interval);
        this._activeIntervals.delete(interval);
        for (const l of lines) l.destroy();
      }
    }, 16);
    this._activeIntervals.add(interval);
  }

  private _spawnHealVFX(cx: number, cy: number): void {
    const duration = this._getSpeedDuration(500);
    const particles: Graphics[] = [];

    for (let i = 0; i < 6; i++) {
      const g = new Graphics();
      g.circle(0, 0, 3);
      g.fill({ color: 0x44FF44, alpha: 0.8 });
      g.position.set(cx + (Math.random() - 0.5) * 30, cy);
      this._vfxContainer.addChild(g);
      particles.push(g);
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      for (const p of particles) {
        p.position.y -= 1.2;
        p.alpha = 1 - t;
      }
      if (t >= 1) {
        clearInterval(interval);
        this._activeIntervals.delete(interval);
        for (const p of particles) p.destroy();
      }
    }, 16);
    this._activeIntervals.add(interval);
  }

  setSelectableTargets(targets: TurnBattleCombatant[]): void {
    this._selectableTargets = targets;
    this._targetIndex = 0;
    this._updateBars();
  }
}

// ---------------------------------------------------------------------------
// Log line color helper
// ---------------------------------------------------------------------------

function _getLogLineColor(line: string): number {
  const lower = line.toLowerCase();
  if (lower.includes("limit break")) return 0xFF8800;
  if (lower.includes("counter")) return 0x44FFFF;
  if (lower.includes("damage") || lower.includes("hits")) return 0xFF4444;
  if (lower.includes("heal") || lower.includes("restore")) return 0x44FF44;
  if (lower.includes("status") || lower.includes("poison") || lower.includes("stun") || lower.includes("combo:")) return 0xFFFF44;
  return 0xFFFFFF;
}

// ---------------------------------------------------------------------------
// Status effect display helpers
// ---------------------------------------------------------------------------

function _statusColor(type: string): number {
  switch (type) {
    case "poison": return 0x44aa44;
    case "regen": return 0x44ff88;
    case "slow": return 0x8888ff;
    case "haste": return 0xffaa44;
    case "shield": return 0x88bbff;
    case "stun": return 0xffff44;
    default: return 0x888888;
  }
}

function _statusAbbrev(type: string): string {
  switch (type) {
    case "poison": return "P";
    case "regen": return "R";
    case "slow": return "S";
    case "haste": return "H";
    case "shield": return "Sh";
    case "stun": return "!";
    default: return "?";
  }
}

// ---------------------------------------------------------------------------
// Battle background helpers
// ---------------------------------------------------------------------------

interface BattlePalette { top: number; bottom: number; ground: number }

function _getBattlePalette(ctx?: { biome?: string; dungeonFloor?: number }): BattlePalette {
  if (ctx?.dungeonFloor !== undefined) {
    const depth = Math.min(ctx.dungeonFloor, 5);
    const t = depth / 5;
    return {
      top: _lerpColor(0x1a1a2e, 0x0a0a0e, t),
      bottom: _lerpColor(0x2a2a3e, 0x1a0a0a, t),
      ground: _lerpColor(0x333344, 0x2a1515, t),
    };
  }

  switch (ctx?.biome) {
    case "grass":    return { top: 0x4488cc, bottom: 0x223355, ground: 0x3a6b2a };
    case "forest":   return { top: 0x2a5533, bottom: 0x112211, ground: 0x2a4a1a };
    case "sand":     return { top: 0xcc9944, bottom: 0x553322, ground: 0x8b7355 };
    case "snow":     return { top: 0xaabbdd, bottom: 0x556688, ground: 0xccccdd };
    case "path":     return { top: 0x5588aa, bottom: 0x2a3344, ground: 0x8b7355 };
    case "mountain": return { top: 0x667788, bottom: 0x333344, ground: 0x555566 };
    case "water":    return { top: 0x3366aa, bottom: 0x112244, ground: 0x1a3d6e };
    default:         return { top: 0x1a1a3e, bottom: 0x1a1a2e, ground: 0x2a2a3e };
  }
}

function _biomeToTerrain(ctx?: { biome?: string; dungeonFloor?: number }): TerrainType | null {
  if (ctx?.dungeonFloor !== undefined) {
    return TerrainType.MOUNTAINS; // rocky underground feel
  }
  switch (ctx?.biome) {
    case "grass":    return TerrainType.GRASSLAND;
    case "forest":   return TerrainType.FOREST;
    case "sand":     return TerrainType.DESERT;
    case "snow":     return TerrainType.TUNDRA;
    case "path":     return TerrainType.PLAINS;
    case "mountain": return TerrainType.MOUNTAINS;
    case "water":    return TerrainType.SWAMP;
    default:         return TerrainType.GRASSLAND;
  }
}

function _lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

function _formatItemStats(item: { stats: { hp?: number; mp?: number } }): string {
  const parts: string[] = [];
  if (item.stats.hp) parts.push(`HP+${item.stats.hp}`);
  if (item.stats.mp) parts.push(`MP+${item.stats.mp}`);
  return parts.join(" ");
}
