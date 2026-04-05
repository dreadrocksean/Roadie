import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";

import RootNavigator from "./RootNavigator";
import { logout } from "../lib/firebase";
import { useRoadieStore } from "../store/useRoadieStore";

jest.mock("../store/useRoadieStore", () => ({
  useRoadieStore: jest.fn(),
}));

jest.mock("../lib/firebase", () => ({
  logout: jest.fn(async () => undefined),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: ({ onPress, testID, name }: any) => {
    const React = require("react");
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable onPress={onPress} testID={testID ?? `icon-${name}`}>
        <Text>{name}</Text>
      </Pressable>
    );
  },
}));

jest.mock("react-native-paper", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  const Menu = ({ visible, anchor, children, onDismiss }: any) => (
    <View>
      {anchor}
      {visible ? (
        <View>
          <Pressable testID="menu-dismiss" onPress={onDismiss}>
            <Text>dismiss</Text>
          </Pressable>
          {children}
        </View>
      ) : null}
    </View>
  );

  Menu.Item = ({ title, onPress, disabled }: any) => (
    <Pressable
      testID={`menu-item-${title}`}
      onPress={() => {
        if (!disabled) onPress();
      }}
    >
      <Text>{title}</Text>
    </Pressable>
  );

  return { Menu };
});

jest.mock("../screens/MapScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text>MAP_SCREEN</Text>;
});
jest.mock("../screens/JobsScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text>JOBS_SCREEN</Text>;
});
jest.mock("../screens/AdminScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text>ADMIN_SCREEN</Text>;
});
jest.mock("../screens/LoginScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text>LOGIN_SCREEN</Text>;
});
jest.mock("../screens/ProfileScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text>PROFILE_SCREEN</Text>;
});
jest.mock("../screens/ContractScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text>CONTRACT_SCREEN</Text>;
});

const useRoadieStoreMock = useRoadieStore as unknown as jest.Mock;

const bindStore = (state: Record<string, unknown>) => {
  useRoadieStoreMock.mockImplementation((selector: (store: Record<string, unknown>) => unknown) =>
    selector(state),
  );
};

