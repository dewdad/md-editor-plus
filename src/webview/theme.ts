export type ThemeSetting =
  | 'light'
  | 'dark'
  | 'sepia'
  | 'claude'
  | 'sync-os'
  | 'sync-ide'
  | 'auto'; // legacy alias for sync-ide

type Resolved = 'light' | 'dark' | 'sepia' | 'claude';

let _currentSetting: ThemeSetting = 'sync-ide';

function isDarkOS(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
}

function isDarkIDE(): boolean {
  const cl = document.body.classList;
  return cl.contains('vscode-dark') || cl.contains('vscode-high-contrast-dark');
}

function resolveTheme(setting: ThemeSetting): Resolved {
  if (setting === 'sepia')   return 'sepia';
  if (setting === 'claude')  return 'claude';
  if (setting === 'light')   return 'light';
  if (setting === 'dark')    return 'dark';
  if (setting === 'sync-os') return isDarkOS()  ? 'dark' : 'light';
  return isDarkIDE() ? 'dark' : 'light';
}

export function applyTheme(setting: ThemeSetting): void {
  if (setting === 'auto') setting = 'sync-ide';
  _currentSetting = setting;
  const resolved = resolveTheme(setting);
  const html = document.documentElement;
  html.classList.toggle('theme-dark',   resolved === 'dark');
  html.classList.toggle('theme-sepia',  resolved === 'sepia');
  html.classList.toggle('theme-claude', resolved === 'claude');
}

export function initTheme(setting: ThemeSetting): void {
  applyTheme(setting);

  const observer = new MutationObserver(() => {
    if (_currentSetting === 'sync-ide') applyTheme('sync-ide');
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (mq) {
    const onChange = (): void => {
      if (_currentSetting === 'sync-os') applyTheme('sync-os');
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
    } else if (typeof (mq as unknown as { addListener?: (cb: () => void) => void }).addListener === 'function') {
      (mq as unknown as { addListener: (cb: () => void) => void }).addListener(onChange);
    }
  }
}

export function cycleTheme(): ThemeSetting {
  const next: Record<string, ThemeSetting> = {
    'sync-ide': 'light',
    'sync-os':  'light',
    auto:       'light',
    light:      'dark',
    dark:       'sync-ide',
    sepia:      'dark',
    claude:     'dark',
  };
  const newSetting = next[_currentSetting] ?? 'light';
  applyTheme(newSetting);
  return newSetting;
}
