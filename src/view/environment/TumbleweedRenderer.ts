import { Container, Graphics } from "pixi.js";

interface Tumbleweed {
    g: Graphics;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    rotation: number;
    rotSpeed: number;
    /** Wobble in vertical drift */
    wobblePhase: number;
    wobbleSpeed: number;
}

export class TumbleweedRenderer {
    readonly container = new Container();
    private _weeds: Tumbleweed[] = [];
    private _time = 0;
    private _worldW: number;
    private _worldH: number;
    private _spawnTimer = 0;
    private _nextSpawn: number;
    private _seed: number;

    constructor(worldW: number, worldH: number, seed: number) {
        this._worldW = worldW;
        this._worldH = worldH;
        this._seed = seed;
        this._nextSpawn = 2 + this._rng() * 4;

        // Start with a few already on the map
        for (let i = 0; i < 3; i++) {
            this._spawn(true);
        }
    }

    private _rng(): number {
        this._seed = (this._seed * 1103515245 + 12345) & 0x7fffffff;
        return this._seed / 0x7fffffff;
    }

    private _spawn(onMap = false): void {
        const size = 8 + this._rng() * 12;

        // Spawn off left edge, at a random height
        let x: number;
        let y: number;
        if (onMap) {
            x = this._rng() * this._worldW;
            y = this._rng() * this._worldH;
        } else {
            x = -size * 2;
            y = this._rng() * this._worldH;
        }

        const baseSpeed = 30 + this._rng() * 40;
        const vx = baseSpeed;
        const vy = (this._rng() - 0.5) * 10;

        const g = this._createWeed(size);
        g.position.set(x, y);
        this.container.addChild(g);

        this._weeds.push({
            g, x, y, vx, vy, size,
            rotation: this._rng() * Math.PI * 2,
            rotSpeed: 1.5 + this._rng() * 2.5,
            wobblePhase: this._rng() * Math.PI * 2,
            wobbleSpeed: 1.2 + this._rng() * 1.0,
        });
    }

    private _createWeed(size: number): Graphics {
        const g = new Graphics();
        const r = size / 2;

        // Draw a tangled ball of dried branches
        const branchCount = 6 + Math.floor(this._rng() * 5);
        const colors = [0x8b7355, 0x9c8462, 0x7a6448, 0xa89070];

        for (let i = 0; i < branchCount; i++) {
            const angle = (i / branchCount) * Math.PI * 2;
            const len = r * (0.6 + this._rng() * 0.5);
            const cx1 = Math.cos(angle + 0.3) * len * 0.5;
            const cy1 = Math.sin(angle + 0.3) * len * 0.5;
            const ex = Math.cos(angle) * len;
            const ey = Math.sin(angle) * len;
            const color = colors[Math.floor(this._rng() * colors.length)];

            g.moveTo(0, 0)
                .bezierCurveTo(cx1, cy1, ex * 0.8, ey * 0.8, ex, ey)
                .stroke({ color, width: 1 + this._rng() * 0.8, cap: "round" });
        }

        // Add some cross-hatching for density
        for (let i = 0; i < 4; i++) {
            const a1 = this._rng() * Math.PI * 2;
            const a2 = a1 + Math.PI * (0.3 + this._rng() * 0.4);
            const r1 = r * (0.3 + this._rng() * 0.4);
            const r2 = r * (0.3 + this._rng() * 0.4);
            const color = colors[Math.floor(this._rng() * colors.length)];

            g.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1)
                .lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2)
                .stroke({ color, width: 0.8 });
        }

        // Slight fill to give it body
        g.circle(0, 0, r * 0.65)
            .fill({ color: 0x8b7355, alpha: 0.15 });

        return g;
    }

    update(dt: number): void {
        this._time += dt;

        // Spawn new tumbleweeds
        this._spawnTimer += dt;
        if (this._spawnTimer >= this._nextSpawn) {
            this._spawnTimer = 0;
            this._nextSpawn = 4 + this._rng() * 8;
            this._spawn();
        }

        // Update existing
        for (let i = this._weeds.length - 1; i >= 0; i--) {
            const w = this._weeds[i];

            // Wind gusts — speed varies over time
            const gust = 1 + Math.sin(this._time * 0.3 + w.wobblePhase) * 0.4;
            w.x += w.vx * gust * dt;
            w.y += w.vy * dt + Math.sin(this._time * w.wobbleSpeed + w.wobblePhase) * 0.5 * dt;

            // Rolling rotation
            w.rotation += w.rotSpeed * gust * dt;

            // Bouncy ground contact — slight hop effect
            const hop = Math.abs(Math.sin(this._time * 2.5 + w.wobblePhase)) * 3;

            w.g.position.set(w.x, w.y - hop);
            w.g.rotation = w.rotation;

            // Shadow gets smaller during hop
            const shadowScale = 1 - hop / 12;
            w.g.scale.set(1, 0.85 + shadowScale * 0.15);

            // Remove if off right edge
            if (w.x > this._worldW + w.size * 3) {
                this.container.removeChild(w.g);
                w.g.destroy();
                this._weeds.splice(i, 1);
            }
        }
    }

    destroy(): void {
        for (const w of this._weeds) w.g.destroy();
        this._weeds.length = 0;
    }
}