describe("RootNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders login root when user is signed out", () => {
    bindStore({ user: null });

    const { getByText, queryByTestId } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    expect(getByText("LOGIN_SCREEN")).toBeTruthy();
    expect(queryByTestId("header-logo-button")).toBeNull();
    expect(queryByTestId("header-menu-button")).toBeNull();
  });

  it("renders tab root for signed in user", () => {
    bindStore({ user: { uid: "u1", roadieId: "r1", roadieContractAcceptedAt: 1 } });

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    expect(getByText("MAP_SCREEN")).toBeTruthy();
    expect(getByTestId("header-logo-button")).toBeTruthy();
  });

  it("renders profile root when signed in user is missing roadie id", () => {
    bindStore({ user: { uid: "u1", roadieId: null, roadieContractAcceptedAt: 1 } });

    const { getByText } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    expect(getByText("PROFILE_SCREEN")).toBeTruthy();
  });

  it("navigates back to map when logo is pressed", async () => {
    bindStore({ user: { uid: "u1", roadieId: "r1", roadieContractAcceptedAt: 1 } });

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    fireEvent.press(getByText("Jobs"));
    await waitFor(() => {
      expect(getByText("JOBS_SCREEN")).toBeTruthy();
    });

    fireEvent.press(getByTestId("header-logo-button"));

    await waitFor(() => {
      expect(getByText("MAP_SCREEN")).toBeTruthy();
    });
  });

  it("navigates to profile and can logout when user exists", async () => {
    bindStore({ user: { uid: "u1", roadieId: "r1", roadieContractAcceptedAt: 1 } });

    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    fireEvent.press(getByTestId("header-menu-button"));
    fireEvent.press(getByTestId("menu-item-Profile"));

    await waitFor(() => {
      expect(getByText("PROFILE_SCREEN")).toBeTruthy();
    });

    fireEvent.press(getByTestId("header-menu-button"));
    fireEvent.press(getByTestId("menu-item-Logout"));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
    });
  });

  it("navigates home from profile modal logo", async () => {
    bindStore({ user: { uid: "u1", roadieId: "r1", roadieContractAcceptedAt: 1 } });

    const { getByTestId, getByText, getAllByTestId, queryByText } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    fireEvent.press(getByTestId("header-menu-button"));
    fireEvent.press(getByTestId("menu-item-Profile"));

    await waitFor(() => {
      expect(getByText("PROFILE_SCREEN")).toBeTruthy();
    });

    fireEvent.press(getAllByTestId("header-logo-button").at(-1)!);

    await waitFor(() => {
      expect(getByText("MAP_SCREEN")).toBeTruthy();
      expect(queryByText("PROFILE_SCREEN")).toBeNull();
    });
  });

  it("dismisses menu without navigation", async () => {
    bindStore({ user: { uid: "u1", roadieId: "r1", roadieContractAcceptedAt: 1 } });

    const { getByTestId, queryByTestId } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    fireEvent.press(getByTestId("header-menu-button"));
    expect(queryByTestId("menu-item-Login")).toBeTruthy();

    fireEvent.press(getByTestId("menu-dismiss"));

    await waitFor(() => {
      expect(queryByTestId("menu-item-Login")).toBeNull();
    });
  });

  it("renders contract root when signed in user has not accepted agreement", () => {
    bindStore({ user: { uid: "u1", roadieId: "r1", roadieContractAcceptedAt: null } });

    const { getByText } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    expect(getByText("CONTRACT_SCREEN")).toBeTruthy();
  });

  it("guards tabs route for missing auth, missing contract, and missing roadie id", () => {
    bindStore({ user: null });
    const { getByText, rerender } = render(
      <NavigationContainer
        initialState={{ routes: [{ name: "Tabs" }] }}
      >
        <RootNavigator />
      </NavigationContainer>,
    );
    expect(getByText("LOGIN_SCREEN")).toBeTruthy();

    bindStore({
      user: { uid: "u1", roadieId: "r1", roadieContractAcceptedAt: null },
    });
    rerender(
      <NavigationContainer
        initialState={{ routes: [{ name: "Tabs" }] }}
      >
        <RootNavigator />
      </NavigationContainer>,
    );
    expect(getByText("CONTRACT_SCREEN")).toBeTruthy();

    bindStore({
      user: { uid: "u1", roadieId: null, roadieContractAcceptedAt: 1 },
    });
    rerender(
      <NavigationContainer
        initialState={{ routes: [{ name: "Tabs" }] }}
      >
        <RootNavigator />
      </NavigationContainer>,
    );
    expect(getByText("PROFILE_SCREEN")).toBeTruthy();
  });

  it("shows authenticated login header controls when Login route is opened", async () => {
    bindStore({ user: { uid: "u1", roadieId: "r1", roadieContractAcceptedAt: 1 } });

    const { getByText, getByTestId } = render(
      <NavigationContainer
        initialState={{ routes: [{ name: "Login" }] }}
      >
        <RootNavigator />
      </NavigationContainer>,
    );

    expect(getByText("LOGIN_SCREEN")).toBeTruthy();
    expect(getByTestId("header-logo-button")).toBeTruthy();
    expect(getByTestId("header-menu-button")).toBeTruthy();

    fireEvent.press(getByTestId("header-logo-button"));
    await waitFor(() => {
      expect(getByText("MAP_SCREEN")).toBeTruthy();
    });
  });

  it("handles login menu navigation when menu is shown without a user", async () => {
    bindStore({ user: null });

    const { getByTestId, getByText } = render(
      <NavigationContainer
        initialState={{ routes: [{ name: "Contract" }] }}
      >
        <RootNavigator />
      </NavigationContainer>,
    );

    fireEvent.press(getByTestId("header-menu-button"));
    fireEvent.press(getByTestId("menu-item-Login"));

    await waitFor(() => {
      expect(getByText("LOGIN_SCREEN")).toBeTruthy();
    });
  });

  it("navigates to map from contract header logo", async () => {
    bindStore({ user: { uid: "u1", roadieId: "r1", roadieContractAcceptedAt: 1 } });

    const { getAllByTestId, getByText } = render(
      <NavigationContainer
        initialState={{ routes: [{ name: "Contract" }] }}
      >
        <RootNavigator />
      </NavigationContainer>,
    );

    fireEvent.press(getAllByTestId("header-logo-button").at(-1)!);

    await waitFor(() => {
      expect(getByText("MAP_SCREEN")).toBeTruthy();
    });
  });
});
