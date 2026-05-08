# Bubble Menu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Notion-style floating bubble menu that appears above selected text, with inline mark controls on Panel 1 and block-type conversions on Panel 2 (accessible via a "more" caret).

**Architecture:** A new `bubbleMenu.ts` file builds the bubble menu DOM, registers it with Tiptap's `BubbleMenuPlugin` via `editor.registerPlugin()`, and wires all click handlers. `editor.ts` gains four new extensions (Underline, TextStyle, Color, Highlight) and calls `createBubbleMenu(editor)` after editor creation.

**Tech Stack:** TypeScript, Tiptap v2, `@tiptap/extension-bubble-menu` (`BubbleMenuPlugin`), `@tiptap/extension-underline`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-highlight`, `@tiptap/pm/state` (`PluginKey`), inline Phosphor SVG paths from `@phosphor-icons/core`

---

## File Map

| File | Change |
|---|---|
| `package.json` | Add 5 new devDependencies |
| `src/webview/styles/editor.css` | Add bubble menu CSS (pill, buttons, panels, swatch panels) |
| `src/webview/bubbleMenu.ts` | **New** — builds DOM, registers plugin, wires all handlers |
| `src/webview/editor.ts` | Add Underline, TextStyle, Color, Highlight extensions; call `createBubbleMenu` |

> **No unit tests for this feature.** The bubble menu is entirely DOM + Tiptap API code that requires a live browser/editor context. Jest's node environment cannot run it. Verification is via `npm run compile` (TypeScript) and manual smoke test in the Extension Development Host.

---

### Task 1: Install new packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the 5 new packages**

```bash
cd "/Users/aviranrevach/AI Projects Aviran/MD viewer mscode"
npm install --save-dev \
  @tiptap/extension-bubble-menu \
  @tiptap/extension-underline \
  @tiptap/extension-text-style \
  @tiptap/extension-color \
  @tiptap/extension-highlight
```

Expected: packages added to `node_modules/`, no errors.

- [ ] **Step 2: Verify they appear in `package.json` devDependencies**

```bash
grep -E "bubble-menu|underline|text-style|extension-color|highlight" package.json
```

Expected: 5 lines, each `"@tiptap/extension-..."`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add bubble menu and text formatting packages"
```

---

### Task 2: Bubble menu CSS

**Files:**
- Modify: `src/webview/styles/editor.css`

- [ ] **Step 1: Append bubble menu styles to the end of `src/webview/styles/editor.css`**

```css
/* ── Bubble menu ─────────────────────────────────────── */
.bubble-menu {
  position: relative;
  background: #1a1a1a;
  border-radius: 9px;
  padding: 5px 6px;
  display: inline-flex;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3);
  z-index: 999;
}

.bubble-panel {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.bubble-panel.hidden { display: none; }

.bm-btn {
  background: transparent;
  border: none;
  color: #d0d0d0;
  width: 28px;
  height: 26px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  cursor: pointer;
  flex-shrink: 0;
}

.bm-btn:hover          { background: rgba(255,255,255,0.1);  color: #fff; }
.bm-btn.active         { background: rgba(255,255,255,0.12); color: #fff; }
.bm-btn.bm-dim         { color: #555; }
.bm-btn.bm-dim:hover   { color: #999; background: rgba(255,255,255,0.05); }

.bm-btn.bm-lbl {
  width: auto;
  padding: 0 7px;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: -.3px;
}

.bm-div {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: #333;
  margin: 0 2px;
  flex-shrink: 0;
  align-self: center;
}

.bm-swatch-panel {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 6px 8px;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  z-index: 1000;
}

.bm-swatch-panel.open { display: flex; }

.bm-swatch-item {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.1s;
}

.bm-swatch-item:hover { transform: scale(1.15); }

.bm-swatch-clear {
  background: transparent !important;
  color: #666;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #333 !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/webview/styles/editor.css
git commit -m "feat: add bubble menu CSS"
```

---

### Task 3: Create `src/webview/bubbleMenu.ts`

**Files:**
- Create: `src/webview/bubbleMenu.ts`

- [ ] **Step 1: Create `src/webview/bubbleMenu.ts` with the full implementation**

