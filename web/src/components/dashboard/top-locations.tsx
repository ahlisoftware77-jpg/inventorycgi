'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Asset } from '@/lib/types';
import { MapPin, Building2, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TopLocationsProps {
  assets: Asset[];
}

export default function TopLocations({ assets }: TopLocationsProps) {
  const topData = useMemo(() => {
    const counts = assets.reduce((acc, asset) => {
      acc[asset.location] = (acc[asset.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [assets]);

  const maxCount = topData[0]?.count || 1;

  return (
    <Card className="h-full border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Top Dept. Per lokasi
          </CardTitle>
        </div>
        <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Distribusi Beban Inventaris per Unit</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {topData.length > 0 ? topData.map((item, idx) => (
            <div key={item.name} className="space-y-1.5 group">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                <div className="flex items-center gap-2">
                  <span className="text-primary/40 font-mono">0{idx + 1}</span>
                  <span className="text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{item.name}</span>
                </div>
                <span className="text-muted-foreground">{item.count} <small className="text-[8px]">ITEM</small></span>
              </div>
              <Progress 
                value={(item.count / maxCount) * 100} 
                className="h-1.5 bg-slate-100 dark:bg-slate-800"
              />
            </div>
          )) : (
            <div className="h-40 flex flex-col items-center justify-center opacity-20 italic text-[10px] uppercase font-black tracking-widest">
                Belum ada data lokasi
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
