# Code Snippet Styling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade fenced code blocks to IDE-style with header bar (lang + copy), line-number gutter, punchier syntax colors, and an "Always dark code" toggle in the settings panel.

**Architecture:** Extend Tiptap's `CodeBlockLowlight` with a custom `NodeView` that wraps `<pre><code>` in a styled container. All visuals controlled by `--code-*` CSS variables defined per theme. An `html.code-always-dark` class overrides those variables to dark values regardless of page theme.

**Tech Stack:** TypeScript, Tiptap v2, `@tiptap/extension-code-block-lowlight`, lowlight, plain DOM APIs (no new packages)

---

## File Map

| File | Change |
|---|---|
| `src/webview/extensions/codeBlock.ts` | **New** — extends `CodeBlockLowlight` with NodeView (header, gutter, copy) |
| `src/webview/styles/notion-light.css` | Add 7 new `--code-*` tokens (light values) |
| `src/webview/styles/notion-dark.css` | Add 7 new `--code-*` tokens to `.theme-dark`, `.theme-sepia`, `.theme-claude` |
| `src/webview/styles/editor.css` | Replace `.ProseMirror pre` styles with `.cb-*` styles + syntax tokens + `code-always-dark` override |
| `src/webview/editor.ts` | Swap `CodeBlockLowlight` import for the new extension |
| `src/notionEditorProvider.ts` | Add "Always dark code" toggle row + send initial value on init + handle override message |
| `src/webview/index.ts` | Wire toggle button + apply `code-always-dark` class |
| `package.json` | Add `notionMdViewer.alwaysDarkCode` configuration |

---

### Task 1: Add `--code-*` theme tokens

**Files:**
- Modify: `src/webview/styles/notion-light.css`
- Modify: `src/webview/styles/notion-dark.css`

- [ ] **Step 1: Add light-mode tokens to `:root`**

In `src/webview/styles/notion-light.css`, before the closing `}` of the `:root` block, append:

```css
  --code-header-bg: #efefef;
  --code-gutter-bg: #efefef;
  --code-gutter-fg: #b0b0b0;
  --code-border: #e1e1e1;
  --code-copy-bg: #ffffff;
  --code-copy-fg: #555555;
```

Also update the existing `--code-bg` line to:

```css
  --code-bg: #f6f6f6;
```

- [ ] **Step 2: Add dark-mode tokens**

In `src/webview/styles/notion-dark.css`, inside the `.theme-dark` block before the closing `}`, append:

```css
  --code-header-bg: #232323;
  --code-gutter-bg: #232323;
  --code-gutter-fg: #555555;
  --code-border: #2a2a2a;
  --code-copy-bg: #2a2a2a;
  --code-copy-fg: #cdd6f4;
```

Update existing `--code-bg` line to:

```css
  --code-bg: #1a1a1a;
```

- [ ] **Step 3: Add Claude-mode tokens**

In `src/webview/styles/notion-dark.css`, inside the `.theme-claude` block before the closing `}`, append:

```css
  --code-header-bg: #e8dcc4;
  --code-gutter-bg: #e8dcc4;
  --code-gutter-fg: #b8a888;
  --code-border: #d8c8a8;
  --code-copy-bg: #faf6ee;
  --code-copy-fg: #5d4a35;
```

- [ ] **Step 4: Add Sepia-mode tokens**

In `src/webview/styles/notion-dark.css`, inside the `.theme-sepia` block before the closing `}`, append:

```css
  --code-header-bg: #e8dcb8;
  --code-gutter-bg: #e8dcb8;
  --code-gutter-fg: #a89a78;
  --code-border: #d4c8a8;
  --code-copy-bg: #faf0d9;
  --code-copy-fg: #5b4d36;
```

- [ ] **Step 5: Commit**

```bash
git add src/webview/styles/notion-light.css src/webview/styles/notion-dark.css
git commit -m "feat: add code block theme tokens for all 4 themes"
```

---

### Task 2: Add code block CSS (container, header, gutter, syntax tokens)

**Files:**
- Modify: `src/webview/styles/editor.css`

- [ ] **Step 1: Replace existing `.ProseMirror pre` rules with the new `.cb-*` styles**

Find the existing rules (in `editor.css`):

```css
.ProseMirror pre {
  background: var(--code-bg);
  border-radius: 6px;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  margin: 0.75rem 0;
}
.ProseMirror pre code {
  background: transparent;
  color: var(--text-primary);
  padding: 0;
  font-size: 0.875rem;
  line-height: 1.6;
}
```

Replace them entirely with this block:

