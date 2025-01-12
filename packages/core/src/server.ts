// Server-only functionality - do not import in browser
import express, { Request, Response, Express } from 'express';
import { Pixoo } from './pixoo';

/**
 * Provide an Express-based REST interface to a Pixoo device.
 * This class should only be used in Node.js environments.
 */
export class PixooServer {
  private pixoo: Pixoo;
  private app: Express;
  private port: number;

  constructor(pixoo: Pixoo, port = 4321) {
    this.pixoo = pixoo;
    this.port = port;
    this.app = express();

    this.configureRoutes();
  }

  private configureRoutes(): void {
    // Basic device control
    this.app.get('/clear/:r/:g/:b', async (req: Request, res: Response) => {
      const { r, g, b } = req.params;
      this.pixoo.clear([+r, +g, +b]);
      await this.pixoo.push();
      res.json({ success: true });
    });

    this.app.get('/push', async (req: Request, res: Response) => {
      await this.pixoo.push();
      res.json({ success: true });
    });

    this.app.post('/pixel', async (req: Request, res: Response) => {
      const { x, y, r, g, b } = req.body;
      this.pixoo.drawPixel(x, y, [r, g, b]);
      res.json({ success: true });
    });

    this.app.post('/line', async (req: Request, res: Response) => {
      const { x1, y1, x2, y2, r, g, b } = req.body;
      this.pixoo.drawLine(x1, y1, x2, y2, [r, g, b]);
      res.json({ success: true });
    });

    // Device settings
    this.app.post('/brightness', async (req: Request, res: Response) => {
      const { brightness } = req.body;
      await this.pixoo.setBrightness(brightness);
      res.json({ success: true });
    });

    this.app.post('/screen', async (req: Request, res: Response) => {
      const { on } = req.body;
      await this.pixoo.setScreen(on);
      res.json({ success: true });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`Pixoo REST server running on port ${this.port}`);
    });
  }
}
