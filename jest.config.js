module.exports = {
  preset: "jest-expo",
  collectCoverage: true,
  collectCoverageFrom: [
    "App.tsx",
    "src/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleNameMapper: {
    "\\.(png|jpg|jpeg|gif|svg)$": "<rootDir>/__mocks__/fileMock.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(firebase|@firebase|@react-native|react-native|@react-navigation|react-native-paper|expo-modules-core|@expo/.*|expo(nent)?|@expo/vector-icons))",
  ],
};
