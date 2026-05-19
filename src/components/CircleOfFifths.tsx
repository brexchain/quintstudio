import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Sparkles, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface CircleOfFifthsProps {
  onChordClick?: (note: string, isMinor: boolean) => void;
  onChordAdd?: (note: string, isMinor: boolean) => void;
  onNoteSelect?: (note: string, isMinor: boolean) => void;
  onPlayChord?: (note: string, isMinor: boolean) => void;
  accentColor: string;
  theme: 'light' | 'dark';
  activeNote?: string | null;
  language?: any;
  isLarge?: boolean;
}

const FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MINOR_FIFTHS = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

export function CircleOfFifths({ 
  onChordClick, 
  onChordAdd, 
  onNoteSelect, 
  onPlayChord, 
  accentColor, 
  theme, 
  activeNote, 
  isLarge 
}: CircleOfFifthsProps) {
  const [activeFamily, setActiveFamily] = useState<{ index: number; type: 'major' | 'minor' } | null>(null);
  
  const radius = isLarge ? 140 : 120;
  const innerRadius = isLarge ? 90 : 80;
  const center = 160;

  const isFamilyMember = (index: number, type: 'major' | 'minor') => {
    if (!activeFamily) return false;
    const { index: fIdx } = activeFamily;
    const relatedIndices = [(fIdx - 1 + 12) % 12, fIdx, (fIdx + 1) % 12];
    return relatedIndices.includes(index);
  };

  const handleChordInteraction = (note: string, isMinor: boolean, index: number) => {
    const play = onChordClick || onPlayChord;
    const add = onChordAdd || onNoteSelect;
    
    if (play) play(note, isMinor);
    if (add) add(note, isMinor);
    
    setActiveFamily({ index, type: isMinor ? 'minor' : 'major' });
  };

  const getRoleLabel = (index: number, type: 'major' | 'minor') => {
    if (!activeFamily) return null;
    const { index: fIdx, type: fType } = activeFamily;
    const diff = (index - fIdx + 12) % 12;

    if (fType === 'major') {
      if (type === 'major') {
        if (diff === 0) return 'I';
        if (diff === 1) return 'V';
        if (diff === 11) return 'IV';
      } else {
        if (diff === 0) return 'vi';
        if (diff === 1) return 'iii';
        if (diff === 11) return 'ii';
      }
    } else {
      // Minor key roles
      if (type === 'minor') {
        if (diff === 0) return 'i';
        if (diff === 1) return 'v';
        if (diff === 11) return 'iv';
      } else {
        if (diff === 0) return 'III';
        if (diff === 1) return 'VII';
        if (diff === 11) return 'VI';
      }
    }
    return null;
  };

  return (
    <div className="relative w-full flex flex-col items-center gap-6 py-8">
      <div className="flex flex-col items-center mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">Harmonic Explorer</h3>
        <p className="text-[9px] font-bold opacity-20">Tap to Play • Hold to Add to Arrange</p>
      </div>

      <div className="relative w-[320px] h-[320px]">
        {/* Background Glow */}
        <div 
          className="absolute inset-0 rounded-full blur-[100px] opacity-10 pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />

        <svg width="320" height="320" viewBox="0 0 320 320" className="overflow-visible">
          {/* Outer Ring (Major) */}
          {FIFTHS.map((note, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            
            const isMain = activeFamily?.index === i && activeFamily?.type === 'major';
            const isFamily = isFamilyMember(i, 'major');
            const roleLabel = getRoleLabel(i, 'major');

            return (
              <g 
                key={`major-${note}`} 
                className="cursor-pointer group"
                onClick={() => handleChordInteraction(note, false, i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onChordAdd && onChordAdd(note, false);
                }}
              >
                <motion.circle
                  cx={x}
                  cy={y}
                  r={isMain ? "28" : isFamily ? "26" : "24"}
                  initial={false}
                  animate={{
                    r: isMain ? 28 : isFamily ? 26 : 24,
                    fill: isMain ? accentColor : isFamily ? `${accentColor}33` : theme === 'dark' ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                    stroke: isMain || isFamily ? accentColor : theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                  }}
                  className="transition-all duration-300"
                />
                <text
                  x={x}
                  y={y - (roleLabel ? 4 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    "text-xs font-black italic tracking-tighter pointer-events-none transition-colors",
                    isMain ? "fill-white" : isFamily ? theme === 'dark' ? "fill-white" : "fill-black" : theme === 'dark' ? "fill-white/60 group-hover:fill-white" : "fill-black/60 group-hover:fill-black"
                  )}
                >
                  {note}
                </text>
                {roleLabel && (
                  <text
                    x={x}
                    y={y + 10}
                    textAnchor="middle"
                    className={cn(
                      "text-[8px] font-black opacity-60 pointer-events-none",
                      isMain ? "fill-white" : theme === 'dark' ? "fill-white" : "fill-black"
                    )}
                  >
                    {roleLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Inner Ring (Minor) */}
          {MINOR_FIFTHS.map((chord, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = center + innerRadius * Math.cos(angle);
            const y = center + innerRadius * Math.sin(angle);
            const note = chord.replace('m', '');
            
            const isMain = activeFamily?.index === i && activeFamily?.type === 'minor';
            const isFamily = isFamilyMember(i, 'minor');
            const roleLabel = getRoleLabel(i, 'minor');

            return (
              <g 
                key={`minor-${chord}`} 
                className="cursor-pointer group"
                onClick={() => handleChordInteraction(note, true, i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onChordAdd && onChordAdd(note, true);
                }}
              >
                <motion.circle
                  cx={x}
                  cy={y}
                  r={isMain ? "22" : isFamily ? "20" : "18"}
                  animate={{
                    r: isMain ? 22 : isFamily ? 20 : 18,
                    fill: isMain ? accentColor : isFamily ? `${accentColor}22` : theme === 'dark' ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    stroke: isMain || isFamily ? accentColor : theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                  }}
                  className="transition-all duration-300"
                />
                <text
                  x={x}
                  y={y - (roleLabel ? 3 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    "text-[9px] font-black italic tracking-tighter pointer-events-none transition-all",
                    isMain ? "fill-white opacity-100" : isFamily ? "opacity-100 fill-current" : "opacity-40 group-hover:opacity-100 fill-current"
                  )}
                >
                  {chord}
                </text>
                {roleLabel && (
                  <text
                    x={x}
                    y={y + 8}
                    textAnchor="middle"
                    className={cn(
                      "text-[7px] font-black opacity-50 pointer-events-none",
                      isMain ? "fill-white" : theme === 'dark' ? "fill-white" : "fill-black"
                    )}
                  >
                    {roleLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Center Visualizer Accent */}
          <circle
            cx={center}
            cy={center}
            r="40"
            className="fill-transparent stroke-white/5 stroke-dashed"
            strokeDasharray="4 4"
          />
          <foreignObject x={center - 20} y={center - 20} width="40" height="40">
            <div className="w-full h-full flex items-center justify-center opacity-20">
               <Music size={20} />
            </div>
          </foreignObject>
        </svg>

        {/* Legend/Helper */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 whitespace-nowrap">
          <div className="flex items-center gap-1.5 grayscale opacity-30">
            <div className="w-2 h-2 rounded-full border border-current" />
            <span className="text-[7px] font-black uppercase tracking-widest">Outer: Major</span>
          </div>
          <div className="flex items-center gap-1.5 grayscale opacity-30">
            <div className="w-1.5 h-1.5 rounded-full border border-current opacity-50" />
            <span className="text-[7px] font-black uppercase tracking-widest">Inner: Minor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
