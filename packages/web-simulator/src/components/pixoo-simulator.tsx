'use client';

import { useEffect, useRef, useState } from 'react';
import { clearDisplay, drawPattern, drawPixel, drawLine } from '@/app/actions';
import { Button } from './ui/button';
import { Pixoo } from '@pixoo-ts/core';

const SCALE = 8; // Each pixel will be 8x8
const pixoo = new Pixoo({ ipAddress: null });
const DISPLAY_SIZE = pixoo.displaySize;
const POLL_INTERVAL = 50; // Poll every 50ms

export function PixooSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [buffer, setBuffer] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // Poll for buffer updates
  useEffect(() => {
    const pollBuffer = async () => {
      try {
        const response = await fetch('/api/draw/buffer');
        if (response.ok) {
          const data = await response.json();
          setBuffer(data.buffer);
        }
      } catch (error) {
        console.error('Error polling buffer:', error);
      }
    };

    const interval = setInterval(pollBuffer, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Draw the buffer to canvas whenever it changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create ImageData for the display
    const imageData = ctx.createImageData(DISPLAY_SIZE, DISPLAY_SIZE);
    for (let i = 0; i < DISPLAY_SIZE * DISPLAY_SIZE; i++) {
      const offset = i * 4;
      const bOff = i * 3;
      imageData.data[offset] = buffer[bOff] ?? 0; // R
      imageData.data[offset + 1] = buffer[bOff + 1] ?? 0; // G
      imageData.data[offset + 2] = buffer[bOff + 2] ?? 0; // B
      imageData.data[offset + 3] = 255; // Alpha
    }

    // Scale up the image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Create a temporary canvas for scaling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = DISPLAY_SIZE;
    tempCanvas.height = DISPLAY_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(
      tempCanvas,
      0,
      0,
      DISPLAY_SIZE,
      DISPLAY_SIZE,
      0,
      0,
      DISPLAY_SIZE * SCALE,
      DISPLAY_SIZE * SCALE
    );
  }, [buffer]);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(
      ((e.clientX - rect.left) / canvas.clientWidth) * DISPLAY_SIZE
    );
    const y = Math.floor(
      ((e.clientY - rect.top) / canvas.clientHeight) * DISPLAY_SIZE
    );

    if (!isDrawing) {
      setIsDrawing(true);
      setStartPos({ x, y });
    } else {
      setIsDrawing(false);
      if (startPos) {
        const newBuffer = await drawLine(
          startPos.x,
          startPos.y,
          x,
          y,
          [255, 255, 255]
        );
        setBuffer(newBuffer);
        setStartPos(null);
      }
    }
  };

  const handleCanvasMouseMove = async (
    e: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(
      ((e.clientX - rect.left) / canvas.clientWidth) * DISPLAY_SIZE
    );
    const y = Math.floor(
      ((e.clientY - rect.top) / canvas.clientHeight) * DISPLAY_SIZE
    );

    const newBuffer = await drawPixel(x, y, [255, 255, 255]);
    setBuffer(newBuffer);
  };

  // Example controls
  const handleClear = async () => {
    const newBuffer = await clearDisplay([0, 0, 0]);
    setBuffer(newBuffer);
  };

  const handleDrawPattern = async () => {
    const newBuffer = await drawPattern();
    setBuffer(newBuffer);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={DISPLAY_SIZE * SCALE}
        height={DISPLAY_SIZE * SCALE}
        className="border border-gray-500 cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
      />
      <div className="flex gap-2">
        <Button onClick={handleClear}>Clear</Button>
        <Button onClick={handleDrawPattern}>Draw Pattern</Button>
      </div>
      <p className="text-sm text-gray-500">
        Click to start drawing a line, click again to finish. Move mouse to draw
        freehand.
      </p>
    </div>
  );
}
