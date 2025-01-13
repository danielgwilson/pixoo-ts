/* src/life-evolved.ts */
import { Pixoo } from '@pixoo-ts/core';
import { LifeCell, Colony, Genome, Position } from './types';
import {
  breedGenomes,
  createInitialGenome,
  mutateGenome,
  shouldBreed,
} from './genome';
import {
  getCellColor,
  getInitialBrightness,
  incrementBrightness,
} from './colors';
import pc from 'picocolors';

const GRID_SIZE = 64;
const INITIAL_COLONIES = 4;
const MAX_COLONIES = 8;
const MIN_COLONY_SIZE = 5;
const SIMULATION_SPEED = 300;
const BREEDING_LOG_CHANCE = 0.3;

export class LifeEvolved {
  private grid: LifeCell[][];
  private nextGrid: LifeCell[][];
  private colonies: Colony[];
  private pixoo: Pixoo;
  private isRunning: boolean;

  constructor(pixoo: Pixoo) {
    this.pixoo = pixoo;
    this.isRunning = true;
    this.colonies = [];

    this.grid = Array(GRID_SIZE)
      .fill(null)
      .map(() =>
        Array(GRID_SIZE)
          .fill(null)
          .map(() => ({
            genome: null,
            age: 0,
            brightness: 0,
          }))
      );
    this.nextGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() =>
        Array(GRID_SIZE)
          .fill(null)
          .map(() => ({
            genome: null,
            age: 0,
            brightness: 0,
          }))
      );
  }

  private getCell(x: number, y: number): LifeCell {
    return this.grid[x][y];
  }

  private setNextCell(x: number, y: number, cell: LifeCell): void {
    this.nextGrid[x][y] = cell;
  }

  private genomeEquals(a: Genome, b: Genome): boolean {
    return (
      a.baseHue === b.baseHue &&
      a.birthRule.join() === b.birthRule.join() &&
      a.survivalRule.join() === b.survivalRule.join()
    );
  }

  private countNeighbors(
    x: number,
    y: number,
    targetGenome: Genome | null = null
  ): number {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const newX = (x + i + GRID_SIZE) % GRID_SIZE;
        const newY = (y + j + GRID_SIZE) % GRID_SIZE;
        const cell = this.getCell(newX, newY);
        if (cell.genome !== null) {
          if (
            targetGenome === null ||
            this.genomeEquals(cell.genome, targetGenome)
          ) {
            count++;
          }
        }
      }
    }
    return count;
  }

  private getNeighborGenomes(x: number, y: number): Map<Genome, number> {
    const genomes = new Map<Genome, number>();
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const newX = (x + i + GRID_SIZE) % GRID_SIZE;
        const newY = (y + j + GRID_SIZE) % GRID_SIZE;
        const cell = this.getCell(newX, newY);
        if (cell.genome !== null) {
          let found = false;
          for (const [existingGenome, count] of genomes.entries()) {
            if (this.genomeEquals(existingGenome, cell.genome)) {
              genomes.set(existingGenome, count + 1);
              found = true;
              break;
            }
          }
          if (!found) {
            genomes.set(cell.genome, 1);
          }
        }
      }
    }
    return genomes;
  }

  private async waitForConnection(): Promise<void> {
    console.log(pc.blue('Establishing connection to Pixoo...'));

    this.pixoo.clear([0, 0, 0]);
    await this.pixoo.push();
    await new Promise((r) => setTimeout(r, 1000));

    console.log(pc.green('✅ Connection established'));
  }

  private handleBreeding(
    x: number,
    y: number,
    neighborGenomes: Map<Genome, number>
  ): Genome | null {
    if (neighborGenomes.size < 2) return null;

    const sortedGenomes = Array.from(neighborGenomes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2);

    const [dominantGenome, secondGenome] = sortedGenomes.map(
      ([genome]) => genome
    );
    const [, dominantCount] = sortedGenomes[0];

    if (shouldBreed(dominantCount)) {
      const childGenome = breedGenomes(dominantGenome, secondGenome);
      if (Math.random() < BREEDING_LOG_CHANCE) {
        console.log(
          pc.green('🧬 New genome bred!'),
          `Hue: ${Math.round(childGenome.baseHue)}°, ` +
            `Birth: ${childGenome.birthRule.join(',')}, ` +
            `Survival: ${childGenome.survivalRule.join(',')}`
        );
      }
      return childGenome;
    }
    return null;
  }

  private updateCell(x: number, y: number): void {
    const currentCell = this.getCell(x, y);
    const neighborGenomes = this.getNeighborGenomes(x, y);

    if (currentCell.genome === null) {
      // Dead cell - check for birth
      const breedingResult = this.handleBreeding(x, y, neighborGenomes);
      if (breedingResult) {
        this.setNextCell(x, y, {
          genome: breedingResult,
          age: 0,
          brightness: getInitialBrightness(),
        });
        return;
      }

      if (neighborGenomes.size > 0) {
        const [dominantGenome] = Array.from(neighborGenomes.entries()).sort(
          ([, a], [, b]) => b - a
        )[0];

        const neighborCount = this.countNeighbors(x, y, dominantGenome);
        if (dominantGenome.birthRule.includes(neighborCount)) {
          this.setNextCell(x, y, {
            genome: mutateGenome(dominantGenome),
            age: 0,
            brightness: getInitialBrightness(),
          });
          return;
        }
      }
    } else {
      // Live cell - check survival
      const neighborCount = this.countNeighbors(x, y, currentCell.genome);
      if (currentCell.genome.survivalRule.includes(neighborCount)) {
        this.setNextCell(x, y, {
          genome: mutateGenome(currentCell.genome),
          age: currentCell.age + 1,
          brightness: incrementBrightness(currentCell.brightness),
        });
        return;
      }
    }

    this.setNextCell(x, y, {
      genome: null,
      age: 0,
      brightness: 0,
    });
  }

  private updateColonies(): void {
    this.colonies = [];
    const processed = new Set<string>();

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const key = `${x},${y}`;
        if (processed.has(key)) continue;

        const cell = this.getCell(x, y);
        if (cell.genome === null) continue;

        const colony: Colony = {
          genome: cell.genome,
          cells: new Set([key]),
        };
        const queue: Position[] = [{ x, y }];

        while (queue.length > 0) {
          const pos = queue.shift()!;
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              if (i === 0 && j === 0) continue;
              const newX = (pos.x + i + GRID_SIZE) % GRID_SIZE;
              const newY = (pos.y + j + GRID_SIZE) % GRID_SIZE;
              const newKey = `${newX},${newY}`;

              if (processed.has(newKey)) continue;
              const neighborCell = this.getCell(newX, newY);
              if (neighborCell.genome === cell.genome) {
                colony.cells.add(newKey);
                processed.add(newKey);
                queue.push({ x: newX, y: newY });
              }
            }
          }
        }
        if (colony.cells.size >= MIN_COLONY_SIZE) {
          this.colonies.push(colony);
        }
      }
    }

    this.colonies.sort((a, b) => b.cells.size - a.cells.size);
    this.colonies = this.colonies.slice(0, MAX_COLONIES);

    if (Math.random() < 0.05) {
      console.log(pc.blue('🏰 Colony Status:'));
      this.colonies.forEach((colony, index) => {
        console.log(
          pc.blue(`  Colony ${index + 1}:`),
          `Size: ${colony.cells.size},`,
          `Hue: ${Math.round(colony.genome.baseHue)}°,`,
          `Rules: B${colony.genome.birthRule.join('')}/S${colony.genome.survivalRule.join('')}`
        );
      });
    }
  }

  private drawGrid(): void {
    this.pixoo.clear([0, 0, 0]);
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const cell = this.getCell(x, y);
        if (cell.genome !== null) {
          const color = getCellColor(cell.genome.baseHue, cell.brightness);
          this.pixoo.drawPixel(x, y, color);
        }
      }
    }
  }

  private initializeRandomColonies(): void {
    for (let i = 0; i < INITIAL_COLONIES; i++) {
      const hue = (i * (360 / INITIAL_COLONIES)) % 360;
      const genome = createInitialGenome(hue);

      const centerX = Math.floor(Math.random() * (GRID_SIZE - 8)) + 4;
      const centerY = Math.floor(Math.random() * (GRID_SIZE - 8)) + 4;

      const patterns = [
        [
          [0, -1],
          [0, 0],
          [0, 1],
        ],
        [
          [-1, -1],
          [-1, 0],
          [0, -1],
          [0, 0],
        ],
        [
          [0, -1],
          [0, 0],
          [-1, -1],
          [-1, 0],
          [-2, 0],
          [1, 0],
        ],
        [
          [0, 0],
          [-1, 0],
          [-2, 0],
          [0, -1],
          [-1, -2],
        ],
      ];

      const pattern = patterns[i % patterns.length];
      for (const [dx, dy] of pattern) {
        this.grid[centerX + dx][centerY + dy] = {
          genome,
          age: 0,
          brightness: getInitialBrightness(),
        };
      }
    }
  }

  public stop(): void {
    this.isRunning = false;
  }

  public async run(): Promise<void> {
    console.log(pc.blue('🧬 Running Life Evolved'));
    console.log(pc.blue('Press Ctrl+C to exit'));
    console.log(pc.yellow('Starting with tribal colonies...'));
    console.log(pc.yellow('Watch them explore and occasionally meet!'));

    await this.waitForConnection();
    this.initializeRandomColonies();

    try {
      while (this.isRunning) {
        for (let x = 0; x < GRID_SIZE; x++) {
          for (let y = 0; y < GRID_SIZE; y++) {
            this.updateCell(x, y);
          }
        }
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
        this.updateColonies();

        this.drawGrid();
        await this.pixoo.push();
        await new Promise((r) => setTimeout(r, SIMULATION_SPEED));
      }
    } catch (error) {
      console.error(pc.red('Error in game loop:'), error);
      this.stop();
    }
  }
}
