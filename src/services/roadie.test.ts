import { acceptRoadieJob, fetchRoadieShows } from "./roadie";
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
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
  query: jest.fn(() => "query"),
  serverTimestamp: jest.fn(() => "ts"),
  updateDoc: jest.fn(async () => undefined),
  where: jest.fn(() => "where"),
}));

const getDocMock = getDoc as jest.Mock;
const getDocsMock = getDocs as jest.Mock;

describe("roadie service", () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
