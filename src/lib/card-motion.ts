export const updateCardPointerPosition = (
  element: HTMLElement,
  event: { clientX: number; clientY: number }
) => {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  element.style.setProperty("--card-mouse-x", `${x}px`);
  element.style.setProperty("--card-mouse-y", `${y}px`);
};

export const resetCardPointerPosition = (element: HTMLElement) => {
  element.style.removeProperty("--card-mouse-x");
  element.style.removeProperty("--card-mouse-y");
};
