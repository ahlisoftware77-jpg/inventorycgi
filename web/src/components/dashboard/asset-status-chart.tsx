'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { type Asset, type AssetStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AssetStatusChartProps {
  assets: Asset[];
}

const getStatusGroup = (status: AssetStatus) => {
    if (['Aktif', 'Dipinjam', 'Dipindah-Aktif', 'waiting_mutasi', 'waiting_edit', 'karyawan_approved', 'approved_mutasi', 'approved_edit', 'waiting_creation', 'Aktif_creation'].includes(status)) {
        return 'Operasional';
    }
    if (['Rusak', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan'].includes(status)) {
        return 'Perbaikan';
    }
    if (['Dihapus', 'waiting_disposal', 'approved_disposal'].includes(status)) {
        return 'Disposal';
    }
    return 'Lainnya';
}

const chartConfig = {
  'Operasional': { label: 'Operasional', color: '#10b981' },
  'Perbaikan': { label: 'Perbaikan', color: '#f59e0b' },
  'Disposal': { label: 'Disposal', color: '#ef4444' },
  'Lainnya': { label: 'Lainnya', color: '#64748b' },
} satisfies ChartConfig;

export default function AssetStatusChart({ assets }: AssetStatusChartProps) {
  const router = useRouter();
  
  const chartData = React.useMemo(() => {
    const statusCounts = assets.reduce((acc, asset) => {
      const group = getStatusGroup(asset.status);
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [assets]);

  const handleBarClick = (data: any) => {
    if (data && data.name) {
      const statusGroup = data.name;
      let filterQuery = '';
      if (statusGroup === 'Operasional') filterQuery = 'status=Aktif';
      if (statusGroup === 'Perbaikan') filterQuery = 'condition=Rusak';
      if (statusGroup === 'Disposal') filterQuery = 'status=approved_disposal';
      
      router.push(`/assets?${filterQuery}`);
    }
  };

  return (
    <Card className="border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] border-b-4 border-b-indigo-500/70 dark:border-b-indigo-800/80 hover:-translate-y-[4px] active:translate-y-0 transition-all duration-300">
      <CardHeader className="text-left pb-2">
        <CardTitle className="text-xs font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-300">
          Status Operasional
        </CardTitle>
        <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">
          Kondisi ketersediaan aset saat ini.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="w-full h-[280px]"
          >
            <BarChart 
              accessibilityLayer 
              data={chartData} 
              margin={{ top: 15, right: 5, left: -20, bottom: 40 }}
              onClick={handleBarClick}
              className="cursor-pointer"
            >
              <defs>
                <linearGradient id="status-grad-Operasional" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.85}/>
                </linearGradient>
                <linearGradient id="status-grad-Perbaikan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.85}/>
                </linearGradient>
                <linearGradient id="status-grad-Disposal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0.85}/>
                </linearGradient>
                <linearGradient id="status-grad-Lainnya" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#475569" stopOpacity={0.85}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
              
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                style={{ fontSize: '9px', fontWeight: 'bold', fill: 'currentColor' }}
                className="text-slate-500"
              />
              <YAxis 
                style={{ fontSize: '9px', fill: 'currentColor' }} 
                className="text-slate-500"
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                content={<ChartTooltipContent hideLabel className="bg-white border-slate-100 rounded-xl" />}
              />
              <Bar 
                dataKey="value" 
                radius={[6, 6, 0, 0]}
                barSize={24}
                background={{ fill: 'rgba(0, 0, 0, 0.03)', radius: 6 }}
                animationDuration={1000}
              >
                {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={`url(#status-grad-${entry.name})`}
                    />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-xs italic">
            Data status tidak ditemukan.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
