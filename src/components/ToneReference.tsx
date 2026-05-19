import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ReferenceNote {
  note: string;
  freq: number;
  label?: string;
  octave?: number;
}

export function ToneReference({ 
  referenceA, 
  theme = 'dark', 
  notes,
  accentColor = '#10b981',
  onNoteTrigger,
  onPlay
}: { 
  referenceA: number, 
  theme?: 'dark' | 'light',
  notes: ReferenceNote[],
  accentColor?: string,
  onNoteTrigger?: (note: ReferenceNote | null) => void,
  onPlay?: (note: string, octave: number) => void
}) {
  const [playingNote, setPlayingNote] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const handlePlay = (item: ReferenceNote) => {
    const { note, label } = item;
    const uniqueId = label ? `${note}-${label}` : note;
    setPlayingNote(uniqueId);
    
    // Extract octave from label if possible, e.g. "E2" -> 2
    const octaveMatch = label?.match(/\d/);
    const octave = item.octave || (octaveMatch ? parseInt(octaveMatch[0]) : 2);

    if (onNoteTrigger) onNoteTrigger({ ...item, octave });
    if (onPlay) onPlay(note, octave);
    
    setTimeout(() => {
      setPlayingNote(prev => prev === uniqueId ? null : prev);
      if (onNoteTrigger) onNoteTrigger(null);
    }, 2000);
  };

  return (
    <div className={cn(
      "grid gap-2 w-full max-w-2xl px-4",
      notes.length > 8 ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-4"
    )}>
      {notes.map((item, idx) => {
        const uniqueId = item.label ? `${item.note}-${item.label}` : item.note;
        const isActive = playingNote === uniqueId;

        // Extract octave from label if possible, e.g. "E2" -> 2
        const octaveMatch = item.label?.match(/\d/);
        const octave = octaveMatch ? parseInt(octaveMatch[0]) : 2;

        return (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePlay(item)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 group relative",
              isActive 
                ? "shadow-[0_0_15px_rgba(0,0,0,0.1)]" 
                : isDark ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-black/5 border-black/5 hover:bg-black/10"
            )}
            style={{ 
              backgroundColor: isActive ? `${accentColor}33` : undefined,
              borderColor: isActive ? `${accentColor}80` : undefined
            }}
          >
            <span className={cn(
              "text-[10px] font-mono mb-1 transition-colors",
              isActive 
                ? "font-bold" 
                : isDark ? "text-white/40 group-hover:text-white/60" : "text-black/40 group-hover:text-black/60"
            )}
            style={{ color: isActive ? accentColor : undefined }}
            >
              {item.label || item.note}
            </span>
            <Volume2 
              size={12} 
              className={cn(
                "transition-colors",
                isActive 
                  ? "" 
                  : isDark ? "text-white/10 group-hover:text-emerald-400/40" : "text-black/10 group-hover:text-emerald-400/40"
              )} 
              style={{ color: isActive ? accentColor : undefined }}
            />
            
            {isActive && (
              <motion.div 
                layoutId="active-glow"
                className="absolute -inset-1 rounded-xl border pointer-events-none"
                style={{ borderColor: `${accentColor}4D` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
