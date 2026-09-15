import { Note } from './types';
import NoteCard from './note-card';
import { Skeleton } from '@/components/ui/skeleton';

interface NoteGridProps {
  notes: Note[];
  loading: boolean;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, currentPin: boolean) => void;
  onToggleCheck?: (noteId: string, itemId: string, currentChecked: boolean) => void;
  isDashboardWidget?: boolean;
}

export default function NoteGrid({ notes, loading, onEdit, onDelete, onTogglePin, onToggleCheck, isDashboardWidget = false }: NoteGridProps) {
  if (loading) {
    return (
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="break-inside-avoid">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-lg">Catatan yang Anda tambahkan akan muncul di sini.</p>
      </div>
    );
  }

  const pinnedNotes = notes.filter(n => n.isPinned);
  const otherNotes = notes.filter(n => !n.isPinned);

  const renderGrid = (items: Note[]) => (
    <div className={`columns-1 sm:columns-2 ${isDashboardWidget ? '' : 'lg:columns-3 xl:columns-4'} gap-4 space-y-4`}>
      {items.map((note) => (
        <div key={note.id} className="break-inside-avoid">
          <NoteCard 
            note={note} 
            onClick={() => onEdit(note)} 
            onDelete={() => onDelete(note.id)}
            onTogglePin={() => onTogglePin(note.id, note.isPinned)}
            onToggleCheck={onToggleCheck ? (itemId, currentChecked) => onToggleCheck(note.id, itemId, currentChecked) : undefined}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          {!isDashboardWidget && <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">Dipin</h3>}
          {renderGrid(pinnedNotes)}
        </div>
      )}

      {otherNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.length > 0 && !isDashboardWidget && (
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-2 mt-8">Lainnya</h3>
          )}
          {renderGrid(otherNotes)}
        </div>
      )}
    </div>
  );
}
