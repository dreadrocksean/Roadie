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

  if (existing.exists()) {
    await setDoc(
      userRef,
      {
        email: user.email ?? "",
        displayName: user.displayName ?? existing.data().displayName ?? "",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
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
