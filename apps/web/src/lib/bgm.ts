const MUTE_KEY = "kemeow.bgm.mute.v1";
const BGM_URL = "audio/bgm.mp3";
const VOLUME = 0.32;

export interface BgmOptions {
  baseUrl: string;
}

export class PageBgm {
  readonly options: BgmOptions;
  private audio: HTMLAudioElement | null = null;
  private muted: boolean;
  private unlocked = false;

  constructor(options: BgmOptions) {
    this.options = options;
    this.muted = readMuted();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  ensure(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const audio = new Audio(resolveAsset(this.options.baseUrl, BGM_URL));
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = VOLUME;
    this.audio = audio;
    return audio;
  }

  /** Start playback; may wait for a user gesture. */
  start(): void {
    if (this.muted) return;
    const audio = this.ensure();
    void audio.play().then(
      () => {
        this.unlocked = true;
      },
      () => {
        this.unlocked = false;
      },
    );
  }

  unlock(): void {
    if (this.unlocked || this.muted) return;
    const audio = this.ensure();
    void audio.play().then(
      () => {
        this.unlocked = true;
      },
      () => undefined,
    );
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeMuted(muted);
    const audio = this.ensure();
    if (muted) {
      audio.pause();
      return;
    }
    audio.volume = VOLUME;
    void audio.play().then(
      () => {
        this.unlocked = true;
      },
      () => undefined,
    );
  }

  toggle(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }
}

function resolveAsset(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}${path}`;
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
