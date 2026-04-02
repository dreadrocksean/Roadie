import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Modal } from "react-native";

import MapScreen from "./MapScreen";
import { useRoadieStore } from "../store/useRoadieStore";

jest.mock("../store/useRoadieStore", () => ({
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
  refreshShows: jest.fn(async () => undefined),
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

  it("boots location and refresh on mount", async () => {
    const state = makeState();
    bindStore(state);

    render(<MapScreen />);

    await waitFor(() => {
      expect(state.initializeLocation).toHaveBeenCalledTimes(1);
      expect(state.refreshShows).toHaveBeenCalledTimes(1);
    });
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
      roadiePay: 175,
      loadInTime: new Date("2026-04-02T10:00:00Z"),
      loadOutTime: new Date("2026-04-02T14:00:00Z"),
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
  });

  it("handles accept and cancel actions", async () => {
    const selectedShow = {
      id: "show-2",
      path: "artists/a/shows/show-2",
      requiredRoadies: 1,
      distanceMiles: 1,
      bandName: "Band",
      venue: null,
      artist: null,
      coordinates: { lat: 41.9, lng: -87.63 },
    };

    const state = makeState({
      selectedShow,
      shows: [selectedShow],
      setSelectedShow: jest.fn(),
      acceptSelectedShow: jest.fn(async () => true),
      refreshShows: jest.fn(async () => undefined),
    });
    bindStore(state);

    const { getByText } = render(<MapScreen />);

    fireEvent.press(getByText("Cancel"));
    expect(state.setSelectedShow).toHaveBeenCalledWith(null);

    fireEvent.press(getByText("Accept"));

    await waitFor(() => {
      expect(state.acceptSelectedShow).toHaveBeenCalledTimes(1);
      expect(state.refreshShows).toHaveBeenCalledTimes(2);
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
      venue: null,
      artist: null,
      coordinates: { lat: 41.9, lng: -87.63 },
    };

    const state = makeState({
      selectedShow,
      shows: [selectedShow],
      setSelectedShow: jest.fn(),
      acceptSelectedShow: jest.fn(async () => false),
      refreshShows: jest.fn(async () => undefined),
    });
    bindStore(state);

    const { getByText, UNSAFE_getByType } = render(<MapScreen />);

    await waitFor(() => {
      expect(state.refreshShows).toHaveBeenCalledTimes(1);
    });

    const modal = UNSAFE_getByType(Modal);
    modal.props.onRequestClose();
    expect(state.setSelectedShow).toHaveBeenCalledWith(null);

    fireEvent.press(getByText("Accept"));

    await waitFor(() => {
      expect(state.acceptSelectedShow).toHaveBeenCalledTimes(1);
      expect(state.refreshShows).toHaveBeenCalledTimes(1);
    });
  });
});
