'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { type Asset } from '@/lib/types';
import { Image as ImageIcon, ExternalLink, Camera } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DashboardGalleryProps {
  assets: Asset[];
}

export default function DashboardGallery({ assets }: DashboardGalleryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Ambil aset yang memiliki gambar, urutkan dari yang terbaru
  const galleryAssets = useMemo(() => {
    const sorted = assets
      .filter(asset => asset.photoURL && asset.photoURL.trim() !== '')
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    return showAll ? sorted : sorted.slice(0, 10);
  }, [assets, showAll]);

  if (galleryAssets.length === 0) {
    return (
      <Card className="h-full border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden rounded-[2rem]">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Galeri Aset Terkini
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 opacity-30">
          <ImageIcon className="h-10 w-10 mb-3" />
          <p className="text-xs font-black uppercase tracking-widest">Belum ada foto aset</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden rounded-[2rem] flex flex-col">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <Camera className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Galeri Visual Aset
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                Foto {showAll ? 'semua' : galleryAssets.length} aset
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="h-8 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-black uppercase tracking-widest text-[9px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            {showAll ? 'Tutup Tampilan Penuh' : 'Tampilkan Semua Foto'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 flex-1">
        <div className={cn(
          "flex gap-4 pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800",
          showAll 
            ? "flex-wrap max-h-[600px] overflow-y-auto items-center justify-center sm:justify-start" 
            : "overflow-x-auto snap-x snap-mandatory"
        )}>
          {galleryAssets.map(asset => (
            <div 
              key={asset.id}
              className={cn(
                "relative shrink-0 rounded-2xl overflow-hidden group bg-slate-100 dark:bg-slate-800 border-2 border-transparent hover:border-indigo-500/30 transition-all cursor-pointer",
                showAll ? "w-32 h-32 sm:w-40 sm:h-40" : "w-48 h-48 sm:w-56 sm:h-56 snap-start"
              )}
              onMouseEnter={() => setHoveredId(asset.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* @ts-ignore */}
              <Image 
                src={asset.photoURL!} 
                alt={asset.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              
              {/* Content overlay */}
              <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity delay-75">
                  <Badge variant="secondary" className="bg-white/20 text-white border-none backdrop-blur-md text-[8px] uppercase tracking-widest px-2 py-0">
                    {asset.location}
                  </Badge>
                </div>
                <h4 className="font-bold text-white text-sm truncate leading-tight drop-shadow-md">
                  {asset.name}
                </h4>
                <p className="text-white/70 text-[10px] font-mono mt-0.5">
                  {asset.code}
                </p>
              </div>

              {/* View detail button (appears on hover) */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/assets?search=${asset.code}`}>
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
