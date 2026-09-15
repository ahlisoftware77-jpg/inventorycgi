import { useState, useEffect, useRef } from 'react';
import { Note, NOTE_COLORS, NoteListItem } from './types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Palette, ListTodo, Plus, X, Type } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface NoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Note>) => void;
  initialData: Note | null;
}

export default function NoteEditor({ isOpen, onClose, onSave, initialData }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [type, setType] = useState<'text' | 'list'>('text');
  const [listItems, setListItems] = useState<NoteListItem[]>([]);
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setContent(initialData?.content || '');
      setColor(initialData?.color || NOTE_COLORS[0]);
      setType(initialData?.type || 'text');
      setListItems(initialData?.listItems || []);
      setNewItemText('');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    // Abaikan jika semuanya kosong
    if (!title.trim() && !content.trim() && listItems.length === 0 && !newItemText.trim()) {
      onClose();
      return;
    }
    
    // Jika ada sisa teks di kotak "Item list baru" tapi belum dienter, masukkan otomatis
    let finalItems = [...listItems];
    if (type === 'list' && newItemText.trim()) {
      finalItems.push({ id: crypto.randomUUID(), text: newItemText.trim(), checked: false });
    }

    onSave({ 
      title: title.trim(), 
      content: type === 'text' ? content.trim() : '', 
      color,
      type,
      listItems: type === 'list' ? finalItems : []
    });
  };

  const handleAddListItem = () => {
    if (newItemText.trim()) {
      setListItems([...listItems, { id: crypto.randomUUID(), text: newItemText.trim(), checked: false }]);
      setNewItemText('');
    }
  };

  const handleKeyDownNewItem = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddListItem();
    }
  };

  const toggleListItem = (id: string) => {
    setListItems(listItems.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const removeListItem = (id: string) => {
    setListItems(listItems.filter(item => item.id !== id));
  };

  const updateListItemText = (id: string, newText: string) => {
    setListItems(listItems.map(item => 
      item.id === id ? { ...item, text: newText } : item
    ));
  };

  const toggleType = () => {
    if (type === 'text') {
      // Ubah dari teks ke list. (Opsional: memecah teks per baris jadi item)
      const lines = content.split('\n').filter(line => line.trim());
      const newItems = lines.map(line => ({ id: crypto.randomUUID(), text: line, checked: false }));
      setListItems(newItems.length > 0 ? newItems : listItems);
      setType('list');
    } else {
      // Ubah dari list ke teks
      const newText = listItems.map(item => item.text).join('\n');
      setContent(newText);
      setType('text');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSave()}>
      <DialogContent className={cn("sm:max-w-xl p-0 overflow-hidden border-none", color)}>
        <DialogTitle className="sr-only">Editor Catatan</DialogTitle>
        <div className="flex flex-col">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul"
            className="border-none text-lg font-semibold shadow-none focus-visible:ring-0 bg-transparent px-6 py-4"
          />
          
          {type === 'text' ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Buat catatan..."
              className="border-none shadow-none focus-visible:ring-0 resize-none min-h-[150px] bg-transparent px-6"
              autoFocus
            />
          ) : (
            <div className="px-6 py-2 min-h-[150px] space-y-2 max-h-[40vh] overflow-y-auto">
              {listItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 group">
                  <Checkbox 
                    checked={item.checked} 
                    onCheckedChange={() => toggleListItem(item.id)}
                    className="mt-0.5"
                  />
                  <Input 
                    value={item.text}
                    onChange={(e) => updateListItemText(item.id, e.target.value)}
                    className={cn(
                      "flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent h-7 px-1",
                      item.checked && "line-through text-slate-400"
                    )}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeListItem(item.id)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              <div className="flex items-center gap-3 pt-2 text-slate-500">
                <Plus className="h-4 w-4 ml-0.5" />
                <Input 
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={handleKeyDownNewItem}
                  onBlur={handleAddListItem}
                  placeholder="Item daftar"
                  className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent h-7 px-1 text-slate-500 placeholder:text-slate-400"
                  autoFocus={listItems.length === 0}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 px-6 bg-black/5 dark:bg-white/5">
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-600">
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex flex-wrap gap-2 max-w-[200px]">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c}
                        className={cn(
                          "w-8 h-8 rounded-full border border-slate-200 transition-transform hover:scale-110",
                          c,
                          color === c && "ring-2 ring-blue-500 ring-offset-2"
                        )}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleType}
                title={type === 'text' ? "Tampilkan kotak centang" : "Sembunyikan kotak centang"}
                className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-600"
              >
                {type === 'text' ? <ListTodo className="h-4 w-4" /> : <Type className="h-4 w-4" />}
              </Button>
            </div>

            <Button onClick={handleSave} variant="ghost" className="font-semibold hover:bg-black/10 dark:hover:bg-white/10 text-slate-700">
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
