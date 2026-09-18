import { useEffect, useRef } from "react";
import { AudioModule, useAudioStream } from "expo-audio";
import { chunker, pcm16Mono } from "@/src/utils/caption-pcm";

export interface CaptureProps {
  stream: any;
  onChunk: (pcm: ArrayBuffer) => void;
  onError: (message: string) => void;
}

/** Native PCM streaming; requires on-device WebRTC/audio-session validation. */
export default function CaptionCapture({ onChunk, onError }: CaptureProps) {
  const handlers = useRef({ onChunk, onError });
  handlers.current = { onChunk, onError };
  const append = useRef(chunker(pcm => handlers.current.onChunk(pcm)));
  const { stream } = useAudioStream({ sampleRate: 16000, channels: 1, encoding: "int16",
    onBuffer: b => append.current(pcm16Mono(b.data, b.sampleRate, b.channels)),
  });
  useEffect(() => {
    let closed = false;
    const start = async () => {
      try {
        const p = await AudioModule.requestRecordingPermissionsAsync();
        if (closed) return;
        if (!p.granted) throw new Error("Microphone permission is needed for captions.");
        await stream.start();
        if (closed) stream.stop();
      } catch (e: any) { if (!closed) handlers.current.onError(e.message || "Captions could not access the microphone. Your call is unaffected."); }
    };
    void start();
    return () => { closed = true; stream.stop(); };
  }, [stream]);
  return null;
}