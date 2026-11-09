import type {
  Candidate,
  HistoryPage,
  Mode,
  Person,
  Pick,
  Snapshot,
  SpinResult,
} from "./wheel";
import {
  candidateLandingAngle,
  candidateMidpoint,
  getCandidates,
  personColor,
  secureFraction,
  selectCandidate,
} from "./wheel";
import type { PersonUpdate } from "./profile";
import { assignDefaultColors } from "./default-colors";

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
  landing_angle: number | null;
  created_at: string;
  undone_at: string | null;
}
interface RosterRow {
  id: string;
  name: string;
  active: number;
  count: number;
  last_picked_at: string | null;
  color: string | null;
  default_color: string | null;
  photo_version: string | null;
  deleted_at: string | null;
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
  const queries = [
    db.prepare("SELECT revision FROM wheel_state WHERE id = 1"),
    db.prepare(`SELECT people.id, people.name, people.active, people.color, people.default_color, people.photo_version, people.deleted_at,
      COUNT(picks.sequence) AS count, MAX(picks.created_at) AS last_picked_at
      FROM people LEFT JOIN picks ON people.id = picks.person_id AND picks.undone_at IS NULL
      GROUP BY people.id ORDER BY people.created_at, people.id`),
    db
      .prepare(
        `SELECT ${historyColumns} FROM picks ORDER BY sequence DESC LIMIT ?`,
      )
      .bind(pageSize + 1),
  ];
  let [revision, roster, history] = await db.batch(queries);
  let allPeople = roster.results as RosterRow[];
  if (
    allPeople.some(
      (person) => person.deleted_at === null && person.default_color === null,
    )
  ) {
    // Existing rosters get their saved defaults on the first load after the schema update.
    [, revision, roster, history] = await db.batch([
      assignDefaultColors(db),
      ...queries,
    ]);
    allPeople = roster.results as RosterRow[];
  }
  const people: Person[] = allPeople
    .filter((person) => person.deleted_at === null)
    .map((person) => ({
      id: person.id,
      name: person.name,
      active: Boolean(person.active),
      count: person.count,
      lastPickedAt: person.last_picked_at,
      color: person.color,
      defaultColor: person.default_color ?? personColor(person.id),
      photoUrl: person.photo_version
        ? `/api/people/${person.id}/photo?v=${person.photo_version}`
        : null,
    }));
  const topCount = Math.max(0, ...allPeople.map((person) => person.count));
  return {
    revision: Number(
      (revision.results[0] as { revision?: number } | undefined)?.revision ?? 0,
    ),
    people,
    history: historyPage(history.results as unknown as PickRow[]),
    totalPicks: allPeople.reduce((sum, person) => sum + person.count, 0),
    leaders: allPeople
      .filter((person) => person.count > 0 && person.count === topCount)
      .map(({ id, name, count }) => ({ id, name, count })),
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
  const [result] = await db.batch([
    db
      .prepare(
        `INSERT INTO people (id, name, active, created_at)
    SELECT ?, ?, 1, ? WHERE (SELECT COUNT(*) FROM people WHERE deleted_at IS NULL) < 100 RETURNING id`,
      )
      .bind(crypto.randomUUID(), name, new Date().toISOString()),
    assignDefaultColors(db),
  ]);
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
  const update = db
    .prepare(
      `UPDATE people SET ${assignments.join(", ")} WHERE id = ? AND deleted_at IS NULL RETURNING id`,
    )
    .bind(...bindings, id);
  const result = values.color
    ? (await db.batch([update, assignDefaultColors(db)]))[0]
    : await update.all();
  if (!result.results.length)
    throw new AppError(
      "That person could not be found. Refresh the team list.",
      404,
    );
}
export async function deletePerson(db: D1Database, id: string): Promise<void> {
  // Retain the member record so past picks keep their identity and deletion can be undone.
  const result = await db
    .prepare(
      "UPDATE people SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL RETURNING id",
    )
    .bind(new Date().toISOString(), id)
    .all();
  if (!result.results.length)
    throw new AppError(
      "That member is no longer in the team. Refresh the list.",
      404,
    );
}
export async function restorePerson(db: D1Database, id: string): Promise<void> {
  const person = await db
    .prepare("SELECT deleted_at FROM people WHERE id = ?")
    .bind(id)
    .first<{ deleted_at: string | null }>();
  if (!person) throw new AppError("That member could not be found.", 404);
  if (person.deleted_at === null) return;
  const [result] = await db.batch([
    db
      .prepare(
        `UPDATE people SET deleted_at = NULL,
      default_color = CASE WHEN EXISTS (
        SELECT 1 FROM people AS teammate
        WHERE teammate.deleted_at IS NULL AND teammate.default_color = people.default_color
      ) THEN NULL ELSE default_color END
      WHERE id = ? AND deleted_at IS NOT NULL
      AND (SELECT COUNT(*) FROM people WHERE deleted_at IS NULL) < 100 RETURNING id`,
      )
      .bind(id),
    assignDefaultColors(db),
  ]);
  if (!result.results.length)
    throw new AppError(
      "The team is full. Remove a member before restoring this one.",
      409,
    );
}
export async function getPersonPhoto(
  db: D1Database,
  id: string,
  version: string,
): Promise<string> {
  const row = await db
    .prepare(
      "SELECT photo FROM people WHERE id = ? AND photo_version = ? AND deleted_at IS NULL",
    )
    .bind(id, version)
    .first<{ photo: string }>();
  if (!row?.photo) throw new AppError("Photo not found.", 404);
  return row.photo;
}
export async function spin(
  db: D1Database,
  id: string,
  mode: Mode,
  excludedIds: readonly string[] = [],
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
      const candidates = JSON.parse(existing.candidates) as Candidate[];
      return {
        pick: toPick(existing),
        candidates,
        landingAngle:
          existing.landing_angle ??
          candidateMidpoint(candidates, existing.person_id),
        state: await getSnapshot(db),
      };
    }
    const state = await getSnapshot(db);
    const candidates = getCandidates(state.people, mode, excludedIds);
    if (!candidates.length)
      throw new AppError("Add or resume a teammate before spinning.");
    const winner = selectCandidate(candidates, secureFraction());
    const landingAngle = candidateLandingAngle(
      candidates,
      winner.id,
      secureFraction(),
    );
    // Competing edits, spins, or undo advance the revision through database triggers.
    // Only a draw from the current snapshot can commit; other draws retry with fresh counts.
    const result = await db
      .prepare(
        `INSERT INTO picks (id, person_id, person_name, mode, candidates, landing_angle, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ? WHERE (SELECT revision FROM wheel_state WHERE id = 1) = ?
      ON CONFLICT(id) DO NOTHING RETURNING *`,
      )
      .bind(
        id,
        winner.id,
        winner.name,
        mode,
        JSON.stringify(candidates),
        landingAngle,
        new Date().toISOString(),
        state.revision,
      )
      .all<PickRow>();
    if (result.results.length)
      return {
        pick: toPick(result.results[0]),
        candidates,
        landingAngle,
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
