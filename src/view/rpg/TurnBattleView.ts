// JRPG-style turn-based battle view — animated sprites from AnimationManager
import { Container, Graphics, Text, AnimatedSprite } from "pixi.js";
import { TurnBattlePhase, TurnBattleAction, UnitState } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";
import type { TurnBattleState, TurnBattleCombatant } from "@rpg/state/TurnBattleState";
import type { RPGState } from "@rpg/state/RPGState";
import { animationManager } from "@view/animation/AnimationManager";
import { getAbilityName } from "@rpg/systems/TurnBattleSystem";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const ENEMY_AREA_Y = 130;
const PARTY_AREA_Y_OFFSET = 170; // from bottom
const HP_BAR_WIDTH = 100;
const HP_BAR_HEIGHT = 8;
const MP_BAR_HEIGHT = 5;
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

  // Callbacks for input
  onActionSelected: ((action: TurnBattleAction) => void) | null = null;
  onTargetSelected: ((targetId: string) => void) | null = null;
  onItemSelected: ((itemId: string) => void) | null = null;
  onHelpRequested: (() => void) | null = null;
  private _targetIndex = 0;
  private _selectableTargets: TurnBattleCombatant[] = [];
  private _itemPickMode = false;
  private _itemPickIndex = 0;

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
    this._setupInput();

    // Listen for battle events
    this._unsubs.push(EventBus.on("rpgTurnBattleDamage", (e) => {
      this._onDamage(e.targetId, e.damage);
      this._updateBars();
      this._updateLog();
    }));

    this._unsubs.push(EventBus.on("rpgTurnBattleAction", (e) => {
      this._onAction(e.combatantId, e.action);
      this._updateBars();
      this._drawMenu();
      this._updateLog();
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

    this.vm.removeFromLayer("background", this.bgContainer);
    this.vm.removeFromLayer("units", this.combatantsContainer);
    this.vm.removeFromLayer("ui", this.menuContainer);
    this.vm.removeFromLayer("ui", this.logContainer);
    this.vm.removeFromLayer("ui", this.turnIndicatorContainer);

    this.bgContainer.destroy({ children: true });
    this.combatantsContainer.destroy({ children: true });
    this.menuContainer.destroy({ children: true });
    this.logContainer.destroy({ children: true });
    this.turnIndicatorContainer.destroy({ children: true });

    this._spriteMap.clear();
  }

  /** Called by the battle system to refresh the view after state changes. */
  refresh(): void {
    this._itemPickMode = false;
    this._updateBars();
    this._drawMenu();
    this._updateLog();
    this._updateTurnIndicator();
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
  }

  // ---------------------------------------------------------------------------
  // Sprite creation
  // ---------------------------------------------------------------------------

  private _createCombatantSprites(): void {
    const enemies = this.battleState.combatants.filter(c => !c.isPartyMember);
    const party = this.battleState.combatants.filter(c => c.isPartyMember);

    const screenW = this.vm.screenWidth;
    const screenH = this.vm.screenHeight;

    // Enemies (top area)
    const enemyStartX = (screenW - (enemies.length * COMBATANT_SPACING)) / 2;
    for (let i = 0; i < enemies.length; i++) {
      const c = enemies[i];
      const x = enemyStartX + i * COMBATANT_SPACING + COMBATANT_SPACING / 2;
      this._createSpriteEntry(c, x, ENEMY_AREA_Y, false);
    }

    // Party (bottom area)
    const partyY = screenH - PARTY_AREA_Y_OFFSET;
    const partyStartX = (screenW - (party.length * COMBATANT_SPACING)) / 2;
    for (let i = 0; i < party.length; i++) {
      const c = party[i];
      const x = partyStartX + i * COMBATANT_SPACING + COMBATANT_SPACING / 2;
      this._createSpriteEntry(c, x, partyY, true);
    }
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
    }, 150);

    // Show floating damage number
    const dmgText = new Text({
      text: `-${damage}`,
      style: { fontFamily: "monospace", fontSize: 16, fill: 0xff4444, fontWeight: "bold" },
    });
    dmgText.anchor.set(0.5);
    dmgText.position.set(0, -50);
    entry.wrapper.addChild(dmgText);

    // Float up and fade
    let elapsed = 0;
    const floatInterval = setInterval(() => {
      elapsed += 16;
      dmgText.position.y -= 1;
      dmgText.alpha = Math.max(0, 1 - elapsed / 600);
      if (elapsed >= 600) {
        clearInterval(floatInterval);
        dmgText.destroy();
      }
    }, 16);
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

    const tweenForward = setInterval(() => {
      const t = Math.min(1, (Date.now() - startTime) / TWEEN_DURATION_MS);
      const ease = t * (2 - t); // ease-out quad
      entry.wrapper.position.y = startY + (targetY - startY) * ease;

      if (t >= 1) {
        clearInterval(tweenForward);

        // Wait for attack animation to finish, then tween back
        entry.sprite.onComplete = () => {
          const returnStart = Date.now();
          const tweenBack = setInterval(() => {
            const t2 = Math.min(1, (Date.now() - returnStart) / TWEEN_DURATION_MS);
            const ease2 = t2 * (2 - t2);
            entry.wrapper.position.y = targetY + (startY - targetY) * ease2;

            if (t2 >= 1) {
              clearInterval(tweenBack);
              entry.wrapper.position.y = startY;
              entry.tweening = false;
              this._returnToIdle(entry, c);
            }
          }, 16);
        };
      }
    }, 16);
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

    // Actions + Help as last entry
    const actions = [
      TurnBattleAction.ATTACK,
      TurnBattleAction.ABILITY,
      TurnBattleAction.DEFEND,
      TurnBattleAction.ITEM,
      TurnBattleAction.FLEE,
    ];
    const menuEntries = actions.length + 1; // +1 for Help

    const menuX = 30;
    const menuY = this.vm.screenHeight - 200;

    // Menu background
    const bg = new Graphics();
    bg.roundRect(menuX - 10, menuY - 10, 160, menuEntries * 28 + 20, 6);
    bg.fill({ color: 0x1a1a3e, alpha: 0.9 });
    bg.stroke({ color: 0x4444aa, width: 1 });
    this.menuContainer.addChild(bg);

    // Get ability name for the current combatant
    const currentId = this.battleState.turnOrder[this.battleState.currentTurnIndex];
    const current = this.battleState.combatants.find(c => c.id === currentId);
    const abilityName = current ? getAbilityName(current.abilityTypes[0] ?? null) : "Ability";

    for (let i = 0; i < menuEntries; i++) {
      const isSelected = i === this._selectedMenuIndex;
      let label: string;
      if (i < actions.length) {
        label = actions[i].charAt(0).toUpperCase() + actions[i].slice(1);
        if (actions[i] === TurnBattleAction.ABILITY) {
          label = abilityName;
        }
      } else {
        label = "Help";
      }

      const text = new Text({
        text: `${isSelected ? ">" : " "} ${label}`,
        style: {
          fontFamily: "monospace",
          fontSize: 14,
          fill: isSelected ? 0xffcc00 : (i >= actions.length ? 0x888888 : 0xcccccc),
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      text.position.set(menuX, menuY + i * 28);
      this.menuContainer.addChild(text);
      this._menuTexts.push(text);
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
      text: "Use Item:",
      style: { fontFamily: "monospace", fontSize: 12, fill: 0x88bbff, fontWeight: "bold" },
    });
    header.position.set(menuX, menuY);
    this.menuContainer.addChild(header);

    if (consumables.length === 0) {
      const empty = new Text({
        text: "  No consumables!",
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

  private _updateLog(): void {
    const last5 = this.battleState.log.slice(-5);
    this._logText.text = last5.join("\n");
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    const actions = [
      TurnBattleAction.ATTACK,
      TurnBattleAction.ABILITY,
      TurnBattleAction.DEFEND,
      TurnBattleAction.ITEM,
      TurnBattleAction.FLEE,
    ];
    const menuEntries = actions.length + 1; // +1 for Help

    this._onKeyDown = (e: KeyboardEvent) => {
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

  setSelectableTargets(targets: TurnBattleCombatant[]): void {
    this._selectableTargets = targets;
    this._targetIndex = 0;
    this._updateBars();
  }
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
