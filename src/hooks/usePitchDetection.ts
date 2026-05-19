import { useState, useEffect, useRef, useCallback } from 'react';

// YIN Pitch Detection Algorithm Constants
const THRESHOLD = 0.15; // Slightly more relaxed for broader instrument compatibility
const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096;

export interface PitchData {
  frequency: number;
  note: string;
  cents: number;
  clarity: number;
  amplitude: number;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getNoteFromFrequency(frequency: number, referenceA: number = 440): { note: string, cents: number } {
  if (frequency <= 0) return { note: '?', cents: 0 };
  const n = 12 * Math.log2(frequency / referenceA);
  const roundedN = Math.round(n);
  const cents = Math.round((n - roundedN) * 100);
  
  const noteIndex = (roundedN + 69) % 12;
  const wrappedIndex = noteIndex < 0 ? noteIndex + 12 : noteIndex;
  
  return {
    note: NOTES[wrappedIndex],
    cents
  };
}

export function usePitchDetection(referenceA: number = 440) {
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [isActive, setIsActive] = useState(false);
  
  const referenceRef = useRef(referenceA);
  useEffect(() => {
    referenceRef.current = referenceA;
  }, [referenceA]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Smoothing buffers
  const samplesBuffer = useRef<number[]>([]);
  const EMA_ALPHA = 0.25; // Balanced for stability and speed
  const lastFrequency = useRef<number>(0);
  const lastCents = useRef<number>(0);
  
  // Note Stability Logic
  const consecutiveNoteRef = useRef<string | null>(null);
  const consecutiveCountRef = useRef<number>(0);
  const STABILITY_THRESHOLD = 2; // Helps Filter out transient noise

  // Persistence logic (internalized)
  const clearTimerRef = useRef<NodeJS.Timeout| null>(null);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Microphone API not supported in this browser/context.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        } 
      });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
        latencyHint: 'interactive'
      });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Tuner-Optimized Pre-Filtering (High grade fundamental focus)
      const hpFilter = audioContext.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(65, audioContext.currentTime); // Low E is ~82Hz, B (Bass) is ~31Hz
      
      const lpFilter = audioContext.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(1000, audioContext.currentTime); // Standard guitar range focus
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = BUFFER_SIZE;
      analyser.smoothingTimeConstant = 0; 
      
      source.connect(hpFilter);
      hpFilter.connect(lpFilter);
      lpFilter.connect(analyser);
      analyserRef.current = analyser;
      
      setIsActive(true);
      updatePitch();
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setPitchData(null);
    consecutiveCountRef.current = 0;
    consecutiveNoteRef.current = null;
    samplesBuffer.current = [];
    lastFrequency.current = 0;
    lastCents.current = 0;
  }, []);

  const updatePitch = () => {
    if (!analyserRef.current) return;
    
    const buffer = new Float32Array(BUFFER_SIZE);
    analyserRef.current.getFloatTimeDomainData(buffer);
    
    // DC Offset Removal for cleaner zero-crossing detection
    let mean = 0;
    for (let i = 0; i < buffer.length; i++) mean += buffer[i];
    mean /= buffer.length;
    for (let i = 0; i < buffer.length; i++) buffer[i] -= mean;

    // RMS Calculation for silence detection
    let rms = 0;
    for(let i=0; i<buffer.length; i++) rms += buffer[i]*buffer[i];
    rms = Math.sqrt(rms/buffer.length);
    
    if (rms < 0.0008) { // Ultra-sensitive mode for quiet environments
      if (!clearTimerRef.current) {
        clearTimerRef.current = setTimeout(() => {
          setPitchData(null);
          clearTimerRef.current = null;
          lastFrequency.current = 0;
          lastCents.current = 0;
        }, 1500); // High persistence for string decay
      }
      animationFrameRef.current = requestAnimationFrame(updatePitch);
      return;
    } else {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const { frequency: rawFreq, clarity } = detectPitchYin(buffer, audioContext.sampleRate);
    
    // Filter noise and harmonics (clarity > 0.80 for high precision tuning)
    if (rawFreq > 25 && rawFreq < 1800 && clarity > 0.80) {
      samplesBuffer.current.push(rawFreq);
      if (samplesBuffer.current.length > 5) samplesBuffer.current.shift(); 
      
      const sorted = [...samplesBuffer.current].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      
      // 1. Frequency Smoothing
      const smoothedFreq = (lastFrequency.current === 0) 
        ? median 
        : EMA_ALPHA * median + (1 - EMA_ALPHA) * lastFrequency.current;
        
      lastFrequency.current = smoothedFreq;
      
      const { note, cents: rawCents } = getNoteFromFrequency(smoothedFreq, referenceRef.current);

      // 2. Adaptive Cents Smoothing for stable display
      // When the note is the same, we apply heavy smoothing to cents to avoid "jittery" needle
      let smoothedCents = rawCents;
      if (note === consecutiveNoteRef.current) {
        consecutiveCountRef.current++;
        // The closer we are to zero, the more we smooth to provide a "lock-in" feel
        const closenessFactor = Math.abs(rawCents) < 5 ? 0.15 : 0.4;
        smoothedCents = (lastCents.current * (1 - closenessFactor)) + (rawCents * closenessFactor);
      } else {
        consecutiveNoteRef.current = note;
        consecutiveCountRef.current = 1;
        smoothedCents = rawCents; // Fast jump to new note
      }
      
      lastCents.current = smoothedCents;

      if (consecutiveCountRef.current >= 1) { 
        setPitchData({
          frequency: smoothedFreq,
          note,
          cents: Math.round(smoothedCents),
          clarity,
          amplitude: rms
        });
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(updatePitch);
  };


  const detectPitchYin = (buffer: Float32Array, sampleRate: number): { frequency: number, clarity: number } => {
    const yinBuffer = new Float32Array(buffer.length / 2);
    
    // Difference Function
    for (let tau = 0; tau < yinBuffer.length; tau++) {
      for (let i = 0; i < yinBuffer.length; i++) {
        const delta = buffer[i] - buffer[i + tau];
        yinBuffer[tau] += delta * delta;
      }
    }
    
    // Cumulative Mean Normalized Difference Function
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < yinBuffer.length; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }
    
    // Absolute Threshold
    let tau = -1;
    let minDiff = 1;
    for (let t = 1; t < yinBuffer.length; t++) {
      if (yinBuffer[t] < THRESHOLD) {
        tau = t;
        break;
      }
      if (yinBuffer[t] < minDiff) {
        minDiff = yinBuffer[t];
      }
    }
    
    if (tau === -1) {
      // Find the absolute minimum if we never hit the threshold
      let bestTau = -1;
      let minVal = 1;
      for (let t = 1; t < yinBuffer.length; t++) {
        if (yinBuffer[t] < minVal) {
          minVal = yinBuffer[t];
          bestTau = t;
        }
      }
      if (bestTau === -1 || minVal > 0.3) return { frequency: -1, clarity: 0 };
      tau = bestTau;
    }
    
    // Parabolic Interpolation for sub-sample precision
    let refinedTau = tau;
    if (tau > 0 && tau < yinBuffer.length - 1) {
      const s0 = yinBuffer[tau - 1];
      const s1 = yinBuffer[tau];
      const s2 = yinBuffer[tau + 1];
      const denom = (2 * s1 - s2 - s0);
      if (denom !== 0) {
        refinedTau = tau + (s2 - s0) / (2 * denom);
      }
    }
    
    const clarity = 1 - (yinBuffer[tau]);
    return { frequency: sampleRate / refinedTau, clarity };
  };

  useEffect(() => {
    return () => {
      stop();
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [stop]);

  return { pitchData, isActive, start, stop };
}
