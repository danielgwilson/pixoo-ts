import { Pixoo } from '@pixoo-ts/core';
import { getConfig } from './config.js';

let pixooInstance: Pixoo | null = null;

export const getPixoo = async (): Promise<Pixoo> => {
  if (!pixooInstance) {
    const config = await getConfig();
    pixooInstance = new Pixoo({
      ipAddress: config.ipAddress === 'null' ? null : config.ipAddress,
      size: config.size ?? 64,
      debug: config.debug ?? false,
    });
  }
  return pixooInstance;
};
