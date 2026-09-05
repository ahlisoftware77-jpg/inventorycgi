import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let uploadLimiter: Ratelimit | null = null;
let emailLimiter: Ratelimit | null = null;
let generalApiLimiter: Ratelimit | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // 10 requests per minute for drive upload/delete API
    uploadLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
    });

    // 5 requests per hour for email (very strict to prevent spam)
    emailLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
    });

    // 100 requests per minute for general API
    generalApiLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
    });
  }
} catch (e) {
  console.warn("Upstash Redis initialization failed. Rate limiting is disabled.");
}

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const path = request.nextUrl.pathname;

  // Hanya terapkan rate limiting ke route /api
  if (path.startsWith('/api/') && redis) {
    let limitResult;

    try {
      if (path.startsWith('/api/upload-drive') || path.startsWith('/api/delete-drive')) {
        limitResult = await uploadLimiter?.limit(ip);
      } else if (path.startsWith('/api/send-email')) {
        limitResult = await emailLimiter?.limit(ip);
      } else {
        limitResult = await generalApiLimiter?.limit(ip);
      }

      if (limitResult && !limitResult.success) {
        return new NextResponse(
          JSON.stringify({ 
            error: 'Terlalu banyak permintaan (Too Many Requests). Silakan tunggu beberapa saat.',
            status: 429 
          }),
          { 
            status: 429, 
            headers: { 
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limitResult.limit.toString(),
              'X-RateLimit-Remaining': limitResult.remaining.toString(),
              'X-RateLimit-Reset': limitResult.reset.toString(),
            } 
          }
        );
      }
      
      // Inject rate limit headers for successful requests
      const response = NextResponse.next();
      if (limitResult) {
        response.headers.set('X-RateLimit-Limit', limitResult.limit.toString());
        response.headers.set('X-RateLimit-Remaining', limitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', limitResult.reset.toString());
      }
      return response;
      
    } catch (e) {
      console.error("Rate limiting error:", e);
      // Fallback: biarkan request lolos jika Redis/RateLimiter mengalami masalah
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
