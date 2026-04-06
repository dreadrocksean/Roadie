import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Button } from "react-native-paper";

import { FIREBASE_AUTH } from "../../lib/firebase";
import { palette } from "../../theme/colors";
import type { RootStackParamList } from "../../types";
import type { NavigationProp } from "@react-navigation/native";
import styles from "./styles";

WebBrowser.maybeCompleteAuthSession();
const APPLE_SIGN_IN_TIMEOUT_MS = 20000;

const getConfigValue = (primary?: string, fallback?: string) => {
  const first = primary?.trim();
  if (first) return first;
  const second = fallback?.trim();
  return second || undefined;
};

const getErrorCode = (error: unknown) => (error as { code?: string } | null)?.code;
const isAppleCancelledError = (error: unknown) => {
  const code = getErrorCode(error);
  if (code === "ERR_CANCELED" || code === "ERR_CANCELLED" || code === "CANCELLED") {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(message);
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    clearTimeout(timeoutId);
  }
};

type SocialLoginButtonProps = {
  icon: "google" | "apple";
  label: string;
  onPress: () => void;
  disabled: boolean;
  testID: string;
  variant: "light" | "dark";
};

const SocialLoginButton = ({
  icon,
  label,
  onPress,
  disabled,
  testID,
  variant,
}: SocialLoginButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.socialAuthButton,
      variant === "dark" ? styles.socialAuthButtonDark : styles.socialAuthButtonLight,
    ]}
    testID={testID}
  >
    <View style={styles.socialAuthContent}>
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={variant === "dark" ? palette.black : palette.white}
      />
      <Text
        style={[
          styles.socialAuthLabel,
          variant === "dark" ? styles.socialAuthLabelDark : styles.socialAuthLabelLight,
        ]}
      >
        {label}
      </Text>
    </View>
  </Pressable>
);

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extras = (Constants.expoConfig?.extra ?? {}) as {
    googleExpoClientId?: string;
    googleIosClientId?: string;
    googleAndroidClientId?: string;
    googleWebClientId?: string;
  };

  const googleExpoClientId = getConfigValue(
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    extras.googleExpoClientId,
  );
  const googleIosClientId = getConfigValue(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    extras.googleIosClientId,
  );
  const googleAndroidClientId = getConfigValue(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    extras.googleAndroidClientId,
  );
  const googleWebClientId = getConfigValue(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    extras.googleWebClientId,
  );

  const googleClientIdFallback =
    googleExpoClientId ?? googleIosClientId ?? googleAndroidClientId ?? googleWebClientId ?? "missing";

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientIdFallback,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
  });

  const navigateToHome = useCallback(() => {
    if ("reset" in navigation && typeof navigation.reset === "function") {
      navigation.reset({
        index: 0,
        routes: [{ name: "Tabs", params: { screen: "Map" } }],
      });
      return;
    }

    navigation.navigate("Tabs", { screen: "Map" });
  }, [navigation]);

  useEffect(() => {
    const finishGoogleSignIn = async () => {
      if (!googleResponse || googleResponse.type !== "success") return;

      const idToken = (googleResponse.params as Record<string, string>)?.id_token;
      const accessToken = googleResponse.authentication?.accessToken;

      if (!idToken) {
        setError("Google sign-in did not return an id token.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        await signInWithCredential(FIREBASE_AUTH, credential);
        navigateToHome();
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
    };

    void finishGoogleSignIn();
  }, [googleResponse, navigateToHome]);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(FIREBASE_AUTH, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(FIREBASE_AUTH, email.trim(), password);
      }
      navigateToHome();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);

    if (!googleRequest) {
      setError("Google sign-in is not ready yet.");
      return;
    }

    try {
      await googlePromptAsync();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google sign-in failed.");
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      setError("Apple sign-in is only available on iOS.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        setError("Apple sign-in is unavailable on this simulator/device.");
        return;
      }

      const rawNonce = Array.from(await Crypto.getRandomBytesAsync(16))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const appleCredential = await withTimeout(
        AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        }),
        APPLE_SIGN_IN_TIMEOUT_MS,
        "Apple sign-in",
      );

      if (!appleCredential.identityToken) {
        setError("Apple sign-in did not return an identity token.");
        return;
      }

      const provider = new OAuthProvider("apple.com");
      const credential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce,
      });

      await signInWithCredential(FIREBASE_AUTH, credential);
      navigateToHome();
    } catch (authError) {
      if (isAppleCancelledError(authError)) {
        return;
      }

      const code = getErrorCode(authError);
      const isTimeout =
        authError instanceof Error &&
        authError.message.toLowerCase().includes("timed out");

      const normalized = {
        code,
        name: authError instanceof Error ? authError.name : "Error",
        message: authError instanceof Error ? authError.message : String(authError),
        stack: authError instanceof Error ? authError.stack : undefined,
      };

      console.error(`[Roadie][appleSignIn] ${JSON.stringify(normalized)}`);

      if (code === "ERR_INVALID_OPERATION" || code === "ERR_REQUEST_NOT_HANDLED") {
        setError("Apple sign-in is not enabled in this build. Rebuild the iOS dev client.");
        return;
      }

      if (isTimeout) {
        setError(
          "Apple sign-in timed out. On simulator, sign in to an Apple ID in Settings and try again.",
        );
        return;
      }

      if (code === "auth/operation-not-allowed") {
        setError("Apple sign-in is disabled in Firebase Auth.");
        return;
      }

      setError(authError instanceof Error ? authError.message : "Apple sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignup ? "Create Roadie Account" : "Roadie Login"}</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="Email"
        placeholderTextColor={palette.gray300}
        style={styles.input}
        testID="login-email"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={palette.gray300}
        style={styles.input}
        testID="login-password"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button mode="contained" onPress={handleEmailAuth} loading={loading} testID="login-submit">
        {isSignup ? "Sign Up" : "Log In"}
      </Button>

      <SocialLoginButton
        icon="google"
        label="Continue with Google"
        onPress={handleGoogleSignIn}
        disabled={loading}
        testID="google-submit"
        variant="light"
      />

      {Platform.OS === "ios" ? (
        <SocialLoginButton
          icon="apple"
          label="Continue with Apple"
          onPress={handleAppleSignIn}
          disabled={loading}
          testID="apple-submit"
          variant="dark"
        />
      ) : null}

      <Button onPress={() => setIsSignup((prev) => !prev)} disabled={loading} testID="toggle-signup">
        {isSignup ? "Already have an account? Log In" : "Need an account? Sign Up"}
      </Button>
    </View>
  );
};

export default LoginScreen;
