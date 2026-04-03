import { palette } from "../../theme/colors";
import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: palette.black,
  },
  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: palette.white,
    marginBottom: 10,
    marginTop: 10,
  },
  jobRow: {
    backgroundColor: palette.gray900,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.gray700,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.white,
    marginBottom: 4,
  },
  jobSub: {
    color: palette.gray300,
    marginBottom: 3,
  },
  status: {
    color: palette.accentRed,
    fontWeight: "700",
    marginTop: 4,
  },
  empty: {
    color: palette.gray300,
    marginBottom: 8,
  },
});
