// JRPG-style turn-based battle view
import { Container, Graphics, Text } from "pixi.js";
import { TurnBattlePhase, TurnBattleAction } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";
import type { TurnBattleState, TurnBattleCombatant } from "@rpg/state/TurnBattleState";
import type { RPGState } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const BATTLE_BG_COLOR = 0x1a1a2e;
const ENEMY_AREA_Y = 80;
const PARTY_AREA_Y_OFFSET = 120; // from bottom
const HP_BAR_WIDTH = 100;
const HP_BAR_HEIGHT = 8;
const MP_BAR_HEIGHT = 5;
const COMBATANT_SPACING = 120;

// ---------------------------------------------------------------------------
// TurnBattleView
// ---------------------------------------------------------------------------

export class TurnBattleView {
  private vm!: ViewManager;
  private battleState!: TurnBattleState;
  _rpg!: RPGState;

  private bgContainer = new Container();
  private enemyContainer = new Container();
  private partyContainer = new Container();
  private menuContainer = new Container();
  private logContainer = new Container();

  private _bgGraphic = new Graphics();
  private _enemyGraphics: Graphics[] = [];
  private _partyGraphics: Graphics[] = [];
  private _hpBars: Graphics[] = [];
  private _nameTexts: Text[] = [];
  private _menuTexts: Text[] = [];
  private _logText!: Text;
  private _turnIndicator!: Text;

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

    // Enemy area
    vm.addToLayer("units", this.enemyContainer);

    // Party area
    vm.addToLayer("units", this.partyContainer);

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
    this._turnIndicator.position.set(vm.screenWidth / 2 - 80, 10);
    vm.addToLayer("ui", this._turnIndicator);

    // Disable camera panning
    vm.camera.x = 0;
    vm.camera.y = 0;
    vm.camera.zoom = 1;

    this._drawCombatants();
    this._drawMenu();
    this._updateLog();
    this._setupInput();

    // Listen for battle events
    this._unsubs.push(EventBus.on("rpgTurnBattleDamage", () => {
      this._drawCombatants();
      this._updateLog();
    }));

