/* src/types.ts */

export type RGB = [number, number, number];

export enum TerrainType {
  Water = 'water',
  Plains = 'plains',
  Forest = 'forest',
  Desert = 'desert',
  Mountain = 'mountain',
  SnowCap = 'snowcap',
  CaveFloor = 'cavefloor',
  ResourceNode = 'resource',
  Taiga = 'taiga',
  Tundra = 'tundra',
}

export enum PersonRole {
  Gatherer = 'gatherer',
  Warrior = 'warrior',
  Builder = 'builder',
  Explorer = 'explorer',
}

export enum ResourceType {
  Food = 'food',
  Wood = 'wood',
  Stone = 'stone',
  Iron = 'iron',
}

export interface Position {
  x: number;
  y: number;
}

export interface Tribe {
  id: number;
  baseHue: number; // Base color for the tribe
  population: Set<string>; // Set of "x,y" coordinates of tribe members
  resources: Map<ResourceType, number>;
  behavior: {
    aggressiveness: number; // 0-1, how likely to attack
    exploration: number; // 0-1, how far they'll wander
    gathering: number; // 0-1, focus on resource gathering
  };
}

export interface Person {
  id: string;
  tribeId: number;
  role: PersonRole;
  health: number;
  hunger: number;
  age: number;
  carrying: null | ResourceType;
}

export interface Cell {
  terrain: TerrainType;
  person: Person | null;
  resourceAmount: number;
  structure: Structure | null;
}

export interface Structure {
  type: 'hut' | 'farm' | 'storehouse';
  tribeId: number;
  health: number;
}

// For the "Life Evolved" variant
export interface Genome {
  birthRule: number[];
  survivalRule: number[];
  baseHue: number;
  mutationRate: number;
}

export interface Colony {
  genome: Genome;
  cells: Set<string>;
}

// For the Life Evolved variant
export interface LifeCell {
  genome: Genome | null;
  age: number;
  brightness: number;
}

export const CONFIG = {
  GRID_SIZE: 64,
  INITIAL_TRIBES: 3,
  MAX_TRIBE_SIZE: 50,
  INITIAL_TRIBE_SIZE: 10,
  HUNGER_RATE: 0.1,
  HEALTH_RECOVERY: 1,
  REPRODUCTION_THRESHOLD: 80,
  COMBAT_DAMAGE: 20,
  RESOURCE_GATHER_RATE: 5,
  SIMULATION_SPEED: 300, // ms between turns
} as const;
