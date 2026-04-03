import * as Location from "expo-location";

import { sendLocalAwardNotification } from "../services/pushNotifications";
import { acceptRoadieJob, fetchRoadieShows, subscribeRoadieShows } from "../services/roadie";
import { useRoadieStore } from "./useRoadieStore";

let mockIsDevice = true;

jest.mock("expo-location", () => ({
  Accuracy: {
    Balanced: "balanced",
  },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock("expo-device", () => ({
  get isDevice() {
    return mockIsDevice;
  },
}));

jest.mock("../services/roadie", () => ({
  fetchRoadieShows: jest.fn(),
  subscribeRoadieShows: jest.fn(),
  acceptRoadieJob: jest.fn(async () => undefined),
}));

jest.mock("../services/pushNotifications", () => ({
  sendLocalAwardNotification: jest.fn(async () => undefined),
}));

const requestForegroundPermissionsAsyncMock = Location.requestForegroundPermissionsAsync as jest.Mock;
const getCurrentPositionAsyncMock = Location.getCurrentPositionAsync as jest.Mock;
const fetchRoadieShowsMock = fetchRoadieShows as jest.Mock;
const subscribeRoadieShowsMock = subscribeRoadieShows as jest.Mock;
const acceptRoadieJobMock = acceptRoadieJob as jest.Mock;
const sendLocalAwardNotificationMock = sendLocalAwardNotification as jest.Mock;
let consoleErrorSpy: jest.SpyInstance;

const resetStore = () => {
  useRoadieStore.setState({
    user: null,
    authReady: false,
    location: { lat: 41.8781, lng: -87.6298 },
    locationError: null,
    shows: [],
    isLoadingShows: false,
    selectedShow: null,
    acceptedShowPaths: [],
    awardedShowPaths: [],
    showsUnsubscribe: null,
    error: null,
  });
};

describe("useRoadieStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDevice = true;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    resetStore();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("initializes default location when permission is denied", async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValueOnce({ status: "denied" });

    const location = await useRoadieStore.getState().initializeLocation();

    expect(location).toEqual({ lat: 41.8781, lng: -87.6298 });
    expect(useRoadieStore.getState().locationError).toContain("Location permission denied");
  });

  it("initializes Kansas City location on simulator builds", async () => {
    mockIsDevice = false;

    const location = await useRoadieStore.getState().initializeLocation();

    expect(location).toEqual({ lat: 39.0997, lng: -94.5786 });
    expect(useRoadieStore.getState().locationError).toBeNull();
    expect(requestForegroundPermissionsAsyncMock).not.toHaveBeenCalled();
    expect(getCurrentPositionAsyncMock).not.toHaveBeenCalled();
  });

  it("initializes live location when permission is granted", async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValueOnce({ status: "granted" });
    getCurrentPositionAsyncMock.mockResolvedValueOnce({
      coords: { latitude: 35.1, longitude: -89.9 },
    });

    const location = await useRoadieStore.getState().initializeLocation();

    expect(location).toEqual({ lat: 35.1, lng: -89.9 });
    expect(useRoadieStore.getState().locationError).toBeNull();
  });

  it("refreshes shows and sends awarded notifications once", async () => {
    useRoadieStore.getState().setUser({ uid: "u1" });
    fetchRoadieShowsMock.mockResolvedValue([
      {
        id: "s1",
        path: "artists/a/shows/s1",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: { id: "v1", name: "The Metro" },
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        roadieApplicants: {
          u1: { uid: "u1", status: "awarded" },
        },
      },
      {
        id: "s2",
        path: "artists/a/shows/s2",
        requiredRoadies: 2,
        distanceMiles: 2,
        venue: { id: "v2", name: "The Vic" },
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        roadieApplicants: {
          u1: { uid: "u1", status: "accepted" },
        },
      },
    ]);

    await useRoadieStore.getState().refreshShows();
    expect(fetchRoadieShowsMock).toHaveBeenCalledWith(
      { lat: 41.8781, lng: -87.6298 },
      30,
      expect.objectContaining({ includeVenueDetails: true, includeArtistDetails: true }),
    );

    expect(useRoadieStore.getState().awardedShowPaths).toEqual(["artists/a/shows/s1"]);
    expect(useRoadieStore.getState().acceptedShowPaths).toEqual([
      "artists/a/shows/s1",
      "artists/a/shows/s2",
    ]);
    expect(sendLocalAwardNotificationMock).toHaveBeenCalledWith("The Metro");

    await useRoadieStore.getState().refreshShows();
    expect(sendLocalAwardNotificationMock).toHaveBeenCalledTimes(1);
  });

  it("stores error when refresh fails", async () => {
    fetchRoadieShowsMock.mockRejectedValueOnce(new Error("boom"));

    await useRoadieStore.getState().refreshShows();

    expect(useRoadieStore.getState().error).toBe("boom");
    expect(useRoadieStore.getState().isLoadingShows).toBe(false);
  });

  it("starts a realtime shows listener and applies updates", async () => {
    useRoadieStore.getState().setUser({ uid: "u1" });

    let onShows: ((shows: any[]) => Promise<void> | void) | undefined;
    const unsubscribeMock = jest.fn();

    subscribeRoadieShowsMock.mockImplementation((_center, _radius, callback) => {
      onShows = callback;
      return unsubscribeMock;
    });

    await useRoadieStore.getState().startShowsListener();

    expect(subscribeRoadieShowsMock).toHaveBeenCalledWith(
      { lat: 41.8781, lng: -87.6298 },
      30,
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ includeVenueDetails: true, includeArtistDetails: true }),
    );
    expect(useRoadieStore.getState().showsUnsubscribe).toBe(unsubscribeMock);
    expect(useRoadieStore.getState().isLoadingShows).toBe(true);

    await onShows?.([
      {
        id: "live-1",
        path: "artists/a/shows/live-1",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: { id: "v1", name: "Live Venue" },
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        roadieApplicants: { u1: { uid: "u1", status: "awarded" } },
      },
    ]);

    expect(useRoadieStore.getState().shows).toHaveLength(1);
    expect(useRoadieStore.getState().awardedShowPaths).toEqual(["artists/a/shows/live-1"]);
    expect(useRoadieStore.getState().acceptedShowPaths).toEqual(["artists/a/shows/live-1"]);
    expect(sendLocalAwardNotificationMock).toHaveBeenCalledWith("Live Venue");
    expect(useRoadieStore.getState().isLoadingShows).toBe(false);
  });

  it("initializes location before starting listener when location is missing", async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValueOnce({ status: "granted" });
    getCurrentPositionAsyncMock.mockResolvedValueOnce({
      coords: { latitude: 39.95, longitude: -75.16 },
    });
    subscribeRoadieShowsMock.mockReturnValue(jest.fn());

    useRoadieStore.setState({ location: null as any });

    await useRoadieStore.getState().startShowsListener();

    expect(subscribeRoadieShowsMock).toHaveBeenCalledWith(
      { lat: 39.95, lng: -75.16 },
      30,
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ includeVenueDetails: true, includeArtistDetails: true }),
    );
  });

  it("stops an existing shows listener before starting a new one", async () => {
    const firstUnsubscribe = jest.fn();
    const secondUnsubscribe = jest.fn();

    subscribeRoadieShowsMock
      .mockReturnValueOnce(firstUnsubscribe)
      .mockReturnValueOnce(secondUnsubscribe);

    await useRoadieStore.getState().startShowsListener();
    await useRoadieStore.getState().startShowsListener();

    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    expect(useRoadieStore.getState().showsUnsubscribe).toBe(secondUnsubscribe);
  });

  it("stores listener errors from realtime subscription callbacks", async () => {
    subscribeRoadieShowsMock.mockImplementation((_center, _radius, _onShows, onError) => {
      onError?.(new Error("listener-error"));
      return jest.fn();
    });

    await useRoadieStore.getState().startShowsListener();

    expect(useRoadieStore.getState().error).toBe("listener-error");
    expect(useRoadieStore.getState().isLoadingShows).toBe(false);
  });

  it("stores fallback listener callback errors for non-error values", async () => {
    subscribeRoadieShowsMock.mockImplementation((_center, _radius, _onShows, onError) => {
      onError?.("listener-non-error" as unknown as Error);
      return jest.fn();
    });

    await useRoadieStore.getState().startShowsListener();

    expect(useRoadieStore.getState().error).toBe("Failed to listen for roadie shows.");
    expect(useRoadieStore.getState().isLoadingShows).toBe(false);
  });

  it("stores listener setup error messages for Error values", async () => {
    subscribeRoadieShowsMock.mockImplementation(() => {
      throw new Error("listener-setup-error");
    });

    await useRoadieStore.getState().startShowsListener();

    expect(useRoadieStore.getState().error).toBe("listener-setup-error");
    expect(useRoadieStore.getState().isLoadingShows).toBe(false);
  });

  it("stores fallback listener errors when subscription setup throws", async () => {
    subscribeRoadieShowsMock.mockImplementation(() => {
      throw "listener-setup-failed";
    });

    await useRoadieStore.getState().startShowsListener();

    expect(useRoadieStore.getState().error).toBe("Failed to listen for roadie shows.");
    expect(useRoadieStore.getState().isLoadingShows).toBe(false);
  });

  it("stops and clears the realtime shows listener", async () => {
    const unsubscribeMock = jest.fn();
    useRoadieStore.setState({ showsUnsubscribe: unsubscribeMock });

    useRoadieStore.getState().stopShowsListener();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(useRoadieStore.getState().showsUnsubscribe).toBeNull();
  });

  it("no-ops when stopping listener without an active subscription", () => {
    useRoadieStore.setState({ showsUnsubscribe: null });
    useRoadieStore.getState().stopShowsListener();

    expect(useRoadieStore.getState().showsUnsubscribe).toBeNull();
  });

  it("requires login before accepting a selected show", async () => {
    useRoadieStore.setState({
      selectedShow: {
        id: "s1",
        path: "artists/a/shows/s1",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      } as any,
    });

    const success = await useRoadieStore.getState().acceptSelectedShow();

    expect(success).toBe(false);
    expect(useRoadieStore.getState().error).toContain("logged in");
  });

  it("accepts a show and updates local state", async () => {
    useRoadieStore.setState({
      user: { uid: "u1", displayName: "Roadie" },
      selectedShow: {
        id: "s1",
        path: "artists/a/shows/s1",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      } as any,
      shows: [
        {
          id: "s1",
          path: "artists/a/shows/s1",
          requiredRoadies: 1,
          distanceMiles: 1,
          venue: null,
          artist: null,
          coordinates: { lat: 1, lng: 1 },
        },
      ] as any,
    });

    const success = await useRoadieStore.getState().acceptSelectedShow();

    expect(success).toBe(true);
    expect(acceptRoadieJobMock).toHaveBeenCalledTimes(1);
    expect(useRoadieStore.getState().selectedShow).toBeNull();
    expect(useRoadieStore.getState().acceptedShowPaths).toEqual(["artists/a/shows/s1"]);
  });

  it("handles accept errors", async () => {
    acceptRoadieJobMock.mockRejectedValueOnce(new Error("accept-failed"));

    useRoadieStore.setState({
      user: { uid: "u1" },
      selectedShow: {
        id: "s2",
        path: "artists/a/shows/s2",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      } as any,
    });

    const success = await useRoadieStore.getState().acceptSelectedShow();

    expect(success).toBe(false);
    expect(useRoadieStore.getState().error).toBe("accept-failed");
  });

  it("supports simple state setters and profile merge/no-op behavior", () => {
    useRoadieStore.getState().setAuthReady(true);
    expect(useRoadieStore.getState().authReady).toBe(true);

    const selectedShow = {
      id: "s3",
      path: "artists/a/shows/s3",
      requiredRoadies: 1,
      distanceMiles: 1,
      venue: null,
      artist: null,
      coordinates: { lat: 1, lng: 1 },
    } as any;

    useRoadieStore.getState().setSelectedShow(selectedShow);
    expect(useRoadieStore.getState().selectedShow).toEqual(selectedShow);

    useRoadieStore.getState().setUserProfile({ displayName: "No user yet" });
    expect(useRoadieStore.getState().user).toBeNull();

    useRoadieStore.getState().setUser({ uid: "u9", displayName: "Before" });
    useRoadieStore.getState().setUserProfile({ phone: "555-0000" });
    expect(useRoadieStore.getState().user).toEqual({
      uid: "u9",
      displayName: "Before",
      phone: "555-0000",
    });
  });

  it("initializes location during refresh when location is missing", async () => {
    requestForegroundPermissionsAsyncMock.mockResolvedValueOnce({ status: "granted" });
    getCurrentPositionAsyncMock.mockResolvedValueOnce({
      coords: { latitude: 36.2, longitude: -86.7 },
    });
    fetchRoadieShowsMock.mockResolvedValueOnce([]);

    useRoadieStore.setState({
      location: null as any,
      user: null,
    });

    await useRoadieStore.getState().refreshShows();

    expect(fetchRoadieShowsMock).toHaveBeenCalledWith(
      { lat: 36.2, lng: -86.7 },
      30,
      expect.objectContaining({ includeVenueDetails: true, includeArtistDetails: true }),
    );
    expect(useRoadieStore.getState().awardedShowPaths).toEqual([]);
    expect(useRoadieStore.getState().acceptedShowPaths).toEqual([]);
  });

  it("uses fallback titles for awarded notifications", async () => {
    useRoadieStore.getState().setUser({ uid: "u1" });
    fetchRoadieShowsMock.mockResolvedValueOnce([
      {
        id: "s10",
        path: "artists/a/shows/s10",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: null,
        venueName: "Venue Name",
        bandName: "Band Name",
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        roadieApplicants: { u1: { uid: "u1", status: "awarded" } },
      },
      {
        id: "s11",
        path: "artists/a/shows/s11",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: null,
        bandName: "Band Name 2",
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        roadieApplicants: { u1: { uid: "u1", status: "awarded" } },
      },
      {
        id: "s12",
        path: "artists/a/shows/s12",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        roadieApplicants: { u1: { uid: "u1", status: "awarded" } },
      },
    ]);

    await useRoadieStore.getState().refreshShows();

    expect(sendLocalAwardNotificationMock).toHaveBeenNthCalledWith(1, "Venue Name");
    expect(sendLocalAwardNotificationMock).toHaveBeenNthCalledWith(2, "Band Name 2");
    expect(sendLocalAwardNotificationMock).toHaveBeenNthCalledWith(3, "Roadie show");
  });

  it("stores fallback error when refresh fails with a non-error value", async () => {
    fetchRoadieShowsMock.mockRejectedValueOnce("not-an-error");

    await useRoadieStore.getState().refreshShows();

    expect(useRoadieStore.getState().error).toBe("Failed to refresh roadie shows.");
  });

  it("accepts selected show with fallback user fields and leaves other shows untouched", async () => {
    useRoadieStore.setState({
      user: { uid: "u2" },
      selectedShow: {
        id: "s20",
        path: "artists/a/shows/s20",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      } as any,
      shows: [
        {
          id: "s20",
          path: "artists/a/shows/s20",
          requiredRoadies: 1,
          distanceMiles: 1,
          venue: null,
          artist: null,
          coordinates: { lat: 1, lng: 1 },
        },
        {
          id: "s21",
          path: "artists/a/shows/s21",
          requiredRoadies: 1,
          distanceMiles: 1,
          venue: null,
          artist: null,
          coordinates: { lat: 1, lng: 1 },
        },
      ] as any,
    });

    const success = await useRoadieStore.getState().acceptSelectedShow();

    expect(success).toBe(true);
    const nextShows = useRoadieStore.getState().shows;
    expect(nextShows[0].roadieApplicants?.u2).toEqual(
      expect.objectContaining({
        displayName: "",
        email: "",
        phone: "",
      }),
    );
    expect(nextShows[1].roadieApplicants).toBeUndefined();
  });

  it("stores fallback error when accept fails with a non-error value", async () => {
    acceptRoadieJobMock.mockRejectedValueOnce("accept-non-error");

    useRoadieStore.setState({
      user: { uid: "u1" },
      selectedShow: {
        id: "s30",
        path: "artists/a/shows/s30",
        requiredRoadies: 1,
        distanceMiles: 1,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      } as any,
    });

    const success = await useRoadieStore.getState().acceptSelectedShow();

    expect(success).toBe(false);
    expect(useRoadieStore.getState().error).toBe("Failed to accept roadie job.");
  });
});
