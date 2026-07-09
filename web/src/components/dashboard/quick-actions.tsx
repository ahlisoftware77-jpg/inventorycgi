'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, QrCode, Ticket, FileDown, Zap } from 'lucide-react';
import Link from 'next/link';
import AssetForm from '../assets/asset-form';

export default function QuickActions() {
  return (
    <Card className="h-full border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Akses Cepat (Shortcuts)
          </CardTitle>
        </div>
        <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Alur Kerja Efisien Departemen IT & GA</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <AssetForm>
          <Button variant="outline" className="h-20 flex-col gap-2 rounded-2xl border-slate-100 hover:border-primary hover:bg-primary/5 transition-all group w-full">
            <PlusCircle className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Tambah Aset</span>
          </Button>
        </AssetForm>
        <Button asChild variant="outline" className="h-20 flex-col gap-2 rounded-2xl border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group">
          <Link href="/scan">
            <QrCode className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Scan Label</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-20 flex-col gap-2 rounded-2xl border-slate-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all group">
          <Link href="/helpdesk">
            <Ticket className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Helpdesk</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-20 flex-col gap-2 rounded-2xl border-slate-100 hover:border-rose-500 hover:bg-rose-50/50 transition-all group">
          <Link href="/assets/report">
            <FileDown className="h-5 w-5 text-rose-600 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Laporan Global</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
