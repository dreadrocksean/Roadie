import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";

import ProfileScreen from "./ProfileScreen";
import { getDownloadURL, setDoc, uploadBytes } from "../../lib/firebase";
import { useRoadieStore } from "../../store/useRoadieStore";

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock("../../store/useRoadieStore", () => ({
  useRoadieStore: jest.fn(),
}));

jest.mock("@react-navigation/native", () => ({
  CommonActions: {
    reset: jest.fn((payload: unknown) => ({ type: "RESET", payload })),
  },
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    dispatch: mockDispatch,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("../../lib/firebase", () => ({
  FIREBASE_STORAGE: { id: "storage" },
  FIRESTORE_DB: { id: "db" },
  collection: jest.fn((_db, path: string) => ({ path })),
  doc: jest.fn((...args: any[]) => {
    if (args.length === 1 && args[0]?.path) {
      return {
        id: "generated-roadie-id",
        path: `${args[0].path}/generated-roadie-id`,
      };
    }

    const [_db, ...segments] = args;
    return {
      id: segments[segments.length - 1] ?? "generated-roadie-id",
      path: segments.join("/"),
    };
  }),
  ref: jest.fn((_storage, path: string) => ({ path })),
  serverTimestamp: jest.fn(() => "ts"),
  uploadBytes: jest.fn(async () => undefined),
  getDownloadURL: jest.fn(async () => "https://example.com/photo.jpg"),
  setDoc: jest.fn(async () => undefined),
}));

const useRoadieStoreMock = useRoadieStore as unknown as jest.Mock;
const requestMediaLibraryPermissionsAsyncMock = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launchImageLibraryAsyncMock = ImagePicker.launchImageLibraryAsync as jest.Mock;

const bindStore = (state: Record<string, unknown>) => {
  useRoadieStoreMock.mockImplementation((selector: (store: Record<string, unknown>) => unknown) =>
    selector(state),
  );
};

describe("ProfileScreen", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    global.fetch = jest.fn(async () => ({ blob: async () => "blob" as any })) as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("renders login prompt when user is missing", () => {
    bindStore({
      user: null,
      setUserProfile: jest.fn(),
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Profile")).toBeTruthy();
    expect(getByText(/Log in from the top-right menu/)).toBeTruthy();
  });

  it("closes to previous screen when close is pressed", () => {
    bindStore({
      user: { uid: "u1", roadieId: "r1" },
      setUserProfile: jest.fn(),
    });

    const { getByTestId } = render(<ProfileScreen />);
    fireEvent.press(getByTestId("profile-close"));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("closes to tabs map when no previous screen exists", () => {
    mockCanGoBack.mockReturnValueOnce(false);

    bindStore({
      user: { uid: "u1", roadieId: "r1" },
      setUserProfile: jest.fn(),
    });

    const { getByTestId } = render(<ProfileScreen />);
    fireEvent.press(getByTestId("profile-close"));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it("saves profile updates", async () => {
    const setUserProfileMock = jest.fn();

    bindStore({
      user: { uid: "u1", email: "u1@example.com", displayName: "Old", phone: "111", photoURL: null },
      setUserProfile: setUserProfileMock,
    });

    const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

    fireEvent.changeText(getByPlaceholderText("Display name"), "New Name");
    fireEvent.changeText(getByPlaceholderText("Phone"), "222");
    fireEvent.changeText(getByPlaceholderText("Bio"), "Road veteran");
    fireEvent.changeText(getByPlaceholderText("Address"), "123 Main St");
    fireEvent.press(getByText("Save Profile"));

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "roadies/u1" }),
        expect.objectContaining({
          userId: "u1",
          email: "u1@example.com",
          displayName: "New Name",
          phone: "222",
          bio: "Road veteran",
          address: "123 Main St",
        }),
        { merge: true },
      );
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "users/u1" }),
        expect.objectContaining({
          displayName: "New Name",
          phone: "222",
          bio: "Road veteran",
          address: "123 Main St",
          roadieId: "u1",
        }),
        { merge: true },
      );
      expect(setUserProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "New Name",
          phone: "222",
          bio: "Road veteran",
          address: "123 Main St",
          roadieId: "u1",
        }),
      );
    });
  });

  it("shows update profile label when roadie id already exists", () => {
    bindStore({
      user: { uid: "u1", roadieId: "r1" },
      setUserProfile: jest.fn(),
    });

    const { getByText, queryByText } = render(<ProfileScreen />);

    expect(getByText("Update Profile")).toBeTruthy();
    expect(queryByText("Save Profile")).toBeNull();
  });

  it("handles denied media permission", async () => {
    bindStore({
      user: { uid: "u1" },
      setUserProfile: jest.fn(),
    });

    requestMediaLibraryPermissionsAsyncMock.mockResolvedValueOnce({ granted: false });

    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Upload Photo"));

    await waitFor(() => {
      expect(getByText("Media permission is required to upload a profile image.")).toBeTruthy();
    });
  });

  it("exits image picker flow when canceled", async () => {
    bindStore({
      user: { uid: "u1" },
      setUserProfile: jest.fn(),
    });

    requestMediaLibraryPermissionsAsyncMock.mockResolvedValueOnce({ granted: true });
    launchImageLibraryAsyncMock.mockResolvedValueOnce({ canceled: true, assets: [] });

    const { getByText, queryByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Upload Photo"));

    await waitFor(() => {
      expect(uploadBytes).not.toHaveBeenCalled();
      expect(queryByText("Profile photo updated.")).toBeNull();
    });
  });

  it("uploads and stores profile image", async () => {
    bindStore({
      user: { uid: "u1" },
      setUserProfile: jest.fn(),
    });

    requestMediaLibraryPermissionsAsyncMock.mockResolvedValueOnce({ granted: true });
    launchImageLibraryAsyncMock.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://image.jpg" }],
    });

    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Upload Photo"));

    await waitFor(() => {
      expect(setDoc).not.toHaveBeenCalled();
      expect(uploadBytes).toHaveBeenCalledTimes(1);
      expect(uploadBytes).toHaveBeenCalledWith(
        expect.objectContaining({ path: "roadies/u1/profileImage.jpg" }),
        "blob",
      );
      expect(getDownloadURL).toHaveBeenCalledTimes(1);
      expect(getByText("Profile photo updated.")).toBeTruthy();
    });
  });

  it("stores profile image under existing roadie id path", async () => {
    bindStore({
      user: { uid: "u1", roadieId: "r99" },
      setUserProfile: jest.fn(),
    });

    requestMediaLibraryPermissionsAsyncMock.mockResolvedValueOnce({ granted: true });
    launchImageLibraryAsyncMock.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://image.jpg" }],
    });

    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Upload Photo"));

    await waitFor(() => {
      expect(uploadBytes).toHaveBeenCalledWith(
        expect.objectContaining({ path: "roadies/u1/profileImage.jpg" }),
        "blob",
      );
    });
  });

  it("shows upload error messages", async () => {
    bindStore({
      user: { uid: "u1" },
      setUserProfile: jest.fn(),
    });

    requestMediaLibraryPermissionsAsyncMock.mockResolvedValueOnce({ granted: true });
    launchImageLibraryAsyncMock.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://image.jpg" }],
    });
    (uploadBytes as jest.Mock).mockRejectedValueOnce(new Error("Upload failed"));

    const { getByText, findByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Upload Photo"));

    expect(await findByText("Upload failed")).toBeTruthy();
  });

  it("falls back upload error text for unknown errors", async () => {
    bindStore({
      user: { uid: "u1" },
      setUserProfile: jest.fn(),
    });

    requestMediaLibraryPermissionsAsyncMock.mockResolvedValueOnce({ granted: true });
    launchImageLibraryAsyncMock.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file://image.jpg" }],
    });
    (uploadBytes as jest.Mock).mockRejectedValueOnce("bad-upload");

    const { getByText, findByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Upload Photo"));

    expect(await findByText("Failed to upload photo.")).toBeTruthy();
  });

  it("shows save error messages", async () => {
    bindStore({
      user: { uid: "u1", displayName: "Old", phone: "111", photoURL: null },
      setUserProfile: jest.fn(),
    });

    (setDoc as jest.Mock).mockRejectedValueOnce(new Error("Save failed"));

    const { getByText, findByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Save Profile"));

    expect(await findByText("Save failed")).toBeTruthy();
  });

  it("falls back save error text for unknown errors", async () => {
    bindStore({
      user: { uid: "u1", displayName: "Old", phone: "111", photoURL: null },
      setUserProfile: jest.fn(),
    });

    (setDoc as jest.Mock).mockRejectedValueOnce("bad-save");

    const { getByText, findByText } = render(<ProfileScreen />);
    fireEvent.press(getByText("Save Profile"));

    expect(await findByText("Failed to save profile.")).toBeTruthy();
  });
});
