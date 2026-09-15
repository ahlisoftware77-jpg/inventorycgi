import { Note } from './types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleCheck?: (itemId: string, currentChecked: boolean) => void;
}

export default function NoteCard({ note, onClick, onDelete, onTogglePin, onToggleCheck }: NoteCardProps) {
  // Biarkan klik di luar tombol menghidupkan fungsi onClick utama
  const handleCardClick = (e: React.MouseEvent) => {
    // Abaikan jika yang di-klik adalah tombol, pin/delete, atau checkbox agar tidak dobel
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick();
  };

  const handleCheckboxClick = (e: React.MouseEvent, itemId: string, currentChecked: boolean) => {
    e.stopPropagation(); // Jangan buka editor saat ngeklik checkbox
    if (onToggleCheck) {
      onToggleCheck(itemId, currentChecked);
    }
  };

  return (
    <Card 
      onClick={handleCardClick}
      className={cn(
        "group relative overflow-hidden cursor-pointer border-slate-200 transition-all hover:shadow-md hover:-translate-y-1",
        note.color || 'bg-white dark:bg-slate-900'
      )}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("h-8 w-8 rounded-full bg-white/50 hover:bg-white/80 backdrop-blur-sm", note.isPinned && "opacity-100")}
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        >
          <Pin className={cn("h-4 w-4", note.isPinned ? "fill-current text-blue-600" : "text-slate-600")} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full bg-white/50 hover:bg-red-100 hover:text-red-600 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-2">
        {note.title && (
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 pr-8">
            {note.title}
          </h3>
        )}
        
        {note.type === 'list' && note.listItems ? (
          <div className="space-y-1 mt-2">
            {note.listItems.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <div onClick={(e) => handleCheckboxClick(e, item.id, item.checked)} className="mt-0.5">
                  <Checkbox 
                    checked={item.checked} 
                    className="pointer-events-none" // Biarkan div pembungkus yang menangani klik
                  />
                </div>
                <span className={cn(
                  "text-sm leading-tight",
                  item.checked ? "line-through text-slate-500" : "text-slate-700 dark:text-slate-300"
                )}>
                  {item.text}
                </span>
              </div>
            ))}
            {note.listItems.length > 6 && (
              <div className="text-xs text-slate-500 italic mt-1 pl-6">
                +{note.listItems.length - 6} item lainnya...
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap line-clamp-8">
            {note.content}
          </div>
        )}
      </div>
    </Card>
  );
}
