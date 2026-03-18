// ---------------------------------------------------------------------------
// Camelot Craft – Chunk mesh builder with PBR-like procedural textures
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "../config/CraftBalance";
import { BlockType, BLOCK_DEFS, isTransparent } from "../config/CraftBlockDefs";
import { CraftChunk } from "../state/CraftChunk";
import type { CraftState } from "../state/CraftState";
import { getWorldBlock } from "../state/CraftState";

const S = CB.CHUNK_SIZE;
const H = CB.CHUNK_HEIGHT;

const enum Face { PX = 0, NX = 1, PY = 2, NY = 3, PZ = 4, NZ = 5 }

const NORMALS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const FACE_VERTS: [number, number, number][][] = [
  [[1,0,1],[1,1,1],[1,1,0],[1,0,1],[1,1,0],[1,0,0]], // +X
  [[0,0,0],[0,1,0],[0,1,1],[0,0,0],[0,1,1],[0,0,1]], // -X
  [[0,1,0],[1,1,0],[1,1,1],[0,1,0],[1,1,1],[0,1,1]], // +Y
  [[0,0,1],[1,0,1],[1,0,0],[0,0,1],[1,0,0],[0,0,0]], // -Y
  [[0,0,1],[0,1,1],[1,1,1],[0,0,1],[1,1,1],[1,0,1]], // +Z
  [[1,0,0],[1,1,0],[0,1,0],[1,0,0],[0,1,0],[0,0,0]], // -Z
];

// Per-vertex AO: count solid neighbors at each vertex corner
function computeVertexAO(
  chunk: CraftChunk, state: CraftState,
  x: number, y: number, z: number,
  _face: number, vx: number, vy: number, vz: number,
  ox: number, oz: number,
): number {
  // The vertex corner in block-local space
  const cx = x + vx, cy = y + vy, cz = z + vz;

  let solid = 0;
  // Check the 3 blocks that share this vertex corner (excluding the face normal direction)
  for (let dx = -1; dx <= 0; dx++) {
    for (let dy = -1; dy <= 0; dy++) {
      for (let dz = -1; dz <= 0; dz++) {
        const sx = cx + dx, sy = cy + dy, sz = cz + dz;
        if (sx === x && sy === y && sz === z) continue; // skip self
        // Check if this neighbor is solid
        const lx = sx - ox, lz = sz - oz;
        let isSolid = false;
        if (lx >= 0 && lx < S && sy >= 0 && sy < H && lz >= 0 && lz < S) {
          isSolid = !isTransparent(chunk.getBlock(lx, sy, lz));
        } else {
          isSolid = !isTransparent(getWorldBlock(state, sx, sy, sz));
        }
        if (isSolid) solid++;
      }
    }
  }

  // Map: 0 neighbors = full light (1.0), more = darker
  return Math.max(0.35, 1.0 - solid * 0.12);
}

// ---------------------------------------------------------------------------
// PBR-like terrain shader with procedural textures
// ---------------------------------------------------------------------------

