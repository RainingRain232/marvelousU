// Procedural renderer for a little princess girl NPC.
//
// A small medieval fantasy princess with blond hair and a white dress.
// Behaviors:
//   - IDLE: stands still, dances on the spot (swaying, twirling)
//   - MOVE: runs around the map
//   - PET:  when near a rabbit, kneels down and pets it
//
// She chases nearby rabbits and pets them when close enough.

import { Container, Graphics } from "pixi.js";
import { RabbitRenderer } from "./RabbitRenderer";

enum PrincessState {
    IDLE = "idle",
    MOVE = "move",
    PET = "pet",
}

export class PrincessRenderer {
    readonly container = new Container();
    private _body = new Container();
    private _gfx = new Graphics();

    private _state = PrincessState.IDLE;
    private _stateTimer = 0;
    private _time = 0;

    private _targetPos = { x: 0, y: 0 };
    private _vel = { x: 0, y: 0 };
    private _speed = 55 + Math.random() * 20;

    private _bounds: { w: number; h: number };
    private _rabbits: RabbitRenderer[];
    private _chasingRabbit: RabbitRenderer | null = null;

    // Dance sub-state
    private _danceType = 0; // 0=sway, 1=twirl, 2=bounce

    constructor(
        x: number,
        y: number,
        bounds: { w: number; h: number },
        rabbits: RabbitRenderer[],
        _seed: number,
    ) {
        this._bounds = bounds;
        this._rabbits = rabbits;
        this.container.position.set(x, y);
        this.container.addChild(this._body);
        this._body.addChild(this._gfx);

        this._time = Math.random() * 100;
        this._resetState();
    }

