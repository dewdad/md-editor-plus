import * as vscode from 'vscode';

export class NotionEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = 'notion-md-viewer';
  private _isApplyingEdit = false;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new NotionEditorProvider(context.extensionUri);
    return vscode.window.registerCustomEditorProvider(
      NotionEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist')],
    };

    webviewPanel.webview.html = this._getHtml(webviewPanel.webview);

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

    const onDocChange = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (this._isApplyingEdit) return;
      webviewPanel.webview.postMessage({
        type: 'update',
        markdown: document.getText(),
      });
    });

    const onConfigChange = vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('notionMdViewer.theme')) return;
      const theme = vscode.workspace
        .getConfiguration('notionMdViewer')
        .get<string>('theme', 'light');
      webviewPanel.webview.postMessage({ type: 'themeChange', theme });
    });

    webviewPanel.webview.onDidReceiveMessage(async (msg: {
      type: string;
      markdown?: string;
      theme?: string;
      value?: boolean;
    }) => {
      if (msg.type === 'edit' && msg.markdown !== undefined) {
        await this._applyEdit(document, msg.markdown);
      }
      if (msg.type === 'themeOverride' && msg.theme) {
        await vscode.workspace
          .getConfiguration('notionMdViewer')
          .update('theme', msg.theme, vscode.ConfigurationTarget.Workspace);
      }
      if (msg.type === 'alwaysDarkCodeOverride') {
        await vscode.workspace
          .getConfiguration('notionMdViewer')
          .update('alwaysDarkCode', msg.value, vscode.ConfigurationTarget.Workspace);
      }
      if (msg.type === 'openInFinder') {
        await vscode.commands.executeCommand('revealFileInOS', document.uri);
      }
      if (msg.type === 'copyContent') {
        await vscode.env.clipboard.writeText(document.getText());
        await vscode.window.showInformationMessage('Page content copied to clipboard');
      }
      if (msg.type === 'duplicate') {
        const dir = vscode.Uri.joinPath(document.uri, '..');
        const base = document.uri.path.split('/').pop() ?? 'document.md';
        const name = base.replace(/(\.md)$/i, '') + ' copy.md';
        const newUri = vscode.Uri.joinPath(dir, name);
        await vscode.workspace.fs.writeFile(newUri, Buffer.from(document.getText(), 'utf8'));
        await vscode.commands.executeCommand('vscode.openWith', newUri, 'notion-md-viewer');
      }
    });

    webviewPanel.onDidDispose(() => {
      onDocChange.dispose();
      onConfigChange.dispose();
    });

    sendInit();
  }

  private async _applyEdit(document: vscode.TextDocument, markdown: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      markdown
    );
    this._isApplyingEdit = true;
    await vscode.workspace.applyEdit(edit);
    this._isApplyingEdit = false;
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );
    const nonce = this._nonce();

    const iEye  = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M251,123.13c-.37-.81-9.13-20.26-28.48-39.61C196.63,57.67,164,44,128,44S59.37,57.67,33.51,83.52C14.16,102.87,5.4,122.32,5,123.13a12.08,12.08,0,0,0,0,9.75c.37.82,9.13,20.26,28.49,39.61C59.37,198.34,92,212,128,212s68.63-13.66,94.48-39.51c19.36-19.35,28.12-38.79,28.49-39.61A12.08,12.08,0,0,0,251,123.13Zm-46.06,33C183.47,177.27,157.59,188,128,188s-55.47-10.73-76.91-31.88A130.36,130.36,0,0,1,29.52,128,130.45,130.45,0,0,1,51.09,99.89C72.54,78.73,98.41,68,128,68s55.46,10.73,76.91,31.89A130.36,130.36,0,0,1,226.48,128,130.45,130.45,0,0,1,204.91,156.12ZM128,84a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,84Zm0,64a20,20,0,1,1,20-20A20,20,0,0,1,128,148Z"/></svg>`;
    const iCode = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M96,73,34.06,128,96,183A12,12,0,1,1,80,201L8,137A12,12,0,0,1,8,119L80,55A12,12,0,0,1,96,73ZM248,119,176,55A12,12,0,1,0,160,73l61.91,55L160,183A12,12,0,1,0,176,201l72-64A12,12,0,0,0,248,119Z"/></svg>`;
    const iSun  = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M116,36V20a12,12,0,0,1,24,0V36a12,12,0,0,1-24,0Zm80,92a68,68,0,1,1-68-68A68.07,68.07,0,0,1,196,128Zm-24,0a44,44,0,1,0-44,44A44.05,44.05,0,0,0,172,128ZM51.51,68.49a12,12,0,1,0,17-17l-12-12a12,12,0,0,0-17,17Zm0,119-12,12a12,12,0,0,0,17,17l12-12a12,12,0,1,0-17-17ZM196,72a12,12,0,0,0,8.49-3.51l12-12a12,12,0,0,0-17-17l-12,12A12,12,0,0,0,196,72Zm8.49,115.51a12,12,0,0,0-17,17l12,12a12,12,0,0,0,17-17ZM48,128a12,12,0,0,0-12-12H20a12,12,0,0,0,0,24H36A12,12,0,0,0,48,128Zm80,80a12,12,0,0,0-12,12v16a12,12,0,0,0,24,0V220A12,12,0,0,0,128,208Zm108-92H220a12,12,0,0,0,0,24h16a12,12,0,0,0,0-24Z"/></svg>`;
    const iAuto = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm12,24.87a83.53,83.53,0,0,1,24,7.25V203.88a83.53,83.53,0,0,1-24,7.25ZM44,128a84.12,84.12,0,0,1,72-83.13V211.13A84.12,84.12,0,0,1,44,128Zm144,58.71V69.29a83.81,83.81,0,0,1,0,117.42Z"/></svg>`;
    const iMoon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M236.37,139.4a12,12,0,0,0-12-3A84.07,84.07,0,0,1,119.6,31.59a12,12,0,0,0-15-15A108.86,108.86,0,0,0,49.69,55.07,108,108,0,0,0,136,228a107.09,107.09,0,0,0,64.93-21.69,108.86,108.86,0,0,0,38.44-54.94A12,12,0,0,0,236.37,139.4Zm-49.88,47.74A84,84,0,0,1,68.86,69.51,84.93,84.93,0,0,1,92.27,48.29Q92,52.13,92,56A108.12,108.12,0,0,0,200,164q3.87,0,7.71-.27A84.79,84.79,0,0,1,186.49,187.14Z"/></svg>`;
    const iSepia = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M232,44H160a43.86,43.86,0,0,0-32,13.85A43.86,43.86,0,0,0,96,44H24A12,12,0,0,0,12,56V200a12,12,0,0,0,12,12H96a20,20,0,0,1,20,20,12,12,0,0,0,24,0,20,20,0,0,1,20-20h72a12,12,0,0,0,12-12V56A12,12,0,0,0,232,44ZM96,188H36V68H96a20,20,0,0,1,20,20V192.81A43.79,43.79,0,0,0,96,188Zm124,0H160a43.71,43.71,0,0,0-20,4.83V88a20,20,0,0,1,20-20h60Z"/></svg>`;
    const iAa = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M90.86,50.89a12,12,0,0,0-21.72,0l-64,136a12,12,0,0,0,21.71,10.22L42.44,164h75.12l15.58,33.11a12,12,0,0,0,21.72-10.22ZM53.74,140,80,84.18,106.27,140ZM200,84c-13.85,0-24.77,3.86-32.45,11.48a12,12,0,1,0,16.9,17c3-3,8.26-4.52,15.55-4.52,11,0,20,7.18,20,16v4.39A47.28,47.28,0,0,0,200,124c-24.26,0-44,17.94-44,40s19.74,40,44,40a47.18,47.18,0,0,0,22-5.38A12,12,0,0,0,244,192V124C244,101.94,224.26,84,200,84Zm0,96c-11,0-20-7.18-20-16s9-16,20-16,20,7.18,20,16S211,180,200,180Z"/></svg>`;
    const iFolder = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M228,104a12,12,0,0,1-24,0V69l-59.51,59.51a12,12,0,0,1-17-17L187,52H152a12,12,0,0,1,0-24h64a12,12,0,0,1,12,12Zm-44,24a12,12,0,0,0-12,12v64H52V84h64a12,12,0,0,0,0-24H48A20,20,0,0,0,28,80V208a20,20,0,0,0,20,20H176a20,20,0,0,0,20-20V140A12,12,0,0,0,184,128Z"/></svg>`;
    const iDevices = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,72H212V64a28,28,0,0,0-28-28H40A28,28,0,0,0,12,64v88a28,28,0,0,0,28,28h96v12a28,28,0,0,0,28,28h60a28,28,0,0,0,28-28V100A28,28,0,0,0,224,72ZM40,156a4,4,0,0,1-4-4V64a4,4,0,0,1,4-4H184a4,4,0,0,1,4,4v8H164a28,28,0,0,0-28,28v56Zm188,36a4,4,0,0,1-4,4H164a4,4,0,0,1-4-4V100a4,4,0,0,1,4-4h60a4,4,0,0,1,4,4ZM124,208a12,12,0,0,1-12,12H88a12,12,0,0,1,0-24h24A12,12,0,0,1,124,208Zm88-84a12,12,0,0,1-12,12H188a12,12,0,0,1,0-24h12A12,12,0,0,1,212,124Z"/></svg>`;
    const iArrowsH = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M240.49,136.49l-32,32a12,12,0,0,1-17-17L203,140H53l11.52,11.51a12,12,0,0,1-17,17l-32-32a12,12,0,0,1,0-17l32-32a12,12,0,1,1,17,17L53,116H203l-11.52-11.51a12,12,0,0,1,17-17l32,32A12,12,0,0,1,240.49,136.49Z"/></svg>`;
    const iSliders = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M40,92H70.06a36,36,0,0,0,67.88,0H216a12,12,0,0,0,0-24H137.94a36,36,0,0,0-67.88,0H40a12,12,0,0,0,0,24Zm64-24A12,12,0,1,1,92,80,12,12,0,0,1,104,68Zm112,96H201.94a36,36,0,0,0-67.88,0H40a12,12,0,0,0,0,24h94.06a36,36,0,0,0,67.88,0H216a12,12,0,0,0,0-24Zm-48,24a12,12,0,1,1,12-12A12,12,0,0,1,168,188Z"/></svg>`;
    const iSparkle = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M199,125.31l-49.88-18.39L130.69,57a19.92,19.92,0,0,0-37.38,0L74.92,106.92,25,125.31a19.92,19.92,0,0,0,0,37.38l49.88,18.39L93.31,231a19.92,19.92,0,0,0,37.38,0l18.39-49.88L199,162.69a19.92,19.92,0,0,0,0-37.38Zm-63.38,35.16a12,12,0,0,0-7.11,7.11L112,212.28l-16.47-44.7a12,12,0,0,0-7.11-7.11L43.72,144l44.7-16.47a12,12,0,0,0,7.11-7.11L112,75.72l16.47,44.7a12,12,0,0,0,7.11,7.11L180.28,144ZM140,40a12,12,0,0,1,12-12h12V16a12,12,0,0,1,24,0V28h12a12,12,0,0,1,0,24H188V64a12,12,0,0,1-24,0V52H152A12,12,0,0,1,140,40ZM252,88a12,12,0,0,1-12,12h-4v4a12,12,0,0,1-24,0v-4h-4a12,12,0,0,1,0-24h4V72a12,12,0,0,1,24,0v4h4A12,12,0,0,1,252,88Z"/></svg>`;
    const iCopy = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M180,64H40A12,12,0,0,0,28,76V216a12,12,0,0,0,12,12H180a12,12,0,0,0,12-12V76A12,12,0,0,0,180,64ZM168,204H52V88H168ZM228,40V180a12,12,0,0,1-24,0V52H76a12,12,0,0,1,0-24H216A12,12,0,0,1,228,40Z"/></svg>`;
    const iDuplicate = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,28H88A12,12,0,0,0,76,40V76H40A12,12,0,0,0,28,88V216a12,12,0,0,0,12,12H168a12,12,0,0,0,12-12V180h36a12,12,0,0,0,12-12V40A12,12,0,0,0,216,28ZM156,204H52V100H156Zm48-48H180V88a12,12,0,0,0-12-12H100V52H204Z"/></svg>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource} 'unsafe-inline';
             script-src 'nonce-${nonce}';
             img-src ${webview.cspSource} data: https:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notion MD</title>
