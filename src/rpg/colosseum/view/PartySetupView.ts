// Party setup — build a team before entering a tournament
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { UnitType } from "@/types";
import type { ViewManager } from "@view/ViewManager";
import { createPartyMember } from "@rpg/systems/PartyFactory";
import type { PartyMember } from "@rpg/state/RPGState";
import type { ColosseumSaveData } from "../state/ColosseumPersistence";
import type { ColosseumTeam, ColosseumRuleset } from "../state/ColosseumState";
import { createDefaultRuleset } from "../state/ColosseumState";
import type { ColosseumTier } from "../config/ColosseumDefs";
import { ARENA_UNIT_POOLS } from "../config/ColosseumDefs";

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const TITLE_COLOR = 0xffdd44;
const OPTION_COLOR = 0xeeeeff;
const SELECTED_COLOR = 0xffcc00;
const DIM_COLOR = 0x666688;
const STAT_COLOR = 0x88ff88;

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

interface SetupCallbacks {
  onConfirm: (team: ColosseumTeam, ruleset: ColosseumRuleset) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Available unit types for custom team building
// ---------------------------------------------------------------------------

const ALL_UNIT_TYPES: UnitType[] = [
  ...ARENA_UNIT_POOLS.melee,
  ...ARENA_UNIT_POOLS.ranged,
  ...ARENA_UNIT_POOLS.mage,
  ...ARENA_UNIT_POOLS.healer,
];

// ---------------------------------------------------------------------------
// PartySetupView
// ---------------------------------------------------------------------------

export class PartySetupView {
  private vm!: ViewManager;
  private container = new Container();
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _callbacks!: SetupCallbacks;
  private _tier!: ColosseumTier;

  // Team building state
  private _party: PartyMember[] = [];
  private _level = 5;
  private _unitPickerIndex = 0;
  private _teamSize = 4;
  private _ruleset: ColosseumRuleset = createDefaultRuleset();

  // UI mode
  private _mode: "team" | "rules" = "team";
  private _selectedRow = 0;

  init(
    vm: ViewManager,
    saved: ColosseumSaveData,
    tier: ColosseumTier,
    callbacks: SetupCallbacks,
  ): void {
    this.vm = vm;
    this._tier = tier;
    this._callbacks = callbacks;
    this._level = Math.round((tier.levelRange[0] + tier.levelRange[1]) / 2);
    this._teamSize = this._ruleset.teamSize;

    // If saved party exists and is non-empty, use it
    if (saved.savedParty.length > 0) {
      this._party = saved.savedParty.slice(0, this._teamSize);
    } else {
      this._generateDefaultParty();
    }

    vm.addToLayer("ui", this.container);
    this._draw();
    this._setupInput();
  }

  destroy(): void {
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
    this.vm.removeFromLayer("ui", this.container);
    this.container.destroy({ children: true });
  }

  private _generateDefaultParty(): void {
    this._party = [];
    const types = [UnitType.KNIGHT, UnitType.ARCHER, UnitType.FIRE_MAGE, UnitType.CLERIC];
    for (let i = 0; i < this._teamSize; i++) {
      const unitType = types[i % types.length];
      this._party.push(createPartyMember(`player_${i}`, `Gladiator ${i + 1}`, unitType, this._level));
    }
  }

  private _draw(): void {
    this.container.removeChildren();
    const W = this.vm.screenWidth;
    const H = this.vm.screenHeight;

    // Background
    const bg = new Graphics().rect(0, 0, W, H).fill({ color: BG_COLOR });
    this.container.addChild(bg);

    // Title
    const title = new Text({
      text: `PARTY SETUP — ${this._tier.name}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 24, fill: TITLE_COLOR, fontWeight: "bold" }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 20);
    this.container.addChild(title);

    const subtext = new Text({
      text: `Level range: ${this._tier.levelRange[0]}-${this._tier.levelRange[1]}  |  Team level: ${this._level}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: DIM_COLOR }),
    });
    subtext.anchor.set(0.5, 0);
    subtext.position.set(W / 2, 52);
    this.container.addChild(subtext);

    if (this._mode === "team") {
      this._drawTeam(W, H);
    } else {
      this._drawRules(W, H);
    }

