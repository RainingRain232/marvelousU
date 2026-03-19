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

// Subdivision level for each block face (NxN grid of quads)
const SUBDIV = 3; // 3x3 = 9 quads = 18 triangles per face (vs 2 before = 9x polygon count)

const TERRAIN_VERT = /* glsl */ `
  attribute vec3 color;
  attribute float ao;
  attribute float blockId;

  varying vec3 vColor;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vAO;
  varying float vBlockId;
  varying vec2 vBlockUV; // UV within the block face [0,1]

  uniform float uTime;

  // Inline noise for vertex displacement
  float vHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

  void main() {
    vColor = color;
    vNormal = normal;
    vAO = ao;
    vBlockId = blockId;

    vec3 pos = position;

    // Compute block-local UV for this vertex
    vec3 blockOrigin = floor(pos + 0.001);
    vec3 localPos = pos - blockOrigin;
    if (abs(normal.y) > 0.5) vBlockUV = localPos.xz;
    else if (abs(normal.x) > 0.5) vBlockUV = localPos.yz;
    else vBlockUV = localPos.xy;

    // --- Vertex displacement for surface relief ---
    float bid = blockId;
    float dispAmount = 0.0;

    // Stone blocks: rough displacement
    if (bid == 1.0 || bid == 8.0 || bid == 19.0 || bid == 25.0 || bid == 20.0 || bid == 21.0) {
      dispAmount = 0.03;
    }
    // Dirt/grass: subtle bumps
    if (bid == 2.0 || bid == 3.0) {
      dispAmount = 0.02;
    }
    // Sand/gravel: granular
    if (bid == 6.0 || bid == 15.0) {
      dispAmount = 0.025;
    }
    // Crystal/enchanted: faceted displacement
    if (bid == 12.0 || bid == 26.0 || bid == 31.0) {
      dispAmount = 0.04;
    }
    // Log/bark: strong grain displacement
    if (bid == 4.0 || bid == 50.0 || bid == 52.0) {
      dispAmount = 0.035;
    }

    if (dispAmount > 0.0) {
      float disp = vHash(pos * 7.3) * dispAmount;
      pos += normal * disp;
    }

    // --- Leaf/foliage sway animation ---
    if (bid == 5.0 || bid == 51.0 || bid == 53.0 || bid == 45.0 || bid == 54.0 || bid == 49.0) {
      // Wind sway using world position for phase variation
      float windTime = uTime * 1.5;
      float swayX = sin(pos.x * 1.5 + pos.z * 0.7 + windTime) * 0.06;
      float swayZ = cos(pos.z * 1.3 + pos.x * 0.5 + windTime * 0.8) * 0.04;
      pos.x += swayX;
      pos.z += swayZ;
    }

    // --- Grass sway (top face only, more subtle) ---
    if (bid == 3.0 && normal.y > 0.5) {
      float grassWind = sin(pos.x * 2.0 + pos.z * 1.5 + uTime * 2.0) * 0.015;
      pos.x += grassWind;
    }

    vWorldPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const TERRAIN_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vAO;
  varying float vBlockId;
  varying vec2 vBlockUV;

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

  // --- Block-specific texture generators ---
  vec3 stonePattern(vec2 uv, vec3 base) {
    // Cracked stone with visible layers
    float cracks = smoothstep(0.48, 0.5, abs(noise2D(uv * 8.0) - 0.5));
    float layers = noise2D(uv * vec2(1.0, 6.0)) * 0.08;
    float speckle = noise2D(uv * 20.0) * 0.06;
    return base * (1.0 - cracks * 0.25) + layers + speckle;
  }

  vec3 woodGrainPattern(vec2 uv, vec3 base) {
    // Concentric ring grain pattern
    float rings = sin((uv.y * 12.0 + noise2D(uv * 3.0) * 2.0) * 3.14159) * 0.5 + 0.5;
    rings = smoothstep(0.3, 0.7, rings);
    float grain = noise2D(uv * vec2(2.0, 16.0)) * 0.1;
    float knot = smoothstep(0.85, 0.95, noise2D(uv * 4.0)) * 0.15;
    return mix(base * 0.85, base * 1.15, rings) + grain - knot;
  }

  vec3 grassPattern(vec2 uv, vec3 base) {
    // Grass blade tips and variation
    float blades = noise2D(uv * 30.0) * 0.12;
    float patches = noise2D(uv * 3.0) * 0.08;
    float drySpots = smoothstep(0.7, 0.9, noise2D(uv * 5.0 + 10.0)) * 0.1;
    return base + blades + patches - drySpots;
  }

  vec3 dirtPattern(vec2 uv, vec3 base) {
    // Soil with pebbles and variation
    float pebbles = smoothstep(0.7, 0.75, noise2D(uv * 15.0)) * 0.15;
    float soil = fbm(uv * 4.0) * 0.12;
    return base + soil + pebbles;
  }

  vec3 sandPattern(vec2 uv, vec3 base) {
    // Wind ripples
    float ripples = sin(uv.x * 12.0 + noise2D(uv * 2.0) * 3.0) * 0.04;
    float grain = noise2D(uv * 40.0) * 0.04;
    return base + ripples + grain;
  }

  vec3 crystalPattern(vec2 uv, vec3 base, float time) {
    // Sparkling facets
    float facets = step(0.85, noise2D(uv * 12.0 + time * 0.5)) * 0.4;
    float shimmer = sin(uv.x * 20.0 + uv.y * 15.0 + time * 2.0) * 0.08;
    float glow = fbm(uv * 3.0 + time * 0.3) * 0.1;
    return base + facets + shimmer + glow;
  }

  vec3 orePattern(vec2 uv, vec3 base, vec3 oreColor) {
    // Veins of ore through stone
    float vein = smoothstep(0.55, 0.65, noise2D(uv * 6.0));
    float sparkle = step(0.9, noise2D(uv * 25.0)) * 0.3;
    vec3 stoneBase = stonePattern(uv, base * 0.7);
    return mix(stoneBase, oreColor + sparkle, vein * 0.6);
  }

  // --- Normal perturbation from noise ---
  vec3 perturbNormal(vec3 N, vec2 uv, float strength) {
    float eps = 0.02;
    float h0 = noise2D(uv * 8.0);
    float hx = noise2D((uv + vec2(eps, 0.0)) * 8.0);
    float hy = noise2D((uv + vec2(0.0, eps)) * 8.0);
    vec3 tangent = normalize(cross(N, vec3(0.0, 1.0, 0.1)));
    vec3 bitangent = normalize(cross(N, tangent));
    N += tangent * (hx - h0) * strength + bitangent * (hy - h0) * strength;
    return normalize(N);
  }

  void main() {
    vec3 baseColor = vColor;

    // --- Triplanar UV projection ---
    vec2 uv;
    if (abs(vNormal.y) > 0.5) uv = vWorldPos.xz;
    else if (abs(vNormal.x) > 0.5) uv = vWorldPos.yz;
    else uv = vWorldPos.xy;

    // --- Block-specific procedural textures ---
    float bid = vBlockId;
    float roughness = 0.85;
    float metalness = 0.0;
    float subsurface = 0.0;
    float normalStrength = 3.0;

    // Stone types
    if (bid == 1.0 || bid == 8.0 || bid == 19.0 || bid == 20.0 || bid == 21.0 || bid == 25.0) {
      baseColor = stonePattern(uv, baseColor);
      roughness = 0.9;
      normalStrength = 5.0;
    }
    // Dirt
    else if (bid == 2.0) {
      baseColor = dirtPattern(uv, baseColor);
      roughness = 0.95;
    }
    // Grass (top face gets grass pattern, sides get dirt)
    else if (bid == 3.0) {
      if (abs(vNormal.y) > 0.5) {
        baseColor = grassPattern(uv, baseColor);
        subsurface = 0.35;
        roughness = 0.7;
      } else {
        baseColor = dirtPattern(uv, baseColor * 0.85);
        roughness = 0.9;
      }
    }
    // Wood logs
    else if (bid == 4.0 || bid == 50.0 || bid == 52.0) {
      baseColor = woodGrainPattern(uv, baseColor);
      roughness = 0.75;
      normalStrength = 4.0;
    }
    // Wood planks
    else if (bid == 9.0) {
      vec2 plankUV = uv * vec2(1.0, 0.25);
      float plankLine = smoothstep(0.47, 0.5, abs(fract(uv.y * 4.0) - 0.5));
      baseColor = woodGrainPattern(plankUV, baseColor) - plankLine * 0.06;
      roughness = 0.7;
    }
    // Leaves
    else if (bid == 5.0 || bid == 51.0 || bid == 53.0) {
      float leaf = noise2D(uv * 12.0) * 0.15;
      float holes = step(0.8, noise2D(uv * 8.0)) * 0.2;
      baseColor += leaf - holes;
      subsurface = 0.5;
      roughness = 0.6;
    }
    // Sand
    else if (bid == 6.0) {
      baseColor = sandPattern(uv, baseColor);
      roughness = 0.85;
    }
    // Iron ore
    else if (bid == 10.0) {
      baseColor = orePattern(uv, baseColor, vec3(0.75, 0.6, 0.5));
      roughness = 0.5; metalness = 0.5;
    }
    // Gold ore
    else if (bid == 11.0) {
      baseColor = orePattern(uv, baseColor, vec3(0.9, 0.75, 0.2));
      roughness = 0.35; metalness = 0.7;
    }
    // Crystal
    else if (bid == 12.0 || bid == 26.0 || bid == 31.0) {
      baseColor = crystalPattern(uv, baseColor, uTime);
      roughness = 0.15; metalness = 0.3;
      normalStrength = 8.0;
    }
    // Iron/gold blocks (polished metal)
    else if (bid == 29.0 || bid == 30.0) {
      float brushed = sin(uv.y * 60.0 + noise2D(uv * 3.0) * 5.0) * 0.03;
      baseColor += brushed;
      roughness = bid == 30.0 ? 0.25 : 0.35;
      metalness = bid == 30.0 ? 0.95 : 0.8;
      normalStrength = 2.0;
    }
    // Gravel
    else if (bid == 15.0) {
      float pebble = smoothstep(0.5, 0.6, noise2D(uv * 10.0)) * 0.15;
      baseColor += pebble + noise2D(uv * 30.0) * 0.06;
      roughness = 0.95;
      normalStrength = 6.0;
    }
    // Tall grass / flowers
    else if (bid == 45.0 || bid == 54.0) {
      subsurface = 0.5;
      roughness = 0.6;
    }
    // Default: apply basic FBM
    else {
      float texNoise = fbm(uv * 2.0) * 0.15 - 0.075;
      baseColor += texNoise;
    }

    // Per-block hash variation (always)
    vec3 blockPos = floor(vWorldPos + 0.001);
    float blockVar = hash3(blockPos) * 0.06 - 0.03;
    baseColor += blockVar;

    // Edge darkening (mortar lines)
    vec2 blockUV = vBlockUV;
    float edgeDist = min(min(blockUV.x, 1.0 - blockUV.x), min(blockUV.y, 1.0 - blockUV.y));
    float edgeDarken = smoothstep(0.0, 0.05, edgeDist) * 0.18 + 0.82;
    baseColor *= edgeDarken;

    // --- Wet surface darkening ---
    if (uWetness > 0.0 && vNormal.y > 0.3) {
      baseColor *= (1.0 - uWetness * 0.3);
      roughness *= (1.0 - uWetness * 0.5);
    }

    // --- PBR Lighting with perturbed normals ---
    vec3 N = perturbNormal(normalize(vNormal), uv, normalStrength);
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

export function buildChunkMesh(chunk: CraftChunk, state: CraftState, lodLevel = SUBDIV): THREE.Mesh | null {
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

          const tgt = isBlockTransparent
            ? { p: tPositions, c: tColors, n: tNormals }
            : { p: positions, c: colors, n: normals };

          // Subdivided face: SUBDIV x SUBDIV grid of quads
          const subdiv = isBlockTransparent ? 1 : lodLevel; // LOD: lower for distant chunks
          const step = 1.0 / subdiv;

          // Determine the two tangent axes for this face
          // Face verts define a quad; compute axis vectors
          const fv = FACE_VERTS[face];
          // Corner positions: fv[0]=v0, fv[1]=v1, fv[2]=v2 (first triangle)
          // Axis U = v2 - v0 direction, Axis V = v1 - v0 direction
          // But face verts are [x,y,z] offsets in [0,1] space
          const u0x = fv[5][0], u0y = fv[5][1], u0z = fv[5][2]; // bottom-right corner
          const uAx = fv[0][0] - u0x, uAy = fv[0][1] - u0y, uAz = fv[0][2] - u0z;
          const vAx = fv[1][0] - fv[0][0], vAy = fv[1][1] - fv[0][1], vAz = fv[1][2] - fv[0][2];

          // Compute AO at the 4 corners for interpolation
          let ao00 = 1.0, ao10 = 1.0, ao01 = 1.0, ao11 = 1.0;
          if (!isBlockTransparent) {
            ao00 = computeVertexAO(chunk, state, x, y, z, face, u0x, u0y, u0z, ox, oz);
            ao10 = computeVertexAO(chunk, state, x, y, z, face, u0x + uAx, u0y + uAy, u0z + uAz, ox, oz);
            ao01 = computeVertexAO(chunk, state, x, y, z, face, u0x + vAx, u0y + vAy, u0z + vAz, ox, oz);
            ao11 = computeVertexAO(chunk, state, x, y, z, face,
              u0x + uAx + vAx, u0y + uAy + vAy, u0z + uAz + vAz, ox, oz);
          }

          for (let su = 0; su < subdiv; su++) {
            for (let sv = 0; sv < subdiv; sv++) {
              const u1 = su * step, u2 = (su + 1) * step;
              const v1 = sv * step, v2 = (sv + 1) * step;

              // 6 vertices per sub-quad (2 triangles)
              const subVerts = [
                [u1, v1], [u1, v2], [u2, v2],
                [u1, v1], [u2, v2], [u2, v1],
              ];

              for (const [uu, vv] of subVerts) {
                const px = x + u0x + uAx * uu + vAx * vv + ox;
                const py = y + u0y + uAy * uu + vAy * vv;
                const pz = z + u0z + uAz * uu + vAz * vv + oz;

                tgt.p.push(px, py, pz);
                tgt.c.push(r, g, b);
                tgt.n.push(nx, ny, nz);

                if (!isBlockTransparent) {
                  // Bilinear AO interpolation
                  const aoVal = ao00 * (1 - uu) * (1 - vv) +
                                ao10 * uu * (1 - vv) +
                                ao01 * (1 - uu) * vv +
                                ao11 * uu * vv;
                  aoValues.push(aoVal);
                  blockIds.push(block);
                }
              }
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
        // Simple hash for foam
        float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float wNoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(wHash(i), wHash(i+vec2(1,0)), f.x), mix(wHash(i+vec2(0,1)), wHash(i+vec2(1,1)), f.x), f.y);
        }

        void main() {
          vec3 col = vColor;

          // Multi-layer shimmer
          float shimmer = sin(vWorldPos.x * 4.0 + uTime * 2.0) * cos(vWorldPos.z * 4.0 + uTime * 1.5) * 0.06;
          float shimmer2 = sin(vWorldPos.x * 8.0 - uTime * 1.2) * cos(vWorldPos.z * 6.0 + uTime * 0.8) * 0.03;
          col += shimmer + shimmer2;

          // --- Foam at shallow water edges ---
          // Foam appears where water is at the surface level (block-edge proximity)
          vec2 blockUV = fract(vWorldPos.xz);
          float edgeDist = min(min(blockUV.x, 1.0 - blockUV.x), min(blockUV.y, 1.0 - blockUV.y));
          float foamNoise = wNoise(vWorldPos.xz * 6.0 + uTime * 0.5);
          float foam = smoothstep(0.15, 0.0, edgeDist) * foamNoise * 0.6;
          col = mix(col, vec3(0.9, 0.95, 1.0), foam); // white foam

          // Caustics pattern (light ripples on water surface)
          float caustic = wNoise(vWorldPos.xz * 3.0 + uTime * vec2(0.3, 0.2));
          float caustic2 = wNoise(vWorldPos.xz * 3.0 - uTime * vec2(0.2, 0.35));
          float causticPattern = pow(min(caustic, caustic2), 2.0) * 0.3;
          col += causticPattern;

          // Fresnel edge transparency
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);
          float alpha = mix(0.45, 0.85, fresnel);
          alpha += foam * 0.3; // foam is more opaque

          // Specular highlight on water
          vec3 sunDir = normalize(vec3(0.5, 0.8, 0.3));
          vec3 halfDir = normalize(sunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 128.0) * 0.5;
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
