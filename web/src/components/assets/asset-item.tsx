'use client';

import { type Asset, type AssetStatus } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { ChevronDown, Tag, Laptop, Crown, User as UserIcon, MapPin, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import * as React from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface AssetItemProps {
  asset: Asset;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  isSelectionMode: boolean;
}

export const getAlertStyles = (status: AssetStatus, condition: string) => {
    const isDamaged = condition === 'Rusak' || status === 'approved_disposal';
    const isWarning = status.startsWith('waiting_') || status === 'karyawan_approved' || condition === 'Perlu Perbaikan' || condition === 'Sedang Dalam Perbaikan';
    const isPersonal = status === 'Bukan_Asset_Perusahaan';

    if (isDamaged) {
        return {
            container: "bg-rose-500/[0.04] border border-rose-500/20 text-rose-900 dark:text-rose-100 hover:bg-rose-500/[0.08] shadow-[0_4px_20px_rgba(244,63,94,0.02)]",
            emoji: "🚨",
            titleClass: "text-rose-800 dark:text-rose-300",
            textClass: "text-rose-600/80 dark:text-rose-400/70",
            badge: "Rusak / Disposal",
            badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none"
        };
    }
    if (isWarning) {
        return {
            container: "bg-amber-500/[0.04] border border-amber-500/25 text-amber-900 dark:text-amber-100 hover:bg-amber-500/[0.08] shadow-[0_4px_20px_rgba(245,158,11,0.02)]",
            emoji: "⚠️",
            titleClass: "text-amber-800 dark:text-amber-300",
            textClass: "text-amber-600/80 dark:text-amber-400/70",
            badge: "Perlu Tindakan",
            badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none"
        };
    }
    if (isPersonal) {
        return {
            container: "bg-sky-500/[0.04] border border-sky-500/20 text-sky-900 dark:text-sky-100 hover:bg-sky-500/[0.08] shadow-[0_4px_20px_rgba(14,165,233,0.02)]",
            emoji: "👤",
            titleClass: "text-sky-800 dark:text-sky-300",
            textClass: "text-sky-600/80 dark:text-sky-400/70",
            badge: "Bukan Aset CGI",
            badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-none"
        };
    }
    return {
        container: "bg-emerald-500/[0.03] border border-emerald-500/15 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-500/[0.06] shadow-[0_4px_20px_rgba(16,185,129,0.02)]",
        emoji: "🟢",
        titleClass: "text-emerald-800 dark:text-emerald-300",
        textClass: "text-emerald-600/85 dark:text-emerald-400/75",
        badge: "Normal / Aktif",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none"
    };
};

export default function AssetItem({ asset, isExpanded, onToggle, isSelected, onSelect, isSelectionMode }: AssetItemProps) {
  const styles = getAlertStyles(asset.status, asset.condition);
  const StatusIcon = styles.icon;
  
  const [hasITProfile, setHasITProfile] = React.useState(false);
  
  const galleryImages = [
    asset.photoURL,
    asset.photoURL2,
    asset.photoURL3,
    asset.photoURL4,
  ].filter((url): url is string => !!url && url.length > 0);

  if (galleryImages.length === 0) {
    galleryImages.push('https://placehold.co/200x200/F1F5F9/64748B?text=No+Photo');
  }

  const isBlinkingWarning = asset.status.startsWith('waiting_') || asset.status === 'karyawan_approved';
  const isBlinkingError = asset.condition === 'Rusak' || asset.status === 'waiting_disposal';

  React.useEffect(() => {
    const checkIT = async () => {
        if (!asset.code) return;
        const q = query(collection(db, 'it_assets'), where('assetCode', '==', asset.code));
        const snap = await getDocs(q);
        if (!snap.empty) setHasITProfile(true);
    };
    checkIT();
  }, [asset.code]);

  return (
    <div className="flex items-center gap-3 sm:gap-4 text-left group">
      {isSelectionMode && (
        <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(!!checked)}
            onClick={(e) => e.stopPropagation()}
            className="transition-all animate-in zoom-in-50 h-5 w-5 rounded-lg border-primary/30 shrink-0"
        />
      )}
      
      <div 
        role="alert" 
        onClick={onToggle}
        className={cn(
            "flex-grow flex items-center p-3 rounded-xl border transition-all duration-300 ease-in-out cursor-pointer relative overflow-hidden",
            styles.container,
            isExpanded && "ring-2 ring-primary/10 shadow-sm border-slate-200 dark:border-slate-800",
            isBlinkingError && "blinking-destructive-border",
            isBlinkingWarning && "blinking-process-border"
        )}
      >
          <div className="flex items-center gap-4 flex-1 min-w-0">
             <Dialog>
              <DialogTrigger asChild>
                <div 
                  className="relative h-14 w-14 rounded-xl overflow-hidden cursor-pointer group shrink-0 shadow-sm border border-slate-100 bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image 
                    src={galleryImages[0]} 
                    alt={asset.name} 
                    fill
                    sizes="60px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <span className="text-[8px] text-white font-black uppercase tracking-widest">VIEW</span>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:max-w-lg p-0 bg-transparent border-none overflow-hidden flex flex-col items-center justify-center">
                  <DialogTitle className="sr-only">Pratinjau Foto {asset.name}</DialogTitle>
                  <Carousel className="w-full">
                      <CarouselContent>
                          {galleryImages.map((url, index) => (
                              <CarouselItem key={index}>
                                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                                      <Image
                                          src={url}
                                          alt={`${asset.name} - Foto ${index + 1}`}
                                          fill
                                          className="object-cover"
                                      />
                                  </div>
                              </CarouselItem>
                          ))}
                      </CarouselContent>
                      {galleryImages.length > 1 && (
                          <>
                              <CarouselPrevious className="left-4 bg-slate-900/60 hover:bg-slate-900/80 border-none text-white h-10 w-10 rounded-full" />
                              <CarouselNext className="right-4 bg-slate-900/60 hover:bg-slate-900/80 border-none text-white h-10 w-10 rounded-full" />
                          </>
                      )}
                  </Carousel>
                  <div className="mt-4 px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-widest text-center shadow-lg border border-white/10 max-w-[90%] truncate">
                      {asset.name}
                  </div>
              </DialogContent>
            </Dialog>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-1.5 text-left">
                <span className="text-sm shrink-0 select-none">{styles.emoji}</span>
                <h3 className={cn("font-extrabold text-sm sm:text-base uppercase tracking-tight truncate leading-tight", styles.titleClass)}>
                    {asset.name}
                </h3>
                {asset.status === 'Bukan_Asset_Perusahaan' && <Crown className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />}
                {hasITProfile && (
                    <Badge variant="outline" className="h-5 px-1.5 border-blue-200 bg-blue-50 text-blue-600 shrink-0">
                        <Laptop className="h-3 w-3" />
                    </Badge>
                )}
              </div>
              <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-widest", styles.textClass)}>
                <span className="font-mono bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-[9px] font-extrabold">{asset.code}</span>
                <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 h-3 opacity-60" />
                    <span>{asset.location}</span>
                </div>
                {asset.user && (
                  <div className="flex items-center gap-1.5">
                      <UserIcon className="h-3 h-3 opacity-60" /> 
                      <span>{asset.user}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center shrink-0 gap-4 ml-4">
            <div className="hidden sm:flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{styles.badge}</span>
                <Badge className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full", styles.badgeClass)}>
                    {asset.status.replace(/_/g, ' ')}
                </Badge>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-350 transition-colors"
            >
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          </div>
      </div>
    </div>
  );
}
