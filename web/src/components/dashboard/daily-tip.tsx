'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, ShieldAlert, Zap, Info, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';

const TIPS = [
  {
    type: 'Asset',
    title: 'Labeling Aset',
    content: 'Pastikan setiap aset baru langsung diberikan label barcode/QR code untuk menghindari aset tidak terlacak di kemudian hari.',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30'
  },
  {
    type: 'K3',
    title: 'Keselamatan Kabel Listrik',
    content: 'Jangan biarkan kabel peralatan listrik melintang di jalur lalu lalang. Gunakan pelindung kabel untuk mencegah bahaya tersandung (Trip Hazard).',
    icon: ShieldAlert,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30'
  },
  {
    type: 'Asset',
    title: 'Pemeliharaan Rutin',
    content: 'Jadwalkan pemeliharaan preventif untuk mesin dan perangkat IT agar umur pakai (lifetime) aset lebih optimal dan terhindar dari kerusakan mendadak.',
    icon: Lightbulb,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30'
  },
  {
    type: 'K3',
    title: 'Postur Kerja',
    content: 'Saat menggunakan komputer/laptop di meja, pastikan posisi layar sejajar dengan mata dan gunakan kursi ergonomis untuk mencegah cedera leher dan punggung.',
    icon: ShieldAlert,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30'
  },
  {
    type: 'Asset',
    title: 'Prosedur Peminjaman',
    content: 'Selalu catat setiap pergerakan atau peminjaman aset (mutasi) di sistem. Aset yang tidak terlacak dapat menyebabkan selisih pada laporan audit.',
    icon: Info,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30'
  },
  {
    type: 'K3',
    title: 'Prosedur Evakuasi',
    content: 'Pastikan lorong atau jalan menuju pintu darurat tidak terhalang oleh tumpukan barang atau aset yang sedang tidak digunakan.',
    icon: ShieldAlert,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30'
  },
  {
    type: 'Asset',
    title: 'Pembersihan Debu',
    content: 'Bersihkan peralatan IT (seperti PC, server, dan printer) dari debu secara berkala untuk mencegah overheating dan kerusakan komponen.',
    icon: Lightbulb,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30'
  },
  {
    type: 'K3',
    title: 'Pengangkatan Barang',
    content: 'Gunakan teknik mengangkat yang benar: tekuk lutut Anda, jaga punggung tetap lurus, dan jangan memutar tubuh saat membawa barang berat.',
    icon: ShieldAlert,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30'
  }
];

export default function DailyTip() {
  const [k3TipIndex, setK3TipIndex] = useState<number>(0);
  const [assetTipIndex, setAssetTipIndex] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [refreshCount, setRefreshCount] = useState<number>(0);

  const k3Tips = TIPS.filter(t => t.type === 'K3');
  const assetTips = TIPS.filter(t => t.type === 'Asset');

  useEffect(() => {
    // Check localStorage for today's refresh count
    const today = new Date().toLocaleDateString('en-CA');
    const storedDate = localStorage.getItem('daily_tip_date');
    const storedCount = localStorage.getItem('daily_tip_count');

    if (storedDate === today && storedCount) {
      setRefreshCount(parseInt(storedCount, 10));
    } else {
      localStorage.setItem('daily_tip_date', today);
      localStorage.setItem('daily_tip_count', '0');
    }

    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const addedCount = storedDate === today && storedCount ? parseInt(storedCount, 10) : 0;
    
    setK3TipIndex((daysSinceEpoch + addedCount) % k3Tips.length);
    setAssetTipIndex((daysSinceEpoch + addedCount) % assetTips.length);
    setMounted(true);
  }, [k3Tips.length, assetTips.length]);

  const handleRefresh = () => {
    const newCount = refreshCount + 1;
    setRefreshCount(newCount);
    
    const today = new Date().toLocaleDateString('en-CA');
    localStorage.setItem('daily_tip_date', today);
    localStorage.setItem('daily_tip_count', newCount.toString());
    
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    setK3TipIndex((daysSinceEpoch + newCount) % k3Tips.length);
    setAssetTipIndex((daysSinceEpoch + newCount) % assetTips.length);
  };

  if (!mounted) return null;

  const k3Tip = k3Tips[k3TipIndex];
  const assetTip = assetTips[assetTipIndex];

  const renderTip = (tip: typeof TIPS[0]) => {
    const Icon = tip.icon;
    return (
      <Card className={cn("overflow-hidden border-none shadow-lg relative rounded-[2rem]", tip.bg)}>
        {/* Background glow */}
        <div className={cn(
          "absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20", 
          tip.color.replace('text-', 'bg-')
        )} />
        
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
          <div className="flex gap-4 sm:gap-5 flex-1">
            <div className="shrink-0 pt-1">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm",
                tip.color
              )}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="space-y-1.5 flex-1 relative z-10 text-left">
              <div className="flex items-center gap-2 text-left">
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-left",
                  tip.color
                )}>
                  Tips {tip.type === 'K3' ? 'Keselamatan Kerja (K3)' : 'Manajemen Aset'}
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tip.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight text-left">
                    {tip.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-left mt-1">
                    {tip.content}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          
          {/* Refresh Button */}
          <div className="shrink-0 self-end sm:self-center z-10 relative">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className={cn(
                "h-8 px-3 rounded-xl border-none shadow-sm font-black uppercase text-[9px] tracking-wider transition-all",
                tip.color.replace('text-', 'bg-').replace('500', '100'),
                tip.color,
                "hover:scale-105 active:scale-95"
              )}
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Next Tip
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {renderTip(assetTip)}
      {renderTip(k3Tip)}
    </div>
  );
}
