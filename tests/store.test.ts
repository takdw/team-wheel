import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import {
  addPerson,
  deletePerson,
  restorePerson,
  getHistory,
  getPersonPhoto,
  getSnapshot,
  spin,
  undoPick,
  updatePerson,
  volunteer,
} from "../lib/store";
import {
  candidateMidpoint,
  getCandidates,
  selectCandidate,
} from "../lib/wheel";
import {
  createTeam,
  getJoinedTeams,
  getTeamAccess,
  joinTeam,
  limitTeamAccess,
  rotateTeamCode,
  teamSessionCookie,
} from "../lib/team-store";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    sqlite.exec(
      readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"),
    );
  }
  class Statement {
    values: SQLInputValue[] = [];
    constructor(public sql: string) {}
    bind(...values: SQLInputValue[]) {
      const bound = new Statement(this.sql);
      bound.values = values;
      return bound;
    }
    async all() {
      return {
        results: sqlite.prepare(this.sql).all(...this.values),
        success: true,
      };
    }
    async first() {
      return sqlite.prepare(this.sql).get(...this.values) ?? null;
    }
  }
  const db = {
    prepare(sql: string) {
      return new Statement(sql);
    },
    async batch(statements: Statement[]) {
      sqlite.exec("BEGIN");
      try {
        const result = statements.map((statement) => ({
          results: sqlite.prepare(statement.sql).all(...statement.values),
          success: true,
        }));
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  return { db, close: () => sqlite.close() };
}

test("invite codes grant access to one team and rotation closes the old invite", async () => {
  const { db, close } = database();
  try {
    const first = await createTeam(db, "Design");
    const second = await createTeam(db, "Engineering");
    const cookie = (teamId: number, token: string) =>
      teamSessionCookie(teamId, token, true).split(";")[0];
    const ownerCookie = cookie(first.teamId, first.token);
    const owner = await getTeamAccess(db, first.publicId, ownerCookie);
    assert.ok(owner?.joinCode);
    assert.equal(owner.name, "Design");
    assert.equal(await getTeamAccess(db, first.publicId, null), null);
    assert.deepEqual(
      (await getJoinedTeams(db, ownerCookie)).map((team) => team.publicId),
      [first.publicId],
    );
    assert.deepEqual(
      await getJoinedTeams(db, cookie(second.teamId, first.token)),
      [],
    );
    assert.equal(await getTeamAccess(db, second.publicId, ownerCookie), null);
    assert.equal(
      await getTeamAccess(
        db,
        second.publicId,
        cookie(second.teamId, first.token),
      ),
      null,
    );

    assert.deepEqual(await joinTeam(db, owner.joinCode, ownerCookie), {
      teamId: first.teamId,
      publicId: first.publicId,
    });
    const joined = await joinTeam(db, owner.joinCode, null);
    assert.ok(joined.token);
    const memberCookie = cookie(joined.teamId, joined.token);
    assert.deepEqual(
      { ...(await getTeamAccess(db, first.publicId, memberCookie)) },
      {
        teamId: first.teamId,
        publicId: first.publicId,
        name: "Design",
        joinCode: null,
      },
    );
    const newCode = await rotateTeamCode(db, first.teamId);
    assert.notEqual(newCode, owner.joinCode);
    await assert.rejects(
      joinTeam(db, owner.joinCode, null),
      /code isn’t valid/,
    );
    assert.equal((await joinTeam(db, newCode, null)).publicId, first.publicId);
    assert.ok(await getTeamAccess(db, first.publicId, memberCookie));
  } finally {
    close();
  }
});

test("teams have independent profiles, revisions, spin request IDs, history and undo", async () => {
  const { db, close } = database();
  try {
    const { teamId: first } = await createTeam(db, "Design");
    const { teamId: second } = await createTeam(db, "Engineering");
    await addPerson(db, "Alex", first);
    const alex = (await getSnapshot(db, first)).people[0];
    const firstRevision = (await getSnapshot(db, first)).revision;
    await addPerson(db, "Maya", second);
    const maya = (await getSnapshot(db, second)).people[0];
    assert.equal(alex.defaultColor, maya.defaultColor);
    assert.equal((await getSnapshot(db, first)).revision, firstRevision);
    assert.equal((await getSnapshot(db)).people.length, 0);
    await assert.rejects(
      updatePerson(db, alex.id, { name: "Changed" }, second),
      /could not be found/,
    );
    await assert.rejects(
      deletePerson(db, alex.id, second),
      /no longer in the team/,
    );
    const requestId = crypto.randomUUID();
    const firstPick = await spin(db, requestId, "random", [], first);
    const secondPick = await spin(db, requestId, "balanced", [], second);
    assert.equal(firstPick.pick.personId, alex.id);
    assert.equal(secondPick.pick.personId, maya.id);
    assert.deepEqual(
      (await getHistory(db, secondPick.pick.sequence, second)).items,
      [],
    );
    await undoPick(db, requestId, first);
    assert.equal((await getSnapshot(db, first)).totalPicks, 0);
    assert.equal((await getSnapshot(db, second)).totalPicks, 1);
  } finally {
    close();
  }
});

test("team code guessing is limited by client independently of team creation", async () => {
  const { db, close } = database();
  try {
    for (let attempt = 0; attempt < 60; attempt++)
      await limitTeamAccess(db, "join", "client");
    await assert.rejects(limitTeamAccess(db, "join", "client"), {
      status: 429,
    });
    await limitTeamAccess(db, "join", "other-client");
    await limitTeamAccess(db, "create", "client");
  } finally {
    close();
  }
});

test("saved picks drive counters; rename and pause preserve historical names", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "Tamrat");
    const person = (await getSnapshot(db)).people[0];
    const result = await spin(db, crypto.randomUUID(), "random");
    assert.equal(result.state.totalPicks, 1);
    assert.equal(result.state.people[0].count, 1);
    await updatePerson(db, person.id, { name: "Tam", active: false });
    const state = await getSnapshot(db);
    assert.equal(state.people[0].name, "Tam");
    assert.equal(state.people[0].active, false);
    assert.equal(state.history.items[0].personName, "Tamrat");
    await assert.rejects(
      spin(db, crypto.randomUUID(), "balanced"),
      /Add or resume/,
    );
  } finally {
    close();
  }
});
test("simultaneous spins retry against current counts and balanced odds", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "A");
    await addPerson(db, "B");
    const results = await Promise.all([
      spin(db, crypto.randomUUID(), "balanced"),
      spin(db, crypto.randomUUID(), "balanced"),
    ]);
    assert.equal((await getSnapshot(db)).totalPicks, 2);
    const ordered = results.sort((a, b) => a.pick.sequence - b.pick.sequence);
    assert.deepEqual(
      ordered[0].candidates.map((person) => person.probability),
      [0.5, 0.5],
    );
    const firstWinner = ordered[0].pick.personId;
    assert.equal(
      ordered[1].candidates.find((person) => person.id === firstWinner)
        ?.probability,
      1 / 3,
    );
    assert.equal(
      ordered[1].candidates.find((person) => person.id !== firstWinner)
        ?.probability,
      2 / 3,
    );
  } finally {
    close();
  }
});
test("replaying the same request, including simultaneously, records exactly one pick", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "A");
    await addPerson(db, "B");
    const id = crypto.randomUUID();
    const results = await Promise.all([
      spin(db, id, "random"),
      spin(db, id, "random"),
    ]);
    assert.equal(results[0].pick.personId, results[1].pick.personId);
    assert.equal(results[0].landingAngle, results[1].landingAngle);
    assert.equal((await getSnapshot(db)).totalPicks, 1);
    await assert.rejects(spin(db, id, "balanced"), /another mode/);
  } finally {
    close();
  }
});
test("spin exclusions affect one session without saving a roster pause", async () => {
  const { db, close } = database();
  try {
    for (const name of ["Sitting out", "Eligible", "Paused"]) {
      await addPerson(db, name);
    }
    const { people } = await getSnapshot(db);
    const sittingOut = people.find((person) => person.name === "Sitting out")!;
    const eligible = people.find((person) => person.name === "Eligible")!;
    const paused = people.find((person) => person.name === "Paused")!;
    await updatePerson(db, paused.id, { active: false });

    const id = crypto.randomUUID();
    const sessionPick = await spin(db, id, "balanced", [sittingOut.id]);
    assert.equal(sessionPick.pick.personId, eligible.id);
    assert.equal(sessionPick.candidates[0].probability, 1);
    assert.equal(
      sessionPick.state.people.find((person) => person.id === sittingOut.id)
        ?.active,
      true,
    );
    assert.deepEqual(
      (await spin(db, id, "balanced", [sittingOut.id])).candidates,
      sessionPick.candidates,
    );

    const freshPick = await spin(db, crypto.randomUUID(), "balanced");
    assert.deepEqual(
      new Set(freshPick.candidates.map((person) => person.id)),
      new Set([eligible.id, sittingOut.id]),
    );
    assert.equal(freshPick.state.totalPicks, 2);
  } finally {
    close();
  }
});
test("volunteer turns grant at most two shields and can be retried and undone", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "Volunteer");
    const person = (await getSnapshot(db)).people[0];
    await assert.rejects(
      updatePerson(db, person.id, { shieldArmed: true }),
      /No shield/,
    );
    const firstId = crypto.randomUUID();
    await Promise.all([
      volunteer(db, firstId, person.id),
      volunteer(db, firstId, person.id),
    ]);
    const first = (await getSnapshot(db)).people[0];
    assert.equal(first.shields, 1);
    assert.equal(first.count, 1);
    assert.equal(first.volunteerCooldown, true);
    const next = await Promise.all([
      volunteer(db, crypto.randomUUID(), person.id),
      volunteer(db, crypto.randomUUID(), person.id),
    ]);
    const latest = next.reduce((a, b) =>
      a.pick.sequence > b.pick.sequence ? a : b,
    );
    assert.equal(latest.pick.mode, "volunteer");
    assert.equal(latest.state.totalPicks, 3);
    assert.equal(latest.state.people[0].shields, 2);
    await undoPick(db, latest.pick.id);
    assert.equal((await getSnapshot(db)).people[0].shields, 2);
    const second = next.find((turn) => turn.pick.id !== latest.pick.id)!;
    await undoPick(db, second.pick.id);
    assert.equal((await getSnapshot(db)).people[0].shields, 1);
    await undoPick(db, firstId);
    const reset = (await getSnapshot(db)).people[0];
    assert.equal(reset.shields, 0);
    assert.equal(reset.volunteerCooldown, false);
    assert.equal(reset.count, 0);
  } finally {
    close();
  }
});
test("an armed shield preserves the volunteer weight until the next eligible Wild Card spin", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "Volunteer");
    await addPerson(db, "Absent");
    const { people } = await getSnapshot(db);
    const person = people.find((teammate) => teammate.name === "Volunteer")!;
    const absent = people.find((teammate) => teammate.name === "Absent")!;
    await updatePerson(db, absent.id, { absent: true });
    await volunteer(db, crypto.randomUUID(), person.id);
    await updatePerson(db, person.id, { shieldArmed: true });

    const random = await spin(db, crypto.randomUUID(), "random");
    assert.equal(random.candidates.length, 2);
    const sittingOut = await spin(db, crypto.randomUUID(), "wildcard", [
      person.id,
    ]);
    assert.equal(
      sittingOut.state.people.find((teammate) => teammate.id === person.id)
        ?.shieldArmed,
      true,
    );

    const shielded = await spin(db, crypto.randomUUID(), "wildcard");
    assert.deepEqual(
      shielded.candidates.map((candidate) => candidate.id),
      [absent.id],
    );
    const shieldUsed = shielded.state.people.find(
      (teammate) => teammate.id === person.id,
    )!;
    assert.equal(shieldUsed.shields, 0);
    assert.equal(shieldUsed.shieldArmed, false);
    assert.equal(shieldUsed.volunteerCooldown, true);
    const replay = await spin(db, shielded.pick.id, "wildcard");
    assert.equal(replay.state.totalPicks, shielded.state.totalPicks);

    const eligible = await spin(db, crypto.randomUUID(), "wildcard");
    const chance = eligible.candidates.find(
      (candidate) => candidate.id === person.id,
    )!.probability;
    assert.ok(Math.abs(chance - 1 / 7) < 1e-12);
    assert.equal(
      eligible.state.people.find((teammate) => teammate.id === person.id)
        ?.volunteerCooldown,
      false,
    );
    await undoPick(db, eligible.pick.id);
    await undoPick(db, shielded.pick.id);
    const undone = (await getSnapshot(db)).people.find(
      (teammate) => teammate.id === person.id,
    )!;
    assert.equal(undone.shields, 1);
    assert.equal(undone.shieldArmed, true);
    assert.equal(undone.volunteerCooldown, true);
  } finally {
    close();
  }
});
test("undo affects only the latest valid pick and retains the audit record", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "A");
    const first = await spin(db, crypto.randomUUID(), "random");
    const second = await spin(db, crypto.randomUUID(), "balanced");
    await assert.rejects(undoPick(db, first.pick.id), /latest valid/);
    await undoPick(db, second.pick.id);
    const state = await getSnapshot(db);
    assert.equal(state.totalPicks, 1);
    assert.equal(state.history.items.length, 2);
    assert.ok(state.history.items[0].undoneAt);
    assert.equal(state.people[0].lastPickedAt, first.pick.createdAt);
    const replay = await spin(db, second.pick.id, "balanced");
    assert.ok(replay.pick.undoneAt);
    assert.equal(replay.state.totalPicks, 1);
  } finally {
    close();
  }
});
test("counters include both modes, and old history remains available by cursor", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "A");
    await addPerson(db, "B");
    const roster = (await getSnapshot(db)).people;
    await updatePerson(db, roster[1].id, { active: false });
    for (let index = 0; index < 33; index++)
      await spin(db, crypto.randomUUID(), index % 2 ? "balanced" : "random");
    await updatePerson(db, roster[1].id, { active: true });
    const state = await getSnapshot(db);
    assert.equal(state.totalPicks, 33);
    assert.equal(state.history.items.length, 30);
    assert.ok(state.history.nextCursor);
    const page = await getHistory(db, state.history.nextCursor!);
    assert.equal(page.items.length, 3);
    assert.equal(page.nextCursor, null);
    const candidates = getCandidates(state.people, "balanced");
    assert.ok(
      candidates.find((person) => person.id === roster[1].id)!.probability >
        0.97,
    );
  } finally {
    close();
  }
});

