export type GeoPointLite = {
  lat: number;
  lng: number;
};

export type VenueLocation = {
  address?: string;
  formatted_address?: string;
  locality?: string;
  region?: string;
  postcode?: string;
};

export type Venue = {
  id: string;
  name?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  geocodes?: {
    main?: {
      latitude?: number;
      longitude?: number;
    };
  };
  location?: VenueLocation;
};

export type Artist = {
  id: string;
  name?: string;
  phone?: string;
};

export type RoadieApplicant = {
  uid: string;
  status: "accepted" | "awarded" | "declined";
  displayName?: string;
  email?: string;
  phone?: string;
  shiftType?: RoadieShiftType;
  acceptedAt?: unknown;
};

export type RoadieShiftType = "loadIn" | "loadOut";

export type RoadieShift = {
  requiredCount?: number;
  acceptedCount?: number;
  startsAt?: unknown;
  notes?: string;
  status?: string;
};

export type RoadiesConfig = {
  enabled?: boolean;
  currency?: string;
  priceCents?: number;
  loadIn?: RoadieShift;
  loadOut?: RoadieShift;
  updatedAt?: unknown;
};

export type ShowDoc = {
  id: string;
  path: string;
  artistId?: string;
  artistUserId?: string;
  venueId?: string;
  roadies?: boolean | RoadiesConfig;
  roadiesCount?: number;
  roadiesLoadInCount?: number;
  roadiesLoadOutCount?: number;
  totalRoadies?: number;
  roadiesBooked?: number;
  roadiesConfirmedCount?: number;
  roadiesNotes?: string;
  roadiesLoadInTime?: unknown;
  roadiesLoadOutTime?: unknown;
  roadiesLoadInNotes?: string;
  roadiesLoadOutNotes?: string;
  loadInTime?: unknown;
  loadOutTime?: unknown;
  scheduledStart?: unknown;
  scheduledStop?: unknown;
  venueName?: string;
  venueAddress?: string;
  bandName?: string;
  artistName?: string;
  bandPhone?: string;
  contactPhone?: string;
  roadiePrice?: number;
  payAmount?: number;
  artistFee?: number;
  lat?: number;
  lng?: number;
  location?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  } | null;
  roadieApplicants?: Record<string, RoadieApplicant>;
  awardedRoadieUids?: string[];
  roadieAwardedUids?: string[];
  [key: string]: unknown;
};

export type HydratedShow = ShowDoc & {
  venue: Venue | null;
  artist: Artist | null;
  coordinates: GeoPointLite | null;
  requiredRoadies: number;
  distanceMiles: number | null;
};

export type UserProfile = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  phone?: string | null;
  bio?: string | null;
  address?: string | null;
  photoURL?: string | null;
  roadieId?: string | null;
  roadieContractAcceptedAt?: unknown | null;
  roadieContractVersion?: string | null;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList> | undefined;
  Login: undefined;
  Contract: undefined;
  Profile: undefined;
};

export type TabsParamList = {
  Map: undefined;
  Jobs: undefined;
  Admin: undefined;
};
import type { NavigatorScreenParams } from "@react-navigation/native";
