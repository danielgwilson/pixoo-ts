# Conway's Game of Life Example

This example implements Conway's Game of Life on the Pixoo display. It demonstrates:

- Complex animation and state management
- Efficient buffer updates
- Game simulation
- Interactive controls

## Running the Example

From the root of the monorepo:

```bash
# Install dependencies
pnpm install

# Run the example
pnpm --filter @pixoo-ts/example-game-of-life start
```

## Game Rules

Conway's Game of Life follows these rules:

1. Any live cell with fewer than two live neighbors dies (underpopulation)
2. Any live cell with two or three live neighbors lives on to the next generation
3. Any live cell with more than three live neighbors dies (overpopulation)
4. Any dead cell with exactly three live neighbors becomes a live cell (reproduction)

## Controls

- Press `r` to randomize the board
- Press `c` to clear the board
- Press `space` to pause/resume
- Press `q` to quit

## Implementation Details

The example demonstrates:
- Efficient grid management
- State updates and animations
- User input handling
- Color management for cells
- Performance optimization for 64x64 grid 