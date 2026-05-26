import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

type FadeInProps = {
  children: ReactNode;
  duration?: number;
  delay?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
};

export function FadeIn({ children, duration = 220, delay = 0, translateY = 0, style }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
}

type SlideUpProps = {
  children: ReactNode;
  from?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function SlideUp({ children, from = 320, duration = 320, style }: SlideUpProps) {
  const ty = useRef(new Animated.Value(from)).current;

  useEffect(() => {
    Animated.timing(ty, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, []);

  return <Animated.View style={[{ transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
}

type RisingBackdropProps = {
  onPress?: () => void;
  dim?: number;
  duration?: number;
};

export function RisingBackdrop({ onPress, dim = 0.45, duration = 240 }: RisingBackdropProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, []);

  return (
    <Animated.View
      {...(Platform.OS === "web" ? {} : { pointerEvents: "box-none" as const })}
      style={[
        StyleSheet.absoluteFillObject,
        Platform.OS === "web" ? ({ pointerEvents: "box-none" } as ViewStyle) : null,
        {
          backgroundColor: `rgba(0,0,0,${dim})`,
          opacity,
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
    </Animated.View>
  );
}