```typescript
import { Editor } from '@tiptap/core';
import { BubbleMenuPlugin } from '@tiptap/extension-bubble-menu';
import { PluginKey } from '@tiptap/pm/state';

// All paths verified from @phosphor-icons/core assets/regular/
const P = {
  textB:         'M178.48,115.7A44,44,0,0,0,148,40H80a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8h80a48,48,0,0,0,18.48-92.3ZM88,56h60a28,28,0,0,1,0,56H88Zm72,136H88V128h72a32,32,0,0,1,0,64Z',
  textItalic:    'M200,56a8,8,0,0,1-8,8H157.77L115.1,192H144a8,8,0,0,1,0,16H64a8,8,0,0,1,0-16H98.23L140.9,64H112a8,8,0,0,1,0-16h80A8,8,0,0,1,200,56Z',
  textUnderline: 'M200,224a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,224Zm-72-24a64.07,64.07,0,0,0,64-64V56a8,8,0,0,0-16,0v80a48,48,0,0,1-96,0V56a8,8,0,0,0-16,0v80A64.07,64.07,0,0,0,128,200Z',
  textStrike:    'M224,128a8,8,0,0,1-8,8H175.93c9.19,7.11,16.07,17.2,16.07,32,0,13.34-7,25.7-19.75,34.79C160.33,211.31,144.61,216,128,216s-32.33-4.69-44.25-13.21C71,193.7,64,181.34,64,168a8,8,0,0,1,16,0c0,17.35,22,32,48,32s48-14.65,48-32c0-14.85-10.54-23.58-38.77-32H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM76.33,104a8,8,0,0,0,7.61-10.49A17.3,17.3,0,0,1,83.11,88c0-18.24,19.3-32,44.89-32,18.84,0,34.16,7.42,41,19.85a8,8,0,0,0,14-7.7C173.33,50.52,152.77,40,128,40,93.29,40,67.11,60.63,67.11,88a33.73,33.73,0,0,0,1.62,10.49A8,8,0,0,0,76.33,104Z',
  code:          'M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z',
  link:          'M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z',
  highlighter:   'M253.66,106.34a8,8,0,0,0-11.32,0L192,156.69,107.31,72l50.35-50.34a8,8,0,1,0-11.32-11.32L96,60.69A16,16,0,0,0,93.18,79.5L72,100.69a16,16,0,0,0,0,22.62L76.69,128,18.34,186.34a8,8,0,0,0,3.13,13.25l72,24A7.88,7.88,0,0,0,96,224a8,8,0,0,0,5.66-2.34L136,187.31l4.69,4.69a16,16,0,0,0,22.62,0l21.19-21.18A16,16,0,0,0,203.31,168l50.35-50.34A8,8,0,0,0,253.66,106.34ZM93.84,206.85l-55-18.35L88,139.31,124.69,176ZM152,180.69,83.31,112,104,91.31,172.69,160Z',
  caretDown:     'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z',
  caretLeft:     'M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z',
  quotes:        'M100,56H40A16,16,0,0,0,24,72v64a16,16,0,0,0,16,16h60v8a32,32,0,0,1-32,32,8,8,0,0,0,0,16,48.05,48.05,0,0,0,48-48V72A16,16,0,0,0,100,56Zm0,80H40V72h60ZM216,56H156a16,16,0,0,0-16,16v64a16,16,0,0,0,16,16h60v8a32,32,0,0,1-32,32,8,8,0,0,0,0,16,48.05,48.05,0,0,0,48-48V72A16,16,0,0,0,216,56Zm0,80H156V72h60Z',
  listBullets:   'M80,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H88A8,8,0,0,1,80,64Zm136,56H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,64H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM44,52A12,12,0,1,0,56,64,12,12,0,0,0,44,52Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,116Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,180Z',
  listNumbers:   'M224,128a8,8,0,0,1-8,8H104a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM104,72H216a8,8,0,0,0,0-16H104a8,8,0,0,0,0,16ZM216,184H104a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM43.58,55.16,48,52.94V104a8,8,0,0,0,16,0V40a8,8,0,0,0-11.58-7.16l-16,8a8,8,0,0,0,7.16,14.32ZM79.77,156.72a23.73,23.73,0,0,0-9.6-15.95,24.86,24.86,0,0,0-34.11,4.7,23.63,23.63,0,0,0-3.57,6.46,8,8,0,1,0,15,5.47,7.84,7.84,0,0,1,1.18-2.13,8.76,8.76,0,0,1,12-1.59A7.91,7.91,0,0,1,63.93,159a7.64,7.64,0,0,1-1.57,5.78,1,1,0,0,0-.08.11L33.59,203.21A8,8,0,0,0,40,216H72a8,8,0,0,0,0-16H56l19.08-25.53A23.47,23.47,0,0,0,79.77,156.72Z',
  listChecks:    'M224,128a8,8,0,0,1-8,8H128a8,8,0,0,1,0-16h88A8,8,0,0,1,224,128ZM128,72h88a8,8,0,0,0,0-16H128a8,8,0,0,0,0,16Zm88,112H128a8,8,0,0,0,0,16h88a8,8,0,0,0,0-16ZM82.34,42.34,56,68.69,45.66,58.34A8,8,0,0,0,34.34,69.66l16,16a8,8,0,0,0,11.32,0l32-32A8,8,0,0,0,82.34,42.34Zm0,64L56,132.69,45.66,122.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Zm0,64L56,196.69,45.66,186.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Z',
} as const;

function svg(path: string, size = 13): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 256 256" fill="currentColor"><path d="${path}"/></svg>`;
}

