import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { FIRESTORE_DB, doc, setDoc } from "../lib/firebase";

export const PUSH_APP_ID = "tmwtp-roadie";

export const getPushTokenDocId = (appId: string, token: string) => `${appId}__${token}`;

export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

const getProjectId = () =>
  Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? null;

const getExpoPushToken = async (): Promise<string | null> => {
  if (!Device.isDevice) return null;

  const projectId = getProjectId();
  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenResponse.data;
};

export const registerForPushNotificationsAsync = async (
  userId: string | null,
  appId = PUSH_APP_ID,
): Promise<string | null> => {
  if (Platform.OS === "ios" && Device.isDevice === false) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const token = await getExpoPushToken();
  if (!token || !userId) return token;

  const pushTokenDocId = getPushTokenDocId(appId, token);

  await setDoc(
    doc(FIRESTORE_DB, "users", userId, "pushTokens", pushTokenDocId),
    {
      token,
      appId,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  return token;
};

export const sendLocalAwardNotification = async (title: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Roadie Job Awarded",
      body: `You were awarded: ${title}`,
      sound: "default",
    },
    trigger: null,
  });
};
