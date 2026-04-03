import { ScrollView, Text, View } from "react-native";

import { formatCurrency, summarizeAdminStats } from "../../lib/show";
import { useRoadieStore } from "../../store/useRoadieStore";
import styles from "./styles";

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

export default AdminScreen;
