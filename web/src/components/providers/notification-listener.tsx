'use client';

import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type Asset, type HelpdeskTicket } from '@/lib/types';

/**
 * @fileOverview Komponen listener global untuk notifikasi real-time.
 * Memantau tiket baru dan pengajuan mutasi/disposal yang memerlukan perhatian.
 * Mendukung Notifikasi Sistem (Windows/Mobile) dan Suara.
 */
export default function NotificationListener() {
  const { user } = useAuth();
  const { toast } = useToast();
  const initialized = useRef(false);
  const startTime = useRef(Timestamp.now());

  useEffect(() => {
    if (!user) return;

    // Berikan jeda agar tidak memicu notifikasi untuk data lama saat halaman pertama dimuat
    const timeout = setTimeout(() => {
      initialized.current = true;
    }, 3000);

    const playSound = () => {
      const audio = document.getElementById('notification-sound') as HTMLAudioElement;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.warn("Audio play blocked by browser. User interaction required first.", err);
        });
      }
    };

    const sendSystemNotification = (title: string, body: string) => {
      // Kirim notifikasi ke sistem OS (Windows/Mobile)
      if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === 'granted') {
        try {
          const n = new Notification(title, {
            body: body,
            icon: '/cgi.png', // Ikon besar
            badge: '/cgi.png', // Ikon kecil di status bar mobile
            tag: 'cgi-notif', // Menghindari penumpukan notifikasi yang sama
            silent: false // Biarkan OS yang menentukan suara jika audio API gagal
          });

          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch (e) {
          console.error("Failed to send system notification:", e);
        }
      }
    };

    // 1. Listener untuk Tiket Helpdesk Baru
    const helpdeskQuery = query(
      collection(db, 'helpdesk_tickets'),
      where('reportedAt', '>', startTime.current)
    );

    const unsubHelpdesk = onSnapshot(helpdeskQuery, (snapshot) => {
      if (!initialized.current) return;
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const ticket = change.doc.data() as HelpdeskTicket;
          
          // Admin/IT diberitahu semua tiket baru
          if (user.role === 'Admin' && ticket.reportedBy !== user.uid) {
            const title = 'Tiket Helpdesk Baru';
            const body = `[${ticket.ticketNumber}] ${ticket.reporterName}: ${ticket.description.substring(0, 50)}...`;
            
            playSound();
            sendSystemNotification(title, body);
            toast({ title, description: body });
          }
        }
      });
    });

    // 2. Listener untuk Pengajuan Aset (Mutasi, Disposal, dll)
    const assetQuery = query(
      collection(db, 'assets'),
      where('updatedAt', '>', startTime.current)
    );

    const unsubAssets = onSnapshot(assetQuery, (snapshot) => {
      if (!initialized.current) return;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const asset = change.doc.data() as Asset;
          const isWaiting = asset.status.startsWith('waiting_');
          
          if (isWaiting && asset.requestedBy !== user.uid) {
            const isAdmin = user.role === 'Admin';
            const isAccounting = user.department === 'ACCOUNTING';
            const isTargetDept = asset.mutationTargetDepartment === user.department;
            const isOwnerDept = asset.location === user.department;

            if (isAdmin || isAccounting || isTargetDept || isOwnerDept) {
              const typeLabel = asset.status.split('_')[1]?.toUpperCase() || 'PENGAJUAN';
              const title = `Pengajuan ${typeLabel} Baru`;
              const body = `Aset ${asset.code} (${asset.name}) memerlukan verifikasi Anda.`;
              
              playSound();
              sendSystemNotification(title, body);
              toast({ title, description: body });
            }
          }
        }
      });
    });

    return () => {
      clearTimeout(timeout);
      unsubHelpdesk();
      unsubAssets();
    };
  }, [user, toast]);

  return null;
}
