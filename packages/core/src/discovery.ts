import { networkInterfaces } from 'os';
import axios from 'axios';
import { EventEmitter } from 'events';

interface NetworkDevice {
  ip: string;
  isPixoo: boolean;
}

export interface DiscoveryEvents {
  'device:found': (ip: string) => void;
  'subnet:start': (subnet: string) => void;
  'subnet:complete': (subnet: string) => void;
  'scan:complete': (devices: string[]) => void;
  error: (error: Error) => void;
}

export interface DiscoveryOptions {
  /** Specific subnet to scan (e.g., "192.168.1") */
  subnet?: string;
  /** Timeout in ms for each device check (default: 500) */
  timeout?: number;
  /** Maximum concurrent checks (default: 10) */
  concurrency?: number;
  /** Whether to stop after finding first device (default: false) */
  findFirst?: boolean;
  /** Whether to show debug logs (default: false) */
  debug?: boolean;
}

export class PixooDiscovery extends EventEmitter {
  private options: Required<DiscoveryOptions>;

  constructor(options: DiscoveryOptions = {}) {
    super();
    this.options = {
      subnet: options.subnet ?? '',
      timeout: options.timeout ?? 500,
      concurrency: options.concurrency ?? 10,
      findFirst: options.findFirst ?? false,
      debug: options.debug ?? false,
    };
  }

  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[PixooDiscovery] ${message}`);
    }
  }

  /**
   * Get all local IP addresses and their subnets in the network
   */
  private getLocalSubnets(): string[] {
    const interfaces = networkInterfaces();
    const subnets = new Set<string>();

    // Common home/office network subnets to try
    const commonSubnets = [
      '192.168.1',
      '192.168.0',
      '10.0.0',
      '10.0.1',
      '172.16.0',
      '172.17.0',
    ];

    // First add subnets from local interfaces
    for (const interfaceName in interfaces) {
      const interface_ = interfaces[interfaceName];
      if (!interface_) continue;

      for (const address of interface_) {
        if (address.family === 'IPv4' && !address.internal) {
          const subnet = this.getSubnet(address.address);
          subnets.add(subnet);
        }
      }
    }

    // Then add common subnets if they're not already included
    for (const subnet of commonSubnets) {
      subnets.add(subnet);
    }

    return Array.from(subnets);
  }

  /**
   * Get the subnet from an IP address (e.g., 192.168.1.xxx)
   */
  private getSubnet(ip: string): string {
    return ip.split('.').slice(0, 3).join('.');
  }

  /**
   * Check if a given IP is a Pixoo device
   */
  private async isPixooDevice(ip: string): Promise<boolean> {
    // Try the most reliable command first
    try {
      const response = await axios.post(
        `http://${ip}/post`,
        { Command: 'Channel/GetAllConf' },
        {
          timeout: this.options.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Check if it's specifically a Pixoo device by looking for typical response patterns
      if (response.data?.error_code === 0) {
        // Additional verification that it's a Pixoo
        if (
          response.data?.LightSwitch !== undefined ||
          response.data?.Brightness !== undefined
        ) {
          return true;
        }
      }
    } catch {
      // If the first attempt fails, try backup commands
      try {
        const response = await axios.post(
          `http://${ip}/post`,
          { Command: 'Channel/GetBrightness' },
          {
            timeout: this.options.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        return response.data?.error_code === 0;
      } catch {
        return false;
      }
    }

    return false;
  }

  private async scanSubnet(subnet: string): Promise<NetworkDevice[]> {
    const devices: NetworkDevice[] = [];
    const promises: Promise<void>[] = [];

    for (let i = 1; i < 255; i++) {
      const ip = `${subnet}.${i}`;
      promises.push(
        this.isPixooDevice(ip).then((isPixoo) => {
          if (isPixoo) {
            devices.push({ ip, isPixoo });
          }
        })
      );
    }

    await Promise.all(promises);
    return devices;
  }

  /**
   * Find Pixoo devices in the network
   */
  public async findDevices(): Promise<string[]> {
    const devices: Set<string> = new Set();
    const subnets = this.options.subnet
      ? [this.options.subnet]
      : this.getLocalSubnets();

    this.log(`Will scan the following subnets: ${subnets.join(', ')}`);

    for (const subnet of subnets) {
      this.emit('subnet:start', subnet);
      this.log(`Scanning subnet: ${subnet}.*`);

      const promises: Promise<void>[] = [];

      for (let i = 1; i < 255; i++) {
        const ip = `${subnet}.${i}`;

        const promise = this.isPixooDevice(ip)
          .then((isPixoo) => {
            if (isPixoo) {
              this.log(`Found Pixoo device at: ${ip}`);
              devices.add(ip);
              this.emit('device:found', ip);

              if (this.options.findFirst) {
                // Cancel other pending promises if we only need one device
                promises.forEach((p) => p.catch(() => {}));
                promises.length = 0;
              }
            }
          })
          .catch((error) => {
            this.emit('error', error);
          });

        promises.push(promise);

        if (promises.length >= this.options.concurrency) {
          await Promise.all(promises);
          promises.length = 0;
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      this.emit('subnet:complete', subnet);

      if (this.options.findFirst && devices.size > 0) {
        break;
      }
    }

    const foundDevices = Array.from(devices);
    this.emit('scan:complete', foundDevices);
    return foundDevices;
  }

  /**
   * Find a single Pixoo device in the network
   * Returns the first device found or null if none found
   */
  public async findDevice(): Promise<string | null> {
    const subnets = await this.getLocalSubnets();
    this.log(`Will scan the following subnets: ${subnets.join(', ')}`);

    for (const subnet of subnets) {
      this.log(`Scanning subnet: ${subnet}.*`);
      const devices = await this.scanSubnet(subnet);

      // Return first device found instead of continuing to scan
      if (devices.length > 0) {
        const ip = devices[0].ip;
        this.log(`Found Pixoo device at: ${ip}`);
        return ip;
      }
    }

    return null;
  }
}

// Convenience functions for simple usage
export async function findPixooDevices(
  options?: DiscoveryOptions
): Promise<string[]> {
  const discovery = new PixooDiscovery(options);
  return discovery.findDevices();
}

export async function findPixooDevice(
  options?: DiscoveryOptions
): Promise<string | null> {
  const discovery = new PixooDiscovery({ ...options, findFirst: true });
  return discovery.findDevice();
}
