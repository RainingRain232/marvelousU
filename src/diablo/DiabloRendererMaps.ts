import * as THREE from 'three';
import { getTerrainHeight } from './DiabloRenderer';
import { VendorType } from './DiabloTypes';
import { VENDOR_DEFS } from './DiabloConfig';

export interface MapBuildContext {
  scene: THREE.Scene;
  envGroup: THREE.Group;
  dirLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  hemiLight: THREE.HemisphereLight;
  torchLights: THREE.PointLight[];
  buildingColliders: any[];
  applyTerrainColors: (baseColor: number, secondaryColor: number, amplitude?: number) => void;
}

export * from './DiabloRendererMaps1';
export * from './DiabloRendererMaps2';
export * from './DiabloRendererMaps3';
export * from './DiabloRendererMaps4';
export * from './DiabloRendererMaps5';
export * from './DiabloRendererMaps6';
export * from './DiabloRendererMaps7';
export * from './DiabloRendererMaps8';
