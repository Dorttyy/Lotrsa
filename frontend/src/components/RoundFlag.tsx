import React, { useId } from "react";
import Svg, { Circle, ClipPath, Defs, Image as SvgImage } from "react-native-svg";
import { countryFlagRectUrl } from "@/src/constants/countries";
import { flagRectUrl } from "@/src/constants/languages";
import { useTheme } from "@/src/context/ThemeContext";

/** Existing flag artwork, clipped to a true circle for selection lists. */
export function RoundFlag({ country, code, size = 26, testID }: {
  country?: string | null; code?: string | null; size?: number; testID?: string;
}) {
  const { colors } = useTheme();
  const unique = useId().replace(/:/g, "");
  const clip = `round-flag-${unique}`;
  const uri = country ? countryFlagRectUrl(country) : flagRectUrl(code);
  return <Svg testID={testID || clip} width={size} height={size} viewBox="0 0 100 100">
    <Defs><ClipPath id={clip}><Circle cx={50} cy={50} r={48} /></ClipPath></Defs>
    <Circle cx={50} cy={50} r={48} fill={colors.surfaceTertiary} />
    {uri && <SvgImage href={{ uri }} width={100} height={100} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />}
    <Circle cx={50} cy={50} r={48} fill="none" stroke={colors.borderStrong} strokeWidth={2} />
  </Svg>;
}