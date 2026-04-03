import * as ImagePicker from "expo-image-picker";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import { Button } from "react-native-paper";

import {
  collection,
  FIREBASE_STORAGE,
  FIRESTORE_DB,
  doc,
  getDownloadURL,
  ref,
  serverTimestamp,
  setDoc,
  uploadBytes,
} from "../../lib/firebase";
import { useRoadieStore } from "../../store/useRoadieStore";
import { palette } from "../../theme/colors";
import type { RootStackParamList } from "../../types";
import type { NavigationProp } from "@react-navigation/native";
import styles from "./styles";
import roadieLogo from "../../../assets/images/logo.png";

const ProfileScreen = () => {
  const user = useRoadieStore((state) => state.user);
  const setUserProfile = useRoadieStore((state) => state.setUserProfile);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [draftRoadieId, setDraftRoadieId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setPhone(user?.phone ?? "");
    setBio(user?.bio ?? "");
    setAddress(user?.address ?? "");
    setPhotoURL(user?.photoURL ?? null);
    if (!user) {
      setDraftRoadieId(null);
    } else if (user.roadieId?.trim()) {
      setDraftRoadieId(user.roadieId.trim());
    }
  }, [user]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Profile</Text>
        <Text style={styles.subText}>Log in from the top-right menu to manage your profile.</Text>
      </View>
    );
  }

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Tabs", params: { screen: "Map" } }],
      }),
    );
  };

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
      const imageRef = ref(FIREBASE_STORAGE, `roadies/${user.uid}/profileImage.jpg`);

      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      setPhotoURL(downloadURL);
      setUserProfile({ photoURL: downloadURL });
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
      const nextDisplayName = displayName.trim();
      const nextPhone = phone.trim();
      const nextBio = bio.trim();
      const nextAddress = address.trim();
      const existingRoadieId = user.roadieId?.trim();
      const roadieId = existingRoadieId || draftRoadieId || doc(collection(FIRESTORE_DB, "roadies")).id;
      if (!existingRoadieId && !draftRoadieId) {
        setDraftRoadieId(roadieId);
      }

      await setDoc(
        doc(FIRESTORE_DB, "roadies", roadieId),
        {
          userId: user.uid,
          email: user.email ?? "",
          displayName: nextDisplayName,
          phone: nextPhone,
          bio: nextBio,
          address: nextAddress,
          photoURL,
          updatedAt: serverTimestamp(),
          ...(existingRoadieId ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true },
      );

      await setDoc(
        doc(FIRESTORE_DB, "users", user.uid),
        {
          displayName: nextDisplayName,
          phone: nextPhone,
          bio: nextBio,
          address: nextAddress,
          photoURL,
          roadieId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setUserProfile({
        displayName: nextDisplayName,
        phone: nextPhone,
        bio: nextBio,
        address: nextAddress,
        photoURL,
        roadieId,
      });
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const profileActionLabel = (user.roadieId ?? draftRoadieId ?? "").trim()
    ? "Update Profile"
    : "Save Profile";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Roadie Profile</Text>
          <Button mode="text" onPress={handleClose} disabled={saving} testID="profile-close">
            Close
          </Button>
        </View>

        <Image
          source={photoURL ? { uri: photoURL } : roadieLogo}
          style={styles.avatar}
        />

        <Button mode="outlined" onPress={handlePickImage} disabled={saving}>
          Upload Photo
        </Button>

        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
          placeholder="Display name"
          placeholderTextColor={palette.gray300}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          placeholder="Phone"
          placeholderTextColor={palette.gray300}
          keyboardType="phone-pad"
        />
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={[styles.input, styles.bioInput]}
          placeholder="Bio"
          placeholderTextColor={palette.gray300}
          multiline
          textAlignVertical="top"
        />
        <TextInput
          value={address}
          onChangeText={setAddress}
          style={styles.input}
          placeholder="Address"
          placeholderTextColor={palette.gray300}
        />
      </View>

      <View style={styles.footer}>
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Button mode="contained" onPress={handleSaveProfile} loading={saving}>
          {profileActionLabel}
        </Button>
      </View>
    </View>
  );
};

export default ProfileScreen;
