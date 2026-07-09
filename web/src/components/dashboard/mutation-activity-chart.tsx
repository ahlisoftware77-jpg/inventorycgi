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
import { type Asset } from '@/lib/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface MutationActivityChartProps {
  assets: Asset[];
}

const chartConfig = {
  mutations: {
    label: 'Mutasi',
    color: '#2563eb',
  },
} satisfies ChartConfig;

export default function MutationActivityChart({ assets }: MutationActivityChartProps) {
  const router = useRouter();
  
  const chartData = React.useMemo(() => {
    const monthlyMutations = assets
      .filter(asset => asset.status === 'approved_mutasi' && asset.approvedAt)
      .reduce((acc, asset) => {
        const month = format(asset.approvedAt!.toDate(), 'MMM yyyy', { locale: id });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = format(d, 'MMM yyyy', { locale: id });
      data.push({
        month: monthKey,
        mutations: monthlyMutations[monthKey] || 0,
      });
    }
    return data;
  }, [assets]);
  
  const handleBarClick = () => {
    router.push('/mutations?tab=mutation');
  };

  return (
    <Card className="border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] border-b-4 border-b-indigo-500/70 dark:border-b-indigo-800/80 hover:-translate-y-[4px] active:translate-y-0 transition-all duration-300">
      <CardHeader className="text-left pb-2">
        <CardTitle className="text-xs font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-300">
          Tren Mutasi Aset
        </CardTitle>
        <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">
          Pergerakan perpindahan unit 6 bulan terakhir.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <BarChart 
            accessibilityLayer 
            data={chartData}
            onClick={handleBarClick}
            className="cursor-pointer"
            margin={{ top: 15, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="mut-blue-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.85}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.substring(0, 3)}
              style={{ fill: 'currentColor', fontSize: '9px', fontWeight: 'bold' }}
              className="text-slate-500"
            />
            <YAxis 
              style={{ fill: 'currentColor', fontSize: '9px' }} 
              className="text-slate-500"
            />
            <ChartTooltip 
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={<ChartTooltipContent className="bg-white border-slate-100 rounded-xl" />} 
            />
            <Bar 
              dataKey="mutations" 
              radius={[6, 6, 0, 0]} 
              barSize={20}
              background={{ fill: 'rgba(0, 0, 0, 0.03)', radius: 6 }}
              animationDuration={1000}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="url(#mut-blue-grad)" />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
