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

async function runDrawingDemo(pixoo: Pixoo) {
  console.log(pc.blue('🎨 Starting drawing demo...'));

  // Clear to black
  pixoo.clear([0, 0, 0]);
  await pixoo.push();
  await new Promise((r) => setTimeout(r, 1000));

  // Draw some pixels
  for (let i = 0; i < 64; i += 4) {
    pixoo.drawPixel(i, i, [255, 0, 0]); // Red diagonal
    pixoo.drawPixel(i, 63 - i, [0, 255, 0]); // Green diagonal
    await pixoo.push();
    await new Promise((r) => setTimeout(r, 50));
  }

  // Draw some lines
  pixoo.clear([0, 0, 0]);
  await pixoo.push();
  await new Promise((r) => setTimeout(r, 1000));

  // Draw a box
  pixoo.drawLine(10, 10, 53, 10, [255, 255, 0]); // Top
  await pixoo.push();
  await new Promise((r) => setTimeout(r, 200));

  pixoo.drawLine(53, 10, 53, 53, [255, 255, 0]); // Right
  await pixoo.push();
  await new Promise((r) => setTimeout(r, 200));

  pixoo.drawLine(53, 53, 10, 53, [255, 255, 0]); // Bottom
  await pixoo.push();
  await new Promise((r) => setTimeout(r, 200));

  pixoo.drawLine(10, 53, 10, 10, [255, 255, 0]); // Left
  await pixoo.push();
  await new Promise((r) => setTimeout(r, 1000));

  // Fill with random pixels
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(Math.random() * 64);
    const y = Math.floor(Math.random() * 64);
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);

    pixoo.drawPixel(x, y, [r, g, b]);
    await pixoo.push();
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(pc.green('✨ Demo complete!'));
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
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'How would you like to run the demo?',
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

  // Run the same drawing demo regardless of mode
  await runDrawingDemo(pixoo);

  // Keep the process running in simulator mode
  if (mode === 'web') {
    await new Promise(() => {});
  }
}

main().catch((error) => {
  console.error(pc.red('Error:'), error);
  process.exit(1);
});
