import { StyleSheet } from "react-native";

import { palette } from "../../theme/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
    backgroundColor: palette.black,
  },
  title: {
    fontSize: 27,
    fontWeight: "700",
    marginBottom: 16,
    color: palette.white,
  },
  input: {
    color: palette.white,
    backgroundColor: palette.gray900,
    borderColor: palette.gray700,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  socialAuthButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  socialAuthButtonLight: {
    backgroundColor: palette.gray900,
    borderWidth: 1,
    borderColor: palette.gray700,
  },
  socialAuthButtonDark: {
    backgroundColor: palette.white,
  },
  socialAuthContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  socialAuthLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  socialAuthLabelLight: {
    color: palette.white,
  },
  socialAuthLabelDark: {
    color: palette.black,
  },
  errorText: {
    color: palette.accentRed,
    marginBottom: 8,
  },
});
