import { RGB, Point } from './types';

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

export const clampColor = (rgb: RGB): RGB => {
  return [clamp(rgb[0], 0, 255), clamp(rgb[1], 0, 255), clamp(rgb[2], 0, 255)];
};

export const rgbToHex = (rgb: RGB): string => {
  const [r, g, b] = clampColor(rgb);
  return `#${[r, g, b]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
};

export const minSteps = (start: Point, end: Point): number => {
  const [x1, y1] = start;
  const [x2, y2] = end;
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const lerpLocation = (start: Point, end: Point, t: number): Point => {
  const [x1, y1] = start;
  const [x2, y2] = end;
  return [lerp(x1, x2, t), lerp(y1, y2, t)];
};

export const roundLocation = (point: Point): Point => {
  const [x, y] = point;
  return [Math.round(x), Math.round(y)];
};

export const isValidIpAddress = (ip: string): boolean => {
  const pattern =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return pattern.test(ip);
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
