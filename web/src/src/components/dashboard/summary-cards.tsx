
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Archive, DollarSign, Wrench, Truck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SummaryData {
  totalAssets: number;
  totalValue: number;
  totalValueUSD: number;
  onLoan: number;
  damaged: number;
  needsRepair: number;
}

interface SummaryCardsProps {
  data: SummaryData;
}

export default function SummaryCards({ data }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const cards = [
    { title: 'Total Aset (Qty)', value: data.totalAssets.toLocaleString('id-ID'), icon: Archive, href: '/assets', isCurrency: false, condition: () => false },
    { title: 'Total Nilai Aset (IDR)', value: formatCurrency(data.totalValue), href: '#', isCurrency: true, condition: () => false },
    { title: 'Total Nilai Aset (USD)', value: formatCurrency(data.totalValueUSD), href: '#', isCurrency: true, condition: () => false },
    { title: 'Aset Dipinjam', value: data.onLoan, icon: Truck, href: '/assets?status=Dipinjam', isCurrency: false, condition: () => false },
    { title: 'Aset Kondisi Rusak', value: data.damaged, icon: Wrench, href: '/assets?condition=Rusak', isCurrency: false, condition: () => false },
    { title: 'Aset Perlu Perbaikan', value: data.needsRepair, icon: AlertTriangle, href: '/assets?condition=Perlu Perbaikan', isCurrency: false, condition: (d: SummaryData) => d.needsRepair > 0 },
  ];

  return (
    <>
      {cards.map((card, index) => {
        const CardIcon = card.icon;
        const shouldAnimate = card.condition(data);
        const cardContent = (
          <Card className={cn(
            "shadow-sm hover:shadow-md transition-shadow h-full",
            shouldAnimate && "animate-pulse-red border-destructive"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {CardIcon && <CardIcon className={cn("h-5 w-5 text-muted-foreground", shouldAnimate && "text-destructive")} />}
            </CardHeader>
            <CardContent>
              <div className={cn(
                card.isCurrency ? "text-3xl font-bold" : "text-2xl font-bold font-headline",
                shouldAnimate && "text-destructive"
              )}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        );

        return card.href !== '#' ? (
          <Link key={index} href={card.href} className="no-underline">
              {cardContent}
          </Link>
        ) : (
          <div key={index}>
            {cardContent}
          </div>
        );
      })}
    </>
  );
}
