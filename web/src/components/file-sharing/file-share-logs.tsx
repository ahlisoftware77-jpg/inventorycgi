'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { FileShareLog } from './types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function FileShareLogs() {
  const [logs, setLogs] = useState<FileShareLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ambil 100 log terakhir
    const q = query(collection(db, 'file_share_logs'), orderBy('accessedAt', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs: FileShareLog[] = [];
      snapshot.forEach((doc) => {
        fetchedLogs.push({ id: doc.id, ...doc.data() } as FileShareLog);
      });
      setLogs(fetchedLogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat log akses...</div>;
  }

  if (logs.length === 0) {
    return <div className="p-8 text-center text-slate-500">Belum ada riwayat akses file sharing.</div>;
  }

  return (
    <div className="rounded-md border bg-white dark:bg-slate-900 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
          <TableRow>
            <TableHead>Waktu Akses</TableHead>
            <TableHead>Pengguna</TableHead>
            <TableHead>File Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap text-sm">
                {format(new Date(log.accessedAt), 'dd MMM yyyy, HH:mm', { locale: id })}
              </TableCell>
              <TableCell>
                <div className="font-medium text-slate-900 dark:text-slate-100">{log.userName}</div>
                <div className="text-xs text-slate-500">{log.userId}</div>
              </TableCell>
              <TableCell className="font-medium text-blue-600 dark:text-blue-400">
                {log.shareName}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
