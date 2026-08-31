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
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DisposalActivityChartProps {
  assets: Asset[];
}

const chartConfig = {
  disposals: {
    label: 'Disposal',
    color: '#dc2626',
  },
} satisfies ChartConfig;

export default function DisposalActivityChart({ assets }: DisposalActivityChartProps) {
  const router = useRouter();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear);

  const availableYears = React.useMemo(() => {
    const years = new Set<number>([currentYear]);
    assets.forEach(asset => {
      if (asset.status === 'approved_disposal' && asset.approvedAt) {
        years.add(asset.approvedAt.toDate().getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [assets, currentYear]);

  const chartData = React.useMemo(() => {
    const monthlyDisposals = assets
      .filter(asset => asset.status === 'approved_disposal' && asset.approvedAt)
      .reduce((acc, asset) => {
        const month = format(asset.approvedAt!.toDate(), 'MMM yyyy', { locale: id });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const data = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(selectedYear, i, 1);
      const monthKey = format(d, 'MMM yyyy', { locale: id });
      data.push({
        month: format(d, 'MMM', { locale: id }),
        fullDate: monthKey,
        disposals: monthlyDisposals[monthKey] || 0,
      });
    }
    return data;
  }, [assets, selectedYear]);
  
  const handleBarClick = () => {
    router.push('/mutations?tab=disposal');
  };

  return (
    <Card className="border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] border-b-4 border-b-indigo-500/70 dark:border-b-indigo-800/80 hover:-translate-y-[4px] active:translate-y-0 transition-all duration-350 animate-in fade-in duration-300">
      <CardHeader className="text-left pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xs font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-300">
            Tren Disposal Aset
          </CardTitle>
          <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground mt-1">
            Penghapusan unit tahun {selectedYear}.
          </CardDescription>
        </div>
        <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
          <SelectTrigger className="w-[85px] h-7 text-[10px] font-bold rounded-lg bg-slate-50 dark:bg-slate-800">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent className="rounded-xl min-w-[85px]">
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()} className="text-[10px] font-bold">{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              <linearGradient id="disp-red-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.85}/>
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
              dataKey="disposals" 
              radius={[6, 6, 0, 0]} 
              barSize={20}
              background={{ fill: 'rgba(0, 0, 0, 0.03)', radius: 6 }}
              animationDuration={1000}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="url(#disp-red-grad)" />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
