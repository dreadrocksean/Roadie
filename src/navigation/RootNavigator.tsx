import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState } from "react";
import { Menu } from "react-native-paper";

import { logout } from "../lib/firebase";
import AdminScreen from "../screens/AdminScreen";
import JobsScreen from "../screens/JobsScreen";
import LoginScreen from "../screens/LoginScreen";
import MapScreen from "../screens/MapScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useRoadieStore } from "../store/useRoadieStore";
import type { RootStackParamList, TabsParamList } from "../types";
import type { NavigationProp } from "@react-navigation/native";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();
const TAB_ICON_BY_ROUTE: Record<keyof TabsParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Map: "music-note-eighth",
  Jobs: "briefcase-outline",
  Admin: "chart-line",
};

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
          color="#101820"
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
    screenOptions={({ route }) => ({
      headerRight: () => <HeaderMenu />,
      tabBarActiveTintColor: "#D62E2E",
      tabBarInactiveTintColor: "#64748B",
      tabBarIcon: ({ color, size }) => (
        <MaterialCommunityIcons name={TAB_ICON_BY_ROUTE[route.name]} size={size} color={color} />
      ),
    })}
  >
    <Tabs.Screen name="Map" component={MapScreen} />
    <Tabs.Screen name="Jobs" component={JobsScreen} />
    <Tabs.Screen name="Admin" component={AdminScreen} />
  </Tabs.Navigator>
);

const RootNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Tabs"
      component={MainTabs}
      options={{
        title: "Roadie",
        headerShown: false,
      }}
    />
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{
        title: "Login",
        presentation: "modal",
        headerRight: () => <HeaderMenu />,
      }}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        title: "Profile",
        presentation: "modal",
        headerRight: () => <HeaderMenu />,
      }}
    />
  </Stack.Navigator>
);

export default RootNavigator;
