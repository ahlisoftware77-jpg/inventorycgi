'use client';

/**
 * @fileOverview Item baris dalam daftar Maintenance dengan gaya Alert Card.
 * Desain: Profesional, Tajam, dan Informatif sesuai instruksi user.
 * Dilengkapi dengan indikator warna dinamis dan efek blinking untuk status aktif.
 */

import { type MaintenanceSchedule } from '@/lib/types';
import { 
  ChevronDown, 
  Wrench, 
  Calendar, 
  User, 
  Tag, 
  Ticket, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Info, 
  AlertTriangle,
  MapPin 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { id } from 'date-fns/locale';
import { Checkbox } from '../ui/checkbox';
import Link from 'next/link';

interface MaintenanceItemProps {
  schedule: MaintenanceSchedule;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  isSelectionMode: boolean;
}

const getAlertStyles = (status: MaintenanceSchedule['status'], scheduledDate: Date) => {
    const isOverdue = isPast(scheduledDate) && status === 'Dijadwalkan';
    
    if (isOverdue) {
        return {
            container: "bg-red-50 dark:bg-red-950 border-red-500 dark:border-red-700 text-red-900 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-900/50",
            icon: AlertTriangle,
            iconClass: "text-red-600",
            badge: "OVERDUE"
        };
    }

    switch (status) {
      case 'Selesai':
        return {
          container: "bg-green-50 dark:bg-green-950 border-green-500 dark:border-green-700 text-green-900 dark:text-green-100 hover:bg-green-100 dark:hover:bg-green-800/50",
          icon: CheckCircle2,
          iconClass: "text-green-600",
          badge: "SUCCESS"
        };
      case 'Diproses':
        return {
          container: "bg-blue-50 dark:bg-blue-950 border-blue-500 dark:border-blue-700 text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/50",
          icon: Info,
          iconClass: "text-blue-600",
          badge: "PROGRESS"
        };
      case 'Dijadwalkan':
        return {
          container: "bg-yellow-50 dark:bg-yellow-950 border-yellow-500 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/50",
          icon: Clock,
          iconClass: "text-yellow-600",
          badge: "UPCOMING"
        };
      default:
        return {
          container: "bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100",
          icon: AlertCircle,
          iconClass: "text-slate-500",
          badge: status.toUpperCase()
        };
    }
};

export default function MaintenanceItem({ schedule, isExpanded, onToggle, isSelected, onSelect, isSelectionMode }: MaintenanceItemProps) {
  const schedDate = schedule.scheduledDate.toDate();
  const styles = getAlertStyles(schedule.status, schedDate);
  const StatusIcon = styles.icon;
  
  const isBlinkingWarning = schedule.status === 'Dijadwalkan';
  const isBlinkingInfo = schedule.status === 'Diproses';
  const isOverdue = isPast(schedDate) && schedule.status === 'Dijadwalkan';

  return (
    <div className="flex items-center gap-4 group">
        {isSelectionMode && (
            <div className="animate-in slide-in-from-left-2 duration-300">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(!!checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 w-6 rounded-lg border-primary/30 shrink-0"
                />
            </div>
        )}
        
        <div 
            role="alert" 
            onClick={onToggle}
            className={cn(
                "flex-grow flex items-center p-3 sm:p-4 rounded-2xl border-l-4 transition-all duration-300 ease-in-out transform hover:scale-[1.01] cursor-pointer shadow-sm relative overflow-hidden",
                styles.container,
                isExpanded && "ring-2 ring-primary/20 shadow-md scale-[1.01]",
                isOverdue ? "blinking-destructive-border" : (isBlinkingWarning ? "blinking-process-border" : (isBlinkingInfo ? "blinking-info-border" : ""))
            )}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-2 bg-white/20 rounded-full shrink-0">
                    <StatusIcon className={cn("h-5 w-5", styles.iconClass)} />
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-black text-base sm:text-lg uppercase tracking-tight truncate leading-tight">
                            {schedule.assetName}
                        </h3>
                        {schedule.ticketNumber && (
                            <Link 
                                href={`/helpdesk/id?ticketId=${schedule.ticketId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white/40 text-blue-700 rounded-md border border-white/50 hover:bg-white/60 transition-colors shadow-sm"
                            >
                                <Ticket className="h-3 w-3" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">{schedule.ticketNumber}</span>
                            </Link>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] sm:text-[11px] font-black text-current opacity-70 uppercase tracking-widest">
                        <Badge variant="outline" className="h-5 px-2 bg-slate-900 text-emerald-400 border-none font-bold font-mono">
                            {schedule.code || (`MNT-${schedule.id.slice(0, 6).toUpperCase()}`)}
                        </Badge>
                        <Badge variant="outline" className="h-5 px-2 bg-white/20 border-transparent font-bold font-mono text-primary">{schedule.assetCode}</Badge>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className={isOverdue ? "text-rose-600 underline decoration-2 underline-offset-2" : ""}>
                                {format(schedDate, 'd MMMM yyyy', { locale: id })}
                            </span>
                        </div>
                        {schedule.technician && (
                            <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span>PIC: {schedule.technician}</span>
                            </div>
                        )}
                        {schedule.assetUser && (
                            <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span>User: {schedule.assetUser}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" />
                            <span>{schedule.type}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{schedule.department}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center shrink-0 gap-4 ml-4">
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[8px] font-black uppercase opacity-40 tracking-[0.2em]">{styles.badge}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{schedule.status}</span>
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="opacity-40 group-hover:opacity-100 transition-opacity"
                >
                    <ChevronDown className="h-5 w-5" />
                </motion.div>
            </div>
        </div>
    </div>
  );
}
