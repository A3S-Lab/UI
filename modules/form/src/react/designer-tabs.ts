import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

export function handlePanelTabKey<T extends string>(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  panels: readonly T[],
  current: T,
  onChange: (panel: T) => void,
) {
  const index = panels.indexOf(current);
  if (index < 0) return;
  let nextIndex: number | undefined;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = panels.length - 1;
  if (event.key === 'ArrowRight') nextIndex = (index + 1) % panels.length;
  if (event.key === 'ArrowLeft') nextIndex = (index - 1 + panels.length) % panels.length;
  if (nextIndex === undefined) return;
  event.preventDefault();
  onChange(panels[nextIndex]);
  const tabs =
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  tabs?.[nextIndex]?.focus();
}