    this._unsubs.push(EventBus.on("rpgTurnBattleAction", () => {
      this._drawCombatants();
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

    this.vm.removeFromLayer("background", this.bgContainer);
    this.vm.removeFromLayer("units", this.enemyContainer);
    this.vm.removeFromLayer("units", this.partyContainer);
    this.vm.removeFromLayer("ui", this.menuContainer);
    this.vm.removeFromLayer("ui", this.logContainer);
    this.vm.removeFromLayer("ui", this._turnIndicator);

    this.bgContainer.destroy({ children: true });
    this.enemyContainer.destroy({ children: true });
    this.partyContainer.destroy({ children: true });
    this.menuContainer.destroy({ children: true });
    this.logContainer.destroy({ children: true });
    this._turnIndicator.destroy();
  }

  /** Called by the battle system to refresh the view after state changes. */
  refresh(): void {
    this._drawCombatants();
    this._drawMenu();
    this._updateLog();
    this._updateTurnIndicator();
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  private _drawCombatants(): void {
    // Clear previous
    for (const g of this._enemyGraphics) g.destroy();
    for (const g of this._partyGraphics) g.destroy();
    for (const g of this._hpBars) g.destroy();
    for (const t of this._nameTexts) t.destroy();
    this._enemyGraphics = [];
    this._partyGraphics = [];
    this._hpBars = [];
    this._nameTexts = [];
    this.enemyContainer.removeChildren();
    this.partyContainer.removeChildren();

    const enemies = this.battleState.combatants.filter(c => !c.isPartyMember);
    const party = this.battleState.combatants.filter(c => c.isPartyMember);

    const screenW = this.vm.screenWidth;
    const screenH = this.vm.screenHeight;

    // Draw enemies (top area)
    const enemyStartX = (screenW - (enemies.length * COMBATANT_SPACING)) / 2;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const x = enemyStartX + i * COMBATANT_SPACING + COMBATANT_SPACING / 2;
      const y = ENEMY_AREA_Y;
      this._drawCombatantSprite(this.enemyContainer, e, x, y, 0xcc3333, false);
    }

    // Draw party (bottom area)
    const partyY = screenH - PARTY_AREA_Y_OFFSET;
    const partyStartX = (screenW - (party.length * COMBATANT_SPACING)) / 2;
    for (let i = 0; i < party.length; i++) {
      const p = party[i];
      const x = partyStartX + i * COMBATANT_SPACING + COMBATANT_SPACING / 2;
      this._drawCombatantSprite(this.partyContainer, p, x, partyY, 0x3366cc, true);
    }
  }

  private _drawCombatantSprite(
    container: Container,
    c: TurnBattleCombatant,
    x: number,
    y: number,
    baseColor: number,
    isParty: boolean,
  ): void {
    const g = new Graphics();
    const isDead = c.hp <= 0;
    const alpha = isDead ? 0.3 : 1.0;
    const isDefending = c.isDefending;

    // Body
    g.circle(x, y, 24);
    g.fill({ color: isDefending ? 0x6688aa : baseColor, alpha });
    g.stroke({ color: 0xffffff, width: isDead ? 1 : 2, alpha });

    // Type initial
    const initial = new Text({
      text: c.name.charAt(0).toUpperCase(),
      style: { fontFamily: "monospace", fontSize: 18, fill: 0xffffff, fontWeight: "bold" },
    });
    initial.anchor.set(0.5);
    initial.position.set(x, y);
    initial.alpha = alpha;
    container.addChild(initial);
    this._nameTexts.push(initial);

    container.addChild(g);
    (isParty ? this._partyGraphics : this._enemyGraphics).push(g);

    // Name
    const nameText = new Text({
      text: c.name,
      style: { fontFamily: "monospace", fontSize: 10, fill: 0xffffff },
    });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(x, y + 30);
    nameText.alpha = alpha;
    container.addChild(nameText);
    this._nameTexts.push(nameText);

    // HP bar
    const hpBar = new Graphics();
    const hpRatio = Math.max(0, c.hp / c.maxHp);
    const barX = x - HP_BAR_WIDTH / 2;
    const barY = y + 44;

    hpBar.rect(barX, barY, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    hpBar.fill({ color: 0x333333 });
    hpBar.rect(barX, barY, HP_BAR_WIDTH * hpRatio, HP_BAR_HEIGHT);
    hpBar.fill({ color: hpRatio > 0.5 ? 0x44aa44 : hpRatio > 0.25 ? 0xaaaa44 : 0xaa4444 });

    // HP text
    const hpText = new Text({
      text: `${Math.max(0, Math.ceil(c.hp))}/${c.maxHp}`,
      style: { fontFamily: "monospace", fontSize: 9, fill: 0xffffff },
    });
    hpText.anchor.set(0.5, 0);
    hpText.position.set(x, barY + HP_BAR_HEIGHT + 1);
    container.addChild(hpText);
    this._nameTexts.push(hpText);

    // MP bar (party only)
    if (isParty) {
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
      mpText.position.set(x, mpBarY + MP_BAR_HEIGHT + 1);
      container.addChild(mpText);
      this._nameTexts.push(mpText);
    }

    container.addChild(hpBar);
    this._hpBars.push(hpBar);
  }

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

  private _updateTurnIndicator(): void {
    const currentId = this.battleState.turnOrder[this.battleState.currentTurnIndex];
    const current = this.battleState.combatants.find(c => c.id === currentId);
    if (current) {
      this._turnIndicator.text = `Round ${this.battleState.round} - ${current.name}'s Turn`;
    }
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
            break;
          case "ArrowRight":
          case "KeyD":
            this._targetIndex = Math.min(this._selectableTargets.length - 1, this._targetIndex + 1);
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
            break;
        }
      }
    };

    window.addEventListener("keydown", this._onKeyDown);
  }

  setSelectableTargets(targets: TurnBattleCombatant[]): void {
    this._selectableTargets = targets;
    this._targetIndex = 0;
  }
}
