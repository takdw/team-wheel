export type Mode = "random" | "balanced";
export interface Person {
  id: string;
  name: string;
  active: boolean;
  count: number;
  lastPickedAt: string | null;
}
export interface Candidate {
  id: string;
  name: string;
  probability: number;
}
export interface Pick {
  sequence: number;
  id: string;
  personId: string;
  personName: string;
  mode: Mode;
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
}
export interface SpinResult {
  pick: Pick;
  candidates: Candidate[];
  state: Snapshot;
}

export function getCandidates(people: Person[], mode: Mode): Candidate[] {
  const active = people.filter((person) => person.active);
  if (!active.length) return [];
  const minimum = Math.min(...active.map((person) => person.count));
  const weights = active.map((person) =>
    mode === "random" ? 1 : 1 / (1 + person.count - minimum),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return active.map((person, index) => ({
    id: person.id,
    name: person.name,
    probability: weights[index] / total,
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
  "#b9cec2",
  "#eac08c",
  "#b7c9e4",
  "#d9bad2",
  "#e2d68f",
  "#a8d2cf",
  "#e8b8aa",
  "#c5c2de",
];
export function personColor(id: string): string {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return palette[(hash >>> 0) % palette.length];
}
export function candidateMidpoint(candidates: Candidate[], id: string): number {
  let offset = 0;
  for (const candidate of candidates) {
    if (candidate.id === id) return (offset + candidate.probability / 2) * 360;
    offset += candidate.probability;
  }
  throw new Error("The selected person is missing from this wheel.");
}
