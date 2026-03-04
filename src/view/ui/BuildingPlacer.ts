// Ghost building follows cursor, green/red validity highlight, confirm/cancel
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BuildingType, Direction, UnitType, UnitState, UpgradeType } from "@/types";
import type { PlayerId } from "@/types";
import {
  canPlace,
  confirmPlacement,
  cancelPlacement,
  confirmGhostPlacement,
} from "@input/PlacementMode";
import { UpgradeSystem } from "@sim/systems/UpgradeSystem";
import { UPGRADE_DEFINITIONS } from "@sim/config/UpgradeDefs";
import { EventBus } from "@sim/core/EventBus";
import { createUnit } from "@sim/entities/Unit";
import { killUnit } from "@sim/systems/CombatSystem";
import { isEnemy, isAlly } from "@sim/state/GameState";
import { spellFX } from "@view/fx/SpellFX";

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

const TS = BalanceConfig.TILE_SIZE;

const COLOR_VALID = 0x22cc44; // green tint when placement OK
const COLOR_INVALID = 0xcc2222; // red tint when placement blocked
const GHOST_ALPHA = 0.55;
const HINT_ALPHA = 0.3; // footprint highlight behind ghost

// Building body colors (same palette as BuildingView)
const BUILDING_COLORS: Record<BuildingType, number> = {
  [BuildingType.CASTLE]: 0x8b6914,
  [BuildingType.BARRACKS]: 0x3a5c8b,
  [BuildingType.STABLES]: 0x5c3a1e,
  [BuildingType.MAGE_TOWER]: 0x6a1e8b,
  [BuildingType.ARCHERY_RANGE]: 0x2e6b2e,
  [BuildingType.SIEGE_WORKSHOP]: 0x7a5c2e,
  [BuildingType.BLACKSMITH]: 0x6b4a3a,
  [BuildingType.TOWN]: 0x6b8c3a,
  [BuildingType.CREATURE_DEN]: 0x3d2b1f,
  [BuildingType.TOWER]: 0x8b8b6e,
  [BuildingType.FARM]: 0x5a8a2e,
  [BuildingType.HAMLET]: 0x7aaa3e,
  [BuildingType.EMBASSY]: 0x3a6b8b,
  [BuildingType.TEMPLE]: 0xd8bfd8,
  [BuildingType.WALL]: 0x777777,
  [BuildingType.FIREPIT]: 0x333333,
  [BuildingType.MILL]: 0x8b7355,
  [BuildingType.ELITE_HALL]: 0xaa8844,
  [BuildingType.MARKET]: 0xaa7733,
  [BuildingType.FACTION_HALL]: 0x6655aa,
  [BuildingType.LIGHTNING_TOWER]: 0x4488ff,
  [BuildingType.ICE_TOWER]: 0xaaddff,
  [BuildingType.FIRE_TOWER]: 0xff6622,
  [BuildingType.WARP_TOWER]: 0x9966cc,
  [BuildingType.HEALING_TOWER]: 0x2ecc71,
  [BuildingType.BALLISTA_TOWER]: 0x8b6339,
  [BuildingType.REPEATER_TOWER]: 0x996633,
  [BuildingType.ARCHITECTS_GUILD]: 0x8b8878,
  [BuildingType.HOUSE1]: 0x8b7855,
  [BuildingType.HOUSE2]: 0x8b7855,
  [BuildingType.HOUSE3]: 0x8b7855,
  [BuildingType.ELITE_BARRACKS]: 0x2a3c6b,
  [BuildingType.ELITE_ARCHERY_RANGE]: 0x1e4b1e,
  [BuildingType.ELITE_SIEGE_WORKSHOP]: 0x5a3c1e,
  [BuildingType.ELITE_MAGE_TOWER]: 0x4a1e6b,
  [BuildingType.ELITE_STABLES]: 0x3c2a0e,
  [BuildingType.FORWARD_CASTLE]: 0x7b5914,
  [BuildingType.FORWARD_TOWER]: 0x7b7b5e,
  [BuildingType.ARCHIVE]: 0x5533aa,
};

