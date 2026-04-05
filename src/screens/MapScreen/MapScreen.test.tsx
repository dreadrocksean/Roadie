import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Modal } from "react-native";

import MapScreen from "./MapScreen";
import { useRoadieStore } from "../../store/useRoadieStore";

jest.mock("../../store/useRoadieStore", () => ({
  useRoadieStore: jest.fn(),
}));

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    __esModule: true,
    default: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Circle: ({ ...props }: any) => <View {...props} />,
    Marker: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

const useRoadieStoreMock = useRoadieStore as unknown as jest.Mock;

const makeState = (overrides: Record<string, unknown> = {}) => ({
  location: { lat: 41.9, lng: -87.63 },
  shows: [],
  isLoadingShows: false,
  selectedShow: null,
  error: null,
  setSelectedShow: jest.fn(),
  initializeLocation: jest.fn(async () => undefined),
  startShowsListener: jest.fn(async () => undefined),
  stopShowsListener: jest.fn(),
  acceptSelectedShow: jest.fn(async () => true),
  ...overrides,
});

const bindStore = (state: Record<string, unknown>) => {
  useRoadieStoreMock.mockImplementation((selector: (store: Record<string, unknown>) => unknown) =>
    selector(state),
  );
};

describe("MapScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("boots location and starts listener on mount, then stops on unmount", async () => {
    const state = makeState();
    bindStore(state);

    const { unmount } = render(<MapScreen />);

    await waitFor(() => {
      expect(state.initializeLocation).toHaveBeenCalledTimes(1);
      expect(state.startShowsListener).toHaveBeenCalledTimes(1);
    });

    unmount();
    expect(state.stopShowsListener).toHaveBeenCalledTimes(1);
  });

  it("renders no-show banner and errors", () => {
    const state = makeState({ error: "Something broke" });
    bindStore(state);

    const { getByText } = render(<MapScreen />);

    expect(getByText("No roadie shows currently within 30 miles.")).toBeTruthy();
    expect(getByText("Something broke")).toBeTruthy();
  });

  it("renders markers and show modal details", () => {
    const selectedShow = {
      id: "show-1",
      path: "artists/a/shows/show-1",
      requiredRoadies: 2,
      distanceMiles: 1,
      venueName: "The Metro",
      venueAddress: "123 Main St",
      bandName: "The Headliners",
      contactPhone: "555-1111",
      roadiePrice: 175,
      loadInTime: new Date("2026-04-02T10:00:00Z"),
      loadOutTime: new Date("2026-04-02T14:00:00Z"),
      roadiesLoadInCount: 1,
      roadiesLoadOutCount: 1,
      venue: { id: "v1", name: "The Metro", location: { address: "123 Main St" } },
      artist: null,
      coordinates: { lat: 41.9, lng: -87.63 },
    };

    const state = makeState({
      selectedShow,
      shows: [selectedShow],
    });
    bindStore(state);

    const { getByTestId, getByText } = render(<MapScreen />);

    expect(getByTestId("roadie-marker-show-1")).toBeTruthy();
    expect(getByText("The Headliners")).toBeTruthy();
    expect(getByText(/Roadie Pay:/)).toBeTruthy();
    expect(getByText("Load-In Shift")).toBeTruthy();
    expect(getByText("Load-Out Shift")).toBeTruthy();
  });

  it("handles accept and cancel actions", async () => {
    const selectedShow = {
      id: "show-2",
      path: "artists/a/shows/show-2",
      requiredRoadies: 1,
      distanceMiles: 1,
      bandName: "Band",
      roadiesLoadInCount: 1,
      roadiesLoadOutCount: 1,
      venue: null,
      artist: null,
      coordinates: { lat: 41.9, lng: -87.63 },
    };

    const state = makeState({
      selectedShow,
      shows: [selectedShow],
      setSelectedShow: jest.fn(),
      acceptSelectedShow: jest.fn(async () => true),
    });
    bindStore(state);

    const { getByText } = render(<MapScreen />);

    fireEvent.press(getByText("Close"));
    expect(state.setSelectedShow).toHaveBeenCalledWith(null);

    fireEvent.press(getByText("Accept Load-In"));

    await waitFor(() => {
      expect(state.acceptSelectedShow).toHaveBeenCalledWith("loadIn");
    });
  });

  it("shows loading overlay", () => {
    const state = makeState({ isLoadingShows: true });
    bindStore(state);

    const { getByTestId } = render(<MapScreen />);

    expect(getByTestId("roadie-map-loading")).toBeTruthy();
  });

  it("sets selected show from marker press and skips markers without coordinates", () => {
    const showWithCoords = {
      id: "show-3",
      path: "artists/a/shows/show-3",
      requiredRoadies: 3,
      distanceMiles: 1,
      bandName: "Band Three",
      venue: null,
      artist: null,
      coordinates: { lat: 41.9, lng: -87.63 },
    };
    const showWithoutCoords = {
      id: "show-4",
      path: "artists/a/shows/show-4",
      requiredRoadies: 1,
      distanceMiles: null,
      bandName: "Band Four",
      venue: null,
      artist: null,
      coordinates: null,
    };

    const state = makeState({
      selectedShow: null,
      shows: [showWithCoords, showWithoutCoords],
      setSelectedShow: jest.fn(),
    });
    bindStore(state);

    const { getByTestId, queryByTestId } = render(<MapScreen />);

    expect(getByTestId("roadie-marker-show-3")).toBeTruthy();
    expect(queryByTestId("roadie-marker-show-4")).toBeNull();

    fireEvent.press(getByTestId("roadie-marker-show-3"));
    expect(state.setSelectedShow).toHaveBeenCalledWith(showWithCoords);
  });

  it("does not refresh after accept when acceptSelectedShow returns false", async () => {
    const selectedShow = {
      id: "show-5",
      path: "artists/a/shows/show-5",
      requiredRoadies: 1,
      distanceMiles: 1,
      bandName: "Band Five",
      roadiesLoadInCount: 1,
      roadiesLoadOutCount: 1,
      venue: null,
      artist: null,
      coordinates: { lat: 41.9, lng: -87.63 },
    };

    const state = makeState({
      selectedShow,
      shows: [selectedShow],
      setSelectedShow: jest.fn(),
      acceptSelectedShow: jest.fn(async () => false),
    });
    bindStore(state);

    const { getByText, UNSAFE_getByType } = render(<MapScreen />);

    const modal = UNSAFE_getByType(Modal);
    modal.props.onRequestClose();
    expect(state.setSelectedShow).toHaveBeenCalledWith(null);

    fireEvent.press(getByText("Accept Load-In"));

    await waitFor(() => {
      expect(state.acceptSelectedShow).toHaveBeenCalledWith("loadIn");
    });
  });
});
