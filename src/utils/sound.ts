// Web Audio API DTMF generator and call sound synthesis

let audioCtx: AudioContext | null = null;
let activeToneOscillators: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;
let ringtoneInterval: number | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// DTMF Frequencies (Hz)
const DTMF_MAP: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

export function playDtmfTone(key: string, durationMs: number = 140) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const freqs = DTMF_MAP[key] || [400, 800];
  const [f1, f2] = freqs;

  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(f1, ctx.currentTime);
    osc2.frequency.setValueAtTime(f2, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    osc1.stop(ctx.currentTime + durationMs / 1000);
    osc2.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // AudioContext failure gracefully handled
  }

  // Trigger slight haptic if supported
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(20);
    } catch {
      // Ignore
    }
  }
}

export function playRingbackTone(): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  let isPlaying = true;
  let pulseTimer: number;

  const playBurst = () => {
    if (!isPlaying) return;
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.4);
      osc2.stop(ctx.currentTime + 1.4);
    } catch {
      // Ignore
    }

    pulseTimer = window.setTimeout(() => {
      if (isPlaying) playBurst();
    }, 3200);
  };

  playBurst();

  return () => {
    isPlaying = false;
    clearTimeout(pulseTimer);
  };
}

export interface RingtonePreset {
  id: string;
  nameBn: string;
  nameEn: string;
  defaultLabelBn: string;
  defaultLabelEn: string;
  category: 'default' | 'folk' | 'marimba' | 'classic' | 'modern' | 'chill' | 'urgent';
  icon: string;
}

export const RINGTONE_PRESETS: RingtonePreset[] = [
  {
    id: 'chime',
    nameBn: 'ডিফল্ট সাইন চাইম',
    nameEn: 'Default Sine Chime',
    defaultLabelBn: 'সাধারণ সুর (Default Chime)',
    defaultLabelEn: 'Standard Ringtone',
    category: 'default',
    icon: '🔔',
  },
  {
    id: 'flute',
    nameBn: 'বাউলি লোকজ বাঁশি',
    nameEn: 'Bengali Folk Flute',
    defaultLabelBn: 'আম্মু ও পরিবার (Family Folk)',
    defaultLabelEn: 'Family Folk Flute',
    category: 'folk',
    icon: '🪈',
  },
  {
    id: 'marimba',
    nameBn: 'জেন্টল মারিম্বা বিট',
    nameEn: 'Gentle Marimba',
    defaultLabelBn: 'প্রিয় বন্ধু ও আড্ডা (Friends)',
    defaultLabelEn: 'Close Friends',
    category: 'marimba',
    icon: '🎵',
  },
  {
    id: 'vintage',
    nameBn: 'ভিন্টেজ ল্যান্ডলাইন বেল',
    nameEn: 'Vintage Bell Ringer',
    defaultLabelBn: 'জরুরি অফিস কল (Work/Office)',
    defaultLabelEn: 'Office Work Ring',
    category: 'classic',
    icon: '☎️',
  },
  {
    id: 'pulse',
    nameBn: 'সাইবার ডিজিটাল পালস',
    nameEn: 'Cyber Digital Pulse',
    defaultLabelBn: 'টেক প্রজেক্ট / টিম (Dev Team)',
    defaultLabelEn: 'Tech / Work Alert',
    category: 'modern',
    icon: '⚡',
  },
  {
    id: 'calm',
    nameBn: 'শান্ত হারমোনি মেলোডি',
    nameEn: 'Calm Harmony Pluck',
    defaultLabelBn: 'শান্ত সুর / রিলেক্স (Calm)',
    defaultLabelEn: 'Calm Harmony',
    category: 'chill',
    icon: '🌿',
  },
  {
    id: 'urgent',
    nameBn: 'ভিআইপি প্রিওরিটি অ্যালার্ট',
    nameEn: 'VIP Priority Alert',
    defaultLabelBn: 'ভিআইপি ও বিশেষ ব্যক্তি (VIP)',
    defaultLabelEn: 'VIP Priority Call',
    category: 'urgent',
    icon: '⭐',
  },
];

export function playIncomingRingtone(ringtoneId: string = 'chime'): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  let isPlaying = true;
  let timer: number;

  const playChime = () => {
    if (!isPlaying) return;

    if (ringtoneId === 'vintage') {
      // Vintage double telephone bell
      try {
        const bursts = [0, 0.4, 0.8, 1.2];
        bursts.forEach((timeOffset) => {
          setTimeout(() => {
            if (!isPlaying) return;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = 'sawtooth';
            osc2.type = 'sawtooth';
            osc1.frequency.setValueAtTime(853, ctx.currentTime);
            osc2.frequency.setValueAtTime(960, ctx.currentTime);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + 0.25);
            osc2.stop(ctx.currentTime + 0.25);
          }, timeOffset * 1000);
        });
      } catch {}
      timer = window.setTimeout(() => {
        if (isPlaying) playChime();
      }, 3000);
      return;
    }

    if (ringtoneId === 'flute') {
      // Bengali folk flute pentatonic melody
      const fluteNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25];
      fluteNotes.forEach((freq, idx) => {
        setTimeout(() => {
          if (!isPlaying) return;
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.01, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
          } catch {}
        }, idx * 160);
      });
      timer = window.setTimeout(() => {
        if (isPlaying) playChime();
      }, 2600);
      return;
    }

    if (ringtoneId === 'marimba') {
      // Woody acoustic marimba
      const marimbaNotes = [440, 554.37, 659.25, 880, 659.25, 554.37];
      marimbaNotes.forEach((freq, idx) => {
        setTimeout(() => {
          if (!isPlaying) return;
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.18);
          } catch {}
        }, idx * 130);
      });
      timer = window.setTimeout(() => {
        if (isPlaying) playChime();
      }, 2200);
      return;
    }

    if (ringtoneId === 'pulse') {
      // Cyber electronic arpeggio
      const pulseNotes = [330, 440, 660, 880, 1100];
      pulseNotes.forEach((freq, idx) => {
        setTimeout(() => {
          if (!isPlaying) return;
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.03, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
          } catch {}
        }, idx * 90);
      });
      timer = window.setTimeout(() => {
        if (isPlaying) playChime();
      }, 1900);
      return;
    }

    if (ringtoneId === 'calm') {
      // Soft ambient chord
      const calmNotes = [440, 523.25, 659.25, 783.99];
      calmNotes.forEach((freq, idx) => {
        setTimeout(() => {
          if (!isPlaying) return;
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.55);
          } catch {}
        }, idx * 150);
      });
      timer = window.setTimeout(() => {
        if (isPlaying) playChime();
      }, 2800);
      return;
    }

    if (ringtoneId === 'urgent') {
      // Rapid VIP alert
      const urgentTones = [784, 1046, 784, 1046];
      urgentTones.forEach((freq, idx) => {
        setTimeout(() => {
          if (!isPlaying) return;
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.09, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
          } catch {}
        }, idx * 100);
      });
      timer = window.setTimeout(() => {
        if (isPlaying) playChime();
      }, 1600);
      return;
    }

    // Default Chime
    const notes = [587.33, 659.25, 783.99, 880.0, 783.99];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!isPlaying) return;
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch {}
      }, idx * 120);
    });

    timer = window.setTimeout(() => {
      if (isPlaying) playChime();
    }, 2400);
  };

  playChime();

  return () => {
    isPlaying = false;
    clearTimeout(timer);
  };
}

export function playCallEndedTone() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Ignore
  }
}
