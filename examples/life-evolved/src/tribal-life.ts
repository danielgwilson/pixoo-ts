/* src/tribal-life.ts */
import { Pixoo } from '@pixoo-ts/core';
import { Cell, CONFIG, Position, TerrainType, Tribe, RGB } from './types';
import { generateTerrain, getTerrainColor } from './terrain';
import { createTribe, initializeTribe, updatePerson } from './tribe';
import pc from 'picocolors';
import { hslToRgb } from './colors';

export class TribalLife {
  private grid: Cell[][];
  private tribes: Map<number, Tribe>;
  private pixoo: Pixoo;
  private isRunning: boolean;

  constructor(pixoo: Pixoo) {
    this.pixoo = pixoo;
    this.isRunning = true;
    this.tribes = new Map();
    this.grid = generateTerrain();
  }

  private async waitForConnection(): Promise<void> {
    console.log(pc.blue('Establishing connection to Pixoo...'));
    await this.pixoo.push();
    await new Promise((r) => setTimeout(r, 1000));
    console.log(pc.green('✅ Connection established'));
  }

  private initializeTribes(): void {
    const tribeHues = [180, 300, 260, 30];

    for (let i = 0; i < CONFIG.INITIAL_TRIBES; i++) {
      const hue = tribeHues[i];
      const tribe = createTribe(i + 1, hue);

      const centerX = Math.floor(Math.random() * CONFIG.GRID_SIZE);
      const centerY = Math.floor(Math.random() * CONFIG.GRID_SIZE);

      if (initializeTribe(this.grid, tribe, { x: centerX, y: centerY })) {
        this.tribes.set(tribe.id, tribe);
        console.log(
          pc.green(
            `✅ Tribe ${tribe.id} spawned with ${tribe.population.size} people`
          )
        );
      }
    }
  }

  private updateWorld(): void {
    // Update all people
    for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
      for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
        if (this.grid[x][y].person) {
          updatePerson(this.grid, { x, y }, this.tribes);
        }
      }
    }

    // Log status occasionally
    if (Math.random() < 0.05) {
      this.logTribesStatus();
    }
  }

  private logTribesStatus(): void {
    console.log(pc.blue('\n🏰 Tribes Status:'));
    for (const [id, tribe] of this.tribes.entries()) {
      console.log(
        pc.blue(`Tribe ${id}:`),
        `Population: ${tribe.population.size},`,
        `Resources:`,
        Array.from(tribe.resources.entries())
          .map(([type, amount]) => `${type}: ${amount}`)
          .join(', ')
      );
    }
    console.log();
  }

  private drawWorld(): void {
    // Draw terrain
    for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
      for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
        const cell = this.grid[x][y];
        let color: RGB;

        if (cell.resourceAmount > 0) {
          color = [255, 255, 150]; // Bright yellow for resources
        } else {
          color = getTerrainColor(cell.terrain);
        }

        this.pixoo.drawPixel(x, y, color);
      }
    }

    // Draw people on top
    for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
      for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
        const cell = this.grid[x][y];
        if (cell.person) {
          const tribe = this.tribes.get(cell.person.tribeId);
          if (tribe) {
            const color = hslToRgb(tribe.baseHue, 1.0, 0.6);
            this.pixoo.drawPixel(x, y, color);
          }
        }
      }
    }
  }

  public stop(): void {
    this.isRunning = false;
  }

  public async run(): Promise<void> {
    console.log(pc.blue('🏰 Running Tribal Life'));
    console.log(pc.blue('Press Ctrl+C to exit'));

    await this.waitForConnection();

    console.log(pc.yellow('Generating world...'));
    this.initializeTribes();
    console.log(pc.green(`World initialized with ${this.tribes.size} tribes`));

    // Initial draw
    this.drawWorld();
    await this.pixoo.push();

    try {
      while (this.isRunning) {
        this.updateWorld();
        this.drawWorld();
        await this.pixoo.push();
        await new Promise((r) => setTimeout(r, CONFIG.SIMULATION_SPEED));
      }
    } catch (error) {
      console.error(pc.red('Error in simulation:'), error);
      this.stop();
    }
  }
}
