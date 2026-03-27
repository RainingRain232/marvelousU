// ────────────────────────────────────────────────────────────────────────────
// Diablo — Minimap rendering (extracted from DiabloGame)
// ────────────────────────────────────────────────────────────────────────────

import type { DiabloState } from "./DiabloTypes";
import { DiabloMapId, VendorType, EnemyState } from "./DiabloTypes";
import { MAP_CONFIGS } from "./DiabloConfig";
import { RARITY_CSS, RARITY_ORDER, EXCALIBUR_QUEST_INFO } from "./DiabloConstants";

// ────────────────────────────────────────────────────────────────────────────
// Public interface
// ────────────────────────────────────────────────────────────────────────────

export interface MinimapContext {
  state: DiabloState;
  portalActive: boolean;
  portalX: number;
  portalZ: number;
  firstPerson: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Fog-of-war helper
// ────────────────────────────────────────────────────────────────────────────

export function isExplored(state: DiabloState, wx: number, wz: number): boolean {
  const mapCfg = MAP_CONFIGS[state.currentMap];
  const halfW = mapCfg.width / 2;
  const halfD = mapCfg.depth / 2;
  const gx = Math.floor(wx + halfW);
  const gz = Math.floor(wz + halfD);
  const grid = state.exploredGrid;
  if (gx < 0 || gx >= mapCfg.width || gz < 0 || gz >= mapCfg.depth) return false;
  return grid[gx] ? grid[gx][gz] : false;
}

// ────────────────────────────────────────────────────────────────────────────
// Main minimap draw routine
// ────────────────────────────────────────────────────────────────────────────

export function drawMinimapContent(
  ctx: CanvasRenderingContext2D,
  mctx: MinimapContext,
  W: number,
  H: number,
): void {
  const { state, portalActive, portalX, portalZ, firstPerson } = mctx;
  const p = state.player;
  const mapId = state.currentMap;
  const mapCfg = MAP_CONFIGS[mapId];
  const mapW = mapCfg.width;
  const mapD = mapCfg.depth;

  ctx.clearRect(0, 0, W, H);

  const bgColors: Record<string, string> = {
    [DiabloMapId.FOREST]: "rgba(10,30,10,0.85)",
    [DiabloMapId.ELVEN_VILLAGE]: "rgba(10,25,30,0.85)",
    [DiabloMapId.NECROPOLIS_DUNGEON]: "rgba(20,10,30,0.85)",
    [DiabloMapId.CAMELOT]: "rgba(30,22,12,0.85)",
  };
  ctx.fillStyle = bgColors[mapId] || "rgba(15,15,15,0.85)";
  ctx.fillRect(0, 0, W, H);

  const scale = Math.min(W / mapW, H / mapD) * 0.85;
  const cx = W / 2;
  const cy = H / 2;

  const toMx = (wx: number) => cx + wx * scale;
  const toMy = (wz: number) => cy + wz * scale;

  const halfW = mapW / 2;
  const halfD = mapD / 2;

  // Grid overlay
  ctx.strokeStyle = "rgba(90,74,42,0.15)";
  ctx.lineWidth = 0.5;
  const gridStep = 20;
  for (let gx = -halfW; gx <= halfW; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(toMx(gx), toMy(-halfD));
    ctx.lineTo(toMx(gx), toMy(halfD));
    ctx.stroke();
  }
  for (let gz = -halfD; gz <= halfD; gz += gridStep) {
    ctx.beginPath();
    ctx.moveTo(toMx(-halfW), toMy(gz));
    ctx.lineTo(toMx(halfW), toMy(gz));
    ctx.stroke();
  }

  // Map border
  ctx.strokeStyle = "rgba(200,168,78,0.6)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(toMx(-halfW), toMy(-halfD), mapW * scale, mapD * scale);

  // Fog of war overlay for combat maps
  const useFogOfWar = mapId !== DiabloMapId.CAMELOT && state.exploredGrid.length > 0;

  if (mapId === DiabloMapId.CAMELOT) {
    // Walls
    ctx.strokeStyle = "rgba(80,80,80,0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(toMx(-halfW + 1), toMy(-halfD + 1), (mapW - 2) * scale, (mapD - 2) * scale);

    // Roads
    ctx.strokeStyle = "rgba(100,70,40,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(toMx(-halfW), toMy(0));
    ctx.lineTo(toMx(halfW), toMy(0));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toMx(0), toMy(-halfD));
    ctx.lineTo(toMx(0), toMy(halfD));
    ctx.stroke();

    // Castle
    ctx.fillStyle = "rgba(70,65,55,0.5)";
    ctx.fillRect(toMx(-10), toMy(-halfD + 2), 20 * scale, 8 * scale);

    // Buildings
    ctx.strokeStyle = "rgba(90,85,75,0.5)";
    ctx.lineWidth = 1;
    const bldgs = [
      { x: -20, z: -15, w: 8, h: 6 },
      { x: 12, z: -15, w: 8, h: 6 },
      { x: -20, z: 8, w: 8, h: 6 },
      { x: 12, z: 8, w: 8, h: 6 },
      { x: -5, z: -22, w: 10, h: 5 },
    ];
    for (const b of bldgs) {
      ctx.strokeRect(toMx(b.x), toMy(b.z), b.w * scale, b.h * scale);
    }

    // Vendors as blue dots
    const vendorColors: Record<string, string> = {
      [VendorType.BLACKSMITH]: "#4488ff",
      [VendorType.ARCANIST]: "#4488ff",
      [VendorType.ALCHEMIST]: "#4488ff",
      [VendorType.JEWELER]: "#4488ff",
      [VendorType.GENERAL_MERCHANT]: "#4488ff",
    };
    ctx.font = `${Math.max(7, W / 25)}px sans-serif`;
    for (const v of state.vendors) {
      const mx = toMx(v.x);
      const my = toMy(v.z);
      ctx.fillStyle = vendorColors[v.type] || "#4488ff";
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(200,190,170,0.8)";
      ctx.fillText(v.name.split(" ")[0], mx + 5, my + 3);
    }
    // Town portal in Camelot
    if (portalActive) {
      const px = toMx(portalX);
      const py = toMy(portalZ);
      const t = Date.now() / 600;
      const pulse = 3 + Math.sin(t) * 1.5;
      ctx.fillStyle = `rgba(100,130,255,${0.3 + Math.sin(t) * 0.15})`;
      ctx.beginPath();
      ctx.arc(px, py, pulse + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#88bbff";
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(130,180,255,0.8)";
      ctx.font = `${Math.max(7, W / 28)}px sans-serif`;
      ctx.fillText("\uD83C\uDF00", px - 5, py - 6);
    }
  } else {
    // Enemies
    for (const enemy of state.enemies) {
      if (enemy.state === EnemyState.DEAD) continue;
      if (enemy.type && (enemy.type as string).startsWith("NIGHT_")) continue;
      if (useFogOfWar && !isExplored(state, enemy.x, enemy.z)) continue;
      const mx = toMx(enemy.x);
      const my = toMy(enemy.z);
      ctx.fillStyle = "#ff3333";
      const r = enemy.isBoss ? 4 : 2;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Loot (colored by rarity)
    for (const loot of state.loot) {
      if (useFogOfWar && !isExplored(state, loot.x, loot.z)) continue;
      ctx.fillStyle = RARITY_CSS[loot.item.rarity] || "#ffff00";
      // Pulse effect for rare+ loot
      const rarityIdx = RARITY_ORDER.indexOf(loot.item.rarity);
      let lootRadius = 1.5;
      if (rarityIdx >= 2) { // RARE+
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.5;
        lootRadius = 2.0 + pulse;
      }
      ctx.beginPath();
      ctx.arc(toMx(loot.x), toMy(loot.z), lootRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Treasure chests as yellow dots
    for (const chest of state.treasureChests) {
      if (chest.opened) continue;
      if (useFogOfWar && !isExplored(state, chest.x, chest.z)) continue;
      ctx.fillStyle = "#ffdd00";
      ctx.beginPath();
      ctx.arc(toMx(chest.x), toMy(chest.z), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Town portal marker
    if (portalActive) {
      const px = toMx(portalX);
      const py = toMy(portalZ);
      const t = Date.now() / 600;
      const pulse = 3 + Math.sin(t) * 1.5;
      ctx.fillStyle = `rgba(100,130,255,${0.3 + Math.sin(t) * 0.15})`;
      ctx.beginPath();
      ctx.arc(px, py, pulse + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#88bbff";
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(130,180,255,0.8)";
      ctx.font = `${Math.max(7, W / 28)}px sans-serif`;
      ctx.fillText("\uD83C\uDF00", px - 5, py - 6);
    }

    // Fog of war darkening
    if (useFogOfWar) {
      const fogStepPx = Math.max(2, Math.floor(scale));
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      for (let wx = -halfW; wx < halfW; wx += fogStepPx / scale) {
        for (let wz = -halfD; wz < halfD; wz += fogStepPx / scale) {
          if (!isExplored(state, wx, wz)) {
            ctx.fillRect(toMx(wx), toMy(wz), fogStepPx, fogStepPx);
          }
        }
      }
    }

    // Landmarks as grey shapes
    ctx.fillStyle = "rgba(120,110,100,0.3)";
    ctx.fillRect(toMx(-5), toMy(-5), 10 * scale, 10 * scale);

    // Quest markers on minimap
    // Bounty targets
    if (state.activeBounties) {
      for (const bounty of state.activeBounties) {
        if (bounty.isComplete || bounty.mapId !== state.currentMap) continue;
        const bountyEnemy = state.enemies.find(e => e.id === `bounty-enemy-${bounty.id}`);
        if (bountyEnemy) {
          const bx = toMx(bountyEnemy.x);
          const bz = toMy(bountyEnemy.z);
          // Draw skull icon
          ctx.fillStyle = '#ff4444';
          ctx.font = '10px serif';
          ctx.fillText('\u{1F480}', bx - 5, bz + 4);
        }
      }
    }

    // Excalibur fragment marker removed — it always drew at map center
    // which overlapped with the portal and didn't indicate the actual boss location.
  }

  // Player as green arrow/triangle
  const pmx = toMx(p.x);
  const pmy = toMy(p.z);
  ctx.save();
  ctx.translate(pmx, pmy);
  ctx.rotate(firstPerson ? -p.angle : -p.angle + Math.PI);
  ctx.fillStyle = "#44ff44";
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-3.5, 4);
  ctx.lineTo(3.5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Map name removed from minimap canvas — shown only below the minimap
}
