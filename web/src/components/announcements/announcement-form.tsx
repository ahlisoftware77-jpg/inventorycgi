'use client';

import { useState, useRef, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, UploadCloud, FileImage, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

const announcementSchema = z.object({
  title: z.string().min(5, { message: "Judul minimal 5 karakter." }),
  content: z.string().min(10, { message: "Konten minimal 10 karakter." }),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

interface AnnouncementFormProps {
  children: ReactNode;
}

export default function AnnouncementForm({ children }: AnnouncementFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '' },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (): Promise<string | undefined> => {
    if (!selectedFile) return undefined;
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        return data.secure_url;
      } else {
        throw new Error(data.error.message || 'Gagal mengunggah gambar.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  async function onSubmit(values: AnnouncementFormValues) {
    if (!user) return;
    setIsLoading(true);

    try {
      const imageUrl = await handleUpload();

      await addDoc(collection(db, 'announcements'), {
        ...values,
        imageUrl: imageUrl || '',
        authorId: user.uid,
        authorName: user.displayName,
        authorAvatarUrl: user.photoURL || '',
        authorDept: user.department,
        createdAt: serverTimestamp(),
      });
      
      toast({ title: 'Berhasil', description: 'Pengumuman telah dipublikasikan.' });
      setIsOpen(false);
      form.reset();
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal mempublikasikan pengumuman.' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="dialog-approve">
        <DialogHeader>
          <DialogTitle>Buat Pengumuman Baru</DialogTitle>
          <DialogDescription>Tulis dan publikasikan pengumuman untuk seluruh karyawan.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Judul Pengumuman</FormLabel>
                <FormControl><Input placeholder="Judul..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Isi Pengumuman</FormLabel>
                <FormControl><Textarea placeholder="Isi pengumuman..." {...field} className="min-h-[120px]" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="space-y-2">
              <FormLabel>Lampirkan Gambar (Opsional)</FormLabel>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <FileImage className="mr-2 h-4 w-4" />
                  Pilih Gambar
                </Button>
                <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
              {previewUrl && (
                <div className="mt-2 flex items-center gap-2 p-2 border rounded-md bg-muted">
                  <Image src={previewUrl} alt="Preview" width={80} height={80} className="rounded-md object-cover" />
                  <span className="text-sm truncate max-w-48">{selectedFile?.name}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary" disabled={isLoading}>Batal</Button></DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publikasikan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
