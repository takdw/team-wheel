const pointerAngle = 90;
const push = 0.04;
const drag = 3;
const peakSpeed = Math.expm1(drag);
const pushDistance = (push * peakSpeed) / 2;
const totalDistance = pushDistance + (1 - push) * (peakSpeed / drag - 1);

// Integrate a short push, followed by speed-dependent drag and constant friction.
// Normalize distance so the wheel comes to rest at the saved landing angle.
const spinProfile = Array.from({ length: 101 }, (_, index) => {
  const offset = index / 100;
  if (offset <= push) {
    return {
      offset,
      progress: (peakSpeed * offset ** 2) / (2 * push * totalDistance),
    };
  }
  const coast = (offset - push) / (1 - push);
  const coastDistance =
    (Math.exp(drag) * -Math.expm1(-drag * coast)) / drag - coast;
  return {
    offset,
    progress:
      index === 100
        ? 1
        : (pushDistance + (1 - push) * coastDistance) / totalDistance,
  };
});

export function spinRotation(
  from: number,
  landingAngle: number,
  turns = 5,
): number {
  // Wheel angles start at 12 o'clock and grow clockwise; the fixed pointer is at 90°.
  const target = (((pointerAngle - landingAngle) % 360) + 360) % 360;
  return from + turns * 360 + ((target - (from % 360) + 360) % 360);
}

export function dividerCrossings(
  from: number,
  to: number,
  dividerAngles: readonly number[],
): number[] {
  const crossings: number[] = [];
  for (const angle of dividerAngles) {
    const aligned = pointerAngle - angle;
    const first = aligned + (Math.floor((from - aligned) / 360) + 1) * 360;
    for (let crossing = first; crossing <= to; crossing += 360) {
      crossings.push(crossing);
    }
  }
  return crossings.sort((a, b) => a - b);
}

type SpinPointer = { element: Element; dividerAngles: readonly number[] };
export type DividerContact = { timeMs: number; strength: number };
type PlayClicks = (
  contacts: readonly DividerContact[],
  wheel: Animation,
) => (() => void) | undefined;

export function dividerContacts(
  from: number,
  to: number,
  dividerAngles: readonly number[],
  duration: number,
): DividerContact[] {
  const travel = to - from;
  let frame = 1;
  return dividerCrossings(from, to, dividerAngles).map((crossing) => {
    const progress = (crossing - from) / travel;
    while (spinProfile[frame].progress < progress) frame++;
    const start = spinProfile[frame - 1];
    const end = spinProfile[frame];
    const distance = end.progress - start.progress;
    const interval = (end.offset - start.offset) * duration;
    const speed = (distance * travel) / interval;
    return {
      timeMs:
        start.offset * duration +
        ((progress - start.progress) / distance) * interval,
      strength: Math.min(1, Math.sqrt(speed / 1.2)),
    };
  });
}

function animatePointer(
  element: Element,
  wheel: Animation,
  contacts: readonly DividerContact[],
): () => void {
  let next = 0;
  let bump: Animation | undefined;

  function tick() {
    const elapsed = Number(wheel.currentTime);
    const previous = next;
    while (next < contacts.length && contacts[next].timeMs <= elapsed) next++;
    // A fast wheel can pass several dividers between frames. Show the latest bump.
    if (next > previous) {
      bump?.cancel();
      const flex = 5 + 11 * contacts[next - 1].strength;
      bump = element.animate(
        [
          { transform: `rotate(${-flex}deg)` },
          { transform: `rotate(${flex * 0.18}deg)`, offset: 0.68 },
          { transform: "rotate(0deg)" },
        ],
        { duration: 135, easing: "ease-out" },
      );
    }
    if (next < contacts.length) frame = requestAnimationFrame(tick);
  }

  let frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    bump?.cancel();
  };
}

export function animateWheel(
  element: HTMLElement,
  from: number,
  to: number,
  reducedMotion: boolean,
  onFinish: () => void,
  duration = 5600,
  {
    indicators = [],
    pointer,
    playClicks,
  }: {
    indicators?: readonly Element[];
    pointer?: SpinPointer;
    playClicks?: PlayClicks;
  } = {},
): () => void {
  if (reducedMotion) {
    element.style.transform = `rotate(${to}deg)`;
    onFinish();
    return () => {};
  }
  const timing: KeyframeAnimationOptions = {
    duration,
    fill: "forwards",
  };
  function rotate(target: Element, start: number, end: number) {
    return target.animate(
      spinProfile.map(({ offset, progress }) => ({
        offset,
        transform: `rotate(${start + (end - start) * progress}deg)`,
      })),
      timing,
    );
  }
  const animation = rotate(element, from, to);
  const indicatorAnimations = indicators.map((icon) =>
    rotate(icon, 0, to - from),
  );
  const contacts = pointer
    ? dividerContacts(from, to, pointer.dividerAngles, duration)
    : [];
  const stopPointer =
    pointer && contacts.length
      ? animatePointer(pointer.element, animation, contacts)
      : undefined;
  let cancelled = false;
  let stopClicks: (() => void) | undefined;
  if (playClicks && contacts.length) {
    void animation.ready
      .then(() => {
        if (!cancelled) stopClicks = playClicks(contacts, animation);
      })
      .catch(() => {});
  }
  function cancel() {
    if (cancelled) return;
    cancelled = true;
    animation.cancel();
    for (const indicator of indicatorAnimations) indicator.cancel();
    stopPointer?.();
    stopClicks?.();
  }
  animation.finished
    .then(() => {
      element.style.transform = `rotate(${to}deg)`;
      cancel();
      onFinish();
    })
    .catch(() => {});
  return cancel;
}
