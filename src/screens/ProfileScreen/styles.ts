import { StyleSheet } from "react-native";

import { palette } from "../../theme/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.black,
    padding: 18,
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    backgroundColor: palette.black,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  heading: {
    color: palette.white,
    fontWeight: "700",
    fontSize: 24,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  subText: {
    color: palette.gray300,
    textAlign: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.gray700,
  },
  input: {
    color: palette.white,
    backgroundColor: palette.gray900,
    borderColor: palette.gray700,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  bioInput: {
    minHeight: 100,
  },
  message: {
    marginBottom: 8,
    color: palette.gray300,
  },
  footer: {
    paddingTop: 10,
  },
});
