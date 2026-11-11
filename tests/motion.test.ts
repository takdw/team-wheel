import assert from "node:assert/strict";
import { test } from "node:test";
import {
  animateWheel,
  dividerContacts,
  dividerCrossings,
  spinRotation,
} from "../lib/motion";

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
    5600,
    {
      indicators: [element as unknown as SVGElement],
      pointer: {
        element: element as unknown as SVGElement,
        dividerAngles: [0, 180],
      },
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

test("the spin indicators follow the wheel's trajectory and stop with it", async () => {
  let wheelFrames: Keyframe[] = [];
  let options: KeyframeAnimationOptions | undefined;
  const indicators: { frames: Keyframe[]; timing: KeyframeAnimationOptions }[] =
    [];
  let indicatorsStopped = 0;
  let announced = 0;
  const element = {
    style: { transform: "rotate(90deg)" },
    animate(frames: Keyframe[], timing: KeyframeAnimationOptions) {
      wheelFrames = frames;
      options = timing;
      return { finished: Promise.resolve(), cancel() {} };
    },
  };
  const indicator = () => ({
    animate(frames: Keyframe[], timing: KeyframeAnimationOptions) {
      indicators.push({ frames, timing });
      return { cancel: () => indicatorsStopped++ };
    },
  });
  animateWheel(
    element as unknown as HTMLElement,
    90,
    2137.25,
    false,
    () => {
      announced++;
    },
    6400,
    { indicators: [indicator(), indicator()] as unknown as SVGElement[] },
  );
  assert.deepEqual(wheelFrames[0], { offset: 0, transform: "rotate(90deg)" });
  assert.deepEqual(wheelFrames.at(-1), {
    offset: 1,
    transform: "rotate(2137.25deg)",
  });
  assert.equal(indicators.length, 2);
  const angle = (keyframe: Keyframe) =>
    Number(String(keyframe.transform).slice(7, -4));
  for (const { frames, timing } of indicators) {
    assert.deepEqual(timing, options);
    assert.equal(frames.length, wheelFrames.length);
    for (const [index, frame] of frames.entries()) {
      const wheelFrame = wheelFrames[index];
      assert.equal(frame.offset, wheelFrame.offset);
      assert.ok(Math.abs(angle(wheelFrame) - angle(frame) - 90) < 1e-8);
    }
  }
  await Promise.resolve();
  assert.equal(options?.duration, 6400);
  assert.equal(element.style.transform, "rotate(2137.25deg)");
  assert.equal(indicatorsStopped, 2);
  assert.equal(announced, 1);
});

test("divider contacts speed up with the push, then spread out as the wheel coasts", () => {
  const dividers = Array.from({ length: 24 }, (_, index) => index * 15);
  const contacts = dividerContacts(0, 2173, dividers, 6000);
  const gaps = contacts
    .slice(1)
    .map((contact, index) => contact.timeMs - contacts[index].timeMs);
  assert.equal(contacts.length, 144);
  assert.ok(gaps[0] > gaps[1]);
  assert.ok(gaps.at(-1)! > gaps[80]);
  assert.ok(gaps[80] > gaps[40]);
  assert.ok(contacts.at(-1)!.timeMs < 6000);
  assert.ok(contacts.at(-1)!.strength < contacts[30].strength);
});

test("uneven dividers cross the pointer in order through multiple turns", () => {
  assert.deepEqual(
    dividerCrossings(45, 820, [0, 45, 180, 300]),
    [90, 150, 270, 405, 450, 510, 630, 765, 810],
  );
});
