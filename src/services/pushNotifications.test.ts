type LoadOptions = {
  platformOS?: "ios" | "android";
  isDevice?: boolean;
  existingStatus?: "granted" | "denied" | "undetermined";
  requestStatus?: "granted" | "denied" | "undetermined";
  easProjectId?: string | null;
  fallbackProjectId?: string | null;
  pushToken?: string;
};

const loadPushNotificationsModule = (options: LoadOptions = {}) => {
  const {
    platformOS = "ios",
    isDevice = true,
    existingStatus = "granted",
    requestStatus = "granted",
    easProjectId = "project-123",
    fallbackProjectId = "project-fallback",
    pushToken = "ExponentPushToken[test]",
  } = options;

  jest.resetModules();

  const setNotificationHandler = jest.fn();
  const getPermissionsAsync = jest.fn(async () => ({ status: existingStatus }));
  const requestPermissionsAsync = jest.fn(async () => ({ status: requestStatus }));
  const getExpoPushTokenAsync = jest.fn(async () => ({ data: pushToken }));
  const setNotificationChannelAsync = jest.fn(async () => undefined);
  const scheduleNotificationAsync = jest.fn(async () => undefined);

  const doc = jest.fn((_db, ...segments: string[]) => ({ path: segments.join("/") }));
  const setDoc = jest.fn(async () => undefined);

  jest.doMock("expo-constants", () => ({
    easConfig: easProjectId ? { projectId: easProjectId } : undefined,
    expoConfig: { extra: { eas: fallbackProjectId ? { projectId: fallbackProjectId } : {} } },
  }));

  jest.doMock("expo-device", () => ({
    isDevice,
  }));

  jest.doMock("expo-notifications", () => ({
    AndroidImportance: { MAX: "max" },
    setNotificationHandler,
    getPermissionsAsync,
    requestPermissionsAsync,
    getExpoPushTokenAsync,
    setNotificationChannelAsync,
    scheduleNotificationAsync,
  }));

  jest.doMock("react-native", () => ({
    Platform: { OS: platformOS },
  }));

  jest.doMock("../lib/firebase", () => ({
    FIRESTORE_DB: { id: "db" },
    doc,
    setDoc,
  }));

  let moduleUnderTest: typeof import("./pushNotifications");
  jest.isolateModules(() => {
    moduleUnderTest = require("./pushNotifications") as typeof import("./pushNotifications");
  });

  return {
    moduleUnderTest: moduleUnderTest!,
    mocks: {
      setNotificationHandler,
      getPermissionsAsync,
      requestPermissionsAsync,
      getExpoPushTokenAsync,
      setNotificationChannelAsync,
      scheduleNotificationAsync,
      doc,
      setDoc,
    },
  };
};

describe("push notifications service", () => {
  it("builds token doc ids", () => {
    const { moduleUnderTest } = loadPushNotificationsModule();
    expect(moduleUnderTest.getPushTokenDocId(moduleUnderTest.PUSH_APP_ID, "token")).toBe(
      "tmwtp-roadie__token",
    );
  });

  it("configures notification handler and shows alerts", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule();
    moduleUnderTest.setupNotificationHandler();

    expect(mocks.setNotificationHandler).toHaveBeenCalledTimes(1);
    const handlerArg = mocks.setNotificationHandler.mock.calls[0][0];
    const decision = await handlerArg.handleNotification();

    expect(decision).toEqual(
      expect.objectContaining({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    );
  });

  it("returns null on iOS simulator", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule({
      platformOS: "ios",
      isDevice: false,
    });

    const token = await moduleUnderTest.registerForPushNotificationsAsync("user-1");

    expect(token).toBeNull();
    expect(mocks.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("returns null when permission is denied", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule({
      platformOS: "ios",
      existingStatus: "denied",
      requestStatus: "denied",
    });

    const token = await moduleUnderTest.registerForPushNotificationsAsync("user-1");

    expect(token).toBeNull();
    expect(mocks.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("registers token without persistence when user id is missing", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule({ platformOS: "android" });

    const token = await moduleUnderTest.registerForPushNotificationsAsync(null);

    expect(token).toBe("ExponentPushToken[test]");
    expect(mocks.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it("skips android channel setup on iOS devices", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule({ platformOS: "ios" });

    const token = await moduleUnderTest.registerForPushNotificationsAsync(null);

    expect(token).toBe("ExponentPushToken[test]");
    expect(mocks.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it("returns null expo token on non-device hardware after permissions pass", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule({
      platformOS: "android",
      isDevice: false,
    });

    const token = await moduleUnderTest.registerForPushNotificationsAsync("user-2");

    expect(token).toBeNull();
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it("registers token without persistence when expo token is missing", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule({
      platformOS: "android",
      pushToken: "",
    });

    const token = await moduleUnderTest.registerForPushNotificationsAsync("user-2");

    expect(token).toBe("");
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it("persists token when user id exists", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule({ platformOS: "android" });

    const token = await moduleUnderTest.registerForPushNotificationsAsync("user-2", "custom-app");

    expect(token).toBe("ExponentPushToken[test]");
    expect(mocks.doc).toHaveBeenCalledWith(
      { id: "db" },
      "users",
      "user-2",
      "pushTokens",
      "custom-app__ExponentPushToken[test]",
    );
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
  });

  it("fetches token without project id when expo project id is unavailable", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule({
      platformOS: "android",
      easProjectId: null,
      fallbackProjectId: null,
    });

    await moduleUnderTest.registerForPushNotificationsAsync("user-3");

    expect(mocks.getExpoPushTokenAsync).toHaveBeenCalledWith();
  });

  it("sends local award notifications", async () => {
    const { moduleUnderTest, mocks } = loadPushNotificationsModule();
    await moduleUnderTest.sendLocalAwardNotification("The Metro");

    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "Roadie Job Awarded",
          body: "You were awarded: The Metro",
        }),
      }),
    );
  });
});
