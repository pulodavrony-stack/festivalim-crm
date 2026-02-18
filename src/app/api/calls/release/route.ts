import { NextRequest, NextResponse } from 'next/server';
import { releaseCall } from '@/lib/uis-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callSessionId } = body;

    if (!callSessionId) {
      return NextResponse.json(
        { error: 'callSessionId обязателен' },
        { status: 400 }
      );
    }

    const result = await releaseCall(callSessionId);

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error: any) {
    console.error('Release call error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
