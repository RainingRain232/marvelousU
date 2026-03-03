// Building sprite + health bar + placement/destruction/idle animations.
//
// Animation summary:
//   playPlacement()    — scale-up from 0 → 1 + slight overshoot (gsap back.out)
//   playDestruction()  — shake left/right × 3 → fade out + debris particles
//   updateIdleEffects(dt) — smoke puffs (rate-limited) + flag bob (sin wave)
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import type { Building } from "@sim/entities/Building";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BuildingType, BuildingState, GamePhase } from "@/types";
import { CastleRenderer } from "@view/entities/CastleRenderer";
import { TowerRenderer } from "@view/entities/TowerRenderer";
import { LightningTowerRenderer } from "@view/entities/LightningTowerRenderer";
import { IceTowerRenderer } from "@view/entities/IceTowerRenderer";
import { FireTowerRenderer } from "@view/entities/FireTowerRenderer";
import { WarpTowerRenderer } from "@view/entities/WarpTowerRenderer";
import { HealingTowerRenderer } from "@view/entities/HealingTowerRenderer";
import { BallistaTowerRenderer } from "@view/entities/BallistaTowerRenderer";
import { RepeaterTowerRenderer } from "@view/entities/RepeaterTowerRenderer";
import { WallRenderer } from "@view/entities/WallRenderer";
import { FarmRenderer } from "@view/entities/FarmRenderer";
import { TownRenderer } from "@view/entities/TownRenderer";
import { FirepitRenderer } from "@view/entities/FirepitRenderer";
import { TempleRenderer } from "@view/entities/TempleRenderer";
import { ArcheryRangeRenderer } from "@view/entities/ArcheryRangeRenderer";
import { MageTowerRenderer } from "@view/entities/MageTowerRenderer";
import { BarracksRenderer } from "@view/entities/BarracksRenderer";
import { SiegeWorkshopRenderer } from "@view/entities/SiegeWorkshopRenderer";
import { BlacksmithRenderer } from "@view/entities/BlacksmithRenderer";
import { EmbassyRenderer } from "@view/entities/EmbassyRenderer";
import { CreatureDenRenderer } from "@view/entities/CreatureDenRenderer";
import { MillRenderer } from "@view/entities/MillRenderer";
import { EliteHallRenderer } from "@view/entities/EliteHallRenderer";
import { HamletRenderer } from "@view/entities/HamletRenderer";
import { MarketRenderer } from "@view/entities/MarketRenderer";
import { StableRenderer } from "@view/entities/StableRenderer";
import { FactionHallRenderer } from "@view/entities/FactionHallRenderer";
import { ArchitectsGuildRenderer } from "@view/entities/ArchitectsGuildRenderer";
import { House1Renderer } from "@view/entities/House1Renderer";
import { House2Renderer } from "@view/entities/House2Renderer";
import { House3Renderer } from "@view/entities/House3Renderer";

// Capture progress bar (shown below capturable buildings)
const CAP_BAR_H = 5;
const CAP_BAR_Y_OFF = 4; // pixels below bottom of building
const CAP_COLOR_P1 = 0x4488ff; // west / p1
const CAP_COLOR_P2 = 0xff4444; // east / p2
const CAP_COLOR_NEUTRAL = 0x888888;

// ---------------------------------------------------------------------------
// Per-type placeholder colors
// ---------------------------------------------------------------------------

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
  [BuildingType.HEALING_TOWER]: 0x2ecc71,
  [BuildingType.ICE_TOWER]: 0xaaddff,
  [BuildingType.FIRE_TOWER]: 0xff6622,
  [BuildingType.WARP_TOWER]: 0x9966cc,
  [BuildingType.BALLISTA_TOWER]: 0x8b6339,
  [BuildingType.REPEATER_TOWER]: 0x996633,
  [BuildingType.ARCHITECTS_GUILD]: 0x8b8878,
  [BuildingType.HOUSE1]: 0x8b7855,
  [BuildingType.HOUSE2]: 0x8b7855,
  [BuildingType.HOUSE3]: 0x8b7855,
};

const BORDER_COLOR = 0x000000;
const BORDER_ALPHA = 0.6;

// Health bar
const BAR_H = 6;
const BAR_Y_OFF = -10;
const HP_BG = 0x330000;
const HP_FILL = 0x44ff44;
const HP_DANGER = 0xff4444;