    private _drawPrincess(
        g: Graphics,
        bob = 0,
        tilt = 0,
        armL = 0,
        armR = 0,
        legStanceL = 0,
        legStanceR = 0,
        kneeling = false,
    ): void {
        g.clear();

        const cx = 0;
        const gy = 0; // feet at origin

        // --- Palette ---
        const COL_HAIR = 0xf5d442;
        const COL_HAIR_DK = 0xd4b832;
        const COL_SKIN = 0xf5cba7;
        const COL_SKIN_DK = 0xe0a87c;
        const COL_DRESS = 0xffffff;
        const COL_DRESS_DK = 0xe8e0d8;
        const COL_DRESS_TRIM = 0xf0c070;
        const COL_CROWN = 0xffd700;
        const COL_CROWN_GEM = 0xff3355;
        const COL_EYE = 0x334488;
        const COL_BOOT = 0xc09060;
        const COL_SHADOW = 0x000000;

        // Layout
        const kneelDrop = kneeling ? 6 : 0;
        const dressH = 10 - (kneeling ? 3 : 0);
        const torsoH = 8;
        const headR = 5;

        const dressBottom = gy - 2 + kneelDrop;
        const dressTop = dressBottom - dressH;
        const torsoTop = dressTop - torsoH + 3 + bob;
        const headY = torsoTop - headR + 1 + bob;

        // Shadow
        g.ellipse(cx, gy + 1, 10, 3).fill({ color: COL_SHADOW, alpha: 0.2 });

        // --- Dress (flowy trapezoid) ---
        const dressW_top = 10;
        const dressW_bot = 16;
        g.moveTo(cx - dressW_top / 2 + tilt, dressTop)
            .lineTo(cx + dressW_top / 2 + tilt, dressTop)
            .lineTo(cx + dressW_bot / 2 + tilt * 0.5, dressBottom)
            .lineTo(cx - dressW_bot / 2 + tilt * 0.5, dressBottom)
            .closePath()
            .fill({ color: COL_DRESS })
            .stroke({ color: COL_DRESS_DK, width: 0.6 });

        // Dress trim (gold line at bottom)
        g.moveTo(cx - dressW_bot / 2 + tilt * 0.5, dressBottom - 1)
            .lineTo(cx + dressW_bot / 2 + tilt * 0.5, dressBottom - 1)
            .stroke({ color: COL_DRESS_TRIM, width: 1.2 });

        // Dress lace detail
        for (let i = 0; i < 3; i++) {
            const lx = cx - 4 + i * 4 + tilt * 0.5;
            const ly = dressBottom - 3;
            g.moveTo(lx, ly)
                .quadraticCurveTo(lx + 2, ly + 2, lx + 4, ly)
                .stroke({ color: COL_DRESS_TRIM, width: 0.5, alpha: 0.6 });
        }

        // --- Boots (peek from dress) ---
        if (!kneeling) {
            g.roundRect(cx - 5 + legStanceL, gy - 3, 4, 3, 1).fill({ color: COL_BOOT });
            g.roundRect(cx + 1 + legStanceR, gy - 3, 4, 3, 1).fill({ color: COL_BOOT });
        }

        // --- Torso (bodice) ---
        const tw = 10;
        g.roundRect(cx - tw / 2 + tilt, torsoTop, tw, torsoH, 2)
            .fill({ color: COL_DRESS })
            .stroke({ color: COL_DRESS_DK, width: 0.5 });

        // Bodice detail (V neckline)
        g.moveTo(cx - 3 + tilt, torsoTop)
            .lineTo(cx + tilt, torsoTop + 4)
            .lineTo(cx + 3 + tilt, torsoTop)
            .stroke({ color: COL_DRESS_TRIM, width: 0.8 });

        // --- Arms ---
        const shoulderY = torsoTop + 2;
        // Left arm
        const lArmX = cx - tw / 2 - 1 + tilt;
        const lHandX = lArmX - 3 + armL;
        const lHandY = shoulderY + 7 + Math.abs(armL) * 0.3;
        g.moveTo(lArmX, shoulderY)
            .lineTo(lHandX, lHandY)
            .stroke({ color: COL_SKIN, width: 2 });
        g.circle(lHandX, lHandY, 1.5).fill({ color: COL_SKIN_DK });

        // Right arm
        const rArmX = cx + tw / 2 + 1 + tilt;
        const rHandX = rArmX + 3 + armR;
        const rHandY = shoulderY + 7 + Math.abs(armR) * 0.3;
        g.moveTo(rArmX, shoulderY)
            .lineTo(rHandX, rHandY)
            .stroke({ color: COL_SKIN, width: 2 });
        g.circle(rHandX, rHandY, 1.5).fill({ color: COL_SKIN_DK });

        // --- Head ---
        // Hair back (behind head)
        g.ellipse(cx + tilt, headY, headR + 2, headR + 1).fill({ color: COL_HAIR });

        // Head shape
        g.circle(cx + tilt, headY, headR).fill({ color: COL_SKIN });

        // Hair front (bangs)
        g.ellipse(cx + tilt, headY - 3, headR + 1, 3).fill({ color: COL_HAIR });
        // Side curls
        g.ellipse(cx - headR - 1 + tilt, headY + 1, 2, 4).fill({ color: COL_HAIR });
        g.ellipse(cx + headR + 1 + tilt, headY + 1, 2, 4).fill({ color: COL_HAIR });

        // Hair flowing down back
        g.moveTo(cx - 3 + tilt, headY + 2)
            .lineTo(cx - 4 + tilt, torsoTop + torsoH + 2)
            .lineTo(cx + 4 + tilt, torsoTop + torsoH + 2)
            .lineTo(cx + 3 + tilt, headY + 2)
            .fill({ color: COL_HAIR_DK, alpha: 0.6 });

        // Eyes
        g.circle(cx - 2 + tilt, headY - 0.5, 0.8).fill({ color: COL_EYE });
        g.circle(cx + 2 + tilt, headY - 0.5, 0.8).fill({ color: COL_EYE });

        // Mouth (little smile)
        g.moveTo(cx - 1 + tilt, headY + 2)
            .quadraticCurveTo(cx + tilt, headY + 3, cx + 1 + tilt, headY + 2)
            .stroke({ color: COL_SKIN_DK, width: 0.6 });

        // Blush
        g.circle(cx - 3 + tilt, headY + 1, 1.5).fill({ color: 0xffaaaa, alpha: 0.3 });
        g.circle(cx + 3 + tilt, headY + 1, 1.5).fill({ color: 0xffaaaa, alpha: 0.3 });

        // --- Crown / Tiara ---
        const crownY = headY - headR - 1;
        // Base band
        g.rect(cx - 4 + tilt, crownY + 1, 8, 2).fill({ color: COL_CROWN });
        // Three points
        g.moveTo(cx - 3 + tilt, crownY + 1)
            .lineTo(cx - 2 + tilt, crownY - 2)
            .lineTo(cx - 1 + tilt, crownY + 1)
            .fill({ color: COL_CROWN });
        g.moveTo(cx + tilt, crownY + 1)
            .lineTo(cx + 1 + tilt, crownY - 3)
            .lineTo(cx + 2 + tilt, crownY + 1)
            .fill({ color: COL_CROWN });
        g.moveTo(cx + 2 + tilt, crownY + 1)
            .lineTo(cx + 3 + tilt, crownY - 2)
            .lineTo(cx + 4 + tilt, crownY + 1)
            .fill({ color: COL_CROWN });
        // Center gem
        g.circle(cx + 1 + tilt, crownY - 1, 1).fill({ color: COL_CROWN_GEM });
    }

