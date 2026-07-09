

'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { type HelpdeskTicket, type TicketStatus, type TicketPriority } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import ExportHelpdeskButton from './export-helpdesk-button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import TicketDetail from './ticket-detail';
import { ScrollArea } from '../ui/scroll-area';

export default function HelpdeskTable() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<TicketStatus[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);
    let q: QueryConstraint[] = [];
    if (user.role !== 'Admin') {
      q.push(where('reportedBy', '==', user.uid));
    }
    
    const finalQuery = query(collection(db, 'helpdesk_tickets'), ...q);

    const unsubscribe = onSnapshot(finalQuery, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpdeskTicket));
      setTickets(ticketsData.sort((a, b) => (b.reportedAt?.toMillis() || 0) - (a.reportedAt?.toMillis() || 0)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching helpdesk tickets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const searchMatch = (ticket.ticketNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (ticket.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (ticket.reporterName && ticket.reporterName.toLowerCase().includes(searchTerm.toLowerCase()));
      const statusMatch = statusFilters.length === 0 || statusFilters.includes(ticket.status);
      return searchMatch && statusMatch;
    });
  }, [tickets, searchTerm, statusFilters]);

  const handleStatusFilterChange = (status: TicketStatus) => {
    setStatusFilters(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };
  
  const getStatusVariant = (status: TicketStatus) => {
    switch (status) {
      case 'Menunggu': return 'destructive';
      case 'Diproses': return 'default';
      case 'Selesai': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityClass = (priority?: TicketPriority) => {
    switch (priority) {
      case 'Kritis': return 'bg-red-600 text-white font-bold';
      case 'Tinggi': return 'bg-orange-500 text-white font-bold';
      case 'Normal': return 'bg-yellow-400 text-yellow-900';
      case 'Rendah': return 'bg-blue-200 text-blue-900';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-10rem)] gap-4">
      <div className={cn("flex flex-col", selectedTicketId ? "w-full lg:w-1/2" : "w-full")}>
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>IT Helpdesk</CardTitle>
                <CardDescription>Lacak dan kelola semua tiket masalah teknis.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ExportHelpdeskButton tickets={filteredTickets} />
                <Button asChild>
                  <Link href="/helpdesk/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Lapor Masalah Baru
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari nomor tiket, deskripsi, atau pelapor..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {user?.role === 'Admin' && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto">
                                Status ({statusFilters.length > 0 ? statusFilters.length : 'Semua'})
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Filter berdasarkan Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {(['Menunggu', 'Diproses', 'Selesai'] as TicketStatus[]).map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status}
                                checked={statusFilters.includes(status)}
                                onCheckedChange={() => handleStatusFilterChange(status)}
                            >
                                {status}
                            </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>No. Tiket</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Prioritas</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    {user?.role === 'Admin' && <TableHead>Pelapor</TableHead>}
                    <TableHead>Tgl Laporan</TableHead>
                    <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading || authLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                        <TableCell colSpan={user?.role === 'Admin' ? 7 : 6}>
                            <Skeleton className="h-8 w-full" />
                        </TableCell>
                        </TableRow>
                    ))
                    ) : filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => (
                        <TableRow 
                          key={ticket.id}
                          onClick={() => setSelectedTicketId(ticket.id)}
                          className={cn("cursor-pointer", selectedTicketId === ticket.id && "bg-accent")}
                        >
                            <TableCell className="font-medium text-primary hover:underline">
                                {ticket.ticketNumber}
                            </TableCell>
                            <TableCell>{ticket.category}</TableCell>
                            <TableCell>
                                <Badge className={cn('text-xs', getPriorityClass(ticket.priority))}>
                                    {ticket.priority || 'Normal'}
                                </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{ticket.description}</TableCell>
                            {user?.role === 'Admin' && <TableCell>{ticket.reporterName} ({ticket.reporterDept})</TableCell>}
                            <TableCell>{ticket.reportedAt ? format(ticket.reportedAt.toDate(), 'd MMM yyyy, HH:mm', { locale: id }) : '-'}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                            </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={user?.role === 'Admin' ? 7 : 6} className="h-24 text-center">
                        Tidak ada tiket ditemukan.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {selectedTicketId && (
        <div className="relative animate-in fade-in-50 flex-1 min-h-0 w-full lg:w-1/2">
           <ScrollArea className="h-full">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-10 bg-background/50 rounded-full"
                    onClick={() => setSelectedTicketId(null)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Tutup Detail</span>
                </Button>
                <TicketDetail ticketId={selectedTicketId} />
           </ScrollArea>
        </div>
      )}
    </div>
  );
}
