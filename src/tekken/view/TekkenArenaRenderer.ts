import * as THREE from "three";
import type { TekkenSceneManager } from "./TekkenSceneManager";
import { TB } from "../config/TekkenBalanceConfig";

interface SpectatorAnim {
  mesh: THREE.Mesh;
  baseY: number;
  animTimer: number;
  animType: "idle" | "cheer" | "gasp";
}

export class TekkenArenaRenderer {
  private _scene: TekkenSceneManager;
  private _floorGroup: THREE.Group;
  private _wallBarriers: THREE.Mesh[] = [];
  private _cageBars: THREE.Mesh[][] = []; // bars per side for glow effect
  private _spectatorGroup: THREE.Group;
  private _props: THREE.Group;
  private _spectatorAnims: SpectatorAnim[] = [];

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
      new THREE.CylinderGeometry(bodyW - 0.02, bodyW, bodyH, 6),
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
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.07 + Math.random() * 0.02, 6, 5),
      new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.7 }),
    );
    head.position.set(sx, sy + bodyH + 0.08, sz);
    this._spectatorGroup.add(head);
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
        new THREE.SphereGeometry(0.12 - f * 0.02, 6, 4),
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
      new THREE.CylinderGeometry(0.06, 0.04, 0.1, 8),
      ironMat,
    );
    cup.position.set(tx, ty - 0.05, tz);
    this._props.add(cup);

    // Torch handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.35, 6),
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
        new THREE.SphereGeometry(0.06 - f * 0.012, 6, 4),
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
  }

  private _buildCourtyardFloor(): void {
    const floorW = TB.STAGE_HALF_WIDTH * 2 + 2;
    const floorD = TB.STAGE_HALF_DEPTH * 2 + 4;

    // --- High-res procedural stone texture (1024x1024) ---
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    const S = 1024;

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
        for (let i = 0; i < 35; i++) {
          const gx = x + Math.random() * (tileSize - 4);
          const gy = y + Math.random() * (tileSize - 4);
          const gb = r + Math.floor(Math.random() * 20 - 10);
          ctx.fillStyle = `rgba(${gb},${gb - 3},${gb - 6},0.5)`;
          ctx.fillRect(gx, gy, 1 + Math.random() * 4, 1 + Math.random() * 2);
        }

        // Cracks and weathering
        if (Math.random() < 0.3) {
          ctx.strokeStyle = `rgba(20,15,10,${0.3 + Math.random() * 0.4})`;
          ctx.lineWidth = 0.8 + Math.random() * 0.8;
          ctx.beginPath();
          const cx = x + 8 + Math.random() * (tileSize - 16);
          const cy = y + 8 + Math.random() * (tileSize - 16);
          ctx.moveTo(cx, cy);
          const segments = 2 + Math.floor(Math.random() * 4);
          for (let s = 0; s < segments; s++) {
            ctx.lineTo(
              cx + (Math.random() - 0.5) * 30,
              cy + (Math.random() - 0.5) * 30,
            );
          }
          ctx.stroke();
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
          new THREE.CylinderGeometry(0.25, 0.3, 4.0, 12),
          pillarMat,
        );
        pillar.position.set(xBase, 2.0, zPos);
        pillar.castShadow = true;
        this._props.add(pillar);

        for (let r = 0; r < 4; r++) {
          const groove = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.02, 6, 16),
            capitalMat,
          );
          groove.position.set(xBase, 0.8 + r * 0.9, zPos);
          groove.rotation.x = Math.PI / 2;
          this._props.add(groove);
        }

        const capital = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.25, 0.3, 12),
          capitalMat,
        );
        capital.position.set(xBase, 4.15, zPos);
        capital.castShadow = true;
        this._props.add(capital);

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.2, 0.65),
          pillarMat,
        );
        base.position.set(xBase, 0.1, zPos);
        base.castShadow = true;
        this._props.add(base);
      }

      // Iron cage bars
      const zStart = -floorD / 2 + 0.4;
      const zEnd = floorD / 2 - 0.4;
      const barSpacing = 0.35;
      const barCount = Math.floor((zEnd - zStart) / barSpacing);

      for (let i = 1; i < barCount; i++) {
        const bz = zStart + i * barSpacing;
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 3.8, 6),
          barMat.clone(),
        );
        bar.position.set(xBase, 1.9, bz);
        bar.castShadow = true;
        this._props.add(bar);
        sideBars.push(bar);
      }

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

      // Spectators
      const spacing = 0.55;
      const count = Math.floor(rowWidth / spacing);
      for (let i = 0; i < count; i++) {
        const sx = -rowWidth / 2 + spacing * 0.5 + i * spacing + (Math.random() - 0.5) * 0.12;
        this._addSpectatorFigure(sx, y + 0.1, z);
      }
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
        new THREE.CylinderGeometry(0.1, 0.12, 0.55, 6),
        new THREE.MeshStandardMaterial({ color: 0x8a2020 + n * 0x001500, roughness: 0.5 }),
      );
      nobleBody.position.set(nx, nbY + 0.4, nbZ);
      this._spectatorGroup.add(nobleBody);
      this._registerSpectator(nobleBody);

      const nobleHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 5),
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
          new THREE.CylinderGeometry(0.015, 0.015, 2.2, 4),
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
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, 1.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -0.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -2.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -4.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, 1.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -0.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -2.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -4.5],
      [0, 3.8, -7],
      [0, 3.8, -9.5],
    ];

    for (const [tx, ty, tz] of torchPositions) {
      this._addWallTorch(tx, ty, tz);
    }
  }

  private _buildCourtyardChandelier(): void {
    const chanY = 5.0;
    const chanZ = -1.5;
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.75 });

    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 3.0, 4),
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
        new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4),
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
        new THREE.CylinderGeometry(0.01, 0.01, 1.2, 4),
        ironMat,
      );
      const sx = 0.6 * Math.cos(angle);
      const sz = chanZ + 0.6 * Math.sin(angle);
      supportChain.position.set(sx / 2, chanY + 0.55, (sz + chanZ) / 2);
      supportChain.rotation.z = Math.atan2(0.6, 1.1) * Math.cos(angle);
      supportChain.rotation.x = Math.atan2(0.6, 1.1) * Math.sin(angle);
      this._props.add(supportChain);
    }

    const candleCount = 10;
    for (let c = 0; c < candleCount; c++) {
      const angle = (c / candleCount) * Math.PI * 2;
      const cx = 0.8 * Math.cos(angle);
      const cz = chanZ + 0.8 * Math.sin(angle);

      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.018, 0.15, 6),
        new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.9 }),
      );
      candle.position.set(cx, chanY + 0.1, cz);
      this._props.add(candle);

      const candleFlame = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 5, 4),
        new THREE.MeshStandardMaterial({
          color: 0xffcc44,
          emissive: 0xffaa00,
          emissiveIntensity: 2.5,
          transparent: true,
          opacity: 0.9,
        }),
      );
      candleFlame.position.set(cx, chanY + 0.2, cz);
      this._props.add(candleFlame);
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

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyGeo = new THREE.SphereGeometry(45, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.scene.add(sky);

    // Moon
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xeeeedd,
      emissive: 0xccccaa,
      emissiveIntensity: 0.5,
    });
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 12),
      moonMat,
    );
    moon.position.set(-15, 22, -25);
    this._scene.scene.add(moon);

    const moonGlow = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 12, 8),
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
        new THREE.ConeGeometry(m.w / 2, m.h, 4),
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
        new THREE.CylinderGeometry(0.06, 0.06, chairY, 6),
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
      new THREE.CylinderGeometry(0.12, 0.14, 0.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a1010, roughness: 0.5 }),
    );
    promoterBody.position.set(0, chairY + 0.45, chairZ);
    this._spectatorGroup.add(promoterBody);
    this._registerSpectator(promoterBody);

    const promoterHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 5),
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
        new THREE.SphereGeometry(0.08, 6, 5),
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
          new THREE.SphereGeometry(0.02, 4, 3),
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
        new THREE.CylinderGeometry(0.01, 0.01, chainLen, 4),
        ironMat,
      );
      chain.position.set(cx, 5.0 - chainLen / 2, cz);
      this._props.add(chain);

      // Chain links (small torus segments)
      const linkCount = Math.floor(chainLen / 0.15);
      for (let l = 0; l < linkCount; l++) {
        const link = new THREE.Mesh(
          new THREE.TorusGeometry(0.025, 0.006, 4, 6),
          ironMat,
        );
        link.position.set(cx, 5.0 - l * 0.15, cz);
        link.rotation.x = l % 2 === 0 ? 0 : Math.PI / 2;
        this._props.add(link);
      }

      // Hook or shackle at end
      if (Math.random() > 0.5) {
        const hook = new THREE.Mesh(
          new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI),
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
          new THREE.CylinderGeometry(0.2, 0.25, 6.0, 12),
          pillarMat,
        );
        pillar.position.set(xBase, 3.0, pz);
        pillar.castShadow = true;
        this._props.add(pillar);

        // Gold ring accents
        for (let r = 0; r < 6; r++) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.23, 0.015, 6, 16),
            goldTrimMat,
          );
          ring.position.set(xBase, 0.5 + r * 1.0, pz);
          ring.rotation.x = Math.PI / 2;
          this._props.add(ring);
        }

        // Ornate capital
        const capital = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.2, 0.3, 12),
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
          new THREE.ConeGeometry(0.6, 0.8, 3),
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
      new THREE.ConeGeometry(0.3, 0.5, 5),
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
      new THREE.CylinderGeometry(0.12, 0.14, 0.65, 6),
      new THREE.MeshStandardMaterial({ color: 0x6a1010, roughness: 0.5 }),
    );
    royalBody.position.set(throneX, throneY + 0.55, throneBackZ + 2.0);
    this._spectatorGroup.add(royalBody);
    this._registerSpectator(royalBody);

    const royalHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 5),
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
        new THREE.CylinderGeometry(0.012, 0.012, 2.5, 4),
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
          new THREE.CylinderGeometry(0.012, 0.015, 0.12, 6),
          new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.9 }),
        );
        candle.position.set(px, chanY + 0.08, pz);
        this._props.add(candle);

        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 5, 4),
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
          new THREE.CylinderGeometry(0.015, 0.015, 2.5, 4),
          spearMat,
        );
        spear.position.set(ax + side * 0.15, 1.25, az);
        this._props.add(spear);

        // Spear tip
        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(0.03, 0.15, 4),
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
