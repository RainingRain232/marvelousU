// ---------------------------------------------------------------------------
// Duel mode – procedural audio using Web Audio API
// Ported from fantasiaCup fighting game audio system
// ---------------------------------------------------------------------------

class DuelAudioSystemImpl {
  private _ctx: AudioContext | null = null;
  private _enabled = true;
  private _masterVolume = 0.3;

  init(): void {
    try {
      this._ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      this._enabled = false;
    }
  }

  resume(): void {
    if (this._ctx && this._ctx.state === "suspended") {
      this._ctx.resume();
    }
  }

  setVolume(vol: number): void {
    this._masterVolume = Math.max(0, Math.min(1, vol));
  }

  // ---- Sound effects -------------------------------------------------------

  playHit(type: "light" | "heavy" | "super" = "light"): void {
    if (!this._enabled || !this._ctx) return;
    this.resume();
    const now = this._ctx.currentTime;

    if (type === "light") {
      this._playNoise(now, 0.06, 2000, 6000, 0.15);
    } else if (type === "heavy") {
      this._playNoise(now, 0.1, 800, 4000, 0.25);
      this._playTone(now, 0.08, 120, 60, 0.15);
    } else if (type === "super") {
      this._playNoise(now, 0.15, 500, 6000, 0.3);
      this._playTone(now, 0.12, 200, 80, 0.2);
      this._playTone(now + 0.03, 0.1, 150, 60, 0.15);
    }
  }

  playBlock(): void {
    if (!this._enabled || !this._ctx) return;
    this.resume();
    const now = this._ctx.currentTime;
    this._playTone(now, 0.05, 300, 500, 0.15);
    this._playNoise(now, 0.04, 3000, 8000, 0.1);
  }

  playWhoosh(): void {
    if (!this._enabled || !this._ctx) return;
    this.resume();
    const now = this._ctx.currentTime;
    this._playNoise(now, 0.12, 1000, 5000, 0.08);
  }

  playKO(): void {
    if (!this._enabled || !this._ctx) return;
    this.resume();
    const now = this._ctx.currentTime;
    this._playTone(now, 0.3, 200, 80, 0.3);
    this._playTone(now + 0.1, 0.3, 150, 60, 0.25);
    this._playTone(now + 0.2, 0.4, 100, 40, 0.2);
    this._playNoise(now, 0.2, 400, 3000, 0.2);
  }

  playRoundStart(): void {
    if (!this._enabled || !this._ctx) return;
    this.resume();
    const now = this._ctx.currentTime;
    this._playTone(now, 0.15, 400, 400, 0.2);
    this._playTone(now + 0.15, 0.15, 500, 500, 0.2);
    this._playTone(now + 0.3, 0.25, 600, 600, 0.25);
  }

  playSelect(): void {
    if (!this._enabled || !this._ctx) return;
    this.resume();
    const now = this._ctx.currentTime;
    this._playTone(now, 0.08, 800, 800, 0.12);
  }

  playCancel(): void {
    if (!this._enabled || !this._ctx) return;
    this.resume();
    const now = this._ctx.currentTime;
    this._playTone(now, 0.1, 500, 200, 0.12);
  }

  playConfirm(): void {
    if (!this._enabled || !this._ctx) return;
    this.resume();
    const now = this._ctx.currentTime;
    this._playTone(now, 0.1, 600, 600, 0.15);
    this._playTone(now + 0.08, 0.12, 800, 800, 0.15);
  }

  playProjectile(): void {
    if (!this._enabled || !this._ctx) return;
    this.resume();
    const now = this._ctx.currentTime;
    this._playTone(now, 0.2, 300, 600, 0.12);
    this._playNoise(now, 0.1, 2000, 6000, 0.08);
  }

  // ---- Low-level synthesis helpers -----------------------------------------

  private _playTone(
    time: number,
    duration: number,
    startFreq: number,
    endFreq: number,
    volume: number,
  ): void {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.connect(gain);
    gain.connect(this._ctx.destination);

    osc.type = "square";
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFreq),
      time + duration,
    );

    gain.gain.setValueAtTime(volume * this._masterVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  private _playNoise(
    time: number,
    duration: number,
    lowFreq: number,
    highFreq: number,
    volume: number,
  ): void {
    if (!this._ctx) return;
    const bufferSize = Math.floor(this._ctx.sampleRate * duration);
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;

    const bandpass = this._ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = (lowFreq + highFreq) / 2;
    bandpass.Q.value = 1;

    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(volume * this._masterVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this._ctx.destination);

    source.start(time);
    source.stop(time + duration);
  }
}

export const duelAudio = new DuelAudioSystemImpl();
