import { Container } from "pixi.js";
import { ViewManager } from "@view/ViewManager";
import { GameState } from "@sim/state/GameState";
import { GrassRenderer } from "./GrassRenderer";
import { PlainsGrassRenderer } from "./PlainsGrassRenderer";
import { TreeRenderer } from "./TreeRenderer";
import { ForestTreeRenderer } from "./ForestTreeRenderer";
import { FlowerRenderer } from "./FlowerRenderer";
import { FernRenderer } from "./FernRenderer";
import { MushroomRenderer } from "./MushroomRenderer";
import { FireflyRenderer } from "./FireflyRenderer";
import { ForestFogRenderer } from "./ForestFogRenderer";
import { TumbleweedRenderer } from "./TumbleweedRenderer";
import { DustRenderer } from "./DustRenderer";
import { DeerRenderer } from "./DeerRenderer";
import { RabbitRenderer } from "./RabbitRenderer";
import { DoveRenderer } from "./DoveRenderer";
import { FarmerRenderer } from "./FarmerRenderer";
import { PrincessRenderer } from "./PrincessRenderer";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BuildingType, MapType } from "@/types";

export class EnvironmentLayer {
  private _grass: GrassRenderer | null = null;
  private _plainsGrass: PlainsGrassRenderer | null = null;
  private _trees: TreeRenderer | null = null;
  private _forestTrees: ForestTreeRenderer | null = null;
  private _flowers: FlowerRenderer | null = null;
  private _ferns: FernRenderer | null = null;
  private _mushrooms: MushroomRenderer | null = null;
  private _fireflies: FireflyRenderer | null = null;
  private _forestFog: ForestFogRenderer | null = null;
  private _tumbleweeds: TumbleweedRenderer | null = null;
  private _dust: DustRenderer | null = null;
  private _deer: DeerRenderer[] = [];
  private _rabbits: RabbitRenderer[] = [];
  private _doves: DoveRenderer[] = [];
  private _farmers: FarmerRenderer[] = [];
  private _princesses: PrincessRenderer[] = [];

  // Spawning timers
  private _doveTimer = 0;
  private _nextDoveSpawnTime = 5 + Math.random() * 15;

  private _farmerTimer = 0;
  private _nextFarmerSpawnTime = 1.5 + Math.random() * 3;

  private _container = new Container();
  private _state!: GameState;
  private _vm!: ViewManager;

