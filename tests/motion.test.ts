import assert from "node:assert/strict";
import { test } from "node:test";
import { animateWheel, spinRotation } from "../lib/motion";

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

test("the final wheel rotation aligns the saved landing with the three o'clock pointer", () => {
  for (const from of [0, 72, 359.9, 2381.25]) {
    for (const landing of [0.01, 90, 179.999, 279, 359.999]) {
      for (const turns of [5, 7]) {
        const end = spinRotation(from, landing, turns);
        assert.ok(end - from >= turns * 360);
        assert.ok(end - from < (turns + 1) * 360);
        const pointer = (((end + landing) % 360) + 360) % 360;
        assert.ok(Math.abs(pointer - 90) < 1e-8);
      }
    }
  }
});

test("a normal spin uses the chosen coasting duration and completes at its exact saved target", async () => {
  let options: KeyframeAnimationOptions | undefined;
  let announced = 0;
  const element = {
    style: { transform: "rotate(0deg)" },
    animate(_frames: Keyframe[], timing: KeyframeAnimationOptions) {
      options = timing;
      return { finished: Promise.resolve(), cancel() {} };
    },
  };
  animateWheel(
    element as unknown as HTMLElement,
    0,
    2137.25,
    false,
    () => {
      announced++;
    },
    6400,
  );
  await Promise.resolve();
  assert.equal(options?.duration, 6400);
  assert.equal(element.style.transform, "rotate(2137.25deg)");
  assert.equal(announced, 1);
});
