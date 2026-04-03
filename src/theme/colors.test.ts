import { palette } from "./colors";

describe("theme palette", () => {
  it("exports monochrome colors with limited accents", () => {
    expect(palette.black).toBe("#0B0B0B");
    expect(palette.white).toBe("#FFFFFF");
    expect(palette.gray50).toBe("#F6F6F6");
    expect(palette.gray100).toBe("#ECECEC");
    expect(palette.gray200).toBe("#D9D9D9");
    expect(palette.gray300).toBe("#BFBFBF");
    expect(palette.gray500).toBe("#737373");
    expect(palette.gray700).toBe("#3B3B3B");
    expect(palette.gray900).toBe("#171717");
    expect(palette.accentRed).toBe("#D62E2E");
    expect(palette.accentRedSoft).toBe("rgba(214,46,46,0.12)");
    expect(palette.overlayDark).toBe("rgba(0,0,0,0.35)");
    expect(palette.overlayLight).toBe("rgba(255,255,255,0.65)");
  });
});
