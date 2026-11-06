export function animateWheel(
  element: HTMLElement,
  from: number,
  to: number,
  reducedMotion: boolean,
  onFinish: () => void,
): () => void {
  if (reducedMotion) {
    element.style.transform = `rotate(${to}deg)`;
    onFinish();
    return () => {};
  }
  const animation = element.animate(
    [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }],
    { duration: 4300, easing: "cubic-bezier(.12,.72,.12,1)", fill: "forwards" },
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