const BUILDING_LABELS: Record<BuildingType, string> = {
  [BuildingType.CASTLE]: "CASTLE",
  [BuildingType.BARRACKS]: "BARRACKS",
  [BuildingType.STABLES]: "STABLES",
  [BuildingType.MAGE_TOWER]: "MAGE TWR",
  [BuildingType.ARCHERY_RANGE]: "ARCHERY",
  [BuildingType.SIEGE_WORKSHOP]: "SIEGE WRK",
  [BuildingType.BLACKSMITH]: "BLACKSMITH",
  [BuildingType.TOWN]: "TOWN",
  [BuildingType.CREATURE_DEN]: "CRTR DEN",
  [BuildingType.TOWER]: "TOWER",
  [BuildingType.FARM]: "FARM",
  [BuildingType.HAMLET]: "HAMLET",
  [BuildingType.EMBASSY]: "EMBASSY",
  [BuildingType.TEMPLE]: "TEMPLE",
  [BuildingType.WALL]: "WALL",
  [BuildingType.FIREPIT]: "FIREPIT",
  [BuildingType.MILL]: "MILL",
  [BuildingType.ELITE_HALL]: "ELITE HALL",
  [BuildingType.MARKET]: "MARKET",
  [BuildingType.FACTION_HALL]: "FACTION HALL",
  [BuildingType.LIGHTNING_TOWER]: "LIGHTNING",
  [BuildingType.ICE_TOWER]: "ICE",
  [BuildingType.FIRE_TOWER]: "FIRE",
  [BuildingType.WARP_TOWER]: "WARP",
  [BuildingType.HEALING_TOWER]: "HEALING",
  [BuildingType.BALLISTA_TOWER]: "BALLISTA",
  [BuildingType.REPEATER_TOWER]: "REPEATER",
  [BuildingType.ARCHITECTS_GUILD]: "ARCHITECTS",
  [BuildingType.HOUSE1]: "HOUSE",
  [BuildingType.HOUSE2]: "HOUSE",
  [BuildingType.HOUSE3]: "HOUSE",
  [BuildingType.ELITE_BARRACKS]: "ELITE BRK",
  [BuildingType.ELITE_ARCHERY_RANGE]: "ELITE ARCH",
  [BuildingType.ELITE_SIEGE_WORKSHOP]: "ELITE SIEGE",
  [BuildingType.ELITE_MAGE_TOWER]: "ELITE MAGE",
  [BuildingType.ELITE_STABLES]: "ELITE STBL",
  [BuildingType.FORWARD_CASTLE]: "FWD CASTLE",
  [BuildingType.FORWARD_TOWER]: "FWD TOWER",
  [BuildingType.ARCHIVE]: "ARCHIVE",
};

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0xffffff,
  align: "center",
});

const HINT_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xdddddd,
  align: "center",
});

// Spell key lookup for FX dispatch (each spell gets its own unique animation)
const SPELL_KEY: Partial<Record<UpgradeType, string>> = {
  // Elemental
  [UpgradeType.SPELL_FROST_NOVA]: "frost_nova",
  [UpgradeType.SPELL_LIGHTNING_STRIKE]: "lightning",
  [UpgradeType.SPELL_FIREBALL]: "fireball",
  [UpgradeType.SPELL_CHAIN_LIGHTNING]: "chain_lightning",
  [UpgradeType.SPELL_BLIZZARD]: "blizzard",
  [UpgradeType.SPELL_EARTHQUAKE]: "earthquake",
  [UpgradeType.SPELL_METEOR_STRIKE]: "meteor",
  [UpgradeType.SPELL_INFERNO]: "inferno",
  // Arcane
  [UpgradeType.SPELL_ARCANE_MISSILE]: "arcane_missile",
  [UpgradeType.SPELL_MANA_SURGE]: "mana_surge",
  [UpgradeType.SPELL_ARCANE_BARRAGE]: "arcane_barrage",
  [UpgradeType.SPELL_ARCANE_STORM]: "arcane_storm",
  [UpgradeType.SPELL_TEMPORAL_BLAST]: "temporal_blast",
  // Divine
  [UpgradeType.SPELL_BLESSING_OF_LIGHT]: "blessing_of_light",
  [UpgradeType.SPELL_HEALING_WAVE]: "healing_wave",
  [UpgradeType.SPELL_HOLY_SMITE]: "holy_smite",
  [UpgradeType.SPELL_PURIFYING_FLAME]: "purifying_flame",
  [UpgradeType.SPELL_DIVINE_RESTORATION]: "divine_restoration",
  [UpgradeType.SPELL_RADIANT_NOVA]: "radiant_nova",
  [UpgradeType.SPELL_CELESTIAL_WRATH]: "celestial_wrath",
  // Shadow
  [UpgradeType.SPELL_SHADOW_BOLT]: "shadow_bolt",
  [UpgradeType.SPELL_POISON_CLOUD]: "poison_cloud",
  [UpgradeType.SPELL_CURSE_OF_DARKNESS]: "curse_of_darkness",
  [UpgradeType.SPELL_DEATH_COIL]: "death_coil",
  [UpgradeType.SPELL_SIPHON_SOUL]: "siphon_soul",
  [UpgradeType.SPELL_VOID_RIFT]: "void_rift",
  [UpgradeType.SPELL_NETHER_STORM]: "nether_storm",
};

