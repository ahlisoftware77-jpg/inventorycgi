'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, XAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

export default function DesignTypeChart() {
  const router = useRouter();
  const [data, setData] = React.useState<{name: string, value: number, color: string}[]>([]);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'register_design'), (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.forEach(doc => {
        const typeDesign = doc.data().typeDesign || 'Unknown';
        counts[typeDesign] = (counts[typeDesign] || 0) + 1;
      });

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
      
      const chartData = Object.entries(counts)
        .filter(([name]) => name !== 'Unknown' && name !== '')
        .map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.value - a.value);

      setData(chartData);
    });

    return () => unsub();
  }, []);

  const handleBarClick = (entry: any) => {
    if (entry && entry.name) {
      router.push('/register-design');
    }
  };

  return (
    <Card className="border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] border-b-4 border-b-emerald-500/70 dark:border-b-emerald-800/80 hover:-translate-y-[4px] transition-all duration-300">
      <CardHeader className="text-left pb-2">
        <CardTitle className="text-xs font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-300">
          Ringkasan Tipe Desain
        </CardTitle>
        <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">
          Distribusi Tipe Desain pada Register Design.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4 flex-1">
        {data.length > 0 ? (
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data} 
                margin={{ top: 15, right: 5, left: -20, bottom: 40 }}
                onClick={(e) => {
                    if(e && e.activePayload && e.activePayload.length > 0) {
                        handleBarClick(e.activePayload[0].payload)
                    }
                }}
                className="cursor-pointer"
              >
                <XAxis 
                  dataKey="name" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  angle={-45}
                  textAnchor="end"
                  dy={15}
                />
                <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.05)'}} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '10px', color: '#64748b' }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[280px] w-full items-center justify-center text-sm text-slate-500 font-medium">
            Belum ada data tipe desain.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
