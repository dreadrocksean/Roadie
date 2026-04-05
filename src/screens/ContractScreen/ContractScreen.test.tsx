import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ContractScreen from "./ContractScreen";
import { setDoc } from "../../lib/firebase";
import { useRoadieStore } from "../../store/useRoadieStore";

jest.mock("../../store/useRoadieStore", () => ({
  useRoadieStore: jest.fn(),
}));

jest.mock("../../lib/firebase", () => ({
  FIRESTORE_DB: { id: "db" },
  doc: jest.fn((_db, ...segments: string[]) => ({ path: segments.join("/") })),
  serverTimestamp: jest.fn(() => "ts"),
  setDoc: jest.fn(async () => undefined),
}));

const useRoadieStoreMock = useRoadieStore as unknown as jest.Mock;

const bindStore = (state: Record<string, unknown>) => {
  useRoadieStoreMock.mockImplementation(
    (selector: (store: Record<string, unknown>) => unknown) => selector(state),
  );
};

describe("ContractScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders login prompt when user is missing", () => {
    bindStore({
      user: null,
      setUserProfile: jest.fn(),
    });

    const { getByText } = render(<ContractScreen />);

    expect(getByText("Roadie Agreement")).toBeTruthy();
    expect(getByText("Log in to review and accept the agreement.")).toBeTruthy();
  });

  it("accepts agreement and updates user profile", async () => {
    const setUserProfileMock = jest.fn();

    bindStore({
      user: { uid: "u1" },
      setUserProfile: setUserProfileMock,
    });

    const { getByTestId, findByText } = render(<ContractScreen />);

    fireEvent.press(getByTestId("contract-accept"));

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "users/u1" }),
        expect.objectContaining({
          roadieContractAcceptedAt: "ts",
          roadieContractVersion: "v1",
          updatedAt: "ts",
        }),
        { merge: true },
      );
      expect(setUserProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          roadieContractVersion: "v1",
        }),
      );
    });

    expect(await findByText("Agreement accepted.")).toBeTruthy();
  });

  it("shows error message when save fails", async () => {
    bindStore({
      user: { uid: "u2" },
      setUserProfile: jest.fn(),
    });

    (setDoc as jest.Mock).mockRejectedValueOnce(new Error("contract-save-failed"));

    const { getByTestId, findByText } = render(<ContractScreen />);
    fireEvent.press(getByTestId("contract-accept"));

    expect(await findByText("contract-save-failed")).toBeTruthy();
  });

  it("falls back to a generic error message for unknown failures", async () => {
    bindStore({
      user: { uid: "u3" },
      setUserProfile: jest.fn(),
    });

    (setDoc as jest.Mock).mockRejectedValueOnce("save-failed");

    const { getByTestId, findByText } = render(<ContractScreen />);
    fireEvent.press(getByTestId("contract-accept"));

    expect(await findByText("Failed to accept agreement.")).toBeTruthy();
  });
});
