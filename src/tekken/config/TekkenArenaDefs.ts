// ---------------------------------------------------------------------------
// Tekken mode – Arena/Stage definitions
// ---------------------------------------------------------------------------

export interface TekkenArenaDef {
  id: string;
  name: string;
  floorColor: number;
  ambientColor: number;
  fogColor: number;
  fogDensity: number;
  skyColor: number;
  keyLightColor: number;
  keyLightIntensity: number;
  fillLightColor: number;
  torchColor: number;
}

export const TEKKEN_ARENAS: TekkenArenaDef[] = [
  {
    id: "castle_courtyard",
    name: "Castle Courtyard",
    floorColor: 0x3a3530,
    ambientColor: 0x443344,
    fogColor: 0x0a0a14,
    fogDensity: 0.04,
    skyColor: 0x0a0a18,
    keyLightColor: 0xffeedd,
    keyLightIntensity: 2.8,
    fillLightColor: 0x6688cc,
    torchColor: 0xff8833,
  },
  {
    id: "underground_pit",
    name: "The Underground Pit",
    floorColor: 0x2a2520,
    ambientColor: 0x222211,
    fogColor: 0x050508,
    fogDensity: 0.06,
    skyColor: 0x050508,
    keyLightColor: 0xffbb88,
    keyLightIntensity: 1.8,
    fillLightColor: 0x446633,
    torchColor: 0x44ff44,
  },
  {
    id: "throne_room",
    name: "The Throne Room",
    floorColor: 0x4a4040,
    ambientColor: 0x554444,
    fogColor: 0x100a0a,
    fogDensity: 0.03,
    skyColor: 0x100a0a,
    keyLightColor: 0xffffdd,
    keyLightIntensity: 3.0,
    fillLightColor: 0x8866aa,
    torchColor: 0xffaa44,
  },
];
