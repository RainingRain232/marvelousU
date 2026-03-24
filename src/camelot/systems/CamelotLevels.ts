// ---------------------------------------------------------------------------
// Prince of Camelot — Level Definitions
// ---------------------------------------------------------------------------

import { TileType as T } from "../types";
import type { LevelData, DialogueLine } from "../types";
import { TILE } from "../config/CamelotConfig";

function createEmptyMap(w: number, h: number): number[][] {
  const tiles: number[][] = [];
  for (let y = 0; y < h; y++) { tiles[y] = []; for (let x = 0; x < w; x++) tiles[y][x] = T.EMPTY; }
  return tiles;
}

function fillRect(tiles: number[][], x1: number, y1: number, x2: number, y2: number, t: number): void {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      if (tiles[y] && tiles[y][x] !== undefined) tiles[y][x] = t;
}

function buildLevel1(): LevelData {
  const W = 80, H = 20;
  const tiles = createEmptyMap(W, H);
  fillRect(tiles,0,0,W-1,1,T.STONE); fillRect(tiles,0,H-2,W-1,H-1,T.STONE);
  fillRect(tiles,0,0,1,H-1,T.STONE); fillRect(tiles,W-2,0,W-1,H-1,T.STONE);
  fillRect(tiles,8,H-4,14,H-4,T.PLATFORM);
  fillRect(tiles,18,H-6,24,H-6,T.PLATFORM);
  fillRect(tiles,12,H-8,16,H-8,T.STONE);
  fillRect(tiles,28,H-2,33,H-2,T.SPIKE_UP);
  fillRect(tiles,28,H-1,33,H-1,T.WATER_SURFACE);
  fillRect(tiles,27,H-5,29,H-5,T.PLATFORM);
  fillRect(tiles,31,H-7,34,H-7,T.PLATFORM);
  fillRect(tiles,36,H-4,42,H-3,T.STONE);
  tiles[H-5][38]=T.TORCH;
  fillRect(tiles,44,H-6,48,H-6,T.PLATFORM);
  fillRect(tiles,40,H-9,46,H-9,T.STONE);
  fillRect(tiles,50,H-4,55,H-4,T.CRUMBLE);
  fillRect(tiles,52,H-8,58,H-8,T.PLATFORM);
  fillRect(tiles,56,H-11,60,H-11,T.STONE);
  tiles[H-12][58]=T.TORCH;
  for (let y=H-10;y<H-3;y++) tiles[y][62]=T.LADDER;
  fillRect(tiles,60,H-3,64,H-3,T.STONE);
  fillRect(tiles,65,H-6,68,H-6,T.PLATFORM);
  fillRect(tiles,70,H-4,74,H-4,T.STONE);
  tiles[H-5][72]=T.TORCH;
  tiles[H-3][40]=T.CHECKPOINT;
  tiles[H-4][76]=T.EXIT; tiles[H-5][76]=T.EXIT;
  tiles[2][10]=T.CHAIN; tiles[3][10]=T.CHAIN;
  tiles[2][20]=T.CHAIN; tiles[3][20]=T.CHAIN;
  tiles[2][40]=T.BANNER; tiles[2][60]=T.BANNER;
  tiles[H-2][5]=T.MOSS_STONE; tiles[H-2][10]=T.MOSS_STONE; tiles[H-2][25]=T.MOSS_STONE;
  tiles[H-3][30]=T.BONES; tiles[H-3][34]=T.SKULL;
  tiles[H-3][50]=T.BLOODSTAIN; tiles[H-3][66]=T.BONES;
  tiles[3][15]=T.CAGE; tiles[3][45]=T.CAGE;
  tiles[H-3][15]=T.BLOODSTAIN;
  // Secret room behind SECRET_WALL at x=74
  fillRect(tiles,74,H-6,78,H-6,T.STONE); // ceiling
  fillRect(tiles,74,H-2,78,H-2,T.STONE);  // floor
  fillRect(tiles,78,H-5,78,H-3,T.STONE);  // right wall
  fillRect(tiles,74,H-5,74,H-3,T.SECRET_WALL); // secret entrance
  fillRect(tiles,75,H-5,77,H-3,T.EMPTY);  // clear interior

  return {
    width:W,height:H,tiles,
    spawn:{x:4*TILE,y:(H-4)*TILE},
    enemies:[
      {type:"guard",x:20*TILE,y:(H-8)*TILE,patrol:4},
      {type:"guard",x:38*TILE,y:(H-6)*TILE,patrol:3},
      {type:"archer",x:46*TILE,y:(H-11)*TILE,patrol:2},
      {type:"guard",x:56*TILE,y:(H-13)*TILE,patrol:3},
      {type:"guard",x:66*TILE,y:(H-8)*TILE,patrol:2},
    ],
    pickups:[
      {type:"health",x:14*TILE,y:(H-6)*TILE},
      {type:"health",x:43*TILE,y:(H-11)*TILE},
      {type:"sword",x:9*TILE,y:(H-6)*TILE},
      {type:"health",x:76*TILE,y:(H-4)*TILE},
    ],
    movingPlatforms:[
      {x:34*TILE,y:(H-7)*TILE,w:TILE*3,h:8,dx:1,dy:0,range:3*TILE,speed:1},
    ],
    crates:[{x:6*TILE,y:(H-3)*TILE},{x:42*TILE,y:(H-5)*TILE},{x:63*TILE,y:(H-4)*TILE}],
    traps:[{type:"blade",x:25*TILE,y:3*TILE,len:TILE*3}],
    bg:"dungeon"
  };
}