    // Instructions
    const instr = new Text({
      text: "[↑/↓] Navigate  [←/→] Change  [Tab] Toggle Team/Rules  [Enter] Confirm  [Esc] Back",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: DIM_COLOR }),
    });
    instr.anchor.set(0.5, 0);
    instr.position.set(W / 2, H - 30);
    this.container.addChild(instr);
  }

  private _drawTeam(W: number, _H: number): void {
    const panelW = 500;
    const panelX = (W - panelW) / 2;
    let y = 80;

    // Header
    const header = new Text({
      text: "TEAM MEMBERS",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: SELECTED_COLOR, letterSpacing: 2 }),
    });
    header.position.set(panelX, y);
    this.container.addChild(header);
    y += 30;

    // Party list
    for (let i = 0; i < this._party.length; i++) {
      const m = this._party[i];
      const isSelected = this._selectedRow === i;
      const color = isSelected ? SELECTED_COLOR : OPTION_COLOR;
      const prefix = isSelected ? "> " : "  ";

      const line = new Text({
        text: `${prefix}${m.name} (${m.unitType}) Lv${m.level}  HP:${m.maxHp} ATK:${m.atk} DEF:${m.def} SPD:${m.speed}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: color }),
      });
      line.position.set(panelX, y);
      this.container.addChild(line);
      y += 26;
    }

    // Add slot
    if (this._party.length < this._teamSize) {
      const isSelected = this._selectedRow === this._party.length;
      const addText = new Text({
        text: `${isSelected ? "> " : "  "}[+] Add unit (${ALL_UNIT_TYPES[this._unitPickerIndex]})`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: isSelected ? SELECTED_COLOR : DIM_COLOR }),
      });
      addText.position.set(panelX, y);
      this.container.addChild(addText);
      y += 26;
    }

    // Level adjustment
    y += 10;
    const isLevelRow = this._selectedRow === Math.min(this._party.length, this._teamSize);
    const levelText = new Text({
      text: `${isLevelRow ? "> " : "  "}Team Level: ${this._level}  [←/→ to adjust]`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: isLevelRow ? SELECTED_COLOR : STAT_COLOR }),
    });
    levelText.position.set(panelX, y);
    this.container.addChild(levelText);
  }

  private _drawRules(W: number, _H: number): void {
    const panelX = (W - 500) / 2;
    let y = 80;

    const header = new Text({
      text: "CUSTOM RULES",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: SELECTED_COLOR, letterSpacing: 2 }),
    });
    header.position.set(panelX, y);
    this.container.addChild(header);
    y += 30;

    const rules = [
      { label: "No Items", value: this._ruleset.noItems, key: "noItems" },
      { label: "Single Unit (1v1)", value: this._ruleset.singleUnit, key: "singleUnit" },
      { label: "Random Loadout", value: this._ruleset.randomLoadout, key: "randomLoadout" },
      { label: `Handicap: ${this._ruleset.handicap.toFixed(1)}x`, value: false, key: "handicap" },
      { label: `Team Size: ${this._ruleset.teamSize}`, value: false, key: "teamSize" },
    ];

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const isSelected = this._selectedRow === i;
      const prefix = isSelected ? "> " : "  ";

      let display = `${prefix}${rule.label}`;
      if (rule.key === "noItems" || rule.key === "singleUnit" || rule.key === "randomLoadout") {
        display += rule.value ? "  [ON]" : "  [OFF]";
      }

      const color = isSelected ? SELECTED_COLOR : OPTION_COLOR;
      const text = new Text({
        text: display,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: color }),
      });
      text.position.set(panelX, y);
      this.container.addChild(text);
      y += 28;
    }
  }

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this._callbacks.onBack();
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        this._mode = this._mode === "team" ? "rules" : "team";
        this._selectedRow = 0;
        this._draw();
        return;
      }

      if (e.key === "Enter") {
        this._confirm();
        return;
      }

      if (this._mode === "team") {
        this._handleTeamInput(e);
      } else {
        this._handleRulesInput(e);
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
  }

  private _handleTeamInput(e: KeyboardEvent): void {
    const maxRows = Math.min(this._party.length, this._teamSize) + 1; // party rows + level row + optional add

    if (e.key === "ArrowUp") {
      this._selectedRow = (this._selectedRow - 1 + maxRows + 1) % (maxRows + 1);
      this._draw();
    } else if (e.key === "ArrowDown") {
      this._selectedRow = (this._selectedRow + 1) % (maxRows + 1);
      this._draw();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const dir = e.key === "ArrowRight" ? 1 : -1;

      // If on a party member row, cycle unit type
      if (this._selectedRow < this._party.length) {
        const typeIdx = ALL_UNIT_TYPES.indexOf(this._party[this._selectedRow].unitType);
        const newIdx = (typeIdx + dir + ALL_UNIT_TYPES.length) % ALL_UNIT_TYPES.length;
        const newType = ALL_UNIT_TYPES[newIdx];
        this._party[this._selectedRow] = createPartyMember(
          this._party[this._selectedRow].id,
          `Gladiator ${this._selectedRow + 1}`,
          newType,
          this._level,
        );
        this._draw();
      } else if (this._selectedRow === this._party.length && this._party.length < this._teamSize) {
        // Add unit picker
        this._unitPickerIndex = (this._unitPickerIndex + dir + ALL_UNIT_TYPES.length) % ALL_UNIT_TYPES.length;
        this._draw();
      } else {
        // Level row
        this._level = Math.max(this._tier.levelRange[0], Math.min(this._tier.levelRange[1], this._level + dir));
        this._regeneratePartyAtLevel();
        this._draw();
      }
    } else if (e.key === " " || e.key === "a") {
      // Add unit
      if (this._selectedRow === this._party.length && this._party.length < this._teamSize) {
        const unitType = ALL_UNIT_TYPES[this._unitPickerIndex];
        this._party.push(createPartyMember(
          `player_${this._party.length}`,
          `Gladiator ${this._party.length + 1}`,
          unitType,
          this._level,
        ));
        this._draw();
      }
    } else if (e.key === "Delete" || e.key === "d") {
      // Remove unit
      if (this._selectedRow < this._party.length && this._party.length > 1) {
        this._party.splice(this._selectedRow, 1);
        if (this._selectedRow >= this._party.length) this._selectedRow = this._party.length - 1;
        this._draw();
      }
    }
  }

  private _handleRulesInput(e: KeyboardEvent): void {
    const ruleKeys = ["noItems", "singleUnit", "randomLoadout", "handicap", "teamSize"];
    const maxRows = ruleKeys.length;

    if (e.key === "ArrowUp") {
      this._selectedRow = (this._selectedRow - 1 + maxRows) % maxRows;
      this._draw();
    } else if (e.key === "ArrowDown") {
      this._selectedRow = (this._selectedRow + 1) % maxRows;
      this._draw();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
      const key = ruleKeys[this._selectedRow];
      const dir = e.key === "ArrowLeft" ? -1 : 1;

      if (key === "noItems") this._ruleset.noItems = !this._ruleset.noItems;
      else if (key === "singleUnit") this._ruleset.singleUnit = !this._ruleset.singleUnit;
      else if (key === "randomLoadout") this._ruleset.randomLoadout = !this._ruleset.randomLoadout;
      else if (key === "handicap") this._ruleset.handicap = Math.max(0.5, Math.min(2.0, this._ruleset.handicap + dir * 0.1));
      else if (key === "teamSize") {
        this._ruleset.teamSize = Math.max(1, Math.min(6, this._ruleset.teamSize + dir));
        this._teamSize = this._ruleset.teamSize;
      }

      if (key !== "Enter") this._draw();
    }
  }

  private _regeneratePartyAtLevel(): void {
    for (let i = 0; i < this._party.length; i++) {
      const old = this._party[i];
      this._party[i] = createPartyMember(old.id, old.name, old.unitType, this._level);
    }
  }

  private _confirm(): void {
    // Build formation
    const formation: Record<string, 1 | 2> = {};
    for (const m of this._party) {
      formation[m.id] = m.range <= 1 ? 1 : 2;
    }

    const team: ColosseumTeam = {
      id: "player",
      name: "Player's Gladiators",
      members: this._party,
      formation,
      powerLevel: 0,
      isPlayer: true,
    };

    this._callbacks.onConfirm(team, this._ruleset);
  }
}
