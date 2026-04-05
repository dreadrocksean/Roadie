import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef } from "react";
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
  getRoadieShiftAccepted,
  getRoadieShiftNotes,
  getRoadieShiftOpen,
  getRoadieShiftRequired,
  getRoadiePay,
  getUserRoadieShiftStatus,
  getVenueAddress,
} from "../../lib/show";
import { useRoadieStore } from "../../store/useRoadieStore";
import { palette } from "../../theme/colors";
import type { RoadieShiftType } from "../../types";
import styles from "./styles";

const RADIUS_MILES = 30;
const ROADIE_SHIFT_TYPES: RoadieShiftType[] = ["loadIn", "loadOut"];

const MapScreen = () => {
  const mapRef = useRef<MapView | null>(null);
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

  useEffect(() => {
    mapRef.current?.animateToRegion?.(mapRegion, 350);
  }, [mapRegion]);

  const selectedPay = selectedShow
    ? formatCurrency(getRoadiePay(selectedShow))
    : "TBD";

  const selectedShiftCards = useMemo(() => {
    if (!selectedShow) return [];

    return ROADIE_SHIFT_TYPES.map((shiftType) => {
      const open = getRoadieShiftOpen(selectedShow, shiftType);
      const required = getRoadieShiftRequired(selectedShow, shiftType);
      const accepted = getRoadieShiftAccepted(selectedShow, shiftType);
      const status = getUserRoadieShiftStatus(selectedShow, user?.uid ?? null, shiftType);

      return {
        shiftType,
        title: shiftType === "loadIn" ? "Load-In Shift" : "Load-Out Shift",
        time:
          shiftType === "loadIn"
            ? getLoadInTime(selectedShow)
            : getLoadOutTime(selectedShow),
        notes: getRoadieShiftNotes(selectedShow, shiftType),
        open,
        required,
        accepted,
        status,
      };
    });
  }, [selectedShow, user?.uid]);

  const handleAcceptShift = async (shiftType: RoadieShiftType) => {
    await acceptSelectedShow(shiftType);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
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
                  color={palette.black}
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
                <View style={styles.shiftList}>
                  {selectedShiftCards.map((shiftCard) => {
                    const isAwarded = shiftCard.status === "awarded";
                    const isAccepted = shiftCard.status === "accepted" || isAwarded;
                    const isClosed = shiftCard.required > 0 && shiftCard.open <= 0;
                    const disabled = shiftCard.required <= 0 || isClosed || isAccepted;
                    const roadieStatusLabel = isAwarded
                      ? "Awarded"
                      : isAccepted
                        ? "Accepted"
                        : isClosed
                          ? "Closed"
                        : "Not Accepted";

                    return (
                      <View key={shiftCard.shiftType} style={styles.shiftCard}>
                        <View style={styles.shiftHeader}>
                          <Text style={styles.shiftTitle}>{shiftCard.title}</Text>
                          <Text
                            style={[
                              styles.shiftStatus,
                              isAwarded
                                ? styles.shiftStatusAwarded
                                : isAccepted
                                  ? styles.shiftStatusAccepted
                                  : isClosed
                                    ? styles.shiftStatusFull
                                : styles.shiftStatusNeutral,
                            ]}
                          >
                            {roadieStatusLabel}
                          </Text>
                        </View>
                        <Text style={styles.modalLabel}>
                          Time: <Text style={styles.modalValue}>{shiftCard.time}</Text>
                        </Text>
                        <Text style={styles.modalLabel}>
                          Needed: <Text style={styles.modalValue}>{shiftCard.open}</Text>
                          <Text style={styles.modalMuted}> (of {shiftCard.required})</Text>
                        </Text>
                        <Text style={styles.modalLabel}>
                          Booked: <Text style={styles.modalValue}>{shiftCard.accepted}</Text>
                        </Text>
                        {shiftCard.notes ? (
                          <Text style={styles.modalLabel}>
                            Notes: <Text style={styles.modalValue}>{shiftCard.notes}</Text>
                          </Text>
                        ) : null}
                        <Pressable
                          style={[
                            styles.shiftAcceptButton,
                            disabled
                              ? styles.shiftAcceptButtonDisabled
                              : styles.shiftAcceptButtonEnabled,
                          ]}
                          onPress={() => {
                            void handleAcceptShift(shiftCard.shiftType);
                          }}
                          disabled={disabled}
                        >
                          <Text style={styles.acceptText}>
                            {isAwarded
                              ? "Awarded"
                              : isAccepted
                                ? "Accepted"
                                : disabled
                                  ? isClosed
                                    ? "Closed"
                                    : "Unavailable"
                              : `Accept ${shiftCard.shiftType === "loadIn" ? "Load-In" : "Load-Out"}`}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setSelectedShow(null)}
              >
                <Text style={styles.cancelText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapScreen;
