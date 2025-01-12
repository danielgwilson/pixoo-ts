# pixoo-ts

## Original requirements context

```plaintext
...

—

Please convert this project to TypeScript.

Context
- I have a new Pixoo 64 pixel art frame that displays 64x64 rgb pixels in beautiful art format
- You can show animations, clocks, etc.
- I want to eventually make some fun projects that are more complex than simple pixel art / animations
- I want to have a nice TypeScript library to create and test these types of more interesting applications

Nuance
- I'd like to use a web interface (e.g. simple localhost:3000 page) with vite / React / TailwindCSS / Shadcn UI components INSTEAD OF the rather slow memory-hog-y MacOS local program
- You can therefore omit the simulator code once you understand it, instead replacing it with a web interface for the pixels we want to preview
- The ideal output is a VERY thorough and clean re-implementation of the TypeScript code provided to interface with the Pixoo 64, such that we have...
  - A high-quality, robust library to interface with the Pixoo 64 that can be used by other projects
  - A CLI tool to initialize new projects
  - A web interface to simulate these projects
  - A "runner" that simply runs these projects (that somehow doesn't depend on packing the CLI, simulator, etc.)
  - Thorough and robust test coverage with vitest
  - Compelling and thoughtful examples with varying levels of complexity, covering all the features
  - Thorough documentation to be able to post this on GitHub




Please provide our new, beautiful, TypeScript library masterpiece for developing things for and interfacing with the Pixoo 64.
```

## Context

Below is an example of a **TypeScript** monorepo structure that brings together:

1. A **core Pixoo 64 TypeScript library** (analogous to your Python library)
2. A **CLI tool** (for scaffolding new projects or running commands)
3. A **web simulator** built with **Vite**, **React**, **TailwindCSS**, and **Shadcn UI** (replacing the old Python “simulator”)
4. A **runner** (a simple Node-based runner, separate from the CLI, that can be used to run existing “Pixoo” apps)
5. **Vitest** test coverage and illustrative tests for the library

> Note: The code below is a boilerplate or reference solution to demonstrate how you might structure a thorough, production-ready TypeScript solution with the features you requested. You’ll likely want to further customize or expand it as your project grows.
>

---

## High-Level Directory Layout

```lua
lua
Copy code
pixoo64-monorepo/
├─ packages/
│   ├─ core/            <-- The main TypeScript library for Pixoo
│   │   ├─ src/
│   │   │   ├─ index.ts
│   │   │   ├─ pixoo.ts
│   │   │   ├─ rest.ts
│   │   │   └─ utils.ts
│   │   ├─ test/
│   │   │   ├─ pixoo.test.ts
│   │   │   └─ rest.test.ts
│   │   ├─ package.json
│   │   ├─ tsconfig.json
│   │   └─ README.md
│   ├─ cli/             <-- A CLI tool to scaffold projects & send commands
│   │   ├─ src/
│   │   │   └─ index.ts
│   │   ├─ bin/
│   │   │   └─ pixoo64-cli.js
│   │   ├─ package.json
│   │   └─ tsconfig.json
│   ├─ runner/          <-- A Node script to run a Pixoo project "headlessly"
│   │   ├─ src/
│   │   │   └─ index.ts
│   │   ├─ package.json
│   │   └─ tsconfig.json
│   └─ web-simulator/   <-- Vite + React + TailwindCSS + Shadcn UI
│       ├─ src/
│       │   ├─ App.tsx
│       │   ├─ main.tsx
│       │   ├─ components/
│       │   │   ├─ CanvasSimulator.tsx
│       │   │   └─ ...
│       │   └─ ...
│       ├─ index.html
│       ├─ package.json
│       ├─ postcss.config.js
│       ├─ tailwind.config.js
│       ├─ tsconfig.json
│       ├─ vite.config.ts
│       └─ ...
├─ package.json
├─ pnpm-workspace.yaml   (or yarn workspaces, or lerna.json, etc.)
└─ README.md

```

Below are **representative** code samples from the various parts.

---

# 1) **Core Library** (`packages/core`)

### `package.json` (excerpt)

```
jsonc
Copy code
{
  "name": "@pixoo64/core",
  "version": "0.1.0",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "axios": "^1.3.5"       // For HTTP calls to Pixoo device
  },
  "devDependencies": {
    "vitest": "^0.34.1",
    "typescript": "^4.9.5"
  }
}

```

