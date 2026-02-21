// Procedural sprite generator for the Archer unit type.
//
// Draws a detailed medieval fantasy archer at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Forest green leather tunic / armor
//   • Brown leather hood / mantle
//   • Wood bow (curved longbow)
//   • Dynamic bowstring pulling and releasing
//   • Quiver on back (visual detail)
//   • Boots + legs with walk / collapse poses
//   • Shadow ellipse at feet

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const F = 48;          // frame size (px)
const CX = F / 2;      // center X
const GY = F - 4;      // ground Y (feet line)

// Palette ─ forest / leather scout tones
const COL_SKIN = 0xd4a574;
const COL_SKIN_DARK = 0xb8875a;
const COL_LEATHER = 0x5d3a1a;
const COL_LEATHER_DK = 0x3d2610;
const COL_FOREST = 0x2d4d2d;
const COL_FOREST_DK = 0x1d331d;
const COL_HOOD = 0x4a3728;
const COL_HOOD_DK = 0x34261c;
const COL_WOOD = 0x8b5a2b;
const COL_WOOD_DK = 0x5d3d1d;
const COL_STRING = 0xddddcc;
const COL_ARROW = 0xcccccc;
const COL_BOOT = 0x3d2610;
const COL_SHADOW = 0x000000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function sin01(frame: number, total: number): number {
    return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

// ---------------------------------------------------------------------------
// Drawing sub-routines
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, cx: number, gy: number, w = 12, h = 3.5): void {
    g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.25 });
}

function drawBoots(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number, squash = 0): void {
    const bw = 4, bh = 4 - squash;
    g.roundRect(cx - 6 + stanceL, gy - bh, bw, bh, 1).fill({ color: COL_BOOT });
    g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1).fill({ color: COL_BOOT });
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
    g.rect(cx - 4.5 + stanceL, legTop, 3, legH).fill({ color: COL_LEATHER_DK });
    g.rect(cx + 1.5 + stanceR, legTop, 3, legH).fill({ color: COL_LEATHER_DK });
}

function drawTorso(g: Graphics, cx: number, torsoTop: number, torsoH: number, tilt = 0): void {
    const tw = 12;
    const x = cx - tw / 2 + tilt;
    // Outer forest green tunic
    g.roundRect(x, torsoTop, tw, torsoH, 2)
        .fill({ color: COL_FOREST })
        .stroke({ color: COL_FOREST_DK, width: 0.8 });

    // Leather belt
    g.rect(x, torsoTop + torsoH - 5, tw, 2).fill({ color: COL_LEATHER_DK });
}

/** Quiver on back - slightly tilted. */
function drawQuiver(g: Graphics, cx: number, cy: number, tilt = 0): void {
    const angle = 0.3 + tilt;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const qw = 4, qh = 10;
    const xOff = 10; // offset from center
    const yOff = 2;

    // Manual transform for the quiver rect
    const p1 = { x: cx - (xOff * cos), y: cy - (yOff * sin) };

    // Just simplified drawing without rotate() - drawing a tilted line-based rect
    const rx = cx - 10;
    const ry = cy - 2;

    // We'll just draw a slightly tilted rect manually
    g.moveTo(rx, ry)
        .lineTo(rx + 4, ry - 1)
        .lineTo(rx + 6, ry + 9)
        .lineTo(rx + 2, ry + 10)
        .closePath()
        .fill({ color: COL_LEATHER });

    // Arrow fletching
    g.rect(rx + 1, ry - 4, 1, 4).fill({ color: COL_ARROW });
    g.rect(rx + 3, ry - 4, 1, 4).fill({ color: COL_ARROW });
}

function drawHood(g: Graphics, cx: number, headTop: number, tilt = 0): void {
    const hw = 10, hh = 11;
    const x = cx - hw / 2 + tilt;
    // Hood dome
    g.roundRect(x, headTop, hw, hh, 4)
        .fill({ color: COL_HOOD })
        .stroke({ color: COL_HOOD_DK, width: 0.7 });
    // Face opening
    g.rect(x + 2, headTop + 3, hw - 4, 5).fill({ color: COL_SKIN });
    // Hood tip / mantle fold
    g.moveTo(x, headTop + hh - 2)
        .lineTo(x + hw, headTop + hh - 2)
        .lineTo(x + hw / 2, headTop + hh + 2)
        .closePath()
        .fill({ color: COL_HOOD });
}

