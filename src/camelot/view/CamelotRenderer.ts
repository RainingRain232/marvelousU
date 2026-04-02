// ---------------------------------------------------------------------------
// Prince of Camelot — Canvas 2D Renderer (wrapped in PixiJS container)
// ---------------------------------------------------------------------------

import { Container, Sprite, Texture } from "pixi.js";
import type { CamelotState, Enemy } from "../types";
import { TileType as T, CamelotPhase } from "../types";
import { TILE, PAL, LEVEL_NAMES, STAMINA_MAX } from "../config/CamelotConfig";
import { xpForLevel } from "../systems/CamelotGameSystem";

export class CamelotRenderer {
  readonly container = new Container();
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _sprite: Sprite;
  private _texture: Texture;

  constructor() {
    this._canvas = document.createElement("canvas");
    this._ctx = this._canvas.getContext("2d")!;
    // Texture + sprite are created in init() once screen dimensions are known
    this._texture = Texture.EMPTY;
    this._sprite = new Sprite(this._texture);
    this.container.addChild(this._sprite);
  }

  init(sw: number, sh: number): void {
    this._canvas.width = sw;
    this._canvas.height = sh;
    // Create texture from the already-sized canvas so dimensions match
    this._texture = Texture.from(this._canvas);
    this._sprite.texture = this._texture;
    // Sprite scale 1:1 with texture — no rescaling needed
    this._sprite.scale.set(1);
  }

  render(s: CamelotState, sw: number, sh: number): void {
    const c = this._canvas;
    const ctx = this._ctx;
    if (c.width !== sw || c.height !== sh) {
      c.width = sw; c.height = sh;
      // Recreate texture at new size so sprite scale stays 1:1
      this._texture = Texture.from(c);
      this._sprite.texture = this._texture;
      this._sprite.scale.set(1);
    }
    ctx.clearRect(0, 0, sw, sh);

    if (s.phase === CamelotPhase.START) { this._drawStartScreen(ctx, sw, sh); }
    else if (s.phase === CamelotPhase.DEAD) { this._drawDeathScreen(ctx, s, sw, sh); }
    else if (s.phase === CamelotPhase.WIN) { this._drawWinScreen(ctx, s, sw, sh); }
    else if (s.phase === CamelotPhase.SCORE_TALLY) { this._drawScoreTally(ctx, s, sw, sh); }
    else if (s.shopActive) { this._drawShop(ctx, s, sw, sh); }
    else {
      this._drawBackground(ctx, s, sw, sh);
      ctx.save();
      if (s.cameraZoom !== 1.0) {
        ctx.translate(sw/2, sh/2); ctx.scale(s.cameraZoom, s.cameraZoom); ctx.translate(-sw/2, -sh/2);
      }
      this._drawTiles(ctx, s, sw, sh);
      this._drawMovingPlatforms(ctx, s);
      this._drawCrates(ctx, s);
      this._drawTraps(ctx, s);
      this._drawPickups(ctx, s);
      this._drawProjectiles(ctx, s);
      for (const e of s.enemies) this._drawEnemy(ctx, s, e);
      this._drawPlayer(ctx, s);
      this._drawParticles(ctx, s);
      this._drawFloatingTexts(ctx, s);
      ctx.restore();
      this._drawForeground(ctx, s, sw, sh);
      if (s.levelData.bg === "dungeon" || s.levelData.bg === "tower") this._drawDarkness(ctx, s, sw, sh);
      this._drawInteractionPrompts(ctx, s);
      this._drawKillStreak(ctx, s, sw, sh);
      this._drawHUD(ctx, s, sw, sh);
      this._drawMiniMap(ctx, s, sw);
      this._drawWeather(ctx, s, sw, sh);
      if (s.bloodMoonActive) this._drawBloodMoon(ctx, s, sw, sh);
      this._drawScreenEffects(ctx, s, sw, sh);
      if (s.crtEnabled) this._drawCRT(ctx, sw, sh);
      if (s.dialogueActive) this._drawDialogue(ctx, s, sw, sh);
      if (s.phase === CamelotPhase.PAUSED) this._drawPauseScreen(ctx, s, sw, sh);
    }
    this._drawFade(ctx, s, sw, sh);
    try { this._texture.source.update(); } catch { this._texture.update(); }
  }

  destroy(): void { this.container.removeChildren(); this._sprite.destroy(); }