test("profile changes persist, version photos, and preserve historical spin colors", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "Profile test");
    const person = (await getSnapshot(db)).people[0];
    assert.equal(person.color, null);
    assert.equal(person.photoUrl, null);
    const photo =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQ+UAAAAASUVORK5CYII=";
    await updatePerson(db, person.id, { color: "#112233", photo });
    const updated = (await getSnapshot(db)).people[0];
    assert.equal(updated.color, "#112233");
    assert.ok(updated.photoUrl);
    const version = new URL(
      updated.photoUrl!,
      "https://wheel.example",
    ).searchParams.get("v")!;
    assert.equal(await getPersonPhoto(db, person.id, version), photo);
    const result = await spin(db, crypto.randomUUID(), "random");
    assert.equal(result.candidates[0].color, "#112233");
    assert.equal(
      JSON.stringify(result.candidates).includes("data:image"),
      false,
    );
    await updatePerson(db, person.id, { name: "Renamed" });
    assert.equal((await getSnapshot(db)).people[0].photoUrl, updated.photoUrl);
    await updatePerson(db, person.id, { photo });
    const replacement = (await getSnapshot(db)).people[0];
    assert.notEqual(replacement.photoUrl, updated.photoUrl);
    await assert.rejects(
      getPersonPhoto(db, person.id, version),
      /Photo not found/,
    );
    await updatePerson(db, person.id, { color: null, photo: null });
    const reset = (await getSnapshot(db)).people[0];
    assert.equal(reset.color, null);
    assert.equal(reset.defaultColor, person.defaultColor);
    assert.equal(reset.photoUrl, null);
    const replay = await spin(db, result.pick.id, "random");
    assert.equal(replay.candidates[0].color, "#112233");
    assert.equal(replay.state.totalPicks, 1);
  } finally {
    close();
  }
});

