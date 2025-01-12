import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { Pixoo } from '../src/pixoo';
import { RGB } from '../src/types';

vi.mock('axios');

// Helper to access private buffer for testing
const getBuffer = (pixoo: Pixoo): number[] => {
  return (pixoo as unknown as { buffer: number[] }).buffer;
};

describe('Pixoo', () => {
  const mockIp = '192.168.1.100';
  let pixoo: Pixoo;

  beforeEach(() => {
    vi.resetAllMocks();
    pixoo = new Pixoo({ ipAddress: mockIp });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(pixoo).toBeDefined();
    });

    it('should throw on invalid IP address', () => {
      expect(() => new Pixoo({ ipAddress: 'invalid' })).toThrow(
        'Invalid IP address'
      );
    });
  });

  describe('clear', () => {
    it('should fill buffer with black by default', () => {
      pixoo.clear();
      const buffer = getBuffer(pixoo);
      expect(buffer.every((v) => v === 0)).toBe(true);
    });

    it('should fill buffer with specified color', () => {
      const color: RGB = [255, 0, 0];
      pixoo.clear(color);
      const buffer = getBuffer(pixoo);
      for (let i = 0; i < buffer.length; i += 3) {
        expect(buffer[i]).toBe(255);
        expect(buffer[i + 1]).toBe(0);
        expect(buffer[i + 2]).toBe(0);
      }
    });
  });

  describe('drawPixel', () => {
    it('should set pixel color at specified coordinates', () => {
      const x = 0;
      const y = 0;
      const color: RGB = [255, 0, 0];
      pixoo.drawPixel(x, y, color);
      const buffer = getBuffer(pixoo);
      expect(buffer[0]).toBe(255);
      expect(buffer[1]).toBe(0);
      expect(buffer[2]).toBe(0);
    });

    it('should ignore out of bounds coordinates', () => {
      const buffer = getBuffer(pixoo);
      const originalBuffer = [...buffer];
      pixoo.drawPixel(-1, -1, [255, 0, 0]);
      pixoo.drawPixel(64, 64, [255, 0, 0]);
      expect(buffer).toEqual(originalBuffer);
    });
  });

  describe('drawLine', () => {
    it('should draw a horizontal line', () => {
      pixoo.drawLine(0, 0, 2, 0, [255, 0, 0]);
      const buffer = getBuffer(pixoo);
      // Check first three pixels
      for (let i = 0; i < 3; i++) {
        const offset = i * 3;
        expect(buffer[offset]).toBe(255);
        expect(buffer[offset + 1]).toBe(0);
        expect(buffer[offset + 2]).toBe(0);
      }
    });
  });

  describe('push', () => {
    it('should send buffer to device', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { error_code: 0 } });
      await pixoo.push();
      expect(axios.post).toHaveBeenCalledWith(
        'http://192.168.1.100/post',
        expect.objectContaining({
          Command: 'Draw/SendHttpGif',
          PicNum: 1,
          PicWidth: 64,
        })
      );
    });

    it('should reset counter when limit reached', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: { error_code: 0 } });
      const pixoo = new Pixoo({
        ipAddress: mockIp,
        refreshCounterLimit: 2,
      });

      await pixoo.push(); // counter = 2
      await pixoo.push(); // counter = 1 (reset)

      expect(axios.post).toHaveBeenCalledWith(
        'http://192.168.1.100/post',
        expect.objectContaining({
          Command: 'Draw/ResetHttpGifId',
        })
      );
    });
  });

  describe('device commands', () => {
    it('should set brightness', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { error_code: 0 } });
      await pixoo.setBrightness(50);
      expect(axios.post).toHaveBeenCalledWith(
        'http://192.168.1.100/post',
        expect.objectContaining({
          Command: 'Channel/SetBrightness',
          Brightness: 50,
        })
      );
    });

    it('should set screen state', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: { error_code: 0 } });
      await pixoo.setScreen(true);
      expect(axios.post).toHaveBeenCalledWith(
        'http://192.168.1.100/post',
        expect.objectContaining({
          Command: 'Channel/OnOffScreen',
          OnOff: 1,
        })
      );
    });
  });
});
