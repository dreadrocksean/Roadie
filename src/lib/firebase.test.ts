type LoadOptions = {
  initAuthThrows?: boolean;
  userExists?: boolean;
  appsInitialized?: boolean;
  existingDisplayName?: string | null | undefined;
};

const loadFirebaseModule = (options: LoadOptions = {}) => {
  const {
    initAuthThrows = false,
    userExists = false,
    appsInitialized = false,
    existingDisplayName = "Old Name",
  } = options;

  jest.resetModules();

  const initializeApp = jest.fn(() => ({ name: "app" }));
  const getApps = jest.fn(() => (appsInitialized ? [{ name: "existing-app" }] : []));
  const getApp = jest.fn(() => ({ name: "existing-app" }));

  const signOut = jest.fn();
  const initializeAuth = jest.fn(() => ({ currentUser: null }));
  const getAuth = jest.fn(() => ({ currentUser: null }));

  if (initAuthThrows) {
    initializeAuth.mockImplementation(() => {
      throw new Error("already initialized");
    });
  }

  const doc = jest.fn((_db, ...segments: string[]) => ({ path: segments.join("/") }));
  const getDoc = jest.fn(async () => ({
    exists: () => userExists,
    data: () => ({ displayName: existingDisplayName }),
  }));
  const setDoc = jest.fn();
  const serverTimestamp = jest.fn(() => "server-ts");

  const getFirestore = jest.fn(() => ({ id: "db" }));
  const getStorage = jest.fn(() => ({ id: "storage" }));

  jest.doMock("@react-native-async-storage/async-storage", () => ({}));
  jest.doMock("firebase/app", () => ({ initializeApp, getApps, getApp }));
  jest.doMock("firebase/auth", () => ({
    getAuth,
    initializeAuth,
    signOut,
    getReactNativePersistence: jest.fn(() => "persist"),
  }));
  jest.doMock("firebase/firestore", () => ({
    getFirestore,
    collection: jest.fn(),
    collectionGroup: jest.fn(),
    doc,
    getDoc,
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    onSnapshot: jest.fn(),
    setDoc,
    updateDoc: jest.fn(),
    serverTimestamp,
    increment: jest.fn(),
  }));
  jest.doMock("firebase/storage", () => ({
    getStorage,
    ref: jest.fn(),
    uploadBytes: jest.fn(),
    getDownloadURL: jest.fn(),
  }));

  let moduleUnderTest: typeof import("./firebase");
  jest.isolateModules(() => {
    moduleUnderTest = require("./firebase") as typeof import("./firebase");
  });

  return {
    moduleUnderTest: moduleUnderTest!,
    mocks: {
      initializeApp,
      getApps,
      getApp,
      signOut,
      initializeAuth,
      getAuth,
      doc,
      getDoc,
      setDoc,
      serverTimestamp,
      getFirestore,
      getStorage,
    },
  };
};

describe("firebase lib", () => {
  it("initializes auth via initializeAuth by default", () => {
    const { moduleUnderTest, mocks } = loadFirebaseModule();

    expect(moduleUnderTest.FIREBASE_AUTH).toBeTruthy();
    expect(mocks.initializeAuth).toHaveBeenCalledTimes(1);
    expect(mocks.getAuth).not.toHaveBeenCalled();
  });

  it("reuses existing firebase app when already initialized", () => {
    const { moduleUnderTest, mocks } = loadFirebaseModule({ appsInitialized: true });

    expect(moduleUnderTest.FIREBASE_APP).toEqual({ name: "existing-app" });
    expect(mocks.getApp).toHaveBeenCalledTimes(1);
    expect(mocks.initializeApp).not.toHaveBeenCalled();
  });

  it("falls back to getAuth when initializeAuth throws", () => {
    const { mocks } = loadFirebaseModule({ initAuthThrows: true });

    expect(mocks.initializeAuth).toHaveBeenCalledTimes(1);
    expect(mocks.getAuth).toHaveBeenCalledTimes(1);
  });

  it("ensures user document for existing user", async () => {
    const { moduleUnderTest, mocks } = loadFirebaseModule({ userExists: true });

    await moduleUnderTest.ensureUserDocument({
      uid: "user-1",
      email: "a@b.com",
      displayName: "Roadie One",
    } as any);

    expect(mocks.getDoc).toHaveBeenCalledTimes(1);
    expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: "users/user-1" },
      expect.objectContaining({
        email: "a@b.com",
        displayName: "Roadie One",
      }),
      { merge: true },
    );
  });

  it("uses existing display name and blank email fallback for existing users", async () => {
    const { moduleUnderTest, mocks } = loadFirebaseModule({
      userExists: true,
      existingDisplayName: null,
    });

    await moduleUnderTest.ensureUserDocument({
      uid: "user-1",
      email: null,
      displayName: null,
    } as any);

    expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: "users/user-1" },
      expect.objectContaining({
        email: "",
        displayName: "",
      }),
      { merge: true },
    );
  });

  it("uses existing display name when auth profile has no display name", async () => {
    const { moduleUnderTest, mocks } = loadFirebaseModule({
      userExists: true,
      existingDisplayName: "Persisted Name",
    });

    await moduleUnderTest.ensureUserDocument({
      uid: "user-3",
      email: "persisted@example.com",
      displayName: null,
    } as any);

    expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: "users/user-3" },
      expect.objectContaining({
        email: "persisted@example.com",
        displayName: "Persisted Name",
      }),
      { merge: true },
    );
  });

  it("creates user document for a new user", async () => {
    const { moduleUnderTest, mocks } = loadFirebaseModule({ userExists: false });

    await moduleUnderTest.ensureUserDocument({
      uid: "user-2",
      email: null,
      displayName: null,
    } as any);

    expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: "users/user-2" },
      expect.objectContaining({
        email: "",
        displayName: "",
        roleId: 6,
        activated: true,
      }),
      { merge: true },
    );
  });

  it("logs out through firebase auth", async () => {
    const { moduleUnderTest, mocks } = loadFirebaseModule();

    await moduleUnderTest.logout();

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith(moduleUnderTest.FIREBASE_AUTH);
  });
});