test("existing teammates receive saved defaults and keep their manual choices", async () => {
  const { db, close } = database();
  try {
    const insert = db.prepare(
      "INSERT INTO people (id, name, active, created_at, color) VALUES (?, ?, ?, '2026-01-01', ?)",
    );
    await db.batch([
      insert.bind("legacy-1", "One", 1, null),
      insert.bind("legacy-2", "Two", 1, "#247B70"),
      insert.bind("legacy-3", "Three", 0, null),
    ]);

    const { people } = await getSnapshot(db);
    assert.equal(people[1].color, "#247B70");
    assert.equal(people[2].active, false);
    assert.equal(new Set(people.map((person) => person.defaultColor)).size, 3);
    assert.ok(people.every((person) => person.defaultColor !== "#247b70"));

    const saved = await db
      .prepare("SELECT default_color FROM people WHERE id = 'legacy-1'")
      .first<{ default_color: string }>();
    assert.equal(saved?.default_color, people[0].defaultColor);

    // A manual choice takes precedence if someone claims an existing default.
    await updatePerson(db, people[1].id, { color: people[0].defaultColor });
    const updated = (await getSnapshot(db)).people;
    assert.equal(updated[1].color, people[0].defaultColor);
    assert.notEqual(updated[0].defaultColor, updated[1].color);
    assert.equal(updated[2].defaultColor, people[2].defaultColor);
  } finally {
    close();
  }
});

