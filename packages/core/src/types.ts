import { z } from 'zod';

export type RGB = [number, number, number];
export type Point = [number, number];

export const PixooSize = z.union([z.literal(16), z.literal(32), z.literal(64)]);

export type PixooSize = z.infer<typeof PixooSize>;

export interface PixooOptions {
  ipAddress: string | null;
  size?: PixooSize;
  debug?: boolean;
  refreshConnectionAutomatically?: boolean;
  refreshCounterLimit?: number;
}

export interface PixooResponse {
  error_code: number;
  error_message?: string;
}

export interface SendGifPayload {
  Command: 'Draw/SendHttpGif';
  PicNum: number;
  PicWidth: number;
  PicOffset: number;
  PicID: number;
  PicSpeed: number;
  PicData: string;
}

export interface SetBrightnessPayload {
  Command: 'Channel/SetBrightness';
  Brightness: number;
}

export interface SetScreenPayload {
  Command: 'Channel/OnOffScreen';
  OnOff: 0 | 1;
}

export interface ResetGifPayload {
  Command: 'Draw/ResetHttpGifId';
}

export type PixooPayload =
  | SendGifPayload
  | SetBrightnessPayload
  | SetScreenPayload
  | ResetGifPayload;
