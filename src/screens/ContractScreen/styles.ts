import { StyleSheet } from "react-native";

import { palette } from "../../theme/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.black,
    padding: 18,
  },
  content: {
    paddingBottom: 20,
    gap: 10,
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
  subText: {
    color: palette.gray300,
    textAlign: "center",
  },
  body: {
    color: palette.gray300,
    lineHeight: 20,
  },
  footer: {
    paddingTop: 10,
  },
  message: {
    marginBottom: 8,
    color: palette.gray300,
  },
});
