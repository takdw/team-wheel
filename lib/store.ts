import type {
  Candidate,
  HistoryPage,
  Mode,
  Person,
  Pick,
  Snapshot,
  SpinResult,
} from "./wheel";
import { getCandidates, secureFraction, selectCandidate } from "./wheel";
import type { PersonUpdate } from "./profile";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
interface PickRow {
  sequence: number;
  id: string;
  person_id: string;
  person_name: string;
  mode: Mode;
  candidates: string;
  created_at: string;
  undone_at: string | null;
}
function toPick(row: PickRow): Pick {
  return {
    sequence: row.sequence,
    id: row.id,
    personId: row.person_id,
    personName: row.person_name,
    mode: row.mode,
    createdAt: row.created_at,
    undoneAt: row.undone_at,
  };
}
const historyColumns =
  "sequence, id, person_id, person_name, mode, created_at, undone_at";
const pageSize = 30;
function historyPage(rows: PickRow[]): HistoryPage {
  const items = rows.slice(0, pageSize).map(toPick);
  return {
    items,
    nextCursor:
      rows.length > pageSize ? items[items.length - 1].sequence : null,
  };
}
export async function getSnapshot(db: D1Database): Promise<Snapshot> {
  // D1 batches are transactions, keeping the revision and counts consistent.
  const [revision, roster, history] = await db.batch([
    db.prepare("SELECT revision FROM wheel_state WHERE id = 1"),
    db.prepare(`SELECT people.id, people.name, people.active, people.color, people.photo_version,
      COUNT(picks.sequence) AS count, MAX(picks.created_at) AS last_picked_at
      FROM people LEFT JOIN picks ON people.id = picks.person_id AND picks.undone_at IS NULL
      GROUP BY people.id ORDER BY people.created_at, people.id`),
    db
      .prepare(
        `SELECT ${historyColumns} FROM picks ORDER BY sequence DESC LIMIT ?`,
      )
      .bind(pageSize + 1),
  ]);
  const people: Person[] = (
    roster.results as unknown as Array<{
      id: string;
      name: string;
      active: number;
      count: number;
      last_picked_at: string | null;
      color: string | null;
      photo_version: string | null;
    }>
  ).map((person) => ({
    id: person.id,
    name: person.name,
    active: Boolean(person.active),
    count: person.count,
    lastPickedAt: person.last_picked_at,
    color: person.color,
    photoUrl: person.photo_version
      ? `/api/people/${person.id}/photo?v=${person.photo_version}`
      : null,
  }));
  return {
    revision: Number(
      (revision.results[0] as { revision?: number } | undefined)?.revision ?? 0,
    ),
    people,
    history: historyPage(history.results as unknown as PickRow[]),
    totalPicks: people.reduce((sum, person) => sum + person.count, 0),
  };
}
export async function getHistory(
  db: D1Database,
  before: number,
): Promise<HistoryPage> {
  const result = await db
    .prepare(
      `SELECT ${historyColumns} FROM picks WHERE sequence < ? ORDER BY sequence DESC LIMIT ?`,
    )
    .bind(before, pageSize + 1)
    .all<PickRow>();
  return historyPage(result.results);
}
export async function addPerson(db: D1Database, name: string): Promise<void> {
  const result = await db
    .prepare(
      `INSERT INTO people (id, name, active, created_at)
    SELECT ?, ?, 1, ? WHERE (SELECT COUNT(*) FROM people) < 100 RETURNING id`,
    )
    .bind(crypto.randomUUID(), name, new Date().toISOString())
    .all();
  if (!result.results.length)
    throw new AppError("This team has reached its limit of 100 people.");
}
export async function updatePerson(
  db: D1Database,
  id: string,
  values: PersonUpdate,
): Promise<void> {
  const assignments: string[] = [];
  const bindings: (string | number | null)[] = [];
  if (values.name !== undefined) {
    assignments.push("name = ?");
    bindings.push(values.name);
  }
  if (values.active !== undefined) {
    assignments.push("active = ?");
    bindings.push(Number(values.active));
  }
  if (values.color !== undefined) {
    assignments.push("color = ?");
    bindings.push(values.color);
  }
  if (values.photo !== undefined) {
    assignments.push("photo = ?", "photo_version = ?");
    bindings.push(
      values.photo,
      values.photo === null ? null : crypto.randomUUID(),
    );
  }
  if (!assignments.length) throw new AppError("Choose a change to save.");
  const result = await db
    .prepare(
      `UPDATE people SET ${assignments.join(", ")} WHERE id = ? RETURNING id`,
    )
    .bind(...bindings, id)
    .all();
  if (!result.results.length)
    throw new AppError(
      "That person could not be found. Refresh the team list.",
      404,
    );
}
export async function getPersonPhoto(
  db: D1Database,
  id: string,
  version: string,
): Promise<string> {
  const row = await db
    .prepare("SELECT photo FROM people WHERE id = ? AND photo_version = ?")
    .bind(id, version)
    .first<{ photo: string }>();
  if (!row?.photo) throw new AppError("Photo not found.", 404);
  return row.photo;
}
export async function spin(
  db: D1Database,
  id: string,
  mode: Mode,
): Promise<SpinResult> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const existing = await db
      .prepare("SELECT * FROM picks WHERE id = ?")
      .bind(id)
      .first<PickRow>();
    if (existing) {
      if (existing.mode !== mode)
        throw new AppError(
          "This spin request was already used for another mode.",
          409,
        );
      return {
        pick: toPick(existing),
        candidates: JSON.parse(existing.candidates) as Candidate[],
        state: await getSnapshot(db),
      };
    }
    const state = await getSnapshot(db);
    const candidates = getCandidates(state.people, mode);
    if (!candidates.length)
      throw new AppError("Add or resume a teammate before spinning.");
    const winner = selectCandidate(candidates, secureFraction());
    // Competing edits, spins, or undo advance the revision through database triggers.
    // Only a draw from the current snapshot can commit; other draws retry with fresh counts.
    const result = await db
      .prepare(
        `INSERT INTO picks (id, person_id, person_name, mode, candidates, created_at)
      SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT revision FROM wheel_state WHERE id = 1) = ?
      ON CONFLICT(id) DO NOTHING RETURNING *`,
      )
      .bind(
        id,
        winner.id,
        winner.name,
        mode,
        JSON.stringify(candidates),
        new Date().toISOString(),
        state.revision,
      )
      .all<PickRow>();
    if (result.results.length)
      return {
        pick: toPick(result.results[0]),
        candidates,
        state: await getSnapshot(db),
      };
  }
  throw new AppError(
    "The team is busy spinning. Please try again in a moment.",
    409,
  );
}
export async function undoPick(db: D1Database, id: string): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE picks SET undone_at = ? WHERE id = ? AND undone_at IS NULL
    AND sequence = (SELECT MAX(sequence) FROM picks WHERE undone_at IS NULL) RETURNING id`,
    )
    .bind(new Date().toISOString(), id)
    .all();
  if (!result.results.length)
    throw new AppError(
      "Only the latest valid pick can be undone. Refresh the history.",
      409,
    );
}
