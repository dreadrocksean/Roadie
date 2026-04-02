import {
  MILES_TO_METERS,
  getDistanceMiles,
  getMapDeltasForMiles,
  getVenueCoordinates,
  isWithinRadiusMiles,
} from "./geo";

describe("geo helpers", () => {
  it("exports miles conversion constant", () => {
    expect(MILES_TO_METERS).toBeCloseTo(1609.344, 3);
  });

  it("calculates realistic distances", () => {
    const chicagoToMilwaukee = getDistanceMiles(41.8781, -87.6298, 43.0389, -87.9065);
    expect(chicagoToMilwaukee).toBeGreaterThan(70);
    expect(chicagoToMilwaukee).toBeLessThan(90);
  });

  it("checks radius containment", () => {
    expect(
      isWithinRadiusMiles(
        { lat: 41.8781, lng: -87.6298 },
        { lat: 41.9, lng: -87.65 },
        5,
      ),
    ).toBe(true);

    expect(
      isWithinRadiusMiles(
        { lat: 41.8781, lng: -87.6298 },
        { lat: 42.5, lng: -88.5 },
        5,
      ),
    ).toBe(false);
  });

  it("builds map deltas with polar-safe longitude handling", () => {
    const standard = getMapDeltasForMiles(41.88, 30);
    expect(standard.latitudeDelta).toBeGreaterThan(0.8);
    expect(standard.longitudeDelta).toBeGreaterThan(standard.latitudeDelta);

    const nearPole = getMapDeltasForMiles(89.9, 30);
    expect(nearPole.longitudeDelta).toBeGreaterThan(standard.longitudeDelta);
  });

  it("extracts venue coordinates from multiple schemas", () => {
    expect(getVenueCoordinates(null)).toBeNull();
    expect(getVenueCoordinates(undefined)).toBeNull();

    expect(
      getVenueCoordinates({
        id: "venue-1",
        latitude: 40,
        longitude: -70,
      }),
    ).toEqual({ lat: 40, lng: -70 });

    expect(
      getVenueCoordinates({
        id: "venue-2",
        geocodes: {
          main: {
            latitude: 35,
            longitude: -90,
          },
        },
      }),
    ).toEqual({ lat: 35, lng: -90 });

    expect(getVenueCoordinates({ id: "venue-3" })).toBeNull();
  });
});
