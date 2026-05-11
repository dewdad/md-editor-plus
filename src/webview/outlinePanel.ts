import type { Editor } from '@tiptap/core';
import { OUTLINE_EVENT, OutlineEntry, getOutline } from './extensions/outline';

export interface OutlinePanel {
  toggle: () => void;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

interface CreateOpts {
  editor: Editor;
  panelEl: HTMLElement;
  toggleBtn: HTMLElement;
  initialVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
}

const ICON_CARET = '<svg width="10" height="10" viewBox="0 0 256 256" fill="currentColor"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/></svg>';

export function createOutlinePanel(opts: CreateOpts): OutlinePanel {
  const { editor, panelEl, toggleBtn, onVisibilityChange } = opts;
  const collapsed = new Set<number>();
  let entries: OutlineEntry[] = getOutline(editor.view);
  let activePos: number | null = null;

  panelEl.innerHTML = `<div class="outline-panel-list" role="navigation"></div>`;
  const listEl = panelEl.querySelector<HTMLElement>('.outline-panel-list')!;

  function hasChildren(idx: number): boolean {
    const e = entries[idx];
    if (e.level === 3) return false;
    const next = entries[idx + 1];
    return !!next && next.level > e.level;
  }

  function isHiddenByCollapse(idx: number): boolean {
    const e = entries[idx];
    if (e.level === 1) return false;
    for (let i = idx - 1; i >= 0; i--) {
      const ancestor = entries[i];
      if (ancestor.level >= e.level) continue;
      if (collapsed.has(ancestor.pos)) return true;
      if (ancestor.level === 1) break;
    }
    return false;
  }

  function render(): void {
    if (!entries.length) {
      listEl.innerHTML = `
        <div class="outline-rail" aria-hidden="true"></div>
        <div class="outline-active-marker" aria-hidden="true"></div>
        <div class="outline-panel-empty">Add a heading to see the outline.</div>
      `;
      return;
    }
    const rows: string[] = [
      '<div class="outline-rail" aria-hidden="true"></div>',
      '<div class="outline-active-marker" aria-hidden="true"></div>',
    ];
    entries.forEach((e, idx) => {
      if (isHiddenByCollapse(idx)) return;
      const children = hasChildren(idx);
      const isCollapsed = collapsed.has(e.pos);
      const caretClass = children
        ? `outline-row-caret${isCollapsed ? ' collapsed' : ''}`
        : 'outline-row-caret hidden';
      const caretHtml = children ? ICON_CARET : '';
      const activeClass = e.pos === activePos ? ' active' : '';
      rows.push(`
        <div class="outline-row outline-row-l${e.level}${activeClass}" data-pos="${e.pos}" data-idx="${idx}" title="${escapeAttr(e.text)}">
          <span class="${caretClass}" data-action="toggle-collapse">${caretHtml}</span>
          <span class="outline-row-text">${escapeHtml(e.text)}</span>
        </div>
      `);
    });
    listEl.innerHTML = rows.join('');
    positionRail();
    positionMarker();
  }

  function positionRail(): void {
    const rail = listEl.querySelector<HTMLElement>('.outline-rail');
    if (!rail) return;
    const visibleRows = listEl.querySelectorAll<HTMLElement>('.outline-row');
    if (!visibleRows.length) {
      rail.style.height = '0px';
      return;
    }
    const first = visibleRows[0];
    const last = visibleRows[visibleRows.length - 1];
    const top = first.offsetTop + 4;
    const bottom = last.offsetTop + last.offsetHeight - 4;
    rail.style.top = `${top}px`;
    rail.style.height = `${Math.max(0, bottom - top)}px`;
  }

  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => (
      c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
    ));
  }
  function escapeAttr(s: string): string { return escapeHtml(s); }

  function jumpTo(pos: number): void {
    try {
      const coords = editor.view.coordsAtPos(pos);
      const top = coords.top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    } catch { /* position no longer valid — ignore */ }
  }

  /**
   * Find the heading currently in view (the last one whose top is above the
   * scroll-spy threshold). Returns null when no heading qualifies — typically
   * when the document is scrolled above the first heading.
   */
  function findActiveEntry(): OutlineEntry | null {
    if (!entries.length) return null;
    const threshold = 140;
    let active: OutlineEntry | null = null;
    for (const entry of entries) {
      try {
        const coords = editor.view.coordsAtPos(entry.pos);
        if (coords.top <= threshold) active = entry;
        else break;
      } catch { /* skip invalid positions */ }
    }
    return active ?? entries[0];
  }

  function updateActiveClass(): void {
    listEl.querySelectorAll<HTMLElement>('.outline-row').forEach((row) => {
      const pos = Number(row.dataset.pos);
      row.classList.toggle('active', pos === activePos);
    });
  }

  function positionMarker(): void {
    const liveMarker = listEl.querySelector<HTMLElement>('.outline-active-marker');
    if (!liveMarker) return;
    if (activePos === null) {
      liveMarker.classList.remove('visible');
      return;
    }
    const row = listEl.querySelector<HTMLElement>(`.outline-row[data-pos="${activePos}"]`);
    if (!row) {
      liveMarker.classList.remove('visible');
      return;
    }
    liveMarker.style.top = `${row.offsetTop + 4}px`;
    liveMarker.style.height = `${row.offsetHeight - 8}px`;
    liveMarker.classList.add('visible');
  }

  function recomputeActive(): void {
    const next = findActiveEntry();
    const nextPos = next ? next.pos : null;
    if (nextPos === activePos) return;
    activePos = nextPos;
    updateActiveClass();
    positionMarker();
  }

  let scrollTick = false;
  let clickLockedUntil = 0;
  function onScroll(): void {
    if (scrollTick) return;
    if (Date.now() < clickLockedUntil) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      scrollTick = false;
      if (isPanelOpen()) recomputeActive();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  function selectEntry(pos: number): void {
    activePos = pos;
    updateActiveClass();
    positionMarker();
  }

  listEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>('.outline-row');
    if (!row) return;
    const pos = Number(row.dataset.pos);
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'toggle-collapse') {
      e.stopPropagation();
      if (collapsed.has(pos)) collapsed.delete(pos);
      else collapsed.add(pos);
      render();
      return;
    }
    // Lock active to the clicked entry through the smooth-scroll animation so
    // scroll-spy doesn't snap it back when the page can't scroll the heading
    // to the threshold (e.g., near the document bottom).
    clickLockedUntil = Date.now() + 700;
    selectEntry(pos);
    jumpTo(pos);
  });

  editor.view.dom.addEventListener(OUTLINE_EVENT, (e) => {
    entries = (e as CustomEvent<OutlineEntry[]>).detail;
    const valid = new Set(entries.map((x) => x.pos));
    for (const pos of [...collapsed]) {
      if (!valid.has(pos)) collapsed.delete(pos);
    }
    if (activePos !== null && !valid.has(activePos)) activePos = null;
    if (isPanelOpen()) {
      render();
      recomputeActive();
    }
  });

  function isPanelOpen(): boolean {
    return !panelEl.classList.contains('hidden');
  }

  function applyVisibility(): void {
    document.documentElement.classList.toggle('outline-visible', isPanelOpen());
    toggleBtn.classList.toggle('active', isPanelOpen());
  }

  function open(): void {
    panelEl.classList.remove('hidden');
    render();
    recomputeActive();
    applyVisibility();
    onVisibilityChange(true);
  }
  function close(): void {
    panelEl.classList.add('hidden');
    applyVisibility();
    onVisibilityChange(false);
  }
  function toggle(): void {
    if (isPanelOpen()) close();
    else open();
  }

  // Initial state — no onVisibilityChange callback fired (no need to persist
  // the current loaded value back to the host).
  if (opts.initialVisible) {
    panelEl.classList.remove('hidden');
    render();
    recomputeActive();
  } else {
    panelEl.classList.add('hidden');
  }
  applyVisibility();

  return { toggle, open, close, isOpen: isPanelOpen };
}
