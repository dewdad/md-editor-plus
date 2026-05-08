# Block Handle — Design Spec

**Date:** 2026-05-09
**Status:** Approved

---

## Overview

A Notion-style left-gutter control that appears when hovering any block in the editor. Shows a `+` button (outside the block) and a `⠿` drag handle (inside the highlighted row). Clicking either opens a block-type picker. Dragging the handle reorders blocks.

---

## Visual Behavior — 3 States

| State | Trigger | What shows |
|---|---|---|
| **Default** | No interaction | Clean margin, nothing visible |
| **Row hovered** | Mouse enters any block | Row gets subtle tint (`--bg-secondary`). Bare `+` appears in left gutter. `⠿` appears inside the row. |
| **Handle hovered** | Mouse moves onto `+` or `⠿` | `+` grows a white box + shadow (becomes clearly clickable). Tooltip appears above `⠿`. |

---

## Layout

```
[ + ]  [ ⠿  block content text here              ]
 ↑         ↑
 outside   inside gray highlight
 gutter    (left edge of row)
```

- **`+` button** — lives in the left margin, never overlapping text. Bare icon at row-hover; gets a white rounded box when itself hovered.
- **`⠿` drag handle** — inside the highlighted row, on the left edge of content. Uses `@tiptap/extension-drag-handle` for positioning and DnD.

**Tooltip on `⠿`:**
> Drag to move
> Click or ⌘/ to open menu

---

## Block Picker

Opens near the hovered row when clicking `+` or `⠿` (or pressing `⌘/`). Dark pill floating menu with search filter.

### Sections & items

**Text**
- Paragraph — plain text block
- Heading 1 (H1)
- Heading 2 (H2)
- Heading 3 (H3)

**Lists**
- Bullet list
- Numbered list
- Task list (checkboxes)

**Media & blocks**
- Image — opens inline URL prompt; inserts `![alt](url)` block
- Callout — empty callout with 💡 emoji (uses existing Callout extension)
- Toggle — collapsible block (uses existing Toggle extension)

**Other**
- Blockquote
- Code block
- Divider (`---`)

### Picker behaviour

- **Search filter** at top — type to narrow by name; pressing Enter inserts the top result
- **Insertion point** — new block inserts **after** the hovered row
- **Dismisses** on item select, Escape, or click outside
- **`⌘/` shortcut** opens the picker for the block where the cursor currently is (no mouse required)

### Image insertion flow

When "Image" is selected from the picker:
1. An inline prompt appears in the document at the insertion point: `Paste image URL…`
2. User pastes a URL and presses Enter → inserts `![](url)` block
3. Alternatively, drag & drop an image file onto the placeholder → VS Code webview reads the file as a `data:` URI and inserts it

---

## Architecture

### New packages

| Package | Purpose |
|---|---|
| `@tiptap/extension-drag-handle` | Block detection, `⠿` positioning, DnD reorder, drop indicator line. **Tiptap Pro** — requires registry auth or self-hosted mirror. Fallback: `tiptap-extension-global-drag-handle` (community, MIT). |

### New files

| File | Responsibility |
|---|---|
| `src/webview/blockHandle.ts` | Creates the `+` button DOM element; wires it and the drag handle together; manages tooltip; registers `DragHandle` extension with `editor.registerPlugin()` |
| `src/webview/blockPicker.ts` | Builds the floating picker DOM; handles search filtering; maps item selection to `editor.chain()` insert commands; manages open/close/keyboard nav |

### Modified files

| File | Change |
|---|---|
| `src/webview/editor.ts` | Call `createBlockHandle(editor)` after editor creation |
| `src/webview/styles/editor.css` | Styles: `+` button, `⠿` gutter layout, row hover tint, picker, tooltip, drop indicator line |

### Key `editor.chain()` commands per block type

| Block | Command |
|---|---|
| Paragraph | `setParagraph()` |
| H1–H3 | `toggleHeading({ level: N })` |
| Bullet list | `toggleBulletList()` |
| Numbered list | `toggleOrderedList()` |
| Task list | `toggleTaskList()` |
| Image | `setImage({ src: url })` |
| Callout | `insertContent({ type: 'callout', ... })` |
| Toggle | `insertContent({ type: 'toggle', ... })` |
| Blockquote | `toggleBlockquote()` |
| Code block | `toggleCodeBlock()` |
| Divider | `setHorizontalRule()` |

All insert commands include `.focus()` and use `insertContentAt(pos)` where `pos` is the **end position of the hovered node** — resolved via `editor.view.posAtDOM(hoveredEl, 0)` and walking to the node's end using `ResolvedPos.end()`.

---

## CSS classes

```
.block-handle-plus       — the + button in the gutter
.block-handle-plus:hover — expanded box state
.block-handle-tooltip    — tooltip above drag handle
.block-picker            — floating picker container
.block-picker-search     — search input row
.block-picker-section    — section group
.block-picker-item       — individual row
.block-picker-item.active — keyboard-focused item
.drag-drop-indicator     — blue horizontal line shown during drag
```

---

## Out of Scope

- Slash command (`/`) trigger (separate feature)
- Table insertion via picker
- Embed / iframe blocks
- Drag between documents
