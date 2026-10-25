import { createAudioContext } from '@/lib/audioContext';

// Synthesized surf: looping brown noise, low-passed, swelling on a slow LFO.
let context: AudioContext | undefined;
let master: GainNode | undefined;
let suspendTimer: number | undefined;

function build(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(ctx.destination);

  // Two offset swells so the waves never line up into an obvious loop.
  [
    { frequency: 520, rate: 0.11, depth: 0.45 },
    { frequency: 1400, rate: 0.07, depth: 0.2 },
  ].forEach(({ frequency, rate, depth }, index) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const swell = ctx.createGain();
    swell.gain.value = depth;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = depth * 0.9;
    lfo.connect(lfoDepth).connect(swell.gain);
    source.connect(filter).connect(swell).connect(out);
    source.start(0, index * 2.5);
    lfo.start();
  });
  return out;
}

export function setAmbience(on: boolean) {
  window.clearTimeout(suspendTimer);
  if (on) {
    context ??= createAudioContext();
    master ??= build(context);
    void context.resume();
    master.gain.setTargetAtTime(0.25, context.currentTime, 0.8);
    return;
  }
  if (!context || !master) return;
  master.gain.setTargetAtTime(0, context.currentTime, 0.3);
  const ctx = context;
  suspendTimer = window.setTimeout(() => void ctx.suspend(), 1500);
}
