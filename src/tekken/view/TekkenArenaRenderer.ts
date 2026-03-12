import * as THREE from "three";
import type { TekkenSceneManager } from "./TekkenSceneManager";
import { TB } from "../config/TekkenBalanceConfig";

export class TekkenArenaRenderer {
  private _scene: TekkenSceneManager;
  private _floorGroup: THREE.Group;
  private _wallBarriers: THREE.Mesh[] = [];
  private _cageBars: THREE.Mesh[][] = []; // bars per side for glow effect
  private _spectatorGroup: THREE.Group;
  private _props: THREE.Group;

  constructor(sceneManager: TekkenSceneManager) {
    this._scene = sceneManager;
    this._floorGroup = new THREE.Group();
    this._spectatorGroup = new THREE.Group();
    this._props = new THREE.Group();
  }

  build(): void {
    this._buildFloor();
    this._buildWalls();
    this._buildSpectators();
    this._buildTorches();
    this._buildChandelier();
    this._buildSkyEnvironment();
    this._buildGroundDetails();

    this._scene.scene.add(this._floorGroup);
    this._scene.scene.add(this._spectatorGroup);
    this._scene.scene.add(this._props);
  }

  /* ------------------------------------------------------------------ */
  /*  FLOOR                                                              */
  /* ------------------------------------------------------------------ */
  private _buildFloor(): void {
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
      [58, 50, 42],  // warm brown
      [52, 48, 44],  // grey-brown
      [48, 42, 38],  // dark brown
      [55, 52, 48],  // warm grey
      [50, 45, 36],  // ochre tint
      [44, 40, 38],  // cool grey
    ];

