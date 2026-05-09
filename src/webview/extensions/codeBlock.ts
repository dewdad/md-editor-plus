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
