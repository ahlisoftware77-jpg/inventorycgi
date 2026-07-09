'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function AnalogClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondDegrees = (seconds / 60) * 360;
  const minuteDegrees = (minutes / 60) * 360 + (seconds / 60) * 6;
  const hourDegrees = ((hours % 12) / 12) * 360 + (minutes / 60) * 30;

  return (
    <Card className="border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] border-b-4 border-b-indigo-500/70 dark:border-b-indigo-800/80 hover:-translate-y-[4px] active:translate-y-0 transition-all duration-300">
      <CardHeader className="pb-2 text-left">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-300">
            Waktu & Tanggal
          </CardTitle>
          <span className="text-sm select-none">⏰</span>
        </div>
        <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Sinkronisasi Lokal PT. CGI</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow flex flex-col items-center justify-center pt-4 pb-6">
        {/* Luxury Dial Clock Face */}
        <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-slate-900 to-slate-950 border-4 border-slate-800 shadow-2xl flex items-center justify-center mb-5 ring-4 ring-slate-800/30">
          
          {/* Subtle Dial Ring */}
          <div className="absolute inset-2 rounded-full border border-white/5 bg-radial-gradient" />

          {/* Dial Markers */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30) * (Math.PI / 180);
            const x = Math.sin(angle) * 76;
            const y = -Math.cos(angle) * 76;
            const isQuarter = i % 3 === 0;

            return (
              <div 
                key={`marker-${i}`}
                className="absolute"
                style={{
                  transform: `translate(${x}px, ${y}px)`
                }}
              >
                <div className={cn(
                  "rounded-full",
                  isQuarter ? "w-2 h-2 bg-indigo-400" : "w-1.5 h-1.5 bg-white/20"
                )} />
              </div>
            );
          })}

          {/* Modern Dial Quarter Numbers */}
          <span className="absolute top-6 text-xs font-black text-white/50 tracking-tighter">12</span>
          <span className="absolute right-6 text-xs font-black text-white/50 tracking-tighter">3</span>
          <span className="absolute bottom-6 text-xs font-black text-white/50 tracking-tighter">6</span>
          <span className="absolute left-6 text-xs font-black text-white/50 tracking-tighter">9</span>

          {/* Brand Name */}
          <span className="absolute top-1/4 text-[8px] font-bold text-indigo-400/30 uppercase tracking-[0.2em]">CGI SYSTEM</span>

          {/* Hour Hand */}
          <div 
            className="absolute bottom-1/2 left-1/2 origin-bottom rounded-full bg-white shadow-lg transition-transform duration-100" 
            style={{ 
              transform: `translateX(-50%) rotate(${hourDegrees}deg)`,
              width: '4px',
              height: '38px',
            }} 
          />
          
          {/* Minute Hand */}
          <div 
            className="absolute bottom-1/2 left-1/2 origin-bottom rounded-full bg-slate-300 shadow-lg transition-transform duration-100" 
            style={{ 
              transform: `translateX(-50%) rotate(${minuteDegrees}deg)`,
              width: '2.5px',
              height: '56px',
            }} 
          />
          
          {/* Second Hand (Neon Cyan) */}
          <div 
            className="absolute bottom-1/2 left-1/2 origin-bottom rounded-full bg-cyan-400 shadow-cyan-400/50 shadow-md transition-transform duration-100 z-10" 
            style={{ 
              transform: `translateX(-50%) rotate(${secondDegrees}deg)`,
              width: '1.5px',
              height: '62px',
            }} 
          />

          {/* Center Pin */}
          <div className="absolute w-3 h-3 rounded-full bg-slate-900 border-2 border-indigo-400 shadow-md z-20" />
        </div>

        {/* Digital Clock Info Panel */}
        <div className="text-center space-y-1">
          <p className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-mono">
            {format(time, 'HH:mm:ss')}
          </p>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">
              {format(time, 'EEEE', { locale: id })}
            </p>
            <p className="text-[10px] font-bold text-slate-400">
              {format(time, 'dd MMMM yyyy', { locale: id })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to prevent dependency import issues for cn
import { cn } from '@/lib/utils';
