import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";

import { FIREBASE_AUTH, ensureUserDocument } from "./src/lib/firebase";
import RootNavigator from "./src/navigation/RootNavigator";
import {
  registerForPushNotificationsAsync,
  setupNotificationHandler,
} from "./src/services/pushNotifications";
import { useRoadieStore } from "./src/store/useRoadieStore";

const App = () => {
  const authReady = useRoadieStore((state) => state.authReady);
  const setAuthReady = useRoadieStore((state) => state.setAuthReady);
  const setUser = useRoadieStore((state) => state.setUser);
  const refreshShows = useRoadieStore((state) => state.refreshShows);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (firebaseUser) => {
      if (firebaseUser) {
        await ensureUserDocument(firebaseUser);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          phone: firebaseUser.phoneNumber,
          photoURL: firebaseUser.photoURL,
        });
        await registerForPushNotificationsAsync(firebaseUser.uid);
      } else {
        setUser(null);
      }

      setAuthReady(true);
    });

    return unsubscribe;
  }, [setAuthReady, setUser]);

  useEffect(() => {
    if (!authReady) return;
    void refreshShows();
  }, [authReady, refreshShows]);

  if (!authReady) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" testID="app-loading" />
      </View>
    );
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="dark" />
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
  },
});

export default App;
