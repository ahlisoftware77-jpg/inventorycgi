'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ListTodo, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, limit, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Note } from '../notes/types';
import NoteGrid from '../notes/note-grid';
import NoteEditor from '../notes/note-editor';
import Link from 'next/link';

export default function TodoList() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Fetch only 6 most recent notes for the dashboard
    const q = query(
      collection(db, 'users', user.uid, 'notes'), 
      orderBy('createdAt', 'desc'),
      limit(6)
    );
    
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
    if (!user || !editingNote) return;
    const noteRef = doc(db, 'users', user.uid, 'notes', editingNote.id);
    await updateDoc(noteRef, {
      ...noteData,
      updatedAt: Date.now()
    });
    setIsEditorOpen(false);
    setEditingNote(null);
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

  const openEditor = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  return (
    <Card className="flex flex-col h-full border-teal-900/10 shadow-sm overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="bg-white/50 dark:bg-slate-950/50 border-b border-teal-900/5 pb-4 px-6 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg text-yellow-600 dark:text-yellow-500">
            <ListTodo className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">Catatan & Todo</CardTitle>
        </div>
        <Link 
          href="/notes" 
          className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 group"
        >
          Lihat Semua
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1 p-4 bg-slate-50/50 dark:bg-slate-900/20 overflow-y-auto">
        <NoteGrid 
          notes={notes} 
          loading={loading} 
          onEdit={openEditor}
          onDelete={handleDeleteNote}
          onTogglePin={handleTogglePin}
          onToggleCheck={handleToggleCheck}
          isDashboardWidget={true}
        />
        
        {!loading && notes.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-500">
              <ListTodo className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-slate-700 dark:text-slate-300">Belum ada catatan</p>
              <p className="text-sm text-slate-500">Buat catatan baru melalui menu Catatan.</p>
            </div>
            <Link 
              href="/notes" 
              className="mt-2 text-sm font-medium px-4 py-2 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
            >
              Buat Catatan Pertama
            </Link>
          </div>
        )}
      </CardContent>

      <NoteEditor 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        onSave={handleSaveNote} 
        initialData={editingNote} 
      />
    </Card>
  );
}
