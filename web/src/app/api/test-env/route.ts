import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.FIREBASE_PRIVATE_KEY || '';
  return NextResponse.json({
    rawLength: key.length,
    includesLiteralN: key.includes('\\n'),
    includesRealNewline: key.includes('\n'),
    parsed1: key.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim()
  });
}
