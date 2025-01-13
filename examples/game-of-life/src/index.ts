import { PixooDiscovery, Pixoo } from '@pixoo-ts/core';
import inquirer from 'inquirer';
import pc from 'picocolors';
import { spawn } from 'child_process';
import open from 'open';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Game configuration
const GRID_SIZE = 64;
const SIMULATION_INTERVAL = 100; // ms between generations

// Color configuration
type RGB = [number, number, number];
const COLORS: RGB[] = [
  [0, 255, 0], // Bright green (new cell)
  [150, 255, 0], // Yellow-green
  [255, 255, 0], // Yellow
  [255, 150, 0], // Orange
  [255, 50, 0], // Red-orange
  [255, 0, 0], // Red
  [150, 0, 0], // Dark red (about to die)
];

class GameOfLife {
  private grid: number[][]; // Numbers represent age (0 = dead, 1-7 = alive with color index)
  private nextGrid: number[][];
  private pixoo: Pixoo;
  private isRunning: boolean;

  constructor(pixoo: Pixoo) {
    this.pixoo = pixoo;
    this.grid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(0));
    this.nextGrid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(0));
    this.isRunning = true;
  }

  private countNeighbors(x: number, y: number): number {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const newX = (x + i + GRID_SIZE) % GRID_SIZE;
        const newY = (y + j + GRID_SIZE) % GRID_SIZE;
        if (this.grid[newX][newY] > 0) count++; // Any non-zero value means alive
      }
    }
    return count;
  }

  private computeNextGeneration(): void {
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const neighbors = this.countNeighbors(x, y);
        const currentAge = this.grid[x][y];
        const isAlive = currentAge > 0;

        if (isAlive) {
          if (neighbors === 2 || neighbors === 3) {
            // Cell survives and ages
            this.nextGrid[x][y] = Math.min(currentAge + 1, COLORS.length);
          } else {
            // Cell dies
            this.nextGrid[x][y] = 0;
          }
        } else {
          // Dead cell
          if (neighbors === 3) {
            // New cell is born
            this.nextGrid[x][y] = 1;
          } else {
            // Cell stays dead
            this.nextGrid[x][y] = 0;
          }
        }
      }
    }

    // Swap grids
    [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
  }

  private drawGrid(): void {
    this.pixoo.clear([0, 0, 0]);

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const age = this.grid[x][y];
        if (age > 0) {
          const colorIndex = age - 1;
          this.pixoo.drawPixel(x, y, COLORS[colorIndex]);
        }
      }
    }
  }

  private randomize(): void {
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        // ~15% chance of being alive, starting at age 1
        this.grid[x][y] = Math.random() > 0.85 ? 1 : 0;
      }
    }
  }

  public stop(): void {
    this.isRunning = false;
  }

  public async run(): Promise<void> {
    console.log(pc.blue('🎮 Running Colorful Game of Life'));
    console.log(pc.blue('Press Ctrl+C to exit'));
    console.log(pc.green('🟢 New cells are bright green'));
    console.log(pc.yellow('🟡 Cells age through yellow and orange'));
    console.log(pc.red('🔴 Old cells become red before dying'));

    // Initial random state
    this.randomize();

    try {
      // Main game loop
      while (this.isRunning) {
        this.computeNextGeneration();
        this.drawGrid();
        await this.pixoo.push();
        await new Promise((r) => setTimeout(r, SIMULATION_INTERVAL));
      }
    } catch (error) {
      console.error(pc.red('Error in game loop:'), error);
      this.stop();
    }
  }
}

async function startWebSimulator(): Promise<Pixoo> {
  console.log(pc.blue('🌐 Starting web simulator...'));

  const webSimulatorPath = join(__dirname, '../../../packages/web-simulator');
  const nextDev = spawn('pnpm', ['dev'], {
    cwd: webSimulatorPath,
    stdio: 'pipe',
  });

  // Wait for Next.js to be ready
  await new Promise<void>((resolve) => {
    nextDev.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready')) {
        resolve();
      }
      // Still show the output
      process.stdout.write(data);
    });
  });

  // Give the server a moment to fully initialize
  await new Promise((r) => setTimeout(r, 1000));

  await open('http://localhost:3000');
  console.log(pc.green('✨ Web simulator is running at http://localhost:3000'));

  // Create a simulated Pixoo instance
  const pixoo = new Pixoo({
    ipAddress: 'localhost:3000',
    size: 64,
    debug: false,
    isSimulator: true,
  });

  return pixoo;
}

async function main() {
  try {
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'How would you like to run Game of Life?',
        choices: [
          { name: '🔍 Find and use real Pixoo device', value: 'real' },
          { name: '🌐 Start web simulator', value: 'web' },
        ],
      },
    ]);

    let pixoo: Pixoo;

    if (mode === 'real') {
      console.log(pc.blue('🔍 Finding Pixoo device...'));
      const discovery = new PixooDiscovery({ debug: false });
      const ip = await discovery.findDevice();

      if (!ip) {
        console.error(pc.red('❌ No Pixoo device found'));
        process.exit(1);
      }

      console.log(pc.green(`✅ Found Pixoo at ${ip}`));

      pixoo = new Pixoo({
        ipAddress: ip,
        size: 64,
        debug: false,
      });
    } else {
      pixoo = await startWebSimulator();
    }

    const game = new GameOfLife(pixoo);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log(pc.blue('\n👋 Goodbye!'));
      game.stop();
      process.exit(0);
    });

    await game.run();
  } catch (error) {
    console.error(pc.red('Fatal error:'), error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(pc.red('Error:'), error);
  process.exit(1);
});
