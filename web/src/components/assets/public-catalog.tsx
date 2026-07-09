
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Tag, 
  MapPin, 
  ShieldCheck, 
  ChevronRight, 
  Info, 
  Eye, 
  Building2, 
  Crown, 
  Zap,
  ArrowLeft
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import AssetCardPreview from './asset-card-preview';
import { cn } from '@/lib/utils';

interface PublicCatalogProps {
  type: 'utility' | 'personal';
}

const DetailRow = ({ label, value, icon: Icon }: { label: string, value: string | undefined, icon: any }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
        <Icon className="h-3 w-3 text-primary/40 mt-0.5" />
        <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter leading-none mb-0.5">{label}</p>
            <p className="text-[11px] font-bold text-slate-900 truncate">{value || '-'}</p>
        </div>
    </div>
);

export default function PublicCatalog({ type }: PublicCatalogProps) {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialId);
  const [isPreviewOpen, setIsPreviewOpen] = useState(!!initialId);

  useEffect(() => {
    const assetsRef = collection(db, 'assets');
    let q;

    if (type === 'personal') {
      q = query(assetsRef, where('status', '==', 'Bukan_Asset_Perusahaan'));
    } else {
      q = query(assetsRef, where('category', 'in', ['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung']));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(data.sort((a, b) => a.code.localeCompare(b.code)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [type]);

  useEffect(() => {
    if (initialId) {
        setSelectedAssetId(initialId);
        setIsPreviewOpen(true);
    }
  }, [initialId]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assets, searchTerm]);

  const getDynamicLabels = (asset: Asset) => {
    const category = asset.category;
    const name = (asset.name || '').toLowerCase();
    const isAC = name.includes('ac') || name.includes('air conditioner') || category === 'Elektronik';
    
    if (isAC) return { l1: 'Model Unit', l2: 'Refrigeran', l3: 'Volume (KG)', l4: 'kW' };
    if (category === 'APAR') return { l1: 'Berat (kg)', l2: 'Media', l3: 'Exp Date', l4: 'Posisi' };
    if (category === 'CCTV') return { l1: 'IP Address', l2: 'Model', l3: 'Resolusi', l4: 'Channel' };
    if (category === 'Utilitas & Kelistrikan') return { l1: 'Daya (W)', l2: 'Spesifikasi', l3: 'Tgl Pasang', l4: 'Area' };
    
    return { l1: 'Spec 1', l2: 'Spec 2', l3: 'Spec 3', l4: 'Spec 4' };
  };

  const handleOpenCard = (id: string) => {
    setSelectedAssetId(id);
    setIsPreviewOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-3">
            <Link href="/" className="inline-flex items-center text-[10px] font-black uppercase text-primary hover:underline gap-1 mb-2">
                <ArrowLeft className="h-3 w-3" /> Kembali ke Portal
            </Link>
            <div className="flex items-center gap-3">
                <div className={cn(
                    "p-3 rounded-2xl shadow-xl",
                    type === 'personal' ? "bg-amber-500" : "bg-primary"
                )}>
                    {type === 'personal' ? <Crown className="h-8 w-8 text-white" /> : <Zap className="h-8 w-8 text-white" />}
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">
                        {type === 'personal' ? 'Katalog Personal' : 'Katalog Fasilitas'}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 italic">
                        {type === 'personal' ? 'Inventaris milik pribadi terdaftar PT. CGI.' : 'Daftar perangkat pendukung operasional gedung.'}
                    </p>
                </div>
            </div>
        </div>
        <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Cari kode atau nama..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-11 rounded-2xl border-slate-200 shadow-inner bg-white font-medium"
            />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-3xl bg-slate-200 animate-pulse" />)}
        </div>
      ) : filteredAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => {
                const labels = getDynamicLabels(asset);
                return (
                    <Card key={asset.id} className="overflow-hidden border-slate-100 rounded-[2rem] shadow-sm hover:shadow-2xl transition-all duration-500 group bg-white flex flex-col">
                        <div className="relative aspect-video overflow-hidden bg-slate-50">
                            <Image 
                                src={asset.photoURL || 'https://placehold.co/400x300/F1F5F9/64748B?text=No+Photo'} 
                                alt={asset.name} 
                                fill 
                                className="object-cover group-hover:scale-110 transition-transform duration-700" 
                            />
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-white/90 backdrop-blur-md text-primary border-none font-black text-[10px] tracking-widest shadow-lg px-3 py-1">
                                    {asset.code}
                                </Badge>
                            </div>
                        </div>
                        <CardContent className="p-6 flex-1 flex flex-col">
                            <div className="mb-4">
                                <h3 className="font-black text-slate-900 uppercase tracking-tight line-clamp-1 mb-1">{asset.name}</h3>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <MapPin className="h-3 w-3" /> {asset.location}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-6">
                                <DetailRow label={labels.l1} value={asset.accessory1} icon={Info} />
                                <DetailRow label={labels.l2} value={asset.accessory2} icon={Info} />
                                <DetailRow label={labels.l3} value={asset.accessory3} icon={Info} />
                                <DetailRow label={labels.l4} value={asset.accessory4} icon={Info} />
                            </div>

                            <Button 
                                onClick={() => handleOpenCard(asset.id)}
                                className={cn(
                                    "w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all mt-auto",
                                    type === 'personal' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                                )}
                            >
                                <Eye className="mr-2 h-4 w-4" /> Lihat Kartu Identitas
                            </Button>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <Info className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-[0.2em]">Katalog Kosong</h3>
            <p className="text-sm text-slate-400 mt-2">Tidak ada aset terdaftar yang sesuai dengan filter ini.</p>
        </div>
      )}

      {selectedAssetId && (
        <AssetCardPreview 
            assetId={selectedAssetId} 
            isOpen={isPreviewOpen} 
            onOpenChange={setIsPreviewOpen} 
        />
      )}
    </div>
  );
}