```css
/* ── Code block — IDE style ──────────────────────────── */
.ProseMirror .cb {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 8px;
  margin: 0.75em 0;
  overflow: hidden;
  font-family: var(--font-mono);
}

.ProseMirror .cb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--code-header-bg);
  padding: 7px 14px;
  border-bottom: 1px solid var(--code-border);
  user-select: none;
}

.ProseMirror .cb-lang {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
  font-family: var(--font-body);
  letter-spacing: 0.02em;
}

.ProseMirror .cb-copy {
  background: var(--code-copy-bg);
  border: 1px solid var(--code-border);
  color: var(--code-copy-fg);
  border-radius: 5px;
  padding: 3px 10px;
  font-size: 11px;
  font-family: var(--font-body);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: background 0.1s, color 0.1s;
}
.ProseMirror .cb-copy:hover { background: var(--block-hover); color: var(--text-primary); }
.ProseMirror .cb-copy svg { width: 11px; height: 11px; }

.ProseMirror .cb-body {
  display: flex;
  overflow-x: auto;
}

.ProseMirror .cb-gutter {
  background: var(--code-gutter-bg);
  padding: 12px 12px;
  font-size: 0.875em;
  line-height: 1.7;
  color: var(--code-gutter-fg);
  text-align: right;
  user-select: none;
  border-right: 1px solid var(--code-border);
  min-width: 40px;
  white-space: pre;
  flex-shrink: 0;
}

.ProseMirror .cb-content {
  padding: 12px 18px;
  margin: 0;
  background: transparent;
  font-size: 0.875em;
  line-height: 1.7;
  flex: 1;
  overflow-x: auto;
}

.ProseMirror .cb-content code {
  background: transparent;
  color: var(--text-primary);
  padding: 0;
  font-family: var(--font-mono);
}

/* ── Syntax tokens (lowlight uses .hljs-* class names) ── */
.ProseMirror .hljs-keyword,
.ProseMirror .hljs-tag,
.ProseMirror .hljs-meta-keyword { color: #8b3aa3; font-weight: 600; }
.ProseMirror .hljs-string,
.ProseMirror .hljs-attr,
.ProseMirror .hljs-template-variable { color: #0a7240; }
.ProseMirror .hljs-number,
.ProseMirror .hljs-literal { color: #9a4500; }
.ProseMirror .hljs-comment,
.ProseMirror .hljs-quote { color: #6e6e6e; font-style: italic; }
.ProseMirror .hljs-title.function_,
.ProseMirror .hljs-function .hljs-title,
.ProseMirror .hljs-built_in { color: #0058c4; }
.ProseMirror .hljs-type,
.ProseMirror .hljs-class .hljs-title,
.ProseMirror .hljs-name { color: #b8421a; }
.ProseMirror .hljs-punctuation,
.ProseMirror .hljs-operator,
.ProseMirror .hljs-symbol { color: #444444; }
.ProseMirror .hljs-variable,
.ProseMirror .hljs-property { color: var(--text-primary); }

/* Dark page tokens */
.theme-dark .ProseMirror .hljs-keyword,
.theme-dark .ProseMirror .hljs-tag { color: #cba6f7; }
.theme-dark .ProseMirror .hljs-string,
.theme-dark .ProseMirror .hljs-attr { color: #a6e3a1; }
.theme-dark .ProseMirror .hljs-number,
.theme-dark .ProseMirror .hljs-literal { color: #fab387; }
.theme-dark .ProseMirror .hljs-comment { color: #6c7086; }
.theme-dark .ProseMirror .hljs-title.function_,
.theme-dark .ProseMirror .hljs-built_in { color: #89b4fa; }
.theme-dark .ProseMirror .hljs-type,
.theme-dark .ProseMirror .hljs-class .hljs-title,
.theme-dark .ProseMirror .hljs-name { color: #f9e2af; }
.theme-dark .ProseMirror .hljs-punctuation,
.theme-dark .ProseMirror .hljs-operator { color: #b0b0b0; }

/* Always-dark code override — applies regardless of page theme */
html.code-always-dark .ProseMirror .cb {
  --code-bg: #1a1a1a;
  --code-header-bg: #232323;
  --code-gutter-bg: #232323;
  --code-gutter-fg: #555555;
  --code-border: #2a2a2a;
  --code-copy-bg: #2a2a2a;
  --code-copy-fg: #cdd6f4;
}
html.code-always-dark .ProseMirror .cb-content code,
html.code-always-dark .ProseMirror .cb-content { color: #cdd6f4; }
html.code-always-dark .ProseMirror .cb .hljs-keyword,
html.code-always-dark .ProseMirror .cb .hljs-tag { color: #cba6f7; }
html.code-always-dark .ProseMirror .cb .hljs-string,
html.code-always-dark .ProseMirror .cb .hljs-attr { color: #a6e3a1; }
html.code-always-dark .ProseMirror .cb .hljs-number,
html.code-always-dark .ProseMirror .cb .hljs-literal { color: #fab387; }
html.code-always-dark .ProseMirror .cb .hljs-comment { color: #6c7086; font-style: italic; }
html.code-always-dark .ProseMirror .cb .hljs-title.function_,
html.code-always-dark .ProseMirror .cb .hljs-built_in { color: #89b4fa; }
html.code-always-dark .ProseMirror .cb .hljs-type,
html.code-always-dark .ProseMirror .cb .hljs-class .hljs-title,
html.code-always-dark .ProseMirror .cb .hljs-name { color: #f9e2af; }
html.code-always-dark .ProseMirror .cb .hljs-punctuation,
html.code-always-dark .ProseMirror .cb .hljs-operator { color: #b0b0b0; }
```

