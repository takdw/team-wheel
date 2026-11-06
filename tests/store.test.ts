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
} from "../lib/store";
import { getCandidates } from "../lib/wheel";

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
    assert.equal((await getSnapshot(db)).totalPicks, 1);
    await assert.rejects(spin(db, id, "balanced"), /another mode/);
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
    assert.equal(reset.photoUrl, null);
    const replay = await spin(db, result.pick.id, "random");
    assert.equal(replay.candidates[0].color, "#112233");
    assert.equal(replay.state.totalPicks, 1);
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
    assert.equal((await getSnapshot(db)).people.length, 100);
    await assert.rejects(restorePerson(db, person.id), /team is full/);
  } finally {
    close();
  }
});
