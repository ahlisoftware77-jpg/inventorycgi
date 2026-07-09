'use client';

import { type EnrichedAsset } from './mutation-table';
import { Card } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { getStatusClass } from './utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MutationItemProps {
  asset: EnrichedAsset;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  canSelect: boolean;
}

export default function MutationItem({ asset, isExpanded, onToggle, isSelected, onSelect, canSelect }: MutationItemProps) {
  const statusInfo = getStatusClass(asset.status);
  const isWaiting = asset.status.startsWith('waiting_') || asset.status === 'karyawan_approved';
  
  const getSecondaryText = () => {
    let baseText = '';
    switch(asset.status) {
        case 'waiting_mutasi':
            baseText = `${asset.location} → ${asset.mutationTargetDepartment}`;
            break;
        case 'waiting_disposal':
            baseText = `Akan dihapus dari: ${asset.location}`;
            break;
        case 'waiting_creation':
            baseText = `Akan ditambahkan di: ${asset.location}`;
            break;
        case 'waiting_edit':
            const conditionMatch = asset.notes?.match(/Kondisi Baru: (.*)/);
            baseText = `Ubah kondisi menjadi "${conditionMatch ? conditionMatch[1] : 'N/A'}"`;
            break;
        case 'approved_mutasi':
             baseText = `${asset.location_from || '?'} → ${asset.location}`;
             break;
        case 'approved_disposal':
             baseText = `Dihapus dari: ${asset.location}`;
             break;
        case 'approved_creation':
        case 'Aktif_creation':
             baseText = `Ditambahkan di: ${asset.location}`;
             break;
        case 'approved_edit':
            const approvedConditionMatch = asset.notes?.match(/Perubahan kondisi menjadi "(.*?)" disetujui/);
            baseText = `Kondisi diubah menjadi "${approvedConditionMatch ? approvedConditionMatch[1] : 'N/A'}"`;
            break;
        case 'karyawan_approved':
            baseText = 'Disetujui oleh Dept. Terkait';
            break;
        default:
            baseText = asset.requesterName || '';
    }

    if (asset.transactionCode) {
        return `${baseText} • (${asset.transactionCode})`;
    }

    return baseText;
  }

  return (
    <div className="flex items-center gap-3 group">
      {canSelect && (
        <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(!!checked)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Pilih aset ${asset.name}`}
            className="h-5 w-5 rounded-lg border-primary/30 shrink-0"
        />
      )}
      <Card
        onClick={onToggle}
        style={isWaiting ? { animationDuration: '3.5s' } : undefined}
        className={cn(
            "p-2.5 cursor-pointer transition-all duration-300 border shadow-sm flex-grow relative overflow-hidden rounded-xl",
            isExpanded ? "ring-2 ring-primary/20 bg-primary/[0.02] border-primary/20" : "hover:bg-slate-50 hover:border-primary/20",
            isWaiting && "animate-pulse border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20"
        )}
      >
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-slate-100"
            >
              <Image 
                src={asset.photoURL || 'https://placehold.co/64x64/F1F5F9/64748B?text=IMG'} 
                alt={asset.name} 
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate leading-tight group-hover:text-primary transition-colors">
                {asset.name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">
                <span className="font-mono text-primary">{asset.code}</span>
                <span className="opacity-20">|</span>
                <span className="truncate max-w-[200px]">{getSecondaryText()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center shrink-0 gap-3">
            <div className={cn(
                "text-[8px] font-black py-0.5 px-2 rounded-full text-center inline-block uppercase tracking-tighter ring-1 ring-inset",
                statusInfo.className
            )}>
                {statusInfo.text}
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="text-slate-300 group-hover:text-primary transition-colors hidden sm:block"
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </div>
        </div>
      </Card>
    </div>
  );
}
