/* src/terrain.ts */
import { TerrainType, Cell, Position, CONFIG, RGB } from './types';

/**
 * ------------------------------------------------------------------------
 *  1) PERLIN NOISE IMPLEMENTATION
 * ------------------------------------------------------------------------
 * Minimal inline 2D Perlin noise code, adapted from classic examples.
 * In a real project, you'd use a robust library, but here's a no-dependency approach.
 */
const PERLIN_SIZE = 256;
const permutation = new Uint8Array(PERLIN_SIZE * 2);
const gradX = new Float32Array(PERLIN_SIZE * 2);
const gradY = new Float32Array(PERLIN_SIZE * 2);

// Initialize pseudo-random permutations and gradient vectors
function initPerlin(seed = 1337): void {
  // Simple LCG
  let randomVal = seed;
  function rand(): number {
    randomVal = (randomVal * 16807) % 2147483647;
    return randomVal / 2147483647;
  }

  // Fill permutation with identity [0..255], then shuffle
  const p = new Uint8Array(PERLIN_SIZE);
  for (let i = 0; i < PERLIN_SIZE; i++) {
    p[i] = i;
  }
  for (let i = PERLIN_SIZE - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }

  // Duplicate
  for (let i = 0; i < PERLIN_SIZE; i++) {
    permutation[i] = p[i];
    permutation[i + PERLIN_SIZE] = p[i];
  }

  // Create random gradient directions
  for (let i = 0; i < PERLIN_SIZE; i++) {
    const angle = rand() * 2 * Math.PI;
    gradX[i] = Math.cos(angle);
    gradY[i] = Math.sin(angle);
    gradX[i + PERLIN_SIZE] = gradX[i];
    gradY[i + PERLIN_SIZE] = gradY[i];
  }
}

