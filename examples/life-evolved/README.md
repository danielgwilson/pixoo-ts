# Life Evolved Example

A genetic algorithm twist on Conway's Game of Life, where cells evolve and breed over time, creating colorful colonies with unique behaviors.

## Features

- **Genetic Evolution**: Each cell has a genome that determines:
  - Birth rules (when dead cells come alive)
  - Survival rules (when live cells stay alive)
  - Base color (hue)
  - Mutation rate

- **Colony Formation**: Cells with similar genomes form colonies, visible through their shared colors

- **Breeding**: When different colonies meet, they can breed to create new genomes with mixed traits

- **Visual Aging**: Cells get brighter as they age, making stable structures more visible

- **Mutation**: Random changes in genomes create new variations and behaviors

- **Terrain Generation**: Multi-step noise for height, temperature, moisture. Biomes include plains, forest, desert, mountains, snowcap, caves, etc.

## Running the Example

From the root of the monorepo:

```bash
# Install dependencies
pnpm install

# Run the example
pnpm --filter @pixoo-ts/example-life-evolved start
```

## How It Works

1. **Initial Setup**
   - Creates 3 initial colonies with different colors
   - Each colony starts with classic Game of Life rules (B3/S23)

2. **Evolution**
   - Cells follow their genome's birth/survival rules
   - Successful patterns tend to spread and survive
   - Mutations can create new behaviors

3. **Breeding**
   - When different colonies touch, they have a chance to breed
   - Child cells get mixed traits from both parents
   - New colonies can form with unique properties

4. **Visual Display**
   - Each genome has a base hue (0-360°)
   - Brightness increases with cell age
   - Connected cells of the same genome form visible colonies

## Controls

- Press `Ctrl+C` to exit

## Implementation Details

The simulation demonstrates:
- Complex state management with double buffering
- Efficient colony detection using flood fill
- Color manipulation with HSL to RGB conversion
- Genetic algorithm concepts (mutation, breeding)
- Performance optimization for 64x64 grid 