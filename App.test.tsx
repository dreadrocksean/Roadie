import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import App from "./App";
import { onAuthStateChanged } from "firebase/auth";
import { ensureUserDocument } from "./src/lib/firebase";
import {
  registerForPushNotificationsAsync,
  setupNotificationHandler,
} from "./src/services/pushNotifications";
import { useRoadieStore } from "./src/store/useRoadieStore";

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock("./src/lib/firebase", () => ({
  FIREBASE_AUTH: { id: "auth" },
  ensureUserDocument: jest.fn(async () => undefined),
}));

jest.mock("./src/services/pushNotifications", () => ({
  registerForPushNotificationsAsync: jest.fn(async () => undefined),
  setupNotificationHandler: jest.fn(),
}));

jest.mock("./src/navigation/RootNavigator", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return <Text>ROOT_NAVIGATOR</Text>;
});

jest.mock("./src/store/useRoadieStore", () => ({
  useRoadieStore: jest.fn(),
}));

const onAuthStateChangedMock = onAuthStateChanged as jest.Mock;
const ensureUserDocumentMock = ensureUserDocument as jest.Mock;
const registerForPushNotificationsAsyncMock = registerForPushNotificationsAsync as jest.Mock;
const setupNotificationHandlerMock = setupNotificationHandler as jest.Mock;
const useRoadieStoreMock = useRoadieStore as unknown as jest.Mock;

const bindStore = (state: Record<string, unknown>) => {
  useRoadieStoreMock.mockImplementation((selector: (store: Record<string, unknown>) => unknown) =>
    selector(state),
  );
};