test("deleting a member removes them from selection while preserving history, totals, and leaders", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "Former member");
    const person = (await getSnapshot(db)).people[0];
    const result = await spin(db, crypto.randomUUID(), "random");
    await deletePerson(db, person.id);
    const deleted = await getSnapshot(db);
    assert.equal(deleted.people.length, 0);
    assert.equal(deleted.totalPicks, 1);
    assert.equal(deleted.history.items[0].personName, "Former member");
    assert.deepEqual(deleted.leaders, [
      { id: person.id, name: "Former member", count: 1 },
    ]);
    await assert.rejects(
      updatePerson(db, person.id, { active: true }),
      /could not be found/,
    );
    await assert.rejects(
      spin(db, crypto.randomUUID(), "balanced"),
      /Add or resume/,
    );
    await addPerson(db, "Current member");
    const next = await spin(db, crypto.randomUUID(), "balanced");
    assert.equal(next.pick.personName, "Current member");
    assert.equal(next.state.totalPicks, 2);
    await undoPick(db, next.pick.id);
    await undoPick(db, result.pick.id);
    const undone = await getSnapshot(db);
    assert.equal(undone.totalPicks, 0);
    assert.deepEqual(undone.leaders, []);
    assert.ok(
      undone.history.items.find((pick) => pick.id === result.pick.id)?.undoneAt,
    );
  } finally {
    close();
  }
});

