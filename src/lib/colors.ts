const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const HSL_REGEX = /hsl\(\s*([\d.+-]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i;
const RGB_REGEX = /rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i;

export type HSLColor = { h: number; s: number; l: number };
export type RGBColor = { r: number; g: number; b: number };

export const FALLBACK_SUBJECT_COLOR = "hsl(221, 83%, 53%)";

const FALLBACK_HSL: HSLColor = { h: 221, s: 83, l: 53 };

const normalizeHex = (hex: string): string | null => {
  if (!hex) return null;
  const value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    return value
      .split("")
      .map((char) => char + char)
      .join("")
      .toLowerCase();
  }
  if (value.length === 6 && /^[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }
  return null;
};

const hexToRgb = (hex: string): RGBColor | null => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
};

const hexToHsl = (hex: string): HSLColor | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100
  };
};

const parseHslString = (value: string): HSLColor | null => {
  const match = value.match(HSL_REGEX);
  if (!match) return null;
  const h = Number.parseFloat(match[1]);
  const s = Number.parseFloat(match[2]);
  const l = Number.parseFloat(match[3]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return {
    h: ((h % 360) + 360) % 360,
    s: clamp(s, 0, 100),
    l: clamp(l, 0, 100)
  };
};

const parseRgbString = (value: string): RGBColor | null => {
  const match = value.match(RGB_REGEX);
  if (!match) return null;
  const r = Number.parseFloat(match[1]);
  const g = Number.parseFloat(match[2]);
  const b = Number.parseFloat(match[3]);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return null;
  return { r, g, b };
};

const hslToRgb = ({ h, s, l }: HSLColor): RGBColor => {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
};

const toHslString = ({ h, s, l }: HSLColor): string => {
  const hue = Math.round(h * 10) / 10;
  const saturation = Math.round(s * 10) / 10;
  const lightness = Math.round(l * 10) / 10;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const parseToHsl = (color: string | null | undefined): HSLColor | null => {
  if (!color) return null;
  if (color.startsWith("#")) {
    return hexToHsl(color);
  }
  if (color.trim().toLowerCase().startsWith("rgb")) {
    const rgb = parseRgbString(color);
    if (!rgb) return null;
    const { r, g, b } = rgb;
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    let hue = 0;
    if (delta !== 0) {
      if (max === rNorm) {
        hue = ((gNorm - bNorm) / delta) % 6;
      } else if (max === gNorm) {
        hue = (bNorm - rNorm) / delta + 2;
      } else {
        hue = (rNorm - gNorm) / delta + 4;
      }
      hue *= 60;
      if (hue < 0) hue += 360;
    }

    const lightness = (max + min) / 2;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

    return {
      h: hue,
      s: saturation * 100,
      l: lightness * 100
    };
  }
  if (color.trim().toLowerCase().startsWith("hsl")) {
    return parseHslString(color);
  }
  return null;
};

export const sanitizeColorInput = (value: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("#")) {
    const normalized = normalizeHex(trimmed);
    if (!normalized) return null;
    return `#${normalized.toUpperCase()}`;
  }

  if (trimmed.toLowerCase().startsWith("rgb")) {
    const rgb = parseRgbString(trimmed);
    if (!rgb) return null;
    return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
  }

  if (trimmed.toLowerCase().startsWith("hsl")) {
    const hsl = parseHslString(trimmed);
    if (!hsl) return null;
    return toHslString(hsl);
  }

  return null;
};

export const colorStringToRgb = (value: string): RGBColor | null => {
  if (!value) return null;
  if (value.startsWith("#")) {
    return hexToRgb(value);
  }
  if (value.trim().toLowerCase().startsWith("rgb")) {
    return parseRgbString(value);
  }
  if (value.trim().toLowerCase().startsWith("hsl")) {
    const hsl = parseHslString(value);
    if (!hsl) return null;
    return hslToRgb(hsl);
  }
  return null;
};

const luminanceComponent = (component: number) => {
  const channel = component / 255;
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
};

const getRelativeLuminance = ({ r, g, b }: RGBColor) => {
  return 0.2126 * luminanceComponent(r) + 0.7152 * luminanceComponent(g) + 0.0722 * luminanceComponent(b);
};

export const getAccessibleTextColor = (background: string): string => {
  const rgb = colorStringToRgb(background);
  if (!rgb) {
    return "#0f172a";
  }
  const luminance = getRelativeLuminance(rgb);
  return luminance > 0.55 ? "#0f172a" : "#ffffff";
};

export const getTintedSurfaceColor = (color: string): string => {
  const softened = softenColorTone(color, { saturationScale: 0.7, lightnessOffset: 18 });
  return softened;
};

const createAlternatingOffsets = (length: number, step: number): number[] => {
  if (length <= 0) return [];
  const offsets: number[] = [0];
  let positive = step;
  let negative = -step;
  for (let index = 1; index < length; index += 1) {
    if (index % 2 === 1) {
      offsets.push(positive);
      positive += step;
    } else {
      offsets.push(negative);
      negative -= step;
    }
  }
  return offsets;
};

export const generateTopicColorPalette = (baseColor: string, count: number): string[] => {
  if (count <= 0) return [];
  const base = parseToHsl(baseColor) ?? FALLBACK_HSL;
  const sanitizedBase: HSLColor = {
    h: base.h,
    s: clamp(base.s, 60, 85),
    l: clamp(base.l, 45, 60)
  };

  const hueStep = count > 1 ? Math.min(32, 120 / (count - 1)) : 0;
  const hueOffsets = createAlternatingOffsets(count, hueStep);
  const saturationOffsets = createAlternatingOffsets(count, 5);
  const lightnessOffsets = createAlternatingOffsets(count, 4);

  return hueOffsets.map((offset, index) => {
    const hue = (sanitizedBase.h + offset + 360) % 360;
    const saturation = clamp(sanitizedBase.s + saturationOffsets[index], 60, 90);
    const lightness = clamp(sanitizedBase.l + lightnessOffsets[index], 40, 70);
    return toHslString({ h: hue, s: saturation, l: lightness });
  });
};

export const generateTopicColorMap = <T extends { id: string; title?: string }>(
  baseColor: string,
  topics: T[]
): Map<string, string> => {
  if (!topics || topics.length === 0) {
    return new Map();
  }
  const sorted = [...topics].sort((a, b) => {
    const titleA = ("title" in a && typeof a.title === "string") ? a.title : a.id;
    const titleB = ("title" in b && typeof b.title === "string") ? b.title : b.id;
    return titleA.localeCompare(titleB, undefined, { sensitivity: "base" });
  });
  const palette = generateTopicColorPalette(baseColor, sorted.length);
  const map = new Map<string, string>();
  sorted.forEach((topic, index) => {
    map.set(topic.id, palette[index]);
  });
  return map;
};

type SoftenOptions = {
  saturationScale?: number;
  lightnessOffset?: number;
};

export const softenColorTone = (color: string, options: SoftenOptions = {}): string => {
  const { saturationScale = 0.88, lightnessOffset = 4 } = options;
  const hsl = parseToHsl(color);
  if (!hsl) return color;
  const softened: HSLColor = {
    h: hsl.h,
    s: clamp(hsl.s * saturationScale, 35, 95),
    l: clamp(hsl.l + lightnessOffset, 30, 85)
  };
  return toHslString(softened);
};

