import { NextResponse } from 'next/server';
import { Pixoo } from '@pixoo-ts/core';

// Create a singleton instance for the simulator
const pixoo = new Pixoo({ ipAddress: null, debug: true });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[API] Received draw request:', body);

    // If it's a buffer update from simulator mode
    if (body.buffer) {
      console.log('[API] Updating buffer from simulator');
      pixoo.updateBuffer(body.buffer);
      return NextResponse.json({ error_code: 0 });
    }

    // If it's a standard Pixoo command
    const { Command, ...rest } = body;
    console.log('[API] Processing command:', Command);

    // Handle different commands
    switch (Command) {
      case 'Draw/SendHttpGif': {
        const { PicData } = rest;
        console.log('[API] Processing SendHttpGif command');
        const buffer = Buffer.from(PicData, 'base64');
        pixoo.updateBuffer(Array.from(buffer));
        break;
      }
      // Add other command handlers as needed
    }

    return NextResponse.json({ error_code: 0 });
  } catch (error) {
    console.error('[API] Error handling draw command:', error);
    return NextResponse.json(
      { error_code: 1, error_message: 'Internal server error' },
      { status: 500 }
    );
  }
}
