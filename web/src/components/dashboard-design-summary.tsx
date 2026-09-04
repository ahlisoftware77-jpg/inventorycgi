'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Layers, CheckSquare, Clock, Archive, Calendar, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    return Array.from(years).sort().reverse(); // Newest first
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


  const customerData = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach(d => {
      if (d.customer) {
        counts.set(d.customer, (counts.get(d.customer) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [data]);

  const designerData = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach(d => {
      if (d.designer) {
        counts.set(d.designer, (counts.get(d.designer) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full p-4 sm:p-6 lg:p-8 bg-slate-50/50 min-h-screen">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Desain</h1>
          <p className="text-slate-500 mt-1">Ringkasan statistik status desain per bulan dan per tahun.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
          <Calendar className="w-5 h-5 text-slate-500 ml-1" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={y}>Tahun {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium opacity-90">Total Desain</CardTitle>
            <Layers className="w-4 h-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs opacity-80 mt-1">Total di database</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium opacity-90">FREE</CardTitle>
            <CheckSquare className="w-4 h-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.free}</div>
            <p className="text-xs opacity-80 mt-1">Desain tersedia</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium opacity-90">IN USE</CardTitle>
            <Activity className="w-4 h-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.inUse}</div>
            <p className="text-xs opacity-80 mt-1">Sedang digunakan</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium opacity-90">IN LOCK</CardTitle>
            <Clock className="w-4 h-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.inLock}</div>
            <p className="text-xs opacity-80 mt-1">Terkunci/Proses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium opacity-90">ARCHIVE</CardTitle>
            <Archive className="w-4 h-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.archive}</div>
            <p className="text-xs opacity-80 mt-1">Diarsipkan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 shadow-md border-slate-200">
          <CardHeader>
            <CardTitle>Statistik Status Bulanan ({selectedYear})</CardTitle>
            <CardDescription>Distribusi status desain sepanjang tahun {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="FREE" name="Free" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={50} />
                <Bar dataKey="IN USE" name="In Use" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={50} />
                <Bar dataKey="IN LOCK" name="In Lock" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={50} />
                <Bar dataKey="ARCHIVE" name="Archive" fill="#64748b" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-md border-slate-200">
          <CardHeader>
            <CardTitle>Tren Pertumbuhan Tahunan</CardTitle>
            <CardDescription>Total desain yang ditambahkan dari tahun ke tahun</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="Total" name="Total Desain" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <Card className="shadow-md border-slate-200">
          <CardHeader>
            <CardTitle>Top 10 Customer</CardTitle>
            <CardDescription>Distribusi desain berdasarkan pelanggan terbanyak</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={100} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" name="Total Desain" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md border-slate-200">
          <CardHeader>
            <CardTitle>Top 10 Designer</CardTitle>
            <CardDescription>Distribusi desain berdasarkan desainer paling aktif</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={designerData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={100} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" name="Total Desain" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
