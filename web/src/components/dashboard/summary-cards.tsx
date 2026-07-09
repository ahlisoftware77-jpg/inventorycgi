'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface SummaryData {
  totalAssets: number;
  totalQuantity: number;
  totalValue: number;
  totalValueUSD: number;
  onLoan: number;
  damaged: number;
  needsRepair: number;
}

interface SummaryCardsProps {
  data: SummaryData;
}

const formatCurrency = (value: number, currency: 'IDR' | 'USD') => {
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function SummaryCards({ data }: SummaryCardsProps) {
  const cards = [
    { 
      title: 'Total Aset', 
      value: data.totalAssets.toLocaleString('id-ID'), 
      emoji: '📦', 
      href: '/assets',
      colorClass: 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 border-b-4 border-b-slate-400 dark:border-b-slate-700 shadow-md shadow-slate-200/40 dark:shadow-none'
    },
    { 
      title: 'Total Kuantitas', 
      value: data.totalQuantity.toLocaleString('id-ID'), 
      emoji: '📊', 
      href: '/assets',
      colorClass: 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 border-b-4 border-b-slate-400 dark:border-b-slate-700 shadow-md shadow-slate-200/40 dark:shadow-none'
    },
    { 
      title: 'Nilai (IDR)', 
      value: formatCurrency(data.totalValue, 'IDR'), 
      emoji: '🇮🇩', 
      href: '#',
      colorClass: 'bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-900 dark:text-emerald-100 border-emerald-100/30 dark:border-emerald-900/20 border-b-4 border-b-emerald-500/70 dark:border-b-emerald-800/80 shadow-md shadow-emerald-500/5'
    },
    { 
      title: 'Nilai (USD)', 
      value: formatCurrency(data.totalValueUSD, 'USD'), 
      emoji: '🇺🇸', 
      href: '#',
      colorClass: 'bg-sky-50/50 dark:bg-sky-950/10 text-sky-900 dark:text-sky-100 border-sky-100/30 dark:border-sky-900/20 border-b-4 border-b-sky-500/70 dark:border-b-sky-800/80 shadow-md shadow-sky-500/5'
    },
    { 
      title: 'Perlu Perbaikan', 
      value: data.needsRepair, 
      emoji: '🛠️', 
      href: '/assets?condition=Perlu Perbaikan',
      colorClass: 'bg-amber-50/50 dark:bg-amber-950/10 text-amber-900 dark:text-amber-100 border-amber-100/30 dark:border-amber-900/20 border-b-4 border-b-amber-500/70 dark:border-b-amber-800/80 shadow-md shadow-amber-500/5',
      className: data.needsRepair > 0 ? 'text-amber-600 font-black' : ''
    },
    { 
      title: 'Aset Rusak', 
      value: data.damaged, 
      emoji: '🚨', 
      href: '/assets?condition=Rusak',
      colorClass: 'bg-rose-50/50 dark:bg-rose-950/10 text-rose-900 dark:text-rose-100 border-rose-100/30 dark:border-rose-900/20 border-b-4 border-b-rose-500/70 dark:border-b-rose-800/80 shadow-md shadow-rose-500/5',
      className: data.damaged > 0 ? 'text-rose-600 font-black' : ''
    },
  ];

  return (
    <>
      {cards.map((card, index) => {
        const content = (
          <Card className={cn(
            "h-full border transition-all duration-300 hover:-translate-y-[4px] active:translate-y-0 rounded-2xl overflow-hidden text-left",
            card.colorClass
          )}>
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between w-full">
                <div className="space-y-1 text-left">
                  <p className="text-[9px] font-black uppercase tracking-wider opacity-60">
                    {card.title}
                  </p>
                  <h3 className={cn("text-xl sm:text-2xl font-black tracking-tight text-left leading-none mt-1", card.className)}>
                    {card.value}
                  </h3>
                </div>
                <div className="text-xl sm:text-2xl select-none shrink-0 p-1 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-inner">
                  {card.emoji}
                </div>
              </div>
            </CardContent>
          </Card>
        );

        return card.href !== '#' ? (
          <Link key={index} href={card.href} className="no-underline block h-full">
            {content}
          </Link>
        ) : (
          <div key={index} className="h-full">
            {content}
          </div>
        );
      })}
    </>
  );
}
