import assert from "node:assert/strict";
import { test } from "node:test";
import { animateWheel } from "../lib/motion";

test("reduced motion displays the saved winner immediately without starting an animation", () => {
  const element = {
    style: { transform: "rotate(0deg)" },
    animate() {
      throw new Error("Reduced motion must not start an animation.");
    },
  };
  let announcements = 0;
  const cleanup = animateWheel(
    element as unknown as HTMLElement,
    0,
    1980,
    true,
    () => {
      announcements++;
    },
  );
  assert.equal(element.style.transform, "rotate(1980deg)");
  assert.equal(announcements, 1);
  cleanup();
  assert.equal(announcements, 1);
});
