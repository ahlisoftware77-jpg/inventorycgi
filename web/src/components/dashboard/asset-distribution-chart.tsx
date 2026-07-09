'use client';

import * as React from 'react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
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
import { cn } from '@/lib/utils';

interface AssetDistributionChartProps {
  assets: Asset[];
}

export default function AssetDistributionChart({ assets }: AssetDistributionChartProps) {
  const chartData = React.useMemo(() => {
    const categoryCounts = assets.reduce((acc, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
      };
    });
    return config;
  }, [chartData]);

  return (
    <Card className="border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] border-b-4 border-b-indigo-500/70 dark:border-b-indigo-800/80 hover:-translate-y-[4px] active:translate-y-0 transition-all duration-300">
      <CardHeader className="text-left pb-2">
        <CardTitle className="text-xs font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-300">
          Distribusi per Kategori
        </CardTitle>
        <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">
          Komposisi aset berdasarkan kategori utama.
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
            >
              <defs>
                <linearGradient id="dist-grad-0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.85}/>
                </linearGradient>
                <linearGradient id="dist-grad-1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#334155" stopOpacity={0.85}/>
                </linearGradient>
                <linearGradient id="dist-grad-2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.85}/>
                </linearGradient>
                <linearGradient id="dist-grad-3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#b45309" stopOpacity={0.85}/>
                </linearGradient>
                <linearGradient id="dist-grad-4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.85}/>
                </linearGradient>
                <linearGradient id="dist-grad-5" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#be185d" stopOpacity={0.85}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
              
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                angle={-20}
                textAnchor="end"
                interval={0}
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
                barSize={18}
                background={{ fill: 'rgba(0, 0, 0, 0.03)', radius: 6 }}
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#dist-grad-${index % 6})`}
                    />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-xs italic">
            Belum ada data tersedia.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
