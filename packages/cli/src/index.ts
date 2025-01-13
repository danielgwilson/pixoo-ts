#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { version } from '../package.json';
import { drawCommand } from './commands/draw.js';
import { configCommand } from './commands/config.js';
import { deviceCommand } from './commands/device.js';
import { discoveryCommand } from './commands/discovery.js';

const program = new Command()
  .name('pixoo')
  .description('CLI tool for controlling Pixoo devices')
  .version(version);

// Add commands
program.addCommand(drawCommand);
program.addCommand(configCommand);
program.addCommand(deviceCommand);
program.addCommand(discoveryCommand);

// Error handling
program.showHelpAfterError();
program.showSuggestionAfterError();

program.configureOutput({
  writeOut: (str: string) => process.stdout.write(`${str}\n`),
  writeErr: (str: string) => process.stdout.write(`${pc.red(str)}\n`),
  outputError: (str: string, write: (str: string) => void) =>
    write(pc.red(str)),
});

// Parse and execute
const run = async () => {
  try {
    await program.parseAsync();
  } catch (error) {
    console.error(pc.red('Error:'), error);
    process.exit(1);
  }
};

run();
