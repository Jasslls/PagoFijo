import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { useAppColors } from "../themes/colors";
import { requestNotificationPermissions } from "../services/notifications";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { PremiumProvider } from "../context/PremiumContext";
import { BusinessOnboardingModal } from "../components/BusinessOnboardingModal";

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermissions();

    // Prevent accidental zoom on mobile web
    if (Platform.OS === "web" && typeof document !== "undefined") {
      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "viewport");
        document.head.appendChild(meta);
      }
      meta.setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      );
    }
  }, []);

  return (
    <AuthProvider>
      <PremiumProvider>
        <RootLayoutContent />
      </PremiumProvider>
    </AuthProvider>
  );
}

function RootLayoutContent() {
  const { loading, isAuthReady } = useAuth();

  if (loading || !isAuthReady) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0F1117", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <>
      <RootLayoutNav />
      <BusinessOnboardingModal />
    </>
  );
}

function RootLayoutNav() {
  const colors = useAppColors();
  const isDark = colors.bg === "#0F1117";
  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}
