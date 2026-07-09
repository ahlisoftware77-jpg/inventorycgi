
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
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
import { Cell } from 'recharts';

interface AssetStatusChartProps {
  assets: Asset[];
}

const chartConfig = {
  count: {
    label: 'Jumlah Aset',
  },
  Aktif: {
    label: 'Aktif',
    color: 'hsl(var(--chart-2))',
  },
  Dipinjam: {
    label: 'Dipinjam',
    color: 'hsl(var(--chart-3))',
  },
  Rusak: {
    label: 'Rusak',
    color: 'hsl(var(--chart-5))',
  },
  'Perlu Diperbaiki': {
    label: 'Perlu Diperbaiki',
    color: 'hsl(var(--chart-4))',
  },
  'Dipindah-Aktif': {
    label: 'Dipindah-Aktif',
    color: 'hsl(var(--chart-1))',
  },
  Dihapus: {
    label: 'Dihapus',
    color: 'hsl(var(--muted-foreground))',
  }
} satisfies ChartConfig;

export default function AssetStatusChart({ assets }: AssetStatusChartProps) {
  const router = useRouter();
  
  const chartData = React.useMemo(() => {
    const statusCounts = assets.reduce((acc, asset) => {
      let status = asset.status;
      if (['waiting_mutasi', 'approved_mutasi', 'waiting_edit', 'approved_edit', 'Aktif_creation'].includes(status)) {
        status = 'Aktif';
      }
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, count]) => ({
      name,
      count,
      fill: `var(--color-${name})`
    }));
  }, [assets]);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const status = data.activePayload[0].payload.name;
      // If user clicks on 'Aktif', we don't apply a filter because it's a mix of statuses.
      // Or we could redirect to a page showing all 'active-like' statuses. For now, let's just filter for the specific status.
      if (status !== 'Aktif') {
        router.push(`/assets?status=${status}`);
      } else {
        router.push('/assets'); // Go to all assets if 'Aktif' is clicked as it's a compound status
      }
    }
  };

  return (
    <Card className="flex flex-col h-full shadow-sm">
      <CardHeader>
        <CardTitle>Status Aset</CardTitle>
        <CardDescription>
          Distribusi aset berdasarkan status operasionalnya.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="w-full h-[250px]">
            <BarChart 
                data={chartData} 
                layout="vertical" 
                margin={{ left: 30, right: 30 }}
                onClick={handleBarClick}
                className="cursor-pointer"
            >
              <XAxis type="number" dataKey="count" hide/>
              <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                width={80}
              />
              <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" radius={5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                {chartData.map((entry) => (
                    <Cell key={entry.name} fill={chartConfig[entry.name as keyof typeof chartConfig]?.color || 'hsl(var(--muted-foreground))'} />
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
