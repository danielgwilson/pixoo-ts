/// <reference types="react" />
/// <reference types="next" />

declare module '@pixoo-ts/core' {
  export interface PixooOptions {
    ipAddress: string | null;
    size?: 16 | 32 | 64;
    debug?: boolean;
    refreshConnectionAutomatically?: boolean;
    refreshCounterLimit?: number;
  }

  export type PixooSize = 16 | 32 | 64;

  export class Pixoo {
    constructor(options: PixooOptions);
    clear(rgb?: [number, number, number]): void;
    drawPixel(x: number, y: number, rgb: [number, number, number]): void;
    drawLine(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      rgb: [number, number, number]
    ): void;
    push(): Promise<void>;
    setBrightness(brightness: number): Promise<void>;
    setScreen(on: boolean): Promise<void>;
    get displaySize(): PixooSize;
    get bufferState(): number[];
  }
}
