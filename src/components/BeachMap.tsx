import { Pressable, View, Text } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { Navigation, Sailboat } from "lucide-react-native";

type Props = {
  size: number;
  wind: number;
  swell: string;
  unit?: string;
  showDirection?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function BeachMap({ size, wind, swell, unit = "kt", showDirection = true, onPress, accessibilityLabel }: Props) {
  const radius = size / 2;
  const Container: any = onPress ? Pressable : View;
  const containerProps = onPress
    ? {
        accessibilityRole: "button" as const,
        accessibilityLabel,
        onPress,
        className: "relative items-center justify-center active:opacity-90",
      }
    : { className: "relative items-center justify-center" };

  return (
    <Container {...containerProps} style={{ width: size, height: size, borderRadius: radius }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <ClipPath id="mapClip">
            <Circle cx={radius} cy={radius} r={radius - 1} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#mapClip)">
          <Rect width={size} height={size} fill="#2C7FB0" />
          <Path d={`M0 ${size * 0.2} C${size * 0.25} ${size * 0.12} ${size * 0.55} ${size * 0.22} ${size} ${size * 0.15}`} stroke="#3D91BF" strokeWidth="18" opacity="0.35" />
          <Path d={`M0 ${size * 0.43} C${size * 0.3} ${size * 0.32} ${size * 0.58} ${size * 0.52} ${size} ${size * 0.39}`} stroke="#3D91BF" strokeWidth="16" opacity="0.3" />
          <Path d={`M0 ${size * 0.64} C${size * 0.25} ${size * 0.55} ${size * 0.62} ${size * 0.72} ${size} ${size * 0.59}`} stroke="#276E98" strokeWidth="18" opacity="0.3" />
          <Path d={`M0 0 L${size * 0.34} 0 C${size * 0.27} ${size * 0.2} ${size * 0.28} ${size * 0.55} ${size * 0.35} ${size} L0 ${size} Z`} fill="#4B7B5A" />
          <Path d={`M${size * 0.24} 0 C${size * 0.17} ${size * 0.28} ${size * 0.18} ${size * 0.66} ${size * 0.27} ${size}`} stroke="#E8D6A1" strokeWidth="28" fill="none" />
          <Path d={`M${size * 0.31} 0 C${size * 0.24} ${size * 0.28} ${size * 0.25} ${size * 0.66} ${size * 0.34} ${size}`} stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" />
          <Line x1={size * 0.54} y1={size * 0.5} x2={size * 0.72} y2={size * 0.33} stroke="rgba(255,255,255,0.35)" strokeWidth="12" strokeLinecap="round" />
        </G>
        <Circle cx={radius} cy={radius} r={radius - 1} fill="none" stroke="rgba(15, 23, 42, 0.18)" />
        <SvgText x={radius} y={15} fill="#FFFFFF" fillOpacity="0.7" fontSize="12" fontWeight="700" textAnchor="middle">N</SvgText>
        <SvgText x={size - 12} y={radius + 4} fill="#FFFFFF" fillOpacity="0.7" fontSize="12" fontWeight="700" textAnchor="middle">E</SvgText>
        <SvgText x={radius} y={size - 7} fill="#FFFFFF" fillOpacity="0.7" fontSize="12" fontWeight="700" textAnchor="middle">S</SvgText>
        <SvgText x={12} y={radius + 4} fill="#FFFFFF" fillOpacity="0.7" fontSize="12" fontWeight="700" textAnchor="middle">W</SvgText>
      </Svg>

      <View className="absolute top-[17%] items-center">
        <Text className="text-[14px] font-semibold text-white">{swell}</Text>
        <Text className="text-[10px] font-medium text-white">SW 210°</Text>
      </View>

      <View className="absolute left-[17%] top-[47%] items-center rounded-xl bg-white px-2 py-1">
        <Sailboat size={16} color="#1E293B" strokeWidth={1.8} />
        <Text className="mt-0.5 text-[8px] font-bold text-ink">LAUNCH</Text>
      </View>

      <View className="absolute items-center">
        <View style={{ transform: [{ rotate: "70deg" }] }}>
          <Navigation size={32} color="#FFFFFF" fill="#FFFFFF" />
        </View>
        <Text className="mt-2 text-[48px] font-extrabold leading-[50px] text-white">{wind}</Text>
        <Text className="-mt-1 text-[16px] font-medium text-white">{unit}</Text>
        {showDirection ? <Text className="mt-1 text-[14px] font-semibold text-white">ENE (70°)</Text> : null}
      </View>
    </Container>
  );
}
