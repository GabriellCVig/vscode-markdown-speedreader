import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Command Integration Suite', () => {
	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('speedreadFile runs on a markdown document without throwing', async () => {
		const fixture = path.resolve(__dirname, '../../test_markdown/test_code_blocks.md');
		const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fixture));
		await vscode.window.showTextDocument(doc);
		// Webview internals are not introspectable from the integration harness;
		// the jsdom unit test (src/unit/webview.test.ts) covers webview DOM behavior.
		await assert.doesNotReject(async () => {
			await vscode.commands.executeCommand('markdownspeedreader.speedreadFile');
		});
	});
});
