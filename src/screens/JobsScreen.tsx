import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatCurrency, getBandName, getRoadiePay, getUserRoadieStatus } from "../lib/show";
import { useRoadieStore } from "../store/useRoadieStore";
import type { HydratedShow } from "../types";

const JobRow = ({ show, status }: { show: HydratedShow; status: string }) => (
  <View style={styles.jobRow}>
    <Text style={styles.jobTitle}>{getBandName(show, show.artist?.name)}</Text>
    <Text style={styles.jobSub}>Venue: {show.venue?.name ?? show.venueName ?? "Unknown Venue"}</Text>
    <Text style={styles.jobSub}>Pay: {formatCurrency(getRoadiePay(show))}</Text>
    <Text style={styles.jobSub}>Needed: {show.requiredRoadies}</Text>
    <Text style={styles.status}>Status: {status}</Text>
  </View>
);

const JobsScreen = () => {
  const user = useRoadieStore((state) => state.user);
  const shows = useRoadieStore((state) => state.shows);
  const acceptedShowPaths = useRoadieStore((state) => state.acceptedShowPaths);
  const awardedShowPaths = useRoadieStore((state) => state.awardedShowPaths);

  const userId = user?.uid ?? null;

  const awardedShows = shows.filter((show) => awardedShowPaths.includes(show.path));

  const acceptedShows = shows.filter((show) => {
    if (awardedShowPaths.includes(show.path)) return false;
    if (acceptedShowPaths.includes(show.path)) return true;
    return getUserRoadieStatus(show, userId) === "accepted";
  });

  const openShows = shows.filter((show) => !acceptedShowPaths.includes(show.path));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Awarded Jobs</Text>
      {awardedShows.length > 0 ? (
        awardedShows.map((show) => <JobRow key={show.path} show={show} status="Awarded" />)
      ) : (
        <Text style={styles.empty}>No awarded jobs yet.</Text>
      )}

      <Text style={styles.heading}>Accepted Jobs</Text>
      {acceptedShows.length > 0 ? (
        acceptedShows.map((show) => <JobRow key={show.path} show={show} status="Accepted" />)
      ) : (
        <Text style={styles.empty}>No accepted jobs yet.</Text>
      )}

      <Text style={styles.heading}>Open Jobs Nearby</Text>
      {openShows.length > 0 ? (
        openShows.map((show) => <JobRow key={show.path} show={show} status="Open" />)
      ) : (
        <Text style={styles.empty}>No open jobs nearby right now.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F5F5F7",
  },
  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: "#101820",
    marginBottom: 10,
    marginTop: 10,
  },
  jobRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ECEEF3",
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#101820",
    marginBottom: 4,
  },
  jobSub: {
    color: "#475569",
    marginBottom: 3,
  },
  status: {
    color: "#D62E2E",
    fontWeight: "700",
    marginTop: 4,
  },
  empty: {
    color: "#6B7280",
    marginBottom: 8,
  },
});

export default JobsScreen;