- [ ] **Step 2: Commit**

```bash
git add src/webview/styles/editor.css
git commit -m "feat: add IDE-style code block CSS with syntax tokens and always-dark override"
```

---

### Task 3: Create the Code Block NodeView extension

**Files:**
- Create: `src/webview/extensions/codeBlock.ts`

- [ ] **Step 1: Create `src/webview/extensions/codeBlock.ts`**

```typescript
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

const COPY_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'cb';

      // Header
      const header = document.createElement('div');
      header.className = 'cb-header';
      header.contentEditable = 'false';

      const lang = document.createElement('span');
      lang.className = 'cb-lang';
      lang.textContent = node.attrs.language || 'text';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'cb-copy';
      copyBtn.contentEditable = 'false';
      const setLabel = (text: string): void => {
        copyBtn.innerHTML = `${COPY_ICON_SVG}<span>${text}</span>`;
      };
      setLabel('Copy');

      header.appendChild(lang);
      header.appendChild(copyBtn);

      // Body: gutter + content
      const body = document.createElement('div');
      body.className = 'cb-body';

      const gutter = document.createElement('div');
      gutter.className = 'cb-gutter';
      gutter.contentEditable = 'false';
      gutter.setAttribute('aria-hidden', 'true');

      const pre = document.createElement('pre');
      pre.className = 'cb-content';

      const code = document.createElement('code');
      code.className = `hljs language-${node.attrs.language || 'text'}`;

      pre.appendChild(code);
      body.appendChild(gutter);
      body.appendChild(pre);

      dom.appendChild(header);
      dom.appendChild(body);

      function updateGutter(): void {
        const text = code.textContent ?? '';
        const lineCount = Math.max(1, text.split('\n').length);
        gutter.textContent = Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n');
      }
      updateGutter();

      copyBtn.addEventListener('mousedown', (e) => {
        // Prevent ProseMirror from handling this and stealing focus
        e.preventDefault();
        e.stopPropagation();
      });
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = code.textContent ?? '';
        navigator.clipboard.writeText(text).then(() => {
          setLabel('Copied!');
          setTimeout(() => setLabel('Copy'), 1500);
        });
      });

      return {
        dom,
        contentDOM: code,
        update(updatedNode) {
          if (updatedNode.type.name !== node.type.name) return false;
          const newLang = updatedNode.attrs.language || 'text';
          if (lang.textContent !== newLang) {
            lang.textContent = newLang;
            code.className = `hljs language-${newLang}`;
          }
          // Defer so contentDOM has updated text before we count lines
          requestAnimationFrame(updateGutter);
          return true;
        },
        ignoreMutation(mutation) {
          // Don't let header/gutter mutations bubble back into ProseMirror
          if (mutation.target === gutter || gutter.contains(mutation.target as Node)) return true;
          if (mutation.target === header || header.contains(mutation.target as Node)) return true;
          return false;
        },
      };
    };
  },
});

export default CodeBlock;
```

- [ ] **Step 2: Commit**

```bash
git add src/webview/extensions/codeBlock.ts
git commit -m "feat: add CodeBlock NodeView with header, gutter, and copy button"
```

---

### Task 4: Wire the new extension into editor.ts

**Files:**
- Modify: `src/webview/editor.ts`

- [ ] **Step 1: Replace the `CodeBlockLowlight` import**

Find this line:

```typescript
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
```

Replace it with:

```typescript
import CodeBlock from './extensions/codeBlock';
```

- [ ] **Step 2: Replace the extension usage in the extensions array**

Find:

