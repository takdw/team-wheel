import assert from "node:assert/strict";
import { test } from "node:test";
import { decodePhoto, personUpdateSchema } from "../lib/profile";
import { personColor, textColor } from "../lib/wheel";
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQ+UAAAAASUVORK5CYII=";

test("profile changes accept custom colors, supported photos, and explicit resets", () => {
  assert.equal(
    personUpdateSchema.parse({ color: "#123aBc", photo: png }).color,
    "#123aBc",
  );
  assert.deepEqual(personUpdateSchema.parse({ color: null, photo: null }), {
    color: null,
    photo: null,
  });
  assert.equal(decodePhoto(png)?.contentType, "image/png");
});
test("profile validation rejects unsupported images, URLs, invalid colors, and large uploads", () => {
  for (const value of [
    "https://example.com/photo.jpg",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "data:image/png;base64,aGVsbG8gd29ybGQ=",
    "data:image/webp;base64," + "A".repeat(66_000),
  ]) {
    assert.equal(personUpdateSchema.safeParse({ photo: value }).success, false);
  }
  assert.equal(personUpdateSchema.safeParse({ color: "red" }).success, false);
  assert.equal(
    personUpdateSchema.safeParse({ color: "#12345g" }).success,
    false,
  );
  assert.equal(
    personUpdateSchema.safeParse({ unrelated: true }).success,
    false,
  );
});
test("custom colors use readable label colors and clearing a choice restores the default", () => {
  assert.equal(personColor("teammate", "#abcdef"), "#abcdef");
  assert.equal(personColor("teammate", null), personColor("teammate"));
  assert.equal(textColor("#000000"), "#fffefa");
  assert.equal(textColor("#ffffff"), "#253d33");
  assert.equal(textColor("#777777"), "#000000");
});
