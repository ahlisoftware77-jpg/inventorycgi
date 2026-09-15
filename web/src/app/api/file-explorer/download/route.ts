import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import fs from 'fs'; // Use regular fs for streams
import fsPromises from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');
    const filePath = searchParams.get('path');
    
    // Auth could be via query parameter for direct download links
    // or via headers if fetch is used. For direct browser downloads,
    // query parameter is required if we want to use <a> tags without fetch.
    let token = searchParams.get('token');
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split('Bearer ')[1];
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    
    if (!shareId || !filePath || !db) {
      return NextResponse.json({ error: 'Missing shareId, path, or db not initialized' }, { status: 400 });
    }

    const shareDoc = await db.collection('file_shares').doc(shareId).get();
    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }
    
    const shareData = shareDoc.data();
    
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    const isManager = userData?.role === 'Admin' || userData?.department?.toUpperCase() === 'IT';
    const isAllowed = shareData?.allowedUsers?.includes(decodedToken.uid) || isManager;
    
    if (!isAllowed) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const basePath = shareData?.path; 
    if (!basePath) {
      return NextResponse.json({ error: 'Invalid share configuration' }, { status: 500 });
    }

    // Pastikan koneksi SMB terbuka menggunakan kredensial .env (jika ada)
    const { ensureSmbConnection } = require('@/lib/smb-utils');
    await ensureSmbConnection(basePath);

    const safeRelative = filePath.replace(/^[/\\]+/, '');
    if (safeRelative.includes('..')) {
      return NextResponse.json({ error: 'Invalid path traversal' }, { status: 403 });
    }

    const targetPath = safeRelative 
      ? (basePath.endsWith('\\') || basePath.endsWith('/') ? basePath + safeRelative : basePath + '\\' + safeRelative)
      : basePath;

    const stat = await fsPromises.stat(targetPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    // Determine content type (basic)
    const ext = path.extname(targetPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.zip': 'application/zip'
    };
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    const fileName = path.basename(targetPath);

    // Create stream
    const stream = fs.createReadStream(targetPath);
    
    // Return stream with appropriate headers
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': stat.size.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('File Download Error:', error);
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
    }
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      return NextResponse.json({ error: 'Akses ditolak (EPERM)' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
