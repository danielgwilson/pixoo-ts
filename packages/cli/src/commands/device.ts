import { Command } from 'commander';
import { z } from 'zod';
import { getPixoo } from '../utils/device.js';
import { handleError } from '../utils/error.js';

const brightnessCommand = new Command('brightness')
  .description('Set the display brightness')
  .requiredOption('-l, --level <number>', 'Brightness level (0-100)')
  .action(async (options) => {
    try {
      const pixoo = await getPixoo();
      const level = z.number().min(0).max(100).parse(Number(options.level));
      await pixoo.setBrightness(level);
    } catch (error) {
      handleError(error);
    }
  });

const screenCommand = new Command('screen')
  .description('Control screen power')
  .requiredOption('-s, --state <state>', 'Screen state (on/off)')
  .action(async (options) => {
    try {
      const pixoo = await getPixoo();
      const state = z.enum(['on', 'off']).parse(options.state.toLowerCase());
      await pixoo.setScreen(state === 'on');
    } catch (error) {
      handleError(error);
    }
  });

export const deviceCommand = new Command('device')
  .description('Device control commands')
  .addCommand(brightnessCommand)
  .addCommand(screenCommand);
