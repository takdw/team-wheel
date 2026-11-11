export const spinModes = ["random", "balanced", "wildcard"] as const;
export type Mode = (typeof spinModes)[number];
export type PickMode = Mode | "volunteer";
export interface Person {
  id: string;
  name: string;
  active: boolean;
  absent: boolean;
  shields: number;
  shieldArmed: boolean;
  volunteerCooldown: boolean;
  count: number;
  lastPickedAt: string | null;
  color: string | null;
  defaultColor: string;
  photoUrl: string | null;
}
export interface Candidate {
  id: string;
  name: string;
  probability: number;
  // Older saved spins predate custom colors.
  color?: string;
}
export interface Pick {
  sequence: number;
  id: string;
  personId: string;
  personName: string;
  mode: PickMode;
  createdAt: string;
  undoneAt: string | null;
}
export interface HistoryPage {
  items: Pick[];
  nextCursor: number | null;
}
export interface Snapshot {
  revision: number;
  people: Person[];
  history: HistoryPage;
  totalPicks: number;
  leaders: { id: string; name: string; count: number }[];
}
export interface TurnResult {
  pick: Pick;
  state: Snapshot;
}
export interface SpinResult extends TurnResult {
  candidates: Candidate[];
  landingAngle: number;
}

export function getCandidates(
  people: Person[],
  mode: Mode,
  excludedIds: readonly string[] = [],
): Candidate[] {
  const active = people.filter(
    (person) =>
      person.active &&
      !excludedIds.includes(person.id) &&
      (mode !== "wildcard" || !person.shieldArmed),
  );
  if (!active.length) return [];
  const minimum = Math.min(...active.map((person) => person.count));
  const weights = active.map((person) => {
    if (mode === "balanced") return 1 / (1 + person.count - minimum);
    if (mode === "wildcard")
      return (person.absent ? 2 : 1) / (person.volunteerCooldown ? 3 : 1);
    return 1;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return active.map((person, index) => ({
    id: person.id,
    name: person.name,
    probability: weights[index] / total,
    color: person.color ?? person.defaultColor,
  }));
}

// A uniform 53-bit fraction uses Worker/browser cryptographic entropy, never Math.random().
export function secureFraction(): number {
  const words = crypto.getRandomValues(new Uint32Array(2));
  return ((words[0] & 0x1fffff) * 0x100000000 + words[1]) / 0x20000000000000;
}
export function selectCandidate(
  candidates: Candidate[],
  fraction: number,
): Candidate {
  if (
    !candidates.length ||
    !Number.isFinite(fraction) ||
    fraction < 0 ||
    fraction >= 1
  ) {
    throw new Error("Selection needs participants and a fraction in [0, 1).");
  }
  let cumulative = 0;
  for (const candidate of candidates) {
    cumulative += candidate.probability;
    if (fraction < cumulative) return candidate;
  }
  return candidates[candidates.length - 1];
}
export const palette = [
  "#247b70",
  "#f4c355",
  "#5666b8",
  "#df8398",
  "#679743",
  "#814c96",
  "#67bddc",
  "#c9683c",
];

// Keep the pale placeholder wheel and the fallback for old saved spins.
export const legacyPalette = [
  "#b9cec2",
  "#eac08c",
  "#b7c9e4",
  "#d9bad2",
  "#e2d68f",
  "#a8d2cf",
  "#e8b8aa",
  "#c5c2de",
];
export function personColor(id: string, color?: string | null): string {
  if (color) return color;
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return legacyPalette[(hash >>> 0) % legacyPalette.length];
}
export function textColor(background: string): string {
  function luminance(hex: string) {
    const channels = [1, 3, 5].map((offset) => {
      const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const value = luminance(background);
  function contrast(color: string) {
    const other = luminance(color);
    return (Math.max(value, other) + 0.05) / (Math.min(value, other) + 0.05);
  }
  if (contrast("#253d33") >= 4.5) return "#253d33";
  if (contrast("#fffefa") >= 4.5) return "#fffefa";
  return value > 0.179 ? "#000000" : "#ffffff";
}
export function candidateMidpoint(candidates: Candidate[], id: string): number {
  return candidateLandingAngle(candidates, id, 0.5);
}

export function candidateLandingAngle(
  candidates: Candidate[],
  id: string,
  fraction: number,
): number {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction >= 1) {
    throw new Error("Landing needs a fraction in [0, 1).");
  }
  let offset = 0;
  for (const candidate of candidates) {
    if (candidate.id === id) {
      // Avoid the exact divider while still allowing landings very close to either edge.
      const position = 0.0001 + fraction * 0.9998;
      return (offset + candidate.probability * position) * 360;
    }
    offset += candidate.probability;
  }
  throw new Error("The selected person is missing from this wheel.");
}
