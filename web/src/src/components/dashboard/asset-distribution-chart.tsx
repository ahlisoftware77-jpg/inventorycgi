'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, XAxis, YAxis, Tooltip, Cell } from 'recharts';
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
  ChartTooltipContent,
} from '@/components/ui/chart';
import { type Asset } from '@/lib/types';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface AssetDistributionChartProps {
  assets: Asset[];
}

export default function AssetDistributionChart({ assets }: AssetDistributionChartProps) {
  const router = useRouter();

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
      .sort((a, b) => b.value - a.value); // Sort for better visualization
  }, [assets]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
        value: {
            label: 'Jumlah Aset',
        }
    };
    chartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [chartData]);
  
  const handleBarClick = (data: any) => {
    if (data && data.name) {
      const category = data.name;
      router.push(`/assets?category=${encodeURIComponent(category)}`);
    }
  };

  return (
    <Card className="flex flex-col h-full shadow-sm">
      <CardHeader>
        <CardTitle>Distribusi Aset per Kategori</CardTitle>
        <CardDescription>
          Visualisasi jumlah aset dalam setiap kategori. Klik batang untuk memfilter.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="w-full h-[300px]">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 30 }}
              onClick={(payload) => handleBarClick(payload?.activePayload?.[0]?.payload)}
              className="cursor-pointer"
            >
              <XAxis type="number" dataKey="value" hide />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tickProps={{
                  fill: 'hsl(var(--foreground))',
                  fontSize: 12,
                  textAnchor: 'start',
                }}
                width={150}
                interval={0}
              />
              <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="value" radius={5} barSize={20} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                 {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chartConfig[entry.name]?.color || COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Tidak ada data aset untuk ditampilkan.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
