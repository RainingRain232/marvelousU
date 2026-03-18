// ---------------------------------------------------------------------------
// Camelot Craft – Chunk mesh builder (greedy-ish face culling)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "../config/CraftBalance";
import { BlockType, BLOCK_DEFS, isTransparent } from "../config/CraftBlockDefs";
import { CraftChunk } from "../state/CraftChunk";
import type { CraftState } from "../state/CraftState";
import { getWorldBlock } from "../state/CraftState";

const S = CB.CHUNK_SIZE;
const H = CB.CHUNK_HEIGHT;

/** Face direction enum. */
const enum Face {
  PX = 0, // +X
  NX = 1, // -X
  PY = 2, // +Y (top)
  NY = 3, // -Y (bottom)
  PZ = 4, // +Z
  NZ = 5, // -Z
}

// Normal vectors for each face
const NORMALS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

// Vertex offsets for each face (two triangles = 6 vertices, CCW winding)
const FACE_VERTS: [number, number, number][][] = [
  // +X
  [[1,0,1],[1,1,1],[1,1,0],[1,0,1],[1,1,0],[1,0,0]],
  // -X
  [[0,0,0],[0,1,0],[0,1,1],[0,0,0],[0,1,1],[0,0,1]],
  // +Y (top)
  [[0,1,0],[1,1,0],[1,1,1],[0,1,0],[1,1,1],[0,1,1]],
  // -Y (bottom)
  [[0,0,1],[1,0,1],[1,0,0],[0,0,1],[1,0,0],[0,0,0]],
  // +Z
  [[0,0,1],[0,1,1],[1,1,1],[0,0,1],[1,1,1],[1,0,1]],
  // -Z
  [[1,0,0],[1,1,0],[0,1,0],[1,0,0],[0,1,0],[0,0,0]],
];

/**
 * Build a Three.js mesh for a single chunk using face-culled block geometry.
 * Only emits faces where a solid block is adjacent to a transparent block.
 */
export function buildChunkMesh(chunk: CraftChunk, state: CraftState): THREE.Mesh | null {
  const positions: number[] = [];
  const colors: number[] = [];
  const normals: number[] = [];

  // Transparent geometry (leaves, water, etc.)
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

        // Check each face
        for (let face = 0; face < 6; face++) {
          const [nx, ny, nz] = NORMALS[face];
          const adjX = x + nx;
          const adjY = y + ny;
          const adjZ = z + nz;

          // Get adjacent block (may cross chunk boundary)
          let adjBlock: BlockType;
          if (adjX >= 0 && adjX < S && adjY >= 0 && adjY < H && adjZ >= 0 && adjZ < S) {
            adjBlock = chunk.getBlock(adjX, adjY, adjZ);
          } else {
            adjBlock = getWorldBlock(state, wx + nx, adjY, wz + nz);
          }

          // Only render face if adjacent block is transparent (or different transparency type)
          const adjTransparent = isTransparent(adjBlock);
          if (!adjTransparent) continue;
          if (isBlockTransparent && adjBlock === block) continue; // don't render face between same transparent blocks

          // Determine face color
          let color: number;
          if (face === Face.PY && def.topColor !== undefined) {
            color = def.topColor;
          } else if ((face === Face.PX || face === Face.NX || face === Face.PZ || face === Face.NZ) && def.sideColor !== undefined) {
            color = def.sideColor;
          } else {
            color = def.color;
          }

          // Simple ambient occlusion: darken bottom face and sides slightly
          let shade = 1.0;
          if (face === Face.NY) shade = 0.5;
          else if (face === Face.PY) shade = 1.0;
          else if (face === Face.NX || face === Face.NZ) shade = 0.7;
          else shade = 0.85;

          const r = ((color >> 16) & 0xFF) / 255 * shade;
          const g = ((color >> 8) & 0xFF) / 255 * shade;
          const b = (color & 0xFF) / 255 * shade;

          const verts = FACE_VERTS[face];
          const tgt = isBlockTransparent ? { p: tPositions, c: tColors, n: tNormals } : { p: positions, c: colors, n: normals };

          for (const [vx, vy, vz] of verts) {
            tgt.p.push(x + vx + ox, y + vy, z + vz + oz);
            tgt.c.push(r, g, b);
            tgt.n.push(nx, ny, nz);
          }
        }
      }
    }
  }

  // Create solid mesh
  const group = new THREE.Group();

  if (positions.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));

    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
  }

  // Create transparent mesh (water uses animated shader)
  if (tPositions.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(tPositions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(tColors, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(tNormals, 3));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vWorldPos;
        uniform float uTime;
        void main() {
          vColor = color;
          vec3 pos = position;
          // Wave animation on Y for water surfaces (top faces)
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
        uniform float uTime;
        void main() {
          vec3 col = vColor;
          // Subtle shimmer
          float shimmer = sin(vWorldPos.x * 4.0 + uTime * 2.0) * cos(vWorldPos.z * 4.0 + uTime * 1.5) * 0.08;
          col += shimmer;
          gl_FragColor = vec4(col, 0.65);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = "water";
    group.add(mesh);
  }

  if (group.children.length === 0) return null;

  // Return as single mesh via merging, or just return the group as a Mesh-like object
  // We'll use Object3D but type it loosely. The renderer handles it.
  return group as unknown as THREE.Mesh;
}

/**
 * Dispose of a chunk mesh and its geometry/materials.
 */
export function disposeChunkMesh(mesh: THREE.Object3D): void {
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}