// ---------------------------------------------------------------------------
// BuildingPlacer
// ---------------------------------------------------------------------------

/**
 * Manages the "ghost building" visual during placement mode.
 *
 * Lifecycle:
 *   1. `init(vm, state, playerId)` — registers canvas listeners.
 *   2. `activate(bpType)` — called by ShopPanel after gold is deducted.
 *      Shows ghost, enters placement mode.
 *   3. Left-click on valid tile  → `confirmPlacement`, deactivate.
 *   4. Right-click or ESC        → `cancelPlacement` (refund), deactivate.
 *
 * The ghost container lives in the `ui` layer so it isn't camera-transformed,
 * but its world position is computed from `camera.screenToWorld` so it snaps
 * to the correct grid tile in world space (drawn via `fx` layer).
 */
export class BuildingPlacer {
  // Ghost sits in the world (fx layer) so it transforms with the camera
  private _ghostContainer = new Container();
  // Hint bar sits in ui layer (screen-space)
  private _hintContainer = new Container();

  private _vm!: ViewManager;
  private _state!: GameState;
  private _localPlayerId: PlayerId = "";

  private _active = false;
  private _bpType: BuildingType = BuildingType.BARRACKS;
  private _cursorTx = 0;
  private _cursorTy = 0;
  private _isValid = false;

  // Construction mode state (settler/engineer)
  private _isConstruction = false;
  private _constructionUpgradeType: UpgradeType | null = null;
  private _constructionUnitType: UnitType | null = null;
  private _constructionPlayerId: PlayerId = "";

  // Spell placement mode state (summon spells)
  private _isSpellPlacement = false;
  private _spellUpgradeType: UpgradeType | null = null;
  private _spellUnitType: UnitType | null = null;
  private _spellPlayerId: PlayerId = "";

  // AoE spell mode state (damage/heal spells)
  private _isAoeSpell = false;
  private _aoeUpgradeType: UpgradeType | null = null;
  private _aoePlayerId: PlayerId = "";

  // Ghost graphics (rebuilt once per activate)
  private _ghostBody = new Graphics();
  private _ghostHint = new Graphics(); // footprint validity overlay
  private _ghostLabel = new Text({ text: "", style: LABEL_STYLE });

  // Hint bar text
  private _hintText = new Text({ text: "", style: HINT_STYLE });