function fade(t: number): number {
  // 6t^5 - 15t^4 + 10t^3
  return t * t * t * (t * (6 * t - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

// Dot product with gradient
function gradDot(ix: number, iy: number, x: number, y: number): number {
  const idx = permutation[ix + permutation[iy]];
  const gx = gradX[idx];
  const gy = gradY[idx];
  return gx * (x - ix) + gy * (y - iy);
}

// 2D Perlin noise
function perlin(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const topRight = gradDot(X + 1, Y + 1, x, y);
  const topLeft = gradDot(X, Y + 1, x, y);
  const bottomRight = gradDot(X + 1, Y, x, y);
  const bottomLeft = gradDot(X, Y, x, y);

  const u = fade(xf);
  const v = fade(yf);

  const top = lerp(topLeft, topRight, u);
  const bottom = lerp(bottomLeft, bottomRight, u);
  return lerp(bottom, top, v);
}

/**
 * ------------------------------------------------------------------------
 *  2) FRACTAL BROWNIAN MOTION (fBM)
 * ------------------------------------------------------------------------
 * We'll combine multiple octaves of Perlin to get a richer result.
 */
function fractalNoise2D(
  x: number,
  y: number,
  octaves: number,
  lacunarity: number,
  gain: number
): number {
  let freq = 1;
  let amp = 1;
  let sum = 0;
  let totalAmp = 0;

  for (let i = 0; i < octaves; i++) {
    sum += perlin(x * freq, y * freq) * amp;
    totalAmp += amp;
    freq *= lacunarity;
    amp *= gain;
  }
  return sum / totalAmp; // Normalize to 0..1-ish range
}

/**
 * ------------------------------------------------------------------------
 *  3) CONTINENT MASK
 * ------------------------------------------------------------------------
 * We apply a radial fade near edges so we get large continents in the center
 * and ocean near the edges. This is optional but helps produce more cohesive land.
 */
type ContinentType =
  | 'island'
  | 'peninsula'
  | 'inland'
  | 'archipelago'
  | 'coastal';

function continentMask(x: number, y: number, size: number): number {
  const half = size / 2;

  // Create an offset center for asymmetry
  const centerX = half + size * 0.2; // Shift center right
  const centerY = half - size * 0.15; // Shift center up

  // Calculate distorted distance
  let dx = x - centerX;
  let dy = y - centerY;

  // Add large-scale distortion
  const distortScale = 0.02;
  const distortionX =
    fractalNoise2D(x * distortScale, y * distortScale, 3, 2.0, 0.5) *
    size *
    0.3;
  const distortionY =
    fractalNoise2D(y * distortScale, x * distortScale, 3, 2.0, 0.5) *
    size *
    0.3;

  dx += distortionX;
  dy += distortionY;

  // Asymmetric distance calculation
  const dist = Math.sqrt(dx * dx * 1.2 + dy * dy * 0.8); // Stretch horizontally

  // Randomly select a continent type (or pass it in as a parameter)
  const continentType: ContinentType = 'peninsula'; // For testing, we can make this configurable

  let mask = 0;

  switch (continentType) {
    case 'island' as ContinentType:
      return islandMask(x, y, size);
    case 'peninsula' as ContinentType:
      return peninsulaMask(x, y, size);
    case 'inland' as ContinentType:
      return inlandMask(x, y, size);
    case 'archipelago' as ContinentType:
      return archipelagoMask(x, y, size);
    case 'coastal' as ContinentType:
      return coastalMask(x, y, size);
    default:
      return islandMask(x, y, size);
  }
}

function islandMask(x: number, y: number, size: number): number {
  const half = size / 2;
  const dx = x - half;
  const dy = y - half;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = size * 0.3; // Smaller radius for island

  let mask = 1.0 - dist / maxDist;
  if (mask < 0) mask = 0;

  // Add some noise to the edges
  const noiseScale = 0.02;
  const noise =
    fractalNoise2D(x * noiseScale, y * noiseScale, 3, 2.0, 0.5) * 0.3;

  return Math.pow(Math.max(0, Math.min(1, mask + noise)), 0.7);
}

function peninsulaMask(x: number, y: number, size: number): number {
  const half = size / 2;

  // Create a curved peninsula
  const dx = x - half * 1.7; // Push origin point further right
  const dy = y - half + Math.sin(x * 0.05) * size * 0.2; // Add sine wave curve
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = size * 0.5;

  let mask = 1.0 - dist / maxDist;
  if (mask < 0) mask = 0;

  // Stronger directional bias
  const peninsulaBias = Math.max(0, (x / size) * 1.2); // Increased bias
  mask = mask * peninsulaBias;

  // Add more irregular coastline
  const noiseScale = 0.03;
  const noise =
    fractalNoise2D(x * noiseScale, y * noiseScale, 3, 2.0, 0.5) * 0.4;

  return Math.pow(Math.max(0, Math.min(1, mask + noise)), 0.8);
}

function inlandMask(x: number, y: number, size: number): number {
  // Creates a large landmass with some ocean at the edges
  const edgeDistance =
    Math.min(Math.min(x, size - x), Math.min(y, size - y)) / size;

  let mask = Math.min(1, edgeDistance * 4);

  const noiseScale = 0.02;
  const noise =
    fractalNoise2D(x * noiseScale, y * noiseScale, 3, 2.0, 0.5) * 0.3;

  return Math.pow(Math.max(0, Math.min(1, mask + noise)), 0.7);
}

function archipelagoMask(x: number, y: number, size: number): number {
  // Create multiple island centers
  const centers = [
    [size * 0.3, size * 0.3],
    [size * 0.7, size * 0.4],
    [size * 0.5, size * 0.6],
    [size * 0.2, size * 0.7],
    [size * 0.8, size * 0.7],
  ];

  let maxValue = 0;
  for (const [cx, cy] of centers) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const localMask = Math.max(0, 1 - dist / (size * 0.15));
    maxValue = Math.max(maxValue, localMask);
  }

  const noiseScale = 0.02;
  const noise =
    fractalNoise2D(x * noiseScale, y * noiseScale, 3, 2.0, 0.5) * 0.3;

  return Math.pow(Math.max(0, Math.min(1, maxValue + noise)), 0.7);
}

function coastalMask(x: number, y: number, size: number): number {
  // Creates a landmass that's mostly on one side
  const normalizedX = x / size;
  const bias = Math.max(0, 1 - normalizedX * 2); // More land on the left

  const noiseScale = 0.02;
  const noise =
    fractalNoise2D(x * noiseScale, y * noiseScale, 3, 2.0, 0.5) * 0.3;

  return Math.pow(Math.max(0, Math.min(1, bias + noise)), 0.7);
}

/**
 * ------------------------------------------------------------------------
 *  4) GENERATE MAIN HEIGHTMAP
 * ------------------------------------------------------------------------
 */
function getHeightValue(x: number, y: number, size: number): number {
  // Increase base variation
  const scale = 0.012; // More variation in base terrain
  const octaves = 6;

  // Generate more dramatic base terrain
  let val = fractalNoise2D(x * scale, y * scale, octaves, 2.4, 0.5);
  // Add medium details
  val += 0.6 * fractalNoise2D(x * scale * 4, y * scale * 4, 4, 2.2, 0.5);
  // Add fine details
  val += 0.2 * fractalNoise2D(x * scale * 12, y * scale * 12, 2, 2.0, 0.5);

  // Normalize and add contrast
  val = (val + 1.5) / 3;
  val = Math.pow(val, 1.3); // More dramatic hills/valleys

  const cMask = Math.pow(continentMask(x, y, size), 0.6);
  // Less mask influence for more terrain variation
  val = val * 0.65 + cMask * 0.35;

  return val;
}

/**
 * ------------------------------------------------------------------------
 *  5) TEMPERATURE & MOISTURE
 * ------------------------------------------------------------------------
 * We do similar fractal noise for each. Then combine these with height
 * to figure out final biome.
 */
function getTemperatureValue(x: number, y: number, size: number): number {
  // Create more varied temperature bands
  const scale = 0.014;
  const t = fractalNoise2D(x * scale, y * scale, 4, 2.2, 0.5);
  const detail =
    0.3 * fractalNoise2D(x * scale * 3, y * scale * 3, 2, 2.0, 0.5);
  const normalized = (t + detail + 1) / 2;

  const heightVal = getHeightValue(x, y, size);
  const altitudeInfluence = 0.3 * heightVal;
  return Math.max(0, Math.pow(normalized - altitudeInfluence, 1.2));
}

function getMoistureValue(x: number, y: number, size: number): number {
  // Create larger moisture regions
  const scale = 0.015;
  const w = fractalNoise2D(x * scale, y * scale, 4, 2.2, 0.5);
  // Add some smaller moisture variation
  const detail =
    0.3 * fractalNoise2D(x * scale * 4, y * scale * 4, 2, 2.0, 0.5);
  return Math.pow((w + detail + 1) / 2, 1.1);
}

/**
 * ------------------------------------------------------------------------
 *  6) BIOME CLASSIFICATION
 * ------------------------------------------------------------------------
 * We'll define thresholds for "water", "beach", "desert", "grassland", "forest",
 * "taiga", "tundra", "mountain", "snowcap", etc.
 */
function assignBiome(
  height: number,
  temp: number,
  moisture: number
): TerrainType {
  // Make water threshold match river depth
  if (height < 0.3) return TerrainType.Water;

  // Rest of biome assignment remains the same
  if (height > 0.88) return TerrainType.Mountain;

  if (temp < 0.25) {
    if (moisture > 0.5) return TerrainType.Taiga;
    return TerrainType.Tundra;
  }

  if (temp > 0.65) {
    if (moisture < 0.2) return TerrainType.Desert;
    if (moisture > 0.5) return TerrainType.Forest;
    return TerrainType.Plains;
  }

  if (moisture > 0.6) return TerrainType.Forest;
  if (moisture > 0.3) return TerrainType.Plains;
  return TerrainType.Desert;
}

/**
 * ------------------------------------------------------------------------
 *  7) OPTIONAL RIVER CARVING
 * ------------------------------------------------------------------------
 * Simple approach: We'll pick a few random "spring" points in high altitudes
 * and then move downhill. Each step, we reduce the height slightly to carve a valley.
 */
function carveRivers(
  mapHeights: number[][],
  size: number,
  numRivers = 6
): void {
  // First, create some main river channels
  for (let r = 0; r < numRivers; r++) {
    // Start from higher elevations
    let x, y;
    let attempts = 0;
    do {
      x = Math.floor(Math.random() * size);
      y = Math.floor(Math.random() * size);
      attempts++;
    } while (mapHeights[x][y] < 0.7 && attempts < 100); // Higher starting points

    const riverPoints: Array<[number, number]> = [];

    for (let steps = 0; steps < 300; steps++) {
      // Store river points for later widening
      riverPoints.push([x, y]);

      // Carve initial channel
      mapHeights[x][y] = 0.25; // Water level

      // Find next point with some randomness
      let lowestHeight = 1.0;
      let nx: number = x;
      let ny: number = y;

      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          if (dx === 0 && dy === 0) continue;
          const xx = (x + dx + size) % size;
          const yy = (y + dy + size) % size;
          // Add randomness to path finding
          const height = mapHeights[xx][yy] - Math.random() * 0.1;
          if (height < lowestHeight) {
            lowestHeight = height;
            nx = xx;
            ny = yy;
          }
        }
      }

      if (mapHeights[nx][ny] < 0.3) break; // Hit water
      if (nx === x && ny === y) break; // Stuck

      x = nx;
      y = ny;
    }

    // Widen the river after carving the main channel
    for (const [rx, ry] of riverPoints) {
      // Wider river at lower elevations
      const baseWidth = Math.floor(Math.random() * 2) + 2;

      for (let dx = -baseWidth; dx <= baseWidth; dx++) {
        for (let dy = -baseWidth; dy <= baseWidth; dy++) {
          const xx = (rx + dx + size) % size;
          const yy = (ry + dy + size) % size;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= baseWidth) {
            // Main channel
            mapHeights[xx][yy] = 0.25;
          } else if (dist <= baseWidth + 1) {
            // Banks
            mapHeights[xx][yy] = Math.min(mapHeights[xx][yy], 0.31);
          }
        }
      }
    }
  }

  // Add some tributaries
  for (let t = 0; t < numRivers * 2; t++) {
    let x = Math.floor(Math.random() * size);
    let y = Math.floor(Math.random() * size);

    for (let steps = 0; steps < 100; steps++) {
      mapHeights[x][y] = 0.25;

      // Find nearest river or water
      let found = false;
      for (let radius = 1; radius < 5 && !found; radius++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          for (let dy = -radius; dy <= radius && !found; dy++) {
            const xx = (x + dx + size) % size;
            const yy = (y + dy + size) % size;
            if (mapHeights[xx][yy] <= 0.3) {
              found = true;
              break;
            }
          }
        }
      }

      if (found) break;

      // Move downhill
      let nx = x,
        ny = y;
      let lowestHeight = mapHeights[x][y];

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const xx = (x + dx + size) % size;
          const yy = (y + dy + size) % size;
          if (mapHeights[xx][yy] < lowestHeight) {
            lowestHeight = mapHeights[xx][yy];
            nx = xx;
            ny = yy;
          }
        }
      }

      if (nx === x && ny === y) break;
      x = nx;
      y = ny;
    }
  }
}