  init(
    _vm: ViewManager,
    state: GameState,
    mapType: MapType = MapType.MEADOW,
  ): void {
    this._vm = _vm;
    this._state = state;
    const ts = BalanceConfig.TILE_SIZE;
    const worldW = state.battlefield.width * ts;
    const worldH = state.battlefield.height * ts;

    // Deterministic seed based on game state if possible, or just a constant
    const seed = state.rngSeed || 42;

    // Scale decoration counts proportionally to map area
    // Base counts are tuned for STANDARD (44×25 = 1100 tiles)
    const totalTiles = state.battlefield.width * state.battlefield.height;
    const areaScale = totalTiles / (44 * 25);
    const s = (base: number) => Math.round(base * areaScale);

    // Density and features per map type
    const isGrass = mapType === MapType.GRASS;
    const isPlains = mapType === MapType.PLAINS;
    const isForest = mapType === MapType.FOREST;
    const isFantasia = mapType === MapType.FANTASIA;
    const isTundra = mapType === MapType.TUNDRA;
    const isSwamp = mapType === MapType.SWAMP;
    const isVolcanic = mapType === MapType.VOLCANIC;
    const isOcean = mapType === MapType.OCEAN;
    const isHills = mapType === MapType.HILLS;
    const isMountains = mapType === MapType.MOUNTAINS;
    const isDesert = mapType === MapType.DESERT;

    if (isForest) {
      // Forest: ancient gnarled trees, ferns, glowing mushrooms, fireflies, fog
      this._forestTrees = new ForestTreeRenderer(s(35), worldW, worldH, seed);
      this._container.addChild(this._forestTrees.container);

      this._ferns = new FernRenderer(s(120), worldW, worldH, seed + 2);
      this._container.addChild(this._ferns.container);

      this._mushrooms = new MushroomRenderer(s(40), worldW, worldH, seed + 3);
      this._container.addChild(this._mushrooms.container);

      this._forestFog = new ForestFogRenderer(worldW, worldH, seed + 4);
      this._container.addChild(this._forestFog.container);

      this._fireflies = new FireflyRenderer(s(60), worldW, worldH, seed + 5);
      this._container.addChild(this._fireflies.container);
    } else if (isFantasia) {
      // Fantasia: enchanted mystical forest - lighter colors, magical elements
      // Mystical trees - use the beautiful forest trees
      this._forestTrees = new ForestTreeRenderer(s(30), worldW, worldH, seed);
      this._container.addChild(this._forestTrees.container);

      // Lighter ferns
      this._ferns = new FernRenderer(s(100), worldW, worldH, seed + 2);
      this._container.addChild(this._ferns.container);

      // Glowing mushrooms with brighter colors
      this._mushrooms = new MushroomRenderer(s(50), worldW, worldH, seed + 3);
      this._container.addChild(this._mushrooms.container);

      // Lighter magical fog
      this._forestFog = new ForestFogRenderer(worldW, worldH, seed + 4);
      this._container.addChild(this._forestFog.container);

      // More magical fireflies with varied colors
      this._fireflies = new FireflyRenderer(s(100), worldW, worldH, seed + 5);
      this._container.addChild(this._fireflies.container);
    } else if (isPlains) {
      // Plains: tall dry grass, sparse scrub trees, tumbleweeds, dust
      this._plainsGrass = new PlainsGrassRenderer(s(400), worldW, worldH, seed);
      this._container.addChild(this._plainsGrass.container);

      // Very few scraggly trees — dry yellowish foliage, sun-bleached trunks
      const plainsFoliage = [0x8a7a30, 0x9c8c3a, 0x7a6a28, 0xa09040];
      const plainsTrunk = 0x6b5530;
      this._trees = new TreeRenderer(
        s(8),
        worldW,
        worldH,
        seed + 1,
        plainsFoliage,
        plainsTrunk,
      );
      this._container.addChild(this._trees.container);

      // Tumbleweeds rolling across
      this._tumbleweeds = new TumbleweedRenderer(worldW, worldH, seed + 3);
      this._container.addChild(this._tumbleweeds.container);

      // Atmospheric dust
      this._dust = new DustRenderer(worldW, worldH, seed + 4);
      this._container.addChild(this._dust.container);
    } else if (isTundra) {
      // Tundra: sparse frozen grass, lots of rocks, frost fog
      this._grass = new GrassRenderer(s(80), worldW, worldH, seed);
      this._container.addChild(this._grass.container);

      this._forestFog = new ForestFogRenderer(worldW, worldH, seed + 4);
      this._container.addChild(this._forestFog.container);
    } else if (isSwamp) {
      // Swamp: dense murky vegetation, ferns, mushrooms, fog
      this._grass = new GrassRenderer(s(300), worldW, worldH, seed);
      this._container.addChild(this._grass.container);

      this._ferns = new FernRenderer(s(100), worldW, worldH, seed + 2);
      this._container.addChild(this._ferns.container);

      this._mushrooms = new MushroomRenderer(s(30), worldW, worldH, seed + 3);
      this._container.addChild(this._mushrooms.container);

      this._forestFog = new ForestFogRenderer(worldW, worldH, seed + 4);
      this._container.addChild(this._forestFog.container);

      this._fireflies = new FireflyRenderer(s(30), worldW, worldH, seed + 5);
      this._container.addChild(this._fireflies.container);
    } else if (isVolcanic) {
      // Volcanic: barren, dust, no vegetation
      this._dust = new DustRenderer(worldW, worldH, seed + 4);
      this._container.addChild(this._dust.container);
    } else if (isOcean) {
      // Ocean: minimal — just fog/mist effect
      this._forestFog = new ForestFogRenderer(worldW, worldH, seed + 4);
      this._container.addChild(this._forestFog.container);
    } else if (isHills) {
      // Hills: moderate grass, scattered scrub trees, rocks
      this._grass = new GrassRenderer(s(200), worldW, worldH, seed);
      this._container.addChild(this._grass.container);

      const hillFoliage = [0x7a7a30, 0x8a8a3a, 0x6a6a28, 0x909040];
      const hillTrunk = 0x5a4a28;
      this._trees = new TreeRenderer(s(12), worldW, worldH, seed + 1, hillFoliage, hillTrunk);
      this._container.addChild(this._trees.container);
    } else if (isMountains) {
      // Mountains: very sparse vegetation, fog
      this._grass = new GrassRenderer(s(50), worldW, worldH, seed);
      this._container.addChild(this._grass.container);

      this._forestFog = new ForestFogRenderer(worldW, worldH, seed + 4);
      this._container.addChild(this._forestFog.container);
    } else if (isDesert) {
      // Desert: dry grass, tumbleweeds, dust, no trees
      this._plainsGrass = new PlainsGrassRenderer(s(150), worldW, worldH, seed);
      this._container.addChild(this._plainsGrass.container);

      this._tumbleweeds = new TumbleweedRenderer(worldW, worldH, seed + 3);
      this._container.addChild(this._tumbleweeds.container);

      this._dust = new DustRenderer(worldW, worldH, seed + 4);
      this._container.addChild(this._dust.container);
    } else {
      const grassCount = isGrass ? s(600) : s(250);
      const treeCount = isGrass ? s(70) : s(25);

      // Create grass tufts
      this._grass = new GrassRenderer(grassCount, worldW, worldH, seed);
      this._container.addChild(this._grass.container);

      // Create trees
      this._trees = new TreeRenderer(treeCount, worldW, worldH, seed + 1);
      this._container.addChild(this._trees.container);

      // Flowers for grass map type
      if (isGrass) {
        this._flowers = new FlowerRenderer(s(180), worldW, worldH, seed + 2);
        this._container.addChild(this._flowers.container);
      }
    }

    // --- Animals ---
    const animalDensityUnits = Math.max(1, Math.floor(totalTiles / 200));
    const deerCount = animalDensityUnits;
    const rabbitCount = animalDensityUnits * 3;

    const bounds = { w: worldW, h: worldH };

    for (let i = 0; i < deerCount; i++) {
      const deer = new DeerRenderer(
        Math.random() * worldW,
        Math.random() * worldH,
        bounds,
        seed + 10 + i,
      );
      this._deer.push(deer);
      this._container.addChild(deer.container);
    }

    for (let i = 0; i < rabbitCount; i++) {
      const rabbit = new RabbitRenderer(
        Math.random() * worldW,
        Math.random() * worldH,
        bounds,
        seed + 100 + i,
      );
      this._rabbits.push(rabbit);
      this._container.addChild(rabbit.container);
    }

    // --- Princesses (scale with map size) ---
    // Standard map (~20x20=400 tiles) → 2 princesses
    // Quadruple (~40x40=1600 tiles) → 8 princesses
    const princessCount = Math.max(1, Math.floor(totalTiles / 200));
    for (let i = 0; i < princessCount; i++) {
      const princess = new PrincessRenderer(
        Math.random() * worldW,
        Math.random() * worldH,
        bounds,
        this._rabbits,
        seed + 500 + i,
      );
      this._princesses.push(princess);
      this._container.addChild(princess.container);
    }

    // Add to background layer, but BEFORE the grid lines if we want them over top,
    // or AFTER if we want them to blend.
    // GridRenderer adds _tiles, _tints, _lines.
    // We'll add our container to background.
    _vm.addToLayer("background", this._container);

    // Sort background children if needed: tags/tiles -> decorations -> lines
    // ViewManager.addToLayer just appends.
    // We should ideally have handled this in GridRenderer or a dedicated Background manager.
    // For now, we'll just let it be added. main.ts calls gridRenderer.init then environmentLayer.init,
    // so decorations will be over tiles but below things added later.
  }

