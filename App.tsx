import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { MD3DarkTheme, Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";

import { FIREBASE_AUTH, ensureUserDocument } from "./src/lib/firebase";
import RootNavigator from "./src/navigation/RootNavigator";
import {
  registerForPushNotificationsAsync,
  setupNotificationHandler,
} from "./src/services/pushNotifications";
import { useRoadieStore } from "./src/store/useRoadieStore";
import { palette } from "./src/theme/colors";
import type { UserProfile } from "./src/types";

const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: palette.white,
    onPrimary: palette.black,
    secondary: palette.gray300,
    onSecondary: palette.black,
    background: palette.black,
    onBackground: palette.white,
    surface: palette.gray900,
    onSurface: palette.white,
    surfaceVariant: palette.gray700,
    outline: palette.gray700,
    error: palette.accentRed,
  },
};

const logAuthStateError = (context: string, error: unknown, uid: string | null) => {
  console.error(`[Roadie][onAuthStateChanged.${context}]`, {
    code: (error as { code?: string } | null)?.code,
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    uid,
  });
};

const App = () => {
  const authReady = useRoadieStore((state) => state.authReady);
  const user = useRoadieStore((state) => state.user);
  const setAuthReady = useRoadieStore((state) => state.setAuthReady);
  const setUser = useRoadieStore((state) => state.setUser);
  const refreshShows = useRoadieStore((state) => state.refreshShows);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (firebaseUser) => {
      if (firebaseUser) {
        let nextUser: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          phone: firebaseUser.phoneNumber,
          bio: null,
          address: null,
          photoURL: firebaseUser.photoURL,
          roadieId: null,
        };

        try {
          const userProfile = await ensureUserDocument(firebaseUser);
          nextUser = {
            ...nextUser,
            displayName: userProfile?.displayName ?? nextUser.displayName,
            phone: userProfile?.phone ?? nextUser.phone,
            bio: userProfile?.bio ?? nextUser.bio,
            address: userProfile?.address ?? nextUser.address,
            photoURL: userProfile?.photoURL ?? nextUser.photoURL,
            roadieId: userProfile?.roadieId ?? null,
          };
        } catch (error) {
          logAuthStateError("ensureUserDocument", error, firebaseUser.uid);
        }

        setUser(nextUser);

        try {
          await registerForPushNotificationsAsync(firebaseUser.uid);
        } catch (error) {
          logAuthStateError("registerPush", error, firebaseUser.uid);
        }
      } else {
        try {
          setUser(null);
        } catch (error) {
          logAuthStateError("setUser", error, null);
        }
      }

      setAuthReady(true);
    });

    return unsubscribe;
  }, [setAuthReady, setUser]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) return;
    void refreshShows();
  }, [authReady, user, refreshShows]);

  if (!authReady) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" testID="app-loading" color={palette.white} />
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="light" />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.black,
  },
});

export default App;
