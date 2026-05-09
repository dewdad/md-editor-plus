import { Editor } from '@tiptap/core';

interface CalloutTypeDef {
  id: 'note' | 'tip' | 'important' | 'warning' | 'caution';
  label: string;
  emoji: string;
}

const TYPES: CalloutTypeDef[] = [
  { id: 'note',      label: 'Note',      emoji: '💡' },
  { id: 'tip',       label: 'Tip',       emoji: '✅' },
  { id: 'important', label: 'Important', emoji: '📌' },
  { id: 'warning',   label: 'Warning',   emoji: '⚠️' },
  { id: 'caution',   label: 'Caution',   emoji: '🛑' },
];

export interface CalloutMenu {
  open: (anchorEl: HTMLElement, calloutPos: number) => void;
  close: () => void;
}

export function createCalloutMenu(editor: Editor): CalloutMenu {
  let pos = 0;

  const el = document.createElement('div');
  el.className = 'callout-menu';
  document.body.appendChild(el);

  function render(currentType: string): void {
    el.innerHTML = `
      <div class="callout-menu-header">Callout type</div>
      <div class="callout-menu-list">
        ${TYPES.map((t) => `
          <button class="callout-menu-item ${t.id === currentType ? 'active' : ''}" data-type="${t.id}" data-callout-preview="${t.id}">
            <span class="callout-menu-emoji">${t.emoji}</span>
            <span class="callout-menu-label">${t.label}</span>
            ${t.id === currentType ? '<span class="callout-menu-check">✓</span>' : ''}
          </button>
        `).join('')}
      </div>
    `;
    el.querySelectorAll<HTMLButtonElement>('.callout-menu-item').forEach((row) => {
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const newType = row.dataset.type as CalloutTypeDef['id'];
        const newEmoji = TYPES.find((t) => t.id === newType)?.emoji ?? '💡';
        editor
          .chain()
          .focus()
          .command(({ tr, dispatch }) => {
            const node = tr.doc.nodeAt(pos);
            if (!node || node.type.name !== 'callout') return false;
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                type: newType,
                emoji: newEmoji,
              });
            }
            return true;
          })
          .run();
        close();
      });
    });
  }

  function open(anchorEl: HTMLElement, calloutPos: number): void {
    pos = calloutPos;
    const node = editor.state.doc.nodeAt(calloutPos);
    if (!node || node.type.name !== 'callout') return;
    render(node.attrs.type as string);
    el.classList.add('open');
    const rect = anchorEl.getBoundingClientRect();
    el.style.left = `${rect.left + window.scrollX}px`;
    el.style.top = `${rect.bottom + window.scrollY + 6}px`;
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 12) {
        el.style.top = `${rect.top + window.scrollY - r.height - 6}px`;
      }
    });
  }

  function close(): void {
    el.classList.remove('open');
  }

  document.addEventListener('mousedown', (e) => {
    if (!el.contains(e.target as Node)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.classList.contains('open')) close();
  });

  return { open, close };
}