/**
 * Draws a longbow.
 */
function drawBow(g: Graphics, bowX: number, bowY: number, angle: number, pull: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const bowLen = 22;
    const curve = 5 + pull * 3;

    // Endpoints
    const x1 = bowX + (0 * cos - (-bowLen / 2) * sin);
    const y1 = bowY + (0 * sin + (-bowLen / 2) * cos);
    const x2 = bowX + (0 * cos - (bowLen / 2) * sin);
    const y2 = bowY + (0 * sin + (bowLen / 2) * cos);
    // Control point
    const cpx = bowX + (-curve * cos - 0 * sin);
    const cpy = bowY + (-curve * sin + 0 * cos);

    // Bow limbs
    g.moveTo(x1, y1)
        .quadraticCurveTo(cpx, cpy, x2, y2)
        .stroke({ color: COL_WOOD, width: 2 });
    // Outline/Dark side
    g.moveTo(x1, y1)
        .quadraticCurveTo(cpx - 1, cpy, x2, y2)
        .stroke({ color: COL_WOOD_DK, width: 0.5, alpha: 0.5 });

    // Bowstring
    const stringX = -pull * 10;
    const sx = bowX + (stringX * cos - 0 * sin);
    const sy = bowY + (stringX * sin + 0 * cos);

    g.moveTo(x1, y1)
        .lineTo(sx, sy)
        .lineTo(x2, y2)
        .stroke({ color: COL_STRING, width: 0.6, alpha: 0.8 });

    // Arrow (if pulled)
    if (pull > 0.1) {
        const arrowLen = 14;
        const ax = sx + (arrowLen * cos);
        const ay = sy + (arrowLen * sin);
        g.moveTo(sx, sy)
            .lineTo(ax, ay)
            .stroke({ color: COL_ARROW, width: 1.2 });
    }
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number, color = COL_SKIN): void {
    g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color, width: 2.5 });
    g.circle(ex, ey, 1.8).fill({ color: COL_SKIN_DARK });
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
    const t = sin01(frame, 8);
    const bob = Math.round(t * 1.5 - 0.75);

    const torsoTop = GY - 20 + bob;
    const hoodieTop = torsoTop - 10;

    drawShadow(g, CX, GY);
    drawQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, 0, 0);
    drawLegs(g, CX, GY - 10, 8, 0, 0);
    drawTorso(g, CX, torsoTop, 11);
    drawHood(g, CX, hoodieTop);

    // Holding bow at side
    drawArm(g, CX - 4, torsoTop + 3, CX - 7, torsoTop + 8);
    drawBow(g, CX - 8, torsoTop + 6, -0.2, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
    const t = frame / 8;
    const walk = Math.sin(t * Math.PI * 2);
    const bob = Math.abs(walk) * 2;

    const stanceL = Math.round(walk * 2.5);
    const stanceR = Math.round(-walk * 2.5);
    const torsoTop = GY - 20 - Math.round(bob);
    const hoodieTop = torsoTop - 10;

    drawShadow(g, CX, GY, 12 + Math.abs(walk) * 2);
    drawQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, stanceL, stanceR);
    drawLegs(g, CX, GY - 10, 8, stanceL, stanceR);
    drawTorso(g, CX, torsoTop, 11, walk * 0.3);
    drawHood(g, CX, hoodieTop, walk * 0.3);

    // Bow swinging while walking
    const bowX = CX - 8 + walk;
    const bowY = torsoTop + 6 + bob;
    drawArm(g, CX - 4, torsoTop + 3, bowX + 1, bowY + 2);
    drawBow(g, bowX, bowY, -0.2 + walk * 0.1, 0);
}

