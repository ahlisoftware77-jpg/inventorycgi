'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Asset } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Package, Repeat, Trash, ClipboardEdit, History, Search } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface RecentActivityProps {
  assets: Asset[];
}

const getActivityInfo = (status: Asset['status']): { icon: React.ElementType, label: string, color: string, bgColor: string } => {
    switch (status) {
        case 'approved_creation':
        case 'Aktif_creation':
            return { icon: Package, label: 'Aset Baru', color: 'text-emerald-600', bgColor: 'bg-emerald-50' };
        case 'approved_mutasi':
            return { icon: Repeat, label: 'Mutasi', color: 'text-blue-600', bgColor: 'bg-blue-50' };
        case 'approved_disposal':
            return { icon: Trash, label: 'Disposal', color: 'text-rose-600', bgColor: 'bg-rose-50' };
        case 'approved_edit':
            return { icon: ClipboardEdit, label: 'Kondisi', color: 'text-amber-600', bgColor: 'bg-amber-50' };
        default:
            return { icon: History, label: 'Aktivitas', color: 'text-slate-500', bgColor: 'bg-slate-50' };
    }
}

export default function RecentActivity({ assets }: RecentActivityProps) {
  const router = useRouter();

  const handleSearch = (term: string) => {
    router.push(`/assets?search=${encodeURIComponent(term)}`);
  };

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-900/20">
        <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-300">
              Log Aktivitas Terbaru
            </CardTitle>
        </div>
        <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">
          Catatan perubahan data aset dalam sistem secara real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full overflow-auto">
          <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                  <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6 h-10">Jenis Aktivitas</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Nama Aset</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Kode</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest h-10">Departemen</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6 h-10">Waktu</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {assets.length > 0 ? assets.map((asset) => {
                      const activity = getActivityInfo(asset.status);
                      return (
                          <TableRow 
                            key={asset.id} 
                            onClick={() => handleSearch(asset.name)} 
                            className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-all border-b border-slate-50 dark:border-slate-900 group"
                          >
                              <TableCell className="pl-6 py-4">
                                  <div className="flex items-center gap-2.5">
                                      <div className={cn("p-1.5 rounded-lg", activity.bgColor)}>
                                          <activity.icon className={cn("h-3.5 w-3.5", activity.color)} />
                                      </div>
                                      <span className={cn("text-[10px] font-black uppercase tracking-tight", activity.color)}>
                                          {activity.label}
                                      </span>
                                  </div>
                              </TableCell>
                              <TableCell className="py-4">
                                  <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                      {asset.name}
                                  </span>
                              </TableCell>
                              <TableCell className="py-4">
                                  <Badge 
                                    variant="outline" 
                                    className="font-mono text-[10px] font-bold bg-slate-50/50 text-primary border-slate-200 tracking-tighter hover:bg-primary hover:text-white transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSearch(asset.code);
                                    }}
                                    title="Klik untuk mencari kode ini"
                                  >
                                      {asset.code}
                                  </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                      {asset.location}
                                  </span>
                              </TableCell>
                              <TableCell className="text-right pr-6 py-4">
                                  <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-black text-slate-900 dark:text-white">
                                          {asset.createdAt ? formatDistanceToNow(asset.createdAt.toDate(), { addSuffix: true, locale: id }) : '-'}
                                      </span>
                                      <span className="text-[9px] font-bold text-muted-foreground/60 uppercase">
                                          {asset.createdAt ? format(asset.createdAt.toDate(), 'HH:mm') : ''}
                                      </span>
                                  </div>
                              </TableCell>
                          </TableRow>
                      )
                  }) : (
                      <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center">
                              <div className="flex flex-col items-center justify-center gap-2 opacity-20">
                                  <History className="h-8 w-8" />
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Belum ada log aktivitas</p>
                              </div>
                          </TableCell>
                      </TableRow>
                  )}
              </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