function buildLevel2(): LevelData {
  const W=90,H=24;
  const tiles=createEmptyMap(W,H);
  fillRect(tiles,0,0,W-1,1,T.BRICK); fillRect(tiles,0,H-2,W-1,H-1,T.STONE);
  fillRect(tiles,0,0,1,H-1,T.BRICK); fillRect(tiles,W-2,0,W-1,H-1,T.BRICK);
  fillRect(tiles,2,H-2,20,H-2,T.WOOD_FLOOR);
  fillRect(tiles,22,H-2,40,H-2,T.STONE);
  fillRect(tiles,42,H-2,60,H-2,T.WOOD_FLOOR);
  fillRect(tiles,62,H-2,W-2,H-2,T.STONE);
  for (const px of [10,20,30,50,60,70]) {
    fillRect(tiles,px,4,px,H-3,T.PILLAR); tiles[3][px]=T.PILLAR_TOP;
  }
  for (const wx of [5,15,25,35,45,55,65,75]) { tiles[4][wx]=T.WINDOW; tiles[5][wx]=T.WINDOW; }
  fillRect(tiles,6,H-5,9,H-5,T.PLATFORM);
  fillRect(tiles,13,H-8,18,H-8,T.PLATFORM);
  fillRect(tiles,22,H-5,27,H-5,T.STONE);
  fillRect(tiles,30,H-7,35,H-7,T.PLATFORM);
  fillRect(tiles,24,H-10,29,H-10,T.STONE);
  tiles[H-11][26]=T.TORCH;
  fillRect(tiles,37,H-2,40,H-2,T.SPIKE_UP);
  fillRect(tiles,36,H-5,38,H-5,T.CRUMBLE);
  fillRect(tiles,40,H-5,42,H-5,T.PLATFORM);
  fillRect(tiles,44,H-8,55,H-8,T.STONE);
  tiles[H-9][46]=T.TORCH; tiles[H-9][53]=T.TORCH;
  for (let y=H-14;y<H-8;y++) tiles[y][48]=T.LADDER;
  fillRect(tiles,44,H-14,55,H-14,T.STONE);
  fillRect(tiles,58,H-5,65,H-5,T.PLATFORM);
  fillRect(tiles,62,H-9,68,H-9,T.STONE);
  fillRect(tiles,70,H-6,76,H-6,T.PLATFORM);
  fillRect(tiles,72,H-10,78,H-10,T.STONE);
  tiles[H-3][80]=T.GATE; tiles[H-4][80]=T.GATE; tiles[H-5][80]=T.GATE;
  tiles[H-11][75]=T.LEVER;
  fillRect(tiles,82,H-4,86,H-4,T.STONE);
  tiles[H-3][50]=T.CHECKPOINT;
  tiles[H-4][87]=T.EXIT; tiles[H-5][87]=T.EXIT;
  tiles[2][15]=T.BANNER; tiles[2][35]=T.BANNER; tiles[2][55]=T.BANNER; tiles[2][75]=T.BANNER;
  tiles[H-3][5]=T.BLOODSTAIN; tiles[H-3][38]=T.BONES; tiles[H-3][39]=T.SKULL;
  tiles[H-3][63]=T.BLOODSTAIN; tiles[H-3][72]=T.BONES;
  // Secret room at x=2-5, y=H-14 to H-11
  fillRect(tiles,2,H-15,5,H-15,T.STONE);  // ceiling
  fillRect(tiles,2,H-10,5,H-10,T.STONE);  // floor
  fillRect(tiles,5,H-14,5,H-11,T.STONE);  // right wall
  fillRect(tiles,2,H-14,2,H-13,T.STONE);  // left wall upper
  tiles[H-12][2]=T.SECRET_WALL;            // secret entrance
  fillRect(tiles,2,H-11,2,H-11,T.STONE);  // left wall lower
  fillRect(tiles,3,H-14,4,H-11,T.EMPTY);  // clear interior

  return {
    width:W,height:H,tiles,
    spawn:{x:4*TILE,y:(H-4)*TILE},
    enemies:[
      {type:"guard",x:15*TILE,y:(H-4)*TILE,patrol:4},
      {type:"guard",x:24*TILE,y:(H-7)*TILE,patrol:3},
      {type:"archer",x:32*TILE,y:(H-9)*TILE,patrol:2},
      {type:"guard",x:48*TILE,y:(H-10)*TILE,patrol:4},
      {type:"guard",x:50*TILE,y:(H-16)*TILE,patrol:3},
      {type:"archer",x:65*TILE,y:(H-11)*TILE,patrol:2},
      {type:"guard",x:73*TILE,y:(H-8)*TILE,patrol:3},
      {type:"knight",x:84*TILE,y:(H-6)*TILE,patrol:2},
      {type:"mage",x:60*TILE,y:(H-11)*TILE,patrol:2},
    ],
    pickups:[
      {type:"health",x:26*TILE,y:(H-12)*TILE},
      {type:"health",x:50*TILE,y:(H-16)*TILE},
      {type:"doublejump",x:70*TILE,y:(H-8)*TILE},
      {type:"sword",x:3*TILE,y:(H-13)*TILE},
    ],
    movingPlatforms:[
      {x:56*TILE,y:(H-6)*TILE,w:TILE*2,h:8,dx:0,dy:1,range:3*TILE,speed:0.8},
      {x:68*TILE,y:(H-8)*TILE,w:TILE*2,h:8,dx:1,dy:0,range:2*TILE,speed:1.2},
    ],
    crates:[{x:8*TILE,y:(H-3)*TILE},{x:34*TILE,y:(H-3)*TILE},{x:62*TILE,y:(H-3)*TILE}],
    traps:[{type:"fire",x:43*TILE,y:(H-2)*TILE},{type:"blade",x:57*TILE,y:4*TILE,len:TILE*3},{type:"arrow",x:25*TILE,y:(H-6)*TILE},{type:"arrow",x:55*TILE,y:(H-4)*TILE}],
    bg:"hall"
  };
}

