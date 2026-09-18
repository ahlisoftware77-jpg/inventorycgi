'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Search, Loader2, X, ZoomIn, Calendar, Layers, Tag, User, Image as ImageIcon, Trash2, ExternalLink, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegisterDesignItem } from '../page';

async function hashString(str: string) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

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
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [displayLimit, setDisplayLimit] = useState<string>("25");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Options
  const statusOptions = ['FREE', 'IN USE', 'IN LOCK', 'ARCHIVE'];
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [designerOptions, setDesignerOptions] = useState<string[]>([]);
  
  const [isPublicAuthOpen, setIsPublicAuthOpen] = useState(false);
  const [publicPasscode, setPublicPasscode] = useState('');
  const [isPublicAuthenticated, setIsPublicAuthenticated] = useState(false);
  const isReadOnly = !user;

  // Lightbox
  const [lightboxItem, setLightboxItem] = useState<RegisterDesignItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteImage = async (item: RegisterDesignItem) => {
    if (!item.designImage) return;
    
    if (!confirm(`Apakah Anda yakin ingin menghapus gambar ini dari sistem dan Google Drive?\nFile: ${item.designImageName || 'Gambar'}`)) return;
    
    setIsDeleting(true);
    toast({ title: 'Menghapus...', description: 'Sedang menghapus gambar dari Google Drive.' });
    try {
      const apiUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
        ? 'https://inventorycgi.vercel.app/api/delete-drive' 
        : '/api/delete-drive';
        
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileId: item.designImage }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus file dari Google Drive');
      }
      
      // Update in Firestore
      const docRef = doc(db, "register_design", item.id);
      await updateDoc(docRef, {
        designImage: '',
        designImageName: ''
      });
      
      // Update local state
      setData(prev => prev.map(d => d.id === item.id ? { ...d, designImage: '', designImageName: '' } : d));
      
      // Close lightbox if open
      setLightboxItem(null);
      
      toast({ title: 'Terhapus', description: 'Gambar berhasil dihapus dari Google Drive.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal Menghapus', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!loadingUser) {
      if (!user) {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('shareId');
        if (shareId) {
          setIsPublicAuthOpen(true);
        } else {
          router.push('/login');
        }
      } else {
        fetchData();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingUser, router, toast]);

  const handlePublicLogin = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('shareId');
    if (!shareId) return;

    try {
      const docRef = doc(db, "shared_links", shareId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        toast({ title: "Link Tidak Valid", description: "Link share ini tidak ditemukan.", variant: "destructive" });
        return;
      }
      
      const data = snap.data();
      
      if (data.expiresAt) {
        const expiresAt = new Date(data.expiresAt);
        if (new Date() > expiresAt) {
          toast({ title: "Link Kedaluwarsa", description: "Waktu akses untuk link ini sudah habis.", variant: "destructive" });
          return;
        }
      }
      
      if (data.type !== 'gallery') {
         toast({ title: "Akses Ditolak", description: "Link ini bukan untuk halaman Gallery.", variant: "destructive" });
         return;
      }

      const hashedInput = await hashString(publicPasscode);
      if (hashedInput === data.hashedPasscode) {
        setIsPublicAuthOpen(false);
        setIsPublicAuthenticated(true);
        fetchData();
        toast({ title: "Berhasil", description: "Akses diberikan." });
      } else {
        toast({ title: "Passcode Salah", description: "Passcode yang Anda masukkan tidak cocok.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    // fetchData is now called from auth effect
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxItem) {
        setLightboxItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxItem]);

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

      // Status Filter
      if (selectedStatus !== "all" && d.status !== selectedStatus) return false;

      // Search Filter
      if (!search) return true;
      const lowerSearch = search.toLowerCase();
      return String(d.itemName || "").toLowerCase().includes(lowerSearch) || 
             String(d.designNo || "").toLowerCase().includes(lowerSearch);
    });
  }, [data, search, selectedYear, selectedType, selectedDesigner, selectedStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedYear, selectedType, selectedDesigner, selectedStatus, displayLimit]);

  const totalPages = Math.ceil(filteredData.length / parseInt(displayLimit));

  const getStatusColor = (status: string) => {
    if (status === 'IN LOCK') return 'bg-rose-500 text-white border-rose-600 shadow-rose-500/30 shadow-md';
    if (status === 'IN USE') return 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/30 shadow-md';
    if (status === 'FREE') return 'bg-blue-500 text-white border-blue-600 shadow-blue-500/30 shadow-md';
    if (status === 'ARCHIVE') return 'bg-violet-500 text-white border-violet-600 shadow-violet-500/30 shadow-md';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getDesignerColor = (val: string) => {
    switch(val) {
      case 'D1 Riki': return 'bg-blue-700 text-blue-50 border-blue-800 font-medium';
      case 'D2 Diaz': return 'bg-[#156e47] text-emerald-50 border-emerald-900 font-medium'; // Dark green
      case 'D3 Rian': return 'bg-[#7a3b00] text-amber-50 border-amber-950 font-medium'; // Dark brown
      case 'D4 Darmawan': return 'bg-[#b30000] text-red-50 border-red-900 font-medium'; // Dark red
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (loadingUser || (!user && !isPublicAuthOpen && !isPublicAuthenticated)) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  const LayoutWrapper = user ? DashboardLayout : React.Fragment;

  return (
    <LayoutWrapper>
      <div className={`flex flex-col relative ${user ? 'h-[calc(100vh-77px)]' : 'h-screen'} bg-[#faf8f5]`}>
        {/* Animated Custom Background */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#d4af37 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#d4af37]/20 blur-[120px] animate-pulse duration-1000"></div>
          <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] rounded-full bg-[#00c6ff]/10 blur-[150px]"></div>
          <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full bg-[#8e2de2]/10 blur-[150px]"></div>
        </div>

        {/* Header & Controls */}
        <div className="sticky top-0 z-40 shrink-0 bg-white/70 backdrop-blur-xl border-b border-[#d4af37]/30 p-3 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/5 via-transparent to-[#00c6ff]/5 -z-10" />
          <div className="w-full flex flex-col xl:flex-row xl:items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2.5">
              <Button onClick={() => router.push('/register-design')} variant="ghost" size="icon" className="shrink-0 hover:bg-[#d4af37]/10 text-[#8b6508] rounded-full" title="Kembali ke Register Design">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-14 h-14 flex items-center justify-center shrink-0 drop-shadow-[0_2px_4px_rgba(212,175,55,0.3)]">
                <div 
                  className="w-14 h-14 bg-gradient-to-r from-[#8b6508] to-[#d4af37]"
                  style={{
                    maskImage: 'url(/logo_cgi_transparent.png)',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskImage: 'url(/logo_cgi_transparent.png)',
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                  }}
                />
              </div>
              <div>
                <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-[#8b6508] to-[#d4af37] tracking-tight leading-tight">Design Gallery</h1>
                <p className="text-[11px] text-[#8b6508]/80 font-medium leading-tight">Eksplorasi visual seluruh desain</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b6508]/60" />
                <Input 
                  type="search"
                  placeholder="Cari Nama/Design No..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  name="gallery_search_query"
                  className="pl-8 h-9 text-sm bg-white/80 border-[#d4af37]/40 text-slate-700 placeholder:text-slate-400 focus-visible:ring-[#d4af37] transition-shadow shadow-sm"
                />
              </div>
              
              <div className="w-[110px]">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 text-xs bg-white/80 border-[#d4af37]/40 text-slate-700 focus:ring-[#d4af37] font-medium shadow-sm">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#d4af37]/30 text-slate-700 text-xs">
                    <SelectItem value="all" className="font-medium text-[#8b6508] focus:bg-amber-50">Semua Tahun</SelectItem>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={y} className="focus:bg-amber-50 focus:text-slate-900">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[130px]">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-9 text-xs bg-white/80 border-[#d4af37]/40 text-slate-700 focus:ring-[#d4af37] font-medium shadow-sm">
                    <SelectValue placeholder="Tipe Desain" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#d4af37]/30 text-slate-700 text-xs">
                    <SelectItem value="all" className="font-medium text-[#8b6508] focus:bg-amber-50">Semua Tipe</SelectItem>
                    {typeOptions.map(t => (
                      <SelectItem key={t} value={t} className="focus:bg-amber-50 focus:text-slate-900">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[130px]">
                <Select value={selectedDesigner} onValueChange={setSelectedDesigner}>
                  <SelectTrigger className="h-9 text-xs bg-white/80 border-[#d4af37]/40 text-slate-700 focus:ring-[#d4af37] font-medium shadow-sm">
                    <SelectValue placeholder="Desainer" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#d4af37]/30 text-slate-700 text-xs">
                    <SelectItem value="all" className="font-medium text-[#8b6508] focus:bg-amber-50">Semua Desainer</SelectItem>
                    {designerOptions.map(d => (
                      <SelectItem key={d} value={d} className="focus:bg-amber-50 focus:text-slate-900">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[120px]">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-9 text-xs bg-white/80 border-[#d4af37]/40 text-slate-700 focus:ring-[#d4af37] font-medium shadow-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#d4af37]/30 text-slate-700 text-xs">
                    <SelectItem value="all" className="font-medium text-[#8b6508] focus:bg-amber-50">Semua Status</SelectItem>
                    {statusOptions.map(s => (
                      <SelectItem key={s} value={s} className="focus:bg-amber-50 focus:text-slate-900">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[110px]">
                <Select value={displayLimit} onValueChange={setDisplayLimit}>
                  <SelectTrigger className="h-9 text-xs bg-white/80 border-[#d4af37]/40 text-slate-700 focus:ring-[#d4af37] font-medium shadow-sm">
                    <SelectValue placeholder="Tampilkan" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#d4af37]/30 text-slate-700 text-xs">
                    <SelectItem value="25" className="focus:bg-amber-50 focus:text-slate-900">25 Gambar</SelectItem>
                    <SelectItem value="50" className="focus:bg-amber-50 focus:text-slate-900">50 Gambar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1 bg-white/80 rounded-md border border-[#d4af37]/40 shadow-sm p-0.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded text-[#8b6508]"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-xs font-semibold text-slate-700 px-2 min-w-[60px] text-center">
                  {currentPage} / {totalPages > 0 ? totalPages : 1}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded text-[#8b6508]"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="ml-auto xl:ml-0 text-xs font-semibold text-[#8b6508] bg-white/80 px-2.5 py-1.5 rounded-md border border-[#d4af37]/40 shadow-sm shrink-0">
                {filteredData.length} Desain
              </div>
            </div>
          </div>
        </div>

        {/* MAIN GALLERY CONTENT */}
        <div className="flex-1 overflow-auto bg-slate-50/50 relative custom-scrollbar">
          <div className="w-full p-4 md:p-6 pb-24">
            <style dangerouslySetInnerHTML={{__html: `
            .locked-card {
              --background: linear-gradient(135deg, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%);
              padding: 4px;
              border-radius: 1rem;
              overflow: visible !important;
              background: #d4af37;
              background: var(--background);
              background-size: 200% auto;
              position: relative;
              z-index: 1;
              height: 100%;
              animation: goldShine 3s linear infinite;
              transform: translateZ(0);
              -webkit-transform: translateZ(0);
              backface-visibility: hidden;
            }
            @keyframes goldShine {
              to { background-position: 200% center; }
            }
            .locked-card::after {
              position: absolute;
              content: "";
              top: 25px;
              left: 0;
              right: 0;
              z-index: -1;
              height: 100%;
              width: 100%;
              transform: scale(0.85) translateZ(0);
              -webkit-transform: scale(0.85) translateZ(0);
              filter: blur(25px);
              -webkit-filter: blur(25px);
              background: #d4af37;
              background: var(--background);
              background-size: 200% auto;
              animation: goldShine 3s linear infinite;
              transition: opacity .5s;
              will-change: opacity, transform;
            }
            .locked-card-info {
              background: linear-gradient(135deg, #fffdf2 0%, #f5d78d 100%);
              color: #3b280d;
              display: flex;
              flex-direction: column;
              width: 100%;
              height: 100%;
              overflow: hidden;
              border-radius: .8rem;
              transition: all 0.5s ease;
              transform: translateZ(0);
              -webkit-transform: translateZ(0);
            }
            .locked-card:hover::after {
              opacity: 0.6;
            }
            .locked-card:hover .locked-card-info {
              background: linear-gradient(135deg, #2a1e0b 0%, #110d05 100%);
              color: #f7d070;
            }
            .locked-card:hover .locked-card-info span {
              color: inherit !important;
            }
          `}} />
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#8b6508]/60">
                <Loader2 className="w-10 h-10 animate-spin text-[#d4af37] mb-4" />
                <p className="font-medium animate-pulse">Memuat galeri desain...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#8b6508]/40">
                <Layers className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-slate-700">Tidak ada desain ditemukan</h3>
                <p className="text-sm">Coba sesuaikan filter pencarian Anda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 auto-rows-max relative z-10">
                {filteredData.slice((currentPage - 1) * parseInt(displayLimit), currentPage * parseInt(displayLimit)).map(item => {
                  const isLocked = item.status === 'IN LOCK';
                  
                  return (
                  <div 
                    key={item.id} 
                    onClick={() => setLightboxItem(item)}
                    className={
                      isLocked
                        ? "locked-card group cursor-pointer flex flex-col hover:-translate-y-1 transition-all duration-300 transform-gpu"
                        : "group bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-[#d4af37]/30 overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(212,175,55,0.15)] hover:border-[#d4af37]/70 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col transform-gpu backface-hidden"
                    }
                  >
                    <div className={isLocked ? "locked-card-info" : "flex flex-col h-full w-full"}>
                    {/* Image Thumbnail */}
                    <div className={`relative aspect-square overflow-hidden ${isLocked ? 'bg-black/50' : 'bg-slate-50'}`}>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <ZoomIn className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white w-10 h-10 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md scale-50 group-hover:scale-100" />
                      
                      {item.designImage ? (
                        <img 
                          src={`https://drive.google.com/thumbnail?id=${item.designImage}&sz=s600`} 
                          alt={item.itemName || 'Design'} 
                          className="w-full h-full object-cover transform-gpu group-hover:scale-110 transition-transform duration-500 opacity-95 group-hover:opacity-100 will-change-transform"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => { 
                            const target = e.currentTarget;
                            if (target.src.includes('thumbnail')) {
                              target.src = `https://drive.google.com/uc?id=${item.designImage}`;
                            } else {
                              target.src = 'https://placehold.co/400x400/f8fafc/94a3b8?text=Preview+Tidak+Tersedia';
                            }
                          }}
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${isLocked ? 'text-slate-500' : 'text-[#8b6508]/30'}`}>
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
                    <div className={`p-4 flex flex-col flex-1 ${isLocked ? '' : 'bg-gradient-to-b from-white/50 to-amber-50/30'}`}>
                      <h3 className="font-bold text-sm line-clamp-1 transition-colors text-slate-800 group-hover:text-[#8b6508]" title={item.itemName}>
                        {item.itemName || 'Tanpa Nama'}
                      </h3>
                      
                      <div className="mt-2 space-y-1.5 flex-1">
                        <div className={`flex items-center text-xs ${isLocked ? 'text-inherit opacity-80' : 'text-slate-500'}`}>
                          <Tag className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate" title={item.designNo || item.typeDesign}>
                            {item.designNo || '-'} &bull; {item.typeDesign || '-'}
                          </span>
                        </div>
                        <div className={`flex items-center text-xs mt-1 mb-1 ${isLocked ? 'text-inherit opacity-90' : 'text-slate-500'}`}>
                          <User className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className={`truncate px-2 py-0.5 rounded border ${getDesignerColor(item.designer || '')}`}>{item.designer || '-'}</span>
                        </div>
                        <div className={`flex items-center text-xs ${isLocked ? 'text-inherit opacity-80' : 'text-slate-500'}`}>
                          <ImageIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate" title={item.designImageName || `Desain_${item.designNo || 'Gambar'}.jpg`}>
                            {item.designImageName || `Desain_${item.designNo || 'Gambar'}.jpg`}
                          </span>
                        </div>
                        <div className={`flex items-center text-xs ${isLocked ? 'text-inherit opacity-80' : 'text-slate-500'}`}>
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
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lightbox / Zoom View */}
        {lightboxItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-300">
            <button 
              onClick={() => setLightboxItem(null)}
              className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:scale-110 z-50 backdrop-blur-sm"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="max-w-6xl w-full max-h-full flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 border border-white/20">
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
                        <p className="font-semibold text-sm">
                          <span className={`px-2 py-0.5 rounded border ${getDesignerColor(lightboxItem.designer || '')}`}>{lightboxItem.designer || '-'}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.customer || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Technician</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.technician || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Send By</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.sendBy || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Versi</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.version || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tujuan</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.benefitText || lightboxItem.benefit || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Req Date</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.requiredDate || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Closing Date</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.closingDate || '-'}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-200 inline-block mb-3">Spesifikasi Lanjutan</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Size / Faces</p>
                        <p className="font-semibold text-slate-700 text-sm">
                          {lightboxItem.sizeCm1 ? `${lightboxItem.sizeCm1}x${lightboxItem.sizeCm2}` : (lightboxItem.sizeChecks || '-')} / {lightboxItem.sizeFaces || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Glaze / Residue</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.glazeChecks || '-'} / {lightboxItem.glazeResidue || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Surface / Temp</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.surfaceChecks || '-'} / {lightboxItem.surfaceTemp ? `${lightboxItem.surfaceTemp}°C` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ink / Other</p>
                        <p className="font-semibold text-slate-700 text-sm">{lightboxItem.inkChecks || '-'} {lightboxItem.inkOther ? `(${lightboxItem.inkOther})` : ''}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GU / PTV</p>
                        <p className="font-semibold text-slate-700 text-sm">
                          {[lightboxItem.guPtv, lightboxItem.guPtv2, lightboxItem.guPtv3, lightboxItem.guPtv4, lightboxItem.guPtv5, lightboxItem.guPtv6].filter(Boolean).join(', ') || '-'}
                        </p>
                        {lightboxItem.guPtvChecks && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">{lightboxItem.guPtvChecks}</p>
                        )}
                      </div>
                    </div>

                      <div className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">File Gambar</p>
                          <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                            {lightboxItem.designImage ? (
                              <a 
                                href={`https://drive.google.com/file/d/${lightboxItem.designImage}/view`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline text-sm break-all flex items-center gap-1.5"
                                title="Buka Gambar di Google Drive"
                              >
                                {lightboxItem.designImageName || `Desain_${lightboxItem.designNo || 'Gambar'}.jpg`}
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            ) : (
                              <p className="font-semibold text-slate-700 text-sm break-all">
                                {lightboxItem.designImageName || `Desain_${lightboxItem.designNo || 'Gambar'}.jpg`}
                              </p>
                            )}
                            {lightboxItem.designImage && !isReadOnly && (
                              <button 
                                onClick={() => handleDeleteImage(lightboxItem)}
                                disabled={isDeleting}
                                title="Hapus Gambar dari Google Drive"
                                className="p-2 text-red-500 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 rounded-md transition-colors flex items-center justify-center shrink-0 disabled:opacity-50"
                              >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
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

      <Dialog open={isPublicAuthOpen} onOpenChange={setIsPublicAuthOpen}>
        <DialogContent className="max-w-md" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Masukkan Passcode</DialogTitle>
            <DialogDescription>
              Link ini dilindungi oleh passcode. Silakan masukkan passcode untuk melihat data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Honeypot to prevent browser autofilling the search box with email */}
            <input 
              type="text" 
              autoComplete="username" 
              style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1 }} 
              aria-hidden="true" 
              tabIndex={-1} 
            />
            <Input 
              type="password" 
              value={publicPasscode} 
              onChange={e => setPublicPasscode(e.target.value)} 
              placeholder="Passcode..."
              onKeyDown={e => {
                if (e.key === 'Enter') handlePublicLogin();
              }}
            />
          </div>
          <DialogFooter>
            <Button onClick={handlePublicLogin} className="w-full bg-blue-600 hover:bg-blue-700">
              Masuk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  );
}