</head>
<body>
  <div id="toolbar">
    <div class="segmented" id="view-seg">
      <button class="seg-btn active" data-view="preview">${iEye}</button>
      <button class="seg-btn" data-view="source">${iCode}</button>
    </div>
    <span class="toolbar-spacer"></span>
    <button class="toolbar-icon" id="settings-btn" title="View settings">${iAa}</button>
  </div>
  <div class="settings-panel hidden" id="settings-panel">
    <div class="settings-section">
      <div class="settings-label">Theme</div>
      <div class="segmented full-width" id="theme-seg">
        <button class="seg-btn active" data-theme="light" title="Light">${iSun}</button>
        <button class="seg-btn" data-theme="sepia" title="Sepia">${iSepia}</button>
        <button class="seg-btn" data-theme="claude" title="Claude">${iSparkle}</button>
        <button class="seg-btn" data-theme="dark" title="Dark">${iMoon}</button>
      </div>
      <div class="settings-row settings-row-sub">
        <span class="settings-row-icon">${iDevices}</span>
        <span class="settings-row-label">Sync with system</span>
        <button class="toggle-switch" id="auto-theme-toggle" role="switch" aria-checked="false"></button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-label">Font</div>
      <div class="segmented full-width" id="font-seg">
        <button class="seg-btn active" data-font="sans"><span style="font-family:ui-sans-serif,'Inter',sans-serif;font-weight:600">Aa</span> Sans</button>
        <button class="seg-btn" data-font="serif"><span style="font-family:ui-serif,'Georgia',serif;font-weight:700">Aa</span> Serif</button>
        <button class="seg-btn" data-font="mono"><span style="font-family:ui-monospace,'JetBrains Mono',monospace;font-weight:600">Aa</span> Mono</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-label">Text size</div>
      <div class="segmented full-width" id="text-seg">
        <button class="seg-btn" data-text="s"><span style="font-size:14px">S</span></button>
        <button class="seg-btn active" data-text="m"><span style="font-size:16px">M</span></button>
        <button class="seg-btn" data-text="l"><span style="font-size:18px">L</span></button>
        <button class="seg-btn" data-text="xl"><span style="font-size:20px">XL</span></button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-label">Page width</div>
      <div class="segmented full-width" id="width-level-seg">
        <button class="seg-btn" data-level="1" title="720px"><span class="width-bar w1"></span></button>
        <button class="seg-btn active" data-level="2" title="900px (default)"><span class="width-bar w2"></span></button>
        <button class="seg-btn" data-level="3" title="1100px"><span class="width-bar w3"></span></button>
        <button class="seg-btn" data-level="4" title="1300px"><span class="width-bar w4"></span></button>
      </div>
      <div class="settings-row">
        <span class="settings-row-icon">${iArrowsH}</span>
        <span class="settings-row-label">Full width</span>
        <button class="toggle-switch" id="full-width-toggle" role="switch" aria-checked="false"></button>
      </div>
      <div class="settings-row">
        <span class="settings-row-icon">${iSliders}</span>
        <span class="settings-row-label">Custom width</span>
        <button class="toggle-switch" id="custom-width-toggle" role="switch" aria-checked="false"></button>
      </div>
      <div class="settings-custom-slider hidden" id="custom-slider-row">
        <input type="range" min="0" max="4" value="2" step="1" class="width-slider" id="width-slider" />
        <span class="width-value" id="width-value">850</span>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-label">Code blocks</div>
      <div class="settings-row">
        <span class="settings-row-icon">${iCode}</span>
        <span class="settings-row-label">Always dark</span>
        <button class="toggle-switch" id="always-dark-code-toggle" role="switch" aria-checked="false"></button>
      </div>
    </div>
    <div class="settings-divider"></div>
    <button class="settings-action" id="copy-btn">${iCopy}<span>Copy page content</span></button>
    <button class="settings-action" id="duplicate-btn">${iDuplicate}<span>Duplicate</span></button>
    <button class="settings-action" id="finder-btn">${iFolder}<span>Open in Finder</span></button>
  </div>
  <div id="editor"></div>
  <div id="source-view"><pre id="source-pre"></pre></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _nonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }
}
