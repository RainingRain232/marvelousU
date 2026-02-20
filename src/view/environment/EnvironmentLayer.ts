import { Container } from "pixi.js";
import { ViewManager } from "@view/ViewManager";
import { GameState } from "@sim/state/GameState";
import { GrassRenderer } from "./GrassRenderer";
import { TreeRenderer } from "./TreeRenderer";
import { DeerRenderer } from "./DeerRenderer";
import { RabbitRenderer } from "./RabbitRenderer";
import { BalanceConfig } from "@sim/config/BalanceConfig";

export class EnvironmentLayer {
    private _grass!: GrassRenderer;
    private _trees!: TreeRenderer;
    private _deer: DeerRenderer[] = [];
    private _rabbits: RabbitRenderer[] = [];
    private _container = new Container();

    init(_vm: ViewManager, state: GameState): void {
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
    }

    destroy(): void {
        if (this._grass) this._grass.container.destroy({ children: true });
        if (this._trees) this._trees.container.destroy({ children: true });
        this._container.destroy({ children: true });
    }
}

export const environmentLayer = new EnvironmentLayer();
