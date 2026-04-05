import {
  formatCurrency,
  formatTimeValue,
  getBandName,
  getBandPhone,
  getLoadInTime,
  getLoadOutTime,
  getRequiredRoadies,
  getRoadiePay,
  getRoadieShiftRequired,
  getUserRoadieShiftStatus,
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

    const fromTimestamp = normalizeDate({
      toDate: () => new Date("2026-01-01T00:00:00Z"),
    });
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
    expect(
      getRequiredRoadies({
        roadies: {
          enabled: true,
          loadIn: { requiredCount: 2, acceptedCount: 1 },
          loadOut: { requiredCount: 3, acceptedCount: 2 },
        },
      } as any),
    ).toBe(2);
    expect(getRequiredRoadies({ roadiesLoadInCount: 2, roadiesLoadOutCount: 3, roadiesBooked: 1 })).toBe(4);
    expect(getRequiredRoadies({ roadiesCount: 6, roadiesBooked: 2 })).toBe(4);
    expect(getRequiredRoadies({ roadiesCount: 4, roadiesBooked: 1 })).toBe(3);
    expect(getRequiredRoadies({ roadiesCount: 4, roadiesBooked: 4 })).toBe(0);
    expect(getRequiredRoadies({ roadiesCount: 1, roadiesBooked: 99 })).toBe(0);
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

  it("gets roadiePrice and formats currency", () => {
    expect(
      getRoadiePay({ roadies: { enabled: true, priceCents: 7550 } } as any),
    ).toBe(75.5);
    expect(getRoadiePay({ roadiePrice: 200 } as any)).toBe(200);
    expect(getRoadiePay({ roadiePrice: "200" as any } as any)).toBe(200);
    expect(getRoadiePay({ roadiePrice: "$2,450.50" as any } as any)).toBe(2450.5);
    expect(getRoadiePay({ roadiePrice: { amount: "175" } as any } as any)).toBe(175);
    expect(getRoadiePay({ roadiePrice: Number.POSITIVE_INFINITY } as any)).toBeNull();
    expect(getRoadiePay({ roadiePrice: "$$$" as any } as any)).toBeNull();
    expect(getRoadiePay({ roadiePrice: "not-a-number" as any } as any)).toBeNull();
    expect(getRoadiePay({ payAmount: 200 } as any)).toBeNull();
    expect(getRoadiePay({} as any)).toBeNull();

    expect(formatCurrency(100)).toContain("$");
    expect(formatCurrency(null)).toBe("TBD");
  });

  it("parses string shift counts in shift-specific required calculations", () => {
    expect(
      getRoadieShiftRequired({ roadiesLoadInCount: "2" } as any, "loadIn"),
    ).toBe(2);
    expect(
      getRoadieShiftRequired({ roadiesLoadOutCount: "3" } as any, "loadOut"),
    ).toBe(3);
  });

  it("gets venue address and load times", () => {
    expect(getVenueAddress({ venueAddress: "123 Main" }, null)).toBe(
      "123 Main",
    );
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

    expect(
      getLoadInTime({ loadInTime: new Date("2026-04-02T12:00:00Z") }),
    ).toContain(":");
    expect(
      getLoadInTime({
        roadies: {
          enabled: true,
          loadIn: { startsAt: new Date("2026-04-02T10:00:00Z") },
        },
      } as any),
    ).toContain(":");
    expect(
      getLoadOutTime({ scheduledStop: new Date("2026-04-02T14:00:00Z") }),
    ).toContain(":");
    expect(
      getLoadOutTime({
        roadies: {
          enabled: true,
          loadOut: { startsAt: new Date("2026-04-02T16:00:00Z") },
        },
      } as any),
    ).toContain(":");
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
    expect(
      getUserRoadieStatus({ awardedRoadieUids: ["me"] } as any, "me"),
    ).toBe("awarded");
    expect(
      getUserRoadieStatus({ roadieAwardedUids: ["me"] } as any, "me"),
    ).toBe("awarded");
    expect(getUserRoadieStatus({} as any, "me")).toBeNull();

    expect(isAwardedToUser({ awardedRoadieUids: ["me"] } as any, "me")).toBe(
      true,
    );
    expect(isAwardedToUser({} as any, "me")).toBe(false);
  });

  it("gets shift-specific roadie status with keyed applicants", () => {
    const show = {
      roadieApplicants: {
        me_loadIn: { uid: "me", status: "accepted", shiftType: "loadIn" },
        me_loadOut: { uid: "me", status: "awarded", shiftType: "loadOut" },
      },
    } as any;

    expect(getUserRoadieShiftStatus(show, "me", "loadIn")).toBe("accepted");
    expect(getUserRoadieShiftStatus(show, "me", "loadOut")).toBe("awarded");
    expect(getUserRoadieStatus(show, "me")).toBe("awarded");
  });

  it("handles unkeyed shift statuses, invalid applicants, and awarded fallbacks", () => {
    expect(
      getUserRoadieShiftStatus(
        {
          roadieApplicants: {
            invalid: { uid: 123, status: "accepted" },
            mismatch: { uid: "me", status: "accepted", shiftType: "loadOut" },
          },
        } as any,
        "me",
        "loadIn",
      ),
    ).toBeNull();

    expect(
      getUserRoadieShiftStatus(
        {
          roadieApplicants: {
            alpha: { uid: "me", status: "awarded", shiftType: "loadIn" },
            beta: { uid: "other", status: "accepted", shiftType: "loadIn" },
          },
        } as any,
        "me",
        "loadIn",
      ),
    ).toBe("awarded");

    expect(
      getUserRoadieShiftStatus(
        {
          roadieApplicants: {
            alpha: { uid: "me", status: "accepted", shiftType: "loadIn" },
          },
        } as any,
        "me",
        "loadIn",
      ),
    ).toBe("accepted");

    expect(
      getUserRoadieShiftStatus(
        {
          roadieApplicants: {
            alpha: { uid: "me", status: "requested", shiftType: "loadIn" },
            beta: { uid: "other", status: "awarded", shiftType: "loadIn" },
          },
        } as any,
        "me",
        "loadIn",
      ),
    ).toBe("requested");

    expect(
      getUserRoadieStatus(
        {
          roadieApplicants: {
            alpha: { uid: "me", status: "requested", shiftType: "loadIn" },
          },
        } as any,
        "me",
      ),
    ).toBe("requested");

    expect(
      getUserRoadieStatus(
        {
          roadieApplicants: {},
          awardedRoadieUids: ["other"],
          roadieAwardedUids: ["me"],
        } as any,
        "me",
      ),
    ).toBe("awarded");

    expect(
      getUserRoadieStatus(
        {
          roadieApplicants: {},
          awardedRoadieUids: ["other"],
          roadieAwardedUids: ["another"],
        } as any,
        "me",
      ),
    ).toBeNull();
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
        roadiePrice: 100,
      },
      {
        id: "2",
        path: "artists/a/shows/2",
        requiredRoadies: 1,
        distanceMiles: 2,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        roadiePrice: 200,
      },
    ];

    const summary = summarizeAdminStats(
      shows as any,
      ["artists/a/shows/1"],
      ["artists/a/shows/2"],
    );

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

    const summary = summarizeAdminStats(
      shows as any,
      [],
      ["artists/a/shows/3"],
    );

    expect(summary.averagePay).toBe(0);
    expect(summary.awardedPay).toBe(0);
  });
});
