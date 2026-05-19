import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CircleOfFifths } from './CircleOfFifths';

export interface StringConfig {
  note: string;
  octave: number;
  freq: number;
  label: string;
}

interface GuitarHubProps {
  currentNote: string | null;
  chromaticNote?: string | null;
  playedNote?: string | null;
  playedOctave?: number | null;
  playingRiff?: { id: string; activeIndex: number } | null;
  frequency: number;
  cents: number;
  referenceA?: number;
  theme?: 'dark' | 'light';
  strings: StringConfig[];
  activeInstruments?: string[];
  onNoteSelect?: (note: string, isMinor: boolean) => void;
  onPlayChord?: (note: string, isMinor: boolean) => void;
  customColors?: {
    accent?: string;
    ring?: string;
    glow?: string;
    body?: string;
  };
  isTunerMode?: boolean;
  amplitude?: number;
}

export function GuitarHub({ 
  currentNote, 
  chromaticNote,
  playedNote, 
  playedOctave,
  playingRiff, 
  frequency, 
  cents, 
  referenceA = 440, 
  theme = 'dark', 
  strings, 
  activeInstruments = ['acoustic'],
  onNoteSelect,
  onPlayChord,
  customColors,
  isTunerMode = false,
  amplitude = 0
}: GuitarHubProps) {
  const isDark = theme === 'dark';
  const accentColor = customColors?.accent || '#10b981';

  // Tuning accuracy helpers
  const getAccuracyLabel = () => {
    if (!currentNote || cents === undefined) return null;
    const absCents = Math.abs(cents);
    if (absCents <= 1.5) return { text: 'LOCKED', color: '#10b981', glow: '0 0 20px #10b981' };
    if (absCents <= 4) return { text: 'PERFECT', color: '#34d399', glow: '0 0 10px #34d399' };
    if (absCents <= 10) return { text: 'NEARLY', color: '#60a5fa', glow: 'none' };
    return { text: cents > 0 ? 'SHARP' : 'FLAT', color: '#ef4444', glow: 'none' };
  };

  const normalizeForMatch = (n: string) => {
    const map: Record<string, string> = { 'A#': 'Bb', 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab' };
    return map[n] || n;
  };

  const accuracy = getAccuracyLabel();
  
  // Instrument-specific highlighter colors
  const getInstrumentColor = (instrId: string) => {
    const colors: Record<string, string> = {
      acoustic: '#10b981', // Emerald
      electric: '#3b82f6', // Blue
      bass: '#a855f7',    // Purple
      piano: '#facc15',   // Yellow
      synth: '#ec4899',   // Pink
      drums: '#f97316',   // Orange
    };
    return colors[instrId] || accentColor;
  };

  const isPlaying = !!(currentNote || playedNote || playingRiff);
  const displayNote = playedNote || currentNote;
  
  // Adjusted spacing for different string counts
  const stringGap = strings.length > 6 ? 1.5 : (strings.length < 6 ? 6 : 3.5);

  return (
    <div className="relative w-80 h-80 flex items-center justify-center">
      {/* Outer Soundhole Ring */}
      <div className="absolute inset-0 rounded-full border-8 border-[#3d2b1f] shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_10px_40px_rgba(0,0,0,0.5)] bg-[#1a110a]" />
      
      {/* Wood Texture Simulation */}
      <div className="absolute -inset-8 rounded-[40px] -z-10 bg-[radial-gradient(ellipse_at_center,_#5d4037_0%,_#3e2723_100%)] opacity-90 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.2) 41px)' }} />
      </div>


      {/* Guitar Neck (Hals) - Extending to the left and right background */}
      <div className="absolute left-[-500px] right-[-500px] h-32 md:h-40 bg-[#1a0f0a] border-y border-[#3d251a] shadow-2xl z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 80px, #000 81px)' }} />
        <div className="absolute inset-0 bg-linear-to-b from-white/5 to-black/20" />
        
        {/* Laser Fret Markers */}
        <div className="absolute inset-0 flex justify-around items-center opacity-30">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          ))}
        </div>
      </div>

      {/* Modern High-End Guitar Body - Wood Texture */}
      <div 
        className="w-full h-full rounded-[100px] border-4 border-[#3d251a] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] relative flex items-center justify-center overflow-hidden"
        style={{ 
          background: customColors?.body 
            ? `radial-gradient(circle at center, ${customColors.body} 0%, #1a0f0a 100%)`
            : 'radial-gradient(circle at center, #4d2b1e 0%, #2a1810 70%, #1a0f0a 100%)',
          boxShadow: `inset 0 0 100px rgba(0,0,0,0.5), 0 40px 100px -20px black`
        }}
      >
        {/* Grain simulation */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #000 2px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.05) 21px)' }} />
        
        {/* Laser Strings - Dynamic and Interactive Layered by Ensemble */}
        <div className="absolute inset-x-0 h-48 flex flex-col justify-between py-4 z-20 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="relative h-1 w-full flex items-center">
               {/* Base String */}
               <motion.div
                 animate={{ 
                   opacity: isPlaying ? 0.3 : 0.05,
                   backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                 }}
                 className="h-[1px] w-full absolute"
               />
               
               {/* Instrument-specific Layers (Lasers) */}
               {isPlaying && activeInstruments.map((instr, idx) => (
                 <motion.div
                   key={instr}
                   initial={{ opacity: 0, scaleY: 0 }}
                   animate={{ 
                     opacity: [0.4, 0.8, 0.4],
                     scaleY: [1, 1.5, 1],
                     boxShadow: `0 0 ${10 + idx * 5}px ${getInstrumentColor(instr)}`,
                     backgroundColor: getInstrumentColor(instr)
                   }}
                   transition={{ duration: 1.5, delay: idx * 0.1, repeat: Infinity }}
                   className="h-[1px] w-full absolute origin-center"
                   style={{ 
                     top: `${(idx - (activeInstruments.length - 1) / 2) * 2}px`,
                     filter: 'blur(0.5px)'
                   }}
                 />
               ))}
               
               {/* Vibrate effect on play */}
               {isPlaying && (
                 <motion.div 
                   animate={{ y: [-1, 1, -1] }}
                   transition={{ duration: 0.05, repeat: Infinity }}
                   className="absolute inset-0"
                 />
               )}
            </div>
          ))}
        </div>

        {/* Inner Hole Core - Just the Circle of Fifths now */}
        <div 
          className="relative w-80 h-80 md:w-96 md:h-96 rounded-full bg-black shadow-[inset_0_0_80px_rgba(0,0,0,1),0_0_40px_rgba(16,185,129,0.1)] overflow-hidden flex items-center justify-center z-30"
          style={{ border: `12px solid #1a0f0a` }}
        >
          {isTunerMode ? (
            <div className="flex flex-col items-center gap-1 w-full px-12 relative h-full justify-center">
              {/* Large Absolute Note Display (Chromatic) */}
              <AnimatePresence>
                {chromaticNote && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.15, scale: 1.1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <span className="text-[160px] font-black italic tracking-tighter text-white/50 select-none">
                      {chromaticNote}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {accuracy && (
                  <motion.div
                    key={accuracy.text}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-12 text-[10px] font-black uppercase tracking-[0.4em] z-10"
                    style={{ color: accuracy.color }}
                  >
                    {accuracy.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Thick to Thin strings in the hole */}
              <div className="flex flex-col gap-3 w-full mt-4">
                {[...strings].reverse().map((s, idx) => {
                  const isNoteMatch = currentNote === s.note || normalizeForMatch(currentNote || '') === s.note 
                    || playedNote === s.note || normalizeForMatch(playedNote || '') === s.note;
                  
                  // Only consider octave if both available
                  const isOctaveMatch = (playedOctave !== undefined && playedOctave !== null) ? s.octave === playedOctave : true;
                  const isActive = isNoteMatch && isOctaveMatch;

                  const thickness = 1 + (strings.length - idx - 1) * 0.6; // Thick to thin
                  const activeThickness = thickness + 1 + (amplitude * 10);
                  
                    return (
                      <div key={`${s.note}-${idx}`} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest px-1">
                          <span className={cn("transition-colors", isActive ? "text-emerald-400 opacity-100" : "text-white opacity-20")}>{s.label}</span>
                          {(isActive || amplitude > 0.01) && (
                            <motion.span 
                              animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                              style={{ color: isActive ? accuracy?.color : undefined }}
                              className="font-bold whitespace-nowrap"
                            >
                              {isActive ? `${cents > 0 ? '+' : ''}${cents}c` : (amplitude > 0.05 ? 'SIGNAL' : '')}
                            </motion.span>
                          )}
                        </div>
                        <div className="relative h-2.5 w-full flex items-center">
                          <motion.div 
                            animate={{ 
                              height: [`${thickness}px`, `${thickness + (amplitude * 6)}px`, `${thickness}px`],
                              opacity: amplitude > 0.01 ? 0.4 : 0.05
                            }}
                            className="w-full bg-white rounded-full transition-all duration-300"
                          />
                          {isActive && (
                            <motion.div 
                              layoutId="active-tuner-string"
                              className="absolute inset-0 rounded-full"
                              style={{ 
                                height: `${activeThickness + 1}px`,
                                backgroundColor: accuracy?.color || accentColor,
                                boxShadow: accuracy?.glow || `0 0 ${15 + (amplitude * 40)}px ${accuracy?.color || accentColor}80`
                              }}
                              animate={{ opacity: [0.7, 1, 0.7] }}
                              transition={{ repeat: Infinity, duration: 0.8 }}
                            />
                          )}
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>
          ) : (
            <div className="absolute inset-6">
              <CircleOfFifths 
                activeNote={playedNote || currentNote} 
                accentColor={accentColor} 
                theme="dark"
                isLarge={true}
                onNoteSelect={onNoteSelect}
                onPlayChord={onPlayChord}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sonic Aura pulse */}
      <AnimatePresence>
        {currentNote && (
          <motion.div 
            key="aura"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 0.05 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
