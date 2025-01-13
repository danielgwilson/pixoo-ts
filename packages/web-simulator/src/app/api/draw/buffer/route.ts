import { NextResponse } from 'next/server';
import { Pixoo } from '@pixoo-ts/core';

// Share the same singleton instance
const pixoo = new Pixoo({ ipAddress: null, debug: true });

export async function GET() {
  try {
    const buffer = pixoo.bufferState;
    console.log('[API] Returning buffer state:', buffer.slice(0, 10));
    return NextResponse.json({ buffer });
  } catch (error) {
    console.error('[API] Error getting buffer state:', error);
    return NextResponse.json(
      { error_code: 1, error_message: 'Internal server error' },
      { status: 500 }
    );
  }
}
