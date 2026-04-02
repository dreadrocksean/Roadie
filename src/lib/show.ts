import type { HydratedShow, ShowDoc, Venue } from "../types";

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

export const getRequiredRoadies = (show: Pick<ShowDoc, "totalRoadies" | "bookedRoadies" | "roadiesBooked">) => {
  const total = Number(show.totalRoadies ?? 0);
  const booked = Number(show.bookedRoadies ?? show.roadiesBooked ?? 0);
  return Math.max(total - booked, 0);
};

export const getBandName = (show: Pick<ShowDoc, "bandName" | "artistName" | "artistId">, artistName?: string) =>
  show.bandName ?? show.artistName ?? artistName ?? show.artistId ?? "Unknown Band";

export const getBandPhone = (
  show: Pick<ShowDoc, "bandPhone" | "contactPhone">,
  artistPhone?: string,
) => show.bandPhone ?? show.contactPhone ?? artistPhone ?? "Not provided";

export const getRoadiePay = (show: Pick<ShowDoc, "roadiePay" | "payAmount" | "artistFee">) => {
  const pay = show.roadiePay ?? show.payAmount ?? show.artistFee;
  return typeof pay === "number" ? pay : null;
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
  if (venue?.location?.formatted_address) return venue.location.formatted_address;
  if (venue?.location?.address) return venue.location.address;
  return "Address unavailable";
};

export const getLoadInTime = (show: Pick<ShowDoc, "loadInTime" | "scheduledStart">) =>
  formatTimeValue(show.loadInTime ?? show.scheduledStart);

export const getLoadOutTime = (show: Pick<ShowDoc, "loadOutTime" | "scheduledStop">) =>
  formatTimeValue(show.loadOutTime ?? show.scheduledStop);

export const getUserRoadieStatus = (show: ShowDoc, userId: string | null): string | null => {
  if (!userId) return null;

  const applicantStatus = show.roadieApplicants?.[userId]?.status;
  if (applicantStatus) return applicantStatus;

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

  const openSpots = shows.reduce((total, show) => total + show.requiredRoadies, 0);

  return {
    totalRoadieShows: shows.length,
    openSpots,
    acceptedCount: acceptedShowPaths.length,
    awardedCount: awardedShowPaths.length,
    averagePay,
    awardedPay,
  };
};
