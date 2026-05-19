import { Platform, StyleSheet } from "react-native";

export const shadows = StyleSheet.create({
  soft: Platform.select({
    web: { boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px rgba(15, 23, 42, 0.04)" },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  }),
  lift: Platform.select({
    web: { boxShadow: "0 -8px 32px rgba(15, 23, 42, 0.12)" },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: -4 },
      elevation: 10,
    },
  }),
});
