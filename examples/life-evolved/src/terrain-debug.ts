import { createCanvas } from 'canvas';
import fs from 'fs';
import { Cell, TerrainType } from './types';
import { generateTerrain, getTerrainColor } from './terrain';

export const saveTerrainImage = (filename: string) => {
  const terrain = generateTerrain();
  const size = terrain.length;

  // Create canvas
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw terrain
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const cell = terrain[x][y];
      const [r, g, b] = getTerrainColor(cell.terrain);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Saved terrain image to ${filename}`);
};

// Usage example
saveTerrainImage('terrain.png');
