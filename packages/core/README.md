# @pixoo-ts/core

A TypeScript library for interfacing with the Pixoo 64 pixel display device.

## Installation

```bash
npm install @pixoo-ts/core
# or
yarn add @pixoo-ts/core
# or
pnpm add @pixoo-ts/core
```

## Usage

```typescript
import { Pixoo } from '@pixoo-ts/core'

// Initialize with device IP address
const pixoo = new Pixoo({
  ipAddress: '192.168.1.100', // Your Pixoo's IP address
  size: 64,                   // 16, 32, or 64
  debug: true                 // Enable debug logging
})

// Basic drawing operations
pixoo.clear([0, 0, 0])                    // Clear to black
pixoo.drawPixel(0, 0, [255, 0, 0])        // Draw a red pixel
pixoo.drawLine(0, 0, 63, 63, [0, 255, 0]) // Draw a green diagonal line

// Push changes to device
await pixoo.push()

// Device controls
await pixoo.setBrightness(50)             // Set brightness to 50%
await pixoo.setScreen(true)               // Turn the screen on
```

## API Reference

### `new Pixoo(options: PixooOptions)`

Creates a new Pixoo instance.

Options:

- `ipAddress`: The IP address of your Pixoo device (required)
- `size`: Display size (16, 32, or 64, default: 64)
- `debug`: Enable debug logging (default: false)
- `refreshConnectionAutomatically`: Auto-reset connection (default: true)
- `refreshCounterLimit`: Frame counter reset limit (default: 32)

### Drawing Methods

- `clear(rgb?: RGB)`: Clear the display to a color (default: black)
- `drawPixel(x: number, y: number, rgb: RGB)`: Draw a single pixel
- `drawLine(x1: number, y1: number, x2: number, y2: number, rgb: RGB)`: Draw a line

### Device Control Methods

- `push()`: Push the current buffer to the device
- `setBrightness(brightness: number)`: Set display brightness (0-100)
- `setScreen(on: boolean)`: Turn the display on/off

## Types

```typescript
type RGB = [number, number, number]
type PixooSize = 16 | 32 | 64

interface PixooOptions {
  ipAddress: string | null
  size?: PixooSize
  debug?: boolean
  refreshConnectionAutomatically?: boolean
  refreshCounterLimit?: number
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## License

MIT
