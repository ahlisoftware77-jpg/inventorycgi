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
      colorClass: 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 border-b-[4px] border-r-[3px] rounded-xl hover:-translate-y-1 hover:shadow-lg active:translate-y-[2px] active:border-b active:border-r transition-all duration-200'
    },
    { 
      title: 'Total Kuantitas', 
      value: data.totalQuantity.toLocaleString('id-ID'), 
      emoji: '📊', 
      href: '/assets',
      colorClass: 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 border-b-[4px] border-r-[3px] rounded-xl hover:-translate-y-1 hover:shadow-lg active:translate-y-[2px] active:border-b active:border-r transition-all duration-200'
    },
    { 
      title: 'Nilai (IDR)', 
      value: formatCurrency(data.totalValue, 'IDR'), 
      emoji: '🇮🇩', 
      href: '#',
      colorClass: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800 border-b-[4px] border-r-[3px] rounded-xl hover:-translate-y-1 hover:shadow-lg active:translate-y-[2px] active:border-b active:border-r transition-all duration-200'
    },
    { 
      title: 'Nilai (USD)', 
      value: formatCurrency(data.totalValueUSD, 'USD'), 
      emoji: '🇺🇸', 
      href: '#',
      colorClass: 'bg-sky-50 dark:bg-sky-950 text-sky-900 dark:text-sky-100 border border-sky-200 dark:border-sky-800 border-b-[4px] border-r-[3px] rounded-xl hover:-translate-y-1 hover:shadow-lg active:translate-y-[2px] active:border-b active:border-r transition-all duration-200'
    },
    { 
      title: 'Perlu Perbaikan', 
      value: data.needsRepair, 
      emoji: '🛠️', 
      href: '/assets?condition=Perlu Perbaikan',
      colorClass: 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800 border-b-[4px] border-r-[3px] rounded-xl hover:-translate-y-1 hover:shadow-lg active:translate-y-[2px] active:border-b active:border-r transition-all duration-200',
      className: data.needsRepair > 0 ? 'text-amber-600 font-black' : ''
    },
    { 
      title: 'Aset Rusak', 
      value: data.damaged, 
      emoji: '🚨', 
      href: '/assets?condition=Rusak',
      colorClass: 'bg-rose-50 dark:bg-rose-950 text-rose-900 dark:text-rose-100 border border-rose-200 dark:border-rose-800 border-b-[4px] border-r-[3px] rounded-xl hover:-translate-y-1 hover:shadow-lg active:translate-y-[2px] active:border-b active:border-r transition-all duration-200',
      className: data.damaged > 0 ? 'text-rose-600 font-black' : ''
    },
  ];

  return (
    <>
      {cards.map((card, index) => {
        const content = (
          <Card className={cn(
            "h-full overflow-hidden text-left shadow-sm",
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
                <div className="text-xl sm:text-2xl select-none shrink-0 opacity-90 drop-shadow-md bg-white/40 dark:bg-slate-800/40 p-1.5 rounded-xl border border-white/50">
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
