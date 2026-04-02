import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatCurrency, summarizeAdminStats } from "../lib/show";
import { useRoadieStore } from "../store/useRoadieStore";

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.card}>
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardValue}>{value}</Text>
  </View>
);

const AdminScreen = () => {
  const shows = useRoadieStore((state) => state.shows);
  const acceptedShowPaths = useRoadieStore((state) => state.acceptedShowPaths);
  const awardedShowPaths = useRoadieStore((state) => state.awardedShowPaths);

  const stats = summarizeAdminStats(shows, acceptedShowPaths, awardedShowPaths);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Accounting Stats</Text>

      <StatCard label="Roadie Shows in Radius" value={stats.totalRoadieShows} />
      <StatCard label="Open Roadie Spots" value={stats.openSpots} />
      <StatCard label="Accepted Jobs" value={stats.acceptedCount} />
      <StatCard label="Awarded Jobs" value={stats.awardedCount} />
      <StatCard label="Average Roadie Pay" value={formatCurrency(Math.round(stats.averagePay))} />
      <StatCard label="Projected Awarded Earnings" value={formatCurrency(stats.awardedPay)} />

      <Text style={styles.subtitle}>Insights</Text>
      <Text style={styles.insightText}>
        Use this tab to estimate your weekly workload and income. Accepted jobs show demand,
        and awarded jobs indicate confirmed revenue.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F5F5F7",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    color: "#101820",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    color: "#101820",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECEEF3",
    marginBottom: 10,
  },
  cardLabel: {
    color: "#64748B",
    marginBottom: 3,
  },
  cardValue: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "700",
  },
  insightText: {
    color: "#334155",
    lineHeight: 21,
  },
});

export default AdminScreen;
