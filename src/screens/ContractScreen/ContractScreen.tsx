import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";

import {
  FIRESTORE_DB,
  doc,
  serverTimestamp,
  setDoc,
} from "../../lib/firebase";
import { useRoadieStore } from "../../store/useRoadieStore";
import styles from "./styles";

const CONTRACT_VERSION = "v1";

const ContractScreen = () => {
  const user = useRoadieStore((state) => state.user);
  const setUserProfile = useRoadieStore((state) => state.setUserProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Roadie Agreement</Text>
        <Text style={styles.subText}>Log in to review and accept the agreement.</Text>
      </View>
    );
  }

  const handleAccept = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await setDoc(
        doc(FIRESTORE_DB, "users", user.uid),
        {
          roadieContractAcceptedAt: serverTimestamp(),
          roadieContractVersion: CONTRACT_VERSION,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setUserProfile({
        roadieContractAcceptedAt: Date.now(),
        roadieContractVersion: CONTRACT_VERSION,
      });
      setMessage("Agreement accepted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to accept agreement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Roadie Participation Agreement</Text>
        <Text style={styles.body}>
          By tapping I Accept, you agree to use the app for bookings and payments
          for jobs found through the platform.
        </Text>
        <Text style={styles.body}>
          Anti-circumvention applies to both artist and roadie: neither party may
          request or arrange off-platform payment or booking for introduced work.
        </Text>
        <Text style={styles.body}>
          Platform protections, dispute support, and payout protection apply only
          to work booked and managed in-app.
        </Text>
        <Text style={styles.body}>
          You agree to professional conduct, truthful profile details, and
          compliance with posted shift terms and cancellation rules.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Button
          mode="contained"
          onPress={handleAccept}
          loading={saving}
          disabled={saving}
          testID="contract-accept"
        >
          I Accept
        </Button>
      </View>
    </View>
  );
};

export default ContractScreen;
