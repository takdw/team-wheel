import type {
  Candidate,
  HistoryPage,
  Mode,
  Person,
  Pick,
  PickMode,
  Snapshot,
  SpinResult,
  VolunteerResult,
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
import { legacyTeamId, teamApiBase } from "./team";

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
  mode: PickMode;
  candidates: string;
  landing_angle: number | null;
  effects: string | null;
  created_at: string;
  undone_at: string | null;
}
interface RosterRow {
  id: string;
  name: string;
  active: number;
  absent: number;
  shields: number;
  shield_armed: number;
  volunteer_cooldown: number;
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
export async function getSnapshot(
  db: D1Database,
  teamId = legacyTeamId,
): Promise<Snapshot> {
  // D1 batches are transactions, keeping the revision and counts consistent.
  const queries = [
    db
      .prepare(
        `SELECT wheel_state.revision, teams.public_id AS publicId FROM teams
        LEFT JOIN wheel_state ON wheel_state.id = teams.id WHERE teams.id = ?`,
      )
      .bind(teamId),
    db
      .prepare(
        `SELECT people.id, people.name, people.active, people.absent, people.shields, people.shield_armed,
      people.volunteer_cooldown, people.color, people.default_color, people.photo_version, people.deleted_at,
      COUNT(picks.sequence) AS count, MAX(picks.created_at) AS last_picked_at
      FROM people LEFT JOIN picks ON people.id = picks.person_id AND picks.team_id = people.team_id AND picks.undone_at IS NULL
      WHERE people.team_id = ? GROUP BY people.id ORDER BY people.created_at, people.id`,
      )
      .bind(teamId),
    db
      .prepare(
        `SELECT ${historyColumns} FROM picks WHERE team_id = ? ORDER BY sequence DESC LIMIT ?`,
      )
      .bind(teamId, pageSize + 1),
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
      assignDefaultColors(db, teamId),
      ...queries,
    ]);
    allPeople = roster.results as RosterRow[];
  }
  const wheel = revision.results[0] as
    | { revision: number | null; publicId: string | null }
    | undefined;
  const apiBase = teamApiBase(wheel?.publicId);
  const people: Person[] = allPeople
    .filter((person) => person.deleted_at === null)
    .map((person) => ({
      id: person.id,
      name: person.name,
      active: Boolean(person.active),
      absent: Boolean(person.absent),
      shields: person.shields,
      shieldArmed: Boolean(person.shield_armed),
      volunteerCooldown: Boolean(person.volunteer_cooldown),
      count: person.count,
      lastPickedAt: person.last_picked_at,
      color: person.color,
      defaultColor: person.default_color ?? personColor(person.id),
      photoUrl: person.photo_version
        ? `${apiBase}/people/${person.id}/photo?v=${person.photo_version}`
        : null,
    }));
  const topCount = Math.max(0, ...allPeople.map((person) => person.count));
  return {
    revision: wheel?.revision ?? 0,
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
  teamId = legacyTeamId,
): Promise<HistoryPage> {
  const result = await db
    .prepare(
      `SELECT ${historyColumns} FROM picks WHERE team_id = ? AND sequence < ? ORDER BY sequence DESC LIMIT ?`,
    )
    .bind(teamId, before, pageSize + 1)
    .all<PickRow>();
  return historyPage(result.results);
}
export async function addPerson(
  db: D1Database,
  name: string,
  teamId = legacyTeamId,
): Promise<void> {
  const [result] = await db.batch([
    db
      .prepare(
        `INSERT INTO people (id, name, active, created_at, team_id)
    SELECT ?, ?, 1, ?, ? WHERE (SELECT COUNT(*) FROM people WHERE team_id = ? AND deleted_at IS NULL) < 100 RETURNING id`,
      )
      .bind(
        crypto.randomUUID(),
        name,
        new Date().toISOString(),
        teamId,
        teamId,
      ),
    assignDefaultColors(db, teamId),
  ]);
  if (!result.results.length)
    throw new AppError("This team has reached its limit of 100 people.");
}
export async function updatePerson(
  db: D1Database,
  id: string,
  values: PersonUpdate,
  teamId = legacyTeamId,
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
  if (values.absent !== undefined) {
    assignments.push("absent = ?");
    bindings.push(Number(values.absent));
  }
  if (values.shieldArmed !== undefined) {
    assignments.push("shield_armed = ?");
    bindings.push(Number(values.shieldArmed));
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
      `UPDATE people SET ${assignments.join(", ")} WHERE id = ? AND team_id = ? AND deleted_at IS NULL
       ${values.shieldArmed ? "AND shields > 0" : ""} RETURNING id`,
    )
    .bind(...bindings, id, teamId);
  const result = values.color
    ? (await db.batch([update, assignDefaultColors(db, teamId)]))[0]
    : await update.all();
  if (!result.results.length)
    throw new AppError(
      values.shieldArmed
        ? "No shield is available for this teammate. Refresh the team list."
        : "That person could not be found. Refresh the team list.",
      values.shieldArmed ? 409 : 404,
    );
}
export async function deletePerson(
  db: D1Database,
  id: string,
  teamId = legacyTeamId,
): Promise<void> {
  // Retain the member record so past picks keep their identity and deletion can be undone.
  const result = await db
    .prepare(
      "UPDATE people SET deleted_at = ? WHERE id = ? AND team_id = ? AND deleted_at IS NULL RETURNING id",
    )
    .bind(new Date().toISOString(), id, teamId)
    .all();
  if (!result.results.length)
    throw new AppError(
      "That member is no longer in the team. Refresh the list.",
      404,
    );
}
export async function restorePerson(
  db: D1Database,
  id: string,
  teamId = legacyTeamId,
): Promise<void> {
  const person = await db
    .prepare("SELECT deleted_at FROM people WHERE id = ? AND team_id = ?")
    .bind(id, teamId)
    .first<{ deleted_at: string | null }>();
  if (!person) throw new AppError("That member could not be found.", 404);
  if (person.deleted_at === null) return;
  const [result] = await db.batch([
    db
      .prepare(
        `UPDATE people SET deleted_at = NULL,
      default_color = CASE WHEN EXISTS (
        SELECT 1 FROM people AS teammate
        WHERE teammate.team_id = people.team_id AND teammate.deleted_at IS NULL
          AND teammate.default_color = people.default_color
      ) THEN NULL ELSE default_color END
      WHERE id = ? AND team_id = ? AND deleted_at IS NOT NULL
      AND (SELECT COUNT(*) FROM people WHERE team_id = ? AND deleted_at IS NULL) < 100 RETURNING id`,
      )
      .bind(id, teamId, teamId),
    assignDefaultColors(db, teamId),
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
  teamId = legacyTeamId,
): Promise<string> {
  const row = await db
    .prepare(
      "SELECT photo FROM people WHERE id = ? AND photo_version = ? AND team_id = ? AND deleted_at IS NULL",
    )
    .bind(id, version, teamId)
    .first<{ photo: string }>();
  if (!row?.photo) throw new AppError("Photo not found.", 404);
  return row.photo;
}
interface PickEffect {
  personId: string;
  shieldDelta: -1 | 0 | 1;
  cooldownBefore: boolean;
  cooldownAfter: boolean;
}
interface PickChoice {
  person: { id: string; name: string };
  candidates: Candidate[];
  landingAngle: number | null;
  effects: PickEffect[];
}

async function recordPick(
  db: D1Database,
  teamId: number,
  id: string,
  mode: PickMode,
  choose: (state: Snapshot) => PickChoice,
) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const existing = await db
      .prepare("SELECT * FROM picks WHERE id = ? AND team_id = ?")
      .bind(id, teamId)
      .first<PickRow>();
    if (existing) {
      if (existing.mode !== mode)
        throw new AppError(
          "This spin request was already used for another mode.",
          409,
        );
      return { row: existing, state: await getSnapshot(db, teamId) };
    }
    const state = await getSnapshot(db, teamId);
    const { person, candidates, landingAngle, effects } = choose(state);
    // Recheck the revision before saving a turn and applying its effects.
    const result = await db
      .prepare(
        `INSERT INTO picks (id, person_id, person_name, mode, candidates, landing_angle, effects, created_at, team_id)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT revision FROM wheel_state WHERE id = ?) = ?
      ON CONFLICT(team_id, id) DO NOTHING RETURNING *`,
      )
      .bind(
        id,
        person.id,
        person.name,
        mode,
        JSON.stringify(candidates),
        landingAngle,
        effects.length ? JSON.stringify(effects) : null,
        new Date().toISOString(),
        teamId,
        teamId,
        state.revision,
      )
      .all<PickRow>();
    if (result.results.length)
      return { row: result.results[0], state: await getSnapshot(db, teamId) };
  }
  throw new AppError("The team is busy. Please try again in a moment.", 409);
}
export async function spin(
  db: D1Database,
  id: string,
  mode: Mode,
  excludedIds: readonly string[] = [],
  teamId = legacyTeamId,
): Promise<SpinResult> {
  const { row, state } = await recordPick(db, teamId, id, mode, (snapshot) => {
    const candidates = getCandidates(snapshot.people, mode, excludedIds);
    if (!candidates.length)
      throw new AppError("Add or resume a teammate before spinning.");
    const person = selectCandidate(candidates, secureFraction());
    const effects: PickEffect[] = [];
    if (mode === "wildcard") {
      for (const teammate of snapshot.people) {
        if (!teammate.active || excludedIds.includes(teammate.id)) continue;
        if (!teammate.shieldArmed && !teammate.volunteerCooldown) continue;
        effects.push({
          personId: teammate.id,
          shieldDelta: teammate.shieldArmed ? -1 : 0,
          cooldownBefore: teammate.volunteerCooldown,
          cooldownAfter: teammate.shieldArmed && teammate.volunteerCooldown,
        });
      }
    }
    return {
      person,
      candidates,
      landingAngle: candidateLandingAngle(
        candidates,
        person.id,
        secureFraction(),
      ),
      effects,
    };
  });
  const candidates = JSON.parse(row.candidates) as Candidate[];
  return {
    pick: toPick(row),
    candidates,
    landingAngle:
      row.landing_angle ?? candidateMidpoint(candidates, row.person_id),
    state,
  };
}
export async function volunteer(
  db: D1Database,
  id: string,
  personId: string,
  teamId = legacyTeamId,
): Promise<VolunteerResult> {
  const { row, state } = await recordPick(
    db,
    teamId,
    id,
    "volunteer",
    (snapshot) => {
      const person = snapshot.people.find(
        (teammate) => teammate.id === personId,
      );
      if (!person?.active) throw new AppError("Choose an active teammate.");
      return {
        person,
        candidates: [],
        landingAngle: null,
        effects: [
          {
            personId,
            shieldDelta: person.shields < 2 ? 1 : 0,
            cooldownBefore: person.volunteerCooldown,
            cooldownAfter: true,
          },
        ],
      };
    },
  );
  if (row.person_id !== personId)
    throw new AppError(
      "This volunteer request was already used for another teammate.",
      409,
    );
  const effects = JSON.parse(row.effects ?? "[]") as PickEffect[];
  return {
    pick: toPick(row),
    state,
    shieldEarned: effects.some(
      (effect) => effect.personId === personId && effect.shieldDelta === 1,
    ),
  };
}
export async function undoPick(
  db: D1Database,
  id: string,
  teamId = legacyTeamId,
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE picks SET undone_at = ? WHERE id = ? AND team_id = ? AND undone_at IS NULL
    AND sequence = (SELECT MAX(sequence) FROM picks WHERE team_id = ? AND undone_at IS NULL) RETURNING id`,
    )
    .bind(new Date().toISOString(), id, teamId, teamId)
    .all();
  if (!result.results.length)
    throw new AppError(
      "Only the latest valid pick can be undone. Refresh the history.",
      409,
    );
}
