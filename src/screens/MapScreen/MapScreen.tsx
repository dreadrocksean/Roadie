import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

import { MILES_TO_METERS, getMapDeltasForMiles } from "../../lib/geo";
import {
  formatCurrency,
  getBandName,
  getBandPhone,
  getLoadInTime,
  getLoadOutTime,
  getRoadiePay,
  getVenueAddress,
} from "../../lib/show";
import { useRoadieStore } from "../../store/useRoadieStore";
import { palette } from "../../theme/colors";
import styles from "./styles";

const RADIUS_MILES = 30;

const MapScreen = () => {
  const user = useRoadieStore((state) => state.user);
  const location = useRoadieStore((state) => state.location);
  const shows = useRoadieStore((state) => state.shows);
  const isLoadingShows = useRoadieStore((state) => state.isLoadingShows);
  const selectedShow = useRoadieStore((state) => state.selectedShow);
  const error = useRoadieStore((state) => state.error);
  const setSelectedShow = useRoadieStore((state) => state.setSelectedShow);
  const initializeLocation = useRoadieStore(
    (state) => state.initializeLocation,
  );
  const startShowsListener = useRoadieStore(
    (state) => state.startShowsListener,
  );
  const stopShowsListener = useRoadieStore((state) => state.stopShowsListener);
  const acceptSelectedShow = useRoadieStore(
    (state) => state.acceptSelectedShow,
  );

  useEffect(() => {
    const bootstrap = async () => {
      await initializeLocation();
      await startShowsListener();
    };

    void bootstrap();

    return () => {
      stopShowsListener();
    };
  }, [user?.uid, initializeLocation, startShowsListener, stopShowsListener]);

  const mapRegion = useMemo(() => {
    const deltas = getMapDeltasForMiles(location.lat, RADIUS_MILES);

    return {
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: deltas.latitudeDelta,
      longitudeDelta: deltas.longitudeDelta,
    };
  }, [location]);

  const selectedPay = selectedShow
    ? formatCurrency(getRoadiePay(selectedShow))
    : "TBD";

  const handleAccept = async () => {
    await acceptSelectedShow();
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        testID="roadie-map"
        initialRegion={mapRegion}
        zoomEnabled
        scrollEnabled
        rotateEnabled
        pitchEnabled
      >
        <Circle
          center={{ latitude: location.lat, longitude: location.lng }}
          radius={RADIUS_MILES * MILES_TO_METERS}
          strokeColor={palette.white}
          fillColor={palette.accentRedSoft}
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
                <MaterialCommunityIcons
                  name="map-marker"
                  size={44}
                  color={palette.accentBlue}
                />
                {/* <MaterialCommunityIcons
                  name="music-note-eighth"
                  size={32}
                  color={palette.white}
                  style={styles.markerNoteIcon}
                /> */}
                <View style={styles.markerBadge}>
                  <Text style={styles.markerBadgeText}>
                    {show.requiredRoadies}
                  </Text>
                </View>
              </View>
            </Marker>
          ) : null,
        )}
      </MapView>

      {isLoadingShows ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator
            testID="roadie-map-loading"
            size="large"
            color={palette.white}
          />
        </View>
      ) : null}

      {!isLoadingShows && shows.length === 0 ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            No roadie shows currently within 30 miles.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Modal
        visible={Boolean(selectedShow)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedShow(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedShow ? (
              <ScrollView>
                <Text style={styles.modalTitle}>
                  {getBandName(selectedShow, selectedShow.artist?.name)}
                </Text>
                <Text style={styles.modalLabel}>
                  Venue:{" "}
                  <Text style={styles.modalValue}>
                    {selectedShow.venue?.name ??
                      selectedShow.venueName ??
                      "Unknown Venue"}
                  </Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Address:{" "}
                  <Text style={styles.modalValue}>
                    {getVenueAddress(selectedShow, selectedShow.venue)}
                  </Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Load In:{" "}
                  <Text style={styles.modalValue}>
                    {getLoadInTime(selectedShow)}
                  </Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Load Out:{" "}
                  <Text style={styles.modalValue}>
                    {getLoadOutTime(selectedShow)}
                  </Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Band Phone:{" "}
                  <Text style={styles.modalValue}>
                    {getBandPhone(selectedShow, selectedShow.artist?.phone)}
                  </Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Roadie Pay:{" "}
                  <Text style={styles.modalValue}>{selectedPay}</Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Needed:{" "}
                  <Text style={styles.modalValue}>
                    {selectedShow.requiredRoadies}
                  </Text>
                </Text>
              </ScrollView>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setSelectedShow(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAccept}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapScreen;
