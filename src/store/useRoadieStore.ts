import * as Location from "expo-location";
import { create } from "zustand";

import { isAwardedToUser, getUserRoadieStatus } from "../lib/show";
import { acceptRoadieJob, fetchRoadieShows } from "../services/roadie";
import { sendLocalAwardNotification } from "../services/pushNotifications";
import type { GeoPointLite, HydratedShow, RoadieApplicant, UserProfile } from "../types";

const ROADIE_RADIUS_MILES = 30;
const DEFAULT_CENTER: GeoPointLite = { lat: 41.8781, lng: -87.6298 };

type RoadieStore = {
  user: UserProfile | null;
  authReady: boolean;
  location: GeoPointLite;
  locationError: string | null;
  shows: HydratedShow[];
  isLoadingShows: boolean;
  selectedShow: HydratedShow | null;
  acceptedShowPaths: string[];
  awardedShowPaths: string[];
  error: string | null;
  setUser: (user: UserProfile | null) => void;
  setAuthReady: (ready: boolean) => void;
  setSelectedShow: (show: HydratedShow | null) => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  initializeLocation: () => Promise<GeoPointLite>;
  refreshShows: () => Promise<void>;
  acceptSelectedShow: () => Promise<boolean>;
};

export const useRoadieStore = create<RoadieStore>((set, get) => ({
  user: null,
  authReady: false,
  location: DEFAULT_CENTER,
  locationError: null,
  shows: [],
  isLoadingShows: false,
  selectedShow: null,
  acceptedShowPaths: [],
  awardedShowPaths: [],
  error: null,

  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setSelectedShow: (selectedShow) => set({ selectedShow }),
  setUserProfile: (profile) =>
    set((state) => {
      if (!state.user) return state;
      return { user: { ...state.user, ...profile } };
    }),

  initializeLocation: async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      set({
        location: DEFAULT_CENTER,
        locationError: "Location permission denied. Using default city center.",
      });
      return DEFAULT_CENTER;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const nextLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    set({
      location: nextLocation,
      locationError: null,
    });

    return nextLocation;
  },

  refreshShows: async () => {
    set({ isLoadingShows: true, error: null });

    try {
      const center = get().location ?? (await get().initializeLocation());
      const roadieShows = await fetchRoadieShows(center, ROADIE_RADIUS_MILES);
      const userId = get().user?.uid ?? null;

      const awardedShowPaths = userId
        ? roadieShows.filter((show) => isAwardedToUser(show, userId)).map((show) => show.path)
        : [];

      const acceptedShowPathsFromData = userId
        ? roadieShows
            .filter((show) => {
              const status = getUserRoadieStatus(show, userId);
              return status === "accepted" || status === "awarded";
            })
            .map((show) => show.path)
        : [];

      const newAwardedPaths = awardedShowPaths.filter(
        (path) => !get().awardedShowPaths.includes(path),
      );

      if (newAwardedPaths.length > 0) {
        const awardedTitles = roadieShows
          .filter((show) => newAwardedPaths.includes(show.path))
          .map((show) => show.venue?.name ?? show.venueName ?? show.bandName ?? "Roadie show");

        await Promise.all(awardedTitles.map((title) => sendLocalAwardNotification(title)));
      }

      set((state) => ({
        shows: roadieShows,
        awardedShowPaths,
        acceptedShowPaths: Array.from(
          new Set([...state.acceptedShowPaths, ...acceptedShowPathsFromData]),
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to refresh roadie shows.",
      });
    } finally {
      set({ isLoadingShows: false });
    }
  },

  acceptSelectedShow: async () => {
    const selectedShow = get().selectedShow;
    const user = get().user;

    if (!selectedShow || !user) {
      set({ error: "You must be logged in to accept roadie jobs." });
      return false;
    }

    try {
      await acceptRoadieJob(selectedShow, user);

      set((state) => {
        const acceptedApplicant: RoadieApplicant = {
          uid: user.uid,
          status: "accepted",
          displayName: user.displayName ?? "",
          email: user.email ?? "",
          phone: user.phone ?? "",
        };

        const updatedShows = state.shows.map((show) =>
          show.path === selectedShow.path
            ? {
                ...show,
                roadieApplicants: {
                  ...(show.roadieApplicants ?? {}),
                  [user.uid]: acceptedApplicant,
                },
              }
            : show,
        );

        return {
          shows: updatedShows,
          acceptedShowPaths: Array.from(new Set([...state.acceptedShowPaths, selectedShow.path])),
          selectedShow: null,
          error: null,
        };
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to accept roadie job.",
      });
      return false;
    }
  },
}));
