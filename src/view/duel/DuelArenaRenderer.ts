// ---------------------------------------------------------------------------
// Duel mode – richly detailed procedural arena background renderer
// Inspired by fantasiaCup fighting game stages
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import {
  DUEL_ARENAS,
  type DuelArenaDef,
} from "../../duel/config/DuelArenaDefs";

// ---------------------------------------------------------------------------
// Animated element types
// ---------------------------------------------------------------------------

interface Banner {
  x: number;
  y: number;
  width: number;
  height: number;
  phase: number;
  color: number;
  trimColor: number;
}

interface Flame {
  x: number;
  y: number;
  baseRadius: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  color: number;
}

interface MistLayer {
  y: number;
  speed: number;
  offset: number;
  alpha: number;
  height: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
}

interface Ripple {
  y: number;
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  alpha: number;
}

interface Critter {
  x: number;
  y: number;
  baseX: number;     // origin X for patrol/loop
  baseY: number;     // origin Y
  phase: number;     // animation phase offset
  type: string;      // critter type identifier
  dir: number;       // 1 = right, -1 = left
  speed: number;     // movement speed
  state: number;     // generic state counter
}

interface Spectator {
  x: number;
  y: number;
  phase: number;        // animation phase offset
  type: "guard" | "merchant" | "peasant" | "noble" | "soldier" | "monk" | "bard" | "witch" | "druid" | "fisherman" | "knight" | "villager";
  dir: number;          // 1 = right, -1 = left
  scale: number;        // size scale (0.5-1.0 for depth)
  bodyColor: number;
  skinColor: number;
  accentColor: number;
  hatColor: number;
  cheerTimer: number;   // frames until next cheer
  cheerDuration: number; // how long current cheer lasts
  isCheer: boolean;     // currently cheering
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export class DuelArenaRenderer {
  readonly container = new Container();

  private _staticGfx = new Graphics();
  private _animGfx = new Graphics();
  private _sw = 0;
  private _floorY = 0;
  private _arenaId = "";
  private _arena: DuelArenaDef | null = null;

  // Animated element pools
  private _banners: Banner[] = [];
  private _flames: Flame[] = [];
  private _particles: Particle[] = [];
  private _mistLayers: MistLayer[] = [];
  private _stars: Star[] = [];
  private _ripples: Ripple[] = [];
  private _critters: Critter[] = [];
  private _spectators: Spectator[] = [];

  build(arenaId: string, sw: number, sh: number): void {
    this.container.removeChildren();
    this._staticGfx = new Graphics();
    this._animGfx = new Graphics();
    this._banners = [];
    this._flames = [];
    this._particles = [];
    this._mistLayers = [];
    this._stars = [];
    this._ripples = [];
    this._critters = [];
    this._spectators = [];
    this._sw = sw;
    this._floorY = Math.round(sh * 0.82);
    this._arenaId = arenaId;
    this._arena = DUEL_ARENAS[arenaId] ?? null;
    if (!this._arena) return;

    switch (arenaId) {
      case "camelot": this._build_camelot(this._arena, sw, sh); break;
      case "avalon": this._build_avalon(this._arena, sw, sh); break;
      case "excalibur": this._build_excalibur(this._arena, sw, sh); break;
      case "broceliande": this._build_broceliande(this._arena, sw, sh); break;
      case "tintagel": this._build_tintagel(this._arena, sw, sh); break;
      case "round_table": this._build_round_table(this._arena, sw, sh); break;
      case "mordred_throne": this._build_mordred_throne(this._arena, sw, sh); break;
      case "glastonbury": this._build_glastonbury(this._arena, sw, sh); break;
      case "orkney": this._build_orkney(this._arena, sw, sh); break;
      case "lake": this._build_lake(this._arena, sw, sh); break;
      case "dragon_peak": this._build_dragon_peak(this._arena, sw, sh); break;
      case "grail_chapel": this._build_grail_chapel(this._arena, sw, sh); break;
      case "cornwall": this._build_cornwall(this._arena, sw, sh); break;
      case "shadow_keep": this._build_shadow_keep(this._arena, sw, sh); break;
      case "camlann": this._build_camlann(this._arena, sw, sh); break;
      default: this._buildGeneric(this._arena, sw, sh); break;
    }

    // Add themed spectators for all arenas
    if (arenaId !== "camelot") {
      this._buildArenaSpectators(arenaId, sw, sh);
    }

    this.container.addChild(this._staticGfx);
    this.container.addChild(this._animGfx);
  }

  /** Populate themed spectator crowds based on arena. */
  private _buildArenaSpectators(arenaId: string, sw: number, _sh: number): void {
    const fy = this._floorY;

    // Spectator positions: far edges of the stage to not interfere with fighters
    // Fighters occupy roughly sw * 0.3 to sw * 0.7

    switch (arenaId) {
      case "avalon": {
        // Mystic/druid/monk theme along the misty shore
        this._addSpectator(sw * 0.04, fy - 42, "druid", 1, 0.5, 0x445533, 0xccbb99, 0x557744, 0x554433, 0);
        this._addSpectator(sw * 0.10, fy - 38, "monk", -1, 0.45, 0x554433, 0xddcc99, 0x443322, 0x665544, 1.5);
        this._addSpectator(sw * 0.90, fy - 40, "druid", -1, 0.48, 0x556644, 0xccbb99, 0x668855, 0x443322, 2.0);
        this._addSpectator(sw * 0.96, fy - 38, "monk", 1, 0.42, 0x665544, 0xddcc99, 0x554433, 0x776655, 3.5);
        this._addSpectator(sw * 0.07, fy - 34, "peasant", 1, 0.4, 0x667755, 0xccbb99, 0x556644, 0x556644, 4.0);
        this._addSpectator(sw * 0.93, fy - 34, "villager", -1, 0.4, 0x776655, 0xccaa88, 0x665544, 0x776655, 5.0);
        break;
      }
      case "excalibur": {
        // Sacred grove - monks, druids watching the stone
        this._addSpectator(sw * 0.03, fy - 46, "monk", 1, 0.5, 0x443322, 0xccbb99, 0x332211, 0x554433, 0);
        this._addSpectator(sw * 0.10, fy - 42, "druid", 1, 0.45, 0x334422, 0xccaa88, 0x445533, 0x443322, 1.2);
        this._addSpectator(sw * 0.90, fy - 44, "monk", -1, 0.48, 0x554433, 0xddbb99, 0x443322, 0x665544, 2.5);
        this._addSpectator(sw * 0.96, fy - 40, "peasant", -1, 0.42, 0x665544, 0xccbb99, 0x554433, 0x776655, 3.8);
        this._addSpectator(sw * 0.14, fy - 36, "villager", 1, 0.38, 0x776655, 0xccaa88, 0x665544, 0x665544, 4.5);
        this._addSpectator(sw * 0.86, fy - 36, "villager", -1, 0.38, 0x887766, 0xddcc99, 0x776655, 0x776655, 5.2);
        break;
      }
      case "broceliande": {
        // Deep forest - druids, witches, fairy-folk
        this._addSpectator(sw * 0.04, fy - 44, "witch", 1, 0.48, 0x332244, 0xccbb99, 0x44dd66, 0x221133, 0);
        this._addSpectator(sw * 0.11, fy - 38, "druid", 1, 0.42, 0x334422, 0xbbaa88, 0x446633, 0x443322, 1.5);
        this._addSpectator(sw * 0.89, fy - 40, "druid", -1, 0.45, 0x445533, 0xccbb99, 0x557744, 0x554433, 2.5);
        this._addSpectator(sw * 0.96, fy - 42, "witch", -1, 0.46, 0x442255, 0xccaa88, 0x66ee88, 0x331144, 3.5);
        this._addSpectator(sw * 0.08, fy - 34, "peasant", 1, 0.38, 0x556644, 0xbbaa88, 0x445533, 0x556644, 4.5);
        break;
      }
      case "tintagel": {
        // Seaside cliffs - soldiers, fishermen, villagers
        this._addSpectator(sw * 0.04, fy - 44, "soldier", 1, 0.5, 0x556666, 0xccaa88, 0xeebb55, 0x667777, 0);
        this._addSpectator(sw * 0.10, fy - 38, "fisherman", 1, 0.42, 0x556655, 0xddbb99, 0x445544, 0x887766, 1.5);
        this._addSpectator(sw * 0.90, fy - 40, "villager", -1, 0.44, 0x776655, 0xccbb99, 0x665544, 0x665544, 2.5);
        this._addSpectator(sw * 0.96, fy - 42, "soldier", -1, 0.48, 0x556666, 0xccaa88, 0xeebb55, 0x667777, 3.5);
        this._addSpectator(sw * 0.08, fy - 34, "fisherman", -1, 0.38, 0x667755, 0xccaa88, 0x556644, 0x776655, 4.5);
        this._addSpectator(sw * 0.92, fy - 34, "peasant", 1, 0.38, 0x887766, 0xddcc99, 0x776655, 0x887766, 5.0);
        break;
      }
      case "round_table": {
        // Indoor grand hall - knights, nobles, bard
        this._addSpectator(sw * 0.04, fy - 50, "knight", 1, 0.52, 0x555566, 0xddcc99, 0xddaa33, 0x666677, 0);
        this._addSpectator(sw * 0.10, fy - 48, "noble", 1, 0.48, 0x442266, 0xeeccaa, 0xddaa33, 0xddaa33, 1.0);
        this._addSpectator(sw * 0.16, fy - 44, "knight", 1, 0.44, 0x556677, 0xddcc99, 0xcc2222, 0x667788, 2.0);
        this._addSpectator(sw * 0.84, fy - 44, "knight", -1, 0.44, 0x556677, 0xddcc99, 0x2244aa, 0x667788, 3.0);
        this._addSpectator(sw * 0.90, fy - 48, "noble", -1, 0.48, 0x224488, 0xeeccaa, 0xddaa33, 0xddaa33, 4.0);
        this._addSpectator(sw * 0.96, fy - 50, "knight", -1, 0.52, 0x555566, 0xddcc99, 0xddaa33, 0x666677, 5.0);
        this._addSpectator(sw * 0.14, fy - 36, "bard", 1, 0.4, 0x774422, 0xddcc99, 0xcc4444, 0x663311, 2.5);
        this._addSpectator(sw * 0.86, fy - 36, "noble", -1, 0.4, 0x552244, 0xeeccaa, 0x882244, 0xddaa33, 3.5);
        break;
      }
      case "mordred_throne": {
        // Dark throne room - soldiers (dark), witches
        this._addSpectator(sw * 0.04, fy - 46, "soldier", 1, 0.5, 0x332233, 0xbbaa88, 0xcc44ff, 0x443344, 0);
        this._addSpectator(sw * 0.12, fy - 40, "witch", 1, 0.44, 0x221122, 0xccaa88, 0xcc44ff, 0x110011, 1.5);
        this._addSpectator(sw * 0.88, fy - 42, "witch", -1, 0.46, 0x332233, 0xbbaa88, 0xaa33dd, 0x220022, 2.5);
        this._addSpectator(sw * 0.96, fy - 46, "soldier", -1, 0.5, 0x332233, 0xbbaa88, 0xcc44ff, 0x443344, 3.5);
        this._addSpectator(sw * 0.08, fy - 34, "peasant", 1, 0.38, 0x332233, 0xaa9977, 0x443344, 0x332233, 4.5);
        this._addSpectator(sw * 0.92, fy - 34, "peasant", -1, 0.38, 0x443344, 0xaa9977, 0x332233, 0x443344, 5.5);
        break;
      }
      case "glastonbury": {
        // Abbey - monks, nobles, pilgrims
        this._addSpectator(sw * 0.04, fy - 46, "monk", 1, 0.5, 0x554433, 0xddcc99, 0x443322, 0x665544, 0);
        this._addSpectator(sw * 0.10, fy - 42, "monk", 1, 0.45, 0x665544, 0xddcc99, 0x554433, 0x776655, 1.2);
        this._addSpectator(sw * 0.16, fy - 38, "noble", 1, 0.42, 0x553366, 0xeeccaa, 0xeedd88, 0xddaa33, 2.0);
        this._addSpectator(sw * 0.84, fy - 38, "peasant", -1, 0.42, 0x887766, 0xccbb99, 0x776655, 0x887766, 3.0);
        this._addSpectator(sw * 0.90, fy - 42, "monk", -1, 0.45, 0x554433, 0xddcc99, 0x443322, 0x665544, 4.0);
        this._addSpectator(sw * 0.96, fy - 46, "monk", -1, 0.5, 0x665544, 0xddcc99, 0x554433, 0x776655, 5.0);
        break;
      }
      case "orkney": {
        // Wild wastes - soldiers, peasants, vikings
        this._addSpectator(sw * 0.04, fy - 44, "soldier", 1, 0.5, 0x556655, 0xccaa88, 0xbbaa88, 0x667766, 0);
        this._addSpectator(sw * 0.11, fy - 38, "peasant", 1, 0.42, 0x776655, 0xccaa88, 0x665544, 0x776655, 1.5);
        this._addSpectator(sw * 0.89, fy - 38, "villager", -1, 0.42, 0x887766, 0xccbb99, 0x776655, 0x887766, 2.5);
        this._addSpectator(sw * 0.96, fy - 44, "soldier", -1, 0.5, 0x556655, 0xccaa88, 0xbbaa88, 0x667766, 3.5);
        this._addSpectator(sw * 0.07, fy - 32, "peasant", 1, 0.36, 0x665544, 0xbbaa88, 0x554433, 0x665544, 4.5);
        break;
      }
      case "lake": {
        // Lake sanctuary - druids, fishermen, monks
        this._addSpectator(sw * 0.04, fy - 44, "druid", 1, 0.48, 0x446655, 0xccbb99, 0x66ddff, 0x335544, 0);
        this._addSpectator(sw * 0.10, fy - 38, "fisherman", 1, 0.42, 0x556655, 0xddbb99, 0x445544, 0x887766, 1.5);
        this._addSpectator(sw * 0.90, fy - 40, "monk", -1, 0.45, 0x445555, 0xddcc99, 0x334444, 0x556666, 2.5);
        this._addSpectator(sw * 0.96, fy - 42, "druid", -1, 0.48, 0x557766, 0xccbb99, 0x66ddff, 0x446655, 3.5);
        break;
      }
      case "dragon_peak": {
        // Volcanic peak - soldiers, brave knights
        this._addSpectator(sw * 0.04, fy - 46, "soldier", 1, 0.5, 0x554433, 0xccaa88, 0xff6622, 0x665544, 0);
        this._addSpectator(sw * 0.11, fy - 40, "knight", 1, 0.45, 0x554444, 0xccaa88, 0xff6622, 0x665555, 1.5);
        this._addSpectator(sw * 0.89, fy - 40, "soldier", -1, 0.45, 0x554433, 0xccaa88, 0xff6622, 0x665544, 2.5);
        this._addSpectator(sw * 0.96, fy - 46, "knight", -1, 0.5, 0x554444, 0xccaa88, 0xff6622, 0x665555, 3.5);
        break;
      }
      case "grail_chapel": {
        // Holy chapel - monks, nobles, knights of the grail
        this._addSpectator(sw * 0.04, fy - 48, "monk", 1, 0.5, 0x887766, 0xddcc99, 0xffee99, 0x776655, 0);
        this._addSpectator(sw * 0.10, fy - 44, "knight", 1, 0.46, 0x666688, 0xddcc99, 0xffee99, 0x777799, 1.2);
        this._addSpectator(sw * 0.16, fy - 38, "noble", 1, 0.42, 0x554477, 0xeeccaa, 0xffee99, 0xddaa33, 2.0);
        this._addSpectator(sw * 0.84, fy - 38, "monk", -1, 0.42, 0x776655, 0xddcc99, 0xffee99, 0x665544, 3.0);
        this._addSpectator(sw * 0.90, fy - 44, "noble", -1, 0.46, 0x443366, 0xeeccaa, 0xffee99, 0xddaa33, 4.0);
        this._addSpectator(sw * 0.96, fy - 48, "monk", -1, 0.5, 0x887766, 0xddcc99, 0xffee99, 0x776655, 5.0);
        break;
      }
      case "cornwall": {
        // Coast - fishermen, villagers, sailors
        this._addSpectator(sw * 0.04, fy - 42, "fisherman", 1, 0.48, 0x556655, 0xddbb99, 0xffffff, 0x887766, 0);
        this._addSpectator(sw * 0.10, fy - 36, "villager", 1, 0.42, 0x776655, 0xccbb99, 0xffffff, 0x665544, 1.5);
        this._addSpectator(sw * 0.90, fy - 38, "villager", -1, 0.44, 0x887766, 0xddcc99, 0xffffff, 0x776655, 2.5);
        this._addSpectator(sw * 0.96, fy - 42, "fisherman", -1, 0.48, 0x667755, 0xddbb99, 0xffffff, 0x998877, 3.5);
        this._addSpectator(sw * 0.14, fy - 32, "peasant", 1, 0.38, 0x887766, 0xccaa88, 0xddccbb, 0x776655, 4.5);
        break;
      }
      case "shadow_keep": {
        // Dark fortress - dark soldiers, witches
        this._addSpectator(sw * 0.04, fy - 46, "soldier", 1, 0.5, 0x222230, 0xaa9977, 0x8844cc, 0x333340, 0);
        this._addSpectator(sw * 0.12, fy - 40, "witch", 1, 0.44, 0x111120, 0xaa9977, 0x8844cc, 0x0a0a18, 1.5);
        this._addSpectator(sw * 0.88, fy - 42, "witch", -1, 0.46, 0x1a1a28, 0xaa9977, 0x7733bb, 0x111120, 2.5);
        this._addSpectator(sw * 0.96, fy - 46, "soldier", -1, 0.5, 0x222230, 0xaa9977, 0x8844cc, 0x333340, 3.5);
        break;
      }
      case "camlann": {
        // Battlefield - soldiers, knights on both sides
        this._addSpectator(sw * 0.03, fy - 48, "soldier", 1, 0.5, 0x554840, 0xccaa88, 0xcc3333, 0x665850, 0);
        this._addSpectator(sw * 0.08, fy - 44, "knight", 1, 0.46, 0x555555, 0xccaa88, 0xcc3333, 0x666666, 1.0);
        this._addSpectator(sw * 0.14, fy - 38, "soldier", 1, 0.42, 0x554840, 0xbbaa88, 0xcc3333, 0x665850, 2.0);
        this._addSpectator(sw * 0.86, fy - 38, "soldier", -1, 0.42, 0x554840, 0xbbaa88, 0xcc3333, 0x665850, 3.0);
        this._addSpectator(sw * 0.92, fy - 44, "knight", -1, 0.46, 0x555555, 0xccaa88, 0xcc3333, 0x666666, 4.0);
        this._addSpectator(sw * 0.97, fy - 48, "soldier", -1, 0.5, 0x554840, 0xccaa88, 0xcc3333, 0x665850, 5.0);
        // Wounded soldiers in back
        this._addSpectator(sw * 0.06, fy - 32, "peasant", 1, 0.36, 0x554840, 0xbbaa88, 0x883333, 0x554840, 4.5);
        this._addSpectator(sw * 0.94, fy - 32, "peasant", -1, 0.36, 0x554840, 0xbbaa88, 0x883333, 0x554840, 5.5);
        break;
      }
    }
  }

  update(time: number): void {
    if (!this._arena) return;
    this._animGfx.clear();
    switch (this._arenaId) {
      case "camelot": this._update_camelot(time); break;
      case "avalon": this._update_avalon(time); break;
      case "excalibur": this._update_excalibur(time); break;
      case "broceliande": this._update_broceliande(time); break;
      case "tintagel": this._update_tintagel(time); break;
      case "round_table": this._update_round_table(time); break;
      case "mordred_throne": this._update_mordred_throne(time); break;
      case "glastonbury": this._update_glastonbury(time); break;
      case "orkney": this._update_orkney(time); break;
      case "lake": this._update_lake(time); break;
      case "dragon_peak": this._update_dragon_peak(time); break;
      case "grail_chapel": this._update_grail_chapel(time); break;
      case "cornwall": this._update_cornwall(time); break;
      case "shadow_keep": this._update_shadow_keep(time); break;
      case "camlann": this._update_camlann(time); break;
      default: this._updateGeneric(time); break;
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // CAMELOT COURTYARD
  // =========================================================================

  private _build_camelot(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Multi-layered sky gradient (dawn/dusk blues into warm horizon) ---
    const skyBands = 12;
    for (let i = 0; i < skyBands; i++) {
      const t = i / skyBands;
      const bandY = floorY * t;
      const bandH = floorY / skyBands + 1;
      // Lerp from skyTop to skyBottom
      const r1 = (a.skyTop >> 16) & 0xff,
        g1 = (a.skyTop >> 8) & 0xff,
        b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff,
        g2 = (a.skyBottom >> 8) & 0xff,
        b2 = a.skyBottom & 0xff;
      const r = Math.round(r1 + (r2 - r1) * t);
      const gc = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      const col = (r << 16) | (gc << 8) | b;
      g.rect(0, bandY, sw, bandH);
      g.fill({ color: col });
    }
    // Warm horizon band
    g.rect(0, floorY * 0.75, sw, floorY * 0.25);
    g.fill({ color: 0xcc8855, alpha: 0.12 });
    g.rect(0, floorY * 0.85, sw, floorY * 0.15);
    g.fill({ color: 0xddaa66, alpha: 0.08 });

    // --- Distant mountain silhouettes (layer 1 – far) ---
    g.moveTo(0, floorY * 0.48);
    g.lineTo(sw * 0.08, floorY * 0.36);
    g.lineTo(sw * 0.18, floorY * 0.42);
    g.lineTo(sw * 0.28, floorY * 0.3);
    g.lineTo(sw * 0.4, floorY * 0.38);
    g.lineTo(sw * 0.52, floorY * 0.28);
    g.lineTo(sw * 0.62, floorY * 0.35);
    g.lineTo(sw * 0.72, floorY * 0.32);
    g.lineTo(sw * 0.85, floorY * 0.38);
    g.lineTo(sw * 0.95, floorY * 0.34);
    g.lineTo(sw, floorY * 0.4);
    g.lineTo(sw, floorY * 0.5);
    g.lineTo(0, floorY * 0.5);
    g.closePath();
    g.fill({ color: 0x556680, alpha: 0.3 });

    // Mountain silhouettes (layer 2 – closer)
    g.moveTo(0, floorY * 0.52);
    g.lineTo(sw * 0.1, floorY * 0.44);
    g.lineTo(sw * 0.22, floorY * 0.48);
    g.lineTo(sw * 0.35, floorY * 0.4);
    g.lineTo(sw * 0.48, floorY * 0.46);
    g.lineTo(sw * 0.6, floorY * 0.38);
    g.lineTo(sw * 0.7, floorY * 0.44);
    g.lineTo(sw * 0.82, floorY * 0.4);
    g.lineTo(sw * 0.92, floorY * 0.46);
    g.lineTo(sw, floorY * 0.48);
    g.lineTo(sw, floorY * 0.55);
    g.lineTo(0, floorY * 0.55);
    g.closePath();
    g.fill({ color: 0x445566, alpha: 0.4 });

    // --- Massive castle wall backdrop ---
    const wallH = floorY * 0.55;
    const wallY = floorY - wallH;

    // Wall main body
    g.rect(0, wallY, sw, wallH);
    g.fill({ color: 0x6a6a62 });

    // Stone texture lines – horizontal mortar
    for (let y = wallY + 15; y < floorY; y += 18) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x5a5a52, width: 0.7, alpha: 0.5 });
    }
    // Stone texture lines – vertical mortar (offset every other row)
    let rowIdx = 0;
    for (let y = wallY; y < floorY; y += 18) {
      const offset = (rowIdx % 2) * 22;
      for (let x = offset; x < sw; x += 44) {
        g.moveTo(x, y).lineTo(x, y + 18);
        g.stroke({ color: 0x5a5a52, width: 0.6, alpha: 0.4 });
      }
      rowIdx++;
    }

    // --- Crenellated battlements (merlons and crenels) ---
    const merlonW = 22;
    const merlonH = 18;
    const crenelW = 14;
    for (let x = 0; x < sw; x += merlonW + crenelW) {
      // Merlon (raised part)
      g.rect(x, wallY - merlonH, merlonW, merlonH);
      g.fill({ color: 0x6a6a62 });
      g.rect(x, wallY - merlonH, merlonW, merlonH);
      g.stroke({ color: 0x555550, width: 1 });
      // Stone line on merlon
      g.moveTo(x, wallY - merlonH / 2).lineTo(x + merlonW, wallY - merlonH / 2);
      g.stroke({ color: 0x5a5a52, width: 0.5, alpha: 0.4 });
    }

    // --- Large arched gateway in center background ---
    const gateX = sw / 2;
    const gateW = 60;
    const gateH = wallH * 0.65;
    const gateTop = floorY - gateH;
    // Dark interior
    g.rect(gateX - gateW / 2, gateTop + 20, gateW, gateH - 20);
    g.fill({ color: 0x1a1a22 });
    // Arch top
    { const r = gateW / 2; g.moveTo(gateX + r * Math.cos(Math.PI), gateTop + 20 + r * Math.sin(Math.PI)); }
    g.arc(gateX, gateTop + 20, gateW / 2, Math.PI, 0);
    g.lineTo(gateX + gateW / 2, gateTop + 20);
    g.lineTo(gateX - gateW / 2, gateTop + 20);
    g.closePath();
    g.fill({ color: 0x1a1a22 });
    // Gate arch frame
    { const r = gateW / 2 + 5; g.moveTo(gateX + r * Math.cos(Math.PI), gateTop + 20 + r * Math.sin(Math.PI)); }
    g.arc(gateX, gateTop + 20, gateW / 2 + 5, Math.PI, 0);
    g.stroke({ color: 0x7a7a72, width: 5 });
    // Vertical frame pillars
    g.rect(gateX - gateW / 2 - 5, gateTop + 20, 5, gateH - 20);
    g.fill({ color: 0x7a7a72 });
    g.rect(gateX + gateW / 2, gateTop + 20, 5, gateH - 20);
    g.fill({ color: 0x7a7a72 });
    // Portcullis lines
    for (let px = gateX - gateW / 2 + 8; px < gateX + gateW / 2; px += 10) {
      g.moveTo(px, gateTop + 22).lineTo(px, floorY);
      g.stroke({ color: 0x444440, width: 1.5, alpha: 0.6 });
    }
    for (let py = gateTop + 30; py < floorY; py += 12) {
      g.moveTo(gateX - gateW / 2 + 5, py).lineTo(gateX + gateW / 2 - 5, py);
      g.stroke({ color: 0x444440, width: 1, alpha: 0.4 });
    }

    // --- Arrow slit windows with dark interiors ---
    const windowPositions = [
      sw * 0.08, sw * 0.18, sw * 0.28, sw * 0.38,
      sw * 0.62, sw * 0.72, sw * 0.82, sw * 0.92,
    ];
    for (const wx of windowPositions) {
      const wy = wallY + wallH * 0.2;
      // Dark slit
      g.roundRect(wx - 4, wy, 8, 28, 4);
      g.fill({ color: 0x111118 });
      // Stone frame
      g.roundRect(wx - 6, wy - 2, 12, 32, 5);
      g.stroke({ color: 0x7a7a72, width: 1.5 });
      // Cross slit detail
      g.moveTo(wx - 6, wy + 14).lineTo(wx + 6, wy + 14);
      g.stroke({ color: 0x111118, width: 2 });
    }

    // --- Torch sconces (static brackets, flames are animated) ---
    const torchXs = [
      sw * 0.12, sw * 0.24, sw * 0.36,
      sw * 0.64, sw * 0.76, sw * 0.88,
    ];
    for (const tx of torchXs) {
      const ty = wallY + wallH * 0.45;
      // Iron bracket
      g.rect(tx - 2, ty, 4, 18);
      g.fill({ color: 0x3a3a3a });
      g.rect(tx - 6, ty + 12, 12, 4);
      g.fill({ color: 0x3a3a3a });
      // Torch handle
      g.rect(tx - 2, ty - 10, 4, 14);
      g.fill({ color: 0x6b4c2a });
      // Register flame for animation
      this._flames.push({ x: tx, y: ty - 14, baseRadius: 6, phase: tx * 0.1 });
    }

    // --- Static torch glow (radial gradient simulation) ---
    for (const tx of torchXs) {
      const ty = wallY + wallH * 0.45 - 14;
      for (let r = 40; r > 0; r -= 5) {
        g.circle(tx, ty, r);
        g.fill({ color: 0xff8833, alpha: 0.008 });
      }
    }

    // --- Banners (register for animation) ---
    const bannerXs = [
      sw * 0.06, sw * 0.16, sw * 0.3,
      sw * 0.46, sw * 0.56, sw * 0.7, sw * 0.84, sw * 0.94,
    ];
    for (let i = 0; i < bannerXs.length; i++) {
      const bx = bannerXs[i];
      const by = wallY + 12;
      // Static pole
      g.rect(bx - 1.5, by - 55, 3, 75);
      g.fill({ color: 0x8b7355 });
      g.circle(bx, by - 55, 3);
      g.fill({ color: 0xddaa33 });
      // Register banner for animated sway
      this._banners.push({
        x: bx + 2,
        y: by - 50,
        width: 26,
        height: 45,
        phase: i * 0.8,
        color: i % 2 === 0 ? a.accentColor : 0xcc1111,
        trimColor: 0xddaa33,
      });
    }

    // --- Stone cobblestone floor ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });

    // Floor highlight strip
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.6 });

    // Worn stone edge detail
    for (let x = 0; x < sw; x += 8) {
      const h = 1 + Math.sin(x * 0.3) * 1.5;
      g.rect(x, floorY - 1, 6, h + 1);
      g.fill({ color: 0x777770, alpha: 0.5 });
    }

    // Cobblestone mortar grid
    let tileRow = 0;
    for (let y = floorY + 2; y < sh; y += 16) {
      const off = (tileRow % 2) * 18;
      for (let x = off; x < sw; x += 36) {
        g.roundRect(x + 1, y + 1, 34, 14, 2);
        g.stroke({ color: a.groundHighlight, width: 0.6, alpha: 0.25 });
      }
      tileRow++;
    }

    // Cobblestone color variation
    for (let y = floorY + 2; y < sh; y += 16) {
      for (let x = 0; x < sw; x += 36) {
        const seed = Math.sin(x * 0.7 + y * 0.3) * 0.5 + 0.5;
        if (seed > 0.7) {
          g.rect(x + 2, y + 2, 32, 12);
          g.fill({ color: a.groundHighlight, alpha: 0.08 });
        }
      }
    }

    // Floor shadow near wall
    g.rect(0, floorY, sw, 10);
    g.fill({ color: 0x000000, alpha: 0.08 });

    // --- Atmospheric fog overlay ---
    g.rect(0, floorY * 0.6, sw, floorY * 0.4);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Puddle reflections on cobblestones ---
    const puddlePositions = [
      { x: sw * 0.18, y: floorY + 14, rx: 16, ry: 5 },
      { x: sw * 0.52, y: floorY + 20, rx: 12, ry: 4 },
      { x: sw * 0.74, y: floorY + 10, rx: 18, ry: 5 },
      { x: sw * 0.38, y: floorY + 22, rx: 10, ry: 3 },
    ];
    for (const pd of puddlePositions) {
      g.ellipse(pd.x, pd.y, pd.rx, pd.ry);
      g.fill({ color: 0x889baa, alpha: 0.12 });
      g.ellipse(pd.x - pd.rx * 0.2, pd.y - pd.ry * 0.3, pd.rx * 0.4, pd.ry * 0.4);
      g.fill({ color: 0xaabbcc, alpha: 0.08 });
    }

    // --- Hanging flower baskets on the wall ---
    for (const bx of [sw * 0.2, sw * 0.8]) {
      const by = wallY + wallH * 0.32;
      // Basket semi-circle
      g.moveTo(bx - 10, by);
      g.arc(bx, by, 10, Math.PI, 0);
      g.fill({ color: 0x5a4a30 });
      g.moveTo(bx - 12, by);
      g.arc(bx, by, 12, Math.PI, 0);
      g.stroke({ color: 0x6b5535, width: 1.5 });
      // Colorful flower dots
      const flowerColors = [0xff6688, 0xffaa44, 0xff5577, 0xffcc55, 0xee7799];
      for (let fi = 0; fi < 5; fi++) {
        const fx = bx - 8 + fi * 4;
        const fy = by - 3 - Math.sin(fi * 1.5) * 4;
        g.circle(fx, fy, 2.5);
        g.fill({ color: flowerColors[fi], alpha: 0.7 });
      }
      // Green leaves underneath
      g.ellipse(bx, by + 4, 10, 3);
      g.fill({ color: 0x447733, alpha: 0.5 });
    }

    // --- Warm golden light pools under each torch ---
    for (const tx of torchXs) {
      g.ellipse(tx, floorY + 5, 30, 7);
      g.fill({ color: 0xffaa44, alpha: 0.04 });
      g.ellipse(tx, floorY + 5, 20, 5);
      g.fill({ color: 0xffcc66, alpha: 0.03 });
    }

    // --- Pigeon droppings on battlements ---
    const dropSeeds = [12, 47, 78, 115, 156, 193, 234, 267, 310, 345, 378, 410];
    for (const ds of dropSeeds) {
      const dx = (ds * 2.7) % sw;
      const dy = wallY - merlonH + 2 + Math.sin(ds) * 6;
      g.circle(dx, dy, 1.2 + Math.sin(ds * 3) * 0.5);
      g.fill({ color: 0xddddcc, alpha: 0.25 });
    }

    // --- Market stalls on far sides ---
    this._drawMarketStall(g, sw * 0.02, floorY - 40, 50, 40, 0x7a5c3a, 0xcc5533);
    this._drawMarketStall(g, sw * 0.88, floorY - 38, 48, 38, 0x7a5c3a, 0x3366aa);

    // --- Spectators: guards, merchants, peasants, nobles ---
    // Guards standing watch (far sides of courtyard)
    this._addSpectator(sw * 0.04, floorY - 50, "guard", 1, 0.55, 0x666677, 0xddbb99, 0xcc2222, 0x777788, 0);
    this._addSpectator(sw * 0.96, floorY - 50, "guard", -1, 0.55, 0x666677, 0xddbb99, 0xcc2222, 0x777788, 1.5);
    this._addSpectator(sw * 0.12, floorY - 48, "guard", 1, 0.5, 0x666677, 0xccaa88, 0xcc2222, 0x777788, 3.0);
    this._addSpectator(sw * 0.88, floorY - 48, "guard", -1, 0.5, 0x666677, 0xccaa88, 0xcc2222, 0x777788, 4.5);

    // Merchants at stalls
    this._addSpectator(sw * 0.06, floorY - 42, "merchant", 1, 0.5, 0x885522, 0xddbb99, 0xddaa33, 0x993322, 0.5);
    this._addSpectator(sw * 0.92, floorY - 40, "merchant", -1, 0.5, 0x335588, 0xddbb99, 0xddaa33, 0x224477, 2.0);

    // Peasants/shoppers near stalls
    this._addSpectator(sw * 0.08, floorY - 38, "peasant", 1, 0.45, 0x887755, 0xccaa88, 0x887766, 0x776644, 1.0);
    this._addSpectator(sw * 0.10, floorY - 36, "peasant", -1, 0.4, 0x776644, 0xddbb99, 0x776655, 0x665533, 2.5);
    this._addSpectator(sw * 0.90, floorY - 36, "peasant", 1, 0.4, 0x997755, 0xccbb99, 0x886655, 0x775544, 3.5);

    // Nobles observing
    this._addSpectator(sw * 0.16, floorY - 44, "noble", 1, 0.5, 0x442266, 0xeeccaa, 0xcc2222, 0xddaa33, 0.8);
    this._addSpectator(sw * 0.84, floorY - 44, "noble", -1, 0.5, 0x224488, 0xeeccaa, 0x2244aa, 0xddaa33, 2.3);

    // Soldiers in the back row
    this._addSpectator(sw * 0.22, floorY - 55, "soldier", 1, 0.45, 0x556666, 0xccaa88, 0xcc2222, 0x667777, 1.3);
    this._addSpectator(sw * 0.78, floorY - 55, "soldier", -1, 0.45, 0x556666, 0xccaa88, 0xcc2222, 0x667777, 3.8);

    // Bard entertaining the crowd
    this._addSpectator(sw * 0.14, floorY - 36, "bard", 1, 0.42, 0x774422, 0xddcc99, 0xcc4444, 0x663311, 4.0);

    // --- Unique critter: castle cat patrolling the wall base ---
    this._critters.push({
      x: sw * 0.2, y: floorY - 3, baseX: sw * 0.4, baseY: floorY - 3,
      phase: 0, type: "cat", dir: 1, speed: 0.35, state: 0,
    });
  }

  private _update_camelot(time: number): void {
    const g = this._animGfx;

    // Animated banners (gentle sway)
    for (const b of this._banners) {
      const sway = Math.sin(time * 1.5 + b.phase) * 4;
      const sway2 = Math.sin(time * 2.3 + b.phase) * 2;
      // Banner cloth with sway (drawn as a distorted quad)
      g.moveTo(b.x, b.y);
      g.lineTo(b.x + b.width + sway * 0.3, b.y);
      g.lineTo(b.x + b.width + sway, b.y + b.height * 0.5);
      g.lineTo(b.x + b.width + sway2, b.y + b.height);
      g.lineTo(b.x + sway2 * 0.5, b.y + b.height);
      g.lineTo(b.x + sway * 0.2, b.y + b.height * 0.5);
      g.closePath();
      g.fill({ color: b.color });
      // Gold trim at top
      g.moveTo(b.x, b.y);
      g.lineTo(b.x + b.width + sway * 0.3, b.y);
      g.lineTo(b.x + b.width + sway * 0.35, b.y + 5);
      g.lineTo(b.x, b.y + 5);
      g.closePath();
      g.fill({ color: b.trimColor });
      // Gold trim at bottom
      g.moveTo(b.x + sway2 * 0.5, b.y + b.height - 4);
      g.lineTo(b.x + b.width + sway2, b.y + b.height - 4);
      g.lineTo(b.x + b.width + sway2, b.y + b.height);
      g.lineTo(b.x + sway2 * 0.5, b.y + b.height);
      g.closePath();
      g.fill({ color: b.trimColor, alpha: 0.7 });
      // Center emblem (simple diamond)
      const cx = b.x + b.width / 2 + sway * 0.5;
      const cy = b.y + b.height * 0.45;
      g.moveTo(cx, cy - 6);
      g.lineTo(cx + 5, cy);
      g.lineTo(cx, cy + 6);
      g.lineTo(cx - 5, cy);
      g.closePath();
      g.fill({ color: b.trimColor, alpha: 0.9 });
    }

    // Animated flames with ember particles
    for (const f of this._flames) {
      const flicker = Math.sin(time * 8 + f.phase) * 2;
      const flicker2 = Math.cos(time * 12 + f.phase * 1.7) * 1.5;
      const flicker3 = Math.sin(time * 5 + f.phase * 0.5) * 1;
      // Large ambient glow around torch
      g.circle(f.x, f.y - 4, f.baseRadius + 12 + flicker3 * 2);
      g.fill({ color: 0xff6600, alpha: 0.04 + Math.sin(time * 3 + f.phase) * 0.015 });
      // Outer glow
      g.circle(f.x + flicker2 * 0.3, f.y - 2, f.baseRadius + 4 + flicker3);
      g.fill({ color: 0xff6600, alpha: 0.15 });
      // Outer flame
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.5, f.baseRadius + 1, f.baseRadius + 3 + flicker);
      g.fill({ color: 0xff6611, alpha: 0.7 });
      // Middle flame
      g.ellipse(f.x - flicker2 * 0.3, f.y - 1 - flicker * 0.3, f.baseRadius * 0.7, f.baseRadius + 1 + flicker * 0.5);
      g.fill({ color: 0xff8833, alpha: 0.85 });
      // Inner flame
      g.ellipse(f.x + flicker2 * 0.2, f.y - flicker * 0.2, f.baseRadius * 0.4, f.baseRadius * 0.7 + flicker * 0.3);
      g.fill({ color: 0xffdd44, alpha: 0.95 });
      // Bright core
      g.circle(f.x, f.y + 1, 2);
      g.fill({ color: 0xffffcc, alpha: 0.9 });
      // Rising ember/spark particles from each torch
      for (let ei = 0; ei < 3; ei++) {
        const emberPhase = time * 1.5 + f.phase + ei * 2.1;
        const emberY = f.y - 10 - ((emberPhase * 12) % 40);
        const emberX = f.x + Math.sin(emberPhase * 2.3) * 6;
        const emberAlpha = Math.max(0, 0.5 - ((emberPhase * 12) % 40) / 40);
        g.circle(emberX, emberY, 1.0);
        g.fill({ color: 0xffaa33, alpha: emberAlpha * 0.7 });
      }
    }

    // --- Slow-drifting clouds in the sky ---
    const sw = this._sw;
    const floorY = this._floorY;

    // --- Floating dust motes in the air (lit by torch light) ---
    for (let di = 0; di < 8; di++) {
      const dustPhase = time * 0.15 + di * 1.7;
      const dustX = (sw * 0.05 + di * sw * 0.12 + Math.sin(dustPhase * 0.8) * 15) % sw;
      const dustY = floorY * 0.3 + Math.sin(dustPhase * 0.5 + di) * floorY * 0.25;
      const dustAlpha = 0.08 + Math.sin(dustPhase * 1.5) * 0.04;
      g.circle(dustX, dustY, 1.2);
      g.fill({ color: 0xffddaa, alpha: dustAlpha });
    }

    // --- Ground-level dust wisps (near fighters' feet area) ---
    for (let dw = 0; dw < 4; dw++) {
      const wispPhase = time * 0.3 + dw * 2.0;
      const wispX = (sw * 0.2 + dw * sw * 0.2 + Math.sin(wispPhase) * 30) % sw;
      const wispY = floorY + 2 + Math.sin(wispPhase * 0.7) * 3;
      const wispAlpha = 0.04 + Math.sin(wispPhase * 1.2) * 0.02;
      g.ellipse(wispX, wispY, 20 + Math.sin(wispPhase * 0.5) * 5, 4);
      g.fill({ color: 0xccccbb, alpha: wispAlpha });
    }

    for (let ci = 0; ci < 3; ci++) {
      const cloudSpeed = 0.008 + ci * 0.003;
      const cloudX = ((time * cloudSpeed * sw + ci * sw * 0.4) % (sw + 160)) - 80;
      const cloudY = floorY * (0.08 + ci * 0.06);
      const cloudW = 50 + ci * 15;
      const cloudH = 10 + ci * 3;
      g.ellipse(cloudX, cloudY, cloudW, cloudH);
      g.fill({ color: 0xccbbaa, alpha: 0.06 - ci * 0.01 });
      g.ellipse(cloudX + cloudW * 0.3, cloudY - cloudH * 0.3, cloudW * 0.6, cloudH * 0.7);
      g.fill({ color: 0xddccbb, alpha: 0.04 });
    }

    // --- Occasional falling leaves ---
    for (let li = 0; li < 4; li++) {
      const leafPhase = time * 0.4 + li * 2.5;
      const leafX = (sw * 0.15 + li * sw * 0.22 + Math.sin(leafPhase * 1.3) * 20) % sw;
      const leafY = ((leafPhase * 25) % (floorY + 20)) - 10;
      const leafSway = Math.sin(leafPhase * 2.5) * 3;
      const leafAlpha = 0.4 + Math.sin(leafPhase) * 0.15;
      g.ellipse(leafX + leafSway, leafY, 3, 1.5);
      g.fill({ color: li % 2 === 0 ? 0x885522 : 0x996633, alpha: leafAlpha });
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // AVALON SHORE
  // =========================================================================

  private _build_avalon(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Ethereal sky gradient (deep purple -> misty blue -> silver horizon) ---
    const skyColors = [
      0x2a1848, 0x332255, 0x3d3066, 0x4a4077, 0x556088,
      0x607099, 0x7088aa, 0x8099bb, 0x99aacc, 0xaabbdd,
      0xbbccdd, 0xccdde8,
    ];
    const bandH = floorY / skyColors.length + 1;
    for (let i = 0; i < skyColors.length; i++) {
      g.rect(0, bandH * i, sw, bandH + 1);
      g.fill({ color: skyColors[i] });
    }
    // Silver horizon glow
    g.rect(0, floorY * 0.8, sw, floorY * 0.2);
    g.fill({ color: 0xddeeff, alpha: 0.1 });

    // --- Moonbeam from top left ---
    g.moveTo(0, 0);
    g.lineTo(sw * 0.15, 0);
    g.lineTo(sw * 0.55, floorY);
    g.lineTo(sw * 0.2, floorY);
    g.closePath();
    g.fill({ color: 0xccddff, alpha: 0.04 });
    g.moveTo(sw * 0.02, 0);
    g.lineTo(sw * 0.1, 0);
    g.lineTo(sw * 0.42, floorY);
    g.lineTo(sw * 0.28, floorY);
    g.closePath();
    g.fill({ color: 0xddeeFF, alpha: 0.03 });

    // --- Moon ---
    const moonX = sw * 0.12;
    const moonY = floorY * 0.15;
    // Moon glow rings
    for (let r = 40; r > 0; r -= 4) {
      g.circle(moonX, moonY, r);
      g.fill({ color: 0xccddff, alpha: 0.006 });
    }
    g.circle(moonX, moonY, 18);
    g.fill({ color: 0xeeeeff, alpha: 0.8 });
    g.circle(moonX + 6, moonY - 4, 15);
    g.fill({ color: skyColors[0] }); // crescent

    // --- Distant isle silhouette (Avalon island) floating in mist ---
    const isleX = sw * 0.5;
    const isleY = floorY * 0.62;
    // Mist around island
    g.ellipse(isleX, isleY + 8, 90, 12);
    g.fill({ color: 0xaabbcc, alpha: 0.2 });
    // Island shape
    g.moveTo(isleX - 70, isleY);
    g.quadraticCurveTo(isleX - 40, isleY - 30, isleX - 10, isleY - 35);
    g.quadraticCurveTo(isleX + 10, isleY - 50, isleX + 25, isleY - 35);
    g.quadraticCurveTo(isleX + 50, isleY - 25, isleX + 70, isleY);
    g.closePath();
    g.fill({ color: 0x334455, alpha: 0.5 });
    // Tower on island
    g.rect(isleX - 5, isleY - 60, 10, 28);
    g.fill({ color: 0x3a4a5a, alpha: 0.45 });
    g.moveTo(isleX - 8, isleY - 60);
    g.lineTo(isleX, isleY - 72);
    g.lineTo(isleX + 8, isleY - 60);
    g.closePath();
    g.fill({ color: 0x3a4a5a, alpha: 0.45 });
    // Tower window
    g.circle(isleX, isleY - 48, 2);
    g.fill({ color: 0xaaddff, alpha: 0.3 });

    // --- Tree silhouettes (layer 1 – far, ethereal) ---
    const farTrees = [
      { x: sw * 0.02, h: 80 }, { x: sw * 0.08, h: 100 },
      { x: sw * 0.15, h: 70 }, { x: sw * 0.85, h: 90 },
      { x: sw * 0.9, h: 110 }, { x: sw * 0.97, h: 75 },
    ];
    for (const t of farTrees) {
      // Bare willow silhouette
      g.rect(t.x - 3, floorY - t.h, 6, t.h);
      g.fill({ color: 0x2a3a44, alpha: 0.35 });
      // Branches
      for (let b = 0; b < 5; b++) {
        const angle = -0.8 + b * 0.4;
        const bLen = 25 + b * 5;
        const bx = t.x + Math.cos(angle) * bLen;
        const by = floorY - t.h + 15 + Math.sin(angle) * bLen * 0.3;
        g.moveTo(t.x, floorY - t.h + 15);
        g.lineTo(bx, by);
        g.stroke({ color: 0x2a3a44, width: 1.5, alpha: 0.3 });
        // Drooping willow tendrils
        for (let d = 0; d < 3; d++) {
          const dx = bx + (d - 1) * 6;
          g.moveTo(dx, by);
          g.lineTo(dx + 2, by + 20 + d * 5);
          g.stroke({ color: 0x2a3a44, width: 0.8, alpha: 0.2 });
        }
      }
    }

    // --- Tree silhouettes (layer 2 – closer) ---
    const nearTrees = [
      { x: -10, h: 130 }, { x: sw * 0.04, h: 110 },
      { x: sw * 0.95, h: 120 }, { x: sw + 10, h: 115 },
    ];
    for (const t of nearTrees) {
      g.rect(t.x - 5, floorY - t.h, 10, t.h);
      g.fill({ color: 0x1a2a33, alpha: 0.5 });
      // Canopy
      g.ellipse(t.x, floorY - t.h - 10, 30, 22);
      g.fill({ color: 0x1a2a33, alpha: 0.4 });
      // Branches
      for (let b = 0; b < 4; b++) {
        const angle = -1 + b * 0.5;
        const bLen = 35;
        g.moveTo(t.x, floorY - t.h + 20);
        g.lineTo(t.x + Math.cos(angle) * bLen, floorY - t.h + 20 + Math.sin(angle) * 15);
        g.stroke({ color: 0x1a2a33, width: 2, alpha: 0.4 });
      }
    }

    // --- Sandy/earthy ground with grass tufts ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    // Earthy texture bands
    g.rect(0, floorY, sw, 4);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    g.rect(0, floorY + 4, sw, 2);
    g.fill({ color: 0x443322, alpha: 0.3 });

    // Grass tufts along shore
    for (let x = 0; x < sw; x += 12 + Math.sin(x) * 4) {
      const baseY = floorY;
      const blades = 3 + Math.floor(Math.sin(x * 0.5) * 2);
      for (let b = 0; b < blades; b++) {
        const bx = x + (b - blades / 2) * 2;
        const bh = 6 + Math.sin(x * 0.7 + b) * 3;
        g.moveTo(bx, baseY);
        g.lineTo(bx + (b - 1) * 1.5, baseY - bh);
        g.stroke({ color: 0x557744, width: 1, alpha: 0.5 });
      }
    }

    // --- Rocks and pebbles along the shoreline ---
    const rocks = [
      { x: sw * 0.1, y: floorY + 3, rx: 12, ry: 6 },
      { x: sw * 0.25, y: floorY + 2, rx: 8, ry: 4 },
      { x: sw * 0.42, y: floorY + 4, rx: 15, ry: 7 },
      { x: sw * 0.58, y: floorY + 2, rx: 10, ry: 5 },
      { x: sw * 0.75, y: floorY + 3, rx: 14, ry: 6 },
      { x: sw * 0.9, y: floorY + 2, rx: 9, ry: 4 },
    ];
    for (const r of rocks) {
      g.ellipse(r.x, r.y, r.rx, r.ry);
      g.fill({ color: 0x667766 });
      g.ellipse(r.x, r.y, r.rx, r.ry);
      g.stroke({ color: 0x556655, width: 1 });
      // Highlight
      g.ellipse(r.x - r.rx * 0.2, r.y - r.ry * 0.3, r.rx * 0.5, r.ry * 0.4);
      g.fill({ color: 0x778877, alpha: 0.4 });
    }
    // Pebbles
    for (let i = 0; i < 20; i++) {
      const px = Math.sin(i * 7.3) * sw * 0.45 + sw * 0.5;
      const py = floorY + 6 + (i % 4) * 3;
      g.ellipse(px, py, 3 + (i % 3), 2);
      g.fill({ color: 0x778877, alpha: 0.4 });
    }

    // --- Water surface below the fighting area ---
    const waterY = floorY + 18;
    // Water body
    g.rect(0, waterY, sw, sh - waterY);
    g.fill({ color: 0x2a4455 });
    // Water color variation
    g.rect(0, waterY, sw, 6);
    g.fill({ color: 0x3a5566, alpha: 0.5 });
    g.rect(0, waterY + (sh - waterY) * 0.5, sw, (sh - waterY) * 0.5);
    g.fill({ color: 0x1a3344, alpha: 0.3 });

    // --- Moonlight reflection on water ---
    const refX = sw * 0.25;
    for (let i = 0; i < 8; i++) {
      const ry = waterY + 8 + i * 6;
      const rw = 20 - i * 2;
      g.rect(refX - rw / 2 + Math.sin(i * 0.8) * 4, ry, rw, 2);
      g.fill({ color: 0xccddff, alpha: 0.12 - i * 0.01 });
    }

    // --- Lily pads with flowers ---
    const lilies = [
      { x: sw * 0.2, y: waterY + 14 },
      { x: sw * 0.45, y: waterY + 20 },
      { x: sw * 0.65, y: waterY + 12 },
      { x: sw * 0.8, y: waterY + 22 },
      { x: sw * 0.35, y: waterY + 28 },
    ];
    for (const l of lilies) {
      // Pad
      g.ellipse(l.x, l.y, 8, 4);
      g.fill({ color: 0x336633, alpha: 0.6 });
      // Notch
      g.moveTo(l.x, l.y);
      g.lineTo(l.x + 5, l.y - 2);
      g.lineTo(l.x + 5, l.y + 2);
      g.closePath();
      g.fill({ color: 0x2a4455 });
      // Flower (every other)
      if (Math.sin(l.x) > 0) {
        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * Math.PI * 2;
          g.ellipse(l.x + Math.cos(pa) * 3, l.y - 4 + Math.sin(pa) * 2, 2, 1.5);
          g.fill({ color: 0xeeddff, alpha: 0.7 });
        }
        g.circle(l.x, l.y - 4, 1.5);
        g.fill({ color: 0xffee88, alpha: 0.8 });
      }
    }

    // --- Register animated ripples ---
    for (let i = 0; i < 8; i++) {
      this._ripples.push({
        y: waterY + 4 + i * 7,
        amplitude: 1.5 + Math.random() * 1.5,
        frequency: 0.04 + Math.random() * 0.02,
        speed: 0.8 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.15 + Math.random() * 0.1,
      });
    }

    // --- Register mist/fog layers ---
    for (let i = 0; i < 5; i++) {
      this._mistLayers.push({
        y: floorY * 0.55 + i * floorY * 0.1,
        speed: 8 + i * 5,
        offset: i * 200,
        alpha: 0.06 + i * 0.015,
        height: 20 + i * 8,
      });
    }

    // --- Register firefly-like magical sparkle particles ---
    for (let i = 0; i < 25; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY * 0.4 + Math.random() * floorY * 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.15,
        radius: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: a.accentColor,
      });
    }

    // --- Fog overlay ---
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha * 0.5 });

    // --- Aurora / northern lights in the sky ---
    const auroraColors = [
      { color: 0x22cc88, y: floorY * 0.06, h: floorY * 0.08 },
      { color: 0x8844cc, y: floorY * 0.12, h: floorY * 0.06 },
      { color: 0x44cccc, y: floorY * 0.02, h: floorY * 0.05 },
      { color: 0x66dd66, y: floorY * 0.17, h: floorY * 0.04 },
    ];
    for (const ab of auroraColors) {
      g.rect(sw * 0.1, ab.y, sw * 0.8, ab.h);
      g.fill({ color: ab.color, alpha: 0.04 });
      g.ellipse(sw * 0.5, ab.y + ab.h * 0.5, sw * 0.35, ab.h * 0.6);
      g.fill({ color: ab.color, alpha: 0.025 });
    }

    // --- Glowing runes carved on standing stones/rocks ---
    const runePositions = [
      { x: sw * 0.15, y: floorY * 0.76 }, { x: sw * 0.85, y: floorY * 0.75 },
      { x: sw * 0.72, y: floorY + 1 }, { x: sw * 0.38, y: floorY + 3 },
    ];
    for (const rp of runePositions) {
      // Small glowing rune mark (vertical line with crossbar)
      g.moveTo(rp.x, rp.y - 4);
      g.lineTo(rp.x, rp.y + 4);
      g.stroke({ color: 0x88ddff, width: 1.2, alpha: 0.5 });
      g.moveTo(rp.x - 3, rp.y - 1);
      g.lineTo(rp.x + 3, rp.y + 1);
      g.stroke({ color: 0x88ddff, width: 1, alpha: 0.4 });
      // Rune glow halo
      g.circle(rp.x, rp.y, 6);
      g.fill({ color: 0x88ddff, alpha: 0.06 });
    }

    // --- More detailed lily pad flowers (extra petals) ---
    const lilyPositions = [
      { x: sw * 0.3, y: floorY + 22 }, { x: sw * 0.55, y: floorY + 28 },
      { x: sw * 0.75, y: floorY + 18 },
    ];
    for (const lp of lilyPositions) {
      // Lily pad base
      g.ellipse(lp.x, lp.y, 8, 4);
      g.fill({ color: 0x336644, alpha: 0.35 });
      // Flower petals (5 small ellipses in a ring)
      for (let pi = 0; pi < 5; pi++) {
        const pa = (pi / 5) * Math.PI * 2;
        const px = lp.x + Math.cos(pa) * 3;
        const py = lp.y - 2 + Math.sin(pa) * 1.5;
        g.ellipse(px, py, 2.5, 1.5);
        g.fill({ color: 0xffaacc, alpha: 0.4 });
      }
      // Flower center
      g.circle(lp.x, lp.y - 2, 1.5);
      g.fill({ color: 0xffdd66, alpha: 0.5 });
    }

    // --- Unique critter: ghostly swan gliding across the water ---
    this._critters.push({
      x: sw * 0.1, y: floorY + 8, baseX: sw * 0.5, baseY: floorY + 8,
      phase: 0, type: "swan", dir: 1, speed: 0.25, state: 0,
    });
  }

  private _update_avalon(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;

    // Animated water ripples
    for (const r of this._ripples) {
      g.moveTo(0, r.y);
      for (let x = 0; x < sw; x += 4) {
        const yOff = Math.sin(x * r.frequency + time * r.speed + r.phase) * r.amplitude;
        g.lineTo(x, r.y + yOff);
      }
      g.lineTo(sw, r.y);
      g.stroke({ color: 0x6699aa, width: 0.8, alpha: r.alpha * (0.7 + Math.sin(time * 0.5 + r.phase) * 0.3) });
    }

    // Animated glow spots on water
    const waterY = this._floorY + 18;
    for (let i = 0; i < 4; i++) {
      const gx = sw * 0.2 + i * sw * 0.2 + Math.sin(time * 0.3 + i * 2) * 15;
      const gy = waterY + 10 + Math.sin(time * 0.5 + i) * 5;
      const gAlpha = 0.08 + Math.sin(time * 0.7 + i * 1.5) * 0.04;
      g.circle(gx, gy, 10);
      g.fill({ color: 0x88ccff, alpha: gAlpha });
      g.circle(gx, gy, 4);
      g.fill({ color: 0xaaddff, alpha: gAlpha * 1.5 });
    }

    // Animated rolling mist layers
    for (const m of this._mistLayers) {
      const offset = (time * m.speed + m.offset) % (sw + 200) - 100;
      // Draw several mist blobs per layer
      for (let i = 0; i < 6; i++) {
        const mx = (offset + i * (sw / 5)) % (sw + 100) - 50;
        const pulse = Math.sin(time * 0.4 + i + m.y * 0.01) * 0.02;
        g.ellipse(mx, m.y, 60 + i * 10, m.height * 0.5);
        g.fill({ color: 0xaabbcc, alpha: m.alpha + pulse });
      }
    }

    // Animated magical sparkle particles (fireflies)
    for (const p of this._particles) {
      // Update position
      p.x += p.vx + Math.sin(time * 1.5 + p.phase) * 0.2;
      p.y += p.vy + Math.cos(time * 1.2 + p.phase) * 0.15;
      // Wrap around
      if (p.y < this._floorY * 0.3) {
        p.y = this._floorY * 0.9;
        p.x = Math.random() * sw;
      }
      if (p.x < -10) p.x = sw + 10;
      if (p.x > sw + 10) p.x = -10;
      // Pulsing alpha
      const pulseAlpha = p.alpha * (0.5 + Math.sin(time * 2 + p.phase) * 0.5);
      // Glow
      g.circle(p.x, p.y, p.radius + 3);
      g.fill({ color: p.color, alpha: pulseAlpha * 0.2 });
      // Core
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: 0xffffff, alpha: pulseAlpha });
    }

    // --- Aurora shimmer (slowly shifting color bands) ---
    const floorY = this._floorY;
    const auroraShimmerColors = [0x22cc88, 0x8844cc, 0x44cccc];
    for (let ai = 0; ai < 3; ai++) {
      const aShift = Math.sin(time * 0.15 + ai * 1.8) * sw * 0.08;
      const aAlpha = 0.025 + Math.sin(time * 0.3 + ai * 2.2) * 0.012;
      const aY = floorY * (0.04 + ai * 0.05) + Math.sin(time * 0.2 + ai) * 3;
      g.ellipse(sw * 0.5 + aShift, aY, sw * 0.38 + Math.sin(time * 0.25 + ai) * 15, floorY * 0.03);
      g.fill({ color: auroraShimmerColors[ai], alpha: aAlpha });
    }

    // --- Falling cherry blossom petals ---
    for (let bi = 0; bi < 6; bi++) {
      const bPhase = time * 0.35 + bi * 1.7;
      const bX = (sw * 0.1 + bi * sw * 0.16 + Math.sin(bPhase * 1.8) * 25) % sw;
      const bY = ((bPhase * 18) % (floorY * 1.1 + 30)) - 15;
      const bSway = Math.sin(bPhase * 3) * 4;
      const bAlpha = 0.35 + Math.sin(bPhase * 2) * 0.15;
      const bColor = bi % 2 === 0 ? 0xffaacc : 0xffbbdd;
      g.ellipse(bX + bSway, bY, 2.5, 1.5);
      g.fill({ color: bColor, alpha: bAlpha });
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // EXCALIBUR'S STONE
  // =========================================================================

  private _build_excalibur(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Deep dark sky ---
    g.rect(0, 0, sw, floorY);
    g.fill({ color: a.skyTop });
    // Subtle color at horizon
    g.rect(0, floorY * 0.7, sw, floorY * 0.3);
    g.fill({ color: a.skyBottom, alpha: 0.3 });

    // --- Stars (register for twinkling animation) ---
    for (let i = 0; i < 60; i++) {
      const sx = Math.sin(i * 7.3 + 1.2) * sw * 0.48 + sw * 0.5;
      const sy = Math.cos(i * 4.1 + 0.8) * floorY * 0.35 + floorY * 0.18;
      const sr = 0.5 + Math.sin(i * 3.3) * 0.5;
      const baseAlpha = 0.4 + Math.sin(i * 2.1) * 0.3;
      this._stars.push({
        x: sx, y: sy, radius: sr,
        baseAlpha, twinkleSpeed: 1 + Math.sin(i) * 1.5, phase: i * 1.7,
      });
      // Static star base
      g.circle(sx, sy, sr);
      g.fill({ color: 0xffffff, alpha: baseAlpha * 0.5 });
    }

    // --- Large crescent moon with glow ---
    const moonX = sw * 0.78;
    const moonY = floorY * 0.18;
    // Moon glow layers
    for (let r = 50; r > 0; r -= 4) {
      g.circle(moonX, moonY, r);
      g.fill({ color: 0xeeddcc, alpha: 0.005 });
    }
    // Moon body
    g.circle(moonX, moonY, 28);
    g.fill({ color: 0xeeeedd, alpha: 0.85 });
    // Crescent cutout
    g.circle(moonX + 10, moonY - 6, 23);
    g.fill({ color: a.skyTop });
    // Moonbeam illuminating the sword (center)
    const beamCX = sw / 2;
    g.moveTo(moonX - 15, moonY + 20);
    g.lineTo(moonX + 5, moonY + 20);
    g.lineTo(beamCX + 35, floorY);
    g.lineTo(beamCX - 35, floorY);
    g.closePath();
    g.fill({ color: 0xeeddcc, alpha: 0.035 });
    g.moveTo(moonX - 8, moonY + 20);
    g.lineTo(moonX, moonY + 20);
    g.lineTo(beamCX + 18, floorY);
    g.lineTo(beamCX - 18, floorY);
    g.closePath();
    g.fill({ color: 0xeeddcc, alpha: 0.025 });

    // --- Dense dark forest backdrop (layer 1 – furthest) ---
    for (let i = 0; i < 18; i++) {
      const tx = i * (sw / 17) - 10 + Math.sin(i * 2.7) * 15;
      const th = 60 + (i % 5) * 18 + Math.sin(i * 1.3) * 10;
      const treeBot = floorY * 0.65 + (i % 3) * 8;
      // Trunk
      g.rect(tx - 3, treeBot - th, 6, th);
      g.fill({ color: 0x0e1a0e, alpha: 0.4 });
      // Tree top (triangular, layered)
      for (let j = 0; j < 3; j++) {
        const layerH = 22 + j * 6;
        const layerW = 18 + j * 6;
        const layerY = treeBot - th - 10 + j * 14;
        g.moveTo(tx, layerY);
        g.lineTo(tx - layerW, layerY + layerH);
        g.lineTo(tx + layerW, layerY + layerH);
        g.closePath();
        g.fill({ color: 0x0e1a0e, alpha: 0.35 });
      }
    }

    // --- Forest backdrop (layer 2 – middle) ---
    for (let i = 0; i < 14; i++) {
      const tx = i * (sw / 13) - 5 + Math.sin(i * 3.2 + 1) * 20;
      const th = 80 + (i % 4) * 22;
      const treeBot = floorY * 0.72 + (i % 3) * 6;
      g.rect(tx - 4, treeBot - th, 8, th);
      g.fill({ color: 0x111e11, alpha: 0.55 });
      for (let j = 0; j < 3; j++) {
        const layerH = 25 + j * 8;
        const layerW = 20 + j * 8;
        const layerY = treeBot - th - 12 + j * 16;
        g.moveTo(tx, layerY);
        g.lineTo(tx - layerW, layerY + layerH);
        g.lineTo(tx + layerW, layerY + layerH);
        g.closePath();
        g.fill({ color: 0x142214, alpha: 0.5 });
      }
    }

    // --- Forest backdrop (layer 3 – closest, flanking) ---
    const closeTrees = [
      { x: -15, h: 150 }, { x: sw * 0.04, h: 140 },
      { x: sw * 0.1, h: 130 }, { x: sw * 0.16, h: 145 },
      { x: sw * 0.84, h: 135 }, { x: sw * 0.9, h: 148 },
      { x: sw * 0.96, h: 130 }, { x: sw + 15, h: 145 },
    ];
    for (const t of closeTrees) {
      const treeBot = floorY;
      g.rect(t.x - 6, treeBot - t.h, 12, t.h);
      g.fill({ color: 0x0c180c });
      for (let j = 0; j < 4; j++) {
        const layerH = 28 + j * 10;
        const layerW = 24 + j * 10;
        const layerY = treeBot - t.h - 15 + j * 18;
        g.moveTo(t.x, layerY);
        g.lineTo(t.x - layerW, layerY + layerH);
        g.lineTo(t.x + layerW, layerY + layerH);
        g.closePath();
        g.fill({ color: 0x1a2e1a, alpha: 0.7 });
      }
      // Roots at base
      for (let r = 0; r < 3; r++) {
        const rx = t.x + (r - 1) * 10;
        g.moveTo(t.x, treeBot - 5);
        g.quadraticCurveTo(rx, treeBot, rx + (r - 1) * 8, treeBot + 3);
        g.stroke({ color: 0x1a2a1a, width: 2, alpha: 0.6 });
      }
    }

    // --- Central sword-in-stone monument ---
    const stoneX = sw / 2;
    const stoneY = floorY - 3;

    // Large stone base with irregular shape
    g.moveTo(stoneX - 38, stoneY);
    g.lineTo(stoneX - 35, stoneY - 22);
    g.lineTo(stoneX - 28, stoneY - 32);
    g.lineTo(stoneX - 18, stoneY - 38);
    g.lineTo(stoneX - 5, stoneY - 42);
    g.lineTo(stoneX + 8, stoneY - 40);
    g.lineTo(stoneX + 22, stoneY - 34);
    g.lineTo(stoneX + 32, stoneY - 24);
    g.lineTo(stoneX + 38, stoneY - 10);
    g.lineTo(stoneX + 40, stoneY);
    g.closePath();
    g.fill({ color: 0x556655 });
    g.moveTo(stoneX - 38, stoneY);
    g.lineTo(stoneX - 35, stoneY - 22);
    g.lineTo(stoneX - 28, stoneY - 32);
    g.lineTo(stoneX - 18, stoneY - 38);
    g.lineTo(stoneX - 5, stoneY - 42);
    g.lineTo(stoneX + 8, stoneY - 40);
    g.lineTo(stoneX + 22, stoneY - 34);
    g.lineTo(stoneX + 32, stoneY - 24);
    g.lineTo(stoneX + 38, stoneY - 10);
    g.lineTo(stoneX + 40, stoneY);
    g.closePath();
    g.stroke({ color: 0x445544, width: 1.5 });

    // Stone texture cracks
    g.moveTo(stoneX - 20, stoneY - 35);
    g.lineTo(stoneX - 15, stoneY - 20);
    g.lineTo(stoneX - 22, stoneY - 10);
    g.stroke({ color: 0x4a5a4a, width: 0.8 });
    g.moveTo(stoneX + 15, stoneY - 32);
    g.lineTo(stoneX + 10, stoneY - 18);
    g.stroke({ color: 0x4a5a4a, width: 0.8 });

    // Moss on stone
    g.ellipse(stoneX - 25, stoneY - 18, 10, 5);
    g.fill({ color: 0x336633, alpha: 0.5 });
    g.ellipse(stoneX + 18, stoneY - 12, 8, 4);
    g.fill({ color: 0x2a5a2a, alpha: 0.45 });
    g.ellipse(stoneX + 5, stoneY - 5, 12, 4);
    g.fill({ color: 0x336633, alpha: 0.4 });

    // Sword slit in stone
    g.rect(stoneX - 3, stoneY - 42, 6, 10);
    g.fill({ color: 0x3a3a44 });

    // Excalibur blade
    g.moveTo(stoneX, stoneY - 90);
    g.lineTo(stoneX - 3.5, stoneY - 42);
    g.lineTo(stoneX + 3.5, stoneY - 42);
    g.closePath();
    g.fill({ color: 0xccccdd });
    // Blade edge highlight
    g.moveTo(stoneX, stoneY - 88);
    g.lineTo(stoneX - 1, stoneY - 44);
    g.stroke({ color: 0xeeeeff, width: 1, alpha: 0.6 });

    // Blade fuller (center groove)
    g.moveTo(stoneX, stoneY - 85);
    g.lineTo(stoneX, stoneY - 48);
    g.stroke({ color: 0xaaaabc, width: 1.5, alpha: 0.5 });

    // Crossguard
    g.moveTo(stoneX - 14, stoneY - 44);
    g.lineTo(stoneX - 16, stoneY - 40);
    g.lineTo(stoneX + 16, stoneY - 40);
    g.lineTo(stoneX + 14, stoneY - 44);
    g.closePath();
    g.fill({ color: 0xddaa33 });
    g.moveTo(stoneX - 14, stoneY - 44);
    g.lineTo(stoneX - 16, stoneY - 40);
    g.lineTo(stoneX + 16, stoneY - 40);
    g.lineTo(stoneX + 14, stoneY - 44);
    g.closePath();
    g.stroke({ color: 0xbb8822, width: 1 });

    // Grip
    g.rect(stoneX - 2.5, stoneY - 40, 5, 10);
    g.fill({ color: 0x553311 });
    // Grip wrap lines
    for (let gy = stoneY - 39; gy < stoneY - 31; gy += 2.5) {
      g.moveTo(stoneX - 2.5, gy).lineTo(stoneX + 2.5, gy + 1.5);
      g.stroke({ color: 0x442200, width: 0.6 });
    }

    // Pommel
    g.circle(stoneX, stoneY - 30, 4);
    g.fill({ color: 0xddaa33 });
    g.circle(stoneX, stoneY - 30, 4);
    g.stroke({ color: 0xbb8822, width: 1 });
    // Pommel jewel
    g.circle(stoneX, stoneY - 30, 1.8);
    g.fill({ color: 0xff4444, alpha: 0.8 });

    // Static golden glow around sword
    for (let r = 35; r > 0; r -= 3) {
      g.circle(stoneX, stoneY - 55, r);
      g.fill({ color: a.accentColor, alpha: 0.008 });
    }

    // --- Moss-covered boulders and rocks scattered around ---
    const boulders = [
      { x: sw * 0.15, y: floorY, rx: 28, ry: 14 },
      { x: sw * 0.28, y: floorY + 2, rx: 18, ry: 9 },
      { x: sw * 0.72, y: floorY + 1, rx: 22, ry: 11 },
      { x: sw * 0.85, y: floorY, rx: 30, ry: 15 },
      { x: sw * 0.38, y: floorY + 3, rx: 12, ry: 6 },
      { x: sw * 0.62, y: floorY + 2, rx: 14, ry: 7 },
    ];
    for (const b of boulders) {
      // Rock body
      g.ellipse(b.x, b.y, b.rx, b.ry);
      g.fill({ color: 0x445544 });
      g.ellipse(b.x, b.y, b.rx, b.ry);
      g.stroke({ color: 0x3a4a3a, width: 1 });
      // Highlight
      g.ellipse(b.x - b.rx * 0.2, b.y - b.ry * 0.4, b.rx * 0.5, b.ry * 0.4);
      g.fill({ color: 0x556655, alpha: 0.4 });
      // Moss
      g.ellipse(b.x + b.rx * 0.1, b.y - b.ry * 0.5, b.rx * 0.6, b.ry * 0.3);
      g.fill({ color: 0x336633, alpha: 0.5 });
    }

    // --- Forest floor: dark earth with roots, leaves, and mossy patches ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });

    // Floor highlight
    g.rect(0, floorY, sw, 2);
    g.fill({ color: a.groundHighlight, alpha: 0.3 });

    // Dark earthy texture bands
    for (let y = floorY + 6; y < sh; y += 10) {
      const alpha = 0.05 + Math.sin(y * 0.3) * 0.03;
      g.rect(0, y, sw, 4);
      g.fill({ color: 0x221a11, alpha });
    }

    // Root-like lines across the ground
    const rootPaths = [
      { sx: sw * 0.1, sy: floorY + 2, ex: sw * 0.25, ey: floorY + 8 },
      { sx: sw * 0.18, sy: floorY + 1, ex: sw * 0.35, ey: floorY + 10 },
      { sx: sw * 0.65, sy: floorY + 3, ex: sw * 0.82, ey: floorY + 7 },
      { sx: sw * 0.78, sy: floorY + 1, ex: sw * 0.92, ey: floorY + 9 },
    ];
    for (const rp of rootPaths) {
      g.moveTo(rp.sx, rp.sy);
      g.quadraticCurveTo((rp.sx + rp.ex) / 2, rp.sy + 6, rp.ex, rp.ey);
      g.stroke({ color: 0x2a2210, width: 2, alpha: 0.4 });
    }

    // Fallen leaves
    for (let i = 0; i < 30; i++) {
      const lx = Math.sin(i * 5.7 + 0.3) * sw * 0.48 + sw * 0.5;
      const ly = floorY + 3 + (i % 6) * 5;
      const lr = 2 + (i % 3);
      const leafColor = i % 3 === 0 ? 0x664422 : i % 3 === 1 ? 0x554411 : 0x885522;
      g.ellipse(lx, ly, lr, lr * 0.5);
      g.fill({ color: leafColor, alpha: 0.35 });
    }

    // Mossy patches on ground
    const mossPatches = [sw * 0.2, sw * 0.4, sw * 0.6, sw * 0.8];
    for (const mx of mossPatches) {
      g.ellipse(mx, floorY + 4, 20, 4);
      g.fill({ color: 0x2a5522, alpha: 0.25 });
    }

    // Twigs
    for (let i = 0; i < 8; i++) {
      const tx = Math.sin(i * 9 + 2) * sw * 0.4 + sw * 0.5;
      const ty = floorY + 2 + (i % 4) * 4;
      const tLen = 8 + (i % 3) * 4;
      const tAngle = Math.sin(i * 3) * 0.3;
      g.moveTo(tx, ty);
      g.lineTo(tx + Math.cos(tAngle) * tLen, ty + Math.sin(tAngle) * 2);
      g.stroke({ color: 0x3a2a1a, width: 1.2, alpha: 0.35 });
    }

    // --- Register magical mist particles rising from ground ---
    for (let i = 0; i < 18; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY - Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.2 - Math.random() * 0.3,
        radius: 1 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: a.accentColor,
      });
    }

    // --- Register fireflies ---
    for (let i = 0; i < 15; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY * 0.5 + Math.random() * floorY * 0.45,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 1 + Math.random() * 1.2,
        alpha: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: 0x88ff88,
      });
    }

    // --- Register mist layers ---
    for (let i = 0; i < 4; i++) {
      this._mistLayers.push({
        y: floorY - 10 + i * 8,
        speed: 3 + i * 2,
        offset: i * 150,
        alpha: 0.04 + i * 0.01,
        height: 14 + i * 4,
      });
    }

    // --- Fog overlay ---
    g.rect(0, floorY * 0.55, sw, floorY * 0.45);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Glowing mushrooms on the forest floor ---
    const mushrooms = [
      { x: sw * 0.08, y: floorY + 4, color: 0x44aaff },
      { x: sw * 0.22, y: floorY + 6, color: 0x33dd88 },
      { x: sw * 0.42, y: floorY + 3, color: 0x44bbff },
      { x: sw * 0.58, y: floorY + 5, color: 0x33cc77 },
      { x: sw * 0.78, y: floorY + 4, color: 0x55aaee },
      { x: sw * 0.92, y: floorY + 7, color: 0x44dd99 },
    ];
    for (const m of mushrooms) {
      // Mushroom stem
      g.rect(m.x - 1.5, m.y - 5, 3, 6);
      g.fill({ color: 0xccccaa, alpha: 0.4 });
      // Mushroom cap (semi-circle)
      g.moveTo(m.x - 6, m.y - 5);
      g.arc(m.x, m.y - 5, 6, Math.PI, 0);
      g.fill({ color: m.color, alpha: 0.45 });
      // Bio-luminescent glow
      g.circle(m.x, m.y - 5, 10);
      g.fill({ color: m.color, alpha: 0.06 });
      g.circle(m.x, m.y - 5, 5);
      g.fill({ color: m.color, alpha: 0.1 });
    }

    // --- Spider web between trees (top-left corner area) ---
    const webCX = sw * 0.12;
    const webCY = floorY * 0.55;
    const webR = 22;
    // Radial threads
    for (let wi = 0; wi < 8; wi++) {
      const wAngle = (wi / 8) * Math.PI * 2;
      g.moveTo(webCX, webCY);
      g.lineTo(webCX + Math.cos(wAngle) * webR, webCY + Math.sin(wAngle) * webR);
      g.stroke({ color: 0xcccccc, width: 0.4, alpha: 0.18 });
    }
    // Concentric rings
    for (let wr = 6; wr <= webR; wr += 7) {
      g.moveTo(webCX + wr, webCY);
      g.arc(webCX, webCY, wr, 0, Math.PI * 2);
      g.stroke({ color: 0xcccccc, width: 0.3, alpha: 0.12 });
    }

    // --- Detailed tree bark texture on nearest trees ---
    for (const tx of [sw * 0.04, sw * 0.94]) {
      const barkY = floorY * 0.5;
      for (let bi = 0; bi < 8; bi++) {
        const by = barkY + bi * 12;
        const bw = 8 + Math.sin(bi * 2.3) * 3;
        g.moveTo(tx - bw, by);
        g.lineTo(tx + bw, by);
        g.stroke({ color: 0x2a1a0a, width: 1.2, alpha: 0.25 });
      }
    }

    // --- Owl pellets / scattered bones near the owl ---
    const boneX = sw * 0.15;
    const boneY = floorY + 2;
    for (let bi = 0; bi < 5; bi++) {
      const ox = boneX - 8 + bi * 4 + Math.sin(bi * 4) * 3;
      const oy = boneY + Math.sin(bi * 3) * 2;
      g.ellipse(ox, oy, 2, 0.8);
      g.fill({ color: 0xccccbb, alpha: 0.2 });
    }
    // Small skull shape
    g.circle(boneX + 2, boneY - 1, 2);
    g.fill({ color: 0xccccbb, alpha: 0.18 });
    g.circle(boneX + 1, boneY - 2, 0.6);
    g.fill({ color: 0x222211, alpha: 0.15 });
    g.circle(boneX + 3, boneY - 2, 0.6);
    g.fill({ color: 0x222211, alpha: 0.15 });

    // --- Unique critter: owl perched on a high branch ---
    this._critters.push({
      x: sw * 0.15, y: floorY * 0.45, baseX: sw * 0.15, baseY: floorY * 0.45,
      phase: 0, type: "owl", dir: 1, speed: 0, state: 0,
    });
  }

  private _update_excalibur(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    const floorY = this._floorY;
    const a = this._arena!;

    // Twinkling stars
    for (const s of this._stars) {
      const twinkle = 0.5 + Math.sin(time * s.twinkleSpeed + s.phase) * 0.5;
      const alpha = s.baseAlpha * twinkle;
      if (alpha > 0.15) {
        g.circle(s.x, s.y, s.radius + twinkle * 0.5);
        g.fill({ color: 0xffffff, alpha });
        // Star glow for bright ones
        if (alpha > 0.5) {
          g.circle(s.x, s.y, s.radius + 3);
          g.fill({ color: 0xccddff, alpha: alpha * 0.15 });
        }
      }
    }

    // Animated magical glow/particles around the sword
    const stoneX = sw / 2;
    const stoneY = floorY - 3;
    // Pulsing sword glow
    const glowPulse = 0.5 + Math.sin(time * 1.2) * 0.3;
    for (let r = 30; r > 0; r -= 4) {
      g.circle(stoneX, stoneY - 55, r);
      g.fill({ color: a.accentColor, alpha: 0.012 * glowPulse });
    }
    // Orbiting sparkles around the sword
    for (let i = 0; i < 6; i++) {
      const angle = time * 0.8 + (i / 6) * Math.PI * 2;
      const orbitR = 18 + Math.sin(time * 1.5 + i) * 5;
      const ox = stoneX + Math.cos(angle) * orbitR;
      const oy = stoneY - 55 + Math.sin(angle) * orbitR * 0.5;
      const oAlpha = 0.4 + Math.sin(time * 2 + i * 1.3) * 0.3;
      g.circle(ox, oy, 1.5);
      g.fill({ color: a.accentColor, alpha: oAlpha });
      g.circle(ox, oy, 4);
      g.fill({ color: a.accentColor, alpha: oAlpha * 0.15 });
    }

    // Animated mist rising from ground
    for (const m of this._mistLayers) {
      const offset = (time * m.speed + m.offset) % (sw + 200) - 100;
      for (let i = 0; i < 5; i++) {
        const mx = (offset + i * (sw / 4)) % (sw + 100) - 50;
        const pulse = Math.sin(time * 0.3 + i + m.y * 0.02) * 0.015;
        g.ellipse(mx, m.y, 50 + i * 8, m.height * 0.5);
        g.fill({ color: 0x224433, alpha: m.alpha + pulse });
      }
    }

    // Animated particles (magical mist + fireflies)
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.2 + p.phase) * 0.15;
      p.y += p.vy + Math.cos(time * 0.8 + p.phase) * 0.1;

      // Wrap/reset
      if (p.color === 0x88ff88) {
        // Fireflies: wander
        if (p.y < floorY * 0.3) p.vy = Math.abs(p.vy);
        if (p.y > floorY - 5) p.vy = -Math.abs(p.vy);
        if (p.x < -10) p.x = sw + 10;
        if (p.x > sw + 10) p.x = -10;
      } else {
        // Magic mist: rise and reset
        if (p.y < floorY * 0.4) {
          p.y = floorY - Math.random() * 10;
          p.x = Math.random() * sw;
        }
      }

      const pulseAlpha = p.alpha * (0.4 + Math.sin(time * 2.5 + p.phase) * 0.6);
      // Glow
      g.circle(p.x, p.y, p.radius + 3);
      g.fill({ color: p.color, alpha: pulseAlpha * 0.15 });
      // Core
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: pulseAlpha });
    }

    // --- Slow pulsing mushroom glow ---
    const mushroomSpots = [
      { x: sw * 0.08, y: floorY + 4, color: 0x44aaff },
      { x: sw * 0.22, y: floorY + 6, color: 0x33dd88 },
      { x: sw * 0.42, y: floorY + 3, color: 0x44bbff },
      { x: sw * 0.58, y: floorY + 5, color: 0x33cc77 },
      { x: sw * 0.78, y: floorY + 4, color: 0x55aaee },
      { x: sw * 0.92, y: floorY + 7, color: 0x44dd99 },
    ];
    for (let mi = 0; mi < mushroomSpots.length; mi++) {
      const ms = mushroomSpots[mi];
      const mPulse = 0.04 + Math.sin(time * 0.8 + mi * 1.3) * 0.03;
      g.circle(ms.x, ms.y - 5, 12 + Math.sin(time * 1.2 + mi) * 2);
      g.fill({ color: ms.color, alpha: mPulse });
    }

    // --- Drifting pollen / spores floating up ---
    for (let si = 0; si < 8; si++) {
      const sPhase = time * 0.5 + si * 1.1;
      const sX = (sw * 0.05 + si * sw * 0.12 + Math.sin(sPhase * 0.8) * 15) % sw;
      const sY = floorY - ((sPhase * 12) % (floorY * 0.5));
      const sAlpha = 0.25 + Math.sin(sPhase * 2.5) * 0.12;
      g.circle(sX, sY, 1);
      g.fill({ color: 0xddeeaa, alpha: sAlpha });
      g.circle(sX, sY, 3);
      g.fill({ color: 0xddeeaa, alpha: sAlpha * 0.15 });
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }


  // =========================================================================
  // Helper: draw a sky gradient from arena palette
  // =========================================================================

  private _drawSkyGradient(g: Graphics, a: DuelArenaDef, sw: number, floorY: number, bands = 12): void {
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const r1 = (a.skyTop >> 16) & 0xff, g1 = (a.skyTop >> 8) & 0xff, b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff, g2 = (a.skyBottom >> 8) & 0xff, b2 = a.skyBottom & 0xff;
      const col = (Math.round(r1 + (r2 - r1) * t) << 16) |
                  (Math.round(g1 + (g2 - g1) * t) << 8) |
                   Math.round(b1 + (b2 - b1) * t);
      g.rect(0, floorY * t, sw, floorY / bands + 1);
      g.fill({ color: col });
    }
  }

  // =========================================================================
  // THE ROUND TABLE — Grand hall interior, circular table, candles, tapestries
  // =========================================================================

  private _build_round_table(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Dark interior ceiling
    g.rect(0, 0, sw, floorY);
    g.fill({ color: a.skyTop });
    // Warm ambient light gradient from below
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: 0x332211, alpha: 0.3 });

    // Ceiling beams (heavy timber)
    for (let i = 0; i < 8; i++) {
      const bx = sw * (0.06 + i * 0.13);
      g.rect(bx - 4, 0, 8, floorY * 0.08);
      g.fill({ color: 0x3a2a18 });
      g.rect(bx - 3, 0, 6, floorY * 0.08);
      g.fill({ color: 0x4a3a28, alpha: 0.5 });
    }
    // Cross beams
    g.rect(0, floorY * 0.06, sw, 6);
    g.fill({ color: 0x3a2a18 });
    g.rect(0, floorY * 0.06, sw, 3);
    g.fill({ color: 0x4a3a28, alpha: 0.5 });

    // Vaulted ceiling arches
    for (let i = 0; i < 6; i++) {
      const cx = sw * (0.1 + i * 0.16);
      { const r = sw * 0.09; g.moveTo(cx + r, floorY * 0.08); }
      g.arc(cx, floorY * 0.08, sw * 0.09, 0, Math.PI);
      g.stroke({ color: 0x3a2a22, width: 8 });
      g.moveTo(cx + sw * 0.09, floorY * 0.08);
      g.arc(cx, floorY * 0.08, sw * 0.09, 0, Math.PI);
      g.stroke({ color: 0x4a3a30, width: 4 });
      // Keystone detail
      g.rect(cx - 4, floorY * 0.08 - 4, 8, 8);
      g.fill({ color: 0x5a4a38 });
    }
    // Ceiling keystone line
    g.moveTo(0, floorY * 0.08);
    g.lineTo(sw, floorY * 0.08);
    g.stroke({ color: 0x4a3a30, width: 3 });

    // Back wall with rich stone
    const wallY = floorY * 0.12;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x443322 });
    // Stone block pattern
    for (let y = wallY + 10; y < floorY; y += 16) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x3a2a1a, width: 0.6, alpha: 0.4 });
    }
    let sRow = 0;
    for (let y = wallY; y < floorY; y += 16) {
      const off = (sRow % 2) * 20;
      for (let x = off; x < sw; x += 40) {
        g.moveTo(x, y).lineTo(x, y + 16);
        g.stroke({ color: 0x3a2a1a, width: 0.5, alpha: 0.3 });
      }
      sRow++;
    }
    // Mortar highlights on wall
    for (let y = wallY + 10; y < floorY; y += 32) {
      g.moveTo(0, y + 1).lineTo(sw, y + 1);
      g.stroke({ color: 0x554433, width: 0.4, alpha: 0.2 });
    }

    // Grand fireplace (center back wall)
    const fpX = sw * 0.5;
    const fpY = floorY * 0.45;
    // Mantle
    g.rect(fpX - 50, fpY - 10, 100, 10);
    g.fill({ color: 0x5a4a38 });
    g.rect(fpX - 52, fpY - 12, 104, 4);
    g.fill({ color: 0x6a5a48 });
    // Firebox
    g.moveTo(fpX - 40, fpY);
    g.lineTo(fpX - 35, fpY - 50);
    g.quadraticCurveTo(fpX, fpY - 65, fpX + 35, fpY - 50);
    g.lineTo(fpX + 40, fpY);
    g.closePath();
    g.fill({ color: 0x1a0a00 });
    // Fire glow inside
    for (let r = 30; r > 0; r -= 5) {
      g.circle(fpX, fpY - 15, r);
      g.fill({ color: 0xff6622, alpha: 0.008 });
    }
    // Logs
    g.moveTo(fpX - 20, fpY - 5);
    g.lineTo(fpX + 15, fpY - 8);
    g.stroke({ color: 0x3a2a15, width: 5, cap: "round" });
    g.moveTo(fpX - 15, fpY - 3);
    g.lineTo(fpX + 20, fpY - 6);
    g.stroke({ color: 0x4a3a25, width: 4, cap: "round" });
    this._flames.push({ x: fpX, y: fpY - 20, baseRadius: 10, phase: 0 });
    this._flames.push({ x: fpX - 8, y: fpY - 16, baseRadius: 7, phase: 1.2 });
    this._flames.push({ x: fpX + 8, y: fpY - 16, baseRadius: 7, phase: 2.4 });

    // Large tapestries on back wall
    const tapestryXs = [sw * 0.1, sw * 0.28, sw * 0.72, sw * 0.9];
    const tapColors = [0xaa2222, 0x2244aa, 0xaa2222, 0x2244aa];
    for (let i = 0; i < tapestryXs.length; i++) {
      const tx = tapestryXs[i];
      const ty = wallY + 15;
      const tw = 44;
      const th = 90;
      // Rod with finials
      g.rect(tx - tw / 2 - 6, ty - 5, tw + 12, 5);
      g.fill({ color: 0x8b7355 });
      g.circle(tx - tw / 2 - 6, ty - 2, 3);
      g.fill({ color: 0x8b7355 });
      g.circle(tx + tw / 2 + 6, ty - 2, 3);
      g.fill({ color: 0x8b7355 });
      // Tapestry body
      g.rect(tx - tw / 2, ty, tw, th);
      g.fill({ color: tapColors[i] });
      // Gold border with inner border
      g.rect(tx - tw / 2, ty, tw, th);
      g.stroke({ color: a.accentColor, width: 2 });
      g.rect(tx - tw / 2 + 4, ty + 4, tw - 8, th - 8);
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.4 });
      // Central emblem (shield shape)
      g.moveTo(tx, ty + 15);
      g.lineTo(tx - 12, ty + 28);
      g.lineTo(tx - 12, ty + 50);
      g.lineTo(tx, ty + 62);
      g.lineTo(tx + 12, ty + 50);
      g.lineTo(tx + 12, ty + 28);
      g.closePath();
      g.fill({ color: a.accentColor, alpha: 0.4 });
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.6 });
      // Cross or crown on emblem
      if (i % 2 === 0) {
        g.rect(tx - 1, ty + 22, 2, 20);
        g.fill({ color: a.accentColor, alpha: 0.6 });
        g.rect(tx - 6, ty + 30, 12, 2);
        g.fill({ color: a.accentColor, alpha: 0.6 });
      } else {
        // Crown
        g.moveTo(tx - 8, ty + 42);
        g.lineTo(tx - 6, ty + 30);
        g.lineTo(tx - 2, ty + 36);
        g.lineTo(tx, ty + 28);
        g.lineTo(tx + 2, ty + 36);
        g.lineTo(tx + 6, ty + 30);
        g.lineTo(tx + 8, ty + 42);
        g.closePath();
        g.fill({ color: a.accentColor, alpha: 0.5 });
      }
      // Fringe
      for (let fx = tx - tw / 2 + 3; fx < tx + tw / 2; fx += 4) {
        g.moveTo(fx, ty + th);
        g.lineTo(fx, ty + th + 8);
        g.stroke({ color: a.accentColor, width: 1, alpha: 0.5 });
      }
      this._banners.push({
        x: tx - tw / 2, y: ty, width: tw, height: th,
        phase: i * 1.5, color: tapColors[i], trimColor: a.accentColor,
      });
    }

    // Weapon displays between tapestries
    for (const wx of [sw * 0.19, sw * 0.81]) {
      const wy = wallY + 40;
      // Shield
      g.circle(wx, wy, 12);
      g.fill({ color: 0x883322 });
      g.circle(wx, wy, 12);
      g.stroke({ color: 0x665522, width: 2 });
      g.circle(wx, wy, 4);
      g.fill({ color: 0xbbaa55 });
      // Crossed swords behind shield
      g.moveTo(wx - 18, wy - 18);
      g.lineTo(wx + 18, wy + 18);
      g.stroke({ color: 0x999999, width: 2 });
      g.moveTo(wx + 18, wy - 18);
      g.lineTo(wx - 18, wy + 18);
      g.stroke({ color: 0x999999, width: 2 });
    }

    // Round table in background (perspective ellipse)
    const tableX = sw * 0.5;
    const tableY = floorY * 0.74;
    const tableRX = sw * 0.24;
    const tableRY = 20;
    // Table shadow
    g.ellipse(tableX, tableY + 8, tableRX + 6, tableRY + 3);
    g.fill({ color: 0x000000, alpha: 0.2 });
    // Table body — outer ring
    g.ellipse(tableX, tableY, tableRX, tableRY);
    g.fill({ color: 0x5a3a1a });
    g.ellipse(tableX, tableY, tableRX, tableRY);
    g.stroke({ color: 0x4a2a0a, width: 3 });
    // Wood grain ring
    g.ellipse(tableX, tableY, tableRX * 0.85, tableRY * 0.8);
    g.stroke({ color: 0x6a4a2a, width: 1, alpha: 0.3 });
    // Inner gap (open center)
    g.ellipse(tableX, tableY, tableRX * 0.6, tableRY * 0.55);
    g.fill({ color: 0x443322 });
    // Gold Pendragon crest inlay on table
    g.ellipse(tableX, tableY, tableRX * 0.75, tableRY * 0.7);
    g.stroke({ color: a.accentColor, width: 1.5, alpha: 0.2 });

    // Chairs with high backs
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const cx = tableX + Math.cos(angle) * (tableRX + 16);
      const cy = tableY + Math.sin(angle) * (tableRY + 12);
      // Chair back
      g.roundRect(cx - 5, cy - 10, 10, 16, 2);
      g.fill({ color: 0x4a2a12 });
      g.roundRect(cx - 5, cy - 10, 10, 16, 2);
      g.stroke({ color: 0x3a1a08, width: 0.5 });
      // Seat cushion
      g.roundRect(cx - 4, cy + 2, 8, 4, 1);
      g.fill({ color: 0x882222, alpha: 0.5 });
    }

    // Candelabras on table
    const candleXs = [tableX - tableRX * 0.45, tableX - tableRX * 0.15, tableX + tableRX * 0.15, tableX + tableRX * 0.45];
    for (const cx of candleXs) {
      // Ornate base
      g.moveTo(cx - 5, tableY - 4);
      g.lineTo(cx - 3, tableY - 12);
      g.lineTo(cx + 3, tableY - 12);
      g.lineTo(cx + 5, tableY - 4);
      g.closePath();
      g.fill({ color: 0x8b7355 });
      // Arms (3 candle holders)
      for (const off of [-6, 0, 6]) {
        g.rect(cx + off - 1, tableY - 22, 2, 10);
        g.fill({ color: 0xeeddcc });
        this._flames.push({ x: cx + off, y: tableY - 25, baseRadius: 3.5, phase: (cx + off) * 0.2 });
      }
      // Horizontal arm
      g.moveTo(cx - 7, tableY - 14);
      g.lineTo(cx + 7, tableY - 14);
      g.stroke({ color: 0x8b7355, width: 2 });
    }

    // Wall sconce torches
    const sconces = [sw * 0.04, sw * 0.19, sw * 0.38, sw * 0.62, sw * 0.81, sw * 0.96];
    for (const sx of sconces) {
      const sy = wallY + 45;
      // Bracket
      g.moveTo(sx, sy + 15);
      g.lineTo(sx - 6, sy + 8);
      g.lineTo(sx, sy);
      g.lineTo(sx + 6, sy + 8);
      g.closePath();
      g.fill({ color: 0x3a3a3a });
      // Torch
      g.rect(sx - 1.5, sy - 10, 3, 14);
      g.fill({ color: 0x6b4c2a });
      this._flames.push({ x: sx, y: sy - 14, baseRadius: 5, phase: sx * 0.15 });
      // Warm glow pools
      for (let r = 40; r > 0; r -= 5) {
        g.circle(sx, sy - 14, r);
        g.fill({ color: 0xff8833, alpha: 0.005 });
      }
    }

    // Carpet runner on floor (red with gold trim)
    g.rect(sw * 0.35, floorY, sw * 0.3, sh - floorY);
    g.fill({ color: 0x882222, alpha: 0.15 });
    g.rect(sw * 0.35, floorY, 3, sh - floorY);
    g.fill({ color: a.accentColor, alpha: 0.1 });
    g.rect(sw * 0.65 - 3, floorY, 3, sh - floorY);
    g.fill({ color: a.accentColor, alpha: 0.1 });

    // Stone floor with rich tile pattern
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    let tRow = 0;
    for (let y = floorY + 2; y < sh; y += 20) {
      const off = (tRow % 2) * 20;
      for (let x = off; x < sw; x += 40) {
        g.roundRect(x + 1, y + 1, 38, 18, 1);
        g.stroke({ color: a.groundHighlight, width: 0.5, alpha: 0.2 });
        if ((Math.floor(x / 40) + tRow) % 2 === 0) {
          g.roundRect(x + 1, y + 1, 38, 18, 1);
          g.fill({ color: 0x000000, alpha: 0.06 });
        }
      }
      tRow++;
    }
    // Light pools on floor from torches
    for (const sx of sconces) {
      g.ellipse(sx, floorY + 8, 25, 6);
      g.fill({ color: 0xff8833, alpha: 0.03 });
    }

    // Warm fog
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Iron chandelier hanging from ceiling ---
    const chanX = sw * 0.5;
    const chanY = floorY * 0.14;
    // Chains going up to ceiling
    for (const cx of [chanX - 25, chanX + 25]) {
      g.moveTo(cx, 0);
      g.lineTo(cx, chanY - 4);
      g.stroke({ color: 0x4a4a4a, width: 1.5, alpha: 0.6 });
    }
    g.moveTo(chanX, 0);
    g.lineTo(chanX, chanY - 8);
    g.stroke({ color: 0x4a4a4a, width: 1.5, alpha: 0.6 });
    // Circular iron ring
    g.moveTo(chanX + 30, chanY);
    g.arc(chanX, chanY, 30, 0, Math.PI * 2);
    g.stroke({ color: 0x555555, width: 3 });
    g.moveTo(chanX + 30, chanY);
    g.arc(chanX, chanY, 30, 0, Math.PI * 2);
    g.stroke({ color: 0x666666, width: 1.5 });
    // Candle holders on the ring
    for (let ci = 0; ci < 8; ci++) {
      const cAngle = (ci / 8) * Math.PI * 2;
      const ccx = chanX + Math.cos(cAngle) * 30;
      const ccy = chanY + Math.sin(cAngle) * 8;
      g.rect(ccx - 1, ccy - 6, 2, 6);
      g.fill({ color: 0xeeddcc, alpha: 0.7 });
      this._flames.push({ x: ccx, y: ccy - 8, baseRadius: 2.5, phase: ci * 0.9 });
    }

    // --- Scattered goblets and plates on the round table ---
    const tableX2 = sw * 0.5;
    const tableY2 = floorY * 0.74;
    const gobletPositions = [
      { x: tableX2 - sw * 0.14, y: tableY2 - 3 },
      { x: tableX2 + sw * 0.08, y: tableY2 - 5 },
      { x: tableX2 - sw * 0.04, y: tableY2 - 4 },
      { x: tableX2 + sw * 0.18, y: tableY2 - 2 },
    ];
    for (const gp of gobletPositions) {
      // Goblet body
      g.moveTo(gp.x - 2, gp.y);
      g.lineTo(gp.x - 3, gp.y - 6);
      g.lineTo(gp.x + 3, gp.y - 6);
      g.lineTo(gp.x + 2, gp.y);
      g.closePath();
      g.fill({ color: 0x887744, alpha: 0.5 });
      // Goblet rim
      g.moveTo(gp.x - 3.5, gp.y - 6);
      g.lineTo(gp.x + 3.5, gp.y - 6);
      g.stroke({ color: 0xaa9955, width: 1, alpha: 0.5 });
    }
    // Plates
    for (const px of [tableX2 - sw * 0.1, tableX2 + sw * 0.13]) {
      g.ellipse(px, tableY2 - 2, 6, 2.5);
      g.stroke({ color: 0x998866, width: 0.8, alpha: 0.35 });
    }

    // --- Coat of arms shield above fireplace ---
    const coaX = sw * 0.5;
    const coaY = floorY * 0.3;
    // Shield shape
    g.moveTo(coaX, coaY - 14);
    g.lineTo(coaX - 14, coaY - 8);
    g.lineTo(coaX - 14, coaY + 6);
    g.lineTo(coaX, coaY + 16);
    g.lineTo(coaX + 14, coaY + 6);
    g.lineTo(coaX + 14, coaY - 8);
    g.closePath();
    g.fill({ color: 0xbb2222 });
    g.moveTo(coaX, coaY - 14);
    g.lineTo(coaX - 14, coaY - 8);
    g.lineTo(coaX - 14, coaY + 6);
    g.lineTo(coaX, coaY + 16);
    g.lineTo(coaX + 14, coaY + 6);
    g.lineTo(coaX + 14, coaY - 8);
    g.closePath();
    g.stroke({ color: 0xddaa33, width: 2 });
    // Dragon emblem on shield
    g.moveTo(coaX - 6, coaY + 4);
    g.lineTo(coaX, coaY - 8);
    g.lineTo(coaX + 6, coaY + 4);
    g.lineTo(coaX + 2, coaY);
    g.lineTo(coaX - 2, coaY);
    g.closePath();
    g.fill({ color: 0xddaa33, alpha: 0.6 });

    // --- Stone gargoyle waterspouts on walls ---
    for (const gx of [sw * 0.06, sw * 0.94]) {
      const gy = wallY + 30;
      // Gargoyle head
      g.circle(gx, gy, 7);
      g.fill({ color: 0x555544 });
      // Snout
      const dir = gx < sw * 0.5 ? 1 : -1;
      g.moveTo(gx + dir * 7, gy - 2);
      g.lineTo(gx + dir * 14, gy);
      g.lineTo(gx + dir * 7, gy + 3);
      g.closePath();
      g.fill({ color: 0x555544 });
      // Eyes
      g.circle(gx + dir * 2, gy - 3, 1.5);
      g.fill({ color: 0x222211 });
      // Horns
      g.moveTo(gx - 3, gy - 6);
      g.lineTo(gx - 5, gy - 12);
      g.stroke({ color: 0x555544, width: 1.5 });
      g.moveTo(gx + 3, gy - 6);
      g.lineTo(gx + 5, gy - 12);
      g.stroke({ color: 0x555544, width: 1.5 });
    }

    // --- Unique critter: tiny mouse scurrying along the floor ---
    this._critters.push({
      x: sw * 0.8, y: floorY - 1, baseX: sw * 0.5, baseY: floorY - 1,
      phase: 0, type: "mouse", dir: -1, speed: 0.4, state: 0,
    });
  }

  private _update_round_table(time: number): void {
    const g = this._animGfx;
    // Flames (all torches + candelabras + fireplace)
    for (const f of this._flames) {
      const flicker = Math.sin(time * 8 + f.phase) * 2;
      const flicker2 = Math.cos(time * 12 + f.phase * 1.7) * 1.5;
      // Outer glow
      g.circle(f.x + flicker2 * 0.3, f.y - 2, f.baseRadius + 4 + Math.sin(time * 5 + f.phase) * 1.5);
      g.fill({ color: 0xff6600, alpha: 0.1 });
      // Flame body
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.5, f.baseRadius * 0.8, f.baseRadius + 2.5 + flicker);
      g.fill({ color: 0xff6611, alpha: 0.65 });
      // Inner bright
      g.ellipse(f.x, f.y - 1, f.baseRadius * 0.4, f.baseRadius * 0.8 + flicker * 0.3);
      g.fill({ color: 0xffdd44, alpha: 0.85 });
      // Hot core
      g.circle(f.x, f.y + 1, 1.5);
      g.fill({ color: 0xffffcc, alpha: 0.9 });
    }
    // Subtle tapestry sway
    for (const b of this._banners) {
      const sway = Math.sin(time * 0.8 + b.phase) * 1.5;
      g.rect(b.x + sway * 0.3, b.y + b.height * 0.3, b.width * 0.3, b.height * 0.4);
      g.fill({ color: 0xffffff, alpha: 0.02 + Math.sin(time + b.phase) * 0.01 });
    }
    // Fireplace glow pulse
    const fpX = this._sw * 0.5;
    const fpY = this._floorY * 0.45;
    const pulse = 0.04 + Math.sin(time * 1.2) * 0.02;
    g.circle(fpX, fpY - 15, 35);
    g.fill({ color: 0xff6622, alpha: pulse });

    // --- Dust motes floating in the fireplace light ---
    for (let di = 0; di < 10; di++) {
      const dPhase = time * 0.3 + di * 0.9;
      const dX = fpX - 30 + (di * 7) + Math.sin(dPhase * 1.3) * 8;
      const dY = fpY - 40 + Math.sin(dPhase * 0.7 + di) * 25;
      const dAlpha = 0.12 + Math.sin(dPhase * 2) * 0.06;
      g.circle(dX, dY, 0.8);
      g.fill({ color: 0xffddaa, alpha: dAlpha });
    }

    // --- Subtle smoke wisps rising from fireplace ---
    for (let si = 0; si < 3; si++) {
      const sPhase = time * 0.4 + si * 2.1;
      const sBaseX = fpX - 5 + si * 5;
      const sY1 = fpY - 30 - ((sPhase * 10) % 50);
      const sY2 = sY1 - 15;
      const sSway = Math.sin(sPhase * 1.5) * 8;
      const sAlpha = 0.04 - ((sPhase * 10) % 50) * 0.0006;
      if (sAlpha > 0) {
        g.moveTo(sBaseX, sY1);
        g.quadraticCurveTo(sBaseX + sSway, (sY1 + sY2) / 2, sBaseX + sSway * 1.3, sY2);
        g.stroke({ color: 0x887766, width: 3, alpha: sAlpha });
      }
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // MORDRED'S THRONE — Dark corrupted throne room, purple flames, cracked floor
  // =========================================================================

  private _build_mordred_throne(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Very dark interior
    this._drawSkyGradient(g, a, sw, floorY, 10);

    // Corrupted ceiling with hanging stalactite formations
    for (let i = 0; i < 10; i++) {
      const cx = sw * (0.05 + i * 0.1);
      const cLen = 15 + Math.sin(i * 3.7) * 10;
      g.moveTo(cx - 3, 0);
      g.lineTo(cx, cLen);
      g.lineTo(cx + 3, 0);
      g.closePath();
      g.fill({ color: 0x1a1025, alpha: 0.6 });
    }

    // Back wall — dark stone with purple veins
    const wallY = floorY * 0.18;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x1a1122 });
    // Stone texture with varying darkness
    for (let y = wallY + 12; y < floorY; y += 14) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x151020, width: 0.7, alpha: 0.5 });
    }
    let mRow = 0;
    for (let y = wallY; y < floorY; y += 14) {
      const off = (mRow % 2) * 18;
      for (let x = off; x < sw; x += 36) {
        g.moveTo(x, y).lineTo(x, y + 14);
        g.stroke({ color: 0x151020, width: 0.4, alpha: 0.3 });
      }
      mRow++;
    }

    // Purple corruption veins — more extensive network
    const veins = [
      [sw * 0.08, wallY + 20, sw * 0.12, floorY - 10],
      [sw * 0.22, wallY + 40, sw * 0.2, floorY - 20],
      [sw * 0.35, wallY + 15, sw * 0.38, floorY * 0.7],
      [sw * 0.48, wallY + 50, sw * 0.5, floorY - 15],
      [sw * 0.62, wallY + 10, sw * 0.6, floorY - 25],
      [sw * 0.75, wallY + 35, sw * 0.78, floorY - 10],
      [sw * 0.88, wallY + 25, sw * 0.85, floorY - 15],
    ];
    for (const [x1, y1, x2, y2] of veins) {
      // Main vein
      g.moveTo(x1, y1);
      g.quadraticCurveTo(x1 + 20, (y1 + y2) / 2, x2, y2);
      g.stroke({ color: 0x6622aa, width: 2.5, alpha: 0.3 });
      // Glow around vein
      g.moveTo(x1, y1);
      g.quadraticCurveTo(x1 + 20, (y1 + y2) / 2, x2, y2);
      g.stroke({ color: 0x8833cc, width: 5, alpha: 0.06 });
      // Branch veins
      const midX = (x1 + x2) / 2 + 10;
      const midY = (y1 + y2) / 2;
      g.moveTo(midX, midY);
      g.lineTo(midX + 15, midY - 20);
      g.stroke({ color: 0x6622aa, width: 1.5, alpha: 0.2 });
      g.moveTo(midX, midY + 15);
      g.lineTo(midX - 12, midY + 30);
      g.stroke({ color: 0x6622aa, width: 1, alpha: 0.15 });
    }

    // Massive dark throne in center background
    const throneX = sw * 0.5;
    const throneY = wallY + 15;
    // Throne back (tall, pointed, more ornate)
    g.moveTo(throneX - 40, floorY - 5);
    g.lineTo(throneX - 35, throneY + 35);
    g.lineTo(throneX - 25, throneY + 5);
    g.lineTo(throneX - 15, throneY - 10);
    g.lineTo(throneX - 8, throneY - 25);
    g.lineTo(throneX, throneY - 35);
    g.lineTo(throneX + 8, throneY - 25);
    g.lineTo(throneX + 15, throneY - 10);
    g.lineTo(throneX + 25, throneY + 5);
    g.lineTo(throneX + 35, throneY + 35);
    g.lineTo(throneX + 40, floorY - 5);
    g.closePath();
    g.fill({ color: 0x1a1025 });
    // Throne outline
    g.moveTo(throneX - 40, floorY - 5);
    g.lineTo(throneX - 35, throneY + 35);
    g.lineTo(throneX - 25, throneY + 5);
    g.lineTo(throneX - 15, throneY - 10);
    g.lineTo(throneX - 8, throneY - 25);
    g.lineTo(throneX, throneY - 35);
    g.lineTo(throneX + 8, throneY - 25);
    g.lineTo(throneX + 15, throneY - 10);
    g.lineTo(throneX + 25, throneY + 5);
    g.lineTo(throneX + 35, throneY + 35);
    g.lineTo(throneX + 40, floorY - 5);
    g.stroke({ color: 0x331155, width: 2 });
    // Throne seat
    g.rect(throneX - 24, floorY * 0.58, 48, 16);
    g.fill({ color: 0x221133 });
    g.rect(throneX - 24, floorY * 0.58, 48, 16);
    g.stroke({ color: 0x331144, width: 1 });
    // Armrests
    g.rect(throneX - 28, floorY * 0.56, 8, 22);
    g.fill({ color: 0x1a1025 });
    g.rect(throneX + 20, floorY * 0.56, 8, 22);
    g.fill({ color: 0x1a1025 });
    // Skull motifs on armrests and throne
    for (const sx of [throneX - 18, throneX + 18, throneX - 24, throneX + 24]) {
      const sy = throneY + 40;
      g.circle(sx, sy, 5);
      g.fill({ color: 0x443355 });
      g.circle(sx - 2, sy - 2, 1.2);
      g.fill({ color: 0x220033 });
      g.circle(sx + 2, sy - 2, 1.2);
      g.fill({ color: 0x220033 });
      g.moveTo(sx - 2, sy + 2);
      g.lineTo(sx + 2, sy + 2);
      g.stroke({ color: 0x220033, width: 0.8 });
    }
    // Glowing evil eye on throne top
    g.circle(throneX, throneY - 27, 5);
    g.fill({ color: a.accentColor, alpha: 0.6 });
    for (let r = 20; r > 0; r -= 3) {
      g.circle(throneX, throneY - 27, r);
      g.fill({ color: a.accentColor, alpha: 0.012 });
    }
    // Slit pupil
    g.moveTo(throneX, throneY - 31);
    g.lineTo(throneX, throneY - 23);
    g.stroke({ color: 0x110011, width: 2, alpha: 0.8 });

    // Dark pillars with gargoyles
    for (const px of [sw * 0.12, sw * 0.88]) {
      g.rect(px - 14, wallY, 28, floorY - wallY);
      g.fill({ color: 0x1a1025 });
      g.rect(px - 16, wallY, 32, 12);
      g.fill({ color: 0x221133 });
      g.rect(px - 16, floorY - 12, 32, 12);
      g.fill({ color: 0x221133 });
      // Pillar detail lines
      g.rect(px - 2, wallY + 12, 4, floorY - wallY - 24);
      g.fill({ color: 0x151020, alpha: 0.5 });
      // Gargoyle at top
      g.circle(px, wallY + 22, 8);
      g.fill({ color: 0x2a1a33 });
      g.circle(px - 3, wallY + 20, 1.5);
      g.fill({ color: 0xcc44ff, alpha: 0.3 });
      g.circle(px + 3, wallY + 20, 1.5);
      g.fill({ color: 0xcc44ff, alpha: 0.3 });
      // Purple rune on pillar
      g.circle(px, wallY + (floorY - wallY) * 0.4, 8);
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.2 });
      g.circle(px, wallY + (floorY - wallY) * 0.4, 4);
      g.fill({ color: a.accentColor, alpha: 0.3 });
    }

    // Additional wall pillars
    for (const px of [sw * 0.32, sw * 0.68]) {
      g.rect(px - 10, wallY, 20, floorY - wallY);
      g.fill({ color: 0x151020 });
      g.rect(px - 12, wallY, 24, 8);
      g.fill({ color: 0x1a1128 });
      g.rect(px - 12, floorY - 8, 24, 8);
      g.fill({ color: 0x1a1128 });
    }

    // Corrupted banners
    for (const bx of [sw * 0.22, sw * 0.78]) {
      const by = wallY + 25;
      g.rect(bx - 15, by, 30, 60);
      g.fill({ color: 0x220033 });
      g.rect(bx - 15, by, 30, 60);
      g.stroke({ color: 0x331144, width: 1 });
      // Torn bottom edge
      for (let i = 0; i < 6; i++) {
        g.moveTo(bx - 15 + i * 6, by + 60);
        g.lineTo(bx - 12 + i * 6, by + 65 + (i % 2) * 5);
        g.lineTo(bx - 9 + i * 6, by + 60);
        g.fill({ color: 0x220033 });
      }
      // Skull emblem
      g.circle(bx, by + 25, 8);
      g.fill({ color: 0x443355, alpha: 0.5 });
    }

    // Purple flame braziers
    for (const bx of [sw * 0.22, sw * 0.42, sw * 0.58, sw * 0.78]) {
      g.moveTo(bx - 8, floorY);
      g.lineTo(bx - 5, floorY - 32);
      g.lineTo(bx + 5, floorY - 32);
      g.lineTo(bx + 8, floorY);
      g.closePath();
      g.fill({ color: 0x2a1a33 });
      // Ornate bowl
      g.moveTo(bx - 10, floorY - 32);
      g.arc(bx, floorY - 32, 10, Math.PI, 0);
      g.fill({ color: 0x331144 });
      g.moveTo(bx - 12, floorY - 32);
      g.arc(bx, floorY - 32, 12, Math.PI, 0);
      g.stroke({ color: 0x441155, width: 1 });
      this._flames.push({ x: bx, y: floorY - 40, baseRadius: 7, phase: bx * 0.1 });
    }

    // Cracked floor with purple glow
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // Extensive cracks
    const cracks = [
      [sw * 0.1, floorY + 2, sw * 0.18, floorY + 14, sw * 0.15, floorY + 22],
      [sw * 0.25, floorY + 4, sw * 0.35, floorY + 10, sw * 0.4, floorY + 18],
      [sw * 0.45, floorY + 3, sw * 0.5, floorY + 15, sw * 0.48, floorY + 24],
      [sw * 0.55, floorY + 5, sw * 0.62, floorY + 12, sw * 0.65, floorY + 20],
      [sw * 0.7, floorY + 2, sw * 0.78, floorY + 16, sw * 0.75, floorY + 8],
      [sw * 0.82, floorY + 6, sw * 0.88, floorY + 18, sw * 0.9, floorY + 25],
    ];
    for (const [x1, y1, x2, y2, x3, y3] of cracks) {
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.lineTo(x3, y3);
      g.stroke({ color: 0x110015, width: 1.5, alpha: 0.6 });
      // Purple glow in cracks
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke({ color: a.accentColor, width: 3, alpha: 0.08 });
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke({ color: a.accentColor, width: 0.8, alpha: 0.25 });
    }
    // Corruption puddles on floor
    for (let i = 0; i < 4; i++) {
      const px = sw * (0.2 + i * 0.2);
      g.ellipse(px, floorY + 8, 12, 4);
      g.fill({ color: 0x330044, alpha: 0.2 });
      g.ellipse(px, floorY + 8, 8, 2.5);
      g.fill({ color: a.accentColor, alpha: 0.06 });
    }

    // Purple smoke particles
    for (let i = 0; i < 25; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.4 + Math.random() * floorY * 0.5,
        vx: (Math.random() - 0.5) * 0.15, vy: -0.1 - Math.random() * 0.15,
        radius: 1.5 + Math.random() * 2.5, alpha: 0.12 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    // Mist layers
    for (let i = 0; i < 3; i++) {
      this._mistLayers.push({
        y: floorY - 8 + i * 10, speed: 0.15 + i * 0.05,
        offset: i * 70, alpha: 0.04, height: 20 + i * 5,
      });
    }
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Dripping corruption stains on walls ---
    const stainXs = [sw * 0.16, sw * 0.38, sw * 0.55, sw * 0.72, sw * 0.86];
    for (const sx of stainXs) {
      const stainTop = wallY + 20 + Math.sin(sx * 0.1) * 15;
      const stainH = 30 + Math.sin(sx * 0.3) * 15;
      // Vertical drip streaks
      g.moveTo(sx, stainTop);
      g.lineTo(sx + 2, stainTop + stainH);
      g.stroke({ color: 0x330044, width: 3, alpha: 0.25 });
      g.moveTo(sx - 3, stainTop + 5);
      g.lineTo(sx - 1, stainTop + stainH * 0.7);
      g.stroke({ color: 0x220033, width: 2, alpha: 0.18 });
      // Droplet at the bottom
      g.circle(sx + 1, stainTop + stainH + 2, 2);
      g.fill({ color: 0x440066, alpha: 0.2 });
    }

    // --- Skull piles at base of throne ---
    const throneBaseX = sw * 0.5;
    const skullClusters = [
      { x: throneBaseX - 30, y: floorY - 2 },
      { x: throneBaseX + 28, y: floorY - 1 },
    ];
    for (const sc of skullClusters) {
      // Bottom row skulls
      for (let si = 0; si < 4; si++) {
        const skx = sc.x - 8 + si * 5;
        const sky = sc.y - 1;
        g.circle(skx, sky, 3);
        g.fill({ color: 0x554455, alpha: 0.35 });
        g.circle(skx - 1, sky - 1, 0.7);
        g.fill({ color: 0x220022, alpha: 0.25 });
        g.circle(skx + 1, sky - 1, 0.7);
        g.fill({ color: 0x220022, alpha: 0.25 });
      }
      // Top row skulls
      for (let si = 0; si < 2; si++) {
        const skx = sc.x - 4 + si * 6;
        const sky = sc.y - 6;
        g.circle(skx, sky, 2.5);
        g.fill({ color: 0x665566, alpha: 0.3 });
      }
    }

    // --- Cracked mirror on wall ---
    const mirrorX = sw * 0.75;
    const mirrorY = wallY + 40;
    // Mirror frame (irregular polygon)
    g.moveTo(mirrorX - 12, mirrorY - 16);
    g.lineTo(mirrorX + 11, mirrorY - 15);
    g.lineTo(mirrorX + 13, mirrorY + 14);
    g.lineTo(mirrorX - 10, mirrorY + 16);
    g.closePath();
    g.fill({ color: 0x334455, alpha: 0.3 });
    g.moveTo(mirrorX - 12, mirrorY - 16);
    g.lineTo(mirrorX + 11, mirrorY - 15);
    g.lineTo(mirrorX + 13, mirrorY + 14);
    g.lineTo(mirrorX - 10, mirrorY + 16);
    g.closePath();
    g.stroke({ color: 0x443344, width: 2, alpha: 0.5 });
    // Cracks across the mirror
    g.moveTo(mirrorX - 5, mirrorY - 12);
    g.lineTo(mirrorX + 3, mirrorY + 10);
    g.stroke({ color: 0x111122, width: 0.8, alpha: 0.4 });
    g.moveTo(mirrorX + 8, mirrorY - 10);
    g.lineTo(mirrorX - 4, mirrorY + 5);
    g.stroke({ color: 0x111122, width: 0.6, alpha: 0.35 });
    g.moveTo(mirrorX - 2, mirrorY - 3);
    g.lineTo(mirrorX + 10, mirrorY + 2);
    g.stroke({ color: 0x111122, width: 0.5, alpha: 0.3 });

    // --- Blood-red carpet leading to throne ---
    g.moveTo(sw * 0.42, floorY);
    g.lineTo(sw * 0.58, floorY);
    g.lineTo(sw * 0.56, floorY + 40);
    g.lineTo(sw * 0.44, floorY + 40);
    g.closePath();
    g.fill({ color: 0x661111, alpha: 0.2 });
    // Carpet edges with gold trim
    g.moveTo(sw * 0.42, floorY);
    g.lineTo(sw * 0.44, floorY + 40);
    g.stroke({ color: 0x886622, width: 1, alpha: 0.15 });
    g.moveTo(sw * 0.58, floorY);
    g.lineTo(sw * 0.56, floorY + 40);
    g.stroke({ color: 0x886622, width: 1, alpha: 0.15 });
    // Tattered edge at far end
    for (let ti = 0; ti < 5; ti++) {
      const tx = sw * 0.44 + ti * (sw * 0.12 / 5);
      g.moveTo(tx, floorY + 40);
      g.lineTo(tx + sw * 0.012, floorY + 44 + (ti % 2) * 3);
      g.lineTo(tx + sw * 0.024, floorY + 40);
      g.fill({ color: 0x661111, alpha: 0.18 });
    }

    // --- Unique critter: raven circling ominously overhead ---
    this._critters.push({
      x: sw * 0.5, y: floorY * 0.2, baseX: sw * 0.5, baseY: floorY * 0.2,
      phase: 0, type: "raven", dir: 1, speed: 0, state: 0,
    });
  }

  private _update_mordred_throne(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Purple flames
    for (const f of this._flames) {
      const flicker = Math.sin(time * 7 + f.phase) * 2.5;
      const flicker2 = Math.cos(time * 11 + f.phase * 1.5) * 1.5;
      g.circle(f.x + flicker2 * 0.3, f.y - 2, f.baseRadius + 5 + Math.sin(time * 4 + f.phase) * 2);
      g.fill({ color: 0x6622cc, alpha: 0.1 });
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.4, f.baseRadius, f.baseRadius + 3 + flicker);
      g.fill({ color: 0x7733dd, alpha: 0.6 });
      g.ellipse(f.x, f.y, f.baseRadius * 0.5, f.baseRadius + flicker * 0.3);
      g.fill({ color: 0xcc66ff, alpha: 0.8 });
      g.circle(f.x, f.y + 1, 2);
      g.fill({ color: 0xeeccff, alpha: 0.9 });
    }
    // Floating purple particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.2 + p.phase) * 0.15;
      p.y += p.vy;
      if (p.y < this._floorY * 0.15) { p.y = this._floorY * 0.85; p.x = Math.random() * sw; }
      const pulse = p.alpha * (0.4 + Math.sin(time * 2 + p.phase) * 0.4);
      g.circle(p.x, p.y, p.radius + 2);
      g.fill({ color: p.color, alpha: pulse * 0.12 });
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: pulse });
    }
    // Pulsing throne eye
    const eyePulse = 0.3 + Math.sin(time * 1.5) * 0.2;
    const throneY = this._floorY * 0.18 + 15;
    g.circle(this._sw * 0.5, throneY - 27, 7);
    g.fill({ color: 0xcc44ff, alpha: eyePulse });
    // Dark fog drift
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 20 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 80) {
        g.ellipse((x + offset) % (sw + 200) - 100, m.y, 50, m.height / 2);
        g.fill({ color: 0x220033, alpha: m.alpha });
      }
    }

    // --- Dripping liquid drops from ceiling ---
    const floorY = this._floorY;
    for (let di = 0; di < 4; di++) {
      const dPhase = time * 0.25 + di * 3.5;
      const dCycle = dPhase % 4.0; // 4-second cycle per drop
      const dX = sw * (0.15 + di * 0.22) + Math.sin(di * 5) * 10;
      if (dCycle < 3.0) {
        // Drop falling
        const dProgress = dCycle / 3.0;
        const dY = dProgress * floorY;
        const dAlpha = 0.45 - dProgress * 0.2;
        // Drop shape (teardrop)
        g.circle(dX, dY, 1.5);
        g.fill({ color: 0x7733aa, alpha: dAlpha });
        g.moveTo(dX, dY - 3);
        g.lineTo(dX - 1.5, dY);
        g.lineTo(dX + 1.5, dY);
        g.closePath();
        g.fill({ color: 0x8844bb, alpha: dAlpha * 0.8 });
      }
    }

    // --- Floating dark energy orbs orbiting the throne ---
    for (let oi = 0; oi < 3; oi++) {
      const orbAngle = time * 0.35 + (oi / 3) * Math.PI * 2;
      const orbR = 45 + Math.sin(time * 0.5 + oi) * 8;
      const orbX = sw * 0.5 + Math.cos(orbAngle) * orbR;
      const orbY = floorY * 0.35 + Math.sin(orbAngle) * orbR * 0.4;
      const orbAlpha = 0.2 + Math.sin(time * 1.5 + oi * 2) * 0.08;
      // Purple halo
      g.circle(orbX, orbY, 8);
      g.fill({ color: 0x8833cc, alpha: orbAlpha * 0.25 });
      g.circle(orbX, orbY, 5);
      g.fill({ color: 0x6622aa, alpha: orbAlpha * 0.4 });
      // Dark core
      g.circle(orbX, orbY, 3);
      g.fill({ color: 0x220033, alpha: orbAlpha });
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // GLASTONBURY ABBEY — Ruined abbey, broken arches, holy light
  // =========================================================================

  private _build_glastonbury(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Hazy golden horizon
    g.rect(0, floorY * 0.65, sw, floorY * 0.35);
    g.fill({ color: 0xddcc88, alpha: 0.08 });

    // Layered rolling hills
    // Far hills
    g.moveTo(0, floorY * 0.52);
    g.quadraticCurveTo(sw * 0.12, floorY * 0.44, sw * 0.25, floorY * 0.48);
    g.quadraticCurveTo(sw * 0.4, floorY * 0.42, sw * 0.55, floorY * 0.46);
    g.quadraticCurveTo(sw * 0.7, floorY * 0.41, sw * 0.85, floorY * 0.45);
    g.quadraticCurveTo(sw * 0.95, floorY * 0.43, sw, floorY * 0.5);
    g.lineTo(sw, floorY * 0.6);
    g.lineTo(0, floorY * 0.6);
    g.closePath();
    g.fill({ color: 0x4a6638, alpha: 0.25 });
    // Mid hills
    g.moveTo(0, floorY * 0.58);
    g.quadraticCurveTo(sw * 0.15, floorY * 0.5, sw * 0.3, floorY * 0.54);
    g.quadraticCurveTo(sw * 0.5, floorY * 0.48, sw * 0.7, floorY * 0.52);
    g.quadraticCurveTo(sw * 0.85, floorY * 0.49, sw, floorY * 0.56);
    g.lineTo(sw, floorY * 0.7);
    g.lineTo(0, floorY * 0.7);
    g.closePath();
    g.fill({ color: 0x557744, alpha: 0.35 });
    // Near hills
    g.moveTo(0, floorY * 0.68);
    g.quadraticCurveTo(sw * 0.2, floorY * 0.62, sw * 0.4, floorY * 0.66);
    g.quadraticCurveTo(sw * 0.6, floorY * 0.6, sw * 0.8, floorY * 0.64);
    g.lineTo(sw, floorY * 0.7);
    g.lineTo(sw, floorY * 0.8);
    g.lineTo(0, floorY * 0.8);
    g.closePath();
    g.fill({ color: 0x668855, alpha: 0.4 });

    // Distant cross on hilltop
    g.rect(sw * 0.78, floorY * 0.38, 3, 20);
    g.fill({ color: 0x999988, alpha: 0.4 });
    g.rect(sw * 0.78 - 5, floorY * 0.42, 13, 2);
    g.fill({ color: 0x999988, alpha: 0.4 });

    // Abbey ruins — tall broken arches with buttresses
    const archPositions = [sw * 0.12, sw * 0.3, sw * 0.48, sw * 0.66, sw * 0.84];
    for (let i = 0; i < archPositions.length; i++) {
      const ax = archPositions[i];
      const archH = 105 + (i % 2) * 25;
      const pillarW = 14;
      // Flying buttress (behind)
      if (i > 0 && i < archPositions.length - 1) {
        g.moveTo(ax - 25, floorY - archH * 0.6);
        g.lineTo(ax - 35, floorY - 10);
        g.stroke({ color: 0x7a7a6a, width: 4, alpha: 0.4 });
      }
      // Left pillar
      g.rect(ax - 22, floorY - archH, pillarW, archH);
      g.fill({ color: 0x8a8a7a });
      g.rect(ax - 22, floorY - archH, 3, archH);
      g.fill({ color: 0x9a9a8a, alpha: 0.3 });
      // Right pillar (some broken shorter)
      const rh = archH - (i % 2) * 20;
      g.rect(ax + 8, floorY - rh, pillarW, rh);
      g.fill({ color: 0x8a8a7a });
      g.rect(ax + 8, floorY - rh, 3, rh);
      g.fill({ color: 0x9a9a8a, alpha: 0.3 });
      // Gothic arch
      if (i % 2 === 0) {
        g.moveTo(ax - 22, floorY - archH);
        g.quadraticCurveTo(ax - 4, floorY - archH - 30, ax + 8, floorY - archH);
        g.stroke({ color: 0x8a8a7a, width: 10 });
        // Inner arch line
        g.moveTo(ax - 18, floorY - archH + 4);
        g.quadraticCurveTo(ax - 4, floorY - archH - 22, ax + 12, floorY - archH + 4);
        g.stroke({ color: 0x7a7a6a, width: 3 });
      }
      // Pillar capitals
      g.rect(ax - 24, floorY - archH, pillarW + 4, 6);
      g.fill({ color: 0x9a9a8a });
      // Stone texture
      for (let y = floorY - archH + 8; y < floorY; y += 12) {
        g.moveTo(ax - 22, y).lineTo(ax - 22 + pillarW, y);
        g.stroke({ color: 0x7a7a6a, width: 0.5, alpha: 0.4 });
      }
    }

    // Rose window (circular) — more detailed
    const wX = sw * 0.5;
    const wY = floorY * 0.3;
    // Frame
    g.circle(wX, wY, 32);
    g.stroke({ color: 0x8a8a7a, width: 7 });
    g.circle(wX, wY, 28);
    g.fill({ color: 0x223355, alpha: 0.2 });
    // Outer ring tracery
    g.circle(wX, wY, 24);
    g.stroke({ color: 0x8a8a7a, width: 2 });
    // Radial spokes
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      g.moveTo(wX, wY);
      g.lineTo(wX + Math.cos(angle) * 27, wY + Math.sin(angle) * 27);
      g.stroke({ color: 0x8a8a7a, width: 1.5 });
    }
    // Colored glass — 12 petals
    const glassColors = [0xaa3333, 0x3355aa, 0xddaa33, 0x33aa55, 0xaa3366, 0x3388aa];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + 0.15;
      const gx = wX + Math.cos(angle) * 16;
      const gy = wY + Math.sin(angle) * 16;
      g.circle(gx, gy, 5);
      g.fill({ color: glassColors[i % glassColors.length], alpha: 0.25 });
    }
    // Center rosette
    g.circle(wX, wY, 6);
    g.fill({ color: 0xddaa33, alpha: 0.3 });
    g.circle(wX, wY, 6);
    g.stroke({ color: 0x8a8a7a, width: 1.5 });

    // Gravestones — more detailed
    const graves = [sw * 0.06, sw * 0.18, sw * 0.36, sw * 0.54, sw * 0.72, sw * 0.86, sw * 0.94];
    for (let gi = 0; gi < graves.length; gi++) {
      const gx = graves[gi];
      const gh = 14 + (gi % 3) * 4;
      // Stone
      g.roundRect(gx - 6, floorY - gh, 12, gh, 3);
      g.fill({ color: 0x777768 });
      g.roundRect(gx - 6, floorY - gh, 12, gh, 3);
      g.stroke({ color: 0x666658, width: 1 });
      // Cross on some
      if (gi % 2 === 0) {
        g.rect(gx - 1, floorY - gh + 3, 2, 8);
        g.fill({ color: 0x888878, alpha: 0.5 });
        g.rect(gx - 3, floorY - gh + 5, 6, 2);
        g.fill({ color: 0x888878, alpha: 0.5 });
      }
      // Moss at base
      g.ellipse(gx, floorY - 1, 8, 3);
      g.fill({ color: 0x447733, alpha: 0.2 });
    }

    // Overgrown ivy on ruins — more extensive
    for (let i = 0; i < 14; i++) {
      const ix = sw * 0.05 + i * sw * 0.07 + Math.sin(i * 2.3) * 15;
      const iy = floorY - 35 - Math.sin(i * 2.8) * 40;
      // Main vine
      g.moveTo(ix, iy);
      g.quadraticCurveTo(ix + 4, iy + 20, ix - 2, iy + 35);
      g.stroke({ color: 0x336622, width: 1.5, alpha: 0.45 });
      // Leaf clusters at intervals
      for (let l = 0; l < 3; l++) {
        const lx = ix + Math.sin(l * 2) * 4;
        const ly = iy + 8 + l * 10;
        g.circle(lx, ly, 3.5);
        g.fill({ color: 0x447733, alpha: 0.3 });
        g.circle(lx + 2, ly - 1, 2.5);
        g.fill({ color: 0x558844, alpha: 0.25 });
      }
    }

    // Wildflowers
    for (let i = 0; i < 12; i++) {
      const fx = sw * (0.05 + i * 0.08);
      const fy = floorY - 2;
      // Stem
      g.moveTo(fx, fy);
      g.lineTo(fx + (i % 2 ? 1 : -1), fy - 6 - (i % 3) * 2);
      g.stroke({ color: 0x448833, width: 0.8, alpha: 0.5 });
      // Flower head
      const flowerColors = [0xeeddff, 0xffddee, 0xffffdd, 0xddeeff];
      g.circle(fx + (i % 2 ? 1 : -1), fy - 7 - (i % 3) * 2, 2);
      g.fill({ color: flowerColors[i % flowerColors.length], alpha: 0.4 });
    }

    // Ground — old stone and grass
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Grass patches — denser
    for (let x = 0; x < sw; x += 10) {
      const blades = 2 + (Math.sin(x * 0.6) > 0 ? 1 : 0);
      for (let b = 0; b < blades; b++) {
        g.moveTo(x + b * 3, floorY + 2);
        g.lineTo(x + b * 3 + (b - 1) * 2, floorY - 4 - b * 2);
        g.stroke({ color: 0x558844, width: 1, alpha: 0.4 });
      }
    }
    // Scattered rubble
    for (let i = 0; i < 8; i++) {
      const rx = sw * (0.1 + i * 0.1) + Math.sin(i * 4) * 10;
      g.roundRect(rx, floorY + 2, 5 + i % 3 * 2, 3 + i % 2 * 2, 1);
      g.fill({ color: 0x8a8a7a, alpha: 0.3 });
    }

    // Holy light beams through window — wider, more visible
    g.moveTo(wX - 18, wY + 30);
    g.lineTo(wX + 18, wY + 30);
    g.lineTo(wX + 60, floorY + 10);
    g.lineTo(wX - 60, floorY + 10);
    g.closePath();
    g.fill({ color: 0xeedd88, alpha: 0.04 });
    // Secondary beam
    g.moveTo(wX - 10, wY + 30);
    g.lineTo(wX + 10, wY + 30);
    g.lineTo(wX + 35, floorY + 10);
    g.lineTo(wX - 35, floorY + 10);
    g.closePath();
    g.fill({ color: 0xffeebb, alpha: 0.03 });

    // Dust mote particles
    for (let i = 0; i < 20; i++) {
      this._particles.push({
        x: wX - 40 + Math.random() * 80, y: wY + Math.random() * (floorY - wY),
        vx: (Math.random() - 0.5) * 0.1, vy: 0.05 + Math.random() * 0.1,
        radius: 0.8 + Math.random() * 1.5, alpha: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2, color: 0xeedd88,
      });
    }
    g.rect(0, floorY * 0.55, sw, floorY * 0.45);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Fallen rose petals scattered on the ground ---
    const petalColors = [0xcc4466, 0xdd5577, 0xee6688, 0xbb3355, 0xdd7799];
    for (let i = 0; i < 18; i++) {
      const px = sw * (0.05 + i * 0.05) + Math.sin(i * 3.1) * 12;
      const py = floorY + 2 + (i % 3) * 3;
      const pc = petalColors[i % petalColors.length];
      g.ellipse(px, py, 2.5 + (i % 2), 1.2);
      g.fill({ color: pc, alpha: 0.3 + (i % 3) * 0.05 });
    }

    // --- Ivy growing up the ruins (green vine lines with leaf clusters) ---
    const ivyPositions = [sw * 0.12, sw * 0.3, sw * 0.66, sw * 0.84];
    for (const ix of ivyPositions) {
      const ivyBaseY = floorY;
      const ivyTopY = floorY - 70 - Math.sin(ix * 0.1) * 20;
      // Main vine stem
      g.moveTo(ix, ivyBaseY);
      g.quadraticCurveTo(ix + 3, (ivyBaseY + ivyTopY) / 2, ix - 1, ivyTopY);
      g.stroke({ color: 0x2a5522, width: 2, alpha: 0.5 });
      // Secondary vine
      g.moveTo(ix + 2, ivyBaseY - 10);
      g.quadraticCurveTo(ix + 8, ivyBaseY - 40, ix + 5, ivyTopY + 15);
      g.stroke({ color: 0x336622, width: 1.2, alpha: 0.4 });
      // Leaf clusters along the vine
      for (let l = 0; l < 6; l++) {
        const ly = ivyBaseY - 10 - l * 10;
        const lx = ix + Math.sin(l * 1.8) * 5;
        g.ellipse(lx - 3, ly, 3, 2);
        g.fill({ color: 0x448833, alpha: 0.35 });
        g.ellipse(lx + 3, ly - 1, 2.5, 1.8);
        g.fill({ color: 0x55aa44, alpha: 0.3 });
        g.ellipse(lx, ly + 2, 2, 1.5);
        g.fill({ color: 0x3a7728, alpha: 0.3 });
      }
    }

    // --- Holy water font/basin near the entrance ---
    const fontX = sw * 0.22;
    const fontY = floorY - 2;
    // Pedestal
    g.rect(fontX - 5, fontY - 18, 10, 18);
    g.fill({ color: 0x8a8a7a });
    g.rect(fontX - 7, fontY - 2, 14, 4);
    g.fill({ color: 0x8a8a7a });
    // Bowl (arc shape)
    g.moveTo(fontX - 12, fontY - 20);
    g.arc(fontX, fontY - 20, 12, Math.PI, 0);
    g.fill({ color: 0x9a9a8a });
    g.moveTo(fontX - 12, fontY - 20);
    g.arc(fontX, fontY - 20, 12, Math.PI, 0);
    g.stroke({ color: 0x7a7a6a, width: 1.5 });
    // Water surface in bowl
    g.ellipse(fontX, fontY - 21, 9, 3);
    g.fill({ color: 0x6688aa, alpha: 0.3 });
    // Subtle holy water glow
    g.ellipse(fontX, fontY - 21, 7, 2);
    g.fill({ color: 0xaaccee, alpha: 0.15 });

    // --- Prayer candles arranged at the base of a ruin ---
    const candleBaseX = sw * 0.7;
    const candleBaseY = floorY;
    for (let i = 0; i < 7; i++) {
      const cx = candleBaseX - 15 + i * 5;
      const ch = 5 + (i % 3) * 2;
      // Candle body
      g.rect(cx - 1.5, candleBaseY - ch, 3, ch);
      g.fill({ color: 0xeeddbb });
      g.rect(cx - 1.5, candleBaseY - ch, 3, ch);
      g.stroke({ color: 0xccbb99, width: 0.5, alpha: 0.5 });
      // Yellow flame tip
      g.ellipse(cx, candleBaseY - ch - 2, 1.5, 2.5);
      g.fill({ color: 0xffdd44, alpha: 0.5 });
      g.ellipse(cx, candleBaseY - ch - 1.5, 0.8, 1.5);
      g.fill({ color: 0xffffaa, alpha: 0.6 });
    }
    // Warm glow around candle cluster
    g.ellipse(candleBaseX, candleBaseY - 10, 22, 12);
    g.fill({ color: 0xffdd66, alpha: 0.03 });

    // --- Unique critter: white dove perched on the abbey wall ---
    this._critters.push({
      x: sw * 0.18, y: floorY * 0.42, baseX: sw * 0.18, baseY: floorY * 0.42,
      phase: 0, type: "dove", dir: 1, speed: 0, state: 0,
    });
    this._critters.push({
      x: sw * 0.82, y: floorY * 0.38, baseX: sw * 0.82, baseY: floorY * 0.38,
      phase: 2.0, type: "dove", dir: -1, speed: 0, state: 0,
    });
  }

  private _update_glastonbury(time: number): void {
    const g = this._animGfx;
    // Dust motes in light beams
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.5 + p.phase) * 0.1;
      p.y += p.vy;
      if (p.y > this._floorY) { p.y = this._floorY * 0.3; p.x = this._sw * 0.5 - 40 + Math.random() * 80; }
      const pulse = p.alpha * (0.5 + Math.sin(time * 1.5 + p.phase) * 0.5);
      g.circle(p.x, p.y, p.radius + 1);
      g.fill({ color: p.color, alpha: pulse * 0.2 });
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: 0xffffff, alpha: pulse });
    }
    // Pulsing window glow
    const wX = this._sw * 0.5;
    const wY = this._floorY * 0.3;
    const pulse = 0.12 + Math.sin(time * 0.8) * 0.05;
    g.circle(wX, wY, 30);
    g.fill({ color: 0xeedd88, alpha: pulse });
    g.circle(wX, wY, 18);
    g.fill({ color: 0xffeeaa, alpha: pulse * 0.5 });

    // --- Floating rose petals drifting on the wind ---
    for (let rp = 0; rp < 5; rp++) {
      const rpPhase = time * 0.6 + rp * 1.8;
      const rpX = ((rpPhase * 18 + rp * 80) % (this._sw + 40)) - 20;
      const rpY = this._floorY * 0.5 + Math.sin(rpPhase * 1.2 + rp) * 30 + rp * 15;
      const rpRot = Math.sin(rpPhase * 2) * 0.5;
      const rpAlpha = 0.25 + Math.sin(rpPhase * 0.8) * 0.1;
      const rpColor = rp % 2 === 0 ? 0xdd6688 : 0xcc4466;
      g.ellipse(rpX, rpY, 2.5 + Math.sin(rpPhase) * 0.5, 1.5 + rpRot);
      g.fill({ color: rpColor, alpha: rpAlpha });
    }

    // --- Golden light rays pulsing through the rose window ---
    for (let lr = 0; lr < 3; lr++) {
      const lrPhase = time * 0.5 + lr * 2.1;
      const lrAlpha = 0.02 + Math.sin(lrPhase) * 0.015;
      const lrSpread = 8 + lr * 12;
      const lrBaseX = wX - 10 + lr * 10;
      g.moveTo(lrBaseX - lrSpread * 0.3, wY + 30);
      g.lineTo(lrBaseX + lrSpread * 0.3, wY + 30);
      g.lineTo(lrBaseX + lrSpread, this._floorY + 5);
      g.lineTo(lrBaseX - lrSpread * 0.8, this._floorY + 5);
      g.closePath();
      g.fill({ color: 0xeedd77, alpha: lrAlpha });
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // ORKNEY WASTES — Desolate windswept wasteland, fog, dead trees
  // =========================================================================

  private _build_orkney(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Heavy overcast sky layers
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 8; i++) {
        const cx = sw * (Math.sin(i * 2.3 + layer) * 0.4 + 0.5);
        const cy = floorY * (0.03 + layer * 0.04 + Math.sin(i * 1.7 + layer) * 0.04);
        const cr = 35 + (i % 4) * 12 + layer * 8;
        g.circle(cx, cy, cr);
        g.fill({ color: 0x556666 - layer * 0x111111, alpha: 0.25 - layer * 0.05 });
        g.circle(cx + cr * 0.3, cy + 4, cr * 0.7);
        g.fill({ color: 0x667777 - layer * 0x111111, alpha: 0.2 - layer * 0.05 });
      }
    }

    // Distant barren hills — 3 layers for depth
    g.moveTo(0, floorY * 0.5);
    for (let x = 0; x <= sw; x += sw / 10) {
      g.lineTo(x, floorY * (0.4 + Math.sin(x * 0.004 + 0.5) * 0.06));
    }
    g.lineTo(sw, floorY * 0.55);
    g.lineTo(0, floorY * 0.55);
    g.closePath();
    g.fill({ color: 0x3a4a3a, alpha: 0.3 });

    g.moveTo(0, floorY * 0.58);
    for (let x = 0; x <= sw; x += sw / 10) {
      g.lineTo(x, floorY * (0.48 + Math.sin(x * 0.006 + 2) * 0.06));
    }
    g.lineTo(sw, floorY * 0.65);
    g.lineTo(0, floorY * 0.65);
    g.closePath();
    g.fill({ color: 0x445544, alpha: 0.35 });

    g.moveTo(0, floorY * 0.68);
    for (let x = 0; x <= sw; x += sw / 10) {
      g.lineTo(x, floorY * (0.58 + Math.sin(x * 0.008 + 3) * 0.05));
    }
    g.lineTo(sw, floorY * 0.75);
    g.lineTo(0, floorY * 0.75);
    g.closePath();
    g.fill({ color: 0x554e40, alpha: 0.45 });

    // Dead trees (skeletal, leafless) — more detailed
    const deadTrees = [
      { x: sw * 0.03, h: 110 }, { x: sw * 0.14, h: 85 },
      { x: sw * 0.32, h: 55 }, { x: sw * 0.5, h: 45 },
      { x: sw * 0.68, h: 65 }, { x: sw * 0.82, h: 95 },
      { x: sw * 0.95, h: 100 },
    ];
    for (const t of deadTrees) {
      // Trunk with taper
      g.moveTo(t.x - 4, floorY);
      g.lineTo(t.x - 1.5, floorY - t.h);
      g.lineTo(t.x + 1.5, floorY - t.h);
      g.lineTo(t.x + 4, floorY);
      g.closePath();
      g.fill({ color: 0x3a3028 });
      // Bark texture
      for (let y = floorY - t.h + 10; y < floorY; y += 12) {
        g.moveTo(t.x - 2, y);
        g.lineTo(t.x + 1, y + 3);
        g.stroke({ color: 0x2a2018, width: 0.6, alpha: 0.4 });
      }
      // Roots at base
      g.moveTo(t.x - 4, floorY);
      g.quadraticCurveTo(t.x - 10, floorY + 2, t.x - 14, floorY + 3);
      g.stroke({ color: 0x3a3028, width: 2, cap: "round" });
      g.moveTo(t.x + 4, floorY);
      g.quadraticCurveTo(t.x + 10, floorY + 2, t.x + 12, floorY + 4);
      g.stroke({ color: 0x3a3028, width: 2, cap: "round" });
      // Branches
      const branchCount = 3 + Math.floor(Math.abs(Math.sin(t.x)) * 2);
      for (let b = 0; b < branchCount; b++) {
        const by = floorY - t.h + b * (t.h * 0.18) + 5;
        const dir = b % 2 === 0 ? 1 : -1;
        const bLen = 18 + b * 8;
        const ex = t.x + dir * bLen;
        const ey = by - 8 + b * 3;
        g.moveTo(t.x, by);
        g.quadraticCurveTo(t.x + dir * bLen * 0.5, by - 12, ex, ey);
        g.stroke({ color: 0x3a3028, width: 2 - b * 0.25, cap: "round" });
        // Sub-branches
        g.moveTo(ex, ey);
        g.lineTo(ex + dir * 10, ey - 8);
        g.stroke({ color: 0x3a3028, width: 0.8, cap: "round", alpha: 0.6 });
        g.moveTo(ex * 0.95 + t.x * 0.05, ey + 3);
        g.lineTo(ex + dir * 6, ey + 8);
        g.stroke({ color: 0x3a3028, width: 0.6, cap: "round", alpha: 0.5 });
      }
    }

    // Standing stones — more detailed menhirs
    const stoneXs = [sw * 0.26, sw * 0.38, sw * 0.48, sw * 0.58, sw * 0.72];
    for (const sx of stoneXs) {
      const sh2 = 28 + Math.sin(sx * 0.1) * 12;
      g.moveTo(sx - 9, floorY);
      g.lineTo(sx - 6, floorY - sh2);
      g.quadraticCurveTo(sx, floorY - sh2 - 6, sx + 6, floorY - sh2);
      g.lineTo(sx + 9, floorY);
      g.closePath();
      g.fill({ color: 0x666655 });
      g.stroke({ color: 0x555544, width: 1 });
      // Weathering marks
      g.moveTo(sx - 4, floorY - sh2 + 8);
      g.lineTo(sx - 2, floorY - sh2 + 18);
      g.stroke({ color: 0x555544, width: 0.5, alpha: 0.5 });
      // Lichen patches
      g.circle(sx + 2, floorY - sh2 + 12, 3);
      g.fill({ color: 0x778866, alpha: 0.25 });
    }

    // Cairn (stacked stones)
    const cairnX = sw * 0.88;
    for (let i = 0; i < 4; i++) {
      g.roundRect(cairnX - 8 + i * 2, floorY - 8 - i * 6, 16 - i * 4, 7, 2);
      g.fill({ color: 0x777766 });
      g.roundRect(cairnX - 8 + i * 2, floorY - 8 - i * 6, 16 - i * 4, 7, 2);
      g.stroke({ color: 0x666655, width: 0.5 });
    }

    // Scattered bones/debris
    for (let i = 0; i < 10; i++) {
      const bx = sw * (0.08 + i * 0.09) + Math.sin(i * 5) * 12;
      const by = floorY + 3;
      g.moveTo(bx, by);
      g.lineTo(bx + 6 + i % 3 * 3, by + 1);
      g.stroke({ color: 0xaaa899, width: 1.5, cap: "round", alpha: 0.35 });
    }

    // Ground — muddy, barren
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // Muddy puddle patches
    for (let i = 0; i < 6; i++) {
      const px = sw * (0.1 + i * 0.15);
      g.ellipse(px, floorY + 7, 16 + i * 3, 4);
      g.fill({ color: 0x444435, alpha: 0.3 });
      g.ellipse(px, floorY + 7, 10, 2.5);
      g.fill({ color: 0x556655, alpha: 0.12 });
    }
    // Dead grass patches
    for (let x = 10; x < sw; x += 25) {
      for (let b = 0; b < 2; b++) {
        g.moveTo(x + b * 3, floorY + 2);
        g.lineTo(x + b * 3 + (b - 1) * 3, floorY - 3);
        g.stroke({ color: 0x887755, width: 0.8, alpha: 0.3 });
      }
    }

    // Heavy fog layers
    for (let i = 0; i < 6; i++) {
      this._mistLayers.push({
        y: floorY - 20 + i * 12, speed: 0.25 + i * 0.08,
        offset: i * 70, alpha: 0.06 - i * 0.005, height: 28 + i * 8,
      });
    }
    // Wind-blown particles
    for (let i = 0; i < 18; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.4 + Math.random() * floorY * 0.5,
        vx: 0.4 + Math.random() * 0.5, vy: (Math.random() - 0.5) * 0.2,
        radius: 0.5 + Math.random() * 1, alpha: 0.1 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2, color: 0x998877,
      });
    }
    g.rect(0, floorY * 0.35, sw, floorY * 0.65);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Broken sword stuck in the cairn ---
    const swordX = sw * 0.88;
    const swordBaseY = floorY - 32;
    // Blade
    g.moveTo(swordX - 1.5, swordBaseY);
    g.lineTo(swordX, swordBaseY - 28);
    g.lineTo(swordX + 1.5, swordBaseY);
    g.closePath();
    g.fill({ color: 0x8899aa });
    g.moveTo(swordX - 1.5, swordBaseY);
    g.lineTo(swordX, swordBaseY - 28);
    g.lineTo(swordX + 1.5, swordBaseY);
    g.stroke({ color: 0x99aabb, width: 0.5, alpha: 0.6 });
    // Broken jagged edge at top
    g.moveTo(swordX - 1, swordBaseY - 26);
    g.lineTo(swordX - 2, swordBaseY - 28);
    g.lineTo(swordX + 1, swordBaseY - 27);
    g.stroke({ color: 0x8899aa, width: 1 });
    // Crossguard
    g.rect(swordX - 6, swordBaseY - 1, 12, 2);
    g.fill({ color: 0x665544 });
    // Grip sticking out
    g.rect(swordX - 1.5, swordBaseY + 1, 3, 6);
    g.fill({ color: 0x553322 });

    // --- Raven nests in dead trees (dark bundles of sticks) ---
    const nestPositions = [
      { x: sw * 0.03, y: floorY - 95 },
      { x: sw * 0.82, y: floorY - 80 },
      { x: sw * 0.95, y: floorY - 85 },
    ];
    for (const nest of nestPositions) {
      // Messy bundle of sticks
      for (let s = 0; s < 6; s++) {
        const sx1 = nest.x - 8 + s * 3;
        const sy1 = nest.y - 2 + Math.sin(s * 2) * 2;
        const sx2 = nest.x + 8 - s * 2;
        const sy2 = nest.y + 2 + Math.cos(s * 1.5) * 2;
        g.moveTo(sx1, sy1);
        g.lineTo(sx2, sy2);
        g.stroke({ color: 0x2a2018, width: 1.2, alpha: 0.5 });
      }
      // Nest bowl shape
      g.ellipse(nest.x, nest.y + 1, 9, 4);
      g.fill({ color: 0x2a2018, alpha: 0.4 });
      // Tiny eggs
      g.ellipse(nest.x - 2, nest.y, 2, 1.5);
      g.fill({ color: 0x334433, alpha: 0.3 });
      g.ellipse(nest.x + 2, nest.y - 0.5, 1.8, 1.3);
      g.fill({ color: 0x334433, alpha: 0.3 });
    }

    // --- Distant lightning-struck tree (split trunk silhouette) ---
    const lstX = sw * 0.56;
    const lstBaseY = floorY;
    const lstH = 50;
    // Main trunk (split)
    g.moveTo(lstX - 3, lstBaseY);
    g.lineTo(lstX - 1, lstBaseY - lstH * 0.6);
    g.lineTo(lstX - 4, lstBaseY - lstH);
    g.stroke({ color: 0x1a1008, width: 3, alpha: 0.5 });
    g.moveTo(lstX + 1, lstBaseY - lstH * 0.6);
    g.lineTo(lstX + 6, lstBaseY - lstH * 0.85);
    g.stroke({ color: 0x1a1008, width: 2.5, alpha: 0.5 });
    // Charred mark down the split
    g.moveTo(lstX - 0.5, lstBaseY - lstH * 0.6);
    g.lineTo(lstX, lstBaseY - lstH * 0.3);
    g.stroke({ color: 0x111108, width: 1.5, alpha: 0.4 });
    // Scorched base
    g.ellipse(lstX, lstBaseY + 1, 6, 2);
    g.fill({ color: 0x111108, alpha: 0.2 });

    // --- Pools of dark stagnant water ---
    const poolPositions = [sw * 0.2, sw * 0.44, sw * 0.74];
    for (let pi = 0; pi < poolPositions.length; pi++) {
      const ppx = poolPositions[pi];
      const ppy = floorY + 5 + (pi % 2) * 3;
      // Dark water
      g.ellipse(ppx, ppy, 18 + pi * 4, 5 + pi);
      g.fill({ color: 0x2a2a22, alpha: 0.35 });
      // Sickly green tint on surface
      g.ellipse(ppx, ppy - 1, 14 + pi * 3, 3.5 + pi * 0.5);
      g.fill({ color: 0x445533, alpha: 0.15 });
      // Subtle reflection
      g.ellipse(ppx + 3, ppy - 1, 5, 1.5);
      g.fill({ color: 0x667755, alpha: 0.08 });
    }

    // --- Unique critter: lone wolf silhouette on a distant hilltop ---
    this._critters.push({
      x: sw * 0.85, y: floorY * 0.42, baseX: sw * 0.85, baseY: floorY * 0.42,
      phase: 0, type: "wolf", dir: -1, speed: 0, state: 0,
    });
  }

  private _update_orkney(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Wind-blown dust
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 2 + p.phase) * 0.3;
      p.y += p.vy + Math.cos(time * 1.5 + p.phase) * 0.1;
      if (p.x > sw + 10) { p.x = -10; p.y = this._floorY * 0.4 + Math.random() * this._floorY * 0.5; }
      const fade = p.alpha * (0.5 + Math.sin(time * 3 + p.phase) * 0.3);
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: fade });
    }
    // Fog drift — more layers
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 30 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 60) {
        const mx = (x + offset) % (sw + 200) - 100;
        g.ellipse(mx, m.y + Math.sin(time * 0.4 + x * 0.01) * 5, 50, m.height / 2);
        g.fill({ color: 0x998877, alpha: m.alpha });
      }
    }

    // --- Tumbleweeds rolling across the ground ---
    for (let tw = 0; tw < 3; tw++) {
      const twSpeed = 0.8 + tw * 0.3;
      const twPhase = tw * 120;
      const twX = ((time * twSpeed * 20 + twPhase) % (sw + 60)) - 30;
      const twY = this._floorY - 5 + Math.sin(time * 3 + tw * 2) * 2;
      const twR = 5 + tw * 1.5;
      const twRot = time * twSpeed * 3;
      // Tumbleweed body (circle of tangled lines)
      g.circle(twX, twY, twR);
      g.stroke({ color: 0x887755, width: 1.2, alpha: 0.3 });
      // Internal tangle
      for (let tl = 0; tl < 4; tl++) {
        const angle1 = twRot + tl * 1.6;
        const angle2 = angle1 + 1.2;
        g.moveTo(twX + Math.cos(angle1) * twR * 0.7, twY + Math.sin(angle1) * twR * 0.7);
        g.lineTo(twX + Math.cos(angle2) * twR * 0.5, twY + Math.sin(angle2) * twR * 0.5);
        g.stroke({ color: 0x776644, width: 0.8, alpha: 0.25 });
      }
    }

    // --- Distant lightning flashes (rare, very brief) ---
    const lightningChance = Math.sin(time * 0.2) * Math.sin(time * 0.37) * Math.sin(time * 0.53);
    if (lightningChance > 0.92) {
      const lx = sw * (0.2 + Math.sin(time * 7.3) * 0.3);
      const ly = this._floorY * 0.08;
      // Sky flash
      g.rect(0, 0, sw, this._floorY * 0.3);
      g.fill({ color: 0xccccdd, alpha: 0.06 });
      // Lightning bolt
      g.moveTo(lx, ly);
      g.lineTo(lx + 5, ly + 15);
      g.lineTo(lx - 2, ly + 15);
      g.lineTo(lx + 3, ly + 30);
      g.stroke({ color: 0xddddef, width: 1.5, alpha: 0.5 });
      // Glow around bolt
      g.moveTo(lx, ly);
      g.lineTo(lx + 5, ly + 15);
      g.lineTo(lx - 2, ly + 15);
      g.lineTo(lx + 3, ly + 30);
      g.stroke({ color: 0xaaaacc, width: 4, alpha: 0.08 });
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // LAKE SANCTUARY — Serene lake, platforms, waterfalls, willows
  // =========================================================================

  private _build_lake(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Soft clouds
    for (let i = 0; i < 10; i++) {
      const cx = sw * (0.05 + i * 0.1);
      const cy = floorY * (0.06 + Math.sin(i * 1.5) * 0.04);
      g.ellipse(cx, cy, 30 + i * 4, 10 + i % 3 * 2);
      g.fill({ color: 0xddeeff, alpha: 0.15 });
      g.ellipse(cx + 15, cy + 3, 20 + i * 2, 8);
      g.fill({ color: 0xddeeff, alpha: 0.1 });
    }

    // Distant mountains — more detailed with snow caps
    g.moveTo(0, floorY * 0.42);
    g.lineTo(sw * 0.1, floorY * 0.35);
    g.lineTo(sw * 0.18, floorY * 0.28);
    g.lineTo(sw * 0.28, floorY * 0.35);
    g.lineTo(sw * 0.4, floorY * 0.3);
    g.lineTo(sw * 0.52, floorY * 0.22);
    g.lineTo(sw * 0.62, floorY * 0.3);
    g.lineTo(sw * 0.72, floorY * 0.25);
    g.lineTo(sw * 0.82, floorY * 0.32);
    g.lineTo(sw * 0.92, floorY * 0.28);
    g.lineTo(sw, floorY * 0.38);
    g.lineTo(sw, floorY * 0.5);
    g.lineTo(0, floorY * 0.5);
    g.closePath();
    g.fill({ color: 0x445566, alpha: 0.3 });
    // Snow caps
    g.moveTo(sw * 0.16, floorY * 0.3);
    g.lineTo(sw * 0.18, floorY * 0.28);
    g.lineTo(sw * 0.2, floorY * 0.3);
    g.closePath();
    g.fill({ color: 0xeeeeff, alpha: 0.3 });
    g.moveTo(sw * 0.5, floorY * 0.24);
    g.lineTo(sw * 0.52, floorY * 0.22);
    g.lineTo(sw * 0.54, floorY * 0.24);
    g.closePath();
    g.fill({ color: 0xeeeeff, alpha: 0.3 });

    // Treeline below mountains
    g.moveTo(0, floorY * 0.48);
    for (let x = 0; x <= sw; x += 12) {
      g.lineTo(x, floorY * (0.44 + Math.sin(x * 0.03) * 0.02));
    }
    g.lineTo(sw, floorY * 0.52);
    g.lineTo(0, floorY * 0.52);
    g.closePath();
    g.fill({ color: 0x2a4422, alpha: 0.35 });

    // Lake water body
    const waterY = floorY * 0.52;
    g.rect(0, waterY, sw, floorY - waterY);
    g.fill({ color: 0x2a5577 });
    // Water surface shimmer
    g.rect(0, waterY, sw, 4);
    g.fill({ color: 0x5599bb, alpha: 0.4 });
    // Depth gradient
    g.rect(0, waterY + (floorY - waterY) * 0.4, sw, (floorY - waterY) * 0.6);
    g.fill({ color: 0x1a3355, alpha: 0.2 });
    // Mountain reflection in water
    g.moveTo(0, waterY + 10);
    for (let x = 0; x <= sw; x += sw / 6) {
      g.lineTo(x, waterY + 10 + Math.sin(x * 0.01 + 1) * 8);
    }
    g.lineTo(sw, waterY + 25);
    g.lineTo(0, waterY + 25);
    g.closePath();
    g.fill({ color: 0x445566, alpha: 0.1 });

    // Willow trees on edges — more lush
    for (const tx of [-8, sw * 0.05, sw * 0.93, sw + 8]) {
      const th = 115 + Math.sin(tx * 0.1) * 20;
      // Trunk with bark detail
      g.rect(tx - 7, floorY - th, 14, th);
      g.fill({ color: 0x3a2a18 });
      g.rect(tx - 7, floorY - th, 4, th);
      g.fill({ color: 0x4a3a28, alpha: 0.3 });
      // Canopy
      g.ellipse(tx, floorY - th - 5, 40, 28);
      g.fill({ color: 0x336633, alpha: 0.45 });
      g.ellipse(tx + 5, floorY - th, 30, 20);
      g.fill({ color: 0x448844, alpha: 0.35 });
      // Drooping branches — more
      for (let b = 0; b < 12; b++) {
        const bx = tx - 35 + b * 6;
        g.moveTo(bx, floorY - th + 8);
        g.quadraticCurveTo(bx + 3, floorY - th + 45, bx + 1, floorY - 10);
        g.stroke({ color: 0x448833, width: 1, alpha: 0.3 });
        // Leaf cluster at tip
        g.circle(bx + 1, floorY - 12, 2.5);
        g.fill({ color: 0x55aa44, alpha: 0.2 });
      }
    }

    // Reeds along water edge
    for (let x = sw * 0.15; x < sw * 0.85; x += 20) {
      for (let r = 0; r < 3; r++) {
        const rx = x + r * 3 - 3;
        g.moveTo(rx, floorY);
        g.lineTo(rx + Math.sin(rx * 0.5) * 2, floorY - 12 - r * 4);
        g.stroke({ color: 0x557733, width: 1, alpha: 0.4 });
      }
    }

    // Stone platform / bridge — more detailed
    g.rect(sw * 0.06, floorY - 6, sw * 0.88, 10);
    g.fill({ color: 0x667766 });
    g.rect(sw * 0.06, floorY - 6, sw * 0.88, 3);
    g.fill({ color: 0x778877, alpha: 0.5 });
    // Stone block texture
    for (let x = sw * 0.06; x < sw * 0.94; x += 30) {
      g.moveTo(x, floorY - 6);
      g.lineTo(x, floorY + 4);
      g.stroke({ color: 0x556655, width: 0.5, alpha: 0.3 });
    }
    // Moss on bridge
    for (let i = 0; i < 6; i++) {
      const mx = sw * (0.12 + i * 0.14);
      g.ellipse(mx, floorY - 4, 8, 2);
      g.fill({ color: 0x447733, alpha: 0.15 });
    }
    // Support pillars
    for (const px of [sw * 0.18, sw * 0.38, sw * 0.58, sw * 0.78]) {
      g.rect(px - 6, floorY + 4, 12, 28);
      g.fill({ color: 0x667766 });
      g.rect(px - 6, floorY + 4, 3, 28);
      g.fill({ color: 0x778877, alpha: 0.3 });
    }

    // Lily pads on water — more with flowers
    for (let i = 0; i < 12; i++) {
      const lx = sw * (0.08 + i * 0.08);
      const ly = waterY + 8 + (i % 4) * 7;
      g.ellipse(lx, ly, 6 + i % 2 * 2, 3);
      g.fill({ color: 0x337733, alpha: 0.45 });
      g.ellipse(lx, ly, 6 + i % 2 * 2, 3);
      g.stroke({ color: 0x226622, width: 0.5, alpha: 0.3 });
      // Flower on some
      if (i % 3 === 0) {
        g.circle(lx, ly - 3, 2.5);
        g.fill({ color: 0xeeddff, alpha: 0.5 });
        g.circle(lx, ly - 3, 1);
        g.fill({ color: 0xffee88, alpha: 0.6 });
      }
    }

    // Dragonflies (static base positions)
    for (let i = 0; i < 5; i++) {
      this._particles.push({
        x: sw * (0.2 + i * 0.15), y: waterY - 10 - i * 5,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2,
        radius: 1.5, alpha: 0.4, phase: Math.random() * Math.PI * 2, color: 0x44ddff,
      });
    }

    // Water reflections
    for (let y = waterY + 6; y < floorY; y += 5) {
      const alpha = 0.08 - (y - waterY) * 0.001;
      g.moveTo(0, y);
      g.lineTo(sw, y);
      g.stroke({ color: 0x88bbcc, width: 0.8, alpha: Math.max(0.02, alpha) });
    }

    // Ground
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });

    // Water ripples
    for (let i = 0; i < 12; i++) {
      this._ripples.push({
        y: waterY + 3 + i * 4, amplitude: 1 + Math.random() * 1.5,
        frequency: 0.03 + Math.random() * 0.02, speed: 0.5 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2, alpha: 0.1 + Math.random() * 0.06,
      });
    }
    // Sparkle particles
    for (let i = 0; i < 15; i++) {
      this._particles.push({
        x: Math.random() * sw, y: waterY + Math.random() * (floorY - waterY),
        vx: (Math.random() - 0.5) * 0.1, vy: 0,
        radius: 1 + Math.random() * 1.5, alpha: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    g.rect(0, floorY * 0.45, sw, floorY * 0.55);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha * 0.5 });

    // --- Small wooden rowboat moored at the shore ---
    const boatX = sw * 0.15;
    const boatY = floorY - 2;
    // Hull
    g.moveTo(boatX - 18, boatY);
    g.quadraticCurveTo(boatX - 22, boatY + 6, boatX - 15, boatY + 9);
    g.lineTo(boatX + 15, boatY + 9);
    g.quadraticCurveTo(boatX + 22, boatY + 6, boatX + 18, boatY);
    g.closePath();
    g.fill({ color: 0x6a4a2a });
    g.moveTo(boatX - 18, boatY);
    g.quadraticCurveTo(boatX - 22, boatY + 6, boatX - 15, boatY + 9);
    g.lineTo(boatX + 15, boatY + 9);
    g.quadraticCurveTo(boatX + 22, boatY + 6, boatX + 18, boatY);
    g.stroke({ color: 0x5a3a1a, width: 1.5 });
    // Plank lines
    g.moveTo(boatX - 14, boatY + 3);
    g.lineTo(boatX + 14, boatY + 3);
    g.stroke({ color: 0x5a3a1a, width: 0.6, alpha: 0.4 });
    g.moveTo(boatX - 13, boatY + 6);
    g.lineTo(boatX + 13, boatY + 6);
    g.stroke({ color: 0x5a3a1a, width: 0.6, alpha: 0.4 });
    // Oar (left, resting across)
    g.moveTo(boatX - 24, boatY - 3);
    g.lineTo(boatX + 5, boatY + 4);
    g.stroke({ color: 0x7a5a3a, width: 1.5, cap: "round" });
    // Oar blade
    g.ellipse(boatX - 26, boatY - 4, 4, 1.8);
    g.fill({ color: 0x7a5a3a, alpha: 0.6 });
    // Mooring rope
    g.moveTo(boatX + 16, boatY + 1);
    g.quadraticCurveTo(boatX + 22, boatY - 5, boatX + 20, boatY - 8);
    g.stroke({ color: 0x887766, width: 1, alpha: 0.4 });

    // --- Stepping stones across shallow water ---
    const stoneYBase = floorY * 0.52;
    const steppingStones = [sw * 0.3, sw * 0.38, sw * 0.45, sw * 0.53, sw * 0.6, sw * 0.68];
    for (let si = 0; si < steppingStones.length; si++) {
      const ssx = steppingStones[si];
      const ssy = stoneYBase + 12 + Math.sin(si * 1.8) * 4;
      g.ellipse(ssx, ssy, 6 + (si % 2) * 2, 3);
      g.fill({ color: 0x778877, alpha: 0.5 });
      g.ellipse(ssx, ssy, 6 + (si % 2) * 2, 3);
      g.stroke({ color: 0x667766, width: 0.8, alpha: 0.3 });
      // Moss on stone
      g.ellipse(ssx + 1, ssy - 1, 3, 1.5);
      g.fill({ color: 0x447733, alpha: 0.15 });
    }

    // --- Hanging lanterns on willow branches ---
    const lanternPositions = [
      { x: sw * 0.05 - 10, y: floorY - 35 },
      { x: sw * 0.05 + 15, y: floorY - 28 },
      { x: sw * 0.93 - 12, y: floorY - 32 },
      { x: sw * 0.93 + 10, y: floorY - 25 },
    ];
    for (const lan of lanternPositions) {
      // Chain/string
      g.moveTo(lan.x, lan.y - 8);
      g.lineTo(lan.x, lan.y);
      g.stroke({ color: 0x665544, width: 0.6, alpha: 0.4 });
      // Lantern body
      g.rect(lan.x - 3, lan.y, 6, 7);
      g.fill({ color: 0xddaa44, alpha: 0.4 });
      g.rect(lan.x - 3, lan.y, 6, 7);
      g.stroke({ color: 0xaa7733, width: 0.8, alpha: 0.5 });
      // Warm glow
      g.circle(lan.x, lan.y + 3, 8);
      g.fill({ color: 0xffcc55, alpha: 0.04 });
    }

    // --- Stone shrine / small torii gate in the water ---
    const toriiX = sw * 0.78;
    const toriiY = floorY * 0.52 + 8;
    // Vertical pillars
    g.rect(toriiX - 12, toriiY - 22, 3, 24);
    g.fill({ color: 0x888877 });
    g.rect(toriiX + 9, toriiY - 22, 3, 24);
    g.fill({ color: 0x888877 });
    // Top beam (horizontal)
    g.rect(toriiX - 15, toriiY - 24, 30, 3);
    g.fill({ color: 0x888877 });
    // Second beam
    g.rect(toriiX - 12, toriiY - 19, 24, 2);
    g.fill({ color: 0x7a7a6a });
    // Stone base in water
    g.ellipse(toriiX - 10, toriiY + 2, 4, 2);
    g.fill({ color: 0x778877, alpha: 0.4 });
    g.ellipse(toriiX + 10, toriiY + 2, 4, 2);
    g.fill({ color: 0x778877, alpha: 0.4 });
    // Subtle water disturbance around pillars
    g.ellipse(toriiX, toriiY + 1, 16, 3);
    g.fill({ color: 0x88bbcc, alpha: 0.06 });

    // --- Unique critter: koi fish swimming beneath the surface ---
    this._critters.push({
      x: sw * 0.3, y: floorY + 18, baseX: sw * 0.3, baseY: floorY + 18,
      phase: 0, type: "fish", dir: 1, speed: 0.3, state: 0,
    });
    this._critters.push({
      x: sw * 0.6, y: floorY + 28, baseX: sw * 0.6, baseY: floorY + 28,
      phase: 1.5, type: "fish", dir: -1, speed: 0.22, state: 1,
    });
  }

  private _update_lake(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Water ripples
    for (const r of this._ripples) {
      g.moveTo(0, r.y);
      for (let x = 0; x < sw; x += 4) {
        g.lineTo(x, r.y + Math.sin(x * r.frequency + time * r.speed + r.phase) * r.amplitude);
      }
      g.stroke({ color: 0x88ccdd, width: 0.8, alpha: r.alpha * (0.7 + Math.sin(time * 0.5 + r.phase) * 0.3) });
    }
    // Water sparkles + dragonflies
    for (const p of this._particles) {
      if (p.color === 0x44ddff) {
        // Dragonfly — erratic movement
        p.x += Math.sin(time * 4 + p.phase) * 1.5;
        p.y += Math.cos(time * 3 + p.phase * 1.3) * 1;
        // Wings
        g.moveTo(p.x - 4, p.y - 1);
        g.lineTo(p.x, p.y);
        g.lineTo(p.x - 4, p.y + 1);
        g.stroke({ color: 0xaaeeff, width: 0.8, alpha: 0.4 });
        g.moveTo(p.x + 4, p.y - 1);
        g.lineTo(p.x, p.y);
        g.lineTo(p.x + 4, p.y + 1);
        g.stroke({ color: 0xaaeeff, width: 0.8, alpha: 0.4 });
        // Body
        g.circle(p.x, p.y, 1);
        g.fill({ color: 0x44ddff, alpha: 0.6 });
      } else {
        p.x += Math.sin(time * 0.3 + p.phase) * 0.2;
        const pulse = p.alpha * (0.3 + Math.sin(time * 3 + p.phase) * 0.7);
        if (pulse > 0.15) {
          g.circle(p.x, p.y, p.radius);
          g.fill({ color: 0xffffff, alpha: pulse });
        }
      }
    }

    // --- Fish jumping out of water (small arcs appearing briefly) ---
    const waterSurface = this._floorY * 0.52;
    for (let fj = 0; fj < 3; fj++) {
      const fjPhase = time * 0.3 + fj * 3.7;
      const fjCycle = fjPhase % 6;
      if (fjCycle < 0.8) {
        const fjProgress = fjCycle / 0.8;
        const fjX = sw * (0.25 + fj * 0.22);
        const fjY = waterSurface + 5 - Math.sin(fjProgress * Math.PI) * 14;
        const fjAlpha = Math.sin(fjProgress * Math.PI) * 0.5;
        // Fish body
        g.ellipse(fjX, fjY, 3, 1.5);
        g.fill({ color: 0xdd8844, alpha: fjAlpha });
        // Tail fin
        g.moveTo(fjX - 3, fjY);
        g.lineTo(fjX - 6, fjY - 2);
        g.lineTo(fjX - 6, fjY + 2);
        g.closePath();
        g.fill({ color: 0xcc7733, alpha: fjAlpha * 0.7 });
      }
    }

    // --- Cherry blossom petals on water surface ---
    for (let cb = 0; cb < 6; cb++) {
      const cbPhase = time * 0.15 + cb * 1.4;
      const cbX = ((cbPhase * 12 + cb * 60) % (sw + 30)) - 15;
      const cbY = waterSurface + 6 + cb * 5 + Math.sin(time * 0.5 + cb) * 2;
      const cbAlpha = 0.3 + Math.sin(time * 0.8 + cb * 0.5) * 0.1;
      g.ellipse(cbX, cbY, 2, 1);
      g.fill({ color: 0xffaacc, alpha: cbAlpha });
    }

    // --- Ripple rings expanding from fish jumps ---
    for (let rr = 0; rr < 3; rr++) {
      const rrPhase = time * 0.3 + rr * 3.7;
      const rrCycle = rrPhase % 6;
      if (rrCycle > 0.3 && rrCycle < 2.5) {
        const rrProgress = (rrCycle - 0.3) / 2.2;
        const rrX = sw * (0.25 + rr * 0.22);
        const rrY = waterSurface + 5;
        const rrRadius = 3 + rrProgress * 18;
        const rrAlpha = 0.15 * (1 - rrProgress);
        g.ellipse(rrX, rrY, rrRadius, rrRadius * 0.35);
        g.stroke({ color: 0x88ccdd, width: 0.8, alpha: rrAlpha });
        if (rrProgress < 0.6) {
          g.ellipse(rrX, rrY, rrRadius * 0.6, rrRadius * 0.2);
          g.stroke({ color: 0x99ddee, width: 0.5, alpha: rrAlpha * 0.6 });
        }
      }
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // DRAGON'S PEAK — Volcanic mountain, lava flows, dragon bones, embers
  // =========================================================================

  private _build_dragon_peak(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY, 10);
    // Red glow at horizon
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: 0xff4400, alpha: 0.06 });
    g.rect(0, floorY * 0.7, sw, floorY * 0.3);
    g.fill({ color: 0xff2200, alpha: 0.04 });

    // Volcanic mountain background — more detail
    g.moveTo(0, floorY * 0.7);
    g.lineTo(sw * 0.12, floorY * 0.5);
    g.lineTo(sw * 0.25, floorY * 0.35);
    g.lineTo(sw * 0.38, floorY * 0.2);
    g.lineTo(sw * 0.5, floorY * 0.12);
    g.lineTo(sw * 0.62, floorY * 0.2);
    g.lineTo(sw * 0.75, floorY * 0.35);
    g.lineTo(sw * 0.88, floorY * 0.5);
    g.lineTo(sw, floorY * 0.65);
    g.lineTo(sw, floorY);
    g.lineTo(0, floorY);
    g.closePath();
    g.fill({ color: 0x2a1a0a });
    // Rock face detail
    for (let i = 0; i < 8; i++) {
      const rx = sw * (0.2 + i * 0.08);
      const ry = floorY * (0.3 + Math.abs(rx / sw - 0.5) * 0.8);
      g.moveTo(rx, ry);
      g.lineTo(rx + 15, ry + 20);
      g.stroke({ color: 0x1a0a00, width: 1.5, alpha: 0.3 });
    }
    // Mountain ridges
    g.moveTo(sw * 0.3, floorY * 0.3);
    g.lineTo(sw * 0.42, floorY * 0.18);
    g.lineTo(sw * 0.5, floorY * 0.12);
    g.stroke({ color: 0x3a2a1a, width: 1.5, alpha: 0.5 });
    g.moveTo(sw * 0.5, floorY * 0.12);
    g.lineTo(sw * 0.58, floorY * 0.18);
    g.lineTo(sw * 0.7, floorY * 0.3);
    g.stroke({ color: 0x3a2a1a, width: 1.5, alpha: 0.5 });

    // Volcano crater glow
    g.circle(sw * 0.5, floorY * 0.1, 25);
    g.fill({ color: 0xff4400, alpha: 0.15 });
    g.circle(sw * 0.5, floorY * 0.1, 14);
    g.fill({ color: 0xff6622, alpha: 0.25 });
    g.circle(sw * 0.5, floorY * 0.1, 6);
    g.fill({ color: 0xffaa44, alpha: 0.35 });
    // Smoke from peak
    for (let i = 0; i < 8; i++) {
      g.circle(sw * 0.5 + (i - 4) * 7, floorY * 0.06 - i * 4, 10 + i * 3);
      g.fill({ color: 0x332222, alpha: 0.2 - i * 0.02 });
    }

    // Lava rivers — more streams
    const lavaStreams = [
      { x1: sw * 0.42, y1: floorY * 0.18, x2: sw * 0.25, y2: floorY * 0.65 },
      { x1: sw * 0.48, y1: floorY * 0.15, x2: sw * 0.35, y2: floorY * 0.5 },
      { x1: sw * 0.52, y1: floorY * 0.15, x2: sw * 0.65, y2: floorY * 0.5 },
      { x1: sw * 0.58, y1: floorY * 0.18, x2: sw * 0.72, y2: floorY * 0.6 },
    ];
    for (const ls of lavaStreams) {
      // Glow around lava
      g.moveTo(ls.x1, ls.y1);
      g.quadraticCurveTo((ls.x1 + ls.x2) / 2 + 8, (ls.y1 + ls.y2) / 2, ls.x2, ls.y2);
      g.stroke({ color: 0xff4400, width: 8, alpha: 0.06 });
      // Main flow
      g.moveTo(ls.x1, ls.y1);
      g.quadraticCurveTo((ls.x1 + ls.x2) / 2 + 8, (ls.y1 + ls.y2) / 2, ls.x2, ls.y2);
      g.stroke({ color: 0xff4400, width: 4, alpha: 0.3 });
      // Bright center
      g.moveTo(ls.x1, ls.y1);
      g.quadraticCurveTo((ls.x1 + ls.x2) / 2 + 8, (ls.y1 + ls.y2) / 2, ls.x2, ls.y2);
      g.stroke({ color: 0xff8844, width: 2, alpha: 0.5 });
    }

    // Lava pool at base
    g.ellipse(sw * 0.3, floorY * 0.68, 25, 8);
    g.fill({ color: 0xff4400, alpha: 0.2 });
    g.ellipse(sw * 0.3, floorY * 0.68, 15, 5);
    g.fill({ color: 0xff8844, alpha: 0.25 });

    // Rocky outcrops in foreground
    for (const rx of [sw * 0.05, sw * 0.15, sw * 0.85, sw * 0.95]) {
      const rh = 15 + Math.sin(rx * 0.2) * 8;
      g.moveTo(rx - 10, floorY);
      g.lineTo(rx - 6, floorY - rh);
      g.lineTo(rx + 2, floorY - rh + 3);
      g.lineTo(rx + 10, floorY);
      g.closePath();
      g.fill({ color: 0x2a1a0a });
      g.stroke({ color: 0x1a0a00, width: 0.8 });
    }

    // Dragon bones (ribs and skull) — more detailed
    const boneX = sw * 0.2;
    const boneY = floorY - 5;
    // Spine with vertebrae detail
    g.moveTo(boneX - 45, boneY);
    g.quadraticCurveTo(boneX, boneY - 18, boneX + 55, boneY - 6);
    g.stroke({ color: 0xccbb99, width: 5, cap: "round" });
    // Vertebra bumps
    for (let i = 0; i < 8; i++) {
      const vx = boneX - 35 + i * 11;
      const vy = boneY - 5 - Math.sin(i * 0.5) * 8;
      g.circle(vx, vy - 3, 3);
      g.fill({ color: 0xccbb99, alpha: 0.6 });
    }
    // Ribs — more
    for (let i = 0; i < 7; i++) {
      const rx = boneX - 25 + i * 12;
      const ry = boneY - 12 - Math.sin(i * 0.5) * 4;
      g.moveTo(rx, ry);
      g.quadraticCurveTo(rx + 4, ry - 28, rx + 2, ry - 40);
      g.stroke({ color: 0xccbb99, width: 2.5, cap: "round", alpha: 0.6 + (i % 2) * 0.15 });
    }
    // Tail bones trailing
    for (let i = 0; i < 5; i++) {
      g.circle(boneX + 60 + i * 8, boneY - 4 + i * 1.5, 2.5 - i * 0.3);
      g.fill({ color: 0xccbb99, alpha: 0.5 - i * 0.08 });
    }

    // Dragon skull — more detailed
    const skullX = sw * 0.78;
    // Skull shape
    g.ellipse(skullX, floorY - 14, 20, 14);
    g.fill({ color: 0xccbb99 });
    g.ellipse(skullX, floorY - 14, 20, 14);
    g.stroke({ color: 0xaa9977, width: 1.5 });
    // Snout
    g.moveTo(skullX + 18, floorY - 16);
    g.lineTo(skullX + 30, floorY - 12);
    g.lineTo(skullX + 28, floorY - 8);
    g.lineTo(skullX + 18, floorY - 10);
    g.closePath();
    g.fill({ color: 0xccbb99 });
    g.stroke({ color: 0xaa9977, width: 1 });
    // Eye sockets
    g.circle(skullX - 6, floorY - 16, 5);
    g.fill({ color: 0x331100 });
    g.circle(skullX + 6, floorY - 16, 5);
    g.fill({ color: 0x331100 });
    // Glowing eyes (faint ember)
    g.circle(skullX - 6, floorY - 16, 2);
    g.fill({ color: 0xff4400, alpha: 0.15 });
    g.circle(skullX + 6, floorY - 16, 2);
    g.fill({ color: 0xff4400, alpha: 0.15 });
    // Teeth
    for (let i = 0; i < 5; i++) {
      g.moveTo(skullX + 20 + i * 2.5, floorY - 8);
      g.lineTo(skullX + 21 + i * 2.5, floorY - 5);
      g.stroke({ color: 0xccbb99, width: 1.5 });
    }
    // Horns — curved
    g.moveTo(skullX - 14, floorY - 22);
    g.quadraticCurveTo(skullX - 26, floorY - 40, skullX - 20, floorY - 48);
    g.stroke({ color: 0xaa9977, width: 3.5, cap: "round" });
    g.moveTo(skullX + 14, floorY - 22);
    g.quadraticCurveTo(skullX + 26, floorY - 40, skullX + 20, floorY - 48);
    g.stroke({ color: 0xaa9977, width: 3.5, cap: "round" });

    // Obsidian shards
    for (const ox of [sw * 0.42, sw * 0.55, sw * 0.62]) {
      g.moveTo(ox, floorY);
      g.lineTo(ox - 3, floorY - 12);
      g.lineTo(ox + 4, floorY - 15);
      g.lineTo(ox + 2, floorY);
      g.closePath();
      g.fill({ color: 0x111118 });
      g.stroke({ color: 0x222228, width: 0.5 });
    }

    // Rocky ground with lava cracks
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // More extensive lava cracks
    for (let i = 0; i < 8; i++) {
      const cx = sw * (0.08 + i * 0.12);
      g.moveTo(cx, floorY + 2);
      g.lineTo(cx + 8, floorY + 10);
      g.lineTo(cx + 4, floorY + 18);
      g.stroke({ color: 0xff4400, width: 1.5, alpha: 0.25 });
      g.moveTo(cx, floorY + 2);
      g.lineTo(cx + 8, floorY + 10);
      g.stroke({ color: 0xff8844, width: 0.8, alpha: 0.3 });
    }
    // Scorched earth patches
    for (let i = 0; i < 5; i++) {
      const px = sw * (0.15 + i * 0.18);
      g.ellipse(px, floorY + 6, 14, 4);
      g.fill({ color: 0x1a0a00, alpha: 0.2 });
    }

    // Ember particles
    for (let i = 0; i < 30; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.2 + Math.random() * floorY * 0.7,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.3 - Math.random() * 0.5,
        radius: 1 + Math.random() * 2, alpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2, color: i % 3 === 0 ? 0xff8844 : 0xff4422,
      });
    }
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Dragon eggs in a nest ---
    const nestX = sw * 0.62;
    const nestY = floorY - 3;
    // Nest (pile of sticks)
    for (let ns = 0; ns < 8; ns++) {
      const nsx1 = nestX - 14 + ns * 3;
      const nsy1 = nestY + 1 + Math.sin(ns * 1.5) * 2;
      const nsx2 = nestX + 14 - ns * 2;
      const nsy2 = nestY + 3 + Math.cos(ns * 2) * 1.5;
      g.moveTo(nsx1, nsy1);
      g.lineTo(nsx2, nsy2);
      g.stroke({ color: 0x3a2a18, width: 1.5, alpha: 0.4 });
    }
    g.ellipse(nestX, nestY + 2, 16, 5);
    g.fill({ color: 0x2a1a08, alpha: 0.3 });
    // Three eggs
    const eggColors = [0x443355, 0x554422, 0x335544];
    const eggPositions = [
      { x: nestX - 5, y: nestY - 3 },
      { x: nestX + 4, y: nestY - 4 },
      { x: nestX, y: nestY - 6 },
    ];
    for (let ei = 0; ei < 3; ei++) {
      const egg = eggPositions[ei];
      g.ellipse(egg.x, egg.y, 4, 5.5);
      g.fill({ color: eggColors[ei] });
      g.ellipse(egg.x, egg.y, 4, 5.5);
      g.stroke({ color: 0x221111, width: 0.8, alpha: 0.4 });
      // Warm speckles on eggs
      g.circle(egg.x - 1, egg.y - 2, 0.8);
      g.fill({ color: 0xff6633, alpha: 0.15 });
      g.circle(egg.x + 1.5, egg.y + 1, 0.6);
      g.fill({ color: 0xff8844, alpha: 0.12 });
    }
    // Faint warmth glow under eggs
    g.ellipse(nestX, nestY - 3, 10, 6);
    g.fill({ color: 0xff4400, alpha: 0.04 });

    // --- Ancient dwarvish runes carved into rock faces ---
    const runePositions = [
      { x: sw * 0.18, y: floorY * 0.45 },
      { x: sw * 0.35, y: floorY * 0.38 },
      { x: sw * 0.65, y: floorY * 0.42 },
      { x: sw * 0.8, y: floorY * 0.5 },
    ];
    for (const rn of runePositions) {
      // Rune mark (angular lines)
      g.moveTo(rn.x, rn.y - 5);
      g.lineTo(rn.x + 3, rn.y + 5);
      g.stroke({ color: 0xff8844, width: 1.2, alpha: 0.2 });
      g.moveTo(rn.x - 3, rn.y);
      g.lineTo(rn.x + 3, rn.y);
      g.stroke({ color: 0xff8844, width: 1, alpha: 0.18 });
      g.moveTo(rn.x + 1, rn.y - 3);
      g.lineTo(rn.x - 2, rn.y + 2);
      g.stroke({ color: 0xffaa55, width: 0.8, alpha: 0.15 });
      // Subtle glow around rune
      g.circle(rn.x, rn.y, 6);
      g.fill({ color: 0xff6633, alpha: 0.03 });
    }

    // --- Chains hanging from cliffs (broken shackle chains) ---
    for (const cx of [sw * 0.08, sw * 0.92]) {
      const chainTopY = floorY * 0.35;
      const chainLen = 8;
      for (let cl = 0; cl < chainLen; cl++) {
        const cy = chainTopY + cl * 6;
        const sway = Math.sin(cl * 0.8) * 2;
        g.ellipse(cx + sway, cy, 2.5, 3.5);
        g.stroke({ color: 0x665544, width: 1.5, alpha: 0.35 });
      }
      // Broken link at bottom
      const bottomY = chainTopY + chainLen * 6;
      g.moveTo(cx + 1, bottomY);
      g.lineTo(cx + 3, bottomY + 4);
      g.stroke({ color: 0x665544, width: 1.5, alpha: 0.25 });
    }

    // --- Pools of cooled obsidian glass (dark reflective patches) ---
    const obsidianPositions = [sw * 0.35, sw * 0.48, sw * 0.7];
    for (let oi = 0; oi < obsidianPositions.length; oi++) {
      const ox = obsidianPositions[oi];
      const oy = floorY + 4 + (oi % 2) * 3;
      // Dark glass pool
      g.ellipse(ox, oy, 12 + oi * 3, 4);
      g.fill({ color: 0x0a0a12, alpha: 0.4 });
      // Glossy reflection highlight
      g.ellipse(ox - 2, oy - 1, 6, 1.5);
      g.fill({ color: 0x334455, alpha: 0.12 });
      g.ellipse(ox + 3, oy, 3, 1);
      g.fill({ color: 0x445566, alpha: 0.08 });
    }

    // --- Unique critter: tiny dragon circling the mountain ---
    this._critters.push({
      x: sw * 0.5, y: floorY * 0.18, baseX: sw * 0.5, baseY: floorY * 0.18,
      phase: 0, type: "mini_dragon", dir: 1, speed: 0, state: 0,
    });
  }

  private _update_dragon_peak(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Rising embers
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 2 + p.phase) * 0.3;
      p.y += p.vy;
      if (p.y < this._floorY * 0.05) { p.y = this._floorY; p.x = Math.random() * sw; }
      const fade = p.alpha * (0.3 + Math.sin(time * 4 + p.phase) * 0.5);
      // Glow
      g.circle(p.x, p.y, p.radius + 1.5);
      g.fill({ color: p.color, alpha: fade * 0.15 });
      // Core
      g.circle(p.x, p.y, p.radius * 0.6);
      g.fill({ color: 0xffcc44, alpha: fade });
    }
    // Lava glow pulse at peak
    const pulse = 0.12 + Math.sin(time * 1.5) * 0.06;
    g.circle(sw * 0.5, this._floorY * 0.1, 28);
    g.fill({ color: 0xff4400, alpha: pulse });
    g.circle(sw * 0.5, this._floorY * 0.1, 12);
    g.fill({ color: 0xff8844, alpha: pulse * 1.5 });
    // Heat shimmer
    for (let x = sw * 0.15; x < sw * 0.85; x += 15) {
      const shimmer = Math.sin(time * 3 + x * 0.05) * 2;
      g.moveTo(x, this._floorY * 0.6 + shimmer);
      g.lineTo(x + 10, this._floorY * 0.6 - shimmer);
      g.stroke({ color: 0xff6633, width: 1, alpha: 0.03 });
    }
    // Skull eye flicker
    const skullX = sw * 0.78;
    const eyeGlow = 0.1 + Math.sin(time * 2) * 0.08;
    g.circle(skullX - 6, this._floorY - 16, 3);
    g.fill({ color: 0xff4400, alpha: eyeGlow });
    g.circle(skullX + 6, this._floorY - 16, 3);
    g.fill({ color: 0xff4400, alpha: eyeGlow });

    // --- Lava bubbles popping in the lava pool ---
    const lavaPoolX = sw * 0.3;
    const lavaPoolY = this._floorY * 0.68;
    for (let lb = 0; lb < 4; lb++) {
      const lbPhase = time * 1.2 + lb * 2.3;
      const lbCycle = lbPhase % 3;
      if (lbCycle < 1.5) {
        const lbProgress = lbCycle / 1.5;
        const lbX = lavaPoolX - 10 + lb * 7;
        const lbY = lavaPoolY - lbProgress * 5;
        const lbR = 2 + Math.sin(lbProgress * Math.PI) * 2;
        const lbAlpha = 0.3 * Math.sin(lbProgress * Math.PI);
        g.circle(lbX, lbY, lbR);
        g.fill({ color: 0xff6622, alpha: lbAlpha });
        g.circle(lbX, lbY, lbR * 0.5);
        g.fill({ color: 0xffaa44, alpha: lbAlpha * 1.2 });
        // Pop burst at peak
        if (lbProgress > 0.8) {
          const burstAlpha = (lbProgress - 0.8) / 0.2 * 0.15;
          g.circle(lbX, lbY, lbR + 3);
          g.stroke({ color: 0xff8833, width: 0.8, alpha: burstAlpha });
        }
      }
    }

    // --- Ash/cinder fall from the sky ---
    for (let ash = 0; ash < 12; ash++) {
      const ashPhase = time * 0.4 + ash * 1.1;
      const ashX = (ash * sw / 12 + Math.sin(ashPhase * 0.8) * 15) % sw;
      const ashY = ((ashPhase * 15 + ash * 30) % (this._floorY * 0.9));
      const ashAlpha = 0.12 + Math.sin(ashPhase) * 0.05;
      const ashSize = 0.8 + (ash % 3) * 0.3;
      g.circle(ashX, ashY, ashSize);
      g.fill({ color: 0x888888, alpha: ashAlpha });
    }

    // --- Volcanic steam vents (white puffs rising from cracks) ---
    const ventPositions = [sw * 0.22, sw * 0.5, sw * 0.75];
    for (let vi = 0; vi < ventPositions.length; vi++) {
      const ventX = ventPositions[vi];
      const ventBaseY = this._floorY - 2;
      for (let puff = 0; puff < 3; puff++) {
        const puffPhase = time * 0.8 + vi * 1.5 + puff * 1.2;
        const puffRise = (puffPhase * 8) % 35;
        const puffX = ventX + Math.sin(puffPhase * 1.5) * 5;
        const puffY = ventBaseY - puffRise;
        const puffR = 3 + puffRise * 0.15;
        const puffAlpha = 0.08 * (1 - puffRise / 35);
        if (puffAlpha > 0.01) {
          g.circle(puffX, puffY, puffR);
          g.fill({ color: 0xccbbaa, alpha: puffAlpha });
          g.circle(puffX + 2, puffY - 1, puffR * 0.7);
          g.fill({ color: 0xddccbb, alpha: puffAlpha * 0.6 });
        }
      }
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // GRAIL CHAPEL — Sacred interior, stained glass, altar, divine light
  // =========================================================================

  private _build_grail_chapel(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Dark interior with golden ambient
    this._drawSkyGradient(g, a, sw, floorY, 8);

    // Vaulted ceiling with ornate pointed arches
    for (let i = 0; i < 5; i++) {
      const cx = sw * (0.1 + i * 0.2);
      g.moveTo(cx - sw * 0.1, floorY * 0.12);
      g.quadraticCurveTo(cx, -floorY * 0.05, cx + sw * 0.1, floorY * 0.12);
      g.stroke({ color: 0x5a5544, width: 6 });
      g.moveTo(cx - sw * 0.1, floorY * 0.12);
      g.quadraticCurveTo(cx, -floorY * 0.04, cx + sw * 0.1, floorY * 0.12);
      g.stroke({ color: 0x6a6554, width: 3 });
      // Rib vault lines converging to keystone
      g.moveTo(cx, floorY * 0.01);
      g.lineTo(cx - sw * 0.08, floorY * 0.12);
      g.stroke({ color: 0x5a5544, width: 2, alpha: 0.5 });
      g.moveTo(cx, floorY * 0.01);
      g.lineTo(cx + sw * 0.08, floorY * 0.12);
      g.stroke({ color: 0x5a5544, width: 2, alpha: 0.5 });
      // Keystone
      g.roundRect(cx - 4, 0, 8, 8, 2);
      g.fill({ color: 0x6a6554 });
    }

    // Stone walls with column details
    const wallY = floorY * 0.12;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x665544 });
    for (let y = wallY + 14; y < floorY; y += 14) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x5a4a3a, width: 0.6, alpha: 0.35 });
    }
    // Block pattern
    let wRow = 0;
    for (let y = wallY; y < floorY; y += 14) {
      const off = (wRow % 2) * 16;
      for (let x = off; x < sw; x += 32) {
        g.moveTo(x, y).lineTo(x, y + 14);
        g.stroke({ color: 0x5a4a3a, width: 0.4, alpha: 0.25 });
      }
      wRow++;
    }

    // Wall columns
    for (const px of [sw * 0.1, sw * 0.3, sw * 0.5, sw * 0.7, sw * 0.9]) {
      g.rect(px - 8, wallY, 16, floorY - wallY);
      g.fill({ color: 0x6a5a48 });
      g.rect(px - 8, wallY, 4, floorY - wallY);
      g.fill({ color: 0x7a6a58, alpha: 0.3 });
      // Capital
      g.rect(px - 10, wallY, 20, 8);
      g.fill({ color: 0x7a6a58 });
      // Base
      g.rect(px - 10, floorY - 8, 20, 8);
      g.fill({ color: 0x7a6a58 });
    }

    // Stained glass windows — richer detail
    const windowXs = [sw * 0.15, sw * 0.38, sw * 0.62, sw * 0.85];
    const windowColors = [
      [0xaa3333, 0x3344aa, 0xddaa33],
      [0x3366cc, 0xdd8833, 0x33aa55],
      [0xcc3355, 0x44aa88, 0xddcc44],
      [0x5533aa, 0xaa4422, 0x44ccaa],
    ];
    for (let i = 0; i < windowXs.length; i++) {
      const wx = windowXs[i];
      const wy = wallY + 16;
      const ww = 34;
      const wh = 68;
      // Frame
      g.rect(wx - ww / 2 - 4, wy - 4, ww + 8, wh + 8);
      g.fill({ color: 0x5a5544 });
      // Pointed top
      g.moveTo(wx - ww / 2 - 4, wy - 4);
      g.quadraticCurveTo(wx, wy - 28, wx + ww / 2 + 4, wy - 4);
      g.fill({ color: 0x5a5544 });
      // Glass background
      g.rect(wx - ww / 2, wy, ww, wh);
      g.fill({ color: 0x222244, alpha: 0.3 });
      // Pointed glass top
      g.moveTo(wx - ww / 2, wy);
      g.quadraticCurveTo(wx, wy - 22, wx + ww / 2, wy);
      g.fill({ color: 0x222244, alpha: 0.2 });
      // Colored glass — 6 sections
      const cols = windowColors[i];
      const secW = ww / 3;
      const secH = wh / 3;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          g.rect(wx - ww / 2 + sx * secW, wy + sy * secH, secW, secH);
          g.fill({ color: cols[sx % cols.length], alpha: 0.15 + (sy === 1 ? 0.05 : 0) });
        }
      }
      // Lead dividers — grid
      for (let d = 1; d < 3; d++) {
        g.moveTo(wx - ww / 2 + d * secW, wy).lineTo(wx - ww / 2 + d * secW, wy + wh);
        g.stroke({ color: 0x5a5544, width: 1.5 });
      }
      for (let d = 1; d < 3; d++) {
        g.moveTo(wx - ww / 2, wy + d * secH).lineTo(wx + ww / 2, wy + d * secH);
        g.stroke({ color: 0x5a5544, width: 1.5 });
      }
      // Rosette at top
      g.circle(wx, wy - 8, 6);
      g.fill({ color: cols[1], alpha: 0.25 });
      g.circle(wx, wy - 8, 6);
      g.stroke({ color: 0x5a5544, width: 1.5 });
      // Light beam from window
      g.moveTo(wx - ww / 2, wy + wh);
      g.lineTo(wx + ww / 2, wy + wh);
      g.lineTo(wx + ww / 2 + 25, floorY);
      g.lineTo(wx - ww / 2 - 12, floorY);
      g.closePath();
      g.fill({ color: a.accentColor, alpha: 0.025 });
    }

    // Pews (rows of benches)
    for (let row = 0; row < 3; row++) {
      const py = floorY * (0.65 + row * 0.08);
      for (const side of [-1, 1]) {
        const px = sw * 0.5 + side * sw * 0.22;
        g.rect(px - 25, py, 50, 6);
        g.fill({ color: 0x5a3a1a });
        // Back rest
        g.rect(px - 25, py - 8, 50, 3);
        g.fill({ color: 0x5a3a1a });
        g.rect(px - 25, py - 8, 1, 8);
        g.fill({ color: 0x4a2a0a });
        g.rect(px + 24, py - 8, 1, 8);
        g.fill({ color: 0x4a2a0a });
      }
    }

    // Central altar with grail — more detailed
    const altarX = sw * 0.5;
    const altarY = floorY - 8;
    // Steps leading up
    g.rect(altarX - 45, altarY - 5, 90, 5);
    g.fill({ color: 0x887766 });
    g.rect(altarX - 38, altarY - 10, 76, 5);
    g.fill({ color: 0x887766 });
    // Altar table
    g.rect(altarX - 30, altarY - 30, 60, 20);
    g.fill({ color: 0x776655 });
    g.rect(altarX - 30, altarY - 30, 60, 20);
    g.stroke({ color: 0x665544, width: 1.5 });
    // Altar front carved panel
    g.rect(altarX - 25, altarY - 28, 50, 16);
    g.fill({ color: 0x6a5a48 });
    // Cross carved into panel
    g.rect(altarX - 1.5, altarY - 27, 3, 12);
    g.fill({ color: 0x887766, alpha: 0.5 });
    g.rect(altarX - 5, altarY - 23, 10, 2);
    g.fill({ color: 0x887766, alpha: 0.5 });
    // Altar cloth with lace edge
    g.rect(altarX - 28, altarY - 30, 56, 6);
    g.fill({ color: 0xeeddcc });
    g.rect(altarX - 28, altarY - 30, 56, 6);
    g.stroke({ color: a.accentColor, width: 1 });
    // Lace edge pattern
    for (let lx = altarX - 26; lx < altarX + 26; lx += 6) {
      g.moveTo(lx + 3, altarY - 24);
      g.arc(lx, altarY - 24, 3, 0, Math.PI);
      g.stroke({ color: 0xeeddcc, width: 0.8, alpha: 0.5 });
    }
    // Grail cup — more ornate
    g.moveTo(altarX - 7, altarY - 38);
    g.lineTo(altarX - 9, altarY - 30);
    g.lineTo(altarX + 9, altarY - 30);
    g.lineTo(altarX + 7, altarY - 38);
    g.closePath();
    g.fill({ color: 0xddaa33 });
    g.stroke({ color: 0xbb8822, width: 1 });
    // Gemstone on cup
    g.circle(altarX, altarY - 34, 2);
    g.fill({ color: 0xcc3333, alpha: 0.6 });
    // Stem
    g.rect(altarX - 2, altarY - 30, 4, 7);
    g.fill({ color: 0xddaa33 });
    // Base
    g.ellipse(altarX, altarY - 23, 7, 2.5);
    g.fill({ color: 0xddaa33 });
    g.ellipse(altarX, altarY - 23, 7, 2.5);
    g.stroke({ color: 0xbb8822, width: 0.8 });
    // Grail divine glow
    for (let r = 25; r > 0; r -= 3) {
      g.circle(altarX, altarY - 35, r);
      g.fill({ color: a.accentColor, alpha: 0.01 });
    }

    // Candles on altar + tall candlesticks
    for (const cx of [altarX - 20, altarX + 20]) {
      g.rect(cx - 1.5, altarY - 38, 3, 8);
      g.fill({ color: 0xeeddcc });
      this._flames.push({ x: cx, y: altarY - 41, baseRadius: 3.5, phase: cx * 0.2 });
    }
    // Tall floor candlesticks
    for (const cx of [altarX - 40, altarX + 40]) {
      g.rect(cx - 2, altarY - 50, 4, 42);
      g.fill({ color: 0x8b7355 });
      g.ellipse(cx, altarY - 8, 5, 2);
      g.fill({ color: 0x8b7355 });
      g.rect(cx - 1.5, altarY - 58, 3, 8);
      g.fill({ color: 0xeeddcc });
      this._flames.push({ x: cx, y: altarY - 61, baseRadius: 4, phase: cx * 0.15 });
    }

    // Incense brazier
    const incX = altarX;
    const incY = altarY - 12;
    g.moveTo(incX - 6, incY);
    g.arc(incX, incY, 6, Math.PI, 0);
    g.fill({ color: 0x8b7355 });
    // Incense smoke particles
    for (let i = 0; i < 8; i++) {
      this._particles.push({
        x: incX + (Math.random() - 0.5) * 5, y: incY - 5 - Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.08, vy: -0.05 - Math.random() * 0.05,
        radius: 1 + Math.random() * 2, alpha: 0.08 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2, color: 0xddddcc,
      });
    }

    // Floor — polished stone tiles with central aisle
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Checkered pattern
    let tRow = 0;
    for (let y = floorY + 2; y < sh; y += 18) {
      for (let x = 0; x < sw; x += 36) {
        if ((Math.floor(x / 36) + tRow) % 2 === 0) {
          g.rect(x, y, 36, 18);
          g.fill({ color: 0x000000, alpha: 0.08 });
        }
      }
      tRow++;
    }
    // Central carpet runner
    g.rect(sw * 0.42, floorY, sw * 0.16, sh - floorY);
    g.fill({ color: 0x882222, alpha: 0.1 });

    // Dust/light particles
    for (let i = 0; i < 14; i++) {
      this._particles.push({
        x: Math.random() * sw, y: wallY + Math.random() * (floorY - wallY),
        vx: (Math.random() - 0.5) * 0.05, vy: 0.03 + Math.random() * 0.05,
        radius: 0.5 + Math.random() * 1, alpha: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    g.rect(0, floorY * 0.4, sw, floorY * 0.6);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Open holy book on the altar ---
    const bookX = sw * 0.5 + 12;
    const bookY = floorY - 32;
    // Left page
    g.rect(bookX - 10, bookY, 9, 7);
    g.fill({ color: 0xeeddcc });
    g.rect(bookX - 10, bookY, 9, 7);
    g.stroke({ color: 0xccbb99, width: 0.5 });
    // Right page
    g.rect(bookX + 1, bookY, 9, 7);
    g.fill({ color: 0xeeddcc });
    g.rect(bookX + 1, bookY, 9, 7);
    g.stroke({ color: 0xccbb99, width: 0.5 });
    // Spine
    g.rect(bookX - 1, bookY - 0.5, 2, 8);
    g.fill({ color: 0x6a3a1a });
    // Text lines (left page)
    for (let tl = 0; tl < 4; tl++) {
      g.moveTo(bookX - 9, bookY + 1.5 + tl * 1.5);
      g.lineTo(bookX - 2, bookY + 1.5 + tl * 1.5);
      g.stroke({ color: 0x886644, width: 0.3, alpha: 0.25 });
    }
    // Text lines (right page)
    for (let tl = 0; tl < 4; tl++) {
      g.moveTo(bookX + 2, bookY + 1.5 + tl * 1.5);
      g.lineTo(bookX + 9, bookY + 1.5 + tl * 1.5);
      g.stroke({ color: 0x886644, width: 0.3, alpha: 0.25 });
    }
    // Illuminated letter on left page
    g.rect(bookX - 9, bookY + 1, 2, 2);
    g.fill({ color: 0xcc3333, alpha: 0.2 });

    // --- Scattered prayer beads on the pew ---
    const beadPewY = floorY * 0.65;
    const beadBaseX = sw * 0.5 + sw * 0.22 - 10;
    for (let bi = 0; bi < 10; bi++) {
      const bAngle = bi * 0.6 + 0.3;
      const bRad = 6 + bi * 0.8;
      const bx = beadBaseX + Math.cos(bAngle) * bRad;
      const by = beadPewY - 3 + Math.sin(bAngle) * 2;
      g.circle(bx, by, 1);
      g.fill({ color: 0x554433, alpha: 0.35 });
    }
    // Connecting thread
    g.moveTo(beadBaseX + Math.cos(0.3) * 6, beadPewY - 3 + Math.sin(0.3) * 2);
    for (let bi = 1; bi < 10; bi++) {
      const bAngle = bi * 0.6 + 0.3;
      const bRad = 6 + bi * 0.8;
      g.lineTo(beadBaseX + Math.cos(bAngle) * bRad, beadPewY - 3 + Math.sin(bAngle) * 2);
    }
    g.stroke({ color: 0x554433, width: 0.4, alpha: 0.2 });
    // Cross at end of beads
    const crossBx = beadBaseX + Math.cos(9 * 0.6 + 0.3) * (6 + 9 * 0.8) + 3;
    const crossBy = beadPewY - 2;
    g.rect(crossBx - 1, crossBy - 3, 2, 5);
    g.fill({ color: 0x665544, alpha: 0.3 });
    g.rect(crossBx - 2, crossBy - 1, 4, 1.5);
    g.fill({ color: 0x665544, alpha: 0.3 });

    // --- Ornate floor mosaic pattern (geometric shapes in the checkered floor center) ---
    const mosaicCX = sw * 0.5;
    const mosaicCY = floorY + 20;
    // Outer circle border
    g.circle(mosaicCX, mosaicCY, 22);
    g.stroke({ color: 0xddaa33, width: 1.5, alpha: 0.12 });
    // Inner circle
    g.circle(mosaicCX, mosaicCY, 15);
    g.stroke({ color: 0xddaa33, width: 1, alpha: 0.1 });
    // Diamond/cross pattern
    g.moveTo(mosaicCX, mosaicCY - 18);
    g.lineTo(mosaicCX + 18, mosaicCY);
    g.lineTo(mosaicCX, mosaicCY + 18);
    g.lineTo(mosaicCX - 18, mosaicCY);
    g.closePath();
    g.stroke({ color: 0xddaa33, width: 1, alpha: 0.1 });
    // Colored tiles inside
    const mosaicColors = [0xaa3333, 0x3355aa, 0xddaa33, 0x33aa55];
    for (let mi = 0; mi < 8; mi++) {
      const mAngle = (mi / 8) * Math.PI * 2;
      const mx = mosaicCX + Math.cos(mAngle) * 10;
      const my = mosaicCY + Math.sin(mAngle) * 10;
      g.circle(mx, my, 2.5);
      g.fill({ color: mosaicColors[mi % mosaicColors.length], alpha: 0.08 });
    }
    // Center star
    g.circle(mosaicCX, mosaicCY, 4);
    g.fill({ color: 0xddaa33, alpha: 0.1 });

    // --- Hanging censer/incense holder ---
    const censerX = sw * 0.5;
    const censerY = floorY * 0.25;
    // Chain links going up to ceiling
    for (let ci = 0; ci < 5; ci++) {
      const cy = censerY - 12 - ci * 6;
      g.ellipse(censerX, cy, 1.5, 3);
      g.stroke({ color: 0x8b7355, width: 1, alpha: 0.35 });
    }
    // Censer body (ornate ball shape)
    g.circle(censerX, censerY, 6);
    g.fill({ color: 0x8b7355, alpha: 0.5 });
    g.circle(censerX, censerY, 6);
    g.stroke({ color: 0x7a6244, width: 1, alpha: 0.4 });
    // Ornate band around middle
    g.ellipse(censerX, censerY, 7, 2);
    g.stroke({ color: 0xddaa33, width: 0.8, alpha: 0.25 });
    // Holes in censer (for smoke)
    g.circle(censerX - 3, censerY - 1, 1);
    g.fill({ color: 0x443322, alpha: 0.3 });
    g.circle(censerX + 3, censerY - 1, 1);
    g.fill({ color: 0x443322, alpha: 0.3 });
    g.circle(censerX, censerY + 2, 1);
    g.fill({ color: 0x443322, alpha: 0.3 });
    // Bottom finial
    g.circle(censerX, censerY + 7, 2);
    g.fill({ color: 0x8b7355, alpha: 0.4 });

    // --- Unique critter: moth drawn to the candle light ---
    this._critters.push({
      x: sw * 0.5, y: floorY * 0.35, baseX: sw * 0.5, baseY: floorY * 0.35,
      phase: 0, type: "moth", dir: 1, speed: 0, state: 0,
    });
    this._critters.push({
      x: sw * 0.35, y: floorY * 0.4, baseX: sw * 0.35, baseY: floorY * 0.4,
      phase: 1.8, type: "moth", dir: 1, speed: 0, state: 0,
    });
  }

  private _update_grail_chapel(time: number): void {
    const g = this._animGfx;
    // Candle flames
    for (const f of this._flames) {
      const flicker = Math.sin(time * 8 + f.phase) * 1.5;
      const flicker2 = Math.cos(time * 11 + f.phase * 1.5) * 1;
      g.ellipse(f.x + flicker2 * 0.3, f.y - flicker * 0.3, f.baseRadius * 0.7, f.baseRadius + 1.5 + flicker);
      g.fill({ color: 0xff8833, alpha: 0.6 });
      g.ellipse(f.x, f.y, f.baseRadius * 0.4, f.baseRadius * 0.7 + flicker * 0.3);
      g.fill({ color: 0xffdd44, alpha: 0.9 });
      g.circle(f.x, f.y + 1, 1.5);
      g.fill({ color: 0xffffcc, alpha: 0.9 });
    }
    // Dust motes + incense smoke
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.4 + p.phase) * 0.08;
      p.y += p.vy;
      if (p.y > this._floorY) { p.y = this._floorY * 0.12; }
      if (p.y < 0) { p.y = this._floorY * 0.5; }
      const pulse = p.alpha * (0.3 + Math.sin(time * 1.5 + p.phase) * 0.5);
      if (p.color === 0xddddcc) {
        // Incense — larger, more diffuse
        g.circle(p.x, p.y, p.radius + 2);
        g.fill({ color: p.color, alpha: pulse * 0.3 });
      } else {
        g.circle(p.x, p.y, p.radius);
        g.fill({ color: 0xffffff, alpha: pulse });
      }
    }
    // Grail glow pulse
    const altarX = this._sw * 0.5;
    const altarY = this._floorY - 8;
    const pulse = 0.06 + Math.sin(time * 1.2) * 0.03;
    g.circle(altarX, altarY - 35, 20);
    g.fill({ color: 0xffee88, alpha: pulse });
    g.circle(altarX, altarY - 35, 10);
    g.fill({ color: 0xffffcc, alpha: pulse * 0.8 });

    // --- Swaying incense smoke (thin wispy curves rising) ---
    const censerAnimX = this._sw * 0.5;
    const censerAnimY = this._floorY * 0.25;
    for (let si = 0; si < 4; si++) {
      const sPhase = time * 0.5 + si * 1.3;
      const sRise = (sPhase * 6) % 45;
      const sBaseX = censerAnimX + (si - 1.5) * 3;
      const sY1 = censerAnimY - 8 - sRise;
      const sY2 = sY1 - 12;
      const sSway = Math.sin(sPhase * 1.8) * 8 + Math.cos(sPhase * 0.7) * 4;
      const sAlpha = 0.06 * (1 - sRise / 45);
      if (sAlpha > 0.005) {
        g.moveTo(sBaseX, sY1);
        g.quadraticCurveTo(sBaseX + sSway, (sY1 + sY2) / 2, sBaseX + sSway * 1.2, sY2);
        g.stroke({ color: 0xccccbb, width: 2.5, alpha: sAlpha });
        g.moveTo(sBaseX + 1, sY1 + 2);
        g.quadraticCurveTo(sBaseX + sSway * 0.8 + 2, (sY1 + sY2) / 2, sBaseX + sSway * 1.1 + 2, sY2 + 3);
        g.stroke({ color: 0xddddcc, width: 1.5, alpha: sAlpha * 0.5 });
      }
    }

    // --- Stained glass light color shifting (colored light patches on floor cycling hue) ---
    const windowXPositions = [this._sw * 0.15, this._sw * 0.38, this._sw * 0.62, this._sw * 0.85];
    const sgColors = [0xaa3333, 0x3355aa, 0xddaa33, 0x33aa55, 0xcc3366, 0x44aacc];
    for (let wi = 0; wi < windowXPositions.length; wi++) {
      const sgPhase = time * 0.3 + wi * 1.5;
      const colorIdx = Math.floor((sgPhase * 0.5) % sgColors.length);
      const nextColorIdx = (colorIdx + 1) % sgColors.length;
      const sgAlpha = 0.025 + Math.sin(sgPhase * 0.8) * 0.01;
      const wx = windowXPositions[wi];
      // Colored light patch on floor
      g.ellipse(wx + 8, this._floorY + 6, 20, 6);
      g.fill({ color: sgColors[colorIdx], alpha: sgAlpha });
      g.ellipse(wx + 8, this._floorY + 6, 14, 4);
      g.fill({ color: sgColors[nextColorIdx], alpha: sgAlpha * 0.5 });
    }

    // --- Flickering prayer candle row (small flames along the pews) ---
    const pewYPositions = [this._floorY * 0.65, this._floorY * 0.73, this._floorY * 0.81];
    for (let pr = 0; pr < pewYPositions.length; pr++) {
      for (const side of [-1, 1]) {
        const pcx = this._sw * 0.5 + side * this._sw * 0.22 + side * 20;
        const pcy = pewYPositions[pr] - 10;
        const pcFlicker = Math.sin(time * 7 + pr * 2.5 + side * 1.3) * 1.2;
        const pcAlpha = 0.35 + Math.sin(time * 5 + pr + side) * 0.15;
        // Tiny candle
        g.rect(pcx - 0.8, pcy, 1.6, 3);
        g.fill({ color: 0xeeddcc, alpha: 0.4 });
        // Flame
        g.ellipse(pcx, pcy - 1 - pcFlicker * 0.2, 1.2, 2 + pcFlicker * 0.3);
        g.fill({ color: 0xff8833, alpha: pcAlpha * 0.5 });
        g.ellipse(pcx, pcy - 0.5, 0.6, 1 + pcFlicker * 0.1);
        g.fill({ color: 0xffdd44, alpha: pcAlpha * 0.7 });
        // Warm glow
        g.circle(pcx, pcy - 1, 5);
        g.fill({ color: 0xffcc44, alpha: 0.015 + Math.sin(time * 6 + pr * 3) * 0.005 });
      }
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // CORNWALL COAST — Sunny coastal beach, waves, cliffs, lighthouse
  // =========================================================================

  private _build_cornwall(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Bright fluffy clouds — multiple layers
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 6; i++) {
        const cx = sw * (0.06 + i * 0.17 + layer * 0.08);
        const cy = floorY * (0.08 + layer * 0.05 + Math.sin(i * 1.8 + layer) * 0.04);
        for (let j = 0; j < 3; j++) {
          g.ellipse(cx + j * 16 - 16, cy + j * 3, 22 + j * 5, 10 + j * 2);
          g.fill({ color: 0xffffff, alpha: 0.18 - j * 0.04 - layer * 0.04 });
        }
      }
    }

    // Sun with rays
    const sunX = sw * 0.82;
    const sunY = floorY * 0.1;
    // Rays
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      g.moveTo(sunX + Math.cos(angle) * 20, sunY + Math.sin(angle) * 20);
      g.lineTo(sunX + Math.cos(angle) * 55, sunY + Math.sin(angle) * 55);
      g.stroke({ color: 0xffee88, width: 1.5, alpha: 0.04 });
    }
    for (let r = 55; r > 0; r -= 4) {
      g.circle(sunX, sunY, r);
      g.fill({ color: 0xffdd88, alpha: 0.006 });
    }
    g.circle(sunX, sunY, 18);
    g.fill({ color: 0xffee99, alpha: 0.7 });
    g.circle(sunX, sunY, 12);
    g.fill({ color: 0xffffff, alpha: 0.3 });

    // Ocean — layered colors
    const seaY = floorY * 0.48;
    // Horizon line haze
    g.rect(0, seaY - 5, sw, 10);
    g.fill({ color: 0xaabbcc, alpha: 0.1 });
    // Main ocean
    g.rect(0, seaY, sw, floorY - seaY);
    g.fill({ color: 0x3366aa });
    g.rect(0, seaY, sw, 3);
    g.fill({ color: 0x5588cc, alpha: 0.5 });
    // Depth layers
    g.rect(0, seaY + (floorY - seaY) * 0.3, sw, (floorY - seaY) * 0.3);
    g.fill({ color: 0x225588, alpha: 0.2 });
    g.rect(0, seaY + (floorY - seaY) * 0.6, sw, (floorY - seaY) * 0.4);
    g.fill({ color: 0x1a4466, alpha: 0.15 });
    // Sun reflection on water
    g.moveTo(sunX - 30, seaY + 5);
    g.lineTo(sunX + 30, seaY + 5);
    g.lineTo(sunX + 15, seaY + 40);
    g.lineTo(sunX - 15, seaY + 40);
    g.closePath();
    g.fill({ color: 0xffee88, alpha: 0.05 });

    // Distant sailing ship
    const shipX = sw * 0.55;
    const shipY = seaY + 15;
    // Hull
    g.moveTo(shipX - 10, shipY);
    g.lineTo(shipX - 8, shipY + 4);
    g.lineTo(shipX + 8, shipY + 4);
    g.lineTo(shipX + 10, shipY);
    g.closePath();
    g.fill({ color: 0x4a3a2a, alpha: 0.5 });
    // Mast
    g.moveTo(shipX, shipY);
    g.lineTo(shipX, shipY - 15);
    g.stroke({ color: 0x4a3a2a, width: 1, alpha: 0.5 });
    // Sail
    g.moveTo(shipX, shipY - 14);
    g.lineTo(shipX + 8, shipY - 8);
    g.lineTo(shipX, shipY - 3);
    g.closePath();
    g.fill({ color: 0xeeeedd, alpha: 0.4 });

    // Lighthouse on cliff (right) — more detailed
    const lhX = sw * 0.9;
    const lhCliffY = seaY + 18;
    // Cliff with layers
    g.moveTo(lhX - 35, floorY * 0.8);
    g.lineTo(lhX - 25, lhCliffY);
    g.lineTo(lhX + 28, lhCliffY + 3);
    g.lineTo(lhX + 40, floorY * 0.8);
    g.closePath();
    g.fill({ color: 0x667766 });
    // Cliff face strata
    for (let y = lhCliffY + 5; y < floorY * 0.8; y += 8) {
      g.moveTo(lhX - 30, y);
      g.lineTo(lhX + 35, y + 2);
      g.stroke({ color: 0x556655, width: 0.6, alpha: 0.3 });
    }
    // Lighthouse tower — tapered
    g.moveTo(lhX - 6, lhCliffY);
    g.lineTo(lhX - 4, lhCliffY - 52);
    g.lineTo(lhX + 4, lhCliffY - 52);
    g.lineTo(lhX + 6, lhCliffY);
    g.closePath();
    g.fill({ color: 0xeeeedd });
    // Red stripes
    g.rect(lhX - 5, lhCliffY - 38, 10, 10);
    g.fill({ color: 0xcc3333 });
    g.rect(lhX - 5, lhCliffY - 18, 10, 10);
    g.fill({ color: 0xcc3333 });
    // Lamp room
    g.rect(lhX - 7, lhCliffY - 58, 14, 8);
    g.fill({ color: 0xffee88, alpha: 0.6 });
    g.rect(lhX - 7, lhCliffY - 58, 14, 8);
    g.stroke({ color: 0x333333, width: 1 });
    // Window panes
    g.moveTo(lhX, lhCliffY - 58);
    g.lineTo(lhX, lhCliffY - 50);
    g.stroke({ color: 0x333333, width: 0.8 });
    // Roof
    g.moveTo(lhX - 8, lhCliffY - 58);
    g.lineTo(lhX, lhCliffY - 65);
    g.lineTo(lhX + 8, lhCliffY - 58);
    g.closePath();
    g.fill({ color: 0x444444 });
    // Light beam
    this._flames.push({ x: lhX, y: lhCliffY - 54, baseRadius: 5, phase: 0 });

    // Coastal cliffs (left) — larger, more detail
    g.moveTo(-15, floorY * 0.55);
    g.lineTo(-15, seaY + 8);
    g.lineTo(sw * 0.1, seaY + 3);
    g.lineTo(sw * 0.16, seaY + 12);
    g.lineTo(sw * 0.22, floorY * 0.7);
    g.lineTo(sw * 0.2, floorY);
    g.lineTo(-15, floorY);
    g.closePath();
    g.fill({ color: 0x778877 });
    // Cliff face detail
    for (let y = seaY + 12; y < floorY; y += 8) {
      g.moveTo(0, y).lineTo(sw * 0.15, y + 2);
      g.stroke({ color: 0x667766, width: 0.6, alpha: 0.3 });
    }
    // Grass on cliff top
    for (let x = 0; x < sw * 0.12; x += 6) {
      g.moveTo(x, seaY + 5 + x * 0.2);
      g.lineTo(x + 1, seaY + 1 + x * 0.2);
      g.stroke({ color: 0x558844, width: 1, alpha: 0.5 });
    }

    // Rock pools (foreground, near shore)
    for (const rpx of [sw * 0.3, sw * 0.5, sw * 0.7]) {
      g.ellipse(rpx, floorY + 3, 10, 4);
      g.fill({ color: 0x336699, alpha: 0.2 });
      g.ellipse(rpx, floorY + 3, 10, 4);
      g.stroke({ color: 0x667766, width: 1, alpha: 0.3 });
    }

    // Beach / sand ground
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });
    // Sand texture
    for (let i = 0; i < 25; i++) {
      const sx = Math.sin(i * 7.7) * sw * 0.45 + sw * 0.5;
      g.ellipse(sx, floorY + 4 + (i % 4) * 3, 4 + i % 3, 1.5);
      g.fill({ color: a.groundHighlight, alpha: 0.12 });
    }
    // Driftwood
    g.moveTo(sw * 0.4, floorY + 5);
    g.lineTo(sw * 0.48, floorY + 3);
    g.stroke({ color: 0x8a7a5a, width: 3, cap: "round" });
    g.moveTo(sw * 0.42, floorY + 4);
    g.lineTo(sw * 0.44, floorY + 2);
    g.stroke({ color: 0x8a7a5a, width: 1.5, cap: "round" });
    // Shells
    for (let i = 0; i < 8; i++) {
      const sx = sw * (0.12 + i * 0.11);
      g.ellipse(sx, floorY + 4, 3, 2);
      g.fill({ color: 0xeeddcc, alpha: 0.4 });
    }
    // Seaweed
    for (let i = 0; i < 4; i++) {
      const sx = sw * (0.25 + i * 0.18);
      g.moveTo(sx, floorY + 2);
      g.quadraticCurveTo(sx + 3, floorY - 3, sx + 6, floorY + 1);
      g.stroke({ color: 0x336633, width: 1.5, alpha: 0.3 });
    }

    // Beach grass tufts
    for (const bx of [sw * 0.08, sw * 0.18]) {
      for (let b = 0; b < 5; b++) {
        g.moveTo(bx + b * 2, floorY);
        g.lineTo(bx + b * 2 + (b - 2) * 2, floorY - 8 - b);
        g.stroke({ color: 0x88aa55, width: 0.8, alpha: 0.5 });
      }
    }

    // Wave ripples
    for (let i = 0; i < 10; i++) {
      this._ripples.push({
        y: seaY + 4 + i * 5, amplitude: 1.5 + Math.random() * 2,
        frequency: 0.03 + Math.random() * 0.02, speed: 0.8 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2, alpha: 0.1 + Math.random() * 0.08,
      });
    }
    // Seagulls
    for (let i = 0; i < 8; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * (0.12 + Math.random() * 0.25),
        vx: 0.3 + Math.random() * 0.4, vy: Math.sin(i) * 0.1,
        radius: 1.5, alpha: 0.5, phase: Math.random() * Math.PI * 2, color: 0xffffff,
      });
    }
    g.rect(0, floorY * 0.55, sw, floorY * 0.45);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha * 0.4 });
    // --- Colorful beach umbrellas stuck in sand ---
    const umbrellaPositions = [
      { x: sw * 0.32, color: 0xff4455 },
      { x: sw * 0.58, color: 0x44aaff },
    ];
    for (const umb of umbrellaPositions) {
      // Pole
      g.moveTo(umb.x, floorY + 6);
      g.lineTo(umb.x, floorY - 28);
      g.stroke({ color: 0x888888, width: 2 });
      // Umbrella canopy (semi-circle)
      g.moveTo(umb.x - 18, floorY - 28);
      g.arc(umb.x, floorY - 28, 18, Math.PI, 0);
      g.closePath();
      g.fill({ color: umb.color, alpha: 0.6 });
      // Stripe
      g.moveTo(umb.x - 12, floorY - 28);
      g.arc(umb.x, floorY - 28, 12, Math.PI, 0);
      g.closePath();
      g.fill({ color: 0xffffff, alpha: 0.15 });
    }

    // --- Sandcastle with flag ---
    const castleX = sw * 0.44;
    const castleY = floorY + 2;
    // Base block
    g.rect(castleX - 10, castleY - 12, 20, 12);
    g.fill({ color: 0xddcc88, alpha: 0.7 });
    // Top block
    g.rect(castleX - 6, castleY - 18, 12, 6);
    g.fill({ color: 0xddcc88, alpha: 0.65 });
    // Turret
    g.rect(castleX - 3, castleY - 23, 6, 5);
    g.fill({ color: 0xddcc88, alpha: 0.6 });
    // Crenellations
    g.rect(castleX - 3, castleY - 25, 2, 2);
    g.fill({ color: 0xddcc88, alpha: 0.6 });
    g.rect(castleX + 1, castleY - 25, 2, 2);
    g.fill({ color: 0xddcc88, alpha: 0.6 });
    // Flag on top
    g.moveTo(castleX, castleY - 25);
    g.lineTo(castleX, castleY - 33);
    g.stroke({ color: 0x7a6a4a, width: 1 });
    g.moveTo(castleX, castleY - 33);
    g.lineTo(castleX + 7, castleY - 31);
    g.lineTo(castleX, castleY - 29);
    g.closePath();
    g.fill({ color: 0xff3344, alpha: 0.6 });

    // --- Tide pools with starfish and anemones ---
    const tidePools = [
      { x: sw * 0.36, y: floorY + 5 },
      { x: sw * 0.64, y: floorY + 4 },
    ];
    for (const tp of tidePools) {
      // Water puddle
      g.ellipse(tp.x, tp.y, 14, 5);
      g.fill({ color: 0x3388aa, alpha: 0.25 });
      g.ellipse(tp.x, tp.y, 14, 5);
      g.stroke({ color: 0x667766, width: 0.8, alpha: 0.25 });
      // Starfish
      for (let arm = 0; arm < 5; arm++) {
        const sa = (arm / 5) * Math.PI * 2 - Math.PI / 2;
        g.moveTo(tp.x - 4, tp.y);
        g.lineTo(tp.x - 4 + Math.cos(sa) * 4, tp.y + Math.sin(sa) * 3);
        g.stroke({ color: 0xff6644, width: 1.5, alpha: 0.4 });
      }
      // Anemone (small colored blobs)
      g.circle(tp.x + 6, tp.y - 1, 2);
      g.fill({ color: 0xcc55cc, alpha: 0.35 });
      g.circle(tp.x + 6, tp.y - 1, 1);
      g.fill({ color: 0xff88ff, alpha: 0.25 });
    }

    // --- Message in a bottle on shore ---
    const bottleX = sw * 0.52;
    const bottleY = floorY + 3;
    // Bottle body
    g.ellipse(bottleX, bottleY, 4, 2);
    g.fill({ color: 0x88cc88, alpha: 0.4 });
    g.ellipse(bottleX, bottleY, 4, 2);
    g.stroke({ color: 0x66aa66, width: 0.8, alpha: 0.3 });
    // Bottle neck
    g.rect(bottleX + 3, bottleY - 2, 3, 2);
    g.fill({ color: 0x88cc88, alpha: 0.35 });
    // Cork
    g.rect(bottleX + 6, bottleY - 2, 1.5, 2);
    g.fill({ color: 0xaa8855, alpha: 0.4 });

    // --- Fishing net draped over rocks ---
    for (const rpx of [sw * 0.3, sw * 0.7]) {
      for (let nx = -8; nx <= 8; nx += 4) {
        // Vertical net lines
        g.moveTo(rpx + nx, floorY - 2);
        g.quadraticCurveTo(rpx + nx + 1, floorY + 4, rpx + nx - 1, floorY + 8);
        g.stroke({ color: 0x887766, width: 0.6, alpha: 0.25 });
      }
      for (let ny = 0; ny < 3; ny++) {
        // Horizontal net lines
        g.moveTo(rpx - 8, floorY + ny * 4);
        g.lineTo(rpx + 8, floorY + ny * 4 + 1);
        g.stroke({ color: 0x887766, width: 0.6, alpha: 0.2 });
      }
    }

    // --- Unique critter: crabs skittering across the sand ---
    this._critters.push({
      x: sw * 0.25, y: floorY + 10, baseX: sw * 0.3, baseY: floorY + 10,
      phase: 0, type: "crab", dir: 1, speed: 0.3, state: 0,
    });
    this._critters.push({
      x: sw * 0.7, y: floorY + 15, baseX: sw * 0.65, baseY: floorY + 15,
      phase: 1.5, type: "crab", dir: -1, speed: 0.25, state: 0,
    });
  }

  private _update_cornwall(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Ocean waves
    for (const r of this._ripples) {
      g.moveTo(0, r.y);
      for (let x = 0; x < sw; x += 4) {
        g.lineTo(x, r.y + Math.sin(x * r.frequency + time * r.speed + r.phase) * r.amplitude);
      }
      g.stroke({ color: 0x88bbdd, width: 1, alpha: r.alpha * (0.7 + Math.sin(time * 0.5 + r.phase) * 0.3) });
    }
    // Wave foam
    const seaY = this._floorY * 0.48;
    for (let i = 0; i < 4; i++) {
      const fy = seaY + 8 + i * 12;
      for (let x = 0; x < sw; x += 45) {
        const fx = x + Math.sin(time * (1 + i * 0.3) + x * 0.01) * 15;
        g.moveTo(fx, fy);
        g.lineTo(fx + 12, fy - 1);
        g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.1 + Math.sin(time * 2 + i) * 0.04 });
      }
    }
    // Shore wash
    const washY = this._floorY - 3;
    const washPhase = (Math.sin(time * 0.5) + 1) * 0.5;
    g.moveTo(sw * 0.15, washY + 3);
    for (let x = sw * 0.15; x < sw * 0.85; x += 8) {
      g.lineTo(x, washY + 3 - washPhase * 4 + Math.sin(x * 0.08 + time * 2) * 1);
    }
    g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.08 * washPhase });
    // Seagulls — V shapes
    for (const p of this._particles) {
      p.x += p.vx;
      p.y += p.vy + Math.sin(time * 2 + p.phase) * 0.15;
      if (p.x > sw + 20) { p.x = -20; p.y = this._floorY * (0.12 + Math.random() * 0.2); }
      const wingFlap = Math.sin(time * 6 + p.phase) * 2;
      g.moveTo(p.x - 5, p.y + wingFlap);
      g.lineTo(p.x, p.y);
      g.lineTo(p.x + 5, p.y + wingFlap);
      g.stroke({ color: 0xffffff, width: 1.2, alpha: p.alpha });
    }
    // Lighthouse beam sweep
    for (const f of this._flames) {
      const beamAngle = time * 0.5;
      const bx = f.x + Math.cos(beamAngle) * 40;
      const by = f.y + Math.sin(beamAngle) * 20;
      g.moveTo(f.x, f.y);
      g.lineTo(bx, by);
      g.stroke({ color: 0xffee88, width: 3, alpha: 0.06 });
      g.circle(f.x, f.y, 6 + Math.sin(time * 3) * 1);
      g.fill({ color: 0xffee88, alpha: 0.3 });
    }

    // --- Cloud shadows drifting across the beach ---
    for (let cs = 0; cs < 3; cs++) {
      const csPhase = time * 0.08 + cs * 2.5;
      const csX = ((csPhase * 40 + cs * sw * 0.35) % (sw + 120)) - 60;
      const csY = this._floorY * 0.6 + cs * 18 + Math.sin(time * 0.2 + cs) * 8;
      g.ellipse(csX, csY, 60 + cs * 15, 18 + cs * 4);
      g.fill({ color: 0x000000, alpha: 0.03 + Math.sin(time * 0.3 + cs) * 0.01 });
    }

    // --- Bobbing distant ship on waves ---
    {
      const shipX = sw * 0.65;
      const shipBaseY = seaY + 6;
      const shipBob = Math.sin(time * 0.8) * 2;
      const shipRock = Math.sin(time * 0.6) * 0.04;
      const sy = shipBaseY + shipBob;
      // Hull
      g.moveTo(shipX - 8, sy);
      g.quadraticCurveTo(shipX - 10, sy + 3, shipX - 6, sy + 4);
      g.lineTo(shipX + 6, sy + 4);
      g.quadraticCurveTo(shipX + 10, sy + 3, shipX + 8, sy);
      g.closePath();
      g.fill({ color: 0x4a3a2a, alpha: 0.4 });
      // Mast
      g.moveTo(shipX, sy);
      g.lineTo(shipX + shipRock * 20, sy - 12);
      g.stroke({ color: 0x5a4a3a, width: 1, alpha: 0.35 });
      // Sail
      g.moveTo(shipX + shipRock * 20, sy - 12);
      g.lineTo(shipX + 5 + shipRock * 10, sy - 4);
      g.lineTo(shipX + shipRock * 15, sy - 3);
      g.closePath();
      g.fill({ color: 0xeeddcc, alpha: 0.25 });
    }

    // --- Beach flag/pennant fluttering ---
    {
      const flagX = sw * 0.44;
      const flagY = this._floorY - 28;
      const flutter = Math.sin(time * 4) * 3 + Math.sin(time * 7) * 1.5;
      const flutter2 = Math.sin(time * 4.5 + 0.5) * 2;
      g.moveTo(flagX + 7, flagY - 5);
      g.quadraticCurveTo(flagX + 7 + flutter * 0.5, flagY - 3 + flutter2 * 0.3, flagX + 7 + flutter, flagY - 1);
      g.stroke({ color: 0xff3344, width: 1.5, alpha: 0.4 });
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // SHADOW KEEP — Ultra dark fortress, purple runes, floating chains, dark fog
  // =========================================================================

  private _build_shadow_keep(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Near-black background
    this._drawSkyGradient(g, a, sw, floorY, 8);

    // Barely visible distant towers/turrets through darkness
    for (const tx of [sw * 0.15, sw * 0.4, sw * 0.6, sw * 0.85]) {
      const th = 40 + Math.sin(tx * 0.1) * 15;
      g.rect(tx - 8, floorY * 0.06 - th, 16, th);
      g.fill({ color: 0x060610, alpha: 0.5 });
      // Turret top
      g.moveTo(tx - 10, floorY * 0.06 - th);
      g.lineTo(tx, floorY * 0.06 - th - 10);
      g.lineTo(tx + 10, floorY * 0.06 - th);
      g.closePath();
      g.fill({ color: 0x060610, alpha: 0.5 });
    }

    // Massive dark fortress wall
    const wallY = floorY * 0.15;
    g.rect(0, wallY, sw, floorY - wallY);
    g.fill({ color: 0x0a0a18 });
    // Stone lines
    for (let y = wallY + 18; y < floorY; y += 18) {
      g.moveTo(0, y).lineTo(sw, y);
      g.stroke({ color: 0x0e0e20, width: 0.7, alpha: 0.5 });
    }
    let kRow = 0;
    for (let y = wallY; y < floorY; y += 18) {
      const off = (kRow % 2) * 22;
      for (let x = off; x < sw; x += 44) {
        g.moveTo(x, y).lineTo(x, y + 18);
        g.stroke({ color: 0x0e0e20, width: 0.4, alpha: 0.3 });
      }
      kRow++;
    }

    // Portcullis (center back)
    const portX = sw * 0.5;
    const portY = wallY + 10;
    const portW = 50;
    const portH = floorY - portY - 5;
    g.roundRect(portX - portW / 2 - 4, portY - 4, portW + 8, portH + 4, 3);
    g.fill({ color: 0x080818 });
    // Iron bars (vertical)
    for (let x = portX - portW / 2 + 5; x < portX + portW / 2; x += 8) {
      g.moveTo(x, portY);
      g.lineTo(x, portY + portH);
      g.stroke({ color: 0x333344, width: 2 });
    }
    // Iron bars (horizontal)
    for (let y = portY + 10; y < portY + portH; y += 12) {
      g.moveTo(portX - portW / 2, y);
      g.lineTo(portX + portW / 2, y);
      g.stroke({ color: 0x333344, width: 1.5 });
    }
    // Darkness beyond
    g.rect(portX - portW / 2, portY, portW, portH);
    g.fill({ color: 0x020208, alpha: 0.6 });

    // Massive pillars with gargoyles
    for (const px of [sw * 0.08, sw * 0.28, sw * 0.72, sw * 0.92]) {
      g.rect(px - 16, wallY, 32, floorY - wallY);
      g.fill({ color: 0x0c0c1a });
      g.rect(px - 16, wallY, 6, floorY - wallY);
      g.fill({ color: 0x0e0e1e, alpha: 0.5 });
      // Capital
      g.rect(px - 18, wallY, 36, 14);
      g.fill({ color: 0x101028 });
      // Base
      g.rect(px - 18, floorY - 14, 36, 14);
      g.fill({ color: 0x101028 });
      // Gargoyle
      g.circle(px, wallY + 22, 7);
      g.fill({ color: 0x151530 });
      g.circle(px - 2.5, wallY + 20, 1.5);
      g.fill({ color: a.accentColor, alpha: 0.3 });
      g.circle(px + 2.5, wallY + 20, 1.5);
      g.fill({ color: a.accentColor, alpha: 0.3 });
      // Wing-like protrusions
      g.moveTo(px - 7, wallY + 22);
      g.lineTo(px - 14, wallY + 18);
      g.stroke({ color: 0x151530, width: 2 });
      g.moveTo(px + 7, wallY + 22);
      g.lineTo(px + 14, wallY + 18);
      g.stroke({ color: 0x151530, width: 2 });
    }

    // Glowing rune circles — more ornate
    const runeXs = [sw * 0.18, sw * 0.38, sw * 0.62, sw * 0.82];
    for (let i = 0; i < runeXs.length; i++) {
      const rx = runeXs[i];
      const ry = wallY + (floorY - wallY) * 0.4;
      // Outer circle
      g.circle(rx, ry, 16);
      g.stroke({ color: a.accentColor, width: 1.5, alpha: 0.2 });
      // Middle circle
      g.circle(rx, ry, 11);
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.15 });
      // Inner rune (triangle + inverted triangle = star)
      g.moveTo(rx, ry - 9);
      g.lineTo(rx - 8, ry + 5);
      g.lineTo(rx + 8, ry + 5);
      g.closePath();
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.25 });
      g.moveTo(rx, ry + 9);
      g.lineTo(rx - 8, ry - 5);
      g.lineTo(rx + 8, ry - 5);
      g.closePath();
      g.stroke({ color: a.accentColor, width: 1, alpha: 0.2 });
      // Center eye
      g.circle(rx, ry, 3);
      g.fill({ color: a.accentColor, alpha: 0.3 });
    }

    // Hanging chains — more detailed with hooks
    for (let i = 0; i < 10; i++) {
      const cx = sw * (0.04 + i * 0.1);
      const cy1 = wallY + 3;
      const cy2 = wallY + 35 + (i % 4) * 18;
      // Chain links
      for (let y = cy1; y < cy2; y += 7) {
        g.ellipse(cx + Math.sin(y * 0.3) * 1, y, 2.5, 3.5);
        g.stroke({ color: 0x444455, width: 1 });
      }
      // Hook or weight at bottom
      if (i % 3 === 0) {
        g.moveTo(cx, cy2);
        g.quadraticCurveTo(cx + 5, cy2 + 8, cx, cy2 + 12);
        g.stroke({ color: 0x444455, width: 1.5 });
      } else {
        g.circle(cx, cy2 + 4, 4);
        g.fill({ color: 0x222233 });
        g.circle(cx, cy2 + 4, 4);
        g.stroke({ color: 0x444455, width: 1 });
      }
    }

    // Weapon racks on walls
    for (const wx of [sw * 0.15, sw * 0.85]) {
      const wy = wallY + (floorY - wallY) * 0.6;
      // Rack
      g.rect(wx - 18, wy, 36, 3);
      g.fill({ color: 0x222233 });
      // Weapons
      g.moveTo(wx - 12, wy);
      g.lineTo(wx - 12, wy - 25);
      g.stroke({ color: 0x555566, width: 2 });
      g.moveTo(wx, wy);
      g.lineTo(wx + 2, wy - 30);
      g.stroke({ color: 0x555566, width: 2 });
      g.moveTo(wx + 12, wy);
      g.lineTo(wx + 10, wy - 22);
      g.stroke({ color: 0x555566, width: 2 });
      // Blade tips
      g.moveTo(wx - 14, wy - 25);
      g.lineTo(wx - 12, wy - 30);
      g.lineTo(wx - 10, wy - 25);
      g.closePath();
      g.fill({ color: 0x777788 });
    }

    // Dark floor with purple rune patterns
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 2);
    g.fill({ color: a.groundHighlight, alpha: 0.3 });
    // Rune circle on floor (center)
    g.ellipse(sw * 0.5, floorY + 8, 60, 8);
    g.stroke({ color: a.accentColor, width: 1, alpha: 0.1 });
    g.ellipse(sw * 0.5, floorY + 8, 40, 5);
    g.stroke({ color: a.accentColor, width: 0.8, alpha: 0.08 });
    // Rune lines on floor
    for (let x = sw * 0.15; x < sw * 0.85; x += 35) {
      g.moveTo(x, floorY + 3);
      g.lineTo(x + 18, floorY + 3);
      g.stroke({ color: a.accentColor, width: 0.8, alpha: 0.12 });
    }

    // Purple mist particles
    for (let i = 0; i < 25; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.3 + Math.random() * floorY * 0.6,
        vx: (Math.random() - 0.5) * 0.2, vy: -0.05 - Math.random() * 0.1,
        radius: 2 + Math.random() * 2.5, alpha: 0.1 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2, color: a.accentColor,
      });
    }
    // Dark mist layers
    for (let i = 0; i < 5; i++) {
      this._mistLayers.push({
        y: floorY - 12 + i * 8, speed: 0.15 + i * 0.06,
        offset: i * 55, alpha: 0.05, height: 22 + i * 6,
      });
    }
    g.rect(0, floorY * 0.25, sw, floorY * 0.75);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Spectral faces faintly visible in walls ---
    const facePositions = [
      { x: sw * 0.2, y: wallY + (floorY - wallY) * 0.35 },
      { x: sw * 0.65, y: wallY + (floorY - wallY) * 0.5 },
      { x: sw * 0.85, y: wallY + (floorY - wallY) * 0.28 },
    ];
    for (const fp of facePositions) {
      // Very faint ghostly face outline
      g.ellipse(fp.x, fp.y, 8, 10);
      g.stroke({ color: 0x8866aa, width: 0.8, alpha: 0.04 });
      // Eye sockets
      g.circle(fp.x - 3, fp.y - 2, 1.5);
      g.fill({ color: 0x6644aa, alpha: 0.04 });
      g.circle(fp.x + 3, fp.y - 2, 1.5);
      g.fill({ color: 0x6644aa, alpha: 0.04 });
      // Mouth
      g.ellipse(fp.x, fp.y + 4, 3, 1.5);
      g.fill({ color: 0x5533aa, alpha: 0.03 });
    }

    // --- Dripping water stains on walls ---
    const stainPositions = [sw * 0.12, sw * 0.35, sw * 0.52, sw * 0.78, sw * 0.95];
    for (const sx of stainPositions) {
      const stainTop = wallY + 10 + Math.sin(sx * 0.3) * 15;
      const stainLen = 30 + Math.sin(sx * 0.7) * 15;
      g.moveTo(sx, stainTop);
      g.quadraticCurveTo(sx + 1, stainTop + stainLen * 0.5, sx - 1, stainTop + stainLen);
      g.stroke({ color: 0x040410, width: 2.5, alpha: 0.15 });
      g.moveTo(sx + 1, stainTop + 3);
      g.quadraticCurveTo(sx + 2, stainTop + stainLen * 0.4, sx, stainTop + stainLen * 0.8);
      g.stroke({ color: 0x060618, width: 1.5, alpha: 0.1 });
    }

    // --- Torture rack in background ---
    const rackX = sw * 0.42;
    const rackY = wallY + (floorY - wallY) * 0.55;
    // Wooden frame (A-shape)
    g.moveTo(rackX - 12, rackY + 20);
    g.lineTo(rackX - 8, rackY - 18);
    g.lineTo(rackX + 8, rackY - 18);
    g.lineTo(rackX + 12, rackY + 20);
    g.stroke({ color: 0x2a1a10, width: 2.5, alpha: 0.3 });
    // Crossbar
    g.moveTo(rackX - 10, rackY);
    g.lineTo(rackX + 10, rackY);
    g.stroke({ color: 0x2a1a10, width: 2, alpha: 0.3 });
    // Top beam
    g.moveTo(rackX - 9, rackY - 15);
    g.lineTo(rackX + 9, rackY - 15);
    g.stroke({ color: 0x2a1a10, width: 2, alpha: 0.25 });
    // Ropes dangling
    g.moveTo(rackX - 5, rackY - 15);
    g.quadraticCurveTo(rackX - 6, rackY - 5, rackX - 4, rackY + 5);
    g.stroke({ color: 0x443322, width: 1, alpha: 0.2 });
    g.moveTo(rackX + 5, rackY - 15);
    g.quadraticCurveTo(rackX + 6, rackY - 5, rackX + 4, rackY + 5);
    g.stroke({ color: 0x443322, width: 1, alpha: 0.2 });

    // --- Cobwebs in corners ---
    const cobwebCorners = [
      { x: 0, y: wallY, dx: 1, dy: 1 },
      { x: sw, y: wallY, dx: -1, dy: 1 },
    ];
    for (const cw of cobwebCorners) {
      // Radial lines
      for (let r = 0; r < 6; r++) {
        const angle = (r / 6) * (Math.PI * 0.5) + (cw.dx > 0 ? 0 : Math.PI * 0.5);
        const endX = cw.x + Math.cos(angle) * 30 * cw.dx;
        const endY = cw.y + Math.sin(angle) * 30;
        g.moveTo(cw.x, cw.y);
        g.lineTo(endX, endY);
        g.stroke({ color: 0x444466, width: 0.5, alpha: 0.12 });
      }
      // Connecting arcs (2 rings)
      for (let ring = 1; ring <= 2; ring++) {
        const rDist = ring * 12;
        for (let r = 0; r < 5; r++) {
          const a1 = (r / 6) * (Math.PI * 0.5) + (cw.dx > 0 ? 0 : Math.PI * 0.5);
          const a2 = ((r + 1) / 6) * (Math.PI * 0.5) + (cw.dx > 0 ? 0 : Math.PI * 0.5);
          g.moveTo(cw.x + Math.cos(a1) * rDist * cw.dx, cw.y + Math.sin(a1) * rDist);
          g.lineTo(cw.x + Math.cos(a2) * rDist * cw.dx, cw.y + Math.sin(a2) * rDist);
          g.stroke({ color: 0x444466, width: 0.4, alpha: 0.08 });
        }
      }
    }

    // --- Scattered bones on floor ---
    const bonePositions = [sw * 0.18, sw * 0.34, sw * 0.58, sw * 0.74, sw * 0.88];
    for (const bx of bonePositions) {
      const bAngle = Math.sin(bx * 0.5) * 0.5;
      // Bone shaft
      g.moveTo(bx - Math.cos(bAngle) * 6, floorY + 3 - Math.sin(bAngle) * 2);
      g.lineTo(bx + Math.cos(bAngle) * 6, floorY + 3 + Math.sin(bAngle) * 2);
      g.stroke({ color: 0xbbaa88, width: 1.5, alpha: 0.2 });
      // Knobs at ends
      g.circle(bx - Math.cos(bAngle) * 6, floorY + 3 - Math.sin(bAngle) * 2, 1.5);
      g.fill({ color: 0xbbaa88, alpha: 0.18 });
      g.circle(bx + Math.cos(bAngle) * 6, floorY + 3 + Math.sin(bAngle) * 2, 1.5);
      g.fill({ color: 0xbbaa88, alpha: 0.18 });
    }
    // Skull
    g.circle(sw * 0.45, floorY + 4, 3.5);
    g.fill({ color: 0xbbaa88, alpha: 0.15 });
    g.circle(sw * 0.45 - 1.2, floorY + 3.5, 0.8);
    g.fill({ color: 0x0a0a18, alpha: 0.12 });
    g.circle(sw * 0.45 + 1.2, floorY + 3.5, 0.8);
    g.fill({ color: 0x0a0a18, alpha: 0.12 });

    // --- Unique critter: bats fluttering from the keep windows ---
    this._critters.push({
      x: sw * 0.3, y: floorY * 0.3, baseX: sw * 0.3, baseY: floorY * 0.3,
      phase: 0, type: "bat", dir: 1, speed: 0, state: 0,
    });
    this._critters.push({
      x: sw * 0.55, y: floorY * 0.25, baseX: sw * 0.55, baseY: floorY * 0.25,
      phase: 1.3, type: "bat", dir: 1, speed: 0, state: 0,
    });
    this._critters.push({
      x: sw * 0.75, y: floorY * 0.35, baseX: sw * 0.75, baseY: floorY * 0.35,
      phase: 2.7, type: "bat", dir: 1, speed: 0, state: 0,
    });
  }

  private _update_shadow_keep(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Pulsing runes
    const runeXs = [sw * 0.18, sw * 0.38, sw * 0.62, sw * 0.82];
    const wallY = this._floorY * 0.15;
    for (let i = 0; i < runeXs.length; i++) {
      const rx = runeXs[i];
      const ry = wallY + (this._floorY - wallY) * 0.4;
      const pulse = 0.15 + Math.sin(time * 1.5 + i * 1.2) * 0.1;
      g.circle(rx, ry, 18);
      g.fill({ color: 0x8844cc, alpha: pulse * 0.2 });
      g.circle(rx, ry, 4);
      g.fill({ color: 0xaa66ee, alpha: pulse });
    }
    // Floor rune circle pulse
    const floorPulse = 0.05 + Math.sin(time * 0.8) * 0.03;
    g.ellipse(sw * 0.5, this._floorY + 8, 60, 8);
    g.stroke({ color: 0x8844cc, width: 1.5, alpha: floorPulse });
    // Floating shadow particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.8 + p.phase) * 0.15;
      p.y += p.vy;
      if (p.y < this._floorY * 0.1) { p.y = this._floorY * 0.85; p.x = Math.random() * sw; }
      const fade = p.alpha * (0.4 + Math.sin(time * 1.5 + p.phase) * 0.4);
      g.circle(p.x, p.y, p.radius + 2);
      g.fill({ color: p.color, alpha: fade * 0.12 });
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: fade });
    }
    // Dark fog drift
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 20 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 70) {
        g.ellipse((x + offset) % (sw + 200) - 100, m.y, 50, m.height / 2);
        g.fill({ color: 0x110022, alpha: m.alpha });
      }
    }
    // Swaying chains
    for (let i = 0; i < 10; i++) {
      const cx = sw * (0.04 + i * 0.1);
      const sway = Math.sin(time * 0.6 + i * 0.8) * 2;
      g.moveTo(cx + sway * 0.3, this._floorY * 0.15 + 35 + (i % 4) * 18);
      g.lineTo(cx + sway, this._floorY * 0.15 + 40 + (i % 4) * 18);
      g.stroke({ color: 0x444455, width: 1, alpha: 0.3 });
    }

    // --- Dripping water drops from ceiling ---
    for (let wd = 0; wd < 3; wd++) {
      const wdX = sw * (0.22 + wd * 0.28);
      const wdPhase = (time * 0.4 + wd * 2.3) % 4;
      if (wdPhase < 1.5) {
        // Drop falling
        const wdProgress = wdPhase / 1.5;
        const wallTop = this._floorY * 0.15;
        const wdY = wallTop + wdProgress * (this._floorY - wallTop - 5);
        const wdAlpha = 0.35 * (1 - wdProgress * 0.5);
        g.circle(wdX, wdY, 1.5);
        g.fill({ color: 0x6688aa, alpha: wdAlpha });
        // Tiny tail streak
        g.moveTo(wdX, wdY - 4);
        g.lineTo(wdX, wdY);
        g.stroke({ color: 0x6688aa, width: 0.8, alpha: wdAlpha * 0.5 });
      } else if (wdPhase < 2.2) {
        // Splash
        const splashProgress = (wdPhase - 1.5) / 0.7;
        const splashAlpha = 0.2 * (1 - splashProgress);
        g.ellipse(wdX, this._floorY + 2, 3 + splashProgress * 5, 1 + splashProgress * 2);
        g.stroke({ color: 0x6688aa, width: 0.5, alpha: splashAlpha });
      }
    }

    // --- Spectral wisps drifting ---
    for (let sw2 = 0; sw2 < 4; sw2++) {
      const wispX = ((time * 8 + sw2 * sw * 0.27) % (sw + 60)) - 30;
      const wispY = this._floorY * (0.3 + sw2 * 0.12) + Math.sin(time * 0.7 + sw2 * 1.5) * 15;
      const wispAlpha = 0.04 + Math.sin(time * 1.2 + sw2 * 2) * 0.02;
      // Wisp body
      g.ellipse(wispX, wispY, 8, 4);
      g.fill({ color: 0x8866cc, alpha: wispAlpha });
      // Wisp tail
      g.moveTo(wispX - 8, wispY);
      g.quadraticCurveTo(wispX - 16, wispY + Math.sin(time * 2 + sw2) * 3, wispX - 22, wispY + 2);
      g.stroke({ color: 0x8866cc, width: 1.5, alpha: wispAlpha * 0.6 });
    }

    // --- Flickering torch shadows on walls ---
    for (let ts = 0; ts < 4; ts++) {
      const tsX = sw * (0.15 + ts * 0.22);
      const tsFlicker = Math.sin(time * 5 + ts * 1.7) * 0.5 + Math.sin(time * 8 + ts * 3.1) * 0.3;
      const tsAlpha = 0.04 + tsFlicker * 0.02;
      const tsHeight = 30 + tsFlicker * 8;
      const tsWidth = 14 + tsFlicker * 4;
      g.ellipse(tsX, this._floorY * 0.5, tsWidth, tsHeight);
      g.fill({ color: 0x000000, alpha: Math.max(0, tsAlpha) });
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // CAMLANN BATTLEFIELD — War-torn, broken weapons, siege fires, red sky
  // =========================================================================

  private _build_camlann(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    this._drawSkyGradient(g, a, sw, floorY);
    // Red/orange glow at horizon (fires)
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: 0xcc4422, alpha: 0.08 });
    g.rect(0, floorY * 0.7, sw, floorY * 0.3);
    g.fill({ color: 0xff6633, alpha: 0.06 });

    // Smoke clouds — layered
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 8; i++) {
        const cx = sw * (Math.sin(i * 2.1 + layer * 1.5) * 0.4 + 0.5);
        const cy = floorY * (0.03 + layer * 0.06 + i * 0.03);
        g.circle(cx, cy, 28 + i * 4 + layer * 8);
        g.fill({ color: 0x443333 - layer * 0x111111, alpha: 0.2 - i * 0.015 - layer * 0.05 });
      }
    }

    // Distant hills / terrain
    g.moveTo(0, floorY * 0.55);
    for (let x = 0; x <= sw; x += sw / 10) {
      g.lineTo(x, floorY * (0.45 + Math.sin(x * 0.006 + 1) * 0.05));
    }
    g.lineTo(sw, floorY * 0.6);
    g.lineTo(0, floorY * 0.6);
    g.closePath();
    g.fill({ color: 0x3a2a20, alpha: 0.4 });

    // Distant burning buildings — more
    for (const bx of [sw * 0.1, sw * 0.25, sw * 0.42, sw * 0.58, sw * 0.75, sw * 0.92]) {
      const bh = 25 + Math.sin(bx * 0.7) * 15;
      const by = floorY * 0.5;
      // Building silhouette
      g.rect(bx - 10, by - bh, 20, bh + 8);
      g.fill({ color: 0x2a2020, alpha: 0.45 });
      // Partial collapse
      if (Math.sin(bx * 1.3) > 0) {
        g.moveTo(bx - 8, by - bh);
        g.lineTo(bx + 5, by - bh + 8);
        g.lineTo(bx + 10, by - bh);
        g.closePath();
        g.fill({ color: 0x443333, alpha: 0.3 });
      }
      // Fire glow on top
      g.circle(bx, by - bh, 8);
      g.fill({ color: 0xff4400, alpha: 0.12 });
      this._flames.push({ x: bx, y: by - bh - 4, baseRadius: 4, phase: bx * 0.1 });
    }

    // Siege tower ruin (left)
    const stX = sw * 0.08;
    g.rect(stX - 15, floorY - 70, 30, 70);
    g.fill({ color: 0x3a2a1a, alpha: 0.6 });
    // Tilted/broken top
    g.moveTo(stX - 15, floorY - 70);
    g.lineTo(stX - 10, floorY - 80);
    g.lineTo(stX + 20, floorY - 65);
    g.lineTo(stX + 15, floorY - 70);
    g.closePath();
    g.fill({ color: 0x3a2a1a, alpha: 0.5 });
    // Crossbeams
    for (let y = floorY - 60; y < floorY; y += 15) {
      g.moveTo(stX - 15, y);
      g.lineTo(stX + 15, y);
      g.stroke({ color: 0x2a1a0a, width: 2, alpha: 0.5 });
    }
    // Fire on siege tower
    this._flames.push({ x: stX, y: floorY - 75, baseRadius: 8, phase: 3.5 });

    // Broken wagon wheel
    const wheelX = sw * 0.22;
    g.circle(wheelX, floorY - 5, 16);
    g.stroke({ color: 0x4a3a2a, width: 3 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      g.moveTo(wheelX, floorY - 5);
      g.lineTo(wheelX + Math.cos(angle) * 14, floorY - 5 + Math.sin(angle) * 14);
      g.stroke({ color: 0x4a3a2a, width: 1.5 });
    }
    // Second broken wheel (tilted)
    g.ellipse(wheelX + 25, floorY - 2, 10, 6);
    g.stroke({ color: 0x4a3a2a, width: 2 });

    // Broken spears / weapons stuck in ground — more variety
    const weaponXs = [sw * 0.15, sw * 0.3, sw * 0.38, sw * 0.48, sw * 0.56, sw * 0.65, sw * 0.75, sw * 0.85];
    for (let i = 0; i < weaponXs.length; i++) {
      const wx = weaponXs[i];
      const angle = -0.2 + (i % 4) * 0.08;
      const wLen = 30 + (i % 3) * 12;
      const topX = wx + Math.sin(angle) * wLen;
      const topY = floorY - Math.cos(angle) * wLen;
      g.moveTo(wx, floorY + 2);
      g.lineTo(topX, topY);
      g.stroke({ color: 0x5a4a3a, width: 2, cap: "round" });
      // Spear point, axe head, or broken
      if (i % 3 === 0) {
        g.moveTo(topX - 3, topY + 2);
        g.lineTo(topX, topY - 7);
        g.lineTo(topX + 3, topY + 2);
        g.closePath();
        g.fill({ color: 0x888899 });
      } else if (i % 3 === 1) {
        // Axe head
        g.moveTo(topX, topY);
        g.quadraticCurveTo(topX + 8, topY - 5, topX + 6, topY + 6);
        g.lineTo(topX, topY);
        g.fill({ color: 0x888899 });
      }
    }

    // Fallen knight helmets
    for (const hx of [sw * 0.35, sw * 0.62]) {
      g.ellipse(hx, floorY + 1, 7, 5);
      g.fill({ color: 0x666677 });
      g.ellipse(hx, floorY + 1, 7, 5);
      g.stroke({ color: 0x555566, width: 1 });
      // Visor slit
      g.moveTo(hx - 3, floorY);
      g.lineTo(hx + 3, floorY);
      g.stroke({ color: 0x333344, width: 1 });
    }

    // Shields scattered
    for (const sx of [sw * 0.28, sw * 0.5, sw * 0.72]) {
      g.ellipse(sx, floorY + 2, 12, 5);
      g.fill({ color: 0x883322 });
      g.ellipse(sx, floorY + 2, 12, 5);
      g.stroke({ color: 0x5a2a1a, width: 1 });
      g.circle(sx, floorY + 2, 3);
      g.fill({ color: 0x888899 });
    }

    // Tattered banner on pole
    const bannerX = sw * 0.45;
    g.moveTo(bannerX, floorY + 3);
    g.lineTo(bannerX - 1, floorY - 55);
    g.stroke({ color: 0x5a4a3a, width: 3, cap: "round" });
    // Torn banner
    g.moveTo(bannerX, floorY - 52);
    g.lineTo(bannerX + 22, floorY - 48);
    g.lineTo(bannerX + 18, floorY - 38);
    g.lineTo(bannerX + 25, floorY - 35);
    g.lineTo(bannerX + 15, floorY - 28);
    g.lineTo(bannerX, floorY - 32);
    g.closePath();
    g.fill({ color: 0x882222, alpha: 0.5 });
    this._banners.push({
      x: bannerX, y: floorY - 52, width: 25, height: 24,
      phase: 0, color: 0x882222, trimColor: 0xddaa33,
    });

    // Trenches / disturbed earth
    for (let i = 0; i < 5; i++) {
      const tx = sw * (0.12 + i * 0.18);
      g.ellipse(tx, floorY + 5, 22, 5);
      g.fill({ color: 0x3a2a1a, alpha: 0.35 });
    }

    // Ground — muddy, scarred earth
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.4 });
    // Blood/mud stains
    for (let i = 0; i < 10; i++) {
      const sx = sw * (0.06 + i * 0.09);
      g.ellipse(sx, floorY + 5 + (i % 3) * 4, 7 + i % 4 * 3, 3);
      g.fill({ color: 0x4a2020, alpha: 0.2 });
    }
    // Crater
    g.ellipse(sw * 0.6, floorY + 6, 20, 5);
    g.fill({ color: 0x3a2a1a, alpha: 0.3 });
    g.ellipse(sw * 0.6, floorY + 6, 20, 5);
    g.stroke({ color: 0x4a3a2a, width: 0.8, alpha: 0.3 });

    // Smoke / fire particles — more
    for (let i = 0; i < 28; i++) {
      this._particles.push({
        x: Math.random() * sw, y: floorY * 0.3 + Math.random() * floorY * 0.6,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.15 - Math.random() * 0.25,
        radius: 1.5 + Math.random() * 2, alpha: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        color: i % 4 === 0 ? 0xff6633 : i % 4 === 1 ? 0xffaa44 : 0x664444,
      });
    }
    // Mist layers
    for (let i = 0; i < 3; i++) {
      this._mistLayers.push({
        y: floorY - 5 + i * 10, speed: 0.2 + i * 0.1,
        offset: i * 80, alpha: 0.04, height: 20 + i * 6,
      });
    }
    g.rect(0, floorY * 0.35, sw, floorY * 0.65);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // --- Broken siege catapult ---
    const catX = sw * 0.82;
    const catY = floorY;
    // Base frame
    g.rect(catX - 16, catY - 14, 32, 14);
    g.fill({ color: 0x3a2a1a, alpha: 0.5 });
    g.rect(catX - 16, catY - 14, 32, 14);
    g.stroke({ color: 0x2a1a0a, width: 1.5, alpha: 0.4 });
    // Crossbeam
    g.moveTo(catX - 16, catY - 10);
    g.lineTo(catX + 16, catY - 10);
    g.stroke({ color: 0x2a1a0a, width: 2, alpha: 0.4 });
    // Broken throwing arm (tilted, snapped)
    g.moveTo(catX - 2, catY - 14);
    g.lineTo(catX - 18, catY - 40);
    g.stroke({ color: 0x4a3a2a, width: 3, cap: "round", alpha: 0.45 });
    // Splintered end of arm
    g.moveTo(catX - 18, catY - 40);
    g.lineTo(catX - 22, catY - 44);
    g.stroke({ color: 0x5a4a3a, width: 1.5, alpha: 0.3 });
    g.moveTo(catX - 18, catY - 40);
    g.lineTo(catX - 16, catY - 45);
    g.stroke({ color: 0x5a4a3a, width: 1, alpha: 0.25 });
    // Wheels (broken)
    g.circle(catX - 12, catY, 5);
    g.stroke({ color: 0x3a2a1a, width: 2, alpha: 0.4 });
    g.circle(catX + 12, catY, 5);
    g.stroke({ color: 0x3a2a1a, width: 2, alpha: 0.4 });

    // --- Abandoned war drums ---
    for (const drumX of [sw * 0.14, sw * 0.88]) {
      // Drum body (cylinder, side view)
      g.ellipse(drumX, floorY - 4, 8, 5);
      g.fill({ color: 0x553322, alpha: 0.4 });
      g.ellipse(drumX, floorY - 4, 8, 5);
      g.stroke({ color: 0x442211, width: 1.2, alpha: 0.35 });
      // Drum skin (top)
      g.ellipse(drumX, floorY - 8, 8, 3);
      g.fill({ color: 0xbbaa77, alpha: 0.3 });
      g.ellipse(drumX, floorY - 8, 8, 3);
      g.stroke({ color: 0x664422, width: 0.8, alpha: 0.3 });
      // Drumstick
      g.moveTo(drumX + 5, floorY - 10);
      g.lineTo(drumX + 12, floorY - 16);
      g.stroke({ color: 0x7a6a4a, width: 1.2, cap: "round", alpha: 0.3 });
    }

    // --- Torn war map on ground ---
    const mapX = sw * 0.55;
    const mapY = floorY + 3;
    g.rect(mapX - 10, mapY - 2, 20, 14);
    g.fill({ color: 0xccbb88, alpha: 0.2 });
    g.rect(mapX - 10, mapY - 2, 20, 14);
    g.stroke({ color: 0x887755, width: 0.6, alpha: 0.2 });
    // Map markings
    g.moveTo(mapX - 6, mapY + 2);
    g.lineTo(mapX + 4, mapY + 5);
    g.stroke({ color: 0x664433, width: 0.5, alpha: 0.15 });
    g.moveTo(mapX - 3, mapY + 7);
    g.lineTo(mapX + 7, mapY + 4);
    g.stroke({ color: 0x664433, width: 0.5, alpha: 0.12 });
    g.circle(mapX + 2, mapY + 6, 2);
    g.stroke({ color: 0xcc3322, width: 0.5, alpha: 0.15 });

    // --- Fallen standard/flag pole with tattered cloth ---
    const stdX = sw * 0.68;
    g.moveTo(stdX, floorY + 2);
    g.lineTo(stdX + 35, floorY - 15);
    g.stroke({ color: 0x5a4a3a, width: 2.5, cap: "round", alpha: 0.4 });
    // Tattered cloth
    g.moveTo(stdX + 28, floorY - 13);
    g.lineTo(stdX + 38, floorY - 10);
    g.lineTo(stdX + 35, floorY - 5);
    g.lineTo(stdX + 40, floorY - 3);
    g.lineTo(stdX + 33, floorY);
    g.stroke({ color: 0x882222, width: 1.5, alpha: 0.3 });

    // --- Crows on dead trees ---
    // Dead tree (right background)
    const dtX = sw * 0.78;
    const dtY = floorY * 0.48;
    g.moveTo(dtX, floorY * 0.6);
    g.lineTo(dtX - 2, dtY);
    g.stroke({ color: 0x2a1a10, width: 3, alpha: 0.35 });
    g.moveTo(dtX - 2, dtY);
    g.lineTo(dtX - 12, dtY - 10);
    g.stroke({ color: 0x2a1a10, width: 2, alpha: 0.3 });
    g.moveTo(dtX - 2, dtY + 5);
    g.lineTo(dtX + 10, dtY - 2);
    g.stroke({ color: 0x2a1a10, width: 1.5, alpha: 0.3 });
    // Crows perched (small dark shapes)
    for (const crowPos of [{ x: dtX - 10, y: dtY - 11 }, { x: dtX + 8, y: dtY - 3 }]) {
      g.ellipse(crowPos.x, crowPos.y, 3, 2);
      g.fill({ color: 0x111111, alpha: 0.4 });
      // Beak
      g.moveTo(crowPos.x + 3, crowPos.y - 0.5);
      g.lineTo(crowPos.x + 5, crowPos.y);
      g.stroke({ color: 0x222222, width: 0.8, alpha: 0.35 });
    }

    // --- Funeral pyre smoldering ---
    const pyreX = sw * 0.38;
    const pyreY = floorY;
    // Log pile
    for (let pl = 0; pl < 4; pl++) {
      g.moveTo(pyreX - 12 + pl * 3, pyreY);
      g.lineTo(pyreX - 10 + pl * 3, pyreY - 6 - pl);
      g.lineTo(pyreX + 10 - pl * 2, pyreY - 5 - pl);
      g.lineTo(pyreX + 12 - pl * 2, pyreY);
      g.closePath();
      g.fill({ color: 0x2a1a0a, alpha: 0.3 + pl * 0.05 });
    }
    // Charred remains
    g.ellipse(pyreX, pyreY - 4, 10, 3);
    g.fill({ color: 0x1a0a00, alpha: 0.3 });
    // Subtle smoke wisps (static)
    g.circle(pyreX - 2, pyreY - 12, 6);
    g.fill({ color: 0x555544, alpha: 0.05 });
    g.circle(pyreX + 3, pyreY - 18, 8);
    g.fill({ color: 0x555544, alpha: 0.03 });

    // --- Unique critter: crow pecking at the battlefield ---
    this._critters.push({
      x: sw * 0.2, y: floorY - 3, baseX: sw * 0.3, baseY: floorY - 3,
      phase: 0, type: "crow", dir: 1, speed: 0.2, state: 0,
    });
  }

  private _update_camlann(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    // Distant fires
    for (const f of this._flames) {
      const flicker = Math.sin(time * 6 + f.phase) * 2;
      const flicker2 = Math.cos(time * 9 + f.phase) * 1.5;
      g.circle(f.x + flicker2 * 0.3, f.y, f.baseRadius + 3 + flicker);
      g.fill({ color: 0xff4400, alpha: 0.12 });
      g.ellipse(f.x + flicker2 * 0.5, f.y - flicker * 0.3, f.baseRadius, f.baseRadius + 2 + flicker);
      g.fill({ color: 0xff6622, alpha: 0.45 });
      g.ellipse(f.x, f.y, f.baseRadius * 0.4, f.baseRadius * 0.7);
      g.fill({ color: 0xffcc44, alpha: 0.65 });
    }
    // Smoke and ember particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.5 + p.phase) * 0.2;
      p.y += p.vy;
      if (p.y < this._floorY * 0.05) { p.y = this._floorY; p.x = Math.random() * sw; }
      const fade = p.alpha * (0.3 + Math.sin(time * 2.5 + p.phase) * 0.4);
      if (p.color === 0x664444) {
        // Smoke
        g.circle(p.x, p.y, p.radius + 3);
        g.fill({ color: p.color, alpha: fade * 0.25 });
      } else {
        // Ember
        g.circle(p.x, p.y, p.radius);
        g.fill({ color: p.color, alpha: fade });
        g.circle(p.x, p.y, p.radius * 0.5);
        g.fill({ color: 0xffcc44, alpha: fade * 0.8 });
      }
    }
    // Banner sway
    for (const b of this._banners) {
      const sway = Math.sin(time * 1.5 + b.phase) * 3;
      g.moveTo(b.x, b.y);
      g.lineTo(b.x + b.width + sway, b.y + 4 + sway * 0.5);
      g.lineTo(b.x + b.width * 0.7 + sway * 0.8, b.y + b.height * 0.5);
      g.stroke({ color: b.color, width: 1.5, alpha: 0.3 });
    }
    // Smoke drift
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 25 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 70) {
        g.ellipse((x + offset) % (sw + 200) - 100, m.y, 45, m.height / 2);
        g.fill({ color: 0x443333, alpha: m.alpha });
      }
    }

    // --- Drifting ash/paper scraps ---
    for (let ash = 0; ash < 8; ash++) {
      const ashPhase = time * 0.3 + ash * 1.7;
      const ashX = ((ashPhase * 15 + ash * 80) % (sw + 40)) - 20;
      const ashY = this._floorY * 0.15 + ((ashPhase * 8 + ash * 50) % (this._floorY * 0.75));
      const ashSpin = Math.sin(time * 2 + ash * 2.3) * 0.5;
      const ashAlpha = 0.12 + Math.sin(time * 0.8 + ash) * 0.04;
      const ashColor = ash % 3 === 0 ? 0xbbbbaa : ash % 3 === 1 ? 0x999988 : 0x776666;
      // Tumbling rectangle
      g.rect(ashX - 1.5 + ashSpin, ashY - 1, 3, 2);
      g.fill({ color: ashColor, alpha: ashAlpha });
    }

    // --- Distant smoke plumes rising ---
    for (let sp = 0; sp < 3; sp++) {
      const spX = sw * (0.2 + sp * 0.3);
      const spBaseY = this._floorY * 0.45;
      for (let seg = 0; seg < 5; seg++) {
        const segY = spBaseY - seg * 12 - Math.sin(time * 0.5 + sp + seg * 0.5) * 3;
        const segX = spX + Math.sin(time * 0.3 + sp * 2 + seg * 0.8) * (4 + seg * 2);
        const segSize = 6 + seg * 4;
        const segAlpha = 0.06 - seg * 0.008;
        g.circle(segX, segY, segSize);
        g.fill({ color: 0x443333, alpha: Math.max(0.01, segAlpha) });
      }
    }

    // --- Crows taking flight occasionally ---
    for (let cf = 0; cf < 2; cf++) {
      const cfPhase = time * 0.2 + cf * 4.5;
      const cfCycle = cfPhase % 8;
      if (cfCycle < 2.0) {
        const cfProgress = cfCycle / 2.0;
        const cfX = sw * (0.6 + cf * 0.2) + cfProgress * 40 * (cf === 0 ? 1 : -1);
        const cfY = this._floorY * 0.4 - cfProgress * this._floorY * 0.2;
        const cfAlpha = 0.4 * (1 - cfProgress * 0.5);
        const wingFlap = Math.sin(time * 12 + cf * 3) * 3;
        // Body
        g.ellipse(cfX, cfY, 2.5, 1.5);
        g.fill({ color: 0x111111, alpha: cfAlpha });
        // Wings
        g.moveTo(cfX - 4, cfY + wingFlap * 0.3);
        g.lineTo(cfX - 1, cfY);
        g.lineTo(cfX + 1, cfY);
        g.lineTo(cfX + 4, cfY + wingFlap * 0.3);
        g.stroke({ color: 0x111111, width: 1, alpha: cfAlpha * 0.8 });
      }
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // GENERIC FALLBACK
  // =========================================================================

  // =========================================================================
  // BROCÉLIANDE FOREST — enchanted woodland, ancient oaks, fireflies, roots
  // =========================================================================

  private _build_broceliande(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Deep forest canopy sky (very dark greens) ---
    const skyBands = 10;
    for (let i = 0; i < skyBands; i++) {
      const t = i / skyBands;
      const r1 = (a.skyTop >> 16) & 0xff, g1 = (a.skyTop >> 8) & 0xff, b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff, g2 = (a.skyBottom >> 8) & 0xff, b2 = a.skyBottom & 0xff;
      const r = Math.round(r1 + (r2 - r1) * t);
      const gc = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      const col = (r << 16) | (gc << 8) | b;
      g.rect(0, floorY * t, sw, floorY / skyBands + 1);
      g.fill({ color: col });
    }

    // --- Dappled light beams through canopy ---
    const beams = [sw * 0.15, sw * 0.4, sw * 0.65, sw * 0.85];
    for (const bx of beams) {
      g.moveTo(bx - 10, 0);
      g.lineTo(bx + 15, 0);
      g.lineTo(bx + 40, floorY);
      g.lineTo(bx - 20, floorY);
      g.closePath();
      g.fill({ color: 0x88cc66, alpha: 0.03 });
    }

    // --- Distant tree layer (far silhouettes) ---
    for (let x = -20; x < sw + 20; x += 50 + Math.sin(x * 0.02) * 20) {
      const h = floorY * (0.3 + Math.sin(x * 0.03) * 0.08);
      const treeY = floorY - h;
      const trunkW = 8 + Math.sin(x * 0.07) * 3;
      // Trunk
      g.rect(x - trunkW / 2, treeY + h * 0.4, trunkW, h * 0.6);
      g.fill({ color: 0x1a2a18, alpha: 0.4 });
      // Canopy
      g.circle(x, treeY + h * 0.25, h * 0.35);
      g.fill({ color: 0x1a3322, alpha: 0.45 });
      g.circle(x - 8, treeY + h * 0.3, h * 0.25);
      g.fill({ color: 0x162a1c, alpha: 0.4 });
    }

    // --- Large foreground trees (left and right frame) ---
    // Left massive oak
    const oakLX = sw * 0.02;
    g.rect(oakLX - 18, floorY * 0.2, 36, floorY * 0.8);
    g.fill({ color: 0x2a1a10 });
    // Bark texture
    for (let y = floorY * 0.25; y < floorY; y += 12) {
      g.moveTo(oakLX - 14, y);
      g.quadraticCurveTo(oakLX - 10, y + 6, oakLX - 15, y + 12);
      g.stroke({ color: 0x221508, width: 1.5, alpha: 0.4 });
    }
    // Left canopy
    g.circle(oakLX - 5, floorY * 0.15, 60);
    g.fill({ color: 0x1a3322, alpha: 0.6 });
    g.circle(oakLX + 20, floorY * 0.1, 45);
    g.fill({ color: 0x224428, alpha: 0.5 });
    // Hanging moss
    for (let i = 0; i < 5; i++) {
      const mx = oakLX - 30 + i * 14;
      const my = floorY * 0.22 + i * 4;
      g.moveTo(mx, my);
      g.quadraticCurveTo(mx + 2, my + 18, mx - 2, my + 30);
      g.stroke({ color: 0x446633, width: 2, alpha: 0.3 });
    }

    // Right massive oak
    const oakRX = sw * 0.98;
    g.rect(oakRX - 16, floorY * 0.15, 32, floorY * 0.85);
    g.fill({ color: 0x2a1a10 });
    for (let y = floorY * 0.2; y < floorY; y += 12) {
      g.moveTo(oakRX + 12, y);
      g.quadraticCurveTo(oakRX + 8, y + 6, oakRX + 13, y + 12);
      g.stroke({ color: 0x221508, width: 1.5, alpha: 0.4 });
    }
    g.circle(oakRX + 5, floorY * 0.1, 55);
    g.fill({ color: 0x1a3322, alpha: 0.6 });
    g.circle(oakRX - 20, floorY * 0.08, 40);
    g.fill({ color: 0x224428, alpha: 0.5 });

    // --- Gnarled roots across the ground ---
    const rootPositions = [sw * 0.08, sw * 0.25, sw * 0.5, sw * 0.72, sw * 0.9];
    for (const rx of rootPositions) {
      const rw = 30 + Math.sin(rx) * 15;
      g.moveTo(rx - rw / 2, floorY);
      g.quadraticCurveTo(rx - rw / 4, floorY - 8, rx, floorY - 4);
      g.quadraticCurveTo(rx + rw / 4, floorY - 10, rx + rw / 2, floorY);
      g.stroke({ color: 0x3a2a18, width: 5, cap: "round" });
      g.moveTo(rx - rw / 2, floorY);
      g.quadraticCurveTo(rx - rw / 4, floorY - 6, rx, floorY - 2);
      g.quadraticCurveTo(rx + rw / 4, floorY - 8, rx + rw / 2, floorY);
      g.stroke({ color: 0x4a3a22, width: 3, cap: "round" });
    }

    // --- Mushroom patches ---
    const mushPositions = [sw * 0.15, sw * 0.38, sw * 0.62, sw * 0.85];
    for (const mx of mushPositions) {
      // Stem
      g.rect(mx - 2, floorY - 8, 4, 8);
      g.fill({ color: 0xccbb99 });
      // Cap
      g.moveTo(mx - 7, floorY - 8);
      g.arc(mx, floorY - 8, 7, Math.PI, 0);
      g.fill({ color: 0xcc4433 });
      // Spots
      g.circle(mx - 2, floorY - 11, 1.5);
      g.fill({ color: 0xeeddcc });
      g.circle(mx + 3, floorY - 10, 1.2);
      g.fill({ color: 0xeeddcc });
    }

    // --- Standing stone (druidic menhir) in background center ---
    const stoneX = sw * 0.5;
    const stoneY = floorY - 60;
    g.moveTo(stoneX - 14, floorY);
    g.lineTo(stoneX - 10, stoneY);
    g.quadraticCurveTo(stoneX, stoneY - 10, stoneX + 10, stoneY);
    g.lineTo(stoneX + 14, floorY);
    g.closePath();
    g.fill({ color: 0x555555, alpha: 0.5 });
    // Rune carvings
    g.moveTo(stoneX - 3, stoneY + 10);
    g.lineTo(stoneX, stoneY + 5);
    g.lineTo(stoneX + 3, stoneY + 10);
    g.stroke({ color: a.accentColor, width: 1.5, alpha: 0.4 });
    g.moveTo(stoneX, stoneY + 15);
    g.lineTo(stoneX, stoneY + 28);
    g.stroke({ color: a.accentColor, width: 1.5, alpha: 0.3 });

    // --- Forest floor ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });

    // Leaf litter texture
    for (let x = 0; x < sw; x += 12) {
      const seed = Math.sin(x * 0.4) * 0.5 + 0.5;
      if (seed > 0.4) {
        g.circle(x + 4, floorY + 4 + seed * 4, 3 + seed * 2);
        g.fill({ color: seed > 0.7 ? 0x443318 : 0x3a2a15, alpha: 0.3 });
      }
    }

    // --- Fog overlay ---
    g.rect(0, floorY * 0.5, sw, floorY * 0.5);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // Register firefly particles
    for (let i = 0; i < 20; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY * 0.3 + Math.random() * floorY * 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 1.5 + Math.random() * 1.5,
        alpha: 0.4 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.3 ? 0x88ff66 : 0xffee44,
      });
    }

    // Register mist layers
    for (let i = 0; i < 4; i++) {
      this._mistLayers.push({
        y: floorY - 20 + i * 8,
        speed: 0.3 + i * 0.15,
        offset: i * 100,
        alpha: 0.06 - i * 0.01,
        height: 30 + i * 10,
      });
    }

    // --- Fairy ring of mushrooms ---
    const ringCenterX = sw * 0.42;
    const ringCenterY = floorY + 2;
    const ringRadius = 22;
    for (let fm = 0; fm < 8; fm++) {
      const fmAngle = (fm / 8) * Math.PI * 2;
      const fmX = ringCenterX + Math.cos(fmAngle) * ringRadius;
      const fmY = ringCenterY + Math.sin(fmAngle) * ringRadius * 0.35;
      // Tiny mushroom stem
      g.rect(fmX - 1, fmY - 4, 2, 4);
      g.fill({ color: 0xddccaa, alpha: 0.4 });
      // Tiny mushroom cap
      g.moveTo(fmX - 3, fmY - 4);
      g.arc(fmX, fmY - 4, 3, Math.PI, 0);
      g.fill({ color: 0xee8844, alpha: 0.35 });
    }
    // Faint magic circle glow
    g.ellipse(ringCenterX, ringCenterY, ringRadius, ringRadius * 0.35);
    g.stroke({ color: 0x88ff66, width: 0.8, alpha: 0.04 });

    // --- Ancient carved face in tree trunk ---
    const faceTreeX = sw * 0.03;
    const faceTreeY = floorY * 0.45;
    // Subtle face features on the left oak
    g.ellipse(faceTreeX + 8, faceTreeY, 6, 8);
    g.stroke({ color: 0x1a0f06, width: 1.2, alpha: 0.15 });
    // Eyes (knotholes)
    g.ellipse(faceTreeX + 5, faceTreeY - 2, 2, 1.5);
    g.fill({ color: 0x0f0804, alpha: 0.2 });
    g.ellipse(faceTreeX + 11, faceTreeY - 2, 2, 1.5);
    g.fill({ color: 0x0f0804, alpha: 0.2 });
    // Mouth (bark crevice)
    g.moveTo(faceTreeX + 5, faceTreeY + 4);
    g.quadraticCurveTo(faceTreeX + 8, faceTreeY + 6, faceTreeX + 11, faceTreeY + 4);
    g.stroke({ color: 0x1a0f06, width: 1, alpha: 0.12 });
    // Nose ridge
    g.moveTo(faceTreeX + 8, faceTreeY - 1);
    g.lineTo(faceTreeX + 8, faceTreeY + 2);
    g.stroke({ color: 0x1a0f06, width: 0.8, alpha: 0.1 });

    // --- Hanging dreamcatchers/wind chimes in branches ---
    const chimePosns = [
      { x: sw * 0.06, y: floorY * 0.28 },
      { x: sw * 0.92, y: floorY * 0.24 },
    ];
    for (const ch of chimePosns) {
      // String from branch
      g.moveTo(ch.x, ch.y - 10);
      g.lineTo(ch.x, ch.y);
      g.stroke({ color: 0x887766, width: 0.5, alpha: 0.3 });
      // Ring
      g.circle(ch.x, ch.y + 5, 5);
      g.stroke({ color: 0x886644, width: 0.8, alpha: 0.25 });
      // Cross threads
      g.moveTo(ch.x - 4, ch.y + 3);
      g.lineTo(ch.x + 4, ch.y + 7);
      g.stroke({ color: 0x887766, width: 0.4, alpha: 0.15 });
      g.moveTo(ch.x + 4, ch.y + 3);
      g.lineTo(ch.x - 4, ch.y + 7);
      g.stroke({ color: 0x887766, width: 0.4, alpha: 0.15 });
      // Dangling feathers/chimes
      for (let dc = 0; dc < 3; dc++) {
        const dcX = ch.x - 3 + dc * 3;
        g.moveTo(dcX, ch.y + 10);
        g.lineTo(dcX, ch.y + 16 + dc);
        g.stroke({ color: 0x887766, width: 0.4, alpha: 0.2 });
        g.ellipse(dcX, ch.y + 17 + dc, 1, 2);
        g.fill({ color: 0x557744, alpha: 0.2 });
      }
    }

    // --- Small stream/brook crossing the floor ---
    g.moveTo(sw * 0.3, floorY + 6);
    g.quadraticCurveTo(sw * 0.4, floorY + 4, sw * 0.5, floorY + 7);
    g.quadraticCurveTo(sw * 0.6, floorY + 5, sw * 0.7, floorY + 6);
    g.stroke({ color: 0x4488aa, width: 2.5, alpha: 0.2 });
    // Highlight on stream
    g.moveTo(sw * 0.32, floorY + 5);
    g.quadraticCurveTo(sw * 0.42, floorY + 3, sw * 0.52, floorY + 6);
    g.quadraticCurveTo(sw * 0.62, floorY + 4, sw * 0.68, floorY + 5);
    g.stroke({ color: 0x66bbdd, width: 1, alpha: 0.12 });
    // Stepping stones in stream
    for (const stx of [sw * 0.36, sw * 0.48, sw * 0.58, sw * 0.66]) {
      g.ellipse(stx, floorY + 6, 3, 1.5);
      g.fill({ color: 0x667755, alpha: 0.3 });
    }

    // --- Animal tracks in the mud ---
    for (let at = 0; at < 4; at++) {
      const atX = sw * (0.2 + at * 0.18);
      const atY = floorY + 8 + Math.sin(at * 2.1) * 2;
      // Two-toed hoof print
      g.circle(atX - 1, atY, 1.2);
      g.fill({ color: 0x2a1a10, alpha: 0.12 });
      g.circle(atX + 1, atY, 1.2);
      g.fill({ color: 0x2a1a10, alpha: 0.12 });
      // Heel
      g.circle(atX, atY + 2, 0.8);
      g.fill({ color: 0x2a1a10, alpha: 0.08 });
    }

    // --- Unique critter: glowing fairy dancing through the trees ---
    this._critters.push({
      x: sw * 0.7, y: floorY * 0.5, baseX: sw * 0.7, baseY: floorY * 0.5,
      phase: 0, type: "fairy", dir: 1, speed: 0, state: 0,
    });
    this._critters.push({
      x: sw * 0.3, y: floorY * 0.4, baseX: sw * 0.3, baseY: floorY * 0.4,
      phase: 2.5, type: "fairy", dir: 1, speed: 0, state: 0,
    });
  }

  private _update_broceliande(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;

    // Fireflies — glowing dots drifting lazily
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 0.8 + p.phase) * 0.3;
      p.y += p.vy + Math.cos(time * 0.6 + p.phase) * 0.2;
      // Wrap around
      if (p.x < -10) p.x = sw + 10;
      if (p.x > sw + 10) p.x = -10;

      const pulse = 0.4 + Math.sin(time * 2 + p.phase) * 0.3 + Math.sin(time * 5.3 + p.phase * 2) * 0.15;
      // Glow
      g.circle(p.x, p.y, p.radius * 3 + pulse * 2);
      g.fill({ color: p.color, alpha: pulse * 0.08 });
      // Core
      g.circle(p.x, p.y, p.radius * (0.5 + pulse * 0.5));
      g.fill({ color: p.color, alpha: pulse * 0.7 });
      // Bright center
      g.circle(p.x, p.y, p.radius * 0.3);
      g.fill({ color: 0xffffff, alpha: pulse * 0.5 });
    }

    // Ground mist drifting
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 40 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 80) {
        const mx = x + offset;
        const wave = Math.sin(time * 0.5 + x * 0.01) * 8;
        g.ellipse(mx % (sw + 200) - 100, m.y + wave, 60, m.height / 2);
        g.fill({ color: 0x446644, alpha: m.alpha });
      }
    }

    // --- Floating dandelion seeds ---
    for (let ds = 0; ds < 6; ds++) {
      const dsPhase = time * 0.15 + ds * 1.8;
      const dsX = ((dsPhase * 10 + ds * 70) % (sw + 40)) - 20;
      const dsY = this._floorY * 0.25 + ds * 20 - (time * 3 + ds * 30) % (this._floorY * 0.6);
      const dsWobble = Math.sin(time * 1.5 + ds * 2.1) * 4;
      const dsAlpha = 0.3 + Math.sin(time * 0.6 + ds) * 0.1;
      // Seed puff (tiny white dot with radiating lines)
      g.circle(dsX + dsWobble, dsY, 1);
      g.fill({ color: 0xffffff, alpha: dsAlpha * 0.7 });
      // Fuzzy lines
      for (let fl = 0; fl < 4; fl++) {
        const flAngle = (fl / 4) * Math.PI * 2 + time * 0.5 + ds;
        g.moveTo(dsX + dsWobble, dsY);
        g.lineTo(dsX + dsWobble + Math.cos(flAngle) * 3, dsY + Math.sin(flAngle) * 3);
        g.stroke({ color: 0xffffff, width: 0.4, alpha: dsAlpha * 0.35 });
      }
    }

    // --- Gentle light shaft movement ---
    for (let ls = 0; ls < 2; ls++) {
      const lsBaseX = sw * (0.3 + ls * 0.4);
      const lsSway = Math.sin(time * 0.15 + ls * 3) * sw * 0.08;
      const lsX = lsBaseX + lsSway;
      const lsAlpha = 0.015 + Math.sin(time * 0.3 + ls * 2) * 0.005;
      // Light beam (tapered from top)
      g.moveTo(lsX - 5, 0);
      g.lineTo(lsX - 25, this._floorY);
      g.lineTo(lsX + 25, this._floorY);
      g.lineTo(lsX + 5, 0);
      g.closePath();
      g.fill({ color: 0xffeeaa, alpha: lsAlpha });
    }

    // --- Small water stream sparkle ---
    for (let ss = 0; ss < 8; ss++) {
      const ssPhase = time * 2 + ss * 1.3;
      const ssT = (ssPhase * 0.1 + ss * 0.12) % 1;
      const ssX = sw * (0.3 + ssT * 0.4);
      const ssY = this._floorY + 5 + Math.sin(ssX * 0.05) * 2;
      const ssAlpha = 0.3 * (0.5 + Math.sin(time * 5 + ss * 2) * 0.5);
      if (ssAlpha > 0.1) {
        g.circle(ssX, ssY, 0.8);
        g.fill({ color: 0xffffff, alpha: ssAlpha });
      }
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // TINTAGEL CLIFFS — windswept coastal cliffs, crashing waves, ruins, gulls
  // =========================================================================

  private _build_tintagel(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // --- Stormy sky gradient (dark slate to grey-blue) ---
    const skyBands = 12;
    for (let i = 0; i < skyBands; i++) {
      const t = i / skyBands;
      const r1 = (a.skyTop >> 16) & 0xff, g1 = (a.skyTop >> 8) & 0xff, b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff, g2 = (a.skyBottom >> 8) & 0xff, b2 = a.skyBottom & 0xff;
      const r = Math.round(r1 + (r2 - r1) * t);
      const gc = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      const col = (r << 16) | (gc << 8) | b;
      g.rect(0, floorY * t, sw, floorY / skyBands + 1);
      g.fill({ color: col });
    }

    // --- Storm clouds ---
    const cloudPositions = [
      { x: sw * 0.1, y: floorY * 0.08, r: 45 },
      { x: sw * 0.25, y: floorY * 0.05, r: 55 },
      { x: sw * 0.4, y: floorY * 0.1, r: 40 },
      { x: sw * 0.6, y: floorY * 0.06, r: 50 },
      { x: sw * 0.8, y: floorY * 0.09, r: 48 },
      { x: sw * 0.15, y: floorY * 0.14, r: 35 },
      { x: sw * 0.5, y: floorY * 0.13, r: 42 },
      { x: sw * 0.75, y: floorY * 0.04, r: 52 },
      { x: sw * 0.9, y: floorY * 0.12, r: 38 },
    ];
    for (const c of cloudPositions) {
      g.circle(c.x, c.y, c.r);
      g.fill({ color: 0x3a4455, alpha: 0.5 });
      g.circle(c.x + c.r * 0.4, c.y - c.r * 0.15, c.r * 0.7);
      g.fill({ color: 0x445566, alpha: 0.4 });
    }

    // --- Distant ocean (mid-background) ---
    const seaY = floorY * 0.55;
    g.rect(0, seaY, sw, floorY - seaY);
    g.fill({ color: 0x334455 });
    // Horizon line
    g.rect(0, seaY, sw, 2);
    g.fill({ color: 0x667788, alpha: 0.5 });
    // Ocean wave lines
    for (let y = seaY + 10; y < floorY * 0.75; y += 8) {
      for (let x = 0; x < sw; x += 40) {
        const wx = x + Math.sin(y * 0.1) * 10;
        g.moveTo(wx, y);
        g.quadraticCurveTo(wx + 12, y - 2, wx + 24, y);
        g.stroke({ color: 0x556677, width: 1, alpha: 0.3 });
      }
    }

    // --- Cliff face (main fighting platform) ---
    const cliffTop = floorY * 0.7;
    // Cliff body — rugged stone
    g.moveTo(0, cliffTop);
    g.lineTo(sw, cliffTop);
    g.lineTo(sw, floorY + 20);
    g.lineTo(0, floorY + 20);
    g.closePath();
    g.fill({ color: 0x555550 });

    // Cliff edge — jagged top
    for (let x = 0; x < sw; x += 16) {
      const jag = Math.sin(x * 0.2) * 4 + Math.sin(x * 0.5) * 2;
      g.rect(x, cliffTop + jag - 3, 14, 6);
      g.fill({ color: 0x605850 });
    }

    // Rock strata lines
    for (let y = cliffTop + 12; y < floorY; y += 14) {
      g.moveTo(0, y + Math.sin(y * 0.1) * 3);
      for (let x = 0; x < sw; x += 30) {
        g.lineTo(x + 30, y + Math.sin((x + y) * 0.08) * 4);
      }
      g.stroke({ color: 0x4a4a44, width: 0.8, alpha: 0.4 });
    }

    // --- Castle ruins (broken walls, columns) ---
    // Left ruin wall
    const ruinLX = sw * 0.08;
    g.rect(ruinLX, cliffTop - 70, 14, 70);
    g.fill({ color: 0x6a6a62 });
    g.rect(ruinLX, cliffTop - 80, 20, 15);
    g.fill({ color: 0x6a6a62 });
    // Broken top (jagged)
    g.moveTo(ruinLX, cliffTop - 80);
    g.lineTo(ruinLX + 6, cliffTop - 90);
    g.lineTo(ruinLX + 12, cliffTop - 82);
    g.lineTo(ruinLX + 20, cliffTop - 88);
    g.lineTo(ruinLX + 20, cliffTop - 80);
    g.closePath();
    g.fill({ color: 0x6a6a62 });
    // Stone lines
    for (let y = cliffTop - 75; y < cliffTop; y += 10) {
      g.moveTo(ruinLX + 1, y).lineTo(ruinLX + 13, y);
      g.stroke({ color: 0x5a5a52, width: 0.6, alpha: 0.5 });
    }

    // Right ruin tower (taller, partially standing)
    const ruinRX = sw * 0.88;
    g.rect(ruinRX, cliffTop - 110, 18, 110);
    g.fill({ color: 0x6a6a62 });
    // Arched window
    g.roundRect(ruinRX + 4, cliffTop - 90, 10, 18, 5);
    g.fill({ color: 0x222233 });
    // Broken top
    g.moveTo(ruinRX, cliffTop - 110);
    g.lineTo(ruinRX + 4, cliffTop - 120);
    g.lineTo(ruinRX + 10, cliffTop - 112);
    g.lineTo(ruinRX + 14, cliffTop - 125);
    g.lineTo(ruinRX + 18, cliffTop - 115);
    g.lineTo(ruinRX + 18, cliffTop - 110);
    g.closePath();
    g.fill({ color: 0x6a6a62 });
    // Stone texture
    for (let y = cliffTop - 105; y < cliffTop; y += 10) {
      g.moveTo(ruinRX + 1, y).lineTo(ruinRX + 17, y);
      g.stroke({ color: 0x5a5a52, width: 0.6, alpha: 0.5 });
    }

    // Center arch ruin (broken gateway)
    const archX = sw * 0.48;
    // Left pillar
    g.rect(archX - 20, cliffTop - 60, 12, 60);
    g.fill({ color: 0x6a6a62 });
    // Right pillar
    g.rect(archX + 12, cliffTop - 55, 12, 55);
    g.fill({ color: 0x6a6a62 });
    // Partial arch (broken)
    { const r = 22; g.moveTo(archX + 2 + r * Math.cos(Math.PI), cliffTop - 50 + r * Math.sin(Math.PI)); }
    g.arc(archX + 2, cliffTop - 50, 22, Math.PI, Math.PI + 0.8);
    g.stroke({ color: 0x6a6a62, width: 10 });

    // Scattered rubble
    const rubble = [sw * 0.2, sw * 0.35, sw * 0.55, sw * 0.75];
    for (const rx of rubble) {
      for (let i = 0; i < 3; i++) {
        const bx = rx + i * 8 - 8;
        const bw = 6 + Math.sin(bx) * 3;
        const bh = 4 + Math.cos(bx) * 2;
        g.roundRect(bx, floorY - bh, bw, bh, 1);
        g.fill({ color: 0x666660, alpha: 0.6 });
      }
    }

    // --- Grass tufts on cliff edge ---
    for (let x = 10; x < sw; x += 20 + Math.sin(x * 0.3) * 8) {
      const gy = cliffTop - 2;
      for (let b = 0; b < 3; b++) {
        const bx = x + b * 3 - 3;
        g.moveTo(bx, gy);
        g.quadraticCurveTo(bx - 2, gy - 10, bx + 1, gy - 14);
        g.stroke({ color: 0x556633, width: 1.5, alpha: 0.5 });
      }
    }

    // --- Fighting platform (cliff top surface) ---
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    g.rect(0, floorY, sw, 3);
    g.fill({ color: a.groundHighlight, alpha: 0.5 });

    // Stone texture on ground
    let tileRow = 0;
    for (let y = floorY + 2; y < sh; y += 18) {
      const off = (tileRow % 2) * 20;
      for (let x = off; x < sw; x += 40) {
        g.roundRect(x + 1, y + 1, 38, 16, 2);
        g.stroke({ color: a.groundHighlight, width: 0.5, alpha: 0.2 });
      }
      tileRow++;
    }

    // --- Sea spray / fog ---
    g.rect(0, cliffTop * 0.8, sw, floorY * 0.3);
    g.fill({ color: a.fogColor, alpha: a.fogAlpha });

    // Register particles for sea spray
    for (let i = 0; i < 12; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: floorY * 0.6 + Math.random() * floorY * 0.3,
        vx: 0.5 + Math.random() * 0.8,
        vy: -0.3 - Math.random() * 0.5,
        radius: 1 + Math.random() * 2,
        alpha: 0.15 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        color: 0xccddee,
      });
    }

    // Register mist layers (sea fog)
    for (let i = 0; i < 3; i++) {
      this._mistLayers.push({
        y: floorY * 0.65 + i * 15,
        speed: 0.6 + i * 0.2,
        offset: i * 120,
        alpha: 0.04,
        height: 25 + i * 8,
      });
    }

    // --- Shipwreck hull on rocks below ---
    const wreckX = sw * 0.35;
    const wreckY = floorY * 0.65;
    // Broken hull frame
    g.moveTo(wreckX - 20, wreckY + 8);
    g.quadraticCurveTo(wreckX - 25, wreckY + 2, wreckX - 15, wreckY - 4);
    g.lineTo(wreckX + 18, wreckY - 6);
    g.quadraticCurveTo(wreckX + 25, wreckY, wreckX + 20, wreckY + 8);
    g.closePath();
    g.fill({ color: 0x3a2a18, alpha: 0.35 });
    g.moveTo(wreckX - 20, wreckY + 8);
    g.quadraticCurveTo(wreckX - 25, wreckY + 2, wreckX - 15, wreckY - 4);
    g.lineTo(wreckX + 18, wreckY - 6);
    g.quadraticCurveTo(wreckX + 25, wreckY, wreckX + 20, wreckY + 8);
    g.stroke({ color: 0x2a1a08, width: 1.5, alpha: 0.3 });
    // Ribs (exposed frame)
    for (let rib = 0; rib < 5; rib++) {
      const ribX = wreckX - 12 + rib * 7;
      g.moveTo(ribX, wreckY + 6);
      g.quadraticCurveTo(ribX + 1, wreckY - 2, ribX - 1, wreckY - 10 - rib);
      g.stroke({ color: 0x4a3a28, width: 1.5, alpha: 0.25 });
    }
    // Broken mast stump
    g.moveTo(wreckX, wreckY - 5);
    g.lineTo(wreckX + 2, wreckY - 18);
    g.stroke({ color: 0x3a2a18, width: 2.5, cap: "round", alpha: 0.3 });

    // --- Hanging rope bridge remains between ruins ---
    const ropeLX = sw * 0.15;
    const ropeRX = sw * 0.82;
    const ropeSag = 25;
    // Main rope lines (sagging)
    for (let rl = 0; rl < 2; rl++) {
      const ropeYOff = rl * 5;
      g.moveTo(ropeLX, cliffTop - 50 + ropeYOff);
      g.quadraticCurveTo(sw * 0.5, cliffTop - 50 + ropeSag + ropeYOff, ropeRX, cliffTop - 45 + ropeYOff);
      g.stroke({ color: 0x665544, width: 1.2, alpha: 0.15 });
    }
    // Broken planks dangling
    for (let pl = 0; pl < 6; pl++) {
      const plT = (pl + 0.5) / 7;
      const plX = ropeLX + (ropeRX - ropeLX) * plT;
      const plSag = Math.sin(plT * Math.PI) * ropeSag;
      const plY = cliffTop - 50 + plSag;
      if (pl % 2 === 0) {
        // Plank present
        g.rect(plX - 3, plY, 6, 2);
        g.fill({ color: 0x6a5a3a, alpha: 0.15 });
      }
      // Rope segment
      g.moveTo(plX, plY);
      g.lineTo(plX, plY + 5 + pl);
      g.stroke({ color: 0x665544, width: 0.6, alpha: 0.1 });
    }

    // --- Barnacles on cliff face ---
    const barnacleZones = [
      { x: sw * 0.05, y: cliffTop + 20 }, { x: sw * 0.2, y: cliffTop + 35 },
      { x: sw * 0.6, y: cliffTop + 25 }, { x: sw * 0.85, y: cliffTop + 30 },
      { x: sw * 0.45, y: cliffTop + 40 },
    ];
    for (const bz of barnacleZones) {
      for (let bn = 0; bn < 5; bn++) {
        const bnX = bz.x + (bn - 2) * 3 + Math.sin(bn * 1.5) * 2;
        const bnY = bz.y + Math.cos(bn * 2) * 3;
        g.circle(bnX, bnY, 1.5 + Math.sin(bn) * 0.5);
        g.fill({ color: 0x777770, alpha: 0.25 });
        g.circle(bnX, bnY, 1.5 + Math.sin(bn) * 0.5);
        g.stroke({ color: 0x666660, width: 0.5, alpha: 0.2 });
      }
    }

    // --- Memorial stone with celtic knotwork ---
    const memX = sw * 0.62;
    const memY = floorY - 18;
    // Stone slab
    g.moveTo(memX - 8, floorY);
    g.lineTo(memX - 6, memY);
    g.quadraticCurveTo(memX, memY - 5, memX + 6, memY);
    g.lineTo(memX + 8, floorY);
    g.closePath();
    g.fill({ color: 0x666660, alpha: 0.5 });
    g.stroke({ color: 0x555550, width: 1, alpha: 0.4 });
    // Celtic knotwork (interlocking loops)
    g.ellipse(memX, memY + 6, 4, 4);
    g.stroke({ color: 0x889988, width: 0.8, alpha: 0.25 });
    g.ellipse(memX - 2, memY + 6, 3, 3);
    g.stroke({ color: 0x889988, width: 0.6, alpha: 0.2 });
    g.ellipse(memX + 2, memY + 6, 3, 3);
    g.stroke({ color: 0x889988, width: 0.6, alpha: 0.2 });
    // Cross at top
    g.moveTo(memX, memY);
    g.lineTo(memX, memY + 5);
    g.stroke({ color: 0x889988, width: 0.8, alpha: 0.2 });
    g.moveTo(memX - 3, memY + 2);
    g.lineTo(memX + 3, memY + 2);
    g.stroke({ color: 0x889988, width: 0.8, alpha: 0.2 });

    // --- Nesting holes in cliff face ---
    const nestingHoles = [
      { x: sw * 0.12, y: cliffTop + 15 }, { x: sw * 0.32, y: cliffTop + 22 },
      { x: sw * 0.55, y: cliffTop + 12 }, { x: sw * 0.78, y: cliffTop + 18 },
      { x: sw * 0.92, y: cliffTop + 28 },
    ];
    for (const nh of nestingHoles) {
      g.ellipse(nh.x, nh.y, 4, 3);
      g.fill({ color: 0x333330, alpha: 0.3 });
      g.ellipse(nh.x, nh.y, 4, 3);
      g.stroke({ color: 0x4a4a44, width: 0.6, alpha: 0.25 });
    }

    // --- Unique critter: seagulls soaring on the coastal wind ---
    this._critters.push({
      x: sw * 0.2, y: floorY * 0.15, baseX: sw * 0.5, baseY: floorY * 0.15,
      phase: 0, type: "seagull", dir: 1, speed: 0.5, state: 0,
    });
    this._critters.push({
      x: sw * 0.7, y: floorY * 0.25, baseX: sw * 0.5, baseY: floorY * 0.25,
      phase: 1.8, type: "seagull", dir: -1, speed: 0.4, state: 0,
    });
  }

  private _update_tintagel(time: number): void {
    const g = this._animGfx;
    const sw = this._sw;
    const floorY = this._floorY;

    // Ocean waves (animated undulation on the sea surface)
    const seaY = floorY * 0.55;
    for (let y = seaY + 4; y < floorY * 0.72; y += 6) {
      const waveOffset = time * 30 + y * 2;
      g.moveTo(0, y);
      for (let x = 0; x < sw; x += 8) {
        const wy = y + Math.sin((x + waveOffset) * 0.04) * 2.5;
        g.lineTo(x, wy);
      }
      g.stroke({ color: 0x667788, width: 1, alpha: 0.15 + Math.sin(time + y * 0.1) * 0.05 });
    }

    // White wave crests (foam lines)
    for (let i = 0; i < 3; i++) {
      const wy = seaY + 15 + i * 20;
      const wavePhase = time * (1.2 + i * 0.3);
      for (let x = 0; x < sw; x += 60) {
        const cx = x + Math.sin(wavePhase + x * 0.01) * 20;
        const cy = wy + Math.sin(wavePhase * 1.5 + x * 0.02) * 3;
        g.moveTo(cx, cy);
        g.lineTo(cx + 18, cy - 1);
        g.stroke({ color: 0xccddee, width: 1.5, alpha: 0.15 + Math.sin(time * 2 + i + x * 0.01) * 0.1 });
      }
    }

    // Sea spray particles
    for (const p of this._particles) {
      p.x += p.vx + Math.sin(time * 1.5 + p.phase) * 0.5;
      p.y += p.vy + Math.sin(time + p.phase) * 0.3;
      // Reset when drifted off
      if (p.x > sw + 20 || p.y < floorY * 0.3) {
        p.x = Math.random() * sw * 0.3;
        p.y = floorY * 0.6 + Math.random() * floorY * 0.25;
      }
      const fade = 0.5 + Math.sin(time * 3 + p.phase) * 0.3;
      g.circle(p.x, p.y, p.radius * fade);
      g.fill({ color: p.color, alpha: p.alpha * fade });
    }

    // Sea fog drifting
    for (const m of this._mistLayers) {
      const offset = (time * m.speed * 25 + m.offset) % (sw + 200) - 100;
      for (let x = -100; x < sw + 100; x += 90) {
        const mx = (x + offset) % (sw + 200) - 100;
        const wave = Math.sin(time * 0.4 + x * 0.008) * 5;
        g.ellipse(mx, m.y + wave, 70, m.height / 2);
        g.fill({ color: 0x889999, alpha: m.alpha });
      }
    }

    // --- Lightning flashes during storm ---
    {
      const ltPhase = (time * 0.15) % 12;
      if (ltPhase < 0.12) {
        // Brief full-screen flash
        const flashAlpha = 0.08 * (1 - ltPhase / 0.12);
        g.rect(0, 0, sw, floorY);
        g.fill({ color: 0xccddff, alpha: flashAlpha });
        // Lightning bolt
        const boltX = sw * 0.45;
        g.moveTo(boltX, floorY * 0.05);
        g.lineTo(boltX - 8, floorY * 0.2);
        g.lineTo(boltX + 4, floorY * 0.22);
        g.lineTo(boltX - 5, floorY * 0.38);
        g.lineTo(boltX + 2, floorY * 0.35);
        g.lineTo(boltX - 10, floorY * 0.55);
        g.stroke({ color: 0xccddff, width: 2, alpha: flashAlpha * 3 });
        // Thinner bright core
        g.moveTo(boltX, floorY * 0.05);
        g.lineTo(boltX - 8, floorY * 0.2);
        g.lineTo(boltX + 4, floorY * 0.22);
        g.lineTo(boltX - 5, floorY * 0.38);
        g.stroke({ color: 0xeeeeff, width: 1, alpha: flashAlpha * 4 });
      }
      // Second bolt at different timing
      const lt2Phase = (time * 0.15 + 5.5) % 12;
      if (lt2Phase < 0.1) {
        const flash2Alpha = 0.06 * (1 - lt2Phase / 0.1);
        g.rect(0, 0, sw, floorY);
        g.fill({ color: 0xccddff, alpha: flash2Alpha });
        const bolt2X = sw * 0.72;
        g.moveTo(bolt2X, floorY * 0.03);
        g.lineTo(bolt2X + 6, floorY * 0.18);
        g.lineTo(bolt2X - 3, floorY * 0.22);
        g.lineTo(bolt2X + 8, floorY * 0.4);
        g.stroke({ color: 0xccddff, width: 1.5, alpha: flash2Alpha * 3 });
      }
    }

    // --- Rain effect ---
    for (let ri = 0; ri < 40; ri++) {
      const rainSeed = ri * 137.5 + time * 200;
      const rainX = ((rainSeed * 0.37) % sw);
      const rainY = ((rainSeed * 0.53 + ri * 47) % (floorY * 0.9));
      const rainLen = 6 + (ri % 4) * 2;
      const rainAlpha = 0.08 + (ri % 5) * 0.01;
      // Thin vertical line with slight wind angle
      g.moveTo(rainX, rainY);
      g.lineTo(rainX + 2, rainY + rainLen);
      g.stroke({ color: 0xaabbcc, width: 0.7, alpha: rainAlpha });
    }

    // --- Stronger gusting wind particles ---
    for (let wp = 0; wp < 10; wp++) {
      const wpPhase = time * 1.2 + wp * 2.7;
      const wpX = ((wpPhase * 50 + wp * 80) % (sw + 60)) - 30;
      const wpY = floorY * (0.2 + (wp % 5) * 0.15) + Math.sin(time * 2 + wp * 1.3) * 8;
      const wpAlpha = 0.1 + Math.sin(time * 3 + wp) * 0.04;
      // Wind streak
      g.moveTo(wpX, wpY);
      g.lineTo(wpX + 12 + Math.sin(time * 4 + wp) * 3, wpY + Math.sin(time * 2 + wp * 0.5) * 2);
      g.stroke({ color: 0xccddee, width: 0.8, alpha: wpAlpha });
    }

    this._drawSpectators(g, time);
    this._drawCritters(g, time);
  }

  // =========================================================================
  // Critter drawing helpers — each draws a tiny animated creature
  // =========================================================================

  private _drawCritters(g: Graphics, time: number): void {
    for (const c of this._critters) {
      switch (c.type) {
        case "cat": this._drawCat(g, c, time); break;
        case "swan": this._drawSwan(g, c, time); break;
        case "owl": this._drawOwl(g, c, time); break;
        case "fairy": this._drawFairy(g, c, time); break;
        case "seagull": this._drawSeagull(g, c, time); break;
        case "mouse": this._drawMouse(g, c, time); break;
        case "raven": this._drawRaven(g, c, time); break;
        case "dove": this._drawDove(g, c, time); break;
        case "wolf": this._drawWolf(g, c, time); break;
        case "fish": this._drawFish(g, c, time); break;
        case "mini_dragon": this._drawMiniDragon(g, c, time); break;
        case "moth": this._drawMoth(g, c, time); break;
        case "crab": this._drawCrab(g, c, time); break;
        case "bat": this._drawBat(g, c, time); break;
        case "crow": this._drawCrow(g, c, time); break;
      }
    }
  }

  // Cat: walks back and forth, tail swishes, ears poke up
  private _drawCat(g: Graphics, c: Critter, time: number): void {
    // Patrol back and forth
    c.x += c.speed * c.dir;
    if (c.x > c.baseX + 120) c.dir = -1;
    if (c.x < c.baseX - 120) c.dir = 1;
    const x = c.x, y = c.y;
    const d = c.dir;
    const walk = Math.sin(time * 4 + c.phase) * 1.5; // bobbing
    const tailSwish = Math.sin(time * 2.5 + c.phase) * 6;
    // Body (oval)
    g.ellipse(x, y - 5 + walk * 0.3, 10, 6);
    g.fill({ color: 0x885533 });
    // Head
    g.circle(x + 9 * d, y - 9 + walk * 0.2, 5);
    g.fill({ color: 0x885533 });
    // Ears (triangles)
    g.moveTo(x + 7 * d, y - 14 + walk * 0.2);
    g.lineTo(x + 5 * d, y - 8 + walk * 0.2);
    g.lineTo(x + 10 * d, y - 9 + walk * 0.2);
    g.closePath();
    g.fill({ color: 0x885533 });
    g.moveTo(x + 12 * d, y - 13 + walk * 0.2);
    g.lineTo(x + 10 * d, y - 8 + walk * 0.2);
    g.lineTo(x + 14 * d, y - 8 + walk * 0.2);
    g.closePath();
    g.fill({ color: 0x885533 });
    // Eyes (tiny dots)
    g.circle(x + 11 * d, y - 10 + walk * 0.2, 1);
    g.fill({ color: 0x44ff44, alpha: 0.9 });
    // Tail (curved line)
    g.moveTo(x - 10 * d, y - 5);
    g.lineTo(x - 16 * d + tailSwish * d * 0.3, y - 12);
    g.stroke({ color: 0x885533, width: 2 });
    // Legs (small lines)
    const legBob1 = Math.sin(time * 4 + c.phase) * 2;
    const legBob2 = Math.sin(time * 4 + c.phase + Math.PI) * 2;
    g.moveTo(x - 5, y).lineTo(x - 5 + legBob1, y + 4);
    g.stroke({ color: 0x774422, width: 1.5 });
    g.moveTo(x + 5, y).lineTo(x + 5 + legBob2, y + 4);
    g.stroke({ color: 0x774422, width: 1.5 });
  }

  // Swan: glides gracefully across water
  private _drawSwan(g: Graphics, c: Critter, time: number): void {
    c.x += c.speed * c.dir;
    if (c.x > this._sw + 30) { c.x = -30; }
    if (c.x < -30) { c.x = this._sw + 30; }
    const x = c.x, y = c.y;
    const bob = Math.sin(time * 1.2 + c.phase) * 2;
    // Body (white oval)
    g.ellipse(x, y + bob, 14, 8);
    g.fill({ color: 0xeeeeff, alpha: 0.85 });
    // Neck (curved upward)
    g.moveTo(x + 10 * c.dir, y - 2 + bob);
    g.quadraticCurveTo(x + 14 * c.dir, y - 18 + bob, x + 8 * c.dir, y - 22 + bob);
    g.stroke({ color: 0xeeeeff, width: 3 });
    // Head
    g.circle(x + 8 * c.dir, y - 23 + bob, 3);
    g.fill({ color: 0xeeeeff });
    // Beak
    g.moveTo(x + 8 * c.dir, y - 23 + bob);
    g.lineTo(x + 14 * c.dir, y - 22 + bob);
    g.stroke({ color: 0xdd8833, width: 1.5 });
    // Reflection in water (faint)
    g.ellipse(x, y + 10 + bob * 0.3, 12, 4);
    g.fill({ color: 0xccccdd, alpha: 0.12 });
  }

  // Owl: perched, occasionally blinks, head sways gently
  private _drawOwl(g: Graphics, c: Critter, time: number): void {
    const x = c.x, y = c.y;
    const headTilt = Math.sin(time * 0.6 + c.phase) * 2;
    // Body (round)
    g.ellipse(x, y, 8, 10);
    g.fill({ color: 0x886644 });
    // Chest (lighter)
    g.ellipse(x, y + 2, 5, 7);
    g.fill({ color: 0xbbaa88 });
    // Head
    g.circle(x + headTilt, y - 12, 7);
    g.fill({ color: 0x886644 });
    // Ear tufts
    g.moveTo(x - 5 + headTilt, y - 18);
    g.lineTo(x - 3 + headTilt, y - 12);
    g.lineTo(x - 7 + headTilt, y - 13);
    g.closePath();
    g.fill({ color: 0x886644 });
    g.moveTo(x + 5 + headTilt, y - 18);
    g.lineTo(x + 3 + headTilt, y - 12);
    g.lineTo(x + 7 + headTilt, y - 13);
    g.closePath();
    g.fill({ color: 0x886644 });
    // Eyes — blink every ~4 seconds
    const blink = Math.sin(time * 1.6 + c.phase);
    const eyeH = blink > 0.92 ? 0.5 : 2.5;
    g.ellipse(x - 3 + headTilt, y - 13, 2.5, eyeH);
    g.fill({ color: 0xffdd00 });
    g.ellipse(x + 3 + headTilt, y - 13, 2.5, eyeH);
    g.fill({ color: 0xffdd00 });
    // Pupils
    if (eyeH > 1) {
      g.circle(x - 3 + headTilt, y - 13, 1);
      g.fill({ color: 0x111100 });
      g.circle(x + 3 + headTilt, y - 13, 1);
      g.fill({ color: 0x111100 });
    }
  }

  // Fairy: glowing orb with wings, moves in figure-eight
  private _drawFairy(g: Graphics, c: Critter, time: number): void {
    const t = time * 0.8 + c.phase;
    c.x = c.baseX + Math.sin(t) * 40;
    c.y = c.baseY + Math.sin(t * 2) * 20;
    const x = c.x, y = c.y;
    // Outer glow
    g.circle(x, y, 10);
    g.fill({ color: 0x88ffaa, alpha: 0.08 + Math.sin(time * 3) * 0.03 });
    g.circle(x, y, 6);
    g.fill({ color: 0xaaffcc, alpha: 0.15 });
    // Core
    g.circle(x, y, 2.5);
    g.fill({ color: 0xeeffee, alpha: 0.9 });
    // Wings (fluttering)
    const wingFlap = Math.sin(time * 12 + c.phase) * 3;
    g.ellipse(x - 4, y - 1 - wingFlap, 4, 2.5);
    g.fill({ color: 0xccffdd, alpha: 0.5 });
    g.ellipse(x + 4, y - 1 + wingFlap, 4, 2.5);
    g.fill({ color: 0xccffdd, alpha: 0.5 });
    // Trail sparkle
    const trailX = c.baseX + Math.sin(t - 0.3) * 40;
    const trailY = c.baseY + Math.sin((t - 0.3) * 2) * 20;
    g.circle(trailX, trailY, 1.5);
    g.fill({ color: 0xaaffbb, alpha: 0.3 });
  }

  // Seagull: soars across the sky with wing flaps
  private _drawSeagull(g: Graphics, c: Critter, time: number): void {
    c.x += c.speed * c.dir;
    if (c.x > this._sw + 40) c.x = -40;
    if (c.x < -40) c.x = this._sw + 40;
    const x = c.x, y = c.y + Math.sin(time * 1.0 + c.phase) * 8;
    const wingAngle = Math.sin(time * 3 + c.phase) * 0.4;
    // Body
    g.ellipse(x, y, 6, 3);
    g.fill({ color: 0xdddddd });
    // Wings (V shape that flaps)
    g.moveTo(x, y);
    g.lineTo(x - 14, y - 8 - wingAngle * 12);
    g.lineTo(x - 18, y - 4 - wingAngle * 8);
    g.stroke({ color: 0xdddddd, width: 2 });
    g.moveTo(x, y);
    g.lineTo(x + 14, y - 8 - wingAngle * 12);
    g.lineTo(x + 18, y - 4 - wingAngle * 8);
    g.stroke({ color: 0xdddddd, width: 2 });
  }

  // Mouse: tiny, scurries fast, pauses to sniff
  private _drawMouse(g: Graphics, c: Critter, time: number): void {
    // Scurry behavior: run, pause, run
    const cycle = (time * 0.5 + c.phase) % 6;
    if (cycle < 4) { // running
      c.x += c.speed * c.dir * 1.8;
    }
    // else paused (sniffing)
    if (c.x > c.baseX + 140) c.dir = -1;
    if (c.x < c.baseX - 140) c.dir = 1;
    const x = c.x, y = c.y;
    const d = c.dir;
    const scurry = cycle < 4 ? Math.sin(time * 12) * 1 : 0;
    // Body
    g.ellipse(x, y - 2 + scurry * 0.3, 5, 3);
    g.fill({ color: 0x887766 });
    // Head
    g.circle(x + 5 * d, y - 3 + scurry * 0.2, 3);
    g.fill({ color: 0x887766 });
    // Ears
    g.circle(x + 4 * d, y - 6 + scurry * 0.2, 2);
    g.fill({ color: 0xccaa99 });
    g.circle(x + 7 * d, y - 5 + scurry * 0.2, 2);
    g.fill({ color: 0xccaa99 });
    // Eye
    g.circle(x + 6 * d, y - 3 + scurry * 0.2, 0.8);
    g.fill({ color: 0x111111 });
    // Tail
    g.moveTo(x - 5 * d, y - 2);
    g.quadraticCurveTo(x - 10 * d, y - 6, x - 13 * d, y - 3);
    g.stroke({ color: 0xaa9988, width: 1 });
  }

  // Raven: circles overhead ominously
  private _drawRaven(g: Graphics, c: Critter, time: number): void {
    const t = time * 0.4 + c.phase;
    c.x = c.baseX + Math.cos(t) * 80;
    c.y = c.baseY + Math.sin(t) * 25 + Math.sin(time * 0.7) * 5;
    const x = c.x, y = c.y;
    const wingBeat = Math.sin(time * 2.5 + c.phase) * 0.5;
    // Body
    g.ellipse(x, y, 7, 4);
    g.fill({ color: 0x222233 });
    // Wings
    g.moveTo(x - 3, y);
    g.lineTo(x - 16, y - 6 - wingBeat * 10);
    g.lineTo(x - 20, y - 2 - wingBeat * 6);
    g.lineTo(x - 5, y + 1);
    g.closePath();
    g.fill({ color: 0x1a1a2a });
    g.moveTo(x + 3, y);
    g.lineTo(x + 16, y - 6 - wingBeat * 10);
    g.lineTo(x + 20, y - 2 - wingBeat * 6);
    g.lineTo(x + 5, y + 1);
    g.closePath();
    g.fill({ color: 0x1a1a2a });
    // Beak
    const bDir = Math.cos(t) > 0 ? 1 : -1;
    g.moveTo(x + 7 * bDir, y - 1);
    g.lineTo(x + 11 * bDir, y);
    g.stroke({ color: 0x444444, width: 1.5 });
  }

  // Dove: perched, occasionally flutters wings
  private _drawDove(g: Graphics, c: Critter, time: number): void {
    const x = c.x, y = c.y;
    const flutter = Math.sin(time * 1.8 + c.phase);
    const wingUp = flutter > 0.85 ? (flutter - 0.85) * 40 : 0;
    // Body
    g.ellipse(x, y, 7, 5);
    g.fill({ color: 0xeeeeff });
    // Head
    g.circle(x + 6 * c.dir, y - 5, 4);
    g.fill({ color: 0xeeeeff });
    // Eye
    g.circle(x + 7 * c.dir, y - 6, 1);
    g.fill({ color: 0x222222 });
    // Beak
    g.moveTo(x + 9 * c.dir, y - 5);
    g.lineTo(x + 12 * c.dir, y - 4);
    g.stroke({ color: 0xddaa55, width: 1 });
    // Wings (flutter occasionally)
    if (wingUp > 0) {
      g.moveTo(x - 3, y - 2);
      g.lineTo(x - 12, y - 8 - wingUp);
      g.lineTo(x - 6, y - 1);
      g.closePath();
      g.fill({ color: 0xddddee });
      g.moveTo(x + 3, y - 2);
      g.lineTo(x + 12, y - 8 - wingUp);
      g.lineTo(x + 6, y - 1);
      g.closePath();
      g.fill({ color: 0xddddee });
    }
    // Tail feathers
    g.moveTo(x - 6 * c.dir, y + 1);
    g.lineTo(x - 12 * c.dir, y + 3);
    g.lineTo(x - 10 * c.dir, y - 1);
    g.closePath();
    g.fill({ color: 0xddddee });
  }

  // Wolf: silhouette sitting on a distant hill, head tilts up to howl periodically
  private _drawWolf(g: Graphics, c: Critter, time: number): void {
    const x = c.x, y = c.y;
    // Howl cycle: every ~8 seconds, head tilts up
    const howlCycle = (time * 0.8 + c.phase) % 8;
    const howling = howlCycle > 6.5;
    // Body silhouette (sitting pose)
    g.ellipse(x, y - 4, 8, 10);
    g.fill({ color: 0x222233, alpha: 0.7 });
    // Head
    const hx = x + 4 * c.dir;
    const hy = y - 16 + (howling ? -3 : 0);
    g.circle(hx, hy, 5);
    g.fill({ color: 0x222233, alpha: 0.7 });
    // Snout
    g.moveTo(hx, hy);
    g.lineTo(hx + 7 * c.dir, hy + (howling ? -4 : 1));
    g.stroke({ color: 0x222233, width: 3, alpha: 0.7 });
    // Ears
    g.moveTo(hx - 3, hy - 4);
    g.lineTo(hx - 2, hy - 9);
    g.lineTo(hx + 1, hy - 4);
    g.closePath();
    g.fill({ color: 0x222233, alpha: 0.7 });
    g.moveTo(hx + 3, hy - 4);
    g.lineTo(hx + 4, hy - 9);
    g.lineTo(hx + 6, hy - 4);
    g.closePath();
    g.fill({ color: 0x222233, alpha: 0.7 });
    // Howl lines (when howling)
    if (howling) {
      for (let i = 0; i < 3; i++) {
        const arc = 6 + i * 4;
        const aAlpha = 0.2 - i * 0.06;
        g.arc(hx + 7 * c.dir, hy - 4, arc, -0.8, -0.2);
        g.stroke({ color: 0xaabbcc, width: 1, alpha: aAlpha });
      }
    }
  }

  // Fish: koi swimming under water surface
  private _drawFish(g: Graphics, c: Critter, time: number): void {
    c.x += c.speed * c.dir;
    if (c.x > this._sw + 20) c.x = -20;
    if (c.x < -20) c.x = this._sw + 20;
    const x = c.x;
    const y = c.y + Math.sin(time * 1.5 + c.phase) * 4;
    const d = c.dir;
    const tailWag = Math.sin(time * 4 + c.phase) * 3;
    // Body (oval)
    g.ellipse(x, y, 8, 4);
    g.fill({ color: c.state === 0 ? 0xee6622 : 0xeedddd, alpha: 0.55 });
    // Tail
    g.moveTo(x - 7 * d, y);
    g.lineTo(x - 13 * d, y - 4 + tailWag);
    g.lineTo(x - 13 * d, y + 4 + tailWag);
    g.closePath();
    g.fill({ color: c.state === 0 ? 0xcc4411 : 0xddcccc, alpha: 0.45 });
    // Eye
    g.circle(x + 4 * d, y - 1, 1);
    g.fill({ color: 0x111111, alpha: 0.5 });
  }

  // Mini dragon: circles a point in the background sky
  private _drawMiniDragon(g: Graphics, c: Critter, time: number): void {
    const t = time * 0.6 + c.phase;
    c.x = c.baseX + Math.cos(t) * 55;
    c.y = c.baseY + Math.sin(t) * 20 + Math.sin(time * 1.2) * 5;
    const x = c.x, y = c.y;
    const d = Math.cos(t) > 0 ? 1 : -1;
    const wingFlap = Math.sin(time * 4 + c.phase) * 0.6;
    // Body
    g.ellipse(x, y, 9, 5);
    g.fill({ color: 0xaa3311, alpha: 0.7 });
    // Wings
    g.moveTo(x - 4, y - 2);
    g.lineTo(x - 18, y - 10 - wingFlap * 15);
    g.lineTo(x - 8, y + 1);
    g.closePath();
    g.fill({ color: 0xcc4422, alpha: 0.5 });
    g.moveTo(x + 4, y - 2);
    g.lineTo(x + 18, y - 10 - wingFlap * 15);
    g.lineTo(x + 8, y + 1);
    g.closePath();
    g.fill({ color: 0xcc4422, alpha: 0.5 });
    // Head
    g.circle(x + 8 * d, y - 4, 4);
    g.fill({ color: 0xaa3311, alpha: 0.7 });
    // Tail
    g.moveTo(x - 8 * d, y + 1);
    g.quadraticCurveTo(x - 16 * d, y + 8, x - 20 * d, y + 3);
    g.stroke({ color: 0xaa3311, width: 2, alpha: 0.6 });
    // Fire puff (small)
    const firePuff = Math.sin(time * 3) > 0.7;
    if (firePuff) {
      g.circle(x + 13 * d, y - 5, 3);
      g.fill({ color: 0xff6600, alpha: 0.4 });
      g.circle(x + 15 * d, y - 4, 2);
      g.fill({ color: 0xffaa00, alpha: 0.3 });
    }
  }

  // Moth: flutters erratically around a light source
  private _drawMoth(g: Graphics, c: Critter, time: number): void {
    const t = time * 2.5 + c.phase;
    c.x = c.baseX + Math.sin(t) * 14 + Math.sin(t * 2.3) * 8;
    c.y = c.baseY + Math.cos(t * 1.7) * 10 + Math.sin(t * 0.9) * 5;
    const x = c.x, y = c.y;
    const wingFlap = Math.sin(time * 15 + c.phase) * 3;
    // Wings
    g.ellipse(x - 3, y - wingFlap * 0.3, 3, 2 + Math.abs(wingFlap) * 0.3);
    g.fill({ color: 0xccbb99, alpha: 0.6 });
    g.ellipse(x + 3, y + wingFlap * 0.3, 3, 2 + Math.abs(wingFlap) * 0.3);
    g.fill({ color: 0xccbb99, alpha: 0.6 });
    // Body
    g.ellipse(x, y, 1.5, 3);
    g.fill({ color: 0xaa9977, alpha: 0.7 });
  }

  // Crab: scuttles sideways across the sand
  private _drawCrab(g: Graphics, c: Critter, time: number): void {
    // Scuttle sideways
    c.x += c.speed * c.dir;
    if (c.x > c.baseX + 100) c.dir = -1;
    if (c.x < c.baseX - 100) c.dir = 1;
    const x = c.x, y = c.y;
    const scuttle = Math.sin(time * 6 + c.phase) * 1;
    // Shell (wide oval)
    g.ellipse(x, y - 3 + scuttle, 7, 4);
    g.fill({ color: 0xcc5533 });
    // Eye stalks
    g.moveTo(x - 3, y - 6 + scuttle);
    g.lineTo(x - 4, y - 9 + scuttle);
    g.stroke({ color: 0xcc5533, width: 1 });
    g.circle(x - 4, y - 9 + scuttle, 1);
    g.fill({ color: 0x111111 });
    g.moveTo(x + 3, y - 6 + scuttle);
    g.lineTo(x + 4, y - 9 + scuttle);
    g.stroke({ color: 0xcc5533, width: 1 });
    g.circle(x + 4, y - 9 + scuttle, 1);
    g.fill({ color: 0x111111 });
    // Claws
    const clawOpen = Math.sin(time * 2 + c.phase) * 2;
    g.moveTo(x - 7, y - 2 + scuttle);
    g.lineTo(x - 13, y - 4 + scuttle - clawOpen);
    g.stroke({ color: 0xcc5533, width: 2 });
    g.moveTo(x - 13, y - 4 + scuttle - clawOpen);
    g.lineTo(x - 11, y - 6 + scuttle - clawOpen);
    g.stroke({ color: 0xcc5533, width: 1.5 });
    g.moveTo(x + 7, y - 2 + scuttle);
    g.lineTo(x + 13, y - 4 + scuttle + clawOpen);
    g.stroke({ color: 0xcc5533, width: 2 });
    g.moveTo(x + 13, y - 4 + scuttle + clawOpen);
    g.lineTo(x + 11, y - 6 + scuttle + clawOpen);
    g.stroke({ color: 0xcc5533, width: 1.5 });
    // Legs (3 per side, wiggling)
    for (let i = 0; i < 3; i++) {
      const legPhase = Math.sin(time * 6 + c.phase + i * 1.2) * 2;
      g.moveTo(x - 4 - i * 2, y + scuttle);
      g.lineTo(x - 7 - i * 2 + legPhase, y + 4 + scuttle);
      g.stroke({ color: 0xbb4422, width: 1 });
      g.moveTo(x + 4 + i * 2, y + scuttle);
      g.lineTo(x + 7 + i * 2 - legPhase, y + 4 + scuttle);
      g.stroke({ color: 0xbb4422, width: 1 });
    }
  }

  // Bat: erratic fluttering from a window
  private _drawBat(g: Graphics, c: Critter, time: number): void {
    const t = time * 1.5 + c.phase;
    c.x = c.baseX + Math.sin(t * 0.7) * 60 + Math.sin(t * 1.3) * 20;
    c.y = c.baseY + Math.sin(t * 0.5) * 25 + Math.cos(t * 1.1) * 10;
    const x = c.x, y = c.y;
    const wingFlap = Math.sin(time * 8 + c.phase);
    // Body (tiny)
    g.ellipse(x, y, 3, 4);
    g.fill({ color: 0x222222, alpha: 0.8 });
    // Wings (jagged membrane)
    const wSpan = 12 + wingFlap * 6;
    g.moveTo(x - 2, y - 1);
    g.lineTo(x - wSpan, y - 4 - wingFlap * 4);
    g.lineTo(x - wSpan * 0.7, y);
    g.lineTo(x - wSpan * 0.4, y - 2 - wingFlap * 2);
    g.lineTo(x - 2, y + 2);
    g.closePath();
    g.fill({ color: 0x1a1a1a, alpha: 0.7 });
    g.moveTo(x + 2, y - 1);
    g.lineTo(x + wSpan, y - 4 - wingFlap * 4);
    g.lineTo(x + wSpan * 0.7, y);
    g.lineTo(x + wSpan * 0.4, y - 2 - wingFlap * 2);
    g.lineTo(x + 2, y + 2);
    g.closePath();
    g.fill({ color: 0x1a1a1a, alpha: 0.7 });
    // Ears
    g.moveTo(x - 2, y - 4);
    g.lineTo(x - 3, y - 7);
    g.lineTo(x, y - 4);
    g.closePath();
    g.fill({ color: 0x222222, alpha: 0.8 });
    g.moveTo(x + 2, y - 4);
    g.lineTo(x + 3, y - 7);
    g.lineTo(x, y - 4);
    g.closePath();
    g.fill({ color: 0x222222, alpha: 0.8 });
  }

  // Crow: walks on ground, hops occasionally, pecks
  private _drawCrow(g: Graphics, c: Critter, time: number): void {
    // Hop/peck behavior
    const cycle = (time * 0.6 + c.phase) % 5;
    const hopping = cycle > 3.5 && cycle < 4.2;
    const pecking = cycle > 4.2;
    const hopY = hopping ? -6 : 0;
    c.x += c.speed * c.dir * (hopping ? 2 : 0.5);
    if (c.x > c.baseX + 100) c.dir = -1;
    if (c.x < c.baseX - 100) c.dir = 1;
    const x = c.x, y = c.y + hopY;
    const d = c.dir;
    // Body
    g.ellipse(x, y - 4, 7, 5);
    g.fill({ color: 0x111118 });
    // Head
    const headY = pecking ? y - 4 : y - 10;
    const headX = pecking ? x + 8 * d : x + 5 * d;
    g.circle(headX, headY, 4);
    g.fill({ color: 0x111118 });
    // Beak
    g.moveTo(headX + 3 * d, headY);
    g.lineTo(headX + 8 * d, headY + (pecking ? 2 : 1));
    g.stroke({ color: 0x444400, width: 1.5 });
    // Eye
    g.circle(headX + 2 * d, headY - 1, 1);
    g.fill({ color: 0x444444 });
    // Tail feathers
    g.moveTo(x - 6 * d, y - 5);
    g.lineTo(x - 12 * d, y - 8);
    g.lineTo(x - 10 * d, y - 3);
    g.closePath();
    g.fill({ color: 0x0a0a12 });
    // Legs
    if (!hopping) {
      g.moveTo(x - 2, y).lineTo(x - 2, y + 5);
      g.stroke({ color: 0x333333, width: 1 });
      g.moveTo(x + 2, y).lineTo(x + 2, y + 5);
      g.stroke({ color: 0x333333, width: 1 });
    }
  }

  // =========================================================================
  // SPECTATOR SYSTEM — animated background NPCs
  // =========================================================================

  private _addSpectator(
    x: number, y: number,
    type: Spectator["type"],
    dir: number,
    scale: number,
    bodyColor: number,
    skinColor: number,
    accentColor: number,
    hatColor: number,
    phaseOffset = 0,
  ): void {
    // Scale spectators to human size (as big as the fighters ~190px tall)
    // Original scales (0.38-0.55) produced ~20-30px tall figures.
    // Multiply by 3.2 to make them fighter-sized (~160-180px tall).
    const humanScale = scale * 3.2;
    // Adjust Y position: legs extend below the hip by 18*sc, so shift
    // the hip up so feet remain at roughly the same ground level
    const legExtension = 18 * humanScale - 18 * scale;
    const adjustedY = y - legExtension;
    this._spectators.push({
      x, y: adjustedY, phase: phaseOffset + Math.random() * Math.PI * 2,
      type, dir, scale: humanScale, bodyColor, skinColor, accentColor, hatColor,
      cheerTimer: 120 + Math.floor(Math.random() * 300),
      cheerDuration: 0,
      isCheer: false,
    });
  }

  private _drawSpectators(g: Graphics, time: number): void {
    for (const s of this._spectators) {
      // Cheer logic: countdown, then cheer for a bit
      if (!s.isCheer) {
        s.cheerTimer--;
        if (s.cheerTimer <= 0) {
          s.isCheer = true;
          s.cheerDuration = 30 + Math.floor(Math.random() * 40);
        }
      } else {
        s.cheerDuration--;
        if (s.cheerDuration <= 0) {
          s.isCheer = false;
          s.cheerTimer = 180 + Math.floor(Math.random() * 400);
        }
      }

      switch (s.type) {
        case "guard": this._drawGuardSpectator(g, s, time); break;
        case "merchant": this._drawMerchantSpectator(g, s, time); break;
        case "peasant": this._drawPeasantSpectator(g, s, time); break;
        case "noble": this._drawNobleSpectator(g, s, time); break;
        case "soldier": this._drawSoldierSpectator(g, s, time); break;
        case "monk": this._drawMonkSpectator(g, s, time); break;
        case "bard": this._drawBardSpectator(g, s, time); break;
        case "witch": this._drawWitchSpectator(g, s, time); break;
        case "druid": this._drawDruidSpectator(g, s, time); break;
        case "fisherman": this._drawFishermanSpectator(g, s, time); break;
        case "knight": this._drawKnightSpectator(g, s, time); break;
        case "villager": this._drawVillagerSpectator(g, s, time); break;
      }
    }
  }

  /** Shared spectator body drawing — returns headY for further detail */
  private _drawSpectatorBody(
    g: Graphics, s: Spectator, time: number,
  ): { hx: number; hy: number; bodyTop: number } {
    const sc = s.scale;
    const x = s.x;
    const y = s.y;
    const idle = Math.sin(time * 1.2 + s.phase) * 1.5 * sc; // breathing sway
    const cheerBob = s.isCheer ? Math.sin(time * 8 + s.phase) * 3 * sc : 0;

    // Legs (simple)
    const legSpread = 5 * sc;
    const legH = 18 * sc;
    g.moveTo(x - legSpread, y).lineTo(x - legSpread - 1, y + legH);
    g.stroke({ color: s.bodyColor, width: 3 * sc, cap: "round" });
    g.moveTo(x + legSpread, y).lineTo(x + legSpread + 1, y + legH);
    g.stroke({ color: s.bodyColor, width: 3 * sc, cap: "round" });

    // Shoes
    g.ellipse(x - legSpread - 1, y + legH, 4 * sc, 2 * sc);
    g.fill({ color: 0x443322 });
    g.ellipse(x + legSpread + 1, y + legH, 4 * sc, 2 * sc);
    g.fill({ color: 0x443322 });

    // Body (torso)
    const bodyH = 22 * sc;
    const bodyTop = y - bodyH + idle + cheerBob;
    g.roundRect(x - 8 * sc, bodyTop, 16 * sc, bodyH, 3 * sc);
    g.fill({ color: s.bodyColor });

    // Arms
    const armLen = 14 * sc;
    const armAngle = s.isCheer
      ? -Math.PI / 2 + Math.sin(time * 6 + s.phase) * 0.4
      : -0.3 + Math.sin(time * 0.8 + s.phase) * 0.1;
    // Left arm
    const laX = x - 8 * sc;
    const laEX = laX + Math.cos(armAngle - 0.3) * armLen;
    const laEY = bodyTop + 5 * sc + Math.sin(armAngle - 0.3) * armLen;
    g.moveTo(laX, bodyTop + 5 * sc).lineTo(laEX, laEY);
    g.stroke({ color: s.bodyColor, width: 3 * sc, cap: "round" });
    g.circle(laEX, laEY, 2.5 * sc);
    g.fill({ color: s.skinColor });

    // Right arm
    const raX = x + 8 * sc;
    const raAngle = s.isCheer
      ? -Math.PI / 2 - Math.sin(time * 6 + s.phase + 1) * 0.4
      : -0.3 - Math.sin(time * 0.8 + s.phase + 1) * 0.1;
    const raEX = raX + Math.cos(raAngle + 0.3) * armLen;
    const raEY = bodyTop + 5 * sc + Math.sin(raAngle + 0.3) * armLen;
    g.moveTo(raX, bodyTop + 5 * sc).lineTo(raEX, raEY);
    g.stroke({ color: s.bodyColor, width: 3 * sc, cap: "round" });
    g.circle(raEX, raEY, 2.5 * sc);
    g.fill({ color: s.skinColor });

    // Head
    const headR = 7 * sc;
    const hx = x;
    const hy = bodyTop - headR + idle + cheerBob;
    // Neck
    g.moveTo(x, bodyTop).lineTo(hx, hy + headR * 0.8);
    g.stroke({ color: s.skinColor, width: 4 * sc, cap: "round" });
    // Head circle
    g.circle(hx, hy, headR + 1);
    g.fill({ color: 0x111111 });
    g.circle(hx, hy, headR);
    g.fill({ color: s.skinColor });

    // Face: simple eyes + mouth
    const faceDir = s.dir;
    g.circle(hx + 2 * sc * faceDir, hy - 1 * sc, 1 * sc);
    g.fill({ color: 0x222222 });
    g.circle(hx + 5 * sc * faceDir, hy - 1 * sc, 1 * sc);
    g.fill({ color: 0x222222 });

    // Mouth
    if (s.isCheer) {
      g.ellipse(hx + 3.5 * sc * faceDir, hy + 3 * sc, 2 * sc, 1.5 * sc);
      g.fill({ color: 0x331111 });
    } else {
      g.moveTo(hx + 2 * sc * faceDir, hy + 3 * sc);
      g.lineTo(hx + 5 * sc * faceDir, hy + 3 * sc);
      g.stroke({ color: 0x553333, width: 0.8 * sc });
    }

    return { hx, hy, bodyTop };
  }

  // Guard: stands upright with spear, helmet
  private _drawGuardSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy, bodyTop } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Helmet
    g.circle(hx, hy, 8 * sc);
    g.fill({ color: s.hatColor });
    g.roundRect(hx - 6 * sc, hy - 2 * sc, 12 * sc, 5 * sc, 2 * sc);
    g.fill({ color: 0x111118 }); // visor slit
    // Spear
    const spearX = s.x + 12 * sc * s.dir;
    g.moveTo(spearX, bodyTop + 15 * sc).lineTo(spearX, bodyTop - 35 * sc);
    g.stroke({ color: 0x8b7355, width: 2 * sc });
    // Spear tip
    g.moveTo(spearX, bodyTop - 35 * sc);
    g.lineTo(spearX - 3 * sc, bodyTop - 30 * sc);
    g.lineTo(spearX + 3 * sc, bodyTop - 30 * sc);
    g.closePath();
    g.fill({ color: 0xaaaaaa });
  }

  // Merchant: colorful clothes, holding goods
  private _drawMerchantSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Merchant hat (wide brim)
    g.ellipse(hx, hy - 6 * sc, 10 * sc, 3 * sc);
    g.fill({ color: s.hatColor });
    g.roundRect(hx - 5 * sc, hy - 12 * sc, 10 * sc, 7 * sc, 2 * sc);
    g.fill({ color: s.hatColor });
    // Satchel/bag on side
    g.roundRect(s.x + 8 * sc * s.dir, s.y - 12 * sc, 8 * sc, 10 * sc, 2 * sc);
    g.fill({ color: 0x7a5c3a });
    g.roundRect(s.x + 9 * sc * s.dir, s.y - 11 * sc, 6 * sc, 4 * sc, 1 * sc);
    g.fill({ color: 0x8b6b45 });
  }

  // Peasant: simple clothes, headscarf
  private _drawPeasantSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Headscarf/hood
    g.circle(hx, hy - 1 * sc, 8 * sc);
    g.fill({ color: s.hatColor, alpha: 0.8 });
    // Apron detail
    g.roundRect(s.x - 6 * sc, s.y - 10 * sc, 12 * sc, 14 * sc, 1 * sc);
    g.fill({ color: s.accentColor, alpha: 0.5 });
  }

  // Noble: rich clothing, crown/circlet
  private _drawNobleSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy, bodyTop } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Circlet/crown
    g.roundRect(hx - 5 * sc, hy - 9 * sc, 10 * sc, 4 * sc, 1 * sc);
    g.fill({ color: 0xddaa33 });
    // Crown points
    for (let i = -2; i <= 2; i++) {
      g.moveTo(hx + i * 2.5 * sc, hy - 9 * sc);
      g.lineTo(hx + i * 2.5 * sc, hy - 12 * sc);
      g.stroke({ color: 0xddaa33, width: 1.5 * sc });
    }
    // Cape/cloak behind
    g.moveTo(s.x - 8 * sc, bodyTop + 2 * sc);
    g.lineTo(s.x - 12 * sc, s.y + 10 * sc);
    g.lineTo(s.x + 12 * sc, s.y + 10 * sc);
    g.lineTo(s.x + 8 * sc, bodyTop + 2 * sc);
    g.closePath();
    g.fill({ color: s.accentColor, alpha: 0.6 });
  }

  // Soldier: armor, shield
  private _drawSoldierSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Helmet with nose guard
    g.circle(hx, hy, 8 * sc);
    g.fill({ color: s.hatColor });
    g.moveTo(hx + 3.5 * sc * s.dir, hy - 2 * sc);
    g.lineTo(hx + 3.5 * sc * s.dir, hy + 5 * sc);
    g.stroke({ color: s.hatColor, width: 2 * sc });
    // Shield
    const shX = s.x - 10 * sc * s.dir;
    g.roundRect(shX - 5 * sc, s.y - 16 * sc, 10 * sc, 14 * sc, 2 * sc);
    g.fill({ color: s.accentColor });
    g.roundRect(shX - 4 * sc, s.y - 15 * sc, 8 * sc, 12 * sc, 2 * sc);
    g.stroke({ color: 0xddaa33, width: 1 * sc });
  }

  // Monk: hooded robe
  private _drawMonkSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy, bodyTop } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Hood
    g.circle(hx, hy, 9 * sc);
    g.fill({ color: s.hatColor });
    // Hood shadow
    g.ellipse(hx + 2 * sc * s.dir, hy, 6 * sc, 7 * sc);
    g.fill({ color: 0x000000, alpha: 0.3 });
    // Robe drape extends below
    g.moveTo(s.x - 10 * sc, bodyTop);
    g.lineTo(s.x - 12 * sc, s.y + 16 * sc);
    g.lineTo(s.x + 12 * sc, s.y + 16 * sc);
    g.lineTo(s.x + 10 * sc, bodyTop);
    g.closePath();
    g.fill({ color: s.bodyColor, alpha: 0.5 });
    // Belt rope
    g.moveTo(s.x - 8 * sc, s.y - 4 * sc);
    g.lineTo(s.x + 4 * sc, s.y - 4 * sc);
    g.lineTo(s.x + 4 * sc, s.y + 6 * sc);
    g.stroke({ color: 0xaa9966, width: 1.5 * sc });
  }

  // Bard: hat with feather, lute outline
  private _drawBardSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Feathered cap
    g.circle(hx, hy - 3 * sc, 8 * sc);
    g.fill({ color: s.hatColor });
    // Feather
    g.moveTo(hx + 6 * sc, hy - 10 * sc);
    g.quadraticCurveTo(hx + 14 * sc, hy - 18 * sc, hx + 10 * sc, hy - 24 * sc);
    g.stroke({ color: 0xcc4444, width: 1.5 * sc });
    // Lute shape in front of body
    g.ellipse(s.x + 4 * sc * s.dir, s.y - 6 * sc, 6 * sc, 8 * sc);
    g.fill({ color: 0x8b6b30, alpha: 0.7 });
    g.moveTo(s.x + 4 * sc * s.dir, s.y - 14 * sc);
    g.lineTo(s.x + 4 * sc * s.dir, s.y - 24 * sc);
    g.stroke({ color: 0x6b5025, width: 1.5 * sc });
  }

  // Witch: pointed hat, dark robes
  private _drawWitchSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Pointed hat
    g.ellipse(hx, hy - 5 * sc, 10 * sc, 3 * sc);
    g.fill({ color: s.hatColor });
    g.moveTo(hx - 8 * sc, hy - 5 * sc);
    g.lineTo(hx, hy - 28 * sc);
    g.lineTo(hx + 8 * sc, hy - 5 * sc);
    g.closePath();
    g.fill({ color: s.hatColor });
    // Hat buckle
    g.roundRect(hx - 3 * sc, hy - 8 * sc, 6 * sc, 3 * sc, 1 * sc);
    g.fill({ color: 0xddaa33 });
    // Glowing staff
    const staffGlow = Math.sin(time * 3 + s.phase) * 0.15;
    g.circle(s.x + 14 * sc * s.dir, hy - 10 * sc, 3 * sc);
    g.fill({ color: 0x88ff88, alpha: 0.4 + staffGlow });
  }

  // Druid: antler headdress, nature robes
  private _drawDruidSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Antler headdress
    g.circle(hx, hy - 2 * sc, 8 * sc);
    g.fill({ color: s.hatColor });
    // Antlers
    g.moveTo(hx - 4 * sc, hy - 9 * sc);
    g.lineTo(hx - 8 * sc, hy - 22 * sc);
    g.lineTo(hx - 12 * sc, hy - 20 * sc);
    g.stroke({ color: 0x886644, width: 1.5 * sc });
    g.moveTo(hx + 4 * sc, hy - 9 * sc);
    g.lineTo(hx + 8 * sc, hy - 22 * sc);
    g.lineTo(hx + 12 * sc, hy - 20 * sc);
    g.stroke({ color: 0x886644, width: 1.5 * sc });
  }

  // Fisherman: wide hat, holds rod
  private _drawFishermanSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Wide brimmed hat
    g.ellipse(hx, hy - 5 * sc, 12 * sc, 3 * sc);
    g.fill({ color: s.hatColor });
    g.roundRect(hx - 6 * sc, hy - 12 * sc, 12 * sc, 8 * sc, 3 * sc);
    g.fill({ color: s.hatColor });
  }

  // Knight: full armor, standing at attention
  private _drawKnightSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Full helm
    g.circle(hx, hy, 8 * sc);
    g.fill({ color: s.hatColor });
    g.roundRect(hx - 5 * sc, hy - 2 * sc, 10 * sc, 4 * sc, 1 * sc);
    g.fill({ color: 0x111118 }); // visor
    // Plume on top
    g.moveTo(hx, hy - 8 * sc);
    g.quadraticCurveTo(hx + 8 * sc, hy - 14 * sc, hx + 4 * sc, hy - 20 * sc);
    g.stroke({ color: s.accentColor, width: 3 * sc });
  }

  // Villager: simple attire, animated idle
  private _drawVillagerSpectator(g: Graphics, s: Spectator, time: number): void {
    const { hx, hy } = this._drawSpectatorBody(g, s, time);
    const sc = s.scale;
    // Simple cap
    g.circle(hx, hy - 3 * sc, 8 * sc);
    g.fill({ color: s.hatColor });
    g.roundRect(hx - 8 * sc, hy - 4 * sc, 16 * sc, 4 * sc, 2 * sc);
    g.fill({ color: s.hatColor });
  }

  // =========================================================================
  // STALL DRAWING — market stall for merchant scenes
  // =========================================================================

  private _drawMarketStall(g: Graphics, x: number, y: number, w: number, h: number, color: number, roofColor: number): void {
    // Counter/table
    g.rect(x, y, w, h * 0.4);
    g.fill({ color });
    g.rect(x, y, w, 3);
    g.fill({ color: 0x6b5535 });
    // Legs
    g.rect(x + 2, y + h * 0.4, 3, h * 0.6);
    g.fill({ color: 0x5a4a30 });
    g.rect(x + w - 5, y + h * 0.4, 3, h * 0.6);
    g.fill({ color: 0x5a4a30 });
    // Roof canopy
    g.moveTo(x - 4, y - 2);
    g.lineTo(x + w + 4, y - 2);
    g.lineTo(x + w + 2, y - h * 0.5);
    g.lineTo(x - 2, y - h * 0.5);
    g.closePath();
    g.fill({ color: roofColor });
    // Striped canopy detail
    for (let sx = x; sx < x + w; sx += 8) {
      g.rect(sx, y - h * 0.5, 4, h * 0.5 - 2);
      g.fill({ color: 0xffffff, alpha: 0.05 });
    }
    // Goods on counter (small colored circles)
    for (let gx = x + 5; gx < x + w - 5; gx += 9) {
      const gc = [0xcc4444, 0xddaa33, 0x44aa44, 0xdd7733][Math.floor(gx * 0.3) % 4];
      g.circle(gx, y + 4, 3);
      g.fill({ color: gc, alpha: 0.7 });
    }
  }

  private _buildGeneric(a: DuelArenaDef, sw: number, sh: number): void {
    const g = this._staticGfx;
    const floorY = this._floorY;

    // Sky gradient bands
    const skyBands = 8;
    for (let i = 0; i < skyBands; i++) {
      const t = i / skyBands;
      const bandY = floorY * t;
      const bandH = floorY / skyBands + 1;
      const r1 = (a.skyTop >> 16) & 0xff, g1 = (a.skyTop >> 8) & 0xff, b1 = a.skyTop & 0xff;
      const r2 = (a.skyBottom >> 16) & 0xff, g2 = (a.skyBottom >> 8) & 0xff, b2 = a.skyBottom & 0xff;
      const r = Math.round(r1 + (r2 - r1) * t);
      const gc = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      g.rect(0, bandY, sw, bandH);
      g.fill({ color: (r << 16) | (gc << 8) | b });
    }

    // Ground
    g.rect(0, floorY, sw, sh - floorY);
    g.fill({ color: a.groundColor });
    // Ground highlight strip
    g.rect(0, floorY, sw, 4);
    g.fill({ color: a.groundHighlight });

    // Accent line on horizon
    g.moveTo(0, floorY);
    g.lineTo(sw, floorY);
    g.stroke({ color: a.accentColor, width: 2, alpha: 0.3 });

    // Fog layer
    if (a.fogAlpha > 0) {
      g.rect(0, floorY - 40, sw, 60);
      g.fill({ color: a.fogColor, alpha: a.fogAlpha * 0.5 });
    }

    // Initialize particles for animation
    this._particles = [];
    for (let i = 0; i < 12; i++) {
      this._particles.push({
        x: Math.random() * sw,
        y: Math.random() * floorY,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.2,
        radius: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        color: a.accentColor,
      });
    }
  }

  private _updateGeneric(time: number): void {
    if (!this._arena) return;
    const g = this._animGfx;

    // Animate floating particles
    for (const p of this._particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = this._floorY; p.x = Math.random() * this._sw; }
      if (p.x < -10) p.x = this._sw;
      if (p.x > this._sw + 10) p.x = 0;
      const flicker = Math.sin(time * 2 + p.phase) * 0.1;
      g.circle(p.x, p.y, p.radius);
      g.fill({ color: p.color, alpha: Math.max(0.05, p.alpha + flicker) });
    }

    // Subtle fog drift
    if (this._arena.fogAlpha > 0) {
      const fogDrift = Math.sin(time * 0.3) * 20;
      g.rect(fogDrift, this._floorY - 30, this._sw, 40);
      g.fill({ color: this._arena.fogColor, alpha: this._arena.fogAlpha * 0.15 });
    }
  }
}
