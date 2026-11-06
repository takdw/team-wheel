export function spinRotation(
  from: number,
  landingAngle: number,
  turns = 5,
): number {
  // Wheel angles start at 12 o'clock and grow clockwise; the fixed pointer is at 90°.
  const target = (((90 - landingAngle) % 360) + 360) % 360;
  return from + turns * 360 + ((target - (from % 360) + 360) % 360);
}

export function animateWheel(
  element: HTMLElement,
  from: number,
  to: number,
  reducedMotion: boolean,
  onFinish: () => void,
  duration = 5600,
): () => void {
  if (reducedMotion) {
    element.style.transform = `rotate(${to}deg)`;
    onFinish();
    return () => {};
  }
  const animation = element.animate(
    [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }],
    { duration, easing: "cubic-bezier(.12,.72,.12,1)", fill: "forwards" },
  );
  animation.finished
    .then(() => {
      element.style.transform = `rotate(${to}deg)`;
      animation.cancel();
      onFinish();
    })
    .catch(() => {});
  return () => animation.cancel();
}
