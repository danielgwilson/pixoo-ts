/* src/tribe.ts */
import {
  Tribe,
  Person,
  PersonRole,
  ResourceType,
  Position,
  Cell,
  TerrainType,
  CONFIG,
  RGB,
} from './types';
import { findSpawnLocation } from './terrain';

export const createTribe = (id: number, baseHue: number): Tribe => ({
  id,
  baseHue,
  population: new Set<string>(),
  resources: new Map([
    [ResourceType.Food, 500],
    [ResourceType.Wood, 200],
    [ResourceType.Stone, 100],
    [ResourceType.Iron, 50],
  ]),
  behavior: {
    aggressiveness: 0.2,
    exploration: 0.5,
    gathering: 0.8,
  },
});

export const createPerson = (tribeId: number, role: PersonRole): Person => ({
  id: Math.random().toString(36).substring(2, 9),
  tribeId,
  role,
  health: 100,
  hunger: 0,
  age: 0,
  carrying: null,
});

export const initializeTribe = (
  grid: Cell[][],
  tribe: Tribe,
  center: Position
): boolean => {
  let attempts = 0;
  let x = center.x;
  let y = center.y;

  while (attempts < 100) {
    if (
      grid[x][y].terrain === TerrainType.Plains ||
      grid[x][y].terrain === TerrainType.Forest
    ) {
      break;
    }
    x = Math.floor(Math.random() * CONFIG.GRID_SIZE);
    y = Math.floor(Math.random() * CONFIG.GRID_SIZE);
    attempts++;
  }

  if (attempts >= 100) return false;

  for (let i = 0; i < CONFIG.INITIAL_TRIBE_SIZE; i++) {
    const dx = Math.floor(Math.random() * 2) - 1;
    const dy = Math.floor(Math.random() * 2) - 1;
    const px = (x + dx + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
    const py = (y + dy + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;

    if (
      grid[px][py].terrain === TerrainType.Plains ||
      grid[px][py].terrain === TerrainType.Forest
    ) {
      const person = createPerson(tribe.id, PersonRole.Gatherer);
      grid[px][py].person = person;
      tribe.population.add(`${px},${py}`);
    }
  }

  return tribe.population.size > 0;
};

export const updatePerson = (
  grid: Cell[][],
  pos: Position,
  tribes: Map<number, Tribe>
): void => {
  const cell = grid[pos.x][pos.y];
  if (!cell.person) return;

  const person = cell.person;
  const tribe = tribes.get(person.tribeId)!;

  // Slower hunger increase
  person.hunger = Math.min(100, person.hunger + CONFIG.HUNGER_RATE * 0.2);

  // More lenient health mechanics
  if (person.hunger > 95) {
    person.health -= 1; // Reduced damage
  } else if (person.hunger < 70) {
    // More lenient threshold
    person.health = Math.min(100, person.health + CONFIG.HEALTH_RECOVERY);
  }
  person.age++;

  // More frequent eating
  if (person.hunger > 20 && tribe.resources.get(ResourceType.Food)! > 0) {
    person.hunger = Math.max(0, person.hunger - 30); // More hunger reduction
    tribe.resources.set(
      ResourceType.Food,
      tribe.resources.get(ResourceType.Food)! - 1
    );
  }

  if (person.health <= 0) {
    cell.person = null;
    return;
  }

  switch (person.role) {
    case PersonRole.Gatherer:
      handleGatherer(grid, pos, person, tribe);
      break;
    case PersonRole.Warrior:
      handleWarrior(grid, pos, person, tribe);
      break;
    case PersonRole.Builder:
      handleBuilder(grid, pos, person, tribe);
      break;
    case PersonRole.Explorer:
      handleExplorer(grid, pos, person, tribe);
      break;
  }
};

const handleGatherer = (
  grid: Cell[][],
  pos: Position,
  person: Person,
  tribe: Tribe
): void => {
  // Check current cell for resources
  const currentCell = grid[pos.x][pos.y];
  if (currentCell.resourceAmount > 0) {
    // Gather resources from current cell
    const gathered = Math.min(
      currentCell.resourceAmount,
      CONFIG.RESOURCE_GATHER_RATE
    );
    currentCell.resourceAmount -= gathered;

    // Add food to tribe's resources
    const currentFood = tribe.resources.get(ResourceType.Food) ?? 0;
    tribe.resources.set(ResourceType.Food, currentFood + gathered);

    // Reduce hunger as reward for gathering
    person.hunger = Math.max(0, person.hunger - 5);
    return;
  }

  // Look for resources in adjacent cells
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (const [dx, dy] of directions) {
    const newX = (pos.x + dx + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
    const newY = (pos.y + dy + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
    const targetCell = grid[newX][newY];

    if (targetCell.resourceAmount > 0) {
      // Move towards resources if possible
      if (
        !targetCell.person &&
        targetCell.terrain !== TerrainType.Water &&
        targetCell.terrain !== TerrainType.Mountain &&
        targetCell.terrain !== TerrainType.SnowCap
      ) {
        targetCell.person = currentCell.person;
        currentCell.person = null;
        return;
      }
    }
  }

  // If no resources found nearby, move randomly
  moveRandomly(grid, pos);
};

const handleWarrior = (
  grid: Cell[][],
  pos: Position,
  person: Person,
  tribe: Tribe
): void => {
  // TODO: Expand logic for fighting enemies
  moveRandomly(grid, pos);
};

const handleBuilder = (
  grid: Cell[][],
  pos: Position,
  person: Person,
  tribe: Tribe
): void => {
  // TODO: Expand logic for building structures
  moveRandomly(grid, pos);
};

const handleExplorer = (
  grid: Cell[][],
  pos: Position,
  person: Person,
  tribe: Tribe
): void => {
  moveRandomly(grid, pos);
};

// Improved random movement
const moveRandomly = (grid: Cell[][], pos: Position): void => {
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  // Shuffle directions
  for (let i = directions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [directions[i], directions[j]] = [directions[j], directions[i]];
  }

  const currentCell = grid[pos.x][pos.y];

  // Try each direction
  for (const [dx, dy] of directions) {
    const newX = (pos.x + dx + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
    const newY = (pos.y + dy + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
    const targetCell = grid[newX][newY];

    // Check if the move is valid
    if (
      !targetCell.person &&
      targetCell.terrain !== TerrainType.Water &&
      targetCell.terrain !== TerrainType.Mountain &&
      targetCell.terrain !== TerrainType.SnowCap
    ) {
      // Prefer resource-rich or fertile terrain
      if (
        targetCell.resourceAmount > 0 ||
        targetCell.terrain === TerrainType.Plains ||
        targetCell.terrain === TerrainType.Forest
      ) {
        targetCell.person = currentCell.person;
        currentCell.person = null;
        return;
      }
    }
  }

  // If no preferred moves found, try any valid move
  for (const [dx, dy] of directions) {
    const newX = (pos.x + dx + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
    const newY = (pos.y + dy + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
    const targetCell = grid[newX][newY];

    if (
      !targetCell.person &&
      targetCell.terrain !== TerrainType.Water &&
      targetCell.terrain !== TerrainType.Mountain &&
      targetCell.terrain !== TerrainType.SnowCap
    ) {
      targetCell.person = currentCell.person;
      currentCell.person = null;
      return;
    }
  }
};
