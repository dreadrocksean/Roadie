import type {
  HydratedShow,
  RoadieApplicant,
  RoadiesConfig,
  RoadieShiftType,
  ShowDoc,
  Venue,
} from "../types";

const isDateLike = (value: unknown): value is { toDate: () => Date } =>
  typeof value === "object" && value !== null && "toDate" in value;

export const normalizeDate = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (isDateLike(value)) {
    return value.toDate();
  }

  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  return null;
};

export const formatTimeValue = (value: unknown): string => {
  const date = normalizeDate(value);
  if (!date) return "TBD";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const toNonNegativeInt = (value: unknown, fallback = 0): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
};

const getRoadiesConfig = (show: Pick<ShowDoc, "roadies">): RoadiesConfig | null => {
  if (
    show.roadies &&
    typeof show.roadies === "object" &&
    show.roadies.enabled !== false
  ) {
    return show.roadies;
  }
  return null;
};

const getRoadieShiftConfig = (
  roadiesConfig: RoadiesConfig | null,
  shiftType: RoadieShiftType,
) => (shiftType === "loadIn" ? roadiesConfig?.loadIn : roadiesConfig?.loadOut);

export const isRoadiesEnabled = (roadies: ShowDoc["roadies"]): boolean =>
  roadies === true ||
  (roadies != null && typeof roadies === "object" && roadies.enabled !== false);

export const getRequiredRoadies = (
  show: Pick<
    ShowDoc,
    | "roadies"
    | "roadiesCount"
    | "roadiesLoadInCount"
    | "roadiesLoadOutCount"
    | "roadiesBooked"
  >,
) => {
  const roadiesConfig = getRoadiesConfig(show);
  if (roadiesConfig) {
    const loadInRequired = toNonNegativeInt(
      show.roadiesLoadInCount ??
        roadiesConfig.loadIn?.requiredCount ??
        show.roadiesCount ??
        0,
    );
    const loadOutRequired = toNonNegativeInt(
      show.roadiesLoadOutCount ??
        roadiesConfig.loadOut?.requiredCount ??
        show.roadiesCount ??
        0,
    );
    const loadInAccepted = toNonNegativeInt(roadiesConfig.loadIn?.acceptedCount, 0);
    const loadOutAccepted = toNonNegativeInt(roadiesConfig.loadOut?.acceptedCount, 0);

    return (
      Math.max(loadInRequired - loadInAccepted, 0) +
      Math.max(loadOutRequired - loadOutAccepted, 0)
    );
  }

  if (
    typeof show.roadiesLoadInCount === "number" ||
    typeof show.roadiesLoadOutCount === "number"
  ) {
    const total =
      toNonNegativeInt(show.roadiesLoadInCount, 0) +
      toNonNegativeInt(show.roadiesLoadOutCount, 0);
    const booked = toNonNegativeInt(show.roadiesBooked, 0);
    return Math.max(total - booked, 0);
  }

  const total = toNonNegativeInt(show.roadiesCount, 0);
  const booked = toNonNegativeInt(show.roadiesBooked, 0);
  return Math.max(total - booked, 0);
};

export const getRoadieShiftRequired = (
  show: Pick<
    ShowDoc,
    "roadies" | "roadiesCount" | "roadiesLoadInCount" | "roadiesLoadOutCount"
  >,
  shiftType: RoadieShiftType,
) => {
  const roadiesConfig = getRoadiesConfig(show);
  const shiftConfig = getRoadieShiftConfig(roadiesConfig, shiftType);
  const legacyShiftCount =
    shiftType === "loadIn" ? show.roadiesLoadInCount : show.roadiesLoadOutCount;

  return toNonNegativeInt(
    legacyShiftCount ?? shiftConfig?.requiredCount ?? show.roadiesCount ?? 0,
    0,
  );
};

export const getRoadieShiftAccepted = (
  show: Pick<ShowDoc, "roadies">,
  shiftType: RoadieShiftType,
) => {
  const roadiesConfig = getRoadiesConfig(show);
  const shiftConfig = getRoadieShiftConfig(roadiesConfig, shiftType);
  return toNonNegativeInt(shiftConfig?.acceptedCount, 0);
};

export const getRoadieShiftOpen = (
  show: Pick<
    ShowDoc,
    "roadies" | "roadiesCount" | "roadiesLoadInCount" | "roadiesLoadOutCount"
  >,
  shiftType: RoadieShiftType,
) =>
  Math.max(
    getRoadieShiftRequired(show, shiftType) -
      getRoadieShiftAccepted(show, shiftType),
    0,
  );

export const getRoadieShiftNotes = (
  show: Pick<ShowDoc, "roadies" | "roadiesLoadInNotes" | "roadiesLoadOutNotes" | "roadiesNotes">,
  shiftType: RoadieShiftType,
) => {
  const roadiesConfig = getRoadiesConfig(show);
  const shiftConfig = getRoadieShiftConfig(roadiesConfig, shiftType);
  const legacyNotes =
    shiftType === "loadIn" ? show.roadiesLoadInNotes : show.roadiesLoadOutNotes;
  return shiftConfig?.notes ?? legacyNotes ?? show.roadiesNotes ?? "";
};

export const getBandName = (
  show: Pick<ShowDoc, "bandName" | "artistName" | "artistId">,
  artistName?: string,
) =>
  show.bandName ??
  show.artistName ??
  artistName ??
  show.artistId ??
  "Unknown Band";

export const getBandPhone = (
  show: Pick<ShowDoc, "bandPhone" | "contactPhone">,
  artistPhone?: string,
) => show.bandPhone ?? show.contactPhone ?? artistPhone ?? "Not provided";

