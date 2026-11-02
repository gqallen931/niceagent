/**
 * Nav row labels by page key. The dictionary is resolved at call time, never captured:
 * `S` is swapped wholesale when the language changes, and module-level constants would keep
 * reading the previous dictionary (state/locale.tsx remounts the tree on a switch).
 *
 * The cast is deliberate — `S.nav` also holds the section markers object (`groups`), so a
 * direct index by page key is not a string to the type checker.
 */
import { S } from "./strings";

export function navLabelOf(key: string): string {
  return (S.nav as unknown as Record<string, string>)[key] ?? key;
}
