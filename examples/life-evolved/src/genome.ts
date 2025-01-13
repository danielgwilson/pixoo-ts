/* src/genome.ts */
import { Genome } from './types';

// Constants for genome generation and mutation
const MIN_MUTATION_RATE = 0.005; // 0.5%
const MAX_MUTATION_RATE = 0.02; // 2%
const BREEDING_CHANCE = 0.02; // 2% chance
const HUE_MUTATION_MAX = 20; // Smaller color shifts
const MIN_COLONY_SIZE_FOR_BREEDING = 5; // Increased minimum size

export const createInitialGenome = (hue: number): Genome => ({
  birthRule: [3], // Classic Life birth rule
  survivalRule: [2, 3], // Classic Life survival rule
  baseHue: hue,
  mutationRate: 0.01, // 1% mutation rate
});

export const shouldBreed = (neighborCount: number): boolean => {
  if (neighborCount < MIN_COLONY_SIZE_FOR_BREEDING) return false;
  return Math.random() < BREEDING_CHANCE;
};

const mutateRule = (rule: number[]): number[] => {
  const newRule = [...rule];
  if (Math.random() < 0.5 && newRule.length < 8) {
    // Add a new number
    const possibleNumbers = Array.from({ length: 8 }, (_, i) => i + 1).filter(
      (n) => !newRule.includes(n)
    );
    if (possibleNumbers.length > 0) {
      const randomIndex = Math.floor(Math.random() * possibleNumbers.length);
      newRule.push(possibleNumbers[randomIndex]);
    }
  } else if (newRule.length > 1) {
    // Remove a number
    const randomIndex = Math.floor(Math.random() * newRule.length);
    newRule.splice(randomIndex, 1);
  }
  return newRule.sort((a, b) => a - b);
};

const mutateHue = (hue: number): number => {
  const shift = (Math.random() * 2 - 1) * HUE_MUTATION_MAX;
  return (hue + shift + 360) % 360;
};

const mutateMutationRate = (rate: number): number => {
  const shift = (Math.random() * 2 - 1) * 0.01; // ±1% shift
  return Math.max(MIN_MUTATION_RATE, Math.min(MAX_MUTATION_RATE, rate + shift));
};

export const mutateGenome = (genome: Genome): Genome => {
  if (Math.random() > genome.mutationRate) return genome;
  return {
    birthRule:
      Math.random() < 0.4 ? mutateRule(genome.birthRule) : genome.birthRule,
    survivalRule:
      Math.random() < 0.4
        ? mutateRule(genome.survivalRule)
        : genome.survivalRule,
    baseHue: mutateHue(genome.baseHue),
    mutationRate: mutateMutationRate(genome.mutationRate),
  };
};

export const breedGenomes = (genomeA: Genome, genomeB: Genome): Genome => {
  const combinedBirthRule = [
    ...new Set([...genomeA.birthRule, ...genomeB.birthRule]),
  ]
    .filter(() => Math.random() < 0.5)
    .sort((a, b) => a - b);

  const combinedSurvivalRule = [
    ...new Set([...genomeA.survivalRule, ...genomeB.survivalRule]),
  ]
    .filter(() => Math.random() < 0.5)
    .sort((a, b) => a - b);

  if (combinedBirthRule.length === 0) {
    combinedBirthRule.push(
      Math.random() < 0.5 ? genomeA.birthRule[0] : genomeB.birthRule[0]
    );
  }
  if (combinedSurvivalRule.length === 0) {
    combinedSurvivalRule.push(
      Math.random() < 0.5 ? genomeA.survivalRule[0] : genomeB.survivalRule[0]
    );
  }

  const hueDiff = Math.abs(genomeA.baseHue - genomeB.baseHue);
  const shortestHueDiff = Math.min(hueDiff, 360 - hueDiff);
  const randomPoint = Math.random();
  const newHue = (genomeA.baseHue + shortestHueDiff * randomPoint + 360) % 360;

  const avgMutationRate = (genomeA.mutationRate + genomeB.mutationRate) / 2;
  const mutationShift = Math.random() * 0.01 - 0.005; // ±0.5%

  const childGenome = {
    birthRule: combinedBirthRule,
    survivalRule: combinedSurvivalRule,
    baseHue: newHue,
    mutationRate: Math.max(
      MIN_MUTATION_RATE,
      Math.min(MAX_MUTATION_RATE, avgMutationRate + mutationShift)
    ),
  };

  return Math.random() < 0.3 ? mutateGenome(childGenome) : childGenome;
};
