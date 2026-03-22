// ---------------------------------------------------------------------------
// Caravan SFX — lightweight procedural sound effects using Web Audio API
// No asset files needed — generates tones/noise programmatically
// ---------------------------------------------------------------------------

let _ctx: AudioContext | null = null;
let _enabled = true;
let _volume = 0.15;

function _getCtx(): AudioContext | null {
  if (!_enabled) return null;
  if (!_ctx) {
    try {
      _ctx = new AudioContext();
    } catch {
      _enabled = false;
      return null;
    }
  }
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

function _playTone(freq: number, duration: number, type: OscillatorType = "square", vol = _volume): void {
  const ctx = _getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function _playNoise(duration: number, vol = _volume * 0.5): void {
  const ctx = _getCtx();
  if (!ctx) return;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export const CaravanSFX = {
  /** Player hit enemy */
  hit(): void {
    _playTone(220, 0.08, "square", _volume * 0.6);
    _playNoise(0.05, _volume * 0.3);
  },

  /** Critical hit */
  crit(): void {
    _playTone(440, 0.06, "square", _volume * 0.8);
    _playTone(660, 0.1, "square", _volume * 0.5);
  },

  /** Enemy killed */
  kill(): void {
    _playTone(330, 0.08, "sawtooth", _volume * 0.5);
    _playTone(220, 0.12, "sawtooth", _volume * 0.3);
  },

  /** Boss killed */
  bossKill(): void {
    _playTone(440, 0.1, "square", _volume * 0.7);
    setTimeout(() => _playTone(550, 0.1, "square", _volume * 0.6), 80);
    setTimeout(() => _playTone(660, 0.15, "square", _volume * 0.8), 160);
  },

  /** Player takes damage */
  playerHit(): void {
    _playTone(150, 0.12, "sawtooth", _volume * 0.7);
    _playNoise(0.08, _volume * 0.4);
  },

  /** Caravan takes damage */
  caravanHit(): void {
    _playTone(100, 0.15, "sawtooth", _volume * 0.5);
    _playNoise(0.1, _volume * 0.3);
  },

  /** Ability activated */
  ability(): void {
    _playTone(520, 0.06, "sine", _volume * 0.6);
    _playTone(780, 0.1, "sine", _volume * 0.4);
  },

  /** Loot collected */
  loot(): void {
    _playTone(880, 0.05, "sine", _volume * 0.3);
    setTimeout(() => _playTone(1100, 0.06, "sine", _volume * 0.25), 50);
  },

  /** Encounter spawns */
  encounter(): void {
    _playTone(180, 0.2, "sawtooth", _volume * 0.4);
    _playTone(160, 0.25, "sawtooth", _volume * 0.3);
  },

  /** Boss warning */
  bossWarning(): void {
    _playTone(120, 0.3, "square", _volume * 0.5);
    setTimeout(() => _playTone(100, 0.4, "square", _volume * 0.6), 300);
  },

  /** Dash */
  dash(): void {
    _playNoise(0.1, _volume * 0.4);
  },

  /** UI click */
  click(): void {
    _playTone(660, 0.03, "sine", _volume * 0.3);
  },

  /** Escort dies */
  escortDeath(): void {
    _playTone(200, 0.15, "sawtooth", _volume * 0.5);
    _playTone(150, 0.2, "sawtooth", _volume * 0.4);
  },
};
