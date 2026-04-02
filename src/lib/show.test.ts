import {
  formatCurrency,
  formatTimeValue,
  getBandName,
  getBandPhone,
  getLoadInTime,
  getLoadOutTime,
  getRequiredRoadies,
  getRoadiePay,
  getUserRoadieStatus,
  getVenueAddress,
  isAwardedToUser,
  normalizeDate,
  summarizeAdminStats,
} from "./show";

describe("show helpers", () => {
  it("normalizes date-like values", () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();

    const now = new Date();
    expect(normalizeDate(now)).toBe(now);

    const fromTimestamp = normalizeDate({ toDate: () => new Date("2026-01-01T00:00:00Z") });
    expect(fromTimestamp?.toISOString()).toBe("2026-01-01T00:00:00.000Z");

    expect(normalizeDate("not-a-date")).toBeNull();
    expect(normalizeDate(1710000000000)?.getFullYear()).toBeGreaterThan(2023);
    expect(normalizeDate({ foo: "bar" })).toBeNull();
  });

  it("formats time values and fallbacks", () => {
    expect(formatTimeValue(null)).toBe("TBD");

    const formatted = formatTimeValue(new Date("2026-04-02T10:30:00Z"));
    expect(formatted).toContain(":");
  });

  it("computes required roadies safely", () => {
    expect(getRequiredRoadies({ totalRoadies: 4, bookedRoadies: 1 })).toBe(3);
    expect(getRequiredRoadies({ totalRoadies: 4, roadiesBooked: 4 })).toBe(0);
    expect(getRequiredRoadies({ totalRoadies: 1, bookedRoadies: 99 })).toBe(0);
    expect(getRequiredRoadies({} as any)).toBe(0);
  });

  it("gets band and contact details with fallbacks", () => {
    expect(getBandName({ bandName: "Band A" }, "Artist")).toBe("Band A");
    expect(getBandName({ artistName: "Artist A" }, "Artist")).toBe("Artist A");
    expect(getBandName({ artistId: "artist-1" }, "Artist")).toBe("Artist");
    expect(getBandName({}, undefined)).toBe("Unknown Band");

    expect(getBandPhone({ bandPhone: "111" }, "222")).toBe("111");
    expect(getBandPhone({ contactPhone: "222" }, "333")).toBe("222");
    expect(getBandPhone({}, "444")).toBe("444");
    expect(getBandPhone({}, undefined)).toBe("Not provided");
  });

  it("gets pay fields and formats currency", () => {
    expect(getRoadiePay({ roadiePay: 200 })).toBe(200);
    expect(getRoadiePay({ payAmount: 250 })).toBe(250);
    expect(getRoadiePay({ artistFee: 300 })).toBe(300);
    expect(getRoadiePay({})).toBeNull();

    expect(formatCurrency(100)).toContain("$");
    expect(formatCurrency(null)).toBe("TBD");
  });

  it("gets venue address and load times", () => {
    expect(getVenueAddress({ venueAddress: "123 Main" }, null)).toBe("123 Main");
    expect(
      getVenueAddress(
        {},
        {
          id: "venue-1",
          location: {
            formatted_address: "456 Oak",
          },
        },
      ),
    ).toBe("456 Oak");
    expect(
      getVenueAddress(
        {},
        {
          id: "venue-2",
          location: {
            address: "789 Pine",
          },
        },
      ),
    ).toBe("789 Pine");
    expect(getVenueAddress({}, null)).toBe("Address unavailable");

    expect(getLoadInTime({ loadInTime: new Date("2026-04-02T12:00:00Z") })).toContain(":");
    expect(getLoadOutTime({ scheduledStop: new Date("2026-04-02T14:00:00Z") })).toContain(":");
  });

  it("gets roadie status and awarded state", () => {
    expect(getUserRoadieStatus({} as any, null)).toBeNull();
    expect(
      getUserRoadieStatus(
        {
          roadieApplicants: {
            me: {
              uid: "me",
              status: "accepted",
            },
          },
        } as any,
        "me",
      ),
    ).toBe("accepted");
    expect(getUserRoadieStatus({ awardedRoadieUids: ["me"] } as any, "me")).toBe("awarded");
    expect(getUserRoadieStatus({ roadieAwardedUids: ["me"] } as any, "me")).toBe("awarded");
    expect(getUserRoadieStatus({} as any, "me")).toBeNull();

    expect(isAwardedToUser({ awardedRoadieUids: ["me"] } as any, "me")).toBe(true);
    expect(isAwardedToUser({} as any, "me")).toBe(false);
  });

  it("summarizes admin stats", () => {
    const shows = [
      {
        id: "1",
        path: "artists/a/shows/1",
        requiredRoadies: 2,
        distanceMiles: 1,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        roadiePay: 100,
      },
      {
        id: "2",
        path: "artists/a/shows/2",
        requiredRoadies: 1,
        distanceMiles: 2,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        payAmount: 200,
      },
    ];

    const summary = summarizeAdminStats(shows as any, ["artists/a/shows/1"], ["artists/a/shows/2"]);

    expect(summary.totalRoadieShows).toBe(2);
    expect(summary.openSpots).toBe(3);
    expect(summary.acceptedCount).toBe(1);
    expect(summary.awardedCount).toBe(1);
    expect(summary.averagePay).toBe(150);
    expect(summary.awardedPay).toBe(200);
  });

  it("summarizes admin stats when pay is missing", () => {
    const shows = [
      {
        id: "3",
        path: "artists/a/shows/3",
        requiredRoadies: 2,
        distanceMiles: 3,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      },
    ];

    const summary = summarizeAdminStats(shows as any, [], ["artists/a/shows/3"]);

    expect(summary.averagePay).toBe(0);
    expect(summary.awardedPay).toBe(0);
  });
});
