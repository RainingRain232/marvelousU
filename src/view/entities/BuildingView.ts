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
import { BuildingType, BuildingState } from "@/types";

// ---------------------------------------------------------------------------
// Per-type placeholder colors
// ---------------------------------------------------------------------------

const BUILDING_COLORS: Record<BuildingType, number> = {
  [BuildingType.CASTLE]: 0x8b6914,
  [BuildingType.BARRACKS]: 0x3a5c8b,
  [BuildingType.STABLES]: 0x5c3a1e,
  [BuildingType.MAGE_TOWER]: 0x6a1e8b,
  [BuildingType.ARCHERY_RANGE]: 0x2e6b2e,
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

  constructor(building: Building) {
    const def = BUILDING_DEFINITIONS[building.type];
    const ts = BalanceConfig.TILE_SIZE;
    this._pw = def.footprint.w * ts;
    this._ph = def.footprint.h * ts;
    this._type = building.type;

    const pw = this._pw;
    const ph = this._ph;

    // Body rect
    this._body
      .rect(0, 0, pw, ph)
      .fill({ color: BUILDING_COLORS[building.type] })
      .rect(0, 0, pw, ph)
      .stroke({ color: BORDER_COLOR, alpha: BORDER_ALPHA, width: 2 });
    this.container.addChild(this._body);

    // HP bar background
    this._hpBg.rect(0, BAR_Y_OFF, pw, BAR_H).fill({ color: HP_BG });
    this.container.addChild(this._hpBg);

    // HP fill (updated each frame)
    this.container.addChild(this._hpFill);

    // Label
    this._label.text = BUILDING_LABELS[building.type];
    this._label.anchor.set(0.5, 0.5);
    this._label.position.set(pw / 2, ph / 2);
    this.container.addChild(this._label);

    // Small flag graphic (top-right corner of building)
    this._flag = this._buildFlag(building);
    this.container.addChild(this._flag);

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

  /** Sync health bar and idle FX. `dt` is seconds since last frame. */
  update(building: Building, dt = 0): void {
    const pct = Math.max(0, building.health / building.maxHealth);
    const fillW = this._pw * pct;
    const hpColor = pct < 0.3 ? HP_DANGER : HP_FILL;

    this._hpFill.clear();
    if (fillW > 0) {
      this._hpFill.rect(0, BAR_Y_OFF, fillW, BAR_H).fill({ color: hpColor });
    }

    this._body.alpha = building.state === BuildingState.DESTROYED ? 0.35 : 1;
    this._label.alpha = this._body.alpha;

    if (building.state === BuildingState.ACTIVE && dt > 0) {
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
