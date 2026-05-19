import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

export function TideGraph({ height = 78 }: { height?: number }) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 320 78">
      <Defs>
        <LinearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.18" />
          <Stop offset="1" stopColor="#3B82F6" stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Path d="M8 62 C52 57 76 42 112 31 C150 18 175 16 211 26 C247 36 267 55 312 60 L312 76 L8 76 Z" fill="url(#tideFill)" />
      <Path d="M8 62 C52 57 76 42 112 31 C150 18 175 16 211 26 C247 36 267 55 312 60" fill="none" stroke="#3B82F6" strokeWidth="2.5" />
      {[8, 75, 139, 205, 270, 312].map((x, index) => (
        <Circle key={x} cx={x} cy={[62, 43, 23, 28, 54, 60][index]} r="3" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="1.5" />
      ))}
    </Svg>
  );
}

export function MiniTideWave() {
  return (
    <Svg width="100%" height={34} viewBox="0 0 320 34">
      <Path d="M4 26 C48 24 60 17 104 11 C147 5 185 6 223 17 C256 26 283 26 316 20" stroke="#7EA0F6" strokeWidth="2" fill="none" strokeDasharray="5 5" />
      <Path d="M4 31 C48 29 60 22 104 16 C147 10 185 11 223 22 C256 31 283 31 316 25 L316 34 L4 34 Z" fill="#EFF6FF" />
    </Svg>
  );
}

export function BeachWindGraphic() {
  return (
    <Svg width="100%" height={44} viewBox="0 0 120 44">
      <Path d="M0 25 C24 19 38 13 60 18 C86 24 100 17 120 13 L120 44 L0 44 Z" fill="#7CB3B5" />
      <Path d="M0 34 C22 27 40 25 62 29 C86 34 103 28 120 22 L120 44 L0 44 Z" fill="#E8D6A1" />
      <Path d="M46 22 L99 20" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <Path d="M91 16 L100 20 L92 25" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function WaveGraphic() {
  return (
    <Svg width="100%" height={36} viewBox="0 0 120 36">
      <Path d="M0 20 C16 8 32 8 48 20 C64 32 80 32 96 20 C106 13 114 11 120 12 L120 36 L0 36 Z" fill="#7CB3B5" opacity="0.85" />
      <Path d="M0 27 C18 17 34 17 52 27 C69 36 88 35 105 25 C112 21 117 20 120 21" stroke="#1E293B" strokeOpacity="0.18" strokeWidth="3" fill="none" />
    </Svg>
  );
}
