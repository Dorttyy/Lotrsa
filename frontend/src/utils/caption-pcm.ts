/** Downsample the ACTUAL capture rate; never assume hardware honored 16kHz. */
export function pcm16Mono(data: ArrayBuffer, sampleRate: number, channels: number, float = false) {
  const input = float ? new Float32Array(data) : new Int16Array(data);
  const frames = Math.floor(input.length / channels);
  const count = Math.floor(frames * 16000 / sampleRate);
  const output = new Int16Array(count);
  for (let i = 0; i < count; i++) {
    const begin = Math.floor(i * sampleRate / 16000);
    const end = Math.max(begin + 1, Math.min(frames, Math.floor((i + 1) * sampleRate / 16000)));
    let total = 0;
    for (let j = begin; j < end; j++) for (let ch = 0; ch < channels; ch++) total += input[j * channels + ch];
    const value = total / ((end - begin) * channels) * (float ? 32767 : 1);
    output[i] = Math.max(-32768, Math.min(32767, value));
  }
  return output;
}

export function chunker(onChunk: (pcm: ArrayBuffer) => void) {
  const buffer = new Int16Array(16000 * 4);
  let cursor = 0;
  return (samples: Int16Array) => {
    for (let i = 0; i < samples.length; i++) {
      buffer[cursor++] = samples[i];
      if (cursor === buffer.length) { onChunk(buffer.slice().buffer); cursor = 0; }
    }
  };
}