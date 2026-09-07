import { auth } from '@/lib/firebase-admin';

export async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid token');
  }
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Token verification failed:", error);
    throw new Error('Unauthorized: Invalid token');
  }
}

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') || '*';
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