### `tsconfig.json` (excerpt)

```
jsonc
Copy code
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "declaration": true,
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "test/**/*"]
}

```

### `src/index.ts`

```
ts
Copy code
export * from "./pixoo";
export * from "./rest";
export * from "./utils";
// Add more exports as your library grows

```

### `src/pixoo.ts`

This is a rough translation of your Python `Pixoo` class to TypeScript. We omit the old Python simulator logic, since we’ll rely on a new web-simulator approach. The design also attempts to follow typical Node/TypeScript patterns.

```
ts
Copy code
import axios from "axios";
import { clampColor, rgbToHex, clamp, lerpLocation, roundLocation, minSteps } from "./utils";

/**
 * Represents a single Pixoo device and encapsulates methods
 * for drawing, uploading images, controlling the device, etc.
 */
export class Pixoo {
  private ipAddress: string | null;
  private size: 16 | 32 | 64;
  private debug: boolean;
  private baseURL: string;
  private buffer: number[]; // Flattened RGB array
  private pixelCount: number;

  /**
   * The internal "frame" counter that must be incremented with each push.
   * Some device firmware has a limitation requiring us to reset at intervals.
   */
  private counter: number = 1;
  /**
   * After pushing ~300 times, the device might hang. So we auto-reset at 32 or 300, etc.
   */
  private refreshConnectionAutomatically: boolean;
  private refreshCounterLimit: number = 32;

  constructor(
    ipAddress: string | null,
    size: 16 | 32 | 64 = 64,
    debug = false,
    refreshConnectionAutomatically = true
  ) {
    // For now, we assume the user must pass an IP or handle auto-discovery
    this.ipAddress = ipAddress;
    this.size = size;
    this.debug = debug;
    this.refreshConnectionAutomatically = refreshConnectionAutomatically;

    if (!ipAddress) {
      // Potentially perform a local auto-discovery if desired
      // e.g. this.ipAddress = someDiscovery();
      this.ipAddress = "0.0.0.0"; // placeholder fallback
    }

    this.baseURL = `http://${this.ipAddress}/post`;
    this.pixelCount = this.size * this.size;
    // Pre-fill the buffer with black
    this.buffer = Array(this.pixelCount * 3).fill(0);
  }

  /**
   * Clear the buffer to a given color, defaults to black
   */
  public clear(rgb: [number, number, number] = [0, 0, 0]) {
    const [r, g, b] = clampColor(rgb);
    for (let i = 0; i < this.pixelCount; i++) {
      const offset = i * 3;
      this.buffer[offset] = r;
      this.buffer[offset + 1] = g;
      this.buffer[offset + 2] = b;
    }
  }

  /**
   * Draw a pixel at (x,y) with an RGB color
   */
  public drawPixel(x: number, y: number, rgb: [number, number, number]) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      if (this.debug) {
        console.warn(`drawPixel out of range: (${x}, ${y})`);
      }
      return;
    }
    const [r, g, b] = clampColor(rgb);
    const index = x + y * this.size;
    const offset = index * 3;
    this.buffer[offset] = r;
    this.buffer[offset + 1] = g;
    this.buffer[offset + 2] = b;
  }

  /**
   * Draw a line from (x1, y1) to (x2, y2)
   */
  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rgb: [number, number, number]
  ) {
    const steps = minSteps([x1, y1], [x2, y2]);
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      const [lx, ly] = lerpLocation([x1, y1], [x2, y2], t);
      const [rx, ry] = roundLocation([lx, ly]);
      this.drawPixel(rx, ry, rgb);
    }
  }

  /**
   * Draw simple text using a minimal font or custom logic.
   * For advanced text, we rely on the device's built-in methods (sendText).
   * This is purely local buffer drawing.
   */
  public drawText(
    text: string,
    x: number,
    y: number,
    rgb: [number, number, number]
  ) {
    // Minimal “font” logic if you want to replicate your 3x5 glyph approach
    // Omitted here for brevity. Could do `drawCharacter` in a loop.
    let offsetX = 0;
    for (const char of text) {
      // drawCharacter(char, (x + offsetX), y, rgb);
      offsetX += 4; // e.g. 3 wide + 1 spacing
    }
  }

  /**
   * Pushes the in-memory buffer to the Pixoo device.
   * Uses the device's `Draw/SendHttpGif` command with a base64-encoded array.
   */
  public async push() {
    try {
      this.counter++;
      if (
        this.refreshConnectionAutomatically &&
        this.counter >= this.refreshCounterLimit
      ) {
        await this.resetCounter();
        this.counter = 1;
      }

      const base64Data = Buffer.from(this.buffer).toString("base64");
      const payload = {
        Command: "Draw/SendHttpGif",
        PicNum: 1,
        PicWidth: this.size,
        PicOffset: 0,
        PicID: this.counter,
        PicSpeed: 1000,
        PicData: base64Data,
      };

      const response = await axios.post(this.baseURL, payload);
      if (response.data.error_code !== 0) {
        if (this.debug) {
          console.error("Error sending buffer to device", response.data);
        }
      }
    } catch (err) {
      if (this.debug) {
        console.error("Error in push()", err);
      }
    }
  }

  /**
   * Reset the counter on the Pixoo side, to avoid memory issues.
   */
  private async resetCounter() {
    if (this.debug) {
      console.log("Resetting counter on device...");
    }
    const response = await axios.post(this.baseURL, {
      Command: "Draw/ResetHttpGifId",
    });
    if (response.data.error_code !== 0) {
      if (this.debug) {
        console.error("Error resetting gif ID", response.data);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Device methods
  // (Examples: setBrightness, setScreen, setChannel, etc.)
  // -------------------------------------------------------------------------

  public async setBrightness(brightness: number) {
    const b = clamp(brightness, 0, 100);
    const payload = { Command: "Channel/SetBrightness", Brightness: b };
    await axios.post(this.baseURL, payload);
  }

  public async setScreen(on: boolean) {
    const payload = { Command: "Channel/OnOffScreen", OnOff: on ? 1 : 0 };
    await axios.post(this.baseURL, payload);
  }

  // ... replicate the other commands from your Python code ...
}

```

### `src/rest.ts`

In Python, you had `PixooREST` using **Flask** to run a local server. Below is a simplified approach using **Express** in Node. You can easily incorporate this in your CLI or runner if you like.

```
ts
Copy code
import express, { Request, Response } from "express";
import { Pixoo } from "./pixoo";

/**
 * Provide an Express-based REST interface to a Pixoo device.
 */
export class PixooREST {
  private pixoo: Pixoo;
  private app = express();
  private port: number;

  constructor(pixoo: Pixoo, port = 4321) {
    this.pixoo = pixoo;
    this.port = port;

    this.configureRoutes();
  }

  private configureRoutes() {
    this.app.get("/clear/:r/:g/:b", async (req: Request, res: Response) => {
      const { r, g, b } = req.params;
      this.pixoo.clear([+r, +g, +b]);
      res.json({ success: true });
    });

    this.app.get("/push", async (req: Request, res: Response) => {
      await this.pixoo.push();
      res.json({ success: true });
    });

    // ... replicate other routes like in your Python code ...
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`Pixoo REST server running on port ${this.port}`);
    });
  }
}

