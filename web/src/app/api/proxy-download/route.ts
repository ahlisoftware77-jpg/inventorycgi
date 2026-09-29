import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('Invalid ID', { status: 400 });
    }

    const driveUrl = `https://drive.google.com/uc?export=download&id=${id}`;
    const response = await fetch(driveUrl);

    if (!response.ok) {
      return new NextResponse('Error fetching from Drive', { status: response.status });
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        // Allow CORS just in case, though it's same-origin
        'Access-Control-Allow-Origin': '*'
      },
    });

  } catch (error: any) {
    console.error("Proxy error:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
