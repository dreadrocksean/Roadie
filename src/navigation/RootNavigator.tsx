import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState } from "react";
import { Image, Pressable } from "react-native";
import { Menu } from "react-native-paper";

import { logout } from "../lib/firebase";
import AdminScreen from "../screens/AdminScreen";
import ContractScreen from "../screens/ContractScreen";
import JobsScreen from "../screens/JobsScreen";
import LoginScreen from "../screens/LoginScreen";
import MapScreen from "../screens/MapScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useRoadieStore } from "../store/useRoadieStore";
import { palette } from "../theme/colors";
import type { RootStackParamList, TabsParamList } from "../types";
import type { NavigationProp } from "@react-navigation/native";
import roadieLogo from "../../assets/images/logo.png";

import styles from "./styles";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();
const TAB_ICON_BY_ROUTE: Record<
  keyof TabsParamList,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  Map: "music-note-eighth",
  Jobs: "briefcase-outline",
  Admin: "chart-line",
};

const HeaderLogo = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    style={styles.logoPressable}
    testID="header-logo-button"
  >
    <Image source={roadieLogo} style={styles.logoImage} resizeMode="contain" />
  </Pressable>
);

const HeaderMenu = () => {
  const [visible, setVisible] = useState(false);
  const user = useRoadieStore((state) => state.user);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleLogin = () => {
    setVisible(false);
    navigation.navigate("Login");
  };

  const handleProfile = () => {
    setVisible(false);
    navigation.navigate("Profile");
  };

  const handleLogout = async () => {
    setVisible(false);
    await logout();
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <MaterialCommunityIcons
          name="menu"
          size={24}
          color={palette.white}
          style={{ marginRight: 10 }}
          onPress={() => setVisible(true)}
          testID="header-menu-button"
        />
      }
    >
      <Menu.Item title="Login" onPress={handleLogin} disabled={Boolean(user)} />
      <Menu.Item title="Profile" onPress={handleProfile} disabled={!user} />
      <Menu.Item title="Logout" onPress={handleLogout} disabled={!user} />
    </Menu>
  );
};

const MainTabs = () => (
  <Tabs.Navigator
    initialRouteName="Map"
    screenOptions={({ route, navigation }) => ({
      headerLeft: () => (
        <HeaderLogo onPress={() => navigation.navigate("Map")} />
      ),
      headerRight: () => <HeaderMenu />,
      headerStyle: { backgroundColor: palette.black },
      headerTintColor: palette.white,
      tabBarStyle: {
        backgroundColor: palette.black,
        borderTopColor: palette.gray700,
      },
      tabBarActiveTintColor: palette.accentRed,
      tabBarInactiveTintColor: palette.gray300,
      tabBarIcon: ({ color, size }) => (
        <MaterialCommunityIcons
          name={TAB_ICON_BY_ROUTE[route.name]}
          size={size}
          color={color}
        />
      ),
    })}
  >
    <Tabs.Screen name="Map" component={MapScreen} />
    <Tabs.Screen name="Jobs" component={JobsScreen} />
    <Tabs.Screen name="Admin" component={AdminScreen} />
  </Tabs.Navigator>
);

const GuardedTabs = () => {
  const user = useRoadieStore((state) => state.user);

  if (!user) {
    return <LoginScreen />;
  }

  if (!user.roadieContractAcceptedAt) {
    return <ContractScreen />;
  }

  if (!user.roadieId) {
    return <ProfileScreen />;
  }

  return <MainTabs />;
};

const RootNavigator = () => {
  const user = useRoadieStore((state) => state.user);
  const isAuthenticated = Boolean(user);
  const hasAcceptedContract = Boolean(user?.roadieContractAcceptedAt);
  const hasRoadieId = Boolean(user?.roadieId);
  const startRoute = !isAuthenticated
    ? "Login"
    : !hasAcceptedContract
      ? "Contract"
      : hasRoadieId
      ? "Tabs"
      : "Profile";
  const navigatorKey = !isAuthenticated
    ? "guest"
    : !hasAcceptedContract
      ? "auth-missing-contract"
      : hasRoadieId
      ? "auth-complete"
      : "auth-missing-roadie";

  return (
    <Stack.Navigator key={navigatorKey} initialRouteName={startRoute}>
      <Stack.Screen
        name="Tabs"
        component={GuardedTabs}
        options={{
          title: "Roadie",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={({ navigation }) => ({
          title: "Login",
          presentation: isAuthenticated ? "modal" : "card",
          headerLeft: isAuthenticated
            ? () => (
                <HeaderLogo
                  onPress={() => navigation.navigate("Tabs", { screen: "Map" })}
                />
              )
            : undefined,
          headerRight: isAuthenticated ? () => <HeaderMenu /> : undefined,
        })}
      />
      <Stack.Screen
        name="Contract"
        component={ContractScreen}
        options={({ navigation }) => ({
          title: "Agreement",
          presentation: "card",
          headerLeft: () => (
            <HeaderLogo
              onPress={() => navigation.navigate("Tabs", { screen: "Map" })}
            />
          ),
          headerRight: () => <HeaderMenu />,
        })}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          title: "Profile",
          presentation: "modal",
          headerLeft: () => (
            <HeaderLogo
              onPress={() => navigation.navigate("Tabs", { screen: "Map" })}
            />
          ),
          headerRight: () => <HeaderMenu />,
        })}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
