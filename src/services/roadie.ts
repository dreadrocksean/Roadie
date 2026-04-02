import {
  FIRESTORE_DB,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "../lib/firebase";
import { getDistanceMiles, getVenueCoordinates, isWithinRadiusMiles } from "../lib/geo";
import { getBandName, getRequiredRoadies } from "../lib/show";
import type { Artist, GeoPointLite, HydratedShow, ShowDoc, UserProfile, Venue } from "../types";

type HydratedShowWithCoordinates = HydratedShow & { coordinates: GeoPointLite; distanceMiles: number };

const getShowCoordinates = (show: ShowDoc, venue: Venue | null): GeoPointLite | null => {
  if (typeof show.lat === "number" && typeof show.lng === "number") {
    return { lat: show.lat, lng: show.lng };
  }

  const locationLat = show.location?.lat ?? show.location?.latitude;
  const locationLng = show.location?.lng ?? show.location?.longitude;

  if (typeof locationLat === "number" && typeof locationLng === "number") {
    return { lat: locationLat, lng: locationLng };
  }

  return getVenueCoordinates(venue);
};

const mapShowDoc = (id: string, path: string, data: Record<string, unknown>): ShowDoc => ({
  id,
  path,
  ...(data as Omit<ShowDoc, "id" | "path">),
});

const getVenueById = async (venueId: string): Promise<Venue | null> => {
  const venueSnapshot = await getDoc(doc(FIRESTORE_DB, "venues", venueId));
  if (!venueSnapshot.exists()) return null;

  return {
    id: venueSnapshot.id,
    ...(venueSnapshot.data() as Omit<Venue, "id">),
  };
};

const getArtistById = async (artistId: string): Promise<Artist | null> => {
  const artistSnapshot = await getDoc(doc(FIRESTORE_DB, "artists", artistId));
  if (!artistSnapshot.exists()) return null;

  return {
    id: artistSnapshot.id,
    ...(artistSnapshot.data() as Omit<Artist, "id">),
  };
};

export const fetchRoadieShows = async (center: GeoPointLite, radiusMiles: number): Promise<HydratedShow[]> => {
  const showsSnapshot = await getDocs(
    query(collectionGroup(FIRESTORE_DB, "shows"), where("roadies", "==", true)),
  );

  const roadieShows = showsSnapshot.docs.map((showDoc) =>
    mapShowDoc(showDoc.id, showDoc.ref.path, showDoc.data()),
  );

  const venueIds = Array.from(
    new Set(roadieShows.map((show) => show.venueId).filter((venueId): venueId is string => Boolean(venueId))),
  );

  const artistIds = Array.from(
    new Set(roadieShows.map((show) => show.artistId).filter((artistId): artistId is string => Boolean(artistId))),
  );

  const [venues, artists] = await Promise.all([
    Promise.all(venueIds.map((venueId) => getVenueById(venueId))),
    Promise.all(artistIds.map((artistId) => getArtistById(artistId))),
  ]);

  const venuesById = new Map<string, Venue>();
  venues.forEach((venue) => {
    if (venue) venuesById.set(venue.id, venue);
  });

  const artistsById = new Map<string, Artist>();
  artists.forEach((artist) => {
    if (artist) artistsById.set(artist.id, artist);
  });

  const hydratedShows = roadieShows
    .map((show) => {
      const venue = show.venueId ? venuesById.get(show.venueId) ?? null : null;
      const artist = show.artistId ? artistsById.get(show.artistId) ?? null : null;
      const coordinates = getShowCoordinates(show, venue);
      const distanceMiles = coordinates
        ? getDistanceMiles(center.lat, center.lng, coordinates.lat, coordinates.lng)
        : null;

      return {
        ...show,
        venue,
        artist,
        coordinates,
        requiredRoadies: getRequiredRoadies(show),
        distanceMiles,
      };
    })
    .filter(
      (show): show is HydratedShowWithCoordinates =>
        Boolean(show.coordinates) && typeof show.distanceMiles === "number",
    )
    .filter((show) => isWithinRadiusMiles(center, show.coordinates, radiusMiles))
    .sort((left, right) => {
      const leftDistance = left.distanceMiles;
      const rightDistance = right.distanceMiles;

      if (leftDistance === rightDistance) {
        return getBandName(left, left.artist?.name).localeCompare(
          getBandName(right, right.artist?.name),
        );
      }

      return leftDistance - rightDistance;
    });

  return hydratedShows;
};

export const acceptRoadieJob = async (show: ShowDoc, user: UserProfile): Promise<void> => {
  const roadieApplicantPath = `roadieApplicants.${user.uid}`;

  await updateDoc(doc(FIRESTORE_DB, show.path), {
    [roadieApplicantPath]: {
      uid: user.uid,
      status: "accepted",
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      acceptedAt: serverTimestamp(),
    },
    lastRoadieAcceptedAt: serverTimestamp(),
    lastRoadieAcceptedUid: user.uid,
  });
};
