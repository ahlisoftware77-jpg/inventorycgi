import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');
    const folderPath = searchParams.get('path') || '/';
    
    const authHeader = request.headers.get('authorization');
    let decodedToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        decodedToken = await auth.verifyIdToken(token);
      } catch (e) {
        console.warn("Invalid token but continuing as public guest");
      }
    }
    
    if (!shareId || !db) {
      return NextResponse.json({ error: 'Missing shareId or db not initialized' }, { status: 400 });
    }

    const shareDoc = await db.collection('file_shares').doc(shareId).get();
    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }
    
    const shareData = shareDoc.data();
    
    // Check if it's active
    if (shareData?.status !== 'active') {
       return NextResponse.json({ error: 'Share is inactive' }, { status: 403 });
    }
    
    let isAllowed = true; // Default public access
    if (decodedToken) {
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();
        const isManager = userData?.role === 'Admin' || userData?.department?.toUpperCase() === 'IT';
        // Note: For public access, we don't really need to restrict by allowedUsers anymore, 
        // but if you want to keep restriction for non-managers, you can toggle this.
        // For now, it's public.
    }

    const basePath = shareData?.path; 
    if (!basePath) {
      return NextResponse.json({ error: 'Invalid share configuration' }, { status: 500 });
    }

    // Pastikan koneksi SMB terbuka menggunakan kredensial .env (jika ada)
    const { ensureSmbConnection } = require('@/lib/smb-utils');
    await ensureSmbConnection(basePath);

    const safeRelative = folderPath.replace(/^[/\\]+/, '');
    if (safeRelative.includes('..')) {
      return NextResponse.json({ error: 'Invalid path traversal' }, { status: 403 });
    }

    const targetPath = safeRelative 
      ? (basePath.endsWith('\\') || basePath.endsWith('/') ? basePath + safeRelative : basePath + '\\' + safeRelative)
      : basePath;

    const items = await fs.readdir(targetPath, { withFileTypes: true });
    
    const result = (await Promise.all(items.map(async (item) => {
      try {
        const itemPath = targetPath.endsWith('\\') || targetPath.endsWith('/') 
          ? targetPath + item.name 
          : targetPath + '\\' + item.name;
          
        const stat = await fs.stat(itemPath);
        return {
          name: item.name,
          isDirectory: stat.isDirectory(),
          size: stat.size,
          mtime: stat.mtimeMs
        };
      } catch (e) {
        return null;
      }
    }))).filter(Boolean) as { name: string; isDirectory: boolean; size: number; mtime: number }[];

    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return NextResponse.json({ items: result, currentPath: safeRelative ? '/' + safeRelative.replace(/\\/g, '/') : '/' });
  } catch (error: any) {
    console.error('File Explorer Error:', error);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Folder tidak ditemukan' }, { status: 404 });
    }
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      return NextResponse.json({ error: 'Akses ditolak oleh server (EPERM)' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
