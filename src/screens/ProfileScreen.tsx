import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "react-native-paper";

import {
  FIREBASE_STORAGE,
  FIRESTORE_DB,
  doc,
  getDownloadURL,
  ref,
  serverTimestamp,
  setDoc,
  uploadBytes,
} from "../lib/firebase";
import { useRoadieStore } from "../store/useRoadieStore";
import roadieLogo from "../../assets/images/logo.png";

const ProfileScreen = () => {
  const user = useRoadieStore((state) => state.user);
  const setUserProfile = useRoadieStore((state) => state.setUserProfile);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setPhone(user?.phone ?? "");
    setPhotoURL(user?.photoURL ?? null);
  }, [user]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Profile</Text>
        <Text style={styles.subText}>Log in from the top-right menu to manage your profile.</Text>
      </View>
    );
  }

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setMessage("Media permission is required to upload a profile image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const imageRef = ref(FIREBASE_STORAGE, `users/${user.uid}/profile.jpg`);

      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      setPhotoURL(downloadURL);
      setMessage("Profile photo updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to upload photo.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await setDoc(
        doc(FIRESTORE_DB, "users", user.uid),
        {
          displayName,
          phone,
          photoURL,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setUserProfile({ displayName, phone, photoURL });
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Roadie Profile</Text>

      <Image
        source={photoURL ? { uri: photoURL } : roadieLogo}
        style={styles.avatar}
      />

      <Button mode="outlined" onPress={handlePickImage} disabled={saving}>
        Upload Photo
      </Button>

      <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} placeholder="Display name" />
      <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Phone" keyboardType="phone-pad" />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Button mode="contained" onPress={handleSaveProfile} loading={saving}>
        Save Profile
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    padding: 18,
  },
  centered: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  heading: {
    color: "#101820",
    fontWeight: "700",
    fontSize: 24,
    marginBottom: 12,
  },
  subText: {
    color: "#475569",
    textAlign: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D0D5DD",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D0D5DD",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  message: {
    marginVertical: 8,
    color: "#475569",
  },
});

export default ProfileScreen;
