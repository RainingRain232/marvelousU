// Initializes Pixi app, manages all view layers
import { Application } from "pixi.js";

export class ViewManager {
  app!: Application;

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({ background: "#1a1a2e", resizeTo: window });
    container.appendChild(this.app.canvas);
  }

  destroy(): void {
    this.app.destroy(true);
  }
}
