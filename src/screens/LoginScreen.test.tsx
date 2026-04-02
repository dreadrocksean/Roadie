import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import Constants from "expo-constants";
import { Platform } from "react-native";

import LoginScreen from "./LoginScreen";
import {
  createUserWithEmailAndPassword,
  OAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      googleExpoClientId: "expo-client",
      googleIosClientId: "ios-client",
      googleAndroidClientId: "android-client",
      googleWebClientId: "web-client",
    },
  },
}));

jest.mock("expo-auth-session/providers/google", () => ({
  useIdTokenAuthRequest: jest.fn(),
}));

jest.mock("expo-apple-authentication", () => ({
  AppleAuthenticationScope: {
    FULL_NAME: "full_name",
    EMAIL: "email",
  },
  signInAsync: jest.fn(),
}));

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "sha256" },
  getRandomBytesAsync: jest.fn(async () => new Uint8Array([1, 2, 3])),
  digestStringAsync: jest.fn(async () => "hashed"),
}));

const mockGoogleCredential = jest.fn((_idToken?: unknown, _accessToken?: unknown) => "google-credential");
const mockAppleCredential = jest.fn((_args?: unknown) => "apple-credential");

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(async () => undefined),
  signInWithEmailAndPassword: jest.fn(async () => undefined),
  signInWithCredential: jest.fn(async () => undefined),
  GoogleAuthProvider: {
    credential: (idToken?: unknown, accessToken?: unknown) =>
      mockGoogleCredential(idToken, accessToken),
  },
  OAuthProvider: jest.fn(() => ({
    credential: (args?: unknown) => mockAppleCredential(args),
  })),
}));

jest.mock("../lib/firebase", () => ({
  FIREBASE_AUTH: { currentUser: null },
}));

const useIdTokenAuthRequestMock = Google.useIdTokenAuthRequest as jest.Mock;
const createUserWithEmailAndPasswordMock = createUserWithEmailAndPassword as jest.Mock;
const signInWithEmailAndPasswordMock = signInWithEmailAndPassword as jest.Mock;
const signInWithCredentialMock = signInWithCredential as jest.Mock;
const signInAsyncMock = AppleAuthentication.signInAsync as jest.Mock;

