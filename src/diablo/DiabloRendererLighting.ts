import * as THREE from 'three';
import { TimeOfDay, DiabloMapId } from './DiabloTypes';

export interface TimeOfDayContext {
  dirLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  hemiLight: THREE.HemisphereLight;
  groundPlane: THREE.Mesh;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  skyDome: THREE.Mesh | null;
}

export function applyTimeOfDay(ctx: TimeOfDayContext, tod: TimeOfDay, mapId: DiabloMapId): void {
    // Adjust directional light position based on time
    switch (tod) {
      case TimeOfDay.DAY:
        ctx.dirLight.position.set(15, 25, 10);
        break;
      case TimeOfDay.DAWN:
        ctx.dirLight.position.set(25, 12, 10);
        break;
      case TimeOfDay.DUSK:
        ctx.dirLight.position.set(-25, 10, -10);
        break;
      case TimeOfDay.NIGHT:
        ctx.dirLight.position.set(10, 20, 15);
        break;
    }

    const groundMat = ctx.groundPlane.material as THREE.MeshStandardMaterial;

    if (mapId === DiabloMapId.FOREST) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xffe8b0);
          ctx.dirLight.intensity = 1.4;
          ctx.ambientLight.color.setHex(0x304020);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0x88aa66);
          ctx.hemiLight.groundColor.setHex(0x443322);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x2a4a2a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.018;
          ctx.renderer.toneMappingExposure = 1.0;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xffaa77);
          ctx.dirLight.intensity = 1.1;
          ctx.ambientLight.color.setHex(0x553322);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0xcc8866);
          ctx.hemiLight.groundColor.setHex(0x332211);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x443322);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.015;
          groundMat.color.setHex(0x4a5a30);
          ctx.renderer.toneMappingExposure = 0.95;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xff6633);
          ctx.dirLight.intensity = 0.8;
          ctx.ambientLight.color.setHex(0x331a10);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0x995533);
          ctx.hemiLight.groundColor.setHex(0x221111);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x331a15);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.022;
          groundMat.color.setHex(0x3a4a25);
          ctx.renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x4466aa);
          ctx.dirLight.intensity = 0.4;
          ctx.ambientLight.color.setHex(0x0a0a1a);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0x223355);
          ctx.hemiLight.groundColor.setHex(0x111108);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x0a1a0a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.025;
          groundMat.color.setHex(0x1a2a15);
          ctx.renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.ELVEN_VILLAGE) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xaabbdd);
          ctx.dirLight.intensity = 0.8;
          ctx.ambientLight.color.setHex(0x334466);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0x6688bb);
          ctx.hemiLight.groundColor.setHex(0x223322);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x334466);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.012;
          ctx.renderer.toneMappingExposure = 1.0;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xddaa88);
          ctx.dirLight.intensity = 0.7;
          ctx.ambientLight.color.setHex(0x443333);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0xaa7766);
          ctx.hemiLight.groundColor.setHex(0x332222);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x443333);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.014;
          groundMat.color.setHex(0x556644);
          ctx.renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xcc6644);
          ctx.dirLight.intensity = 0.5;
          ctx.ambientLight.color.setHex(0x2a1a2a);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0x774433);
          ctx.hemiLight.groundColor.setHex(0x1a1122);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x2a1a2a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.018;
          groundMat.color.setHex(0x3a5a3a);
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x3355aa);
          ctx.dirLight.intensity = 0.35;
          ctx.ambientLight.color.setHex(0x0a0a22);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0x223366);
          ctx.hemiLight.groundColor.setHex(0x0a0a10);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x0a1022);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.02;
          groundMat.color.setHex(0x2a3a2a);
          ctx.renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.NECROPOLIS_DUNGEON) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0x99aacc);
          ctx.dirLight.intensity = 0.9;
          ctx.ambientLight.color.setHex(0x443355);
          ctx.ambientLight.intensity = 0.7;
          ctx.hemiLight.color.setHex(0x667799);
          ctx.hemiLight.groundColor.setHex(0x332233);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x332244);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.015;
          ctx.renderer.toneMappingExposure = 1.1;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0x664444);
          ctx.dirLight.intensity = 0.35;
          ctx.ambientLight.color.setHex(0x1a0c10);
          ctx.ambientLight.intensity = 0.35;
          ctx.hemiLight.color.setHex(0x332222);
          ctx.hemiLight.groundColor.setHex(0x110808);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x150a10);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.028;
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0x553344);
          ctx.dirLight.intensity = 0.25;
          ctx.ambientLight.color.setHex(0x110810);
          ctx.ambientLight.intensity = 0.25;
          ctx.hemiLight.color.setHex(0x221122);
          ctx.hemiLight.groundColor.setHex(0x0a0505);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x0d060a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.032;
          ctx.renderer.toneMappingExposure = 0.7;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x221133);
          ctx.dirLight.intensity = 0.15;
          ctx.ambientLight.color.setHex(0x080408);
          ctx.ambientLight.intensity = 0.15;
          ctx.hemiLight.color.setHex(0x110818);
          ctx.hemiLight.groundColor.setHex(0x050303);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x080410);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.035;
          groundMat.color.setHex(0x0e0e16);
          ctx.renderer.toneMappingExposure = 0.5;
          break;
      }
    } else if (mapId === DiabloMapId.VOLCANIC_WASTES) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xffaa66);
          ctx.dirLight.intensity = 1.4;
          ctx.ambientLight.color.setHex(0x663322);
          ctx.ambientLight.intensity = 0.7;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x553322);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.012;
          ctx.renderer.toneMappingExposure = 1.15;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xff8844);
          ctx.dirLight.intensity = 0.8;
          ctx.ambientLight.color.setHex(0x331100);
          ctx.ambientLight.intensity = 0.45;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x441500);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.018;
          ctx.renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xcc3311);
          ctx.dirLight.intensity = 0.6;
          ctx.ambientLight.color.setHex(0x220800);
          ctx.ambientLight.intensity = 0.4;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x220800);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.025;
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x882200);
          ctx.dirLight.intensity = 0.3;
          ctx.ambientLight.color.setHex(0x110400);
          ctx.ambientLight.intensity = 0.3;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x110400);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.03;
          ctx.renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.ABYSSAL_RIFT) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0x9977cc);
          ctx.dirLight.intensity = 1.0;
          ctx.ambientLight.color.setHex(0x332266);
          ctx.ambientLight.intensity = 0.65;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x1a1040);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.02;
          ctx.renderer.toneMappingExposure = 1.15;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0x8855bb);
          ctx.dirLight.intensity = 0.5;
          ctx.ambientLight.color.setHex(0x0d0022);
          ctx.ambientLight.intensity = 0.35;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x0d0025);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.032;
          ctx.renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0x442266);
          ctx.dirLight.intensity = 0.35;
          ctx.ambientLight.color.setHex(0x080015);
          ctx.ambientLight.intensity = 0.25;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x060012);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.04;
          ctx.renderer.toneMappingExposure = 0.7;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x220044);
          ctx.dirLight.intensity = 0.2;
          ctx.ambientLight.color.setHex(0x04000a);
          ctx.ambientLight.intensity = 0.15;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x030008);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.045;
          ctx.renderer.toneMappingExposure = 0.5;
          break;
      }
    } else if (mapId === DiabloMapId.DRAGONS_SANCTUM) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xffcc66);
          ctx.dirLight.intensity = 1.5;
          ctx.ambientLight.color.setHex(0x554422);
          ctx.ambientLight.intensity = 0.7;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x443322);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.01;
          ctx.renderer.toneMappingExposure = 1.15;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xdd8833);
          ctx.dirLight.intensity = 0.9;
          ctx.ambientLight.color.setHex(0x221800);
          ctx.ambientLight.intensity = 0.45;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x2a1500);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.013;
          ctx.renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xbb5522);
          ctx.dirLight.intensity = 0.6;
          ctx.ambientLight.color.setHex(0x1a0c00);
          ctx.ambientLight.intensity = 0.35;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x150a00);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.02;
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x553311);
          ctx.dirLight.intensity = 0.3;
          ctx.ambientLight.color.setHex(0x0a0500);
          ctx.ambientLight.intensity = 0.2;
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x080400);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.025;
          ctx.renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.SUNSCORCH_DESERT) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xffeebb);
          ctx.dirLight.intensity = 1.8;
          ctx.ambientLight.color.setHex(0x665533);
          ctx.ambientLight.intensity = 0.7;
          ctx.hemiLight.color.setHex(0xeedd99);
          ctx.hemiLight.groundColor.setHex(0x886644);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0xddcc99);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.008;
          ctx.renderer.toneMappingExposure = 1.1;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xffaa77);
          ctx.dirLight.intensity = 1.2;
          ctx.ambientLight.color.setHex(0x553322);
          ctx.ambientLight.intensity = 0.55;
          ctx.hemiLight.color.setHex(0xcc9966);
          ctx.hemiLight.groundColor.setHex(0x553322);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0xbb9966);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.01;
          groundMat.color.setHex(0xb89960);
          ctx.renderer.toneMappingExposure = 0.95;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xff6633);
          ctx.dirLight.intensity = 0.9;
          ctx.ambientLight.color.setHex(0x442211);
          ctx.ambientLight.intensity = 0.45;
          ctx.hemiLight.color.setHex(0x995533);
          ctx.hemiLight.groundColor.setHex(0x331a10);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x885533);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.012;
          groundMat.color.setHex(0xa08850);
          ctx.renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x4466aa);
          ctx.dirLight.intensity = 0.4;
          ctx.ambientLight.color.setHex(0x111122);
          ctx.ambientLight.intensity = 0.3;
          ctx.hemiLight.color.setHex(0x223355);
          ctx.hemiLight.groundColor.setHex(0x111108);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x151525);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.015;
          groundMat.color.setHex(0x665540);
          ctx.renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.EMERALD_GRASSLANDS) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xfff5dd);
          ctx.dirLight.intensity = 1.6;
          ctx.ambientLight.color.setHex(0x336622);
          ctx.ambientLight.intensity = 0.7;
          ctx.hemiLight.color.setHex(0xbbdd88);
          ctx.hemiLight.groundColor.setHex(0x445522);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0xaaccaa);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.006;
          ctx.renderer.toneMappingExposure = 1.1;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xffbb88);
          ctx.dirLight.intensity = 1.1;
          ctx.ambientLight.color.setHex(0x443322);
          ctx.ambientLight.intensity = 0.55;
          ctx.hemiLight.color.setHex(0xcc9966);
          ctx.hemiLight.groundColor.setHex(0x332211);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x889966);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.008;
          groundMat.color.setHex(0x4a8a2a);
          ctx.renderer.toneMappingExposure = 0.95;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xff7744);
          ctx.dirLight.intensity = 0.8;
          ctx.ambientLight.color.setHex(0x332211);
          ctx.ambientLight.intensity = 0.4;
          ctx.hemiLight.color.setHex(0x996633);
          ctx.hemiLight.groundColor.setHex(0x221a10);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x554433);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.01;
          groundMat.color.setHex(0x3a7a2a);
          ctx.renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x3355aa);
          ctx.dirLight.intensity = 0.35;
          ctx.ambientLight.color.setHex(0x0a0a1a);
          ctx.ambientLight.intensity = 0.25;
          ctx.hemiLight.color.setHex(0x223355);
          ctx.hemiLight.groundColor.setHex(0x0a0a08);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x0a1a0a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.012;
          groundMat.color.setHex(0x1a3a15);
          ctx.renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.WHISPERING_MARSH) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xccddaa);
          ctx.dirLight.intensity = 1.0;
          ctx.ambientLight.color.setHex(0x2a3a22);
          ctx.ambientLight.intensity = 0.5;
          ctx.hemiLight.color.setHex(0x667744);
          ctx.hemiLight.groundColor.setHex(0x332211);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x556644);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.025;
          ctx.renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xbb9966);
          ctx.dirLight.intensity = 0.7;
          ctx.ambientLight.color.setHex(0x332a1a);
          ctx.ambientLight.intensity = 0.4;
          ctx.hemiLight.color.setHex(0x886644);
          ctx.hemiLight.groundColor.setHex(0x221a08);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x443322);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.022;
          groundMat.color.setHex(0x443322);
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0x886633);
          ctx.dirLight.intensity = 0.5;
          ctx.ambientLight.color.setHex(0x1a1a10);
          ctx.ambientLight.intensity = 0.3;
          ctx.hemiLight.color.setHex(0x664422);
          ctx.hemiLight.groundColor.setHex(0x110a08);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x332211);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.03;
          groundMat.color.setHex(0x332211);
          ctx.renderer.toneMappingExposure = 0.7;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x334422);
          ctx.dirLight.intensity = 0.2;
          ctx.ambientLight.color.setHex(0x0a0a08);
          ctx.ambientLight.intensity = 0.15;
          ctx.hemiLight.color.setHex(0x223311);
          ctx.hemiLight.groundColor.setHex(0x0a0a05);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x111108);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.035;
          groundMat.color.setHex(0x111108);
          ctx.renderer.toneMappingExposure = 0.45;
          break;
      }
    } else if (mapId === DiabloMapId.CRYSTAL_CAVERNS) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0x8899bb);
          ctx.dirLight.intensity = 0.6;
          ctx.ambientLight.color.setHex(0x223355);
          ctx.ambientLight.intensity = 0.5;
          ctx.hemiLight.color.setHex(0x5566aa);
          ctx.hemiLight.groundColor.setHex(0x222233);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x334466);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.02;
          ctx.renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0x776688);
          ctx.dirLight.intensity = 0.5;
          ctx.ambientLight.color.setHex(0x1a2244);
          ctx.ambientLight.intensity = 0.4;
          ctx.hemiLight.color.setHex(0x445588);
          ctx.hemiLight.groundColor.setHex(0x1a1a22);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x2a3355);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.022;
          groundMat.color.setHex(0x2a3355);
          ctx.renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0x665577);
          ctx.dirLight.intensity = 0.4;
          ctx.ambientLight.color.setHex(0x111833);
          ctx.ambientLight.intensity = 0.35;
          ctx.hemiLight.color.setHex(0x334477);
          ctx.hemiLight.groundColor.setHex(0x111122);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x222244);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.025;
          groundMat.color.setHex(0x222244);
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x443366);
          ctx.dirLight.intensity = 0.3;
          ctx.ambientLight.color.setHex(0x0a0a22);
          ctx.ambientLight.intensity = 0.25;
          ctx.hemiLight.color.setHex(0x223355);
          ctx.hemiLight.groundColor.setHex(0x0a0a11);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x1a1a33);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.028;
          groundMat.color.setHex(0x1a1a33);
          ctx.renderer.toneMappingExposure = 0.7;
          break;
      }
    } else if (mapId === DiabloMapId.FROZEN_TUNDRA) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xddeeff);
          ctx.dirLight.intensity = 1.6;
          ctx.ambientLight.color.setHex(0x556688);
          ctx.ambientLight.intensity = 0.7;
          ctx.hemiLight.color.setHex(0xaaccee);
          ctx.hemiLight.groundColor.setHex(0x445566);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0xbbccdd);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.018;
          ctx.renderer.toneMappingExposure = 1.1;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xffaa88);
          ctx.dirLight.intensity = 1.0;
          ctx.ambientLight.color.setHex(0x443344);
          ctx.ambientLight.intensity = 0.5;
          ctx.hemiLight.color.setHex(0xcc8866);
          ctx.hemiLight.groundColor.setHex(0x334455);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x998877);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.015;
          groundMat.color.setHex(0x998877);
          ctx.renderer.toneMappingExposure = 0.95;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xcc6644);
          ctx.dirLight.intensity = 0.7;
          ctx.ambientLight.color.setHex(0x2a2233);
          ctx.ambientLight.intensity = 0.4;
          ctx.hemiLight.color.setHex(0x886644);
          ctx.hemiLight.groundColor.setHex(0x223344);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x665566);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.02;
          groundMat.color.setHex(0x665566);
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x3355aa);
          ctx.dirLight.intensity = 0.35;
          ctx.ambientLight.color.setHex(0x0a0a22);
          ctx.ambientLight.intensity = 0.2;
          ctx.hemiLight.color.setHex(0x223366);
          ctx.hemiLight.groundColor.setHex(0x0a0a11);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x112244);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.025;
          groundMat.color.setHex(0x112244);
          ctx.renderer.toneMappingExposure = 0.55;
          break;
      }
    } else if (mapId === DiabloMapId.HAUNTED_CATHEDRAL) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0x9988aa);
          ctx.dirLight.intensity = 0.7;
          ctx.ambientLight.color.setHex(0x2a2233);
          ctx.ambientLight.intensity = 0.5;
          ctx.hemiLight.color.setHex(0x665577);
          ctx.hemiLight.groundColor.setHex(0x221122);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x443355);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.03;
          ctx.renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0x775566);
          ctx.dirLight.intensity = 0.5;
          ctx.ambientLight.color.setHex(0x1a1122);
          ctx.ambientLight.intensity = 0.35;
          ctx.hemiLight.color.setHex(0x554466);
          ctx.hemiLight.groundColor.setHex(0x1a0a1a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x332244);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.032;
          groundMat.color.setHex(0x332244);
          ctx.renderer.toneMappingExposure = 0.75;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0x553344);
          ctx.dirLight.intensity = 0.3;
          ctx.ambientLight.color.setHex(0x110a1a);
          ctx.ambientLight.intensity = 0.25;
          ctx.hemiLight.color.setHex(0x332244);
          ctx.hemiLight.groundColor.setHex(0x0a0510);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x221133);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.035;
          groundMat.color.setHex(0x221133);
          ctx.renderer.toneMappingExposure = 0.65;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x221133);
          ctx.dirLight.intensity = 0.15;
          ctx.ambientLight.color.setHex(0x080408);
          ctx.ambientLight.intensity = 0.15;
          ctx.hemiLight.color.setHex(0x110a22);
          ctx.hemiLight.groundColor.setHex(0x050305);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x110a1a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.04;
          groundMat.color.setHex(0x110a1a);
          ctx.renderer.toneMappingExposure = 0.45;
          break;
      }
    } else if (mapId === DiabloMapId.THORNWOOD_THICKET) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xddcc88);
          ctx.dirLight.intensity = 1.2;
          ctx.ambientLight.color.setHex(0x2a3322);
          ctx.ambientLight.intensity = 0.5;
          ctx.hemiLight.color.setHex(0x889944);
          ctx.hemiLight.groundColor.setHex(0x332211);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x554433);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.022;
          ctx.renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xcc9966);
          ctx.dirLight.intensity = 0.8;
          ctx.ambientLight.color.setHex(0x221a10);
          ctx.ambientLight.intensity = 0.4;
          ctx.hemiLight.color.setHex(0x886644);
          ctx.hemiLight.groundColor.setHex(0x221108);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x443322);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.025;
          groundMat.color.setHex(0x443322);
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0x884422);
          ctx.dirLight.intensity = 0.5;
          ctx.ambientLight.color.setHex(0x1a1008);
          ctx.ambientLight.intensity = 0.3;
          ctx.hemiLight.color.setHex(0x553322);
          ctx.hemiLight.groundColor.setHex(0x110808);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x332211);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.028;
          groundMat.color.setHex(0x332211);
          ctx.renderer.toneMappingExposure = 0.7;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x332211);
          ctx.dirLight.intensity = 0.2;
          ctx.ambientLight.color.setHex(0x0a0805);
          ctx.ambientLight.intensity = 0.15;
          ctx.hemiLight.color.setHex(0x221a08);
          ctx.hemiLight.groundColor.setHex(0x080505);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x1a1108);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.032;
          groundMat.color.setHex(0x1a1108);
          ctx.renderer.toneMappingExposure = 0.5;
          break;
      }
    } else if (mapId === DiabloMapId.CLOCKWORK_FOUNDRY) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xffcc88);
          ctx.dirLight.intensity = 1.2;
          ctx.ambientLight.color.setHex(0x3a3322);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0xaa8855);
          ctx.hemiLight.groundColor.setHex(0x332211);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x665544);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.015;
          ctx.renderer.toneMappingExposure = 1.0;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xdd9955);
          ctx.dirLight.intensity = 1.0;
          ctx.ambientLight.color.setHex(0x2a2218);
          ctx.ambientLight.intensity = 0.5;
          ctx.hemiLight.color.setHex(0x886633);
          ctx.hemiLight.groundColor.setHex(0x221108);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x554433);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.017;
          groundMat.color.setHex(0x554433);
          ctx.renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xbb7733);
          ctx.dirLight.intensity = 0.8;
          ctx.ambientLight.color.setHex(0x221a10);
          ctx.ambientLight.intensity = 0.4;
          ctx.hemiLight.color.setHex(0x664422);
          ctx.hemiLight.groundColor.setHex(0x1a0a05);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x443322);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.02;
          groundMat.color.setHex(0x443322);
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x664422);
          ctx.dirLight.intensity = 0.4;
          ctx.ambientLight.color.setHex(0x0a0a08);
          ctx.ambientLight.intensity = 0.25;
          ctx.hemiLight.color.setHex(0x332211);
          ctx.hemiLight.groundColor.setHex(0x0a0505);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x221108);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.022;
          groundMat.color.setHex(0x221108);
          ctx.renderer.toneMappingExposure = 0.6;
          break;
      }
    } else if (mapId === DiabloMapId.CRIMSON_CITADEL) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xcc8888);
          ctx.dirLight.intensity = 0.8;
          ctx.ambientLight.color.setHex(0x3a1122);
          ctx.ambientLight.intensity = 0.5;
          ctx.hemiLight.color.setHex(0x885544);
          ctx.hemiLight.groundColor.setHex(0x221111);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x552233);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.02;
          ctx.renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xaa6655);
          ctx.dirLight.intensity = 0.6;
          ctx.ambientLight.color.setHex(0x2a0a18);
          ctx.ambientLight.intensity = 0.4;
          ctx.hemiLight.color.setHex(0x664433);
          ctx.hemiLight.groundColor.setHex(0x1a0808);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x441122);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.022;
          groundMat.color.setHex(0x441122);
          ctx.renderer.toneMappingExposure = 0.75;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0x883322);
          ctx.dirLight.intensity = 0.4;
          ctx.ambientLight.color.setHex(0x1a0510);
          ctx.ambientLight.intensity = 0.3;
          ctx.hemiLight.color.setHex(0x442211);
          ctx.hemiLight.groundColor.setHex(0x100505);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x330a1a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.025;
          groundMat.color.setHex(0x330a1a);
          ctx.renderer.toneMappingExposure = 0.65;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x441122);
          ctx.dirLight.intensity = 0.2;
          ctx.ambientLight.color.setHex(0x0a0308);
          ctx.ambientLight.intensity = 0.15;
          ctx.hemiLight.color.setHex(0x220a11);
          ctx.hemiLight.groundColor.setHex(0x050203);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x1a0510);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.03;
          groundMat.color.setHex(0x1a0510);
          ctx.renderer.toneMappingExposure = 0.45;
          break;
      }
    } else if (mapId === DiabloMapId.STORMSPIRE_PEAK) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xccddee);
          ctx.dirLight.intensity = 1.4;
          ctx.ambientLight.color.setHex(0x445566);
          ctx.ambientLight.intensity = 0.6;
          ctx.hemiLight.color.setHex(0x99aabb);
          ctx.hemiLight.groundColor.setHex(0x445566);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x778899);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.012;
          ctx.renderer.toneMappingExposure = 1.0;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xddaa88);
          ctx.dirLight.intensity = 1.0;
          ctx.ambientLight.color.setHex(0x334455);
          ctx.ambientLight.intensity = 0.5;
          ctx.hemiLight.color.setHex(0xaa8866);
          ctx.hemiLight.groundColor.setHex(0x334455);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x667788);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.014;
          groundMat.color.setHex(0x667788);
          ctx.renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xaa6644);
          ctx.dirLight.intensity = 0.7;
          ctx.ambientLight.color.setHex(0x223344);
          ctx.ambientLight.intensity = 0.4;
          ctx.hemiLight.color.setHex(0x775544);
          ctx.hemiLight.groundColor.setHex(0x223344);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x556677);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.016;
          groundMat.color.setHex(0x556677);
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x3355aa);
          ctx.dirLight.intensity = 0.4;
          ctx.ambientLight.color.setHex(0x0a0a22);
          ctx.ambientLight.intensity = 0.2;
          ctx.hemiLight.color.setHex(0x223366);
          ctx.hemiLight.groundColor.setHex(0x0a0a15);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x223355);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.018;
          groundMat.color.setHex(0x223355);
          ctx.renderer.toneMappingExposure = 0.55;
          break;
      }
    } else if (mapId === DiabloMapId.SHADOW_REALM) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0x664488);
          ctx.dirLight.intensity = 0.4;
          ctx.ambientLight.color.setHex(0x110011);
          ctx.ambientLight.intensity = 0.3;
          ctx.hemiLight.color.setHex(0x442266);
          ctx.hemiLight.groundColor.setHex(0x0a000a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x220022);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.035;
          ctx.renderer.toneMappingExposure = 0.65;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0x553366);
          ctx.dirLight.intensity = 0.3;
          ctx.ambientLight.color.setHex(0x0a000a);
          ctx.ambientLight.intensity = 0.2;
          ctx.hemiLight.color.setHex(0x331155);
          ctx.hemiLight.groundColor.setHex(0x080008);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x1a001a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.038;
          groundMat.color.setHex(0x1a001a);
          ctx.renderer.toneMappingExposure = 0.55;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0x332244);
          ctx.dirLight.intensity = 0.2;
          ctx.ambientLight.color.setHex(0x080008);
          ctx.ambientLight.intensity = 0.15;
          ctx.hemiLight.color.setHex(0x220a44);
          ctx.hemiLight.groundColor.setHex(0x050005);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x110011);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.04;
          groundMat.color.setHex(0x110011);
          ctx.renderer.toneMappingExposure = 0.45;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x220a33);
          ctx.dirLight.intensity = 0.1;
          ctx.ambientLight.color.setHex(0x050005);
          ctx.ambientLight.intensity = 0.1;
          ctx.hemiLight.color.setHex(0x110a22);
          ctx.hemiLight.groundColor.setHex(0x030003);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x0a000a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.045;
          groundMat.color.setHex(0x0a000a);
          ctx.renderer.toneMappingExposure = 0.3;
          break;
      }
    } else if (mapId === DiabloMapId.PRIMORDIAL_ABYSS) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0x443366);
          ctx.dirLight.intensity = 0.3;
          ctx.ambientLight.color.setHex(0x0a0011);
          ctx.ambientLight.intensity = 0.2;
          ctx.hemiLight.color.setHex(0x332255);
          ctx.hemiLight.groundColor.setHex(0x050008);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x1a0022);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.04;
          ctx.renderer.toneMappingExposure = 0.55;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0x332244);
          ctx.dirLight.intensity = 0.2;
          ctx.ambientLight.color.setHex(0x080008);
          ctx.ambientLight.intensity = 0.15;
          ctx.hemiLight.color.setHex(0x220a44);
          ctx.hemiLight.groundColor.setHex(0x030005);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x110018);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.042;
          groundMat.color.setHex(0x110018);
          ctx.renderer.toneMappingExposure = 0.45;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0x221133);
          ctx.dirLight.intensity = 0.15;
          ctx.ambientLight.color.setHex(0x050005);
          ctx.ambientLight.intensity = 0.1;
          ctx.hemiLight.color.setHex(0x110833);
          ctx.hemiLight.groundColor.setHex(0x020003);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x0a0011);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.045;
          groundMat.color.setHex(0x0a0011);
          ctx.renderer.toneMappingExposure = 0.35;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x110a22);
          ctx.dirLight.intensity = 0.08;
          ctx.ambientLight.color.setHex(0x030003);
          ctx.ambientLight.intensity = 0.08;
          ctx.hemiLight.color.setHex(0x0a0518);
          ctx.hemiLight.groundColor.setHex(0x010002);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x050008);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.05;
          groundMat.color.setHex(0x050008);
          ctx.renderer.toneMappingExposure = 0.2;
          break;
      }
    } else if (mapId === DiabloMapId.CITY_RUINS) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xccbbaa);
          ctx.dirLight.intensity = 0.9;
          ctx.ambientLight.color.setHex(0x444038);
          ctx.ambientLight.intensity = 0.5;
          ctx.hemiLight.color.setHex(0x887766);
          ctx.hemiLight.groundColor.setHex(0x332a22);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x6a6560);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.014;
          ctx.renderer.toneMappingExposure = 0.9;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xdd9966);
          ctx.dirLight.intensity = 0.7;
          ctx.ambientLight.color.setHex(0x3a2a1a);
          ctx.ambientLight.intensity = 0.4;
          ctx.hemiLight.color.setHex(0xaa7755);
          ctx.hemiLight.groundColor.setHex(0x221a12);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x5a4a3a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.016;
          groundMat.color.setHex(0x4a4035);
          ctx.renderer.toneMappingExposure = 0.8;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xcc5533);
          ctx.dirLight.intensity = 0.5;
          ctx.ambientLight.color.setHex(0x1a1210);
          ctx.ambientLight.intensity = 0.35;
          ctx.hemiLight.color.setHex(0x774433);
          ctx.hemiLight.groundColor.setHex(0x110a08);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x2a1a15);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.02;
          groundMat.color.setHex(0x3a3028);
          ctx.renderer.toneMappingExposure = 0.6;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x334466);
          ctx.dirLight.intensity = 0.2;
          ctx.ambientLight.color.setHex(0x0a0a12);
          ctx.ambientLight.intensity = 0.15;
          ctx.hemiLight.color.setHex(0x1a2233);
          ctx.hemiLight.groundColor.setHex(0x050505);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x0a0a10);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.025;
          groundMat.color.setHex(0x1a1a20);
          ctx.renderer.toneMappingExposure = 0.4;
          break;
      }
    } else if (mapId === DiabloMapId.CITY) {
      switch (tod) {
        case TimeOfDay.DAY:
          ctx.dirLight.color.setHex(0xddeeff);
          ctx.dirLight.intensity = 1.1;
          ctx.ambientLight.color.setHex(0x3a3e48);
          ctx.ambientLight.intensity = 0.55;
          ctx.hemiLight.color.setHex(0x8899aa);
          ctx.hemiLight.groundColor.setHex(0x3a3530);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x6e7280);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.01;
          ctx.renderer.toneMappingExposure = 1.0;
          break;
        case TimeOfDay.DAWN:
          ctx.dirLight.color.setHex(0xddaa77);
          ctx.dirLight.intensity = 0.8;
          ctx.ambientLight.color.setHex(0x332a1a);
          ctx.ambientLight.intensity = 0.45;
          ctx.hemiLight.color.setHex(0xbb8866);
          ctx.hemiLight.groundColor.setHex(0x221a12);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x5a4a40);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.012;
          groundMat.color.setHex(0x4a4850);
          ctx.renderer.toneMappingExposure = 0.85;
          break;
        case TimeOfDay.DUSK:
          ctx.dirLight.color.setHex(0xcc6644);
          ctx.dirLight.intensity = 0.6;
          ctx.ambientLight.color.setHex(0x1a1518);
          ctx.ambientLight.intensity = 0.35;
          ctx.hemiLight.color.setHex(0x885544);
          ctx.hemiLight.groundColor.setHex(0x110a0a);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x2a1a18);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.016;
          groundMat.color.setHex(0x3a3840);
          ctx.renderer.toneMappingExposure = 0.65;
          break;
        case TimeOfDay.NIGHT:
          ctx.dirLight.color.setHex(0x3344aa);
          ctx.dirLight.intensity = 0.25;
          ctx.ambientLight.color.setHex(0x080a15);
          ctx.ambientLight.intensity = 0.15;
          ctx.hemiLight.color.setHex(0x1a2244);
          ctx.hemiLight.groundColor.setHex(0x050508);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).color.setHex(0x08080f);
          if (ctx.scene.fog) (ctx.scene.fog as THREE.FogExp2).density = 0.02;
          groundMat.color.setHex(0x1a1a25);
          ctx.renderer.toneMappingExposure = 0.45;
          break;
      }
    }

    // Update sky dome color
    if (ctx.skyDome) {
      const skyMat = ctx.skyDome.material as THREE.MeshBasicMaterial;
      switch (tod) {
        case TimeOfDay.DAY:
          skyMat.color.setHex(0x5599dd);
          break;
        case TimeOfDay.DAWN:
          skyMat.color.setHex(0xdd8855);
          break;
        case TimeOfDay.DUSK:
          skyMat.color.setHex(0x994433);
          break;
        case TimeOfDay.NIGHT:
          skyMat.color.setHex(0x111133);
          break;
      }
    }

    // Keep background in sync with fog
    const todFog = ctx.scene.fog as THREE.FogExp2 | null;
    if (todFog) {
      ctx.scene.background = todFog.color.clone();
    }
}
