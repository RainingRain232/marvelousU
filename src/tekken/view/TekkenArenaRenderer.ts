import * as THREE from "three";
import type { TekkenSceneManager } from "./TekkenSceneManager";
import { TB } from "../config/TekkenBalanceConfig";
import type { StageHazard } from "../state/TekkenState";

interface SpectatorAnim {
  mesh: THREE.Mesh;
  baseY: number;
  animTimer: number;
  animType: "idle" | "cheer" | "gasp";
}

interface HazardVisual {
  id: string;
  group: THREE.Group;
  type: "fire_brazier" | "acid_patch" | "breakable_pillar";
  animMeshes: THREE.Mesh[];
}

export class TekkenArenaRenderer {
  private _scene: TekkenSceneManager;
  private _floorGroup: THREE.Group;
  private _wallBarriers: THREE.Mesh[] = [];
  private _cageBars: THREE.Mesh[][] = []; // bars per side for glow effect
  private _spectatorGroup: THREE.Group;
  private _props: THREE.Group;
  private _spectatorAnims: SpectatorAnim[] = [];
  private _hazardVisuals: HazardVisual[] = [];

  constructor(sceneManager: TekkenSceneManager) {
    this._scene = sceneManager;
    this._floorGroup = new THREE.Group();
    this._spectatorGroup = new THREE.Group();
    this._props = new THREE.Group();
  }

  build(arenaId: string = "castle_courtyard"): void {
    switch (arenaId) {
      case "underground_pit":
        this._buildUndergroundPit();
        break;
      case "throne_room":
        this._buildThroneRoom();
        break;
      case "volcanic_forge":
        this._buildVolcanicForge();
        break;
      case "forest_clearing":
        this._buildForestClearing();
        break;
      case "frozen_lake":
        this._buildFrozenLake();
        break;
      case "ancient_dojo":
        this._buildAncientDojo();
        break;
      case "ruined_cathedral":
        this._buildRuinedCathedral();
        break;
      case "desert_marketplace":
        this._buildDesertMarketplace();
        break;
      case "harbor_docks":
        this._buildHarborDocks();
        break;
      case "dark_dungeon":
        this._buildDarkDungeon();
        break;
      case "mountain_peak":
        this._buildMountainPeak();
        break;
      case "haunted_graveyard":
        this._buildHauntedGraveyard();
        break;
      default:
        this._buildCastleCourtyard();
        break;
    }

    this._scene.scene.add(this._floorGroup);
    this._scene.scene.add(this._spectatorGroup);
    this._scene.scene.add(this._props);
  }

  /* ================================================================== */
  /*  SPECTATOR ANIMATION SYSTEM                                         */
  /* ================================================================== */

  /** Register a spectator body mesh for animation */
  private _registerSpectator(mesh: THREE.Mesh): void {
    this._spectatorAnims.push({
      mesh,
      baseY: mesh.position.y,
      animTimer: 0,
      animType: "idle",
    });
  }

  /** Called when a hit lands to trigger crowd reaction */
  triggerSpectatorReaction(intensity: "light" | "heavy" | "ko"): void {
    for (const spec of this._spectatorAnims) {
      spec.animTimer = intensity === "ko" ? 60 : intensity === "heavy" ? 30 : 15;
      spec.animType = intensity === "ko" ? "cheer" : Math.random() > 0.5 ? "cheer" : "gasp";
    }
  }

  /** Called each frame to update spectator animations */
  updateSpectators(): void {
    for (const spec of this._spectatorAnims) {
      if (spec.animTimer > 0) {
        spec.animTimer--;
        const t = spec.animTimer / 30;
        if (spec.animType === "cheer") {
          // Bob up and down excitedly
          spec.mesh.position.y = spec.baseY + Math.sin(spec.animTimer * 0.5) * 0.05 * t;
          // Arms up (scale Y slightly to simulate raising)
          spec.mesh.scale.y = 1.0 + Math.sin(spec.animTimer * 0.3) * 0.1 * t;
        } else {
          // Gasp/lean back
          spec.mesh.rotation.x = Math.sin(spec.animTimer * 0.2) * 0.1 * t;
        }
      } else {
        // Subtle idle sway
        spec.mesh.position.y = spec.baseY + Math.sin(Date.now() * 0.001 + spec.baseY * 10) * 0.01;
        spec.mesh.scale.y = 1.0;
        spec.mesh.rotation.x = 0;
      }
    }
  }

  /* ================================================================== */
  /*  SHARED HELPERS                                                      */
  /* ================================================================== */

  /** Shared color palettes for spectators */
  private static readonly BODY_COLORS = [
    0x886655, 0x775544, 0x665533, 0x887766,
    0x6b4f3a, 0x7a6050, 0x604838, 0x8a7060,
    0x554a3e, 0x756050,
  ];
  private static readonly HEAD_COLORS = [
    0xd4a574, 0xc49464, 0xb48454, 0xe0b888,
    0xa07050, 0xc8a070, 0xd0a878,
  ];

