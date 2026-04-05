import {
  acceptRoadieJob,
  fetchRoadieShows,
  subscribeRoadieShows,
} from "./roadie";
import {
  collectionGroup,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  where,
} from "../lib/firebase";

jest.mock("../lib/firebase", () => ({
  FIRESTORE_DB: { id: "db" },
  collectionGroup: jest.fn(() => "collection-group"),
  doc: jest.fn((_db, ...segments: string[]) => ({ path: segments.join("/") })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  increment: jest.fn((value: number) => ({ __increment: value })),
  onSnapshot: jest.fn(),
  query: jest.fn(() => "query"),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => "ts"),
  where: jest.fn(() => "where"),
}));

const getDocMock = getDoc as jest.Mock;
const getDocsMock = getDocs as jest.Mock;
const incrementMock = increment as jest.Mock;
const onSnapshotMock = onSnapshot as jest.Mock;
const runTransactionMock = runTransaction as jest.Mock;
let consoleErrorSpy: jest.SpyInstance;

describe("roadie service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    getDocsMock.mockResolvedValue({
      docs: [
        {
          id: "show-1",
          ref: { path: "artists/a1/shows/show-1" },
          data: () => ({
            roadies: true,
            venueId: "venue-1",
            artistId: "artist-1",
            roadiesCount: 3,
            roadiesBooked: 1,
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
            roadiesCount: 4,
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
            roadiesCount: 1,
            roadiesBooked: 0,
          }),
        },
        {
          id: "show-4",
          ref: { path: "artists/a4/shows/show-4" },
          data: () => ({
            roadies: true,
            venueId: "venue-4",
            artistId: "artist-4",
            roadiesCount: 5,
            roadiesBooked: 1,
            lat: 30,
            lng: -110,
          }),
        },
        {
          id: "show-5",
          ref: { path: "artists/a5/shows/show-5" },
          data: () => ({
            roadies: true,
            roadiesCount: 2,
            roadiesBooked: 0,
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
            roadiesCount: 1,
            roadiesBooked: 0,
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
          data: () => ({
            name: "V3",
            geocodes: { main: { latitude: 41.91, longitude: -87.62 } },
          }),
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
    expect(where).toHaveBeenNthCalledWith(1, "roadies", "==", true);
    expect(where).toHaveBeenNthCalledWith(2, "roadies.enabled", "==", true);
    expect(where).toHaveBeenNthCalledWith(3, "roadies", "!=", false);
    expect(query).toHaveBeenCalledTimes(3);
    expect(getDocs).toHaveBeenCalledTimes(3);

    expect(results.map((show) => show.id)).toEqual([
      "show-2",
      "show-1",
      "show-5",
      "show-3",
    ]);
    expect(results[0].requiredRoadies).toBe(4);
    expect(results[2].coordinates).toEqual({ lat: 41.905, lng: -87.635 });
    expect(results[3].coordinates).toEqual({ lat: 41.91, lng: -87.62 });
  });

  it("can skip venue detail hydration when venue reads are restricted", async () => {
    const results = await fetchRoadieShows({ lat: 41.9, lng: -87.63 }, 30, {
      includeVenueDetails: false,
      includeArtistDetails: true,
    });

    expect(results.map((show) => show.id)).toEqual([
      "show-2",
      "show-1",
      "show-5",
    ]);
    expect(results[0].venue).toBeNull();
    expect(results[0].artist).toEqual(
      expect.objectContaining({ id: "artist-2" }),
    );
  });

  it("can skip artist detail hydration when artist reads are restricted", async () => {
    const results = await fetchRoadieShows({ lat: 41.9, lng: -87.63 }, 30, {
      includeVenueDetails: true,
      includeArtistDetails: false,
    });

    expect(results.map((show) => show.id)).toEqual([
      "show-2",
      "show-1",
      "show-5",
      "show-3",
    ]);
    expect(results[0].artist).toBeNull();
    expect(results[0].venue).toEqual(
      expect.objectContaining({ id: "venue-2" }),
    );
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
        throw Object.assign(new Error("artist-read-denied"), {
          code: "permission-denied",
        });
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
    const nextSnapshots: Array<(snapshot: { docs: any[] }) => void> = [];
    const unsubscribeLegacy = jest.fn();
    const unsubscribeConfig = jest.fn();
    const unsubscribeObject = jest.fn();

    onSnapshotMock.mockImplementation((_query, onNext) => {
      nextSnapshots.push(onNext);
      if (nextSnapshots.length === 1) return unsubscribeLegacy;
      if (nextSnapshots.length === 2) return unsubscribeConfig;
      return unsubscribeObject;
    });

    const onShows = jest.fn(async () => undefined);
    const onError = jest.fn();

    const unsubscribe = subscribeRoadieShows(
      { lat: 41.9, lng: -87.63 },
      30,
      onShows,
      onError,
    );

    expect(collectionGroup).toHaveBeenCalledWith({ id: "db" }, "shows");
    expect(where).toHaveBeenNthCalledWith(1, "roadies", "==", true);
    expect(where).toHaveBeenNthCalledWith(2, "roadies.enabled", "==", true);
    expect(where).toHaveBeenNthCalledWith(3, "roadies", "!=", false);
    expect(query).toHaveBeenCalledTimes(3);
    expect(onSnapshot).toHaveBeenCalledTimes(3);

    nextSnapshots[0]?.({
      docs: [
        {
          id: "show-1",
          ref: { path: "artists/a1/shows/show-1" },
          data: () => ({
            roadies: true,
            venueId: "venue-1",
            artistId: "artist-1",
            roadiesCount: 3,
            roadiesBooked: 1,
            bandName: "Beta",
            lat: 41.9,
            lng: -87.63,
          }),
        },
      ],
    });
    nextSnapshots[1]?.({ docs: [] });
    nextSnapshots[2]?.({ docs: [] });

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

    unsubscribe();
    expect(unsubscribeLegacy).toHaveBeenCalledTimes(1);
    expect(unsubscribeConfig).toHaveBeenCalledTimes(1);
    expect(unsubscribeObject).toHaveBeenCalledTimes(1);
  });

  it("forwards processing errors from realtime roadie show updates", async () => {
    const nextSnapshots: Array<(snapshot: { docs: any[] }) => void> = [];

    onSnapshotMock.mockImplementation((_query, onNext) => {
      nextSnapshots.push(onNext);
      return jest.fn();
    });

    const onShows = jest.fn(async () => {
      throw new Error("hydrate-failed");
    });
    const onError = jest.fn();

    subscribeRoadieShows({ lat: 41.9, lng: -87.63 }, 30, onShows, onError);

    nextSnapshots[0]?.({
      docs: [
        {
          id: "show-1",
          ref: { path: "artists/a1/shows/show-1" },
          data: () => ({
            roadies: true,
            venueId: "venue-1",
            artistId: "artist-1",
            roadiesCount: 3,
            roadiesBooked: 1,
            bandName: "Beta",
            lat: 41.9,
            lng: -87.63,
          }),
        },
      ],
    });
    nextSnapshots[1]?.({ docs: [] });
    nextSnapshots[2]?.({ docs: [] });

    await new Promise((resolve) => setImmediate(resolve));

    expect(onShows).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "hydrate-failed" }),
    );
  });

  it("uses fallback error when realtime processing throws non-error values", async () => {
    const nextSnapshots: Array<(snapshot: { docs: any[] }) => void> = [];

    onSnapshotMock.mockImplementation((_query, onNext) => {
      nextSnapshots.push(onNext);
      return jest.fn();
    });

    const onShows = jest.fn(async () => {
      throw "show-callback-failed";
    });
    const onError = jest.fn();

    subscribeRoadieShows({ lat: 41.9, lng: -87.63 }, 30, onShows, onError);

    nextSnapshots[0]?.({
      docs: [
        {
          id: "show-1",
          ref: { path: "artists/a1/shows/show-1" },
          data: () => ({
            roadies: true,
            venueId: "venue-1",
            artistId: "artist-1",
            roadiesCount: 3,
            roadiesBooked: 1,
            bandName: "Beta",
            lat: 41.9,
            lng: -87.63,
          }),
        },
      ],
    });
    nextSnapshots[1]?.({ docs: [] });
    nextSnapshots[2]?.({ docs: [] });

    await new Promise((resolve) => setImmediate(resolve));

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to process roadie show updates.",
      }),
    );
  });

  it("forwards snapshot listener errors", () => {
    const snapshotErrors: Array<(error: Error) => void> = [];
    const callbackError = new Error("listener-broke");

    onSnapshotMock.mockImplementation((_query, _onNext, onError) => {
      snapshotErrors.push(onError);
      return jest.fn();
    });

    const onError = jest.fn();
    subscribeRoadieShows({ lat: 41.9, lng: -87.63 }, 30, jest.fn(), onError);

    snapshotErrors[0]?.(callbackError);

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
    getDocsMock.mockResolvedValueOnce({
      docs: [
        {
          id: "roadie-object",
          ref: { path: "artists/a/shows/roadie-object" },
          data: () => ({
            roadies: {
              enabled: true,
              loadIn: { requiredCount: 1, acceptedCount: 0 },
            },
            lat: 41.9,
            lng: -87.63,
          }),
        },
        {
          id: "non-roadie-object",
          ref: { path: "artists/a/shows/non-roadie-object" },
          data: () => ({ roadies: { enabled: false }, lat: 41.9, lng: -87.63 }),
        },
      ],
    });
    getDocsMock.mockResolvedValueOnce({
      docs: [
        {
          id: "roadie-object-implicit",
          ref: { path: "artists/a/shows/roadie-object-implicit" },
          data: () => ({
            roadies: { loadIn: { requiredCount: 1, acceptedCount: 0 } },
            lat: 41.9,
            lng: -87.63,
          }),
        },
        {
          id: "non-roadie-implicit",
          ref: { path: "artists/a/shows/non-roadie-implicit" },
          data: () => ({ roadies: { enabled: false }, lat: 41.9, lng: -87.63 }),
        },
      ],
    });

    const fetchResults = await fetchRoadieShows({ lat: 41.9, lng: -87.63 }, 30);
    const fetchedIds = fetchResults.map((show) => show.id);
    expect(fetchedIds).toEqual(
      expect.arrayContaining([
        "roadie",
        "roadie-object",
        "roadie-object-implicit",
      ]),
    );
    expect(fetchedIds).not.toEqual(
      expect.arrayContaining([
        "non-roadie",
        "non-roadie-object",
        "non-roadie-implicit",
      ]),
    );

    const nextSnapshots: Array<(snapshot: { docs: any[] }) => void> = [];
    onSnapshotMock.mockImplementation((_query, onNext) => {
      nextSnapshots.push(onNext);
      return jest.fn();
    });
    const onShows = jest.fn(async () => undefined);

    subscribeRoadieShows({ lat: 41.9, lng: -87.63 }, 30, onShows);
    nextSnapshots[0]?.({
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
    nextSnapshots[1]?.({
      docs: [
        {
          id: "live-roadie-object",
          ref: { path: "artists/a/shows/live-roadie-object" },
          data: () => ({ roadies: { enabled: true }, lat: 41.9, lng: -87.63 }),
        },
        {
          id: "live-non-roadie-object",
          ref: { path: "artists/a/shows/live-non-roadie-object" },
          data: () => ({ roadies: { enabled: false }, lat: 41.9, lng: -87.63 }),
        },
      ],
    });
    nextSnapshots[2]?.({
      docs: [
        {
          id: "live-roadie-object-implicit",
          ref: { path: "artists/a/shows/live-roadie-object-implicit" },
          data: () => ({
            roadies: { loadOut: { requiredCount: 1 } },
            lat: 41.9,
            lng: -87.63,
          }),
        },
        {
          id: "live-non-roadie-implicit",
          ref: { path: "artists/a/shows/live-non-roadie-implicit" },
          data: () => ({ roadies: { enabled: false }, lat: 41.9, lng: -87.63 }),
        },
      ],
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(onShows).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "live-roadie" }),
        expect.objectContaining({ id: "live-roadie-object-implicit" }),
      ]),
    );
    expect(onShows).not.toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "live-non-roadie" }),
        expect.objectContaining({ id: "live-non-roadie-object" }),
        expect.objectContaining({ id: "live-non-roadie-implicit" }),
      ]),
    );
  });

  it("accepts a shift with assignment doc as source of truth and updates projection", async () => {
    const txGet = jest.fn(async (ref: { path: string }) => {
      if (ref.path.endsWith("/roadieAssignments/roadie-1_loadIn")) {
        return {
          exists: (): boolean => false,
          data: () => ({}),
        };
      }
      return {
        id: "show-1",
        exists: (): boolean => true,
        data: () => ({
          artistId: "artist-1",
          roadies: {
            enabled: true,
            priceCents: 12500,
            loadIn: {
              requiredCount: 2,
              acceptedCount: 0,
              startsAt: new Date("2026-04-04T10:00:00Z"),
            },
          },
        }),
      };
    });
    const txSet = jest.fn();
    const txUpdate = jest.fn();

    runTransactionMock.mockImplementation(async (_db, transactionFn) =>
      transactionFn({
        get: txGet,
        set: txSet,
        update: txUpdate,
      }),
    );

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
      "loadIn",
    );

    expect(runTransaction).toHaveBeenCalledWith(
      { id: "db" },
      expect.any(Function),
    );
    expect(txSet).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "artists/a1/shows/show-1/roadieAssignments/roadie-1_loadIn",
      }),
      expect.objectContaining({
        roadieId: "roadie-1",
        showId: "show-1",
        status: "accepted",
        shiftType: "loadIn",
        priceCentsSnapshot: 12500,
      }),
      { merge: true },
    );
    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: "artists/a1/shows/show-1" }),
      expect.objectContaining({
        "roadieApplicants.roadie-1_loadIn": expect.objectContaining({
          uid: "roadie-1",
          status: "accepted",
          shiftType: "loadIn",
        }),
        "roadies.loadIn.acceptedCount": { __increment: 1 },
        "roadies.loadIn.status": "OPEN",
        lastRoadieAcceptedShiftType: "loadIn",
      }),
    );
    expect(incrementMock).toHaveBeenCalledWith(1);
  });

  it("throws when shift is full before acceptance", async () => {
    runTransactionMock.mockImplementation(async (_db, transactionFn) =>
      transactionFn({
        get: jest.fn(async (ref: { path: string }) => {
          if (ref.path.includes("/roadieAssignments/")) {
            return { exists: (): boolean => false, data: () => ({}) };
          }
          return {
            id: "show-full",
            exists: (): boolean => true,
            data: () => ({
              roadies: {
                enabled: true,
                loadOut: { requiredCount: 1, acceptedCount: 1 },
              },
            }),
          };
        }),
        set: jest.fn(),
        update: jest.fn(),
      }),
    );

    await expect(
      acceptRoadieJob(
        { id: "show-full", path: "artists/a1/shows/show-full" },
        { uid: "roadie-2" },
        "loadOut",
      ),
    ).rejects.toThrow("already full");
  });

  it("throws when assignment is already accepted for the shift", async () => {
    runTransactionMock.mockImplementation(async (_db, transactionFn) =>
      transactionFn({
        get: jest.fn(async (ref: { path: string }) => {
          if (ref.path.includes("/roadieAssignments/")) {
            return {
              exists: (): boolean => true,
              data: () => ({ status: "accepted" }),
            };
          }
          return {
            id: "show-dup",
            exists: (): boolean => true,
            data: () => ({
              roadies: {
                enabled: true,
                loadIn: { requiredCount: 2, acceptedCount: 0 },
              },
            }),
          };
        }),
        set: jest.fn(),
        update: jest.fn(),
      }),
    );

    await expect(
      acceptRoadieJob(
        { id: "show-dup", path: "artists/a1/shows/show-dup" },
        { uid: "roadie-dup" },
        "loadIn",
      ),
    ).rejects.toThrow("already accepted");
  });

  it("throws when show no longer exists", async () => {
    runTransactionMock.mockImplementation(async (_db, transactionFn) =>
      transactionFn({
        get: jest.fn(async (ref: { path: string }) => {
          if (ref.path.includes("/roadieAssignments/")) {
            return {
              exists: (): boolean => false,
              data: () => ({}),
            };
          }
          return {
            exists: (): boolean => false,
            data: () => ({}),
          };
        }),
        set: jest.fn(),
        update: jest.fn(),
      }),
    );

    await expect(
      acceptRoadieJob(
        { id: "missing", path: "artists/a1/shows/missing" },
        { uid: "roadie-404" },
        "loadIn",
      ),
    ).rejects.toThrow("no longer available");
  });

  it("throws when required count is zero", async () => {
    runTransactionMock.mockImplementation(async (_db, transactionFn) =>
      transactionFn({
        get: jest.fn(async (ref: { path: string }) => {
          if (ref.path.includes("/roadieAssignments/")) {
            return { exists: (): boolean => false, data: () => ({}) };
          }
          return {
            exists: (): boolean => true,
            data: () => ({
              roadies: {
                enabled: true,
                loadIn: { requiredCount: 0, acceptedCount: 0 },
              },
            }),
          };
        }),
        set: jest.fn(),
        update: jest.fn(),
      }),
    );

    await expect(
      acceptRoadieJob(
        { id: "show-closed", path: "artists/a1/shows/show-closed" },
        { uid: "roadie-zero" },
        "loadIn",
      ),
    ).rejects.toThrow("not currently accepting");
  });

  it("accepts with fallback ids/defaults and marks shift full", async () => {
    const txGet = jest.fn(async (ref: { path: string }) => {
      if (ref.path.endsWith("/roadieAssignments/roadie-3_loadOut")) {
        return { exists: (): boolean => false, data: () => ({}) };
      }
      return {
        exists: (): boolean => true,
        data: () => ({
          roadies: {
            enabled: true,
            loadOut: { requiredCount: 1, acceptedCount: 0 },
          },
          roadiesLoadOutTime: new Date("2026-04-06T03:00:00Z"),
        }),
      };
    });
    const txSet = jest.fn();
    const txUpdate = jest.fn();

    runTransactionMock.mockImplementation(async (_db, transactionFn) =>
      transactionFn({
        get: txGet,
        set: txSet,
        update: txUpdate,
      }),
    );

    await acceptRoadieJob(
      {
        id: "",
        path: "artists/a1/shows/show-path-id",
      },
      {
        uid: "roadie-3",
      },
      "loadOut",
    );

    expect(txSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        showId: "show-path-id",
        artistId: "",
        roadieId: "roadie-3",
        displayName: "",
        email: "",
        phone: "",
        shiftStartsAt: new Date("2026-04-06T03:00:00.000Z"),
      }),
      { merge: true },
    );
    expect(txSet.mock.calls[0]?.[1]).not.toHaveProperty("priceCentsSnapshot");
    expect(txUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "roadies.loadOut.status": "FULL",
        "roadieApplicants.roadie-3_loadOut": expect.objectContaining({
          displayName: "",
          email: "",
          phone: "",
        }),
      }),
    );
  });

  it("supports load-in and load-out shift start fallbacks", async () => {
    const shiftStarts: Array<Date | null> = [];

    runTransactionMock.mockImplementation(async (_db, transactionFn) =>
      transactionFn({
        get: jest.fn(async (ref: { path: string }) => {
          if (ref.path.includes("/roadieAssignments/")) {
            return { exists: (): boolean => false, data: () => ({}) };
          }
          if (ref.path.includes("show-loadin-roadies-object-loadintime")) {
            return {
              exists: (): boolean => true,
              data: () => ({
                roadies: {
                  enabled: true,
                  loadIn: { requiredCount: 1, acceptedCount: 0 },
                },
                loadInTime: new Date("2026-04-07T10:30:00Z"),
              }),
            };
          }
          if (ref.path.includes("show-loadin-roadies-object")) {
            return {
              exists: (): boolean => true,
              data: () => ({
                roadies: {
                  enabled: true,
                  loadIn: { requiredCount: 1, acceptedCount: 0 },
                },
                roadiesLoadInTime: new Date("2026-04-07T10:00:00Z"),
              }),
            };
          }
          if (ref.path.includes("show-loadin-non-object-scheduledstart")) {
            return {
              exists: (): boolean => true,
              data: () => ({
                roadies: true,
                roadiesLoadInCount: 1,
                scheduledStart: new Date("2026-04-07T11:30:00Z"),
              }),
            };
          }
          if (ref.path.includes("show-loadin-non-object")) {
            return {
              exists: (): boolean => true,
              data: () => ({
                roadies: true,
                roadiesLoadInCount: 1,
                loadInTime: new Date("2026-04-07T11:00:00Z"),
              }),
            };
          }
          if (ref.path.includes("show-loadout-non-object")) {
            return {
              exists: (): boolean => true,
              data: () => ({
                roadies: true,
                roadiesLoadOutCount: 1,
                scheduledStop: new Date("2026-04-07T22:00:00Z"),
              }),
            };
          }
          if (ref.path === "") {
            return {
              exists: (): boolean => true,
              data: () => ({
                roadies: {
                  enabled: true,
                  loadOut: { requiredCount: 1, acceptedCount: 0 },
                },
              }),
            };
          }
          return {
            exists: (): boolean => true,
            data: () => ({
              roadies: true,
            }),
          };
        }),
        set: jest.fn((_ref: unknown, payload: Record<string, unknown>) => {
          shiftStarts.push((payload.shiftStartsAt as Date | null) ?? null);
        }),
        update: jest.fn(),
      }),
    );

    await acceptRoadieJob(
      {
        id: "loadin-object",
        path: "artists/a/shows/show-loadin-roadies-object",
      },
      { uid: "roadie-4" },
      "loadIn",
    );
    await acceptRoadieJob(
      {
        id: "loadin-object-loadintime",
        path: "artists/a/shows/show-loadin-roadies-object-loadintime",
      },
      { uid: "roadie-4" },
      "loadIn",
    );
    await acceptRoadieJob(
      {
        id: "loadin-non-object",
        path: "artists/a/shows/show-loadin-non-object",
      },
      { uid: "roadie-4" },
      "loadIn",
    );
    await acceptRoadieJob(
      {
        id: "loadin-non-object-scheduledstart",
        path: "artists/a/shows/show-loadin-non-object-scheduledstart",
      },
      { uid: "roadie-4" },
      "loadIn",
    );
    await acceptRoadieJob(
      {
        id: "loadout-non-object",
        path: "artists/a/shows/show-loadout-non-object",
      },
      { uid: "roadie-4" },
      "loadOut",
    );
    await acceptRoadieJob(
      { id: "manual-id", path: "" },
      { uid: "roadie-4" },
      "loadOut",
    );

    expect(shiftStarts).toEqual([
      new Date("2026-04-07T10:00:00.000Z"),
      new Date("2026-04-07T10:30:00.000Z"),
      new Date("2026-04-07T11:00:00.000Z"),
      new Date("2026-04-07T11:30:00.000Z"),
      new Date("2026-04-07T22:00:00.000Z"),
      null,
    ]);
  });
});