const TERRAIN_VERT = /* glsl */ `
  attribute vec3 color;
  attribute float ao;
  attribute float blockId;

  varying vec3 vColor;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vAO;
  varying float vBlockId;

  void main() {
    vColor = color;
    vWorldPos = position;
    vNormal = normal;
    vAO = ao;
    vBlockId = blockId;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TERRAIN_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vAO;
  varying float vBlockId;

  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uAmbient;
  uniform float uTime;
  uniform float uWetness; // 0-1, from weather system

  // --- Noise functions ---
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }

  float noise2D(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    return noise2D(p) * 0.5 + noise2D(p * 2.0) * 0.25 + noise2D(p * 4.0) * 0.125 + noise2D(p * 8.0) * 0.0625;
  }

  // --- PBR helpers ---
  float distributionGGX(float NdotH, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
    return a2 / (3.14159 * d * d + 0.0001);
  }

  float geometrySmith(float NdotV, float NdotL, float roughness) {
    float r = roughness + 1.0;
    float k = r * r / 8.0;
    float g1 = NdotV / (NdotV * (1.0 - k) + k);
    float g2 = NdotL / (NdotL * (1.0 - k) + k);
    return g1 * g2;
  }

  vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  }

  void main() {
    vec3 baseColor = vColor;

    // --- Triplanar UV projection ---
    vec2 uv;
    if (abs(vNormal.y) > 0.5) uv = vWorldPos.xz;
    else if (abs(vNormal.x) > 0.5) uv = vWorldPos.yz;
    else uv = vWorldPos.xy;

    // --- Procedural texture with 4-octave FBM ---
    float texNoise = fbm(uv * 2.0) * 0.18 - 0.09;
    baseColor += texNoise;

    // Per-block hash variation
    vec3 blockPos = floor(vWorldPos + 0.001);
    float blockVar = hash3(blockPos) * 0.08 - 0.04;
    baseColor += blockVar;

    // Edge darkening (mortar lines between blocks)
    vec2 blockUV = fract(uv);
    float edgeDist = min(min(blockUV.x, 1.0 - blockUV.x), min(blockUV.y, 1.0 - blockUV.y));
    float edgeDarken = smoothstep(0.0, 0.06, edgeDist) * 0.2 + 0.8;
    baseColor *= edgeDarken;

    // --- Per-block material properties ---
    // Determine roughness and metalness from block ID
    float roughness = 0.85; // default: rough stone
    float metalness = 0.0;
    float subsurface = 0.0; // for foliage/grass

    // Grass/leaves: subsurface scattering, low roughness
    float bid = vBlockId;
    if (bid == 3.0 || bid == 5.0 || bid == 45.0 || bid == 51.0 || bid == 53.0 || bid == 54.0) {
      roughness = 0.7;
      subsurface = 0.4;
    }
    // Stone/cobblestone: rough
    if (bid == 1.0 || bid == 8.0 || bid == 19.0 || bid == 25.0) {
      roughness = 0.9;
    }
    // Metal ores/blocks: slightly metallic
    if (bid == 10.0 || bid == 11.0 || bid == 29.0 || bid == 30.0) {
      roughness = 0.4;
      metalness = 0.6;
    }
    // Crystal/enchanted: low roughness, slight metalness
    if (bid == 12.0 || bid == 26.0 || bid == 31.0) {
      roughness = 0.2;
      metalness = 0.3;
    }
    // Gold block: very metallic
    if (bid == 30.0) {
      roughness = 0.3;
      metalness = 0.9;
    }

    // --- Wet surface darkening from rain ---
    if (uWetness > 0.0 && vNormal.y > 0.3) {
      baseColor *= (1.0 - uWetness * 0.3); // darken when wet
      roughness *= (1.0 - uWetness * 0.5);  // wet = smoother/shinier
    }

    // --- PBR Lighting ---
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDir);
    vec3 H = normalize(V + L);

    float NdotL = max(dot(N, L), 0.0);
    float NdotV = max(dot(N, V), 0.001);
    float NdotH = max(dot(N, H), 0.0);
    float HdotV = max(dot(H, V), 0.0);

    // F0: reflectance at normal incidence
    vec3 F0 = mix(vec3(0.04), baseColor, metalness);

    // Cook-Torrance specular BRDF
    float D = distributionGGX(NdotH, roughness);
    float G = geometrySmith(NdotV, NdotL, roughness);
    vec3 F = fresnelSchlick(HdotV, F0);

    vec3 specular = (D * G * F) / (4.0 * NdotV * NdotL + 0.001);

    // Diffuse (energy conservation)
    vec3 kD = (vec3(1.0) - F) * (1.0 - metalness);

    // Half-Lambert diffuse for softer shadows
    float diffuseWrap = NdotL * 0.5 + 0.5;
    diffuseWrap *= diffuseWrap;

    vec3 diffuse = kD * baseColor / 3.14159;

    // --- Subsurface scattering for foliage ---
    float sss = 0.0;
    if (subsurface > 0.0) {
      // Light passing through thin surfaces (leaves, grass)
      float backLight = max(dot(-N, L), 0.0);
      sss = backLight * subsurface * 0.6;
      // Add warm tint to subsurface
      diffuse += baseColor * sss * vec3(1.2, 1.0, 0.6);
    }

    // Combine
    vec3 Lo = (diffuse * diffuseWrap + specular) * uSunColor * 1.2;

    // Ambient: hemisphere sky light (blue from above, brown from below)
    vec3 skyAmbient = mix(vec3(0.05, 0.04, 0.03), vec3(0.15, 0.2, 0.3), N.y * 0.5 + 0.5);
    vec3 ambient = skyAmbient * baseColor * uAmbient * 2.0;

    vec3 color = ambient + Lo;

    // Apply ambient occlusion
    color *= vAO;

    // Height-based atmospheric scatter
    float heightFog = smoothstep(0.0, 10.0, vWorldPos.y) * 0.12 + 0.88;
    color *= heightFog;

    // Distance fade to fog color
    float dist = length(cameraPosition - vWorldPos);
    float fogFactor = 1.0 - exp(-dist * 0.012);
    color = mix(color, uSunColor * 0.3, fogFactor * 0.3);

    color = clamp(color, 0.0, 1.5); // allow slight HDR for bloom

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Shared material (updated per frame by the renderer)
let _terrainMaterial: THREE.ShaderMaterial | null = null;

export function getTerrainMaterial(): THREE.ShaderMaterial {
  if (!_terrainMaterial) {
    _terrainMaterial = new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERT,
      fragmentShader: TERRAIN_FRAG,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uSunColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
        uAmbient: { value: 0.35 },
        uTime: { value: 0 },
        uWetness: { value: 0 },
      },
    });
  }
  return _terrainMaterial;
}

/** Update terrain material uniforms each frame. */
export function updateTerrainUniforms(sunDir: THREE.Vector3, sunColor: THREE.Color, ambient: number, time: number, wetness = 0): void {
  const mat = getTerrainMaterial();
  mat.uniforms.uSunDir.value.copy(sunDir).normalize();
  mat.uniforms.uSunColor.value.copy(sunColor);
  mat.uniforms.uAmbient.value = ambient;
  mat.uniforms.uTime.value = time;
  mat.uniforms.uWetness.value = wetness;
}

// ---------------------------------------------------------------------------
// Mesh builder
// ---------------------------------------------------------------------------

export function buildChunkMesh(chunk: CraftChunk, state: CraftState): THREE.Mesh | null {
  const positions: number[] = [];
  const colors: number[] = [];
  const normals: number[] = [];
  const aoValues: number[] = [];
  const blockIds: number[] = [];

  const tPositions: number[] = [];
  const tColors: number[] = [];
  const tNormals: number[] = [];

  const ox = chunk.worldX;
  const oz = chunk.worldZ;

  for (let y = 0; y < H; y++) {
    for (let z = 0; z < S; z++) {
      for (let x = 0; x < S; x++) {
        const block = chunk.getBlock(x, y, z);
        if (block === BlockType.AIR) continue;

        const def = BLOCK_DEFS[block];
        if (!def) continue;

        const isBlockTransparent = def.transparent;
        const wx = ox + x;
        const wz = oz + z;

        for (let face = 0; face < 6; face++) {
          const [nx, ny, nz] = NORMALS[face];
          const adjX = x + nx, adjY = y + ny, adjZ = z + nz;

          let adjBlock: BlockType;
          if (adjX >= 0 && adjX < S && adjY >= 0 && adjY < H && adjZ >= 0 && adjZ < S) {
            adjBlock = chunk.getBlock(adjX, adjY, adjZ);
          } else {
            adjBlock = getWorldBlock(state, wx + nx, adjY, wz + nz);
          }

          const adjTransparent = isTransparent(adjBlock);
          if (!adjTransparent) continue;
          if (isBlockTransparent && adjBlock === block) continue;

          let color: number;
          if (face === Face.PY && def.topColor !== undefined) color = def.topColor;
          else if ((face === Face.PX || face === Face.NX || face === Face.PZ || face === Face.NZ) && def.sideColor !== undefined) color = def.sideColor;
          else color = def.color;

          // Directional face shade (subtle)
          let faceShade = 1.0;
          if (face === Face.NY) faceShade = 0.6;
          else if (face === Face.NX || face === Face.NZ) faceShade = 0.8;
          else if (face === Face.PX || face === Face.PZ) faceShade = 0.9;

          const r = ((color >> 16) & 0xFF) / 255 * faceShade;
          const g = ((color >> 8) & 0xFF) / 255 * faceShade;
          const b = (color & 0xFF) / 255 * faceShade;

          const verts = FACE_VERTS[face];
          const tgt = isBlockTransparent
            ? { p: tPositions, c: tColors, n: tNormals }
            : { p: positions, c: colors, n: normals };

          for (const [vx, vy, vz] of verts) {
            tgt.p.push(x + vx + ox, y + vy, z + vz + oz);
            tgt.c.push(r, g, b);
            tgt.n.push(nx, ny, nz);

            if (!isBlockTransparent) {
              // Per-vertex AO
              const ao = computeVertexAO(chunk, state, x, y, z, face, vx, vy, vz, ox, oz);
              aoValues.push(ao);
              blockIds.push(block);
            }
          }
        }
      }
    }
  }

  const group = new THREE.Group();

  // Solid mesh with PBR shader
  if (positions.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("ao", new THREE.Float32BufferAttribute(aoValues, 1));
    geo.setAttribute("blockId", new THREE.Float32BufferAttribute(blockIds, 1));

    const mesh = new THREE.Mesh(geo, getTerrainMaterial());
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  }

  // Transparent mesh (water with animated shader)
  if (tPositions.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(tPositions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(tColors, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(tNormals, 3));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        uniform float uTime;
        void main() {
          vColor = color;
          vNormal = normal;
          vec3 pos = position;
          if (normal.y > 0.5) {
            pos.y += sin(pos.x * 2.0 + uTime * 1.5) * 0.04 + cos(pos.z * 2.5 + uTime * 1.2) * 0.03;
          }
          vWorldPos = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        uniform float uTime;
        void main() {
          vec3 col = vColor;
          float shimmer = sin(vWorldPos.x * 4.0 + uTime * 2.0) * cos(vWorldPos.z * 4.0 + uTime * 1.5) * 0.08;
          col += shimmer;
          // Fresnel edge transparency
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);
          float alpha = mix(0.5, 0.85, fresnel);
          // Specular highlight on water
          vec3 sunDir = normalize(vec3(0.5, 0.8, 0.3));
          vec3 halfDir = normalize(sunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0) * 0.4;
          col += spec;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = "water";
    group.add(mesh);
  }

  if (group.children.length === 0) return null;
  return group as unknown as THREE.Mesh;
}

export function disposeChunkMesh(mesh: THREE.Object3D): void {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else if (child.material !== getTerrainMaterial()) child.material.dispose();
      // Don't dispose the shared terrain material
    }
  });
}