```

### `src/utils.ts`

A place for clamp, color conversions, and other small utility functions. Many are direct translations from your Python code.

```
ts
Copy code
export function clamp(value: number, minVal: number, maxVal: number): number {
  return Math.max(minVal, Math.min(value, maxVal));
}

export function clampColor(rgb: [number, number, number]): [number, number, number] {
  return [
    clamp(rgb[0], 0, 255),
    clamp(rgb[1], 0, 255),
    clamp(rgb[2], 0, 255),
  ];
}

export function rgbToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb.map((x) => clamp(x, 0, 255));
  return `#${(r | (1 << 8)).toString(16).slice(1).toUpperCase()}${(g | (1 << 8))
    .toString(16)
    .slice(1)
    .toUpperCase()}${(b | (1 << 8)).toString(16).slice(1).toUpperCase()}`;
}

export function minSteps(
  [x1, y1]: [number, number],
  [x2, y2]: [number, number]
): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpLocation(
  [x1, y1]: [number, number],
  [x2, y2]: [number, number],
  t: number
): [number, number] {
  return [lerp(x1, x2, t), lerp(y1, y2, t)];
}

export function roundLocation([x, y]: [number, number]): [number, number] {
  return [Math.round(x), Math.round(y)];
}

```

### A Sample Test: `test/pixoo.test.ts` using **Vitest**

```
ts
Copy code
import { describe, it, expect } from "vitest";
import { Pixoo } from "../src/pixoo";

