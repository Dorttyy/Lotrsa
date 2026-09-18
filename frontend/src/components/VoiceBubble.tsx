import { Ionicons } from "@/src/ui/icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, ThemeColors } from "@/src/theme";
import { audioUrl } from "@/src/utils/api";
import { useExclusiveVoicePlayer } from "@/src/hooks/use-exclusive-voice-player";

interface VoiceBubbleProps {
  audioId: string;
  durationMs?: number | null;
  mine?: boolean;
  // Optional override so a screen with its own palette (e.g. Premium chat)
  // can force a specific color set instead of the global theme.
  colors?: ThemeColors;
  testID?: string;
}

const BAR_COUNT = 16;
const SPEEDS = [1, 1.5, 2];

const fmt = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
};

// Deterministic pseudo-random bar heights derived from the audio id, so each
// voice message keeps a consistent waveform shape across renders.
const barHeights = (seed: string): number[] => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const out: number[] = [];
  for (let i = 0; i < BAR_COUNT; i += 1) {
    h = (Math.imul(h, 1103515245) + 12345) & 0x7fffffff;
    const r = (h % 1000) / 1000;
    out.push(7 + Math.round(r * 17)); // 7..24 px
  }
  return out;
};

export const VoiceBubble: React.FC<VoiceBubbleProps> = ({
  audioId,
  durationMs,
  mine,
  colors: colorsOverride,
  testID: providedTestID,
}) => {
  const { colors: themeColors } = useTheme();
  const colors = colorsOverride ?? themeColors;
  const componentId = React.useId();
  const testID = providedTestID || `voice-message-${componentId.replace(/:/g, "")}`;
  const [speedIdx, setSpeedIdx] = React.useState(0);
  // "activated" = the message is currently playing or was paused mid-playback.
  // Only then do we show the rich waveform + speed + countdown UI. Before the
  // first play (or after it finishes) we show the compact play + duration view.
  const [activated, setActivated] = React.useState(false);
  const { player, status, toggle: togglePlayback, error } = useExclusiveVoicePlayer(audioUrl(audioId), () => setActivated(false));
  const bars = React.useMemo(() => barHeights(audioId), [audioId]);

  const totalSec =
    status.duration > 0 ? status.duration : (durationMs || 0) / 1000;
  const curSec = status.currentTime || 0;
  const progress = totalSec > 0 ? Math.min(1, curSec / totalSec) : 0;
  const playing = status.playing;
  // Countdown: while playing show the remaining time, otherwise the full length.
  const shownSec = playing ? Math.max(0, totalSec - curSec) : totalSec;
  const filled = Math.round(progress * BAR_COUNT);

  React.useEffect(() => {
    if (status.didJustFinish) setActivated(false);
  }, [status.didJustFinish]);

  const toggle = async () => {
    if (await togglePlayback()) setActivated(true);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    const rate = SPEEDS[next];
    try {
      // expo-audio: setPlaybackRate(rate, pitchCorrectionQuality)
      (player as unknown as {
        setPlaybackRate?: (r: number, q: string) => void;
      }).setPlaybackRate?.(rate, "high");
    } catch {
      try {
        (player as unknown as { playbackRate?: number }).playbackRate = rate;
      } catch {
        /* noop */
      }
    }
  };

  // Choose contrasting on-bubble text/icon colour based on which side the
  // bubble is on. Falls back to waveActive if the theme does not expose an
  // on-bubble text token (older screens).
  const onBubble = mine ? colors.onBubbleMine : colors.onBubbleTheirs;
  const waveActive = colors.waveActive || colors.brand;
  const waveInactive = colors.waveInactive || colors.border;

  const PlayBtn = (
    <Pressable
      testID={testID ? `${testID}-play` : undefined}
      accessibilityRole="button"
      accessibilityLabel={playing ? "Pause voice message" : "Play voice message"}
      onPress={toggle}
      hitSlop={10}
      style={styles.playBtn}
    >
      <Ionicons
        name={playing ? "pause" : "play"}
        size={playing ? 24 : 26}
        color={waveActive}
      />
    </Pressable>
  );

  // Single fixed-size layout for every state. The waveform area and the speed
  // control slot are ALWAYS reserved, so the bubble never changes size — when
  // idle it simply shows the play button on the left and the duration on the
  // right (like the reference); playback only adds the animated bars + speed.
  return (
    <View testID={testID}>
    <View style={styles.row}>
      {PlayBtn}
      <View style={styles.wave}>
        {activated
          ? bars.map((hgt, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: hgt,
                    backgroundColor: i < filled ? waveActive : waveInactive,
                  },
                ]}
              />
            ))
          : null}
      </View>
      <View style={styles.right}>
        {activated ? (
          <Pressable
            testID={`${testID}-speed`}
            onPress={cycleSpeed}
            hitSlop={14}
            style={[styles.speedPill, { backgroundColor: colors.speedPillBg }]}
          >
            <Text style={[styles.speedText, { color: colors.speedPillText }]}>
              {SPEEDS[speedIdx].toFixed(1)}x
            </Text>
          </Pressable>
        ) : null}
        <Text testID={`${testID}-duration`} style={[styles.dur, { color: colors.bubbleMeta || onBubble }]}>
          {fmt(activated ? shownSec : totalSec)}
        </Text>
      </View>
    </View>
    {!!error && <Text testID={`${testID}-error`} style={[styles.error, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 156,
    minHeight: 40,
    paddingVertical: 1,
  },
  playBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  wave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    height: 24,
    flex: 1,
  },
  bar: {
    flex: 1,
    maxWidth: 2.5,
    borderRadius: 2,
  },
  right: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginLeft: 2,
  },
  speedPill: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 38,
    alignItems: "center",
  },
  speedText: {
    fontFamily: fonts.textBold,
    fontSize: 11,
  },
  dur: {
    fontFamily: fonts.textSemi,
    fontSize: 12,
  },
  error: { fontFamily: fonts.text, fontSize: 11, lineHeight: 16, maxWidth: 220 },
});
