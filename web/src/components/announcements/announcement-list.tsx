'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { type Announcement } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, PlusCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import Image from 'next/image';
import AnnouncementForm from './announcement-form';
import DeleteAnnouncementButton from './delete-announcement-button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AnnouncementList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const canManage = user?.role === 'Admin' || ['HR', 'GA', 'HR & GA'].includes(user?.department || '');

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Megaphone className="h-6 w-6" />
                Papan Pengumuman
              </CardTitle>
              <CardDescription>Informasi dan pengumuman penting untuk seluruh karyawan.</CardDescription>
            </div>
            {canManage && (
                <AnnouncementForm>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Buat Pengumuman
                    </Button>
                </AnnouncementForm>
            )}
          </div>
        </CardHeader>
      </Card>
      
      {loading ? (
        <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
                Tidak ada pengumuman saat ini.
            </CardContent>
        </Card>
      ) : (
        announcements.map(announcement => (
          <Card key={announcement.id} className="overflow-hidden">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={announcement.authorAvatarUrl} alt={announcement.authorName} />
                            <AvatarFallback>{announcement.authorName?.charAt(0) || 'A'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{announcement.title}</CardTitle>
                            <CardDescription>
                                Oleh {announcement.authorName} ({announcement.authorDept}) • {announcement.createdAt ? formatDistanceToNow(announcement.createdAt.toDate(), { addSuffix: true, locale: id }) : 'Baru saja'}
                            </CardDescription>
                        </div>
                    </div>
                    {canManage && (
                        <DeleteAnnouncementButton announcementId={announcement.id} announcementTitle={announcement.title} />
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <p className="whitespace-pre-wrap">{announcement.content}</p>
            </CardContent>
            {announcement.imageUrl && (
                <CardFooter className="p-0">
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="relative w-full aspect-[16/9] bg-muted cursor-pointer">
                                <Image 
                                    src={announcement.imageUrl} 
                                    alt={`Gambar untuk ${announcement.title}`} 
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </DialogTrigger>
                        <DialogContent className="h-[90vh] bg-transparent border-none shadow-none flex items-center justify-center p-0">
                             <DialogHeader className="sr-only">
                                <DialogTitle>Gambar: {announcement.title}</DialogTitle>
                                <DialogDescription>Tampilan gambar yang diperbesar untuk pengumuman "{announcement.title}".</DialogDescription>
                            </DialogHeader>
                            <Image 
                                src={announcement.imageUrl} 
                                alt={`Gambar untuk ${announcement.title}`}
                                width={1200}
                                height={800}
                                className="object-contain max-w-full max-h-full"
                            />
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
