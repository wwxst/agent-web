/**
 * Exact selection-to-query behavior of source app-primary cFt.
 *
 * cFt chooses a focused <input>/<textarea> selection before the page
 * Selection; empty selections leave the current find query unchanged, while
 * a non-empty selection containing CR/LF explicitly clears that query.
 * The DOM/activeElement discrimination stays in the mounted App host.
 */
export interface SourceThreadFindFocusedTextControl {
  readonly value: string;
  readonly selectionStart: number | null;
  readonly selectionEnd: number | null;
}

export function sourceThreadFindSelectedQuery(
  control: SourceThreadFindFocusedTextControl | null,
  documentSelection: string | null | undefined,
): string | undefined {
  let selected: string | null | undefined;
  if (control !== null) {
    if (control.selectionStart == null || control.selectionEnd == null) return undefined;
    selected = control.value.slice(control.selectionStart, control.selectionEnd);
  } else {
    selected = documentSelection;
  }
  const trimmed = selected?.trim();
  if (!trimmed) return undefined;
  return /[\r\n]/.test(trimmed) ? "" : trimmed;
}