  update(_state: GameState, dt: number): void {
    if (this._grass) this._grass.update(dt);
    if (this._plainsGrass) this._plainsGrass.update(dt);
    if (this._trees) this._trees.update(dt);
    if (this._forestTrees) this._forestTrees.update(dt);
    if (this._flowers) this._flowers.update(dt);
    if (this._ferns) this._ferns.update(dt);
    if (this._mushrooms) this._mushrooms.update(dt);
    if (this._fireflies) this._fireflies.update(dt);
    if (this._forestFog) this._forestFog.update(dt);
    if (this._tumbleweeds) this._tumbleweeds.update(dt);
    if (this._dust) this._dust.update(dt);
    for (const d of this._deer) d.update(dt);
    for (const r of this._rabbits) r.update(dt);
    for (const p of this._princesses) p.update(dt);

    this._updateDoves(dt);
    this._updateFarmers(dt);
  }

  private _updateDoves(dt: number): void {
    // 1. Spawning
    this._doveTimer += dt;
    if (this._doveTimer >= this._nextDoveSpawnTime) {
      this._doveTimer = 0;
      this._nextDoveSpawnTime = 5 + Math.random() * 15;
      this._spawnDoveBatch();
    }

    // 2. Update and Cleanup
    const ts = BalanceConfig.TILE_SIZE;
    const bounds = {
      x: 0,
      y: 0,
      w: this._state.battlefield.width * ts,
      h: this._state.battlefield.height * ts,
    };

    for (let i = this._doves.length - 1; i >= 0; i--) {
      const dove = this._doves[i];
      dove.update(dt);
      if (dove.isOutOfBounds(bounds)) {
        this._vm.removeFromLayer("fx", dove.container);
        dove.destroy();
        this._doves.splice(i, 1);
      }
    }
  }

