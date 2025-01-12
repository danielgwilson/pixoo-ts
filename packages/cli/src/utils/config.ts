import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const configSchema = z.object({
  ipAddress: z.union([z.string().ip(), z.literal('null')]),
  size: z.number().min(16).max(64).optional(),
  debug: z.boolean().optional(),
});

export type Config = z.infer<typeof configSchema>;

const CONFIG_FILE = '.pixoo-config.json';
const CONFIG_PATH = path.join(os.homedir(), CONFIG_FILE);

export const getConfig = async (): Promise<Config> => {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return configSchema.parse(JSON.parse(data));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        'No configuration found. Run `pixoo config init` to create one.'
      );
    }
    console.error('Error reading config:', error);
    throw error;
  }
};

export const saveConfig = async (config: Config): Promise<void> => {
  try {
    console.log('Saving config:', config);
    const validConfig = configSchema.parse(config);
    console.log('Validated config:', validConfig);
    await fs.writeFile(CONFIG_PATH, JSON.stringify(validConfig, null, 2));
    console.log('Config saved to:', CONFIG_PATH);
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
};
