import * as vscode from 'vscode';
import { NotionEditorProvider } from './notionEditorProvider';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(NotionEditorProvider.register(context));

  context.subscriptions.push(
    vscode.commands.registerCommand('notion-md.openSourceView', async () => {
      const activeTabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
      if (!activeTabInput || typeof activeTabInput !== 'object' || !('uri' in activeTabInput)) return;
      await vscode.commands.executeCommand(
        'vscode.openWith',
        (activeTabInput as { uri: vscode.Uri }).uri,
        'default'
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('notion-md.openNotionView', async () => {
      const activeTabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
      if (!activeTabInput || typeof activeTabInput !== 'object' || !('uri' in activeTabInput)) return;
      await vscode.commands.executeCommand(
        'vscode.openWith',
        (activeTabInput as { uri: vscode.Uri }).uri,
        'notion-md-viewer'
      );
    })
  );
}

export function deactivate(): void {}
