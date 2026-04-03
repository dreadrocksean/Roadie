import { StyleSheet } from "react-native";

import { palette } from "../../theme/colors";

export default StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: palette.black,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    color: palette.white,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    color: palette.white,
  },
  card: {
    backgroundColor: palette.gray900,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.gray700,
    marginBottom: 10,
  },
  cardLabel: {
    color: palette.gray300,
    marginBottom: 3,
  },
  cardValue: {
    color: palette.white,
    fontSize: 21,
    fontWeight: "700",
  },
  insightText: {
    color: palette.gray300,
    lineHeight: 21,
  },
});
