import assert from "node:assert/strict";
import { test } from "node:test";
import {
  candidateMidpoint,
  candidateLandingAngle,
  getCandidates,
  secureFraction,
  selectCandidate,
  type Person,
} from "../lib/wheel";
const people = (counts: number[]): Person[] =>
  counts.map((count, index) => ({
    id: String(index),
    name: `Person ${index}`,
    count,
    active: true,
    absent: false,
    shields: 0,
    shieldArmed: false,
    volunteerCooldown: false,
    lastPickedAt: null,
    defaultColor: "#247b70",
    color: null,
    photoUrl: null,
  }));

test("random mode gives equal odds regardless of historical picks", () => {
  assert.deepEqual(
    getCandidates(people([0, 3, 500]), "random").map(
      (person) => person.probability,
    ),
    [1 / 3, 1 / 3, 1 / 3],
  );
});
test("balanced odds follow the documented 40/40/20 rule and stay effective as counts grow", () => {
  for (const counts of [
    [3, 3, 4],
    [1003, 1003, 1004],
  ]) {
    assert.deepEqual(
      getCandidates(people(counts), "balanced").map(
        (person) => person.probability,
      ),
      [0.4, 0.4, 0.2],
    );
  }
});
test("paused people are excluded from the draw and its balancing baseline", () => {
  const roster = people([0, 8, 9]);
  roster[0].active = false;
  const candidates = getCandidates(roster, "balanced");
  assert.deepEqual(
    candidates.map((person) => person.id),
    ["1", "2"],
  );
  assert.deepEqual(
    candidates.map((person) => person.probability),
    [2 / 3, 1 / 3],
  );
});
test("Wild Card combines attendance and volunteer weights and honors armed shields", () => {
  const roster = people([0, 1, 2, 3, 4]);
  roster[1].absent = true;
  roster[2].volunteerCooldown = true;
  roster[3].absent = true;
  roster[3].volunteerCooldown = true;
  roster[4].shields = 1;
  roster[4].shieldArmed = true;

  const candidates = getCandidates(roster, "wildcard");
  assert.deepEqual(
    candidates.map((person) => person.id),
    ["0", "1", "2", "3"],
  );
  [1 / 4, 1 / 2, 1 / 12, 1 / 6].forEach((expected, index) => {
    assert.ok(Math.abs(candidates[index].probability - expected) < 1e-12);
  });
  assert.deepEqual(
    getCandidates(roster, "random").map((person) => person.probability),
    [0.2, 0.2, 0.2, 0.2, 0.2],
  );
});
test("selection boundaries agree with the displayed wheel segments", () => {
  const candidates = getCandidates(people([3, 3, 4]), "balanced");
  for (const [fraction, id] of [
    [0, "0"],
    [0.399, "0"],
    [0.4, "1"],
    [0.799, "1"],
    [0.8, "2"],
    [1 - Number.EPSILON, "2"],
  ] as const) {
    assert.equal(selectCandidate(candidates, fraction).id, id);
  }
  assert.equal(candidateMidpoint(candidates, "0"), 72);
  assert.equal(candidateMidpoint(candidates, "2"), 324);
  assert.throws(() => selectCandidate(candidates, 1));
  assert.throws(() => selectCandidate([], 0));
});
test("empty and single-person rosters have defined behavior", () => {
  assert.deepEqual(getCandidates([], "balanced"), []);
  assert.equal(
    selectCandidate(getCandidates(people([99]), "random"), 0.99).id,
    "0",
  );
});
test("cryptographic fractions are finite and inside the selection interval", () => {
  for (let index = 0; index < 100; index++) {
    const fraction = secureFraction();
    assert.ok(Number.isFinite(fraction) && fraction >= 0 && fraction < 1);
  }
});

test("landing positions range across the selected weighted slice, including near either edge", () => {
  const candidates = getCandidates(people([3, 3, 4]), "balanced");
  const nearStart = candidateLandingAngle(candidates, "2", 0);
  const center = candidateLandingAngle(candidates, "2", 0.5);
  const nearEnd = candidateLandingAngle(candidates, "2", 1 - Number.EPSILON);
  assert.ok(nearStart > 288 && nearStart < 289);
  assert.equal(center, 324);
  assert.ok(nearEnd > 359 && nearEnd < 360);
  for (const fraction of [0, 0.02, 0.25, 0.5, 0.8, 1 - Number.EPSILON]) {
    for (const candidate of candidates) {
      const landing = candidateLandingAngle(candidates, candidate.id, fraction);
      assert.equal(selectCandidate(candidates, landing / 360).id, candidate.id);
    }
  }
  assert.throws(() => candidateLandingAngle(candidates, "2", 1));
  assert.throws(() => candidateLandingAngle(candidates, "missing", 0.5));
});
