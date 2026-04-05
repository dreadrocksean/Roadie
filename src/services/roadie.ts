import {
  FIRESTORE_DB,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "../lib/firebase";
import {
  getDistanceMiles,
  getVenueCoordinates,
  isWithinRadiusMiles,
} from "../lib/geo";
import {
  getBandName,
  getRequiredRoadies,
  getRoadiePay,
  getRoadieShiftAccepted,
  getRoadieShiftRequired,
  isRoadiesEnabled,
  normalizeDate,
} from "../lib/show";
import type {
  Artist,
  GeoPointLite,
  HydratedShow,
  RoadieShiftType,
  ShowDoc,
  UserProfile,
  Venue,
} from "../types";

type HydratedShowWithCoordinates = HydratedShow & {
  coordinates: GeoPointLite;
  distanceMiles: number;
};
type RoadieShowLoadOptions = {
  includeVenueDetails?: boolean;
  includeArtistDetails?: boolean;
};
type FirestoreShowSnapshotDoc = {
  id: string;
  ref: { path: string };
  data: () => Record<string, unknown>;
};
type FirestoreShowSnapshot = {
  docs: readonly FirestoreShowSnapshotDoc[];
};

const logRoadieServiceError = (
  context: string,
  error: unknown,
  details?: Record<string, unknown>,
) => {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const code = (error as { code?: string } | null)?.code;

  console.error(`[Roadie][${context}]`, {
    code,
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
    ...details,
  });
};

const getShowCoordinates = (
  show: ShowDoc,
  venue: Venue | null,
): GeoPointLite | null => {
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

const mapShowDoc = (
  id: string,
  path: string,
  data: Record<string, unknown>,
): ShowDoc => ({
  id,
  path,
  ...(data as Omit<ShowDoc, "id" | "path">),
});

const isRoadieShow = (show: ShowDoc) => isRoadiesEnabled(show.roadies);

const buildRoadieShowsQueries = () => {
  const showsCollectionGroup = collectionGroup(FIRESTORE_DB, "shows");
  return {
    legacyRoadiesQuery: query(showsCollectionGroup, where("roadies", "==", true)),
    configRoadiesQuery: query(
      showsCollectionGroup,
      where("roadies.enabled", "==", true),
    ),
    objectRoadiesQuery: query(showsCollectionGroup, where("roadies", "!=", false)),
  };
};

const mergeSnapshotDocs = (
  snapshots: FirestoreShowSnapshot[],
): FirestoreShowSnapshotDoc[] => {
  const docsByPath = new Map<string, FirestoreShowSnapshotDoc>();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((showDoc) => {
      docsByPath.set(showDoc.ref.path, showDoc);
    });
  });
  return Array.from(docsByPath.values());
};

const getVenueById = async (venueId: string): Promise<Venue | null> => {
  try {
    const venueSnapshot = await getDoc(doc(FIRESTORE_DB, "venues", venueId));
    if (!venueSnapshot.exists()) return null;

    return {
      id: venueSnapshot.id,
      ...(venueSnapshot.data() as Omit<Venue, "id">),
    };
  } catch (error) {
    logRoadieServiceError("getVenueById", error, { venueId });
    return null;
  }
};

const getArtistById = async (artistId: string): Promise<Artist | null> => {
  try {
    const artistSnapshot = await getDoc(doc(FIRESTORE_DB, "artists", artistId));
    if (!artistSnapshot.exists()) return null;

    return {
      id: artistSnapshot.id,
      ...(artistSnapshot.data() as Omit<Artist, "id">),
    };
  } catch (error) {
    logRoadieServiceError("getArtistById", error, { artistId });
    return null;
  }
};

