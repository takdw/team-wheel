import type { DividerContact } from "./motion";

export function createSpinAudio() {
  const context = new AudioContext();
  const volume = context.createGain();
  volume.connect(context.destination);

  // A short strike with a damped resonance gives the pointer a soft, dry click.
  const click = new Float32Array(Math.ceil(context.sampleRate * 0.022));
  for (let index = 0; index < click.length; index++) {
    const time = index / context.sampleRate;
    const strike = (Math.random() * 2 - 1) * Math.exp(-420 * time);
    const resonance =
      Math.sin(2 * Math.PI * 1450 * time) * Math.exp(-190 * time);
    click[index] =
      Math.min(1, time * 2800) * (0.16 * strike + 0.11 * resonance);
  }
  return { context, volume, click };
}

export type SpinAudio = ReturnType<typeof createSpinAudio>;

export function playSpinClicks(
  { context, volume, click }: SpinAudio,
  contacts: readonly DividerContact[],
  wheel: Animation,
): (() => void) | undefined {
  const last = contacts.at(-1);
  if (!last || context.state !== "running") return;

  // Mix into one buffer so nearby hits keep their spacing even between frames.
  const rate = context.sampleRate;
  const buffer = context.createBuffer(
    1,
    Math.ceil((last.timeMs / 1000) * rate) + click.length,
    rate,
  );
  const samples = buffer.getChannelData(0);
  for (const { timeMs, strength } of contacts) {
    const start = Math.floor((timeMs / 1000) * rate);
    const gain = 0.45 + 0.55 * strength;
    for (let index = 0; index < click.length; index++) {
      samples[start + index] += click[index] * gain;
    }
  }

  const elapsed = Number(wheel.currentTime) / 1000;
  if (elapsed >= buffer.duration) return;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(volume);
  source.onended = () => source.disconnect();
  source.start(context.currentTime, elapsed);
  return () => source.stop();
}
