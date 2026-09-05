'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Layers, CheckSquare, Clock, Archive, Calendar, Activity, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9'];

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
        const y = d.entryDate.split('-')[0];
        if (y && y.length === 4) years.add(y);
      }
    });
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);
    return Array.from(years).sort().reverse();
  }, [data]);

  const stats = useMemo(() => {
    let inUse = 0;
    let free = 0;
    let archive = 0;
    let inLock = 0;
    
    data.forEach(d => {
      if (d.status === "IN USE") inUse++;
      else if (d.status === "FREE") free++;
      else if (d.status === "ARCHIVE") archive++;
      else if (d.status === "IN LOCK") inLock++;
    });

    return { total: data.length, inUse, free, archive, inLock };
  }, [data]);

  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result = months.map(m => ({ month: m, "IN USE": 0, "FREE": 0, "ARCHIVE": 0, "IN LOCK": 0, Total: 0 }));
    
    data.forEach(d => {
      if (d.entryDate && d.entryDate.startsWith(selectedYear)) {
        const monthIndex = parseInt(d.entryDate.split('-')[1], 10) - 1;
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
  }, [data, selectedYear]);

  const yearlyData = useMemo(() => {
    const yearMap = new Map<string, any>();
    
    data.forEach(d => {
      if (d.entryDate) {
        const y = d.entryDate.split('-')[0];
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
    data.forEach(d => {
      if (d[field]) {
        counts.set(d[field], (counts.get(d[field]) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const customerData = useMemo(() => getTop5('customer'), [data]);
  const designerData = useMemo(() => getTop5('designer'), [data]);
  const itemData = useMemo(() => getTop5('itemName'), [data]);

  const typeDesignData = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach(d => {
      if (d.typeDesign) {
         counts.set(d.typeDesign, (counts.get(d.typeDesign) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const recentItems = useMemo(() => {
     return [...data]
       .sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""))
       .slice(0, 5);
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const renderHorizontalBar = (chartData: any[], color: string) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} width={120} />
        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Bar dataKey="count" name="Total" fill={color} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="flex flex-col h-full lg:h-[calc(100vh-72px)] w-full p-4 lg:p-6 bg-slate-50 gap-4 overflow-y-auto lg:overflow-hidden">
      
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
          <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="pb-2 pt-4 px-4 shrink-0">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Tren Pertumbuhan Tahunan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <CardHeader className="pb-0 pt-4 px-4 shrink-0">
              <CardTitle className="text-sm font-bold">Status Bulanan ({selectedYear})</CardTitle>
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
        <Card className="lg:col-span-4 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
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
                  {renderHorizontalBar(designerData, '#f43f5e')}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Col 3: Pie & Recent (Span 3) */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden bg-white/60 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
             <CardHeader className="pb-0 pt-4 px-4 shrink-0">
              <CardTitle className="text-sm font-bold">Distribusi Tipe Desain</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 relative px-0 pb-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeDesignData} innerRadius="50%" outerRadius="80%" paddingAngle={3} dataKey="value" stroke="none">
                    {typeDesignData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
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
    </div>
  );
}
