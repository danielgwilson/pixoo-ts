import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pixoo } from './pixoo';
import axios from 'axios';

vi.mock('axios');

describe('Pixoo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with default options', () => {
    const pixoo = new Pixoo({ ipAddress: null });
    expect(pixoo).toBeDefined();
  });

  it('should throw error on invalid IP address', () => {
    expect(() => new Pixoo({ ipAddress: 'invalid-ip' })).toThrow(
      'Invalid IP address'
    );
  });

  it('should initialize with valid IP address', () => {
    const pixoo = new Pixoo({ ipAddress: '192.168.1.100' });
    expect(pixoo).toBeDefined();
  });

  it('should clear buffer with specified color', () => {
    const pixoo = new Pixoo({ ipAddress: null });
    pixoo.clear([255, 0, 0]);
    // Implementation note: We'd need to expose buffer for testing
    // or add a method to read pixels for proper testing
  });

  it('should send commands to device', async () => {
    const mockResponse = { data: { error_code: 0 } };
    vi.mocked(axios.post).mockResolvedValue(mockResponse);

    const pixoo = new Pixoo({ ipAddress: '192.168.1.100' });
    await pixoo.setBrightness(50);

    expect(axios.post).toHaveBeenCalledWith(
      'http://192.168.1.100/post',
      expect.objectContaining({
        Command: 'Channel/SetBrightness',
        Brightness: 50,
      })
    );
  });

  it('should handle device errors', async () => {
    const mockResponse = {
      data: { error_code: 1, error_message: 'Test error' },
    };
    vi.mocked(axios.post).mockResolvedValue(mockResponse);

    const pixoo = new Pixoo({ ipAddress: '192.168.1.100', debug: true });
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
