'use server';

import { Pixoo } from '@pixoo-ts/core';

// Create a singleton instance
const pixoo = new Pixoo({ ipAddress: null });

export async function clearDisplay(rgb: [number, number, number] = [0, 0, 0]) {
  pixoo.clear(rgb);
  await pixoo.push();
  return pixoo.bufferState;
}

export async function drawPixel(
  x: number,
  y: number,
  rgb: [number, number, number]
) {
  pixoo.drawPixel(x, y, rgb);
  await pixoo.push();
  return pixoo.bufferState;
}

export async function drawLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rgb: [number, number, number]
) {
  pixoo.drawLine(x1, y1, x2, y2, rgb);
  await pixoo.push();
  return pixoo.bufferState;
}

export async function drawText(
  text: string,
  x: number,
  y: number,
  rgb: [number, number, number]
) {
  // TODO: Implement text drawing
  await pixoo.push();
  return pixoo.bufferState;
}

export async function drawPattern() {
  // Draw a simple pattern
  for (let x = 0; x < pixoo.displaySize; x++) {
    for (let y = 0; y < pixoo.displaySize; y++) {
      if ((x + y) % 2 === 0) {
        pixoo.drawPixel(x, y, [255, 0, 0]);
      }
    }
  }
  await pixoo.push();
  return pixoo.bufferState;
}
