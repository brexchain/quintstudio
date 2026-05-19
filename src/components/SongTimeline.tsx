import React, { useState, useRef } from 'react';
import { motion, Reorder, AnimatePresence, useDragControls } from 'motion/react';
import { Trash2, Plus, Minus, Clock, Music, Zap, AudioWaveform, Keyboard, Sparkles, Drum, Guitar, Waves, Volume2, MoveHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SongBlock {
  id: string;
  note: string;
  isMinor: boolean;
  type: 'chord' | 'pause';
  duration: number;
  section?: 'Verse' | 'Chorus' | 'Bridge' | 'Intro';
  isAccented?: boolean;
  strumMode?: 'instant' | 'arpeggio';
  lyrics?: string;
  instruments?: string[];
  style?: Record<string, string>;
  volume?: number;
  intensity?: number;
}

interface TimelineItemProps {
  block: SongBlock;
  activeBlockId?: string | null;
  accentColor: string;
  isDark: boolean;
  onRemove: (id: string) => void;
  onUpdateSection: (id: string, s: any) => void;
  onUpdateAccent: (id: string) => void;
  onUpdateStrum: (id: string) => void;
  shiftChord: (block: SongBlock, dir: number) => void;
  onUpdateChord: (id: string, note: string, isMinor: boolean) => void;
  onUpdateLyrics: (id: string, lyrics: string) => void;
  onUpdateInstruments: (id: string, instrId: string) => void;
  onEdit: (block: SongBlock) => void;
  onUpdateEffects: (id: string, type: 'volume' | 'intensity', delta: number) => void;
  onUpdateDuration: (id: string, delta: number) => void;
  INSTRUMENTS: any[];
}

function TimelineItem({ 
  block, 
  activeBlockId, 
  accentColor, 
  isDark, 
  onRemove, 
  onUpdateSection,
  onUpdateAccent,
  onUpdateStrum,
  shiftChord,
  onUpdateChord,
  onUpdateLyrics,
  onUpdateInstruments,
  onUpdateEffects,
  onUpdateDuration,
  onEdit,
  INSTRUMENTS
}: TimelineItemProps) {
  const dragControls = useDragControls();
  const [isPressing, setIsPressing] = useState(false);
  const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handlePointerDown = (event: React.PointerEvent) => {
    setIsPressing(true);
    const startX = event.clientX;
    const startY = event.clientY;
    
    const timeout = setTimeout(() => {
      dragControls.start(event);
      setIsPressing(false);
    }, 500); // Half a second for long press

    const clear = (e: PointerEvent) => {
      clearTimeout(timeout);
      setIsPressing(false);
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('pointermove', moveCheck);
    };

    const moveCheck = (e: PointerEvent) => {
      if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) {
        clear(e);
      }
    };

    window.addEventListener('pointerup', clear);
    window.addEventListener('pointermove', moveCheck);
  };

  return (
    <Reorder.Item
      value={block}
      dragControls={dragControls}
      dragListener={false}
      className="snap-center"
    >
      <motion.div 
        onPointerDown={handlePointerDown}
        onClick={() => onEdit(block)}
        animate={{ 
          scale: activeBlockId === block.id ? 1.05 : (isPressing ? 1.02 : 1),
          borderColor: activeBlockId === block.id ? accentColor : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
          backgroundColor: activeBlockId === block.id ? `${accentColor}10` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')
        }}
        className={cn(
          "group relative w-[180px] sm:w-[220px] lg:w-[260px] flex flex-col items-center justify-between p-5 lg:p-7 rounded-[40px] border transition-all shadow-lg select-none",
          activeBlockId === block.id ? "shadow-2xl z-40" : "",
          isPressing ? "cursor-grabbing" : "cursor-default"
        )}
      >
        {/* Rearrangement Indicator & Edit Cue */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-10 group-hover:opacity-40 transition-opacity">
           <MoveHorizontal size={10} />
           <div className="w-1 h-1 rounded-full bg-white/20" />
           <span className="text-[6px] font-black uppercase tracking-widest">Tap to Edit</span>
        </div>

        {/* Laser Beam Effect */}
        <AnimatePresence>
          {activeBlockId === block.id && (
            <>
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: [0, 1, 0.4, 0.8, 0], height: '100vh' }}
                exit={{ opacity: 0, height: 0 }}
                className="absolute -top-[100vh] left-1/2 -translate-x-1/2 w-[1px] pointer-events-none blur-[0.5px] z-0"
                style={{ background: `linear-gradient(to top, ${accentColor}, transparent)` }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <motion.div 
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
                 className="absolute inset-0 rounded-[32px] blur-xl z-0 pointer-events-none"
                 style={{ backgroundColor: `${accentColor}33` }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Section Labels */}
        <div className="flex items-center gap-1 border border-white/5 bg-white/5 p-1 rounded-full relative z-10">
          {['Intro', 'Verse', 'Chorus', 'Bridge'].map(s => (
            <button 
              key={s}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onUpdateSection(block.id, block.section === s ? undefined : s as any); }}
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-tighter transition-all",
                block.section === s ? "bg-emerald-500 text-white" : "opacity-20 hover:opacity-100 text-current"
              )}
            >
              {s[0]}
            </button>
          ))}
        </div>

        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(block.id); }}
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all z-20 hover:scale-110 active:scale-95 shadow-xl"
        >
          <Trash2 size={12} />
        </button>

        {/* Accents & Performance Sliders */}
        <div className="flex items-center gap-3 w-full px-4 mb-2 relative z-10">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onUpdateAccent(block.id); }}
            className={cn(
              "flex-1 py-1.5 rounded-xl flex items-center justify-center gap-2 transition-all border text-[8px] font-black uppercase tracking-widest",
              block.isAccented 
                ? "bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20" 
                : "bg-white/5 border-transparent text-white/20 hover:opacity-100 hover:bg-white/10"
            )}
            title="Accent"
          >
            <Zap size={10} fill={block.isAccented ? "currentColor" : "none"} />
            <span>Accent</span>
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onUpdateStrum(block.id); }}
            className={cn(
              "flex-1 py-1.5 rounded-xl flex items-center justify-center gap-2 transition-all border text-[8px] font-black uppercase tracking-widest",
              block.strumMode === 'arpeggio'
                ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20" 
                : "bg-white/5 border-transparent text-white/20 hover:opacity-100 hover:bg-white/10"
            )}
            title="Arpeggio"
          >
            <Waves size={10} />
            <span>Arp</span>
          </button>
        </div>

        <div className="flex flex-col items-center w-full relative z-10">
          <div className="flex flex-col items-center gap-1 group/select w-full">
            {block.type === 'pause' ? (
              <span className="text-4xl font-black italic tracking-tighter opacity-20">|</span>
            ) : (
              <div className="relative flex items-center justify-center gap-1 w-full bg-white/[0.03] py-3 rounded-2xl border border-white/5 sm:group-hover:bg-white/[0.08] transition-all">
                <button 
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); shiftChord(block, -1); }}
                  className="p-1.5 rounded-full hover:bg-white/20 sm:opacity-0 sm:group-hover:opacity-100 transition-all text-white/40 hover:text-white"
                >
                  <Minus size={14} />
                </button>
                
                <div className="relative flex flex-col items-center">
                  <div className="absolute -top-3 flex gap-1 items-center">
                     {block.isAccented && (
                       <motion.div 
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                         className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                       />
                     )}
                     {block.strumMode === 'arpeggio' && (
                       <motion.div 
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                         className="flex gap-0.5"
                       >
                         <div className="w-1 h-1 rounded-full bg-blue-400" />
                         <div className="w-1 h-1 rounded-full bg-blue-400 opacity-60" />
                         <div className="w-1 h-1 rounded-full bg-blue-400 opacity-30" />
                       </motion.div>
                     )}
                  </div>

                  <div className="flex items-baseline justify-center" onPointerDown={(e) => e.stopPropagation()}>
                    <select 
                       value={block.note}
                       onChange={(e) => onUpdateChord(block.id, e.target.value, block.isMinor)}
                       onClick={(e) => e.stopPropagation()}
                       className="appearance-none bg-transparent text-4xl lg:text-5xl font-black italic tracking-tighter text-center cursor-pointer hover:scale-105 transition-transform outline-none min-w-[50px] relative z-10"
                       style={{ color: block.isAccented ? '#f59e0b' : (isDark ? '#fff' : '#000') }}
                    >
                       {CHROMATIC.map(n => <option key={n} value={n} className="bg-[#222] text-white py-2 text-base">{n}</option>)}
                    </select>
                    {block.isMinor && (
                      <span 
                        className="text-2xl font-black italic tracking-tighter -ml-1 select-none pointer-events-none"
                        style={{ color: block.isAccented ? '#f59e0b' : (isDark ? '#fff' : '#000'), opacity: 0.8 }}
                      >
                        m
                      </span>
                    )}
                  </div>
                  <button 
                     onPointerDown={(e) => e.stopPropagation()}
                     onClick={(e) => { e.stopPropagation(); onUpdateChord(block.id, block.note, !block.isMinor); }}
                     className={cn(
                       "text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all mt-1 shadow-md border",
                       block.isMinor 
                        ? "bg-emerald-500 border-emerald-400 text-white" 
                        : "bg-white/10 border-white/10 text-white/40 hover:bg-white/20 hover:text-white"
                     )}
                  >
                     {block.isMinor ? 'Minor' : 'Major'}
                  </button>
                </div>

                <button 
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); shiftChord(block, 1); }}
                  className="p-1.5 rounded-full hover:bg-white/20 sm:opacity-0 sm:group-hover:opacity-100 transition-all text-white/40 hover:text-white"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lyric / Annotation Input */}
        <div className="w-full px-2 mt-4 flex flex-col gap-3 relative z-10" onClick={(e) => e.stopPropagation()}>
           <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
              <input 
                type="text"
                value={block.lyrics || ''}
                onChange={(e) => onUpdateLyrics(block.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Lyric / Note"
                className="w-full bg-white/5 border-none outline-none rounded-xl px-3 py-2 text-[9px] font-bold text-center placeholder:opacity-20 hover:bg-white/10 focus:bg-white/10 transition-all border border-transparent focus:border-emerald-500/20"
               />
           </div>
           
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[7px] font-black uppercase opacity-20 tracking-widest">Ensemble</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                {INSTRUMENTS.map(instr => {
                  const isActive = block.instruments?.includes(instr.id);
                  const Icon = instr.icon;
                  return (
                    <button
                      key={instr.id}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onUpdateInstruments(block.id, instr.id); }}
                      className={cn(
                        "w-7 h-7 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center transition-all border",
                        isActive 
                          ? "bg-emerald-500 border-white/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] z-10" 
                          : "bg-white/5 border-white/5 text-white/20 hover:bg-white/10 hover:text-white/40"
                      )}
                    >
                      <Icon size={instr.id === 'drums' || instr.id === 'bass' ? 14 : 16} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Studio FX Controls */}
            <div className="flex flex-col gap-2 mt-2 bg-black/20 p-3 rounded-2xl border border-white/5" onPointerDown={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-1">
                 <span className="text-[7px] font-black uppercase opacity-20 tracking-widest leading-none">Studio FX</span>
                 <Sparkles size={8} className="opacity-20 translate-y-[-1px]" />
              </div>
              
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-1.5">
                   <Volume2 size={10} className="opacity-30" />
                   <span className="text-[7px] font-bold uppercase opacity-30">Vol</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={(e) => { e.stopPropagation(); onUpdateEffects(block.id, 'volume', -0.1); }}
                     className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors active:scale-90"
                    >
                     <Minus size={8} />
                   </button>
                   <span className="text-[9px] font-mono font-bold min-w-[30px] text-center" style={{ color: accentColor }}>
                     {((block.volume ?? 1) * 100).toFixed(0)}%
                   </span>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onUpdateEffects(block.id, 'volume', 0.1); }}
                     className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors active:scale-90"
                    >
                     <Plus size={8} />
                   </button>
                 </div>
              </div>

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-1.5">
                   <Waves size={10} className="opacity-30" />
                   <span className="text-[7px] font-bold uppercase opacity-30">Int</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={(e) => { e.stopPropagation(); onUpdateEffects(block.id, 'intensity', -0.1); }}
                     className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors active:scale-90"
                    >
                     <Minus size={8} />
                   </button>
                   <span className="text-[9px] font-mono font-bold min-w-[30px] text-center" style={{ color: accentColor }}>
                     {((block.intensity ?? 0.5) * 100).toFixed(0)}%
                   </span>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onUpdateEffects(block.id, 'intensity', 0.1); }}
                     className="w-4 h-4 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors active:scale-90"
                    >
                     <Plus size={8} />
                   </button>
                 </div>
              </div>
            </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full mt-4 relative z-10">
          <div className="flex items-center justify-between w-full px-4" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdateDuration(block.id, -1); }}
              className="p-1.5 rounded-lg hover:bg-white/10 opacity-30 hover:opacity-100 transition-all active:scale-90"
            >
              <Minus size={12} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-xl font-black italic tracking-tighter" style={{ color: activeBlockId === block.id ? accentColor : (isDark ? '#fff' : '#000') }}>{block.duration}</span>
              <span className="text-[7px] font-black uppercase opacity-30 tracking-widest -mt-1">Beats</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdateDuration(block.id, 1); }}
              className="p-1.5 rounded-lg hover:bg-white/10 opacity-30 hover:opacity-100 transition-all active:scale-90"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="w-full h-2 flex gap-1 px-4" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); onUpdateDuration(block.id, i - block.duration); }}
                className={cn(
                  "h-full flex-1 rounded-full transition-all duration-300",
                  i <= block.duration 
                    ? (activeBlockId === block.id ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "bg-emerald-500/60") 
                    : "bg-white/5 hover:bg-white/10"
                )}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

