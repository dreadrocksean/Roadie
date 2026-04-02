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
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "react-native-paper";

import { FIREBASE_AUTH } from "../lib/firebase";

WebBrowser.maybeCompleteAuthSession();

const getConfigValue = (primary?: string, fallback?: string) => {
  const first = primary?.trim();
  if (first) return first;
  const second = fallback?.trim();
  return second || undefined;
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
    style={[styles.socialAuthButton, variant === "dark" ? styles.socialAuthButtonDark : styles.socialAuthButtonLight]}
    testID={testID}
  >
    <View style={styles.socialAuthContent}>
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={variant === "dark" ? "#FFFFFF" : "#111827"}
      />
      <Text style={[styles.socialAuthLabel, variant === "dark" ? styles.socialAuthLabelDark : styles.socialAuthLabelLight]}>
        {label}
      </Text>
    </View>
  </Pressable>
);

const LoginScreen = () => {
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
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
    };

    void finishGoogleSignIn();
  }, [googleResponse]);

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
      const rawNonce = Array.from(await Crypto.getRandomBytesAsync(16))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

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
    } catch (authError) {
      const code = (authError as { code?: string })?.code;
      if (code !== "ERR_CANCELED" && code !== "ERR_CANCELLED") {
        setError(authError instanceof Error ? authError.message : "Apple sign-in failed.");
      }
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
        style={styles.input}
        testID="login-email"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
    backgroundColor: "#F5F5F7",
  },
  title: {
    fontSize: 27,
    fontWeight: "700",
    marginBottom: 16,
    color: "#101820",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D0D5DD",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  socialAuthButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  socialAuthButtonLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D5DD",
  },
  socialAuthButtonDark: {
    backgroundColor: "#101820",
  },
  socialAuthContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  socialAuthLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  socialAuthLabelLight: {
    color: "#111827",
  },
  socialAuthLabelDark: {
    color: "#FFFFFF",
  },
  errorText: {
    color: "#B42323",
    marginBottom: 8,
  },
});

export default LoginScreen;