    for (let row = 0; row < tilesPerRow; row++) {
      for (let col = 0; col < tilesPerRow; col++) {
        const offset = row % 2 === 0 ? 0 : tileSize / 2;
        const x = col * tileSize + offset;
        const y = row * tileSize;

        // Pick a random base color from the palette
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

        // Cracks and weathering (random per tile)
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

    // Outer gold ring
    ctx.strokeStyle = "#b89a4a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 220, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary brass ring
    ctx.strokeStyle = "#9a7e3c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 210, 0, Math.PI * 2);
    ctx.stroke();

    // Inner decorative ring
    ctx.strokeStyle = "#c4a855";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 195, 0, Math.PI * 2);
    ctx.stroke();

    // Ornate tick marks around the outer ring
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
    // Vertical
    ctx.beginPath();
    ctx.moveTo(cx, cy - 180);
    ctx.lineTo(cx, cy + 180);
    ctx.stroke();
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(cx - 180, cy);
    ctx.lineTo(cx + 180, cy);
    ctx.stroke();
    // Diagonals (thinner)
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

    // Front trim
    const frontTrim = new THREE.Mesh(
      new THREE.BoxGeometry(floorW + 0.2, trimH, trimD),
      trimMat,
    );
    frontTrim.position.set(0, trimH / 2, floorD / 2 + trimD / 2);
    frontTrim.castShadow = true;
    this._floorGroup.add(frontTrim);

    // Back trim
    const backTrim = frontTrim.clone();
    backTrim.position.z = -floorD / 2 - trimD / 2;
    this._floorGroup.add(backTrim);

    // Side trims
    for (const side of [-1, 1]) {
      const sideTrim = new THREE.Mesh(
        new THREE.BoxGeometry(trimD, trimH, floorD + 0.4),
        trimMat,
      );
      sideTrim.position.set(side * (floorW / 2 + trimD / 2), trimH / 2, 0);
      sideTrim.castShadow = true;
      this._floorGroup.add(sideTrim);
    }

    // Elevated platform edge (stone base under the trim)
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

  /* ------------------------------------------------------------------ */
  /*  WALLS / PILLARS / CAGE                                             */
  /* ------------------------------------------------------------------ */
  private _buildWalls(): void {
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

      // --- Two massive stone pillars per side (front & back corners) ---
      for (const zPos of [floorD / 2 - 0.4, -floorD / 2 + 0.4]) {
        // Main pillar column
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.3, 4.0, 12),
          pillarMat,
        );
        pillar.position.set(xBase, 2.0, zPos);
        pillar.castShadow = true;
        this._props.add(pillar);

        // Ring grooves carved into pillar
        for (let r = 0; r < 4; r++) {
          const groove = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.02, 6, 16),
            capitalMat,
          );
          groove.position.set(xBase, 0.8 + r * 0.9, zPos);
          groove.rotation.x = Math.PI / 2;
          this._props.add(groove);
        }

        // Capital top (wider flared top)
        const capital = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.25, 0.3, 12),
          capitalMat,
        );
        capital.position.set(xBase, 4.15, zPos);
        capital.castShadow = true;
        this._props.add(capital);

        // Square base
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.2, 0.65),
          pillarMat,
        );
        base.position.set(xBase, 0.1, zPos);
        base.castShadow = true;
        this._props.add(base);
      }

      // --- Iron cage bars between the two pillars ---
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

      // Horizontal cross bars (top and middle)
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

      // Invisible wall for glow logic (kept for updateWalls compatibility)
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

  /** Update wall visibility and cage bar glow based on fighter positions */
  updateWalls(f1x: number, f2x: number): void {
    for (let i = 0; i < this._wallBarriers.length; i++) {
      const wall = this._wallBarriers[i];
      const mat = wall.material as THREE.MeshStandardMaterial;
      const wallX = wall.position.x;
      const dist1 = Math.abs(f1x - wallX);
      const dist2 = Math.abs(f2x - wallX);
      const minDist = Math.min(dist1, dist2);

      // Glow when fighter is within 1 unit of wall
      const glow = Math.max(0, 1 - minDist) * 0.6;
      mat.opacity = glow;
      mat.emissiveIntensity = glow * 2;

      // Also glow the cage bars for that side
      if (this._cageBars[i]) {
        for (const bar of this._cageBars[i]) {
          const bMat = bar.material as THREE.MeshStandardMaterial;
          bMat.emissiveIntensity = glow * 1.5;
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  SPECTATORS & BLEACHERS                                             */
  /* ------------------------------------------------------------------ */
  private _buildSpectators(): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4025, roughness: 0.85, metalness: 0.05 });
    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9, metalness: 0.05 });

    // Spectator body color palette
    const bodyColors = [
      0x886655, 0x775544, 0x665533, 0x887766,
      0x6b4f3a, 0x7a6050, 0x604838, 0x8a7060,
      0x554a3e, 0x756050,
    ];
    const headColors = [
      0xd4a574, 0xc49464, 0xb48454, 0xe0b888,
      0xa07050, 0xc8a070, 0xd0a878,
    ];

    // --- Wooden bleacher / grandstand structure ---
    for (let row = 0; row < 5; row++) {
      const z = -3.2 - row * 1.1;
      const y = row * 0.55;
      const rowWidth = TB.STAGE_HALF_WIDTH * 2 + 2.5 + row * 1.8;

      // Bench seat plank
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(rowWidth, 0.1, 0.5),
        woodMat,
      );
      bench.position.set(0, y + 0.05, z);
      bench.receiveShadow = true;
      this._spectatorGroup.add(bench);

      // Support structure (legs every ~2 units)
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

      // Back rest for each row
      const backRest = new THREE.Mesh(
        new THREE.BoxGeometry(rowWidth, 0.4, 0.06),
        woodDarkMat,
      );
      backRest.position.set(0, y + 0.3, z - 0.25);
      this._spectatorGroup.add(backRest);

      // --- Spectators (varied heights and colors) ---
      const spacing = 0.55;
      const count = Math.floor(rowWidth / spacing);
      for (let i = 0; i < count; i++) {
        const sx = -rowWidth / 2 + spacing * 0.5 + i * spacing + (Math.random() - 0.5) * 0.12;
        const heightVar = 0.9 + Math.random() * 0.3; // 0.9 to 1.2 scale
        const bodyH = 0.4 * heightVar;
        const bodyW = 0.11 + Math.random() * 0.04;

        const bodyColor = bodyColors[Math.floor(Math.random() * bodyColors.length)];
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(bodyW - 0.02, bodyW, bodyH, 6),
          new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 }),
        );
        body.position.set(sx, y + 0.1 + bodyH / 2, z);
        this._spectatorGroup.add(body);

        // Shoulders
        if (Math.random() > 0.3) {
          const shoulders = new THREE.Mesh(
            new THREE.BoxGeometry(bodyW * 2.5, 0.06, 0.08),
            new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 }),
          );
          shoulders.position.set(sx, y + 0.1 + bodyH - 0.02, z);
          this._spectatorGroup.add(shoulders);
        }

        // Head
        const headColor = headColors[Math.floor(Math.random() * headColors.length)];
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.07 + Math.random() * 0.02, 6, 5),
          new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.7 }),
        );
        head.position.set(sx, y + 0.1 + bodyH + 0.08, z);
        this._spectatorGroup.add(head);
      }
    }

    // --- Noble's Box (center back, elevated with canopy) ---
    const nbX = 0;
    const nbZ = -8.5;
    const nbY = 3.0;
    const nbW = 3.0;
    const nbD = 1.5;
    const nobleMat = new THREE.MeshStandardMaterial({ color: 0x6a3030, roughness: 0.5, metalness: 0.3 });
    const goldAccent = new THREE.MeshStandardMaterial({ color: 0xc4a855, roughness: 0.3, metalness: 0.6 });

    // Platform
    const boxPlatform = new THREE.Mesh(
      new THREE.BoxGeometry(nbW, 0.15, nbD),
      nobleMat,
    );
    boxPlatform.position.set(nbX, nbY, nbZ);
    this._spectatorGroup.add(boxPlatform);

    // Railing
    const railGeo = new THREE.BoxGeometry(nbW, 0.5, 0.06);
    const rail = new THREE.Mesh(railGeo, goldAccent);
    rail.position.set(nbX, nbY + 0.25, nbZ + nbD / 2);
    this._spectatorGroup.add(rail);

    // Side rails
    for (const s of [-1, 1]) {
      const sideRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.5, nbD),
        goldAccent,
      );
      sideRail.position.set(nbX + s * nbW / 2, nbY + 0.25, nbZ);
      this._spectatorGroup.add(sideRail);
    }

    // Four support columns for the noble's box
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

    // Canopy (angled roof)
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(nbW + 0.6, 0.08, nbD + 0.6),
      new THREE.MeshStandardMaterial({ color: 0x7a2020, roughness: 0.6, metalness: 0.2 }),
    );
    canopy.position.set(nbX, nbY + 1.8, nbZ);
    canopy.rotation.x = 0.05;
    this._spectatorGroup.add(canopy);

    // Canopy trim
    const canopyTrim = new THREE.Mesh(
      new THREE.BoxGeometry(nbW + 0.7, 0.04, 0.06),
      goldAccent,
    );
    canopyTrim.position.set(nbX, nbY + 1.76, nbZ + nbD / 2 + 0.3);
    this._spectatorGroup.add(canopyTrim);

    // Noble figures inside the box
    for (let n = 0; n < 3; n++) {
      const nx = nbX - 0.8 + n * 0.8;
      const nobleBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.55, 6),
        new THREE.MeshStandardMaterial({ color: 0x8a2020 + n * 0x001500, roughness: 0.5 }),
      );
      nobleBody.position.set(nx, nbY + 0.4, nbZ);
      this._spectatorGroup.add(nobleBody);

      const nobleHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 }),
      );
      nobleHead.position.set(nx, nbY + 0.75, nbZ);
      this._spectatorGroup.add(nobleHead);
    }

    // --- Banners (varied colors, slight rotation for movement) ---
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
        // Slight rotation variation for "fluttering" feel
        banner.rotation.y = side * (-0.25 + Math.sin(i * 1.3) * 0.1);
        banner.rotation.z = Math.sin(i * 0.9 + side) * 0.06;
        this._spectatorGroup.add(banner);

        // Banner pole
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

  /* ------------------------------------------------------------------ */
  /*  TORCHES                                                            */
  /* ------------------------------------------------------------------ */
  private _buildTorches(): void {
    const torchPositions: [number, number, number][] = [
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, 1.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -0.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -2.5],
      [-TB.STAGE_HALF_WIDTH - 0.5, 2.5, -4.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, 1.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -0.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -2.5],
      [TB.STAGE_HALF_WIDTH + 0.5, 2.5, -4.5],
      [0, 3.8, -7],     // center back
      [0, 3.8, -9.5],   // behind noble's box
    ];

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.7 });
    const torchWoodMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });

    for (const [tx, ty, tz] of torchPositions) {
      // L-shaped iron bracket
      // Horizontal arm
      const hArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.04, 0.04),
        ironMat,
      );
      const armDir = tx > 0 ? -1 : tx < 0 ? 1 : 0;
      hArm.position.set(tx + armDir * 0.15, ty - 0.1, tz);
      this._props.add(hArm);

      // Vertical arm
      const vArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.3, 0.04),
        ironMat,
      );
      vArm.position.set(tx + armDir * 0.32, ty - 0.25, tz);
      this._props.add(vArm);

      // Torch cup (where fire sits)
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

      // --- Layered flame (multiple overlapping emissive spheres) ---
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

      // Point light
      this._scene.addTorchLight(tx, ty, tz);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  CHANDELIER                                                         */
  /* ------------------------------------------------------------------ */
  private _buildChandelier(): void {
    const chanY = 5.0;
    const chanZ = -1.5;
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.4, metalness: 0.75 });

    // Central chain (from sky down)
    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 3.0, 4),
      ironMat,
    );
    chain.position.set(0, chanY + 1.5, chanZ);
    this._props.add(chain);

    // Main ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.035, 8, 24),
      ironMat,
    );
    ring.position.set(0, chanY, chanZ);
    ring.rotation.x = Math.PI / 2;
    this._props.add(ring);

    // Inner ring
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.025, 8, 20),
      ironMat,
    );
    innerRing.position.set(0, chanY, chanZ);
    innerRing.rotation.x = Math.PI / 2;
    this._props.add(innerRing);

    // Cross bars connecting rings
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

    // Support chains from main ring to ceiling chain
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

    // Candles around the outer ring
    const candleCount = 10;
    for (let c = 0; c < candleCount; c++) {
      const angle = (c / candleCount) * Math.PI * 2;
      const cx = 0.8 * Math.cos(angle);
      const cz = chanZ + 0.8 * Math.sin(angle);

      // Candle stick
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.018, 0.15, 6),
        new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.9 }),
      );
      candle.position.set(cx, chanY + 0.1, cz);
      this._props.add(candle);

      // Candle flame
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

    // Chandelier light
    this._scene.addTorchLight(0, chanY - 0.2, chanZ);
  }

  /* ------------------------------------------------------------------ */
  /*  SKY / ENVIRONMENT                                                  */
  /* ------------------------------------------------------------------ */
  private _buildSkyEnvironment(): void {
    // --- Dark sky dome with subtle aurora band ---
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 512;
    skyCanvas.height = 256;
    const sCtx = skyCanvas.getContext("2d")!;

    // Dark gradient base
    const skyGrad = sCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, "#050510");
    skyGrad.addColorStop(0.5, "#0a0a1a");
    skyGrad.addColorStop(1, "#151525");
    sCtx.fillStyle = skyGrad;
    sCtx.fillRect(0, 0, 512, 256);

    // Aurora / nebula band (subtle green-purple)
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

    // --- Moon ---
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

    // Moon glow (larger transparent sphere)
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

    // --- Stars (600+, varying sizes) ---
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

    // Brighter main star layer
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    this._scene.scene.add(stars);

    // Dimmer small star layer
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

    // --- Distant mountain silhouettes ---
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
      // Triangle shape using a cone
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(m.w / 2, m.h, 4),
        mountainMat,
      );
      mountain.position.set(m.x, m.h / 2 - 1, -35);
      mountain.rotation.y = Math.random() * 0.5;
      this._scene.scene.add(mountain);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  GROUND DETAILS                                                     */
  /* ------------------------------------------------------------------ */
  private _buildGroundDetails(): void {
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

    // --- Scattered rock debris along edges ---
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

    // --- Broken sword pieces (small elongated shapes) ---
    for (let i = 0; i < 4; i++) {
      const sx = (Math.random() - 0.5) * floorW * 0.9;
      const sz = floorD / 2 - 0.5 - Math.random() * 1.0;
      // Blade fragment
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.01, 0.15 + Math.random() * 0.1),
        metalMat,
      );
      blade.position.set(sx, 0.01, sz);
      blade.rotation.y = Math.random() * Math.PI;
      this._floorGroup.add(blade);
    }

    // --- Drain grates in corners ---
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.7 });
    const corners: [number, number][] = [
      [-floorW / 2 + 0.5, floorD / 2 - 0.5],
      [floorW / 2 - 0.5, floorD / 2 - 0.5],
      [-floorW / 2 + 0.5, -floorD / 2 + 0.5],
      [floorW / 2 - 0.5, -floorD / 2 + 0.5],
    ];
    for (const [gx, gz] of corners) {
      // Grate frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.02, 0.5),
        grateMat,
      );
      frame.position.set(gx, 0.005, gz);
      this._floorGroup.add(frame);

      // Grate bars
      for (let b = -2; b <= 2; b++) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.025, 0.02),
          grateMat,
        );
        bar.position.set(gx, 0.015, gz + b * 0.09);
        this._floorGroup.add(bar);
      }

      // Dark hole beneath
      const hole = new THREE.Mesh(
        new THREE.PlaneGeometry(0.44, 0.44),
        new THREE.MeshBasicMaterial({ color: 0x080808 }),
      );
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(gx, 0.001, gz);
      this._floorGroup.add(hole);
    }

    // --- Blood stain decals ---
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

      // Splatter around main stain
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

  /* ------------------------------------------------------------------ */
  /*  DISPOSE                                                            */
  /* ------------------------------------------------------------------ */
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
  }
}
