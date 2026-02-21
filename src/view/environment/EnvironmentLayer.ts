import { Container } from "pixi.js";
import { ViewManager } from "@view/ViewManager";
import { GameState } from "@sim/state/GameState";
import { GrassRenderer } from "./GrassRenderer";
import { TreeRenderer } from "./TreeRenderer";
import { DeerRenderer } from "./DeerRenderer";
import { RabbitRenderer } from "./RabbitRenderer";
import { DoveRenderer } from "./DoveRenderer";
import { FarmerRenderer } from "./FarmerRenderer";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BuildingType } from "@/types";

export class EnvironmentLayer {
    private _grass!: GrassRenderer;
    private _trees!: TreeRenderer;
    private _deer: DeerRenderer[] = [];
    private _rabbits: RabbitRenderer[] = [];
    private _doves: DoveRenderer[] = [];
    private _farmers: FarmerRenderer[] = [];

    // Spawning timers
    private _doveTimer = 0;
    private _nextDoveSpawnTime = 5 + Math.random() * 15;

    private _farmerTimer = 0;
    private _nextFarmerSpawnTime = 1.5 + Math.random() * 3;

    private _container = new Container();
    private _state!: GameState;
    private _vm!: ViewManager;

    init(_vm: ViewManager, state: GameState): void {
        this._vm = _vm;
        this._state = state;
        const ts = BalanceConfig.TILE_SIZE;
        const worldW = state.battlefield.width * ts;
        const worldH = state.battlefield.height * ts;

        // Deterministic seed based on game state if possible, or just a constant
        const seed = state.rngSeed || 42;

        // Create grass tufts (plenty)
        this._grass = new GrassRenderer(250, worldW, worldH, seed);

        // Create trees (occasional)
        this._trees = new TreeRenderer(25, worldW, worldH, seed + 1);

        this._container.addChild(this._grass.container);
        this._container.addChild(this._trees.container);

        // --- Animals ---
        const totalTiles = state.battlefield.width * state.battlefield.height;
        const animalDensityUnits = Math.max(1, Math.floor(totalTiles / 200));
        const deerCount = animalDensityUnits;
        const rabbitCount = animalDensityUnits * 3;

        const bounds = { w: worldW, h: worldH };

        for (let i = 0; i < deerCount; i++) {
            const deer = new DeerRenderer(Math.random() * worldW, Math.random() * worldH, bounds, seed + 10 + i);
            this._deer.push(deer);
            this._container.addChild(deer.container);
        }

        for (let i = 0; i < rabbitCount; i++) {
            const rabbit = new RabbitRenderer(Math.random() * worldW, Math.random() * worldH, bounds, seed + 100 + i);
            this._rabbits.push(rabbit);
            this._container.addChild(rabbit.container);
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
        if (this._trees) this._trees.update(dt);
        for (const d of this._deer) d.update(dt);
        for (const r of this._rabbits) r.update(dt);

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
            x: 0, y: 0,
            w: this._state.battlefield.width * ts,
            h: this._state.battlefield.height * ts
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
        const castlePositions: Array<{ x: number, y: number }> = [];
        for (const b of this._state.buildings.values()) {
            if (b.type === BuildingType.CASTLE) {
                const ts = BalanceConfig.TILE_SIZE;
                castlePositions.push({
                    x: b.position.x * ts + (2 * ts), // center of 4x4
                    y: b.position.y * ts + (2 * ts)
                });
            }
        }

        if (castlePositions.length === 0) return;

        const anchor = castlePositions[Math.floor(Math.random() * castlePositions.length)];
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
                finalDx, finalDy, speed
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
            const firepits = Array.from(this._state.buildings.values()).filter(b => b.type === BuildingType.FIREPIT);
            if (firepits.length > 0) {
                const firepit = firepits[Math.floor(Math.random() * firepits.length)];
                const startPos = {
                    x: firepit.position.x * ts + ts,
                    y: firepit.position.y * ts + (0.5 * ts) // center of 2x1
                };

                // Find corresponding castle (same owner)
                const castle = Array.from(this._state.buildings.values()).find(b => b.type === BuildingType.CASTLE && b.owner === firepit.owner);
                if (castle) {
                    const targetPos = {
                        x: castle.position.x * ts + (2 * ts), // center of 4x4
                        y: castle.position.y * ts + (2 * ts)
                    };
                    const farmer = new FarmerRenderer(startPos, targetPos);
                    this._farmers.push(farmer);
                    this._container.addChild(farmer.container);
                    return;
                }
            }
        }

        // 2. Default logic: Farm to closest Town/Hamlet
        const farms = Array.from(this._state.buildings.values()).filter(b => b.type === BuildingType.FARM);
        if (farms.length === 0) return;

        // Find all towns/hamlets
        const towns = Array.from(this._state.buildings.values()).filter(b => b.type === BuildingType.TOWN || b.type === BuildingType.HAMLET);
        if (towns.length === 0) return;

        // Pick a random farm
        const farm = farms[Math.floor(Math.random() * farms.length)];
        const startPos = {
            x: farm.position.x * ts + ts, // approximate center
            y: farm.position.y * ts + ts
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
            y: closestTown.position.y * ts + ts
        };

        const farmer = new FarmerRenderer(startPos, targetPos);
        this._farmers.push(farmer);
        // Add to background layer above other decorations
        this._container.addChild(farmer.container);
    }

    destroy(): void {
        if (this._grass) this._grass.container.destroy({ children: true });
        if (this._trees) this._trees.container.destroy({ children: true });
        for (const d of this._doves) d.destroy();
        for (const f of this._farmers) f.destroy();
        this._container.destroy({ children: true });
    }
}

export const environmentLayer = new EnvironmentLayer();
