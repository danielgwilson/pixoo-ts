import { Command } from 'commander';
import { z } from 'zod';
import inquirer from 'inquirer';
import { getConfig, saveConfig } from '../utils/config.js';
import { handleError } from '../utils/error.js';

const setCommand = new Command('set')
  .description('Set configuration values')
  .option(
    '-i, --ip <address>',
    'IP address of the Pixoo device (or "null" for simulation)'
  )
  .option('-s, --size <size>', 'Display size (64)')
  .option('-d, --debug', 'Enable debug mode')
  .action(async (options) => {
    try {
      const config = await getConfig();

      if (options.ip) {
        config.ipAddress =
          options.ip === 'null' ? 'null' : z.string().ip().parse(options.ip);
      }

      if (options.size) {
        config.size = z.number().min(16).max(64).parse(Number(options.size));
      }

      if (options.debug !== undefined) {
        config.debug = options.debug;
      }

      await saveConfig(config);
    } catch (error) {
      handleError(error);
    }
  });

const getCommand = new Command('get')
  .description('Get current configuration')
  .action(async () => {
    try {
      const config = await getConfig();
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      handleError(error);
    }
  });

const initCommand = new Command('init')
  .description('Initialize configuration interactively')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'ipAddress',
          message:
            'Enter the IP address of your Pixoo device (or "null" for simulation):',
          validate: (input) => {
            if (input === 'null') return true;
            try {
              z.string().ip().parse(input);
              return true;
            } catch {
              return 'Please enter a valid IP address or "null" for simulation';
            }
          },
        },
        {
          type: 'list',
          name: 'size',
          message: 'Select the display size:',
          choices: [{ name: '64x64', value: 64 }],
        },
        {
          type: 'confirm',
          name: 'debug',
          message: 'Enable debug mode?',
          default: false,
        },
      ]);

      await saveConfig(answers);
    } catch (error) {
      handleError(error);
    }
  });

export const configCommand = new Command('config')
  .description('Configuration commands')
  .addCommand(setCommand)
  .addCommand(getCommand)
  .addCommand(initCommand);
