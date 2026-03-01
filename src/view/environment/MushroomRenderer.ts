import { Container, Graphics } from "pixi.js";

interface MushroomCluster {
    g: Graphics;
    x: number;
    y: number;
    glowPhase: number;
    glowSpeed: number;
    glowColor: number;
    glowRadius: number;
}

/**
 * Bioluminescent mushroom clusters scattered across the forest floor.
 * They pulse with an eerie soft glow — blues, purples, and teals —
 * casting faint light halos onto the dark ground around them.
 */
export class MushroomRenderer {
    readonly container = new Container();
    private _glowGfx = new Graphics();
    private _clusters: MushroomCluster[] = [];
    private _time = 0;

    constructor(count: number, worldW: number, worldH: number, seed: number) {
        // Glow layer goes behind the mushroom sprites
        this.container.addChild(this._glowGfx);

        let s = seed;
        const next = () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };

        const glowColors = [0x4488cc, 0x6644bb, 0x44aaaa, 0x5566dd, 0x8844cc];

        for (let i = 0; i < count; i++) {
            const x = next() * worldW;
            const y = next() * worldH;
            const glowColor = glowColors[Math.floor(next() * glowColors.length)];

            const g = this._createCluster(next, glowColor);
            g.position.set(x, y);
            this.container.addChild(g);

            this._clusters.push({
                g, x, y,
                glowPhase: next() * Math.PI * 2,
                glowSpeed: 0.8 + next() * 1.5,
                glowColor,
                glowRadius: 12 + next() * 10,
            });
        }
    }

    private _createCluster(next: () => number, glowColor: number): Graphics {
        const g = new Graphics();
        const mushroomCount = 2 + Math.floor(next() * 4);

        for (let m = 0; m < mushroomCount; m++) {
            const mx = (next() - 0.5) * 12;
            const my = (next() - 0.5) * 6;
            const stemH = 3 + next() * 6;
            const capR = 2.5 + next() * 4;
            const isBig = capR > 4;

            // Stem
            const stemColor = 0xccbbaa;
            g.rect(mx - 1, my - stemH, 2, stemH)
                .fill({ color: stemColor, alpha: 0.8 });

            // Cap — dome shape
            g.ellipse(mx, my - stemH, capR, capR * 0.55)
                .fill({ color: glowColor, alpha: 0.85 });

            // Cap highlight
            g.ellipse(mx - capR * 0.2, my - stemH - capR * 0.15, capR * 0.4, capR * 0.25)
                .fill({ color: 0xffffff, alpha: 0.15 });

            // Spots on larger caps
            if (isBig) {
                for (let s = 0; s < 3; s++) {
                    const sx = mx + (next() - 0.5) * capR;
                    const sy = my - stemH - next() * capR * 0.3;
                    g.circle(sx, sy, 0.6 + next() * 0.6)
                        .fill({ color: 0xffffff, alpha: 0.25 });
                }
            }

            // Gills under cap
            g.moveTo(mx - capR * 0.7, my - stemH + capR * 0.4)
                .lineTo(mx + capR * 0.7, my - stemH + capR * 0.4)
                .stroke({ color: 0x000000, width: 0.5, alpha: 0.2 });
        }

        // Small leaf/debris around base
        if (next() > 0.4) {
            const lx = (next() - 0.5) * 10;
            const ly = next() * 3;
            g.ellipse(lx, ly, 3, 1)
                .fill({ color: 0x4a3a20, alpha: 0.5 });
        }

        return g;
    }

    update(dt: number): void {
        this._time += dt;
        const g = this._glowGfx;
        g.clear();

        for (const c of this._clusters) {
            // Pulsing ground glow
            const pulse = Math.sin(this._time * c.glowSpeed + c.glowPhase);
            const glowAlpha = 0.06 + pulse * 0.04;

            // Outer halo
            g.circle(c.x, c.y - 2, c.glowRadius)
                .fill({ color: c.glowColor, alpha: glowAlpha });

            // Inner bright spot
            g.circle(c.x, c.y - 3, c.glowRadius * 0.4)
                .fill({ color: c.glowColor, alpha: glowAlpha * 2 });

            // Subtle upward light shaft
            const shaftAlpha = (0.03 + pulse * 0.02) * 0.5;
            g.moveTo(c.x - 3, c.y - 4)
                .lineTo(c.x - 5, c.y - 15 - pulse * 3)
                .lineTo(c.x + 5, c.y - 15 - pulse * 3)
                .lineTo(c.x + 3, c.y - 4)
                .closePath()
                .fill({ color: c.glowColor, alpha: shaftAlpha });
        }
    }

    destroy(): void {
        this._glowGfx.destroy();
        for (const c of this._clusters) c.g.destroy();
    }
}
