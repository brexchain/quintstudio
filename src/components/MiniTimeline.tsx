import React from 'react';
import { motion } from 'motion/react';
import { Play, Square, Repeat, Layers, Edit3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { SongBlock } from './SongTimeline';

interface MiniTimelineProps {
  blocks: SongBlock[];
  activeBlockId?: string | null;
  accentColor: string;
  theme: 'dark' | 'light';
  isPlaying: boolean;
  isLooping: boolean;
  onPlay: () => void;
  onLoopToggle: () => void;
  onBlockClick?: (id: string) => void;
  onDeleteBlock?: (id: string) => void;
  onTransposeBlock?: (id: string, delta: number) => void;
  onToggleInstruments?: (id: string) => void;
}

export function MiniTimeline({ 
  blocks, 
  activeBlockId, 
  accentColor, 
  theme, 
  isPlaying, 
  isLooping, 
  onPlay, 
  onLoopToggle, 
  onBlockClick,
  onDeleteBlock,
  onTransposeBlock,
  onToggleInstruments
}: MiniTimelineProps) {
  const isDark = theme === 'dark';
  
  if (blocks.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-between px-1">
         <div className="flex flex-col">
           <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">Active Arrangement</span>
           <span className="text-[8px] font-bold opacity-20 uppercase">{blocks.length} Blocks</span>
              {!isPlaying && (
                <div className="flex items-center gap-1 opacity-40">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span className="text-[7px] font-black uppercase tracking-wider">Tap to Edit</span>
                </div>
              )}
         </div>
         
         <div className="flex items-center gap-2">
            <button 
              onClick={onLoopToggle}
              className={cn(
                "h-8 px-3 rounded-xl flex items-center justify-center gap-2 transition-all border",
                isLooping 
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500" 
                  : isDark ? "bg-white/5 border-white/5 text-white/40 hover:text-white/60" : "bg-black/5 border-black/5 text-black/40 hover:text-black/60"
              )}
              title="Toggle Loop"
            >
              <Repeat size={12} className={isLooping ? "animate-pulse" : ""} />
              <span className="text-[9px] font-black uppercase tracking-widest">Loop</span>
            </button>
            <button 
              onClick={onPlay}
              className={cn(
                "px-4 h-8 rounded-xl flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest",
                isPlaying
                  ? "bg-red-500/20 text-red-500 border border-red-500/30"
                  : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95"
              )}
            >
              {isPlaying ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              {isPlaying ? "Stop" : "Play"}
            </button>
         </div>
      </div>
      
      <div className="w-full overflow-x-auto pb-2 flex gap-1.5 no-scrollbar snap-x">
        {blocks.map((block, idx) => {
          const isActive = activeBlockId === block.id;
          
          return (
            <div key={block.id} className="relative group/block flex-shrink-0">
              <motion.button
                onClick={() => onBlockClick?.(block.id)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex-shrink-0 min-w-[72px] h-20 rounded-2xl flex flex-col items-center justify-center border transition-all snap-start relative overflow-hidden",
                  isActive 
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_4px_20px_rgba(16,185,129,0.15)]" 
                    : isDark ? "border-white/5 bg-white/5 hover:bg-white/10" : "border-black/5 bg-black/5 hover:bg-black/10"
                )}
              >
                {/* Highlight bar for active block */}
                {isActive && (
                  <motion.div 
                    layoutId="active-bar"
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
                
                <span className={cn(
                  "text-[15px] font-black italic tracking-tighter transition-colors leading-none mb-1",
                  isActive ? "text-emerald-500" : isDark ? "text-white/80" : "text-black/80"
                )}>
                  {block.type === 'pause' ? '|' : (block.note + (block.isMinor ? 'm' : ''))}
                </span>
                
                {/* Instrument dots */}
                <div className="flex gap-0.5 mb-1.5 opacity-40">
                  {block.instruments?.map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-emerald-500" />
                  )) || (
                    <div className="w-4 h-0.5 rounded-full bg-white/20" />
                  )}
                </div>

                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(4, block.duration) }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-1.5 h-0.5 rounded-full transition-colors",
                        isActive ? "bg-emerald-500/60" : isDark ? "bg-white/20" : "bg-black/20"
                      )} 
                    />
                  ))}
                </div>
                
                {/* Pulse effect for active */}
                {isActive && (
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: [0, 0.1, 0] }}
                     transition={{ duration: 2, repeat: Infinity }}
                     className="absolute inset-0 bg-emerald-500 pointer-events-none"
                  />
                )}
              </motion.button>

              {/* Overlay Controls (Positioned Outside Button To Avoid Nesting Error) */}
              {!isPlaying && (
                <>
                  {/* Delete Button (Upper Right) */}
                  <div className={cn(
                    "absolute -top-1 -right-1 transition-all z-20",
                    isActive ? "opacity-100" : "opacity-0 group-hover/block:opacity-100"
                  )}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteBlock?.(block.id); }}
                      className="w-5 h-5 rounded-lg bg-red-500 text-white flex items-center justify-center hover:scale-110 active:scale-90 shadow-lg shadow-red-500/40"
                    >
                      <span className="text-[12px] font-black italic leading-none">×</span>
                    </button>
                  </div>

                  {/* Quick Edit Hint (Upper Left) */}
                  <div className="absolute top-1 left-1 opacity-0 group-hover/block:opacity-100 transition-opacity pointer-events-none">
                     <Edit3 size={10} className="text-white/40" />
                  </div>

                  {/* Bottom Transpose Controls (Optional but handy) */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/block:opacity-100 transition-all flex gap-1 z-20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onTransposeBlock?.(block.id, -1); }}
                      className="w-4 h-4 rounded-md bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-emerald-500 transition-colors"
                    >
                      <span className="text-[8px] font-black">-</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onTransposeBlock?.(block.id, 1); }}
                      className="w-4 h-4 rounded-md bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-emerald-500 transition-colors"
                    >
                      <span className="text-[8px] font-black">+</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
