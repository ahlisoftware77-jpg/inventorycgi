import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const shareId = formData.get('shareId') as string;
    const folderPath = (formData.get('path') as string) || '/';
    
    if (!file || !shareId) {
      return NextResponse.json({ error: 'Missing file or shareId' }, { status: 400 });
    }

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
    
    if (!db) {
      return NextResponse.json({ error: 'db not initialized' }, { status: 400 });
    }

    const shareDoc = await db.collection('file_shares').doc(shareId).get();
    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }
    
    const shareData = shareDoc.data();
    
    if (shareData?.status !== 'active') {
       return NextResponse.json({ error: 'Share is inactive' }, { status: 403 });
    }
    
    const allowedUsers = shareData?.allowedUsers || [];
    if (allowedUsers.length > 0) {
       if (!decodedToken) {
           return NextResponse.json({ error: 'Login required for this private folder' }, { status: 401 });
       }
       const userDoc = await db.collection('users').doc(decodedToken.uid).get();
       const userData = userDoc.data();
       const isAdmin = userData?.role === 'Admin';
       if (!isAdmin && !allowedUsers.includes(decodedToken.uid)) {
           return NextResponse.json({ error: 'Access denied to this private folder' }, { status: 403 });
       }
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

    // Build full file path
    const targetFilePath = targetPath.endsWith('\\') || targetPath.endsWith('/') 
      ? targetPath + file.name 
      : targetPath + '\\' + file.name;

    // Convert file to buffer and write
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.writeFile(targetFilePath, buffer);

    return NextResponse.json({ success: true, message: 'File uploaded successfully' });
  } catch (error: any) {
    console.error('Upload Error:', error);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Folder tidak ditemukan' }, { status: 404 });
    }
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      return NextResponse.json({ error: 'Akses ditolak oleh server (EPERM)' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