// Label style
const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0xffffff,
  align: "center",
});

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
  [BuildingType.ICE_TOWER]: "ICE TOWER",
  [BuildingType.FIRE_TOWER]: "FIRE TOWER",
  [BuildingType.WARP_TOWER]: "WARP TOWER",
  [BuildingType.HEALING_TOWER]: "HEAL TOWER",
  [BuildingType.BALLISTA_TOWER]: "BALLISTA TWR",
  [BuildingType.REPEATER_TOWER]: "REPEATER TWR",
  [BuildingType.ARCHITECTS_GUILD]: "ARCHITECTS",
  [BuildingType.HOUSE1]: "HOUSE",
  [BuildingType.HOUSE2]: "HOUSE",
  [BuildingType.HOUSE3]: "HOUSE",
};

// Idle smoke: emit one puff every SMOKE_INTERVAL seconds
const SMOKE_INTERVAL = 1.2;
// Flag bob amplitude (pixels) and speed (rad/s)
const FLAG_AMP = 3;
const FLAG_SPEED = 2.5;

// ---------------------------------------------------------------------------
// BuildingView
// ---------------------------------------------------------------------------

export class BuildingView {
  readonly container = new Container();

  private _body = new Graphics();
  private _hpBg = new Graphics();
  private _hpFill = new Graphics();
  private _captureFill = new Graphics();
  private _label = new Text({ text: "", style: LABEL_STYLE });

  // Idle FX children (smoke puffs are created/destroyed dynamically)
  private _flag: Graphics | null = null;
  private _flagTime = 0; // accumulated seconds for sin-wave bob
  private _smokeTimer = 0; // countdown to next smoke puff
  /** Smoke puffs currently alive in the fx layer (not children of container) */
  private _smokeParticles: Array<{ g: Graphics; life: number }> = [];
  /** FX container reference (set when playPlacement is first called) */
  private _fxLayer: Container | null = null;

  // Pixel dimensions of this building's footprint
  private _pw: number;
  private _ph: number;
  private _type: BuildingType;
  private _capturable: boolean;

  // Detailed castle renderer (only set for CASTLE type buildings)
  private _castleRenderer: CastleRenderer | null = null;
  // Detailed tower renderer (only set for TOWER type buildings)
  private _towerRenderer: TowerRenderer | null = null;
  // Detailed wall renderer (only set for WALL type buildings)
  private _wallRenderer: WallRenderer | null = null;
  // Detailed farm renderer (only set for FARM type buildings)
  private _farmRenderer: FarmRenderer | null = null;
  // Detailed town renderer (only set for TOWN type buildings)
  private _townRenderer: TownRenderer | null = null;
  // Detailed firepit renderer (only set for FIREPIT type buildings)
  private _firepitRenderer: FirepitRenderer | null = null;
  // Detailed temple renderer (only set for TEMPLE type buildings)
  private _templeRenderer: TempleRenderer | null = null;
  // Detailed archery range renderer (only set for ARCHERY_RANGE type buildings)
  private _archeryRangeRenderer: ArcheryRangeRenderer | null = null;
  private _mageTowerRenderer: MageTowerRenderer | null = null;
  private _healingTowerRenderer: HealingTowerRenderer | null = null;
  // Detailed barracks renderer (only set for BARRACKS type buildings)
  private _barracksRenderer: BarracksRenderer | null = null;
  // Detailed siege workshop renderer (only set for SIEGE_WORKSHOP type buildings)
  private _siegeWorkshopRenderer: SiegeWorkshopRenderer | null = null;
  // Detailed blacksmith renderer (only set for BLACKSMITH type buildings)
  private _blacksmithRenderer: BlacksmithRenderer | null = null;
  private _embassyRenderer: EmbassyRenderer | null = null;
  private _creatureDenRenderer: CreatureDenRenderer | null = null;
  private _millRenderer: MillRenderer | null = null;
  private _eliteHallRenderer: EliteHallRenderer | null = null;
  private _hamletRenderer: HamletRenderer | null = null;
  private _marketRenderer: MarketRenderer | null = null;
  private _stableRenderer: StableRenderer | null = null;
  private _factionHallRenderer: FactionHallRenderer | null = null;
  private _lightningTowerRenderer: LightningTowerRenderer | null = null;
  private _iceTowerRenderer: IceTowerRenderer | null = null;
  private _fireTowerRenderer: FireTowerRenderer | null = null;
  private _warpTowerRenderer: WarpTowerRenderer | null = null;
  private _ballistaTowerRenderer: BallistaTowerRenderer | null = null;
  private _repeaterTowerRenderer: RepeaterTowerRenderer | null = null;
  private _architectsGuildRenderer: ArchitectsGuildRenderer | null = null;
  private _house1Renderer: House1Renderer | null = null;
  private _house2Renderer: House2Renderer | null = null;
  private _house3Renderer: House3Renderer | null = null;

