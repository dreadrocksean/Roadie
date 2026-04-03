import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB7KeJNbcyroHBp564KN8liPXMN1e_sTP4",
  authDomain: "tellmewhattoplay-1.firebaseapp.com",
  projectId: "tellmewhattoplay-1",
  storageBucket: "tellmewhattoplay-1.appspot.com",
  messagingSenderId: "177859591611",
  appId: "1:177859591611:web:04d7a35bee4048d0",
};

export const FIREBASE_APP = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let FIREBASE_AUTH: Auth;

try {
  FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
    persistence: (FirebaseAuth as any).getReactNativePersistence(AsyncStorage),
  });
} catch {
  FIREBASE_AUTH = getAuth(FIREBASE_APP);
}

export { FIREBASE_AUTH };

export const FIRESTORE_DB: Firestore = getFirestore(FIREBASE_APP);

export const FIREBASE_STORAGE: FirebaseStorage = getStorage(FIREBASE_APP);

export const logout = async () => {
  await signOut(FIREBASE_AUTH);
};

export const ensureUserDocument = async (user: User) => {
  const userRef = doc(FIRESTORE_DB, "users", user.uid);
  const existing = await getDoc(userRef);
  const existingData = existing.exists() ? existing.data() : {};

  if (existing.exists()) {
    await setDoc(
      userRef,
      {
        email: user.email ?? "",
        displayName: user.displayName ?? existingData.displayName ?? "",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    const refreshed = await getDoc(userRef);
    const data = refreshed.exists() ? refreshed.data() : existingData;

    return {
      displayName:
        typeof data.displayName === "string" ? data.displayName : (user.displayName ?? null),
      phone: typeof data.phone === "string" ? data.phone : (user.phoneNumber ?? null),
      bio: typeof data.bio === "string" ? data.bio : null,
      address: typeof data.address === "string" ? data.address : null,
      photoURL: typeof data.photoURL === "string" ? data.photoURL : (user.photoURL ?? null),
      roadieId: typeof data.roadieId === "string" ? data.roadieId : null,
    };
  }

  await setDoc(
    userRef,
    {
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      roleId: 6,
      activated: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    displayName: user.displayName ?? null,
    phone: user.phoneNumber ?? null,
    bio: null,
    address: null,
    photoURL: user.photoURL ?? null,
    roadieId: null,
  };
};

export {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  ref,
  uploadBytes,
  getDownloadURL,
};
