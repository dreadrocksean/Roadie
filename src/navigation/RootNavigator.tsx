import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState } from "react";
import { Image, Pressable, StyleSheet } from "react-native";
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
import roadieLogo from "../../assets/images/logo.png";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();
const TAB_ICON_BY_ROUTE: Record<keyof TabsParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Map: "music-note-eighth",
  Jobs: "briefcase-outline",
  Admin: "chart-line",
};

const HeaderLogo = ({ onPress }: { onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.logoPressable} testID="header-logo-button">
    <Image source={roadieLogo} style={styles.logoImage} />
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
    screenOptions={({ route, navigation }) => ({
      headerLeft: () => <HeaderLogo onPress={() => navigation.navigate("Map")} />,
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
      options={({ navigation }) => ({
        title: "Login",
        presentation: "modal",
        headerLeft: () => (
          <HeaderLogo onPress={() => navigation.navigate("Tabs", { screen: "Map" })} />
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
          <HeaderLogo onPress={() => navigation.navigate("Tabs", { screen: "Map" })} />
        ),
        headerRight: () => <HeaderMenu />,
      })}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  logoPressable: {
    marginLeft: 10,
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
});

export default RootNavigator;
