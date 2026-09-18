import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgGradient, Path, RadialGradient, Stop } from "react-native-svg";

import portraits from "@/src/assets/welcome-portraits.json";
import { fonts } from "@/src/theme";
import { MicGlyph } from "@/src/ui/MicGlyph";

const photos = {
  one: { uri: portraits.portraitOne },
  two: { uri: portraits.portraitTwo },
  three: { uri: portraits.portraitThree },
};

/** Original decorative compositions. Photos illustrate connection, not real members. */
export const WelcomeArtwork = React.memo(function WelcomeArtwork({ page, size }: { page: number; size: number }) {
  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={`welcome-artwork-${page + 1}`}
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 400" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`aura-${page}`} cx="48%" cy="48%" r="55%">
            <Stop offset="0" stopColor={page === 1 ? "#174FC2" : "#5060C4"} stopOpacity="0.65" />
            <Stop offset="0.52" stopColor="#0B7691" stopOpacity="0.23" />
            <Stop offset="1" stopColor="#0B1220" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="200" cy="200" r="200" fill={`url(#aura-${page})`} />
        <Path d="M328 294 L331 303 L340 306 L331 309 L328 318 L325 309 L316 306 L325 303 Z" fill="#C3EDFF" opacity="0.8" />
        <Circle cx="65" cy="270" r="2" fill="#71CFFA" />
        <Circle cx="305" cy="55" r="2.5" fill="#ACAAFA" />
      </Svg>
      {page === 0 ? <ConversationCollage /> : page === 1 ? <WorldOfLanguages /> : <ConnectionRings size={size} />}
    </View>
  );
});

function ConversationCollage() {
  return (
    <>
      <View style={[styles.portraitCard, styles.cardOne]}>
        <Image source={photos.one} style={styles.photo} accessible={false} />
        <LinearGradient colors={["transparent", "rgba(6,15,35,0.8)"]} style={styles.cardShade} />
        <View style={styles.greeting}><Text style={styles.greetingText}>Hello.</Text><Text style={styles.greetingSub}>A new beginning</Text></View>
      </View>
      <View style={[styles.portraitCard, styles.cardTwo]}>
        <Image source={photos.three} style={styles.photo} accessible={false} />
        <LinearGradient colors={["transparent", "rgba(6,15,35,0.8)"]} style={styles.cardShade} />
        <View style={styles.greeting}><Text style={styles.greetingText}>Hola!</Text><Text style={styles.greetingSub}>A shared language</Text></View>
      </View>
      <View style={[styles.portraitCircle, styles.collageCircle]}>
        <Image source={photos.two} style={styles.photo} accessible={false} />
      </View>
      <View style={styles.bonjourChip}>
        <Text style={styles.bonjourText}>Bonjour!</Text>
        <View style={styles.messageDots}>{[0, 1, 2].map((dot) => <View key={dot} style={styles.messageDot} />)}</View>
      </View>
      <View style={styles.collageCaption}><View style={styles.captionLine} /><Text style={styles.artCaption}>IT STARTS WITH HELLO</Text></View>
    </>
  );
}