interface SongTimelineProps {
  blocks: SongBlock[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
  onUpdateDuration: (id: string, delta: number) => void;
  onUpdateChord: (id: string, note: string, isMinor: boolean) => void;
  onUpdateSection: (id: string, section: SongBlock['section']) => void;
  onUpdateAccent: (id: string) => void;
  onUpdateStrum: (id: string) => void;
  onUpdateLyrics: (id: string, lyrics: string) => void;
  onUpdateInstruments: (id: string, instrument: string) => void;
  onEdit: (block: SongBlock) => void;
  onUpdateEffects: (id: string, type: 'volume' | 'intensity', delta: number) => void;
  onReorder: (newBlocks: SongBlock[]) => void;
  accentColor: string;
  theme: 'dark' | 'light';
  activeBlockId?: string | null;
}

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function SongTimeline({ 
  blocks, 
  onRemove, 
  onClearAll,
  onUpdateDuration, 
  onUpdateChord, 
  onUpdateSection, 
  onUpdateAccent,
  onUpdateStrum,
  onUpdateLyrics,
  onUpdateInstruments,
  onEdit,
  onUpdateEffects,
  onReorder, 
  accentColor, 
  theme,
  activeBlockId
}: SongTimelineProps) {
  const isDark = theme === 'dark';
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const INSTRUMENTS = [
    { id: 'acoustic', icon: Guitar },
    { id: 'electric', icon: Zap },
    { id: 'bass', icon: AudioWaveform },
    { id: 'piano', icon: Keyboard },
    { id: 'synth', icon: Sparkles },
    { id: 'drums', icon: Drum },
  ];

  const shiftChord = (block: SongBlock, direction: number) => {
    if (block.type === 'pause') return;
    const currentIdx = CHROMATIC.indexOf(block.note);
    if (currentIdx === -1) return;
    const nextIdx = (currentIdx + direction + 12) % 12;
    onUpdateChord(block.id, CHROMATIC[nextIdx], block.isMinor);
  };

  return (
    <div className="relative w-full flex flex-col gap-8 mt-12">
      <div className="absolute -top-6 left-0 w-full flex items-center gap-4 px-2">
        <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden relative">
          <motion.div 
            className="absolute top-0 left-0 h-full opacity-50 transition-all duration-500"
            style={{ backgroundColor: accentColor, width: `${Math.min(100, (blocks.length / 12) * 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5">
           <span className="text-[8px] font-black opacity-20 uppercase tracking-widest">{blocks.length} Measures</span>
           <div className="w-1 h-1 rounded-full bg-white/10" />
           <span className="text-[8px] font-black opacity-20 uppercase tracking-widest">{blocks.reduce((acc, b) => acc + b.duration, 0).toFixed(1)}s</span>
           {onClearAll && blocks.length > 0 && (
             <>
               <div className="w-1 h-1 rounded-full bg-white/10" />
               <button 
                onClick={onClearAll}
                className="text-[8px] font-black text-red-500/60 hover:text-red-500 uppercase tracking-widest transition-colors"
               >
                 Clear All
               </button>
             </>
           )}
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="w-full overflow-x-auto pb-12 snap-x snap-mandatory no-scrollbar scroll-smooth"
      >
        {blocks.length === 0 ? (
          <div className="w-full h-40 flex flex-col items-center justify-center gap-4 border border-dashed border-white/5 rounded-[40px] opacity-20 mx-4">
            <Music size={24} />
            <p className="text-[10px] uppercase tracking-[0.3em] font-black">Studio Empty</p>
          </div>
        ) : (
          <Reorder.Group axis="x" values={blocks} onReorder={onReorder} className="flex gap-4 min-w-full lg:px-4">
            {blocks.map((block) => (
              <TimelineItem 
                key={block.id}
                block={block}
                activeBlockId={activeBlockId}
                accentColor={accentColor}
                isDark={isDark}
                onRemove={onRemove}
                onUpdateSection={onUpdateSection}
                onUpdateAccent={onUpdateAccent}
                onUpdateStrum={onUpdateStrum}
                shiftChord={shiftChord}
                onUpdateChord={onUpdateChord}
                onUpdateLyrics={onUpdateLyrics}
                onUpdateInstruments={onUpdateInstruments}
                onUpdateEffects={onUpdateEffects}
                onUpdateDuration={onUpdateDuration}
                onEdit={onEdit}
                INSTRUMENTS={INSTRUMENTS}
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}