function buildLevel3(): LevelData {
  const W=50,H=40;
  const tiles=createEmptyMap(W,H);
  fillRect(tiles,0,0,W-1,1,T.STONE); fillRect(tiles,0,H-2,W-1,H-1,T.STONE);
  fillRect(tiles,0,0,1,H-1,T.STONE); fillRect(tiles,W-2,0,W-1,H-1,T.STONE);
  fillRect(tiles,2,H-4,W-3,H-4,T.STONE);
  tiles[H-5][4]=T.TORCH;
  fillRect(tiles,4,H-8,12,H-8,T.PLATFORM);
  fillRect(tiles,18,H-11,26,H-11,T.STONE);
  fillRect(tiles,8,H-14,15,H-14,T.PLATFORM);
  fillRect(tiles,30,H-9,38,H-9,T.PLATFORM);
  fillRect(tiles,14,H-4,18,H-4,T.SPIKE_UP);
  fillRect(tiles,34,H-14,44,H-14,T.STONE);
  tiles[H-15][36]=T.TORCH;
  fillRect(tiles,20,H-17,30,H-17,T.PLATFORM);
  fillRect(tiles,6,H-20,16,H-20,T.STONE);
  tiles[H-21][8]=T.TORCH;
  fillRect(tiles,20,H-22,26,H-22,T.CRUMBLE);
  fillRect(tiles,30,H-24,40,H-24,T.PLATFORM);
  fillRect(tiles,10,H-27,20,H-27,T.STONE);
  tiles[H-28][14]=T.TORCH;
  fillRect(tiles,26,H-30,36,H-30,T.PLATFORM);
  fillRect(tiles,6,H-33,18,H-33,T.STONE);
  fillRect(tiles,30,H-35,42,H-35,T.STONE);
  tiles[H-36][34]=T.TORCH;
  fillRect(tiles,14,H-37,26,H-37,T.PLATFORM);
  tiles[H-5][10]=T.CHECKPOINT; tiles[H-21][12]=T.CHECKPOINT;
  tiles[H-5][16]=T.BONES; tiles[H-5][17]=T.SKULL;
  tiles[H-5][20]=T.BLOODSTAIN;
  tiles[4][3]=T.CAGE; tiles[4][W-4]=T.CAGE;
  tiles[H-15][40]=T.BONES; tiles[H-28][18]=T.BLOODSTAIN;
  tiles[3][24]=T.EXIT; tiles[4][24]=T.EXIT;
  fillRect(tiles,20,5,28,5,T.STONE);
  for (let wy=6;wy<H-4;wy+=5) { tiles[wy][1]=T.WINDOW; tiles[wy][W-2]=T.WINDOW; }
  // Secret room at top of tower near x=40-46
  fillRect(tiles,39,2,47,2,T.STONE);  // ceiling
  fillRect(tiles,39,6,47,6,T.STONE);  // floor
  fillRect(tiles,39,3,39,5,T.STONE);  // left wall
  fillRect(tiles,47,3,47,5,T.STONE);  // right wall
  fillRect(tiles,40,3,46,5,T.EMPTY);  // clear interior
  tiles[4][39]=T.SECRET_WALL; tiles[3][39]=T.SECRET_WALL; // secret entrance

  return {
    width:W,height:H,tiles,
    spawn:{x:5*TILE,y:(H-6)*TILE},
    enemies:[
      {type:"guard",x:20*TILE,y:(H-13)*TILE,patrol:3},
      {type:"archer",x:36*TILE,y:(H-16)*TILE,patrol:3},
      {type:"guard",x:10*TILE,y:(H-22)*TILE,patrol:4},
      {type:"knight",x:24*TILE,y:(H-19)*TILE,patrol:2},
      {type:"archer",x:34*TILE,y:(H-26)*TILE,patrol:3},
      {type:"guard",x:14*TILE,y:(H-29)*TILE,patrol:4},
      {type:"knight",x:36*TILE,y:(H-37)*TILE,patrol:3},
      {type:"shielder",x:28*TILE,y:(H-25)*TILE,patrol:3},
      {type:"mage",x:15*TILE,y:(H-35)*TILE,patrol:2},
    ],
    pickups:[
      {type:"health",x:36*TILE,y:(H-16)*TILE},
      {type:"health",x:8*TILE,y:(H-22)*TILE},
      {type:"shield",x:30*TILE,y:(H-32)*TILE},
      {type:"health",x:42*TILE,y:4*TILE},
      {type:"coin",x:44*TILE,y:4*TILE},
    ],
    movingPlatforms:[
      {x:24*TILE,y:(H-12)*TILE,w:TILE*2,h:8,dx:1,dy:0,range:4*TILE,speed:1},
      {x:38*TILE,y:(H-20)*TILE,w:TILE*2,h:8,dx:0,dy:-1,range:4*TILE,speed:0.7},
    ],
    crates:[{x:12*TILE,y:(H-5)*TILE},{x:38*TILE,y:(H-15)*TILE},{x:8*TILE,y:(H-21)*TILE}],
    traps:[{type:"blade",x:16*TILE,y:(H-10)*TILE,len:TILE*2.5},{type:"fire",x:22*TILE,y:(H-4)*TILE},{type:"arrow",x:30*TILE,y:(H-16)*TILE}],
    bg:"tower"
  };
}

