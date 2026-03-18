// ---------------------------------------------------------------------------
// Camelot Craft – Main Three.js renderer
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "../config/CraftBalance";
import { BlockType, BLOCK_DEFS } from "../config/CraftBlockDefs";
import { MOB_DEFS } from "../config/CraftMobDefs";
import type { CraftState } from "../state/CraftState";
import { getWorldBlock } from "../state/CraftState";
import { chunkKey, worldToChunk } from "../state/CraftChunk";
import { buildChunkMesh, disposeChunkMesh, updateTerrainUniforms } from "./CraftChunkMesh";
import { CraftCameraController } from "./CraftCameraController";
import { CraftSkybox } from "./CraftSkybox";
import { getSunlight, getSunAngle, getFogColor } from "../systems/CraftDayNightSystem";
import { getDroppedItems } from "../systems/CraftItemDropSystem";
import { CraftParticles } from "./CraftParticles";
import { CraftMobRenderer } from "./CraftMobRenderer";
import { CraftWeather } from "./CraftWeather";
import { CraftPostProcessing } from "./CraftPostProcessing";

export class CraftRenderer {
  private _renderer!: THREE.WebGLRenderer;
  private _scene!: THREE.Scene;
  private _cameraCtrl = new CraftCameraController();
  private _skybox = new CraftSkybox();
  private _particles = new CraftParticles();
  private _mobRenderer = new CraftMobRenderer();
  private _weather = new CraftWeather();
  private _postProcess!: CraftPostProcessing;

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

  /** Water animation timer. */
  private _waterTime = 0;

  /** Dynamic torch lights. */
  private _torchLights: THREE.PointLight[] = [];
  private _torchLightTimer = 0;

  /** Dropped item meshes. */
  private _dropMeshes = new Map<number, THREE.Mesh>();
  private _dropGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);

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
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.setClearColor(0x87CEEB);
    document.body.appendChild(this._renderer.domElement);
    this._renderer.domElement.style.position = "fixed";
    this._renderer.domElement.style.top = "0";
    this._renderer.domElement.style.left = "0";
    this._renderer.domElement.style.zIndex = "0";

    // Post-processing
    this._postProcess = new CraftPostProcessing(this._renderer, window.innerWidth, window.innerHeight);

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
    this._dirLight.castShadow = true;
    this._scene.add(this._dirLight);
    this._scene.add(this._dirLight.target);

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

    // Weather system
    this._weather.build();
    this._scene.add(this._weather.group);

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
    this._postProcess.resize(w, h);
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

    // Update terrain PBR shader uniforms
    const sunDirVec = new THREE.Vector3(
      Math.cos(sunAngle) * 200, Math.sin(sunAngle) * 200, 50,
    ).normalize();
    const sunCol = new THREE.Color(sunHorizon < 0.3 ? 0xFF8844 : 0xFFEECC);
    updateTerrainUniforms(sunDirVec, sunCol, 0.15 + sunlight * 0.35, this._waterTime);

    // Enable shadow mapping
    this._dirLight.castShadow = true;
    this._dirLight.shadow.mapSize.set(1024, 1024);
    this._dirLight.shadow.camera.near = 1;
    this._dirLight.shadow.camera.far = 200;
    const shadowSize = 60;
    this._dirLight.shadow.camera.left = -shadowSize;
    this._dirLight.shadow.camera.right = shadowSize;
    this._dirLight.shadow.camera.top = shadowSize;
    this._dirLight.shadow.camera.bottom = -shadowSize;
    // Center shadow camera on player
    this._dirLight.target.position.copy(state.player.position);
    this._dirLight.position.copy(state.player.position).add(sunDirVec.clone().multiplyScalar(100));

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

    // Update dynamic torch lights (scan every 30 frames)
    this._torchLightTimer++;
    if (this._torchLightTimer % 30 === 0) {
      this._updateTorchLights(state);
    }
    // Flicker existing torch lights
    for (const light of this._torchLights) {
      light.intensity = 0.8 + Math.random() * 0.4; // subtle flicker
    }

    // Update water animation time
    this._waterTime += dt;
    for (const [, mesh] of this._chunkMeshes) {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === "water" && child.material instanceof THREE.ShaderMaterial) {
          child.material.uniforms.uTime.value = this._waterTime;
        }
      });
    }

    // Update selection box
    this._updateSelection(state);

    // Dropped items
    this._updateDroppedItems();

    // Particles
    this._particles.update(dt);

    // Weather
    this._weather.update(dt, state.player.position, state.timeOfDay);
    this._fog.density = 0.008 * this._weather.getWeatherFogMultiplier();
    this._ambientLight.intensity = (0.15 + sunlight * 0.55) * this._weather.getAmbientDimming();

    // Render with post-processing (SSAO, bloom, tone mapping, vignette)
    this._postProcess.render(this._scene, this._cameraCtrl.camera, dt);
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

  private _updateDroppedItems(): void {
    const items = getDroppedItems();
    const activeIds = new Set<number>();

    for (const drop of items) {
      activeIds.add(drop.id);
      let mesh = this._dropMeshes.get(drop.id);
      if (!mesh) {
        const mat = new THREE.MeshLambertMaterial({ color: drop.item.color });
        mesh = new THREE.Mesh(this._dropGeo, mat);
        this._scene.add(mesh);
        this._dropMeshes.set(drop.id, mesh);
      }
      // Floating bob animation
      mesh.position.copy(drop.position);
      mesh.position.y += 0.3 + Math.sin(drop.bobPhase) * 0.15;
      mesh.rotation.y = drop.bobPhase * 0.5;
    }

    // Remove despawned items
    for (const [id, mesh] of this._dropMeshes) {
      if (!activeIds.has(id)) {
        this._scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
        this._dropMeshes.delete(id);
      }
    }
  }

  private _updateTorchLights(state: CraftState): void {
    // Remove old torch lights
    for (const light of this._torchLights) {
      this._scene.remove(light);
      light.dispose();
    }
    this._torchLights = [];

    // Scan a small area around the player for torch/light-emitting blocks
    const px = Math.floor(state.player.position.x);
    const py = Math.floor(state.player.position.y);
    const pz = Math.floor(state.player.position.z);
    const scanRange = 12;
    const maxLights = 8; // limit for performance

    for (let dx = -scanRange; dx <= scanRange && this._torchLights.length < maxLights; dx += 3) {
      for (let dz = -scanRange; dz <= scanRange && this._torchLights.length < maxLights; dz += 3) {
        for (let dy = -8; dy <= 8 && this._torchLights.length < maxLights; dy += 2) {
          const wx = px + dx, wy = py + dy, wz = pz + dz;
          const block = getWorldBlock(state, wx, wy, wz);
          const def = BLOCK_DEFS[block];
          if (def && def.lightEmit >= 10) {
            const color = block === BlockType.ENCHANTED_TORCH ? 0x9C27B0 :
                          block === BlockType.TORCH ? 0xFFA726 :
                          block === BlockType.HOLY_STONE ? 0xFFF8DC : 0xFFBB00;
            const light = new THREE.PointLight(color, 1.0, def.lightEmit);
            light.position.set(wx + 0.5, wy + 0.5, wz + 0.5);
            this._scene.add(light);
            this._torchLights.push(light);
          }
        }
      }
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

    // Particles, Weather & Post-processing
    this._particles.destroy();
    this._weather.destroy();
    this._postProcess.destroy();

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
