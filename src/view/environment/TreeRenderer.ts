import { Container, Graphics } from "pixi.js";

export class TreeRenderer {
    readonly container = new Container();
    private _trees: Array<{ trunk: Graphics; canopy: Graphics; phase: number; speed: number }> = [];
    private _time = 0;

    private _foliageColors: number[];
    private _trunkColor: number;

    constructor(count: number, width: number, height: number, seed: number, foliageColors?: number[], trunkColor?: number) {
        this._foliageColors = foliageColors ?? [0x2d5a27, 0x3a7c33, 0x1e4d1a];
        this._trunkColor = trunkColor ?? 0x4d3319;
        let s = seed;
        const next = () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };

        for (let i = 0; i < count; i++) {
            const x = next() * width;
            const y = next() * height;

            // Avoid placing trees too close to the horizontal edges (bases) or center (towns) too often
            // but the user just said "occasional tree". Semirandom placement is fine.

            const { trunk, canopy } = this._createTree(next);
            const treeContainer = new Container();
            treeContainer.addChild(trunk);
            treeContainer.addChild(canopy);
            treeContainer.position.set(x, y);
            this.container.addChild(treeContainer);

            this._trees.push({
                trunk,
                canopy,
                phase: next() * Math.PI * 2,
                speed: 0.5 + next() * 0.5,
            });
        }
    }

    private _createTree(next: () => number): { trunk: Graphics; canopy: Graphics } {
        const trunk = new Graphics();
        const canopy = new Graphics();

        const trunkW = 8 + next() * 6;
        const trunkH = 20 + next() * 15;
        const trunkColor = this._trunkColor;

        // Trunk
        trunk.rect(-trunkW / 2, -trunkH, trunkW, trunkH)
            .fill({ color: trunkColor });

        // Some roots
        trunk.moveTo(-trunkW / 2, 0)
            .lineTo(-trunkW, 2)
            .stroke({ color: trunkColor, width: 2 });
        trunk.moveTo(trunkW / 2, 0)
            .lineTo(trunkW, 2)
            .stroke({ color: trunkColor, width: 2 });

        // Canopy (detailed clouds of green)
        const canopySize = 25 + next() * 20;
        const foliageColors = this._foliageColors;

        const circleCount = 5 + Math.floor(next() * 5);
        for (let i = 0; i < circleCount; i++) {
            const cx = (next() - 0.5) * canopySize * 0.8;
            const cy = -trunkH - (next() * canopySize * 0.6);
            const r = (0.4 + next() * 0.6) * canopySize;
            const color = foliageColors[Math.floor(next() * foliageColors.length)];

            canopy.circle(cx, cy, r)
                .fill({ color, alpha: 0.9 });

            // Highlight on top-left of each cluster
            canopy.circle(cx - r * 0.2, cy - r * 0.2, r * 0.5)
                .fill({ color: 0xffffff, alpha: 0.1 });
        }

        return { trunk, canopy };
    }

    update(dt: number): void {
        this._time += dt;
        for (const tree of this._trees) {
            // Primary sway + slower secondary wave for organic wind feel
            const primary = Math.sin(this._time * tree.speed + tree.phase) * 0.12;
            const secondary = Math.sin(this._time * tree.speed * 0.4 + tree.phase * 1.7) * 0.06;
            const angle = primary + secondary;

            tree.canopy.rotation = angle;
            tree.canopy.skew.x = angle * 0.5;

            // Trunk sways less — anchored at base
            tree.trunk.skew.x = angle * 0.25;
        }
    }
}
