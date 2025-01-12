#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { version } from '../package.json';
import { drawCommand } from './commands/draw.js';
import { configCommand } from './commands/config.js';
import { deviceCommand } from './commands/device.js';

const program = new Command()
  .name('pixoo')
  .description('CLI tool for controlling Pixoo devices')
  .version(version);

// Add commands
program
  .command('draw')
  .description('Draw on the Pixoo display')
  .addCommand(drawCommand);

program
  .command('config')
  .description('Configure Pixoo settings')
  .addCommand(configCommand);

program
  .command('device')
  .description('Control device settings')
  .addCommand(deviceCommand);

// Error handling
program.showHelpAfterError();
program.showSuggestionAfterError();

program.configureOutput({
  writeOut: (str) => process.stdout.write(`${str}\n`),
  writeErr: (str) => process.stdout.write(`${pc.red(str)}\n`),
  outputError: (str, write) => write(pc.red(str)),
});

// Parse and execute
await program.parseAsync();
