export interface NoteListItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Note {
  id: string;
  type?: 'text' | 'list';
  title: string;
  content: string;
  listItems?: NoteListItem[];
  color: string;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export const NOTE_COLORS = [
  'bg-white dark:bg-slate-900', // Default
  'bg-red-100 dark:bg-red-950',
  'bg-orange-100 dark:bg-orange-950',
  'bg-yellow-100 dark:bg-yellow-950',
  'bg-green-100 dark:bg-green-950',
  'bg-teal-100 dark:bg-teal-950',
  'bg-blue-100 dark:bg-blue-950',
  'bg-purple-100 dark:bg-purple-950',
  'bg-pink-100 dark:bg-pink-950',
  'bg-rose-100 dark:bg-rose-950',
];