  // === SCREENS ===
  private _drawStartScreen(ctx: CanvasRenderingContext2D, sw: number, sh: number): void {
    ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, sw, sh);
    ctx.textAlign = "center";
    ctx.font = "bold 64px Georgia"; ctx.fillStyle = "#d4a843";
    ctx.shadowColor = "#d4a843"; ctx.shadowBlur = 30;
    ctx.fillText("PRINCE OF CAMELOT", sw/2, sh/2-100);
    ctx.shadowBlur = 0;
    ctx.font = "italic 24px Georgia"; ctx.fillStyle = "#a08030";
    ctx.fillText("A Tale of Sword and Stone", sw/2, sh/2-65);
    ctx.font = "18px Georgia"; ctx.fillStyle = "#c0a050";
    ctx.fillText("The dark sorcerer Mordrath has seized Camelot's throne.", sw/2, sh/2-25);
    ctx.fillText("You are the last heir — fight through the castle to reclaim your birthright.", sw/2, sh/2+5);
    ctx.font = "14px Georgia"; ctx.fillStyle = "#806020";
    ctx.fillText("A/D — Move   W/Space — Jump   J/Z — Attack   K/X — Roll   L/C — Parry   Shift — Dash", sw/2, sh/2+45);
    ctx.fillText("S+J in air — Plunge   E — Interact/Execute   P/Esc — Pause   Tab — CRT   Gamepad OK!", sw/2, sh/2+65);
    ctx.fillStyle = "#605020"; ctx.fillText("3 lives. Checkpoints mid-level. Earn XP, coins, and kill streaks!", sw/2, sh/2+90);
    const pulse = 0.7 + Math.sin(Date.now()*0.003)*0.3;
    ctx.font = "bold 22px Georgia"; ctx.fillStyle = `rgba(240,216,120,${pulse})`;
    ctx.fillText("Press ENTER or SPACE to begin", sw/2, sh/2+140);
    ctx.textAlign = "left";
  }

  private _drawDeathScreen(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, sw, sh);
    ctx.textAlign = "center";
    ctx.font = "bold 48px Georgia"; ctx.fillStyle = "#c03030";
    ctx.shadowColor = "#c03030"; ctx.shadowBlur = 30;
    ctx.fillText("YOU HAVE FALLEN", sw/2, sh/2-60);
    ctx.shadowBlur = 0;
    ctx.font = "18px Georgia"; ctx.fillStyle = "#903030";
    ctx.fillText("The darkness claims another soul...", sw/2, sh/2-25);
    ctx.fillStyle = "#c0a050";
    ctx.fillText(`Coins: ${s.totalCoins} | Kills: ${s.totalKills} | Level: ${s.playerLevel}`, sw/2, sh/2+15);
    ctx.font = "bold 20px Georgia"; ctx.fillStyle = "#d4a843";
    ctx.fillText("Press ENTER to rise again", sw/2, sh/2+60);
    ctx.textAlign = "left";
  }

  private _drawWinScreen(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, sw, sh);
    ctx.textAlign = "center";
    ctx.font = "bold 48px Georgia"; ctx.fillStyle = "#50c050";
    ctx.shadowColor = "#50c050"; ctx.shadowBlur = 30;
    ctx.fillText("CAMELOT IS FREE", sw/2, sh/2-80);
    ctx.shadowBlur = 0;
    ctx.font = "italic 22px Georgia"; ctx.fillStyle = "#40a040";
    ctx.fillText("Long live the Prince!", sw/2, sh/2-45);
    const secs = Math.floor(s.totalTime/60);
    ctx.font = "18px Georgia";
    ctx.fillStyle = "#d4a843"; ctx.fillText(`Enemies Vanquished: ${s.totalKills}`, sw/2, sh/2);
    ctx.fillStyle = "#e8c050"; ctx.fillText(`Gold Collected: ${s.totalCoins}`, sw/2, sh/2+25);
    ctx.fillStyle = "#a080d0"; ctx.fillText(`Hero Level: ${s.playerLevel}`, sw/2, sh/2+50);
    ctx.fillStyle = "#a09060"; ctx.fillText(`Time: ${Math.floor(secs/60)}:${(secs%60).toString().padStart(2,"0")}`, sw/2, sh/2+75);
    // Best scores
    if (s.bestKills > 0 || s.bestTime < 99999) {
      ctx.font = "14px Georgia"; ctx.fillStyle = "#707060";
      const bestSecs = Math.floor((s.bestTime || 99999) / 60);
      ctx.fillText(`Best: ${s.bestKills} kills | ${Math.floor(bestSecs/60)}:${(bestSecs%60).toString().padStart(2,"0")}`, sw/2, sh/2+100);
    }
    ctx.font = "bold 20px Georgia"; ctx.fillStyle = "#d4a843";
    ctx.fillText("Press ENTER to play again", sw/2, sh/2+130);
    ctx.textAlign = "left";
  }

  private _drawPauseScreen(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(0, 0, sw, sh);
    ctx.textAlign = "center";
    ctx.font = "bold 48px Georgia"; ctx.fillStyle = "#d4a843";
    ctx.fillText("PAUSED", sw/2, sh/2-30);
    const secs = Math.floor(s.totalTime/60);
    ctx.font = "15px Georgia"; ctx.fillStyle = "#a08030";
    ctx.fillText(`Level: ${LEVEL_NAMES[s.currentLevel]} | Kills: ${s.totalKills} | Coins: ${s.totalCoins} | Time: ${Math.floor(secs/60)}:${(secs%60).toString().padStart(2,"0")}`, sw/2, sh/2+10);
    ctx.fillText(`Player Level: ${s.playerLevel} | XP: ${s.playerXP}/${xpForLevel(s.playerLevel)} | Sword +${s.player.swordLevel}`, sw/2, sh/2+35);
    ctx.fillStyle = "#806020"; ctx.fillText("Press P or Escape to resume", sw/2, sh/2+70);
    ctx.textAlign = "left";
  }

  private _drawDialogue(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, sw, sh);
    const bw = Math.min(700, sw-40), bh = 120;
    const bx = (sw-bw)/2, by = sh-bh-80;
    ctx.fillStyle = "rgba(10,8,20,0.9)"; ctx.strokeStyle = "#d4a843"; ctx.lineWidth = 2;
    ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
    ctx.textAlign = "center";
    if (s.dialogueQueue.length > 0) {
      const line = s.dialogueQueue[0];
      ctx.font = "14px Georgia"; ctx.fillStyle = "#d4a843"; ctx.letterSpacing = "2px";
      ctx.fillText(line.speaker, sw/2, by+25);
      ctx.font = "18px Georgia"; ctx.fillStyle = "#c0a050";
      ctx.fillText(line.text, sw/2, by+60, bw-40);
    }
    ctx.font = "13px Georgia"; ctx.fillStyle = "#806020";
    ctx.fillText("Press any key to continue", sw/2, by+bh-15);
    ctx.textAlign = "left";
  }

  private _drawShop(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0, 0, sw, sh);
    ctx.textAlign = "center";
    ctx.font = "36px Georgia"; ctx.fillStyle = "#d4a843"; ctx.fillText("MERCHANT", sw/2, sh/2-120);
    ctx.font = "14px Georgia"; ctx.fillStyle = "#a08030"; ctx.fillText(`Coins: ${s.totalCoins}`, sw/2, sh/2-85);
    ctx.font = "20px Georgia";
    for (let i = 0; i < s.shopItems.length; i++) {
      const item = s.shopItems[i];
      const y = sh/2-40+i*40;
      ctx.fillStyle = i===s.shopSelection ? (s.totalCoins>=item.cost?"#f0e060":"#806040") : (s.totalCoins>=item.cost?"#a08030":"#504030");
      ctx.fillText(`${i===s.shopSelection?"> ":""}${item.name} — ${item.cost} coins`, sw/2, y);
    }
    ctx.font = "13px Georgia"; ctx.fillStyle = "#806020";
    ctx.fillText("W/S to select, J/Z to buy, E to continue", sw/2, sh/2+130);
    ctx.textAlign = "left";
  }

  // === BACKGROUND ===
  private _drawBackground(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    const grad = ctx.createLinearGradient(0,0,0,sh);
    const bgs: Record<string,[string,string]> = {dungeon:["#0a0810","#151020"],hall:["#10081a","#1a1028"],tower:["#0d1020","#182038"],throne:["#180818","#200a20"]};
    const bg = bgs[s.levelData.bg]||bgs.dungeon;
    grad.addColorStop(0,bg[0]); grad.addColorStop(1,bg[1]);
    ctx.fillStyle = grad; ctx.fillRect(0,0,sw,sh);
    // Stars (tower/hall/throne)
    if (s.levelData.bg!=="dungeon") {
      ctx.globalAlpha=0.4;
      const seed=42;
      for(let i=0;i<40;i++){
        const sx2=((i*137+seed)%sw+sw-(s.camera.x*0.005)%sw)%sw;
        const sy2=((i*89+seed*3)%((sh*0.5)));
        const twinkle=Math.sin(s.gameTime*0.05+i*1.7)*0.3+0.7;
        ctx.globalAlpha=twinkle*0.4;
        ctx.fillStyle=i%5===0?"#ffe8a0":"#c0c8e0";
        const sz=i%7===0?2:1;
        ctx.fillRect(sx2,sy2,sz,sz);
        if(i%7===0){ // bright star cross
          ctx.globalAlpha=twinkle*0.15;
          ctx.fillRect(sx2-1,sy2,sz+2,sz); ctx.fillRect(sx2,sy2-1,sz,sz+2);
        }
      }
      ctx.globalAlpha=1;
    }
    // Moon
    if (s.levelData.bg==="tower"||s.levelData.bg==="hall") {
      const mx=sw*0.8-(s.camera.x*0.02)%50, my=60-(s.camera.y*0.01)%20;
      // Moon glow
      const moonGlow=ctx.createRadialGradient(mx,my,15,mx,my,100);
      moonGlow.addColorStop(0,"rgba(180,190,220,0.1)"); moonGlow.addColorStop(1,"rgba(100,110,150,0)");
      ctx.fillStyle=moonGlow; ctx.fillRect(mx-100,my-100,200,200);
      // Moon body
      ctx.fillStyle="#d0d8e8"; ctx.beginPath(); ctx.arc(mx,my,28,0,Math.PI*2); ctx.fill();
      // Crescent shadow
      ctx.fillStyle="#8090b0"; ctx.beginPath(); ctx.arc(mx-6,my-3,26,0,Math.PI*2); ctx.fill();
      // Moon surface detail
      ctx.fillStyle="rgba(160,170,200,0.3)"; ctx.beginPath(); ctx.arc(mx+8,my+5,4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx+2,my-8,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx-2,my+10,2.5,0,Math.PI*2); ctx.fill();
    }
    // Drifting clouds
    if (s.levelData.bg!=="dungeon") {
      ctx.globalAlpha=0.04;
      for(let i=0;i<4;i++){
        const cx2=((s.gameTime*0.15+i*300)%(sw+300))-150;
        const cy2=30+i*35+Math.sin(s.gameTime*0.008+i)*10;
        ctx.fillStyle="#606878";
        ctx.beginPath(); ctx.ellipse(cx2,cy2,60+i*15,12+i*3,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx2+25,cy2-4,35+i*8,8+i*2,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx2-20,cy2+2,40+i*10,10+i*2,0,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
    }
    ctx.globalAlpha=0.08;
    const cx1=-(s.camera.x*0.03)%600;
    for(let x=cx1-100;x<sw+200;x+=500){
      ctx.fillStyle="#252535";
      ctx.fillRect(x+40,sh*0.3,30,sh*0.5); ctx.fillRect(x+30,sh*0.25,50,20);
      ctx.fillRect(x+120,sh*0.35,25,sh*0.4); ctx.fillRect(x+110,sh*0.3,45,18);
      ctx.fillRect(x+70,sh*0.45,50,sh*0.3);
      for(let b=0;b<6;b++) ctx.fillRect(x+30+b*25,sh*0.42,12,10);
    }
    ctx.globalAlpha=0.12;
    for(let x=0;x<sw+200;x+=120) for(let y=0;y<sh+100;y+=80){
      const px=x-(s.camera.x*0.08)%120, py=y-(s.camera.y*0.04)%80;
      ctx.fillStyle="#3a3a4a"; ctx.fillRect(px,py,100,60);
      ctx.fillStyle="#2e2e3e"; ctx.fillRect(px+2,py+2,46,26); ctx.fillRect(px+52,py+2,46,26);
      ctx.fillRect(px+2,py+32,30,26); ctx.fillRect(px+36,py+32,30,26);
    }
    ctx.globalAlpha=1;
    if(s.levelData.bg==="dungeon"){
      ctx.globalAlpha=0.06;
      for(let x=80;x<sw;x+=200){
        const px=x-(s.camera.x*0.05)%200;
        ctx.fillStyle="#505060";
        ctx.fillRect(px,0,2,sh*0.7+Math.sin(px*0.01)*30);
        ctx.fillRect(px+60,0,2,sh*0.5+Math.sin(px*0.02)*40);
      }
      ctx.globalAlpha=1;
    }
    if(s.levelData.bg==="hall"){
      ctx.globalAlpha=0.05;
      for(let x=100;x<sw;x+=300){
        const px=x-(s.camera.x*0.04)%300;
        ctx.fillStyle="#302050"; ctx.fillRect(px,sh*0.1,40,80);
        ctx.fillStyle="#502030"; ctx.fillRect(px+5,sh*0.12,30,70);
        ctx.fillStyle="#203060"; ctx.fillRect(px+10,sh*0.15,20,50);
      }
      ctx.globalAlpha=1;
    }
  }

  private _drawForeground(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    if(s.levelData.bg==="dungeon"||s.levelData.bg==="tower"){
      ctx.globalAlpha=0.08;
      for(let x=0;x<sw+300;x+=350){
        const px=x-(s.camera.x*0.15)%350;
        ctx.strokeStyle="#808090"; ctx.lineWidth=1; ctx.beginPath();
        ctx.moveTo(px,0); ctx.quadraticCurveTo(px+40,30,px+80,0);
        ctx.moveTo(px,0); ctx.quadraticCurveTo(px+20,40,px,80);
        ctx.moveTo(px,0); ctx.quadraticCurveTo(px+30,25,px+50,50);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
    ctx.globalAlpha=0.04;
    for(let i=0;i<3;i++){
      const fx=(s.gameTime*0.3+i*400)%(sw+200)-100;
      const fy=sh*0.6+Math.sin(s.gameTime*0.01+i*2)*40+i*30;
      ctx.fillStyle="#8090a0"; ctx.beginPath(); ctx.ellipse(fx,fy,80+i*20,10+i*5,0,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  // === TILES ===
  private _drawTiles(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    const sx=Math.floor(s.camera.x/TILE)-1, sy=Math.floor(s.camera.y/TILE)-1;
    const ex=sx+Math.ceil(sw/TILE)+3, ey=sy+Math.ceil(sh/TILE)+3;
    for(let ty=sy;ty<=ey;ty++) for(let tx=sx;tx<=ex;tx++){
      if(ty<0||ty>=s.levelData.height||tx<0||tx>=s.levelData.width) continue;
      const t=s.levelData.tiles[ty][tx];
      const x=tx*TILE-s.camera.x, y=ty*TILE-s.camera.y;
      switch(t){
        case T.STONE: case T.MOSS_STONE: this._drawStoneTile(ctx,x,y,tx,ty,t===T.MOSS_STONE); break;
        case T.BRICK: this._drawBrickTile(ctx,x,y,tx,ty); break;
        case T.WOOD_FLOOR: this._drawWoodTile(ctx,x,y,tx); break;
        case T.SPIKE_UP: this._drawSpike(ctx,s,x,y,false); break;
        case T.SPIKE_DOWN: this._drawSpike(ctx,s,x,y,true); break;
        case T.LADDER: this._drawLadder(ctx,x,y); break;
        case T.PLATFORM: this._drawPlatform(ctx,x,y); break;
        case T.CRUMBLE: this._drawCrumble(ctx,x,y); break;
        case T.TORCH: this._drawTorch(ctx,s,x,y); break;
        case T.CHAIN: this._drawChain(ctx,x,y); break;
        case T.GATE: this._drawGate(ctx,x,y); break;
        case T.LEVER: this._drawLever(ctx,x,y); break;
        case T.BANNER: this._drawBanner(ctx,s,x,y); break;
        case T.PILLAR: this._drawPillar(ctx,x,y); break;
        case T.PILLAR_TOP: this._drawPillarTop(ctx,x,y); break;
        case T.WINDOW: this._drawWindow(ctx,x,y); break;
        case T.EXIT: this._drawExit(ctx,s,x,y); break;
        case T.CHECKPOINT: this._drawCheckpoint(ctx,s,x,y); break;
        case T.BONES: this._drawBones(ctx,x,y); break;
        case T.BLOODSTAIN: this._drawBloodstain(ctx,x,y,tx,ty); break;
        case T.CAGE: this._drawCage(ctx,x,y); break;
        case T.SKULL: this._drawSkull(ctx,x,y); break;
        case T.WATER_SURFACE: this._drawWater(ctx,s,x,y); break;
        case T.LAVA: this._drawLava(ctx,s,x,y); break;
        case T.SECRET_WALL: this._drawStoneTile(ctx,x,y,tx,ty,false); break; // looks like stone
        case T.ARROW_TRAP: this._drawArrowTrap(ctx,s,x,y); break;
      }
    }
  }

  private _drawStoneTile(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number, moss: boolean): void {
    const si=(tx*7+ty*13)%4;
    const sg=ctx.createLinearGradient(x,y,x,y+TILE);
    sg.addColorStop(0,PAL.stoneLight[si%3]); sg.addColorStop(1,PAL.stone[si]);
    ctx.fillStyle=sg; ctx.fillRect(x,y,TILE,TILE);
    const blocks=[[0,0,TILE/2-1,TILE/2-1],[TILE/2,0,TILE/2,TILE/2-1],[0,TILE/2,TILE/2-1,TILE/2],[TILE/2,TILE/2,TILE/2,TILE/2]];
    for(const[bx,by,bw,bh] of blocks){
      const bs=(tx*3+ty*5+bx+by)%3;
      ctx.fillStyle=PAL.stoneLight[bs]; ctx.fillRect(x+bx+1,y+by+1,bw-2,bh-2);
      ctx.fillStyle="rgba(255,255,255,0.06)"; ctx.fillRect(x+bx+1,y+by+1,bw-2,1);
      ctx.fillStyle="rgba(0,0,0,0.1)"; ctx.fillRect(x+bx+1,y+by+bh-2,bw-2,1);
    }
    ctx.fillStyle="#1a1a28";
    ctx.fillRect(x,y+TILE/2-1,TILE,2); ctx.fillRect(x+TILE/2-1,y,2,TILE/2);
    ctx.fillRect(x+TILE/4-1,y+TILE/2,2,TILE/2); ctx.fillRect(x+TILE*3/4-1,y+TILE/2,2,TILE/2);
    if(si===2){ ctx.fillStyle="rgba(0,0,0,0.08)"; ctx.fillRect(x+8,y+6,6,1); ctx.fillRect(x+10,y+7,1,4); }
    if(moss){
      ctx.fillStyle="#2a5a20"; ctx.fillRect(x,y,TILE,5);
      ctx.fillStyle="#3a7a30"; ctx.beginPath(); ctx.ellipse(x+8,y+2,5,3,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+24,y+3,6,3,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#1a4a10"; ctx.fillRect(x+14,y+1,3,2); ctx.fillRect(x+32,y+2,4,2);
    }
  }

  private _drawBrickTile(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number): void {
    const si=(tx*3+ty*11)%4;
    ctx.fillStyle=PAL.brick[si]; ctx.fillRect(x,y,TILE,TILE);
    const brickW=TILE/3, brickH=TILE/3;
    for(let row=0;row<3;row++){
      const rowOff=row%2===0?0:brickW/2;
      for(let col=-1;col<4;col++){
        const bx=x+col*brickW+rowOff, by=y+row*brickH;
        if(bx+brickW<x||bx>x+TILE) continue;
        ctx.fillStyle="rgba(255,200,150,0.08)";
        ctx.fillRect(Math.max(x,bx)+1,by+1,Math.min(bx+brickW,x+TILE)-Math.max(x,bx)-2,1);
        ctx.fillStyle="rgba(0,0,0,0.12)";
        ctx.fillRect(Math.max(x,bx)+1,by+brickH-2,Math.min(bx+brickW,x+TILE)-Math.max(x,bx)-2,1);
      }
    }
    ctx.fillStyle="#2a1810";
    const off=(ty%2)*(TILE/3);
    ctx.fillRect(x,y+TILE/3-1,TILE,2); ctx.fillRect(x,y+TILE*2/3-1,TILE,2);
    for(let i=0;i<4;i++){
      ctx.fillRect(x+i*TILE/3+off-1,y,2,TILE/3);
      ctx.fillRect(x+i*TILE/3+TILE/6+off-1,y+TILE/3,2,TILE/3);
      ctx.fillRect(x+i*TILE/3+off-1,y+TILE*2/3,2,TILE/3);
    }
  }

  private _drawWoodTile(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number): void {
    const wg=ctx.createLinearGradient(x,y,x,y+TILE);
    wg.addColorStop(0,PAL.wood[tx%3]); wg.addColorStop(0.5,"#7b5a30"); wg.addColorStop(1,PAL.wood[(tx+1)%3]);
    ctx.fillStyle=wg; ctx.fillRect(x,y,TILE,TILE);
    ctx.fillStyle="#3a2810"; for(let i=0;i<3;i++) ctx.fillRect(x,y+i*TILE/3+TILE/6,TILE,2);
    ctx.fillStyle="rgba(255,220,160,0.06)"; for(let i=0;i<3;i++) ctx.fillRect(x,y+i*TILE/3+TILE/6+2,TILE,1);
    ctx.fillStyle="rgba(80,50,20,0.12)"; const gx=(tx*13)%8;
    ctx.fillRect(x+gx,y+2,1,TILE-4); ctx.fillRect(x+gx+12,y+4,1,TILE-8); ctx.fillRect(x+gx+24,y+1,1,TILE-2);
    ctx.fillStyle="#505050"; ctx.fillRect(x+4,y+TILE/6+1,2,2); ctx.fillRect(x+TILE-6,y+TILE*2/3+1,2,2);
  }

  private _drawSpike(ctx: CanvasRenderingContext2D, s: CamelotState, x: number, y: number, down: boolean): void {
    const pulse=0.15+Math.sin(s.gameTime*0.1)*0.05;
    const wg=ctx.createRadialGradient(x+TILE/2,down?y+TILE/2:y+TILE/2,4,x+TILE/2,down?y+TILE/2:y+TILE/2,TILE);
    wg.addColorStop(0,`rgba(200,40,40,${pulse})`); wg.addColorStop(1,"rgba(200,40,40,0)");
    ctx.fillStyle=wg; ctx.fillRect(x-10,y-10,TILE+20,TILE+20);
    for(let i=0;i<4;i++){
      const sx=x+i*10+2;
      const grad=ctx.createLinearGradient(sx,down?y:y+TILE,sx+4,down?y+TILE:y);
      grad.addColorStop(0,"#a0a0b0"); grad.addColorStop(0.6,"#707080"); grad.addColorStop(1,"#505060");
      ctx.fillStyle=grad; ctx.beginPath();
      if(down){ ctx.moveTo(sx,y); ctx.lineTo(sx+8,y); ctx.lineTo(sx+4,y+TILE-4); }
      else { ctx.moveTo(sx,y+TILE); ctx.lineTo(sx+8,y+TILE); ctx.lineTo(sx+4,y+4); }
      ctx.fill();
      ctx.fillStyle="#d0d0e0"; ctx.fillRect(sx+3,down?y+TILE-6:y+4,2,2);
    }
    ctx.fillStyle="rgba(120,20,20,0.6)"; ctx.fillRect(x+8,down?y+2:y+TILE-8,8,5); ctx.fillRect(x+22,down?y+4:y+TILE-6,5,3);
  }

  private _drawLadder(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle="#8b6914"; ctx.fillRect(x+8,y,4,TILE); ctx.fillRect(x+TILE-12,y,4,TILE);
    ctx.fillRect(x+8,y+TILE/3,TILE-20,3); ctx.fillRect(x+8,y+TILE*2/3,TILE-20,3);
  }

  private _drawPlatform(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const pg=ctx.createLinearGradient(x,y,x,y+8);
    pg.addColorStop(0,"#8a8a9a"); pg.addColorStop(0.3,"#7a7a8a"); pg.addColorStop(1,"#5a5a6a");
    ctx.fillStyle=pg; ctx.fillRect(x,y,TILE,8);
    ctx.fillStyle="#3a3a4a"; ctx.fillRect(x+2,y+8,TILE-4,4);
    ctx.fillStyle="rgba(200,200,220,0.25)"; ctx.fillRect(x,y,TILE,1);
    for(const rx of [4,TILE/2-1,TILE-7]){
      ctx.fillStyle="#a0a0b0"; ctx.beginPath(); ctx.arc(x+rx+1.5,y+3.5,2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#c0c0d0"; ctx.fillRect(x+rx+1,y+2,1,1);
    }
    ctx.fillStyle="#4a4a5a";
    ctx.beginPath(); ctx.moveTo(x+4,y+8); ctx.lineTo(x+8,y+14); ctx.lineTo(x+12,y+8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+TILE-12,y+8); ctx.lineTo(x+TILE-8,y+14); ctx.lineTo(x+TILE-4,y+8); ctx.fill();
  }

  private _drawCrumble(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle="#5a5040"; ctx.fillRect(x,y,TILE,8);
    ctx.fillStyle="#4a4030"; ctx.fillRect(x+2,y+8,TILE-4,3);
    ctx.strokeStyle="#302818"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x+8,y+1); ctx.lineTo(x+12,y+5); ctx.lineTo(x+10,y+8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+22,y+2); ctx.lineTo(x+26,y+6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+34,y+3); ctx.lineTo(x+30,y+7); ctx.stroke();
    ctx.fillStyle="#5a5040"; ctx.fillRect(x+6,y+8,4,3); ctx.fillRect(x+28,y+9,3,2);
    ctx.fillStyle="rgba(100,90,60,0.3)"; ctx.fillRect(x+14,y+10,2,2); ctx.fillRect(x+32,y+11,2,1);
  }

  private _drawTorch(ctx: CanvasRenderingContext2D, s: CamelotState, x: number, y: number): void {
    ctx.fillStyle="#6b4a20"; ctx.fillRect(x+TILE/2-3,y+8,6,TILE-10);
    ctx.fillStyle="#808090"; ctx.fillRect(x+TILE/2-6,y+TILE-8,12,4);
    const f1=Math.sin(s.gameTime*0.15)*3, f2=Math.cos(s.gameTime*0.2)*2;
    ctx.fillStyle="#ffcc33"; ctx.beginPath(); ctx.ellipse(x+TILE/2+f2,y+4+f1,6,10,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ff6600"; ctx.beginPath(); ctx.ellipse(x+TILE/2+f2,y+8+f1,4,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ffff66"; ctx.beginPath(); ctx.ellipse(x+TILE/2+f2,y+6+f1,2,3,0,0,Math.PI*2); ctx.fill();
    const g=ctx.createRadialGradient(x+TILE/2,y+6,2,x+TILE/2,y+6,80);
    g.addColorStop(0,"rgba(255,150,50,0.15)"); g.addColorStop(1,"rgba(255,100,0,0)");
    ctx.fillStyle=g; ctx.fillRect(x-60,y-60,160,160);
  }

  private _drawChain(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle="#707080";
    for(let i=0;i<4;i++){ ctx.fillRect(x+TILE/2-3,y+i*10,6,8); ctx.fillStyle="#505060"; ctx.fillRect(x+TILE/2-1,y+i*10+2,2,4); ctx.fillStyle="#707080"; }
  }

  private _drawGate(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle="#606070";
    for(let i=0;i<4;i++) ctx.fillRect(x+4+i*10,y,4,TILE);
    ctx.fillRect(x,y+TILE/3,TILE,3); ctx.fillRect(x,y+TILE*2/3,TILE,3);
  }

  private _drawLever(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle="#808090"; ctx.fillRect(x+TILE/2-3,y+TILE/2,6,TILE/2);
    ctx.fillStyle="#d4a843"; ctx.beginPath(); ctx.arc(x+TILE/2,y+TILE/2-4,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(212,168,67,0.2)"; ctx.beginPath(); ctx.arc(x+TILE/2,y+TILE/2,15,0,Math.PI*2); ctx.fill();
  }

  private _drawBanner(ctx: CanvasRenderingContext2D, s: CamelotState, x: number, y: number): void {
    ctx.fillStyle="#808090"; ctx.fillRect(x+6,y,TILE-12,4);
    ctx.fillStyle="#a0a0b0"; ctx.beginPath(); ctx.arc(x+6,y+2,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+TILE-6,y+2,3,0,Math.PI*2); ctx.fill();
    const w1=Math.sin(s.gameTime*0.05+x*0.1)*2.5, w2=Math.sin(s.gameTime*0.07+x*0.1+1)*1.5;
    ctx.fillStyle="#6b1818"; ctx.beginPath();
    ctx.moveTo(x+8,y+4); ctx.lineTo(x+TILE-8,y+4);
    ctx.quadraticCurveTo(x+TILE-6+w1,y+TILE/2, x+TILE-8+w2,y+TILE);
    ctx.lineTo(x+TILE/2,y+TILE-8+w1); ctx.lineTo(x+8+w2,y+TILE);
    ctx.quadraticCurveTo(x+6+w1,y+TILE/2, x+8,y+4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle="#8b2828"; ctx.beginPath();
    ctx.moveTo(x+10,y+6); ctx.lineTo(x+TILE-10,y+6);
    ctx.quadraticCurveTo(x+TILE-8+w1*0.5,y+TILE/2-4, x+TILE-10+w2*0.5,y+TILE-4);
    ctx.lineTo(x+TILE/2,y+TILE-10+w1); ctx.lineTo(x+10+w2*0.5,y+TILE-4);
    ctx.quadraticCurveTo(x+8+w1*0.5,y+TILE/2-4, x+10,y+6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle="#d4a843"; ctx.fillRect(x+8,y+4,TILE-16,2);
    ctx.fillStyle="#d4a843"; ctx.beginPath();
    ctx.moveTo(x+TILE/2,y+12); ctx.lineTo(x+TILE/2+4,y+15); ctx.lineTo(x+TILE/2+6,y+20);
    ctx.lineTo(x+TILE/2+3,y+26); ctx.lineTo(x+TILE/2+1,y+24); ctx.lineTo(x+TILE/2-1,y+22);
    ctx.lineTo(x+TILE/2-3,y+16); ctx.lineTo(x+TILE/2-5,y+13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+TILE/2-1,y+16); ctx.lineTo(x+TILE/2-6,y+12); ctx.lineTo(x+TILE/2-3,y+19); ctx.closePath(); ctx.fill();
  }

  private _drawPillar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const g=ctx.createLinearGradient(x+6,0,x+TILE-6,0);
    g.addColorStop(0,"#3a3a4a"); g.addColorStop(0.2,"#5a5a6a"); g.addColorStop(0.5,"#6a6a7a");
    g.addColorStop(0.8,"#5a5a6a"); g.addColorStop(1,"#3a3a4a");
    ctx.fillStyle=g; ctx.fillRect(x+8,y,TILE-16,TILE);
    ctx.fillStyle="rgba(0,0,0,0.08)"; ctx.fillRect(x+12,y,1,TILE); ctx.fillRect(x+18,y,1,TILE); ctx.fillRect(x+24,y,1,TILE);
    ctx.fillStyle="rgba(255,255,255,0.05)"; ctx.fillRect(x+15,y,3,TILE);
  }

  private _drawPillarTop(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this._drawPillar(ctx,x,y);
    ctx.fillStyle="#5a5a6a"; ctx.fillRect(x+4,y+4,TILE-8,4); ctx.fillRect(x+2,y,TILE-4,4);
    ctx.fillStyle="#6a6a7a";
    ctx.beginPath(); ctx.ellipse(x+6,y+3,4,3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+TILE-6,y+3,4,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.1)"; ctx.fillRect(x+2,y,TILE-4,1);
  }

  private _drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle="#1a2040"; ctx.fillRect(x+8,y+4,TILE-16,TILE-8);
    // Window glass gradient
    const wg=ctx.createLinearGradient(x+8,y+4,x+TILE-8,y+TILE-4);
    wg.addColorStop(0,"rgba(60,80,140,0.5)"); wg.addColorStop(0.5,"rgba(80,100,160,0.3)"); wg.addColorStop(1,"rgba(40,60,120,0.5)");
    ctx.fillStyle=wg; ctx.fillRect(x+9,y+5,TILE-18,TILE-10);
    // Glow
    const g=ctx.createRadialGradient(x+TILE/2,y+TILE/2,2,x+TILE/2,y+TILE/2,35);
    g.addColorStop(0,"rgba(100,130,200,0.5)"); g.addColorStop(1,"rgba(50,60,100,0)");
    ctx.fillStyle=g; ctx.fillRect(x-15,y-15,TILE+30,TILE+30);
    // Frame
    ctx.strokeStyle="#5a5a6a"; ctx.lineWidth=2; ctx.strokeRect(x+8,y+4,TILE-16,TILE-8);
    ctx.beginPath(); ctx.moveTo(x+TILE/2,y+4); ctx.lineTo(x+TILE/2,y+TILE-4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+8,y+TILE/2); ctx.lineTo(x+TILE-8,y+TILE/2); ctx.stroke();
    // Light shaft pouring through
    ctx.globalAlpha=0.04;
    ctx.fillStyle="#8090c0";
    ctx.beginPath();
    ctx.moveTo(x+8,y+TILE); ctx.lineTo(x+TILE-8,y+TILE);
    ctx.lineTo(x+TILE+20,y+TILE*5); ctx.lineTo(x-20,y+TILE*5); ctx.closePath(); ctx.fill();
    ctx.globalAlpha=1;
  }

  private _drawExit(ctx: CanvasRenderingContext2D, s: CamelotState, x: number, y: number): void {
    const pulse=0.5+Math.sin(s.gameTime*0.08)*0.3;
    const g=ctx.createRadialGradient(x+TILE/2,y+TILE/2,4,x+TILE/2,y+TILE/2,50);
    g.addColorStop(0,`rgba(212,168,67,${pulse})`); g.addColorStop(1,"rgba(212,168,67,0)");
    ctx.fillStyle=g; ctx.fillRect(x-30,y-30,TILE+60,TILE+60);
    ctx.fillStyle=`rgba(255,220,100,${pulse*0.8})`; ctx.fillRect(x+4,y+4,TILE-8,TILE-8);
  }

  private _drawCheckpoint(ctx: CanvasRenderingContext2D, s: CamelotState, x: number, y: number): void {
    const active=s.checkpointActive&&Math.abs(s.checkpointActive.x-((x+s.camera.x)))<TILE*2;
    ctx.fillStyle="#808090"; ctx.fillRect(x+TILE/2-2,y+4,4,TILE-4);
    const wave=Math.sin(s.gameTime*0.08)*2;
    ctx.fillStyle=active?"#50c050":"#c0a030"; ctx.beginPath();
    ctx.moveTo(x+TILE/2+2,y+4); ctx.lineTo(x+TILE/2+18+wave,y+10); ctx.lineTo(x+TILE/2+2,y+18); ctx.closePath(); ctx.fill();
    const pulse=0.4+Math.sin(s.gameTime*0.1)*0.2;
    const color=active?"rgba(80,200,80,":"rgba(200,160,50,";
    const g=ctx.createRadialGradient(x+TILE/2,y+12,2,x+TILE/2,y+12,30);
    g.addColorStop(0,color+pulse+")"); g.addColorStop(1,color+"0)");
    ctx.fillStyle=g; ctx.fillRect(x-10,y-10,TILE+20,TILE+20);
  }

  private _drawBones(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle="#b0a890";
    ctx.fillRect(x+4,y+TILE-8,14,3); ctx.fillRect(x+3,y+TILE-7,3,5); ctx.fillRect(x+16,y+TILE-7,3,5);
    ctx.fillRect(x+22,y+TILE-10,10,2); ctx.fillRect(x+20,y+TILE-6,8,2);
    ctx.fillStyle="#a09880"; ctx.fillRect(x+12,y+TILE-12,6,3);
  }

  private _drawBloodstain(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number): void {
    const seed=(tx*17+ty*31)%5;
    ctx.globalAlpha=0.3; ctx.fillStyle="#601010"; ctx.beginPath();
    ctx.ellipse(x+TILE/2+seed*3,y+TILE-4,12+seed*2,4+seed,0,0,Math.PI*2); ctx.fill();
    if(seed>2){ ctx.fillRect(x+10+seed*2,y+TILE-8,3,6); ctx.fillRect(x+24-seed,y+TILE-6,2,4); }
    ctx.globalAlpha=1;
  }

  private _drawCage(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle="#505060"; ctx.fillRect(x+TILE/2-1,y,2,8);
    ctx.strokeStyle="#606070"; ctx.lineWidth=2; ctx.strokeRect(x+6,y+8,TILE-12,TILE-10);
    ctx.fillStyle="#606070"; for(let i=0;i<3;i++) ctx.fillRect(x+12+i*7,y+8,2,TILE-10);
    ctx.fillStyle="#a09880"; ctx.fillRect(x+14,y+18,8,7);
    ctx.fillStyle="#202020"; ctx.fillRect(x+15,y+20,2,2); ctx.fillRect(x+19,y+20,2,2);
  }

  private _drawSkull(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle="#b0a890"; ctx.fillRect(x+12,y+TILE-14,12,10); ctx.fillRect(x+14,y+TILE-16,8,4);
    ctx.fillStyle="#202020"; ctx.fillRect(x+14,y+TILE-10,3,3); ctx.fillRect(x+20,y+TILE-10,3,3);
    ctx.fillStyle="#908870"; ctx.fillRect(x+16,y+TILE-6,4,2);
  }

  private _drawWater(ctx: CanvasRenderingContext2D, s: CamelotState, x: number, y: number): void {
    // Animated water surface with ripple
    const wave1 = Math.sin(s.gameTime * 0.08 + x * 0.05) * 3;
    const wave2 = Math.sin(s.gameTime * 0.12 + x * 0.03) * 2;
    ctx.fillStyle = "rgba(30,60,120,0.6)"; ctx.fillRect(x, y + 4 + wave1, TILE, TILE - 4);
    ctx.fillStyle = "rgba(60,100,180,0.4)"; ctx.fillRect(x, y + wave1, TILE, 4);
    // Surface highlight
    ctx.fillStyle = "rgba(100,160,255,0.3)";
    ctx.fillRect(x + 4 + wave2, y + 2 + wave1, TILE / 3, 2);
    ctx.fillRect(x + TILE / 2 + wave2, y + 3 + wave1, TILE / 4, 1);
    // Bubbles
    if (Math.random() < 0.02) {
      ctx.fillStyle = "rgba(150,200,255,0.5)";
      ctx.beginPath(); ctx.arc(x + Math.random() * TILE, y + 10 + Math.random() * 20, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  private _drawLava(ctx: CanvasRenderingContext2D, s: CamelotState, x: number, y: number): void {
    const pulse = Math.sin(s.gameTime * 0.1 + x * 0.04) * 0.15;
    // Lava body
    const lg = ctx.createLinearGradient(x, y, x, y + TILE);
    lg.addColorStop(0, `rgba(255,${80 + pulse * 100},0,0.9)`);
    lg.addColorStop(0.5, "#cc3300");
    lg.addColorStop(1, "#991100");
    ctx.fillStyle = lg; ctx.fillRect(x, y, TILE, TILE);
    // Surface glow
    const wave = Math.sin(s.gameTime * 0.06 + x * 0.08) * 3;
    ctx.fillStyle = `rgba(255,200,50,${0.4 + pulse})`;
    ctx.fillRect(x, y + wave, TILE, 3);
    // Hot cracks
    ctx.fillStyle = "#ff8800";
    ctx.fillRect(x + 8 + wave, y + 12, 10, 2);
    ctx.fillRect(x + 20 - wave, y + 24, 8, 2);
    // Glow above
    const gg = ctx.createRadialGradient(x + TILE / 2, y, 5, x + TILE / 2, y, 40);
    gg.addColorStop(0, "rgba(255,100,0,0.15)"); gg.addColorStop(1, "rgba(255,50,0,0)");
    ctx.fillStyle = gg; ctx.fillRect(x - 20, y - 40, TILE + 40, 60);
  }

  private _drawArrowTrap(ctx: CanvasRenderingContext2D, s: CamelotState, x: number, y: number): void {
    // Wall-mounted crossbow mechanism
    ctx.fillStyle = "#505060"; ctx.fillRect(x + 8, y + 10, TILE - 16, 20);
    ctx.fillStyle = "#606070"; ctx.fillRect(x + 12, y + 14, TILE - 24, 12);
    // Arrow slot
    ctx.fillStyle = "#202030"; ctx.fillRect(x + TILE / 2 - 3, y + 16, 6, 8);
    // Warning glow when about to fire
    const timer = s.gameTime % 120;
    if (timer > 100) {
      const glow = (timer - 100) / 20;
      ctx.fillStyle = `rgba(255,50,50,${glow * 0.3})`;
      ctx.beginPath(); ctx.arc(x + TILE / 2, y + 20, 12, 0, Math.PI * 2); ctx.fill();
    }
  }

  // === ENTITIES ===
  private _drawMovingPlatforms(ctx: CanvasRenderingContext2D, s: CamelotState): void {
    for(const mp of s.movingPlatforms){
      const x=mp.x-s.camera.x, y=mp.y-s.camera.y;
      // Chain/cable above
      ctx.strokeStyle="#505060"; ctx.lineWidth=2;
      ctx.setLineDash([3,3]); ctx.lineDashOffset=s.gameTime*0.5;
      ctx.beginPath(); ctx.moveTo(x+mp.w/2,y-10); ctx.lineTo(x+mp.w/2,y); ctx.stroke();
      ctx.setLineDash([]);
      // Platform body with metallic gradient
      const pg=ctx.createLinearGradient(x,y,x,y+mp.h);
      pg.addColorStop(0,"#9a9aaa"); pg.addColorStop(0.3,"#8a8a9a"); pg.addColorStop(1,"#5a5a6a");
      ctx.fillStyle=pg; ctx.fillRect(x,y,mp.w,mp.h);
      // Top highlight
      ctx.fillStyle="rgba(200,200,220,0.3)"; ctx.fillRect(x,y,mp.w,1);
      // Bottom shadow
      ctx.fillStyle="#3a3a4a"; ctx.fillRect(x+1,y+mp.h-1,mp.w-2,1);
      // Rivets with 3D effect
      for(const rx of [4,mp.w/2-1,mp.w-7]){
        ctx.fillStyle="#b0b0c0"; ctx.beginPath(); ctx.arc(x+rx+1.5,y+mp.h/2,2.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#d0d0e0"; ctx.fillRect(x+rx+1,y+mp.h/2-1.5,1,1);
      }
      // Gear decoration at chain attachment
      ctx.fillStyle="#606070"; ctx.beginPath(); ctx.arc(x+mp.w/2,y-2,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#707880"; ctx.beginPath(); ctx.arc(x+mp.w/2,y-2,2,0,Math.PI*2); ctx.fill();
    }
  }

  private _drawCrates(ctx: CanvasRenderingContext2D, s: CamelotState): void {
    for(const c of s.crates){
      if(c.hp<=0) continue;
      const x=c.x-s.camera.x, y=c.y-s.camera.y;
      const sx=c.shakeTimer>0?(Math.random()-0.5)*4:0;
      c.shakeTimer=Math.max(0,c.shakeTimer-1);
      ctx.fillStyle="#7b5a30"; ctx.fillRect(x+sx+2,y+2,c.w-4,c.h-4);
      ctx.fillStyle="#6b4a20"; ctx.fillRect(x+sx+4,y+4,c.w-8,c.h-8);
      ctx.fillStyle="#5b3a10"; ctx.fillRect(x+sx+c.w/2-1,y+2,2,c.h-4); ctx.fillRect(x+sx+2,y+c.h/2-1,c.w-4,2);
      ctx.fillStyle="#808090"; ctx.fillRect(x+sx+2,y+c.h/4,c.w-4,2); ctx.fillRect(x+sx+2,y+c.h*3/4,c.w-4,2);
    }
  }

  private _drawTraps(ctx: CanvasRenderingContext2D, s: CamelotState): void {
    for(const tr of s.traps){
      if(tr.type==="blade"){
        const cx=tr.x-s.camera.x, cy=tr.y-s.camera.y;
        ctx.fillStyle="#808090"; ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2); ctx.fill();
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(tr.angle||0);
        ctx.fillStyle="#a0a0b0"; ctx.fillRect(-3,0,6,tr.len!);
        ctx.fillStyle="#c0c0d0"; ctx.fillRect(-5,tr.len!-8,10,8);
        ctx.fillStyle="rgba(255,255,255,0.3)"; ctx.fillRect(-1,4,2,tr.len!-12);
        ctx.restore();
      } else if(tr.type==="fire"){
        const fx=tr.x-s.camera.x, fy=tr.y-s.camera.y;
        ctx.fillStyle="#606070"; ctx.fillRect(fx+TILE/2-6,fy-4,12,8);
        ctx.fillStyle="#808090"; ctx.fillRect(fx+TILE/2-4,fy-6,8,4);
        if(tr.active){
          for(let i=0;i<5;i++){
            const fi=Math.sin(s.gameTime*0.3+i)*3;
            ctx.globalAlpha=0.6-i*0.1; ctx.fillStyle=i<2?"#ff6600":"#ffcc33";
            ctx.fillRect(fx+TILE/2-6+fi,fy-TILE*2+i*TILE/3,12-i,TILE/3);
          }
          ctx.globalAlpha=1;
          const g=ctx.createRadialGradient(fx+TILE/2,fy-TILE,4,fx+TILE/2,fy-TILE,50);
          g.addColorStop(0,"rgba(255,100,0,0.2)"); g.addColorStop(1,"rgba(255,50,0,0)");
          ctx.fillStyle=g; ctx.fillRect(fx-30,fy-TILE*2-20,TILE+60,TILE*2+40);
        }
      }
    }
  }

  private _drawPickups(ctx: CanvasRenderingContext2D, s: CamelotState): void {
    for(const pk of s.pickups){
      const px=pk.x-s.camera.x, py=(pk.type==="coin"?pk.y!:pk.y+Math.sin(s.gameTime*0.08)*4)-s.camera.y;
      const pulse=0.3+Math.sin(s.gameTime*0.1+px*0.01)*0.15;
      if(pk.type==="health"){
        // Glow halo
        const hg=ctx.createRadialGradient(px+12,py+12,4,px+12,py+12,22);
        hg.addColorStop(0,`rgba(200,50,50,${pulse})`); hg.addColorStop(1,"rgba(200,50,50,0)");
        ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(px+12,py+12,22,0,Math.PI*2); ctx.fill();
        // Cross shape
        ctx.fillStyle="#c03030"; ctx.fillRect(px+8,py+4,8,18);
        ctx.fillRect(px+4,py+8,16,10);
        ctx.fillStyle="#e05050"; ctx.fillRect(px+9,py+5,6,16);
        ctx.fillRect(px+5,py+9,14,8);
        // Shine
        ctx.fillStyle="rgba(255,150,150,0.4)"; ctx.fillRect(px+9,py+6,3,4);
      } else if(pk.type==="sword"){
        const sg=ctx.createRadialGradient(px+8,py+16,3,px+8,py+16,25);
        sg.addColorStop(0,`rgba(240,220,100,${pulse})`); sg.addColorStop(1,"rgba(240,220,100,0)");
        ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(px+8,py+16,25,0,Math.PI*2); ctx.fill();
        // Blade
        ctx.fillStyle="#c0c0e0"; ctx.beginPath();
        ctx.moveTo(px+6,py+2); ctx.lineTo(px+10,py+2); ctx.lineTo(px+9,py+20); ctx.lineTo(px+7,py+20); ctx.closePath(); ctx.fill();
        // Guard
        ctx.fillStyle="#d4a843"; ctx.fillRect(px+3,py+20,10,3);
        // Grip
        ctx.fillStyle="#6b4a20"; ctx.fillRect(px+6,py+23,4,8);
        // Pommel
        ctx.fillStyle="#d4a843"; ctx.beginPath(); ctx.arc(px+8,py+32,2.5,0,Math.PI*2); ctx.fill();
      } else if(pk.type==="coin"){
        const spin=Math.sin(s.gameTime*0.15);
        const coinW=Math.max(2,Math.abs(spin)*10);
        // Coin glow
        ctx.globalAlpha=0.3; ctx.fillStyle="#ffe080";
        ctx.beginPath(); ctx.arc(px+8,py+8,10,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
        // Coin body
        ctx.fillStyle="#e8c050"; ctx.beginPath(); ctx.ellipse(px+8,py+8,coinW/2,5,0,0,Math.PI*2); ctx.fill();
        if(coinW>4){ ctx.fillStyle="#d4a843"; ctx.beginPath(); ctx.ellipse(px+8,py+8,coinW/2-1.5,3.5,0,0,Math.PI*2); ctx.fill(); }
        // Coin shine
        if(spin>0.5){ ctx.fillStyle="rgba(255,255,200,0.5)"; ctx.fillRect(px+6,py+6,2,1); }
      } else if(pk.type==="doublejump"){
        const fg=ctx.createRadialGradient(px+12,py+12,3,px+12,py+12,20);
        fg.addColorStop(0,`rgba(128,160,255,${pulse})`); fg.addColorStop(1,"rgba(128,160,255,0)");
        ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(px+12,py+12,20,0,Math.PI*2); ctx.fill();
        // Wing/feather shape
        ctx.fillStyle="#80a0ff"; ctx.beginPath();
        ctx.moveTo(px+12,py); ctx.quadraticCurveTo(px+2,py+8,px+6,py+20);
        ctx.lineTo(px+12,py+14);
        ctx.lineTo(px+18,py+20); ctx.quadraticCurveTo(px+22,py+8,px+12,py); ctx.fill();
        ctx.fillStyle="#a0c0ff"; ctx.beginPath();
        ctx.moveTo(px+12,py+3); ctx.lineTo(px+9,py+14); ctx.lineTo(px+12,py+11); ctx.lineTo(px+15,py+14); ctx.closePath(); ctx.fill();
      } else if(pk.type==="shield"){
        const shg=ctx.createRadialGradient(px+12,py+14,3,px+12,py+14,22);
        shg.addColorStop(0,`rgba(64,96,200,${pulse})`); shg.addColorStop(1,"rgba(64,96,200,0)");
        ctx.fillStyle=shg; ctx.beginPath(); ctx.arc(px+12,py+14,22,0,Math.PI*2); ctx.fill();
        // Shield shape
        ctx.fillStyle="#4060c0"; ctx.beginPath();
        ctx.moveTo(px+12,py); ctx.lineTo(px+24,py+6); ctx.lineTo(px+22,py+22);
        ctx.lineTo(px+12,py+28); ctx.lineTo(px+2,py+22); ctx.lineTo(px,py+6); ctx.closePath(); ctx.fill();
        // Shield face
        ctx.fillStyle="#5080e0"; ctx.beginPath();
        ctx.moveTo(px+12,py+3); ctx.lineTo(px+21,py+8); ctx.lineTo(px+20,py+20);
        ctx.lineTo(px+12,py+25); ctx.lineTo(px+4,py+20); ctx.lineTo(px+3,py+8); ctx.closePath(); ctx.fill();
        // Boss emblem
        ctx.fillStyle="#d4a843"; ctx.beginPath(); ctx.arc(px+12,py+14,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#3050a0"; ctx.beginPath(); ctx.arc(px+12,py+14,2.5,0,Math.PI*2); ctx.fill();
      }
    }
  }

  private _drawProjectiles(ctx: CanvasRenderingContext2D, s: CamelotState): void {
    for(const pr of s.projectiles){
      ctx.save();
      const px=pr.x-s.camera.x, py=pr.y-s.camera.y;
      if(pr.isSlam){
        // Ground shockwave
        const sg=ctx.createRadialGradient(px,py,2,px,py,pr.w);
        sg.addColorStop(0,"rgba(255,100,255,0.7)"); sg.addColorStop(1,"rgba(200,50,200,0)");
        ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(px,py,pr.w,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="rgba(255,200,255,0.9)"; ctx.beginPath(); ctx.arc(px,py,pr.w/3,0,Math.PI*2); ctx.fill();
      } else if(pr.h<=4&&!pr.fromPlayer){
        // Arrow projectile — rotated to travel direction
        const angle=Math.atan2(pr.vy,pr.vx);
        ctx.translate(px,py); ctx.rotate(angle);
        // Shaft
        ctx.fillStyle="#8b6914"; ctx.fillRect(-8,-1,16,2);
        // Head
        ctx.fillStyle="#a0a0b0"; ctx.beginPath();
        ctx.moveTo(8,0); ctx.lineTo(5,-3); ctx.lineTo(5,3); ctx.closePath(); ctx.fill();
        // Fletching
        ctx.fillStyle="#c05030"; ctx.fillRect(-7,-2,3,1); ctx.fillRect(-7,1,3,1);
      } else if(pr.w>=10&&!pr.fromPlayer){
        // Magic bolt — spinning spiral with glow
        const angle=s.gameTime*0.3;
        const mg=ctx.createRadialGradient(px,py,2,px,py,14);
        mg.addColorStop(0,"rgba(180,100,255,0.8)"); mg.addColorStop(0.5,"rgba(140,60,220,0.3)"); mg.addColorStop(1,"rgba(120,40,200,0)");
        ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(px,py,14,0,Math.PI*2); ctx.fill();
        // Core
        ctx.fillStyle="#e0c0ff"; ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2); ctx.fill();
        // Orbiting sparkles
        for(let i=0;i<3;i++){
          const a=angle+i*Math.PI*2/3;
          ctx.fillStyle=`rgba(200,150,255,${0.6-i*0.15})`;
          ctx.beginPath(); ctx.arc(px+Math.cos(a)*8,py+Math.sin(a)*8,2-i*0.4,0,Math.PI*2); ctx.fill();
        }
        // Trail
        ctx.globalAlpha=0.3;
        ctx.fillStyle="#a060ff";
        ctx.beginPath(); ctx.ellipse(px-pr.vx*2,py-pr.vy*2,6,3,Math.atan2(pr.vy,pr.vx),0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      } else {
        // Default / deflected projectile
        const color=pr.fromPlayer?"rgba(212,168,67,":"rgba(192,80,192,";
        const g=ctx.createRadialGradient(px,py,2,px,py,14);
        g.addColorStop(0,color+"0.4)"); g.addColorStop(1,color+"0)");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,14,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=pr.fromPlayer?"#ffe080":"#e080e0";
        ctx.beginPath(); ctx.arc(px,py,pr.w/2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=pr.fromPlayer?"#fff8d0":"#ffc0ff";
        ctx.beginPath(); ctx.arc(px,py,pr.w/4,0,Math.PI*2); ctx.fill();
        // Motion streak
        ctx.globalAlpha=0.3; ctx.fillStyle=pr.fromPlayer?"#d4a843":"#c050c0";
        ctx.beginPath(); ctx.ellipse(px-pr.vx*2,py-pr.vy*2,Math.abs(pr.vx)*2+3,2,Math.atan2(pr.vy,pr.vx),0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      }
      ctx.restore();
    }
  }

  private _drawParticles(ctx: CanvasRenderingContext2D, s: CamelotState): void {
    for(const p of s.particles){
      const alpha=p.life/p.maxLife;
      const px=p.x-s.camera.x, py=p.y-s.camera.y;
      ctx.globalAlpha=alpha;
      // Glow halo
      if(p.size>2){
        const g=ctx.createRadialGradient(px,py,0,px,py,p.size*2);
        g.addColorStop(0,p.color); g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(px,py,p.size*2,0,Math.PI*2); ctx.fill();
      }
      // Solid core (round)
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(px,py,p.size/2,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  private _drawFloatingTexts(ctx: CanvasRenderingContext2D, s: CamelotState): void {
    for(const t of s.floatingTexts){
      const alpha=t.life/t.maxLife;
      const tx=t.x-s.camera.x, ty=t.y-s.camera.y;
      const scale=1+Math.max(0,(1-alpha)*0.3); // slight pop-in
      ctx.globalAlpha=alpha;
      ctx.font=`bold ${Math.floor(16*scale)}px Georgia`; ctx.textAlign="center";
      // Shadow outline for readability
      ctx.strokeStyle="rgba(0,0,0,0.8)"; ctx.lineWidth=3;
      ctx.strokeText(t.text,tx,ty);
      // Fill
      ctx.fillStyle=t.color;
      ctx.fillText(t.text,tx,ty);
      ctx.textAlign="left";
    }
    ctx.globalAlpha=1;
  }

  // === PLAYER ===
  private _drawPlayer(ctx: CanvasRenderingContext2D, s: CamelotState): void {
    const p=s.player;
    if(p.dead&&p.invuln<=0) return;
    ctx.save();
    for(const t of p.trail){
      const alpha=t.life/10*0.35;
      ctx.globalAlpha=alpha;
      // Ghost silhouette with color
      const tx2=t.x-s.camera.x, ty2=t.y-s.camera.y;
      const ghostGrad=ctx.createLinearGradient(tx2,ty2,tx2+p.w,ty2+p.h);
      ghostGrad.addColorStop(0,"rgba(96,48,160,0.6)"); ghostGrad.addColorStop(1,"rgba(128,80,200,0.2)");
      ctx.fillStyle=ghostGrad;
      ctx.beginPath();
      ctx.ellipse(tx2+p.w/2,ty2+p.h/2,p.w/2+2,p.h/2,0,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha=1;
    const px=p.x-s.camera.x, py=p.y-s.camera.y;
    // Ground shadow (ellipse below feet)
    if(!p.dead){
      const shadowY=py+p.h+2;
      const shadowScale=p.grounded?1.0:Math.max(0.3,1-Math.abs(p.vy)*0.05);
      ctx.globalAlpha=0.25*shadowScale;
      ctx.fillStyle="#000";
      ctx.beginPath(); ctx.ellipse(px+p.w/2,shadowY,p.w*0.6*shadowScale,3*shadowScale,0,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
    if(p.invuln>0&&Math.floor(p.invuln/3)%2===0) ctx.globalAlpha=0.5;
    ctx.translate(px+p.w/2,py+p.h/2);
    if(p.facing<0) ctx.scale(-1,1);
    ctx.scale(p.squashX,p.squashY);
    if(p.anim==="roll") ctx.rotate(s.gameTime*0.3*p.facing);
    let bob=0;
    if(p.anim==="run") bob=Math.sin(p.animFrame*0.8)*2;
    else if(p.anim==="idle") bob=Math.sin(s.gameTime*0.06)*1.5;
    const w=p.w, h=p.h;
    const idleTime=p.anim==="idle"?p.animTimer:0;
    const la=p.anim==="run"?Math.sin(p.animFrame*0.8)*6:0;
    const armSwing=p.anim==="run"?Math.sin(p.animFrame*0.8+Math.PI)*5:0;

    // Cape
    const cw1=Math.sin(s.gameTime*0.1)*4, cw2=Math.sin(s.gameTime*0.13+1)*3;
    ctx.fillStyle="#502890"; ctx.beginPath();
    ctx.moveTo(-1,-h/2+8+bob); ctx.quadraticCurveTo(-10+cw1,bob,-12+cw2,h/2+2);
    ctx.lineTo(4+cw1,h/2+4); ctx.lineTo(5,-h/2+10+bob); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#6030a0"; ctx.beginPath();
    ctx.moveTo(0,-h/2+8+bob); ctx.quadraticCurveTo(-8+cw1,-2+bob,-10+cw2,h/2);
    ctx.lineTo(3+cw1,h/2+2); ctx.lineTo(4,-h/2+10+bob); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(120,80,200,0.3)"; ctx.beginPath();
    ctx.moveTo(1,-h/2+10+bob); ctx.quadraticCurveTo(-4+cw1,4+bob,-6+cw2,h/2-6);
    ctx.lineTo(-2+cw1,h/2-4); ctx.lineTo(3,-h/2+12+bob); ctx.closePath(); ctx.fill();

    if(p.hasShield){
      ctx.fillStyle="#3050a0"; ctx.beginPath();
      ctx.moveTo(-w/2-3,-h/2+14+bob); ctx.lineTo(-w/2-7,-h/2+18+bob); ctx.lineTo(-w/2-6,-h/2+28+bob);
      ctx.lineTo(-w/2-3,-h/2+30+bob); ctx.lineTo(-w/2,-h/2+28+bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#4070d0"; ctx.beginPath(); ctx.arc(-w/2-3,-h/2+22+bob,3,0,Math.PI*2); ctx.fill();
      for(let i=0;i<p.shieldHP;i++){ ctx.fillStyle="#80c0ff"; ctx.fillRect(-w/2-4,-h/2+16+bob+i*4,2,2); }
    }

    // Legs
    const legY=h/2-14+bob;
    ctx.fillStyle="#2a2418"; ctx.fillRect(-w/2+5,legY-Math.abs(la)*0.5,7,14+Math.abs(la)*0.3);
    ctx.fillStyle="#332a1e"; ctx.fillRect(w/2-12,legY-la*0.5,7,14+la*0.3);
    ctx.fillStyle="#3a3220"; ctx.fillRect(-w/2+6,legY+5,5,2); ctx.fillRect(w/2-11,legY+5-la*0.3,5,2);
    ctx.fillStyle="#5a4020";
    ctx.beginPath(); ctx.moveTo(-w/2+3,h/2-1); ctx.lineTo(-w/2+2,h/2+2); ctx.lineTo(w/2-14+10,h/2+2); ctx.lineTo(w/2-14+8,h/2-1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w/2-12,h/2-1); ctx.lineTo(w/2-13,h/2+2); ctx.lineTo(w/2-3,h/2+2); ctx.lineTo(w/2-4,h/2-1); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#8b6914"; ctx.fillRect(-w/2+5,h/2-2,3,2); ctx.fillRect(w/2-10,h/2-2,3,2);

    // Torso
    const torsoTop=-h/2+10+bob, torsoH=h/2-6;
    ctx.fillStyle="#2050a0"; ctx.beginPath();
    ctx.moveTo(-w/2+3,torsoTop); ctx.lineTo(w/2-3,torsoTop); ctx.lineTo(w/2-1,torsoTop+torsoH); ctx.lineTo(-w/2+1,torsoTop+torsoH); ctx.closePath(); ctx.fill();
    const cpGrad=ctx.createLinearGradient(-w/2+4,torsoTop,w/2-4,torsoTop+10);
    cpGrad.addColorStop(0,"#3060b0"); cpGrad.addColorStop(0.5,"#4878c8"); cpGrad.addColorStop(1,"#2850a0");
    ctx.fillStyle=cpGrad; ctx.beginPath();
    ctx.moveTo(-w/2+4,torsoTop+2); ctx.quadraticCurveTo(0,torsoTop-2,w/2-4,torsoTop+2);
    ctx.lineTo(w/2-4,torsoTop+14); ctx.quadraticCurveTo(0,torsoTop+16,-w/2+4,torsoTop+14); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(100,140,220,0.4)"; ctx.beginPath(); ctx.ellipse(-1,torsoTop+7,4,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#1848a0"; ctx.beginPath();
    ctx.moveTo(-w/2+1,torsoTop+torsoH-4); ctx.lineTo(w/2-1,torsoTop+torsoH-4);
    ctx.lineTo(w/2+1,torsoTop+torsoH+2); ctx.lineTo(-w/2-1,torsoTop+torsoH+2); ctx.closePath(); ctx.fill();

    // Belt
    ctx.fillStyle="#7a5810"; ctx.fillRect(-w/2+1,torsoTop+torsoH-6,w-2,4);
    ctx.fillStyle="#d4a843"; ctx.beginPath(); ctx.arc(0,torsoTop+torsoH-4,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#b08830"; ctx.beginPath(); ctx.arc(0,torsoTop+torsoH-4,1.5,0,Math.PI*2); ctx.fill();

    // Sword arm
    if(p.attacking>0){
      const comboAngles=[0,-0.4,0.5]; const angle=comboAngles[p.comboStep]||0;
      ctx.save(); ctx.rotate(angle);
      ctx.fillStyle="#2855a0"; ctx.fillRect(w/2-3,torsoTop+2,8,7);
      ctx.fillStyle="#707888"; ctx.beginPath(); ctx.ellipse(w/2+3,torsoTop+8,5,4,0,0,Math.PI*2); ctx.fill();
      const ext=p.attacking>8?22+p.swordLevel*6:12;
      const bladeGrad=ctx.createLinearGradient(w/2+4,torsoTop,w/2+4+ext,torsoTop+6);
      bladeGrad.addColorStop(0,"#d0d0e0"); bladeGrad.addColorStop(0.5,"#e8e8f0"); bladeGrad.addColorStop(1,"#a0a0b8");
      ctx.fillStyle=bladeGrad; ctx.beginPath();
      ctx.moveTo(w/2+4,torsoTop+2); ctx.lineTo(w/2+4+ext,torsoTop+5); ctx.lineTo(w/2+4+ext-2,torsoTop+7); ctx.lineTo(w/2+4,torsoTop+8); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#d4a843"; ctx.fillRect(w/2+1,torsoTop,3,10);
      ctx.fillStyle="#b08830"; ctx.fillRect(w/2-1,torsoTop+3,7,3);
      ctx.fillStyle="#c03030"; ctx.beginPath(); ctx.arc(w/2+2,torsoTop-1,2,0,Math.PI*2); ctx.fill();
      if(p.attacking>6&&p.attacking<14){
        const colors=["rgba(255,255,255,0.7)","rgba(180,200,255,0.7)","rgba(255,200,80,0.9)"];
        ctx.strokeStyle=colors[p.comboStep]; ctx.lineWidth=p.comboStep===2?4:2;
        const r=18+p.swordLevel*4+p.comboStep*5;
        ctx.beginPath(); ctx.arc(w/2+8,torsoTop+5,r,-0.6+angle,0.6+angle); ctx.stroke();
        ctx.strokeStyle=colors[p.comboStep].replace("0.7","0.3").replace("0.9","0.4");
        ctx.lineWidth=p.comboStep===2?8:5;
        ctx.beginPath(); ctx.arc(w/2+8,torsoTop+5,r,-0.6+angle,0.6+angle); ctx.stroke();
      }
      ctx.restore();
    } else if(p.anim==="parry"){
      ctx.fillStyle="#2855a0"; ctx.fillRect(w/2-3,torsoTop+2,7,7);
      ctx.fillStyle="#707888"; ctx.beginPath(); ctx.ellipse(w/2+3,torsoTop+8,5,4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=p.parrySuccess?"#ffffff":"#d0d0e0"; ctx.fillRect(w/2+2,torsoTop-4,3,20);
      ctx.fillStyle="#d4a843"; ctx.fillRect(w/2-1,torsoTop+2,7,3);
      if(p.parrySuccess){ ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(w/2+4,torsoTop+6,22,0,Math.PI*2); ctx.fill(); }
    } else {
      ctx.fillStyle="#2855a0"; ctx.fillRect(w/2-5,torsoTop+3+bob,6,14);
      ctx.fillStyle="#707888"; ctx.beginPath(); ctx.ellipse(w/2-2,torsoTop+16+bob,3,3,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#a0a0b8"; ctx.fillRect(w/2-3,torsoTop-2+bob,2,18);
      ctx.fillStyle="#d4a843"; ctx.fillRect(w/2-4,torsoTop+14+bob,4,4);
    }

    // Front arm
    ctx.fillStyle="#2855a0"; const armY=torsoTop+4+armSwing;
    ctx.fillRect(-w/2-1,armY,6,13);
    ctx.fillStyle="#707888"; ctx.beginPath(); ctx.ellipse(-w/2+2,armY+12,3,3,0,0,Math.PI*2); ctx.fill();

    // Pauldrons
    ctx.fillStyle="#606878";
    ctx.beginPath(); ctx.ellipse(-w/2+3,torsoTop+2,5,4,0,-Math.PI,0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w/2-3,torsoTop+2,5,4,0,-Math.PI,0); ctx.fill();
    ctx.fillStyle="#7880a0";
    ctx.beginPath(); ctx.ellipse(-w/2+3,torsoTop+1,4,3,0,-Math.PI,0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w/2-3,torsoTop+1,4,3,0,-Math.PI,0); ctx.fill();

    // Head
    const headY=-h/2+bob;
    ctx.fillStyle="#c89060"; ctx.fillRect(-2,headY+9,6,4);
    ctx.fillStyle="#d4a070"; ctx.beginPath(); ctx.ellipse(1,headY+5,7,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#c89060"; ctx.beginPath(); ctx.ellipse(2,headY+8,5,3,0,0,Math.PI); ctx.fill();
    const hGrad=ctx.createLinearGradient(-7,headY-3,8,headY-3);
    hGrad.addColorStop(0,"#606878"); hGrad.addColorStop(0.3,"#8890a0"); hGrad.addColorStop(0.7,"#8890a0"); hGrad.addColorStop(1,"#505868");
    ctx.fillStyle=hGrad; ctx.beginPath(); ctx.ellipse(1,headY+2,8,7,0,-Math.PI,0); ctx.fill();
    ctx.fillStyle="#505868"; ctx.fillRect(-7,headY+1,16,3);
    ctx.fillStyle="#606878"; ctx.fillRect(3,headY+1,2,5);
    ctx.fillStyle="#b02020"; ctx.beginPath();
    ctx.moveTo(-1,headY-5); ctx.quadraticCurveTo(2,headY-9,7,headY-6); ctx.lineTo(5,headY-3); ctx.lineTo(0,headY-3); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#901818"; ctx.beginPath();
    ctx.moveTo(0,headY-4); ctx.quadraticCurveTo(2,headY-7,5,headY-5); ctx.lineTo(4,headY-3); ctx.lineTo(1,headY-3); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#d4a843"; ctx.beginPath(); ctx.arc(-5,headY+2,1.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(7,headY+2,1.5,0,Math.PI*2); ctx.fill();
    const eyeShift=(p.anim==="idle"&&idleTime>120)?Math.sin(s.gameTime*0.04)*2:0;
    ctx.fillStyle="#f8f8ff"; ctx.beginPath(); ctx.ellipse(4+eyeShift,headY+4,2.5,2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#1a1a2a"; ctx.beginPath(); ctx.ellipse(4.5+eyeShift,headY+4,1.5,1.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ffffff"; ctx.fillRect(5+eyeShift,headY+3,1,1);

    // Plunge visual
    if(p.plunging){
      ctx.fillStyle="rgba(255,200,100,0.7)"; ctx.beginPath();
      ctx.moveTo(-w/2-6,h/2); ctx.lineTo(0,h/2+18); ctx.lineTo(w/2+6,h/2); ctx.closePath(); ctx.fill();
      ctx.fillStyle="rgba(255,255,200,0.4)"; ctx.beginPath();
      ctx.moveTo(-w/4,h/2); ctx.lineTo(0,h/2+12); ctx.lineTo(w/4,h/2); ctx.closePath(); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(-2,-h/2-12,4,h+14);
    }

    // Charge attack glow
    if(p.charging&&p.chargeTimer>0){
      const chargeProgress=Math.min(p.chargeTimer/40,1);
      const chargeR=8+chargeProgress*16;
      ctx.globalAlpha=chargeProgress*0.6;
      const cg=ctx.createRadialGradient(p.facing*12,torsoTop+5,2,p.facing*12,torsoTop+5,chargeR);
      cg.addColorStop(0,`rgba(255,${Math.floor(200*chargeProgress)},50,0.8)`);
      cg.addColorStop(1,"rgba(255,150,0,0)");
      ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(p.facing*12,torsoTop+5,chargeR,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
      // Charge particles swirling toward sword
      if(chargeProgress>0.3&&s.gameTime%3===0){
        const a=(s.gameTime*0.2)%(Math.PI*2);
        ctx.fillStyle="#ffcc00"; ctx.beginPath();
        ctx.arc(p.facing*12+Math.cos(a)*chargeR*0.8,torsoTop+5+Math.sin(a)*chargeR*0.8,2,0,Math.PI*2); ctx.fill();
      }
      // "CHARGING" indicator at full
      if(chargeProgress>=1){
        ctx.fillStyle="rgba(255,220,50,0.8)"; ctx.font="bold 10px Georgia"; ctx.textAlign="center";
        ctx.fillText("READY!",0,-h/2-20); ctx.textAlign="left";
      }
    }

    // Double jump wings
    if(p.hasDoubleJump&&!p.grounded&&p.jumpsLeft>0){
      ctx.globalAlpha=0.35; ctx.fillStyle="#80a0ff";
      ctx.beginPath(); ctx.moveTo(-w/2,-h/2+12); ctx.quadraticCurveTo(-w/2-14,-h/2+2,-w/2-8,-h/2+20);
      ctx.lineTo(-w/2,-h/2+16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-w/2+2,-h/2+14); ctx.quadraticCurveTo(-w/2-10,-h/2+6,-w/2-4,-h/2+22);
      ctx.lineTo(-w/2+2,-h/2+18); ctx.closePath(); ctx.fill();
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }

  // === ENEMIES ===
  private _drawEnemy(ctx: CanvasRenderingContext2D, s: CamelotState, e: Enemy): void {
    if(e.dead&&e.deathTimer<=0) return;
    ctx.save();
    const px=e.x-s.camera.x, py=e.y-s.camera.y;
    // Ground shadow for enemies
    if(!e.dead){
      ctx.globalAlpha=0.2;
      ctx.fillStyle="#000";
      ctx.beginPath(); ctx.ellipse(px+e.w/2,py+e.h+2,e.w*0.5,3,0,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
    if(e.dead){
      ctx.globalAlpha=e.deathTimer/40;
      const dp=(40-e.deathTimer)/40;
      ctx.translate(px+e.w/2,py+e.h/2+dp*8); ctx.rotate(e.facing*dp*1.2); ctx.scale(1+dp*0.1,1-dp*0.3);
    } else {
      if(e.invuln>0) ctx.globalAlpha=0.6;
      ctx.translate(px+e.w/2,py+e.h/2);
    }
    // Damage flash — white overlay when recently hit
    const dmgFlash=e.invuln>8;
    if(e.facing<0) ctx.scale(-1,1);
    const w=e.w, h=e.h;
    let bob=0;
    if(e.anim==="run") bob=Math.sin(e.animFrame*0.6)*2;
    else if(e.anim==="idle") bob=Math.sin(s.gameTime*0.05)*0.8;
    const lookShift=(e.anim==="look")?Math.sin(e.idleTimer*0.1)*3:0;

    if(e.type==="boss") this._drawBoss(ctx,s,e,w,h,bob);
    else {
      const tY=-h/2+10+bob, ls=lookShift;
      // Legs
      ctx.fillStyle="#2a2418"; ctx.fillRect(-w/2+4,h/2-13+bob,7,13); ctx.fillRect(w/2-11,h/2-13+bob,7,13);
      ctx.fillStyle="#3a3020"; ctx.fillRect(-w/2+3,h/2-1,9,3); ctx.fillRect(w/2-12,h/2-1,9,3);

      if(e.type==="guard"){
        const bg=ctx.createLinearGradient(-w/2,tY,w/2,tY+h/2-6);
        bg.addColorStop(0,"#707888"); bg.addColorStop(1,"#585e6a");
        ctx.fillStyle=bg; ctx.fillRect(-w/2+2,tY,w-4,h/2-6);
        ctx.fillStyle="rgba(100,110,130,0.5)";
        for(let cy=0;cy<3;cy++) for(let cx=0;cx<3;cx++) ctx.fillRect(-w/2+4+cx*6,tY+3+cy*5,4,3);
        ctx.fillStyle="#808898"; ctx.beginPath(); ctx.ellipse(1+ls,-h/2+5+bob,8,7,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#606878"; ctx.beginPath(); ctx.ellipse(1+ls,-h/2+2+bob,7,5,0,-Math.PI,0); ctx.fill();
        ctx.fillStyle="#505868"; ctx.fillRect(3+ls,-h/2+3+bob,2,5);
        ctx.fillStyle="#c04040"; ctx.fillRect(4+ls,-h/2+4+bob,3,2);
        if(e.anim==="attack"||e.anim==="windup"){
          ctx.fillStyle="#b0b0c0"; ctx.fillRect(w/2,tY+2,16,3); ctx.fillStyle="#d4a843"; ctx.fillRect(w/2-2,tY,4,7);
        } else { ctx.fillStyle="#909098"; ctx.fillRect(w/2-3,tY-4,2,16); }
      } else if(e.type==="archer"){
        ctx.fillStyle="#4a6838"; ctx.fillRect(-w/2+3,tY,w-6,h/2-6);
        ctx.fillStyle="#3a5828"; ctx.fillRect(-w/2+4,tY,w-8,6);
        ctx.fillStyle="#3a5028"; ctx.beginPath();
        ctx.moveTo(-5+ls,-h/2+bob); ctx.lineTo(7+ls,-h/2+bob);
        ctx.quadraticCurveTo(9+ls,-h/2-4+bob,2+ls,-h/2-6+bob);
        ctx.quadraticCurveTo(-4+ls,-h/2-4+bob,-5+ls,-h/2+bob); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#1a2010"; ctx.fillRect(-3+ls,-h/2+2+bob,8,5);
        ctx.fillStyle="#80c040"; ctx.fillRect(1+ls,-h/2+3+bob,2,2); ctx.fillRect(4+ls,-h/2+3+bob,2,2);
        ctx.strokeStyle="#8b6914"; ctx.lineWidth=2.5; ctx.beginPath();
        ctx.moveTo(w/2+2,tY-2); ctx.quadraticCurveTo(w/2+14,tY+10,w/2+2,tY+22); ctx.stroke();
        ctx.strokeStyle="#c8c0b0"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(w/2+2,tY-2); ctx.lineTo(w/2+2,tY+22); ctx.stroke();
        if(e.anim==="windup"){
          ctx.fillStyle="#8b6914"; ctx.fillRect(w/2+2,tY+8,12,2);
          ctx.fillStyle="#a0a0a0"; ctx.beginPath(); ctx.moveTo(w/2+14,tY+7); ctx.lineTo(w/2+18,tY+9); ctx.lineTo(w/2+14,tY+11); ctx.closePath(); ctx.fill();
        }
      } else if(e.type==="knight"){
        ctx.fillStyle="#4050a0"; ctx.fillRect(-w/2+1,tY,w-2,h/2-4);
        const kg=ctx.createLinearGradient(-w/2,tY,w/2,tY);
        kg.addColorStop(0,"#5060b0"); kg.addColorStop(0.5,"#7080d0"); kg.addColorStop(1,"#4050a0");
        ctx.fillStyle=kg; ctx.beginPath();
        ctx.moveTo(-w/2+2,tY+2); ctx.quadraticCurveTo(0,tY-1,w/2-2,tY+2);
        ctx.lineTo(w/2-2,tY+14); ctx.lineTo(-w/2+2,tY+14); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#5060b0";
        ctx.beginPath(); ctx.ellipse(-w/2+2,tY+2,6,5,0,-Math.PI,0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(w/2-2,tY+2,6,5,0,-Math.PI,0); ctx.fill();
        ctx.fillStyle="#5060a8"; ctx.fillRect(-7+ls,-h/2+bob,16,14);
        ctx.fillStyle="#4050a0"; ctx.beginPath(); ctx.ellipse(1+ls,-h/2+bob,9,5,0,-Math.PI,0); ctx.fill();
        ctx.fillStyle="#1a1a30"; ctx.fillRect(-4+ls,-h/2+5+bob,10,2);
        ctx.fillStyle="#d4a843"; ctx.fillRect(0+ls,-h/2+1+bob,2,8); ctx.fillRect(-3+ls,-h/2+4+bob,8,2);
        if(e.anim==="attack"||e.anim==="windup"){
          ctx.fillStyle="#b8b8d0"; ctx.fillRect(w/2,tY+2,22,4); ctx.fillStyle="#d4a843"; ctx.fillRect(w/2-3,tY-1,6,9);
        } else { ctx.fillStyle="#9898b0"; ctx.fillRect(w/2-3,tY-6,3,20); ctx.fillStyle="#d4a843"; ctx.fillRect(w/2-5,tY+12,7,4); }
      } else if(e.type==="shielder"){
        ctx.fillStyle="#607060"; ctx.fillRect(-w/2+1,tY,w-2,h/2-4);
        ctx.fillStyle="#506050"; ctx.fillRect(-w/2+2,tY+2,w-4,8);
        ctx.fillStyle="#607060"; ctx.beginPath(); ctx.ellipse(1+ls,-h/2+4+bob,9,6,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#506050"; ctx.fillRect(-8+ls,-h/2+3+bob,18,3);
        ctx.fillStyle="#c04040"; ctx.fillRect(3+ls,-h/2+5+bob,3,2);
        if(e.blocking&&e.stunTimer<=0){
          ctx.fillStyle="#4a6a4a"; ctx.beginPath();
          ctx.moveTo(w/2-1,-h/2+2+bob); ctx.lineTo(w/2+7,-h/2+6+bob);
          ctx.lineTo(w/2+6,h/2-8+bob); ctx.lineTo(w/2+1,h/2-4+bob);
          ctx.lineTo(w/2-2,h/2-8+bob); ctx.closePath(); ctx.fill();
          ctx.fillStyle="#7a9a7a"; ctx.beginPath(); ctx.arc(w/2+3,-h/2+14+bob,3,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#8aaa8a"; ctx.lineWidth=1; ctx.beginPath();
          ctx.moveTo(w/2-1,-h/2+2+bob); ctx.lineTo(w/2+7,-h/2+6+bob); ctx.lineTo(w/2+6,h/2-8+bob); ctx.stroke();
        }
        if(e.anim==="attack"){
          ctx.fillStyle="#808090"; ctx.fillRect(w/2+8,tY+4,12,3);
          ctx.fillStyle="#606070"; ctx.fillRect(w/2+18,tY+1,6,8);
        }
      } else if(e.type==="mage"){
        // MAGE: robed figure with glowing staff and magic aura
        // Robe
        ctx.fillStyle="#4a2870"; ctx.beginPath();
        ctx.moveTo(-w/2+2,tY); ctx.lineTo(w/2-2,tY);
        ctx.lineTo(w/2+2,h/2-2); ctx.lineTo(-w/2-2,h/2-2); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#5a3880"; ctx.beginPath();
        ctx.moveTo(-w/2+4,tY+2); ctx.lineTo(w/2-4,tY+2);
        ctx.lineTo(w/2,h/2-4); ctx.lineTo(-w/2,h/2-4); ctx.closePath(); ctx.fill();
        // Hood
        ctx.fillStyle="#3a1860"; ctx.beginPath();
        ctx.moveTo(-6+ls,-h/2+bob); ctx.lineTo(8+ls,-h/2+bob);
        ctx.quadraticCurveTo(10+ls,-h/2-6+bob,2+ls,-h/2-8+bob);
        ctx.quadraticCurveTo(-5+ls,-h/2-6+bob,-6+ls,-h/2+bob); ctx.closePath(); ctx.fill();
        // Face shadow
        ctx.fillStyle="#0a0618"; ctx.fillRect(-4+ls,-h/2+2+bob,10,5);
        // Glowing eyes
        ctx.fillStyle="#a060ff"; ctx.fillRect(0+ls,-h/2+3+bob,2,2); ctx.fillRect(4+ls,-h/2+3+bob,2,2);
        // Eye glow
        const mEg=ctx.createRadialGradient(2+ls,-h/2+4+bob,1,2+ls,-h/2+4+bob,8);
        mEg.addColorStop(0,"rgba(160,96,255,0.4)"); mEg.addColorStop(1,"rgba(160,96,255,0)");
        ctx.fillStyle=mEg; ctx.fillRect(-6+ls,-h/2-4+bob,16,16);
        // Staff
        ctx.strokeStyle="#5a3820"; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(w/2+2,tY-4); ctx.lineTo(w/2+2,h/2); ctx.stroke();
        // Staff orb
        const orbPulse=Math.sin(s.gameTime*0.12)*0.2;
        const orbG=ctx.createRadialGradient(w/2+2,tY-8,2,w/2+2,tY-8,8);
        orbG.addColorStop(0,`rgba(180,100,255,${0.8+orbPulse})`);
        orbG.addColorStop(1,"rgba(120,60,200,0)");
        ctx.fillStyle=orbG; ctx.beginPath(); ctx.arc(w/2+2,tY-8,8,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(w/2+2,tY-8,2,0,Math.PI*2); ctx.fill();
        // Magic shield aura
        if(e.shieldActive&&e.mageShieldHP!>0){
          ctx.strokeStyle=`rgba(160,96,255,${0.4+orbPulse})`;
          ctx.lineWidth=2; ctx.setLineDash([3,3]); ctx.lineDashOffset=s.gameTime*0.3;
          ctx.beginPath(); ctx.arc(0,0,w/2+8,0,Math.PI*2); ctx.stroke();
          ctx.setLineDash([]);
        }
        // Cast animation
        if(e.anim==="cast"){
          for(let i=0;i<3;i++){
            const ca=(s.gameTime*0.2+i*Math.PI*2/3);
            ctx.fillStyle=`rgba(160,96,255,${0.5-i*0.15})`;
            ctx.beginPath(); ctx.arc(w/2+2+Math.cos(ca)*12,tY-8+Math.sin(ca)*12,3-i,0,Math.PI*2); ctx.fill();
          }
        }
      }
    }

    // Damage flash white overlay
    if(dmgFlash&&!e.dead){
      ctx.globalCompositeOperation="source-atop";
      ctx.fillStyle="rgba(255,255,255,0.6)";
      ctx.fillRect(-w/2-5,-h/2-5,w+10,h+10);
      ctx.globalCompositeOperation="source-over";
    }

    // Windup telegraph
    if(!e.dead&&e.windupTimer>0){
      ctx.fillStyle="#ff4444"; ctx.font="bold 18px Georgia"; ctx.textAlign="center";
      ctx.fillText("!",0,-h/2-16); ctx.textAlign="left";
      ctx.fillStyle=`rgba(255,60,60,${0.3+Math.sin(s.gameTime*0.5)*0.2})`;
      ctx.beginPath(); ctx.arc(0,-h/2-12,10,0,Math.PI*2); ctx.fill();
      }
    if(!e.dead&&e.hp<e.maxHp){
      const bw=e.w+10;
      const by=-h/2-12;
      // Bar background
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(-bw/2-1,by-1,bw+2,7,2); ctx.fill();
      ctx.fillStyle="#301010"; ctx.fillRect(-bw/2,by,bw,5);
      // Health fill with gradient
      const hpPct=e.hp/e.maxHp;
      const hpColor=hpPct>0.5?"#c02020":hpPct>0.25?"#c08020":"#c02020";
      const hpGrad=ctx.createLinearGradient(-bw/2,by,-bw/2+bw*hpPct,by);
      hpGrad.addColorStop(0,hpColor); hpGrad.addColorStop(1,hpPct>0.25?"#e04040":"#ff6060");
      ctx.fillStyle=hpGrad; ctx.fillRect(-bw/2,by,bw*hpPct,5);
      // Highlight
      ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.fillRect(-bw/2,by,bw*hpPct,2);
    }
    ctx.restore();
  }

  private _drawBoss(ctx: CanvasRenderingContext2D, s: CamelotState, e: Enemy, w: number, h: number, bob: number): void {
    const pulse=Math.sin(s.gameTime*0.1)*0.2;
    const phase=e.phase||1;
    const phaseColor=phase>=3?[180,20,20]:phase>=2?[120,40,120]:[80,30,80];
    const pc=`rgb(${phaseColor[0]},${phaseColor[1]},${phaseColor[2]})`;
    const pcl=`rgb(${phaseColor[0]+40},${phaseColor[1]+20},${phaseColor[2]+40})`;
    // Aura
    const auraR=w+15+phase*8+Math.sin(s.gameTime*0.08)*5;
    const ag=ctx.createRadialGradient(0,0,w/3,0,0,auraR);
    ag.addColorStop(0,`rgba(${phaseColor[0]},${phaseColor[1]},${phaseColor[2]},0.1)`);
    ag.addColorStop(1,`rgba(${phaseColor[0]},${phaseColor[1]},${phaseColor[2]},0)`);
    ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(0,0,auraR,0,Math.PI*2); ctx.fill();
    // Robe
    const rw1=Math.sin(s.gameTime*0.06)*4, rw2=Math.sin(s.gameTime*0.09+1)*3;
    ctx.fillStyle=pc; ctx.beginPath();
    ctx.moveTo(-w/2-2,-h/2+14+bob); ctx.lineTo(w/2+2,-h/2+14+bob);
    ctx.quadraticCurveTo(w/2+6+rw1,h/2-4,w/2+4+rw2,h/2+4);
    ctx.lineTo(-w/2-4+rw1,h/2+4); ctx.quadraticCurveTo(-w/2-6+rw2,h/2-4,-w/2-2,-h/2+14+bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle=pcl; ctx.beginPath();
    ctx.moveTo(-w/2+4,-h/2+16+bob); ctx.lineTo(w/2-4,-h/2+16+bob);
    ctx.lineTo(w/2-2+rw1,h/2); ctx.lineTo(-w/2+2+rw2,h/2); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#d4a843"; ctx.fillRect(-w/2-3+rw2,h/2+1,w+6,2);
    // Pauldrons
    ctx.fillStyle="#505868";
    ctx.beginPath(); ctx.ellipse(-w/2-1,-h/2+14+bob,8,6,-0.2,-Math.PI,0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w/2+1,-h/2+14+bob,8,6,0.2,-Math.PI,0); ctx.fill();
    ctx.fillStyle="#606878";
    ctx.beginPath(); ctx.ellipse(-w/2-1,-h/2+13+bob,7,5,-0.2,-Math.PI,0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w/2+1,-h/2+13+bob,7,5,0.2,-Math.PI,0); ctx.fill();
    ctx.fillStyle="#808898";
    ctx.beginPath(); ctx.moveTo(-w/2-8,-h/2+12+bob); ctx.lineTo(-w/2-4,-h/2+6+bob); ctx.lineTo(-w/2,-h/2+12+bob); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w/2+8,-h/2+12+bob); ctx.lineTo(w/2+4,-h/2+6+bob); ctx.lineTo(w/2,-h/2+12+bob); ctx.fill();
    // Skull head
    const headY=-h/2+bob;
    ctx.fillStyle="#252030"; ctx.beginPath(); ctx.ellipse(1,headY+5,10,8,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#302838"; ctx.beginPath(); ctx.ellipse(1,headY+2,9,5,0,-Math.PI,0); ctx.fill();
    ctx.fillStyle="#0a0810";
    ctx.beginPath(); ctx.ellipse(-3,headY+5,3.5,3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6,headY+5,3.5,3,0,0,Math.PI*2); ctx.fill();
    const eyeColor=phase>=3?[255,40,40]:phase>=2?[220,80,220]:[180,60,180];
    const ec=`rgb(${eyeColor[0]},${eyeColor[1]},${eyeColor[2]})`;
    ctx.fillStyle=ec;
    ctx.beginPath(); ctx.ellipse(-3,headY+5,2,2,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6,headY+5,2,2,0,0,Math.PI*2); ctx.fill();
    const eyeGlowR=8+pulse*10;
    for(const ex of [-3,6]){
      const eg=ctx.createRadialGradient(ex,headY+5,1,ex,headY+5,eyeGlowR);
      eg.addColorStop(0,`rgba(${eyeColor[0]},${eyeColor[1]},${eyeColor[2]},0.5)`);
      eg.addColorStop(1,`rgba(${eyeColor[0]},${eyeColor[1]},${eyeColor[2]},0)`);
      ctx.fillStyle=eg; ctx.fillRect(ex-eyeGlowR,headY+5-eyeGlowR,eyeGlowR*2,eyeGlowR*2);
    }
    ctx.fillStyle="#201828"; ctx.fillRect(-4,headY+9,10,4);
    ctx.fillStyle="#a0a090"; for(let i=0;i<4;i++) ctx.fillRect(-2+i*3,headY+9,2,2);
    // Crown
    ctx.fillStyle="#c89830"; ctx.beginPath();
    ctx.moveTo(-10,headY-2); ctx.lineTo(-8,headY-10); ctx.lineTo(-5,headY-4);
    ctx.lineTo(-2,headY-12); ctx.lineTo(1,headY-4); ctx.lineTo(4,headY-14);
    ctx.lineTo(7,headY-4); ctx.lineTo(9,headY-10); ctx.lineTo(12,headY-2); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#c03050"; ctx.beginPath(); ctx.arc(4,headY-8,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#3050c0"; ctx.beginPath(); ctx.arc(-2,headY-6,1.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#30c050"; ctx.beginPath(); ctx.arc(9,headY-5,1.5,0,Math.PI*2); ctx.fill();
    // Staff
    ctx.strokeStyle="#3a2050"; ctx.lineWidth=4; ctx.beginPath();
    ctx.moveTo(w/2+4,-h/2+bob); ctx.quadraticCurveTo(w/2+7,-h/2+h/3+bob,w/2+3,h/2+bob); ctx.stroke();
    ctx.strokeStyle="#4a2860"; ctx.lineWidth=2; ctx.beginPath();
    ctx.moveTo(w/2+4,-h/2+bob); ctx.quadraticCurveTo(w/2+7,-h/2+h/3+bob,w/2+3,h/2+bob); ctx.stroke();
    const orbX=w/2+4, orbY=-h/2-6+bob, orbR=9+pulse*3;
    const og=ctx.createRadialGradient(orbX,orbY,2,orbX,orbY,orbR);
    og.addColorStop(0,`rgba(${eyeColor[0]},${eyeColor[1]},${eyeColor[2]},0.9)`);
    og.addColorStop(0.5,`rgba(${eyeColor[0]},${eyeColor[1]},${eyeColor[2]},0.4)`);
    og.addColorStop(1,`rgba(${eyeColor[0]},${eyeColor[1]},${eyeColor[2]},0)`);
    ctx.fillStyle=og; ctx.beginPath(); ctx.arc(orbX,orbY,orbR,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(orbX,orbY,3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=`rgba(${eyeColor[0]},${eyeColor[1]},${eyeColor[2]},${0.2+pulse})`; ctx.lineWidth=1;
    for(let a=0;a<6;a++){
      const angle=a*Math.PI/3+s.gameTime*0.02;
      ctx.beginPath(); ctx.moveTo(orbX+Math.cos(angle)*4,orbY+Math.sin(angle)*4);
      ctx.lineTo(orbX+Math.cos(angle)*(orbR+4),orbY+Math.sin(angle)*(orbR+4)); ctx.stroke();
    }
    // Phase aura rings
    if(phase>=2){
      for(let r=0;r<phase-1;r++){
        const ring=w+12+r*10+Math.sin(s.gameTime*0.05+r)*3;
        ctx.strokeStyle=`rgba(${phaseColor[0]+50},${phaseColor[1]+30},${phaseColor[2]+50},${0.2+pulse-r*0.05})`;
        ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.lineDashOffset=s.gameTime*0.5+r*10;
        ctx.beginPath(); ctx.arc(0,0,ring,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // Death dispersal
    if(e.dead){
      const dp=(120-e.deathTimer)/120;
      for(let r=0;r<4;r++){
        const radius=dp*100+r*18;
        ctx.strokeStyle=`rgba(${phaseColor[0]+80},${phaseColor[1]+50},${phaseColor[2]+80},${(1-dp)*0.5})`;
        ctx.lineWidth=4-r; ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2); ctx.stroke();
      }
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4+dp*2, fr=dp*60+i*5;
        ctx.fillStyle=`rgba(${phaseColor[0]},${phaseColor[1]},${phaseColor[2]},${(1-dp)*0.6})`;
        ctx.beginPath(); ctx.arc(Math.cos(a)*fr,Math.sin(a)*fr,3-dp*2,0,Math.PI*2); ctx.fill();
      }
    }
  }

  // === LIGHTING ===
  private _drawDarkness(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    ctx.save();
    ctx.globalCompositeOperation="source-over";
    ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(0,0,sw,sh);
    ctx.globalCompositeOperation="destination-out";
    // Player light (slightly warm)
    const px=s.player.x+s.player.w/2-s.camera.x, py=s.player.y+s.player.h/2-s.camera.y;
    const playerR=130+(s.player.attacking>0?15:0); // bigger light when attacking
    const pg=ctx.createRadialGradient(px,py,8,px,py,playerR);
    pg.addColorStop(0,"rgba(0,0,0,1)"); pg.addColorStop(0.7,"rgba(0,0,0,0.5)"); pg.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=pg; ctx.fillRect(px-playerR,py-playerR,playerR*2,playerR*2);
    const sx2=Math.floor(s.camera.x/TILE)-3, sy2=Math.floor(s.camera.y/TILE)-3;
    const ex2=sx2+Math.ceil(sw/TILE)+6, ey2=sy2+Math.ceil(sh/TILE)+6;
    for(let ty=sy2;ty<=ey2;ty++) for(let tx=sx2;tx<=ex2;tx++){
      if(ty<0||ty>=s.levelData.height||tx<0||tx>=s.levelData.width) continue;
      const tile=s.levelData.tiles[ty][tx];
      if(tile===T.TORCH){
        const lx=tx*TILE+TILE/2-s.camera.x, ly=ty*TILE+6-s.camera.y;
        const flicker=90+Math.sin(s.gameTime*0.15+tx*7)*15;
        const g=ctx.createRadialGradient(lx,ly,5,lx,ly,flicker);
        g.addColorStop(0,"rgba(0,0,0,1)"); g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g; ctx.fillRect(lx-flicker,ly-flicker,flicker*2,flicker*2);
      }
      if(tile===T.WINDOW){
        const lx=tx*TILE+TILE/2-s.camera.x, ly=ty*TILE+TILE/2-s.camera.y;
        const g=ctx.createRadialGradient(lx,ly,5,lx,ly,60);
        g.addColorStop(0,"rgba(0,0,0,0.8)"); g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g; ctx.fillRect(lx-60,ly-60,120,120);
      }
      if(tile===T.EXIT){
        const lx=tx*TILE+TILE/2-s.camera.x, ly=ty*TILE+TILE/2-s.camera.y;
        const g=ctx.createRadialGradient(lx,ly,8,lx,ly,70);
        g.addColorStop(0,"rgba(0,0,0,1)"); g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g; ctx.fillRect(lx-70,ly-70,140,140);
      }
      // Lava glow in darkness
      if(tile===T.LAVA){
        const lx=tx*TILE+TILE/2-s.camera.x, ly=ty*TILE+TILE/2-s.camera.y;
        const g=ctx.createRadialGradient(lx,ly,5,lx,ly,50);
        g.addColorStop(0,"rgba(0,0,0,0.8)"); g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g; ctx.fillRect(lx-50,ly-50,100,100);
      }
    }
    ctx.restore();
    // Warm color overlay for torch lights (drawn OVER the darkness, additive)
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    for(let ty=sx2;ty<=ey2;ty++) for(let tx=sx2;tx<=ex2;tx++){
      if(ty<0||ty>=s.levelData.height||tx<0||tx>=s.levelData.width) continue;
      if(s.levelData.tiles[ty][tx]===T.TORCH){
        const lx=tx*TILE+TILE/2-s.camera.x, ly=ty*TILE+6-s.camera.y;
        const flicker=60+Math.sin(s.gameTime*0.15+tx*7)*10;
        ctx.globalAlpha=0.06+Math.sin(s.gameTime*0.2+tx*3)*0.02;
        const wg=ctx.createRadialGradient(lx,ly,4,lx,ly,flicker);
        wg.addColorStop(0,"rgb(255,180,80)"); wg.addColorStop(0.5,"rgb(200,100,30)"); wg.addColorStop(1,"rgba(150,60,10,0)");
        ctx.fillStyle=wg; ctx.fillRect(lx-flicker,ly-flicker,flicker*2,flicker*2);
      }
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // === HUD ===
  private _drawHUD(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    const hx=20, hy=20, p=s.player;
    // HUD panel with rounded corners
    ctx.fillStyle="rgba(5,5,15,0.7)"; ctx.beginPath();
    ctx.roundRect(hx-6,hy-6,230,108,6); ctx.fill();
    ctx.strokeStyle="rgba(212,168,67,0.3)"; ctx.lineWidth=1; ctx.beginPath();
    ctx.roundRect(hx-6,hy-6,230,108,6); ctx.stroke();

    // Health as heart icons
    ctx.fillStyle="#d4a843"; ctx.font="11px Georgia"; ctx.fillText("HP",hx,hy+8);
    for(let i=0;i<p.maxHp;i++){
      const hxx=hx+20+i*18, hyy=hy+1;
      const full=i<p.hp;
      const beat=full&&p.hp<=2?Math.sin(s.gameTime*0.3)*1.5:0;
      ctx.save(); ctx.translate(hxx+7,hyy+7+beat);
      ctx.scale(1+beat*0.05,1+beat*0.05);
      // Heart shape
      ctx.fillStyle=full?"#c03030":"#301818";
      ctx.beginPath();
      ctx.moveTo(0,-3); ctx.bezierCurveTo(-5,-8,-10,-2,-5,3);
      ctx.lineTo(0,7); ctx.lineTo(5,3);
      ctx.bezierCurveTo(10,-2,5,-8,0,-3);
      ctx.fill();
      if(full){
        // Heart shine
        ctx.fillStyle="rgba(255,100,100,0.4)";
        ctx.beginPath(); ctx.arc(-2,-2,2,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    // Stamina bar with segments
    ctx.fillStyle="#d4a843"; ctx.font="11px Georgia"; ctx.fillText("ST",hx,hy+28);
    const stBarX=hx+20, stBarW=150, stBarH=8;
    ctx.fillStyle="#101810"; ctx.fillRect(stBarX,hy+22,stBarW,stBarH);
    const stFill=stBarW*(p.stamina/STAMINA_MAX);
    const stColor=p.stamina<25?"#c08020":p.stamina<50?"#80a020":"#40a040";
    // Gradient fill
    const stGrad=ctx.createLinearGradient(stBarX,hy+22,stBarX+stFill,hy+22+stBarH);
    stGrad.addColorStop(0,stColor); stGrad.addColorStop(1,p.stamina<25?"#a06010":"#308030");
    ctx.fillStyle=stGrad; ctx.fillRect(stBarX,hy+22,stFill,stBarH);
    // Highlight
    ctx.fillStyle="rgba(255,255,255,0.12)"; ctx.fillRect(stBarX,hy+22,stFill,stBarH/2);
    // Segments
    ctx.fillStyle="rgba(0,0,0,0.2)";
    for(let i=1;i<5;i++) ctx.fillRect(stBarX+i*stBarW/5,hy+22,1,stBarH);
    // Border
    ctx.strokeStyle="rgba(100,100,80,0.4)"; ctx.lineWidth=1; ctx.strokeRect(stBarX,hy+22,stBarW,stBarH);

    // Combo meter arc
    if(p.comboStep>0&&p.comboTimer>0){
      const cx=hx+100, cy=hy+52;
      const comboProgress=p.comboTimer/25;
      const comboColors=["#d4a843","#e8c050","#ff8844"];
      ctx.strokeStyle=comboColors[p.comboStep]; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(cx,cy,12,-Math.PI/2,-Math.PI/2+comboProgress*Math.PI*2); ctx.stroke();
      ctx.fillStyle=comboColors[p.comboStep]; ctx.font="bold 11px Georgia"; ctx.textAlign="center";
      ctx.fillText(`x${p.comboStep+1}`,cx,cy+4);
      const comboLabels=["","COMBO","FINISHER!"];
      ctx.font="10px Georgia"; ctx.fillText(comboLabels[p.comboStep],cx,cy+16);
      ctx.textAlign="left";
    }
    ctx.fillStyle="#e8c050"; ctx.font="14px Georgia"; ctx.fillText(`Coins: ${s.totalCoins}`,hx,hy+78);
    ctx.fillStyle="#c08080"; ctx.fillText(`Kills: ${s.totalKills}`,hx+90,hy+78);
    if(p.swordLevel>0){ ctx.fillStyle="#d4a843"; ctx.fillText("SWORD +"+p.swordLevel,hx+150,hy+10); }
    if(p.hasShield){ ctx.fillStyle="#4080ff"; ctx.fillText("SHIELD: "+p.shieldHP,hx+150,hy+25); }
    if(p.hasDoubleJump){ ctx.fillStyle="#80a0ff"; ctx.fillText("DOUBLE JUMP",hx+150,hy+40); }
    const xpNeeded=xpForLevel(s.playerLevel);
    ctx.fillStyle="#d4a843"; ctx.font="11px Georgia"; ctx.fillText(`LVL ${s.playerLevel}`,hx,hy+92);
    ctx.fillStyle="#202030"; ctx.fillRect(hx+35,hy+84,100,8);
    ctx.fillStyle="#a080d0"; ctx.fillRect(hx+35,hy+84,100*(s.playerXP/xpNeeded),8);
    ctx.fillStyle="#d4a843"; ctx.font="16px Georgia"; ctx.textAlign="center";
    ctx.fillText(LEVEL_NAMES[s.currentLevel]||"",sw/2,30); ctx.textAlign="left";
    const secs=Math.floor(s.totalTime/60);
    ctx.fillStyle="#a09060"; ctx.font="13px Georgia";
    ctx.fillText(`${Math.floor(secs/60)}:${(secs%60).toString().padStart(2,"0")}`,sw/2-20,48);
    // Boss bar
    for(const e of s.enemies){
      if(e.type==="boss"&&!e.dead){
        const bw=300, bx=sw/2-bw/2, by=sh-50;
        ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(bx-4,by-4,bw+8,24);
        ctx.fillStyle="#d4a843"; ctx.font="12px Georgia"; ctx.textAlign="center";
        ctx.fillText("MORDRATH THE DARK",sw/2,by-8); ctx.textAlign="left";
        ctx.fillStyle="#400020"; ctx.fillRect(bx,by,bw,16);
        ctx.fillStyle=["#802060","#a03060","#c02020"][(e.phase||1)-1];
        ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),16);
        ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),6);
        ctx.fillStyle="#ffffff"; ctx.font="10px Georgia"; ctx.textAlign="center";
        ctx.fillText(`PHASE ${e.phase}`,sw/2,by+13); ctx.textAlign="left";
      }
    }
  }

  private _drawMiniMap(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number): void {
    const mmW=140, mmH=70, mx=sw-mmW-12, my=12;
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(mx-2,my-2,mmW+4,mmH+4);
    ctx.strokeStyle="#d4a843"; ctx.lineWidth=1; ctx.strokeRect(mx-2,my-2,mmW+4,mmH+4);
    const scaleX=mmW/s.levelData.width, scaleY=mmH/s.levelData.height;
    for(let ty=0;ty<s.levelData.height;ty++) for(let tx=0;tx<s.levelData.width;tx++){
      const t=s.levelData.tiles[ty][tx];
      if(t===T.EMPTY||t===T.TORCH||t===T.CHAIN||t===T.BANNER||t===T.WINDOW) continue;
      if(t===T.EXIT) ctx.fillStyle="#d4a843";
      else if(t===T.SPIKE_UP||t===T.SPIKE_DOWN) ctx.fillStyle="#804040";
      else if(t===T.LEVER) ctx.fillStyle="#d4a843";
      else ctx.fillStyle="#404050";
      ctx.fillRect(mx+tx*scaleX,my+ty*scaleY,Math.max(1,scaleX),Math.max(1,scaleY));
    }
    ctx.fillStyle="#50ff50";
    ctx.fillRect(mx+s.player.x/TILE*scaleX-1,my+s.player.y/TILE*scaleY-1,3,3);
    for(const e of s.enemies){
      if(e.dead) continue;
      ctx.fillStyle=e.type==="boss"?"#ff50ff":"#ff5050";
      ctx.fillRect(mx+e.x/TILE*scaleX-1,my+e.y/TILE*scaleY-1,e.type==="boss"?4:2,e.type==="boss"?4:2);
    }
  }

  private _drawInteractionPrompts(ctx: CanvasRenderingContext2D, s: CamelotState): void {
    if(!s.gameRunning||s.player.dead) return;
    const px=s.player.x, py=s.player.y;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
      const tx=Math.floor((px+s.player.w/2)/TILE)+dx;
      const ty2=Math.floor((py+s.player.h/2)/TILE)+dy;
      if(!s.levelData.tiles[ty2]||s.levelData.tiles[ty2][tx]===undefined) continue;
      const t=s.levelData.tiles[ty2][tx];
      if(t===T.LEVER||t===T.CHECKPOINT){
        const sx2=tx*TILE+TILE/2-s.camera.x, sy2=ty2*TILE-12-s.camera.y;
        const bobY=Math.sin(s.gameTime*0.1)*3;
        ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.arc(sx2,sy2+bobY,12,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#d4a843"; ctx.font="bold 14px Georgia"; ctx.textAlign="center";
        ctx.fillText("E",sx2,sy2+bobY+5); ctx.textAlign="left";
      }
    }
    for(const e of s.enemies){
      if(e.dead||e.stunTimer<10) continue;
      if(Math.abs(e.x-px)<50&&Math.abs(e.y-py)<50){
        const ex=e.x+e.w/2-s.camera.x, ey=e.y-16-s.camera.y;
        const bobY=Math.sin(s.gameTime*0.12)*3;
        ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.arc(ex,ey+bobY,14,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#ff8800"; ctx.font="bold 12px Georgia"; ctx.textAlign="center";
        ctx.fillText("E",ex,ey+bobY+4); ctx.font="9px Georgia"; ctx.fillText("EXECUTE",ex,ey+bobY+16); ctx.textAlign="left";
      }
    }
  }

  private _drawKillStreak(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    if(!s.gameRunning||s.player.killStreak<2) return;
    const pulse=0.7+Math.sin(s.gameTime*0.15)*0.3;
    ctx.fillStyle=`rgba(255,136,0,${pulse})`;
    ctx.font=`bold ${20+s.player.killStreak*2}px Georgia`; ctx.textAlign="center";
    ctx.fillText(`${s.player.killStreak}x KILL STREAK`,sw/2,sh-90); ctx.textAlign="left";
  }

  private _drawScreenEffects(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    if(s.vignetteTimer>0){
      const alpha=s.vignetteTimer/20*0.5;
      if(s.vignetteColor==="red"){
        const g=ctx.createRadialGradient(sw/2,sh/2,sw*0.3,sw/2,sh/2,sw*0.7);
        g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,`rgba(180,20,20,${alpha})`);
        ctx.fillStyle=g; ctx.fillRect(0,0,sw,sh);
      } else if(s.vignetteColor==="white"){
        ctx.fillStyle=`rgba(255,255,255,${alpha*0.6})`; ctx.fillRect(0,0,sw,sh);
      }
    }
    if(s.gameRunning){
      ctx.fillStyle="#d4a843"; ctx.font="13px Georgia";
      ctx.fillText(`Lives: ${"♥".repeat(Math.max(0,s.lives))}`,sw-130,sh-20);
    }
  }

  private _drawBloodMoon(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    const pulse = 0.08 + Math.sin(s.gameTime * 0.06) * 0.04;
    ctx.fillStyle = `rgba(200,20,20,${pulse})`;
    ctx.fillRect(0, 0, sw, sh);
    // Pulsing red border
    const borderPulse = 0.15 + Math.sin(s.gameTime * 0.1) * 0.1;
    const vg = ctx.createRadialGradient(sw / 2, sh / 2, sw * 0.3, sw / 2, sh / 2, sw * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(180,0,0,${borderPulse})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, sw, sh);
    // "BLOOD MOON" text
    ctx.globalAlpha = 0.3 + Math.sin(s.gameTime * 0.08) * 0.15;
    ctx.fillStyle = "#ff2020"; ctx.font = "bold 14px Georgia"; ctx.textAlign = "center";
    ctx.fillText("BLOOD MOON", sw / 2, 70); ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  private _drawWeather(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    if (!s.weatherParticles || s.weatherParticles.length === 0) return;
    const bg = s.levelData.bg;
    for (const wp of s.weatherParticles) {
      const wx = wp.x - s.camera.x, wy = wp.y - s.camera.y;
      if (wx < -10 || wx > sw + 10 || wy < -10 || wy > sh + 10) continue;
      if (bg === "tower") {
        // Rain streaks
        ctx.globalAlpha = 0.3 + (wp.life / 60) * 0.2;
        ctx.strokeStyle = "#6080c0"; ctx.lineWidth = wp.size;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + wp.vx * 2, wy + wp.vy * 2); ctx.stroke();
      } else if (bg === "throne") {
        // Glowing embers
        ctx.globalAlpha = Math.min(1, wp.life / 30) * 0.7;
        ctx.fillStyle = wp.life % 20 > 10 ? "#ff6600" : "#ff9933";
        ctx.beginPath(); ctx.arc(wx, wy, wp.size, 0, Math.PI * 2); ctx.fill();
        // Ember glow
        const eg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wp.size * 4);
        eg.addColorStop(0, "rgba(255,100,0,0.15)"); eg.addColorStop(1, "rgba(255,50,0,0)");
        ctx.fillStyle = eg; ctx.fillRect(wx - wp.size * 4, wy - wp.size * 4, wp.size * 8, wp.size * 8);
      } else if (bg === "dungeon") {
        // Water drip
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#4070b0";
        ctx.beginPath(); ctx.arc(wx, wy, wp.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private _drawScoreTally(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    if (!s.tallyData) return;
    ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, sw, sh);
    const progress = Math.min(s.tallyTimer / 60, 1); // animate over 1 second
    ctx.textAlign = "center";
    ctx.font = "bold 36px Georgia"; ctx.fillStyle = "#d4a843";
    ctx.fillText("LEVEL COMPLETE", sw / 2, sh / 2 - 100);
    ctx.font = "italic 20px Georgia"; ctx.fillStyle = "#a08030";
    ctx.fillText(s.tallyData.levelName, sw / 2, sh / 2 - 65);
    // Animated stat counters
    const showKills = Math.floor(s.tallyData.kills * Math.min(progress * 2, 1));
    const showCoins = Math.floor(s.tallyData.coins * Math.min(Math.max(progress * 2 - 0.5, 0), 1));
    const showTime = progress > 0.7 ? s.tallyData.time : 0;
    ctx.font = "22px Georgia";
    ctx.fillStyle = "#c08080"; ctx.fillText(`Enemies Defeated: ${showKills}`, sw / 2, sh / 2 - 15);
    ctx.fillStyle = "#e8c050"; ctx.fillText(`Coins Collected: ${showCoins}`, sw / 2, sh / 2 + 20);
    if (showTime > 0) {
      const secs = Math.floor(showTime / 60);
      ctx.fillStyle = "#a09060";
      ctx.fillText(`Time: ${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`, sw / 2, sh / 2 + 55);
    }
    if (progress >= 1) {
      const pulse = 0.6 + Math.sin(s.gameTime * 0.08) * 0.4;
      ctx.font = "bold 18px Georgia"; ctx.fillStyle = `rgba(212,168,67,${pulse})`;
      ctx.fillText("Press ENTER to continue", sw / 2, sh / 2 + 110);
    }
    ctx.textAlign = "left";
  }

  private _drawCRT(ctx: CanvasRenderingContext2D, sw: number, sh: number): void {
    ctx.fillStyle="rgba(0,0,0,0.08)";
    for(let y=0;y<sh;y+=3) ctx.fillRect(0,y,sw,1);
    const vg=ctx.createRadialGradient(sw/2,sh/2,sw*0.35,sw/2,sh/2,sw*0.75);
    vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,0.25)");
    ctx.fillStyle=vg; ctx.fillRect(0,0,sw,sh);
    ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=0.02;
    ctx.drawImage(this._canvas,-1,0); ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
  }

  private _drawFade(ctx: CanvasRenderingContext2D, s: CamelotState, sw: number, sh: number): void {
    if(s.fadeAlpha>0){
      ctx.fillStyle=`rgba(0,0,0,${s.fadeAlpha})`; ctx.fillRect(0,0,sw,sh);
    }
  }
}
