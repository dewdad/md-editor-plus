export type ThemeSetting = 'auto' | 'light' | 'dark' | 'sepia' | 'claude';
type Resolved = 'light' | 'dark' | 'sepia' | 'claude';

let _currentSetting: ThemeSetting = 'auto';

function resolveTheme(setting: ThemeSetting): Resolved {
  if (setting === 'sepia')  return 'sepia';
  if (setting === 'claude') return 'claude';
  if (setting === 'light')  return 'light';
  if (setting === 'dark')   return 'dark';
  return document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast-dark')
    ? 'dark'
    : 'light';
}

export function applyTheme(setting: ThemeSetting): void {
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
    if (_currentSetting === 'auto') applyTheme('auto');
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

export function cycleTheme(): ThemeSetting {
  const next: Record<ThemeSetting, ThemeSetting> = {
    auto: 'light',
    light: 'dark',
    dark: 'auto',
  };
  const newSetting = next[_currentSetting];
  applyTheme(newSetting);
  return newSetting;
}
