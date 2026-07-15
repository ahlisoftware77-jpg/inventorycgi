'use client';

import { useActionState } from 'react';
import { getAssetInsightsAction } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const initialState = {
  message: null,
  error: null,
};

export default function AIInsights() {
  const [state, formAction, isPending] = useActionState(getAssetInsightsAction, initialState);

  const renderContent = (text: string | null) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      // Bold parsing
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const lineElements = parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="font-extrabold text-amber-300 drop-shadow-sm">{part}</strong>;
        }
        return part;
      });

      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('### ')) {
        return <h4 key={idx} className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 mt-5 mb-2 border-l-2 border-amber-400 pl-2 text-left">{trimmedLine.replace('### ', '')}</h4>;
      }
      if (trimmedLine.startsWith('## ')) {
        return <h3 key={idx} className="text-sm sm:text-base font-black uppercase tracking-widest text-white mt-6 mb-3 border-b border-white/10 pb-1 text-left">{trimmedLine.replace('## ', '')}</h3>;
      }
      if (trimmedLine.startsWith('# ')) {
        return <h2 key={idx} className="text-base sm:text-lg font-black uppercase tracking-widest text-white mt-7 mb-4 border-b-2 border-white/20 pb-2 text-left">{trimmedLine.replace('# ', '')}</h2>;
      }
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // Strip out bold markers if they are parsed separately
        const contentStr = trimmedLine.replace(/^[-*]\s+/, '');
        const contentParts = contentStr.split(/\*\*(.*?)\*\*/g);
        const contentElements = contentParts.map((part, i) => {
          if (i % 2 === 1) {
            return <strong key={i} className="font-extrabold text-amber-300 drop-shadow-sm">{part}</strong>;
          }
          return part;
        });

        return (
          <div key={idx} className="flex items-start gap-2 ml-4 my-1.5 text-left">
            <span className="text-amber-400 shrink-0 mt-1 select-none text-[9px]">•</span>
            <p className="text-xs sm:text-sm font-medium leading-relaxed text-white/95">
              {contentElements}
            </p>
          </div>
        );
      }
      if (trimmedLine === '') {
        return <div key={idx} className="h-2" />;
      }
      
      // Check for table rows (contains | )
      if (trimmedLine.includes('|')) {
        const columns = trimmedLine.split('|').map(c => c.trim()).filter(Boolean);
        if (columns.length > 0) {
          if (trimmedLine.includes('---') || columns.every(c => c.startsWith('-'))) return null;
          
          return (
            <div key={idx} className="grid grid-cols-4 gap-2 py-2 px-3 border-b border-white/5 bg-white/5 text-left text-xs font-bold rounded-lg my-1">
              {columns.map((col, colIdx) => (
                <div key={colIdx} className={cn("truncate text-white/95", colIdx === 0 && "font-black text-amber-300")}>
                  {col}
                </div>
              ))}
            </div>
          );
        }
      }
      
      return (
        <p key={idx} className="text-xs sm:text-sm font-medium leading-relaxed text-white/95 my-1 text-left">
          {lineElements}
        </p>
      );
    });
  };

  return (
    <Card className="h-full border-none shadow-lg bg-gradient-to-br from-indigo-600 to-blue-700 text-white overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <Sparkles className="h-24 w-24" />
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-sm font-black uppercase tracking-wider">Analis Aset AI</CardTitle>
          </div>
          <Badge variant="outline" className="border-white/30 text-[9px] text-white/80 font-black uppercase tracking-widest">Powered by Genkit</Badge>
        </div>
        <CardDescription className="text-white/60 text-[10px] font-medium uppercase tracking-widest">Analisis Inventaris Cerdas Real-time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[350px] p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner overflow-y-auto custom-scrollbar">
          {state.error ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-red-200 animate-in fade-in duration-300">
              <div className="p-3 bg-red-500/20 rounded-full border border-red-500/30">
                <AlertCircle className="h-8 w-8 text-red-300" />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-red-200">Gagal Menghubungkan AI</p>
              <p className="text-[10px] font-medium leading-relaxed opacity-90 max-w-[240px] mx-auto text-red-100 bg-red-950/20 p-2 rounded-lg border border-red-500/10">
                {state.error}
              </p>
              <p className="text-[9px] font-bold text-amber-300 uppercase tracking-widest mt-1">Periksa kembali API Key di Pengaturan</p>
            </div>
          ) : state.message ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
              {renderContent(state.message)}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 opacity-60">
              <ShieldCheck className="h-8 w-8 text-white/40" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sistem Siap Memberikan Wawasan</p>
            </div>
          )}
        </div>
        
        <form action={formAction}>
          <Button 
            disabled={isPending}
            className="w-full h-11 bg-white text-blue-700 hover:bg-blue-50 font-black uppercase tracking-tighter shadow-xl shadow-black/10 rounded-xl transition-all active:scale-95"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {state.message ? 'Perbarui Wawasan' : 'Hasilkan Analisis AI'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Badge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full border text-[10px]", className)}>
      {children}
    </span>
  );
}
