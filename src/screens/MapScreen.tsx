import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

import { MILES_TO_METERS, getMapDeltasForMiles } from "../lib/geo";
import {
  formatCurrency,
  getBandName,
  getBandPhone,
  getLoadInTime,
  getLoadOutTime,
  getRoadiePay,
  getVenueAddress,
} from "../lib/show";
import { useRoadieStore } from "../store/useRoadieStore";

const RADIUS_MILES = 30;

const MapScreen = () => {
  const location = useRoadieStore((state) => state.location);
  const shows = useRoadieStore((state) => state.shows);
  const isLoadingShows = useRoadieStore((state) => state.isLoadingShows);
  const selectedShow = useRoadieStore((state) => state.selectedShow);
  const error = useRoadieStore((state) => state.error);
  const setSelectedShow = useRoadieStore((state) => state.setSelectedShow);
  const initializeLocation = useRoadieStore((state) => state.initializeLocation);
  const refreshShows = useRoadieStore((state) => state.refreshShows);
  const acceptSelectedShow = useRoadieStore((state) => state.acceptSelectedShow);

  useEffect(() => {
    const bootstrap = async () => {
      await initializeLocation();
      await refreshShows();
    };

    void bootstrap();
  }, [initializeLocation, refreshShows]);

  const mapRegion = useMemo(() => {
    const deltas = getMapDeltasForMiles(location.lat, RADIUS_MILES);

    return {
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: deltas.latitudeDelta,
      longitudeDelta: deltas.longitudeDelta,
    };
  }, [location]);

  const selectedPay = selectedShow ? formatCurrency(getRoadiePay(selectedShow)) : "TBD";

  const handleAccept = async () => {
    const success = await acceptSelectedShow();
    if (success) {
      await refreshShows();
    }
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} testID="roadie-map" initialRegion={mapRegion} region={mapRegion}>
        <Circle
          center={{ latitude: location.lat, longitude: location.lng }}
          radius={RADIUS_MILES * MILES_TO_METERS}
          strokeColor="#D12B2B"
          fillColor="rgba(209,43,43,0.12)"
        />

        {shows.map((show) =>
          show.coordinates ? (
            <Marker
              key={show.path}
              coordinate={{
                latitude: show.coordinates.lat,
                longitude: show.coordinates.lng,
              }}
              onPress={() => setSelectedShow(show)}
              testID={`roadie-marker-${show.id}`}
            >
              <View style={styles.markerWrap}>
                <Text style={styles.markerNote}>♪</Text>
                <View style={styles.markerBadge}>
                  <Text style={styles.markerBadgeText}>{show.requiredRoadies}</Text>
                </View>
              </View>
            </Marker>
          ) : null,
        )}
      </MapView>

      {isLoadingShows ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator testID="roadie-map-loading" size="large" />
        </View>
      ) : null}

      {!isLoadingShows && shows.length === 0 ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>No roadie shows currently within 30 miles.</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Modal visible={Boolean(selectedShow)} transparent animationType="slide" onRequestClose={() => setSelectedShow(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedShow ? (
              <ScrollView>
                <Text style={styles.modalTitle}>
                  {getBandName(selectedShow, selectedShow.artist?.name)}
                </Text>
                <Text style={styles.modalLabel}>
                  Venue: <Text style={styles.modalValue}>{selectedShow.venue?.name ?? selectedShow.venueName ?? "Unknown Venue"}</Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Address: <Text style={styles.modalValue}>{getVenueAddress(selectedShow, selectedShow.venue)}</Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Load In: <Text style={styles.modalValue}>{getLoadInTime(selectedShow)}</Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Load Out: <Text style={styles.modalValue}>{getLoadOutTime(selectedShow)}</Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Band Phone: <Text style={styles.modalValue}>{getBandPhone(selectedShow, selectedShow.artist?.phone)}</Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Roadie Pay: <Text style={styles.modalValue}>{selectedPay}</Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Needed: <Text style={styles.modalValue}>{selectedShow.requiredRoadies}</Text>
                </Text>
              </ScrollView>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => setSelectedShow(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.actionButton, styles.acceptButton]} onPress={handleAccept}>
                <Text style={styles.acceptText}>Accept</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  map: {
    flex: 1,
  },
  markerWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101820",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  markerNote: {
    color: "#F4F7FF",
    fontSize: 18,
    fontWeight: "700",
  },
  markerBadge: {
    position: "absolute",
    right: -6,
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D62E2E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  markerBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  infoBanner: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    backgroundColor: "#101820",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  infoText: {
    color: "#F6F9FF",
    fontWeight: "600",
  },
  errorBanner: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "#FCE3E3",
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: "#B42323",
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    maxHeight: "75%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#101820",
    marginBottom: 10,
  },
  modalLabel: {
    marginBottom: 8,
    color: "#2A3440",
    fontWeight: "600",
  },
  modalValue: {
    fontWeight: "500",
    color: "#101820",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 11,
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  acceptButton: {
    backgroundColor: "#D62E2E",
  },
  cancelText: {
    color: "#1F2937",
    fontWeight: "700",
  },
  acceptText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default MapScreen;
