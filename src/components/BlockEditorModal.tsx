import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Trash2, Plus, Minus, Zap, Waves, Music, Volume2, Sparkles, Guitar, AudioWaveform, Keyboard, Drum, Type, Play, Edit3, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { SongBlock } from './SongTimeline';

interface BlockEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: SongBlock;
  onSave: (updatedBlock: SongBlock) => void;
  onDuplicate?: (block: SongBlock) => void;
  onPreview?: (block: SongBlock) => void;
  accentColor: string;
  theme: 'dark' | 'light';
}

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function BlockEditorModal({ 
  isOpen, 
  onClose, 
  block, 
  onSave, 
  onDuplicate,
  onPreview,
  accentColor, 
  theme 
}: BlockEditorModalProps) {
  const [editedBlock, setEditedBlock] = useState<SongBlock>(block);
  const isDark = theme === 'dark';

  useEffect(() => {
    setEditedBlock(block);
  }, [block]);

  const INSTRUMENTS = [
    { id: 'acoustic', icon: Guitar, label: 'Acoustic', styles: ['classic', 'warm', 'bright'] },
    { id: 'electric', icon: Zap, label: 'Electric', styles: ['clean', 'crunch', 'heavy'] },
    { id: '12string', icon: AudioWaveform, label: '12-String', styles: ['classic', 'chorus', 'shimmer'] },
    { id: 'ukulele', icon: Keyboard, label: 'Ukulele', styles: ['classic', 'tiny', 'bright'] },
    { id: 'bass', icon: AudioWaveform, label: 'Bass', styles: ['classic', 'synth', 'sub'] },
    { id: 'piano', icon: Keyboard, label: 'Piano', styles: ['classic', 'epiano', 'bright'] },
    { id: 'synth', icon: Sparkles, label: 'Synth', styles: ['classic', 'pulse', 'lead'] },
    { id: 'drums', icon: Drum, label: 'Drums', styles: ['classic', 'electronic', '808'] },
  ];

  const handleUpdate = (updates: Partial<SongBlock>) => {
    setEditedBlock(prev => ({ ...prev, ...updates }));
  };

  const toggleInstrument = (instrId: string) => {
    const current = editedBlock.instruments || [];
    const next = current.includes(instrId) 
      ? current.filter(id => id !== instrId)
      : [...current, instrId];
    handleUpdate({ instruments: next });
  };

  const setInstrumentStyle = (instrId: string, style: string) => {
    const currentStyles = editedBlock.style || {};
    handleUpdate({ style: { ...currentStyles, [instrId]: style } });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, rotateX: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-lg rounded-[40px] border shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden",
              isDark ? "bg-[#0a0a0a] border-white/10" : "bg-white border-black/10 text-black"
            )}
          >
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.03] to-transparent" />

            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between relative">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                   <Edit3 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase">Arrangement Editor</h3>
                  <div className="flex items-center gap-1.5 opacity-40">
                    <Activity size={10} className="animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Studio Control • Measure {editedBlock.id.slice(0,3)}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all flex items-center justify-center border border-white/5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 pt-4 pb-0">
               <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Professional Refinement</h4>
                    <p className="text-[10px] opacity-60 leading-tight font-medium">
                      Modify any block of your arrangement and hear it instantly.
                    </p>
                  </div>
               </div>
            </div>

            <div className="p-8 pb-4 space-y-8 max-h-[55vh] overflow-y-auto no-scrollbar relative">
              {/* Note & Type Section */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2">
                      <Music size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Harmonic Core</span>
                   </div>
                   <button 
                     onClick={() => onPreview?.(editedBlock)}
                     className="px-5 py-2 rounded-2xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                   >
                     <Play size={12} fill="currentColor" />
                     Preview Tone
                   </button>
                </div>

                <div className="flex items-center justify-between px-2">
                   {editedBlock.type === 'pause' ? (
                     <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest">Acoustic Rest Active</span>
                   ) : (
                     <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-50">Active Harmony Block</span>
                     </div>
                   )}
                </div>

                <div className="flex items-center gap-4 bg-black/20 p-4 rounded-3xl border border-white/5">
                  <div className="flex-1 flex flex-col items-center gap-2">
                     <select 
                       value={editedBlock.note}
                       onChange={(e) => handleUpdate({ note: e.target.value })}
                       disabled={editedBlock.type === 'pause'}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-3xl font-black italic text-center outline-none focus:border-emerald-500/50 transition-all disabled:opacity-20"
                     >
                       {CHROMATIC.map(n => <option key={n} value={n} className="bg-[#222]">{n}</option>)}
                     </select>
                     <div className="flex gap-2 w-full">
                        <button 
                          onClick={() => handleUpdate({ isMinor: !editedBlock.isMinor })}
                          disabled={editedBlock.type === 'pause'}
                          className={cn(
                            "flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            editedBlock.isMinor 
                              ? "bg-emerald-500 border-emerald-400 text-white" 
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                          )}
                        >
                          {editedBlock.isMinor ? 'Minor' : 'Major'}
                        </button>
                        <button 
                          onClick={() => handleUpdate({ type: editedBlock.type === 'chord' ? 'pause' : 'chord' })}
                          className={cn(
                            "flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            editedBlock.type === 'pause'
                              ? "bg-amber-500 border-amber-400 text-white" 
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                          )}
                        >
                          {editedBlock.type === 'pause' ? 'Break' : 'Chord'}
                        </button>
                     </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-3">
                    <button 
                      onClick={() => handleUpdate({ isAccented: !editedBlock.isAccented })}
                      className={cn(
                        "w-full py-2.5 rounded-2xl flex items-center justify-center gap-3 transition-all border text-[10px] font-black uppercase tracking-widest",
                        editedBlock.isAccented 
                          ? "bg-amber-500 border-amber-400 text-white shadow-lg" 
                          : "bg-white/5 border-white/5 text-white/20 hover:bg-white/10"
                      )}
                    >
                      <Zap size={14} fill={editedBlock.isAccented ? "currentColor" : "none"} />
                      Accent
                    </button>
                    <button 
                      onClick={() => handleUpdate({ strumMode: editedBlock.strumMode === 'arpeggio' ? 'instant' : 'arpeggio' })}
                      className={cn(
                        "w-full py-2.5 rounded-2xl flex items-center justify-center gap-3 transition-all border text-[10px] font-black uppercase tracking-widest",
                        editedBlock.strumMode === 'arpeggio'
                          ? "bg-blue-500 border-blue-400 text-white shadow-lg" 
                          : "bg-white/5 border-white/5 text-white/20 hover:bg-white/10"
                      )}
                    >
                      <Waves size={14} />
                      Arp
                    </button>
                  </div>
                </div>
              </div>

              {/* Timing & Duration */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Timing & Scale</span>
                    <span className="text-[10px] font-black text-emerald-500">{editedBlock.duration} Beats</span>
                 </div>
                 <div className="flex flex-col gap-4 bg-black/20 p-6 rounded-3xl border border-white/5">
                    <div className="flex items-center justify-between">
                       <button 
                         onClick={() => handleUpdate({ duration: Math.max(0.5, editedBlock.duration - 0.5) })}
                         className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                       >
                         <Minus size={20} />
                       </button>
                       <div className="flex flex-col items-center">
                          <span className="text-4xl font-black italic tracking-tighter" style={{ color: accentColor }}>{editedBlock.duration}</span>
                          <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Quarter Notes</span>
                       </div>
                       <button 
                         onClick={() => handleUpdate({ duration: editedBlock.duration + 0.5 })}
                         className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                       >
                         <Plus size={20} />
                       </button>
                    </div>
                 </div>
              </div>

              {/* Instruments Ensemble */}
              <div className="space-y-4">
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-20 px-2 leading-none">Studio Ensemble Layering</span>
                 <div className="space-y-3">
                    {INSTRUMENTS.map(instr => {
                      const isActive = editedBlock.instruments?.includes(instr.id);
                      const currentStyle = editedBlock.style?.[instr.id] || 'classic';
                      return (
                        <div key={instr.id} className="bg-black/20 p-4 rounded-3xl border border-white/5 flex items-center justify-between gap-4">
                          <button
                            onClick={() => toggleInstrument(instr.id)}
                            className={cn(
                              "flex items-center gap-3 transition-all",
                              isActive ? "text-emerald-500" : "text-white/20 hover:text-white/40"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                              isActive ? "bg-emerald-500/10 border-emerald-500/40" : "bg-white/5 border-transparent"
                            )}>
                              <instr.icon size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{instr.label}</span>
                          </button>
                          
                          {isActive && (
                            <div className="flex gap-1">
                              {instr.styles.map(s => (
                                <button
                                  key={s}
                                  onClick={() => setInstrumentStyle(instr.id, s)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all border",
                                    currentStyle === s 
                                      ? "bg-emerald-500 border-emerald-400 text-white" 
                                      : "bg-white/5 border-transparent text-white/30 hover:text-white/60"
                                  )}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                 </div>
              </div>

              {/* Dynamics & Metadata */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-20 px-2">Studio FX & Metadata</span>
                   <div className="bg-black/20 p-6 rounded-3xl border border-white/5 space-y-6">
                      <div className="flex items-center gap-4">
                         <Type size={16} className="opacity-20" />
                         <input 
                           type="text"
                           value={editedBlock.lyrics || ''}
                           onChange={(e) => handleUpdate({ lyrics: e.target.value })}
                           placeholder="Annotation / Lyric Note..."
                           className="flex-1 bg-transparent border-b border-white/10 outline-none py-1 text-sm font-medium placeholder:opacity-20 focus:border-emerald-500 transition-all"
                         />
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <div className="flex items-center justify-between">
                               <span className="text-[8px] font-black uppercase opacity-40">Volume</span>
                               <span className="text-[10px] font-black" style={{ color: accentColor }}>{((editedBlock.volume ?? 1) * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                               type="range" 
                               min="0" max="2" step="0.1" 
                               value={editedBlock.volume ?? 1}
                               onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
                               className="w-full accent-emerald-500 h-1 bg-white/5 rounded-full appearance-none"
                            />
                         </div>
                         <div className="space-y-3">
                            <div className="flex items-center justify-between">
                               <span className="text-[8px] font-black uppercase opacity-40">Intensity</span>
                               <span className="text-[10px] font-black" style={{ color: accentColor }}>{((editedBlock.intensity ?? 0.5) * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                               type="range" 
                               min="0" max="1" step="0.1" 
                               value={editedBlock.intensity ?? 0.5}
                               onChange={(e) => handleUpdate({ intensity: parseFloat(e.target.value) })}
                               className="w-full accent-emerald-500 h-1 bg-white/5 rounded-full appearance-none"
                            />
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-8 border-t border-white/5 flex flex-col gap-4 bg-black/40">
              <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={() => onSave(editedBlock)}
                  className="flex-[2] py-4 rounded-2xl flex items-center justify-center gap-3 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] active:scale-95"
                  style={{ backgroundColor: accentColor }}
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
              
              {onDuplicate && (
                <button 
                  onClick={() => {
                    onDuplicate(editedBlock);
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  Duplicate Block
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
