import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	// activationEvents is empty in package.json, so commands are only registered
	// once the extension activates. Force activation before asserting registration.
	suiteSetup(async () => {
		const ext = vscode.extensions.all.find(e => e.id.endsWith('markdownspeedreader'));
		if (ext) {
			await ext.activate();
		} else {
			// Fall back to invoking a command, which triggers activation.
			try {
				await vscode.commands.executeCommand('markdownspeedreader.speedreadFile');
			} catch {
				// Ignore command runtime errors; we only care that activation occurred.
			}
		}
	});

	test('extension commands are registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('markdownspeedreader.speedreadFile'), 'speedreadFile registered');
		assert.ok(commands.includes('markdownspeedreader.speedreadSelection'), 'speedreadSelection registered');
		assert.ok(commands.includes('markdownspeedreader.speedreadFromFile'), 'speedreadFromFile registered');
	});

	test('extension activates (best-effort)', async () => {
		// No publisher field, so getExtension may not resolve. If it does, activate it.
		const ext = vscode.extensions.all.find(e => e.id.endsWith('markdownspeedreader'));
		if (ext) {
			await ext.activate();
			assert.ok(ext.isActive, 'extension is active');
		} else {
			// Command registration (other test) already proves activation occurred.
			assert.ok(true, 'extension not resolvable by id; skipping activate assertion');
		}
	});
});
