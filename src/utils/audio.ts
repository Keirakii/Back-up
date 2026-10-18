let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playJoyfulChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Pleasant 3-note arpeggio chord (C5 - E5 - G5 - C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + index * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.65);
    });
  } catch (err) {
    console.debug('Audio chime skipped:', err);
  }
}

/**
 * Unique, positive, crisp "success chime" played specifically when an NFC tag is
 * successfully scanned and matched to a member. Distinct from the standard check-in chime:
 * Features a high-speed tactile induction ping + sparkling 4-tone celestial flourish (B5 - D#6 - F#6 - B6)
 * with dual crystalline harmonic overtones.
 */
export function playNfcSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Instantaneous tactile card-induction "read" ping (crisp glass transient)
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = 'triangle';
    pingOsc.frequency.setValueAtTime(1760, now); // A6 ping
    pingGain.gain.setValueAtTime(0, now);
    pingGain.gain.linearRampToValueAtTime(0.18, now + 0.006);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    pingOsc.connect(pingGain);
    pingGain.connect(ctx.destination);
    pingOsc.start(now);
    pingOsc.stop(now + 0.065);

    // 2. Uplifting, fast ascending major sparkle sequence (B5 -> D#6 -> F#6 -> B6)
    // with shimmering crystal overtones and long reverberant ring
    const chimeTones = [
      { freq: 987.77, delay: 0.025, dur: 0.38, gainVal: 0.16 },  // B5
      { freq: 1244.51, delay: 0.085, dur: 0.42, gainVal: 0.18 }, // D#6
      { freq: 1479.98, delay: 0.145, dur: 0.48, gainVal: 0.20 }, // F#6
      { freq: 1975.53, delay: 0.210, dur: 0.85, gainVal: 0.24 }, // B6 (radiant peak)
    ];

    chimeTones.forEach(({ freq, delay, dur, gainVal }) => {
      const startTime = now + delay;

      // Primary tone: smooth pure bell body
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0006, startTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);

      // Crystalline overtone: higher harmonic shimmer
      const overtoneOsc = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtoneOsc.type = 'triangle';
      overtoneOsc.frequency.setValueAtTime(freq * 2, startTime);

      overtoneGain.gain.setValueAtTime(0, startTime);
      overtoneGain.gain.linearRampToValueAtTime(gainVal * 0.28, startTime + 0.008);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0004, startTime + dur * 0.65);

      overtoneOsc.connect(overtoneGain);
      overtoneGain.connect(ctx.destination);

      overtoneOsc.start(startTime);
      overtoneOsc.stop(startTime + dur * 0.7);
    });
  } catch (err) {
    console.debug('NFC success chime skipped:', err);
  }
}

export function playWarningAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Distinct urgent two-tone alert: High pitch -> Lower caution pitch with rapid pulsing
    const beeps = [
      { freq: 783.99, start: 0, duration: 0.12, type: 'triangle' as OscillatorType }, // G5
      { freq: 587.33, start: 0.15, duration: 0.22, type: 'sawtooth' as OscillatorType }, // D5
      { freq: 587.33, start: 0.42, duration: 0.25, type: 'sawtooth' as OscillatorType }, // D5 second pulse
    ];

    beeps.forEach(({ freq, start, duration, type }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.24, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    });
  } catch (err) {
    console.debug('Warning sound skipped:', err);
  }
}

export function triggerHapticFeedback() {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Haptic double-pulse vibration on mobile devices
      navigator.vibrate([90, 40, 110]);
    } catch {
      // safe fallback
    }
  }
}

export function triggerNfcHapticFeedback() {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Crisp, snappy double-tap vibration specifically tailored for NFC scan confirmation
      navigator.vibrate([45, 35, 75]);
    } catch {
      // safe fallback
    }
  }
}

/**
 * Unique, distinct haptic pattern specifically triggered while an NFC scan is in progress.
 * Built to augment the 'scale-pulse' card animation with tactile confirmation.
 * Employs a rhythmic 3-beat scanning wave pulse: [30ms pulse, 50ms pause, 45ms pulse, 50ms pause, 70ms pulse]
 * paired with a subtle, low-frequency acoustic micro-thump (52Hz-68Hz) to ensure rich tactile feedback
 * across both mobile vibration motors and audio-tactile speakers.
 */
export function triggerNfcScanInProgressHaptic() {
  // 1. Hardware vibration pattern (distinct rhythmic scanning in progress)
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([30, 50, 45, 50, 70]);
    } catch {
      // safe fallback
    }
  }

  // 2. Synthetic tactile sub-bass micro-resonance for physical-like tactile confirmation
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Rhythmic 3-tone tactile swell matching the scale-pulse wave
    [0, 0.08, 0.175].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(52 + idx * 8, now + offset); // 52Hz -> 60Hz -> 68Hz

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.09 + idx * 0.03, now + offset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.075);
    });
  } catch (err) {
    console.debug('Scan-in-progress tactile audio skipped:', err);
  }
}

