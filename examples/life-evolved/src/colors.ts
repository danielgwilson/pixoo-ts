/* src/colors.ts */
import { RGB } from './types';

// Constants for color management
const BASE_SATURATION = 1.0; // Full saturation
const MIN_BRIGHTNESS = 0.3; // Starting brightness for new cells
const BRIGHTNESS_STEP = 0.05; // Brightness increase per generation
const MAX_BRIGHTNESS = 0.9; // Maximum brightness

export const incrementBrightness = (current: number): number => {
  return Math.min(MAX_BRIGHTNESS, current + BRIGHTNESS_STEP);
};

export const getInitialBrightness = (): number => MIN_BRIGHTNESS;

// Convert HSL to RGB (all values 0-1)
export const hslToRgb = (h: number, s: number, l: number): RGB => {
  const hue = h / 360; // Convert 0-360 to 0-1

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (hue < 1 / 6) {
    [r, g, b] = [c, x, 0];
  } else if (hue < 2 / 6) {
    [r, g, b] = [x, c, 0];
  } else if (hue < 3 / 6) {
    [r, g, b] = [0, c, x];
  } else if (hue < 4 / 6) {
    [r, g, b] = [0, x, c];
  } else if (hue < 5 / 6) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};

export const getCellColor = (hue: number, brightness: number): RGB => {
  return hslToRgb(hue, BASE_SATURATION, brightness);
};
