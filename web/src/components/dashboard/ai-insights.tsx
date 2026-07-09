'use client';

import { useActionState } from 'react';
import { getAssetInsightsAction } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw, MessageSquareQuote, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const initialState = {
  message: null,
  error: null,
};

export default function AIInsights() {
  const [state, formAction, isPending] = useActionState(getAssetInsightsAction, initialState);

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
        <div className="min-h-[120px] p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner overflow-y-auto custom-scrollbar">
          {state.message ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <MessageSquareQuote className="h-4 w-4 text-primary-foreground/40" />
              <p className="text-xs sm:text-sm font-medium leading-relaxed italic text-white/90">
                "{state.message}"
              </p>
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