  /** Add a single spectator figure and register for animation */
  private _addSpectatorFigure(
    sx: number, sy: number, sz: number,
    bodyColors: number[] = TekkenArenaRenderer.BODY_COLORS,
    headColors: number[] = TekkenArenaRenderer.HEAD_COLORS,
  ): void {
    const heightVar = 0.9 + Math.random() * 0.3;
    const bodyH = 0.4 * heightVar;
    const bodyW = 0.11 + Math.random() * 0.04;

    const bodyColor = bodyColors[Math.floor(Math.random() * bodyColors.length)];
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyW - 0.02, bodyW, bodyH, 12),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 }),
    );
    body.position.set(sx, sy + bodyH / 2, sz);
    this._spectatorGroup.add(body);
    this._registerSpectator(body);

    // Shoulders
    if (Math.random() > 0.3) {
      const shoulders = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW * 2.5, 0.06, 0.08),
        new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 }),
      );
      shoulders.position.set(sx, sy + bodyH - 0.02, sz);
      this._spectatorGroup.add(shoulders);
    }

    // Head
    const headColor = headColors[Math.floor(Math.random() * headColors.length)];
    const headRadius = 0.07 + Math.random() * 0.02;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius, 12, 10),
      new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.7 }),
    );
    head.position.set(sx, sy + bodyH + 0.08, sz);
    this._spectatorGroup.add(head);

    // Hat on some spectators
    if (Math.random() < 0.3) {
      const hatColors = [0x443322, 0x332211, 0x554433, 0x665544, 0x222222];
      const hatColor = hatColors[Math.floor(Math.random() * hatColors.length)];
      const hat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 0.06 + Math.random() * 0.06, 6),
        new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.8 }),
      );
      hat.position.set(sx, sy + bodyH + 0.08 + headRadius + 0.02, sz);
      this._spectatorGroup.add(hat);
      // Hat brim
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.01, 8),
        new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.8 }),
      );
      brim.position.set(sx, sy + bodyH + 0.08 + headRadius, sz);
      this._spectatorGroup.add(brim);
    }

    // Some spectators hold small banners/flags
    if (Math.random() < 0.15) {
      const flagColors = [0xaa2222, 0x2244aa, 0x228844, 0xaa8822, 0x662288];
      const flagColor = flagColors[Math.floor(Math.random() * flagColors.length)];
      const flagPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.4, 10),
        new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.7 }),
      );
      flagPole.position.set(sx + 0.1, sy + bodyH + 0.2, sz);
      this._spectatorGroup.add(flagPole);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.08),
        new THREE.MeshStandardMaterial({ color: flagColor, side: THREE.DoubleSide, roughness: 0.7 }),
      );
      flag.position.set(sx + 0.1 + 0.06, sy + bodyH + 0.35, sz);
      this._spectatorGroup.add(flag);
    }
  }

  /** Add a fire pit at position (ground level brazier) */
  private _addFirePit(x: number, y: number, z: number): void {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 });

    // Stone/iron basin
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.2, 0.3, 10),
      ironMat,
    );
    basin.position.set(x, y + 0.15, z);
    this._props.add(basin);

    // Inner dark
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.15, 0.1, 10),
      new THREE.MeshBasicMaterial({ color: 0x1a0a00 }),
    );
    inner.position.set(x, y + 0.3, z);
    this._props.add(inner);

    // Flame layers
    const flameColors = [
      { color: 0xff4400, emissive: 0xff3300, intensity: 3.0 },
      { color: 0xff6600, emissive: 0xff4400, intensity: 2.5 },
      { color: 0xff8800, emissive: 0xff6600, intensity: 2.0 },
      { color: 0xffaa22, emissive: 0xff8800, intensity: 1.5 },
    ];
    for (let f = 0; f < flameColors.length; f++) {
      const fc = flameColors[f];
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 - f * 0.02, 12, 8),
        new THREE.MeshStandardMaterial({
          color: fc.color,
          emissive: fc.emissive,
          emissiveIntensity: fc.intensity,
          transparent: true,
          opacity: 0.85 - f * 0.12,
        }),
      );
      flame.position.set(
        x + (Math.random() - 0.5) * 0.04,
        y + 0.35 + f * 0.06,
        z + (Math.random() - 0.5) * 0.04,
      );
      this._props.add(flame);
    }

    this._scene.addTorchLight(x, y + 0.5, z);
  }

  /** Add a wall torch at position */
  private _addWallTorch(tx: number, ty: number, tz: number): void {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 });
    const torchWoodMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });

    const armDir = tx > 0 ? -1 : tx < 0 ? 1 : 0;

    // L-shaped iron bracket
    const hArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.04, 0.04),
      ironMat,
    );
    hArm.position.set(tx + armDir * 0.15, ty - 0.1, tz);
    this._props.add(hArm);

    const vArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.3, 0.04),
      ironMat,
    );
    vArm.position.set(tx + armDir * 0.32, ty - 0.25, tz);
    this._props.add(vArm);

    // Torch cup
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.04, 0.1, 12),
      ironMat,
    );
    cup.position.set(tx, ty - 0.05, tz);
    this._props.add(cup);

    // Torch handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.35, 12),
      torchWoodMat,
    );
    handle.position.set(tx, ty - 0.25, tz);
    this._props.add(handle);

    // Layered flame
    const flameColors = [
      { color: 0xff6600, emissive: 0xff4400, intensity: 2.5 },
      { color: 0xff8800, emissive: 0xff6600, intensity: 2.0 },
      { color: 0xffaa22, emissive: 0xff8800, intensity: 1.8 },
      { color: 0xffcc44, emissive: 0xffaa00, intensity: 1.5 },
    ];

    for (let f = 0; f < flameColors.length; f++) {
      const fc = flameColors[f];
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 - f * 0.012, 12, 8),
        new THREE.MeshStandardMaterial({
          color: fc.color,
          emissive: fc.emissive,
          emissiveIntensity: fc.intensity,
          transparent: true,
          opacity: 0.85 - f * 0.12,
        }),
      );
      flame.position.set(
        tx + (Math.random() - 0.5) * 0.02,
        ty + 0.04 + f * 0.035,
        tz + (Math.random() - 0.5) * 0.02,
      );
      this._props.add(flame);
    }

    this._scene.addTorchLight(tx, ty, tz);
  }

  /** Build invisible wall barriers for glow effect (shared by all arenas) */
  private _buildWallBarriers(): void {
    for (const side of [-1, 1]) {
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0,
        emissive: 0xff4400,
        emissiveIntensity: 0,
        side: THREE.DoubleSide,
      });
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(0.05, 3),
        wallMat,
      );
      wall.position.set(side * TB.STAGE_HALF_WIDTH, 1.5, 0);
      wall.rotation.y = Math.PI / 2;
      this._wallBarriers.push(wall);
      this._scene.scene.add(wall);
    }
  }

  /* ================================================================== */
  /*  CASTLE COURTYARD (original arena)                                   */
  /* ================================================================== */

  private _buildCastleCourtyard(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x0a0a14, 0.04);
    this._scene.scene.background = new THREE.Color(0x0a0a14);

    this._buildCourtyardFloor();
    this._buildCourtyardWalls();
    this._buildCourtyardSpectators();
    this._buildCourtyardTorches();
    this._buildCourtyardChandelier();
    this._buildCourtyardSkyEnvironment();
    this._buildCourtyardGroundDetails();
    this._buildCourtyardDecorativeProps();
    this._buildDustMotes();
  }

  private _buildCourtyardFloor(): void {
    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // --- High-res procedural stone texture (4096x4096) ---
    const canvas = document.createElement("canvas");
    canvas.width = 4096;
    canvas.height = 4096;
    const ctx = canvas.getContext("2d")!;
    const S = 4096;

    // Base fill
    ctx.fillStyle = "#3a3530";
    ctx.fillRect(0, 0, S, S);

    const tileSize = 64;
    const tilesPerRow = S / tileSize;

    // Warm palette for variation
    const tileColors = [
      [58, 50, 42],
      [52, 48, 44],
      [48, 42, 38],
      [55, 52, 48],
      [50, 45, 36],
      [44, 40, 38],
    ];

    for (let row = 0; row < tilesPerRow; row++) {
      for (let col = 0; col < tilesPerRow; col++) {
        const offset = row % 2 === 0 ? 0 : tileSize / 2;
        const x = col * tileSize + offset;
        const y = row * tileSize;

        const base = tileColors[Math.floor(Math.random() * tileColors.length)];
        const vary = () => Math.floor(Math.random() * 18 - 9);
        const r = Math.max(0, Math.min(255, base[0] + vary()));
        const g = Math.max(0, Math.min(255, base[1] + vary()));
        const b = Math.max(0, Math.min(255, base[2] + vary()));

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, tileSize - 2, tileSize - 2);

        // Stone grain speckles
        for (let i = 0; i < 50; i++) {
          const gx = x + Math.random() * (tileSize - 4);
          const gy = y + Math.random() * (tileSize - 4);
          const gb = r + Math.floor(Math.random() * 20 - 10);
          ctx.fillStyle = `rgba(${gb},${gb - 3},${gb - 6},0.5)`;
          ctx.fillRect(gx, gy, 1 + Math.random() * 4, 1 + Math.random() * 2);
        }

        // Cracks and weathering (enhanced density)
        if (Math.random() < 0.55) {
          ctx.strokeStyle = `rgba(20,15,10,${0.3 + Math.random() * 0.4})`;
          ctx.lineWidth = 0.8 + Math.random() * 1.0;
          ctx.beginPath();
          const crX = x + 8 + Math.random() * (tileSize - 16);
          const crY = y + 8 + Math.random() * (tileSize - 16);
          ctx.moveTo(crX, crY);
          const segments = 3 + Math.floor(Math.random() * 6);
          for (let s = 0; s < segments; s++) {
            ctx.lineTo(
              crX + (Math.random() - 0.5) * 40,
              crY + (Math.random() - 0.5) * 40,
            );
          }
          ctx.stroke();

          // Secondary branching cracks
          if (Math.random() < 0.4) {
            ctx.strokeStyle = `rgba(18,12,8,${0.2 + Math.random() * 0.3})`;
            ctx.lineWidth = 0.5 + Math.random() * 0.6;
            ctx.beginPath();
            ctx.moveTo(crX, crY);
            const branchSegs = 2 + Math.floor(Math.random() * 3);
            for (let bs = 0; bs < branchSegs; bs++) {
              ctx.lineTo(
                crX + (Math.random() - 0.5) * 25,
                crY + (Math.random() - 0.5) * 25,
              );
            }
            ctx.stroke();
          }
        }

        // Subtle scuff marks
        if (Math.random() < 0.15) {
          ctx.fillStyle = `rgba(25,20,15,0.25)`;
          ctx.beginPath();
          ctx.ellipse(
            x + tileSize / 2 + Math.random() * 10,
            y + tileSize / 2 + Math.random() * 10,
            3 + Math.random() * 8,
            1 + Math.random() * 3,
            Math.random() * Math.PI,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }

    // Grout lines
    ctx.strokeStyle = "#1a1510";
    ctx.lineWidth = 2;
    for (let y = 0; y <= S; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }
    for (let col = 0; col <= tilesPerRow; col++) {
      for (let row = 0; row < tilesPerRow; row++) {
        const offset = row % 2 === 0 ? 0 : tileSize / 2;
        ctx.beginPath();
        ctx.moveTo(col * tileSize + offset, row * tileSize);
        ctx.lineTo(col * tileSize + offset, (row + 1) * tileSize);
        ctx.stroke();
      }
    }

    // --- Ornate center fighting ring ---
    const cx = S / 2;
    const cy = S / 2;

    ctx.strokeStyle = "#b89a4a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 220, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#9a7e3c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 210, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#c4a855";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 195, 0, Math.PI * 2);
    ctx.stroke();

    // Ornate tick marks
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const inner = 212;
      const outer = 225;
      ctx.strokeStyle = "#b89a4a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }

    // Inner cross design
    ctx.strokeStyle = "#a08840";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 180);
    ctx.lineTo(cx, cy + 180);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 180, cy);
    ctx.lineTo(cx + 180, cy);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#8a7838";
    ctx.beginPath();
    ctx.moveTo(cx - 130, cy - 130);
    ctx.lineTo(cx + 130, cy + 130);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 130, cy - 130);
    ctx.lineTo(cx - 130, cy + 130);
    ctx.stroke();

    // Small center circle
    ctx.strokeStyle = "#c4a855";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(184,154,74,0.15)";
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();

    // --- Mosaic / inlay pattern (alternating dark/light stone wedges) ---
    const mosaicOuterR = 160;
    const mosaicInnerR = 80;
    const wedgeCount = 24;
    for (let w = 0; w < wedgeCount; w++) {
      const startAngle = (w / wedgeCount) * Math.PI * 2;
      const endAngle = ((w + 1) / wedgeCount) * Math.PI * 2;
      ctx.fillStyle = w % 2 === 0 ? "rgba(70,60,45,0.6)" : "rgba(100,88,65,0.6)";
      ctx.beginPath();
      ctx.arc(cx, cy, mosaicOuterR, startAngle, endAngle);
      ctx.arc(cx, cy, mosaicInnerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();
    }
    // Gold rings around mosaic
    ctx.strokeStyle = "#b89a4a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, mosaicOuterR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, mosaicInnerR, 0, Math.PI * 2);
    ctx.stroke();

    // --- Blood stain splatters on texture ---
    const bloodPositions = [
      [cx - 300, cy + 200], [cx + 280, cy - 150], [cx + 50, cy + 350],
      [cx - 200, cy - 300], [cx + 400, cy + 100],
    ];
    for (const [bpx, bpy] of bloodPositions) {
      ctx.fillStyle = `rgba(80,10,10,${0.15 + Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(bpx, bpy, 20 + Math.random() * 30, 15 + Math.random() * 20,
        Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      // Splatter droplets
      for (let sd = 0; sd < 8; sd++) {
        ctx.beginPath();
        ctx.arc(
          bpx + (Math.random() - 0.5) * 60,
          bpy + (Math.random() - 0.5) * 60,
          3 + Math.random() * 8, 0, Math.PI * 2,
        );
        ctx.fill();
      }
    }

    // --- Worn / polished areas where fighters stand ---
    const wornPositions = [[cx - 300, cy], [cx + 300, cy]];
    for (const [wpx, wpy] of wornPositions) {
      const wornGrad = ctx.createRadialGradient(wpx, wpy, 0, wpx, wpy, 100);
      wornGrad.addColorStop(0, "rgba(85,78,65,0.35)");
      wornGrad.addColorStop(0.6, "rgba(75,68,58,0.15)");
      wornGrad.addColorStop(1, "rgba(60,54,48,0)");
      ctx.fillStyle = wornGrad;
      ctx.beginPath();
      ctx.arc(wpx, wpy, 100, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Drain grate details on texture corners ---
    const drainCorners = [[100, 100], [S - 100, 100], [100, S - 100], [S - 100, S - 100]];
    for (const [dx, dy] of drainCorners) {
      // Dark circle
      ctx.fillStyle = "rgba(15,12,10,0.7)";
      ctx.beginPath();
      ctx.arc(dx, dy, 40, 0, Math.PI * 2);
      ctx.fill();
      // Cross hatching
      ctx.strokeStyle = "rgba(50,50,50,0.8)";
      ctx.lineWidth = 3;
      for (let ch = -2; ch <= 2; ch++) {
        ctx.beginPath();
        ctx.moveTo(dx - 35, dy + ch * 14);
        ctx.lineTo(dx + 35, dy + ch * 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(dx + ch * 14, dy - 35);
        ctx.lineTo(dx + ch * 14, dy + 35);
        ctx.stroke();
      }
      // Rim
      ctx.strokeStyle = "rgba(60,55,50,0.6)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(dx, dy, 40, 0, Math.PI * 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    const floorMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.1,
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      floorMat,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // --- Metallic edge trim around platform ---
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x8a7a50,
      roughness: 0.3,
      metalness: 0.7,
    });
    const trimH = 0.08;
    const trimD = 0.12;

    const frontTrim = new THREE.Mesh(
      new THREE.BoxGeometry(floorW + 0.2, trimH, trimD),
      trimMat,
    );
    frontTrim.position.set(0, trimH / 2, floorD / 2 + trimD / 2);
    frontTrim.castShadow = true;
    this._floorGroup.add(frontTrim);

    const backTrim = frontTrim.clone();
    backTrim.position.z = -floorD / 2 - trimD / 2;
    this._floorGroup.add(backTrim);

    for (const side of [-1, 1]) {
      const sideTrim = new THREE.Mesh(
        new THREE.BoxGeometry(trimD, trimH, floorD + 0.4),
        trimMat,
      );
      sideTrim.position.set(side * (floorW / 2 + trimD / 2), trimH / 2, 0);
      sideTrim.castShadow = true;
      this._floorGroup.add(sideTrim);
    }

    // Elevated platform edge
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.7, metalness: 0.2 });
    const edgeH = 0.15;

    const frontEdge = new THREE.Mesh(
      new THREE.BoxGeometry(floorW, edgeH, 0.2),
      edgeMat,
    );
    frontEdge.position.set(0, -edgeH / 2, floorD / 2);
    frontEdge.castShadow = true;
    this._floorGroup.add(frontEdge);

    const backEdge = frontEdge.clone();
    backEdge.position.z = -floorD / 2;
    this._floorGroup.add(backEdge);

    for (const side of [-1, 1]) {
      const sideEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, edgeH, floorD),
        edgeMat,
      );
      sideEdge.position.set(side * floorW / 2, -edgeH / 2, 0);
      sideEdge.castShadow = true;
      this._floorGroup.add(sideEdge);
    }

    // Small debris piles near corners
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9, metalness: 0.05 });
    const debrisCorners: [number, number][] = [
      [floorW / 2 - 0.3, floorD / 2 - 0.3],
      [-floorW / 2 + 0.3, floorD / 2 - 0.3],
      [floorW / 2 - 0.3, -floorD / 2 + 0.3],
      [-floorW / 2 + 0.3, -floorD / 2 + 0.3],
    ];
    for (const [dx, dz] of debrisCorners) {
      const pile = new THREE.Group();
      for (let d = 0; d < 3; d++) {
        const sw = 0.04 + Math.random() * 0.08;
        const sh = 0.02 + Math.random() * 0.04;
        const sd = 0.04 + Math.random() * 0.06;
        const chunk = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), debrisMat);
        chunk.position.set(
          (Math.random() - 0.5) * 0.15,
          sh / 2,
          (Math.random() - 0.5) * 0.15,
        );
        chunk.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
        chunk.castShadow = true;
        pile.add(chunk);
      }
      pile.position.set(dx, 0, dz);
      this._floorGroup.add(pile);
    }
  }

  private _buildCourtyardWalls(): void {
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.6, metalness: 0.15 });
    const capitalMat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.5, metalness: 0.2 });
    const barMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0xff4400,
      emissiveIntensity: 0,
    });

    for (const side of [-1, 1]) {
      const xBase = side * (TB.STAGE_HALF_WIDTH + 0.3);
      const sideBars: THREE.Mesh[] = [];

      // Two massive stone pillars per side
      for (const zPos of [floorD / 2 - 0.4, -floorD / 2 + 0.4]) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.3, 4.0, 24),
          pillarMat,
        );
        pillar.position.set(xBase, 2.0, zPos);
        pillar.castShadow = true;
        this._props.add(pillar);

        for (let r = 0; r < 4; r++) {
          const groove = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.02, 12, 32),
            capitalMat,
          );
          groove.position.set(xBase, 0.8 + r * 0.9, zPos);
          groove.rotation.x = Math.PI / 2;
          this._props.add(groove);
        }

        const capital = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.25, 0.3, 24),
          capitalMat,
        );
        capital.position.set(xBase, 4.15, zPos);
        capital.castShadow = true;
        this._props.add(capital);

        // Capital ornamentation - scroll/volute shapes
        for (let v = 0; v < 4; v++) {
          const vAngle = (v / 4) * Math.PI * 2;
          const volute = new THREE.Mesh(
            new THREE.TorusGeometry(0.08, 0.015, 12, 16, Math.PI),
            capitalMat,
          );
          volute.position.set(
            xBase + Math.cos(vAngle) * 0.3,
            4.2,
            zPos + Math.sin(vAngle) * 0.3,
          );
          volute.rotation.y = vAngle;
          volute.rotation.x = Math.PI / 4;
          this._props.add(volute);
        }

        // Pillar base molding - stacked cylinders of decreasing radius
        const baseMoldRadii = [0.38, 0.34, 0.32];
        const baseMoldHeights = [0.08, 0.06, 0.05];
        let baseMoldY = 0.0;
        for (let bm = 0; bm < baseMoldRadii.length; bm++) {
          const mold = new THREE.Mesh(
            new THREE.CylinderGeometry(baseMoldRadii[bm], baseMoldRadii[bm] + 0.02, baseMoldHeights[bm], 24),
            capitalMat,
          );
          mold.position.set(xBase, baseMoldY + baseMoldHeights[bm] / 2, zPos);
          mold.castShadow = true;
          this._props.add(mold);
          baseMoldY += baseMoldHeights[bm];
        }

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.2, 0.65),
          pillarMat,
        );
        base.position.set(xBase, 0.1, zPos);
        base.castShadow = true;
        this._props.add(base);

        // Carved relief bands on pillar
        for (let rb = 0; rb < 5; rb++) {
          const reliefBand = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.04, 0.06),
            capitalMat,
          );
          const rbAngle = (rb / 5) * Math.PI * 2;
          reliefBand.position.set(
            xBase + Math.cos(rbAngle) * 0.26,
            1.8 + rb * 0.5,
            zPos + Math.sin(rbAngle) * 0.26,
          );
          reliefBand.rotation.y = rbAngle;
          this._props.add(reliefBand);
        }

        // Gargoyle/lion head sculpture mounted on pillar (facing outward)
        const gargoyleY = 3.2;
        const gargoyleDir = side;
        // Head (large sphere)
        const lionHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 0.7, metalness: 0.1 }),
        );
        lionHead.position.set(xBase + gargoyleDir * 0.35, gargoyleY, zPos);
        this._props.add(lionHead);
        // Eyes (2 small spheres)
        for (const eyeOff of [-0.04, 0.04]) {
          const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 }),
          );
          eye.position.set(xBase + gargoyleDir * 0.44, gargoyleY + 0.03, zPos + eyeOff);
          this._props.add(eye);
        }
        // Snout
        const snout = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 0.7, metalness: 0.1 }),
        );
        snout.position.set(xBase + gargoyleDir * 0.46, gargoyleY - 0.03, zPos);
        this._props.add(snout);

        // Torch sconce backplate
        const backplate = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.25, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 }),
        );
        backplate.position.set(xBase + gargoyleDir * 0.26, 2.5, zPos);
        this._props.add(backplate);
      }

      // Iron cage bars
      const zStart = -floorD / 2 + 0.4;
      const zEnd = floorD / 2 - 0.4;
      const barSpacing = 0.35;
      const barCount = Math.floor((zEnd - zStart) / barSpacing);

      const rustMat = new THREE.MeshStandardMaterial({
        color: 0x5a3520, roughness: 0.8, metalness: 0.3,
      });
      const spikeMat = new THREE.MeshStandardMaterial({
        color: 0x555555, roughness: 0.3, metalness: 0.8,
      });

      for (let i = 1; i < barCount; i++) {
        const bz = zStart + i * barSpacing;
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 3.8, 12),
          barMat.clone(),
        );
        bar.position.set(xBase, 1.9, bz);
        bar.castShadow = true;
        this._props.add(bar);
        sideBars.push(bar);

        // Spike top on each bar
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.025, 0.1, 12),
          spikeMat,
        );
        spike.position.set(xBase, 3.85, bz);
        this._props.add(spike);

        // Rust/weathering on some bars
        if (Math.random() < 0.4) {
          const rustHeight = 0.3 + Math.random() * 0.5;
          const rustY = 0.5 + Math.random() * 2.5;
          const rustSleeve = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, rustHeight, 12),
            rustMat,
          );
          rustSleeve.position.set(xBase, rustY, bz);
          this._props.add(rustSleeve);
        }

        // Decorative iron scrollwork between pairs of bars
        if (i > 1 && i % 2 === 0) {
          const scrollZ = bz - barSpacing / 2;
          const scroll = new THREE.Mesh(
            new THREE.TorusGeometry(0.06, 0.008, 12, 8, Math.PI),
            barMat.clone(),
          );
          scroll.position.set(xBase, 1.2, scrollZ);
          scroll.rotation.y = Math.PI / 2;
          this._props.add(scroll);

          const scroll2 = new THREE.Mesh(
            new THREE.TorusGeometry(0.06, 0.008, 12, 8, Math.PI),
            barMat.clone(),
          );
          scroll2.position.set(xBase, 2.6, scrollZ);
          scroll2.rotation.y = Math.PI / 2;
          scroll2.rotation.z = Math.PI;
          this._props.add(scroll2);
        }
      }

      // Base plate under cage bars
      const basePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, zEnd - zStart),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 }),
      );
      basePlate.position.set(xBase, 0.02, 0);
      this._props.add(basePlate);

      for (const barY of [3.8, 2.0, 0.3]) {
        const crossBar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, zEnd - zStart, 8),
          barMat.clone(),
        );
        crossBar.position.set(xBase, barY, 0);
        crossBar.rotation.x = Math.PI / 2;
        this._props.add(crossBar);
        sideBars.push(crossBar);
      }

      this._cageBars.push(sideBars);
    }

    this._buildWallBarriers();
  }

  private _buildCourtyardSpectators(): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4025, roughness: 0.85, metalness: 0.05 });
    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9, metalness: 0.05 });

    // Wooden bleacher / grandstand structure
    for (let row = 0; row < 5; row++) {
      const z = -3.2 - row * 1.1;
      const y = row * 0.55;
      const rowWidth = TB.STAGE_HALF_WIDTH * 2 + 2.5 + row * 1.8;

      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(rowWidth, 0.1, 0.5),
        woodMat,
      );
      bench.position.set(0, y + 0.05, z);
      bench.receiveShadow = true;
      this._spectatorGroup.add(bench);

      const legSpacing = 1.8;
      const legCount = Math.floor(rowWidth / legSpacing) + 1;
      for (let l = 0; l < legCount; l++) {
        const lx = -rowWidth / 2 + l * legSpacing;
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, y + 0.1, 0.08),
          woodDarkMat,
        );
        leg.position.set(lx, (y + 0.1) / 2, z);
        this._spectatorGroup.add(leg);
      }

      const backRest = new THREE.Mesh(
        new THREE.BoxGeometry(rowWidth, 0.4, 0.06),
        woodDarkMat,
      );
      backRest.position.set(0, y + 0.3, z - 0.25);
      this._spectatorGroup.add(backRest);

      // Spectators (50% more density via tighter spacing)
      const spacing = 0.37;
      const count = Math.floor(rowWidth / spacing);
      for (let i = 0; i < count; i++) {
        const sx = -rowWidth / 2 + spacing * 0.5 + i * spacing + (Math.random() - 0.5) * 0.12;
        this._addSpectatorFigure(sx, y + 0.1, z);
      }
    }

    // Wooden fence between spectator area and arena
    const fenceZ = -2.6;
    const fenceWidth = TB.STAGE_HALF_WIDTH * 2 + 3;
    const fencePostSpacing = 1.2;
    const fencePostCount = Math.floor(fenceWidth / fencePostSpacing) + 1;
    for (let fp = 0; fp < fencePostCount; fp++) {
      const fpx = -fenceWidth / 2 + fp * fencePostSpacing;
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.8, 0.06),
        woodDarkMat,
      );
      post.position.set(fpx, 0.4, fenceZ);
      this._spectatorGroup.add(post);
    }
    // Horizontal rails
    for (const railY of [0.25, 0.6]) {
      const rail2 = new THREE.Mesh(
        new THREE.BoxGeometry(fenceWidth, 0.04, 0.04),
        woodMat,
      );
      rail2.position.set(0, railY, fenceZ);
      this._spectatorGroup.add(rail2);
    }

    // Food/drink stalls behind spectators
    const stallMat = new THREE.MeshStandardMaterial({ color: 0x5a4025, roughness: 0.85 });
    const awningColors = [0x882222, 0x886622, 0x224488];
    for (let st = 0; st < 3; st++) {
      const stallX = -3.5 + st * 3.5;
      const stallZ = -8.0;
      const stallY = 2.5;

      // Stall body (box)
      const stallBody = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.0, 0.6),
        stallMat,
      );
      stallBody.position.set(stallX, stallY + 0.5, stallZ);
      this._spectatorGroup.add(stallBody);

      // Counter top
      const counter = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.05, 0.8),
        woodMat,
      );
      counter.position.set(stallX, stallY + 1.02, stallZ);
      this._spectatorGroup.add(counter);

      // Awning
      const awning = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.8),
        new THREE.MeshStandardMaterial({
          color: awningColors[st], side: THREE.DoubleSide, roughness: 0.7,
        }),
      );
      awning.position.set(stallX, stallY + 1.5, stallZ + 0.3);
      awning.rotation.x = -0.3;
      this._spectatorGroup.add(awning);

      // Stall posts
      for (const sp of [-0.55, 0.55]) {
        const stallPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 1.8, 10),
          woodDarkMat,
        );
        stallPost.position.set(stallX + sp, stallY + 0.9, stallZ + 0.35);
        this._spectatorGroup.add(stallPost);
      }
    }

    // Torches/lanterns in spectator area
    const specTorchPositions: [number, number, number][] = [
      [-3.5, 1.8, -4.0], [0, 1.8, -4.0], [3.5, 1.8, -4.0],
      [-5, 2.2, -5.5], [5, 2.2, -5.5],
    ];
    for (const [ltx, lty, ltz] of specTorchPositions) {
      // Lantern holder
      const lanternHolder = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.15, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 }),
      );
      lanternHolder.position.set(ltx, lty, ltz);
      this._spectatorGroup.add(lanternHolder);

      // Lantern body
      const lantern = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.1, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 }),
      );
      lantern.position.set(ltx, lty + 0.12, ltz);
      this._spectatorGroup.add(lantern);

      // Lantern glow
      const lanternGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 12, 10),
        new THREE.MeshStandardMaterial({
          color: 0xffcc44, emissive: 0xffaa00, emissiveIntensity: 2.0,
          transparent: true, opacity: 0.85,
        }),
      );
      lanternGlow.position.set(ltx, lty + 0.12, ltz);
      this._spectatorGroup.add(lanternGlow);

      this._scene.addTorchLight(ltx, lty + 0.15, ltz);
    }

    // Noble's Box
    const nbX = 0;
    const nbZ = -8.5;
    const nbY = 3.0;
    const nbW = 3.0;
    const nbD = 1.5;
    const nobleMat = new THREE.MeshStandardMaterial({ color: 0x6a3030, roughness: 0.5, metalness: 0.3 });
    const goldAccent = new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.3, metalness: 0.6 });

    const boxPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(nbW, 0.15, nbD),
      nobleMat,
    );
    boxPlatform.position.set(nbX, nbY, nbZ);
    this._spectatorGroup.add(boxPlatform);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(nbW, 0.5, 0.06),
      goldAccent,
    );
    rail.position.set(nbX, nbY + 0.25, nbZ + nbD / 2);
    this._spectatorGroup.add(rail);

    for (const s of [-1, 1]) {
      const sideRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.5, nbD),
        goldAccent,
      );
      sideRail.position.set(nbX + s * nbW / 2, nbY + 0.25, nbZ);
      this._spectatorGroup.add(sideRail);
    }

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, nbY, 8),
          nobleMat,
        );
        col.position.set(nbX + sx * (nbW / 2 - 0.1), nbY / 2, nbZ + sz * (nbD / 2 - 0.1));
        this._spectatorGroup.add(col);
      }
    }

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(nbW + 0.6, 0.08, nbD + 0.6),
      new THREE.MeshStandardMaterial({ color: 0x7a2020, roughness: 0.6, metalness: 0.2 }),
    );
    canopy.position.set(nbX, nbY + 1.8, nbZ);
    canopy.rotation.x = 0.05;
    this._spectatorGroup.add(canopy);

    const canopyTrim = new THREE.Mesh(
      new THREE.BoxGeometry(nbW + 0.7, 0.04, 0.06),
      goldAccent,
    );
    canopyTrim.position.set(nbX, nbY + 1.76, nbZ + nbD / 2 + 0.3);
    this._spectatorGroup.add(canopyTrim);

    // Noble figures
    for (let n = 0; n < 3; n++) {
      const nx = nbX - 0.8 + n * 0.8;
      const nobleBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.55, 12),
        new THREE.MeshStandardMaterial({ color: 0x8a2020 + n * 0x001500, roughness: 0.5 }),
      );
      nobleBody.position.set(nx, nbY + 0.4, nbZ);
      this._spectatorGroup.add(nobleBody);
      this._registerSpectator(nobleBody);

      const nobleHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 }),
      );
      nobleHead.position.set(nx, nbY + 0.75, nbZ);
      this._spectatorGroup.add(nobleHead);
    }

    // Banners
    const bannerColors = [0x2244aa, 0xaa2222, 0x228844, 0x885522, 0x662288, 0xaa8822];
    for (let i = 0; i < 5; i++) {
      for (const side of [-1, 1]) {
        const color = bannerColors[(i + (side > 0 ? 3 : 0)) % bannerColors.length];
        const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.7 });
        const banner = new THREE.Mesh(
          new THREE.PlaneGeometry(0.55, 1.8),
          mat,
        );
        banner.position.set(
          side * (TB.STAGE_HALF_WIDTH + 1.8),
          2.5 + Math.sin(i * 0.7) * 0.3,
          -2 - i * 1.3,
        );
        banner.rotation.y = side * (-0.25 + Math.sin(i * 1.3) * 0.1);
        banner.rotation.z = Math.sin(i * 0.9 + side) * 0.06;
        this._spectatorGroup.add(banner);

        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 2.2, 10),
          new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.7 }),
        );
        pole.position.set(
          side * (TB.STAGE_HALF_WIDTH + 1.8),
          2.5,
          -2 - i * 1.3,
        );
        this._spectatorGroup.add(pole);
      }
    }
  }

  private _buildCourtyardTorches(): void {
    const torchPositions: [number, number, number][] = [
      // Original positions (doubled with interleaved new positions)
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, 2.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, 1.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, 0.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -0.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -1.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -2.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -3.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -4.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, 2.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, 1.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, 0.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -0.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -1.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -2.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -3.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -4.5],
      [0, 3.8, -7],
      [0, 3.8, -9.5],
      [-2, 3.8, -8],
      [2, 3.8, -8],
    ];

    for (const [tx, ty, tz] of torchPositions) {
      this._addWallTorch(tx, ty, tz);
    }

    // Subtle up-lighting at ground level (reduced to avoid center hotspot)
    const upLight1 = new THREE.PointLight(0xff6633, 0.4, 8, 2);
    upLight1.position.set(-TB.STAGE_HALF_WIDTH * 0.5, 0.1, 0);
    this._scene.scene.add(upLight1);

    const upLight2 = new THREE.PointLight(0xff6633, 0.4, 8, 2);
    upLight2.position.set(TB.STAGE_HALF_WIDTH * 0.5, 0.1, 0);
    this._scene.scene.add(upLight2);

    // Colored rim lights for fighters (warm orange left, cool blue right)
    const rimLightLeft = new THREE.PointLight(0xff8844, 0.6, 6, 2);
    rimLightLeft.position.set(-TB.STAGE_HALF_WIDTH * 0.7, 1.5, 1.0);
    this._scene.scene.add(rimLightLeft);

    const rimLightRight = new THREE.PointLight(0x4488ff, 0.6, 6, 2);
    rimLightRight.position.set(TB.STAGE_HALF_WIDTH * 0.7, 1.5, 1.0);
    this._scene.scene.add(rimLightRight);
  }

  private _buildCourtyardChandelier(): void {
    const chanY = 5.0;
    const chanZ = -1.5;
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.75 });

    // Hanging chain links (individual torus meshes forming a visible chain)
    const chainLinkCount = 20;
    for (let cl = 0; cl < chainLinkCount; cl++) {
      const link = new THREE.Mesh(
        new THREE.TorusGeometry(0.025, 0.006, 5, 6),
        ironMat,
      );
      link.position.set(0, chanY + 0.15 * cl + 0.1, chanZ);
      link.rotation.x = cl % 2 === 0 ? 0 : Math.PI / 2;
      this._props.add(link);
    }

    // Keep the thin rod as structural support
    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 3.0, 10),
      ironMat,
    );
    chain.position.set(0, chanY + 1.5, chanZ);
    this._props.add(chain);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.035, 8, 24),
      ironMat,
    );
    ring.position.set(0, chanY, chanZ);
    ring.rotation.x = Math.PI / 2;
    this._props.add(ring);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.025, 8, 20),
      ironMat,
    );
    innerRing.position.set(0, chanY, chanZ);
    innerRing.rotation.x = Math.PI / 2;
    this._props.add(innerRing);

    for (let a = 0; a < 4; a++) {
      const angle = (a / 4) * Math.PI * 2;
      const crossBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.8, 10),
        ironMat,
      );
      crossBar.position.set(
        0.4 * Math.cos(angle),
        chanY,
        chanZ + 0.4 * Math.sin(angle),
      );
      crossBar.rotation.z = Math.PI / 2;
      crossBar.rotation.y = angle;
      this._props.add(crossBar);
    }

    for (let a = 0; a < 4; a++) {
      const angle = (a / 4) * Math.PI * 2 + Math.PI / 4;
      const supportChain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 1.2, 10),
        ironMat,
      );
      const scx = 0.6 * Math.cos(angle);
      const scz = chanZ + 0.6 * Math.sin(angle);
      supportChain.position.set(scx / 2, chanY + 0.55, (scz + chanZ) / 2);
      supportChain.rotation.z = Math.atan2(0.6, 1.1) * Math.cos(angle);
      supportChain.rotation.x = Math.atan2(0.6, 1.1) * Math.sin(angle);
      this._props.add(supportChain);
    }

    // Ornate iron filigree connecting ring to cross-bars
    for (let fg = 0; fg < 8; fg++) {
      const fgAngle = (fg / 8) * Math.PI * 2;
      const filigree = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.005, 5, 8, Math.PI),
        ironMat,
      );
      filigree.position.set(
        0.6 * Math.cos(fgAngle),
        chanY - 0.04,
        chanZ + 0.6 * Math.sin(fgAngle),
      );
      filigree.rotation.y = fgAngle;
      this._props.add(filigree);
    }

    // Crystal pendants hanging from ring
    for (let cp = 0; cp < 12; cp++) {
      const cpAngle = (cp / 12) * Math.PI * 2;
      const crystal = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 10),
        new THREE.MeshStandardMaterial({
          color: 0xaaddff,
          emissive: 0x6699cc,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.7,
          metalness: 0.1,
          roughness: 0.2,
        }),
      );
      crystal.position.set(
        0.8 * Math.cos(cpAngle),
        chanY - 0.12,
        chanZ + 0.8 * Math.sin(cpAngle),
      );
      this._props.add(crystal);
      // Thin wire holding crystal
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, 0.1, 8),
        ironMat,
      );
      wire.position.set(
        0.8 * Math.cos(cpAngle),
        chanY - 0.06,
        chanZ + 0.8 * Math.sin(cpAngle),
      );
      this._props.add(wire);
    }

    // Double candle count
    const candleCount = 20;
    for (let c = 0; c < candleCount; c++) {
      const cAngle = (c / candleCount) * Math.PI * 2;
      const candleX = 0.8 * Math.cos(cAngle);
      const candleZ = chanZ + 0.8 * Math.sin(cAngle);

      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.018, 0.15, 12),
        new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.9 }),
      );
      candle.position.set(candleX, chanY + 0.1, candleZ);
      this._props.add(candle);

      const candleFlame = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 12, 10),
        new THREE.MeshStandardMaterial({
          color: 0xffcc44,
          emissive: 0xffaa00,
          emissiveIntensity: 2.5,
          transparent: true,
          opacity: 0.9,
        }),
      );
      candleFlame.position.set(candleX, chanY + 0.2, candleZ);
      this._props.add(candleFlame);

      // Candle drip wax
      const dripCount = 1 + Math.floor(Math.random() * 3);
      for (let dr = 0; dr < dripCount; dr++) {
        const drip = new THREE.Mesh(
          new THREE.ConeGeometry(0.006, 0.03 + Math.random() * 0.02, 4),
          new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.9 }),
        );
        drip.position.set(
          candleX + (Math.random() - 0.5) * 0.02,
          chanY + 0.02 - dr * 0.015,
          candleZ + (Math.random() - 0.5) * 0.02,
        );
        drip.rotation.x = Math.PI; // point downward
        this._props.add(drip);
      }
    }

    this._scene.addTorchLight(0, chanY - 0.2, chanZ);
  }

  private _buildCourtyardSkyEnvironment(): void {
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 512;
    skyCanvas.height = 256;
    const sCtx = skyCanvas.getContext("2d")!;

    const skyGrad = sCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, "#050510");
    skyGrad.addColorStop(0.5, "#0a0a1a");
    skyGrad.addColorStop(1, "#151525");
    sCtx.fillStyle = skyGrad;
    sCtx.fillRect(0, 0, 512, 256);

    for (let x = 0; x < 512; x += 2) {
      const wave = Math.sin(x * 0.015) * 20 + Math.sin(x * 0.037) * 10;
      const by = 80 + wave;
      const auroraH = 25 + Math.sin(x * 0.02) * 10;

      const aGrad = sCtx.createLinearGradient(0, by - auroraH, 0, by + auroraH);
      aGrad.addColorStop(0, "rgba(20,80,60,0)");
      aGrad.addColorStop(0.3, "rgba(30,120,80,0.08)");
      aGrad.addColorStop(0.5, "rgba(60,40,120,0.1)");
      aGrad.addColorStop(0.7, "rgba(30,100,90,0.07)");
      aGrad.addColorStop(1, "rgba(20,60,80,0)");
      sCtx.fillStyle = aGrad;
      sCtx.fillRect(x, by - auroraH, 3, auroraH * 2);
    }

    // Stars on the sky texture (varying brightness, 60 stars)
    for (let st = 0; st < 60; st++) {
      const stx = Math.random() * 512;
      const sty = Math.random() * 160; // upper portion of sky
      const brightness = 150 + Math.floor(Math.random() * 105);
      const starSize = 0.5 + Math.random() * 1.5;
      sCtx.fillStyle = `rgba(${brightness},${brightness},${Math.min(255, brightness + 20)},${0.4 + Math.random() * 0.6})`;
      sCtx.beginPath();
      sCtx.arc(stx, sty, starSize, 0, Math.PI * 2);
      sCtx.fill();
    }

    // Clouds (semi-transparent grey blobs)
    for (let cl = 0; cl < 8; cl++) {
      const cloudX = Math.random() * 512;
      const cloudY = 30 + Math.random() * 100;
      const cloudW = 40 + Math.random() * 80;
      const cloudH = 10 + Math.random() * 20;
      const cloudAlpha = 0.04 + Math.random() * 0.06;
      sCtx.fillStyle = `rgba(60,60,70,${cloudAlpha})`;
      sCtx.beginPath();
      sCtx.ellipse(cloudX, cloudY, cloudW, cloudH, 0, 0, Math.PI * 2);
      sCtx.fill();
      // Cloud detail blobs
      for (let cb = 0; cb < 4; cb++) {
        sCtx.beginPath();
        sCtx.ellipse(
          cloudX + (Math.random() - 0.5) * cloudW,
          cloudY + (Math.random() - 0.5) * cloudH,
          cloudW * 0.4, cloudH * 0.6, 0, 0, Math.PI * 2,
        );
        sCtx.fill();
      }
    }

    // Distant mountain silhouettes along the horizon
    sCtx.fillStyle = "rgba(8,8,15,0.9)";
    sCtx.beginPath();
    sCtx.moveTo(0, 256);
    for (let mx = 0; mx <= 512; mx += 4) {
      const mh = 220 - (Math.sin(mx * 0.025) * 15 + Math.sin(mx * 0.06) * 8 +
        Math.sin(mx * 0.012) * 20 + Math.random() * 3);
      sCtx.lineTo(mx, mh);
    }
    sCtx.lineTo(512, 256);
    sCtx.closePath();
    sCtx.fill();

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyGeo = new THREE.SphereGeometry(45, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.scene.add(sky);

    // Moon (larger with crater detail)
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xeeeedd,
      emissive: 0xccccaa,
      emissiveIntensity: 0.5,
    });
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 20, 16),
      moonMat,
    );
    moon.position.set(-15, 22, -25);
    this._scene.scene.add(moon);

    // Moon craters (darker spots on surface)
    const craterData = [
      { x: 0.3, y: 0.5, z: 0.8, r: 0.35 },
      { x: -0.6, y: 0.2, z: 0.7, r: 0.25 },
      { x: 0.1, y: -0.4, z: 0.9, r: 0.2 },
      { x: -0.3, y: 0.7, z: 0.6, r: 0.3 },
      { x: 0.5, y: -0.2, z: 0.8, r: 0.15 },
      { x: -0.7, y: -0.3, z: 0.6, r: 0.28 },
      { x: 0.4, y: 0.1, z: 0.9, r: 0.18 },
    ];
    for (const cr of craterData) {
      const len = Math.sqrt(cr.x * cr.x + cr.y * cr.y + cr.z * cr.z);
      const crater = new THREE.Mesh(
        new THREE.CircleGeometry(cr.r, 8),
        new THREE.MeshStandardMaterial({
          color: 0xbbbb99,
          emissive: 0x999977,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.6,
        }),
      );
      crater.position.set(
        -15 + (cr.x / len) * 2.48,
        22 + (cr.y / len) * 2.48,
        -25 + (cr.z / len) * 2.48,
      );
      crater.lookAt(-15, 22, -25);
      crater.rotateY(Math.PI);
      this._scene.scene.add(crater);
    }

    const moonGlow = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 12, 8),
      new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.06,
      }),
    );
    moonGlow.position.copy(moon.position);
    this._scene.scene.add(moonGlow);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    const starSizes: number[] = [];
    for (let i = 0; i < 650; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.55;
      const r = 38 + Math.random() * 5;
      starPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + 5,
        r * Math.sin(phi) * Math.sin(theta),
      );
      starSizes.push(0.08 + Math.random() * 0.2);
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    starGeo.setAttribute("size", new THREE.Float32BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    this._scene.scene.add(stars);

    const dimStarGeo = new THREE.BufferGeometry();
    const dimPositions: number[] = [];
    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const r = 40;
      dimPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + 5,
        r * Math.sin(phi) * Math.sin(theta),
      );
    }
    dimStarGeo.setAttribute("position", new THREE.Float32BufferAttribute(dimPositions, 3));
    const dimStarMat = new THREE.PointsMaterial({
      color: 0x8888aa,
      size: 0.08,
      sizeAttenuation: true,
    });
    const dimStars = new THREE.Points(dimStarGeo, dimStarMat);
    this._scene.scene.add(dimStars);

    // Mountains
    const mountainMat = new THREE.MeshBasicMaterial({ color: 0x0c0c18 });
    const mountainData = [
      { x: -18, h: 6, w: 8 },
      { x: -10, h: 8, w: 10 },
      { x: -3, h: 5, w: 7 },
      { x: 5, h: 9, w: 11 },
      { x: 13, h: 6.5, w: 9 },
      { x: 20, h: 7, w: 8 },
      { x: -25, h: 5, w: 7 },
      { x: 27, h: 4.5, w: 6 },
    ];

    for (const m of mountainData) {
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(m.w / 2, m.h, 10),
        mountainMat,
      );
      mountain.position.set(m.x, m.h / 2 - 1, -35);
      mountain.rotation.y = Math.random() * 0.5;
      this._scene.scene.add(mountain);
    }
  }

  private _buildCourtyardGroundDetails(): void {
    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4035, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.6 });
    const bloodMat = new THREE.MeshStandardMaterial({
      color: 0x3a0808,
      roughness: 0.95,
      metalness: 0,
      transparent: true,
      opacity: 0.5,
    });

    // Scattered rock debris
    for (let i = 0; i < 25; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const rx = side * (floorW / 2 - 0.3 - Math.random() * 0.8);
      const rz = (Math.random() - 0.5) * floorD * 0.8;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.03 + Math.random() * 0.06, 0),
        stoneMat,
      );
      rock.position.set(rx, 0.02, rz);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this._floorGroup.add(rock);
    }

    // Broken sword pieces
    for (let i = 0; i < 4; i++) {
      const sx = (Math.random() - 0.5) * floorW * 0.9;
      const sz = floorD / 2 - 0.5 - Math.random() * 1.0;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.01, 0.15 + Math.random() * 0.1),
        metalMat,
      );
      blade.position.set(sx, 0.01, sz);
      blade.rotation.y = Math.random() * Math.PI;
      this._floorGroup.add(blade);
    }

    // Drain grates
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.7 });
    const corners: [number, number][] = [
      [-floorW / 2 + 0.5, floorD / 2 - 0.5],
      [floorW / 2 - 0.5, floorD / 2 - 0.5],
      [-floorW / 2 + 0.5, -floorD / 2 + 0.5],
      [floorW / 2 - 0.5, -floorD / 2 + 0.5],
    ];
    for (const [gx, gz] of corners) {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.02, 0.5),
        grateMat,
      );
      frame.position.set(gx, 0.005, gz);
      this._floorGroup.add(frame);

      for (let b = -2; b <= 2; b++) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.025, 0.02),
          grateMat,
        );
        bar.position.set(gx, 0.015, gz + b * 0.09);
        this._floorGroup.add(bar);
      }

      const hole = new THREE.Mesh(
        new THREE.PlaneGeometry(0.44, 0.44),
        new THREE.MeshBasicMaterial({ color: 0x080808 }),
      );
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(gx, 0.001, gz);
      this._floorGroup.add(hole);
    }

    // Blood stains
    for (let i = 0; i < 6; i++) {
      const bx = (Math.random() - 0.5) * floorW * 0.7;
      const bz = (Math.random() - 0.5) * floorD * 0.6;
      const stain = new THREE.Mesh(
        new THREE.CircleGeometry(0.08 + Math.random() * 0.15, 8),
        bloodMat,
      );
      stain.rotation.x = -Math.PI / 2;
      stain.position.set(bx, 0.003, bz);
      this._floorGroup.add(stain);

      for (let s = 0; s < 3; s++) {
        const splat = new THREE.Mesh(
          new THREE.CircleGeometry(0.02 + Math.random() * 0.04, 6),
          bloodMat,
        );
        splat.rotation.x = -Math.PI / 2;
        splat.position.set(
          bx + (Math.random() - 0.5) * 0.3,
          0.003,
          bz + (Math.random() - 0.5) * 0.3,
        );
        this._floorGroup.add(splat);
      }
    }
  }

  /* ================================================================== */
  /*  UNDERGROUND PIT                                                     */
  /* ================================================================== */

  private _buildUndergroundPit(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x060608, 0.06);
    this._scene.scene.background = new THREE.Color(0x060608);

    this._buildPitFloor();
    this._buildPitWalls();
    this._buildPitSpectators();
    this._buildPitFirePits();
    this._buildPitCeiling();
    this._buildPitProps();
    this._buildPitEnvironment();
    this._buildPitEmbers();
  }

  private _buildPitFloor(): void {
    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Dirt/sand floor texture
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    const S = 1024;

    // Base dirt color
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(0, 0, S, S);

    // Dirt variation patches
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 58 + Math.floor(Math.random() * 30 - 15);
      const g = 42 + Math.floor(Math.random() * 20 - 10);
      const b = 24 + Math.floor(Math.random() * 16 - 8);
      ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
      ctx.fillRect(x, y, 3 + Math.random() * 12, 2 + Math.random() * 8);
    }

    // Sand grain speckles
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const v = 50 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgba(${v + 20},${v + 10},${v},0.4)`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    // Blood stain patches (darker areas)
    for (let i = 0; i < 12; i++) {
      const cx = Math.random() * S;
      const cy = Math.random() * S;
      const radius = 15 + Math.random() * 40;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, "rgba(40,8,8,0.5)");
      grad.addColorStop(0.6, "rgba(30,5,5,0.3)");
      grad.addColorStop(1, "rgba(20,5,5,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    // Rough cracks in dirt
    for (let i = 0; i < 15; i++) {
      ctx.strokeStyle = `rgba(20,12,5,${0.4 + Math.random() * 0.3})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      let cx = Math.random() * S;
      let cy = Math.random() * S;
      ctx.moveTo(cx, cy);
      const segs = 3 + Math.floor(Math.random() * 5);
      for (let s = 0; s < segs; s++) {
        cx += (Math.random() - 0.5) * 60;
        cy += (Math.random() - 0.5) * 60;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    const floorMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.02,
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      floorMat,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);
  }

  private _buildPitWalls(): void {
    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9, metalness: 0.05 });

    // Circular pit wall ring (short stone wall, 1m high)
    const wallSegments = 32;
    const pitRadius = Math.max(floorW, floorD) / 2 + 0.5;
    for (let i = 0; i < wallSegments; i++) {
      const angle = (i / wallSegments) * Math.PI * 2;
      const nextAngle = ((i + 1) / wallSegments) * Math.PI * 2;
      const midAngle = (angle + nextAngle) / 2;
      const segW = 2 * pitRadius * Math.sin(Math.PI / wallSegments);

      const wallSeg = new THREE.Mesh(
        new THREE.BoxGeometry(segW, 1.0, 0.3),
        stoneMat,
      );
      wallSeg.position.set(
        Math.cos(midAngle) * pitRadius,
        0.5,
        Math.sin(midAngle) * pitRadius,
      );
      wallSeg.rotation.y = -midAngle + Math.PI / 2;
      wallSeg.castShadow = true;
      this._props.add(wallSeg);
    }

    // Rough stone variation on top of wall
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.1, 0),
        stoneMat,
      );
      rock.position.set(
        Math.cos(angle) * pitRadius,
        1.0 + Math.random() * 0.1,
        Math.sin(angle) * pitRadius,
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this._props.add(rock);
    }

    this._buildWallBarriers();
  }

  private _buildPitSpectators(): void {
    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;
    const pitRadius = Math.max(floorW, floorD) / 2 + 0.5;

    // Standing crowd around the pit edge (tightly packed, arranged in an arc behind)
    const crowdRadius = pitRadius + 0.4;
    // Back arc (facing the fight): from -150 degrees to -30 degrees
    const arcStart = -Math.PI * 0.85;
    const arcEnd = -Math.PI * 0.15;
    const crowdCount = 60;

    for (let i = 0; i < crowdCount; i++) {
      const t = i / (crowdCount - 1);
      const angle = arcStart + t * (arcEnd - arcStart);
      const rowOffset = Math.floor(Math.random() * 3); // 0, 1, or 2 rows deep
      const r = crowdRadius + rowOffset * 0.5;
      const sx = Math.cos(angle) * r + (Math.random() - 0.5) * 0.15;
      const sz = Math.sin(angle) * r + (Math.random() - 0.5) * 0.15;
      const sy = 1.05 + rowOffset * 0.2; // standing on wall rim, higher rows further

      this._addSpectatorFigure(sx, sy, sz);
    }

    // Side spectators
    for (const sideAngle of [Math.PI * 0.3, Math.PI * 0.7, -Math.PI + 0.3, -Math.PI + 0.7]) {
      for (let j = 0; j < 5; j++) {
        const angle = sideAngle + (j - 2) * 0.08;
        const r = crowdRadius + Math.random() * 0.6;
        const sx = Math.cos(angle) * r;
        const sz = Math.sin(angle) * r;
        this._addSpectatorFigure(sx, 1.05, sz);
      }
    }

    // Fight promoter's chair (single elevated seat, center back)
    const chairZ = -(pitRadius + 2.0);
    const chairY = 1.8;
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a2020, roughness: 0.5, metalness: 0.3 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 });

    // Platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.15, 0.8),
      chairMat,
    );
    platform.position.set(0, chairY, chairZ);
    this._spectatorGroup.add(platform);

    // Support legs
    for (const sx of [-0.5, 0.5]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, chairY, 12),
        ironMat,
      );
      leg.position.set(sx, chairY / 2, chairZ);
      this._spectatorGroup.add(leg);
    }

    // Chair back
    const chairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.08),
      chairMat,
    );
    chairBack.position.set(0, chairY + 0.5, chairZ - 0.35);
    this._spectatorGroup.add(chairBack);

    // Promoter figure
    const promoterBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x4a1010, roughness: 0.5 }),
    );
    promoterBody.position.set(0, chairY + 0.45, chairZ);
    this._spectatorGroup.add(promoterBody);
    this._registerSpectator(promoterBody);

    const promoterHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 }),
    );
    promoterHead.position.set(0, chairY + 0.85, chairZ);
    this._spectatorGroup.add(promoterHead);
  }

  private _buildPitFirePits(): void {
    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // 4 corner fire pits
    const cornerPositions: [number, number, number][] = [
      [-floorW / 2 + 0.5, 0, floorD / 2 - 0.5],
      [floorW / 2 - 0.5, 0, floorD / 2 - 0.5],
      [-floorW / 2 + 0.5, 0, -floorD / 2 + 0.5],
      [floorW / 2 - 0.5, 0, -floorD / 2 + 0.5],
    ];

    for (const [x, y, z] of cornerPositions) {
      this._addFirePit(x, y, z);
    }

    // Additional dim ambient lights along pit walls
    this._scene.addTorchLight(0, 1.5, -floorD / 2 - 1);
    this._scene.addTorchLight(0, 1.5, floorD / 2 + 1);
  }

  private _buildPitCeiling(): void {
    const ceilingY = 5.0;
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1a1818, roughness: 0.95, metalness: 0.05 });

    // Low dark ceiling (stone slab)
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      stoneMat,
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, ceilingY, -2);
    this._props.add(ceiling);

    // Stone arches crossing the ceiling
    const archMat = new THREE.MeshStandardMaterial({ color: 0x252220, roughness: 0.8, metalness: 0.1 });
    for (let i = 0; i < 4; i++) {
      const z = -4 + i * 2.5;
      const arch = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.3, 0.5),
        archMat,
      );
      arch.position.set(0, ceilingY - 0.15, z);
      this._props.add(arch);
    }

    // Cross arches
    for (let i = 0; i < 3; i++) {
      const x = -5 + i * 5;
      const crossArch = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.3, 14),
        archMat,
      );
      crossArch.position.set(x, ceilingY - 0.15, -2);
      this._props.add(crossArch);
    }
  }

  private _buildPitProps(): void {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.8, metalness: 0.05 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9, metalness: 0.05 });

    // Skull decorations along pit wall
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
      const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;
      const pitRadius = Math.max(floorW, floorD) / 2 + 0.3;

      // Skull (sphere + jaw)
      const skull = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 10),
        boneMat,
      );
      skull.position.set(
        Math.cos(angle) * pitRadius,
        0.8 + Math.random() * 0.3,
        Math.sin(angle) * pitRadius,
      );
      skull.scale.y = 0.85; // slightly flattened
      this._props.add(skull);

      // Eye sockets (dark indentations)
      for (const ex of [-0.03, 0.03]) {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0x080808 }),
        );
        eye.position.set(
          skull.position.x + ex * Math.cos(angle + Math.PI / 2),
          skull.position.y + 0.02,
          skull.position.z + ex * Math.sin(angle + Math.PI / 2),
        );
        this._props.add(eye);
      }
    }

    // Chains hanging from ceiling
    for (let i = 0; i < 6; i++) {
      const cx = (Math.random() - 0.5) * 10;
      const cz = -4 + Math.random() * 6;
      const chainLen = 1.5 + Math.random() * 2.0;

      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, chainLen, 10),
        ironMat,
      );
      chain.position.set(cx, 5.0 - chainLen / 2, cz);
      this._props.add(chain);

      // Chain links (small torus segments)
      const linkCount = Math.floor(chainLen / 0.15);
      for (let l = 0; l < linkCount; l++) {
        const link = new THREE.Mesh(
          new THREE.TorusGeometry(0.025, 0.006, 10, 6),
          ironMat,
        );
        link.position.set(cx, 5.0 - l * 0.15, cz);
        link.rotation.x = l % 2 === 0 ? 0 : Math.PI / 2;
        this._props.add(link);
      }

      // Hook or shackle at end
      if (Math.random() > 0.5) {
        const hook = new THREE.Mesh(
          new THREE.TorusGeometry(0.04, 0.008, 10, 8, Math.PI),
          ironMat,
        );
        hook.position.set(cx, 5.0 - chainLen, cz);
        this._props.add(hook);
      }
    }

    // Wooden support beams (diagonal props against walls)
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI * 0.25 + i * Math.PI * 0.5;
      const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
      const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;
      const pitRadius = Math.max(floorW, floorD) / 2;

      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 3.5, 0.12),
        woodMat,
      );
      beam.position.set(
        Math.cos(angle) * (pitRadius - 0.3),
        2.0,
        Math.sin(angle) * (pitRadius - 0.3),
      );
      beam.rotation.z = Math.cos(angle) * 0.15;
      beam.rotation.x = Math.sin(angle) * 0.15;
      this._props.add(beam);
    }

    // Scattered bones and debris on floor
    for (let i = 0; i < 10; i++) {
      const bx = (Math.random() - 0.5) * 6;
      const bz = (Math.random() - 0.5) * 5;
      const bone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.015, 0.1 + Math.random() * 0.08, 4),
        boneMat,
      );
      bone.position.set(bx, 0.01, bz);
      bone.rotation.z = Math.PI / 2;
      bone.rotation.y = Math.random() * Math.PI;
      this._floorGroup.add(bone);
    }

    // Blood stains on dirt
    const bloodMat = new THREE.MeshStandardMaterial({
      color: 0x2a0505,
      roughness: 0.95,
      transparent: true,
      opacity: 0.6,
    });
    for (let i = 0; i < 10; i++) {
      const bx = (Math.random() - 0.5) * 6;
      const bz = (Math.random() - 0.5) * 5;
      const stain = new THREE.Mesh(
        new THREE.CircleGeometry(0.06 + Math.random() * 0.2, 8),
        bloodMat,
      );
      stain.rotation.x = -Math.PI / 2;
      stain.position.set(bx, 0.003, bz);
      this._floorGroup.add(stain);
    }
  }

  private _buildPitEnvironment(): void {
    // Enclosed underground space - dark dome
    const skyGeo = new THREE.SphereGeometry(30, 16, 12);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x040406,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.scene.add(sky);

    // Dripping water particle effect (simple falling points)
    const dripGeo = new THREE.BufferGeometry();
    const dripPositions: number[] = [];
    for (let i = 0; i < 40; i++) {
      dripPositions.push(
        (Math.random() - 0.5) * 12,
        Math.random() * 5,
        (Math.random() - 0.5) * 10,
      );
    }
    dripGeo.setAttribute("position", new THREE.Float32BufferAttribute(dripPositions, 3));
    const dripMat = new THREE.PointsMaterial({
      color: 0x4466aa,
      size: 0.03,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    const drips = new THREE.Points(dripGeo, dripMat);
    this._scene.scene.add(drips);
  }

  /* ================================================================== */
  /*  THRONE ROOM                                                         */
  /* ================================================================== */

  private _buildThroneRoom(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x1a1510, 0.02);
    this._scene.scene.background = new THREE.Color(0x1a1510);

    this._buildThroneFloor();
    this._buildThroneWalls();
    this._buildThroneSpectators();
    this._buildThroneLighting();
    this._buildThroneProps();
    this._buildThroneEnvironment();
    this._buildThroneLightShafts();
    this._buildDustMotes();
  }

  private _buildThroneFloor(): void {
    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Polished marble checkered floor
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    const S = 1024;

    // Base marble
    ctx.fillStyle = "#6a6a5a";
    ctx.fillRect(0, 0, S, S);

    const tileSize = 64;
    const tilesPerRow = S / tileSize;

    // Checkered pattern with marble texture
    for (let row = 0; row < tilesPerRow; row++) {
      for (let col = 0; col < tilesPerRow; col++) {
        const x = col * tileSize;
        const y = row * tileSize;
        const isLight = (row + col) % 2 === 0;

        // Base tile color
        if (isLight) {
          const v = 138 + Math.floor(Math.random() * 12 - 6);
          ctx.fillStyle = `rgb(${v},${v},${v - 10})`;
        } else {
          const v = 90 + Math.floor(Math.random() * 12 - 6);
          ctx.fillStyle = `rgb(${v},${v},${v - 8})`;
        }
        ctx.fillRect(x, y, tileSize, tileSize);

        // Marble veining
        for (let v = 0; v < 3; v++) {
          const vx = x + Math.random() * tileSize;
          const vy = y + Math.random() * tileSize;
          ctx.strokeStyle = isLight ? `rgba(160,158,148,0.4)` : `rgba(70,68,60,0.4)`;
          ctx.lineWidth = 0.5 + Math.random() * 1.5;
          ctx.beginPath();
          ctx.moveTo(vx, vy);
          for (let s = 0; s < 3; s++) {
            ctx.lineTo(
              vx + (Math.random() - 0.5) * 30,
              vy + (Math.random() - 0.5) * 20,
            );
          }
          ctx.stroke();
        }

        // Polished shine spots
        if (Math.random() < 0.2) {
          const sx = x + Math.random() * tileSize;
          const sy = y + Math.random() * tileSize;
          const shineR = 5 + Math.random() * 10;
          const shine = ctx.createRadialGradient(sx, sy, 0, sx, sy, shineR);
          shine.addColorStop(0, `rgba(255,255,240,0.08)`);
          shine.addColorStop(1, `rgba(255,255,240,0)`);
          ctx.fillStyle = shine;
          ctx.fillRect(sx - shineR, sy - shineR, shineR * 2, shineR * 2);
        }

        // Tile grout lines
        ctx.strokeStyle = "rgba(40,38,30,0.6)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    const floorMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.3,
      metalness: 0.15,
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      floorMat,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Red carpet running down the center
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x8a1515,
      roughness: 0.8,
      metalness: 0.05,
    });
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, floorD + 2),
      carpetMat,
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.005, 0);
    this._floorGroup.add(carpet);

    // Carpet gold trim edges
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.4, metalness: 0.5 });
    for (const side of [-1, 1]) {
      const trimStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, floorD + 2),
        trimMat,
      );
      trimStrip.rotation.x = -Math.PI / 2;
      trimStrip.position.set(side * 0.94, 0.006, 0);
      this._floorGroup.add(trimStrip);
    }

    // Carpet pattern (repeating diamond motif via small meshes)
    for (let i = 0; i < 12; i++) {
      const dz = -floorD / 2 + 1 + i * (floorD / 12);
      const diamond = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.4),
        new THREE.MeshStandardMaterial({
          color: 0xc4a855,
          roughness: 0.6,
          transparent: true,
          opacity: 0.3,
        }),
      );
      diamond.rotation.x = -Math.PI / 2;
      diamond.rotation.z = Math.PI / 4;
      diamond.position.set(0, 0.006, dz);
      this._floorGroup.add(diamond);
    }

    // Floor edge trim
    const edgeTrimMat = new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.3, metalness: 0.6 });
    const trimH = 0.06;
    const trimD2 = 0.1;

    const frontTrim = new THREE.Mesh(
      new THREE.BoxGeometry(floorW + 0.2, trimH, trimD2),
      edgeTrimMat,
    );
    frontTrim.position.set(0, trimH / 2, floorD / 2 + trimD2 / 2);
    this._floorGroup.add(frontTrim);

    const backTrim = frontTrim.clone();
    backTrim.position.z = -floorD / 2 - trimD2 / 2;
    this._floorGroup.add(backTrim);

    for (const side of [-1, 1]) {
      const sideTrim = new THREE.Mesh(
        new THREE.BoxGeometry(trimD2, trimH, floorD + 0.4),
        edgeTrimMat,
      );
      sideTrim.position.set(side * (floorW / 2 + trimD2 / 2), trimH / 2, 0);
      this._floorGroup.add(sideTrim);
    }
  }

  private _buildThroneWalls(): void {
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6a6a5a, roughness: 0.4, metalness: 0.2 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.3, metalness: 0.6 });

    // Tall ornate pillars along both sides
    for (const side of [-1, 1]) {
      const xBase = side * (TB.STAGE_HALF_WIDTH + 0.5);

      for (let p = 0; p < 5; p++) {
        const pz = -floorD / 2 + 1 + p * (floorD / 4.5);

        // Main pillar column (6m tall)
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.25, 6.0, 24),
          pillarMat,
        );
        pillar.position.set(xBase, 3.0, pz);
        pillar.castShadow = true;
        this._props.add(pillar);

        // Gold ring accents
        for (let r = 0; r < 6; r++) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.23, 0.015, 12, 32),
            goldTrimMat,
          );
          ring.position.set(xBase, 0.5 + r * 1.0, pz);
          ring.rotation.x = Math.PI / 2;
          this._props.add(ring);
        }

        // Ornate capital
        const capital = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.2, 0.3, 24),
          goldTrimMat,
        );
        capital.position.set(xBase, 6.15, pz);
        capital.castShadow = true;
        this._props.add(capital);

        // Square base with gold trim
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.25, 0.6),
          pillarMat,
        );
        base.position.set(xBase, 0.125, pz);
        this._props.add(base);

        const baseRim = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.04, 0.65),
          goldTrimMat,
        );
        baseRim.position.set(xBase, 0.27, pz);
        this._props.add(baseRim);

        // Banner hanging from pillar (red/gold)
        if (p > 0 && p < 4) {
          const bannerColor = p % 2 === 0 ? 0x8a1515 : 0xaa2020;
          const bannerMat = new THREE.MeshStandardMaterial({
            color: bannerColor,
            side: THREE.DoubleSide,
            roughness: 0.7,
          });
          const banner = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 2.0),
            bannerMat,
          );
          banner.position.set(xBase, 4.0, pz);
          banner.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          this._props.add(banner);

          // Gold trim on banner
          const bannerTrim = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.08),
            new THREE.MeshStandardMaterial({ color: 0xc4a855, side: THREE.DoubleSide }),
          );
          bannerTrim.position.set(xBase, 3.0, pz);
          bannerTrim.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          this._props.add(bannerTrim);
        }
      }
    }

    // Stained glass windows (colored light panels on walls behind pillars)
    const windowColors = [0x4466cc, 0xcc4444, 0x44aa44, 0xcc8844, 0x8844cc];
    for (const side of [-1, 1]) {
      const wx = side * (TB.STAGE_HALF_WIDTH + 1.5);
      for (let w = 0; w < 4; w++) {
        const wz = -floorD / 2 + 2.5 + w * (floorD / 4);
        const color = windowColors[(w + (side > 0 ? 2 : 0)) % windowColors.length];

        // Window frame (dark stone)
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 3.0, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x3a3a30, roughness: 0.7 }),
        );
        frame.position.set(wx, 3.5, wz);
        this._props.add(frame);

        // Stained glass panel (emissive colored)
        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(1.0, 2.5),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
          }),
        );
        glass.position.set(wx + side * 0.01, 3.5, wz);
        glass.rotation.y = Math.PI / 2;
        this._props.add(glass);

        // Pointed arch top
        const archTop = new THREE.Mesh(
          new THREE.ConeGeometry(0.6, 0.8, 8),
          new THREE.MeshStandardMaterial({ color: 0x3a3a30, roughness: 0.7 }),
        );
        archTop.position.set(wx, 5.2, wz);
        archTop.rotation.z = Math.PI;
        this._props.add(archTop);
      }
    }

    // Back wall
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a4840, roughness: 0.7, metalness: 0.1 });
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(TB.STAGE_HALF_WIDTH * 2 + 4, 7, 0.3),
      wallMat,
    );
    backWall.position.set(0, 3.5, -floorD / 2 - 2);
    this._props.add(backWall);

    this._buildWallBarriers();
  }

  private _buildThroneSpectators(): void {
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Courtiers standing along the walls
    for (const side of [-1, 1]) {
      const xBase = side * (TB.STAGE_HALF_WIDTH + 0.2);
      for (let i = 0; i < 10; i++) {
        const sz = -floorD / 2 + 1 + i * (floorD / 10);
        const sx = xBase + side * (0.3 + Math.random() * 0.3);
        this._addSpectatorFigure(
          sx, 0,
          sz + (Math.random() - 0.5) * 0.2,
          [0x4a2020, 0x203a5a, 0x3a4a20, 0x5a3a50, 0x6a3030, 0x2a3a6a, 0x4a5530],
          TekkenArenaRenderer.HEAD_COLORS,
        );
      }
    }

    // Nobles seated near throne (back area)
    const throneZ = -floorD / 2 - 0.5;
    for (let row = 0; row < 2; row++) {
      const z = throneZ + 2 + row * 1.0;
      for (let i = 0; i < 6; i++) {
        const sx = -2.5 + i * 1.0 + (Math.random() - 0.5) * 0.2;
        if (Math.abs(sx) < 1.2) continue; // Leave room for carpet/throne approach

        this._addSpectatorFigure(
          sx, 0, z,
          [0x6a2020, 0x3a2060, 0x20406a, 0x5a4020, 0x7a3040],
          TekkenArenaRenderer.HEAD_COLORS,
        );
      }
    }

    // Throne at the back (elevated platform with golden chair)
    const throneY = 0.6;
    const throneX = 0;
    const throneBackZ = throneZ;

    // Elevated platform (steps)
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x6a6a5a, roughness: 0.4, metalness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.3, metalness: 0.7 });

    // Three ascending steps
    for (let step = 0; step < 3; step++) {
      const stepW = 3.0 - step * 0.4;
      const stepD = 0.6;
      const stepH = 0.2;
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(stepW, stepH, stepD),
        platformMat,
      );
      stepMesh.position.set(throneX, step * stepH + stepH / 2, throneBackZ + 0.8 + step * 0.5);
      this._spectatorGroup.add(stepMesh);

      // Gold edge on each step
      const stepTrim = new THREE.Mesh(
        new THREE.BoxGeometry(stepW + 0.04, 0.03, 0.04),
        goldMat,
      );
      stepTrim.position.set(throneX, (step + 1) * stepH, throneBackZ + 0.5 + step * 0.5);
      this._spectatorGroup.add(stepTrim);
    }

    // Throne seat
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.3, metalness: 0.6 });
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.15, 0.8),
      seatMat,
    );
    seat.position.set(throneX, throneY + 0.07, throneBackZ + 2.0);
    this._spectatorGroup.add(seat);

    // Throne back (tall golden back)
    const throneBack = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 2.0, 0.12),
      seatMat,
    );
    throneBack.position.set(throneX, throneY + 1.1, throneBackZ + 2.35);
    this._spectatorGroup.add(throneBack);

    // Throne top ornament (pointed crown shape)
    const crownTop = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.5, 10),
      goldMat,
    );
    crownTop.position.set(throneX, throneY + 2.35, throneBackZ + 2.35);
    this._spectatorGroup.add(crownTop);

    // Armrests
    for (const s of [-1, 1]) {
      const armrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.5, 0.7),
        seatMat,
      );
      armrest.position.set(throneX + s * 0.55, throneY + 0.35, throneBackZ + 2.0);
      this._spectatorGroup.add(armrest);

      // Armrest ornament (small sphere)
      const ornament = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 6),
        goldMat,
      );
      ornament.position.set(throneX + s * 0.55, throneY + 0.65, throneBackZ + 1.65);
      this._spectatorGroup.add(ornament);
    }

    // Cushion
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x8a1515, roughness: 0.8 });
    const cushion = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.08, 0.55),
      cushionMat,
    );
    cushion.position.set(throneX, throneY + 0.19, throneBackZ + 1.95);
    this._spectatorGroup.add(cushion);

    // King/Queen figure on throne
    const royalBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.65, 12),
      new THREE.MeshStandardMaterial({ color: 0x6a1010, roughness: 0.5 }),
    );
    royalBody.position.set(throneX, throneY + 0.55, throneBackZ + 2.0);
    this._spectatorGroup.add(royalBody);
    this._registerSpectator(royalBody);

    const royalHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 }),
    );
    royalHead.position.set(throneX, throneY + 0.98, throneBackZ + 2.0);
    this._spectatorGroup.add(royalHead);

    // Crown on head
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.08, 8),
      goldMat,
    );
    crown.position.set(throneX, throneY + 1.12, throneBackZ + 2.0);
    this._spectatorGroup.add(crown);
  }

  private _buildThroneLighting(): void {
    // Grand chandeliers (ring of lights hanging from above)
    const chandelierPositions: [number, number][] = [
      [0, -1.5],
      [-3, -3],
      [3, -3],
    ];

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.3, metalness: 0.7 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.75 });

    for (const [cx, cz] of chandelierPositions) {
      const chanY = 5.5;
      const ringRadius = 0.6;

      // Chain
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 2.5, 10),
        ironMat,
      );
      chain.position.set(cx, chanY + 1.25, cz);
      this._props.add(chain);

      // Gold ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(ringRadius, 0.03, 8, 24),
        goldMat,
      );
      ring.position.set(cx, chanY, cz);
      ring.rotation.x = Math.PI / 2;
      this._props.add(ring);

      // Candles
      const candleCount = 8;
      for (let c = 0; c < candleCount; c++) {
        const angle = (c / candleCount) * Math.PI * 2;
        const px = cx + ringRadius * Math.cos(angle);
        const pz = cz + ringRadius * Math.sin(angle);

        const candle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.015, 0.12, 12),
          new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.9 }),
        );
        candle.position.set(px, chanY + 0.08, pz);
        this._props.add(candle);

        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 12, 10),
          new THREE.MeshStandardMaterial({
            color: 0xffcc44,
            emissive: 0xffaa00,
            emissiveIntensity: 2.5,
            transparent: true,
            opacity: 0.9,
          }),
        );
        flame.position.set(px, chanY + 0.17, pz);
        this._props.add(flame);
      }

      // Warm golden light
      this._scene.addTorchLight(cx, chanY - 0.2, cz);
    }

    // Additional wall sconce torches
    const torchPositions: [number, number, number][] = [
      [-TB.STAGE_HALF_WIDTH - 0.3, 3.0, 1.0],
      [-TB.STAGE_HALF_WIDTH - 0.3, 3.0, -2.0],
      [-TB.STAGE_HALF_WIDTH - 0.3, 3.0, -5.0],
      [TB.STAGE_HALF_WIDTH + 0.3, 3.0, 1.0],
      [TB.STAGE_HALF_WIDTH + 0.3, 3.0, -2.0],
      [TB.STAGE_HALF_WIDTH + 0.3, 3.0, -5.0],
    ];

    for (const [tx, ty, tz] of torchPositions) {
      this._addWallTorch(tx, ty, tz);
    }
  }

  private _buildThroneProps(): void {
    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Royal guard figures (static decorative suits of armor along walls)
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const ax = side * (TB.STAGE_HALF_WIDTH + 0.8);
        const az = -1 + i * -2.5;

        // Armor body
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.16, 0.7, 8),
          armorMat,
        );
        body.position.set(ax, 0.65, az);
        this._props.add(body);

        // Armor head (helmet)
        const helmet = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 8, 6),
          armorMat,
        );
        helmet.position.set(ax, 1.1, az);
        this._props.add(helmet);

        // Spear
        const spearMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.7 });
        const spear = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 2.5, 10),
          spearMat,
        );
        spear.position.set(ax + side * 0.15, 1.25, az);
        this._props.add(spear);

        // Spear tip
        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(0.03, 0.15, 10),
          armorMat,
        );
        tip.position.set(ax + side * 0.15, 2.55, az);
        this._props.add(tip);
      }
    }

    // Scattered flower petals on floor (royal aesthetic)
    const petalColors = [0xcc4444, 0xdd6666, 0xbb3333, 0xee8888];
    for (let i = 0; i < 15; i++) {
      const px = (Math.random() - 0.5) * floorW * 0.8;
      const pz = (Math.random() - 0.5) * floorD * 0.6;
      const color = petalColors[Math.floor(Math.random() * petalColors.length)];
      const petal = new THREE.Mesh(
        new THREE.CircleGeometry(0.02 + Math.random() * 0.03, 5),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide }),
      );
      petal.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      petal.rotation.z = Math.random() * Math.PI;
      petal.position.set(px, 0.003, pz);
      this._floorGroup.add(petal);
    }
  }

  private _buildThroneEnvironment(): void {
    // Interior dome/ceiling (high vaulted ceiling feel)
    const ceilingCanvas = document.createElement("canvas");
    ceilingCanvas.width = 256;
    ceilingCanvas.height = 256;
    const cCtx = ceilingCanvas.getContext("2d")!;

    // Rich dark warm interior
    const grad = cCtx.createRadialGradient(128, 128, 0, 128, 128, 180);
    grad.addColorStop(0, "#2a2218");
    grad.addColorStop(0.5, "#1a1510");
    grad.addColorStop(1, "#100c08");
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, 256, 256);

    const skyTex = new THREE.CanvasTexture(ceilingCanvas);
    const skyGeo = new THREE.SphereGeometry(35, 16, 12);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.scene.add(sky);

    // High vaulted ceiling
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.8, metalness: 0.1 });
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(25, 25),
      ceilingMat,
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 7.0, -2);
    this._props.add(ceiling);

    // Ceiling beams
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.7 });
    for (let i = 0; i < 5; i++) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.25, 0.4),
        beamMat,
      );
      beam.position.set(0, 6.85, -5 + i * 2.5);
      this._props.add(beam);
    }
  }

  /* ================================================================== */
  /*  DECORATIVE PROPS & ATMOSPHERIC EFFECTS                              */
  /* ================================================================== */

  /** Add weapon racks, banners with crests, and carved pillars to courtyard */
  private _buildCourtyardDecorativeProps(): void {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.9, roughness: 0.2 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.85 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.3, metalness: 0.6 });

    // Weapon racks on both sides (between pillars and spectators)
    for (const side of [-1, 1]) {
      const rackX = side * (TB.STAGE_HALF_WIDTH + 1.2);
      const rackZ = 0.5;

      // Rack frame (wooden A-frame)
      const rackPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.06), woodMat);
      rackPost1.position.set(rackX - 0.2, 0.8, rackZ);
      rackPost1.castShadow = true;
      this._props.add(rackPost1);

      const rackPost2 = rackPost1.clone();
      rackPost2.position.x = rackX + 0.2;
      this._props.add(rackPost2);

      // Cross bars
      for (const barY of [0.5, 1.0, 1.4]) {
        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), woodMat);
        crossBar.position.set(rackX, barY, rackZ);
        this._props.add(crossBar);
      }

      // Weapons on rack
      // Sword
      const sword = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.65, 0.015), metalMat);
      sword.position.set(rackX - 0.08, 0.9, rackZ + 0.04);
      sword.rotation.z = 0.05;
      this._props.add(sword);
      const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), goldMat);
      swordGuard.position.set(rackX - 0.08, 1.22, rackZ + 0.04);
      this._props.add(swordGuard);

      // Axe
      const axeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 10), woodMat);
      axeShaft.position.set(rackX + 0.08, 0.9, rackZ + 0.04);
      this._props.add(axeShaft);
      const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.015), metalMat);
      axeHead.position.set(rackX + 0.08, 1.25, rackZ + 0.04);
      this._props.add(axeHead);

      // Mace
      const maceShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.55, 10), woodMat);
      maceShaft.position.set(rackX, 0.85, rackZ + 0.04);
      maceShaft.rotation.z = -0.08;
      this._props.add(maceShaft);
      const maceHead = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), metalMat);
      maceHead.position.set(rackX - 0.04, 1.15, rackZ + 0.04);
      this._props.add(maceHead);
    }

    // Pillar carvings (decorative rings and reliefs on courtyard pillars)
    for (const side of [-1, 1]) {
      const xBase = side * (TB.STAGE_HALF_WIDTH + 0.3);
      const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

      for (const zPos of [floorD / 2 - 0.4, -floorD / 2 + 0.4]) {
        // Carved relief pattern (diamond shapes on pillar face)
        for (let h = 0; h < 3; h++) {
          const relief = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.05, 0.02),
            goldMat,
          );
          relief.position.set(xBase - side * 0.26, 1.5 + h * 1.0, zPos);
          relief.rotation.z = Math.PI / 4;
          this._props.add(relief);
        }
      }
    }

    // Heraldic banner crests (decorative emblems on existing banners)
    // These are small shield shapes attached to the banner poles
    const bannerColors = [0x2244aa, 0xaa2222, 0x228844];
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const crestX = side * (TB.STAGE_HALF_WIDTH + 1.8);
        const crestY = 3.5 + Math.sin(i * 0.7) * 0.3;
        const crestZ = -2 - i * 1.3;

        // Small shield crest
        const crest = new THREE.Mesh(
          new THREE.CircleGeometry(0.12, 6),
          new THREE.MeshStandardMaterial({
            color: bannerColors[i % bannerColors.length],
            metalness: 0.3,
            roughness: 0.5,
          }),
        );
        crest.position.set(crestX, crestY, crestZ);
        crest.rotation.y = side * -0.3;
        this._props.add(crest);

        // Gold trim on crest
        const crestRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.12, 0.008, 10, 6),
          goldMat,
        );
        crestRim.position.set(crestX, crestY, crestZ + side * 0.005);
        crestRim.rotation.y = side * -0.3;
        this._props.add(crestRim);
      }
    }

    // --- NEW STAGE PROPS ---

    const ironMatProp = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 });
    const stonePropMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.7, metalness: 0.15 });
    const woodPropMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.85 });

    // Trophy display on wall (small shelves with sphere trophies/skulls)
    const trophyWallX = -TB.STAGE_HALF_WIDTH - 0.8;
    const trophyWallZ = -3.0;
    for (let ts = 0; ts < 3; ts++) {
      const shelfY = 1.5 + ts * 0.8;
      // Shelf
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.04, 0.2),
        woodPropMat,
      );
      shelf.position.set(trophyWallX, shelfY, trophyWallZ + ts * 0.3);
      this._props.add(shelf);

      // Skull/trophy
      const skull = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xddd8c0, roughness: 0.6 }),
      );
      skull.position.set(trophyWallX - 0.1, shelfY + 0.08, trophyWallZ + ts * 0.3);
      this._props.add(skull);

      // Goblet/cup
      const goblet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.02, 0.08, 12),
        new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.3, metalness: 0.6 }),
      );
      goblet.position.set(trophyWallX + 0.1, shelfY + 0.06, trophyWallZ + ts * 0.3);
      this._props.add(goblet);
    }

    // Fallen debris/rubble at arena edges
    for (let debris = 0; debris < 8; debris++) {
      const debrisGroup = new THREE.Group();
      const debrisX = (Math.random() > 0.5 ? 1 : -1) * (TB.STAGE_HALF_WIDTH * 0.8 + Math.random() * 0.5);
      const debrisZ = (Math.random() - 0.5) * (TB.STAGE_HALF_DEPTH * 2);
      for (let dc = 0; dc < 3 + Math.floor(Math.random() * 4); dc++) {
        const chunk = new THREE.Mesh(
          new THREE.BoxGeometry(
            0.04 + Math.random() * 0.08,
            0.03 + Math.random() * 0.06,
            0.04 + Math.random() * 0.08,
          ),
          stonePropMat,
        );
        chunk.position.set(
          (Math.random() - 0.5) * 0.2,
          0.02 + Math.random() * 0.04,
          (Math.random() - 0.5) * 0.2,
        );
        chunk.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        debrisGroup.add(chunk);
      }
      debrisGroup.position.set(debrisX, 0, debrisZ);
      this._props.add(debrisGroup);
    }

    // Water feature/fountain at one end
    const fountainX = TB.STAGE_HALF_WIDTH + 1.5;
    const fountainZ = -5.5;
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x3355aa, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.7,
    });
    // Base basin
    const basin2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.45, 0.2, 12),
      stonePropMat,
    );
    basin2.position.set(fountainX, 0.1, fountainZ);
    this._props.add(basin2);
    // Pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 0.6, 8),
      stonePropMat,
    );
    pedestal.position.set(fountainX, 0.5, fountainZ);
    this._props.add(pedestal);
    // Upper bowl
    const upperBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.15, 0.15, 10),
      stonePropMat,
    );
    upperBowl.position.set(fountainX, 0.88, fountainZ);
    this._props.add(upperBowl);
    // Water sphere on top
    const waterTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      blueMat,
    );
    waterTop.position.set(fountainX, 1.05, fountainZ);
    this._props.add(waterTop);
    // Water in basin
    const waterBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.04, 12),
      blueMat,
    );
    waterBasin.position.set(fountainX, 0.18, fountainZ);
    this._props.add(waterBasin);

    // Hanging chains from ceiling at corners
    const chainCorners: [number, number][] = [
      [-TB.STAGE_HALF_WIDTH - 0.2, 2.0],
      [TB.STAGE_HALF_WIDTH + 0.2, 2.0],
      [-TB.STAGE_HALF_WIDTH - 0.2, -2.0],
      [TB.STAGE_HALF_WIDTH + 0.2, -2.0],
    ];
    for (const [hcx, hcz] of chainCorners) {
      const chainLength = 12;
      for (let lk = 0; lk < chainLength; lk++) {
        const link2 = new THREE.Mesh(
          new THREE.TorusGeometry(0.02, 0.005, 5, 6),
          ironMatProp,
        );
        link2.position.set(hcx, 5.5 - lk * 0.12, hcz);
        link2.rotation.x = lk % 2 === 0 ? 0 : Math.PI / 2;
        this._props.add(link2);
      }
    }

    // Brazier/fire pit at 2 corners of the arena
    const brazierPositions: [number, number][] = [
      [-TB.STAGE_HALF_WIDTH + 0.5, TB.STAGE_HALF_DEPTH + 1.5],
      [TB.STAGE_HALF_WIDTH - 0.5, TB.STAGE_HALF_DEPTH + 1.5],
    ];
    for (const [bpx, bpz] of brazierPositions) {
      this._addFirePit(bpx, 0, bpz);
    }

    // Stone archway entrance on one side (front)
    const archX = 0;
    const archZ = TB.STAGE_HALF_DEPTH + 2.5;
    // Left pillar
    const archPillarL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 3.5, 10),
      stonePropMat,
    );
    archPillarL.position.set(archX - 1.0, 1.75, archZ);
    archPillarL.castShadow = true;
    this._props.add(archPillarL);
    // Right pillar
    const archPillarR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 3.5, 10),
      stonePropMat,
    );
    archPillarR.position.set(archX + 1.0, 1.75, archZ);
    archPillarR.castShadow = true;
    this._props.add(archPillarR);
    // Arch top (curved section made of boxes forming an arch)
    const archSegments = 10;
    for (let as = 0; as <= archSegments; as++) {
      const archAngle = (as / archSegments) * Math.PI;
      const asx = archX + Math.cos(archAngle) * 1.0;
      const asy = 3.5 + Math.sin(archAngle) * 0.6;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.2, 0.4),
        stonePropMat,
      );
      block.position.set(asx, asy, archZ);
      block.rotation.z = -archAngle + Math.PI / 2;
      this._props.add(block);
    }
    // Keystone
    const keystone = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.25, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.5, metalness: 0.2 }),
    );
    keystone.position.set(archX, 4.1, archZ);
    this._props.add(keystone);

    // Pillar bases for archway
    for (const apx of [archX - 1.0, archX + 1.0]) {
      const archBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.2, 0.55),
        stonePropMat,
      );
      archBase.position.set(apx, 0.1, archZ);
      this._props.add(archBase);
    }

    // Volumetric light cones from chandelier and torches
    this._scene.addLightCone(0, 5.0, -1.5, 4.5, 1.2, 0xffeebb);
  }

  /** Spawn floating dust motes (shared by courtyard and throne room) */
  private _buildDustMotes(): void {
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions: number[] = [];
    const dustSizes: number[] = [];
    for (let i = 0; i < 120; i++) {
      dustPositions.push(
        (Math.random() - 0.5) * 14,
        0.2 + Math.random() * 4.5,
        (Math.random() - 0.5) * 12,
      );
      dustSizes.push(0.02 + Math.random() * 0.04);
    }
    dustGeo.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute("size", new THREE.Float32BufferAttribute(dustSizes, 1));

    const dustMat = new THREE.PointsMaterial({
      color: 0xddccaa,
      size: 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.25,
    });
    const dustMotes = new THREE.Points(dustGeo, dustMat);
    this._scene.scene.add(dustMotes);
  }

  /** Spawn floating ember particles for the underground pit */
  private _buildPitEmbers(): void {
    const emberGeo = new THREE.BufferGeometry();
    const emberPositions: number[] = [];
    for (let i = 0; i < 80; i++) {
      emberPositions.push(
        (Math.random() - 0.5) * 10,
        0.1 + Math.random() * 3.5,
        (Math.random() - 0.5) * 8,
      );
    }
    emberGeo.setAttribute("position", new THREE.Float32BufferAttribute(emberPositions, 3));

    const emberMat = new THREE.PointsMaterial({
      color: 0xff6622,
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
    });
    const embers = new THREE.Points(emberGeo, emberMat);
    this._scene.scene.add(embers);

    // Second layer of dimmer, smaller embers
    const ember2Geo = new THREE.BufferGeometry();
    const ember2Positions: number[] = [];
    for (let i = 0; i < 50; i++) {
      ember2Positions.push(
        (Math.random() - 0.5) * 8,
        0.3 + Math.random() * 2.5,
        (Math.random() - 0.5) * 6,
      );
    }
    ember2Geo.setAttribute("position", new THREE.Float32BufferAttribute(ember2Positions, 3));

    const ember2Mat = new THREE.PointsMaterial({
      color: 0xff4400,
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.35,
    });
    const embers2 = new THREE.Points(ember2Geo, ember2Mat);
    this._scene.scene.add(embers2);
  }

  /** Add volumetric light shafts for the throne room (god rays from stained glass) */
  private _buildThroneLightShafts(): void {
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;
    const windowColors = [0x4466cc, 0xcc4444, 0x44aa44, 0xcc8844];

    for (const side of [-1, 1]) {
      for (let w = 0; w < 4; w++) {
        const wz = -floorD / 2 + 2.5 + w * (floorD / 4);
        const color = windowColors[(w + (side > 0 ? 2 : 0)) % windowColors.length];

        // Light shaft cone from each window
        const shaftGeo = new THREE.CylinderGeometry(0.1, 0.8, 4.5, 8, 1, true);
        const shaftMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.025,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        // Position from window, angled down toward floor
        shaft.position.set(
          side * (TB.STAGE_HALF_WIDTH + 0.5),
          2.0,
          wz,
        );
        shaft.rotation.z = side * 0.6; // angle toward center
        this._props.add(shaft);
      }
    }

    // Volumetric cones from chandeliers
    this._scene.addLightCone(0, 5.5, -1.5, 5.0, 1.0, 0xffeebb);
    this._scene.addLightCone(-3, 5.5, -3, 4.5, 0.8, 0xffeebb);
    this._scene.addLightCone(3, 5.5, -3, 4.5, 0.8, 0xffeebb);
  }

  /* ================================================================== */
  /*  NEW ARENAS (10 additional stages)                                   */
  /* ================================================================== */

  // ── VOLCANIC FORGE ─────────────────────────────────────────────────────

  private _buildVolcanicForge(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x1a0800, 0.05);
    this._scene.scene.background = new THREE.Color(0x1a0800);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Cracked lava stone floor
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#2a1a10";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512, y = Math.random() * 512;
      ctx.fillStyle = `rgba(${60+Math.random()*40},${20+Math.random()*20},${5+Math.random()*10},0.6)`;
      ctx.fillRect(x, y, 3+Math.random()*8, 2+Math.random()*5);
    }
    // Lava cracks
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(${200+Math.random()*55},${50+Math.random()*80},0,${0.3+Math.random()*0.5})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      const sx = Math.random() * 512, sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      for (let s = 0; s < 4; s++) ctx.lineTo(sx + (Math.random()-0.5)*60, sy + (Math.random()-0.5)*60);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.15 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Lava pools on edges (emissive)
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 2.0,
      transparent: true, opacity: 0.8,
    });
    for (const side of [-1, 1]) {
      const lavaPool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), lavaMat);
      lavaPool.rotation.x = -Math.PI / 2;
      lavaPool.position.set(side * (floorW / 2 + 1), -0.05, -1);
      this._props.add(lavaPool);
    }

    // Anvils and forge equipment
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.8 });
    for (const z of [-3, -5]) {
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.3), ironMat);
      anvil.position.set(-2 + Math.random() * 4, 0.2, z);
      anvil.castShadow = true;
      this._props.add(anvil);
    }

    // Rock walls with lava glow
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9, metalness: 0.1 });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4, floorD + 2), rockMat);
      wall.position.set(side * (floorW / 2 + 1), 2, 0);
      wall.castShadow = true;
      this._props.add(wall);
    }

    // Fire braziers
    this._addFirePit(-4, 0, 0);
    this._addFirePit(4, 0, 0);

    // Spectators (forge workers)
    for (let i = 0; i < 8; i++) {
      const sx = -3 + i * 0.8;
      this._addSpectatorFigure(sx, 0.1, -4, [0x553322, 0x443322, 0x664433], [0xd4a574, 0xc49464]);
    }

    // Embers particle effect
    this._buildPitEmbers();
    this._buildWallBarriers();
  }

  // ── FOREST CLEARING ────────────────────────────────────────────────────

  private _buildForestClearing(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x0a1408, 0.035);
    this._scene.scene.background = new THREE.Color(0x1a2a18);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Grass/dirt floor
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#3a4a2a";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 512, y = Math.random() * 512;
      const g = 40 + Math.random() * 40;
      ctx.fillStyle = `rgba(${g*0.6},${g},${g*0.3},0.5)`;
      ctx.fillRect(x, y, 1+Math.random()*3, 3+Math.random()*8);
    }
    // Dirt patches
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(${80+Math.random()*30},${60+Math.random()*20},${40+Math.random()*15},0.4)`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*512, Math.random()*512, 10+Math.random()*20, 5+Math.random()*10, Math.random()*Math.PI, 0, Math.PI*2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Trees (trunks + canopy)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.8 });
    const treePositions = [
      [-6, -3], [-7, -5], [6, -3], [7, -5],
      [-5, -6], [5, -6], [-8, -1], [8, -1],
      [-6, 2], [6, 2],
    ];
    for (const [tx, tz] of treePositions) {
      const h = 3 + Math.random() * 2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h, 8), trunkMat);
      trunk.position.set(tx, h / 2, tz);
      trunk.castShadow = true;
      this._props.add(trunk);
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random() * 0.5, 8, 6), leafMat);
      canopy.position.set(tx, h + 0.5, tz);
      canopy.castShadow = true;
      this._props.add(canopy);
    }

    // Mushrooms and rocks as small details
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.85 });
    for (let i = 0; i < 8; i++) {
      const rock = new THREE.Mesh(
        new THREE.SphereGeometry(0.15 + Math.random() * 0.2, 12, 10),
        rockMat,
      );
      rock.position.set(
        (Math.random() - 0.5) * floorW * 0.8,
        0.1,
        -3 - Math.random() * 4,
      );
      rock.scale.set(1 + Math.random() * 0.5, 0.5 + Math.random() * 0.3, 1 + Math.random() * 0.5);
      this._props.add(rock);
    }

    // Spectators (villagers)
    for (let i = 0; i < 10; i++) {
      const sx = -4 + i * 0.8;
      this._addSpectatorFigure(sx, 0.1, -5, [0x556633, 0x665544, 0x887766], [0xd4a574, 0xe0b888]);
    }

    this._buildWallBarriers();
  }

  // ── FROZEN LAKE ────────────────────────────────────────────────────────

  private _buildFrozenLake(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x0a1020, 0.03);
    this._scene.scene.background = new THREE.Color(0x0a1020);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Ice floor (semi-transparent, reflective)
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#8899aa";
    ctx.fillRect(0, 0, 512, 512);
    // Ice cracks
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(${180+Math.random()*75},${200+Math.random()*55},${220+Math.random()*35},${0.3+Math.random()*0.4})`;
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      const sx = Math.random() * 512, sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      for (let s = 0; s < 5; s++) ctx.lineTo(sx + (Math.random()-0.5)*80, sy + (Math.random()-0.5)*80);
      ctx.stroke();
    }
    // Frost patches
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(200,220,240,${0.1+Math.random()*0.15})`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*512, Math.random()*512, 5+Math.random()*15, 3+Math.random()*8, 0, 0, Math.PI*2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.15, metalness: 0.3 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Snow banks around edges
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xddddee, roughness: 0.9 });
    for (const side of [-1, 1]) {
      const bank = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.6, floorD + 2),
        snowMat,
      );
      bank.position.set(side * (floorW / 2 + 1), 0.3, 0);
      this._props.add(bank);
    }

    // Icicle pillars
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xaaccee, roughness: 0.1, metalness: 0.2,
      transparent: true, opacity: 0.7,
    });
    for (const pos of [[-5, -4], [5, -4], [-3, -6], [3, -6]] as [number, number][]) {
      const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.2, 2.5, 12), iceMat);
      icicle.position.set(pos[0], 1.25, pos[1]);
      icicle.castShadow = true;
      this._props.add(icicle);
    }

    // Spectators in winter gear
    for (let i = 0; i < 8; i++) {
      this._addSpectatorFigure(-3 + i * 0.8, 0.1, -5, [0x445566, 0x556677, 0x667788], [0xd4a574, 0xe0b888]);
    }

    this._buildWallBarriers();
  }

  // ── ANCIENT DOJO ───────────────────────────────────────────────────────

  private _buildAncientDojo(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x0a0808, 0.025);
    this._scene.scene.background = new THREE.Color(0x0a0808);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Polished wooden floor
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#5a4530";
    ctx.fillRect(0, 0, 512, 512);
    // Wood grain
    for (let i = 0; i < 150; i++) {
      const y = Math.random() * 512;
      ctx.strokeStyle = `rgba(${70+Math.random()*30},${50+Math.random()*25},${30+Math.random()*15},0.3)`;
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + (Math.random()-0.5)*20);
      ctx.stroke();
    }
    // Plank separators
    for (let x = 0; x < 512; x += 64) {
      ctx.strokeStyle = "#3a2a1a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Wooden pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.7 });
    for (const side of [-1, 1]) {
      for (const zp of [-2, 2]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 8), pillarMat);
        pillar.position.set(side * (floorW / 2 + 0.3), 2, zp);
        pillar.castShadow = true;
        this._props.add(pillar);
      }
    }

    // Paper sliding walls (shoji screens)
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0xeeddcc, roughness: 0.9, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(floorW + 1, 4), screenMat);
    backWall.position.set(0, 2, -floorD / 2 - 0.5);
    this._props.add(backWall);

    // Grid lines on shoji
    const gridMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 });
    for (let x = -5; x <= 5; x += 1) {
      const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 4, 0.01), gridMat);
      vLine.position.set(x, 2, -floorD / 2 - 0.49);
      this._props.add(vLine);
    }
    for (let y = 0.5; y < 4; y += 0.8) {
      const hLine = new THREE.Mesh(new THREE.BoxGeometry(floorW + 1, 0.02, 0.01), gridMat);
      hLine.position.set(0, y, -floorD / 2 - 0.49);
      this._props.add(hLine);
    }

    // Weapon rack
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.7 });
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.15), rackMat);
    rack.position.set(-4, 1.5, -floorD / 2 + 0.5);
    this._props.add(rack);

    // Lanterns
    for (const side of [-1, 1]) {
      this._addWallTorch(side * (floorW / 2 + 0.2), 2.5, -2);
      this._addWallTorch(side * (floorW / 2 + 0.2), 2.5, 2);
    }

    // Spectators (martial artists)
    for (let i = 0; i < 6; i++) {
      this._addSpectatorFigure(-2 + i * 0.7, 0.1, -4.5, [0xdd8822, 0xcc7711, 0xeeddcc], [0xf0d0b0, 0xd4a574]);
    }

    this._buildWallBarriers();
  }

  // ── RUINED CATHEDRAL ───────────────────────────────────────────────────

  private _buildRuinedCathedral(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x0a0810, 0.04);
    this._scene.scene.background = new THREE.Color(0x0a0810);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Cracked marble floor
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#4a4048";
    ctx.fillRect(0, 0, 512, 512);
    // Marble veins
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(${80+Math.random()*40},${70+Math.random()*30},${90+Math.random()*40},0.3)`;
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      const sx = Math.random() * 512, sy = Math.random() * 512;
      ctx.moveTo(sx, sy);
      for (let s = 0; s < 3; s++) ctx.lineTo(sx + (Math.random()-0.5)*100, sy + (Math.random()-0.5)*100);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.15 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Broken stone columns
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6a6068, roughness: 0.8, metalness: 0.1 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const h = 2 + Math.random() * 2; // varying heights (broken)
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, h, 10), stoneMat);
        col.position.set(side * (floorW / 2 + 0.5), h / 2, -2 + i * 2.5);
        col.castShadow = true;
        this._props.add(col);
      }
    }

    // Stained glass remnants (colorful planes on back wall)
    const glassColors = [0x4466cc, 0xcc4444, 0x44aa44, 0xcc8844, 0x8844cc];
    for (let i = 0; i < 3; i++) {
      const glassMat = new THREE.MeshStandardMaterial({
        color: glassColors[i], emissive: glassColors[i], emissiveIntensity: 0.3,
        transparent: true, opacity: 0.5, side: THREE.DoubleSide,
      });
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.6, 8), glassMat);
      glass.position.set(-2 + i * 2, 3.5, -floorD / 2 - 0.3);
      this._props.add(glass);
    }

    // Altar (back center)
    const altarMat = new THREE.MeshStandardMaterial({ color: 0x5a5060, roughness: 0.7, metalness: 0.2 });
    const altar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.8), altarMat);
    altar.position.set(0, 0.4, -floorD / 2 + 1);
    altar.castShadow = true;
    this._props.add(altar);

    // Candles on altar
    for (const cx of [-0.4, 0, 0.4]) {
      this._addFirePit(cx, 0.8, -floorD / 2 + 1);
    }

    // Spectators
    for (let i = 0; i < 8; i++) {
      this._addSpectatorFigure(-3 + i * 0.8, 0.1, -5, [0x443355, 0x554466, 0x332244], [0xd4a574, 0xe0b888]);
    }

    this._buildWallBarriers();
  }

  // ── DESERT MARKETPLACE ─────────────────────────────────────────────────

  private _buildDesertMarketplace(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x1a1408, 0.03);
    this._scene.scene.background = new THREE.Color(0x2a2010);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Sandy stone floor
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#8a7a5a";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 300; i++) {
      const b = 120 + Math.random() * 40;
      ctx.fillStyle = `rgba(${b},${b*0.85},${b*0.6},0.4)`;
      ctx.fillRect(Math.random()*512, Math.random()*512, 2+Math.random()*6, 1+Math.random()*4);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Market stalls
    const clothColors = [0xcc4444, 0x4466cc, 0xccaa22, 0x44aa44, 0xcc6622];
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const z = -3 - i * 1.5;
      const x = (i % 2 === 0 ? -1 : 1) * (3 + Math.random());
      // Stall frame
      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 10), woodMat);
      post1.position.set(x - 0.5, 1.25, z); this._props.add(post1);
      const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 10), woodMat);
      post2.position.set(x + 0.5, 1.25, z); this._props.add(post2);
      // Cloth canopy
      const canopyMat = new THREE.MeshStandardMaterial({
        color: clothColors[i % clothColors.length], roughness: 0.8, side: THREE.DoubleSide,
      });
      const canopy = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), canopyMat);
      canopy.position.set(x, 2.5, z);
      canopy.rotation.x = -0.2;
      this._props.add(canopy);
    }

    // Clay pots
    const clayMat = new THREE.MeshStandardMaterial({ color: 0xaa7744, roughness: 0.75 });
    for (let i = 0; i < 6; i++) {
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 12, 10), clayMat);
      pot.position.set(-4 + Math.random() * 8, 0.1, -3 - Math.random() * 3);
      pot.scale.y = 1.2;
      this._props.add(pot);
    }

    this._addFirePit(5, 0, 0);

    // Spectators (merchants, buyers)
    for (let i = 0; i < 12; i++) {
      this._addSpectatorFigure(-5 + i * 0.85, 0.1, -4.5, [0x886644, 0xaa8855, 0xcc9966, 0xeeddcc], [0xd4a574, 0xc49464, 0xa07050]);
    }

    this._buildWallBarriers();
  }

  // ── HARBOR DOCKS ───────────────────────────────────────────────────────

  private _buildHarborDocks(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x0a0e14, 0.04);
    this._scene.scene.background = new THREE.Color(0x0a1018);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Wooden dock planks
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#4a3a28";
    ctx.fillRect(0, 0, 512, 512);
    // Planks
    for (let y = 0; y < 512; y += 32) {
      const shade = 60 + Math.random() * 20;
      ctx.fillStyle = `rgb(${shade+10},${shade-5},${shade-15})`;
      ctx.fillRect(0, y, 512, 30);
      ctx.strokeStyle = "#2a1a10";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
      // Nail marks
      for (let nx = 30; nx < 512; nx += 60) {
        ctx.fillStyle = "#3a3a3a";
        ctx.beginPath();
        ctx.arc(nx, y + 15, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Water below (visible at edges)
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x224466, emissive: 0x112233, emissiveIntensity: 0.3,
      roughness: 0.2, metalness: 0.3,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(floorW + 10, floorD + 10), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.3;
    this._props.add(water);

    // Dock posts and rope
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.8 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 12), postMat);
        post.position.set(side * (floorW / 2 + 0.3), 0.75, -3 + i * 2);
        post.castShadow = true;
        this._props.add(post);
      }
    }

    // Crates and barrels
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 0.8 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x6a4a1a, roughness: 0.75 });
    for (let i = 0; i < 4; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), crateMat);
      crate.position.set(-4 + Math.random() * 2, 0.25, -4 - Math.random() * 2);
      crate.rotation.y = Math.random();
      crate.castShadow = true;
      this._props.add(crate);
    }
    for (let i = 0; i < 3; i++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8), barrelMat);
      barrel.position.set(3 + Math.random(), 0.3, -3 - Math.random() * 2);
      barrel.castShadow = true;
      this._props.add(barrel);
    }

    // Ship mast in background
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.75 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 8, 12), mastMat);
    mast.position.set(6, 4, -6);
    mast.castShadow = true;
    this._props.add(mast);

    // Lanterns
    this._addWallTorch(-5, 2, -2);
    this._addWallTorch(5, 2, -2);

    // Spectators (sailors, dockworkers)
    for (let i = 0; i < 10; i++) {
      this._addSpectatorFigure(-4 + i * 0.85, 0.1, -4.5, [0x334455, 0x445566, 0x556677, 0x887766], [0xd4a574, 0xc49464]);
    }

    this._buildWallBarriers();
  }

  // ── DARK DUNGEON ───────────────────────────────────────────────────────

  private _buildDarkDungeon(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x050505, 0.07);
    this._scene.scene.background = new THREE.Color(0x050505);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Dank stone floor
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 200; i++) {
      const b = 20 + Math.random() * 20;
      ctx.fillStyle = `rgba(${b},${b},${b},0.5)`;
      ctx.fillRect(Math.random()*512, Math.random()*512, 3+Math.random()*8, 2+Math.random()*6);
    }
    // Moss/mold patches
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = `rgba(30,${50+Math.random()*30},20,0.3)`;
      ctx.beginPath();
      ctx.ellipse(Math.random()*512, Math.random()*512, 8+Math.random()*15, 4+Math.random()*8, 0, 0, Math.PI*2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Low stone ceiling
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(floorW + 2, floorD + 2), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.5;
    this._props.add(ceil);

    // Stone walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.85, metalness: 0.05 });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.5, floorD + 2), wallMat);
      wall.position.set(side * (floorW / 2 + 0.5), 1.75, 0);
      this._props.add(wall);
    }
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(floorW + 2, 3.5, 0.5), wallMat);
    backWall.position.set(0, 1.75, -floorD / 2 - 0.5);
    this._props.add(backWall);

    // Chains hanging from ceiling
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.4, metalness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1 + Math.random(), 4), chainMat);
      chain.position.set(-3 + Math.random() * 6, 3 - Math.random() * 0.5, -2 - Math.random() * 3);
      this._props.add(chain);
    }

    // Skull props
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), boneMat);
      skull.position.set(-2 + Math.random() * 4, 0.08, -4 - Math.random() * 2);
      skull.scale.set(1, 0.8, 1);
      this._props.add(skull);
    }

    // Torches (sparse lighting)
    this._addWallTorch(-4, 2, -1);
    this._addWallTorch(4, 2, -1);
    this._addFirePit(0, 0, -2);

    this._buildWallBarriers();
  }

  // ── MOUNTAIN PEAK ──────────────────────────────────────────────────────

  private _buildMountainPeak(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x889aaa, 0.05);
    this._scene.scene.background = new THREE.Color(0x4466aa);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Rocky mountain platform
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#5a5a5a";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 300; i++) {
      const b = 70 + Math.random() * 40;
      ctx.fillStyle = `rgba(${b},${b},${b},0.5)`;
      ctx.fillRect(Math.random()*512, Math.random()*512, 3+Math.random()*10, 2+Math.random()*6);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Rock formations around edges
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.85 });
    for (let i = 0; i < 8; i++) {
      const rock = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 12, 10),
        rockMat,
      );
      const angle = (i / 8) * Math.PI * 2;
      rock.position.set(
        Math.cos(angle) * (floorW / 2 + 1),
        0.2,
        Math.sin(angle) * (floorD / 2 + 0.5) - 1,
      );
      rock.scale.set(1 + Math.random() * 0.5, 0.4 + Math.random() * 0.3, 1 + Math.random() * 0.5);
      this._props.add(rock);
    }

    // Distant mountain peaks (background)
    const mtMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 2, 6 + Math.random() * 4, 6), mtMat);
      peak.position.set(-8 + i * 4, -2, -12 - Math.random() * 5);
      this._props.add(peak);
    }

    // Snow cap on distant peaks
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.7 });
    for (let i = 0; i < 5; i++) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8 + Math.random() * 0.5, 1.5, 6), snowMat);
      cap.position.set(-8 + i * 4, 3 + Math.random() * 2, -12 - Math.random() * 5);
      this._props.add(cap);
    }

    // Wind-blown clouds (flat planes)
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 6; i++) {
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(4 + Math.random() * 3, 0.5 + Math.random() * 0.5), cloudMat);
      cloud.position.set(-6 + Math.random() * 12, 4 + Math.random() * 3, -8 - Math.random() * 5);
      cloud.rotation.x = -0.3;
      this._props.add(cloud);
    }

    this._buildWallBarriers();
  }

  // ── HAUNTED GRAVEYARD ──────────────────────────────────────────────────

  private _buildHauntedGraveyard(): void {
    this._scene.scene.fog = new THREE.FogExp2(0x0a0e0a, 0.06);
    this._scene.scene.background = new THREE.Color(0x0a0e0a);

    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // Muddy graveyard floor
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#2a2a28";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 250; i++) {
      const b = 30 + Math.random() * 25;
      ctx.fillStyle = `rgba(${b+5},${b},${b-5},0.5)`;
      ctx.fillRect(Math.random()*512, Math.random()*512, 2+Math.random()*5, 1+Math.random()*4);
    }
    // Grass tufts
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(${30+Math.random()*20},${50+Math.random()*30},${20+Math.random()*15},0.3)`;
      ctx.fillRect(Math.random()*512, Math.random()*512, 1+Math.random()*2, 3+Math.random()*6);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._floorGroup.add(floor);

    // Gravestones
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a5a55, roughness: 0.85 });
    const gravePositions = [
      [-5, -3], [-4, -5], [-2, -4], [0, -5.5], [2, -4], [4, -5], [5, -3],
      [-3, -6.5], [1, -6.5], [3, -6.5],
    ];
    for (const [gx, gz] of gravePositions) {
      const h = 0.5 + Math.random() * 0.5;
      const grave = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, 0.08), stoneMat);
      grave.position.set(gx + (Math.random()-0.5)*0.3, h / 2, gz);
      grave.rotation.z = (Math.random() - 0.5) * 0.15; // slightly tilted
      grave.castShadow = true;
      this._props.add(grave);
      // Rounded top
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4, 0, Math.PI*2, 0, Math.PI*0.5), stoneMat);
      top.position.set(gx + (Math.random()-0.5)*0.3, h, gz);
      top.scale.set(1, 0.6, 0.4);
      this._props.add(top);
    }

    // Dead trees
    const deadTreeMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
    for (const [tx, tz] of [[-6, -4], [6, -4], [-7, -6], [7, -6]] as [number, number][]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 3, 12), deadTreeMat);
      trunk.position.set(tx, 1.5, tz);
      trunk.castShadow = true;
      this._props.add(trunk);
      // Bare branches
      for (let b = 0; b < 3; b++) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 1 + Math.random(), 4), deadTreeMat);
        branch.position.set(tx, 2.5 + b * 0.3, tz);
        branch.rotation.z = (Math.random() - 0.5) * 1.5;
        branch.rotation.x = (Math.random() - 0.5) * 0.5;
        this._props.add(branch);
      }
    }

    // Ghostly mist (ground-level transparent planes)
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x44ff88, transparent: true, opacity: 0.04,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    for (let i = 0; i < 8; i++) {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(3 + Math.random() * 2, 0.5), mistMat);
      mist.position.set(-4 + Math.random() * 8, 0.2 + Math.random() * 0.3, -2 - Math.random() * 5);
      mist.rotation.x = -Math.PI / 2 + (Math.random()-0.5)*0.3;
      this._props.add(mist);
    }

    // Eerie green fire
    this._addFirePit(-5, 0, 0);
    this._addFirePit(5, 0, 0);

    // Spectators (shadowy figures)
    for (let i = 0; i < 6; i++) {
      this._addSpectatorFigure(-2 + i * 0.7, 0.1, -7, [0x222222, 0x1a1a1a, 0x333333], [0x998877, 0x887766]);
    }

    this._buildWallBarriers();
  }

  /* ================================================================== */
  /*  WALL GLOW (shared by all arenas)                                    */
  /* ================================================================== */

  /** Update wall visibility and cage bar glow based on fighter positions */
  updateWalls(f1x: number, f2x: number): void {
    for (let i = 0; i < this._wallBarriers.length; i++) {
      const wall = this._wallBarriers[i];
      const mat = wall.material as THREE.MeshStandardMaterial;
      const wallX = wall.position.x;
      const dist1 = Math.abs(f1x - wallX);
      const dist2 = Math.abs(f2x - wallX);
      const minDist = Math.min(dist1, dist2);

      const glow = Math.max(0, 1 - minDist) * 0.6;
      mat.opacity = glow;
      mat.emissiveIntensity = glow * 2;

      if (this._cageBars[i]) {
        for (const bar of this._cageBars[i]) {
          const bMat = bar.material as THREE.MeshStandardMaterial;
          bMat.emissiveIntensity = glow * 1.5;
        }
      }
    }
  }

  /* ================================================================== */
  /*  STAGE HAZARDS                                                       */
  /* ================================================================== */

  /** Build visual representations for stage hazards */
  buildHazards(hazards: StageHazard[]): void {
    // Clean up old hazard visuals
    for (const hv of this._hazardVisuals) {
      hv.group.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) obj.material.dispose();
        }
      });
      this._scene.scene.remove(hv.group);
    }
    this._hazardVisuals = [];

    for (const hazard of hazards) {
      const group = new THREE.Group();
      group.position.set(hazard.position.x, hazard.position.y, hazard.position.z);
      const animMeshes: THREE.Mesh[] = [];

      switch (hazard.type) {
        case "fire_brazier": {
          // Iron brazier base
          const brazierMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 });
          const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.35, 20), brazierMat);
          basin.position.y = 0.175;
          group.add(basin);
          // Fire glow sphere
          const fireMat = new THREE.MeshStandardMaterial({
            color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 3.0,
            transparent: true, opacity: 0.8,
          });
          const fire = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), fireMat);
          fire.position.y = 0.4;
          group.add(fire);
          animMeshes.push(fire);
          break;
        }
        case "acid_patch": {
          // Glowing green puddle on the floor
          const acidMat = new THREE.MeshStandardMaterial({
            color: 0x33ff33, emissive: 0x22aa22, emissiveIntensity: 1.5,
            transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false,
          });
          const acidPatch = new THREE.Mesh(new THREE.CircleGeometry(hazard.radius, 16), acidMat);
          acidPatch.rotation.x = -Math.PI / 2;
          acidPatch.position.y = 0.005;
          group.add(acidPatch);
          animMeshes.push(acidPatch);
          break;
        }
        case "breakable_pillar": {
          // Stone pillar
          const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6a6060, roughness: 0.8, metalness: 0.1 });
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.8, 8), pillarMat);
          pillar.position.y = 0.9;
          group.add(pillar);
          // Pillar cap
          const capMat = new THREE.MeshStandardMaterial({ color: 0x8a7a60, roughness: 0.6, metalness: 0.2 });
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.12, 8), capMat);
          cap.position.y = 1.8;
          group.add(cap);
          animMeshes.push(pillar);
          break;
        }
      }

      this._scene.scene.add(group);
      this._hazardVisuals.push({ id: hazard.id, group, type: hazard.type, animMeshes });
    }
  }

  /** Update hazard visuals each frame (pulsing, glowing) */
  updateHazards(hazards: StageHazard[]): void {
    const time = Date.now() * 0.001;
    for (const hv of this._hazardVisuals) {
      const hazardState = hazards.find(h => h.id === hv.id);
      if (!hazardState || hazardState.broken || !hazardState.active) {
        hv.group.visible = false;
        continue;
      }
      hv.group.visible = true;

      switch (hv.type) {
        case "fire_brazier":
          for (const mesh of hv.animMeshes) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 2.5 + Math.sin(time * 8) * 0.8;
            mesh.position.y = 0.4 + Math.sin(time * 6) * 0.02;
            mesh.scale.setScalar(1.0 + Math.sin(time * 10) * 0.1);
          }
          break;
        case "acid_patch":
          for (const mesh of hv.animMeshes) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.opacity = 0.5 + Math.sin(time * 3) * 0.15;
            mat.emissiveIntensity = 1.2 + Math.sin(time * 4) * 0.4;
          }
          break;
        case "breakable_pillar":
          // Pillars are static, no animation needed
          break;
      }
    }
  }

  /** Remove a hazard's visual (e.g. when a pillar breaks) */
  breakHazard(hazardId: string): void {
    const hv = this._hazardVisuals.find(h => h.id === hazardId);
    if (hv) {
      hv.group.visible = false;
    }
  }

  /* ================================================================== */
  /*  DISPOSE                                                             */
  /* ================================================================== */
  dispose(): void {
    const disposeMesh = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        } else if (Array.isArray(obj.material)) {
          for (const m of obj.material) m.dispose();
        }
      }
      if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    };

    this._floorGroup.traverse(disposeMesh);
    this._spectatorGroup.traverse(disposeMesh);
    this._props.traverse(disposeMesh);
    this._spectatorAnims = [];
  }
}
