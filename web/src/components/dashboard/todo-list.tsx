'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, CheckCircle2, ListTodo, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export default function TodoList() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Migrate old local storage if exists
    const savedTodos = localStorage.getItem(`todos_${user.uid}`);
    if (savedTodos) {
      try {
        const parsed = JSON.parse(savedTodos);
        if (parsed && parsed.length > 0) {
          const todosRef = collection(db, 'users', user.uid, 'todos');
          parsed.forEach(async (t: Todo) => {
            await addDoc(todosRef, {
              text: t.text,
              completed: t.completed,
              createdAt: t.createdAt
            });
          });
        }
        localStorage.removeItem(`todos_${user.uid}`);
      } catch (e) {
        console.error("Failed to migrate todos", e);
      }
    }

    const q = query(collection(db, 'users', user.uid, 'todos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTodos: Todo[] = [];
      snapshot.forEach((doc) => {
        fetchedTodos.push({ id: doc.id, ...doc.data() } as Todo);
      });
      setTodos(fetchedTodos);
    });

    setMounted(true);
    return () => unsubscribe();
  }, [user]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;
    
    const newTodo = {
      text: inputValue.trim(),
      completed: false,
      createdAt: Date.now()
    };
    
    setInputValue('');
    await addDoc(collection(db, 'users', user.uid, 'todos'), newTodo);
  };

  const toggleTodo = async (id: string) => {
    if (!user) return;
    const todo = todos.find(t => t.id === id);
    if (todo) {
      const todoRef = doc(db, 'users', user.uid, 'todos', id);
      await updateDoc(todoRef, { completed: !todo.completed });
    }
  };

  const deleteTodo = async (id: string) => {
    if (!user) return;
    const todoRef = doc(db, 'users', user.uid, 'todos', id);
    await deleteDoc(todoRef);
  };

  const groupedTodos = useMemo(() => {
    const groups: Record<string, Todo[]> = {};
    const sorted = [...todos].sort((a, b) => b.createdAt - a.createdAt);
    
    sorted.forEach(todo => {
      const date = new Date(todo.createdAt);
      // Format: "Senin, 28 Agustus 2026"
      const dateString = date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      
      if (!groups[dateString]) groups[dateString] = [];
      groups[dateString].push(todo);
    });
    
    return groups;
  }, [todos]);

  if (!mounted) return null;

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <Card className="h-full border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden rounded-[2rem] flex flex-col">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <ListTodo className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                To-Do List
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                {completedCount} dari {todos.length} selesai
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col min-h-[300px] max-h-[400px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <AnimatePresence>
            {todos.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10"
              >
                <CheckCircle2 className="h-10 w-10 mb-3 text-slate-400" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Semua tugas selesai!</p>
              </motion.div>
            ) : (
              Object.entries(groupedTodos).map(([dateLabel, dayTodos]) => (
                <div key={dateLabel} className="space-y-2 mb-6 last:mb-0">
                  <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-1.5 z-10 -mx-1 px-1 flex items-center gap-2">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{dateLabel}</h4>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                  </div>
                  {dayTodos.map(todo => (
                    <motion.div 
                      key={todo.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-300",
                        todo.completed 
                          ? "bg-slate-50 dark:bg-slate-900/50 border-transparent opacity-60" 
                          : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      )}
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <Checkbox 
                          checked={todo.completed} 
                          onCheckedChange={() => toggleTodo(todo.id)}
                          className={cn("rounded-md w-5 h-5", todo.completed && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500")}
                        />
                        <div className="flex flex-col overflow-hidden">
                          <span className={cn(
                            "text-sm font-semibold truncate transition-all",
                            todo.completed ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"
                          )}>
                            {todo.text}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {new Date(todo.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteTodo(todo.id)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ))
            )}
          </AnimatePresence>
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 mt-auto">
          <form onSubmit={addTodo} className="flex gap-2">
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tambah tugas baru..."
              className="rounded-xl h-10 bg-white dark:bg-slate-900 border-slate-200 shadow-sm"
            />
            <Button type="submit" disabled={!inputValue.trim()} className="rounded-xl h-10 w-10 p-0 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-md">
              <Plus className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
