import { Command } from 'commander';
import { z } from 'zod';
import { Pixoo } from '@pixoo-ts/core';
import { getPixoo } from '../utils/device.js';
import { parseColor } from '../utils/color.js';
import { handleError } from '../utils/error.js';

const pixelCommand = new Command('pixel')
  .description('Draw a single pixel')
  .requiredOption('-x <number>', 'X coordinate (0-63)')
  .requiredOption('-y <number>', 'Y coordinate (0-63)')
  .option(
    '-c, --color <color>',
    'Color in hex format (default: #FFFFFF)',
    '#FFFFFF'
  )
  .action(async (options) => {
    try {
      const pixoo = await getPixoo();
      const color = parseColor(options.color);
      const x = z.number().min(0).max(63).parse(Number(options.x));
      const y = z.number().min(0).max(63).parse(Number(options.y));

      pixoo.drawPixel(x, y, color);
      await pixoo.push();
    } catch (error) {
      handleError(error);
    }
  });

const lineCommand = new Command('line')
  .description('Draw a line between two points')
  .requiredOption('-x1 <number>', 'Starting X coordinate (0-63)')
  .requiredOption('-y1 <number>', 'Starting Y coordinate (0-63)')
  .requiredOption('-x2 <number>', 'Ending X coordinate (0-63)')
  .requiredOption('-y2 <number>', 'Ending Y coordinate (0-63)')
  .option(
    '-c, --color <color>',
    'Color in hex format (default: #FFFFFF)',
    '#FFFFFF'
  )
  .action(async (options) => {
    try {
      const pixoo = await getPixoo();
      const color = parseColor(options.color);
      const x1 = z.number().min(0).max(63).parse(Number(options.x1));
      const y1 = z.number().min(0).max(63).parse(Number(options.y1));
      const x2 = z.number().min(0).max(63).parse(Number(options.x2));
      const y2 = z.number().min(0).max(63).parse(Number(options.y2));

      pixoo.drawLine(x1, y1, x2, y2, color);
      await pixoo.push();
    } catch (error) {
      handleError(error);
    }
  });

const patternCommand = new Command('pattern')
  .description('Draw a test pattern')
  .action(async () => {
    try {
      const pixoo = await getPixoo();
      for (let x = 0; x < 64; x++) {
        for (let y = 0; y < 64; y++) {
          if ((x + y) % 2 === 0) {
            pixoo.drawPixel(x, y, [255, 0, 0]);
          }
        }
      }
      await pixoo.push();
    } catch (error) {
      handleError(error);
    }
  });

const clearCommand = new Command('clear')
  .description('Clear the display')
  .option(
    '-c, --color <color>',
    'Color in hex format (default: #000000)',
    '#000000'
  )
  .action(async (options) => {
    try {
      const pixoo = await getPixoo();
      const color = parseColor(options.color);
      pixoo.clear(color);
      await pixoo.push();
    } catch (error) {
      handleError(error);
    }
  });

export const drawCommand = new Command('draw')
  .description('Draw commands')
  .addCommand(pixelCommand)
  .addCommand(lineCommand)
  .addCommand(patternCommand)
  .addCommand(clearCommand);