function buildLevel4(): LevelData {
  const W=60,H=20;
  const tiles=createEmptyMap(W,H);
  fillRect(tiles,0,0,W-1,2,T.BRICK); fillRect(tiles,0,H-2,W-1,H-1,T.STONE);
  fillRect(tiles,0,0,1,H-1,T.BRICK); fillRect(tiles,W-2,0,W-1,H-1,T.BRICK);
  fillRect(tiles,2,H-2,W-3,H-2,T.WOOD_FLOOR);
  for (const px of [8,16,24,36,44,52]) {
    fillRect(tiles,px,5,px,H-3,T.PILLAR); tiles[4][px]=T.PILLAR_TOP;
  }
  fillRect(tiles,40,H-5,56,H-5,T.STONE);
  fillRect(tiles,45,H-8,52,H-8,T.STONE);
  fillRect(tiles,4,H-6,12,H-6,T.PLATFORM);
  fillRect(tiles,18,H-8,26,H-8,T.PLATFORM);
  fillRect(tiles,28,H-5,36,H-5,T.PLATFORM);
  tiles[3][6]=T.BANNER; tiles[3][14]=T.BANNER; tiles[3][22]=T.BANNER;
  tiles[3][38]=T.BANNER; tiles[3][48]=T.BANNER; tiles[3][54]=T.BANNER;
  tiles[H-3][10]=T.TORCH; tiles[H-3][20]=T.TORCH;
  tiles[H-3][40]=T.TORCH; tiles[H-3][50]=T.TORCH;
  tiles[4][3]=T.WINDOW; tiles[4][W-4]=T.WINDOW;
  tiles[H-3][4]=T.BONES; tiles[H-3][5]=T.SKULL; tiles[H-3][12]=T.BLOODSTAIN;
  tiles[H-3][18]=T.BONES; tiles[H-3][26]=T.BLOODSTAIN; tiles[H-3][32]=T.SKULL;
  tiles[3][42]=T.CAGE;
  // Lava pit
  fillRect(tiles,20,H-1,25,H-1,T.LAVA);
  fillRect(tiles,20,H-2,25,H-2,T.EMPTY); // clear floor above lava so it's a pit

  return {
    width:W,height:H,tiles,
    spawn:{x:4*TILE,y:(H-4)*TILE},
    enemies:[
      {type:"boss",x:48*TILE,y:(H-10)*TILE},
      {type:"shielder",x:30*TILE,y:(H-4)*TILE,patrol:3},
      {type:"mage",x:20*TILE,y:(H-7)*TILE,patrol:3},
    ],
    pickups:[
      {type:"health",x:10*TILE,y:(H-8)*TILE},
      {type:"health",x:24*TILE,y:(H-10)*TILE},
      {type:"health",x:34*TILE,y:(H-7)*TILE},
    ],
    movingPlatforms:[],
    crates:[{x:6*TILE,y:(H-3)*TILE},{x:14*TILE,y:(H-3)*TILE}],
    traps:[],
    bg:"throne"
  };
}

