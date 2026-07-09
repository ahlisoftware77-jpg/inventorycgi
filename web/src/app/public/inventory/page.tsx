
'use client';

import { Suspense } from 'react';
import PublicInventoryContent from '@/components/inventory/public-inventory-content';
import { Package } from 'lucide-react';
import Image from 'next/image';

/**
 * @fileOverview Halaman Root Portal Inventaris Publik.
 * Memungkinkan akses pengambilan barang tanpa login dengan sistem Troli.
 */
export default function PublicInventoryPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-body">
      {/* Header Publik yang Mewah */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
              <Image src="/cgi.png" alt="Logo" width={28} height={28} className="brightness-0 invert" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase leading-none">Portal Inventaris</h1>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">PT. China Glaze Indonesia</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase">Sistem Online</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Menyiapkan Katalog...</p>
          </div>
        }>
          <PublicInventoryContent />
        </Suspense>
      </main>

      <footer className="py-10 border-t border-slate-200 bg-white text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">© 2026 PT. China Glaze Indonesia • Logistik Terpadu</p>
      </footer>
    </div>
  );
}
