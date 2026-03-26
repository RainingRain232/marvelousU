// ---------------------------------------------------------------------------
// Age of Wonders — 3D Hex Terrain Renderer (enhanced visuals)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import {
  type AoWGameState, type AoWHex,
  AoWTerrain, hexKey, hexToWorld,
} from "../AoWTypes";
import { AOW_TERRAIN, getFactionDef } from "../config/AoWConfig";
import type { AoWSceneManager } from "./AoWSceneManager";

// Flat-top hex geometry helper
function createHexShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export class AoWHexRenderer {
  private _sceneManager: AoWSceneManager;
  private _hexMeshes = new Map<string, THREE.Group>();
  private _highlightMesh: THREE.Mesh | null = null;
  private _pathMeshes: THREE.Mesh[] = [];
  private _cityMeshes = new Map<string, THREE.Group>();
  private _fogMeshes = new Map<string, THREE.Mesh>();
  private _waterMeshes: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  private _swampBubbles: THREE.Mesh[] = [];
  private _lavaMeshes: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  private _treeTops: THREE.Object3D[] = [];
  private _grailOrbs: THREE.Mesh[] = [];
  private _shrineGlows: THREE.Mesh[] = [];
  private _time = 0;

  // Shared geometries and materials
  private _hexGeo!: THREE.ExtrudeGeometry;
  private _hexHighlightGeo!: THREE.ExtrudeGeometry;
  private _terrainMats: Record<string, THREE.MeshStandardMaterial> = {};

  constructor(sceneManager: AoWSceneManager) {
    this._sceneManager = sceneManager;
    this._initGeometries();
  }

  private _initGeometries(): void {
    const hexShape = createHexShape(0.92);
    this._hexGeo = new THREE.ExtrudeGeometry(hexShape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 1,
    });
    this._hexGeo.rotateX(-Math.PI / 2);

    const hlShape = createHexShape(0.96);
    this._hexHighlightGeo = new THREE.ExtrudeGeometry(hlShape, {
      depth: 0.05,
      bevelEnabled: false,
    });
    this._hexHighlightGeo.rotateX(-Math.PI / 2);

    // Terrain materials with varied roughness/metalness
    for (const [key, tDef] of Object.entries(AOW_TERRAIN)) {
      let roughness = 0.85;
      let metalness = 0.05;
      if (key === AoWTerrain.WATER) { roughness = 0.05; metalness = 0.4; }
      else if (key === AoWTerrain.SNOW) { roughness = 0.3; metalness = 0.1; }
      else if (key === AoWTerrain.MOUNTAIN) { roughness = 0.95; metalness = 0.15; }
      else if (key === AoWTerrain.LAVA) { roughness = 0.4; metalness = 0.3; }
      else if (key === AoWTerrain.SWAMP) { roughness = 0.6; metalness = 0.05; }

      this._terrainMats[key] = new THREE.MeshStandardMaterial({
        color: tDef.color,
        roughness,
        metalness,
        flatShading: true,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Build entire map
  // ---------------------------------------------------------------------------

  buildMap(state: AoWGameState): void {
    this.clear();

    for (const [_key, hex] of state.hexes) {
      this._createHexTile(hex, state);
    }

    for (const city of state.cities) {
      this._createCityMesh(city.q, city.r, city.playerId, city.name, state);
    }

    // Highlight mesh
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.5,
    });
    this._highlightMesh = new THREE.Mesh(this._hexHighlightGeo, hlMat);
    this._highlightMesh.visible = false;
    this._highlightMesh.position.y = 0.01;
    this._sceneManager.terrainGroup.add(this._highlightMesh);
  }

  private _createHexTile(hex: AoWHex, _state: AoWGameState): void {
    const group = new THREE.Group();
    const pos = hexToWorld(hex.q, hex.r, hex.elevation);
    group.position.set(pos.x, pos.y, pos.z);

    // Main hex tile
    const mat = this._terrainMats[hex.terrain] || this._terrainMats[AoWTerrain.PLAINS];
    const mesh = new THREE.Mesh(this._hexGeo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData = { hexQ: hex.q, hexR: hex.r };
    group.add(mesh);

    // Terrain decorations
    if (hex.terrain === AoWTerrain.FOREST) {
      this._addTreesDecoration(group);
    } else if (hex.terrain === AoWTerrain.MOUNTAIN) {
      this._addMountainDecoration(group);
    } else if (hex.terrain === AoWTerrain.WATER) {
      this._addWaterDecoration(group);
    } else if (hex.terrain === AoWTerrain.SWAMP) {
      this._addSwampDecoration(group);
    } else if (hex.terrain === AoWTerrain.SNOW) {
      this._addSnowDecoration(group);
    } else if (hex.terrain === AoWTerrain.LAVA) {
      this._addLavaDecoration(group);
    } else if (hex.terrain === AoWTerrain.PLAINS) {
      this._addGrassDecoration(group);
    } else if (hex.terrain === AoWTerrain.HILLS) {
      this._addHillsDecoration(group);
    }

    // Special decorations
    if (hex.decoration === "ruins") {
      this._addRuinsDecoration(group);
    } else if (hex.decoration === "shrine") {
      this._addShrineDecoration(group);
    } else if (hex.decoration === "grail") {
      if (hex.explored[0]) {
        this._addGrailDecoration(group);
      } else {
        this._addRuinsDecoration(group);
      }
    }

    // Fog of war overlay
    const isExplored = hex.explored[0];
    if (!isExplored) {
      const fogMat = new THREE.MeshBasicMaterial({
        color: 0x0a0a1a,
        transparent: true,
        opacity: 0.85,
      });
      const fogMesh = new THREE.Mesh(this._hexGeo, fogMat);
      fogMesh.position.y = 0.35;
      group.add(fogMesh);
      this._fogMeshes.set(hexKey(hex.q, hex.r), fogMesh);
    }

    // Hex border
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0x222233,
      transparent: true,
      opacity: 0.25,
    });
    const borderShape = createHexShape(0.95);
    const borderGeo = new THREE.ExtrudeGeometry(borderShape, { depth: 0.01, bevelEnabled: false });
    borderGeo.rotateX(-Math.PI / 2);
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.position.y = 0.31;
    group.add(borderMesh);

    this._sceneManager.terrainGroup.add(group);
    this._hexMeshes.set(hexKey(hex.q, hex.r), group);
  }

  // ---------------------------------------------------------------------------
  // Decorations
  // ---------------------------------------------------------------------------

  private _addTreesDecoration(group: THREE.Group): void {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, flatShading: true, roughness: 0.9 });

    for (let i = 0; i < 4; i++) {
      const tx = (Math.random() - 0.5) * 0.6;
      const tz = (Math.random() - 0.5) * 0.6;
      const scale = 0.15 + Math.random() * 0.15;

      // Trunk
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(scale * 0.25, scale * 0.35, scale * 2, 5),
        trunkMat,
      );
      trunk.position.set(tx, 0.3 + scale, tz);
      trunk.castShadow = true;
      group.add(trunk);

      // Foliage: layered cones for fullness
      const treeTop = new THREE.Group();
      treeTop.position.set(tx, 0.3 + scale * 1.8, tz);

      // Vary green per tree
      const greenVariation = Math.random() * 0.15;
      const treeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.08 + greenVariation, 0.25 + greenVariation * 0.5, 0.04 + greenVariation * 0.3),
        flatShading: true,
        roughness: 0.8,
      });

      // Lower wider cone
      const lower = new THREE.Mesh(
        new THREE.ConeGeometry(scale * 1.4, scale * 2, 6),
        treeMat,
      );
      lower.position.y = 0;
      lower.castShadow = true;
      treeTop.add(lower);

      // Upper narrow cone
      const upper = new THREE.Mesh(
        new THREE.ConeGeometry(scale * 0.9, scale * 1.6, 6),
        treeMat,
      );
      upper.position.y = scale * 0.9;
      upper.castShadow = true;
      treeTop.add(upper);

      group.add(treeTop);
      this._treeTops.push(treeTop);
    }
  }

  private _addMountainDecoration(group: THREE.Group): void {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x556677,
      flatShading: true,
      roughness: 0.95,
      metalness: 0.1,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      flatShading: true,
      roughness: 0.3,
      metalness: 0.05,
      emissive: 0xddeeff,
      emissiveIntensity: 0.05,
    });

    // Main peak
    const peak = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 5), rockMat);
    peak.position.y = 0.9;
    peak.castShadow = true;
    group.add(peak);

    // Snow cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 5), snowMat);
    cap.position.y = 1.35;
    group.add(cap);

    // Secondary peak
    const peak2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 4), rockMat);
    peak2.position.set(0.3, 0.7, 0.2);
    peak2.castShadow = true;
    group.add(peak2);

    // Small rock debris
    for (let i = 0; i < 3; i++) {
      const rx = (Math.random() - 0.5) * 0.7;
      const rz = (Math.random() - 0.5) * 0.7;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.06, 0),
        rockMat,
      );
      rock.position.set(rx, 0.33, rz);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(rock);
    }
  }

  private _addWaterDecoration(group: THREE.Group): void {
    // Animated water shader
    const waterMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x1155aa) },
        color2: { value: new THREE.Color(0x3388cc) },
        opacity: { value: 0.75 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        uniform float time;
        void main() {
          vUv = uv;
          vPos = position;
          vec3 p = position;
          p.z += sin(position.x * 8.0 + time * 2.0) * 0.01;
          p.z += cos(position.y * 6.0 + time * 1.5) * 0.008;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        uniform float opacity;
        varying vec2 vUv;
        varying vec3 vPos;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
                     mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
        }

        void main() {
          vec2 uv = vPos.xy * 3.0;
          float wave = noise(uv + time * 0.3) * 0.5 + noise(uv * 2.0 - time * 0.5) * 0.3;
          vec3 col = mix(color1, color2, wave);
          // Specular highlight
          float spec = pow(max(wave, 0.0), 3.0) * 0.3;
          col += vec3(spec);
          gl_FragColor = vec4(col, opacity);
        }
      `,
    });

    const waterMesh = new THREE.Mesh(new THREE.CircleGeometry(0.85, 12), waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.15;
    group.add(waterMesh);
    this._waterMeshes.push({ mesh: waterMesh, mat: waterMat });
  }

  private _addLavaDecoration(group: THREE.Group): void {
    const lavaMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0xcc2200) },
        color2: { value: new THREE.Color(0xff8800) },
        color3: { value: new THREE.Color(0xffcc00) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1, color2, color3;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vPos;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p) {
          vec2 i=floor(p); vec2 f=fract(p);
          f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                     mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }

        void main() {
          vec2 uv = vPos.xy * 2.0;
          float n = noise(uv + time * 0.15) * 0.6 + noise(uv * 3.0 - time * 0.25) * 0.4;
          vec3 col = mix(color1, color2, n);
          col = mix(col, color3, pow(n, 3.0));
          float glow = pow(n, 2.0) * 0.5;
          col += vec3(glow, glow * 0.3, 0.0);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const lavaMesh = new THREE.Mesh(new THREE.CircleGeometry(0.85, 12), lavaMat);
    lavaMesh.rotation.x = -Math.PI / 2;
    lavaMesh.position.y = 0.15;
    group.add(lavaMesh);
    this._lavaMeshes.push({ mesh: lavaMesh, mat: lavaMat });

    // Lava glow light
    const light = new THREE.PointLight(0xff4400, 0.8, 3);
    light.position.y = 0.4;
    group.add(light);
  }

  private _addSwampDecoration(group: THREE.Group): void {
    // Murky water base
    const swampWater = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 8),
      new THREE.MeshStandardMaterial({
        color: 0x2a3a1a,
        transparent: true,
        opacity: 0.5,
        roughness: 0.3,
        metalness: 0.1,
      }),
    );
    swampWater.rotation.x = -Math.PI / 2;
    swampWater.position.y = 0.16;
    group.add(swampWater);

    // Bubbles
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0x4a5a2a,
      transparent: true,
      opacity: 0.6,
      flatShading: true,
    });
    const bubbleCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < bubbleCount; i++) {
      const bx = (Math.random() - 0.5) * 0.5;
      const bz = (Math.random() - 0.5) * 0.5;
      const size = 0.04 + Math.random() * 0.05;
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 6), bubbleMat);
      bubble.position.set(bx, 0.32, bz);
      group.add(bubble);
      this._swampBubbles.push(bubble);
    }

    // Dead tree stump
    if (Math.random() > 0.4) {
      const stumpMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, flatShading: true, roughness: 0.95 });
      const stump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 0.3, 5),
        stumpMat,
      );
      stump.position.set((Math.random() - 0.5) * 0.4, 0.45, (Math.random() - 0.5) * 0.4);
      stump.rotation.z = (Math.random() - 0.5) * 0.4;
      group.add(stump);
    }
  }

  private _addSnowDecoration(group: THREE.Group): void {
    // Snow sparkle point lights
    for (let i = 0; i < 2; i++) {
      const x = (Math.random() - 0.5) * 0.6;
      const z = (Math.random() - 0.5) * 0.6;
      const light = new THREE.PointLight(0xccddff, 0.08, 1);
      light.position.set(x, 0.5, z);
      group.add(light);
    }

    // Small snow mounds
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      flatShading: true,
      roughness: 0.3,
      metalness: 0.05,
    });
    for (let i = 0; i < 2; i++) {
      const sx = (Math.random() - 0.5) * 0.5;
      const sz = (Math.random() - 0.5) * 0.5;
      const mound = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 5, 4),
        snowMat,
      );
      mound.position.set(sx, 0.3, sz);
      mound.scale.y = 0.5;
      group.add(mound);
    }
  }

  private _addGrassDecoration(group: THREE.Group): void {
    // Small grass tufts using thin cones
    if (Math.random() > 0.4) {
      const grassMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.2 + Math.random() * 0.1, 0.4 + Math.random() * 0.15, 0.1),
        flatShading: true,
        roughness: 0.9,
      });
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const gx = (Math.random() - 0.5) * 0.6;
        const gz = (Math.random() - 0.5) * 0.6;
        const blade = new THREE.Mesh(
          new THREE.ConeGeometry(0.02, 0.12 + Math.random() * 0.08, 3),
          grassMat,
        );
        blade.position.set(gx, 0.35, gz);
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(blade);
      }
    }

    // Occasional flower
    if (Math.random() > 0.7) {
      const flowerColors = [0xcc4466, 0xdddd44, 0xaa66cc, 0xffaa44];
      const fc = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const flowerMat = new THREE.MeshBasicMaterial({ color: fc });
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), flowerMat);
      flower.position.set((Math.random() - 0.5) * 0.5, 0.38, (Math.random() - 0.5) * 0.5);
      group.add(flower);
    }
  }

  private _addHillsDecoration(group: THREE.Group): void {
    // Rocky outcrops
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7a6a4a,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.1,
    });
    for (let i = 0; i < 2; i++) {
      const rx = (Math.random() - 0.5) * 0.5;
      const rz = (Math.random() - 0.5) * 0.5;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.1, 0),
        rockMat,
      );
      rock.position.set(rx, 0.35, rz);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      group.add(rock);
    }

    // Tall grass
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x7a8a3a,
      flatShading: true,
      roughness: 0.85,
    });
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(
        new THREE.ConeGeometry(0.025, 0.15, 3),
        grassMat,
      );
      blade.position.set((Math.random() - 0.5) * 0.5, 0.37, (Math.random() - 0.5) * 0.5);
      group.add(blade);
    }
  }

  private _addGrailDecoration(group: THREE.Group): void {
    const grailMat = new THREE.MeshStandardMaterial({
      color: 0xddbb44,
      emissive: 0xddbb44,
      emissiveIntensity: 0.3,
      flatShading: true,
      metalness: 0.4,
      roughness: 0.3,
    });

    // Golden broken columns
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i;
      const r = 0.25;
      const h = 0.2 + Math.random() * 0.3;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, h, 6),
        grailMat,
      );
      col.position.set(Math.cos(angle) * r, 0.3 + h / 2, Math.sin(angle) * r);
      col.rotation.z = (Math.random() - 0.5) * 0.3;
      col.castShadow = true;
      group.add(col);
    }

    // Floating golden orb with pulsing emissive
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xffdd44,
      emissive: 0xffdd44,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
      metalness: 0.6,
      roughness: 0.1,
    });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), orbMat);
    orb.position.y = 0.9;
    group.add(orb);
    this._grailOrbs.push(orb);

    // Outer glow halo
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.15,
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), haloMat);
    halo.position.y = 0.9;
    group.add(halo);

    // Golden glow light
    const light = new THREE.PointLight(0xffdd44, 0.8, 4);
    light.position.y = 0.9;
    group.add(light);
  }

  private _addRuinsDecoration(group: THREE.Group): void {
    const ruinMat = new THREE.MeshStandardMaterial({
      color: 0x887766,
      flatShading: true,
      roughness: 0.9,
    });

    // Broken columns
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i;
      const r = 0.25;
      const h = 0.2 + Math.random() * 0.3;
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, h, 6),
        ruinMat,
      );
      col.position.set(Math.cos(angle) * r, 0.3 + h / 2, Math.sin(angle) * r);
      col.rotation.z = (Math.random() - 0.5) * 0.3;
      col.castShadow = true;
      group.add(col);
    }

    // Fallen slab
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.04, 0.15),
      ruinMat,
    );
    slab.position.set(0, 0.33, 0.15);
    slab.rotation.y = Math.random() * Math.PI;
    group.add(slab);
  }

  private _addShrineDecoration(group: THREE.Group): void {
    const shrineMat = new THREE.MeshStandardMaterial({
      color: 0xddaa44,
      emissive: 0xddaa44,
      emissiveIntensity: 0.35,
      flatShading: true,
      metalness: 0.3,
      roughness: 0.4,
    });

    // Obelisk
    const obelisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 0.6, 4),
      shrineMat,
    );
    obelisk.position.y = 0.6;
    obelisk.castShadow = true;
    group.add(obelisk);

    // Glow sphere
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffdd66,
      transparent: true,
      opacity: 0.5,
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), glowMat);
    glow.position.y = 0.95;
    group.add(glow);
    this._shrineGlows.push(glow);

    // Outer halo
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffdd66,
      transparent: true,
      opacity: 0.1,
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), haloMat);
    halo.position.y = 0.95;
    group.add(halo);

    // Point light
    const light = new THREE.PointLight(0xffdd66, 0.6, 3);
    light.position.y = 0.95;
    group.add(light);
  }

  // ---------------------------------------------------------------------------
  // City mesh
  // ---------------------------------------------------------------------------

  private _createCityMesh(q: number, r: number, playerId: number, _name: string, state: AoWGameState): void {
    const group = new THREE.Group();
    const pos = hexToWorld(q, r, state.hexes.get(hexKey(q, r))?.elevation || 0);
    group.position.set(pos.x, pos.y, pos.z);

    const color = playerId >= 0 ? getFactionDef(state.players[playerId].faction).color : 0x888888;

    // Castle base with stone texture look
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x554433,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.1,
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.45, 0.2, 8),
      baseMat,
    );
    base.position.y = 0.4;
    base.castShadow = true;
    group.add(base);

    // Wall ring
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x665544,
      flatShading: true,
      roughness: 0.85,
    });
    const wallRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.03, 6, 12),
      wallMat,
    );
    wallRing.position.y = 0.52;
    wallRing.rotation.x = Math.PI / 2;
    group.add(wallRing);

    // Main tower
    const towerMat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      metalness: 0.15,
      roughness: 0.6,
    });
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.5, 6),
      towerMat,
    );
    tower.position.y = 0.75;
    tower.castShadow = true;
    group.add(tower);

    // Roof
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xaa2222,
      flatShading: true,
      roughness: 0.7,
    });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.2, 6), roofMat);
    roof.position.y = 1.1;
    group.add(roof);

    // Side towers with battlements
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      const r2 = 0.3;
      const sideTower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.35, 5),
        towerMat,
      );
      sideTower.position.set(Math.cos(angle) * r2, 0.55, Math.sin(angle) * r2);
      sideTower.castShadow = true;
      group.add(sideTower);

      const sideRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.12, 5),
        roofMat,
      );
      sideRoof.position.set(Math.cos(angle) * r2, 0.8, Math.sin(angle) * r2);
      group.add(sideRoof);
    }

    // Banner
    const bannerMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const bannerGeo = new THREE.PlaneGeometry(0.12, 0.2);
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0.15, 1.15, 0);
    group.add(banner);

    // Faction glow
    const glowLight = new THREE.PointLight(color, 0.5, 3);
    glowLight.position.y = 0.8;
    group.add(glowLight);

    // Window lights
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i + 0.5;
      const wnd = new THREE.Mesh(
        new THREE.PlaneGeometry(0.03, 0.04),
        windowMat,
      );
      wnd.position.set(Math.cos(angle) * 0.14, 0.75, Math.sin(angle) * 0.14);
      wnd.lookAt(group.position.x + Math.cos(angle) * 2, 0.75, group.position.z + Math.sin(angle) * 2);
      group.add(wnd);
    }

    this._sceneManager.terrainGroup.add(group);
    this._cityMeshes.set(hexKey(q, r), group);
  }

  // ---------------------------------------------------------------------------
  // Highlight & Path
  // ---------------------------------------------------------------------------

  setHighlight(q: number, r: number, elevation: number): void {
    if (!this._highlightMesh) return;
    const pos = hexToWorld(q, r, elevation);
    this._highlightMesh.position.set(pos.x, pos.y + 0.32, pos.z);
    this._highlightMesh.visible = true;
  }

  clearHighlight(): void {
    if (this._highlightMesh) this._highlightMesh.visible = false;
  }

  showPath(path: { q: number; r: number }[], hexes: Map<string, AoWHex>): void {
    this.clearPath();
    for (let idx = 0; idx < path.length; idx++) {
      const p = path[idx];
      const hex = hexes.get(hexKey(p.q, p.r));
      const pos = hexToWorld(p.q, p.r, hex?.elevation || 0);
      // Gradient from blue to white along path
      const t = path.length > 1 ? idx / (path.length - 1) : 0;
      const color = new THREE.Color(0x44aaff).lerp(new THREE.Color(0xffffff), t * 0.4);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35 + t * 0.2,
      });
      const mesh = new THREE.Mesh(this._hexHighlightGeo, mat);
      mesh.position.set(pos.x, pos.y + 0.33, pos.z);
      this._sceneManager.terrainGroup.add(mesh);
      this._pathMeshes.push(mesh);
    }
  }

  clearPath(): void {
    for (const m of this._pathMeshes) {
      this._sceneManager.terrainGroup.remove(m);
      m.geometry.dispose();
    }
    this._pathMeshes = [];
  }

  // ---------------------------------------------------------------------------
  // Animation tick
  // ---------------------------------------------------------------------------

  tick(dt: number): void {
    this._time += dt;

    // Animate water shaders
    for (const w of this._waterMeshes) {
      w.mat.uniforms.time.value = this._time;
      w.mesh.position.y = 0.15 + Math.sin(this._time * 1.5) * 0.015;
    }

    // Animate lava shaders
    for (const l of this._lavaMeshes) {
      l.mat.uniforms.time.value = this._time;
    }

    // Animate swamp bubbles
    for (let i = 0; i < this._swampBubbles.length; i++) {
      const bubble = this._swampBubbles[i];
      const phase = this._time * 2.0 + i * 1.7;
      bubble.position.y = 0.32 + Math.sin(phase) * 0.04;
      const scale = 1 + Math.sin(phase * 1.3) * 0.2;
      bubble.scale.setScalar(scale);
    }

    // Animate trees swaying
    for (let i = 0; i < this._treeTops.length; i++) {
      const tree = this._treeTops[i];
      tree.rotation.z = Math.sin(this._time * 0.8 + i * 0.7) * 0.025;
      tree.rotation.x = Math.sin(this._time * 0.6 + i * 1.1) * 0.015;
    }

    // Animate grail orbs floating and pulsing
    for (let i = 0; i < this._grailOrbs.length; i++) {
      const orb = this._grailOrbs[i];
      orb.position.y = 0.9 + Math.sin(this._time * 1.5 + i) * 0.08;
      const mat = orb.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(this._time * 2 + i) * 0.2;
    }

    // Animate shrine glows pulsing
    for (let i = 0; i < this._shrineGlows.length; i++) {
      const glow = this._shrineGlows[i];
      const mat = glow.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(this._time * 2.5 + i * 0.8) * 0.2;
      const s = 1 + Math.sin(this._time * 2 + i) * 0.15;
      glow.scale.setScalar(s);
    }

    // Highlight pulse
    if (this._highlightMesh && this._highlightMesh.visible) {
      const mat = this._highlightMesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + Math.sin(this._time * 3) * 0.15;
      mat.opacity = 0.4 + Math.sin(this._time * 2.5) * 0.15;
    }
  }

  // ---------------------------------------------------------------------------
  // Fog of war update
  // ---------------------------------------------------------------------------

  updateFog(state: AoWGameState): void {
    for (const [key, hex] of state.hexes) {
      const fogMesh = this._fogMeshes.get(key);
      if (hex.explored[0] && fogMesh) {
        fogMesh.visible = false;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Update cities
  // ---------------------------------------------------------------------------

  updateCities(state: AoWGameState): void {
    for (const [, g] of this._cityMeshes) {
      this._sceneManager.terrainGroup.remove(g);
    }
    this._cityMeshes.clear();

    for (const city of state.cities) {
      this._createCityMesh(city.q, city.r, city.playerId, city.name, state);
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  clear(): void {
    for (const [, g] of this._hexMeshes) {
      this._sceneManager.terrainGroup.remove(g);
    }
    this._hexMeshes.clear();
    for (const [, g] of this._cityMeshes) {
      this._sceneManager.terrainGroup.remove(g);
    }
    this._cityMeshes.clear();
    this._fogMeshes.clear();
    this._waterMeshes = [];
    this._lavaMeshes = [];
    this._swampBubbles = [];
    this._treeTops = [];
    this._grailOrbs = [];
    this._shrineGlows = [];
    this.clearPath();
    if (this._highlightMesh) {
      this._sceneManager.terrainGroup.remove(this._highlightMesh);
      this._highlightMesh = null;
    }
  }
}
