import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Keyboard, Platform, type KeyboardEvent } from "react-native";

type Props = {
  children: ReactNode;
};

export function KeyboardAvoider({ children }: Props) {
  const padding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: KeyboardEvent) => {
      const duration = e.duration && e.duration > 0 ? e.duration : 220;
      Animated.timing(padding, {
        toValue: e.endCoordinates.height,
        duration,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e: KeyboardEvent) => {
      const duration = e.duration && e.duration > 0 ? e.duration : 220;
      Animated.timing(padding, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [padding]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{ flex: 1, justifyContent: "flex-end", paddingBottom: padding }}
    >
      {children}
    </Animated.View>
  );
}