const hydrateRoadieShows = async (
  roadieShows: ShowDoc[],
  center: GeoPointLite,
  radiusMiles: number,
  options: RoadieShowLoadOptions,
): Promise<HydratedShow[]> => {
  const includeVenueDetails = options.includeVenueDetails ?? true;
  const includeArtistDetails = options.includeArtistDetails ?? true;

  const venueIds = Array.from(
    new Set(
      includeVenueDetails
        ? roadieShows
            .map((show) => show.venueId)
            .filter((venueId): venueId is string => Boolean(venueId))
        : [],
    ),
  );

  const artistIds = Array.from(
    new Set(
      includeArtistDetails
        ? roadieShows
            .map((show) => show.artistId)
            .filter((artistId): artistId is string => Boolean(artistId))
        : [],
    ),
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

  return roadieShows
    .map((show) => {
      const venue = show.venueId
        ? (venuesById.get(show.venueId) ?? null)
        : null;
      const artist = show.artistId
        ? (artistsById.get(show.artistId) ?? null)
        : null;
      const coordinates = getShowCoordinates(show, venue);
      const distanceMiles = coordinates
        ? getDistanceMiles(
            center.lat,
            center.lng,
            coordinates.lat,
            coordinates.lng,
          )
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
    .filter((show) =>
      isWithinRadiusMiles(center, show.coordinates, radiusMiles),
    )
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
};

const mapSnapshotDocsToShows = (
  docs: FirestoreShowSnapshotDoc[],
): ShowDoc[] => {
  const mappedShows = docs.map((showDoc) =>
    mapShowDoc(showDoc.id, showDoc.ref.path, showDoc.data()),
  );
  return mappedShows.filter((show) => isRoadieShow(show));
};

const getShowDocRefFromPath = (showPath: string) =>
  doc(FIRESTORE_DB, showPath);

const getRoadieAssignmentRef = (
  showPath: string,
  assignmentId: string,
) =>
  doc(FIRESTORE_DB, `${showPath}/roadieAssignments/${assignmentId}`);

const getShiftAcceptedCountFieldPath = (shiftType: RoadieShiftType) =>
  shiftType === "loadIn"
    ? "roadies.loadIn.acceptedCount"
    : "roadies.loadOut.acceptedCount";

const getShiftStatusFieldPath = (shiftType: RoadieShiftType) =>
  shiftType === "loadIn" ? "roadies.loadIn.status" : "roadies.loadOut.status";

const getShiftStartsAtSnapshot = (
  show: ShowDoc,
  shiftType: RoadieShiftType,
) => {
  const normalized = normalizeDate(
    shiftType === "loadIn"
      ? show.roadies && typeof show.roadies === "object"
        ? show.roadies.loadIn?.startsAt ?? show.roadiesLoadInTime ?? show.loadInTime
        : show.roadiesLoadInTime ?? show.loadInTime ?? show.scheduledStart
      : show.roadies && typeof show.roadies === "object"
        ? show.roadies.loadOut?.startsAt ?? show.roadiesLoadOutTime ?? show.loadOutTime
        : show.roadiesLoadOutTime ?? show.loadOutTime ?? show.scheduledStop,
  );
  return normalized ?? null;
};

export const fetchRoadieShows = async (
  center: GeoPointLite,
  radiusMiles: number,
  options: RoadieShowLoadOptions = {},
): Promise<HydratedShow[]> => {
  const { legacyRoadiesQuery, configRoadiesQuery, objectRoadiesQuery } =
    buildRoadieShowsQueries();
  const [legacyShowsSnapshot, configShowsSnapshot, objectShowsSnapshot] =
    await Promise.all([
    getDocs(legacyRoadiesQuery),
    getDocs(configRoadiesQuery),
    getDocs(objectRoadiesQuery),
  ]);

  return hydrateRoadieShows(
    mapSnapshotDocsToShows(
      mergeSnapshotDocs([
        legacyShowsSnapshot,
        configShowsSnapshot,
        objectShowsSnapshot,
      ]),
    ),
    center,
    radiusMiles,
    options,
  );
};

export const subscribeRoadieShows = (
  center: GeoPointLite,
  radiusMiles: number,
  onShows: (shows: HydratedShow[]) => Promise<void> | void,
  onError?: (error: Error) => void,
  options: RoadieShowLoadOptions = {},
): (() => void) => {
  const { legacyRoadiesQuery, configRoadiesQuery, objectRoadiesQuery } =
    buildRoadieShowsQueries();
  const docsByQuery = {
    legacy: new Map<string, FirestoreShowSnapshotDoc>(),
    config: new Map<string, FirestoreShowSnapshotDoc>(),
    object: new Map<string, FirestoreShowSnapshotDoc>(),
  };

  const processSnapshot = async () => {
    try {
      const mergedDocs = Array.from(
        new Map([
          ...docsByQuery.legacy.entries(),
          ...docsByQuery.config.entries(),
          ...docsByQuery.object.entries(),
        ]).values(),
      );
      const roadieShows = mapSnapshotDocsToShows(mergedDocs);
      const hydratedShows = await hydrateRoadieShows(
        roadieShows,
        center,
        radiusMiles,
        options,
      );
      await onShows(hydratedShows);
    } catch (error) {
      logRoadieServiceError("subscribeRoadieShows.processSnapshot", error);
      onError?.(
        error instanceof Error
          ? error
          : new Error("Failed to process roadie show updates."),
      );
    }
  };

  const handleSnapshot =
    (key: keyof typeof docsByQuery) => (showsSnapshot: FirestoreShowSnapshot) => {
      const nextDocsByPath = new Map<string, FirestoreShowSnapshotDoc>();
      showsSnapshot.docs.forEach((showDoc) => {
        nextDocsByPath.set(showDoc.ref.path, showDoc);
      });
      docsByQuery[key] = nextDocsByPath;
      void processSnapshot();
    };

  const handleSnapshotError = (error: Error) => {
    logRoadieServiceError("subscribeRoadieShows.onSnapshot", error);
    onError?.(error);
  };

  const unsubscribeLegacy = onSnapshot(
    legacyRoadiesQuery,
    handleSnapshot("legacy"),
    handleSnapshotError,
  );
  const unsubscribeConfig = onSnapshot(
    configRoadiesQuery,
    handleSnapshot("config"),
    handleSnapshotError,
  );
  const unsubscribeObject = onSnapshot(
    objectRoadiesQuery,
    handleSnapshot("object"),
    handleSnapshotError,
  );

  return () => {
    unsubscribeLegacy();
    unsubscribeConfig();
    unsubscribeObject();
  };
};

export const acceptRoadieJob = async (
  show: ShowDoc,
  user: UserProfile,
  shiftType: RoadieShiftType,
): Promise<void> => {
  const showRef = getShowDocRefFromPath(show.path);
  const showIdFromPath = show.path.split("/").filter(Boolean).slice(-1)[0] ?? show.id;
  const showId = show.id || showIdFromPath;
  const assignmentId = `${user.uid}_${shiftType}`;
  const assignmentRef = getRoadieAssignmentRef(show.path, assignmentId);
  const roadieApplicantPath = `roadieApplicants.${assignmentId}`;
  const acceptedCountFieldPath = getShiftAcceptedCountFieldPath(shiftType);
  const shiftStatusFieldPath = getShiftStatusFieldPath(shiftType);

  await runTransaction(FIRESTORE_DB, async (transaction) => {
    const [showSnapshot, assignmentSnapshot] = await Promise.all([
      transaction.get(showRef),
      transaction.get(assignmentRef),
    ]);

    if (!showSnapshot.exists()) {
      throw new Error("This show is no longer available.");
    }

    const showData = showSnapshot.data() as Omit<ShowDoc, "id" | "path">;
    const sourceShow: ShowDoc = {
      id: showId,
      path: show.path,
      ...showData,
    };
    const requiredCount = getRoadieShiftRequired(sourceShow, shiftType);
    const acceptedCount = getRoadieShiftAccepted(sourceShow, shiftType);

    if (requiredCount <= 0) {
      throw new Error("This shift is not currently accepting roadies.");
    }

    if (acceptedCount >= requiredCount) {
      throw new Error("This shift is already full.");
    }

    const existingAssignmentStatus = assignmentSnapshot.exists()
      ? (assignmentSnapshot.data()?.status as string | undefined)
      : undefined;

    if (existingAssignmentStatus === "accepted" || existingAssignmentStatus === "awarded") {
      throw new Error("You already accepted this shift.");
    }

    const roadiePay = getRoadiePay(sourceShow);
    const priceCentsSnapshot =
      typeof roadiePay === "number" && Number.isFinite(roadiePay)
        ? Math.max(0, Math.round(roadiePay * 100))
        : null;

    transaction.set(
      assignmentRef,
      {
        artistId: sourceShow.artistId ?? "",
        showId,
        roadieId: user.uid,
        shiftType,
        status: "accepted",
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        acceptedAt: serverTimestamp(),
        shiftStartsAt: getShiftStartsAtSnapshot(sourceShow, shiftType),
        ...(priceCentsSnapshot != null ? { priceCentsSnapshot } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    const nextAcceptedCount = acceptedCount + 1;
    const isNowFull = nextAcceptedCount >= requiredCount;

    transaction.update(showRef, {
      [roadieApplicantPath]: {
        uid: user.uid,
        status: "accepted",
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        shiftType,
        acceptedAt: serverTimestamp(),
      },
      [acceptedCountFieldPath]: increment(1),
      [shiftStatusFieldPath]: isNowFull ? "FULL" : "OPEN",
      lastRoadieAcceptedAt: serverTimestamp(),
      lastRoadieAcceptedUid: user.uid,
      lastRoadieAcceptedShiftType: shiftType,
    });
  });
};
