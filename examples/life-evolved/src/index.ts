import { PixooDiscovery, Pixoo } from '@pixoo-ts/core';
import inquirer from 'inquirer';
import pc from 'picocolors';
import { spawn } from 'child_process';
import open from 'open';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { TribalLife } from './tribal-life';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        message: 'How would you like to run Tribal Life?',
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

    const simulation = new TribalLife(pixoo);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log(pc.blue('\n👋 Goodbye!'));
      simulation.stop();
      process.exit(0);
    });

    await simulation.run();
  } catch (error) {
    console.error(pc.red('Fatal error:'), error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(pc.red('Error:'), error);
  process.exit(1);
});