/**
 * ------------------------------------------------------------------------
 *  8) EROSION-INSPIRED POST-PROCESS
 * ------------------------------------------------------------------------
 * We'll do a quick smoothing pass to reduce super-sharp transitions.
 */
function smoothHeights(
  mapHeights: number[][],
  size: number,
  iterations = 1
): void {
  for (let iter = 0; iter < iterations; iter++) {
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        let sum = 0;
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const xx = (x + dx + size) % size;
            const yy = (y + dy + size) % size;
            sum += mapHeights[xx][yy];
            count++;
          }
        }
        mapHeights[x][y] = sum / count;
      }
    }
  }
}

/**
 * ------------------------------------------------------------------------
 *  9) TERRAIN COLORING
 * ------------------------------------------------------------------------
 * Adjust your color picks. We'll add a few new terrains: Taiga, Tundra, etc.
 */
export const getTerrainColor = (terrain: TerrainType): RGB => {
  switch (terrain) {
    case TerrainType.Water:
      return [48, 128, 255]; // Deep blue
    case TerrainType.Plains:
      return [126, 200, 80]; // Bright grass
    case TerrainType.Forest:
      return [38, 160, 49]; // Rich forest
    case TerrainType.Desert:
      return [255, 198, 91]; // Warm sand
    case TerrainType.Mountain:
      return [142, 129, 115]; // Warm stone
    case TerrainType.SnowCap:
      return [255, 255, 255]; // Snow
    case TerrainType.ResourceNode:
      return [255, 215, 0]; // Gold
    case TerrainType.Taiga:
      return [56, 125, 52]; // Dark pine
    case TerrainType.Tundra:
      return [134, 169, 83]; // More distinct olive green
    default:
      return [0, 0, 0];
  }
};

