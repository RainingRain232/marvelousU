// ---------------------------------------------------------------------------
// Camelot Craft – Main Three.js renderer
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "../config/CraftBalance";
import { MOB_DEFS } from "../config/CraftMobDefs";
import type { CraftState } from "../state/CraftState";
import { chunkKey, worldToChunk } from "../state/CraftChunk";
import { buildChunkMesh, disposeChunkMesh } from "./CraftChunkMesh";
import { CraftCameraController } from "./CraftCameraController";
import { CraftSkybox } from "./CraftSkybox";
import { getSunlight, getSunAngle, getFogColor } from "../systems/CraftDayNightSystem";
import { CraftParticles } from "./CraftParticles";
import { CraftMobRenderer } from "./CraftMobRenderer";

export class CraftRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _cameraCtrl = new CraftCameraController();
  private _skybox = new CraftSkybox();
  private _particles = new CraftParticles();
  private _mobRenderer = new CraftMobRenderer();

  /** Chunk meshes keyed by chunk key. */
  private _chunkMeshes = new Map<string, THREE.Object3D>();

  /** Mob meshes keyed by mob id. */
  private _mobMeshes = new Map<number, THREE.Mesh>();

  /** Lighting. */
  private _ambientLight!: THREE.AmbientLight;
  private _dirLight!: THREE.DirectionalLight;

  /** Block selection wireframe. */
  private _selectionBox!: THREE.LineSegments;

  /** Mining crack overlay mesh. */
  private _crackMesh!: THREE.Mesh;
  private _crackMaterial!: THREE.MeshBasicMaterial;

  /** Crosshair element. */
  private _crosshair!: HTMLDivElement;

  /** Fog reference. */
  private _fog!: THREE.FogExp2;

  get camera(): THREE.PerspectiveCamera {
    return this._cameraCtrl.camera;
  }

  get cameraCtrl(): CraftCameraController {
    return this._cameraCtrl;
  }

  get particles(): CraftParticles {
    return this._particles;
  }

  build(): void {
    // WebGL renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = false;
    this._renderer.setClearColor(0x87CEEB);
    document.body.appendChild(this._renderer.domElement);
    this._renderer.domElement.style.position = "fixed";
    this._renderer.domElement.style.top = "0";
    this._renderer.domElement.style.left = "0";
    this._renderer.domElement.style.zIndex = "0";

    // Scene
    this._scene = new THREE.Scene();

    // Fog
    this._fog = new THREE.FogExp2(0xC8D8E8, 0.008);
    this._scene.fog = this._fog;

    // Lighting
    this._ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
    this._scene.add(this._ambientLight);

    this._dirLight = new THREE.DirectionalLight(0xFFEECC, 0.8);
    this._dirLight.position.set(100, 200, 50);
    this._scene.add(this._dirLight);

    // Skybox
    this._skybox.build();
    this._scene.add(this._skybox.group);

    // Selection box
    const boxGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(boxGeo);
    this._selectionBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
    this._selectionBox.visible = false;
    this._scene.add(this._selectionBox);

    // Particle system
    this._scene.add(this._particles.group);

    // Mining crack overlay (semi-transparent dark box that shrinks as you mine)
    const crackGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    this._crackMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0, depthWrite: false, side: THREE.FrontSide,
    });
    this._crackMesh = new THREE.Mesh(crackGeo, this._crackMaterial);
    this._crackMesh.visible = false;
    this._scene.add(this._crackMesh);

    // Crosshair
    this._crosshair = document.createElement("div");
    this._crosshair.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      width:2px; height:20px; background:white; pointer-events:none; z-index:10;
      box-shadow: 0 0 2px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(this._crosshair);

    const crossH = document.createElement("div");
    crossH.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      width:20px; height:2px; background:white; pointer-events:none; z-index:10;
      box-shadow: 0 0 2px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(crossH);

    // Resize handler
    window.addEventListener("resize", this._onResize);
  }

  private _onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer.setSize(w, h);
    this._cameraCtrl.resize(w, h);
  };

  /** Main render call. */
  render(state: CraftState, dt: number): void {
    // Update camera
    this._cameraCtrl.update(state, dt);

    // Update lighting for time of day
    const sunlight = getSunlight(state.timeOfDay);
    const sunAngle = getSunAngle(state.timeOfDay);

    this._ambientLight.intensity = 0.15 + sunlight * 0.55;
    this._dirLight.intensity = sunlight * 0.9;
    this._dirLight.position.set(
      Math.cos(sunAngle) * 200,
      Math.sin(sunAngle) * 200,
      50,
    );

    // Sun color shifts
    const sunHorizon = Math.abs(Math.sin(sunAngle));
    this._dirLight.color.setHex(sunHorizon < 0.3 ? 0xFF8844 : 0xFFEECC);

    // Fog updates
    const fogColor = getFogColor(state.timeOfDay, 0xC8D8E8);
    this._fog.color.setHex(fogColor);
    this._renderer.setClearColor(fogColor);

    // Skybox
    this._skybox.update(state.timeOfDay, state.player.position);

    // Update chunk meshes
    this._updateChunks(state);

    // Update mob meshes
    this._updateMobs(state, dt);

    // Update selection box
    this._updateSelection(state);

    // Particles
    this._particles.update(dt);

    // Render
    this._renderer.render(this._scene, this._cameraCtrl.camera);
  }

  private _updateChunks(state: CraftState): void {
    const pcx = worldToChunk(Math.floor(state.player.position.x));
    const pcz = worldToChunk(Math.floor(state.player.position.z));
    const rd = CB.RENDER_DISTANCE;

    // Track which chunks should be visible
    const visible = new Set<string>();

    for (let dx = -rd; dx <= rd; dx++) {
      for (let dz = -rd; dz <= rd; dz++) {
        if (dx * dx + dz * dz > rd * rd) continue;
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = chunkKey(cx, cz);
        visible.add(key);

        const chunk = state.chunks.get(key);
        if (!chunk || !chunk.populated) continue;

        // Rebuild mesh if dirty
        if (chunk.dirty || !this._chunkMeshes.has(key)) {
          // Remove old mesh
          const old = this._chunkMeshes.get(key);
          if (old) {
            this._scene.remove(old);
            disposeChunkMesh(old);
          }

          const mesh = buildChunkMesh(chunk, state);
          if (mesh) {
            this._scene.add(mesh);
            this._chunkMeshes.set(key, mesh);
          } else {
            this._chunkMeshes.delete(key);
          }
          chunk.dirty = false;
        }
      }
    }

    // Remove meshes for chunks that are no longer visible
    for (const [key, mesh] of this._chunkMeshes) {
      if (!visible.has(key)) {
        this._scene.remove(mesh);
        disposeChunkMesh(mesh);
        this._chunkMeshes.delete(key);
      }
    }
  }

  private _updateMobs(state: CraftState, dt: number): void {
    const activeMobIds = new Set<number>();

    for (const mob of state.mobs) {
      activeMobIds.add(mob.id);
      let mesh = this._mobMeshes.get(mob.id);

      if (!mesh) {
        // Create multi-part mob mesh
        const group = this._mobRenderer.createMobMesh(mob.type);
        this._scene.add(group);
        this._mobMeshes.set(mob.id, group as unknown as THREE.Mesh);
        mesh = group as unknown as THREE.Mesh;
      }

      // Update position
      const def = MOB_DEFS[mob.type];
      mesh.position.copy(mob.position);
      mesh.position.y += def.bodyHeight / 2;
      mesh.rotation.y = mob.yaw;

      // Animate limbs
      this._mobRenderer.animateMob(mesh as unknown as THREE.Group, mob, dt);

      // Flash when hurt
      if (mob.hurtTimer > 0) {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
            child.material.emissive.setHex(0xFF4444);
            child.material.emissiveIntensity = mob.hurtTimer * 4;
          }
        });
      } else {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshLambertMaterial) {
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        });
      }
    }

    // Remove dead mob meshes
    for (const [id, mesh] of this._mobMeshes) {
      if (!activeMobIds.has(id)) {
        this._scene.remove(mesh);
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
        this._mobMeshes.delete(id);
      }
    }
  }

  private _updateSelection(state: CraftState): void {
    const target = state.player.miningTarget;
    if (target) {
      this._selectionBox.position.set(target.wx + 0.5, target.wy + 0.5, target.wz + 0.5);
      this._selectionBox.visible = true;

      // Mining crack overlay — darkens as progress increases
      if (target.progress > 0) {
        this._crackMesh.position.set(target.wx + 0.5, target.wy + 0.5, target.wz + 0.5);
        this._crackMesh.visible = true;
        this._crackMaterial.opacity = target.progress * 0.6;
        // Slight scale pulse for visual feedback
        const pulse = 1.01 + Math.sin(target.progress * Math.PI * 8) * 0.005;
        this._crackMesh.scale.setScalar(pulse);
      } else {
        this._crackMesh.visible = false;
      }
    } else {
      this._selectionBox.visible = false;
      this._crackMesh.visible = false;
    }
  }

  /** Show selection box at world position. */
  showSelection(wx: number, wy: number, wz: number): void {
    this._selectionBox.position.set(wx + 0.5, wy + 0.5, wz + 0.5);
    this._selectionBox.visible = true;
  }

  hideSelection(): void {
    this._selectionBox.visible = false;
  }

  destroy(): void {
    window.removeEventListener("resize", this._onResize);

    // Dispose all chunk meshes
    for (const [, mesh] of this._chunkMeshes) {
      this._scene.remove(mesh);
      disposeChunkMesh(mesh);
    }
    this._chunkMeshes.clear();

    // Dispose mob meshes
    for (const [, mesh] of this._mobMeshes) {
      this._scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this._mobMeshes.clear();

    // Particles
    this._particles.destroy();

    // Skybox
    this._skybox.destroy();

    // Selection box + crack overlay
    this._selectionBox.geometry.dispose();
    (this._selectionBox.material as THREE.Material).dispose();
    this._crackMesh.geometry.dispose();
    this._crackMaterial.dispose();

    // Renderer
    this._renderer.dispose();
    this._renderer.domElement.remove();

    // Crosshair
    this._crosshair?.remove();
    // Remove the horizontal crosshair too
    document.querySelectorAll("div").forEach((el) => {
      if (el.style.width === "20px" && el.style.height === "2px" && el.style.position === "fixed") {
        el.remove();
      }
    });
  }
}