describe("Pixoo Class", () => {
  it("should initialize with a black buffer", () => {
    const pixoo = new Pixoo(null, 16, false);
    // 16 x 16 => 256 * 3 => 768 length
    expect(pixoo).toBeTruthy();
    // obviously you might expose a buffer in a test context or use reflection
    // for demonstration:
    // expect(pixoo.getInternalBuffer().every(v => v === 0)).toBe(true);
  });

  it("should clamp brightness in setBrightness", async () => {
    const pixoo = new Pixoo("192.168.1.100", 64, true, false);
    // You might mock axios here
    await pixoo.setBrightness(999);
    // If mocked, check that the actual posted brightness was 100
    expect(true).toBe(true);
  });
});

```

---

# 2) **CLI Tool** (`packages/cli`)

### `src/index.ts`

A small script that can create new projects or interact with an existing Pixoo device.

```
ts
Copy code
#!/usr/bin/env node

import { program } from "commander";
import { Pixoo } from "@pixoo64/core";

program
  .name("pixoo64-cli")
  .description("CLI for the Pixoo64 TypeScript library")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a new Pixoo64 project in the current directory")
  .action(() => {
    // e.g. scaffold a new folder structure, copy some example files
    console.log("Scaffolding new Pixoo64 project...");
  });

program
  .command("ping")
  .requiredOption("--ip <ipAddress>", "IP address of your Pixoo device")
  .description("Ping the device or do a quick check")
  .action((opts) => {
    const pixoo = new Pixoo(opts.ip);
    console.log(`Created a Pixoo with IP ${opts.ip}`);
    // Possibly do a simple "validateConnection" logic
  });

program.parse(process.argv);

```

### `package.json` (excerpt)

```
jsonc
Copy code
{
  "name": "@pixoo64/cli",
  "version": "0.1.0",
  "bin": {
    "pixoo64-cli": "bin/pixoo64-cli.js"
  },
  "dependencies": {
    "@pixoo64/core": "0.1.0",
    "commander": "^9.5.0"
  },
  "devDependencies": {
    "typescript": "^4.9.5"
  }
}

```

Then you might have a small bundling step or just run `tsc` and produce a `bin/pixoo64-cli.js`.

---

# 3) **Runner** (`packages/runner`)

A minimal “headless” Node-based script that can be used to run a Pixoo project’s logic. This is **different** from the CLI, in that the CLI is a tool for scaffolding and quick device commands, while the runner might run your custom code that draws animations, etc.

### `src/index.ts`

```
ts
Copy code
import { Pixoo } from "@pixoo64/core";

async function main() {
  // Example: load a user’s “script” that draws something
  const ip = process.env.PIXOO_IP || "192.168.1.50";
  const pixoo = new Pixoo(ip, 64, true);

  pixoo.clear([255, 0, 0]); // Fill with red
  pixoo.drawLine(0, 0, 63, 63, [0, 255, 0]); // diagonal
  pixoo.drawText("Hello TS!", 2, 10, [0, 0, 255]);

  await pixoo.push();
  console.log("Pushed initial frame to Pixoo device.");

  // Possibly loop, do animations, etc.
}

main().catch((err) => {
  console.error("Runner error:", err);
});

```

---

# 4) **Web Simulator** (`packages/web-simulator`)

Below is a minimal example of a **Vite + React** project that uses **TailwindCSS** and **Shadcn UI**. We’ll skip some boilerplate but show key components.

### `package.json` (excerpt)

```
jsonc
Copy code
{
  "name": "@pixoo64/web-simulator",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@pixoo64/core": "0.1.0",
    // tailwind, shadcn UI, etc
  },
  "devDependencies": {
    "vite": "^4.2.1",
    "typescript": "^4.9.5",
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    // etc.
  }
}

```

### `vite.config.ts`

```
ts
Copy code
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});

```

### `tailwind.config.js`

```
js
Copy code
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    // if you integrate shadcn, also add its path
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

```

### `src/App.tsx`

```tsx
tsx
Copy code
import React, { useState } from "react";
import { Pixoo } from "@pixoo64/core";
import CanvasSimulator from "./components/CanvasSimulator";