const TEXT_COLORS: Array<{ value: string | null; label: string }> = [
  { value: null,      label: 'Default' },
  { value: '#e55757', label: 'Red' },
  { value: '#e8954a', label: 'Orange' },
  { value: '#e8c94a', label: 'Yellow' },
  { value: '#57b35b', label: 'Green' },
  { value: '#4a9ee8', label: 'Blue' },
  { value: '#9b5de5', label: 'Purple' },
  { value: '#e85a9b', label: 'Pink' },
];

const HIGHLIGHT_COLORS: Array<{ value: string | null; label: string }> = [
  { value: null,        label: 'None' },
  { value: '#ffd700aa', label: 'Yellow' },
  { value: '#ff8c0066', label: 'Orange' },
  { value: '#57b35b66', label: 'Green' },
  { value: '#4a9ee866', label: 'Blue' },
  { value: '#9b5de566', label: 'Purple' },
];

const DIV = `<span class="bm-div"></span>`;

function swatchHtml(
  items: Array<{ value: string | null; label: string }>,
  attr: string,
): string {
  return items
    .map(c =>
      c.value
        ? `<button class="bm-swatch-item" data-${attr}="${c.value}" style="background:${c.value}" title="${c.label}"></button>`
        : `<button class="bm-swatch-item bm-swatch-clear" data-${attr}="" title="${c.label}">⊘</button>`,
    )
    .join('');
}

