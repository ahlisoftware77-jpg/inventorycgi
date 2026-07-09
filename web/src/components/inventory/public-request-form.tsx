
'use client';

/**
 * @fileOverview Komponen ini kini digunakan untuk menambahkan satu item ke troli dengan cepat.
 */

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PublicRequestFormProps {
  item: InventoryItem;
  onAdd: (item: InventoryItem) => void;
}

export default function PublicRequestForm({ item, onAdd }: PublicRequestFormProps) {
  const isOutOfStock = item.stock <= 0;

  return (
    <Button 
        disabled={isOutOfStock}
        onClick={() => onAdd(item)}
        className={cn(
            "h-10 rounded-xl font-bold transition-all active:scale-95 px-6 shadow-lg",
            isOutOfStock ? "bg-slate-200 text-slate-400" : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
        )}
    >
      {isOutOfStock ? 'Stok Habis' : <><ShoppingCart className="mr-2 h-4 w-4" /> Ambil</>}
    </Button>
  );
}