function WorldOfLanguages() {
  return (
    <>
      <Svg width="100%" height="100%" viewBox="0 0 400 400" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="world-surface" cx="34%" cy="24%" r="85%">
            <Stop offset="0" stopColor="#5277DA" />
            <Stop offset="0.48" stopColor="#223F7D" />
            <Stop offset="1" stopColor="#081B38" />
          </RadialGradient>
          <SvgGradient id="world-land" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor="#92E6DC" />
            <Stop offset="0.5" stopColor="#66AFCE" />
            <Stop offset="1" stopColor="#8984D5" />
          </SvgGradient>
        </Defs>
        <Ellipse cx="200" cy="326" rx="111" ry="12" fill="#030812" opacity="0.5" />
        <Circle cx="200" cy="187" r="144" fill="none" stroke="#2F90BF" strokeWidth="8" strokeOpacity="0.09" />
        <Circle cx="200" cy="187" r="139" fill="url(#world-surface)" stroke="#93CEF7" strokeWidth="1.4" />
        <G transform="rotate(-17 200 187)" stroke="#7DB6E9" strokeWidth="0.8" strokeOpacity="0.25" fill="none">
          <Ellipse cx="200" cy="187" rx="80" ry="139" />
          <Ellipse cx="200" cy="187" rx="32" ry="139" />
          <Ellipse cx="200" cy="187" rx="138" ry="51" />
          <Ellipse cx="200" cy="187" rx="138" ry="94" />
          <Path d="M61 187 H339" />
        </G>
        <G fill="url(#world-land)" stroke="#B1DDED" strokeWidth="0.6" strokeOpacity="0.3">
          <Path d="M89 123 Q106 89 144 70 L166 81 157 97 171 105 165 126 145 140 142 164 126 180 116 162 96 152 87 135 Z" />
          <Path d="M145 183 L167 184 180 199 189 215 176 230 174 251 164 280 152 295 147 268 137 248 132 217 Z" />
          <Path d="M207 88 L230 76 248 80 250 95 272 102 290 100 314 124 326 150 307 160 289 146 275 158 263 154 255 174 241 161 223 162 211 145 217 127 200 120 Z" />
          <Path d="M214 176 L237 171 259 184 272 199 261 214 249 239 232 256 220 232 212 211 201 195 Z" />
          <Path d="M288 245 L308 238 318 255 306 275 281 273 277 261 Z" />
        </G>
        <Path d="M74 105 Q221 31 319 136" fill="none" stroke="#BAEAFF" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <Path d="M40 208 Q201 333 355 169" fill="none" stroke="#70D4ED" strokeWidth="1.4" strokeDasharray="5 8" opacity="0.7" />
      </Svg>
      <View style={[styles.portraitCircle, styles.worldFaceOne]}><Image source={photos.three} style={styles.photo} accessible={false} /></View>
      <View style={[styles.portraitCircle, styles.worldFaceTwo]}><Image source={photos.two} style={styles.photo} accessible={false} /></View>
      <View style={[styles.languagePill, styles.worldPillOne]}><View style={styles.tinySignal} /><Text style={styles.languagePillText}>New perspectives</Text></View>
      <View style={[styles.languagePill, styles.worldPillTwo]}><Text style={styles.languagePillText}>Shared interests</Text></View>
      <View style={styles.worldCaption}><Text style={styles.artCaption}>DIFFERENT WORLDS. COMMON WORDS.</Text></View>
    </>
  );
}

