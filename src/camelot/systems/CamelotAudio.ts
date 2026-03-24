// ---------------------------------------------------------------------------
// Prince of Camelot — Audio System (Web Audio API)
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicOscs: OscillatorNode[] = [];
let musicPlaying = false;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function resumeAudio(): void {
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
}

export function playSound(type: string): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const g = ctx.createGain();
  g.connect(ctx.destination);
  const o = ctx.createOscillator();
  o.connect(g);

  switch (type) {
    case "slash1": o.type="sawtooth"; o.frequency.setValueAtTime(200,now);
      o.frequency.exponentialRampToValueAtTime(80,now+0.12); g.gain.setValueAtTime(0.15,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.12); o.start(now); o.stop(now+0.12); break;
    case "slash2": o.type="sawtooth"; o.frequency.setValueAtTime(260,now);
      o.frequency.exponentialRampToValueAtTime(100,now+0.1); g.gain.setValueAtTime(0.15,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.1); o.start(now); o.stop(now+0.1); break;
    case "slash3": o.type="square"; o.frequency.setValueAtTime(300,now);
      o.frequency.exponentialRampToValueAtTime(60,now+0.2); g.gain.setValueAtTime(0.18,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.2); o.start(now); o.stop(now+0.2); break;
    case "hit": o.type="square"; o.frequency.setValueAtTime(150,now);
      o.frequency.exponentialRampToValueAtTime(40,now+0.15); g.gain.setValueAtTime(0.2,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.15); o.start(now); o.stop(now+0.15); break;
    case "parry": o.type="triangle"; o.frequency.setValueAtTime(800,now);
      o.frequency.exponentialRampToValueAtTime(1200,now+0.08); g.gain.setValueAtTime(0.2,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.15); o.start(now); o.stop(now+0.15); break;
    case "coin": o.type="sine"; o.frequency.setValueAtTime(900,now);
      o.frequency.setValueAtTime(1200,now+0.06); g.gain.setValueAtTime(0.1,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.15); o.start(now); o.stop(now+0.15); break;
    case "heal": o.type="sine"; o.frequency.setValueAtTime(400,now);
      o.frequency.linearRampToValueAtTime(800,now+0.3); g.gain.setValueAtTime(0.12,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.4); o.start(now); o.stop(now+0.4); break;
    case "jump": o.type="sine"; o.frequency.setValueAtTime(200,now);
      o.frequency.exponentialRampToValueAtTime(500,now+0.1); g.gain.setValueAtTime(0.08,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.1); o.start(now); o.stop(now+0.1); break;
    case "dash": o.type="sawtooth"; o.frequency.setValueAtTime(100,now);
      o.frequency.exponentialRampToValueAtTime(50,now+0.15); g.gain.setValueAtTime(0.12,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.15); o.start(now); o.stop(now+0.15); break;
    case "die": o.type="sawtooth"; o.frequency.setValueAtTime(200,now);
      o.frequency.exponentialRampToValueAtTime(20,now+0.6); g.gain.setValueAtTime(0.2,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.6); o.start(now); o.stop(now+0.6); break;
    case "powerup": o.type="sine"; o.frequency.setValueAtTime(500,now);
      o.frequency.setValueAtTime(700,now+0.1); o.frequency.setValueAtTime(900,now+0.2);
      o.frequency.setValueAtTime(1100,now+0.3); g.gain.setValueAtTime(0.12,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.4); o.start(now); o.stop(now+0.4); break;
    case "lever": o.type="square"; o.frequency.setValueAtTime(100,now);
      o.frequency.setValueAtTime(150,now+0.1); g.gain.setValueAtTime(0.12,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.2); o.start(now); o.stop(now+0.2); break;
    case "crumble": {
      const n = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.15;
      n.buffer = buf; n.connect(ctx.destination); n.start(now); return; }
    case "boss_roar": o.type="sawtooth"; o.frequency.setValueAtTime(80,now);
      o.frequency.linearRampToValueAtTime(40,now+0.5); g.gain.setValueAtTime(0.25,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.6); o.start(now); o.stop(now+0.6); break;
    case "boss_slam": {
      const n2 = ctx.createBufferSource();
      const buf2 = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const d2 = buf2.getChannelData(0);
      for (let i = 0; i < d2.length; i++) d2[i] = (Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*0.1))*0.3;
      n2.buffer = buf2; n2.connect(ctx.destination); n2.start(now); return; }
    case "footstep": {
      const n3 = ctx.createBufferSource();
      const buf3 = ctx.createBuffer(1, Math.floor(ctx.sampleRate*0.04), ctx.sampleRate);
      const d3 = buf3.getChannelData(0);
      for(let i=0;i<d3.length;i++) d3[i]=(Math.random()*2-1)*Math.exp(-i/(d3.length*0.2))*0.06;
      n3.buffer=buf3; n3.connect(ctx.destination); n3.start(now); return; }
    case "enemy_swing": o.type="sawtooth"; o.frequency.setValueAtTime(160,now);
      o.frequency.exponentialRampToValueAtTime(60,now+0.08); g.gain.setValueAtTime(0.08,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.08); o.start(now); o.stop(now+0.08); break;
    case "arrow_fire": o.type="sawtooth"; o.frequency.setValueAtTime(400,now);
      o.frequency.exponentialRampToValueAtTime(200,now+0.06); g.gain.setValueAtTime(0.06,now);
      g.gain.exponentialRampToValueAtTime(0.001,now+0.06); o.start(now); o.stop(now+0.06); break;
    case "checkpoint": o.type="sine"; o.frequency.setValueAtTime(600,now);
      o.frequency.setValueAtTime(800,now+0.1); o.frequency.setValueAtTime(1000,now+0.2);
      g.gain.setValueAtTime(0.1,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.3);
      o.start(now); o.stop(now+0.3); break;
    case "shop_buy": o.type="sine"; o.frequency.setValueAtTime(500,now);
      o.frequency.setValueAtTime(750,now+0.08); o.frequency.setValueAtTime(1000,now+0.16);
      g.gain.setValueAtTime(0.1,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.25);
      o.start(now); o.stop(now+0.25); break;
    default: return;
  }
}

