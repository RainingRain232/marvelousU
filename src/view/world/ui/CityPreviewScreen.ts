// City preview screen — shows a visual representation of the city.
//
// Displays the castle (if capital or has castle building), built buildings
// with their renderers, houses based on population, and a firepit.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldCity } from "@world/state/WorldCity";
import { GamePhase, BuildingType } from "@/types";
import { WorldBuildingType, getWorldBuildingDef } from "@world/config/WorldBuildingDefs";

// Renderers
import { CastleRenderer } from "@view/entities/CastleRenderer";
import { FirepitRenderer } from "@view/entities/FirepitRenderer";
import { House1Renderer } from "@view/entities/House1Renderer";
import { House2Renderer } from "@view/entities/House2Renderer";
import { House3Renderer } from "@view/entities/House3Renderer";
import { BarracksRenderer } from "@view/entities/BarracksRenderer";
import { ArcheryRangeRenderer } from "@view/entities/ArcheryRangeRenderer";
import { StableRenderer } from "@view/entities/StableRenderer";
import { MageTowerRenderer } from "@view/entities/MageTowerRenderer";
import { TempleRenderer } from "@view/entities/TempleRenderer";
// MarketRenderer available but marketplace is a civ-building without BuildingType
import { SiegeWorkshopRenderer } from "@view/entities/SiegeWorkshopRenderer";
import { CreatureDenRenderer } from "@view/entities/CreatureDenRenderer";
import { EmbassyRenderer } from "@view/entities/EmbassyRenderer";
import { FactionHallRenderer } from "@view/entities/FactionHallRenderer";
import { EliteBarracksRenderer } from "@view/entities/EliteBarracksRenderer";
import { EliteArcheryRangeRenderer } from "@view/entities/EliteArcheryRangeRenderer";
import { EliteStableRenderer } from "@view/entities/EliteStableRenderer";
import { EliteMageTowerRenderer } from "@view/entities/EliteMageTowerRenderer";
import { EliteSiegeWorkshopRenderer } from "@view/entities/EliteSiegeWorkshopRenderer";
import { EliteHallRenderer } from "@view/entities/EliteHallRenderer";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 20,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0xcccccc,
});

// ---------------------------------------------------------------------------
// Renderer entry — wraps any building renderer with a uniform interface.
// ---------------------------------------------------------------------------

interface RendererEntry {
  container: Container;
  tick: (dt: number, phase: GamePhase) => void;
  width: number;
  height: number;
  label: string;
}

function createBuildingRenderer(
  type: string,
  owner: string,
): RendererEntry | null {
  const TS = 64;
  switch (type) {
    case BuildingType.BARRACKS:
      { const r = new BarracksRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 2 * TS, label: "Barracks" }; }
    case BuildingType.ARCHERY_RANGE:
      { const r = new ArcheryRangeRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 4 * TS, height: 2 * TS, label: "Archery Range" }; }
    case BuildingType.STABLES:
      { const r = new StableRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 3 * TS, height: 2 * TS, label: "Stables" }; }
    case BuildingType.MAGE_TOWER:
      { const r = new MageTowerRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 2 * TS, label: "Mage Tower" }; }
    case BuildingType.TEMPLE:
      { const r = new TempleRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 3 * TS, label: "Temple" }; }
    case BuildingType.SIEGE_WORKSHOP:
      { const r = new SiegeWorkshopRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 2 * TS, label: "Siege Workshop" }; }
    case BuildingType.CREATURE_DEN:
      { const r = new CreatureDenRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 2 * TS, label: "Creature Den" }; }
    case BuildingType.EMBASSY:
      { const r = new EmbassyRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 2 * TS, label: "Embassy" }; }
    case BuildingType.FACTION_HALL:
      { const r = new FactionHallRenderer(owner); return { container: r.container, tick: (dt) => r.tick(dt), width: 2 * TS, height: 2 * TS, label: "Faction Hall" }; }
    case BuildingType.ELITE_BARRACKS:
      { const r = new EliteBarracksRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 2 * TS, label: "Elite Barracks" }; }
    case BuildingType.ELITE_ARCHERY_RANGE:
      { const r = new EliteArcheryRangeRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 4 * TS, height: 2 * TS, label: "Elite Archery Range" }; }
    case BuildingType.ELITE_STABLES:
      { const r = new EliteStableRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 3 * TS, height: 2 * TS, label: "Elite Stables" }; }
    case BuildingType.ELITE_MAGE_TOWER:
      { const r = new EliteMageTowerRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 2 * TS, label: "Elite Mage Tower" }; }
    case BuildingType.ELITE_SIEGE_WORKSHOP:
      { const r = new EliteSiegeWorkshopRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 2 * TS, label: "Elite Siege Workshop" }; }
    case BuildingType.ELITE_HALL:
      { const r = new EliteHallRenderer(owner); return { container: r.container, tick: (dt, p) => r.tick(dt, p), width: 2 * TS, height: 2 * TS, label: "Elite Hall" }; }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// CityPreviewScreen
// ---------------------------------------------------------------------------

export class CityPreviewScreen {
  readonly container = new Container();
  private _vm!: ViewManager;
  private _content = new Container();
  private _renderers: RendererEntry[] = [];

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;

