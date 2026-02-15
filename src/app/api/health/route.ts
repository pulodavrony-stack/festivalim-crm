import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const start = Date.now();
  
  try {
    // Check database connection
    const { error } = await supabase.from('cities').select('id').limit(1);
    
    const dbLatency = Date.now() - start;
    
    if (error) {
      return NextResponse.json({
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      latency: {
        db: `${dbLatency}ms`,
      },
      version: process.env.APP_VERSION || '2.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
