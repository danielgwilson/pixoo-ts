import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { PixooREST } from '../src/rest';
import { Pixoo } from '../src/pixoo';

// Create mock functions
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockListen = vi.fn();

// Mock express and its app
vi.mock('express', () => {
  return {
    default: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
      listen: mockListen,
    })),
  };
});

vi.mock('../src/pixoo');

interface MockRequest extends Partial<Request> {
  params: Record<string, string>;
  body: Record<string, unknown>;
}

type MockResponse = {
  json: (body: unknown) => void;
} & Partial<Response>;

describe('PixooREST', () => {
  let pixoo: Pixoo;
  let rest: PixooREST;

  beforeEach(() => {
    vi.clearAllMocks();
    pixoo = new Pixoo({ ipAddress: '192.168.1.100' });
    rest = new PixooREST(pixoo);
  });

  it('should initialize with default port', () => {
    expect(rest).toBeDefined();
  });

  it('should configure routes on initialization', () => {
    expect(mockGet).toHaveBeenCalledWith(
      '/clear/:r/:g/:b',
      expect.any(Function)
    );
    expect(mockGet).toHaveBeenCalledWith('/push', expect.any(Function));
    expect(mockPost).toHaveBeenCalledWith('/pixel', expect.any(Function));
    expect(mockPost).toHaveBeenCalledWith('/line', expect.any(Function));
    expect(mockPost).toHaveBeenCalledWith('/brightness', expect.any(Function));
    expect(mockPost).toHaveBeenCalledWith('/screen', expect.any(Function));
  });

  it('should start server on specified port', () => {
    const port = 4321;
    rest.start();
    expect(mockListen).toHaveBeenCalledWith(port, expect.any(Function));
  });

  // Test route handlers
  describe('route handlers', () => {
    let mockReq: MockRequest;
    let mockRes: MockResponse;

    beforeEach(() => {
      mockReq = {
        params: {},
        body: {},
      };
      mockRes = {
        json: vi.fn(),
      };
    });

    it('should handle clear route', async () => {
      mockReq.params = { r: '255', g: '0', b: '0' };
      const clearHandler = mockGet.mock.calls.find(
        (call) => call[0] === '/clear/:r/:g/:b'
      )?.[1];

      await clearHandler?.(mockReq as Request, mockRes as Response);
      expect(pixoo.clear).toHaveBeenCalledWith([255, 0, 0]);
      expect(pixoo.push).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle push route', async () => {
      const pushHandler = mockGet.mock.calls.find(
        (call) => call[0] === '/push'
      )?.[1];

      await pushHandler?.(mockReq as Request, mockRes as Response);
      expect(pixoo.push).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle pixel route', async () => {
      mockReq.body = { x: 0, y: 0, r: 255, g: 0, b: 0 };
      const pixelHandler = mockPost.mock.calls.find(
        (call) => call[0] === '/pixel'
      )?.[1];

      await pixelHandler?.(mockReq as Request, mockRes as Response);
      expect(pixoo.drawPixel).toHaveBeenCalledWith(0, 0, [255, 0, 0]);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle brightness route', async () => {
      mockReq.body = { brightness: 50 };
      const brightnessHandler = mockPost.mock.calls.find(
        (call) => call[0] === '/brightness'
      )?.[1];

      await brightnessHandler?.(mockReq as Request, mockRes as Response);
      expect(pixoo.setBrightness).toHaveBeenCalledWith(50);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle screen route', async () => {
      mockReq.body = { on: true };
      const screenHandler = mockPost.mock.calls.find(
        (call) => call[0] === '/screen'
      )?.[1];

      await screenHandler?.(mockReq as Request, mockRes as Response);
      expect(pixoo.setScreen).toHaveBeenCalledWith(true);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });
  });
});
