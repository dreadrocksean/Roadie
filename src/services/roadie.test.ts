import { acceptRoadieJob, fetchRoadieShows, subscribeRoadieShows } from "./roadie";
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "../lib/firebase";

jest.mock("../lib/firebase", () => ({
  FIRESTORE_DB: { id: "db" },
  collectionGroup: jest.fn(() => "collection-group"),
  doc: jest.fn((_db, ...segments: string[]) => ({ path: segments.join("/") })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(() => "query"),
  serverTimestamp: jest.fn(() => "ts"),
  updateDoc: jest.fn(async () => undefined),
  where: jest.fn(() => "where"),
}));

const getDocMock = getDoc as jest.Mock;
const getDocsMock = getDocs as jest.Mock;
const onSnapshotMock = onSnapshot as jest.Mock;
let consoleErrorSpy: jest.SpyInstance;

describe("roadie service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    getDocsMock.mockResolvedValue({
      docs: [
        {
          id: "show-1",
          ref: { path: "artists/a1/shows/show-1" },
          data: () => ({
            roadies: true,
            venueId: "venue-1",
            artistId: "artist-1",
            totalRoadies: 3,
            bookedRoadies: 1,
            bandName: "Beta",
            lat: 41.9,
            lng: -87.63,
          }),
        },
        {
          id: "show-2",
          ref: { path: "artists/a2/shows/show-2" },
          data: () => ({
            roadies: true,
            venueId: "venue-2",
            artistId: "artist-2",
            totalRoadies: 4,
            roadiesBooked: 0,
            artistName: "Alpha",
            lat: 41.9,
            lng: -87.63,
          }),
        },
        {
          id: "show-3",
          ref: { path: "artists/a3/shows/show-3" },
          data: () => ({
            roadies: true,
            venueId: "venue-3",
            artistId: "artist-3",
            totalRoadies: 1,
            bookedRoadies: 0,
          }),
        },
        {
          id: "show-4",
          ref: { path: "artists/a4/shows/show-4" },
          data: () => ({
            roadies: true,
            venueId: "venue-4",
            artistId: "artist-4",
            totalRoadies: 5,
            bookedRoadies: 1,
            lat: 30,
            lng: -110,
          }),
        },
        {
          id: "show-5",
          ref: { path: "artists/a5/shows/show-5" },
          data: () => ({
            roadies: true,
            totalRoadies: 2,
            bookedRoadies: 0,
            bandName: "Location Band",
            location: {
              latitude: 41.905,
              longitude: -87.635,
            },
          }),
        },
        {
          id: "show-6",
          ref: { path: "artists/a6/shows/show-6" },
          data: () => ({
            roadies: true,
            venueId: "venue-missing",
            artistId: "artist-missing",
            totalRoadies: 1,
            bookedRoadies: 0,
            bandName: "No Coordinates",
          }),
        },
      ],
    });

    getDocMock.mockImplementation(async ({ path }: { path: string }) => {
      if (path === "venues/venue-1") {
        return {
          id: "venue-1",
          exists: () => true,
          data: () => ({ name: "V1", latitude: 41.9, longitude: -87.63 }),
        };
      }
      if (path === "venues/venue-2") {
        return {
          id: "venue-2",
          exists: () => true,
          data: () => ({ name: "V2", latitude: 41.9, longitude: -87.63 }),
        };
      }
      if (path === "venues/venue-3") {
        return {
          id: "venue-3",
          exists: () => true,
          data: () => ({ name: "V3", geocodes: { main: { latitude: 41.91, longitude: -87.62 } } }),
        };
      }
      if (path === "venues/venue-4") {
        return {
          id: "venue-4",
          exists: () => true,
          data: () => ({ name: "V4", latitude: 30, longitude: -110 }),
        };
      }

      if (path === "artists/artist-1") {
        return {
          id: "artist-1",
          exists: () => true,
          data: () => ({ name: "Artist One", phone: "111" }),
        };
      }
      if (path === "artists/artist-2") {
        return {
          id: "artist-2",
          exists: () => true,
          data: () => ({ name: "Artist Two", phone: "222" }),
        };
      }
      if (path === "artists/artist-3") {
        return {
          id: "artist-3",
          exists: () => true,
          data: () => ({ name: "Artist Three", phone: "333" }),
        };
      }

      return {
        id: "missing",
        exists: () => false,
        data: () => ({}),
      };
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("loads and hydrates roadie shows within radius", async () => {
    const results = await fetchRoadieShows({ lat: 41.9, lng: -87.63 }, 30);

    expect(collectionGroup).toHaveBeenCalledWith({ id: "db" }, "shows");
    expect(where).toHaveBeenCalledWith("roadies", "==", true);
    expect(query).toHaveBeenCalledWith("collection-group", "where");
    expect(getDocs).toHaveBeenCalledWith("query");

    expect(results.map((show) => show.id)).toEqual(["show-2", "show-1", "show-5", "show-3"]);
    expect(results[0].requiredRoadies).toBe(4);
    expect(results[2].coordinates).toEqual({ lat: 41.905, lng: -87.635 });
    expect(results[3].coordinates).toEqual({ lat: 41.91, lng: -87.62 });
  });

  it("can skip venue detail hydration when venue reads are restricted", async () => {
    const results = await fetchRoadieShows(
      { lat: 41.9, lng: -87.63 },
      30,
      { includeVenueDetails: false, includeArtistDetails: true },
    );

    expect(results.map((show) => show.id)).toEqual(["show-2", "show-1", "show-5"]);
    expect(results[0].venue).toBeNull();
    expect(results[0].artist).toEqual(expect.objectContaining({ id: "artist-2" }));
  });

  it("can skip artist detail hydration when artist reads are restricted", async () => {
    const results = await fetchRoadieShows(
      { lat: 41.9, lng: -87.63 },
      30,
      { includeVenueDetails: true, includeArtistDetails: false },
    );

    expect(results.map((show) => show.id)).toEqual(["show-2", "show-1", "show-5", "show-3"]);
    expect(results[0].artist).toBeNull();
    expect(results[0].venue).toEqual(expect.objectContaining({ id: "venue-2" }));
  });

  it("logs venue lookup failures and continues hydrating shows", async () => {
    getDocMock.mockImplementationOnce(async () => {
      throw Object.assign(new Error("Missing or insufficient permissions"), {
        code: "permission-denied",
      });
    });

    const results = await fetchRoadieShows({ lat: 41.9, lng: -87.63 }, 30);

    expect(results.length).toBeGreaterThan(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Roadie][getVenueById]",
      expect.objectContaining({
        code: "permission-denied",
        message: "Missing or insufficient permissions",
      }),
    );
  });

  it("logs artist lookup failures and continues hydrating shows", async () => {
    const baseGetDocImpl = getDocMock.getMockImplementation();

    getDocMock.mockImplementation(async ({ path }: { path: string }) => {
      if (path.startsWith("artists/")) {
        throw Object.assign(new Error("artist-read-denied"), { code: "permission-denied" });
      }

      if (baseGetDocImpl) {
        return baseGetDocImpl({ path });
      }

      return { id: "missing", exists: () => false, data: () => ({}) };
    });

    await fetchRoadieShows({ lat: 41.9, lng: -87.63 }, 30);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Roadie][getArtistById]",
      expect.objectContaining({
        code: "permission-denied",
        message: "artist-read-denied",
      }),
    );
  });

  it("subscribes to realtime roadie show updates", async () => {
    let nextSnapshot: ((snapshot: { docs: any[] }) => void) | undefined;
    const unsubscribeMock = jest.fn();

    onSnapshotMock.mockImplementation((_query, onNext) => {
      nextSnapshot = onNext;
      return unsubscribeMock;
    });

    const onShows = jest.fn(async () => undefined);
    const onError = jest.fn();

    const unsubscribe = subscribeRoadieShows(
      { lat: 41.9, lng: -87.63 },
      30,
      onShows,
      onError,
    );

    expect(unsubscribe).toBe(unsubscribeMock);
    expect(collectionGroup).toHaveBeenCalledWith({ id: "db" }, "shows");
    expect(where).toHaveBeenCalledWith("roadies", "==", true);
    expect(query).toHaveBeenCalledWith("collection-group", "where");
    expect(onSnapshot).toHaveBeenCalledWith("query", expect.any(Function), expect.any(Function));

    nextSnapshot?.({
      docs: [
        {
          id: "show-1",
          ref: { path: "artists/a1/shows/show-1" },
          data: () => ({
            roadies: true,
            venueId: "venue-1",
            artistId: "artist-1",
            totalRoadies: 3,
            bookedRoadies: 1,
            bandName: "Beta",
            lat: 41.9,
            lng: -87.63,
          }),
        },
      ],
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(onShows).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "show-1",
          requiredRoadies: 2,
        }),
      ]),
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it("forwards processing errors from realtime roadie show updates", async () => {
    let nextSnapshot: ((snapshot: { docs: any[] }) => void) | undefined;

    onSnapshotMock.mockImplementation((_query, onNext) => {
      nextSnapshot = onNext;
      return jest.fn();
    });

    const onShows = jest.fn(async () => {
      throw new Error("hydrate-failed");
    });
    const onError = jest.fn();

    subscribeRoadieShows({ lat: 41.9, lng: -87.63 }, 30, onShows, onError);

    nextSnapshot?.({
      docs: [
        {
          id: "show-1",
          ref: { path: "artists/a1/shows/show-1" },
          data: () => ({
            roadies: true,
            venueId: "venue-1",
            artistId: "artist-1",
            totalRoadies: 3,
            bookedRoadies: 1,
            bandName: "Beta",
            lat: 41.9,
            lng: -87.63,
          }),
        },
      ],
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(onShows).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "hydrate-failed" }));
  });

  it("uses fallback error when realtime processing throws non-error values", async () => {
    let nextSnapshot: ((snapshot: { docs: any[] }) => void) | undefined;

    onSnapshotMock.mockImplementation((_query, onNext) => {
      nextSnapshot = onNext;
      return jest.fn();
    });

    const onShows = jest.fn(async () => {
      throw "show-callback-failed";
    });
    const onError = jest.fn();

    subscribeRoadieShows({ lat: 41.9, lng: -87.63 }, 30, onShows, onError);

    nextSnapshot?.({
      docs: [
        {
          id: "show-1",
          ref: { path: "artists/a1/shows/show-1" },
          data: () => ({
            roadies: true,
            venueId: "venue-1",
            artistId: "artist-1",
            totalRoadies: 3,
            bookedRoadies: 1,
            bandName: "Beta",
            lat: 41.9,
            lng: -87.63,
          }),
        },
      ],
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Failed to process roadie show updates." }),
    );
  });

  it("forwards snapshot listener errors", () => {
    let snapshotError: ((error: Error) => void) | undefined;
    const callbackError = new Error("listener-broke");

    onSnapshotMock.mockImplementation((_query, _onNext, onError) => {
      snapshotError = onError;
      return jest.fn();
    });

    const onError = jest.fn();
    subscribeRoadieShows({ lat: 41.9, lng: -87.63 }, 30, jest.fn(), onError);

    snapshotError?.(callbackError);

    expect(onError).toHaveBeenCalledWith(callbackError);
  });

  it("filters out non-roadie shows for fetch and realtime updates", async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [
        {
          id: "roadie",
          ref: { path: "artists/a/shows/roadie" },
          data: () => ({ roadies: true, lat: 41.9, lng: -87.63 }),
        },
        {
          id: "non-roadie",
          ref: { path: "artists/a/shows/non-roadie" },
          data: () => ({ roadies: false, lat: 41.9, lng: -87.63 }),
        },
      ],
    });

    const fetchResults = await fetchRoadieShows({ lat: 41.9, lng: -87.63 }, 30);
    expect(fetchResults.map((show) => show.id)).toEqual(["roadie"]);

    let nextSnapshot: ((snapshot: { docs: any[] }) => void) | undefined;
    onSnapshotMock.mockImplementation((_query, onNext) => {
      nextSnapshot = onNext;
      return jest.fn();
    });
    const onShows = jest.fn(async () => undefined);

    subscribeRoadieShows({ lat: 41.9, lng: -87.63 }, 30, onShows);
    nextSnapshot?.({
      docs: [
        {
          id: "live-roadie",
          ref: { path: "artists/a/shows/live-roadie" },
          data: () => ({ roadies: true, lat: 41.9, lng: -87.63 }),
        },
        {
          id: "live-non-roadie",
          ref: { path: "artists/a/shows/live-non-roadie" },
          data: () => ({ roadies: false, lat: 41.9, lng: -87.63 }),
        },
      ],
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(onShows).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "live-roadie" })]),
    );
    expect(onShows).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "live-non-roadie" })]),
    );
  });

  it("accepts a roadie job by updating show applicants", async () => {
    await acceptRoadieJob(
      {
        id: "show-1",
        path: "artists/a1/shows/show-1",
      },
      {
        uid: "roadie-1",
        email: "roadie@example.com",
        displayName: "Roadie",
        phone: "312-555-1111",
      },
    );

    expect(doc).toHaveBeenCalledWith({ id: "db" }, "artists/a1/shows/show-1");
    expect(updateDoc).toHaveBeenCalledWith(
      { path: "artists/a1/shows/show-1" },
      expect.objectContaining({
        lastRoadieAcceptedUid: "roadie-1",
        lastRoadieAcceptedAt: "ts",
      }),
    );
    expect(serverTimestamp).toHaveBeenCalledTimes(2);
  });

  it("accepts a roadie job with fallback user fields", async () => {
    await acceptRoadieJob(
      {
        id: "show-2",
        path: "artists/a2/shows/show-2",
      },
      {
        uid: "roadie-2",
      },
    );

    expect(updateDoc).toHaveBeenCalledWith(
      { path: "artists/a2/shows/show-2" },
      expect.objectContaining({
        "roadieApplicants.roadie-2": expect.objectContaining({
          displayName: "",
          email: "",
          phone: "",
        }),
      }),
    );
  });
});
