import React from "react";
import { render } from "@testing-library/react-native";

import JobsScreen from "./JobsScreen";
import { useRoadieStore } from "../store/useRoadieStore";

jest.mock("../store/useRoadieStore", () => ({
  useRoadieStore: jest.fn(),
}));

const useRoadieStoreMock = useRoadieStore as unknown as jest.Mock;

const bindStore = (state: Record<string, unknown>) => {
  useRoadieStoreMock.mockImplementation((selector: (store: Record<string, unknown>) => unknown) =>
    selector(state),
  );
};

describe("JobsScreen", () => {
  it("renders empty sections", () => {
    bindStore({
      user: null,
      shows: [],
      acceptedShowPaths: [],
      awardedShowPaths: [],
    });

    const { getByText } = render(<JobsScreen />);

    expect(getByText("No awarded jobs yet.")).toBeTruthy();
    expect(getByText("No accepted jobs yet.")).toBeTruthy();
    expect(getByText("No open jobs nearby right now.")).toBeTruthy();
  });

  it("renders awarded, accepted, and open jobs", () => {
    const shows = [
      {
        id: "1",
        path: "artists/a/shows/1",
        requiredRoadies: 2,
        roadiePay: 100,
        venue: { id: "v1", name: "Metro" },
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      },
      {
        id: "2",
        path: "artists/a/shows/2",
        requiredRoadies: 1,
        roadiePay: 120,
        venue: { id: "v2", name: "Vic" },
        artist: null,
        coordinates: { lat: 1, lng: 1 },
        roadieApplicants: { u1: { uid: "u1", status: "accepted" } },
      },
      {
        id: "3",
        path: "artists/a/shows/3",
        requiredRoadies: 5,
        roadiePay: 140,
        venue: { id: "v3", name: "Aragon" },
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      },
    ];

    bindStore({
      user: { uid: "u1" },
      shows,
      acceptedShowPaths: ["artists/a/shows/2"],
      awardedShowPaths: ["artists/a/shows/1"],
    });

    const { getByText, getAllByText } = render(<JobsScreen />);

    expect(getByText("Status: Awarded")).toBeTruthy();
    expect(getByText("Status: Accepted")).toBeTruthy();
    expect(getAllByText("Status: Open").length).toBeGreaterThan(0);
  });

  it("falls back venue label from venueName to Unknown Venue", () => {
    const shows = [
      {
        id: "4",
        path: "artists/a/shows/4",
        requiredRoadies: 1,
        roadiePay: 99,
        venue: null,
        venueName: "Fallback Hall",
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      },
      {
        id: "5",
        path: "artists/a/shows/5",
        requiredRoadies: 1,
        roadiePay: 99,
        venue: null,
        artist: null,
        coordinates: { lat: 1, lng: 1 },
      },
    ];

    bindStore({
      user: { uid: "u1" },
      shows,
      acceptedShowPaths: [],
      awardedShowPaths: [],
    });

    const { getByText } = render(<JobsScreen />);

    expect(getByText("Venue: Fallback Hall")).toBeTruthy();
    expect(getByText("Venue: Unknown Venue")).toBeTruthy();
  });
});