describe("LoginScreen", () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { value: originalPlatform });
    (Constants as any).expoConfig = {
      extra: {
        googleExpoClientId: "expo-client",
        googleIosClientId: "ios-client",
        googleAndroidClientId: "android-client",
        googleWebClientId: "web-client",
      },
    };
    delete process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    useIdTokenAuthRequestMock.mockReturnValue([
      { id: "request" },
      null,
      jest.fn(async () => ({ type: "success" })),
    ]);
  });

  it("validates required email and password", async () => {
    const { getByTestId, findByText } = render(<LoginScreen />);

    fireEvent.press(getByTestId("login-submit"));

    expect(await findByText("Email and password are required.")).toBeTruthy();
  });

  it("logs in with email/password", async () => {
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email"), "user@example.com");
    fireEvent.changeText(getByTestId("login-password"), "password123");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() => {
      expect(signInWithEmailAndPasswordMock).toHaveBeenCalledWith(
        expect.anything(),
        "user@example.com",
        "password123",
      );
    });
  });

  it("signs up when toggled", async () => {
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.press(getByTestId("toggle-signup"));
    fireEvent.changeText(getByTestId("login-email"), "new@example.com");
    fireEvent.changeText(getByTestId("login-password"), "password123");
    fireEvent.press(getByTestId("login-submit"));

    await waitFor(() => {
      expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
        expect.anything(),
        "new@example.com",
        "password123",
      );
    });
  });

  it("handles google button when request is unavailable", async () => {
    useIdTokenAuthRequestMock.mockReturnValue([null, null, jest.fn()]);

    const { getByTestId, findByText } = render(<LoginScreen />);

    fireEvent.press(getByTestId("google-submit"));

    expect(await findByText("Google sign-in is not ready yet.")).toBeTruthy();
  });

  it("launches google prompt when request exists", async () => {
    const promptAsync = jest.fn(async () => ({ type: "success" }));
    useIdTokenAuthRequestMock.mockReturnValue([{ id: "request" }, null, promptAsync]);

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.press(getByTestId("google-submit"));

    await waitFor(() => {
      expect(promptAsync).toHaveBeenCalledTimes(1);
    });
  });

  it("handles google success response", async () => {
    useIdTokenAuthRequestMock.mockReturnValue([
      { id: "request" },
      {
        type: "success",
        params: { id_token: "id-token" },
        authentication: { accessToken: "access-token" },
      },
      jest.fn(),
    ]);

    render(<LoginScreen />);

    await waitFor(() => {
      expect(mockGoogleCredential).toHaveBeenCalledWith("id-token", "access-token");
      expect(signInWithCredentialMock).toHaveBeenCalledWith(expect.anything(), "google-credential");
    });
  });

  it("shows error when google response misses id token", async () => {
    useIdTokenAuthRequestMock.mockReturnValue([
      { id: "request" },
      {
        type: "success",
        params: {},
        authentication: { accessToken: "access-token" },
      },
      jest.fn(),
    ]);

    const { findByText } = render(<LoginScreen />);

    expect(await findByText("Google sign-in did not return an id token.")).toBeTruthy();
  });

  it("blocks apple sign-in on non-ios platforms", async () => {
    Object.defineProperty(Platform, "OS", { value: "android" });

    const { findByText } = render(<LoginScreen />);

    expect(await findByText("Roadie Login")).toBeTruthy();
    expect(signInAsyncMock).not.toHaveBeenCalled();
  });

  it("handles apple sign-in response without identity token", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    signInAsyncMock.mockResolvedValueOnce({ identityToken: null });

    const { getByTestId, findByText } = render(<LoginScreen />);

    fireEvent.press(getByTestId("apple-submit"));

    expect(await findByText("Apple sign-in did not return an identity token.")).toBeTruthy();
  });

  it("ignores canceled apple login errors", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    signInAsyncMock.mockRejectedValueOnce({ code: "ERR_CANCELLED" });

    const { getByTestId, queryByText } = render(<LoginScreen />);

    fireEvent.press(getByTestId("apple-submit"));

    await waitFor(() => {
      expect(queryByText("Apple sign-in failed.")).toBeNull();
    });
  });

  it("completes apple sign-in", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    signInAsyncMock.mockResolvedValueOnce({ identityToken: "apple-token" });

    const { getByTestId } = render(<LoginScreen />);

    fireEvent.press(getByTestId("apple-submit"));

    await waitFor(() => {
      expect(OAuthProvider).toHaveBeenCalledWith("apple.com");
      expect(mockAppleCredential).toHaveBeenCalledWith({
        idToken: "apple-token",
        rawNonce: "010203",
      });
      expect(signInWithCredentialMock).toHaveBeenCalledWith(expect.anything(), "apple-credential");
    });
  });

  it("uses trimmed env config values for google auth request", () => {
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID = "  env-expo-client  ";

    render(<LoginScreen />);

    expect(useIdTokenAuthRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "env-expo-client",
      }),
    );
  });

  it("falls back through ios, android, web, then missing google client ids", () => {
    const scenarios = [
      {
        extra: {
          googleExpoClientId: "",
          googleIosClientId: "ios-only",
          googleAndroidClientId: "",
          googleWebClientId: "",
        },
        expectedClientId: "ios-only",
      },
      {
        extra: {
          googleExpoClientId: "",
          googleIosClientId: "",
          googleAndroidClientId: "android-only",
          googleWebClientId: "",
        },
        expectedClientId: "android-only",
      },
      {
        extra: {
          googleExpoClientId: "",
          googleIosClientId: "",
          googleAndroidClientId: "",
          googleWebClientId: "web-only",
        },
        expectedClientId: "web-only",
      },
      {
        extra: undefined,
        expectedClientId: "missing",
      },
    ];

    scenarios.forEach(({ extra, expectedClientId }) => {
      useIdTokenAuthRequestMock.mockClear();
      (Constants as any).expoConfig = extra ? { extra } : {};

      const { unmount } = render(<LoginScreen />);
      expect(useIdTokenAuthRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: expectedClientId,
        }),
      );
      unmount();
    });
  });

  it("shows google sign-in error messages", async () => {
    useIdTokenAuthRequestMock.mockReturnValue([
      { id: "request" },
      {
        type: "success",
        params: { id_token: "id-token" },
        authentication: { accessToken: "access-token" },
      },
      jest.fn(),
    ]);
    signInWithCredentialMock.mockRejectedValueOnce(new Error("Google broke"));

    const { findByText } = render(<LoginScreen />);

    expect(await findByText("Google broke")).toBeTruthy();
  });

  it("falls back google sign-in error for unknown error values", async () => {
    useIdTokenAuthRequestMock.mockReturnValue([
      { id: "request" },
      {
        type: "success",
        params: { id_token: "id-token" },
        authentication: { accessToken: "access-token" },
      },
      jest.fn(),
    ]);
    signInWithCredentialMock.mockRejectedValueOnce("google-failed");

    const { findByText } = render(<LoginScreen />);

    expect(await findByText("Google sign-in failed.")).toBeTruthy();
  });

  it("shows email auth error messages", async () => {
    signInWithEmailAndPasswordMock.mockRejectedValueOnce(new Error("Email login failed"));

    const { getByTestId, findByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email"), "user@example.com");
    fireEvent.changeText(getByTestId("login-password"), "password123");
    fireEvent.press(getByTestId("login-submit"));

    expect(await findByText("Email login failed")).toBeTruthy();
  });

  it("falls back email auth errors for unknown values", async () => {
    signInWithEmailAndPasswordMock.mockRejectedValueOnce("email-failed");

    const { getByTestId, findByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email"), "user@example.com");
    fireEvent.changeText(getByTestId("login-password"), "password123");
    fireEvent.press(getByTestId("login-submit"));

    expect(await findByText("Authentication failed.")).toBeTruthy();
  });

  it("blocks apple sign-in if platform changes away from iOS", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });

    const { getByTestId, findByText } = render(<LoginScreen />);

    Object.defineProperty(Platform, "OS", { value: "android" });
    fireEvent.press(getByTestId("apple-submit"));

    expect(await findByText("Apple sign-in is only available on iOS.")).toBeTruthy();
    expect(signInAsyncMock).not.toHaveBeenCalled();
  });

  it("shows apple sign-in error messages for Error values", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    signInAsyncMock.mockRejectedValueOnce(new Error("Apple exploded"));

    const { getByTestId, findByText } = render(<LoginScreen />);
    fireEvent.press(getByTestId("apple-submit"));

    expect(await findByText("Apple exploded")).toBeTruthy();
  });

  it("falls back apple sign-in error for unknown values", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    signInAsyncMock.mockRejectedValueOnce({ code: "ERR_UNKNOWN" });

    const { getByTestId, findByText } = render(<LoginScreen />);
    fireEvent.press(getByTestId("apple-submit"));

    expect(await findByText("Apple sign-in failed.")).toBeTruthy();
  });
});
