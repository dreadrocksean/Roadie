import type { GeoPointLite, Venue } from "../types";

export const MILES_TO_METERS = 1609.344;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const getDistanceMiles = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number => {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
};

export const isWithinRadiusMiles = (
  center: GeoPointLite,
  point: GeoPointLite,
  radiusMiles: number,
): boolean => getDistanceMiles(center.lat, center.lng, point.lat, point.lng) <= radiusMiles;

export const getMapDeltasForMiles = (lat: number, radiusMiles: number) => {
  const latDelta = (radiusMiles / 69) * 2;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const safeCos = Math.abs(cosLat) < 0.01 ? 0.01 : Math.abs(cosLat);
  const lngDelta = latDelta / safeCos;

  return {
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
};

export const getVenueCoordinates = (venue: Venue | null | undefined): GeoPointLite | null => {
  if (!venue) return null;

  if (typeof venue.latitude === "number" && typeof venue.longitude === "number") {
    return { lat: venue.latitude, lng: venue.longitude };
  }

  const geoLat = venue.geocodes?.main?.latitude;
  const geoLng = venue.geocodes?.main?.longitude;

  if (typeof geoLat === "number" && typeof geoLng === "number") {
    return { lat: geoLat, lng: geoLng };
  }

  return null;
};
