
'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { type Asset, type HelpdeskTicket } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Package, Repeat, Trash, Ticket, LifeBuoy } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface RecentActivityProps {
  items: (Asset | HelpdeskTicket)[];
}

const isAsset = (item: any): item is Asset => {
  return 'code' in item && 'name' in item;
};

const isTicket = (item: any): item is HelpdeskTicket => {
    return 'ticketNumber' in item && 'category' in item;
};

const TimelineItem = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <li className={cn("relative flex items-start gap-4 pb-8", className)}>
        <div className="absolute left-0 top-2 h-full w-px bg-border" />
        {children}
    </li>
);

const TimelineIcon = ({ children }: { children: React.ReactNode }) => (
    <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background border">
        {children}
    </div>
);

const TimelineContent = ({ children }: { children: React.ReactNode }) => (
    <div className="flex-1">
        {children}
    </div>
);

export default function RecentActivity({ items }: RecentActivityProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const handleItemClick = (item: Asset | HelpdeskTicket) => {
    if (!isAdmin) return; 

    if (isAsset(item)) {
      const isNewAsset = item.status === 'Aktif_creation' || item.status === 'waiting_creation';
      if (isNewAsset) {
        // Navigate to the assets page and pass the asset ID as a query param
        router.push(`/assets?selectedAssetId=${item.id}`);
      } else {
        router.push(`/assets/${item.id}`);
      }
    } else if (isTicket(item)) {
        router.push(`/helpdesk/${item.id}`);
    }
  };

  const renderItem = (item: Asset | HelpdeskTicket) => {
    let icon, title, description, time;
    
    if (isAsset(item)) {
        const asset = item;
        time = asset.approvedAt || asset.createdAt;

        switch (asset.status) {
            case 'Aktif_creation':
            case 'waiting_creation':
                icon = <Package className="h-4 w-4" />;
                title = `Aset Baru Ditambahkan`;
                description = `${asset.name} (${asset.code})`;
                break;
            case 'approved_mutasi':
                icon = <Repeat className="h-4 w-4 text-blue-500" />;
                title = `Mutasi Aset Disetujui`;
                description = `${asset.name} (${asset.code})`;
                break;
            case 'approved_disposal':
                icon = <Trash className="h-4 w-4 text-red-500" />;
                title = `Disposal Aset Disetujui`;
                description = `${asset.name} (${asset.code})`;
                break;
            default:
                // For other statuses, we can just show it was "updated" or return null
                return null;
        }

    } else if (isTicket(item)) {
        const ticket = item;
        time = ticket.reportedAt;
        icon = <LifeBuoy className="h-4 w-4 text-orange-500" />;
        title = `Tiket Helpdesk Baru`;
        description = `#${ticket.ticketNumber} - ${ticket.reporterName}`;
    } else {
        return null;
    }

    if (!time) return null;

    const isInternal = user?.role === 'Admin' || user?.department === 'HR & GA';

    return (
        <TimelineItem key={item.id}>
            <TimelineIcon>{icon}</TimelineIcon>
            <TimelineContent>
                <div 
                  className={cn(
                      "flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 rounded-md",
                      isAdmin && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => handleItemClick(item)}
                >
                    <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 sm:mt-0">
                        {formatDistanceToNow(time.toDate(), { addSuffix: true, locale: id })}
                    </p>
                </div>
            </TimelineContent>
        </TimelineItem>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Linimasa Aktivitas Terbaru</CardTitle>
        <CardDescription>
          Melihat aktivitas terbaru dalam sistem, termasuk aset baru dan persetujuan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
            <ul>
                {items.slice(0, 10).map((item, index) => renderItem(item))}
            </ul>
        ) : (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
                Tidak ada aktivitas terbaru.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
