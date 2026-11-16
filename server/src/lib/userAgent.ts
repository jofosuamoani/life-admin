/**
 * Turns a User-Agent header into a short label like "Chrome on macOS" for the
 * signed-in devices list. Deliberately rough: it only needs to help people
 * recognise their own devices, not identify browsers precisely.
 */
const BROWSERS: [RegExp, string][] = [
  // Order matters: Edge, Opera and Samsung all also claim to be Chrome,
  // and every Chromium/iOS browser also claims to be Safari.
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Version\/[\d.]+.*Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/CrOS/, 'ChromeOS'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
];

/** Longest User-Agent kept in the database. Real ones are a few hundred characters. */
export const USER_AGENT_MAX_LENGTH = 512;

export function describeDevice(userAgent: string): string {
  const browser = BROWSERS.find(([re]) => re.test(userAgent))?.[1];
  const system = SYSTEMS.find(([re]) => re.test(userAgent))?.[1];
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? 'Unknown device';
}
