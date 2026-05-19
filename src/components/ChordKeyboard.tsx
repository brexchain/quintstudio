import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ChordKeyboardProps {
  note: string;
  isMinor: boolean;
  theme: 'dark' | 'light';
}

export function ChordKeyboard({ note, isMinor, theme }: ChordKeyboardProps) {
  const isDark = theme === 'dark';
  
  const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const getChordNotes = () => {
    const root = note.replace('m', '');
    const rootIdx = CHROMATIC.indexOf(root);
    if (rootIdx === -1) return [];
    
    const thirdOffset = isMinor ? 3 : 4;
    const fifthOffset = 7;
    
    return [
      rootIdx % 12,
      (rootIdx + thirdOffset) % 12,
      (rootIdx + fifthOffset) % 12
    ];
  };

  const activeIndices = getChordNotes();

  const keys = [
    { note: 'C', isBlack: false }, { note: 'C#', isBlack: true },
    { note: 'D', isBlack: false }, { note: 'D#', isBlack: true },
    { note: 'E', isBlack: false }, { note: 'F', isBlack: false },
    { note: 'F#', isBlack: true }, { note: 'G', isBlack: false },
    { note: 'G#', isBlack: true }, { note: 'A', isBlack: false },
    { note: 'A#', isBlack: true }, { note: 'B', isBlack: false },
    { note: 'C', isBlack: false }, { note: 'C#', isBlack: true },
    { note: 'D', isBlack: false }, { note: 'D#', isBlack: true },
    { note: 'E', isBlack: false }
  ];

  return (
    <div className={cn(
      "w-full p-6 rounded-[32px] border flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4",
      isDark ? "bg-black/20 border-white/5" : "bg-white/20 border-black/5"
    )}>
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Theory Visualizer</h3>
          <span className="text-[14px] font-black italic tracking-tighter text-emerald-500 uppercase">
            {note}{isMinor ? 'm' : ''} Voicing
          </span>
        </div>
        <div className="flex gap-1.5 h-6">
           {activeIndices.map((idx) => (
             <div key={idx} className="px-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
               <span className="text-[9px] font-black italic text-emerald-500">{CHROMATIC[idx]}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="relative flex justify-center h-32 w-full max-w-2xl mx-auto overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-2">
        <div className="flex w-full relative h-full">
          {keys.filter(k => !k.isBlack).map((key, i) => {
            const chromIdx = CHROMATIC.indexOf(key.note);
            const isActive = activeIndices.includes(chromIdx);
            
            return (
              <div 
                key={i}
                className={cn(
                  "flex-1 border-x first:border-l-0 last:border-r-0 relative transition-all duration-300",
                  isDark ? "border-white/5" : "border-black/5",
                  isActive ? "bg-emerald-500/20" : "bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                  />
                )}
              </div>
            );
          })}

          {/* Black Keys */}
          <div className="absolute inset-0 flex pointer-events-none px-[2%]">
            {[1, 2, 4, 5, 6, 8, 9, 11, 12, 13].map((pos, i) => {
              const blackKeyMap = [1, 3, 6, 8, 10, 1, 3, 6, 8, 10];
              const chromIdx = blackKeyMap[i];
              const isActive = activeIndices.includes(chromIdx);
              
              // Skip gaps between E/F and B/C in simplified visualization
              if (pos === 3 || pos === 7 || pos === 10) return <div key={pos} className="flex-1 invisible" />;
              
              return (
                <div key={pos} className="flex-1 relative translate-x-[-50%] z-10 h-[60%]">
                  <div className={cn(
                    "w-[80%] mx-auto h-full rounded-b-lg border border-white/10 transition-all duration-300",
                    isActive ? "bg-emerald-400 shadow-[0_4px_15px_rgba(52,211,153,0.4)]" : "bg-zinc-900"
                  )} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