export function startMusic(): void {
  if (musicPlaying) return;
  const ctx = getCtx();
  musicPlaying = true;
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.04;
  musicGain.connect(ctx.destination);

  const bass = ctx.createOscillator();
  bass.type = "sine"; bass.frequency.value = 55;
  bass.connect(musicGain); bass.start();
  musicOscs.push(bass);

  const pad = ctx.createOscillator();
  pad.type = "triangle"; pad.frequency.value = 110;
  const padGain = ctx.createGain(); padGain.gain.value = 0.5;
  pad.connect(padGain); padGain.connect(musicGain); pad.start();
  musicOscs.push(pad);

  const arp = ctx.createOscillator();
  arp.type = "sine";
  const arpGain = ctx.createGain(); arpGain.gain.value = 0.3;
  arp.connect(arpGain); arpGain.connect(musicGain); arp.start();
  musicOscs.push(arp);

  const notes = [110, 131, 147, 165, 147, 131];
  let t = ctx.currentTime;
  function scheduleNotes(): void {
    for (let i = 0; i < 60; i++) {
      arp.frequency.setValueAtTime(notes[i % notes.length], t);
      t += 0.8;
    }
    setTimeout(scheduleNotes, 48000);
  }
  scheduleNotes();

  const lfo = ctx.createOscillator();
  lfo.type = "sine"; lfo.frequency.value = 0.1;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 20;
  lfo.connect(lfoGain); lfoGain.connect(pad.frequency); lfo.start();
  musicOscs.push(lfo);
}

export function updateMusicMood(hasBoss: boolean, lowHP: boolean): void {
  if (!musicGain) return;
  const targetVol = hasBoss ? 0.07 : lowHP ? 0.06 : 0.04;
  musicGain.gain.value += (targetVol - musicGain.gain.value) * 0.01;
}

export function stopMusic(): void {
  for (const o of musicOscs) { try { o.stop(); } catch(_) { /* already stopped */ } }
  musicOscs = [];
  musicPlaying = false;
  musicGain = null;
}
