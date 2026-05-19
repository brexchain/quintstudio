import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface NeedleBarProps {
  cents: number;
  active: boolean;
  theme?: 'dark' | 'light';
  currentNote?: string | null;
  chromaticNote?: string | null;
  amplitude?: number;
}

// Sparkle component for celebration
const Sparkle = ({ x, y, size, delay }: { x: number, y: number, size: number, delay: number }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ 
      scale: [0, 1, 0.5, 0], 
      opacity: [0, 1, 0.8, 0],
      rotate: [0, 90, 180],
      y: [y, y - 40 - Math.random() * 40]
    }}
    transition={{ duration: 1.2, delay, ease: "easeOut" }}
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%` }}
  >
    <div 
      className="bg-emerald-400 rounded-full blur-[1px]" 
      style={{ width: size, height: size, boxShadow: '0 0 8px #10b981' }} 
    />
  </motion.div>
);

export function NeedleBar({ cents, active, theme = 'dark', currentNote, chromaticNote, amplitude = 0 }: NeedleBarProps) {
  // cents ranges from -50 to 50
  const percentage = ((cents + 50) / 100) * 100;
  const isPerfect = Math.abs(cents) <= 1.5; // Slightly more forgiving for "perfect" feel
  const isClose = Math.abs(cents) <= 5;
  const isVeryClose = Math.abs(cents) <= 3;
  const isDark = theme === 'dark';

  // Volume responsiveness
  const volScale = Math.min(1.2, 1 + amplitude * 0.8);

  const [sparkles, setSparkles] = React.useState<{id: number, x: number, y: number, size: number, delay: number}[]>([]);
  
  // Color calculation for the needle
  const getNeedleColor = () => {
    if (!active) return isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
    if (isPerfect) return '#10b981'; // Emerald 500
    if (isVeryClose) return '#34d399'; // Emerald 400
    if (isClose) return '#60a5fa'; // Blue 400
    return cents > 0 ? '#f87171' : '#f87171'; // Red 400 for both sides if far away
  };

  const needleColor = getNeedleColor();

  React.useEffect(() => {
    if (active && isPerfect) {
      const newSparkles = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i,
        x: 45 + Math.random() * 10,
        y: 20 + Math.random() * 60,
        size: 3 + Math.random() * 5,
        delay: Math.random() * 0.3
      }));
      setSparkles(prev => [...prev, ...newSparkles].slice(-32));
    } else if (!active) {
      setSparkles([]);
    }
  }, [isPerfect, active]);

  const displayNote = chromaticNote || currentNote;

  return (
    <div className="w-full max-w-md px-8 py-4">
      <div className={cn(
        "flex justify-between text-[10px] uppercase tracking-widest mb-4 font-mono transition-colors",
        isDark ? "text-white/40" : "text-black/40"
      )}>
        <span className={cn(cents < -40 && active && "text-red-400 font-bold")}>-50</span>
        <div className="flex flex-col items-center">
           <AnimatePresence mode="wait">
            {active && displayNote && (
              <motion.div 
                key={displayNote}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                className="flex flex-col items-center relative"
              >
                {/* Perfect Pitch Indicator Glow */}
                {isPerfect && (
                  <motion.div 
                    layoutId="perfectGlow"
                    className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
                <span className={cn(
                  "text-[10px] font-bold transition-colors z-10",
                  isPerfect ? "text-emerald-400" : (isDark ? "text-white/60" : "text-black/60")
                )}>
                  {currentNote && currentNote !== chromaticNote ? `TARGETING ${currentNote}` : 'DETECTED'}
                </span>
                <span className={cn(
                  "text-4xl font-black italic -mt-2 tracking-tighter transition-all duration-300 z-10",
                  isPerfect ? "text-emerald-400 scale-125 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "text-white"
                )}>
                  {displayNote}
                </span>
              </motion.div>
            )}
           </AnimatePresence>
           {!active && (
             <span className={isDark ? "text-white/60" : "text-black/60"}>0</span>
           )}
        </div>
        <span className={cn(cents > 40 && active && "text-red-400 font-bold")}>+50</span>
      </div>
      
      <div 
        className={cn(
          "relative h-16 w-full rounded-2xl border overflow-hidden backdrop-blur-xl transition-all duration-500",
          isDark ? "bg-black/80 border-white/10" : "bg-white/80 border-black/10"
        )}
        style={{ 
          transform: `scale(${active ? volScale : 1})`,
          boxShadow: active ? `0 0 ${amplitude * 150}px ${isPerfect ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.05)'}` : 'none',
          borderColor: isPerfect && active ? 'rgba(16,185,129,0.6)' : undefined
        }}
      >
        {/* Dynamic Waveform Simulation */}
        {active && (
          <div className="absolute inset-0 opacity-10 flex items-center justify-around px-4 pointer-events-none">
            {Array.from({ length: 48 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: [`${10 + Math.random() * 30}%`, `${60 + Math.random() * 40}%`, `${10 + Math.random() * 20}%`] 
                }}
                transition={{ duration: 0.1 + Math.random() * 0.1, repeat: Infinity }}
                className={cn("w-[1px] rounded-full", isPerfect ? "bg-emerald-400" : "bg-white/20")}
                style={{ opacity: amplitude * 12 }}
              />
            ))}
          </div>
        )}

        {/* Target Zone Indicator */}
        <div 
          className={cn(
            "absolute left-1/2 -translate-x-1/2 top-0 bottom-0 pointer-events-none border-x transition-all duration-500",
            active ? "border-emerald-500/30 bg-emerald-500/5" : "border-transparent"
          )} 
          style={{ width: '3%' }} 
        />

        {/* Center line (Perfect 0) */}
        <div className={cn(
          "absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 transition-all duration-300 z-0",
          active ? (isPerfect ? "bg-emerald-400 opacity-80" : "bg-white/10") : "bg-white/5"
        )} />

        {/* Celebration Sparkles */}
        {sparkles.map(s => (
          <Sparkle key={s.id} {...s} />
        ))}

        {/* Tick marks */}
        <div className="absolute inset-x-4 inset-y-0 flex justify-between items-center pointer-events-none opacity-30">
          {Array.from({ length: 21 }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-[1px] transition-all duration-300",
                i % 5 === 0 ? "h-6 bg-white/40" : "h-3 bg-white/20",
                i === 10 && "h-10 bg-emerald-500/50 w-[2px]"
              )} 
            />
          ))}
        </div>

        {/* The Needle */}
        {active && (
          <motion.div 
            className="absolute top-0 bottom-0 w-8 flex flex-col items-center z-10 -ml-4"
            initial={{ left: '50%' }}
            animate={{ left: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 450, damping: 35, mass: 0.8 }}
          >
            {/* Pointer Cap */}
            <div 
              className="w-4 h-1 rounded-full mb-1" 
              style={{ backgroundColor: needleColor, boxShadow: `0 0 10px ${needleColor}` }} 
            />
            
            {/* Needle Body */}
            <motion.div 
              className="flex-1 w-1 rounded-full transition-all duration-300 relative"
              style={{ 
                backgroundColor: needleColor,
                boxShadow: isVeryClose ? `0 0 20px ${needleColor}` : `0 0 5px ${needleColor}40`
              }}
              animate={isPerfect ? { scaleY: [1, 1.15, 1], scaleX: [1, 1.5, 1] } : {}}
            >
              {/* Inner glow for "Perfect" state */}
              {isPerfect && (
                <div className="absolute inset-0 bg-white blur-[2px] opacity-50" />
              )}
            </motion.div>

            {/* Bottom Pointer Cap */}
            <div 
              className="w-4 h-1 rounded-full mt-1" 
              style={{ backgroundColor: needleColor, boxShadow: `0 0 10px ${needleColor}` }} 
            />
          </motion.div>
        )}

        {/* Target Indicator Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <Target size={120} className={cn("transition-colors", isPerfect && active ? "text-emerald-500" : "text-white/20")} />
        </div>

        {/* Perfect Resonance Glow */}
        <AnimatePresence>
          {active && isPerfect && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="absolute inset-0 bg-emerald-400/20 pointer-events-none blur-3xl"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 text-center">
        <motion.div
           animate={isPerfect && active ? { scale: [1, 1.1, 1] } : {}}
           transition={{ duration: 0.4, repeat: isPerfect ? Infinity : 0 }}
        >
          <span className={cn(
            "font-mono text-sm tracking-widest transition-all duration-300 inline-block px-6 py-2 rounded-xl",
            active 
              ? (isPerfect 
                  ? "text-emerald-400 bg-emerald-400/20 font-black border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                  : (isVeryClose ? "text-emerald-300 bg-emerald-300/10 font-bold border border-emerald-300/30" : (isDark ? "text-white/80" : "text-[#1a1a1a]/80"))) 
              : (isDark ? "text-white/20" : "text-black/20")
          )}>
            {active 
              ? (isPerfect ? <span className="flex items-center gap-2"><CheckCircle2 size={14} /> LOCKED</span> : `${cents > 0 ? '+' : ''}${cents} CENTS`) 
              : "READY FOR INPUT"}
          </span>
        </motion.div>
      </div>
    </div>

  );
}