  private _spawnDoveBatch(): void {
    // Find castle positions
    const castlePositions: Array<{ x: number; y: number }> = [];
    for (const b of this._state.buildings.values()) {
      if (b.type === BuildingType.CASTLE) {
        const ts = BalanceConfig.TILE_SIZE;
        castlePositions.push({
          x: b.position.x * ts + 2 * ts, // center of 4x4
          y: b.position.y * ts + 2 * ts,
        });
      }
    }

    if (castlePositions.length === 0) return;

    const anchor =
      castlePositions[Math.floor(Math.random() * castlePositions.length)];
    const count = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      // Random direction: North, NE, NW
      // N: [0,-1], NE: [1,-1], NW: [-1,-1]
      const dirType = Math.floor(Math.random() * 3);
      let dx = 0;
      const dy = -1;
      if (dirType === 1) dx = 1; // NE
      if (dirType === 2) dx = -1; // NW

      // Add some noise to direction
      const finalDx = dx + (Math.random() - 0.5) * 0.4;
      const finalDy = dy + (Math.random() - 0.5) * 0.2;
      const speed = 80 + Math.random() * 40;

      const dove = new DoveRenderer(
        anchor.x + (Math.random() - 0.5) * 40,
        anchor.y + (Math.random() - 0.5) * 40,
        finalDx,
        finalDy,
        speed,
      );
      this._doves.push(dove);
      this._vm.addToLayer("fx", dove.container);
    }
  }

  private _updateFarmers(dt: number): void {
    // 1. Spawning
    this._farmerTimer += dt;
    if (this._farmerTimer >= this._nextFarmerSpawnTime) {
      this._farmerTimer = 0;
      this._nextFarmerSpawnTime = 1.5 + Math.random() * 3; // Even more frequent
      this._spawnFarmer();
    }

    // 2. Update and Cleanup
    for (let i = this._farmers.length - 1; i >= 0; i--) {
      const f = this._farmers[i];
      f.update(dt);
      if (f.isFinished()) {
        f.container.parent?.removeChild(f.container);
        f.destroy();
        this._farmers.splice(i, 1);
      }
    }
  }

  private _spawnFarmer(): void {
    const ts = BalanceConfig.TILE_SIZE;

    // 1. Randomly decide starting type: Farm or Firepit
    const spawnFromFirepit = Math.random() < 0.5; // Increased to 50% chance

    if (spawnFromFirepit) {
      const firepits = Array.from(this._state.buildings.values()).filter(
        (b) => b.type === BuildingType.FIREPIT,
      );
      if (firepits.length > 0) {
        const firepit = firepits[Math.floor(Math.random() * firepits.length)];
        const startPos = {
          x: firepit.position.x * ts + ts,
          y: firepit.position.y * ts + 0.5 * ts, // center of 2x1
        };

        // Find corresponding castle (same owner)
        const castle = Array.from(this._state.buildings.values()).find(
          (b) => b.type === BuildingType.CASTLE && b.owner === firepit.owner,
        );
        if (castle) {
          const targetPos = {
            x: castle.position.x * ts + 2 * ts, // center of 4x4
            y: castle.position.y * ts + 2 * ts,
          };
          const farmer = new FarmerRenderer(startPos, targetPos);
          this._farmers.push(farmer);
          this._container.addChild(farmer.container);
          return;
        }
      }
    }

    // 2. Default logic: Farm to closest Town/Hamlet
    const farms = Array.from(this._state.buildings.values()).filter(
      (b) => b.type === BuildingType.FARM,
    );
    if (farms.length === 0) return;

    // Find all towns/hamlets
    const towns = Array.from(this._state.buildings.values()).filter(
      (b) => b.type === BuildingType.TOWN || b.type === BuildingType.HAMLET,
    );
    if (towns.length === 0) return;

    // Pick a random farm
    const farm = farms[Math.floor(Math.random() * farms.length)];
    const startPos = {
      x: farm.position.x * ts + ts, // approximate center
      y: farm.position.y * ts + ts,
    };

    // Find closest town
    let closestTown = towns[0];
    let minDist = Infinity;
    for (const t of towns) {
      const dx = t.position.x - farm.position.x;
      const dy = t.position.y - farm.position.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestTown = t;
      }
    }

    const targetPos = {
      x: closestTown.position.x * ts + ts,
      y: closestTown.position.y * ts + ts,
    };

    const farmer = new FarmerRenderer(startPos, targetPos);
    this._farmers.push(farmer);
    // Add to background layer above other decorations
    this._container.addChild(farmer.container);
  }

  destroy(): void {
    if (this._grass) this._grass.container.destroy({ children: true });
    if (this._plainsGrass)
      this._plainsGrass.container.destroy({ children: true });
    if (this._trees) this._trees.container.destroy({ children: true });
    if (this._forestTrees)
      this._forestTrees.container.destroy({ children: true });
    if (this._flowers) this._flowers.container.destroy({ children: true });
    if (this._ferns) this._ferns.container.destroy({ children: true });
    if (this._mushrooms) this._mushrooms.destroy();
    if (this._fireflies) this._fireflies.destroy();
    if (this._forestFog) this._forestFog.destroy();
    if (this._tumbleweeds) this._tumbleweeds.destroy();
    if (this._dust) this._dust.destroy();
    for (const d of this._doves) d.destroy();
    for (const f of this._farmers) f.destroy();
    this._container.destroy({ children: true });
  }
}

export const environmentLayer = new EnvironmentLayer();