```typescript
      CodeBlockLowlight.configure({ lowlight }),
```

Replace with:

```typescript
      CodeBlock.configure({ lowlight }),
```

- [ ] **Step 3: Commit**

```bash
git add src/webview/editor.ts
git commit -m "feat: wire custom CodeBlock NodeView into editor"
```

---

### Task 5: Add "Always dark code" toggle to settings panel

**Files:**
- Modify: `src/notionEditorProvider.ts`

- [ ] **Step 1: Add "Code blocks" section to the settings panel HTML**

In `src/notionEditorProvider.ts`, find the closing `</div>` of the Page width `settings-section` (the one containing the Full width / Custom width toggles). Right after that closing `</div>` and BEFORE the `<div class="settings-divider"></div>` line that precedes the Copy/Duplicate/Finder buttons, insert:

```typescript
    <div class="settings-section">
      <div class="settings-label">Code blocks</div>
      <div class="settings-row">
        <span class="settings-row-icon">${iCode}</span>
        <span class="settings-row-label">Always dark</span>
        <button class="toggle-switch" id="always-dark-code-toggle" role="switch" aria-checked="false"></button>
      </div>
    </div>
```

The `iCode` constant is already defined in this file (it's the `</>` icon used by the view-seg toolbar button).

- [ ] **Step 2: Send the initial value on `init`**

Find the `sendInit` function:

```typescript
    const sendInit = () => {
      const theme = vscode.workspace
        .getConfiguration('notionMdViewer')
        .get<string>('theme', 'light');
      webviewPanel.webview.postMessage({
        type: 'init',
        markdown: document.getText(),
        theme,
      });
    };
```

Replace it with:

```typescript
    const sendInit = () => {
      const cfg = vscode.workspace.getConfiguration('notionMdViewer');
      const theme = cfg.get<string>('theme', 'light');
      const alwaysDarkCode = cfg.get<boolean>('alwaysDarkCode', false);
      webviewPanel.webview.postMessage({
        type: 'init',
        markdown: document.getText(),
        theme,
        alwaysDarkCode,
      });
    };
```

- [ ] **Step 3: Handle the override message**

Find the `onDidReceiveMessage` block. Right after the `themeOverride` handler, add:

```typescript
      if (msg.type === 'alwaysDarkCodeOverride') {
        await vscode.workspace
          .getConfiguration('notionMdViewer')
          .update('alwaysDarkCode', msg.value, vscode.ConfigurationTarget.Workspace);
      }
```

Update the message type signature at the top of `onDidReceiveMessage`:

```typescript
    webviewPanel.webview.onDidReceiveMessage(async (msg: {
      type: string;
      markdown?: string;
      theme?: string;
      value?: boolean;
    }) => {
```

(adds `value?: boolean` for the new message)

- [ ] **Step 4: Commit**

```bash
git add src/notionEditorProvider.ts
git commit -m "feat: add Always dark code setting + toggle row in settings panel"
```

---

### Task 6: Wire toggle in webview index.ts

**Files:**
- Modify: `src/webview/index.ts`

- [ ] **Step 1: Update the `InitMessage` interface to include `alwaysDarkCode`**

Find:

```typescript
interface InitMessage   { type: 'init';        markdown: string; theme: ThemeSetting; }
```

Replace with:

```typescript
interface InitMessage   { type: 'init';        markdown: string; theme: ThemeSetting; alwaysDarkCode?: boolean; }
```

- [ ] **Step 2: Add toggle handling near where the other toggles are wired**

Find the line:

```typescript
  const finderBtn     = document.getElementById('finder-btn') as HTMLElement;
```

Right after it, add:

```typescript
  const alwaysDarkCodeToggle = document.getElementById('always-dark-code-toggle') as HTMLElement;

  function setAlwaysDarkCode(on: boolean, notify: boolean): void {
    document.documentElement.classList.toggle('code-always-dark', on);
    alwaysDarkCodeToggle.classList.toggle('on', on);
    alwaysDarkCodeToggle.setAttribute('aria-checked', String(on));
    if (notify) vscode.postMessage({ type: 'alwaysDarkCodeOverride', value: on });
  }

  alwaysDarkCodeToggle.addEventListener('click', () => {
    const isOn = alwaysDarkCodeToggle.classList.contains('on');
    setAlwaysDarkCode(!isOn, true);
  });
```

- [ ] **Step 3: Apply the initial value from the `init` message**

Find the `init` message handler in the `window.addEventListener('message', ...)` block:

```typescript
    if (msg.type === 'init') {
      currentMarkdown = msg.markdown;
      initTheme(msg.theme);
      loadInitialTheme(msg.theme);
      createEditor(editorEl, msg.markdown, (markdown) => {
        currentMarkdown = markdown;
        if (sourceMode) sourcePre.textContent = markdown;
        vscode.postMessage({ type: 'edit', markdown });
      });
      editorReady = true;
    }
```

Replace with:

```typescript
    if (msg.type === 'init') {
      currentMarkdown = msg.markdown;
      initTheme(msg.theme);
      loadInitialTheme(msg.theme);
      setAlwaysDarkCode(Boolean(msg.alwaysDarkCode), false);
      createEditor(editorEl, msg.markdown, (markdown) => {
        currentMarkdown = markdown;
        if (sourceMode) sourcePre.textContent = markdown;
        vscode.postMessage({ type: 'edit', markdown });
      });
      editorReady = true;
    }
```

- [ ] **Step 4: Commit**

```bash
git add src/webview/index.ts
git commit -m "feat: wire Always dark code toggle in webview"
```

---

### Task 7: Add the new configuration to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `alwaysDarkCode` to `contributes.configuration.properties`**

Find this block in `package.json`:

```json
        "notionMdViewer.theme": {
          "type": "string",
          "enum": ["auto", "light", "dark"],
          "default": "light",
          "description": "Color theme override for Notion MD Viewer"
        }
```

Replace it with:

```json
        "notionMdViewer.theme": {
          "type": "string",
          "enum": ["auto", "light", "dark"],
          "default": "light",
          "description": "Color theme override for Notion MD Viewer"
        },
        "notionMdViewer.alwaysDarkCode": {
          "type": "boolean",
          "default": false,
          "description": "Render code blocks with a dark background regardless of page theme"
        }
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add alwaysDarkCode setting"
```

---

### Task 8: Build and smoke test

- [ ] **Step 1: Run the build**

```bash
cd "/Users/aviranrevach/AI Projects Aviran/MD viewer mscode" && npm run compile 2>&1
```

Expected: TypeScript compiles cleanly. `Webview built.` printed at the end.

- [ ] **Step 2: Launch Extension Development Host**

Press the green ▶ in VS Code's Run & Debug panel.

- [ ] **Step 3: Smoke test**

Open `demo.md` in the dev host and verify:

1. The TypeScript code block renders with:
   - A header bar showing `typescript` (lowercase) on the left
   - A `📋 Copy` button on the right
   - A line-number gutter showing `1` through the last line
2. Syntax colors are punchier (purple keywords, green strings, blue functions)
3. Click the copy button — the code is copied to clipboard, button briefly shows "Copied!"
4. Switch to Dark theme via the settings panel — code block uses dark tokens
5. Switch to Light theme, then turn on **Always dark** in the new "Code blocks" section — the code block becomes dark while the page stays light
6. Toggle Always dark off — code block returns to matching the page theme
7. Reload the extension dev host — Always dark setting persists from workspace config
8. Edit a code block — line numbers update reactively as you add/remove lines

- [ ] **Step 4: Final commit (if any cleanup needed)**

If everything works, no commit needed. If you had to fix anything during smoke test:

```bash
git add .
git commit -m "fix: address smoke test findings"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Header bar with language label + copy button → Task 3 NodeView builds `cb-header`
- ✅ Line-number gutter → Task 3 `updateGutter` + Task 2 CSS
- ✅ Bordered container → Task 2 `.cb { border: 1px solid var(--code-border) }`
- ✅ Punchier light syntax tokens → Task 2 `.hljs-*` rules
- ✅ Theme tokens for light/dark/sepia/claude → Task 1 (all 4 themes)
- ✅ Always-dark toggle → Tasks 5/6/7 (UI + state + config)
- ✅ Always-dark CSS override → Task 2 `html.code-always-dark` rules
- ✅ Copy button feedback → Task 3 "Copied!" label for 1500ms
- ✅ Theme tokens table from spec → matches Task 1 + Task 2 values
- ✅ Settings panel addition under "Code blocks" label → Task 5

**Type consistency:**
- `CodeBlock` exported from `extensions/codeBlock.ts` and imported in `editor.ts` ✅
- Message type `alwaysDarkCodeOverride` used consistently in provider + webview ✅
- Config key `notionMdViewer.alwaysDarkCode` matches in package.json + provider ✅
- `setAlwaysDarkCode(on: boolean, notify: boolean)` signature consistent in usage ✅

**No tests:** The NodeView is DOM + Tiptap API code that requires a live browser context (same as `bubbleMenu.ts`, `blockHandle.ts`). Verification is via `npm run compile` + manual smoke test.
