import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import fs from 'fs'; // Use regular fs for streams
import fsPromises from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');
    let filePath = searchParams.get('path');
    const b64path = searchParams.get('b64path');
    if (b64path) {
      filePath = Buffer.from(b64path, 'base64').toString('utf-8');
    }
    
    // or via headers if fetch is used. For direct browser downloads,
    // query parameter is required if we want to use <a> tags without fetch.
    let token = searchParams.get('token');
    const isPreview = searchParams.get('preview') === 'true';
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split('Bearer ')[1];
      }
    }

    let decodedToken = null;
    if (token) {
      try {
        decodedToken = await auth.verifyIdToken(token);
      } catch (e) {
        console.warn("Invalid token but continuing as public guest");
      }
    }
    
    if (!shareId || !filePath || !db) {
      return NextResponse.json({ error: 'Missing shareId, path, or db not initialized' }, { status: 400 });
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
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.zip': 'application/zip'
    };
    
    const isPdfJs = searchParams.get('ispdfjs') === 'true';
    const contentType = isPdfJs ? 'application/octet-stream' : (contentTypeMap[ext] || 'application/octet-stream');
    const fileName = path.basename(targetPath);

    // Handle Range Requests for streaming video
    const rangeHeader = request.headers.get('range');
    const fileSize = stat.size;
    
    if (rangeHeader && isPreview) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      if (start >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`
          }
        });
      }
      
      if (end >= fileSize) {
        end = fileSize - 1;
      }
      
      const chunksize = (end - start) + 1;
      const stream = fs.createReadStream(targetPath, { start, end });
      const webStream = Readable.toWeb(stream);
      
      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
          'Content-Disposition': isPdfJs ? 'inline' : `inline; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    }

    // Create full stream for standard download
    const stream = fs.createReadStream(targetPath);
    const webStream = Readable.toWeb(stream);
    const disposition = isPreview ? 'inline' : 'attachment';
    const finalDisposition = isPdfJs ? disposition : `${disposition}; filename="${encodeURIComponent(fileName)}"`;
    return new NextResponse(webStream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': finalDisposition,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes', // Helps with video seeking
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
