'use client';

import { type ComputerAsset } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { ChevronDown, Laptop, User, MapPin, Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ComputerAssetItemProps {
  asset: ComputerAsset;
  isExpanded: boolean;
  onToggle: () => void;
}

const getStatusVariant = (status: ComputerAsset['status']): "default" | "secondary" | "destructive" | "outline" | "warning" | "success" => {
    switch (status) {
        case 'Digunakan': return 'success';
        case 'Dalam Service': return 'warning';
        case 'Dihapus': return 'destructive';
        default: return 'secondary';
    }
};

export default function ComputerAssetItem({ asset, isExpanded, onToggle }: ComputerAssetItemProps) {
  const statusVariant = getStatusVariant(asset.status);

  return (
    <Card
      onClick={onToggle}
      className={cn(
        "p-4 cursor-pointer transition-all duration-300 border shadow-sm relative overflow-hidden group rounded-2xl bg-white dark:bg-slate-900",
        isExpanded ? "ring-2 ring-primary/20 bg-primary/[0.03] border-primary/20 shadow-lg" : "hover:bg-slate-50 hover:border-primary/20"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors">
            <Laptop className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                {asset.computerName}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">
                <Badge variant="outline" className="h-5 px-2 bg-slate-50 border-slate-200 font-bold font-mono text-primary">{asset.assetCode}</Badge>
                <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-primary/40" />
                    <span>{asset.department}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-primary/40" />
                    <span className="truncate max-w-[150px]">{asset.currentUser || 'Tanpa User'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Network className="h-3 w-3 text-primary/40" />
                    <span>{asset.ipAddress || 'No IP'}</span>
                </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center shrink-0 self-end sm:self-center gap-4">
            <Badge 
                variant={statusVariant} 
                className={cn(
                    "rounded-full px-4 py-1 text-[9px] font-black shadow-sm uppercase tracking-widest border-none ring-1 ring-inset",
                    statusVariant === 'success' && "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30",
                    statusVariant === 'warning' && "bg-amber-500/10 text-amber-600 ring-amber-500/30",
                    statusVariant === 'destructive' && "bg-rose-500/10 text-rose-600 ring-rose-500/30"
                )}
            >
                {asset.status}
            </Badge>
            <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3, hide: true }}
                className="text-slate-300 group-hover:text-primary transition-colors"
            >
                <ChevronDown className="h-6 w-6" />
            </motion.div>
        </div>
      </div>
    </Card>
  );
}
