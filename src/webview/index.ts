import lightCss from './styles/notion-light.css';
import darkCss from './styles/notion-dark.css';
import editorCss from './styles/editor.css';
import { createEditor, updateContent } from './editor';
import { initTheme, cycleTheme, ThemeSetting } from './theme';

declare function acquireVsCodeApi(): {
  postMessage: (msg: unknown) => void;
};

const vscode = acquireVsCodeApi();

interface InitMessage   { type: 'init';        markdown: string; theme: ThemeSetting; }
interface UpdateMessage { type: 'update';      markdown: string; }
interface ThemeMessage  { type: 'themeChange'; theme: ThemeSetting; }
type HostMessage = InitMessage | UpdateMessage | ThemeMessage;

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = lightCss + darkCss + editorCss;
  document.head.appendChild(style);
}

function init(): void {
  injectStyles();

  const editorEl = document.getElementById('editor')!;
  const btnSource = document.getElementById('btn-source')!;
  const btnTheme = document.getElementById('btn-theme')!;
  let editorReady = false;

  btnSource.addEventListener('click', () => {
    vscode.postMessage({ type: 'openSourceView' });
  });

  btnTheme.addEventListener('click', () => {
    const newSetting = cycleTheme();
    vscode.postMessage({ type: 'themeOverride', theme: newSetting });
  });

  window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
    const msg = event.data;

    if (msg.type === 'init') {
      initTheme(msg.theme);
      createEditor(editorEl, msg.markdown, (markdown) => {
        vscode.postMessage({ type: 'edit', markdown });
      });
      editorReady = true;
    }

    if (msg.type === 'update' && editorReady) {
      updateContent(msg.markdown);
    }

    if (msg.type === 'themeChange') {
      initTheme(msg.theme);
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
