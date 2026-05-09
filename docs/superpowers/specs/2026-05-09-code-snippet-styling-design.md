# Code Snippet Styling — Design Spec

**Date:** 2026-05-09
**Status:** Approved

---

## Overview

Upgrade fenced code blocks in the Notion-style preview from plain rounded boxes to full IDE-style blocks with a header bar (language label + copy button), a line-number gutter, and punchier syntax-highlight colors. Add a global "Always dark code" setting that forces dark code blocks regardless of page theme.

---

## Visual Style

```
┌──────────────────────────────────────────────────┐
│  typescript                            [📋 Copy] │  ← header bar
├─────┬────────────────────────────────────────────┤
│  1  │ // Render the document tree                │
│  2  │ interface Document {                       │  ← gutter + content
│  3  │   title: string;                           │
│  4  │   blocks: Block[];                         │
│  5  │ }                                          │
└─────┴────────────────────────────────────────────┘
```

- **Header bar** — language name on the left (lowercase, e.g. `typescript`), copy button on the right (icon + label, briefly shows "Copied!" on click)
- **Line-number gutter** — right-aligned, monospace, muted color, non-selectable
- **Bordered container** — 1px border, 8px radius, distinct from page background
- **Punchier light-mode tokens** — deeper/more saturated than the current CodeBlockLowlight defaults

---

## Theme Tokens

New CSS custom properties added to each theme variable set:

| Token | Light | Dark | Sepia | Claude |
|---|---|---|---|---|
| `--code-bg` | `#f6f6f6` | `#1a1a1a` | `#f0e5c4` | `#f1e8d3` |
| `--code-header-bg` | `#efefef` | `#232323` | `#e8dcb8` | `#e8dcc4` |
| `--code-gutter-bg` | `#efefef` | `#232323` | `#e8dcb8` | `#e8dcc4` |
| `--code-gutter-fg` | `#b0b0b0` | `#555555` | `#a89a78` | `#b8a888` |
| `--code-border` | `#e1e1e1` | `#2a2a2a` | `#d4c8a8` | `#d8c8a8` |
| `--code-copy-bg` | `#ffffff` | `#2a2a2a` | `#faf0d9` | `#faf6ee` |
| `--code-copy-fg` | `#555555` | `#cdd6f4` | `#5b4d36` | `#5d4a35` |

**Syntax tokens** (overrides on top of lowlight's existing classes):

| Class | Light | Dark |
|---|---|---|
| `.hljs-keyword` | `#8b3aa3` | `#cba6f7` |
| `.hljs-string` | `#0a7240` | `#a6e3a1` |
| `.hljs-number` | `#9a4500` | `#fab387` |
| `.hljs-comment` | `#6e6e6e` italic | `#6c7086` italic |
| `.hljs-function`, `.hljs-title.function_` | `#0058c4` | `#89b4fa` |
| `.hljs-type`, `.hljs-class`, `.hljs-built_in` | `#b8421a` | `#f9e2af` |
| `.hljs-punctuation`, `.hljs-operator` | `#444444` | `#b0b0b0` |

---

## Architecture

### New file: `src/webview/extensions/codeBlock.ts`

Extends Tiptap's `CodeBlockLowlight` with a NodeView that wraps the existing `<pre><code>` content. Renders:

```html
<div class="cb">
  <div class="cb-header">
    <span class="cb-lang">{language || 'text'}</span>
    <button class="cb-copy">{icon} Copy</button>
  </div>
  <div class="cb-body">
    <div class="cb-gutter" contenteditable="false">1\n2\n3\n…</div>
    <pre class="cb-content"><code class="hljs language-{lang}"><!-- contentDOM --></code></pre>
  </div>
</div>
```

**NodeView lifecycle:**
1. Build the wrapper DOM on init
2. Set `contentDOM = <code>` element so Tiptap renders editable content + lowlight tokens inside it
3. Implement `update(node)` to:
   - Update the language label if changed
   - Regenerate gutter line numbers by counting `\n` in `node.textContent` + 1
4. `ignoreMutation` returns `true` for non-`contentDOM` mutations (header/gutter changes don't break selection)
5. `selectNode`/`deselectNode` for proper editor focus when clicked

**Copy button:**
- Click → `navigator.clipboard.writeText(node.textContent)`
- On success: button label changes to "Copied!" for 1500ms, then back to "Copy"
- Stops propagation so click doesn't bubble into the editor

### Modified files

| File | Change |
|---|---|
| `src/webview/editor.ts` | Replace `CodeBlockLowlight.configure({ lowlight })` with `import CodeBlock from './extensions/codeBlock'` then `CodeBlock.configure({ lowlight })` |
| `src/webview/styles/editor.css` | Replace `.ProseMirror pre` styles with the new `.cb`/`.cb-header`/`.cb-body`/`.cb-gutter`/`.cb-content` styles + syntax token overrides |
| `src/webview/styles/notion-light.css` | Add the 7 new `--code-*` tokens (light values) |
| `src/webview/styles/notion-dark.css` | Add the 7 new `--code-*` tokens to `.theme-dark`, `.theme-sepia`, and `.theme-claude` blocks |
| `src/notionEditorProvider.ts` | Add a new toggle row in the settings panel under "Page width" section: icon + "Always dark code" + toggle. Plus a `</>` icon and the `code` icon already in our SVG library |
| `src/webview/index.ts` | Wire the new toggle: stores state in a `code-always-dark` class on `document.documentElement` |
| `package.json` | Add `notionMdViewer.alwaysDarkCode` config (boolean, default false) |

### Always-dark code mechanism

When the `code-always-dark` class is present on `<html>`, all `--code-*` variables and the syntax token rules are forced to the dark values:

```css
html.code-always-dark .cb {
  --code-bg: #1a1a1a;
  --code-header-bg: #232323;
  --code-gutter-bg: #232323;
  --code-gutter-fg: #555555;
  --code-border: #2a2a2a;
  --code-copy-bg: #2a2a2a;
  --code-copy-fg: #cdd6f4;
}
html.code-always-dark .cb .hljs-keyword { color: #cba6f7; }
/* … all dark token overrides */
```

Toggle is persisted to workspace settings via the existing `themeOverride`-style postMessage, but with a different message type: `{ type: 'alwaysDarkCodeOverride', value: boolean }`.

---

## Settings Panel Addition

Under the "Page width" section, add a new section:

```
CODE BLOCKS
[</>] Always dark         [○]
```

Same `.settings-row` pattern as the existing toggles, with the `</>` Phosphor `Code` icon (already in the icon library).

---

## Out of Scope

- Code block edit-in-place language picker (defer)
- Diff highlighting (defer)
- Collapsible code blocks (defer)
- Line wrap toggle (defer)
- Editable source/code view (this is the separate Topic B)