function buildEl(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'bubble-menu';
  el.innerHTML = `
    <div class="bubble-panel" id="bm-p1">
      <button class="bm-btn" data-action="bold">${svg(P.textB)}</button>
      <button class="bm-btn" data-action="italic">${svg(P.textItalic)}</button>
      <button class="bm-btn" data-action="underline">${svg(P.textUnderline)}</button>
      <button class="bm-btn" data-action="strike">${svg(P.textStrike)}</button>
      ${DIV}
      <button class="bm-btn" data-action="code">${svg(P.code)}</button>
      <button class="bm-btn" data-action="link">${svg(P.link)}</button>
      ${DIV}
      <button class="bm-btn" data-action="color">
        <svg width="13" height="13" viewBox="0 0 256 256" fill="currentColor">
          <path d="M212,208a8,8,0,0,1-7.41-4.98L180.09,148H75.91L51.41,203.02A8,8,0,0,1,36,197.02L120,16a8,8,0,0,1,16,0l84,181.02A8,8,0,0,1,212,208ZM83.09,132h89.82L128,37.84Z"/>
          <rect id="bm-color-bar" x="36" y="224" width="184" height="18" rx="6" fill="#e55757"/>
        </svg>
      </button>
      <button class="bm-btn" data-action="highlight">${svg(P.highlighter)}</button>
      ${DIV}
      <button class="bm-btn bm-dim" data-action="more">${svg(P.caretDown, 10)}</button>
    </div>
    <div class="bubble-panel hidden" id="bm-p2">
      <button class="bm-btn bm-dim" data-action="back">${svg(P.caretLeft, 10)}</button>
      ${DIV}
      <button class="bm-btn bm-lbl" data-action="heading1">H1</button>
      <button class="bm-btn bm-lbl" data-action="heading2">H2</button>
      <button class="bm-btn bm-lbl" data-action="heading3">H3</button>
      ${DIV}
      <button class="bm-btn" data-action="blockquote">${svg(P.quotes)}</button>
      <button class="bm-btn" data-action="bulletList">${svg(P.listBullets)}</button>
      <button class="bm-btn" data-action="orderedList">${svg(P.listNumbers)}</button>
      <button class="bm-btn" data-action="taskList">${svg(P.listChecks)}</button>
    </div>
    <div class="bm-swatch-panel" id="bm-color-swatch">
      ${swatchHtml(TEXT_COLORS, 'color')}
    </div>
    <div class="bm-swatch-panel" id="bm-hl-swatch">
      ${swatchHtml(HIGHLIGHT_COLORS, 'hl')}
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

export function createBubbleMenu(editor: Editor): void {
  const el         = buildEl();
  const p1         = el.querySelector<HTMLElement>('#bm-p1')!;
  const p2         = el.querySelector<HTMLElement>('#bm-p2')!;
  const colorSwatch = el.querySelector<HTMLElement>('#bm-color-swatch')!;
  const hlSwatch    = el.querySelector<HTMLElement>('#bm-hl-swatch')!;
  const colorBar    = el.querySelector<SVGRectElement>('#bm-color-bar');

  editor.registerPlugin(
    BubbleMenuPlugin({
      pluginKey:    new PluginKey('bubbleMenu'),
      editor,
      element:      el,
      tippyOptions: { duration: 100, placement: 'top' },
      shouldShow:   ({ state }) => !state.selection.empty,
      updateDelay:  250,
    }),
  );

  function showPanel(panel: 'p1' | 'p2'): void {
    p1.classList.toggle('hidden', panel !== 'p1');
    p2.classList.toggle('hidden', panel !== 'p2');
    closeSwatch();
  }

  function closeSwatch(): void {
    colorSwatch.classList.remove('open');
    hlSwatch.classList.remove('open');
  }

  function updateActive(): void {
    const map: Record<string, boolean> = {
      bold:        editor.isActive('bold'),
      italic:      editor.isActive('italic'),
      underline:   editor.isActive('underline'),
      strike:      editor.isActive('strike'),
      code:        editor.isActive('code'),
      link:        editor.isActive('link'),
      heading1:    editor.isActive('heading', { level: 1 }),
      heading2:    editor.isActive('heading', { level: 2 }),
      heading3:    editor.isActive('heading', { level: 3 }),
      blockquote:  editor.isActive('blockquote'),
      bulletList:  editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      taskList:    editor.isActive('taskList'),
    };
    for (const [action, active] of Object.entries(map)) {
      el.querySelector<HTMLElement>(`[data-action="${action}"]`)
        ?.classList.toggle('active', active);
    }
    if (colorBar) {
      const attrs = editor.getAttributes('textStyle');
      colorBar.setAttribute('fill', (attrs.color as string | undefined) ?? '#e55757');
    }
  }

  el.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) { closeSwatch(); return; }
    e.stopPropagation();

    switch (btn.dataset.action) {
      case 'bold':        editor.chain().focus().toggleBold().run();        break;
      case 'italic':      editor.chain().focus().toggleItalic().run();      break;
      case 'underline':   editor.chain().focus().toggleUnderline().run();   break;
      case 'strike':      editor.chain().focus().toggleStrike().run();      break;
      case 'code':        editor.chain().focus().toggleCode().run();        break;
      case 'link': {
        if (editor.isActive('link')) {
          editor.chain().focus().unsetLink().run();
        } else {
          const url = window.prompt('Enter URL:');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }
        break;
      }
      case 'color':       colorSwatch.classList.toggle('open'); hlSwatch.classList.remove('open'); break;
      case 'highlight':   hlSwatch.classList.toggle('open');    colorSwatch.classList.remove('open'); break;
      case 'more':        showPanel('p2'); break;
      case 'back':        showPanel('p1'); break;
      case 'heading1':    editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'heading2':    editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'heading3':    editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'blockquote':  editor.chain().focus().toggleBlockquote().run();  break;
      case 'bulletList':  editor.chain().focus().toggleBulletList().run();  break;
      case 'orderedList': editor.chain().focus().toggleOrderedList().run(); break;
      case 'taskList':    editor.chain().focus().toggleTaskList().run();    break;
    }
    updateActive();
  });

  colorSwatch.addEventListener('click', e => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-color]');
    if (!item) return;
    const c = item.dataset.color;
    if (c) editor.chain().focus().setColor(c).run();
    else   editor.chain().focus().unsetColor().run();
    colorSwatch.classList.remove('open');
    updateActive();
  });

  hlSwatch.addEventListener('click', e => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-hl]');
    if (!item) return;
    const c = item.dataset.hl;
    if (c) editor.chain().focus().toggleHighlight({ color: c }).run();
    else   editor.chain().focus().unsetHighlight().run();
    hlSwatch.classList.remove('open');
    updateActive();
  });

  editor.on('transaction', ({ editor: e }) => {
    updateActive();
    if (e.state.selection.empty) showPanel('p1');
  });

  document.addEventListener('click', closeSwatch);
  updateActive();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/webview/bubbleMenu.ts
git commit -m "feat: add bubble menu with two-panel layout and color swatches"
```

---

### Task 4: Update `src/webview/editor.ts`

**Files:**
- Modify: `src/webview/editor.ts`

- [ ] **Step 1: Replace the full contents of `src/webview/editor.ts`**

```typescript
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { common, createLowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import Callout from './extensions/callout';
import Toggle from './extensions/toggle';
import { createBubbleMenu } from './bubbleMenu';

const lowlight = createLowlight(common);

let _editor: Editor | null = null;
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

export type OnChangeCallback = (markdown: string) => void;

export function createEditor(
  element: HTMLElement,
  initialMarkdown: string,
  onChange: OnChangeCallback,
): Editor {
  _editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Link.configure({ openOnClick: false }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Markdown.configure({ transformCopiedText: true }),
      Callout,
      Toggle,
    ],
    content: initialMarkdown,
    onUpdate({ editor }) {
      if (_debounceTimer) clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => {
        const markdown = editor.storage.markdown.getMarkdown() as string;
        onChange(markdown);
      }, 500);
    },
  });

  createBubbleMenu(_editor);
  return _editor;
}

export function updateContent(markdown: string): void {
  if (!_editor) return;
  _editor.commands.setContent(markdown);
}

export function destroyEditor(): void {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _editor?.destroy();
  _editor = null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/webview/editor.ts
git commit -m "feat: wire bubble menu extensions into Tiptap editor"
```

---

### Task 5: Build and smoke test

- [ ] **Step 1: Build**

```bash
cd "/Users/aviranrevach/AI Projects Aviran/MD viewer mscode" && npm run compile 2>&1
```

Expected: no TypeScript errors, `Webview built.` printed.

- [ ] **Step 2: Launch Extension Development Host**

Press the green ▶ button in VS Code's Run & Debug panel (`Cmd+Shift+D`). A second VS Code window opens.

- [ ] **Step 3: Smoke test in the Extension Development Host**

Open any `.md` file. Select some text with the mouse or `Shift+Arrow`. Verify:

1. Dark bubble menu pill appears above the selection
2. **Bold** — click B, text becomes bold; button highlights active state; click again to remove
3. **Italic** — click *I*, same behavior
4. **Underline** — click U, same behavior
5. **Strikethrough** — click S with strikethrough, same behavior
6. **Inline code** — click `</>`, text gets code formatting
7. **Link** — click chain icon, prompt appears; enter a URL; link is applied; clicking again removes it
8. **Text color** — click A button, color swatch appears below; click red; text turns red; color bar on A updates to red
9. **Highlight** — click highlighter; swatch appears; click yellow; text gets yellow highlight
10. **More** — click CaretDown; Panel 1 disappears, Panel 2 appears with H1/H2/H3 and list buttons
11. **Back** — click CaretLeft; Panel 1 returns
12. **H1** in Panel 2 — select a paragraph, click H1; it converts to Heading 1; H1 button highlights
13. **Bullet list** in Panel 2 — converts selected paragraph to bullet list
14. Deselect text (click elsewhere) — bubble menu hides; panel resets to Panel 1

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: verify bubble menu smoke test"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Dark pill style — `.bubble-menu` CSS
- ✅ Panel 1 (B/I/U/S/code/link/color/highlight/more) — `buildEl()` Panel 1 HTML
- ✅ Panel 2 (back/H1–3/blockquote/bullets/numbers/tasks) — `buildEl()` Panel 2 HTML
- ✅ Panel swap on more/back — `showPanel()` in `createBubbleMenu`
- ✅ Active state highlighting — `updateActive()` on every transaction
- ✅ Color swatch (8 colors) — `TEXT_COLORS` + `colorSwatch` handler
- ✅ Highlight swatch (6 colors) — `HIGHLIGHT_COLORS` + `hlSwatch` handler
- ✅ Color bar reflects current color — `colorBar.setAttribute('fill', ...)` in `updateActive`
- ✅ Link via `window.prompt` — case `'link'` in click handler
- ✅ Reset to Panel 1 on deselect — `editor.on('transaction')` checks `selection.empty`
- ✅ Dismiss swatches on outside click — `document.addEventListener('click', closeSwatch)`
- ✅ All Phosphor SVG paths verified from `@phosphor-icons/core`
- ✅ Underline extension added (was missing from original editor.ts)

**Type consistency:**
- `createBubbleMenu(editor: Editor): void` — matches spec and usage in editor.ts ✅
- `BubbleMenuPlugin` imported from `@tiptap/extension-bubble-menu` ✅
- `PluginKey` imported from `@tiptap/pm/state` ✅
