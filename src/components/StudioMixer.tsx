import React from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX, Sliders, Music, Wind, Zap, Play } from 'lucide-react';
import { cn } from '../lib/utils';

interface MixerChannel {
  volume: number;
  pan: number;
  muted: boolean;
  style?: string;
}

interface StudioMixerProps {
  mixer: Record<string, MixerChannel>;
  onUpdate: (id: string, updates: Partial<MixerChannel>) => void;
  onTest?: (id: string) => void;
  theme: 'dark' | 'light';
}

export function StudioMixer({ mixer, onUpdate, onTest, theme }: StudioMixerProps) {
  const isDark = theme === 'dark';

  const channels = [
    { id: 'piano', icon: Music, color: 'text-blue-500', styles: ['classic', 'epiano', 'bright'] },
    { id: 'acoustic', icon: Wind, color: 'text-emerald-500', styles: ['classic', 'warm', 'bright'] },
    { id: 'electric', icon: Zap, color: 'text-amber-500', styles: ['clean', 'crunch', 'heavy'] },
    { id: 'bass', icon: Sliders, color: 'text-purple-500', styles: ['classic', 'synth', 'sub'] },
    { id: 'drums', icon: Sliders, color: 'text-red-500', styles: ['classic', 'electronic', '808'] }
  ].filter(c => mixer[c.id]);

  return (
    <div className={cn(
      "w-full rounded-[32px] border p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200",
      isDark ? "bg-black/40 border-white/5" : "bg-white/40 border-black/5"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Studio Mixing Desk</h3>
          <span className="text-[10px] font-bold opacity-20 uppercase">Stage Panning & Gain</span>
        </div>
        <div className="flex gap-2">
           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-wider opacity-40">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             Recording Ready
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {channels.map((ch) => {
          const config = mixer[ch.id];
          const currentStyle = config.style || ch.styles[0];

          return (
            <div 
              key={ch.id}
              className={cn(
                "flex flex-col p-4 rounded-2xl border transition-all",
                isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn("p-2 rounded-xl bg-black/20", ch.color)}>
                    <ch.icon size={12} />
                  </div>
                  <button
                    onClick={() => onTest?.(ch.id)}
                    className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/30 transition-all"
                  >
                    <Play size={10} fill="currentColor" />
                  </button>
                </div>
                <button 
                  onClick={() => onUpdate(ch.id, { muted: !config.muted })}
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                    config.muted ? "bg-red-500 text-white" : "bg-white/5 text-white/40 hover:text-white/60"
                  )}
                >
                  {config.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Style Selector */}
                <div className="flex flex-col gap-2">
                   <span className="text-[8px] font-black uppercase opacity-20 tracking-tighter">Style Preset</span>
                   <div className="flex flex-wrap gap-1">
                      {ch.styles.map(s => (
                        <button
                          key={s}
                          onClick={() => onUpdate(ch.id, { style: s })}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all border",
                            currentStyle === s 
                              ? "bg-white/10 border-white/20 text-white" 
                              : "border-transparent text-white/20 hover:text-white/40"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Volume Fader */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase opacity-30">
                    <span>Gain</span>
                    <span>{Math.round(config.volume * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.01"
                    value={config.volume}
                    onChange={(e) => onUpdate(ch.id, { volume: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 h-1 rounded-full appearance-none bg-white/10 cursor-pointer"
                  />
                </div>

                {/* Pan Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase opacity-30">
                    <span>Pan</span>
                    <span>{config.pan < 0 ? 'L' : config.pan > 0 ? 'R' : 'C'}</span>
                  </div>
                  <input 
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    value={config.pan}
                    onChange={(e) => onUpdate(ch.id, { pan: parseFloat(e.target.value) })}
                    className="w-full accent-white/40 h-1 rounded-full appearance-none bg-white/10 cursor-pointer"
                  />
                </div>
              </div>

              <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-center opacity-40 truncate">
                {ch.id}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
