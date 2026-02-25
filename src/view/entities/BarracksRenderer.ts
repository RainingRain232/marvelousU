import { Container, Graphics } from "pixi.js";
import { gsap } from "gsap";

export class BarracksRenderer {
  readonly container = new Container();

  private towers: Container[] = [];
  private gateHouse!: Container;
  private walls: Container[] = [];
  private swordsmanGuard!: Container;

  constructor(_owner: string | null) {
    this.setupBarracks();
  }

  private setupBarracks(): void {
    // Create central gatehouse
    this.createGateHouse();

    // Create wall between towers
    this.createWalls();

    // Add towers on each side
    this.createTower(-1, 0); // Left tower
    this.createTower(2, 0); // Right tower

    // Add swordsman guard at entrance
    this.addSwordsmanGuard();

    // Add details like banners, torches
    this.addDetails();
  }

  private createTower(xOffset: number, yOffset: number): void {
    const tower = new Container();

    // Stone base (smaller for 2x2)
    const base = new Graphics();
    base.beginFill(0x6b6860);
    base.drawRect(0, 0, 32, 48);
    base.endFill();

    // Brick pattern
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        const brick = new Graphics();
        brick.beginFill(0x8b8878);
        brick.drawRect(2 + i * 14, 2 + j * 14, 10, 10);
        brick.endFill();
        base.addChild(brick);
      }
    }

    tower.addChild(base);

    // Crenellations
    for (let i = 0; i < 2; i++) {
      const crenellation = new Graphics();
      crenellation.beginFill(0x5d3d1d);
      crenellation.drawRect(i * 14, 48, 10, 6);
      crenellation.endFill();
      tower.addChild(crenellation);
    }

    // Archer hole
    const hole = new Graphics();
    hole.beginFill(0x1a1a2e);
    hole.drawRect(12, 32, 6, 8);
    hole.endFill();
    tower.addChild(hole);

    tower.x = xOffset * 32;
    tower.y = yOffset * 32;

    this.towers.push(tower);
    this.container.addChild(tower);
  }

  private createGateHouse(): void {
    this.gateHouse = new Container();

    // Main gatehouse structure (centered)
    const gateHouse = new Graphics();
    gateHouse.beginFill(0x5d3d1d);
    gateHouse.drawRect(32, 0, 64, 40); // Stone arch
    gateHouse.endFill();

    // Wooden gate
    const gate = new Graphics();
    gate.beginFill(0x8b5a2b);
    gate.drawRect(40, 10, 48, 30); // Wooden gate
    gate.endFill();

    // Metal hinges
    const hinge1 = new Graphics();
    hinge1.beginFill(0x8899aa);
    hinge1.drawRect(38, 15, 3, 20);
    hinge1.endFill();

    const hinge2 = new Graphics();
    hinge2.beginFill(0x8899aa);
    hinge2.drawRect(87, 15, 3, 20);
    hinge2.endFill();

    gateHouse.addChild(gate, hinge1, hinge2);
    this.gateHouse.addChild(gateHouse);

    // Stone arch details
    const arch = new Graphics();
    arch.beginFill(0x6b6860);
    arch.drawEllipse(64, 0, 32, 10);
    arch.endFill();
    this.gateHouse.addChild(arch);

    this.gateHouse.x = 32;
    this.gateHouse.y = 8;

    this.container.addChild(this.gateHouse);
  }

  private createWalls(): void {
    // Wall between towers
    const wall = new Container();

    // Stone wall
    const stoneWall = new Graphics();
    stoneWall.beginFill(0x8b8878);
    stoneWall.drawRect(0, 0, 96, 16); // Wall between towers
    stoneWall.endFill();

    // Add brick pattern
    for (let i = 0; i < 6; i++) {
      const brick = new Graphics();
      brick.beginFill(0x6b6860);
      brick.drawRect(2 + i * 14, 2, 10, 10);
      brick.endFill();
      stoneWall.addChild(brick);
    }

    wall.addChild(stoneWall);
    wall.x = 32;
    wall.y = 48;

    this.walls.push(wall);
    this.container.addChild(wall);

    // Archer holes in wall
    const hole1 = new Graphics();
    hole1.beginFill(0x1a1a2e);
    hole1.drawRect(10, 4, 6, 8);
    hole1.endFill();

    const hole2 = new Graphics();
    hole2.beginFill(0x1a1a2e);
    hole2.drawRect(80, 4, 6, 8);
    hole2.endFill();

    wall.addChild(hole1, hole2);
  }

  private addSwordsmanGuard(): void {
    // Create swordsman guard at entrance (smaller)
    this.swordsmanGuard = new Container();

    // Body (armor) - smaller
    const body = new Graphics();
    body.beginFill(0x8899aa); // Chainmail
    body.drawRect(-4, -16, 8, 16);
    body.endFill();

    // Head
    const head = new Graphics();
    head.beginFill(0xd4a574); // Skin
    head.drawCircle(0, -20, 4);
    head.endFill();

    // Sword
    const sword = new Graphics();
    sword.beginFill(0xcccccc);
    sword.drawRect(4, -20, 2, 12);
    sword.endFill();

    // Shield
    const shield = new Graphics();
    shield.beginFill(0x8b4513);
    shield.drawRect(-8, -14, 3, 8);
    shield.endFill();

    this.swordsmanGuard.addChild(body, head, sword, shield);
    this.swordsmanGuard.x = 72;
    this.swordsmanGuard.y = 40;

    this.container.addChild(this.swordsmanGuard);

    // Animate guard patrol
    this.animateSwordsmanGuard();
  }

  private animateSwordsmanGuard(): void {
    gsap.to(this.swordsmanGuard, {
      duration: 2,
      x: 80,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });
  }

  private addDetails(): void {
    // Add banners on towers
    this.addBanner(this.towers[0], -8, -8);
    this.addBanner(this.towers[1], 24, -8);

    // Add torches beside gate
    this.addTorch(28, 30);
    this.addTorch(92, 30);

    // Add moss on walls
    this.addMoss();
  }

  private addBanner(container: Container, x: number, y: number): void {
    const banner = new Graphics();
    banner.beginFill(0x4a6b3a);
    banner.drawRect(x, y, 16, 12);
    banner.endFill();

    // Add flag pole
    const pole = new Graphics();
    pole.beginFill(0x8899aa);
    pole.drawRect(x + 6, y - 8, 3, 20);
    pole.endFill();

    container.addChild(banner, pole);
  }

  private addTorch(x: number, y: number): void {
    const torchBase = new Graphics();
    torchBase.beginFill(0x8b5a2b);
    torchBase.drawRect(x, y, 6, 10);
    torchBase.endFill();

    const flame = new Graphics();
    flame.beginFill(0xff6600);
    flame.drawEllipse(0, 0, 4, 3);
    flame.endFill();

    flame.x = x + 3;
    flame.y = y - 4;

    this.container.addChild(torchBase, flame);

    // Animate flame
    gsap.to(flame, {
      duration: 0.5,
      y: y - 6,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });
  }

  private addMoss(): void {
    // Add moss patches on walls
    const moss1 = new Graphics();
    moss1.beginFill(0x4a6b3a);
    moss1.drawCircle(40, 52, 4);
    moss1.endFill();

    const moss2 = new Graphics();
    moss2.beginFill(0x4a6b3a);
    moss2.drawCircle(80, 52, 4);
    moss2.endFill();

    this.container.addChild(moss1, moss2);
  }

  // Tick method for idle animations
  public tick(): void {
    // Torch animations are handled by GSAP
  }

  // Animation methods
  public attack(): void {
    // Animate swordsman guard
    if (this.swordsmanGuard) {
      gsap.to(this.swordsmanGuard, {
        duration: 0.2,
        rotation: -0.1,
        onComplete: () => {
          gsap.to(this.swordsmanGuard, {
            duration: 0.2,
            rotation: 0.1,
          });
        },
      });
    }
  }

  public die(): void {
    // Characters fall
    if (this.swordsmanGuard) {
      gsap.to(this.swordsmanGuard, {
        duration: 0.8,
        y: this.swordsmanGuard.y + 30,
        rotation: 0.5,
        ease: "power2.in",
      });
    }
  }
}
