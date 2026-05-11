import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface OutlineEntry {
  pos: number;
  level: 1 | 2 | 3;
  text: string;
}

export const OUTLINE_EVENT = 'outline:changed';

function collect(doc: PMNode): OutlineEntry[] {
  const out: OutlineEntry[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return true;
    const level = node.attrs.level as number;
    if (level < 1 || level > 3) return true;
    const text = node.textContent.trim();
    if (!text) return true;
    out.push({ pos, level: level as 1 | 2 | 3, text });
    return false;
  });
  return out;
}

function shallowEqual(a: OutlineEntry[], b: OutlineEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].pos !== b[i].pos || a[i].level !== b[i].level || a[i].text !== b[i].text) return false;
  }
  return true;
}

const outlineKey = new PluginKey<OutlineEntry[]>('blockOutline');

export const BlockOutline = Extension.create({
  name: 'blockOutline',

  addProseMirrorPlugins() {
    return [
      new Plugin<OutlineEntry[]>({
        key: outlineKey,
        state: {
          init: (_, state) => collect(state.doc),
          apply: (tr, old) => (tr.docChanged ? collect(tr.doc) : old),
        },
        view: (view) => {
          let last: OutlineEntry[] = collect(view.state.doc);
          const fire = (entries: OutlineEntry[]): void => {
            view.dom.dispatchEvent(new CustomEvent(OUTLINE_EVENT, { detail: entries }));
          };
          // Initial broadcast so panels rendered before this view mounts still get data.
          queueMicrotask(() => fire(last));
          return {
            update(updatedView) {
              const next = outlineKey.getState(updatedView.state) ?? [];
              if (!shallowEqual(next, last)) {
                last = next;
                fire(next);
              }
            },
          };
        },
      }),
    ];
  },
});

export default BlockOutline;

export function getOutline(view: { state: { doc: PMNode } }): OutlineEntry[] {
  return collect(view.state.doc);
}