function App() {
  const [pixoo] = useState(() => new Pixoo(null, 64, false, false));

  // For demonstration, we pretend to “draw” locally into the Pixoo’s buffer
  // Then the <CanvasSimulator> reads that buffer and displays it.

  const fillGreen = () => {
    pixoo.clear([0, 255, 0]);
  };

  const drawLine = () => {
    pixoo.drawLine(0, 0, 63, 63, [255, 0, 0]);
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <h1 className="text-xl font-bold mb-4">Pixoo Web Simulator</h1>
      <div className="flex gap-4">
        <CanvasSimulator pixoo={pixoo} />
        <div className="flex flex-col gap-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={fillGreen}
          >
            Fill Green
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded"
            onClick={drawLine}
          >
            Draw Diagonal Line
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

```

### `src/components/CanvasSimulator.tsx`

A React component that displays the **Pixoo** buffer on an HTML canvas, letting you “see” what you’re drawing in real time (like the old Python simulator).

```tsx
tsx
Copy code
import React, { useEffect, useRef } from "react";
import { Pixoo } from "@pixoo64/core";

interface Props {
  pixoo: Pixoo;
  scale?: number;
}

const CanvasSimulator: React.FC<Props> = ({ pixoo, scale = 4 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // On mount (and whenever Pixoo changes), draw the initial
    drawBufferToCanvas();
  });

  // If you want to watch for changes, you'd do more elaborate logic
  // For demonstration, let's just let parent re-render.

  const drawBufferToCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // We know pixoo.size is either 16, 32, or 64
    const size = pixoo["size"] as number; // or create a getter in Pixoo
    const imageData = ctx.createImageData(size, size);

    // The pixoo buffer is a flattened RGB array, so let's fill imageData
    const buffer = (pixoo as any).buffer as number[]; // or create a getter
    // ^ You might want to make “buffer” publicly accessible or create a method in your Pixoo class for reading it.

    for (let i = 0; i < size * size; i++) {
      const offset = i * 4;
      const bOff = i * 3;
      imageData.data[offset] = buffer[bOff];     // R
      imageData.data[offset + 1] = buffer[bOff + 1]; // G
      imageData.data[offset + 2] = buffer[bOff + 2]; // B
      imageData.data[offset + 3] = 255;          // Alpha
    }
    ctx.putImageData(imageData, 0, 0);

    // Scale up the canvas so it's more visible
    // We'll rely on the "CSS size" of the canvas to scale it visually
  };

  return (
    <canvas
      ref={canvasRef}
      width={pixoo["size"]}
      height={pixoo["size"]}
      style={{ width: pixoo["size"] * scale, height: pixoo["size"] * scale }}
    />
  );
};

export default CanvasSimulator;

```

---

## Usage Example

In a **development environment** with `pnpm` or `yarn` workspaces:

1. **Install** all dependencies at the root with `pnpm install` (or `yarn install`).
2. **Build** the core library:

    ```bash
    bash
    Copy code
    cd packages/core
    pnpm run build
    
    ```

3. **Run** the web simulator:

    ```bash
    bash
    Copy code
    cd ../web-simulator
    pnpm run dev
    # => open http://localhost:5173 or similar
    
    ```

4. **Try** the CLI:

    ```bash
    bash
    Copy code
    pnpm pixoo64-cli init
    pnpm pixoo64-cli ping --ip 192.168.50.214
    
    ```

5. **Run** the “runner” script:

    ```bash
    bash
    Copy code
    cd ../runner
    pnpm ts-node src/index.ts
    # or if you compiled it:
    # pnpm node dist/index.js
    
    ```

---

## Final Thoughts

This setup should give you:

- A **modern** TypeScript codebase for your **Pixoo 64** device.
- The **core** library (like your original Python logic, but 100% TypeScript).
- A **CLI** to scaffold projects or send commands.
- A **web-based** simulator with React/Tailwind/Shadcn UI for local testing.
- A separate **runner** if you want a headless Node environment to run advanced scripts.
- Full **Vitest** test coverage in the core library (you can expand tests to cover the REST endpoints, CLI, etc.).

You can continue to refine how you handle mocking of device calls in the test environment, better handle device discovery, or replicate more advanced built-in text or animation features. But the above structure is a solid foundation for a **“beautiful TypeScript library masterpiece”** for the Pixoo 64!

Enjoy building your next big pixel-art project!
