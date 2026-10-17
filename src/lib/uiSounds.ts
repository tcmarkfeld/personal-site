import { getSiteState } from '@/lib/siteState';

// Small interface sounds, synthesized on demand so there are no files to load.
// Every sound follows a click or key press, which is what lets browsers play it.
let context: AudioContext | undefined;
let noise: AudioBuffer | undefined;
let room: AudioNode | undefined;

type Tone = {
  type: OscillatorType;
  from: number;
  to: number;
  length: number;
  gain: number;
  delay?: number;
  // Seconds to swell in; defaults to a quick tap.
  attack?: number;
};

function tone(ctx: AudioContext, out: AudioNode, sound: Tone) {
  const at = ctx.currentTime + (sound.delay ?? 0);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = sound.type;
  osc.frequency.setValueAtTime(sound.from, at);
  osc.frequency.exponentialRampToValueAtTime(sound.to, at + sound.length * 0.6);
  // A swell in, then a soft exponential tail.
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(
    sound.gain,
    at + (sound.attack ?? 0.005),
  );
  env.gain.exponentialRampToValueAtTime(0.0001, at + sound.length);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + sound.length + 0.02);
}

type Burst = {
  type: BiquadFilterType;
  from: number;
  to: number;
  q: number;
  gain: number;
  attack: number;
  length: number;
  delay?: number;
};

// Filtered noise: a page brushing past, a drawer sliding, or (very short) the
// tick of something catching.
function burst(ctx: AudioContext, out: AudioNode, sound: Burst) {
  noise ??= (() => {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  })();
  const at = ctx.currentTime + (sound.delay ?? 0);
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = sound.type;
  band.Q.value = sound.q;
  band.frequency.setValueAtTime(sound.from, at);
  band.frequency.exponentialRampToValueAtTime(sound.to, at + sound.length);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(sound.gain, at + sound.attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + sound.length);
  source.connect(band).connect(env).connect(out);
  source.start(at);
  source.stop(at + sound.length + 0.02);
}

// A faint echo every sound passes through, so they feel airy, not dry.
function roomOf(ctx: AudioContext) {
  const input = ctx.createGain();
  const echo = ctx.createDelay();
  echo.delayTime.value = 0.13;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  input.connect(ctx.destination);
  input.connect(echo);
  echo.connect(feedback).connect(echo);
  echo.connect(wet).connect(ctx.destination);
  return input;
}

// Each sound says whether it plays through the room's echo. The drawer
// sounds stay dry and close, like something physical under your hand.
const sounds: Record<
  'open' | 'close' | 'navigate',
  {
    echo: boolean;
    volume: number;
    play: (ctx: AudioContext, out: AudioNode) => void;
  }
> = {
  // A drawer gliding out: a soft slide of air that lifts, then catches.
  open: {
    echo: false,
    volume: 1.8,
    play: (ctx, out) => {
      burst(ctx, out, {
        type: 'bandpass',
        from: 500,
        to: 1400,
        q: 0.8,
        gain: 0.035,
        attack: 0.03,
        length: 0.12,
      });
      burst(ctx, out, {
        type: 'bandpass',
        from: 3200,
        to: 3000,
        q: 3,
        gain: 0.05,
        attack: 0.002,
        length: 0.022,
        delay: 0.085,
      });
      tone(ctx, out, {
        type: 'sine',
        from: 260,
        to: 240,
        length: 0.04,
        gain: 0.018,
        delay: 0.085,
      });
    },
  },
  // A drawer settling shut: a quick falling slide into a muted thump.
  close: {
    echo: false,
    volume: 1.8,
    play: (ctx, out) => {
      burst(ctx, out, {
        type: 'bandpass',
        from: 1400,
        to: 500,
        q: 0.8,
        gain: 0.03,
        attack: 0.015,
        length: 0.08,
      });
      tone(ctx, out, {
        type: 'sine',
        from: 150,
        to: 100,
        length: 0.08,
        gain: 0.07,
        delay: 0.06,
        attack: 0.003,
      });
      burst(ctx, out, {
        type: 'bandpass',
        from: 1800,
        to: 1700,
        q: 2.5,
        gain: 0.035,
        attack: 0.002,
        length: 0.02,
        delay: 0.06,
      });
    },
  },
  // A page brushing past.
  navigate: {
    echo: true,
    volume: 1,
    play: (ctx, out) => {
      burst(ctx, out, {
        type: 'bandpass',
        from: 700,
        to: 2600,
        q: 1.1,
        gain: 0.09,
        attack: 0.04,
        length: 0.22,
      });
      tone(ctx, out, {
        type: 'sine',
        from: 1200,
        to: 1500,
        length: 0.06,
        gain: 0.02,
        delay: 0.05,
      });
    },
  },
};

export function playSound(name: keyof typeof sounds) {
  if (!getSiteState().uiSound) return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    room ??= roomOf(context);
    const sound = sounds[name];
    // Round off the top end so nothing sounds sharp.
    const out = context.createBiquadFilter();
    out.type = 'lowpass';
    out.frequency.value = 4200;
    const volume = context.createGain();
    volume.gain.value = sound.volume;
    out.connect(volume).connect(sound.echo ? room : context.destination);
    sound.play(context, out);
  } catch {
    // No audio available; the interface works the same without it.
  }
}