function generateAttackFrames(g: Graphics, frame: number): void {
    // 8 frames
    let pull = 0;
    let bowAngle = 0;
    let lunge = 0;

    if (frame <= 1) {
        bowAngle = lerp(0, Math.PI / 2, frame / 1);
    } else if (frame <= 4) {
        bowAngle = Math.PI / 2;
        pull = lerp(0.2, 0.9, (frame - 2) / 2);
        lunge = (frame - 2) * 1.5;
    } else if (frame === 5) {
        bowAngle = Math.PI / 2;
        pull = 1.0;
        lunge = 4;
    } else if (frame === 6) {
        bowAngle = Math.PI / 2;
        pull = -0.2; // slight inverse snap
        lunge = 3;
    } else {
        bowAngle = lerp(Math.PI / 2, 0.4, (frame - 6) / 1);
        pull = 0;
        lunge = 1;
    }

    const torsoTop = GY - 20;
    const hoodieTop = torsoTop - 10;

    drawShadow(g, CX + lunge * 0.5, GY, 12 + lunge);
    drawQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, -1, lunge);
    drawLegs(g, CX, GY - 10, 8, -1, lunge);
    drawTorso(g, CX, torsoTop, 11, lunge * 0.2);
    drawHood(g, CX, hoodieTop, lunge * 0.2);

    const bowX = CX + 12 + lunge;
    const bowY = torsoTop + 2;

    // Front arm holding bow
    drawArm(g, CX + 4 + lunge * 0.2, torsoTop + 3, bowX, bowY);

    // Rear arm pulling string
    const stringPullX = bowX - pull * 10;
    drawArm(g, CX - 4 + lunge * 0.2, torsoTop + 4, stringPullX * 0.8, bowY);

    drawBow(g, bowX, bowY, bowAngle, Math.max(0, pull));

    // Arrow flight line on release
    if (frame === 6) {
        g.moveTo(bowX + 5, bowY)
            .lineTo(bowX + 30, bowY)
            .stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
    }
}

function generateCastFrames(g: Graphics, frame: number): void {
    // Simple "preparing" or "focusing" pose
    const t = sin01(frame, 6);
    const lift = t * 4;

    const torsoTop = GY - 20 - lift * 0.5;
    const hoodieTop = torsoTop - 10;

    drawShadow(g, CX, GY);
    drawQuiver(g, CX, torsoTop + 4);
    drawBoots(g, CX, GY, -1, 1);
    drawLegs(g, CX, GY - 10, 8, -1, 1);
    drawTorso(g, CX, torsoTop, 11);
    drawHood(g, CX, hoodieTop);

    // Bow held high
    drawArm(g, CX + 4, torsoTop + 2, CX + 8, torsoTop - 10);
    drawBow(g, CX + 8, torsoTop - 12, Math.PI / 4, 0);

    // Magical sparkle
    if (frame % 2 === 0) {
        g.circle(CX + 12, torsoTop - 18, 2).fill({ color: 0xffff44, alpha: 0.7 });
    }
}

function generateDieFrames(g: Graphics, frame: number): void {
    const t = frame / 7;
    const fallX = t * 6;
    const dropY = t * t * 12;

    const torsoTop = GY - 20 + dropY;
    const hoodieTop = torsoTop - 10;

    drawShadow(g, CX + fallX * 0.5, GY, 12 + t * 8);
    drawBoots(g, CX + fallX * 0.3, GY, t * 4, -t * 2, t * 3);

    if (t < 0.7) {
        drawLegs(g, CX + fallX * 0.3, GY - 10 + dropY * 0.5, 8 - t * 4, t * 4, -t * 2);
        drawTorso(g, CX + fallX * 0.5, torsoTop, 11 * (1 - t * 0.4), t * 1.2);
        drawHood(g, CX + fallX * 0.6, hoodieTop + dropY * 0.5, t * 1.5);
    }

    // Bow falling away
    const bowDropX = CX + 14 + t * 12;
    const bowDropY = GY - 5 + t * 2;
    if (t < 0.9) {
        drawBow(g, bowDropX, bowDropY, 0.5 + t * 4, 0);
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
    [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
    [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
    [UnitState.ATTACK]: { gen: generateAttackFrames, count: 8 },
    [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
    [UnitState.DIE]: { gen: generateDieFrames, count: 8 },
};

export function generateArcherFrames(
    renderer: Renderer,
): Map<UnitState, Texture[]> {
    const result = new Map<UnitState, Texture[]>();

    for (const state of Object.values(UnitState)) {
        const { gen, count } = STATE_GENERATORS[state];
        const textures: Texture[] = [];

        for (let i = 0; i < count; i++) {
            const g = new Graphics();
            gen(g, i);

            const rt = RenderTexture.create({ width: F, height: F });
            renderer.render({ container: g, target: rt });
            textures.push(rt);

            g.destroy();
        }

        result.set(state, textures);
    }

    return result;
}