function buildLevel5(): LevelData {
  const W=70,H=30;
  const tiles=createEmptyMap(W,H);
  // Outer walls and floor
  fillRect(tiles,0,0,W-1,1,T.STONE); fillRect(tiles,0,H-2,W-1,H-1,T.STONE);
  fillRect(tiles,0,0,1,H-1,T.STONE); fillRect(tiles,W-2,0,W-1,H-1,T.STONE);

  // --- Room 1 (x=4-16, floor at H-6) with pillars ---
  fillRect(tiles,4,H-6,16,H-6,T.STONE);
  fillRect(tiles,8,7,8,H-7,T.PILLAR); tiles[6][8]=T.PILLAR_TOP;
  fillRect(tiles,14,7,14,H-7,T.PILLAR); tiles[6][14]=T.PILLAR_TOP;
  tiles[H-7][6]=T.TORCH; tiles[H-7][12]=T.TORCH;

  // --- Spike corridor between rooms (x=18-22) ---
  fillRect(tiles,18,H-2,22,H-2,T.SPIKE_UP);

  // --- Room 2 (x=24-38, floor at H-6) larger room with platforms ---
  fillRect(tiles,24,H-6,38,H-6,T.STONE);
  fillRect(tiles,27,H-10,32,H-10,T.PLATFORM);
  fillRect(tiles,34,H-9,37,H-9,T.PLATFORM);
  tiles[H-7][26]=T.TORCH; tiles[H-7][36]=T.TORCH;

  // --- Vertical shaft at x=40 with ladder ---
  for (let y=H-14;y<=H-6;y++) tiles[y][40]=T.LADDER;

  // --- Upper section (x=28-50, floor at H-14) ---
  fillRect(tiles,28,H-14,50,H-14,T.STONE);
  tiles[H-15][30]=T.TORCH; tiles[H-15][44]=T.TORCH;

  // --- Room 3 (x=42-56, floor at H-6) with crumbling platforms ---
  fillRect(tiles,42,H-6,56,H-6,T.STONE);
  fillRect(tiles,44,H-10,48,H-10,T.CRUMBLE);
  fillRect(tiles,51,H-9,55,H-9,T.CRUMBLE);
  tiles[H-7][46]=T.TORCH;

  // --- Final room (x=58-68, floor at H-4) with exit ---
  fillRect(tiles,58,H-4,68,H-4,T.STONE);
  fillRect(tiles,58,H-10,58,H-5,T.STONE); // left wall of final room
  tiles[H-5][60]=T.TORCH; tiles[H-5][66]=T.TORCH;

  // --- Upper walkway (y=H-20, x=10-30) ---
  fillRect(tiles,10,H-20,30,H-20,T.PLATFORM);

  // --- Water areas ---
  fillRect(tiles,18,H-1,22,H-1,T.WATER_SURFACE);
  fillRect(tiles,5,H-1,7,H-1,T.WATER_SURFACE);

  // --- Checkpoints ---
  tiles[H-7][30]=T.CHECKPOINT;
  tiles[H-15][50]=T.CHECKPOINT;

  // --- Exit ---
  tiles[H-6][66]=T.EXIT; tiles[H-5][66]=T.EXIT;

  // --- Environmental storytelling ---
  tiles[H-3][6]=T.BONES; tiles[H-3][10]=T.BONES; tiles[H-3][24]=T.BONES;
  tiles[H-3][42]=T.BONES; tiles[H-3][55]=T.BONES;
  tiles[H-3][8]=T.SKULL; tiles[H-3][30]=T.SKULL; tiles[H-3][48]=T.SKULL;
  tiles[H-3][15]=T.BLOODSTAIN; tiles[H-3][34]=T.BLOODSTAIN; tiles[H-3][60]=T.BLOODSTAIN;
  tiles[3][12]=T.CAGE; tiles[3][36]=T.CAGE; tiles[3][52]=T.CAGE;
  tiles[2][20]=T.CHAIN; tiles[3][20]=T.CHAIN;
  tiles[2][46]=T.CHAIN; tiles[3][46]=T.CHAIN;
  tiles[2][28]=T.BANNER; tiles[2][50]=T.BANNER;

  return {
    width:W,height:H,tiles,
    spawn:{x:4*TILE,y:(H-4)*TILE},
    enemies:[
      // Guards patrolling rooms
      {type:"guard",x:10*TILE,y:(H-8)*TILE,patrol:4},
      {type:"guard",x:30*TILE,y:(H-8)*TILE,patrol:3},
      {type:"guard",x:50*TILE,y:(H-8)*TILE,patrol:4},
      // Knights in room 2 and room 3
      {type:"knight",x:35*TILE,y:(H-8)*TILE,patrol:2},
      {type:"knight",x:46*TILE,y:(H-8)*TILE,patrol:3},
      // Archers on upper walkway
      {type:"archer",x:14*TILE,y:(H-22)*TILE,patrol:3},
      {type:"archer",x:26*TILE,y:(H-22)*TILE,patrol:3},
      // Mage in final room
      {type:"mage",x:64*TILE,y:(H-6)*TILE,patrol:2},
      // Shielder guarding exit corridor
      {type:"shielder",x:60*TILE,y:(H-6)*TILE,patrol:2},
    ],
    pickups:[
      {type:"health",x:16*TILE,y:(H-8)*TILE},
      {type:"health",x:44*TILE,y:(H-8)*TILE},
      {type:"shield",x:38*TILE,y:(H-16)*TILE},
    ],
    movingPlatforms:[
      // Vertical platform in shaft area
      {x:39*TILE,y:(H-12)*TILE,w:TILE*2,h:8,dx:0,dy:1,range:4*TILE,speed:0.7},
      // Horizontal platform over spike pit
      {x:17*TILE,y:(H-4)*TILE,w:TILE*3,h:8,dx:1,dy:0,range:4*TILE,speed:1},
    ],
    crates:[
      {x:8*TILE,y:(H-7)*TILE},
      {x:28*TILE,y:(H-7)*TILE},
      {x:52*TILE,y:(H-7)*TILE},
      {x:62*TILE,y:(H-5)*TILE},
    ],
    traps:[
      {type:"blade",x:20*TILE,y:4*TILE,len:TILE*3},
      {type:"blade",x:44*TILE,y:4*TILE,len:TILE*2.5},
      {type:"fire",x:56*TILE,y:(H-6)*TILE},
      {type:"arrow",x:34*TILE,y:(H-8)*TILE},
    ],
    bg:"dungeon"
  };
}

