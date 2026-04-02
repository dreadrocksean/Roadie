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
  beforeEach(() => {
    jest.clearAllMocks();
    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      callback(null);
      return jest.fn();
    });
  });

  it("shows loader while auth is not ready", () => {
    bindStore({
      authReady: false,
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
});
