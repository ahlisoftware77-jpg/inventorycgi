'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Search, Loader2, X, ZoomIn, Calendar, Layers, Tag, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegisterDesignItem } from '../page';

export default function RegisterDesignGalleryPage() {
  const { user, loading: loadingUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [data, setData] = useState<RegisterDesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDesigner, setSelectedDesigner] = useState<string>("all");
  
  // Options
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [designerOptions, setDesignerOptions] = useState<string[]>([]);

  // Lightbox
  const [lightboxItem, setLightboxItem] = useState<RegisterDesignItem | null>(null);

  useEffect(() => {
    if (!loadingUser && !user) {
      toast({ title: "Akses Ditolak", description: "Silakan login terlebih dahulu", variant: "destructive" });
      router.push('/');
    }
  }, [user, loadingUser, router, toast]);

  const fetchData = async () => {
    try {
      const q = query(collection(db, "register_design"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as RegisterDesignItem));
      
      // Filter only items with images
      const itemsWithImages = items.filter(item => !!item.designImage);
      setData(itemsWithImages);
      
      const years = new Set<string>();
      const types = new Set<string>();
      const designers = new Set<string>();
      
      itemsWithImages.forEach(d => {
        const dateStr = d.entryDate || (d.createdAt && typeof (d.createdAt as any).toDate === 'function' ? (d.createdAt as any).toDate().toISOString() : "");
        if (dateStr) {
           const y = new Date(dateStr).getFullYear().toString();
           if (y !== "NaN") years.add(y);
        }
        if (d.typeDesign) types.add(d.typeDesign);
        if (d.designer) designers.add(d.designer);
      });
      
      years.add(new Date().getFullYear().toString());
      setYearOptions(Array.from(years).sort((a,b) => b.localeCompare(a)));
      setTypeOptions(Array.from(types).sort());
      setDesignerOptions(Array.from(designers).sort());
      
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal mengambil data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const filteredData = React.useMemo(() => {
    return data.filter(d => {
      // Year Filter
      const dateStr = d.entryDate || (d.createdAt && typeof (d.createdAt as any).toDate === 'function' ? (d.createdAt as any).toDate().toISOString() : "");
      let itemYear = new Date().getFullYear().toString();
      if (dateStr) {
         const y = new Date(dateStr).getFullYear().toString();
         if (y !== "NaN") itemYear = y;
      }
      if (selectedYear !== "all" && itemYear !== selectedYear) return false;

      // Type Filter
      if (selectedType !== "all" && d.typeDesign !== selectedType) return false;

      // Designer Filter
      if (selectedDesigner !== "all" && d.designer !== selectedDesigner) return false;

      // Search Filter
      if (!search) return true;
      const lowerSearch = search.toLowerCase();
      return String(d.itemName || "").toLowerCase().includes(lowerSearch) || 
             String(d.designNo || "").toLowerCase().includes(lowerSearch);
    });
  }, [data, search, selectedYear, selectedType, selectedDesigner]);

  const getStatusColor = (status: string) => {
    if (status === 'IN LOCK') return 'bg-rose-500 text-white border-rose-600';
    if (status === 'IN USE') return 'bg-emerald-500 text-white border-emerald-600';
    if (status === 'FREE') return 'bg-blue-500 text-white border-blue-600';
    if (status === 'ARCHIVE') return 'bg-sky-400 text-white border-sky-500';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  if (loadingUser || !user) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
        {/* Header & Controls */}
        <div className="shrink-0 bg-white border-b border-slate-200 p-4 md:p-6 shadow-sm z-10 relative">
          <div className="max-w-7xl mx-auto space-y-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Design Gallery</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Eksplorasi visual seluruh desain yang terdaftar</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Cari Nama Desain / Design No..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 transition-shadow"
                />
              </div>
              
              <div className="w-32">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-blue-500 font-medium">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-medium text-blue-600 focus:bg-blue-50">Semua Tahun</SelectItem>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-blue-500 font-medium">
                    <SelectValue placeholder="Tipe Desain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-medium text-blue-600 focus:bg-blue-50">Semua Tipe</SelectItem>
                    {typeOptions.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <Select value={selectedDesigner} onValueChange={setSelectedDesigner}>
                  <SelectTrigger className="bg-white border-slate-200 focus:ring-blue-500 font-medium">
                    <SelectValue placeholder="Desainer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-medium text-blue-600 focus:bg-blue-50">Semua Desainer</SelectItem>
                    {designerOptions.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="ml-auto text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                {filteredData.length} Desain
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="font-medium animate-pulse">Memuat galeri desain...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Layers className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-slate-600">Tidak ada desain ditemukan</h3>
                <p className="text-sm">Coba sesuaikan filter pencarian Anda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-max">
                {filteredData.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setLightboxItem(item)}
                    className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    {/* Image Thumbnail */}
                    <div className="relative aspect-square bg-slate-100 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <ZoomIn className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white w-10 h-10 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md scale-50 group-hover:scale-100" />
                      
                      {item.designImage ? (
                        <img 
                          src={`https://drive.google.com/thumbnail?id=${item.designImage}&sz=s600`} 
                          alt={item.itemName || 'Design'} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => { 
                            const target = e.currentTarget;
                            if (target.src.includes('thumbnail')) {
                              target.src = `https://drive.google.com/uc?id=${item.designImage}`;
                            } else {
                              target.src = 'https://placehold.co/400x400/png?text=Preview+Tidak+Tersedia';
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Layers className="w-12 h-12" />
                        </div>
                      )}
                      
                      {/* Status Badge Overlaid on Image */}
                      <div className="absolute top-3 left-3 z-20">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase shadow-md border ${getStatusColor(item.status || '')}`}>
                          {item.status || '-'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Card Content */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors" title={item.itemName}>
                        {item.itemName || 'Tanpa Nama'}
                      </h3>
                      
                      <div className="mt-2 space-y-1.5 flex-1">
                        <div className="flex items-center text-xs text-slate-500">
                          <Tag className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate" title={item.designNo || item.typeDesign}>
                            {item.designNo || '-'} &bull; {item.typeDesign || '-'}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-slate-500">
                          <User className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">{item.designer || '-'}</span>
                        </div>
                        <div className="flex items-center text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span>
                            {item.entryDate 
                              ? new Date(item.entryDate).getFullYear().toString()
                              : item.createdAt && typeof (item.createdAt as any).toDate === 'function' 
                                ? (item.createdAt as any).toDate().getFullYear().toString() 
                                : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lightbox / Zoom View */}
        {lightboxItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
            <button 
              onClick={() => setLightboxItem(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="max-w-6xl w-full max-h-full flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              {/* Image Section */}
              <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 min-h-[40vh] md:min-h-0 relative">
                {lightboxItem.designImage ? (
                  <img 
                    src={`https://drive.google.com/thumbnail?id=${lightboxItem.designImage}&sz=s1200`} 
                    alt={lightboxItem.itemName || 'Design'} 
                    className="max-w-full max-h-[85vh] object-contain drop-shadow-xl"
                    referrerPolicy="no-referrer"
                    onError={(e) => { 
                      const target = e.currentTarget;
                      if (target.src.includes('thumbnail')) {
                        target.src = `https://drive.google.com/uc?id=${lightboxItem.designImage}`;
                      } else {
                        target.src = 'https://placehold.co/1000x1000/png?text=Preview+Tidak+Tersedia';
                      }
                    }}
                  />
                ) : (
                  <Layers className="w-20 h-20 text-slate-300" />
                )}
              </div>

              {/* Specs Section */}
              <div className="w-full md:w-80 lg:w-96 bg-white flex flex-col border-l border-slate-100 overflow-y-auto max-h-[50vh] md:max-h-[85vh]">
                <div className="p-6 md:p-8 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider shadow-sm border ${getStatusColor(lightboxItem.status || '')}`}>
                      {lightboxItem.status || '-'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {lightboxItem.entryDate || '-'}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-slate-800 leading-tight mb-6">
                    {lightboxItem.itemName || 'Tanpa Nama'}
                  </h2>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Design No</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.designNo || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type Design</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.typeDesign || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Designer</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.designer || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.customer || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Size / Faces</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.sizeChecks || '-'} / {lightboxItem.sizeFaces || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Technician</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.technician || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Custom Scrollbar Styles for the gallery */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
      `}} />
    </DashboardLayout>
  );
}
