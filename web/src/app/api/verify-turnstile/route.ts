import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token missing' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use environment variable in production, fallback to test key
    const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    const data = await verifyResponse.json();

    if (data.success) {
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    } else {
      return NextResponse.json(
        { success: false, error: data['error-codes'] || 'Validation failed' },
        { status: 403, headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('Turnstile verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message, stack: error.stack },
      { status: 500, headers: corsHeaders }
    );
  }
}