function ConnectionRings({ size }: { size: number }) {
  return (
    <>
      <Svg width="100%" height="100%" viewBox="0 0 400 400" style={StyleSheet.absoluteFill}>
        <Circle cx="200" cy="191" r="152" fill="#5766A7" fillOpacity="0.07" stroke="#6580B8" strokeOpacity="0.12" />
        <Circle cx="200" cy="191" r="114" fill="#7185CE" fillOpacity="0.09" stroke="#8DA7E1" strokeOpacity="0.19" />
        <Circle cx="200" cy="191" r="76" fill="#83AAE8" fillOpacity="0.12" stroke="#A0C7F5" strokeOpacity="0.25" />
        <Path d="M90 285 Q160 350 277 315" fill="none" stroke="#77BBDD" strokeWidth="1.2" strokeDasharray="3 7" />
        <Path d="M286 55 L290 66 L301 70 L290 74 L286 85 L282 74 L271 70 L282 66 Z" fill="#D4EAFE" />
      </Svg>
      <View style={styles.voiceCenter}><MicGlyph size={size * 0.135} color="#E3F5FF" /></View>
      <View style={[styles.portraitCircle, styles.ringFaceOne]}><Image source={photos.one} style={styles.photo} accessible={false} /></View>
      <View style={[styles.portraitCircle, styles.ringFaceTwo]}><Image source={photos.three} style={styles.photo} accessible={false} /></View>
      <View style={[styles.portraitCircle, styles.ringFaceThree]}><Image source={photos.two} style={styles.photo} accessible={false} /></View>
      <View style={styles.soundPill}>
        <View style={styles.soundWave}>{[8, 16, 23, 13, 19, 9].map((height, i) => <View key={i} style={[styles.soundBar, { height }]} />)}</View>
        <Text style={styles.languagePillText}>Find your voice</Text>
      </View>
      <View style={styles.ringCaption}><Text style={styles.artCaption}>ONE CONVERSATION AT A TIME</Text></View>
    </>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", height: "100%", resizeMode: "cover" },
  portraitCard: { position: "absolute", width: "43%", height: "59%", borderRadius: 24, overflow: "hidden", backgroundColor: "#28416C", borderWidth: 1, borderColor: "#586D90", boxShadow: "0px 14px 24px rgba(0, 0, 0, 0.28)" },
  cardOne: { left: "12%", top: "9%", transform: [{ rotate: "-10deg" }] },
  cardTwo: { left: "47%", top: "26%", transform: [{ rotate: "10deg" }] },
  cardShade: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  greeting: { position: "absolute", bottom: "7%", left: "9%", right: "7%", gap: 3 },
  greetingText: { fontFamily: fonts.displayBold, fontSize: 23, color: "#FFFFFF" },
  greetingSub: { fontFamily: fonts.text, fontSize: 9, color: "#E3EEF7" },
  portraitCircle: { position: "absolute", aspectRatio: 1, borderRadius: 999, borderWidth: 3, borderColor: "#A5C7E2", overflow: "hidden", backgroundColor: "#375169" },
  collageCircle: { width: "17%", left: "73%", top: "4%", borderColor: "#8894C1" },
  bonjourChip: { position: "absolute", left: "8%", top: "69%", backgroundColor: "#DBF2EE", borderRadius: 17, paddingHorizontal: 16, paddingVertical: 11, transform: [{ rotate: "-7deg" }], gap: 5, boxShadow: "0px 5px 12px rgba(0, 0, 0, 0.15)" },
  bonjourText: { fontFamily: fonts.displayBold, color: "#254758", fontSize: 19 },
  messageDots: { flexDirection: "row", gap: 3 },
  messageDot: { width: 3, height: 3, borderRadius: 3, backgroundColor: "#518E9B" },
  collageCaption: { position: "absolute", top: "95%", left: "8%", right: "8%", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  captionLine: { width: 18, height: 1, backgroundColor: "#7B98B2" },
  artCaption: { fontFamily: fonts.textSemi, color: "#829BB4", fontSize: 8, letterSpacing: 1.5, textAlign: "center" },
  worldFaceOne: { width: "15%", left: "11%", top: "25%", borderColor: "#F5D6A0" },
  worldFaceTwo: { width: "20%", right: "12%", top: "62%", borderColor: "#91A8E6" },
  languagePill: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#152D43", borderWidth: 1, borderColor: "#385D7A", borderRadius: 13, paddingHorizontal: 12, paddingVertical: 11 },
  worldPillOne: { left: "3%", top: "64%", transform: [{ rotate: "-8deg" }] },
  worldPillTwo: { right: "0%", top: "25%", transform: [{ rotate: "9deg" }] },
  languagePillText: { fontFamily: fonts.textSemi, color: "#DDEAF4", fontSize: 10 },
  tinySignal: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#8AE5D5" },
  worldCaption: { position: "absolute", top: "92%", left: 0, right: 0 },
  voiceCenter: { position: "absolute", left: "39%", top: "36.75%", width: "22%", aspectRatio: 1, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#709CE0", backgroundColor: "#224D87", boxShadow: "0px 0px 22px rgba(45, 146, 207, 0.22)" },
  ringFaceOne: { width: "17%", left: "17%", top: "13%" },
  ringFaceTwo: { width: "21%", right: "5%", top: "36%", borderColor: "#DAD6B5" },
  ringFaceThree: { width: "23%", left: "19%", top: "67%", borderColor: "#AAA7DF" },
  soundPill: { position: "absolute", right: "4%", top: "77%", gap: 7, borderRadius: 13, backgroundColor: "#1B3048", borderWidth: 1, borderColor: "#345675", paddingHorizontal: 12, paddingVertical: 9 },
  soundWave: { height: 23, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  soundBar: { width: 3, borderRadius: 2, backgroundColor: "#8ED5F1" },
  ringCaption: { position: "absolute", left: 0, right: 0, top: "96%" },
});
