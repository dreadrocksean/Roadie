import { StyleSheet } from "react-native";

import { palette } from "../../theme/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.black,
  },
  map: {
    flex: 1,
  },
  markerWrap: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  markerNoteIcon: {
    position: "absolute",
    top: 8,
  },
  markerBadge: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -9,
    marginTop: -14,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.accentRed,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.white,
  },
  markerBadgeText: {
    color: palette.white,
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
    backgroundColor: palette.overlayDark,
  },
  infoBanner: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray700,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  infoText: {
    color: palette.black,
    fontWeight: "600",
  },
  errorBanner: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: palette.gray900,
    borderWidth: 1,
    borderColor: palette.accentRed,
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    color: palette.accentRed,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: palette.overlayDark,
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: palette.gray900,
    borderRadius: 16,
    padding: 16,
    maxHeight: "75%",
    borderWidth: 1,
    borderColor: palette.gray200,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.white,
    marginBottom: 10,
  },
  modalLabel: {
    marginBottom: 8,
    color: palette.gray300,
    fontWeight: "600",
  },
  modalValue: {
    fontWeight: "500",
    color: palette.white,
  },
  modalMuted: {
    color: palette.gray300,
    fontWeight: "400",
  },
  shiftList: {
    marginTop: 8,
    gap: 10,
  },
  shiftCard: {
    borderWidth: 1,
    borderColor: palette.gray500,
    borderRadius: 12,
    padding: 10,
    backgroundColor: palette.gray850,
  },
  shiftHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  shiftTitle: {
    color: palette.white,
    fontWeight: "700",
    fontSize: 15,
  },
  shiftStatus: {
    fontWeight: "700",
    fontSize: 12,
  },
  shiftStatusOpen: {
    color: palette.accentBlue,
  },
  shiftStatusNeutral: {
    color: palette.gray300,
  },
  shiftStatusFull: {
    color: palette.accentRed,
  },
  shiftStatusAccepted: {
    color: palette.accentGreen,
  },
  shiftStatusAwarded: {
    color: palette.accentBlue,
  },
  shiftAcceptButton: {
    marginTop: 8,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  shiftAcceptButtonEnabled: {
    backgroundColor: palette.accentBlue,
  },
  shiftAcceptButtonDisabled: {
    backgroundColor: palette.gray700,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
    backgroundColor: palette.gray700,
    borderWidth: 1,
    borderColor: palette.gray500,
  },
  cancelText: {
    color: palette.white,
    fontWeight: "700",
  },
  acceptText: {
    color: palette.white,
    fontWeight: "700",
  },
});
