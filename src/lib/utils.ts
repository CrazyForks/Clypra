/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Extracts the filename from a file path.
 */
export function fileBasename(path: string | null): string {
  if (!path) return "clip";
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || "clip";
}

/**
 * Checks if the event target is a form element that should not be affected by keyboard shortcuts.
 */
export function isFormElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.closest("input, textarea, select, button, a, [role='button'], [contenteditable='true']") != null;
}
