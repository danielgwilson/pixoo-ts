import axios from 'axios';
import {
  PixooOptions,
  PixooSize,
  RGB,
  PixooPayload,
  PixooResponse,
} from './types';
import {
  clampColor,
  minSteps,
  lerpLocation,
  roundLocation,
  clamp,
  isValidIpAddress,
} from './utils';

const DEFAULT_OPTIONS: Required<Omit<PixooOptions, 'ipAddress'>> = {
  size: 64,
  debug: false,
  refreshConnectionAutomatically: true,
  refreshCounterLimit: 32,
};

export class Pixoo {
  private readonly ipAddress: string | null;
  private readonly size: PixooSize;
  private readonly debug: boolean;
  private readonly refreshConnectionAutomatically: boolean;
  private readonly refreshCounterLimit: number;
  private readonly baseURL: string;
  private readonly buffer: number[];
  private readonly pixelCount: number;
  private counter: number = 1;
  private readonly isSimulation: boolean;

  constructor(options: PixooOptions) {
    const { ipAddress, ...rest } = options;
    const config = { ...DEFAULT_OPTIONS, ...rest };

    this.ipAddress = ipAddress;
    this.size = config.size;
    this.debug = config.debug;
    this.refreshConnectionAutomatically = config.refreshConnectionAutomatically;
    this.refreshCounterLimit = config.refreshCounterLimit;
    this.isSimulation = ipAddress === null;

    if (ipAddress && !isValidIpAddress(ipAddress)) {
      throw new Error(`Invalid IP address: ${ipAddress}`);
    }

    this.baseURL = `http://${ipAddress ?? '0.0.0.0'}/post`;
    this.pixelCount = this.size * this.size;
    this.buffer = new Array(this.pixelCount * 3).fill(0);
  }

  /**
   * Get the current display size (16, 32, or 64)
   */
  public get displaySize(): PixooSize {
    return this.size;
  }

  /**
   * Get a copy of the current buffer state.
   * Returns a new array to prevent external mutation.
   */
  public get bufferState(): number[] {
    return [...this.buffer];
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.debug) {
      console.log(`[Pixoo] ${message}`, ...args);
    }
  }

  private async sendCommand(
    payload: PixooPayload
  ): Promise<PixooResponse | undefined> {
    if (this.isSimulation) {
      // In simulation mode, just return a success response
      return { error_code: 0 };
    }

    try {
      const response = await axios.post<PixooResponse>(this.baseURL, payload);
      return response.data;
    } catch (error) {
      if (this.debug) {
        console.error('Error sending command:', error);
      }
      throw error;
    }
  }

  public clear(rgb: RGB = [0, 0, 0]): void {
    const [r, g, b] = clampColor(rgb);
    for (let i = 0; i < this.pixelCount; i++) {
      const offset = i * 3;
      this.buffer[offset] = r;
      this.buffer[offset + 1] = g;
      this.buffer[offset + 2] = b;
    }
  }

  public drawPixel(x: number, y: number, rgb: RGB): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      this.log(`drawPixel out of range: (${x}, ${y})`);
      return;
    }

    const [r, g, b] = clampColor(rgb);
    const index = x + y * this.size;
    const offset = index * 3;
    this.buffer[offset] = r;
    this.buffer[offset + 1] = g;
    this.buffer[offset + 2] = b;
  }

  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rgb: RGB
  ): void {
    const steps = minSteps([x1, y1], [x2, y2]);
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      const [lx, ly] = lerpLocation([x1, y1], [x2, y2], t);
      const [rx, ry] = roundLocation([lx, ly]);
      this.drawPixel(rx, ry, rgb);
    }
  }

  public async push(): Promise<void> {
    try {
      this.counter++;
      if (
        this.refreshConnectionAutomatically &&
        this.counter >= this.refreshCounterLimit
      ) {
        await this.resetCounter();
        this.counter = 1;
      }

      const base64Data = Buffer.from(this.buffer).toString('base64');
      const payload = {
        Command: 'Draw/SendHttpGif' as const,
        PicNum: 1,
        PicWidth: this.size,
        PicOffset: 0,
        PicID: this.counter,
        PicSpeed: 1000,
        PicData: base64Data,
      };

      await this.sendCommand(payload);
    } catch (error) {
      this.log('Error in push():', error);
      throw error;
    }
  }

  private async resetCounter(): Promise<void> {
    this.log('Resetting counter on device...');
    await this.sendCommand({
      Command: 'Draw/ResetHttpGifId',
    });
  }

  public async setBrightness(brightness: number): Promise<void> {
    const b = clamp(brightness, 0, 100);
    await this.sendCommand({
      Command: 'Channel/SetBrightness',
      Brightness: b,
    });
  }

  public async setScreen(on: boolean): Promise<void> {
    await this.sendCommand({
      Command: 'Channel/OnOffScreen',
      OnOff: on ? 1 : 0,
    });
  }
}