  // Canvas event handlers
  private _onMouseMove!: (e: PointerEvent) => void;
  private _onPointerDown!: (e: PointerEvent) => void;
  private _onKeyDown!: (e: KeyboardEvent) => void;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState, playerId: PlayerId): void {
    this._vm = vm;
    this._state = state;
    this._localPlayerId = playerId;

    // Ghost lives in the fx (world) layer so camera transforms apply
    this._ghostContainer.addChild(this._ghostHint);
    this._ghostContainer.addChild(this._ghostBody);
    this._ghostContainer.addChild(this._ghostLabel);
    this._ghostContainer.visible = false;
    vm.addToLayer("fx", this._ghostContainer);

    // Hint bar: centered at bottom of screen
    this._hintContainer.addChild(this._hintText);
    this._hintContainer.visible = false;
    vm.addToLayer("ui", this._hintContainer);

    // Register persistent canvas listeners
    const canvas = vm.app.canvas as HTMLCanvasElement;

    this._onMouseMove = (e: PointerEvent) => {
      if (!this._active) return;
      this._updateCursor(e.clientX, e.clientY);
    };
    this._onPointerDown = (e: PointerEvent) => {
      if (!this._active) return;
      if (e.button === 0) {
        e.stopPropagation();
        this._tryConfirm();
      } else if (e.button === 2) {
        e.stopPropagation();
        this._cancel();
      }
    };
    this._onKeyDown = (e: KeyboardEvent) => {
      if (!this._active) return;
      if (e.code === "Escape") this._cancel();
    };

    canvas.addEventListener("pointermove", this._onMouseMove);
    canvas.addEventListener("pointerdown", this._onPointerDown, {
      capture: true,
    });
    window.addEventListener("keydown", this._onKeyDown);
  }

  setPlayerId(playerId: PlayerId): void {
    this._localPlayerId = playerId;
  }

  destroy(): void {
    const canvas = this._vm.app.canvas as HTMLCanvasElement;
    canvas.removeEventListener("pointermove", this._onMouseMove);
    canvas.removeEventListener("pointerdown", this._onPointerDown, {
      capture: true,
    });
    window.removeEventListener("keydown", this._onKeyDown);
    this._ghostContainer.destroy({ children: true });
    this._hintContainer.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Activate / deactivate
  // ---------------------------------------------------------------------------

  /**
   * Enter placement mode for the given building type.
   * Gold has already been deducted by ShopPanel._buyBlueprint.
   */
  activate(bpType: BuildingType): void {
    this._bpType = bpType;
    // Defer _active so the pointerdown that triggered the shop button purchase
    // does not immediately confirm placement on the same event.
    this._active = false;
    setTimeout(() => {
      this._active = true;
    }, 0);

    this._isValid = false;
    this._buildGhost();
    this._ghostContainer.visible = true;

    // Hint bar
    const def = BUILDING_DEFINITIONS[bpType];
    this._hintText.text = `Placing ${BUILDING_LABELS[bpType]} (${def.footprint.w}×${def.footprint.h})  ·  Left-click to place  ·  ESC / Right-click to cancel`;
    this._hintText.anchor.set(0.5, 1);
    this._hintContainer.visible = true;
    this._positionHintBar();
  }

  /**
   * Enter construction placement mode for settler/engineer upgrades.
   * Gold and upgrade level have already been handled by ShopPanel.
   */
  activateConstruction(
    bpType: BuildingType,
    upgradeType: UpgradeType,
    unitType: UnitType,
    playerId: PlayerId,
  ): void {
    this._isConstruction = true;
    this._constructionUpgradeType = upgradeType;
    this._constructionUnitType = unitType;
    this._constructionPlayerId = playerId;
    this.activate(bpType);
  }

  /**
   * Enter spell placement mode for summoning a unit.
   * Mana has already been deducted by ShopPanel._buySpellUpgrade.
   */
  activateSpellPlacement(
    upgradeType: UpgradeType,
    unitType: UnitType,
    playerId: PlayerId,
  ): void {
    this._isSpellPlacement = true;
    this._spellUpgradeType = upgradeType;
    this._spellUnitType = unitType;
    this._spellPlayerId = playerId;

    // Defer _active so the pointerdown that triggered the shop button purchase
    // does not immediately confirm placement on the same event.
    this._active = false;
    setTimeout(() => {
      this._active = true;
    }, 0);

    this._isValid = true;
    this._ghostContainer.visible = true;

    // Build a simple glowing circle as ghost
    this._ghostBody.clear();
    this._ghostBody
      .circle(TS / 2, TS / 2, TS / 2 - 4)
      .fill({ color: 0x4488ff, alpha: 0.3 })
      .circle(TS / 2, TS / 2, TS / 2 - 4)
      .stroke({ color: 0x4488ff, alpha: 0.7, width: 2 });
    const label = unitType.replace(/_/g, " ").toUpperCase();
    this._ghostLabel.text = label;
    this._ghostLabel.anchor.set(0.5, 0.5);
    this._ghostLabel.position.set(TS / 2, TS / 2);

    // Hint bar
    const displayName = unitType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    this._hintText.text = `Summoning ${displayName}  ·  Left-click to place  ·  ESC / Right-click to cancel`;
    this._hintText.anchor.set(0.5, 1);
    this._hintContainer.visible = true;
    this._positionHintBar();
  }

  /**
   * Enter AoE spell placement mode for damage/heal spells.
   * Mana has already been deducted by ShopPanel._buySpellUpgrade.
   */
  activateAoeSpell(
    upgradeType: UpgradeType,
    playerId: PlayerId,
  ): void {
    this._isAoeSpell = true;
    this._aoeUpgradeType = upgradeType;
    this._aoePlayerId = playerId;

    const def = UPGRADE_DEFINITIONS[upgradeType];
    const radiusPx = (def.spellRadius ?? 2) * TS;
    const isDamage = def.spellType === "damage";
    const color = isDamage ? 0xff4444 : 0x22cc44;

    // Defer _active
    this._active = false;
    setTimeout(() => {
      this._active = true;
    }, 0);

    this._isValid = true;
    this._ghostContainer.visible = true;

    // Build AoE circle ghost showing spell radius
    this._ghostBody.clear();
    this._ghostHint.clear();
    this._ghostBody
      .circle(0, 0, radiusPx)
      .fill({ color, alpha: 0.15 })
      .circle(0, 0, radiusPx)
      .stroke({ color, alpha: 0.6, width: 2 });
    // Center crosshair
    this._ghostBody
      .circle(0, 0, 3)
      .fill({ color: 0xffffff, alpha: 0.8 });

    const spellName = upgradeType.replace(/^spell_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    this._ghostLabel.text = spellName;
    this._ghostLabel.anchor.set(0.5, 0.5);
    this._ghostLabel.position.set(0, -radiusPx - 10);

    // Hint bar
    const verb = isDamage ? "Targeting" : "Healing";
    this._hintText.text = `${verb}: ${spellName}  ·  Left-click to cast  ·  ESC / Right-click to cancel`;
    this._hintText.anchor.set(0.5, 1);
    this._hintContainer.visible = true;
    this._positionHintBar();
  }

  get isActive(): boolean {
    return this._active;
  }

  // ---------------------------------------------------------------------------
  // Private: ghost construction
  // ---------------------------------------------------------------------------

  private _buildGhost(): void {
    const def = BUILDING_DEFINITIONS[this._bpType];
    const pw = def.footprint.w * TS;
    const ph = def.footprint.h * TS;
    const color = BUILDING_COLORS[this._bpType];

    this._ghostBody.clear();
    // Only draw generic background for non-procedural buildings
    const isSpecial =
      this._bpType === BuildingType.TOWER ||
      this._bpType === BuildingType.CASTLE ||
      this._bpType === BuildingType.WALL ||
      this._bpType === BuildingType.FARM ||
      this._bpType === BuildingType.TOWN;
    if (!isSpecial) {
      this._ghostBody
        .rect(0, 0, pw, ph)
        .fill({ color, alpha: GHOST_ALPHA })
        .rect(0, 0, pw, ph)
        .stroke({ color: 0xffffff, alpha: 0.5, width: 1.5 });
    }

    this._ghostLabel.text = BUILDING_LABELS[this._bpType];
    this._ghostLabel.anchor.set(0.5, 0.5);
    this._ghostLabel.position.set(pw / 2, ph / 2);
  }

  // ---------------------------------------------------------------------------
  // Private: cursor tracking
  // ---------------------------------------------------------------------------

  private _updateCursor(clientX: number, clientY: number): void {
    const canvas = this._vm.app.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const world = this._vm.camera.screenToWorld(screenX, screenY);
    this._cursorTx = Math.floor(world.x);
    this._cursorTy = Math.floor(world.y);

    if (this._isAoeSpell) {
      // AoE spell: follow world pixel position (not tile-snapped)
      const cam = this._vm.camera;
      const wpx = screenX / cam.zoom - cam.x;
      const wpy = screenY / cam.zoom - cam.y;
      this._isValid = this._cursorTx >= 0 && this._cursorTx < BalanceConfig.GRID_WIDTH
        && this._cursorTy >= 0 && this._cursorTy < BalanceConfig.GRID_HEIGHT;
      this._ghostContainer.position.set(wpx, wpy);
      this._ghostBody.tint = this._isValid ? 0xffffff : 0xff8888;
      return;
    }

    if (this._isSpellPlacement) {
      // Spell placement: allow anywhere on the map
      this._isValid = this._cursorTx >= 0 && this._cursorTx < BalanceConfig.GRID_WIDTH
        && this._cursorTy >= 0 && this._cursorTy < BalanceConfig.GRID_HEIGHT;
      this._ghostContainer.position.set(this._cursorTx * TS, this._cursorTy * TS);
      this._ghostBody.tint = this._isValid ? 0xffffff : 0xff8888;
      return;
    }

    this._isValid = canPlace(
      this._state,
      this._bpType,
      this._cursorTx,
      this._cursorTy,
      this._localPlayerId,
    );

    // Snap ghost to tile grid in world-pixel space
    this._ghostContainer.position.set(this._cursorTx * TS, this._cursorTy * TS);

    // Update validity overlay
    const def = BUILDING_DEFINITIONS[this._bpType];
    const pw = def.footprint.w * TS;
    const ph = def.footprint.h * TS;
    const hintColor = this._isValid ? COLOR_VALID : COLOR_INVALID;

    this._ghostHint.clear();
    this._ghostHint
      .rect(0, 0, pw, ph)
      .fill({ color: hintColor, alpha: HINT_ALPHA });

    this._ghostBody.tint = this._isValid ? 0xffffff : 0xff8888;
  }

  // ---------------------------------------------------------------------------
  // Private: confirm / cancel
  // ---------------------------------------------------------------------------

  private _tryConfirm(): void {
    if (!this._isValid) return;

    // ── AoE damage/heal spell ──
    if (this._isAoeSpell && this._aoeUpgradeType) {
      const def = UPGRADE_DEFINITIONS[this._aoeUpgradeType];
      const worldX = this._ghostContainer.position.x;
      const worldY = this._ghostContainer.position.y;
      const radiusTiles = def.spellRadius ?? 2;
      const radiusPx = radiusTiles * TS;

      if (def.spellType === "damage" && def.spellDamage) {
        // Damage all enemy units within radius
        const centerTx = worldX / TS;
        const centerTy = worldY / TS;
        for (const unit of this._state.units.values()) {
          if (unit.state === UnitState.DIE) continue;
          if (!isEnemy(this._state, this._aoePlayerId, unit.owner)) continue;
          const dx = unit.position.x - centerTx;
          const dy = unit.position.y - centerTy;
          if (dx * dx + dy * dy <= radiusTiles * radiusTiles) {
            unit.hp -= def.spellDamage;
            EventBus.emit("unitDamaged", { unitId: unit.id, amount: def.spellDamage, attackerId: "" });
            if (unit.hp <= 0) {
              unit.hp = 0;
              killUnit(unit);
            }
          }
        }
        const spellKey = SPELL_KEY[this._aoeUpgradeType] ?? "default";
        spellFX.playDamage(worldX, worldY, radiusTiles, spellKey);
      } else if (def.spellType === "heal" && def.spellHeal) {
        // Heal all friendly units within radius
        const centerTx = worldX / TS;
        const centerTy = worldY / TS;
        for (const unit of this._state.units.values()) {
          if (unit.state === UnitState.DIE) continue;
          if (!isAlly(this._state, this._aoePlayerId, unit.owner)) continue;
          const dx = unit.position.x - centerTx;
          const dy = unit.position.y - centerTy;
          if (dx * dx + dy * dy <= radiusTiles * radiusTiles) {
            unit.hp = Math.min(unit.hp + def.spellHeal, unit.maxHp);
            EventBus.emit("unitHealed", { unitId: unit.id, amount: def.spellHeal, position: { x: unit.position.x, y: unit.position.y } });
          }
        }
        const healKey = SPELL_KEY[this._aoeUpgradeType] ?? "healing_wave";
        spellFX.playHeal(worldX, worldY, radiusTiles, healKey);
      }

      this._deactivate();
      return;
    }

    // ── Summon spell ──
    if (this._isSpellPlacement && this._spellUnitType) {
      // Summon the unit at cursor position
      const player = this._state.players.get(this._spellPlayerId);
      const unit = createUnit({
        type: this._spellUnitType,
        owner: this._spellPlayerId as PlayerId,
        position: { x: this._cursorTx + 0.5, y: this._cursorTy + 0.5 },
        facingDirection: player?.direction === Direction.WEST ? Direction.EAST : Direction.WEST,
      });
      this._state.units.set(unit.id, unit);
      UpgradeSystem.applyAllUpgradesToUnit(unit);
      EventBus.emit("unitSpawned", { unitId: unit.id });
      // Play summon rune visual effect
      const wx = (this._cursorTx + 0.5) * TS;
      const wy = (this._cursorTy + 0.5) * TS;
      spellFX.playSummonRune(wx, wy);
      this._deactivate();
      return;
    }

    if (this._isConstruction && this._constructionUnitType) {
      confirmGhostPlacement(
        this._state,
        this._bpType,
        this._cursorTx,
        this._cursorTy,
        this._constructionPlayerId as PlayerId,
        this._constructionUnitType,
      );
    } else {
      confirmPlacement(
        this._state,
        this._bpType,
        this._cursorTx,
        this._cursorTy,
        this._localPlayerId,
      );
    }
    this._deactivate();
  }

  private _cancel(): void {
    if (this._isAoeSpell && this._aoeUpgradeType) {
      // Refund the mana cost and decrement level
      const upgradeDef = UPGRADE_DEFINITIONS[this._aoeUpgradeType];
      const player = this._state.players.get(this._aoePlayerId);
      if (player && upgradeDef.manaCost && upgradeDef.manaCost > 0) {
        player.mana += upgradeDef.manaCost;
        EventBus.emit("manaChanged", { playerId: this._aoePlayerId, amount: player.mana });
      }
      UpgradeSystem.decrementUpgrade(this._aoePlayerId, this._aoeUpgradeType);
    } else if (this._isSpellPlacement && this._spellUpgradeType) {
      // Refund the mana cost and decrement level
      const upgradeDef = UPGRADE_DEFINITIONS[this._spellUpgradeType];
      const player = this._state.players.get(this._spellPlayerId);
      if (player && upgradeDef.manaCost && upgradeDef.manaCost > 0) {
        player.mana += upgradeDef.manaCost;
        EventBus.emit("manaChanged", { playerId: this._spellPlayerId, amount: player.mana });
      }
      UpgradeSystem.decrementUpgrade(this._spellPlayerId, this._spellUpgradeType);
    } else if (this._isConstruction && this._constructionUpgradeType) {
      // Refund the upgrade cost and decrement level
      const upgradeDef = UPGRADE_DEFINITIONS[this._constructionUpgradeType];
      const player = this._state.players.get(this._constructionPlayerId);
      if (player) {
        player.gold += upgradeDef.cost;
        EventBus.emit("goldChanged", { playerId: this._constructionPlayerId, amount: player.gold });
      }
      UpgradeSystem.decrementUpgrade(this._constructionPlayerId, this._constructionUpgradeType);
    } else {
      cancelPlacement(this._state, this._bpType, this._localPlayerId);
    }
    this._deactivate();
  }

  private _deactivate(): void {
    this._active = false;
    this._isConstruction = false;
    this._constructionUpgradeType = null;
    this._constructionUnitType = null;
    this._isSpellPlacement = false;
    this._spellUpgradeType = null;
    this._spellUnitType = null;
    this._isAoeSpell = false;
    this._aoeUpgradeType = null;
    this._ghostContainer.visible = false;
    this._hintContainer.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Private: hint bar position
  // ---------------------------------------------------------------------------

  private _positionHintBar(): void {
    const screenW = this._vm.screenWidth;
    const screenH = this._vm.screenHeight;
    this._hintText.position.set(screenW / 2, screenH - 12);
  }
}

export const buildingPlacer = new BuildingPlacer();
