# Basic Drawing Example

This example demonstrates the core drawing capabilities of the Pixoo library:

- Finding a Pixoo device on your network
- Drawing pixels and lines
- Animating drawings
- Using different colors

## Running the Example

From the root of the monorepo:

```bash
# Install dependencies
pnpm install

# Run the example
pnpm --filter @pixoo-ts/example-basic-drawing start
```

The example will:

1. Find your Pixoo device on the network
2. Draw some diagonal lines
3. Draw a box
4. Fill the screen with random pixels

## Code Walkthrough

The example shows:

- Using `findPixooDevice()` to discover your Pixoo
- Creating a new `Pixoo` instance
- Using basic drawing methods:
  - `clear()` - Clear the screen
  - `drawPixel()` - Draw individual pixels
  - `drawLine()` - Draw lines
  - `push()` - Send changes to the device
- Adding delays between animations