    private _findNearestRabbit(): RabbitRenderer | null {
        let nearest: RabbitRenderer | null = null;
        let minDist = 200; // detection range
        const px = this.container.x;
        const py = this.container.y;

        for (const r of this._rabbits) {
            const dx = r.container.x - px;
            const dy = r.container.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                nearest = r;
            }
        }
        return nearest;
    }

    private _resetState(): void {
        const r = Math.random();
        if (r < 0.35) {
            // Dance idle
            this._state = PrincessState.IDLE;
            this._stateTimer = 3 + Math.random() * 5;
            this._danceType = Math.floor(Math.random() * 3);
        } else if (r < 0.7) {
            // Chase a rabbit
            const rabbit = this._findNearestRabbit();
            if (rabbit) {
                this._state = PrincessState.MOVE;
                this._chasingRabbit = rabbit;
                this._stateTimer = 3 + Math.random() * 4;
            } else {
                // Wander
                this._state = PrincessState.MOVE;
                this._chasingRabbit = null;
                this._stateTimer = 2 + Math.random() * 3;
                this._targetPos = {
                    x: Math.random() * this._bounds.w,
                    y: Math.random() * this._bounds.h,
                };
                const dx = this._targetPos.x - this.container.x;
                const dy = this._targetPos.y - this.container.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                this._vel = {
                    x: (dx / dist) * this._speed,
                    y: (dy / dist) * this._speed,
                };
                this._body.scale.x = this._vel.x > 0 ? 1 : -1;
            }
        } else {
            // Wander randomly
            this._state = PrincessState.MOVE;
            this._chasingRabbit = null;
            this._stateTimer = 2 + Math.random() * 3;
            this._targetPos = {
                x: Math.random() * this._bounds.w,
                y: Math.random() * this._bounds.h,
            };
            const dx = this._targetPos.x - this.container.x;
            const dy = this._targetPos.y - this.container.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this._vel = {
                x: (dx / dist) * this._speed,
                y: (dy / dist) * this._speed,
            };
            this._body.scale.x = this._vel.x > 0 ? 1 : -1;
        }
    }

    update(dt: number): void {
        this._time += dt;
        this._stateTimer -= dt;

        if (this._stateTimer <= 0 && this._state !== PrincessState.PET) {
            this._resetState();
        }

        switch (this._state) {
            case PrincessState.IDLE:
                this._updateIdle(dt);
                break;
            case PrincessState.MOVE:
                this._updateMove(dt);
                break;
            case PrincessState.PET:
                this._updatePet(dt);
                break;
        }
    }

    private _updateIdle(_dt: number): void {
        const t = this._time;
        let bob = 0;
        let tilt = 0;
        let armL = 0;
        let armR = 0;

        switch (this._danceType) {
            case 0: // Gentle sway
                tilt = Math.sin(t * 2.5) * 2;
                bob = Math.sin(t * 3) * 0.8;
                armL = Math.sin(t * 2.5) * 2;
                armR = -Math.sin(t * 2.5) * 2;
                break;
            case 1: // Twirl (spin via scale oscillation to fake rotation)
                tilt = Math.sin(t * 4) * 3;
                bob = Math.abs(Math.sin(t * 4)) * -2;
                armL = Math.sin(t * 4 + 1) * 4;
                armR = Math.sin(t * 4 - 1) * 4;
                // Fake twirl by flipping scale
                this._body.scale.x =
                    Math.sin(t * 2) > 0 ? 1 : -1;
                break;
            case 2: // Bounce
                bob = Math.abs(Math.sin(t * 5)) * -3;
                armL = Math.sin(t * 5) * 3;
                armR = -Math.sin(t * 5) * 3;
                break;
        }

        this._drawPrincess(this._gfx, bob, tilt, armL, armR);
    }

    private _updateMove(dt: number): void {
        // If chasing a rabbit, update velocity toward it
        if (this._chasingRabbit) {
            const rx = this._chasingRabbit.container.x;
            const ry = this._chasingRabbit.container.y;
            const dx = rx - this.container.x;
            const dy = ry - this.container.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 20) {
                // Close enough to pet!
                this._state = PrincessState.PET;
                this._stateTimer = 2 + Math.random() * 3;
                this._vel = { x: 0, y: 0 };
                return;
            }

            if (dist > 0) {
                this._vel = {
                    x: (dx / dist) * this._speed,
                    y: (dy / dist) * this._speed,
                };
                this._body.scale.x = this._vel.x > 0 ? 1 : -1;
            }
        }

        this.container.x += this._vel.x * dt;
        this.container.y += this._vel.y * dt;

        // Clamp to bounds
        this.container.x = Math.max(
            0,
            Math.min(this._bounds.w, this.container.x),
        );
        this.container.y = Math.max(
            0,
            Math.min(this._bounds.h, this.container.y),
        );

        // Run animation
        const runCycle = Math.sin(this._time * 10);
        const bob = Math.abs(runCycle) * -2;
        const legL = Math.round(runCycle * 3);
        const legR = Math.round(-runCycle * 3);
        const armL = runCycle * 3;
        const armR = -runCycle * 3;

        this._drawPrincess(
            this._gfx,
            bob,
            runCycle * 0.5,
            armL,
            armR,
            legL,
            legR,
        );
    }

    private _updatePet(_dt: number): void {
        this._stateTimer -= 0; // already handled in update()

        if (this._stateTimer <= 0) {
            this._resetState();
            return;
        }

        // Kneeling pose with gentle arm movement (petting)
        const petMotion = Math.sin(this._time * 4) * 2;

        // Face toward rabbit if still there
        if (this._chasingRabbit) {
            const dx = this._chasingRabbit.container.x - this.container.x;
            this._body.scale.x = dx > 0 ? 1 : -1;
        }

        this._drawPrincess(
            this._gfx,
            0,       // no bob
            0,       // no tilt
            petMotion + 4, // left arm reaching forward to pet
            -1,      // right arm at side
            0,
            0,
            true,    // kneeling
        );
    }
}
