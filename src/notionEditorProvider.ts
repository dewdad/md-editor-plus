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
      const theme = vscode.workspace
        .getConfiguration('notionMdViewer')
        .get<string>('theme', 'auto');
      webviewPanel.webview.postMessage({
        type: 'init',
        markdown: document.getText(),
        theme,
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
        .get<string>('theme', 'auto');
      webviewPanel.webview.postMessage({ type: 'themeChange', theme });
    });

    webviewPanel.webview.onDidReceiveMessage(async (msg: {
      type: string;
      markdown?: string;
      theme?: string;
    }) => {
      if (msg.type === 'edit' && msg.markdown !== undefined) {
        await this._applyEdit(document, msg.markdown);
      }
      if (msg.type === 'openSourceView') {
        await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
      }
      if (msg.type === 'themeOverride' && msg.theme) {
        await vscode.workspace
          .getConfiguration('notionMdViewer')
          .update('theme', msg.theme, vscode.ConfigurationTarget.Workspace);
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
    <button id="btn-source">⌨ View Source</button>
    <button id="btn-theme">Auto</button>
  </div>
  <div id="editor"></div>
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
