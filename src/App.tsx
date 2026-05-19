import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Mic, MicOff, Music, Volume2, Sparkles, Clock, Compass, Zap, LayoutGrid, Sun, Moon, MessageCircle, Languages, Maximize, Activity, Brain, Plus, Waves, Minus, Guitar, Drum, Keyboard, AudioWaveform, Info, RotateCcw, Play, Repeat, Square, Pause, Trash2, Share2, Bell, BellOff } from 'lucide-react';
import { usePitchDetection } from './hooks/usePitchDetection';
import { GuitarHub } from './components/GuitarHub';
import { NeedleBar } from './components/NeedleBar';
import { ToneReference, ReferenceNote } from './components/ToneReference';
import { RiffLibrary } from './components/RiffLibrary';
import { Metronome } from './components/Metronome';
import { JamStation } from './components/JamStation';
import { EarTraining } from './components/EarTraining';
import { QuizView } from './components/QuizView';
import { TheoryView } from './components/TheoryView';
import { CircleOfFifths } from './components/CircleOfFifths';
import { SongTimeline } from './components/SongTimeline';
import { MiniTimeline } from './components/MiniTimeline';
import { BlockEditorModal } from './components/BlockEditorModal';
import { ChordKeyboard } from './components/ChordKeyboard';
import { StudioMixer } from './components/StudioMixer';
import { GuitarStringsBackground } from './components/GuitarStringsBackground';
import { FeedbackSection } from './components/FeedbackSection';
import { ContactPopup } from './components/ContactPopup';
import { LuthierConfig, StudioSettings } from './components/LuthierConfig';
import { cn } from './lib/utils';
import { GUITAR_STRINGS, UKULELE_STRINGS, TWELVE_STRING_STRINGS, InstrumentCategory, Riff, EADGBE_MNEMONICS } from './constants';
import { LanguageProvider, Language, translations, getTranslation } from './lib/i18n';

type ViewMode = 'quintencirkel' | 'tuner' | 'metronome' | 'riffs' | 'theory' | 'jam' | 'ear' | 'quiz';

const DEFAULT_SETTINGS: StudioSettings = {
  bgColor: '#0a0a0a',
  accentColor: '#10b981',
  layoutMode: 'vertical',
  guitarRingColor: 'rgba(255,255,255,0.05)',
  masterVolume: 0.75
};