test("undoing member deletion restores their profile, paused state, and counters", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "Restorable member");
    const person = (await getSnapshot(db)).people[0];
    await spin(db, crypto.randomUUID(), "random");
    const photo =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQ+UAAAAASUVORK5CYII=";
    await updatePerson(db, person.id, {
      active: false,
      color: "#123456",
      photo,
    });
    const before = await getSnapshot(db);
    const photoVersion = new URL(
      before.people[0].photoUrl!,
      "https://wheel.example",
    ).searchParams.get("v")!;
    await deletePerson(db, person.id);
    await assert.rejects(
      getPersonPhoto(db, person.id, photoVersion),
      /Photo not found/,
    );
    await restorePerson(db, person.id);
    const restored = await getSnapshot(db);
    assert.deepEqual(restored.people, before.people);
    assert.equal(restored.totalPicks, before.totalPicks);
    assert.equal(await getPersonPhoto(db, person.id, photoVersion), photo);
    await restorePerson(db, person.id);
    assert.deepEqual((await getSnapshot(db)).people, before.people);
  } finally {
    close();
  }
});

test("deleted members free roster capacity and restoring still respects the limit", async () => {
  const { db, close } = database();
  try {
    for (let index = 0; index < 100; index++)
      await addPerson(db, `Member ${index}`);
    const person = (await getSnapshot(db)).people[0];
    await deletePerson(db, person.id);
    await addPerson(db, "Replacement");
    const full = (await getSnapshot(db)).people;
    assert.equal(full.length, 100);
    assert.equal(new Set(full.map((person) => person.defaultColor)).size, 100);
    await assert.rejects(restorePerson(db, person.id), /team is full/);
    await deletePerson(
      db,
      full.find((member) => member.name === "Member 99")!.id,
    );
    await restorePerson(db, person.id);
    const restored = (await getSnapshot(db)).people;
    assert.equal(
      new Set(restored.map((person) => person.defaultColor)).size,
      100,
    );
  } finally {
    close();
  }
});

test("the random landing is saved and replayed with the same winner without another pick", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "A");
    await addPerson(db, "B");
    await addPerson(db, "C");
    const id = crypto.randomUUID();
    const result = await spin(db, id, "balanced");
    assert.ok(result.landingAngle >= 0 && result.landingAngle < 360);
    assert.equal(
      selectCandidate(result.candidates, result.landingAngle / 360).id,
      result.pick.personId,
    );
    const replay = await spin(db, id, "balanced");
    assert.equal(replay.landingAngle, result.landingAngle);
    assert.equal(replay.pick.personId, result.pick.personId);
    assert.equal(replay.state.totalPicks, 1);
  } finally {
    close();
  }
});

test("old saved spins without an angle keep their original centered landing on replay", async () => {
  const { db, close } = database();
  try {
    await addPerson(db, "Legacy member");
    const result = await spin(db, crypto.randomUUID(), "random");
    await db
      .prepare(
        "UPDATE picks SET landing_angle = NULL WHERE id = ? RETURNING id",
      )
      .bind(result.pick.id)
      .all();
    const replay = await spin(db, result.pick.id, "random");
    assert.equal(
      replay.landingAngle,
      candidateMidpoint(replay.candidates, replay.pick.personId),
    );
    assert.equal(replay.state.totalPicks, 1);
  } finally {
    close();
  }
});
