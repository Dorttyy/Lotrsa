import { useEffect, useRef } from "react";
import { chunker, pcm16Mono } from "@/src/utils/caption-pcm";
import type { CaptureProps } from "./CaptionCapture";

/** Reuses the WebRTC mic track; no second browser microphone acquisition. */
export default function CaptionCapture({ stream, onChunk, onError }: CaptureProps) {
  const callbacks = useRef({ onChunk, onError });
  callbacks.current = { onChunk, onError };
  useEffect(() => {
    if (!stream) return;
    let context: AudioContext | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let processor: ScriptProcessorNode | undefined;
    try {
      context = new AudioContext();
      source = context.createMediaStreamSource(stream);
      processor = context.createScriptProcessor(4096, 1, 1);
      const append = chunker(pcm => callbacks.current.onChunk(pcm));
      processor.onaudioprocess = e => {
        const input = e.inputBuffer.getChannelData(0);
        append(pcm16Mono(input.slice().buffer, e.inputBuffer.sampleRate, 1, true));
      };
      source.connect(processor);
      processor.connect(context.destination); // Output stays silent; never route mic to speakers.
      void context.resume().catch(() => callbacks.current.onError("Tap captions again to allow audio processing."));
    } catch { callbacks.current.onError("Live captions are unavailable in this browser."); }
    return () => {
      if (processor) { processor.onaudioprocess = null; processor.disconnect(); }
      source?.disconnect(); void context?.close();
    };
  }, [stream]);
  return null;
}