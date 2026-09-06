'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Layers, CheckSquare, Clock, Archive, Calendar, Activity, TrendingUp, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9'];

const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, fill, payload, value } = props;
  const RADIAN = Math.PI / 180;
  
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  const mx = cx + (outerRadius + 15) * cos;
  const my = cy + (outerRadius + 15) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 15;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} opacity={0.7} />
      <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" opacity={0.9} />
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey - 4} textAnchor={textAnchor} fill="#334155" fontSize={10} fontWeight={700} dominantBaseline="central">
        {payload.name}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey + 8} textAnchor={textAnchor} fill="#64748b" fontSize={9} fontWeight={600} dominantBaseline="central">
        {value} item
      </text>
    </g>
  );
};

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3.5 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <p className="text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">{`Tahun ${label}`}</p>
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-tr from-indigo-500 to-cyan-400"></span>
          </div>
          <p className="text-white font-bold text-base">{payload[0].value} <span className="text-slate-400 text-xs font-normal">Desain Total</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardDesignSummary() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "register_design"));
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(items);
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => {
      if (d.entryDate) {
        const entryStr = String(d.entryDate);
        const y = entryStr.split('-')[0];
        if (y && y.length === 4) years.add(y);
      }
    });
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    return Array.from(years).sort().reverse();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!selectedYear || selectedYear === 'all') return data;
    return data.filter(d => {
      const entryStr = String(d.entryDate || "");
      return entryStr.startsWith(selectedYear);
    });
  }, [data, selectedYear]);

  const stats = useMemo(() => {
    let inUse = 0;
    let free = 0;
    let archive = 0;
    let inLock = 0;
    
    filteredData.forEach(d => {
      if (d.status === "IN USE") inUse++;
      else if (d.status === "FREE") free++;
      else if (d.status === "ARCHIVE") archive++;
      else if (d.status === "IN LOCK") inLock++;
    });

    return { total: filteredData.length, inUse, free, archive, inLock };
  }, [filteredData]);

  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result = months.map(m => ({ month: m, "IN USE": 0, "FREE": 0, "ARCHIVE": 0, "IN LOCK": 0, Total: 0 }));
    
    filteredData.forEach(d => {
      const entryStr = String(d.entryDate || "");
      if (entryStr) {
        const monthIndex = parseInt(entryStr.split('-')[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          const status = d.status as string;
          if (status === "IN USE" || status === "FREE" || status === "ARCHIVE" || status === "IN LOCK") {
            result[monthIndex][status]++;
          }
          result[monthIndex].Total++;
        }
      }
    });
    return result;
  }, [filteredData]);

  const yearlyData = useMemo(() => {
    const yearMap = new Map<string, any>();
    
    data.forEach(d => {
      if (d.entryDate) {
        const entryStr = String(d.entryDate);
        const y = entryStr.split('-')[0];
        if (y && y.length === 4) {
          if (!yearMap.has(y)) {
            yearMap.set(y, { year: y, "IN USE": 0, "FREE": 0, "ARCHIVE": 0, "IN LOCK": 0, Total: 0 });
          }
          const item = yearMap.get(y);
          const status = d.status as string;
          if (status === "IN USE" || status === "FREE" || status === "ARCHIVE" || status === "IN LOCK") {
            item[status]++;
          }
          item.Total++;
        }
      }
    });
    
    return Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [data]);

  const getTop5 = (field: string) => {
    const counts = new Map<string, number>();
    filteredData.forEach(d => {
      if (d[field]) {
        counts.set(d[field], (counts.get(d[field]) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const customerData = useMemo(() => getTop5('customer'), [filteredData]);
  const designerData = useMemo(() => getTop5('designer'), [filteredData]);
  const itemData = useMemo(() => getTop5('itemName'), [filteredData]);

  const typeDesignData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredData.forEach(d => {
      if (d.typeDesign) {
         counts.set(d.typeDesign, (counts.get(d.typeDesign) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const recentItems = useMemo(() => {
     return [...filteredData]
       .sort((a, b) => String(b.entryDate || "").localeCompare(String(a.entryDate || "")))
       .slice(0, 5);
  }, [filteredData]);

  const galleryItems = useMemo(() => {
    return [...filteredData]
      .filter(d => d.designImage)
      .sort((a, b) => String(b.entryDate || "").localeCompare(String(a.entryDate || "")))
      .slice(0, 20);
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const renderHorizontalBar = (chartData: any[], defaultColor: string, colorMap?: Record<string, string>) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
          <defs>
            {chartData.map((entry, idx) => {
              const cellColor = colorMap?.[entry.name] || defaultColor;
              const gradientId = `grad-${cellColor.replace('#', '')}-${idx}`;
              return (
                <linearGradient key={`grad-def-${idx}`} id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={cellColor} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={cellColor} stopOpacity={1}/>
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} width={110} />
          <RechartsTooltip 
            cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} 
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ fontWeight: 'bold' }}
          />
          <Bar dataKey="count" name="Total" radius={[0, 6, 6, 0]} barSize={20}>
            {chartData.map((entry, index) => {
              const cellColor = colorMap?.[entry.name] || defaultColor;
              const gradientId = `grad-${cellColor.replace('#', '')}-${index}`;
              return <Cell key={`cell-${index}`} fill={`url(#${gradientId})`} />;
            })}
            <LabelList dataKey="count" position="right" fill="#475569" fontSize={11} fontWeight={800} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="flex flex-col min-h-full w-full px-4 lg:px-6 pt-2 pb-6 bg-slate-50 gap-4 overflow-y-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Desain</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ringkasan statistik dan aktivitas register desain</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-500 ml-1" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-8 text-sm border-none shadow-none focus:ring-0">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {availableYears.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 1: Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
        {[
          { title: 'Total Desain', value: stats.total, desc: 'Semua di database', icon: Layers, colors: 'from-blue-500 to-blue-600' },
          { title: 'FREE', value: stats.free, desc: 'Desain tersedia', icon: CheckSquare, colors: 'from-emerald-500 to-emerald-600' },
          { title: 'IN USE', value: stats.inUse, desc: 'Sedang digunakan', icon: Activity, colors: 'from-amber-500 to-amber-600' },
          { title: 'IN LOCK', value: stats.inLock, desc: 'Terkunci / Proses', icon: Clock, colors: 'from-rose-500 to-rose-600' },
          { title: 'ARCHIVE', value: stats.archive, desc: 'Diarsipkan', icon: Archive, colors: 'from-slate-500 to-slate-600' },
        ].map((card, i) => (
          <Card key={i} className={`bg-gradient-to-br ${card.colors} text-white border-none shadow-md hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4 space-y-0">
              <CardTitle className="text-xs font-medium opacity-90">{card.title}</CardTitle>
              <card.icon className="w-4 h-4 opacity-70 group-hover:scale-110 group-hover:opacity-100 transition-all" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-[10px] opacity-80 mt-0.5">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Main Grid Bento */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        
        {/* Col 1: Trend & Monthly Chart (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md min-h-[280px]">
            <CardHeader className="pb-2 pt-4 px-4 shrink-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Tren Pertumbuhan Tahunan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorTotalStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} />
                  <RechartsTooltip content={<CustomAreaTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area 
                    type="monotone" 
                    dataKey="Total" 
                    stroke="url(#colorTotalStroke)" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorTotalFill)" 
                    activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 3, style: { filter: 'drop-shadow(0px 2px 4px rgba(14,165,233,0.6))' } }}
                    style={{ filter: 'url(#glow)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md min-h-[280px]">
            <CardHeader className="pb-0 pt-4 px-4 shrink-0">
              <CardTitle className="text-sm font-bold">Status Bulanan ({selectedYear === 'all' ? 'Semua Tahun' : selectedYear})</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                  <Bar dataKey="FREE" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" maxBarSize={32} />
                  <Bar dataKey="IN USE" fill="#f59e0b" radius={[3, 3, 0, 0]} stackId="a" maxBarSize={32} />
                  <Bar dataKey="IN LOCK" fill="#f43f5e" radius={[3, 3, 0, 0]} stackId="a" maxBarSize={32} />
                  <Bar dataKey="ARCHIVE" fill="#64748b" radius={[3, 3, 0, 0]} stackId="a" maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Col 2: Top 5 Tabs (Span 4) */}
        <Card className="lg:col-span-4 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md min-h-[300px]">
          <CardContent className="p-4 flex-1 flex flex-col h-full">
            <Tabs defaultValue="item" className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-sm font-bold text-slate-900">Top 5 Analitik</h2>
                <TabsList className="h-8 bg-slate-100/80">
                  <TabsTrigger value="item" className="text-[10px] px-3 h-6">Items</TabsTrigger>
                  <TabsTrigger value="customer" className="text-[10px] px-3 h-6">Customer</TabsTrigger>
                  <TabsTrigger value="designer" className="text-[10px] px-3 h-6">Designer</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 min-h-0">
                <TabsContent value="item" className="h-full mt-0 fade-in duration-300">
                  {renderHorizontalBar(itemData, '#0ea5e9')}
                </TabsContent>
                <TabsContent value="customer" className="h-full mt-0 fade-in duration-300">
                  {renderHorizontalBar(customerData, '#8b5cf6')}
                </TabsContent>
                <TabsContent value="designer" className="h-full mt-0 fade-in duration-300">
                  {renderHorizontalBar(designerData, '#f43f5e', {
                    'D1 Riki': '#1d4ed8',
                    'D2 Diaz': '#156e47',
                    'D3 Rian': '#7a3b00',
                    'D4 Darmawan': '#b30000',
                  })}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Col 3: Pie & Recent (Span 3) */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md min-h-[250px]">
             <CardHeader className="pb-0 pt-4 px-4 shrink-0">
              <CardTitle className="text-sm font-bold">Distribusi Tipe Desain</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 relative px-0 pb-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={typeDesignData} 
                    innerRadius="40%" 
                    outerRadius="55%" 
                    paddingAngle={3} 
                    dataKey="value" 
                    stroke="none"
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    {typeDesignData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />

                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="pb-2 pt-4 px-4 shrink-0 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                Aktivitas Terbaru
                <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">{recentItems.length} items</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 styled-scrollbar">
               <div className="flex flex-col">
                 {recentItems.map((item, i) => (
                   <div key={i} className="flex flex-col gap-1 p-3 border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 truncate pr-2">{item.darNo || 'Draft'}</span>
                        <span className="text-[9px] text-slate-400 shrink-0">{item.entryDate || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{item.itemName || 'No Name'}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm border ${
                          item.status === 'IN USE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          item.status === 'FREE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          item.status === 'IN LOCK' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>{item.status || '-'}</span>
                      </div>
                   </div>
                 ))}
                 {recentItems.length === 0 && (
                   <div className="p-4 text-center text-xs text-slate-400">Belum ada aktivitas</div>
                 )}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Design Gallery */}
      <div className="shrink-0 mt-4">
        <Card className="flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-500" /> Galeri Desain Terbaru
            </CardTitle>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-sm">20 Terakhir</span>
          </CardHeader>
          <CardContent className="p-4">
            {galleryItems.length > 0 ? (
              <div className="flex overflow-x-auto gap-4 pb-4 pt-1 snap-x styled-scrollbar">
                {galleryItems.map((item, idx) => (
                  <div key={idx} className="relative group shrink-0 w-[280px] h-[180px] rounded-xl overflow-hidden shadow-sm border border-slate-200 snap-start bg-slate-100 cursor-pointer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://drive.google.com/thumbnail?id=${item.designImage}&sz=s600`}
                      alt={item.itemName || 'Design Preview'}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                         (e.target as HTMLImageElement).src = 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image';
                      }}
                    />
                    
                    {/* Gradient Overlay & Content */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <p className="text-white font-bold text-sm truncate mb-1.5 drop-shadow-md">{item.itemName || 'Tanpa Nama'}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] bg-blue-500/90 text-white px-2 py-0.5 rounded font-medium shadow-sm">{item.designer || 'Unknown'}</span>
                        <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded backdrop-blur-md font-medium truncate border border-white/10">{item.typeDesign || 'No Type'}</span>
                      </div>
                      
                      <a 
                        href={`https://drive.google.com/file/d/${item.designImage}/view`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/25 text-white text-xs font-semibold py-2 px-3 rounded-lg backdrop-blur-sm transition-all duration-300 border border-white/20 w-full shadow-[0_4px_12px_rgb(0,0,0,0.2)]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Lihat Ukuran Penuh
                      </a>
                    </div>
                    
                    {/* Badge on top left for non-hover state */}
                    <div className="absolute top-2 left-2 bg-slate-900/60 backdrop-blur-md border border-white/10 text-white text-[10px] px-2 py-0.5 rounded-md shadow-sm group-hover:opacity-0 transition-opacity">
                      {item.entryDate}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <ImageIcon className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">Belum ada gambar desain yang diunggah.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
