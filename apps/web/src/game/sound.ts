const MUTE_KEY = "kemeow.mute.v1";
const MERGE_URL = "audio/merge.mp3";
const VOICE_COUNT = 6;
const PITCH_BASE = 0.98;
const PITCH_STEP = 0.055;
const PITCH_MIN = 0.82;
const PITCH_MAX = 1.5;

export interface SoundOptions {
  baseUrl: string;
}

/**
 * Merge sample + short WebAudio cues.
 * Voices are pooled; pitch rises with tier.
 */
export class GameSound {
  readonly options: SoundOptions;
  private ctx: AudioContext | null = null;
  private voices: HTMLAudioElement[] = [];
  private cursor = 0;
  private muted: boolean;

  constructor(options: SoundOptions) {
    this.options = options;
    this.muted = readMuted();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  ensure(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    }
    const Ctor = window.AudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Unlock audio after a user gesture. */
  unlock(): void {
    this.ensure();
    if (this.voices.length === 0) this.buildVoices();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeMuted(muted);
  }

  toggle(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  merge(level: number): void {
    if (this.muted) return;
    const voice = this.takeVoice();
    voice.playbackRate = clamp(PITCH_BASE + level * PITCH_STEP, PITCH_MIN, PITCH_MAX);
    voice.currentTime = 0;
    void voice.play().catch(() => undefined);
  }

  drop(): void {
    this.tone(180, 120, 0.08, 0.05, "sine");
  }

  over(): void {
    this.tone(420, 90, 0.7, 0.16, "sawtooth");
  }

  private takeVoice(): HTMLAudioElement {
    if (this.voices.length === 0) this.buildVoices();
    const voice = this.voices[this.cursor % this.voices.length];
    this.cursor += 1;
    return voice ?? this.voices[0]!;
  }

  private buildVoices(): void {
    for (let i = 0; i < VOICE_COUNT; i += 1) {
      const audio = new Audio(resolveAsset(this.options.baseUrl, MERGE_URL));
      audio.preload = "auto";
      this.voices.push(audio);
    }
  }

  private tone(
    freq: number,
    freq2: number | null,
    duration: number,
    volume: number,
    type: OscillatorType,
  ): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freq2 !== null && freq2 !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}

export function resolveAsset(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${path}`;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* private mode */
  }
}
