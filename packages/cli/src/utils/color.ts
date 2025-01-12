import { z } from 'zod';
import type { RGB } from '@pixoo-ts/core';

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format. Use #RRGGBB format.');

export const parseColor = (hex: string): RGB => {
  const color = hexColorSchema.parse(hex);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return [r, g, b];
};
