// JRPG-style turn-based battle view — animated sprites from AnimationManager
import { Container, Graphics, Text, AnimatedSprite } from "pixi.js";
import { TurnBattlePhase, TurnBattleAction, UnitState } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";
import type { TurnBattleState, TurnBattleCombatant } from "@rpg/state/TurnBattleState";
import type { RPGState } from "@rpg/state/RPGState";
import { animationManager } from "@view/animation/AnimationManager";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const BATTLE_BG_COLOR = 0x1a1a2e;
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
  private _targetIndex = 0;
  private _selectableTargets: TurnBattleCombatant[] = [];

  init(vm: ViewManager, battleState: TurnBattleState, rpg: RPGState): void {
    this.vm = vm;
    this.battleState = battleState;
    this._rpg = rpg;

    // Background
    this._bgGraphic.rect(0, 0, vm.screenWidth, vm.screenHeight);
    this._bgGraphic.fill({ color: BATTLE_BG_COLOR });
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
    this._updateBars();
    this._drawMenu();
    this._updateLog();
    this._updateTurnIndicator();
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

    const actions = [
      TurnBattleAction.ATTACK,
      TurnBattleAction.ABILITY,
      TurnBattleAction.DEFEND,
      TurnBattleAction.ITEM,
      TurnBattleAction.FLEE,
    ];

    const menuX = 30;
    const menuY = this.vm.screenHeight - 200;

    // Menu background
    const bg = new Graphics();
    bg.roundRect(menuX - 10, menuY - 10, 160, actions.length * 28 + 20, 6);
    bg.fill({ color: 0x1a1a3e, alpha: 0.9 });
    bg.stroke({ color: 0x4444aa, width: 1 });
    this.menuContainer.addChild(bg);

    for (let i = 0; i < actions.length; i++) {
      const isSelected = i === this._selectedMenuIndex;
      const label = actions[i].charAt(0).toUpperCase() + actions[i].slice(1);

      const text = new Text({
        text: `${isSelected ? ">" : " "} ${label}`,
        style: {
          fontFamily: "monospace",
          fontSize: 14,
          fill: isSelected ? 0xffcc00 : 0xcccccc,
          fontWeight: isSelected ? "bold" : "normal",
        },
      });
      text.position.set(menuX, menuY + i * 28);
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

    this._onKeyDown = (e: KeyboardEvent) => {
      if (this.battleState.phase === TurnBattlePhase.SELECT_ACTION) {
        switch (e.code) {
          case "ArrowUp":
          case "KeyW":
            this._selectedMenuIndex = Math.max(0, this._selectedMenuIndex - 1);
            this._drawMenu();
            break;
          case "ArrowDown":
          case "KeyS":
            this._selectedMenuIndex = Math.min(actions.length - 1, this._selectedMenuIndex + 1);
            this._drawMenu();
            break;
          case "Enter":
          case "Space":
            this.onActionSelected?.(actions[this._selectedMenuIndex]);
            break;
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