export default function App() {
  console.log('APP: Initializing Studio State...');
  const [language, setLanguage] = useState<Language>('de');
  const [guitarColor, setGuitarColor] = useState<string>('#4d2b1e');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [mnemonicIdx, setMnemonicIdx] = useState(0);

  useEffect(() => {
    if (language === 'de') setMnemonicIdx(0);
    else setMnemonicIdx(2);
  }, [language]);
  const [activeView, setActiveView] = useState<ViewMode>('quintencirkel');

  const t = (key: keyof typeof translations['en']) => getTranslation(language, key);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [instrument, setInstrument] = useState<InstrumentCategory>('guitar');
  const [activeInstruments, setActiveInstruments] = useState<string[]>(['piano', 'acoustic', 'bass', 'drums']);
  const [theoryRoot, setTheoryRoot] = useState<string | null>(null);
  const [soloInstrument, setSoloInstrument] = useState<string | null>(null);
  const [isMiniWheelOpen, setIsMiniWheelOpen] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isLooping, setIsLooping] = useState(false);
  const isLoopingRef = useRef(isLooping);
  useEffect(() => { 
    isLoopingRef.current = isLooping; 
  }, [isLooping]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<SongBlock | null>(null);
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playbackHighlightTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const activeNodesRef = useRef<AudioNode[]>([]);
  const activeSourcesRef = useRef<AudioNode[]>([]);
  const noiseBuffersRef = useRef<Record<string, AudioBuffer>>({});
  
  interface SongBlock {
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

  const [songBlocks, setSongBlocks] = useState<SongBlock[]>(() => {
    try {
      const saved = localStorage.getItem('quint_blocks');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("localStorage access denied:", e);
    }
    return [
      { id: '1', note: 'A', isMinor: true, type: 'chord', duration: 4, section: 'Intro', instruments: ['piano', 'acoustic', 'bass', 'drums'] },
      { id: '2', note: 'G', isMinor: false, type: 'chord', duration: 4, instruments: ['piano', 'acoustic', 'bass', 'drums'] },
      { id: '3', note: 'F', isMinor: false, type: 'chord', duration: 4, instruments: ['piano', 'acoustic', 'bass', 'drums'] },
      { id: '4', note: 'E', isMinor: false, type: 'chord', duration: 4, instruments: ['piano', 'acoustic', 'bass', 'drums'] },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('quint_blocks', JSON.stringify(songBlocks));
    } catch (e) {
      console.warn("localStorage save failed:", e);
    }
  }, [songBlocks]);
  // --- State Persistence & History ---
  const [history, setHistory] = useState<SongBlock[][]>(() => [songBlocks || []]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updateBlocksWithHistory = (newBlocks: SongBlock[] | ((prev: SongBlock[]) => SongBlock[])) => {
    setSongBlocks(prev => {
      const next = typeof newBlocks === 'function' ? newBlocks(prev) : newBlocks;
      
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(next);
      // Keep last 50 steps
      if (newHistory.length > 50) newHistory.shift();
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return next;
    });
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setSongBlocks(history[prevIndex]);
      setHistoryIndex(prevIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setSongBlocks(history[nextIndex]);
      setHistoryIndex(nextIndex);
    }
  };

  const shareArrangement = () => {
    try {
      const data = JSON.stringify({ bpm, blocks: songBlocks });
      const encoded = btoa(data);
      const url = new URL(window.location.href);
      url.searchParams.set('song', encoded);
      navigator.clipboard.writeText(url.toString());
      alert('Share link copied to clipboard!');
    } catch (e) {
      console.error('Sharing failed', e);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('song');
    if (shared) {
      try {
        const decoded = JSON.parse(atob(shared));
        if (decoded.blocks) setSongBlocks(decoded.blocks);
        if (decoded.bpm) setBpm(decoded.bpm);
        // Clear param to avoid re-loading
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.warn('Invalid shared link');
      }
    }
  }, []);

  const [playbackString, setPlaybackString] = useState('');
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [referenceFreq, setReferenceFreq] = useState(440);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isMetronomeOpen, setIsMetronomeOpen] = useState(false);
  const [playedReferenceNote, setPlayedReferenceNote] = useState<ReferenceNote | null>(null);
  const [playingRiff, setPlayingRiff] = useState<{ id: string; activeIndex: number } | null>(null);
  const [showPerfectFlash, setShowPerfectFlash] = useState(false);
  const [tunedStrings, setTunedStrings] = useState<string[]>([]);
  const playbackTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterBusRef = useRef<{ 
    compressor: DynamicsCompressorNode; 
    gain: GainNode; 
    reverb: ConvolverNode; 
    reverbGain: GainNode 
  } | null>(null);
  
  const getMasterBus = (ctx: AudioContext) => {
    if (masterBusRef.current) return masterBusRef.current;
    
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, ctx.currentTime); // Lower threshold for more headroom
    compressor.knee.setValueAtTime(40, ctx.currentTime);
    compressor.ratio.setValueAtTime(10, ctx.currentTime);
    compressor.attack.setValueAtTime(0.005, ctx.currentTime);
    compressor.release.setValueAtTime(0.15, ctx.currentTime);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(settings.masterVolume, ctx.currentTime);

    // Soft Reverb creation
    const reverb = ctx.createConvolver();
    const duration = 1.0;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let i = 0; i < 2; i++) {
        const channel = impulse.getChannelData(i);
        // Using exponential decay with some low-pass filtering on the noise
        let prev = 0;
        for (let j = 0; j < length; j++) {
            const raw = (Math.random() * 2 - 1);
            // Simple low-pass: y[n] = 0.5 * x[n] + 0.5 * y[n-1]
            const lp = 0.4 * raw + 0.6 * prev;
            prev = lp;
            channel[j] = lp * Math.pow(1 - j / length, 2.0);
        }
    }
    reverb.buffer = impulse;

    const reverbGain = ctx.createGain();
    reverbGain.gain.setValueAtTime(0.08, ctx.currentTime); // Slightly drier for clarity
    
    // Safety Limiter
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-2, ctx.currentTime);
    limiter.knee.setValueAtTime(0, ctx.currentTime);
    limiter.ratio.setValueAtTime(20, ctx.currentTime);
    limiter.attack.setValueAtTime(0.0005, ctx.currentTime);
    limiter.release.setValueAtTime(0.05, ctx.currentTime);

    compressor.connect(gain);
    compressor.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(gain);
    
    gain.connect(limiter);
    limiter.connect(ctx.destination);
    
    masterBusRef.current = { compressor, gain, reverb, reverbGain };
    return masterBusRef.current;
  };

  const getFreq = (note: string, octave: number = 4) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const altNames: Record<string, number> = {
      'DB': 1, 'EB': 3, 'GB': 6, 'AB': 8, 'BB': 10,
      'C#': 1, 'D#': 3, 'F#': 6, 'G#': 8, 'A#': 10
    };
    
    const upper = note.toUpperCase();
    let step = noteNames.indexOf(upper);
    if (step === -1) step = altNames[upper] ?? 0;
    
    const n = (octave * 12) + step + 12;
    const freq = 440 * Math.pow(2, (n - 69) / 12);
    return freq * (referenceFreq / 440);
  };

  const stopAllSound = () => {
    // Clear all timeouts
    playbackTimeoutsRef.current.forEach(clearTimeout);
    playbackTimeoutsRef.current = [];
    playbackHighlightTimeoutsRef.current.forEach(clearTimeout);
    playbackHighlightTimeoutsRef.current = [];
    if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    
    // Stop all scheduled sources
    activeSourcesRef.current.forEach(source => {
      try {
        if ('stop' in source && typeof (source as any).stop === 'function') {
          (source as any).stop();
        }
      } catch (e) {}
      try {
        source.disconnect();
      } catch (e) {}
    });
    activeSourcesRef.current = [];

    // Disconnect all other nodes (gains, filters)
    activeNodesRef.current.forEach(node => {
      try {
        node.disconnect();
      } catch (e) {}
    });
    activeNodesRef.current = [];

    setIsPlaybackActive(false);
    setActiveBlockId(null);
  };

  const getNoiseBuffer = (ctx: AudioContext, type: 'white' | 'snare' | 'hat') => {
    if (noiseBuffersRef.current[type]) return noiseBuffersRef.current[type];

    const sampleRate = ctx.sampleRate;
    let length = sampleRate * 0.5;
    let buffer: AudioBuffer;

    if (type === 'hat') {
      length = sampleRate * 0.04; // Even shorter for crispness
      buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<length; i++) {
        // More explosive start, faster decay for a metallic "tick"
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4.0);
      }
    } else if (type === 'snare') {
      length = sampleRate * 0.25; 
      buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<length; i++) {
        // Less "hiss", more "crack"
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    } else {
      buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<length; i++) data[i] = Math.random() * 2 - 1;
    }

    noiseBuffersRef.current[type] = buffer;
    return buffer;
  };

  const playTone = (
    noteStr: string, 
    startTime: number, 
    duration: number = 0.5, 
    soundOverride?: string, 
    isAccented?: boolean, 
    blockInstruments?: string[],
    volume: number = 1,
    intensity: number = 0.5,
    styles?: Record<string, string>
  ) => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const soundsToPlay = blockInstruments?.length 
      ? blockInstruments 
      : (soundOverride ? (soundOverride === 'pause' ? [] : [soundOverride]) : (soloInstrument ? [soloInstrument] : activeInstruments));

    soundsToPlay.forEach(sound => {
      const config = mixer[sound] || { volume: 1, pan: 0, muted: false };
      if (config.muted) return;

      // Limit concurrent voices globally to prevent CPU crunch on mobile
      // Auto-stealing logic: if we exceed 512 voices, find and kill notes that have already flagged as ended
      if (activeSourcesRef.current.length > 512) {
        const sourceToStop = activeSourcesRef.current.find(s => (s as any)._ended) || activeSourcesRef.current.shift();
        if (sourceToStop) {
            try { (sourceToStop as any).stop(); } catch(e) {}
            try { sourceToStop.disconnect(); } catch(e) {}
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== sourceToStop);
        }
      }

      const style = (styles?.[sound]) || (mixer[sound]?.style) || 'classic';
      
      // Humanization: Subtle variation in timing and volume
      const humanDelay = (Math.random() - 0.5) * 0.015;
      const humanVel = 1 + (Math.random() - 0.5) * 0.12;
      const humanDetune = (Math.random() - 0.5) * 5;
      const finalStartTime = Math.max(ctx.currentTime, startTime + humanDelay);
      
      // Global Volume Mitigation to prevent digital clipping
      const baseGainBoost = sound === 'drums' ? 0.8 : (sound === 'bass' ? 0.9 : 0.75);
      const volumeMultiplier = (isAccented ? 1.4 : 1.0) * volume * config.volume * humanVel * baseGainBoost;
      
      // Panner for spatial positioning
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(config.pan, finalStartTime);
      panner.connect(getMasterBus(ctx).compressor);
      activeNodesRef.current.push(panner);

      if (sound === 'drums') {
        const drumMaster = ctx.createGain();
        drumMaster.gain.setValueAtTime(volumeMultiplier, finalStartTime);
        
        // Rock Drum Glue: A subtle saturator/compressor on the drum bus
        const drumDist = ctx.createWaveShaper();
        const curve = new Float32Array(44100);
        for (let i = 0; i < 44100; i++) {
            const x = (i * 2) / 44100 - 1;
            curve[i] = Math.tanh(x * 1.2); // Soft saturation for "warmth"
        }
        drumDist.curve = curve;
        
        drumMaster.connect(drumDist);
        drumDist.connect(panner);
        activeNodesRef.current.push(drumMaster, drumDist);

        if (style === '808' || style === 'electronic') {
           // Refined 808 with composite transient
           const kickOsc = ctx.createOscillator();
           const kickGain = ctx.createGain();
           const click = ctx.createOscillator();
           const clickGain = ctx.createGain();

           kickOsc.frequency.setValueAtTime(150, finalStartTime);
           kickOsc.frequency.exponentialRampToValueAtTime(42, finalStartTime + 0.15);
           
           click.type = 'triangle';
           click.frequency.setValueAtTime(1800, finalStartTime);
           click.frequency.exponentialRampToValueAtTime(400, finalStartTime + 0.02);
           
           kickGain.gain.setValueAtTime(2.2, finalStartTime);
           kickGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.7);
           
           clickGain.gain.setValueAtTime(0.15, finalStartTime);
           clickGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.03);

           kickOsc.connect(kickGain);
           click.connect(clickGain);
           kickGain.connect(drumMaster);
           clickGain.connect(drumMaster);

           kickOsc.start(finalStartTime);
           click.start(finalStartTime);
           kickOsc.stop(finalStartTime + 0.8);
           click.stop(finalStartTime + 0.05);
           
           kickOsc.onended = () => {
             (kickOsc as any)._ended = true;
             activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== kickOsc && s !== click);
           };
           activeSourcesRef.current.push(kickOsc, click);
           activeNodesRef.current.push(kickGain, clickGain);

           const snareOsc = ctx.createOscillator();
           snareOsc.type = 'triangle';
           snareOsc.frequency.setValueAtTime(160, finalStartTime);
           snareOsc.frequency.exponentialRampToValueAtTime(100, finalStartTime + 0.1);
           
           const snareNoise = ctx.createBufferSource();
           snareNoise.buffer = getNoiseBuffer(ctx, 'snare');
           const snareFilt = ctx.createBiquadFilter();
           snareFilt.type = 'bandpass';
           snareFilt.frequency.setValueAtTime(1800, finalStartTime);
           snareFilt.Q.setValueAtTime(0.7, finalStartTime);

           const snareGain = ctx.createGain();
           snareGain.gain.setValueAtTime(1.1, finalStartTime);
           snareGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.25);
           
           snareOsc.connect(snareGain);
           snareNoise.connect(snareFilt);
           snareFilt.connect(snareGain);
           snareGain.connect(drumMaster);

           snareOsc.start(finalStartTime);
           snareNoise.start(finalStartTime);
           snareOsc.stop(finalStartTime + 0.3);
           snareNoise.stop(finalStartTime + 0.3);

           snareOsc.onended = () => {
             (snareOsc as any)._ended = true;
             activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== snareOsc && s !== snareNoise);
           };
           activeSourcesRef.current.push(snareOsc, snareNoise);
           activeNodesRef.current.push(snareGain, snareFilt);
        } else {
          // PRO ROCK DRUMMER ENGINE
          
          // 1. PUNCHY COMPOSITE KICK
          const kickOsc = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kickOsc.frequency.setValueAtTime(180, finalStartTime);
          kickOsc.frequency.exponentialRampToValueAtTime(45, finalStartTime + 0.06);
          
          kickGain.gain.setValueAtTime(2.8, finalStartTime);
          kickGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.14);
          
          const kickClick = ctx.createOscillator();
          kickClick.type = 'square';
          kickClick.frequency.setValueAtTime(2400, finalStartTime);
          const clickGain = ctx.createGain();
          clickGain.gain.setValueAtTime(0.08, finalStartTime);
          clickGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.015);
          
          const kickBody = ctx.createOscillator();
          kickBody.type = 'sine'; 
          kickBody.frequency.setValueAtTime(62, finalStartTime);
          const kickBodyG = ctx.createGain();
          kickBodyG.gain.setValueAtTime(0.6, finalStartTime);
          kickBodyG.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.2);
          
          kickOsc.connect(kickGain);
          kickClick.connect(clickGain);
          kickBody.connect(kickBodyG);
          kickGain.connect(drumMaster);
          clickGain.connect(drumMaster);
          kickBodyG.connect(drumMaster);
          
          kickOsc.start(finalStartTime);
          kickClick.start(finalStartTime);
          kickBody.start(finalStartTime);
          kickOsc.stop(finalStartTime + 0.2);
          kickClick.stop(finalStartTime + 0.05);
          kickBody.stop(finalStartTime + 0.25);
          kickOsc.onended = () => {
            (kickOsc as any)._ended = true;
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== kickOsc && s !== kickClick && s !== kickBody);
          };
          activeSourcesRef.current.push(kickOsc, kickClick, kickBody);
          activeNodesRef.current.push(kickGain, clickGain, kickBodyG);

          // 2. EXPLOSIVE LAYERED SNARE
          const snareNoise = ctx.createBufferSource();
          snareNoise.buffer = getNoiseBuffer(ctx, 'snare');
          
          const snareBPF = ctx.createBiquadFilter();
          snareBPF.type = 'highpass';
          snareBPF.frequency.setValueAtTime(1000, finalStartTime);

          const snareLFP = ctx.createBiquadFilter();
          snareLFP.type = 'lowpass';
          snareLFP.frequency.setValueAtTime(8000, finalStartTime);
          
          const snareNoiseGain = ctx.createGain();
          snareNoiseGain.gain.setValueAtTime(1.6, finalStartTime);
          snareNoiseGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.16);
          
          const snareOsc = ctx.createOscillator();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(210, finalStartTime); 
          snareOsc.frequency.exponentialRampToValueAtTime(160, finalStartTime + 0.05); 
          const snareOscGain = ctx.createGain();
          snareOscGain.gain.setValueAtTime(1.2, finalStartTime);
          snareOscGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.12);

          snareNoise.connect(snareBPF);
          snareBPF.connect(snareLFP);
          snareLFP.connect(snareNoiseGain);
          snareOsc.connect(snareOscGain);
          snareNoiseGain.connect(drumMaster);
          snareOscGain.connect(drumMaster);
          
          snareNoise.start(finalStartTime);
          snareOsc.start(finalStartTime);
          snareNoise.stop(finalStartTime + 0.25);
          snareOsc.stop(finalStartTime + 0.25);
          snareOsc.onended = () => {
            (snareOsc as any)._ended = true;
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== snareNoise && s !== snareOsc);
          };
          activeSourcesRef.current.push(snareNoise, snareOsc);
          activeNodesRef.current.push(snareBPF, snareLFP, snareNoiseGain, snareOscGain);
        }

        // 3. TIGHT METALLIC HI-HATS (No "crickets"!)
        const hatCount = intensity > 0.7 ? 8 : 4;
        const hatInterval = duration / hatCount;
        
        for (let i = 0; i < hatCount; i++) {
          const hatTime = finalStartTime + (i * hatInterval);
          const hatNoise = ctx.createBufferSource();
          hatNoise.buffer = getNoiseBuffer(ctx, 'hat');

          const hatFilt = ctx.createBiquadFilter();
          hatFilt.type = 'highpass';
          // Higher cutoff to remove the "pitched" noise tail
          hatFilt.frequency.setValueAtTime(9000 + Math.random() * 2000, hatTime);
          
          const hGain = ctx.createGain();
          // First hat is slightly louder (accented start of block)
          const localVol = i === 0 ? 0.12 : 0.08;
          hGain.gain.setValueAtTime(localVol, hatTime);
          hGain.gain.exponentialRampToValueAtTime(0.001, hatTime + 0.025); // Very fast decay
          
          hatNoise.connect(hatFilt);
          hatFilt.connect(hGain);
          hGain.connect(drumMaster);
          
          hatNoise.start(hatTime);
          hatNoise.stop(hatTime + 0.035);
          hatNoise.onended = () => {
            (hatNoise as any)._ended = true;
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== hatNoise);
          };
          activeSourcesRef.current.push(hatNoise);
          activeNodesRef.current.push(hatFilt, hGain);
        }
        return;
      }

      const match = noteStr.match(/^([A-G][#b]?)([0-8])?$/i);
      if (!match && !/^\d$/.test(noteStr)) return;

      let freq = 0;
      if (match) {
          const noteName = match[1];
          const octave = match[2] ? parseInt(match[2]) : 3;
          freq = getFreq(noteName, octave);
      } else {
          const map = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
          const note = map[parseInt(noteStr) % 6];
          const m = note.match(/^([A-G][#b]?)([0-8])?$/i);
          freq = getFreq(m![1], parseInt(m![2]));
      }

      if (sound === 'bass') {
        const bassFreq = freq / 2;
        const bassGain = ctx.createGain();
        const bassBus = ctx.createGain();
        
        if (style === 'sub') {
          const sub = ctx.createOscillator();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(bassFreq, finalStartTime);
          sub.connect(bassBus);
          sub.start(finalStartTime);
          sub.stop(finalStartTime + duration * 1.2);
          sub.onended = () => {
            (sub as any)._ended = true;
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== sub);
          };
          activeSourcesRef.current.push(sub);
        } else if (style === 'synth') {
          const saw = ctx.createOscillator();
          saw.type = 'sawtooth';
          saw.frequency.setValueAtTime(bassFreq, finalStartTime);
          saw.detune.setValueAtTime(-4, finalStartTime);
          
          const sqr = ctx.createOscillator();
          sqr.type = 'square';
          sqr.frequency.setValueAtTime(bassFreq, finalStartTime);
          sqr.detune.setValueAtTime(4, finalStartTime);
          const sqrGain = ctx.createGain();
          sqrGain.gain.setValueAtTime(0.3, finalStartTime);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1800, finalStartTime);
          filter.frequency.exponentialRampToValueAtTime(120, finalStartTime + 0.4);
          filter.Q.setValueAtTime(7, finalStartTime);

          saw.connect(filter);
          sqr.connect(sqrGain);
          sqrGain.connect(filter);
          filter.connect(bassBus);

          saw.start(finalStartTime);
          sqr.start(finalStartTime);
          saw.stop(finalStartTime + duration * 1.2);
          sqr.stop(finalStartTime + duration * 1.2);
          
          saw.onended = () => {
             (saw as any)._ended = true;
             activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== saw && s !== sqr);
          };

          activeSourcesRef.current.push(saw, sqr);
          activeNodesRef.current.push(sqrGain, filter);
        } else {
          // Classic Electric
          const body = ctx.createOscillator();
          body.type = 'triangle';
          body.frequency.setValueAtTime(bassFreq, finalStartTime);
          
          const subtone = ctx.createOscillator();
          subtone.type = 'sine';
          subtone.frequency.setValueAtTime(bassFreq, finalStartTime);
          const subGain = ctx.createGain();
          subGain.gain.setValueAtTime(0.5, finalStartTime);

          const pluck = ctx.createOscillator();
          pluck.type = 'square';
          pluck.frequency.setValueAtTime(bassFreq * 3, finalStartTime);
          const pluckGain = ctx.createGain();
          pluckGain.gain.setValueAtTime(0.1, finalStartTime);
          pluckGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.06);

          const bassFilt = ctx.createBiquadFilter();
          bassFilt.type = 'lowpass';
          bassFilt.frequency.setValueAtTime(800, finalStartTime);

          body.connect(bassFilt);
          subtone.connect(subGain);
          subGain.connect(bassFilt);
          pluck.connect(pluckGain);
          pluckGain.connect(bassBus);
          bassFilt.connect(bassBus);

          body.start(finalStartTime);
          subtone.start(finalStartTime);
          pluck.start(finalStartTime);
          body.stop(finalStartTime + duration * 1.2);
          subtone.stop(finalStartTime + duration * 1.2);
          pluck.stop(finalStartTime + 0.1);
          
          body.onended = () => {
             (body as any)._ended = true;
             activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== body && s !== subtone && s !== pluck);
          };

          activeSourcesRef.current.push(body, subtone, pluck);
          activeNodesRef.current.push(subGain, pluckGain, bassFilt);
        }

        const drive = ctx.createWaveShaper();
        const curve = new Float32Array(44100);
        for(let i=0; i<44100; i++) {
          const x = i * 2 / 44100 - 1;
          curve[i] = Math.tanh(x * 1.4);
        }
        drive.curve = curve;

        bassGain.gain.setValueAtTime(0, finalStartTime);
        bassGain.gain.linearRampToValueAtTime(0.9 * volumeMultiplier, finalStartTime + 0.015);
        bassGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + duration * 2);

        bassBus.connect(drive);
        drive.connect(bassGain);
        bassGain.connect(panner);
        
        activeNodesRef.current.push(bassBus, bassGain, drive);
        return;
      }

      const masterGain = ctx.createGain();
      activeNodesRef.current.push(masterGain);
      masterGain.gain.setValueAtTime(0, finalStartTime);
      const baseIntensity = 0.4;
      masterGain.gain.linearRampToValueAtTime((baseIntensity / Math.sqrt(soundsToPlay.length)) * volumeMultiplier, finalStartTime + 0.008);
      
      const decayTime = duration * (0.7 + intensity * 0.4);
      masterGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + decayTime);
      masterGain.gain.linearRampToValueAtTime(0, finalStartTime + duration);

      if (sound === 'acoustic') {
        const masterPluck = ctx.createGain();
        masterPluck.connect(masterGain);
        
        // Organic Acoustic Hybrid: Multi-voice unison for voluminous body
        // Stacked oscillators with tight detune + wide release
        [0.5, 1, 1.002, 1.005, 2].forEach((m, i) => {
          const osc = ctx.createOscillator();
          osc.type = i === 2 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq * m, finalStartTime);
          osc.detune.setValueAtTime(humanDetune * (i + 1), finalStartTime);
          
          const env = ctx.createGain();
          env.gain.setValueAtTime(0, finalStartTime);
          // Nonlinear character attack
          env.gain.linearRampToValueAtTime(i === 0 ? 0.3 : (0.8 / (i + 1)), finalStartTime + 0.006);
          env.gain.exponentialRampToValueAtTime(0.001, finalStartTime + decayTime * (1.2 - i * 0.15));

          osc.connect(env);
          env.connect(masterPluck);
          osc.start(finalStartTime);
          osc.stop(finalStartTime + decayTime + 0.5);
          
          if (i === 1) {
            osc.onended = () => {
              (osc as any)._ended = true;
              activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== osc);
            };
          }
          activeSourcesRef.current.push(osc);
          activeNodesRef.current.push(env);
        });

        const fretNoise = ctx.createBufferSource();
        fretNoise.buffer = getNoiseBuffer(ctx, 'hat');
        const noiseFilt = ctx.createBiquadFilter();
        noiseFilt.type = 'highpass';
        noiseFilt.frequency.setValueAtTime(7500, finalStartTime);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.04, finalStartTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.035);
        
        fretNoise.connect(noiseFilt);
        noiseFilt.connect(noiseGain);
        noiseGain.connect(masterPluck);
        fretNoise.start(finalStartTime);
        activeSourcesRef.current.push(fretNoise);
        activeNodesRef.current.push(noiseFilt, noiseGain);
      } else if (sound === 'electric') {
        const distMaster = ctx.createGain();
        distMaster.connect(masterGain);

        // Voluminous Electric: Stacked sawtooths + Wide distortion
        [1, 1.005, 2.01].forEach((m, i) => {
          const osc = ctx.createOscillator();
          osc.frequency.setValueAtTime(freq * m, finalStartTime);
          osc.detune.setValueAtTime(humanDetune + (i * 4), finalStartTime);
          
          osc.type = (style === 'clean') ? 'triangle' : 'sawtooth';
          
          const distortion = ctx.createWaveShaper();
          const makeDistortionCurve = (amount: number) => {
            const k = amount;
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            for (let i = 0 ; i < n_samples; ++i ) {
              const x = i * 2 / n_samples - 1;
              curve[i] = ( 3 + k ) * x * 65 * (Math.PI / 180) / ( Math.PI + k * Math.abs(x * 1.5) );
            }
            return curve;
          };
          
          const distAmount = style === 'heavy' ? 1400 : (style === 'crunch' ? 500 : 50);
          distortion.curve = makeDistortionCurve(distAmount + intensity * 800);
          distortion.oversample = '4x';

          const cabFilter = ctx.createBiquadFilter();
          cabFilter.type = 'lowpass';
          cabFilter.frequency.setValueAtTime(i === 2 ? 2500 : 4500, finalStartTime);
          
          osc.connect(distortion);
          distortion.connect(cabFilter);
          
          const midBoost = ctx.createBiquadFilter();
          midBoost.type = 'peaking';
          midBoost.frequency.setValueAtTime(2000, finalStartTime);
          midBoost.gain.setValueAtTime(style === 'heavy' ? 6 : 3, finalStartTime);
          
          cabFilter.connect(midBoost);
          midBoost.connect(distMaster);
          
          osc.start(finalStartTime);
          osc.stop(finalStartTime + duration + 0.4);
          if (i === 0) {
            osc.onended = () => {
               (osc as any)._ended = true;
               activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== osc);
            };
          }
          activeSourcesRef.current.push(osc);
          activeNodesRef.current.push(distortion, cabFilter);
        });
      } else if (sound === 'piano') {
        const pianoMaster = ctx.createGain();
        pianoMaster.connect(masterGain);

        if (style === 'epiano') {
           const osc = ctx.createOscillator();
           osc.type = 'sine';
           osc.frequency.setValueAtTime(freq, finalStartTime);
           const fm = ctx.createOscillator();
           fm.frequency.setValueAtTime(freq * 3.5, finalStartTime);
           const fmGain = ctx.createGain();
           fmGain.gain.setValueAtTime(450, finalStartTime);
           fmGain.gain.exponentialRampToValueAtTime(1, finalStartTime + 0.4);
           fm.connect(fmGain);
           fmGain.connect(osc.frequency);
           osc.connect(pianoMaster);
           fm.start(finalStartTime);
           osc.start(finalStartTime);
           osc.stop(finalStartTime + decayTime);
           fm.stop(finalStartTime + decayTime);

           osc.onended = () => {
             (osc as any)._ended = true;
             activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== osc && s !== fm);
           };

           activeSourcesRef.current.push(osc, fm);
           activeNodesRef.current.push(fmGain);
        } else {
          // PRO PIANO: Better harmonic distribution
          [1, 2, 3, 4, 6, 8].forEach((m, i) => {
            const osc = ctx.createOscillator();
            osc.type = (i === 0) ? (style === 'bright' ? 'square' : 'triangle') : 'sine';
            osc.frequency.setValueAtTime(freq * m, finalStartTime);
            osc.detune.setValueAtTime(humanDetune * (i + 1), finalStartTime);
            
            const g = ctx.createGain();
            const harmonicGainValue = (i === 0 ? 1.2 : (0.25 / Math.pow(i + 1, 1.5))) * (style === 'bright' ? 1.4 : 1.1);
            g.gain.setValueAtTime(harmonicGainValue, finalStartTime);
            const harmonicDecay = (duration / Math.sqrt(m)) * 2.0;
            g.gain.exponentialRampToValueAtTime(0.001, finalStartTime + harmonicDecay);
            
            osc.connect(g);
            g.connect(pianoMaster);
            osc.start(finalStartTime);
            osc.stop(finalStartTime + harmonicDecay + 0.2);

            if (i === 0) {
              osc.onended = () => {
                (osc as any)._ended = true;
                activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== osc);
              };
            }
            activeSourcesRef.current.push(osc);
            activeNodesRef.current.push(g);
          });
        }
      } else if (sound === '12string') {
        const osc = ctx.createOscillator();
        const octaveOsc = ctx.createOscillator();
        osc.type = 'triangle';
        octaveOsc.type = 'sine';
        osc.frequency.setValueAtTime(freq, finalStartTime);
        octaveOsc.frequency.setValueAtTime(freq * 2.004, finalStartTime);
        
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.7, finalStartTime);
        g.gain.exponentialRampToValueAtTime(0.001, finalStartTime + decayTime);
        
        osc.connect(g);
        octaveOsc.connect(g);
        g.connect(masterGain);
        
        osc.start(finalStartTime);
        octaveOsc.start(finalStartTime);
        osc.stop(finalStartTime + decayTime + 0.2);
        octaveOsc.stop(finalStartTime + decayTime + 0.2);
        
        osc.onended = () => {
          activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== osc && s !== octaveOsc);
        };
        activeSourcesRef.current.push(osc, octaveOsc);
      } else if (sound === 'ukulele') {
        const pluck = ctx.createGain();
        pluck.connect(masterGain);
        [1, 2, 4].forEach((m, i) => {
          const osc = ctx.createOscillator();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq * 2 * m, finalStartTime);
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.8 / (i + 1), finalStartTime);
          env.gain.exponentialRampToValueAtTime(0.001, finalStartTime + 0.35);
          osc.connect(env);
          env.connect(pluck);
          osc.start(finalStartTime);
          osc.stop(finalStartTime + 0.4);
          if (i === 0) {
            osc.onended = () => {
              (osc as any)._ended = true;
              activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== osc);
            };
          }
          activeSourcesRef.current.push(osc);
        });
      } else if (sound === 'synth') {
        const synthMaster = ctx.createGain();
        synthMaster.connect(masterGain);
        
        // VOLUMINOUS SYNTH: Unison + Sub + Filter LFO
        [1, 1.006, 0.5].forEach((m, i) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          
          osc.type = i === 2 ? 'sine' : (style === 'lead' ? 'sawtooth' : 'square');
          osc.frequency.setValueAtTime(freq * m, finalStartTime);
          osc.detune.setValueAtTime(humanDetune * (i + 1), finalStartTime);
          
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(i === 2 ? 500 : 2500, finalStartTime);
          filter.frequency.exponentialRampToValueAtTime(style === 'square' ? 600 : 3500, finalStartTime + duration);
          filter.Q.setValueAtTime(style === 'lead' ? 4 : 1, finalStartTime);
          
          osc.connect(filter);
          filter.connect(synthMaster);
          
          osc.start(finalStartTime);
          osc.stop(finalStartTime + duration + 0.2);

          if (i === 0) {
            osc.onended = () => {
              (osc as any)._ended = true;
              activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== osc);
            };
          }
          activeSourcesRef.current.push(osc);
          activeNodesRef.current.push(filter);
        });
      } else {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, finalStartTime);
        osc.connect(masterGain);
        osc.start(finalStartTime);
        osc.stop(finalStartTime + duration + 0.1);

        osc.onended = () => {
          (osc as any)._ended = true;
          activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== osc);
        };
        activeSourcesRef.current.push(osc);
      }

      const filter = ctx.createBiquadFilter();
      activeNodesRef.current.push(filter);
      filter.type = 'lowpass';
      // Dynamic LPF: Chords need more filtering to avoid "beating" and harshness
      const chordFilterMod = soundsToPlay.length > 2 ? 0.8 : 1.0;
      const cutoff = (sound === 'electric' ? 4200 : (sound === 'piano' ? 2800 : 3200)) * chordFilterMod;
      filter.frequency.setValueAtTime(cutoff, finalStartTime);
      // Soften the attack slightly to avoid "pop" on layered starts
      masterGain.gain.setValueAtTime(0, finalStartTime);
      masterGain.gain.linearRampToValueAtTime((baseIntensity / Math.sqrt(soundsToPlay.length)) * volumeMultiplier, finalStartTime + 0.015);
      
      masterGain.connect(filter);
      filter.connect(panner);
    });
  };

  const getChromaticScale = () => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const normalizeRoot = (n: string) => {
    const raw = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
    const map: Record<string, string> = { 
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
      'C#': 'C#', 'D#': 'D#', 'F#': 'F#', 'G#': 'G#', 'A#': 'A#'
    };
    return map[raw] || raw;
  };

  const getSuggestions = (lastBlock?: SongBlock) => {
    if (!lastBlock || lastBlock.type === 'pause') return [];
    
    // Circle of Fifths neighbors
    const FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    const normalizedLastNote = normalizeRoot(lastBlock.note);
    const idx = FIFTHS.findIndex(n => normalizeRoot(n) === normalizedLastNote);
    if (idx === -1) return [];

    const neighbors = [
      { note: FIFTHS[(idx + 1) % 12], isMinor: false, label: 'Dominant (V)' },
      { note: FIFTHS[(idx + 11) % 12], isMinor: false, label: 'Subdominant (IV)' },
      { note: FIFTHS[idx], isMinor: true, label: 'Rel. Minor (vi)' },
    ];
    
    return neighbors;
  };

  const addBlock = (note: string, isMinor: boolean, type: 'chord' | 'pause' = 'chord') => {
    const newBlock: SongBlock = {
      id: Math.random().toString(36).substr(2, 9),
      note,
      isMinor,
      type,
      duration: 4,
      instruments: type === 'chord' ? [...activeInstruments] : [],
      volume: 1,
      intensity: 0.5
    };
    updateBlocksWithHistory(prev => [...prev, newBlock]);
  };

  const removeBlock = (id: string) => {
    updateBlocksWithHistory(prev => prev.filter(b => b.id !== id));
  };

  const handleTestInstrument = (id: string) => {
    // Play a single note to test the instrument
    const style = mixer[id]?.style || 'classic';
    handlePlayChord('C', false, 0.5, false, 'instant', [id], { [id]: style });
  };

  const updateBlockDuration = (id: string, delta: number) => {
    updateBlocksWithHistory(prev => prev.map(b => 
      b.id === id ? { ...b, duration: Math.max(0.5, b.duration + delta) } : b
    ));
  };

  const updateBlockChord = (id: string, note: string, isMinor: boolean) => {
    updateBlocksWithHistory(prev => prev.map(b => 
      b.id === id ? { ...b, note, isMinor } : b
    ));
  };

  const updateBlockSection = (id: string, section: SongBlock['section']) => {
    updateBlocksWithHistory(prev => prev.map(b => 
      b.id === id ? { ...b, section } : b
    ));
  };

  const updateBlockLyrics = (id: string, lyrics: string) => {
    updateBlocksWithHistory(prev => prev.map(b => 
      b.id === id ? { ...b, lyrics } : b
    ));
  };

  const updateBlockInstruments = (id: string, instrumentId: string) => {
    updateBlocksWithHistory(prev => prev.map(b => {
      if (b.id !== id) return b;
      const current = b.instruments || [];
      const next = current.includes(instrumentId) 
        ? current.filter(i => i !== instrumentId)
        : [...current, instrumentId];
      return { ...b, instruments: next };
    }));
  };

  const updateBlockEffects = (id: string, type: 'volume' | 'intensity', delta: number) => {
    updateBlocksWithHistory(prev => prev.map(b => {
      if (b.id !== id) return b;
      const currentVal = b[type] ?? (type === 'volume' ? 1 : 0.5);
      const newVal = Math.max(0, Math.min(2, currentVal + delta));
      return { ...b, [type]: newVal };
    }));
  };

  const duplicateBlock = (block: SongBlock) => {
    const newBlock = { ...block, id: Math.random().toString(36).slice(2, 9) };
    const index = songBlocks.findIndex(b => b.id === block.id);
    if (index !== -1) {
      const nextBlocks = [...songBlocks];
      nextBlocks.splice(index + 1, 0, newBlock);
      updateBlocksWithHistory(nextBlocks);
    } else {
      updateBlocksWithHistory(prev => [...prev, newBlock]);
    }
  };

  const updateBlockAccent = (id: string) => {
    updateBlocksWithHistory(prev => prev.map(b => 
      b.id === id ? { ...b, isAccented: !b.isAccented } : b
    ));
  };

  const updateBlockStrum = (id: string) => {
    updateBlocksWithHistory(prev => prev.map(b => 
      b.id === id ? { ...b, strumMode: b.strumMode === 'arpeggio' ? 'instant' : 'arpeggio' } : b
    ));
  };

  const transposeSong = (direction: number) => {
    updateBlocksWithHistory(prev => prev.map(b => {
      if (b.type === 'pause') return b;
      const scale = getChromaticScale();
      const currentIdx = scale.indexOf(normalizeRoot(b.note));
      if (currentIdx === -1) return b;
      const nextIdx = (currentIdx + direction + 12) % 12;
      return { ...b, note: scale[nextIdx] };
    }));
  };

  const [flippedPresets, setFlippedPresets] = useState<string[]>([]);
  const [presetOffsets, setPresetOffsets] = useState<Record<string, number>>({});

  const toggleFlip = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setFlippedPresets(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleTransposePreset = (e: React.MouseEvent, name: string, delta: number) => {
    e.stopPropagation();
    setPresetOffsets(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + delta
    }));
  };

  const getTransposedChords = (chords: string[], offset: number) => {
    if (offset === 0) return chords;
    const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return chords.map(chord => {
      const isMinor = chord.endsWith('m');
      const root = isMinor ? chord.replace('m', '') : chord;
      const idx = chromatic.indexOf(root);
      if (idx === -1) return chord;
      const newIdx = (idx + offset + 120) % 12;
      return chromatic[newIdx] + (isMinor ? 'm' : '');
    });
  };

  const applyPreset = (preset: { name: string; chords: string[]; recommendedInstruments?: string[] }) => {
    const offset = presetOffsets[preset.name] || 0;
    const chords = getTransposedChords(preset.chords, offset);
    const newBlocks: SongBlock[] = chords.map(chord => {
      const isMinor = chord.endsWith('m');
      const root = isMinor ? chord.replace('m', '') : chord;
      return {
        id: Math.random().toString(36).substr(2, 9),
        note: root,
        isMinor,
        type: 'chord',
        duration: 4,
        instruments: preset.recommendedInstruments || [...activeInstruments],
        volume: 1,
        intensity: 0.5
      };
    });
    setSongBlocks(prev => [...prev, ...newBlocks]);
  };

  const PRESETS = [
    { 
      name: 'Pop Standard', 
      chords: ['C', 'G', 'Am', 'F'], 
      label: 'I-V-vi-IV', 
      desc: 'Universal emotional resonance.', 
      category: 'Pop', 
      recommendedInstruments: ['piano', 'acoustic', 'bass'],
      details: 'The ultimate "Gold Standard" of songwriting. It creates a perfect loop of tension and release that never feels finished, encouraging repeat listening.',
      history: 'Used for decades across genres. It became a meme in the 2000s when the Axis of Awesome proved it fits hundreds of hits.',
      examples: 'Journey - Don\'t Stop Believin\', U2 - With or Without You, Alphaville - Forever Young, Beatles - Let It Be, Jason Mraz - I\'m Yours'
    },
    { 
      name: 'Andalusian Cadence', 
      chords: ['Am', 'G', 'F', 'E'], 
      label: 'i-VII-VI-V', 
      desc: 'Dark, exotic, and dramatic.', 
      category: 'Spanish', 
      recommendedInstruments: ['acoustic', 'drums'],
      details: 'Characterized by its descending bass line. The final Major chord (V) in a minor key creates a "Phrygian Dominant" sound.',
      history: 'Origins in Spanish Flamenco and classical guitar. It migrated into 60s pop and modern rock as a "troubled" or "mysterious" theme.',
      examples: 'Ray Charles - Hit the Road Jack, Dire Straits - Sultans of Swing, Muse - Resistance, Michael Jackson - Smooth Criminal, The Runaways - Cherry Bomb'
    },
    { 
      name: 'Jazz 2-5-1', 
      chords: ['Dm', 'G', 'C'], 
      label: 'ii-V-I', 
      desc: 'The smooth, perfect resolution.', 
      category: 'Jazz', 
      recommendedInstruments: ['piano', 'bass', 'drums'],
      details: 'Harmonic movement by fifths. This is the foundation of almost all Jazz standards. It provides a sophisticated sense of direction.',
      history: 'Evolved from Baroque cadences into the core of the Great American Songbook and Bebop improvisation.',
      examples: 'Miles Davis - Tune Up, Autumn Leaves, Summertime, Fly Me To The Moon, Girl From Ipanema'
    },
    { 
      name: 'Classic Rock', 
      chords: ['E', 'A', 'B', 'A'], 
      label: 'I-IV-V-IV', 
      desc: 'Raw energy and simplicity.', 
      category: 'Rock', 
      recommendedInstruments: ['electric', 'bass', 'drums'],
      details: 'Built on the three most important chords in music. It drives forward with a high-energy, rhythmic feel.',
      history: 'The DNA of rock and roll. popularized by Chuck Berry and early blues-rockers, defining the sound of the electric guitar.',
      examples: 'The Troggs - Wild Thing, Ritchie Valens - La Bamba, The Kingsmen - Louie Louie, Joan Jett - I Love Rock \'n Roll, Twisted Sister - We\'re Not Gonna Take It'
    },
    { 
      name: 'Sentimental', 
      chords: ['C', 'Am', 'F', 'G'], 
      label: 'I-vi-IV-V', 
      desc: 'Nostalgic and innocent.', 
      category: 'Ballad', 
      recommendedInstruments: ['piano', 'acoustic'],
      details: 'Known as the "50s progression". It moves from the home chord to its relative minor, creating a sweet, longing feeling.',
      history: 'Defined the Doo-wop era. Almost every slow dance song from the 1950s uses this exact pattern.',
      examples: 'Ben E. King - Stand By Me, The Police - Every Breath You Take, Grease - We Go Together, Whitney Houston - I Will Always Love You (Intro), Justin Bieber - Baby'
    },
    { 
      name: 'Pachelbel Cycle', 
      chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'], 
      label: 'I-V-vi-iii-IV-I-IV-V', 
      desc: 'Ornate and structurally perfect.', 
      category: 'Classical', 
      recommendedInstruments: ['piano'],
      details: 'A long, cascading sequence that feels like a waterfall. It is mechanically satisfying and highly stable.',
      history: 'Written by Johann Pachelbel in the late 1600s. Repurposed in the 90s and 2000s for acoustic pop ballads.',
      examples: 'Oasis - Don\'t Look Back In Anger, Coolio - C U When U Get There, Vitamin C - Graduation, Maroon 5 - Memories, Green Day - Basket Case'
    },
    { 
      name: '12-Bar Blues', 
      chords: ['A', 'A', 'A', 'A', 'D', 'D', 'A', 'A', 'E', 'D', 'A', 'E'], 
      label: 'I-IV-V Blues', 
      desc: 'The bedrock of modern music.', 
      category: 'Blues', 
      recommendedInstruments: ['electric', 'bass', 'drums'],
      details: 'A structural system rather than just a chord sequence. It follows a Call-and-Response pattern over 12 measures.',
      history: 'Born in the Mississippi Delta. It is the direct ancestor of Jazz, Rock, R&B, and Funk.',
      examples: 'BB King - The Thrill is Gone, Robert Johnson - Crossroads, Bill Haley - Rock Around the Clock, Chuck Berry - Johnny B. Goode, ZZ Top - Tush'
    },
    { 
      name: 'Royal Road', 
      chords: ['F', 'G', 'Em', 'Am'], 
      label: 'IV-V-iii-vi', 
      desc: 'Sophisticated emotional lift.', 
      category: 'Pop', 
      recommendedInstruments: ['synth', 'piano', 'drums'],
      details: 'Extremely popular in Japanese J-Pop and Anime soundtracks. It feels uplifting yet slightly bittersweet.',
      history: 'While used in Western Baroque, it became a cultural phenomenon in East Asian pop music during the 90s.',
      examples: 'Radwimps - Sparkle (Your Name), Super Mario Star Theme, Daft Punk - Get Lucky (similar vibe), Official HIGE DANdism - Pretender, LiSA - Gurenge'
    },
  ];

  const [playMode, setPlayMode] = useState<'chord' | 'tone'>('chord');

  // Studio Mixer State
  const [mixer, setMixer] = useState<Record<string, { volume: number; pan: number; muted: boolean; style?: string }>>({
    piano: { volume: 0.8, pan: -0.2, muted: false, style: 'classic' },
    acoustic: { volume: 0.7, pan: 0.2, muted: false, style: 'classic' },
    electric: { volume: 0.7, pan: 0.4, muted: false, style: 'crunch' },
    '12string': { volume: 0.6, pan: -0.4, muted: false, style: 'classic' },
    bass: { volume: 0.9, pan: 0, muted: false, style: 'classic' },
    drums: { volume: 0.8, pan: 0, muted: false, style: 'classic' },
    ukulele: { volume: 0.7, pan: 0.3, muted: false, style: 'classic' },
  });

  const handlePlayChord = (note: string, isMinor: boolean, duration: number = 1.5, isAccented?: boolean, strumMode?: 'instant' | 'arpeggio', blockInstruments?: string[], styles?: Record<string, string>) => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const chromaticScale = getChromaticScale();
    const rootBase = normalizeRoot(note);
    const rootIdx = chromaticScale.indexOf(rootBase);

    if (rootIdx !== -1) {
      const thirdOffset = isMinor ? 3 : 4;
      const fifthOffset = 7;
      const octaveOffset = 12;
      const delayFactor = strumMode === 'arpeggio' ? 0.12 : 0.03;
      
      const allInstruments = blockInstruments || activeInstruments;
      const pitchedInstruments = allInstruments.filter(inst => !['drums', 'bass'].includes(inst));
      const monoInstruments = allInstruments.filter(inst => ['drums', 'bass'].includes(inst));

      const intervals = playMode === 'chord' 
        ? [0, thirdOffset, fifthOffset, octaveOffset]
        : [0];

      // 1. Pitched voices
      if (pitchedInstruments.length > 0) {
        intervals.forEach((offset, idx) => {
          const rawIdx = rootIdx + offset;
          const noteName = chromaticScale[rawIdx % 12];
          const octave = 3 + Math.floor(rawIdx / 12);
          const finalVolume = playMode === 'chord' ? 0.65 : 1.0;
          playTone(noteName + octave, ctx.currentTime + (idx * delayFactor), duration, undefined, isAccented, pitchedInstruments, finalVolume, 0.5, styles);
        });
      }

      // 2. Mono/Rhythm instruments (Once)
      if (monoInstruments.length > 0) {
        playTone(note + '2', ctx.currentTime, duration, undefined, isAccented, monoInstruments, 1.0, 0.5, styles);
      }
    }
  };

  const stopPlayback = () => {
    stopAllSound();
  };

  const handlePlaySequence = async () => {
    if (songBlocks.length === 0) return;
    
    if (isPlaybackActive) {
      stopPlayback();
      return;
    }

    startSequencePlayback();
  };

  const startSequencePlayback = async (isLoopingInternal = false) => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    if (!isLoopingInternal) {
      stopPlayback(); // Clean slate ONLY on first start
    }
    setIsPlaybackActive(true);

    const beatDuration = 60 / bpm;
    // Increased lookahead to 0.1s for reliability across devices/loads
    let playCursorSeconds = 0.1; 
    const chromaticScale = getChromaticScale();

    songBlocks.forEach((block, i) => {
      const startTime = ctx.currentTime + playCursorSeconds;
      const blockDurationSeconds = block.duration * beatDuration;
      
      const highlightTimeout = setTimeout(() => {
        setActiveBlockId(block.id);
      }, (playCursorSeconds - 0.08) * 1000); // 80ms early for better visual sync
      playbackHighlightTimeoutsRef.current.push(highlightTimeout);

      if (block.type === 'chord') {
        const rootBase = normalizeRoot(block.note);
        const rootIdx = chromaticScale.indexOf(rootBase);

        if (rootIdx !== -1) {
          const thirdOffset = block.isMinor ? 3 : 4;
          const fifthOffset = 7;
          const delayFactor = block.strumMode === 'arpeggio' ? 0.08 : 0.02;

          // Split instruments into pitched and non-pitched
          const allInstruments = block.instruments || activeInstruments;
          const pitchedInstruments = allInstruments.filter(inst => !['drums', 'bass'].includes(inst));
          const monoInstruments = allInstruments.filter(inst => ['drums', 'bass'].includes(inst));

          // 1. Play pitched/chordal voices
          if (pitchedInstruments.length > 0) {
            [0, thirdOffset, fifthOffset, 12].forEach((offset, idx) => {
              const rawIdx = rootIdx + offset;
              const noteName = chromaticScale[rawIdx % 12];
              const octave = 3 + Math.floor(rawIdx / 12);
              playTone(
                noteName + octave, 
                startTime + (idx * delayFactor), 
                blockDurationSeconds * 1.5, // Longer decay for volume
                undefined, 
                block.isAccented, 
                pitchedInstruments,
                (block.volume ?? 1) * 0.95,
                block.intensity ?? 0.5,
                block.style
              );
            });
          }

          // 2. Play mono/rhythm instruments ONLY ONCE per block
          if (monoInstruments.length > 0) {
            playTone(
              block.note + '2', 
              startTime, 
              blockDurationSeconds, 
              undefined, 
              block.isAccented, 
              monoInstruments,
              (block.volume ?? 1) * 1.25,
              block.intensity ?? 0.5,
              block.style
            );
          }
        }
      }

      playCursorSeconds += blockDurationSeconds;

      if (i === songBlocks.length - 1) {
        const totalDurationMs = playCursorSeconds * 1000;
        
        const endTimeout = setTimeout(() => {
            if (isLoopingRef.current) {
              startSequencePlayback(true); // Loop internally WITHOUT stopPlayback
            } else {
              setIsPlaybackActive(false);
              setActiveBlockId(null);
            }
        }, totalDurationMs);
        playbackHighlightTimeoutsRef.current.push(endTimeout);
      }
    });
  };

  const handlePlayRiff = (riff: Riff) => {
    if (!riff.pattern && !riff.chords) return;
    
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Clear all pending timeouts
    playbackTimeoutsRef.current.forEach(t => clearTimeout(t));
    playbackTimeoutsRef.current = [];

    setPlayedReferenceNote({ note: riff.title, freq: 0 });

    if (riff.pattern) {
        const cleanPattern = riff.pattern.replace(/\(Riff\)|\/|resonate/g, '');
        const patternTokens = cleanPattern.split(/\s+/).filter(t => t.trim().length > 0);
        
        let tempo = 0.45; // Slightly slower default for better clarity
        if (riff.title.includes('Sandman') || riff.title.includes('Paranoid')) tempo = 0.25;
        if (riff.title.includes('Smoke') || riff.title.includes('Iron Man') || riff.title.includes('Highway')) tempo = 0.55;
        if (riff.title.includes('Stairway') || riff.title.includes('Hallelujah') || riff.title.includes('Wish')) tempo = 0.65;
        if (riff.title.includes('Elite')) tempo = 0.28;

        const loopGap = 1.0;

        [0, 1].forEach(loopIndex => {
            const loopOffset = loopIndex * (patternTokens.length * tempo + loopGap);
            patternTokens.forEach((token, i) => {
                const startTime = loopOffset + (i * tempo);
                
                if (token !== '.' && token !== '_' && token !== '-') {
                  let noteToPlay = token;
                  if (['D', 'U', 'P', 'I', 'M', 'A', 'X', 'S'].includes(token.toUpperCase())) {
                      const rootMatch = riff.chords?.split('-')[0].trim().match(/^[A-G]([#b])?/);
                      noteToPlay = rootMatch ? rootMatch[0] + '3' : 'G3';
                  }
                  playTone(noteToPlay, ctx.currentTime + startTime, 0.8, undefined, false, undefined, 1.1);
                }
                
                const t = setTimeout(() => {
                  setPlayingRiff({ id: riff.id, activeIndex: i });
                  if (loopIndex === 1 && i === patternTokens.length - 1) {
                    setPlayingRiff(null);
                  }
                }, startTime * 1000);
                playbackTimeoutsRef.current.push(t);
            });
        });
    } else if (riff.chords) {
        const chords = riff.chords.split('-').map(c => c.trim());
        const tempo = 0.8;
        const loopGap = 1.2;
        [0, 1].forEach(loopIndex => {
            const loopOffset = loopIndex * (chords.length * tempo + loopGap);
            chords.forEach((chord, i) => {
                const rootMatch = chord.match(/^[A-G]([#b])?/);
                if (rootMatch) {
                    const startTime = loopOffset + (i * tempo);
                    const isMinor = chord.toLowerCase().includes('m');
                    const note = rootMatch[0];
                    
                    // Rich chordal playback for riffs
                    const chromaticScale = getChromaticScale();
                    const rootBase = normalizeRoot(note);
                    const rootIdx = chromaticScale.indexOf(rootBase);
                    
                    if (rootIdx !== -1) {
                        const thirdOffset = isMinor ? 3 : 4;
                        const fifthOffset = 7;
                        [0, thirdOffset, fifthOffset, 12].forEach((offset, idx) => {
                            const rawIdx = rootIdx + offset;
                            const noteName = chromaticScale[rawIdx % 12];
                            const octave = 3 + Math.floor(rawIdx / 12);
                            playTone(noteName + octave, ctx.currentTime + startTime + (idx * 0.02), 1.2, undefined, false, undefined, 0.8);
                        });
                    }

                    const t = setTimeout(() => {
                      setPlayingRiff({ id: riff.id, activeIndex: i });
                      if (loopIndex === 1 && i === chords.length - 1) {
                        setPlayingRiff(null);
                      }
                    }, startTime * 1000);
                    playbackTimeoutsRef.current.push(t);
                }
            });
        });
    }
  };
  
  const handleResetDefaults = () => {
    if (window.confirm(translations[language].confirmReset)) {
      setSettings(DEFAULT_SETTINGS);
      setTheme('dark');
      setInstrument('guitar');
      setReferenceFreq(440);
      try {
        localStorage.removeItem('perotuner-settings');
      } catch (e) {
        console.warn("localStorage access denied:", e);
      }
      window.location.reload(); // Hard reset to ensure all states are clean
    }
  };

  const [settings, setSettings] = useState<StudioSettings>(() => {
    try {
      const saved = localStorage.getItem('perotuner-settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("localStorage access denied:", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Master Volume Sync Effect
  useEffect(() => {
    if (audioCtxRef.current && masterBusRef.current) {
        masterBusRef.current.gain.gain.setTargetAtTime(settings.masterVolume ?? 0.85, audioCtxRef.current.currentTime, 0.05);
    }
  }, [settings.masterVolume]);

  const targetStrings = React.useMemo(() => {
    switch (instrument) {
      case 'ukulele': return UKULELE_STRINGS;
      case '12string': return TWELVE_STRING_STRINGS;
      default: return GUITAR_STRINGS;
    }
  }, [instrument]);

  const { pitchData, isActive, start, stop } = usePitchDetection(referenceFreq, targetStrings);

  useEffect(() => {
    stopAllSound();
    if (activeView === 'tuner') {
      start();
    } else {
      stop();
    }
  }, [activeView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlaySequence();
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlaySequence]);

  useEffect(() => {
    console.log('APP: Mounted.');
    return () => stopAllSound();
  }, []);

  useEffect(() => {
    if (pitchData && Math.abs(pitchData.cents) <= 2) {
      setShowPerfectFlash(true);
      
      // Update tuned strings tracking
      const currentInstrumentStrings = getStrings();
      const matchedString = currentInstrumentStrings.find(s => 
        s.note === pitchData.note && 
        Math.abs(s.freq - pitchData.frequency) < 10 // Basic safety check
      );
      
      if (matchedString) {
        setTunedStrings(prev => {
          if (prev.includes(matchedString.label)) return prev;
          return [...prev, matchedString.label];
        });
      }

      const timer = setTimeout(() => setShowPerfectFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [pitchData?.note, pitchData?.cents, pitchData?.frequency]);

  useEffect(() => {
    setTunedStrings([]);
  }, [instrument]);

  useEffect(() => {
    try {
      localStorage.setItem('perotuner-settings', JSON.stringify(settings));
    } catch (e) {
       // Silently fail if localStorage is blocked
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.bgColor);
    // Sync body background to prevent white background on mobile zoom/scroll
    document.body.style.backgroundColor = settings.bgColor;
    document.documentElement.style.backgroundColor = settings.bgColor;
  }, [settings]);

  useEffect(() => {
    const isDark = theme === 'dark';
    const currentPresets = isDark 
      ? ['#0a0a0a', '#0f172a', '#1e1b4b', '#18181b', '#064e3b', '#2c3e50', '#000000', '#1a1c2c', '#330033'] 
      : ['#f5f2ed', '#f1f5f9', '#fafafa', '#fdf2f8', '#ecfdf5', '#fff9db', '#ffffff', '#e0f7fa', '#fce4ec'];
    
    if (currentPresets.includes(settings.bgColor)) return;
    setSettings(prev => ({ ...prev, bgColor: isDark ? '#0a0a0a' : '#f5f2ed' }));
  }, [theme]);

  const getStrings = () => {
    switch (instrument) {
      case 'ukulele': return UKULELE_STRINGS;
      case '12string': return TWELVE_STRING_STRINGS;
      default: return GUITAR_STRINGS;
    }
  };

  const instruments: { id: InstrumentCategory; label: string; icon: any }[] = [
    { id: 'guitar', label: 'Acoustic', icon: Guitar },
    { id: '12string', label: '12-String', icon: AudioWaveform },
    { id: 'ukulele', label: 'Ukulele', icon: Keyboard },
  ];

  return (
    <LanguageProvider value={{ language, setLanguage, t }}>
        {/* Success Flash */}
      <AnimatePresence>
        {showPerfectFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-emerald-500 pointer-events-none z-[100] blur-3xl transition-opacity duration-300"
          />
        )}
      </AnimatePresence>

      <div 
        className={cn(
          "min-h-screen transition-all duration-1000 font-sans selection:bg-emerald-500/30 pb-32 relative",
          theme === 'dark' ? "text-white" : "text-[#1a1a1a]"
        )}
        style={{ 
          backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f8f9fa',
          backgroundImage: theme === 'dark' 
            ? `radial-gradient(circle at 50% -10%, ${guitarColor}25 0%, transparent 70%)`
            : `radial-gradient(circle at 50% -10%, ${guitarColor}15 0%, transparent 70%)`,
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Subtle noise texture for depth */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />

      <LuthierConfig 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)}
        settings={settings}
        onUpdate={setSettings}
        onReset={handleResetDefaults}
        theme={theme}
      />

      <BlockEditorModal 
        isOpen={!!editingBlock}
        onClose={() => setEditingBlock(null)}
        block={editingBlock || { id: '', note: 'C', isMinor: false, type: 'chord', duration: 4 }}
        onSave={(updated) => {
          setSongBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));
          setEditingBlock(null);
        }}
        onDuplicate={duplicateBlock}
        onPreview={(block) => {
          if (block.type === 'chord') {
             handlePlayChord(block.note, block.isMinor, 1, block.isAccented, block.strumMode, block.instruments, block.style);
          } else {
             playTone('C4', audioCtxRef.current?.currentTime || 0, 0.1, 'pause');
          }
        }}
        accentColor={settings.accentColor}
        theme={theme}
      />

      <div className="relative flex flex-col items-center">
        {/* iOS Style Top Header */}
        <header className="w-full max-w-7xl flex flex-wrap md:flex-nowrap items-center justify-between p-4 md:p-6 gap-6 md:gap-8">
          <div className="flex flex-col items-start min-w-[120px] md:flex-1">
            <h1 className={cn(
              "text-lg font-bold tracking-tighter leading-none italic",
              theme === 'dark' ? "text-white" : "text-[#1a1a1a]"
            )}>
              PeRO<span style={{ color: settings.accentColor }}>tuner</span>
            </h1>
            <span className={cn(
              "text-[9px] uppercase tracking-[0.4em] font-medium transition-opacity",
              theme === 'dark' ? "text-white/40" : "text-black/40"
            )}>{t('profAmateur')}</span>
          </div>

          <div className="flex items-center gap-2 justify-center md:flex-1 order-last md:order-none w-full md:w-auto">
            <div className="relative">
              <button 
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                className={cn(
                  "w-11 h-9 rounded-full border flex items-center justify-center transition-all group overflow-hidden",
                  theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-black/5 border-black/5 hover:bg-black/10"
                )}
                title="Guitar Color"
              >
                <div className="flex flex-col items-center">
                   <div 
                     className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                     style={{ backgroundColor: guitarColor }}
                   />
                   <span className="text-[6px] font-black uppercase mt-0.5 opacity-40">Color</span>
                </div>
              </button>

              <AnimatePresence>
                {isColorPickerOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsColorPickerOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className={cn(
                        "absolute top-full mt-2 left-1/2 -translate-x-1/2 p-2 rounded-2xl border shadow-2xl z-50 flex gap-2 backdrop-blur-xl",
                        theme === 'dark' ? "bg-black/80 border-white/10" : "bg-white/80 border-black/10"
                      )}
                    >
                      {[
                        { name: 'Natural', color: '#4d2b1e' },
                        { name: 'Cherry', color: '#8b0000' },
                        { name: 'Black', color: '#1a1a1a' },
                        { name: 'White', color: '#f0f0f0' },
                        { name: 'Surf', color: '#9dc1ac' },
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          onClick={() => {
                            setGuitarColor(preset.color);
                            setIsColorPickerOpen(false);
                          }}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                            guitarColor === preset.color 
                              ? "border-emerald-500 scale-110" 
                              : "border-transparent opacity-60 hover:opacity-100"
                          )}
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        />
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setLanguage(prev => prev === 'de' ? 'en' : 'de')}
              className={cn(
                "w-11 h-9 rounded-full border flex items-center justify-center transition-all group overflow-hidden",
                theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-black/5 border-black/5 hover:bg-black/10"
              )}
              title={language === 'de' ? "Switch to English" : "Zu Deutsch wechseln"}
            >
              <div className="flex flex-col items-center">
                {language === 'de' ? (
                  <svg width="18" height="10" viewBox="0 0 5 3" className="shadow-sm">
                    <rect width="5" height="3" fill="#000"/>
                    <rect width="5" height="2" y="1" fill="#D00"/>
                    <rect width="5" height="1" y="2" fill="#FFCE00"/>
                  </svg>
                ) : (
                  <svg width="18" height="10" viewBox="0 0 60 30" className="shadow-sm">
                    <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                  </svg>
                )}
                <span className="text-[6px] font-black uppercase mt-0.5 opacity-40">{language}</span>
              </div>
            </button>
            <button 
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center transition-all",
                theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-black/5 border-black/5 hover:bg-black/10"
              )}
            >
              {theme === 'dark' ? <Sun size={12} className="opacity-60" /> : <Moon size={12} className="opacity-60" />}
            </button>
            <button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Simple trick to help reset visual viewport focus
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                  const content = viewport.getAttribute('content');
                  viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
                  setTimeout(() => {
                    viewport.setAttribute('content', content || 'width=device-width, initial-scale=1.0');
                  }, 100);
                }
              }}
              className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center transition-all",
                theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-black/5 border-black/5 hover:bg-black/10"
              )}
              title="Reset View"
            >
              <Maximize size={12} className="opacity-60" />
            </button>
            <button 
              onClick={() => setIsConfigOpen(true)}
              className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center transition-all",
                theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-black/5 border-black/5 hover:bg-black/10"
              )}
            >
              <Settings size={12} className="opacity-60" />
            </button>
          </div>

          <div className="flex items-center gap-4 md:flex-1 justify-end min-w-0">
            {/* Instrument Selector */}
            <div className={cn(
              "flex p-1 rounded-full border shadow-lg backdrop-blur-3xl shrink-0",
              theme === 'dark' ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"
            )}>
              {instruments.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setInstrument(item.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-black transition-all duration-300",
                    instrument === item.id 
                      ? "text-white" 
                      : theme === 'dark' ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60"
                  )}
                  style={instrument === item.id ? { 
                    backgroundColor: settings.accentColor,
                    boxShadow: `0 4px 12px ${settings.accentColor}4D`
                  } : {}}
                >
                  <item.icon size={11} />
                  <span className="lowercase first-letter:uppercase">{item.id === 'guitar' ? t('acoustic') : item.id === '12string' ? t('twelveString') : t('ukulele')}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <main className="w-full max-w-7xl px-4 md:px-8 pt-0 transition-opacity relative">
            {activeView === 'quintencirkel' && (
              <div className="flex flex-col items-center gap-12 w-full animate-in fade-in duration-500 relative">
                {/* Background Decoration for Studio Mode */}
                <div className="absolute inset-x-0 -top-24 bottom-0 -z-10 pointer-events-none overflow-hidden rounded-[60px]">
                   <GuitarStringsBackground 
                      opacity={0.15}
                      bodyColor={guitarColor}
                      showLabels={false}
                      className="opacity-40"
                      allStrings={getStrings()}
                      tunedStrings={tunedStrings}
                   />
                </div>

                {/* German Welcome & Guide (Moved to top) */}
                <div 
                  className={cn(
                    "w-full p-8 rounded-[40px] border relative overflow-hidden",
                    theme === 'dark' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50/50 border-emerald-100"
                  )}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Compass size={120} className="text-emerald-500" />
                  </div>
                  <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                          <Music size={24} />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black italic tracking-tighter leading-tight">Willkommen im Songwriting Studio</h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Dein Platz für kreative Komposition</p>
                       </div>
                    </div>
                    
                    <p className="text-sm font-medium opacity-60 leading-relaxed mb-8">
                      Erstelle professionelle Arrangements und teile sie mit deiner Band. Hier erfährst du, wie du das Studio optimal nutzt:
                    </p>
                    
                    <div className="grid sm:grid-cols-3 gap-8">
                      <div className="space-y-3">
                         <div className="flex items-center gap-2">
                            <Compass size={14} className="text-emerald-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Songwriting</h4>
                         </div>
                         <p className="text-[11px] opacity-40 leading-relaxed">
                            Nutze den <strong>Quintenzirkel</strong>, um harmonisch passende Akkorde zu finden und deiner Timeline hinzuzufügen.
                         </p>
                      </div>
                      <div className="space-y-3">
                         <div className="flex items-center gap-2">
                            <LayoutGrid size={14} className="text-blue-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Arranging</h4>
                         </div>
                         <p className="text-[11px] opacity-40 leading-relaxed">
                            Ordne Blöcke per <strong>Drag & Drop</strong>, füge Akzente, Instrumente oder Pause-Breaks für Dynamik hinzu.
                         </p>
                      </div>
                      <div className="space-y-3">
                         <div className="flex items-center gap-2">
                            <Maximize size={14} className="text-amber-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Export & Share</h4>
                         </div>
                         <p className="text-[11px] opacity-40 leading-relaxed">
                            Teile dein <strong>Lead Sheet</strong> mit deiner Gruppe, damit alle Mitglieder lokal üben oder Versionen anpassen können.
                         </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Song Arrangement - Big Tiles */}
                <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="flex items-center justify-between px-4">
                    <div className="flex flex-col">
                      <h3 className="text-xl font-black italic tracking-tighter" style={{ color: settings.accentColor }}>Song Arrangement</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Your Composition Timeline</p>
                    </div>
                  </div>
                  
                  <SongTimeline 
                    blocks={songBlocks}
                    accentColor={settings.accentColor}
                    theme={theme}
                    activeBlockId={activeBlockId}
                    onRemove={removeBlock}
                    onClearAll={() => setSongBlocks([])}
                    onUpdateDuration={updateBlockDuration}
                    onUpdateChord={updateBlockChord}
                    onUpdateSection={updateBlockSection}
                    onUpdateAccent={updateBlockAccent}
                    onUpdateStrum={updateBlockStrum}
                    onUpdateLyrics={updateBlockLyrics}
                    onUpdateInstruments={updateBlockInstruments}
                    onUpdateEffects={updateBlockEffects}
                    onReorder={setSongBlocks}
                    onEdit={(block) => setEditingBlock(block)}
                  />

                  {/* Mobile-Friendly Playback Bar below main timeline */}
                  <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md">
                     <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePlaySequence}
                            className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl group",
                              isPlaybackActive 
                                  ? "bg-red-500 text-white" 
                                  : "bg-emerald-500 text-white"
                            )}
                        >
                            {isPlaybackActive ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                        </motion.button>
                        
                        <div className="flex flex-col">
                           <span className={cn("text-[10px] font-black uppercase tracking-widest", isPlaybackActive ? "text-red-500" : "text-emerald-500")}>
                              {isPlaybackActive ? "Playing..." : "Start Song"}
                           </span>
                           <span className="text-[8px] font-bold opacity-30 uppercase">{songBlocks.length} Blocks</span>
                        </div>
                     </div>

                     <div className="flex items-center gap-2">
                        {/* Master Volume Hub */}
                        <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 group relative">
                           <Volume2 size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                           <input 
                             type="range"
                             min="0"
                             max="1"
                             step="0.01"
                             value={settings.masterVolume}
                             onChange={(e) => setSettings(prev => ({ ...prev, masterVolume: parseFloat(e.target.value) }))}
                             className="w-16 h-1 accent-emerald-500 bg-white/10 rounded-full appearance-none cursor-pointer"
                             title="Master Volume"
                           />
                        </div>

                        <button 
                          onClick={() => setIsLooping(!isLooping)}
                          className={cn(
                            "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                            isLooping 
                              ? "bg-amber-500 border-amber-500 text-white" 
                              : "bg-white/5 border-white/10 opacity-40"
                          )}
                          title="Toggle Loop"
                        >
                          <Repeat size={16} />
                        </button>
                        
                        <button 
                          onClick={() => updateBlocksWithHistory([])}
                          className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center opacity-20 hover:opacity-100 hover:text-red-400 transition-all"
                          title="Clear Song"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="h-8 w-px bg-white/10 mx-1" />

                        <div className="flex flex-col items-end">
                           <span className="text-sm font-black italic" style={{ color: settings.accentColor }}>{bpm}</span>
                           <span className="text-[7px] font-bold opacity-20 uppercase">BPM</span>
                        </div>
                     </div>
                  </div>

                  {/* History & Share Controls */}
                  <div className="flex items-center justify-center gap-6 py-2 px-6">
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={undo}
                         disabled={historyIndex <= 0}
                         className={cn(
                           "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
                           historyIndex > 0 ? "bg-white/5 text-white/60 hover:bg-white/10" : "opacity-10 cursor-not-allowed"
                         )}
                       >
                         <RotateCcw size={12} className="rotate-0" />
                         Undo
                       </button>
                       <button 
                         onClick={redo}
                         disabled={historyIndex >= history.length - 1}
                         className={cn(
                           "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
                           historyIndex < history.length - 1 ? "bg-white/5 text-white/60 hover:bg-white/10" : "opacity-10 cursor-not-allowed"
                         )}
                       >
                         <RotateCcw size={12} className="rotate-180" />
                         Redo
                       </button>
                    </div>
                    
                    <div className="h-4 w-px bg-white/5" />
                    
                    <button 
                      onClick={shareArrangement}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-500/20"
                    >
                      <Compass size={12} />
                      Share Studio Link
                    </button>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className={cn(
                    "w-full px-6 py-8 rounded-[40px] border flex flex-col gap-8 transition-all relative overflow-hidden",
                    theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"
                  )}>
                    {/* Circle of Fifths Explorer */}
                    <div className="w-full flex flex-col gap-2">
                       <CircleOfFifths 
                         onChordClick={(note, isMinor) => handlePlayChord(note, isMinor)}
                         onChordAdd={(note, isMinor) => {
                           setSongBlocks(prev => [...prev, { id: Date.now().toString() + Math.random(), note, isMinor, type: 'chord', duration: 4, instruments: activeInstruments }]);
                         }}
                         accentColor={settings.accentColor}
                         theme={theme}
                       />
                       <div className="flex justify-center -mt-4 mb-4">
                         <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSongBlocks(prev => [...prev, { id: Date.now().toString() + Math.random(), note: 'C', isMinor: false, type: 'pause', duration: 4 }]);
                            }}
                            className={cn(
                               "px-6 py-2 rounded-full flex items-center gap-2 transition-all border border-dashed",
                               theme === 'dark' ? "bg-white/[0.02] border-white/10 text-white/40 hover:bg-white/5" : "bg-black/[0.02] border-black/10 text-black/40 hover:bg-black/5"
                            )}
                          >
                            <span className="text-xl font-black italic tracking-tighter leading-none">|</span>
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Add Pause / Bar</span>
                          </motion.button>
                       </div>
                    </div>

                    <div className="h-px w-full bg-white/5" />

                    <MiniTimeline 
                      blocks={songBlocks}
                      activeBlockId={activeBlockId}
                      accentColor={settings.accentColor}
                      theme={theme}
                      isPlaying={isPlaybackActive}
                      isLooping={isLooping}
                      onPlay={handlePlaySequence}
                      onLoopToggle={() => setIsLooping(!isLooping)}
                      onBlockClick={(id) => {
                        const block = songBlocks.find(b => b.id === id);
                        if (block) {
                          setEditingBlock(block);
                          if (block.type === 'chord') {
                            handlePlayChord(block.note, block.isMinor, 1, block.isAccented, block.strumMode, block.instruments);
                            setActiveBlockId(id);
                          }
                        }
                      }}
                      onDeleteBlock={(id) => {
                        setSongBlocks(prev => prev.filter(b => b.id !== id));
                        if (activeBlockId === id) setActiveBlockId(null);
                      }}
                      onTransposeBlock={(id, delta) => {
                        setSongBlocks(prev => prev.map(b => {
                          if (b.id !== id || b.type !== 'chord') return b;
                          const scale = getChromaticScale();
                          const currentIdx = scale.indexOf(normalizeRoot(b.note));
                          if (currentIdx === -1) return b;
                          const nextIdx = (currentIdx + delta + 12) % 12;
                          return { ...b, note: scale[nextIdx] };
                        }));
                      }}
                      onToggleInstruments={(id) => {
                        setSongBlocks(prev => prev.map(b => {
                          if (b.id !== id || b.type !== 'chord') return b;
                          const current = b.instruments || [];
                          const presets = [['piano'], ['acoustic'], ['electric'], ['piano', 'bass', 'drums'], ['acoustic', 'bass', 'drums'], ['electric', 'bass', 'drums'], []];
                          const str = JSON.stringify(current.sort());
                          let nextIdx = 0;
                          for(let i=0; i<presets.length; i++) {
                            if (JSON.stringify(presets[i].sort()) === str) {
                              nextIdx = (i + 1) % presets.length;
                              break;
                            }
                          }
                          return { ...b, instruments: presets[nextIdx].length > 0 ? presets[nextIdx] : undefined };
                        }));
                      }}
                    />

                    {/* Playback & Utility Controls (Moved Below Timeline) */}
                    <div className="flex items-center justify-center gap-4 py-6 px-4 bg-white/[0.01] border-t border-white/5 mt-2">
                       {/* Reset button */}
                       <div className="flex flex-col items-center gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateBlocksWithHistory([])}
                            className={cn(
                               "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                               theme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-red-400" : "bg-black/5 border-black/10 text-black/40 hover:text-red-500"
                            )}
                            title="Clear Arrangement"
                          >
                            <Trash2 size={18} />
                          </motion.button>
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-20">Clear</span>
                       </div>

                       {/* Metronome toggle */}
                       <div className="flex flex-col items-center gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsMetronomeOpen(!isMetronomeOpen)}
                            className={cn(
                               "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                               isMetronomeOpen
                                  ? "bg-amber-500/20 border-amber-500 text-amber-500"
                                  : theme === 'dark' ? "bg-white/5 border-white/10 text-white/40" : "bg-black/5 border-black/10 text-black/40"
                            )}
                          >
                            {isMetronomeOpen ? <Bell size={18} /> : <BellOff size={18} />}
                          </motion.button>
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", isMetronomeOpen ? "text-amber-500" : "opacity-20")}>Click</span>
                       </div>

                       {/* Play/Stop Button */}
                       <div className="flex flex-col items-center gap-1.5">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePlaySequence}
                            className={cn(
                              "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-2xl group",
                              isPlaybackActive 
                                  ? "bg-red-500 text-white shadow-red-500/30" 
                                  : "bg-emerald-500 text-white shadow-emerald-500/30"
                            )}
                        >
                            <div className="relative">
                              {isPlaybackActive ? (
                                <Square size={28} fill="currentColor" />
                              ) : (
                                <Play size={28} fill="currentColor" className="ml-1" />
                              )}
                            </div>
                        </motion.button>
                        <span className={cn("text-[8px] font-black uppercase tracking-widest", isPlaybackActive ? "text-red-500" : "text-emerald-500")}>
                          {isPlaybackActive ? "Stop" : "Play"}
                        </span>
                       </div>

                       {/* Pause button (Visual placeholder for now as logic is same as stop) */}
                       <div className="flex flex-col items-center gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePlaySequence}
                            className={cn(
                               "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                               theme === 'dark' ? "bg-white/5 border-white/10 text-white/40" : "bg-black/5 border-black/10 text-black/40"
                            )}
                          >
                            <Pause size={18} fill="currentColor" />
                          </motion.button>
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-20">Pause</span>
                       </div>

                       <div className="flex flex-col items-center gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsLooping(!isLooping)}
                            className={cn(
                               "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                               isLooping
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-500"
                                  : theme === 'dark' ? "bg-white/5 border-white/10 text-white/40" : "bg-black/5 border-black/10 text-black/40"
                            )}
                          >
                            <Repeat size={18} className={cn("transition-transform duration-500", isLooping ? "rotate-90" : "")} />
                          </motion.button>
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", isLooping ? "text-emerald-500" : "opacity-20")}>Loop</span>
                       </div>

                       {/* BPM Info */}
                       <div className="flex flex-col items-center gap-1.5 ml-2">
                          <div className={cn(
                            "px-3 h-10 rounded-xl flex items-center justify-center border font-mono font-bold text-sm",
                            theme === 'dark' ? "bg-white/5 border-white/10 text-white/60" : "bg-black/5 border-black/10 text-black/60"
                          )}>
                            {bpm}
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-20">BPM</span>
                       </div>
                    </div>

                  </div>
                </div>

                {/* Master Arrangement & Playback Controller */}
                <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className={cn(
                    "w-full p-8 rounded-[40px] border flex flex-col gap-8 relative overflow-hidden",
                    theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"
                  )}>
                    <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
                      <div className="flex flex-col">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-1">Master Controller</h3>
                        <div className="flex items-center gap-3">
                           <motion.button
                             whileHover={{ scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                             onClick={handlePlaySequence}
                             className={cn(
                               "px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center gap-3 shadow-2xl",
                               isPlaybackActive ? "bg-red-500 text-white shadow-red-500/20" : "bg-emerald-500 text-white shadow-emerald-500/20"
                             )}
                           >
                             {isPlaybackActive ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}
                             {isPlaybackActive ? "Stop Playback" : "Start Sequence"}
                           </motion.button>

                           <button 
                             onClick={() => setIsLooping(!isLooping)}
                             className={cn(
                               "w-14 h-14 rounded-2xl border flex items-center justify-center transition-all",
                               isLooping 
                                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                : "bg-white/5 border-white/5 opacity-40 hover:opacity-100"
                             )}
                           >
                             <Repeat size={18} className={isLooping ? "animate-spin-slow" : ""} />
                           </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 opacity-40">
                          <Clock size={12} className="opacity-40" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Global Tempo</span>
                        </div>
                        <div className="flex items-center gap-4 bg-black/20 p-2 rounded-2xl border border-white/5">
                           <button 
                              onClick={() => setBpm(b => Math.max(60, b - 5))}
                              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10"
                           >
                              <Minus size={12} />
                           </button>
                           <div className="flex flex-col items-center min-w-[60px]">
                              <span className="text-2xl font-black italic tracking-tighter" style={{ color: settings.accentColor }}>{bpm}</span>
                              <span className="text-[8px] font-bold opacity-30 uppercase">BPM</span>
                           </div>
                           <button 
                              onClick={() => setBpm(b => Math.min(200, b + 5))}
                              className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10"
                           >
                              <Plus size={12} />
                           </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => addBlock('', false, 'pause')}
                          className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-white/10 transition-all"
                        >
                          Insert Break
                        </button>
                        <button
                          onClick={() => setSongBlocks([])}
                          className="px-6 py-4 rounded-2xl border border-red-500/10 text-red-500/40 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {activeBlockId && (
                      <div className="pointer-events-none">
                        <div className="pointer-events-auto">
                          <ChordKeyboard 
                            note={songBlocks.find(b => b.id === activeBlockId)?.note || 'C'}
                            isMinor={songBlocks.find(b => b.id === activeBlockId)?.isMinor || false}
                            theme={theme}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hero Section: Circle of Fifths & Studio Mixer */}
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mt-12 pb-24 border-t border-white/5 pt-12">
                  <div className="lg:col-span-12 xl:col-span-5 flex flex-col items-center gap-10">
                    {/* Play Mode Toggle */}
                    <div className="flex p-1.5 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/5 shadow-2xl relative z-10 scale-90 sm:scale-100">
                      <button 
                        onClick={() => setPlayMode('tone')}
                        className={cn(
                          "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2",
                          playMode === 'tone' ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "text-white/20 hover:text-white/40"
                        )}
                      >
                        <Zap size={14} className={playMode === 'tone' ? "text-emerald-500" : ""} />
                        Tones
                      </button>
                      <button 
                        onClick={() => setPlayMode('chord')}
                        className={cn(
                          "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2",
                          playMode === 'chord' ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "text-white/20 hover:text-white/40"
                        )}
                      >
                        <Music size={14} className={playMode === 'chord' ? "text-emerald-500" : ""} />
                        Chords
                      </button>
                    </div>

                    <div className="relative w-full aspect-square max-w-[450px]">
                      <CircleOfFifths 
                        activeNote={pitchData?.note ?? null}
                        accentColor={settings.accentColor} 
                        theme={theme}
                        language={language}
                        isLarge={true}
                        onNoteSelect={(note, isMinor) => {
                          addBlock(note, isMinor);
                        }}
                        onPlayChord={(note, isMinor) => {
                          handlePlayChord(note, isMinor);
                        }}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-12 xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="flex flex-col gap-8">
                      <div className="flex flex-col gap-4 w-full">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-[10px] uppercase tracking-[0.4em] font-black opacity-30">Studio Engine</h3>
                          <div className="flex items-center gap-1.5 grayscale opacity-40">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[8px] font-bold uppercase tracking-tighter">Live</span>
                          </div>
                        </div>
                      
                      {/* Ultra Compact Instrument Row */}
                      <div className="flex items-center justify-between w-full gap-1 sm:gap-2">
                        {[
                          { id: 'acoustic', label: 'Aco', icon: Guitar },
                          { id: 'electric', label: 'Ele', icon: Zap },
                          { id: 'bass', label: 'Bass', icon: AudioWaveform },
                          { id: 'piano', label: 'Piano', icon: Keyboard },
                          { id: 'synth', label: 'Synth', icon: Sparkles },
                          { id: 'drums', label: 'Beat', icon: Drum },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setActiveInstruments(prev => 
                                prev.includes(s.id) 
                                  ? (prev.length > 1 ? prev.filter(i => i !== s.id) : prev) 
                                  : [...prev, s.id]
                              );
                            }}
                            className={cn(
                              "relative group px-1 py-3 rounded-xl border transition-all duration-300 overflow-hidden text-center flex-1",
                              activeInstruments.includes(s.id) 
                                ? "bg-white/[0.08] border-white/20 shadow-xl scale-[1.02] z-10" 
                                : "bg-black/20 border-white/5 opacity-40 hover:opacity-100 hover:bg-white/5"
                            )}
                          >
                            <div className="flex flex-col items-center gap-2 relative z-10">
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300",
                                activeInstruments.includes(s.id) 
                                  ? "bg-white text-black shadow-lg" 
                                  : "bg-white/5 text-white/40"
                              )}
                              style={activeInstruments.includes(s.id) ? { backgroundColor: settings.accentColor, color: '#fff' } : {}}
                              >
                                <s.icon size={12} />
                              </div>
                              <span className="text-[7px] font-black uppercase tracking-tighter">{s.label}</span>
                            </div>

                            {/* Active Pip */}
                            {activeInstruments.includes(s.id) && (
                              <div className="absolute top-1 right-1 w-1 h-1 rounded-full" style={{ backgroundColor: settings.accentColor }} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <StudioMixer 
                      mixer={mixer}
                      onUpdate={(id, updates) => setMixer(prev => ({
                        ...prev,
                        [id]: { ...prev[id], ...updates }
                      }))}
                      onTest={handleTestInstrument}
                      theme={theme}
                    />
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs uppercase tracking-[0.3em] font-black opacity-40">Next Harmonic Steps</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {getSuggestions(songBlocks[songBlocks.length - 1]).length > 0 ? (
                        getSuggestions(songBlocks[songBlocks.length - 1]).map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => addBlock(s.note, s.isMinor)}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.01] active:scale-95 group",
                              theme === 'dark' ? "bg-white/5 border-white/5 hover:border-white/20" : "bg-black/5 border-black/5 hover:border-black/20"
                            )}
                          >
                            <div className="flex flex-col text-left">
                              <span className="text-[10px] uppercase tracking-widest font-black opacity-40 group-hover:opacity-100 transition-opacity">{s.label}</span>
                              <span className="text-lg font-black italic" style={{ color: settings.accentColor }}>{s.note}{s.isMinor ? 'm' : ''}</span>
                            </div>
                            <Plus size={16} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))
                      ) : (
                        <div className="p-8 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-2">
                           <Sparkles size={20} className="opacity-20" />
                           <p className="text-[10px] uppercase tracking-widest font-black opacity-40 leading-relaxed">
                              Select a chord on the circle<br />to see harmonic suggestions
                           </p>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mixer / Composition Tools */}
                <div className="w-full max-w-7xl border-t border-white/5 pt-12 flex flex-col gap-12">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                    {/* Mixer Left */}
                    <div className="xl:col-span-5 flex flex-col gap-8">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-xs uppercase tracking-[0.3em] font-black opacity-40">Studio Mixer</h3>
                          <p className="text-[9px] opacity-20 font-bold uppercase">Signal Matrix</p>
                        </div>
                        
                        {soloInstrument && (
                          <button 
                            onClick={() => setSoloInstrument(null)}
                            className="w-fit px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest text-amber-500 animate-pulse"
                          >
                            Solo Active: {soloInstrument} (Clear)
                          </button>
                        )}
                        
                        <div className="flex flex-wrap gap-3">
                          {[
                            { id: 'acoustic', label: 'Acoustic', icon: Guitar },
                            { id: 'electric', label: 'Electric', icon: Zap },
                            { id: 'bass', label: 'Bass Guitar', icon: AudioWaveform },
                            { id: 'piano', label: 'Grand Piano', icon: Keyboard },
                            { id: 'synth', label: 'Studio Synth', icon: Sparkles },
                            { id: 'drums', label: 'Rhythm Kit', icon: Drum },
                          ].map(instr => (
                            <div 
                              key={instr.id}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300",
                                activeInstruments.includes(instr.id) 
                                  ? "bg-white/[0.03] border-white/10" 
                                  : "opacity-10 grayscale blur-[1px]"
                              )}
                            >
                                <instr.icon size={14} className={activeInstruments.includes(instr.id) ? "text-emerald-500" : ""} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{instr.label}</span>
                                {activeInstruments.includes(instr.id) && (
                                  <button 
                                  onClick={() => setSoloInstrument(soloInstrument === instr.id ? null : instr.id)}
                                  className={cn(
                                    "ml-2 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                                    soloInstrument === instr.id 
                                      ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                      : "border-white/10 opacity-30 hover:opacity-100 hover:border-white/30"
                                  )}
                                  >
                                    Solo
                                  </button>
                                )}
                            </div>
                          ))}
                        </div>
                    </div>

                    {/* Transpose Right */}
                    <div className="xl:col-span-7 flex flex-col gap-8">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-xs uppercase tracking-[0.3em] font-black opacity-40">Composition Tools</h3>
                        </div>
                        <div className="flex gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/5">
                          <button 
                            onClick={() => transposeSong(-1)}
                            className="px-4 py-2 rounded-xl hover:bg-white/10 transition-all text-[9px] uppercase tracking-widest font-black flex items-center gap-2"
                          >
                             <Minus size={12}/>
                             Transpose -
                          </button>
                          <div className="w-px h-6 bg-white/5 mx-1" />
                          <button 
                            onClick={() => transposeSong(1)}
                            className="px-4 py-2 rounded-xl hover:bg-white/10 transition-all text-[9px] uppercase tracking-widest font-black flex items-center gap-2"
                          >
                             <Plus size={12}/>
                             Transpose +
                          </button>
                        </div>
                      </div>

                      <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/5 flex items-center justify-between gap-8">
                        <div className="flex flex-col gap-2">
                           <h4 className="text-xl font-black italic tracking-tighter uppercase">Harmonic Transposition</h4>
                           <p className="text-[10px] opacity-40 leading-relaxed max-w-sm">
                             Shift the entire sequence by semitones while maintaining the relative harmonic relationships between chords.
                           </p>
                        </div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-4xl font-black italic text-emerald-500">±12</span>
                           <span className="text-[10px] font-black opacity-20 uppercase tracking-widest">Octave Range</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-8 pb-32">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xl font-black uppercase tracking-tighter italic">Pro-Level Progressions</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Genre blueprints for instant inspiration</p>
                      </div>
                      <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black opacity-40 uppercase tracking-[0.2em]">Tap to Apply</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
                       {PRESETS.map((p) => {
                         const isFlipped = flippedPresets.includes(p.name);
                         const offset = presetOffsets[p.name] || 0;
                         const transposedChords = getTransposedChords(p.chords, offset);
                         
                         return (
                           <div key={p.name} className="relative h-64 sm:h-72 [perspective:1000px] group">
                             <motion.div
                               className="relative w-full h-full [transform-style:preserve-3d]"
                               animate={{ rotateY: isFlipped ? 180 : 0 }}
                               transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
                             >
                               {/* Front Face */}
                               <div className="absolute inset-0 [backface-visibility:hidden]">
                                 <div
                                   onClick={() => applyPreset(p)}
                                   className={cn(
                                     "flex flex-col text-left p-5 w-full h-full rounded-3xl border transition-all hover:bg-white/[0.08] active:scale-[0.98] group/card relative overflow-hidden cursor-pointer",
                                     theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                                   )}
                                 >
                                   <div className="flex items-center justify-between mb-4 w-full">
                                     <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover/card:opacity-100 transition-opacity" style={theme === 'dark' ? { color: settings.accentColor } : {}}>{p.label}</span>
                                     <div className="flex gap-1.5 items-center">
                                       <div className="flex bg-white/10 rounded-xl p-1 border border-white/5 shadow-sm">
                                          <button onClick={(e) => handleTransposePreset(e, p.name, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"><Minus size={12}/></button>
                                          <div className="px-2 text-[10px] font-black flex items-center min-w-[24px] justify-center">{offset > 0 ? `+${offset}` : offset}</div>
                                          <button onClick={(e) => handleTransposePreset(e, p.name, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"><Plus size={12}/></button>
                                       </div>
                                       <button 
                                         onClick={(e) => toggleFlip(e, p.name)}
                                         className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all z-10 shadow-sm"
                                       >
                                         <Info size={14} />
                                       </button>
                                     </div>
                                   </div>
                                   <span className="text-xl font-black tracking-tighter mb-1 leading-tight">{p.name}</span>
                                   <p className="text-[11px] opacity-50 font-medium leading-normal mb-4">{p.desc}</p>
                                   
                                   {/* Chord Preview */}
                                   <div className="flex flex-wrap gap-1.5 mb-5">
                                     {transposedChords.slice(0, 4).map((c, i) => (
                                       <div key={i} className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black shadow-sm">{c}</div>
                                     ))}
                                     {transposedChords.length > 4 && <div className="text-[10px] font-black opacity-30 flex items-center px-1">...</div>}
                                   </div>

                                   <div className="mt-auto pt-4 border-t border-white/5 space-y-1.5">
                                      <h5 className="text-[8px] font-bold uppercase opacity-30 tracking-widest">Notable Examples</h5>
                                      <p className="text-[10px] font-bold leading-tight opacity-70 line-clamp-2 italic">{p.examples}</p>
                                   </div>

                                   <div className="absolute -bottom-2 -right-2 opacity-0 group-hover/card:opacity-10 transition-all group-hover:scale-110">
                                     <Music size={60} />
                                   </div>
                                 </div>
                               </div>

                               {/* Back Face (Details) */}
                               <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                 <div className={cn(
                                   "flex flex-col text-left p-6 w-full h-full rounded-3xl border relative overflow-hidden",
                                   theme === 'dark' ? "bg-[#0a0a0a] border-emerald-500/20 shadow-[inset_0_0_40px_rgba(16,185,129,0.05)]" : "bg-emerald-50 border-emerald-100"
                                 )}>
                                   <div className="flex items-center justify-between mb-5">
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">The Blueprint</span>
                                      <button 
                                        onClick={(e) => toggleFlip(e, p.name)}
                                        className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all z-10"
                                      >
                                        <RotateCcw size={14} />
                                      </button>
                                   </div>

                                   <div className="flex flex-col gap-4 overflow-y-auto pr-2 hide-scrollbar">
                                      <div className="space-y-1.5">
                                        <h5 className="text-[8px] font-black uppercase opacity-30 tracking-widest">Why it works</h5>
                                        <p className="text-[11px] font-medium leading-relaxed opacity-90">{p.details}</p>
                                      </div>
                                      <div className="space-y-1.5 border-t border-white/5 pt-4">
                                        <h5 className="text-[8px] font-black uppercase opacity-30 tracking-widest">Legacy</h5>
                                        <p className="text-[11px] font-medium leading-relaxed opacity-80 italic">{p.history}</p>
                                      </div>
                                      <div className="space-y-1.5 border-t border-white/5 pt-4">
                                        <h5 className="text-[8px] font-black uppercase opacity-30 tracking-widest">Key Songs</h5>
                                        <p className="text-[10px] font-black tracking-tight text-emerald-500 leading-tight">{p.examples}</p>
                                      </div>
                                   </div>
                                 </div>
                               </div>
                             </motion.div>
                           </div>
                         );
                       })}
                    </div>
                  </div>

                  {/* Composition Controls */}
                  <div className="flex flex-col items-center gap-10 mt-12 pb-24">
                  </div>
 </div>

                  {/* Secondary Alignment Wheel */}
                  <div className="w-full h-px bg-white/5 my-4" />
                  <div className="flex flex-col items-center gap-6 py-8">
                     <div className="flex flex-col items-center gap-2">
                        <h3 className="text-[10px] uppercase tracking-[0.3em] font-black opacity-40">Quick-Add Assistant</h3>
                        <p className="text-[9px] opacity-20 italic">Tap to instantly add to the end of your arrangement</p>
                     </div>
                     <div className="w-full max-w-[320px] aspect-square">
                        <CircleOfFifths 
                          activeNote={pitchData?.note ?? null}
                          accentColor={settings.accentColor} 
                          theme={theme}
                          onNoteSelect={(note, isMinor) => addBlock(note, isMinor)}
                          onPlayChord={handlePlayChord}
                        />
                     </div>
                  </div>
                </div>

                {/* Direct Entry & Sharing */}
                <div className="w-full max-w-7xl border-t border-white/5 pt-12 flex flex-col gap-12 mb-32">
                   <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                     <div className="flex flex-col gap-6 p-8 rounded-[3rem] bg-white/[0.02] border border-white/5">
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xl font-black italic uppercase tracking-tighter">Transcription Matrix</h3>
                          <p className="text-[10px] opacity-40 italic">Bulk-add chords or copy your composition for band members.</p>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          <div className="flex gap-2 p-3 rounded-[2rem] border border-white/10 bg-white/5 focus-within:border-emerald-500/50 transition-all shadow-inner">
                            <input 
                              type="text"
                              placeholder="Paste chord sequence (e.g. C G Am F)..."
                              value={playbackString}
                              onChange={(e) => setPlaybackString(e.target.value)}
                              className="flex-1 bg-transparent border-none outline-none px-4 py-3 font-mono text-sm placeholder:opacity-20"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const chords = playbackString.split(/[\s,]+/).filter(c => c.trim());
                                  chords.forEach(c => {
                                    const isMinor = c.includes('m');
                                    const root = c.replace('m', '');
                                    addBlock(root, isMinor);
                                  });
                                  setPlaybackString('');
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const chords = playbackString.split(/[\s,]+/).filter(c => c.trim());
                                chords.forEach(c => {
                                  const isMinor = c.includes('m');
                                  const root = c.replace('m', '');
                                  addBlock(root, isMinor);
                                });
                                setPlaybackString('');
                              }}
                              className="px-10 py-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-400 transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20"
                            >
                              Add to Studio
                            </button>
                          </div>
                        </div>
                                         <div className="flex flex-col gap-6 p-8 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/10 justify-center">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white">
                               <Share2 size={24} />
                            </div>
                            <div className="flex flex-col">
                               <h3 className="text-xl font-black italic tracking-tighter uppercase">Snapshot Studio</h3>
                               <p className="text-[10px] opacity-40">Generate a persistent link for this arrangement.</p>
                            </div>
                        </div>
                        <button
                          onClick={shareArrangement}
                          className="w-full py-5 rounded-3xl bg-white/5 border border-white/10 text-emerald-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                        >
                           <Compass size={16} />
                           Generate Arrangement Link
                        </button>
                     </div>
                   </div>

                   <div className="flex justify-center mt-4">
                      <button
                        onClick={() => {
                          const text = songBlocks.map(b => {
                             const section = b.section ? `\n[${b.section.toUpperCase()}]\n` : "";
                             const chord = b.type === 'pause' ? '|' : (b.note + (b.isMinor ? 'm' : ''));
                            const lyric = b.lyrics ? ` (${b.lyrics})` : "";
                            return `${section}${chord}${lyric}`;
                          }).join(" ");
                          navigator.clipboard.writeText(text.trim());
                          alert('Lead Sheet Copied! (Lyrics & Sections included)');
                        }}
                        className="flex items-center gap-3 px-8 py-4 rounded-full border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all active:scale-95 group"
                      >
                         <Languages size={14} className="text-emerald-500 group-hover:rotate-12 transition-transform" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Copy for Band Members</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tuner Shortcut */}
                <div className="w-full flex justify-center py-12">
                   <button 
                    onClick={() => setActiveView('tuner')}
                    className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 hover:border-emerald-500/50 transition-all group"
                   >
                     <Activity size={16} className="text-emerald-500 group-hover:animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">Switch to High-Precision Tuner</span>
                   </button>
                </div>

                {/* Mini Circle Bottom UI */}
                <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end gap-4">
                    {isMiniWheelOpen && (
                      <div
                        className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 shadow-2xl scale-75 origin-bottom-right animate-in fade-in slide-in-from-bottom-5 duration-300"
                      >
                          <CircleOfFifths 
                            activeNote={pitchData?.note ?? null}
                            accentColor={settings.accentColor} 
                            theme={theme}
                            onNoteSelect={(note, isMinor) => addBlock(note, isMinor)}
                            onPlayChord={handlePlayChord}
                          />
                      </div>
                    )}
                  
                  <button
                    onClick={() => setIsMiniWheelOpen(!isMiniWheelOpen)}
                    className={cn(
                      "w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group border-2 border-white/20",
                      isMiniWheelOpen ? "bg-white text-black" : "bg-emerald-500 text-white"
                    )}
                    style={!isMiniWheelOpen ? { backgroundColor: settings.accentColor } : {}}
                  >
                    {isMiniWheelOpen ? <Zap size={24} className="animate-pulse" /> : <Plus size={24} className="group-hover:rotate-90 transition-transform" />}
                  </button>
                </div>
              </div>
            )}

            {activeView === 'tuner' && (
              <div className="flex flex-col items-center relative animate-in fade-in duration-500">
                <GuitarStringsBackground 
                  allStrings={getStrings()} 
                  tunedStrings={tunedStrings} 
                  activeNote={pitchData?.note}
                  activeCents={pitchData?.cents}
                  activeFreq={pitchData?.frequency}
                  targetFreq={pitchData?.targetFreq}
                  bodyColor={guitarColor}
                  className="opacity-60 top-[-100px] bottom-0"
                />
 
                {/* Tuner View Content */}

                <div className={cn(
                   "w-full flex flex-col items-center",
                   settings.layoutMode === 'horizontal' ? "lg:flex-row lg:items-start lg:justify-center lg:gap-20" : ""
                )}>
                  {/* Control Hub */}
                  <div className={cn(
                    "flex flex-col items-center gap-8",
                    settings.layoutMode === 'horizontal' ? "lg:pt-20" : ""
                  )}>
                    <div className="flex flex-col items-center gap-1 mb-2">
                       <h2 className={cn(
                         "text-2xl font-black italic tracking-tighter uppercase",
                         theme === 'dark' ? "text-white" : "text-black"
                       )}>
                         {instruments.find(i => i.id === instrument)?.label}
                       </h2>
                       <div className="h-1 w-12 rounded-full" style={{ backgroundColor: settings.accentColor }} />
                    </div>

                    {/* Metronome Overlay */}
                      {isMetronomeOpen && (
                        <div
                          className="w-full overflow-hidden mb-4 animate-in fade-in duration-300"
                        >
                          <div className={cn(
                            "rounded-[2.5rem] border p-2",
                            theme === 'dark' ? "bg-emerald-950/20 border-white/5" : "bg-white border-black/5 shadow-2xl"
                          )}>
                            <Metronome theme={theme} accentColor={settings.accentColor} />
                          </div>
                        </div>
                      )}
                    <div className="flex items-center gap-6 sm:gap-12">
                      {/* Signal Strength Improvement */}
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border",
                          theme === 'dark' ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5"
                        )}>
                          <div className="flex flex-col-reverse gap-0.5 w-6 h-6 items-center justify-center">
                            {[1, 2, 3, 4].map(idx => (
                              <div 
                                key={idx} 
                                className="w-4 h-0.5 rounded-full transition-colors duration-200"
                                style={{ 
                                  backgroundColor: isActive && idx <= 3 ? settings.accentColor : 'rgba(128,128,128,0.2)' 
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-[7px] uppercase tracking-widest font-black opacity-30">{t('signal')}</span>
                      </div>

                      {/* 432Hz Button */}
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => setReferenceFreq(432)}
                          className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 border relative overflow-hidden",
                            referenceFreq === 432 
                              ? "shadow-[0_0_20px_rgba(0,0,0,0.1)]" 
                              : theme === 'dark' ? "bg-white/5 border-white/5 opacity-40 hover:opacity-100" : "bg-black/5 border-black/5 opacity-40 hover:opacity-100"
                          )}
                          style={referenceFreq === 432 ? { 
                            backgroundColor: `${settings.accentColor}1A`, 
                            borderColor: `${settings.accentColor}4D`,
                            boxShadow: `inset 0 0 15px ${settings.accentColor}1A, 0 8px 24px -8px ${settings.accentColor}4D`
                          } : {}}
                        >
                          <span className={cn(
                            "text-[10px] sm:text-xs font-black tracking-tighter transition-colors",
                            referenceFreq === 432 ? "" : theme === 'dark' ? "text-white" : "text-black"
                          )} style={referenceFreq === 432 ? { color: settings.accentColor } : {}}>432</span>
                          {referenceFreq === 432 && (
                            <div 
                              className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{ background: `linear-gradient(135deg, ${settings.accentColor}, transparent)` }}
                            />
                          )}
                        </button>
                        <span className={cn(
                          "text-[8px] uppercase tracking-widest font-bold font-mono transition-opacity whitespace-nowrap",
                          referenceFreq === 432 ? "opacity-100" : "opacity-20"
                        )} style={referenceFreq === 432 ? { color: settings.accentColor } : {}}>
                          {t('healing')}
                        </span>
                      </div>

                       {/* Primary Mic Toggle */}
                      <div className="flex flex-col items-center gap-4">
                        <button
                          onClick={isActive ? stop : start}
                          className={cn(
                            "group relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-500",
                            isActive 
                              ? "scale-110" 
                              : theme === 'dark' 
                                ? "bg-white/5 border border-white/5 hover:border-emerald-500/50 shadow-xl"
                                : "bg-black/5 border border-black/5 hover:border-emerald-500/50 shadow-lg"
                          )}
                          style={isActive ? { backgroundColor: '#10b981', boxShadow: `0 0 50px #10b98166` } : {}}
                        >
                          {isActive && (
                            <div
                              className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse"
                            />
                          )}
                          {isActive ? (
                            <Mic size={32} className="text-white relative z-10" />
                          ) : (
                            <MicOff size={32} className={cn(
                              "transition-all duration-300 relative z-10",
                              theme === 'dark' ? "text-white/20" : "text-black/20", 
                              "group-hover:text-emerald-500/80"
                            )} />
                          )}
                        </button>
                        <span className={cn(
                          "text-[9px] uppercase tracking-[0.2em] font-black transition-all",
                          isActive ? "text-emerald-500 animate-pulse" : "opacity-30"
                        )}>
                          {isActive ? t('listening') : t('startMic')}
                        </span>
                      </div>

                       {/* 440Hz Button */}
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => setReferenceFreq(440)}
                          className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 border relative overflow-hidden",
                            referenceFreq === 440
                              ? "shadow-[0_0_20px_rgba(0,0,0,0.1)]" 
                              : theme === 'dark' ? "bg-white/5 border-white/5 opacity-40 hover:opacity-100" : "bg-black/5 border-black/5 opacity-40 hover:opacity-100"
                          )}
                          style={referenceFreq === 440 ? { 
                            backgroundColor: `${settings.accentColor}1A`, 
                            borderColor: `${settings.accentColor}4D`,
                            boxShadow: `inset 0 0 15px ${settings.accentColor}1A, 0 8px 24px -8px ${settings.accentColor}4D`
                          } : {}}
                        >
                          <span className={cn(
                            "text-[10px] sm:text-xs font-black tracking-tighter transition-colors",
                            referenceFreq === 440 ? "" : theme === 'dark' ? "text-white" : "text-black"
                          )} style={referenceFreq === 440 ? { color: settings.accentColor } : {}}>440</span>
                          {referenceFreq === 440 && (
                            <div 
                              className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{ background: `linear-gradient(135deg, ${settings.accentColor}, transparent)` }}
                            />
                          )}
                        </button>
                        <span className={cn(
                          "text-[8px] uppercase tracking-widest font-bold font-mono transition-opacity whitespace-nowrap",
                          referenceFreq === 440 ? "opacity-100" : "opacity-20"
                        )} style={referenceFreq === 440 ? { color: settings.accentColor } : {}}>
                          {t('standard')}
                        </span>
                      </div>

                      {/* Metronome Toggle improvement */}
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => setIsMetronomeOpen(!isMetronomeOpen)}
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border",
                            isMetronomeOpen 
                              ? "shadow-lg bg-emerald-500/10 border-emerald-500/30" 
                              : theme === 'dark' ? "bg-white/5 border-white/5 opacity-40 hover:opacity-100" : "bg-black/5 border-black/5 opacity-40 hover:opacity-100"
                          )}
                        >
                          <Clock size={16} className={cn(isMetronomeOpen ? "text-emerald-500" : "text-gray-400")} />
                        </button>
                        <span className={cn(
                          "text-[8px] uppercase tracking-widest font-bold font-mono transition-opacity whitespace-nowrap",
                          isMetronomeOpen ? "opacity-100" : "opacity-20"
                        )} style={isMetronomeOpen ? { color: settings.accentColor } : {}}>
                          {t('clock')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visualization Station */}
                  <section className={cn(
                    "flex flex-col items-center gap-8 w-full max-w-4xl",
                    settings.layoutMode === 'horizontal' ? "lg:max-w-2xl" : "mt-6"
                  )}>
                    <div className="w-full flex flex-col items-center gap-2">
                      <NeedleBar 
                        cents={pitchData?.cents ?? 0} 
                        active={!!pitchData} 
                        theme={theme} 
                        currentNote={pitchData?.note}
                        chromaticNote={pitchData?.chromaticNote}
                        amplitude={pitchData?.amplitude}
                      />
                    </div>
                    
                    <div className="relative group">
                      <GuitarHub 
                        currentNote={pitchData?.note ?? null} 
                        chromaticNote={pitchData?.chromaticNote}
                        playedNote={playedReferenceNote?.note}
                        playedOctave={playedReferenceNote?.octave}
                        playingRiff={playingRiff}
                        frequency={pitchData?.frequency ?? 0}
                        amplitude={pitchData?.amplitude ?? 0}
                        cents={pitchData?.cents ?? 0} 
                        referenceA={referenceFreq}
                        theme={theme}
                        strings={getStrings()}
                        activeInstruments={activeInstruments}
                        onPlayChord={handlePlayChord}
                        customColors={{
                          accent: settings.accentColor,
                          glow: `${settings.accentColor}4D`,
                          body: guitarColor
                        }}
                        isTunerMode={true}
                      />
                    </div>
                  </section>
                </div>

                <div className="mt-10 w-full flex flex-col items-center gap-6 border-t border-white/5 pt-8">
                  <div className="flex items-center gap-3">
                    <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: `${settings.accentColor}4D` }} />
                    <h3 className={cn(
                      "text-[10px] uppercase tracking-[0.3em] transition-opacity font-bold",
                      theme === 'dark' ? "opacity-40" : "opacity-60"
                    )}>
                      {instrument === '12string' ? t('twelveString') : (instrument === 'ukulele' ? t('ukulele') : t('guitar'))} {t('tuningReference')}
                    </h3>
                    <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: `${settings.accentColor}4D` }} />
                  </div>

                  {/* Tuning Mnemonic Support - Reference Section Version */}
                  <div 
                    onClick={() => setMnemonicIdx((mnemonicIdx + 1) % EADGBE_MNEMONICS.length)}
                    className="flex flex-col items-center gap-1 group cursor-pointer active:scale-95 transition-transform max-w-[300px] mb-2"
                  >
                    <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Languages size={10} className="text-emerald-500" />
                      <span className="text-[9px] uppercase font-bold text-emerald-500/60 tracking-widest">
                        {EADGBE_MNEMONICS[mnemonicIdx].lang}
                      </span>
                    </div>
                    <p className={cn(
                      "text-[11px] uppercase tracking-[0.15em] font-black text-center transition-all duration-500 leading-relaxed",
                      theme === 'dark' ? "text-white/40 group-hover:text-emerald-400" : "text-black/40 group-hover:text-emerald-600"
                    )}>
                      {EADGBE_MNEMONICS[mnemonicIdx].phrase}
                    </p>
                  </div>

                  <ToneReference 
                    referenceA={referenceFreq} 
                    theme={theme} 
                    notes={getStrings()} 
                    accentColor={settings.accentColor}
                    onNoteTrigger={setPlayedReferenceNote}
                    onPlay={(note, oct) => playTone(note + oct, audioCtxRef.current?.currentTime || 0, 3.5, 'acoustic', true, undefined, 2.8)}
                  />

                  {/* Circle of Fifths below Reference */}
                  <div className="mt-12 w-full max-w-[450px]">
                    <div className="flex flex-col items-center gap-2 mb-8">
                      <h3 className={cn(
                        "text-[10px] uppercase tracking-[0.3em] font-bold opacity-40",
                        theme === 'dark' ? "text-white" : "text-black"
                      )}>
                        {t('circleOfFifths')}
                      </h3>
                      <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: `${settings.accentColor}4D` }} />
                    </div>
                    <div className="relative w-full aspect-square px-4">
                      <CircleOfFifths 
                        activeNote={pitchData?.note ?? null}
                        accentColor={settings.accentColor} 
                        theme={theme}
                        language={language}
                        isLarge={true}
                        onPlayChord={(note, isMinor) => {
                          handlePlayChord(note, isMinor);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Discovery Section */}
                <div className="w-full mt-24">
                   <RiffLibrary 
                    theme={theme} 
                    category="all" 
                    onPlayRiff={handlePlayRiff}
                    playingRiff={playingRiff}
                    onCategoryChange={setInstrument}
                    accentColor={settings.accentColor}
                   />
                </div>

                <div className="w-full">
                  <FeedbackSection 
                    theme={theme} 
                    accentColor={settings.accentColor} 
                  />
                </div>
              </div>
            )}

            {activeView === 'theory' && (
              <div className="animate-in fade-in duration-500">
                <TheoryView 
                  currentNote={theoryRoot || pitchData?.note || null} 
                  theme={theme} 
                  accentColor={settings.accentColor} 
                  isActive={isActive}
                  onStartMic={start}
                  onStopMic={stop}
                  onPlayChord={handlePlayChord}
                  onPlayNote={(note) => {
                    const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
                    if (!audioCtxRef.current) audioCtxRef.current = ctx as AudioContext;
                    // Update theory root if we click a note and mic is not active or no note detected
                    const noteName = note.replace(/[0-9]/g, '');
                    setTheoryRoot(noteName);
                    playTone(note, (audioCtxRef.current as AudioContext).currentTime, 1.2, undefined, true, undefined, 1.2);
                  }}
                  tunedStrings={tunedStrings}
                  allStrings={getStrings()}
                  guitarColor={guitarColor}
                />
              </div>
            )}

            {activeView === 'metronome' && (
              <div className="flex flex-col items-center animate-in fade-in duration-500">
                <div className="flex flex-col items-center gap-2 mb-8">
                  <h2 className="text-2xl font-bold tracking-tight">{t('studioTempo')}</h2>
                  <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">{t('precisionTiming')}</p>
                </div>
                <Metronome theme={theme} accentColor={settings.accentColor} />
              </div>
            )}

            {activeView === 'riffs' && (
              <div className="animate-in fade-in duration-500">
                <RiffLibrary 
                  theme={theme} 
                  category={instrument} 
                  onPlayRiff={handlePlayRiff}
                  onCategoryChange={setInstrument}
                  accentColor={settings.accentColor}
                />
              </div>
            )}

            {activeView === 'jam' && (
              <div className="animate-in fade-in duration-500">
                <JamStation theme={theme} accentColor={settings.accentColor} />
              </div>
            )}

            {activeView === 'ear' && (
              <div className="animate-in fade-in duration-500">
                <EarTraining theme={theme} accentColor={settings.accentColor} />
              </div>
            )}

            {activeView === 'quiz' && (
              <div className="animate-in fade-in duration-500">
                <QuizView theme={theme} accentColor={settings.accentColor} />
              </div>
            )}
        </main>

        {/* Professional Bottom Navigation (iOS Style) */}
        <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-8 flex justify-center z-50 pointer-events-none pb-[calc(env(safe-area-inset-bottom)+0.2rem)]">
          <nav className={cn(
            "pointer-events-auto flex items-center gap-0.5 p-1 rounded-[2rem] border backdrop-blur-2xl transition-all shadow-2xl max-w-[98vw] overflow-hidden",
            theme === 'dark' ? "bg-black/60 border-white/10" : "bg-white/80 border-black/10"
          )}>
            {[
              { id: 'quintencirkel', label: 'Studio', icon: Compass },
              { id: 'tuner', label: t('tuner'), icon: Volume2 },
              { id: 'theory', label: t('theory'), icon: Brain },
              { id: 'riffs', label: t('riffs'), icon: LayoutGrid },
              { id: 'jam', label: t('jamStation'), icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveView(tab.id as any);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-2.5 sm:px-5 py-2 sm:py-3 rounded-[1.5rem] transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-95 flex-1 min-w-[48px] sm:min-w-[80px]",
                  activeView === tab.id 
                    ? "text-white" 
                    : theme === 'dark' ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"
                )}
              >
                <tab.icon size={16} className={cn(
                  "transition-transform duration-300 group-hover:scale-110",
                  activeView === tab.id ? "scale-110" : ""
                )} />
                <span className="text-[7px] sm:text-[9px] uppercase tracking-tighter font-black leading-none">{tab.label}</span>
                
                {activeView === tab.id && (
                  <div
                    className="absolute inset-0 rounded-[1.5rem] z-[-1]"
                    style={{ backgroundColor: settings.accentColor }}
                  />
                )}
              </button>
            ))}
            
            <div className="w-px h-8 mx-1 opacity-10 bg-current" />
  
            <button
              onClick={() => setIsContactOpen(true)}
              className={cn(
                "relative flex flex-col items-center gap-1 px-3 sm:px-5 py-2 sm:py-3 rounded-2xl transition-all duration-300 group cursor-pointer hover:scale-105 active:scale-95",
                theme === 'dark' ? "text-emerald-500/60 hover:text-emerald-400" : "text-emerald-600/60 hover:text-emerald-500"
              )}
            >
              <MessageCircle size={20} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="text-[9px] uppercase tracking-widest font-black">{t('contact')}</span>
            </button>
          </nav>
        </div>
        <ContactPopup 
          isOpen={isContactOpen} 
          onClose={() => setIsContactOpen(false)} 
          theme={theme} 
          accentColor={settings.accentColor} 
        />
      </div>

      <footer className={cn(
        "w-full text-center py-10 px-4 transition-opacity",
        theme === 'dark' ? "opacity-10" : "opacity-20"
      )}>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium">
            PeROtuner &copy; 2024 &bull; Professional Amateur Park Player Edition
          </p>
          <div className="flex items-center gap-4 text-[8px] font-mono opacity-60">
            <span>Latency: Low</span>
            <span>Build: 1.2 Stable</span>
          </div>
        </div>
      </footer>
    </div>
    </LanguageProvider>
  );
}