describe("App", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      callback(null);
      return jest.fn();
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("shows loader while auth is not ready", () => {
    bindStore({
      authReady: false,
      user: null,
      setAuthReady: jest.fn(),
      setUser: jest.fn(),
      refreshShows: jest.fn(),
    });

    const { getByTestId } = render(<App />);

    expect(getByTestId("app-loading")).toBeTruthy();
  });

  it("renders navigator when auth is ready and refreshes shows", async () => {
    const refreshShows = jest.fn(async () => undefined);

    bindStore({
      authReady: true,
      user: { uid: "u1" },
      setAuthReady: jest.fn(),
      setUser: jest.fn(),
      refreshShows,
    });

    const { getByText } = render(<App />);

    expect(getByText("ROOT_NAVIGATOR")).toBeTruthy();
    expect(setupNotificationHandlerMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(refreshShows).toHaveBeenCalledTimes(1);
    });
  });

  it("does not refresh shows when auth is ready but user is logged out", async () => {
    const refreshShows = jest.fn(async () => undefined);

    bindStore({
      authReady: true,
      user: null,
      setAuthReady: jest.fn(),
      setUser: jest.fn(),
      refreshShows,
    });

    render(<App />);

    await waitFor(() => {
      expect(refreshShows).not.toHaveBeenCalled();
    });
  });

  it("handles auth state changes and push registration", async () => {
    const setUser = jest.fn();
    const setAuthReady = jest.fn();

    let capturedCallback: ((user: any) => Promise<void>) | undefined;
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    bindStore({
      authReady: true,
      user: { uid: "u1" },
      setAuthReady,
      setUser,
      refreshShows: jest.fn(async () => undefined),
    });

    render(<App />);

    await capturedCallback?.({
      uid: "u1",
      email: "roadie@example.com",
      displayName: "Roadie",
      phoneNumber: "555-1111",
      photoURL: "https://photo",
    });

    expect(ensureUserDocumentMock).toHaveBeenCalledTimes(1);
    expect(registerForPushNotificationsAsyncMock).toHaveBeenCalledWith("u1");
    expect(setUser).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "u1", displayName: "Roadie" }),
    );
    expect(setAuthReady).toHaveBeenCalledWith(true);

    await capturedCallback?.(null);
    expect(setUser).toHaveBeenCalledWith(null);
  });

  it("logs auth callback errors for copy-paste debugging", async () => {
    const setUser = jest.fn();
    const setAuthReady = jest.fn();

    let capturedCallback: ((user: any) => Promise<void>) | undefined;
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    ensureUserDocumentMock.mockRejectedValueOnce(new Error("auth-bootstrap-failed"));

    bindStore({
      authReady: true,
      user: null,
      setAuthReady,
      setUser,
      refreshShows: jest.fn(async () => undefined),
    });

    render(<App />);

    await capturedCallback?.({
      uid: "u2",
      email: "roadie2@example.com",
      displayName: "Roadie Two",
      phoneNumber: "555-2222",
      photoURL: null,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Roadie][onAuthStateChanged.ensureUserDocument]",
      expect.objectContaining({
        message: "auth-bootstrap-failed",
        uid: "u2",
      }),
    );
    expect(setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "u2",
      }),
    );
    expect(setAuthReady).toHaveBeenCalledWith(true);
  });

  it("logs auth callback errors when observer callback runs immediately", async () => {
    const setUser = jest.fn();
    const setAuthReady = jest.fn();

    ensureUserDocumentMock.mockRejectedValueOnce(new Error("immediate-auth-failure"));
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      void callback({
        uid: "u3",
        email: "roadie3@example.com",
        displayName: "Roadie Three",
        phoneNumber: "555-3333",
        photoURL: null,
      });
      return jest.fn();
    });

    bindStore({
      authReady: true,
      user: null,
      setAuthReady,
      setUser,
      refreshShows: jest.fn(async () => undefined),
    });

    render(<App />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Roadie][onAuthStateChanged.ensureUserDocument]",
        expect.objectContaining({
          message: "immediate-auth-failure",
          uid: "u3",
        }),
      );
    });
  });

  it("logs non-error auth callback failures as strings", async () => {
    const setUser = jest.fn();
    const setAuthReady = jest.fn();

    let capturedCallback: ((user: any) => Promise<void>) | undefined;
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    ensureUserDocumentMock.mockRejectedValueOnce("auth-failed-string");

    bindStore({
      authReady: true,
      user: null,
      setAuthReady,
      setUser,
      refreshShows: jest.fn(async () => undefined),
    });

    render(<App />);

    await capturedCallback?.({
      uid: "u4",
      email: "roadie4@example.com",
      displayName: "Roadie Four",
      phoneNumber: "555-4444",
      photoURL: null,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Roadie][onAuthStateChanged.ensureUserDocument]",
      expect.objectContaining({
        name: "Error",
        message: "auth-failed-string",
        stack: undefined,
        uid: "u4",
      }),
    );
  });

  it("logs auth callback errors with null uid when failure happens in signed-out branch", async () => {
    const setUser = jest.fn(() => {
      throw new Error("set-user-null-failed");
    });
    const setAuthReady = jest.fn();

    let capturedCallback: ((user: any) => Promise<void>) | undefined;
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    bindStore({
      authReady: true,
      user: null,
      setAuthReady,
      setUser,
      refreshShows: jest.fn(async () => undefined),
    });

    render(<App />);

    await capturedCallback?.(null);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Roadie][onAuthStateChanged.setUser]",
      expect.objectContaining({
        message: "set-user-null-failed",
        uid: null,
      }),
    );
  });

  it("logs push registration failures but keeps user signed in", async () => {
    const setUser = jest.fn();
    const setAuthReady = jest.fn();

    let capturedCallback: ((user: any) => Promise<void>) | undefined;
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    registerForPushNotificationsAsyncMock.mockRejectedValueOnce(new Error("push-registration-failed"));

    bindStore({
      authReady: true,
      user: null,
      setAuthReady,
      setUser,
      refreshShows: jest.fn(async () => undefined),
    });

    render(<App />);

    await capturedCallback?.({
      uid: "u5",
      email: "roadie5@example.com",
      displayName: "Roadie Five",
      phoneNumber: "555-5555",
      photoURL: null,
    });

    expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ uid: "u5" }));
    expect(setAuthReady).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Roadie][onAuthStateChanged.registerPush]",
        expect.objectContaining({
          message: "push-registration-failed",
          uid: "u5",
        }),
      );
    });
  });
});
