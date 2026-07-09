
'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit } from 'lucide-react';
import { type Asset } from '@/lib/types';
import AssetForm from './asset-form';
import { useAuth } from '@/hooks/use-auth';

interface AssetActionsProps {
  asset: Asset;
}

export function AssetActions({ asset }: AssetActionsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { user } = useAuth();

  const canEdit = user?.role === 'Admin';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {canEdit && (
            <DropdownMenuItem onSelect={() => setIsFormOpen(true)} className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AssetForm asset={asset} isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
    </>
  );
}
