export type ThemePalette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  accentForeground: string;
  iconActive: string;
  iconInactive: string;
  tableHeaderBg: string;
  tableRowOdd: string;
  tableRowEven: string;
  chartFillTop: string;
  chartFillBottom: string;
  grid: string;
  axis: string;
  success: string;
  warn: string;
  error: string;
  inverseBackground: string;
  inverseBorder: string;
  inverseForeground: string;
};

export const darkTheme: ThemePalette = {
  background: "#0f1115",
  surface: "#181b20",
  surfaceMuted: "#1b1e24",
  border: "#262a30",
  textPrimary: "#ffffff",
  textSecondary: "#a0a0a0",
  textMuted: "#808080",
  accent: "#3dea95",
  accentMuted: "#2d9467",
  accentForeground: "#0f1115",
  iconActive: "#3dea95",
  iconInactive: "#666c72",
  tableHeaderBg: "#1b1e24",
  tableRowOdd: "#16181d",
  tableRowEven: "#14161a",
  chartFillTop: "rgba(61, 234, 149, 0.25)",
  chartFillBottom: "rgba(61, 234, 149, 0)",
  grid: "#262a30",
  axis: "#a0a0a0",
  success: "#3dea95",
  warn: "#f5a623",
  error: "#f87171",
  inverseBackground: "#1f232a",
  inverseBorder: "#30343a",
  inverseForeground: "#ffffff"
};

export const lightTheme: ThemePalette = {
  background: "#ffffff",
  surface: "#f8f9fa",
  surfaceMuted: "#f2f3f5",
  border: "#dcdcdc",
  textPrimary: "#1a1a1a",
  textSecondary: "#666666",
  textMuted: "#999999",
  accent: "#21ce99",
  accentMuted: "#16a879",
  accentForeground: "#ffffff",
  iconActive: "#21ce99",
  iconInactive: "#9aa0a6",
  tableHeaderBg: "#f2f3f5",
  tableRowOdd: "#fafafa",
  tableRowEven: "#f5f5f5",
  chartFillTop: "rgba(33, 206, 153, 0.2)",
  chartFillBottom: "rgba(33, 206, 153, 0)",
  grid: "#dcdcdc",
  axis: "#666666",
  success: "#21ce99",
  warn: "#f5a623",
  error: "#e5484d",
  inverseBackground: "#e9ecf0",
  inverseBorder: "#cbd2d9",
  inverseForeground: "#1a1a1a"
};

export const themePalettes = {
  dark: darkTheme,
  light: lightTheme
};

export type ThemeName = keyof typeof themePalettes;

export const getThemePalette = (theme: ThemeName) => themePalettes[theme];
