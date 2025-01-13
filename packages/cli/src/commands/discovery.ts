import { Command } from 'commander';
import pc from 'picocolors';
import { PixooDiscovery, type DiscoveryEvents } from '@pixoo-ts/core';
import { saveConfig } from '../utils/config.js';

export const discoveryCommand = new Command('discover')
  .description('Find Pixoo devices on your network')
  .option(
    '-s, --subnet <subnet>',
    'Specific subnet to scan (e.g., "192.168.1")'
  )
  .option('-t, --timeout <ms>', 'Timeout per device check in ms', '1000')
  .option('-c, --concurrency <number>', 'Max concurrent checks', '10')
  .option('--save', 'Save found device IP to config')
  .option('--debug', 'Show debug logs')
  .action(async (options) => {
    try {
      console.log(pc.blue('🔍 Starting Pixoo discovery...'));

      const discovery = new PixooDiscovery({
        subnet: options.subnet,
        timeout: parseInt(options.timeout),
        concurrency: parseInt(options.concurrency),
        debug: options.debug,
        findFirst: true,
      });

      // Set up event handlers for nice feedback
      discovery.on('subnet:start', (subnet: string) =>
        console.log(pc.dim(`📡 Scanning: ${subnet}.*`))
      );

      discovery.on('device:found', (ip: string) =>
        console.log(pc.green(`🎯 Found Pixoo: ${ip}`))
      );

      discovery.on('error', (error: Error) =>
        console.error(pc.red('Error during scan:'), error.message)
      );

      const device = await discovery.findDevice();

      if (device) {
        console.log(pc.green(`\n✅ Successfully found Pixoo at: ${device}`));

        if (options.save) {
          await saveConfig({ ipAddress: device });
          console.log(pc.green('💾 Saved device IP to config'));
        } else {
          console.log(
            pc.dim('\nTip: Run with --save to save this IP to your config')
          );
        }
      } else {
        console.log(
          pc.yellow(
            '\n❌ No Pixoo devices found. Make sure your Pixoo is powered on and connected to your network.'
          )
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        pc.red('Error:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });
