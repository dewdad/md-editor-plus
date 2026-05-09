# Frontmatter Indicator Redesign — Design Spec

**Date:** 2026-05-09
**Status:** Approved

---

## Overview

Replace the prominent `FRONTMATTER · N lines` pill that currently sits above the document body with a small numeric badge on the **Code** button in the Preview/Code view toggle. Frontmatter parsing and round-trip preservation are unchanged — only the surfacing UX changes.

---

## Background

The current pill solves three jobs:

1. **Inform** — tells the reader the file has YAML/TOML frontmatter (the editor hides the raw `---` block from WYSIWYG view because it renders as ugly horizontal-rule + paragraph noise).
2. **Reassure** — confirms the editor sees the frontmatter and will preserve it on save.
3. **Provide an edit affordance** — clicking the pill switches to Source view where the frontmatter can be edited.

The pill works, but it pushes the document's H1 down and visually competes with the title. For a personal user who never writes frontmatter, it shows up only in `demo.md` and feels like a feature explanation rather than a useful signal. For users who *do* work with frontmatter (Jekyll/Hugo/Astro/Obsidian/MkDocs), the same three jobs can be done from the toolbar without taking real estate inside the document.

---

## UX Behavior

### When the file contains YAML or TOML frontmatter

- The **Code** button in the Preview/Code segmented control shows a small numeric badge in its top-right corner. The badge text is the frontmatter line count (excluding the `---` / `+++` fences).
- The Code button's hover tooltip changes from `Source view — raw markdown` to `Source view — raw markdown · N lines of frontmatter` (singular: `1 line of frontmatter`).
- Clicking Code switches to Source view (existing behavior). Frontmatter is at the top of the source, so no scroll-to-fragment logic is needed.

### When the file has no frontmatter

- Badge is hidden.
- Tooltip is the original `Source view — raw markdown`.
- The Code button looks identical to today.

### When the user edits in Source view to add or remove frontmatter

- The badge refreshes whenever the WYSIWYG editor's `_frontmatter` state changes, which happens on initial load and on every `setMarkdown` call (i.e. when returning from Source view to Preview, and when an external edit syncs in via the `update` message).
- The badge does **not** live-refresh during Source-view editing. While the user is in Source view they see the raw YAML/TOML directly, so a precise badge count there is unnecessary; the count updates the moment they toggle back to Preview.

### What goes away

- The `.fm-indicator` pill prepended to the editor host is removed entirely.

---

## Implementation Outline

### `src/webview/editor.ts`

- Delete `_fmIndicator`, `_fmHostEl`, `_onSwitchToSource`, `setSourceViewSwitcher`, and `refreshFrontmatterIndicator`.
- Add a small public surface for the toolbar to read frontmatter state:
  - `getFrontmatterInfo(): { lines: number; kind: 'yaml' | 'toml' | 'none' }`
  - `setFrontmatterChangeListener(fn: (info) => void): void` — called whenever `_frontmatter` changes (after `createEditor` and after `setMarkdown`).
- Keep `splitFrontmatter` / `countFrontmatterLines` and the `_frontmatter` state machine. Saving the document still concatenates `_frontmatter + body`.

### `src/mdEditorPlusProvider.ts`

- In the topbar HTML, modify the Code segment button at line 214 to include a hidden badge child:
  ```html
  <button class="seg-btn" data-view="source" data-tip="Source view — raw markdown">
    ${iCode}<span class="seg-label">Code</span>
    <span class="fm-badge hidden" id="fm-badge" aria-hidden="true"></span>
  </button>
  ```

### `src/webview/index.ts`

- Subscribe to the editor's frontmatter change listener after `createEditor`.
- On change, update the badge: toggle `.hidden`, set its `textContent` to the line count, and swap the Code button's `data-tip` between the two strings.
- Remove the existing wiring that passed a "switch to source view" callback into the editor (it was only used by the pill).

### `src/webview/styles/editor.css`

- Delete the `.fm-indicator` block (and its hover/focus states) starting at line 290.
- Add `.fm-badge`:
  - Absolutely positioned, top-right of the Code button.
  - ~16px circle (or pill if number is 2+ digits), muted background, semi-bold 10–11px text.
  - `.hidden` utility hides it.

### `demo.md`

- Remove the YAML frontmatter block at the top of the file.
- Remove the Tip callout that says `The pill at the very top says **FRONTMATTER · 5 lines** — click it…` since the pill is gone.

---

## Discoverability Notes

The badge is smaller than the pill, which means a frontmatter-aware user who ignores the toolbar might not notice. Mitigations:

- The Code button is always visible and is the primary view toggle, so users will see it within seconds of opening any file.
- The tooltip on hover spells out what the badge means.
- Source view itself shows the frontmatter inline at the top of the document, so as soon as the user clicks Code, the metadata is right there.

This is a deliberate tradeoff: zero visual cost in WYSIWYG view in exchange for slightly lower at-a-glance discoverability than the pill provided.

---

## Out of Scope

- No change to frontmatter parsing or save round-tripping.
- No new in-WYSIWYG editor for frontmatter values. Source view remains the only edit path.
- No user-facing setting to hide or always-show the badge.
- No badge animation or transition design beyond simple show/hide.

---

## Acceptance Criteria

- Opening a `.md` file with YAML frontmatter shows the badge with the correct line count on the Code button.
- Opening a `.md` file with TOML frontmatter (`+++` fences) behaves the same.
- Opening a `.md` file without frontmatter shows no badge.
- Editing in Source view to add a frontmatter block makes the badge appear with the right count when switching back to Preview (live update during Source editing is explicitly out of scope).
- Editing in Source view to remove a frontmatter block hides the badge when switching back to Preview.
- The Code button's tooltip reflects the current state.
- The `.fm-indicator` pill no longer appears anywhere in the rendered DOM.
- `demo.md` opens cleanly without a frontmatter block at the top.