  constructor(building: Building) {
    const def = BUILDING_DEFINITIONS[building.type];
    const ts = BalanceConfig.TILE_SIZE;
    this._pw = def.footprint.w * ts;
    this._ph = def.footprint.h * ts;
    this._type = building.type;
    this._capturable = def.capturable ?? false;

    const pw = this._pw;
    const ph = this._ph;

    // --- Castle: use detailed procedural renderer ---
    if (building.type === BuildingType.CASTLE) {
      this._castleRenderer = new CastleRenderer(building.owner);
      this.container.addChild(this._castleRenderer.container);
      // Hide generic body/label — castle renderer handles everything visual
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.TOWER) {
      this._towerRenderer = new TowerRenderer(building.owner);
      this.container.addChild(this._towerRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.WALL) {
      this._wallRenderer = new WallRenderer();
      this.container.addChild(this._wallRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.FARM) {
      this._farmRenderer = new FarmRenderer(building.owner);
      this.container.addChild(this._farmRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.TEMPLE) {
      this._templeRenderer = new TempleRenderer(building.owner);
      this.container.addChild(this._templeRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.TOWN) {
      this._townRenderer = new TownRenderer(building.owner);
      this.container.addChild(this._townRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.HAMLET) {
      this._hamletRenderer = new HamletRenderer(building.owner);
      this.container.addChild(this._hamletRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.FIREPIT) {
      this._firepitRenderer = new FirepitRenderer();
      this.container.addChild(this._firepitRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.MAGE_TOWER) {
      this._mageTowerRenderer = new MageTowerRenderer(building.owner);
      this.container.addChild(this._mageTowerRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.BARRACKS) {
      this._barracksRenderer = new BarracksRenderer(building.owner);
      this.container.addChild(this._barracksRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.SIEGE_WORKSHOP) {
      this._siegeWorkshopRenderer = new SiegeWorkshopRenderer(building.owner);
      this.container.addChild(this._siegeWorkshopRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.BLACKSMITH) {
      this._blacksmithRenderer = new BlacksmithRenderer(building.owner);
      this.container.addChild(this._blacksmithRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.EMBASSY) {
      this._embassyRenderer = new EmbassyRenderer(building.owner);
      this.container.addChild(this._embassyRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.CREATURE_DEN) {
      this._creatureDenRenderer = new CreatureDenRenderer(building.owner);
      this.container.addChild(this._creatureDenRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.MILL) {
      this._millRenderer = new MillRenderer(building.owner);
      this.container.addChild(this._millRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.ELITE_HALL) {
      this._eliteHallRenderer = new EliteHallRenderer(building.owner);
      this.container.addChild(this._eliteHallRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.MARKET) {
      this._marketRenderer = new MarketRenderer(building.owner);
      this.container.addChild(this._marketRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.STABLES) {
      this._stableRenderer = new StableRenderer(building.owner);
      this.container.addChild(this._stableRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.ARCHERY_RANGE) {
      this._archeryRangeRenderer = new ArcheryRangeRenderer(building.owner);
      this.container.addChild(this._archeryRangeRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.FACTION_HALL) {
      this._factionHallRenderer = new FactionHallRenderer(building.owner);
      this.container.addChild(this._factionHallRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.LIGHTNING_TOWER) {
      this._lightningTowerRenderer = new LightningTowerRenderer(building.owner);
      this.container.addChild(this._lightningTowerRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.ICE_TOWER) {
      this._iceTowerRenderer = new IceTowerRenderer(building.owner);
      this.container.addChild(this._iceTowerRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.FIRE_TOWER) {
      this._fireTowerRenderer = new FireTowerRenderer(building.owner);
      this.container.addChild(this._fireTowerRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.WARP_TOWER) {
      this._warpTowerRenderer = new WarpTowerRenderer(building.owner);
      this.container.addChild(this._warpTowerRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.HEALING_TOWER) {
      this._healingTowerRenderer = new HealingTowerRenderer(building.owner);
      this.container.addChild(this._healingTowerRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.BALLISTA_TOWER) {
      this._ballistaTowerRenderer = new BallistaTowerRenderer(building.owner);
      this.container.addChild(this._ballistaTowerRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.REPEATER_TOWER) {
      this._repeaterTowerRenderer = new RepeaterTowerRenderer(building.owner);
      this.container.addChild(this._repeaterTowerRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.ARCHITECTS_GUILD) {
      this._architectsGuildRenderer = new ArchitectsGuildRenderer(building.owner);
      this.container.addChild(this._architectsGuildRenderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.HOUSE1) {
      this._house1Renderer = new House1Renderer(building.owner);
      this.container.addChild(this._house1Renderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.HOUSE2) {
      this._house2Renderer = new House2Renderer(building.owner);
      this.container.addChild(this._house2Renderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else if (building.type === BuildingType.HOUSE3) {
      this._house3Renderer = new House3Renderer(building.owner);
      this.container.addChild(this._house3Renderer.container);
      this._body.visible = false;
      this._label.visible = false;
    } else {
      // Body rect (generic buildings only)
      this._body
        .rect(0, 0, pw, ph)
        .fill({ color: BUILDING_COLORS[building.type] })
        .rect(0, 0, pw, ph)
        .stroke({ color: BORDER_COLOR, alpha: BORDER_ALPHA, width: 2 });
      this.container.addChild(this._body);

      // Label
      this._label.text = BUILDING_LABELS[building.type];
      this._label.anchor.set(0.5, 0.5);
      this._label.position.set(pw / 2, ph / 2);
      this.container.addChild(this._label);

      // Small flag graphic (top-right corner of building)
      this._flag = this._buildFlag(building);
      this.container.addChild(this._flag);
    }

    // HP bar background
    this._hpBg.rect(0, BAR_Y_OFF, pw, BAR_H).fill({ color: HP_BG });
    this.container.addChild(this._hpBg);

    // HP fill (updated each frame)
    this.container.addChild(this._hpFill);

    // Capture progress bar fill (capturable buildings only, no background)
    if (this._capturable) {
      this.container.addChild(this._captureFill);
    }

    // World-space position
    this.container.position.set(
      building.position.x * ts,
      building.position.y * ts,
    );

    this.update(building);
  }

  // ---------------------------------------------------------------------------
  // Per-frame sync
  // ---------------------------------------------------------------------------

  /**
   * Sync health bar, capture bar, and idle FX. `dt` is seconds since last frame.
   * `phase` is the current GamePhase (used by castle animations).
   */
  update(building: Building, dt = 0, phase: GamePhase = GamePhase.PREP): void {
    const pct = Math.max(0, building.health / building.maxHealth);
    const fillW = this._pw * pct;
    const hpColor = pct < 0.3 ? HP_DANGER : HP_FILL;

    this._hpFill.clear();
    if (fillW > 0) {
      this._hpFill.rect(0, BAR_Y_OFF, fillW, BAR_H).fill({ color: hpColor });
    }

    // Capture progress bar — only shown while actively capturing (not fully owned)
    if (this._capturable) {
      this._captureFill.clear();
      const capPct = building.captureProgress;
      if (capPct > 0 && capPct < 1) {
        const capColor =
          building.capturePlayerId === "p1"
            ? CAP_COLOR_P1
            : building.capturePlayerId === "p2"
              ? CAP_COLOR_P2
              : CAP_COLOR_NEUTRAL;
        this._captureFill
          .rect(0, this._ph + CAP_BAR_Y_OFF, this._pw * capPct, CAP_BAR_H)
          .fill({ color: capColor });
      }
    }

    this._body.alpha = building.state === BuildingState.DESTROYED ? 0.35 : 1;
    this._label.alpha = this._body.alpha;

    if (building.state === BuildingState.ACTIVE && dt > 0) {
      // Detailed renderers: tick them
      if (this._castleRenderer) {
        this._castleRenderer.tick(dt, phase);
      }
      if (this._towerRenderer) {
        this._towerRenderer.tick(dt, phase);
      }
      if (this._wallRenderer) {
        this._wallRenderer.tick(dt, phase);
      }
      if (this._farmRenderer) {
        this._farmRenderer.tick(dt, phase);
      }
      if (this._stableRenderer) {
        this._stableRenderer.tick(dt, phase);
      }
      if (this._townRenderer) {
        this._townRenderer.tick(dt, phase);
      }
      if (this._hamletRenderer) {
        this._hamletRenderer.tick(dt, phase);
      }
      if (this._templeRenderer) {
        this._templeRenderer.tick(dt, phase);
      }
      if (this._firepitRenderer) {
        this._firepitRenderer.tick(dt);
      }
      if (this._mageTowerRenderer) {
        this._mageTowerRenderer.tick(dt, phase);
      }
      // if (this._barracksRenderer) {
      //   this._barracksRenderer.tick();
      // }
      if (this._siegeWorkshopRenderer) {
        this._siegeWorkshopRenderer.tick(dt, phase);
      }
      if (this._barracksRenderer) {
        this._barracksRenderer.tick(dt, phase);
      }
      if (this._blacksmithRenderer) {
        this._blacksmithRenderer.tick(dt, phase);
      }
      if (this._embassyRenderer) {
        this._embassyRenderer.tick(dt, phase);
      }
      if (this._creatureDenRenderer) {
        this._creatureDenRenderer.tick(dt, phase);
      }
      if (this._millRenderer) {
        this._millRenderer.tick(dt, phase);
      }
      if (this._eliteHallRenderer) {
        this._eliteHallRenderer.tick(dt, phase);
      }
      if (this._marketRenderer) {
        this._marketRenderer.tick(dt, phase);
      }
      if (this._archeryRangeRenderer) {
        this._archeryRangeRenderer.tick(dt, phase);
      }
      if (this._factionHallRenderer) {
        this._factionHallRenderer.tick(dt);
      }
      if (this._lightningTowerRenderer) {
        this._lightningTowerRenderer.tick(dt, phase);
      }
      if (this._iceTowerRenderer) {
        this._iceTowerRenderer.tick(dt, phase);
      }
      if (this._fireTowerRenderer) {
        this._fireTowerRenderer.tick(dt, phase);
      }
      if (this._warpTowerRenderer) {
        this._warpTowerRenderer.tick(dt, phase);
      }
      if (this._healingTowerRenderer) {
        this._healingTowerRenderer.tick(dt, phase);
      }
      if (this._architectsGuildRenderer) {
        this._architectsGuildRenderer.tick(dt, phase);
      }
      if (this._house1Renderer) {
        this._house1Renderer.tick(dt, phase);
      }
      if (this._house2Renderer) {
        this._house2Renderer.tick(dt, phase);
      }
      if (this._house3Renderer) {
        this._house3Renderer.tick(dt, phase);
      }
      this._tickIdleEffects(dt);
    }
  }

  destroy(): void {
    // Clean up any lingering smoke particles from the fx layer
    for (const p of this._smokeParticles) {
      if (p.g.parent) p.g.parent.removeChild(p.g);
      p.g.destroy();
    }
    this._smokeParticles = [];
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // FX layer registration (for pre-existing buildings that skip placement anim)
  // ---------------------------------------------------------------------------

  /** Register the fx layer without playing the placement animation. */
  registerFxLayer(fxLayer: Container): void {
    this._fxLayer = fxLayer;
  }

  // ---------------------------------------------------------------------------
  // Placement animation
  // ---------------------------------------------------------------------------

  /**
   * Play the "build up from ground" animation.
   * Call this immediately after adding the container to the layer.
   * @param fxLayer — the fx layer container (used for smoke/debris)
   */
  playPlacement(fxLayer: Container): void {
    this._fxLayer = fxLayer;

    // Start scaled to zero, pop in with overshoot
    this.container.scale.set(0);
    gsap.to(this.container.scale, {
      x: 1,
      y: 1,
      duration: 0.45,
      ease: "back.out(1.5)",
    });

    // Briefly flash lighter
    gsap.to(this._body, {
      alpha: 0.5,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
    });
  }

  // ---------------------------------------------------------------------------
  // Destruction animation
  // ---------------------------------------------------------------------------

  /**
   * Play the collapse animation. The container fades out and spawns debris.
   * BuildingLayer should remove the view ~800ms after calling this.
   */
  playDestruction(): void {
    // Shake: rapid left/right oscillation
    const shakeX = this.container.position.x;
    gsap.to(this.container.position, {
      x: shakeX + 6,
      duration: 0.06,
      repeat: 5,
      yoyo: true,
      ease: "none",
      onComplete: () => {
        this.container.position.x = shakeX;
        // Fade out after shake
        gsap.to(this.container, {
          alpha: 0,
          duration: 0.4,
          ease: "power2.in",
        });
      },
    });

    // Scale squash down
    gsap.to(this.container.scale, {
      y: 0,
      duration: 0.5,
      delay: 0.35,
      ease: "power2.in",
    });

    // Debris particles
    this._spawnDebris();
  }

  // ---------------------------------------------------------------------------
  // Idle effects
  // ---------------------------------------------------------------------------

  private _tickIdleEffects(dt: number): void {
    // Flag bob: gentle vertical sin wave
    if (this._flag) {
      this._flagTime += dt * FLAG_SPEED;
      this._flag.y = Math.sin(this._flagTime) * FLAG_AMP;
    }

    // Smoke puffs
    this._smokeTimer -= dt;
    if (this._smokeTimer <= 0 && this._fxLayer) {
      this._smokeTimer = SMOKE_INTERVAL + Math.random() * 0.4;
      this._emitSmoke();
    }

    // Tick existing smoke particles (rising + fading)
    for (let i = this._smokeParticles.length - 1; i >= 0; i--) {
      const p = this._smokeParticles[i];
      p.life -= dt;
      p.g.y -= dt * 18; // drift upward
      p.g.alpha = Math.max(0, p.life / 1.2);
      p.g.scale.x = p.g.scale.y = 1 + (1 - p.life / 1.2) * 0.8;
      if (p.life <= 0) {
        if (p.g.parent) p.g.parent.removeChild(p.g);
        p.g.destroy();
        this._smokeParticles.splice(i, 1);
      }
    }
  }

  private _emitSmoke(): void {
    if (!this._fxLayer) return;

    // Spawn at chimneylike position: top-centre of the building
    const wx =
      this.container.position.x + this._pw * 0.5 + (Math.random() - 0.5) * 10;
    const wy = this.container.position.y - 4;

    const puff = new Graphics()
      .circle(0, 0, 5 + Math.random() * 3)
      .fill({ color: 0xaaaaaa, alpha: 0.45 });
    puff.position.set(wx, wy);
    puff.alpha = 0.45;
    this._fxLayer.addChild(puff);
    this._smokeParticles.push({ g: puff, life: 1.2 });
  }

  // ---------------------------------------------------------------------------
  // Debris helper
  // ---------------------------------------------------------------------------

  private _spawnDebris(): void {
    if (!this._fxLayer) return;

    const cx = this.container.position.x + this._pw / 2;
    const cy = this.container.position.y + this._ph / 2;
    const color = BUILDING_COLORS[this._type];

    const PIECE_COUNT = 8;
    for (let i = 0; i < PIECE_COUNT; i++) {
      const angle = (i / PIECE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 30 + Math.random() * 20;
      const piece = new Graphics()
        .rect(0, 0, 6 + Math.random() * 6, 6 + Math.random() * 6)
        .fill({ color });
      piece.pivot.set(3, 3);
      piece.position.set(cx, cy);
      this._fxLayer.addChild(piece);

      gsap.to(piece.position, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius + 20, // gravity bias
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
          if (piece.parent) piece.parent.removeChild(piece);
          piece.destroy();
        },
      });
      gsap.to(piece, {
        alpha: 0,
        duration: 0.5,
        delay: 0.2,
        ease: "power1.in",
      });
      gsap.to(piece, { rotation: Math.random() * Math.PI * 2, duration: 0.5 });
    }
  }

  // ---------------------------------------------------------------------------
  // Flag graphic
  // ---------------------------------------------------------------------------

  private _buildFlag(building: Building): Graphics {
    // Small triangle flag at top-right, colored by owner
    const isWest = building.owner === "p1";
    const g = new Graphics();
    // Pole
    g.moveTo(0, 0).lineTo(0, -14).stroke({ color: 0x888888, width: 1.5 });
    // Flag triangle
    g.moveTo(0, -14)
      .lineTo(10, -10)
      .lineTo(0, -6)
      .fill({ color: isWest ? 0x4488ff : 0xff4444 });
    g.position.set(this._pw - 6, 0);
    return g;
  }
}
