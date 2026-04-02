import React from "react";
import { render } from "@testing-library/react-native";

import AdminScreen from "./AdminScreen";
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

describe("AdminScreen", () => {
  it("renders accounting stats and insights", () => {
    bindStore({
      shows: [
        {
          id: "1",
          path: "artists/a/shows/1",
          requiredRoadies: 2,
          roadiePay: 100,
          distanceMiles: 1,
          venue: null,
          artist: null,
          coordinates: { lat: 1, lng: 1 },
        },
      ],
      acceptedShowPaths: ["artists/a/shows/1"],
      awardedShowPaths: [],
    });

    const { getByText } = render(<AdminScreen />);

    expect(getByText("Accounting Stats")).toBeTruthy();
    expect(getByText("Roadie Shows in Radius")).toBeTruthy();
    expect(getByText("Insights")).toBeTruthy();
  });
});
