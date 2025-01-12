'use client';

import { useEffect, useRef, useState } from 'react';
import { clearDisplay, drawPattern, drawPixel, drawLine } from '@/app/actions';
import { Button } from '@/components/ui/button';

const SCALE = 8; // Each pixel will be 8x8

export function PixooSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [buffer, setBuffer] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // Draw the buffer to canvas whenever it changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create ImageData for the display
    const imageData = ctx.createImageData(64, 64);
    for (let i = 0; i < 64 * 64; i++) {
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
    tempCanvas.width = 64;
    tempCanvas.height = 64;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0, 64, 64, 0, 0, 64 * SCALE, 64 * SCALE);
  }, [buffer]);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / canvas.clientWidth) * 64);
    const y = Math.floor(((e.clientY - rect.top) / canvas.clientHeight) * 64);

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
    const x = Math.floor(((e.clientX - rect.left) / canvas.clientWidth) * 64);
    const y = Math.floor(((e.clientY - rect.top) / canvas.clientHeight) * 64);

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
        width={64 * SCALE}
        height={64 * SCALE}
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