export function buildLevels(): LevelData[] {
  return [buildLevel1(), buildLevel2(), buildLevel3(), buildLevel4(), buildLevel5()];
}

export const LEVEL_DIALOGUES: DialogueLine[][] = [
  [
    {speaker:"THE PRINCE",text:"The castle dungeons... I never thought I'd see these from the inside."},
    {speaker:"THE PRINCE",text:"Mordrath's guards patrol every corridor. I must fight my way through."},
  ],
  [
    {speaker:"THE PRINCE",text:"The Great Hall — once a place of feasts and laughter."},
    {speaker:"THE PRINCE",text:"Now it echoes with the footsteps of Mordrath's soldiers."},
  ],
  [
    {speaker:"THE PRINCE",text:"The Tower... Mordrath's dark magic grows stronger the higher I climb."},
    {speaker:"THE PRINCE",text:"I can feel the sorcery pressing down like a weight."},
  ],
  [
    {speaker:"THE PRINCE",text:"The Catacombs beneath the castle... where the old kings rest."},
    {speaker:"THE PRINCE",text:"Mordrath's corruption runs deep. Even the dead do not sleep peacefully here."},
  ],
  [
    {speaker:"THE PRINCE",text:"The Throne Room. Mordrath awaits."},
    {speaker:"MORDRATH",text:"Foolish prince! You think a blade can undo what dark magic has wrought?"},
    {speaker:"THE PRINCE",text:"For Camelot. For my father. This ends now."},
  ],
];

export const ENDING_DIALOGUE: DialogueLine[] = [
  {speaker:"",text:"With Mordrath vanquished, the dark magic that gripped Camelot began to dissolve."},
  {speaker:"",text:"The cursed gates opened. The imprisoned people emerged, blinking in the light of dawn."},
  {speaker:"THE PRINCE",text:"It is over. The throne belongs to the people once more."},
  {speaker:"",text:"The prince knelt before his father's empty throne and laid down his sword."},
  {speaker:"THE PRINCE",text:"For Camelot. For those who fell. I will be worthy of this crown."},
  {speaker:"",text:"And so the kingdom was restored. The darkness lifted. A new age had begun."},
];
