'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Note } from './types';
import NoteGrid from './note-grid';
import NoteEditor from './note-editor';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function NotesContent() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'users', user.uid, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes: Note[] = [];
      snapshot.forEach((doc) => {
        fetchedNotes.push({ id: doc.id, ...doc.data() } as Note);
      });
      setNotes(fetchedNotes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveNote = async (noteData: Partial<Note>) => {
    if (!user) return;
    
    if (editingNote) {
      const noteRef = doc(db, 'users', user.uid, 'notes', editingNote.id);
      await updateDoc(noteRef, {
        ...noteData,
        updatedAt: Date.now()
      });
    } else {
      await addDoc(collection(db, 'users', user.uid, 'notes'), {
        ...noteData,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    closeEditor();
  };

  const handleDeleteNote = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'notes', id));
  };

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    if (!user) return;
    const noteRef = doc(db, 'users', user.uid, 'notes', id);
    await updateDoc(noteRef, { isPinned: !currentPin });
  };

  const handleToggleCheck = async (noteId: string, itemId: string, currentChecked: boolean) => {
    if (!user) return;
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.listItems) return;

    const newListItems = note.listItems.map(item => 
      item.id === itemId ? { ...item, checked: !currentChecked } : item
    );

    const noteRef = doc(db, 'users', user.uid, 'notes', noteId);
    await updateDoc(noteRef, { listItems: newListItems });
  };

  const openEditor = (note?: Note) => {
    if (note) {
      setEditingNote(note);
    } else {
      setEditingNote(null);
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingNote(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Catatan</h1>
          <p className="text-slate-500">Kelola to-do list dan catatan Anda.</p>
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <Button 
          onClick={() => openEditor()} 
          className="w-full max-w-2xl bg-white text-slate-500 justify-start h-12 px-4 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Buat catatan baru...
        </Button>
      </div>

      <NoteGrid 
        notes={notes} 
        loading={loading} 
        onEdit={openEditor} 
        onDelete={handleDeleteNote}
        onTogglePin={handleTogglePin}
        onToggleCheck={handleToggleCheck}
      />

      <NoteEditor 
        isOpen={isEditorOpen} 
        onClose={closeEditor} 
        onSave={handleSaveNote} 
        initialData={editingNote} 
      />
    </div>
  );
}