const parseRoadiePrice = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "").trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "object" && value !== null && "amount" in value) {
    return parseRoadiePrice((value as { amount?: unknown }).amount);
  }

  return null;
};

export const getRoadiePay = (show: ShowDoc) => {
  const roadiesConfig = getRoadiesConfig(show);
  if (typeof roadiesConfig?.priceCents === "number" && Number.isFinite(roadiesConfig.priceCents)) {
    return Math.max(roadiesConfig.priceCents, 0) / 100;
  }

  return parseRoadiePrice((show as { roadiePrice?: unknown }).roadiePrice);
};

export const formatCurrency = (value: number | null): string => {
  if (typeof value !== "number") return "TBD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

export const getVenueAddress = (
  show: Pick<ShowDoc, "venueAddress">,
  venue: Venue | null,
): string => {
  if (show.venueAddress) return show.venueAddress;
  if (venue?.location?.formatted_address)
    return venue.location.formatted_address;
  if (venue?.location?.address) return venue.location.address;
  return "Address unavailable";
};

export const getLoadInTime = (
  show: Pick<ShowDoc, "roadies" | "roadiesLoadInTime" | "loadInTime" | "scheduledStart">,
) => {
  const roadiesConfig = getRoadiesConfig(show);
  return formatTimeValue(
    roadiesConfig?.loadIn?.startsAt ??
      show.roadiesLoadInTime ??
      show.loadInTime ??
      show.scheduledStart,
  );
};

export const getLoadOutTime = (
  show: Pick<ShowDoc, "roadies" | "roadiesLoadOutTime" | "loadOutTime" | "scheduledStop">,
) => {
  const roadiesConfig = getRoadiesConfig(show);
  return formatTimeValue(
    roadiesConfig?.loadOut?.startsAt ??
      show.roadiesLoadOutTime ??
      show.loadOutTime ??
      show.scheduledStop,
  );
};

export const getUserRoadieStatus = (
  show: ShowDoc,
  userId: string | null,
): string | null => {
  if (!userId) return null;

  const loadInStatus = getUserRoadieShiftStatus(show, userId, "loadIn");
  const loadOutStatus = getUserRoadieShiftStatus(show, userId, "loadOut");
  const shiftStatuses = [loadInStatus, loadOutStatus].filter(
    (status): status is string => typeof status === "string",
  );

  if (shiftStatuses.includes("awarded")) return "awarded";
  if (shiftStatuses.includes("accepted")) return "accepted";
  if (shiftStatuses.length > 0) return shiftStatuses[0]!;
  return null;
};

const toRoadieApplicant = (value: unknown): RoadieApplicant | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<RoadieApplicant>;
  if (typeof candidate.uid !== "string") return null;
  return candidate as RoadieApplicant;
};

const getShiftStatusFromApplicant = (
  applicant: RoadieApplicant | null,
  shiftType: RoadieShiftType,
) => {
  if (!applicant?.status) return null;
  if (applicant.shiftType && applicant.shiftType !== shiftType) return null;
  return applicant.status;
};

export const getUserRoadieShiftStatus = (
  show: Pick<
    ShowDoc,
    "roadieApplicants" | "awardedRoadieUids" | "roadieAwardedUids"
  >,
  userId: string | null,
  shiftType: RoadieShiftType,
): string | null => {
  if (!userId) return null;

  const applicants = show.roadieApplicants ?? {};
  const keyedShiftStatus = getShiftStatusFromApplicant(
    toRoadieApplicant(applicants[`${userId}_${shiftType}`]),
    shiftType,
  );
  if (keyedShiftStatus) return keyedShiftStatus;

  const legacyStatus = getShiftStatusFromApplicant(
    toRoadieApplicant(applicants[userId]),
    shiftType,
  );
  if (legacyStatus) return legacyStatus;

  const applicantStatuses = Object.values(applicants)
    .map(toRoadieApplicant)
    .filter(
      (applicant): applicant is RoadieApplicant =>
        applicant !== null && applicant.uid === userId,
    )
    .map((applicant) => getShiftStatusFromApplicant(applicant, shiftType))
    .filter((status): status is NonNullable<typeof status> => status != null);

  if (applicantStatuses.includes("awarded")) return "awarded";
  if (applicantStatuses.includes("accepted")) return "accepted";
  if (applicantStatuses.length > 0) return applicantStatuses[0]!;

  if (show.awardedRoadieUids?.includes(userId)) return "awarded";
  if (show.roadieAwardedUids?.includes(userId)) return "awarded";
  return null;
};

export const isAwardedToUser = (show: ShowDoc, userId: string | null) =>
  getUserRoadieStatus(show, userId) === "awarded";

export const summarizeAdminStats = (
  shows: HydratedShow[],
  acceptedShowPaths: string[],
  awardedShowPaths: string[],
) => {
  const payValues = shows
    .map((show) => getRoadiePay(show))
    .filter((value): value is number => typeof value === "number");

  const averagePay =
    payValues.length > 0
      ? payValues.reduce((total, value) => total + value, 0) / payValues.length
      : 0;

  const awardedPay = shows
    .filter((show) => awardedShowPaths.includes(show.path))
    .map((show) => getRoadiePay(show) ?? 0)
    .reduce((total, value) => total + value, 0);

  const openSpots = shows.reduce(
    (total, show) => total + show.requiredRoadies,
    0,
  );

  return {
    totalRoadieShows: shows.length,
    openSpots,
    acceptedCount: acceptedShowPaths.length,
    awardedCount: awardedShowPaths.length,
    averagePay,
    awardedPay,
  };
};