    // Register ticker for animations
    vm.app.ticker.add(() => {
      if (!this.container.visible) return;
      const dt = vm.app.ticker.deltaMS / 1000;
      this.tick(dt);
    });
  }

  show(city: WorldCity): void {
    this.container.visible = true;
    this._rebuild(city);
  }

  hide(): void {
    this.container.visible = false;
    this._cleanup();
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  tick(dt: number): void {
    if (!this.container.visible) return;
    for (const r of this._renderers) {
      r.tick(dt, GamePhase.PREP);
    }
  }

  private _cleanup(): void {
    this._renderers = [];
    this._content.removeFromParent();
    this._content.destroy({ children: true });
    this._content = new Container();
  }

  private _rebuild(city: WorldCity): void {
    this._cleanup();

    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Backdrop
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.9 });
    bg.eventMode = "static";
    this._content.addChild(bg);

    // Title
    const title = new Text({ text: city.name, style: TITLE_STYLE });
    title.x = (sw - title.width) / 2;
    title.y = 16;
    this._content.addChild(title);

    // Close button
    this._content.addChild(this._makeClose(sw - 40, 10));

    // Ground
    const groundY = sh * 0.75;
    const ground = new Graphics();
    ground.rect(0, groundY, sw, sh - groundY);
    ground.fill({ color: 0x3a5a2e });
    this._content.addChild(ground);

    // Grass texture
    const grassDetail = new Graphics();
    for (let gx = 0; gx < sw; gx += 8) {
      const gy = groundY + Math.sin(gx * 0.05) * 3;
      grassDetail.rect(gx, gy, 4, 2);
      grassDetail.fill({ color: 0x4a6b3a });
    }
    this._content.addChild(grassDetail);

    // Collect all items to place
    const items: RendererEntry[] = [];
    const owner = city.owner;
    const SCALE = 0.7;

    // Castle if capital or has castle building
    const hasCastle = city.isCapital ||
      city.buildings.some((b) => b.type === WorldBuildingType.CASTLE as unknown as BuildingType);
    if (hasCastle) {
      const r = new CastleRenderer(owner);
      items.push({
        container: r.container,
        tick: (dt, p) => r.tick(dt, p),
        width: 256,
        height: 256,
        label: "Castle",
      });
    }

    // Buildings with renderers
    for (const b of city.buildings) {
      if (b.type === WorldBuildingType.CASTLE as unknown as BuildingType) continue;
      const entry = createBuildingRenderer(b.type as string, owner);
      if (entry) {
        items.push(entry);
      } else {
        // Civ-style building without a renderer — draw a generic placeholder
        const def = getWorldBuildingDef(b.type as string);
        const name = def?.name ?? b.type;
        const placeholder = new Container();
        const box = new Graphics();
        box.roundRect(0, 0, 64, 64, 4);
        box.fill({ color: 0x444466 });
        box.stroke({ color: 0x6666aa, width: 1 });
        placeholder.addChild(box);
        const lbl = new Text({ text: name, style: LABEL_STYLE });
        lbl.x = 32 - lbl.width / 2;
        lbl.y = 24;
        placeholder.addChild(lbl);
        items.push({
          container: placeholder,
          tick: () => {},
          width: 64,
          height: 64,
          label: name,
        });
      }
    }

    // Firepit (always)
    const firepit = new FirepitRenderer();
    items.push({
      container: firepit.container,
      tick: (dt) => firepit.tick(dt),
      width: 64,
      height: 64,
      label: "Firepit",
    });

    // Houses based on population
    const houseCount = Math.max(1, city.population - 1);
    const houseCtors = [House1Renderer, House2Renderer, House3Renderer];
    for (let i = 0; i < houseCount; i++) {
      const Ctor = houseCtors[i % houseCtors.length];
      const r = new Ctor(owner);
      items.push({
        container: r.container,
        tick: (dt, p) => r.tick(dt, p),
        width: 64,
        height: 64,
        label: "",
      });
    }

    // Layout items in a row, centered, sitting on the ground
    const GAP = 12;
    let totalW = 0;
    for (const item of items) {
      totalW += item.width * SCALE + GAP;
    }
    totalW -= GAP;

    let cx = (sw - totalW) / 2;
    for (const item of items) {
      const scaledW = item.width * SCALE;
      const scaledH = item.height * SCALE;
      item.container.scale.set(SCALE);
      item.container.x = cx;
      item.container.y = groundY - scaledH;
      this._content.addChild(item.container);

      // Label below
      if (item.label) {
        const lbl = new Text({ text: item.label, style: LABEL_STYLE });
        lbl.x = cx + scaledW / 2 - lbl.width / 2;
        lbl.y = groundY + 4;
        this._content.addChild(lbl);
      }

      cx += scaledW + GAP;
    }

    this._renderers = items;
    this.container.addChild(this._content);
  }

  private _makeClose(x: number, y: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 24, 24, 4);
    bg.fill({ color: 0x333344 });
    bg.stroke({ color: 0x555577, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: "X",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fontWeight: "bold", fill: 0xff6666 }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(12, 12);
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => this.hide());
    return btn;
  }
}

export const cityPreviewScreen = new CityPreviewScreen();
