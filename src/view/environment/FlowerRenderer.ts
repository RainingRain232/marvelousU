import { Container, Graphics } from "pixi.js";

export class FlowerRenderer {
    readonly container = new Container();
    private _flowers: Array<{ g: Graphics; phase: number; speed: number; baseY: number }> = [];
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

            const flower = this._createFlower(next);
            flower.position.set(x, y);
            this.container.addChild(flower);

            this._flowers.push({
                g: flower,
                phase: next() * Math.PI * 2,
                speed: 0.8 + next() * 1.2,
                baseY: y,
            });
        }
    }

    private _createFlower(next: () => number): Graphics {
        const g = new Graphics();

        // Pick a flower type
        const type = Math.floor(next() * 4);

        if (type === 0) {
            // Daisy — white petals, yellow center
            this._drawDaisy(g, next);
        } else if (type === 1) {
            // Poppy — red petals, dark center
            this._drawPoppy(g, next);
        } else if (type === 2) {
            // Bluebell — blue drooping bell
            this._drawBluebell(g, next);
        } else {
            // Wildflower — small clustered dots
            this._drawWildflower(g, next);
        }

        // Stem
        const stemH = 4 + next() * 6;
        const stemColor = 0x3d7a30;
        g.moveTo(0, 0)
            .lineTo((next() - 0.5) * 2, stemH)
            .stroke({ color: stemColor, width: 1.2 });

        return g;
    }

    private _drawDaisy(g: Graphics, next: () => number): void {
        const petalCount = 5 + Math.floor(next() * 3);
        const petalLen = 3 + next() * 2;
        const petalW = 1.5 + next() * 1;

        for (let p = 0; p < petalCount; p++) {
            const angle = (p / petalCount) * Math.PI * 2 + next() * 0.3;
            const px = Math.cos(angle) * petalLen;
            const py = Math.sin(angle) * petalLen;

            g.ellipse(px, py, petalW, petalLen * 0.4)
                .fill({ color: 0xffffff, alpha: 0.95 });
        }
        // Center
        g.circle(0, 0, 1.5 + next() * 0.5)
            .fill({ color: 0xffd700 });
    }

    private _drawPoppy(g: Graphics, next: () => number): void {
        const petalCount = 4 + Math.floor(next() * 2);
        const size = 3 + next() * 2;
        const colors = [0xe83030, 0xd42020, 0xf04040, 0xcc2828];

        for (let p = 0; p < petalCount; p++) {
            const angle = (p / petalCount) * Math.PI * 2 + next() * 0.4;
            const px = Math.cos(angle) * size * 0.5;
            const py = Math.sin(angle) * size * 0.5;
            const color = colors[Math.floor(next() * colors.length)];

            g.circle(px, py, size * 0.45)
                .fill({ color, alpha: 0.9 });
        }
        // Dark center
        g.circle(0, 0, size * 0.2)
            .fill({ color: 0x1a0505 });
    }

    private _drawBluebell(g: Graphics, next: () => number): void {
        const colors = [0x4466cc, 0x5577dd, 0x3355bb, 0x6688ee];
        const color = colors[Math.floor(next() * colors.length)];
        const size = 2.5 + next() * 1.5;

        // Bell shape — oval drooping downward
        g.ellipse(0, -size * 0.3, size * 0.6, size)
            .fill({ color, alpha: 0.85 });
        // Highlight
        g.ellipse(-size * 0.15, -size * 0.5, size * 0.2, size * 0.4)
            .fill({ color: 0xffffff, alpha: 0.15 });
    }

    private _drawWildflower(g: Graphics, next: () => number): void {
        const colors = [0xee88cc, 0xddaa44, 0xcc66aa, 0xffcc55, 0xaa55cc];
        const color = colors[Math.floor(next() * colors.length)];
        const dotCount = 3 + Math.floor(next() * 4);

        for (let d = 0; d < dotCount; d++) {
            const dx = (next() - 0.5) * 5;
            const dy = (next() - 0.5) * 5;
            const r = 0.8 + next() * 1.2;

            g.circle(dx, dy, r)
                .fill({ color, alpha: 0.9 });
        }
    }

    update(dt: number): void {
        this._time += dt;
        for (const f of this._flowers) {
            // Gentle swaying
            const sway = Math.sin(this._time * f.speed + f.phase) * 0.08;
            f.g.rotation = sway;
        }
    }
}