/**
 * ------------------------------------------------------------------------
 *  10) MAIN GENERATE FUNCTION
 * ------------------------------------------------------------------------
 */
export const generateTerrain = (): Cell[][] => {
  const size = CONFIG.GRID_SIZE;
  // Initialize Perlin with a default seed for reproducibility
  const seed = Math.floor(Math.random() * 10000);
  console.log(`Using seed: ${seed}`);
  initPerlin(seed);

  // Precompute arrays for height, temp, moisture
  const mapHeights: number[][] = new Array(size)
    .fill(null)
    .map(() => new Array(size).fill(0));
  const mapTemp: number[][] = new Array(size)
    .fill(null)
    .map(() => new Array(size).fill(0));
  const mapMoisture: number[][] = new Array(size)
    .fill(null)
    .map(() => new Array(size).fill(0));

  // Generate core data
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      mapHeights[x][y] = getHeightValue(x, y, size);
    }
  }

  // Carve rivers before smoothing
  carveRivers(mapHeights, size, 12); // More rivers
  smoothHeights(mapHeights, size, 1);

  // Then temp + moisture
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      mapTemp[x][y] = getTemperatureValue(x, y, size);
      mapMoisture[x][y] = getMoistureValue(x, y, size);
    }
  }

  // Now produce final terrain
  const grid: Cell[][] = new Array(size).fill(null).map(() => new Array(size));
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const heightVal = mapHeights[x][y];
      const tempVal = mapTemp[x][y];
      const moistVal = mapMoisture[x][y];

      let terrainType = assignBiome(heightVal, tempVal, moistVal);

      // Add resources based on terrain type
      let resourceAmount = 0;
      if (terrainType === TerrainType.Plains) {
        // Plains have good chance for food resources
        resourceAmount =
          Math.random() < 0.4 ? Math.floor(Math.random() * 30) + 20 : 0;
      } else if (terrainType === TerrainType.Forest) {
        // Forests have high chance for food resources
        resourceAmount =
          Math.random() < 0.6 ? Math.floor(Math.random() * 40) + 25 : 0;
      } else if (terrainType === TerrainType.Taiga) {
        // Taiga has moderate chance for food
        resourceAmount =
          Math.random() < 0.3 ? Math.floor(Math.random() * 25) + 15 : 0;
      }

      grid[x][y] = {
        terrain: terrainType,
        person: null,
        resourceAmount,
        structure: null,
      };
    }
  }

  return grid;
};

