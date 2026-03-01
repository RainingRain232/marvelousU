import { Container, Graphics } from "pixi.js";

/**
 * Ancient, gnarled forest trees with thick twisted trunks, hanging moss,
 * dangling vines, knotholes, exposed roots, and dense layered canopies.
 * These are old-growth fantasy trees — massive and atmospheric.
 */
export class ForestTreeRenderer {
    readonly container = new Container();
    private _trees: Array<{
        trunk: Graphics;
        canopy: Graphics;
        vines: Graphics;
        phase: number;
        speed: number;
        vinePhases: number[];
    }> = [];
    private _time = 0;

    constructor(count: number, width: number, height: number, seed: number) {
        let s = seed;
        const next = () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };

        for (let i = 0; i < count; i++) {
            const x = next() * width;
            const y = next() * height;

            const { trunk, canopy, vines, vinePhases } = this._createTree(next);
            const treeContainer = new Container();
            treeContainer.addChild(trunk);
            treeContainer.addChild(canopy);
            treeContainer.addChild(vines);
            treeContainer.position.set(x, y);
            this.container.addChild(treeContainer);

            this._trees.push({
                trunk,
                canopy,
                vines,
                phase: next() * Math.PI * 2,
                speed: 0.3 + next() * 0.4,
                vinePhases,
            });
        }
    }

    private _createTree(next: () => number): {
        trunk: Graphics;
        canopy: Graphics;
        vines: Graphics;
        vinePhases: number[];
    } {
        const trunk = new Graphics();
        const canopy = new Graphics();
        const vines = new Graphics();

        // These trees are BIG
        const trunkW = 14 + next() * 10;
        const trunkH = 35 + next() * 25;
        const trunkColors = [0x3d2a15, 0x4a3320, 0x33200d];
        const trunkColor = trunkColors[Math.floor(next() * trunkColors.length)];

        // --- Exposed roots spreading outward ---
        const rootCount = 3 + Math.floor(next() * 4);
        for (let r = 0; r < rootCount; r++) {
            const side = r < rootCount / 2 ? -1 : 1;
            const rootLen = 10 + next() * 15;
            const rootW = 2 + next() * 3;
            const rootCurve = next() * 6 * side;
            const rootY = 2 + next() * 4;

            trunk.moveTo(side * trunkW * 0.3, 0)
                .bezierCurveTo(
                    side * rootLen * 0.4, rootY * 0.5,
                    side * rootLen * 0.7 + rootCurve, rootY * 0.8,
                    side * rootLen, rootY
                )
                .stroke({ color: trunkColor, width: rootW, cap: "round" });
        }

        // --- Twisted trunk (not a plain rectangle — bezier-shaped) ---
        const twist = (next() - 0.5) * 8;
        // Left edge
        trunk.moveTo(-trunkW / 2, 0)
            .bezierCurveTo(
                -trunkW / 2 + twist * 0.3, -trunkH * 0.3,
                -trunkW / 2 - twist * 0.2, -trunkH * 0.7,
                -trunkW * 0.4, -trunkH
            );
        // Right edge
        trunk.lineTo(trunkW * 0.4, -trunkH)
            .bezierCurveTo(
                trunkW / 2 + twist * 0.2, -trunkH * 0.7,
                trunkW / 2 - twist * 0.3, -trunkH * 0.3,
                trunkW / 2, 0
            );
        trunk.closePath().fill({ color: trunkColor });

        // Bark texture — vertical dark lines
        for (let b = 0; b < 4; b++) {
            const bx = (next() - 0.5) * trunkW * 0.6;
            const by1 = -next() * trunkH * 0.3;
            const by2 = by1 - trunkH * 0.3 - next() * trunkH * 0.3;
            trunk.moveTo(bx, by1).lineTo(bx + (next() - 0.5) * 2, by2)
                .stroke({ color: 0x1a1008, width: 1 + next() * 0.5, alpha: 0.4 });
        }

        // --- Knothole ---
        if (next() > 0.3) {
            const kx = (next() - 0.5) * trunkW * 0.4;
            const ky = -trunkH * (0.3 + next() * 0.3);
            const kr = 2.5 + next() * 2;
            // Dark hole
            trunk.ellipse(kx, ky, kr, kr * 1.3)
                .fill({ color: 0x0a0500 });
            // Ring around it
            trunk.ellipse(kx, ky, kr + 1.5, kr * 1.3 + 1.5)
                .stroke({ color: 0x2a1808, width: 1.5 });
        }

        // --- Moss patches on trunk ---
        const mossCount = 2 + Math.floor(next() * 3);
        for (let m = 0; m < mossCount; m++) {
            const mx = (next() - 0.5) * trunkW * 0.5;
            const my = -next() * trunkH * 0.8;
            const mr = 3 + next() * 4;
            const mossColors = [0x3a6630, 0x2d5525, 0x4a7a3a];
            const mc = mossColors[Math.floor(next() * mossColors.length)];
            trunk.ellipse(mx, my, mr, mr * 0.6)
                .fill({ color: mc, alpha: 0.6 });
        }

        // --- Major branches forking from top of trunk ---
        const branchCount = 2 + Math.floor(next() * 3);
        for (let b = 0; b < branchCount; b++) {
            const side = (b % 2 === 0 ? -1 : 1);
            const bStartY = -trunkH * (0.7 + next() * 0.3);
            const bLen = 15 + next() * 20;
            const bEndX = side * bLen;
            const bEndY = bStartY - 5 - next() * 10;
            const bw = 3 + next() * 3;

            trunk.moveTo(0, bStartY)
                .bezierCurveTo(
                    side * bLen * 0.3, bStartY - 3,
                    bEndX * 0.7, bEndY + 2,
                    bEndX, bEndY
                )
                .stroke({ color: trunkColor, width: bw, cap: "round" });
        }

        // --- Dense layered canopy ---
        const canopySize = 35 + next() * 30;
        const foliageColors = [0x1a4420, 0x1f5528, 0x163a18, 0x245530, 0x0f2e12];
        const highlightColors = [0x2a6635, 0x348840, 0x1e553a];

        // Bottom shadow layer
        const cCount = 8 + Math.floor(next() * 6);
        for (let i = 0; i < cCount; i++) {
            const cx = (next() - 0.5) * canopySize;
            const cy = -trunkH - (next() * canopySize * 0.5) - 5;
            const cr = (0.35 + next() * 0.5) * canopySize;
            const color = foliageColors[Math.floor(next() * foliageColors.length)];

            canopy.circle(cx, cy, cr)
                .fill({ color, alpha: 0.85 });
        }

        // Top highlight clusters
        for (let i = 0; i < 4; i++) {
            const cx = (next() - 0.5) * canopySize * 0.7;
            const cy = -trunkH - canopySize * 0.3 - next() * canopySize * 0.3;
            const cr = (0.2 + next() * 0.3) * canopySize;
            const hc = highlightColors[Math.floor(next() * highlightColors.length)];

            canopy.circle(cx, cy, cr)
                .fill({ color: hc, alpha: 0.5 });
        }

        // Dappled light spots
        for (let i = 0; i < 3; i++) {
            const lx = (next() - 0.5) * canopySize * 0.5;
            const ly = -trunkH - next() * canopySize * 0.4 - 5;
            const lr = 2 + next() * 4;
            canopy.circle(lx, ly, lr)
                .fill({ color: 0x88cc66, alpha: 0.12 + next() * 0.08 });
        }

        // --- Hanging vines (animated separately) ---
        const vinePhases: number[] = [];
        const vineCount = 2 + Math.floor(next() * 4);
        for (let v = 0; v < vineCount; v++) {
            vinePhases.push(next() * Math.PI * 2);
            // Vines are drawn in update since they animate
        }
        // Store vine data on the graphics for later reference
        (vines as any)._vineData = [];
        for (let v = 0; v < vineCount; v++) {
            const vx = (next() - 0.5) * canopySize * 0.8;
            const vy = -trunkH - next() * canopySize * 0.3;
            const vLen = 15 + next() * 25;
            const leafCount = 2 + Math.floor(next() * 4);
            (vines as any)._vineData.push({ vx, vy, vLen, leafCount });
        }

        return { trunk, canopy, vines, vinePhases };
    }

    update(dt: number): void {
        this._time += dt;
        for (const tree of this._trees) {
            // Very subtle canopy sway — these are ancient heavy trees
            const primary = Math.sin(this._time * tree.speed + tree.phase) * 0.04;
            const secondary = Math.sin(this._time * tree.speed * 0.3 + tree.phase * 1.5) * 0.02;
            const angle = primary + secondary;

            tree.canopy.rotation = angle;
            tree.canopy.skew.x = angle * 0.3;
            tree.trunk.skew.x = angle * 0.08;

            // Redraw vines with pendulum animation
            const g = tree.vines;
            const vineData = (g as any)._vineData as Array<{
                vx: number; vy: number; vLen: number; leafCount: number;
            }>;
            if (!vineData) continue;

            g.clear();
            for (let v = 0; v < vineData.length; v++) {
                const d = vineData[v];
                const vPhase = tree.vinePhases[v] ?? 0;
                const swing = Math.sin(this._time * 0.8 + vPhase) * 6;
                const swing2 = Math.sin(this._time * 1.2 + vPhase * 1.3) * 3;

                // Vine curve
                const endX = d.vx + swing;
                const endY = d.vy + d.vLen;
                const midX = d.vx + swing * 0.5 + swing2;
                const midY = d.vy + d.vLen * 0.5;

                g.moveTo(d.vx, d.vy)
                    .bezierCurveTo(d.vx, d.vy + d.vLen * 0.2, midX, midY, endX, endY)
                    .stroke({ color: 0x2a5520, width: 1.5, cap: "round" });

                // Small leaves along the vine
                for (let l = 0; l < d.leafCount; l++) {
                    const t = (l + 1) / (d.leafCount + 1);
                    const lx = d.vx + (endX - d.vx) * t + Math.sin(this._time * 1.5 + vPhase + l) * 1;
                    const ly = d.vy + d.vLen * t;
                    const side = l % 2 === 0 ? -1 : 1;

                    // Tiny leaf
                    g.moveTo(lx, ly)
                        .lineTo(lx + side * 4, ly + 2)
                        .lineTo(lx + side * 1, ly + 3)
                        .closePath()
                        .fill({ color: 0x336633, alpha: 0.8 });
                }
            }
        }
    }
}
