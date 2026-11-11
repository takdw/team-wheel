import assert from "node:assert/strict";
import { test } from "node:test";
import { checkAccess } from "../lib/access";
function authenticated(password: string) {
  return new Request("https://wheel.example/", {
    headers: {
      Authorization: `Basic ${Buffer.from(`team:${password}`).toString("base64")}`,
    },
  });
}
test("the legacy password gate fails closed without a configured password", async () => {
  assert.equal(
    (await checkAccess(new Request("https://wheel.example/"), {}))?.status,
    503,
  );
});
test("shared-password access rejects incorrect passwords and accepts UTF-8 passphrases", async () => {
  const env = { TEAM_PASSWORD: "a-long-shared-passphrase-é" };
  assert.equal(
    (await checkAccess(authenticated("incorrect"), env))?.status,
    401,
  );
  assert.equal(await checkAccess(authenticated(env.TEAM_PASSWORD), env), null);
});
test("Sites identity is accepted only when that hosting mode was explicitly configured", async () => {
  const request = new Request("https://wheel.example/", {
    headers: { "oai-authenticated-user-id": "member" },
  });
  assert.equal(await checkAccess(request, { ACCESS_MODE: "sites" }), null);
  assert.equal(
    (await checkAccess(request, { TEAM_PASSWORD: "private" }))?.status,
    401,
  );
});