/**
 * We'll place resources in forest, taiga, or mountainous areas more frequently,
 * smaller chance in plains, desert, tundra, etc.
 */
function placeResources(grid: Cell[][]): void {
  const size = CONFIG.GRID_SIZE;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const cell = grid[x][y];
      if (
        cell.terrain === TerrainType.Forest ||
        cell.terrain === TerrainType.Mountain ||
        cell.terrain === TerrainType.Taiga
      ) {
        if (Math.random() < 0.08) {
          // 8% chance
          cell.terrain = TerrainType.ResourceNode;
          cell.resourceAmount = Math.floor(Math.random() * 50) + 50;
        }
      } else if (
        cell.terrain === TerrainType.Plains ||
        cell.terrain === TerrainType.Tundra
      ) {
        if (Math.random() < 0.03) {
          // 3% chance
          cell.terrain = TerrainType.ResourceNode;
          cell.resourceAmount = Math.floor(Math.random() * 50) + 50;
        }
      } else if (cell.terrain === TerrainType.Desert) {
        if (Math.random() < 0.01) {
          cell.terrain = TerrainType.ResourceNode;
          cell.resourceAmount = Math.floor(Math.random() * 50) + 50;
        }
      }
    }
  }
}

export const isWalkable = (terrain: TerrainType): boolean => {
  return (
    terrain !== TerrainType.Water &&
    terrain !== TerrainType.SnowCap &&
    terrain !== TerrainType.Mountain
  );
};

export const findSpawnLocation = (
  grid: Cell[][],
  center: Position,
  radius: number
): Position | null => {
  const candidates: Array<{ pos: Position; score: number }> = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const x = (center.x + dx + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
      const y = (center.y + dy + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
      if (!isWalkable(grid[x][y].terrain)) continue;

      // Score the location
      let score = 0;
      let hasResources = false;

      // Local 3x3 check
      for (let nx = -1; nx <= 1; nx++) {
        for (let ny = -1; ny <= 1; ny++) {
          const xx = (x + nx + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
          const yy = (y + ny + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
          const t = grid[xx][yy].terrain;
          if (t === TerrainType.ResourceNode) hasResources = true;
          if (
            t === TerrainType.Plains ||
            t === TerrainType.Forest ||
            t === TerrainType.Taiga
          )
            score += 2;
        }
      }

      if (hasResources) score += 3;
      if (score > 0) {
        candidates.push({ pos: { x, y }, score });
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  // pick from top 3
  const index = Math.floor(Math.random() * Math.min(3, candidates.length));
  return candidates[index].pos;
};
