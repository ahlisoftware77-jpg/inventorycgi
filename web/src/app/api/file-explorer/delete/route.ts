import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { shareId, path: targetFilePath } = await request.json();
    
    if (!targetFilePath || !shareId) {
      return NextResponse.json({ error: 'Missing path or shareId' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    let decodedToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        decodedToken = await auth.verifyIdToken(token);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!db) {
      return NextResponse.json({ error: 'db not initialized' }, { status: 500 });
    }

    const shareDoc = await db.collection('file_shares').doc(shareId).get();
    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }
    
    const shareData = shareDoc.data();
    
    if (shareData?.status !== 'active') {
       return NextResponse.json({ error: 'Share is inactive' }, { status: 403 });
    }
    
    if (shareData?.allowDelete !== true) {
      return NextResponse.json({ error: 'Penghapusan file tidak diizinkan pada folder ini' }, { status: 403 });
    }

    // Check user permissions
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    const isAdminOrIT = userData?.role === 'Admin' || userData?.department?.toUpperCase() === 'IT';
    
    const deleteAllowedUsers = shareData?.deleteAllowedUsers || [];
    
    if (!isAdminOrIT && !deleteAllowedUsers.includes(decodedToken.uid)) {
        return NextResponse.json({ error: 'Anda tidak memiliki akses untuk menghapus file ini' }, { status: 403 });
    }

    const basePath = shareData?.path; 
    if (!basePath) {
      return NextResponse.json({ error: 'Invalid share configuration' }, { status: 500 });
    }

    // Pastikan koneksi SMB terbuka menggunakan kredensial .env (jika ada)
    const { ensureSmbConnection } = require('@/lib/smb-utils');
    await ensureSmbConnection(basePath);

    const safeRelative = targetFilePath.replace(/^[/\\]+/, '');
    if (safeRelative.includes('..')) {
      return NextResponse.json({ error: 'Invalid path traversal' }, { status: 403 });
    }

    const fullPath = safeRelative 
      ? (basePath.endsWith('\\') || basePath.endsWith('/') ? basePath + safeRelative : basePath + '\\' + safeRelative)
      : basePath;

    // Check if it exists
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
      }
      throw err;
    }

    // Logging
    try {
      const userName = userData?.name || 'User Terhapus';
      const userDept = userData?.department || '-';
      const itemName = path.basename(fullPath);
      
      await db.collection('system_logs').add({
        type: 'FILE_SHARING',
        action: 'DELETE',
        description: `Menghapus file/folder: ${itemName}`,
        targetId: shareId,
        targetCode: shareData?.name || 'Share Folder',
        userId: decodedToken.uid,
        userName,
        userDept,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('Failed to write log:', logErr);
    }

    return NextResponse.json({ success: true, message: 'File berhasil dihapus' });
    
  } catch (error: any) {
    console.error('File Delete Error:', error);
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      return NextResponse.json({ error: 'Akses ditolak oleh OS (EPERM/EACCES)' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
